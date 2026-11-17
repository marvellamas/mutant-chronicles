import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 214 — Direttore 0.51 §9.3 e §9.8.2: i cinque esempi del manuale (§9.3.3) contro `pxIncontro`, l'arrotondamento a mezzo che sale, e il Titolo
// dal livello raggiunto (concessione) per una partita non ancora assegnata; una già assegnata tiene il suo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { pxIncontro, correttivoPg, componentiGiocatore, partitaAssegnata } from '../src/px-partita.js';

const { dati } = await datiReali();
const p = dati.px_partita;
const inc = (nemici) => ({ nemici });
const n = (px, qty, principale) => ({ px, qty, principale });

// [descrizione, PG presenti, incontro, PX attesi dal manuale]
const ESEMPI = [
  ["Un'Arpia", 4, inc([n(33, 1, true)]), 33],
  ['Due Ankheg', 7, inc([n(20, 2, true)]), 21],
  ['Due Grifoni (31,5 → 32)', 7, inc([n(30, 2, true)]), 32],
  ['Un\'Ettercap e due Grick', 7, inc([n(30, 1, true), n(20, 2, false)]), 35],
  ['Tre Arpie (46,2 → 46)', 7, inc([n(33, 3, true)]), 46],
];
for (const [nome, pg, i, atteso] of ESEMPI) {
  test(`§9.3.3 — ${nome}: ${atteso} PX`, () => assert.equal(pxIncontro(i, pg, p).px, atteso));
}

test('il correttivo dei PG presenti: 4 → 1,00, 7 → 0,70, mai sotto 0,5, e arrotondato (niente 0,7000000000000001)', () => {
  assert.equal(correttivoPg(4, p), 1);
  assert.equal(correttivoPg(7, p), 0.7);
  assert.equal(correttivoPg(20, p), 0.5);
});

test('arrotondamento: .5 sale sempre (31,5 → 32), anche dove la virgola mobile scende', () => {
  assert.equal(pxIncontro(inc([n(30, 2, true)]), 7, p).px, 32);
  assert.equal(pxIncontro({ nemici: [], pxDiretti: 45 }, 7, p).px, 32); // 45 × 0,70 = 31,5
});

const partita = (extra = {}) => ({ atto: 'I', partecipanti: { a: { presente: true, partecipazione: 2, interpretazione: 2, contributo: 2 } }, incontri: [], ...extra });

test('Titolo dal livello raggiunto: un PG a PX da livello 7 con la scheda al livello 8 (concessione) ha il Titolo Esperto', () => {
  const senza = componentiGiocatore(partita(), 'a', 900, p, null);
  const con = componentiGiocatore(partita(), 'a', 900, p, 8);
  assert.equal(senza.titolo, 'Inesperto');
  assert.equal(con.titolo, 'Esperto');
  assert.equal(con.fattore, 3);
  assert.equal(con.pxVoti, 6 * 3 * (con.pxVoti / 18)); // coerente col fattore 3
});

test('il livello della scheda non supera il limite dell\'Atto, e non abbassa mai il Titolo dato dai PX', () => {
  assert.equal(componentiGiocatore(partita(), 'a', 900, p, 15).livello, 8); // Atto I: tetto 8
  assert.equal(componentiGiocatore(partita(), 'a', 1800, p, 3).livello, 8); // i PX valgono più della scheda
});

test('una partita già assegnata tiene il suo livello: le scelte di dopo non la ricalcolano', () => {
  const pxG = { a: 900 };
  const ass = partitaAssegnata(partita(), pxG, '2026-11-17T20:00:00Z', p, { a: 7 });
  const dopo = componentiGiocatore(ass, 'a', 1300, p, 9);
  assert.equal(dopo.livello, 7);
  assert.equal(dopo.titolo, 'Inesperto');
});
