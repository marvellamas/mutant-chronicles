// Zone di controllo e Attacchi di Opportunità (07/10/2026; src/mappa/zoc.js; Giocatore §5.3, Armamenti §7.1.2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { portataDi, controllaZoc, avversariZoc, avversariZocInattivi, statoCheImpedisce, distanzaIngombri, celleZoc, passiInZoc, attacchiDiOpportunita, testoOpportunita } from '../src/mappa/zoc.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();

const pg = (id) => ({ chiave: `partecipante:pg:${id}`, tipo: 'pg', pg: id, lato: 'pg', nome: id, stati: [] });
const nem = (id, o = {}) => ({ chiave: `partecipante:nem:${id}`, tipo: 'nemico', nemico: 'x', lato: 'avversario', nome: id, stati: [], scheda: { attacchi: [{ tipo: 'ravvicinato', portata_q: 1 }] }, ...o });
const tok = (p, q, ingombro = 1, o = {}) => ({ id: `t-${p.nome}`, rif: { tipo: 'partecipante', id: p.chiave.slice('partecipante:'.length) }, q, ingombro, nascosto: false, ...o });
const scena = (tokens) => ({ griglia: { colonne: 20, righe: 20 }, token: tokens });

test('portata: dagli attacchi ravvicinati del profilo (Armamenti §7.1.2), altrimenti 1 Q', () => {
  assert.equal(portataDi(nem('a'), dati), 1);
  assert.equal(portataDi(nem('a', { scheda: { attacchi: [{ tipo: 'ravvicinato', portata_q: 1 }, { tipo: 'ravvicinato', portata_q: 2 }, { tipo: 'distanza' }] } }), dati), 2);
  assert.equal(portataDi(pg('Oshi'), dati), dati.mappa.zoc.portata_predefinita);
});

test('chi controlla una ZoC: avversari, non a 0 PV, non Svenuti, non veicoli; nascosti esclusi solo per i giocatori', () => {
  const oshi = pg('Oshi'), l1 = nem('Legionario 1'), l2 = nem('Legionario 2', { aZero: true }), l3 = nem('Legionario 3', { stati: [{ id: 'svenuto' }] }), alleato = nem('Mercenario', { lato: 'alleato' });
  const s = scena([tok(oshi, [5, 5]), tok(l1, [6, 5]), tok(l2, [4, 5]), tok(l3, [5, 6]), tok(alleato, [5, 4]), tok(nem('L4'), [9, 9], 1, { nascosto: true })]);
  const pezzi = [oshi, l1, l2, l3, alleato, nem('L4')];
  assert.deepEqual(avversariZoc(s, pezzi, 't-Oshi', dati).map((a) => a.pezzo.nome), ['Legionario 1', 'L4']);
  assert.deepEqual(avversariZoc(s, pezzi, 't-Oshi', dati, { perGiocatori: true }).map((a) => a.pezzo.nome), ['Legionario 1']);
  // vale anche al contrario: per il Legionario gli avversari sono i PG (e l'alleato dei PG)
  assert.deepEqual(avversariZoc(s, pezzi, 't-Legionario 1', dati).map((a) => a.pezzo.nome).sort(), ['Mercenario', 'Oshi']);
  assert.equal(controllaZoc({ tipo: 'veicolo', lato: 'pg' }, { rif: { tipo: 'veicolo' } }, dati), false);
});

test('A.132 (risposta di Marcello del 07/10): uno Stordito non fa AdO; ZoC inattiva per il master, non a 0 PV', () => {
  assert.deepEqual(dati.mappa.zoc.stati_che_impediscono.slice().sort(), ['stordito', 'svenuto']);
  assert.equal(Object.keys(dati.mappa.zoc).some((k) => k.startsWith('TODO(Davide) stordito')), false);
  const oshi = pg('Oshi'), st = nem('Stordito 1', { stati: [{ id: 'stordito', round: 1 }] }), sv = nem('Svenuto 1', { stati: ['svenuto'] }), morto = nem('Morto', { aZero: true, stati: [{ id: 'stordito' }] }), l1 = nem('Legionario 1');
  const s = scena([tok(oshi, [5, 5]), tok(st, [6, 5]), tok(sv, [4, 5]), tok(morto, [5, 6]), tok(l1, [5, 4])]);
  const pezzi = [oshi, st, sv, morto, l1];
  assert.equal(statoCheImpedisce(st, dati), 'stordito');
  assert.equal(statoCheImpedisce(l1, dati), null);
  assert.deepEqual(avversariZoc(s, pezzi, 't-Oshi', dati).map((a) => a.pezzo.nome), ['Legionario 1']);
  assert.deepEqual(avversariZocInattivi(s, pezzi, 't-Oshi', dati).map((a) => [a.pezzo.nome, a.stato]), [['Stordito 1', 'stordito'], ['Svenuto 1', 'svenuto']]);
  // uscendo dalle portate di tutti: l'avviso solo per il Legionario, non per lo Stordito
  const avv = avversariZoc(s, pezzi, 't-Oshi', dati);
  assert.deepEqual(attacchiDiOpportunita([[5, 5], [6, 4], [7, 3], [8, 2]], 1, avv).map((a) => a.pezzo.nome), ['Legionario 1']);
});

