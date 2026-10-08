// Salvataggi dei dati di gioco del server (richieste di Marcello del 06/10 e dell'08/10/2026).
//
// Due procedure, sulle cartelle del server (personaggi/, veicoli/, scontri/, nemici/, tavolo/, scene/ e mappe/):
//
// 1. Autosave (`autosave`): il server lo chiama ogni N minuti (config-salvataggi.json → autosave_minuti, di norma 5),
//    solo se qualcosa è cambiato dall'ultimo. Scrive autosave/autosave.zip in modo sicuro: prima un file temporaneo,
//    poi il vecchio autosave.zip diventa autosave-precedente.zip e il temporaneo prende il suo posto. Un salvataggio
//    interrotto lascia sempre almeno l'ultimo buono. Resta sul PC: niente rete.
//
// 2. Salvataggio completo (`salvataggioCompleto`): una procedura sola, chiamata da tre punti: «Salva sessione» nel
//    Tavolo del Master (server.mjs → POST /api/salva-sessione), salva-sessione.bat (questo file da riga di comando,
//    con il server acceso o spento) e lo spegnimento (POST /api/spegni, chiusura della finestra del server). Crea
//    salvataggi/sessione_AAAA-MM-GG_hhmm.zip (mai sovrascritto) e lo manda fuori dal PC alle destinazioni di
//    config-salvataggi.json (non tracciato; modello in config-salvataggi.esempio.json):
//      - "cartella_drive": la cartella di Google Drive per desktop sul PC (copia permanente, con le immagini);
//      - ntfy (l'argomento degli avvisi, avvisi/avvisi.json; "ntfy": false per spegnerlo): notifica «Sessione salvata»
//        con allegato lo zip «dati» (senza le immagini delle mappe), se sta nel limite (ntfy_allegato_max_mb);
//      - "github": { "cartella", "ramo"? } facoltativo: un clone di un repository GitHub PRIVATO solo per i salvataggi.
//    Le destinazioni assenti o in errore non bloccano mai: lo zip locale c'è sempre e l'esito dice cosa è andato.
//
// Zip senza dipendenze (zlib di Node): deflate per i file di testo, «stored» per immagini e audio, già compressi.
//   node tools/salva-sessione.mjs [--radice=<cartella dell'app>] [--config=<file>]
import { readFileSync, existsSync, mkdirSync, readdirSync, statSync, constants } from 'node:fs';
import { readFile, writeFile, rename, copyFile, mkdir, unlink } from 'node:fs/promises';
import { join, relative, sep, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hostname } from 'node:os';
import { createHash } from 'node:crypto';
import { deflateRawSync, inflateRawSync, crc32 } from 'node:zlib';
import { execFile } from 'node:child_process';
import { configurazione as confAvvisi, dataOra } from './avvisi.mjs';

export const CARTELLE = ['personaggi', 'veicoli', 'scontri', 'nemici', 'tavolo', 'scene', 'mappe'];
/** Lo zip «dati» per la rete: tutto tranne le immagini delle mappe (pochi KB). */
export const CARTELLE_DATI = CARTELLE.filter((c) => c !== 'mappe');
const RADICE = fileURLToPath(new URL('..', import.meta.url));
/** Valori di partenza della configurazione (config-salvataggi.esempio.json li ripete). */
export const PREDEFINITI = { autosave_minuti: 5, ntfy: true, ntfy_allegato_max_mb: 15 };
const GIA_COMPRESSI = /\.(jpe?g|png|webp|gif|mp3|ogg|m4a|wav|zip)$/i;

/** Le cartelle dei dati di una radice: { personaggi: <percorso>, … }; `altre` sostituisce quelle indicate. */
export const cartelleDi = (radice, altre = {}) => Object.fromEntries(CARTELLE.map((c) => [c, altre[c] ?? join(radice, c)]));

const due = (n) => String(n).padStart(2, '0');
/** sessione_AAAA-MM-GG_hhmm.zip */
export const nomeArchivio = (d) => `sessione_${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}_${due(d.getHours())}${due(d.getMinutes())}.zip`;

