// Lotto 172, A.224 (Davide, 03/11/2026): materiale Roccia, assegnabile ai muri a quadretti e ai muri disegnati come linee.
// La attraversano solo le creature con la capacità (la Murena della Roccia eterea, A.202), nei limiti del loro profilo;
// attraversare la roccia non fa passare porte metalliche né muri di altro materiale; la roccia ferma la vista e resta un
// ostacolo per tutte le altre creature.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { rettangoloMuri, rocciaDi, MODI_MURI } from '../src/mappa/muri.js';
import { annullaUltima } from '../src/mappa/annulla.js';
import { cella, daBase64 } from '../src/mappa/celle.js';
import { muriEffettivi, lineeEffettive, rocciaEffettiva, nuovaPorta } from '../src/mappa/porte.js';
import { areaRaggiungibile, costoVerso } from '../src/mappa/area.js';
import { nuovaLinea, erroreLinea, bucaConPorte } from '../src/mappa/muri-linee.js';
import { ostacoliVista, segmentoBloccato } from '../src/mappa/visuale.js';
import { cambiaProprieta, riassuntoSelezione } from '../src/mappa/editor.js';

const { dati } = await datiReali();
const C = 20; const R = 10;
const q01 = (...a) => (cella(...a) ? 1 : 0);
const base = () => nuovaScena({ id: 'roccia', nome: 'Roccia', colonne: C, righe: R, dati });
const area = (s, chi, extra = {}) => areaRaggiungibile({
  colonne: C, righe: R, muri: muriEffettivi(s), roccia: rocciaEffettiva(s), terreno: daBase64(s.terreno), linee: lineeEffettive(s, { larghezza: dati.mappa.porte.larghezza_q }),
  token: [], chi: { id: 'm', q: [2, 4], ingombro: 1, lato: 'avversario', ...chi }, massimo: 14, regole: dati.mappa.movimento, ...extra,
});
const eterea = { attraversaRoccia: true };

test('il pennello «Roccia»: Q di muro e di roccia insieme; «Muro» e «Gomma» la tolgono; Ctrl+Z la rimette', () => {
  assert.ok(MODI_MURI.includes('roccia'));
  let s = rettangoloMuri(base(), [6, 0], [7, R - 1], 'roccia', dati);
  const m = daBase64(s.muri); const r = rocciaDi(s);
  assert.equal(q01(m, C, R, 6, 3), 1); assert.equal(q01(r, C, R, 6, 3), 1);
  assert.equal(validaScena(s, dati), null);
  // muro ordinario sopra: resta muro, non è più roccia
  const s2 = rettangoloMuri(s, [6, 0], [6, R - 1], 'muro', dati);
  assert.equal(q01(rocciaDi(s2), C, R, 6, 3), 0); assert.equal(q01(daBase64(s2.muri), C, R, 6, 3), 1);
  assert.equal(q01(rocciaDi(s2), C, R, 7, 3), 1);
  // la gomma toglie muro e roccia
  const s3 = rettangoloMuri(s, [7, 0], [7, R - 1], 'gomma', dati);
  assert.equal(q01(rocciaDi(s3), C, R, 7, 3), 0); assert.equal(q01(daBase64(s3.muri), C, R, 7, 3), 0);
  // annulla: la roccia torna com'era
  const u = annullaUltima(s2).scena;
  assert.equal(q01(rocciaDi(u), C, R, 6, 3), 1);
  s = annullaUltima(s).scena;
  assert.equal(q01(rocciaDi(s), C, R, 6, 3), 0);
});

test('la Murena eterea attraversa la roccia a quadretti; le altre creature no; un muro ordinario ferma anche lei', () => {
  const s = rettangoloMuri(base(), [6, 0], [7, R - 1], 'roccia', dati);
  assert.equal(costoVerso(area(s, {}), [10, 4]), Infinity, 'la roccia è un muro per le altre creature');
  assert.equal(costoVerso(area(s, eterea), [10, 4]), 8, 'in linea retta attraverso la roccia');
  // dietro la roccia un muro ordinario: la ferma
  const s2 = rettangoloMuri(s, [9, 0], [9, R - 1], 'muro', dati);
  assert.equal(costoVerso(area(s2, eterea), [8, 4]), 6, 'arriva fino al muro');
  assert.equal(costoVerso(area(s2, eterea), [11, 4]), Infinity, 'attraversare la roccia non fa passare il muro di altro materiale');
});

