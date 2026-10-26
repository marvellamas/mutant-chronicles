// «Cerca i personaggi» (26/10/2026, voce P di Mutant.bat; ritocchi del 26/10 sera dopo il caso di Davide): dove possono
// essere finiti i personaggi e i PX di questo PC. LEGGE SOLTANTO: non sposta, non copia, non cancella niente. L'unica
// scrittura è quella che decide chi usa la voce, dopo il SI: la cartella dei dati di questo PC (tools/dati-pc.mjs).
//
// Il caso di Davide (26/10 sera): il desktop mostrava due cartelle «distribuzione» insieme a una «Dati precedenti…».
// Windows unisce nella stessa vista «Desktop» tre cartelle diverse — quella dell'utente, quella pubblica
// (C:\Users\Public\Desktop) e, se OneDrive gestisce il desktop, C:\Users\<nome>\OneDrive\Desktop (o
// «OneDrive - <altro nome>», per gli account aziendali) — e la ricerca ne guardava solo una. Non è successo di nuovo:
// si guardano tutte.
//
// Dove guarda:
//  - le copie dell'app: la cartella dell'app, la cartella dei dati di questo PC, le cartelle sopra e accanto (le versioni
//    precedenti del pacchetto), C:\Mutant, la cartella dell'utente, due livelli sotto la radice di ogni disco;
//  - **tutti i Desktop** (utente, pubblico, e ogni cartella «OneDrive*» trovata nel profilo), Documenti e Download,
//    anche nelle loro versioni OneDrive, cercando ad almeno 5 livelli di profondità, qualunque sia il nome delle
//    cartelle intorno (non serve che si chiamino «mutant» o «distribuzione»);
//  - dentro ogni cartella visitata si cerca una sottocartella «personaggi» (senza badare a maiuscole o spazi: Windows
//    non distingue le maiuscole nei nomi dei file) e si CONFERMA guardando il contenuto di almeno un file — deve
//    avere davvero la forma di un personaggio Mutant (`formato: "mutant-personaggio"`), non solo il nome giusto;
//  - dentro ogni copia trovata: lo storico, gli zip di salvataggi\, backup-prima-aggiornamento\, autosave\, e px\
//    (px.json e il suo storico);
//  - la cartella di Google Drive scritta in qualunque config-salvataggi.json trovato (gli zip dei salvataggi);
//  - Documenti e Download (tutte le varianti): i file .json esportati («SALVA PG»).
// Per ogni personaggio (identificativo `pg`, o il nome per i file di prima) mette in cima la versione più recente: quando
// il server l'ha scritta (`aggiornato_il`) o, senza, la data del file. Le cartelle che sono anche installazioni vere di
// Mutant (Mutant.bat o server.mjs accanto a personaggi\) vengono proposte prima delle altre.
// Se la ricerca impiega più di un minuto, scrive ogni tanto dove sta guardando (`onProgress`).
// Se nessuna ricerca automatica trova la cartella giusta: `risolviPercorsoManuale` (B) accetta un percorso scritto o
// incollato a mano, anche fra virgolette, e lo stesso controllo del contenuto.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, basename, parse } from 'node:path';
import { homedir } from 'node:os';
import { leggiZip } from './salva-sessione.mjs';
import { talentiDi } from './stato-personaggi.mjs';

const NOME_FILE_PG = /_liv\d{1,2}_\d{4}-\d{2}-\d{2}\.json$/;
const SALTA = new Set(['node_modules', '.git', 'appdata', 'windows', 'program files', 'program files (x86)', '$recycle.bin', 'programdata', 'src', 'css', 'data', 'img', 'docs', 'tests', 'manuali', 'sounds']);
const eSalta = (nome) => SALTA.has(nome.toLowerCase());
const norma = (p) => resolve(p).toLowerCase();
/** I marcatori di un'installazione vera di Mutant, nella cartella stessa. */
const MARCATORI_APP = ['Mutant.bat', 'server.mjs'];

/** Le cartelle utente dove cercare (26/10 sera): Desktop, Documenti, Download — dell'utente, pubblici e di OneDrive,
 * in qualunque forma si chiami («OneDrive», «OneDrive - Nome Azienda»…). Solo quelle che esistono davvero. */
