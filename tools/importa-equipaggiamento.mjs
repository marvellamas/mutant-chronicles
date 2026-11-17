// Lettore delle tabelle del Manuale dell'Equipaggiamento (lotto 212, 17/11/2026) — peso, costo e reperibilità di ogni oggetto.
//
// Le lezioni dei lotti 204–211, nel codice:
//  - le intestazioni delle 99 tabelle si **censiscono** (`censimentoIntestazioni`): una colonna rinominata compare nel referto invece di far
//    cadere in silenzio delle righe; una colonna che non conosciamo non si indovina, si dichiara (`intestazioniSconosciute`);
//  - **la rete**: il lettore si prova prima sull'edizione da cui i dati vengono (la 0.30). Ogni scarto che trova lì è un difetto suo o un dato
//    rimasto indietro rispetto alla 0.30 stessa: mai una differenza della 0.42;
//  - una lettura che non sa leggere una cella (un peso che non è un numero) è **non letta**, non zero: il campo non si scrive mai sopra un valore buono;
//  - sola lettura: la scrittura è del generatore di lotto, non di questo strumento.
//
//   node tools/importa-equipaggiamento.mjs [--file=<testo.md>]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { testoManuale } from './manuali.mjs';

/** I file di dati che vengono dall'Equipaggiamento (non dagli Armamenti). */
export const FILE_EQUIPAGGIAMENTO = ['comunicazione', 'dotazioni_personali', 'esplorazione', 'impianti', 'sanitario', 'strumenti_professionali'];

