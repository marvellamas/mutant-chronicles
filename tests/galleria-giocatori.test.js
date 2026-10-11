// Galleria, lato giocatori (N1, 13/10/2026): l'immagine a tutto schermo con la ✕, l'elenco delle immagini già
// mostrate e il pulsante «Galleria» nella barra della scheda. Con il DOM finto (tests/dom-finto.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installaDomFinto } from './dom-finto.js';
import { datiReali } from './helpers.js';

installaDomFinto();
const { dati } = await datiReali();
const { sovrapposizioneGalleria, collegaGalleria, urlPerGiocatori } = await import('../src/ui/galleria-giocatori.js');

/** Flusso di eventi finto: `manda('galleria', dati)` come farebbe il server. */
function flussoFinto() {
  const ascolti = {};
  return {
    addEventListener: (tipo, fn) => { (ascolti[tipo] ??= []).push(fn); },
    manda: (tipo, dati) => { for (const fn of ascolti[tipo] ?? []) fn({ data: JSON.stringify(dati) }); },
  };
}

const IMG = { file: 'cripta-aabbccddeeff.jpg', nome: 'La cripta', ridotta: 'cripta-aabbccddeeff-ridotta.webp', mini: null, quando: 10 };

test('ai giocatori va la copia ridotta, mai l’originale', () => {
  assert.equal(urlPerGiocatori(IMG), 'api/galleria/img/cripta-aabbccddeeff-ridotta.webp');
  assert.equal(urlPerGiocatori({ file: 'solo.png', ridotta: null }), 'api/galleria/img/solo.png', 'senza copia ridotta resta l’originale');
  assert.equal(urlPerGiocatori(null), null);
});

test('l’immagine si apre sopra tutto, si sostituisce e si chiude con la ✕ (solo qui)', () => {
  const dentro = document.createElement('div');
  let chiuse = 0;
  const s = sovrapposizioneGalleria({ dentro, suChiusura: () => { chiuse++; } });
  s.mostra(IMG);
  assert.equal(s.aperta(), true);
  assert.equal(dentro.children.length, 1);
  const img = dentro.children[0].children.find((c) => c.tagName === 'IMG');
  assert.equal(img.attributi.src, 'api/galleria/img/cripta-aabbccddeeff-ridotta.webp');
  assert.match(dentro.children[0].textContent, /La cripta/);
  // mostrarne un'altra sostituisce la precedente: una sola sovrapposizione alla volta
  s.mostra({ file: 'barone.png', nome: 'Il Barone', ridotta: null });
  assert.equal(dentro.children.length, 1);
  assert.equal(s.file(), 'barone.png');
  // la ✕ la chiude su questo schermo
  const x = dentro.children[0].children.find((c) => c.className?.includes('galleria-chiudi'));
  x.ascolti.click[0]({});
  assert.equal(s.aperta(), false);
  assert.equal(chiuse, 1);
  assert.equal(dentro.children.length, 0);
});

test('l’evento del master apre e chiude l’immagine su questo schermo', () => {
  const dentro = document.createElement('div');
  globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
  const f = flussoFinto();
  const g = collegaGalleria(f, { dentro });
  f.manda('galleria', IMG);
  assert.equal(g.aperta(), true, '«Mostra ai giocatori»');
  f.manda('galleria', { file: 'altra.png', nome: 'Altra', ridotta: null });
  assert.equal(g.file(), 'altra.png', 'un’altra immagine sostituisce la precedente');
  f.manda('galleria', null);
  assert.equal(g.aperta(), false, '«Nascondi a tutti»');
  // chiusa a mano sul proprio tablet, torna se il master la rimostra
  f.manda('galleria', IMG);
  g.chiudi();
  assert.equal(g.aperta(), false);
  f.manda('galleria', IMG);
  assert.equal(g.aperta(), true);
});

test('all’apertura della pagina si riprende l’immagine già mostrata', async () => {
  const dentro = document.createElement('div');
  globalThis.fetch = async (u) => ({ ok: true, status: 200, json: async () => (String(u).includes('giocatori') ? { mostrata: IMG, immagini: [IMG] } : {}) });
  const g = collegaGalleria(flussoFinto(), { dentro });
  await new Promise((ok) => setTimeout(ok, 5));
  assert.equal(g.aperta(), true, 'chi arriva dopo vede quello che gli altri stanno guardando');
  g.chiudi();
});

test('la scheda ha «Galleria» come ultimo pulsante della barra, solo con il server', () => {
  const t = readFileSync(new URL('../src/ui/tab.js', import.meta.url), 'utf8');
  assert.match(t, /menuImpostazioni\(ctx\),\s*\n\s*\/\/ N1[^\n]*\n\s*ctx\.server \? h\('button', \{ type: 'button', class: 'btn btn-galleria'/);
  assert.match(t, /apriGalleriaGiocatore\(ctx\.dati\)/);
  // il flusso di eventi della scheda resta aperto anche fuori da uno scontro (punto 5)
  const a = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.match(a, /const vuole = chiave && inScheda\(\) \? chiave : null;/);
  assert.match(a, /galleriaScheda = collegaGalleria\(es\);/);
  // lo schermo dei giocatori e la mappa sul tablet ascoltano lo stesso evento
  const g = readFileSync(new URL('../src/ui/mappa/giocatori.js', import.meta.url), 'utf8');
  assert.match(g, /const galleria = collegaGalleria\(null\);/);
  assert.match(g, /galleria\?\.ascolta\(flusso\);/);
  assert.ok(dati.galleria.testi.vuota_giocatori, 'il testo dell’elenco vuoto sta nei dati');
});

test('l’immagine copre ogni barra, così la ✕ resta sempre raggiungibile', () => {
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  const piano = Number(/--z-galleria:\s*(\d+)/.exec(css)?.[1]);
  const altri = [...css.matchAll(/z-index:\s*(\d+)/g)].map((m) => Number(m[1]));
  assert.ok(piano > Math.max(...altri), `la sovrapposizione (${piano}) sta sopra ogni z-index fisso del foglio`);
  assert.match(css, /\.galleria-sovrapposizione \{[^}]*z-index: var\(--z-galleria\)/);
});
