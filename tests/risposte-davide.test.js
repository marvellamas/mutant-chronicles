// Risposte di Davide del 28/09/2026 (Doc «per-davide.md», sezione 7): A.7–A.12, A.14, A.21.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { prossimoLivello } from '../src/character.js';
import { catalogo } from '../src/equipaggiamento.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE, LIVELLI_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const def = (rif) => catalogo(dati).perRif.get(rif);
/** Agente al 3° livello con la Specializzazione scelta come Talento Libero, e l'equipaggiamento dato. */
const conSpec = (spec, equipaggiamento) => calcolaScheda({
  creazione: { ...MISHIMA_AGENTE, equipaggiamento },
  livelli: [LIVELLI_AGENTE[0], { livello: 3, talentoLibero: { id: spec } }],
}, dati);
const arma = (s, uid) => s.equipaggiamento.armi.find((a) => a.uid === uid);

// --- A.7, A.9, A.11, A.12: famiglie e Specializzazioni -------------------------------------

test('A.9: Armi a Sega è una Specializzazione selezionabile e dà +1 VA e +1 danno al Chainreaper', () => {
  const p = prossimoLivello({ creazione: MISHIMA_AGENTE, livelli: [LIVELLI_AGENTE[0]] }, dati);
  const t = p.talentiLiberi.find((x) => x.id === 'specializzazione-armi-a-sega');
  assert.deepEqual([t.nome, t.ammesso], ['Specializzazione in Armi a Sega', true]);
  const senza = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [voce('c', 'armi_corporative:chainreaper', 'impugnata')] }, livelli: [LIVELLI_AGENTE[0]] }, dati);
  const con = conSpec('specializzazione-armi-a-sega', [voce('c', 'armi_corporative:chainreaper', 'impugnata')]);
  assert.equal(arma(con, 'c').va - arma(senza, 'c').va, 1);
  assert.equal(arma(con, 'c').bonusDanno, 1);
  assert.equal(arma(con, 'c').specializzazione, 'Specializzazione in Armi a Sega');
  assert.equal(def('armi_corporative:chainreaper').abilita, 'Armi da guerra'); // la famiglia non cambia l'Abilità
});

test('A.11: Panzerknacker nei Fucili d’Assalto; i moduli integrati tengono la propria Specializzazione', () => {
  assert.equal(def('armi_distanza_corporative:panzerknacker').specializzazione, 'specializzazione-fucili-d-assalto');
  assert.equal(def('armi_distanza_corporative:lanciagranate-panzerknacker').specializzazione, 'specializzazione-lanciagranate');
  assert.equal(def('armi_distanza_corporative:lanciagranate-volcano').specializzazione, 'specializzazione-lanciagranate');
  assert.equal(def('armi_distanza_corporative:lanciafiamme-eruptor').specializzazione, 'specializzazione-lanciafiamme');
  for (const [id, sp] of [['eruptor', 'fucili-di-precisione'], ['justifier', 'mitragliatori'], ['windrider-n4', 'carabine'], ['volcano', 'fucili-d-assalto']]) {
    assert.equal(def(`armi_distanza_corporative:${id}`).specializzazione, `specializzazione-${sp}`, id);
  }
});

test('A.7 e A.12: Pistola mitragliatrice compatta e pistole corporative in Pistole; Hellblazer in Armi al Plasma con Armi leggere', () => {
  assert.equal(def('armi_distanza:pistola-mitragliatrice-compatta').specializzazione, 'specializzazione-pistole');
  assert.equal(def('armi_distanza_corporative:mp105').specializzazione, 'specializzazione-pistole');
  assert.equal(def('armi_distanza_corporative:mp105gw').specializzazione, 'specializzazione-carabine');
  assert.equal(def('armi_distanza_corporative:nemesis-21').specializzazione, 'specializzazione-carabine');
  assert.equal(def('armi_distanza_corporative:nimrod-autocannon').specializzazione, 'specializzazione-mitragliatori');
  assert.deepEqual([def('armi_distanza_corporative:hellblazer').specializzazione, def('armi_distanza_corporative:hellblazer').abilita], ['specializzazione-armi-al-plasma', 'Armi leggere']);
});

test('A.12: SA30 a dardi, Specializzazione Pistole con +1 VA ma nessun +1 danno (Danno calibrato)', () => {
  const senza = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [voce('s', 'armi_distanza_corporative:sa30-a-dardi', 'impugnata'), voce('p', 'armi_distanza:pistola-semiautomatica', 'impugnata')] }, livelli: [LIVELLI_AGENTE[0]] }, dati);
  const con = conSpec('specializzazione-pistole', [voce('s', 'armi_distanza_corporative:sa30-a-dardi', 'impugnata'), voce('p', 'armi_distanza:pistola-semiautomatica', 'impugnata')]);
  assert.equal(arma(con, 's').va - arma(senza, 's').va, 1);
  assert.equal(arma(con, 's').bonusDanno, 0);
  assert.equal(arma(con, 'p').bonusDanno, 1); // le altre pistole hanno il +1 danno
});

test('A.8: Pugnale in mischia con Coltelli e Pugnali, lanciato con Armi da Lancio, mai cumulate', () => {
  const equip = [voce('m', 'armi:pugnale', 'impugnata'), voce('l', 'armi_distanza:pugnale', 'impugnata')];
  const mischia = conSpec('specializzazione-coltelli-e-pugnali', equip);
  assert.equal(arma(mischia, 'm').specializzazione, 'Specializzazione in Coltelli e Pugnali');
  assert.equal(arma(mischia, 'l').specializzazione, null);
  const lancio = conSpec('specializzazione-armi-da-lancio', equip);
  assert.equal(arma(lancio, 'm').specializzazione, null);
  assert.equal(arma(lancio, 'l').specializzazione, 'Specializzazione in Armi da Lancio');
  assert.equal(arma(lancio, 'l').bonusDanno, 1);
  // Ascia leggera: Asce in mischia, Armi da Lancio al lancio
  assert.equal(def('armi:ascia-leggera').specializzazione, 'specializzazione-asce');
  assert.equal(def('armi_distanza:ascia-leggera').specializzazione, 'specializzazione-armi-da-lancio');
});

test('controllo finale: ogni arma del catalogo ha una Specializzazione, salvo la Rainy Dayer (A.13, aperta)', () => {
  const senza = catalogo(dati).oggetti.filter((o) => (o.tipo === 'arma_ravvicinata' || o.tipo === 'arma_distanza') && !o.specializzazione).map((o) => o.nome);
  assert.deepEqual(senza, ['Rainy Dayer']);
});
