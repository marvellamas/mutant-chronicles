// Lotto 150 (01/11/2026): la guardia sulle cartelle vere non dipende da come si lancia il programma.
// Nel lotto 149 un `node --test` senza `--import` ha scritto `__prova_guardia__.json` in personaggi/. Qui:
//   - come una prova si riconosce da dentro (riconosciProva);
//   - ogni file di test accende la guardia come prima riga (non si può dimenticare);
//   - una sonda prova a scrivere in OGNI cartella vera, lanciata in tutti i modi che usiamo, e le cartelle vere restano
//     identiche (nomi, dimensioni, date e contenuto) prima e dopo.
import '../tools/guardia-subito.mjs';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { riconosciProva, attivaGuardiaAutomatica, guardiaAutomatica } from '../tools/guardia-automatica.mjs';
import { CARTELLE_DATI, FILE_DATI } from '../tools/dati-pc.mjs';

const RADICE = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const temp = mkdtempSync(join(tmpdir(), 'mutant-guardia-auto-'));
after(() => rmSync(temp, { recursive: true, force: true }));

test('come si riconosce una prova da dentro: test runner, --test, file di tests/, processo figlio; il resto no', () => {
  const base = { argv: ['node', join(RADICE, 'server.mjs')], execArgv: [], env: {}, radice: RADICE };
  assert.equal(riconosciProva(base), null, 'il server vero e gli strumenti del menu non sono prove');
  assert.equal(riconosciProva({ ...base, argv: ['node', join(RADICE, 'tools', 'salva-sessione.mjs')] }), null);
  assert.match(riconosciProva({ ...base, env: { NODE_TEST_CONTEXT: 'child-v8' } }), /NODE_TEST_CONTEXT/);
  assert.match(riconosciProva({ ...base, execArgv: ['--test'] }), /--test/);
  assert.match(riconosciProva({ ...base, argv: ['node', 'x.js', '--test'] }), /--test/);
  assert.match(riconosciProva({ ...base, env: { MUTANT_PROVA: '1' } }), /MUTANT_PROVA/);
  assert.match(riconosciProva({ ...base, argv: ['node', join(RADICE, 'tests', 'x.test.js')] }), /tests\/ è lanciato direttamente/);
  assert.equal(riconosciProva({ ...base, argv: ['node', join(RADICE, 'tests-fuori', 'x.js')] }), null, 'solo la cartella tests/ dell’app');
});

test('in questo test la guardia è accesa, con il motivo, e il profilo vero non si tocca', () => {
  const g = guardiaAutomatica();
  assert.ok(g, 'la guardia automatica è accesa');
  assert.match(g.motivo, /test|--test|tests\//);
  assert.equal(process.env.MUTANT_PROVA, '1', 'i processi figli la ereditano');
  assert.ok(process.env.MUTANT_CONFIG_DIR, 'un profilo di prova, mai quello di Windows vero');
  assert.equal(attivaGuardiaAutomatica(), g, 'una volta sola per processo');
  // le cartelle vere, per nome, sono quelle dei dati dell'app
  for (const n of ['personaggi', 'px', 'tavolo', 'scontri', 'musica', 'galleria']) assert.ok(g.reali.some((r) => r.percorso.toLowerCase() === join(RADICE, n).toLowerCase()), n);
});

test('ogni file di test accende la guardia come prima riga: non si può dimenticare', () => {
  const senza = [];
  for (const f of readdirSync(join(RADICE, 'tests')).filter((x) => x.endsWith('.test.js'))) {
    const primo = readFileSync(join(RADICE, 'tests', f), 'utf8').split('\n').find((r) => /^import /.test(r));
    if (!/^import '\.\.\/tools\/guardia-subito\.mjs'/.test(primo ?? '')) senza.push(f);
  }
  assert.deepEqual(senza, [], 'questi test non accendono la guardia: aggiungi «import \'../tools/guardia-subito.mjs\';» come primo import');
});

// --- le cartelle vere restano identiche -------------------------------------------------------------------------------

const NOMI = [...new Set([...CARTELLE_DATI, ...FILE_DATI, 'PersonaggiBackup'])];
/** Fotografia: ogni file delle cartelle vere con dimensione, data e impronta del contenuto; le cartelle per nome. */
function fotografia() {
  const out = {};
  const giro = (p, rel) => {
    let st;
    try { st = statSync(p); } catch { return; }
    if (st.isDirectory()) {
      out[`${rel}/`] = 'cartella';
      for (const n of readdirSync(p)) giro(join(p, n), `${rel}/${n}`);
    } else out[rel] = `${st.size}|${Math.round(st.mtimeMs)}|${st.size < 8e6 ? createHash('sha1').update(readFileSync(p)).digest('hex') : 'grande'}`;
  };
  for (const n of NOMI) giro(join(RADICE, n), n);
  return out;
}
const diff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]).map((k) => `${k}: ${a[k] ?? '(non c’era)'} → ${b[k] ?? '(non c’è più)'}`);

