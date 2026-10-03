// Rinforzi come sottocategoria delle armature (richiesta di Davide del 02/10/2026).
//   node tools/lotti/lotto_rinforzi_armature.mjs            prova a vuoto
//   node tools/lotti/lotto_rinforzi_armature.mjs --scrivi   scrive i JSON (idempotente)
// - tipo «rinforzo» al posto di «accessorio» per tutte le voci di rinforzi.json (§7.11.2, §7.23);
// - indossabile_da_solo: soprabiti e mantelli, gli esempi di Davide («alcuni (come il soprabito o il
//   mantello) possono essere indossati autonomamente»). Il manuale non ne parla: §7.23.4 dice che i
//   valori «descrivono l'impiego insieme a un'armatura compatibile; non costituiscono un profilo
//   autonomo di armatura». Che cosa valga indossato da solo sta in regole.json → rinforzi
//   (per-davide A.80). A.80 (E&L del 03/10/2026): indossabili da soli anche il Tabardo consacrato e la
//   Sottogiacca protettiva IES; kit, piastre, inserti e rivestimenti restano solo montati.
import { readFileSync, writeFileSync } from 'node:fs';

const RADICE = new URL('../../', import.meta.url);
const scrivi = process.argv.includes('--scrivi');
const p = new URL('data/equipaggiamento/rinforzi.json', RADICE);
const j = JSON.parse(readFileSync(p, 'utf8'));
// forma del capo: soprabito o mantello (nome del modello, §7.23.2, §7.23.3, §7.23.6, §7.23.10, §7.23.11)
const DA_SOLO = /^(Soprabito\b|Mantello\b|Tabardo consacrato$|Sottogiacca protettiva IES$)/;
let n = 0;
for (const o of j.oggetti) {
  o.tipo = 'rinforzo';
  o.indossabile_da_solo = DA_SOLO.test(o.nome);
  if (o.indossabile_da_solo) n++;
}
console.log(`${j.oggetti.length} rinforzi, tipo «rinforzo»; indossabili da soli ${n}: ${j.oggetti.filter((o) => o.indossabile_da_solo).map((o) => o.nome).join(', ')}`);
if (scrivi) { writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`); console.log('scritto'); }
