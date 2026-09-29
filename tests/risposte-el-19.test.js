// Risposte di Davide ai 19 quesiti dell'app (Doc E&L, sezione «Risposte ai 19 quesiti dell'app»,
// 29/09/2026). La numerazione dei test segue quella delle risposte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda, bonusDannoCaratteristica, caratteristicaDanno } from '../src/calc.js';
import { profiloSenzArmi } from '../src/attacco.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const scheda = (equipaggiamento = [], livelli = [], extra = {}) => calcolaScheda({ creazione: { ...MISHIMA_AGENTE, ...extra, equipaggiamento }, livelli }, dati);

// --- 12. Bonus di Caratteristica al danno; danno senz'armi -------------------------------------

test('E&L 12: tabella del bonus di Caratteristica al danno con il tetto di livello (§5.13)', () => {
  const b = (valore, livello) => bonusDannoCaratteristica(valore, livello, dati.regole);
  assert.deepEqual([1, 5, 6, 7, 8, 9, 10].map((v) => b(v, 20)), [0, 0, 1, 1, 2, 2, 3]);
  // tetto: +1 ai livelli 1–7, +2 agli 8–14, +3 dal 15°
  assert.deepEqual([b(10, 1), b(10, 7), b(10, 8), b(10, 14), b(10, 15)], [1, 1, 2, 2, 3]);
  assert.equal(b(8, 3), 1); // FOR 8 al 3° livello: +1, non +2
  assert.equal(b(3, 20), 0); // mai sotto 0
  // Caratteristica: quella dell'Abilità dell'arma; Armi pesanti usa INT
  assert.deepEqual(['Armi da guerra', 'Armi da mischia', 'Corpo a corpo', 'Armi leggere', 'Armi medie', 'Armi pesanti', 'Armi da lancio'].map((a) => caratteristicaDanno(a, dati)),
    ['FOR', 'DES', 'FOR', 'DES', 'INT', 'INT', 'DES']);
});

test('E&L 12: FOR 8 al 3° livello dà +1 al danno di un’arma da guerra, non +2', () => {
  const livelli = [{ livello: 2, caratteristiche: { FOR: 2 } }, { livello: 3, talentoLibero: { id: 'iniziativa-migliorata' } }];
  const s = scheda([voce('s', 'armi:spada-lunga', 'impugnata')], livelli);
  assert.deepEqual([s.livello, s.caratteristiche.FOR.valore], [3, 8]);
  const spada = s.equipaggiamento.armi[0];
  assert.equal(spada.abilita, 'Armi da guerra');
  assert.deepEqual(spada.bonusCaratteristica, { sigla: 'FOR', valore: 8, bonus: 1, esclusoDa: null });
  // senz'armi: 1d4 + FOR, stesso tetto
  const nudo = profiloSenzArmi(s, dati);
  assert.deepEqual([nudo.danno.una_mano, nudo.bonusCaratteristica.bonus], ['1d4+1', 1]);
});

test('E&L 12: Danno calibrato (SA30, SA50F) esclude il bonus di Caratteristica e quello della Specializzazione', () => {
  const s = scheda([voce('d', 'armi_distanza_corporative:sa30-a-dardi', 'impugnata'), voce('f', 'armi_distanza_corporative:sa50f-a-dardi', 'impugnata')]);
  for (const a of s.equipaggiamento.armi) {
    assert.deepEqual([a.bonusCaratteristica.bonus, a.bonusCaratteristica.esclusoDa], [0, 'Danno calibrato'], a.nome);
  }
  assert.equal(dati.equipaggiamento.file.armi_distanza_corporative.oggetti.find((o) => o.id === 'sa50f-a-dardi').specializzazione_danno, false);
});

test('E&L 12: nessun TODO sul danno senz’armi; il dado di base è 1d4', () => {
  const S = dati.regole.attacco_ravvicinato.senz_armi;
  assert.equal(S.danno, '1d4');
  assert.equal(S['TODO(Davide)'], undefined);
});
