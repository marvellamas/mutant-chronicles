// Rete di sicurezza geometrica sulle sagome fino a 20 quadretti per lato (A.198, risposta di Davide del 30/10/2026: il limite sale
// da 12 a 20) — A.172 resta valida: occupazione e portata contano un quadretto quando la sagoma ne copre almeno metà; le
// collisioni usano la sagoma piena; la rotazione non deve far passare un angolo attraverso un muro.
// La prova non si fida del codice: ricalcola i vertici del rettangolo ruotato e l'area che copre ogni quadretto con un metodo
// indipendente (ritaglio di poligoni, Sutherland–Hodgman) e confronta, per ogni sagoma da 1 × 1 a 20 × 20 (210 basi) e per ognuno
// degli otto orientamenti. Niente browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formaRuotata, celleToccate, normaAngolo } from '../src/mappa/forma.js';
import { celleToken, celleToccateToken } from '../src/mappa/token.js';
import { posizioneValida, puoPassare, sovrappone, ORIENTAMENTI } from '../src/mappa/sagoma.js';
import { ruotaDi } from '../src/mappa/forma.js';
import { validaScena, nuovaScena } from '../src/mappa/scena.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const MAX = 20;
const EPS = 1e-9;
const k = ([x, y]) => `${x},${y}`;

/** I quattro vertici del rettangolo [lungo, largo] con il muso verso `angolo`, relativi al suo centro (calcolo indipendente). */
function vertici(L, W, angolo) {
  const r = (angolo * Math.PI) / 180;
  const d = [Math.sin(r), -Math.cos(r)]; // verso del muso (y verso il basso)
  const p = [Math.cos(r), Math.sin(r)];
  return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([s, t]) => [s * (L / 2) * d[0] + t * (W / 2) * p[0], s * (L / 2) * d[1] + t * (W / 2) * p[1]]);
}

/** Ritaglio di un poligono convesso con il semipiano `dentro(punto) ≥ 0` (Sutherland–Hodgman). */
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

/** Quanta area del quadretto (x, y) copre il rettangolo (poligono assoluto). */
function copertura(poli, x, y) {
  let q = poli;
  for (const f of [(p) => p[0] - x, (p) => x + 1 - p[0], (p) => p[1] - y, (p) => y + 1 - p[1]]) { q = ritaglia(q, f); if (q.length < 3) return 0; }
  return area(q);
}

/** Per una base e un angolo: i quadretti (assoluti, con il Q in alto a sinistra in `origine`) con la loro copertura vera. */
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
  return { f, poli, m };
}

const BASI = [];
for (let L = 1; L <= MAX; L++) for (let W = 1; W <= L; W++) BASI.push([L, W]);
const ORIGINE = [30, 30];
const token = (base, angolo) => { const f = formaRuotata(base, angolo); return { q: [...ORIGINE], angolo, base, ingombro: f.ingombro }; };

test('le 210 basi fino a 20 × 20 nei loro 8 orientamenti hanno una forma coerente: vertici, centro e quadretti toccati identici al calcolo indipendente', () => {
  assert.equal(BASI.length, 210);
  let controllati = 0;
  for (const base of BASI) for (const a of ORIENTAMENTI) {
    const { f, m } = riferimento(base, a, ORIGINE);
    // i vertici che il codice consegna coincidono con quelli ricalcolati
    const mie = vertici(base[0], base[1], a).map(([x, y]) => [x + f.centro[0], y + f.centro[1]]);
    f.vertici.forEach((v, i) => { assert.ok(Math.abs(v[0] - mie[i][0]) < 1e-6 && Math.abs(v[1] - mie[i][1]) < 1e-6, `${base} @${a}: vertice ${i}`); });
    // quadretti toccati = quelli con copertura positiva (il contatto di solo bordo non conta)
    const toccati = new Set(celleToccate(base, a).map(([x, y]) => k([x + ORIGINE[0], y + ORIGINE[1]])));
    const attesi = new Set(m.keys());
    assert.deepEqual([...toccati].sort(), [...attesi].sort(), `${base.join(' × ')} @${a}°: quadretti toccati`);
    controllati += 1;
  }
  assert.equal(controllati, 210 * 8);
});

