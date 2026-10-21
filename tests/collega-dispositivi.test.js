// «Tablet e personaggi scelti» (21/10/2026, «le code dell'originale», parte B): dentro «Collega i giocatori»,
// non una tab nuova. Comprensibile senza sapere cos'è un identificativo: un dispositivo che non ha ancora
// scelto si legge «tablet non ancora assegnato», mai un codice. Con il DOM finto (tests/dom-finto.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installaDomFinto } from './dom-finto.js';

installaDomFinto();
globalThis.fetch ??= async () => ({ ok: false, json: async () => ({}) }); // riassegna()/stacca() non si chiamano in questi test
const { riquadroCollega } = await import('../src/ui/collega.js');

const RETE = { indirizzi: [{ url: 'http://192.168.1.10:3000', nome: 'Wi-Fi' }], altri: [], tuttiPerDubbio: false, soloLocale: false, porta: 3000 };
const SCHEDE = [{ file: 'Aiko_liv4_2026-10-20.json', nome: 'Aiko', livello: 4, pg: 'pg-aiko' }];

function monta(dispositivi) {
  const el = riquadroCollega(RETE, { aperto: true, onToggle: () => {}, dispositivi: dispositivi === undefined ? null : { elenco: dispositivi, schede: SCHEDE, ridisegna: () => {} } });
  return el;
}

test('senza l’elenco dei dispositivi (non master, o non ancora arrivato): niente riquadro in più', () => {
  const el = monta(undefined);
  assert.ok(!el.textContent.includes('Tablet e personaggi scelti'));
});

test('elenco vuoto: lo dice chiaramente, non un tecnicismo', () => {
  const el = monta([]);
  assert.ok(el.textContent.includes('Tablet e personaggi scelti'));
  assert.ok(el.textContent.includes('Nessun tablet si è ancora collegato'));
});

test('un dispositivo senza personaggio si legge «tablet non ancora assegnato», mai un codice', () => {
  const el = monta([{ id: 'd-abc123def456', pgId: null, pgNome: null, aggiornato: new Date().toISOString() }]);
  const testo = el.textContent;
  assert.ok(testo.includes('tablet non ancora assegnato'));
  assert.ok(!testo.includes('d-abc123def456'), 'l’identificativo del dispositivo non deve comparire nel testo');
});

test('un dispositivo con personaggio mostra il nome e da quanto tempo si è fatto vivo', () => {
  const tre_minuti_fa = new Date(Date.now() - 3 * 60_000).toISOString();
  const el = monta([{ id: 'd-abc123def456', pgId: 'pg-aiko', pgNome: 'Aiko', aggiornato: tre_minuti_fa }]);
  const testo = el.textContent;
  assert.ok(testo.includes('Aiko'));
  assert.ok(testo.includes('si è fatto vivo 3 minuti fa'));
});

test('la tendina di riassegnazione elenca i personaggi attuali, con quello giusto selezionato', () => {
  const el = monta([{ id: 'd-abc123def456', pgId: 'pg-aiko', pgNome: 'Aiko', aggiornato: new Date().toISOString() }]);
  const select = el.tutti().find((n) => n.tagName === 'SELECT');
  assert.ok(select, 'manca la tendina');
  const opzioni = select.tutti().filter((n) => n.tagName === 'OPTION');
  assert.ok(opzioni.some((o) => o.testo === 'Aiko' && o.selected === true));
});

test('«Stacca» è un pulsante, sempre presente', () => {
  const el = monta([{ id: 'd-abc123def456', pgId: 'pg-aiko', pgNome: 'Aiko', aggiornato: new Date().toISOString() }]);
  const bottoni = el.tutti().filter((n) => n.tagName === 'BUTTON').map((b) => b.textContent);
  assert.ok(bottoni.includes('Stacca'));
});
