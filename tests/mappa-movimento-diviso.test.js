// Mappa di battaglia, lotto R6 (docs/diff-manuali-2026-10-07.md): movimento diviso solo al Passo, Corsa e Scatto in un
// blocco unico con i Q non usati persi (A.129, decisione 133); con il Passo cominciato Corsa e Scatto non si scelgono
// più (TODO(Davide) A.136, provvisorio).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali, copia } from './helpers.js';
import { statoFasce, fasciaDi } from '../src/mappa/area.js';
import { muoviToken, usatoNelRound, fasceNelRound, annullaUltimoMovimento } from '../src/mappa/annulla.js';
import { nuovaScena } from '../src/mappa/scena.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();
const REG = dati.mappa.movimento;
const MOV = { passo: 6, corsa: 12, scatto: 18 };

function scena() {
  const s = nuovaScena({ id: 'prova', nome: 'Prova', colonne: 30, righe: 20, dati });
  return { ...s, token: [{ id: 'a', rif: { tipo: 'segnaposto', id: 'x' }, nome: 'A', q: [1, 1], ingombro: 1, nascosto: false }] };
}
const muovi = (s, costo, fascia, extra = {}) => muoviToken(s, 'a', { a: [1 + costo, 1], costo, fascia, scontro: 'sc', round: 1, ...extra }, dati);
const stato = (s) => statoFasce(MOV, usatoNelRound(s, 'a', 'sc', 1), fasceNelRound(s, 'a', 'sc', 1), REG);

test('dati: solo il Passo si divide; il blocco dopo il Passo è il TODO A.136', () => {
  assert.deepEqual(REG.divisibili, ['passo']);
  assert.equal(REG.blocco_dopo_passo, false);
  assert.match(REG['TODO(Davide) blocco dopo il Passo'], /^A\.136/);
  assert.equal(REG.movimento_diviso, undefined);
  const d = copia(dati);
  d.mappa.movimento.divisibili = ['volo'];
  assert.ok(validaDati(d).some((e) => e.file === 'mappa.json' && e.chiave === 'movimento.divisibili'));
});

test('Passo diviso: 2 Q, poi 3 Q, poi 1 Q; Corsa e Scatto spariscono appena il Passo comincia', () => {
  let s = scena();
  assert.deepEqual(stato(s).rimaste, { passo: 6, corsa: 12, scatto: 18 }, 'da fermi tutte le fasce');
  s = muovi(s, 2, 'passo');
  let st = stato(s);
  assert.deepEqual(st.rimaste, { passo: 4, corsa: null, scatto: null });
  assert.deepEqual(st.escluse, ['corsa', 'scatto']);
  assert.equal(st.chiusa, null);
  assert.equal(fasciaDi(5, st.rimaste), null, 'oltre il Passo rimasto non si va');
  s = muovi(s, 3, 'passo');
  s = muovi(s, 1, 'passo');
  st = stato(s);
  assert.deepEqual(st.rimaste, { passo: 0, corsa: null, scatto: null });
  assert.equal(usatoNelRound(s, 'a', 'sc', 1), 6);
});

test('Corsa in un blocco unico: 8 Q e i 4 non usati sono persi; nessun altro movimento nel Round', () => {
  let s = muovi(scena(), 8, 'corsa');
  const st = stato(s);
  assert.equal(st.chiusa, 'corsa');
  assert.equal(st.persi, 4);
  assert.deepEqual(st.rimaste, { passo: 0, corsa: 0, scatto: 0 });
  assert.equal(fasciaDi(1, st.rimaste), null, 'nemmeno un Q di Passo dopo la Corsa');
  // nuovo Round: si riparte
  assert.deepEqual(statoFasce(MOV, usatoNelRound(s, 'a', 'sc', 2), fasceNelRound(s, 'a', 'sc', 2), REG).rimaste, MOV);
  // «Annulla ultimo movimento» toglie il blocco: le fasce tornano tutte
  s = annullaUltimoMovimento(s, 'a').scena;
  assert.deepEqual(stato(s).rimaste, MOV);
});

test('Scatto in un blocco unico: 15 Q, 3 persi; un movimento libero non apre né chiude nulla', () => {
  let s = muovi(scena(), 15, 'scatto');
  s = muoviToken(s, 'a', { a: [0, 0], costo: null, scontro: 'sc', round: 1, libero: true }, dati);
  const st = stato(s);
  assert.equal(st.chiusa, 'scatto');
  assert.equal(st.persi, 3);
  const solo = muoviToken(scena(), 'a', { a: [0, 0], costo: null, scontro: 'sc', round: 1, libero: true }, dati);
  assert.deepEqual(stato(solo).rimaste, MOV, 'il movimento libero non conta');
});

test('fascia decisa dal costo: da fermi 5 Q sono Passo (divisibile), 9 Q Corsa, 14 Q Scatto', () => {
  const r = statoFasce(MOV, 0, [], REG).rimaste;
  assert.equal(fasciaDi(5, r), 'passo');
  assert.equal(fasciaDi(9, r), 'corsa');
  assert.equal(fasciaDi(14, r), 'scatto');
});

test('con blocco_dopo_passo (risposta di A.136 diversa) il Passo cominciato si trasforma in Corsa', () => {
  const regole = { ...REG, blocco_dopo_passo: true };
  const st = statoFasce(MOV, 2, ['passo'], regole);
  assert.deepEqual(st.rimaste, { passo: 4, corsa: 10, scatto: 16 });
  assert.deepEqual(st.escluse, []);
  const dopo = statoFasce(MOV, 9, ['passo', 'corsa'], regole);
  assert.equal(dopo.chiusa, 'corsa');
  assert.equal(dopo.persi, 3);
});

test('senza scontro: contano i movimenti del turno', () => {
  let s = muoviToken(scena(), 'a', { a: [9, 1], costo: 8, fascia: 'corsa', scontro: null, round: null }, dati);
  assert.deepEqual(fasceNelRound(s, 'a', null, null), ['corsa']);
  assert.equal(statoFasce(MOV, usatoNelRound(s, 'a', null, null), fasceNelRound(s, 'a', null, null), REG).chiusa, 'corsa');
});
