// A.167 (18/10/2026): sagome rettangolari e ruotate delle pedine (src/mappa/sagoma.js): 1 × 2, 2 × 3, 3 × 5 e 3 × 10 a tutti
// gli orientamenti, sovrapposizione fra sagome ruotate, passaggio in un corridoio stretto. Niente browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import {
  ORIENTAMENTI, sagoma, celle, area, sovrappone, posizioneValida, puoPassare, distanza, ruotabile, ingombroDaSpazio, baseDaSpazio,
} from '../src/mappa/sagoma.js';
import { ruotaDi } from '../src/mappa/forma.js';
import { parseSpazio } from '../src/mappa/token.js';

const { dati } = await datiReali();

const FORME = { 'Corazzato 1 × 2': [2, 1], 'Regina Comandante 2 × 3': [3, 2], 'Incubatrice 3 × 5': [5, 3], 'Madre 3 × 10': [10, 3] };

// otto vicini: a 45° una sagoma sottile (1 × 2) è fatta di due Q in diagonale
const connessa = (cs) => {
  const k = (c) => `${c[0]},${c[1]}`;
  const insieme = new Set(cs.map(k));
  const visti = new Set([k(cs[0])]);
  const coda = [cs[0]];
  for (let i = 0; i < coda.length; i++) {
    const [x, y] = coda[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const n = [x + dx, y + dy];
      if (insieme.has(k(n)) && !visti.has(k(n))) { visti.add(k(n)); coda.push(n); }
    }
  }
  return visti.size === cs.length;
};

test('ogni sagoma, a tutti gli orientamenti, occupa quasi l’area vera (non il quadrato che la contiene) ed è un blocco unico', () => {
  for (const [nome, base] of Object.entries(FORME)) {
    const vera = base[0] * base[1];
    for (const a of ORIENTAMENTI) {
      const s = sagoma(base, a);
      assert.ok(Math.abs(s.celle.length - vera) <= Math.ceil(vera * 0.12) + 1, `${nome} a ${a}°: ${s.celle.length} Q per un’area di ${vera}`);
      assert.ok(connessa(s.celle), `${nome} a ${a}° connessa`);
      assert.equal(new Set(s.celle.map((c) => c.join(','))).size, s.celle.length, 'nessun Q doppio');
      // mai il quadrato circoscritto: la 3 × 10 non diventa 100 Q
      assert.ok(s.celle.length < s.ingombro[0] * s.ingombro[1] || a % 90 === 0, `${nome} a ${a}°: la diagonale non riempie il rettangolo che la contiene`);
    }
  }
  assert.equal(sagoma([10, 3], 0).celle.length, 30, 'una 3 × 10 occupa 30 Q');
});

test('agli angoli retti la sagoma è il rettangolo esatto, con larghezza e lunghezza scambiate a 90° e 270°', () => {
  assert.deepEqual(sagoma([10, 3], 0).ingombro, [3, 10]);
  assert.deepEqual(sagoma([10, 3], 180).ingombro, [3, 10]);
  assert.deepEqual(sagoma([10, 3], 90).ingombro, [10, 3]);
  assert.deepEqual(sagoma([10, 3], 270).ingombro, [10, 3]);
  assert.deepEqual(sagoma([3, 2], 90).ingombro, [3, 2]);
  assert.deepEqual(sagoma([2, 1], 0).ingombro, [1, 2]);
  assert.equal(sagoma([5, 3], 90).celle.length, 15);
});

test('a 45° la 3 × 10 corre in diagonale: i Q stanno attorno alla diagonale, non negli angoli opposti', () => {
  for (const a of [45, 225]) {
    const s = sagoma([10, 3], a);
    const [w, h] = s.ingombro;
    // l’asse lungo va dall’alto a destra al basso a sinistra: sulla diagonale secondaria x + y ≈ w − 1 … h − 1
    for (const [x, y] of s.celle) assert.ok(Math.abs((x + 0.5) / w * h - (h - (y + 0.5))) <= 3.1, `Q ${x},${y} a ${a}° lontano dalla diagonale`);
    assert.ok(!s.celle.some(([x, y]) => x === 0 && y === 0), 'angolo in alto a sinistra vuoto');
    assert.ok(!s.celle.some(([x, y]) => x === w - 1 && y === h - 1), 'angolo in basso a destra vuoto');
  }
  for (const a of [135, 315]) {
    const s = sagoma([10, 3], a);
    const [w, h] = s.ingombro;
    assert.ok(!s.celle.some(([x, y]) => x === w - 1 && y === 0), `angolo in alto a destra vuoto a ${a}°`);
    assert.ok(!s.celle.some(([x, y]) => x === 0 && y === h - 1), `angolo in basso a sinistra vuoto a ${a}°`);
  }
  // la diagonale a 45° tocca molti meno Q del quadrato 8 × 9 che la contiene
  assert.ok(sagoma([10, 3], 45).celle.length < 8 * 9 / 2);
});

