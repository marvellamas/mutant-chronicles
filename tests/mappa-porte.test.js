// Porte della mappa di battaglia (fase 2, lotto 2; src/mappa/porte.js; A.125, decisione 130): stati aperta, chiusa,
// bloccata e segreta; movimento (porta aperta = passaggio, chiusa o bloccata = muro), AzP e registro, segrete mai
// inviate ai giocatori, formato della scena e Ctrl+Z.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali, copia } from './helpers.js';
import { muriEffettivi, portaA, apriChiudi, nuovaPorta, conAzione, azpNelRound, adiacente, porteVicine, portePerGiocatori, muriPerGiocatori, orientamento, bloccaVista } from '../src/mappa/porte.js';
import { areaRaggiungibile, costoVerso } from '../src/mappa/area.js';
import { cambiaPortaAnnullabile, annullaUltima } from '../src/mappa/annulla.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { vistaGiocatori } from '../src/mappa/vista.js';
import { nuovoScontro, rigaPorta } from '../src/scontro.js';
import { daBase64, inBase64, rettangolo, cella, nuovaMaschera, impostaCella } from '../src/mappa/celle.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();
const RP = dati.mappa.porte;
const C = 12, R = 8;

/** Muro verticale sulla colonna 5 (righe 0–7) con una porta in (5, 3). */
function scena(stato = 'chiusa', o = {}) {
  const s = { ...nuovaScena({ id: 'porte', nome: 'Porte', colonne: C, righe: R, nebbia: 'scoperta', dati }), revisione: 0 };
  s.muri = inBase64(rettangolo(nuovaMaschera(C, R), C, R, 5, 0, 5, R - 1, true));
  s.porte = [nuovaPorta({ id: 'p1', q: [5, 3], stato, ...o })];
  return s;
}
const area = (s, chi = [3, 3], massimo = 10) => areaRaggiungibile({ colonne: C, righe: R, muri: muriEffettivi(s), terreno: daBase64(s.terreno), token: [], chi: { id: 'me', q: chi, ingombro: 1, lato: 'pg' }, massimo, regole: dati.mappa.movimento });

test('dati: la regola di Davide (A.125) e gli stati distinti', () => {
  assert.match(RP._nota, /costa 1 AzP, senza prova/);
  assert.match(RP._nota, /«chiusa» e «bloccata» sono condizioni distinte/);
  assert.deepEqual(RP.stati, ['aperta', 'chiusa', 'bloccata']);
  assert.equal(RP.costo_azp, 1);
  assert.deepEqual(RP.bloccano_vista, ['chiusa', 'bloccata']);
  assert.ok(bloccaVista({ stato: 'chiusa' }, RP) && !bloccaVista({ stato: 'aperta' }, RP), 'prossimo lotto: una porta chiusa blocca la vista');
  const d = copia(dati);
  d.mappa.porte.stati = ['aperta', 'chiusa'];
  assert.ok(validaDati(d).some((e) => e.file === 'mappa.json' && e.chiave === 'porte.stati'));
});

test('movimento: aperta = passaggio, chiusa e bloccata = muro (percorso dall’altra parte del muro)', () => {
  assert.equal(costoVerso(area(scena('aperta')), [7, 3]), 4, 'attraverso la porta aperta, al costo normale');
  for (const stato of ['chiusa', 'bloccata']) assert.equal(costoVerso(area(scena(stato)), [7, 3]), Infinity, stato);
  assert.ok(cella(muriEffettivi(scena('chiusa')), C, R, 5, 3));
  assert.ok(!cella(muriEffettivi(scena('aperta')), C, R, 5, 3));
  // una porta aperta messa dove non c'è muro resta un passaggio; chiusa diventa muro
  const libera = { ...scena('chiusa'), muri: inBase64(nuovaMaschera(C, R)) };
  assert.ok(cella(muriEffettivi(libera), C, R, 5, 3));
});

test('diagonali accanto alla porta come per i muri (A.124, A.134): rasente sì, fra porta chiusa e muro a spigolo no', () => {
  // una porta chiusa isolata in (5, 3), senza muri attorno: la diagonale (4, 3) → (5, 2) le passa rasente
  const s = { ...nuovaScena({ id: 'd', nome: 'D', colonne: C, righe: R, nebbia: 'scoperta', dati }), revisione: 0 };
  s.muri = inBase64(nuovaMaschera(C, R));
  s.porte = [nuovaPorta({ id: 'p', q: [5, 3], stato: 'chiusa' })];
  // da (4, 3) a (5, 2) in diagonale: un lato (5, 3) è la porta chiusa, l'altro (4, 2) libero → si passa (A.134)
  assert.equal(costoVerso(area(s, [4, 3], 3), [5, 2]), 1);
  // porta chiusa in (5, 3) e muro in (4, 2): passaggio chiuso a spigolo, la diagonale no; aperta sì
  s.muri = inBase64(impostaCella(nuovaMaschera(C, R), C, R, 4, 2, true));
  assert.equal(costoVerso(area(s, [4, 3], 3), [5, 2]), 3);
  s.porte = [{ ...s.porte[0], stato: 'bloccata' }];
  assert.equal(costoVerso(area(s, [4, 3], 3), [5, 2]), 3, 'la bloccata come la chiusa');
  s.porte = [{ ...s.porte[0], stato: 'aperta' }];
  assert.equal(costoVerso(area(s, [4, 3], 3), [5, 2]), 1);
});

