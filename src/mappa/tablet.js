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
import { muriEffettivi } from './porte.js';
import { usatoNelRound, fasceNelRound, muoviToken } from './annulla.js';
import { avversariZoc, attacchiDiOpportunita } from './zoc.js';
import { visibileAiGiocatori, statoDiretta } from './diretta.js';
import { diTurno } from '../scontro.js';
import { stessaChiave } from '../veicoli-registro.js';

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
    if (!scontro) return no('Nessuno scontro in corso: muovi al tuo turno, quando il master avvia lo scontro.', ok);
    if (diTurno(scontro)?.id !== token.rif.id) return no('Non è il tuo turno: aspetta il tuo turno per muovere.', ok);
  }
  if (!pezzo.movimento) return no('Il master non ha ancora letto la tua scheda: niente movimento per ora.', ok);
  if (pezzo.aZero) return no('Sei a 0 PV: non puoi muoverti.', ok);
  return { puo: true, motivo: null, token, pezzo, bordo: null };
}

/**
 * Area del token del giocatore (stesse regole della vista master, src/ui/mappa/pagina.js → infoArea, senza Libero e
 * senza veicoli). `perGiocatori`: solo gli ostacoli che i giocatori vedono (token non nascosti e non sotto la nebbia,
 * muri e porte fuori dalla nebbia, porte segrete come muro).
 * @param fascia 1 Passo, 2 Corsa, 3 Scatto
 * @returns { area, rimaste, usato, limite, totale, disponibili, chiusa, persi, escluse, motivo, fascia }
 */
