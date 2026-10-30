// Calcolatore «PX della partita» (A.161, approvata il 16/10/2026). Funzioni pure: l'app propone, non assegna.
// Tutti i fattori stanno in data/px_partita.json (qui `p`). Riferimento funzionale: il gestore di Davide
// (docs/riferimenti/EROI_LEGGENDE_Gestore_PX_v1_2.html); i valori sono DA CONFERMARE sui manuali (A.168).
//
// Formule (dal gestore, Manuale del Direttore §9.3):
//   fattore            = fattore del Titolo del livello del PG (limitato dall'Atto)
//   pxVoti             = somma dei tre voti × fattore × moltiplicatore della durata (la durata raddoppia SOLO i voti)
//   pxBonus            = bonus eccezionale × fattore
//   pxIncontri         = Σ incontri: per incontro arrotonda( pesato × correttivo dei PG )
//                        pesato = principale×unità + Σ altri (qty − principale) × unità × quota (0,5)
//                        unità = PX del nemico, con la dotazione GIÀ compresa (nessuna seconda maggiorazione)
//   premio di fine Atto = solo se disposto, una volta
//   totale suggerito   = pxVoti + pxBonus + pxIncontri + premio ; il Direttore lo può correggere a mano.

import { idStabileDiFile, fileDiPgStabile } from './cartella.js';

const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);
const arrotonda = (n) => Math.round(num(n));

/** Il Titolo del livello (l'ultimo se il livello supera l'ultima fascia). */
export function titoloPerLivello(livello, p) {
  const t = p.titoli;
  return t.find((x) => livello >= x.livello_min && livello <= x.livello_max) ?? t[t.length - 1];
}

/** Livello 1..N dalle soglie cumulative: il più alto con soglia ≤ px. */
export function livelloDaPx(px, p) {
  const s = p.soglie_px;
  let liv = 1;
  for (let i = 0; i < s.length; i += 1) if (num(px) >= s[i]) liv = i + 1;
  return liv;
}

/**
 * Il confronto fra il livello preso nella scheda e quello che danno i PX (lotto 132, «i PX sembrano sfalsati di un
 * livello»). È il solo punto in cui la scheda, la voce «Controlla lo stato» e il Tavolo mettono a confronto livello e PX:
 * il livello dai PX è sempre `livelloDaPx`. Solo informazione: non cambia mai il livello del personaggio (lo decide il
 * Direttore, A.187).
 * @returns null senza PX; altrimenti { livelloPx, livelloScheda, inPiu (≥ 0: livelli presi oltre quelli dei PX), mancanti
 *   (PX che servirebbero per il livello della scheda, 0 se i PX bastano) }
 */
export function confrontoLivelloPx(livelloScheda, px, p) {
  if (px === null || px === undefined || px === '' || !Number.isFinite(Number(px))) return null;
  const livelloPx = livelloDaPx(Number(px), p);
  const inPiu = Math.max(0, num(livelloScheda) - livelloPx);
  return { livelloPx, livelloScheda: num(livelloScheda), inPiu, mancanti: inPiu ? Math.max(0, p.soglie_px[Math.min(livelloScheda, p.soglie_px.length) - 1] - Number(px)) : 0 };
}

/** La frase per chi legge la scheda o lo stato: vuota se i livelli tornano. */
export function fraseLivelloPx(c) {
  if (!c || !c.inPiu) return '';
  return `I PX danno il livello ${c.livelloPx}, la scheda è al ${c.livelloScheda}: ${c.inPiu === 1 ? 'un livello' : `${c.inPiu} livelli`} in più (mancano ${c.mancanti} PX). Non cambia niente da solo: decide il Direttore.`;
}

/** Limite di livello dell'Atto (l'ultimo livello dei Titoli se l'Atto non è noto). */
export function limiteAtto(atto, p) {
  return p.atti.find((a) => a.nome === atto)?.limite_livello ?? p.titoli[p.titoli.length - 1].livello_max;
}

