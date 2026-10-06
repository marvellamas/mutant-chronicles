// Server di Mutant con la cartella dei personaggi (branch tavolo-direttore, pezzo 0a; docs/tavolo-direttore.md).
// Serve l'app come `npx serve .` (Cache-Control: no-cache per js, css, json e html, come serve.json)
// e in più salva e legge i personaggi in personaggi/. Nessuna dipendenza: solo moduli di Node.
//   node server.mjs                 http://localhost:3000 e, dalla stessa rete Wi-Fi, http://<IP>:3000: ascolta su
//                                    tutte le interfacce e stampa gli indirizzi per i giocatori (src/rete.js)
//   node server.mjs --solo-locale   solo da questo computer (127.0.0.1); --rete resta accettato, non serve più
//   PORTA=8080 node server.mjs      altra porta (oppure --porta=8080)
//   --cartella=<dir> --tavolo=<dir> --scontri=<dir> --nemici=<dir> --veicoli=<dir> --scene=<dir> --mappe=<dir>
//                                    altre cartelle per personaggi, tavolo, scontri, bestiario, veicoli,
//                                    scene e immagini delle mappe (prove, più campagne)
// API (JSON):
//   GET /api/ping                      { ok: true, app: 'mutant', cartella: 'personaggi', versione, avviato, pid }: l'app
//                                      capisce che il server c'è; un nuovo avvio riconosce un Mutant già acceso
//   node server.mjs --sostituisci      se la porta è occupata da un Mutant, lo ferma senza chiedere (avvii senza console)
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
//   Mappa di battaglia (lotto 1 di docs/battlemap/piano.md; limiti in data/mappa.json):
//   GET /api/scene                     scene in scene/: [{ id, nome, revisione, mappa, colonne, righe, token, collegamento, mtime }]
//   GET /api/scene/<id>                la scena completa (src/mappa/scena.js), per il master
//   GET /api/scene/<id>?vista=giocatori  la scena filtrata (src/mappa/vista.js): niente token o template nascosti,
//                                      niente token, muri e terreno sotto la nebbia, solo la copia ridotta
//   PUT /api/scene/<id>                la salva se è valida e se `revisione` è quella del file (altrimenti 409 con
//                                      la scena attuale); le immagini nominate devono essere in mappe/; con
//                                      archiviata: true passa in scene/archivio/ (non si cancella)
//   GET /api/vista-giocatori?firma=…   la vista giocatori della scena in gioco (lotto 4): quella scelta dal master
//                                      o, in automatico, la più recente collegata allo scontro aperto; i token
//                                      visibili con lato, nome, immagine, quota dei PV e turno; { invariata } se la
//                                      firma è quella dell'ultima risposta
//   GET|PUT /api/vista-giocatori/scelta  { scena: id | null } in tavolo/mappa-giocatori.json (null = automatica)
//   GET /api/ritratti/<chiave>         il ritratto del PG (dalla sua scheda), per i token della vista giocatori
//   GET /api/mappe                     immagini in mappe/: [{ file, dimensione, mtime }]
//   GET /api/mappe/<file>              l'immagine (in cache: il nome contiene l'impronta del contenuto)
//   POST /api/mappe?nome=…[&ridotta=1] corpo = JPG, PNG o WEBP: lo salva come <nome>-<impronta>[-ridotta].<est>
//                                      e risponde { file, tipo, larghezza, altezza, dimensione }; ridotta=1
//                                      controlla il lato massimo della copia per i tablet
// Nessuna cancellazione dal server: i file vecchi si tolgono a mano dalla cartella.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { readFile, writeFile, readdir, stat, mkdir, rename, copyFile, unlink, constants } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { chiOccupa, testoDomanda, risposteSi, fermaMutant, sorvegliaFinestra } from './src/porta-occupata.js';
import { indirizziRete, testoAvvio } from './src/rete.js';
import { validaScontro } from './src/scontro.js';
import { validaBozza, STATO_BOZZA_ELIMINATA } from './src/preparazione.js';
import { NOME_FILE, fileProvvisorio, ultimiPerPersonaggio, chiaveDaFile, chiavePersonaggio } from './src/cartella.js';
import { validaRecord, ID_VEICOLO, migraVeicoli, eRiferimento, stessaChiave } from './src/veicoli-registro.js';
import { normalizzaVeicoli } from './src/veicoli.js';
import { caricaDati } from './src/rules.js';
import { validaNemico, formattaErrore } from './src/validate.js';
import { validaScena, riassuntoScena, ID_SCENA, FILE_MAPPA } from './src/mappa/scena.js';
import { vistaGiocatori } from './src/mappa/vista.js';
import { dimensioniImmagine } from './src/mappa/immagine.js';
import { pezziDellaScena } from './src/mappa/partecipanti.js';
import { vistaPlancia } from './src/tavolo.js';

