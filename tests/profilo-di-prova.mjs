// Caricato prima di ogni file di test (package.json → «node --import ./tests/profilo-di-prova.mjs --test»): i test non
// leggono e non scrivono mai il profilo di Windows vero di chi li lancia (avvisi, ruolo del PC, cartella dei dati di
// Mutant: tools/config-avvisi.mjs → cartellaProfilo). Ogni processo di test ha la sua cartella temporanea; i server
// e i programmi che un test avvia la ereditano. Un test che vuole un profilo suo lo imposta da sé, come prima.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

if (!process.env.MUTANT_CONFIG_DIR) process.env.MUTANT_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'mutant-profilo-test-'));