/** Premio di fine Atto (0 se l'Atto non è noto). */
export function premioAtto(atto, p) {
  return num(p.atti.find((a) => a.nome === atto)?.premio);
}

/** Livello effettivo del PG: dai suoi px, limitato dall'Atto corrente. */
export function livelloPg(px, atto, p) {
  return Math.min(livelloDaPx(px, p), limiteAtto(atto, p));
}

/** Correttivo per il numero di PG presenti: max(minimo, 1 + passo × (base − n)). */
export function correttivoPg(nPresenti, p) {
  const c = p.correttivo_pg;
  return Math.max(c.minimo, 1 + c.passo * (c.base - num(nPresenti)));
}

/** Unità di PX di un nemico dell'incontro: il suo px (dotazione già compresa), o il px del suo Titolo/GS. */
function unitaNemico(nemico, p) {
  if (Number.isFinite(Number(nemico?.px))) return Number(nemico.px);
  const t = p.titoli.find((x) => x.nome === nemico?.titolo || x.nome === nemico?.gs);
  return num(t?.px);
}

/**
 * PX di un incontro. `nemici`: [{ nome?, px?|titolo?, qty, principale }]. Esattamente un principale.
 * Ritorna { px, pesato, errore }. Con errore, px = 0.
 */
export function pxIncontro(incontro, nPresenti, p) {
  const nemici = incontro?.nemici ?? [];
  // 25/10/2026: i PX di un incontro si possono scrivere a mano (`pxDiretti`, come nel Manuale dei Mostri: «PX per 4 PG»,
  // dotazione già compresa) quando non si elencano i nemici; il correttivo per i PG presenti si applica uguale
  if (!nemici.length && Number.isFinite(Number(incontro?.pxDiretti)) && Number(incontro.pxDiretti) > 0) {
    const pesato = Number(incontro.pxDiretti);
    return { px: arrotonda(pesato * correttivoPg(nPresenti, p)), pesato, errore: '' };
  }
  const principali = nemici.filter((e) => e.principale);
  if (nemici.length && principali.length !== 1) {
    return { px: 0, pesato: 0, errore: 'Serve esattamente un nemico principale' };
  }
  const quota = p.incontro.altri;
  const pieno = p.incontro.principale;
  const pesato = nemici.reduce((acc, e) => {
    const u = unitaNemico(e, p);
    const q = Math.max(1, num(e.qty) || 1);
    return acc + (e.principale ? u * pieno + (q - 1) * u * quota : q * u * quota);
  }, 0);
  return { px: arrotonda(pesato * correttivoPg(nPresenti, p)), pesato, errore: '' };
}

/** Moltiplicatore della durata (1 se la durata non è nota). */
export function moltiplicatoreDurata(durata, p) {
  return num(p.durata.opzioni.find((o) => o.valore === num(durata))?.moltiplicatore_voti) || 1;
}

/** Quanti PG sono presenti nella partita. */
export function presentiNella(partita) {
  return Object.values(partita?.partecipanti ?? {}).filter((x) => x?.presente).length;
}

/**
 * Il premio di fine Atto è dell'ATTO, non della partita (25/10/2026, precisazione di Davide alla A.170): ogni
 * personaggio lo prende una volta per Atto, anche se nella partita in cui lo si registra era assente. Per questo
 * si dispone giocatore per giocatore: `partita.premiAtto = { <idGiocatore>: true }`.
 * Il vecchio `partita.premioAtto === true` (un interruttore per tutta la partita) vale per i presenti.
 */
export function haPremio(partita, id) {
  if (partita?.premiAtto && typeof partita.premiAtto === 'object') return !!partita.premiAtto[id];
  return partita?.premioAtto === true && !!partita?.partecipanti?.[id]?.presente;
}

/** Il premio di una partita nella forma nuova (`premiAtto`), partendo dal vecchio interruttore se serve. Non muta. */
export function premiDellaPartita(partita) {
  if (partita?.premiAtto && typeof partita.premiAtto === 'object') return { ...partita.premiAtto };
  if (partita?.premioAtto !== true) return {};
  return Object.fromEntries(Object.entries(partita.partecipanti ?? {}).filter(([, v]) => v?.presente).map(([id]) => [id, true]));
}

