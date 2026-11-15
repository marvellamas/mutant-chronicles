import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 202 (15/11/2026), parte B: **i token della mappa che rimandano al vuoto.**
//
// Lo stesso difetto dei veicoli della scheda (lotto 201), in un altro posto. `tokenOrfani` trovava già i token
// senza pezzo e la pagina li **toglieva da sé**: per un partecipante uscito dallo scontro è giusto, ed è il
// comportamento di sempre. Ma due casi non sono «è uscito», sono «il record è sparito» — un veicolo non più nel
// registro, e uno scontro collegato che non esiste nemmeno in archivio — e lì cancellare in silenzio è la
// decisione sbagliata presa senza chiedere.
//
// **I due controlli che devono restare verdi sempre:**
//   1. un token appeso **viene segnalato**, con l'identificativo e la data di nascita del record;
//   2. **non si ricollega senza una scelta del Direttore**, nemmeno con un candidato solo; e «togli dalla mappa»
//      c'è comunque, perché un token che non si può né riparare né buttare è il buco del lotto 201.
//
// E il controllo che tiene a bada il rumore: una scena collegata a uno scontro **chiuso o archiviato** non ha
// token appesi. Col criterio ingenuo, nelle sette scene della copia locale sarebbero 70 su 76; con questo sono 11
// in una scena sola. Un allarme che si impara a ignorare è peggio di nessun allarme.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenAppesi, candidatiPerToken, statoTokenAppeso, ricollegaToken, togliToken, quadroTokenAppesi,
} from '../src/riferimenti-rotti.js';

const FIAT_LUX = { id: 'veimvozx57q0', formato: 'mutant-veicolo', mezzo: { uid: 'veimvozx57q0', profilo: 'asa-scout-mk4', nome: 'FIAT LUX' } };
const tok = (id, rif, nome = null) => ({ id, rif, q: [1, 1], ingombro: 1, nascosto: false, ...(nome ? { nome } : {}) });
const scena = (token, extra = {}) => ({ formato: 'mutant-scena', versione: 1, id: 's1', nome: 'Scena di prova', token, ...extra });
const pezzo = (tipo, id, nome) => ({ chiave: `${tipo}:${id}`, rif: { tipo, id }, nome });

// --- 1. il token appeso si vede -------------------------------------------------------------------------

test('un token su un veicolo che non è più nel registro è appeso, e dice la data di nascita del record', () => {
  const s = scena([tok('t1', { tipo: 'veicolo', id: 'veimuu14mqa0' }, 'ASA Scout MK4')]);
  const a = tokenAppesi(s, [], { veicoli: [FIAT_LUX] });
  assert.equal(a.length, 1);
  assert.equal(a[0].tipo, 'veicolo');
  assert.equal(a[0].rif, 'veimuu14mqa0');
  assert.equal(a[0].nato, '4 ottobre', 'la data è scritta dentro l’identificativo (lotto 201)');
  // un veicolo che è nel registro e ha il suo pezzo non è appeso
  const buono = scena([tok('t2', { tipo: 'veicolo', id: 'veimvozx57q0' })]);
  assert.deepEqual(tokenAppesi(buono, [pezzo('veicolo', 'veimvozx57q0', 'FIAT LUX')], { veicoli: [FIAT_LUX] }), []);
  // e nemmeno se il record c'è ma il pezzo non c'è (il mezzo non è di questa scena: non è un difetto)
  assert.deepEqual(tokenAppesi(buono, [], { veicoli: [FIAT_LUX] }), []);
});

test('un segnaposto non rimanda a niente: non può essere appeso', () => {
  const s = scena([tok('t1', { tipo: 'segnaposto', id: 'libero-1' }, 'una cassa')]);
  assert.deepEqual(tokenAppesi(s, [], { veicoli: [] }), []);
});

