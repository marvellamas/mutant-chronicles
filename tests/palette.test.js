import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { COPPIE_CONTRASTO, GRUPPI_EQUIPAGGIAMENTO, COLORI_RISERVATI, COLORI_EVENTO, COLORI_MACROFAMIGLIE, classeMacrofamiglia, contrasto, variabiliCss } from '../src/palette.js';
import { TIPI } from '../src/equipaggiamento.js';
import { datiReali } from './helpers.js';

// Palette della scheda digitale (css/palette.css, docs/palette.md)
const leggi = (f) => readFile(new URL(`../css/${f}`, import.meta.url), 'utf8');
const palette = variabiliCss(await leggi('palette.css'));
const stile = variabiliCss(await leggi('style.css'));
const temi = {
  chiaro: { ...stile.chiaro, ...palette.chiaro },
  scuro: { ...stile.chiaro, ...stile.scuro, ...palette.chiaro, ...palette.scuro },
};

test('contrasto: calcolo WCAG su valori noti', () => {
  assert.equal(Math.round(contrasto('#000000', '#ffffff') * 10) / 10, 21);
  assert.equal(contrasto('#777777', '#777777'), 1);
});

test('palette: ogni colore ha la variante chiara e quella scura', () => {
  assert.deepEqual(Object.keys(palette.scuro).sort(), Object.keys(palette.chiaro).sort());
  for (const c of [...COLORI_RISERVATI, ...GRUPPI_EQUIPAGGIAMENTO.map((g) => g.colore)]) assert.ok(palette.chiaro[c] && palette.scuro[c], c);
});

for (const [tema, v] of Object.entries(temi)) {
  test(`palette, tema ${tema}: contrasti (testo ≥ 4.5:1, bordi e barre ≥ 3:1)`, () => {
    const scarsi = COPPIE_CONTRASTO
      .map(([a, b, min]) => ({ a, b, min, r: contrasto(v[a], v[b]) }))
      .filter((x) => x.r < x.min)
      .map((x) => `${x.a} su ${x.b}: ${x.r.toFixed(2)} < ${x.min}`);
    assert.deepEqual(scarsi, []);
  });
}

test('categorie dell’equipaggiamento: una per tipo di oggetto, colori distinti, mai quelli riservati', () => {
  assert.deepEqual(GRUPPI_EQUIPAGGIAMENTO.map((g) => g.tipo), TIPI);
  for (const tema of ['chiaro', 'scuro']) {
    const colori = GRUPPI_EQUIPAGGIAMENTO.map((g) => temi[tema][g.colore].toLowerCase());
    assert.equal(new Set(colori).size, colori.length, `colori ripetuti nel tema ${tema}`);
    const riservati = new Set(COLORI_RISERVATI.flatMap((c) => [c, `${c}-tenue`, `${c}-testo`]).map((c) => temi[tema][c]?.toLowerCase()).filter(Boolean));
    assert.deepEqual(colori.filter((c) => riservati.has(c)), [], `tema ${tema}`);
  }
});

test('macrofamiglie: ogni macrofamiglia degli incantesimi ha il suo colore', async () => {
  const { dati } = await datiReali();
  const nomi = dati.incantesimi.macrofamiglie.map((m) => m.nome);
  assert.deepEqual(nomi.filter((n) => !COLORI_MACROFAMIGLIE[n]), []);
  assert.equal(classeMacrofamiglia('Mentale'), 'macro-mentale');
  assert.equal(classeMacrofamiglia('Oscura'), '');
});

test('bandierine del calendario: tre colori distinti, con le due varianti, mai quelli riservati né delle categorie', () => {
  for (const tema of ['chiaro', 'scuro']) {
    const colori = COLORI_EVENTO.map((c) => temi[tema][c]?.toLowerCase());
    assert.ok(colori.every(Boolean), `tema ${tema}`);
    assert.equal(new Set(colori).size, 3);
    const altri = new Set([...COLORI_RISERVATI.flatMap((c) => [c, `${c}-tenue`, `${c}-testo`]), ...GRUPPI_EQUIPAGGIAMENTO.map((g) => g.colore)]
      .map((c) => temi[tema][c]?.toLowerCase()).filter(Boolean));
    assert.deepEqual(colori.filter((c) => altri.has(c)), [], `tema ${tema}`);
  }
});