test('opposti: a e a + 180° danno la stessa sagoma (stesso numero di Q e stesso ingombro)', () => {
  for (const base of Object.values(FORME)) {
    for (const a of [0, 45, 90, 135]) {
      const x = sagoma(base, a), y = sagoma(base, a + 180);
      assert.equal(x.celle.length, y.celle.length);
      assert.deepEqual(x.ingombro, y.ingombro);
    }
  }
});

test('sovrapposizione fra sagome ruotate: contano i Q veri, non i rettangoli che le contengono', () => {
  const madre = (q, angolo) => ({ q, ...(angolo === undefined ? { ingombro: [3, 10] } : { base: [10, 3], angolo, ingombro: sagoma([10, 3], angolo).ingombro }) });
  // due diagonali parallele distanti: i rettangoli che le contengono si incrociano, le sagome no
  const a = madre([0, 0], 45);
  const [w] = a.ingombro;
  const b = madre([w - 2, 0], 45); // spostata a destra di quasi tutta la larghezza: stesse diagonali, rettangoli sovrapposti
  assert.equal(sovrappone(a, b), false, 'due diagonali parallele vicine ma staccate non si sovrappongono');
  // sulla stessa diagonale e sullo stesso punto: sovrapposte
  assert.equal(sovrappone(a, madre([0, 0], 45)), true);
  // una diagonale a 45° e una 3 × 10 verticale che la attraversa nel mezzo: si incrociano
  const croce = madre([3, 0]);
  assert.equal(sovrappone(a, croce), true);
  // una pedina 1 × 1 nell’angolo vuoto del rettangolo che contiene la diagonale non la tocca
  assert.equal(sovrappone(a, { q: [0, 0], ingombro: 1 }), false);
  const oltre = sagoma([10, 3], 45).celle[0];
  assert.equal(sovrappone(a, { q: [a.q[0] + oltre[0], a.q[1] + oltre[1]], ingombro: 1 }), true);
  // perpendicolari a 45° e 135° nello stesso rettangolo: si incrociano al centro
  const x1 = madre([0, 0], 45), x2 = madre([0, 0], 135);
  assert.equal(sovrappone(x1, x2), true);
  assert.equal(area(x1), celle(x1).length);
});

test('posizione valida: fuori dalla griglia, sul muro o su un altro token si dice perché, sui Q veri della sagoma', () => {
  const t = { q: [0, 0], base: [10, 3], angolo: 45, ingombro: sagoma([10, 3], 45).ingombro };
  const g = { colonne: 20, righe: 20 };
  assert.deepEqual(posizioneValida(t, g), { ok: true });
  assert.equal(posizioneValida({ ...t, q: [15, 0] }, g).motivo, 'fuori');
  // un muro nell’angolo vuoto del rettangolo che contiene la diagonale non la ferma
  assert.equal(posizioneValida(t, { ...g, muro: (x, y) => x === 0 && y === 0 }).ok, true);
  const [cx, cy] = celle(t)[5];
  assert.equal(posizioneValida(t, { ...g, muro: (x, y) => x === cx && y === cy }).motivo, 'muro');
  assert.equal(posizioneValida(t, { ...g, altri: [{ q: [cx, cy], ingombro: 1 }] }).motivo, 'token');
});

