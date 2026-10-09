// Area raggiungibile della mappa di battaglia (lotto 5 di docs/battlemap/piano.md; §8 della specifica): ricerca a
// costo minimo (Dijkstra) sulle posizioni del token, cioè sul Q in alto a sinistra del suo ingombro, con tutto
// l'ingombro che deve stare in posizioni lecite (creature 2 × 2 e 3 × 3, veicoli rettangolari).
// Regole provvisorie in data/mappa.json → movimento (TODO(Davide) A.124, A.127, A.128):
//   - un passo ortogonale costa costo_ortogonale, uno diagonale costo_diagonale (o 1/2/1… con diagonali_alterne);
//   - se l'ingombro entra anche solo in parte in un Q di terreno difficile, il passo costa ×terreno_difficile_moltiplicatore;
//   - muri: mai; avversari: attraversabili solo con attraversa_avversari; alleati (e segnaposto): attraversabili con
//     attraversa_alleati, ci si ferma sopra solo con fermarsi_su_alleato;
//   - diagonale_spigolo (A.134, risposta di Marcello del 07/10): «un_lato», in diagonale si passa rasente allo spigolo
//     di un muro (uno dei due Q ai lati murato), non fra due muri a spigolo (entrambi murati: la diagonale li
//     attraverserebbe); «vietata», servono liberi entrambi; «libera», i lati non contano. Le porte chiuse sono muri.
// Funzioni pure. Con griglie da 300 × 300 Q e 300 token resta sotto i 50 ms (tests/mappa-area.test.js).
import { dimensioni, celleToken } from './token.js';
import { formaDi } from './forma.js';

/** Somme prefisse 2D di una maschera di Q (Uint8Array 0/1, un byte per Q): conteggio in un rettangolo in O(1). */
function prefisse(valori, C, R) {
  const s = new Int32Array((C + 1) * (R + 1));
  for (let y = 0; y < R; y++) {
    let riga = 0;
    for (let x = 0; x < C; x++) {
      riga += valori[y * C + x];
      s[(y + 1) * (C + 1) + x + 1] = s[y * (C + 1) + x + 1] + riga;
    }
  }
  return (x, y, w, h) => s[(y + h) * (C + 1) + x + w] - s[y * (C + 1) + x + w] - s[(y + h) * (C + 1) + x] + s[y * (C + 1) + x];
}

/** Maschera di bit (src/mappa/celle.js) in un byte per Q. */
function bytePerQ(maschera, C, R) {
  const r = new Uint8Array(C * R);
  if (maschera) for (let i = 0; i < C * R; i++) r[i] = (maschera[i >> 3] >> (i & 7)) & 1;
  return r;
}

/** Coda con priorità minima (heap binario) di coppie (costo, stato). */
class Coda {
  constructor() { this.c = []; this.s = []; }
  get vuota() { return this.c.length === 0; }
  metti(costo, stato) {
    const { c, s } = this;
    let i = c.length;
    c.push(costo); s.push(stato);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (c[p] <= costo) break;
      c[i] = c[p]; s[i] = s[p]; i = p;
    }
    c[i] = costo; s[i] = stato;
  }
  togli() {
    const { c, s } = this;
    const costo = c[0], stato = s[0];
    const ultC = c.pop(), ultS = s.pop();
    const n = c.length;
    if (n) {
      // l'ultimo va in cima e scende finché un figlio costa meno
      let i = 0;
      for (;;) {
        const a = 2 * i + 1, b = a + 1;
        let m = -1, mc = ultC;
        if (a < n && c[a] < mc) { m = a; mc = c[a]; }
        if (b < n && c[b] < mc) { m = b; mc = c[b]; }
        if (m < 0) break;
        c[i] = c[m]; s[i] = s[m]; i = m;
      }
      c[i] = ultC; s[i] = ultS;
    }
    return [costo, stato];
  }
}

const PASSI = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** Due lati sono alleati? PG, loro veicoli e alleati da una parte; avversari dall'altra. */
export const stessaParte = (a, b) => (a === 'avversario') === (b === 'avversario');

