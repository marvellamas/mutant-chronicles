// «Cerca i personaggi» (26/10/2026, voce P di Mutant.bat): dove possono essere finiti i personaggi e i PX di questo PC
// dopo un aggiornamento finito in un'altra cartella. LEGGE SOLTANTO: non sposta, non copia, non cancella niente. L'unica
// scrittura è quella che decide chi usa la voce, dopo il SI: la cartella dei dati di questo PC (tools/dati-pc.mjs).
//
// Dove guarda:
//  - le copie dell'app: la cartella dell'app, la cartella dei dati di questo PC, le cartelle sopra e accanto (le versioni
//    precedenti del pacchetto), il Desktop, Documenti, Download, C:\Mutant, la cartella dell'utente (pochi livelli);
//  - in ogni copia: personaggi\ (e il suo storico), salvataggi\, backup-prima-aggiornamento\, autosave\ (gli zip), px\
//    (px.json e il suo storico);
//  - la cartella di Google Drive scritta in qualunque config-salvataggi.json trovato (gli zip dei salvataggi);
//  - Documenti e Download: i file .json esportati («SALVA PG»).
// Per ogni personaggio (identificativo `pg`, o il nome per i file di prima) mette in cima la versione più recente: quando
// il server l'ha scritta (`aggiornato_il`) o, senza, la data del file.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { homedir } from 'node:os';
import { leggiZip } from './salva-sessione.mjs';
import { talentiDi } from './stato-personaggi.mjs';

const NOME_FILE_PG = /_liv\d{1,2}_\d{4}-\d{2}-\d{2}\.json$/;
const SALTA = new Set(['node_modules', '.git', 'AppData', 'Windows', 'Program Files', 'Program Files (x86)', '$Recycle.Bin', 'ProgramData', 'src', 'css', 'data', 'img', 'docs', 'tests', 'Manuali', 'Sounds']);
const norma = (p) => resolve(p).toLowerCase();

/** Le radici in cui cercare le copie dell'app (solo quelle che esistono). */
export function radiciDiRicerca(radiceApp, { dati = null, home = homedir(), extra = [] } = {}) {
  const sopra = dirname(resolve(radiceApp));
  const cand = [radiceApp, dati, sopra, dirname(sopra), join(home, 'Desktop'), join(home, 'Documents'), join(home, 'Documenti'), join(home, 'Downloads'), join(home, 'OneDrive', 'Desktop'), join(home, 'OneDrive', 'Documents'), 'C:\\Mutant', home, ...extra];
  const visti = new Set();
  return cand.filter(Boolean).filter((p) => existsSync(p) && !visti.has(norma(p)) && visti.add(norma(p)));
}

