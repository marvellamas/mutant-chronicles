// Codice QR in locale, senza servizi esterni né librerie (riquadro «Collega i giocatori» della plancia).
// Codifica minima dello standard ISO/IEC 18004: modalità byte (UTF-8), correzione d'errore M, versioni 1–6
// (fino a 106 byte: un indirizzo come http://192.168.1.23:3000 sta nella versione 2). Lo schema segue la
// struttura dello standard: dati e riempimento, Reed–Solomon su GF(256) con il polinomio 0x11D, blocchi
// interlacciati, pattern fissi, informazioni di formato (BCH con la maschera 0x5412), maschera con la penalità
// più bassa. Funzioni pure; tests/qr.test.js le controlla.

// versioni 1–6, livello M: codeword di correzione per blocco, numero di blocchi, centri degli allineamenti
const ECC_PER_BLOCCO = [0, 10, 16, 26, 18, 24, 16];
const BLOCCHI = [0, 1, 1, 1, 2, 2, 4];
const ALLINEAMENTI = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]];
const VERSIONE_MAX = 6;

const lato = (v) => v * 4 + 17;
/** Moduli utili per i dati (bit), dopo i pattern fissi: formula dello standard per le versioni < 7. */
function moduliDati(v) {
  let n = (16 * v + 128) * v + 64;
  if (v >= 2) { const a = Math.floor(v / 7) + 2; n -= (25 * a - 10) * a - 55; }
  return n;
}
const codewordDati = (v) => Math.floor(moduliDati(v) / 8) - ECC_PER_BLOCCO[v] * BLOCCHI[v];

// --- GF(256) e Reed–Solomon ---------------------------------------------------------------------------
function moltiplica(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}
/** Divisore (polinomio generatore) di grado n, coefficienti dal più alto escluso il primo (= 1). */
export function divisoreRS(n) {
  const r = new Array(n).fill(0);
  r[n - 1] = 1;
  let radice = 1;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      r[j] = moltiplica(r[j], radice);
      if (j + 1 < n) r[j] ^= r[j + 1];
    }
    radice = moltiplica(radice, 0x02);
  }
  return r;
}
/** Codeword di correzione Reed–Solomon dei dati. */
export function restoRS(dati, n) {
  const div = divisoreRS(n);
  const r = new Array(n).fill(0);
  for (const b of dati) {
    const f = b ^ r.shift();
    r.push(0);
    div.forEach((c, i) => { r[i] ^= moltiplica(c, f); });
  }
  return r;
}

// --- informazioni di formato --------------------------------------------------------------------------
/** 15 bit di formato per un livello (M = 0, L = 1, Q = 3, H = 2) e una maschera, con BCH e la maschera 0x5412. */
export function bitFormato(maschera, livello = 0) {
  const dati = (livello << 3) | maschera;
  let r = dati;
  for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
  return ((dati << 10) | r) ^ 0x5412;
}

// --- codifica -----------------------------------------------------------------------------------------
const utf8 = (testo) => [...new TextEncoder().encode(String(testo))];