/**
 * Area raggiungibile del token `chi` entro `massimo` Q.
 * @param o { colonne, righe, muri, terreno (maschere di bit), token: [{ id, q, ingombro, lato }],
 *   chi: { id, q, ingombro, lato, angolo?, base? }, massimo, regole: data/mappa.json → movimento }
 *   angolo e base (08/10, src/mappa/forma.js): un veicolo ruotato occupa solo i quadretti della sua forma, in ogni
 *   posizione; gli altri token con angolo e base fanno ostacolo solo con i loro quadretti
 *   lato: 'pg' | 'alleato' | 'avversario' | null (segnaposto: come un alleato di tutti)
 * @returns {{ colonne, righe, w, h, partenza, massimo, costo: Float64Array, fermabile: Uint8Array, migliore, precStato }}
 *   costo e fermabile indicizzati per posizione (y × colonne + x del Q in alto a sinistra), costo Infinity se non
 *   raggiunta; migliore e precStato servono a ricostruire il percorso (percorso()).
 */
export function areaRaggiungibile({ colonne: C, righe: R, muri, terreno, token, chi, massimo, regole }) {
  const [w, h] = dimensioni(chi.ingombro);
  const muro = bytePerQ(muri, C, R);
  const terr = bytePerQ(terreno, C, R);
  const avv = new Uint8Array(C * R);
  const all = new Uint8Array(C * R);
  for (const t of token) {
    if (t.id === chi.id) continue;
    const nemico = t.lato && chi.lato ? !stessaParte(t.lato, chi.lato) : false;
    for (const [x, y] of celleToken(t)) {
      if (x < 0 || y < 0 || x >= C || y >= R) continue;
      if (nemico) avv[y * C + x] = 1; else all[y * C + x] = 1;
    }
  }
  const nMuro = prefisse(muro, C, R), nTerr = prefisse(terr, C, R), nAvv = prefisse(avv, C, R), nAll = prefisse(all, C, R);
  const dentro = (x, y) => x >= 0 && y >= 0 && x + w <= C && y + h <= R;
  // veicolo ruotato (08/10): i conteggi si fanno sui soli quadretti della forma, non su tutto il rettangolo
  const forma = formaDi(chi)?.celle ?? null;
  const contaIn = (m, n) => (forma ? (x, y) => { let k = 0; for (const [dx, dy] of forma) k += m[(y + dy) * C + x + dx]; return k; } : (x, y) => n(x, y, w, h));
  const inMuro = contaIn(muro, nMuro), inTerr = contaIn(terr, nTerr), inAvv = contaIn(avv, nAvv), inAll = contaIn(all, nAll);
  // posizione attraversabile: niente muri; avversari e alleati secondo le regole
  const passa = (x, y) => dentro(x, y) && inMuro(x, y) === 0
    && (regole.attraversa_avversari || inAvv(x, y) === 0)
    && (regole.attraversa_alleati || inAll(x, y) === 0);
  const ferma = (x, y) => inAvv(x, y) === 0 && (regole.fermarsi_su_alleato || inAll(x, y) === 0);
  const N = C * R;
  const alterne = !!regole.diagonali_alterne;
  // stato = posizione × 2 + parità delle diagonali già fatte (solo con le diagonali alterne)
  const costoStato = new Float64Array(N * 2).fill(Infinity);
  const precStato = new Int32Array(N * 2).fill(-1);
  const [x0, y0] = chi.q;
  const partenza = y0 * C + x0;
  const coda = new Coda();
  costoStato[partenza * 2] = 0;
  coda.metti(0, partenza * 2);
  while (!coda.vuota) {
    const [c, stato] = coda.togli();
    if (c > costoStato[stato]) continue;
    const pos = stato >> 1, parita = stato & 1;
    const x = pos % C, y = (pos - x) / C;
    for (const [dx, dy] of PASSI) {
      const nx = x + dx, ny = y + dy;
      if (!passa(nx, ny)) continue;
      const diagonale = dx !== 0 && dy !== 0;
      if (diagonale && regole.diagonale_spigolo !== 'libera') {
        // i due Q (posizioni) ai lati della diagonale: murati o fuori dalla griglia
        const latoA = !dentro(nx, y) || inMuro(nx, y) !== 0;
        const latoB = !dentro(x, ny) || inMuro(x, ny) !== 0;
        if (regole.diagonale_spigolo === 'vietata' ? latoA || latoB : latoA && latoB) continue;
      }
      let passo = diagonale ? (alterne && parita ? 2 * regole.costo_diagonale : regole.costo_diagonale) : regole.costo_ortogonale;
      if (inTerr(nx, ny) > 0) passo *= regole.terreno_difficile_moltiplicatore;
      const nc = c + passo;
      if (nc > massimo) continue;
      const nuovo = (ny * C + nx) * 2 + (alterne && diagonale ? 1 - parita : parita);
      if (nc < costoStato[nuovo]) { costoStato[nuovo] = nc; precStato[nuovo] = stato; coda.metti(nc, nuovo); }
    }
  }
  // per posizione: il costo migliore fra le due parità, e da quale stato si arriva
  const costo = new Float64Array(N).fill(Infinity);
  const migliore = new Int32Array(N).fill(-1);
  const fermabile = new Uint8Array(N);
  for (let p = 0; p < N; p++) {
    const a = costoStato[p * 2], b = costoStato[p * 2 + 1];
    const s = a <= b ? p * 2 : p * 2 + 1;
    if (costoStato[s] === Infinity) continue;
    costo[p] = costoStato[s];
    migliore[p] = s;
    const x = p % C, y = (p - x) / C;
    fermabile[p] = p === partenza || ferma(x, y) ? 1 : 0;
  }
  return { colonne: C, righe: R, w, h, forma, partenza, massimo, costo, fermabile, migliore, precStato };
}