/**
 * La traccia dei premi di fine Atto, per Atto e per giocatore, ricavata da tutte le partite: non dipende da
 * quale partita si sta registrando. { <atto>: { <idGiocatore>: [{ partitaId, titolo, data, assegnato }] } }, dove
 * `assegnato` dice se la partita è già stata assegnata (il premio è nei PX del PG) o è ancora una bozza.
 */
export function premiPerAtto(partite) {
  const atti = {};
  for (const m of partite ?? []) {
    for (const id of Object.keys(premiDellaPartita(m))) {
      if (!haPremio(m, id)) continue;
      ((atti[m.atto] ??= {})[id] ??= []).push({ partitaId: m.id, titolo: m.titolo ?? '', data: m.data ?? '', assegnato: m.statoAssegnazione === 'assegnata' });
    }
  }
  return atti;
}

/**
 * A.170 (18/10), come l'ha precisata Davide il 24/10: il premio di fine Atto va dato una sola volta per personaggio
 * e per Atto. Avviso, non blocco (decide il Direttore): gli id a cui `partita` dà il premio e che l'hanno già avuto
 * (o disposto) in un'altra partita dello stesso Atto — presenti o assenti in quella partita.
 */
export function premioGiaDato(partita, partite) {
  const ids = new Set();
  for (const m of partite ?? []) {
    if (m.id === partita?.id || m.atto !== partita?.atto) continue;
    for (const id of Object.keys(premiDellaPartita(m))) if (haPremio(m, id) && haPremio(partita, id)) ids.add(id);
  }
  return [...ids];
}

/**
 * A.197 (risposta di Davide del 30/10/2026): il premio di fine Atto NON si duplica. La seconda assegnazione dello stesso
 * premio allo stesso personaggio, nello stesso Atto, è bloccata anche se si tenta da un'altra partita (prima: avviso, A.170).
 * È un'eccezione dichiarata al principio «l'app avvisa, non blocca»: la via d'uscita è la rettifica tracciata con il motivo
 * (`rettificaPremio`), non un permesso. Un premio aggiuntivo deciso dal Direttore si registra a parte (colonna «Bonus»),
 * senza toccare il premio di fine Atto. Il premio spetta anche agli assenti (`haPremio`).
 *
 * I premi dati più di una volta: [{ atto, id, partite: [{ id, titolo }] }].
 */
export function premiDoppi(partite) {
  const out = [];
  for (const [atto, perGiocatore] of Object.entries(premiPerAtto(partite))) {
    for (const [id, dati] of Object.entries(perGiocatore)) {
      const ids = [...new Set(dati.map((x) => x.partitaId))];
      if (ids.length > 1) out.push({ atto, id, partite: ids.map((pid) => ({ id: pid, titolo: dati.find((x) => x.partitaId === pid)?.titolo ?? '' })) });
    }
  }
  return out;
}

/** I premi doppi di `nuove` che non lo erano già in `vecchie`: quelli che un salvataggio non deve far entrare. */
export function nuoviPremiDoppi(nuove, vecchie) {
  const gia = new Set(premiDoppi(vecchie).map((d) => `${d.atto}|${d.id}`));
  return premiDoppi(nuove).filter((d) => !gia.has(`${d.atto}|${d.id}`));
}

/** Per questo giocatore il premio dell'Atto della partita è già in un'altra partita dello stesso Atto: non si può dare di nuovo. */
export const premioBloccato = (partita, id, partite) => premioGiaDato({ ...partita, premiAtto: { [id]: true }, premioAtto: undefined }, partite).includes(id);

/**
 * La rettifica tracciata: toglie il premio di fine Atto di un giocatore da una partita (quella in cui era stato dato per
 * errore) e lo scrive nel registro `rettifichePremi` dell'archivio, con data e motivo (obbligatorio). Non muta: restituisce
 * l'archivio nuovo. Se la partita era già assegnata i PX non cambiano da soli: serve «Ri-assegna (correzione)».
 */