test('IL RUMORE: una scena collegata a uno scontro chiuso o archiviato non ha token appesi', () => {
  const t = [tok('t1', { tipo: 'partecipante', id: 'pg:LUCAS' }), tok('t2', { tipo: 'partecipante', id: 'nem:lorath:1' })];
  const s = scena(t, { collegamento: { scontro: 'scontro-20261007-175903', bozza: null } });
  // lo scontro esiste (chiuso, in archivio): i token sono il ricordo di quel combattimento
  assert.deepEqual(tokenAppesi(s, [], { collegamento: 'presente' }), [], 'una scena di un combattimento finito non è un difetto');
  // nessun collegamento: mettere i PG su una mappa senza scontro è una cosa che si fa
  assert.deepEqual(tokenAppesi(scena(t), [], { collegamento: 'nessuno' }), []);
  // lo scontro non esiste da nessuna parte: allora sì
  const appesi = tokenAppesi(s, [], { collegamento: 'sparito' });
  assert.equal(appesi.length, 2);
  assert.match(appesi[0].motivo, /nemmeno in archivio/);
});

test('LA REGOLA: la riga dice il vero, con l’identificativo e la data del record', () => {
  const s = scena([tok('t1', { tipo: 'veicolo', id: 'veimuu14mqa0' }, 'ASA Scout MK4')]);
  const [a] = tokenAppesi(s, [], { veicoli: [FIAT_LUX] });
  const st = statoTokenAppeso(a, s, [], { veicoli: [FIAT_LUX], master: true });
  assert.match(st.testo, /veimuu14mqa0/, 'senza l’identificativo non si capisce di che token si parla');
  assert.match(st.testo, /4 ottobre/, 'da quando quel record era in giro');
  assert.match(st.testo, /non è più nel registro/);
  assert.match(st.testo, /FIAT LUX/, 'deve dire a cosa si può ricollegare');
  assert.match(st.testo, /Direttore/);
  assert.equal(st.candidati.length, 1);
});

test('il quadro dice quanti, in quali scene e di che tipo', () => {
  const s1 = scena([tok('t1', { tipo: 'veicolo', id: 'veimuu14mqa0' })], { nome: 'Deserto' });
  const s2 = scena([tok('t2', { tipo: 'partecipante', id: 'pg:LUCAS' }), tok('t3', { tipo: 'partecipante', id: 'pg:OSHI' })], { nome: 'Test Luci' });
  const q = quadroTokenAppesi([
    { nome: 'Deserto', scena: s1, pezzi: [], veicoli: [FIAT_LUX], collegamento: 'nessuno' },
    { nome: 'Test Luci', scena: s2, pezzi: [], veicoli: [], collegamento: 'sparito' },
    { nome: 'Pulita', scena: scena([]), pezzi: [], veicoli: [], collegamento: 'presente' },
  ]);
  assert.equal(q.quanti, 3);
  assert.equal(q.veicoli, 1);
  assert.equal(q.partecipanti, 2);
  assert.match(q.riga, /Deserto/);
  assert.match(q.riga, /Test Luci/);
  assert.ok(!/Pulita/.test(q.riga), 'una scena senza token appesi non compare');
  assert.match(quadroTokenAppesi([]).riga, /nessuno/);
});

// --- 2. non si ricollega da sé ---------------------------------------------------------------------------

test('LA REGOLA: senza una scelta del Direttore non si ricollega niente, nemmeno con un candidato solo', () => {
  const s = scena([tok('t1', { tipo: 'veicolo', id: 'veimuu14mqa0' })]);
  const senzaMaster = ricollegaToken(s, 't1', 'veimvozx57q0', { veicoli: [FIAT_LUX] });
  assert.ok(senzaMaster.errore, 'ha ricollegato senza il Direttore');
  assert.match(senzaMaster.errore, /solo il Direttore/);
  assert.equal(senzaMaster.scena, undefined);
  // guardare non cambia la scena
  const copia = JSON.stringify(s);
  tokenAppesi(s, [], { veicoli: [FIAT_LUX] });
  statoTokenAppeso(tokenAppesi(s, [], { veicoli: [FIAT_LUX] })[0], s, [], { veicoli: [FIAT_LUX] });
  assert.equal(JSON.stringify(s), copia, 'guardare ha cambiato la scena');
  // e togliere ha la stessa guardia
  assert.ok(togliToken(s, 't1').errore);
});

