// Blocco «Cavalcature e animali da lavoro» (cap. 8 del Manuale dei Mostri v0.23): dieci profili validi, soglie di
// carico dalla tabella finale, Impeto (capacità o attacco con formula propria), Piede saldo, Atterrare del Mastino.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));
const cap = (id, nome) => leggi(id).capacita.find((c) => c.nome === nome);

const ANIMALI = ['cammello', 'cavallo-da-tiro', 'cavallo-da-sella', 'cavallo-da-guerra', 'mulo', 'pony', 'mastino', 'capra', 'capra-gigante', 'alce'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of ANIMALI) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0\.23.*Cavalcature e animali da lavoro/);
    assert.ok(Number.isInteger(n.salvezze.volonta) && Number.isInteger(n.pm), `${id} Volontà e PM`);
  }
});

test('Spazio quadrato dai dati: 2 × 2 Q (Grande) per cammello, cavalli, capra gigante e alce; 1 Q per gli altri', () => {
  for (const id of ['cammello', 'cavallo-da-tiro', 'cavallo-da-sella', 'cavallo-da-guerra', 'capra-gigante', 'alce']) {
    assert.equal(leggi(id).spazio, '2 × 2 Q', id); assert.equal(leggi(id).taglia, 'grande', id);
  }
  for (const id of ['mulo', 'pony', 'mastino', 'capra']) { assert.equal(leggi(id).spazio, '1 Q', id); assert.equal(leggi(id).taglia, undefined, id); }
});

test('soglie di carico della tabella finale: ordinario / massimo / spinta, con Trasporto robusto dove previsto', () => {
  const soglie = {
    cammello: [160, 320, 640, true], 'cavallo-da-tiro': [180, 360, 720, true], 'cavallo-da-sella': [160, 320, 640, true],
    'cavallo-da-guerra': [160, 320, 640, true], mulo: [120, 240, 480, true], pony: [60, 120, 240, false], mastino: [50, 100, 200, false],
    capra: [40, 80, 160, false], 'capra-gigante': [160, 320, 640, true], alce: [160, 320, 640, true],
  };
  for (const [id, [o, m, s, robusto]] of Object.entries(soglie)) {
    const c = cap(id, robusto ? 'Trasporto robusto' : 'Carico');
    assert.ok(c, `${id} carico`);
    assert.match(c.effetto, new RegExp(`Soglie ${o} kg ordinari, ${m} kg massimi trasportabili, ${s} kg di spinta`), id);
  }
});

test('Impeto: capacità del Cavallo da guerra (Tempra senza modificatore, ≤ 1 × 1 Q); Capra, Capra gigante e Alce con la formula propria', () => {
  assert.match(cap('cavallo-da-guerra', 'Impeto').effetto, /almeno 4 Q di Passo rettilineo/);
  assert.equal(leggi('cavallo-da-guerra').azioni.principali, 2);
  assert.match(leggi('cavallo-da-guerra').attacchi.find((a) => a.nome === 'Calpestare').note, /già A Terra/);
  const impeto = (id, nome) => leggi(id).attacchi.find((a) => a.nome === nome).danno;
  assert.equal(impeto('capra', 'Cornata in Impeto'), '2d4+1');
  assert.equal(impeto('capra-gigante', 'Cornata in Impeto'), '2d6+2');
  assert.equal(impeto('alce', 'Corna in Impeto'), '2d6+2');
  assert.match(leggi('alce').attacchi.find((a) => a.nome === 'Zoccoli').note, /già A Terra/);
  for (const id of ['pony', 'cammello', 'cavallo-da-tiro', 'cavallo-da-sella', 'mulo', 'mastino']) assert.equal(cap(id, 'Impeto'), undefined, id);
});

test('Piede saldo solo a Mulo, Capra e Capra gigante; Mastino con Atterrare e Sopravvivenza 9', () => {
  for (const id of ['mulo', 'capra', 'capra-gigante']) assert.match(cap(id, 'Piede saldo').effetto, /\+2/, id);
  for (const id of ['pony', 'alce', 'cammello', 'mastino']) assert.equal(cap(id, 'Piede saldo'), undefined, id);
  assert.match(cap('mastino', 'Atterrare').effetto, /1 × 1 Q/);
  assert.deepEqual(leggi('mastino').abilita.find((a) => a.nome === 'Sopravvivenza'), { nome: 'Sopravvivenza', va: 9 });
});

test('movimento, AR della Capra gigante e GS/PX informativo', () => {
  assert.deepEqual(leggi('cavallo-da-sella').movimento, { passo: 12, corsa: 24, scatto: 36 });
  assert.deepEqual(leggi('cammello').movimento, { passo: 10, corsa: 20, scatto: 30 });
  assert.equal(leggi('capra-gigante').ar.totale, 1);
  assert.deepEqual(leggi('cavallo-da-guerra').gs_px, { gs: 'Inesperto', px: 20, per_pg: 4 });
  assert.deepEqual(leggi('pony').gs_px, { gs: 'Principiante', px: 10, per_pg: 4 });
});
