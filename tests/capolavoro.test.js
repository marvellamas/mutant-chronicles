// Lotto 7 della ricognizione del 02/10 sera: A.61, armatura Capolavoro del Corazzaio (E&L del 02/10/2026,
// decisione 4; classi.json → capolavoro_armatura; src/equipaggiamento.js → effettoCapolavoro).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { normalizza } from '../src/character.js';
import { regolaCapolavoro } from '../src/equipaggiamento.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const scheda = (equipaggiamento) => calcolaScheda({ creazione: normalizza({ ...MISHIMA_AGENTE, equipaggiamento }, dati).scelte, livelli: [] }, dati);
const contromisure = (s) => (s.equipaggiamento.effettiOggetti ?? []).filter((e) => e.tipo === 'contromisura');

// un'armatura con Ignifuga 2 (Contromisura contro il Fuoco 2) e una senza Contromisure
const conIgnifuga = dati.equipaggiamento.file.armature_corporative.oggetti.find((o) => (o.effetti ?? []).some((e) => e.tipo === 'contromisura' && e.effetto === 'Fuoco' && e.valore === 2));
const senza = dati.equipaggiamento.file.armature.oggetti.find((o) => o.ar && !(o.effetti ?? []).some((e) => e.tipo === 'contromisura'));

test('regola: sei Contromisure numeriche, +1, Riflettente esclusa; il TODO è chiuso', () => {
  const R = regolaCapolavoro(dati);
  assert.deepEqual(R.contromisure.map((x) => x.nome), ['Ignifugo', 'Termico', 'Isolante', 'Dissipante', 'Imbottita', 'Anticorrosivo']);
  assert.equal(R.valore, 1);
  assert.equal(R.talento, 'Corazzaio');
});

test('Contromisura scelta: assente vale 1, già presente X diventa X + 1; l’AR non cambia, la provenienza lo dice', () => {
  const a = scheda([voce('a', `armature:${senza.id}`, 'indossata', { capolavoro: { contromisura: 'Termico' } })]);
  const termico = contromisure(a).find((e) => e.effetto === 'Gelo');
  assert.deepEqual([termico.valore, termico.oggetto], [1, `${senza.nome} (Capolavoro)`]);
  const base = scheda([voce('a', `armature:${senza.id}`, 'indossata')]);
  assert.equal(a.equipaggiamento.arEffettiva?.totale ?? a.equipaggiamento.ar?.totale, base.equipaggiamento.arEffettiva?.totale ?? base.equipaggiamento.ar?.totale);
  const b = scheda([voce('b', `armature_corporative:${conIgnifuga.id}`, 'indossata', { capolavoro: { contromisura: 'Ignifugo' } })]);
  const fuoco = contromisure(b).filter((e) => e.effetto === 'Fuoco');
  assert.equal(Math.max(...fuoco.map((e) => e.valore)), 3);
  // la riga dell'AR: non conta, rimanda alle Resistenze
  const righe = JSON.stringify(b.equipaggiamento.arEffettiva ?? b.equipaggiamento);
  assert.match(righe, /Capolavoro, Ignifugo 3/);
  // la scelta si salva sulla voce; una scelta non ammessa non ha effetto
  assert.deepEqual(normalizza({ ...MISHIMA_AGENTE, equipaggiamento: [voce('c', `armature:${senza.id}`, 'indossata', { capolavoro: { contromisura: 'Riflettente' } })] }, dati).scelte.equipaggiamento[0].capolavoro, { contromisura: 'Riflettente' });
  assert.equal(contromisure(scheda([voce('c', `armature:${senza.id}`, 'indossata', { capolavoro: { contromisura: 'Riflettente' } })])).length, 0);
  // non indossata: nessun effetto
  assert.equal(contromisure(scheda([voce('a', `armature:${senza.id}`, 'zaino', { capolavoro: { contromisura: 'Termico' } })])).length, 0);
});
