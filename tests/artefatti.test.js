// Tab Artefatti (docs/layout-sd.md, pezzo 4): stessa sintonizzazione e stessi effetti di prima (il
// confronto è con i valori del collaudo b, tests/collaudo.test.js); un Artefatto nel deposito comune
// non è sintonizzabile e non occupa capacità.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { STATO_DEPOSITO, contenitori } from '../src/equipaggiamento.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const p = deserializzaPersonaggio(readFileSync(new URL('collaudo/b_fratellanza_arcanista_l12.json', import.meta.url), 'utf8'));
const creazione = normalizza(p.creazione, dati).scelte;
const scheda = (c) => calcolaScheda({ creazione: c, livelli: p.livelli }, dati);
const bordoneUid = creazione.equipaggiamento.find((v) => /bordone/.test(v.rif ?? '')).uid;

test('Artefatto sintonizzato: stessi valori del collaudo b (Bordone Templare, sintonizzazione 4 su 7)', () => {
  const s = scheda(creazione);
  const [bordone] = s.equipaggiamento.armi;
  // come in tests/collaudo.test.js, collaudo b
  assert.deepEqual([bordone.va, bordone.danno.due_mani, bordone.attivazione.danno_extra], [2, '1d8+1', '1d6']);
  assert.deepEqual([s.equipaggiamento.sintonizzazione.capacita, s.equipaggiamento.sintonizzazione.usata], [7, 4]);
  assert.ok(s.equipaggiamento.sintonizzazione.artefatti.find((x) => x.uid === bordoneUid).sintonizzato);
});

test('deposito comune: l’Artefatto non è sintonizzabile, non occupa capacità e la sua riserva non alimenta; la scelta resta nella voce', () => {
  const inDeposito = { ...creazione, equipaggiamento: creazione.equipaggiamento.map((v) => (v.uid === bordoneUid ? { ...v, stato: STATO_DEPOSITO } : v)) };
  const s = scheda(inDeposito);
  const x = s.equipaggiamento.sintonizzazione.artefatti.find((a) => a.uid === bordoneUid);
  assert.deepEqual([x.sintonizzato, x.deposito], [false, true]);
  assert.equal(s.equipaggiamento.sintonizzazione.usata, 2);
  const c = contenitori(inDeposito.equipaggiamento, dati).find((y) => y.uid === bordoneUid);
  assert.deepEqual([c.sintonizzato, c.trasportato], [false, false]);
  // la voce conserva «sintonizzato»: tornando con sé, torna sintonizzato
  assert.equal(inDeposito.equipaggiamento.find((v) => v.uid === bordoneUid).sintonizzato, true);
  // nel deposito non è in mano: nessun VA per colpire
  assert.equal(s.equipaggiamento.armi.length, 0);
});
