// Nebbia della mappa di battaglia (lotto 4 di docs/battlemap/piano.md; §5 della specifica): pennello per Q lungo il
// tratto, rettangolo, «Copri tutto» e «Rivela tutto», ciascuno in modalità «Rivela» o «Copri»; ogni pennellata entra
// nella pila «annulla» della scena come differenza compatta (tratti di Q cambiati), così Ctrl+Z la ripristina.
// Maschera: src/mappa/celle.js (1 = coperto). Funzioni pure.
import { daBase64, inBase64, pennello, rettangolo, nuovaMaschera, cella } from './celle.js';

/** «Copri» mette la nebbia (1), «Rivela» la toglie (0). */
export const valoreModo = (modo) => modo === 'copri';

/**
 * Pennello lungo il tratto da `da` ad `a` (Q della griglia), un passo per Q (Bresenham), così un movimento veloce
 * del mouse non lascia buchi. Restituisce una maschera nuova.
 */
export function tratto(m, colonne, righe, da, a, lato, valore) {
  let r = m;
  let [x, y] = da;
  const [x1, y1] = a;
  const dx = Math.abs(x1 - x), dy = -Math.abs(y1 - y);
  const sx = x < x1 ? 1 : -1, sy = y < y1 ? 1 : -1;
  let e = dx + dy;
  for (;;) {
    r = pennello(r, colonne, righe, x, y, lato, valore);
    if (x === x1 && y === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x += sx; }
    if (e2 <= dx) { e += dx; y += sy; }
  }
  return r;
}

/**
 * Differenza fra due maschere della stessa griglia: i tratti di Q consecutivi (indice = y × colonne + x) che
 * cambiano, come [[inizio, lunghezza], …]. Una pennellata o un rettangolo cambiano pochi tratti: la voce di
 * «annulla» resta piccola anche su griglie grandi.
 */
export function differenza(a, b, colonne, righe) {
  const n = colonne * righe;
  const tratti = [];
  let inizio = -1;
  for (let i = 0; i <= n; i++) {
    const diversa = i < n && ((a[i >> 3] ^ b[i >> 3]) & (1 << (i & 7))) !== 0;
    if (diversa && inizio < 0) inizio = i;
    else if (!diversa && inizio >= 0) { tratti.push([inizio, i - inizio]); inizio = -1; }
  }
  return tratti;
}

/** Inverte i Q dei tratti (applicare due volte la stessa differenza torna al punto di partenza). */
export function inverti(m, tratti) {
  const r = m.slice();
  for (const [inizio, lunghezza] of tratti) for (let i = inizio; i < inizio + lunghezza; i++) r[i >> 3] ^= 1 << (i & 7);
  return r;
}

/** Quanti Q cambiano in una differenza. */
export const quantiQ = (tratti) => tratti.reduce((s, [, n]) => s + n, 0);

/**
 * Nebbia nuova della scena (maschera già calcolata) con la sua voce di «annulla» in coda (al massimo
 * data/mappa.json → scena.annulla_max voci: le più vecchie escono). Nessun cambiamento: la scena com'è.
 */
export function conNebbia(scena, nuova, dati, adesso = new Date()) {
  const { colonne, righe } = scena.griglia;
  const prima = daBase64(scena.nebbia.coperti);
  const tratti = differenza(prima, nuova, colonne, righe);
  if (!tratti.length) return scena;
  const voce = { tipo: 'nebbia', tratti, quando: adesso.toISOString() };
  return {
    ...scena,
    nebbia: { ...scena.nebbia, coperti: inBase64(nuova) },
    annulla: [...scena.annulla, voce].slice(-dati.mappa.scena.annulla_max),
  };
}

/** Pennellata da `da` ad `a` (Q), di `lato` Q, in modalità «rivela» o «copri». */
export function pennellata(scena, da, a, lato, modo, dati, adesso) {
  const { colonne, righe } = scena.griglia;
  return conNebbia(scena, tratto(daBase64(scena.nebbia.coperti), colonne, righe, da, a, lato, valoreModo(modo)), dati, adesso);
}

/** Rettangolo di nebbia fra due Q, estremi compresi. */
export function rettangoloNebbia(scena, a, b, modo, dati, adesso) {
  const { colonne, righe } = scena.griglia;
  return conNebbia(scena, rettangolo(daBase64(scena.nebbia.coperti), colonne, righe, a[0], a[1], b[0], b[1], valoreModo(modo)), dati, adesso);
}

/** «Copri tutto» o «Rivela tutto». */
export function tuttaNebbia(scena, modo, dati, adesso) {
  const { colonne, righe } = scena.griglia;
  return conNebbia(scena, nuovaMaschera(colonne, righe, valoreModo(modo)), dati, adesso);
}

/**
 * Nebbia cambiata senza voce di «annulla»: i passi di una pennellata mentre si trascina. A fine pennellata
 * `chiudiPennellata` registra una voce sola per tutto il tratto.
 */
export function nebbiaProvvisoria(scena, maschera) {
  return { ...scena, nebbia: { ...scena.nebbia, coperti: inBase64(maschera) } };
}

/**
 * Fine di una pennellata (il trascinamento del mouse): una voce sola di «annulla» dalla nebbia di partenza
 * (`iniziale`, base64) a quella attuale. Il resto della scena (token cambiati nel frattempo) resta quello attuale.
 */
export function chiudiPennellata(scena, iniziale, dati, adesso) {
  return conNebbia({ ...scena, nebbia: { ...scena.nebbia, coperti: iniziale } }, daBase64(scena.nebbia.coperti), dati, adesso);
}

/**
 * Ctrl+Z della nebbia: toglie l'ultima voce «nebbia» della pila e la ripristina. Restituisce { scena, voce } oppure
 * null se non c'è nulla da annullare. Le voci di altri tipi (lotti successivi) restano dove sono.
 */
export function annullaNebbia(scena) {
  const i = scena.annulla.map((v) => v?.tipo).lastIndexOf('nebbia');
  if (i < 0) return null;
  const voce = scena.annulla[i];
  const coperti = inBase64(inverti(daBase64(scena.nebbia.coperti), voce.tratti));
  return { scena: { ...scena, nebbia: { ...scena.nebbia, coperti }, annulla: scena.annulla.filter((_, j) => j !== i) }, voce };
}

/**
 * Tratti di Q coperti riga per riga, per disegnare la nebbia con pochi rettangoli: [[y, x0, x1], …] (x1 escluso),
 * solo nelle righe e colonne fra i limiti dati (la parte visibile).
 */
export function trattiCoperti(m, colonne, righe, { x0 = 0, x1 = colonne, y0 = 0, y1 = righe } = {}) {
  const r = [];
  for (let y = Math.max(0, y0); y < Math.min(righe, y1); y++) {
    let inizio = -1;
    for (let x = Math.max(0, x0); x <= Math.min(colonne, x1); x++) {
      const c = x < Math.min(colonne, x1) && cella(m, colonne, righe, x, y);
      if (c && inizio < 0) inizio = x;
      else if (!c && inizio >= 0) { r.push([y, inizio, x]); inizio = -1; }
    }
  }
  return r;
}
