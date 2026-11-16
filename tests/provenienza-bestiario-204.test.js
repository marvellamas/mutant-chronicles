import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 204 (16/11/2026), parte B — **la regola che è emersa nel lotto 203, scritta nel codice.**
//
// Nel 203 il corpus è passato alla 0.69 nei soli PV: scrivere le altre letture avrebbe svuotato gli attacchi di 29
// schede e alterato le Abilità di 18, perché il lettore era scritto sull'impaginazione della 0.46. La decisione era
// giusta, ma lasciava una scheda mezza 0.69 e mezza 0.47 senza che nessuno potesse saperlo guardandola.
//
// **Il controllo che deve restare verde sempre: un campo letto a metà non si scrive mai sopra un valore buono.**
// Il danno sarebbe invisibile — un numero plausibile al posto di uno giusto — ed è esattamente il tipo di errore
// che al tavolo si scopre quando è tardi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPI, provenienza, campiPresenti, campiNonCorrenti, campiSenzaProvenienza, schedaMista,
  rigaProvenienza, unisciPerCampo, quadroProvenienza,
} from '../src/provenienza-bestiario.js';

const VECCHIA = {
  formato: 'mutant-nemico', id: 'lorath', nome: 'Lorath',
  pv: 40, pm: 5, ar: { totale: 4, magica: 0 }, difese: 9, iniziativa: 2,
  movimento: { passo: 6, corsa: 12, scatto: 18 },
  attacchi: [{ nome: 'Chela', va: 12, danno: '1d8+2', natura: 'Naturale', ac: 1 }],
  abilita: { 'Corpo a corpo': 12 },
  _bestiario: { edizione: 'Mostri 0.47', sistema_salute: 'solo_PV' },
};

test('un campo non letto per intero NON si scrive: resta quello di prima, con scritto da dove viene', () => {
  // la lettura nuova «vede» i PV e le Difese, ma gli attacchi le sono finiti fra le capacità: non li ha letti
  const letta = { pv: 52, difese: 9, attacchi: [], abilita: {} };
  const r = unisciPerCampo(VECCHIA, letta, {
    edizione: 'Mostri 0.69',
    nonLetti: { attacchi: 'la tabella degli attacchi usa una colonna unita che il lettore non ricostruisce' },
    edizionePrima: 'Mostri 0.47',
  });
  assert.equal(r.json.pv, 52, 'i PV si leggono: si scrivono');
  assert.equal(r.campi.pv, 'Mostri 0.69');
  assert.deepEqual(r.json.attacchi, VECCHIA.attacchi, 'gli attacchi NON si sovrascrivono con una lettura incompleta');
  assert.equal(r.campi.attacchi, 'Mostri 0.47', 'e portano scritto che vengono dall’edizione di prima');
  assert.ok(r.ereditati.some((x) => x.campo === 'attacchi' && /colonna unita/.test(x.motivo)), 'con il motivo');
  // e il caso che il 203 avrebbe prodotto senza questa regola: un elenco vuoto scritto sopra uno buono
  assert.notDeepEqual(r.json.attacchi, [], 'un elenco vuoto non è una lettura');
});

test('IL CASO PERICOLOSO: una lettura **parziale ma non vuota** non si scrive sopra quella buona', () => {
  // è esattamente ciò che sarebbe successo nel 203: il lettore leggeva 2 attacchi su 5 e gli altri 3 finivano fra le
  // capacità. Un elenco di 2 attacchi non è vuoto, è plausibile, ed è sbagliato: al tavolo la creatura ne avrebbe
  // persi tre senza che nulla sembrasse rotto. Un valore parziale è un valore non letto.
  const parziale = {
    pv: 52,
    attacchi: [{ nome: 'Chela', va: 12, danno: '1d8+2', natura: 'Naturale', ac: 1 }],
    abilita: { 'Corpo a corpo': 12 },
  };
  const vecchiaDue = { ...VECCHIA, attacchi: [...VECCHIA.attacchi, { nome: 'Spina paralizzante', va: 11, danno: '1d6+2', natura: 'Naturale', ac: 1 }] };
  const r = unisciPerCampo(vecchiaDue, parziale, {
    edizione: 'Mostri 0.69',
    nonLetti: { attacchi: 'Attacco «Spina paralizzante» non importato come attacco: messo fra le capacità' },
    edizionePrima: 'Mostri 0.47',
  });
  assert.equal(r.json.attacchi.length, 2, 'restano i due attacchi buoni, non l’unico letto');
  assert.deepEqual(r.json.attacchi, vecchiaDue.attacchi);
  assert.equal(r.campi.attacchi, 'Mostri 0.47');
  assert.ok(!r.scritti.includes('attacchi'), 'e non si conta fra i campi scritti dall’edizione corrente');
});

test('un campo letto vuoto non cancella quello di prima, anche senza un motivo dichiarato', () => {
  const r = unisciPerCampo(VECCHIA, { pv: 52, abilita: {} }, { edizione: 'Mostri 0.69', edizionePrima: 'Mostri 0.47' });
  assert.deepEqual(r.json.abilita, VECCHIA.abilita);
  assert.equal(r.campi.abilita, 'Mostri 0.47');
  assert.equal(r.json.pv, 52);
});

