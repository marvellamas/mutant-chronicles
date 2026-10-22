// Il giornale delle operazioni (21/10/2026, quarto lotto: «si può modificare offline, e al rientro Davide
// approva»). Il punto su cui si regge tutto: variazioni che si sommano senza mai un conflitto, assegnazioni
// che sono un conflitto vero solo se cambiate da entrambe le parti, idempotenza di chi riapplica.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tipoCampo, operazioniDaDiff, applicaOperazione, unisciGiornale } from '../src/giornale.js';

test('tipoCampo: si somma solo un contatore dichiarato; un elenco è un insieme, il resto è un\'assegnazione', () => {
  assert.equal(tipoCampo(['sessione', 'pvAttuali'], 8), 'somma');
  assert.equal(tipoCampo(['sessione', 'statiAttivi'], ['Sanguinamento']), 'insieme');
  assert.equal(tipoCampo(['scelte', 'nome'], 'Aiko'), 'assegna');
  assert.equal(tipoCampo(['sessione', 'bonusTalenti'], true), 'assegna');
  // chiavi dinamiche: i modelli con «*»
  assert.equal(tipoCampo(['sessione', 'integrita', 'uid-1'], 4), 'somma');
  assert.equal(tipoCampo(['sessione', 'munizioni', 'uid-1', 'colpi'], 6), 'somma');
});

test('tipoCampo: un numero che NON è un contatore si assegna (il danno silenzioso del 22/10)', () => {
  // il caso dell'esempio: FOR da 10 a 12 non è «+2» da sommare a quello che ha fatto Davide
  assert.equal(tipoCampo(['scelte', 'puntiCaratteristica', 'FOR'], 12), 'assegna');
  assert.equal(tipoCampo(['scelte', 'puntiAbilitaLiberi', 'Furtività'], 3), 'assegna');
  // gradini e indici: 3 + 2 non è un gradino di Ferita che esiste
  assert.equal(tipoCampo(['sessione', 'ferite'], 3), 'assegna');
  assert.equal(tipoCampo(['sessione', 'affaticamento'], 2), 'assegna');
  assert.equal(tipoCampo(['sessione', 'corruzione'], 1), 'assegna');
  // riferimenti temporali e valori scritti interi
  assert.equal(tipoCampo(['sessione', 'round'], 3), 'assegna');
  assert.equal(tipoCampo(['scelte', 'puntiEsperienza'], 1900), 'assegna');
  assert.equal(tipoCampo(['sessione', 'caricoExtra'], 12), 'assegna');
  // un campo numerico nuovo, che nessuno ha ancora classificato: assegnazione, mai somma
  assert.equal(tipoCampo(['sessione', 'campoNuovoDiDomani'], 7), 'assegna');
});

test('tipoCampo: i due elenchi di numeri dichiarati non sono insiemi (due carichini da 3 colpi sono due cose)', () => {
  assert.equal(tipoCampo(['sessione', 'carichini', 'uid-1'], [3, 3]), 'assegna');
  assert.equal(tipoCampo(['sessione', 'munizioni', 'uid-1', 'parziali'], [2, 2]), 'assegna');
});

test('operazioniDaDiff: una variazione di PV, con l\'etichetta', () => {
  const prima = { sessione: { pvAttuali: 15 } };
  const dopo = { sessione: { pvAttuali: 10 } };
  const op = operazioniDaDiff(prima, dopo, { quando: '2026-10-21T21:40:00.000Z', etichette: { 'sessione.pvAttuali': ({ delta }) => `${delta > 0 ? '+' : ''}${delta} PV` } });
  assert.equal(op.length, 1);
  assert.equal(op[0].tipo, 'somma');
  assert.equal(op[0].delta, -5);
  assert.equal(op[0].etichetta, '-5 PV');
  assert.ok(op[0].id);
  assert.equal(op[0].quando, '2026-10-21T21:40:00.000Z');
});

