// File provvisorio «personaggio_liv1_….json» (05/10/2026): un PG senza nome resta nel browser e non va nella cartella;
// quando prende il nome il server scrive un solo file con il nome giusto e toglie il provvisorio dello stesso PG
// (versioni precedenti). La pagina iniziale mostra i provvisori rimasti come «senza nome».
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { NOME_PROVVISORIO, fileProvvisorio, haNome, nomeFileLibero, chiavePersonaggio } from '../src/cartella.js';

const PG = 'pg-eeeeeeeeeeeeeeeeeeeeeeee';
const ALTRO = 'pg-ffffffffffffffffffffffff';

test('nome provvisorio: è quello dell’export senza nome; un PG senza nome non si salva nella cartella', () => {
  assert.equal(NOME_PROVVISORIO, chiavePersonaggio(''));
  assert.equal(NOME_PROVVISORIO, 'personaggio');
  assert.ok(fileProvvisorio('personaggio_liv1_2026-10-04.json'));
  assert.ok(fileProvvisorio('personaggio-2_liv1_2026-10-04.json'));
  assert.equal(fileProvvisorio('Lucas_liv1_2026-10-04.json'), false);
  assert.equal(haNome({ nome: '   ' }), false);
  assert.equal(haNome({ nome: '' }), false);
  assert.ok(haNome({ nome: 'Lucas' }));
});

test('il PG che prende il nome non tiene il provvisorio come proprio nome di file', () => {
  const lista = [{ file: 'personaggio_liv1_2026-10-04.json', mtime: 1, pg: PG }];
  assert.equal(nomeFileLibero({ pg: PG, scelte: { nome: 'Lucas' }, cartella: { file: 'personaggio_liv1_2026-10-04.json' } }, lista), 'Lucas');
});

const cartella = mkdtempSync(join(tmpdir(), 'mutant-provvisorio-'));
let server;
let base;
before(async () => {
  server = creaServer({ cartella });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); rmSync(cartella, { recursive: true, force: true }); });

const testo = (nome, pg) => JSON.stringify({ formato: 'mutant-personaggio', versione: 8, pg, scelte: { nome } }, null, 2);
const scrivi = (file, corpo) => fetch(`${base}/api/personaggi/${encodeURIComponent(file)}`, { method: 'PUT', body: corpo, headers: { 'Content-Type': 'application/json' } });

test('server: scritto il file con il nome, il provvisorio dello stesso PG si toglie (rinomina); quello di un altro resta', async () => {
  // provvisori lasciati dalle versioni precedenti: uno del PG, uno di un altro
  writeFileSync(join(cartella, 'personaggio_liv1_2026-10-04.json'), testo('', PG));
  writeFileSync(join(cartella, 'personaggio-2_liv1_2026-10-04.json'), testo('', ALTRO));
  const r = await scrivi('Lucas_liv1_2026-10-04.json', testo('Lucas', PG));
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).rinominati, ['personaggio_liv1_2026-10-04.json']);
  assert.deepEqual(readdirSync(cartella).sort(), ['Lucas_liv1_2026-10-04.json', 'personaggio-2_liv1_2026-10-04.json']);
  // riscrivere lo stesso file non tocca il provvisorio dell'altro PG
  assert.equal((await scrivi('Lucas_liv1_2026-10-04.json', testo('Lucas', PG))).status, 200);
  assert.equal(readdirSync(cartella).length, 2);
});
