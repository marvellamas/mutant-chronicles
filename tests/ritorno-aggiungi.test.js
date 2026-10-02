// Due ritocchi della plancia (Tavolo del Master): «← Torna al tavolo» nella scheda aperta dalla plancia
// (src/ui/ritorno.js, sessionStorage: resiste a F5) e «Aggiungi PG al tavolo» (src/tavolo.js → pgDaAggiungere,
// server.mjs con X-Mutant-Nuovo: non sovrascrive mai).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { segnaDalTavolo, arrivoDalTavolo, tornaAlTavolo, scorrimentoDaRimettere, dimenticaTavolo } from '../src/ui/ritorno.js';
import { pgDaAggiungere } from '../src/tavolo.js';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
/** Lo storage della scheda del browser: un ricaricamento (F5) rilegge lo stesso. */
const storage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const esempio = (f) => readFileSync(new URL(`../esempi/${f}`, import.meta.url), 'utf8');
const RHEA = 'Rhea-Valdis_liv5_2026-10-02.json';

test('«Torna al tavolo»: solo per la scheda aperta dalla plancia; resiste a F5; la pagina iniziale lo toglie', () => {
  const s = storage();
  // aperta dalla pagina iniziale: nessun segno, nessun pulsante
  assert.equal(arrivoDalTavolo(s, 'p1'), false);
  // aperta dalla plancia
  segnaDalTavolo(s, 'p1', 640);
  assert.equal(arrivoDalTavolo(s, 'p1'), true);
  assert.equal(arrivoDalTavolo(s, 'p2'), false); // un altro personaggio no
  // F5: lo storage della scheda del browser resta, il pulsante anche
  assert.equal(arrivoDalTavolo(s, 'p1'), true);
  // il ritorno rimette lo scorrimento una volta sola
  assert.equal(scorrimentoDaRimettere(s), null);
  tornaAlTavolo(s);
  assert.equal(scorrimentoDaRimettere(s), 640);
  assert.equal(scorrimentoDaRimettere(s), null);
  // passando dalla pagina iniziale il segno sparisce
  dimenticaTavolo(s);
  assert.equal(arrivoDalTavolo(s, 'p1'), false);
  // senza storage (navigazione privata con permessi negati): niente pulsante, nessun errore
  const rotto = { getItem: () => { throw new Error('negato'); }, setItem: () => { throw new Error('negato'); }, removeItem: () => {} };
  segnaDalTavolo(rotto, 'p1');
  assert.equal(arrivoDalTavolo(rotto, 'p1'), false);
});

test('«Torna al tavolo» è cablato: la plancia segna, la pagina iniziale dimentica, la barra della scheda mostra il pulsante', () => {
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.match(app, /apri: \(r\) => apriDaCartella\(r, \{ dalTavolo: true \}\)/);
  assert.match(app, /if \(dalTavolo\) segnaDalTavolo\(sessionStorage, id, window\.scrollY\)/);
  assert.match(app, /dimenticaTavolo\(sessionStorage\);\s+return renderHome\(\);/);
  assert.match(app, /tornaAlTavolo: arrivoDalTavolo\(sessionStorage, stato\.id\) \?/);
  const tab = readFileSync(new URL('../src/ui/tab.js', import.meta.url), 'utf8');
  assert.match(tab, /ctx\.tornaAlTavolo \? h\('button', \{ type: 'button', class: 'btn btn-torna-tavolo'.*'← Torna al tavolo'\) : null/);
});

test('pgDaAggiungere: nome dell’export tenuto, nome diverso rinominato, file non valido rifiutato', () => {
  const testo = esempio(RHEA);
  const ok = pgDaAggiungere(RHEA, testo, dati);
  assert.deepEqual([ok.file, ok.rinominato, ok.testo === testo, ok.livello], [RHEA, false, true, 5]);
  // download doppio del browser, «(2)»: rinominato dal nome e dal livello nel JSON, con la data di oggi
  const oggi = new Date(2026, 9, 3);
  const dl = pgDaAggiungere('Rhea-Valdis_liv5_2026-10-02 (2).json', testo, dati, oggi);
  assert.deepEqual([dl.file, dl.rinominato], ['Rhea-Valdis_liv5_2026-10-03.json', true]);
  assert.equal(pgDaAggiungere('scheda rhea.json', testo, dati, oggi).file, 'Rhea-Valdis_liv5_2026-10-03.json');
  // un file con il nome di un altro personaggio: rinominato con il nome giusto
  assert.equal(pgDaAggiungere('Nadia-Ferro_liv4_2026-10-02.json', testo, dati, oggi).file, 'Rhea-Valdis_liv5_2026-10-03.json');
  // non validi: nessun file da scrivere
  assert.match(pgDaAggiungere('x.json', '{ non è JSON', dati).errore, /non è un JSON valido/);
  assert.match(pgDaAggiungere('x.json', JSON.stringify({ formato: 'mutant-scontro' }), dati).errore, /Formato "mutant-scontro" sconosciuto/);
  assert.match(pgDaAggiungere('x.json', JSON.stringify({ formato: 'mutant-personaggio', versione: 8, scelte: { nome: ' ' } }), dati).errore, /non ha un nome/);
});

const cartelle = ['personaggi', 'nemici', 'tavolo', 'scontri'].map((x) => mkdtempSync(join(tmpdir(), `mutant-aggiungi-${x}-`)));
const [cPersonaggi, cNemici, cTavolo, cScontri] = cartelle;
let server;
let base;
before(async () => {
  server = creaServer({ cartella: cPersonaggi, nemici: cNemici, tavolo: cTavolo, scontri: cScontri });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); for (const d of cartelle) rmSync(d, { recursive: true, force: true }); });

test('server: con X-Mutant-Nuovo scrive solo un file nuovo, un doppione è saltato e il file resta com’era', async () => {
  const url = (f) => `${base}/api/personaggi/${encodeURIComponent(f)}`;
  const nuovo = { 'Content-Type': 'application/json', 'X-Mutant-Nuovo': '1' };
  writeFileSync(join(cPersonaggi, RHEA), 'IL FILE DEL MASTER');
  const doppione = await fetch(url(RHEA), { method: 'PUT', body: esempio(RHEA), headers: nuovo });
  assert.equal(doppione.status, 409);
  assert.equal((await doppione.json()).esiste, true);
  assert.equal(readFileSync(join(cPersonaggi, RHEA), 'utf8'), 'IL FILE DEL MASTER');
  const NADIA = 'Nadia-Ferro_liv4_2026-10-02.json';
  assert.equal((await fetch(url(NADIA), { method: 'PUT', body: esempio(NADIA), headers: nuovo })).status, 200);
  assert.deepEqual(readdirSync(cPersonaggi).sort(), [NADIA, RHEA]);
  // un file non valido non si scrive nemmeno così
  assert.equal((await fetch(url('Zed_liv1_2026-10-02.json'), { method: 'PUT', body: '{"formato":"altro"}', headers: nuovo })).status, 400);
});
