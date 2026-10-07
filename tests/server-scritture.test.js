// Scritture dei file dei dati nel server (errore del test di Marcello del 07/10/2026 su Windows: «EPERM: operation not
// permitted, rename …scontro-….json.tmp-… -> …scontro-….json» dopo un Attacco di Opportunità): scritture in coda per
// file (nessuna persa, revisioni giuste, nessun 409 spurio), rinomina ritentata sugli errori di file occupato, nessun
// temporaneo orfano, e il client che ritenta (src/ui/immagine-nemico.js → aggiornaInScontri). Cartelle temporanee e
// porta casuale.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer, operazioniFile, RIPROVA_RENAME, inCoda } from '../server.mjs';
import { nuovoScontro, rigaMovimentoLibero } from '../src/scontro.js';
import { aggiornaInScontri } from '../src/ui/immagine-nemico.js';

const radice = mkdtempSync(join(tmpdir(), 'mutant-scritture-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe'].map((k) => [k, join(radice, k)]));
let server, base;
const renameVero = operazioniFile.rename;
const attesaVera = RIPROVA_RENAME.attesa_ms;
const fetchVero = globalThis.fetch;

before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  RIPROVA_RENAME.attesa_ms = 1; // prove veloci
  server = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
  // il client usa indirizzi relativi alla pagina («api/…»): qui si completano con quello del server
  globalThis.fetch = (url, o) => fetchVero(/^https?:/.test(url) ? url : `${base}/${url}`, o);
});
after(async () => {
  globalThis.fetch = fetchVero;
  operazioniFile.rename = renameVero;
  RIPROVA_RENAME.attesa_ms = attesaVera;
  await new Promise((ok) => server.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

function nuovoFile(id) {
  const s = nuovoScontro({ id, nome: 'Prova', pg: [{ chiave: 'Akira', nome: 'Akira', iniziativa: 9, des: 7, int: 5 }] });
  writeFileSync(join(c.scontri, `${id}.json`), JSON.stringify({ ...s, revisione: 1 }));
}
const leggi = (id) => JSON.parse(readFileSync(join(c.scontri, `${id}.json`), 'utf8'));
const temporanei = () => readdirSync(c.scontri).filter((f) => f.includes('.tmp-'));
const metti = (id, corpo) => fetchVero(`${base}/api/scontri/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
const riga = (n) => (s) => rigaMovimentoLibero(s, `PG ${n}`, [0, 0], [n, 0], new Date(2026, 9, 7, 12, 0, n));

test('venti righe del registro scritte insieme sullo stesso scontro: nessuna persa, revisione 21', async () => {
  nuovoFile('scontro-coda');
  const prima = leggi('scontro-coda').registro?.length ?? 0;
  await Promise.all(Array.from({ length: 20 }, (_, n) => aggiornaInScontri('scontro-coda', riga(n))));
  const s = leggi('scontro-coda');
  assert.equal(s.revisione, 21);
  assert.equal(s.registro.length, prima + 20);
  for (let n = 0; n < 20; n++) assert.ok(s.registro.some((r) => r.testo.includes(`PG ${n}`)), `riga ${n}`);
  assert.deepEqual(temporanei(), []);
});

test('due PUT con la stessa revisione: una passa, l\'altra riceve 409 (non si sovrappongono); in fila passano tutte', async () => {
  nuovoFile('scontro-pari');
  const s = leggi('scontro-pari');
  const [a, b] = await Promise.all([metti('scontro-pari', riga(1)(s)), metti('scontro-pari', riga(2)(s))]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  assert.equal(leggi('scontro-pari').revisione, 2);
  // nessun 409 spurio: chi usa la revisione giusta, una dopo l'altra, passa sempre
  for (let i = 0; i < 5; i++) assert.equal((await metti('scontro-pari', riga(10 + i)(leggi('scontro-pari')))).status, 200);
  assert.equal(leggi('scontro-pari').revisione, 7);
});

test('rename che fallisce due volte con EPERM e poi riesce: scritto, nessun temporaneo', async () => {
  nuovoFile('scontro-eperm');
  let falliti = 0;
  operazioniFile.rename = async (da, a) => {
    if (falliti < 2) { falliti++; throw Object.assign(new Error('EPERM: operation not permitted, rename'), { code: 'EPERM' }); }
    return renameVero(da, a);
  };
  try {
    const r = await metti('scontro-eperm', riga(1)(leggi('scontro-eperm')));
    assert.equal(r.status, 200);
    assert.equal(falliti, 2);
    assert.equal(leggi('scontro-eperm').revisione, 2);
    assert.deepEqual(temporanei(), []);
  } finally { operazioniFile.rename = renameVero; }
});

test('rename sempre occupato: errore come prima, file intatto e nessun temporaneo; un errore diverso non si ritenta', async () => {
  nuovoFile('scontro-occupato');
  let tentativi = 0;
  operazioniFile.rename = async () => { tentativi++; throw Object.assign(new Error('EBUSY: resource busy'), { code: 'EBUSY' }); };
  try {
    const r = await metti('scontro-occupato', riga(1)(leggi('scontro-occupato')));
    assert.equal(r.status, 500);
    assert.match((await r.json()).errore, /EBUSY/);
    assert.equal(tentativi, RIPROVA_RENAME.tentativi);
    assert.equal(leggi('scontro-occupato').revisione, 1, 'il file non è cambiato');
    assert.deepEqual(temporanei(), []);
    tentativi = 0;
    operazioniFile.rename = async () => { tentativi++; throw Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' }); };
    assert.equal((await metti('scontro-occupato', riga(1)(leggi('scontro-occupato')))).status, 500);
    assert.equal(tentativi, 1);
    assert.deepEqual(temporanei(), []);
  } finally { operazioniFile.rename = renameVero; }
});

test('il client ritenta dopo un errore del server: la riga del registro non si perde; se non basta, l\'errore lo dice', async () => {
  nuovoFile('scontro-client');
  // la prima richiesta trova il file occupato oltre tutti i tentativi del server (500), la seconda passa
  let n = 0;
  operazioniFile.rename = async (da, a) => {
    if (n++ < RIPROVA_RENAME.tentativi) throw Object.assign(new Error('EPERM'), { code: 'EPERM' });
    return renameVero(da, a);
  };
  try {
    const s = await aggiornaInScontri('scontro-client', riga(7), { attese: [1, 1, 1] });
    assert.equal(s.revisione, 2);
    assert.ok(leggi('scontro-client').registro.some((r) => r.testo.includes('PG 7')));
    operazioniFile.rename = async () => { throw Object.assign(new Error('EPERM'), { code: 'EPERM' }); };
    await assert.rejects(aggiornaInScontri('scontro-client', riga(8), { attese: [1, 1] }), /EPERM.*ritentato 2 volte/);
    assert.deepEqual(temporanei(), []);
  } finally { operazioniFile.rename = renameVero; }
});

test('inCoda: i lavori sullo stesso file uno alla volta, nell\'ordine; un errore non blocca la coda', async () => {
  const ordine = [];
  let dentro = 0;
  const lavoro = (k, ms, rompi = false) => () => new Promise((ok, ko) => {
    dentro++;
    assert.equal(dentro, 1, 'mai due insieme');
    setTimeout(() => { dentro--; ordine.push(k); if (rompi) ko(new Error(k)); else ok(k); }, ms);
  });
  const esiti = await Promise.allSettled([inCoda('x', lavoro('a', 15)), inCoda('x', lavoro('b', 1, true)), inCoda('x', lavoro('c', 5))]);
  assert.deepEqual(ordine, ['a', 'b', 'c']);
  assert.deepEqual(esiti.map((e) => e.status), ['fulfilled', 'rejected', 'fulfilled']);
});

test('due finestre che scrivono insieme sullo stesso scontro: le righe di tutte e due arrivano', async () => {
  nuovoFile('scontro-finestre');
  const prima = leggi('scontro-finestre').registro?.length ?? 0;
  // l'altra finestra: venti scritture di fila, ognuna ritentata sui 409 come fa la plancia
  const altra = (async () => {
    for (let i = 0; i < 20; i++) {
      for (;;) { if ((await metti('scontro-finestre', riga(100 + i)(leggi('scontro-finestre')))).status === 200) break; }
    }
  })();
  await Promise.all([altra, ...Array.from({ length: 10 }, (_, n) => aggiornaInScontri('scontro-finestre', riga(n)))]);
  const s = leggi('scontro-finestre');
  assert.equal(s.registro.length, prima + 30);
  assert.equal(s.revisione, 31);
  assert.deepEqual(temporanei(), []);
});
