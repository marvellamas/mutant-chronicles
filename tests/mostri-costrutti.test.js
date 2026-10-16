// Blocco «Costrutti e creature elementali» (cap. 8 del Manuale dei Mostri v0.16): i dieci profili prestabiliti
// sono validi, con gli attacchi ad area (senza VA) come capacità, l'elemento nella proprietà, AR magica degli
// Elementali, immunità come Stati, GS/PX informativo e Spazio quadrato con la nota per il Tappeto 2×1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));

const COSTRUTTI = ['armatura-animata', 'spada-volante', 'tappeto-soffocante', 'gargoyle', 'azer', 'magmin',
  'elementale-acqua-maggiore', 'elementale-aria-maggiore', 'elementale-fuoco-maggiore', 'elementale-terra-maggiore'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of COSTRUTTI) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0\.16.*Costrutti e creature elementali/);
  }
});

test('gli attacchi ad area / senza VA sono capacità, non attacchi', () => {
  // Magmin: Esplosione finale è capacità; l'unico attacco è il Tocco ardente
  const mag = leggi('magmin');
  assert.deepEqual(mag.attacchi.map((a) => a.nome), ['Tocco ardente']);
  assert.ok(mag.capacita.some((c) => c.nome === 'Esplosione finale'));
  // Elementale del Fuoco: Fiammata è capacità; Terra: Terremoto è capacità
  assert.ok(!leggi('elementale-fuoco-maggiore').attacchi.some((a) => a.nome === 'Fiammata'));
  assert.ok(leggi('elementale-fuoco-maggiore').capacita.some((c) => c.nome === 'Fiammata'));
  assert.ok(!leggi('elementale-terra-maggiore').attacchi.some((a) => a.nome === 'Terremoto'));
  assert.ok(leggi('elementale-terra-maggiore').capacita.some((c) => c.nome === 'Terremoto'));
});

test('elemento del danno nella proprietà; AR magica degli Elementali', () => {
  const acqua = leggi('elementale-acqua-maggiore');
  const schiaffo = acqua.attacchi.find((a) => a.nome === 'Schiaffo');
  assert.equal(schiaffo.natura, 'Magico');
  assert.deepEqual(schiaffo.proprieta, ['Acqua']);
  assert.deepEqual(acqua.ar, { totale: 4, magica: 4 }, 'AR tutta magica');
  // il Dardo d'acqua è un attacco a distanza
  assert.equal(acqua.attacchi.find((a) => a.nome === 'Dardo d’acqua').tipo, 'distanza');
});

test('immunità come Stati del formato; costrutti senza mente immuni a Stordito', () => {
  for (const id of ['armatura-animata', 'spada-volante', 'tappeto-soffocante']) {
    assert.ok(leggi(id).immunita.includes('sanguinamento') && leggi(id).immunita.includes('stordito'), `${id} immunità`);
  }
  assert.ok(leggi('elementale-fuoco-maggiore').immunita.includes('incendiato'), 'Fuoco immune a Incendiato');
  // ogni elementale è immune ad A Terra (Stato)
  for (const id of ['elementale-acqua-maggiore', 'elementale-aria-maggiore', 'elementale-fuoco-maggiore', 'elementale-terra-maggiore']) {
    assert.ok(leggi(id).immunita.includes('a-terra'), `${id} immune ad A Terra`);
  }
});

test('movimento: Spada volante e Aria in volo (passo 0); Tappeto 2×1 fuori dal campo Spazio con A.167', () => {
  for (const id of ['spada-volante', 'elementale-aria-maggiore']) {
    const mv = leggi(id).movimento;
    assert.equal(mv.passo, 0);
    assert.ok(Number.isInteger(mv.volo) && mv.volo > 0, `${id} vola`);
  }
  const tap = leggi('tappeto-soffocante');
  assert.equal(tap.spazio, undefined, 'Tappeto 2×1 non quadrato: campo vuoto');
  assert.equal(tap.taglia, 'grande');
  assert.ok(/2 × 1 Q/.test(tap.note) && /A\.167/.test(tap.note));
  // gli Elementali 2×2 sono Grandi
  for (const id of ['elementale-acqua-maggiore', 'elementale-terra-maggiore']) {
    assert.equal(leggi(id).spazio, '2 × 2 Q');
    assert.equal(leggi(id).taglia, 'grande');
  }
});

test('GS/PX informativo e non calcolato', () => {
  assert.deepEqual(leggi('spada-volante').gs_px, { gs: 'Principiante', px: 10, per_pg: 4 });
  for (const id of ['elementale-acqua-maggiore', 'elementale-aria-maggiore', 'elementale-fuoco-maggiore', 'elementale-terra-maggiore']) {
    assert.deepEqual(leggi(id).gs_px, { gs: 'Eroe', px: 70, per_pg: 4 });
  }
});
