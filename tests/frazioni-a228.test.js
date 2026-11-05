// Lotto 173, A.228 (Davide, 02/11/2026): «La frazione esatta deve restare nella riserva effettiva anche per i personaggi,
// oltre che nel registro della conversione. Quindi 7,75 cariche rimangono 7,75 […] La frazione non diventa gratuitamente
// una carica intera. Ogni utilizzo richiede il costo completo previsto; il residuo resta disponibile per i successivi
// calcoli e per la ricarica.» Vale per i NEC dei PG, per le Cariche Mistiche del lotto 171 e per le riserve dei mezzi.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { massimiSessione, allineaSessione, variaNec, variaChroma, attivaArtefatto, usaArtefatto } from '../src/sessione.js';
import { calcolaScheda } from '../src/calc.js';
import { numeroRiserva, partiRiserva, usiPieni, testoRiserva } from '../src/cariche-mistiche.js';
import { nuovoVeicolo, normalizzaVeicoli, chiudiGiornata, registraViaggio, testoCariche } from '../src/veicoli.js';

const { dati } = await datiReali();
const voce = (uid, rif, extra = {}) => ({ uid, rif, stato: 'zaino', quantita: 1, note: '', ...extra });

function tuta() {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [voce('e', 'esplorazione:tuta-extraveicolare')] };
  return massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
}

test('come si legge: le cariche intere e il residuo, al centesimo per difetto', () => {
  assert.equal(numeroRiserva(7.75), '7 e 0,75');
  assert.equal(numeroRiserva(4.2), '4 e 0,2');
  assert.equal(numeroRiserva(6.666666), '6 e 0,66', 'mai 0,67: non si mostra una frazione che non c’è');
  assert.equal(numeroRiserva(0.6), '0,6');
  assert.equal(numeroRiserva(6), '6');
  assert.equal(testoRiserva(4.2, 6, 'CM'), '4 e 0,2 / 6 CM');
  assert.deepEqual(partiRiserva(7.75), { intere: 7, residuo: 0.75 });
  assert.equal(usiPieni(4.2, 1), 4);
  assert.equal(usiPieni(4.2, 3), 1);
  assert.equal(testoCariche(6.666666), '6 cariche e 0,66');
  assert.equal(testoCariche(1), '1 carica');
  assert.equal(testoCariche(0.5), '0,5 di carica');
});

test('NEC dei PG: 31 ore su 40 sono 7,75 cariche nella riserva, e un uso costa pieno', () => {
  const m = tuta();
  let s = allineaSessione({ nec: { e: 31 } }, m);
  assert.equal(s.nec['e#c'], 7.75, 'la frazione resta nella riserva, non solo nel registro');
  assert.equal(s.necConvertite['e#c'].esatto, 7.75);
  assert.equal(s.necConvertite['e#c'].applicato, 7.75);
  // riaprendo non cambia (né si riconverte, né si rimette il residuo)
  assert.deepEqual(allineaSessione(s, m).nec, s.nec);
  // sette usi pieni: 7,75 → 0,75; l'ottavo non si paga con il residuo
  for (let i = 0; i < 7; i++) s = variaNec(s, 'e#c', -1, m);
  assert.equal(s.nec['e#c'], 0.75);
  assert.equal(variaNec(s, 'e#c', -1, m).nec['e#c'], 0.75, 'il residuo non paga una carica intera');
  // il residuo resta per la ricarica: +1 porta a 1,75
  assert.equal(variaNec(s, 'e#c', 1, m).nec['e#c'], 1.75);
});

test('NEC dei PG convertiti prima del lotto 173 (7 per difetto): la frazione torna nella riserva una volta sola', () => {
  const m = tuta();
  const vecchio = { nec: { e: 31, 'e#c': 5 }, necConvertite: { 'e#c': { da: 'e', valore: 31, capacita: 40, esatto: 7.75, applicato: 7, massimo: 10 } } };
  const s = allineaSessione(vecchio, m);
  assert.equal(s.nec['e#c'], 5.75, 'i due usi fatti restano; lo 0,75 tolto per difetto torna');
  assert.deepEqual(s.necConvertite['e#c'].a228, { residuo: 0.75 });
  assert.equal(allineaSessione(s, m).nec['e#c'], 5.75, 'una volta sola');
});

test('Cariche Mistiche (lotto 171): 4,2 su 6 si usa quattro volte, poi lo 0,2 non paga un Pugno né un − a mano', () => {
  const m = { contenitori: { g: 6 }, contenitoriCm: { g: { capacita: 6, precedente: 10 } } };
  let s = allineaSessione({ chroma: { g: { pmAttuali: 7 } } }, m);
  assert.equal(s.chroma.g.pmAttuali, 4.2);
  assert.equal(usaArtefatto(s, 'g', 6, m), null, 'il Doppio getto (6) non si paga con 4,2');
  for (let i = 0; i < 4; i++) s = attivaArtefatto(s, 'g', 1, m);
  assert.equal(s.chroma.g.pmAttuali, 0.2);
  assert.equal(attivaArtefatto(s, 'g', 1, m), null, 'il Pugno costa 1 CM intero');
  assert.equal(variaChroma(s, 'g', -1, m).chroma.g.pmAttuali, 0.2, 'nemmeno con il − a mano');
  assert.equal(variaChroma(s, 'g', 1, m).chroma.g.pmAttuali, 1.2, 'il residuo resta per la ricarica');
});

test('mezzi: la frazione della conversione resta nella riserva e la giornata la scala senza regalare cariche', () => {
  const [scout] = normalizzaVeicoli([{ ...nuovoVeicolo('asa-scout-mk4', dati), energia: { modello: 'cariche', rosso: 7.75, rosso_ricambi: [], verde: 10, verde_ricambi: [], aria: 24, km_giornata: 0 } }], dati);
  const v = registraViaggio(scout, 70, dati).mezzo;
  const c = chiudiGiornata(v, dati).mezzo;
  assert.equal(c.energia.rosso, 6.75, '70 km = 1 carica intera, il residuo resta');
});