test('la Murena attraversa la roccia e si ferma davanti alla porta metallica chiusa (a quadretti e su un muro disegnato di roccia)', () => {
  // corridoio chiuso da una parete di roccia con una porta nel mezzo, e un muro ordinario tutto attorno alla stanza oltre
  let s = rettangoloMuri(base(), [6, 0], [6, R - 1], 'roccia', dati);
  s = rettangoloMuri(s, [10, 0], [10, R - 1], 'muro', dati);
  const porta = nuovaPorta({ id: 'pm', q: [10, 4], stato: 'chiusa' });
  s = { ...s, porte: [porta] };
  assert.equal(q01(rocciaEffettiva(s), C, R, 10, 4), 0, 'il Q della porta non è mai roccia');
  const a = area(s, eterea);
  assert.equal(costoVerso(a, [9, 4]), 7, 'passa la roccia e arriva davanti alla porta');
  assert.equal(costoVerso(a, [11, 4]), Infinity, 'la porta chiusa la ferma');
  // anche se la porta sta su un Q di roccia, resta una porta
  let s3 = rettangoloMuri(base(), [6, 0], [6, R - 1], 'roccia', dati);
  s3 = { ...s3, porte: [nuovaPorta({ id: 'pr', q: [6, 4], stato: 'chiusa' })] };
  assert.equal(q01(rocciaEffettiva(s3), C, R, 6, 4), 0);
  assert.equal(costoVerso(area(s3, eterea), [8, 4]), 6, 'passa dalla roccia accanto alla porta, non dalla porta');
  // muro disegnato di roccia con una porta agganciata: il battente chiuso resta un muro ordinario
  const linea = nuovaLinea({ id: 'r1', punti: [[6, 0], [6, R]], spessore: dati.mappa.muri_linee.spessori[0].q, materiale: 'roccia' });
  const conPorta = (stato) => ({ ...base(), muriLinee: [linea], porte: [nuovaPorta({ id: 'pl', q: [6, 4], stato, aggancio: { muro: 'r1', punto: [6, 4.5], da: [6, 0], a: [6, R] } })] });
  const chiusa = conPorta('chiusa');
  const ll = lineeEffettive(chiusa, { larghezza: dati.mappa.porte.larghezza_q });
  assert.ok(ll.some((l) => l.id === 'battente:pl' && !l.materiale), 'il battente è un tratto senza roccia');
  const sopraPorta = areaRaggiungibile({ colonne: C, righe: R, muri: daBase64(chiusa.muri), roccia: rocciaEffettiva(chiusa), terreno: daBase64(chiusa.terreno), linee: ll, token: [], chi: { id: 'm', q: [5, 4], ingombro: 1, lato: 'avversario', attraversaRoccia: true }, massimo: 1, regole: dati.mappa.movimento });
  assert.equal(costoVerso(sopraPorta, [6, 4]), Infinity, 'attraverso la porta chiusa non passa');
  assert.equal(costoVerso(sopraPorta, [6, 5]), Infinity, 'nemmeno in diagonale sul battente');
  const accanto = areaRaggiungibile({ colonne: C, righe: R, muri: daBase64(chiusa.muri), roccia: rocciaEffettiva(chiusa), terreno: daBase64(chiusa.terreno), linee: ll, token: [], chi: { id: 'm', q: [5, 2], ingombro: 1, lato: 'avversario', attraversaRoccia: true }, massimo: 1, regole: dati.mappa.movimento });
  assert.equal(costoVerso(accanto, [6, 2]), 1, 'due Q più in là la roccia la attraversa');
  // la porta aperta è un passaggio per tutti
  const aperta = conPorta('aperta');
  const la = lineeEffettive(aperta, { larghezza: dati.mappa.porte.larghezza_q });
  const oltre = areaRaggiungibile({ colonne: C, righe: R, muri: daBase64(aperta.muri), terreno: daBase64(aperta.terreno), linee: la, token: [], chi: { id: 'x', q: [5, 4], ingombro: 1, lato: 'pg' }, massimo: 1, regole: dati.mappa.movimento });
  assert.equal(costoVerso(oltre, [6, 4]), 1);
});

