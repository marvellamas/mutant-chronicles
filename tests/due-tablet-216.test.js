import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 216 — due tablet sullo stesso personaggio (il caso che il 215 non aveva provato): lunedì due persone che guardano la stessa scheda non è
// improbabile. Il secondo a scrivere, se aveva letto prima del primo, deve avere **409** e **non** sovrascrivere; poi, riletto, scrive.
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
const radice = mkdtempSync(join(tmpdir(), 'mutant-due-tablet-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(radice, k)]));
const A = 'd-tablet-A-1111', B = 'd-tablet-B-2222';
let srvMaster, baseMaster, srvTablet, baseTablet;
const json = { 'Content-Type': 'application/json' };

before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  srvMaster = creaServer({ cartella: c.personaggi, ...Object.fromEntries(['tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, c[k]])), eMaster: () => true });
  await new Promise((ok) => srvMaster.listen(0, '127.0.0.1', ok));
  baseMaster = `http://127.0.0.1:${srvMaster.address().port}`;
  srvTablet = creaServer({ cartella: c.personaggi, ...Object.fromEntries(['tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, c[k]])), eMaster: () => false });
  await new Promise((ok) => srvTablet.listen(0, '127.0.0.1', ok));
  baseTablet = `http://127.0.0.1:${srvTablet.address().port}`;
});
after(async () => { await new Promise((ok) => srvMaster.close(ok)); await new Promise((ok) => srvTablet.close(ok)); rmSync(radice, { recursive: true, force: true }); });

async function metti() {
  const testoBase = readFileSync(new URL('../esempi/Aiko-Tenzan_liv5_2026-10-02.json', import.meta.url), 'utf8').toString();
  const p = deserializzaPersonaggio(testoBase);
  const { scelte } = normalizza(p.creazione, dati);
  const esportato = serializza(scelte, { versioniDati: JSON.parse(testoBase).versioni_dati, livelli: p.livelli, sessione: p.sessione, pg: JSON.parse(testoBase).pg });
  const file = nomeFileEsportazione(scelte.nome, 1 + p.livelli.length, new Date(2026, 10, 17));
  assert.equal((await fetch(`${baseMaster}/api/personaggi/${encodeURIComponent(file)}`, { method: 'PUT', body: esportato })).status, 200);
  return { file, testo: esportato, pg: idPersonaggio(JSON.parse(testoBase), chiaveDaFile(file)) };
}
const sceglie = (id, pgId) => fetch(`${baseTablet}/api/dispositivo`, { method: 'POST', headers: { ...json, 'X-Mutant-Dispositivo': id }, body: JSON.stringify({ pgId }) });
const scrive = (id, file, testo, mtime) => fetch(`${baseTablet}/api/personaggi/${encodeURIComponent(file)}`, {
  method: 'PUT', body: testo, headers: { ...json, 'X-Mutant-Da': 'giocatore', 'X-Mutant-Dispositivo': id, ...(mtime ? { 'X-Mutant-Mtime': String(mtime) } : {}) },
});
const legge = async (file) => { const r = await fetch(`${baseTablet}/api/personaggi/${encodeURIComponent(file)}`); return { testo: await r.text(), mtime: r.headers.get('X-Mutant-Mtime') }; };
const conNote = (testo, nota) => { const o = JSON.parse(testo); o.scelte.note = nota; return JSON.stringify(o); };

test('DUE TABLET, STESSO PERSONAGGIO: il secondo, che aveva letto prima, ha 409 e non sovrascrive; riletto, scrive', async () => {
  const pg = await metti();
  assert.equal((await sceglie(A, pg.pg)).status, 200);
  assert.equal((await sceglie(B, pg.pg)).status, 200, 'due dispositivi possono scegliere lo stesso personaggio');
  // tutti e due leggono la stessa revisione
  const a = await legge(pg.file), b = await legge(pg.file);
  assert.equal(a.mtime, b.mtime);
  // A scrive per primo: 200
  const ra = await scrive(A, pg.file, conNote(a.testo, 'scritto da A'), a.mtime);
  assert.equal(ra.status, 200, await ra.text());
  // B scrive con la revisione vecchia: 409, e il file è quello di A
  const rb = await scrive(B, pg.file, conNote(b.testo, 'scritto da B'), b.mtime);
  assert.equal(rb.status, 409);
  assert.match((await rb.json()).errore, /cambiato altrove/);
  assert.equal(JSON.parse((await legge(pg.file)).testo).scelte.note, 'scritto da A', 'il 409 non ha sovrascritto niente');
  // B rilegge e riprova: passa
  const b2 = await legge(pg.file);
  const rb2 = await scrive(B, pg.file, conNote(b2.testo, 'scritto da B dopo aver riletto'), b2.mtime);
  assert.equal(rb2.status, 200, await rb2.text());
  assert.equal(JSON.parse((await legge(pg.file)).testo).scelte.note, 'scritto da B dopo aver riletto');
});

test('DUE TABLET alla stessa ora: delle due scritture con la stessa revisione ne passa una sola, l\'altra ha 409 (mai due 200)', async () => {
  const pg = await metti();
  await sceglie(A, pg.pg); await sceglie(B, pg.pg);
  const l = await legge(pg.file);
  const [x, y] = await Promise.all([
    scrive(A, pg.file, conNote(l.testo, 'A insieme'), l.mtime),
    scrive(B, pg.file, conNote(l.testo, 'B insieme'), l.mtime),
  ]);
  assert.deepEqual([x.status, y.status].sort(), [200, 409], `stati: ${x.status}, ${y.status}`);
});
