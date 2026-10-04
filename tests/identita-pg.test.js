// Identità dei personaggi nella cartella del server (bug del 04/10/2026): un PG nuovo «LUCAS» creato mentre
// «Lucas» è al tavolo veniva preso per quello (conflitto «Il master ha aggiornato la tua scheda»). Ogni PG ha ora
// un identificativo «pg» nel file; la scheda lo riconosce da quello; il nome del file è unico per PG (suffisso);
// il server non scrive mai sopra un altro PG.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { fileDelPg, nomeFileLibero, nomiCheSiConfondono, formaNome, elencoUnito } from '../src/cartella.js';
import { controllaRemoto } from '../src/collegamento.js';
import { serializza, deserializzaPersonaggio, nuovoPg, isPg, normalizza } from '../src/character.js';
import { testoConSessione } from '../src/tavolo.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const PG_LUCAS = 'pg-aaaaaaaaaaaaaaaaaaaaaaaa';
const PG_NUOVO = 'pg-bbbbbbbbbbbbbbbbbbbbbbbb';

test('identificativo: nasce casuale, sta nel file, resta nelle riscritture della plancia', () => {
  const a = nuovoPg();
  assert.ok(isPg(a) && a !== nuovoPg());
  const esempio = readFileSync(new URL('../esempi/Torvald-Krane_liv6_2026-10-02.json', import.meta.url), 'utf8');
  const p = deserializzaPersonaggio(esempio);
  assert.equal(p.pg, null, 'i file di prima non lo hanno');
  const { scelte } = normalizza(p.creazione, dati);
  const conPg = serializza(scelte, { livelli: p.livelli, sessione: p.sessione, pg: a });
  assert.equal(deserializzaPersonaggio(conPg).pg, a);
  assert.equal(JSON.parse(testoConSessione(conPg, { pvAttuali: 3 }, dati)).pg, a, 'la plancia non lo perde');
  assert.equal(serializza(scelte, {}).includes('"pg"'), false, 'senza identificativo il file non cambia');
});

test('«Lucas» e «LUCAS», «Lucas» e «Lúcas»: il PG nuovo prende un nome di file con un suffisso', () => {
  assert.equal(formaNome('LUCAS'), formaNome('Lúcas'));
  const lista = [{ file: 'Lucas_liv6_2026-10-04.json', mtime: 100, pg: PG_LUCAS }];
  const nuovo = (nome) => ({ pg: PG_NUOVO, scelte: { nome } });
  assert.equal(nomeFileLibero(nuovo('LUCAS'), lista), 'LUCAS-2');
  assert.equal(nomeFileLibero(nuovo('Lúcas'), lista), 'Lúcas-2');
  assert.equal(nomeFileLibero(nuovo('Lu cas'), lista), 'Lu-cas-2', 'uno spazio in più non basta a distinguerli');
  assert.equal(nomeFileLibero(nuovo('Marco'), lista), 'Marco');
  // con un suffisso già preso, il successivo; il PG tiene poi il suo
  const due = [...lista, { file: 'LUCAS-2_liv1_2026-10-04.json', mtime: 200, pg: 'pg-cccccccccccccccccccccccc' }];
  assert.equal(nomeFileLibero(nuovo('LUCAS'), due), 'LUCAS-3');
  const mio = [...lista, { file: 'LUCAS-2_liv1_2026-10-04.json', mtime: 200, pg: PG_NUOVO }];
  assert.equal(nomeFileLibero(nuovo('LUCAS'), mio), 'LUCAS-2');
  // il PG di prima (senza identificativo, sincronizzato con il suo file) tiene il suo nome
  assert.equal(nomeFileLibero({ scelte: { nome: 'Lucas' }, cartella: { file: 'Lucas_liv5_2026-10-01.json' } }, [{ file: 'Lucas_liv5_2026-10-01.json', mtime: 5 }, { file: 'LUCAS_liv6_2026-10-04.json', mtime: 9 }]), 'Lucas');
});

test('PG nuovo creato con il server mentre l’altro è al tavolo: nessun conflitto, il file dell’altro non è suo', () => {
  // la plancia ha appena riscritto Lucas (più recente); il PG nuovo ha il suo file con il suffisso
  const lista = [
    { file: 'Lucas_liv6_2026-10-04.json', mtime: 9000, pg: PG_LUCAS },
    { file: 'LUCAS-2_liv1_2026-10-04.json', mtime: 5000, pg: PG_NUOVO },
  ];
  const voce = { pg: PG_NUOVO, scelte: { nome: 'LUCAS' }, aggiornato: 'B', cartella: { file: 'LUCAS-2_liv1_2026-10-04.json', mtime: 5000, salvato: 'A' } };
  assert.equal(fileDelPg(voce, lista).file, 'LUCAS-2_liv1_2026-10-04.json');
  assert.equal(controllaRemoto(voce, lista).azione, 'niente');
  // mai scritto: nessun file suo, mai quello di Lucas (né per nome, né a meno di maiuscole)
  const appenaNato = { pg: PG_NUOVO, scelte: { nome: 'Lucas' } };
  assert.equal(fileDelPg(appenaNato, lista.slice(0, 1)), null);
  assert.equal(controllaRemoto(appenaNato, lista.slice(0, 1)).azione, 'niente');
  // pagina iniziale: due righe, ciascuna col suo file
  const righe = elencoUnito([{ id: 'x', ...voce }], lista);
  assert.deepEqual(righe.map((r) => [r.voce?.id ?? null, r.origine, r.remoto?.file]), [['x', 'entrambi', 'LUCAS-2_liv1_2026-10-04.json'], [null, 'cartella', 'Lucas_liv6_2026-10-04.json']]);
});

