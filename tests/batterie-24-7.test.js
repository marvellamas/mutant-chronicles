// Lotto 4 del 02/10 (docs/diff-manuali-2026-10-02.md): batterie oltre i 5 PM (Magia §24.7, Armamenti §7.5).
// Capacità 10–30 PM colorate e 10–25 PM Bianche; prezzo 200 / 1.000 crediti per PM; SnT pari al Grado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { catalogo } from '../src/equipaggiamento.js';
import { massimiSessione, inizializzaSessione } from '../src/sessione.js';
import { preparaStampa, schemaQuadratini } from '../src/stampa.js';
import { normalizza, testoManuali } from '../tools/verifica_frasi.mjs';
import { datiReali } from './helpers.js';
import { ARCANISTA } from './personaggi.js';

const { dati } = await datiReali();
const batterie = catalogo(dati).oggetti.filter((o) => /^batteria-da-\d+-pm-chroma-/.test(o.id));
const voce = (uid, rif) => ({ uid, rif, stato: 'trasportato', quantita: 1, note: '', sintonizzato: true });

test('Magia §24.7: taglie, prezzi per PM, Grado e SnT, reperibilità', () => {
  const per = (colore) => batterie.filter((b) => b.artefatto.contenitore.energia === colore).map((b) => [b.artefatto.contenitore.capacita_pm, b.costo, b.artefatto.sintonizzazione, b.artefatto.potenza, b.reperibilita]);
  for (const colore of ['Rosso', 'Blu', 'Verde']) {
    assert.deepEqual(per(colore), [
      [5, 1000, 1, 'Comune', 'MR'], [10, 2000, 2, 'Non Comune', 'MR'], [15, 3000, 3, 'Rara', 'MR'],
      [20, 4000, 4, 'Molto Rara', 'MR'], [25, 5000, 5, 'Epica', 'MR'], [30, 6000, 6, 'Leggendaria', 'MR'],
    ], colore);
  }
  // Bianco: un Grado in più; 30 PM «Fuori scala ordinaria» (ricetta eccezionale), non in catalogo
  assert.deepEqual(per('Bianco'), [
    [5, 5000, 2, 'Non Comune', 'LE'], [10, 10000, 3, 'Rara', 'LE'], [15, 15000, 4, 'Molto Rara', 'LE'],
    [20, 20000, 5, 'Epica', 'LE'], [25, 25000, 6, 'Leggendaria', 'LE'],
  ]);
  for (const b of batterie) assert.equal(b.costo, b.artefatto.contenitore.capacita_pm * (b.artefatto.contenitore.energia === 'Bianco' ? 1000 : 200), b.id);
  // le frasi della nota sono del manuale
  const manuali = testoManuali();
  const nuove = batterie.filter((b) => b.artefatto.contenitore.capacita_pm > 5);
  assert.equal(nuove.length, 19);
  for (const f of nuove[0].note_manuale.split(/(?<=\.)\s+/)) assert.ok(manuali.includes(normalizza(f)), f);
});

test('batteria da 30 PM: piena all’acquisto, capacità al tavolo, quadratini nel foglio 5 della SS', () => {
  const creazione = { ...ARCANISTA, equipaggiamento: [voce('t', 'artefatti:batteria-da-30-pm-chroma-verde'), voce('q', 'artefatti:batteria-da-25-pm-chroma-bianco')] };
  const s = calcolaScheda({ creazione, livelli: [] }, dati);
  const m = massimiSessione(s, creazione, dati);
  assert.deepEqual([m.contenitori.t, m.contenitori.q], [30, 25]);
  assert.deepEqual([inizializzaSessione(m).chroma.t.pmAttuali, inizializzaSessione(m).chroma.q.pmAttuali], [30, 25]);
  // SnT 6 + 6: oltre la capacità di un personaggio al 1° Grado complessivo (§7.10)
  assert.equal(s.equipaggiamento.sintonizzazione.usata, 12);
  const d = preparaStampa({ creazione, livelli: [] }, dati);
  assert.match(JSON.stringify(d.fogli), /"capacita":30/);
  // righe da 10 (compatte nel foglio 5): 30 → tre righe piene; 25 → la terza riga con 5 caselle grigie
  const righe = (n) => schemaQuadratini(n, { compatto: true }).blocchi[0].righe.map((r) => r.caselle.filter(Boolean).length);
  assert.deepEqual(righe(30), [10, 10, 10]);
  assert.deepEqual(righe(25), [10, 10, 5]);
});
