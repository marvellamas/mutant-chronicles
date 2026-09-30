// File del solo calendario (src/calendario.js → fileCalendario, leggiFileCalendario; src/character.js →
// nomeFileCalendario): export da un personaggio, import su un altro, file sbagliati rifiutati.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { nuovoCalendario, aggiungiNota, avanzaFascia, fileCalendario, leggiFileCalendario, FILE_CALENDARIO } from '../src/calendario.js';
import { nomeFileCalendario, nomeFileEsportazione, serializza, deserializzaPersonaggio, nuoveScelte } from '../src/character.js';

const { dati } = await datiReali();
let n = 0;
const nota = (c, campi) => aggiungiNota(c, campi, { id: `n${++n}`, creato: '2026-09-30T10:00:00Z' }, dati);
const campagna = () => {
  let c = nuovoCalendario('2026-03-10', 'sera', dati);
  c = nota(c, { data: '2026-03-10', fascia: 'sera', testo: 'Arrivo a Luna', colore: 'rosso', ricordare: true });
  c = nota(c, { data: '2026-03-12', fascia: 'mattina', testo: 'Incontro con il Cardinale' });
  return avanzaFascia(c, dati);
};
const testoFile = (c, da, quando = new Date('2026-09-30T18:45:00Z')) => JSON.stringify(fileCalendario(c, da, quando));

test('formato: intestazione tipo, versione, app, esportato, da; poi il blocco com’è nel salvataggio', () => {
  const c = campagna();
  const f = fileCalendario(c, 'Ada Venn', new Date('2026-09-30T18:45:00Z'));
  assert.deepEqual(Object.keys(f), ['tipo', 'versione', 'app', 'esportato', 'da', 'calendario']);
  assert.deepEqual([f.tipo, f.versione, f.app, f.esportato, f.da], ['calendario', 1, 'mutant', '2026-09-30T18:45:00.000Z', 'Ada Venn']);
  assert.deepEqual(f.calendario, c);
  // nome del file: stesso ripulimento dell'export del personaggio
  const d = new Date(2026, 8, 30);
  assert.equal(nomeFileCalendario('  Dex  "Il Gatto" Moreau: v2/3?  ', d), 'calendario_Dex-Il-Gatto-Moreau-v23_2026-09-30.json');
  assert.equal(nomeFileCalendario('', d), 'calendario_personaggio_2026-09-30.json');
  assert.equal(nomeFileEsportazione('Sorella Ilaria Venn', 12, d), 'Sorella-Ilaria-Venn_liv12_2026-09-30.json');
});

test('export → import su un altro personaggio: lo stesso blocco, da chi e quando', () => {
  const c = campagna();
  const r = leggiFileCalendario(testoFile(c, 'Ada Venn'), dati);
  assert.equal(r.ok, true);
  assert.deepEqual(r.calendario, c);
  assert.deepEqual([r.da, r.esportato], ['Ada Venn', '2026-09-30T18:45:00.000Z']);
  // sul personaggio che lo riceve il blocco è quello e si salva così nel suo file
  const salvato = deserializzaPersonaggio(serializza({ ...nuoveScelte(), nome: 'Bruno' }, { calendario: r.calendario })).calendario;
  assert.deepEqual(salvato, c);
});

test('import su un personaggio senza calendario o con il calendario spento: lo crea attivo', () => {
  const spento = { ...campagna(), attivo: false };
  const r = leggiFileCalendario(testoFile(spento, 'Ada'), dati);
  assert.equal(r.ok, true);
  assert.equal(r.calendario.attivo, true);
  assert.deepEqual({ ...r.calendario, attivo: false }, spento);
});

test('file sbagliati: rifiutati con un messaggio chiaro, nessun calendario restituito', () => {
  const c = campagna();
  const personaggio = serializza({ ...nuoveScelte(), nome: 'Ada' }, { calendario: c });
  for (const testo of [personaggio, 'non è JSON', JSON.stringify({ ...fileCalendario(c, 'Ada'), tipo: 'personaggio' }), JSON.stringify({ ...fileCalendario(c, 'Ada'), app: 'altro' })]) {
    const r = leggiFileCalendario(testo, dati);
    assert.equal(r.ok, false);
    assert.equal(r.calendario, undefined);
    assert.match(r.errore, /Non è un file calendario di Mutant: nessuna modifica\./);
  }
  const v2 = leggiFileCalendario(JSON.stringify({ ...fileCalendario(c, 'Ada'), versione: 2 }), dati);
  assert.equal(v2.ok, false);
  assert.match(v2.errore, /^Non è un file calendario di Mutant che questa versione sa leggere \(versione 2, attesa 1\)/);
  const vuoto = leggiFileCalendario(JSON.stringify({ ...FILE_CALENDARIO, calendario: { note: [] } }), dati);
  assert.equal(vuoto.ok, false);
  assert.match(vuoto.errore, /non contiene un calendario leggibile/);
});
