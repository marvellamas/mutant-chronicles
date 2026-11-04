// Lotto 172, A.222 (Davide, 03/11/2026): nel manuale le dimensioni corporee si leggono lunghezza × larghezza, nei campi
// dell'app larghezza × lunghezza. Giovane: 6 × 4 Q Base nel manuale → 4 × 6 nell'app; adulto: 14 × 10 → 10 × 14. Restano le
// pedine in Q Tattici (giovane 1 × 1, adulto 2 × 1); ingombro corporeo e portata dei filamenti restano distinti.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { ingombroCreatura } from '../src/mappa/token.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const leggi = (id) => JSON.parse(readFileSync(new URL(`../esempi/nemici/mostri/${id}.json`, import.meta.url), 'utf8'));
const giovane = leggi('dragomedusa-giovane');
const adulto = leggi('dragomedusa-adulto');

test('le misure del Dragomedusa: giovane 4 × 6 e adulto 10 × 14 Q Base nei campi; pedine 1 × 1 e 2 × 1 in Q Tattici', () => {
  assert.deepEqual([giovane.spazio, giovane.pedina_tattica], ['4 × 6 Q', '1 Q']);
  assert.deepEqual([adulto.spazio, adulto.pedina_tattica], ['10 × 14 Q', '2 × 1 Q']);
  assert.deepEqual(ingombroCreatura(giovane, dati, 'base'), [4, 6], 'larghezza 4, lunghezza 6');
  assert.deepEqual(ingombroCreatura(adulto, dati, 'base'), [10, 14]);
  assert.equal(ingombroCreatura(giovane, dati, 'tattica'), 1);
  assert.deepEqual(ingombroCreatura(adulto, dati, 'tattica'), [2, 1]);
  for (const n of [giovane, adulto]) assert.deepEqual(validaNemico(n, dati), [], n.id);
});

test('ingombro corporeo e portata dei filamenti restano distinti: la sagoma più grande non allunga gli attacchi', () => {
  // la portata degli attacchi resta quella del profilo, non la misura del corpo
  assert.deepEqual(giovane.attacchi.map((a) => a.portata_q), [1, 2]);
  assert.deepEqual(adulto.attacchi.map((a) => a.portata_q), [2, 3]);
  const cattura = (n) => n.capacita.find((c) => c.nome === 'Cattura con filamenti').effetto;
  assert.match(cattura(giovane), /Portata dal bordo del corpo 2 Q Tattici \(30 m\)/);
  assert.match(cattura(adulto), /Portata dal bordo del corpo 4 Q Tattici \(60 m\)/);
  const dim = (n) => n.capacita.find((c) => c.nome === 'Dimensioni e scale').effetto;
  assert.match(dim(giovane), /6 × 4 Q Base \(lunghezza × larghezza, 9 × 6 m; nei campi dell’app 4 × 6, A\.222\)/);
  assert.match(dim(adulto), /14 × 10 Q Base \(lunghezza × larghezza; nei campi dell’app 10 × 14, A\.222\)/);
});
