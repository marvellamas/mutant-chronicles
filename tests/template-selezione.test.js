// Selezionare e togliere un solo template (13/10/2026, richiesta di Marcello dopo la sessione del 12/10): prima si
// potevano solo togliere tutti insieme. Ora i template sono oggetti dell'editor come muri, porte, terreno e token
// liberi: clic, trascinamento, Canc, Ctrl+Z e Ctrl+Y, selezione multipla, pannello delle proprietà.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { caricaDati } from '../src/rules.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { nuovoTemplate } from '../src/mappa/template.js';
import { annullaUltima, rifaiUltima } from '../src/mappa/annulla.js';
import {
  oggettiScena, oggettoSotto, oggettiNelRiquadro, conSelezione, spostaOggetti, eliminaOggetti,
  cambiaProprieta, riassuntoSelezione, nomeOggetto, proprietaOggetto, TIPI,
} from '../src/mappa/editor.js';

const RADICE = new URL('../', import.meta.url);
const { dati } = await caricaDati((n) => readFile(new URL(`data/${n}.json`, RADICE), 'utf8'));

/** Una scena con tre template: due cerchi lontani e un quadrato. */
function scenaConTemplate() {
  const s = nuovaScena({ id: 'prova', nome: 'Prova', colonne: 20, righe: 16, dati });
  const col = dati.mappa.template.colori?.[0]?.valore ?? '#c33';
  s.template = [
    nuovoTemplate({ id: 't1', forma: 'cerchio', misure: { raggio: 2 }, origine: [4, 4], colore: col, nome: 'Fumo', durata: 3, round: 1 }),
    nuovoTemplate({ id: 't2', forma: 'cerchio', misure: { raggio: 1 }, origine: [14, 10], colore: col }),
    nuovoTemplate({ id: 't3', forma: 'quadrato', misure: { lato: 2 }, origine: [17, 2], colore: col, nome: 'Fuoco' }),
  ];
  return s;
}

test('i template sono oggetti dell’editor, uno per ciascuno', () => {
  const s = scenaConTemplate();
  assert.ok(TIPI.includes('template'));
  const o = oggettiScena(s, dati).filter((x) => x.tipo === 'template');
  assert.deepEqual(o.map((x) => x.chiave), ['template:t1', 'template:t2', 'template:t3']);
  assert.ok(o[0].celle.length > 1, 'conosce i Q che copre (serve per il clic e il riquadro)');
  // senza i dati delle regole resta almeno il quadretto d'origine: niente eccezioni
  assert.deepEqual(oggettiScena(s).find((x) => x.chiave === 'template:t2').celle, [[14, 10]]);
});

test('un clic dentro un template lo prende, uno solo', () => {
  const s = scenaConTemplate();
  assert.equal(oggettoSotto(s, [4.5, 4.5], { dati })?.chiave, 'template:t1');
  assert.equal(oggettoSotto(s, [14.5, 10.5], { dati })?.chiave, 'template:t2');
  assert.equal(oggettoSotto(s, [10.5, 14.5], { dati }), null, 'il vuoto resta vuoto');
  // selezione multipla come gli altri oggetti (Maiusc, o il riquadro)
  let st = conSelezione({ strumento: 'seleziona', selezione: [], hover: null }, 'template:t1');
  st = conSelezione(st, 'template:t2', { aggiungi: true });
  assert.deepEqual(st.selezione, ['template:t1', 'template:t2']);
  const nelRiquadro = oggettiNelRiquadro(s, [0, 0], [8, 8], dati).map((x) => x.chiave);
  assert.ok(nelRiquadro.includes('template:t1') && !nelRiquadro.includes('template:t2'));
});

