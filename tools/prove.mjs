// Lotto 185 (09/11/2026): `npm test` deve dare lo stesso esito ogni volta, su macchina carica e scarica.
//
// Perché prima no. `node --test` apre un processo di Node per ogni file e ne tiene in volo tanti quanti sono i core
// (32 su questo PC). Sedici di quei file, oltre al loro, avviano processi veri: `node server.mjs`, strumenti in Node,
// PowerShell, git. Quando quei sedici capitano nella stessa ondata degli altri trecentocinquanta, la macchina si
// trova trentadue processi di prova più i loro figli: un `node server.mjs` che da solo è pronto in tre decimi di
// secondo ne impiega dieci o venti, e i tempi di attesa dei test scadono. Non è un difetto dei test: è la coda.
//
// Che cosa fa questo programma. Due passaggi, in una sola esecuzione:
//   1. i file che avviano processi, fra loro e con poca concorrenza, così non si trovano mai in mezzo agli altri;
//   2. tutti gli altri, in parallelo pieno.
// Il gruppo non è un elenco scritto a mano: lo si riconosce dal file stesso (nomina spawn, execFile e simili), così
// un test nuovo che avvia un processo finisce nel primo passaggio da sé (tests/prove-due-passaggi.test.js lo
// controlla). Nessun tempo di attesa è stato allungato: allungarlo nasconderebbe il problema invece di toglierlo.
//
// In più, NODE_COMPILE_CACHE: i trecentosettanta avvii di Node non ricompilano ogni volta gli stessi moduli
// (la cache sta in .cache/node-compile/, fuori da git; Node la indicizza sul contenuto, quindi non invecchia).
//
//   node tools/prove.mjs                     tutta la suite, nei due passaggi
//   node tools/prove.mjs tests/calc.test.js  solo quei file (sempre nel passaggio giusto)
//   node tools/prove.mjs --concorrenza=2     la concorrenza del primo passaggio (di norma un ottavo dei core, min 2)
//   node tools/prove.mjs --solo=processi     un passaggio solo: «processi» oppure «puri»
import { spawnSync } from 'node:child_process';
import { globSync, readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus } from 'node:os';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';

export const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Un file di prova avvia processi veri se il suo codice nomina uno dei modi di lanciarli.
 * Il «non preceduto da un punto» serve: senza, `qualcosa.exec(` di un'espressione regolare e `coda.fork(` finivano
 * nel primo passaggio (ventotto file invece di sedici).
 */
export const AVVIA_PROCESSI = /(?<![.\w$])(spawn|spawnSync|execFile|execFileSync|exec|execSync|fork)\s*\(/;

/** true se quel file di prova avvia processi (letto dal suo codice, non da un elenco). */
export function avviaProcessi(file) {
  return AVVIA_PROCESSI.test(readFileSync(file, 'utf8'));
}

/** I file di prova divisi nei due gruppi: `processi` (primo passaggio) e `puri` (secondo). */
export function dueGruppi(files) {
  const processi = [], puri = [];
  for (const f of files) (avviaProcessi(f) ? processi : puri).push(f);
  return { processi, puri };
}

/** La concorrenza del primo passaggio: poca, perché ogni file apre altri processi. */
export const concorrenzaProcessi = (core = cpus().length) => Math.max(2, Math.floor(core / 8));

const ESITO = /^ℹ (tests|pass|fail|cancelled|skipped|todo) (\d+)$/;

/** I numeri del riepilogo di `node --test` letti dal suo output. */
export function leggiRiepilogo(testo) {
  const n = {};
  for (const r of String(testo).split('\n')) {
    const m = r.trim().match(ESITO);
    if (m) n[m[1]] = (n[m[1]] ?? 0) + Number(m[2]);
  }
  return n;
}

function passaggio(nome, files, { concorrenza = null, env } = {}) {
  if (!files.length) return { pass: 0, fail: 0, stato: 0 };
  const args = ['--test', ...(concorrenza ? [`--test-concurrency=${concorrenza}`] : []), ...files];
  console.log(`\n--- ${nome}: ${files.length} file${concorrenza ? `, ${concorrenza} alla volta` : ', in parallelo'} ---`);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, args, { cwd: RADICE, env, stdio: 'inherit', encoding: 'utf8' });
  return { stato: r.status ?? 1, secondi: Math.round((Date.now() - t0) / 1000) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['prove.mjs'], 'tools/prove.mjs');
  const conc = Number(argv.find((a) => a.startsWith('--concorrenza='))?.split('=')[1]) || concorrenzaProcessi();
  const solo = argv.find((a) => a.startsWith('--solo='))?.split('=')[1] ?? null;
  if (solo && !['processi', 'puri'].includes(solo)) { console.error('--solo= vuole «processi» oppure «puri».'); process.exit(2); }
  const indicati = argv.filter((a) => !a.startsWith('--'));
  const files = (indicati.length ? indicati.flatMap((p) => globSync(p, { cwd: RADICE })) : globSync('tests/**/*.test.js', { cwd: RADICE }));
  if (!files.length) { console.error('Nessun file di prova trovato.'); process.exit(2); }
  const { processi, puri } = dueGruppi(files.map((f) => join(RADICE, f)));

  const cache = join(RADICE, '.cache', 'node-compile');
  mkdirSync(cache, { recursive: true });
  const env = { ...process.env, NODE_COMPILE_CACHE: cache };

  const t0 = Date.now();
  const a = solo === 'puri' ? { stato: 0 } : passaggio('Prove che avviano processi', processi, { concorrenza: conc, env });
  const b = solo === 'processi' ? { stato: 0 } : passaggio('Tutte le altre prove', puri, { env });
  const secondi = Math.round((Date.now() - t0) / 1000);
  console.log(`\n--- in tutto: ${files.length} file in ${secondi} s (processi ${a.secondi ?? 0} s, altre ${b.secondi ?? 0} s) ---`);
  if (a.stato || b.stato) console.log('Qualche prova è rossa: il dettaglio sta nei due riepiloghi qui sopra.');
  process.exit(a.stato || b.stato);
}
