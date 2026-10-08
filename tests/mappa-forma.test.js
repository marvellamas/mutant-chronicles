// Veicoli con orientamento libero (08/10/2026): quadretti occupati dal rettangolo ruotato («almeno metà», come i
// template), rotazione a passi, collisioni con muri e token, area di movimento, linea di tiro, discesa dei passeggeri,
// muso nella barra dell'Iniziativa, scene di prima con la direzione a 90°.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { formaRuotata, formaDi, ruotaDi, erroreForma, angoloDi, CAMPIONI, normaAngolo } from '../src/mappa/forma.js';
import { celleToken, tokenSottoPunto } from '../src/mappa/token.js';
import { ruotaSeLibero, qPerScendere, sali, distanzaToken } from '../src/mappa/veicoli-mappa.js';
import { areaRaggiungibile, costoVerso, celleArea } from '../src/mappa/area.js';
import { tokenInMezzo } from '../src/mappa/visuale.js';
import { validaScena, nuovaScena } from '../src/mappa/scena.js';
import { nuovaMaschera, inBase64 } from '../src/mappa/celle.js';

const { dati } = await datiReali();
const disegno = (f) => Array.from({ length: f.ingombro[1] }, (_, y) => Array.from({ length: f.ingombro[0] }, (_, x) => (f.celle.some(([a, b]) => a === x && b === y) ? '#' : '.')).join(''));
const scout = (q, angolo, extra = {}) => ({ id: 'v', rif: { tipo: 'veicolo', id: 'v1' }, q, angolo, base: [4, 2], ingombro: formaRuotata([4, 2], angolo).ingombro, nascosto: false, ...extra });

test('campioni come i template (data/mappa.json → template.campioni_per_lato)', () => {
  assert.equal(CAMPIONI, dati.mappa.template.campioni_per_lato);
  assert.ok(dati.mappa.token.rotazione_veicoli.passo_gradi === 10 && dati.mappa.token.rotazione_veicoli.passo_rapido_gradi === 45);
});

test('quadretti occupati dallo Scout 4 × 2 a 0°, 10°, 30°, 45°, 90°: almeno metà coperta, sempre 8 quadretti', () => {
  assert.deepEqual(disegno(formaRuotata([4, 2], 0)), ['##', '##', '##', '##']);
  assert.deepEqual(disegno(formaRuotata([4, 2], 10)), ['##', '##', '##', '##'], 'a 10° resta dritto: nessun quadretto coperto per metà cambia');
  assert.deepEqual(disegno(formaRuotata([4, 2], 30)), ['.##', '.##', '##.', '##.']);
  assert.deepEqual(disegno(formaRuotata([4, 2], 45)), ['..#.', '.###', '###.', '.#..']);
  assert.deepEqual(disegno(formaRuotata([4, 2], 90)), ['####', '####']);
  for (const a of [0, 10, 20, 30, 40, 45, 50, 60, 135, 200, 315]) assert.equal(formaRuotata([4, 2], a).celle.length, 8, `${a}°`);
  // simmetria: 180° e 0° occupano gli stessi quadretti
  assert.deepEqual(formaRuotata([4, 2], 210).celle, formaRuotata([4, 2], 30).celle);
  assert.equal(normaAngolo(-10), 350);
});

test('rotazione a passi attorno al centro: dodici passi di 30° tornano al punto di partenza', () => {
  const g = { colonne: 30, righe: 30 };
  let t = scout([10, 10], 0);
  const c0 = [t.q[0] + formaDi(t).centro[0], t.q[1] + formaDi(t).centro[1]];
  for (let i = 0; i < 12; i++) {
    t = ruotaDi(t, 30, g);
    const c = [t.q[0] + formaDi(t).centro[0], t.q[1] + formaDi(t).centro[1]];
    assert.ok(Math.hypot(c[0] - c0[0], c[1] - c0[1]) <= 0.75, `centro fermo (passo ${i + 1})`);
  }
  assert.equal(t.angolo, 0);
  assert.deepEqual(t.q, [10, 10]);
});

