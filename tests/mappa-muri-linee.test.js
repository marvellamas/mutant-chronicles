// Muri disegnati a mano libera (M2 dell'11/10/2026, segnalazione di Davide dopo la prova con la mappa della chiesa;
// src/mappa/muri-linee.js): un muro può essere un tratto, anche fuori dalla griglia e più sottile di un quadretto.
// Si controlla che blocchino come i muri a quadretto (linea di tiro, Copertura, nebbia automatica, movimento), che si
// cancellino, che la pila «annulla» li rimetta e che le mappe salvate prima restino valide e identiche.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali, copia } from './helpers.js';
import {
  spessoreQ, spessoriDati, lineeDi, incrociano, attraversa, primoAttraversato, lineeVicine, lineeNelRettangolo,
  abbastanzaLontano, nuovaLinea, conLinea, senzaLinee, conMuriLinee, erroreLinea, erroreDatiMuriLinee, bucaConPorte,
} from '../src/mappa/muri-linee.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { nuovaPorta, lineeEffettive, muriEffettivi } from '../src/mappa/porte.js';
import { ostacoliVista, mascheraOstacoli, lineeOstacoli, segmentoBloccato, lineaDiTiro, visuale, tokenPg } from '../src/mappa/visuale.js';
import { areaRaggiungibile, celleArea, costoVerso } from '../src/mappa/area.js';
import { annullaUltima } from '../src/mappa/annulla.js';
import { vistaGiocatori } from '../src/mappa/vista.js';
import { daBase64, inBase64, cella, nuovaMaschera, rettangolo } from '../src/mappa/celle.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();
const ML = dati.mappa.muri_linee;
const RV = dati.mappa.visuale;
const RP = dati.mappa.porte;
const C = 20, R = 12;

/** Scena vuota, nebbia tutta aperta (per il movimento e la linea di tiro). */
const scena = ({ nebbia = 'scoperta' } = {}) => ({ ...nuovaScena({ id: 's', nome: 'S', colonne: C, righe: R, nebbia, dati }), revisione: 0 });
const tok = (id, q, o = {}) => ({ id, q, ingombro: 1, nascosto: false, rif: { tipo: 'partecipante', id: `pg:${id}` }, ...o });
/** Muro disegnato verticale sulla linea x = 10, dalla riga 0 alla 12 (fra la colonna 9 e la 10). */
const muroVerticale = (spessore = 'medio') => nuovaLinea({ id: 'm1', punti: [[10, 0], [10, R]], spessore: spessoreQ(spessore, dati) });

test('dati: i tre spessori di Davide (sottile, medio, un quadretto) e i limiti del tratto', () => {
  assert.deepEqual(spessoriDati(dati).map((s) => s.id), ['sottile', 'medio', 'quadretto']);
  assert.equal(spessoreQ('quadretto', dati), 1, 'un quadretto = 1 Q');
  assert.ok(spessoreQ('sottile', dati) < spessoreQ('medio', dati));
  assert.ok(spessoreQ('medio', dati) < spessoreQ('quadretto', dati));
  // uno spessore sconosciuto torna al predefinito, non a zero
  assert.equal(spessoreQ('boh', dati), spessoreQ(ML.predefinito, dati));
  assert.equal(erroreDatiMuriLinee(ML), null);
  // il validatore dei dati li controlla davvero
  const d = copia(dati);
  d.mappa.muri_linee.spessori[0].q = 5;
  assert.match(validaDati(d).map((e) => `${e.chiave} ${e.problema}`).join(' | '), /muri_linee\.spessori\[0\]\.q/);
  const d2 = copia(dati);
  d2.mappa.muri_linee.predefinito = 'enorme';
  assert.match(validaDati(d2).map((e) => e.chiave).join(' | '), /muri_linee\.predefinito/);
});

