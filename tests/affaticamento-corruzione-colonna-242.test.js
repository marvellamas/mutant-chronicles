import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 242, ritocco 4 (visto al tavolo da Marcello, 23/11/2026): Affaticamento e Corruzione si guardano di continuo e si vedevano
// solo nel Combattimento. Adesso stanno nella colonna di sinistra di tutti e otto i tab, sulla riga del titolo delle Ferite (nessuna
// riga nuova: le altezze in pixel le misura la prova nel browser del lotto). Questo file fallisce se uno dei due manca in un tab.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contesto, resa, TAB, ESEMPI } from './scheda-aiuti.js';

const NADIA = ESEMPI.find((f) => f.startsWith('Nadia'));

for (const attiva of TAB) {
  test(`${attiva}: AFFATICAMENTO E CORRUZIONE NELLA COLONNA DI SINISTRA`, () => {
    const r = resa(contesto(NADIA, { attiva }));
    const col = r.classe('colonna-risorse')[0];
    assert.ok(col, 'la colonna di sinistra c’è');
    const breve = col.querySelectorAll('.affaticamento-corruzione-breve')[0];
    assert.ok(breve, 'i due valori ci sono');
    assert.match(breve.textContent, /Aff\.\s*0/, 'Affaticamento');
    assert.match(breve.textContent, /Corr\.\s*0/, 'Corruzione');
    // sulla riga del titolo delle Ferite, non in una riga a sé
    const testa = col.querySelectorAll('.testa-gradi').find((t) => t.children.includes(breve));
    assert.ok(testa && /^Ferite/.test(testa.children[0].textContent), 'nel titolo del riquadro Ferite, non in una riga a sé');
  });
}

test('CON UNA PENALITÀ IL VALORE LA DICE, e un tocco porta al Combattimento', () => {
  const ctx = contesto(NADIA, { attiva: 'inventario', cambia: (s) => { s.affaticamento = 2; s.corruzione = 2; } });
  const r = resa(ctx);
  const breve = r.classe('affaticamento-corruzione-breve')[0];
  assert.match(breve.textContent, /Aff\.\s*−\d/, `Affaticamento con la penalità: «${breve.textContent}»`);
  assert.match(breve.textContent, /Corr\.\s*−\d/, `Corruzione con la penalità: «${breve.textContent}»`);
  // Esposto: nessuna penalità, ma non è «0»
  const esposto = resa(contesto(NADIA, { attiva: 'abilita', cambia: (s) => { s.corruzione = 1; } })).classe('affaticamento-corruzione-breve')[0];
  assert.match(esposto.textContent, /Corr\.\s*Esp\./, `Esposto si dice: «${esposto.textContent}»`);
  (breve.ascolti.click ?? []).forEach((f) => f({ preventDefault() {}, stopPropagation() {} }));
  assert.deepEqual(ctx.chiamate.at(-1), ['vaiTab', 'combattimento']);
});
