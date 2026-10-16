// Galleria (N1, 13/10/2026): le immagini che il master mostra ai giocatori con un tocco. Qui il motore puro
// (src/galleria.js): indice della cartella, filtri del master, galleria dei giocatori, mostra e nascondi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import {
  indiceGalleria, nomeDaFile, nomeFileGalleria, vociPerMaster, galleriaGiocatori, immagineAiGiocatori,
  conMostrata, senzaMostrata, togliDaiGiocatori, conVoce, senzaImmagine, categorieGalleria, FILE_GALLERIA,
} from '../src/galleria.js';

const { dati } = await datiReali();

test('l’indice si rifà sui file che ci sono davvero: le immagini messe a mano compaiono', () => {
  const file = ['cripta-aabbccddeeff.jpg', 'cripta-aabbccddeeff-ridotta.webp', 'cripta-aabbccddeeff-mini.webp',
    'IL_Barone.png', 'appunti.txt', 'galleria.json'];
  const i = indiceGalleria(file, { versione: 1, immagini: [{ file: 'cripta-aabbccddeeff.jpg', nome: 'La cripta', categoria: 'Luoghi', ridotta: 'cripta-aabbccddeeff-ridotta.webp', mini: 'cripta-aabbccddeeff-mini.webp', aggiunta: 100 }] }, 500);
  assert.deepEqual(i.immagini.map((v) => v.file), ['IL_Barone.png', 'cripta-aabbccddeeff.jpg'], 'dalla più recente; niente copie né file estranei');
  const barone = i.immagini[0];
  assert.equal(barone.nome, 'IL Barone', 'il nome di partenza è quello del file');
  assert.equal(barone.categoria, null);
  assert.equal(barone.mini, null, 'la miniatura non c’è ancora: la prepara il browser del master');
  assert.equal(i.immagini[1].ridotta, 'cripta-aabbccddeeff-ridotta.webp');
  assert.equal(i.mostrata, null);
  // un file sparito dalla cartella non resta nell'indice, e nemmeno come «mostrata»
  const dopo = indiceGalleria(['IL_Barone.png'], { ...i, mostrata: 'cripta-aabbccddeeff.jpg' });
  assert.deepEqual(dopo.immagini.map((v) => v.file), ['IL_Barone.png']);
  assert.equal(dopo.mostrata, null);
});

test('nomi dei file: impronta del contenuto, copie accanto all’originale', () => {
  assert.equal(nomeFileGalleria('La Cripta è buia', 'aabbccddeeff', 'jpg'), 'la-cripta-e-buia-aabbccddeeff.jpg');
  assert.equal(nomeFileGalleria('La Cripta', 'aabbccddeeff', 'webp', 'mini'), 'la-cripta-aabbccddeeff-mini.webp');
  assert.ok(FILE_GALLERIA.test('la-cripta-aabbccddeeff.jpg'));
  assert.ok(!FILE_GALLERIA.test('../fuori.jpg'), 'niente percorsi');
  assert.ok(!FILE_GALLERIA.test('nota.txt'), 'solo immagini');
  assert.equal(nomeDaFile('la-cripta-aabbccddeeff.jpg'), 'La cripta', 'l’impronta non entra nel nome');
});

test('filtri del master: categoria e ricerca per nome, accenti compresi', () => {
  const i = indiceGalleria(['a.jpg', 'b.png', 'c.webp'], { immagini: [
    { file: 'a.jpg', nome: 'Città vecchia', categoria: 'Luoghi', aggiunta: 3 },
    { file: 'b.png', nome: 'Il Barone', categoria: 'PNG', aggiunta: 2 },
    { file: 'c.webp', nome: 'Spada runica', categoria: 'Oggetti', aggiunta: 1 },
  ] });
  assert.deepEqual(vociPerMaster(i, { categoria: 'PNG' }).map((v) => v.nome), ['Il Barone']);
  assert.deepEqual(vociPerMaster(i, { cerca: 'citta' }).map((v) => v.nome), ['Città vecchia'], 'la ricerca ignora gli accenti');
  assert.deepEqual(vociPerMaster(i, { cerca: 'RUN' }).map((v) => v.nome), ['Spada runica']);
  assert.equal(vociPerMaster(i).length, 3);
  assert.deepEqual(categorieGalleria(i, dati).slice(0, 4), ['Luoghi', 'PNG', 'Oggetti', 'Altro'], 'le categorie di data/galleria.json');
});

