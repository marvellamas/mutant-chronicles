// Linea di tiro dal tablet visibile a tutti (12/10/2026, punto 5 della sessione di gioco di Marcello e Davide):
// «la linea con il suo risultato (distanza, Copertura) si vede anche sulla mappa del master e sullo schermo dei
// giocatori, finché il giocatore non la toglie o passa il turno; una linea per tablet alla volta».
//
// Il server la tiene in memoria (come la diretta): la mette chi traccia, la leggono tutti
// (GET /api/vista-giocatori/linee e il campo `linee` della vista), e sparisce quando il giocatore la toglie,
// quando passa il turno, quando cambia il Round o quando lo scontro si chiude.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';
import { nuovaScena } from '../src/mappa/scena.js';
import { nuovoScontro, aggiungiNemici, registraTiro, avanti, chiudi as chiudiScontro } from '../src/scontro.js';
import { serializza } from '../src/character.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const radice = mkdtempSync(join(tmpdir(), 'mutant-linea-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe'].map((k) => [k, join(radice, k)]));
const SCONTRO = join(radice, 'scontri', 'scontro-linea.json');
let server, base;

before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  for (const nome of ['Akira', 'Bea']) {
    const pg = structuredClone(MISHIMA_AGENTE);
    pg.nome = nome;
    writeFileSync(join(c.personaggi, `${nome}_liv1_2026-10-12.json`), serializza(pg));
  }
  const predone = JSON.parse(readFileSync(new URL('../esempi/nemici/predone-delle-lande.json', import.meta.url), 'utf8'));
  let s = nuovoScontro({ id: 'scontro-linea', nome: 'Linea', pg: [{ chiave: 'Akira', nome: 'Akira', iniziativa: 9, des: 7, int: 5 }, { chiave: 'Bea', nome: 'Bea', iniziativa: 5, des: 7, int: 5 }] });
  s = aggiungiNemici(s, predone, 1);
  s = registraTiro(s, 'pg:Akira', 'd10', { valore: 10, origine: 'manuale' }, dati);
  s = registraTiro(s, 'pg:Bea', 'd10', { valore: 5, origine: 'manuale' }, dati);
  s = registraTiro(s, 'nem:predone-delle-lande:1', 'd10', { valore: 1, origine: 'manuale' }, dati);
  writeFileSync(SCONTRO, JSON.stringify({ ...s, revisione: 1 }));
  const scena = nuovaScena({ id: 'cortile', nome: 'Cortile', colonne: 16, righe: 10, nebbia: 'scoperta', dati });
  scena.collegamento = { scontro: 'scontro-linea', bozza: null };
  scena.token = [
    { id: 't-akira', rif: { tipo: 'partecipante', id: 'pg:Akira' }, q: [1, 4], ingombro: 1, nascosto: false },
    { id: 't-bea', rif: { tipo: 'partecipante', id: 'pg:Bea' }, q: [1, 6], ingombro: 1, nascosto: false },
    { id: 't-p1', rif: { tipo: 'partecipante', id: 'nem:predone-delle-lande:1' }, q: [9, 4], ingombro: 1, nascosto: false },
  ];
  writeFileSync(join(c.scene, 'cortile.json'), JSON.stringify({ ...scena, revisione: 1, aggiornato: '2026-10-12T20:00:00.000Z' }));
  server = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections?.();
  await new Promise((ok) => server.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

const traccia = async (corpo) => {
  const r = await fetch(`${base}/api/vista-giocatori/linea`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scena: 'cortile', ...corpo }) });
  return { stato: r.status, ...(await r.json()) };
};
const linee = async () => (await (await fetch(`${base}/api/vista-giocatori/linee`)).json()).linee;
const vista = async (pg) => (await (await fetch(`${base}/api/vista-giocatori${pg ? `?pg=${encodeURIComponent(pg)}` : ''}`)).json());
const scriviScontro = (fn) => { const s = JSON.parse(readFileSync(SCONTRO, 'utf8')); writeFileSync(SCONTRO, JSON.stringify(fn(s))); };
/** Salva lo scontro come farebbe la plancia (il server avvisa i tablet e pulisce le linee). */
const salvaScontro = async (s) => (await fetch(`${base}/api/scontri/scontro-linea`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) })).status;

