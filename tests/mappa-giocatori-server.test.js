// Mappa di battaglia, lotto 4: /api/vista-giocatori (scena in gioco, scelta del master, firma), /api/ritratti e la
// vista filtrata con il contesto dello scontro, su cartelle temporanee e porta casuale.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';
import { nuovaScena } from '../src/mappa/scena.js';
import { daBase64, inBase64, rettangolo } from '../src/mappa/celle.js';
import { nuovoScontro, aggiungiNemici, registraTiro } from '../src/scontro.js';
import { serializza } from '../src/character.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const radice = mkdtempSync(join(tmpdir(), 'mutant-giocatori-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe'].map((k) => [k, join(radice, k)]));
let server, base;

// un PG con ritratto, uno scontro aperto con due nemici (uno nascosto sulla mappa) e una scena collegata
const RITRATTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  const pg = structuredClone(MISHIMA_AGENTE);
  pg.ritratto = RITRATTO;
  pg.nome = 'Akira';
  writeFileSync(join(c.personaggi, 'Akira_liv1_2026-10-06.json'), serializza(pg));
  const predone = JSON.parse(readFileSync(new URL('../esempi/nemici/predone-delle-lande.json', import.meta.url), 'utf8'));
  let s = nuovoScontro({ id: 'scontro-prova', nome: 'Prova', pg: [{ chiave: 'Akira', nome: 'Akira', iniziativa: 9, des: 7, int: 5 }] });
  s = aggiungiNemici(s, predone, 2);
  // turno: Akira (10 + 9), poi i predoni
  s = registraTiro(s, 'pg:Akira', 'd10', { valore: 10, origine: 'manuale' }, dati);
  s = registraTiro(s, 'nem:predone-delle-lande:1', 'd10', { valore: 1, origine: 'manuale' }, dati);
  s = registraTiro(s, 'nem:predone-delle-lande:2', 'd10', { valore: 1, origine: 'manuale' }, dati);
  writeFileSync(join(c.scontri, 'scontro-prova.json'), JSON.stringify({ ...s, revisione: 1 }));
  const scena = nuovaScena({ id: 'cripta', nome: 'Cripta', colonne: 10, righe: 6, nebbia: 'scoperta', dati });
  scena.nebbia.coperti = inBase64(rettangolo(daBase64(scena.nebbia.coperti), 10, 6, 7, 0, 9, 5, true));
  scena.collegamento = { scontro: 'scontro-prova', bozza: null };
  scena.token = [
    { id: 't-akira', rif: { tipo: 'partecipante', id: 'pg:Akira' }, q: [1, 1], ingombro: 1, nascosto: false },
    { id: 't-p1', rif: { tipo: 'partecipante', id: 'nem:predone-delle-lande:1' }, q: [3, 3], ingombro: 1, nascosto: true },
    { id: 't-p2', rif: { tipo: 'partecipante', id: 'nem:predone-delle-lande:2' }, q: [8, 2], ingombro: 1, nascosto: false },
  ];
  writeFileSync(join(c.scene, 'cripta.json'), JSON.stringify({ ...scena, revisione: 1, aggiornato: '2026-10-06T20:00:00.000Z' }));
  writeFileSync(join(c.scene, 'altra.json'), JSON.stringify({ ...nuovaScena({ id: 'altra', nome: 'Altra', colonne: 4, righe: 4, dati }), revisione: 1 }));
  server = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((ok) => server.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

const leggi = async (q = '') => (await fetch(`${base}/api/vista-giocatori${q}`)).json();

test('automatica: la scena dello scontro aperto, filtrata, con turno e immagini per i giocatori', async () => {
  const v = await leggi();
  assert.equal(v.scelta, null);
  assert.equal(v.scena.id, 'cripta');
  assert.deepEqual(v.scena.token.map((t) => t.id), ['t-akira'], 'nascosto e sotto la nebbia non arrivano');
  const akira = v.scena.token[0].info;
  assert.equal(akira.lato, 'pg');
  assert.equal(akira.pv, 1);
  assert.ok(akira.diTurno);
  assert.match(akira.immagine, /^api\/ritratti\/Akira\?v=[0-9a-f]{12}$/);
  assert.deepEqual(v.scena.turno, { round: 1, nome: 'Akira' });
  const testo = JSON.stringify(v);
  for (const segreto of ['predone', 'Predone', 'data:image', 'annulla', 'movimenti']) assert.ok(!testo.includes(segreto), segreto);
  // il ritratto arriva come immagine
  const r = await fetch(`${base}/${akira.immagine}`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await r.arrayBuffer()), Buffer.from(RITRATTO.split(',')[1], 'base64'));
  assert.equal((await fetch(`${base}/api/ritratti/Nessuno`)).status, 404);
});

