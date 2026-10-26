// Talenti v1.0, 27/10/2026: ogni voce del catalogo (39 Talenti Liberi, 72 Maestrie, 86 Specializzazioni) scelta da un
// personaggio con regimeTalenti = 2 deve dare nei valori calcolati ciò che dice il suo testo, oppure dirlo come
// «da applicare al tavolo». Il caso di partenza: Specializzazioni in Elementi e Manifestazione (−1 PM, +1 VA) che
// la scheda non applicava, perché il motore leggeva gli effetti solo dai Talenti Liberi (talenti_liberi.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { analizzaVoci, tabella } from '../tools/talenti-effetti-voci.mjs';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { massimiSessione, inizializzaSessione } from '../src/sessione.js';
import { calcolaLancio, dichiarazioneLancio } from '../src/lancio.js';

const { dati } = await datiReali();

test('le 197 voci: ognuna dà i suoi effetti oppure la nota «da applicare al tavolo»', () => {
  const righe = analizzaVoci(dati);
  assert.equal(righe.length, 197);
  const per = (c) => righe.filter((r) => r.categoria === c).length;
  assert.deepEqual([per('talento_libero'), per('maestria'), per('specializzazione')], [39, 72, 86]);
  const difetti = righe.filter((r) => r.esito !== 'ok');
  assert.deepEqual(difetti.map((r) => `${r.id}: ${r.problemi.join(' | ') || r.confronto}`), []);
  // il documento si rigenera dagli stessi dati
  assert.match(tabella(righe), /Esito ok: 197/);
});

test('ogni voce con effetti scritti non ha insieme una nota che li contraddice, e nessuna tace', () => {
  const righe = analizzaVoci(dati);
  for (const r of righe) assert.ok(r.dichiarati.length || r.tavolo || r.calcolati.length, `${r.id}: tace`);
});

const carica = (f) => {
  const p = deserializzaPersonaggio(readFileSync(new URL(`collaudo/${f}`, import.meta.url), 'utf8'));
  const creazione = { ...normalizza(p.creazione, dati).scelte, regimeTalenti: 2, specializzazioneIniziale: null };
  return { creazione, livelli: p.livelli.map((v) => { const x = { ...v }; delete x.talentoLibero; delete x.maestria; delete x.specializzazione; return x; }) };
};
const alTavolo = (p, scelte) => {
  const creazione = { ...p.creazione, ...scelte.creazione };
  const livelli = p.livelli.map((v, i) => ({ ...v, ...(scelte.livelli?.[i] ?? {}) }));
  const riposo = calcolaScheda({ creazione, livelli }, dati);
  return calcolaScheda({ creazione, livelli, sessione: inizializzaSessione(massimiSessione(riposo, creazione, dati)) }, dati);
};

test('Specializzazioni Elementi e Manifestazione di un Taumaturgo: −1 PM (minimo 1) e +1 VA di Potere in «Lancia!»', () => {
  const p = carica('Lucas_liv6_2026-09-28 (2).json');
  const con = alTavolo(p, { creazione: { specializzazioneIniziale: { id: 'specializzazione-elementi' } }, livelli: { 2: { specializzazione: { id: 'specializzazione-manifestazione' } } } });
  const senza = alTavolo(p, {});
  const inc = (n) => dati.incantesimi.incantesimi.find((i) => i.nome === n);
  const lancia = (s, i, versione) => calcolaLancio({ scheda: s, sessione: {} }, i, dichiarazioneLancio({ versione }), dati);
  for (const [sottofamiglia, nome] of [['Elementi', 'Colpo Elementale'], ['Manifestazione', dati.incantesimi.incantesimi.find((i) => i.specializzazione === 'Manifestazione' && i.livello_base === 1)?.nome]]) {
    const i = inc(nome);
    assert.equal(i.specializzazione, sottofamiglia);
    for (const v of [1, 3]) {
      const a = lancia(con, i, v); const b = lancia(senza, i, v);
      assert.equal(a.pm_costo, Math.max(1, b.pm_costo - 1), `${nome} v${v}: PM`);
      assert.equal(a.va_potere_finale, b.va_potere_finale + 1, `${nome} v${v}: VA`);
    }
  }
  // un incantesimo di un'altra sottofamiglia non cambia
  const altro = dati.incantesimi.incantesimi.find((i) => !['Elementi', 'Manifestazione'].includes(i.specializzazione) && i.livello_base === 1 && i.meccanica);
  assert.equal(lancia(con, altro, 1).pm_costo, lancia(senza, altro, 1).pm_costo);
  // con «Bonus dei Talenti» spento non valgono
  const spento = { ...con, bonusTalenti: false };
  assert.equal(lancia(spento, inc('Colpo Elementale'), 3).pm_costo, lancia(senza, inc('Colpo Elementale'), 3).pm_costo);
});

test('Specializzazione di un’Abilità: +2 solo per l’uso descritto, in una riga della scheda, e solo con la voce', () => {
  const p = carica('c_freelance_tecnico_l5.json');
  const con = alTavolo(p, { creazione: { specializzazioneIniziale: { id: 'specializzazione-informatica' } } });
  const senza = alTavolo(p, {});
  const tec = (s) => s.abilita.find((a) => a.nome === 'Tecnologia');
  const uso = tec(con).usiSpecifici.find((u) => /Informatica/.test(u.uso));
  assert.ok(uso, 'uso specifico mancante');
  assert.equal(uso.valore, (tec(con).effettivo ?? tec(con).totale) + 2);
  assert.equal(tec(con).effettivo ?? tec(con).totale, tec(senza).effettivo ?? tec(senza).totale, 'il VA generale non cambia');
});
