// Sagome delle pedine sulla mappa di battaglia (A.167, risposta di Davide del 18/10/2026): le creature rispettano
// larghezza e lunghezza della scheda, anche rettangolari e oltre il 3 × 3 (una 3 × 10 occupa 30 Q, non 100), e si
// posizionano anche a 45°. Ingombro, sovrapposizioni e passaggio fra gli ostacoli seguono la sagoma effettivamente
// ruotata — i quadretti che il rettangolo ruotato copre per almeno metà (src/mappa/forma.js) — non il centro della
// pedina. Taglia, spazio e portata restano dati distinti: una pedina più lunga non guadagna portata.
//
// Questo modulo è puro (nessun browser, nessun disegno) e riusa la geometria dei veicoli ruotati: un token con
// `angolo` e `base` [lungo, largo] ha la forma ruotata; senza, è il rettangolo allineato `ingombro`.
// Un «token» qui è { q, ingombro, angolo?, base? } (q = Q in alto a sinistra dell'ingombro).
import { formaRuotata, normaAngolo, retto, baseDaIngombro } from './forma.js';
import { celleToken, dimensioni } from './token.js';

/** Gli otto orientamenti di base (passo di 45°, data/mappa.json → token.rotazione_veicoli.passo_gradi). */
export const ORIENTAMENTI = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * La sagoma di un rettangolo `base` = [lungo, largo] con l'asse lungo verso `angolo` (0 = in alto, senso orario):
 * { ingombro: [colonne, righe], celle (relative al Q in alto a sinistra), centro, vertici }.
 */
export const sagoma = (base, angolo) => formaRuotata(base, normaAngolo(angolo));

/** Ingombro [larghezza, lunghezza] come si legge nella scheda → base [lungo, largo]. */
export const baseDaSpazio = (dim) => baseDaIngombro(dim);

/**
 * Il token di una creatura con lo spazio della scheda [colonne, righe], allineato come scritto (non ruotato): un
 * quadrato è un intero, un rettangolo [colonne, righe]. Il primo giro lo porta alla forma con angolo e base.
 */
export const ingombroDaSpazio = (dim) => (dim[0] === dim[1] ? dim[0] : [dim[0], dim[1]]);

/** Quadretti occupati dal token, assoluti: [[x, y], …] (la sagoma ruotata, se ha angolo e base). */
export const celle = (t) => celleToken(t);

/** Numero di quadretti occupati (una 3 × 10 allineata: 30). */
export const area = (t) => celleToken(t).length;

const chiave = ([x, y]) => `${x},${y}`;

/** Due token occupano almeno un Q in comune? (sulle sagome vere, non sui rettangoli che le contengono) */
export function sovrappone(a, b) {
  const occupate = new Set(celleToken(a).map(chiave));
  return celleToken(b).some((c) => occupate.has(chiave(c)));
}

/**
 * La posizione del token è lecita? Dentro la griglia, senza muri sotto nessun quadretto della sagoma e senza altri
 * token sopra. { ok, motivo?: 'fuori' | 'muro' | 'token', celle?: i quadretti in conflitto }
 */
export function posizioneValida(t, { colonne, righe, muro = () => false, altri = [] }) {
  const mie = celleToken(t);
  if (mie.some(([x, y]) => x < 0 || y < 0 || x >= colonne || y >= righe)) return { ok: false, motivo: 'fuori' };
  const dentroMuro = mie.filter(([x, y]) => muro(x, y));
  if (dentroMuro.length) return { ok: false, motivo: 'muro', celle: dentroMuro };
  const occupate = new Set(altri.flatMap((o) => celleToken(o).map(chiave)));
  const sopra = mie.filter((c) => occupate.has(chiave(c)));
  if (sopra.length) return { ok: false, motivo: 'token', celle: sopra };
  return { ok: true };
}

/**
 * La sagoma può andare dalla posizione `da` a `a` (Q in alto a sinistra), con lo stesso orientamento, passando solo
 * per posizioni lecite (passi di un Q, anche in diagonale)? È il caso del corridoio stretto: una 3 × 10 passa solo se
 * il corridoio ha la sezione giusta per quell'orientamento. Restituisce il percorso [[x, y], …] o null.
 */
export function puoPassare(t, da, a, ambiente) {
  const { colonne, righe } = ambiente;
  const prova = (q) => posizioneValida({ ...t, q }, ambiente).ok;
  if (!prova(da) || !prova(a)) return null;
  const k = ([x, y]) => `${x},${y}`;
  const prima = new Map([[k(da), null]]);
  const coda = [da];
  for (let i = 0; i < coda.length; i++) {
    const q = coda[i];
    if (q[0] === a[0] && q[1] === a[1]) {
      const p = [];
      for (let c = q; c; c = prima.get(k(c))) p.unshift(c);
      return p;
    }
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const n = [q[0] + dx, q[1] + dy];
        if (n[0] < 0 || n[1] < 0 || n[0] >= colonne || n[1] >= righe || prima.has(k(n)) || !prova(n)) continue;
        prima.set(k(n), q);
        coda.push(n);
      }
    }
  }
  return null;
}

/**
 * Distanza in Q fra due token sui loro quadretti veri (Chebyshev: 1 = adiacenti, 0 = sovrapposti): per una sagoma
 * ruotata non conta il rettangolo che la contiene.
 */
export function distanza(a, b) {
  const cb = celleToken(b);
  let d = Infinity;
  for (const [x, y] of celleToken(a)) for (const [u, v] of cb) d = Math.min(d, Math.max(Math.abs(x - u), Math.abs(y - v)));
  return d;
}

/** Il token ha una sagoma che può ruotare (rettangolo non quadrato, oppure già ruotato)? */
export function ruotabile(t) {
  if (Array.isArray(t?.base)) return t.base[0] !== t.base[1];
  const [w, h] = dimensioni(t?.ingombro);
  return w !== h;
}

/**
 * Come si gira un token (19/10): null = non si gira (nessun comando di rotazione: né frecce, né pulsanti, né voce di menu);
 * { fine } = si gira di passo_gradi (45°), e col passo fine (10°) solo se `fine` è vero. Un veicolo ha anche il passo
 * fine; una creatura solo i 45° della scheda (una 3 × 10 a 37° non corrisponde a nulla del manuale); una creatura
 * quadrata (1 × 1, 4 × 4, 6 × 6…) non gira.
 */
export function rotazioneDi(t) {
  if (t?.rif?.tipo === 'veicolo') return { fine: true };
  if (t?.rif?.tipo === 'partecipante' && ruotabile(t)) return { fine: false };
  return null;
}

/** I gradi di un passo di rotazione di `t` (data/mappa.json → token.rotazione_veicoli): il fine solo dove è ammesso. */
export function passoGradi(t, fine, dati) {
  const r = dati.mappa.token.rotazione_veicoli;
  return fine && rotazioneDi(t)?.fine ? r.passo_fine_gradi : r.passo_gradi;
}

/** L'orientamento è uno degli otto di base (multipli di 45°)? */
export const orientamentoDiBase = (a) => ORIENTAMENTI.includes(normaAngolo(a));

export { normaAngolo, retto };
