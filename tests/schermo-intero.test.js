// Lotto 166 (02/11/2026): il pulsante dello schermo intero (src/ui/schermo-intero.js). Quello che si può controllare
// senza un browser: le due forme dell'API (con e senza webkit), il pulsante nascosto dove l'API non c'è o non è permessa
// (iPhone), l'icona e l'etichetta che seguono lo stato anche uscendo con Esc (evento di cambio), la richiesta fatta
// subito dal tocco, l'errore che non rompe niente.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installaDomFinto, togliDomFinto } from './dom-finto.js';
import { apiSchermoIntero, statoPulsante, pulsanteSchermoIntero } from '../src/ui/schermo-intero.js';

let dom;
beforeEach(() => { dom = installaDomFinto(); });
afterEach(() => togliDomFinto());

/** Un documento finto con l'API dello schermo intero: { standard | webkit | nessuna }, permesso o no. */
function documento({ forma = 'standard', permesso = true, fallisce = false } = {}) {
  const ascolti = {};
  const chiamate = [];
  const d = {
    addEventListener: (tipo, fn) => { (ascolti[tipo] ??= []).push(fn); },
    querySelectorAll: (sel) => dom.body.querySelectorAll(sel),
    documentElement: {},
  };
  const cambia = (el) => {
    if (forma === 'webkit') d.webkitFullscreenElement = el; else d.fullscreenElement = el;
    for (const tipo of ['fullscreenchange', 'webkitfullscreenchange']) for (const f of ascolti[tipo] ?? []) f();
  };
  const entra = function entra() { chiamate.push(['entra', this]); if (fallisce) throw new Error('no'); cambia(d.documentElement); };
  const esci = function esci() { chiamate.push(['esci', this]); cambia(null); };
  if (forma === 'standard') { d.documentElement.requestFullscreen = entra; d.exitFullscreen = esci; d.fullscreenEnabled = permesso; d.fullscreenElement = null; }
  if (forma === 'webkit') { d.documentElement.webkitRequestFullscreen = entra; d.webkitExitFullscreen = esci; d.webkitFullscreenEnabled = permesso; d.webkitFullscreenElement = null; }
  return { d, chiamate, ascolti, cambia };
}
const clic = (b) => Promise.all((b.ascolti.click ?? []).map((f) => f({})));

test('API: forma standard e forma webkit (Safari, iPad), tutta la pagina', () => {
  for (const forma of ['standard', 'webkit']) {
    const { d, chiamate } = documento({ forma });
    const api = apiSchermoIntero(d);
    assert.equal(api.disponibile, true, forma);
    assert.equal(api.attivo(), false);
    api.entra();
    assert.equal(chiamate[0][1], d.documentElement, 'la richiesta è su document.documentElement');
    assert.equal(api.attivo(), true);
    api.esci();
    assert.equal(chiamate[1][1], d, 'l’uscita è sul documento');
    assert.equal(api.attivo(), false);
  }
});

test('il pulsante resta nascosto dove l’API non c’è o non è permessa (iPhone)', () => {
  assert.equal(pulsanteSchermoIntero({ doc: documento({ forma: 'nessuna' }).d }).hidden, true);
  assert.equal(pulsanteSchermoIntero({ doc: documento({ permesso: false }).d }).hidden, true);
  assert.equal(pulsanteSchermoIntero({ doc: documento({ forma: 'webkit', permesso: false }).d }).hidden, true);
  assert.equal(pulsanteSchermoIntero({ doc: undefined }).hidden, true);
  const b = pulsanteSchermoIntero({ doc: documento().d });
  assert.equal(b.hidden, false);
  assert.match(b.className, /\bbtn-schermo-intero\b/);
});

test('icona ed etichetta seguono lo stato, anche uscendo con Esc', async () => {
  assert.deepEqual(statoPulsante(false), { icona: '⛶', etichetta: 'Schermo intero', premuto: 'false' });
  assert.deepEqual(statoPulsante(true), { icona: '✕', etichetta: 'Esci da schermo intero', premuto: 'true' });
  for (const forma of ['standard', 'webkit']) {
    const { d, chiamate, cambia } = documento({ forma });
    const b = pulsanteSchermoIntero({ doc: d });
    dom.body.append(b);
    assert.equal(b.textContent, '⛶');
    assert.equal(b.getAttribute('aria-label'), 'Schermo intero');
    await clic(b);
    assert.equal(chiamate.length, 1);
    assert.equal(b.textContent, '✕');
    assert.equal(b.getAttribute('aria-label'), 'Esci da schermo intero');
    // Esc (o il gesto del sistema): il browser esce da solo e manda l'evento di cambio
    cambia(null);
    assert.equal(b.textContent, '⛶', `${forma}: l’icona torna a ⛶ dopo Esc`);
    assert.equal(b.getAttribute('aria-pressed'), 'false');
    // di nuovo dentro, e fuori con il pulsante
    await clic(b);
    await clic(b);
    assert.deepEqual(chiamate.map((c) => c[0]), ['entra', 'entra', 'esci']);
    assert.equal(b.textContent, '⛶');
    b.remove();
  }
});

test('la richiesta parte subito dal tocco, senza attese prima', () => {
  const { d, chiamate } = documento();
  const b = pulsanteSchermoIntero({ doc: d });
  for (const f of b.ascolti.click) f({}); // senza await: la richiesta deve essere già partita
  assert.equal(chiamate.length, 1);
});

test('se il browser rifiuta: un avviso, il pulsante resta com’era', async () => {
  const { d } = documento({ fallisce: true });
  const b = pulsanteSchermoIntero({ doc: d });
  await clic(b);
  assert.equal(b.textContent, '⛶');
  assert.match(dom.getElementById('avvisi')?.textContent ?? '', /Schermo intero non disponibile qui/);
});
