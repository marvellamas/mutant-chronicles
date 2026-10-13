// «Mappa semplice» nelle regolazioni della mappa (13/10/2026, richiesta di Marcello): l'interruttore stava in alto a
// destra sulla mappa e nel menu «Strumenti»; ora sta nel pannello delle regolazioni, con griglia, nebbia e il resto.
// Sulla mappa resta solo un piccolo segno «Semplice», e solo quando è accesa: la barra ha più spazio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { caricaDati } from '../src/rules.js';
import { nuovaScena } from '../src/mappa/scena.js';
import { conSemplice, mappaSemplice } from '../src/mappa/semplice.js';
import { VOCI_STRUMENTI, erroreStrumenti } from '../src/mappa/menu.js';

const RADICE = new URL('../', import.meta.url);
const { dati } = await caricaDati((n) => readFile(new URL(`data/${n}.json`, RADICE), 'utf8'));

test('l’effetto non cambia: è sempre lo stesso interruttore della scena', () => {
  const s = nuovaScena({ id: 'p', nome: 'P', colonne: 8, righe: 8, dati });
  assert.equal(mappaSemplice(s), false);
  const acceso = conSemplice(s, true);
  assert.equal(mappaSemplice(acceso), true);
  assert.equal(mappaSemplice(conSemplice(acceso, false)), false);
});

test('la voce non è più nel menu «Strumenti» (né nei dati né fra quelle note)', () => {
  assert.ok(!VOCI_STRUMENTI.includes('mappa_semplice'));
  const voci = dati.mappa.strumenti.gruppi.flatMap((g) => g.voci);
  assert.ok(!voci.includes('mappa_semplice'), 'tolta da data/mappa.json');
  assert.equal(erroreStrumenti(dati.mappa.strumenti), null, 'il menu resta valido');
});

test('l’interruttore è nel pannello delle regolazioni; sulla mappa solo il segno di stato', async () => {
  const p = await readFile(new URL('src/ui/mappa/pagina.js', RADICE), 'utf8');
  assert.match(p, /el\.sempliceInt = h\('button', \{ type: 'button', role: 'switch', class: 'interruttore-mappa', onclick: \(\) => cambiaSemplice\(\) \}\);/);
  assert.match(p, /svuota\(el\.pannello, el\.secScontro, el\.pSemplice,/, 'in cima alle regolazioni della mappa');
  // il badge sulla mappa non commuta più: porta alle regolazioni, e si vede solo se accesa
  assert.match(p, /el\.semplice = h\('button', \{ type: 'button', class: 'mappa-badge mappa-badge-semplice segno-semplice', hidden: true, onclick: \(\) => apriRegolazioniSemplice\(\) \}\);/);
  assert.match(p, /el\.semplice\.hidden = !st\.scena \|\| !v;/);
  assert.match(p, /function apriRegolazioniSemplice\(\) \{\s*\n\s*vaiAlGruppo\('mappa'\);/);
  assert.doesNotMatch(p, /mappa_semplice: \{ testo:/, 'niente voce nel menu Strumenti');
});
