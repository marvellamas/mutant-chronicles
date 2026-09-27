// Calendario di gioco (src/calendario.js): date, avanzamento, note, ricerca, migrazione e file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali, copia } from './helpers.js';
import { validaDati } from '../src/validate.js';
import {
  dataValida, aggiungiGiorni, aggiungiMesi, giornoSettimana, inizioSettimana, grigliaMese, nomeData,
  nuovoCalendario, normalizzaCalendario, attivaCalendario, disattivaCalendario, calendarioAttivo,
  avanzaFascia, avanzaGiorno, impostaOggi, aggiungiNota, modificaNota, spostaNota, eliminaNota,
  noteDi, ordinaNote, riepilogo, filtraNote, filtroVuoto, contaNote,
} from '../src/calendario.js';
import { serializza, deserializzaPersonaggio, nuoveScelte, VERSIONE_FORMATO } from '../src/character.js';

const { dati } = await datiReali();
let n = 0;
const nota = (c, campi) => aggiungiNota(c, campi, { id: `n${++n}`, creato: `2026-09-27T10:00:${String(n).padStart(2, '0')}Z` }, dati);

test('regole.json → calendario: quattro fasce in ordine, tre bandierine', () => {
  assert.deepEqual(dati.regole.calendario.fasce.map((f) => f.id), ['mattina', 'pomeriggio', 'sera', 'notte']);
  assert.deepEqual(dati.regole.calendario.bandierine.map((b) => [b.id, b.nome]), [['rosso', 'Cruciale'], ['giallo', 'Importante'], ['verde', 'Minore']]);
  const x = copia(dati);
  x.regole.calendario.fasce.push({ id: 'mattina', nome: 'Alba' });
  x.regole.calendario.bandierine.reverse();
  const e = validaDati(x).map((y) => `${y.chiave}: ${y.problema}`).join('\n');
  assert.match(e, /calendario\.fasce: .*id diversi/);
  assert.match(e, /calendario\.bandierine: servono rosso, giallo e verde/);
});

test('date: validità, giorni e mesi attraverso fine mese, fine anno e anni bisestili', () => {
  assert.equal(dataValida('2024-02-29'), true);
  assert.equal(dataValida('2023-02-29'), false);
  assert.equal(dataValida('2026-13-01'), false);
  assert.equal(dataValida('1283-06-15'), true); // anni della campagna
  assert.equal(aggiungiGiorni('2026-01-31', 1), '2026-02-01');
  assert.equal(aggiungiGiorni('2026-12-31', 1), '2027-01-01');
  assert.equal(aggiungiGiorni('2024-02-28', 1), '2024-02-29');
  assert.equal(aggiungiGiorni('2027-01-01', -1), '2026-12-31');
  assert.equal(aggiungiGiorni('0099-12-31', 1), '0100-01-01');
  assert.equal(aggiungiMesi('2026-01-31', 1), '2026-02-28');
  assert.equal(aggiungiMesi('2026-12-15', 1), '2027-01-15');
  assert.equal(aggiungiMesi('2026-01-15', -1), '2025-12-15');
  assert.equal(giornoSettimana('2026-09-27'), 6); // domenica
  assert.equal(inizioSettimana('2026-09-27'), '2026-09-21');
  assert.equal(inizioSettimana('2027-01-01'), '2026-12-28'); // la settimana scavalca l'anno
  const g = grigliaMese('2026-02-10'); // febbraio 2026 comincia di domenica
  assert.equal(g[0][0], '2026-01-26');
  assert.equal(g.at(-1).at(-1), '2026-03-01');
  assert.ok(g.every((s) => s.length === 7));
  assert.equal(nomeData('2026-09-27'), 'domenica 27 settembre 2026');
  assert.equal(nomeData('2026-09-27', { breve: true }), 'dom 27 set');
});

test('attivazione: inizio e fascia scelti; disattivare conserva le note; riattivare le ritrova', () => {
  assert.equal(nuovoCalendario('2026-02-30', 'mattina', dati), null);
  assert.equal(nuovoCalendario('2026-02-10', 'alba', dati), null);
  const c = attivaCalendario(null, { inizio: '1283-06-15', fascia: 'sera' }, dati);
  assert.deepEqual(c, { attivo: true, inizio: '1283-06-15', oggi: { data: '1283-06-15', fascia: 'sera' }, note: [] });
  const conNota = nota(c, { data: '1283-06-15', fascia: 'sera', testo: 'Arrivo a Luna City' });
  const spento = disattivaCalendario(conNota);
  assert.equal(calendarioAttivo(spento), false);
  assert.equal(contaNote(spento), 1);
  const riacceso = attivaCalendario(spento, { inizio: '2000-01-01', fascia: 'mattina' }, dati);
  assert.equal(calendarioAttivo(riacceso), true);
  assert.equal(riacceso.inizio, '1283-06-15');
  assert.equal(contaNote(riacceso), 1);
});

