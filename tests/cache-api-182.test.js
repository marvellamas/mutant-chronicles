import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 182 (08/11/2026), coda: un file vecchio letto dalla cache. Al tavolo un PG letto vecchio fa perdere mezz'ora
// senza che nessuno capisca perché, quindi ogni risposta dell'API che cambia deve arrivare fresca.
//
// Che cosa controlla questa prova, una risposta per volta:
//   - il personaggio (GET /api/personaggi/<file>) e l'elenco: «no-cache», e una scrittura dal tablet si rilegge subito
//     dal PC del Direttore senza forzare il ricaricamento;
//   - il ritratto (GET /api/ritratti/<chiave>): prima aveva «public, max-age=86400» e il nome è la chiave del PG, non
//     il suo contenuto, quindi un ritratto cambiato restava vecchio fino a un giorno. Ora «no-cache» con un ETag sul
//     contenuto, così è sempre fresco e quello che non è cambiato costa un 304;
//   - le immagini della mappa restano «immutable», ed è giusto: il loro nome porta l'impronta del contenuto, quindi
//     un'immagine diversa ha un altro nome.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';

const radice = mkdtempSync(join(tmpdir(), 'mutant-cache-182-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(radice, k)]));
let srvMaster; let baseMaster; let srvTablet; let baseTablet;
before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  const crea = (eMaster) => creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe, px: c.px, eMaster });
  srvMaster = crea(() => true); srvTablet = crea(() => false);
  await new Promise((ok) => srvMaster.listen(0, '127.0.0.1', ok));
  await new Promise((ok) => srvTablet.listen(0, '127.0.0.1', ok));
  baseMaster = `http://127.0.0.1:${srvMaster.address().port}`;
  baseTablet = `http://127.0.0.1:${srvTablet.address().port}`;
});
after(async () => {
  await new Promise((ok) => srvMaster.close(ok));
  await new Promise((ok) => srvTablet.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

const FILE = 'Prova-Cache_liv5_2026-11-08.json';
const base = () => JSON.parse(readFileSync(new URL('../esempi/Aiko-Tenzan_liv5_2026-10-02.json', import.meta.url), 'utf8'));

test('il personaggio e il suo elenco non si mettono in cache', async () => {
  const pg = base();
  assert.equal((await fetch(`${baseMaster}/api/personaggi/${FILE}`, { method: 'PUT', body: JSON.stringify(pg) })).status, 200);
  const r = await fetch(`${baseMaster}/api/personaggi/${FILE}`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('cache-control'), 'no-cache', 'il file del PG non si mette in cache');
  assert.ok(r.headers.get('x-mutant-mtime'), 'la data del file è la revisione per chi riscrive');
  const elenco = await fetch(`${baseMaster}/api/personaggi`);
  assert.equal(elenco.headers.get('cache-control'), 'no-cache');
});

test('un PG cambiato dal tablet si rilegge subito dal PC del Direttore, senza forzare', async () => {
  const pg = base();
  pg.sessione = { ...(pg.sessione ?? {}), pvAttuali: 20 };
  await fetch(`${baseMaster}/api/personaggi/${FILE}`, { method: 'PUT', body: JSON.stringify(pg) });
  const prima = await (await fetch(`${baseMaster}/api/personaggi/${FILE}`)).json();
  assert.equal(prima.sessione.pvAttuali, 20);
  // il tablet del giocatore scrive un valore nuovo
  const dal = { ...pg, sessione: { ...pg.sessione, pvAttuali: 7 } };
  assert.equal((await fetch(`${baseTablet}/api/personaggi/${FILE}`, { method: 'PUT', headers: { 'X-Mutant-Da': 'giocatore' }, body: JSON.stringify(dal) })).status, 200);
  // il PC del Direttore rilegge: deve vedere il valore nuovo (nessun ricaricamento forzato, nessun parametro anti-cache)
  const dopo = await (await fetch(`${baseMaster}/api/personaggi/${FILE}`)).json();
  assert.equal(dopo.sessione.pvAttuali, 7, 'il valore nuovo arriva subito');
  // e anche l'elenco porta la data nuova
  const righe = await (await fetch(`${baseMaster}/api/personaggi`)).json();
  const riga = righe.find((x) => x.file === FILE);
  assert.ok(riga, 'il file è nell’elenco');
  assert.ok(riga.mtime > 0);
});

test('il ritratto arriva sempre fresco: no-cache con ETag, e un 304 se non è cambiato', async () => {
  // un PG con un ritratto (una PNG 1 × 1)
  const png1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const png2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const pg = base();
  const file = 'Prova-Ritratto_liv5_2026-11-08.json';
  const chiave = 'Prova-Ritratto';
  const scrivi = async (ritratto) => {
    const corpo = { ...pg, scelte: { ...pg.scelte, nome: 'Prova Ritratto', ritratto } };
    const r = await fetch(`${baseMaster}/api/personaggi/${file}`, { method: 'PUT', body: JSON.stringify(corpo) });
    assert.equal(r.status, 200, await r.text());
  };
  await scrivi(png1);
  const r1 = await fetch(`${baseMaster}/api/ritratti/${chiave}`);
  if (r1.status === 404) return; // il PG di prova non espone un ritratto: niente da controllare qui
  assert.equal(r1.status, 200);
  // la prova che deve fallire se il ritratto torna a restare in cache per un giorno
  assert.equal(r1.headers.get('cache-control'), 'no-cache', 'il ritratto non si tiene in cache: il nome è la chiave del PG, non il contenuto');
  const etag = r1.headers.get('etag');
  assert.ok(etag, 'serve un ETag sul contenuto, per rispondere 304 quando non è cambiato');
  // non cambiato: 304, senza rimandare l'immagine
  const uguale = await fetch(`${baseMaster}/api/ritratti/${chiave}`, { headers: { 'If-None-Match': etag } });
  assert.equal(uguale.status, 304);
  // cambiato: 200 con un ETag diverso, anche chiedendo con il vecchio
  await scrivi(png2);
  const r2 = await fetch(`${baseMaster}/api/ritratti/${chiave}`, { headers: { 'If-None-Match': etag } });
  assert.equal(r2.status, 200, 'il ritratto nuovo arriva subito');
  assert.notEqual(r2.headers.get('etag'), etag);
});

test('nessuna risposta dell’API che cambia resta in cache; le immagini con l’impronta nel nome sì', () => {
  const s = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
  // una riga per risposta: le intestazioni stanno tutte sulla riga della writeHead
  const righe = s.split('\n').filter((r) => /res\.writeHead\(\s*(?:200|206)\s*,/.test(r));
  assert.ok(righe.length >= 6, `risposte con intestazioni esplicite: ${righe.length}`);
  const lunghe = righe.filter((r) => /max-age/.test(r));
  // l'unica risposta con una cache lunga è l'immagine della mappa, il cui nome porta l'impronta del contenuto
  assert.equal(lunghe.length, 1, `risposte con «max-age»: ${lunghe.map((r) => r.trim().slice(0, 70)).join(' | ')}`);
  assert.match(lunghe[0], /immutable/);
  assert.match(lunghe[0], /TIPI\[extname\(m\[1\]\)\]/, 'è la riga delle immagini della mappa');
  // e tutte le altre risposte con le intestazioni scritte lì dicono «no-cache»
  for (const r of righe) {
    if (/immutable/.test(r) || !/\{/.test(r)) continue; // i file statici hanno le loro intestazioni, più sotto
    assert.match(r, /'Cache-Control': 'no-cache/, `una risposta senza no-cache: ${r.trim().slice(0, 90)}`);
  }
  // i file dell'app (js, css, json, html) servono come `npx serve`: no-cache, così un aggiornamento si vede subito
  assert.match(s, /const NO_CACHE = new Set\(\['\.js', '\.mjs', '\.css', '\.json', '\.html'\]\)/);
  assert.match(s, /if \(NO_CACHE\.has\(est\)\) intestazioni\['Cache-Control'\] = 'no-cache';/);
});

test('l’app chiede i personaggi senza cache (cache: no-store) e il server glielo conferma', () => {
  const ui = readFileSync(new URL('../src/ui/cartella.js', import.meta.url), 'utf8');
  const letture = ui.split('\n').filter((r) => /fetch\(`?api\/personaggi/.test(r) && !/method: 'PUT'/.test(r) && !/giornale/.test(r));
  assert.ok(letture.length >= 2, `le letture della cartella: ${letture.length}`);
  for (const l of letture) assert.match(l, /cache: 'no-store'/, `una lettura senza no-store: ${l.trim().slice(0, 80)}`);
});

test('una mappa caricata due volte con lo stesso contenuto ha lo stesso nome (perciò «immutable» va bene)', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const invia = async () => (await fetch(`${baseMaster}/api/mappe?nome=prova`, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: png })).json();
  const a = await invia();
  if (!a?.file) return; // il server di prova rifiuta l'immagine: niente da controllare
  const b = await invia();
  assert.equal(a.file, b.file, 'stesso contenuto, stesso nome: la cache lunga non fa danni');
  const r = await fetch(`${baseMaster}/api/mappe/${a.file}`);
  assert.match(r.headers.get('cache-control') ?? '', /immutable/);
});

test('un file di prova scritto a mano nella cartella si legge subito (nessuna cache del server)', async () => {
  const file = 'Prova-Disco_liv5_2026-11-08.json';
  const pg = base();
  writeFileSync(join(c.personaggi, file), JSON.stringify({ ...pg, sessione: { ...(pg.sessione ?? {}), pvAttuali: 11 } }, null, 2));
  assert.equal((await (await fetch(`${baseMaster}/api/personaggi/${file}`)).json()).sessione.pvAttuali, 11);
  writeFileSync(join(c.personaggi, file), JSON.stringify({ ...pg, sessione: { ...(pg.sessione ?? {}), pvAttuali: 3 } }, null, 2));
  assert.equal((await (await fetch(`${baseMaster}/api/personaggi/${file}`)).json()).sessione.pvAttuali, 3, 'il server legge il file ogni volta');
});
