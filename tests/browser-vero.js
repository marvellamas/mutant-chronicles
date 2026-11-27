// Lotto 250 — l'app in un BROWSER VERO, per i test e per gli strumenti di ripasso.
//
// **Perché esiste.** La guardia del 247 («un pulsante liberato fa qualcosa, o lo dice») prova il **motore**: le
// funzioni pure e il server. Nel 249 «Sposta i punti» del giocatore era verde lì e nella pagina lanciava
// `ReferenceError: ridisegna is not defined`, che la pagina si mangiava — il file si salvava, il pannello restava
// aperto e l'avviso al Direttore non partiva. Un errore così **non si può vedere dal motore**: serve la pagina.
//
// L'impianto è quello che il lotto 223 ha costruito per la misura in pixel: Edge o Chrome senza finestra, pilotato
// col suo protocollo (CDP) sul WebSocket che Node ha già. **Nessuna dipendenza npm.**
//
// Le tre cose che qui si possono controllare e nel motore no:
//   1. **nessun errore inghiottito**: `errori()` torna tutto quello che la pagina ha scritto in console come errore
//      e ogni eccezione non gestita;
//   2. **qualcosa è cambiato davvero, su disco**: il test rilegge il file dalla cartella, non dalla memoria della
//      pagina (lezione del 207, dove l'annullamento confrontava la memoria);
//   3. **l'avviso è arrivato al Direttore**: si legge `/api/avvisi`, il diario del 249.
//
// Senza un browser sul PC non si finge: chi usa questo modulo salta il test e **lo dichiara nel nome**, come il 223.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as dormi } from 'node:timers/promises';
import { creaServer } from '../server.mjs';
import { attendiServer } from './attesa-server.js';

