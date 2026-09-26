import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { percorsoImmagine, idCorporazione, stemmaCorporazione, VARIANTI_IMMAGINE } from '../src/immagini.js';
import { datiReali } from './helpers.js';

// Immagini generate da tools/genera_immagini.py ed elencate in img/immagini.json
const { dati } = await datiReali();
const radice = new URL('../', import.meta.url);
const manifesto = JSON.parse(await readFile(new URL('img/immagini.json', radice), 'utf8'));
const esiste = async (p) => stat(new URL(p, radice)).then((s) => s.isFile() && s.size > 0, () => false);

test('mappa Corporazione → file: ogni Corporazione con immagine ha le tre varianti, e i file esistono', async () => {
  const conImmagine = dati.corporazioni.corporazioni.filter((c) => c.id !== 'freelance');
  assert.equal(conImmagine.length, 6);
  for (const c of conImmagine) {
    for (const v of VARIANTI_IMMAGINE) {
      const p = stemmaCorporazione(manifesto, dati, c.nome, v);
      assert.ok(p, `${c.nome} ${v}`);
      assert.ok(await esiste(p.src), p.src);
      if (p.webp) assert.ok(await esiste(p.webp), p.webp);
      assert.match(p.src, new RegExp(`^img/corporazioni/${c.id}-${v}\\.png$`));
    }
  }
  // Alleanza: immagine presente anche se non è una scelta iniziale
  assert.ok(percorsoImmagine(manifesto, 'corporazioni', 'alleanza', '96'));
  // ogni file elencato nel manifesto esiste
  for (const gruppo of ['corporazioni', 'pagine']) {
    for (const voce of Object.values(manifesto[gruppo])) {
      for (const f of Object.values(voce)) for (const p of [f.png, f.webp].filter(Boolean)) assert.ok(await esiste(p), p);
    }
  }
});

test('pagine della scheda: un\'icona per ogni tab', () => {
  for (const tab of ['identita', 'abilita', 'combattimento', 'magia']) assert.ok(percorsoImmagine(manifesto, 'pagine', tab, '96'), tab);
});

test('percorso con ripiego: null per Freelance, id o varianti sconosciute, manifesto mancante', () => {
  assert.equal(idCorporazione(dati, 'Imperiali'), 'imperial');
  assert.equal(stemmaCorporazione(manifesto, dati, 'Freelance'), null); // nessuna immagine finché non arriva
  assert.equal(stemmaCorporazione(manifesto, dati, 'Inesistente'), null);
  assert.equal(percorsoImmagine(manifesto, 'corporazioni', 'bauhaus', '2048'), null);
  assert.equal(percorsoImmagine(null, 'corporazioni', 'bauhaus'), null);
  assert.equal(percorsoImmagine({}, 'pagine', 'magia'), null);
  const finto = { pagine: { magia: { 96: { png: 'img/pagine/magia-96.png' } } } };
  assert.deepEqual(percorsoImmagine(finto, 'pagine', 'magia'), { src: 'img/pagine/magia-96.png', webp: null });
  assert.equal(percorsoImmagine({ pagine: { magia: { 96: { webp: 'x.webp' } } } }, 'pagine', 'magia'), null); // senza PNG di riserva no
});