test('aprire e chiudere: la bloccata non si apre; AzP del token nel Round e riga nel registro', () => {
  assert.deepEqual(apriChiudi(nuovaPorta({ id: 'p', q: [1, 1], stato: 'bloccata' }), 'apri'), { errore: 'bloccata' });
  assert.equal(apriChiudi(nuovaPorta({ id: 'p', q: [1, 1], stato: 'chiusa' }), 'apri').porta.stato, 'aperta');
  assert.equal(apriChiudi(nuovaPorta({ id: 'p', q: [1, 1], stato: 'aperta' }), 'chiudi').porta.stato, 'chiusa');
  let s = scena('chiusa');
  s = conAzione(s, { id: 'a1', token: 'me', porta: 'p1', azione: 'apri', scontro: 'sc', round: 2, quando: 'x' }, RP);
  s = conAzione(s, { id: 'a2', token: 'me', porta: 'p1', azione: 'chiudi', scontro: 'sc', round: 3, quando: 'x' }, RP);
  assert.equal(azpNelRound(s, 'me', 'sc', 2), 1);
  assert.equal(azpNelRound(s, 'me', 'sc', 4), 0);
  assert.equal(azpNelRound(conAzione(s, { id: 'a3', token: 'me', porta: 'p1', azione: 'apri', scontro: null, round: null, turno: 0, quando: 'x' }, RP), 'me', null, null, 0), 1, 'senza scontro, per turno');
  const r = rigaPorta({ ...nuovoScontro({ id: 'sc', nome: 'S', pg: [] }), round: 2 }, { nome: 'Michele', azione: 'apri', azp: 1 });
  assert.match(r.registro.at(-1).testo, /Michele apre una porta \(1 AzP\)/);
  // adiacente anche in diagonale; un token 2 × 2 con un Q vicino
  const porta = s.porte[0];
  assert.ok(adiacente({ q: [4, 2], ingombro: 1 }, porta) && adiacente({ q: [6, 4], ingombro: 1 }, porta));
  assert.ok(!adiacente({ q: [3, 3], ingombro: 1 }, porta));
  assert.ok(adiacente({ q: [2, 3], ingombro: 2 }, porta) === false && adiacente({ q: [3, 3], ingombro: 2 }, porta));
  assert.deepEqual(porteVicine(s, { q: [4, 3], ingombro: 1 }).map((p) => p.id), ['p1']);
});

test('giocatori: la porta segreta resta muro anche nei dati inviati; le altre arrivano con lo stato; niente sotto la nebbia', () => {
  const s = scena('aperta', { segreta: true });
  s.porte.push(nuovaPorta({ id: 'p2', q: [5, 6], stato: 'bloccata' }));
  const v = vistaGiocatori(s, null, dati.mappa.template);
  assert.deepEqual(v.porte.map((p) => [p.id, p.stato]), [['p2', 'bloccata']]);
  assert.ok(cella(daBase64(v.muri), C, R, 5, 3), 'la segreta è muro');
  assert.ok(!cella(daBase64(v.muri), C, R, 5, 6), 'la porta visibile esce dalla maschera dei muri');
  const testo = JSON.stringify(v);
  assert.ok(!testo.includes('p1') && !testo.includes('segreta'), 'della segreta non arriva nulla');
  // l'area dei giocatori: la segreta aperta è muro
  assert.ok(cella(muriEffettivi(s, { perGiocatori: true }), C, R, 5, 3));
  // rivelata: arriva
  assert.deepEqual(portePerGiocatori({ ...s, porte: s.porte.map((p) => ({ ...p, segreta: false })) }).map((p) => p.id), ['p1', 'p2']);
  // sotto la nebbia: niente
  const coperta = { ...s, nebbia: { ...s.nebbia, coperti: inBase64(rettangolo(nuovaMaschera(C, R), C, R, 4, 5, 6, 7, true)) } };
  assert.deepEqual(portePerGiocatori(coperta).map((p) => p.id), []);
  assert.equal(orientamento(s, [5, 6]), 'verticale', 'lungo il muro verticale');
  assert.ok(cella(muriPerGiocatori(s), C, R, 5, 3) && !cella(muriPerGiocatori(s), C, R, 5, 6));
});

test('formato della scena: porte e azioni validate; Ctrl+Z della porta toglie anche l’AzP del token', () => {
  let s = scena('chiusa');
  assert.equal(validaScena(s, dati), null);
  assert.match(validaScena({ ...s, porte: [{ ...s.porte[0], stato: 'socchiusa' }] }, dati), /^porte\[0\]\.stato/);
  assert.match(validaScena({ ...s, porte: [s.porte[0], { ...s.porte[0], id: 'p9' }] }, dati), /porte\[1\]\.q/);
  assert.match(validaScena({ ...s, porte: [{ ...s.porte[0], q: [C, 0] }] }, dati), /porte\[0\]\.q/);
  assert.match(validaScena({ ...s, azioni: [{ token: 'me', tipo: 'salto' }] }, dati), /^azioni\[0\]/);
  const { porte, azioni, ...vecchia } = s;
  assert.equal(validaScena(vecchia, dati), null, 'le scene di prima, senza porte, restano valide');
  // il token apre: azione + porta nella stessa voce di Ctrl+Z
  s = conAzione(s, { id: 'az1', token: 'me', porta: 'p1', azione: 'apri', azp: 1, scontro: null, round: null, turno: 0, quando: 'x' }, RP);
  s = cambiaPortaAnnullabile(s, s.porte[0], { ...s.porte[0], stato: 'aperta' }, dati, 'az1');
  assert.equal(validaScena(s, dati), null);
  assert.equal(portaA(s, [5, 3]).stato, 'aperta');
  const u = annullaUltima(s);
  assert.equal(portaA(u.scena, [5, 3]).stato, 'chiusa');
  assert.equal(u.scena.azioni.length, 0);
});
