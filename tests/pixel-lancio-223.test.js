import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 223, parte C.3 — la soglia del pulsante del lancio **in pixel veri**, non in righe.
//
// Il test del lotto 221 (`tests/lancio-sintetico-221.test.js`) è un PROXY: il DOM finto non impagina, quindi conta le righe di testo che
// precedono il pulsante e cade oltre 34. Un giorno il pannello potrebbe stare sotto il bordo con poche righe lunghe e quel test
// resterebbe verde per la ragione sbagliata (come la guardia del 151, le descrizioni del 177, i controlli del 188, le Tecniche
// Interiori del 189 e l'annullamento del 207). Questo test apre l'app in un browser vero (Edge o Chrome, senza finestra), a 820 × 1180,
// apre «Lancia!» e misura dove sta il pulsante. Niente dipendenze npm: il browser si pilota col suo protocollo (CDP) sul WebSocket
// che Node ha già.
//
// Se sul PC non c'è un browser il test SALTA, e lo dice nel nome e nell'uscita: «soglia in pixel NON verificata, vale il proxy».
// Un controllo che passa in silenzio senza avere misurato niente è proprio il difetto che questo test deve evitare: per questo
// il salto è visibile (la riga «saltato» di `npm test`), e per chi ha un browser in un posto strano c'è `MUTANT_BROWSER=<percorso>`.
// Più lento di un test puro (qualche secondo), e va nel gruppo dei test che avviano processi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as dormi } from 'node:timers/promises';
import { creaServer } from '../server.mjs';
import { attendiServer } from './attesa-server.js';

const LARGHEZZA = 820, ALTEZZA = 1180;

