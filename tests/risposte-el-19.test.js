// Risposte di Davide ai 19 quesiti dell'app (Doc E&L, sezione «Risposte ai 19 quesiti dell'app»,
// 29/09/2026). La numerazione dei test segue quella delle risposte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda, bonusDannoCaratteristica, caratteristicaDanno } from '../src/calc.js';
import { profiloSenzArmi, calcolaAttaccoRavvicinato, vincoliRavvicinato, moltiplicatoreMagistrale } from '../src/attacco.js';
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

// --- 6–11, 13, 14. Corpo a corpo -----------------------------------------------------------------

const conSpada = () => scheda([voce('s', 'armi:spada-lunga', 'impugnata')]);
const attacca = (s, arma, d = {}) => calcolaAttaccoRavvicinato({ scheda: s, sessione: {} }, arma, d, dati);
const vaDi = (s, nome) => s.abilita.find((a) => a.nome === nome);

test('E&L 7–8: Sbilanciare e Disarmare usano l’Abilità del mezzo dichiarato; l’opposizione la sceglie il bersaglio (A.28, A.41)', () => {
  const s = conSpada();
  const spada = s.equipaggiamento.armi[0];
  for (const manovra of ['sbilanciare', 'disarmare']) {
    const r = attacca(s, spada, { manovra });
    // con l'arma: la sua Abilità, anche se Corpo a corpo fosse maggiore; −4 all'attaccante
    assert.equal(r.scomposizione[0].etichetta, `VA ${spada.abilita}`, manovra);
    assert.equal(r.va_finale, (spada.vaEffettivo ?? spada.va) - 4, manovra);
    // senza scelta dell'opposizione: avviso; con la scelta, la Prova la nomina
    assert.ok(r.avvisi.some((x) => /sceglie prima del tiro/.test(x)), manovra);
    const contro = dati.regole.attacco_ravvicinato.manovre[manovra].prova.contro[1];
    const scelto = attacca(s, spada, { manovra, opposizione: contro });
    assert.equal(scelto.prova.opposizione, contro);
    assert.ok(!scelto.avvisi.some((x) => /sceglie prima del tiro/.test(x)));
  }
  // senz'armi: Corpo a corpo
  const nudo = profiloSenzArmi(s, dati);
  assert.equal(attacca(s, nudo, { manovra: 'sbilanciare', opposizione: 'Atletica' }).va_finale, vaDi(s, 'Corpo a corpo').totale - 4);
  // Immobilizzare resta sempre Corpo a corpo
  assert.equal(attacca(s, spada, { manovra: 'immobilizzare' }).scomposizione[0].etichetta, 'VA Corpo a corpo');
});

test('E&L 6: Spazzata anche senz’armi con Corpo a corpo, −4 contro due e −6 contro tre (A.27, A.42)', () => {
  const s = conSpada();
  const nudo = profiloSenzArmi(s, dati);
  assert.equal(vincoliRavvicinato({ scheda: s, sessione: {} }, nudo, { manovra: 'spazzata' }, dati).manovre.spazzata.motivo, null);
  const base = attacca(s, nudo).va_finale;
  assert.deepEqual([attacca(s, nudo, { manovra: 'spazzata', bersagli: 2 }).va_finale, attacca(s, nudo, { manovra: 'spazzata', bersagli: 3 }).va_finale], [base - 4, base - 6]);
  assert.ok(attacca(s, nudo, { manovra: 'spazzata' }).promemoria.some((x) => /adiacenti fra loro/.test(x)));
});

test('E&L 9: Incalzare è una Prova per colpire a −4 contro le Difese, spinta 2 Q, nessun danno (A.24)', () => {
  const s = conSpada();
  const spada = s.equipaggiamento.armi[0];
  const r = attacca(s, spada, { manovra: 'incalzare' });
  assert.deepEqual([r.prova.tipo, r.danno, r.va_finale], ['per_colpire', null, (spada.vaEffettivo ?? spada.va) - 4]);
  assert.ok(r.effetti.some((x) => /2 Q/.test(x)));
});

test('E&L 10: mano non dominante −4, niente con Combattere con due armi (A.23)', () => {
  const s = conSpada();
  const spada = s.equipaggiamento.armi[0];
  assert.equal(attacca(s, spada, { manoNonDominante: true }).va_finale, attacca(s, spada).va_finale - 4);
});

test('E&L 11: Magistrale ×2 → ×3, ×3 resta ×3; la regola dei bonus nel risultato (A.29)', () => {
  assert.deepEqual([1, 2, 3].map((m) => moltiplicatoreMagistrale(m, dati)), [2, 3, 3]);
  const s = conSpada();
  const r = attacca(s, s.equipaggiamento.armi[0], { manovra: 'affondo' });
  assert.ok(r.promemoria.includes(dati.regole.attacco_ravvicinato.magistrale.promemoria));
  assert.equal(dati.regole.attacco_ravvicinato.magistrale['TODO(Davide)'], undefined);
});

test('E&L 13: Copertura nel ravvicinato: −2 / −4, Migliorata −4 / −6, Totale impedisce l’attacco (A.25)', () => {
  const s = conSpada();
  const spada = s.equipaggiamento.armi[0];
  const base = attacca(s, spada).va_finale;
  const con = (copertura, coperturaMigliorata = false) => attacca(s, spada, { bersaglio: { copertura, coperturaMigliorata } });
  assert.deepEqual([con('leggera').va_finale, con('media').va_finale, con('leggera', true).va_finale, con('media', true).va_finale], [base - 2, base - 4, base - 4, base - 6]);
  assert.match(con('totale').impossibile.motivo, /Copertura Totale/);
});

test('E&L 14: Superiorità numerica: 1–2 → 0, 3–5 → +1, 6–7 → +2, 8+ → +3 (A.26)', () => {
  const s = conSpada();
  const spada = s.equipaggiamento.armi[0];
  const base = attacca(s, spada).va_finale;
  assert.deepEqual([2, 3, 5, 6, 7, 8, 12].map((n) => attacca(s, spada, { attaccanti: n }).va_finale - base), [0, 1, 1, 2, 2, 3, 3]);
});