/** Un nome libero nella cartella: mai sopra un file che c'è già. */
export function nomeLibero(cartella, nome) {
  if (!existsSync(join(cartella, nome))) return nome;
  const base = nome.replace(/\.zip$/, '');
  for (let k = 2; ; k++) if (!existsSync(join(cartella, `${base}_${k}.zip`))) return `${base}_${k}.zip`;
}

/** File di una cartella dei dati, ricorsivamente: [{ nome nello zip, file, mtime, dimensione }]. Assente: nessuno. */
function fileDi(nome, dove) {
  if (!existsSync(dove)) return [];
  const out = [];
  const giro = (d) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n);
      let s;
      try { s = statSync(p); } catch { continue; } // sparito nel frattempo (scrittura atomica del server)
      if (s.isDirectory()) giro(p);
      else if (s.isFile() && !/\.tmp-\d+(-\d+)?$/.test(n)) out.push({ nome: `${nome}/${relative(dove, p).split(sep).join('/')}`, file: p, mtime: s.mtime, dimensione: s.size });
    }
  };
  giro(dove);
  return out;
}

/** I file delle cartelle `nomi` (di norma tutte), nell'ordine di CARTELLE. */
export const raccogli = (cartelle, nomi = CARTELLE) => nomi.flatMap((c) => fileDi(c, cartelle[c]));

/** Impronta di un elenco di file (nome, dimensione, data): cambia se un file cambia, compare o sparisce. */
export const improntaFile = (lista) => createHash('sha1').update(lista.map((f) => `${f.nome}|${f.dimensione}|${f.mtime.getTime()}`).join('\n')).digest('hex');

/** Le voci da zippare, con il contenuto; un file sparito fra l'elenco e la lettura si salta. */
async function leggiVoci(lista) {
  const voci = [];
  for (const f of lista) {
    try { voci.push({ nome: f.nome, dati: await readFile(f.file), mtime: f.mtime }); } catch { /* sparito */ }
  }
  return voci;
}

// data e ora DOS dei file nello zip
const dataDos = (d) => ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
const oraDos = (d) => (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);

/** Zip di file [{ nome, dati: Buffer, mtime }]: deflate, o «stored» per i formati già compressi. Nomi in UTF-8 (bit 11). */
export function creaZip(voci) {
  const locali = [];
  const centrali = [];
  let posizione = 0;
  for (const v of voci) {
    const nome = Buffer.from(v.nome, 'utf8');
    const metodo = GIA_COMPRESSI.test(v.nome) ? 0 : 8;
    const compressi = metodo ? deflateRawSync(v.dati) : v.dati;
    const crc = crc32(v.dati) >>> 0;
    const testa = Buffer.alloc(30);
    testa.writeUInt32LE(0x04034b50, 0); testa.writeUInt16LE(20, 4); testa.writeUInt16LE(0x0800, 6); testa.writeUInt16LE(metodo, 8);
    testa.writeUInt16LE(oraDos(v.mtime), 10); testa.writeUInt16LE(dataDos(v.mtime), 12); testa.writeUInt32LE(crc, 14);
    testa.writeUInt32LE(compressi.length, 18); testa.writeUInt32LE(v.dati.length, 22); testa.writeUInt16LE(nome.length, 26); testa.writeUInt16LE(0, 28);
    locali.push(testa, nome, compressi);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(metodo, 10);
    c.writeUInt16LE(oraDos(v.mtime), 12); c.writeUInt16LE(dataDos(v.mtime), 14); c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(compressi.length, 20); c.writeUInt32LE(v.dati.length, 24); c.writeUInt16LE(nome.length, 28);
    c.writeUInt32LE(posizione, 42);
    centrali.push(c, nome);
    posizione += testa.length + nome.length + compressi.length;
  }
  const centrale = Buffer.concat(centrali);
  const fine = Buffer.alloc(22);
  fine.writeUInt32LE(0x06054b50, 0); fine.writeUInt16LE(voci.length, 8); fine.writeUInt16LE(voci.length, 10);
  fine.writeUInt32LE(centrale.length, 12); fine.writeUInt32LE(posizione, 16);
  return Buffer.concat([...locali, centrale, fine]);
}

