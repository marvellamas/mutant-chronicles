// Mappa di battaglia, lotto 4 (docs/battlemap/piano.md): nebbia (pennello lungo il tratto, rettangolo, tutto,
// differenze compatte e Ctrl+Z), zoom a due dita, vista giocatori con il contesto dello scontro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { nuovaMaschera, daBase64, inBase64, cella, conta, rettangolo } from '../src/mappa/celle.js';
import {
  valoreModo, tratto, differenza, inverti, quantiQ, conNebbia, pennellata, rettangoloNebbia, tuttaNebbia, nebbiaProvvisoria,
  chiudiPennellata, annullaNebbia, trattiCoperti,
} from '../src/mappa/nebbia.js';
import { pizzica, mappaDaSchermo } from '../src/mappa/camera.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { vistaGiocatori } from '../src/mappa/vista.js';

const { dati } = await datiReali();
const V = dati.mappa.vista;
const C = 12, R = 8;
const scena = (nebbia = 'coperta') => nuovaScena({ id: 'sala', nome: 'Sala', colonne: C, righe: R, nebbia, dati });
const coperti = (s) => conta(daBase64(s.nebbia.coperti), C, R);

test('tratto: il pennello segue il movimento senza buchi', () => {
  const m = tratto(nuovaMaschera(C, R), C, R, [0, 0], [11, 7], 1, true);
  // diagonale da (0,0) a (11,7): un Q per colonna almeno, nessun salto
  for (let x = 0; x < C; x++) assert.ok([...Array(R).keys()].some((y) => cella(m, C, R, x, y)), `colonna ${x}`);
  assert.ok(cella(m, C, R, 0, 0) && cella(m, C, R, 11, 7));
  const largo = tratto(nuovaMaschera(C, R), C, R, [2, 4], [6, 4], 3, true);
  assert.equal(conta(largo, C, R), 3 * 7, 'pennello 3: una fascia alta 3 da x = 1 a 7');
  assert.equal(valoreModo('copri'), true);
  assert.equal(valoreModo('rivela'), false);
});

test('differenza compatta e inversione', () => {
  const a = nuovaMaschera(C, R);
  const b = rettangolo(a, C, R, 2, 1, 4, 2, true);
  const d = differenza(a, b, C, R);
  assert.deepEqual(d, [[14, 3], [26, 3]], 'due tratti da 3 Q (righe 1 e 2, colonne 2–4)');
  assert.equal(quantiQ(d), 6);
  assert.deepEqual(inverti(b, d), a);
  assert.deepEqual(inverti(a, d), b);
  assert.deepEqual(differenza(a, a, C, R), []);
  // tutta la griglia cambiata: un tratto solo
  assert.deepEqual(differenza(a, nuovaMaschera(C, R, true), C, R), [[0, C * R]]);
});

test('pennellata, rettangolo, tutto: una voce di «annulla» ciascuno; nulla cambia, nulla si registra', () => {
  let s = scena();
  assert.equal(coperti(s), C * R);
  s = pennellata(s, [1, 1], [5, 1], 1, 'rivela', dati);
  assert.equal(coperti(s), C * R - 5);
  s = rettangoloNebbia(s, [8, 4], [10, 6], 'rivela', dati);
  assert.equal(coperti(s), C * R - 5 - 9);
  assert.deepEqual(s.annulla.map((v) => [v.tipo, quantiQ(v.tratti)]), [['nebbia', 5], ['nebbia', 9]]);
  assert.equal(rettangoloNebbia(s, [8, 4], [10, 6], 'rivela', dati), s, 'già rivelato: scena identica, nessuna voce');
  s = tuttaNebbia(s, 'copri', dati);
  assert.equal(coperti(s), C * R);
  assert.equal(quantiQ(s.annulla.at(-1).tratti), 14);
  // il limite della pila
  let t = scena('scoperta');
  for (let i = 0; i < dati.mappa.scena.annulla_max + 5; i++) t = pennellata(t, [0, 0], [0, 0], 1, i % 2 ? 'rivela' : 'copri', dati);
  assert.equal(t.annulla.length, dati.mappa.scena.annulla_max);
});

test('pennellata trascinata: passi provvisori, una voce sola alla fine; Ctrl+Z la toglie tutta', () => {
  const s0 = { ...scena(), token: [{ id: 'x', rif: { tipo: 'segnaposto' }, nome: 'Cassa', q: [0, 0], ingombro: 1, nascosto: false }] };
  const iniziale = s0.nebbia.coperti;
  let s = s0;
  for (const [da, a] of [[[0, 3], [3, 3]], [[3, 3], [6, 4]], [[6, 4], [9, 4]]]) s = nebbiaProvvisoria(s, tratto(daBase64(s.nebbia.coperti), C, R, da, a, 1, false));
  assert.equal(s.annulla.length, 0, 'durante il trascinamento nessuna voce');
  // nel frattempo un token cambia (lettura dello scontro): resta
  s = { ...s, token: [{ ...s.token[0], q: [1, 1] }] };
  s = chiudiPennellata(s, iniziale, dati);
  assert.equal(s.annulla.length, 1);
  assert.deepEqual(s.token[0].q, [1, 1], 'il resto della scena è quello attuale');
  const scoperti = C * R - coperti(s);
  assert.equal(quantiQ(s.annulla[0].tratti), scoperti);
  const { scena: indietro, voce } = annullaNebbia(s);
  assert.equal(indietro.nebbia.coperti, iniziale);
  assert.equal(indietro.annulla.length, 0);
  assert.equal(voce.tipo, 'nebbia');
  assert.equal(annullaNebbia(indietro), null, 'niente da annullare');
  // le voci di altri tipi restano al loro posto
  const misto = { ...s, annulla: [...s.annulla, { tipo: 'muri', tratti: [] }] };
  assert.deepEqual(annullaNebbia(misto).scena.annulla.map((v) => v.tipo), ['muri']);
});

