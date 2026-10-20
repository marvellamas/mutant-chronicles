// Ripristino di un salvataggio (richiesta di Marcello del 09/10/2026; voce 4 di Mutant.bat, tools/console.mjs).
// Rimette al loro posto le cartelle dei dati di gioco contenute in uno zip di salvataggi/ (sessione_…, prima-del-
// ripristino_…) o di autosave/ (autosave.zip, autosave-precedente.zip):
//   1. il server deve essere spento (altrimenti rifiuta: i tablet aperti riscriverebbero i dati vecchi);
//   2. lo zip si legge per intero e si controlla (CRC, nomi dentro le cartelle note) prima di toccare qualunque cosa;
//   3. copia di sicurezza dello stato attuale: salvataggi/prima-del-ripristino_AAAA-MM-GG_hhmm.zip, mai sovrascritta;
//      senza copia riuscita non si cancella nulla;
//   4. ogni cartella presente nello zip si sostituisce: la vecchia si sposta da parte, la nuova si scrive, poi la
//      vecchia si toglie (se qualcosa va storto si rimette la vecchia). Le cartelle che lo zip non ha restano come sono;
//      il LEGGIMI.txt di ogni cartella resta sempre.
import { existsSync, readdirSync, statSync, readFileSync, openSync, readSync, closeSync, fstatSync } from 'node:fs';
import { mkdir, writeFile, rename, rm, copyFile, readFile } from 'node:fs/promises';
import { join, dirname, normalize, sep } from 'node:path';
import { CARTELLE, cartelleDi, raccogli, creaZip, leggiZip, nomeLibero, dimensione, cartellaDrive } from './salva-sessione.mjs';
import { NOME_MARCATORE, statoInstallazione, avvisoSovrascrittura } from '../src/copia-di-lavoro.js';

const due = (n) => String(n).padStart(2, '0');
/** prima-del-ripristino_AAAA-MM-GG_hhmm.zip */
export const nomeCopiaSicurezza = (d) => `prima-del-ripristino_${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}_${due(d.getHours())}${due(d.getMinutes())}.zip`;

/** «09/10/2026 21:40» */
export const quando = (d) => `${due(d.getDate())}/${due(d.getMonth() + 1)}/${d.getFullYear()} ${due(d.getHours())}:${due(d.getMinutes())}`;

/** Che cos'è ogni tipo di salvataggio, per l'elenco. */
export const TIPI = {
  sessione: 'sessione',
  'prima-del-ripristino': 'prima di un ripristino',
  'prima-aggiornamento': 'prima di un aggiornamento',
  autosave: 'automatico (ultimo)',
  'autosave-precedente': 'automatico (quello prima)',
};

/**
 * I salvataggi da cui si può ripartire, dal più recente.
 * Si guarda in quattro posti (12/10/2026: prima erano due, e dopo un aggiornamento sbagliato in «salvataggi»
 * restava solo l'ultimo mentre gli altri erano su Drive o fra le copie dell'aggiornamento):
 *   - `salvataggi`: sessione_… e prima-del-ripristino_… («Salva sessione», «Spegni Mutant»);
 *   - `backup`: locali_… di backup-prima-aggiornamento/ (copie fatte prima di ogni aggiornamento);
 *   - `autosave`: autosave.zip e autosave-precedente.zip;
 *   - `drive`: la cartella di Google Drive impostata in config-salvataggi.json.
 * @returns [{ nome, percorso, tipo, tipoTesto, dove, etichetta, mtime, dimensione }]
 */
export function elencoSalvataggi({ salvataggi, autosave, backup = null, drive = null, massimo = 30 }) {
  const out = [];
  const tipoDaNome = (n) => (n.startsWith('prima-del-ripristino_') ? 'prima-del-ripristino'
    : n.startsWith('sessione_') ? 'sessione' : n.startsWith('locali_') ? 'prima-aggiornamento' : null);
  const cartella = (dove, etichettaDove) => {
    if (!dove || !existsSync(dove)) return;
    for (const n of readdirSync(dove)) {
      if (!/\.zip$/i.test(n)) continue;
      const tipo = tipoDaNome(n);
      if (!tipo) continue;
      const p = join(dove, n);
      let s;
      try { s = statSync(p); } catch { continue; }
      out.push({ nome: n, percorso: p, tipo, tipoTesto: TIPI[tipo], dove: etichettaDove, mtime: s.mtime, dimensione: s.size });
    }
  };
  cartella(salvataggi, 'cartella dei salvataggi');
  cartella(backup, 'copie prima degli aggiornamenti');
  cartella(drive, 'Google Drive');
  for (const [n, tipo] of [['autosave.zip', 'autosave'], ['autosave-precedente.zip', 'autosave-precedente']]) {
    const p = join(autosave ?? '', n);
    if (!autosave || !existsSync(p)) continue;
    const s = statSync(p);
    out.push({ nome: n, percorso: p, tipo, tipoTesto: TIPI[tipo], dove: 'salvataggio automatico', mtime: s.mtime, dimensione: s.size });
  }
  for (const s of out) s.etichetta = `${s.nome} — ${s.tipoTesto}, ${s.dove}`;
  return out.sort((a, b) => b.mtime - a.mtime || a.nome.localeCompare(b.nome)).slice(0, massimo);
}

