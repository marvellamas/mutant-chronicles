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
import { join, dirname, relative, isAbsolute, sep } from 'node:path';
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

/**
 * Lotto 215 (17/11/2026) — perché prima il passaggio delle prove pure poteva non partire, senza dire niente.
 * Windows non accetta una riga di comando più lunga di 32.767 caratteri (CreateProcess). Con 394 file e i percorsi
 * assoluti di un worktree profondo (`F:\REPOS\mutant\.claude\worktrees\<nome>\tests\...`) la riga arrivava a
 * 33.027: `spawnSync` tornava `status: null` con `error: ENAMETOOLONG`, il codice leggeva `r.status ?? 1` e si fermava
 * con «Qualche prova è rossa» e nessuna prova eseguita. Adesso: (1) i percorsi sono **relativi** alla radice (il processo
 * parte con `cwd` = radice), (2) se la riga supera ancora il limite i file si dividono in gruppi che stanno sotto,
 * eseguiti uno dopo l'altro con un esito unico, (3) se il lanciatore non riesce a partire lo dice con il motivo e
 * l'esito è rosso: un attrezzo che muore in silenzio è un difetto, non un verde.
 */
export const LIMITE_RIGA = 28000; // sotto i 32.767 di Windows, con margine per il percorso di node e i flag

/** I gruppi di file (percorsi relativi alla radice, con la barra) la cui riga di comando sta sotto il limite. */
export function gruppiDiRiga(files, { radice = RADICE, eseguibile = process.execPath, fissi = ['--test'], limite = LIMITE_RIGA } = {}) {
  const rel = files.map((f) => (isAbsolute(f) ? relative(radice, f) : f).split(sep).join('/'));
  const gruppi = []; let corrente = []; let lunghezza = eseguibile.length + fissi.join(' ').length + 2;
  for (const f of rel) {
    if (corrente.length && lunghezza + f.length + 1 > limite) { gruppi.push(corrente); corrente = []; lunghezza = eseguibile.length + fissi.join(' ').length + 2; }
    corrente.push(f); lunghezza += f.length + 1;
  }
  if (corrente.length) gruppi.push(corrente);
  return gruppi;
}

export function passaggio(nome, files, { concorrenza = null, env, radice = RADICE, eseguibile = process.execPath, limite = LIMITE_RIGA } = {}) {
  if (!files.length) return { pass: 0, fail: 0, stato: 0 };
  const fissi = ['--test', ...(concorrenza ? [`--test-concurrency=${concorrenza}`] : [])];
  const gruppi = gruppiDiRiga(files, { radice, eseguibile, fissi, limite });
  console.log(`
--- ${nome}: ${files.length} file${concorrenza ? `, ${concorrenza} alla volta` : ', in parallelo'}${gruppi.length > 1 ? `, in ${gruppi.length} gruppi (riga di comando troppo lunga per uno solo)` : ''} ---`);
  const t0 = Date.now(); let stato = 0;
  for (const g of gruppi) {
    const r = spawnSync(eseguibile, [...fissi, ...g], { cwd: radice, env, stdio: 'inherit', encoding: 'utf8' });
    if (r.error) { console.error(`
Il lanciatore non è partito (${r.error.code ?? r.error.message}): nessuna prova di questo gruppo è stata eseguita. È un errore, non un verde.`); stato = 1; continue; }
    if (r.status === null) { console.error(`
Il processo delle prove è finito senza un esito (segnale ${r.signal ?? 'sconosciuto'}).`); stato = 1; continue; }
    if (r.status) stato = r.status;
  }
  return { stato, secondi: Math.round((Date.now() - t0) / 1000) };
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
