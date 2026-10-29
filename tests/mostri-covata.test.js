// Covata (nove caste) e Lorath dal Manuale dei Mostri v0.13: profili prestabiliti in esempi/nemici/mostri/,
// validi per il formato e caricati come gli altri prestabiliti dal Tavolo (vociPagina del bestiario online).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';
import { esempiNemici, vociPagina } from '../tools/bestiario_pagina.mjs';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const file = readdirSync(dir).filter((f) => f.endsWith('.json'));
const leggi = (f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'));

const CASTE = ['covata-rasente', 'covata-raccoglitore', 'covata-trasportatore', 'covata-saltatore',
  'covata-corazzato', 'covata-tagliente', 'covata-regina-comandante', 'covata-regina-incubatrice',
  'covata-regina-madre', 'lorath'];

test('le dieci caste/Lorath ci sono e sono valide per il formato', () => {
  const id = file.map((f) => f.replace('.json', '')).sort();
  for (const atteso of CASTE) assert.ok(id.includes(atteso), atteso);
  // solo i profili del cap. 7: gli altri blocchi del catalogo hanno il loro test e la loro versione
  for (const base of CASTE) {
    const n = leggi(`${base}.json`);
    assert.deepEqual(validaNemico(n, dati, base), [], `${base} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0\.(1\d|46).*cap\. 7/);
  }
});

test('Spazio e portata dai dati, GS/PX informativo', () => {
  const rasente = leggi('covata-rasente.json');
  assert.equal(rasente.spazio, '1 Q');
  assert.deepEqual(rasente.gs_px, { gs: 'Principiante', px: 10, per_pg: 4 });
  // la coda della Regina Comandante ha portata 2 Q (dal manuale)
  const regina = leggi('covata-regina-comandante.json');
  assert.equal(regina.attacchi.find((a) => a.nome === 'Coda').portata_q, 2);
  assert.equal(regina.taglia, 'grande', 'massa paragonabile a un veicolo (Sbalzante)');
  assert.deepEqual(regina.gs_px, { gs: 'Eroe', px: 70, per_pg: 4 });
  // A.167: gli ingombri rettangolari e oltre 3 × 3 sono nel campo spazio
  assert.equal(regina.spazio, '2 × 3 Q');
  assert.ok(!/A.167/.test(regina.note));
  const madre = leggi('covata-regina-madre.json');
  assert.equal(madre.spazio, '3 × 10 Q');
  assert.equal(leggi('covata-regina-incubatrice.json').spazio, '3 × 5 Q');
  assert.equal(leggi('covata-corazzato.json').spazio, '1 × 2 Q');
  // il Lorath occupa 2 × 2 Q (ammesso)
  assert.equal(leggi('lorath.json').spazio, '2 × 2 Q');
});

test('capacità con i parametri che il manuale dà (A.115)', () => {
  const regina = leggi('covata-regina-comandante.json');
  const onda = regina.capacita.find((c) => c.nome === 'Onda psichica');
  assert.ok(onda, 'l’Onda psichica c’è');
  assert.equal(onda.risorsa, '4 PM');
  assert.deepEqual(onda.azioni, { principali: 1 });
  assert.deepEqual(onda.usi, { quanti: 1, per: 'Round' });
  assert.match(onda.prova, /PS Volontà/);
  // le caste senza attacchi restano valide (lista vuota)
  const racc = leggi('covata-raccoglitore.json');
  assert.deepEqual(racc.attacchi, []);
  assert.deepEqual(racc.gs_px, { gs: '—', px: 0, per_pg: 4 });
  // tratti comuni della Covata: Ignifugo 6 come Contromisura, resistenza al Fuoco fra le capacità
  assert.deepEqual(racc.contromisure, [{ nome: 'Ignifugo', valore: 6 }]);
  assert.ok(racc.capacita.some((c) => c.nome === 'Resistenza al fuoco'));
  assert.ok(racc.capacita.some((c) => c.nome === 'Disorientamento da freddo'));
  // il Lorath non è Covata: niente Ignifugo
  assert.equal(leggi('lorath.json').contromisure, undefined);
});

test('la Regina Incubatrice non ha Corsa/Scatto (non consentiti)', () => {
  const inc = leggi('covata-regina-incubatrice.json');
  assert.equal(inc.movimento.passo, 1);
  assert.equal(inc.movimento.corsa, 'non_consentito');
  assert.equal(inc.movimento.scatto, 'non_consentito');
});

test('il bestiario online carica le creature del Manuale dei Mostri come prestabiliti', async () => {
  const { esempi, umani, mostri } = await esempiNemici(new URL('../', import.meta.url));
  assert.ok(Object.keys(mostri).length >= 10);
  const voci = vociPagina(dati, { esempi, umani, mostri });
  const gruppoMostri = voci.filter((v) => v.gruppo === 'Manuale dei Mostri');
  assert.ok(gruppoMostri.length >= 10, 'sono nella pagina, nel gruppo Manuale dei Mostri');
  const rasente = gruppoMostri.find((v) => v.titolo === 'Rasente');
  assert.ok(rasente);
  assert.match(rasente.gradoNome ?? '', /GS Principiante/);
  // nessuna regressione: i gruppi di prima ci sono ancora
  for (const g of ['Creature pronte', 'Basi', 'Bestiario umano', 'Esempi del Tavolo']) {
    assert.ok(voci.some((v) => v.gruppo === g), g);
  }
});