test('geometria: due segmenti si incrociano solo dove si incrociano davvero', () => {
  assert.equal(incrociano([0, 0], [10, 0], [5, -2], [5, 2]), true);
  assert.equal(incrociano([0, 0], [10, 0], [5, 1], [5, 2]), false, 'non si toccano');
  assert.equal(incrociano([0, 0], [10, 0], [0, 1], [10, 1]), false, 'paralleli');
  // il tratto a mano libera scarta i punti troppo vicini (semplifica)
  assert.equal(abbastanzaLontano(null, [1, 1], 0.2), true, 'il primo punto si tiene sempre');
  assert.equal(abbastanzaLontano([1, 1], [1.05, 1], 0.2), false);
  assert.equal(abbastanzaLontano([1, 1], [1.3, 1], 0.2), true);
});

test('forma del muro: punti, spessore e margine fuori dalla griglia', () => {
  assert.equal(erroreLinea(muroVerticale(), ML, C, R), null);
  assert.match(erroreLinea({ id: 'x', punti: [[1, 1]], spessore: 0.25 }, ML, C, R), /punti: da 2/);
  assert.match(erroreLinea({ id: 'x', punti: [[1, 1], [2, 2]], spessore: 0.3 }, ML, C, R), /spessore: uno fra/, 'solo gli spessori dei dati');
  // «anche fuori dalla griglia»: un muro appena fuori va bene, uno all'infinito no
  assert.equal(erroreLinea({ id: 'x', punti: [[-1, -1], [2, 2]], spessore: spessoreQ('medio', dati) }, ML, C, R), null);
  assert.match(erroreLinea({ id: 'x', punti: [[-99, 0], [2, 2]], spessore: spessoreQ('medio', dati) }, ML, C, R), /dentro la griglia/);
  // una scena con muri disegnati è valida; una con un muro sbagliato no
  const s = conLinea(scena(), muroVerticale());
  assert.equal(validaScena(s, dati), null);
  assert.match(validaScena({ ...s, muriLinee: [{ id: 'm1', punti: [[0, 0]], spessore: 1 }] }, dati), /muriLinee\[0\]/);
  assert.match(validaScena({ ...s, muriLinee: [muroVerticale(), muroVerticale()] }, dati), /id ripetuto/);
});

test('mappe salvate prima: senza muri disegnati tutto è come era', () => {
  const vecchia = scena();
  assert.equal(vecchia.muriLinee, undefined, 'il campo nasce solo quando si disegna un muro');
  assert.equal(validaScena(vecchia, dati), null);
  assert.deepEqual(lineeDi(vecchia), []);
  assert.deepEqual(lineeEffettive(vecchia), []);
  const ost = ostacoliVista(vecchia, RP);
  assert.equal(lineeOstacoli(ost), null, 'nessun muro disegnato: gli ostacoli restano la sola maschera dei Q');
  assert.equal(segmentoBloccato(ost, C, R, [0.5, 5.5], [19.5, 5.5]), false);
  // e la vista dei giocatori non guadagna campi
  assert.equal(vistaGiocatori(vecchia, null, dati.mappa.template, dati.mappa).muriLinee, undefined);
});

test('M2: un muro disegnato blocca la linea di tiro e dà Copertura, come un muro a quadretto', () => {
  const s = conLinea(scena(), muroVerticale());
  s.token = [tok('a', [5, 5]), tok('b', [15, 5])];
  const ost = ostacoliVista(s, RP);
  assert.equal(lineeOstacoli(ost).length, 1);
  // il tratto sta fra i due: la linea non passa
  assert.equal(segmentoBloccato(ost, C, R, [5.5, 5.5], [15.5, 5.5]), true);
  // due punti dalla stessa parte si vedono
  assert.equal(segmentoBloccato(ost, C, R, [5.5, 5.5], [9.4, 5.5]), false);
  const r = lineaDiTiro(s, s.token[0], s.token[1], ost, RV);
  assert.equal(r.copertura, 'totale', 'il muro disegnato copre come gli altri');
  assert.equal(r.bloccate, 5, 'tutte le linee dal centro passano nel muro');
  assert.equal(r.linee.every((l) => l.causa === 'muro'), true);
  // uno spessore diverso non cambia il blocco (il muro è una linea: conta dove passa)
  const sottile = conLinea(scena(), muroVerticale('sottile'));
  assert.equal(segmentoBloccato(ostacoliVista(sottile, RP), C, R, [5.5, 5.5], [15.5, 5.5]), true);
});

