// Verifica che le frasi del manuale copiate nei dati esistano davvero nel testo dei Google Doc
// (docs/manuali-txt/*.md): effetti degli oggetti («condizione») e regole dell'attacco a distanza
// (regole.json → attacco_distanza, «frasi»).
// Uso:  node tools/verifica_frasi.mjs     → elenca le frasi non trovate ed esce con codice 1
// Lo usa anche tests/effetti-oggetti.test.js.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RADICE = new URL('../', import.meta.url);

/** Testo confrontabile: senza escape e grassetti del Markdown esportato, spazi compattati. */
export const normalizza = (t) => String(t).replace(/\\/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();

/** Testo dei manuali, normalizzato. */
export function testoManuali() {
  const cartella = new URL('docs/manuali-txt/', RADICE);
  return readdirSync(cartella).filter((f) => f.endsWith('.md'))
    .map((f) => normalizza(readFileSync(new URL(f, cartella), 'utf8'))).join('\n');
}

/**
 * Frasi degli effetti: catalogo (data/equipaggiamento/) e oggetti di dotazione (data/dotazioni.json).
 * @returns {{dove: string, frase: string}[]}
 */
export function frasiEffetti() {
  const leggi = (p) => JSON.parse(readFileSync(new URL(p, RADICE), 'utf8'));
  const out = [];
  const indice = leggi('data/equipaggiamento/index.json');
  for (const { id, file } of indice.file) {
    for (const o of leggi(`data/equipaggiamento/${file}`).oggetti ?? []) {
      (o.effetti ?? []).forEach((e, i) => { if (e.condizione) out.push({ dove: `${id}:${o.id} effetti[${i}]`, frase: e.condizione }); });
    }
  }
  for (const [id, o] of Object.entries(leggi('data/dotazioni.json').oggetti_dotazione)) {
    (o.effetti ?? []).forEach((e, i) => { if (e.condizione) out.push({ dove: `dotazioni:${id} effetti[${i}]`, frase: e.condizione }); });
  }
  // regole.json → attacco_distanza: ogni «frasi» del blocco, a ogni profondità
  const visita = (v, dove) => {
    if (Array.isArray(v)) v.forEach((x, i) => visita(x, `${dove}[${i}]`));
    else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (k === 'frasi' && Array.isArray(x)) x.forEach((f, i) => out.push({ dove: `${dove}.frasi[${i}]`, frase: f }));
        else visita(x, `${dove}.${k}`);
      }
    }
  };
  visita(leggi('data/regole.json').attacco_distanza ?? {}, 'regole:attacco_distanza');
  return out;
}

/** Frasi che non compaiono nei manuali. */
export function frasiMancanti() {
  const testo = testoManuali();
  return frasiEffetti().filter((x) => !testo.includes(normalizza(x.frase)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tutte = frasiEffetti();
  const mancanti = frasiMancanti();
  for (const m of mancanti) console.log(`NON TROVATA  ${m.dove}\n  «${m.frase}»`);
  console.log(`${tutte.length - mancanti.length} frasi su ${tutte.length} trovate nei manuali.`);
  process.exitCode = mancanti.length ? 1 : 0;
}