/** Contenuto di uno zip scritto da creaZip: { nome: Buffer }, con il controllo del CRC (errore se non torna). */
export function leggiZip(buf) {
  const fine = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (fine < 0) throw new Error('non è uno zip');
  const n = buf.readUInt16LE(fine + 10);
  let p = buf.readUInt32LE(fine + 16);
  const out = {};
  for (let i = 0; i < n; i++) {
    const metodo = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const comp = buf.readUInt32LE(p + 20);
    const lNome = buf.readUInt16LE(p + 28);
    const nome = buf.toString('utf8', p + 46, p + 46 + lNome);
    const loc = buf.readUInt32LE(p + 42);
    const inizio = loc + 30 + buf.readUInt16LE(loc + 26) + buf.readUInt16LE(loc + 28);
    const grezzi = buf.subarray(inizio, inizio + comp);
    const dati = metodo === 8 ? inflateRawSync(grezzi) : Buffer.from(grezzi);
    if ((crc32(dati) >>> 0) !== crc) throw new Error(`CRC sbagliato per ${nome}`);
    out[nome] = dati;
    p += 46 + lNome + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return out;
}

/** Configurazione: i valori di partenza se il file non c'è; errore leggibile se non è JSON. */
export function leggiConfig(percorso) {
  if (!existsSync(percorso)) return {};
  try { return JSON.parse(readFileSync(percorso, 'utf8')); } catch (e) { throw new Error(`${basename(percorso)} non è un JSON valido (${e.message}): correggilo o cancellalo.`); }
}

/** Minuti fra due autosave: autosave_minuti fra 1 e 120; 0 lo spegne; altrimenti il valore di partenza (5). */
export function minutiAutosave(config) {
  const m = Number(config?.autosave_minuti);
  if (config?.autosave_minuti === 0) return 0;
  return Number.isFinite(m) && m >= 1 && m <= 120 ? m : PREDEFINITI.autosave_minuti;
}

/** La cartella di Google Drive configurata («copia_in» è il nome di prima, 06/10), o null. */
export const cartellaDrive = (config) => (String(config?.cartella_drive ?? config?.copia_in ?? '').trim() || null);

/**
 * L'argomento ntfy dei salvataggi: "ntfy": false lo spegne; "ntfy_argomento" nel file dei salvataggi lo sceglie (prove);
 * altrimenti quello degli avvisi a Marcello (avvisi/avvisi.json, se attivo). null: nessuna notifica.
 */
export function confNtfy(config, avvisiGrezzi) {
  if (config?.ntfy === false) return null;
  if (config?.ntfy_argomento) {
    const c = confAvvisi({ attivo: true, ntfy_argomento: config.ntfy_argomento, server: config.ntfy_server });
    // un server ntfy su questo PC (prove e test): http ammesso solo per 127.0.0.1
    return c && /^http:\/\/127\.0\.0\.1:\d+$/.test(config.ntfy_server ?? '') ? { ...c, server: config.ntfy_server } : c;
  }
  return confAvvisi(avvisiGrezzi);
}

const errori = new Set(['EPERM', 'EACCES', 'EBUSY']);
/** rename con qualche nuovo tentativo (su Windows un antivirus o l'indicizzatore tengono aperto il file per un attimo). */
async function rinomina(da, a, fs) {
  for (let i = 0, attesa = 15; ; i++, attesa *= 2) {
    try { return await fs.rename(da, a); } catch (e) {
      if (i >= 5 || !errori.has(e.code)) throw e;
      await new Promise((ok) => setTimeout(ok, attesa));
    }
  }
}

const leggiJsonSicuro = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };

/**
 * Autosave nella cartella `dove`: autosave.zip e autosave-precedente.zip, autosave.json con impronta e ora.
 * Solo se l'impronta dei file è cambiata (o con `forza`). Restituisce { scritto, motivo?, dimensione?, file? };
 * un errore di scrittura lascia intatti gli zip di prima e si propaga (il server lo scrive nella finestra).
 * @param fs operazioni sui file (writeFile, rename), sostituibili nei test
 */
