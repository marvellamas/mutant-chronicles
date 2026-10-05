// Server di Mutant con la cartella dei personaggi (branch tavolo-direttore, pezzo 0a; docs/tavolo-direttore.md).
// Serve l'app come `npx serve .` (Cache-Control: no-cache per js, css, json e html, come serve.json)
// e in più salva e legge i personaggi in personaggi/. Nessuna dipendenza: solo moduli di Node.
//   node server.mjs                 http://localhost:3000 e, dalla stessa rete Wi-Fi, http://<IP>:3000: ascolta su
//                                    tutte le interfacce e stampa gli indirizzi per i giocatori (src/rete.js)
//   node server.mjs --solo-locale   solo da questo computer (127.0.0.1); --rete resta accettato, non serve più
//   PORTA=8080 node server.mjs      altra porta (oppure --porta=8080)
//   --cartella=<dir> --tavolo=<dir> --scontri=<dir> --nemici=<dir>  altre cartelle per personaggi,
//                                    tavolo, scontri e bestiario (prove, più campagne)
// API (JSON):
//   GET /api/ping                      { ok: true, app: 'mutant', cartella: 'personaggi' }: l'app capisce che il server c'è
//   GET /api/rete                      { porta, soloLocale, indirizzi: [{ nome, indirizzo, url }], altri, tuttiPerDubbio }:
//                                      gli indirizzi per i giocatori (riquadro «Collega i giocatori» della plancia)
//   GET /api/personaggi                [{ file, nome, livello, data, mtime, dimensione }] dei file in personaggi/
//   GET /api/personaggi/<file>         il file com'è (testo dell'export, byte per byte)
//   PUT /api/personaggi/<file>         scrive il file (corpo = testo dell'export); risponde { file, mtime }.
//                                      Con l'intestazione X-Mutant-Mtime (la data letta) scrive solo se il file
//                                      non è cambiato nel frattempo, altrimenti 409 con la data attuale (plancia).
//                                      Con X-Mutant-Nuovo: 1 scrive solo se il file non c'è ancora, altrimenti
//                                      409 con { esiste: true } («Aggiungi PG al tavolo»: non sovrascrive mai)
//   GET /api/tavolo                    selezione del Tavolo del Master: { versione, personaggi: [nomi] }
//   PUT /api/tavolo                    la salva in tavolo/sessione.json (fuori da git come personaggi/)
//   GET /api/scontri                   scontri e bozze in scontri/: [{ id, nome, stato, round, revisione, mtime, nemici? }]
//   GET /api/scontri/<id>              lo scontro (src/scontro.js) o la bozza (src/preparazione.js, stato «bozza»)
//   PUT /api/scontri/<id>              lo salva se `revisione` è quella del file (altrimenti 409 con lo
//                                      scontro attuale) e porta la revisione a +1; uno scontro «chiuso» o
//                                      una bozza eliminata passa in scontri/archivio/ (non si cancella)
//   GET /api/veicoli                   registro dei veicoli in veicoli/ (A.91): i record completi, con mtime
//   GET /api/veicoli/<id>              un record (src/veicoli-registro.js)
//   PUT /api/veicoli/<id>              lo salva se `revisione` è quella del file (altrimenti 409 con il record attuale)
//   GET /api/nemici                    bestiario in nemici/: [{ file, mtime, nemico } | { file, mtime, errore }]
//   POST /api/esempi                   copia esempi/ (PG) in personaggi/ ed esempi/nemici/ in nemici/, solo i
//                                      file che lì non ci sono: { copiati: [...], saltati: [...] }
//   PUT /api/nemici/<id>               salva nemici/<id>.json se è valido (data/formato_nemici.json,
//                                      src/validate.js → validaNemico); altrimenti 400 con gli errori
// Nessuna cancellazione dal server: i file vecchi si tolgono a mano dalla cartella.
import { createServer } from 'node:http';
import { readFile, writeFile, readdir, stat, mkdir, rename, copyFile, unlink, constants } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { indirizziRete, testoAvvio } from './src/rete.js';
import { validaScontro } from './src/scontro.js';
import { validaBozza, STATO_BOZZA_ELIMINATA } from './src/preparazione.js';
import { NOME_FILE, fileProvvisorio } from './src/cartella.js';
import { validaRecord, ID_VEICOLO } from './src/veicoli-registro.js';
import { caricaDati } from './src/rules.js';
import { validaNemico, formattaErrore } from './src/validate.js';