test('operazioniDaDiff: nessuna operazione se niente è cambiato', () => {
  const s = { sessione: { pvAttuali: 10, statiAttivi: ['Rallentato'] }, scelte: { nome: 'Aiko' } };
  assert.deepEqual(operazioniDaDiff(s, structuredClone(s)), []);
});

test('operazioniDaDiff: uno Stato acceso è «insieme: aggiungi»; uno spento è «insieme: togli»', () => {
  const prima = { sessione: { statiAttivi: ['Rallentato'] } };
  const dopo = { sessione: { statiAttivi: ['Rallentato', 'Sanguinamento'] } };
  const op = operazioniDaDiff(prima, dopo);
  assert.equal(op.length, 1);
  assert.equal(op[0].tipo, 'insieme');
  assert.equal(op[0].azione, 'aggiungi');
  assert.equal(op[0].valore, 'Sanguinamento');

  const spento = operazioniDaDiff(dopo, prima);
  assert.equal(spento.length, 1);
  assert.equal(spento[0].azione, 'togli');
  assert.equal(spento[0].valore, 'Sanguinamento');
});

test('operazioniDaDiff: un oggetto aggiunto all\'equipaggiamento (identità per uid)', () => {
  const prima = { scelte: { equipaggiamento: [{ uid: 'a1', rif: 'pergamena-cura-ferite', quantita: 2 }] } };
  const dopo = { scelte: { equipaggiamento: [{ uid: 'a1', rif: 'pergamena-cura-ferite', quantita: 2 }, { uid: 'a2', rif: 'pergamena-cura-ferite', quantita: 1 }] } };
  const op = operazioniDaDiff(prima, dopo);
  assert.equal(op.length, 1);
  assert.equal(op[0].azione, 'aggiungi');
  assert.equal(op[0].valore.uid, 'a2');
});

test('operazioniDaDiff: un testo cambiato è un\'assegnazione, con «visto» e «nuovo»', () => {
  const prima = { calendario: { oggi: { nota: 'vecchia' } } };
  const dopo = { calendario: { oggi: { nota: 'nuova' } } };
  const op = operazioniDaDiff(prima, dopo);
  assert.equal(op.length, 1);
  assert.equal(op[0].tipo, 'assegna');
  assert.equal(op[0].visto, 'vecchia');
  assert.equal(op[0].nuovo, 'nuova');
});

test('applicaOperazione: una somma si aggiunge al valore attuale, qualunque esso sia', () => {
  const op = { tipo: 'somma', percorso: ['sessione', 'pvAttuali'], delta: -5 };
  assert.equal(applicaOperazione({ sessione: { pvAttuali: 20 } }, op).sessione.pvAttuali, 15);
});

test('applicaOperazione: un insieme è idempotente (aggiungere chi c\'è già, o togliere chi non c\'è, non fa niente)', () => {
  const aggiungi = { tipo: 'insieme', percorso: ['sessione', 'statiAttivi'], azione: 'aggiungi', valore: 'Sanguinamento', identita: 'Sanguinamento' };
  const unaVolta = applicaOperazione({ sessione: { statiAttivi: [] } }, aggiungi);
  assert.deepEqual(unaVolta.sessione.statiAttivi, ['Sanguinamento']);
  const dueVolte = applicaOperazione(unaVolta, aggiungi);
  assert.deepEqual(dueVolte.sessione.statiAttivi, ['Sanguinamento']); // non duplicato
  assert.strictEqual(dueVolte, unaVolta); // niente da scrivere: stesso oggetto
});

// --- i casi del prompt ---