// un terminale nuovo: senza i segni che questo test ha ereditato (NODE_TEST_CONTEXT, MUTANT_PROVA), salvo quelli passati
let nEsito = 0;
const lancia = (args, env = {}) => {
  const { NODE_TEST_CONTEXT: _n, MUTANT_PROVA: _p, ...pulito } = process.env;
  const esito = join(temp, `esito-${++nEsito}.json`);
  const r = spawnSync(process.execPath, args, { cwd: RADICE, encoding: 'utf8', timeout: 90000, env: { ...pulito, ...env, MUTANT_SONDA_RADICE: RADICE, MUTANT_CONFIG_DIR: join(temp, 'profilo'), MUTANT_SONDA_ESITO: esito } });
  return { ...r, esito };
};
// lotto 161: l'esito si legge dal file che la sonda scrive (MUTANT_SONDA_ESITO). Lo stdout resta un ripiego: sotto
// `node --test` Node 22.23 lo riscrive come «# SONDA …» con le barre raddoppiate (sul portatile il test era sempre rosso
// per questo, con la guardia attiva), altre versioni lo lasciano com'è.
const sonda = (r, come) => {
  if (r.esito && existsSync(r.esito)) return JSON.parse(readFileSync(r.esito, 'utf8'));
  const riga = (r.stdout ?? '').split('\n').map((x) => x.replace(/^#\s*/, '')).find((x) => x.startsWith('SONDA '));
  assert.ok(riga, `${come}: la sonda non ha risposto (codice ${r.status}) ${r.stderr}`);
  const testo = riga.slice(6);
  try { return JSON.parse(testo); } catch { return JSON.parse(testo.replace(/\\([\\#])/g, '$1')); }
};
const rifiutaTutto = (esito, come) => {
  for (const [cartella, prove] of Object.entries(esito)) {
    for (const [nome, v] of Object.entries(prove)) if (!nome.endsWith('Messaggio')) assert.equal(v, 'rifiutata', `${come}: ${nome} in ${cartella}/ doveva essere rifiutata`);
    assert.match(prove.scritturaMessaggio ?? '', new RegExp(cartella), `${come}: l’errore nomina il percorso di ${cartella}`);
  }
};

const SONDA = join(RADICE, 'tests', 'fixtures', 'sonda-guardia.mjs');
// la stessa sonda fuori da tests/, per provare i riconoscimenti uno alla volta (senza il percorso che la tradisce)
const sondaFuori = join(temp, 'strumento-qualunque.mjs');
writeFileSync(sondaFuori, readFileSync(SONDA, 'utf8'));

const MODI = [
  ['node --test <file> (il test runner avvia il processo, NODE_TEST_CONTEXT)', () => lancia(['--test', sondaFuori])],
  ['node --test senza --import su un file di test vero, come nel lotto 149', () => lancia(['--test', join('tests', 'protezione-reali.test.js')])],
  ['node tests/fixtures/sonda-guardia.mjs (un file di tests/ lanciato direttamente)', () => lancia([SONDA])],
  ['uno strumento avviato da un test: nessun segno oltre a MUTANT_PROVA ereditata', () => lancia([sondaFuori], { MUTANT_PROVA: '1' })],
  ['un programma fuori da tests/ con --test fra gli argomenti', () => lancia([sondaFuori, '--test'])],
];

test('la sonda non riesce a scrivere in nessuna cartella vera, in tutti i modi di lancio, e le cartelle vere restano identiche', () => {
  const prima = fotografia();
  const profiloVero = process.env.APPDATA ? join(process.env.APPDATA, 'Mutant') : null;
  const profiloPrima = profiloVero && existsSync(profiloVero) ? readdirSync(profiloVero).map((n) => `${n}:${statSync(join(profiloVero, n)).mtimeMs}`).join('|') : null;
  for (const [come, parte] of MODI) {
    const r = parte();
    if (/file di test vero/.test(come)) {
      // un test vero lanciato con `node --test` nudo: passa e non scrive (il test «3» di protezione-reali scrive una sonda sua)
      assert.equal(r.status, 0, `${come}: ${r.stdout?.slice(-600)}`);
      continue;
    }
    // --test avvia il file in un processo figlio: l'uscita della sonda arriva comunque sullo stdout del coordinatore
    const esito = sonda(r, come);
    rifiutaTutto(esito, come);
  }
  const dopo = fotografia();
  assert.deepEqual(diff(prima, dopo), [], 'le cartelle vere sono cambiate durante la prova');
  if (profiloVero) assert.equal(existsSync(profiloVero) ? readdirSync(profiloVero).map((n) => `${n}:${statSync(join(profiloVero, n)).mtimeMs}`).join('|') : null, profiloPrima, 'il profilo di Windows vero non si tocca');
});

test('fuori da una prova il funzionamento normale non si rompe: la stessa sonda, in una copia dell’app senza segni di prova, scrive', async () => {
  // una copia degli strumenti in una radice temporanea con le sue cartelle di dati: non si toccano le vere, e senza i segni
  // di una prova (nessun test runner, nessuna MUTANT_PROVA, file fuori da tests/) la guardia non si accende, come per
  // il server sulla porta 3000 e gli strumenti del menu lanciati da Davide
  const { cpSync, mkdirSync } = await import('node:fs');
  const app = join(temp, 'app-normale');
  cpSync(join(RADICE, 'tools'), join(app, 'tools'), { recursive: true });
  for (const n of ['personaggi', 'px', 'tavolo', 'scontri', 'musica', 'galleria', 'nemici', 'veicoli', 'scene', 'mappe', 'salvataggi', 'autosave', 'backup-master']) mkdirSync(join(app, n), { recursive: true });
  const r = spawnSync(process.execPath, [sondaFuori], { cwd: temp, encoding: 'utf8', timeout: 60000,
    env: Object.fromEntries(Object.entries({ ...process.env, MUTANT_SONDA_RADICE: app, MUTANT_CONFIG_DIR: join(temp, 'profilo-normale') }).filter(([k]) => !['NODE_TEST_CONTEXT', 'MUTANT_PROVA'].includes(k))) });
  const esito = sonda(r, 'uso normale');
  for (const [cartella, prove] of Object.entries(esito)) for (const [nome, v] of Object.entries(prove)) if (!nome.endsWith('Messaggio')) assert.equal(v, 'SCRITTA', `uso normale: ${nome} in ${cartella}/ deve poter scrivere`);
});
