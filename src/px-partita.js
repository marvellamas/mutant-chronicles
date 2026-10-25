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
 * A.170 (18/10): il premio di fine Atto va dato una sola volta per personaggio. Avviso, non blocco (decide il
 * Direttore): gli id dei giocatori presenti in `partita` che hanno già avuto il premio dello stesso Atto in
 * un'altra partita (assegnata, o in bozza con il premio disposto).
 */
export function premioGiaDato(partita, partite) {
  const ids = new Set();
  for (const m of partite ?? []) {
    if (m.id === partita?.id || m.atto !== partita?.atto || !m.premioAtto) continue;
    for (const [id, part] of Object.entries(m.partecipanti ?? {})) if (part?.presente && partita?.partecipanti?.[id]?.presente) ids.add(id);
  }
  return [...ids];
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
  const premio = presente && partita?.premioAtto ? premioAtto(partita.atto, p) : 0;
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

/**
 * Delta da applicare a ogni PG presente quando si preme «Assegna PX della partita»: la differenza fra il
 * totale finale scelto e quanto già assegnato da QUESTA partita (così correggere aggiorna, non raddoppia).
 * Ritorna { pgId: delta } solo per i presenti con delta ≠ 0.
 */
export function deltaAssegnazione(partita, pxGiocatori, p) {
  const { perGiocatore } = calcolaPartita(partita, pxGiocatori, p);
  const delta = {};
  for (const [pgId, g] of Object.entries(perGiocatore)) {
    if (!g.presente) continue;
    const gia = num(partita?.assegnato?.[pgId]);
    const d = arrotonda(g.totaleFinale) - gia;
    if (d !== 0) delta[pgId] = d;
  }
  return delta;
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
    if (!g.presente) continue;
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
      if (m.assegnato && g.id in m.assegnato) nPartite += 1;
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
