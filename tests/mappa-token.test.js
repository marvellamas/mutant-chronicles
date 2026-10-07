// Mappa di battaglia, lotto 3 (docs/battlemap/piano.md): token dello scontro. Aggancio alla griglia, ingombro da
// Taglia e veicoli, «Metti tutti», sovrapposizioni, pezzi dallo scontro, dalla bozza e dal registro dei veicoli.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali, copia } from './helpers.js';
import {
  ingombroDaTaglia, ingombroVeicolo, dimensioni, celleToken, tokenDentro, agganciaQ, centroToken, tokenSottoPunto,
  sovrapposti, liberoPer, disponiInFila, iniziali, chiaveRif,
} from '../src/mappa/token.js';
import { pezziDellaScena, partecipantiDaBozza, tokenOrfani, pezziSenzaToken, tokenPerPezzo } from '../src/mappa/partecipanti.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { vistaGiocatori } from '../src/mappa/vista.js';
import { nuovoScontro, aggiungiNemici, registraTiro, togliPartecipante } from '../src/scontro.js';
import { nuovaBozza, aggiungiVoce, iniziaBozza } from '../src/preparazione.js';
import { profiloVeicolo } from '../src/veicoli.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();
const G = { q_px: 50, scosto_x: 10, scosto_y: 20, colonne: 12, righe: 8 };

test('ingombro: Taglia, veicoli dal profilo, rettangoli', () => {
  assert.equal(ingombroDaTaglia('normale', dati), 1);
  assert.equal(ingombroDaTaglia('grande', dati), 2);
  assert.deepEqual(ingombroVeicolo(profiloVeicolo('autovettura-civile', dati), dati), [3, 2]);
  assert.deepEqual(ingombroVeicolo(profiloVeicolo('asa-scout-mk4', dati), dati), [4, 2]);
  assert.deepEqual(ingombroVeicolo({ dimensioni: { lunghezza_m: 7, larghezza_m: 2 } }, dati), [5, 2], 'dai metri: 1 Q = 1,5 m per eccesso');
  assert.deepEqual(ingombroVeicolo({ dimensioni: { ingombro_q: '40 x 3' } }, dati), [dati.mappa.token.veicolo_ingombro_max, 3]);
  assert.deepEqual(ingombroVeicolo(null, dati), dati.mappa.token.veicolo_predefinito);
  assert.deepEqual(dimensioni(2), [2, 2]);
  assert.deepEqual(dimensioni([4, 2]), [4, 2]);
  assert.deepEqual(celleToken({ q: [1, 1], ingombro: [3, 2] }), [[1, 1], [2, 1], [3, 1], [1, 2], [2, 2], [3, 2]]);
  assert.ok(tokenDentro({ q: [9, 6], ingombro: [3, 2] }, 12, 8));
  assert.ok(!tokenDentro({ q: [10, 6], ingombro: [3, 2] }, 12, 8));
});

test('aggancio: sempre al centro di un quadretto, dentro la griglia', () => {
  // punto nel Q (2, 3): x = 10 + 2,4 × 50, y = 20 + 3,7 × 50
  assert.deepEqual(agganciaQ(G, 10 + 2.4 * 50, 20 + 3.7 * 50, 1), [2, 3]);
  // 2 × 2: centro sull'incrocio più vicino (3, 4) → Q in alto a sinistra (2, 3)
  assert.deepEqual(agganciaQ(G, 10 + 3.2 * 50, 20 + 3.9 * 50, 2), [2, 3]);
  // 3 × 3 centrato sul Q sotto il punto
  assert.deepEqual(agganciaQ(G, 10 + 5.5 * 50, 20 + 4.5 * 50, 3), [4, 3]);
  // veicolo 4 × 2: centro sull'incrocio orizzontale e verticale
  assert.deepEqual(agganciaQ(G, 10 + 6 * 50, 20 + 4 * 50, [4, 2]), [4, 3]);
  // bordi: resta dentro
  assert.deepEqual(agganciaQ(G, -500, -500, 2), [0, 0]);
  assert.deepEqual(agganciaQ(G, 5000, 5000, [4, 2]), [8, 6]);
  // il centro di un token agganciato è al centro del suo ingombro e lo si ritrova sotto il punto
  const t = { q: [2, 3], ingombro: 2 };
  assert.deepEqual(centroToken(G, t), { x: 10 + 3 * 50, y: 20 + 4 * 50 });
  assert.ok(tokenSottoPunto(G, t, 10 + 3.9 * 50, 20 + 4.9 * 50));
  assert.ok(!tokenSottoPunto(G, t, 10 + 4 * 50, 20 + 4 * 50));
  assert.deepEqual(agganciaQ(G, centroToken(G, t).x, centroToken(G, t).y, 2), t.q, 'riagganciare non sposta');
});

