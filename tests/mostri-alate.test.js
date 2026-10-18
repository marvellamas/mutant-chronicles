// Blocco «Creature alate e piccoli predatori» (cap. 8 del Manuale dei Mostri v0.23): dieci profili validi, volo e
// Spazio, veleni minori come capacità con la Tempra senza modificatore, sensi alternativi, GS/PX informativo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));
const cap = (id, nome) => leggi(id).capacita.find((c) => c.nome === nome);

const ALATE = ['aquila-gigante', 'gufo-gigante', 'avvoltoio-gigante', 'pipistrello-gigante', 'vespa-gigante', 'scarabeo-di-fuoco-gigante',
  'centopiedi-gigante', 'serpente-velenoso', 'serpente-velenoso-gigante', 'ragno-lupo-gigante'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of ALATE) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0\.23.*Creature alate e piccoli predatori/);
    assert.ok(Number.isInteger(n.salvezze.volonta) && Number.isInteger(n.pm), `${id} Volontà e PM`);
  }
});

test('Spazio quadrato dai dati; le quattro creature 2 × 2 Q sono di taglia Grande', () => {
  for (const id of ['aquila-gigante', 'gufo-gigante', 'avvoltoio-gigante', 'pipistrello-gigante']) {
    assert.equal(leggi(id).spazio, '2 × 2 Q', id);
    assert.equal(leggi(id).taglia, undefined, id);
  }
  for (const id of ['vespa-gigante', 'scarabeo-di-fuoco-gigante', 'centopiedi-gigante', 'serpente-velenoso', 'serpente-velenoso-gigante', 'ragno-lupo-gigante']) {
    assert.equal(leggi(id).spazio, '1 Q', id);
    assert.equal(leggi(id).taglia, undefined, id);
  }
});

test('volo: Passo di volo dal manuale e capacità «Ali e volo» sulle sole creature alate', () => {
  const volo = { 'aquila-gigante': 16, 'gufo-gigante': 12, 'avvoltoio-gigante': 12, 'pipistrello-gigante': 12, 'vespa-gigante': 10 };
  for (const [id, v] of Object.entries(volo)) {
    assert.equal(leggi(id).movimento.volo, v, id);
    assert.ok(cap(id, 'Ali e volo'), `${id} ali`);
  }
  for (const id of ['scarabeo-di-fuoco-gigante', 'centopiedi-gigante', 'serpente-velenoso', 'ragno-lupo-gigante']) assert.equal(leggi(id).movimento.volo, undefined, id);
  assert.match(cap('vespa-gigante', 'Ali vibranti').effetto, /sospesa in aria/);
  assert.match(cap('gufo-gigante', 'Passaggio in volo').effetto, /non provoca Opportunità/i);
  assert.equal(cap('aquila-gigante', 'Passaggio in volo'), undefined);
});

test('veleni minori: capacità con Tempra senza modificatore, danno e durata dal manuale; nessun veleno sugli altri', () => {
  const attesi = {
    'vespa-gigante': ['Veleno di vespa II', '1d6', 5], 'centopiedi-gigante': ['Veleno di miriapode II', '1d4', 5],
    'serpente-velenoso': ['Veleno ofidico II', '1d4', 5], 'serpente-velenoso-gigante': ['Veleno ofidico II', '1d6', 5],
    'ragno-lupo-gigante': ['Veleno aracnide naturale II', '1d4', 10],
  };
  for (const [id, [nome, danno, round]] of Object.entries(attesi)) {
    const v = cap(id, nome);
    assert.ok(v, `${id} ${nome}`);
    assert.match(v.effetto, new RegExp(`Danno tossico ${danno} Naturale interno`));
    assert.match(v.effetto, new RegExp(`per ${round} Round`));
    assert.match(v.effetto, /Tempra senza modificatore/);
    assert.match(leggi(id).attacchi[0].note, /Poi veleno/);
  }
  for (const id of ['aquila-gigante', 'gufo-gigante', 'avvoltoio-gigante', 'pipistrello-gigante', 'scarabeo-di-fuoco-gigante']) {
    assert.ok(!leggi(id).capacita.some((c) => /^Veleno/.test(c.nome)), id);
  }
});

test('Serpente velenoso gigante: Morso a 2 Q; Aquila e Gufo con la sequenza e i linguaggi; Avvoltoio con Branco +2', () => {
  assert.equal(leggi('serpente-velenoso-gigante').attacchi[0].portata_q, 2);
  assert.deepEqual(leggi('aquila-gigante').attacchi.map((a) => a.nome), ['Becco', 'Artigli']);
  assert.match(cap('aquila-gigante', 'Vista e parola').effetto, /Aquile giganti/);
  assert.match(cap('avvoltoio-gigante', 'Branco').effetto, /VA diventa 13/);
  assert.match(cap('gufo-gigante', 'Scurovisione').effetto, /24 Q/);
});

test('sensi alternativi, luce biologica e arrampicata come capacità; GS/PX informativo', () => {
  assert.match(cap('pipistrello-gigante', 'Ecolocalizzazione').effetto, /12 Q/);
  assert.match(cap('scarabeo-di-fuoco-gigante', 'Luce biologica').effetto, /2 Q/);
  assert.match(cap('centopiedi-gigante', 'Superfici e sensi').effetto, /6 Q/);
  assert.match(cap('ragno-lupo-gigante', 'Superfici e seta').effetto, /8 Q/);
  assert.deepEqual(leggi('aquila-gigante').gs_px, { gs: 'Esperto', px: 30, per_pg: 4 });
  assert.deepEqual(leggi('scarabeo-di-fuoco-gigante').gs_px, { gs: 'Principiante', px: 10, per_pg: 4 });
});
