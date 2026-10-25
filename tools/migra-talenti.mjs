// Passaggio dei personaggi ai Talenti v1.0 (lotto 2, 25/10/2026), sul PC del Direttore. Si usa con
// le voci 7 e 8 del menu di Mutant.bat (tools/console.mjs): il primo comando fa solo il rapporto, il secondo
// (dopo che Davide ha scritto SI) fa il passaggio. Niente si tocca senza --applica o --ripristina.
//
//   node tools/migra-talenti.mjs                       rapporto, PG per PG; non tocca niente
//   node tools/migra-talenti.mjs --applica             copia zip di personaggi\, poi il passaggio di ogni PG
//   node tools/migra-talenti.mjs --ripristina [ZIP]    rimette personaggi\ com'era nello zip (l'ultimo, se non si dice)
//   node tools/migra-talenti.mjs --stato               esce con 10 se c'è uno zip del passaggio (per il .bat)
//   opzioni: --cartella DIR (personaggi), --salvataggi DIR (dove va lo zip), --porta N (server, 3000), --su FILE
//
// Ogni scrittura passa dal salvataggio normale del server (PUT /api/personaggi/<file>): versione, storico, «scritto
// dal master». Se il server di Mutant è acceso sul PC lo si usa (i tablet collegati vedono subito la versione
// nuova); se è spento se ne avvia uno solo per il tempo del passaggio, sulla stessa cartella, raggiungibile solo da
// questo PC. Il piano di ogni PG è in src/migrazione-talenti.js; il conto dei posti è quello di postiTalenti.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync, rmSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { creaZip, leggiZip } from './salva-sessione.mjs';
import { elencoDaDisco, perPersonaggio, rigaDi, statoDalServer, esitoControllo } from './stato-personaggi.mjs';

const RADICE = dirname(dirname(fileURLToPath(import.meta.url)));
const PREFISSO = 'prima-dei-talenti-nuovi_';
const due = (n) => String(n).padStart(2, '0');
export const nomeZip = (d) => `${PREFISSO}${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}_${due(d.getHours())}${due(d.getMinutes())}${due(d.getSeconds())}.zip`;
const NOME_FILE = /^[\w.()' -]+\.json$/;

async function dati() {
  const { caricaDati } = await import(pathToFileURL(join(RADICE, 'src', 'rules.js')).href);
  return (await caricaDati((nome) => readFileSync(join(RADICE, 'data', `${nome}.json`), 'utf8'))).dati;
}

/** Tutti i file della cartella, anche nelle sottocartelle (lo storico), con il percorso relativo. */
function tuttiIFile(dir, base = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    return d.isDirectory() ? tuttiIFile(p, base) : [{ nome: relative(base, p).split(sep).join('/'), file: p }];
  });
}

/**
 * I personaggi della cartella: uno per identificativo, con il suo file attuale (src/cartella.js → fileAttuale, la stessa
 * scelta dell'app e del server). Fino al 25/10 si prendeva ogni file per conto suo: con più file datati dello stesso
 * personaggio si passavano anche le copie vecchie, e quale fosse l'attuale lo decideva l'ordine delle scritture.
 * [{ file, o, files }]
 */
function personaggi(cartella) {
  return perPersonaggio(elencoDaDisco(cartella).filter((r) => r.o?.formato === 'mutant-personaggio'))
    .map((g) => ({ file: g.attuale.file, o: g.attuale.o, files: g.files.length }));
}

