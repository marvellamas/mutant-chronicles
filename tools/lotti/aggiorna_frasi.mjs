// Aggiorna nei dati le frasi di un manuale cambiate fra due versioni del testo estratto
// (docs/manuali-txt/<manuale>.md): accoppia frase vecchia e frase nuova dai paragrafi modificati e
// sostituisce la vecchia dove compare identica in data/ (note, testi, «frasi»). Le frasi che non
// trovano un'occorrenza identica non si toccano: si elencano per il lavoro a mano.
//   node tools/lotti/aggiorna_frasi.mjs <testo-vecchio.md> <testo-nuovo.md> <versione> [--scrivi]
// <versione>: la versione_manuale da scrivere negli oggetti di catalogo toccati (es. «Armamenti 0.58»).
// Usato per il lotto 1 dell'aggiornamento del 01/10/2026 (docs/diff-manuali-2026-10-01.md).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const [vecchioMd, nuovoMd, versione] = process.argv.slice(2);
const scrivi = process.argv.includes('--scrivi');
const RADICE = new URL('../../', import.meta.url);
const BS = String.fromCharCode(92);
const pulisci = (t) => t.replaceAll(BS, '').replaceAll('**', '').replace(/^#+\s*/, '').replace(/\s+/g, ' ').trim();
const paragrafi = (p) => readFileSync(p, 'utf8').split(/\r?\n/).map(pulisci).filter(Boolean);
const frasi = (p) => p.split(/(?<=[.;:])\s+(?=[A-ZÀ-Ú«(])/).map((s) => s.trim()).filter(Boolean);

// paragrafi tolti e aggiunti; per ogni tolto, il nuovo più simile (stesse parole)
const V = paragrafi(vecchioMd), N = paragrafi(nuovoMd);
const sv = new Set(V), sn = new Set(N);
const tolti = V.filter((x) => !sn.has(x)), aggiunti = N.filter((x) => !sv.has(x));
const parole = (s) => new Set(s.toLowerCase().match(/[\p{L}\d]+/gu) ?? []);
const somiglia = (a, b) => { const A = parole(a), B = parole(b); let c = 0; for (const w of A) if (B.has(w)) c++; return c / Math.max(1, Math.min(A.size, B.size)); };
const coppie = new Map(); // frase vecchia → frase nuova
for (const t of tolti) {
  const best = aggiunti.map((a) => [a, somiglia(t, a)]).sort((x, y) => y[1] - x[1])[0];
  if (!best || best[1] < 0.5) continue;
  const fv = frasi(t), fn = frasi(best[0]);
  // titoli e frammenti corti esclusi; ogni frase nuova si usa una volta sola
  const nuoveLibere = fn.filter((f) => !fv.includes(f) && f.length >= 30);
  for (const f of fv) {
    if (fn.includes(f) || f.length < 30) continue;
    const cand = nuoveLibere.map((g) => [g, somiglia(f, g)]).sort((x, y) => y[1] - x[1])[0];
    if (cand && cand[1] >= 0.45) { coppie.set(f, cand[0]); nuoveLibere.splice(nuoveLibere.indexOf(cand[0]), 1); }
  }
}

// sostituzione nei dati
const file = [...readdirSync(new URL('data/', RADICE)).filter((f) => f.endsWith('.json')).map((f) => `data/${f}`),
  ...readdirSync(new URL('data/equipaggiamento/', RADICE)).filter((f) => f.endsWith('.json')).map((f) => `data/equipaggiamento/${f}`)];
const usate = new Map();
const toccati = new Set();
for (const f of file) {
  const p = new URL(f, RADICE);
  const j = JSON.parse(readFileSync(p, 'utf8'));
  let cambiato = false;
  const visita = (x, oggetto) => {
    if (Array.isArray(x)) return x.map((y) => visita(y, oggetto));
    if (x && typeof x === 'object') {
      const o = 'versione_manuale' in x && 'id' in x ? x : oggetto;
      const r = Object.fromEntries(Object.entries(x).map(([k, v]) => [k, visita(v, o)]));
      // un oggetto di catalogo con una frase cambiata (anche annidata) prende la versione nuova
      if (o === x && toccati.has(x) && versione) r.versione_manuale = versione;
      return r;
    }
    if (typeof x !== 'string') return x;
    let s = x;
    for (const [a, b] of coppie) if (s.includes(a)) { s = s.replaceAll(a, b); usate.set(a, (usate.get(a) ?? []).concat(`${f}${oggetto ? `:${oggetto.id}` : ''}`)); }
    if (s !== x) { cambiato = true; if (oggetto) toccati.add(oggetto); }
    return s;
  };
  const nuovo = visita(j, null);
  if (cambiato && scrivi) writeFileSync(p, JSON.stringify(nuovo, null, 2) + '\n');
}
for (const [a, dove] of usate) console.log(`✔ ${a.slice(0, 90)}\n    → ${coppie.get(a).slice(0, 110)}\n    in ${[...new Set(dove)].join(', ')}`);
console.log(`\n${usate.size} frasi sostituite su ${coppie.size} cambiate${scrivi ? '' : ' (prova: aggiungi --scrivi)'}.`);
