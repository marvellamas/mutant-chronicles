// Blocco «Sciami e piccola fauna» (cap. 8 del Manuale dei Mostri v0.23): dieci profili validi (quattro animali e
// sei Sciami), fasce di danno per PV, immunità collettive, Spazio condiviso, Frenesia, Imitazione, veleno ofidico.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));
const cap = (id, nome) => leggi(id).capacita.find((c) => c.nome === nome);

const ANIMALI = ['pipistrello', 'corvo', 'ratto', 'quipper'];
const SCIAMI = ['sciame-di-pipistrelli', 'sciame-di-corvi', 'sciame-di-ratti', 'sciame-di-insetti', 'sciame-di-quipper', 'sciame-di-serpenti-velenosi'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of [...ANIMALI, ...SCIAMI]) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0\.23.*Sciami e piccola fauna/);
    assert.ok(Number.isInteger(n.salvezze.volonta) && Number.isInteger(n.pm), `${id} Volontà e PM`);
    assert.equal(leggi(id).spazio, '1 Q', id);
  }
});

test('Sciami: due fasce di danno per PV (quello ridotto sostituisce l’altro), immunità collettive e corpo distribuito', () => {
  const attesi = {
    'sciame-di-pipistrelli': ['2d3', '1d3'], 'sciame-di-corvi': ['1d6+1', '1d3+1'], 'sciame-di-ratti': ['1d6+1', '1d3+1'],
    'sciame-di-insetti': ['2d4', '1d4'], 'sciame-di-quipper': ['2d6', '1d6'], 'sciame-di-serpenti-velenosi': ['2d6', '1d6'],
  };
  for (const [id, [alto, basso]] of Object.entries(attesi)) {
    const n = leggi(id);
    assert.deepEqual(n.attacchi.map((a) => a.danno), [alto, basso], id);
    assert.ok(n.attacchi.every((a) => /Portata 0 Q/.test(a.note) && a.portata_q === 1 && a.ac === 1), `${id} portata 0 Q in nota`);
    assert.deepEqual(n.immunita, ['a-terra', 'immobilizzato', 'stordito', 'terrorizzato'], id);
    assert.match(cap(id, 'Corpo distribuito').effetto, /Dimezza per eccesso/);
    assert.match(cap(id, 'Spazio condiviso').effetto, /1 × 1 Q/);
    assert.match(cap(id, 'Ferite e dispersione').effetto, /soglia di metà PV/);
  }
});

test('PV e soglie degli Sciami: 24 PV (28 quipper, 36 serpenti), fasce a 12 / 14 / 18 PV nei nomi degli attacchi', () => {
  for (const id of ['sciame-di-pipistrelli', 'sciame-di-corvi', 'sciame-di-ratti', 'sciame-di-insetti']) assert.equal(leggi(id).pv, 24, id);
  assert.equal(leggi('sciame-di-quipper').pv, 28);
  assert.equal(leggi('sciame-di-serpenti-velenosi').pv, 36);
  assert.deepEqual(leggi('sciame-di-quipper').attacchi.map((a) => a.nome), ['Morsi (PV 15–28)', 'Morsi (PV 0–14)']);
  assert.deepEqual(leggi('sciame-di-serpenti-velenosi').attacchi.map((a) => a.nome), ['Morsi (PV 19–36)', 'Morsi (PV 0–18)']);
});

test('animali singoli: nessuna immunità, nessuna fascia; Quipper senza moto a terra con Frenesia a VA 11', () => {
  for (const id of ANIMALI) { assert.equal(leggi(id).immunita, undefined, id); assert.equal(leggi(id).attacchi.length, 1, id); }
  assert.deepEqual(leggi('quipper').movimento, { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito' });
  assert.match(cap('quipper', 'Frenesia del sangue').effetto, /VA 11/);
  assert.match(cap('sciame-di-quipper', 'Frenesia del sangue').effetto, /VA 13/);
  assert.match(cap('quipper', 'Natura e risorse').effetto, /Respira soltanto acqua/);
});

test('movimento: volo di Pipistrello, Corvo e dei loro Sciami; Corvo con Imitazione, Sciame di corvi senza', () => {
  assert.equal(leggi('pipistrello').movimento.volo, 6);
  assert.equal(leggi('corvo').movimento.volo, 10);
  assert.equal(leggi('sciame-di-pipistrelli').movimento.volo, 6);
  assert.equal(leggi('sciame-di-corvi').movimento.volo, 10);
  assert.equal(leggi('sciame-di-pipistrelli').movimento.passo, 0);
  assert.match(cap('corvo', 'Imitazione').effetto, /Raggirare 8/);
  assert.equal(cap('sciame-di-corvi', 'Imitazione'), undefined);
  assert.deepEqual(leggi('corvo').abilita.find((a) => a.nome === 'Raggirare'), { nome: 'Raggirare', va: 8 });
});

test('Sciame di serpenti: veleno ofidico II come i Serpenti (1d6, 5 Round, Tempra senza modificatore); Sciame di insetti AR 1', () => {
  const v = cap('sciame-di-serpenti-velenosi', 'Veleno ofidico II');
  assert.match(v.effetto, /1d6 Naturale interno/);
  assert.match(v.effetto, /5 Round/);
  assert.match(v.effetto, /Tempra senza modificatore/);
  assert.deepEqual(leggi('sciame-di-serpenti-velenosi').movimento, { passo: 6, corsa: 12, scatto: 18 });
  assert.equal(leggi('sciame-di-insetti').ar.totale, 1);
  assert.deepEqual(leggi('sciame-di-quipper').gs_px, { gs: 'Esperto', px: 30, per_pg: 4 });
  assert.deepEqual(leggi('ratto').gs_px, { gs: 'Principiante', px: 10, per_pg: 4 });
});
