// Il giornale delle operazioni (21/10/2026, quarto lotto: «si può modificare offline, e al rientro Davide
// approva»). Il punto su cui si regge tutto: variazioni che si sommano senza mai un conflitto, assegnazioni
// che sono un conflitto vero solo se cambiate da entrambe le parti, idempotenza di chi riapplica.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tipoCampo, operazioniDaDiff, applicaOperazione, unisciGiornale } from '../src/giornale.js';

test('tipoCampo: un numero è una somma, un elenco è un insieme, il resto è un\'assegnazione', () => {
  assert.equal(tipoCampo(['sessione', 'pvAttuali'], 8), 'somma');
  assert.equal(tipoCampo(['sessione', 'statiAttivi'], ['Sanguinamento']), 'insieme');
  assert.equal(tipoCampo(['scelte', 'nome'], 'Aiko'), 'assegna');
  assert.equal(tipoCampo(['sessione', 'bonusTalenti'], true), 'assegna');
});

test('tipoCampo: le due eccezioni (un numero che non si somma)', () => {
  assert.equal(tipoCampo(['sessione', 'round'], 3), 'assegna');
  assert.equal(tipoCampo(['scelte', 'puntiEsperienza'], 1900), 'assegna');
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
