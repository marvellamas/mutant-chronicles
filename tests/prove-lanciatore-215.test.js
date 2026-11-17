import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 215 — il lanciatore delle prove non muore in silenzio. Windows rifiuta una riga di comando oltre 32.767 caratteri:
// con 394 file e i percorsi assoluti di un worktree profondo la riga era 33.027, `spawnSync` tornava `status: null`,
// `error: ENAMETOOLONG`, e `npm test` dava «Qualche prova è rossa» senza aver eseguito niente (lotto 214).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { gruppiDiRiga, passaggio, dueGruppi, LIMITE_RIGA, RADICE } from '../tools/prove.mjs';

const files = globSync('tests/**/*.test.js', { cwd: RADICE }).map((f) => join(RADICE, f));
const LIMITE_WINDOWS = 32767;
const riga = (g) => process.execPath.length + ('--test ' + g.join(' ')).length + 2;

test('la riga dei file puri sta sotto il limite di Windows, anche con una radice lunghissima', () => {
  const { puri } = dueGruppi(files);
  const lunga = ['F:', 'REPOS', 'mutant', '.claude', 'worktrees', 'un-nome-di-worktree-molto-molto-lungo-' + 'x'.repeat(60)].join(String.fromCharCode(92));
  // percorsi assoluti sotto una radice lunga, come nel lotto 214: prima superavano il limite
  const assoluti = puri.map((f) => join(lunga, f.slice(RADICE.length + 1)));
  assert.ok(riga(assoluti) > LIMITE_WINDOWS, 'il caso di prova deve essere davvero troppo lungo, o non prova niente');
  const gruppi = gruppiDiRiga(assoluti, { radice: lunga });
  assert.ok(gruppi.length >= 1);
  for (const g of gruppi) assert.ok(riga(g) <= LIMITE_RIGA, `un gruppo supera ${LIMITE_RIGA} caratteri: ${riga(g)}`);
  assert.equal(gruppi.flat().length, puri.length, 'nessun file perso nella divisione');
  assert.equal(new Set(gruppi.flat()).size, puri.length, 'nessun file ripetuto');
});

test('con la radice vera i percorsi sono relativi e, di norma, un gruppo solo (un esito unico)', () => {
  const { puri } = dueGruppi(files);
  const gruppi = gruppiDiRiga(puri);
  assert.equal(gruppi.length, 1, 'la riga di comando di tutti i file puri deve stare in un gruppo solo');
  assert.ok(gruppi[0].every((f) => f.startsWith('tests/') && !f.includes(String.fromCharCode(92))), 'percorsi relativi con la barra');
});

test('un limite basso divide in gruppi e l\'esito resta unico: rosso se un gruppo è rosso', () => {
  const g = gruppiDiRiga(files.slice(0, 20), { limite: 400 });
  assert.ok(g.length > 1);
  assert.equal(g.flat().length, 20);
});

test('IL LANCIATORE CHE NON PARTE È UN ERRORE, non un verde e non un silenzio', () => {
  const messaggi = []; const e = console.error; console.error = (m) => messaggi.push(String(m));
  const o = console.log; console.log = () => {};
  let esito;
  try { esito = passaggio('prova', ['tests/qualunque.test.js'], { eseguibile: join(RADICE, 'non-esiste', 'node-che-non-c-e.exe') }); }
  finally { console.error = e; console.log = o; }
  assert.equal(esito.stato, 1, 'se il lanciatore non parte l\'esito è rosso');
  assert.match(messaggi.join('\n'), /non è partito/, 'e lo dice, con il motivo');
});

test('MUTANTE: una riga troppo lunga per Windows fa davvero morire spawnSync (il difetto del 214 è reale, non teorico)', { skip: process.platform !== 'win32' }, () => {
  const lunghi = Array.from({ length: 400 }, (_, i) => 'F:/' + 'a'.repeat(95) + i + '.test.js');
  const r = spawnSync(process.execPath, ['--test', ...lunghi], { encoding: 'utf8' });
  assert.equal(r.status, null);
  assert.equal(r.error?.code, 'ENAMETOOLONG');
});

test('un passaggio che parte davvero esegue le prove e riporta il loro esito', () => {
  const o = console.log; console.log = () => {};
  let ok;
  try { ok = passaggio('prova', ['tests/prove-due-passaggi.test.js'], { env: { ...process.env } }); } finally { console.log = o; }
  assert.equal(ok.stato, 0);
});
