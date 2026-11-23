import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 242, ritocco 5 (visto al tavolo da Marcello, 23/11/2026): la nota della correzione del master in un carattere molto più
// piccolo del numero, ma sempre lì e leggibile da sola. Se sparisce dietro un tocco nessuno la apre, e un numero corretto a mano
// torna a sembrare un numero sbagliato dell'app. Questo file fallisce se la nota diventa nascondibile (dentro un <details>, con
// `hidden`, con un pulsante che la apre) o se lo stile la nasconde o la rifà grande come il numero.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contesto, resa } from './scheda-aiuti.js';

const DIMITRI = '../tests/fixtures/dimitri-225/Dimitri-Orlav_liv7_2026-11-11.json'; // copia dell'istantanea del 17/11 (sola lettura)

/** Gli antenati di un nodo nel DOM finto (cercati dall'alto: il DOM finto non ha i genitori). */
function antenati(radice, bersaglio) {
  const via = [];
  const cerca = (n) => { if (n === bersaglio) return true; for (const c of n.children ?? []) { via.push(c); if (cerca(c)) return true; via.pop(); } return false; };
  cerca(radice);
  return via.slice(0, -1);
}

test('LA NOTA DEL MASTER C’È, CON IL SUO TESTO, E NON È NASCONDIBILE (Dimitri: FOR, DES, CAR, SAG, INT corrette)', () => {
  const r = resa(contesto(DIMITRI, { attiva: 'identita' }));
  const note = r.classe('nota-correzione-master');
  assert.ok(note.length >= 3, `${note.length} note`);
  for (const n of note) {
    assert.match(n.textContent, /Correzione del master: [+−-]\d/, `si legge da sola: «${n.textContent}»`);
    assert.ok(!n.hidden && !n.getAttribute?.('hidden'), 'non nascosta');
    const su = antenati(r.radice, n);
    assert.ok(!su.some((x) => x.tagName === 'DETAILS'), 'non dentro qualcosa che si apre');
    assert.ok(!su.some((x) => x.hidden), 'nessun antenato nascosto');
    assert.notEqual(n.tagName, 'BUTTON', 'non è un pulsante da toccare per leggerla');
    assert.ok(!(n.ascolti?.click ?? []).length, 'non si apre con un tocco');
  }
});

test('LA FONTE UNA VOLTA SOLA, I VALORI DI SEGUITO: Forza di Dimitri «Correzione del master: +1, −1, −1»', () => {
  const r = resa(contesto(DIMITRI, { attiva: 'identita' }));
  const testi = r.classe('nota-correzione-master').map((n) => n.textContent);
  assert.ok(testi.some((t) => /^Correzione del master: [+−]1, [+−]1, [+−]1$/.test(t)), testi.join(' | '));
  assert.ok(testi.every((t) => (t.match(/Correzione del master/g) ?? []).length === 1), 'la fonte non si ripete');
});

test('LO STILE LA TIENE PICCOLA E VISIBILE: molto più piccola del numero, mai nascosta', () => {
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  const regole = [...css.matchAll(/([^{}]*\.nota-correzione-master[^{}]*)\{([^}]*)\}/g)].map((m) => ({ sel: m[1].trim(), corpo: m[2] }));
  assert.ok(regole.length >= 1, 'la regola c’è');
  for (const { sel, corpo } of regole) {
    assert.doesNotMatch(corpo, /display:\s*none|visibility:\s*hidden|opacity:\s*0(?![.\d])|max-height:\s*0|overflow:\s*hidden/, `${sel}: non deve nascondere la nota`);
  }
  const base = regole.find((x) => /(^|\n|\*\/)\s*\.nota-correzione-master\s*$/.test(x.sel));
  const m = /font-size:\s*([\d.]+)rem/.exec(base?.corpo ?? '');
  assert.ok(m && Number(m[1]) <= 0.75 && Number(m[1]) >= 0.6, `carattere molto più piccolo ma leggibile: ${m?.[1]} rem`);
});
