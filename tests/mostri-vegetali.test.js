// Blocco «Vegetali e custodi delle foreste» (cap. 8 del Manuale dei Mostri v0.18): dieci profili validi, Rovi
// viventi e poteri a PM come capacità, Abilità non del catalogo nelle note (A.169), Spazio quadrato, GS/PX.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));

const VEGETALI = ['arbusto-risvegliato', 'albero-risvegliato', 'avvizzito-ramoso', 'avvizzito-spinoso', 'avvizzito-rampicante',
  'driade', 'cumulo-strisciante', 'treant', 'pegaso', 'unicorno'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of VEGETALI) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0\.18.*Vegetali e custodi delle foreste/);
    // tutti hanno una mente e PM personali: Volontà e PM presenti
    assert.ok(Number.isInteger(n.salvezze.volonta) && Number.isInteger(n.pm), `${id} Volontà e PM`);
  }
});

test('Rovi viventi: stessa capacità (3 PM, 1 AzP) per rampicante, Driade e Unicorno', () => {
  for (const id of ['avvizzito-rampicante', 'driade', 'unicorno']) {
    const rovi = leggi(id).capacita.find((c) => c.nome === 'Rovi viventi');
    assert.ok(rovi, `${id} ha Rovi viventi`);
    assert.equal(rovi.risorsa, '3 PM');
    assert.deepEqual(rovi.azioni, { principali: 1 });
    assert.match(rovi.effetto, /potenza 3/);
  }
  assert.ok(!leggi('treant').capacita.some((c) => c.nome === 'Rovi viventi'));
});

test('poteri a PM e usi dai dati (Animare alberi, Passaggio del guardiano, Tocco risanante, Fascino silvano)', () => {
  const per = (id, n) => leggi(id).capacita.find((c) => c.nome === n);
  assert.equal(per('treant', 'Animare alberi').risorsa, '6 PM');
  assert.deepEqual(per('treant', 'Animare alberi').usi, { quanti: 1, per: 'giorno' });
  assert.equal(per('unicorno', 'Passaggio del guardiano').risorsa, '9 PM');
  assert.deepEqual(per('unicorno', 'Tocco risanante').usi, { quanti: 3, per: 'giorno' });
  assert.equal(per('driade', 'Fascino silvano').risorsa, '3 PM');
  assert.equal(per('driade', 'Corteccia').risorsa, '3 PM');
  assert.equal(per('driade', 'Ramo incantato').risorsa, '2 PM');
});

test('attacchi: Aghi e Roccia a distanza; Afferrare, Inglobare, Comprimere, Fascino sono capacità; Corno in carica è un attacco', () => {
  const aghi = leggi('avvizzito-spinoso').attacchi.find((a) => a.nome === 'Aghi');
  assert.deepEqual([aghi.tipo, aghi.gittata_q], ['distanza', 12]);
  const roccia = leggi('treant').attacchi.find((a) => a.nome === 'Roccia');
  assert.deepEqual([roccia.tipo, roccia.gittata_q, roccia.danno], ['distanza', 36, '3d6+3']);
  assert.deepEqual(leggi('cumulo-strisciante').attacchi.map((a) => a.nome), ['Schianto']);
  for (const n of ['Afferrare', 'Inglobare', 'Comprimere']) assert.ok(leggi('cumulo-strisciante').capacita.some((c) => c.nome === n), n);
  assert.deepEqual(leggi('driade').attacchi.map((a) => a.nome), ['Randello', 'Randello incantato']);
  assert.equal(leggi('driade').attacchi[1].natura, 'Magico');
  const carica = leggi('unicorno').attacchi.find((a) => a.nome === 'Corno in carica');
  assert.deepEqual([carica.va, carica.danno, carica.natura, carica.portata_q], [14, '2d6+2', 'Magico', 1]);
});

test('Abilità del manuale non nel catalogo: Diplomazia → Oratoria (Giocatore), Tiro naturale solo in nota (A.169)', () => {
  assert.ok(leggi('driade').abilita.some((a) => a.nome === 'Oratoria' && a.va === 13));
  assert.match(leggi('driade').note, /Diplomazia 13/);
  for (const id of ['avvizzito-spinoso', 'treant']) {
    assert.ok(!leggi(id).abilita.some((a) => /naturale/i.test(a.nome)), `${id}: nessuna Abilità inventata`);
    assert.match(leggi(id).note, /Tiro naturale \d+ .*A\.169/);
  }
  // recuperate nelle note degli Elementali del blocco precedente
  assert.match(leggi('elementale-acqua-maggiore').note, /Attacco a distanza 14 .*A\.169/);
  assert.match(leggi('elementale-terra-maggiore').note, /Prove di FOR 15 .*A\.169/);
});

test('Spazio quadrato dai dati; Grandi dove l’ingombro è 2×2 o più', () => {
  for (const id of ['arbusto-risvegliato', 'avvizzito-ramoso', 'avvizzito-spinoso', 'avvizzito-rampicante', 'driade']) assert.equal(leggi(id).spazio, '1 Q', id);
  for (const id of ['cumulo-strisciante', 'pegaso', 'unicorno']) { assert.equal(leggi(id).spazio, '2 × 2 Q', id); assert.equal(leggi(id).taglia, 'grande'); }
  for (const id of ['albero-risvegliato', 'treant']) { assert.equal(leggi(id).spazio, '3 × 3 Q', id); assert.equal(leggi(id).taglia, 'grande'); }
});

test('movimento: Pegaso a terra 12/24/36 e in volo 18; GS/PX informativo (Treant Leggenda 100)', () => {
  assert.deepEqual(leggi('pegaso').movimento, { passo: 12, corsa: 24, scatto: 36, volo: 18 });
  assert.deepEqual(leggi('treant').gs_px, { gs: 'Leggenda', px: 100, per_pg: 4 });
  assert.deepEqual(leggi('driade').gs_px, { gs: 'Esperto', px: 33, per_pg: 4 });
  assert.deepEqual(leggi('unicorno').immunita, ['avvelenato']);
});
