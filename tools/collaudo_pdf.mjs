// PDF di stampa (SS) con Edge headless (DevTools Protocol), in un profilo temporaneo senza estensioni.
// Uso: con il server statico acceso sulla porta 8000 (python -m http.server 8000),
//   node tools/collaudo_pdf.mjs
// Senza CARTELLA usa i personaggi di prova della SS (docs/layout-ss.md, §7): PDF in
// docs/esempi-stampa/ di c_freelance_tecnico_l5 (senza magia) e di b_fratellanza_arcanista_l12-layout
// (magia e Artefatti, «solo elenco» e «schede complete»); Lucas solo per il controllo di sbordo.
// Con CARTELLA (relativa alla radice del repo) usa tutti i .json di quella cartella e ci scrive i PDF.
// Stampa pagine, formato e avvisi della barra di stampa.
// Controllo: esce con codice 1 se un foglio (tranne Poteri, che si impagina da sé; continuazioni
// comprese) supera la sua pagina, cioè se il corpo, un riquadro o una colonna tagliano il contenuto
// o un riempitivo taglia righe vere; se manca il riquadro Punti Vita nella prima pagina del foglio
// Combattimento; se la numerazione non torna («pagina P di T» di seguito, «foglio N» fisso). Il foglio
// Inventario si impagina per sezioni: fallisce solo se una sezione non entra in una pagina intera
// (le sezioni divise fra le due colonne sono ammesse).
// Variabili facoltative: PORTA (8000), CARTELLA, IMMAGINI (cartella dove salvare un PNG per ogni
// pagina), STAMPA_MAGIA ("elenco,completo": un PDF per ogni scelta del foglio Poteri,
// <nome>-solo-elenco.pdf e <nome>-schede-complete.pdf; senza magia un PDF solo, <nome>.pdf; senza
// CARTELLA vale "elenco,completo").
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const DIR = `${tmpdir()}/mutant-collaudo-pdf`;
const CARTELLA = process.env.CARTELLA ?? null;
const RADICE = new URL('../', import.meta.url);
const OUT = fileURLToPath(new URL(CARTELLA ?? 'docs/esempi-stampa', RADICE));
// personaggi di prova della SS (docs/layout-ss.md, §7): file, id nel localStorage, PDF sì/no
const PROVA = [
  { file: 'tests/collaudo/c_freelance_tecnico_l5.json', pdf: true },
  { file: 'docs/esempi-stampa/b_fratellanza_arcanista_l12-layout.json', pdf: true },
  { file: 'tests/collaudo/Lucas_liv6_2026-09-28 (2).json', pdf: false },
];
const PORTA = process.env.PORTA ?? '8000';
const IMMAGINI = process.env.IMMAGINI ?? null;
const EDGE = process.env.EDGE ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
rmSync(DIR, { recursive: true, force: true }); // niente moduli in cache da una prova precedente
mkdirSync(DIR, { recursive: true });
const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=9334', `--user-data-dir=${DIR}`, '--no-first-run', '--disable-extensions', '--disable-component-extensions-with-background-pages', 'about:blank'], { stdio: 'ignore' });
const attendi = (ms) => new Promise((r) => setTimeout(r, ms));
// Edge headless lascia accesi processi che non sono figli di quello lanciato: su Windows si
// chiudono tutti quelli con il profilo temporaneo nella riga di comando, altrimenti tengono
// occupata la cartella alla corsa successiva
const chiudiEdge = () => {
  edge.kill();
  if (process.platform !== 'win32') return;
  const filtro = `Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" | Where-Object { $_.CommandLine -like '*mutant-collaudo-pdf*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
  spawnSync('powershell', ['-NoProfile', '-Command', filtro], { stdio: 'ignore' });
};

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

// id senza spazi né parentesi (vanno nell'indirizzo #/p/<id>/stampa)
const idDi = (percorso) => percorso.split('/').pop().slice(0, -5).replace(/[^\w-]+/g, '_').replace(/_+$/, '');
const ELENCO = CARTELLA
  ? readdirSync(OUT).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort().map((f) => ({ file: `${CARTELLA}/${f}`, pdf: true }))
  : PROVA;
const FILE = ELENCO.map((x) => ({ ...x, id: idDi(x.file) }));
await cdp('Page.enable');
await cdp('Page.navigate', { url: `http://localhost:${PORTA}/` });
await attendi(1500);
const caricati = await valuta(`(async () => {
  const { deserializzaPersonaggio } = await import('/src/character.js');
  const tutti = {};
  for (const f of ${JSON.stringify(FILE)}) {
    const { creazione, livelli, sessione } = deserializzaPersonaggio(await (await fetch('/' + f.file.split('/').map(encodeURIComponent).join('/'))).text());
    tutti[f.id] = { id: f.id, scelte: creazione, livelli, sessione, passo: 9, aggiornato: new Date().toISOString() };
  }
  localStorage.setItem('mutant.personaggi.v1', JSON.stringify(tutti));
  return 'caricati ' + Object.keys(tutti).length;
})()`);
console.log(caricati);
// server spento o file illeggibili: meglio fermarsi che produrre PDF della pagina d'errore
if (typeof caricati !== 'string' || !caricati.startsWith('caricati')) {
  console.error(`ERRORE: personaggi non caricati (server acceso sulla porta ${PORTA}?)`);
  ws.close(); chiudiEdge(); process.exit(1);
}

/** Fogli che superano la pagina e numerazione (eseguita nella pagina di stampa). */
function controllaFogli() {
  const trabocca = (el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
  const out = [];
  // numerazione (docs/layout-ss.md, §5.2): «pagina P di T» di seguito; «foglio N» uguale per le
  // pagine dello stesso foglio e crescente da un foglio al successivo
  const pagine = [...document.querySelectorAll('.foglio')];
  let ultimo = 0;
  pagine.forEach((f, i) => {
    const piede = f.querySelector('.foglio-piede')?.textContent ?? '';
    const p = /pagina (\d+) di (\d+)/.exec(piede);
    const n = Number(/foglio (\d+)/.exec(piede)?.[1]);
    if (!p || Number(p[1]) !== i + 1 || Number(p[2]) !== pagine.length) out.push(`numerazione: pagina ${i + 1} ha «${piede}»`);
    const seguito = f.classList.contains('seguito');
    if (!n || (seguito ? n !== ultimo : n <= ultimo)) out.push(`numerazione: «foglio ${n}» dopo il foglio ${ultimo}${seguito ? ' (seguito)' : ''}`);
    ultimo = n;
  });
  for (const f of document.querySelectorAll('.foglio-inventario')) {
    const colonne = f.querySelector('.inv-colonne');
    if (trabocca(f.querySelector('.foglio-corpo')) || (colonne && trabocca(colonne))) out.push(`${f.querySelector('.foglio-titolo')?.textContent ?? 'Inventario'}: una sezione non entra in una pagina intera`);
  }
  for (const f of document.querySelectorAll('.foglio:not(.foglio-poteri):not(.foglio-inventario)')) {
    const titolo = f.querySelector('.foglio-titolo')?.textContent ?? '?';
    const corpo = f.querySelector('.foglio-corpo');
    const fuori = [corpo, ...corpo.querySelectorAll('.riquadro-stampa, .riquadro-stampa > .contenuto, .colonna')].find(trabocca);
    if (fuori) out.push(`${titolo}: supera la pagina (${fuori.closest('.riquadro-stampa')?.querySelector('h2')?.textContent ?? fuori.className})`);
    for (const c of corpo.querySelectorAll('.riempi-righe')) {
      const fondo = c.getBoundingClientRect().bottom + 0.5;
      if ([...c.querySelectorAll('tbody > tr')].some((r) => !r.dataset.vuota && r.getBoundingClientRect().bottom > fondo)) out.push(`${titolo}: righe tagliate in un riempitivo`);
    }
  }
  const primo = document.querySelector('.foglio-combattimento:not(.seguito)');
  if (primo && !primo.querySelector('.f3-pv')) out.push('Combattimento: manca il riquadro Punti Vita nella prima pagina');
  return out;
}
const sbordati = [];

const VARIANTI = (process.env.STAMPA_MAGIA ?? '').split(',').map((x) => x.trim()).filter(Boolean);
const NOMI_VARIANTI = { elenco: 'solo-elenco', completo: 'schede-complete' };
const varianti = VARIANTI.length ? VARIANTI : CARTELLA ? [] : ['elenco', 'completo'];
const lavori = FILE.flatMap(({ id, pdf }) => (varianti.length ? varianti.map((v) => ({ id, pdf, variante: v })) : [{ id, pdf, variante: null }]));
for (const { id, pdf: conPdf, variante } of lavori) {
  await cdp('Page.navigate', { url: `http://localhost:${PORTA}/#/p/${id}/stampa` });
  await attendi(2500);
  const conMagia = await valuta(`!!document.querySelector('.scelta-stampa')`);
  if (variante && conMagia) {
    // la scelta come la fa il giocatore: si salva con il personaggio e la vista si ridisegna
    const cambiata = await valuta(`(() => { const x = document.querySelector('.scelta-stampa input[value=${JSON.stringify(variante)}]'); if (!x || x.checked) return false; x.click(); return true; })()`);
    if (cambiata) await attendi(3500);
  }
  if (variante && !conMagia && variante !== varianti[0]) continue;
  const nome = variante && conMagia ? `${id}-${NOMI_VARIANTI[variante] ?? variante}` : id;
  const avvisi = await valuta(`document.querySelector('.barra-avvisi')?.innerText ?? '(nessuna barra)'`);
  for (const x of await valuta(`(${controllaFogli})()`)) sbordati.push(`${nome}: ${x}`);
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
  const pagineVista = await valuta(`document.querySelectorAll('.foglio').length`);
  if (!pagineVista) { sbordati.push(`${nome}: nessun foglio nella vista di stampa`); continue; }
  // fogli pagina per pagina, dal piè di pagina: «3», «3+» per la continuazione
  const sequenza = await valuta(`[...document.querySelectorAll('.foglio')].map((f) => { const p = f.querySelector('.foglio-piede')?.textContent ?? ''; return (/foglio (\\d+)/.exec(p)?.[1] ?? '?') + (f.classList.contains('seguito') ? '+' : '') + ' ' + (f.querySelector('.foglio-titolo')?.textContent ?? '').replace(' (continua)', ''); }).join(' · ')`);
  if (!conPdf) { console.log(`${nome}: ${pagineVista} pagine (solo controllo di sbordo) | ${avvisi.replace(/\n/g, ' / ')}\n  fogli: ${sequenza}`); continue; }
  const pdf = await cdp('Page.printToPDF', { preferCSSPageSize: true, printBackground: true });
  const buf = Buffer.from(pdf.result.data, 'base64');
  writeFileSync(`${OUT}/${nome}.pdf`, buf);
  const pagine = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  const box = /\/MediaBox\s*\[([^\]]+)\]/.exec(buf.toString('latin1'))?.[1];
  console.log(`${nome}: ${pagine} pagine, MediaBox ${box}, ${Math.round(buf.length / 1024)} kB | ${avvisi.replace(/\n/g, ' / ')}\n  fogli: ${sequenza}`);
  if (pagine !== pagineVista) sbordati.push(`${nome}: il PDF ha ${pagine} pagine, la vista ${pagineVista}`);
}
ws.close();
chiudiEdge();
if (sbordati.length) {
  console.error(['ERRORE: fogli che superano la pagina senza continuazione:', ...sbordati.map((x) => `  ${x}`)].join('\n'));
  process.exit(1);
}
console.log('Nessun foglio supera la pagina; numerazione corretta.');
process.exit(0);