const RADICE = fileURLToPath(new URL('.', import.meta.url));
const CARTELLA = 'personaggi';
const TAVOLO = 'tavolo';
const SCONTRI = 'scontri';
const ID_SCONTRO = /^[a-z0-9-]{1,60}$/;
const NEMICI = 'nemici';
const VEICOLI = 'veicoli';
const ID_NEMICO = /^[a-z0-9-]{1,60}$/;

const TIPI = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.woff2': 'font/woff2', '.woff': 'font/woff',
};
// come serve.json: «**/*.@(js|css|json|html)» → Cache-Control: no-cache (docs/cache.md)
const NO_CACHE = new Set(['.js', '.mjs', '.css', '.json', '.html']);

/** Nome di un file personaggio: lo stesso dell'export (src/cartella.js → NOME_FILE, condiviso con la plancia). */
export { NOME_FILE };
const MASSIMO = 10 * 1024 * 1024; // un ritratto grande resta ben sotto

// Identità dei personaggi (bug del 04/10/2026, «Lucas» e «LUCAS»): ogni file porta l'identificativo «pg» del suo
// personaggio (src/character.js → nuovoPg). L'elenco lo riporta, così la scheda riconosce il suo file dal «pg» e non
// dal nome; una scrittura non va mai su un file che contiene un altro personaggio.
const cacheFile = new Map();
/** { pg, nome } del personaggio in un file (letto una volta per data e dimensione del file). */
async function personaggioDelFile(dove, s = null) {
  const st = s ?? await stat(dove);
  const c = cacheFile.get(dove);
  if (c && c.mtime === st.mtimeMs && c.dimensione === st.size) return c.pg;
  let pg = { pg: null, nome: null };
  try {
    const o = JSON.parse(await readFile(dove, 'utf8'));
    pg = { pg: typeof o?.pg === 'string' ? o.pg : null, nome: typeof o?.scelte?.nome === 'string' ? o.scelte.nome.trim() : null };
  } catch { /* file illeggibile: senza identificativo */ }
  cacheFile.set(dove, { mtime: st.mtimeMs, dimensione: st.size, pg });
  return pg;
}
/** Nome di file per il confronto: Windows non distingue le maiuscole; gli accenti confondono chi legge. */
const formaFile = (f) => String(f).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
/**
 * Motivo per non scrivere il personaggio `pg` nel file `file`, o null. Il file (o uno con lo stesso nome a meno
 * di maiuscole e accenti, che su Windows è lo stesso file) contiene un altro personaggio: identificativo diverso,
 * oppure un file di prima senza identificativo con un nome scritto diversamente.
 */
async function altroPersonaggio(cartella, file, pg) {
  let nomi;
  try { nomi = await readdir(cartella); } catch { return null; }
  for (const x of nomi.filter((n) => formaFile(n) === formaFile(file))) {
    const suo = await personaggioDelFile(join(cartella, x));
    const diverso = suo.pg ? suo.pg !== pg : x !== file;
    if (diverso) return `il file ${x} contiene un altro personaggio${suo.nome ? ` (${suo.nome})` : ''}: non sovrascritto. Ricarica la pagina: il personaggio verrà salvato in un file con un altro nome.`;
  }
  return null;
}