const CANDIDATI = [
  process.env.MUTANT_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const BROWSER = CANDIDATI.find((p) => existsSync(p)) ?? null;

/** Un client minimo del protocollo di Chrome: un messaggio, una risposta con lo stesso id. */
function cdp(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const attese = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && attese.has(m.id)) { const { ok, no } = attese.get(m.id); attese.delete(m.id); m.error ? no(new Error(m.error.message)) : ok(m.result); } };
  const pronto = new Promise((ok, no) => { ws.onopen = ok; ws.onerror = () => no(new Error('WebSocket del browser non aperto')); });
  const manda = (method, params = {}) => new Promise((ok, no) => { const n = ++id; attese.set(n, { ok, no }); ws.send(JSON.stringify({ id: n, method, params })); });
  /** Esegue codice nella pagina (con await) e torna il valore JSON. */
  const valuta = async (espressione) => {
    const r = await manda('Runtime.evaluate', { expression: `(async () => { ${espressione} })()`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`nella pagina: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  };
  return { pronto, manda, valuta, chiudi: () => ws.close() };
}

test(BROWSER ? 'a 820 × 1180 il pulsante «Lancia» sta DENTRO la finestra: misurato in pixel in un browser vero' : 'SALTATO — nessun browser (Edge/Chrome) trovato: la soglia in pixel del pulsante del lancio NON è verificata, vale il proxy in righe (MUTANT_BROWSER=<percorso> per indicarlo)', { timeout: 120000 }, async (t) => {
  if (!BROWSER) { t.skip('nessun browser trovato'); return; }
  const base = mkdtempSync(join(tmpdir(), 'mutant-pixel-223-'));
  const cartella = join(base, 'personaggi');
  mkdirSync(cartella);
  const esempi = new URL('../esempi/', import.meta.url);
  const anselmo = readdirSync(esempi).find((f) => f.startsWith('Fratello-Anselmo') && f.endsWith('.json'));
  copyFileSync(new URL(anselmo, esempi), join(cartella, anselmo));
  const c = Object.fromEntries(['tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(base, k)]));
  for (const x of Object.values(c)) mkdirSync(x, { recursive: true });
  const srv = creaServer({ cartella, ...c, eMaster: () => false });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const url = `http://127.0.0.1:${srv.address().port}/`;
  const porta = 9300 + Math.floor(Math.random() * 600);
  const profilo = join(base, 'profilo');
  const figlio = spawn(BROWSER, [`--headless=new`, `--remote-debugging-port=${porta}`, `--user-data-dir=${profilo}`, `--window-size=${LARGHEZZA},${ALTEZZA}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore', windowsHide: true });
  let sessione = null;
  try {
    const pagine = await attendiServer(async () => { try { const r = await fetch(`http://127.0.0.1:${porta}/json`); const j = await r.json(); return j.find((x) => x.type === 'page') ?? null; } catch { return null; } },
      { figlio, ms: 30000, cosa: 'il browser' });
    sessione = cdp(pagine.webSocketDebuggerUrl);
    await sessione.pronto;
    await sessione.manda('Emulation.setDeviceMetricsOverride', { width: LARGHEZZA, height: ALTEZZA, deviceScaleFactor: 1, mobile: false });
    await sessione.manda('Page.navigate', { url });
    const attendi = async (cond, cosa) => { for (let i = 0; i < 150; i++) { if (await sessione.valuta(cond)) return; await dormi(100); } throw new Error(`timeout: ${cosa}`); };
    // la lista dei personaggi, poi «Apri» sulla scheda di Anselmo
    await attendi(`return [...document.querySelectorAll('button,a')].some((x) => /^Apri$/.test(x.textContent.trim()))`, 'la lista dei personaggi');
    await sessione.valuta(`[...document.querySelectorAll('button,a')].find((x) => /^Apri$/.test(x.textContent.trim())).click(); return 1`);
    await attendi(`return /\\/p\\/[^/]+/.test(location.hash)`, 'la scheda aperta');
    await sessione.valuta(`location.hash = location.hash.replace(/\\/t\\/.*$/, '') + '/t/poteri'; return 1`);
    await attendi(`return [...document.querySelectorAll('button')].some((x) => /^Lancia!$/.test(x.textContent.trim()))`, 'la tab Poteri con «Lancia!»');
    await sessione.valuta(`[...document.querySelectorAll('button')].find((x) => /^Lancia!$/.test(x.textContent.trim())).click(); return 1`);
    await attendi(`return !!document.querySelector('.lancio-pannello') && [...document.querySelectorAll('.lancio-pannello button')].some((x) => /^Lancia( comunque)? \\(/.test(x.textContent.trim()))`, 'il pannello del lancio col suo pulsante');
    const m = await sessione.valuta(`const p = document.querySelector('.lancio-pannello'); const b = [...p.querySelectorAll('button')].find((x) => /^Lancia( comunque)? \\(/.test(x.textContent.trim())); const r = b.getBoundingClientRect(); const rp = p.getBoundingClientRect(); return { alto: Math.round(r.top), basso: Math.round(r.bottom), pannelloBasso: Math.round(rp.bottom), finestra: innerHeight, larghezza: innerWidth, altezzaPannello: Math.round(rp.height) }`);
    console.log(`# misura vera a ${m.larghezza} × ${m.finestra}: pulsante ${m.alto}–${m.basso} px, pannello alto ${m.altezzaPannello} px (fine a ${m.pannelloBasso})`);
    assert.equal(m.larghezza, LARGHEZZA, 'la finestra emulata è quella chiesta');
    assert.equal(m.finestra, ALTEZZA);
    // la soglia vera: il pulsante entra tutto nella finestra, senza scorrere
    assert.ok(m.basso <= ALTEZZA, `il pulsante del lancio finisce a ${m.basso} px: sotto il bordo di una finestra da ${ALTEZZA}`);
    assert.ok(m.alto > 0, 'e non sopra: è un pulsante visibile');
  } finally {
    try { sessione?.chiudi(); } catch { /* il browser sta già chiudendo */ }
    figlio.kill();
    await new Promise((ok) => srv.close(ok));
    await dormi(300);
    try { rmSync(base, { recursive: true, force: true }); } catch { /* il profilo del browser può restare un attimo bloccato */ }
  }
});
