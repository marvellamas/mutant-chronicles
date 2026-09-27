// PDF di stampa dei personaggi di collaudo (tests/collaudo/*.json) con Edge headless (DevTools
// Protocol), in un profilo temporaneo senza estensioni.
// Uso: con il server statico acceso sulla porta 8000 (python -m http.server 8000),
//   node tools/collaudo_pdf.mjs
// Scrive tests/collaudo/<nome>.pdf e stampa pagine, formato e avvisi della barra di stampa.
// Variabili facoltative: PORTA (8000), CARTELLA (cartella dei .json e dei PDF, relativa alla
// radice del repo: tests/collaudo; per gli esempi della SS: docs/esempi-stampa), IMMAGINI
// (cartella dove salvare un PNG per ogni foglio, per controllare l'impaginazione), STAMPA_MAGIA
// ("elenco,completo": un PDF per ogni scelta del foglio Magia, <nome>-solo-elenco.pdf e
// <nome>-schede-complete.pdf; i personaggi senza magia danno un PDF solo, <nome>.pdf).
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const DIR = `${tmpdir()}/mutant-collaudo-pdf`;
const CARTELLA = process.env.CARTELLA ?? 'tests/collaudo';
const OUT = fileURLToPath(new URL(`../${CARTELLA}`, import.meta.url));
const PORTA = process.env.PORTA ?? '8000';
const IMMAGINI = process.env.IMMAGINI ?? null;
const EDGE = process.env.EDGE ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
rmSync(DIR, { recursive: true, force: true }); // niente moduli in cache da una prova precedente
mkdirSync(DIR, { recursive: true });
const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=9334', `--user-data-dir=${DIR}`, '--no-first-run', '--disable-extensions', '--disable-component-extensions-with-background-pages', 'about:blank'], { stdio: 'ignore' });
const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 40 && !target; i++) {
  await attendi(250);
  try { target = (await (await fetch('http://127.0.0.1:9334/json/list')).json()).find((t) => t.type === 'page'); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let n = 0;
const attese = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && attese.has(m.id)) { attese.get(m.id)(m); attese.delete(m.id); }
});
const cdp = (method, params = {}) => new Promise((r) => { const id = ++n; attese.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const valuta = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

const FILE = readdirSync(OUT).filter((f) => f.endsWith('.json') && !f.startsWith('_')).map((f) => f.slice(0, -5)).sort();
await cdp('Page.enable');
await cdp('Page.navigate', { url: `http://localhost:${PORTA}/` });
await attendi(1500);
console.log(await valuta(`(async () => {
  const { deserializzaPersonaggio } = await import('/src/character.js');
  const tutti = {};
  for (const f of ${JSON.stringify(FILE)}) {
    const { creazione, livelli, sessione } = deserializzaPersonaggio(await (await fetch('/${CARTELLA}/' + f + '.json')).text());
    tutti[f] = { id: f, scelte: creazione, livelli, sessione, passo: 9, aggiornato: new Date().toISOString() };
  }
  localStorage.setItem('mutant.personaggi.v1', JSON.stringify(tutti));
  return 'caricati ' + Object.keys(tutti).length;
})()`));

const VARIANTI = (process.env.STAMPA_MAGIA ?? '').split(',').map((x) => x.trim()).filter(Boolean);
const NOMI_VARIANTI = { elenco: 'solo-elenco', completo: 'schede-complete' };
const lavori = FILE.flatMap((id) => (VARIANTI.length ? VARIANTI.map((v) => ({ id, variante: v })) : [{ id, variante: null }]));
for (const { id, variante } of lavori) {
  await cdp('Page.navigate', { url: `http://localhost:${PORTA}/#/p/${id}/stampa` });
  await attendi(2500);
  const conMagia = await valuta(`!!document.querySelector('.scelta-stampa')`);
  if (variante && conMagia) {
    // la scelta come la fa il giocatore: si salva con il personaggio e la vista si ridisegna
    const cambiata = await valuta(`(() => { const x = document.querySelector('.scelta-stampa input[value=${JSON.stringify(variante)}]'); if (!x || x.checked) return false; x.click(); return true; })()`);
    if (cambiata) await attendi(3500);
  }
  if (variante && !conMagia && variante !== VARIANTI[0]) continue;
  const nome = variante && conMagia ? `${id}-${NOMI_VARIANTI[variante] ?? variante}` : id;
  const avvisi = await valuta(`document.querySelector('.barra-avvisi')?.innerText ?? '(nessuna barra)'`);
  if (IMMAGINI) {
    mkdirSync(IMMAGINI, { recursive: true });
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1.5, mobile: false });
    await attendi(500);
    const rett = await valuta(`[...document.querySelectorAll('.foglio')].map((f) => { const r = f.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; })`);
    for (const [k, r] of rett.entries()) {
      const img = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...r, scale: 1 } });
      writeFileSync(`${IMMAGINI}/${nome}-${k + 1}.png`, Buffer.from(img.result.data, 'base64'));
    }
    await cdp('Emulation.clearDeviceMetricsOverride');
  }
  const pdf = await cdp('Page.printToPDF', { preferCSSPageSize: true, printBackground: true });
  const buf = Buffer.from(pdf.result.data, 'base64');
  writeFileSync(`${OUT}/${nome}.pdf`, buf);
  const pagine = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  const box = /\/MediaBox\s*\[([^\]]+)\]/.exec(buf.toString('latin1'))?.[1];
  console.log(`${nome}: ${pagine} pagine, MediaBox ${box}, ${Math.round(buf.length / 1024)} kB | ${avvisi.replace(/\n/g, ' / ')}`);
}
ws.close();
edge.kill();
process.exit(0);
