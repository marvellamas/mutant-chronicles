// Il rientro di un tablet, dal server (21–22/10/2026): POST /api/personaggi/<file>/giornale mette le modifiche
// fatte offline IN ATTESA (non applica niente), GET e POST /api/rientro sono la schermata del Direttore, e solo
// dal suo PC. Tutto il giro: quattro modifiche offline di cui una in conflitto, approvazione parziale, chiusura
// senza rispondere, e la risposta che torna al tablet.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { deserializzaPersonaggio, normalizza, serializza, nomeFileEsportazione } from '../src/character.js';
import { idPersonaggio } from '../src/storico-personaggi.js';
import { chiaveDaFile } from '../src/cartella.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const radice = mkdtempSync(join(tmpdir(), 'mutant-giornale-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(radice, k)]));
let srvMaster, baseMaster, srvTablet, baseTablet;
const ID1 = 'd-tablet-uno-1234';

before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  srvMaster = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe, px: c.px, eMaster: () => true });
  await new Promise((ok) => srvMaster.listen(0, '127.0.0.1', ok));
  baseMaster = `http://127.0.0.1:${srvMaster.address().port}`;
  srvTablet = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe, px: c.px, eMaster: () => false });
  await new Promise((ok) => srvTablet.listen(0, '127.0.0.1', ok));
  baseTablet = `http://127.0.0.1:${srvTablet.address().port}`;
});
after(async () => {
  await new Promise((ok) => srvMaster.close(ok));
  await new Promise((ok) => srvTablet.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

async function metti(nomeEsempio) {
  const testoBase = readFileSync(new URL(`../esempi/${nomeEsempio}`, import.meta.url), 'utf8');
  const p = deserializzaPersonaggio(testoBase);
  const { scelte } = normalizza(p.creazione, dati);
  const esportato = serializza(scelte, { versioniDati: JSON.parse(testoBase).versioni_dati, livelli: p.livelli, sessione: p.sessione, pg: JSON.parse(testoBase).pg });
  const file = nomeFileEsportazione(scelte.nome, 1 + p.livelli.length, new Date(2026, 9, 21));
  const w = await fetch(`${baseMaster}/api/personaggi/${encodeURIComponent(file)}`, { method: 'PUT', body: esportato });
  assert.equal(w.status, 200, await w.text());
  const pg = idPersonaggio(JSON.parse(testoBase), chiaveDaFile(file));
  return { file, pg, sessionePrima: p.sessione };
}

async function associa(id, pgId) {
  const r = await fetch(`${baseTablet}/api/dispositivo`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mutant-Dispositivo': id }, body: JSON.stringify({ pgId }) });
  assert.equal(r.status, 200, await r.text());
}

const letto = (file) => JSON.parse(readFileSync(join(c.personaggi, file), 'utf8'));

/** Il tablet manda il suo giornale, come al rientro. */
function manda(file, operazioni) {
  return fetch(`${baseTablet}/api/personaggi/${encodeURIComponent(file)}/giornale`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mutant-Da': 'giocatore', 'X-Mutant-Dispositivo': ID1 }, body: JSON.stringify({ operazioni }),
  });
}

/** Il Direttore risponde dalla sua schermata. */
function decidi(pgId, decisioni) {
  return fetch(`${baseMaster}/api/rientro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pgId, decisioni }) });
}

test('le modifiche offline restano in attesa: il personaggio non cambia finché Davide non risponde', async () => {
  const p = await metti('Fratello-Anselmo-Viri_liv3_2026-10-02.json');
  await associa(ID1, p.pg);
  const pvPrima = letto(p.file).sessione.pvAttuali;
  const op = { id: 'op-pv-1', tipo: 'somma', percorso: ['sessione', 'pvAttuali'], delta: -5, etichetta: '−5 PV', quando: '2026-10-21T21:40:00.000Z' };
  const r = await manda(p.file, [op]);
  const j = await r.json();
  assert.equal(r.status, 200, JSON.stringify(j));
  assert.deepEqual(j.inAttesa, ['op-pv-1']);
  assert.deepEqual(j.decise, {});
  assert.equal(letto(p.file).sessione.pvAttuali, pvPrima, 'il file non deve cambiare prima della conferma');

  // approvata dal Direttore: ADESSO si applica
  const d = await decidi(p.pg, { 'op-pv-1': 'approva' });
  const dj = await d.json();
  assert.equal(d.status, 200, JSON.stringify(dj));
  assert.deepEqual(dj.approvate, ['op-pv-1']);
  assert.equal(letto(p.file).sessione.pvAttuali, pvPrima - 5);
});

test('la schermata non compare se nessun tablet ha lavorato offline', async () => {
  // niente in attesa per nessuno: l'elenco è vuoto, quindi l'interfaccia non apre niente
  await decidiTutto();
  const r = await fetch(`${baseMaster}/api/rientro`);
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.deepEqual(j.personaggi, []);
});

/** Svuota l'attesa di tutti (le prove che seguono partono da una schermata vuota). */
async function decidiTutto() {
  const r = await fetch(`${baseMaster}/api/rientro`);
  const j = await r.json();
  for (const pg of j.personaggi) await decidi(pg.pgId, Object.fromEntries(pg.righe.map((x) => [x.id, 'scarta'])));
}

test('quattro modifiche offline di cui una in conflitto: l\'elenco del Direttore le mostra in ordine di ora', async () => {
  const p = await metti('Nadia-Ferro_liv4_2026-10-02.json');
  await associa(ID1, p.pg);
  const notePrima = letto(p.file).sessione.note ?? '';
  // mentre il tablet era offline, il Direttore ha riscritto le note: l'assegnazione del tablet sarà un conflitto
  const o = letto(p.file);
  await fetch(`${baseMaster}/api/personaggi/${encodeURIComponent(p.file)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...o, sessione: { ...o.sessione, note: 'nota del Direttore' } }) });

  const ops = [
    { id: 'q1', tipo: 'somma', percorso: ['sessione', 'pvAttuali'], delta: -5, etichetta: '−5 PV', quando: '2026-10-21T21:40:00.000Z' },
    { id: 'q2', tipo: 'somma', percorso: ['sessione', 'pmAttuali'], delta: -3, etichetta: '−3 PM', quando: '2026-10-21T21:44:00.000Z' },
    { id: 'q3', tipo: 'insieme', percorso: ['sessione', 'statiAttivi'], azione: 'aggiungi', valore: 'sanguinamento', identita: 'sanguinamento', etichetta: 'Stato sanguinamento acceso', quando: '2026-10-21T21:53:00.000Z' },
    { id: 'q4', tipo: 'assegna', percorso: ['sessione', 'note'], visto: notePrima, nuovo: 'dal tablet', etichetta: 'Note del personaggio', quando: '2026-10-21T21:58:00.000Z' },
  ];
  // mandate in disordine: la schermata le rimette in ordine di quando sono state fatte
  const r = await manda(p.file, [ops[3], ops[1], ops[0], ops[2]]);
  assert.equal(r.status, 200, await r.text());

  const lista = await (await fetch(`${baseMaster}/api/rientro`)).json();
  const pg = lista.personaggi.find((x) => x.pgId === p.pg);
  assert.ok(pg, 'il personaggio deve comparire nella schermata di rientro');
  assert.equal(pg.nome, 'Nadia Ferro');
  assert.deepEqual(pg.righe.map((x) => x.id), ['q1', 'q2', 'q3', 'q4']);
  assert.equal(pg.righe[0].etichetta, '−5 PV');
  // le prime tre sono variazioni: nessun conflitto
  for (const x of pg.righe.slice(0, 3)) assert.equal(x.conflitto, undefined);
  // la quarta è un'assegnazione cambiata anche dal Direttore: le due versioni, per la domanda esplicita
  assert.equal(pg.righe[3].conflitto.sulServer, 'nota del Direttore');
  assert.equal(pg.righe[3].conflitto.dalTablet, 'dal tablet');
});