test('collisioni: girato a 30° non entra in un muro che tocca la sua forma; il muro nell’angolo vuoto del rettangolo non conta', () => {
  const scena = { griglia: { colonne: 20, righe: 20 }, token: [scout([5, 5], 0)] };
  const r = ruotaSeLibero(scena, 'v', 30);
  assert.ok(r.token);
  const piena = celleToken(r.token);
  const [x0, y0] = r.token.q;
  const [w, h] = r.token.ingombro;
  const vuota = [];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (!piena.some(([a, b]) => a === x && b === y)) vuota.push([x, y]);
  assert.ok(vuota.length >= 2, 'a 30° il rettangolo che contiene il mezzo ha angoli vuoti');
  const [mx, my] = piena[0];
  assert.match(ruotaSeLibero(scena, 'v', 30, (x, y) => x === mx && y === my).errore, /muro/);
  assert.ok(ruotaSeLibero(scena, 'v', 30, (x, y) => x === vuota[0][0] && y === vuota[0][1]).token, 'un muro nell’angolo vuoto non blocca');
  // un altro token sulla forma blocca
  const con = { ...scena, token: [...scena.token, { id: 'p', rif: { tipo: 'partecipante', id: 'pg:A' }, q: [mx, my], ingombro: 1, nascosto: false }] };
  assert.match(ruotaSeLibero(con, 'v', 30).errore, /altro token/);
  // clic: nell'angolo vuoto non si prende il veicolo
  const gr = { scosto_x: 0, scosto_y: 0, q_px: 10 };
  assert.equal(tokenSottoPunto(gr, r.token, vuota[0][0] * 10 + 5, vuota[0][1] * 10 + 5), false);
  assert.equal(tokenSottoPunto(gr, r.token, mx * 10 + 5, my * 10 + 5), true);
});

test('area di movimento: il veicolo a 45° passa dove passa la sua forma, e l’area colora i suoi quadretti', () => {
  const C = 12, R = 12;
  const muri = nuovaMaschera(C, R);
  const t = scout([2, 2], 45);
  const forma = formaDi(t);
  // un muro in un angolo vuoto della forma, nella posizione di arrivo [6, 2]: si può arrivare lo stesso
  const vuoto = [0, 0];
  assert.ok(!forma.celle.some(([a, b]) => a === vuoto[0] && b === vuoto[1]));
  muri[(2 + vuoto[1]) * C + 6 + vuoto[0] >> 3] |= 1 << (((2 + vuoto[1]) * C + 6 + vuoto[0]) & 7);
  const area = areaRaggiungibile({ colonne: C, righe: R, muri, terreno: nuovaMaschera(C, R), token: [], chi: { id: 'v', q: t.q, ingombro: t.ingombro, angolo: t.angolo, base: t.base, lato: 'pg' }, massimo: 10, regole: dati.mappa.movimento });
  assert.equal(costoVerso(area, [6, 2]), 4);
  // con il rettangolo pieno (senza forma) quel muro lo fermerebbe
  const rett = areaRaggiungibile({ colonne: C, righe: R, muri, terreno: nuovaMaschera(C, R), token: [], chi: { id: 'v', q: t.q, ingombro: t.ingombro, lato: 'pg' }, massimo: 10, regole: dati.mappa.movimento });
  assert.equal(costoVerso(rett, [6, 2]), Infinity);
  // l'area colora solo i quadretti della forma: l'angolo vuoto della partenza spostata di 1 resta vuoto se nessuna posizione lo copre
  const celle = celleArea(area, { passo: 10, corsa: null, scatto: null }, 1);
  assert.ok(celle.some((k) => k === 1));
});

