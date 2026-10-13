// A.153 (risposta di Davide del 10/10/2026): il −2 per attaccare a distanza un bersaglio A Terra si somma alla
// penalità della Copertura, perché postura e ostacolo sono modificatori distinti: −2, −4, −6. L'app faceva già così
// (comportamento provvisorio dichiarato); qui si verifica con i numeri della risposta e si toglie il TODO.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { calcolaAttaccoDistanza } from '../src/attacco.js';

const { dati } = await datiReali();
const arma = { uid: 'f', rif: 'armi_distanza:pistola-semiautomatica', nome: 'Pistola', tipo: 'arma_distanza', abilita: 'Armi leggere',
  va: 12, vaEffettivo: 12, scomposizione: [{ etichetta: 'VA Armi leggere', valore: 12, fonte: 'regole' }],
  danno: { una_mano: '1d6', due_mani: null }, mani: 1, ac: 1, gittataQ: 30, modalita: ['S'], mirino: null, accessori: [] };
const pg = { scheda: { talentiLiberi: [], classi: [{ talenti: [] }], azioni: { principali: 1 } }, sessione: { munizioni: { f: { colpi: 30, riserve: 0 } } } };
const va = (bersaglio) => calcolaAttaccoDistanza(pg, arma, { modalita: 'S', distanza: 5, bersaglio }, dati).va_finale;

test('A Terra e Copertura si sommano: −2, −4, −6 (esempi della risposta)', () => {
  const base = va({ movimento: 'fermo', copertura: 'nessuna' });
  assert.equal(va({ movimento: 'fermo', copertura: 'nessuna', aTerra: true }), base - 2, 'A Terra senza Copertura');
  assert.equal(va({ movimento: 'fermo', copertura: 'leggera', aTerra: true }), base - 4, 'A Terra con Copertura Leggera');
  assert.equal(va({ movimento: 'fermo', copertura: 'media', aTerra: true }), base - 6, 'A Terra con Copertura Media');
  // le due penalità restano righe distinte nella provenienza
  const r = calcolaAttaccoDistanza(pg, arma, { modalita: 'S', distanza: 5, bersaglio: { movimento: 'fermo', copertura: 'media', aTerra: true } }, dati);
  const righe = r.provenienza.righe.filter((x) => /A Terra|Copertura/.test(x.fonte));
  assert.equal(righe.length, 2, 'postura e ostacolo sono modificatori distinti');
  assert.deepEqual(righe.map((x) => x.valore).sort((a, b) => a - b), [-4, -2]);
});

test('la Copertura Totale impedisce il tiro diretto anche se il bersaglio è A Terra', () => {
  const r = calcolaAttaccoDistanza(pg, arma, { modalita: 'S', distanza: 5, bersaglio: { movimento: 'fermo', copertura: 'totale', aTerra: true } }, dati);
  assert.ok(r.impossibile, 'come dice la risposta: valgono le normali regole');
  assert.match(r.impossibile.motivo, /Copertura Totale/);
});

test('il valore e la decisione stanno nei dati, senza più TODO', () => {
  const t = dati.regole.attacco_distanza.a_terra;
  assert.equal(t.bersaglio, -2);
  assert.equal(t.con_copertura, 'somma');
  assert.equal(t['TODO(Davide)'], undefined);
  assert.match(t.decisione, /A\.153/);
  assert.match(t.paragrafo, /A\.153/);
});
