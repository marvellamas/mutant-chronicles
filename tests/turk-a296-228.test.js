import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 228 — A.296 (E&L 19/11/2026): i posti del Turk e gli occupanti di una cavalcatura (dati e funzioni pure; la mappa non si tocca).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';
import { capienzaDi, movimentoConOccupanti, sali, scendi, posizioniOccupanti, postiLiberi } from '../src/occupanti.js';

const { dati } = await datiReali();
const DIR = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, DIR), 'utf8'));
const turk = leggi('turk');
const pg = (id, conducente = false) => ({ id, tipo: 'pg', conducente });

test('la scheda del Turk dichiara tre posti, conducente compreso, e il movimento per fascia; il validatore la accetta', () => {
  assert.equal(turk.posti.totale, 3);
  assert.equal(turk.posti.conducente_compreso, true);
  assert.deepEqual(validaNemico(turk, dati, 'turk.json'), []);
  assert.deepEqual(movimentoConOccupanti(turk, 1).movimento, { passo: 6, corsa: 12, scatto: 18 });
  assert.deepEqual(movimentoConOccupanti(turk, 2).movimento, { passo: 6, corsa: 12, scatto: 18 });
  assert.deepEqual(movimentoConOccupanti(turk, 3).movimento, { passo: 4, corsa: 8, scatto: 'non_consentito' });
  // coerente col movimento di base della scheda (1–2 occupanti)
  assert.deepEqual(turk.movimento, movimentoConOccupanti(turk, 1).movimento);
});

test('il quarto occupante non sale; chi scende libera il posto; ogni occupante usa un posto', () => {
  let m = { occupanti: [] };
  for (const [id, cond] of [['a', true], ['b', false], ['c', false]]) {
    const r = sali(m, pg(id, cond), turk);
    assert.ok(r.ok, `${id} sale`);
    m = r.mezzo;
  }
  assert.equal(m.occupanti.length, 3);
  assert.equal(postiLiberi(m, turk), 0);
  const q = sali(m, pg('d'), turk);
  assert.equal(q.ok, false, 'il quarto non sale');
  assert.match(q.motivo, /3 posti/);
  assert.equal(q.mezzo.occupanti.length, 3, 'e il mezzo non cambia');
  // con tre il movimento è ridotto; scende uno → torna normale, e il posto è libero per un altro
  assert.equal(movimentoConOccupanti(turk, m.occupanti.length).movimento.scatto, 'non_consentito');
  const s = scendi(m, 'c', turk);
  assert.ok(s.ok);
  assert.equal(s.mezzo.occupanti.some((o) => o.id === 'c'), false);
  assert.equal(s.movimento.scatto, 18);
  assert.equal(postiLiberi(s.mezzo, turk), 1);
  assert.ok(sali(s.mezzo, pg('d'), turk).ok, 'il posto liberato si riusa');
});

test('un solo conducente; non si sale due volte; l’originale non si modifica', () => {
  const m0 = { occupanti: [] };
  const a = sali(m0, pg('a', true), turk).mezzo;
  const b = sali(a, pg('b', true), turk).mezzo;
  assert.equal(b.occupanti.filter((o) => o.conducente).length, 1, 'il secondo che si dichiara conducente è passeggero');
  assert.equal(sali(a, pg('a'), turk).ok, false, 'è già a bordo');
  assert.equal(m0.occupanti.length, 0, 'il mezzo di partenza non cambia');
});

test('i PNG fuori dallo scontro salgono e scendono senza entrare nell’Iniziativa: nessun campo d’Iniziativa viene scritto', () => {
  const png = { id: 'png-1', tipo: 'png' };
  const r = sali({ occupanti: [] }, png, turk);
  assert.ok(r.ok);
  assert.deepEqual(Object.keys(r.mezzo.occupanti[0]).sort(), ['id', 'tipo'], 'solo il riferimento: niente iniziativa, azioni, scontro');
  assert.ok(scendi(r.mezzo, 'png-1', turk).ok);
});

test('gli occupanti si spostano con la pedina; chi è sceso no', () => {
  let m = sali({ occupanti: [] }, pg('a', true), turk).mezzo;
  m = sali(m, pg('b'), turk).mezzo;
  assert.deepEqual(posizioniOccupanti(m, { x: 4, y: 7 }), { a: { x: 4, y: 7 }, b: { x: 4, y: 7 } });
  const sceso = scendi(m, 'b', turk).mezzo;
  assert.deepEqual(Object.keys(posizioniOccupanti(sceso, { x: 5, y: 7 })), ['a']);
});

test('ALTRE CAVALCATURE: senza `posti` nella scheda la capienza è «da definire», mai ricavata dalla taglia', () => {
  const altre = readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'turk.json').map((f) => leggi(f.replace('.json', '')));
  assert.ok(altre.length > 50);
  assert.deepEqual(altre.filter((s) => s.posti), [], 'nessun’altra scheda ha posti inventati');
  const grande = { spazio: '3 × 10 Q', taglia: 'Enorme' };
  assert.deepEqual(capienzaDi(grande), { nota: 'da_definire', totale: null, conducenteCompreso: true });
  const r = sali({ occupanti: [] }, pg('a'), grande);
  assert.ok(r.ok, 'avvisa, non blocca: decide il Direttore');
  assert.match(r.avviso, /da definire/);
});

test('validatore: fasce con buchi o che non arrivano al totale sono rifiutate', () => {
  const buco = structuredClone(turk);
  buco.posti.fasce[1].occupanti_da = 4; buco.posti.fasce[1].occupanti_a = 4;
  assert.ok(validaNemico(buco, dati, 't').some((e) => e.chiave === 'posti.fasce'));
  const corto = structuredClone(turk);
  corto.posti.totale = 4;
  assert.ok(validaNemico(corto, dati, 't').some((e) => e.chiave === 'posti.fasce'));
});
