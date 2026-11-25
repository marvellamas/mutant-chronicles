import '../tools/guardia-subito.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';

// Lotto 250, parte D — **un file nuovo non può prendere il posto di uno che esiste senza che si sappia.**
//
// Il fatto: nel lotto 249 ho scritto il pannello del diario in `src/ui/avvisi.js`, che esisteva dal 06/10 ed è il
// modulo degli avvisi brevi. L'ho sovrascritto, e per tre commit l'app non si è caricata («does not provide an export
// named 'avviso'»). Nessun test lo ha visto: i test provano le funzioni, non il caricamento della pagina.
//
// **La regola che si poteva scrivere e quella che non si può.** «Nessun nome di file si ripete» non si può:
// nel progetto `src/x.js` è il motore e `src/ui/x.js` la sua interfaccia, e oggi ventotto nomi si ripetono per
// questa ragione (`tavolo.js`, `scontro.js`, `veicoli.js`…). Vietarlo vorrebbe dire rinominare mezzo progetto per
// un difetto che non sta nel nome: sta nel fatto che **qualcuno importava un nome che il file non dava più**.
//
// Quindi il controllo guarda quello: ogni `import` di un file del progetto deve puntare a un file che c'è, e ogni
// nome importato deve essere fra quelli che quel file esporta. Con questo controllo, il guasto del 249 sarebbe
// diventato rosso al primo `npm test`, prima del commit — e qualunque sovrascrittura futura lo diventa.
const RADICE = resolve(import.meta.dirname, '..');
const CARTELLE = ['src', 'tools', 'tests'];

const file = (c) => readdirSync(join(RADICE, c), { withFileTypes: true }).flatMap((d) => {
  const p = join(c, d.name);
  if (d.isDirectory()) return file(p);
  return /\.(js|mjs)$/.test(d.name) ? [p] : [];
});
const TUTTI = CARTELLE.flatMap(file);

/** Gli import statici di un file: [{ nomi: [...], da: 'percorso' }]. `nomi` vuoto = solo per effetto o `* as`. */
function importiDi(testo) {
  const fuori = [];
  const re = /^\s*import\s+([^'"]*?)\s*from\s*['"]([^'"]+)['"]/gm;
  for (const m of testo.matchAll(re)) {
    const clausola = m[1].trim();
    const graffe = /\{([^}]*)\}/.exec(clausola);
    const nomi = graffe
      ? graffe[1].split(',').map((x) => x.trim()).filter(Boolean).map((x) => x.split(/\s+as\s+/)[0].trim())
      : [];
    fuori.push({ nomi: nomi.filter((n) => n !== 'default'), da: m[2] });
  }
  return fuori;
}

/** I nomi che un file esporta (statici: non copre `export * from`, che si segnala a parte). */
function esportaDi(testo) {
  const nomi = new Set();
  for (const m of testo.matchAll(/^\s*export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) nomi.add(m[1]);
  for (const m of testo.matchAll(/^\s*export\s*\{([^}]*)\}/gm)) {
    for (const pezzo of m[1].split(',')) {
      const come = pezzo.trim().split(/\s+as\s+/);
      if (come.length > 1) nomi.add(come[1].trim());
      else if (come[0]) nomi.add(come[0].trim());
    }
  }
  return { nomi, riesporta: /^\s*export\s+\*\s+from/m.test(testo) };
}

test('ogni import del progetto punta a un file che esiste', () => {
  const rotti = [];
  for (const f of TUTTI) {
    const testo = readFileSync(join(RADICE, f), 'utf8');
    for (const i of importiDi(testo)) {
      if (!i.da.startsWith('.')) continue; // pacchetti e moduli di Node: non sono nostri
      const p = resolve(RADICE, dirname(f), i.da.replace(/[?#].*$/, ''));
      if (!existsSync(p) || !statSync(p).isFile()) rotti.push(`${f} → ${i.da}`);
    }
  }
  assert.deepEqual(rotti, [], `import che non puntano a niente:\n${rotti.join('\n')}`);
});

test('ogni nome importato è fra quelli che il file esporta (il guasto di src/ui/avvisi.js nel lotto 249)', () => {
  const cache = new Map();
  const esporta = (p) => {
    if (!cache.has(p)) cache.set(p, esportaDi(readFileSync(p, 'utf8')));
    return cache.get(p);
  };
  const mancanti = [];
  for (const f of TUTTI) {
    const testo = readFileSync(join(RADICE, f), 'utf8');
    for (const i of importiDi(testo)) {
      if (!i.da.startsWith('.') || !i.nomi.length) continue;
      const p = resolve(RADICE, dirname(f), i.da.replace(/[?#].*$/, ''));
      if (!existsSync(p)) continue; // lo dice il controllo di sopra
      const e = esporta(p);
      if (e.riesporta) continue; // un `export * from` porta nomi che non si leggono qui: si dichiara e si salta
      for (const n of i.nomi) if (!e.nomi.has(n)) mancanti.push(`${f} importa «${n}» da ${i.da}, che non lo esporta`);
    }
  }
  assert.deepEqual(mancanti, [], `nomi importati che non esistono:\n${mancanti.join('\n')}`);
});

test('i nomi di file che si ripetono sono le coppie motore/interfaccia, e si dichiarano', () => {
  // non è un divieto: è un censimento che tiene la convenzione visibile. `src/x.js` motore, `src/ui/x.js` interfaccia.
  const perNome = new Map();
  for (const f of TUTTI.filter((x) => x.startsWith('src'))) {
    const n = basename(f);
    if (!perNome.has(n)) perNome.set(n, []);
    perNome.get(n).push(f.split(String.fromCharCode(92)).join("/"));
  }
  const fuoriRegola = [...perNome.entries()]
    .filter(([, dove]) => dove.length > 1)
    .filter(([, dove]) => !(dove.length === 2 && dove.some((x) => /^src\/[^/]+$/.test(x)) && dove.some((x) => /^src\/ui\//.test(x))
      || dove.every((x) => /^src\/(ui\/)?(mappa)\//.test(x)) && dove.length === 2))
    .map(([n, dove]) => `${n}: ${dove.join(' e ')}`);
  assert.deepEqual(fuoriRegola, [], `nomi ripetuti che non sono una coppia motore/interfaccia:\n${fuoriRegola.join('\n')}`);
});
