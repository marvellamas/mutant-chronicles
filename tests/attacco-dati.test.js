// Dati dell'attacco a distanza (regole.json → attacco_distanza; Giocatore §5.2, §5.8, §5.10, §5.11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';

const { dati, errori } = await datiReali();
const a = dati.regole.attacco_distanza;

test('attacco a distanza: i dati reali passano il validatore', () => {
  assert.deepEqual(errori, []);
});

test('§5.11: fasce di distanza e Azioni come nel manuale', () => {
  assert.deepEqual(a.distanza.fasce.map((f) => [f.fino_a, f.va]), [[10, 0], [20, -2], [40, -4], [80, -6], [160, -8], [300, -10], [500, -12], [750, -14], [1000, -16], [1500, -18]]);
  assert.deepEqual(a.distanza.oltre, { ogni_q: 500, va: -2 });
  assert.deepEqual(a.distanza.azioni.map((f) => [f.fino_a, f.azioni]), [[80, 1], [500, 2], [1000, 3], [1500, 4]]);
});

test('Talenti con effetti sull’attacco a distanza: Liberi e di Classe', () => {
  const liberi = dati.talenti_liberi.talenti.filter((t) => t.effetti?.attacco_distanza).map((t) => t.id);
  assert.equal(liberi.length, 16);
  const classe = dati.classi.classi.flatMap((c) => [...c.talenti_fissi, ...c.talenti_a_scelta].filter((t) => t.effetti?.attacco_distanza).map((t) => `${c.nome}: ${t.nome}`));
  assert.equal(classe.length, 10);
});

test('validatore: effetto sconosciuto e sigla inesistente sono errori leggibili', () => {
  const x = copia(dati);
  x.talenti_liberi.talenti.find((t) => t.id === 'mira-rapida').effetti.attacco_distanza.volare = 1;
  x.regole.attacco_distanza.modalita.manovre_ammesse.ZZ = [];
  const e = validaDati(x).map((y) => `${y.chiave}: ${y.problema}`).join('\n');
  assert.match(e, /mira-rapida\.effetti\.attacco_distanza\.volare: effetto sconosciuto/);
  assert.match(e, /manovre_ammesse\.ZZ: "ZZ" non è in modalita_di_fuoco/);
});