test('PG di prima senza identificativo: si riconosce dal file come prima; la plancia segnala i nomi che si confondono', () => {
  const lista = [{ file: 'Lucas_liv6_2026-10-02.json', mtime: 1 }, { file: 'LUCAS_liv6_2026-10-04.json', mtime: 2 }];
  assert.equal(fileDelPg({ scelte: { nome: 'Lucas' } }, lista).file, 'Lucas_liv6_2026-10-02.json');
  assert.equal(fileDelPg({ scelte: { nome: 'Lucas' }, cartella: { file: 'LUCAS_liv6_2026-10-01.json' } }, lista).file, 'LUCAS_liv6_2026-10-04.json');
  // dopo la prima scrittura con l'identificativo, quello vale
  const scritto = [...lista, { file: 'Lucas_liv6_2026-10-05.json', mtime: 3, pg: PG_LUCAS }];
  assert.equal(fileDelPg({ pg: PG_LUCAS, scelte: { nome: 'Lucas' }, cartella: { file: 'Lucas_liv6_2026-10-02.json' } }, scritto).file, 'Lucas_liv6_2026-10-05.json');
  assert.deepEqual(nomiCheSiConfondono(lista), [{ nomi: ['LUCAS', 'Lucas'], motivo: 'nomi uguali a meno di maiuscole, accenti o spazi' }]);
  assert.deepEqual(nomiCheSiConfondono([{ file: 'Rhea_liv1_2026-10-01.json', mtime: 1 }]), []);
});

const cartella = mkdtempSync(join(tmpdir(), 'mutant-identita-'));
let server;
let base;
before(async () => {
  server = creaServer({ cartella });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); rmSync(cartella, { recursive: true, force: true }); });

const testo = (nome, pg) => JSON.stringify({ formato: 'mutant-personaggio', versione: 8, ...(pg ? { pg } : {}), scelte: { nome } }, null, 2);
const scrivi = (file, corpo) => fetch(`${base}/api/personaggi/${encodeURIComponent(file)}`, { method: 'PUT', body: corpo, headers: { 'Content-Type': 'application/json' } });

test('server: l’elenco riporta l’identificativo; rifiuta la scrittura sopra un altro personaggio', async () => {
  assert.equal((await scrivi('Lucas_liv6_2026-10-04.json', testo('Lucas', PG_LUCAS))).status, 200);
  const elenco = await (await fetch(`${base}/api/personaggi`)).json();
  assert.equal(elenco.find((f) => f.file === 'Lucas_liv6_2026-10-04.json').pg, PG_LUCAS);
  // stesso file, identificativo diverso: rifiutato, il file resta quello di Lucas
  const r = await scrivi('Lucas_liv6_2026-10-04.json', testo('Lucas', PG_NUOVO));
  assert.equal(r.status, 409);
  assert.match((await r.json()).errore, /il file Lucas_liv6_2026-10-04\.json contiene un altro personaggio \(Lucas\): non sovrascritto/);
  assert.equal(JSON.parse(readFileSync(join(cartella, 'Lucas_liv6_2026-10-04.json'), 'utf8')).pg, PG_LUCAS);
  // stesso nome a meno di maiuscole (su Windows è lo stesso file): rifiutato anche lui
  assert.equal((await scrivi('LUCAS_liv6_2026-10-04.json', testo('LUCAS', PG_NUOVO))).status, 409);
  // con il suffisso va bene; lo stesso PG riscrive il suo file
  assert.equal((await scrivi('LUCAS-2_liv6_2026-10-04.json', testo('LUCAS', PG_NUOVO))).status, 200);
  assert.equal((await scrivi('Lucas_liv6_2026-10-04.json', testo('Lucas', PG_LUCAS))).status, 200);
  assert.deepEqual(readdirSync(cartella).sort(), ['LUCAS-2_liv6_2026-10-04.json', 'Lucas_liv6_2026-10-04.json']);
});

test('server: un file di prima senza identificativo riceve quello del suo PG; un nome scritto diversamente no', async () => {
  writeFileSync(join(cartella, 'Rhea_liv5_2026-10-01.json'), testo('Rhea', null));
  assert.equal((await scrivi('Rhea_liv5_2026-10-01.json', testo('Rhea', PG_LUCAS.replace('a', 'd')))).status, 200);
  writeFileSync(join(cartella, 'Nadia_liv4_2026-10-01.json'), testo('Nadia', null));
  assert.equal((await scrivi('NADIA_liv4_2026-10-01.json', testo('NADIA', PG_NUOVO))).status, 409);
});
