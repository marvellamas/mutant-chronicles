// Lotto 152 (01/11/2026): una sola installazione. Dentro la copia di lavoro non deve comparire una seconda installazione
// di Mutant (una cartella con server.mjs o Mutant.bat che non sia la radice): la creava il pacchetto
// distribuzione/1_scarica_o_aggiorna_app.bat prima della correzione del lotto 128 e i suoi 297 file di test vecchi, eseguiti
// da un `node --test` dalla radice senza guardia, riscrivevano il profilo di Windows vero (docs/diff-lotto152-2026-11-01.md).
import '../tools/guardia-subito.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = fileURLToPath(new URL('..', import.meta.url)).replace(/[\/]$/, '');
const SEGNI = ['server.mjs', 'Mutant.bat'];

/** Le cartelle dentro `radice` (escluse node_modules e .git) che hanno i segni di un'installazione di Mutant. */
export function installazioniDentro(radice) {
  const trovate = [];
  const giro = (dir, rel) => {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      if (!d.isDirectory() || d.name === 'node_modules' || d.name === '.git') continue;
      const p = join(dir, d.name);
      const r = rel ? `${rel}/${d.name}` : d.name;
      if (SEGNI.some((s) => existsSync(join(p, s)))) trovate.push(r); // non si scende: è già una seconda installazione
      else giro(p, r);
    }
  };
  giro(radice, '');
  return trovate;
}

test('dentro la copia di lavoro non c’è una seconda installazione di Mutant', () => {
  assert.ok(SEGNI.every((s) => existsSync(join(RADICE, s))), 'la radice è un’installazione');
  assert.deepEqual(installazioniDentro(RADICE), [], 'una seconda installazione dentro il repository: spostala fuori (una sola installazione per PC, lotto 128 e 152) — i suoi test girerebbero con un node --test dalla radice, senza guardia');
});

test('il controllo trova davvero una seconda installazione (e non una cartella qualunque)', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const r = mkdtempSync(join(tmpdir(), 'mutant-una-inst-'));
  try {
    mkdirSync(join(r, 'distribuzione', 'mutant'), { recursive: true });
    mkdirSync(join(r, 'docs'), { recursive: true });
    mkdirSync(join(r, 'node_modules', 'x'), { recursive: true });
    writeFileSync(join(r, 'server.mjs'), '');
    writeFileSync(join(r, 'node_modules', 'x', 'server.mjs'), '');
    assert.deepEqual(installazioniDentro(r), [], 'la radice, node_modules e le cartelle normali non contano');
    writeFileSync(join(r, 'distribuzione', 'mutant', 'Mutant.bat'), '');
    assert.deepEqual(installazioniDentro(r), ['distribuzione/mutant']);
  } finally { rmSync(r, { recursive: true, force: true }); }
});
