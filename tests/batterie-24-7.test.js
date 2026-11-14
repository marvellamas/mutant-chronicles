// Lotto 4 del 02/10 (docs/diff-manuali-2026-10-02.md): batterie oltre i 5 PM (Magia §24.7, Armamenti §7.5).
// Capacità 10–30 PM colorate e 10–25 PM Bianche; prezzo 200 / 1.000 crediti per PM; SnT pari al Grado.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { catalogo } from '../src/equipaggiamento.js';
import { prezzoArtefatto } from '../src/prezzi-artefatti.js';
import { massimiSessione, inizializzaSessione } from '../src/sessione.js';
import { preparaStampa, schemaQuadratini } from '../src/stampa.js';
import { normalizza, testoManualiDeiDati } from '../tools/verifica_frasi.mjs';
import { datiReali } from './helpers.js';
import { ARCANISTA } from './personaggi.js';

const { dati } = await datiReali();
const batterie = catalogo(dati).oggetti.filter((o) => /^batteria-da-\d+-pm-chroma-/.test(o.id));
const voce = (uid, rif) => ({ uid, rif, stato: 'trasportato', quantita: 1, note: '', sintonizzato: true });

test('Magia §24.7: taglie, prezzi del catalogo, Grado e SnT, reperibilità', () => {
  const per = (colore) => batterie.filter((b) => b.artefatto.contenitore.energia === colore).map((b) => [b.artefatto.contenitore.capacita_pm, b.costo, b.artefatto.sintonizzazione, b.artefatto.potenza, b.reperibilita]);
  for (const colore of ['Rosso', 'Blu', 'Verde']) {
    assert.deepEqual(per(colore), [
      // A.261: i prezzi sono quelli scritti nella tabella dell'Equipaggiamento 0.41 §10.2, che Davide ha
      // ricalcolato con la formula del §24.3. Prima erano 200 cr per PM colorato e 1.000 per PM Bianco.
      [5, 1950, 1, 'Comune', 'MR'], [10, 5400, 2, 'Non Comune', 'MR'], [15, 10500, 3, 'Rara', 'MR'],
      [20, 20700, 4, 'Molto Rara', 'MR'], [25, 34200, 5, 'Epica', 'MR'], [30, 51000, 6, 'Leggendaria', 'MR'],
    ], colore);
  }
  // Bianco: un Grado in più; 30 PM «Fuori scala ordinaria» (ricetta eccezionale), non in catalogo
  assert.deepEqual(per('Bianco'), [
    [5, 9900, 2, 'Non Comune', 'LE'], [10, 25500, 3, 'Rara', 'LE'], [15, 56700, 4, 'Molto Rara', 'LE'],
    [20, 100200, 5, 'Epica', 'LE'], [25, 156000, 6, 'Leggendaria', 'LE'],
  ]);
  // A.261: il prezzo per PM non esiste più — «il prezzo di vendita di una Batteria finita si ricava dal costo
  // completo di creazione secondo la formula del §10.1; non si usa un prezzo fisso per PM» (Equipaggiamento 0.41
  // §9). Qui si controlla che la cifra scritta nel catalogo torni con la formula, non che la si ricalcoli.
  for (const b of batterie) {
    const p = prezzoArtefatto(b, dati);
    assert.equal(p.cr, b.costo, `${b.id}: il prezzo usato è quello del catalogo`);
    assert.equal(p.verifica?.torna, true, `${b.id}: la formula del §24.3 ritrova la cifra scritta`);
  }
  // le frasi della nota sono del manuale
  const manuali = testoManualiDeiDati();
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
