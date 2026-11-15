import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 200 (15/11/2026), parte D: **un esemplare unico non diventa due, nel punto in cui il record si scrive.**
//
// Nell'istantanea del 14/11/2026 la Neverlost è doppia: due record creati a quindici secondi uno dall'altro, uno
// del gruppo con tutto a posto e uno di Pablo vuoto. La A.240 dice che un profilo `esemplare_unico` è quello di
// una nave sola, e la regola c'era — ma solo in `profiliCreabili`, cioè nell'**elenco** di quello che si può
// creare. Una pagina aperta prima della prima creazione ha ancora il profilo nel suo elenco, e la seconda
// creazione passa. È la stessa forma del difetto delle parti A e B di questo lotto: una regola applicata dove si
// guarda e non dove conta.
//
// **Il controllo che deve restare verde:** il secondo record di un profilo unico riceve 409 dal server.
// **E quello che non deve diventare rigido:** un record che c'è già si continua a salvare, altrimenti un doppione
// esistente non si potrebbe più correggere — e quello di troppo lo cancella il Direttore, non noi.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { erroreEsemplareUnico, profiliCreabili } from '../src/veicoli.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const radice = mkdtempSync(join(tmpdir(), 'mutant-unico-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(radice, k)]));
let srv, base;

const PROFILO_UNICO = 'neverlost';
const PROFILO_NORMALE = 'asa-scout-mk4';

const record = (id, profilo, nome) => ({
  formato: 'mutant-veicolo', versione: 1, id, revisione: 0, aggiornato: '2026-11-14T19:00:00.000Z',
  proprietario: { tipo: 'gruppo' }, conducente: null, mitragliere: null,
  mezzo: { uid: id, profilo, nome, andatura: 'fermo', pi: {}, rinforzi: {}, munizioni: [], avarie: '' }, movimento: null,
});
const metti = (r) => fetch(`${base}/api/veicoli/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) });

before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  srv = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe, px: c.px, eMaster: () => true });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${srv.address().port}`;
});
after(async () => {
  await new Promise((ok) => srv.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

test('la Neverlost è un esemplare unico nei dati, e il profilo esiste', () => {
  const p = (dati.veicoli?.profili ?? []).find((x) => x.id === PROFILO_UNICO);
  assert.ok(p, 'il profilo della Neverlost non è nei dati: il test non proverebbe niente');
  assert.equal(p.esemplare_unico, true);
  assert.ok((dati.veicoli?.profili ?? []).some((x) => x.id === PROFILO_NORMALE && x.esemplare_unico !== true));
});

test('il secondo record di un esemplare unico riceve 409, e dice quale c’è già', async () => {
  const primo = await metti(record('veiunico0001', PROFILO_UNICO, 'Neverlost'));
  assert.equal(primo.status, 200, 'il primo deve passare');

  const secondo = await metti(record('veiunico0002', PROFILO_UNICO, 'Neverlost'));
  assert.equal(secondo.status, 409, 'il secondo è passato: è il doppione del 14/11');
  const corpo = await secondo.json();
  assert.match(corpo.errore, /esemplare unico/i);
  assert.match(corpo.errore, /A\.240/);
  assert.deepEqual(corpo.gia, ['veiunico0001'], 'dice quale record c’è già, altrimenti il Direttore non sa quale aprire');
  assert.deepEqual(readdirSync(c.veicoli).sort(), ['veiunico0001.json'], 'il file del secondo è stato scritto comunque');
});

test('un profilo che non è unico si crea quante volte si vuole', async () => {
  assert.equal((await metti(record('veinorm00001', PROFILO_NORMALE, 'FIAT LUX'))).status, 200);
  assert.equal((await metti(record('veinorm00002', PROFILO_NORMALE, 'un altro Scout'))).status, 200);
});

test('un record che c’è già si continua a salvare: un doppione esistente si deve poter correggere', async () => {
  // si scrive un secondo Neverlost di nascosto, come quello vero del 14/11, e poi si salva: deve passare
  const { writeFileSync } = await import('node:fs');
  const gemello = { ...record('veiunico0003', PROFILO_UNICO, 'Neverlost'), revisione: 1 };
  writeFileSync(join(c.veicoli, 'veiunico0003.json'), `${JSON.stringify(gemello, null, 2)}\n`);
  const salva = await metti(gemello);
  assert.equal(salva.status, 200, 'un record già scritto non si salva più: un doppione diventerebbe incorreggibile');
});

// --- la funzione pura, senza server -----------------------------------------------------------------------

test('erroreEsemplareUnico: null quando si può scrivere, il motivo quando no', () => {
  const uno = record('veiaaa000001', PROFILO_UNICO, 'Neverlost');
  const due = record('veibbb000002', PROFILO_UNICO, 'Neverlost');
  assert.equal(erroreEsemplareUnico(uno, [], dati), null);
  assert.equal(erroreEsemplareUnico(uno, [uno], dati), null, 'se stesso non è un doppione: il record si risalva');
  assert.ok(erroreEsemplareUnico(due, [uno], dati));
  assert.equal(erroreEsemplareUnico(record('veiccc000003', PROFILO_NORMALE, 'Scout'), [record('veiddd000004', PROFILO_NORMALE, 'Scout')], dati), null);
  // un profilo che non c'è, o un record senza mezzo, non fanno saltare niente
  assert.equal(erroreEsemplareUnico({ id: 'x', mezzo: { profilo: 'non-esiste' } }, [], dati), null);
  assert.equal(erroreEsemplareUnico({ id: 'x' }, [], dati), null);
});

test('la regola nell’elenco resta: la A.240 vale in entrambi i posti, non in uno solo', () => {
  const conLaNave = profiliCreabili(dati, [{ profilo: PROFILO_UNICO }]);
  assert.ok(!conLaNave.some((p) => p.id === PROFILO_UNICO), 'tolta dall’elenco quando c’è già');
  assert.ok(profiliCreabili(dati, []).some((p) => p.id === PROFILO_UNICO), 'offerta quando non c’è');
});
