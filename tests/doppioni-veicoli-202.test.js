import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 202 (15/11/2026), parte A: **un mezzo non diventa due record, per nessuna categoria.**
//
// Lo Scout dei PG era nel registro **tre volte** — 4, 9 e 26 ottobre, lo stesso mezzo numero per numero (lotto
// 201) — e due dei tre sono poi spariti lasciando appesi Pablo e Lucas. Nasceva un record nuovo ogni volta che una
// scheda che aveva lo Scout come copia locale lo passava al registro, perché la guardia dei doppioni valeva
// **solo** per i mezzi marcati «del gruppo»: `v.gruppo === true && registro.find(…)`. Lo Scout, nei file dei PG,
// non era marcato così.
//
// **Il controllo che deve restare verde:** un secondo record dello stesso mezzo **non del gruppo** è rifiutato
// dove si scrive, con il motivo e l'identificativo di quello che c'è già.
//
// E quello che non deve diventare rigido: due mezzi di due persone diverse non sono un doppione, un record che
// esiste si continua a salvare, e un secondo esemplare dichiarato passa. **Niente si fonde e niente si cancella.**
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { erroreDoppioneVeicolo, quandoNato } from '../src/veicoli.js';
import { migraVeicoli } from '../src/veicoli-registro.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const radice = mkdtempSync(join(tmpdir(), 'mutant-doppioni-202-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(radice, k)]));
let srv, base;

const PABLO = { pg: 'pg-pablo', chiave: 'PABLO-ZAION', nome: 'PABLO ZAION' };
const LUCAS = { pg: 'pg-lucas', chiave: 'LUCAS', nome: 'LUCAS' };