const CANDIDATI = [
  process.env.MUTANT_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

/** Il browser trovato sul PC, o null. Chi lo usa salta il test dichiarandolo nel nome (lotto 223). */
export const BROWSER = CANDIDATI.find((p) => existsSync(p)) ?? null;
export const SENZA_BROWSER = 'SALTATO — nessun browser (Edge/Chrome) trovato: i clic nella pagina vera NON sono verificati (MUTANT_BROWSER=<percorso> per indicarlo)';

/** Un client minimo del protocollo di Chrome, con la raccolta degli errori della pagina. */
function cdp(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const attese = new Map();
  const errori = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && attese.has(m.id)) {
      const { ok, no } = attese.get(m.id);
      attese.delete(m.id);
      return m.error ? no(new Error(m.error.message)) : ok(m.result);
    }
    // 1. un'eccezione che nessuno ha gestito nella pagina
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params?.exceptionDetails;
      const frame = (d?.stackTrace?.callFrames ?? []).map((f) => f.url).filter(Boolean);
      errori.push({ tipo: 'eccezione', testo: d?.exception?.description ?? d?.text ?? 'eccezione senza testo', da: frame[0] ?? d?.url ?? '' });
    }
    // 2. console.error (e console.assert): la pagina che si lamenta
    if (m.method === 'Runtime.consoleAPICalled' && (m.params?.type === 'error' || m.params?.type === 'assert')) {
      const fc = (m.params?.stackTrace?.callFrames ?? []).map((f) => f.url).filter(Boolean);
      errori.push({ tipo: 'console', testo: (m.params.args ?? []).map((a) => a.description ?? a.value ?? a.type).join(' '), da: fc[0] ?? '' });
    }
  };
  const pronto = new Promise((ok, no) => { ws.onopen = ok; ws.onerror = () => no(new Error('WebSocket del browser non aperto')); });
  const manda = (method, params = {}) => new Promise((ok, no) => { const n = ++id; attese.set(n, { ok, no }); ws.send(JSON.stringify({ id: n, method, params })); });
  const valuta = async (espressione) => {
    const r = await manda('Runtime.evaluate', { expression: `(async () => { ${espressione} })()`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`nella pagina: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  };
  return { pronto, manda, valuta, errori, chiudi: () => ws.close() };
}

/**
 * Apre l'app in un browser vero su un server di prova.
 * @param opzioni { cartella, cartelle, eMaster, larghezza, altezza } — `cartella` e `cartelle` sono quelle di prova
 *   già pronte (chi chiama le crea e le riempie: qui non si tocca niente delle cartelle vere)
 * @returns { url, base, valuta, attendi, clic, errori, azzeraErrori, api, chiudi }
 */
export async function apriApp({ cartella, cartelle = {}, eMaster = () => false, larghezza = 820, altezza = 1180 } = {}) {
  if (!BROWSER) throw new Error('nessun browser: chi chiama deve controllare BROWSER e saltare');
  const base = mkdtempSync(join(tmpdir(), 'mutant-browser-250-'));
  const srv = creaServer({ cartella, ...cartelle, eMaster });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const porta = srv.address().port;
  const url = `http://127.0.0.1:${porta}/`;
  const portaCdp = 9300 + Math.floor(Math.random() * 600);
  const figlio = spawn(BROWSER, [`--headless=new`, `--remote-debugging-port=${portaCdp}`, `--user-data-dir=${join(base, 'profilo')}`,
    `--window-size=${larghezza},${altezza}`, '--disable-extensions', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', 'about:blank'],
  { stdio: 'ignore', windowsHide: true });
  // da Edge 157 il processo esce con 0 e lascia dietro di sé il browser vero: non si passa `figlio` all'attesa (lotto 233)
  const pagina = await attendiServer(async () => {
    try { const r = await fetch(`http://127.0.0.1:${portaCdp}/json`); return (await r.json()).find((x) => x.type === 'page') ?? null; } catch { return null; }
  }, { ms: 30000, cosa: 'il browser' });
  const s = cdp(pagina.webSocketDebuggerUrl);
  await s.pronto;
  await s.manda('Runtime.enable');
  await s.manda('Emulation.setDeviceMetricsOverride', { width: larghezza, height: altezza, deviceScaleFactor: 1, mobile: false });
  await s.manda('Page.navigate', { url });

  const attendi = async (cond, cosa, giri = 150) => {
    for (let i = 0; i < giri; i += 1) { if (await s.valuta(cond)) return true; await dormi(100); }
    throw new Error(`timeout: ${cosa}`);
  };
  /** Clicca il primo pulsante il cui testo combacia, e torna false se non c'è. */
  const clic = (testoRegex, { dentro = 'document' } = {}) => s.valuta(
    `const b = [...${dentro}.querySelectorAll('button,a')].find((x) => ${testoRegex}.test(x.textContent.trim()) && !(x.disabled || x.getAttribute('aria-disabled') === 'true')); if (!b) return false; b.click(); return true`);

  return {
    url, base, porta,
    valuta: s.valuta,
    manda: s.manda,
    attendi,
    clic,
    errori: ({ tutti = false } = {}) => s.errori.filter((e) => tutti || !e.da || e.da.includes(`127.0.0.1:${porta}`)),
    azzeraErrori: () => { s.errori.length = 0; },
    /** Una chiamata all'API del server di prova, dal processo del test (non dalla pagina). */
    api: async (percorso, opzioni) => {
      const r = await fetch(`${url.replace(/\/$/, '')}${percorso}`, opzioni);
      return { stato: r.status, corpo: await r.json().catch(() => null) };
    },
    chiudi: async () => {
      try { s.chiudi(); } catch { /* il browser sta già chiudendo */ }
      figlio.kill();
      await new Promise((ok) => srv.close(ok));
      await dormi(300);
      try { rmSync(base, { recursive: true, force: true }); } catch { /* il profilo del browser può restare bloccato un attimo */ }
    },
  };
}

/** Una cartella di prova vuota, con le sottocartelle del server. */
export function cartelleDiProva(prefisso = 'mutant-prova-250-') {
  const base = mkdtempSync(join(tmpdir(), prefisso));
  const cartella = join(base, 'personaggi');
  mkdirSync(cartella, { recursive: true });
  const cartelle = Object.fromEntries(['tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px', 'galleria', 'musica']
    .map((k) => [k, join(base, k)]));
  for (const x of Object.values(cartelle)) mkdirSync(x, { recursive: true });
  return { base, cartella, cartelle };
}
