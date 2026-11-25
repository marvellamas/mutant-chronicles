// Tablet dei giocatori (fase 2, lotto 7; docs/battlemap/specifica.md, «Tablet dei giocatori»): il giocatore apre la
// vista giocatori dal tablet, sceglie il suo PG («Sono…») e muove solo il suo token, con le regole del master (Passo
// diviso, Corsa e Scatto in un blocco unico, area con muri, porte chiuse e terreno difficile, ZoC con gli Attacchi di
// Opportunità). Il tablet non calcola nulla di decisivo: chiede al server una prova (percorso, costo, ZoC) e poi
// conferma; il server rifà tutto sulla scena completa prima di scrivere (non si fida del tablet).
// Segreti (§3): l'area mostrata al tablet si calcola senza gli ostacoli che i giocatori non vedono (token nascosti o
// sotto la nebbia, muri sotto la nebbia) e perde i Q sotto la nebbia, come la diretta del master (src/mappa/diretta.js).
// La legalità si controlla invece sulla scena completa: un quadretto che sembra libero ma non lo è viene rifiutato con
// «c'è qualcosa che non vedi», come quando un PG urta un ostacolo invisibile.
// Funzioni pure, condivise da server, tablet e test.
import { daBase64, cella, senza } from './celle.js';
import { chiaveRif, dimensioni } from './token.js';
import { areaRaggiungibile, costoVerso, percorso as percorsoArea, statoFasce, fasciaDi, celleArea } from './area.js';
import { muriEffettivi, lineeEffettive, rocciaEffettiva } from './porte.js';
import { usatoNelRound, fasceNelRound, muoviToken } from './annulla.js';
import { avversariZoc, attacchiDiOpportunita } from './zoc.js';
import { visibileAiGiocatori, statoDiretta } from './diretta.js';
import { diTurno } from '../scontro.js';
import { stessaChiave } from '../veicoli-registro.js';
import { inVolo, movimentoInVolo, regoleMovimento } from './volo.js';
import { inQBase } from './distanze.js';
import { lineaDiTiro, ostacoliVista, testoCopertura } from './visuale.js';
import { luceIngombro, testoLuceBersaglio } from './luce.js';
import { mappaSemplice, lineaSemplice } from './semplice.js';

export const FASCE = ['passo', 'corsa', 'scatto'];
export const MODI_MOVIMENTO = ['turno', 'sempre'];

/** Impostazioni del tablet nella scena (scena.tablet), con i valori predefiniti dei dati (data/mappa.json → tablet). */
export function impostazioniTablet(scena, dati) {
  const T = dati.mappa.tablet;
  return {
    movimento: MODI_MOVIMENTO.includes(scena?.tablet?.movimento) ? scena.tablet.movimento : T.movimento_predefinito,
    avvisoTurno: typeof scena?.tablet?.avvisoTurno === 'boolean' ? scena.tablet.avvisoTurno : T.avviso_turno_predefinito,
    bloccato: scena?.bloccaGiocatori === true,
  };
}

/** I PG fra i pezzi della scena: [{ chiave (campo pg del file), nome, rif }], per «Sono…». */
export const pgDellaScena = (pezzi) => (pezzi ?? []).filter((p) => p.tipo === 'pg').map((p) => ({ chiave: p.pg, nome: p.nome, rif: p.rif }));

/** Il pezzo del PG con quella chiave (le chiavi si confrontano come fa la plancia), o null. */
export const pezzoDelPg = (pezzi, chiavePg) => (chiavePg ? (pezzi ?? []).find((p) => p.tipo === 'pg' && stessaChiave(p.pg, chiavePg)) ?? null : null);

/**
 * Il giocatore può muovere il suo token adesso? { puo, motivo, token, pezzo, bordo }: `bordo` è il veicolo su cui il PG
 * viaggia (lo muove il conducente). Il motivo non nomina mai chi è di turno se il giocatore non lo vede.
 */