test('il muro disegnato di roccia: la Murena lo attraversa, le altre no; un muro disegnato ordinario ferma tutte e due', () => {
  const sp = dati.mappa.muri_linee.spessori[0].q;
  const conLinea = (materiale) => ({ ...base(), muriLinee: [nuovaLinea({ id: 'l1', punti: [[6, 0], [6, R]], spessore: sp, materiale })] });
  const roccia = conLinea('roccia');
  assert.equal(validaScena(roccia, dati), null);
  assert.equal(roccia.muriLinee[0].materiale, 'roccia');
  assert.equal(conLinea('muro').muriLinee[0].materiale, undefined, 'il muro ordinario non scrive il materiale');
  assert.equal(costoVerso(area(roccia, {}), [8, 4]), Infinity);
  assert.equal(costoVerso(area(roccia, eterea), [8, 4]), 6);
  assert.equal(costoVerso(area(conLinea(undefined), eterea), [8, 4]), Infinity);
  // il materiale non si perde quando una porta aperta buca il muro
  const pezzi = bucaConPorte(roccia.muriLinee, [{ aggancio: { muro: 'l1', punto: [6, 4.5] } }], 1);
  assert.ok(pezzi.length >= 2 && pezzi.every((l) => l.materiale === 'roccia'));
  assert.match(String(erroreLinea({ ...roccia.muriLinee[0], materiale: 'legno' }, dati.mappa.muri_linee, C, R)), /materiale/);
});

test('la roccia ferma la vista come ogni muro (a quadretti e disegnata)', () => {
  const s = rettangoloMuri(base(), [6, 0], [6, R - 1], 'roccia', dati);
  assert.equal(segmentoBloccato(ostacoliVista(s, dati.mappa.porte), C, R, [2.5, 4.5], [10.5, 4.5]), true);
  const sp = dati.mappa.muri_linee.spessori[0].q;
  const l = { ...base(), muriLinee: [nuovaLinea({ id: 'l1', punti: [[6, 0], [6, R]], spessore: sp, materiale: 'roccia' })] };
  assert.equal(segmentoBloccato(ostacoliVista(l, dati.mappa.porte), C, R, [2.5, 4.5], [10.5, 4.5]), true);
});

test('Seleziona → Materiale: il muro disegnato diventa di roccia e torna muro ordinario', () => {
  const sp = dati.mappa.muri_linee.spessori[0].q;
  const s = { ...base(), muriLinee: [nuovaLinea({ id: 'l1', punti: [[6, 0], [6, R]], spessore: sp })] };
  const r = riassuntoSelezione(s, ['muro:l1'], dati);
  assert.ok(r.proprieta.some((p) => p.chiave === 'materiale' && p.valore === 'muro'));
  const s2 = cambiaProprieta(s, 'muro:l1', { materiale: 'roccia' }, dati);
  assert.equal(s2.muriLinee[0].materiale, 'roccia');
  assert.match(riassuntoSelezione(s2, ['muro:l1'], dati).testo, /di roccia/);
  const s3 = cambiaProprieta(s2, 'muro:l1', { materiale: 'muro' }, dati);
  assert.equal('materiale' in s3.muriLinee[0], false);
  assert.equal(annullaUltima(s3).scena.muriLinee[0].materiale, 'roccia');
});

test('combacia con la Murena del lotto 149: la capacità è della forma (pezzo.attraversaRoccia, provato in madre-murena-a202-a203.test.js); senza la capacità la roccia è muro', () => {
  const s = rettangoloMuri(base(), [6, 0], [7, R - 1], 'roccia', dati);
  assert.equal(costoVerso(area(s, { attraversaRoccia: false }), [10, 4]), Infinity, 'corporea (overdose) o qualunque altra creatura');
  assert.equal(costoVerso(area(s, eterea), [10, 4]), 8, 'eterea');
  // un token che blocca, messo sulla roccia, la ferma lo stesso
  const tok = Array.from({ length: R }, (_, y) => ({ id: `cassa${y}`, q: [6, y], ingombro: 1, blocca: true }));
  assert.equal(costoVerso(area(s, eterea, { token: tok }), [10, 4]), Infinity);
});