/** Il rapporto (righe) e i piani, PG per PG. */
export async function rapporto({ cartella, d = null, quando = new Date() }) {
  const D = d ?? await dati();
  const { pianoMigrazione, righeRapporto } = await import(pathToFileURL(join(RADICE, 'src', 'migrazione-talenti.js')).href);
  const piani = personaggi(cartella).map(({ file, o }) => ({ file, ...pianoMigrazione(o, D, { quando }) }));
  const daFare = piani.filter((p) => p.nuovo);
  const righe = [
    `PASSAGGIO AI TALENTI NUOVI (Talenti v1.0 del 7/10/2026) — ${piani.length} personaggi, ${daFare.length} da passare.`,
    'Per ogni personaggio: i Talenti di oggi e la loro categoria nuova, i posti da riempire dopo il passaggio, i casi da guardare.',
    'I Talenti di oggi si tolgono e restano scritti nel registro «Modifiche del master» della scheda; ogni giocatore',
    'li risceglie dalla scheda («Da scegliere»). Finché i posti sono vuoti la scheda ha meno bonus: è normale.',
    '',
  ];
  for (const p of piani) righe.push(...righeRapporto(p), '');
  return { piani, daFare, righe };
}

/** Lo zip di tutta la cartella dei personaggi (storico compreso), riletto per controllo. */
export function copiaZip({ cartella, salvataggi, quando = new Date() }) {
  const voci = tuttiIFile(cartella).map((f) => ({ nome: f.nome, dati: readFileSync(f.file), mtime: statSync(f.file).mtime }));
  mkdirSync(salvataggi, { recursive: true });
  let zip = join(salvataggi, nomeZip(quando));
  for (let k = 2; existsSync(zip); k++) zip = join(salvataggi, nomeZip(quando).replace(/\.zip$/, `_${k}.zip`));
  writeFileSync(zip, creaZip(voci), { flag: 'wx' });
  const letto = leggiZip(readFileSync(zip)); // dev'essere buona, altrimenti lancia e non si fa niente
  if (Object.keys(letto).length !== voci.length) throw new Error('la copia zip non contiene tutti i file');
  return { zip, file: voci.length };
}

/** Gli zip del passaggio, dal più recente. */
export function zipDelPassaggio(salvataggi) {
  if (!existsSync(salvataggi)) return [];
  return readdirSync(salvataggi).filter((n) => n.startsWith(PREFISSO) && n.endsWith('.zip')).sort().reverse().map((n) => join(salvataggi, n));
}

/**
 * Lo zip da cui la voce 8 torna indietro: il più recente in cui almeno un personaggio (il suo file attuale) ha ancora i
 * Talenti di prima. Una voce 7 rifatta su personaggi già passati faceva uno zip dello stato già passato, e il ripristino
 * da quello «non cambiava niente» (25/10, fisso di Marcello). null se non ce n'è.
 */
export function zipDaRipristinare(salvataggi) {
  for (const z of zipDelPassaggio(salvataggi)) {
    let voci;
    try { voci = leggiZip(readFileSync(z)); } catch { continue; }
    const righe = Object.entries(voci).filter(([n]) => !n.includes('/') && NOME_FILE.test(n)).map(([n, b]) => rigaDi(n, b.toString('utf8'), 0));
    if (perPersonaggio(righe).some((g) => g.attuale.o?.formato === 'mutant-personaggio' && g.attuale.o?.scelte?.regimeTalenti !== 2)) return z;
  }
  return null;
}

/**
 * Il controllo finale delle voci 7 e 8 (25/10 sera): come vede ogni personaggio il server, per la stessa strada
 * dell'app. Se Mutant è spento se ne avvia uno solo per il controllo, sulla stessa cartella, raggiungibile solo da
 * questo PC. { ok, totale, nuovi, nonTornano, righe, serverAcceso } — ok: false anche se il server non risponde.
 */
export async function controllaSulServer({ cartella, porta = 3000, attesi }) {
  const s = await serverPerScrivere({ cartella, porta });
  try {
    const stato = await statoDalServer(s.base);
    if (!stato) return { ok: false, totale: 0, nuovi: 0, nonTornano: [], righe: ['Il server di Mutant non risponde: non ho potuto controllare.'], serverAcceso: s.acceso };
    return { ...esitoControllo(stato, attesi), serverAcceso: s.acceso };
  } finally { await s.chiudi(); }
}

/** Data e ora di uno zip del passaggio, dal suo nome (prima-dei-talenti-nuovi_AAAA-MM-GG_hhmmss.zip). */
export function quandoDelloZip(percorso) {
  const m = /(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})(?:_\d+)?\.zip$/.exec(String(percorso));
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
}