export function permessoMovimento({ scena, pezzi, scontro = null, chiavePg, dati }) {
  const no = (motivo, extra = {}) => ({ puo: false, motivo, token: null, pezzo: null, bordo: null, ...extra });
  const pezzo = pezzoDelPg(pezzi, chiavePg);
  if (!pezzo) return no('Il tuo PG non è in questa scena: chiedi al master di farlo entrare.');
  const chiave = pezzo.chiave;
  const token = scena.token.find((t) => chiaveRif(t.rif) === chiave) ?? null;
  if (!token) {
    const veicolo = scena.token.find((t) => (t.passeggeri ?? []).some((x) => chiaveRif(x.rif) === chiave));
    if (veicolo) return no('Sei a bordo di un veicolo: lo muove il conducente.', { pezzo, bordo: veicolo.id });
    return no('Il tuo PG non è ancora sulla mappa: lo mette il master.', { pezzo });
  }
  const imp = impostazioniTablet(scena, dati);
  const ok = { pezzo, token };
  if (token.nascosto) return no('Il master ha nascosto il tuo token.', ok);
  if (imp.bloccato) return no('Il master ha bloccato i movimenti dei giocatori: guardi soltanto.', ok);
  if (imp.movimento === 'turno') {
    // lotto 247: l'ordine dei turni è una regola del gioco, non un veto del master: avvisa e lascia muovere (come i 0 PV
    // del 246). Il Direttore lo vede nel registro dello scontro, e «bloccato» e «token nascosto» restano dei «no».
    if (!scontro) return no('Nessuno scontro in corso: di solito si muove al proprio turno, quando il master lo avvia.', { ...ok, regola: true });
    if (diTurno(scontro)?.id !== token.rif.id) {
      const chi = diTurno(scontro)?.nome;
      return no(`Non è il tuo turno${chi ? `: adesso tocca a ${chi}` : ''}.`, { ...ok, regola: true });
    }
  }
  // «Mappa semplice» (N3): la pedina si sposta senza profilo di movimento e senza controlli sui PV
  if (mappaSemplice(scena)) return { puo: true, motivo: null, token, pezzo, bordo: null };
  if (!pezzo.movimento) return no('Il master non ha ancora letto la tua scheda: niente movimento per ora.', ok);
  // lotto 246: a 0 PV è una regola, non un impedimento tecnico: la prova lo segna come avviso e il movimento passa
  if (pezzo.aZero) return no('Sei a 0 PV: muoverti è contro le regole (§5.14).', { ...ok, regola: true });
  // in volo (08/10): Passo, Corsa e Scatto del volo (Giocatore §5.2.3)
  return { puo: true, motivo: null, token, pezzo: inVolo(token) ? { ...pezzo, movimento: movimentoInVolo(pezzo, dati, scena) } : pezzo, bordo: null };
}

/**
 * Area del token del giocatore (stesse regole della vista master, src/ui/mappa/pagina.js → infoArea, senza Libero e
 * senza veicoli). `perGiocatori`: solo gli ostacoli che i giocatori vedono (token non nascosti e non sotto la nebbia,
 * muri e porte fuori dalla nebbia, porte segrete come muro).
 * @param fascia 1 Passo, 2 Corsa, 3 Scatto
 * @returns { area, rimaste, usato, limite, totale, disponibili, chiusa, persi, escluse, motivo, fascia }
 */
