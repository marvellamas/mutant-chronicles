// Blocco «Mephit e creature elementali» (cap. 8 del Manuale dei Mostri v0.23): dieci profili validi, Soffi e poteri
// innati come capacità con costo in PM, danni misti con la seconda componente in nota, dissoluzione dei Mephit,
// Salamandra con presa, Galeb Duhr con i massi animati, Xorn con il passaggio nella roccia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));
const cap = (id, nome) => leggi(id).capacita.find((c) => c.nome === nome);

const MEPHIT = ['mephit-della-polvere', 'mephit-del-ghiaccio', 'mephit-del-magma', 'mephit-del-fango', 'mephit-del-fumo', 'mephit-del-vapore'];
const ELEMENTALI = [...MEPHIT, 'serpente-di-fuoco', 'salamandra', 'galeb-duhr', 'xorn'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of ELEMENTALI) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0\.23.*Mephit e creature elementali/);
    assert.ok(Number.isInteger(n.salvezze.volonta) && Number.isInteger(n.pm), `${id} Volontà e PM`);
  }
});

test('Spazio quadrato: 1 Q per tutti, tranne la Salamandra 2 × 2 Q di taglia Grande', () => {
  for (const id of ELEMENTALI.filter((x) => x !== 'salamandra')) { assert.equal(leggi(id).spazio, '1 Q', id); assert.equal(leggi(id).taglia, undefined, id); }
  assert.equal(leggi('salamandra').spazio, '2 × 2 Q');
  assert.equal(leggi('salamandra').taglia, 'grande');
});

test('Mephit: Soffio come capacità con PM e cadenza R + 3, poteri innati una volta al giorno, dissoluzione unica', () => {
  const soffi = {
    'mephit-della-polvere': ['Soffio accecante', '2 PM'], 'mephit-del-ghiaccio': ['Soffio gelido', '3 PM'], 'mephit-del-magma': ['Soffio di fuoco', '3 PM'],
    'mephit-del-fango': ['Soffio di fango', '2 PM'], 'mephit-del-fumo': ['Soffio di cenere', '2 PM'], 'mephit-del-vapore': ['Soffio di vapore', '2 PM'],
  };
  for (const [id, [nome, pm]] of Object.entries(soffi)) {
    const s = cap(id, nome);
    assert.equal(s.risorsa, pm, id);
    assert.deepEqual(s.azioni, { principali: 1 }, id);
    assert.match(s.limiti, /Round R \+ 3/, id);
    assert.ok(cap(id, 'Dissoluzione').passiva, id);
    assert.match(cap(id, 'Dissoluzione').effetto, /una sola volta/, id);
    assert.deepEqual(leggi(id).immunita.slice(0, 2), ['avvelenato', 'sanguinamento'], id);
    assert.ok(cap(id, 'Volo'), id);
  }
  const innati = { 'mephit-della-polvere': ['Sonno innato', '3 PM'], 'mephit-del-ghiaccio': ['Nebbia innata', '3 PM'], 'mephit-del-magma': ['Metallo caldo', '3 PM'], 'mephit-del-fumo': ['Luci danzanti innate', '2 PM'], 'mephit-del-vapore': ['Sfocatura innata', '3 PM'] };
  for (const [id, [nome, pm]] of Object.entries(innati)) {
    assert.equal(cap(id, nome).risorsa, pm, id);
    assert.deepEqual(cap(id, nome).usi, { quanti: 1, per: 'giorno' }, id);
  }
  assert.equal(cap('mephit-del-fango', 'Sonno innato'), undefined);
});

test('danni misti: prima componente in `danno`, seconda nella nota; Fuoco/Gelo immuni come Stato solo dove c’è Incendiato', () => {
  assert.equal(leggi('mephit-del-ghiaccio').attacchi[0].danno, '1d4+1');
  assert.match(leggi('mephit-del-ghiaccio').attacchi[0].note, /1d4 Gelo Naturale/);
  assert.match(leggi('mephit-del-magma').attacchi[0].note, /1d4 Fuoco Naturale/);
  assert.match(leggi('salamandra').attacchi[0].note, /1d4 Fuoco Naturale/);
  assert.match(leggi('salamandra').attacchi.find((a) => a.nome === 'Coda').note, /1d6 Fuoco Naturale/);
  for (const id of ['mephit-del-magma', 'mephit-del-fumo', 'mephit-del-vapore', 'serpente-di-fuoco', 'salamandra']) assert.ok(leggi(id).immunita.includes('incendiato'), id);
  for (const id of ['mephit-della-polvere', 'mephit-del-ghiaccio', 'mephit-del-fango', 'galeb-duhr', 'xorn']) assert.ok(!(leggi(id).immunita ?? []).includes('incendiato'), id);
});

test('Salamandra: Lancia 2 Q e Coda a 2 Q, presa con Stringere come capacità; Serpente di fuoco con Morso e Coda', () => {
  const s = leggi('salamandra');
  assert.deepEqual(s.attacchi.map((a) => [a.nome, a.portata_q]), [['Lancia due mani', 2], ['Coda', 2]]);
  assert.match(cap('salamandra', 'Afferrare e Stringere').effetto, /Riflessi −2/);
  assert.equal(s.azioni.principali, 2);
  assert.deepEqual(s.gs_px, { gs: 'Veterano', px: 55, per_pg: 4 });
  assert.deepEqual(leggi('serpente-di-fuoco').attacchi.map((a) => a.nome), ['Morso', 'Coda']);
  assert.match(cap('serpente-di-fuoco', 'Calore diretto').effetto, /1d4 Fuoco Naturale/);
});

test('Galeb Duhr: Impeto con formula propria e Animare massi (6 PM, una volta al giorno, due massi da 30 PX); Xorn passa nella roccia', () => {
  assert.equal(leggi('galeb-duhr').attacchi.find((a) => a.nome === 'Schianto in Impeto').danno, '3d6+3');
  const m = cap('galeb-duhr', 'Animare massi');
  assert.equal(m.risorsa, '6 PM');
  assert.deepEqual(m.usi, { quanti: 1, per: 'giorno' });
  assert.deepEqual(m.azioni, { principali: 2 });
  assert.match(m.effetto, /30 PX unitari/);
  assert.deepEqual(leggi('galeb-duhr').immunita, ['avvelenato']);
  assert.match(cap('xorn', 'Passaggio minerale').effetto, /4 Q di terra o pietra/);
  assert.match(cap('xorn', 'Senso dei tesori').effetto, /12 Q/);
  assert.deepEqual(leggi('xorn').attacchi.map((a) => a.nome), ['Artigli', 'Morso']);
});

test('movimento (volo dei Mephit, nuoto del Fango) e GS/PX informativo', () => {
  for (const id of MEPHIT.filter((x) => x !== 'mephit-del-fango')) assert.deepEqual(leggi(id).movimento, { passo: 6, corsa: 12, scatto: 18, volo: 6 }, id);
  assert.deepEqual(leggi('mephit-del-fango').movimento, { passo: 4, corsa: 8, scatto: 12, volo: 4 });
  assert.ok(cap('mephit-del-fango', 'Nuoto'));
  assert.deepEqual(leggi('mephit-del-fumo').gs_px, { gs: 'Principiante', px: 10, per_pg: 4 });
  assert.deepEqual(leggi('galeb-duhr').gs_px, { gs: 'Veterano', px: 50, per_pg: 4 });
});
