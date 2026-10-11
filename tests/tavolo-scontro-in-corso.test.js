// Tavolo del Master (segnalazione di Marcello del 12/10/2026): lo scontro in corso in cima, con «Apri la mappa e continua
// lo scontro»; più scontri aperti; scontro senza scena collegata (src/mappa/stato-scene.js → scontriInCorso).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { nuovaScena, collegaAScontro } from '../src/mappa/scena.js';
import { scontriInCorso } from '../src/mappa/stato-scene.js';

const { dati } = await datiReali();
const scena = (extra = {}) => ({ ...nuovaScena({ id: 'chiesa', nome: 'Chiesa', colonne: 12, righe: 8, nebbia: 'scoperta', dati }), revisione: 1, ...extra });

test('scontro aperto in cima con la sua scena: «Apri la mappa e continua lo scontro»', () => {
  const scontri = [{ id: 's1', nome: 'Agguato', stato: 'aperto', round: 3 }, { id: 'b1', nome: 'Bozza', stato: 'bozza' }, { id: 's0', nome: 'Vecchio', stato: 'chiuso', round: 9 }];
  const scene = [{ id: 'cripta', nome: 'Cripta', collegamento: { scontro: 's1', bozza: null }, mtime: 10 }, { id: 'altra', nome: 'Altra', collegamento: { scontro: 's0', bozza: null }, mtime: 99 }];
  assert.deepEqual(scontriInCorso(scontri, scene), [{ id: 's1', nome: 'Agguato', round: 3, scena: { id: 'cripta', nome: 'Cripta' }, altreScene: 0 }]);
  // nessuno scontro aperto: niente in cima
  assert.deepEqual(scontriInCorso(scontri.filter((x) => x.stato !== 'aperto'), scene), []);
  assert.deepEqual(scontriInCorso(null, null), []);
});

test('più scontri aperti: tutti in cima, ognuno con la sua scena (la più recente se sono più d’una)', () => {
  const scontri = [{ id: 's1', nome: 'Agguato', stato: 'aperto', round: 3 }, { id: 's2', nome: 'Assedio', stato: 'aperto', round: 1 }];
  const scene = [
    { id: 'cripta', nome: 'Cripta', collegamento: { scontro: 's1', bozza: null }, mtime: 10 },
    { id: 'cripta-2', nome: 'Cripta, piano di sotto', collegamento: { scontro: 's1', bozza: null }, mtime: 20 },
    { id: 'mura', nome: 'Mura', collegamento: { scontro: 's2', bozza: null }, mtime: 5 },
  ];
  assert.deepEqual(scontriInCorso(scontri, scene).map((x) => [x.id, x.scena.id, x.altreScene]), [['s1', 'cripta-2', 1], ['s2', 'mura', 0]]);
});

test('scontro senza scena collegata: nessuna mappa da aprire, si propone di collegarne una', () => {
  const lista = scontriInCorso([{ id: 's1', nome: 'Agguato', stato: 'aperto', round: 2 }], [{ id: 'cripta', nome: 'Cripta', collegamento: { scontro: null, bozza: 'b1' }, mtime: 1 }]);
  assert.deepEqual(lista, [{ id: 's1', nome: 'Agguato', round: 2, scena: null, altreScene: 0 }]);
  // collegata la scena, lo scontro ha la sua mappa
  const collegata = collegaAScontro(scena(), 's1');
  assert.deepEqual(collegata.collegamento, { scontro: 's1', bozza: null });
  assert.equal(scontriInCorso([{ id: 's1', nome: 'Agguato', stato: 'aperto', round: 2 }], [{ id: collegata.id, nome: collegata.nome, collegamento: collegata.collegamento, mtime: 2 }])[0].scena.id, 'chiesa');
});
