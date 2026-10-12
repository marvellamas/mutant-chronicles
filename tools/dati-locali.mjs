// Rete di sicurezza dei dati di questo PC intorno a ogni aggiornamento (12/10/2026, richiesta urgente di Marcello:
// dopo un aggiornamento le cartelle di Davide risultavano vuote, docs/diagnosi-dati-spariti-2026-10-12.md).
//
// Un aggiornamento, con Git o da zip, fa sempre questi tre passi:
//   1. PRIMA: si conta che cosa c'è nelle cartelle locali (statoLocali) e se ne fa una copia zip in
//      backup-prima-aggiornamento/locali_<data>.zip (copiaDiSicurezza), tenendo le ultime N;
//   2. l'aggiornamento vero e proprio (git pull, oppure la copia dei file dello zip);
//   3. DOPO: si riconta (statoLocali) e si confronta (svuotate). Se una cartella che prima aveva file ora è
//      vuota o sparita, l'aggiornamento si ferma, lo dice chiaramente e propone di rimettere la copia del
//      passo 1 (rimettiCopia).
//
// L'elenco delle cartelle locali e quello su cui si fa il confronto stanno in tools/file-locali.json, non qui
// (CLAUDE.md, principio 1). Nessuna funzione cancella mai dati: rimettiCopia riscrive soltanto i file che non
// ci sono più.
import { existsSync, readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { creaZip, leggiZip, dimensione } from './salva-sessione.mjs';

const RADICE = fileURLToPath(new URL('..', import.meta.url));
const due = (n) => String(n).padStart(2, '0');

/**
 * L'elenco dei file e delle cartelle locali (tools/file-locali.json): quello della cartella indicata, oppure
 * quello di questa copia dell'app (una cartella di prova può non averlo).
 */
export function elencoLocali(radice = RADICE) {
  for (const p of [join(radice, 'tools', 'file-locali.json'), join(RADICE, 'tools', 'file-locali.json')]) {
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
  }
  throw new Error('manca tools/file-locali.json');
}

/** locali_AAAA-MM-GG_hh-mm-ss.zip, lo stesso nome che usa distribuzione/aggiorna-da-zip.ps1. */
export const nomeCopia = (d) => `locali_${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`
  + `_${due(d.getHours())}-${due(d.getMinutes())}-${due(d.getSeconds())}.zip`;

/** I file di una cartella, ricorsivamente: [{ nome dentro lo zip, file, mtime, dimensione }]. Assente: nessuno. */
export function fileDi(nome, dove) {
  if (!existsSync(dove)) return [];
  const out = [];
  const giro = (d, pre) => {
    for (const v of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(d, v.name);
      if (v.isDirectory()) giro(p, `${pre}${v.name}/`);
      else if (v.isFile()) { const s = statSync(p); out.push({ nome: `${pre}${v.name}`, file: p, mtime: s.mtime, dimensione: s.size }); }
    }
  };
  giro(dove, `${nome}/`);
  return out;
}

/**
 * Che cosa c'è adesso nelle cartelle da controllare: { personaggi: { esiste, file, byte }, … }.
 * I LEGGIMI.txt non contano: una cartella con il solo LEGGIMI è vuota di dati.
 */
export function statoLocali(radice = RADICE, elenco = elencoLocali(radice)) {
  const out = {};
  for (const c of elenco.controllo_svuotamento) {
    const dove = join(radice, c);
    const file = fileDi(c, dove).filter((f) => !/\/LEGGIMI\.txt$/i.test(f.nome));
    out[c] = { esiste: existsSync(dove), file: file.length, byte: file.reduce((n, f) => n + f.dimensione, 0) };
  }
  return out;
}

/**
 * Le cartelle che prima avevano file e ora non ne hanno più (o non ci sono più). Funzione pura.
 * @returns [{ cartella, prima, dopo, sparita }]
 */
export function svuotate(prima, dopo) {
  const out = [];
  for (const [c, p] of Object.entries(prima ?? {})) {
    if (!p?.file) continue;
    const d = dopo?.[c] ?? { esiste: false, file: 0 };
    if (d.file === 0) out.push({ cartella: c, prima: p.file, dopo: d.file, sparita: !d.esiste });
  }
  return out;
}

/** Il messaggio da mettere a schermo quando una cartella si è svuotata. Funzione pura, niente accenti. */
export function testoSvuotate(lista, zip) {
  if (!lista?.length) return '';
  const righe = [
    ' ==============================================================',
    '  ATTENZIONE: dopo l\'aggiornamento mancano dei dati di questo PC.',
    ' ==============================================================',
    '',
    ...lista.map((x) => `  ${x.cartella}: prima ${x.prima} file, adesso ${x.sparita ? 'la cartella non c\'e\' piu\'' : 'nessuno'}`),
    '',
  ];
  righe.push(zip
    ? `  La copia fatta prima dell'aggiornamento e' qui: ${zip}`
    : '  Non c\'e\' una copia di sicurezza di prima dell\'aggiornamento.');
  return righe.join('\n');
}

/**
 * La copia zip di tutte le cartelle locali, prima di toccare qualunque cosa.
 * @returns { zip, file, byte, saltate } oppure { zip: null, file: 0 } se non c'era niente da salvare.
 * Lancia se la copia non riesce: chi la chiama non deve aggiornare.
 */
export function copiaDiSicurezza({ radice = RADICE, elenco = elencoLocali(radice), adesso = new Date() } = {}) {
  const esclusi = new Set(elenco.backup_esclusi ?? []);
  const voci = [];
  for (const c of elenco.cartelle) {
    if (esclusi.has(c)) continue;
    voci.push(...fileDi(c, join(radice, c)).map((f) => ({ nome: f.nome, dati: readFileSync(f.file), mtime: f.mtime })));
  }
  for (const f of elenco.file ?? []) {
    const p = join(radice, f);
    if (existsSync(p)) voci.push({ nome: f, dati: readFileSync(p), mtime: statSync(p).mtime });
  }
  if (!voci.length) return { zip: null, file: 0, byte: 0 };

  const dir = join(radice, elenco.cartella_backup);
  mkdirSync(dir, { recursive: true });
  let zip = join(dir, nomeCopia(adesso));
  for (let k = 2; existsSync(zip); k++) zip = join(dir, nomeCopia(adesso).replace(/\.zip$/, `_${k}.zip`));
  const buf = creaZip(voci);
  writeFileSync(zip, buf, { flag: 'wx' });
  leggiZip(readFileSync(zip)); // si rilegge: dev'essere buona, altrimenti lancia

  // si tengono le ultime N
  const tieni = Number(elenco.backup_da_tenere) || 5;
  const vecchie = readdirSync(dir).filter((n) => /^locali_.*\.zip$/i.test(n))
    .map((n) => ({ n, t: statSync(join(dir, n)).mtime.getTime() }))
    .sort((a, b) => b.t - a.t || b.n.localeCompare(a.n)).slice(tieni);
  for (const v of vecchie) { try { unlinkSync(join(dir, v.n)); } catch { /* non importa */ } }
  return { zip, file: voci.length, byte: buf.length, tolte: vecchie.length };
}

/**
 * Rimette i file della copia che adesso non ci sono: non sovrascrive e non cancella mai niente.
 * @returns { rimessi, saltati, cartelle: [nomi toccati] }
 */
export function rimettiCopia({ radice = RADICE, zip }) {
  const voci = leggiZip(readFileSync(zip));
  let rimessi = 0;
  let saltati = 0;
  const cartelle = new Set();
  for (const [nome, dati] of Object.entries(voci)) {
    if (nome.split('/').some((p) => p === '..' || p === '' || p === '.') || /^[a-z]:/i.test(nome) || nome.includes('\\')) continue;
    const p = join(radice, ...nome.split('/'));
    if (!normalize(p).startsWith(normalize(radice + sep))) continue;
    if (existsSync(p)) { saltati++; continue; }
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, dati);
    rimessi++;
    cartelle.add(nome.split('/')[0]);
  }
  return { rimessi, saltati, cartelle: [...cartelle].sort() };
}