test('approvazione parziale: quello che Davide non decide resta in attesa, e il resto si applica', async () => {
  const p = await metti('Rhea-Valdis_liv5_2026-10-02.json');
  await associa(ID1, p.pg);
  const prima = letto(p.file).sessione;
  const ops = [
    { id: 'p1', tipo: 'somma', percorso: ['sessione', 'pvAttuali'], delta: -4, etichetta: '−4 PV', quando: '2026-10-21T22:00:00.000Z' },
    { id: 'p2', tipo: 'somma', percorso: ['sessione', 'pmAttuali'], delta: -2, etichetta: '−2 PM', quando: '2026-10-21T22:01:00.000Z' },
    { id: 'p3', tipo: 'somma', percorso: ['sessione', 'distintivi'], delta: 1, etichetta: '+1 Distintivi', quando: '2026-10-21T22:02:00.000Z' },
  ];
  await manda(p.file, ops);
  // ne approva una, ne scarta una, della terza non dice niente (chiude la schermata)
  const d = await (await decidi(p.pg, { p1: 'approva', p2: 'scarta' })).json();
  assert.deepEqual(d.approvate, ['p1']);
  assert.deepEqual(d.scartate, ['p2']);
  assert.equal(d.restano, 1);
  const dopo = letto(p.file).sessione;
  assert.equal(dopo.pvAttuali, prima.pvAttuali - 4); // approvata
  assert.equal(dopo.pmAttuali, prima.pmAttuali); // scartata: non applicata
  assert.equal(dopo.distintivi, prima.distintivi); // non decisa: ancora in attesa

  // la terza si ripresenta: chiudere non è scartare
  const lista = await (await fetch(`${baseMaster}/api/rientro`)).json();
  const pg = lista.personaggi.find((x) => x.pgId === p.pg);
  assert.deepEqual(pg.righe.map((x) => x.id), ['p3']);

  // e il tablet, ripresentando la sua coda, impara com'è andata per le altre due
  const r = await (await manda(p.file, ops)).json();
  assert.deepEqual(r.decise, { p1: 'approvata', p2: 'scartata' });
  assert.deepEqual(r.inAttesa, ['p3']);
});

