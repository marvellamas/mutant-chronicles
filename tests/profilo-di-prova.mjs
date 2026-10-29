// Caricato prima di ogni file di test (package.json → «node --import ./tests/profilo-di-prova.mjs --test»): i test non
// leggono e non scrivono mai il profilo di Windows vero di chi li lancia (avvisi, ruolo del PC, cartella dei dati di
// Mutant: tools/config-avvisi.mjs → cartellaProfilo). Ogni processo di test ha la sua cartella temporanea; i server
// e i programmi che un test avvia la ereditano. Un test che vuole un profilo suo lo imposta da sé, come prima.
//
// 29/10/2026 (lotto 145): i test non scrivono nemmeno nelle cartelle vere dei personaggi (personaggi/, tavolo/,
// salvataggi/… dell'app e la cartella dei dati del profilo vero): la guardia di tools/protezione-reali.mjs lancia un
// errore chiaro al primo tentativo. Le cartelle vere si calcolano PRIMA di cambiare il profilo.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cartelleReali, installaGuardiaScrittura } from '../tools/protezione-reali.mjs';

const RADICE = dirname(dirname(fileURLToPath(import.meta.url)));
if (!process.env.MUTANT_GUARDIA_OFF) installaGuardiaScrittura(cartelleReali(RADICE, { profiloVero: !process.env.MUTANT_CONFIG_DIR }));
if (!process.env.MUTANT_CONFIG_DIR) process.env.MUTANT_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'mutant-profilo-test-'));
