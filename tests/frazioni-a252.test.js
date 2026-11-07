// Lotto 178, A.252 (Davide, 06/11/2026): «CM e NeC si consumano solo in quantità intere. Le eventuali frazioni prodotte
// dalla conversione di regole pregresse vanno arrotondate una sola volta all'intero superiore: per esempio 4,2/6 diventa
// 5/6. Ricaricare 1 CM costa rispettivamente 6, 4 o 2 PM con conversione 3:1, 2:1 o 1:1. Questa decisione supera la
// A.228 e le parti della A.193 che mantenevano frazioni nelle riserve effettive; il valore precedente resta soltanto
// nello storico.»
//
// Questo file sostituisce tests/frazioni-a228.test.js, che provava la regola opposta. Vale per i NEC dei PG, per le
// Cariche Mistiche e per le riserve dei mezzi; non per PM personali, proiettili, PI, chilometri e ore d'aria.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { massimiSessione, allineaSessione, variaNec, variaChroma, attivaArtefatto, usaArtefatto } from '../src/sessione.js';
import { calcolaScheda } from '../src/calc.js';
import { numeroRiserva, interoRiserva, conFrazione, pmPerGruppo, usiPieni } from '../src/cariche-mistiche.js';
import { nuovoVeicolo, normalizzaVeicoli, chiudiGiornata, registraViaggio, testoCariche } from '../src/veicoli.js';

const { dati } = await datiReali();
const voce = (uid, rif, extra = {}) => ({ uid, rif, stato: 'zaino', quantita: 1, note: '', ...extra });
const interi = (o) => Object.entries(o ?? {}).filter(([, n]) => conFrazione(n));

function tuta() {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [voce('e', 'esplorazione:tuta-extraveicolare')] };
  return massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
}

test('la regola: una frazione sale all’intero superiore, e una volta sola', () => {
  assert.equal(interoRiserva(4.2), 5, 'l’esempio di Davide: 4,2 / 6 → 5 / 6');
  assert.equal(interoRiserva(7.75), 8);
  assert.equal(interoRiserva(0.6), 1);
  assert.equal(interoRiserva(6), 6, 'un intero resta com’è');
  assert.equal(interoRiserva(interoRiserva(4.2)), 5, 'applicata due volte non sale di nuovo');
  assert.equal(interoRiserva(6.999999999), 7, 'niente scalini per gli errori della virgola mobile');
  assert.equal(numeroRiserva(5), '5', 'una riserva si legge come numero intero');
});

test('ricaricare 1 CM costa 6 PM a 3:1, 4 a 2:1, 2 a 1:1', () => {
  const cm = { unita: 'CM' };
  assert.deepEqual([3, 2, 1].map((r) => pmPerGruppo(cm, r, dati)), [6, 4, 2]);
  // le Batterie in PM non raddoppiano
  assert.deepEqual([3, 2, 1].map((r) => pmPerGruppo({ unita: 'PM' }, r, dati)), [3, 2, 1]);
});

test('NEC dei PG: 31 ore su 40 fanno 7,75 cariche, e nella riserva ne entrano 8', () => {
  const m = tuta();
  let s = allineaSessione({ nec: { e: 31 } }, m);
  assert.equal(s.nec['e#c'], 8, 'la riserva è intera');
  assert.equal(s.necConvertite['e#c'].esatto, 7.75, 'il conto esatto resta nello storico');
  assert.equal(s.necConvertite['e#c'].applicato, 8);
  assert.deepEqual(s.necConvertite['e#c'].a252, { prima: 7.75 }, 'segnata come già arrotondata: spendendo non risale');
  // riaprendo non cambia e non sale di nuovo
  assert.deepEqual(allineaSessione(s, m).nec, s.nec);
  assert.deepEqual(interi(allineaSessione(s, m).nec), []);
  // otto usi pieni, poi zero: nessun residuo da spendere
  for (let i = 0; i < 8; i++) s = variaNec(s, 'e#c', -1, m);
  assert.equal(s.nec['e#c'], 0);
});

test('un valore salvato con la frazione (lotto 173) sale all’intero una volta sola', () => {
  const m = tuta();
  const vecchio = { nec: { e: 31, 'e#c': 7.75 }, necConvertite: { 'e#c': { da: 'e', valore: 31, capacita: 40, esatto: 7.75, applicato: 7.75, massimo: 10 } } };
  const s = allineaSessione(vecchio, m);
  assert.equal(s.nec['e#c'], 8);
  assert.deepEqual(interi(s.nec), [], 'nessuna riserva resta con la frazione');
  // riaprendo resta 8: l’arrotondamento non si ripete
  assert.equal(allineaSessione(s, m).nec['e#c'], 8);
  // e se il Direttore l’ha scalata a 3, resta 3
  const dopo = allineaSessione({ ...s, nec: { ...s.nec, 'e#c': 3 } }, m);
  assert.equal(dopo.nec['e#c'], 3);
});

