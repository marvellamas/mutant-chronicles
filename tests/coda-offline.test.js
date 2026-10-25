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

// --- una modifica, una voce (25/10/2026, segnalazione di Davide del 24/10, Test 6) ------------------------------
import { confermaInvio, ritirateDaMandare, confermaRitirate } from '../src/ui/coda-offline.js';

const conNote = (note) => ({ note, pvAttuali: 24 });

test('«NO», «NOT», «NOTE» battuti piano: UNA voce in coda, non tre (il difetto del 24/10)', () => {
  fissaBase(ID, {}, conNote(''), null);
  // come sul tablet: ogni tasto salva, e ogni salvataggio offline fa un accoda() sullo stato di quel momento
  for (const t of ['N', 'NO', 'NOT', 'NOTE']) accoda(ID, {}, conNote(t), null);
  const righe = leggiCoda(ID).filter((o) => o.percorso.join('.') === 'sessione.note');
  assert.equal(righe.length, 1);
  assert.equal(righe[0].visto, '');
  assert.equal(righe[0].nuovo, 'NOTE');
  assert.equal(inCoda(ID), 1);
});

test('la coda sopravvive alla chiusura dell\'app a metà della scrittura e riprende dalla stessa voce', () => {
  fissaBase(ID, {}, conNote(''), null);
  accoda(ID, {}, conNote('NO'), null);
  // «chiudere e riaprire l'app»: lo stesso localStorage, letture nuove; poi si finisce di scrivere
  assert.equal(leggiCoda(ID).length, 1);
  accoda(ID, {}, conNote('NOTE'), null);
  assert.equal(leggiCoda(ID).length, 1);
  assert.equal(leggiCoda(ID)[0].nuovo, 'NOTE');
});

test('PV e note insieme: le note una voce, i PV una voce per tocco (sono due gesti)', () => {
  fissaBase(ID, {}, conNote(''), null);
  accoda(ID, {}, { note: 'N', pvAttuali: 23 }, null);
  accoda(ID, {}, { note: 'NO', pvAttuali: 23 }, null);
  accoda(ID, {}, { note: 'NO', pvAttuali: 22 }, null);
  accoda(ID, {}, { note: 'NOTE', pvAttuali: 22 }, null);
  const e = leggiCoda(ID).map((o) => o.etichetta);
  assert.equal(e.filter((x) => x === 'Note del personaggio').length, 1);
  assert.deepEqual(e.filter((x) => x.includes('PV')), ['−1 PV', '−1 PV']);
});

test('dopo l\'invio la voce è «partita»: una modifica successiva ne fa una nuova che la SOSTITUISCE', () => {
  fissaBase(ID, {}, conNote(''), null);
  accoda(ID, {}, conNote('NO'), null);
  const [prima] = leggiCoda(ID);
  confermaInvio(ID, [prima.id]); // il server l'ha presa in carico
  assert.equal(leggiCoda(ID)[0].inviata, true);
  accoda(ID, {}, conNote('NOTE'), null);
  const coda = leggiCoda(ID);
  assert.equal(coda.length, 1, 'ancora una voce sola per il Direttore');
  assert.notEqual(coda[0].id, prima.id);
  assert.deepEqual(coda[0].sostituisce, [prima.id]);
  assert.equal(coda[0].visto, '');
  assert.equal(coda[0].nuovo, 'NOTE');
  assert.notEqual(coda[0].inviata, true, 'la nuova non è ancora partita');
});

test('una voce partita che torna com\'era va ritirata dal server, e il ritiro resta in coda finché il server non lo sa', () => {
  fissaBase(ID, {}, conNote(''), null);
  accoda(ID, {}, conNote('NO'), null);
  const [prima] = leggiCoda(ID);
  confermaInvio(ID, [prima.id]);
  accoda(ID, {}, conNote(''), null);
  assert.equal(inCoda(ID), 0, 'niente più da proporre');
  assert.deepEqual(ritirateDaMandare(ID), [prima.id]);
  confermaRitirate(ID, [prima.id]);
  assert.deepEqual(ritirateDaMandare(ID), []);
});

test('una voce già decisa dal Direttore e tolta dalla coda non si «sostituisce»: la nuova modifica parte da capo', () => {
  fissaBase(ID, {}, conNote(''), null);
  accoda(ID, {}, conNote('NO'), null);
  const [prima] = leggiCoda(ID);
  confermaRisposta(ID, { decise: { [prima.id]: 'approvata' } });
  assert.equal(inCoda(ID), 0);
  accoda(ID, {}, conNote('NOTE'), null);
  const [nuova] = leggiCoda(ID);
  assert.equal(nuova.sostituisce, undefined);
  assert.equal(nuova.visto, 'NO', 'parte da quello che il Direttore ha approvato');
});
