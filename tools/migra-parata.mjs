// A.206 (30/10/2026): il Talento a scelta del Lottatore «Parata a Mani Nude» è sostituito da «Parata a Mani Nude Migliorata»
// (la Parata a mani nude è ora compresa nell'Addestramento al Combattimento Senz'Armi del I Grado).
//
// L'app non ha bisogno di questo passaggio: legge il nome di prima (`nomi_precedenti` in data/classi.json, funzione
// `talentoAScelta` di src/avanzamento.js) e lo riconduce al nuovo Talento senza toccare il file del PG. Lo strumento serve a
// riscrivere il nome nel file quando lo si vuole, ed è il solo posto in cui si vede quali scelte ha toccato.
//
//   node tools/migra-parata.mjs --cartella DIR                   rapporto: non scrive niente
//   node tools/migra-parata.mjs --cartella DIR --scrivi --backup DIR2   riscrive i file, dopo averne messo l'originale in DIR2
//
// Le cartelle vere non si scrivono (tools/protezione-reali.mjs): si prova su una copia. Una scelta che non si riconduce da
// sola (la voce non è di un Lottatore, o il PG ha già il Talento nuovo) non si tocca: è elencata, con il perché.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';

export const VECCHIO = 'Parata a Mani Nude';
export const NUOVO = 'Parata a Mani Nude Migliorata';

/**
 * Il piano per un personaggio già letto (oggetto del file).
 * @returns {{ ricondotte: { indice: number, livello: number|null, classe: string|null }[], nonRicondotte: { dove: string, perche: string }[] }}
 */
export function pianoParata(o) {
  const ricondotte = []; const nonRicondotte = [];
  const livelli = Array.isArray(o?.livelli) ? o.livelli : [];
  // la Classe di ogni voce: l'ultima `grado: { classe }` vista fino a quel punto non basta, perché ogni voce di Grado la dice da sé
  livelli.forEach((v, indice) => {
    if (v?.talentoClasse !== VECCHIO) return;
    const classe = v?.grado?.classe ?? null;
    if (classe !== 'Lottatore') {
      nonRicondotte.push({ dove: `livelli[${indice}].talentoClasse`, perche: `la voce è di ${classe ? `un ${classe}` : 'una Classe che il file non dice'}, non di un Lottatore: il Talento a scelta con questo nome è solo del Lottatore` });
      return;
    }
    if (livelli.some((w) => w?.talentoClasse === NUOVO)) {
      nonRicondotte.push({ dove: `livelli[${indice}].talentoClasse`, perche: `il personaggio ha già «${NUOVO}»: i due non si sommano` });
      return;
    }
    ricondotte.push({ indice, livello: v.livello ?? null, classe });
  });
  // il nome di prima in altri punti del file (note, registro, correzioni): non si tocca, si dice dove sta
  const dentro = (x, via) => {
    if (typeof x === 'string') { if (x.includes(VECCHIO) && !x.includes(NUOVO) && via !== 'talentoClasse') nonRicondotte.push({ dove: via, perche: 'compare il nome di prima in un testo libero: non è una scelta, non si riscrive' }); return; }
    if (Array.isArray(x)) x.forEach((y, i) => dentro(y, `${via}[${i}]`));
    else if (x && typeof x === 'object') for (const [k, y] of Object.entries(x)) dentro(y, via ? `${via}.${k}` : k);
  };
  dentro({ scelte: o?.scelte, sessione: o?.sessione, correzioni_master: o?.correzioni_master }, '');
  return { ricondotte, nonRicondotte };
}

/** Il personaggio con le scelte ricondotte (una copia). */
export function applicaParata(o) {
  const { ricondotte } = pianoParata(o);
  const c = JSON.parse(JSON.stringify(o));
  for (const r of ricondotte) c.livelli[r.indice].talentoClasse = NUOVO;
  return c;
}

function tuttiIFile(dir, base = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    return d.isDirectory() ? tuttiIFile(p, base) : /\.json$/i.test(d.name) ? [{ nome: relative(base, p).split(sep).join('/'), file: p }] : [];
  });
}

/** Il rapporto su una cartella: per ogni file di personaggio che nomina il Talento, che cosa succede. */
export function rapporto(cartella) {
  const righe = [];
  for (const { nome, file } of tuttiIFile(cartella)) {
    let o;
    try { o = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
    if (o?.formato !== 'mutant-personaggio') continue;
    const piano = pianoParata(o);
    if (piano.ricondotte.length || piano.nonRicondotte.length) righe.push({ nome, file, ...piano });
  }
  return righe;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  fermaSeSconosciuti(process.argv.slice(2), ARGOMENTI['migra-parata.mjs'], 'migra-parata.mjs');
  const a = {};
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i += 1) {
    const m = v[i].match(/^--([^=]+)(?:=(.*))?$/);
    if (!m) continue;
    a[m[1]] = m[2] ?? (v[i + 1] && !v[i + 1].startsWith('--') ? v[++i] : true);
  }
  if (!a.cartella || a.cartella === true) { console.error('Dimmi la cartella dei personaggi: --cartella DIR (su una copia, se vuoi scrivere).'); process.exit(2); }
  const righe = rapporto(a.cartella);
  if (!righe.length) console.log('Nessun personaggio nomina «Parata a Mani Nude»: niente da fare.');
  for (const r of righe) {
    console.log(`${r.nome}: ${r.ricondotte.length} scelta/e da ricondurre${r.ricondotte.map((x) => ` (livello ${x.livello ?? '?'}, ${x.classe})`).join('')}`);
    for (const n of r.nonRicondotte) console.log(`   NON ricondotta — ${n.dove}: ${n.perche}`);
  }
  if (a.scrivi) {
    if (!a.backup || a.backup === true) { console.error('Con --scrivi serve --backup DIR: lì va l’originale di ogni file toccato.'); process.exit(2); }
    const { cartelleReali, installaGuardiaScrittura } = await import('./protezione-reali.mjs');
    if (!a['dati-reali']) installaGuardiaScrittura(cartelleReali(dirname(dirname(fileURLToPath(import.meta.url)))));
    mkdirSync(a.backup, { recursive: true });
    let n = 0;
    for (const r of righe) {
      if (!r.ricondotte.length) continue;
      copyFileSync(r.file, join(a.backup, r.nome.replace(/[\\/]/g, '__')));
      writeFileSync(r.file, JSON.stringify(applicaParata(JSON.parse(readFileSync(r.file, 'utf8'))), null, 2) + '\n');
      n += r.ricondotte.length;
    }
    console.log(`Riscritte ${n} scelte; gli originali sono in ${a.backup}.`);
  } else console.log('(Rapporto: nessun file scritto. Per scrivere: --scrivi --backup DIR, su una copia.)');
}
