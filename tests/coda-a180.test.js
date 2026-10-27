// A.180 (Davide, 25/10/2026): la coda mostra, per ogni modifica, il valore precedente, il valore proposto e «In attesa di
// approvazione»; il giocatore ritira una richiesta finché è pendente; il ritiro risulta al Direttore e non tocca la scheda;
// dopo l'approvazione un ripensamento è una richiesta nuova.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = (() => {
  const d = new Map();
  return { getItem: (k) => (d.has(k) ? d.get(k) : null), setItem: (k, v) => d.set(k, String(v)), removeItem: (k) => d.delete(k), clear: () => d.clear() };
})();

const { fissaBase, accoda, leggiCoda, togliDallaCoda, confermaInvio, ritirateDaMandare, confermaRitirate, confermaRisposta } = await import('../src/ui/coda-offline.js');
const { dettaglioOperazione, fraseDettaglio, DICITURA_ATTESA } = await import('../src/coda-dettaglio.js');
const { aggiungiOperazioni, rientroVuoto, inAttesaDi, righeRitirate, vediRitirate, rigaOperazione, riassuntoRientro, applicaDecisioni, registraDecisioni, normalizzaRientro } = await import('../src/rientro.js');
const { applicaOperazione } = await import('../src/giornale.js');

const ID = 'pg-a180';
const PG = 'pg-a180';
beforeEach(() => globalThis.localStorage.clear());

test('A.180: una modifica di PV in coda porta valore precedente e proposto, e la dicitura', () => {
  fissaBase(ID, {}, { pvAttuali: 15 }, null);
  const [op] = accoda(ID, {}, { pvAttuali: 10 }, null);
  assert.deepEqual(dettaglioOperazione(op), { precedente: '15', proposto: '10' });
  assert.equal(fraseDettaglio(op), 'prima: 15 → proposto: 10');
  assert.equal(DICITURA_ATTESA, 'In attesa di approvazione');
});

test('A.180: un valore assegnato (FOR) porta il precedente e il proposto; un oggetto aggiunto «assente → aggiunto»', () => {
  fissaBase(ID, { puntiCaratteristica: { FOR: 10 }, equipaggiamento: [] }, {}, null);
  const nuove = accoda(ID, { puntiCaratteristica: { FOR: 12 }, equipaggiamento: [{ uid: 'u1', nome: 'Coltello' }] }, {}, null);
  const forza = nuove.find((o) => o.percorso.join('.') === 'scelte.puntiCaratteristica.FOR');
  assert.deepEqual(dettaglioOperazione(forza), { precedente: '10', proposto: '12' });
  const oggetto = nuove.find((o) => o.percorso.join('.') === 'scelte.equipaggiamento');
  assert.deepEqual(dettaglioOperazione(oggetto), { precedente: 'assente', proposto: 'aggiunto' });
});

test('A.180: anche una voce senza prima/dopo (file del tablet di ieri) si legge: «variazione −5»', () => {
  assert.deepEqual(dettaglioOperazione({ tipo: 'somma', delta: -5 }), { precedente: null, proposto: '−5' });
  assert.equal(fraseDettaglio({ tipo: 'somma', delta: -5 }), 'variazione −5');
});

test('A.180: il Direttore legge la stessa riga: precedente, proposto e «In attesa di approvazione»', () => {
  fissaBase(ID, {}, { pvAttuali: 15 }, null);
  const [op] = accoda(ID, {}, { pvAttuali: 10 }, null);
  const riga = rigaOperazione(op, { sessione: { pvAttuali: 15 } });
  assert.equal(riga.precedente, '15');
  assert.equal(riga.proposto, '10');
  assert.equal(riga.stato, DICITURA_ATTESA);
});

