// Stato dello scontro accanto a ogni scena dell'elenco delle mappe (09/10, src/mappa/stato-scene.js): «In corso»,
// «Scontro terminato», «Bozza» o niente; prima le scene in corso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statoScontroScena, sceneConStato, ETICHETTE_SCENA } from '../src/mappa/stato-scene.js';

const scontri = [
  { id: 'scontro-a', stato: 'aperto' },
  { id: 'scontro-b', stato: 'chiuso' },
  { id: 'bozza-c', stato: 'bozza' },
];

test('stato di una scena: in corso, terminato, bozza, niente', () => {
  assert.equal(statoScontroScena({ scontro: 'scontro-a' }, scontri), 'in-corso');
  assert.equal(statoScontroScena({ scontro: 'scontro-b' }, scontri), 'terminato');
  assert.equal(statoScontroScena({ scontro: 'scontro-archiviato' }, scontri), 'terminato', 'passato in archivio: non è più in elenco');
  assert.equal(statoScontroScena({ scontro: null, bozza: 'bozza-c' }, scontri), 'bozza');
  assert.equal(statoScontroScena({ scontro: null, bozza: 'bozza-sparita' }, scontri), null, 'bozza eliminata: niente');
  assert.equal(statoScontroScena(null, scontri), null);
  assert.equal(statoScontroScena({ scontro: null, bozza: null }, scontri), null);
  // lo scontro aperto dalla plancia vale più dell'elenco (che può essere vecchio)
  assert.equal(statoScontroScena({ scontro: 'scontro-a' }, scontri, null), 'terminato', 'chiuso dopo l’ultima lettura');
  assert.equal(statoScontroScena({ scontro: 'scontro-b' }, scontri, 'scontro-b'), 'in-corso');
  assert.deepEqual(Object.keys(ETICHETTE_SCENA), ['in-corso', 'terminato', 'bozza']);
  assert.equal(ETICHETTE_SCENA.terminato.testo, 'Scontro terminato');
});

test('ordine: prima le scene «In corso», poi le altre nell’ordine di prima', () => {
  const elenco = [
    { id: 'uno', collegamento: null },
    { id: 'due', collegamento: { scontro: 'scontro-b' } },
    { id: 'tre', collegamento: { scontro: 'scontro-a' } },
    { id: 'quattro', collegamento: { bozza: 'bozza-c' } },
  ];
  const r = sceneConStato(elenco, scontri);
  assert.deepEqual(r.map((v) => [v.id, v.statoScontro]), [['tre', 'in-corso'], ['uno', null], ['due', 'terminato'], ['quattro', 'bozza']]);
  assert.deepEqual(sceneConStato(null, scontri), []);
});
