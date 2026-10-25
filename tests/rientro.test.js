// Il deposito delle modifiche fatte offline e le decisioni del Direttore (22/10/2026, src/rientro.js).
// La regola che tiene insieme tutto: niente si applica prima della conferma, e chiudere non è scartare.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rientroVuoto, normalizzaRientro, aggiungiOperazioni, inAttesaDi, ciSonoModifiche, rigaOperazione,
  applicaDecisioni, registraDecisioni,
} from '../src/rientro.js';

const PG = 'pg-aiko';
const op = (id, extra = {}) => ({ id, tipo: 'somma', percorso: ['sessione', 'pvAttuali'], delta: -5, etichetta: '−5 PV', quando: '2026-10-21T21:40:00.000Z', ...extra });

test('senza modifiche in attesa non c\'è niente da mostrare (la schermata non compare mai)', () => {
  assert.equal(ciSonoModifiche(rientroVuoto()), false);
  assert.equal(ciSonoModifiche(null), false);
  assert.equal(ciSonoModifiche({ personaggi: { [PG]: { inAttesa: [], decise: {} } } }), false);
});

test('le operazioni arrivano in attesa, in ordine di quando sono state fatte', () => {
  const tarda = op('b', { quando: '2026-10-21T21:52:00.000Z', etichetta: '+1 Pergamena' });
  const presto = op('a', { quando: '2026-10-21T21:40:00.000Z' });
  const { rientro, inAttesa } = aggiungiOperazioni(rientroVuoto(), PG, [tarda, presto], { nome: 'Aiko' });
  assert.deepEqual(inAttesa, ['a', 'b']);
  assert.equal(ciSonoModifiche(rientro), true);
  assert.deepEqual(inAttesaDi(rientro, PG).map((x) => x.etichetta), ['−5 PV', '+1 Pergamena']);
});

test('ripresentare lo stesso giornale non duplica niente (il tablet lo rimanda a ogni giro)', () => {
  const uno = aggiungiOperazioni(rientroVuoto(), PG, [op('a')]);
  const due = aggiungiOperazioni(uno.rientro, PG, [op('a')]);
  assert.deepEqual(due.inAttesa, ['a']);
  assert.equal(inAttesaDi(due.rientro, PG).length, 1);
});

test('un\'operazione già decisa non torna in attesa: torna nella risposta al tablet', () => {
  const { rientro } = aggiungiOperazioni(rientroVuoto(), PG, [op('a'), op('b')]);
  const deciso = registraDecisioni(rientro, PG, { approvate: ['a'], scartate: ['b'] });
  assert.equal(inAttesaDi(deciso, PG).length, 0);
  // il tablet, che non aveva ricevuto la risposta, ripresenta le stesse due
  const r = aggiungiOperazioni(deciso, PG, [op('a'), op('b')]);
  assert.deepEqual(r.inAttesa, []);
  assert.deepEqual(r.decise, { a: 'approvata', b: 'scartata' });
});

test('applicaDecisioni: si applica solo ciò che è approvato, in ordine; il resto resta in attesa', () => {
  const ops = [
    op('a', { delta: -5 }),
    op('b', { percorso: ['sessione', 'pmAttuali'], delta: -3, quando: '2026-10-21T21:44:00.000Z' }),
    op('c', { percorso: ['sessione', 'distintivi'], delta: 1, quando: '2026-10-21T21:50:00.000Z' }),
  ];
  const stato = { sessione: { pvAttuali: 20, pmAttuali: 9, distintivi: 0 } };
  const r = applicaDecisioni(stato, ops, { a: 'approva', b: 'scarta' });
  assert.equal(r.risultato.sessione.pvAttuali, 15);
  assert.equal(r.risultato.sessione.pmAttuali, 9); // scartata
  assert.equal(r.risultato.sessione.distintivi, 0); // non decisa
  assert.deepEqual(r.approvate, ['a']);
  assert.deepEqual(r.scartate, ['b']);
  assert.deepEqual(r.restano.map((x) => x.id), ['c']);
});