export async function autosave({ cartelle, dove, forza = false, adesso = new Date(), fs = { writeFile, rename } }) {
  const lista = raccogli(cartelle);
  if (!lista.length) return { scritto: false, motivo: 'vuoto' };
  const impronta = improntaFile(lista);
  const zip = join(dove, 'autosave.zip');
  const statoFile = join(dove, 'autosave.json');
  if (!forza && leggiJsonSicuro(statoFile)?.impronta === impronta && existsSync(zip)) return { scritto: false, motivo: 'invariato' };
  const contenuto = creaZip(await leggiVoci(lista));
  await mkdir(dove, { recursive: true });
  const tmp = `${zip}.tmp-${process.pid}`;
  try {
    await fs.writeFile(tmp, contenuto);
    if (existsSync(zip)) await rinomina(zip, join(dove, 'autosave-precedente.zip'), fs);
    await rinomina(tmp, zip, fs);
  } catch (e) {
    await unlink(tmp).catch(() => {});
    throw e;
  }
  const stato = { impronta, quando: adesso.toISOString(), file: lista.length, dimensione: contenuto.length };
  await writeFile(`${statoFile}.tmp-${process.pid}`, `${JSON.stringify(stato, null, 2)}\n`);
  await rinomina(`${statoFile}.tmp-${process.pid}`, statoFile, { rename });
  return { scritto: true, ...stato };
}

/** Ultimo autosave (autosave.json) o null. */
export const statoAutosave = (dove) => leggiJsonSicuro(join(dove, 'autosave.json'));

/** «812 KB», «4,2 MB». */
export function dimensione(byte) {
  if (byte >= 1024 * 1024) return `${(byte / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(byte / 1024))} KB`;
}

const git = (cartella, args) => new Promise((ok) => {
  execFile('git', args, { cwd: cartella, encoding: 'utf8', windowsHide: true, timeout: 120000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } },
    (err, stdout, stderr) => ok({ status: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout, stderr, error: err }));
});

/** Copia nel clone del repository privato, commit e push. { fatto, messaggio }: mai un'eccezione. */
export async function pushGithub(archivio, G) {
  if (!G?.cartella) return { fatto: false, messaggio: 'Copia su GitHub non configurata: saltata.' };
  if (!existsSync(join(G.cartella, '.git'))) return { fatto: false, messaggio: `GitHub: ${G.cartella} non è un clone git del repository dei salvataggi: saltata.` };
  if ((await git(G.cartella, ['--version'])).status !== 0) return { fatto: false, messaggio: 'GitHub: git non è installato su questo PC: saltata.' };
  // mai il repository dell'app: il clone deve avere un remoto diverso da quello di Mutant
  const remotoApp = (await git(RADICE, ['remote', 'get-url', 'origin'])).stdout?.trim();
  const remoto = (await git(G.cartella, ['remote', 'get-url', 'origin'])).stdout?.trim();
  if (remotoApp && remoto === remotoApp) return { fatto: false, messaggio: 'GitHub: la cartella configurata è un clone dell’app, non del repository dei salvataggi: saltata.' };
  const nome = nomeLibero(G.cartella, basename(archivio));
  await copyFile(archivio, join(G.cartella, nome), constants.COPYFILE_EXCL);
  const passi = [['add', '--', nome], ['commit', '-m', `Salvataggio ${nome}`], ['push', ...(G.ramo ? ['origin', `HEAD:${G.ramo}`] : [])]];
  for (const p of passi) {
    const r = await git(G.cartella, p);
    if (r.status !== 0) {
      const motivo = (r.stderr || r.stdout || r.error?.message || '').trim().split('\n').slice(-2).join(' ');
      return { fatto: false, messaggio: `GitHub: «git ${p[0]}» non riuscito (${motivo || 'senza messaggio'}). L'archivio resta nella cartella dei salvataggi e nel clone; si riprova alla prossima copia con un push a mano.` };
    }
  }
  return { fatto: true, messaggio: `GitHub: archivio ${nome} inviato al repository dei salvataggi.` };
}

/**
 * Notifica ntfy, con un allegato se c'è (PUT del file; titolo, testo e nome del file come parametri dell'indirizzo,
 * così le lettere accentate passano). { ok, codice?, errore? }: mai un'eccezione.
 */