test('M2: la nebbia automatica non si apre oltre un muro disegnato', () => {
  const s = conLinea(scena({ nebbia: 'coperta' }), muroVerticale());
  s.token = [tok('a', [5, 5])];
  const visti = visuale(s, tokenPg(s), ostacoliVista(s, RP), RV, null, dati.mappa);
  assert.ok(visti[5 * C + 8], 'di qua si vede');
  assert.ok(!visti[5 * C + 12], 'di là no: il muro disegnato ferma la vista');
  // senza il muro si vedrebbe
  const senza = scena({ nebbia: 'coperta' });
  senza.token = [tok('a', [5, 5])];
  assert.ok(visuale(senza, tokenPg(senza), ostacoliVista(senza, RP), RV, null, dati.mappa)[5 * C + 12]);
});

test('M2: il movimento non passa dove passa il muro disegnato', () => {
  const s = conLinea(scena(), muroVerticale());
  const chi = { id: 'a', q: [9, 5], ingombro: 1, lato: 'pg' };
  const comune = { colonne: C, righe: R, muri: muriEffettivi(s), terreno: daBase64(s.terreno), token: [], chi, massimo: 30, regole: dati.mappa.movimento };
  const con = areaRaggiungibile({ ...comune, linee: lineeEffettive(s) });
  const senza = areaRaggiungibile(comune);
  assert.ok(Number.isFinite(costoVerso(senza, [10, 5])), 'senza il muro si passerebbe');
  assert.equal(costoVerso(con, [10, 5]), Infinity, 'il muro disegnato ferma il passo');
  assert.equal(costoVerso(con, [10, 4]), Infinity, 'e anche in diagonale');
  assert.ok(Number.isFinite(costoVerso(con, [9, 11])), 'di qua si gira liberamente');
  // il muro non arriva in fondo: dove finisce si passa
  const corto = conLinea(scena(), nuovaLinea({ id: 'm2', punti: [[10, 0], [10, 6]], spessore: spessoreQ('medio', dati) }));
  const a2 = areaRaggiungibile({ ...comune, linee: lineeEffettive(corto) });
  assert.ok(Number.isFinite(costoVerso(a2, [10, 8])), 'oltre la fine del muro si passa');
  // dietro al muro ci si arriva solo girandoci intorno: costa molto più del passo diretto
  assert.ok(costoVerso(a2, [10, 2]) > costoVerso(senza, [10, 2]), `girare intorno costa di più: ${costoVerso(a2, [10, 2])} contro ${costoVerso(senza, [10, 2])}`);
});