test('la linea di un tablet resta sul server e la leggono tutti, con chi tira e il risultato', async () => {
  const r = await traccia({ pg: 'Akira', token: 't-p1' });
  assert.equal(r.stato, 200);
  assert.deepEqual([r.ok, r.distanza, r.nome], [true, 8, 'Predone delle Lande 1']);
  const l = await linee();
  assert.equal(l.length, 1);
  assert.deepEqual([l[0].pg, l[0].tiratore, l[0].nome, l[0].distanza, l[0].scena], ['Akira', 'Akira', 'Predone delle Lande 1', 8, 'cortile']);
  assert.ok(l[0].testo && l[0].da && l[0].a, 'il risultato e i due capi della linea');
  // lo schermo dei giocatori (senza pg) e gli altri tablet la vedono nella vista
  assert.equal((await vista()).linee.length, 1);
  assert.equal((await vista('Bea')).linee[0].tiratore, 'Akira');
});

test('una linea per tablet: la seconda sostituisce la prima; due tablet, due linee', async () => {
  await traccia({ pg: 'Akira', q: [5, 7] });
  const dopo = await linee();
  assert.equal(dopo.length, 1, 'Akira ne ha sempre una sola');
  assert.equal(dopo[0].nome, null, 'adesso punta un quadretto');
  await traccia({ pg: 'Bea', token: 't-p1' });
  const due = await linee();
  assert.deepEqual(due.map((x) => x.pg).sort(), ['Akira', 'Bea']);
});

test('il giocatore la toglie: sparisce a tutti, le altre restano', async () => {
  const r = await traccia({ pg: 'Akira', togli: true });
  assert.deepEqual([r.stato, r.ok, r.tolta], [200, true, true]);
  assert.deepEqual((await linee()).map((x) => x.pg), ['Bea']);
  // togliere una linea che non c'è non è un errore
  assert.equal((await traccia({ pg: 'Akira', togli: true })).stato, 200);
});

test('passa il turno: via tutte le linee', async () => {
  await traccia({ pg: 'Akira', token: 't-p1' });
  assert.equal((await linee()).length, 2);
  const s = JSON.parse(readFileSync(SCONTRO, 'utf8'));
  assert.equal(await salvaScontro(avanti(s, undefined, { indietroMax: 20 })), 200);
  assert.deepEqual(await linee(), [], 'il turno è passato: niente linee');
});

test('finito lo scontro le linee spariscono', async () => {
  await traccia({ pg: 'Akira', token: 't-p1' });
  assert.equal((await linee()).length, 1);
  const s = JSON.parse(readFileSync(SCONTRO, 'utf8'));
  assert.equal(await salvaScontro(chiudiScontro(s)), 200);
  assert.deepEqual(await linee(), []);
});

test('un bersaglio che il giocatore non vede non fa nessuna linea (e non ne resta traccia)', async () => {
  // lo scontro è chiuso: la scena la sceglie il master (la linea serve anche fuori combattimento)
  await fetch(`${base}/api/vista-giocatori/scelta`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scena: 'cortile' }) });
  const nascosto = JSON.parse(readFileSync(join(c.scene, 'cortile.json'), 'utf8'));
  nascosto.token = nascosto.token.map((t) => (t.id === 't-p1' ? { ...t, nascosto: true } : t));
  nascosto.revisione += 1;
  writeFileSync(join(c.scene, 'cortile.json'), JSON.stringify(nascosto));
  const r = await traccia({ pg: 'Akira', token: 't-p1' });
  assert.equal(r.stato, 422);
  assert.match(r.errore, /non lo vedi/);
  assert.deepEqual(await linee(), []);
});
