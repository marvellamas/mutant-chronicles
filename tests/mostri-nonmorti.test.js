// Blocco «Non morti» (cap. 8 del Manuale dei Mostri v0.16): i dieci profili prestabiliti sono validi, con
// natura dell'attacco dai dati (Naturale/Etereo/Magico), GS/PX informativo, Spazio quadrato, immunità a
// Sanguinamento, lo Sguardo terribile della Mummia come capacità e le presenze incorporee in volo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));

const NONMORTI = ['scheletro', 'zombie', 'ghoul', 'ghast', 'wight', 'ombra', 'spettro', 'wraith', 'mummia', 'progenie-vampirica'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of NONMORTI) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0\.16.*Non morti/);
  }
});

test('ogni non morto è immune a Sanguinamento; Spazio quadrato', () => {
  for (const id of NONMORTI) {
    assert.deepEqual(leggi(id).immunita, ['sanguinamento'], `${id} immune a Sanguinamento`);
    assert.equal(leggi(id).spazio, '1 Q', `${id} 1 Q`);
  }
});

test('natura dell’attacco dai dati: Etereo, Magico, Naturale', () => {
  assert.equal(leggi('spettro').attacchi.find((a) => a.nome === 'Tocco').natura, 'Etereo');
  assert.equal(leggi('mummia').attacchi.find((a) => a.nome === 'Pugno funerario').natura, 'Magico');
  assert.equal(leggi('scheletro').attacchi.find((a) => a.nome === 'Spada leggera').natura, 'Naturale');
  // il Wight ha spada (Naturale), arco (Naturale, distanza) e tocco (Etereo)
  const w = leggi('wight');
  assert.deepEqual(w.attacchi.map((a) => a.natura).sort(), ['Etereo', 'Naturale', 'Naturale']);
});

test('lo Sguardo terribile della Mummia è una capacità (non infligge danni), non un attacco', () => {
  const m = leggi('mummia');
  assert.ok(!m.attacchi.some((a) => a.nome === 'Sguardo terribile'), 'non fra gli attacchi');
  const sg = m.capacita.find((c) => c.nome === 'Sguardo terribile');
  assert.ok(sg && /Terrorizzato/.test(sg.effetto));
  assert.equal(sg.risorsa, '2 PM');
  assert.deepEqual(m.attacchi.map((a) => a.nome), ['Pugno funerario']);
});

test('Spettro e Wraith sono incorporei: nessun movimento a terra, volo con Corsa/Scatto non consentiti', () => {
  for (const id of ['spettro', 'wraith']) {
    const mv = leggi(id).movimento;
    assert.equal(mv.passo, 0, `${id} niente terra`);
    assert.equal(mv.corsa, 'non_consentito');
    assert.equal(mv.scatto, 'non_consentito');
    assert.ok(Number.isInteger(mv.volo) && mv.volo > 0, `${id} vola`);
  }
  assert.equal(leggi('spettro').movimento.volo, 10);
  assert.equal(leggi('wraith').movimento.volo, 12);
});

test('GS/PX informativo e non calcolato', () => {
  assert.deepEqual(leggi('scheletro').gs_px, { gs: 'Principiante', px: 11, per_pg: 4 });
  assert.deepEqual(leggi('wraith').gs_px, { gs: 'Eroe', px: 70, per_pg: 4 });
  for (const id of NONMORTI) {
    const g = leggi(id).gs_px;
    assert.ok(g && typeof g.gs === 'string' && Number.isInteger(g.px) && g.px > 0, `${id} GS/PX`);
  }
});
