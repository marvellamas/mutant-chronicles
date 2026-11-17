import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 214, parte C — **i 600 crediti del FIAT LUX.** Il lotto 181 scrisse «126.510 + 62.600 = 189.110 cr»; il registro di Davide (istantanea del 14/11) dà
// 126.510 + 62.000 = 188.510. Non era sbagliato il numero del 181 e non si è spostato niente nel conto: **cambia il record**. Il 181 provava il conto su un
// FIAT LUX con tutti e sei i copriruote di Petra (4 montati e 2 di ricambio, 150 cr l'uno = 900 cr); il record vero ne ha 2 (montati 3, 3, 0, 0, nessun
// ricambio: due distrutti e i ricambi non ci sono più) = 300 cr. La differenza, 600, è **tutta** una voce: «Copriruote di Petra», 4 pezzi × 150 cr.
//
// Un test che conosce solo il totale non distingue un errore da un altro: qui si tengono fermi **i tre numeri** (modello base, dotazione extra, totale) per i
// due casi, **e** la voce responsabile, e che ogni altra voce sia uguale da un caso all'altro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { normalizzaRecord } from '../src/veicoli-registro.js';
import { valoreEsemplare } from '../src/valore-veicolo.js';

const { dati } = await datiReali();
const profilo = dati.veicoli.profili.find((p) => p.id === 'asa-scout-mk4');
const record = JSON.parse(readFileSync(new URL('./fixtures/veicoli-record-213/veimvozx57q0.json', import.meta.url), 'utf8')); // FIAT LUX, istantanea del 14/11/2026
const conCopriruote = (montati, ricambi) => normalizzaRecord({ ...record, mezzo: { ...record.mezzo, rinforzi: { 'copriruote-petra': { montati, ricambi } } } }, dati).mezzo;

const COMPLETO = conCopriruote([3, 3, 3, 3], [3, 3]); // il FIAT LUX del lotto 181
const VERO = normalizzaRecord(record, dati).mezzo; // il record del registro, com'è

const tre = (m) => { const v = valoreEsemplare(m, profilo, dati); return { base: v.base.cr, extra: v.extra.cr, totale: v.totale.cr, v }; };
const voce = (v, id) => v.extra.righe.find((r) => r.id === id);

test('I TRE NUMERI, col FIAT LUX completo del lotto 181: 126.510 + 62.600 = 189.110', () => {
  const x = tre(COMPLETO);
  assert.deepEqual([x.base, x.extra, x.totale], [126510, 62600, 189110]);
  assert.equal(x.base + x.extra, x.totale, 'il totale è la somma delle altre due');
});

test('I TRE NUMERI, col record vero del 14/11: 126.510 + 62.000 = 188.510', () => {
  const x = tre(VERO);
  assert.deepEqual([x.base, x.extra, x.totale], [126510, 62000, 188510]);
  assert.equal(x.base + x.extra, x.totale);
});

test('LA VOCE RESPONSABILE: i 600 crediti sono i quattro copriruote di Petra che nel record non ci sono più, e niente altro', () => {
  const a = tre(COMPLETO).v, b = tre(VERO).v;
  assert.equal(a.extra.cr - b.extra.cr, 600);
  assert.equal(voce(a, 'copriruote-petra').quantita, 6); assert.equal(voce(a, 'copriruote-petra').cr, 900);
  assert.equal(voce(b, 'copriruote-petra').quantita, 2); assert.equal(voce(b, 'copriruote-petra').cr, 300);
  assert.equal(voce(a, 'copriruote-petra').crUnitario, 150);
  // ogni altra voce è identica fra i due casi: un errore nel conto non può nascondersi dietro la differenza dei copriruote
  const altre = (v) => v.extra.righe.filter((r) => r.id !== 'copriruote-petra').map((r) => [r.id, r.quantita, r.crUnitario, r.cr]);
  assert.deepEqual(altre(a), altre(b));
  assert.deepEqual(altre(b).map((x) => x[0]), ['kit-trauma', 'pistola-sanitaria', 'cartucce-naniti', 'colpi-m606', 'mec-rosso-ricambio', 'cec-verde-ricambio']);
});

test('…e il controllo SA fallire: un prezzo unitario ritoccato, o un pezzo contato due volte, cambia i tre numeri e la voce', () => {
  const sporco = structuredClone(dati);
  sporco.veicoli.profili.find((p) => p.id === 'asa-scout-mk4').dotazione_precedente.voci.find((v) => v.id === 'copriruote-petra').cr_unitario = 200;
  const v = valoreEsemplare(VERO, sporco.veicoli.profili.find((p) => p.id === 'asa-scout-mk4'), sporco);
  assert.notEqual(v.extra.cr, 62000, 'un prezzo unitario diverso deve cambiare la dotazione extra');
});

test('un copriruote distrutto «esce dal conto» e uno rimontato ci rientra, 150 cr alla volta', () => {
  const sei = tre(COMPLETO).extra, cinque = tre(conCopriruote([3, 3, 3, 0], [3, 3])).extra, due = tre(VERO).extra;
  assert.equal(sei - cinque, 150);
  assert.equal(cinque - due, 450);
});