export function rettificaPremio(db, { atto, id, dallaPartitaId, motivo, quando = new Date().toISOString() }) {
  const m = String(motivo ?? '').trim();
  if (!m) throw new Error('la rettifica ha bisogno del motivo');
  const partite = (db?.partite ?? []).map((x) => ({ ...x }));
  const p = partite.find((x) => x.id === dallaPartitaId);
  if (!p) throw new Error('partita non trovata');
  if (p.atto !== atto || !haPremio(p, id)) throw new Error('in quella partita il premio di quell’Atto non c’è');
  const premi = premiDellaPartita(p); delete premi[id]; p.premiAtto = premi; delete p.premioAtto;
  const riga = { id: `rp-${quando}-${id}`, quando, atto, pg: id, partitaId: p.id, titolo: p.titolo ?? '', motivo: m, daRiassegnare: p.statoAssegnazione === 'assegnata' };
  return { ...db, partite, rettifichePremi: [...(db?.rettifichePremi ?? []), riga] };
}

/**
 * Componenti e totale suggerito di un giocatore. `pxPg` sono i PX attuali del suo PG (per Titolo e livello).
 * Non assegna nulla.
 */
export function componentiGiocatore(partita, pgId, pxPg, p) {
  const part = partita?.partecipanti?.[pgId] ?? {};
  const presente = !!part.presente;
  // A.168 (18/10): il Titolo di una partita dipende dai PX che il PG aveva PRIMA della sua assegnazione
  // (`pxPrima`, salvato alla prima assegnazione); il Direttore può cambiarlo a mano (`titoliManuali`)
  const pxBase = Number.isFinite(Number(partita?.pxPrima?.[pgId])) ? Number(partita.pxPrima[pgId]) : pxPg;
  const livello = livelloPg(pxBase, partita?.atto, p);
  const manuale = p.titoli.find((x) => x.nome === partita?.titoliManuali?.[pgId]);
  const titoloT = manuale ?? titoloPerLivello(livello, p);
  const fattore = titoloT.fattore;
  const [c0, c1, c2] = p.voti.componenti;
  const voti = {
    [c0]: num(part.partecipazione),
    [c1]: num(part.interpretazione),
    [c2]: num(part.contributo),
  };
  const sommaVoti = num(part.partecipazione) + num(part.interpretazione) + num(part.contributo);
  const nPresenti = presentiNella(partita);
  const pxVoti = presente ? sommaVoti * fattore * moltiplicatoreDurata(partita?.durata, p) : 0;
  const pxBonus = presente ? num(part.eccezionale) * fattore : 0;
  const pxIncontri = presente
    ? (partita?.incontri ?? []).reduce((acc, inc) => acc + pxIncontro(inc, nPresenti, p).px, 0) : 0;
  const premio = haPremio(partita, pgId) ? premioAtto(partita.atto, p) : 0; // anche da assente: è dell'Atto, non della partita
  const totaleSuggerito = pxVoti + pxBonus + pxIncontri + premio;
  return { presente, livello, titolo: titoloT.nome, titoloAutomatico: titoloPerLivello(livello, p).nome, fattore, voti, sommaVoti,
    pxVoti, pxBonus, pxIncontri, premio, totaleSuggerito };
}

/**
 * Calcolo completo della partita. `pxGiocatori`: { pgId: px attuali }. Per ogni giocatore le componenti e il
 * totale finale modificabile (`partita.finali[pgId]` se c'è, altrimenti il suggerito). Non assegna nulla.
 */
export function calcolaPartita(partita, pxGiocatori, p) {
  const perGiocatore = {};
  for (const pgId of Object.keys(partita?.partecipanti ?? {})) {
    const comp = componentiGiocatore(partita, pgId, num(pxGiocatori?.[pgId]), p);
    const finale = partita?.finali?.[pgId];
    perGiocatore[pgId] = {
      ...comp,
      totaleFinale: Number.isFinite(Number(finale)) ? Number(finale) : comp.totaleSuggerito,
    };
  }
  return { perGiocatore };
}

