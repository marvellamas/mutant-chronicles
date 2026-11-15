import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 203, parte C: **un nemico già salvato non cambia sotto i piedi di nessuno.**
//
// Dal lotto 197 un nemico porta i suoi valori con sé e l'edizione da cui viene (`_bestiario.edizione`). Questo
// lotto ha rigenerato il **corpus** (`esempi/nemici/`), che è lo stampo da cui si creano i nemici, non i nemici
// creati: un Lorath messo in uno scontro il mese scorso ha 40 PV e deve continuare ad averli, con la sua
// edizione scritta accanto. La prova gira su una cartella di prova — i nemici veri di Davide si leggono soltanto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sistemaSalute, senzaFerite } from '../src/senza-ferite.js';
import { validaNemico } from '../src/validate.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();

/** Il Lorath come un nemico salvato prima di questo lotto: 40 PV, edizione 0.47. */
const SALVATO = {
  formato: 'mutant-nemico', versione: 1, id: 'lorath', nome: 'Lorath',
  caratteristiche: { FOR: 6, DES: 5, COS: 6, INT: 2, SAG: 4, CAR: 2 },
  pv: 40, pm: 5, ar: { totale: 2, magica: 0 }, difese: 10, iniziativa: 2,
  salvezze: { tempra: 11, riflessi: 9, volonta: 8, magia: 8 },
  movimento: { passo: 6 },
  attacchi: [
    { nome: 'Chela', tipo: 'ravvicinato', va: 12, danno: '1d8+2', natura: 'Naturale', portata_q: 1, ac: 1 },
    { nome: 'Spina paralizzante', tipo: 'distanza', va: 11, danno: '1d6+2', natura: 'Naturale', proprieta: ['Perforante', 'veleno'], gittata_q: 6, modalita: ['S'], ac: 1 },
  ],
  _bestiario: { edizione: 'Mostri 0.47', sistema_salute: 'solo_PV' },
};

test('il nemico salvato conserva i suoi PV e la sua edizione, mentre il corpus è passato alla 0.69', () => {
  const dove = mkdtempSync(join(tmpdir(), 'mutant-nemici-203-'));
  const file = join(dove, 'lorath.json');
  writeFileSync(file, `${JSON.stringify(SALVATO, null, 2)}\n`);

  // si rilegge dal disco, come fa il Tavolo
  const riletto = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(riletto.pv, 40, 'un nemico salvato non prende i PV della rigenerazione');
  assert.equal(riletto._bestiario.edizione, 'Mostri 0.47', 'e porta scritta l’edizione da cui viene');

  // il corpus, intanto, è alla 0.69 con i PV del manuale: i due numeri convivono e sono distinti
  const corpus = JSON.parse(readFileSync(new URL('../esempi/nemici/mostri/lorath.json', import.meta.url), 'utf8'));
  assert.equal(corpus.pv, 52);
  assert.equal(corpus._bestiario.edizione, 'Mostri 0.69');
  assert.notEqual(riletto.pv, corpus.pv, 'è il punto: lo stampo è cambiato, la copia stampata no');
});

test('il nemico salvato resta valido e l’app lo legge col suo sistema di salute', () => {
  assert.deepEqual(validaNemico(SALVATO, dati, 'lorath.json'), [], 'un nemico salvato prima del lotto deve restare valido');
  assert.equal(sistemaSalute(SALVATO, dati), 'solo_PV');
  assert.equal(senzaFerite(SALVATO, dati), true);
});

test('un nemico salvato senza il campo del sistema di salute non cambia da sé', () => {
  // i nemici creati prima del lotto 197 non hanno `_bestiario`: prendono il predefinito e nient'altro
  const { _bestiario, ...vecchio } = SALVATO;
  assert.deepEqual(validaNemico(vecchio, dati, 'vecchio.json'), []);
  assert.equal(sistemaSalute(vecchio, dati), dati.formato_nemici.sistema_salute.predefinito);
  assert.equal(vecchio.pv, 40, 'i suoi numeri restano i suoi');
});

test('la rigenerazione ha toccato esempi/nemici/, non nemici/: sono due cose diverse', () => {
  // `esempi/nemici/` è lo stampo (tracciato in git, «Carica esempi» lo copia); `nemici/` è la cartella del
  // server, fuori da git, dove stanno i nemici della campagna. Il generatore del lotto scrive solo nel primo.
  const gen = readFileSync(new URL('../tools/lotti/lotto_203_creature_069.mjs', import.meta.url), 'utf8');
  assert.match(gen, /esempi/, 'il generatore scrive negli esempi');
  assert.ok(!/'nemici'\s*\)/.test(gen.replace(/esempi['",\s]*,?\s*'nemici'/g, '')), 'il generatore non deve scrivere nella cartella nemici/ del server');
});
