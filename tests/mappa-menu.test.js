// Menu del clic destro sulla mappa (richiesta di Marcello del 07/10/2026; src/mappa/menu.js, data/mappa.json → menu):
// riga rapida, gruppi con intestazione e «Opzioni»; solo le voci utilizzabili; gruppi vuoti nascosti; niente
// ripetizioni; il menu non esce dal riquadro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali, copia } from './helpers.js';
import { componiMenu, unisciMenu, posizioneMenu, erroreMenu, VOCI_MENU, CONTESTI_MENU } from '../src/mappa/menu.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();
const M = dati.mappa.menu;
const voce = (testo, o = {}) => () => ({ testo, azione: () => {}, ...o });

test('dati: i quattro contesti, voci note, altezza per il dito; il validatore li controlla', () => {
  assert.equal(erroreMenu(M), null);
  assert.deepEqual(CONTESTI_MENU, ['token', 'porta', 'template', 'mappa']);
  assert.deepEqual(M.token.rapida, ['passo', 'corsa', 'scatto', 'libero']);
  assert.deepEqual(M.token.gruppi.map((g) => g.titolo), ['Movimento', 'Azioni', 'Veicolo', 'Strumenti', 'Scheda', 'Selezione']);
  assert.deepEqual(M.token.opzioni, ['nascondi', 'luce_token', 'colore_bordo', 'togli_token']);
  assert.ok(M.altezza_voce_px >= 32);
  for (const [k, cambia, re] of [
    ['voce', (d) => d.mappa.menu.token.gruppi[0].voci.push('vola'), /vola/],
    ['ripetuta', (d) => d.mappa.menu.token.opzioni.push('linea'), /linea.*ripetuta/],
    ['altezza', (d) => { d.mappa.menu.altezza_voce_px = 20; }, /altezza_voce_px/],
  ]) {
    const d = copia(dati);
    cambia(d);
    assert.ok(validaDati(d).some((e) => e.file === 'mappa.json' && re.test(`${e.chiave} ${e.messaggio ?? e.problema ?? JSON.stringify(e)}`)), k);
  }
  // ogni id dei dati è fra quelli che la pagina sa costruire
  for (const c of CONTESTI_MENU) for (const id of [...(M[c].rapida ?? []), ...M[c].gruppi.flatMap((g) => g.voci), ...(M[c].opzioni ?? [])]) assert.ok(VOCI_MENU[c].includes(id), `${c}.${id}`);
});

test('token: riga rapida anche spenta; gruppi solo con voci utilizzabili; gruppi vuoti nascosti; opzioni con la distruttiva in fondo', () => {
  const f = {
    passo: voce('Passo', { scelta: true }), corsa: voce('Corsa', { disabilitata: true, titolo: 'Passo già cominciato' }), scatto: voce('Scatto', { disabilitata: true }), libero: voce('Libero'),
    annulla_movimento: () => null, nuovo_turno: () => null, // nessun movimento, scontro aperto: gruppo «Movimento» vuoto
    attacca: voce('Attacca!'), porta_token: () => [voce('Apri la porta', { chiave: 'porta:a' })(), voce('Apri la porta', { chiave: 'porta:b' })()],
    linea: voce('Linea di tiro', { tasto: 'L' }), area: voce('Mostra area', { tasto: 'M' }), zoc: voce('Mostra ZoC'), template_qui: voce('Template da qui…'),
    mini_scheda: voce('Apri mini-scheda'), scheda_completa: voce('Apri scheda completa', { disabilitata: true }),
    togli_token: voce('Togli dalla mappa…', { pericolo: true }), nascondi: voce('Nascondi ai giocatori'), colore_bordo: () => null,
  };
  const m = componiMenu(M.token, f);
  assert.deepEqual(m.rapida.map((v) => [v.testo, !!v.disabilitata, !!v.scelta]), [['Passo', false, true], ['Corsa', true, false], ['Scatto', true, false], ['Libero', false, false]]);
  assert.equal(m.rapida[1].titolo, 'Passo già cominciato', 'il motivo nel suggerimento');
  assert.deepEqual(m.gruppi.map((g) => [g.titolo, g.voci.map((v) => v.testo)]), [
    ['Azioni', ['Attacca!', 'Apri la porta', 'Apri la porta']],
    ['Strumenti', ['Linea di tiro', 'Mostra area', 'Mostra ZoC', 'Template da qui…']],
    ['Scheda', ['Apri mini-scheda']],
  ]);
  assert.deepEqual(m.opzioni.map((v) => v.testo), ['Nascondi ai giocatori', 'Togli dalla mappa…']);
  assert.equal(m.opzioni.at(-1).pericolo, true);
});

test('niente voci ripetute; più menu nello stesso punto (porta e due template) in fila', () => {
  const doppia = componiMenu({ gruppi: [{ titolo: 'A', voci: ['x'] }, { titolo: 'B', voci: ['y'] }], opzioni: ['z'] }, { x: voce('Uguale'), y: voce('Uguale'), z: voce('Uguale') });
  assert.deepEqual([doppia.gruppi.length, doppia.gruppi[0].voci.length, doppia.opzioni.length], [1, 1, 0]);
  const tpl = (id) => componiMenu({ gruppi: [{ titolo: `Template «${id}»`, voci: ['s'] }], opzioni: ['t'] }, { s: voce('Sposta o ruota', { chiave: `${id}:s` }), t: voce(`Togli «${id}»`, { chiave: `${id}:t`, pericolo: true }) });
  const porta = componiMenu(M.porta, { apri_chiudi: voce('Apri'), blocca: voce('Blocca'), ruota: voce('Ruota (ora verticale)'), segreta: voce('Rendi segreta'), togli_porta: voce('Togli la porta', { pericolo: true }), porta_token: () => null });
  const u = unisciMenu([porta, tpl('Fumo'), tpl('Fuoco')]);
  assert.deepEqual(u.gruppi.map((g) => g.titolo), ['Porta', 'Template «Fumo»', 'Template «Fuoco»']);
  assert.deepEqual(u.opzioni.map((v) => v.testo), ['Ruota (ora verticale)', 'Rendi segreta', 'Togli la porta', 'Togli «Fumo»', 'Togli «Fuoco»']);
});

test('posizione: vicino al bordo destro si apre a sinistra, vicino al fondo verso l’alto, mai fuori', () => {
  // riquadro 1366 × 600, menu 240 × 420
  assert.deepEqual(posizioneMenu(100, 100, 240, 420, 1366, 600), { left: 100, top: 100 });
  assert.deepEqual(posizioneMenu(1300, 100, 240, 420, 1366, 600), { left: 1060, top: 100 }, 'a sinistra del punto');
  assert.deepEqual(posizioneMenu(100, 550, 240, 420, 1366, 600), { left: 100, top: 130 }, 'verso l’alto');
  assert.deepEqual(posizioneMenu(1300, 590, 240, 420, 1366, 600), { left: 1060, top: 170 });
  // menu più alto del riquadro: in cima, dentro
  assert.deepEqual(posizioneMenu(100, 300, 240, 700, 1366, 600).top, 4);
});
