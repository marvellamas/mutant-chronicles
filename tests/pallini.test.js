import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gruppiPallini, testoLivelloBase } from '../src/incantesimi.js';
import { datiReali } from './helpers.js';

// Pallini del livello base degli incantesimi (Magia sez. 1: livello = costo in PM)
const { dati } = await datiReali();

test('pallini a gruppi di tre, quanti il livello base', () => {
  assert.deepEqual(gruppiPallini(1), [1]);
  assert.deepEqual(gruppiPallini(3), [3]);
  assert.deepEqual(gruppiPallini(6), [3, 3]);
  assert.deepEqual(gruppiPallini(9), [3, 3, 3]);
  assert.deepEqual(gruppiPallini(7), [3, 3, 1]);
  assert.deepEqual(gruppiPallini(0), []);
  assert.deepEqual(gruppiPallini('3'), []);
  assert.equal(testoLivelloBase(6), 'Livello base 6: costa almeno 6 PM');
});

test('dai dati: ogni incantesimo ha tanti pallini quanto il suo livello base (1, 3, 6 o 9)', () => {
  const livelli = new Set(dati.incantesimi.incantesimi.map((i) => i.livello_base));
  assert.deepEqual([...livelli].sort((a, b) => a - b), [1, 3, 6, 9]);
  for (const i of dati.incantesimi.incantesimi) assert.equal(gruppiPallini(i.livello_base).reduce((s, n) => s + n, 0), i.livello_base, i.nome);
});
