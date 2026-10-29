// Blocco «Predatori e grandi erbivori» (cap. 8 del Manuale dei Mostri v0.23): dieci profili validi, Assalto e
// Impeto come capacità con la Tempra e la dimensione ammessa, attacchi con formula propria (Impeto, Calpestare)
// con la condizione nella nota, Masso e Pietra a distanza, Tigre 2 × 1 Q nelle note (A.167), GS/PX informativo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));

const PREDATORI = ['pantera', 'tigre', 'tigre-denti-a-sciabola', 'orso-polare', 'rinoceronte', 'elefante', 'mammut',
  'alce-gigante', 'scimmione', 'scimmione-gigante'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of PREDATORI) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0.(23|46).*Predatori e grandi erbivori/);
    assert.ok(n.capacita.some((c) => c.nome === 'Bestia selvaggia'), `${id} regole comuni`);
  }
});

test('Assalto/Impeto: una capacità con la Tempra e la dimensione ammesse dal manuale', () => {
  const cap = (id, n) => leggi(id).capacita.find((c) => c.nome === n)?.effetto ?? '';
  assert.match(cap('pantera', 'Assalto'), /Tempra senza modificatore a una creatura non maggiore di 1 × 1 Q/);
  assert.match(cap('tigre', 'Assalto'), /non maggiore di 2 × 2 Q/);
  assert.match(cap('tigre-denti-a-sciabola', 'Assalto'), /Tempra −2 a una creatura non maggiore di 2 × 2 Q/);
  assert.match(cap('elefante', 'Impeto'), /Tempra senza modificatore a una creatura non maggiore di 2 × 2 Q/);
  assert.match(cap('mammut', 'Impeto'), /Tempra −2 a una creatura non maggiore di 3 × 3 Q/);
  for (const id of ['pantera', 'tigre', 'elefante']) assert.match(cap(id, id === 'elefante' ? 'Impeto' : 'Assalto'), /almeno 4 Q di Passo rettilineo/);
});

test('attacchi con formula propria: Corno in Impeto, Calpestare, Zoccoli — condizione nella nota', () => {
  const att = (id, n) => leggi(id).attacchi.find((a) => a.nome === n);
  assert.equal(att('rinoceronte', 'Corno in Impeto').danno, '3d6+2');
  assert.match(att('rinoceronte', 'Corno in Impeto').note, /Tempra −2/);
  assert.equal(att('alce-gigante', 'Corna in Impeto').danno, '3d6+2');
  assert.equal(att('alce-gigante', 'Corna in Impeto').portata_q, 2);
  assert.match(att('alce-gigante', 'Zoccoli').note, /A Terra/);
  assert.equal(att('elefante', 'Calpestare').danno, '2d8+3');
  assert.equal(att('mammut', 'Calpestare').danno, '2d10+3');
  assert.equal(att('mammut', 'Zanne').portata_q, 2);
  assert.equal(att('elefante', 'Zanne').portata_q, 1);
});

test('Masso (20 Q, 2 AzP) e Pietra (6 Q) sono attacchi a distanza', () => {
  const masso = leggi('scimmione-gigante').attacchi.find((a) => a.nome === 'Masso');
  assert.deepEqual([masso.tipo, masso.gittata_q, masso.danno], ['distanza', 20, '3d6+3']);
  assert.match(masso.note, /2 AzP/);
  const pietra = leggi('scimmione').attacchi.find((a) => a.nome === 'Pietra');
  assert.deepEqual([pietra.tipo, pietra.gittata_q], ['distanza', 6]);
});

test('Spazio: Tigre 2 × 1 Q nel campo (taglia normale); Pantera 1; sciabola e gli altri 2 × 2 o 3 × 3 Grandi', () => {
  const t = leggi('tigre');
  assert.equal(t.spazio, '2 × 1 Q');
  assert.equal(t.taglia, undefined);
  assert.ok(!/A.167/.test(t.note));
  assert.equal(leggi('pantera').spazio, '1 Q');
  assert.equal(leggi('scimmione').spazio, '1 Q');
  for (const id of ['tigre-denti-a-sciabola', 'orso-polare', 'rinoceronte']) assert.equal(leggi(id).spazio, '2 × 2 Q', id);
  for (const id of ['elefante', 'mammut', 'alce-gigante', 'scimmione-gigante']) { assert.equal(leggi(id).spazio, '3 × 3 Q', id); assert.equal(leggi(id).taglia, undefined); }
});

test('Orso polare: Nuoto nelle capacità; GS/PX informativo', () => {
  assert.ok(leggi('orso-polare').capacita.some((c) => c.nome === 'Nuoto' && /6 \/ 12 \/ 18/.test(c.effetto)));
  assert.deepEqual(leggi('mammut').gs_px, { gs: 'Eroe', px: 70, per_pg: 4 });
  assert.deepEqual(leggi('pantera').gs_px, { gs: 'Inesperto', px: 20, per_pg: 4 });
});
