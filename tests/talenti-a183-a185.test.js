// A.183 / A.185 (Davide, 25/10/2026): dettagli confermati dopo i lotti 120–125.
//  - la Specializzazione iniziale viene dall'elenco della prima Classe, quella del 4° dall'elenco della Classe aumentata;
//  - un Taumaturgo ha una sola scelta iniziale, fra le nove Specializzazioni di Potere (e le altre del suo elenco);
//  - gli ampliamenti di Usufruitore di Magia (le nove di Potere) e di Ritualista (Cerimoniale, Controllo Rituale) si aprono
//    solo con il Talento posseduto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { controllaSceltaTalento } from '../src/avanzamento.js';

const { dati } = await datiReali();
const POTERE = dati.specializzazioni.gruppi.potere;
const stato = (talenti = []) => ({ regime: 'nuovo', talentiLiberi: talenti.map((id) => ({ id })), classi: [], car: { FOR: 5 }, addestr: { nome: 'Avventuriero' } });
const viola = (id, st, classe) => controllaSceltaTalento(st, 'specializzazione', { id }, dati, { classe }).some((e) => e.tipo === 'violazione');

test('A.185: le nove Specializzazioni di Potere sono nell’elenco di un Taumaturgo, e l’iniziale è una sola scelta', () => {
  assert.equal(POTERE.length, 9);
  for (const id of POTERE) assert.equal(viola(id, stato(), 'Arcanista'), false, `${id} per un Arcanista`);
  for (const id of POTERE) assert.equal(viola(id, stato(), 'Agente'), true, `${id} non è per un Agente senza Usufruitore di Magia`);
});

test('A.183: la Specializzazione del 4° viene dall’elenco della Classe aumentata, non da quello della prima', () => {
  assert.equal(viola('specializzazione-pistole', stato(), 'Agente'), false);
  assert.equal(viola('specializzazione-pistole', stato(), 'Arcanista'), true, 'Pistole non è nell’elenco dell’Arcanista');
});

test('A.185: gli ampliamenti si aprono solo con il requisito posseduto', () => {
  for (const id of POTERE) {
    assert.equal(viola(id, stato(), 'Agente'), true, `${id} senza il Talento`);
    assert.equal(viola(id, stato(['usufruitore-di-magia']), 'Agente'), false, `${id} con Usufruitore di Magia`);
  }
  for (const id of ['specializzazione-cerimoniale', 'specializzazione-controllo-rituale']) {
    assert.equal(viola(id, stato(), 'Agente'), true, `${id} senza Ritualista`);
    assert.equal(viola(id, stato(['ritualista-minore']), 'Agente'), false, `${id} con Ritualista Minore`);
    assert.equal(viola(id, stato(['ritualista-maggiore']), 'Agente'), false, `${id} con Ritualista Maggiore`);
  }
  // Usufruitore di Magia non apre Cerimoniale, Ritualista non apre il Potere
  assert.equal(viola('specializzazione-cerimoniale', stato(['usufruitore-di-magia']), 'Agente'), true);
  assert.equal(viola('specializzazione-elementi', stato(['ritualista-minore']), 'Agente'), true);
});