test('si sposta trascinandolo, e solo quello selezionato', () => {
  const s = scenaConTemplate();
  const dopo = spostaOggetti(s, ['template:t1'], [3, -1], dati);
  assert.deepEqual(dopo.template[0].origine, [7, 3]);
  assert.deepEqual(dopo.template[1].origine, [14, 10], 'gli altri non si muovono');
  assert.equal(validaScena(dopo, dati), null);
  // non esce dalla mappa
  assert.deepEqual(spostaOggetti(s, ['template:t3'], [50, -50], dati).template[2].origine, [19, 0]);
  // Ctrl+Z e Ctrl+Y
  const indietro = annullaUltima(dopo);
  assert.deepEqual(indietro.scena.template[0].origine, [4, 4]);
  assert.deepEqual(rifaiUltima(indietro.scena).scena.template[0].origine, [7, 3]);
});

test('Canc ne cancella uno alla volta, e Ctrl+Z lo rimette', () => {
  const s = scenaConTemplate();
  const dopo = eliminaOggetti(s, ['template:t2'], dati);
  assert.deepEqual(dopo.template.map((t) => t.id), ['t1', 't3'], 'solo quello scelto');
  assert.equal(validaScena(dopo, dati), null);
  const indietro = annullaUltima(dopo);
  assert.deepEqual(indietro.scena.template.map((t) => t.id), ['t1', 't2', 't3']);
  assert.deepEqual(rifaiUltima(indietro.scena).scena.template.map((t) => t.id), ['t1', 't3']);
  // più di uno insieme, se selezionati insieme
  assert.deepEqual(eliminaOggetti(s, ['template:t1', 'template:t3'], dati).template.map((t) => t.id), ['t2']);
});

test('il pannello mostra forma, misura, nome e durata, e li cambia', () => {
  const s = scenaConTemplate();
  const r = riassuntoSelezione(s, ['template:t1'], dati);
  assert.equal(r.quanti, 1);
  assert.equal(r.tipo, 'template');
  assert.match(r.testo, /Raggio 2 Q/);
  assert.match(r.testo, /«Fumo»/);
  const prop = Object.fromEntries(r.proprieta.map((p) => [p.chiave, p]));
  assert.match(prop.forma.valore, /Raggio 2 Q/);
  assert.equal(prop.nome.valore, 'Fumo');
  assert.equal(prop.durata.valore, 3);
  assert.equal(prop.nascosto.valore, false);
  // si cambiano nome e durata
  const dopo = cambiaProprieta(s, 'template:t1', { nome: 'Nebbia fitta' }, dati);
  assert.equal(dopo.template[0].nome, 'Nebbia fitta');
  assert.equal(cambiaProprieta(s, 'template:t1', { durata: 5 }, dati).template[0].durata, 5);
  assert.equal(validaScena(dopo, dati), null);
  // due template selezionati: il pannello li conta
  assert.equal(riassuntoSelezione(s, ['template:t1', 'template:t2'], dati).testo, '2 template');
  assert.equal(nomeOggetto(oggettiScena(s, dati).find((o) => o.chiave === 'template:t2'), dati), 'Template Raggio 1 Q');
  assert.ok(proprietaOggetto(oggettiScena(s, dati)[0], dati).length);
});

test('la pagina della mappa passa i dati all’editor (senza, i template non si prendono)', async () => {
  const p = await readFile(new URL('src/ui/mappa/pagina.js', RADICE), 'utf8');
  assert.match(p, /oggettoSotto\(st\.scena, qFrazionario\(m\), \{ tolleranzaQ: tolleranzaQ\(\), dati: ctx\.dati \}\)/);
  assert.match(p, /oggettiScena\(st\.scena, ctx\.dati\)/);
  assert.match(p, /oggettiNelRiquadro\(st\.scena, inQ\(t\.da\), inQ\(t\.a\), ctx\.dati\)/);
  const d = await readFile(new URL('src/ui/mappa/disegno-aree.js', RADICE), 'utf8');
  assert.match(d, /o\.tipo === 'terreno' \|\| o\.tipo === 'template'/, 'il contorno giallo vale anche per i template');
});
