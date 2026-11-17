import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 214 — il lettore delle tabelle del Direttore: prima sull'edizione da cui i dati vengono (0.46), poi su 0.49 e 0.51; una tabella che non si trova
// non è «zero», è non letta; un confronto con un numero cambiato deve far comparire lo scarto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { leggiDirettore, confronta, leggiTabella, numero, righeCelle } from '../tools/importa-direttore.mjs';

const { dati } = await datiReali();
const testo = (f) => readFileSync(new URL(`../docs/manuali-txt/${f}`, import.meta.url), 'utf8');
const TESTI = ['archivio/direttore-0.46.md', 'archivio/direttore-0.49.md', 'direttore-0.51.md'];

for (const f of TESTI) {
  test(`${f}: tutte le tabelle del §9.3, §9.4 e §9.6 si leggono e coincidono coi dati (0 scarti)`, () => {
    const T = leggiDirettore(testo(f));
    const c = confronta(T, dati);
    assert.deepEqual(c.nonLette, ['dotazione', 'pgPresenti', 'esempi'].filter((k) => !T[k]).concat(c.nonLette.filter((k) => !['dotazione', 'pgPresenti', 'esempi'].includes(k))));
    assert.ok(Object.keys(c.letti).length >= 4, 'almeno quattro tabelle confrontate: un controllo verde su zero voci non vale');
    assert.deepEqual(c.scarti, []);
  });
}

test('numero(): le forme del manuale e il non-numero', () => {
  assert.equal(numero('×1,30'), 1.3); assert.equal(numero('1.600'), 1600); assert.equal(numero('+50%'), 50);
  assert.equal(numero('Esperto'), null); assert.equal(numero(''), null);
});

test('una tabella assente è null, non una tabella vuota; una riga a barre diventa le sue celle', () => {
  assert.equal(leggiTabella(['a', 'b', '1', '2'], ['x', 'y']), null);
  assert.deepEqual(righeCelle('| A | B |\n|:-|:-|\n| 1 | 2 |'), ['A', 'B', '1', '2']);
});

test('MUTANTE: un PX ritoccato nei dati compare come scarto, e un titolo mancante come tabella non letta', () => {
  const T = leggiDirettore(testo('direttore-0.51.md'));
  const sporco = structuredClone(dati);
  sporco.px_partita.titoli[2].fattore += 1;
  assert.ok(confronta(T, sporco).scarti.length >= 1);
  const monco = { ...T, titoli: null };
  assert.ok(confronta(monco, dati).nonLette.includes('titoli'));
});
