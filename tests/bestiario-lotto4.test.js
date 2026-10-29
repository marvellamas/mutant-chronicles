// Lotto 4 della ricognizione del 28/10 (Bestiario, parte 1; Manuale dei Mostri 0.46): Iniziativa delle creature mai
// negativa, scala del GS fino a Entità Suprema, Dragomedusa giovane e adulto (A.194).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { aperta } from '../tools/bestiario_pagina.mjs';
import { validaNemico } from '../src/validate.js';
import { nuovoScontro, aggiungiNemici } from '../src/scontro.js';
import { iniziativaCreatura, conIniziativaCreatura } from '../src/iniziativa-creature.js';
import { vociBestiario, pxDiRiferimentoGs } from '../src/nemici.js';

const { dati } = await datiReali();
const radice = new URL('../esempi/nemici/', import.meta.url);
const tutti = [];
(function visita(d) {
  for (const f of readdirSync(d)) {
    const p = new URL(f + (statSync(new URL(f, d)).isDirectory() ? '/' : ''), d);
    if (f.endsWith('.json')) tutti.push([f, JSON.parse(readFileSync(p, 'utf8'))]);
    else if (statSync(p).isDirectory()) visita(p);
  }
})(radice);

test('nessun nemico dei dati ha l’Iniziativa negativa (Mostri 0.46 §4: INI 0 indica il solo d10)', () => {
  assert.ok(tutti.length >= 225);
  assert.deepEqual(tutti.filter(([, n]) => n.iniziativa < 0).map(([f]) => f), []);
});

test('l’Iniziativa delle creature è un minimo a 0 nel calcolo: vale anche per i nemici nuovi e per i file di prima', () => {
  assert.equal(iniziativaCreatura(-4), 0);
  assert.equal(iniziativaCreatura(0), 0);
  assert.equal(iniziativaCreatura(3), 3);
  assert.equal(iniziativaCreatura(undefined), 0);
  assert.deepEqual(conIniziativaCreatura({ iniziativa: -2, pv: 5 }), { iniziativa: 0, pv: 5 });
  const gia = { iniziativa: 2 };
  assert.equal(conIniziativaCreatura(gia), gia, 'lo stesso oggetto se non serve');
  // un file salvato prima (nemici/ del master) si legge già a 0, senza errori e senza riscriverlo
  const vecchio = { ...tutti.find(([f]) => f === 'alce.json')[1], iniziativa: -3 };
  const [voce] = vociBestiario([{ file: 'alce.json', mtime: 1, nemico: vecchio }], dati);
  assert.deepEqual(voce.errori, []);
  assert.equal(voce.nemico.iniziativa, 0);
  assert.equal(vecchio.iniziativa, -3, 'l’originale non è toccato');
  // un file nuovo con l'Iniziativa negativa non passa il formato
  assert.ok(validaNemico({ ...vecchio, id: 'alce' }, dati, 'alce.json').some((e) => /iniziativa/.test(e.chiave)));
});

test('uno scontro con due nemici che prima avevano l’Iniziativa negativa: entrano a 0', () => {
  const alce = { ...tutti.find(([f]) => f === 'alce.json')[1], iniziativa: -1 };
  const ankheg = { ...tutti.find(([f]) => f === 'ankheg.json')[1], iniziativa: -4 };
  let s = nuovoScontro({ id: 'prova-ini', nome: 'Prova', pg: [{ chiave: 'pg-1', nome: 'Aiko', iniziativa: 1, des: 5, int: 5 }] });
  s = aggiungiNemici(s, alce, 1);
  s = aggiungiNemici(s, ankheg, 2);
  const nem = s.partecipanti.filter((p) => p.tipo === 'nemico');
  assert.deepEqual(nem.map((p) => p.base), [0, 0, 0]);
  assert.ok(nem.every((p) => p.scheda.iniziativa === 0));
  assert.match(JSON.stringify(s.registro), /Iniziativa 0,/);
  assert.equal(s.partecipanti.find((p) => p.tipo === 'pg').base, 1, 'i PG non cambiano');
});

test('la scala del GS arriva a Entità Suprema con i PX di riferimento del Direttore §9.3.1', () => {
  const scala = dati.formato_nemici.gs_scala;
  assert.deepEqual(scala.map((x) => [x.nome, x.px]), [
    ['Principiante', 10], ['Inesperto', 20], ['Esperto', 30], ['Veterano', 50], ['Eroe', 70], ['Leggenda', 100],
    ['Mito', 200], ['Semidio', 400], ['Divinità', 800], ['Divinità Maggiore', 1600], ['Entità Suprema', 3200],
  ]);
  // oltre Leggenda ogni fascia raddoppia
  for (let i = 7; i < scala.length; i += 1) assert.equal(scala[i].px, scala[i - 1].px * 2);
  assert.equal(pxDiRiferimentoGs('Mito', dati), 200);
  assert.equal(pxDiRiferimentoGs('Entità Suprema', dati), 3200);
  assert.equal(pxDiRiferimentoGs('Inventato', dati), null);
  // ogni GS dei profili è nella scala; due eccezioni del manuale: «—» (nessun GS, 0 PX: Covata minore, funghi) ed «Elite»
  // (il Signore della guerra hobgoblin, con PX calcolati)
  const nomi = new Set([...scala.map((x) => x.nome), '—', 'Elite', 'Fauna ambientale']);
  assert.deepEqual(tutti.filter(([, n]) => n.gs_px && !nomi.has(n.gs_px.gs)).map(([f]) => f), []);
});