export function areaGiocatore({ scena, token, pezzo, pezzi, scontro = null, fascia = 1, dati, perGiocatori = false, massimo = null }) {
  const usato = usatoNelRound(scena, token.id, scontro?.id ?? null, scontro?.round ?? null);
  const fatte = fasceNelRound(scena, token.id, scontro?.id ?? null, scontro?.round ?? null);
  const sf = statoFasce(pezzo.movimento, usato, fatte, dati.mappa.movimento);
  const rimaste = sf.rimaste;
  const disp = FASCE.slice(0, fascia).filter((f) => rimaste[f] !== null);
  const limite = disp.length ? Math.max(...disp.map((f) => rimaste[f])) : 0;
  const tutte = FASCE.filter((f) => rimaste[f] !== null);
  const totale = tutte.length ? Math.max(...tutte.map((f) => rimaste[f])) : 0;
  const g = scena.griglia;
  const nebbia = daBase64(scena.nebbia.coperti);
  const perChiave = new Map((pezzi ?? []).map((p) => [p.chiave, p]));
  const ostacolo = (x) => !perGiocatori || x.id === token.id || visibileAiGiocatori(x, scena, nebbia);
  const muri = perGiocatori ? senza(muriEffettivi(scena, { perGiocatori: true }), nebbia) : muriEffettivi(scena);
  const terreno = perGiocatori ? senza(daBase64(scena.terreno), nebbia) : daBase64(scena.terreno);
  const area = areaRaggiungibile({
    colonne: g.colonne, righe: g.righe, muri, terreno, linee: lineeEffettive(scena, { perGiocatori, larghezza: dati.mappa.porte.larghezza_q }), roccia: rocciaEffettiva(scena),
    token: scena.token.filter(ostacolo).map((x) => ({ id: x.id, q: x.q, ingombro: x.ingombro, angolo: x.angolo, base: x.base, lato: perChiave.get(chiaveRif(x.rif))?.lato ?? null, blocca: !!x.blocca || !!perChiave.get(chiaveRif(x.rif))?.ostacolo })),
    chi: { id: token.id, q: token.q, ingombro: token.ingombro, angolo: token.angolo, base: token.base, lato: pezzo.lato, attraversaRoccia: !!pezzo.attraversaRoccia },
    // lotto 246: con «massimo» si cerca su tutta la mappa, per sapere se un percorso esiste anche oltre il movimento rimasto
    massimo: massimo ?? totale, regole: regoleMovimento(token, dati),
  });
  const scelta = sf.chiusa ?? [...FASCE.slice(0, fascia)].reverse().find((f) => rimaste[f] !== null);
  const quando = scontro ? 'del Round' : 'del turno';
  const motivo = sf.chiusa ? `${nomeFascia(sf.chiusa)} fatta: movimento ${quando} finito`
    : limite > 0 ? null : !usato ? 'movimento 0 Q'
    : FASCE.slice(fascia).some((f) => rimaste[f] > 0) ? `${nomeFascia(FASCE[fascia - 1])} finito: scegli una fascia più ampia`
    : `movimento ${quando} finito`;
  return { area, rimaste, usato, limite, totale, disponibili: scelta ? pezzo.movimento[scelta] : null, chiusa: sf.chiusa, persi: sf.persi, escluse: sf.escluse, motivo, fascia };
}

/** Il token con quell'ingombro sta tutto dentro la griglia? */
const tuttoDentro = (t, C, R) => { const [w, h] = dimensioni(t.ingombro); return t.q[0] >= 0 && t.q[1] >= 0 && t.q[0] + w <= C && t.q[1] + h <= R; };

const NOMI = { passo: 'Passo', corsa: 'Corsa', scatto: 'Scatto' };
export const nomeFascia = (f) => NOMI[f] ?? f;

/**
 * Lo stato per il tablet: l'area (solo fuori dalla nebbia, nella forma della diretta: tre maschere) con i Q usati e
 * disponibili. null se il giocatore non può muovere.
 */
