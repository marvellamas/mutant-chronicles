// Lotto 177 (06/11/2026): sul tablet di una copia di prova la fascia gialla «Copia di lavoro» e la riga di stato
// erano tutte e due incollate a top: 0 e, scorrendo, finivano una sopra l'altra. Ora si impilano. Questi controlli
// falliscono se tornano a sovrapporsi, se una riga sola smette di stare a top: 0 (dove la fascia non c'è niente
// deve cambiare) o se il menu a tendina del telefono torna a coprire le righe in cima.
import '../tools/guardia-subito.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pilaFasce, altezzaCoperta, SELETTORE_FASCE } from '../src/ui/altezza-fasce.js';

const CSS = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const sticky = (altezza) => ({ position: 'sticky', top: '0px', altezza });

test('una riga sola resta a top 0: dove non c’è la fascia niente cambia', () => {
  const { top, totale } = pilaFasce([sticky(42)]);
  assert.deepEqual(top, [0]);
  assert.equal(totale, 42);
  assert.deepEqual(pilaFasce([]).top, []);
  assert.equal(pilaFasce([]).totale, 0);
});

test('due righe si impilano: la seconda si ferma sotto la prima, mai sopra', () => {
  const { top, totale } = pilaFasce([sticky(42), sticky(38)]);
  assert.deepEqual(top, [0, 42], 'la riga di stato del tablet sta sotto la fascia della copia');
  assert.equal(totale, 80, 'insieme coprono la somma');
});

test('tre righe (copia, stato del tablet, «Nuova versione») restano in fila', () => {
  const { top, totale } = pilaFasce([sticky(62), sticky(38), sticky(178)]);
  assert.deepEqual(top, [0, 62, 100]);
  assert.equal(totale, 278);
});

test('le righe già impilate si ricalcolano dal loro top scritto, senza accavallarsi', () => {
  // al secondo giro il top non è più «0px»: la riga va comunque impilata (campo impilata)
  const righe = [{ position: 'sticky', top: '0px', altezza: 62 }, { position: 'sticky', top: '62px', impilata: true, altezza: 38 }];
  assert.deepEqual(pilaFasce(righe).top, [0, 62]);
  assert.equal(altezzaCoperta(righe), 100);
});

test('quelle che non stanno in cima non si toccano: la mappa (static) e la pillola del rientro (in basso)', () => {
  const righe = [{ position: 'static', top: 'auto', altezza: 42 }, { position: 'fixed', top: 'auto', altezza: 50 }, sticky(30)];
  const { top, totale } = pilaFasce(righe);
  assert.deepEqual(top, [null, null, 0]);
  assert.equal(totale, 30);
});

test('ogni riga ferma in cima è nel selettore che il modulo osserva', () => {
  const classi = SELETTORE_FASCE.split(',').map((s) => s.trim());
  for (const c of ['.fascia-copia-di-lavoro', '.fascia-stato-tablet', '.barra-aggiornamento', '.fascia-rientro']) {
    assert.ok(classi.includes(c), c);
  }
});

test('su telefono il menu a tendina scende sotto le righe in cima', () => {
  // la regola «.menu-voci» che vale su telefono: quella che fissa il pannello (position: fixed)
  const corpi = [...CSS.matchAll(/\.menu-voci\s*\{([^}]*)\}/g)].map((m) => m[1]);
  const corpo = corpi.find((c) => /position:\s*fixed/.test(c));
  assert.ok(corpo, 'regola del menu su telefono');
  assert.match(corpo, /top:\s*calc\(4\.5rem \+ var\(--alto-fasce, 0px\)\)/, 'parte sotto le righe in cima');
  assert.match(corpo, /max-height:\s*calc\(100vh - 11rem - var\(--alto-fasce, 0px\)\)/, 'e non esce dal fondo');
});
