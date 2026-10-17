// Blocco «Creature del sottosuolo» (cap. 8 del Manuale dei Mostri v0.18): i dieci profili prestabiliti sono
// validi, con gli attacchi senza danno o con portata verticale come capacità, GS/PX informativo e Spazio
// quadrato (il Vermeiena 1 × 2 Q resta fuori dal campo, con la nota per la A.167).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));

const SOTTOSUOLO = ['mantoscuro', 'perforatore', 'roper', 'rugginofago', 'umber-hulk', 'orrore-uncinato', 'grimlock', 'troglodita', 'stirge', 'vermeiena'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of SOTTOSUOLO) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0\.18.*Creature del sottosuolo/);
  }
});

test('attacchi senza danno ai PV o con portata verticale → capacità, non attacchi', () => {
  const nomiAttacchi = (id) => leggi(id).attacchi.map((a) => a.nome);
  const nomiCapacita = (id) => leggi(id).capacita.map((c) => c.nome);
  assert.deepEqual(nomiAttacchi('perforatore'), []);
  assert.ok(nomiCapacita('perforatore').includes('Caduta perforante'));
  assert.deepEqual(nomiAttacchi('roper'), ['Morso']);
  assert.ok(nomiCapacita('roper').includes('Filamento (aggancio)') && nomiCapacita('roper').includes('Trascinare'));
  assert.deepEqual(nomiAttacchi('rugginofago'), ['Morso']);
  assert.ok(nomiCapacita('rugginofago').includes('Antenne (ruggine)'));
  assert.deepEqual(nomiAttacchi('umber-hulk'), ['Artiglio', 'Mandibole']);
  assert.ok(nomiCapacita('umber-hulk').includes('Sguardo perturbante'));
  assert.deepEqual(nomiAttacchi('stirge'), ['Puntura']);
  assert.ok(nomiCapacita('stirge').includes('Suzione'));
  assert.ok(nomiCapacita('mantoscuro').includes('Oscuramento'));
});

test('capacità con PM e Azioni dai dati (Oscuramento 2 PM, Sguardo perturbante 3 PM una volta per Round)', () => {
  const osc = leggi('mantoscuro').capacita.find((c) => c.nome === 'Oscuramento');
  assert.deepEqual([osc.risorsa, osc.azioni], ['2 PM', { principali: 1 }]);
  const sg = leggi('umber-hulk').capacita.find((c) => c.nome === 'Sguardo perturbante');
  assert.equal(sg.risorsa, '3 PM');
  assert.deepEqual(sg.usi, { quanti: 1, per: 'Round' });
});

test('Spazio: quadrato nel campo; Roper, Umber Hulk, Orrore uncinato 2 × 2 Grandi; Vermeiena 1 × 2 nelle note', () => {
  for (const id of ['mantoscuro', 'perforatore', 'rugginofago', 'grimlock', 'troglodita', 'stirge']) assert.equal(leggi(id).spazio, '1 Q');
  for (const id of ['roper', 'umber-hulk', 'orrore-uncinato']) {
    assert.equal(leggi(id).spazio, '2 × 2 Q', `${id} 2×2`);
    assert.equal(leggi(id).taglia, 'grande');
  }
  const v = leggi('vermeiena');
  assert.equal(v.spazio, undefined);
  assert.ok(/1 × 2 Q/.test(v.note) && /A\.167/.test(v.note));
});

test('movimento: volo del Mantoscuro e della Stirge, con il Passo a terra', () => {
  assert.deepEqual(leggi('mantoscuro').movimento, { passo: 2, corsa: 4, scatto: 6, volo: 6 });
  assert.deepEqual(leggi('stirge').movimento, { passo: 2, corsa: 4, scatto: 6, volo: 8 });
});

test('GS/PX informativo e non calcolato', () => {
  assert.deepEqual(leggi('grimlock').gs_px, { gs: 'Principiante', px: 11, per_pg: 4 });
  assert.deepEqual(leggi('roper').gs_px, { gs: 'Eroe', px: 70, per_pg: 4 });
  for (const id of SOTTOSUOLO) assert.ok(Number.isInteger(leggi(id).gs_px.px) && leggi(id).gs_px.px > 0, `${id} PX`);
});
