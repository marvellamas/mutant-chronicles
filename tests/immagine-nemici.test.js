// Immagine dei nemici sui token della mappa (A.131, decisione di Marcello del 06/10/2026): campo facoltativo
// «immagine» del formato dei nemici, copie nello scontro e nella bozza, token con l'immagine o con le iniziali.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali, copia } from './helpers.js';
import { validaNemico, validaDati } from '../src/validate.js';
import { nuovoScontro, aggiungiNemici, conImmagineNemico, validaScontro } from '../src/scontro.js';
import { nuovaBozza, aggiungiVoce, conImmagineNemicoBozza, validaBozza } from '../src/preparazione.js';
import { pezziDellaScena, urlImmagineNemico } from '../src/mappa/partecipanti.js';

const { dati } = await datiReali();
const predone = JSON.parse(readFileSync(new URL('../esempi/nemici/predone-delle-lande.json', import.meta.url), 'utf8'));
const IMG = { file: 'nemico-predone-0123456789ab.png', ridotta: 'nemico-predone-0123456789ab-ridotta.webp' };

test('formato: «immagine» facoltativa, solo file di mappe/', () => {
  assert.equal(dati.formato_nemici.campi.immagine.tipo, 'immagine');
  assert.equal(dati.formato_nemici.campi.immagine.obbligatorio, false);
  assert.deepEqual(validaNemico(predone, dati), [], 'senza immagine va bene');
  assert.deepEqual(validaNemico({ ...predone, immagine: IMG }, dati), []);
  assert.deepEqual(validaNemico({ ...predone, immagine: { file: IMG.file, ridotta: null } }, dati), []);
  const male = (immagine) => validaNemico({ ...predone, immagine }, dati).map((e) => e.chiave);
  assert.deepEqual(male({ file: '../personaggi/x.json' }), ['immagine']);
  assert.deepEqual(male('nemico.png'), ['immagine']);
  assert.deepEqual(male({ file: IMG.file, ridotta: 'x y.png' }), ['immagine.ridotta']);
  assert.deepEqual(male({ file: IMG.file, url: 'http://x' }), ['immagine.url']);
  // lato della copia per i token nei dati, validato
  const d = copia(dati);
  d.mappa.immagini.token.lato_massimo_px = 4096;
  assert.ok(validaDati(d).some((e) => e.file === 'mappa.json' && e.chiave === 'immagini.token.lato_massimo_px'));
});

test('scontro e bozza: l’immagine va su tutte le copie del tipo, null la toglie', () => {
  let s = nuovoScontro({ id: 'scontro-img', nome: 'Prova' });
  s = aggiungiNemici(s, predone, 2);
  s = aggiungiNemici(s, { ...predone, id: 'altro', nome: 'Altro' }, 1);
  const con = conImmagineNemico(s, 'predone-delle-lande', IMG);
  assert.deepEqual(con.partecipanti.map((p) => p.scheda.immagine ?? null), [IMG, IMG, null]);
  assert.equal(validaScontro(con), null);
  assert.equal(con.registro.length, s.registro.length, 'nessuna riga di registro');
  const senza = conImmagineNemico(con, 'predone-delle-lande', null);
  assert.ok(senza.partecipanti.every((p) => !('immagine' in p.scheda)));
  let b = nuovaBozza({ nome: 'B' });
  b = aggiungiVoce(b, { nemico: predone, quanti: 3 });
  const bi = conImmagineNemicoBozza(b, 'predone-delle-lande', IMG, new Date('2026-10-06T20:00:00Z'));
  assert.deepEqual(bi.nemici[0].nemico.immagine, IMG);
  assert.equal(validaBozza(bi), null);
  assert.ok(!('immagine' in conImmagineNemicoBozza(bi, 'predone-delle-lande', null).nemici[0].nemico));
});

test('token: immagine del nemico (copia ridotta) o iniziali', () => {
  assert.equal(urlImmagineNemico(IMG), `api/mappe/${IMG.ridotta}`);
  assert.equal(urlImmagineNemico({ file: IMG.file, ridotta: null }), `api/mappe/${IMG.file}`);
  assert.equal(urlImmagineNemico(null), null);
  let s = nuovoScontro({ id: 'scontro-img', nome: 'Prova' });
  s = conImmagineNemico(aggiungiNemici(s, predone, 2), 'predone-delle-lande', IMG);
  const pezzi = pezziDellaScena({ scontro: s }, dati);
  assert.deepEqual(pezzi.map((p) => p.ritratto), [`api/mappe/${IMG.ridotta}`, `api/mappe/${IMG.ridotta}`]);
  const senza = pezziDellaScena({ scontro: conImmagineNemico(s, 'predone-delle-lande', null) }, dati);
  assert.deepEqual(senza.map((p) => [p.ritratto, p.iniziali]), [[null, 'P1'], [null, 'P2']]);
});
