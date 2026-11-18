import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 221, parte 4 — la scheda dell'arma senza compatibilità di munizioni nei dati diceva due volte la stessa cosa:
// «Compatibilità delle munizioni non nei dati: la ricarica non scala le riserve.» e, in fondo, «Le riserve (caricatori o celle di scorta)
// si contano a mano: «Ricarica» non le scala.». Adesso è una nota sola, con tutte e due le informazioni. Non si perde niente: è la
// segnalazione di ciò che l'app non conta (la riserva si tiene a mano), e resta detta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contesto, resa, ESEMPI } from './scheda-aiuti.js';

const RHEA = ESEMPI.find((f) => f.startsWith('Rhea'));
const conta = (testo, re) => (testo.match(re) ?? []).length;

test('senza compatibilità nei dati la nota della ricarica è UNA, e dice sia la compatibilità sia che le riserve si contano a mano', () => {
  const t = resa(contesto(RHEA, { attiva: 'combattimento', cambia: (s) => { s.munizioni = { ...s.munizioni }; } })).testo();
  assert.equal(conta(t, /Compatibilità delle munizioni non nei dati/g), 1, 'la compatibilità: una volta');
  assert.equal(conta(t, /si contano a mano/g), 1, 'le riserve a mano: una volta');
  assert.match(t, /Compatibilità delle munizioni non nei dati: «Ricarica» non scala le riserve \(caricatori o celle di scorta\), che si contano a mano\./, 'in una frase sola');
});

test('l’avviso di ricarica() resta quello dei dati (la funzione pura non cambia), la scheda non lo ripete', () => {
  // la frase di src/ricarica.js è ancora l'avviso della funzione; è la scheda che non la mostra due volte
  const t = resa(contesto(RHEA, { attiva: 'combattimento' })).testo();
  assert.equal(conta(t, /la ricarica non scala le riserve/g), 0, 'la vecchia frase doppia non c’è più');
});
