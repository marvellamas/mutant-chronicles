// Effetti degli oggetti sui VA: dati e frasi del manuale (docs/effetti-oggetti.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validaDati } from '../src/validate.js';
import { frasiMancanti, frasiEffetti } from '../tools/verifica_frasi.mjs';
import { datiReali, copia } from './helpers.js';

const { dati, errori } = await datiReali();

test('effetti degli oggetti: i dati reali passano il validatore', () => {
  assert.deepEqual(errori, []);
  const n = dati.equipaggiamento.indice.file.flatMap(({ id }) => dati.equipaggiamento.file[id].oggetti).filter((o) => o.effetti).length
    + Object.values(dati.dotazioni.oggetti_dotazione).filter((o) => o.effetti).length;
  assert.equal(n, 209); // Equipaggiamento 0.5, cap. 5: +12 strumenti con effetti, −2 voci di dotazione che ora leggono la scheda (analisi, artigianale); Armamenti 0.55: Mantello Venusiano +1; 60 fino al lotto elmetti; elmetti e modifiche (§7.21): 31; armature corporative con proprietà numeriche: 88; scudi con AR (Antiesplosione, Scudo Magico): 3; rinforzi del §7.23: 12; Equipaggiamento 0.3: cap. 2 +4 e cap. 3 +6 nel catalogo, −7 voci di dotazione che ora leggono gli effetti dalla scheda; cap. 6: Farmaco terapeutico
});

test('validatore: effetti con Abilità inesistente, valore 0 o uso mancante sono errori leggibili', () => {
  const x = copia(dati);
  const o = x.equipaggiamento.file.sanitario.oggetti.find((y) => y.id === 'kit-chirurgico-da-campo');
  o.effetti = [{ abilita: 'Chirurgia', valore: 0, ambito: 'uso_specifico', condizione: 'x' }];
  const e = validaDati(x).filter((y) => y.file === 'equipaggiamento/sanitario.json').map((y) => y.problema);
  assert.ok(e.some((p) => p.includes('"Chirurgia" non è un\'Abilità')));
  assert.ok(e.some((p) => p.includes('intero diverso da 0')));
  assert.ok(e.some((p) => p.includes('etichetta breve')));
});

test('script di verifica: ogni frase degli effetti esiste nel testo dei manuali', () => {
  assert.ok(frasiEffetti().length >= 60);
  assert.deepEqual(frasiMancanti(), []);
});