test('mostra, sostituisci e nascondi a tutti', () => {
  let i = indiceGalleria(['a.jpg', 'b.png'], { immagini: [{ file: 'a.jpg', nome: 'Cripta' }, { file: 'b.png', nome: 'Barone' }] });
  i = conMostrata(i, 'a.jpg', 1000);
  assert.equal(i.mostrata, 'a.jpg');
  assert.deepEqual(immagineAiGiocatori(i), { file: 'a.jpg', nome: 'Cripta', ridotta: null, mini: null, quando: 1000 });
  // mostrarne un'altra sostituisce la precedente
  i = conMostrata(i, 'b.png', 2000);
  assert.equal(i.mostrata, 'b.png');
  assert.equal(immagineAiGiocatori(i).nome, 'Barone');
  // «Nascondi a tutti»: non si vede più, ma resta nella galleria dei giocatori
  i = senzaMostrata(i);
  assert.equal(i.mostrata, null);
  assert.equal(immagineAiGiocatori(i), null);
  assert.deepEqual(galleriaGiocatori(i).map((v) => v.nome), ['Barone', 'Cripta'], 'la più recente in cima');
  // un file che non c'è non diventa «mostrata»
  assert.equal(conMostrata(i, 'z.jpg').mostrata, null);
});

test('galleria dei giocatori: solo le immagini mostrate, e «Togli dalla galleria dei giocatori»', () => {
  let i = indiceGalleria(['a.jpg', 'b.png', 'c.webp'], { immagini: [{ file: 'a.jpg', nome: 'Cripta' }, { file: 'b.png', nome: 'Barone' }, { file: 'c.webp', nome: 'Segreto' }] });
  i = conMostrata(i, 'a.jpg', 1000);
  i = conMostrata(i, 'b.png', 2000);
  assert.deepEqual(galleriaGiocatori(i).map((v) => v.nome), ['Barone', 'Cripta'], '«Segreto» non è mai stata mostrata: non c’è');
  // togliere l'immagine mostrata la nasconde anche dagli schermi, ma non la cancella dalla galleria del master
  i = togliDaiGiocatori(i, 'b.png');
  assert.equal(i.mostrata, null);
  assert.deepEqual(galleriaGiocatori(i).map((v) => v.nome), ['Cripta']);
  assert.equal(i.immagini.length, 3, 'nella galleria del master restano tutte');
  // rimostrarla la rimette nella galleria dei giocatori
  i = conMostrata(i, 'b.png', 3000);
  assert.deepEqual(galleriaGiocatori(i).map((v) => v.nome), ['Barone', 'Cripta']);
});

test('nome e categoria si cambiano; «Elimina» porta via anche le copie', () => {
  let i = indiceGalleria(['a.jpg', 'a-ridotta.webp', 'a-mini.webp'], { immagini: [{ file: 'a.jpg', nome: 'Senza nome', ridotta: 'a-ridotta.webp', mini: 'a-mini.webp' }] });
  i = conVoce(i, 'a.jpg', { nome: 'La cripta', categoria: 'Luoghi' });
  assert.deepEqual([i.immagini[0].nome, i.immagini[0].categoria], ['La cripta', 'Luoghi']);
  i = conMostrata(i, 'a.jpg', 10);
  const { indice, daCancellare } = senzaImmagine(i, 'a.jpg');
  assert.deepEqual(daCancellare, ['a.jpg', 'a-ridotta.webp', 'a-mini.webp']);
  assert.deepEqual(indice.immagini, []);
  assert.equal(indice.mostrata, null);
});

test('la cartella galleria/ sta fuori da git, nei salvataggi e fra i file locali', () => {
  const r = new URL('../', import.meta.url);
  assert.match(readFileSync(new URL('.gitignore', r), 'utf8'), /^galleria\/\*$/m);
  assert.match(readFileSync(new URL('.gitignore', r), 'utf8'), /^!galleria\/LEGGIMI\.txt$/m);
  const salva = readFileSync(new URL('tools/salva-sessione.mjs', r), 'utf8');
  assert.match(salva, /export const CARTELLE = \[[^\]]*'galleria'[^\]]*\]/, 'nelle copie di «Salva sessione»');
  assert.match(salva, /c !== 'mappe' && c !== 'galleria'/, 'fuori dallo zip «dati» (sono immagini)');
  const locali = JSON.parse(readFileSync(new URL('tools/file-locali.json', r), 'utf8'));
  assert.ok(locali.cartelle.includes('galleria'), 'l’aggiornamento non la cancella');
  assert.match(readFileSync(new URL('CLAUDE.md', r), 'utf8'), /Cartelle reali intoccabili:[^\n]*`galleria\/`/);
});
