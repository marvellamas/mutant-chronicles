// A.110 (E&L del 05/10/2026, decisione 120): tempi per indossare e togliere le protezioni (regole.json →
// protezioni_rapide.tempi; src/equipaggiamento.js → tempiProtezione, cambioProtezione).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { catalogo, risolvi, tempiProtezione, cambioProtezione } from '../src/equipaggiamento.js';
import { validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const r = (rif, stato = 'zaino') => risolvi({ uid: 'x', rif, stato, quantita: 1 }, cat);
const tempi = (rif) => { const t = tempiProtezione(r(rif), dati); return t ? [t.unita, t.indossare, t.togliere] : null; };

test('A.110: tempi di ogni tipo di protezione', () => {
  assert.deepEqual(tempi('scudi:scudo-piccolo'), ['AzP', 1, 1]);
  assert.deepEqual(tempi('elmetti:elmetto-standard'), ['AzP', 1, 1]);
  assert.deepEqual(tempi('armature:armatura-civile-leggera'), ['min', 1, 1]);
  assert.deepEqual(tempi('armature:armatura-civile-media'), ['min', 5, 1]);
  assert.deepEqual(tempi('armature:armatura-civile-pesante'), ['min', 10, 5]);
  for (const rif of ['rinforzi:soprabito-trenchcoat', 'rinforzi:mantello-ranger', 'rinforzi:tabardo-consacrato']) assert.deepEqual(tempi(rif), ['AzP', 1, 1], rif);
  assert.deepEqual(tempi('rinforzi:sottogiacca-protettiva-ies'), ['AzP', 1, 1]);
  assert.equal(tempiProtezione(r('rinforzi:sottogiacca-protettiva-ies'), dati).copertaDaArmatura, true);
  assert.deepEqual(tempi('rinforzi:rinforzo-leggero'), ['min', 1, 1]);
  assert.deepEqual(tempi('rinforzi:rinforzo-pesante'), ['min', 5, 5]);
  assert.equal(tempiProtezione(r('rinforzi:rinforzo-pesante'), dati).testo, '5 minuti per montare o smontare');
  assert.equal(tempiProtezione(r('armature:armatura-civile-media'), dati).testo, 'indossare 5 minuti, togliere 1 minuto');
  // armature corporative per categoria; esoscheletri e servoassistite: la procedura della scheda prevale
  assert.deepEqual(tempi('armature_corporative:corazza-ussara-hussar-mk-i'), ['min', 5, 1]);
  for (const rif of ['armature_corporative:vulkan', 'armature_corporative:mk-iv-felis-pattern-dei-golden-lions']) assert.equal(tempiProtezione(r(rif), dati).scheda, true, rif);
  // non protezioni: nessun tempo
  assert.equal(tempiProtezione(r('armi:lancia'), dati), null);
});

test('A.110 nel Round: le protezioni in AzP spendono l’Azione, armature e rinforzi strutturali no', () => {
  const round = { inRound: true };
  assert.deepEqual(cambioProtezione(r('scudi:scudo-piccolo', 'pronta'), 'indossa', round, dati), { ammesso: true, motivo: null, azp: 1, testo: '1 AzP del tuo turno per impugnare (A.110).' });
  assert.equal(cambioProtezione(r('elmetti:elmetto-standard', 'indossata'), 'togli', round, dati).azp, 1);
  assert.equal(cambioProtezione(r('rinforzi:soprabito-trenchcoat'), 'indossa', round, dati).azp, 1);
  const a = cambioProtezione(r('armature:armatura-civile-pesante'), 'indossa', round, dati);
  assert.deepEqual([a.ammesso, a.motivo], [false, 'per indossare servono 10 minuti: non si fa durante il Round (A.110)']);
  assert.match(cambioProtezione(r('armature:armatura-civile-media', 'indossata'), 'togli', round, dati).motivo, /per togliere serve 1 minuto/);
  assert.equal(cambioProtezione(r('armature_corporative:vulkan'), 'indossa', round, dati).ammesso, false);
  // fuori dal Round: si fa, con il tempo da contare
  const fuori = cambioProtezione(r('armature:armatura-civile-media'), 'indossa', {}, dati);
  assert.deepEqual([fuori.ammesso, fuori.azp], [true, 0]);
  assert.match(fuori.testo, /^Indossare richiede 5 minuti/);
  // Sottogiacca IES sotto un'armatura: prima si toglie l'armatura; rinforzi strutturali sull'armatura tolta
  assert.match(cambioProtezione(r('rinforzi:sottogiacca-protettiva-ies', 'indossata'), 'togli', { armaturaIndossata: true }, dati).motivo, /prima si toglie l’armatura/);
  assert.equal(cambioProtezione(r('rinforzi:sottogiacca-protettiva-ies', 'indossata'), 'togli', { armaturaIndossata: false, inRound: true }, dati).azp, 1);
  assert.match(cambioProtezione(r('rinforzi:rinforzo-leggero'), 'indossa', { armaturaIndossata: true }, dati).motivo, /sull’armatura tolta/);
});

test('A.110: i benefici valgono solo a protezione interamente indossata', () => {
  const v = (stato) => [{ uid: 'a', rif: 'armature:armatura-civile-media', stato, quantita: 1, note: '' }];
  const ar = (stato) => calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: v(stato) }, livelli: [] }, dati).equipaggiamento.protezioni.length;
  assert.equal(ar('indossata'), 1);
  assert.equal(ar('zaino'), 0);
});

test('A.110: validatore dei tempi', () => {
  const d = copia(dati);
  d.regole.protezioni_rapide.tempi.armatura.Media.indossare_min = 0;
  d.regole.protezioni_rapide.tempi.elmetto.indossare_azp = 2;
  const e = validaDati(d).map((x) => JSON.stringify(x));
  assert.ok(e.some((x) => /armatura\.Media/.test(x)));
  assert.ok(e.some((x) => /elmetto\.indossare_azp/.test(x)));
});
