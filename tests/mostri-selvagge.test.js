// Blocco «Popoli delle terre selvagge» (cap. 8 del Manuale dei Mostri v0.23): dieci profili validi, Lancia a una e
// due mani, Nuoto e apnea, Kenku con Imitazione, repertori come capacità con PM, forma di Coccodrillo, Impalare,
// Furia ferita dei Quaggoth, Orog con Parata come Difese; Spazio e Taglia (A.167).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));
const cap = (id, nome) => leggi(id).capacita.find((c) => c.nome === nome);

const POPOLI = ['bullywug', 'centauro', 'kenku', 'satiro', 'lucertoloide', 'sciamano-lucertoloide', 're-o-regina-lucertoloide', 'quaggoth', 'quaggoth-thonot', 'orog'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of POPOLI) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0.(23|46).*Popoli delle terre selvagge/);
    assert.ok(Number.isInteger(n.salvezze.volonta) && Number.isInteger(n.pm), `${id} Volontà e PM`);
  }
});

test('Spazio: 2 × 2 Q solo per il Centauro, 1 Q per gli altri; nessuna Taglia dedotta (A.167)', () => {
  assert.equal(leggi('centauro').spazio, '2 × 2 Q');
  for (const id of POPOLI.filter((x) => x !== 'centauro')) assert.equal(leggi(id).spazio, '1 Q', id);
  for (const id of POPOLI) assert.equal(leggi(id).taglia, undefined, id);
  assert.match(cap('sciamano-lucertoloide', 'Forma di Coccodrillo').effetto, /spazio 2 × 2 Q/);
});

test('AR con scudo e Difese: Bullywug 2 (1 senza), Lucertoloide 3 (2 senza), Orog con Parata 12 e Schivata 8 in nota', () => {
  assert.match(leggi('bullywug').note, /AR 2 con Scudo piccolo, 1 senza/);
  assert.equal(leggi('lucertoloide').ar.totale, 3);
  assert.match(leggi('lucertoloide').note, /AR 3 con Scudo piccolo, 2 biologica senza/);
  assert.equal(leggi('orog').difese, 12);
  assert.match(leggi('orog').note, /Schivata \/ Elusione 8/);
  assert.equal(leggi('orog').ar.totale, 5);
  assert.deepEqual(leggi('bullywug').attacchi.map((a) => [a.nome, a.danno]), [['Lancia a una mano', '1d6+1'], ['Lancia a due mani', '1d6+3'], ['Morso', '1d4+1']]);
});

test('Nuoto nativo e apnea di 15 minuti come capacità; Salto del Bullywug', () => {
  for (const id of ['bullywug', 'lucertoloide', 'sciamano-lucertoloide', 're-o-regina-lucertoloide']) assert.ok(cap(id, 'Nuoto nativo'), id);
  for (const id of ['lucertoloide', 'sciamano-lucertoloide', 're-o-regina-lucertoloide']) assert.match(cap(id, 'Apnea').effetto, /15 minuti \(150 Round\)/, id);
  assert.equal(cap('bullywug', 'Apnea'), undefined);
  assert.match(cap('bullywug', 'Salto').effetto, /4 Q.*alto fino a 2 Q/);
});

test('Kenku: Imitazione con Raggirare 12 contro Percezione e Agguato una volta per scontro; Centauro con Carica', () => {
  assert.match(cap('kenku', 'Imitazione').effetto, /Raggirare 12 si oppone a Percezione/);
  assert.deepEqual(cap('kenku', 'Agguato').usi, { quanti: 1, per: 'scontro' });
  assert.deepEqual(cap('centauro', 'Carica').azioni, { principali: 1, movimento: 1 });
  assert.equal(leggi('centauro').attacchi.find((a) => a.nome === 'Picca').portata_q, 3);
  assert.equal(leggi('centauro').attacchi.find((a) => a.nome === 'Arco da guerra').gittata_q, 100);
  assert.match(cap('satiro', 'Resistenza mistica').effetto, /\+2 alla PS/);
});

test('Sciamano lucertoloide: tre incantesimi da 3 PM con Potere 12 e forma di Coccodrillo da 3 PM e 10 Round', () => {
  for (const n of ['Colpo Elementale di Fuoco 3', 'Catene di Forza 3', 'Controllo Elementale dell’Acqua 3']) {
    const c = cap('sciamano-lucertoloide', n);
    assert.equal(c.risorsa, '3 PM', n);
    assert.deepEqual(c.azioni, { principali: 1 }, n);
    assert.match(c.prova, /Potere 12/, n);
  }
  const f = cap('sciamano-lucertoloide', 'Forma di Coccodrillo');
  assert.equal(f.risorsa, '3 PM');
  assert.match(f.limiti, /durata 10 Round/);
  assert.match(f.effetto, /terra 4 \/ 8 \/ 12 Q/);
  assert.equal(leggi('sciamano-lucertoloide').pm, 16);
});

test('Re o Regina: Impalare (2 PM, +2 danno, 3 PV temporanei) e immune a Terrorizzato', () => {
  assert.deepEqual(leggi('re-o-regina-lucertoloide').immunita, ['terrorizzato']);
  const i = cap('re-o-regina-lucertoloide', 'Impalare');
  assert.equal(i.risorsa, '2 PM');
  assert.match(i.effetto, /1d8\+3 a 1d8\+5/);
  assert.match(i.effetto, /3 PV temporanei per 3 Round/);
  assert.equal(leggi('re-o-regina-lucertoloide').attacchi[0].portata_q, 2);
});

test('Quaggoth e Thonot: immuni ad Avvelenato, Furia ferita (9 e 10 PV), Thonot con cinque poteri e Caduta protetta', () => {
  for (const id of ['quaggoth', 'quaggoth-thonot']) { assert.deepEqual(leggi(id).immunita, ['avvelenato'], id); assert.match(leggi(id).attacchi[0].note, /Furia ferita/, id); }
  assert.match(leggi('quaggoth').attacchi[0].note, /PV ≤ 9.*VA 14.*1d6\+4/);
  assert.match(leggi('quaggoth-thonot').attacchi[0].note, /PV ≤ 10.*VA 15.*1d6\+4/);
  const costi = { 'Telecinesi 1': '1 PM', 'Cura Ferite 3': '3 PM', 'Irrobustire 3': '3 PM', 'Colpo Elementale di Fuoco 3': '3 PM', 'Illusione 3': '3 PM', 'Caduta protetta': '2 PM' };
  for (const [n, pm] of Object.entries(costi)) assert.equal(cap('quaggoth-thonot', n).risorsa, pm, n);
  assert.equal(leggi('quaggoth-thonot').pm, 18);
  assert.deepEqual(leggi('orog').gs_px, { gs: 'Veterano', px: 55, per_pg: 4 });
  assert.deepEqual(leggi('kenku').gs_px, { gs: 'Principiante', px: 11, per_pg: 4 });
});
