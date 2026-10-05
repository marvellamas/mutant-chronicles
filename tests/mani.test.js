// A.60 (E&L del 05/10/2026): mani registrate sulla voce (src/equipaggiamento.js → assegnaMani, campo «mano»).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assegnaMani, normalizzaEquipaggiamento } from '../src/equipaggiamento.js';

const o = (uid, mani = 1, mano = null) => ({ uid, mani, mano });
const manoDi = (x) => x.mano;

test('senza mano registrata vale l’ordine dell’Inventario: destra, poi sinistra, poi oltre', () => {
  const { slot, oltre } = assegnaMani([o('a'), o('b'), o('c')], manoDi);
  assert.deepEqual([slot.destra.uid, slot.sinistra.uid, oltre.map((x) => x.uid)], ['a', 'b', ['c']]);
});

test('la mano registrata prevale sull’ordine; lo scudo occupa la sua mano', () => {
  const { slot } = assegnaMani([o('spada', 1, 'sinistra'), o('scudo', 1, 'destra')], manoDi);
  assert.equal(slot.destra.uid, 'scudo');
  assert.equal(slot.sinistra.uid, 'spada');
  // una sola registrata: l'altra riempie la mano libera
  const r = assegnaMani([o('a'), o('b', 1, 'destra')], manoDi);
  assert.deepEqual([r.slot.destra.uid, r.slot.sinistra.uid], ['b', 'a']);
});

test('un’arma a due mani occupa «Due mani», il resto va oltre', () => {
  const { slot, oltre } = assegnaMani([o('pistola'), o('fucile', 2)], manoDi);
  assert.equal(slot.due.uid, 'fucile');
  assert.deepEqual(oltre.map((x) => x.uid), ['pistola']);
});

test('il campo «mano» si conserva solo con destra o sinistra', () => {
  const [a, b] = normalizzaEquipaggiamento([{ uid: 'x', rif: 'r', mano: 'sinistra' }, { uid: 'y', rif: 'r', mano: 'piede' }]);
  assert.equal(a.mano, 'sinistra');
  assert.equal('mano' in b, false);
});
