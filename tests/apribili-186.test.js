import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 186, parte A (dal tavolo del 9/11): sul tablet di un giocatore un potere aperto per leggerlo si richiudeva
// subito. Non era il tocco che arrivava due volte: era che «questo è aperto» stava nel disegno, e la scheda si
// ridisegna da sola a ogni cambio di Round, di turno, di scena o di capitolo.
//
// Qui le due prove che il prompt chiede:
//   1. un ridisegno non deve chiudere quello che era aperto;
//   2. un tocco deve aprire e basta — un tocco vero (pointerdown + pointerup + click, pointerType 'touch'), non un
//      clic del mouse, altrimenti il test è verde e il tablet resta rotto.
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { installaDomFinto, togliDomFinto } from './dom-finto.js';

installaDomFinto();
const { nomeCheSiApre } = await import('../src/ui/talento-leggibile.js');
const { dettagliRicordati, dimenticaApribili, eAperto, quantiApribiliAperti } = await import('../src/ui/apribili.js');

const SCHEDA = { intestazione: 'Tecnica generica', paragrafi: ['Si trasferisce in un Q libero visibile.'] };
/** Un tocco vero come lo manda un tablet: pointerdown, pointerup e poi il click. */
function tocca(el) {
  for (const tipo of ['pointerdown', 'pointerup', 'click']) {
    for (const fn of el.ascolti?.[tipo] ?? []) fn({ type: tipo, pointerType: 'touch', target: el, preventDefault() {} });
  }
}
const clicca = (el) => { for (const fn of el.ascolti?.click ?? []) fn({ type: 'click', pointerType: 'mouse', target: el, preventDefault() {} }); };

beforeEach(() => dimenticaApribili());

test('un ridisegno non chiude quello che il giocatore aveva aperto', () => {
  // primo disegno: chiuso, il giocatore lo apre
  const a = nomeCheSiApre('Salto della Tigre', SCHEDA, { chiave: 'tecnica:salto-della-tigre' });
  assert.equal(a.scheda.hidden, true, 'nasce chiuso');
  clicca(a.nome);
  assert.equal(a.scheda.hidden, false);
  assert.equal(a.nome.getAttribute('aria-expanded'), 'true');
  // ridisegno: elementi nuovi, costruiti da zero, come fa renderScheda
  const b = nomeCheSiApre('Salto della Tigre', SCHEDA, { chiave: 'tecnica:salto-della-tigre' });
  assert.equal(b.scheda.hidden, false, 'dopo un ridisegno deve restare aperto');
  assert.equal(b.nome.getAttribute('aria-expanded'), 'true');
  assert.equal(b.nome.querySelector?.('.segno-apri')?.textContent ?? b.nome.children[0].textContent, '▾ ', 'anche il segno');
  // e se lo chiude, resta chiuso
  clicca(b.nome);
  const c = nomeCheSiApre('Salto della Tigre', SCHEDA, { chiave: 'tecnica:salto-della-tigre' });
  assert.equal(c.scheda.hidden, true, 'chiuso dal lettore: resta chiuso');
});

test('senza chiave si richiude: è il difetto di prima, e serve a dire che la chiave non è facoltativa', () => {
  const a = nomeCheSiApre('Salto della Tigre', SCHEDA);
  clicca(a.nome);
  assert.equal(a.scheda.hidden, false);
  const b = nomeCheSiApre('Salto della Tigre', SCHEDA);
  assert.equal(b.scheda.hidden, true, 'senza chiave il ridisegno lo richiude (comportamento di prima)');
  assert.equal(quantiApribiliAperti(), 0, 'e niente finisce nel registro delle aperture');
});

test('un tocco vero apre e basta: non apre e richiude', () => {
  const a = nomeCheSiApre('Salto della Tigre', SCHEDA, { chiave: 'tecnica:salto-della-tigre' });
  // nessun ascolto di tocco sul nome: un tocco su un <button> dà un solo `click`. Se qualcuno aggiungesse un
  // onpointerdown o un ontouchstart che apre, il primo aprirebbe e il secondo richiuderebbe: qui diventa rosso.
  for (const tipo of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'pointerup']) {
    assert.equal((a.nome.ascolti?.[tipo] ?? []).length, 0, `il nome non deve ascoltare «${tipo}»`);
  }
  tocca(a.nome);
  assert.equal(a.scheda.hidden, false, 'dopo un tocco è aperto');
  assert.equal(eAperto('tecnica:salto-della-tigre'), true);
  // un secondo tocco lo chiude, come deve
  tocca(a.nome);
  assert.equal(a.scheda.hidden, true);
  assert.equal(eAperto('tecnica:salto-della-tigre'), false);
});

test('dettagliRicordati: il <details> ricorda, e «nasce aperto» vale solo la prima volta', () => {
  const uno = dettagliRicordati('tecnica:aura', { class: 'testo-tecnica' });
  assert.equal(uno.open, false);
  uno.open = true;
  for (const fn of uno.ascolti?.toggle ?? []) fn({ target: uno });
  const due = dettagliRicordati('tecnica:aura', { class: 'testo-tecnica' });
  assert.equal(due.open, true, 'dopo un ridisegno resta aperto');

  // un riquadro che nasce aperto: la prima volta sì, poi comanda il lettore
  const treA = dettagliRicordati('valore-esemplare', { open: true });
  assert.equal(treA.open, true);
  treA.open = false;
  for (const fn of treA.ascolti?.toggle ?? []) fn({ target: treA });
  const treB = dettagliRicordati('valore-esemplare', { open: true });
  assert.equal(treB.open, false, 'chiuso dal lettore: non si riapre da solo a ogni disegno');
});

test('cambiando personaggio le chiavi si dimenticano', () => {
  const a = nomeCheSiApre('Salto della Tigre', SCHEDA, { chiave: 'tecnica:salto-della-tigre' });
  clicca(a.nome);
  assert.equal(quantiApribiliAperti(), 1);
  dimenticaApribili();
  const b = nomeCheSiApre('Salto della Tigre', SCHEDA, { chiave: 'tecnica:salto-della-tigre' });
  assert.equal(b.scheda.hidden, true, 'un altro personaggio parte con tutto chiuso');
});

after(() => togliDomFinto());
