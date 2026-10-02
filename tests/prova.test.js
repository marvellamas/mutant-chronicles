// Esito di una Prova con il d20 (src/prova.js → esitoProva; regole.json → prova e magistrale_naturale;
// Giocatore §1.6 «Risultati naturali», §1.7 «Successi automatici e azioni impossibili»).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esitoProva } from '../src/prova.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();

test('§1.6: 1 naturale Magistrale, 20 naturale Maldestro, il resto contro il VA', () => {
  assert.equal(esitoProva(13, 1, dati).esito, 'magistrale');
  assert.equal(esitoProva(13, 20, dati).esito, 'maldestro');
  assert.equal(esitoProva(13, 13, dati).esito, 'successo');
  assert.equal(esitoProva(13, 14, dati).esito, 'fallimento');
  assert.equal(esitoProva(13, 2, dati).esito, 'successo');
  assert.equal(esitoProva(10, null, dati).esito, 'da_tirare');
});

test('§1.7: successo automatico da 20, impossibile fino a 0', () => {
  assert.deepEqual([esitoProva(20, null, dati).esito, esitoProva(20, null, dati).riuscita], ['automatico', true]);
  assert.deepEqual([esitoProva(0, 5, dati).esito, esitoProva(0, 5, dati).riuscita], ['impossibile', false]);
  assert.equal(esitoProva(-3, null, dati, { obbligatoria: true }).esito, 'impossibile');
});

test('§1.6, §1.7.1: il 2 Magistrale con VA almeno 21 vale solo dove si tira comunque', () => {
  const soglia = dati.regole.magistrale_naturale.soglia_va;
  assert.equal(esitoProva(soglia, 2, dati).esito, 'automatico');
  assert.equal(esitoProva(soglia, 2, dati, { obbligatoria: true }).esito, 'magistrale');
  assert.equal(esitoProva(soglia - 1, 2, dati, { obbligatoria: true }).esito, 'successo');
  assert.equal(esitoProva(soglia, 2, dati, { obbligatoria: true, abilita: false }).esito, 'successo');
  assert.equal(esitoProva(25, 20, dati, { obbligatoria: true }).esito, 'maldestro');
});
