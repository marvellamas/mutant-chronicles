// «Prima parte» del catalogo (cap. 8 del Manuale dei Mostri v0.18, le quindici schede prima dei blocchi tematici):
// profili validi, ingombri non quadrati nelle note con A.167, attacchi senza danno come capacità, modulo tana
// dell'Aboleth come capacità distinte, GS/PX informativo (la variante con tana solo nella nota).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));

const PRIMA = ['aarakocra', 'aboleth', 'ankheg', 'arpia', 'basilisco', 'bestia-distorcente', 'bulette', 'chimera',
  'cockatrice', 'ettercap', 'grick', 'grifone', 'ippogrifo', 'manticora', 'orsogufo'];

test('le quindici schede ci sono, sono valide e vengono dal cap. 8', () => {
  for (const id of PRIMA) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0\.18.*prime quindici schede/);
  }
});

test('Spazio: quadrato nel campo; Aboleth 2×3, Basilisco 2×1, Grick 1×2 nelle note con A.167', () => {
  for (const id of ['aarakocra', 'arpia', 'cockatrice', 'ettercap']) assert.equal(leggi(id).spazio, '1 Q', id);
  for (const id of ['ankheg', 'bestia-distorcente', 'bulette', 'chimera', 'grifone', 'ippogrifo', 'manticora', 'orsogufo']) {
    assert.equal(leggi(id).spazio, '2 × 2 Q', id);
    assert.equal(leggi(id).taglia, 'grande', `${id} Grande (ingombro 2 × 2 Q)`);
  }
  for (const [id, ingombro] of [['aboleth', '2 × 3 Q'], ['basilisco', '2 × 1 Q'], ['grick', '1 × 2 Q']]) {
    const n = leggi(id);
    assert.equal(n.spazio, undefined, `${id} senza spazio quadrato`);
    assert.ok(n.note.includes(ingombro) && n.note.includes('A.167'), `${id} ingombro e A.167`);
  }
  // Taglia Grande: l'Aboleth perché il manuale lo dice (massa pari a un veicolo); Basilisco e Grick no (ingombro piccolo)
  assert.equal(leggi('aboleth').taglia, 'grande');
  assert.equal(leggi('basilisco').taglia, undefined);
  assert.equal(leggi('grick').taglia, undefined);
});

test('attacchi senza danno o ad area → capacità', () => {
  const att = (id) => leggi(id).attacchi.map((a) => a.nome);
  const cap = (id) => leggi(id).capacita.map((c) => c.nome);
  assert.deepEqual(att('arpia'), ['Artigli', 'Randello']);
  assert.ok(cap('arpia').includes('Canto di richiamo'));
  assert.deepEqual(att('basilisco'), ['Morso']);
  assert.ok(cap('basilisco').includes('Sguardo pietrificante'));
  assert.deepEqual(att('ettercap'), ['Morso', 'Artigli']);
  assert.ok(cap('ettercap').includes('Getto di seta'));
  assert.deepEqual(att('chimera'), ['Morso', 'Corna', 'Artigli']);
  assert.ok(cap('chimera').includes('Soffio di fuoco'));
  assert.deepEqual(att('ankheg'), ['Morso']);
  assert.ok(cap('ankheg').includes('Getto acido'));
  assert.deepEqual(att('bulette'), ['Morso']);
  assert.ok(cap('bulette').includes('Balzo dirompente'));
});

test('Manticora: Spina caudale è un attacco a distanza (massimo 40 Q), con la riserva e la tabella nelle capacità', () => {
  const spina = leggi('manticora').attacchi.find((a) => a.nome === 'Spina caudale');
  assert.deepEqual([spina.tipo, spina.gittata_q, spina.modalita], ['distanza', 40, ['S']]);
  const cap = leggi('manticora').capacita.find((c) => c.nome === 'Spine caudali');
  assert.match(cap.effetto, /24 spine/);
  assert.match(cap.effetto, /12 a 1–10 Q, 10 a 11–20 Q, 8 a 21–40 Q/);
});

test('Aboleth: capacità con PM dai dati e modulo tana come capacità distinte; variante con tana solo nella nota', () => {
  const ab = leggi('aboleth');
  const per = (n) => ab.capacita.find((c) => c.nome === n);
  assert.equal(per('Assoggettare').risorsa, '6 PM');
  assert.deepEqual(per('Assoggettare').usi, { quanti: 3, per: 'giorno' });
  assert.equal(per('Drenaggio psichico').risorsa, '3 PM');
  assert.deepEqual(per('Drenaggio psichico').azioni, { principali: 2 });
  const tana = ab.capacita.filter((c) => /modulo tana/.test(c.nome));
  assert.equal(tana.length, 5, 'cinque voci del modulo tana');
  assert.deepEqual(ab.gs_px, { gs: 'Eroe', px: 70, per_pg: 4 });
  assert.match(ab.note, /Leggenda, 100 PX/);
  assert.equal(ab.azioni.principali, 3);
});

test('Aarakocra: giavellotto scagliato a 15 Q; Danza dei cinque venti con PM e un uso al giorno', () => {
  const g = leggi('aarakocra').attacchi.find((a) => a.nome === 'Giavellotto scagliato');
  assert.deepEqual([g.tipo, g.gittata_q], ['distanza', 15]);
  const danza = leggi('aarakocra').capacita.find((c) => c.nome === 'Danza dei cinque venti');
  assert.equal(danza.risorsa, '3 PM');
  assert.deepEqual(danza.usi, { quanti: 1, per: 'giorno' });
  assert.equal(leggi('aarakocra').movimento.volo, 10);
});

test('AR condizionale: nel campo il primo valore; la condizione è una capacità (Grick 1/4, Ankheg 3/1)', () => {
  assert.equal(leggi('grick').ar.totale, 1);
  assert.match(leggi('grick').capacita.find((c) => c.nome === 'Cute elastica').effetto, /AR totale 4/);
  assert.equal(leggi('ankheg').ar.totale, 3);
  assert.match(leggi('ankheg').note, /da A Terra scende a 1/);
});

test('GS/PX informativo e non calcolato (anche 33 PX)', () => {
  assert.deepEqual(leggi('arpia').gs_px, { gs: 'Esperto', px: 33, per_pg: 4 });
  assert.deepEqual(leggi('aarakocra').gs_px, { gs: 'Principiante', px: 11, per_pg: 4 });
  for (const id of PRIMA) assert.ok(Number.isInteger(leggi(id).gs_px.px) && leggi(id).gs_px.px > 0, `${id} PX`);
});