test('Dragomedusa giovane e adulto: GS, PX, valori e fonte del Manuale dei Mostri 0.46 §7.12 (A.194)', () => {
  const g = tutti.find(([f]) => f === 'dragomedusa-giovane.json')[1];
  const a = tutti.find(([f]) => f === 'dragomedusa-adulto.json')[1];
  assert.deepEqual(validaNemico(g, dati, 'g'), []);
  assert.deepEqual(validaNemico(a, dati, 'a'), []);
  assert.deepEqual(g.gs_px, { gs: 'Mito', px: 200, per_pg: 4 });
  assert.deepEqual(a.gs_px, { gs: 'Semidio', px: 400, per_pg: 4 });
  assert.match(g.fonte, /dal Manuale dei Mostri v0\.46/);
  assert.match(a.fonte, /dal Manuale dei Mostri v0\.46/);
  assert.deepEqual([g.pv, a.pv, g.ar, a.ar, g.pm, a.pm], [900, 1600, { totale: 18, magica: 4 }, { totale: 24, magica: 6 }, 80, 120]);
  assert.deepEqual([g.difese, a.difese, g.iniziativa, a.iniziativa], [12, 13, 2, 2]);
  assert.deepEqual(g.caratteristiche, { FOR: 8, DES: 8, COS: 9, INT: 3, SAG: 7, CAR: 4 });
  assert.deepEqual(a.caratteristiche, { FOR: 10, DES: 8, COS: 10, INT: 3, SAG: 8, CAR: 5 });
  assert.deepEqual(g.salvezze, { tempra: 14, riflessi: 13, volonta: 10, magia: 12 });
  assert.deepEqual(a.salvezze, { tempra: 16, riflessi: 14, volonta: 11, magia: 13 });
  const va = (n, x) => n.abilita.find((y) => y.nome === x).va;
  assert.deepEqual(['Corpo a corpo', 'Atletica', 'Percezione', 'Furtività', 'Sopravvivenza'].map((x) => va(g, x)), [14, 14, 13, 8, 11]);
  assert.deepEqual(['Corpo a corpo', 'Atletica', 'Percezione', 'Furtività', 'Sopravvivenza'].map((x) => va(a, x)), [16, 16, 15, 6, 12]);
  assert.deepEqual(g.attacchi.map((x) => [x.nome, x.va, x.danno]), [['Artigli', 14, '4d10×5'], ['Morso', 14, '6d10×5']]);
  assert.deepEqual(a.attacchi.map((x) => [x.nome, x.va, x.danno]), [['Artigli', 16, '6d10×5'], ['Morso', 16, '8d10×5']]);
  assert.deepEqual(g.azioni, { principali: 3, movimento: 1 });
  // assorbimento: Rosso 15/25 UER, Blu 1/2 UEB, Verde 3/5 UEV, batteria 3/5 PM
  const assorb = (n) => n.capacita.find((c) => c.nome === 'Assorbimento').effetto;
  assert.match(assorb(g), /fino a 15 UER.*fino a 1 UEB.*fino a 3 UEV.*fino a 3 PM/);
  assert.match(assorb(a), /fino a 25 UER.*fino a 2 UEB.*fino a 5 UEV.*fino a 5 PM/);
  assert.deepEqual([g.contromisure[0].valore, a.contromisure[0].valore], [6, 8]);
  // entrano in uno scontro con GS e PX
  let s = nuovoScontro({ id: 'prova-drago', nome: 'Prova', pg: [] });
  s = aggiungiNemici(aggiungiNemici(s, g, 1), a, 1);
  assert.deepEqual(s.partecipanti.map((p) => p.scheda.gs_px.gs), ['Mito', 'Semidio']);
  assert.deepEqual(s.partecipanti.map((p) => p.base), [2, 2]);
});

test('la pagina del bestiario online ha il filtro per GS con Mito e Semidio', () => {
  const h = aperta(readFileSync(new URL('../docs/bestiario/bestiario-online.html', import.meta.url), 'utf8'));
  assert.match(h, /aria-label="Grado di Sfida"/);
  assert.match(h, /data-filtro="gs" data-valore="Mito"/);
  assert.match(h, /data-filtro="gs" data-valore="Semidio"/);
  assert.match(h, /data-gs="Mito"/);
});

test('i generatori dei profili non rimettono Iniziative negative', () => {
  for (const f of readdirSync(new URL('../tools/', import.meta.url)).filter((x) => /^genera_mostri_.*\.mjs$/.test(x))) {
    const t = readFileSync(new URL(`../tools/${f}`, import.meta.url), 'utf8');
    assert.ok(!/iniziativa:\s*-\d/.test(t), `${f}: Iniziativa negativa`);
  }
});
