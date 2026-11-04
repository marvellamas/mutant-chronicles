// Muri e terreno difficile della mappa di battaglia (lotto 5 di docs/battlemap/piano.md; §6 della specifica): pennello
// per Q lungo il tratto e rettangolo, in modalità «Muro», «Terreno difficile» o «Gomma». Un Q è muro oppure terreno
// difficile, mai tutti e due: «Muro» toglie il terreno difficile, «Terreno difficile» toglie il muro, «Gomma» toglie
// entrambi. Ogni tratto è una voce della pila «annulla» della scena, con le differenze compatte delle due maschere
// (src/mappa/nebbia.js → differenza). Funzioni pure.
// A.224 (Davide, 03/11/2026): il muro a quadretti può essere di Roccia. La roccia è una terza maschera, sottoinsieme dei
// muri (un Q di roccia è sempre anche muro: ferma la vista e le altre creature); la attraversa solo chi ha la capacità
// (src/mappa/area.js → chi.attraversaRoccia). «Muro» rende il Q muro ordinario, «Roccia» muro di roccia, «Terreno
// difficile» e «Gomma» tolgono anche la roccia. Le scene di prima non hanno la maschera: nessuna roccia.
import { daBase64, inBase64, nuovaMaschera, pennello, rettangolo } from './celle.js';
import { differenza, tratto } from './nebbia.js';

export const MODI_MURI = ['muro', 'roccia', 'terreno', 'gomma'];

/** Valori dei tre bit per un modo: { muro, terreno, roccia }. */
const valori = (modo) => ({ muro: modo === 'muro' || modo === 'roccia', terreno: modo === 'terreno', roccia: modo === 'roccia' });

/** La maschera della roccia della scena (vuota se la scena non ne ha). */
export const rocciaDi = (scena) => daBase64(scena.roccia) ?? nuovaMaschera(scena.griglia.colonne, scena.griglia.righe);
/** La roccia c'è? (si scrive nella scena solo se c'è o c'era) */
const qualcosa = (m) => m.some((b) => b !== 0);

/**
 * Muri e terreno nuovi (maschere già calcolate) con la loro voce di «annulla»: { tipo: 'muri', muri, terreno } con le
 * differenze. Nessun cambiamento: la scena com'è.
 */
export function conMuri(scena, muri, terreno, dati, adesso = new Date(), roccia = null) {
  const { colonne: C, righe: R } = scena.griglia;
  const dm = differenza(daBase64(scena.muri), muri, C, R);
  const dt = differenza(daBase64(scena.terreno), terreno, C, R);
  const dr = roccia ? differenza(rocciaDi(scena), roccia, C, R) : [];
  if (!dm.length && !dt.length && !dr.length) return scena;
  const conRoccia = roccia && (scena.roccia !== undefined || qualcosa(roccia)) ? { roccia: inBase64(roccia) } : {};
  return {
    ...scena,
    muri: inBase64(muri),
    terreno: inBase64(terreno),
    ...conRoccia,
    annulla: [...scena.annulla, { tipo: 'muri', muri: dm, terreno: dt, ...(dr.length ? { roccia: dr } : {}), quando: adesso.toISOString() }].slice(-dati.mappa.scena.annulla_max),
  };
}

/** Le due maschere dopo un tratto di pennello da `da` ad `a`, di `lato` Q. */
export function trattoMuri(scena, da, a, lato, modo) {
  const { colonne: C, righe: R } = scena.griglia;
  const v = valori(modo);
  return {
    muri: tratto(daBase64(scena.muri), C, R, da, a, lato, v.muro),
    terreno: tratto(daBase64(scena.terreno), C, R, da, a, lato, v.terreno),
    roccia: tratto(rocciaDi(scena), C, R, da, a, lato, v.roccia),
  };
}

/** Pennellata completa (una voce di «annulla»). */
export function pennellataMuri(scena, da, a, lato, modo, dati, adesso) {
  const m = trattoMuri(scena, da, a, lato, modo);
  return conMuri(scena, m.muri, m.terreno, dati, adesso, m.roccia);
}

/** Rettangolo di muri, terreno o gomma fra due Q, estremi compresi (una voce di «annulla»). */
export function rettangoloMuri(scena, a, b, modo, dati, adesso) {
  const { colonne: C, righe: R } = scena.griglia;
  const v = valori(modo);
  return conMuri(scena,
    rettangolo(daBase64(scena.muri), C, R, a[0], a[1], b[0], b[1], v.muro),
    rettangolo(daBase64(scena.terreno), C, R, a[0], a[1], b[0], b[1], v.terreno), dati, adesso,
    rettangolo(rocciaDi(scena), C, R, a[0], a[1], b[0], b[1], v.roccia));
}

/** Passi di una pennellata mentre si trascina: maschere cambiate senza voce di «annulla». */
export function muriProvvisori(scena, m) {
  return { ...scena, muri: inBase64(m.muri), terreno: inBase64(m.terreno), ...(m.roccia && (scena.roccia !== undefined || qualcosa(m.roccia)) ? { roccia: inBase64(m.roccia) } : {}) };
}

/** Fine della pennellata: una voce sola dalle maschere di partenza (base64) a quelle attuali. */
export function chiudiTrattoMuri(scena, iniziali, dati, adesso) {
  const { roccia: _, ...senza } = scena;
  const partenza = { ...senza, muri: iniziali.muri, terreno: iniziali.terreno, ...(iniziali.roccia !== undefined && iniziali.roccia !== null ? { roccia: iniziali.roccia } : {}) };
  return conMuri(partenza, daBase64(scena.muri), daBase64(scena.terreno), dati, adesso, rocciaDi(scena));
}

/** Pennello quadrato in un solo punto (per il clic senza trascinamento). */
export function puntoMuri(scena, q, lato, modo, dati, adesso) {
  const { colonne: C, righe: R } = scena.griglia;
  const v = valori(modo);
  return conMuri(scena,
    pennello(daBase64(scena.muri), C, R, q[0], q[1], lato, v.muro),
    pennello(daBase64(scena.terreno), C, R, q[0], q[1], lato, v.terreno), dati, adesso,
    pennello(rocciaDi(scena), C, R, q[0], q[1], lato, v.roccia));
}