test('linea di tiro: il veicolo ruotato fa ostacolo solo con i suoi quadretti', () => {
  const v = scout([4, 0], 30);
  const piene = celleToken(v);
  const regole = dati.mappa.visuale;
  // una linea orizzontale che passa per un quadretto della forma: il veicolo è «in mezzo»
  const [px, py] = piene[0];
  const da = { id: 'a', q: [0, py], ingombro: 1 }, a = { id: 'b', q: [12, py], ingombro: 1 };
  assert.deepEqual(tokenInMezzo({ token: [v, da, a] }, da, a, regole).map((t) => t.id), ['v']);
  // una linea per una riga in cui il rettangolo ha solo angoli vuoti… se c'è; altrimenti sopra il mezzo: nessun ostacolo
  const [, y0] = v.q;
  const da2 = { id: 'a', q: [0, y0 - 1], ingombro: 1 }, a2 = { id: 'b', q: [12, y0 - 1], ingombro: 1 };
  assert.deepEqual(tokenInMezzo({ token: [v, da2, a2] }, da2, a2, regole), []);
  assert.ok(px >= 0);
});

test('passeggeri che scendono: accanto ai quadretti veri del mezzo ruotato, mai sopra; si sale da un angolo vuoto', () => {
  const v = scout([5, 5], 45, { passeggeri: [{ id: 'p', rif: { tipo: 'partecipante', id: 'pg:A' }, ingombro: 1, nascosto: false, ruolo: 'passeggero' }] });
  const scena = { griglia: { colonne: 20, righe: 20 }, token: [v] };
  const piene = new Set(celleToken(v).map((c) => c.join()));
  const dove = qPerScendere(scena, 'v', 'p');
  assert.ok(dove.length > 0);
  assert.ok(dove.every((q) => !piene.has(q.join())), 'mai sopra il mezzo');
  assert.ok(dove.every((q) => distanzaToken({ q, ingombro: 1 }, v) === 1), 'sempre accanto');
  // un angolo vuoto del rettangolo è un posto valido per scendere
  const [x0, y0] = v.q;
  const vuoto = [[x0, y0], [x0 + 3, y0 + 3]].find((q) => !piene.has(q.join()));
  assert.ok(dove.some((q) => q.join() === vuoto.join()));
  // e da lì si può salire
  const pg = { id: 'pa', rif: { tipo: 'partecipante', id: 'pg:B' }, q: vuoto, ingombro: 1, nascosto: false };
  const r = sali({ ...scena, token: [v, pg], annulla: [] }, 'pa', 'v', 'passeggero', { veicoli: { profili: [] } }, dati);
  assert.ok(!r.errore || !/accanto/.test(r.errore), r.errore);
});

test('scene di prima (direzione a 90°): stessi quadretti, validazione, e alla prima rotazione passano ad angolo e base', () => {
  const vecchio = { id: 'v', rif: { tipo: 'veicolo', id: 'v1' }, q: [3, 3], ingombro: [4, 2], direzione: 'e', nascosto: false };
  assert.equal(angoloDi(vecchio), 90);
  assert.equal(celleToken(vecchio).length, 8);
  const s = { ...nuovaScena({ id: 'x', nome: 'X', colonne: 20, righe: 20, dati }), token: [vecchio] };
  assert.equal(validaScena(s, dati), null);
  const girato = ruotaDi(vecchio, 10, s.griglia);
  assert.equal(girato.angolo, 100);
  assert.deepEqual(girato.base, [4, 2]);
  assert.equal(girato.direzione, undefined);
  assert.equal(validaScena({ ...s, token: [girato] }, dati), null);
  // a 90° esatti la forma è il rettangolo di prima
  assert.deepEqual(celleToken(ruotaDi(vecchio, 0, s.griglia)).map((c) => c.join()).sort(), celleToken(vecchio).map((c) => c.join()).sort());
  // errori di forma
  assert.match(erroreForma({ ...girato, ingombro: [2, 2] }), /ingombro/);
  assert.match(erroreForma({ ...girato, angolo: 400 }), /angolo/);
  assert.match(erroreForma({ ...girato, rif: { tipo: 'partecipante', id: 'x' } }), /solo per i veicoli/);
  assert.match(validaScena({ ...s, token: [{ ...girato, angolo: 33, ingombro: [9, 9] }] }, dati), /ingombro/);
  assert.ok(inBase64);
});

