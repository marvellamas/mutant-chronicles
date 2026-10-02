// Esito di una Prova con il d20 (src/prova.js → esitoProva; regole.json → prova e magistrale_naturale;
// Giocatore §1.6 «Risultati naturali», §1.7 «Successi automatici e azioni impossibili»).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esitoProva } from '../src/prova.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();

test('§1.6: 1 naturale Magistrale, 20 naturale Maldestro, il resto contro il VA', () => {
  assert.equal(esitoProva(13, 1, dati).esito, 'magistrale');
  assert.equal(esitoProva(13, 20, dati).esito, 'maldestro');
  assert.equal(esitoProva(13, 13, dati).esito, 'successo');
  assert.equal(esitoProva(13, 14, dati).esito, 'fallimento');
  assert.equal(esitoProva(13, 2, dati).esito, 'successo');
  assert.equal(esitoProva(10, null, dati).esito, 'da_tirare');
});

test('§1.7: successo automatico da 20, impossibile fino a 0', () => {
  assert.deepEqual([esitoProva(20, null, dati).esito, esitoProva(20, null, dati).riuscita], ['automatico', true]);
  assert.deepEqual([esitoProva(0, 5, dati).esito, esitoProva(0, 5, dati).riuscita], ['impossibile', false]);
  assert.equal(esitoProva(-3, null, dati, { obbligatoria: true }).esito, 'impossibile');
});

test('§1.6, §1.7.1: il 2 Magistrale con VA almeno 21 vale solo dove si tira comunque', () => {
  const soglia = dati.regole.magistrale_naturale.soglia_va;
  assert.equal(esitoProva(soglia, 2, dati).esito, 'automatico');
  assert.equal(esitoProva(soglia, 2, dati, { obbligatoria: true }).esito, 'magistrale');
  assert.equal(esitoProva(soglia - 1, 2, dati, { obbligatoria: true }).esito, 'successo');
  assert.equal(esitoProva(soglia, 2, dati, { obbligatoria: true, abilita: false }).esito, 'successo');
  assert.equal(esitoProva(25, 20, dati, { obbligatoria: true }).esito, 'maldestro');
});

test('A.78 (E&L del 02/10): attacchi e Difese si tirano anche con VA ≥ 20; naturali Magistrali per VA e Talento', () => {
  const es = (va, d20, opz) => esitoProva(va, d20, dati, opz).esito;
  // fuori combattimento resta il §1.7: VA 20 successo automatico
  assert.equal(es(20, null), 'automatico');
  // attacco e Difesa: si tira
  for (const tipo of ['attacco', 'difesa']) {
    assert.equal(es(20, null, { tipo }), 'da_tirare');
    assert.equal(es(25, 20, { tipo }), 'maldestro');
  }
  const att = { tipo: 'attacco' };
  // VA 20: solo l'1 è Magistrale; 2–19 successi normali
  assert.deepEqual([1, 2, 3, 19].map((d) => es(20, d, att)), ['magistrale', 'successo', 'successo', 'successo']);
  // VA 21 o più: 1–2 Magistrali
  assert.deepEqual([1, 2, 3].map((d) => es(21, d, att)), ['magistrale', 'magistrale', 'successo']);
  // con Successo Magistrale Migliorato: VA 20 → 1–2, da VA 21 → 1–3; sotto il 20 il 2 riuscito
  const smm = { tipo: 'attacco', magistraleMigliorato: true };
  assert.deepEqual([1, 2, 3].map((d) => es(20, d, smm)), ['magistrale', 'magistrale', 'successo']);
  assert.deepEqual([2, 3, 4].map((d) => es(21, d, smm)), ['magistrale', 'magistrale', 'successo']);
  assert.equal(es(10, 2, smm), 'magistrale');
  // con VA 1 il 2 resta un fallimento (§8.6.1)
  assert.equal(es(1, 2, smm), 'fallimento');
  assert.equal(es(20, 20, smm), 'maldestro');
  // il TODO è chiuso: la decisione sta nei dati
  assert.equal(dati.regole.prova['TODO(Davide)'], undefined);
  assert.deepEqual(dati.regole.prova.tiro_sempre.tipi, ['attacco', 'difesa']);
});

test('A.78 in «Attacca!» e «Lancia!»: promemoria del tiro con VA ≥ 20 e dei naturali Magistrali', async () => {
  const { promemoriaMagistraleNaturale, haMagistraleMigliorato } = await import('../src/attacco.js');
  assert.equal(promemoriaMagistraleNaturale(19, dati, { tiroSempre: true }), null);
  assert.match(promemoriaMagistraleNaturale(20, dati, { tiroSempre: true }), /^VA finale 20: si tira comunque.*\(A\.78\)\.$/);
  assert.match(promemoriaMagistraleNaturale(22, dati, { tiroSempre: true }), /si tira comunque.*anche il 2 naturale è un Successo Magistrale/);
  assert.match(promemoriaMagistraleNaturale(21, dati, { tiroSempre: true, magistraleMigliorato: true }), /naturali 1–3/);
  // «Lancia!»: le Prove di Potere non cambiano (§1.7.1), solo i Magistrali
  assert.equal(promemoriaMagistraleNaturale(20, dati), null);
  assert.equal(haMagistraleMigliorato({ talentiLiberi: [{ id: 'successo-magistrale-migliorato' }] }, dati), true);
  assert.equal(haMagistraleMigliorato({ talentiLiberi: [{ id: 'successo-magistrale-migliorato' }], bonusTalenti: false }, dati), false);
});
