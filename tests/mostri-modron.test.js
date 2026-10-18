// Blocco «Costrutti e Modron» (cap. 8 del Manuale dei Mostri v0.23): dieci profili validi, PM e Volontà assenti
// con `senza_salvezza`, immunità solo negli Stati dell'app, armi della dotazione, Gas, Furia, trasferimento, Spazio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));
const cap = (id, nome) => leggi(id).capacita.find((c) => c.nome === nome);

const GUARDIANI = ['spaventapasseri', 'orrore-in-elmo', 'golem-di-carne', 'golem-di-argilla', 'guardiano-protettore'];
const MODRON = ['monodrone', 'duodrone', 'tridrone', 'quadrone', 'pentadrone'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of [...GUARDIANI, ...MODRON]) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0\.23.*Costrutti e Modron/);
  }
});

test('PM — e Volontà —: Golem di argilla e Guardiano senza `pm` e con `senza_salvezza`; gli altri li hanno', () => {
  for (const id of ['golem-di-argilla', 'guardiano-protettore']) {
    const n = leggi(id);
    assert.equal(n.pm, undefined, id);
    assert.deepEqual(n.senza_salvezza, ['volonta'], id);
    assert.equal(n.salvezze.volonta, undefined, id);
  }
  for (const id of ['spaventapasseri', 'orrore-in-elmo', 'golem-di-carne', ...MODRON]) assert.ok(Number.isInteger(leggi(id).pm) && Number.isInteger(leggi(id).salvezze.volonta), id);
});

test('Spazio quadrato dai dati e nessuna Taglia dedotta (A.167): 2 × 2 Q per Golem di argilla, Guardiano e Pentadrone', () => {
  for (const id of ['golem-di-argilla', 'guardiano-protettore', 'pentadrone']) assert.equal(leggi(id).spazio, '2 × 2 Q', id);
  for (const id of ['spaventapasseri', 'orrore-in-elmo', 'golem-di-carne', 'monodrone', 'duodrone', 'tridrone', 'quadrone']) assert.equal(leggi(id).spazio, '1 Q', id);
  for (const id of [...GUARDIANI, ...MODRON]) assert.equal(leggi(id).taglia, undefined, id);
});

test('immunità negli Stati solo per ciò che è uno Stato; i Modron, viventi, non ne hanno', () => {
  assert.deepEqual(leggi('spaventapasseri').immunita, ['avvelenato', 'sanguinamento', 'terrorizzato']);
  assert.deepEqual(leggi('orrore-in-elmo').immunita, ['avvelenato', 'sanguinamento', 'accecato', 'assordato', 'terrorizzato', 'stordito']);
  assert.deepEqual(leggi('golem-di-argilla').immunita, ['avvelenato', 'sanguinamento']);
  for (const id of MODRON) assert.equal(leggi(id).immunita, undefined, id);
  assert.match(cap('golem-di-carne', 'Corpo animato').effetto, /Sonno/);
});

test('Orrore in elmo: AR 6 con Scudo (4 senza) in nota; Spada lunga e Tre sigilli', () => {
  const o = leggi('orrore-in-elmo');
  assert.equal(o.ar.totale, 6);
  assert.match(o.note, /AR 6 con Scudo medio, 4 senza/);
  assert.equal(o.attacchi[0].danno, '1d8+3');
  assert.match(cap('orrore-in-elmo', 'Tre sigilli').effetto, /Respingere, Dardo Spirituale e Maledizione/);
  assert.equal(o.movimento.volo, 6);
});

test('Golem: Schianto Magico; assorbimento 4 PV (carne) e 6 PV (argilla), Furia a 24 e 36 PV, Colpo maledetto', () => {
  assert.equal(leggi('golem-di-carne').attacchi[0].natura, 'Magico');
  assert.match(cap('golem-di-carne', 'Assorbimento elettrico').effetto, /4 PV complessivi per Round/);
  assert.match(cap('golem-di-carne', 'Furia').effetto, /24 PV o meno/);
  assert.match(cap('golem-di-argilla', 'Furia').effetto, /36 PV o meno/);
  assert.match(cap('golem-di-argilla', 'Magia e assorbimento').effetto, /6 PV complessivi per Round/);
  assert.match(cap('golem-di-argilla', 'Colpo maledetto').effetto, /riduce di 2 il massimo dei PV/);
  assert.deepEqual(cap('golem-di-argilla', 'Accelerazione').azioni, { principali: 1 });
});

test('Spaventapasseri e Guardiano: Sguardo (2 PM, 1 AzP), trasferimento a metà entro 12 Q, carica di Armatura di Forza 3', () => {
  const s = cap('spaventapasseri', 'Sguardo terribile');
  assert.deepEqual([s.azioni, s.risorsa], [{ principali: 1 }, '2 PM']);
  assert.match(s.effetto, /Paralizzato per 1 Round/);
  assert.match(cap('guardiano-protettore', 'Trasferimento del danno').effetto, /entro 12 Q.*metà per eccesso/);
  assert.match(cap('guardiano-protettore', 'Carica preparata').effetto, /\+2 AR Magica per 10 Round/);
  assert.match(cap('guardiano-protettore', 'Rigenerazione').effetto, /3 PV/);
});

test('Modron: armi della dotazione come attacchi (gittata 15 / 15 / 18 / Arco 100), Pentadrone con 3 dosi di gas al giorno', () => {
  const gittata = (id, nome) => leggi(id).attacchi.find((a) => a.nome === nome).gittata_q;
  assert.equal(gittata('monodrone', 'Giavellotto lanciato'), 15);
  assert.equal(gittata('duodrone', 'Giavellotto lanciato'), 15);
  assert.equal(gittata('tridrone', 'Giavellotto lanciato'), 18);
  assert.equal(gittata('quadrone', 'Arco da guerra'), 100);
  const g = cap('pentadrone', 'Gas paralizzante');
  assert.deepEqual(g.usi, { quanti: 3, per: 'giorno' });
  assert.deepEqual(g.azioni, { principali: 1 });
  assert.match(g.effetto, /Avvelenato e Paralizzato per 3 Round/);
  assert.equal(leggi('monodrone').movimento.volo, 6);
  assert.equal(leggi('quadrone').movimento.volo, 6);
});

test('GS/PX informativo, anche i valori non tondi dei Modron (11 / 22 / 22 / 33)', () => {
  const px = Object.fromEntries(MODRON.map((id) => [id, leggi(id).gs_px.px]));
  assert.deepEqual(px, { monodrone: 11, duodrone: 22, tridrone: 22, quadrone: 33, pentadrone: 50 });
  assert.deepEqual(leggi('golem-di-argilla').gs_px, { gs: 'Eroe', px: 70, per_pg: 4 });
});