/** «3 cartelle, 128 file, 11,6 MB»: la riga di una copia di sicurezza. */
export const rigaCopia = (c) => (c?.zip ? `${c.file} file, ${dimensione(c.byte)}` : 'niente da salvare');

// --- riga di comando -------------------------------------------------------------------------------------------
// Lo chiamano aggiorna.bat e la voce 2 della console, intorno al git pull:
//   node tools/dati-locali.mjs prima    → copia di sicurezza + stato in backup-prima-aggiornamento/.stato-prima.json
//   node tools/dati-locali.mjs dopo     → riconta e confronta; esce 1 se una cartella si è svuotata
//   node tools/dati-locali.mjs rimetti  → rimette la copia indicata da .stato-prima.json
const FILE_STATO = '.stato-prima.json';

export const percorsoStato = (radice = RADICE, elenco = elencoLocali(radice)) => join(radice, elenco.cartella_backup, FILE_STATO);

export function scriviStatoPrima(radice = RADICE, { elenco = elencoLocali(radice), adesso = new Date() } = {}) {
  const prima = statoLocali(radice, elenco);
  const copia = copiaDiSicurezza({ radice, elenco, adesso });
  const p = percorsoStato(radice, elenco);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify({ quando: adesso.toISOString(), prima, zip: copia.zip }, null, 2));
  return { prima, copia };
}

