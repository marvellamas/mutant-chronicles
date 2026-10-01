// Server di Mutant con la cartella dei personaggi (branch tavolo-direttore, pezzo 0a; docs/tavolo-direttore.md).
// Serve l'app come `npx serve .` (Cache-Control: no-cache per js, css, json e html, come serve.json)
// e in più salva e legge i personaggi in personaggi/. Nessuna dipendenza: solo moduli di Node.
//   node server.mjs                 http://localhost:3000, solo da questo computer
//   node server.mjs --rete          anche dagli altri dispositivi della stessa rete (http://<IP>:3000)
//   PORTA=8080 node server.mjs      altra porta (oppure --porta=8080)
//   --cartella=<dir> --tavolo=<dir>  altre cartelle per personaggi e tavolo (prove, più campagne)
// API (JSON):
//   GET /api/ping                      { ok: true, app: 'mutant', cartella: 'personaggi' }: l'app capisce che il server c'è
//   GET /api/personaggi                [{ file, nome, livello, data, mtime, dimensione }] dei file in personaggi/
//   GET /api/personaggi/<file>         il file com'è (testo dell'export, byte per byte)
//   PUT /api/personaggi/<file>         scrive il file (corpo = testo dell'export); risponde { file, mtime }
//   GET /api/tavolo                    selezione del Tavolo del Direttore: { versione, personaggi: [nomi] }
//   PUT /api/tavolo                    la salva in tavolo/sessione.json (fuori da git come personaggi/)
// Nessuna cancellazione dal server: i file vecchi si tolgono a mano dalla cartella.
import { createServer } from 'node:http';
import { readFile, writeFile, readdir, stat, mkdir, rename } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = fileURLToPath(new URL('.', import.meta.url));
const CARTELLA = 'personaggi';
const TAVOLO = 'tavolo';

const TIPI = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.woff2': 'font/woff2', '.woff': 'font/woff',
};
// come serve.json: «**/*.@(js|css|json|html)» → Cache-Control: no-cache (docs/cache.md)
const NO_CACHE = new Set(['.js', '.mjs', '.css', '.json', '.html']);

/** Nome di un file personaggio: lo stesso dell'export, «Nome_livN_AAAA-MM-GG.json» (src/character.js). */
// maiuscole, accenti e apostrofi restano; niente separatori di cartella né caratteri vietati da Windows
export const NOME_FILE = /^(?![.-])[^\\/:*?"<>|\s\u0000-\u001f\u007f]{1,120}_liv\d{1,2}_\d{4}-\d{2}-\d{2}\.json$/u;
const MASSIMO = 10 * 1024 * 1024; // un ritratto grande resta ben sotto

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

async function api(req, res, percorso, cartella, tavolo) {
  if (percorso === '/api/ping') return json(res, 200, { ok: true, app: 'mutant', cartella: CARTELLA });
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
      return { file, nome: m[1], livello: Number(m[2]), data: m[3], mtime: s.mtimeMs, dimensione: s.size };
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
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(testo);
    } catch {
      return json(res, 404, { errore: 'file non trovato' });
    }
  }
  if (req.method === 'PUT') {
    let corpo;
    try { corpo = await leggiCorpo(req); } catch (e) { return json(res, e.codice ?? 400, { errore: e.message }); }
    // si scrive solo un personaggio esportato dall'app (src/character.js → serializza)
    try {
      const o = JSON.parse(corpo.toString('utf8'));
      if (o?.formato !== 'mutant-personaggio') throw new Error('non è un personaggio di Mutant');
    } catch (e) {
      return json(res, 400, { errore: `contenuto non valido: ${e.message}` });
    }
    await mkdir(cartella, { recursive: true });
    // scrittura atomica: un file temporaneo e poi la rinomina, così una lettura non vede mai mezzo file
    const tmp = `${dove}.tmp-${process.pid}`;
    await writeFile(tmp, corpo);
    await rename(tmp, dove);
    const s = await stat(dove);
    return json(res, 200, { file, mtime: s.mtimeMs });
  }
  return json(res, 405, { errore: 'metodo non ammesso' });
}

async function statico(req, res, percorso, radice) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { errore: 'metodo non ammesso' });
  let rel = percorso === '/' ? '/index.html' : percorso;
  // niente uscite dalla cartella del progetto, niente file nascosti né la cartella dei personaggi (passa dall'API)
  const pieno = normalize(join(radice, rel));
  if (!pieno.startsWith(radice) || rel.split('/').some((p) => p.startsWith('.')) || rel.startsWith(`/${CARTELLA}/`) || rel.startsWith(`/${TAVOLO}/`)) {
    res.writeHead(404); return res.end('Non trovato');
  }
  try {
    let s = await stat(pieno);
    let file = pieno;
    if (s.isDirectory()) { file = join(pieno, 'index.html'); s = await stat(file); rel = `${rel.replace(/\/$/, '')}/index.html`; }
    const est = extname(file).toLowerCase();
    const intestazioni = { 'Content-Type': TIPI[est] ?? 'application/octet-stream', 'Content-Length': s.size };
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
export function creaServer({ radice = RADICE, cartella = join(RADICE, CARTELLA), tavolo = join(RADICE, TAVOLO) } = {}) {
  const base = normalize(radice.endsWith(sep) ? radice : radice + sep);
  return createServer(async (req, res) => {
    try {
      const percorso = decodeURI(new URL(req.url, 'http://x').pathname);
      if (percorso.startsWith('/api/')) return await api(req, res, percorso, cartella, tavolo);
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
  const host = process.argv.includes('--rete') ? '0.0.0.0' : '127.0.0.1';
  // --cartella=… e --tavolo=…: altre cartelle (prove, più campagne); di norma quelle del progetto
  const arg = (k) => process.argv.find((x) => x.startsWith(`--${k}=`))?.slice(k.length + 3);
  const cartella = arg('cartella') ? normalize(arg('cartella')) : join(RADICE, CARTELLA);
  const tavolo = arg('tavolo') ? normalize(arg('tavolo')) : join(RADICE, TAVOLO);
  creaServer({ cartella, tavolo }).listen(porta, host, () => {
    console.log(`Mutant con la cartella dei personaggi: http://localhost:${porta}`);
    console.log(host === '0.0.0.0' ? 'Raggiungibile anche dagli altri dispositivi della stessa rete (indirizzo IP di questo computer).' : 'Solo da questo computer (per la rete: node server.mjs --rete).');
    console.log(`Personaggi salvati in ${cartella}`);
  }).on('error', (e) => {
    console.error(e.code === 'EADDRINUSE' ? `La porta ${porta} è già in uso: Mutant è forse già acceso.` : e.message);
    process.exit(1);
  });
}
