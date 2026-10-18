// Blocco «Fauna delle terre aperte» (cap. 8 del Manuale dei Mostri v0.23, ultimo del catalogo): dieci animali validi,
// tutti 1 × 1 Q senza Taglia, Branco con il VA nel testo, Carica del Cinghiale, volo, scavo e arrampicata, GS/PX.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));
const cap = (id, nome) => leggi(id).capacita.find((c) => c.nome === nome);

const FAUNA = ['babbuino', 'tasso', 'orso-nero', 'cinghiale', 'cervo', 'aquila', 'falco', 'iena', 'avvoltoio', 'sciacallo'];

test('i dieci animali ci sono, sono validi e vengono dal cap. 8; tutti 1 × 1 Q, senza Taglia, senza immunità', () => {
  for (const id of FAUNA) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0\.23.*Fauna delle terre aperte/);
    assert.ok(Number.isInteger(n.salvezze.volonta) && Number.isInteger(n.pm), `${id} Volontà e PM`);
    assert.equal(n.spazio, '1 Q', id);
    assert.equal(n.taglia, undefined, id);
    assert.equal(n.immunita, undefined, id);
  }
});

test('Branco solo per Babbuino, Iena, Avvoltoio e Sciacallo, con il VA risultante nel testo', () => {
  const va = { babbuino: [10, 8], iena: [11, 9], avvoltoio: [10, 8], sciacallo: [10, 8] };
  for (const [id, [con, senza]] of Object.entries(va)) {
    assert.match(cap(id, 'Branco').effetto, new RegExp(`VA ${con} anziché ${senza}`), id);
    assert.equal(leggi(id).attacchi[0].va, senza, id);
  }
  for (const id of ['tasso', 'orso-nero', 'cinghiale', 'cervo', 'aquila', 'falco']) assert.equal(cap(id, 'Branco'), undefined, id);
});

test('Cinghiale: Carica delle zanne, Abbattimento e Tenacia una volta per scena; Orso nero con la sequenza Artigli + Morso', () => {
  const c = cap('cinghiale', 'Carica delle zanne');
  assert.deepEqual(c.azioni, { principali: 1, movimento: 1 });
  assert.match(c.effetto, /×2, oppure ×3 con un Magistrale/);
  assert.match(cap('cinghiale', 'Abbattimento').effetto, /1 × 1 Q/);
  assert.deepEqual(cap('cinghiale', 'Tenacia').usi, { quanti: 1, per: 'Scena' });
  assert.deepEqual(leggi('orso-nero').attacchi.map((a) => [a.nome, a.va]), [['Artigli', 11], ['Morso', 10]]);
  assert.match(cap('orso-nero', 'Fiuto').effetto, /VA 13/);
  assert.equal(leggi('orso-nero').azioni.principali, 2);
});

test('volo di Aquila (12), Falco (12) e Avvoltoio (10); scavo del Tasso; arrampicata di Babbuino e Orso nero', () => {
  assert.deepEqual([leggi('aquila').movimento.volo, leggi('falco').movimento.volo, leggi('avvoltoio').movimento.volo], [12, 12, 10]);
  for (const id of ['aquila', 'falco', 'avvoltoio']) assert.ok(cap(id, 'Ali e quota'), id);
  for (const id of ['babbuino', 'tasso', 'orso-nero', 'cinghiale', 'cervo', 'iena', 'sciacallo']) assert.equal(leggi(id).movimento.volo, undefined, id);
  assert.deepEqual(cap('tasso', 'Scavare').azioni, { movimento: 1 });
  assert.match(cap('tasso', 'Scavare').effetto, /1 Q al Passo/);
  assert.match(cap('babbuino', 'Arrampicata').effetto, /6 Q al Passo/);
  assert.match(cap('aquila', 'Vista acuta').effetto, /VA 14/);
});

test('GS/PX informativo: tutti Principiante 10 tranne Orso nero e Cinghiale (Inesperto 20); catalogo completo a 215 creature', () => {
  for (const id of FAUNA) {
    const atteso = ['orso-nero', 'cinghiale'].includes(id) ? { gs: 'Inesperto', px: 20, per_pg: 4 } : { gs: 'Principiante', px: 10, per_pg: 4 };
    assert.deepEqual(leggi(id).gs_px, atteso, id);
  }
  const catalogo = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')))
    .filter((n) => /cap. 8/.test(n.fonte ?? ''));
  assert.equal(catalogo.length, 215, 'le 215 creature del cap. 8 del Manuale dei Mostri 0.23 (il cap. 7, Covata e Lorath, è a parte)');
});
