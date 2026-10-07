// Musica di fondo della mappa (richiesta di Marcello del 07/10/2026): cartella musica/ del server (/api/musica: elenco
// filtrato per formato, file anche a pezzi con Range, nomi sicuri, cartella non servita come file statico), musica
// della bozza che passa allo scontro con «Inizia», musica dello scontro e quando suona.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { fileMusicaValido, musicaDi, urlMusica } from '../src/mappa/audio.js';
import { nuovaBozza, cambiaBozza, validaBozza, iniziaBozza } from '../src/preparazione.js';
import { cambiaMusica, validaScontro, chiudi } from '../src/scontro.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const radice = mkdtempSync(join(tmpdir(), 'mutant-musica-'));
const musica = join(radice, 'musica');
let server;
let base;

before(async () => {
  mkdirSync(musica, { recursive: true });
  writeFileSync(join(musica, 'Battaglia nel bunker.mp3'), Buffer.from('ID3' + 'x'.repeat(997)));
  writeFileSync(join(musica, 'tensione.ogg'), Buffer.from('OggS' + 'y'.repeat(96)));
  writeFileSync(join(musica, 'appunti.txt'), 'non è musica');
  writeFileSync(join(musica, '.nascosto.mp3'), 'z');
  mkdirSync(join(musica, 'cartella.mp3'));
  server = creaServer({ cartella: join(radice, 'personaggi'), tavolo: join(radice, 'tavolo'), scontri: join(radice, 'scontri'), nemici: join(radice, 'nemici'), veicoli: join(radice, 'veicoli'), scene: join(radice, 'scene'), mappe: join(radice, 'mappe'), musica });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((ok) => server.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

test('dati: i formati che leggono tutti i browser; nomi di file ammessi', () => {
  assert.deepEqual(dati.mappa.audio.musica.formati, ['mp3', 'ogg', 'wav', 'm4a', 'aac']);
  assert.equal(dati.mappa.audio.musica.cartella, 'musica');
  assert.ok(fileMusicaValido('Battaglia nel bunker.mp3', dati));
  assert.ok(fileMusicaValido('TEMA.M4A', dati));
  for (const x of ['appunti.txt', '../segreti.mp3', 'a/b.mp3', '.nascosto.mp3', '', null]) assert.ok(!fileMusicaValido(x, dati), String(x));
  assert.equal(urlMusica('Battaglia nel bunker.mp3'), 'api/musica/Battaglia%20nel%20bunker.mp3');
});

test('server: elenco della cartella musica/ (solo i formati ammessi, niente nascosti né cartelle)', async () => {
  const r = await fetch(`${base}/api/musica`);
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).map((x) => [x.file, x.dimensione]), [['Battaglia nel bunker.mp3', 1000], ['tensione.ogg', 100]]);
});

test('server: il file, intero o a pezzi (Range), con il tipo audio; nomi non validi e assenti rifiutati', async () => {
  let r = await fetch(`${base}/${urlMusica('Battaglia nel bunker.mp3')}`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'audio/mpeg');
  assert.equal(r.headers.get('accept-ranges'), 'bytes');
  assert.equal((await r.arrayBuffer()).byteLength, 1000);
  r = await fetch(`${base}/${urlMusica('Battaglia nel bunker.mp3')}`, { headers: { Range: 'bytes=0-2' } });
  assert.equal(r.status, 206);
  assert.equal(r.headers.get('content-range'), 'bytes 0-2/1000');
  assert.equal(Buffer.from(await r.arrayBuffer()).toString(), 'ID3');
  r = await fetch(`${base}/${urlMusica('tensione.ogg')}`, { headers: { Range: 'bytes=-4' } });
  assert.deepEqual([r.status, r.headers.get('content-range'), r.headers.get('content-type')], [206, 'bytes 96-99/100', 'audio/ogg']);
  await r.arrayBuffer();
  r = await fetch(`${base}/${urlMusica('tensione.ogg')}`, { headers: { Range: 'bytes=500-' } });
  assert.equal(r.status, 416);
  await r.arrayBuffer();
  for (const [nome, stato] of [['appunti.txt', 400], ['manca.mp3', 404], ['..%2Fsegreti.mp3', 400]]) {
    r = await fetch(`${base}/api/musica/${nome}`);
    assert.equal(r.status, stato, nome);
    await r.arrayBuffer();
  }
  // la cartella non si legge come file statico (solo dall'API)
  r = await fetch(`${base}/musica/tensione.ogg`);
  assert.equal(r.status, 404);
  await r.arrayBuffer();
  // l'effetto del Round, invece, è un file statico del progetto, con il tipo audio
  r = await fetch(`${base}/Sounds/Effects/RoundBell.mp3`, { method: 'HEAD' });
  assert.deepEqual([r.status, r.headers.get('content-type')], [200, 'audio/mpeg']);
});

test('bozza → scontro: la musica scelta nella preparazione passa allo scontro; si cambia e si toglie; suona solo a scontro aperto', () => {
  let b = nuovaBozza({ nome: 'Bunker' });
  b = cambiaBozza(b, { musica: 'Battaglia nel bunker.mp3' });
  assert.equal(validaBozza(b), null);
  assert.equal(cambiaBozza(b, { musica: '' }).musica, null);
  assert.match(validaBozza({ ...b, musica: '../x.mp3' }), /musica/);
  let s = iniziaBozza(b, { id: 'scontro-bunker', pg: [{ chiave: 'ada', nome: 'Ada', iniziativa: 3 }] });
  assert.equal(s.musica, 'Battaglia nel bunker.mp3');
  assert.equal(validaScontro(s), null);
  assert.equal(musicaDi(s), 'Battaglia nel bunker.mp3');
  s = cambiaMusica(s, 'tensione.ogg');
  assert.match(s.registro.at(-1).testo, /^Musica di fondo: tensione\.ogg\.$/);
  assert.equal(cambiaMusica(s, 'tensione.ogg'), s, 'stessa musica: nulla');
  assert.equal(musicaDi(cambiaMusica(s, null)), null);
  assert.match(cambiaMusica(s, null).registro.at(-1).testo, /tolta/);
  assert.equal(musicaDi(chiudi(s)), null, 'alla chiusura si ferma');
  assert.equal(musicaDi(iniziaBozza(nuovaBozza({ nome: 'x' }), { id: 'y', pg: [{ chiave: 'a', nome: 'A', iniziativa: 1 }] })), null);
  assert.match(validaScontro({ ...s, musica: 'a/b.mp3' }), /musica/);
});