test('M2: la gomma li toglie e Ctrl+Z li rimette (e annulla il muro appena disegnato)', () => {
  const vuota = scena();
  // disegnato: una voce di «annulla» con il solo id
  const s = conMuriLinee(vuota, { aggiungi: [muroVerticale()] }, dati);
  assert.equal(lineeDi(s).length, 1);
  assert.equal(s.annulla.at(-1).tipo, 'muri-linee');
  assert.deepEqual(s.annulla.at(-1).aggiunte, ['m1']);
  const indietro = annullaUltima(s);
  assert.equal(indietro.testo, 'muri');
  assert.deepEqual(lineeDi(indietro.scena), [], 'Ctrl+Z toglie il muro appena disegnato');
  // cancellato con la gomma: la voce tiene il muro intero, e Ctrl+Z lo rimette com'era
  const via = conMuriLinee(s, { togli: ['m1'] }, dati);
  assert.deepEqual(lineeDi(via), []);
  const tornato = annullaUltima(via);
  assert.deepEqual(lineeDi(tornato.scena), [muroVerticale()]);
  // la gomma del pennello prende i muri vicini al Q, quella a rettangolo quelli dentro
  const linee = lineeDi(s);
  assert.deepEqual(lineeVicine(linee, [10.2, 5.5], ML.gomma_raggio_q).map((x) => x.linea.id), ['m1']);
  assert.deepEqual(lineeVicine(linee, [3.5, 5.5], ML.gomma_raggio_q), []);
  assert.deepEqual(lineeNelRettangolo(linee, [9, 4], [11, 6]), ['m1']);
  assert.deepEqual(lineeNelRettangolo(linee, [0, 0], [4, 4]), [], 'un rettangolo lontano non tocca nulla');
  assert.deepEqual(lineeDi(senzaLinee(s, ['m1'])), []);
  // oltre il massimo dei dati non si aggiunge (e non si perde nulla)
  const pieno = { ...vuota, muriLinee: Array.from({ length: ML.linee_max }, (_, i) => nuovaLinea({ id: `m${i}`, punti: [[0, i], [1, i]], spessore: spessoreQ('sottile', dati) })) };
  assert.equal(lineeDi(conMuriLinee(pieno, { aggiungi: [muroVerticale()] }, dati)).length, ML.linee_max);
});

test('M2: ai giocatori arrivano i muri disegnati, ma non quelli tutti sotto la nebbia', () => {
  const s = conLinea(scena(), muroVerticale());
  const v = vistaGiocatori(s, null, dati.mappa.template, dati.mappa);
  assert.equal(v.muriLinee.length, 1, 'con la nebbia scoperta il muro si vede');
  // tutto coperto: il muro non parte (sarebbe la forma di una stanza non ancora vista)
  const coperta = conLinea(scena({ nebbia: 'coperta' }), muroVerticale());
  assert.equal(vistaGiocatori(coperta, null, dati.mappa.template, dati.mappa).muriLinee, undefined);
});

test('M2 e M3 insieme: una porta aperta agganciata al tratto apre il suo vano', () => {
  const s = conLinea(scena(), muroVerticale());
  const porta = { ...nuovaPorta({ id: 'p', q: [10, 5], stato: 'aperta' }), aggancio: { muro: 'm1', punto: [10, 5.5] } };
  const aperte = lineeEffettive({ ...s, porte: [porta] });
  // il muro si spezza in due pezzi, con il vano in mezzo
  assert.equal(aperte.length, 2);
  assert.equal(attraversa(aperte, [9.5, 5.5], [10.5, 5.5]), false, 'dal vano si passa');
  assert.equal(attraversa(aperte, [9.5, 1.5], [10.5, 1.5]), true, 'altrove è muro');
  // chiusa, resta muro
  assert.equal(attraversa(lineeEffettive({ ...s, porte: [{ ...porta, stato: 'chiusa' }] }), [9.5, 5.5], [10.5, 5.5]), true);
  // segreta e aperta: per i giocatori resta muro (niente fuga di informazioni)
  assert.equal(attraversa(lineeEffettive({ ...s, porte: [{ ...porta, segreta: true }] }, { perGiocatori: true }), [9.5, 5.5], [10.5, 5.5]), true);
  // il primo muro attraversato serve alla Copertura e alle porte: si sa quale è
  assert.equal(primoAttraversato(lineeDi(s), [9.5, 1.5], [10.5, 1.5])?.id, 'm1');
  // bucaConPorte da solo: il vano è larghezza 1 Q intorno al punto
  const pezzi = bucaConPorte([muroVerticale()], [{ aggancio: { muro: 'm1', punto: [10, 5.5] } }]);
  assert.equal(pezzi.length, 2);
});
