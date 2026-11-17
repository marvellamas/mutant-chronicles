// Lettore delle tabelle del Manuale del Direttore (lotto 214, 17/11/2026): i numeri che l'app usa dal capitolo 9.
//
// Il testo salvato del Direttore è l'estrazione di un Word (`tools/estrai-docx.mjs`): **una cella per riga**, senza barre. Le tabelle si cercano quindi
// per la loro **intestazione** (sequenza di righe uguali), si leggono a gruppi di N celle e si fermano alla prima riga che non è di quella forma.
// Le lezioni dei lotti 204–213: le intestazioni si **censiscono** (`intestazioniTrovate`), il confronto si prova **prima sull'edizione da cui i dati vengono**
// (la 0.46 salvata in `archivio/` e, per i PX, il gestore di Davide), e una tabella che non si trova o con un numero che non è un numero **non è letta**,
// non è zero: `leggiTabella` torna null e il confronto lo dice.
//
//   node tools/importa-direttore.mjs [--file=<testo.md>]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { testoManuale } from './manuali.mjs';

const norm = (s) => String(s).replace(/(\\?\*){1,2}/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
/** Le righe non vuote del testo, normalizzate. */
// (la 0.46 salvata scrive le tabelle con le barre, `| cella | cella |`: una riga di barre diventa le sue celle; la 0.51, una cella per riga, resta com'è)
export const righeCelle = (testo) => String(testo).split(/\r?\n/).flatMap((l) => {
  const s = l.trim();
  if (s.startsWith('|')) return /^\|[\s:|-]+\|?$/.test(s) ? [] : s.replace(/^\|/, '').replace(/\|$/, '').split('|').map(norm);
  return [norm(s)];
}).filter(Boolean);

/** «×1,30» → 1.3; «1.600» → 1600; «+50%» → 50; null se non è un numero. */
export function numero(s) {
  const t = norm(s).replace(/^[×+]/, '').replace(/%$/, '');
  if (!/^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(t)) return null;
  return Number(t.replace(/\./g, '').replace(',', '.'));
}

/**
 * La tabella che comincia con `intestazione` (array di celle): [[cella…]] oppure null se non c'è. Si ferma quando `finisce(riga)` è vero
 * o dopo `max` righe; una tabella senza nessuna riga è `null` (non letta), mai `[]`.
 */
export function leggiTabella(righe, intestazione, { finisce = () => false, max = 40 } = {}) {
  const n = intestazione.length;
  for (let i = 0; i + n <= righe.length; i++) {
    if (!intestazione.every((h, k) => righe[i + k] === h)) continue;
    const out = [];
    for (let j = i + n; j + n <= righe.length && out.length < max; j += n) {
      const riga = righe.slice(j, j + n);
      if (finisce(riga) || riga.some((c) => c.length > 80)) break; // una frase lunga non è una cella
      out.push(riga);
    }
    return out.length ? out : null;
  }
  return null;
}

const nPos = (c) => numero(c) !== null;
/** Le tabelle del §9.3, §9.4 e §9.6 che l'app usa, lette per intestazione. */
export function leggiDirettore(testo) {
  const r = righeCelle(testo);
  const T = {
    gs: leggiTabella(r, ['Grado di Sfida', 'PX base'], { finisce: (x) => !nPos(x[1]) }),
    dotazione: leggiTabella(r, ['Dotazione', 'Moltiplicatore'], { finisce: (x) => !/^×/.test(x[1]) }),
    pgPresenti: leggiTabella(r, ['PG presenti', 'Coefficiente'], { finisce: (x) => !/^×/.test(x[1]) }),
    titoli: leggiTabella(r, ['Titolo', 'Livelli', 'Moltiplicatore'], { finisce: (x) => !/^×/.test(x[2]) }),
    gradi: leggiTabella(r, ['Grado di Classe', 'Livello di riferimento', 'PX base'], { finisce: (x) => !nPos(x[1]) }),
    eq: leggiTabella(r, ['Dotazione', 'EQ', 'Incremento dei PX base', 'Fattore finale'], { finisce: (x) => !/^×/.test(x[3]) }),
    esempi: leggiTabella(r, ['Incontro', 'PG', 'Calcolo', 'PX a ciascun PG'], { finisce: (x) => !nPos(x[1]) }),
  };
  return T;
}

/** Il confronto con i dati: { scarti, letti, nonLette }. */
export function confronta(T, dati) {
  const scarti = []; const letti = {}; const nonLette = [];
  const cmp = (chi, campo, manuale, dato) => { if (JSON.stringify(manuale) !== JSON.stringify(dato)) scarti.push({ chi, campo, manuale, dato }); };
  const NOMI = ['gs', 'dotazione', 'pgPresenti', 'titoli', 'gradi', 'eq', 'esempi'];
  for (const k of NOMI) if (!T[k]) nonLette.push(k);
  const px = dati.px_partita, nem = dati.formato_nemici, png = dati.png_generici;
  if (T.gs) {
    letti.gs = T.gs.length;
    cmp('formato_nemici.gs_scala', 'px', T.gs.map((x) => [x[0], numero(x[1])]), (nem.gs_scala ?? []).map((x) => [x.nome, x.px]));
    cmp('px_partita.titoli', 'px', T.gs.slice(0, 6).map((x) => [x[0], numero(x[1])]), px.titoli.map((x) => [x.nome, x.px]));
  }
  if (T.titoli) {
    letti.titoli = T.titoli.length;
    const livelli = (s) => { const m = /^(\d+)(?:[–-](\d+)|\+)?$/.exec(s); return m ? [Number(m[1]), m[2] ? Number(m[2]) : (/\+/.test(s) ? 20 : Number(m[1]))] : null; };
    cmp('px_partita.titoli', 'fasce e moltiplicatori', T.titoli.map((x) => [x[0], livelli(x[1]), numero(x[2])]), px.titoli.map((x) => [x.nome, [x.livello_min, x.livello_max], x.fattore]));
  }
  if (T.pgPresenti) {
    letti.pgPresenti = T.pgPresenti.length;
    const ass = Object.fromEntries(T.pgPresenti.map((x) => [/^\d+/.exec(x[0])[0], numero(x[1])]));
    const c = px.correttivo_pg;
    for (const [n, v] of Object.entries(ass)) {
      const dato = Math.max(c.minimo, Math.round((1 + c.passo * (c.base - Number(n))) * 100) / 100);
      cmp('px_partita.correttivo_pg', `${n} PG`, v, dato);
    }
  }
  if (T.gradi && png) {
    letti.gradi = T.gradi.length;
    cmp('png_generici.px', 'PX base per Grado (EQ 0)', T.gradi.map((x) => [x[0], numero(x[2])]), Object.entries(png.px).map(([g, v]) => [g, v[0]]));
  }
  if (T.eq && png) {
    letti.eq = T.eq.length;
    cmp('png_generici.px', 'fattore per EQ', T.eq.map((x) => numero(x[3])), [0, 1, 2, 3, 4, 5].map((eq) => 1 + 0.5 * eq));
    cmp('png_generici.eq', 'nomi', T.eq.map((x) => [numero(x[1]), x[0].toLowerCase()]), (png.eq ?? []).map((x) => [x.eq, x.nome.toLowerCase()]));
    // la tabella intera dei PX (6 Gradi × 6 EQ) è base × (1 + 0,5 × EQ), esatta
    for (const [g, riga] of Object.entries(png.px)) riga.forEach((v, eq) => cmp('png_generici.px', `${g} EQ ${eq}`, v, Math.round(riga[0] * (1 + 0.5 * eq) * 100) / 100));
  }
  return { scarti, letti, nonLette };
}

const DIRETTO = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (DIRETTO) {
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
  const testo = arg('file') ? readFileSync(arg('file'), 'utf8') : testoManuale('direttore');
  const T = leggiDirettore(testo);
  const dati = Object.fromEntries(['px_partita', 'formato_nemici', 'png_generici'].map((k) => [k, JSON.parse(readFileSync(new URL(`../data/${k}.json`, import.meta.url), 'utf8'))]));
  const c = confronta(T, dati);
  console.log(`tabelle lette ${Object.keys(c.letti).length}/7 (${JSON.stringify(c.letti)}), non lette: ${c.nonLette.join(', ') || '—'}, scarti: ${c.scarti.length}`);
  for (const s of c.scarti) console.log(`  ${s.chi} · ${s.campo}: manuale ${JSON.stringify(s.manuale)} · dato ${JSON.stringify(s.dato)}`);
}