const RADICE = fileURLToPath(new URL('.', import.meta.url));
const CARTELLA = 'personaggi';
const TAVOLO = 'tavolo';
const SCONTRI = 'scontri';
const ID_SCONTRO = /^[a-z0-9-]{1,60}$/;
const NEMICI = 'nemici';
const VEICOLI = 'veicoli';
const SCENE = 'scene';
const MAPPE = 'mappe';
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

async function leggiCorpo(req, massimo = MASSIMO) {
  const parti = [];
  let n = 0;
  for await (const p of req) {
    n += p.length;
    if (n > massimo) throw Object.assign(new Error('file troppo grande'), { codice: 413 });
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

/**
 * Migrazione dei veicoli nel registro (A.91; difetto del collaudo del 05/10/2026: avveniva solo aprendo la tab
 * Veicoli). Per l'ultimo file di ogni PG in personaggi/ (o dei soli `chiavi`): i veicoli ancora locali diventano
 * record di veicoli/ e nel file resta il riferimento (src/veicoli-registro.js → migraVeicoli, la stessa della scheda).
 * Una sola volta per veicolo: un id già nel registro dà solo il riferimento; lo stesso veicolo del gruppo in un altro
 * file resta com'è, con un avviso. Il file del PG si riscrive solo se la sua data non è cambiata dalla lettura: la
 * data è la revisione (X-Mutant-Mtime), quindi una scheda aperta che salva dopo riceve il 409 e rilegge.
 * Un'esecuzione alla volta; i file già esaminati si saltano finché la loro data non cambia.
 */
const migrazioni = { coda: Promise.resolve(), visti: new Map() };
export function migraVeicoliCartella({ cartella, veicoli, radice = RADICE, chiavi = null }) {
  const lavoro = migrazioni.coda.then(() => migraOra({ cartella, veicoli, radice, chiavi }));
  migrazioni.coda = lavoro.catch(() => {});
  return lavoro;
}
async function migraOra({ cartella, veicoli, radice, chiavi }) {
  const esito = { record: [], file: [], avvisi: [] };
  if (!veicoli) return esito;
  const { dati } = await datiDelServer(radice);
  if (!dati?.veicoli) return esito;
  let nomi = [];
  try { nomi = (await readdir(cartella)).filter((f) => NOME_FILE.test(f)); } catch { return esito; }
  const elenco = await Promise.all(nomi.map(async (file) => {
    const m = NOME_FILE.exec(file);
    return { file, nome: m[1], livello: Number(m[2]), data: m[3], mtime: (await stat(join(cartella, file))).mtimeMs };
  }));
  const voluti = chiavi ? new Set(chiavi.map((k) => formaFile(k))) : null;
  for (const [k, r] of ultimiPerPersonaggio(elenco)) {
    if (voluti && !voluti.has(formaFile(k))) continue;
    const dove = join(cartella, r.file);
    if (migrazioni.visti.get(dove) === r.mtime) continue;
    let o;
    try { o = JSON.parse(await readFile(dove, 'utf8')); } catch { migrazioni.visti.set(dove, r.mtime); continue; }
    const locali = Array.isArray(o?.scelte?.veicoli) ? o.scelte.veicoli.filter((v) => v && typeof v === 'object' && !eRiferimento(v)) : [];
    if (o?.formato !== 'mutant-personaggio' || !locali.length) { migrazioni.visti.set(dove, r.mtime); continue; }
    await mkdir(veicoli, { recursive: true });
    const registro = [];
    for (const f of (await readdir(veicoli)).filter((x) => x.endsWith('.json') && ID_VEICOLO.test(x.slice(0, -5)))) {
      try { registro.push(await leggiJson(join(veicoli, f))); } catch { /* rovinato: non conta */ }
    }
    const nome = String(o.scelte.nome ?? '').trim();
    const chi = { pg: typeof o.pg === 'string' ? o.pg : null, chiave: nome ? chiavePersonaggio(nome) : chiaveDaFile(r.file), nome: nome || k };
    const m = migraVeicoli(normalizzaVeicoli(o.scelte.veicoli, dati), chi, registro);
    esito.avvisi.push(...m.avvisi.map((x) => `${r.file}: ${x}`));
    for (const rec of m.nuovi) {
      const dv = join(veicoli, `${rec.id}.json`);
      if (await stat(dv).then(() => true, () => false)) continue; // creato nel frattempo: resta quello
      await scriviJson(dv, { ...rec, revisione: 1, aggiornato: new Date().toISOString() });
      esito.record.push(rec.id);
    }
    const cambiati = m.veicoli.some((v, i) => v !== o.scelte.veicoli[i]) && m.veicoli.some(eRiferimento);
    // la revisione: si riscrive solo se il file è ancora quello letto
    const ora = await stat(dove).then((s) => s.mtimeMs, () => null);
    if (cambiati && ora === r.mtime) {
      const nuovo = { ...o, scelte: { ...o.scelte, veicoli: m.veicoli.map((v) => (eRiferimento(v) ? v : o.scelte.veicoli.find((x) => x?.uid === v.uid) ?? v)) } };
      const tmp = `${dove}.tmp-${process.pid}`;
      await writeFile(tmp, JSON.stringify(nuovo, null, 2));
      await rename(tmp, dove);
      cacheFile.delete(dove);
      esito.file.push(r.file);
    }
    migrazioni.visti.set(dove, await stat(dove).then((s) => s.mtimeMs, () => null));
  }
  return esito;
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
 * Scene della mappa di battaglia (lotto 1 di docs/battlemap/piano.md): un file per scena in scene/, revisione come
 * gli scontri. La vista giocatori la filtra il server (src/mappa/vista.js): ai loro dispositivi non arriva nulla di
 * nascosto. Nessuna autenticazione, come il resto del server: il filtro vale per gli schermi che chiedono la vista
 * giocatori.
 */
async function apiScene(req, res, percorso, scene, mappe, radice, cartelle) {
  if (percorso === '/api/scene' && req.method === 'GET') {
    await mkdir(scene, { recursive: true });
    const lista = [];
    for (const f of (await readdir(scene)).filter((x) => x.endsWith('.json') && ID_SCENA.test(x.slice(0, -5)))) {
      try { lista.push(riassuntoScena(await leggiJson(join(scene, f)), (await stat(join(scene, f))).mtimeMs)); } catch { /* file rovinato: non si elenca */ }
    }
    return json(res, 200, lista.sort((a, b) => b.mtime - a.mtime));
  }
  const m = /^\/api\/scene\/([^/]+)$/.exec(percorso);
  if (!m || !ID_SCENA.test(m[1])) return json(res, 400, { errore: 'id di scena non valido: minuscole, cifre e trattini' });
  const dove = join(scene, `${m[1]}.json`);
  if (req.method === 'GET') {
    let s;
    try { s = await leggiJson(dove); } catch { return json(res, 404, { errore: 'scena non trovata' }); }
    const vista = new URL(req.url, 'http://x').searchParams.get('vista');
    if (vista === 'giocatori') return json(res, 200, vistaGiocatori(s, await contestoScena(s, cartelle)));
    if (vista !== null) return json(res, 400, { errore: 'vista: solo «giocatori»' });
    return json(res, 200, s);
  }
  if (req.method !== 'PUT') return json(res, 405, { errore: 'metodo non ammesso' });
  let s;
  try { s = JSON.parse((await leggiCorpo(req)).toString('utf8')); } catch (e) { return json(res, 400, { errore: `contenuto non valido: ${e.message}` }); }
  const { dati } = await datiDelServer(radice);
  const errore = validaScena(s, dati) ?? (s.id !== m[1] ? 'l’id non corrisponde al file' : null);
  if (errore) return json(res, 400, { errore });
  for (const file of [s.mappa?.file, s.mappa?.ridotta].filter(Boolean)) {
    try { await stat(join(mappe, file)); } catch { return json(res, 400, { errore: `immagine «${file}» non trovata in ${MAPPE}/: caricala prima` }); }
  }
  let attuale = null;
  try { attuale = await leggiJson(dove); } catch { /* nuova */ }
  if ((attuale?.revisione ?? 0) !== s.revisione || (!attuale && s.revisione !== 0)) {
    return json(res, 409, { errore: 'la scena è stata cambiata altrove: ricarica', attuale });
  }
  const nuova = { ...s, revisione: s.revisione + 1, aggiornato: new Date().toISOString() };
  await mkdir(scene, { recursive: true });
  if (nuova.archiviata === true) {
    // «Archivia» (lotto 2): la scena esce dall'elenco ma resta, in scene/archivio/ (non si cancella nulla)
    const archivio = join(scene, 'archivio');
    await mkdir(archivio, { recursive: true });
    if (attuale) await rename(dove, join(archivio, `${m[1]}.json`));
    await scriviJson(join(archivio, `${m[1]}.json`), nuova);
    return json(res, 200, nuova);
  }
  await scriviJson(dove, nuova);
  return json(res, 200, nuova);
}

/**
 * Schede dei PG lette dal server per la vista giocatori (lotto 4): ultimo file di ogni PG in personaggi/, calcolato
 * come nella plancia (src/tavolo.js → vistaPlancia, al Round dello scontro), riletto solo se cambia.
 */
const visteServer = new Map(); // file → { mtime, round, vista }
async function vistePg(chiavi, cartella, dati, round) {
  const viste = new Map();
  if (!chiavi.length) return viste;
  let elenco = [];
  try {
    for (const f of (await readdir(cartella)).filter((x) => x.endsWith('.json'))) elenco.push({ file: f, mtime: (await stat(join(cartella, f))).mtimeMs });
  } catch { return viste; }
  const ultimi = [...ultimiPerPersonaggio(elenco)];
  for (const chiave of chiavi) {
    const voce = ultimi.find(([k]) => stessaChiave(k, chiave))?.[1];
    if (!voce) continue;
    const c = visteServer.get(voce.file);
    if (c && c.mtime === voce.mtime && c.round === round) { viste.set(chiave, c.vista); continue; }
    try {
      const vista = vistaPlancia(await readFile(join(cartella, voce.file), 'utf8'), dati, voce.file, round);
      visteServer.set(voce.file, { mtime: voce.mtime, round, vista });
      viste.set(chiave, vista);
    } catch { /* scheda illeggibile: il token resta con le iniziali */ }
  }
  return viste;
}

const impronta = (t) => createHash('sha1').update(String(t)).digest('hex').slice(0, 12);

/**
 * Contesto della vista giocatori di una scena (lotto 4): scontro aperto o bozza collegati, schede dei PG, registro dei
 * veicoli → pezzi (src/mappa/partecipanti.js), con gli indirizzi delle immagini per i giocatori: i ritratti dei PG
 * da /api/ritratti (non i data URL dentro la risposta), le immagini dei nemici da /api/mappe.
 */
async function contestoScena(scena, { cartella, tavolo, scontri, veicoli, radice }) {
  const { dati } = await datiDelServer(radice);
  const c = scena.collegamento ?? {};
  let scontro = null, bozza = null, alTavolo = [];
  const id = c.scontro ?? c.bozza ?? null;
  if (id && ID_SCONTRO.test(id)) {
    try {
      const x = await leggiJson(join(scontri, `${id}.json`));
      if (c.scontro && x.stato === 'aperto') scontro = x;
      else if (c.bozza && x.stato === 'bozza') bozza = x;
    } catch { /* chiuso o mancante: nessun contesto */ }
  }
  if (bozza && !bozza.pg?.length) { try { alTavolo = selezione(await leggiJson(join(tavolo, 'sessione.json'))).personaggi; } catch { /* nessuno al tavolo */ } }
  const chiavi = scontro ? scontro.partecipanti.filter((p) => p.tipo === 'pg').map((p) => p.chiave) : bozza ? (bozza.pg?.length ? bozza.pg : alTavolo) : [];
  const viste = await vistePg(chiavi, cartella, dati, scontro?.round ?? null);
  const registro = [];
  try {
    for (const f of (await readdir(veicoli)).filter((x) => x.endsWith('.json') && ID_VEICOLO.test(x.slice(0, -5)))) {
      try { registro.push(await leggiJson(join(veicoli, f))); } catch { /* file rovinato */ }
    }
  } catch { /* nessun registro */ }
  const pezzi = pezziDellaScena({ scontro, bozza, alTavolo, viste, veicoli: registro }, dati);
  const immagineDi = (p) => (p.tipo === 'pg' ? (p.ritratto ? `api/ritratti/${encodeURIComponent(p.pg)}?v=${impronta(p.ritratto)}` : null) : p.ritratto);
  return { pezzi, round: scontro?.round ?? null, immagineDi };
}

/** Scena mostrata ai giocatori: quella scelta dal master (tavolo/mappa-giocatori.json) o la più recente dello scontro aperto. */
async function scenaInGioco({ tavolo, scontri, scene }) {
  let scelta = null;
  try { scelta = (await leggiJson(join(tavolo, 'mappa-giocatori.json'))).scena ?? null; } catch { /* automatica */ }
  if (scelta && ID_SCENA.test(scelta)) {
    try { return { scelta, scena: await leggiJson(join(scene, `${scelta}.json`)) }; } catch { return { scelta, scena: null, motivo: 'La scena scelta dal master non c’è più.' }; }
  }
  let aperto = null;
  try {
    for (const f of (await readdir(scontri)).filter((x) => x.endsWith('.json'))) {
      try { const x = await leggiJson(join(scontri, f)); if (x.stato === 'aperto') { aperto = x.id; break; } } catch { /* rovinato */ }
    }
  } catch { /* nessuno scontro */ }
  if (!aperto) return { scelta: null, scena: null, motivo: 'Nessuno scontro aperto e nessuna scena scelta dal master.' };
  let migliore = null;
  try {
    for (const f of (await readdir(scene)).filter((x) => x.endsWith('.json') && ID_SCENA.test(x.slice(0, -5)))) {
      try {
        const x = await leggiJson(join(scene, f));
        if (x.collegamento?.scontro === aperto && (!migliore || String(x.aggiornato ?? '') > String(migliore.aggiornato ?? ''))) migliore = x;
      } catch { /* rovinata */ }
    }
  } catch { /* nessuna scena */ }
  return migliore ? { scelta: null, scena: migliore } : { scelta: null, scena: null, motivo: 'Nessuna scena collegata allo scontro aperto.' };
}

/** Vista giocatori (lotto 4): la scena in gioco, filtrata, e la scelta del master. */
async function apiVistaGiocatori(req, res, percorso, cartelle) {
  const doveScelta = join(cartelle.tavolo, 'mappa-giocatori.json');
  if (percorso === '/api/vista-giocatori/scelta') {
    if (req.method === 'GET') {
      try { return json(res, 200, { scena: (await leggiJson(doveScelta)).scena ?? null }); } catch { return json(res, 200, { scena: null }); }
    }
    if (req.method !== 'PUT') return json(res, 405, { errore: 'metodo non ammesso' });
    let v;
    try { v = JSON.parse((await leggiCorpo(req)).toString('utf8')); } catch (e) { return json(res, 400, { errore: `contenuto non valido: ${e.message}` }); }
    const scena = v?.scena ?? null;
    if (scena !== null && !(typeof scena === 'string' && ID_SCENA.test(scena))) return json(res, 400, { errore: 'scena: id di una scena o null (automatica)' });
    if (scena) { try { await stat(join(cartelle.scene, `${scena}.json`)); } catch { return json(res, 404, { errore: 'scena non trovata' }); } }
    await mkdir(cartelle.tavolo, { recursive: true });
    await scriviJson(doveScelta, { versione: 1, scena });
    return json(res, 200, { scena });
  }
  if (percorso !== '/api/vista-giocatori' || req.method !== 'GET') return json(res, 405, { errore: 'metodo non ammesso' });
  const { scelta, scena, motivo } = await scenaInGioco(cartelle);
  const corpo = { scelta, scena: scena ? vistaGiocatori(scena, await contestoScena(scena, cartelle)) : null, ...(motivo ? { motivo } : {}) };
  const firma = impronta(JSON.stringify(corpo));
  if (new URL(req.url, 'http://x').searchParams.get('firma') === firma) return json(res, 200, { firma, invariata: true });
  return json(res, 200, { firma, ...corpo });
}

/** Ritratto di un PG (data URL della scheda) come immagine, per i token della vista giocatori. */
async function apiRitratto(req, res, percorso, { cartella, radice }) {
  if (req.method !== 'GET') return json(res, 405, { errore: 'metodo non ammesso' });
  const chiave = decodeURIComponent(percorso.slice('/api/ritratti/'.length));
  const { dati } = await datiDelServer(radice);
  const vista = (await vistePg([chiave], cartella, dati, null)).get(chiave);
  const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/.exec(vista?.ritratto ?? '');
  if (!m) return json(res, 404, { errore: 'ritratto non trovato' });
  const corpo = Buffer.from(m[2], 'base64');
  res.writeHead(200, { 'Content-Type': m[1], 'Content-Length': corpo.length, 'Cache-Control': 'public, max-age=86400' });
  return res.end(corpo);
}

/** Nome leggibile per il file di una mappa: minuscole senza accenti, cifre e trattini. */
const nomeMappa = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'mappa';

/**
 * Immagini delle mappe (§4 della specifica): si accettano solo JPG, PNG e WEBP veri (intestazione letta da
 * src/mappa/immagine.js), entro data/mappa.json → immagini.massimo_mb. Il nome contiene l'impronta del contenuto:
 * lo stesso file caricato due volte non si duplica e il browser lo tiene in cache. Non si cancella nulla.
 */
async function apiMappe(req, res, percorso, mappe, radice) {
  if (percorso === '/api/mappe' && req.method === 'GET') {
    await mkdir(mappe, { recursive: true });
    const lista = [];
    for (const file of (await readdir(mappe)).filter((x) => FILE_MAPPA.test(x))) {
      const st = await stat(join(mappe, file));
      lista.push({ file, dimensione: st.size, mtime: st.mtimeMs });
    }
    return json(res, 200, lista.sort((a, b) => b.mtime - a.mtime));
  }
  if (percorso === '/api/mappe' && req.method === 'POST') {
    const { dati } = await datiDelServer(radice);
    const I = dati.mappa.immagini;
    let corpo;
    try { corpo = await leggiCorpo(req, I.massimo_mb * 1024 * 1024); } catch (e) {
      return json(res, e.codice ?? 400, { errore: e.codice === 413 ? `immagine troppo grande: al massimo ${I.massimo_mb} MB` : e.message });
    }
    const d = dimensioniImmagine(new Uint8Array(corpo.buffer, corpo.byteOffset, corpo.length));
    if (!d || !I.tipi[d.tipo]) return json(res, 415, { errore: 'immagine non riconosciuta: solo JPG, PNG o WEBP' });
    const parametri = new URL(req.url, 'http://x').searchParams;
    const ridotta = parametri.get('ridotta') === '1';
    if (ridotta && Math.max(d.larghezza, d.altezza) > I.ridotta.lato_massimo_px) {
      return json(res, 400, { errore: `copia ridotta: lato massimo ${I.ridotta.lato_massimo_px} pixel, questa ne ha ${Math.max(d.larghezza, d.altezza)}` });
    }
    const impronta = createHash('sha256').update(corpo).digest('hex').slice(0, 12);
    const file = `${nomeMappa(parametri.get('nome'))}-${impronta}${ridotta ? '-ridotta' : ''}.${I.tipi[d.tipo].estensione}`;
    await mkdir(mappe, { recursive: true });
    const dove = join(mappe, file);
    try { await stat(dove); } catch {
      const tmp = `${dove}.tmp-${process.pid}`;
      await writeFile(tmp, corpo);
      await rename(tmp, dove);
    }
    return json(res, 200, { file, tipo: d.tipo, larghezza: d.larghezza, altezza: d.altezza, dimensione: corpo.length });
  }
  const m = /^\/api\/mappe\/([^/]+)$/.exec(percorso);
  if (!m || !FILE_MAPPA.test(m[1])) return json(res, 400, { errore: 'nome di immagine non valido' });
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { errore: 'metodo non ammesso' });
  let st;
  try { st = await stat(join(mappe, m[1])); } catch { return json(res, 404, { errore: 'immagine non trovata' }); }
  res.writeHead(200, { 'Content-Type': TIPI[extname(m[1])], 'Content-Length': st.size, 'Cache-Control': 'public, max-age=31536000, immutable' });
  if (req.method === 'HEAD') return res.end();
  return res.end(await readFile(join(mappe, m[1])));
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

async function api(req, res, percorso, cartella, tavolo, scontri, nemici, radice, soloLocale, veicoli, migraIn = null, scene = join(RADICE, SCENE), mappe = join(RADICE, MAPPE)) {
  const cartelle = { cartella, tavolo, scontri, veicoli, scene, radice };
  if (percorso === '/api/scene' || percorso.startsWith('/api/scene/')) return apiScene(req, res, percorso, scene, mappe, radice, cartelle);
  if (percorso === '/api/vista-giocatori' || percorso.startsWith('/api/vista-giocatori/')) return apiVistaGiocatori(req, res, percorso, cartelle);
  if (percorso.startsWith('/api/ritratti/')) return apiRitratto(req, res, percorso, cartelle);
  if (percorso === '/api/mappe' || percorso.startsWith('/api/mappe/')) return apiMappe(req, res, percorso, mappe, radice);
  if (percorso === '/api/veicoli' || percorso.startsWith('/api/veicoli/')) return apiVeicoli(req, res, percorso, veicoli);
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
      let v;
      try { v = selezione(JSON.parse(await readFile(dove, 'utf8'))); } catch { return json(res, 200, { versione: 1, personaggi: [] }); }
      // A.91: i veicoli dei PG al tavolo nel registro, così la plancia li vede senza che nessuno apra la scheda
      if (v.personaggi.length) await migraVeicoliCartella({ cartella, veicoli: migraIn, radice, chiavi: v.personaggi }).catch(() => null);
      return json(res, 200, v);
    }
    if (req.method === 'PUT') {
      let v;
      try { v = selezione(JSON.parse((await leggiCorpo(req)).toString('utf8'))); } catch (e) { return json(res, 400, { errore: e.message }); }
      await mkdir(tavolo, { recursive: true });
      const tmp = `${dove}.tmp-${process.pid}`;
      await writeFile(tmp, `${JSON.stringify(v, null, 2)}\n`);
      await rename(tmp, dove);
      if (v.personaggi.length) await migraVeicoliCartella({ cartella, veicoli: migraIn, radice, chiavi: v.personaggi }).catch(() => null);
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
    // A.91: la scheda che si apre dalla cartella (o la plancia) legge il file già con i riferimenti al registro
    await migraVeicoliCartella({ cartella, veicoli: migraIn, radice, chiavi: [chiaveDaFile(file)] }).catch(() => null);
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

async function statico(req, res, percorso, radice, versioneAvvio = null) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { errore: 'metodo non ammesso' });
  let rel = percorso === '/' ? '/index.html' : percorso;
  // niente uscite dalla cartella del progetto, niente file nascosti né la cartella dei personaggi (passa dall'API)
  const pieno = normalize(join(radice, rel));
  if (!pieno.startsWith(radice) || rel.split('/').some((p) => p.startsWith('.')) || rel.startsWith(`/${CARTELLA}/`) || rel.startsWith(`/${TAVOLO}/`) || rel.startsWith(`/${SCONTRI}/`) || rel.startsWith(`/${NEMICI}/`) || rel.startsWith(`/${VEICOLI}/`) || rel.startsWith(`/${SCENE}/`) || rel.startsWith(`/${MAPPE}/`)) {
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
    // la versione dell'app con cui questo server è stato acceso: se versione.json sul disco è cambiato (aggiornamento
    // senza riavvio), l'app lo vede e chiede di riavviare avvia-server.bat (src/versione.js → serverDaRiavviare)
    if (rel === '/versione.json' && versioneAvvio) intestazioni['X-Mutant-Versione-Server'] = versioneAvvio;
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
export function creaServer({ radice = RADICE, cartella = join(RADICE, CARTELLA), tavolo = join(RADICE, TAVOLO), scontri = join(RADICE, SCONTRI), nemici = join(RADICE, NEMICI), veicoli: veicoliDati = null, scene = join(RADICE, SCENE), mappe = join(RADICE, MAPPE), soloLocale = false } = {}) {
  const veicoli = veicoliDati ?? join(RADICE, VEICOLI);
  // versione dell'app all'accensione (versione.json): il codice del server resta questo finché non lo si riavvia
  let versioneAvvio = null;
  try { versioneAvvio = JSON.parse(readFileSync(join(radice, 'versione.json'), 'utf8')).versione ?? null; } catch { /* senza versione.json: nessun controllo */ }
  // A.91: la migrazione dei veicoli scrive nel registro solo se la sua cartella è indicata o con le cartelle del
  // progetto (un server di prova su un'altra cartella dei PG non tocca veicoli/ del progetto)
  const migraIn = veicoliDati ?? (normalize(cartella) === normalize(join(RADICE, CARTELLA)) ? veicoli : null);
  // all'avvio, i veicoli ancora nei file dei PG passano nel registro (una sola volta per veicolo)
  const migrazione = migraVeicoliCartella({ cartella, veicoli: migraIn, radice }).catch((e) => ({ errore: e.message }));
  const base = normalize(radice.endsWith(sep) ? radice : radice + sep);
  // chi è questo server (per un nuovo avvio che trova la porta occupata, src/porta-occupata.js)
  const identita = { versione: versioneAvvio, avviato: new Date().toISOString(), pid: process.pid };
  const server = createServer(async (req, res) => {
    try {
      const percorso = decodeURI(new URL(req.url, 'http://x').pathname);
      if (percorso === '/api/ping') return json(res, 200, { ok: true, app: 'mutant', cartella: CARTELLA, ...identita });
      if (percorso.startsWith('/api/')) return await api(req, res, percorso, cartella, tavolo, scontri, nemici, base, soloLocale, veicoli, migraIn, scene, mappe);
      return await statico(req, res, percorso, base, versioneAvvio);
    } catch (e) {
      if (!res.headersSent) json(res, 500, { errore: e.message });
      else res.end();
    }
  });
  server.migrazione = migrazione; // per i test e per il messaggio di avvio
  return server;
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
  const scene = arg('scene') ? normalize(arg('scene')) : join(RADICE, SCENE);
  const mappe = arg('mappe') ? normalize(arg('mappe')) : join(RADICE, MAPPE);
  const server = creaServer({ cartella, tavolo, scontri, nemici, veicoli, scene, mappe, soloLocale });
  // si spegne quando si chiude la finestra di avvia-server.bat (o con Ctrl+C), senza restare in ascolto da solo
  const esci = (perche) => {
    console.log(`\nMutant si spegne (${perche}).`);
    server.close();
    process.exit(0);
  };
  for (const segnale of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) process.on(segnale, () => esci(segnale));
  sorvegliaFinestra(esci);
  const avvia = () => server.listen(porta, host, () => {
    console.log(testoAvvio(indirizziRete(networkInterfaces(), porta), porta, { soloLocale }));
    console.log(`Personaggi salvati in ${cartella}`);
    server.migrazione.then((e) => {
      if (e?.record?.length) console.log(`Veicoli spostati nel registro (veicoli/): ${e.record.join(', ')}.`);
      for (const a of e?.avvisi ?? []) console.log(`Attenzione: ${a}`);
    });
  });
  server.on('error', async (e) => {
    if (e.code !== 'EADDRINUSE') { console.error(e.message); process.exit(1); }
    const chi = await chiOccupa(porta);
    if (chi.tipo === 'nessuno') { avvia(); return; } // liberata nel frattempo
    if (chi.tipo !== 'mutant') {
      console.error(`\nLa porta ${porta} è occupata da ${chi.descrizione}.\nMutant non può partire: chiudi quel programma oppure avvia Mutant su un'altra porta (node server.mjs --porta=3001).`);
      process.exit(1);
    }
    // un Mutant già acceso: si chiede (o si ferma senza chiedere con --sostituisci)
    let si = process.argv.includes('--sostituisci');
    if (!si) {
      if (!process.stdin.isTTY) {
        console.error(`\n${testoDomanda(chi).replace(/ \[S\/N\] $/, '')}\nSenza una finestra per rispondere non lo fermo: chiudilo, oppure avvia con --sostituisci.`);
        process.exit(1);
      }
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      si = risposteSi(await rl.question(`\n${testoDomanda(chi)}`));
      rl.close();
    }
    if (!si) { console.log('Va bene: resta acceso quello di prima. Questa finestra si può chiudere.'); process.exit(1); }
    const esito = await fermaMutant(porta, chi);
    if (!esito.fermato) { console.error(`Non sono riuscito a fermarlo: ${esito.motivo}. Riavvia il computer o chiudilo da Gestione attività (node.exe).`); process.exit(1); }
    console.log('Fermato. Riparto…');
    avvia();
  });
  avvia();
}
