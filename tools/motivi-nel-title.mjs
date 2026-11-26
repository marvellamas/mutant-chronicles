// Lotto 251, parte B — **il censimento dei motivi che stanno nel solo `title`.**
//
// Il difetto dei Distintivi del 250 non era isolato: un pulsante che si spegne (o che non cambierebbe niente) e
// spiega il perché **solo nel `title`** è muto su un tablet, dove il suggerimento del mouse non esiste. Questo
// strumento conta la classe: ogni pulsante della pagina che ha un `disabled:` e un `title:` nello stesso oggetto.
//
// **Il limite del metodo, dichiarato:** a macchina si vede che il motivo sta nel `title`, non si vede se accanto
// c'è anche una riga visibile che lo dice (può starci, scritta da un altro pezzo della funzione). Quindi il numero
// è il numero dei *candidati*, e la riga «a vista o no» la dà il ripasso nel browser (`motivoAVista` di
// `tools/ripassa-clic.mjs`), che guarda la pagina vera.
//
// Uso: node tools/motivi-nel-title.mjs [--elenco]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RADICE = new URL('../src/', import.meta.url);
const ELENCO = process.argv.includes('--elenco');

const file = (base, rel = '') => readdirSync(new URL(rel, base), { withFileTypes: true }).flatMap((d) => (
  d.isDirectory() ? file(base, `${rel}${d.name}/`) : (/\.js$/.test(d.name) ? [`${rel}${d.name}`] : [])));

/** I blocchi `h('button', { … })` di un testo, col loro contenuto fra graffe. */
function bottoni(testo) {
  const fuori = [];
  const re = /h\('button',\s*\{/g;
  for (const m of testo.matchAll(re)) {
    let i = m.index + m[0].length;
    let liv = 1;
    while (i < testo.length && liv > 0) {
      if (testo[i] === '{') liv += 1;
      else if (testo[i] === '}') liv -= 1;
      i += 1;
    }
    fuori.push({ corpo: testo.slice(m.index + m[0].length, i - 1), riga: testo.slice(0, m.index).split('\n').length });
  }
  return fuori;
}

const righe = [];
let bottoniTotali = 0;
let conDisabled = 0;
for (const f of file(RADICE)) {
  const testo = readFileSync(new URL(f, RADICE), 'utf8');
  for (const b of bottoni(testo)) {
    bottoniTotali += 1;
    const spento = /\bdisabled:/.test(b.corpo);
    if (!spento) continue;
    conDisabled += 1;
    const conTitle = /\btitle:/.test(b.corpo);
    if (!conTitle) { righe.push({ f, riga: b.riga, caso: 'spento senza motivo' }); continue; }
    righe.push({ f, riga: b.riga, caso: 'motivo nel title' });
  }
}

const perCaso = (c) => righe.filter((r) => r.caso === c);
console.log(`\nMOTIVI NEL SOLO «title» — censimento del lotto 251\n`);
console.log(`pulsanti della pagina (h('button')): ${bottoniTotali}`);
console.log(`di questi, con un \`disabled:\`: ${conDisabled}`);
console.log(`  · col motivo nel \`title\`: ${perCaso('motivo nel title').length}  ← la classe del difetto dei Distintivi`);
console.log(`  · spenti senza nessun motivo: ${perCaso('spento senza motivo').length}`);
console.log('\nIl numero è quello dei candidati: a macchina non si vede se accanto c’è anche una riga visibile.');
console.log('La risposta per un comando preciso la dà il ripasso nel browser (motivoAVista di tools/ripassa-clic.mjs).');
if (ELENCO) {
  console.log('\nElenco:');
  for (const r of righe) console.log(`  ${r.caso.padEnd(22)} src/${r.f}:${r.riga}`);
}
const perFile = {};
for (const r of righe) perFile[r.f] = (perFile[r.f] ?? 0) + 1;
const ordinati = Object.entries(perFile).sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log('\nI file che ne hanno più:');
for (const [f, n] of ordinati) console.log(`  ${String(n).padStart(3)}  src/${f}`);
