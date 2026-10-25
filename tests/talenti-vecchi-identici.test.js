// Talenti nuovi, lotto 1 (25/10/2026): i personaggi salvati con i Talenti vecchi si aprono e calcolano come su `main`.
// tests/fixtures/talenti-vecchi/: copie dei sette PG del gruppo (6° livello) e l'impronta dei loro valori calcolata su
// `main` prima del lotto (attese.json, insieme ai cinque PG d'esempio). Se un numero cambia, è un difetto del lotto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { improntaPg } from './impronta-talenti.js';

const { dati } = await datiReali();
const cartella = new URL('./fixtures/talenti-vecchi/', import.meta.url);
const attese = JSON.parse(readFileSync(new URL('attese.json', cartella), 'utf8'));

test('i sette PG e i cinque d’esempio, salvati con i Talenti vecchi, calcolano esattamente come prima', () => {
  const file = readdirSync(cartella).filter((f) => f.endsWith('.json') && f !== 'attese.json');
  assert.equal(file.length, 7);
  for (const [chiave, atteso] of Object.entries(attese)) {
    const percorso = chiave.startsWith('fixtures/') ? new URL(chiave.slice('fixtures/'.length), cartella) : new URL(`../${chiave}`, import.meta.url);
    const ora = improntaPg(readFileSync(percorso, 'utf8'), dati);
    for (const k of Object.keys(atteso)) assert.deepEqual(ora[k], atteso[k], `${chiave}: «${k}» è cambiato`);
  }
});
