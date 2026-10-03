// Durate degli incantesimi lanciati (richiesta di Marcello del 03/10/2026): «Lancia!» registra l'incantesimo fra gli
// effetti in corso, come «Attiva» le Tecniche Interiori (src/tecniche.js). Funzioni pure.
// - La durata della versione sta nei dati: incantesimi.json → meccanica.durata dice la colonna (fissa, a
//   Concentrazione, per modalità); il valore è quello della riga del livello (tools/durate_incantesimi.mjs).
// - Durate in RND: dal Round del lancio alla fine del Round R + N, il Round del lancio non conta (Magia, «Scadenze e
//   interruzione degli effetti»; data/regole.json → durate_round). Contano con il contatore della scheda o, con il
//   PG in uno scontro, con il Round dello scontro (src/round-scontro.js), come le Tecniche.
// - Durate in minuti, ore o giorni, condizioni e procedure: promemoria con il testo (e l'ora del calendario se c'è),
//   senza contatore; si chiudono con «Termina».
// - Anticipazione della durata (Magia sez. 12.3, con o senza Incantesimi Estesi): vale il valore anticipato della
//   scala della scheda (src/lancio.js → anticipazione.valore).
// - Effetti già calcolati dalla scheda: l'AR di Scudo, Armatura di Forza e Pelle Corazzata su sé stessi
//   (regole.json → ar.incantesimi), solo finché la durata è attiva (src/protezione.js).
// - Concentrazione: si mantiene un solo incantesimo; avviarne un altro a Concentrazione termina il precedente
//   (Magia, «Durata e Concentrazione»).
// Sessione: incantesimiAttivi [{ uid, nome, livello, dal, al, testo, concentrazione, modalita?, bersagli, ar?, quando? }]
// (al = ultimo Round in cui vale; null = a tempo, si termina a mano).
import { fineDurata } from './tecniche.js';

// livello di una riga delle versioni (colonne «Livello» o «Livello e PM»), come src/lancio.js → livelloVersione
const numero = (v) => { const n = parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10); return Number.isFinite(n) ? n : null; };
const livelloVersione = (r) => numero(r?.Livello ?? r?.['Livello e PM']);

const lista = (v) => (Array.isArray(v) ? v : []);
const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const roundDi = (s) => (Number.isInteger(s?.round) && s.round >= 1 ? s.round : 1);

/** Il valore di una durata: { round: N } per «N RND», { tempo: testo } per minuti, ore, giorni; null per «—» e istantanee. */
export function leggiDurata(testo) {
  const s = String(testo ?? '').trim();
  const m = /^(\d+)\s*(RND|rnd|Round)$/.exec(s);
  if (m) return { round: Number(m[1]), testo: `${m[1]} RND` };
  if (/^\d+\s*\S+/.test(s)) return { tempo: s, testo: s };
  return null;
}

/**
 * Durata di un lancio: { tipo: 'round'|'tempo'|'istantanea'|'condizione'|'procedura', round?, testo, concentrazione,
 * colonna, modalita?, anticipata }.
 * @param scelte { modalita: id, concentrazione: bool, anticipazione: valore anticipato di src/lancio.js }
 */
export function durataLancio(incantesimo, livello, { modalita = null, concentrazione = false, anticipazione = null } = {}) {
  const d = incantesimo?.meccanica?.durata;
  if (!d || d.tipo === 'istantanea') return { tipo: 'istantanea', testo: 'istantanea', concentrazione: false };
  if (d.tipo !== 'durata') return { tipo: d.tipo, testo: d.testo ?? d.tipo, concentrazione: false };
  const v = (incantesimo.versioni ?? []).find((r) => livelloVersione(r) === livello) ?? incantesimo.versioni?.[0] ?? {};
  const mod = d.modalita?.find((x) => x.id === modalita) ?? d.modalita?.[0] ?? null;
  // Concentrazione: la colonna a Concentrazione, oppure il doppio della durata fissa (Scudo)
  const conCon = concentrazione && (d.concentrazione || d.concentrazione_doppia);
  const colonna = mod?.colonna ?? (conCon && d.concentrazione ? d.concentrazione : d.colonna ?? d.concentrazione);
  let testo = v[colonna];
  // Anticipazione della durata (sez. 12.3): il valore della scala per questa colonna
  const ant = (anticipazione?.righe ?? []).find((x) => x.colonna === colonna);
  if (ant?.a) testo = ant.a;
  let val = leggiDurata(testo);
  if (conCon && d.concentrazione_doppia && val?.round) val = { round: val.round * 2, testo: `${val.round * 2} RND` };
  const obbligatoria = !d.colonna && !!d.concentrazione;
  const base = { colonna, ...(mod ? { modalita: mod.id, nomeModalita: mod.nome } : {}), concentrazione: !!conCon || obbligatoria, anticipata: !!ant?.a };
  if (!val) return { ...base, tipo: 'istantanea', testo: String(testo ?? 'istantanea') };
  return val.round ? { ...base, tipo: 'round', round: val.round, testo: val.testo } : { ...base, tipo: 'tempo', testo: val.testo };
}

/** Opzioni del lancio per la durata: modalità e scelta della Concentrazione. */
export function opzioniDurata(incantesimo) {
  const d = incantesimo?.meccanica?.durata;
  return {
    modalita: d?.modalita ?? [],
    concentrazioneAScelta: !!(d?.colonna && (d?.concentrazione || d?.concentrazione_doppia)),
    todo: d?.['TODO(Davide)'] ?? null,
  };
}

