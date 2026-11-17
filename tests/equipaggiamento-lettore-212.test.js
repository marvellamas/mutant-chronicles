import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 212 (17/11/2026) — l'Equipaggiamento 0.42: il lettore, la rete, i pesi e i costi dei dati.
//
//  1. la rete — sulla 0.30 (da cui i dati venivano) il lettore trova **un solo** scarto con i dati di oggi, ed è il peso del Corredo da assalto
//     verticale, che la 0.42 ha cambiato (4 → 5 kg): ogni altro scarto sarebbe un difetto del lettore;
//  2. sulla 0.42 nessuno scarto di peso, costo o reperibilità, su più di cento righe appaiate (un controllo su zero righe non prova niente);
//  3. il controllo SA fallire: un peso cambiato, un costo cambiato, una cella illeggibile (che è «non letta», mai zero).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { testoManuale, testoEdizione, versioneManuale } from '../tools/manuali.mjs';
import { leggiTabelle, righeOggetto, oggettiDati, confronta, censimentoIntestazioni, numeroDi } from '../tools/importa-equipaggiamento.mjs';

const leggi = (f) => JSON.parse(readFileSync(new URL(`../data/equipaggiamento/${f}.json`, import.meta.url), 'utf8'));
const dati = oggettiDati(leggi);
const tab = (testo) => leggiTabelle(testo);
const sulla = (testo) => confronta(righeOggetto(tab(testo)).righe, dati);

test('l’Equipaggiamento recepito è la 0.42, e i sei file di dati lo dichiarano', () => {
  assert.equal(versioneManuale('equipaggiamento'), '0.42');
  for (const f of ['comunicazione', 'dotazioni_personali', 'esplorazione', 'impianti', 'sanitario', 'strumenti_professionali']) {
    assert.match(leggi(f).versione_manuale, /Equipaggiamento 0\.42/, f);
  }
});

test('le intestazioni si censiscono: 99 tabelle, nessuna letta a caso', () => {
  const t = tab(testoManuale('equipaggiamento'));
  assert.equal(t.length, 99);
  assert.ok(Object.keys(censimentoIntestazioni(t)).length >= 70);
  const { righe, intestazioniSenzaOggetti } = righeOggetto(t);
  assert.ok(righe.length > 200, `righe-oggetto lette: ${righe.length}`);
  // le tabelle senza peso, costo né reperibilità (impianti per UMN, Chroma per colore…) sono dichiarate non lette, non scartate in silenzio
  assert.ok(intestazioniSenzaOggetti.length > 0);
});

test('LA RETE: sulla 0.30 l’unico scarto coi dati di oggi è il Corredo da assalto verticale (4 → 5 kg)', () => {
  const c = sulla(testoEdizione('equipaggiamento', '0.30'));
  assert.deepEqual(c.scarti.map((s) => `${s.id}.${s.campo}:${s.manuale}/${s.dato}`), ['corredo-da-assalto-verticale.peso:4/5']);
});

test('sulla 0.42 i dati coincidono in peso, costo e reperibilità, su più di cento righe appaiate', () => {
  const c = sulla(testoManuale('equipaggiamento'));
  assert.deepEqual(c.scarti, []);
  assert.ok(c.appaiate > 100, `righe appaiate: ${c.appaiate}`);
});

test('…e il controllo SA fallire: un peso, un costo, una cella illeggibile', () => {
  const righe = righeOggetto(tab(testoManuale('equipaggiamento'))).righe;
  const sporco = (muta) => { const d = oggettiDati(leggi); muta(d); return confronta(righe, d).scarti.length; };
  assert.equal(sporco((d) => { d.get('corredo da assalto verticale').peso = 4; }), 1);
  assert.equal(sporco((d) => { d.get('corredo da cucina da campo').costo = 150; }), 1);
  assert.equal(numeroDi('—'), null, 'una cella che non è un numero è non letta, non zero');
  assert.equal(numeroDi('3,5 kg'), 3.5);
  assert.equal(numeroDi('1.500'), 1500);
});

test('le quattro voci cambiate dal lotto: il valore del manuale corrente', () => {
  const v = (f, id) => leggi(f).oggetti.find((o) => o.id === id);
  assert.equal(v('esplorazione', 'corredo-da-assalto-verticale').peso, 5);
  assert.equal(v('esplorazione', 'corredo-di-sopravvivenza-ambientale').peso, 5);
  assert.equal(v('esplorazione', 'corredo-da-cucina-da-campo').costo, 500);
  assert.equal(v('comunicazione', 'comunicatore-personale').peso, 0.2);
});
