// Guida della mappa dentro l'app (#/guida-mappa, src/guida.js): il markdown minimo della guida di Davide diventa
// blocchi (titoli, paragrafi, elenchi con il numero di partenza, grassetto e codice).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blocchiMarkdown, inLinea } from '../src/guida.js';

test('in linea: grassetto e codice', () => {
  assert.deepEqual(inLinea('premi **F11** e `avvia.bat`.'), [{ testo: 'premi ' }, { testo: 'F11', grassetto: true }, { testo: ' e ' }, { testo: 'avvia.bat', codice: true }, { testo: '.' }]);
});

test('blocchi: titoli, paragrafo su più righe, elenchi numerati con la partenza, puntati', () => {
  const b = blocchiMarkdown('# Titolo\n\nUna riga\ne la seguente.\n\n8. otto\n9. nove\n   continua\n\n- a\n- b');
  assert.deepEqual(b.map((x) => x.tipo), ['titolo', 'paragrafo', 'numerato', 'puntato']);
  assert.equal(b[0].livello, 1);
  assert.equal(b[1].pezzi.map((p) => p.testo).join(''), 'Una riga e la seguente.');
  assert.equal(b[2].inizio, 8);
  assert.equal(b[2].voci[1].map((p) => p.testo).join(''), 'nove continua');
  assert.equal(b[3].voci.length, 2);
});

test('la guida della mappa si legge tutta: sezioni e passi', () => {
  const b = blocchiMarkdown(readFileSync(new URL('../docs/battlemap/guida-davide.md', import.meta.url), 'utf8'));
  const titoli = b.filter((x) => x.tipo === 'titolo').map((x) => x.pezzi.map((p) => p.testo).join(''));
  for (const t of ['Preparare la scena', 'Giocare', 'Due schermi sullo stesso PC']) assert.ok(titoli.includes(t), t);
  assert.ok(b.some((x) => x.tipo === 'numerato' && x.inizio === 9), 'la sezione «Giocare» riparte da 9');
});
