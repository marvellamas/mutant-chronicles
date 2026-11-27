// Lotto 251, parte B — il censimento dei motivi che stanno nel solo `title`; lotto 258 — **chiuso: un pulsante spento
// dice perché al tocco, con una funzione sola** (src/ui/spento.js).
//
// Il difetto: su 108 pulsanti spenti, 65 davano il motivo nel solo `title` e 43 nemmeno quello. Il `title` è il suggerimento
// del mouse: su un tablet non c'è, e un pulsante `disabled` non riceve nemmeno il tocco. Dal lotto 258 un pulsante spento
// si scrive `h('button', { …, spento: 'motivo' })` (o `spegni(el, motivo)` per un pulsante già disegnato): resta toccabile
// (`aria-disabled`) e il tocco mostra il motivo come avviso breve.
//
// Questo strumento conta ancora la classe, per accorgersi se torna: ogni pulsante della pagina con un `disabled:` è un
// pulsante che non dice perché al tocco (col `title` accanto o senza), e ogni `spento: true` è un motivo dimenticato.
//
// **Il limite del metodo, dichiarato:** a macchina si vede che il motivo c'è, non si vede se è il motivo giusto, né se
// accanto c'è anche una riga visibile. La risposta per un comando preciso la dà la prova nel browser (tests/browser-vero.js,
// tools/ripassa-clic.mjs → motivoAVista).
//
// Uso: node tools/motivi-nel-title.mjs [--elenco]
import { readdirSync, readFileSync } from 'node:fs';

const RADICE = new URL('../src/', import.meta.url);
const ELENCO = process.argv.includes('--elenco');

const file = (base, rel = '') => readdirSync(new URL(rel, base), { withFileTypes: true }).flatMap((d) => (
  d.isDirectory() ? file(base, `${rel}${d.name}/`) : (/\.js$/.test(d.name) ? [`${rel}${d.name}`] : [])));

/** I blocchi `h('button', { … })` di un testo, col loro contenuto fra graffe. */
export function bottoni(testo) {
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

/** Il valore di `spento:` letto grezzo, per accorgersi di un `spento: true` (un motivo dimenticato). */
const spentoVuoto = (corpo) => /\bspento:\s*(true|''|""|`\s*`)\s*[,}\n]/.test(corpo);

export function censisci() {
  const righe = [];
  let bottoniTotali = 0;
  let conSpento = 0;
  for (const f of file(RADICE)) {
    const testo = readFileSync(new URL(f, RADICE), 'utf8');
    for (const b of bottoni(testo)) {
      bottoniTotali += 1;
      if (/\bspento:/.test(b.corpo)) {
        conSpento += 1;
        if (spentoVuoto(b.corpo)) righe.push({ f, riga: b.riga, caso: 'spento senza motivo' });
      }
      if (/\bdisabled:/.test(b.corpo)) {
        righe.push({ f, riga: b.riga, caso: /\btitle:/.test(b.corpo) ? 'motivo nel title' : 'spento senza motivo' });
      }
    }
  }
  return { righe, bottoniTotali, conSpento };
}

if (process.argv[1]?.endsWith('motivi-nel-title.mjs')) {
  const { righe, bottoniTotali, conSpento } = censisci();
  const perCaso = (c) => righe.filter((r) => r.caso === c);
  console.log('\nMOTIVI NEL SOLO «title» — censimento del lotto 251, chiuso dal lotto 258\n');
  console.log(`pulsanti della pagina (h('button')): ${bottoniTotali}`);
  console.log(`di questi, spenti con \`spento:\` (il tocco dice perché): ${conSpento}`);
  console.log(`  · col motivo nel \`title\` e \`disabled:\` (muto al tocco): ${perCaso('motivo nel title').length}  ← la classe del difetto dei Distintivi`);
  console.log(`  · spenti senza nessun motivo: ${perCaso('spento senza motivo').length}`);
  console.log('\nIl numero è quello dei candidati: a macchina non si vede se il motivo è quello giusto, né se accanto c’è anche una riga visibile.');
  console.log('La risposta per un comando preciso la dà la prova nel browser (tests/browser-vero.js, motivoAVista di tools/ripassa-clic.mjs).');
  if (ELENCO) {
    console.log('\nElenco:');
    for (const r of righe) console.log(`  ${r.caso.padEnd(22)} src/${r.f}:${r.riga}`);
  }
}