const pulisci = (s) => String(s ?? '').replace(/\*\*/g, '').replace(/\\([\\`*_{}\[\]()#+\-.!=<>|~$])/g, '$1').replace(/ /g, ' ').trim();
export const chiave = (s) => pulisci(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[−–—]/g, '-').replace(/\s+/g, ' ');

/** Tutte le tabelle: [{ colonne, righe:[[cella…]], riga }]. */
export function leggiTabelle(testo) {
  const r = String(testo).split(/\r?\n/);
  const out = [];
  for (let i = 0; i < r.length - 1; i++) {
    if (!r[i].trim().startsWith('|') || !/^\|?\s*:?-{2,}/.test(r[i + 1].trim())) continue;
    const celle = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(pulisci);
    const righe = [];
    let j = i + 2;
    while (j < r.length && r[j].trim().startsWith('|')) { righe.push(celle(r[j])); j++; }
    out.push({ colonne: celle(r[i]), righe, riga: i + 1 });
    i = j - 1;
  }
  return out;
}

/** Il censimento: intestazione → quante tabelle. */
export function censimentoIntestazioni(tabelle) {
  const c = {};
  for (const t of tabelle) { const k = t.colonne.join(' | '); c[k] = (c[k] ?? 0) + 1; }
  return c;
}

/** Quale colonna è il peso, il costo, la reperibilità: **solo** per le intestazioni note; le altre sono «non lette». */
const PESO = /^peso( pieno| completo| a vuoto)?$/i;
const COSTO = /^costo( cr)?$/i;
const REP = /^(rep|reperibilità)$/i;
const COSTO_REP = /^costo \/ rep$/i;

/** «3,5 kg» → 3.5; «1.500» → 1500; null se non è un numero (non letto, non zero). */
export function numeroDi(s) {
  const t = pulisci(s).replace(/\s*(kg|cr)\s*$/i, '');
  if (!/^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(t)) return null;
  return Number(t.replace(/\./g, '').replace(',', '.'));
}

/** Le righe-oggetto di una tabella con una colonna di peso, costo o reperibilità: [{ nome, peso, costo, rep, tabella }]. */
export function righeOggetto(tabelle) {
  const out = []; const nonLette = [];
  for (const t of tabelle) {
    const col = t.colonne;
    const iP = col.findIndex((c) => PESO.test(c)), iC = col.findIndex((c) => COSTO.test(c)), iR = col.findIndex((c) => REP.test(c)), iCR = col.findIndex((c) => COSTO_REP.test(c));
    if (iP < 0 && iC < 0 && iR < 0 && iCR < 0) { nonLette.push(col.join(' | ')); continue; }
    for (const r of t.righe) {
      const o = { nome: r[0], peso: iP >= 0 ? numeroDi(r[iP]) : undefined, costo: iC >= 0 ? numeroDi(r[iC]) : undefined, rep: iR >= 0 ? pulisci(r[iR]) : undefined, tabella: t.riga };
      if (iCR >= 0) { const [c, ...rep] = String(r[iCR]).split('/'); o.costo = numeroDi(c); o.rep = pulisci(rep.join('/')); }
      out.push(o);
    }
  }
  return { righe: out, intestazioniSenzaOggetti: nonLette };
}

/** I dati: tutti gli oggetti dei sei file (e dei nomi alternativi), per nome normalizzato. */
export function oggettiDati(leggiFile) {
  const m = new Map();
  for (const f of FILE_EQUIPAGGIAMENTO) {
    for (const o of leggiFile(f).oggetti ?? []) {
      for (const n of [o.nome, ...(o.nomi_alternativi ?? [])]) { const k = chiave(n); if (!m.has(k)) m.set(k, { ...o, _file: f }); }
    }
  }
  return m;
}

const REP_DATO = { CO: 'comune', NC: 'non comune', RA: 'rara', MR: 'molto rara', EP: 'epica', LG: 'leggendaria' };
const stessaRep = (letta, dato) => {
  const a = chiave(letta); const b = chiave(dato ?? '');
  return a === b || a === (REP_DATO[String(dato).toUpperCase()] ?? '') || chiave(REP_DATO[String(letta).toUpperCase()] ?? '') === b;
};

/** Il confronto: per ogni riga letta che ha un oggetto nei dati, gli scarti di peso, costo e reperibilità. */
export function confronta(righe, dati) {
  const scarti = []; let appaiate = 0; const senzaDato = [];
  for (const r of righe) {
    const d = dati.get(chiave(r.nome));
    if (!d) { senzaDato.push(r.nome); continue; }
    appaiate++;
    if (r.peso !== undefined && r.peso !== null && d.peso !== undefined && Number(d.peso) !== r.peso) scarti.push({ nome: r.nome, file: d._file, id: d.id, campo: 'peso', manuale: r.peso, dato: d.peso });
    if (r.costo !== undefined && r.costo !== null && d.costo !== undefined && d.costo !== null && Number(d.costo) !== r.costo) scarti.push({ nome: r.nome, file: d._file, id: d.id, campo: 'costo', manuale: r.costo, dato: d.costo });
    if (r.rep && d.reperibilita && !stessaRep(r.rep, d.reperibilita)) scarti.push({ nome: r.nome, file: d._file, id: d.id, campo: 'reperibilita', manuale: r.rep, dato: d.reperibilita });
  }
  return { scarti, appaiate, senzaDato };
}

const DIRETTO = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (DIRETTO) {
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
  const testo = arg('file') ? readFileSync(arg('file'), 'utf8') : testoManuale('equipaggiamento');
  const tab = leggiTabelle(testo);
  const { righe, intestazioniSenzaOggetti } = righeOggetto(tab);
  const leggi = (f) => JSON.parse(readFileSync(new URL(`../data/equipaggiamento/${f}.json`, import.meta.url), 'utf8'));
  const dati = oggettiDati(leggi);
  const c = confronta(righe, dati);
  console.log(`tabelle ${tab.length}, intestazioni distinte ${Object.keys(censimentoIntestazioni(tab)).length}, righe-oggetto ${righe.length}, appaiate ai dati ${c.appaiate}, scarti ${c.scarti.length}`);
  for (const s of c.scarti) console.log(`  ${s.file}/${s.id} «${s.nome}»: ${s.campo} manuale ${s.manuale} · dato ${s.dato}`);
}
