// «Indietro» nell'Iniziativa (12/10/2026, punto 3 della sessione di gioco di Marcello e Davide): «quando il primo del
// Round è un nemico non si riesce a tornare indietro nell'Iniziativa al primo personaggio».
//
// Riprodotto: con tutti i partecipanti ancora nello scontro «Indietro» tornava già a qualunque turno precedente,
// nemici compresi, e al Round prima. Il caso che non funzionava: un nemico **eliminato** (tolto dallo scontro). La
// voce della pila nomina lui, non c'è più nessuno con quel id, il turno restava dov'era e il pulsante sembrava morto.
// Adesso «Indietro» scende nella pila finché il turno (o il Round) cambia davvero, e dice che cos'è successo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { caricaDati } from '../src/rules.js';
import { nuovoScontro, aggiungiNemici, registraTiro, avanti, indietro, anteprimaIndietro, ordineIniziativa, diTurno, togliPartecipante, reimpostaIniziativaDi } from '../src/scontro.js';

const { dati } = await caricaDati((n) => readFile(new URL(`../data/${n}.json`, import.meta.url), 'utf8'));
const predone = JSON.parse(await readFile(new URL('../esempi/nemici/predone-delle-lande.json', import.meta.url), 'utf8'));
const OPZ = { indietroMax: dati.mappa.iniziativa.indietro_max };
const N1 = 'nem:predone-delle-lande:1';
const N2 = 'nem:predone-delle-lande:2';

/** Scontro di prova: i due nemici davanti (11 e 10), poi i due PG. Il primo del Round è un nemico. */
function scontro() {
  let s = nuovoScontro({ id: 'x', nome: 'X', pg: [{ chiave: 'A', nome: 'Akira', iniziativa: 2, des: 7, int: 5 }, { chiave: 'B', nome: 'Bea', iniziativa: 1, des: 6, int: 5 }] });
  s = aggiungiNemici(s, predone, 2);
  s = registraTiro(s, N1, 'd10', { valore: 10, origine: 'manuale' }, dati);
  s = registraTiro(s, N2, 'd10', { valore: 9, origine: 'manuale' }, dati);
  s = registraTiro(s, 'pg:A', 'd10', { valore: 3, origine: 'manuale' }, dati);
  s = registraTiro(s, 'pg:B', 'd10', { valore: 2, origine: 'manuale' }, dati);
  return s;
}
const avantiN = (s, n) => Array.from({ length: n }).reduce((x) => avanti(x, undefined, OPZ), s);
const dove = (s) => [s.round, diTurno(s)?.nome ?? null];

test('il primo del Round è un nemico: «Indietro» torna a lui, un turno per volta', () => {
  const s = scontro();
  assert.deepEqual(ordineIniziativa(s).ordinati.map((p) => p.nome), ['Predone delle Lande 1', 'Predone delle Lande 2', 'Akira', 'Bea']);
  assert.deepEqual(dove(s), [1, 'Predone delle Lande 1']);
  let t = avantiN(s, 3);
  assert.deepEqual(dove(t), [1, 'Bea']);
  // tre «Indietro»: Akira, Predone 2, Predone 1 (il primo del Round, nemico)
  const passi = [];
  for (let i = 0; i < 3; i++) { t = indietro(t); passi.push(dove(t)); }
  assert.deepEqual(passi, [[1, 'Akira'], [1, 'Predone delle Lande 2'], [1, 'Predone delle Lande 1']]);
  // finita la pila il pulsante si spegne e lo scontro non cambia più
  assert.equal(anteprimaIndietro(t), null);
  assert.equal(indietro(t), t);
});

test('cambio di Round: dal primo del Round nuovo si torna all’ultimo del Round prima', () => {
  let t = avantiN(scontro(), 4);
  assert.deepEqual(dove(t), [2, 'Predone delle Lande 1'], 'il Round 2 comincia con il nemico');
  const a = anteprimaIndietro(t);
  assert.deepEqual([a.cambiaRound, a.round, a.diTurno.nome], [true, 1, 'Bea']);
  t = indietro(t);
  assert.deepEqual(dove(t), [1, 'Bea']);
  // e si continua indietro dentro il Round 1 fino al nemico che lo apriva
  t = indietro(t); t = indietro(t); t = indietro(t);
  assert.deepEqual(dove(t), [1, 'Predone delle Lande 1']);
});

test('azione ritardata («Reimposta Iniziativa» di uno): «Indietro» annulla anche quella', () => {
  let t = avanti(scontro(), undefined, OPZ);
  assert.deepEqual(dove(t), [1, 'Predone delle Lande 2']);
  // Akira ritarda: ritira l'Iniziativa e scende dopo gli altri; chi è di turno resta di turno
  t = reimpostaIniziativaDi(t, 'pg:A', { valore: 1, origine: 'manuale' }, dati, undefined, OPZ);
  assert.deepEqual(dove(t), [1, 'Predone delle Lande 2']);
  t = avanti(t, undefined, OPZ);
  assert.deepEqual(dove(t), [1, 'Akira']);
  t = indietro(t);
  assert.deepEqual(dove(t), [1, 'Predone delle Lande 2']);
  // l'«Indietro» dopo annulla la «Reimposta»: torna l'Iniziativa di prima
  const a = anteprimaIndietro(t);
  assert.equal(a.iniziativa, true);
  t = indietro(t);
  assert.equal(t.partecipanti.find((p) => p.id === 'pg:A').d10.valore, 3);
  t = indietro(t);
  assert.deepEqual(dove(t), [1, 'Predone delle Lande 1']);
});

test('nemico eliminato: «Indietro» non si blocca e dice che quel turno non c’è più', () => {
  // il difetto: il primo del Round è un nemico, lo si elimina, e «Indietro» sembrava non fare niente
  let t = avantiN(scontro(), 2);
  assert.deepEqual(dove(t), [1, 'Akira']);
  t = togliPartecipante(t, N1);
  assert.deepEqual(dove(t), [1, 'Akira'], 'chi era di turno resta di turno');
  t = indietro(t);
  assert.deepEqual(dove(t), [1, 'Predone delle Lande 2']);
  // il turno di prima era del nemico eliminato: non torna, e la riga del registro lo dice
  const a = anteprimaIndietro(t);
  assert.equal(a.mancante, 'Predone delle Lande 1');
  t = indietro(t);
  assert.match(t.registro.at(-1).testo, /il turno di prima era di Predone delle Lande 1, che non è più nello scontro/);
  assert.equal(anteprimaIndietro(t), null, 'la pila si è svuotata: il pulsante si spegne');
});

test('nemico eliminato a Round nuovo: «Indietro» scende fino a un turno vero del Round prima', () => {
  let t = avantiN(scontro(), 5);
  assert.deepEqual(dove(t), [2, 'Predone delle Lande 2']);
  t = togliPartecipante(t, N1);
  assert.deepEqual(dove(t), [2, 'Predone delle Lande 2']);
  // un solo «Indietro»: salta la voce del nemico eliminato (che non cambierebbe niente) e torna al Round 1
  t = indietro(t);
  assert.deepEqual(dove(t), [1, 'Bea']);
  t = indietro(t);
  assert.deepEqual(dove(t), [1, 'Akira']);
});

test('la pila non si consuma più del dovuto: un «Indietro» = un turno', () => {
  let t = avantiN(scontro(), 3);
  const passi = t.indietro.length;
  t = indietro(t);
  assert.equal(t.indietro.length, passi - 1, 'un solo passo quando il turno cambia davvero');
});