test('tratti coperti per il disegno, solo nella parte visibile', () => {
  const m = rettangolo(nuovaMaschera(C, R), C, R, 2, 1, 5, 2, true);
  assert.deepEqual(trattiCoperti(m, C, R), [[1, 2, 6], [2, 2, 6]]);
  assert.deepEqual(trattiCoperti(m, C, R, { x0: 4, x1: 20, y0: 2, y1: 3 }), [[2, 4, 6]]);
  assert.deepEqual(trattiCoperti(nuovaMaschera(C, R, true), C, R, { x0: -5, x1: 3, y0: 7, y1: 99 }), [[7, 0, 3]]);
});

test('due dita: zoom e spostamento insieme, il punto sotto le dita resta sotto le dita', () => {
  const cam0 = { scala: 0.5, ox: 20, oy: 10 };
  const m0 = { x: 300, y: 200 }, m = { x: 340, y: 180 };
  const sotto = mappaDaSchermo(cam0, m0.x, m0.y);
  const cam = pizzica(cam0, m0, 100, m, 150, V);
  assert.equal(cam.scala, 0.75);
  const ora = mappaDaSchermo(cam, m.x, m.y);
  assert.ok(Math.abs(ora.x - sotto.x) < 1e-9 && Math.abs(ora.y - sotto.y) < 1e-9);
  // dita ferme: solo spostamento
  const solo = pizzica(cam0, m0, 100, { x: 310, y: 200 }, 100, V);
  assert.deepEqual(solo, { scala: 0.5, ox: 30, oy: 10 });
  assert.equal(pizzica(cam0, m0, 0, m0, 50, V).scala, 0.5, 'distanza iniziale nulla: nessuno zoom');
});

test('vista giocatori con il contesto: nascosti e coperti non arrivano, PV come quota, turno solo se visibile', () => {
  let s = scena('scoperta');
  s = { ...s, nebbia: { ...s.nebbia, coperti: inBase64(rettangolo(daBase64(s.nebbia.coperti), C, R, 8, 0, 11, 7, true)) } };
  s.token = [
    { id: 'a', rif: { tipo: 'partecipante', id: 'pg:Lucas' }, q: [1, 1], ingombro: 1, nascosto: false },
    { id: 'b', rif: { tipo: 'partecipante', id: 'nem:predone:1' }, q: [3, 3], ingombro: 1, nascosto: false },
    { id: 'c', rif: { tipo: 'partecipante', id: 'nem:predone:2' }, q: [9, 3], ingombro: 1, nascosto: false },
    { id: 'd', rif: { tipo: 'partecipante', id: 'nem:boss:1' }, q: [5, 5], ingombro: 2, nascosto: true },
    { id: 'e', rif: { tipo: 'segnaposto' }, nome: 'Porta', q: [0, 7], ingombro: 1, nascosto: false },
  ];
  const pezzo = (id, o) => ({ chiave: `partecipante:${id}`, tipo: id.startsWith('pg') ? 'pg' : 'nemico', nome: id, iniziali: 'XX', lato: 'avversario', ritratto: null, pv: null, aZero: false, diTurno: false, ...o });
  const contesto = {
    round: 3,
    pezzi: [pezzo('pg:Lucas', { lato: 'pg', nome: 'Lucas', pv: { attuali: 7, massimo: 15 }, ritratto: 'data:image/png;base64,AAAA' }),
      pezzo('nem:predone:1', { nome: 'Predone 1', pv: { attuali: 0, massimo: 12 }, aZero: true }),
      pezzo('nem:predone:2', { nome: 'Predone 2', pv: { attuali: 12, massimo: 12 } }),
      pezzo('nem:boss:1', { nome: 'Boss segreto', pv: { attuali: 90, massimo: 90 }, diTurno: true })],
    immagineDi: (p) => (p.tipo === 'pg' ? 'api/ritratti/Lucas?v=1' : null),
  };
  const v = vistaGiocatori(s, contesto);
  assert.deepEqual(v.token.map((t) => t.id), ['a', 'b', 'e']);
  assert.deepEqual(v.token[0].info, { lato: 'pg', nome: 'Lucas', iniziali: 'XX', immagine: 'api/ritratti/Lucas?v=1', pv: 0.45, aZero: false, diTurno: false, bordo: null });
  // 07/10: i PV dei nemici ai giocatori solo se il master li mostra (predefinito nascosto)
  assert.equal(v.token[1].info.pv, null);
  assert.equal(vistaGiocatori({ ...s, pvNemiciGiocatori: true }, contesto).token[1].info.pv, 0);
  assert.match(validaScena({ ...s, pvNemiciGiocatori: 'sì' }, dati), /pvNemiciGiocatori/);
  assert.equal(v.token[2].info.nome, 'Porta');
  const testo = JSON.stringify(v);
  for (const segreto of ['Boss segreto', 'Predone 2', 'data:image', '"attuali"', '90']) assert.ok(!testo.includes(segreto), segreto);
  // di turno è il boss nascosto: nessun nome nella barra
  assert.deepEqual(v.turno, { round: 3, nome: null });
  // di turno Lucas, visibile
  const v2 = vistaGiocatori(s, { ...contesto, pezzi: contesto.pezzi.map((p) => ({ ...p, diTurno: p.nome === 'Lucas' })) });
  assert.deepEqual(v2.turno, { round: 3, nome: 'Lucas' });
  assert.ok(v2.token[0].info.diTurno);
  // senza contesto: come nel lotto 1
  assert.ok(!('turno' in vistaGiocatori(s)) && !('info' in vistaGiocatori(s).token[0]));
});
