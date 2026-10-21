// POST /api/personaggi/<file>/giornale (21/10/2026, quarto lotto «si può modificare offline, e al rientro
// Davide approva»): applica le variazioni e le assegnazioni non in conflitto, tiene da parte i conflitti veri,
// idempotente, stesso controllo «scrive solo il proprio» di PUT /api/personaggi/<file>.
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

test('una variazione si somma a quello che è successo nel frattempo (il Direttore ha cambiato i PV)', async () => {
  const p = await metti('Fratello-Anselmo-Viri_liv3_2026-10-02.json');
  await associa(ID1, p.pg);
  // il Direttore cambia i PV direttamente (come se li avesse corretti dal Tavolo), dal suo PC
  const letto = JSON.parse(readFileSync(join(c.personaggi, p.file), 'utf8'));
  const dopoDirettore = { ...letto, sessione: { ...letto.sessione, pvAttuali: (letto.sessione.pvAttuali ?? 0) + 10 } };
  await fetch(`${baseMaster}/api/personaggi/${encodeURIComponent(p.file)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dopoDirettore) });
  const pvDopoDirettore = JSON.parse(readFileSync(join(c.personaggi, p.file), 'utf8')).sessione.pvAttuali;

  const op = { id: 'op-pv-1', tipo: 'somma', percorso: ['sessione', 'pvAttuali'], delta: -5, etichetta: '−5 PV' };
  const r = await fetch(`${baseTablet}/api/personaggi/${encodeURIComponent(p.file)}/giornale`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mutant-Da': 'giocatore', 'X-Mutant-Dispositivo': ID1 }, body: JSON.stringify({ operazioni: [op] }),
  });
  const j = await r.json();
  assert.equal(r.status, 200, JSON.stringify(j));
  assert.deepEqual(j.applicati, ['op-pv-1']);
  assert.equal(j.conflitti.length, 0);
  const file = JSON.parse(readFileSync(join(c.personaggi, p.file), 'utf8'));
  assert.equal(file.sessione.pvAttuali, pvDopoDirettore - 5);
});

test('un\'assegnazione cambiata anche sul server diventa un conflitto vero: non si applica, resta in sospeso', async () => {
  const p = await metti('Nadia-Ferro_liv4_2026-10-02.json');
  await associa(ID1, p.pg);
  const visto = JSON.parse(readFileSync(join(c.personaggi, p.file), 'utf8')).sessione.note ?? '';
  // il Direttore cambia le note mentre il tablet era offline
  const letto = JSON.parse(readFileSync(join(c.personaggi, p.file), 'utf8'));
  await fetch(`${baseMaster}/api/personaggi/${encodeURIComponent(p.file)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...letto, sessione: { ...letto.sessione, note: 'nota del Direttore' } }) });

  const op = { id: 'op-nota-1', tipo: 'assegna', percorso: ['sessione', 'note'], visto, nuovo: 'nota dal tablet' };
  const r = await fetch(`${baseTablet}/api/personaggi/${encodeURIComponent(p.file)}/giornale`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mutant-Da': 'giocatore', 'X-Mutant-Dispositivo': ID1 }, body: JSON.stringify({ operazioni: [op] }),
  });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.deepEqual(j.applicati, []);
  assert.equal(j.conflitti.length, 1);
  assert.equal(j.conflitti[0].operazione.id, 'op-nota-1');
  assert.equal(j.conflitti[0].attuale, 'nota del Direttore');
  // il file non è stato toccato dal conflitto
  assert.equal(JSON.parse(readFileSync(join(c.personaggi, p.file), 'utf8')).sessione.note, 'nota del Direttore');
});

test('la stessa operazione ripresentata due volte non si applica due volte (idempotenza)', async () => {
  const p = await metti('Fratello-Anselmo-Viri_liv3_2026-10-02.json');
  await associa(ID1, p.pg);
  const prima = JSON.parse(readFileSync(join(c.personaggi, p.file), 'utf8')).sessione.pmAttuali ?? 0;
  const op = { id: 'op-pm-ripetuta', tipo: 'somma', percorso: ['sessione', 'pmAttuali'], delta: -3 };
  const invia = () => fetch(`${baseTablet}/api/personaggi/${encodeURIComponent(p.file)}/giornale`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mutant-Da': 'giocatore', 'X-Mutant-Dispositivo': ID1 }, body: JSON.stringify({ operazioni: [op] }),
  });
  const r1 = await invia();
  assert.deepEqual((await r1.json()).applicati, ['op-pm-ripetuta']);
  const r2 = await invia(); // stesso identificativo, stesso giornale: come un ritentativo dopo un errore di rete
  assert.deepEqual((await r2.json()).applicati, []); // niente di nuovo applicato
  const dopo = JSON.parse(readFileSync(join(c.personaggi, p.file), 'utf8')).sessione.pmAttuali;
  assert.equal(dopo, prima - 3); // non -6
});

test('un tablet non associato a questo personaggio viene rifiutato', async () => {
  const uno = await metti('Fratello-Anselmo-Viri_liv3_2026-10-02.json');
  const due = await metti('Nadia-Ferro_liv4_2026-10-02.json');
  await associa(ID1, uno.pg);
  const op = { id: 'op-x', tipo: 'somma', percorso: ['sessione', 'pvAttuali'], delta: -1 };
  const r = await fetch(`${baseTablet}/api/personaggi/${encodeURIComponent(due.file)}/giornale`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mutant-Da': 'giocatore', 'X-Mutant-Dispositivo': ID1 }, body: JSON.stringify({ operazioni: [op] }),
  });
  assert.equal(r.status, 403);
});

test('dal PC del master il controllo non si applica', async () => {
  const p = await metti('Nadia-Ferro_liv4_2026-10-02.json');
  const prima = JSON.parse(readFileSync(join(c.personaggi, p.file), 'utf8')).sessione.pvAttuali ?? 0;
  const op = { id: 'op-master-1', tipo: 'somma', percorso: ['sessione', 'pvAttuali'], delta: 2 };
  const r = await fetch(`${baseMaster}/api/personaggi/${encodeURIComponent(p.file)}/giornale`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operazioni: [op] }),
  });
  assert.equal(r.status, 200, await r.text());
  assert.equal(JSON.parse(readFileSync(join(c.personaggi, p.file), 'utf8')).sessione.pvAttuali, prima + 2);
});