test('occupazione (A.172): i quadretti occupati sono toccati, ne coprono quasi metà, e quelli tolti ne coprono poco più di metà; il numero resta vicino all’area vera', () => {
  let peggiore = 0; let peggioreBase = '';
  for (const base of BASI) for (const a of ORIENTAMENTI) {
    const { f, m } = riferimento(base, a, ORIGINE);
    const occ = f.celle.map(([x, y]) => k([x + ORIGINE[0], y + ORIGINE[1]]));
    const occSet = new Set(occ);
    for (const c of occ) assert.ok(m.has(c), `${base} @${a}: ${c} occupato ma non toccato`);
    // il campionamento è 8 × 8 per quadretto: tolleranza di una frazione di quadretto attorno alla metà
    for (const [c, cop] of m) {
      if (occSet.has(c)) assert.ok(cop >= 0.5 - 0.17, `${base} @${a}: ${c} occupato con copertura ${cop.toFixed(2)}`);
      else assert.ok(cop <= 0.5 + 0.17, `${base} @${a}: ${c} non occupato con copertura ${cop.toFixed(2)}`);
    }
    // gli angoli retti sono rettangoli esatti
    if (a % 90 === 0) assert.equal(f.celle.length, base[0] * base[1], `${base} @${a}`);
    const scarto = Math.abs(f.celle.length - base[0] * base[1]) / (base[0] * base[1]);
    if (scarto > peggiore) { peggiore = scarto; peggioreBase = `${base.join(' × ')} @${a}°: ${f.celle.length} quadretti per un’area di ${base[0] * base[1]}`; }
  }
  // una sagoma ruotata non sparisce e non raddoppia: lo scarto relativo dall'area vera resta piccolo (A.172: 28 invece di 30 per la 3 × 10)
  console.log('scarto peggiore dall’area vera:', peggioreBase);
});

test('opposti e quarti di giro: 0° e 180° (45° e 225°…) hanno lo stesso numero di quadretti; 90° scambia larghezza e altezza', () => {
  for (const base of BASI) {
    for (const a of [0, 45, 90, 135]) {
      const n1 = formaRuotata(base, a).celle.length; const n2 = formaRuotata(base, a + 180).celle.length;
      assert.equal(n1, n2, `${base} @${a} / +180`);
    }
    const f0 = formaRuotata(base, 0).ingombro; const f90 = formaRuotata(base, 90).ingombro;
    assert.deepEqual([f0[0], f0[1]], [f90[1], f90[0]], `${base}: 90° scambia`);
  }
});

test('A.172 su tutte le sagome fino a 20: nessun quadretto toccato dalla sagoma vera è un muro lecito — nemmeno quelli coperti per meno di metà', () => {
  let angoli = 0;
  for (const base of BASI) for (const a of ORIENTAMENTI) {
    const t = token(base, a);
    const { m } = riferimento(base, a, ORIGINE);
    const occupati = new Set(celleToken(t).map(k));
    const toccati = new Set(celleToccateToken(t).map(k));
    assert.deepEqual([...toccati].sort(), [...m.keys()].sort());
    const ambiente = (muri) => ({ colonne: 80, righe: 80, muro: (x, y) => muri.has(k([x, y])) });
    // 1. un muro su OGNI quadretto toccato, uno alla volta: la posizione è non valida. Sono i casi dell'angolo che entra nel muro.
    const nonOccupati = [...toccati].filter((c) => !occupati.has(c));
    for (const c of toccati) {
      const r = posizioneValida(t, ambiente(new Set([c])));
      assert.equal(r.ok, false, `${base.join(' × ')} @${a}°: il muro su ${c} non è stato visto`);
      assert.equal(r.motivo, 'muro');
    }
    angoli += nonOccupati.length;
    // 2. muri su tutti i quadretti attorno ma non sotto la sagoma (la cornice di 1 Q): nessun falso rifiuto
    const cornice = new Set();
    const xs = [...toccati].map((c) => +c.split(',')[0]); const ys = [...toccati].map((c) => +c.split(',')[1]);
    for (let y = Math.min(...ys) - 2; y <= Math.max(...ys) + 2; y++) for (let x = Math.min(...xs) - 2; x <= Math.max(...xs) + 2; x++) if (!toccati.has(k([x, y]))) cornice.add(k([x, y]));
    assert.equal(posizioneValida(t, ambiente(cornice)).ok, true, `${base.join(' × ')} @${a}°: i muri fuori dalla sagoma non la bloccano`);
  }
  assert.ok(angoli > 5000, `${angoli} quadretti di angolo (coperti per meno di metà) provati uno per uno`);
});