test('chiudere senza rispondere non perde niente: tutto resta in attesa e si ripresenta', () => {
  const { rientro } = aggiungiOperazioni(rientroVuoto(), PG, [op('a'), op('b')]);
  // Davide chiude: nessuna decisione registrata
  const dopo = registraDecisioni(rientro, PG, { approvate: [], scartate: [] });
  assert.deepEqual(inAttesaDi(dopo, PG).map((x) => x.id), ['a', 'b']);
  assert.equal(ciSonoModifiche(dopo), true);
});

test('approvare due volte la stessa riga la applica una volta sola', () => {
  const { rientro } = aggiungiOperazioni(rientroVuoto(), PG, [op('a')]);
  const stato = { sessione: { pvAttuali: 20 } };
  const primo = applicaDecisioni(stato, inAttesaDi(rientro, PG), { a: 'approva' });
  assert.equal(primo.risultato.sessione.pvAttuali, 15);
  const dopo = registraDecisioni(rientro, PG, { approvate: primo.approvate, scartate: [] });
  // la riga non è più in attesa: una seconda approvazione non ha più niente da applicare
  const secondo = applicaDecisioni(primo.risultato, inAttesaDi(dopo, PG), { a: 'approva' });
  assert.equal(secondo.risultato.sessione.pvAttuali, 15); // non 10
  assert.deepEqual(secondo.approvate, []);
});

test('rigaOperazione: una variazione non è mai un conflitto; un\'assegnazione lo è se è cambiata anche sul server', () => {
  const stato = { sessione: { pvAttuali: 25, note: 'nota del Direttore' } };
  const variazione = rigaOperazione(op('a'), stato);
  assert.equal(variazione.variazione, true);
  assert.equal(variazione.conflitto, undefined);
  assert.equal(variazione.etichetta, '−5 PV');

  const assegna = { id: 'n', tipo: 'assegna', percorso: ['sessione', 'note'], visto: 'vecchia', nuovo: 'dal tablet', etichetta: 'Note del personaggio', quando: '2026-10-21T22:00:00.000Z' };
  const conflitto = rigaOperazione(assegna, stato);
  assert.equal(conflitto.variazione, false);
  assert.deepEqual(conflitto.conflitto, { sulServer: 'nota del Direttore', dalTablet: 'dal tablet' });

  // la stessa assegnazione su un valore che il Direttore non ha toccato: nessuna domanda da fare
  const pulita = rigaOperazione(assegna, { sessione: { note: 'vecchia' } });
  assert.equal(pulita.conflitto, undefined);
});

test('rigaOperazione: un elemento di un elenco cambiato dentro (la nota del calendario dell\'esempio)', () => {
  const aggiorna = {
    id: 'u', tipo: 'insieme', azione: 'aggiorna', percorso: ['calendario', 'note'], identita: 'n1',
    visto: { id: 'n1', testo: 'incontro al porto' }, nuovo: { id: 'n1', testo: 'rimandato' }, etichetta: 'Nota del calendario',
  };
  const server = { calendario: { note: [{ id: 'n1', testo: 'annullato' }] } };
  const r = rigaOperazione(aggiorna, server);
  assert.equal(r.variazione, false);
  assert.equal(r.conflitto.sulServer.testo, 'annullato');
  assert.equal(r.conflitto.dalTablet.testo, 'rimandato');
});

test('normalizzaRientro: un deposito rotto, mancante o della forma del 21/10 non perde niente', () => {
  assert.deepEqual(normalizzaRientro(null), rientroVuoto());
  assert.deepEqual(normalizzaRientro({ personaggi: 'rotto' }), rientroVuoto());
  // forma del 21/10: le variazioni si applicavano da sole («applicate») e solo i conflitti restavano in sospeso
  const vecchio = {
    versione: 1,
    personaggi: { [PG]: { applicate: ['gia-fatta'], inSospeso: [{ operazione: op('in-sospeso'), attuale: 'x' }] } },
  };
  const r = normalizzaRientro(vecchio);
  assert.deepEqual(inAttesaDi(r, PG).map((x) => x.id), ['in-sospeso']); // il conflitto torna in attesa, dove lo vuole Davide
  assert.equal(r.personaggi[PG].decise['gia-fatta'], 'approvata'); // quella già scritta nel file non si riapplica
});