export function areaGiocatore({ scena, token, pezzo, pezzi, scontro = null, fascia = 1, dati, perGiocatori = false }) {
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
    colonne: g.colonne, righe: g.righe, muri, terreno,
    token: scena.token.filter(ostacolo).map((x) => ({ id: x.id, q: x.q, ingombro: x.ingombro, lato: perChiave.get(chiaveRif(x.rif))?.lato ?? null })),
    chi: { id: token.id, q: token.q, ingombro: token.ingombro, lato: pezzo.lato }, massimo: totale, regole: dati.mappa.movimento,
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
  if (!p.puo) return { permesso: p, area: null };
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
 * @returns { ok: true, costo, fascia, percorso: punti (null sotto la nebbia), opportunita: [{ da, nomeDa, visibile }] }
 *   oppure { ok: false, errore }
 */
export function provaMovimento({ scena, pezzi, scontro = null, chiavePg, a, fascia = 1, dati }) {
  const p = permessoMovimento({ scena, pezzi, scontro, chiavePg, dati });
  if (!p.puo) return { ok: false, errore: p.motivo };
  if (!Array.isArray(a) || a.length !== 2 || !a.every(Number.isInteger)) return { ok: false, errore: 'quadretto di arrivo non valido' };
  if (!Number.isInteger(fascia) || fascia < 1 || fascia > 3) return { ok: false, errore: 'fascia: 1 Passo, 2 Corsa, 3 Scatto' };
  const { token, pezzo } = p;
  if (a[0] === token.q[0] && a[1] === token.q[1]) return { ok: false, errore: 'Sei già lì.' };
  if (!tuttoDentro({ q: a, ingombro: token.ingombro }, scena.griglia.colonne, scena.griglia.righe)) return { ok: false, errore: 'quadretto di arrivo non valido: fuori dalla mappa' };
  const nebbia = daBase64(scena.nebbia.coperti);
  if (!visibileAiGiocatori({ q: a, ingombro: token.ingombro, nascosto: false }, scena, nebbia)) return { ok: false, errore: 'Quel quadretto è sotto la nebbia: scegline uno che vedi.' };
  // quello che il giocatore vede e quello che c'è davvero
  const vista = areaGiocatore({ scena, token, pezzo, pezzi, scontro, fascia, dati, perGiocatori: true });
  const vera = areaGiocatore({ scena, token, pezzo, pezzi, scontro, fascia, dati });
  const costoVisto = costoVerso(vista.area, a);
  const costo = costoVerso(vera.area, a);
  if (costo > vera.limite) {
    if (costo !== Infinity && costo <= vera.totale) {
      const serve = FASCE.find((f) => vera.rimaste[f] !== null && costo <= vera.rimaste[f]);
      return { ok: false, errore: `Quel quadretto richiede ${nomeFascia(serve)}: sceglila e riprova.` };
    }
    if (vera.motivo && vera.limite <= 0) return { ok: false, errore: `Non puoi muoverti: ${vera.motivo}.` };
    if (costoVisto <= vista.limite) return { ok: false, errore: 'Quel quadretto non è raggiungibile: c’è qualcosa che non vedi. Chiedi al master.' };
    if (vera.escluse.length && costo !== Infinity) return { ok: false, errore: `Oltre il Passo rimasto (${vera.rimaste.passo} Q): Corsa e Scatto si fanno da fermi, in un blocco unico.` };
    return { ok: false, errore: 'Quel quadretto è fuori dalla tua area di movimento.' };
  }
  const punti = percorsoArea(vera.area, a);
  const f = fasciaDi(costo, vera.rimaste);
  // ZoC (Giocatore §5.3): tutti gli avversari contano; al tablet si nomina solo chi si vede
  const avv = avversariZoc(scena, pezzi, token.id, dati);
  const opportunita = attacchiDiOpportunita(punti, token.ingombro, avv).map((x) => ({
    da: x.token.rif.id, nomeDa: x.pezzo.nome, visibile: visibileAiGiocatori(x.token, scena, nebbia),
  }));
  const visibili = punti.map((q) => (visibileAiGiocatori({ q, ingombro: token.ingombro, nascosto: false }, scena, nebbia) ? q : null));
  return { ok: true, costo, fascia: f, percorso: visibili, punti, opportunita, token: token.id, nome: pezzo.nome, rifId: token.rif.id, usato: vera.usato, blocco: f && !dati.mappa.movimento.divisibili.includes(f), persi: f && !dati.mappa.movimento.divisibili.includes(f) ? Math.max(0, (pezzo.movimento[f] ?? 0) - vera.usato - costo) : 0 };
}

/**
 * Esegue il movimento del giocatore sulla scena completa (nel server): la stessa prova, poi muoviToken con la voce per
 * Ctrl+Z del master e il movimento segnato `tablet` (la chiave del PG).
 * @returns { ok: true, scena, movimento, prova } oppure { ok: false, errore }
 */
export function eseguiMovimentoGiocatore({ scena, pezzi, scontro = null, chiavePg, a, fascia = 1, dati, adesso = new Date() }) {
  const prova = provaMovimento({ scena, pezzi, scontro, chiavePg, a, fascia, dati });
  if (!prova.ok) return prova;
  const nuova = muoviToken(scena, prova.token, { a, costo: prova.costo, fascia: prova.fascia, scontro: scontro?.id ?? null, round: scontro?.round ?? null, libero: false, tablet: chiavePg }, dati, adesso);
  return { ok: true, scena: nuova, movimento: nuova.movimenti.at(-1), prova };
}

/** La mini-scheda del proprio PG per il tablet: PV, PM, Stati, Ferite (solo del proprio PG). */
export function miniScheda(pezzo) {
  if (!pezzo) return null;
  return { nome: pezzo.nome, pv: pezzo.pv ?? null, pm: pezzo.pm ?? null, stati: (pezzo.stati ?? []).map((s) => s.nome ?? s), ferite: pezzo.ferite ?? null, diTurno: !!pezzo.diTurno, movimento: pezzo.movimento ?? null };
}

/** Il token del PG si vede nella vista giocatori? (per «Centra su di me» e l'evidenza). */
export const tokenVisibile = (scena, token) => !!token && visibileAiGiocatori(token, scena);

