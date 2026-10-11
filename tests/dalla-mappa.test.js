// Condizioni di «Attacca!» dalla mappa (S22, deciso da Marcello e Davide): di base si mettono a mano; arrivano dalla
// mappa solo con «Mappa semplice» spenta, con il segno «dalla mappa», e si tolgono con un tocco (src/dalla-mappa.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conLineaDallaMappa, conMovimentoDallaMappa, vociDallaMappa, togliDallaMappa, segniDopoModifica } from '../src/dalla-mappa.js';
import { dichiarazioneDistanza } from '../src/attacco.js';

test('«Attacca!» (S22): i valori dalla mappa portano il segno «dalla mappa» e si tolgono con un tocco', () => {
  // senza dati dalla mappa: nessun segno, valori a mano
  assert.deepEqual(vociDallaMappa({ movimento: 'corsa', bersaglio: { copertura: 'media' } }), []);
  // dalla linea di tiro (scena con «Mappa semplice» spenta)
  let s = conLineaDallaMappa({ bersaglio: { aTerra: true } }, { distanza: 8, copertura: 'media', protetto: false, interposta: true, luceMappa: 'Penombra (−2)' });
  assert.deepEqual(vociDallaMappa(s).map((v) => v.campo), ['distanza', 'copertura', 'interposta', 'luce']);
  assert.deepEqual([s.distanza, s.bersaglio.copertura, s.bersaglio.interposta, s.bersaglio.aTerra, s.luceMappa], [8, 'media', true, true, 'Penombra (−2)']);
  // dal movimento del Round
  s = conMovimentoDallaMappa(s, 'scatto', 'Scatto');
  assert.deepEqual([s.movimento, s.dallaMappa.movimento], ['scatto', 'movimento: Scatto']);
  // un tocco toglie il valore: torna quello a mano di partenza, gli altri restano
  s = togliDallaMappa(s, 'copertura');
  assert.deepEqual([s.bersaglio.copertura, 'copertura' in s.dallaMappa, s.bersaglio.interposta, s.bersaglio.aTerra], ['nessuna', false, true, true]);
  s = togliDallaMappa(togliDallaMappa(togliDallaMappa(s, 'movimento'), 'luce'), 'interposta');
  assert.deepEqual([s.movimento, s.luceMappa, s.bersaglio.interposta, vociDallaMappa(s).map((v) => v.campo)], ['fermo', undefined, false, ['distanza']]);
  s = togliDallaMappa(s, 'distanza');
  assert.deepEqual(['dallaMappa' in s, 'distanza' in s], [false, false]);
  assert.equal(dichiarazioneDistanza(s).bersaglio.copertura, 'nessuna');
  // cambiando un campo a mano, quel campo non è più «dalla mappa»
  const m = conLineaDallaMappa({}, { distanza: 8, copertura: 'media' });
  assert.deepEqual(Object.keys(segniDopoModifica(m, { bersaglio: { copertura: 'leggera' } })), ['distanza']);
  assert.deepEqual(Object.keys(segniDopoModifica(m, { evasivo: true })), ['distanza', 'copertura']);
  assert.equal(togliDallaMappa(m, 'luce'), m, 'un campo non arrivato dalla mappa non si tocca');
});