/**
 * A che punto è il passaggio (la riga del menu di Mutant.bat): quanti personaggi sono già nei Talenti nuovi, su quanti,
 * e quando è stato fatto (lo zip più recente del passaggio). Un personaggio con più file datati conta una volta.
 * @returns {{ totale, passati, quando: Date | null, copie }}
 */
export function statoPassaggio({ cartella, salvataggi }) {
  // il file attuale di ognuno (prima: «passato» se lo era almeno uno dei suoi file)
  const pg = existsSync(cartella) ? personaggi(cartella) : [];
  const zip = zipDelPassaggio(salvataggi);
  const passati = pg.filter((x) => x.o?.scelte?.regimeTalenti === 2).length;
  return { totale: pg.length, passati, quando: passati && zip.length ? quandoDelloZip(zip[0]) : null, copie: zip.length };
}

/** Il server per scrivere: quello acceso sul PC, se c'è, altrimenti uno avviato qui sulla stessa cartella. */
async function serverPerScrivere({ cartella, porta }) {
  try {
    const r = await fetch(`http://127.0.0.1:${porta}/versione.json`, { signal: AbortSignal.timeout(1500) });
    if (r.headers.get('x-mutant-server')) return { base: `http://127.0.0.1:${porta}`, chiudi: async () => {}, acceso: true };
  } catch { /* spento */ }
  const { creaServer } = await import(pathToFileURL(join(RADICE, 'server.mjs')).href);
  const sopra = dirname(cartella);
  const srv = creaServer({
    radice: RADICE, cartella, tavolo: join(sopra, 'tavolo'), scontri: join(sopra, 'scontri'), nemici: join(sopra, 'nemici'),
    scene: join(sopra, 'scene'), mappe: join(sopra, 'mappe'), musica: join(sopra, 'musica'), galleria: join(sopra, 'galleria'), px: join(sopra, 'px'),
    eMaster: () => true,
  });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  return { base: `http://127.0.0.1:${srv.address().port}`, chiudi: () => new Promise((ok) => srv.close(ok)), acceso: false };
}