export function cartelleUtente(home = homedir()) {
  const out = [];
  const aggiungi = (dir, sotto) => { for (const s of sotto) out.push(join(dir, s)); };
  const SOTTOCARTELLE = ['Desktop', 'Documents', 'Documenti', 'Downloads', 'Download'];
  aggiungi(home, SOTTOCARTELLE);
  // il desktop pubblico: Explorer lo mostra insieme a quello dell'utente, nella stessa vista «Desktop»
  aggiungi(join(dirname(resolve(home)), 'Public'), ['Desktop']);
  // ogni cartella «OneDrive…» dentro il profilo (OneDrive personale o aziendale, con qualunque nome dopo il trattino)
  try {
    for (const v of readdirSync(home, { withFileTypes: true })) {
      if (v.isDirectory() && /^onedrive/i.test(v.name)) aggiungi(join(home, v.name), SOTTOCARTELLE);
    }
  } catch { /* profilo non leggibile: si guardano solo le cartelle sopra */ }
  const visti = new Set();
  return out.filter((p) => existsSync(p) && !visti.has(norma(p)) && visti.add(norma(p)));
}

/** Le radici in cui cercare le copie dell'app, con la profondità di ciascuna: [[percorso, profondità], …]. */
export function radiciDiRicerca(radiceApp, { dati = null, home = homedir(), extra = [] } = {}) {
  const sopra = dirname(resolve(radiceApp));
  const visti = new Set();
  const out = [];
  const aggiungi = (p, profondita) => { if (p && existsSync(p) && !visti.has(norma(p))) { visti.add(norma(p)); out.push([resolve(p), profondita]); } };
  aggiungi(radiceApp, 4);
  aggiungi(dati, 4);
  aggiungi(sopra, 3);
  aggiungi(dirname(sopra), 3);
  // Desktop, Documenti, Download (utente, pubblico, OneDrive): almeno 5 livelli, come chiesto
  for (const c of cartelleUtente(home)) aggiungi(c, 5);
  aggiungi('C:\\Mutant', 4);
  aggiungi(home, 2);
  for (const e of extra) aggiungi(e, 4);
  return out;
}

/** Le radici dei dischi dell'app e dell'utente (C:\, D:\…): si guardano solo pochi livelli sotto (per esempio D:\Mutant\mutant). */
export function radiciDischi(radiceApp, { home = homedir() } = {}) {
  const visti = new Set();
  return [parse(resolve(radiceApp)).root, parse(resolve(home)).root].filter((r) => r && !visti.has(r.toLowerCase()) && visti.add(r.toLowerCase()));
}

const nomiFile = (voci) => voci.filter((v) => v.isFile()).map((v) => v.name);
const trovaSottocartella = (voci, nome) => voci.find((v) => v.isDirectory() && v.name.trim().toLowerCase() === nome)?.name ?? null;

/**
 * `dir` ha una sottocartella «personaggi» (senza badare a maiuscole o spazi) con dentro file che hanno davvero la
 * forma di un personaggio Mutant? Il nome del file (veloce) filtra i candidati, il contenuto conferma.
 * @returns il nome della sottocartella trovata, o null.
 */
function cartellaPersonaggiValida(dir, voci) {
  const nome = trovaSottocartella(voci, 'personaggi');
  if (!nome) return null;
  let file;
  try { file = readdirSync(join(dir, nome)).filter((f) => NOME_FILE_PG.test(f)); } catch { return null; }
  if (!file.length) return null;
  const confermato = file.some((f) => {
    try { return JSON.parse(readFileSync(join(dir, nome, f), 'utf8'))?.formato === 'mutant-personaggio'; } catch { return false; }
  });
  return confermato ? nome : null;
}

/**
 * Le copie dell'app (cartelle che hanno, accanto a sé, una sottocartella «personaggi» con dentro file di personaggi
 * veri: il nome del file conta poco, è il contenuto a confermarlo), cercando sotto le radici.
 * `radici`: percorsi, oppure [percorso, profondità] per guardare meno (o più) livelli.
 * `onProgress(percorso)`: chiamata ogni tanto se la ricerca impiega più di un minuto.
 */
