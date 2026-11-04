// Lotto 172, A.238 (Davide, 03/11/2026): la Neverlost atterrata in Q Base è 34 × 20 Q, ruotabile anche di 45°; il limite dei
// veicoli sale da 12 a 34 per lato. Rete di sicurezza geometrica sulle sagome oltre 20 fino al nuovo limite: alzare il limite non
// deve riaprire il difetto dell'angolo che attraversa un muro (A.172). Le basi fino a 20 × 20 restano in
// tests/mappa-rete-geometrica-a198.test.js; qui le basi lunghe da 21 a 34 (un campione regolare dei lati corti) e la nave.
// Il riferimento è indipendente dal codice: vertici ricalcolati e area di ogni quadretto per ritaglio di poligoni.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formaRuotata, celleToccate, ruotaDi } from '../src/mappa/forma.js';
import { celleToken, celleToccateToken, ingombroVeicolo } from '../src/mappa/token.js';
import { posizioneValida, sovrappone, ORIENTAMENTI } from '../src/mappa/sagoma.js';
import { validaScena, nuovaScena } from '../src/mappa/scena.js';
import { areaRaggiungibile } from '../src/mappa/area.js';
import { inBase64, nuovaMaschera } from '../src/mappa/celle.js';
import { profiloVeicolo } from '../src/veicoli.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const MAX = dati.mappa.token.veicolo_ingombro_max;
const EPS = 1e-9;
const k = ([x, y]) => `${x},${y}`;

function vertici(L, W, angolo) {
  const r = (angolo * Math.PI) / 180;
  const d = [Math.sin(r), -Math.cos(r)];
  const p = [Math.cos(r), Math.sin(r)];
  return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([s, t]) => [s * (L / 2) * d[0] + t * (W / 2) * p[0], s * (L / 2) * d[1] + t * (W / 2) * p[1]]);
}
function ritaglia(poli, f) {
  const out = [];
  for (let i = 0; i < poli.length; i++) {
    const a = poli[i]; const b = poli[(i + 1) % poli.length];
    const fa = f(a); const fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
  }
  return out;
}
const area = (p) => Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + (a[0] * b[1] - b[0] * a[1]); }, 0)) / 2;
function copertura(poli, x, y) {
  let q = poli;
  for (const f of [(p) => p[0] - x, (p) => x + 1 - p[0], (p) => p[1] - y, (p) => y + 1 - p[1]]) { q = ritaglia(q, f); if (q.length < 3) return 0; }
  return area(q);
}
function riferimento(base, angolo, origine) {
  const f = formaRuotata(base, angolo);
  const cx = origine[0] + f.centro[0]; const cy = origine[1] + f.centro[1];
  const poli = vertici(base[0], base[1], angolo).map(([x, y]) => [cx + x, cy + y]);
  const xs = poli.map((p) => p[0]); const ys = poli.map((p) => p[1]);
  const m = new Map();
  for (let y = Math.floor(Math.min(...ys)) - 1; y <= Math.ceil(Math.max(...ys)) + 1; y++) for (let x = Math.floor(Math.min(...xs)) - 1; x <= Math.ceil(Math.max(...xs)) + 1; x++) {
    const c = copertura(poli, x, y);
    if (c > EPS) m.set(k([x, y]), c);
  }
  return { f, m };
}

// le basi oltre 20: lati lunghi 21, 24, 27, 30, 34 con un campione dei lati corti, più la Neverlost 34 × 20
const CORTI = [1, 2, 3, 5, 8, 10, 13, 16, 20, 24, 28, 34];
const BASI = [];
for (const L of [21, 24, 27, 30, 34]) for (const W of CORTI) if (W <= L) BASI.push([L, W]);
if (!BASI.some(([L, W]) => L === 34 && W === 20)) BASI.push([34, 20]);
const ORIGINE = [50, 50];
const token = (base, angolo) => { const f = formaRuotata(base, angolo); return { q: [...ORIGINE], angolo, base, ingombro: f.ingombro }; };

test('il limite nei dati: veicoli fino a 34 per lato (la Neverlost 34 × 20 in Q Base), creature ancora fino a 20', () => {
  assert.equal(MAX, 34);
  assert.equal(dati.mappa.token.creatura_ingombro_max, 20);
  assert.deepEqual(ingombroVeicolo(profiloVeicolo('neverlost', dati), dati, 'base'), [34, 20]);
});

test('le sagome oltre 20 fino a 34, negli 8 orientamenti: vertici e quadretti toccati identici al calcolo indipendente', () => {
  let n = 0;
  for (const base of BASI) for (const a of ORIENTAMENTI) {
    const { f, m } = riferimento(base, a, ORIGINE);
    const mie = vertici(base[0], base[1], a).map(([x, y]) => [x + f.centro[0], y + f.centro[1]]);
    f.vertici.forEach((v, i) => assert.ok(Math.abs(v[0] - mie[i][0]) < 1e-6 && Math.abs(v[1] - mie[i][1]) < 1e-6, `${base} @${a}: vertice ${i}`));
    const toccati = new Set(celleToccate(base, a).map(([x, y]) => k([x + ORIGINE[0], y + ORIGINE[1]])));
    assert.deepEqual([...toccati].sort(), [...m.keys()].sort(), `${base.join(' × ')} @${a}°: quadretti toccati`);
    if (a % 90 === 0) assert.equal(f.celle.length, base[0] * base[1], `${base} @${a}: rettangolo esatto`);
    n += 1;
  }
  assert.equal(n, BASI.length * 8);
});

