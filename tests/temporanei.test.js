// Modificatori temporanei di Caratteristica (primo playtest, 05/10/2026): src/temporanei.js e cascata nel calcolo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { valoriTavolo } from '../src/condizioni.js';
import { inizializzaSessione, massimiSessione, modificaSessione, nuovoRoundSessione, nuovaSessione } from '../src/sessione.js';
import { variaTemporaneo, durataTemporaneo, togliTemporaneo, testiTemporanei, derivatiDi } from '../src/temporanei.js';
import { alRound, tecnicheScadute } from '../src/round-scontro.js';
import { preparaStampa } from '../src/stampa.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const R = dati.regole.caratteristiche_temporanee;
const creazione = copia(MISHIMA_AGENTE);
const riposo = calcolaScheda({ creazione, livelli: [] }, dati);
const m = massimiSessione(riposo, creazione, dati);
const sessioneCon = (lista, extra = {}) => modificaSessione(inizializzaSessione(m), { caratteristicheTemporanee: lista, ...extra }, m);
const scheda = (sessione) => calcolaScheda({ creazione, livelli: [], sessione }, dati);
const ab = (s, n) => s.abilita.find((a) => a.nome === n);

test('cascata: SAG +2 cambia le Abilità di SAG e la Prova Salvezza di Magia, non il resto né i PM massimi', () => {
  // − / + due volte: SAG 7 → 9
  let s0 = inizializzaSessione(m);
  s0 = sessioneCon(variaTemporaneo(s0, 'SAG', 1, R));
  const sess = sessioneCon(variaTemporaneo(s0, 'SAG', 1, R));
  const s = scheda(sess);
  assert.equal(s.caratteristiche.SAG.valore, riposo.caratteristiche.SAG.valore + 2);
  assert.equal(s.caratteristiche.SAG.base, riposo.caratteristiche.SAG.valore);
  const dMod = s.caratteristiche.SAG.mod - riposo.caratteristiche.SAG.mod;
  assert.ok(dMod > 0);
  // Percezione (SAG): sale del Mod, se il limite della categoria lo permette; la provenienza lo dice
  const p = ab(s, 'Percezione');
  assert.ok(p.grezzo - ab(riposo, 'Percezione').grezzo === dMod);
  assert.ok(p.provenienza.righe.some((r) => /^Mod SAG/.test(r.fonte) && /modificatore temporaneo/.test(r.nota ?? '')));
  // Prova Salvezza di Magia (SAG) sì, Tempra (COS) no
  assert.ok(s.salvezze.magia.totale > riposo.salvezze.magia.totale);
  assert.equal(s.salvezze.tempra.totale, riposo.salvezze.tempra.totale);
  // Abilità di altre Caratteristiche invariate; PM massimi invariati (massimi_pv_pm: false, A.120)
  assert.equal(ab(s, 'Furtività').totale, ab(riposo, 'Furtività').totale);
  assert.equal(s.pm, riposo.pm);
  assert.equal(s.pv, riposo.pv);
});

test('DES −2: Iniziativa e Difese scendono; la stampa resta a riposo con la riga dei modificatori', () => {
  const sess = sessioneCon([{ sigla: 'DES', valore: -2, numero: 3, unita: 'round', dal: 1 }]);
  const s = scheda(sess);
  assert.ok(valoriTavolo(s, sess, dati).iniziativa.effettivo < valoriTavolo(riposo, null, dati).iniziativa.effettivo);
  assert.ok(ab(s, 'Difese').grezzo < ab(riposo, 'Difese').grezzo);
  const st = preparaStampa({ creazione, livelli: [], sessione: sess }, dati);
  assert.equal(st.scheda.caratteristiche.DES.valore, riposo.caratteristiche.DES.valore);
  assert.deepEqual(testiTemporanei(sess, dati), ['DES −2 (fino al Round 3)']);
  assert.deepEqual(st.fogli.find((f) => f.id === 'identita').dati.modificatoriTemporanei, ['DES −2 (fino al Round 3)']);
});

test('scadenza in Round: con il contatore della scheda e con quello dello scontro; a tempo resta', () => {
  let sess = sessioneCon([{ sigla: 'FOR', valore: 2, numero: 2, unita: 'round', dal: 1 }, { sigla: 'CAR', valore: 1, numero: 2, unita: 'ore', dal: 1 }]);
  assert.equal(scheda(sess).caratteristiche.FOR.temporaneo, 2);
  sess = nuovoRoundSessione(sess, m); // Round 2: vale ancora (Round 1 e 2)
  assert.equal(sess.caratteristicheTemporanee.length, 2);
  const dopo = nuovoRoundSessione(sess, m); // Round 3: FOR scade
  assert.deepEqual(dopo.caratteristicheTemporanee.map((x) => x.sigla), ['CAR']);
  assert.deepEqual(tecnicheScadute(sess, 2, 3, dati), ['FOR +2 temporaneo']);
  assert.equal(scheda(dopo).caratteristiche.FOR.valore, riposo.caratteristiche.FOR.valore);
  // scontro: il Round dello scontro fa scadere allo stesso modo
  const vista = alRound(sessioneCon([{ sigla: 'FOR', valore: 2, numero: 2, unita: 'round', dal: 1 }]), 5);
  assert.deepEqual(vista.caratteristicheTemporanee, []);
  // «Nuova sessione»: i Round finiscono, il promemoria a tempo resta
  assert.deepEqual(nuovaSessione(sess, m).caratteristicheTemporanee.map((x) => x.sigla), ['CAR']);
});

test('durata e «Togli»; che cosa deriva da ogni Caratteristica viene dai dati', () => {
  let sess = sessioneCon(variaTemporaneo(inizializzaSessione(m), 'COS', 1, R));
  assert.deepEqual(sess.caratteristicheTemporanee[0], { sigla: 'COS', valore: 1, numero: 1, unita: 'round', dal: 1, al: 1 });
  sess = sessioneCon(durataTemporaneo(sess, 'COS', { numero: 4 }, R));
  assert.equal(sess.caratteristicheTemporanee[0].al, 4);
  sess = sessioneCon(durataTemporaneo(sess, 'COS', { unita: 'ore' }, R));
  assert.equal(sess.caratteristicheTemporanee[0].al, null);
  assert.deepEqual(togliTemporaneo(sess, 'COS', R), []);
  assert.deepEqual(derivatiDi('COS', dati), ['Prova Salvezza: Tempra']);
  // oltre la tabella dei modificatori la Caratteristica si ferma al massimo dei dati
  const alto = scheda(sessioneCon([{ sigla: 'DES', valore: 10, numero: 1, unita: 'round', dal: 1 }]));
  assert.equal(alto.caratteristiche.DES.valore, dati.caratteristiche.valore_massimo);
  assert.ok(derivatiDi('DES', dati).includes('Iniziativa'));
  assert.ok(derivatiDi('FOR', dati).includes('Carico trasportabile'));
});