test('un PG convertito per difetto (lotto 149) sale all’intero superiore dell’esatto, una volta sola', () => {
  const m = tuta();
  const vecchio = { nec: { e: 31, 'e#c': 7 }, necConvertite: { 'e#c': { da: 'e', valore: 31, capacita: 40, esatto: 7.75, applicato: 7, massimo: 10 } } };
  const s = allineaSessione(vecchio, m);
  assert.equal(s.nec['e#c'], 8, '7,75 esatte → 8');
  assert.ok(s.necConvertite['e#c'].a252, 'il segno dice che è già stata portata all’intero');
  assert.equal(s.necConvertite['e#c'].a252.prima, 7, 'il valore di prima resta nello storico');
  assert.equal(allineaSessione(s, m).nec['e#c'], 8, 'una volta sola');
  // e se intanto ne sono state spese due, l’arrotondamento non le rimette
  const speso = allineaSessione({ ...s, nec: { ...s.nec, 'e#c': 6 } }, m);
  assert.equal(speso.nec['e#c'], 6);
});

test('Cariche Mistiche: 7 PM su 10 fanno 4,2 CM e nella riserva ne entrano 5', () => {
  const m = { contenitori: { g: 6 }, contenitoriCm: { g: { capacita: 6, precedente: 10 } } };
  let s = allineaSessione({ chroma: { g: { pmAttuali: 7 } } }, m);
  assert.equal(s.chroma.g.pmAttuali, 5, 'l’esempio di Davide: 4,2 / 6 → 5 / 6');
  assert.equal(s.chroma.g.prima.cm_esatte, 4.2, 'il conto esatto resta nello storico');
  assert.equal(allineaSessione(s, m).chroma.g.pmAttuali, 5, 'riaprendo non sale di nuovo');
  // consumi interi: cinque Pugni da 1 CM, poi niente
  assert.equal(usiPieni(s.chroma.g.pmAttuali, 1), 5);
  for (let i = 0; i < 5; i++) s = attivaArtefatto(s, 'g', 1, m);
  assert.equal(s.chroma.g.pmAttuali, 0);
  assert.equal(attivaArtefatto(s, 'g', 1, m), null, 'a 0 non si attiva');
  assert.equal(usaArtefatto(s, 'g', 6, m), null);
  assert.equal(variaChroma(s, 'g', -1, m).chroma.g.pmAttuali, 0);
});

test('una riserva CM salvata con la frazione sale all’intero, con il valore di prima nello storico', () => {
  const m = { contenitori: { g: 6 }, contenitoriCm: { g: { capacita: 6, precedente: 10 } } };
  const s = allineaSessione({ chroma: { g: { pmAttuali: 4.2, unita: 'CM', prima: { pmAttuali: 7, capacita: 10, unita: 'PM' } } } }, m);
  assert.equal(s.chroma.g.pmAttuali, 5);
  assert.deepEqual(s.chroma.g.a252, { prima: 4.2 });
  assert.equal(allineaSessione(s, m).chroma.g.pmAttuali, 5, 'una volta sola');
});

test('mezzi: la riserva convertita è intera e la giornata scala cariche intere', () => {
  const [scout] = normalizzaVeicoli([{ ...nuovoVeicolo('asa-scout-mk4', dati), energia: { modello: 'cariche', rosso: 7.75, rosso_ricambi: [3.5], verde: 10, verde_ricambi: [], aria: 24, km_giornata: 0 } }], dati);
  assert.equal(scout.energia.rosso, 8, '7,75 → 8');
  assert.deepEqual(scout.energia.rosso_ricambi, [4], 'anche i ricambi');
  assert.equal(scout.energia.esatte_prima.rosso, 7.75, 'il valore di prima resta nello storico del mezzo');
  const v = registraViaggio(scout, 70, dati).mezzo;
  const c = chiudiGiornata(v, dati).mezzo;
  assert.equal(c.energia.rosso, 7, '70 km = 1 carica intera');
  assert.deepEqual(interi({ rosso: c.energia.rosso, verde: c.energia.verde }), []);
  // riaprendo non sale di nuovo
  const [ri] = normalizzaVeicoli([c], dati);
  assert.equal(ri.energia.rosso, 7);
});

test('niente riserve con la frazione dopo l’allineamento, in nessuna delle tre', () => {
  const m = tuta();
  const s = allineaSessione({ nec: { e: 31, 'x#c': 2.4 } }, m);
  assert.deepEqual(interi(s.nec), [], 'NEC');
  const mc = { contenitori: { g: 6 }, contenitoriCm: { g: { capacita: 6, precedente: 10 } } };
  const sc = allineaSessione({ chroma: { g: { pmAttuali: 3 } } }, mc);
  assert.ok(!conFrazione(sc.chroma.g.pmAttuali), 'CM');
  const [scout] = normalizzaVeicoli([{ ...nuovoVeicolo('asa-scout-mk4', dati), energia: { modello: 'cariche', rosso: 2.2, rosso_ricambi: [], verde: 1.1, verde_ricambi: [], aria: 24, km_giornata: 0 } }], dati);
  assert.deepEqual(interi({ rosso: scout.energia.rosso, verde: scout.energia.verde }), [], 'mezzi');
});

test('quello che non è una riserva di cariche non cambia: PM, proiettili, chilometri, ore d’aria', () => {
  const [scout] = normalizzaVeicoli([{ ...nuovoVeicolo('asa-scout-mk4', dati), energia: { modello: 'cariche', rosso: 10, rosso_ricambi: [], verde: 10, verde_ricambi: [], aria: 23.5, km_giornata: 12.5 } }], dati);
  assert.equal(scout.energia.aria, 23.5, 'le ore d’aria non sono cariche');
  assert.equal(registraViaggio(scout, 7.5, dati).mezzo.energia.km_giornata, 20, 'i chilometri restano come sono');
  assert.equal(testoCariche(1), '1 carica');
});
