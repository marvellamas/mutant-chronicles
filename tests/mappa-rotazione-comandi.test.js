// 19/10 (rifiniture di A.167): chi si gira e come. Le sagome quadrate non hanno comandi di rotazione; le creature
// rettangolari ruotano solo a 45° (il passo fine è dei veicoli); il percorso mostra i quadretti veri della sagoma.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { rotazioneDi, passoGradi } from '../src/mappa/sagoma.js';
import { ruotaDi, formaDi } from '../src/mappa/forma.js';
import { disegnaPercorso } from '../src/ui/mappa/disegno-aree.js';

const { dati } = await datiReali();
const creatura = (ingombro, extra = {}) => ({ id: 'c', rif: { tipo: 'partecipante', id: 'nem:x:1' }, q: [5, 5], ingombro, ...extra });
const veicolo = { id: 'v', rif: { tipo: 'veicolo', id: 'v1' }, q: [5, 5], ingombro: [2, 4] };

test('sagome quadrate (1×1, 4×4, 6×6): nessun comando di rotazione', () => {
  for (const n of [1, 2, 3, 4, 6]) assert.equal(rotazioneDi(creatura(n)), null, `${n}×${n}`);
});

test('creature rettangolari: si girano, ma non col passo fine', () => {
  const madre = creatura([3, 10]);
  assert.deepEqual(rotazioneDi(madre), { fine: false });
  assert.equal(passoGradi(madre, false, dati), 45);
  assert.equal(passoGradi(madre, true, dati), 45, 'Maiusc non cambia nulla per le creature');
  // già girata a 45°: continua a ruotare
  const girata = creatura([3, 10], ruotaDi(creatura([3, 10]), 45, { colonne: 40, righe: 40 }));
  assert.deepEqual(rotazioneDi(girata), { fine: false });
});

test('veicoli: 45° e passo fine di 10°', () => {
  assert.deepEqual(rotazioneDi(veicolo), { fine: true });
  assert.equal(passoGradi(veicolo, false, dati), 45);
  assert.equal(passoGradi(veicolo, true, dati), 10);
});

test('segnaposto e pezzi senza riferimento: nessun comando', () => {
  assert.equal(rotazioneDi({ rif: { tipo: 'segnaposto' }, ingombro: [2, 3] }), null);
  assert.equal(rotazioneDi(null), null);
});

test('percorso: il filo passa per il centro vero e il fantasma sta sui quadretti della sagoma', () => {
  const g = { scosto_x: 0, scosto_y: 0, q_px: 10, colonne: 40, righe: 40 };
  const t = ruotaDi(creatura([3, 10]), 45, g);
  const fm = formaDi(t);
  const chiamate = { rett: [], punti: [] };
  const c = {
    save() {}, restore() {}, beginPath() {}, stroke() {}, setLineDash() {}, fillRect() {}, fillText() {}, strokeRect: (...a) => chiamate.rett.push(a),
    moveTo: (x, y) => chiamate.punti.push([x, y]), lineTo: (x, y) => chiamate.punti.push([x, y]), measureText: () => ({ width: 10 }),
  };
  const cam = { ox: 0, oy: 0, scala: 1 };
  disegnaPercorso(c, { scena: { griglia: g }, cam, percorso: [[5, 5], [8, 5]], ingombro: t.ingombro, forma: t, costo: 3, fascia: 'passo', colori: { passo: '#000', fondo: '#fff', testo: '#000' } });
  assert.equal(chiamate.rett.length, fm.celle.length, 'un contorno per quadretto vero');
  assert.ok(fm.celle.length < t.ingombro[0] * t.ingombro[1], 'meno del rettangolo che la contiene');
  assert.deepEqual(chiamate.punti[0], [(5 + fm.centro[0]) * 10, (5 + fm.centro[1]) * 10]);
  // senza forma: nessun fantasma
  chiamate.rett.length = 0;
  disegnaPercorso(c, { scena: { griglia: g }, cam, percorso: [[5, 5], [8, 5]], ingombro: 2, costo: null, fascia: 'passo', colori: { passo: '#000', fondo: '#fff', testo: '#000' } });
  assert.equal(chiamate.rett.length, 0);
});
