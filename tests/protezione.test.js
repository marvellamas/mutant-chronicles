// AR del personaggio e Punti Integrità degli oggetti (docs/ricognizione-ar-pi.md, src/protezione.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { calcolaAR } from '../src/protezione.js';
import { inizializzaSessione, allineaSessione, massimiSessione, variaIntegrita, nuovaSessione } from '../src/sessione.js';
import { serializza, deserializzaPersonaggio, VERSIONE_FORMATO } from '../src/character.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const creazione = (equipaggiamento) => ({ ...MISHIMA_AGENTE, equipaggiamento });
const massimi = (c) => massimiSessione(calcolaScheda({ creazione: c, livelli: [] }, dati), c, dati);
/** Scheda al tavolo con la sessione (PI attuali, condizioni accese). */
const alTavolo = (c, modifica = {}) => {
  const m = massimi(c);
  const sessione = { ...inizializzaSessione(m), ...modifica };
  return calcolaScheda({ creazione: c, livelli: [], sessione }, dati);
};

// armatura civile Leggera AR 1 + Rinforzo Leggero +1 (§7.11.2), Scudo medio +2 (§7.4), elmetto
// standard 0 (§7.21.1) con una modifica montata: AR 4, di cui 0 magica
const CORREDO = [
  voce('arm', 'armature:armatura-civile-leggera', 'indossata'),
  voce('kit', 'rinforzi:rinforzo-leggero', 'in_uso', { montato_su: 'arm' }),
  voce('scu', 'scudi:scudo-medio', 'imbracciato'),
  voce('elm', 'elmetti:elmetto-standard', 'indossata'),
  voce('mod', 'elmetti:visiera-antibagliore', 'in_uso', { montato_su: 'elm' }),
];

test('AR: armatura con rinforzo + scudo + elmetto con modifica = 1 + 1 + 2 + 0', () => {
  const ar = calcolaScheda({ creazione: creazione(CORREDO), livelli: [] }, dati).equipaggiamento.ar;
  assert.equal(ar.totale, 4);
  assert.equal(ar.magica, 0);
  assert.deepEqual(ar.voci.map((v) => [v.fonte, v.totale]), [['armatura', 2], ['scudo', 2]]);
  assert.ok(!ar.voci.some((v) => v.fonte === 'elmetto'));
  assert.deepEqual(ar.valori.map((v) => [v.etichetta, v.valore]), [['AR', 4], ['contro Etereo', 0]]);
});

test('AR: due scudi non si sommano, vale il maggiore (§7.4)', () => {
  const c = creazione([voce('a', 'scudi:scudo-medio', 'imbracciato'), voce('b', 'scudi:scudo-da-breccia-dei-dragoni', 'imbracciato')]);
  assert.equal(calcolaScheda({ creazione: c, livelli: [] }, dati).equipaggiamento.ar.totale, 3);
});

test('AR con una condizione attiva: Scudo Magico delle Guardie Sacre da +2 a +4, di cui 2 magica (§7.4.10)', () => {
  const c = creazione([voce('arm', 'armature:armatura-civile-media', 'indossata'), voce('gs', 'scudi:scudo-delle-guardie-sacre', 'imbracciato')]);
  const spento = alTavolo(c).equipaggiamento.arEffettiva;
  assert.deepEqual([spento.totale, spento.magica], [5, 0]);
  const acceso = alTavolo(c, { condizioniOggetti: ['gs'] }).equipaggiamento.arEffettiva;
  assert.deepEqual([acceso.totale, acceso.magica], [7, 2]);
  assert.ok(acceso.voci.some((v) => v.fonte === 'effetto' && /condizione attiva/.test(v.etichetta)));
  // a riposo (stampa) la condizione non conta
  assert.equal(calcolaScheda({ creazione: c, livelli: [] }, dati).equipaggiamento.ar.totale, 5);
});

test('AR contro esplosioni (Antiesplosione, §7.11.4, §7.4.3): +1 una volta sola fra scudo e armatura', () => {
  const c = creazione([voce('arm', 'armature_corporative:armatura-d-assalto-blitzer', 'indossata'), voce('scu', 'scudi:scudo-da-breccia-dei-dragoni', 'imbracciato')]);
  const ar = calcolaScheda({ creazione: c, livelli: [] }, dati).equipaggiamento.ar;
  assert.equal(ar.totale, 6);
  assert.deepEqual(ar.contro.map((x) => [x.contro, x.totale]), [['esplosioni', 7]]);
  assert.ok(ar.valori.some((v) => v.etichetta === 'contro esplosioni' && v.valore === 7));
});

