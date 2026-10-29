// Lotto 143 (B): cerca i test che falliscono a volte. Lancia l'intera suite N volte (come `npm test`), conserva per intero
// l'output di ogni giro che fallisce e dice quali test sono rossi in alcuni giri e verdi negli altri.
//   node tools/test-ripetuto.mjs [N=5] [--concorrenza=K]
// L'output intero (non solo le righe ✖) sta in test-ripetuto/giro-<n>.txt, fuori da git: è quello che serve a capire la causa.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const N = Number(args.find((a) => /^\d+$/.test(a)) ?? 5);
const conc = args.find((a) => a.startsWith('--concorrenza='))?.split('=')[1];
const dir = join(RADICE, 'test-ripetuto');
mkdirSync(dir, { recursive: true });
const rossi = new Map(); // nome del test o del file → giri in cui è rosso
for (let i = 1; i <= N; i += 1) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, ['--import', './tests/profilo-di-prova.mjs', '--test', ...(conc ? [`--test-concurrency=${conc}`] : []), 'tests/**/*.test.js'], { cwd: RADICE, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const out = `${r.stdout}\n${r.stderr}`;
  const falliti = [...new Set(out.split('\n').filter((l) => /^✖ /.test(l)).map((l) => l.replace(/\s*\(\d+(\.\d+)?ms\)\s*$/, '')))];
  falliti.forEach((f) => rossi.set(f, [...(rossi.get(f) ?? []), i]));
  if (falliti.length || r.status !== 0) writeFileSync(join(dir, `giro-${i}.txt`), out);
  console.log(`giro ${i}/${N}: ${r.status === 0 ? 'verde' : 'ROSSO'} in ${Math.round((Date.now() - t0) / 1000)} s${falliti.length ? ` — ${falliti.length} righe ✖` : ''}`);
}
const ballerini = [...rossi].filter(([, giri]) => giri.length < N);
console.log(ballerini.length ? `Test rossi solo in alcuni giri:\n${ballerini.map(([f, g]) => `  ${f} (giri ${g.join(', ')})`).join('\n')}\nL'output intero è in test-ripetuto/.` : `Nessun test intermittente in ${N} giri.`);
process.exit(ballerini.length ? 1 : 0);