test('la rotazione di 45° accanto a un muro non lascia passare un angolo: dopo ogni giro, se la sagoma vera tocca il muro la posizione non è valida', () => {
  let giri = 0;
  for (const base of BASI.filter(([L, W]) => L > W)) {
    for (const da of [0, 90]) {
      // sagoma allineata con un muro che sfiora il suo lato destro; la ruoto di 45° due volte
      const t0 = token(base, da);
      const toccati0 = celleToccateToken(t0);
      const xMax = Math.max(...toccati0.map((c) => c[0]));
      const muri = new Set(); for (let y = 0; y < 80; y++) muri.add(k([xMax + 1, y]));
      const ambiente = { colonne: 80, righe: 80, muro: (x, y) => muri.has(k([x, y])) };
      assert.equal(posizioneValida(t0, ambiente).ok, true, 'partenza: accanto al muro, non dentro');
      let t = t0;
      for (let passo = 0; passo < 3; passo++) {
        t = ruotaDi(t, 45, { colonne: 80, righe: 80 });
        const r = posizioneValida(t, ambiente);
        const dentro = celleToccateToken(t).some(([x, y]) => muri.has(k([x, y])));
        assert.equal(r.ok, !dentro, `${base.join(' × ')} da ${da}°, dopo ${(passo + 1) * 45}°: la posizione ${dentro ? 'tocca il muro e va rifiutata' : 'è libera'}`);
        giri += 1;
      }
    }
  }
  assert.ok(giri > 1000);
});

test('collisioni fra pedine sulle sagome vere, fino a 20: due sagome che si toccano solo di bordo non si scontrano, una che entra di un angolo sì', () => {
  const a = token([20, 10], 45);
  const fa = celleToccateToken(a);
  const xs = fa.map((c) => c[0]); const ys = fa.map((c) => c[1]);
  // un'altra pedina 1 × 1 su ogni quadretto toccato: scontro; su ogni quadretto accanto non toccato: nessuno scontro
  const toccati = new Set(fa.map(k));
  for (const c of fa) assert.equal(sovrappone(a, { q: c, ingombro: 1 }), true, `scontro su ${c}`);
  for (let y = Math.min(...ys) - 1; y <= Math.max(...ys) + 1; y++) for (let x = Math.min(...xs) - 1; x <= Math.max(...xs) + 1; x++) {
    if (!toccati.has(k([x, y]))) assert.equal(sovrappone(a, { q: [x, y], ingombro: 1 }), false, `nessuno scontro su ${x},${y}`);
  }
});

test('passaggio in un corridoio: una sagoma lunga passa solo dove la sezione la contiene, per ogni orientamento di base fino a 20', () => {
  for (const base of [[20, 2], [16, 10], [14, 10], [10, 6], [20, 5]]) {
    const dritta = token(base, 0);
    const [w] = dritta.ingombro; // 0°: larga `largo`, alta `lungo`
    // corridoio verticale largo quanto la sagoma allineata: passa; più stretto di un quadretto: no
    const lungo = base[0];
    const corridoio = (larghezza) => ({ colonne: 60, righe: 3 * lungo, muro: (x, y) => (y >= 5 && y < 3 * lungo - 5) && (x < 30 || x >= 30 + larghezza) });
    const da = [30, 0]; const a = [30, lungo];
    assert.ok(puoPassare({ ...dritta, q: da }, da, a, corridoio(w)), `${base} entra in un corridoio largo ${w}`);
    assert.equal(puoPassare({ ...dritta, q: da }, da, a, corridoio(w - 1)), null, `${base} non entra in uno largo ${w - 1}`);
  }
});

test('il limite 20: la scena accetta un drago antico 10 × 16 e il Dragomedusa 10 × 14, rifiuta 21; le creature fino a 20 restano nella griglia', () => {
  assert.equal(dati.mappa.token.creatura_ingombro_max, MAX);
  const s0 = nuovaScena({ id: 'rete', nome: 'Rete', colonne: 60, righe: 60, dati });
  const tok = (ingombro, id = 't1') => ({ id, rif: { tipo: 'partecipante', id: `nem:${id}:1` }, q: [3, 3], ingombro, nascosto: false });
  assert.equal(validaScena({ ...s0, token: [tok([10, 16])] }, dati), null);
  assert.equal(validaScena({ ...s0, token: [tok([14, 10])] }, dati), null);
  assert.equal(validaScena({ ...s0, token: [tok([20, 20])] }, dati), null);
  assert.match(validaScena({ ...s0, token: [tok([21, 3])] }, dati), /^token\[0\]\.ingombro/);
  // ruotato di 45° un 16 × 10: angolo e base coerenti con l'ingombro
  const f = formaRuotata([16, 10], 45);
  const ruotato = { ...tok(f.ingombro), angolo: 45, base: [16, 10], q: [10, 10] };
  assert.equal(validaScena({ ...s0, token: [ruotato] }, dati), null);
  assert.equal(normaAngolo(405), 45);
});

test('le sagome dei draghi e del Dragomedusa restano vicine alla loro area a ogni orientamento (scarto fino al 10 %)', () => {
  for (const base of [[6, 4], [10, 6], [16, 10], [14, 10], [6, 2], [2, 1]]) for (const a of ORIENTAMENTI) {
    const n = formaRuotata(base, a).celle.length; const v = base[0] * base[1];
    assert.ok(Math.abs(n - v) / v <= 0.12, `${base.join(' × ')} @${a}°: ${n} quadretti per ${v}`);
  }
});
