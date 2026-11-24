import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 244, punti 1 e 3 — i contenitori di PM (batterie, schegge, cristalli, NeC):
//  - nella colonna di sinistra solo l'essenziale: nome, simbolo colorato del tipo, barra della carica e i tastini − e + col valore
//    attuale / totale. Via la sintonizzazione, il tipo a parole, il pulsante ⚡ e l'inserimento manuale;
//  - nel tab Poteri, sugli stessi contenitori, via la riga con l'inserimento della cifra e «Applica» (si usano i tastini);
//  - l'inserimento manuale RESTA nel tab Artefatti, per ogni contenitore: questo file fallisce se sparisce anche di là — sarebbe
//    il solo modo di mettere o togliere più PM in un colpo, e senza un posto dove farlo la funzione non esisterebbe più.
//  - quello che si è tolto dalla colonna si legge ancora nel tab Artefatti (sintonizzazione compresa).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contesto, resa, ESEMPI } from './scheda-aiuti.js';

const conContenitori = (attiva) => ESEMPI.map((f) => contesto(f, { attiva })).filter((c) => (c.tab.scheda.equipaggiamento?.contenitori ?? []).length);
const campi = (nodo) => nodo.tutti().filter((n) => n.className?.includes('campo-variazione-pm'));
const bottoni = (nodo) => nodo.tutti().filter((n) => n.tagName === 'BUTTON').map((b) => b.textContent);

test('NELLA COLONNA: nome, simbolo colorato, barra e i tastini − e +; niente altro', () => {
  const tutti = conContenitori('identita');
  assert.ok(tutti.length >= 1, 'serve un PG d’esempio con un contenitore di Chroma');
  for (const c of tutti) {
    const r = resa(c);
    const colonna = r.classe('colonna-risorse')[0];
    const righe = colonna.tutti().filter((n) => n.className?.startsWith('riga-cristallo'));
    assert.equal(righe.length, c.tab.scheda.equipaggiamento.contenitori.length, 'una riga per contenitore');
    for (const riga of righe) {
      assert.ok(riga.tutti().some((n) => n.className?.includes('chroma-punto')), 'il simbolo colorato del tipo');
      assert.ok(riga.tutti().some((n) => n.className?.includes('cristallo-nome')), 'il nome');
      assert.ok(riga.tutti().some((n) => n.className === 'barra-traccia'), 'la barra della carica');
      assert.deepEqual(bottoni(riga), ['−1', '+1'], 'solo i tastini');
      assert.match(riga.textContent, /\d+ \/ \d+/, 'il valore attuale / totale');
      assert.equal(campi(riga).length, 0, 'niente inserimento manuale nella colonna');
      assert.doesNotMatch(riga.textContent, /sintonizz|trasportat|Scarico \(colore| · Chroma /i, 'né sintonizzazione né il tipo a parole');
      assert.ok(!riga.className.includes('inattivo'), 'niente riga in grigio per la sintonizzazione');
    }
  }
});

test('NEL TAB POTERI: i tastini sì, la riga con l’inserimento della cifra e «Applica» no', () => {
  for (const c of conContenitori('poteri')) {
    const r = resa(c);
    const pm = r.classe('riquadro-pm').filter((n) => !r.classe('colonna-risorse')[0]?.tutti().includes(n));
    const righeTab = pm.flatMap((q) => q.tutti().filter((n) => n.className?.startsWith('riga-cristallo')));
    assert.ok(righeTab.length >= 1, 'gli artefatti con PM nel tab Poteri');
    for (const riga of righeTab) {
      assert.equal(campi(riga).length, 0, 'niente campo ±N nel tab Poteri');
      assert.ok(!bottoni(riga).includes('Applica'), 'niente «Applica»');
      assert.ok(bottoni(riga).includes('+1') && bottoni(riga).includes('−1'), 'i tastini restano');
    }
  }
});

test('L’INSERIMENTO MANUALE RESTA NEL TAB ARTEFATTI, PER OGNI CONTENITORE (fallisce se sparisce anche di là)', () => {
  const tutti = conContenitori('artefatti');
  assert.ok(tutti.length >= 1);
  for (const c of tutti) {
    const r = resa(c);
    const nelTab = r.radice.tutti().filter((n) => n.className?.includes('campo-variazione-pm'));
    // la colonna non ne ha: tutti i campi sono del tab; ce n'è uno per contenitore
    const dellaColonna = r.classe('colonna-risorse')[0].tutti().filter((n) => n.className?.includes('campo-variazione-pm'));
    assert.equal(dellaColonna.length, 0);
    assert.equal(nelTab.length, c.tab.scheda.equipaggiamento.contenitori.length, 'un inserimento manuale per contenitore, tutti nel tab Artefatti');
    const applica = r.radice.tutti().filter((n) => n.tagName === 'BUTTON' && n.textContent === 'Applica');
    assert.equal(applica.length, nelTab.length, 'ognuno col suo «Applica»');
  }
});

test('QUELLO CHE SI È TOLTO DALLA COLONNA SI LEGGE ANCORA NEL TAB ARTEFATTI: sintonizzazione e tipo, per ogni contenitore', () => {
  for (const c of conContenitori('artefatti')) {
    const r = resa(c);
    const schede = r.classe('contenitore-tab');
    assert.ok(schede.length >= 1);
    for (const s of schede) {
      assert.match(s.textContent, /Sintonizzato|Non sintonizzato|Scheggia instabile|riserva integrata/, 'la sintonizzazione');
      assert.match(s.textContent, /Chroma|Energia (Fisica|Mentale|Spirituale)/, 'il tipo');
    }
  }
});
