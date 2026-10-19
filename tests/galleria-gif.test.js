// Galleria, GIF animate (19/10/2026): la copia ridotta si fa con un canvas e fermerebbe l'animazione al primo fotogramma,
// quindi una GIF non ha la copia ridotta e ai giocatori va l'originale (anche se in cartella è rimasto un «-ridotta»);
// i fotogrammi si contano dai byte; il peso oltre il quale il Direttore è avvisato sta nei dati.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { eGif, conCopiaRidotta, ridottaPerGiocatori, fotogrammiGif, galleriaGiocatori, immagineAiGiocatori } from '../src/galleria.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();

/** Una GIF di w × h con n fotogrammi (LZW senza compressione: clear ogni 250 pixel). */
function gif(w, h, n, { locale = false } = {}) {
  const b = [];
  const u16 = (v) => b.push(v & 255, (v >> 8) & 255);
  b.push(...Buffer.from('GIF89a'));
  u16(w); u16(h); b.push(0xF7, 0, 0);
  for (let i = 0; i < 256; i++) b.push(i, i, i);
  if (n > 1) b.push(0x21, 0xFF, 0x0B, ...Buffer.from('NETSCAPE2.0'), 3, 1, 0, 0, 0);
  for (let f = 0; f < n; f++) {
    b.push(0x21, 0xF9, 4, 0, 10, 0, 0, 0);
    b.push(0x2C); u16(0); u16(0); u16(w); u16(h);
    if (locale) b.push(0x80, 0, 0, 0, 200, 0, 0); else b.push(0);
    b.push(locale ? 2 : 8);
    const dati2 = []; let buf = 0, nb = 0;
    const bit = locale ? 3 : 9;
    const codice = (c) => { buf |= c << nb; nb += bit; while (nb >= 8) { dati2.push(buf & 255); buf >>= 8; nb -= 8; } };
    if (locale) { codice(4); codice(f % 2); codice(f % 2); codice(5); } else { for (let i = 0; i < w * h; i++) { if (i % 250 === 0) codice(256); codice(f * 50 % 256); } codice(257); }
    if (nb) dati2.push(buf & 255);
    b.push(dati2.length, ...dati2, 0);
  }
  b.push(0x3B);
  return new Uint8Array(b);
}

test('i fotogrammi di una GIF si contano dai byte: animata > 1, ferma = 1, altro = 0', () => {
  assert.equal(fotogrammiGif(gif(6, 4, 3)), 3);
  assert.equal(fotogrammiGif(gif(6, 4, 1)), 1);
  assert.equal(fotogrammiGif(gif(6, 4, 2, { locale: true })), 2, 'con la tavolozza locale');
  assert.equal(fotogrammiGif(new Uint8Array([1, 2, 3, 4])), 0);
  assert.equal(fotogrammiGif(new Uint8Array(0)), 0);
});

test('una GIF non ha la copia ridotta: ai giocatori va l’originale, anche con un «-ridotta» rimasto in cartella', () => {
  assert.equal(eGif('Drago.GIF'), true);
  assert.equal(eGif('mappa.png'), false);
  assert.equal(conCopiaRidotta('anim.gif'), false);
  assert.equal(conCopiaRidotta('foto.jpg'), true);
  const g = { file: 'anim.gif', nome: 'Anim', ridotta: 'anim-ridotta.webp', mini: 'anim-mini.webp', mostrata: 5, daiGiocatori: true };
  const j = { file: 'foto.jpg', nome: 'Foto', ridotta: 'foto-ridotta.webp', mini: 'foto-mini.webp', mostrata: 4, daiGiocatori: true };
  assert.equal(ridottaPerGiocatori(g), null);
  assert.equal(ridottaPerGiocatori(j), 'foto-ridotta.webp');
  const indice = { immagini: [g, j], mostrata: 'anim.gif' };
  const elenco = galleriaGiocatori(indice);
  assert.equal(elenco.find((x) => x.file === 'anim.gif').ridotta, null);
  assert.equal(elenco.find((x) => x.file === 'foto.jpg').ridotta, 'foto-ridotta.webp');
  assert.equal(immagineAiGiocatori(indice).ridotta, null);
  assert.equal(immagineAiGiocatori(indice, 'foto.jpg').ridotta, 'foto-ridotta.webp');
  // la miniatura resta (la griglia del master può essere ferma)
  assert.equal(immagineAiGiocatori(indice).mini, 'anim-mini.webp');
});

test('il peso oltre il quale una GIF avvisa il Direttore sta nei dati e il validatore lo controlla', () => {
  assert.ok(dati.galleria.gif.peso_avviso_mb > 0);
  assert.match(dati.galleria.testi.gif_pesante, /\{nome\}.*\{mb\}/);
  assert.deepEqual(validaDati(dati), []);
  const rotto = { ...dati, galleria: { ...dati.galleria, gif: { peso_avviso_mb: 0 } } };
  assert.ok(validaDati(rotto).some((e) => e.chiave === 'gif.peso_avviso_mb'));
});
