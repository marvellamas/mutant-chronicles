// Cartella dei personaggi (branch tavolo-direttore, pezzo 0a): server.mjs e src/cartella.js. Il server
// serve l'app come `serve` e salva in personaggi/ il testo dell'export, byte per byte.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer, NOME_FILE } from '../server.mjs';
import { chiaveDaFile, chiavePersonaggio, ultimiPerPersonaggio, confronta, elencoUnito } from '../src/cartella.js';
import { deserializzaPersonaggio, normalizza, serializza, nomeFileEsportazione } from '../src/character.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const cartella = mkdtempSync(join(tmpdir(), 'mutant-personaggi-'));
let server;
let base;
before(async () => {
  server = creaServer({ cartella });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); rmSync(cartella, { recursive: true, force: true }); });

test('server: ping, file dell’app con gli header di serve.json, niente uscite dalla cartella', async () => {
  const ping = await (await fetch(`${base}/api/ping`)).json();
  assert.deepEqual(ping, { ok: true, app: 'mutant', cartella: 'personaggi' });
  const indice = await fetch(`${base}/`);
  assert.equal(indice.status, 200);
  assert.equal(indice.headers.get('cache-control'), 'no-cache');
  assert.match(indice.headers.get('content-type'), /text\/html/);
  const modulo = await fetch(`${base}/src/calc.js`);
  assert.equal(modulo.headers.get('cache-control'), 'no-cache');
  assert.match(modulo.headers.get('content-type'), /javascript/);
  const immagine = await fetch(`${base}/img/immagini.json`);
  assert.equal(immagine.status, 200);
  // fetch normalizza «..»; la barra rovesciata codificata arriva al server: non deve uscire dal progetto
  for (const p of ['/..%5C..%5Cwindows%5Cwin.ini', '/src/..%5C..%5C..%5Cpackage.json', '/.gitignore', '/personaggi/LEGGIMI.txt', '/node_modules/.package-lock.json']) {
    assert.equal((await fetch(`${base}${p}`)).status, 404, p);
  }
});

test('salvataggio e ricaricamento via server: identici byte per byte all’export', async () => {
  const testo = readFileSync(new URL('collaudo/c_freelance_tecnico_l5.json', import.meta.url), 'utf8');
  // il testo è quello dell'export dell'app (tests/collaudo.test.js lo verifica): si rifà qui
  const p = deserializzaPersonaggio(testo);
  const { scelte } = normalizza(p.creazione, dati);
  const esportato = serializza(scelte, { versioniDati: JSON.parse(testo).versioni_dati, livelli: p.livelli, sessione: p.sessione });
  assert.equal(esportato, testo);
  const file = nomeFileEsportazione(scelte.nome, 1 + p.livelli.length, new Date(2026, 9, 1));
  const w = await fetch(`${base}/api/personaggi/${encodeURIComponent(file)}`, { method: 'PUT', body: esportato });
  assert.equal(w.status, 200);
  const r = await w.json();
  assert.equal(r.file, file);
  assert.ok(r.mtime > 0);
  // sul disco e in lettura, lo stesso testo
  assert.equal(readFileSync(join(cartella, file), 'utf8'), esportato);
  const letto = await (await fetch(`${base}/api/personaggi/${encodeURIComponent(file)}`)).text();
  assert.equal(letto, esportato);
  // ricaricato e riesportato: identico
  const q = deserializzaPersonaggio(letto);
  assert.equal(serializza(normalizza(q.creazione, dati).scelte, { versioniDati: JSON.parse(letto).versioni_dati, livelli: q.livelli, sessione: q.sessione }), testo);
  // l'elenco lo mostra, con nome, livello e data dal nome del file
  const lista = await (await fetch(`${base}/api/personaggi`)).json();
  assert.deepEqual(lista.map((x) => [x.file, x.nome, x.livello, x.data]), [[file, chiaveDaFile(file), 5, '2026-10-01']]);
  // nessun file temporaneo rimasto
  assert.deepEqual(readdirSync(cartella), [file]);
});

