// Controlla che nessuna descrizione del Bestiario proposto prometta una capacità che quel grado non ha
// (lotto 177, 06/11/2026; nasce dalla A.117). Sola lettura, non tocca niente:
//   node tools/descrizioni-bestiario.mjs
import '../tools/guardia-subito.mjs';
import { readFileSync } from 'node:fs';
import { promesseNonMantenute, descriviPromessa, profiliCreatura, nomeProfilo } from '../src/descrizioni-bestiario.js';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';

fermaSeSconosciuti(process.argv.slice(2), ARGOMENTI['descrizioni-bestiario.mjs'], 'descrizioni-bestiario.mjs');
const bestiario = JSON.parse(readFileSync(new URL('../data/bestiario.json', import.meta.url), 'utf8'));
const dati = { bestiario };
const fuori = promesseNonMantenute(dati);
console.log(`${bestiario.creature.length} creature pronte, ${bestiario.creature.reduce((s, c) => s + profiliCreatura(c, dati).length, 0)} profili.`);
if (process.argv.includes('--profili')) {
  for (const c of bestiario.creature) {
    console.log(` ${c.nome}: ${profiliCreatura(c, dati).map((p) => `${nomeProfilo(p, dati)} [${[...p.capacita].join(' ') || 'nessuna capacità'}]`).join(' · ')}`);
  }
}
if (!fuori.length) console.log('Nessuna descrizione promette una capacità che il profilo non ha.');
else {
  console.log(`${fuori.length} da correggere:`);
  for (const p of fuori) console.log(` - ${descriviPromessa(p)}`);
  process.exitCode = 1;
}