const record = (id, { profilo = 'asa-scout-mk4', nome = 'ASA Scout MK4', di = null, extra = {} } = {}) => ({
  formato: 'mutant-veicolo', versione: 1, id, revisione: 0, aggiornato: '2026-11-15T10:00:00.000Z',
  proprietario: di ? { tipo: 'pg', ...di } : { tipo: 'gruppo' }, conducente: null, mitragliere: null,
  mezzo: { uid: id, profilo, nome, andatura: 'fermo', pi: {}, rinforzi: {}, munizioni: [], avarie: '', ...extra }, movimento: null,
});
const metti = (r) => fetch(`${base}/api/veicoli/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) });

before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  srv = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe, px: c.px, eMaster: () => true });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${srv.address().port}`;
});
after(async () => {
  await new Promise((ok) => srv.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

// --- dove si scrive -------------------------------------------------------------------------------------

test('LA REGOLA: un secondo record dello stesso mezzo di un PG è rifiutato, e dice quale c’è già', async () => {
  // identificativi veri: 'vei' + Date.now() in base 36, cioè con la data di nascita dentro (lotto 201)
  assert.equal((await metti(record('veimwhny9s00', { di: PABLO }))).status, 200, 'il primo deve passare');

  const secondo = await metti(record('veimwhnzk2o1', { di: PABLO }));
  assert.equal(secondo.status, 409, 'il secondo è passato: è il caso dello Scout registrato tre volte');
  const corpo = await secondo.json();
  assert.equal(corpo.doppione, true);
  assert.match(corpo.errore, /c’è già/);
  assert.deepEqual(corpo.gia, ['veimwhny9s00'], 'deve dire l’identificativo di quello che c’è');
  assert.match(corpo.errore, /15 novembre/, 'e da quando quel record è in giro');
  assert.deepEqual(readdirSync(c.veicoli).sort(), ['veimwhny9s00.json'], 'il file del secondo è stato scritto comunque');
});

test('lo stesso per il gruppo (era il solo caso protetto prima)', async () => {
  assert.equal((await metti(record('veigr00000001'))).status, 200);
  const secondo = await metti(record('veigr00000002'));
  assert.equal(secondo.status, 409);
  assert.deepEqual((await secondo.json()).gia, ['veigr00000001']);
});

test('due mezzi di due persone diverse NON sono un doppione', async () => {
  assert.equal((await metti(record('veidue0000001', { di: LUCAS }))).status, 200);
  // Lucas ha il suo Scout, Pablo il suo: due mezzi, non uno registrato due volte
  const altro = await metti(record('veidue0000002', { profilo: 'autovettura-civile', nome: 'Autovettura', di: LUCAS }));
  assert.equal(altro.status, 200, 'un profilo diverso non è un doppione');
});

test('un secondo esemplare dichiarato passa: l’app avvisa, non blocca', async () => {
  const dichiarato = record('veidic0000001', { di: PABLO, extra: { esemplare_distinto: { quando: '2026-11-15T10:00:00.000Z', da: 'Direttore', motivo: 'il secondo Scout comprato a Luxor' } } });
  assert.equal((await metti(dichiarato)).status, 200, 'una dichiarazione del Direttore deve passare');
});

test('un record che c’è già si continua a salvare: niente si fonde e niente si cancella', async () => {
  const gia = readdirSync(c.veicoli).find((f) => f.startsWith('veimwhny9s00'));
  assert.ok(gia, 'il primo record deve essere ancora là');
  const letto = await fetch(`${base}/api/veicoli/veimwhny9s00`).then((r) => r.json());
  const salva = await metti({ ...letto, mezzo: { ...letto.mezzo, avarie: 'un graffio' } });
  assert.equal(salva.status, 200, 'un record esistente non si salva più: un doppione diventerebbe incorreggibile');
});

// --- la causa a monte: la migrazione --------------------------------------------------------------------

test('migraVeicoli: la guardia vale per un mezzo NON del gruppo (era il buco che ha prodotto tre record)', () => {
  const registro = [record('veigia0000001', { di: PABLO })];
  const locale = { uid: 'veinuovo00001', profilo: 'asa-scout-mk4', nome: 'ASA Scout MK4', gruppo: false };
  const e = migraVeicoli([locale], PABLO, registro);
  assert.deepEqual(e.nuovi, [], 'ha creato un secondo record dello stesso mezzo');
  assert.equal(e.avvisi.length, 1);
  assert.match(e.avvisi[0], /veigia0000001/, 'l’avviso deve dire quale record c’è già');
  assert.equal(e.veicoli[0], locale, 'il mezzo resta nel file del PG, non si unisce da solo');
});

test('migraVeicoli: il mezzo di un altro PG si migra, perché non è un doppione', () => {
  const registro = [record('veigia0000001', { di: PABLO })];
  const locale = { uid: 'veimio0000001', profilo: 'asa-scout-mk4', nome: 'il mio Scout', gruppo: false };
  const e = migraVeicoli([locale], LUCAS, registro);
  assert.equal(e.nuovi.length, 1, 'il mezzo di Lucas non è quello di Pablo');
  assert.deepEqual(e.avvisi, []);
});

test('migraVeicoli: un riferimento resta un riferimento, e un id già nel registro dà il riferimento', () => {
  const registro = [record('veigia0000001', { di: PABLO })];
  const rif = { uid: 'veiappeso0001', rif: 'veiappeso0001', nome: 'ASA Scout MK4' };
  assert.deepEqual(migraVeicoli([rif], PABLO, registro).veicoli, [rif], 'i riferimenti non si toccano (lotto 201)');
  const stesso = { uid: 'veigia0000001', profilo: 'asa-scout-mk4', nome: 'ASA Scout MK4' };
  assert.deepEqual(migraVeicoli([stesso], PABLO, registro).veicoli, [{ uid: 'veigia0000001', rif: 'veigia0000001', nome: 'ASA Scout MK4' }]);
});

// --- la funzione pura e la data di nascita --------------------------------------------------------------

test('erroreDoppioneVeicolo: null quando si può scrivere, il motivo quando no', () => {
  const uno = record('veiaaa0000001', { di: PABLO });
  const due = record('veibbb0000002', { di: PABLO });
  assert.equal(erroreDoppioneVeicolo(uno, [], dati), null);
  assert.equal(erroreDoppioneVeicolo(uno, [uno], dati), null, 'se stesso non è un doppione');
  assert.ok(erroreDoppioneVeicolo(due, [uno], dati));
  assert.equal(erroreDoppioneVeicolo(due, [record('veiccc0000003', { di: LUCAS })], dati), null, 'di un altro PG');
  assert.equal(erroreDoppioneVeicolo(due, [record('veiddd0000004')], dati), null, 'il gruppo non è un PG');
  assert.equal(erroreDoppioneVeicolo({ id: 'x', mezzo: {} }, [uno], dati), null, 'senza profilo non si decide niente');
});

test('quandoNato legge la data dentro l’identificativo: è quella scoperta nel lotto 201', () => {
  // gli uid dello Scout dei PG, con le date che il lotto 201 ha ricostruito
  assert.equal(quandoNato('veimuu14mqa0'), '4 ottobre');
  assert.equal(quandoNato('veimv15h6e40'), '9 ottobre');
  assert.equal(quandoNato('veimvozx57q0'), '26 ottobre');
  assert.equal(quandoNato('veimvzoj07y0'), '2 novembre');
  // quello che non si decodifica non si inventa
  assert.equal(quandoNato('veix'), null);
  assert.equal(quandoNato('qualcosaltro'), null);
  assert.equal(quandoNato(null), null);
  assert.equal(quandoNato('vei00000000'), null, 'una data impossibile non si mostra');
});
