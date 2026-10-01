// Lotto 13 del catalogo dell'equipaggiamento: Manovre compatibili dei profili commerciali
// (Manuale degli Armamenti v0.50, §7.1.7, pp. 9–10).
//   node tools/lotti/lotto13_manovre.mjs            prova a vuoto
//   node tools/lotti/lotto13_manovre.mjs --scrivi   aggiorna data/equipaggiamento/armi.json
//
// Fonti (docs/lotti/lotto13-manovre/): grezzo/ (tools/estrai_manuali.py --tabelle, pp. 9–10) e
// prosa/ (il §7.1 da --prosa).
//
// Regole del generatore (documentate in docs/equipaggiamento-lotti.md):
// 1. Le due tabelle «Modello | Manovre compatibili» (una per pagina) si leggono insieme; ogni
//    modello deve esistere in armi.json (catalogo Commerciale) e ogni profilo commerciale deve
//    comparire una volta.
// 2. «—» (Frusta) diventa ["generali"], come nelle schede corporative del lotto 4: nessuna
//    Manovra specifica, restano le generali (§7.1.7).
// 3. armi.json è la fonte dati del lotto 1: il generatore aggiunge soltanto il campo `manovre`,
//    prima di `proprieta`, e controlla che il resto di ogni oggetto resti identico.
// 4. Ogni riga ritrovata nel testo in prosa.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { bloccaRiscrittura } from './superato.mjs';
bloccaRiscrittura('lotto13_manovre');

const RADICE = new URL('../../', import.meta.url);
const LOTTO = new URL('docs/lotti/lotto13-manovre/', RADICE);
const FILE = new URL('data/equipaggiamento/armi.json', RADICE);
const scrivi = process.argv.includes('--scrivi');

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

const righe = readdirSync(new URL('grezzo/', LOTTO)).filter((f) => f.endsWith('.csv')).sort()
  .flatMap((f) => leggiCsv(readFileSync(new URL(`grezzo/${f}`, LOTTO), 'utf8')).filter((r) => r[0] !== 'Modello'));
const testo = readFileSync(new URL('prosa/7.1 Dati fondamentali delle armi.txt', LOTTO), 'utf8').split('\n');
const sorgente = readFileSync(FILE, 'utf8');
const armi = JSON.parse(sorgente);
const commerciali = armi.oggetti.filter((o) => o.catalogo === 'Commerciale' && o.tipo === 'arma_ravvicinata');

const manovre = new Map();
for (const [modello, cella] of righe) {
  if (manovre.has(modello)) throw new Error(`«${modello}» ripetuto`);
  if (!testo.includes(`${modello} ${cella}`)) throw new Error(`riga non ritrovata nel testo: ${modello} ${cella}`);
  if (!commerciali.some((o) => o.nome === modello)) throw new Error(`«${modello}» non è un profilo commerciale di armi.json`);
  manovre.set(modello, cella === '—' ? ['generali'] : cella.split(/,\s*/));
}
const mancanti = commerciali.filter((o) => !manovre.has(o.nome)).map((o) => o.nome);
if (mancanti.length) throw new Error(`profili senza riga nel §7.1.7: ${mancanti.join(', ')}`);
for (const m of new Set([...manovre.values()].flat())) if (!['Affondo', 'Spazzata', 'Stordire', 'generali'].includes(m)) throw new Error(`Manovra sconosciuta: ${m}`);

// regola 3: si aggiunge soltanto `manovre`, prima di `proprieta`
const nuovi = armi.oggetti.map((o) => {
  if (!manovre.has(o.nome)) return o;
  const { manovre: _vecchie, ...resto } = o;
  const voci = Object.entries(resto);
  const i = voci.findIndex(([k]) => k === 'proprieta');
  voci.splice(i < 0 ? voci.length : i, 0, ['manovre', manovre.get(o.nome)]);
  return Object.fromEntries(voci);
});
for (const [i, o] of nuovi.entries()) {
  const { manovre: _m, ...senza } = o;
  const { manovre: _v, ...prima } = armi.oggetti[i];
  if (JSON.stringify(senza) !== JSON.stringify(prima)) throw new Error(`${o.nome}: cambierebbe altro oltre a manovre`);
}
const json = { ...armi, oggetti: nuovi };

if (scrivi) {
  writeFileSync(FILE, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`aggiornato data/equipaggiamento/armi.json: manovre su ${manovre.size} profili`);
} else {
  for (const [k, v] of manovre) console.log(`${k}: ${v.join(', ')}`);
  console.log(`righe ${righe.length}, profili commerciali ${commerciali.length}`);
}
