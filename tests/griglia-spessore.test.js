// Spessore della griglia (13/10/2026, richiesta di Marcello): un cursore accanto all'opacità, con i gradini di
// data/mappa.json → griglia.spessori; si salva nella scena ed è uguale per il master e per lo schermo dei giocatori.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { caricaDati } from '../src/rules.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { applicaGriglia, spessoreGriglia, scostoNitido } from '../src/mappa/griglia.js';
import { vistaGiocatori } from '../src/mappa/vista.js';

const RADICE = new URL('../', import.meta.url);
const { dati } = await caricaDati((n) => readFile(new URL(`data/${n}.json`, RADICE), 'utf8'));
const scena = () => nuovaScena({ id: 'prova', nome: 'Prova', colonne: 12, righe: 8, nebbia: 'scoperta', dati });

test('i gradini stanno nei dati: da sottile a spesso, almeno tre', () => {
  const sp = dati.mappa.griglia.spessori;
  assert.ok(Array.isArray(sp) && sp.length >= 3 && sp.length <= 5, 'da 3 a 5 gradini');
  for (const s of sp) {
    assert.ok(typeof s.id === 'string' && s.id, 'id');
    assert.ok(typeof s.nome === 'string' && s.nome, 'nome');
    assert.ok(typeof s.px === 'number' && s.px > 0 && s.px <= 10, 'pixel');
  }
  assert.deepEqual([...sp].sort((a, b) => a.px - b.px).map((s) => s.px), sp.map((s) => s.px), 'in ordine, dal più sottile');
  assert.ok(dati.mappa.griglia.predefinita.spessore > 0);
});

test('si salva nella scena e si sceglie il gradino più vicino', () => {
  const s = scena();
  assert.equal(s.griglia.spessore, dati.mappa.griglia.predefinita.spessore, 'una scena nuova parte dal predefinito');
  const r = applicaGriglia(s, { spessore: 3 }, dati);
  assert.equal(r.errore, undefined);
  assert.equal(r.scena.griglia.spessore, 3);
  assert.equal(validaScena(r.scena, dati), null);
  assert.equal(applicaGriglia(s, { spessore: 2.4 }, dati).scena.griglia.spessore, 2, 'un valore scritto a mano va al gradino più vicino');
  // si cambia anche con la griglia bloccata, come colore e opacità
  const bloccata = { ...s, griglia: { ...s.griglia, bloccata: true } };
  assert.equal(applicaGriglia(bloccata, { spessore: 4 }, dati).scena.griglia.spessore, 4);
});

test('le scene salvate prima non hanno il campo e valgono il predefinito', () => {
  const s = scena();
  const vecchia = { ...s, griglia: { ...s.griglia } };
  delete vecchia.griglia.spessore;
  assert.equal(validaScena(vecchia, dati), null, 'si aprono com’erano');
  assert.equal(spessoreGriglia(vecchia.griglia, dati), dati.mappa.griglia.predefinita.spessore);
  assert.equal(spessoreGriglia({ spessore: 0 }, dati), dati.mappa.griglia.predefinita.spessore, 'uno zero non spegne la griglia');
  // un valore fuori dai gradini si riconduce
  assert.equal(spessoreGriglia({ spessore: 9 }, dati), Math.max(...dati.mappa.griglia.spessori.map((x) => x.px)));
});

test('lo schermo dei giocatori riceve lo stesso spessore', () => {
  const s = applicaGriglia(scena(), { spessore: 3 }, dati).scena;
  const v = vistaGiocatori(s, dati);
  assert.equal(v.griglia.spessore, 3);
  assert.equal(spessoreGriglia(v.griglia, dati), 3);
});

test('le linee dispari restano nitide (mezzo pixel), le pari no', () => {
  assert.equal(scostoNitido(1), 0.5);
  assert.equal(scostoNitido(3), 0.5);
  assert.equal(scostoNitido(2), 0);
  assert.equal(scostoNitido(4), 0);
});

test('master e giocatori disegnano con lo stesso spessore, e il pannello ha il cursore', async () => {
  for (const f of ['src/ui/mappa/pagina.js', 'src/ui/mappa/giocatori.js']) {
    const t = await readFile(new URL(f, RADICE), 'utf8');
    assert.match(t, /const sp = spessoreGriglia\(g, ctx\.dati\);/, f);
    assert.match(t, /c\.lineWidth = sp;/, f);
    assert.match(t, /\+ nit;/, f);
  }
  const p = await readFile(new URL('src/ui/mappa/pagina.js', RADICE), 'utf8');
  assert.match(p, /campo\('Spessore griglia', el\.spessore/, 'il cursore sta accanto all’opacità');
  assert.match(p, /cambiaGriglia\(\{ spessore:/);
});
