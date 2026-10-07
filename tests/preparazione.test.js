// «Prepara scontro» del Tavolo del Master (src/preparazione.js, server.mjs): bozze in scontri/ con stato «bozza»,
// ignorate dagli scontri aperti; duplicare ed eliminare (in scontri/archivio/); «Inizia» fa uno scontro vero con
// l'Iniziativa tirata per tutti e il Round 1. Server su cartelle temporanee e una porta qualsiasi.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { datiReali } from './helpers.js';
import { creaServer } from '../server.mjs';
import { validaScontro, ordineIniziativa, diTurno } from '../src/scontro.js';
import { profiloNemico, scelteCreatura } from '../src/crea-nemico.js';
import {
  nuovaBozza, validaBozza, aggiungiVoce, cambiaVoce, togliVoce, cambiaBozza, duplicaBozza, eliminaBozza, iniziaBozza, pgDellaBozza, STATO_BOZZA,
} from '../src/preparazione.js';

const { dati } = await datiReali();
const T0 = new Date(2026, 9, 3, 21, 30, 0);
const eretico = JSON.parse(readFileSync(new URL('../esempi/nemici/umani/eretico-veterano.json', import.meta.url), 'utf8'));
const scavafosse = profiloNemico(scelteCreatura('scavafosse', 'semplice', {}, dati), dati).nemico;
const lucas = { chiave: 'Lucas', nome: 'Lucas', iniziativa: 4, des: 7, int: 5 };

const bozzaDiProva = () => {
  let b = nuovaBozza({ nome: 'Imboscata al porto', adesso: T0 });
  b = aggiungiVoce(b, { nemico: eretico, quanti: 1, lato: 'avversario' }, T0);
  b = aggiungiVoce(b, { nemico: scavafosse, quanti: 2, lato: 'avversario', origine: 'creatura' }, T0);
  return cambiaBozza(b, { note: 'Dai condotti sotto il molo.', pg: ['Lucas'] }, T0);
};

test('bozza: nome, note, nemici con «Quanti» e lato, PG; validata; ritocchi solo nella bozza', () => {
  const b = bozzaDiProva();
  assert.equal(validaBozza(b), null);
  assert.equal(b.stato, STATO_BOZZA);
  assert.match(b.id, /^bozza-imboscata-al-porto-20261003-213000$/);
  assert.deepEqual(b.nemici.map((v) => [v.nemico.nome, v.quanti, v.lato]), [[eretico.nome, 1, 'avversario'], ['Scavafosse Semplice', 2, 'avversario']]);
  // ritocco: nome e PV di una voce, la scheda del bestiario non cambia
  const v = b.nemici[1];
  const r = cambiaVoce(b, v.uid, { nemico: { ...v.nemico, nome: 'Scavafosse del molo', pv: 40 }, quanti: 3 }, T0);
  assert.deepEqual([r.nemici[1].nemico.nome, r.nemici[1].nemico.pv, r.nemici[1].quanti, scavafosse.pv], ['Scavafosse del molo', 40, 3, 38]);
  assert.throws(() => cambiaVoce(b, v.uid, { quanti: 31 }), /da 1 a 30/);
  assert.equal(togliVoce(r, v.uid).nemici.length, 1);
  // nel validatore: stato, «Quanti», scheda
  assert.match(validaBozza({ ...b, nemici: [{ ...b.nemici[0], quanti: 0 }] }), /Quanti/);
  assert.match(validaBozza({ ...b, stato: 'aperto' }), /stato/);
  // uno scontro aperto non passa per una bozza, né il contrario
  assert.equal(validaScontro(b), 'stato non valido');
  // duplicare: id e revisione nuovi, voci con uid nuovi
  const c = duplicaBozza(b, new Date(2026, 9, 3, 22, 0, 0));
  assert.deepEqual([c.nome, c.revisione, c.nemici.length], ['Imboscata al porto (copia)', 0, 2]);
  assert.notEqual(c.id, b.id);
  assert.notEqual(c.nemici[0].uid, b.nemici[0].uid);
  // PG: quelli scelti, altrimenti quelli al tavolo
  assert.deepEqual(pgDellaBozza(b, [lucas, { chiave: 'Nadia', nome: 'Nadia' }]).map((p) => p.nome), ['Lucas']);
  assert.deepEqual(pgDellaBozza({ ...b, pg: [] }, [lucas]).map((p) => p.nome), ['Lucas']);
});