/** Le copie dell'app (cartelle che contengono personaggi\ con almeno un file personaggio), cercando sotto le radici. */
export function copieDellApp(radici, { profondita = 4, massimo = 40000 } = {}) {
  const trovate = new Map();
  let visitate = 0;
  const visita = (dir, livello) => {
    if (visitate++ > massimo) return;
    let voci;
    try { voci = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    if (voci.some((v) => v.isDirectory() && v.name === 'personaggi')) {
      try { if (readdirSync(join(dir, 'personaggi')).some((f) => NOME_FILE_PG.test(f))) trovate.set(norma(dir), resolve(dir)); } catch { /* illeggibile */ }
    }
    if (livello >= profondita) return;
    for (const v of voci) if (v.isDirectory() && !SALTA.has(v.name) && !v.name.startsWith('.') && v.name !== 'personaggi') visita(join(dir, v.name), livello + 1);
  };
  for (const r of radici) visita(r, 0);
  return [...trovate.values()];
}

/** Un personaggio letto da un testo: { pg, nome, livello, px, quando } o null se non è un personaggio. */
export function leggiPersonaggio(testo, mtime) {
  let o;
  try { o = JSON.parse(testo); } catch { return null; }
  if (o?.formato !== 'mutant-personaggio') return null;
  const t = talentiDi(o);
  const quando = Date.parse(o.aggiornato_il ?? '') || mtime || 0;
  return { pg: typeof o.pg === 'string' ? o.pg : null, nome: String(o?.scelte?.nome ?? '').trim() || '(senza nome)', livello: t.livello, px: t.px, quando };
}

const zipIn = (dir) => { try { return readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.zip')).map((f) => join(dir, f)); } catch { return []; } };
const leggiTesto = (p) => { try { return readFileSync(p, 'utf8'); } catch { return null; } };
const mtimeDi = (p) => { try { return statSync(p).mtimeMs; } catch { return 0; } };

/** Il riassunto di un px.json (pannello PX): { partite, quando }. */
function riassuntoPx(testo, mtime) {
  try {
    const o = JSON.parse(testo);
    const partite = Array.isArray(o?.archivio) ? o.archivio.length : Array.isArray(o?.partite) ? o.partite.length : 0;
    return { partite, quando: mtime };
  } catch { return null; }
}

/**
 * La ricerca. @returns {{ copie: [{ cartella, quanti, ultima, inUso }], personaggi: [{ chiave, nome, versioni: [...] }],
 *   px: [{ dove, quando, partite }], zipDrive: [percorsi] }} — versioni dal più recente: { dove, tipo, quando, livello, px }
 */
export function cerca({ radiceApp, dati = null, radici = null, home = homedir() } = {}) {
  const copie = copieDellApp(radici ?? radiciDiRicerca(radiceApp, { dati, home }));
  if (dati && existsSync(join(dati, 'personaggi')) && !copie.some((c) => norma(c) === norma(dati))) copie.unshift(resolve(dati));
  const versioni = [];
  const px = [];
  // lo storico è la copia del file PRIMA di un salvataggio: la data del file è quella della copia, non del personaggio.
  // Conta solo quando il server l'aveva scritto (aggiornato_il); senza, va in fondo.
  const aggiungi = (testo, mtime, dove, tipo) => { const p = leggiPersonaggio(testo, tipo === 'storico' ? 0 : mtime); if (p) versioni.push({ ...p, dove, tipo }); };
  const drive = new Set();
  for (const c of copie) {
    const pers = join(c, 'personaggi');
    for (const f of readdirSync(pers).filter((x) => NOME_FILE_PG.test(x))) aggiungi(leggiTesto(join(pers, f)), mtimeDi(join(pers, f)), join(pers, f), 'cartella');
    // lo storico: le copie dei file prima di ogni salvataggio
    try {
      for (const id of readdirSync(join(pers, 'storico'))) for (const f of readdirSync(join(pers, 'storico', id)).filter((x) => x.endsWith('.json'))) aggiungi(leggiTesto(join(pers, 'storico', id, f)), mtimeDi(join(pers, 'storico', id, f)), join(pers, 'storico', id, f), 'storico');
    } catch { /* senza storico */ }
    for (const sotto of ['salvataggi', 'backup-prima-aggiornamento', 'autosave']) for (const z of zipIn(join(c, sotto))) leggiDaZip(z, aggiungi, px);
    // px\px.json e il suo storico
    const fpx = join(c, 'px', 'px.json');
    const t = leggiTesto(fpx);
    if (t) { const r = riassuntoPx(t, mtimeDi(fpx)); if (r) px.push({ dove: fpx, ...r }); }
    try { for (const f of readdirSync(join(c, 'px', 'storico')).filter((x) => x.endsWith('.json'))) { const p = join(c, 'px', 'storico', f); const r = riassuntoPx(leggiTesto(p), mtimeDi(p)); if (r) px.push({ dove: p, ...r }); } } catch { /* senza storico */ }
    // la cartella di Google Drive dei salvataggi, se scritta nella configurazione
    try { const conf = JSON.parse(readFileSync(join(c, 'config-salvataggi.json'), 'utf8')); if (typeof conf?.cartella_drive === 'string' && conf.cartella_drive.trim()) drive.add(conf.cartella_drive.trim()); } catch { /* senza configurazione */ }
  }
  for (const d of drive) for (const z of zipIn(d)) leggiDaZip(z, aggiungi, px);
  // gli export («SALVA PG») in Documenti e Download
  for (const d of [join(home, 'Documents'), join(home, 'Documenti'), join(home, 'Downloads')]) {
    try { for (const f of readdirSync(d).filter((x) => x.toLowerCase().endsWith('.json'))) aggiungi(leggiTesto(join(d, f)), mtimeDi(join(d, f)), join(d, f), 'export'); } catch { /* non c'è */ }
  }
  // per personaggio, dal più recente
  const per = new Map();
  for (const v of versioni) {
    const k = v.pg ? `pg:${v.pg}` : `nome:${v.nome.toLowerCase()}`;
    if (!per.has(k)) per.set(k, []);
    per.get(k).push(v);
  }
  const personaggi = [...per].map(([chiave, vv]) => {
    vv.sort((a, b) => b.quando - a.quando || (a.tipo === 'cartella' ? -1 : 1));
    return { chiave, nome: vv[0].nome, versioni: vv };
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  const inUso = dati ? norma(dati) : null;
  const elencoCopie = copie.map((c) => {
    const miei = versioni.filter((v) => v.tipo === 'cartella' && norma(dirname(dirname(v.dove))) === norma(c));
    return { cartella: c, quanti: new Set(miei.map((v) => v.pg ?? v.nome)).size, ultima: Math.max(0, ...miei.map((v) => v.quando)), inUso: norma(c) === inUso };
  }).sort((a, b) => b.ultima - a.ultima);
  return { copie: elencoCopie, personaggi, px: px.sort((a, b) => b.quando - a.quando), zipDrive: [...drive] };
}

/**
 * Le date delle voci di uno zip (dalla directory centrale, formato DOS): { nome: ms }. Servono perché la data dello zip è
 * quella in cui è stata fatta la copia, non quella del personaggio dentro (una copia di stamattina di un file vecchio).
 */
export function dateNelloZip(buf) {
  const out = {};
  const fine = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (fine < 0) return out;
  let p = buf.readUInt32LE(fine + 16);
  const n = buf.readUInt16LE(fine + 10);
  for (let i = 0; i < n && p + 46 <= buf.length && buf.readUInt32LE(p) === 0x02014b50; i++) {
    const ora = buf.readUInt16LE(p + 12);
    const data = buf.readUInt16LE(p + 14);
    const lnome = buf.readUInt16LE(p + 28);
    const nome = buf.subarray(p + 46, p + 46 + lnome).toString('utf8').replace(/\\/g, '/');
    out[nome] = new Date(1980 + (data >> 9), ((data >> 5) & 15) - 1, data & 31, ora >> 11, (ora >> 5) & 63, (ora & 31) * 2).getTime();
    p += 46 + lnome + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return out;
}

function leggiDaZip(zip, aggiungi, px) {
  let voci;
  let date = {};
  try { const buf = readFileSync(zip); voci = leggiZip(buf); date = dateNelloZip(buf); } catch { return; }
  const quandoZip = mtimeDi(zip);
  for (const [n, buf] of Object.entries(voci)) {
    const nome = n.replace(/\\/g, '/');
    const quando = date[nome] || quandoZip;
    if (/^personaggi\/[^/]+\.json$/.test(nome)) aggiungi(buf.toString('utf8'), quando, `${zip} -> ${nome}`, 'zip');
    if (nome === 'px/px.json') { const r = riassuntoPx(buf.toString('utf8'), quando); if (r) px.push({ dove: `${zip} -> ${nome}`, ...r }); }
  }
}

export const nomeCartella = (p) => basename(p);
