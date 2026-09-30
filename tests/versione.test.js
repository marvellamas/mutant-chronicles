// Versione dell'app e cache-busting (docs/cache.md): src/versione.js (lettura e confronto) e
// tools/versione.mjs (impronta del contenuto, blocco dell'importmap in index.html).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { leggiVersione, serveAggiornamento, urlRicarica, testoVersione } from '../src/versione.js';
import { htmlSenzaVersione, htmlConVersione, improntaContenuto, elencaFile, calcola, stato } from '../tools/versione.mjs';

test('leggiVersione: versione.json valido o null', () => {
  assert.deepEqual(leggiVersione({ versione: '746c34f047', data: '2026-09-30 14:52' }), { versione: '746c34f047', data: '2026-09-30 14:52' });
  assert.deepEqual(leggiVersione({ versione: 'abcd' }), { versione: 'abcd', data: null });
  for (const x of [null, [], 'abc', {}, { versione: 12 }, { versione: 'ab' }, { versione: 'con spazi dentro' }]) assert.equal(leggiVersione(x), null);
});

test('serveAggiornamento: solo con due versioni note e diverse', () => {
  assert.equal(serveAggiornamento('aaaa1111', 'bbbb2222'), true);
  assert.equal(serveAggiornamento('aaaa1111', 'aaaa1111'), false);
  assert.equal(serveAggiornamento(null, 'bbbb2222'), false); // index.html senza meta: nessun avviso
  assert.equal(serveAggiornamento('aaaa1111', null), false); // versione.json non raggiungibile
});

test('urlRicarica: stessa pagina e stesso #indirizzo, con ?v= nuovo', () => {
  assert.equal(urlRicarica('http://localhost:3000/#/p/abc/t/poteri', 'bbbb2222'), '/?v=bbbb2222#/p/abc/t/poteri');
  assert.equal(urlRicarica('http://localhost:3000/?v=aaaa1111#/', 'bbbb2222'), '/?v=bbbb2222#/');
  assert.equal(urlRicarica('https://x.github.io/mutant-chronicles/index.html?v=a', 'b123'), '/mutant-chronicles/index.html?v=b123');
  assert.equal(testoVersione({ versione: 'b123', data: '2026-09-30 14:52' }), 'Versione b123 · 2026-09-30 14:52');
  assert.equal(testoVersione(null), '');
});

const HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <script type="module" src="src/ui/app.js"></script>
</body>
</html>
`;

test('index.html: blocco della versione e ?v= su stili e moduli; togliendoli si torna all’originale', () => {
  const con = htmlConVersione(HTML, 'abc1234567', ['src/ui/app.js', 'src/calc.js']);
  assert.match(con, /<meta name="mutant-versione" content="abc1234567">/);
  assert.match(con, /"\.\/src\/calc\.js": "\.\/src\/calc\.js\?v=abc1234567"/);
  assert.match(con, /href="css\/style\.css\?v=abc1234567"/);
  assert.match(con, /src="src\/ui\/app\.js\?v=abc1234567"/);
  // l'importmap sta nella <head>, prima di qualunque modulo
  assert.ok(con.indexOf('type="importmap"') < con.indexOf('type="module"'));
  assert.equal(htmlSenzaVersione(con), HTML);
  // rigenerare con un'altra versione non accumula blocchi né ?v=
  const due = htmlConVersione(con, 'def7654321', ['src/ui/app.js']);
  assert.equal((due.match(/versione:inizio/g) ?? []).length, 1);
  assert.doesNotMatch(due, /abc1234567/);
  assert.equal(htmlSenzaVersione(due), HTML);
});

test('impronta: cambia con il contenuto, non con i fine riga né con l’ordine dei file', () => {
  const a = improntaContenuto([['src/a.js', 'x\n'], ['data/b.json', '{}\n']]);
  assert.equal(a, improntaContenuto([['data/b.json', '{}\r\n'], ['src/a.js', 'x\r\n']]));
  assert.notEqual(a, improntaContenuto([['src/a.js', 'y\n'], ['data/b.json', '{}\n']]));
  assert.match(a, /^[0-9a-f]{10}$/);
});

test('repo: index.html mappa tutti i moduli di src/ e la versione è quella di versione.json', () => {
  const radice = new URL('..', import.meta.url);
  const moduli = elencaFile(fileURLToPath(radice), 'src', '.js');
  const html = readFileSync(new URL('index.html', radice), 'utf8');
  const meta = /<meta name="mutant-versione" content="([^"]+)">/.exec(html)?.[1];
  const file = JSON.parse(readFileSync(new URL('versione.json', radice), 'utf8'));
  assert.equal(meta, file.versione, 'esegui node tools/versione.mjs');
  for (const m of moduli) assert.ok(html.includes(`"./${m}": "./${m}?v=${meta}"`), `${m} manca nell'importmap: esegui node tools/versione.mjs`);
  assert.equal(typeof calcola().versione, 'string');
});

// come node tools/versione.mjs --controlla: fallisce se si è committato (o si sta testando) senza
// rigenerare dopo una modifica a src/, css/, data/, index.html o img/immagini.json. Di norma ci
// pensa l'hook pre-commit (node tools/installa-hook.mjs, una volta per PC).
test('repo: versione.json e index.html corrispondono al contenuto (tools/versione.mjs --controlla)', () => {
  const s = stato();
  assert.ok(s.aggiornato, `versione.json o index.html non aggiornati (impronta attuale ${s.versione}, in versione.json ${s.attuale?.versione}): esegui node tools/versione.mjs e committa i due file`);
});