test('una creatura nuova: tutti i campi letti portano l’edizione corrente, e quelli non letti non si inventano', () => {
  const letta = { id: 'viverna', nome: 'Viverna', pv: 73, difese: 9, ar: { totale: 3, magica: 0 } };
  const r = unisciPerCampo(null, letta, { edizione: 'Mostri 0.69', nonLetti: { spazio: 'non scritto nella scheda' } });
  assert.equal(r.campi.pv, 'Mostri 0.69');
  assert.equal(r.json.spazio, undefined, 'un campo che non c’è non si inventa');
  assert.equal(r.campi.spazio, undefined, 'e non dichiara una provenienza che non ha');
  assert.ok(r.nonLeggibili.some((x) => x.campo === 'spazio'));
});

test('la provenienza si dichiara solo dei campi che la scheda ha davvero', () => {
  const senzaPm = { ...VECCHIA, pm: undefined };
  const r = unisciPerCampo(senzaPm, { pv: 52 }, { edizione: 'Mostri 0.69', edizionePrima: 'Mostri 0.47' });
  assert.equal(r.campi.pm, undefined, 'niente provenienza per un valore che non esiste');
  assert.ok(!campiPresenti(r.json).includes('pm'));
});

test('campiNonCorrenti e schedaMista: che cosa non viene dall’edizione corrente', () => {
  const mista = { ...VECCHIA, _bestiario: { edizione: 'Mostri 0.69', campi: { pv: 'Mostri 0.69', difese: 'Mostri 0.69', ar: 'Mostri 0.69', pm: 'Mostri 0.69', iniziativa: 'Mostri 0.69', movimento: 'Mostri 0.69', abilita: 'Mostri 0.69', attacchi: 'Mostri 0.47' } } };
  const vecchi = campiNonCorrenti(mista, 'Mostri 0.69');
  assert.deepEqual(vecchi.map((v) => v.campo), ['attacchi']);
  assert.equal(vecchi[0].nome, 'Attacchi');
  assert.ok(schedaMista(mista, 'Mostri 0.69'));

  const tutta = { ...mista, _bestiario: { ...mista._bestiario, campi: { ...mista._bestiario.campi, attacchi: 'Mostri 0.69' } } };
  assert.equal(schedaMista(tutta, 'Mostri 0.69'), false, 'tutta all’edizione corrente: niente da dire');
  assert.equal(rigaProvenienza(tutta, 'Mostri 0.69'), null, 'e la riga si spegne da sé, come il segno delle provvisorie');
});

test('la riga per il tavolo dice quali campi sono vecchi, non solo che qualcosa lo è', () => {
  const mista = { ...VECCHIA, _bestiario: { edizione: 'Mostri 0.69', campi: { pv: 'Mostri 0.69', ar: 'Mostri 0.47', attacchi: 'Mostri 0.47', difese: 'Mostri 0.69', pm: 'Mostri 0.69', iniziativa: 'Mostri 0.69', movimento: 'Mostri 0.69', abilita: 'Mostri 0.69' } } };
  const riga = rigaProvenienza(mista, 'Mostri 0.69');
  assert.match(riga, /Mostri 0\.69/);
  assert.match(riga, /AR/);
  assert.match(riga, /Attacchi/);
  assert.match(riga, /Mostri 0\.47/);
  assert.ok(!/\*\*/.test(riga), 'niente marcatori sullo schermo (lezione del lotto 203)');
});

test('un campo senza provenienza dichiarata non si conta come vecchio: è un caso a sé', () => {
  const senza = { ...VECCHIA, _bestiario: { edizione: 'Mostri 0.69' } };
  assert.deepEqual(campiNonCorrenti(senza, 'Mostri 0.69'), [], 'non si inventa una provenienza');
  assert.ok(campiSenzaProvenienza(senza).includes('pv'));
});

test('il quadro d’insieme conta letti, ereditati e non dichiarati, ed elenca le schede miste', () => {
  const a = { id: 'a', nome: 'A', pv: 10, difese: 9, _bestiario: { edizione: 'Mostri 0.69', campi: { pv: 'Mostri 0.69', difese: 'Mostri 0.69' } } };
  const b = { id: 'b', nome: 'B', pv: 10, difese: 9, _bestiario: { edizione: 'Mostri 0.69', campi: { pv: 'Mostri 0.69', difese: 'Mostri 0.47' } } };
  const c = { id: 'c', nome: 'C', pv: 10, _bestiario: { edizione: 'Mostri 0.69' } };
  const q = quadroProvenienza([a, b, c], 'Mostri 0.69');
  assert.equal(q.schede, 3);
  assert.equal(q.letti, 3);
  assert.equal(q.ereditati, 1);
  assert.equal(q.senzaProvenienza, 1);
  assert.deepEqual(q.miste.map((m) => m.nome), ['B']);
  assert.equal(q.perEdizione['Mostri 0.47'], 1);
});

test('unisciPerCampo si rifiuta di lavorare senza sapere da che edizione viene la lettura', () => {
  assert.throws(() => unisciPerCampo(VECCHIA, { pv: 52 }, {}), /edizione/);
});

test('CAMPI copre i campi obbligatori del formato dei nemici', () => {
  for (const k of ['pv', 'ar', 'difese', 'iniziativa', 'salvezze', 'movimento', 'attacchi']) {
    assert.ok(CAMPI.includes(k), `${k} deve avere una provenienza`);
  }
  assert.deepEqual(provenienza({}), {}, 'una scheda senza provenienza non esplode: torna una mappa vuota');
});