/** Un giocatore entra nell'assegnazione se è presente, se la partita gli dà il premio di fine Atto (anche da assente),
    o se gli aveva già assegnato qualcosa (una correzione deve poter togliere). */
const contaNellaPartita = (partita, pgId, g) => !!g.presente || haPremio(partita, pgId) || Number.isFinite(Number(partita?.assegnato?.[pgId]));

/**
 * Delta da applicare a ogni PG presente quando si preme «Assegna PX della partita»: la differenza fra il
 * totale finale scelto e quanto già assegnato da QUESTA partita (così correggere aggiorna, non raddoppia).
 * Ritorna { pgId: delta } solo per i presenti con delta ≠ 0.
 */
export function deltaAssegnazione(partita, pxGiocatori, p) {
  const { perGiocatore } = calcolaPartita(partita, pxGiocatori, p);
  const delta = {};
  for (const [pgId, g] of Object.entries(perGiocatore)) {
    if (!contaNellaPartita(partita, pgId, g)) continue;
    const gia = num(partita?.assegnato?.[pgId]);
    const d = arrotonda(g.totaleFinale) - gia;
    if (d !== 0) delta[pgId] = d;
  }
  return delta;
}

/**
 * Chi, con questa assegnazione, supera la soglia del livello successivo (le soglie cumulative di `soglie_px`,
 * A.170). Solo un avviso per chi assegna (25/10/2026): non blocca e non cambia nulla — il livello del PG lo sale il
 * giocatore con «Sali di livello». `limitatoDallAtto` dice che l'Atto corrente non consente ancora di salire fin lì.
 * @returns [{ id, da, a, pxPrima, pxDopo, limitatoDallAtto }] con `da` e `a` livelli dai PX (senza il limite dell'Atto)
 */
export function passaggiDiLivello(partita, pxGiocatori, p) {
  const delta = deltaAssegnazione(partita, pxGiocatori, p);
  const passaggi = [];
  for (const [id, d] of Object.entries(delta)) {
    const pxPrima = num(pxGiocatori?.[id]);
    const pxDopo = pxPrima + d;
    const da = livelloDaPx(pxPrima, p);
    const a = livelloDaPx(pxDopo, p);
    if (a > da) passaggi.push({ id, da, a, pxPrima, pxDopo, limitatoDallAtto: a > limiteAtto(partita?.atto, p) });
  }
  return passaggi;
}

/** La frase per chi assegna: «Aiko passa dal livello 5 al 6.» (con l'Atto che frena, se è il caso). */
export function frasePassaggio(passaggio, nome) {
  const cosa = passaggio.a - passaggio.da > 1 ? `le soglie dal livello ${passaggio.da} al ${passaggio.a}` : `la soglia del livello ${passaggio.a}`;
  const atto = passaggio.limitatoDallAtto ? ' (l’Atto corrente non lo consente ancora: i PX restano e valgono quando si sblocca)' : '';
  return `${nome} supera ${cosa}${atto}.`;
}

/**
 * Partita dopo l'assegnazione: registra gli importi finali in `assegnato`, lo stato e la data. I totali finali
 * si rileggono dal calcolo (con i px attuali). Idempotente a parità di px e di totali finali.
 */
export function partitaAssegnata(partita, pxGiocatori, quando, p) {
  const { perGiocatore } = calcolaPartita(partita, pxGiocatori, p);
  const assegnato = {};
  const pxPrima = { ...(partita?.pxPrima ?? {}) };
  for (const [pgId, g] of Object.entries(perGiocatore)) {
    if (!contaNellaPartita(partita, pgId, g)) continue;
    assegnato[pgId] = arrotonda(g.totaleFinale);
    if (!Number.isFinite(Number(pxPrima[pgId]))) pxPrima[pgId] = num(pxGiocatori?.[pgId]); // solo alla prima assegnazione
  }
  return { ...partita, assegnato, pxPrima, statoAssegnazione: 'assegnata', assegnataIl: quando };
}