test('A.172 oltre 20: un muro su un angolo della sagoma (un quadretto toccato per meno di metà) rende la posizione non valida', () => {
  let angoli = 0;
  for (const base of BASI) for (const a of ORIENTAMENTI) {
    const t = token(base, a);
    const occupati = new Set(celleToken(t).map(k));
    const toccati = celleToccateToken(t).map(k);
    const ambiente = (muri) => ({ colonne: 120, righe: 120, muro: (x, y) => muri.has(k([x, y])) });
    for (const c of toccati.filter((x) => !occupati.has(x))) {
      const r = posizioneValida(t, ambiente(new Set([c])));
      assert.equal(r.ok, false, `${base.join(' × ')} @${a}°: il muro su ${c} non è stato visto`);
      angoli += 1;
    }
    // un muro tutto attorno, fuori dalla sagoma vera: nessun falso rifiuto
    const tt = new Set(toccati);
    const xs = toccati.map((c) => +c.split(',')[0]); const ys = toccati.map((c) => +c.split(',')[1]);
    const cornice = new Set();
    for (let y = Math.min(...ys) - 1; y <= Math.max(...ys) + 1; y++) for (let x = Math.min(...xs) - 1; x <= Math.max(...xs) + 1; x++) if (!tt.has(k([x, y]))) cornice.add(k([x, y]));
    assert.equal(posizioneValida(t, ambiente(cornice)).ok, true, `${base.join(' × ')} @${a}°: i muri fuori dalla sagoma non la bloccano`);
  }
  assert.ok(angoli > 2000, `${angoli} quadretti d'angolo provati uno per uno`);
});

test('la Neverlost 34 × 20 ruotata di 45° accanto a un muro: dopo ogni giro, se lo scafo vero tocca il muro la posizione non è valida', () => {
  let giri = 0;
  for (const base of [[34, 20], ...BASI.filter(([L, W]) => L > W && L >= 30)]) {
    for (const da of [0, 90]) {
      const t0 = token(base, da);
      const xMax = Math.max(...celleToccateToken(t0).map((c) => c[0]));
      const muri = new Set(); for (let y = 0; y < 120; y++) muri.add(k([xMax + 1, y]));
      const ambiente = { colonne: 120, righe: 120, muro: (x, y) => muri.has(k([x, y])) };
      assert.equal(posizioneValida(t0, ambiente).ok, true, 'partenza: accanto al muro, non dentro');
      let t = t0;
      for (let passo = 0; passo < 3; passo++) {
        t = ruotaDi(t, 45, { colonne: 120, righe: 120 });
        const dentro = celleToccateToken(t).some(([x, y]) => muri.has(k([x, y])));
        assert.equal(posizioneValida(t, ambiente).ok, !dentro, `${base.join(' × ')} da ${da}°, dopo ${(passo + 1) * 45}°`);
        giri += 1;
      }
    }
  }
  assert.ok(giri >= 6);
});

test('lo scafo è un ostacolo secondo la sagoma vera: una pedina non entra nemmeno in un quadretto toccato da un angolo', () => {
  const nave = { id: 'nl', ...token([34, 20], 45), blocca: true };
  const toccati = new Set(celleToccateToken(nave).map(k));
  for (const c of [...toccati].slice(0, 400)) assert.equal(sovrappone(nave, { q: c.split(',').map(Number), ingombro: 1 }), true, `scontro su ${c}`);
  // il movimento di un PG accanto alla nave non entra in nessun quadretto toccato dallo scafo
  const C = 140; const R = 140;
  const vuota = inBase64(nuovaMaschera(C, R));
  const area = areaRaggiungibile({ colonne: C, righe: R, muri: vuota, terreno: vuota, token: [nave], chi: { id: 'pg', q: [10, 10], ingombro: 1, lato: 'pg' }, massimo: 200, regole: dati.mappa.movimento });
  for (const c of toccati) {
    const [x, y] = c.split(',').map(Number);
    if (x < C && y < R) assert.equal(area.costo[y * C + x], Infinity, `il PG non entra nello scafo in ${c}`);
  }
});

test('la scena accetta un veicolo fino a 34 × 34 (la Neverlost 20 × 34, anche a 45°) e rifiuta 35', () => {
  const s0 = nuovaScena({ id: 'rete', nome: 'Rete', colonne: 120, righe: 120, dati });
  const tok = (ingombro, extra = {}) => ({ id: 'v1', rif: { tipo: 'veicolo', id: 'vei-nl' }, q: [5, 5], ingombro, nascosto: false, ...extra });
  assert.equal(validaScena({ ...s0, token: [tok([20, 34])] }, dati), null);
  assert.equal(validaScena({ ...s0, token: [tok([34, 34])] }, dati), null);
  assert.match(String(validaScena({ ...s0, token: [tok([35, 20])] }, dati)), /token\[0\]\.ingombro/);
  const f = formaRuotata([34, 20], 45);
  assert.equal(validaScena({ ...s0, token: [tok(f.ingombro, { angolo: 45, base: [34, 20], q: [20, 20] })] }, dati), null);
});