const json = (res, codice, corpo) => {
  res.writeHead(codice, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(JSON.stringify(corpo));
};

async function leggiCorpo(req) {
  const parti = [];
  let n = 0;
  for await (const p of req) {
    n += p.length;
    if (n > MASSIMO) throw Object.assign(new Error('file troppo grande'), { codice: 413 });
    parti.push(p);
  }
  return Buffer.concat(parti);
}

/** Selezione «al tavolo» (pezzo 1 della plancia): solo nomi di personaggi, senza doppioni. */
function selezione(v) {
  const lista = Array.isArray(v?.personaggi) ? v.personaggi.filter((x) => typeof x === 'string' && x.length > 0 && x.length <= 120) : null;
  if (!lista) throw new Error('serve { personaggi: [nomi] }');
  return { versione: 1, personaggi: [...new Set(lista)] };
}

const leggiJson = async (p) => JSON.parse(await readFile(p, 'utf8'));
async function scriviJson(dove, v) {
  const tmp = `${dove}.tmp-${process.pid}`;
  await writeFile(tmp, `${JSON.stringify(v, null, 2)}\n`);
  await rename(tmp, dove);
}

/** Scontri (pezzo 2): un file per scontro, revisione per non sovrascrivere le modifiche di un'altra finestra. */
async function apiScontri(req, res, percorso, scontri) {
  if (percorso === '/api/scontri' && req.method === 'GET') {
    await mkdir(scontri, { recursive: true });
    const nomi = (await readdir(scontri)).filter((f) => f.endsWith('.json') && ID_SCONTRO.test(f.slice(0, -5)));
    const lista = [];
    for (const f of nomi) {
      try {
        const s = await leggiJson(join(scontri, f));
        lista.push({ id: s.id, nome: s.nome, stato: s.stato, round: s.round, revisione: s.revisione, mtime: (await stat(join(scontri, f))).mtimeMs, ...(Array.isArray(s.nemici) ? { nemici: s.nemici.reduce((n, v) => n + (v?.quanti ?? 0), 0) } : {}) });
      } catch { /* file rovinato: non si elenca */ }
    }
    return json(res, 200, lista.sort((a, b) => b.mtime - a.mtime));
  }
  const m = /^\/api\/scontri\/([^/]+)$/.exec(percorso);
  if (!m || !ID_SCONTRO.test(m[1])) return json(res, 400, { errore: 'id di scontro non valido' });
  const id = m[1];
  const dove = join(scontri, `${id}.json`);
  if (req.method === 'GET') {
    try { return json(res, 200, await leggiJson(dove)); } catch { return json(res, 404, { errore: 'scontro non trovato' }); }
  }
  if (req.method !== 'PUT') return json(res, 405, { errore: 'metodo non ammesso' });
  let s;
  try { s = JSON.parse((await leggiCorpo(req)).toString('utf8')); } catch (e) { return json(res, 400, { errore: `contenuto non valido: ${e.message}` }); }
  // «Prepara scontro»: le bozze stanno accanto agli scontri, con stato «bozza» (src/preparazione.js)
  const errore = (String(s?.stato ?? '').startsWith('bozza') ? validaBozza(s) : validaScontro(s)) ?? (s.id !== id ? 'l’id non corrisponde al file' : null);
  if (errore) return json(res, 400, { errore });
  let attuale = null;
  try { attuale = await leggiJson(dove); } catch { /* nuovo */ }
  if ((attuale?.revisione ?? 0) !== s.revisione || (!attuale && s.revisione !== 0)) {
    return json(res, 409, { errore: 'lo scontro è stato cambiato altrove: ricarica', attuale });
  }
  const nuovo = { ...s, revisione: s.revisione + 1 };
  await mkdir(scontri, { recursive: true });
  if (nuovo.stato === 'chiuso' || nuovo.stato === STATO_BOZZA_ELIMINATA) {
    // archivio: il file esce dagli scontri aperti ma resta, in scontri/archivio/
    const archivio = join(scontri, 'archivio');
    await mkdir(archivio, { recursive: true });
    // si sposta il file (nessuna cancellazione) e poi lo si aggiorna con lo stato chiuso
    if (attuale) await rename(dove, join(archivio, `${id}.json`));
    await scriviJson(join(archivio, `${id}.json`), nuovo);
    return json(res, 200, nuovo);
  }
  await scriviJson(dove, nuovo);
  return json(res, 200, nuovo);
}

/** Registro dei veicoli (A.91, A.105): un file per veicolo, revisione come gli scontri. */
async function apiVeicoli(req, res, percorso, veicoli) {
  await mkdir(veicoli, { recursive: true });
  if (percorso === '/api/veicoli' && req.method === 'GET') {
    const lista = [];
    for (const f of (await readdir(veicoli)).filter((x) => x.endsWith('.json') && ID_VEICOLO.test(x.slice(0, -5)))) {
      try { lista.push({ ...(await leggiJson(join(veicoli, f))), mtime: (await stat(join(veicoli, f))).mtimeMs }); } catch { /* file rovinato: non si elenca */ }
    }
    return json(res, 200, lista.sort((a, b) => String(a.mezzo?.nome ?? a.id).localeCompare(String(b.mezzo?.nome ?? b.id), 'it')));
  }
  const m = /^\/api\/veicoli\/([^/]+)$/.exec(percorso);
  if (!m || !ID_VEICOLO.test(m[1])) return json(res, 400, { errore: 'id di veicolo non valido' });
  const dove = join(veicoli, `${m[1]}.json`);
  if (req.method === 'GET') {
    try { return json(res, 200, await leggiJson(dove)); } catch { return json(res, 404, { errore: 'veicolo non trovato' }); }
  }
  if (req.method !== 'PUT') return json(res, 405, { errore: 'metodo non ammesso' });
  let v;
  try { v = JSON.parse((await leggiCorpo(req)).toString('utf8')); } catch (e) { return json(res, 400, { errore: `contenuto non valido: ${e.message}` }); }
  const errore = validaRecord(v) ?? (v.id !== m[1] ? 'l’id non corrisponde al file' : null);
  if (errore) return json(res, 400, { errore });
  let attuale = null;
  try { attuale = await leggiJson(dove); } catch { /* nuovo */ }
  if ((attuale?.revisione ?? 0) !== v.revisione || (!attuale && v.revisione !== 0)) {
    return json(res, 409, { errore: 'il veicolo è stato cambiato altrove: ricarica', attuale });
  }
  const nuovo = { ...v, revisione: v.revisione + 1, aggiornato: new Date().toISOString() };
  await scriviJson(dove, nuovo);
  return json(res, 200, nuovo);
}

/** Dati delle regole letti dal disco una volta sola, per validare i nemici come fa l'app. */
const datiPerRadice = new Map();
function datiDelServer(radice) {
  if (!datiPerRadice.has(radice)) datiPerRadice.set(radice, caricaDati((nome) => readFile(join(radice, 'data', `${nome}.json`), 'utf8')));
  return datiPerRadice.get(radice);
}

/** Bestiario (pezzo 3): un file per tipo di nemico, nemici/<id>.json. */
async function apiNemici(req, res, percorso, nemici, radice) {
  if (percorso === '/api/nemici' && req.method === 'GET') {
    await mkdir(nemici, { recursive: true });
    const nomi = (await readdir(nemici)).filter((f) => f.endsWith('.json'));
    const lista = await Promise.all(nomi.map(async (file) => {
      const mtime = (await stat(join(nemici, file))).mtimeMs;
      // un file rovinato si elenca con l'errore: la plancia lo segnala senza fermarsi
      try { return { file, mtime, nemico: await leggiJson(join(nemici, file)) }; } catch (e) { return { file, mtime, errore: `JSON non valido: ${e.message}` }; }
    }));
    return json(res, 200, lista.sort((a, b) => a.file.localeCompare(b.file)));
  }
  const m = /^\/api\/nemici\/([^/]+)$/.exec(percorso);
  if (!m || !ID_NEMICO.test(m[1])) return json(res, 400, { errore: 'id di nemico non valido: minuscole, cifre e trattini' });
  const id = m[1];
  if (req.method !== 'PUT') return json(res, 405, { errore: 'metodo non ammesso' });
  let n;
  try { n = JSON.parse((await leggiCorpo(req)).toString('utf8')); } catch (e) { return json(res, 400, { errore: `contenuto non valido: ${e.message}` }); }
  const { dati } = await datiDelServer(radice);
  const errori = validaNemico(n, dati, `${NEMICI}/${id}.json`);
  if (n?.id !== id) errori.push({ file: `${NEMICI}/${id}.json`, chiave: 'id', problema: 'non corrisponde al nome del file' });
  if (errori.length) return json(res, 400, { errore: errori.map(formattaErrore).join('; '), errori });
  await mkdir(nemici, { recursive: true });
  await scriviJson(join(nemici, `${id}.json`), n);
  return json(res, 200, { file: `${id}.json`, mtime: (await stat(join(nemici, `${id}.json`))).mtimeMs, nemico: n });
}

/**
 * «Carica esempi» (Tavolo del Master): i personaggi d'esempio del repo (esempi/) nella cartella dei
 * personaggi e i nemici d'esempio (esempi/nemici/ ed esempi/nemici/umani/) nel bestiario. Non sovrascrive mai: un file con lo
 * stesso nome già presente si salta e si segnala (COPYFILE_EXCL, anche fra due richieste contemporanee).
 */
async function caricaEsempi(radice, cartella, nemici) {
  const copiati = [];
  const saltati = [];
  const copia = async (da, a, filtro) => {
    let nomi = [];
    try { nomi = (await readdir(da)).filter(filtro); } catch { return; }
    await mkdir(a, { recursive: true });
    for (const f of nomi.sort()) {
      try { await copyFile(join(da, f), join(a, f), constants.COPYFILE_EXCL); copiati.push(f); } catch (e) {
        if (e.code === 'EEXIST') saltati.push(f); else throw e;
      }
    }
  };
  await copia(join(radice, 'esempi'), cartella, (f) => NOME_FILE.test(f));
  await copia(join(radice, 'esempi', NEMICI), nemici, (f) => f.endsWith('.json') && ID_NEMICO.test(f.slice(0, -5)));
  // bestiario umano proposto (tools/genera_nemici_umani.mjs): nella stessa cartella nemici/ del server
  await copia(join(radice, 'esempi', NEMICI, 'umani'), nemici, (f) => f.endsWith('.json') && ID_NEMICO.test(f.slice(0, -5)));
  return { copiati, saltati };
}

async function api(req, res, percorso, cartella, tavolo, scontri, nemici, radice, soloLocale, veicoli) {
  if (percorso === '/api/veicoli' || percorso.startsWith('/api/veicoli/')) return apiVeicoli(req, res, percorso, veicoli);
  if (percorso === '/api/ping') return json(res, 200, { ok: true, app: 'mutant', cartella: CARTELLA });
  if (percorso === '/api/rete') {
    const porta = req.socket.localPort;
    return json(res, 200, { porta, soloLocale, ...(soloLocale ? { indirizzi: [], altri: [], tuttiPerDubbio: false } : indirizziRete(networkInterfaces(), porta)) });
  }
  if (percorso === '/api/esempi') return req.method === 'POST' ? json(res, 200, await caricaEsempi(radice, cartella, nemici)) : json(res, 405, { errore: 'metodo non ammesso' });
  if (percorso === '/api/nemici' || percorso.startsWith('/api/nemici/')) return apiNemici(req, res, percorso, nemici, radice);
  if (percorso === '/api/scontri' || percorso.startsWith('/api/scontri/')) return apiScontri(req, res, percorso, scontri);
  if (percorso === '/api/tavolo') {
    const dove = join(tavolo, 'sessione.json');
    if (req.method === 'GET') {
      try { return json(res, 200, selezione(JSON.parse(await readFile(dove, 'utf8')))); } catch { return json(res, 200, { versione: 1, personaggi: [] }); }
    }
    if (req.method === 'PUT') {
      let v;
      try { v = selezione(JSON.parse((await leggiCorpo(req)).toString('utf8'))); } catch (e) { return json(res, 400, { errore: e.message }); }
      await mkdir(tavolo, { recursive: true });
      const tmp = `${dove}.tmp-${process.pid}`;
      await writeFile(tmp, `${JSON.stringify(v, null, 2)}\n`);
      await rename(tmp, dove);
      return json(res, 200, v);
    }
    return json(res, 405, { errore: 'metodo non ammesso' });
  }
  if (percorso === '/api/personaggi' && req.method === 'GET') {
    await mkdir(cartella, { recursive: true });
    const nomi = (await readdir(cartella)).filter((f) => NOME_FILE.test(f));
    const lista = await Promise.all(nomi.map(async (file) => {
      const s = await stat(join(cartella, file));
      const m = /^(.*)_liv(\d+)_(\d{4}-\d{2}-\d{2})\.json$/.exec(file);
      // `pg`: identificativo del personaggio nel file (null nei file di prima)
      const { pg } = await personaggioDelFile(join(cartella, file), s);
      return { file, nome: m[1], livello: Number(m[2]), data: m[3], mtime: s.mtimeMs, dimensione: s.size, pg };
    }));
    return json(res, 200, lista.sort((a, b) => b.mtime - a.mtime));
  }
  const m = /^\/api\/personaggi\/([^/]+)$/.exec(percorso);
  if (!m) return json(res, 404, { errore: 'API sconosciuta' });
  const file = decodeURIComponent(m[1]);
  if (!NOME_FILE.test(file)) return json(res, 400, { errore: 'nome di file non ammesso: serve «Nome_livN_AAAA-MM-GG.json»' });
  const dove = join(cartella, file);
  if (req.method === 'GET') {
    try {
      const testo = await readFile(dove);
      const s = await stat(dove);
      // la data del file è la revisione per chi riscrive (Tavolo del Master, pezzo 4)
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Mutant-Mtime': String(s.mtimeMs) });
      return res.end(testo);
    } catch {
      return json(res, 404, { errore: 'file non trovato' });
    }
  }
  if (req.method === 'PUT') {
    let corpo;
    try { corpo = await leggiCorpo(req); } catch (e) { return json(res, e.codice ?? 400, { errore: e.message }); }
    // si scrive solo un personaggio esportato dall'app (src/character.js → serializza)
    let o;
    try {
      o = JSON.parse(corpo.toString('utf8'));
      if (o?.formato !== 'mutant-personaggio') throw new Error('non è un personaggio di Mutant');
    } catch (e) {
      return json(res, 400, { errore: `contenuto non valido: ${e.message}` });
    }
    // mai sopra un altro personaggio (bug del 04/10/2026): identificativo diverso, o un file scritto diversamente
    const altro = await altroPersonaggio(cartella, file, typeof o.pg === 'string' ? o.pg : null);
    if (altro) return json(res, 409, { errore: altro, altroPersonaggio: true });
    // revisione (Tavolo del Master, pezzo 4): la plancia scrive solo se il file è quello che ha letto
    // «Aggiungi PG al tavolo»: un file nuovo non sovrascrive mai quello che c'è già
    if (req.headers['x-mutant-nuovo'] === '1' && await stat(dove).then(() => true, () => false)) {
      return json(res, 409, { errore: 'esiste già un file con questo nome: non sovrascritto', esiste: true });
    }
    const attesa = req.headers['x-mutant-mtime'];
    if (attesa !== undefined) {
      const attuale = await stat(dove).then((s) => String(s.mtimeMs), () => null);
      if (attuale !== attesa) return json(res, 409, { errore: 'il personaggio è stato cambiato altrove: rileggi', mtime: attuale });
    }
    await mkdir(cartella, { recursive: true });
    // scrittura atomica: un file temporaneo e poi la rinomina, così una lettura non vede mai mezzo file
    const tmp = `${dove}.tmp-${process.pid}`;
    await writeFile(tmp, corpo);
    await rename(tmp, dove);
    const s = await stat(dove);
    // il PG ha preso il nome: i suoi file provvisori «personaggio_…» (versioni precedenti) diventano questo, non restano accanto
    const rinominati = [];
    if (typeof o.pg === 'string' && !fileProvvisorio(file)) {
      for (const x of (await readdir(cartella)).filter((n) => n !== file && NOME_FILE.test(n) && fileProvvisorio(n))) {
        if ((await personaggioDelFile(join(cartella, x))).pg !== o.pg) continue;
        try { await unlink(join(cartella, x)); cacheFile.delete(join(cartella, x)); rinominati.push(x); } catch { /* resta: niente di grave */ }
      }
    }
    return json(res, 200, { file, mtime: s.mtimeMs, ...(rinominati.length ? { rinominati } : {}) });
  }
  return json(res, 405, { errore: 'metodo non ammesso' });
}

async function statico(req, res, percorso, radice) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { errore: 'metodo non ammesso' });
  let rel = percorso === '/' ? '/index.html' : percorso;
  // niente uscite dalla cartella del progetto, niente file nascosti né la cartella dei personaggi (passa dall'API)
  const pieno = normalize(join(radice, rel));
  if (!pieno.startsWith(radice) || rel.split('/').some((p) => p.startsWith('.')) || rel.startsWith(`/${CARTELLA}/`) || rel.startsWith(`/${TAVOLO}/`) || rel.startsWith(`/${SCONTRI}/`) || rel.startsWith(`/${NEMICI}/`)) {
    res.writeHead(404); return res.end('Non trovato');
  }
  try {
    let s = await stat(pieno);
    let file = pieno;
    if (s.isDirectory()) { file = join(pieno, 'index.html'); s = await stat(file); rel = `${rel.replace(/\/$/, '')}/index.html`; }
    const est = extname(file).toLowerCase();
    // X-Mutant-Server: l'app capisce che c'è questo server con una HEAD su versione.json, che esiste anche con
    // un server statico qualunque: senza server nessuna richiesta fallita e nessun errore in console
    const intestazioni = { 'Content-Type': TIPI[est] ?? 'application/octet-stream', 'Content-Length': s.size, 'X-Mutant-Server': '1' };
    if (NO_CACHE.has(est)) intestazioni['Cache-Control'] = 'no-cache';
    res.writeHead(200, intestazioni);
    if (req.method === 'HEAD') return res.end();
    return res.end(await readFile(file));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Non trovato');
  }
}

