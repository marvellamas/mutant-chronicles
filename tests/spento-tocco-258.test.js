import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 258 — **il tocco su un pulsante spento dice perché, e il pulsante non fa quello che farebbe.**
//
// Il comportamento di src/ui/spento.js, provato con il DOM finto: `spento: 'motivo'` rende il pulsante toccabile
// (aria-disabled, mai `disabled`, che non riceve il tocco), con il motivo in `data-motivo` e nel `title`; un solo
// ascoltatore sul documento, in fase di cattura, ferma il clic (nessun onclick parte) e mostra il motivo come avviso
// breve; riaccendendolo il `title` torna com'era e il tocco fa quello che deve.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installaDomFinto } from './dom-finto.js';

const doc = installaDomFinto();
const ascoltatori = [];
doc.addEventListener = (tipo, fn, cattura) => ascoltatori.push({ tipo, fn, cattura });

const { h } = await import('../src/ui/dom.js');
const { spegni, motivoLimite, motivoSpento, eSpento } = await import('../src/ui/spento.js');

/** Un clic sul pulsante come lo vede il documento: il bersaglio sa trovare il suo pulsante spento. */
function tocca(b) {
  let fermato = false;
  let annullato = false;
  const ev = {
    target: { closest: (sel) => (sel.includes('aria-disabled') && b.getAttribute('aria-disabled') === 'true' && b.dataset.motivo !== undefined ? b : null) },
    preventDefault: () => { annullato = true; },
    stopImmediatePropagation: () => { fermato = true; },
  };
  for (const a of ascoltatori.filter((x) => x.tipo === 'click' && x.cattura)) a.fn(ev);
  // poi, se nessuno l'ha fermato, il clic arriva al pulsante come sempre
  if (!fermato) (b.ascolti.click ?? []).forEach((f) => f(ev));
  return { fermato, annullato };
}
const avvisoVisibile = () => doc.getElementById('avvisi')?.textContent ?? '';
const aspetta = () => new Promise((r) => setTimeout(r, 30));

test('un pulsante spento resta toccabile: aria-disabled, mai disabled, col motivo nel data e nel title', () => {
  const b = h('button', { type: 'button', title: 'Fa una cosa', spento: 'Scegli prima il bersaglio.', onclick: () => {} }, 'Attacca');
  b.closest = () => null;
  assert.equal(b.getAttribute('aria-disabled'), 'true');
  assert.equal(b.dataset.motivo, 'Scegli prima il bersaglio.');
  assert.equal(b.getAttribute('title'), 'Scegli prima il bersaglio.', 'per il mouse il title è il motivo');
  assert.notEqual(b.disabled, true, 'mai `disabled`: un pulsante disabled non riceve il tocco, e sul tablet non dice niente');
  assert.equal(motivoSpento(b), 'Scegli prima il bersaglio.');
  assert.equal(eSpento(b), true);
});

test('il tocco sul pulsante spento ferma il clic e mostra il motivo; il suo onclick non parte', async () => {
  let partito = 0;
  const b = h('button', { type: 'button', spento: 'Nessun caricatore di riserva.', onclick: () => { partito += 1; } }, '−');
  b.closest = () => null;
  assert.ok(ascoltatori.some((a) => a.tipo === 'click' && a.cattura === true), 'un ascoltatore di cattura sul documento, installato alla prima volta');
  const esito = tocca(b);
  assert.equal(esito.fermato, true, 'stopImmediatePropagation: nessun onclick, né del pulsante né degli antenati');
  assert.equal(esito.annullato, true);
  assert.equal(partito, 0, 'il pulsante spento non fa quello che farebbe');
  await aspetta();
  assert.match(avvisoVisibile(), /Nessun caricatore di riserva\./, 'e il tocco dice perché');
});

test('riaccesso, il pulsante fa quello che deve e il title torna com’era', () => {
  let partito = 0;
  const b = h('button', { type: 'button', title: 'Toglie un caricatore', spento: 'Nessun caricatore.', onclick: () => { partito += 1; } }, '−');
  b.closest = () => null;
  spegni(b, null);
  assert.equal(b.getAttribute('aria-disabled'), null);
  assert.equal(b.dataset.motivo, undefined);
  assert.equal(b.getAttribute('title'), 'Toglie un caricatore', 'il title descrittivo torna');
  assert.equal(tocca(b).fermato, false);
  assert.equal(partito, 1);
  // e senza title di partenza il title sparisce con il motivo
  const c = h('button', { type: 'button', spento: 'Boh.' }, 'x');
  spegni(c, null);
  assert.equal(c.getAttribute('title'), null);
  // di nuovo spento, di nuovo muto: il giro si ripete senza residui
  spegni(c, 'Ancora no.');
  assert.equal(c.dataset.motivo, 'Ancora no.');
});

test('un motivo dimenticato non produce un pulsante muto: c’è una frase di ripiego', () => {
  const b = h('button', { type: 'button', spento: true }, 'x');
  assert.ok((b.dataset.motivo ?? '').length > 10, 'spento: true senza testo dice comunque qualcosa');
  assert.equal(b.getAttribute('aria-disabled'), 'true');
});

test('un pulsante acceso non ha niente: nessun aria-disabled, nessun data-motivo', () => {
  for (const v of [undefined, null, false, '', '  ']) {
    const b = h('button', { type: 'button', spento: v }, 'x');
    assert.equal(b.getAttribute('aria-disabled'), null, `spento: ${JSON.stringify(v)} lascia il pulsante acceso`);
    assert.equal(b.dataset.motivo, undefined);
  }
});

test('motivoLimite: le due frasi dei tasti − e + a un limite, in un posto solo', () => {
  assert.equal(motivoLimite(0, -1, 10, 'I PV di Oshi'), 'I PV di Oshi già a 0.');
  assert.equal(motivoLimite(3, -1, 10, 'I PV di Oshi'), null);
  assert.equal(motivoLimite(10, 1, 10, 'I PV di Oshi'), 'I PV di Oshi già al massimo (10).');
  assert.equal(motivoLimite(10, 5, null, 'I PV di Oshi'), null, 'senza massimo il + non si spegne mai');
});