test('il Direttore ricollega un token di veicolo, e la scena dice da dove viene', () => {
  const s = scena([tok('t1', { tipo: 'veicolo', id: 'veimuu14mqa0' }, 'ASA Scout MK4')]);
  const e = ricollegaToken(s, 't1', 'veimvozx57q0', { master: true, veicoli: [FIAT_LUX], quando: '2026-11-15T12:00:00.000Z' });
  assert.ok(!e.errore, e.errore);
  assert.equal(e.scena.token.length, 1, 'si sostituisce il token, non se ne aggiunge un secondo');
  assert.deepEqual(e.token.rif, { tipo: 'veicolo', id: 'veimvozx57q0' });
  assert.deepEqual(e.token.ricollegato, { da: 'veimuu14mqa0', quando: '2026-11-15T12:00:00.000Z' });
  assert.equal(e.token.q[0], 1, 'il token resta dov’era');
  assert.match(e.riga, /veimuu14mqa0/);
  // adesso non è più appeso
  assert.deepEqual(tokenAppesi(e.scena, [pezzo('veicolo', 'veimvozx57q0', 'FIAT LUX')], { veicoli: [FIAT_LUX] }), []);
});

test('il Direttore ricollega un token di partecipante scegliendo fra i pezzi senza token', () => {
  const s = scena([tok('t1', { tipo: 'partecipante', id: 'pg:SPARITO' })], { collegamento: { scontro: 'sco-1', bozza: null } });
  const pezzi = [pezzo('partecipante', 'pg:LUCAS', 'LUCAS'), pezzo('partecipante', 'pg:OSHI', 'OSHI NAGATA')];
  const [a] = tokenAppesi(s, pezzi, { collegamento: 'sparito' });
  const cand = candidatiPerToken(a, s, pezzi);
  assert.deepEqual(cand.map((c) => c.id).sort(), ['pg:LUCAS', 'pg:OSHI']);
  const st = statoTokenAppeso(a, s, pezzi, { master: true });
  assert.match(st.testo, /2 cose/, 'con due candidati lo dice e non sceglie');
  const e = ricollegaToken(s, 't1', 'pg:LUCAS', { master: true, pezzi });
  assert.ok(!e.errore, e.errore);
  assert.deepEqual(e.scena.token[0].rif, { tipo: 'partecipante', id: 'pg:LUCAS' });
});

test('non si ricollega a qualcosa che non c’è, né sopra un token che esiste già', () => {
  const s = scena([tok('t1', { tipo: 'veicolo', id: 'veimuu14mqa0' }), tok('t2', { tipo: 'veicolo', id: 'veimvozx57q0' })]);
  assert.match(ricollegaToken(s, 't1', 'veinonesiste', { master: true, veicoli: [FIAT_LUX] }).errore, /non esiste/);
  assert.match(ricollegaToken(s, 't1', 'veimvozx57q0', { master: true, veicoli: [FIAT_LUX] }).errore, /ha già il suo token/);
  assert.match(ricollegaToken(s, 'tnonesiste', 'veimvozx57q0', { master: true, veicoli: [FIAT_LUX] }).errore, /non c’è il token/);
  // e un candidato già sulla mappa non si propone
  const [a] = tokenAppesi(s, [], { veicoli: [FIAT_LUX] });
  assert.deepEqual(candidatiPerToken(a, s, [], { veicoli: [FIAT_LUX] }), []);
});

test('«Togli dalla mappa» funziona sempre, anche senza nessun candidato', () => {
  const s = scena([tok('t1', { tipo: 'veicolo', id: 'veimuu14mqa0' }, 'ASA Scout MK4')]);
  const [a] = tokenAppesi(s, [], { veicoli: [] });
  const st = statoTokenAppeso(a, s, [], { veicoli: [], master: true });
  assert.deepEqual(st.candidati, []);
  assert.match(st.testo, /si toglie dalla mappa/);
  const e = togliToken(s, 't1', { master: true });
  assert.ok(!e.errore, e.errore);
  assert.deepEqual(e.scena.token, []);
  assert.match(e.riga, /veimuu14mqa0/);
});
