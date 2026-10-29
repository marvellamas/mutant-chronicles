// Blocco «Giganti e abitanti delle montagne» (cap. 8 del Manuale dei Mostri v0.16): i dieci profili prestabiliti
// sono validi, con gli attacchi ad area / senza VA come capacità, i poteri innati a PM come capacità con
// risorsa, Difese = Parata per i giganti corazzati, GS/PX informativo e Spazio quadrato (2×2 o 3×3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));

const GIGANTI = ['ciclope', 'gigante-delle-colline', 'gigante-delle-pietre', 'gigante-del-gelo', 'gigante-del-fuoco',
  'gigante-delle-nuvole', 'gigante-delle-tempeste', 'fomorian', 'yeti', 'yeti-abominevole'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of GIGANTI) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0.(16|46).*Giganti e abitanti delle montagne/);
  }
});

test('attacchi ad area / senza VA come capacità; il Masso è un attacco a distanza', () => {
  // Scarica tempestosa (Storm), Malocchio/Deformazione (Fomorian), Sguardo/Soffio (Yeti) sono capacità
  assert.ok(!leggi('gigante-delle-tempeste').attacchi.some((a) => a.nome === 'Scarica tempestosa'));
  assert.ok(leggi('gigante-delle-tempeste').capacita.some((c) => c.nome === 'Scarica tempestosa'));
  assert.ok(leggi('fomorian').capacita.some((c) => c.nome === 'Malocchio'));
  assert.ok(leggi('yeti-abominevole').capacita.some((c) => c.nome === 'Soffio gelido'));
  // il Masso c'è come attacco di tipo distanza (gittata 30, solo Colpo Singolo)
  const masso = leggi('ciclope').attacchi.find((a) => a.nome === 'Masso');
  assert.deepEqual([masso.tipo, masso.gittata_q, masso.modalita], ['distanza', 30, ['S']]);
});

test('poteri innati a PM come capacità con risorsa', () => {
  const nebbia = leggi('gigante-delle-nuvole').capacita.find((c) => c.nome === 'Nebbia');
  assert.equal(nebbia.risorsa, '2 PM');
  const scarica = leggi('gigante-delle-tempeste').capacita.find((c) => c.nome === 'Scarica tempestosa');
  assert.equal(scarica.risorsa, '6 PM');
  assert.deepEqual(scarica.usi, { quanti: 1, per: 'Round' });
});

test('giganti corazzati: Difese = Parata, Schivata nelle note; AR somma biologica + armatura', () => {
  assert.equal(leggi('gigante-del-fuoco').difese, 13);
  assert.equal(leggi('gigante-del-fuoco').ar.totale, 6);
  assert.match(leggi('gigante-del-fuoco').note, /Schivata 11/);
  assert.equal(leggi('gigante-delle-tempeste').difese, 15);
  assert.match(leggi('gigante-delle-tempeste').note, /Schivata 14/);
  // il Gigante del fuoco è immune a Incendiato (Stato)
  assert.ok(leggi('gigante-del-fuoco').immunita.includes('incendiato'));
});

test('Spazio quadrato e taglia Grande; GS/PX informativo (anche i valori non tondi 77/100/110)', () => {
  for (const id of GIGANTI) {
    const n = leggi(id);
    assert.ok(n.spazio === '2 × 2 Q' || n.spazio === '3 × 3 Q', `${id} spazio quadrato`);
    assert.equal(n.taglia, undefined, `${id} Grande`);
    assert.ok(Number.isInteger(n.gs_px.px) && n.gs_px.px > 0, `${id} PX`);
  }
  assert.equal(leggi('ciclope').gs_px.px, 77);
  assert.equal(leggi('gigante-delle-tempeste').gs_px.px, 110);
  assert.equal(leggi('yeti-abominevole').gs_px.px, 100);
});
