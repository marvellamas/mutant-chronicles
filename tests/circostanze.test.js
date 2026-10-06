// Bonus e malus di circostanza (primo playtest, 05/10/2026; Giocatore §1.4): src/circostanze.js e valori effettivi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { valoriTavolo } from '../src/condizioni.js';
import { inizializzaSessione, massimiSessione, modificaSessione } from '../src/sessione.js';
import { aggiungiCircostanza, variaCircostanza, commutaCategoria, togliCircostanza, TUTTO, testoCircostanze } from '../src/circostanze.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const R = dati.regole.circostanza;
const creazione = copia(MISHIMA_AGENTE);
const riposo = calcolaScheda({ creazione, livelli: [] }, dati);
const m = massimiSessione(riposo, creazione, dati);
const conCircostanze = (circostanze) => {
  const sessione = modificaSessione(inizializzaSessione(m), { circostanze }, m);
  return { s: calcolaScheda({ creazione, livelli: [], sessione }, dati), sessione };
};
const va = (s, nome) => s.abilita.find((a) => a.nome === nome).effettivo;

test('prima volta diversa da 0: si spuntano tutte le categorie; «Tutto» spunta o toglie tutte', () => {
  let l = aggiungiCircostanza([], R);
  assert.deepEqual(l[0].categorie, []);
  l = variaCircostanza(l, l[0].id, -1, R);
  assert.deepEqual(l[0].categorie, R.categorie.map((c) => c.id));
  l = commutaCategoria(l, l[0].id, TUTTO, R);
  assert.deepEqual(l[0].categorie, []);
  l = commutaCategoria(l, l[0].id, 'distanza', R);
  assert.deepEqual(l[0].categorie, ['distanza']);
  l = commutaCategoria(l, l[0].id, TUTTO, R);
  assert.equal(l[0].categorie.length, R.categorie.length);
  // limiti dai dati
  for (let i = 0; i < 20; i++) l = variaCircostanza(l, l[0].id, -1, R);
  assert.equal(l[0].valore, R.minimo);
  assert.deepEqual(togliCircostanza(l, l[0].id, R), []);
});

test('circostanza su una sola categoria: +2 a Distanza, il resto invariato, con la provenienza', () => {
  const { s } = conCircostanze([{ id: 'c1', valore: 2, categorie: ['distanza'] }]);
  assert.equal(va(s, 'Armi medie') - va(riposo, 'Armi medie'), 2);
  assert.equal(va(s, 'Corpo a corpo'), va(riposo, 'Corpo a corpo'));
  assert.equal(s.salvezze.tempra.effettivo, riposo.salvezze.tempra.effettivo);
  assert.ok(s.abilita.find((a) => a.nome === 'Armi medie').provenienza.righe.some((r) => r.fonte === 'Circostanza +2' && r.valore === 2));
  // il valore a riposo non cambia
  assert.equal(s.abilita.find((a) => a.nome === 'Armi medie').totale, riposo.abilita.find((a) => a.nome === 'Armi medie').totale);
});

test('più righe: −1 a tutto e +2 a Distanza si sommano; Derivate su Prove Salvezza e Iniziativa', () => {
  const { s, sessione } = conCircostanze([{ id: 'c1', valore: -1, categorie: R.categorie.map((c) => c.id), nota: 'nebbia' }, { id: 'c2', valore: 2, categorie: ['distanza'] }]);
  assert.equal(va(s, 'Armi medie') - va(riposo, 'Armi medie'), 1);
  assert.equal(va(s, 'Corpo a corpo') - va(riposo, 'Corpo a corpo'), -1);
  assert.equal(va(s, 'Potere') - va(riposo, 'Potere'), -1);
  assert.equal(va(s, 'Furtività') - va(riposo, 'Furtività'), -1);
  assert.equal(s.salvezze.tempra.effettivo - riposo.salvezze.tempra.effettivo, -1);
  const ini = valoriTavolo(s, sessione, dati).iniziativa;
  assert.equal(ini.effettivo - valoriTavolo(riposo, null, dati).iniziativa.effettivo, -1);
  assert.ok(ini.provenienza.righe.some((r) => r.fonte === 'Circostanza −1 (nebbia)'));
  assert.deepEqual(testoCircostanze(sessione, dati), ['Circostanza −1 a tutto (nebbia)', 'Circostanza +2 Distanza']);
});