test('ZoC: fascia profonda quanto la portata attorno a tutto l’ingombro (anche 2 × 2)', () => {
  assert.equal(distanzaIngombri([0, 0], 1, [1, 1], 1), 1);
  assert.equal(distanzaIngombri([0, 0], 2, [3, 0], 1), 2);
  const grande = nem('Ogre', { scheda: { attacchi: [{ tipo: 'ravvicinato', portata_q: 1 }] } });
  const s = scena([tok(grande, [5, 5], 2)]);
  const z = celleZoc(s, [{ token: s.token[0], pezzo: grande, portata: 1 }]);
  const conta = z.reduce((n, v) => n + v, 0);
  assert.equal(conta, 4 * 4 - 4, 'anello di 1 Q attorno a 2 × 2');
  assert.equal(z[5 * 20 + 5], 0, 'l’ingombro non è ZoC');
  assert.equal(z[4 * 20 + 4], 1);
});

test('Attacco di Opportunità solo uscendo dalla portata: entrare, muoversi dentro e fermarsi non provocano', () => {
  const l1 = { token: { q: [10, 10], ingombro: 1 }, pezzo: nem('Legionario 1'), portata: 1 };
  // esce: da adiacente a lontano
  assert.equal(attacchiDiOpportunita([[11, 10], [12, 10], [13, 10]], 1, [l1]).length, 1);
  // entra e si ferma accanto: niente
  assert.equal(attacchiDiOpportunita([[13, 10], [12, 10], [11, 10]], 1, [l1]).length, 0);
  // si muove dentro la portata (gira attorno): niente
  assert.equal(attacchiDiOpportunita([[11, 10], [11, 11], [10, 11]], 1, [l1]).length, 0);
  // attraversa: entra ed esce → provoca, al passo d'uscita
  const att = attacchiDiOpportunita([[8, 11], [9, 11], [10, 11], [11, 11], [12, 11]], 1, [l1]);
  assert.deepEqual(att.map((a) => a.passo), [4]);
  // percorso evidenziato nella ZoC
  assert.deepEqual(passiInZoc([[8, 11], [9, 11], [10, 11], [11, 11], [12, 11]], 1, [l1]), [false, true, true, true, false]);
  // portata 2: uscire a 2 Q non basta, a 3 sì
  const lancia = { ...l1, portata: 2 };
  assert.equal(attacchiDiOpportunita([[11, 10], [12, 10]], 1, [lancia]).length, 0);
  assert.equal(attacchiDiOpportunita([[11, 10], [12, 10], [13, 10]], 1, [lancia]).length, 1);
  // due avversari: un avviso per ciascuno
  const l2 = { token: { q: [10, 12], ingombro: 1 }, pezzo: nem('Legionario 2'), portata: 1 };
  assert.equal(attacchiDiOpportunita([[11, 11], [14, 11]], 1, [l1, l2]).length, 2);
  assert.match(testoOpportunita('Oshi', 'Legionario 1'), /Oshi è uscito dalla ZoC di Legionario 1! Attacco di Opportunità di Legionario 1/);
});

test('registro: riga dell’Attacco di Opportunità, una sola volta per Round; vista giocatori senza gli avversari nascosti', async () => {
  const { rigaOpportunita, opportunitaNelRound, avanti } = await import('../src/scontro.js');
  const { vistaGiocatori } = await import('../src/mappa/vista.js');
  const { nuovaScena } = await import('../src/mappa/scena.js');
  const parte = (id, nome, base, lato) => ({ id, nome, tipo: id.startsWith('pg:') ? 'pg' : 'nemico', base, d10: { valore: 5 }, lato });
  let s = { id: 'sc', stato: 'aperto', round: 1, turno: 0, ordineAlleati: [], durate: [], registro: [], partecipanti: [parte('pg:OSHI', 'Oshi', 3, 'alleato'), parte('nem:leg:1', 'Legionario 1', 2, 'avversario'), parte('nem:leg:2', 'Legionario 2', 1, 'avversario')] };
  s = rigaOpportunita(s, { da: 'nem:leg:1', nomeDa: 'Legionario 1', contro: 'pg:OSHI', nomeContro: 'Oshi' }, new Date('2026-10-07T10:00:00Z'));
  assert.match(s.registro[0].testo, /Oshi è uscito dalla ZoC di Legionario 1: Attacco di Opportunità/);
  assert.deepEqual(s.registro[0].opportunita, { da: 'nem:leg:1', contro: 'pg:OSHI' });
  assert.equal(opportunitaNelRound(s, 'nem:leg:1'), true);
  assert.equal(opportunitaNelRound(s, 'nem:leg:2'), false);
  // al Round dopo si può di nuovo
  let t = s; for (let i = 0; i < 3; i++) t = avanti(t);
  assert.equal(t.round, 2);
  assert.equal(opportunitaNelRound(t, 'nem:leg:1'), false);
  // vista giocatori: la riga arriva solo se il token del Legionario si vede
  const base = nuovaScena({ id: 'p', nome: 'P', dati, nebbia: 'scoperta' });
  const conToken = (nascosto) => ({ ...base, token: [{ id: 'tl', rif: { tipo: 'partecipante', id: 'nem:leg:1' }, q: [1, 1], ingombro: 1, nascosto }] });
  const pezzi = [{ chiave: 'partecipante:nem:leg:1', tipo: 'nemico', lato: 'avversario', nome: 'Legionario 1', iniziali: 'L1', pv: null }];
  assert.equal(vistaGiocatori(conToken(false), { pezzi, round: 1, scontro: s }).opportunita.length, 1);
  assert.equal(vistaGiocatori(conToken(true), { pezzi, round: 1, scontro: s }).opportunita.length, 0);
});
