#!/usr/bin/env node
// Installa l'hook pre-commit di Mutant (tools/hooks/pre-commit) nella cartella degli hook di Git di
// questa copia del repository. Gli hook non si versionano: si esegue una volta per PC.
// L'hook rigenera versione.json e l'importmap di index.html a ogni commit (docs/cache.md).
//
// Uso: node tools/installa-hook.mjs            installa (o aggiorna) l'hook
//      node tools/installa-hook.mjs --rimuovi  lo toglie (solo se è quello di Mutant)
import { execFileSync } from 'node:child_process';
import { copyFileSync, chmodSync, existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = fileURLToPath(new URL('..', import.meta.url));
const SORGENTE = join(RADICE, 'tools', 'hooks', 'pre-commit');
const FIRMA = 'tools/versione.mjs --pre-commit';

let cartella;
try {
  cartella = resolve(RADICE, execFileSync('git', ['rev-parse', '--git-path', 'hooks'], { cwd: RADICE, encoding: 'utf8' }).trim());
} catch {
  console.log('Questa cartella non è un repository Git (copia scaricata come zip): nessun hook da installare.');
  process.exit(0);
}
const dest = join(cartella, 'pre-commit');
const nostro = () => existsSync(dest) && readFileSync(dest, 'utf8').includes(FIRMA);

if (process.argv.includes('--rimuovi')) {
  if (nostro()) { rmSync(dest); console.log(`Hook pre-commit di Mutant rimosso da ${dest}`); }
  else console.log('Nessun hook pre-commit di Mutant da rimuovere.');
  process.exit(0);
}
if (existsSync(dest) && !nostro()) {
  console.error(`C'è già un altro hook pre-commit in ${dest}: non lo sovrascrivo. Toglilo o uniscilo a mano con tools/hooks/pre-commit.`);
  process.exit(1);
}
mkdirSync(cartella, { recursive: true });
copyFileSync(SORGENTE, dest);
chmodSync(dest, 0o755);
console.log(`Hook pre-commit di Mutant installato in ${dest}: a ogni commit aggiorna versione.json e index.html.`);