test('Corazza Potenziata (Giocatore §3.9.5): +1 AR e +1 magica una volta, solo con un’armatura indossata', () => {
  const armatura = { protezioni: [{ uid: 'a', nome: 'Armatura', tipo: 'armatura', ar: { totale: 5, magica: 1 } }], effettiOggetti: [] };
  const ar = calcolaAR(armatura, dati, { talenti: ['Corazza Potenziata'] });
  assert.deepEqual([ar.totale, ar.magica], [6, 2]); // l'esempio del manuale
  assert.equal(calcolaAR({ protezioni: [], effettiOggetti: [] }, dati, { talenti: ['Corazza Potenziata'] }).totale, 0);
});

test('PI: massimi dal catalogo, attuali nella sessione; le modifiche d’elmetto non hanno PI propri (§7.21.3)', () => {
  const m = massimi(creazione(CORREDO));
  assert.deepEqual(m.integrita, { arm: 6, kit: 6, scu: 6, elm: 4 });
  const s = inizializzaSessione(m);
  assert.deepEqual(s.integrita, { arm: 6, kit: 6, scu: 6, elm: 4 });
  // − e + entro 0 e il massimo; «Nuova sessione» non ripara
  const giu = variaIntegrita(s, 'scu', -10, m);
  assert.equal(giu.integrita.scu, 0);
  assert.equal(variaIntegrita(giu, 'scu', 99, m).integrita.scu, 6);
  assert.equal(nuovaSessione(giu, m).integrita.scu, 0);
});

test('PI a 0: l’oggetto è Rotto e non dà AR (A.44); il kit a 0 perde il suo +AR (A.45); le penalità restano', () => {
  const c = creazione(CORREDO);
  const integra = alTavolo(c).equipaggiamento.arEffettiva;
  assert.equal(integra.totale, 4);
  const scudoRotto = alTavolo(c, { integrita: { arm: 6, kit: 6, scu: 0, elm: 4 } }).equipaggiamento;
  assert.equal(scudoRotto.arEffettiva.totale, 2);
  assert.ok(scudoRotto.arEffettiva.esclusi.some((x) => /Rotto/.test(x.motivo)));
  assert.equal(scudoRotto.protezioni.find((p) => p.uid === 'scu').rotta, true);
  assert.equal(alTavolo(c, { integrita: { arm: 6, kit: 0, scu: 6, elm: 4 } }).equipaggiamento.arEffettiva.totale, 3);
  assert.equal(alTavolo(c, { integrita: { arm: 0, kit: 6, scu: 6, elm: 4 } }).equipaggiamento.arEffettiva.totale, 2);
  // l'AR a riposo (stampa) non cambia
  assert.equal(alTavolo(c, { integrita: { arm: 0, kit: 0, scu: 0, elm: 0 } }).equipaggiamento.ar.totale, 4);
});

test('PI a 0 di un elmetto: perde i suoi vantaggi (§7.21.3), l’AR dell’armatura non cambia', () => {
  const c = creazione([voce('arm', 'armature:armatura-civile-media', 'indossata'), voce('elm', 'elmetti:elmetto-commando', 'indossata')]);
  const conElmetto = alTavolo(c);
  const rotto = alTavolo(c, { integrita: { ...conElmetto.equipaggiamento.integrita.reduce((o, x) => ({ ...o, [x.uid]: x.piMax }), {}), elm: 0 } });
  assert.equal(rotto.equipaggiamento.arEffettiva.totale, conElmetto.equipaggiamento.arEffettiva.totale);
  const difese = (s) => s.abilita.find((a) => a.nome === 'Difese').effettivo;
  // Commando: Difese +1 (§7.21.7), che cade con l'elmetto Rotto
  assert.equal(difese(rotto), difese(conElmetto) - 1);
});

test('formato 7: i PI vanno e tornano nel file; un file del formato 6 senza PI si legge con gli oggetti integri', () => {
  assert.equal(VERSIONE_FORMATO, 7);
  const c = creazione(CORREDO);
  const m = massimi(c);
  const s = variaIntegrita(inizializzaSessione(m), 'arm', -2, m);
  const testo = serializza(c, { sessione: s });
  assert.equal(JSON.parse(testo).versione, 7);
  assert.deepEqual(deserializzaPersonaggio(testo).sessione.integrita, { arm: 4, kit: 6, scu: 6, elm: 4 });
  // file del formato 6: stessa sessione senza «integrita»
  const vecchio = JSON.parse(testo);
  vecchio.versione = 6;
  delete vecchio.sessione.integrita;
  const letto = deserializzaPersonaggio(JSON.stringify(vecchio));
  assert.deepEqual(allineaSessione(letto.sessione, m).integrita, { arm: 6, kit: 6, scu: 6, elm: 4 });
});