/** Costo per arrivare nella posizione [x, y] (Infinity se fuori area o se lì non ci si può fermare). */
export function costoVerso(area, q) {
  const [x, y] = q;
  if (x < 0 || y < 0 || x >= area.colonne || y >= area.righe) return Infinity;
  const p = y * area.colonne + x;
  return area.fermabile[p] ? area.costo[p] : Infinity;
}

/** Percorso dalla partenza alla posizione q: [[x, y], …] compresi gli estremi, oppure [] se non raggiungibile. */
export function percorso(area, q) {
  if (costoVerso(area, q) === Infinity) return [];
  const C = area.colonne;
  const r = [];
  let s = area.migliore[q[1] * C + q[0]];
  while (s >= 0) {
    const p = s >> 1;
    r.push([p % C, Math.floor(p / C)]);
    s = area.precStato[s];
  }
  return r.reverse();
}

/**
 * Fasce del movimento (§8: Passo, Corsa, Scatto) con quanto il token ha già usato nel Round: per ogni fascia il
 * costo massimo che resta, oppure null se non disponibile. { passo, corsa, scatto } → { passo: 6 − usato, … }.
 */
export function fasceRimaste(movimento, usato = 0) {
  const r = {};
  for (const f of ['passo', 'corsa', 'scatto']) {
    const v = movimento?.[f];
    r[f] = Number.isFinite(v) ? Math.max(0, v - usato) : null;
  }
  return r;
}

/**
 * Fasce ancora disponibili nel Round (A.129, decisione 133): solo le fasce `regole.divisibili` (il Passo) si spendono
 * a pezzi, prima, fra e dopo le AzP; Corsa e Scatto sono un blocco unico (una sola mossa, i Q non usati si perdono).
 * Tutte costano l'unica AzM: dopo un blocco il movimento del Round è finito; con un Passo già cominciato Corsa e Scatto
 * restano solo se `regole.blocco_dopo_passo` (A.136, decisione 140: sì, prima di ogni AzP; i Q fatti contano nel blocco).
 * @param movimento { passo, corsa, scatto } in Q (null: non disponibile)
 * @param usato Q già spesi nel Round
 * @param fatte fasce dei movimenti già fatti nel Round (src/mappa/annulla.js → fasceNelRound)
 * @param regole data/mappa.json → movimento
 * @returns { rimaste: come fasceRimaste, chiusa: la fascia a blocco che ha chiuso il movimento o null, persi: Q non
 *   usati di quel blocco, escluse: fasce a blocco tolte perché il Passo è già cominciato }
 */
