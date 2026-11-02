// A.221 (Davide, 02/11/2026): conferma del comportamento già in uso. Con il Successo Magistrale ×1 → ×2, ×2 → ×3, ×3 resta ×3,
// e un moltiplicatore superiore a ×3 resta invariato (non si abbassa e non sale di uno). Il Magistrale vale solo per la prima
// istanza di danno; un danno tirato senza Prova (il Soffio risolto con le Salvezze) non ne produce uno. Nessun codice cambiato:
// questo test fissa ogni moltiplicatore, perché nessuno lo cambi per sbaglio.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applicaColpo, moltiplicatoreMagistrale, leggiDannoMoltiplicato } from '../src/danno.js';
import { tiroDelValore, esitoTiro } from '../src/tiri-scheda.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const bersaglio = () => ({ nome: 'Bersaglio', pv: { attuali: 500, massimo: 500 }, ferite: 0, ar: { totale: 0, magica: 0 } });
const colpo = (danni, extra = {}) => ({ danni, natura: 'Magico', tipo: 'ravvicinato', difesa: 'nessuna', proprieta: [], ...extra });

test('A.221: la progressione per ogni moltiplicatore', () => {
  const atteso = { 1: 2, 2: 3, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10 };
  for (const [m, x] of Object.entries(atteso)) assert.equal(moltiplicatoreMagistrale(Number(m), dati), x, `×${m}`);
});

test('A.221: un danno ×5 resta ×5 con il Magistrale; un ×2 diventa ×3', () => {
  const l = leggiDannoMoltiplicato('12d10 × 5');
  assert.equal(l.moltiplicatore, 5);
  const x5 = applicaColpo(bersaglio(), colpo([20], { moltiplicatore: 5, magistrale: true }), dati);
  assert.equal(x5.applicazioni[0].moltiplicatore, 5);
  assert.equal(x5.applicazioni[0].dopoMoltiplicatore, 100);
  const x2 = applicaColpo(bersaglio(), colpo([20], { moltiplicatore: 2, magistrale: true }), dati);
  assert.equal(x2.applicazioni[0].dopoMoltiplicatore, 60);
});

test('A.221: negli attacchi multipli solo la prima istanza', () => {
  const r = applicaColpo(bersaglio(), colpo([10, 10, 10], { moltiplicatore: 2, magistrale: true, tipo: 'distanza' }), dati);
  assert.deepEqual(r.applicazioni.map((a) => a.dopoMoltiplicatore), [30, 20, 20]);
});

test('A.221: il tiro del solo danno (Soffio) non ha esito né Magistrale', () => {
  const t = tiroDelValore({ genere: 'danno', nome: 'Soffio', formula: '12d10', moltiplicatore: 5 }, dati);
  assert.equal(t.modo, 'somma');
  const e = esitoTiro(t, 66, dati);
  assert.equal(e.totale, 330, 'i dadi ×5, sempre ×5');
  assert.equal(e.esito, null, 'nessun esito: senza Prova non c’è Magistrale');
});
