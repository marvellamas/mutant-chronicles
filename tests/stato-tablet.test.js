// src/stato-tablet.js: la riga di stato del tablet (21/10/2026, parte D; estesa lo stesso giorno, quarto lotto,
// «si può modificare offline»: offline non spegne più i comandi, mostra invece quante modifiche sono in coda)
// e il messaggio del conflitto di versione (parte E).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rigaStatoTablet, tempoTrascorso, oraBreve, messaggioConflittoVersione, motivoSolaLettura } from '../src/stato-tablet.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();

test('tempoTrascorso: in parole, come nell\'esempio del Direttore', () => {
  assert.equal(tempoTrascorso(10_000), 'pochi secondi');
  assert.equal(tempoTrascorso(59_000), 'pochi secondi');
  assert.equal(tempoTrascorso(60_000), 'un minuto');
  assert.equal(tempoTrascorso(3 * 60_000), '3 minuti');
  assert.equal(tempoTrascorso(60 * 60_000), 'un’ora');
  assert.equal(tempoTrascorso(2 * 60 * 60_000), '2 ore');
});

test('oraBreve: HH:MM con gli zeri', () => {
  assert.equal(oraBreve(new Date(2026, 9, 21, 9, 5)), '09:05');
  assert.equal(oraBreve(new Date(2026, 9, 21, 21, 14)), '21:14');
});

test('rigaStatoTablet: collegato, con il personaggio e l\'ora — l\'esempio del Direttore', () => {
  const adesso = new Date(2026, 9, 21, 21, 14).getTime();
  const r = rigaStatoTablet({ pg: { pgId: 'pg-1', pgNome: 'Aiko' }, collegamento: { ok: true, adesso } }, dati);
  assert.equal(r.stato, 'collegato');
  assert.equal(r.testo, 'collegato · Aiko · aggiornata 21:14');
  assert.equal(r.modificabile, true);
});

test('rigaStatoTablet: collegato ma senza personaggio scelto', () => {
  const r = rigaStatoTablet({ pg: null, collegamento: { ok: true } }, dati);
  assert.equal(r.stato, 'senza_pg');
  assert.match(r.testo, /scegli il tuo personaggio/);
  assert.equal(r.modificabile, true);
});

test('rigaStatoTablet: offline da 3 minuti con 4 modifiche in coda — ancora modificabile (non più una misura temporanea)', () => {
  const adesso = Date.now();
  const r = rigaStatoTablet({ pg: { pgId: 'pg-1', pgNome: 'Aiko' }, collegamento: { ok: false, ultimoOk: adesso - 3 * 60_000, adesso }, inCoda: 4 }, dati);
  assert.equal(r.stato, 'offline');
  assert.equal(r.testo, 'offline da 3 minuti · 4 modifiche in attesa · le vedrà il Direttore quando torni collegato');
  assert.equal(r.modificabile, true);
});

test('rigaStatoTablet: offline senza ancora nessuna modifica, un testo diverso (non «0 modifiche»)', () => {
  const adesso = Date.now();
  const r = rigaStatoTablet({ pg: { pgId: 'pg-1', pgNome: 'Aiko' }, collegamento: { ok: false, ultimoOk: adesso - 60_000, adesso }, inCoda: 0 }, dati);
  assert.match(r.testo, /^offline da un minuto · puoi continuare a modificare/);
  assert.equal(r.modificabile, true);
});

test('rigaStatoTablet: con una sola modifica, il singolare («1 modifica», non «1 modifiche»)', () => {
  const r = rigaStatoTablet({ pg: { pgId: 'pg-1', pgNome: 'Aiko' }, collegamento: { ok: false, ultimoOk: Date.now() - 60_000, adesso: Date.now() }, inCoda: 1 }, dati);
  assert.match(r.testo, /1 modifica in attesa/);
  assert.doesNotMatch(r.testo, /1 modifiche/);
});

test('rigaStatoTablet: offline prevale su «senza personaggio» (l\'avviso più urgente)', () => {
  const r = rigaStatoTablet({ pg: null, collegamento: { ok: false, ultimoOk: Date.now() - 60_000 } }, dati);
  assert.equal(r.stato, 'offline');
});

test('motivoSolaLettura: il testo da mettere nel titolo di un comando spento guardando un PG non proprio', () => {
  assert.ok(motivoSolaLettura(dati).length > 10);
});

test('messaggioConflittoVersione: il testo esatto dell\'esempio', () => {
  const adesso = new Date(2026, 9, 21, 12, 1).getTime();
  const quando = new Date(2026, 9, 21, 12, 0).getTime();
  const m = messaggioConflittoVersione({ nome: 'Aiko', chi: 'master', quando }, dati, adesso);
  assert.equal(m, '«Aiko» è stata modificata da il Direttore un minuto fa. Ricarica e riprova.');
});

test('messaggioConflittoVersione: «giocatore» è quasi sempre lo stesso giocatore da un altro dispositivo', () => {
  const adesso = Date.now();
  const m = messaggioConflittoVersione({ nome: 'Lucas', chi: 'giocatore', quando: adesso - 5000 }, dati, adesso);
  assert.match(m, /un altro tuo dispositivo/);
});

test('messaggioConflittoVersione: senza nome, un testo comunque leggibile', () => {
  const m = messaggioConflittoVersione({ nome: '', chi: 'px', quando: Date.now() }, dati);
  assert.match(m, /^«Il personaggio» è stata modificata da il calcolo dei PX/);
});
