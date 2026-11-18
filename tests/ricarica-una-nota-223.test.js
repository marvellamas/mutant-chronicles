import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 223, parte C — sotto la stessa arma la scheda diceva «Ricarica non scala le riserve» e, una riga dopo, «Ricarica consuma
// dalle riserve» (la frase fissa in fondo ai riquadri delle mani): due note vere per due casi diversi, che sulla stessa arma si
// leggevano insieme e si contraddicevano (lotto 221, parte 4, lasciata aperta). Adesso il caso lo decide una funzione sola
// (`riservaNonScalata`) e la frase fissa non dice «consuma» quando una delle armi in mano è nel caso «non scala».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contesto, resa, ESEMPI } from './scheda-aiuti.js';
import { riservaNonScalata, notaCaricatoriInMano } from '../src/ricarica.js';

const NON_SCALA = /«Ricarica» non scala le riserve/g;
const CONSUMA = /«Ricarica» consuma dalle riserve/g;
const conta = (t, re) => (t.match(re) ?? []).length;

test('mai le due note insieme: su ogni PG d’esempio la scheda di Combattimento ne mostra al più una per caso, e entrambi i casi esistono', () => {
  let conNonScala = 0, conConsuma = 0;
  for (const f of ESEMPI) {
    const t = resa(contesto(f, { attiva: 'combattimento' })).testo();
    const a = conta(t, NON_SCALA), b = conta(t, CONSUMA);
    if (a > 0) conNonScala++;
    if (b > 0) conConsuma++;
    assert.ok(!(a > 0 && b > 0), `${f}: «non scala» e «consuma dalle riserve» compaiono insieme`);
    assert.ok(b <= 1, `${f}: la frase fissa è una sola`);
  }
  // un controllo verde su zero casi ci ha già ingannato più volte: servono entrambi i casi
  assert.ok(conNonScala > 0, 'almeno un esempio nel caso «non scala le riserve»');
  assert.ok(conConsuma > 0, 'almeno un esempio nel caso «consuma dalle riserve»');
});

test('la funzione che decide il caso: unica per la riga dell’arma e per la frase fissa (e le armi senza munizioni non contano)', () => {
  const conCompat = { munizioni: { unita: 'colpi' }, uid: 'a' };
  const senzaCompat = { munizioni: { unita: 'colpi' }, uid: 'b' };
  const pm = { munizioni: { unita: 'PM' }, uid: 'c' };
  const mischia = { uid: 'd' };
  const ric = { a: { modo: 'caricatore' }, b: { modo: null } };
  assert.equal(riservaNonScalata(conCompat, ric.a), false);
  assert.equal(riservaNonScalata(senzaCompat, ric.b), true);
  assert.equal(riservaNonScalata(pm, undefined), false, 'le riserve in PM hanno la loro nota');
  assert.match(notaCaricatoriInMano([conCompat], ric), /consuma dalle riserve/);
  assert.doesNotMatch(notaCaricatoriInMano([conCompat, senzaCompat], ric), /consuma/, 'una sola arma nel caso «non scala» basta a togliere la frase fissa');
  assert.doesNotMatch(notaCaricatoriInMano([senzaCompat], ric), /consuma/);
  assert.match(notaCaricatoriInMano([mischia, conCompat], ric), /consuma dalle riserve/, 'un’arma senza munizioni non decide');
  assert.match(notaCaricatoriInMano([], ric), /consuma dalle riserve/, 'a mani libere nessuna contraddizione: la frase fissa resta com’era');
});
