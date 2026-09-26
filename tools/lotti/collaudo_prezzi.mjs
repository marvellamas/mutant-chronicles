// Collaudo: controllo incrociato dei prezzi di riferimento delle armi (Manuale degli Armamenti
// v0.50, §7.9, pp. 53–58) con i costi già nel catalogo (data/equipaggiamento/*.json).
//   node tools/lotti/collaudo_prezzi.mjs
//
// Fonte: docs/lotti/collaudo-prezzi/grezzo/ (tools/estrai_manuali.py --tabelle, pp. 52–58; le
// tabelle di p. 52 sono del §7.8 e non si usano).
//
// Regole del confronto:
// - «Modello — Corporazione» (pistole di base) e «… con modulo» (armi con modulo integrato: il
//   prezzo del catalogo comprende il modulo, §7.8) si riducono al nome del modello;
// - i nomi si confrontano senza maiuscole, spazi e trattini, fra tutti gli oggetti del catalogo;
// - ogni riga del §7.9 deve trovare un oggetto; un prezzo diverso è una differenza da verificare
//   sul PDF (il confronto non corregge nulla da solo).
import { readFileSync, readdirSync } from 'node:fs';

const RADICE = new URL('../../', import.meta.url);
const GREZZO = new URL('docs/lotti/collaudo-prezzi/grezzo/', RADICE);
const DATI = new URL('data/equipaggiamento/', RADICE);

const leggiCsv = (testo) => testo.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => {
  const celle = [];
  let c = '';
  let q = false;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (q) { if (ch === '"' && l[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; } else if (ch === '"') q = true; else if (ch === ',') { celle.push(c); c = ''; } else c += ch;
  }
  celle.push(c);
  return celle.map((x) => x.trim()).filter(Boolean);
}).filter((r) => r.length);

const righe = [];
for (const f of readdirSync(GREZZO).filter((x) => x.endsWith('.csv')).sort()) {
  for (const r of leggiCsv(readFileSync(new URL(f, GREZZO), 'utf8'))) {
    if (r.length !== 2 || !/^[\d.]+$/.test(r[1])) continue; // intestazioni e righe spezzate («Costo di / riferimento»)
    righe.push({ file: f, voce: r[0], costo: Number(r[1].replace(/\./g, '')) });
  }
}

const indice = JSON.parse(readFileSync(new URL('index.json', DATI), 'utf8'));
const oggetti = indice.file.flatMap(({ id, file }) => JSON.parse(readFileSync(new URL(file, DATI), 'utf8')).oggetti.map((o) => ({ ...o, rif: `${id}:${o.id}` })));
const norm = (s) => s.toLowerCase().replace(/[\s\-’']/g, '');
const nomeModello = (v) => v.replace(/ — .+$/, '').replace(/ con modulo$/, '');

let uguali = 0;
const differenze = [];
const mancanti = [];
for (const r of righe) {
  const n = norm(nomeModello(r.voce));
  const trovati = oggetti.filter((o) => !o.modulo_di && (norm(o.nome) === n || (o.nomi_alternativi ?? []).some((a) => norm(a) === n)));
  if (!trovati.length) { mancanti.push(r); continue; }
  const o = trovati[0];
  if (o.costo === r.costo) uguali++;
  else differenze.push({ ...r, rif: o.rif, catalogo: o.costo, trovati: trovati.length });
}
console.log(`righe del §7.9: ${righe.length}; uguali: ${uguali}; differenze: ${differenze.length}; senza oggetto: ${mancanti.length}`);
for (const d of differenze) console.log(`DIFFERENZA ${d.file} «${d.voce}»: §7.9 ${d.costo}, catalogo ${d.catalogo} (${d.rif})`);
for (const m of mancanti) console.log(`SENZA OGGETTO ${m.file} «${m.voce}» ${m.costo}`);
