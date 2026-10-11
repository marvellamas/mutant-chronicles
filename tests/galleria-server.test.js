// Galleria (N1, 13/10/2026): /api/galleria sul server, su cartelle temporanee e porta casuale. Caricamento,
// immagini messe a mano nella cartella, «Mostra ai giocatori», «Nascondi a tutti», sostituzione, galleria dei
// giocatori e «Togli dalla galleria dei giocatori».
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';

const radice = mkdtempSync(join(tmpdir(), 'mutant-galleria-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'galleria'].map((k) => [k, join(radice, k)]));
let server, base;

// un PNG 1×1 vero (l'intestazione la legge src/mappa/immagine.js) e un GIF 1×1
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  server = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe, galleria: c.galleria });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((ok) => server.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

const api = async (p, o) => {
  const r = await fetch(`${base}/api/galleria${p}`, o);
  return { stato: r.status, corpo: await r.json().catch(() => null) };
};
const carica = (nome, corpo = PNG, extra = '') => api(`?nome=${encodeURIComponent(nome)}${extra}`, { method: 'POST', body: corpo, headers: { 'Content-Type': 'application/octet-stream' } });

test('caricamento: il file va in galleria/, la scheda nell’indice, l’impronta nel nome', async () => {
  const { stato, corpo } = await carica('La Cripta');
  assert.equal(stato, 200);
  assert.match(corpo.file, /^la-cripta-[0-9a-f]{12}\.png$/);
  assert.ok(existsSync(join(c.galleria, corpo.file)), 'il file è nella cartella');
  assert.equal(corpo.indice.immagini[0].nome, 'La Cripta');
  // lo stesso file caricato due volte non si duplica
  const due = await carica('La Cripta');
  assert.equal(due.corpo.file, corpo.file);
  assert.equal(due.corpo.indice.immagini.length, 1);
  // l'immagine si scarica
  const img = await fetch(`${base}/api/galleria/img/${corpo.file}`);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');
  assert.equal((await img.arrayBuffer()).byteLength, PNG.length);
  // un file che non è un'immagine viene rifiutato
  const no = await carica('Appunti', Buffer.from('non sono un’immagine'));
  assert.equal(no.stato, 415);
});

test('anche i GIF, e le copie (ridotta e miniatura) stanno accanto alla loro immagine', async () => {
  const gif = await carica('Fuoco', GIF);
  assert.equal(gif.stato, 200);
  assert.match(gif.corpo.file, /\.gif$/);
  const mini = await carica('Fuoco', PNG, `&variante=mini&di=${encodeURIComponent(gif.corpo.file)}`);
  assert.equal(mini.stato, 200);
  assert.equal(mini.corpo.file, gif.corpo.file.replace('.gif', '-mini.png'));
  const voce = mini.corpo.indice.immagini.find((v) => v.file === gif.corpo.file);
  assert.equal(voce.mini, mini.corpo.file);
  assert.ok(!mini.corpo.indice.immagini.some((v) => v.file === mini.corpo.file), 'la copia non è una voce della galleria');
});

test('un’immagine copiata a mano nella cartella compare lo stesso, con il nome del file', async () => {
  writeFileSync(join(c.galleria, 'il_barone.png'), PNG);
  const { corpo } = await api('', {});
  const v = corpo.immagini.find((x) => x.file === 'il_barone.png');
  assert.ok(v, 'c’è anche senza passare dall’app');
  assert.equal(v.nome, 'Il barone');
  assert.equal(v.categoria, null);
  // nome e categoria si cambiano
  const put = await api(`/voce/${v.file}`, { method: 'PUT', body: JSON.stringify({ nome: 'Il Barone Rosso', categoria: 'PNG' }), headers: { 'Content-Type': 'application/json' } });
  assert.equal(put.stato, 200);
  const dopo = put.corpo.immagini.find((x) => x.file === v.file);
  assert.deepEqual([dopo.nome, dopo.categoria], ['Il Barone Rosso', 'PNG']);
});

test('«Mostra ai giocatori», sostituzione e «Nascondi a tutti»', async () => {
  const uno = (await carica('Scena uno')).corpo.file;
  const due = (await carica('Scena due')).corpo.file;
  const m = await api('/mostra', { method: 'POST', body: JSON.stringify({ file: uno }), headers: { 'Content-Type': 'application/json' } });
  assert.equal(m.stato, 200);
  assert.equal(m.corpo.mostrata.file, uno);
  // i giocatori vedono solo l'immagine mostrata e quelle già mostrate
  let g = (await api('/giocatori', {})).corpo;
  assert.equal(g.mostrata.nome, 'Scena uno');
  assert.deepEqual(g.immagini.map((x) => x.nome), ['Scena uno']);
  // mostrarne un'altra sostituisce la precedente
  await api('/mostra', { method: 'POST', body: JSON.stringify({ file: due }), headers: { 'Content-Type': 'application/json' } });
  g = (await api('/giocatori', {})).corpo;
  assert.equal(g.mostrata.nome, 'Scena due');
  assert.deepEqual(g.immagini.map((x) => x.nome), ['Scena due', 'Scena uno'], 'la più recente in cima');
  // «Nascondi a tutti»: niente sugli schermi, ma la galleria dei giocatori resta
  const n = await api('/mostra', { method: 'DELETE' });
  assert.equal(n.corpo.mostrata, null);
  g = (await api('/giocatori', {})).corpo;
  assert.equal(g.mostrata, null);
  assert.equal(g.immagini.length, 2);
  // un file che non c'è non si mostra
  assert.equal((await api('/mostra', { method: 'POST', body: JSON.stringify({ file: 'niente.jpg' }), headers: { 'Content-Type': 'application/json' } })).stato, 404);
  assert.equal((await api('/mostra', { method: 'POST', body: JSON.stringify({ file: '../fuori.jpg' }), headers: { 'Content-Type': 'application/json' } })).stato, 400);
});

test('«Togli dalla galleria dei giocatori»: resta al master, sparisce ai giocatori', async () => {
  const g0 = (await api('/giocatori', {})).corpo;
  const una = g0.immagini[0].file;
  const r = await api(`/voce/${una}`, { method: 'PUT', body: JSON.stringify({ daiGiocatori: false }), headers: { 'Content-Type': 'application/json' } });
  assert.equal(r.stato, 200);
  const g = (await api('/giocatori', {})).corpo;
  assert.ok(!g.immagini.some((x) => x.file === una), 'non è più nella galleria dei giocatori');
  assert.ok(r.corpo.immagini.some((x) => x.file === una), 'ma è ancora in quella del master');
});

test('«Elimina»: via il file, le copie e la scheda', async () => {
  const file = (await carica('Da cancellare')).corpo.file;
  await carica('Da cancellare', GIF, `&variante=ridotta&di=${encodeURIComponent(file)}`);
  const ridotta = file.replace(/\.png$/, '-ridotta.gif');
  assert.ok(existsSync(join(c.galleria, ridotta)));
  const d = await api(`/voce/${file}`, { method: 'DELETE' });
  assert.equal(d.stato, 200);
  assert.ok(!d.corpo.immagini.some((x) => x.file === file));
  assert.ok(!existsSync(join(c.galleria, file)) && !existsSync(join(c.galleria, ridotta)), 'file e copia cancellati');
});

test('l’indice sta in galleria/galleria.json e si rifà da solo se lo si cancella', async () => {
  const dove = join(c.galleria, 'galleria.json');
  assert.ok(existsSync(dove));
  assert.ok(JSON.parse(readFileSync(dove, 'utf8')).immagini.length > 0);
  rmSync(dove);
  const { corpo } = await api('', {});
  assert.ok(corpo.immagini.length > 0, 'le immagini restano: le schede ripartono dai nomi dei file');
  assert.equal(corpo.mostrata, null);
});

test('gli schermi collegati ricevono l’evento «galleria» (anche i tablet con la scheda aperta)', async () => {
  const file = (await carica('In diretta')).corpo.file;
  const ac = new AbortController();
  const flusso = await fetch(`${base}/api/tablet/eventi?pg=Akira`, { signal: ac.signal });
  const lettore = flusso.body.getReader();
  const eventi = [];
  const leggi = (async () => {
    const dec = new TextDecoder();
    let buf = '';
    while (eventi.length < 1) {
      const { value, done } = await lettore.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      for (const blocco of buf.split('\n\n')) if (blocco.startsWith('event: galleria')) eventi.push(JSON.parse(blocco.split('data: ')[1]));
      buf = buf.slice(buf.lastIndexOf('\n\n') + 2);
    }
  })();
  await new Promise((ok) => setTimeout(ok, 50));
  await api('/mostra', { method: 'POST', body: JSON.stringify({ file }), headers: { 'Content-Type': 'application/json' } });
  await Promise.race([leggi, new Promise((ok) => setTimeout(ok, 2000))]);
  ac.abort();
  assert.equal(eventi[0]?.nome, 'In diretta', 'la scheda sul tablet riceve l’immagine da mostrare');
});