test('sovrapposizioni e posti liberi (anche con muri e veicoli)', () => {
  const token = [{ id: 'a', q: [0, 0], ingombro: 2 }, { id: 'v', q: [3, 0], ingombro: [3, 2] }, { id: 'b', q: [1, 1], ingombro: 1 }, { id: 'c', q: [5, 1], ingombro: 1 }];
  assert.deepEqual(sovrapposti(token), [['a', 'b'], ['v', 'c']]);
  const muro = (x, y) => x === 7 && y === 0;
  assert.ok(liberoPer([6, 0], 1, { token, muro, colonne: 12, righe: 8 }));
  assert.ok(!liberoPer([7, 0], 1, { token, muro, colonne: 12, righe: 8 }), 'muro');
  assert.ok(!liberoPer([4, 1], 1, { token, muro, colonne: 12, righe: 8 }), 'veicolo');
  assert.ok(liberoPer([1, 1], 1, { token, tranne: 'b', muro, colonne: 12, righe: 8 }) === false, 'a occupa comunque (1, 1)');
  assert.ok(!liberoPer([11, 7], 2, { token, colonne: 12, righe: 8 }), 'fuori dalla griglia');
});

test('«Metti tutti»: una fila libera vicino al centro, poi posti sparsi', () => {
  const pezzi = [{ id: 'p1', ingombro: 1 }, { id: 'p2', ingombro: 1 }, { id: 'g', ingombro: 2 }, { id: 'v', ingombro: [3, 2] }];
  // griglia vuota 12 × 8, centro (6, 4): fila larga 7, alta 2 → da x = 3 (6 − 3,5 arrotondato) e y = 3
  const vuota = disponiInFila(pezzi, [6, 4], { colonne: 12, righe: 8 });
  assert.deepEqual(vuota.posti, [{ id: 'p1', q: [3, 3] }, { id: 'p2', q: [4, 3] }, { id: 'g', q: [5, 3] }, { id: 'v', q: [7, 3] }]);
  assert.deepEqual(vuota.nonPiazzati, []);
  const messi = vuota.posti.map((p) => ({ ...p, ingombro: pezzi.find((x) => x.id === p.id).ingombro }));
  assert.deepEqual(sovrapposti(messi), [], 'la fila non sovrappone');
  // un token e un muro in mezzo: la fila va sulla riga libera più vicina
  const ostacoli = { token: [{ id: 'x', q: [6, 3], ingombro: 1 }], muro: (x, y) => y === 5 && x === 4, colonne: 12, righe: 8 };
  const spostata = disponiInFila(pezzi, [6, 4], ostacoli);
  assert.equal(spostata.nonPiazzati.length, 0);
  const tutti = [...ostacoli.token, ...spostata.posti.map((p) => ({ ...p, ingombro: pezzi.find((x) => x.id === p.id).ingombro }))];
  assert.deepEqual(sovrapposti(tutti), []);
  assert.ok(spostata.posti.every((p) => !(p.q[1] <= 5 && p.q[1] + 1 >= 5 && p.q[0] <= 4 && p.q[0] + 2 >= 4) || p.id !== 'g'));
  assert.equal(new Set(spostata.posti.map((p) => p.q[1])).size, 1, 'sempre una fila');
  // griglia stretta (5 colonne): la fila non entra, i pezzi vanno nei posti liberi più vicini
  const stretta = disponiInFila(pezzi, [2, 2], { colonne: 5, righe: 5 });
  assert.equal(stretta.nonPiazzati.length, 0);
  assert.deepEqual(sovrapposti(stretta.posti.map((p) => ({ ...p, ingombro: pezzi.find((x) => x.id === p.id).ingombro }))), []);
  // senza posto
  const piena = disponiInFila([{ id: 'g', ingombro: 3 }], [1, 1], { colonne: 2, righe: 2 });
  assert.deepEqual(piena, { posti: [], nonPiazzati: ['g'] });
  assert.deepEqual(disponiInFila([], [0, 0], { colonne: 3, righe: 3 }), { posti: [], nonPiazzati: [] });
});

test('iniziali e chiavi', () => {
  assert.equal(iniziali('Lucas Varga'), 'LV');
  assert.equal(iniziali('Predone delle Lande', 2), 'P2');
  assert.equal(iniziali('Nadia'), 'NA');
  assert.equal(iniziali(''), '?');
  assert.equal(chiaveRif({ tipo: 'partecipante', id: 'pg:lucas' }), 'partecipante:pg:lucas');
});