/**
 * Riepilogo/classifica per ogni giocatore: PX = baseline + somma di SOLO gli importi assegnati; livello,
 * PX mancanti al prossimo (o «—» a livello massimo), medie dei voti nelle partite presenti, numero di partite.
 * `giocatori`: [{ id, pg?, giocatore? }]. `impostazioni`: { baseline, atto }.
 */
export function riepilogo(partite, giocatori, impostazioni, p) {
  const baseline = num(impostazioni?.baseline);
  const atto = impostazioni?.atto;
  const assegnate = (partite ?? []).filter((m) => m.statoAssegnazione === 'assegnata');
  const righe = (giocatori ?? []).map((g) => {
    let px = baseline;
    let nPartite = 0;
    const somma = { partecipazione: 0, interpretazione: 0, contributo: 0 };
    let presenze = 0;
    for (const m of assegnate) {
      if (Number.isFinite(Number(m.assegnato?.[g.id]))) px += Number(m.assegnato[g.id]);
      const part = m.partecipanti?.[g.id];
      if (part?.presente) {
        presenze += 1;
        somma.partecipazione += num(part.partecipazione);
        somma.interpretazione += num(part.interpretazione);
        somma.contributo += num(part.contributo);
      }
      if (m.assegnato && g.id in m.assegnato && part?.presente) nPartite += 1; // un premio di Atto da assente non è una partita giocata
    }
    const livelloReale = livelloDaPx(px, p);
    const livello = Math.min(livelloReale, limiteAtto(atto, p));
    const maxLiv = p.titoli[p.titoli.length - 1].livello_max;
    let mancanti;
    if (livelloReale >= maxLiv) mancanti = '—';
    else if (livelloReale >= limiteAtto(atto, p)) mancanti = 'Atto bloccato';
    else mancanti = Math.max(0, p.soglie_px[livelloReale] - px);
    const media = (k) => (presenze ? somma[k] / presenze : null);
    return {
      id: g.id, pg: g.pg ?? g.id, giocatore: g.giocatore ?? '',
      px, partite: nPartite, livello, titolo: titoloPerLivello(livello, p).nome, mancanti,
      mediaPartecipazione: media('partecipazione'),
      mediaInterpretazione: media('interpretazione'),
      mediaContributo: media('contributo'),
    };
  });
  righe.sort((a, b) => b.px - a.px);
  return righe;
}

const csvCampo = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const media2 = (n) => (n === null || n === undefined ? '' : n.toFixed(2).replace('.', ','));

/** Riepilogo in CSV (separatore «;», decimale «,» come l'Excel italiano). */
export function csvRiepilogo(righe, p) {
  const intest = ['Giocatore', 'Personaggio', 'Partite', 'PX totali', 'Livello', 'PX al prossimo livello',
    `Media ${p.voti.componenti[0]}`, `Media ${p.voti.componenti[1]}`, `Media ${p.voti.componenti[2]}`];
  const corpo = (righe ?? []).map((r) => [r.giocatore, r.pg, r.partite, r.px, r.livello, r.mancanti,
    media2(r.mediaPartecipazione), media2(r.mediaInterpretazione), media2(r.mediaContributo)]);
  return [intest, ...corpo].map((riga) => riga.map(csvCampo).join(';')).join('\r\n');
}

/**
 * Importa l'archivio del vecchio gestore (JSON del backup: { version, title, act, baselineXP, roster, sessions }).
 * Normalizza alle nostre partite SENZA riassegnare: le partite importate risultano già «assegnate» con i loro
 * importi, così un successivo «Assegna» calcola delta 0. Ritorna { impostazioni, giocatori, partite, avvisi }.
 */