export function leggiStatoPrima(radice = RADICE, elenco = elencoLocali(radice)) {
  try { return JSON.parse(readFileSync(percorsoStato(radice, elenco), 'utf8')); } catch { return null; }
}

const arg = (k) => process.argv.find((x) => x.startsWith(`--${k}=`))?.slice(k.length + 3);
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const radice = arg('radice') || RADICE;
  const comando = process.argv[2];
  const elenco = elencoLocali(radice);
  if (comando === 'prima') {
    try {
      const { copia } = scriviStatoPrima(radice, { elenco });
      console.log(copia.zip ? `  Copia di sicurezza dei dati di questo PC: ${copia.zip} (${rigaCopia(copia)})`
        : '  Nessun dato di questo PC da salvare: niente copia di sicurezza.');
      process.exit(0);
    } catch (e) {
      console.log(`  Non riesco a fare la copia di sicurezza dei dati di questo PC (${e.message}).`);
      console.log('  Non aggiorno: controlla che ci sia spazio sul disco e che Mutant sia spento, poi riprova.');
      process.exit(1);
    }
  } else if (comando === 'dopo') {
    const stato = leggiStatoPrima(radice, elenco);
    if (!stato) { console.log('  (nessun confronto: manca lo stato di prima dell\'aggiornamento)'); process.exit(0); }
    const mancanti = svuotate(stato.prima, statoLocali(radice, elenco));
    if (!mancanti.length) { console.log('  I dati di questo PC sono al loro posto.'); process.exit(0); }
    console.log(testoSvuotate(mancanti, stato.zip));
    process.exit(1);
  } else if (comando === 'rimetti') {
    const stato = leggiStatoPrima(radice, elenco);
    if (!stato?.zip || !existsSync(stato.zip)) { console.log('  Non trovo la copia fatta prima dell\'aggiornamento.'); process.exit(1); }
    try {
      const r = rimettiCopia({ radice, zip: stato.zip });
      console.log(`  Rimessi ${r.rimessi} file (${r.cartelle.join(', ') || 'nessuna cartella'}); ${r.saltati} erano gia' al loro posto.`);
      process.exit(0);
    } catch (e) {
      console.log(`  Non sono riuscito a rimettere la copia (${e.message}). La copia e' comunque in ${stato.zip}.`);
      process.exit(1);
    }
  } else {
    console.error('Comandi: prima, dopo, rimetti  [--radice=<cartella>]');
    process.exit(2);
  }
}