/** Nemico minimo del formato (A.73), Grande se richiesto. */
const nemico = (id, nome, { taglia = null, pv = 20 } = {}) => ({ id, nome, pv, iniziativa: 2, caratteristiche: { DES: 5, INT: 5 }, stati: [], ...(taglia ? { taglia } : {}) });

function scontroDiProva() {
  let s = nuovoScontro({ id: 'scontro-prova', nome: 'Prova', pg: [{ chiave: 'Lucas', nome: 'Lucas', iniziativa: 3, des: 6, int: 5 }, { chiave: 'Nadia-Ferro', nome: 'Nadia Ferro', iniziativa: 4, des: 7, int: 6 }] });
  s = aggiungiNemici(s, nemico('predone', 'Predone'), 2);
  s = aggiungiNemici(s, nemico('nepharita', 'Nepharita', { taglia: 'grande', pv: 60 }), 1);
  for (const [i, p] of s.partecipanti.entries()) s = registraTiro(s, p.id, 'd10', { valore: 10 - i, origine: 'manuale' }, dati);
  return s;
}

const vista = (nome, { pv = 12, massimo = 20, stati = [], ritratto = null } = {}) => ({ completa: true, nome, ritratto, pv: { attuali: pv, massimo }, stati, ferite: { nome: null } });
const scout = { id: 'vei-scout', revisione: 1, proprietario: { tipo: 'gruppo' }, conducente: { chiave: 'Nadia-Ferro', nome: 'Nadia Ferro' }, mitragliere: null, mezzo: { profilo: 'asa-scout-mk4', nome: 'ASA Scout' } };
const altrui = { id: 'vei-altro', revisione: 1, proprietario: { tipo: 'pg', chiave: 'Torvald' }, conducente: null, mitragliere: null, mezzo: { profilo: 'autovettura-civile', nome: 'Auto di Torvald' } };

test('pezzi dallo scontro: lato, Taglia, PV e Stati letti, turno, veicoli del gruppo', () => {
  const s = scontroDiProva();
  const viste = new Map([['lucas', vista('Lucas', { ritratto: 'data:image/png;base64,AAAA', stati: [{ id: 'a-terra', nome: 'A Terra' }] })], ['Nadia-Ferro', vista('Nadia Ferro', { pv: 0 })]]);
  const pezzi = pezziDellaScena({ scontro: s, viste, veicoli: [scout, altrui] }, dati);
  assert.deepEqual(pezzi.map((p) => [p.chiave, p.lato, p.ingombro]), [
    ['partecipante:pg:Lucas', 'pg', 1], ['partecipante:pg:Nadia-Ferro', 'pg', 1],
    ['partecipante:nem:predone:1', 'avversario', 1], ['partecipante:nem:predone:2', 'avversario', 1],
    ['partecipante:nem:nepharita:1', 'avversario', 2], ['veicolo:vei-scout', 'pg', [4, 2]],
  ]);
  const [lucas, nadia, predone1] = pezzi;
  assert.equal(lucas.ritratto, 'data:image/png;base64,AAAA', 'chiave del file confrontata come la plancia');
  assert.deepEqual(lucas.stati, [{ id: 'a-terra', nome: 'A Terra' }]);
  assert.ok(nadia.aZero, 'PG a 0 PV in grigio');
  assert.deepEqual(predone1.pv, { attuali: 20, massimo: 20 });
  assert.equal(predone1.iniziali, 'P1');
  // di turno: Nadia (13 come Lucas, vince per DES, §5.1) e con lei lo Scout che guida (A.105)
  assert.deepEqual(pezzi.filter((p) => p.diTurno).map((p) => p.chiave), ['partecipante:pg:Nadia-Ferro', 'veicolo:vei-scout']);
  const turnoLucas = { ...s, turno: 1 };
  assert.deepEqual(pezziDellaScena({ scontro: turnoLucas, viste, veicoli: [scout] }, dati).filter((p) => p.diTurno).map((p) => p.chiave), ['partecipante:pg:Lucas']);
  // PV e Stati dei nemici dallo scontro, nomi degli Stati dai dati
  const ferito = { ...s, partecipanti: s.partecipanti.map((p) => (p.id === 'nem:predone:2' ? { ...p, pv: { attuali: 0, massimo: 20 }, stati: ['a-terra'] } : p)) };
  const p2 = pezziDellaScena({ scontro: ferito, viste, veicoli: [] }, dati).find((p) => p.chiave === 'partecipante:nem:predone:2');
  assert.ok(p2.aZero);
  assert.equal(p2.stati[0].id, 'a-terra');
  assert.equal(p2.stati[0].nome, 'A Terra', 'nome dello Stato da regole.json');
});