/** Una riga dell'elenco: «09/10/2026 21:40  sessione_2026-10-09_2140.zip — sessione, cartella dei salvataggi  11,6 MB». */
export const rigaSalvataggio = (s) => `${quando(s.mtime)}  ${s.etichetta}  ${dimensione(s.dimensione)}`;

/**
 * Le quattro cartelle in cui cercare i salvataggi di un'installazione.
 * @param config contenuto di config-salvataggi.json (per la cartella di Google Drive)
 */
export const postiSalvataggi = (radice, config = null) => ({
  salvataggi: join(radice, 'salvataggi'),
  autosave: join(radice, 'autosave'),
  backup: join(radice, 'backup-prima-aggiornamento'),
  drive: cartellaDrive(config),
});

/**
 * All'avvio: la cartella dei personaggi è vuota ma dei salvataggi ci sono? (12/10/2026)
 * Non decide niente: dice soltanto che cosa mostrare, con il percorso della cartella in uso ben visibile.
 * @returns { vuota, percorso, quanti, salvataggi: [le prime voci], testo }
 */
export function avvisoCartellaVuota({ cartella, salvataggi, autosave, backup = null, drive = null, quante = 5 }) {
  let quanti = 0;
  try { quanti = readdirSync(cartella).filter((n) => /\.json$/i.test(n)).length; } catch { quanti = 0; }
  if (quanti > 0) return { vuota: false, percorso: cartella, quanti, salvataggi: [], testo: '' };
  const trovati = elencoSalvataggi({ salvataggi, autosave, backup, drive }).slice(0, quante);
  const testo = trovati.length
    ? `Non trovo personaggi in questa cartella: ${cartella}. Ci sono salvataggi del ${quando(trovati[0].mtime)}: vuoi ripristinarne uno?`
    : `Non trovo personaggi in questa cartella: ${cartella}. Non ci sono nemmeno salvataggi da cui ripartire.`;
  return { vuota: true, percorso: cartella, quanti: 0, salvataggi: trovati, testo };
}

// --- che cosa c'è dentro uno zip, senza aprirlo tutto ----------------------------------------------------------
// Un salvataggio può essere di 11 MB e nell'elenco ce ne sono fino a 30: si legge solo l'indice in coda al file
// (la «central directory» dello zip), che dà i nomi senza decomprimere niente.

/** I nomi dei file dentro uno zip, letti dal suo indice. `null` se l'indice non si legge. */
export function nomiNelloZip(percorso) {
  let fd;
  try {
    fd = openSync(percorso, 'r');
    const tot = fstatSync(fd).size;
    const coda = Math.min(tot, 66000); // 22 byte di indice finale + al massimo 65535 di commento
    const fine = Buffer.alloc(coda);
    readSync(fd, fine, 0, coda, tot - coda);
    let i = fine.length - 22;
    while (i >= 0 && fine.readUInt32LE(i) !== 0x06054b50) i--;
    if (i < 0) return null;
    const quanti = fine.readUInt16LE(i + 10);
    const lungIndice = fine.readUInt32LE(i + 12);
    const inizio = fine.readUInt32LE(i + 16);
    if (inizio === 0xffffffff) return null; // zip64: non ci serve, si rinuncia
    const indice = Buffer.alloc(lungIndice);
    readSync(fd, indice, 0, lungIndice, inizio);
    const nomi = [];
    let p = 0;
    for (let k = 0; k < quanti && p + 46 <= indice.length; k++) {
      if (indice.readUInt32LE(p) !== 0x02014b50) return null;
      const lnome = indice.readUInt16LE(p + 28);
      const lextra = indice.readUInt16LE(p + 30);
      const lcomm = indice.readUInt16LE(p + 32);
      nomi.push(indice.toString('utf8', p + 46, p + 46 + lnome).replace(/\\/g, '/'));
      p += 46 + lnome + lextra + lcomm;
    }
    return nomi;
  } catch { return null; } finally { if (fd !== undefined) try { closeSync(fd); } catch { /* niente */ } }
}