test('firma: se nulla cambia la risposta è minima', async () => {
  const v = await leggi();
  const di = await leggi(`?firma=${v.firma}`);
  assert.deepEqual(di, { firma: v.firma, invariata: true });
  const altra = await leggi('?firma=000000000000');
  assert.equal(altra.scena.id, 'cripta');
});

// 08/10 (test di Marcello con un tablet vero): una regola sola per secondo schermo e tablet (server.mjs → scenaInGioco)
const metti = (scena) => fetch(`${base}/api/vista-giocatori/scelta`, { method: 'PUT', body: JSON.stringify({ scena }) });
const SCONTRO_FILE = () => join(c.scontri, 'scontro-prova.json');
const scontroCom = () => JSON.parse(readFileSync(SCONTRO_FILE(), 'utf8'));

test('scena dello scontro aperto: vince anche su una scena segnata dal master (la causa della mappa sbagliata)', async () => {
  assert.equal((await metti('manca')).status, 404);
  assert.equal((await metti('Non Valida')).status, 400);
  assert.equal((await metti('altra')).status, 200);
  const v = await leggi();
  assert.equal(v.scena.id, 'cripta', 'con lo scontro aperto la sua scena, non quella segnata');
  assert.equal(v.scelta, 'altra');
  assert.deepEqual(await (await fetch(`${base}/api/vista-giocatori/scelta`)).json(), { scena: 'altra', inGioco: 'cripta' });
  assert.equal((await metti(null)).status, 200);
});

test('nessuno scontro aperto: la scena segnata; senza segno nessuna mappa, con «Il master non ha ancora aperto una mappa»', async () => {
  const s = scontroCom();
  writeFileSync(SCONTRO_FILE(), JSON.stringify({ ...s, stato: 'chiuso' }));
  try {
    const nulla = await leggi();
    assert.equal(nulla.scena, null);
    assert.equal(nulla.motivo, 'Il master non ha ancora aperto una mappa.');
    assert.equal((await metti('altra')).status, 200);
    const v = await leggi();
    assert.equal(v.scena.id, 'altra');
    assert.deepEqual(v.scena.turno, { round: null, nome: null }, 'scena senza scontro: niente Round');
  } finally {
    await metti(null);
    writeFileSync(SCONTRO_FILE(), JSON.stringify(s));
  }
});

test('più scontri aperti: la scena segnata; con ?scontro= quella di quello scontro', async () => {
  const s = scontroCom();
  writeFileSync(join(c.scontri, 'secondo.json'), JSON.stringify({ ...s, id: 'secondo', nome: 'Secondo' }));
  try {
    assert.equal((await leggi()).scena, null, 'due scontri aperti e nessun segno: nessuna scena a caso');
    assert.equal((await leggi('?scontro=scontro-prova')).scena.id, 'cripta');
    await metti('altra');
    assert.equal((await leggi()).scena.id, 'altra');
  } finally {
    await metti(null);
    rmSync(join(c.scontri, 'secondo.json'));
  }
});

test('«?» al posto dei PG: con lo scontro finito (anche in archivio) i token hanno ancora nome e immagine', async () => {
  const s = scontroCom();
  mkdirSync(join(c.scontri, 'archivio'), { recursive: true });
  writeFileSync(join(c.scontri, 'archivio', 'scontro-prova.json'), JSON.stringify({ ...s, stato: 'chiuso' }));
  rmSync(SCONTRO_FILE());
  try {
    await metti('cripta');
    const v = await leggi();
    assert.equal(v.scena.id, 'cripta');
    const akira = v.scena.token.find((t) => t.id === 't-akira');
    assert.equal(akira.info.nome, 'Akira');
    assert.match(akira.info.immagine, /^api\/ritratti\/Akira/);
    assert.equal(akira.info.diTurno, false);
    assert.ok(v.scena.token.every((t) => t.info), 'nessun token senza nome');
  } finally {
    await metti(null);
    writeFileSync(SCONTRO_FILE(), JSON.stringify(s));
    rmSync(join(c.scontri, 'archivio'), { recursive: true, force: true });
  }
});
