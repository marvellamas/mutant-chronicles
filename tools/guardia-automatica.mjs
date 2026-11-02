// La guardia sulle cartelle vere non dipende da come si lancia il programma (lotto 150, 01/11/2026).
// Nel lotto 149 un `node --test` senza `--import` ha scritto `__prova_guardia__.json` in personaggi/: la guardia del
// lotto 145 la caricava soltanto tests/profilo-di-prova.mjs, cioè `npm test`. Qui la guardia si accende da sola, dentro
// il codice, appena il programma capisce da dentro di essere una PROVA:
//   1. un test in esecuzione: il test runner di Node mette NODE_TEST_CONTEXT in ogni processo che avvia (`node --test`,
//      `npm test`, un file singolo con `node --test file`);
//   2. `--test` fra gli argomenti di Node (il processo che coordina);
//   3. un file di tests/ lanciato direttamente (`node tests/x.test.js`);
//   4. un processo figlio di una prova: la guardia scrive MUTANT_PROVA nell'ambiente e i programmi che un test avvia
//      (server, strumenti) la ereditano;
//   5. un server di prova (porta diversa dalla 3000 o cartelle indicate a mano): lo decide server.mjs con
//      tools/protezione-reali.mjs → controllaAvvioDiProva, che installa la stessa guardia.
// Dove si accende: ogni test (prima riga: `import '../tools/guardia-subito.mjs'`, controllato da
// tests/guardia-automatica.test.js), server.mjs, tests/profilo-di-prova.mjs e tools/dati-pc.mjs → cartellaDati (qualunque
// programma che cerca la cartella dei dati, quindi ogni strumento che può scriverci).
// Non è un interruttore: non c'è nessuna variabile che la spegne. Il server vero sulla 3000 e gli strumenti del menu
// lanciati da Davide non sono prove e scrivono normalmente.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cartelleReali, installaGuardiaScrittura } from './protezione-reali.mjs';

const SEGNO = Symbol.for('mutant.guardia-automatica');

/**
 * Da dentro: questo processo è una prova? Il motivo in parole, o null.
 * @param opz { argv, execArgv, env, radice } (per i test)
 */
export function riconosciProva({ argv = process.argv, execArgv = process.execArgv, env = process.env, radice = dirname(dirname(fileURLToPath(import.meta.url))) } = {}) {
  if (env.NODE_TEST_CONTEXT) return 'un test è in esecuzione (il test runner di Node ha messo NODE_TEST_CONTEXT)';
  if ([...execArgv, ...argv.slice(2)].some((a) => a === '--test' || /^--test-/.test(a))) return 'Node è lanciato con --test';
  if (env.MUTANT_PROVA) return 'avviato da una prova (MUTANT_PROVA ereditata dal processo che l’ha lanciato)';
  const file = argv[1] ? resolve(argv[1]) : null;
  if (file) {
    const r = relative(resolve(radice, 'tests'), file);
    if (r && !r.startsWith('..') && !isAbsolute(r)) return 'un file di tests/ è lanciato direttamente';
  }
  return null;
}

/**
 * Accende la guardia se il processo è una prova (una volta sola per processo). Calcola le cartelle vere PRIMA di
 * mettere un profilo di prova, poi, se manca, ne dà uno temporaneo: nemmeno il profilo di Windows vero si tocca.
 * @returns {{ motivo: string, reali: object[] } | null}
 */
export function attivaGuardiaAutomatica(opz = {}) {
  if (globalThis[SEGNO]) return globalThis[SEGNO];
  const env = opz.env ?? process.env;
  const motivo = riconosciProva({ ...opz, env });
  if (!motivo) return null;
  globalThis[SEGNO] = { motivo, reali: [] }; // subito: cartelleReali richiama cartellaDati, che richiama questa funzione
  const radice = opz.radice ?? dirname(dirname(fileURLToPath(import.meta.url)));
  const reali = cartelleReali(radice, { profiloVero: !env.MUTANT_CONFIG_DIR });
  installaGuardiaScrittura(reali);
  env.MUTANT_PROVA = '1';
  // lotto 161: la cartella temporanea delle cartelle di prova, la stessa per i processi figli (tools/protezione-reali.mjs)
  env.MUTANT_TEMP_PROVA ??= tmpdir();
  if (!env.MUTANT_CONFIG_DIR) {
    const profilo = mkdtempSync(join(tmpdir(), 'mutant-profilo-prova-'));
    env.MUTANT_CONFIG_DIR = profilo;
    // il profilo di prova è di questo processo: alla fine si toglie (non si accumulano centinaia di cartelle in %TEMP%)
    process.on('exit', () => { try { rmSync(profilo, { recursive: true, force: true }); } catch { /* resta: pazienza */ } });
  }
  globalThis[SEGNO] = { motivo, reali };
  return globalThis[SEGNO];
}

/** Lo stato della guardia automatica in questo processo: { motivo, reali } o null. */
export const guardiaAutomatica = () => globalThis[SEGNO] ?? null;