test('una riga approvata due volte si applica una volta sola', async () => {
  const p = await metti('Torvald-Krane_liv6_2026-10-02.json');
  await associa(ID1, p.pg);
  const prima = letto(p.file).sessione.pvAttuali;
  const op = { id: 'due-volte', tipo: 'somma', percorso: ['sessione', 'pvAttuali'], delta: -6, etichetta: '−6 PV', quando: '2026-10-21T22:10:00.000Z' };
  await manda(p.file, [op]);
  await decidi(p.pg, { 'due-volte': 'approva' });
  assert.equal(letto(p.file).sessione.pvAttuali, prima - 6);
  // il tablet ripresenta la stessa operazione (non aveva ricevuto la risposta) e Davide riapprova dalla sua
  // schermata rimasta aperta: niente deve succedere una seconda volta
  const r = await (await manda(p.file, [op])).json();
  assert.deepEqual(r.inAttesa, []);
  assert.deepEqual(r.decise, { 'due-volte': 'approvata' });
  const d = await (await decidi(p.pg, { 'due-volte': 'approva' })).json();
  assert.deepEqual(d.approvate, []);
  assert.equal(letto(p.file).sessione.pvAttuali, prima - 6); // non −12
});

test('niente si perde se il tablet si spegne: il deposito è sul server, non nella memoria del processo', async () => {
  const p = await metti('Aiko-Tenzan_liv5_2026-10-02.json');
  await associa(ID1, p.pg);
  const op = { id: 'sopravvive', tipo: 'somma', percorso: ['sessione', 'puntiEroe'], delta: -1, etichetta: '−1 Punti Eroe', quando: '2026-10-21T22:20:00.000Z' };
  await manda(p.file, [op]);
  // il file su disco contiene l'attesa: un riavvio del server la ritrova (è lo stesso file che legge la schermata)
  const deposito = JSON.parse(readFileSync(join(c.tavolo, 'rientro.json'), 'utf8'));
  assert.ok(deposito.personaggi[p.pg].inAttesa.some((x) => x.id === 'sopravvive'));
  const lista = await (await fetch(`${baseMaster}/api/rientro`)).json();
  assert.ok(lista.personaggi.find((x) => x.pgId === p.pg).righe.some((x) => x.id === 'sopravvive'));
});

test('la schermata di rientro è solo del PC del Direttore (un tablet non la vede e non decide)', async () => {
  const g = await fetch(`${baseTablet}/api/rientro`);
  assert.equal(g.status, 403);
  const d = await fetch(`${baseTablet}/api/rientro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pgId: 'pg-x', decisioni: {} }) });
  assert.equal(d.status, 403);
});

test('un tablet non associato a questo personaggio viene rifiutato', async () => {
  const uno = await metti('Fratello-Anselmo-Viri_liv3_2026-10-02.json');
  const due = await metti('Nadia-Ferro_liv4_2026-10-02.json');
  await associa(ID1, uno.pg);
  const op = { id: 'op-x', tipo: 'somma', percorso: ['sessione', 'pvAttuali'], delta: -1 };
  const r = await manda(due.file, [op]);
  assert.equal(r.status, 403);
});

test('dal PC del master il controllo «scrive solo il proprio» non si applica', async () => {
  const p = await metti('Nadia-Ferro_liv4_2026-10-02.json');
  const op = { id: 'op-master-1', tipo: 'somma', percorso: ['sessione', 'pvAttuali'], delta: 2, quando: '2026-10-21T23:00:00.000Z' };
  const r = await fetch(`${baseMaster}/api/personaggi/${encodeURIComponent(p.file)}/giornale`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operazioni: [op] }),
  });
  const j = await r.json();
  assert.equal(r.status, 200, JSON.stringify(j));
  assert.ok(j.inAttesa.includes('op-master-1')); // insieme a quelle che questo personaggio aveva già in attesa
});