test('passaggio in un corridoio stretto: la 3 × 10 passa solo con l’orientamento giusto', () => {
  // corridoio orizzontale largo 3 Q (righe 4–6) in una stanza di 30 × 12 tutta murata tranne il corridoio e due sale
  const colonne = 30, righe = 12;
  const muro = (x, y) => {
    if (x < 8 || x >= 22) return false; // sale libere ai due lati
    return !(y >= 4 && y <= 6); // nel mezzo solo il corridoio
  };
  const amb = { colonne, righe, muro };
  const orizzontale = { base: [10, 3], angolo: 90, ingombro: [10, 3] };
  const verticale = { base: [10, 3], angolo: 0, ingombro: [3, 10] };
  const diagonale = { base: [10, 3], angolo: 45, ingombro: sagoma([10, 3], 45).ingombro };
  const p = puoPassare({ ...orizzontale, q: [0, 4] }, [0, 4], [20, 4], amb);
  assert.ok(p, 'orizzontale passa dal corridoio');
  assert.deepEqual(p[0], [0, 4]);
  assert.deepEqual(p.at(-1), [20, 4]);
  // verticale: nelle sale entra (lì c’è spazio) ma non attraversa il corridoio
  assert.equal(puoPassare({ ...verticale, q: [0, 0] }, [0, 0], [26, 0], amb), null, 'verticale non passa');
  // diagonale: la sua sezione è più larga di 3 Q
  assert.equal(puoPassare({ ...diagonale, q: [0, 2] }, [0, 2], [20, 2], amb), null, 'diagonale non passa');
  // un corridoio a 45° (fascia lungo x + y = 16, larga 9 Q) fa passare la diagonale e non la verticale
  const fascia = (x, y) => Math.abs(x + y - 16) > 4;
  const amb2 = { colonne: 24, righe: 24, muro: fascia };
  const validi = (t) => { const r = []; for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) if (posizioneValida({ ...t, q: [x, y] }, amb2).ok) r.push([x, y]); return r; };
  const dg = validi(diagonale);
  assert.ok(dg.length > 1, 'la diagonale ci sta');
  const lungoFascia = (q) => q[0] - q[1];
  const da = dg.reduce((m, q) => (lungoFascia(q) < lungoFascia(m) ? q : m)), a2 = dg.reduce((m, q) => (lungoFascia(q) > lungoFascia(m) ? q : m));
  assert.ok(lungoFascia(a2) > lungoFascia(da), 'ci sono posizioni lungo la fascia');
  assert.ok(puoPassare({ ...diagonale, q: da }, da, a2, amb2), 'la diagonale percorre la fascia diagonale');
  assert.equal(validi(verticale).length, 0, 'la verticale non entra nella fascia diagonale');
});

test('creature e spazio: lo spazio della scheda dà ingombro quadrato (intero) o rettangolare ([colonne, righe]) e la base [lungo, largo]', () => {
  assert.equal(ingombroDaSpazio(parseSpazio('6 × 6 Q')), 6);
  assert.deepEqual(ingombroDaSpazio(parseSpazio('3 × 10 Q')), [3, 10]);
  assert.deepEqual(ingombroDaSpazio(parseSpazio('2 × 1 Q')), [2, 1]);
  assert.deepEqual(baseDaSpazio([3, 10]), [10, 3]);
  assert.deepEqual(baseDaSpazio([2, 1]), [2, 1]);
  assert.equal(ruotabile({ ingombro: [3, 10] }), true);
  assert.equal(ruotabile({ ingombro: 3 }), false);
  assert.equal(ruotabile({ ingombro: [3, 3], base: [3, 3], angolo: 0 }), false);
});

test('girare la Madre di 45° attorno al suo centro: ingombro, q e perno coerenti, e tornare a 0° ridà la forma di partenza', () => {
  const g = { colonne: 40, righe: 40 };
  const t0 = { id: 'm', rif: { tipo: 'partecipante', id: 'madre' }, q: [10, 10], ingombro: [3, 10] };
  const t1 = ruotaDi(t0, 45, g);
  assert.equal(t1.angolo, 225, 'dall’angolo di partenza (180°) di 45° in senso orario');
  assert.deepEqual(t1.base, [10, 3]);
  assert.deepEqual(t1.ingombro, sagoma([10, 3], t1.angolo).ingombro);
  const centro0 = [t0.q[0] + 1.5, t0.q[1] + 5];
  const f = sagoma(t1.base, t1.angolo);
  assert.ok(Math.abs(t1.q[0] + f.centro[0] - centro0[0]) <= 1 && Math.abs(t1.q[1] + f.centro[1] - centro0[1]) <= 1, 'il centro resta quasi fermo');
  let t = t0;
  for (let i = 0; i < 8; i++) t = ruotaDi(t, 45, g);
  assert.equal(t.angolo, 180, 'otto passi da 45° riportano all’angolo di partenza');
  assert.deepEqual(t.ingombro, [3, 10]);
  assert.ok(distanza(t, t0) <= 1);
  assert.ok(dati.mappa.token.creatura_ingombro_max >= 10);
});