// ---------------------------------------------------------------------------------------------
// «Le code dell'originale» (21/10/2026), parte C: `giocatori[].pgFile` legava un giocatore a un NOME DI FILE,
// che invecchia (un livello o un nuovo nome cambia il file, e l'abbinamento si stacca in silenzio portandosi
// dietro i PX — lo stesso difetto già tolto altrove con l'identificativo stabile). Qui: `pgStabile`,
// l'identificativo che non cambia mai (src/cartella.js → idStabileDiFile/fileDiPgStabile, condivise con
// l'abbinamento dei tablet, src/dispositivi.js), e come migrare quello che c'è già. Si chiama «pgStabile» e non
// «pgId» perché in questo file `pgId` è già preso: è la chiave del giocatore dentro
// `partita.partecipanti`/`pxGiocatori` (vedi sopra), un'altra cosa.

/**
 * Migrazione silenziosa di `giocatori[]` da `pgFile` (nome di file) a `pgStabile` (identificativo stabile): le
 * righe che si risolvono (il loro `pgFile` è ancora nell'elenco) restano collegate allo stesso personaggio anche
 * dopo un livello o un nuovo nome. Quelle che non si risolvono (il file non c'è più nell'elenco, per esempio
 * spostato a mano in `storico/`) non si indovinano: restano come sono, per Marcello.
 * @returns { db, cambiato, nonMigrate: [{ id, giocatore, pgFile }] }
 */
export function migraGiocatoriAPgStabile(db, elenco) {
  const nonMigrate = [];
  let cambiato = false;
  const giocatori = (db?.giocatori ?? []).map((g) => {
    if (g.pgStabile || !g.pgFile) return g; // già migrato, o nessun PG associato: niente da fare
    const f = (elenco ?? []).find((x) => x.file === g.pgFile);
    if (!f) { nonMigrate.push({ id: g.id, giocatore: g.giocatore ?? '', pgFile: g.pgFile }); return g; }
    cambiato = true;
    return { ...g, pgStabile: idStabileDiFile(f) };
  });
  return { db: cambiato ? { ...db, giocatori } : db, cambiato, nonMigrate };
}

/** Il file attuale del PG di una riga `giocatori[]`: per `pgStabile` se c'è (si risolve da solo dopo un livello
    o un nuovo nome), altrimenti per `pgFile` (righe non ancora migrate). null se non si trova. */
export function fileDelGiocatore(elenco, g) {
  return (g?.pgStabile ? fileDiPgStabile(elenco, g.pgStabile) : null) ?? (elenco ?? []).find((f) => f.file === g?.pgFile) ?? null;
}

export function importaArchivio(gestore, p) {
  const avvisi = [];
  if (!gestore || typeof gestore !== 'object') return { impostazioni: null, giocatori: [], partite: [], avvisi: ['File non riconosciuto.'] };
  const giocatori = (gestore.roster ?? []).map((r) => ({ id: r.id, pg: r.char ?? r.pg ?? r.id, giocatore: r.player ?? r.giocatore ?? '' }));
  const impostazioni = { baseline: num(gestore.baselineXP ?? gestore.baseline ?? p.campagna.baseline_px_default),
    atto: gestore.act ?? gestore.atto ?? p.campagna.atto_default };
  const righeGioc = giocatori.length ? giocatori : Object.keys((gestore.sessions ?? [])[0]?.participants ?? {}).map((id) => ({ id, pg: id, giocatore: '' }));
  const pxGiocatori = Object.fromEntries(righeGioc.map((g) => [g.id, impostazioni.baseline]));
  const partite = (gestore.sessions ?? gestore.partite ?? []).map((s, i) => {
    const partecipanti = {};
    for (const [id, v] of Object.entries(s.participants ?? s.partecipanti ?? {})) {
      partecipanti[id] = {
        presente: !!(v.present ?? v.presente),
        partecipazione: num(v.participation ?? v.partecipazione),
        interpretazione: num(v.interpretation ?? v.interpretazione),
        contributo: num(v.contribution ?? v.contributo),
        eccezionale: num(v.exceptional ?? v.eccezionale),
      };
    }
    const incontri = (s.encounters ?? s.incontri ?? []).map((e) => ({
      id: e.id, nome: e.name ?? e.nome, esito: e.outcome ?? e.esito ?? '',
      nemici: (e.enemies ?? e.nemici ?? []).map((x) => ({
        nome: x.name ?? x.nome, titolo: x.title ?? x.titolo, gear: x.gear,
        px: Number.isFinite(Number(x.px)) ? Number(x.px) : undefined,
        qty: num(x.qty) || 1, principale: !!(x.main ?? x.principale),
      })),
    }));
    const partita = {
      id: s.id ?? `importata-${i + 1}`, data: s.date ?? s.data ?? '', titolo: s.title ?? s.titolo ?? `Partita ${i + 1}`,
      durata: num(s.duration ?? s.durata) || 1, atto: s.act ?? s.atto ?? impostazioni.atto,
      premioAtto: !!(s.actAward ?? s.premioAtto), note: s.notes ?? s.note ?? '',
      partecipanti, incontri,
    };
    // «senza assegnare di nuovo»: registra gli importi calcolati come già assegnati
    const assegnata = partitaAssegnata(partita, pxGiocatori, gestore.createdAt ?? '', p);
    return assegnata;
  });
  if (!partite.length) avvisi.push('Nessuna partita nell’archivio.');
  return { impostazioni, giocatori: righeGioc, partite, avvisi };
}