test('pezzi da una bozza: gli stessi id che «Inizia» creerà', () => {
  let b = nuovaBozza({ nome: 'Imboscata', adesso: new Date('2026-10-06T20:00:00Z') });
  b = aggiungiVoce(b, { nemico: nemico('predone', 'Predone'), quanti: 2 });
  b = aggiungiVoce(b, { nemico: nemico('nepharita', 'Nepharita', { taglia: 'grande' }), quanti: 1 });
  b = aggiungiVoce(b, { nemico: nemico('predone', 'Predone'), quanti: 1, lato: 'alleato' });
  const virtuali = partecipantiDaBozza(b, ['Lucas']);
  assert.deepEqual(virtuali.map((p) => p.id), ['pg:Lucas', 'nem:predone:1', 'nem:predone:2', 'nem:nepharita:1', 'nem:predone:3']);
  const iniziato = iniziaBozza(b, { id: 'scontro-x', pg: [{ chiave: 'Lucas', nome: 'Lucas', iniziativa: 3 }], dati, tiro: () => ({ valore: 5, origine: 'app' }) });
  assert.deepEqual(iniziato.partecipanti.map((p) => p.id), virtuali.map((p) => p.id), 'gli id coincidono: i token preparati restano validi');
  const pezzi = pezziDellaScena({ bozza: b, alTavolo: ['Lucas'], viste: new Map(), veicoli: [] }, dati);
  assert.equal(pezzi.find((p) => p.chiave === 'partecipante:nem:predone:3').lato, 'alleato');
  assert.ok(pezzi.every((p) => !p.diTurno), 'una bozza non ha turni');
  // la bozza con i suoi PG non usa chi è al tavolo
  assert.deepEqual(partecipantiDaBozza({ ...b, pg: ['Nadia'] }, ['Lucas']).filter((p) => p.tipo === 'pg').map((p) => p.id), ['pg:Nadia']);
});

test('coerenza: orfani e senza token; token nuovo valido nella scena e nella vista giocatori', () => {
  const s = scontroDiProva();
  const scena = nuovaScena({ id: 'sala', nome: 'Sala', colonne: 12, righe: 8, nebbia: 'scoperta', dati });
  const pezzi = pezziDellaScena({ scontro: s, viste: new Map(), veicoli: [scout] }, dati);
  const conToken = { ...scena, token: [tokenPerPezzo(pezzi[0], [1, 1]), tokenPerPezzo(pezzi[4], [4, 4]), tokenPerPezzo(pezzi[5], [6, 0]), { id: 'cassa', rif: { tipo: 'segnaposto' }, nome: 'Cassa', q: [0, 7], ingombro: 1, nascosto: false }] };
  assert.equal(validaScena(conToken, dati), null);
  assert.deepEqual(conToken.token[2].ingombro, [4, 2]);
  assert.deepEqual(pezziSenzaToken(conToken, pezzi).map((p) => p.chiave), ['partecipante:pg:Nadia-Ferro', 'partecipante:nem:predone:1', 'partecipante:nem:predone:2']);
  // la Nepharita esce dallo scontro: il suo token è orfano; il segnaposto non lo è mai
  const senza = togliPartecipante(s, 'nem:nepharita:1');
  const dopo = pezziDellaScena({ scontro: senza, viste: new Map(), veicoli: [scout] }, dati);
  assert.deepEqual(tokenOrfani(conToken, dopo).map((t) => t.id), [conToken.token[1].id]);
  // un nemico aggiunto compare fra i senza token
  const conNuovo = aggiungiNemici(s, nemico('predone', 'Predone'), 1);
  assert.ok(pezziSenzaToken(conToken, pezziDellaScena({ scontro: conNuovo, viste: new Map(), veicoli: [scout] }, dati)).some((p) => p.chiave === 'partecipante:nem:predone:3'));
  // il veicolo rettangolare passa il filtro della vista giocatori (celle del rettangolo)
  assert.equal(vistaGiocatori(conToken).token.length, 4);
  // solo i veicoli hanno un ingombro rettangolare; il 3 × 3 si può indicare a mano
  assert.match(validaScena({ ...conToken, token: [{ ...conToken.token[0], ingombro: [2, 1] }] }, dati), /solo per i veicoli/);
  assert.equal(validaScena({ ...conToken, token: [{ ...conToken.token[1], ingombro: 3 }] }, dati), null);
});

test('data/mappa.json: ingombro dei veicoli validato', () => {
  const d = copia(dati);
  d.mappa.token.veicolo_predefinito = [0, 2];
  assert.ok(validaDati(d).some((e) => e.file === 'mappa.json' && e.chiave === 'token.veicolo_predefinito'));
});
