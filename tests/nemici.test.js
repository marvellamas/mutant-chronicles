// Formato dei nemici del Tavolo del Master (data/formato_nemici.json, per-davide A.73) e validaNemico.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validaDati, validaNemico, trovaTodo } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';

const { dati } = await datiReali();
const esempio = JSON.parse(readFileSync(new URL('./nemici/legionario-non-morto.json', import.meta.url), 'utf8'));
const chiavi = (n) => validaNemico(n, dati).map((e) => e.chiave);

test('formato dei nemici: caricato con gli altri dati, valido, con i TODO(Davide) di A.73', () => {
  assert.equal(dati.formato_nemici.formato, 'mutant-nemico');
  assert.deepEqual(validaDati(dati), []);
  assert.ok(trovaTodo(dati).filter((t) => t.percorso.startsWith('formato_nemici.json')).every((t) => /A\.73/.test(t.testo)));
  assert.ok(trovaTodo(dati).some((t) => t.percorso.startsWith('formato_nemici.json')));
});

test('formato dei nemici rotto: il validatore dice file, chiave e problema', () => {
  const d = copia(dati);
  d.formato_nemici.campi.pv.tipo = 'numero';
  d.formato_nemici.campi.attacchi.voce.campi.natura.valori_da = 'colori';
  d.formato_nemici.campi.id.obbligatorio = false;
  const e = validaDati(d).filter((x) => x.file === 'formato_nemici.json').map((x) => x.chiave);
  assert.deepEqual(e.sort(), ['(nemico).campi.attacchi.voce.campi.natura.valori_da', '(nemico).campi.pv.tipo', 'campi.id'].sort());
});

test('nemico d’esempio valido', () => {
  assert.deepEqual(validaNemico(esempio, dati), []);
  // senza i campi facoltativi resta valido
  const minimo = copia(esempio);
  for (const c of ['fonte', 'caratteristiche', 'immunita', 'note']) delete minimo[c];
  minimo.attacchi = [];
  assert.deepEqual(validaNemico(minimo, dati), []);
});

test('campi mancanti: obbligatori e richiesti dal tipo di attacco', () => {
  const n = copia(esempio);
  delete n.pv;
  delete n.ar.magica;
  delete n.salvezze.magia;
  delete n.attacchi[0].portata_q;
  delete n.attacchi[1].modalita;
  assert.deepEqual(chiavi(n).sort(), ['ar.magica', 'attacchi[0].portata_q', 'attacchi[1].modalita', 'pv', 'salvezze.magia'].sort());
});

test('nemico non valido: tipi, valori ammessi, limiti e campi sconosciuti', () => {
  const n = copia(esempio);
  n.formato = 'mutant-personaggio';
  n.id = 'Legionario Non Morto';
  n.pv = 0;
  n.ar.magica = 5; // oltre il totale (§5.24: «AR totale, di cui magica»)
  n.difese = '9';
  n.caratteristiche.FRZ = 3;
  n.attacchi[0].danno = 'tanto';
  n.attacchi[0].natura = 'Fisico';
  n.attacchi[0].gittata_q = 10; // solo a distanza
  n.attacchi[1].modalita = ['XX'];
  n.immunita = ['paura'];
  n.livello = 3;
  const e = validaNemico(n, dati, 'nemici/legionario.json');
  assert.ok(e.every((x) => x.file === 'nemici/legionario.json'));
  assert.deepEqual(e.map((x) => x.chiave).sort(), [
    'formato', 'id', 'pv', 'ar.magica', 'difese', 'caratteristiche.FRZ', 'attacchi[0].danno', 'attacchi[0].natura',
    'attacchi[0].gittata_q', 'attacchi[1].modalita[0]', 'immunita[0]', 'livello',
  ].sort());
  assert.match(e.find((x) => x.chiave === 'attacchi[0].natura').problema, /Naturale, Magico, Etereo/);
  assert.match(e.find((x) => x.chiave === 'ar.magica').problema, /non oltre totale \(3\)/);
  assert.deepEqual(validaNemico('testo', dati).map((x) => x.problema), ['oggetto']);
});
