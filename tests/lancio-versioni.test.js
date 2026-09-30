// «Lancia!» per ogni incantesimo conosciuto con almeno una versione accessibile, qualunque siano i
// livelli della scheda (Guarigione: 3, 6, 9…; Esorcizzare Corruzione: 3, 6, 9…) e le sue colonne
// (Beneficiari, Stati di Ferita rimossi, Massimo stato curabile…); senza versioni accessibili il
// pulsante resta disabilitato con «richiede livello N».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { massimiSessione, inizializzaSessione, spendiPmLancio } from '../src/sessione.js';
import { calcolaLancio, versioniLancio, dichiarazioneLancio, statoPulsanteLancio } from '../src/lancio.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const inc = (nome) => dati.incantesimi.incantesimi.find((i) => i.nome === nome);

// collaudo b fino al 6° livello (Arcanista e Mistico: 2 Gradi taumaturgici, livello massimo 8), con i
// due incantesimi del caso segnalato
const p = deserializzaPersonaggio(readFileSync(new URL('collaudo/b_fratellanza_arcanista_l12.json', import.meta.url), 'utf8'));
const creazione = normalizza(p.creazione, dati).scelte;
creazione.incantesimi = [...new Set([...creazione.incantesimi, 'Guarigione', 'Esorcizzare Corruzione'])];
const livelli = p.livelli.filter((v) => v.livello <= 6);
const riposo = calcolaScheda({ creazione, livelli }, dati);
const m = massimiSessione(riposo, creazione, dati);
const sessione = inizializzaSessione(m);
const scheda = calcolaScheda({ creazione, livelli, sessione }, dati);

test('6° livello: Guarigione ed Esorcizzare Corruzione si lanciano alle versioni 3 e 6, e i PM scalano', () => {
  assert.equal(scheda.livello, 6);
  assert.equal(scheda.incantesimi.livelloMassimo, 8);
  for (const nome of ['Guarigione', 'Esorcizzare Corruzione']) {
    const i = inc(nome);
    assert.deepEqual(versioniLancio(i, scheda).filter((v) => !v.motivo).map((v) => v.livello), [3, 6], nome);
    assert.deepEqual(statoPulsanteLancio(i, scheda), { disabilitato: false, motivo: null });
    for (const versione of [3, 6]) {
      const r = calcolaLancio({ scheda, sessione }, i, dichiarazioneLancio({ versione }), dati);
      assert.equal(r.impossibile ?? null, null, `${nome} ${versione}`);
      assert.ok(r.pm_costo > 0 && r.pm_costo <= versione);
      // incantesimi a contatto: la riga del Contatto (Magia sez. 2) c'è
      assert.ok(r.contatto, `${nome}: contatto`);
      const dopo = spendiPmLancio(sessione, { personali: r.fonte_pm.personali, contenitore: r.fonte_pm.contenitore }, m);
      assert.equal(dopo.pmAttuali, sessione.pmAttuali - r.fonte_pm.personali, `${nome} ${versione}`);
    }
  }
});

test('senza versioni accessibili il pulsante resta, disabilitato, con «richiede livello N»', () => {
  const alto = { ...inc('Guarigione'), versioni: inc('Guarigione').versioni.filter((v) => Number(v.Livello) >= 9) };
  assert.deepEqual(statoPulsanteLancio(alto, scheda), { disabilitato: true, motivo: 'richiede livello 9' });
});

test('tutti gli incantesimi del catalogo: versioni con livello e PM, e ogni versione accessibile si calcola', () => {
  const s12 = calcolaScheda({ creazione, livelli: p.livelli, sessione: inizializzaSessione(massimiSessione(calcolaScheda({ creazione, livelli: p.livelli }, dati), creazione, dati)) }, dati);
  for (const i of dati.incantesimi.incantesimi) {
    const v = versioniLancio(i, s12);
    assert.ok(v.length && v.every((x) => Number.isInteger(x.livello) && Number.isInteger(x.pm)), i.nome);
    for (const x of v.filter((y) => !y.motivo)) calcolaLancio({ scheda: s12, sessione }, i, dichiarazioneLancio({ versione: x.livello }), dati);
  }
});
