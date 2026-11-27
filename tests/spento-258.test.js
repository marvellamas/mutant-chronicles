import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 258 — **un pulsante spento dice perché al tocco, e il motivo non sta solo nel `title`.**
//
// Il difetto: su 108 pulsanti spenti (`disabled`), 65 davano il motivo nel solo `title` e 43 nemmeno quello. Il `title` è il
// suggerimento del mouse: su un tablet non c'è, e un pulsante `disabled` non riceve nemmeno il tocco. Il rimedio è uno solo
// (src/ui/spento.js): `h('button', { …, spento: 'motivo' })` o `spegni(el, motivo)`; il pulsante resta toccabile
// (`aria-disabled`) e il tocco mostra il motivo. Questi controlli fanno diventare rosso il test se uno dei due difetti torna:
//   1. un pulsante che si spegne senza passare dalla funzione (un `disabled:`, un `.disabled =` su un pulsante);
//   2. un `spento:` senza motivo, o un motivo che sta solo nel `title`;
//   3. a schermo (le otto tab di tutti i PG di prova): ogni pulsante spento ha il suo motivo in `data-motivo`.
// Provati in rosso con un mutante per ciascuno (vedi il documento del lotto 258).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { censisci } from '../tools/motivi-nel-title.mjs';
import { dati, contesto, resa, ESEMPI, TAB } from './scheda-aiuti.js';
import { aggiungiCoseDeiSette } from './pg-come-i-sette.mjs';

const SRC = new URL('../src/', import.meta.url);
const file = (rel = '') => readdirSync(new URL(rel, SRC), { withFileTypes: true }).flatMap((d) => (
  d.isDirectory() ? file(`${rel}${d.name}/`) : (/\.js$/.test(d.name) ? [`${rel}${d.name}`] : [])));

// Le eccezioni si dichiarano qui, ciascuna col suo motivo. La lista dei permessi per `disabled:` su un pulsante è VUOTA.
const PERMESSI_DISABLED = [];
// Gli assegnamenti `.disabled =` che restano sono tutti su campi (input, select, casella), non su pulsanti.
const CAMPI_CON_DISABLED = {
  'ui/mappa/pagina.js': { motivo: 'campi del pannello della mappa (input e select: spegnerli non è un pulsante muto)', nomi: ['input', 'el.traccia', 'el.quadretti', 'el.scalaScelta'] },
  'ui/mappa/strumenti.js': { motivo: 'una casella (checkbox) dell’aggancio alla griglia', nomi: ['casella'] },
};

test('nessun pulsante si spegne con `disabled:` (muto al tocco): passa da `spento:`', () => {
  const { righe } = censisci();
  const fuori = righe.filter((r) => !PERMESSI_DISABLED.includes(`${r.f}:${r.riga}`));
  assert.deepEqual(fuori.map((r) => `src/${r.f}:${r.riga} (${r.caso})`), [], 'un pulsante che si spegne con `disabled:` non dice perché al tocco: usa `spento: \'motivo\'` (src/ui/spento.js)');
  assert.equal(PERMESSI_DISABLED.length, 0, 'la lista dei permessi è vuota: una eccezione ha bisogno del suo motivo e di una decisione');
});

test('il motivo non sta solo nel `title`: un `spento:` senza testo, o un `disabled:` con `title:`, fa fallire', () => {
  const { righe, conSpento } = censisci();
  assert.deepEqual(righe.filter((r) => r.caso === 'motivo nel title'), [], 'motivo nel solo title');
  assert.deepEqual(righe.filter((r) => r.caso === 'spento senza motivo'), [], '`spento: true` o vuoto: il motivo è stato dimenticato');
  assert.ok(conSpento >= 100, `il censimento vede i pulsanti spenti (${conSpento}): un controllo verde su zero voci ci ha ingannato tre volte`);
});

test('gli assegnamenti `.disabled =` sono su campi, non su pulsanti', () => {
  const guasti = [];
  let visti = 0;
  for (const f of file()) {
    const testo = readFileSync(new URL(f, SRC), 'utf8');
    for (const m of testo.matchAll(/([A-Za-z_.]+)\.disabled\s*=[^=]/g)) {
      visti += 1;
      const nome = m[1];
      const ok = CAMPI_CON_DISABLED[f]?.nomi.includes(nome);
      if (!ok) guasti.push(`src/${f}: «${nome}.disabled =» — se è un pulsante, usa spegni(el, motivo)`);
    }
  }
  assert.deepEqual(guasti, []);
  assert.ok(visti >= 5, `gli assegnamenti sono ancora visti (${visti}), e le eccezioni dichiarate hanno tutte il loro motivo`);
  for (const [f, e] of Object.entries(CAMPI_CON_DISABLED)) assert.ok(e.motivo.length > 20, `${f}: l’eccezione dichiara il suo motivo`);
});

test('`aria-disabled` si scrive solo da spento.js: nessun pulsante lo imposta per conto suo', () => {
  const fuori = [];
  for (const f of file()) {
    if (f === 'ui/spento.js') continue;
    const testo = readFileSync(new URL(f, SRC), 'utf8');
    if (/setAttribute\('aria-disabled'/.test(testo) || /'aria-disabled':/.test(testo)) fuori.push(`src/${f}`);
  }
  assert.deepEqual(fuori, [], 'un pulsante che imposta aria-disabled da sé ha un motivo che sta dove vuole lui: passa da `spento:` o spegni()');
});

// ——— a schermo: le otto tab dei PG di prova (compreso quello che porta quello che portano i sette) ———
test('a schermo: ogni pulsante spento delle otto tab ha il suo motivo, e nessuno è `disabled`', () => {
  const guasti = [];
  let spenti = 0;
  let pulsanti = 0;
  const confronta = (ctx, etichetta) => {
    for (const n of resa(ctx).tutti) {
      if (n.tagName !== 'BUTTON') continue;
      pulsanti += 1;
      if (n.disabled === true) guasti.push(`${etichetta}: «${n.textContent.trim().slice(0, 30)}» è disabled`);
      if (n.getAttribute('aria-disabled') === 'true') {
        spenti += 1;
        const motivo = n.dataset?.motivo ?? '';
        if (n.dataset?.motivo === undefined) guasti.push(`${etichetta}: «${n.textContent.trim().slice(0, 30)}» aria-disabled senza motivo`);
        if (motivo.trim().length < 5) guasti.push(`${etichetta}: «${n.textContent.trim().slice(0, 30)}» spento senza motivo`);
        if (n.getAttribute('title') !== motivo) guasti.push(`${etichetta}: «${n.textContent.trim().slice(0, 30)}» ha un title diverso dal motivo`);
      }
    }
  };
  for (const f of ESEMPI) for (const attiva of TAB) confronta(contesto(f, { attiva }), `${f}/${attiva}`);
  for (const attiva of TAB) confronta(contesto('Torvald-Krane_liv6_2026-10-02.json', { attiva, scelte: (s) => aggiungiCoseDeiSette(s, dati).scelte }), `PG completo/${attiva}`);
  assert.deepEqual(guasti, []);
  assert.ok(pulsanti > 200, `i pulsanti si vedono (${pulsanti})`);
  assert.ok(spenti >= 10, `almeno una decina di pulsanti spenti nelle otto tab dei PG di prova (${spenti}): un controllo verde su zero voci non vale`);
});
