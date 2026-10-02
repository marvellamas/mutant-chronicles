// PG d'esempio con le Tecniche Interiori (esempi/, tools/genera_esempio_tecniche.mjs): valido, wizard senza
// avvisi, file in sincronia con il generatore, Tecniche dei tre gruppi, nessuna magia, PM per più «Attiva».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESEMPIO_TECNICHE, costruisci } from '../tools/genera_esempio_tecniche.mjs';
import { deserializzaPersonaggio } from '../src/character.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const r = costruisci(ESEMPIO_TECNICHE, dati);

test('esempio con le Tecniche Interiori: valido, 5° livello, file del repo uguale al generatore', () => {
  assert.deepEqual(r.problemi, []);
  assert.equal(1 + r.personaggio.livelli.length, 5);
  // il nome del file segue quello dell'export, che «Carica esempi» copia (src/cartella.js → NOME_FILE)
  assert.match(r.file, /^[^\\/:*?"<>|\s]+_liv\d{1,2}_\d{4}-\d{2}-\d{2}\.json$/u);
  // rigenerare con node tools/genera_esempio_tecniche.mjs
  assert.equal(readFileSync(new URL(`../esempi/${r.file}`, import.meta.url), 'utf8'), r.testo);
  const letto = deserializzaPersonaggio(r.testo);
  assert.equal(letto.livelli.length, 4);
  assert.doesNotMatch(r.personaggio.creazione.nome, /Lucas|Dimitri|Botha|Duncan|Michele|Oshi|Pablo/);
});

test('esempio con le Tecniche Interiori: Mishima, Scuola con iniziazione, generiche + Scuola + Lottatore, niente magia', () => {
  const s = r.scheda;
  assert.equal(r.personaggio.creazione.corporazione, 'Mishima');
  assert.deepEqual(s.scuolaMishima, { nome: 'Terra', livello: 4 });
  const gruppi = new Set(s.tecniche.map((t) => dati.tecniche_interiori.tecniche.find((x) => x.id === t.id).gruppo));
  assert.deepEqual([...gruppi].sort(), ['generica', 'lottatore', 'scuola:Terra']);
  assert.ok(!s.incantesimi?.length);
  // con i PM pieni si attivano almeno tre Tecniche a costo fisso
  const costi = s.tecniche.map((t) => dati.tecniche_interiori.tecniche.find((x) => x.id === t.id).costo_pm).filter((c) => c > 0);
  assert.ok(s.pm >= 3 * Math.max(...costi), `PM ${s.pm}`);
});