test('personaggi diversi non si mescolano', () => {
  let r = aggiungiOperazioni(rientroVuoto(), 'pg-uno', [op('a')]).rientro;
  r = aggiungiOperazioni(r, 'pg-due', [op('b')]).rientro;
  assert.deepEqual(inAttesaDi(r, 'pg-uno').map((x) => x.id), ['a']);
  assert.deepEqual(inAttesaDi(r, 'pg-due').map((x) => x.id), ['b']);
  const dopo = registraDecisioni(r, 'pg-uno', { approvate: ['a'], scartate: [] });
  assert.deepEqual(inAttesaDi(dopo, 'pg-due').map((x) => x.id), ['b']); // l'altro non è stato toccato
});

// --- una modifica, una voce: sostituzioni e ritiri (25/10/2026) -------------------------------------------------

test('una voce che SOSTITUISCE un\'altra la toglie dall\'attesa: il Direttore vede una riga sola per le note', () => {
  const nota = (id, visto, nuovo, extra = {}) => ({ id, tipo: 'assegna', percorso: ['sessione', 'note'], visto, nuovo, etichetta: 'Note del personaggio', quando: '2026-10-24T20:00:00.000Z', ...extra });
  let r = aggiungiOperazioni(rientroVuoto(), PG, [nota('n1', '', 'NO')]).rientro;
  assert.deepEqual(inAttesaDi(r, PG).map((x) => x.nuovo), ['NO']);
  // il giocatore continua a scrivere: il tablet manda la voce nuova, che porta l'id di quella che sostituisce
  const dopo = aggiungiOperazioni(r, PG, [nota('n2', '', 'NOTE', { sostituisce: ['n1'] })]);
  assert.deepEqual(inAttesaDi(dopo.rientro, PG).map((x) => [x.id, x.nuovo]), [['n2', 'NOTE']]);
  assert.deepEqual(dopo.inAttesa, ['n2']);
});

test('se un tablet rimanda la voce sostituita, non rientra in attesa (resta «ritirata»)', () => {
  const nota = (id, nuovo, extra = {}) => ({ id, tipo: 'assegna', percorso: ['sessione', 'note'], visto: '', nuovo, etichetta: 'Note', quando: '2026-10-24T20:00:00.000Z', ...extra });
  let r = aggiungiOperazioni(rientroVuoto(), PG, [nota('n1', 'NO')]).rientro;
  r = aggiungiOperazioni(r, PG, [nota('n2', 'NOTE', { sostituisce: ['n1'] })]).rientro;
  const ancora = aggiungiOperazioni(r, PG, [nota('n1', 'NO'), nota('n2', 'NOTE', { sostituisce: ['n1'] })]);
  assert.deepEqual(ancora.inAttesa, ['n2']);
  assert.equal(ancora.decise.n1, 'ritirata', 'e il tablet lo sa, così la toglie dalla sua coda senza dire che il Direttore l\'ha scartata');
});

test('«ritira»: il giocatore toglie le sue voci dall\'attesa (una modifica tornata com\'era, «Scarta le mie modifiche»)', () => {
  let r = aggiungiOperazioni(rientroVuoto(), PG, [op('a'), op('b')]).rientro;
  const x = aggiungiOperazioni(r, PG, [], { ritira: ['a'] });
  assert.deepEqual(x.inAttesa, ['b']);
  assert.equal(ciSonoModifiche(x.rientro), true, 'ne resta una');
  const y = aggiungiOperazioni(x.rientro, PG, [], { ritira: ['b'] });
  assert.equal(ciSonoModifiche(y.rientro), false, 'tolte tutte, la schermata di rientro non esiste più');
});

