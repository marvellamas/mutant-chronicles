// Usi limitati di Talenti, Specializzazioni/Maestrie, Talenti di Classe e del vantaggio dell'Addestramento (27/10/2026,
// lotto 129; frequenze del Giocatore 0.54 §3.2 e A.233 dal lotto 175, 05/11/2026). Il catalogo lo dice con un campo
// `usi: { frequenza, quantita, per? }` (mai nel codice: un Talento nuovo con un «usi» compare da solo nella tab
// Combattimento, src/ui/tab.js → riquadroUsiTalenti). Le frequenze sono sei: combattimento, sessione, giorno,
// settimana, scena, capitolo (regole.json → frequenze, con il testo di «quando torna»).
//
// sessione.usiTalenti = { chiave: { usati, frequenza?, scontro?, scena?, capitolo?, giorno?, data?, sistemi? } }.
// Un uso consumato si ricorda il MOMENTO in cui è stato consumato e conta solo finché quel momento è quello di adesso:
//   combattimento → l'id dello scontro (si azzera da solo all'inizio di uno scontro nuovo, come dal lotto 129);
//   scena, capitolo → il numero della scena e del capitolo del server (tavolo/momento.json): li cambia il Direttore
//     dalla plancia con «Nuova scena» e «Nuovo capitolo» (A.233). Il comando non scrive niente nei file dei PG: PM,
//     munizioni e riserve non possono cambiare; «Annulla» rimette il numero di prima e gli usi tornano a contare;
//   giorno → il giorno del Calendario del personaggio (se è acceso); settimana → la data dell'uso, torna dopo 7 giorni;
//   sessione → li toglie «Nuova sessione» (rinnovaSessione).
// Senza Calendario (giorno, settimana) o senza server (scena, capitolo) resta il «↺» a mano, come prima.
// `per` (Hacker: «una volta per sessione per ciascun sistema»): un contatore per ogni sistema, in `sistemi`.
const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export const FREQUENZE = ['combattimento', 'sessione', 'giorno', 'settimana', 'scena', 'capitolo'];
// lotto 129: «ambito» con tre valori; «scontro» è il combattimento
const DA_AMBITO = { scontro: 'combattimento', sessione: 'sessione', giorno: 'giorno' };

/** La frequenza di un «usi» dei dati (anche il vecchio «ambito»), o null. */
export const frequenzaDi = (usi) => (FREQUENZE.includes(usi?.frequenza) ? usi.frequenza : DA_AMBITO[usi?.ambito] ?? null);

