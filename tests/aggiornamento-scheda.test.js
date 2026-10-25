// «Il master ha aggiornato la tua scheda» (25/10/2026, Test 4 di Davide): chi, su quale pagina, con quali modifiche in attesa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { testoAggiornamento, conflittoConCoda } from '../src/aggiornamento-scheda.js';

const dati = { regole: JSON.parse(readFileSync(new URL('../data/regole.json', import.meta.url), 'utf8')) };

test('sul tablet: scritto dal Direttore → «Il Direttore ha aggiornato la tua scheda», verde se niente in coda', () => {
  const r = testoAggiornamento({ chi: 'master', differenze: ['PV 18 → 19'] }, dati);
  assert.equal(r.tipo, 'ok');
  assert.match(r.testo, /^Il Direttore ha aggiornato la tua scheda: PV 18 → 19\.$/);
});

test('sulla pagina del Direttore: scritto da un tablet → non dice «il master»', () => {
  const r = testoAggiornamento({ chi: 'giocatore', perMaster: true }, dati);
  assert.match(r.testo, /^Un tablet ha aggiornato questa scheda\./);
  assert.doesNotMatch(r.testo, /master ha aggiornato la tua/i);
});

test('con modifiche offline in attesa il banner lo dice e non è più «ok»', () => {
  const r = testoAggiornamento({ chi: 'master', inCoda: 3 }, dati);
  assert.equal(r.tipo, 'attenzione');
  assert.match(r.testo, /3 modifiche fatte offline in attesa/);
  // la pagina del Direttore non ha una coda del giocatore
  assert.equal(testoAggiornamento({ chi: 'giocatore', perMaster: true, inCoda: 3 }, dati).tipo, 'ok');
});

test('autore sconosciuto: formula neutra', () => {
  assert.equal(testoAggiornamento({ chi: null }, dati).testo, 'La tua scheda è stata aggiornata.');
});

test('conflitto con la coda: due scelte vere, nessun «Tieni la mia»', () => {
  const c = conflittoConCoda({ conflitto: { nome: 'Aiko', chi: 'master', quando: new Date().toISOString() }, righe: [{ etichetta: 'PV 17 → 12' }, { id: 'x' }] }, dati);
  assert.match(c.messaggio, /«Aiko» è stata modificata da il Direttore/);
  assert.match(c.messaggio, /2 modifiche/);
  assert.deepEqual(c.righe, ['PV 17 → 12', 'x']);
  assert.equal(c.vedi, 'Vedi la scheda del Direttore');
  assert.match(c.scarta, /le mie 2 modifiche/);
});