export function areaPerTablet({ scena, pezzi, scontro, chiavePg, fascia = 1, dati }) {
  const p = permessoMovimento({ scena, pezzi, scontro, chiavePg, dati });
  // lotto 247: con un «no» che è una regola (fuori turno) l'area si calcola lo stesso: il giocatore deve vedere dove
  // andrebbe, altrimenti il pulsante liberato aprirebbe una mappa senza niente sopra
  if (!p.puo && !p.regola) return { permesso: p, area: null };
  // «Mappa semplice» (N3): nessuna area e nessun conteggio; il giocatore tocca un quadretto che vede
  if (mappaSemplice(scena)) return { permesso: p, area: null, semplice: true };
  const info = areaGiocatore({ scena, token: p.token, pezzo: p.pezzo, pezzi, scontro, fascia, dati, perGiocatori: true });
  const celle = celleArea(info.area, info.rimaste, fascia);
  const nebbia = daBase64(scena.nebbia.coperti);
  const { colonne: C, righe: R } = scena.griglia;
  for (let i = 0; i < C * R; i++) if (celle[i] && cella(nebbia, C, R, i % C, Math.floor(i / C))) celle[i] = 0;
  const d = statoDiretta({ scena, token: p.token, modo: FASCE[fascia - 1], usato: info.usato, disponibili: info.disponibili, celle });
  return { permesso: p, area: { maschere: d.area, usato: info.usato, disponibili: info.disponibili, limite: info.limite, rimaste: info.rimaste, escluse: info.escluse, chiusa: info.chiusa, motivo: info.motivo, fascia } };
}

/**
 * Prova del movimento verso `a` (il tablet la chiede prima della conferma, il server la rifà prima di scrivere).
 * @returns { ok: true, costo, fascia, percorso: punti (null sotto la nebbia), opportunita: [{ da, nomeDa, visibile }], avvisi: string[] }
 *   oppure { ok: false, errore }
 *
 * Lotto 246: le REGOLE del movimento avvisano e non fermano più (il 22/11 l'app ha tenuto fermo il tavolo per quaranta
 * minuti). Restano «no» soltanto tre cose, e sono di altra natura: ciò che il giocatore non deve sapere (la nebbia, un
 * muro che non vede: glielo direbbe il percorso), ciò che l'app non sa fare (nessun percorso fino a lì: non si inventa
 * una strada) e ciò che il master ha deciso lui (token nascosto, movimenti bloccati, turno). Tutto il resto — fascia
 * sbagliata, movimento del Round finito, fuori dall'area, 0 PV — è un avviso che il tablet mostra e si può superare.
 */
