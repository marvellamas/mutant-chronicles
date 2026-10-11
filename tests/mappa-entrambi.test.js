// «Cosa si vede», colonna «Entrambi» (prove di Marcello del 12/10/2026): un clic accende o spegne un livello sui due
// schermi insieme; se sono diversi lo stato è misto (src/mappa/sovrapposizioni.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { statoEntrambi, conLivelloEntrambi, conLivello, siVede } from '../src/mappa/sovrapposizioni.js';

const { dati } = await datiReali();
const scena = (extra = {}) => ({ ...nuovaScena({ id: 'chiesa', nome: 'Chiesa', colonne: 12, righe: 8, nebbia: 'scoperta', dati }), revisione: 1, ...extra });

test('«Cosa si vede», colonna «Entrambi»: acceso, spento o misto; un clic li porta insieme', () => {
  let s = scena();
  assert.equal(statoEntrambi(s, 'muri', dati), siVede(s, 'master', 'muri', dati) === siVede(s, 'giocatori', 'muri', dati) ? (siVede(s, 'master', 'muri', dati) ? 'acceso' : 'spento') : 'misto');
  s = conLivello(conLivello(s, 'master', 'muri', true, dati), 'giocatori', 'muri', false, dati);
  assert.equal(statoEntrambi(s, 'muri', dati), 'misto');
  // da misto: un clic li accende tutti e due; un altro li spegne tutti e due; un altro li riaccende
  s = conLivelloEntrambi(s, 'muri', dati);
  assert.deepEqual([statoEntrambi(s, 'muri', dati), siVede(s, 'master', 'muri', dati), siVede(s, 'giocatori', 'muri', dati)], ['acceso', true, true]);
  s = conLivelloEntrambi(s, 'muri', dati);
  assert.deepEqual([statoEntrambi(s, 'muri', dati), siVede(s, 'master', 'muri', dati), siVede(s, 'giocatori', 'muri', dati)], ['spento', false, false]);
  s = conLivelloEntrambi(s, 'muri', dati);
  assert.equal(statoEntrambi(s, 'muri', dati), 'acceso');
  // gli altri livelli non cambiano; «Io» e «Giocatori» restano indipendenti
  const prima = statoEntrambi(s, 'porte', dati);
  s = conLivello(s, 'giocatori', 'muri', false, dati);
  assert.deepEqual([statoEntrambi(s, 'muri', dati), statoEntrambi(s, 'porte', dati)], ['misto', prima]);
  assert.equal(validaScena(s, dati), null);
  assert.equal(conLivelloEntrambi(s, 'non-esiste', dati), s);
});