export function copieDellApp(radici, { profondita = 4, massimo = 60000, onProgress = null } = {}) {
  const trovate = new Map();
  let visitate = 0;
  const inizio = Date.now();
  let ultimoAvviso = 0;
  const visita = (dir, livello, profonditaMax) => {
    if (visitate++ > massimo) return;
    if (onProgress && Date.now() - inizio > 60000 && Date.now() - ultimoAvviso > 5000) { ultimoAvviso = Date.now(); onProgress(dir); }
    let voci;
    try { voci = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    if (cartellaPersonaggiValida(dir, voci)) { trovate.set(norma(dir), resolve(dir)); return; }
    if (livello >= profonditaMax) return;
    for (const v of voci) if (v.isDirectory() && !eSalta(v.name) && !v.name.startsWith('.')) visita(join(dir, v.name), livello + 1, profonditaMax);
  };
  for (const r of radici) { const [p, prof] = Array.isArray(r) ? r : [r, profondita]; visita(p, 0, prof); }
  return [...trovate.values()];
}

/**
 * Le installazioni di Mutant su questo PC (cartelle con Mutant.bat o server.mjs), con le stesse radici di
 * «Cerca i personaggi» ma una ricerca più leggera (si ferma al primo marcatore trovato in ogni ramo). Per la voce C
 * «Controlla lo stato» (26/10 sera): dire quali altre copie ci sono, non solo dove sono i dati.
 */
export function installazioniMutant(radiceApp, { home = homedir(), radici = null, massimo = 20000 } = {}) {
  const insieme = radici ?? radiciDiRicerca(radiceApp, { home }).map(([p, prof]) => [p, Math.min(prof, 3)]);
  const trovate = new Map();
  let visitate = 0;
  const visita = (dir, livello, profonditaMax) => {
    if (visitate++ > massimo) return;
    let voci;
    try { voci = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    if (MARCATORI_APP.some((m) => nomiFile(voci).includes(m))) { trovate.set(norma(dir), resolve(dir)); return; }
    if (livello >= profonditaMax) return;
    for (const v of voci) if (v.isDirectory() && !eSalta(v.name) && !v.name.startsWith('.')) visita(join(dir, v.name), livello + 1, profonditaMax);
  };
  for (const r of insieme) { const [p, prof] = Array.isArray(r) ? r : [r, 3]; visita(p, 0, prof); }
  return [...trovate.values()];
}

/** La cartella `appRoot` è un'installazione vera di Mutant (Mutant.bat o server.mjs accanto a personaggi\)? */
export const eCopiaApp = (appRoot) => MARCATORI_APP.some((m) => existsSync(join(appRoot, m)));

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
/** La sottocartella «personaggi» di `c`, senza badare a maiuscole o spazi nel nome (Windows non le distingue). */
function cartellaPersonaggiDi(c) {
  let voci;
  try { voci = readdirSync(c, { withFileTypes: true }); } catch { return join(c, 'personaggi'); }
  return join(c, trovaSottocartella(voci, 'personaggi') ?? 'personaggi');
}

/** Il riassunto di un px.json (pannello PX): { partite, quando }. */
function riassuntoPx(testo, mtime) {
  try {
    const o = JSON.parse(testo);
    const partite = Array.isArray(o?.archivio) ? o.archivio.length : Array.isArray(o?.partite) ? o.partite.length : 0;
    return { partite, quando: mtime };
  } catch { return null; }
}

/**
 * La ricerca. @returns {{ copie: [{ cartella, quanti, ultima, appCopia, inUso }], personaggi: [{ chiave, nome,
 *   versioni: [...] }], px: [{ dove, quando, partite }], zipDrive: [percorsi] }} — versioni dal più recente:
 *   { dove, tipo, quando, livello, px }. `copie`: prima le installazioni vere (Mutant.bat o server.mjs), poi le altre,
 *   in ciascun gruppo dalla più recente.
 */
export function cerca({ radiceApp, dati = null, radici = null, home = homedir(), onProgress = null } = {}) {
  const copie = copieDellApp(radici ?? radiciDiRicerca(radiceApp, { dati, home }), { onProgress });
  if (dati && existsSync(join(dati, 'personaggi')) && !copie.some((c) => norma(c) === norma(dati))) copie.unshift(resolve(dati));
  const versioni = [];
  const px = [];
  // lo storico è la copia del file PRIMA di un salvataggio: la data del file è quella della copia, non del personaggio.
  // Conta solo quando il server l'aveva scritto (aggiornato_il); senza, va in fondo.
  const aggiungi = (testo, mtime, dove, tipo) => { const p = leggiPersonaggio(testo, tipo === 'storico' ? 0 : mtime); if (p) versioni.push({ ...p, dove, tipo }); };
  const drive = new Set();
  for (const c of copie) {
    const pers = cartellaPersonaggiDi(c);
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
  // gli export («SALVA PG») in Documenti e Download (tutte le varianti, incluso OneDrive)
  const cartelleEsportazione = new Set([join(home, 'Documents'), join(home, 'Documenti'), join(home, 'Downloads'), join(home, 'Download'), ...cartelleUtente(home).filter((c) => /document|downloads?$/i.test(basename(c)))]);
  for (const d of cartelleEsportazione) {
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
    const miei = versioni.filter((v) => v.tipo === 'cartella' && norma(dirname(v.dove)) === norma(cartellaPersonaggiDi(c)));
    return { cartella: c, quanti: new Set(miei.map((v) => v.pg ?? v.nome)).size, ultima: Math.max(0, ...miei.map((v) => v.quando)), appCopia: eCopiaApp(c), inUso: norma(c) === inUso };
  }).sort((a, b) => (b.appCopia - a.appCopia) || b.ultima - a.ultima); // (A) le installazioni vere prima, poi dalla più recente
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

/** Pulisce un percorso incollato (Esplora risorse lo mette fra virgolette se ha spazi): toglie virgolette e spazi. */
export function puliscePercorso(input) {
  return String(input ?? '').trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
}

/**
 * Risolve un percorso scritto a mano nella cartella dei dati (B, 26/10 sera): accetta sia la cartella «personaggi»
 * stessa sia la cartella che la contiene (la cartella dei dati). Legge soltanto, con lo stesso controllo del contenuto.
 * @returns { ok:true, dati, cartellaPersonaggi, personaggi:[{nome,px}] } oppure { ok:false, motivo }
 */
export function risolviPercorsoManuale(input) {
  const pulito = puliscePercorso(input);
  if (!pulito) return { ok: false, motivo: 'percorso vuoto' };
  let percorso;
  try { percorso = resolve(pulito); } catch { return { ok: false, motivo: `percorso non valido: ${pulito}` }; }
  if (!existsSync(percorso)) return { ok: false, motivo: `non trovo questa cartella: ${percorso}` };
  if (!statSync(percorso).isDirectory()) return { ok: false, motivo: `non è una cartella: ${percorso}` };
  const nomiValidiPersonaggio = (dir) => {
    let file;
    try { file = readdirSync(dir).filter((f) => NOME_FILE_PG.test(f)); } catch { return []; }
    return file.filter((f) => { try { return JSON.parse(readFileSync(join(dir, f), 'utf8'))?.formato === 'mutant-personaggio'; } catch { return false; } });
  };
  let nomi = nomiValidiPersonaggio(percorso);
  let dati = dirname(percorso);
  let cartellaPersonaggi = percorso;
  if (!nomi.length) {
    // oppure è la cartella dei dati, con una sottocartella «personaggi» (il caso più comune)
    let voci;
    try { voci = readdirSync(percorso, { withFileTypes: true }); } catch { voci = []; }
    const sottonome = trovaSottocartella(voci, 'personaggi');
    if (sottonome) {
      const sotto = join(percorso, sottonome);
      const nomi2 = nomiValidiPersonaggio(sotto);
      if (nomi2.length) { nomi = nomi2; dati = percorso; cartellaPersonaggi = sotto; }
    }
  }
  if (!nomi.length) return { ok: false, motivo: `in questa cartella non trovo file di personaggi Mutant: ${percorso}` };
  const personaggi = nomi.map((f) => {
    const p = leggiPersonaggio(leggiTesto(join(cartellaPersonaggi, f)) ?? '', mtimeDi(join(cartellaPersonaggi, f)));
    return p ? { nome: p.nome, px: p.px } : { nome: f, px: null };
  });
  return { ok: true, dati, cartellaPersonaggi, personaggi };
}
