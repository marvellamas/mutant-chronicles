// La mappa che «sobbalzava» (09/10, Marcello): a ogni azione la mappa cambiava misura per un istante.
// Cause: nella pagina del master la scritta di stato della barra («Salvataggio…», «Salvato alle 12:22») cambiava larghezza
// e il gruppo di destra andava a capo; nella vista giocatori il pannello del PG sotto la mappa (tablet in verticale) e la
// barra in alto cambiavano altezza, e ogni cambio del riquadro rifaceva «Adatta allo schermo». Le prove nel browser
// (20 azioni di fila senza cambi della tela né dello zoom) sono nel riepilogo; qui ciò che le tiene ferme.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali, copia } from './helpers.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const giocatori = readFileSync(new URL('../src/ui/mappa/giocatori.js', import.meta.url), 'utf8');

test('la scritta di stato della barra del master ha una larghezza fissa (il gruppo di destra non va a capo)', () => {
  assert.match(css, /\.mappa-gruppo\.gruppo-suoni \.mappa-stato \{ width: [\d.]+rem; max-width: none; flex: none; \}/);
});

test('vista giocatori: barra su una riga, pannello del tablet ad altezza fissa in verticale', () => {
  assert.match(css, /\.giocatori-barra \{ flex-wrap: nowrap;/);
  assert.match(css, /\.giocatori-corpo > \.tablet-pannello:not\(\[hidden\]\) \{ flex: 0 0 auto; height: [\d.]+rem; overflow-y: auto; \}/);
});

test('vista giocatori: si riadatta da sola solo oltre la soglia dei dati, mai per pochi pixel', () => {
  assert.equal(dati.mappa.vista.riadatta_oltre, 0.15);
  assert.match(giocatori, /new ResizeObserver\(\(\) => suRiquadro\(\)\)/);
  assert.match(giocatori, /V\.riadatta_oltre/);
  const d = copia(dati);
  d.mappa.vista.riadatta_oltre = 2;
  assert.ok(validaDati(d).some((e) => e.file === 'mappa.json' && e.chiave === 'vista.riadatta_oltre'));
});