test('avanza: «+ fascia» da Notte passa alla Mattina del giorno dopo, anche a fine mese e anno', () => {
  let c = nuovoCalendario('2026-12-31', 'mattina', dati);
  c = avanzaFascia(c, dati);
  assert.deepEqual(c.oggi, { data: '2026-12-31', fascia: 'pomeriggio' });
  c = avanzaFascia(avanzaFascia(c, dati), dati);
  assert.deepEqual(c.oggi, { data: '2026-12-31', fascia: 'notte' });
  c = avanzaFascia(c, dati);
  assert.deepEqual(c.oggi, { data: '2027-01-01', fascia: 'mattina' });
  // «+ giorno»: Mattina del giorno dopo, da qualunque fascia
  const s = impostaOggi(c, '2026-02-28', 'sera', dati);
  assert.deepEqual(avanzaGiorno(s, dati).oggi, { data: '2026-03-01', fascia: 'mattina' });
  assert.equal(impostaOggi(c, '2026-02-29', 'sera', dati), null);
  // l'originale non cambia (funzioni pure: «Annulla» torna allo stato di prima)
  assert.deepEqual(s.oggi, { data: '2026-02-28', fascia: 'sera' });
});

test('note: aggiungere, modificare, spostare, eliminare; testo vuoto o fascia errata non passano', () => {
  let c = nuovoCalendario('2026-09-27', 'mattina', dati);
  assert.equal(nota(c, { data: '2026-09-27', fascia: 'mattina', testo: '   ' }), null);
  assert.equal(nota(c, { data: '2026-09-27', fascia: 'alba', testo: 'x' }), null);
  c = nota(c, { data: '2026-09-27', fascia: 'sera', testo: '  Incontro con l’Inquisitore ', colore: 'rosso', ricordare: true });
  const [a] = c.note;
  assert.deepEqual([a.testo, a.colore, a.ricordare], ['Incontro con l’Inquisitore', 'rosso', true]);
  assert.equal(nota(c, { data: '2026-09-27', fascia: 'sera', testo: 'x', colore: 'viola' }).note[1].colore, null);
  c = modificaNota(c, a.id, { testo: 'Incontro rimandato', colore: null }, dati);
  assert.deepEqual([c.note[0].testo, c.note[0].colore, c.note[0].ricordare], ['Incontro rimandato', null, true]);
  assert.equal(modificaNota(c, a.id, { testo: '' }, dati), null);
  c = spostaNota(c, a.id, '2026-09-28', 'mattina', dati);
  assert.deepEqual([c.note[0].data, c.note[0].fascia], ['2026-09-28', 'mattina']);
  assert.equal(spostaNota(c, a.id, '2026-09-31', 'mattina', dati), null);
  assert.equal(eliminaNota(c, 'nessuna'), null);
  assert.equal(contaNote(eliminaNota(c, a.id)), 0);
});

test('ordine cronologico, note di un giorno e riepilogo per Settimana e Mese', () => {
  let c = nuovoCalendario('2026-09-27', 'mattina', dati);
  c = nota(c, { data: '2026-09-28', fascia: 'mattina', testo: 'C' });
  c = nota(c, { data: '2026-09-27', fascia: 'notte', testo: 'B', colore: 'verde' });
  c = nota(c, { data: '2026-09-27', fascia: 'mattina', testo: 'A', colore: 'rosso', ricordare: true });
  c = nota(c, { data: '2026-09-27', fascia: 'notte', testo: 'B2', colore: 'rosso' });
  assert.deepEqual(ordinaNote(c.note, dati).map((x) => x.testo), ['A', 'B', 'B2', 'C']);
  assert.deepEqual(noteDi(c, '2026-09-27', 'notte', dati).map((x) => x.testo), ['B', 'B2']);
  assert.deepEqual(riepilogo(noteDi(c, '2026-09-27', null, dati)), { colori: ['rosso', 'verde'], ricordare: true, n: 3 });
  assert.deepEqual(riepilogo([]), { colori: [], ricordare: false, n: 0 });
});