/** Il passaggio: prima lo zip, poi ogni PG dal salvataggio normale. */
export async function applica({ cartella, salvataggi, porta = 3000, d = null, quando = new Date() }) {
  const { daFare } = await rapporto({ cartella, d, quando });
  // tutti già passati: nessuno zip nuovo (sarebbe la copia di uno stato già passato, e la voce 8 ci tornerebbe)
  if (!daFare.length) return { copia: null, fatti: [], errori: [], giaFatto: true, controllo: await controllaSulServer({ cartella, porta, attesi: 'nuovi' }) };
  const copia = copiaZip({ cartella, salvataggi, quando });
  const s = await serverPerScrivere({ cartella, porta });
  const fatti = [];
  const errori = [];
  let stato = null;
  try {
    for (const p of daFare) {
      const r = await fetch(`${s.base}/api/personaggi/${encodeURIComponent(p.file)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Mutant-Da': 'master' }, body: `${JSON.stringify(p.nuovo, null, 2)}\n`,
      });
      if (r.ok) fatti.push(p.nome); else errori.push(`${p.nome}: ${(await r.json().catch(() => ({}))).errore ?? r.status}`);
    }
    // il controllo: come li vede adesso il server (lo stesso che ha scritto), per la strada dell'app
    stato = await statoDalServer(s.base);
  } finally { await s.chiudi(); }
  const controllo = stato ? esitoControllo(stato, 'nuovi') : { ok: false, totale: 0, nuovi: 0, nonTornano: [], righe: ['Il server di Mutant non risponde: non ho potuto controllare.'] };
  return { copia, fatti, errori, serverAcceso: s.acceso, controllo };
}

/** Rimette la cartella com'era nello zip: prima una copia di com'è adesso, poi i file dello zip sopra quelli di adesso. */
export function ripristina({ cartella, salvataggi, zip = null, quando = new Date() }) {
  const scelto = zip ?? zipDaRipristinare(salvataggi);
  if (!scelto || !existsSync(scelto)) throw new Error('non trovo una copia di prima del passaggio ai Talenti nuovi');
  const voci = leggiZip(readFileSync(scelto));
  const adesso = tuttiIFile(cartella).map((f) => ({ nome: f.nome, dati: readFileSync(f.file), mtime: statSync(f.file).mtime }));
  mkdirSync(salvataggi, { recursive: true });
  const sicurezza = join(salvataggi, `prima-del-ripristino-talenti_${nomeZip(quando).slice(PREFISSO.length)}`);
  writeFileSync(sicurezza, creaZip(adesso), { flag: 'wx' });
  let rimessi = 0;
  for (const [nome, buf] of Object.entries(voci)) {
    if (nome.split('/').some((x) => x === '..' || x === '') || /^[a-z]:/i.test(nome)) continue;
    const p = join(cartella, ...nome.split('/'));
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, buf);
    rimessi++;
  }
  // Dopo il passaggio il server può aver scritto un PG in un file nuovo (nome con la data del salvataggio): quel file
  // non è nello zip e, lasciato lì, darebbe due file per lo stesso personaggio. Si toglie (è nella copia di sicurezza).
  const idPg = (buf) => { try { const o = JSON.parse(buf.toString('utf8')); return o?.formato === 'mutant-personaggio' ? o.pg ?? null : null; } catch { return null; } };
  const rimessiPg = new Set(Object.entries(voci).filter(([n]) => !n.includes('/')).map(([, b]) => idPg(b)).filter(Boolean));
  const tolti = [];
  for (const f of adesso) {
    if (f.nome.includes('/') || !NOME_FILE.test(f.nome) || Object.hasOwn(voci, f.nome)) continue;
    const id = idPg(f.dati);
    if (id && rimessiPg.has(id)) { rmSync(join(cartella, f.nome)); tolti.push(f.nome); }
  }
  return { zip: scelto, rimessi, sicurezza, tolti };
}

// --- riga di comando -------------------------------------------------------------------------------------------
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const valore = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] && !a[i + 1].startsWith('--') ? a[i + 1] : d; };
  const cartella = valore('--cartella', join(RADICE, 'personaggi'));
  const salvataggi = valore('--salvataggi', join(RADICE, 'salvataggi'));
  const porta = Number(valore('--porta', 3000));
  const su = valore('--su', null);
  const scrivi = (righe) => { const t = righe.join('\n'); console.log(t); if (su) writeFileSync(su, `${t}\n`); };
  try {
    if (a.includes('--stato')) {
      process.exitCode = zipDelPassaggio(salvataggi).length ? 10 : 0;
    } else if (a.includes('--ripristina')) {
      const r = ripristina({ cartella, salvataggi, zip: valore('--ripristina', null) });
      scrivi([`Rimessi ${r.rimessi} file dalla copia ${r.zip}.`, `Com'era prima del ripristino è in ${r.sicurezza}.`]);
    } else if (a.includes('--applica')) {
      const r = await applica({ cartella, salvataggi, porta });
      scrivi([
        `Copia di sicurezza: ${r.copia.zip} (${r.copia.file} file).`,
        r.serverAcceso ? 'Scritto attraverso il server di Mutant acceso: i tablet collegati vedono subito le schede nuove.' : 'Server spento: scritto con il salvataggio normale, avviato solo per il passaggio.',
        `Passati ai Talenti nuovi: ${r.fatti.length ? r.fatti.join(', ') : 'nessuno'}.`,
        ...(r.errori.length ? ['NON passati (restano com\'erano):', ...r.errori.map((e) => `  ${e}`)] : []),
      ]);
      if (r.errori.length) process.exitCode = 2;
    } else {
      scrivi((await rapporto({ cartella })).righe);
    }
  } catch (e) {
    console.error(`Errore: ${e.message}. Non è stato fatto niente dopo questo punto.`);
    process.exitCode = 1;
  }
}