test('una variazione offline si somma a una del Direttore: nessun conflitto, risultato giusto', () => {
  // il tablet è partito da PV 15, ha tolto 5 (giornale: −5 PV); nel frattempo il Direttore ne ha dati 10 (il
  // server è salito a 25): il rientro deve dare 20, non 10 né un conflitto
  const op = { id: 'op-1', tipo: 'somma', percorso: ['sessione', 'pvAttuali'], delta: -5 };
  const serverAttuale = { sessione: { pvAttuali: 25 } };
  const { risultato, applicati, conflitti } = unisciGiornale(serverAttuale, [op]);
  assert.equal(risultato.sessione.pvAttuali, 20);
  assert.deepEqual(applicati, ['op-1']);
  assert.equal(conflitti.length, 0);
});

test('un\'assegnazione cambiata da entrambe le parti è un conflitto vero: non si applica, non si scarta', () => {
  const op = { id: 'op-2', tipo: 'assegna', percorso: ['calendario', 'oggi', 'nota'], visto: 'vecchia', nuovo: 'dal tablet' };
  const serverAttuale = { calendario: { oggi: { nota: 'cambiata da Davide' } } };
  const { risultato, applicati, conflitti } = unisciGiornale(serverAttuale, [op]);
  assert.equal(risultato.calendario.oggi.nota, 'cambiata da Davide'); // non toccata
  assert.deepEqual(applicati, []);
  assert.equal(conflitti.length, 1);
  assert.equal(conflitti[0].operazione.id, 'op-2');
  assert.equal(conflitti[0].attuale, 'cambiata da Davide');
});

test('FOR cambiata da entrambe le parti è un conflitto, non una somma (il caso del 22/10)', () => {
  // il tablet è partito da FOR con 2 punti assegnati e li ha portati a 4; nel frattempo il Direttore li ha
  // portati a 3. Sommare darebbe 5: un numero che nessuno dei due ha mai scritto. Deve essere una domanda.
  const prima = { scelte: { puntiCaratteristica: { FOR: 2 } } };
  const dopo = { scelte: { puntiCaratteristica: { FOR: 4 } } };
  const [op] = operazioniDaDiff(prima, dopo);
  assert.equal(op.tipo, 'assegna');
  assert.equal(op.visto, 2);
  assert.equal(op.nuovo, 4);
  const server = { scelte: { puntiCaratteristica: { FOR: 3 } } };
  const { risultato, applicati, conflitti } = unisciGiornale(server, [{ ...op, id: 'op-for' }]);
  assert.equal(risultato.scelte.puntiCaratteristica.FOR, 3); // non toccata, non sommata
  assert.deepEqual(applicati, []);
  assert.equal(conflitti.length, 1);
  assert.equal(conflitti[0].attuale, 3);
});

test('i PV cambiati da entrambe le parti si sommano (il contrario di FOR)', () => {
  const prima = { sessione: { pvAttuali: 20 } };
  const dopo = { sessione: { pvAttuali: 15 } }; // il giocatore ha subito 5 danni offline
  const [op] = operazioniDaDiff(prima, dopo);
  assert.equal(op.tipo, 'somma');
  // nel frattempo il Direttore ne ha tolti 3 dalla plancia: il server è a 17
  const { risultato, conflitti } = unisciGiornale({ sessione: { pvAttuali: 17 } }, [{ ...op, id: 'op-pv' }]);
  assert.equal(risultato.sessione.pvAttuali, 12); // 17 − 5: tutti e due i danni contano
  assert.equal(conflitti.length, 0);
});

