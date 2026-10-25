// /api/px (A.161): il calcolatore e l'archivio «PX della partita» stanno in px/px.json e SOLO il PC del
// master li legge e li scrive. GET vuoto → null; PUT salva; dai tablet (non master) 403.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';

const radice = mkdtempSync(join(tmpdir(), 'mutant-px-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(radice, k)]));
let srvMaster, baseMaster, srvTablet, baseTablet;

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

test('GET vuoto → null; PUT salva in px/px.json; GET lo rilegge', async () => {
  const vuoto = await fetch(`${baseMaster}/api/px`);
  assert.equal(vuoto.status, 200);
  assert.equal(await vuoto.json(), null);
  const dati = { versione: 1, impostazioni: { baseline: 520, atto: 'I' }, giocatori: [{ id: 'a', pg: 'PG A' }], partite: [] };
  const put = await fetch(`${baseMaster}/api/px`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dati) });
  assert.equal(put.status, 200);
  assert.ok(existsSync(join(c.px, 'px.json')), 'px/px.json scritto');
  assert.deepEqual(JSON.parse(readFileSync(join(c.px, 'px.json'), 'utf8')), dati);
  const get = await fetch(`${baseMaster}/api/px`);
  assert.deepEqual(await get.json(), dati);
});

test('un corpo non-oggetto è rifiutato', async () => {
  const put = await fetch(`${baseMaster}/api/px`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '[1,2,3]' });
  assert.equal(put.status, 400);
});

test('dai tablet (non master) GET e PUT rispondono 403', async () => {
  const get = await fetch(`${baseTablet}/api/px`);
  assert.equal(get.status, 403);
  const put = await fetch(`${baseTablet}/api/px`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(put.status, 403);
});

test('prima di sovrascrivere, px/px.json va nello storico (una copia al minuto, senza duplicati)', async () => {
  const put = (d) => fetch(`${baseMaster}/api/px`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
  const storico = join(c.px, 'storico');
  const prima = existsSync(storico) ? readdirSync(storico).length : 0;
  await put({ versione: 1, giocatori: [{ id: 'z', pg: 'Primo' }], partite: [] });
  await put({ versione: 1, giocatori: [{ id: 'z', pg: 'Secondo' }], partite: [] });
  await put({ versione: 1, giocatori: [{ id: 'z', pg: 'Terzo' }], partite: [] });
  const copie = readdirSync(storico).filter((n) => /^px-\d{8}-\d{6}\.json$/.test(n));
  assert.equal(copie.length, prima + 1, 'la seconda e la terza scrittura cadono nello stesso minuto: una copia sola');
  const ultima = JSON.parse(readFileSync(join(storico, copie.at(-1)), 'utf8'));
  assert.ok(ultima.giocatori[0].pg, 'la copia è un archivio leggibile');
});
