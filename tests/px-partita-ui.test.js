// Funzioni pure della tab «PX della partita» (A.161): costruttori delle partite/incontri, import dei nemici
// dagli scontri, patch del PG per l'assegnazione. Il pannello (DOM) si prova nel browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { nuovaPartita, nuovoIncontro, nemiciDaScontro, patchPgAssegnazione, dbIniziale } from '../src/ui/px-partita.js';

const { dati } = await datiReali();

test('dbIniziale: impostazioni di campagna di default dai dati', () => {
  const db = dbIniziale(dati);
  assert.deepEqual(db.impostazioni, { baseline: dati.px_partita.campagna.baseline_px_default, atto: dati.px_partita.campagna.atto_default });
  assert.deepEqual([db.giocatori, db.partite], [[], []]);
});

test('nuovaPartita: tutti presenti, le tre categorie di voto partono a 3 (voti.default), bozza', () => {
  const m = nuovaPartita(dati, [{ id: 'a', pg: 'A' }, { id: 'b', pg: 'B' }]);
  assert.deepEqual(Object.keys(m.partecipanti), ['a', 'b']);
  assert.equal(m.partecipanti.a.presente, true);
  assert.equal(dati.px_partita.voti.default, 3, 'il voto di partenza sta nei dati');
  for (const g of ['a', 'b']) {
    assert.equal(m.partecipanti[g].partecipazione, 3);
    assert.equal(m.partecipanti[g].interpretazione, 3);
    assert.equal(m.partecipanti[g].contributo, 3);
    assert.equal(m.partecipanti[g].eccezionale, 0);
  }
  assert.equal(m.statoAssegnazione, 'bozza');
  assert.equal(m.durata, 1);
  assert.deepEqual(m.incontri, []);
});

test('nuovoIncontro: ha un id, nome ed esito; nemici vuoti', () => {
  const inc = nuovoIncontro();
  assert.ok(inc.id && inc.nome && inc.esito);
  assert.deepEqual(inc.nemici, []);
});

test('nemiciDaScontro: px dal GS/PX della scheda, un principale (il px più alto) proposto', () => {
  const nem = nemiciDaScontro({ nome: 'Scontro', nemici: [
    { nome: 'Capo', gs_px: { px: 70, gs: 'Eroe' }, quanti: 1 },
    { nome: 'Gregario', gs_px: { px: 20 }, quanti: 3 },
  ] });
  assert.equal(nem.length, 2);
  assert.equal(nem[0].px, 70);
  assert.equal(nem[1].qty, 3);
  assert.deepEqual(nem.map((x) => x.principale), [true, false], 'il px più alto è il principale');
  // scontro senza nemici → lista vuota, nessun principale
  assert.deepEqual(nemiciDaScontro({ nemici: [] }), []);
});

test('patchPgAssegnazione: somma il delta a scelte.puntiEsperienza e registra una Modifica master «diretta»', () => {
  const pg = { formato: 'mutant-pg', versione: 8, scelte: { puntiEsperienza: 520, corporazione: 'x' } };
  const dopo = patchPgAssegnazione(pg, 230, 'PX della partita del 2026-10-16', new Date('2026-10-16T20:00:00Z'));
  assert.equal(dopo.scelte.puntiEsperienza, 750);
  assert.equal(dopo.scelte.corporazione, 'x', 'le altre scelte restano');
  assert.equal(dopo.correzioni_master.length, 1);
  const c = dopo.correzioni_master[0];
  assert.equal(c.tipo, 'diretta');
  assert.equal(c.chiave, 'puntiEsperienza');
  assert.deepEqual([c.prima, c.dopo], [520, 750]);
  assert.match(c.etichetta, /PX della partita del 2026-10-16/);
  // px assente = 0 di partenza; delta negativo (correzione) sottrae
  const vuoto = patchPgAssegnazione({ scelte: {} }, 100, 'X');
  assert.equal(vuoto.scelte.puntiEsperienza, 100);
  const corretto = patchPgAssegnazione(dopo, -30, 'Correzione', new Date('2026-10-17T20:00:00Z'));
  assert.equal(corretto.scelte.puntiEsperienza, 720);
  assert.equal(corretto.correzioni_master.length, 2, 'una riga per ogni assegnazione, non fuse');
});
