// Ogni creatura di esempi/nemici/mostri/ (Manuale dei Mostri: Covata, Lorath e i blocchi del cap. 8) si può
// aggiungere a uno scontro di prova come un nemico del bestiario: partecipante con PV e PM pieni, scheda
// completa (GS/PX compreso, non calcolato) e scontro valido. Il test legge la cartella, quindi copre da solo
// anche i blocchi aggiunti dopo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';
import { nuovoScontro, aggiungiNemici, validaScontro } from '../src/scontro.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const file = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
const leggi = (f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'));

test('ogni creatura del Manuale dei Mostri è valida e id = nome del file', () => {
  assert.ok(file.length >= 60, `almeno 60 creature (ce ne sono ${file.length})`);
  for (const f of file) {
    const n = leggi(f);
    assert.equal(n.id, f.replace('.json', ''), `${f}: id come il nome del file`);
    assert.deepEqual(validaNemico(n, dati, f), [], `${f} valido`);
  }
});

test('ogni creatura entra in uno scontro di prova con PV/PM pieni e scheda completa', () => {
  let s = nuovoScontro({ id: 'prova-mostri', nome: 'Prova Mostri', pg: [] });
  for (const f of file) {
    const n = leggi(f);
    s = aggiungiNemici(s, n, 1);
    const p = s.partecipanti.at(-1);
    assert.equal(p.tipo, 'nemico');
    assert.deepEqual(p.pv, { attuali: n.pv, massimo: n.pv }, `${f}: PV pieni`);
    if (Number.isInteger(n.pm)) assert.deepEqual(p.pm, { attuali: n.pm, massimo: n.pm }, `${f}: PM pieni`);
    // GS/PX viaggia con la scheda, tale e quale al manuale (informativo, non calcolato)
    assert.deepEqual(p.scheda.gs_px, n.gs_px, `${f}: GS/PX nella scheda`);
  }
  assert.equal(validaScontro({ ...s, revisione: 1 }), null, 'lo scontro con tutte le creature è valido');
  assert.equal(s.partecipanti.length, file.length);
});

test('più copie della stessa creatura sono numerate e distinte', () => {
  const s = aggiungiNemici(nuovoScontro({ id: 'copie', nome: 'Copie', pg: [] }), leggi('stirge.json'), 3);
  assert.deepEqual(s.partecipanti.map((p) => p.nome), ['Stirge 1', 'Stirge 2', 'Stirge 3']);
});
