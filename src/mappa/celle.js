// Maschere di Q della mappa di battaglia (lotto 1 di docs/battlemap/piano.md): muri, terreno difficile e nebbia.
// Un bit per Q, riga per riga (indice = y × colonne + x, bit meno significativo per primo), salvato in base64
// nel file della scena. Funzioni pure: le usano l'app, il server (filtro della vista giocatori) e i test.

/** Byte necessari per una griglia colonne × righe. */
export const byteMaschera = (colonne, righe) => Math.ceil((colonne * righe) / 8);

/** Maschera vuota (tutti i Q a 0) o piena (tutti a 1). */
export function nuovaMaschera(colonne, righe, piena = false) {
  const m = new Uint8Array(byteMaschera(colonne, righe));
  if (piena) for (let i = 0; i < colonne * righe; i++) m[i >> 3] |= 1 << (i & 7);
  return m;
}

/** Uint8Array → base64 (funziona nel browser e in Node, senza Buffer). */
export function inBase64(m) {
  let s = '';
  for (let i = 0; i < m.length; i += 0x8000) s += String.fromCharCode(...m.subarray(i, i + 0x8000));
  return btoa(s);
}

/** base64 → Uint8Array; null se il testo non è base64 valido. */
export function daBase64(testo) {
  if (typeof testo !== 'string') return null;
  try {
    const s = atob(testo);
    const m = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) m[i] = s.charCodeAt(i);
    return m;
  } catch {
    return null;
  }
}

/** La maschera in base64 ha la lunghezza giusta per la griglia? */
export function mascheraValida(testo, colonne, righe) {
  const m = daBase64(testo);
  return m !== null && m.length === byteMaschera(colonne, righe);
}

const dentro = (x, y, colonne, righe) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < colonne && y < righe;

/** Il Q (x, y) è a 1? Fuori dalla griglia: false. */
export function cella(m, colonne, righe, x, y) {
  if (!dentro(x, y, colonne, righe)) return false;
  const i = y * colonne + x;
  return (m[i >> 3] & (1 << (i & 7))) !== 0;
}

/** Imposta il Q (x, y) a `valore` (in place); fuori dalla griglia non fa nulla. */
export function impostaCella(m, colonne, righe, x, y, valore) {
  if (!dentro(x, y, colonne, righe)) return m;
  const i = y * colonne + x;
  if (valore) m[i >> 3] |= 1 << (i & 7);
  else m[i >> 3] &= ~(1 << (i & 7));
  return m;
}

/**
 * Rettangolo di Q da (x0, y0) a (x1, y1), estremi compresi e in qualunque ordine (§5 e §6 della specifica:
 * nebbia e muri a rettangolo). Restituisce una maschera nuova.
 */
export function rettangolo(m, colonne, righe, x0, y0, x1, y1, valore) {
  const r = m.slice();
  for (let y = Math.max(0, Math.min(y0, y1)); y <= Math.min(righe - 1, Math.max(y0, y1)); y++) {
    for (let x = Math.max(0, Math.min(x0, x1)); x <= Math.min(colonne - 1, Math.max(x0, x1)); x++) impostaCella(r, colonne, righe, x, y, valore);
  }
  return r;
}

/**
 * Pennello quadrato centrato sul Q (cx, cy), di `lato` Q (1, 3, 5…; un lato pari si allarga verso destra e in
 * basso). §5 e §6 della specifica: nebbia e muri «a pennello per Q». Restituisce una maschera nuova.
 */
export function pennello(m, colonne, righe, cx, cy, lato, valore) {
  const prima = Math.floor((lato - 1) / 2);
  return rettangolo(m, colonne, righe, cx - prima, cy - prima, cx - prima + lato - 1, cy - prima + lato - 1, valore);
}

/** Numero di Q a 1. */
export function conta(m, colonne, righe) {
  let n = 0;
  for (let i = 0; i < colonne * righe; i++) if (m[i >> 3] & (1 << (i & 7))) n++;
  return n;
}

/** Q a 1 in `a` e a 0 in `b` (es. muri non coperti dalla nebbia). Stessa griglia. */
export function senza(a, b) {
  const r = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) r[i] = a[i] & ~b[i];
  return r;
}

/**
 * Stessa maschera su una griglia di altre dimensioni (la griglia ricalibrata, §4): i Q che restano dentro tengono
 * il loro valore, quelli nuovi valgono `riempi`.
 */
export function ridimensiona(m, colonne, righe, nuoveColonne, nuoveRighe, riempi = false) {
  const r = nuovaMaschera(nuoveColonne, nuoveRighe, riempi);
  for (let y = 0; y < Math.min(righe, nuoveRighe); y++) {
    for (let x = 0; x < Math.min(colonne, nuoveColonne); x++) impostaCella(r, nuoveColonne, nuoveRighe, x, y, cella(m, colonne, righe, x, y));
  }
  return r;
}