/**
 * Crea il server. `radice`: cartella dell'app; `cartella`: dove stanno i personaggi (per i test, una
 * cartella temporanea).
 */
export function creaServer({ radice = RADICE, cartella = join(RADICE, CARTELLA), tavolo = join(RADICE, TAVOLO), scontri = join(RADICE, SCONTRI), nemici = join(RADICE, NEMICI), veicoli = join(RADICE, VEICOLI), soloLocale = false } = {}) {
  const base = normalize(radice.endsWith(sep) ? radice : radice + sep);
  return createServer(async (req, res) => {
    try {
      const percorso = decodeURI(new URL(req.url, 'http://x').pathname);
      if (percorso.startsWith('/api/')) return await api(req, res, percorso, cartella, tavolo, scontri, nemici, base, soloLocale, veicoli);
      return await statico(req, res, percorso, base);
    } catch (e) {
      if (!res.headersSent) json(res, 500, { errore: e.message });
      else res.end();
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const daArg = process.argv.find((x) => x.startsWith('--porta='))?.slice(8);
  const porta = Number(daArg ?? process.env.PORTA ?? 3000);
  // tutte le interfacce, così i telefoni e i PC della stessa rete Wi-Fi lo raggiungono (richiesta del 03/10/2026);
  // --solo-locale per tenerlo chiuso a questo computer
  const soloLocale = process.argv.includes('--solo-locale');
  const host = soloLocale ? '127.0.0.1' : '0.0.0.0';
  // --cartella=… e --tavolo=…: altre cartelle (prove, più campagne); di norma quelle del progetto
  const arg = (k) => process.argv.find((x) => x.startsWith(`--${k}=`))?.slice(k.length + 3);
  const cartella = arg('cartella') ? normalize(arg('cartella')) : join(RADICE, CARTELLA);
  const tavolo = arg('tavolo') ? normalize(arg('tavolo')) : join(RADICE, TAVOLO);
  const scontri = arg('scontri') ? normalize(arg('scontri')) : join(RADICE, SCONTRI);
  const nemici = arg('nemici') ? normalize(arg('nemici')) : join(RADICE, NEMICI);
  const veicoli = arg('veicoli') ? normalize(arg('veicoli')) : join(RADICE, VEICOLI);
  creaServer({ cartella, tavolo, scontri, nemici, veicoli, soloLocale }).listen(porta, host, () => {
    console.log(testoAvvio(indirizziRete(networkInterfaces(), porta), porta, { soloLocale }));
    console.log(`Personaggi salvati in ${cartella}`);
  }).on('error', (e) => {
    console.error(e.code === 'EADDRINUSE' ? `La porta ${porta} è già in uso: Mutant è forse già acceso.` : e.message);
    process.exit(1);
  });
}
