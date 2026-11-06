import '../tools/guardia-subito.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { promesseNonMantenute, descriviPromessa, testoPerProfilo, testiCreatura, profiliCreatura, capacitaProfilo } from '../src/descrizioni-bestiario.js';
import { datiReali } from './helpers.js';
import { scelteCreatura, profiloNemico } from '../src/crea-nemico.js';

const bestiario = JSON.parse(readFileSync(new URL('../data/bestiario.json', import.meta.url), 'utf8'));
const soloBestiario = { bestiario };
// l'Eretico corrotto prende i valori dai file del bestiario umano (§3.2)
const umani = Object.fromEntries(['recluta', 'veterano', 'elite'].map((s) => [`eretico-${s}`,
  JSON.parse(readFileSync(new URL(`../esempi/nemici/umani/eretico-${s}.json`, import.meta.url), 'utf8'))]));

// Lotto 177 (06/11/2026): nasce dalla A.117, che ha tolto i Doni all'Eretico corrotto Semplice e Medio mentre il
// testo continuava a prometterli («sussurro», «Sguardo del vuoto», la lama che passa l'acciaio).

test('nessuna descrizione del bestiario promette una capacità che il profilo non ha', () => {
  const fuori = promesseNonMantenute(soloBestiario);
  assert.deepEqual(fuori.map(descriviPromessa), [], `${fuori.length} testi da correggere`);
});

test('il controllo riconosce una promessa non mantenuta (rete di sicurezza)', () => {
  // la descrizione di prima della A.117, che prometteva i Doni a ogni grado
  const prima = {
    id: 'eretico-di-prova',
    gradi: ['minore', 'semplice', 'medio'],
    moduli: {},
    moduli_per_grado: { minore: { corrotto: { livello: 'toccato', minori: ['sussurro-continuo'], maggiori: [] } } },
    boss: { grado: 'medio', moduli: { corrotto: { livello: 'consacrato', minori: ['sussurro-continuo'], maggiori: ['sguardo-del-vuoto'] } } },
    descrizione: 'Parla piano, e chi gli sta accanto sente un sussurro sotto le sue parole. Quando guarda qualcuno negli occhi, quello resta fermo un istante di troppo.',
    comportamento: 'Apre con l’Imboscata e lo Sguardo del vuoto sul personaggio più pericoloso.',
  };
  const fuori = promesseNonMantenute(soloBestiario, { creature: [prima] });
  const capacita = [...new Set(fuori.map((p) => p.capacita))].sort();
  assert.deepEqual(capacita, ['sguardo-del-vuoto', 'sussurro-continuo']);
  // il sussurro manca ai due gradi senza Doni, lo Sguardo anche a loro e al Minore
  const sussurro = fuori.find((p) => p.capacita === 'sussurro-continuo');
  assert.deepEqual(sussurro.mancano, ['Semplice', 'Medio']);
  assert.ok(fuori.some((p) => p.campo === 'comportamento' && p.capacita === 'sguardo-del-vuoto'));
});

test('un inciso aggiunge e non restringe: «(il Boss anche con …)»', () => {
  const c = {
    id: 'prova-inciso', gradi: ['semplice'], moduli: {},
    boss: { grado: 'semplice', moduli: { corrotto: { livello: 'consacrato', minori: [], maggiori: ['sguardo-del-vuoto'] } } },
    comportamento: 'Apre con l’Imboscata (il Boss anche con lo Sguardo del vuoto), poi attacca.',
  };
  assert.deepEqual(promesseNonMantenute(soloBestiario, { creature: [c] }), []);
  const profili = profiliCreatura(c, soloBestiario);
  const semplice = testoPerProfilo(c.comportamento, profili[0], soloBestiario);
  const boss = testoPerProfilo(c.comportamento, profili[1], soloBestiario);
  assert.equal(semplice, 'Apre con l’Imboscata, poi attacca.');
  assert.ok(boss.includes('Sguardo del vuoto'), boss);
});

test('l’Eretico corrotto: ogni grado legge il testo che gli spetta', () => {
  const c = bestiario.creature.find((x) => x.id === 'eretico-corrotto');
  const [minore, semplice, medio, boss] = profiliCreatura(c, soloBestiario).map((p) => testiCreatura(c, p, soloBestiario));
  // Semplice e Medio: nessun Dono promesso (A.117)
  for (const t of [semplice, medio]) {
    assert.ok(!/sussurro|Sguardo del vuoto|Grido|non trova ostacoli/.test(t.descrizione), t.descrizione);
    assert.ok(!/Sguardo del vuoto|Grido/.test(t.comportamento), t.comportamento);
    assert.ok(t.descrizione.includes('A.117'), 'dice perché non li ha');
  }
  assert.ok(minore.descrizione.includes('sussurro'), 'il Minore ha il Sussurro continuo');
  assert.ok(!/Sguardo del vuoto|non trova ostacoli/.test(minore.descrizione), minore.descrizione);
  assert.ok(boss.descrizione.includes('negli occhi') && boss.comportamento.includes('Grido'), 'il Boss li ha tutti');
});

test('le capacità di ogni profilo vengono dai moduli di quel grado', () => {
  const c = bestiario.creature.find((x) => x.id === 'eretico-corrotto');
  const q = (g) => capacitaProfilo(c.moduli_per_grado?.[g] ?? c.moduli, soloBestiario);
  assert.deepEqual([...q('minore')].sort(), ['corrotto', 'sussurro-continuo']);
  assert.deepEqual([...q('semplice')], []);
  assert.deepEqual([...q('medio')], []);
  assert.ok(capacitaProfilo(c.boss.moduli, soloBestiario).has('sguardo-del-vuoto'));
});

const { dati } = await datiReali();

test('le note del nemico generato portano il testo del suo grado', () => {
  const nota = (grado, boss = false) => profiloNemico(scelteCreatura('eretico-corrotto', grado, { boss }, dati), dati, { umani }).nemico.note;
  for (const g of ['semplice', 'medio']) {
    const n = nota(g);
    assert.ok(!/sussurro|Sguardo del vuoto|Grido/.test(n), `${g}: ${n}`);
    assert.ok(n.includes('Comportamento:'), 'il comportamento resta');
  }
  assert.ok(nota('minore').includes('sussurro'));
  assert.ok(/Sguardo del vuoto/.test(nota('medio', true)));
});
