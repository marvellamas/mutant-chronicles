// Mappa di battaglia, lotto 1: API /api/scene e /api/mappe di server.mjs, su cartelle temporanee e porta casuale.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';
import { nuovaScena } from '../src/mappa/scena.js';
import { nuovaMaschera, inBase64, rettangolo, daBase64 } from '../src/mappa/celle.js';

const { dati } = await datiReali();
const radice = mkdtempSync(join(tmpdir(), 'mutant-mappa-'));
const scene = join(radice, 'scene');
const mappe = join(radice, 'mappe');
let server;
let base;

before(async () => {
  server = creaServer({ cartella: join(radice, 'personaggi'), tavolo: join(radice, 'tavolo'), scontri: join(radice, 'scontri'), nemici: join(radice, 'nemici'), veicoli: join(radice, 'veicoli'), scene, mappe });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((ok) => server.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le24 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];
const ascii = (t) => [...t].map((c) => c.charCodeAt(0));
const png = (w, h, coda = []) => Uint8Array.from([0x89, ...ascii('PNG'), 0x0d, 0x0a, 0x1a, 0x0a, ...be32(13), ...ascii('IHDR'), ...be32(w), ...be32(h), 8, 6, 0, 0, 0, 0, 0, 0, 0, ...coda]);
const webp = (w, h) => Uint8Array.from([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBPVP8X'), 10, 0, 0, 0, 0, 0, 0, 0, ...le24(w - 1), ...le24(h - 1)]);

const carica = (corpo, query) => fetch(`${base}/api/mappe?${query}`, { method: 'POST', body: corpo, headers: { 'Content-Type': 'application/octet-stream' } });
const metti = (s) => fetch(`${base}/api/scene/${s.id}`, { method: 'PUT', body: JSON.stringify(s), headers: { 'Content-Type': 'application/json' } });

test('immagini delle mappe: solo JPG, PNG e WEBP, nome con impronta, copia ridotta controllata', async () => {
  const r = await carica(png(2560, 1600), 'nome=Cripta di Mishima');
  assert.equal(r.status, 200);
  const m = await r.json();
  assert.match(m.file, /^cripta-di-mishima-[0-9a-f]{12}\.png$/);
  assert.deepEqual([m.tipo, m.larghezza, m.altezza], ['png', 2560, 1600]);
  // la stessa immagine non si duplica
  assert.equal((await (await carica(png(2560, 1600), 'nome=Cripta di Mishima')).json()).file, m.file);
  // copia ridotta: entro il lato massimo dei dati
  const lato = dati.mappa.immagini.ridotta.lato_massimo_px;
  const grande = await carica(webp(lato + 1, 100), 'nome=cripta&ridotta=1');
  assert.equal(grande.status, 400);
  assert.match((await grande.json()).errore, /lato massimo/);
  const rid = await (await carica(webp(lato, 1280), 'nome=cripta&ridotta=1')).json();
  assert.match(rid.file, /^cripta-[0-9a-f]{12}-ridotta\.webp$/);
  // tipi non ammessi
  const gif = await carica(Uint8Array.from([...ascii('GIF89a'), ...new Array(30).fill(0)]), 'nome=x');
  assert.equal(gif.status, 415);
  const svg = await carica(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), 'nome=x');
  assert.equal(svg.status, 415);
  // troppo grande (limite di data/mappa.json)
  const troppo = await carica(png(100, 100, new Array(dati.mappa.immagini.massimo_mb * 1024 * 1024).fill(0)), 'nome=enorme');
  assert.equal(troppo.status, 413);
  assert.match((await troppo.json()).errore, new RegExp(`${dati.mappa.immagini.massimo_mb} MB`));
  // elenco e lettura
  const elenco = await (await fetch(`${base}/api/mappe`)).json();
  assert.deepEqual(elenco.map((x) => x.file).sort(), [m.file, rid.file].sort());
  const img = await fetch(`${base}/api/mappe/${m.file}`);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');
  assert.match(img.headers.get('cache-control'), /immutable/);
  assert.equal((await img.arrayBuffer()).byteLength, png(2560, 1600).length);
  assert.equal((await fetch(`${base}/api/mappe/..%2Fscene%2Fx.json`)).status, 400);
  assert.equal((await fetch(`${base}/api/mappe/manca-000000000000.png`)).status, 404);
  assert.deepEqual(readdirSync(mappe).sort(), [m.file, rid.file].sort(), 'nessun file provvisorio rimasto');
});

test('scene: salvataggio con revisione, conflitto 409, validazione, immagini che devono esistere', async () => {
  assert.deepEqual(await (await fetch(`${base}/api/scene`)).json(), []);
  const img = await (await carica(png(640, 512), 'nome=sala')).json();
  const s = nuovaScena({ id: 'sala', nome: 'Sala del trono', mappa: { file: img.file, larghezza: 640, altezza: 512 }, dati });
  // immagine assente in mappe/
  const senzaImg = await metti({ ...s, mappa: { ...s.mappa, ridotta: 'sala-000000000000-ridotta.webp' } });
  assert.equal(senzaImg.status, 400);
  assert.match((await senzaImg.json()).errore, /non trovata in mappe/);
  // prima scrittura
  const r1 = await metti(s);
  assert.equal(r1.status, 200);
  const salvata = await r1.json();
  assert.equal(salvata.revisione, 1);
  assert.ok(salvata.aggiornato);
  // una seconda finestra con la revisione vecchia riceve 409 e la scena attuale
  const vecchia = await metti({ ...s, nome: 'Altro nome' });
  assert.equal(vecchia.status, 409);
  assert.equal((await vecchia.json()).attuale.nome, 'Sala del trono');
  // la revisione giusta passa
  const r2 = await metti({ ...salvata, nome: 'Sala del trono (2)' });
  assert.equal((await r2.json()).revisione, 2);
  // scene non valide e id diverso dal file
  const male = await metti({ ...salvata, revisione: 2, griglia: { ...salvata.griglia, q_px: 1 } });
  assert.equal(male.status, 400);
  assert.match((await male.json()).errore, /griglia\.q_px/);
  const altroId = await fetch(`${base}/api/scene/altra`, { method: 'PUT', body: JSON.stringify({ ...salvata, revisione: 2 }) });
  assert.equal(altroId.status, 400);
  assert.equal((await fetch(`${base}/api/scene/Non%20Valida`)).status, 400);
  assert.equal((await fetch(`${base}/api/scene/manca`)).status, 404);
  assert.equal((await fetch(`${base}/api/scene/sala`, { method: 'DELETE' })).status, 405);
  const elenco = await (await fetch(`${base}/api/scene`)).json();
  assert.deepEqual(elenco.map((x) => [x.id, x.nome, x.revisione, x.mappa]), [['sala', 'Sala del trono (2)', 2, img.file]]);
});

test('vista giocatori dal server: filtrata; il master riceve tutto', async () => {
  const C = 6, R = 4;
  const s = nuovaScena({ id: 'corridoio', nome: 'Corridoio', colonne: C, righe: R, dati });
  s.nebbia.coperti = inBase64(rettangolo(daBase64(s.nebbia.coperti), C, R, 0, 0, 2, 3, false));
  s.muri = inBase64(rettangolo(nuovaMaschera(C, R), C, R, 0, 0, 5, 0, true));
  s.token = [
    { id: 'a', rif: { tipo: 'partecipante', id: 'pg:lucas' }, q: [0, 1], ingombro: 1, nascosto: false },
    { id: 'b', rif: { tipo: 'partecipante', id: 'nem:predatore:1' }, q: [1, 2], ingombro: 1, nascosto: true },
    { id: 'c', rif: { tipo: 'partecipante', id: 'nem:predatore:2' }, q: [5, 3], ingombro: 1, nascosto: false },
  ];
  assert.equal((await metti(s)).status, 200);
  const master = await (await fetch(`${base}/api/scene/corridoio`)).json();
  assert.equal(master.token.length, 3);
  const v = await (await fetch(`${base}/api/scene/corridoio?vista=giocatori`)).json();
  assert.equal(v.vista, 'giocatori');
  assert.deepEqual(v.token.map((t) => t.id), ['a']);
  assert.ok(!JSON.stringify(v).includes('predatore'));
  assert.ok(!('annulla' in v) && !('movimenti' in v));
  assert.equal((await fetch(`${base}/api/scene/corridoio?vista=master`)).status, 400);
});

test('le cartelle dei dati non si servono come file statici', async () => {
  for (const [cartella, file] of [[scene, 'x.json'], [mappe, 'x.png']]) {
    mkdirSync(cartella, { recursive: true });
    writeFileSync(join(cartella, file), '{}');
  }
  for (const p of ['/scene/LEGGIMI.txt', '/mappe/LEGGIMI.txt', '/veicoli/LEGGIMI.txt']) {
    assert.equal((await fetch(`${base}${p}`)).status, 404, p);
  }
});
