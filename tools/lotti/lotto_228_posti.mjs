// Lotto 228 — A.296 (Davide, 19/11/2026): i posti del Turk del Deserto Cangiante, la prima cavalcatura dell'app.
// Scrive nella scheda `posti` dalla tabella unica POSTI_A296 di tools/importa-mostri.mjs (che è anche ciò che scrive l'importatore).
// Non tocca nessun altro campo. Nessuna capienza per le altre cavalcature: la loro scheda non la dice, e «da definire» non si ricava dalla taglia.
//   node tools/lotti/lotto_228_posti.mjs [--scrivi]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';
import { POSTI_A296 } from '../importa-mostri.mjs';

fermaSeSconosciuti(process.argv.slice(2), ARGOMENTI['lotto_228_posti.mjs'], 'lotto_228_posti.mjs');
const DIR = fileURLToPath(new URL('../../esempi/nemici/mostri/', import.meta.url));
const scrivi = process.argv.includes('--scrivi');
let cambiate = 0;
for (const [id, posti] of Object.entries(POSTI_A296)) {
  const file = `${DIR}${id}.json`;
  const testo = readFileSync(file, 'utf8');
  const s = JSON.parse(testo);
  s.posti = posti;
  const nuovo = `${JSON.stringify(s, null, 2)}\n`;
  if (nuovo === testo) { console.log(`${id}: già a posto`); continue; }
  cambiate += 1;
  console.log(`${id}: ${posti.totale} posti, conducente compreso`);
  if (scrivi) writeFileSync(file, nuovo);
}
console.log(scrivi ? `\nScritte ${cambiate} schede.` : `\n${cambiate} schede cambierebbero (--scrivi per scrivere).`);
