// Blocco «Predatori straordinari» (cap. 8 del Manuale dei Mostri v0.23): dieci profili validi, Soffi come capacità,
// danno misto con la seconda componente in nota, Spazio (Worg 2 × 1 Q e Roc 6 × 6 Q fuori dal campo, con A.167),
// malattia, veleno e passaggio di fase, Remorhaz con presa e inghiottimento, Roc con presa e trasporto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));
const cap = (id, nome) => leggi(id).capacita.find((c) => c.nome === nome);

const PREDATORI = ['worg', 'lupo-invernale', 'segugio-infernale', 'cane-della-morte', 'cane-intermittente', 'ragno-di-fase', 'remorhaz-giovane', 'remorhaz', 'peryton', 'roc'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of PREDATORI) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0\.23.*Predatori straordinari/);
    assert.ok(Number.isInteger(n.salvezze.volonta) && Number.isInteger(n.pm), `${id} Volontà e PM`);
  }
});

test('Spazio: quadrato dai dati; Worg 2 × 1 Q e Roc 6 × 6 Q nelle note con A.167; nessuna Taglia dedotta', () => {
  assert.deepEqual(Object.fromEntries(PREDATORI.map((id) => [id, leggi(id).spazio])), {
    worg: undefined, 'lupo-invernale': '2 × 2 Q', 'segugio-infernale': '1 Q', 'cane-della-morte': '1 Q', 'cane-intermittente': '1 Q',
    'ragno-di-fase': '2 × 2 Q', 'remorhaz-giovane': '2 × 2 Q', remorhaz: '3 × 3 Q', peryton: '1 Q', roc: undefined,
  });
  assert.match(leggi('worg').note, /2 × 1 Q.*A\.167/);
  assert.match(leggi('roc').note, /6 × 6 Q.*A\.167/);
  for (const id of PREDATORI) assert.equal(leggi(id).taglia, undefined, id);
});

test('Soffi: Lupo invernale (Gelo) e Segugio infernale (Fuoco) come capacità da 2 AzP con cadenza R + 3, non attacchi', () => {
  for (const [id, nome, elem] of [['lupo-invernale', 'Soffio gelido', 'Gelo'], ['segugio-infernale', 'Soffio di Fuoco', 'Fuoco']]) {
    const s = cap(id, nome);
    assert.deepEqual(s.azioni, { principali: 2 }, id);
    assert.match(s.limiti, /R \+ 3/, id);
    assert.match(s.effetto, new RegExp(`3d6 ${elem} Naturale`), id);
    assert.match(s.effetto, /Cono lungo 3 Q/, id);
    assert.ok(!leggi(id).attacchi.some((a) => /Soffio/.test(a.nome)), id);
    assert.equal(cap(id, 'Branco').passiva, true, id);
  }
  assert.equal(cap('worg', 'Branco'), undefined);
});

test('danno misto: Perforazione in `danno`, Fuoco nella nota; Incendiato solo dove il manuale lo dà', () => {
  assert.equal(leggi('segugio-infernale').attacchi[0].danno, '1d8+2');
  assert.match(leggi('segugio-infernale').attacchi[0].note, /1d4 Fuoco Naturale/);
  assert.match(leggi('remorhaz-giovane').attacchi[0].note, /1d4 Fuoco Naturale/);
  assert.match(leggi('remorhaz').attacchi[0].note, /1d6 Fuoco Naturale/);
  for (const id of ['segugio-infernale', 'remorhaz-giovane', 'remorhaz']) assert.deepEqual(leggi(id).immunita, ['incendiato'], id);
  for (const id of ['worg', 'lupo-invernale', 'cane-della-morte', 'peryton', 'roc']) assert.equal(leggi(id).immunita, undefined, id);
  assert.match(cap('remorhaz', 'Corpo incandescente').effetto, /1d6\+2 Fuoco Naturale/);
  assert.match(cap('remorhaz-giovane', 'Corpo incandescente').effetto, /1d6 Fuoco Naturale/);
});

test('Cane della morte (due Morsi, malattia IV Seria, Scurovisione 24), Cane intermittente (Balzo 8 Q, 2 PM) e Ragno di fase (veleno III, fase)', () => {
  assert.match(cap('cane-della-morte', 'Due teste').effetto, /due Morsi per Round/);
  assert.match(cap('cane-della-morte', 'Saliva infetta').effetto, /Pericolosità IV, Seria/);
  assert.match(cap('cane-della-morte', 'Scurovisione').effetto, /24 Q/);
  const b = cap('cane-intermittente', 'Balzo intermittente');
  assert.deepEqual([b.azioni, b.risorsa], [{ principali: 1 }, '2 PM']);
  assert.match(b.effetto, /entro 8 Q/);
  assert.match(cap('ragno-di-fase', 'Veleno di fase naturale III').effetto, /2d4 Naturale interni/);
  const f = cap('ragno-di-fase', 'Passaggio di fase');
  assert.deepEqual([f.azioni, f.risorsa], [{ principali: 1 }, '2 PM']);
  assert.match(f.effetto, /6 Q complessivi/);
});

test('Remorhaz: presa delle fauci, Inghiottire (spazio ≤ 1 × 1 Q) e Digestione 2d6 acido come capacità; Peryton con Picchiata', () => {
  assert.match(cap('remorhaz', 'Presa delle fauci').effetto, /2 × 2 Q/);
  assert.match(cap('remorhaz', 'Inghiottire').effetto, /1 × 1 Q/);
  const dig = cap('remorhaz', 'Digestione');
  assert.deepEqual(dig.azioni, { principali: 1 });
  assert.match(dig.effetto, /2d6 Naturale da acido/);
  assert.equal(cap('remorhaz-giovane', 'Inghiottire'), undefined);
  assert.equal(leggi('remorhaz').attacchi[0].portata_q, 2);
  assert.match(cap('peryton', 'Picchiata').effetto, /−2 VA fino a 6 Q, −4 da 7 Q/);
  assert.equal(leggi('peryton').movimento.volo, 12);
});

test('Roc: volo 24, presa su creature fino a 3 × 3 Q e carico di 1.000 kg; GS/PX informativo', () => {
  assert.equal(leggi('roc').movimento.volo, 24);
  assert.match(cap('roc', 'Presa e trasporto').effetto, /3 × 3 Q.*1\.000 kg/);
  assert.deepEqual(leggi('roc').attacchi.map((a) => [a.nome, a.portata_q]), [['Becco', 2], ['Artigli', 1]]);
  assert.deepEqual(leggi('roc').gs_px, { gs: 'Leggenda', px: 100, per_pg: 4 });
  assert.deepEqual(leggi('worg').gs_px, { gs: 'Inesperto', px: 20, per_pg: 4 });
});
