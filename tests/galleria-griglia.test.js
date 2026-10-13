// Griglia della Galleria (13/10/2026, schermata di Marcello con 7 immagini di prova): le schede si accavallavano,
// i nomi lunghi uscivano, i pulsanti erano disallineati e la prima scheda aveva una riga in più. Qui si controlla
// che ogni scheda abbia la stessa struttura (miniatura in un riquadro fisso, nome, categoria, una riga di pulsanti)
// e che il foglio di stile impedisca le sovrapposizioni.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installaDomFinto } from './dom-finto.js';
import { datiReali } from './helpers.js';
import { indiceGalleria } from '../src/galleria.js';

installaDomFinto();
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { pannelloGalleria } = await import('../src/ui/galleria.js');
const { dati } = await datiReali();

const NOME_LUNGO = 'WhatsApp Image 2026 08 28 at 08.34.12 (copia definitiva)';
/** Sette immagini come quelle della prova: nomi lunghi, proporzioni diverse, una mostrata e una già vista. */
function indiceDiProva() {
  const file = [];
  const voci = [];
  for (let i = 1; i <= 7; i++) {
    const f = `immagine-${i}-aabbccddee0${i}.jpg`;
    file.push(f, f.replace('.jpg', '-mini.webp'));
    voci.push({ file: f, nome: i === 1 ? NOME_LUNGO : `Scena ${i}`, categoria: i % 2 ? 'Luoghi' : null, mini: f.replace('.jpg', '-mini.webp'), aggiunta: 100 - i, mostrata: i <= 2 ? 500 + i : null });
  }
  return indiceGalleria(file, { versione: 1, immagini: voci, mostrata: voci[1].file });
}

const resa = (indice) => {
  const ctx = { dati };
  const st = { indice, categoria: null, cerca: '', inCorso: false };
  const el = pannelloGalleria(ctx, st, { ridisegna: () => {} });
  return { el, carte: el.tutti().filter((n) => n.className?.startsWith('galleria-carta')) };
};

test('sette immagini, sette schede tutte con la stessa struttura', () => {
  const { carte } = resa(indiceDiProva());
  assert.equal(carte.length, 7);
  for (const c of carte) {
    const dentro = c.tutti();
    assert.equal(dentro.filter((n) => n.className === 'galleria-riquadro-mini').length, 1, 'miniatura in un riquadro fisso');
    assert.equal(dentro.filter((n) => n.className === 'galleria-mini').length, 1);
    assert.equal(dentro.filter((n) => n.className === 'galleria-nome').length, 1, 'il nome su una riga');
    assert.equal(dentro.filter((n) => n.className === 'galleria-categoria').length, 1, 'la categoria sotto');
    const azioni = dentro.filter((n) => n.className === 'galleria-azioni');
    assert.equal(azioni.length, 1, 'una sola riga di pulsanti');
    const pulsanti = azioni[0].tutti().filter((n) => n.tagName === 'BUTTON');
    assert.ok(pulsanti.length === 2 || pulsanti.length === 3, 'Mostra, e come icone Togli (se già mostrata) ed Elimina');
    assert.match(pulsanti[0].className, /galleria-mostra/);
    for (const b of pulsanti.slice(1)) assert.match(b.className, /btn-icona-galleria/, 'gli altri sono icone');
  }
});

test('il nome lungo non esce dalla scheda: resta nel campo, intero nel suggerimento', () => {
  const { carte } = resa(indiceDiProva());
  const prima = carte[0].tutti().find((n) => n.className === 'galleria-nome');
  assert.equal(prima.attributi.value ?? prima.value, NOME_LUNGO);
  assert.equal(prima.attributi.title, NOME_LUNGO, 'il nome intero si legge passando il mouse');
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.galleria-nome \{[^}]*text-overflow: ellipsis/, 'i puntini');
  assert.match(css, /\.galleria-nome \{[^}]*white-space: nowrap/);
});

test('le schede hanno tutte la stessa altezza e la stessa riga di pulsanti, anche la prima', () => {
  const { carte } = resa(indiceDiProva());
  const righe = carte.map((c) => c.children.length);
  assert.equal(new Set(righe).size, 1, 'stesso numero di blocchi: nessuna scheda più alta per una riga in più');
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.galleria-carta \{[^}]*grid-template-rows: auto 1fr auto/, 'i pulsanti sempre in fondo');
  assert.match(css, /\.galleria-carta \{[^}]*height: 100%/);
  assert.match(css, /\.galleria-griglia \{[^}]*align-items: stretch/);
  assert.match(css, /\.galleria-azioni \{[^}]*flex-wrap: nowrap/, 'i pulsanti non vanno a capo');
});

test('niente sovrapposizioni: colonne che si adattano e miniature ritagliate', () => {
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.galleria-griglia \{[^}]*grid-template-columns: repeat\(auto-fill, minmax\(14rem, 1fr\)\)/);
  assert.match(css, /\.galleria-riquadro-mini \{[^}]*aspect-ratio: 4 \/ 3/, 'stesse proporzioni per tutte');
  assert.match(css, /\.galleria-riquadro-mini \{[^}]*overflow: hidden/, 'l’immagine non esce dal riquadro');
  assert.match(css, /\.galleria-mini \{[^}]*object-fit: cover/, 'ritagliata, mai deformata');
  assert.match(css, /\.galleria-carta \{[^}]*min-width: 0/, 'il contenuto non allarga la colonna');
  // la prova nel browser a 1920 px: il menu della categoria allargava la scheda oltre la colonna
  assert.match(css, /\.galleria-carta \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.galleria-dati \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  // il campo «Cerca per nome» alto come gli altri controlli
  assert.match(css, /\.galleria-cerca, \.galleria-filtro \{[^}]*height: 2\.5rem/);
});

test('un’immagine mai mostrata non ha il pulsante «Togli dalla galleria dei giocatori»', () => {
  const { carte } = resa(indiceDiProva());
  const conTogli = carte.filter((c) => c.tutti().some((n) => /Togli dalla galleria/.test(n.attributi?.title ?? '')));
  assert.equal(conTogli.length, 2, 'solo le due già mostrate');
});
