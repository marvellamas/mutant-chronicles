import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 215 — la plancia vede quanti punti ha messo chi sta assegnando l'adeguamento (prima: «0/21» fino alla Conferma).
// Le regole che questo test difende:
//  1. è **solo informazione**: il tablet comunica un numero, il server lo tiene in memoria, NESSUN file di personaggio si scrive
//     (così non urta la regola dei punti tolti da un tablet);
//  2. vale **solo per quell'adeguamento** (stessa riga di registro e stesso monte) e non scende mai sotto quello scritto nel file;
//  3. scade, e un valore assurdo si rifiuta;
//  4. dopo la concessione lo strumento dice che manca ancora il passaggio vero (trovato dalla prova generale).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { normalizzaAvanzamento, conAvanzamentoTablet, SCADENZA_MS } from '../src/avanzamento-tablet.js';
import { stradeDelLivello } from '../src/adeguamento-abilita.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const ora = 1_000_000_000_000;
const plancia = { nome: 'X', stato: 'in corso', testo: 'in corso: 0/21 punti, ne restano 21', assegnati: 0, monte: 21, finito: false, riga: 'cm-1' };
const av = (o = {}) => ({ chiave: 'X', riga: 'cm-1', assegnati: 7, monte: 21, quando: ora, ...o });

test('l avanzamento del tablet si legge sulla riga della plancia, e dice che non è ancora confermato', () => {
  const r = conAvanzamentoTablet(plancia, av(), ora + 1000);
  assert.equal(r.assegnati, 7);
  assert.equal(r.sulTablet, true);
  assert.match(r.testo, /7\/21 punti sul tablet \(non ancora confermati\), ne restano 14/);
  assert.equal(r.finito, false);
});

test('tutti i punti messi ma non confermati: la plancia dice che manca solo «Conferma»', () => {
  const r = conAvanzamentoTablet(plancia, av({ assegnati: 21 }), ora);
  assert.match(r.testo, /manca solo «Conferma»/);
  assert.equal(r.finito, false, 'per il file non è finito: lo è solo alla Conferma');
});

test('vale solo per quell adeguamento: altra riga, altro monte, scaduto, o non in corso → invariato', () => {
  assert.equal(conAvanzamentoTablet(plancia, av({ riga: 'cm-2' }), ora), plancia);
  assert.equal(conAvanzamentoTablet(plancia, av({ monte: 14 }), ora), plancia);
  assert.equal(conAvanzamentoTablet(plancia, av(), ora + SCADENZA_MS + 1), plancia);
  const fatto = { ...plancia, stato: 'adeguato' };
  assert.equal(conAvanzamentoTablet(fatto, av(), ora), fatto);
  assert.equal(conAvanzamentoTablet(plancia, null, ora), plancia);
  assert.equal(conAvanzamentoTablet(null, av(), ora), null);
});

test('non scende mai sotto quello che il file dice già', () => {
  const nelFile = { ...plancia, assegnati: 9, testo: 'in corso: 9/21' };
  assert.equal(conAvanzamentoTablet(nelFile, av({ assegnati: 4 }), ora), nelFile);
});

test('normalizza: valori assurdi, mancanti o fuori dal monte si rifiutano', () => {
  assert.ok(normalizzaAvanzamento({ chiave: 'A', riga: 'r', assegnati: 3, monte: 21 }, ora));
  const brutti = [{}, { chiave: '', assegnati: 1, monte: 21 }, { chiave: 'A', assegnati: -1, monte: 21 }, { chiave: 'A', assegnati: 22, monte: 21 },
    { chiave: 'A', assegnati: 1.5, monte: 21 }, { chiave: 'A', assegnati: 1, monte: 0 }, { chiave: 'A', assegnati: 1, monte: 5000 }, { chiave: 'A', assegnati: '3', monte: 'x' }];
  for (const x of brutti) assert.equal(normalizzaAvanzamento(x, ora), null, JSON.stringify(x));
});

// --- il server: solo memoria, nessun file ---
const radice = mkdtempSync(join(tmpdir(), 'mutant-av215-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(radice, k)]));
let srv, base;
before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  srv = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe, px: c.px, eMaster: () => false });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${srv.address().port}`;
});
after(async () => { await new Promise((ok) => srv.close(ok)); rmSync(radice, { recursive: true, force: true }); });
const tutti = () => Object.fromEntries(Object.values(c).map((d) => [d, readdirSync(d).length]));
const json = { 'Content-Type': 'application/json' };

test('SERVER: un tablet (non master) comunica, la plancia legge, e NESSUN file viene scritto', async () => {
  const prima = tutti();
  const post = await fetch(`${base}/api/adeguamento/avanzamento`, { method: 'POST', headers: json, body: JSON.stringify({ chiave: 'BOTHA-PRETORIUS', riga: 'cm-1', assegnati: 5, monte: 21 }) });
  assert.equal(post.status, 200);
  const get = await (await fetch(`${base}/api/adeguamento/avanzamento`)).json();
  assert.equal(get.avanzamenti['BOTHA-PRETORIUS'].assegnati, 5);
  assert.deepEqual(tutti(), prima, 'nessuna cartella dei dati è cambiata: è solo memoria');
  assert.equal(readdirSync(c.personaggi).length, 0, 'e in particolare nessun file di personaggio');
});

test('SERVER: un valore assurdo è 400; il DELETE toglie; i metodi strani 405', async () => {
  const brutto = await fetch(`${base}/api/adeguamento/avanzamento`, { method: 'POST', headers: json, body: JSON.stringify({ chiave: 'A', assegnati: 99, monte: 21 }) });
  assert.equal(brutto.status, 400);
  const nonJson = await fetch(`${base}/api/adeguamento/avanzamento`, { method: 'POST', body: 'non è json' });
  assert.equal(nonJson.status, 400);
  const del = await fetch(`${base}/api/adeguamento/avanzamento?chiave=BOTHA-PRETORIUS`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const dopo = await (await fetch(`${base}/api/adeguamento/avanzamento`)).json();
  assert.equal(Object.keys(dopo.avanzamenti).length, 0);
  assert.equal((await fetch(`${base}/api/adeguamento/avanzamento`, { method: 'PUT', body: '{}' })).status, 405);
});

// --- la concessione non fa salire di livello: lo strumento lo dice ---
test('dopo la concessione lo strumento dice che manca il passaggio vero, e il monte non cambia', () => {
  const o = JSON.parse(readFileSync(new URL('../esempi/Fratello-Anselmo-Viri_liv3_2026-10-02.json', import.meta.url), 'utf8'));
  const sette = { ...o, livelli: Array.from({ length: 6 }, () => ({})), scelte: { ...o.scelte, puntiEsperienza: 1022 } };
  const senza = stradeDelLivello(sette, dati);
  assert.ok(senza.strade.some((x) => /serata di PX/.test(x)));
  const conc = { ...sette, correzioni_master: [{ id: 'c1', quando: '2026-11-17T16:00:00Z', chiave: 'livello', etichetta: 'Passaggio al livello 8 concesso', tipo: 'concessione', motivo: 'Direttore 0.51 §9.8.3', stato: 'attiva', livello: 8 }] };
  const con = stradeDelLivello(conc, dati);
  assert.equal(con.monte, senza.monte, 'il monte non cambia con la sola concessione');
  assert.equal(con.strade.length, 1);
  assert.match(con.strade[0], /concessione per il 8° è già registrata/);
  assert.match(con.strade[0], /«Sali al livello 8»/);
  assert.ok(!con.strade.some((x) => /serata di PX/.test(x)), 'non propone più di nuovo la concessione');
});
