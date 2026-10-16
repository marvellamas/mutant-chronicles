// A.161 (risposta del 16/10/2026, in attesa del lotto PX): GS e PX del Manuale dei Mostri salvati nel
// profilo come valore informativo. La mini-scheda li mostra; l'app non calcola PX e non li unifica ai gradi
// del bestiario proposto. Qui si controlla il campo del formato, non il calcolatore della A.161 (prossimo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const base = {
  formato: 'mutant-nemico', versione: 1, id: 'x', nome: 'X',
  caratteristiche: { FOR: 5, DES: 5, COS: 5, INT: 3, SAG: 4, CAR: 3 },
  pv: 20, ar: { totale: 2, magica: 0 }, difese: 10, iniziativa: 1,
  movimento: { passo: 6 }, salvezze: { tempra: 10, riflessi: 10, volonta: 8, magia: 9 },
  azioni: { principali: 1, movimento: 1 },
  attacchi: [{ nome: 'Morso', tipo: 'ravvicinato', va: 11, danno: '1d6+2', natura: 'Naturale', portata_q: 1 }],
};

test('A.161: il formato ha il campo gs_px, informativo e facoltativo', () => {
  const campo = dati.formato_nemici.campi.gs_px;
  assert.ok(campo, 'il campo c’è');
  assert.equal(campo.obbligatorio, false);
  assert.match(campo.descrizione, /valore informativo/i);
  assert.match(campo.descrizione, /non calcola PX/i);
  assert.equal(campo.campi.gs.obbligatorio, true);
  assert.equal(campo.campi.px.obbligatorio, false);
});

test('A.161: un profilo con gs_px è valido; senza è valido lo stesso', () => {
  assert.deepEqual(validaNemico({ ...base, gs_px: { gs: 'Principiante', px: 10, per_pg: 4 } }, dati, 'x'), []);
  assert.deepEqual(validaNemico(base, dati, 'x'), [], 'facoltativo');
  // gs è obbligatorio dentro il blocco; px e per_pg no
  assert.deepEqual(validaNemico({ ...base, gs_px: { gs: 'Veterano' } }, dati, 'x'), []);
  const err = validaNemico({ ...base, gs_px: { px: 10 } }, dati, 'x');
  assert.ok(err.length, 'senza gs è un errore');
});