test('server: nomi e contenuti non ammessi; nessuna cancellazione', async () => {
  const put = (nome, corpo = '{"formato":"mutant-personaggio"}') => fetch(`${base}/api/personaggi/${encodeURIComponent(nome)}`, { method: 'PUT', body: corpo });
  assert.equal((await put('note.json')).status, 400);
  assert.equal((await put('..\\..\\x_liv1_2026-10-01.json')).status, 400);
  assert.equal((await put('../x_liv1_2026-10-01.json')).status, 400);
  assert.equal((await put('Ada_liv1_2026-10-01.json', '{"formato":"altro"}')).status, 400);
  assert.equal((await put('Ada_liv1_2026-10-01.json', 'non json')).status, 400);
  assert.equal((await fetch(`${base}/api/personaggi/Ada_liv1_2026-10-01.json`, { method: 'DELETE' })).status, 405);
  assert.ok(NOME_FILE.test('Élodie-D’Arco_liv12_2026-10-01.json'));
  assert.ok(!NOME_FILE.test('a b_liv1_2026-10-01.json'));
});

test('stesso personaggio = stesso nome del file; per ogni nome il file più recente', () => {
  assert.equal(chiavePersonaggio('Lucas'), 'Lucas');
  assert.equal(chiavePersonaggio('  Dex  Moreau '), 'Dex-Moreau');
  assert.equal(chiavePersonaggio(''), 'personaggio');
  assert.equal(chiaveDaFile('Dex-Moreau_liv5_2026-10-01.json'), 'Dex-Moreau');
  const u = ultimiPerPersonaggio([
    { file: 'Lucas_liv6_2026-09-28.json', mtime: 100 }, { file: 'Lucas_liv6_2026-10-01.json', mtime: 300 }, { file: 'Ada_liv1_2026-10-01.json', mtime: 200 },
  ]);
  assert.deepEqual([...u].map(([k, v]) => [k, v.file]), [['Lucas', 'Lucas_liv6_2026-10-01.json'], ['Ada', 'Ada_liv1_2026-10-01.json']]);
});

test('conflitti: vince il più recente; una sola copia cambiata vince quella', () => {
  const t = (s) => new Date(Date.UTC(2026, 9, 1, 12, 0, s)).toISOString();
  const ms = (s) => Date.parse(t(s));
  const sinc = { file: 'Ada_liv1_2026-10-01.json', mtime: ms(0), salvato: t(0) };
  // nessuna modifica
  assert.deepEqual(confronta({ aggiornato: t(0), cartella: sinc }, { file: sinc.file, mtime: ms(0) }), { azione: 'niente', conflitto: false });
  // cambiato solo il browser → si scrive; cambiata solo la cartella → si legge
  assert.deepEqual(confronta({ aggiornato: t(30), cartella: sinc }, { file: sinc.file, mtime: ms(0) }), { azione: 'scrivi', conflitto: false });
  assert.deepEqual(confronta({ aggiornato: t(0), cartella: sinc }, { file: sinc.file, mtime: ms(30) }), { azione: 'leggi', conflitto: false });
  // cambiati entrambi: il più recente, con il conflitto da segnalare
  assert.deepEqual(confronta({ aggiornato: t(40), cartella: sinc }, { file: sinc.file, mtime: ms(30) }), { azione: 'scrivi', conflitto: true });
  assert.deepEqual(confronta({ aggiornato: t(30), cartella: sinc }, { file: 'Ada_liv2_2026-10-02.json', mtime: ms(50) }), { azione: 'leggi', conflitto: true });
  // mai sincronizzato: vince il più recente
  assert.equal(confronta({ aggiornato: t(10) }, { file: sinc.file, mtime: ms(50) }).azione, 'leggi');
  assert.equal(confronta({ aggiornato: t(50) }, { file: sinc.file, mtime: ms(10) }).azione, 'scrivi');
});

test('elenco della pagina iniziale: origine browser, cartella o entrambi; senza server come oggi', () => {
  const locali = [{ id: 'a', scelte: { nome: 'Lucas' } }, { id: 'b', scelte: { nome: 'Ada' } }, { id: 'c', scelte: { nome: 'Lucas' } }];
  assert.deepEqual(elencoUnito(locali, null).map((r) => [r.voce.id, r.origine]), [['a', 'browser'], ['b', 'browser'], ['c', 'browser']]);
  const remoti = [{ file: 'Lucas_liv6_2026-10-01.json', mtime: 1 }, { file: 'Bea_liv2_2026-10-01.json', mtime: 2 }];
  assert.deepEqual(elencoUnito(locali, remoti).map((r) => [r.voce?.id ?? r.remoto.file, r.origine]), [
    ['a', 'entrambi'], ['b', 'browser'], ['c', 'browser'], ['Bea_liv2_2026-10-01.json', 'cartella'],
  ]);
});
