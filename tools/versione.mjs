#!/usr/bin/env node
// Versione dell'app e cache-busting dei moduli (docs/cache.md).
//
// La versione è un'impronta del contenuto dei file serviti (index.html senza le parti generate,
// src/**/*.js, css/**/*.css, data/**/*.json, img/immagini.json), con i fine riga normalizzati:
// non serve Git (funziona anche nella copia scaricata come zip) e cambia se Davide modifica a mano
// un file di data/. Lo script scrive:
//   - versione.json: { "versione": "<impronta>", "data": "<quando è cambiata>" }
//   - in index.html, fra i marcatori «versione:inizio» e «versione:fine», il meta con la versione
//     caricata e un importmap che dà a ogni modulo di src/ l'indirizzo con ?v=<impronta>; ?v= anche
//     sui fogli di stile e sul modulo d'ingresso. Così un aggiornamento cambia l'indirizzo di
//     tutti i moduli e il browser non può mescolare file vecchi e nuovi.
// Se l'impronta non cambia non tocca nulla (niente modifiche inutili ai file tracciati).
//
// Uso: node tools/versione.mjs              aggiorna versione.json e index.html
//      node tools/versione.mjs --controlla  esce con 1 se non sono aggiornati (prima di un commit)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = fileURLToPath(new URL('..', import.meta.url));
const INIZIO = '<!-- versione:inizio (generato da tools/versione.mjs: non modificare a mano) -->';
const FINE = '<!-- versione:fine -->';

const lf = (t) => t.replace(/\r\n/g, '\n');

/** File sotto `dir` con l'estensione data, percorsi relativi alla radice con «/», in ordine. */
export function elencaFile(radice, dir, estensione) {
  const out = [];
  const giro = (d) => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) giro(p);
      else if (e.name.endsWith(estensione)) out.push(relative(radice, p).split(sep).join('/'));
    }
  };
  giro(join(radice, dir));
  return out.sort();
}

/** index.html senza le parti generate: blocco fra i marcatori e ?v= su fogli di stile e ingresso. */
export function htmlSenzaVersione(html) {
  // righe intere, dal rientro del marcatore d'inizio al fine riga del marcatore di fine
  const senzaBlocco = lf(html).replace(/^[ \t]*<!-- versione:inizio[\s\S]*?<!-- versione:fine -->\n/m, '');
  return senzaBlocco.replace(/((?:href|src)="[^"?]+\.(?:css|js))\?v=[^"]*"/g, '$1"');
}

/** Impronta del contenuto: 10 cifre esadecimali di sha256 su percorsi e contenuti (fine riga LF). */
export function improntaContenuto(file) {
  const h = createHash('sha256');
  for (const [percorso, testo] of [...file].sort((a, b) => (a[0] < b[0] ? -1 : 1))) h.update(`${percorso}\n${lf(testo)}\n`);
  return h.digest('hex').slice(0, 10);
}

/** index.html con il blocco della versione (meta + importmap) e ?v= su fogli di stile e ingresso. */
export function htmlConVersione(html, versione, moduli) {
  const base = htmlSenzaVersione(html);
  const mappa = Object.fromEntries(moduli.map((m) => [`./${m}`, `./${m}?v=${versione}`]));
  const blocco = [
    `  ${INIZIO}`,
    `  <meta name="mutant-versione" content="${versione}">`,
    '  <script type="importmap">',
    ...JSON.stringify({ imports: mappa }, null, 2).split('\n').map((r) => `  ${r}`),
    '  </script>',
    `  ${FINE}`,
  ].join('\n');
  // il blocco va nella <head> prima di qualunque modulo: subito dopo il meta viewport
  const conBlocco = base.replace(/(<meta name="viewport"[^>]*>\n)/, `$1${blocco}\n`);
  if (conBlocco === base) throw new Error('index.html: manca <meta name="viewport"> dopo cui inserire la versione');
  return conBlocco.replace(/((?:href|src)="[^"?]+\.(?:css|js))"/g, `$1?v=${versione}"`);
}

/** Calcola versione e file da scrivere; nulla su disco. */
export function calcola(radice = RADICE) {
  const leggi = (p) => readFileSync(join(radice, p), 'utf8');
  const html = leggi('index.html');
  const moduli = elencaFile(radice, 'src', '.js');
  const serviti = [...moduli, ...elencaFile(radice, 'css', '.css'), ...elencaFile(radice, 'data', '.json'), 'img/immagini.json']
    .filter((p) => existsSync(join(radice, p)));
  const versione = improntaContenuto([['index.html', htmlSenzaVersione(html)], ...serviti.map((p) => [p, leggi(p)])]);
  return { versione, html, nuovoHtml: htmlConVersione(html, versione, moduli) };
}

function principale() {
  const { versione, html, nuovoHtml } = calcola();
  const pv = join(RADICE, 'versione.json');
  const attuale = existsSync(pv) ? JSON.parse(readFileSync(pv, 'utf8')) : null;
  const aggiornato = attuale?.versione === versione && lf(html) === nuovoHtml;
  if (process.argv.includes('--controlla')) {
    if (aggiornato) { console.log(`versione ${versione}: aggiornata`); return; }
    console.error(`versione.json o index.html non aggiornati (impronta attuale ${versione}): esegui node tools/versione.mjs`);
    process.exit(1);
  }
  if (aggiornato) { console.log(`versione ${versione}: invariata`); return; }
  // fine riga come nel file originale (Windows con autocrlf: CRLF)
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  writeFileSync(join(RADICE, 'index.html'), nuovoHtml.replace(/\n/g, eol));
  const data = attuale?.versione === versione ? attuale.data : new Date().toISOString().slice(0, 16).replace('T', ' ');
  writeFileSync(pv, `${JSON.stringify({ versione, data }, null, 2)}\n`);
  console.log(`versione ${versione} (${data}): scritti versione.json e index.html`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) principale();