/**
 * Quali partite già assegnate risulterebbero diverse se il livello da cui si ricava il Titolo fosse sfalsato di `scarto`
 * livelli (lotto 132: +1 = «il livello N letto come N+1»). Non corregge niente: serve a dire a Davide che cosa cambierebbe.
 * Il Titolo (e il suo fattore) dipende dai PX che il PG aveva PRIMA della partita (`pxPrima`); la differenza è sulla
 * componente che il fattore moltiplica (voti × durata e bonus eccezionale). Solo i PG con `pxPrima` registrato.
 * @returns [{ partita, data, pg, pxPrima, livello, titolo, fattore, titoloSfalsato, fattoreSfalsato, deltaPx }] solo le diverse
 */
export function partiteDiverseSeSfalsato(partite, scarto, p) {
  const out = [];
  for (const m of partite ?? []) {
    if (m?.statoAssegnazione !== 'assegnata') continue;
    for (const [pgId, part] of Object.entries(m.partecipanti ?? {})) {
      if (!part?.presente || !Number.isFinite(Number(m.pxPrima?.[pgId]))) continue;
      const px = Number(m.pxPrima[pgId]);
      const livello = livelloPg(px, m.atto, p);
      const manuale = p.titoli.find((x) => x.nome === m.titoliManuali?.[pgId]);
      if (manuale) continue; // il Titolo scelto a mano dal Direttore non dipende dal livello
      const reale = titoloPerLivello(livello, p);
      const falso = titoloPerLivello(Math.max(1, Math.min(p.soglie_px.length, livello + scarto)), p);
      if (reale.fattore === falso.fattore) continue;
      const base = (num(part.partecipazione) + num(part.interpretazione) + num(part.contributo)) * moltiplicatoreDurata(m.durata, p) + num(part.eccezionale);
      out.push({ partita: m.id, data: m.data ?? null, pg: pgId, pxPrima: px, livello, titolo: reale.nome, fattore: reale.fattore, titoloSfalsato: falso.nome, fattoreSfalsato: falso.fattore, deltaPx: arrotonda(base * (falso.fattore - reale.fattore)) });
    }
  }
  return out;
}

/** Le fasce di PX in cui il Titolo cambierebbe se il livello fosse sfalsato di `scarto`: [{ da, a, titolo, titoloSfalsato }]. */
export function fasceDiversePerScarto(scarto, p) {
  const s = p.soglie_px;
  const out = [];
  for (let l = 1; l <= s.length; l += 1) {
    const reale = titoloPerLivello(l, p);
    const falso = titoloPerLivello(Math.max(1, Math.min(s.length, l + scarto)), p);
    if (reale.fattore !== falso.fattore) out.push({ livello: l, da: s[l - 1], a: l < s.length ? s[l] - 1 : null, titolo: reale.nome, titoloSfalsato: falso.nome });
  }
  return out;
}
