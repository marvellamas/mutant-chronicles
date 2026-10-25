// L'archivio «PX della partita» salva da solo e il giro di aggiornamento non lo sovrascrive (25/10/2026, prova di Davide).
import test from 'node:test';
import assert from 'node:assert/strict';
import { creaArchivioPx, testoSalvataggio } from '../src/px-archivio.js';

/** Timer finto: si avanza a mano. */
function timerFinto() {
  let n = 0; const attivi = new Map();
  return {
    imposta: (fn) => { n += 1; attivi.set(n, fn); return n; },
    annulla: (id) => attivi.delete(id),
    scatta: async () => { const f = [...attivi.values()]; attivi.clear(); for (const fn of f) fn(); await new Promise((r) => setImmediate(r)); },
    quanti: () => attivi.size,
  };
}
const vuoto = () => ({ versione: 1, giocatori: [], partite: [] });

function nuovo(opz = {}) {
  const timer = timerFinto();
  const server = { db: null, scritture: [], ritardo: null, rifiuta: false };
  const scrivi = async (db) => {
    if (server.rifiuta) throw new Error('rete caduta');
    const copia = JSON.parse(JSON.stringify(db));
    if (server.ritardo) await server.ritardo;
    server.scritture.push(copia); server.db = copia;
  };
  const a = creaArchivioPx({ scrivi, timer, ...opz });
  return { a, timer, server };
}

test('una modifica si salva da sola dopo la pausa, senza cambiare schermata', async () => {
  const { a, timer, server } = nuovo();
  a.sincronizza(null, a.gettone(), vuoto);
  a.db.giocatori.push({ id: 'g1', giocatore: 'Anna', pg: 'Aiko' });
  a.modifica();
  assert.equal(a.stato.stato, 'da-salvare');
  assert.equal(server.scritture.length, 0);
  await timer.scatta();
  assert.equal(server.scritture.length, 1);
  assert.equal(server.db.giocatori[0].giocatore, 'Anna');
  assert.equal(a.stato.stato, 'salvato');
});

test('tanti tasti ravvicinati: una scrittura sola, con l’ultimo valore', async () => {
  const { a, timer, server } = nuovo();
  a.sincronizza(null, a.gettone(), vuoto);
  a.db.partite.push({ id: 'p', titolo: '' });
  for (const t of ['N', 'No', 'Nom', 'Nome']) { a.db.partite[0].titolo = t; a.modifica(); }
  assert.equal(timer.quanti(), 1, 'un solo salvataggio programmato');
  await timer.scatta();
  assert.equal(server.scritture.length, 1);
  assert.equal(server.db.partite[0].titolo, 'Nome');
});

test('il giro di aggiornamento NON sostituisce l’archivio mentre ci sono modifiche da scrivere', async () => {
  const { a } = nuovo();
  a.sincronizza(null, a.gettone(), vuoto);
  const lettura = a.gettone();
  a.db.giocatori.push({ id: 'g1', giocatore: 'Anna' });
  a.modifica();
  // la copia del server (vecchia, senza Anna) arriva dopo: non deve cancellare nulla
  assert.equal(a.sincronizza(vuoto(), lettura, vuoto), false);
  assert.equal(a.db.giocatori.length, 1);
});

test('una lettura iniziata PRIMA di un salvataggio è vecchia anche a salvataggio finito', async () => {
  const { a, timer } = nuovo();
  a.sincronizza(null, a.gettone(), vuoto);
  const lettura = a.gettone(); // la lettura parte
  a.db.giocatori.push({ id: 'g1' });
  a.modifica();
  await timer.scatta(); // il salvataggio finisce prima che la lettura torni
  assert.equal(a.stato.sporco, false);
  assert.equal(a.sincronizza(vuoto(), lettura, vuoto), false, 'la copia vecchia non vale');
  assert.equal(a.db.giocatori.length, 1);
});

test('un archivio cambiato da un’altra finestra si prende quando non c’è nulla da scrivere', async () => {
  const { a } = nuovo();
  a.sincronizza(null, a.gettone(), vuoto);
  const altro = { ...vuoto(), giocatori: [{ id: 'x' }] };
  assert.equal(a.sincronizza(altro, a.gettone(), vuoto), true);
  assert.equal(a.db.giocatori[0].id, 'x');
  assert.equal(a.sincronizza(JSON.parse(JSON.stringify(altro)), a.gettone(), vuoto), false, 'uguale: niente da fare');
});

test('modifiche durante il salvataggio: la scrittura si ripete finché il server ha l’ultima', async () => {
  const { a, timer, server } = nuovo();
  a.sincronizza(null, a.gettone(), vuoto);
  let sblocca; server.ritardo = new Promise((r) => { sblocca = r; });
  a.db.partite.push({ id: 'p', titolo: 'uno' }); a.modifica();
  await timer.scatta(); // scrittura in volo, bloccata
  a.db.partite[0].titolo = 'due'; a.modifica();
  server.ritardo = null; sblocca();
  const fatto = a.salva();
  await timer.scatta();
  assert.equal(await fatto, true);
  assert.equal(server.db.partite[0].titolo, 'due');
  assert.equal(a.stato.sporco, false);
});

test('errore di rete: lo dice, riprova da solo e poi salva', async () => {
  const { a, timer, server } = nuovo();
  a.sincronizza(null, a.gettone(), vuoto);
  server.rifiuta = true;
  a.db.giocatori.push({ id: 'g1' }); a.modifica();
  await timer.scatta();
  assert.equal(a.stato.stato, 'errore');
  assert.match(a.stato.errore, /rete caduta/);
  assert.equal(a.sincronizza(vuoto(), a.gettone(), vuoto), false, 'con modifiche non scritte non si sostituisce');
  server.rifiuta = false;
  await timer.scatta(); // il nuovo tentativo
  assert.equal(server.db.giocatori.length, 1);
  assert.equal(a.stato.stato, 'salvato');
});

test('«salva» subito (chiusura della pagina) non aspetta la pausa', async () => {
  const { a, server } = nuovo();
  a.sincronizza(null, a.gettone(), vuoto);
  a.db.giocatori.push({ id: 'g1' }); a.modifica();
  await a.salva({ keepalive: true });
  assert.equal(server.scritture.length, 1);
});

test('il testo di stato: salvataggio, errore e «salvato»', () => {
  assert.equal(testoSalvataggio({ stato: 'da-salvare' }).tipo, 'attesa');
  assert.match(testoSalvataggio({ stato: 'errore', errore: 'x' }).testo, /^Non salvato: x/);
  assert.match(testoSalvataggio({ stato: 'salvato', quando: new Date() }).testo, /Salvato ora/);
});