/** Codeword finali (dati e correzione, interlacciati) e versione per un testo. */
export function codeword(testo) {
  const byte = utf8(testo);
  let v = 1;
  while (v <= VERSIONE_MAX && 4 + 8 + byte.length * 8 > codewordDati(v) * 8) v++;
  if (v > VERSIONE_MAX) throw new Error(`testo troppo lungo per il codice QR (${byte.length} byte, al massimo ${codewordDati(VERSIONE_MAX) - 2})`);
  const capacita = codewordDati(v) * 8;
  const bit = [];
  const metti = (val, n) => { for (let i = n - 1; i >= 0; i--) bit.push((val >>> i) & 1); };
  metti(0b0100, 4); // modalità byte
  metti(byte.length, 8); // lunghezza (versioni 1–9)
  for (const b of byte) metti(b, 8);
  metti(0, Math.min(4, capacita - bit.length)); // terminatore
  while (bit.length % 8) bit.push(0);
  for (let pad = 0xec; bit.length < capacita; pad ^= 0xec ^ 0x11) metti(pad, 8);
  const dati = [];
  for (let i = 0; i < bit.length; i += 8) dati.push(bit.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  // blocchi tutti uguali per le versioni 1–6 del livello M
  const nb = BLOCCHI[v];
  const lung = dati.length / nb;
  const blocchi = Array.from({ length: nb }, (_, i) => dati.slice(i * lung, (i + 1) * lung));
  const ecc = blocchi.map((b) => restoRS(b, ECC_PER_BLOCCO[v]));
  const out = [];
  for (let i = 0; i < lung; i++) for (const b of blocchi) out.push(b[i]);
  for (let i = 0; i < ECC_PER_BLOCCO[v]; i++) for (const e of ecc) out.push(e[i]);
  return { versione: v, codeword: out };
}

const MASCHERE = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** Matrice dei moduli (true = scuro), [y][x], senza zona di rispetto. */
export function matriceQR(testo) {
  const { versione: v, codeword: cw } = codeword(testo);
  const n = lato(v);
  const m = Array.from({ length: n }, () => new Array(n).fill(false));
  const fisso = Array.from({ length: n }, () => new Array(n).fill(false));
  const imposta = (x, y, scuro) => { m[y][x] = scuro; fisso[y][x] = true; };
  // temporizzazione
  for (let i = 0; i < n; i++) { imposta(6, i, i % 2 === 0); imposta(i, 6, i % 2 === 0); }
  // tre pattern di posizione, con il separatore
  for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx; const y = cy + dy;
      if (x < 0 || y < 0 || x >= n || y >= n) continue;
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      imposta(x, y, d !== 2 && d !== 4);
    }
  }
  // allineamenti (non sopra i pattern di posizione)
  const a = ALLINEAMENTI[v];
  for (const ax of a) for (const ay of a) {
    if ((ax === 6 && ay === 6) || (ax === 6 && ay === a.at(-1)) || (ax === a.at(-1) && ay === 6)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) imposta(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  // spazi del formato (riempiti dopo la maschera) e modulo scuro
  const formato = (bits) => {
    const b = (i) => ((bits >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) imposta(8, i, b(i));
    imposta(8, 7, b(6)); imposta(8, 8, b(7)); imposta(7, 8, b(8));
    for (let i = 9; i < 15; i++) imposta(14 - i, 8, b(i));
    for (let i = 0; i < 8; i++) imposta(n - 1 - i, 8, b(i));
    for (let i = 8; i < 15; i++) imposta(8, n - 15 + i, b(i));
    imposta(8, n - 8, true);
  };
  formato(0);
  // dati a zig-zag, a coppie di colonne da destra, saltando la colonna 6
  let i = 0;
  for (let destra = n - 1; destra >= 1; destra -= 2) {
    if (destra === 6) destra = 5;
    for (let k = 0; k < n; k++) for (let j = 0; j < 2; j++) {
      const x = destra - j;
      const su = ((destra + 1) & 2) === 0;
      const y = su ? n - 1 - k : k;
      if (fisso[y][x]) continue;
      if (i < cw.length * 8) m[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
      i++;
    }
  }
  // maschera con la penalità più bassa
  let migliore = null;
  for (let k = 0; k < 8; k++) {
    const prova = m.map((r, y) => r.map((s, x) => (fisso[y][x] ? s : s !== MASCHERE[k](x, y))));
    const p = { m: prova, k };
    const salva = m.map((r) => [...r]);
    for (let y = 0; y < n; y++) m[y] = prova[y];
    formato(bitFormato(k));
    p.m = m.map((r) => [...r]);
    p.penalita = penalita(p.m);
    for (let y = 0; y < n; y++) m[y] = salva[y];
    if (!migliore || p.penalita < migliore.penalita) migliore = p;
  }
  return { versione: v, maschera: migliore.k, moduli: migliore.m };
}

/** Penalità dello standard (righe, blocchi 2×2, motivi simili ai pattern di posizione, bilanciamento). */
function penalita(m) {
  const n = m.length;
  let p = 0;
  const linee = [...m, ...m[0].map((_, x) => m.map((r) => r[x]))];
  for (const l of linee) {
    let corsa = 1;
    for (let i = 1; i <= n; i++) {
      if (i < n && l[i] === l[i - 1]) corsa++;
      else { if (corsa >= 5) p += 3 + corsa - 5; corsa = 1; }
    }
    const s = l.map((x) => (x ? 1 : 0)).join('');
    for (const motivo of ['10111010000', '00001011101']) for (let i = s.indexOf(motivo); i >= 0; i = s.indexOf(motivo, i + 1)) p += 40;
  }
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
    const c = m[y][x];
    if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
  }
  const scuri = m.flat().filter(Boolean).length;
  p += Math.floor(Math.abs(scuri * 20 - n * n * 10) / (n * n)) * 10;
  return p;
}

/** SVG del codice QR, con la zona di rispetto di 4 moduli; colori fissi (nero su bianco) perché si legga sempre. */
export function svgQR(testo, { pixel = 4, titolo = testo } = {}) {
  const { moduli } = matriceQR(testo);
  const n = moduli.length + 8;
  let d = '';
  moduli.forEach((r, y) => r.forEach((s, x) => { if (s) d += `M${x + 4} ${y + 4}h1v1h-1z`; }));
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${n * pixel}" height="${n * pixel}" role="img" aria-label="Codice QR: ${esc(titolo)}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