/** Quante voci per cartella: { personaggi: 3, scontri: 1, mappe: 2, … }. Funzione pura. */
export function perCartella(nomi) {
  const out = {};
  for (const n of nomi ?? []) {
    const [c, ...resto] = n.replace(/\\/g, '/').split('/');
    if (!resto.length || !resto.join('/') || /\/$/.test(n)) continue;
    if (/^LEGGIMI\.txt$/i.test(resto[resto.length - 1])) continue;
    out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}

/** Come si dice: «3 personaggi · 1 scontro · 2 mappe · 5 immagini». Funzione pura. */
export const PLURALI = {
  personaggi: ['personaggio', 'personaggi'], nemici: ['nemico', 'nemici'], scontri: ['scontro', 'scontri'],
  veicoli: ['veicolo', 'veicoli'], scene: ['scena', 'scene'], mappe: ['mappa', 'mappe'],
  galleria: ['immagine', 'immagini'], musica: ['brano', 'brani'], tavolo: ['file del tavolo', 'file del tavolo'],
};
export function testoContenuto(conteggi) {
  const voci = Object.entries(conteggi ?? {}).filter(([, n]) => n > 0);
  if (!voci.length) return 'vuoto';
  // nell'ordine in cui conta al tavolo, poi il resto
  const ordine = Object.keys(PLURALI);
  voci.sort((a, b) => (ordine.indexOf(a[0]) + 1 || 99) - (ordine.indexOf(b[0]) + 1 || 99) || a[0].localeCompare(b[0]));
  return voci.map(([c, n]) => {
    const p = PLURALI[c];
    return p ? `${n} ${n === 1 ? p[0] : p[1]}` : `${n} in ${c}`;
  }).join(' · ');
}

/** Il contenuto di un salvataggio per l'elenco: «3 personaggi · 1 scontro», o null se non si legge. */
export function contenutoPerElenco(percorso) {
  const nomi = nomiNelloZip(percorso);
  return nomi === null ? null : testoContenuto(perCartella(nomi));
}

/**
 * Il server di Mutant risponde su questa porta? { acceso, mutant }. Chiede /api/ping a 127.0.0.1, con un tempo breve.
 */
export async function statoServer(porta = 3000, { fetchFn = fetch, timeoutMs = 1500 } = {}) {
  try {
    const r = await fetchFn(`http://127.0.0.1:${porta}/api/ping`, { signal: AbortSignal.timeout(timeoutMs) });
    const j = await r.json().catch(() => ({}));
    return { acceso: true, mutant: j?.app === 'mutant' };
  } catch {
    return { acceso: false, mutant: false };
  }
}

/** «Spegni Mutant» dal di fuori (POST /api/spegni: salva la sessione e chiude il server), poi attende che sia spento. */
export async function spegniServer(porta = 3000, { fetchFn = fetch, attesaMs = 30000 } = {}) {
  let esito = null;
  try {
    const r = await fetchFn(`http://127.0.0.1:${porta}/api/spegni`, { method: 'POST', signal: AbortSignal.timeout(attesaMs) });
    esito = await r.json().catch(() => null);
    if (!r.ok) return { spento: false, motivo: esito?.errore ?? `risposta ${r.status}` };
  } catch (e) {
    return { spento: false, motivo: e.message };
  }
  const fine = Date.now() + attesaMs;
  while (Date.now() < fine) {
    if (!(await statoServer(porta, { fetchFn })).acceso) return { spento: true, esito };
    await new Promise((ok) => setTimeout(ok, 300));
  }
  return { spento: false, motivo: 'il server risponde ancora dopo l’attesa', esito };
}

/**
 * Contenuto di uno zip di salvataggio, controllato: { perCartella: { personaggi: [{ rel, dati }], … }, estranei: [] }.
 * Errore se lo zip è rovinato, se non contiene nessuna cartella nota o se un nome esce dalla sua cartella.
 */
export function contenutoSalvataggio(buf) {
  const voci = leggiZip(buf); // controlla anche i CRC
  const perCartella = {};
  const estranei = [];
  for (const [grezzo, dati] of Object.entries(voci)) {
    // le copie fatte prima di un aggiornamento le scrive Compress-Archive di PowerShell, con le barre rovesciate
    const nome = grezzo.replace(/\\/g, '/');
    const [cartella, ...resto] = nome.split('/');
    const rel = resto.join('/');
    if (!CARTELLE.includes(cartella) || !rel) { estranei.push(nome); continue; }
    if (resto.some((p) => p === '..' || p === '' || p === '.') || /^[a-z]:/i.test(rel)) throw new Error(`nome non valido nello zip: ${nome}`);
    (perCartella[cartella] ??= []).push({ rel, dati });
  }
  if (!Object.keys(perCartella).length) throw new Error('lo zip non contiene nessuna delle cartelle di Mutant');
  // 20/10: da dove arrivano questi dati? Il marcatore COPIA-DI-LAVORO.txt viaggia dentro lo zip con la cartella dei
  // personaggi: se c'è, il salvataggio è stato fatto su una copia di lavoro e non sul PC del Direttore.
  const marcatore = (perCartella.personaggi ?? []).find((x) => x.rel === NOME_MARCATORE);
  const da = marcatore ? statoInstallazione(Buffer.from(marcatore.dati).toString('utf8')) : statoInstallazione(null);
  return { perCartella, estranei, origine: da.copiaDiLavoro ? 'copia' : 'sconosciuta', notaOrigine: da.nota };
}

const ERRORI = new Set(['EPERM', 'EACCES', 'EBUSY']);
async function rinomina(da, a) {
  for (let i = 0, attesa = 20; ; i++, attesa *= 2) {
    try { return await rename(da, a); } catch (e) {
      if (i >= 6 || !ERRORI.has(e.code)) throw e;
      await new Promise((ok) => setTimeout(ok, attesa));
    }
  }
}

/** Sostituisce una cartella con i file dello zip; il LEGGIMI.txt di prima resta se lo zip non lo ha. */
async function sostituisciCartella(dove, file) {
  const daParte = `${dove}.ripristino-${process.pid}`;
  const esiste = existsSync(dove);
  if (esiste) await rinomina(dove, daParte);
  try {
    await mkdir(dove, { recursive: true });
    for (const { rel, dati } of file) {
      const p = join(dove, ...rel.split('/'));
      if (!normalize(p).startsWith(normalize(dove + sep))) throw new Error(`nome non valido: ${rel}`);
      await mkdir(dirname(p), { recursive: true });
      await writeFile(p, dati);
    }
    if (esiste && existsSync(join(daParte, 'LEGGIMI.txt')) && !existsSync(join(dove, 'LEGGIMI.txt'))) await copyFile(join(daParte, 'LEGGIMI.txt'), join(dove, 'LEGGIMI.txt'));
  } catch (e) {
    // si rimette la cartella di prima
    await rm(dove, { recursive: true, force: true }).catch(() => {});
    if (esiste) await rinomina(daParte, dove).catch(() => {});
    throw e;
  }
  if (esiste) await rm(daParte, { recursive: true, force: true });
}

/**
 * Il ripristino. { ok, copiaSicurezza, rimesse: [{ cartella, file }], lasciate: [cartelle non nello zip], estranei,
 * motivo? }. Non lancia: un errore torna come { ok: false, motivo }, con quello che era già stato fatto.
 * @param serverAcceso funzione async che dice se il server è acceso (di norma statoServer sulla porta 3000)
 */
export async function ripristina({ zip, cartelle, salvataggi, adesso = new Date(), serverAcceso = async () => (await statoServer()).acceso }) {
  if (await serverAcceso()) return { ok: false, motivo: 'Mutant è acceso: spegnilo prima di ripristinare (i tablet aperti riscriverebbero i dati).' };
  let contenuto;
  try { contenuto = contenutoSalvataggio(await readFile(zip)); } catch (e) { return { ok: false, motivo: `salvataggio non utilizzabile: ${e.message}. Non ho toccato nulla.` }; }
  // copia di sicurezza di tutto lo stato attuale, prima di cancellare qualunque cosa
  let copiaSicurezza;
  try {
    const lista = raccogli(cartelle);
    const voci = lista.map((f) => ({ nome: f.nome, dati: readFileSync(f.file), mtime: f.mtime }));
    await mkdir(salvataggi, { recursive: true });
    copiaSicurezza = join(salvataggi, nomeLibero(salvataggi, nomeCopiaSicurezza(adesso)));
    await writeFile(copiaSicurezza, creaZip(voci), { flag: 'wx' });
    contenutoSalvataggio(await readFile(copiaSicurezza)); // si rilegge: dev'essere buona
  } catch (e) {
    // una copia vuota (nessun dato attuale) va bene; un errore no
    if (!/nessuna delle cartelle/.test(e.message)) return { ok: false, motivo: `copia di sicurezza non riuscita (${e.message}): non ho toccato nulla.` };
  }
  const rimesse = [];
  for (const c of CARTELLE) {
    const file = contenuto.perCartella[c];
    if (!file) continue;
    try {
      await sostituisciCartella(cartelle[c], file);
      rimesse.push({ cartella: c, file: file.length });
    } catch (e) {
      return { ok: false, copiaSicurezza, rimesse, motivo: `cartella ${c} non rimessa (${e.message}); è rimasta com'era. Le cartelle già rimesse sono quelle del salvataggio; lo stato di prima è in ${copiaSicurezza}.` };
    }
  }
  return { ok: true, copiaSicurezza, rimesse, lasciate: CARTELLE.filter((c) => !contenuto.perCartella[c]), estranei: contenuto.estranei };
}

export { cartelleDi };