test('A.180: ritirare una voce già arrivata al Direttore: il ritiro gli risulta e la scheda approvata non cambia', () => {
  fissaBase(ID, {}, { pvAttuali: 15 }, null);
  const [op] = accoda(ID, {}, { pvAttuali: 10 }, null);
  // arriva al Direttore
  let r = aggiungiOperazioni(rientroVuoto(), PG, [op], { nome: 'Aiko' }).rientro;
  confermaInvio(ID, [op.id]);
  assert.equal(inAttesaDi(r, PG).length, 1);
  // il giocatore la ritira: sta ancora nella coda, perché è pendente
  togliDallaCoda(ID, op.id);
  assert.equal(leggiCoda(ID).length, 0);
  assert.deepEqual(ritirateDaMandare(ID), [op.id]);
  // il tablet lo dice al server
  const x = aggiungiOperazioni(r, PG, [], { ritira: ritirateDaMandare(ID), adesso: new Date('2026-10-27T10:00:00Z') });
  confermaRitirate(ID, ritirateDaMandare(ID));
  assert.equal(inAttesaDi(x.rientro, PG).length, 0, 'non è più da decidere');
  const ritirate = righeRitirate(x.rientro, PG);
  assert.equal(ritirate.length, 1, 'ma il Direttore vede che è stata ritirata');
  assert.deepEqual([ritirate[0].precedente, ritirate[0].proposto, ritirate[0].stato], ['15', '10', 'Ritirata dal giocatore']);
  // la scheda approvata non è stata toccata: nessuna decisione ha applicato la voce
  const scheda = { sessione: { pvAttuali: 15 } };
  assert.equal(applicaDecisioni(scheda, inAttesaDi(x.rientro, PG), { [op.id]: 'approva' }).risultato.sessione.pvAttuali, 15);
  // la fascia del Direttore lo dice anche senza modifiche da decidere
  const fascia = riassuntoRientro([{ nome: 'Aiko', righe: [], ritirate }]);
  assert.match(fascia.testo, /1 richiesta ritirata dal giocatore \(Aiko\)/);
  // «Visto» la toglie dall'elenco
  const dopo = vediRitirate(x.rientro, PG, [op.id]);
  assert.equal(righeRitirate(dopo, PG).length, 0);
  // e un tablet che rimanda la stessa voce non la fa rientrare
  const ancora = aggiungiOperazioni(dopo, PG, [op]);
  assert.equal(inAttesaDi(ancora.rientro, PG).length, 0);
});

test('A.180: dopo l’approvazione un ripensamento è una richiesta nuova (non un ritiro)', () => {
  fissaBase(ID, {}, { pvAttuali: 15 }, null);
  const [op] = accoda(ID, {}, { pvAttuali: 10 }, null);
  let r = aggiungiOperazioni(rientroVuoto(), PG, [op]).rientro;
  const { approvate } = applicaDecisioni({ sessione: { pvAttuali: 15 } }, inAttesaDi(r, PG), { [op.id]: 'approva' });
  r = registraDecisioni(r, PG, { approvate });
  confermaRisposta(ID, { decise: { [op.id]: 'approvata' } });
  assert.equal(leggiCoda(ID).length, 0, 'la voce approvata esce dalla coda: non c’è più nulla da ritirare');
  // il giocatore ci ripensa: una modifica nuova, con un id nuovo, in attesa come tutte
  const [nuova] = accoda(ID, {}, { pvAttuali: 12 }, null);
  assert.notEqual(nuova.id, op.id);
  const x = aggiungiOperazioni(r, PG, [nuova]);
  assert.deepEqual(x.inAttesa, [nuova.id]);
  assert.equal(righeRitirate(x.rientro, PG).length, 0, 'e non risulta come ritiro');
  // il vecchio ritiro di una voce già approvata non fa niente
  const y = aggiungiOperazioni(x.rientro, PG, [], { ritira: [op.id] });
  assert.equal(righeRitirate(y.rientro, PG).length, 0);
  assert.equal(applicaOperazione({ sessione: { pvAttuali: 10 } }, nuova).sessione.pvAttuali, 12, 'applicata, porta il valore a 12');
});

test('A.180: normalizzaRientro non perde le ritirate', () => {
  const r = aggiungiOperazioni(rientroVuoto(), PG, [{ id: 'a', tipo: 'somma', percorso: ['sessione', 'pvAttuali'], delta: -1, quando: '2026-10-27T09:00:00Z' }]).rientro;
  const x = aggiungiOperazioni(r, PG, [], { ritira: ['a'] }).rientro;
  assert.equal(normalizzaRientro(JSON.parse(JSON.stringify(x))).personaggi[PG].ritirate.length, 1);
});

test('A.177: la riga del Direttore dice quando la modifica è stata fatta e quando è stata ricevuta', () => {
  const op = { id: 'r1', tipo: 'somma', percorso: ['sessione', 'pvAttuali'], delta: -1, prima: 5, dopo: 4, etichetta: '−1 PV', quando: '2026-10-27T09:00:00.000Z' };
  const x = aggiungiOperazioni(rientroVuoto(), PG, [op], { adesso: new Date('2026-10-27T11:30:00Z') });
  const [dentro] = inAttesaDi(x.rientro, PG);
  assert.equal(dentro.ricevuta, '2026-10-27T11:30:00.000Z');
  const riga = rigaOperazione(dentro, { sessione: { pvAttuali: 5 } });
  assert.deepEqual([riga.quando, riga.ricevuta], ['2026-10-27T09:00:00.000Z', '2026-10-27T11:30:00.000Z']);
  // un secondo invio della stessa voce non cambia l'ora di ricezione
  const ancora = aggiungiOperazioni(x.rientro, PG, [op], { adesso: new Date('2026-10-27T12:00:00Z') });
  assert.equal(inAttesaDi(ancora.rientro, PG)[0].ricevuta, '2026-10-27T11:30:00.000Z');
});