export async function inviaNtfy({ argomento, server = 'https://ntfy.sh' }, { titolo, testo, allegato = null, nomeFile = null, tags = 'floppy_disk' }, { timeoutMs = 20000, fetchFn = fetch } = {}) {
  const q = new URLSearchParams({ title: titolo, message: testo, tags });
  if (allegato) q.set('filename', nomeFile);
  try {
    const r = await fetchFn(`${server}/${argomento}?${q}`, { method: allegato ? 'PUT' : 'POST', body: allegato ?? '', signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) return { ok: false, codice: r.status, errore: `il servizio ha risposto ${r.status}` };
    return { ok: true, codice: r.status };
  } catch (e) {
    return { ok: false, errore: e?.name === 'TimeoutError' ? `nessuna risposta in ${Math.round(timeoutMs / 1000)} s` : 'rete non raggiungibile' };
  }
}

const SEGNO = { ok: '✓', errore: '✗', spento: '–' };
/** «Sessione salvata: zip 812 KB · Drive ✓ · ntfy ✓» (o la riga dell'errore, se lo zip non c'è). */
export function rigaEsito(e) {
  if (!e.ok) return `Sessione NON salvata: ${e.errore}`;
  const parti = [`Sessione salvata: zip ${dimensione(e.dimensione)}${e.dimensioneDati !== e.dimensione ? ` (dati ${dimensione(e.dimensioneDati)})` : ''}`];
  parti.push(e.drive.stato === 'spento' ? 'Drive non impostato' : `Drive ${SEGNO[e.drive.stato]}`);
  parti.push(e.ntfy.stato === 'spento' ? 'ntfy spento' : `ntfy ${SEGNO[e.ntfy.stato]}`);
  if (e.github.stato !== 'spento') parti.push(`GitHub ${SEGNO[e.github.stato]}`);
  return parti.join(' · ');
}

/**
 * Il salvataggio completo: zip in `salvataggi` (mai sovrascritto), copia su Drive, notifica ntfy con lo zip «dati»,
 * GitHub se configurato. Non lancia mai: { ok, archivio, nome, dimensione, dimensioneDati, file, drive, ntfy,
 * github, messaggi, riga } con drive/ntfy/github = { stato: 'ok' | 'errore' | 'spento', messaggio }.
 * @param veloce chiusura della finestra (Windows concede pochi secondi): ntfy con un tempo breve, GitHub saltato
 */
export async function salvataggioCompleto({ cartelle, salvataggi, config = {}, avvisi = null, origine = 'a mano', adesso = new Date(), pc = hostname(), veloce = false, fetchFn = fetch, improntaPrecedente = null } = {}) {
  const messaggi = [];
  let lista, archivio, nome, pieno, dati, impronta;
  try {
    lista = raccogli(cartelle);
    impronta = improntaFile(lista);
    // allo spegnimento: niente di nuovo dall'ultimo salvataggio completo, niente zip in più
    if (improntaPrecedente && improntaPrecedente === impronta) return { ok: true, saltato: true, impronta, messaggi, riga: 'Niente di nuovo dall’ultimo salvataggio della sessione: nessuno zip in più.' };
    const voci = await leggiVoci(lista);
    pieno = creaZip(voci);
    dati = creaZip(voci.filter((v) => CARTELLE_DATI.some((c) => v.nome.startsWith(`${c}/`))));
    await mkdir(salvataggi, { recursive: true });
    nome = nomeLibero(salvataggi, nomeArchivio(adesso));
    archivio = join(salvataggi, nome);
    await writeFile(archivio, pieno, { flag: 'wx' }); // «wx»: mai sopra un file esistente
  } catch (e) {
    const esito = { ok: false, errore: `lo zip in ${salvataggi} non si è potuto scrivere (${e.message})`, messaggi };
    return { ...esito, riga: rigaEsito(esito) };
  }
  const perCartella = CARTELLE.map((c) => `${c} ${lista.filter((v) => v.nome.startsWith(`${c}/`)).length}`).join(', ');
  messaggi.push(`Archivio creato: ${archivio} (${lista.length} file: ${perCartella}).`);

  // Drive: la copia permanente, con le immagini delle mappe
  let drive;
  const cDrive = cartellaDrive(config);
  if (!cDrive) drive = { stato: 'spento', messaggio: 'Cartella di Google Drive non impostata (config-salvataggi.json → cartella_drive): copia saltata.' };
  else {
    try {
      if (!existsSync(cDrive)) throw new Error(`la cartella ${cDrive} non esiste (Google Drive per desktop è acceso? il percorso è giusto?)`);
      const n = nomeLibero(cDrive, nome);
      await copyFile(archivio, join(cDrive, n), constants.COPYFILE_EXCL);
      drive = { stato: 'ok', messaggio: `Copia su Google Drive: ${join(cDrive, n)}.`, percorso: join(cDrive, n) };
    } catch (e) {
      drive = { stato: 'errore', messaggio: `Copia su Google Drive non riuscita: ${e.message}. Lo zip è comunque in ${salvataggi}.` };
    }
  }
  messaggi.push(drive.messaggio);

  // ntfy: notifica a Marcello con lo zip «dati» (senza immagini), se sta nel limite del servizio
  let ntfy;
  const cNtfy = confNtfy(config, avvisi);
  if (!cNtfy) ntfy = { stato: 'spento', messaggio: 'Notifica ntfy spenta (argomento degli avvisi assente o "ntfy": false).' };
  else {
    const massimo = (Number(config.ntfy_allegato_max_mb) > 0 ? Number(config.ntfy_allegato_max_mb) : PREDEFINITI.ntfy_allegato_max_mb) * 1024 * 1024;
    const conAllegato = dati.length <= massimo;
    const nomeDati = nome.replace(/\.zip$/, '_dati.zip');
    const testo = `${pc}, ${dataOra(adesso)} (${origine}): zip ${dimensione(pieno.length)}, dati ${dimensione(dati.length)}; Drive ${drive.stato === 'ok' ? '✓' : drive.stato === 'errore' ? '✗ (errore)' : 'non impostato'}.${conAllegato ? ' In allegato i dati (senza le immagini delle mappe).' : ' Dati troppo grandi per l’allegato.'}`;
    const opz = { timeoutMs: veloce ? 3000 : 20000, fetchFn };
    let r = await inviaNtfy(cNtfy, { titolo: 'Mutant: sessione salvata', testo, allegato: conAllegato ? dati : null, nomeFile: nomeDati }, opz);
    // allegato rifiutato (limite o quota del servizio, risposte 4xx): almeno la notifica, senza allegato
    if (!r.ok && conAllegato && r.codice >= 400 && r.codice < 500) {
      const senza = await inviaNtfy(cNtfy, { titolo: 'Mutant: sessione salvata', testo: `${testo.replace(/ In allegato.*$/, '')} Allegato non accettato (${r.codice}).` }, opz);
      if (senza.ok) r = { ok: true, senzaAllegato: true };
    }
    ntfy = r.ok
      ? { stato: 'ok', messaggio: r.senzaAllegato ? 'Notifica ntfy inviata, ma senza allegato (rifiutato dal servizio).' : `Notifica ntfy inviata${conAllegato ? ` con ${nomeDati} (${dimensione(dati.length)})` : ' senza allegato (dati oltre il limite)'}.` }
      : { stato: 'errore', messaggio: `Notifica ntfy non inviata: ${r.errore}. Lo zip è comunque in ${salvataggi}.` };
  }
  messaggi.push(ntfy.messaggio);

  // GitHub (facoltativo, 06/10): non alla chiusura della finestra, che non dà il tempo
  let github;
  if (!config.github?.cartella) github = { stato: 'spento', messaggio: 'Copia su GitHub non configurata: saltata.' };
  else if (veloce) github = { stato: 'errore', messaggio: 'GitHub: saltato alla chiusura della finestra (non c’è il tempo); si fa con salva-sessione.bat.' };
  else {
    let g;
    try { g = await pushGithub(archivio, config.github); } catch (e) { g = { fatto: false, messaggio: `GitHub: ${e.message}. Saltata.` }; }
    github = { stato: g.fatto ? 'ok' : 'errore', messaggio: g.messaggio };
  }
  if (github.stato !== 'spento') messaggi.push(github.messaggio);

  const esito = { ok: true, archivio, nome, dimensione: pieno.length, dimensioneDati: dati.length, file: lista.length, drive, ntfy, github, messaggi, origine, impronta };
  return { ...esito, riga: rigaEsito(esito) };
}

/**
 * Il gestore dei salvataggi del server (server.mjs): una coda (un salvataggio alla volta), l'ultimo salvataggio
 * completo di questa accensione e l'autosave che non si sovrappone a se stesso. Lo usano «Salva sessione», «Spegni
 * Mutant» e la chiusura della finestra: la stessa procedura di salva-sessione.bat (salvataggioCompleto).
 * @param config, avvisi funzioni che rileggono la configurazione a ogni salvataggio (si cambia senza riavviare)
 */
export function creaGestore({ cartelle, salvataggi, autosave: dirAutosave, config = () => ({}), avvisi = () => null, log = console.log, fetchFn = fetch }) {
  const ora = () => new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  let coda = Promise.resolve();
  let ultimo = null; // { quando, riga, impronta }
  let inAutosave = false;
  const salva = (origine, { seCambiato = false, veloce = false } = {}) => (coda = coda.then(async () => {
    const e = await salvataggioCompleto({ cartelle, salvataggi, config: config(), avvisi: avvisi(), origine, veloce, fetchFn, improntaPrecedente: seCambiato ? ultimo?.impronta : null });
    log(perConsole(`[${ora()}] ${e.riga}`));
    for (const m of [e.drive, e.ntfy, e.github]) if (m?.stato === 'errore') log(`  ${m.messaggio}`);
    if (e.ok && !e.saltato) ultimo = { quando: new Date().toISOString(), riga: e.riga, impronta: e.impronta };
    return e;
  }));
  return {
    salva,
    minuti: () => minutiAutosave(config()),
    async faiAutosave() {
      if (inAutosave) return { scritto: false, motivo: 'in corso' };
      inAutosave = true;
      try {
        const r = await autosave({ cartelle, dove: dirAutosave });
        if (r.scritto) log(`[${ora()}] Salvataggio automatico: ${r.file} file, ${dimensione(r.dimensione)}.`);
        return r;
      } catch (e) {
        log(`[${ora()}] Salvataggio automatico non riuscito (${e.message}): resta quello di prima in ${dirAutosave}.`);
        return { scritto: false, motivo: 'errore', errore: e.message };
      } finally { inAutosave = false; }
    },
    autosave: () => statoAutosave(dirAutosave),
    ultimo: () => (ultimo ? { quando: ultimo.quando, riga: ultimo.riga } : null),
  };
}

/** La riga per la finestra nera di Windows: ✓ e ✗ non sempre ci sono nel suo carattere. */
export const perConsole = (t) => String(t).replace(/✓/g, 'OK').replace(/✗/g, 'ERRORE');

/** Le cartelle e i file dei salvataggi di un'installazione (radice dell'app): cartelle, salvataggi, autosave, config, avvisi. */
export function impostazioniDi(radice, { config: fileConfig = join(radice, 'config-salvataggi.json') } = {}) {
  return {
    cartelle: cartelleDi(radice),
    salvataggi: join(radice, 'salvataggi'),
    autosave: join(radice, 'autosave'),
    config: leggiConfig(fileConfig),
    avvisi: leggiJsonSicuro(join(radice, 'avvisi', 'avvisi.json')),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (k) => process.argv.find((x) => x.startsWith(`--${k}=`))?.slice(k.length + 3);
  const radice = arg('radice') ?? RADICE;
  try {
    const imp = impostazioniDi(radice, arg('config') ? { config: arg('config') } : {});
    const r = await salvataggioCompleto({ ...imp, origine: 'salva-sessione.bat' });
    console.log(` ${perConsole(r.riga)}`);
    console.log('');
    for (const m of r.messaggi) console.log(` ${m}`);
    if (!r.ok) process.exitCode = 1;
  } catch (e) {
    console.error(` Salvataggio non riuscito: ${e.message}`);
    process.exitCode = 1;
  }
}