/** AR di un incantesimo su sé stessi (regole.json → ar.incantesimi): { totale, magica, gruppo } o null. */
export function arIncantesimo(incantesimo, livello, dati, anticipazione = null) {
  const c = (dati?.regole?.ar?.incantesimi ?? []).find((x) => x.incantesimo === incantesimo?.nome);
  if (!c) return null;
  const v = (incantesimo.versioni ?? []).find((r) => livelloVersione(r) === livello) ?? {};
  const ant = (anticipazione?.righe ?? []).find((x) => x.colonna === c.colonna);
  const n = Number(String(ant?.a ?? v[c.colonna] ?? '').replace(/[^\d]/g, ''));
  if (!Number.isInteger(n) || n <= 0) return null;
  return { totale: n, magica: c.magica ? n : 0, gruppo: c.gruppo ?? null };
}

let progressivo = 0;
const nuovoUid = (nome, r) => `inc:${String(nome).toLowerCase().replace(/[^a-z0-9]+/g, '-')}:${r}:${Date.now().toString(36)}${(progressivo++).toString(36)}`;

/**
 * Sessione dopo un lancio con durata: l'incantesimo entra fra gli effetti in corso (le istantanee no). Un nuovo
 * incantesimo a Concentrazione termina quello mantenuto prima. Il Round è quello della sessione (o dello scontro, vista).
 * @param voce { nome, livello, durata: durataLancio(), bersagli: [{ id?, nome, se? }], ar?, quando? }
 */
export function registraIncantesimo(sessione, voce, dati) {
  const d = voce?.durata;
  if (!sessione || !d || !['round', 'tempo', 'condizione'].includes(d.tipo)) return sessione;
  const r = roundDi(sessione);
  const al = d.tipo === 'round' ? fineDurata(r, d.round, dati) : null;
  const prima = lista(sessione.incantesimiAttivi);
  const restano = d.concentrazione ? prima.filter((x) => !x.concentrazione) : prima;
  const nuova = {
    uid: nuovoUid(voce.nome, r), nome: voce.nome, livello: voce.livello, dal: r, al, testo: d.testo, concentrazione: !!d.concentrazione,
    ...(d.nomeModalita ? { modalita: d.nomeModalita } : {}), bersagli: lista(voce.bersagli), ...(voce.ar ? { ar: voce.ar } : {}), ...(voce.quando ? { quando: voce.quando } : {}),
  };
  return { ...sessione, incantesimiAttivi: [...restano, nuova] };
}

/** «Termina»: incantesimo dissolto o Concentrazione interrotta. */
export const terminaIncantesimo = (sessione, uid) => ({ ...sessione, incantesimiAttivi: lista(sessione?.incantesimiAttivi).filter((x) => x.uid !== uid) });

/** Concentrazioni terminate da un nuovo lancio a Concentrazione (per l'avviso). */
export const concentrazioniInterrotte = (prima, dopo) => {
  const restano = new Set(lista(dopo?.incantesimiAttivi).map((x) => x.uid));
  return lista(prima?.incantesimiAttivi).filter((x) => x.concentrazione && !restano.has(x.uid)).map((x) => x.nome);
};

/** Allineamento degli incantesimi in corso letti da un file (src/sessione.js → allineaSessione). */
export function allineaIncantesimiAttivi(v) {
  return lista(v).filter((x) => isOggetto(x) && typeof x.uid === 'string' && typeof x.nome === 'string' && Number.isInteger(x.dal) && x.dal >= 1
    && (x.al === null || (Number.isInteger(x.al) && x.al >= x.dal)))
    .map((x) => ({
      uid: x.uid, nome: x.nome, livello: Number.isInteger(x.livello) ? x.livello : null, dal: x.dal, al: x.al, testo: typeof x.testo === 'string' ? x.testo : '',
      concentrazione: !!x.concentrazione, ...(typeof x.modalita === 'string' ? { modalita: x.modalita } : {}),
      bersagli: lista(x.bersagli).filter((b) => isOggetto(b) && typeof b.nome === 'string').map((b) => ({ nome: b.nome, ...(typeof b.id === 'string' ? { id: b.id } : {}), ...(b.se ? { se: true } : {}) })),
      ...(isOggetto(x.ar) && Number.isInteger(x.ar.totale) ? { ar: { totale: x.ar.totale, magica: Number.isInteger(x.ar.magica) ? x.ar.magica : 0, gruppo: x.ar.gruppo ?? null } } : {}),
      ...(typeof x.quando === 'string' ? { quando: x.quando } : {}),
    }));
}

/** Incantesimi in corso al Round della sessione (le durate in Round finite non ci sono più dopo alRound/nuovoRound). */
export const incantesimiInCorso = (sessione) => lista(sessione?.incantesimiAttivi).filter((x) => x.al === null || x.al >= roundDi(sessione));

/** AR degli incantesimi in corso su sé stessi, per src/protezione.js → calcolaAR: [{ nome, totale, magica, gruppo, al }]. */
export const arIncantesimiInCorso = (sessione) => incantesimiInCorso(sessione).filter((x) => x.ar && lista(x.bersagli).some((b) => b.se)).map((x) => ({ nome: x.nome, ...x.ar, al: x.al }));

/** «su di te», «Lucas», «Eretico 1, Eretico 2». */
export const testoBersagli = (b) => lista(b).map((x) => (x.se ? 'su di sé' : x.nome)).join(', ');

