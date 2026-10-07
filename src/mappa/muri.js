// Muri e terreno difficile della mappa di battaglia (lotto 5 di docs/battlemap/piano.md; §6 della specifica): pennello
// per Q lungo il tratto e rettangolo, in modalità «Muro», «Terreno difficile» o «Gomma». Un Q è muro oppure terreno
// difficile, mai tutti e due: «Muro» toglie il terreno difficile, «Terreno difficile» toglie il muro, «Gomma» toglie
// entrambi. Ogni tratto è una voce della pila «annulla» della scena, con le differenze compatte delle due maschere
// (src/mappa/nebbia.js → differenza). Funzioni pure.
import { daBase64, inBase64, pennello, rettangolo } from './celle.js';
import { differenza, tratto } from './nebbia.js';

export const MODI_MURI = ['muro', 'terreno', 'gomma'];

/** Valori dei due bit per un modo: { muro, terreno }. */
const valori = (modo) => ({ muro: modo === 'muro', terreno: modo === 'terreno' });

/**
 * Muri e terreno nuovi (maschere già calcolate) con la loro voce di «annulla»: { tipo: 'muri', muri, terreno } con le
 * differenze. Nessun cambiamento: la scena com'è.
 */
export function conMuri(scena, muri, terreno, dati, adesso = new Date()) {
  const { colonne: C, righe: R } = scena.griglia;
  const dm = differenza(daBase64(scena.muri), muri, C, R);
  const dt = differenza(daBase64(scena.terreno), terreno, C, R);
  if (!dm.length && !dt.length) return scena;
  return {
    ...scena,
    muri: inBase64(muri),
    terreno: inBase64(terreno),
    annulla: [...scena.annulla, { tipo: 'muri', muri: dm, terreno: dt, quando: adesso.toISOString() }].slice(-dati.mappa.scena.annulla_max),
  };
}

/** Le due maschere dopo un tratto di pennello da `da` ad `a`, di `lato` Q. */
export function trattoMuri(scena, da, a, lato, modo) {
  const { colonne: C, righe: R } = scena.griglia;
  const v = valori(modo);
  return {
    muri: tratto(daBase64(scena.muri), C, R, da, a, lato, v.muro),
    terreno: tratto(daBase64(scena.terreno), C, R, da, a, lato, v.terreno),
  };
}

/** Pennellata completa (una voce di «annulla»). */
export function pennellataMuri(scena, da, a, lato, modo, dati, adesso) {
  const m = trattoMuri(scena, da, a, lato, modo);
  return conMuri(scena, m.muri, m.terreno, dati, adesso);
}

/** Rettangolo di muri, terreno o gomma fra due Q, estremi compresi (una voce di «annulla»). */
export function rettangoloMuri(scena, a, b, modo, dati, adesso) {
  const { colonne: C, righe: R } = scena.griglia;
  const v = valori(modo);
  return conMuri(scena,
    rettangolo(daBase64(scena.muri), C, R, a[0], a[1], b[0], b[1], v.muro),
    rettangolo(daBase64(scena.terreno), C, R, a[0], a[1], b[0], b[1], v.terreno), dati, adesso);
}

/** Passi di una pennellata mentre si trascina: maschere cambiate senza voce di «annulla». */
export function muriProvvisori(scena, m) {
  return { ...scena, muri: inBase64(m.muri), terreno: inBase64(m.terreno) };
}

/** Fine della pennellata: una voce sola dalle maschere di partenza (base64) a quelle attuali. */
export function chiudiTrattoMuri(scena, iniziali, dati, adesso) {
  return conMuri({ ...scena, muri: iniziali.muri, terreno: iniziali.terreno }, daBase64(scena.muri), daBase64(scena.terreno), dati, adesso);
}

/** Pennello quadrato in un solo punto (per il clic senza trascinamento). */
export function puntoMuri(scena, q, lato, modo, dati, adesso) {
  const { colonne: C, righe: R } = scena.griglia;
  const v = valori(modo);
  return conMuri(scena,
    pennello(daBase64(scena.muri), C, R, q[0], q[1], lato, v.muro),
    pennello(daBase64(scena.terreno), C, R, q[0], q[1], lato, v.terreno), dati, adesso);
}
