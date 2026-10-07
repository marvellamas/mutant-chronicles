// Colori dei bordi dei token (decisione di Marcello del 06/10/2026, dopo il lotto 6 di docs/battlemap/piano.md).
//   PG          bordo pieno, un colore per PG dalla tavolozza dei PG, assegnato al primo ingresso in mappa e stabile
//               (scena.colori.pg[chiave del PG]); due PG non hanno lo stesso colore finché ce ne sono di liberi;
//   nemici      bordo tratteggiato che alterna nero e un colore della tavolozza dei nemici, uno per tipo
//               (scena.colori.nemici[tipo]): le copie si distinguono dal numero («P2»);
//   alleati     (nemici o partecipanti a mano dalla parte dei PG): bordo pieno grigio-petrolio, doppio;
//   veicoli     il colore del PG proprietario (bordo pieno, rettangolo); del gruppo: grigio neutro.
// Ogni bordo ha un contorno sottile scuro o chiaro (il più contrastato col colore), così si legge su mappe chiare e
// scure. Il master cambia il colore di un PG o di un tipo di nemico. Tavolozze in data/mappa.json → colori. Pure.
import { stessaChiave } from '../veicoli-registro.js';

/** Rapporto di contrasto WCAG fra due colori «#rrggbb». */
export function contrasto(a, b) {
  const l = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [x, y] = [l(a), l(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** Il contorno (nero o bianco) più contrastato con il colore del bordo. */
export const contornoPer = (colore, C) => (contrasto(colore, C.contorno_scuro) >= contrasto(colore, C.contorno_chiaro) ? C.contorno_scuro : C.contorno_chiaro);

const valore = (tavolozza, id) => tavolozza.find((c) => c.id === id)?.valore ?? null;
/** Chiave del tipo per il colore di un nemico: il tipo del bestiario, o il nome senza numero se scritto a mano. */
const tipoDi = (p) => p.nemico ?? `a-mano:${String(p.nome ?? '').replace(/\s+\d+$/, '').trim().toLowerCase()}`;
/** Che famiglia di colore ha il pezzo: 'pg', 'nemici', 'alleato', 'veicolo'. */
export function famiglia(p) {
  if (!p) return null;
  if (p.tipo === 'pg') return 'pg';
  if (p.tipo === 'veicolo') return 'veicolo';
  return p.lato === 'alleato' ? 'alleato' : 'nemici';
}

/**
 * Bordo del token di un pezzo: { colore, contorno, tratteggio: null | colore alterno, doppio, famiglia, id }.
 * @param colori scena.colori ({ pg: { chiave: id }, nemici: { tipo: id } }), anche vuoto
 */
export function bordoToken(p, colori, dati) {
  const C = dati.mappa.colori;
  const fam = famiglia(p);
  let id = null, colore = null;
  if (fam === 'pg') { id = colori?.pg?.[p.pg] ?? null; colore = valore(C.pg, id); }
  else if (fam === 'nemici') { id = colori?.nemici?.[tipoDi(p)] ?? null; colore = valore(C.nemici, id); }
  else if (fam === 'veicolo') { id = p.proprietario ? Object.entries(colori?.pg ?? {}).find(([k]) => stessaChiave(k, p.proprietario))?.[1] ?? null : null; colore = valore(C.pg, id) ?? C.veicolo_del_gruppo; }
  else if (fam === 'alleato') colore = C.alleati;
  colore ??= fam === 'nemici' ? C.nemici[0].valore : C.senza_colore;
  return { famiglia: fam, id, colore, contorno: contornoPer(colore, C), tratteggio: fam === 'nemici' ? C.nemici_alterno : null, doppio: fam === 'alleato' };
}

/** Il primo colore libero della tavolozza (o il meno usato, se sono finiti). */
function primoLibero(tavolozza, usati) {
  const conta = new Map(tavolozza.map((c) => [c.id, 0]));
  for (const u of usati) if (conta.has(u)) conta.set(u, conta.get(u) + 1);
  const min = Math.min(...conta.values());
  return tavolozza.find((c) => conta.get(c.id) === min).id;
}

/**
 * Colori per i token in mappa che non ne hanno ancora uno (primo ingresso): PG e tipi di nemico. Restituisce la stessa
 * scena se non cambia nulla.
 */
export function assegnaColori(scena, pezzi, dati) {
  const C = dati.mappa.colori;
  const perChiave = new Map(pezzi.map((p) => [p.chiave, p]));
  const pg = { ...(scena.colori?.pg ?? {}) }, nemici = { ...(scena.colori?.nemici ?? {}) };
  let cambiato = false;
  for (const t of scena.token) {
    const p = perChiave.get(`${t.rif?.tipo}:${t.rif?.id ?? ''}`);
    const fam = famiglia(p);
    if (fam === 'pg' && p.pg && !pg[p.pg]) { pg[p.pg] = primoLibero(C.pg, Object.values(pg)); cambiato = true; }
    if (fam === 'nemici' && !nemici[tipoDi(p)]) { nemici[tipoDi(p)] = primoLibero(C.nemici, Object.values(nemici)); cambiato = true; }
  }
  return cambiato ? { ...scena, colori: { pg, nemici } } : scena;
}

/** Il master cambia il colore di un PG o di un tipo di nemico (per tutte le sue copie). */
export function cambiaColore(scena, p, id) {
  const fam = famiglia(p);
  if (fam !== 'pg' && fam !== 'nemici') return scena;
  const colori = { pg: { ...(scena.colori?.pg ?? {}) }, nemici: { ...(scena.colori?.nemici ?? {}) } };
  if (fam === 'pg') colori.pg[p.pg] = id; else colori.nemici[tipoDi(p)] = id;
  return { ...scena, colori };
}

/** La tavolozza fra cui scegliere per il pezzo (null: colore fisso, come alleati e veicoli). */
export const tavolozzaPer = (p, dati) => ({ pg: dati.mappa.colori.pg, nemici: dati.mappa.colori.nemici })[famiglia(p)] ?? null;