export function statoFasce(movimento, usato = 0, fatte = [], regole = {}) {
  const divisibili = regole.divisibili ?? ['passo', 'corsa', 'scatto'];
  const ordine = ['passo', 'corsa', 'scatto'];
  const blocchi = fatte.filter((f) => f && !divisibili.includes(f));
  if (blocchi.length) {
    const chiusa = ordine.filter((f) => blocchi.includes(f)).at(-1);
    const rimaste = Object.fromEntries(ordine.map((f) => [f, Number.isFinite(movimento?.[f]) ? 0 : null]));
    return { rimaste, chiusa, persi: Math.max(0, (movimento?.[chiusa] ?? 0) - usato), escluse: [] };
  }
  const rimaste = fasceRimaste(movimento, usato);
  const escluse = [];
  if (usato > 0 && !regole.blocco_dopo_passo) {
    for (const f of ordine) if (!divisibili.includes(f) && rimaste[f] !== null) { rimaste[f] = null; escluse.push(f); }
  }
  return { rimaste, chiusa: null, persi: 0, escluse };
}

/** Fascia di un costo: la prima fra passo, corsa e scatto che basta, oppure null. */
export function fasciaDi(costo, rimaste) {
  for (const f of ['passo', 'corsa', 'scatto']) if (rimaste[f] !== null && costo <= rimaste[f]) return f;
  return null;
}

/**
 * Q da colorare: per ogni Q della griglia la fascia migliore fra le posizioni raggiunte che lo coprono con l'ingombro,
 * fino alla fascia `fino` (1 Passo, 2 Corsa, 3 Scatto). Int8Array per Q: 0 nessuna, 1, 2, 3.
 */
export function celleArea(area, rimaste, fino = 1) {
  const { colonne: C, righe: R, w, h } = area;
  const ordine = ['passo', 'corsa', 'scatto'];
  const r = new Int8Array(C * R);
  for (let p = 0; p < C * R; p++) {
    if (!area.fermabile[p] || area.costo[p] === Infinity || p === area.partenza) continue;
    const f = fasciaDi(area.costo[p], rimaste);
    const k = f ? ordine.indexOf(f) + 1 : 0;
    if (!k || k > fino) continue;
    const x0 = p % C, y0 = (p - x0) / C;
    if (area.forma) {
      for (const [dx, dy] of area.forma) { const x = x0 + dx, y = y0 + dy; if (x >= C || y >= R) continue; const i = y * C + x; if (!r[i] || k < r[i]) r[i] = k; }
      continue;
    }
    for (let y = y0; y < y0 + h && y < R; y++) for (let x = x0; x < x0 + w && x < C; x++) {
      const i = y * C + x;
      if (!r[i] || k < r[i]) r[i] = k;
    }
  }
  return r;
}

/**
 * Aggancio dentro l'area (§8, «il trascinamento si aggancia solo dentro l'area»): la posizione raggiungibile entro
 * `limite` Q più vicina a q (distanza in linea d'aria fra le posizioni; a parità, quella che costa meno). Se q è già
 * dentro, q stessa; null se l'area è vuota.
 */
export function piuVicinaRaggiungibile(area, q, limite = area.massimo) {
  const ok = (x, y) => x >= 0 && y >= 0 && x < area.colonne && y < area.righe && costoVerso(area, [x, y]) <= limite;
  if (ok(q[0], q[1])) return [q[0], q[1]];
  let migliore = null;
  for (let p = 0; p < area.colonne * area.righe; p++) {
    if (!area.fermabile[p] || area.costo[p] > limite) continue;
    const x = p % area.colonne, y = (p - x) / area.colonne;
    const d = (x - q[0]) ** 2 + (y - q[1]) ** 2;
    if (!migliore || d < migliore.d || (d === migliore.d && area.costo[p] < migliore.c)) migliore = { d, c: area.costo[p], q: [x, y] };
  }
  return migliore?.q ?? null;
}
