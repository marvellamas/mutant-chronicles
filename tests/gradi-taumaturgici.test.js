// Riquadro «Gradi taumaturgici» della tab Poteri (Magia sez. 1; src/incantesimi.js → gradiTaumaturgici):
// Gradi delle Classi taumaturgiche sommati e livello massimo degli Incantesimi dalla tabella di
// regole.json → taumaturgo.livello_massimo_per_gradi, lo stesso che usa «Lancia!».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { gradiTaumaturgici } from '../src/incantesimi.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const scheda = (f) => {
  const p = deserializzaPersonaggio(readFileSync(new URL(`collaudo/${f}`, import.meta.url), 'utf8'));
  return calcolaScheda({ creazione: normalizza(p.creazione, dati).scelte, livelli: p.livelli }, dati);
};

test('Lucas: II · Invocatore II, livello massimo 8, come in «Lancia!»', () => {
  const s = scheda('Lucas_liv6_2026-09-28 (2).json');
  const g = gradiTaumaturgici(s, dati);
  assert.deepEqual([g.testo, g.gradi, g.livelloMassimo], ['II · Invocatore II', 2, 8]);
  assert.equal(g.livelloMassimo, s.incantesimi.livelloMassimo);
  assert.deepEqual(g.provenienza.righe.map((r) => [r.fonte, r.valore]), [['Invocatore, Grado II', 2], ['Livello massimo degli Incantesimi', 'livello 8']]);
  assert.match(g.provenienza.righe[1].nota, /^Magia sez\. 1; tabella dei Gradi taumaturgici \(I → 3, II → 8, III → 11/);
  assert.equal(g.provenienza.totale, 2);
});

test('collaudo b (Arcanista e Mistico): nel multiclasse i Gradi taumaturgici si sommano → IV, livello 14', () => {
  const s = scheda('b_fratellanza_arcanista_l12.json');
  const g = gradiTaumaturgici(s, dati);
  assert.deepEqual([g.testo, g.gradi, g.livelloMassimo], ['IV · Arcanista II + Mistico II', 4, 14]);
  assert.equal(g.livelloMassimo, s.incantesimi.livelloMassimo);
});

test('senza Classe taumaturgica il riquadro non compare', () => {
  assert.equal(gradiTaumaturgici(scheda('a_imperiale_assaltatore_l8.json'), dati), null);
  assert.equal(gradiTaumaturgici(scheda('c_freelance_tecnico_l5.json'), dati), null);
});

test('la tabella viene dai dati: cambiarla cambia il livello massimo', () => {
  const s = scheda('Lucas_liv6_2026-09-28 (2).json');
  const altri = structuredClone(dati);
  altri.regole.taumaturgo.livello_massimo_per_gradi.find((x) => x.gradi === 2).livello = 6;
  assert.equal(gradiTaumaturgici(s, altri).livelloMassimo, 6);
});