export function provaMovimento({ scena, pezzi, scontro = null, chiavePg, a, fascia = 1, dati }) {
  const p = permessoMovimento({ scena, pezzi, scontro, chiavePg, dati });
  const avvisi = [];
  if (!p.puo) {
    if (!p.regola) return { ok: false, errore: p.motivo }; // il master ha deciso, o non c'è niente da muovere
    avvisi.push(p.motivo);
  }
  if (!Array.isArray(a) || a.length !== 2 || !a.every(Number.isInteger)) return { ok: false, errore: 'quadretto di arrivo non valido' };
  if (!Number.isInteger(fascia) || fascia < 1 || fascia > 3) return { ok: false, errore: 'fascia: 1 Passo, 2 Corsa, 3 Scatto' };
  const { token, pezzo } = p;
  if (a[0] === token.q[0] && a[1] === token.q[1]) return { ok: false, errore: 'Sei già lì.' };
  if (!tuttoDentro({ q: a, ingombro: token.ingombro }, scena.griglia.colonne, scena.griglia.righe)) return { ok: false, errore: 'quadretto di arrivo non valido: fuori dalla mappa' };
  const nebbia = daBase64(scena.nebbia.coperti);
  if (!visibileAiGiocatori({ q: a, ingombro: token.ingombro, nascosto: false }, scena, nebbia)) return { ok: false, errore: 'Quel quadretto è sotto la nebbia: scegline uno che vedi.' };
  // «Mappa semplice» (N3): nessun conteggio, nessuna fascia, nessun Attacco di Opportunità; basta un quadretto che si vede
  if (mappaSemplice(scena)) return { ok: true, avvisi, semplice: true, costo: 0, fascia: null, percorso: [[...token.q], [...a]], punti: [[...token.q], [...a]], opportunita: [], token: token.id, nome: pezzo.nome, rifId: token.rif.id, usato: 0, blocco: false, persi: 0 };
  // quello che il giocatore vede e quello che c'è davvero
  const vista = areaGiocatore({ scena, token, pezzo, pezzi, scontro, fascia, dati, perGiocatori: true });
  const vera = areaGiocatore({ scena, token, pezzo, pezzi, scontro, fascia, dati });
  const costoVisto = costoVerso(vista.area, a);
  const costo = costoVerso(vera.area, a);
  let areaPercorso = vera.area;
  let costoVero = costo;
  if (costo > vera.limite) {
    // 1) quello che il giocatore VEDE è raggiungibile e quello che c'è davvero no: un muro, un token, una porta che il
    //    master tiene nascosti. Il percorso glieli direbbe, quindi questo resta un «no» (è il filtro dei segreti, non una regola).
    if (costoVisto <= vista.limite) return { ok: false, errore: 'Quel quadretto non è raggiungibile: c’è qualcosa che non vedi. Chiedi al master.' };
    // 2) esiste un percorso, costi quel che costi? si guarda su tutta la mappa, una volta sola e solo in questo caso
    if (costo === Infinity) {
      const intera = areaGiocatore({ scena, token, pezzo, pezzi, scontro, fascia, dati, massimo: scena.griglia.colonne * scena.griglia.righe });
      costoVero = costoVerso(intera.area, a);
      // nessun percorso: non si inventa una strada attraverso un muro. L'app dice che non sa, e lo spostamento lo fa il master
      if (costoVero === Infinity) return { ok: false, errore: 'Non c’è un percorso fino a lì: se devi arrivarci lo stesso, chiedi al master di spostarti lui.' };
      areaPercorso = intera.area;
    }
    // 3) lotto 246: da qui in giù sono REGOLE del movimento, e le regole avvisano (il 22/11 fermavano il tavolo)
    if (costoVero <= vera.totale) {
      const serve = FASCE.find((f) => vera.rimaste[f] !== null && costoVero <= vera.rimaste[f]);
      avvisi.push(`Costo ${costoVero} Q: con ${nomeFascia(FASCE[fascia - 1])} ne hai ${vera.limite}${serve ? `. Serve ${nomeFascia(serve)}` : ''}.`);
    } else if (vera.motivo && vera.limite <= 0) avvisi.push(`Movimento finito per questo Round: ${vera.motivo}. Costo ${costoVero} Q.`);
    else if (vera.escluse.length) avvisi.push(`Oltre il Passo rimasto (${vera.rimaste.passo} Q): Corsa e Scatto si fanno da fermi, in un blocco unico. Costo ${costoVero} Q.`);
    else avvisi.push(`Fuori dalla tua area di movimento: costo ${costoVero} Q, ne hai ${vera.limite}.`);
  }
  const punti = percorsoArea(areaPercorso, a);
  const f = fasciaDi(costoVero, vera.rimaste);
  // ZoC (Giocatore §5.3): tutti gli avversari contano; al tablet si nomina solo chi si vede
  const avv = avversariZoc(scena, pezzi, token.id, dati);
  const opportunita = attacchiDiOpportunita(punti, token.ingombro, avv, token).map((x) => ({
    da: x.token.rif.id, nomeDa: x.pezzo.nome, visibile: visibileAiGiocatori(x.token, scena, nebbia),
  }));
  const visibili = punti.map((q) => (visibileAiGiocatori({ q, ingombro: token.ingombro, nascosto: false }, scena, nebbia) ? q : null));
  return { ok: true, avvisi, costo: costoVero, fascia: f, percorso: visibili, punti, opportunita, token: token.id, nome: pezzo.nome, rifId: token.rif.id, usato: vera.usato, blocco: f && !dati.mappa.movimento.divisibili.includes(f), persi: f && !dati.mappa.movimento.divisibili.includes(f) ? Math.max(0, (pezzo.movimento[f] ?? 0) - vera.usato - costoVero) : 0 };
}

