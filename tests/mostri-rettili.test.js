// Blocco «Grandi rettili e predatori mostruosi» (cap. 8 del Manuale dei Mostri v0.23): dieci profili validi,
// soffi e prese come capacità, Idra con teste e Opportunità speciali, Viverna con tre dosi al giorno, Spazio
// quadrato (Drago tartaruga 4 × 4 Q nelle note con A.167), GS/PX informativo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));

const RETTILI = ['allosauro', 'anchilosauro', 'plesiosauro', 'pteranodonte', 'triceratopo', 'tirannosauro', 'viverna', 'idra', 'behir', 'drago-tartaruga'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of RETTILI) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0.(23|46).*Grandi rettili e predatori mostruosi/);
    assert.ok(Number.isInteger(n.salvezze.volonta) && Number.isInteger(n.pm), `${id} Volontà e PM`);
  }
});

test('Spazio: quadrato dai dati; il Drago tartaruga 4 × 4 Q è nel campo (A.167), senza Taglia', () => {
  assert.equal(leggi('pteranodonte').spazio, '1 Q');
  for (const id of ['allosauro', 'plesiosauro', 'viverna']) { assert.equal(leggi(id).spazio, '2 × 2 Q', id); assert.equal(leggi(id).taglia, undefined); }
  for (const id of ['anchilosauro', 'triceratopo', 'tirannosauro', 'idra', 'behir']) assert.equal(leggi(id).spazio, '3 × 3 Q', id);
  const d = leggi('drago-tartaruga');
  assert.equal(d.spazio, '4 × 4 Q');
  assert.equal(d.taglia, undefined);
  assert.ok(!/A.167/.test(d.note));
});

test('soffi e prese sono capacità, non attacchi; Behir e Tirannosauro con le procedure complete', () => {
  const att = (id) => leggi(id).attacchi.map((a) => a.nome);
  const cap = (id) => leggi(id).capacita.map((c) => c.nome);
  assert.deepEqual(att('behir'), ['Morso', 'Costrizione']);
  for (const n of ['Stringere', 'Soffio elettrico', 'Inghiottire']) assert.ok(cap('behir').includes(n), `Behir ${n}`);
  assert.deepEqual(att('tirannosauro'), ['Morso', 'Coda']);
  assert.ok(cap('tirannosauro').includes('Stringere le fauci'));
  assert.deepEqual(att('drago-tartaruga'), ['Morso', 'Artiglio', 'Coda']);
  assert.ok(cap('drago-tartaruga').includes('Soffio di vapore'));
  const soffio = leggi('behir').capacita.find((c) => c.nome === 'Soffio elettrico');
  assert.deepEqual(soffio.azioni, { principali: 2 });
  assert.match(soffio.effetto, /R \+ 3/);
});

test('Calpestare (vittima A Terra) e Coda del Drago tartaruga (2 AzP) restano attacchi con la condizione nella nota', () => {
  assert.match(leggi('triceratopo').attacchi.find((a) => a.nome === 'Calpestare').note, /già A Terra/);
  assert.match(leggi('drago-tartaruga').attacchi.find((a) => a.nome === 'Coda').note, /2 AzP/);
  assert.match(leggi('viverna').attacchi.find((a) => a.nome === 'Artigli').note, /Solo in volo/);
});

test('Viverna: tre dosi di veleno al giorno; Idra: cinque teste, tre Morsi e Opportunità speciali', () => {
  const v = leggi('viverna').capacita.find((c) => c.nome === 'Veleno');
  assert.deepEqual(v.usi, { quanti: 3, per: 'giorno' });
  assert.match(v.effetto, /2d6 Naturale interno/);
  const i = leggi('idra');
  assert.equal(i.azioni.principali, 3);
  assert.match(i.azioni.eccezioni, /Opportunità/);
  assert.ok(i.capacita.some((c) => c.nome === 'Soglia di lesione' && /16 danni finali/.test(c.effetto)));
  assert.ok(i.capacita.some((c) => c.nome === 'Ricrescita e cauterizzazione' && /fino a due nuove teste/.test(c.effetto)));
  assert.deepEqual(i.attacchi.map((a) => a.nome), ['Morso']);
});

test('movimento: voli (Pteranodonte 12, Viverna 16) e nuoto/volo nelle capacità; GS/PX informativo', () => {
  assert.deepEqual(leggi('pteranodonte').movimento, { passo: 2, corsa: 4, scatto: 6, volo: 12 });
  assert.equal(leggi('viverna').movimento.volo, 16);
  assert.ok(leggi('plesiosauro').capacita.some((c) => c.nome === 'Nuoto'));
  assert.deepEqual(leggi('behir').gs_px, { gs: 'Leggenda', px: 100, per_pg: 4 });
  assert.deepEqual(leggi('pteranodonte').gs_px, { gs: 'Principiante', px: 10, per_pg: 4 });
});
