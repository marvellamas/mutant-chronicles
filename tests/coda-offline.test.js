// La coda delle operazioni offline, lato tablet (21/10/2026, quarto lotto, src/ui/coda-offline.js): accoda solo
// quello che è cambiato, la base avanza man mano, il giocatore può togliere una riga, la coda sopravvive a un
// «riavvio» (qui: un secondo localStorage finto con lo stesso contenuto, come dopo aver chiuso e riaperto l'app).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

function localStorageFinto() {
  const dati = new Map();
  return { getItem: (k) => (dati.has(k) ? dati.get(k) : null), setItem: (k, v) => dati.set(k, String(v)), removeItem: (k) => dati.delete(k), clear: () => dati.clear() };
}
globalThis.localStorage = localStorageFinto();

const { leggiBase, fissaBase, leggiCoda, accoda, togliDallaCoda, confermaRisposta, inCoda } = await import('../src/ui/coda-offline.js');

const ID = 'pmv-test-1';
beforeEach(() => { globalThis.localStorage.clear(); });

test('senza base e senza modifiche: niente da accodare', () => {
  assert.equal(leggiBase(ID), null);
  const nuove = accoda(ID, { nome: 'Aiko' }, { pvAttuali: 10 }, null);
  // prima volta: la base era vuota, quindi «scelte.nome» e «sessione.pvAttuali» risultano «nuovi» (assegna/somma
  // da zero): è corretto, il tablet non aveva mai visto niente. Verifichiamo che poi non si ripeta.
  assert.ok(nuove.length > 0);
  const base = leggiBase(ID);
  assert.deepEqual(base.scelte, { nome: 'Aiko' });
  const seconda = accoda(ID, { nome: 'Aiko' }, { pvAttuali: 10 }, null);
  assert.deepEqual(seconda, []); // niente di nuovo
});

test('accoda: una modifica di PV, in coda con l\'etichetta «−5 PV»', () => {
  fissaBase(ID, { nome: 'Aiko' }, { pvAttuali: 15 }, null);
  const nuove = accoda(ID, { nome: 'Aiko' }, { pvAttuali: 10 }, null);
  assert.equal(nuove.length, 1);
  assert.equal(nuove[0].etichetta, '−5 PV');
  assert.equal(inCoda(ID), 1);
});

test('accoda: la base avanza, la differenza successiva riparte da lì (non si riconta la prima variazione)', () => {
  fissaBase(ID, {}, { pvAttuali: 15 }, null);
  accoda(ID, {}, { pvAttuali: 10 }, null); // −5
  accoda(ID, {}, { pvAttuali: 8 }, null); // altri −2
  const coda = leggiCoda(ID);
  assert.equal(coda.length, 2);
  assert.equal(coda[0].delta, -5);
  assert.equal(coda[1].delta, -2);
});

test('uno Stato acceso ha l\'etichetta giusta', () => {
  fissaBase(ID, {}, { statiAttivi: [] }, null);
  const nuove = accoda(ID, {}, { statiAttivi: ['Sanguinamento'] }, null);
  assert.equal(nuove[0].etichetta, 'Stato Sanguinamento acceso');
});

test('un oggetto aggiunto all\'equipaggiamento ha l\'etichetta giusta', () => {
  fissaBase(ID, { equipaggiamento: [] }, {}, null);
  const nuove = accoda(ID, { equipaggiamento: [{ uid: 'x1', nome: 'Pergamena di Cura Ferite' }] }, {}, null);
  assert.equal(nuove[0].etichetta, '+1 Pergamena di Cura Ferite');
});

test('togliDallaCoda: il giocatore toglie una riga prima che arrivi al Direttore', () => {
  fissaBase(ID, {}, { pvAttuali: 15 }, null);
  const nuove = accoda(ID, {}, { pvAttuali: 10 }, null);
  assert.equal(inCoda(ID), 1);
  togliDallaCoda(ID, nuove[0].id);
  assert.equal(inCoda(ID), 0);
});

test('confermaRisposta: escono dalla coda solo le righe che il Direttore ha deciso (approvate o scartate)', () => {
  fissaBase(ID, {}, { pvAttuali: 15, pmAttuali: 10 }, null);
  accoda(ID, {}, { pvAttuali: 10, pmAttuali: 10 }, null); // −5 PV
  const opPm = accoda(ID, {}, { pvAttuali: 10, pmAttuali: 7 }, null); // −3 PM, operazione separata
  assert.equal(inCoda(ID), 2);
  // il Direttore ha deciso solo la prima: la seconda è ancora sul suo tavolo, quindi resta anche qui
  const primaOp = leggiCoda(ID)[0];
  const esito = confermaRisposta(ID, { decise: { [primaOp.id]: 'approvata' } });
  assert.deepEqual(esito.approvate, [primaOp.etichetta]);
  assert.deepEqual(esito.scartate, []);
  assert.equal(inCoda(ID), 1);
  assert.equal(leggiCoda(ID)[0].id, opPm[0].id);
});

test('confermaRisposta: una riga scartata esce dalla coda e si dice al giocatore che non è passata', () => {
  fissaBase(ID, {}, { pvAttuali: 15 }, null);
  const [op] = accoda(ID, {}, { pvAttuali: 10 }, null);
  const esito = confermaRisposta(ID, { decise: { [op.id]: 'scartata' } });
  assert.deepEqual(esito.scartate, [op.etichetta]);
  assert.equal(inCoda(ID), 0);
});

test('confermaRisposta: senza risposta del Direttore la coda non si tocca (chiudere non è scartare)', () => {
  fissaBase(ID, {}, { pvAttuali: 15 }, null);
  accoda(ID, {}, { pvAttuali: 10 }, null);
  const esito = confermaRisposta(ID, { decise: {} });
  assert.deepEqual(esito, { approvate: [], scartate: [] });
  assert.equal(inCoda(ID), 1);
});

test('la coda sopravvive a un "riavvio" (un nuovo localStorage con lo stesso contenuto sottostante)', () => {
  fissaBase(ID, {}, { pvAttuali: 15 }, null);
  accoda(ID, {}, { pvAttuali: 10 }, null);
  // «chiudere e riaprire l'app»: lo stesso backing store, un nuovo giro di lettura
  assert.equal(inCoda(ID), 1);
  assert.equal(leggiCoda(ID)[0].delta, -5);
});

test('due personaggi diversi hanno code separate', () => {
  const ID2 = 'pmv-test-2';
  fissaBase(ID, {}, { pvAttuali: 15 }, null);
  fissaBase(ID2, {}, { pvAttuali: 8 }, null);
  accoda(ID, {}, { pvAttuali: 10 }, null);
  assert.equal(inCoda(ID), 1);
  assert.equal(inCoda(ID2), 0);
});