test('«Inizia»: scontro aperto con PG e nemici, Round 1, note e registro; l’Iniziativa NON si tira da sola (difetto del 07/10)', () => {
  const b = bozzaDiProva();
  const s = iniziaBozza(b, { id: 'scontro-prova', pg: [lucas], adesso: T0 });
  assert.equal(validaScontro(s), null);
  assert.deepEqual([s.stato, s.round, s.turno, s.nome, s.note], ['aperto', 1, 0, 'Imboscata al porto', 'Dai condotti sotto il molo.']);
  assert.deepEqual(s.partecipanti.map((p) => [p.nome, p.base, p.d10]), [
    ['Lucas', 4, null], [`${eretico.nome} 1`, eretico.iniziativa, null], ['Scavafosse Semplice 1', 5, null], ['Scavafosse Semplice 2', 5, null],
  ]);
  const { ordinati, daTirare } = ordineIniziativa(s);
  assert.deepEqual([ordinati.length, daTirare.length], [0, 4]);
  assert.equal(diTurno(s), null);
  assert.match(s.registro[1].testo, /^Dalla preparazione «Imboscata al porto».$/);
  assert.ok(!s.registro.some((r) => /Iniziativa di/.test(r.testo)), 'nessun tiro nel registro');
  // un tiro passato per errore non si usa
  const conTiro = iniziaBozza(b, { id: 'scontro-prova', pg: [lucas], dati, tiro: () => ({ valore: 7, origine: 'app' }), adesso: T0 });
  assert.ok(conTiro.partecipanti.every((p) => !p.d10));
  // una bozza vuota non parte
  assert.throws(() => iniziaBozza(nuovaBozza({ nome: 'x' }), { id: 's', pg: [] }), /non ha partecipanti/);
});

// --- server: bozze in scontri/ -------------------------------------------------------------------------------
const scontri = mkdtempSync(join(tmpdir(), 'mutant-bozze-'));
const cartella = mkdtempSync(join(tmpdir(), 'mutant-personaggi-'));
const tavolo = mkdtempSync(join(tmpdir(), 'mutant-tavolo-'));
let server;
let base;
before(async () => {
  server = creaServer({ cartella, tavolo, scontri });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); for (const d of [scontri, cartella, tavolo]) rmSync(d, { recursive: true, force: true }); });
const put = async (s) => { const r = await fetch(`${base}/api/scontri/${s.id}`, { method: 'PUT', body: JSON.stringify(s) }); return { status: r.status, corpo: await r.json() }; };

test('server: la bozza si salva con la revisione, si elenca come bozza, si elimina in archivio; lo scontro aperto la ignora', async () => {
  const b = bozzaDiProva();
  let r = await put(b);
  assert.deepEqual([r.status, r.corpo.revisione, r.corpo.stato], [200, 1, 'bozza']);
  // revisione vecchia: conflitto
  assert.equal((await put(b)).status, 409);
  // una bozza rovinata non si salva
  assert.equal((await put({ ...r.corpo, nemici: [{ nemico: {}, quanti: 1, lato: 'avversario' }] })).status, 400);
  const elenco = await (await fetch(`${base}/api/scontri`)).json();
  assert.deepEqual(elenco.map((x) => [x.id, x.stato, x.nemici]), [[b.id, 'bozza', 3]]);
  // nessuno scontro aperto: la plancia cerca solo stato «aperto» (src/ui/scontro.js → leggiScontroAperto)
  assert.equal(elenco.find((x) => x.stato === 'aperto'), undefined);
  // «Inizia»: lo scontro accanto alla bozza, che resta
  const s = iniziaBozza(r.corpo, { id: 'scontro-20261003-213000', pg: [lucas] });
  assert.equal((await put(s)).status, 200);
  const dopo = await (await fetch(`${base}/api/scontri`)).json();
  assert.deepEqual(dopo.map((x) => x.stato).sort(), ['aperto', 'bozza']);
  // «Elimina» (o «Inizia e consuma la bozza»): il file passa in scontri/archivio/, non si cancella
  r = await put(eliminaBozza(r.corpo));
  assert.equal(r.status, 200);
  assert.ok(!existsSync(join(scontri, `${b.id}.json`)));
  assert.equal(JSON.parse(readFileSync(join(scontri, 'archivio', `${b.id}.json`), 'utf8')).stato, 'bozza-eliminata');
  assert.deepEqual((await (await fetch(`${base}/api/scontri`)).json()).map((x) => x.stato), ['aperto']);
});
