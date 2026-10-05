// Tab Poteri (docs/layout-sd.md, pezzo 4): per tutti i personaggi; con la magia i dati della tab
// Magia di prima (PM, incantesimi, scala di Potere), senza un riquadro con la riga del manuale.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preparaTab } from '../src/stampa.js';
import { tabFissi, TAB_FISSI } from '../src/ui/tab.js';
import { validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE, ARCANISTA } from './personaggi.js';

const { dati } = await datiReali();
const poteri = (creazione) => tabFissi(preparaTab({ creazione, livelli: [] }, dati).tab).find((t) => t.id === 'poteri');

test('Poteri è fra gli otto tab per ogni personaggio', () => {
  assert.ok(TAB_FISSI.some((t) => t.id === 'poteri'));
  assert.ok(poteri(MISHIMA_AGENTE));
  assert.ok(poteri(ARCANISTA));
});

test('con la magia: i dati della Magia com’erano (incantesimi conosciuti, quota, scala di Potere)', () => {
  const t = poteri(ARCANISTA);
  assert.ok(t.dati);
  assert.equal(t.dati.conosciuti, ARCANISTA.incantesimi.length);
  assert.ok(t.dati.quota >= t.dati.conosciuti);
  assert.ok(t.dati.scala.length > 0);
  assert.ok(t.dati.macrofamiglie.some((m) => m.specializzazioni.some((s) => s.incantesimi.length)));
});

test('senza magia: nessun dato, e la riga del manuale per il riquadro «Nessun potere»', () => {
  assert.equal(poteri(MISHIMA_AGENTE).dati, null);
  assert.match(dati.regole.poteri.nessuno, /Addestramento Taumaturgo/);
  assert.match(dati.regole.poteri.nessuno, /Usufruitore di Magia/);
  // A.98 (E&L del 05/10/2026): nessuna sezione vuota per Rune e Tatuaggi, sviluppo futuro
  assert.deepEqual(dati.regole.poteri.in_arrivo, []);
});

test('validatore: testo di «Nessun potere» mancante, sezione in arrivo senza nota', () => {
  const d = copia(dati);
  d.regole.poteri.nessuno = '';
  d.regole.poteri.in_arrivo.push({ nome: 'Rune' });
  const e = validaDati(d).map((x) => `${x.chiave}: ${x.problema}`).join('\n');
  assert.match(e, /poteri\.nessuno: testo mancante/);
  assert.match(e, /poteri\.in_arrivo\[0\]: servono nome e nota/);
});

test('Veicoli (lotto 3): la tab non è più in attesa; senza veicoli il riquadro rimanda al §2.16.30', () => {
  const tab = tabFissi(preparaTab({ creazione: MISHIMA_AGENTE, livelli: [] }, dati).tab);
  assert.ok(tab.find((t) => t.id === 'veicoli'));
  assert.equal(dati.regole.tab_in_arrivo, undefined);
  assert.match(dati.veicoli.personaggio.nessun_veicolo, /§2\.16\.30/);
});