test('una nota del calendario riscritta da entrambe le parti è un conflitto (elemento cambiato dentro)', () => {
  // senza il ramo «aggiorna» questa modifica sparirebbe in silenzio: l'id della nota c'è prima e dopo, quindi
  // non è né un'aggiunta né una rimozione
  const prima = { calendario: { note: [{ id: 'n1', testo: 'incontro al porto' }] } };
  const dopo = { calendario: { note: [{ id: 'n1', testo: 'incontro al porto, rimandato' }] } };
  const [op] = operazioniDaDiff(prima, dopo);
  assert.equal(op.tipo, 'insieme');
  assert.equal(op.azione, 'aggiorna');
  assert.equal(op.identita, 'n1');
  // il Direttore ha riscritto la stessa nota: conflitto vero, con le due versioni
  const server = { calendario: { note: [{ id: 'n1', testo: 'incontro al porto, annullato' }] } };
  const { risultato, applicati, conflitti } = unisciGiornale(server, [{ ...op, id: 'op-nota' }]);
  assert.deepEqual(risultato.calendario.note, server.calendario.note);
  assert.deepEqual(applicati, []);
  assert.equal(conflitti[0].attuale.testo, 'incontro al porto, annullato');
  assert.equal(conflitti[0].operazione.nuovo.testo, 'incontro al porto, rimandato');
  // se invece il Direttore non l'ha toccata, si applica senza chiedere
  const pulito = unisciGiornale(prima, [{ ...op, id: 'op-nota' }]);
  assert.equal(pulito.risultato.calendario.note[0].testo, 'incontro al porto, rimandato');
  assert.equal(pulito.conflitti.length, 0);
});

test('un\'assegnazione NON cambiata sul server si applica senza chiedere', () => {
  const op = { id: 'op-3', tipo: 'assegna', percorso: ['calendario', 'oggi', 'nota'], visto: 'vecchia', nuovo: 'dal tablet' };
  const serverAttuale = { calendario: { oggi: { nota: 'vecchia' } } };
  const { risultato, applicati, conflitti } = unisciGiornale(serverAttuale, [op]);
  assert.equal(risultato.calendario.oggi.nota, 'dal tablet');
  assert.deepEqual(applicati, ['op-3']);
  assert.equal(conflitti.length, 0);
});

test('un\'operazione approvata (applicata) due volte non si conta due volte', () => {
  const op = { id: 'op-4', tipo: 'somma', percorso: ['sessione', 'pvAttuali'], delta: -5 };
  const primo = unisciGiornale({ sessione: { pvAttuali: 20 } }, [op]);
  assert.equal(primo.risultato.sessione.pvAttuali, 15);
  assert.deepEqual(primo.applicati, ['op-4']);
  // ripresentato lo stesso giornale (per esempio dopo un errore di rete a metà approvazione), con l'insieme
  // delle operazioni già applicate: non si tocca niente una seconda volta
  const applicate = new Set(primo.applicati);
  const secondo = unisciGiornale(primo.risultato, [op], applicate);
  assert.equal(secondo.risultato.sessione.pvAttuali, 15); // invariato, non 10
  assert.deepEqual(secondo.applicati, []); // niente di nuovo applicato
});

test('più operazioni in ordine: variazioni e un\'assegnazione insieme, idempotenti una per una', () => {
  const ops = [
    { id: 'a', tipo: 'somma', percorso: ['sessione', 'pvAttuali'], delta: -5 },
    { id: 'b', tipo: 'somma', percorso: ['sessione', 'pmAttuali'], delta: -3 },
    { id: 'c', tipo: 'insieme', percorso: ['sessione', 'statiAttivi'], azione: 'aggiungi', valore: 'Sanguinamento', identita: 'Sanguinamento' },
  ];
  const server = { sessione: { pvAttuali: 15, pmAttuali: 9, statiAttivi: [] } };
  const { risultato, applicati, conflitti } = unisciGiornale(server, ops);
  assert.equal(risultato.sessione.pvAttuali, 10);
  assert.equal(risultato.sessione.pmAttuali, 6);
  assert.deepEqual(risultato.sessione.statiAttivi, ['Sanguinamento']);
  assert.equal(applicati.length, 3);
  assert.equal(conflitti.length, 0);
  // riapplicato tutto (idempotenza di gruppo): nessun cambiamento ulteriore
  const rifatto = unisciGiornale(risultato, ops, new Set(applicati));
  assert.deepEqual(rifatto.risultato, risultato);
  assert.equal(rifatto.applicati.length, 0);
});
