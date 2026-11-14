// Che cosa cambia, modello per modello, fra i dieci PNG generici che l'app aveva (Mostri 0.47 / Direttore 0.46,
// lotto 143) e i venticinque della 0.67 (lotto 197). **Legge soltanto**: non scrive niente, da nessuna parte.
//
// Perché serve. Un modello PNG non è un dato di gioco salvato: è uno stampo. «Crea nemico» lo usa una volta, al
// momento della creazione, e scrive nel nemico i numeri così come sono (`src/png-generici.js` → `profiloPng`
// riempie un oggetto `mutant-nemico` completo). Un nemico già salvato in `nemici/`, in uno scontro o in una scena
// quindi **non cambia** quando cambia lo stampo: porta i suoi numeri con sé. Questo strumento serve a dire al
// Direttore che cosa troverà di diverso la prossima volta che crea un modello, e a trovare i nemici salvati che
// vengono da un modello (blocco `_bestiario.scelte.png`), perché sappia da quale edizione vengono.
//
//   node tools/png-prima-dopo.mjs                      → confronto con la versione di png_generici.json in git
//   node tools/png-prima-dopo.mjs --da=<commit>         → con un'altra revisione
//   node tools/png-prima-dopo.mjs --nemici=<cartella>   → elenca i nemici salvati nati da un modello PNG
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const GRADI = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const FILE = 'data/png_generici.json';

/** La versione del file dati a una revisione di git (default: HEAD). */
export function daGit(commit = 'HEAD', radice = RADICE) {
  return JSON.parse(execFileSync('git', ['show', `${commit}:${FILE}`], { cwd: radice, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
}

const valori = (c, g) => {
  const r = c.risorse[g]; const s = c.salvezze[g];
  return {
    PV: r.pv, PM: r.pm, INI: r.ini, AP: r.ap, AR: r.ar, Parata: r.parata, Schivata: r.schivata,
    Tempra: s.tempra, Riflessi: s.riflessi, 'Volontà': s.volonta, Magia: s.magia,
  };
};

/**
 * Le differenze fra due edizioni dei dati, per i modelli presenti in entrambe.
 * @returns {{ nuovi: string[], differenze: [{ modello, grado, campo, prima, dopo }] }}
 */
export function differenze(prima, dopo) {
  const nuovi = Object.keys(dopo.classi).filter((id) => !prima.classi[id]);
  const spariti = Object.keys(prima.classi).filter((id) => !dopo.classi[id]);
  const differenze = [];
  for (const id of Object.keys(prima.classi)) {
    const a = prima.classi[id]; const b = dopo.classi[id];
    if (!b) continue;
    for (const g of GRADI) {
      const va = valori(a, g); const vb = valori(b, g);
      for (const k of Object.keys(va)) if (va[k] !== vb[k]) differenze.push({ modello: b.nome, grado: g, campo: k, prima: va[k], dopo: vb[k] });
      // attacchi: confronto per posizione, perché cambia anche il nome dell'arma
      const aa = a.attacchi[g] ?? []; const ab = b.attacchi[g] ?? [];
      for (let i = 0; i < Math.max(aa.length, ab.length); i += 1) {
        const x = aa[i]; const y = ab[i];
        if (!x || !y) { differenze.push({ modello: b.nome, grado: g, campo: `attacco ${i + 1}`, prima: x ? `${x.arma} VA ${x.va}` : '—', dopo: y ? `${y.arma} VA ${y.va}` : '—' }); continue; }
        if (x.arma !== y.arma) differenze.push({ modello: b.nome, grado: g, campo: `attacco ${i + 1}, arma`, prima: x.arma, dopo: y.arma });
        if (x.va !== y.va) differenze.push({ modello: b.nome, grado: g, campo: `${y.arma} VA`, prima: x.va, dopo: y.va });
        if (x.danno !== y.danno) differenze.push({ modello: b.nome, grado: g, campo: `${y.arma} danno`, prima: x.danno, dopo: y.danno });
      }
      // Abilità
      for (const [nome, vals] of Object.entries(a.abilita)) {
        const i = GRADI.indexOf(g);
        const dopoV = b.abilita[nome]?.[i];
        if (vals[i] !== dopoV) differenze.push({ modello: b.nome, grado: g, campo: `Abilità ${nome}`, prima: vals[i], dopo: dopoV ?? '—' });
      }
    }
  }
  return { nuovi, spariti, differenze };
}

/** I nemici salvati nati da un modello PNG: file con `_bestiario.scelte.png`. Legge soltanto. */
export function nemiciDaModello(cartella) {
  const out = [];
  if (!existsSync(cartella)) return out;
  const gira = (dove, livello = 0) => {
    if (livello > 3) return;
    for (const n of readdirSync(dove)) {
      const p = join(dove, n);
      if (statSync(p).isDirectory()) { gira(p, livello + 1); continue; }
      if (!n.endsWith('.json')) continue;
      let j; try { j = JSON.parse(readFileSync(p, 'utf8')); } catch { continue; }
      const dentro = Array.isArray(j) ? j : [j, ...(Array.isArray(j.nemici) ? j.nemici : []), ...(j.nemico ? [j.nemico] : [])];
      for (const x of dentro) {
        const png = x?._bestiario?.scelte?.png;
        if (png) out.push({ file: p, nome: x.nome ?? x.id, png, fonte: x.fonte ?? null });
      }
    }
  };
  gira(cartella);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = Object.fromEntries(process.argv.slice(2).map((x) => { const m = x.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [x, true]; }));
  if (a.nemici) {
    const trovati = nemiciDaModello(a.nemici);
    console.log(trovati.length ? `${trovati.length} nemici salvati nati da un modello PNG:` : `Nessun nemico salvato nato da un modello PNG in ${a.nemici}.`);
    for (const t of trovati) console.log(`  ${t.nome} — ${t.png.classe} ${t.png.grado} EQ ${t.png.eq} — ${t.file}`);
    console.log('\nI numeri di un nemico salvato sono scritti nel suo file e non cambiano quando cambia il modello: lo stampo si usa una volta, alla creazione.');
    process.exit(0);
  }
  const prima = daGit(a.da ?? 'HEAD');
  const dopo = JSON.parse(readFileSync(join(RADICE, FILE), 'utf8'));
  const { nuovi, spariti, differenze: diff } = differenze(prima, dopo);
  console.log(`Prima: ${prima.versione_manuale} — ${Object.keys(prima.classi).length} modelli.`);
  console.log(`Dopo:  ${dopo.versione_manuale} — ${Object.keys(dopo.classi).length} modelli.`);
  if (nuovi.length) console.log(`\nModelli nuovi (${nuovi.length}): ${nuovi.map((id) => dopo.classi[id].nome).join(', ')}.`);
  if (spariti.length) console.log(`\nModelli spariti (${spariti.length}): ${spariti.join(', ')}.`);
  const perModello = new Map();
  for (const d of diff) { if (!perModello.has(d.modello)) perModello.set(d.modello, []); perModello.get(d.modello).push(d); }
  console.log(`\nDifferenze sui modelli che c'erano già: ${diff.length} celle, ${perModello.size} modelli.`);
  for (const [m, righe] of perModello) {
    const campi = new Map();
    for (const r of righe) { if (!campi.has(r.campo)) campi.set(r.campo, []); campi.get(r.campo).push(`${r.grado} ${r.prima}→${r.dopo}`); }
    console.log(`\n  ${m} (${righe.length})`);
    for (const [campo, v] of campi) console.log(`    ${campo}: ${v.join(', ')}`);
  }
}
