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
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { mkdir, writeFile, rename, rm, copyFile, readFile } from 'node:fs/promises';
import { join, dirname, normalize, sep } from 'node:path';
import { CARTELLE, cartelleDi, raccogli, creaZip, leggiZip, nomeLibero, dimensione } from './salva-sessione.mjs';

const due = (n) => String(n).padStart(2, '0');
/** prima-del-ripristino_AAAA-MM-GG_hhmm.zip */
export const nomeCopiaSicurezza = (d) => `prima-del-ripristino_${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}_${due(d.getHours())}${due(d.getMinutes())}.zip`;

/** «09/10/2026 21:40» */
export const quando = (d) => `${due(d.getDate())}/${due(d.getMonth() + 1)}/${d.getFullYear()} ${due(d.getHours())}:${due(d.getMinutes())}`;

/**
 * I salvataggi da cui si può ripartire, dal più recente: [{ nome, percorso, tipo, etichetta, mtime, dimensione }].
 * tipo: 'sessione' | 'prima-del-ripristino' | 'autosave' | 'autosave-precedente'.
 */
export function elencoSalvataggi({ salvataggi, autosave, massimo = 15 }) {
  const out = [];
  if (existsSync(salvataggi)) {
    for (const n of readdirSync(salvataggi)) {
      if (!/\.zip$/i.test(n)) continue;
      const tipo = n.startsWith('prima-del-ripristino_') ? 'prima-del-ripristino' : n.startsWith('sessione_') ? 'sessione' : null;
      if (!tipo) continue;
      const p = join(salvataggi, n);
      const s = statSync(p);
      out.push({ nome: n, percorso: p, tipo, etichetta: tipo === 'sessione' ? n : `${n} (copia di sicurezza)`, mtime: s.mtime, dimensione: s.size });
    }
  }
  for (const [n, tipo, etichetta] of [['autosave.zip', 'autosave', 'autosave (ultimo automatico)'], ['autosave-precedente.zip', 'autosave-precedente', 'autosave (quello prima)']]) {
    const p = join(autosave, n);
    if (!existsSync(p)) continue;
    const s = statSync(p);
    out.push({ nome: n, percorso: p, tipo, etichetta, mtime: s.mtime, dimensione: s.size });
  }
  return out.sort((a, b) => b.mtime - a.mtime || a.nome.localeCompare(b.nome)).slice(0, massimo);
}

/** Una riga dell'elenco: «09/10/2026 21:40  sessione_2026-10-09_2140.zip  11,6 MB». */
export const rigaSalvataggio = (s) => `${quando(s.mtime)}  ${s.etichetta}  ${dimensione(s.dimensione)}`;

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
  for (const [nome, dati] of Object.entries(voci)) {
    const [cartella, ...resto] = nome.split('/');
    const rel = resto.join('/');
    if (!CARTELLE.includes(cartella) || !rel) { estranei.push(nome); continue; }
    if (resto.some((p) => p === '..' || p === '' || p === '.') || /^[a-z]:/i.test(rel) || rel.includes('\\')) throw new Error(`nome non valido nello zip: ${nome}`);
    (perCartella[cartella] ??= []).push({ rel, dati });
  }
  if (!Object.keys(perCartella).length) throw new Error('lo zip non contiene nessuna delle cartelle di Mutant');
  return { perCartella, estranei };
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
