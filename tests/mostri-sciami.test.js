// Blocco «Sciami e piccola fauna» (cap. 8 del Manuale dei Mostri v0.23): dieci profili validi (quattro animali e
// sei Sciami), fasce di danno per PV, immunità collettive, Spazio condiviso, Frenesia, Imitazione, veleno ofidico.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));
const cap = (id, nome) => leggi(id).capacita.find((c) => c.nome === nome);

const ANIMALI = ['pipistrello', 'corvo', 'ratto', 'quipper'];
const SCIAMI = ['sciame-di-pipistrelli', 'sciame-di-corvi', 'sciame-di-ratti', 'sciame-di-insetti', 'sciame-di-quipper', 'sciame-di-serpenti-velenosi'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of [...ANIMALI, ...SCIAMI]) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    // lotto 204: la fonte dichiara l'edizione dal registro, non una scritta a mano nello strumento
    assert.match(n.fonte, /Manuale dei Mostri v0\.\d+/);
    assert.ok(Number.isInteger(n.salvezze.volonta) && Number.isInteger(n.pm), `${id} Volontà e PM`);
    assert.equal(leggi(id).spazio, '1 Q', id);
  }
});

test('Sciami: due fasce di danno per PV (quello ridotto sostituisce l’altro), immunità collettive e corpo distribuito', () => {
  const attesi = {
    'sciame-di-pipistrelli': ['2d3', '1d3'], 'sciame-di-corvi': ['1d6+1', '1d3+1'], 'sciame-di-ratti': ['1d6+1', '1d3+1'],
    'sciame-di-insetti': ['2d4', '1d4'], 'sciame-di-quipper': ['2d6', '1d6'], 'sciame-di-serpenti-velenosi': ['2d6', '1d6'],
  };
  for (const [id, [alto, basso]] of Object.entries(attesi)) {
    const n = leggi(id);
    assert.deepEqual(n.attacchi.map((a) => a.danno), [alto, basso], id);
    // A.171 (risposta di Davide del 21/10/2026): portata 0 Q nei dati, non più 1 Q con la condizione in nota
    assert.ok(n.attacchi.every((a) => a.portata_q === 0 && a.ac === 1), `${id} portata 0 Q`);
    assert.ok(n.attacchi.every((a) => !/A\.171|il formato ammette/.test(a.note ?? '')), `${id} senza la nota di ripiego`);
    assert.deepEqual(n.immunita, ['a-terra', 'immobilizzato', 'stordito', 'terrorizzato'], id);
    assert.match(cap(id, 'Corpo distribuito').effetto, /Dimezza per eccesso/);
    assert.match(cap(id, 'Spazio condiviso').effetto, /1 × 1 Q/);
    assert.match(cap(id, 'Ferite e dispersione').effetto, /soglia di metà PV/);
  }
});

test('PV e soglie degli Sciami sulla 0.69: 32 PV (37 quipper, 47 serpenti); le fasce nei nomi degli attacchi restano quelle del manuale', () => {
  // lotto 203: 24 nella 0.46, 32 nella 0.69 (24 × 1,30 per eccesso, applicato una volta dal manuale). Le soglie
  // nei nomi degli attacchi restano quelle scritte nel manuale: non si convertono, perché non sono PV massimi.
  for (const id of ['sciame-di-pipistrelli', 'sciame-di-corvi', 'sciame-di-ratti', 'sciame-di-insetti']) assert.equal(leggi(id).pv, 32, id);
  assert.equal(leggi('sciame-di-quipper').pv, 37, '28 × 1,30 per eccesso');
  assert.equal(leggi('sciame-di-serpenti-velenosi').pv, 47, '36 × 1,30 per eccesso');
  // **Lotto 204: le fasce restano quelle della 0.47, e il motivo è la regola del lotto.** La 0.69 le ha riscritte
  // («Morsi con PV 20–37») perché seguono i PV nuovi, ma la sua lettura degli attacchi **perde** la nota «Solo in
  // acqua» e la portata 0 Q della A.171: è una lettura parziale, e una lettura parziale non si scrive sopra una
  // buona. Gli attacchi di queste schede restano della 0.47, la scheda lo dichiara campo per campo e la plancia
  // lo scrive. Meglio due fasce vecchie di un attacco senza la sua condizione.
  assert.deepEqual(leggi('sciame-di-quipper').attacchi.map((a) => a.nome), ['Morsi (PV 15–28)', 'Morsi (PV 0–14)']);
  assert.deepEqual(leggi('sciame-di-serpenti-velenosi').attacchi.map((a) => a.nome), ['Morsi (PV 19–36)', 'Morsi (PV 0–18)']);
  assert.equal(leggi('sciame-di-quipper')._bestiario.campi.attacchi, 'Mostri 0.47', 'e lo dichiara');
  assert.equal(leggi('sciame-di-quipper')._bestiario.campi.pv, 'Mostri 0.69', 'mentre i PV sono della 0.69');
});

test('animali singoli: nessuna immunità, nessuna fascia; Quipper senza moto a terra con Frenesia a VA 11', () => {
  for (const id of ANIMALI) { assert.equal(leggi(id).immunita, undefined, id); assert.equal(leggi(id).attacchi.length, 1, id); }
  assert.deepEqual(leggi('quipper').movimento, { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito' });
  // lotto 205: la 0.69 riscrive il testo e il nome della capacità; si controlla l’informazione, non la frase.
  assert.match(cap('quipper', 'Frenesia del sangue').effetto, /\b11\b/);
  assert.match(cap('sciame-di-quipper', 'Frenesia del sangue').effetto, /VA 13/);
  // lotto 205: la 0.69 rinomina la capacità; si controlla l’informazione, non il nome della riga.
  assert.match(JSON.stringify(leggi('quipper')), /Respira soltanto acqua/);
});

test('movimento: volo di Pipistrello, Corvo e dei loro Sciami; Corvo con Imitazione, Sciame di corvi senza', () => {
  assert.equal(leggi('pipistrello').movimento.volo, 6);
  assert.equal(leggi('corvo').movimento.volo, 10);
  assert.equal(leggi('sciame-di-pipistrelli').movimento.volo, 6);
  assert.equal(leggi('sciame-di-corvi').movimento.volo, 10);
  assert.equal(leggi('sciame-di-pipistrelli').movimento.passo, 0);
  assert.match(cap('corvo', 'Imitazione').effetto, /Raggirare 8/);
  assert.equal(cap('sciame-di-corvi', 'Imitazione'), undefined);
  assert.deepEqual(leggi('corvo').abilita.find((a) => a.nome === 'Raggirare'), { nome: 'Raggirare', va: 8 });
});

test('Sciame di serpenti: veleno ofidico II come i Serpenti (1d6, 5 Round, Tempra senza modificatore); Sciame di insetti AR 1', () => {
  const v = cap('sciame-di-serpenti-velenosi', 'Veleno ofidico II');
  assert.match(v.effetto, /1d6 Naturale interno/);
  assert.match(v.effetto, /5 Round/);
  assert.match(v.effetto, /Tempra senza modificatore/);
  assert.deepEqual(leggi('sciame-di-serpenti-velenosi').movimento, { passo: 6, corsa: 12, scatto: 18 });
  assert.equal(leggi('sciame-di-insetti').ar.totale, 1);
  assert.deepEqual(leggi('sciame-di-quipper').gs_px, { gs: 'Esperto', px: 30, per_pg: 4 });
  assert.deepEqual(leggi('ratto').gs_px, { gs: 'Principiante', px: 10, per_pg: 4 });
});