/**
 * Esegue il movimento del giocatore sulla scena completa (nel server): la stessa prova, poi muoviToken con la voce per
 * Ctrl+Z del master e il movimento segnato `tablet` (la chiave del PG).
 * @returns { ok: true, scena, movimento, prova } oppure { ok: false, errore }
 */
export function eseguiMovimentoGiocatore({ scena, pezzi, scontro = null, chiavePg, a, fascia = 1, dati, adesso = new Date() }) {
  const prova = provaMovimento({ scena, pezzi, scontro, chiavePg, a, fascia, dati });
  if (!prova.ok) return prova;
  const nuova = muoviToken(scena, prova.token, { a, costo: prova.semplice ? null : prova.costo, fascia: prova.fascia, scontro: scontro?.id ?? null, round: scontro?.round ?? null, libero: !!prova.semplice, tablet: chiavePg }, dati, adesso);
  return { ok: true, scena: nuova, movimento: nuova.movimenti.at(-1), prova };
}

/** La mini-scheda del proprio PG per il tablet: PV, PM, Stati, Ferite (solo del proprio PG). */
export function miniScheda(pezzo) {
  if (!pezzo) return null;
  return { nome: pezzo.nome, pv: pezzo.pv ?? null, pm: pezzo.pm ?? null, stati: (pezzo.stati ?? []).map((s) => s.nome ?? s), ferite: pezzo.ferite ?? null, diTurno: !!pezzo.diTurno, movimento: pezzo.movimento ?? null };
}

/** Il token del PG si vede nella vista giocatori? (per «Centra su di me» e l'evidenza). */
export const tokenVisibile = (scena, token) => !!token && visibileAiGiocatori(token, scena);


/**
 * Fusione delle scritture (08/10): i movimenti dai tablet `ids` (già nella scena del server `server`) applicati alla
 * scena `locale` del master, che non li conosceva: solo posizione del token, movimento registrato (Q usati) e voce per
 * Ctrl+Z. Tutto il resto resta quello del master. Un movimento già presente, o di un token che il master ha tolto,
 * non si applica. Funzione pura, usata dal server (PUT su una revisione vecchia) e dalla mappa del master.
 */
export function fondiMovimentiTablet(locale, server, ids, dati) {
  let s = locale;
  const S = dati.mappa.scena;
  for (const id of ids) {
    const m = (server.movimenti ?? []).find((x) => x.id === id);
    if (!m || s.movimenti.some((x) => x.id === id) || !s.token.some((t) => t.id === m.token)) continue;
    const voce = (server.annulla ?? []).find((v) => v.tipo === 'movimento' && v.movimento === id);
    s = {
      ...s,
      token: s.token.map((t) => (t.id === m.token ? { ...t, q: [...m.a] } : t)),
      movimenti: [...s.movimenti, m].slice(-S.movimenti_max),
      annulla: voce ? [...s.annulla, voce].slice(-S.annulla_max) : s.annulla,
    };
  }
  return s;
}

/**
 * Linea di tiro dal tablet del giocatore (08/10): dal suo PG verso un token o un Q che vede, con distanza, Copertura
 * (e causa), «protetto» (§5.10) e luce della zona del bersaglio, come nella mappa del master. Segreti (§3): contano solo
 * i token che il giocatore vede (`visibili`: id dei token della vista giocatori filtrata dal server), le porte segrete
 * sono muro, un Q sotto la nebbia non si può scegliere. Anche fuori turno (serve a pianificare); non cambia la scena.
 * @param verso { token: id } oppure { q: [x, y] }
 * @returns { ok: true, distanza, copertura, testo, protetto, vista, inVolo, luce, da, a, nome } oppure { ok: false, errore }
 */