test('ricerca: bandierine in alternativa, «M» e testo in aggiunta, senza maiuscole né accenti', () => {
  let c = nuovoCalendario('2026-09-27', 'mattina', dati);
  c = nota(c, { data: '2026-10-02', fascia: 'sera', testo: 'Città di Heimburg', colore: 'rosso' });
  c = nota(c, { data: '2026-09-30', fascia: 'mattina', testo: 'Debito con il ricettatore', colore: 'giallo', ricordare: true });
  c = nota(c, { data: '2026-09-29', fascia: 'notte', testo: 'Pioggia', ricordare: true });
  c = nota(c, { data: '2026-09-29', fascia: 'mattina', testo: 'Colazione' });
  const t = (f) => filtraNote(c, f, dati).map((x) => x.testo);
  assert.deepEqual(t({}), ['Colazione', 'Pioggia', 'Debito con il ricettatore', 'Città di Heimburg']);
  assert.deepEqual(t({ colori: ['rosso', 'giallo'] }), ['Debito con il ricettatore', 'Città di Heimburg']);
  assert.deepEqual(t({ colori: ['nessuna'] }), ['Colazione', 'Pioggia']);
  assert.deepEqual(t({ ricordare: true }), ['Pioggia', 'Debito con il ricettatore']);
  assert.deepEqual(t({ colori: ['giallo'], ricordare: true }), ['Debito con il ricettatore']);
  assert.deepEqual(t({ testo: 'CITTA' }), ['Città di Heimburg']);
  assert.deepEqual(t({ testo: 'pioggia', colori: ['rosso'] }), []);
  assert.equal(filtroVuoto({ colori: [], ricordare: false, testo: '  ' }), true);
  assert.equal(filtroVuoto({ ricordare: true }), false);
});

test('migrazione: personaggi e file senza blocco non hanno il calendario; note non valide scartate', () => {
  assert.equal(normalizzaCalendario(undefined, dati), null);
  assert.equal(normalizzaCalendario('sì', dati), null);
  assert.equal(normalizzaCalendario({ attivo: true, inizio: 'ieri' }, dati), null);
  const c = normalizzaCalendario({
    attivo: true, inizio: '2026-09-27', oggi: { data: '2026-09-29', fascia: 'alba' },
    note: [
      { id: 'a', data: '2026-09-27', fascia: 'sera', testo: 'ok', colore: 'blu', ricordare: 'sì' },
      { id: 'b', data: '2026-02-30', fascia: 'sera', testo: 'data impossibile' },
      { data: '2026-09-27', fascia: 'sera', testo: 'senza id' },
      'rotta',
    ],
  }, dati);
  assert.deepEqual(c.oggi, { data: '2026-09-29', fascia: 'mattina' });
  assert.deepEqual(c.note, [{ id: 'a', data: '2026-09-27', fascia: 'sera', testo: 'ok', colore: null, ricordare: false, creato: null }]);
  assert.equal(normalizzaCalendario({ inizio: '2026-09-27' }, dati).attivo, false);
});

test('file del personaggio (formato 6): il calendario va e torna; i file di prima si leggono senza', () => {
  assert.ok(VERSIONE_FORMATO >= 6); // dal formato 6 (il 7 aggiunge i PI nella sessione)
  let c = nuovoCalendario('2026-09-27', 'pomeriggio', dati);
  c = nota(c, { data: '2026-09-27', fascia: 'pomeriggio', testo: 'Partenza', colore: 'giallo', ricordare: true });
  const sessione = { pvAttuali: 10 };
  const testo = serializza(nuoveScelte(), { livelli: [], sessione, calendario: c });
  const letto = deserializzaPersonaggio(testo);
  assert.deepEqual(normalizzaCalendario(letto.calendario, dati), c);
  assert.deepEqual(letto.sessione, sessione);
  // senza calendario il file non ha il campo; un file del formato 5 si legge con calendario null
  assert.equal('calendario' in JSON.parse(serializza(nuoveScelte(), {})), false);
  const vecchio = JSON.stringify({ formato: 'mutant-personaggio', versione: 5, scelte: nuoveScelte() });
  assert.equal(deserializzaPersonaggio(vecchio).calendario, null);
});