/** Chiave di un Talento di Classe (non ha un id nei dati): il nome senza accenti e spazi. */
export const chiaveTalentoClasse = (nome) => `classe:${String(nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

const voce = (chiave, nome, usi) => {
  const frequenza = frequenzaDi(usi);
  if (!frequenza || !Number.isInteger(usi.quantita) || usi.quantita < 1) return null;
  return { chiave, nome, frequenza, quantita: usi.quantita, ...(typeof usi.per === 'string' && usi.per ? { per: usi.per } : {}) };
};

/**
 * Le voci con un «usi» che questo personaggio possiede davvero: Talenti Liberi, Specializzazioni/Maestrie (già
 * filtrate per il PG), Talenti di Classe (`scheda.talenti`) e il vantaggio dell'Addestramento (chiave «vantaggio»).
 * Una voce posseduta con `toglie_limite: [id]` toglie il contatore a quelle voci (Maestria Hacker toglie il limite di
 * Hacker): anche questo dai dati.
 * @returns [{ chiave, nome, frequenza, quantita, per? }]
 */
export function vociConUso(scheda) {
  const out = [];
  const tolti = new Set();
  const tutti = [...(scheda?.talentiLiberi ?? []), ...(scheda?.specializzazioni ?? [])];
  for (const t of [...tutti, ...(scheda?.talenti ?? [])]) for (const id of Array.isArray(t?.toglie_limite) ? t.toglie_limite : []) tolti.add(id);
  for (const t of tutti) {
    if (!isOggetto(t?.usi) || tolti.has(t.id)) continue;
    const v = voce(t.id, t.nome, t.usi);
    if (v) out.push(v);
  }
  const visti = new Set(out.map((v) => v.chiave));
  for (const t of scheda?.talenti ?? []) {
    if (!isOggetto(t?.usi)) continue;
    const k = chiaveTalentoClasse(t.nome);
    if (visti.has(k) || tolti.has(k)) continue;
    const v = voce(k, t.nome, t.usi);
    if (v) { out.push(v); visti.add(k); }
  }
  if (isOggetto(scheda?.vantaggio?.usi)) {
    const v = voce('vantaggio', scheda.vantaggio.nome, scheda.vantaggio.usi);
    if (v) out.push(v);
  }
  return out;
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const intero = (n) => Number.isInteger(n) && n >= 0;

/** Pulisce `sessione.usiTalenti`: per allineaSessione. */
export function allineaUsiTalenti(v) {
  if (!isOggetto(v)) return {};
  const out = {};
  for (const [chiave, x] of Object.entries(v)) {
    if (typeof chiave !== 'string' || !isOggetto(x) || !intero(x.usati)) continue;
    const sistemi = isOggetto(x.sistemi) ? Object.fromEntries(Object.entries(x.sistemi).filter(([s, n]) => typeof s === 'string' && s.trim() && intero(n) && n > 0)) : null;
    out[chiave] = {
      usati: x.usati,
      ...(FREQUENZE.includes(x.frequenza) ? { frequenza: x.frequenza } : {}),
      ...(typeof x.scontro === 'string' ? { scontro: x.scontro } : {}),
      ...(intero(x.scena) ? { scena: x.scena } : {}),
      ...(intero(x.capitolo) ? { capitolo: x.capitolo } : {}),
      ...(typeof x.giorno === 'string' && DATA.test(x.giorno) ? { giorno: x.giorno } : {}),
      ...(typeof x.data === 'string' && DATA.test(x.data) ? { data: x.data } : {}),
      ...(sistemi && Object.keys(sistemi).length ? { sistemi } : {}),
    };
  }
  return out;
}

/** Il momento di adesso: { scontro, scena, capitolo, data }. Una stringa (o null) è l'id dello scontro (lotto 129). */
export const momentoDa = (ctx) => (isOggetto(ctx) ? { scontro: ctx.scontro ?? null, scena: ctx.scena ?? null, capitolo: ctx.capitolo ?? null, data: ctx.data ?? null } : { scontro: ctx ?? null, scena: null, capitolo: null, data: null });

const giorni = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

/** L'uso registrato vale ancora adesso? Se no, la voce è tornata disponibile da sola. */
function ancoraValido(x, frequenza, m) {
  switch (frequenza) {
    case 'combattimento': return (x.scontro ?? null) === (m.scontro ?? null);
    // un uso segnato senza il numero (niente server) resta finché non si tocca «↺»
    case 'scena': return x.scena === undefined || x.scena === m.scena;
    case 'capitolo': return x.capitolo === undefined || x.capitolo === m.capitolo;
    case 'giorno': return !(m.data && x.giorno) || x.giorno === m.data;
    case 'settimana': return !(m.data && x.data) || giorni(x.data, m.data) < 7;
    default: return true; // sessione: la rinnova «Nuova sessione»
  }
}

/** Il segno del momento da scrivere nell'uso, secondo la frequenza. */
function segno(frequenza, m) {
  if (frequenza === 'combattimento') return { scontro: m.scontro ?? null };
  if (frequenza === 'scena') return Number.isInteger(m.scena) ? { scena: m.scena } : {};
  if (frequenza === 'capitolo') return Number.isInteger(m.capitolo) ? { capitolo: m.capitolo } : {};
  if (frequenza === 'giorno') return m.data ? { giorno: m.data } : {};
  if (frequenza === 'settimana') return m.data ? { data: m.data } : {};
  return {};
}

const freqDi = (v) => v.frequenza ?? DA_AMBITO[v.ambito] ?? null;

/**
 * Quanti ne ha già usati questa voce ADESSO (0 se il momento dell'uso è passato). Con `per` (Hacker) il conteggio è
 * del sistema indicato; senza sistema, il numero di sistemi già usati.
 */
export function usatiDi(sessione, v, ctx, { sistema = null } = {}) {
  const x = sessione?.usiTalenti?.[v.chiave];
  if (!x || !ancoraValido(x, freqDi(v), momentoDa(ctx))) return 0;
  if (v.per) return sistema ? x.sistemi?.[sistema] ?? 0 : Object.keys(x.sistemi ?? {}).length;
  return x.usati;
}

/** I sistemi (o simili) già usati in questo momento, per una voce con `per`. */
export function sistemiUsati(sessione, v, ctx) {
  const x = sessione?.usiTalenti?.[v.chiave];
  if (!v.per || !x || !ancoraValido(x, freqDi(v), momentoDa(ctx))) return [];
  return Object.entries(x.sistemi ?? {}).filter(([, n]) => n >= v.quantita).map(([s]) => s);
}

/** Le voci di questo personaggio con un «usi», pronte per la riga della tab Combattimento. */
export function statoUsiTalenti(scheda, sessione, ctx) {
  return vociConUso(scheda).map((v) => ({ ...v, usati: usatiDi(sessione, v, ctx), ...(v.per ? { sistemi: sistemiUsati(sessione, v, ctx) } : {}) }));
}

/**
 * Registra un uso in più (fino alla quantità; con `per`, fino alla quantità per quel sistema). Un uso il cui momento è
 * passato riparte da zero. Senza `sistema` una voce con `per` non cambia.
 */
export function usaUnaVolta(sessione, v, ctx, _m = null, { sistema = null } = {}) {
  const m = momentoDa(ctx);
  const freq = freqDi(v);
  const prima = sessione?.usiTalenti?.[v.chiave];
  const valido = prima && ancoraValido(prima, freq, m);
  let x;
  if (v.per) {
    const s = String(sistema ?? '').trim();
    if (!s) return sessione;
    const sistemi = valido ? { ...(prima.sistemi ?? {}) } : {};
    if ((sistemi[s] ?? 0) >= v.quantita) return sessione;
    sistemi[s] = (sistemi[s] ?? 0) + 1;
    x = { usati: Object.keys(sistemi).length, frequenza: freq, ...segno(freq, m), sistemi };
  } else {
    const gia = valido ? prima.usati : 0;
    if (gia >= v.quantita) return sessione;
    x = { usati: gia + 1, ...(freq ? { frequenza: freq } : {}), ...segno(freq, m) };
  }
  return { ...sessione, usiTalenti: { ...(isOggetto(sessione?.usiTalenti) ? sessione.usiTalenti : {}), [v.chiave]: x } };
}

/** Azzera a mano la voce `chiave` (il «↺» di ogni riga): torna come se non fosse mai stata usata. */
export function azzeraUso(sessione, chiave) {
  if (!sessione?.usiTalenti?.[chiave]) return sessione;
  const { [chiave]: _via, ...resto } = sessione.usiTalenti;
  return { ...sessione, usiTalenti: resto };
}

/**
 * «Nuova sessione» (A.233: «Gli usi per sessione si rinnovano all'inizio della partita»): toglie i contatori con
 * frequenza «sessione»; gli altri restano (interrompere la sessione durante un combattimento non rinnova gli usi per
 * combattimento, §3.2). `frequenze` = { chiave: frequenza } dai dati (massimiSessione → usi), per i contatori di prima.
 */
export function rinnovaSessione(usiTalenti, frequenze = {}) {
  if (!isOggetto(usiTalenti)) return {};
  return Object.fromEntries(Object.entries(usiTalenti).filter(([k, x]) => (x?.frequenza ?? frequenze[k]) !== 'sessione'));
}

/**
 * Quanti usi consumati tornerebbero disponibili con «Nuova scena» o «Nuovo capitolo» (la conferma del Direttore li
 * conta): le voci di quella frequenza con un uso valido adesso.
 * @returns [{ chiave, nome, usati }]
 */
export function daRinnovare(scheda, sessione, frequenza, ctx) {
  return statoUsiTalenti(scheda, sessione, ctx).filter((v) => v.frequenza === frequenza && v.usati > 0).map((v) => ({ chiave: v.chiave, nome: v.nome, usati: v.usati }));
}

/**
 * Quando torna disponibile un uso consumato, in parole (regole.json → frequenze): «torna a inizio scena», «torna
 * domani»… Per giorno e settimana senza Calendario, o scena e capitolo senza server, il testo dice che va a mano.
 */
export function quandoTorna(v, frequenzeRegole, ctx) {
  const m = momentoDa(ctx);
  const f = frequenzeRegole?.[v.frequenza];
  if (!f) return '';
  const aMano = ((v.frequenza === 'giorno' || v.frequenza === 'settimana') && !m.data) || ((v.frequenza === 'scena' || v.frequenza === 'capitolo') && !Number.isInteger(m[v.frequenza]));
  return aMano && f.a_mano ? f.a_mano : f.torna;
}
