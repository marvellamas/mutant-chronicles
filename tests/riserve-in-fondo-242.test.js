import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 242, ritocco 1 (visto al tavolo da Marcello, 23/11/2026): nella tab Poteri le riserve esterne stanno in fondo, dopo i
// poteri. Prima stavano fra il riquadro dei PM e gli incantesimi e spingevano giù quello che si usa a ogni turno.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contesto, resa, ESEMPI } from './scheda-aiuti.js';

const ANSELMO = ESEMPI.find((f) => f.startsWith('Fratello-Anselmo'));

test('LE RISERVE ESTERNE STANNO DOPO GLI INCANTESIMI nella tab Poteri (Anselmo, Custode con due batterie)', () => {
  const r = resa(contesto(ANSELMO, { attiva: 'poteri' }));
  const titoli = r.tutti.filter((x) => x.tagName === 'H2').map((x) => x.textContent.trim());
  const riserve = titoli.findIndex((t) => /^Riserve esterne/.test(t));
  assert.ok(riserve >= 0, `la sezione c’è: ${titoli.join(' | ')}`);
  const incantesimi = titoli.map((t, i) => (/^(Fisica|Mentale|Spirituale)$/.test(t) ? i : -1)).filter((i) => i >= 0);
  assert.ok(incantesimi.length, 'il Custode ha incantesimi in elenco');
  assert.ok(incantesimi.every((i) => i < riserve), `le riserve vengono dopo l’ultimo gruppo di incantesimi: ${titoli.join(' | ')}`);
  // e il contenuto è lo stesso di prima: le due batterie ci sono
  assert.ok(r.classe('armi-tab').some((x) => /Batteria/.test(x.textContent)), 'le batterie sono nella sezione');
});
