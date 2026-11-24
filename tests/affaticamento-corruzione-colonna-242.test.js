import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 242 → 243 — Affaticamento e Corruzione nella colonna di sinistra di TUTTI e otto i tab, come i due riquadri che stanno nel
// Combattimento (i riquadri «Affaticamento (§5.19)» e «Corruzione (§5.20)», con i loro gradini da impostare), non come una riga di testo.
//
// Perché questo file è stato riscritto: nel 242 il test cercava la classe `affaticamento-corruzione-breve` — la riga di testo «Aff. 0
// Corr. 0» che avevo messo nel titolo delle Ferite — e passava, mentre Marcello aveva chiesto il riquadro. Un test verde su una cosa
// non fatta è il guasto peggiore: qui si cerca **il riquadro** (aria-label e gradini cliccabili), per titolo, in ogni tab, e si
// fallisce se ricompare la riga di testo al posto suo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contesto, resa, TAB, ESEMPI } from './scheda-aiuti.js';

const NADIA = ESEMPI.find((f) => f.startsWith('Nadia'));
const etichetta = (x) => x.getAttribute('aria-label') ?? '';

for (const attiva of TAB) {
  test(`${attiva}: I RIQUADRI DI AFFATICAMENTO E CORRUZIONE SONO NELLA COLONNA DI SINISTRA`, () => {
    const r = resa(contesto(NADIA, { attiva }));
    const col = r.classe('colonna-risorse')[0];
    assert.ok(col, 'la colonna di sinistra c’è');
    const riquadri = col.querySelectorAll('.riquadro-gradi');
    for (const titolo of ['Affaticamento', 'Corruzione']) {
      const q = riquadri.find((x) => etichetta(x).startsWith(titolo));
      assert.ok(q, `${attiva}: il riquadro «${titolo}» manca nella colonna di sinistra`);
      const gradini = q.querySelectorAll('.grado');
      assert.ok(gradini.length >= 3, `${attiva}: «${titolo}» ha i suoi gradini da toccare (${gradini.length})`);
    }
    // non una riga di testo al posto del riquadro
    assert.equal(col.querySelectorAll('.affaticamento-corruzione-breve').length, 0, 'la riga di testo del 242 non deve tornare');
  });
}

test('un gradino toccato nel riquadro imposta il valore, da qualunque tab', () => {
  const ctx = contesto(NADIA, { attiva: 'inventario' });
  const r = resa(ctx);
  const col = r.classe('colonna-risorse')[0];
  const q = col.querySelectorAll('.riquadro-gradi').find((x) => etichetta(x).startsWith('Affaticamento'));
  const gradino = q.querySelectorAll('.grado')[2];
  (gradino.ascolti.click ?? []).forEach((f) => f({ preventDefault() {}, stopPropagation() {} }));
  assert.deepEqual(ctx.chiamate.at(-1), ['imposta', 'affaticamento', 2]);
});