test('il ritiro non riscrive una decisione del Direttore: una voce già approvata resta approvata', () => {
  let r = aggiungiOperazioni(rientroVuoto(), PG, [op('a')]).rientro;
  r = registraDecisioni(r, PG, { approvate: ['a'], scartate: [] });
  const x = aggiungiOperazioni(r, PG, [op('a')], { ritira: ['a'] });
  assert.equal(x.decise.a, 'approvata');
});

test('il ritiro non tocca le voci di un altro personaggio', () => {
  let r = aggiungiOperazioni(rientroVuoto(), 'pg-uno', [op('a')]).rientro;
  r = aggiungiOperazioni(r, 'pg-due', [op('b')]).rientro;
  r = aggiungiOperazioni(r, 'pg-uno', [], { ritira: ['a', 'b'] }).rientro;
  assert.deepEqual(inAttesaDi(r, 'pg-due').map((x) => x.id), ['b']);
});

// --- la fascia fissa del Direttore (25/10/2026, Test 6: «non compare il pulsante “Rientro dei tablet”») -------------

import { riassuntoRientro, fasciaRientro } from '../src/rientro.js';

const lista = (...p) => p.map(([nome, n]) => ({ pgId: nome, nome, righe: Array.from({ length: n }, (_, i) => ({ id: `${nome}-${i}` })) }));

test('la fascia compare quando — e solo quando — c\'è qualcosa in attesa', () => {
  assert.equal(fasciaRientro({ personaggi: [] }), null, 'nessun tablet ha lavorato offline: il Direttore non vede niente');
  assert.equal(fasciaRientro({ personaggi: undefined }), null);
  assert.equal(fasciaRientro({ personaggi: lista(['Aiko', 0]) }), null, 'un personaggio senza righe non conta');
  const f = fasciaRientro({ personaggi: lista(['Aiko Tenzan', 4]) });
  assert.equal(f.n, 4);
  assert.match(f.testo, /4 modifiche fatte senza collegamento/);
  assert.match(f.testo, /Aiko Tenzan/);
});

test('con la schermata aperta la fascia non c\'è (la schermata è lei stessa l\'avviso)', () => {
  assert.equal(fasciaRientro({ personaggi: lista(['Aiko', 3]), aperta: true }), null);
});

test('chiudere la schermata senza rispondere NON perde niente e la fascia la riporta: stesso conteggio prima e dopo', () => {
  const personaggi = lista(['Aiko', 4]);
  assert.equal(fasciaRientro({ personaggi, aperta: true }), null);
  const dopoLaChiusura = fasciaRientro({ personaggi, aperta: false });
  assert.equal(dopoLaChiusura.n, 4, 'le quattro righe ci sono ancora e si possono riaprire');
});

test('più personaggi: il conteggio è il totale e il testo dice quanti personaggi', () => {
  const f = riassuntoRientro(lista(['Aiko', 4], ['Lucas', 2]));
  assert.equal(f.n, 6);
  assert.equal(f.personaggi, 2);
  assert.match(f.testo, /6 modifiche/);
  assert.match(f.testo, /2 personaggi/);
});

test('una modifica sola: singolare', () => {
  assert.match(riassuntoRientro(lista(['Aiko', 1])).testo, /1 modifica fatta senza collegamento/);
});

test('la fascia legge dalla stessa struttura che la coda del tablet scrive (non una chiave sua)', () => {
  // dal deposito: aggiungiOperazioni (come lo scrive POST …/giornale) → lo stesso elenco che GET /api/rientro serve
  // alla schermata e alla fascia. Il difetto del 21/10 era una coda scritta con una chiave e letta con un'altra.
  const { rientro } = aggiungiOperazioni(rientroVuoto(), PG, [op('a'), op('b')], { nome: 'Aiko Tenzan' });
  const serviti = [{ pgId: PG, nome: 'Aiko Tenzan', righe: inAttesaDi(rientro, PG).map((o) => rigaOperazione(o, {})) }];
  assert.equal(fasciaRientro({ personaggi: serviti }).n, 2);
});