export function lineaPerTablet({ scena, pezzi, chiavePg, verso, visibili, dati }) {
  const pezzo = pezzoDelPg(pezzi, chiavePg);
  if (!pezzo) return { ok: false, errore: 'Il tuo PG non è in questa scena.' };
  const da = scena.token.find((t) => chiaveRif(t.rif) === pezzo.chiave) ?? null;
  if (!da) {
    const aBordo = scena.token.some((t) => (t.passeggeri ?? []).some((x) => chiaveRif(x.rif) === pezzo.chiave));
    return { ok: false, errore: aBordo ? 'Sei a bordo di un veicolo: la linea dal mezzo la traccia il master.' : 'Il tuo PG non è sulla mappa.' };
  }
  const { colonne: C, righe: R } = scena.griglia;
  let a = null, nome = null, bersaglioId = null, bersagliabile = true;
  if (verso?.token) {
    const t = scena.token.find((x) => x.id === verso.token);
    if (!t || !visibili.has(t.id)) return { ok: false, errore: 'Quel bersaglio non lo vedi.' };
    if (t.id === da.id) return { ok: false, errore: 'Scegli un bersaglio diverso dal tuo PG.' };
    a = t;
    nome = (pezzi ?? []).find((p) => p.chiave === chiaveRif(t.rif))?.nome ?? t.nome ?? null;
    // P4: l'id del partecipante, per aprire «Attacca!» con il bersaglio già scelto
    bersaglioId = t.rif?.tipo === 'partecipante' ? t.rif.id ?? null : null;
    // 12/10 (punto 6): un token libero si può attaccare solo se il master gli ha messo la spunta «Bersaglio»
    if (t.rif?.tipo === 'segnaposto' && !t.bersaglio) bersagliabile = false;
  } else if (Array.isArray(verso?.q) && verso.q.length === 2 && verso.q.every(Number.isInteger)) {
    const [x, y] = verso.q;
    if (x < 0 || y < 0 || x >= C || y >= R) return { ok: false, errore: 'Quel quadretto è fuori dalla mappa.' };
    if (cella(daBase64(scena.nebbia.coperti), C, R, x, y)) return { ok: false, errore: 'Quel quadretto è sotto la nebbia: scegline uno che vedi.' };
    a = { id: null, q: [x, y], ingombro: 1 };
  } else return { ok: false, errore: 'Tocca un token o un quadretto.' };
  const perChiave = new Map((pezzi ?? []).map((p) => [p.chiave, p]));
  // come nel master (A.141, A.144): non contano i token a 0 PV o A Terra; per i giocatori solo quelli che vedono
  const contaToken = (t) => {
    if (!visibili.has(t.id)) return false;
    const p = perChiave.get(chiaveRif(t.rif));
    return !p?.aZero && !(p?.stati ?? []).some((x) => (x?.id ?? x) === 'a-terra');
  };
  const ost = ostacoliVista(scena, dati.mappa.porte, { perGiocatori: true });
  const calcolata = lineaDiTiro(scena, da, a.id ? a : a.q, ost, dati.mappa.visuale, { contaToken, volo: dati.mappa.volo.linea_di_tiro });
  // «Mappa semplice» (N3): la linea dà solo la distanza; Copertura, creatura interposta e luce si decidono al tavolo
  const semplice = mappaSemplice(scena);
  const r = semplice ? lineaSemplice(calcolata) : calcolata;
  const luce = semplice ? null : testoLuceBersaglio(luceIngombro(scena, a, dati), dati);
  return {
    // A.225: la distanza va ad «Attacca!» in Q Base (gittate del manuale); distanzaScena è quella letta sulla mappa
    ok: true, ...(semplice ? { semplice: true } : {}), distanza: inQBase(r.distanza, scena, dati), distanzaScena: r.distanza, copertura: r.copertura, testo: semplice ? 'Mappa semplice: Copertura a mano' : testoCopertura(r), protetto: !!r.protetto, interposta: !!r.interposta, vista: r.vista, inVolo: !!r.inVolo, bersagliabile,
    luce, nome, bersaglioId, da: { q: [...da.q], ingombro: da.ingombro }, a: { q: [...a.q], ingombro: a.ingombro },
  };
}
