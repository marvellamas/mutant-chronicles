// Due difetti trovati dalla prova nel browser del 22/10/2026, con il loro contratto. Non sono dettagli: senza
// l'uno la coda non sarebbe mai partita, senza l'altro il rientro si poteva scavalcare.
//
//  1. la coda e la riga di stato devono usare la STESSA chiave — l'identificativo stabile del personaggio.
//     src/ui/app.js la riempiva con l'identificativo della voce del browser (pmvjaji7i374t) e
//     src/ui/stato-tablet.js la leggeva con quello stabile (pg-…): la coda si riempiva da una parte e si
//     leggeva dall'altra, quindi non partiva mai e il giocatore non vedeva nessuna modifica in attesa.
//  2. un tablet con la coda non vuota non deve scrivere il file nemmeno da collegato: al rientro la scrittura
//     normale riprendeva e mandava tutto lo stato locale con un PUT, cioè le modifiche entravano nella scheda
//     senza che Davide le avesse mai viste — esattamente ciò che il rientro deve impedire.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

function localStorageFinto() {
  const dati = new Map();
  return { getItem: (k) => (dati.has(k) ? dati.get(k) : null), setItem: (k, v) => dati.set(k, String(v)), removeItem: (k) => dati.delete(k), clear: () => dati.clear() };
}
globalThis.localStorage = localStorageFinto();

const { fissaBase, accoda, inCoda, leggiCoda } = await import('../src/ui/coda-offline.js');

const PG_STABILE = 'pg-2b1279a5686e2546624fd153'; // quello che la riga di stato usa (src/dispositivi.js)
const ID_BROWSER = 'pmvjaji7i374t'; // quello della voce nell'archivio del browser
beforeEach(() => { globalThis.localStorage.clear(); });

test('la coda si riempie e si legge con lo stesso identificativo stabile del personaggio', () => {
  fissaBase(PG_STABILE, {}, { pvAttuali: 24 }, null);
  accoda(PG_STABILE, {}, { pvAttuali: 19 }, null);
  assert.equal(inCoda(PG_STABILE), 1, 'la riga di stato legge con l’identificativo stabile: deve trovare la riga');
  assert.equal(leggiCoda(PG_STABILE)[0].etichetta, '−5 PV');
  // la chiave sbagliata (quella del browser) non deve contenere niente: è il difetto del 22/10
  assert.equal(inCoda(ID_BROWSER), 0);
});

/**
 * La regola di src/ui/app.js → scriviInCartella, qui come funzione pura per poterla provare: un tablet scrive
 * il file solo quando è collegato E non ha niente in attesa. Se la cambi lì, cambiala qui.
 */
const scriveIlFile = ({ master, offline, inCoda: n }) => master || (!offline && n === 0);

test('un tablet con modifiche in attesa non scrive il file nemmeno da collegato', () => {
  assert.equal(scriveIlFile({ master: false, offline: true, inCoda: 0 }), false, 'offline: accoda');
  assert.equal(scriveIlFile({ master: false, offline: true, inCoda: 3 }), false, 'offline con la coda piena: accoda');
  // il caso del difetto: tornato in linea, con le righe ancora dal Direttore, NON deve scrivere
  assert.equal(scriveIlFile({ master: false, offline: false, inCoda: 3 }), false, 'collegato ma in attesa: accoda ancora');
  // solo a coda vuota si torna a scrivere normalmente
  assert.equal(scriveIlFile({ master: false, offline: false, inCoda: 0 }), true);
  // il PC del Direttore scrive sempre: il rientro non lo riguarda
  assert.equal(scriveIlFile({ master: true, offline: false, inCoda: 5 }), true);
});

test('finché la coda non è vuota, anche le modifiche fatte da collegato si accodano (non scavalcano la fila)', () => {
  fissaBase(PG_STABILE, {}, { pvAttuali: 24, pmAttuali: 16 }, null);
  accoda(PG_STABILE, {}, { pvAttuali: 19, pmAttuali: 16 }, null); // offline
  assert.equal(scriveIlFile({ master: false, offline: false, inCoda: inCoda(PG_STABILE) }), false);
  accoda(PG_STABILE, {}, { pvAttuali: 19, pmAttuali: 13 }, null); // di nuovo in linea, ma la prima aspetta ancora
  assert.deepEqual(leggiCoda(PG_STABILE).map((o) => o.etichetta), ['−5 PV', '−3 PM']);
});
