import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 201 (15/11/2026): **un riferimento che non punta a niente.**
//
// Nell'istantanea del 14/11 il file attuale di PABLO ZAION rimanda al veicolo `veimuu14mqa0` e quello di LUCAS a
// `veimv15h6e40`; nel registro di Davide c'è solo `veimvozx57q0`. Pablo è il pilota, e al tavolo il mezzo non si
// apriva. Un identificativo non cambia mai: è il record che può sparire, e chi lo cita non viene più riconciliato
// (`migraVeicoli` salta i riferimenti per costruzione).
//
// **I due controlli che devono restare verdi sempre:**
//   1. un riferimento rotto **viene segnalato** — nella scheda, nello strumento e nel controllo di inizio sessione;
//   2. l'app **non ricollega da sé**: senza una scelta del Direttore non si tocca niente, nemmeno quando il
//      candidato plausibile è uno solo. Un collegamento sbagliato è peggio di uno mancante.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  veicoliRotti, candidatiPerVeicolo, statoRiferimentoRotto, ricollegaVeicolo, togliRiferimentoRotto,
  quadroRiferimentiRotti,
} from '../src/riferimenti-rotti.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();

/** Il caso vero, nella forma esatta che `migraVeicoli` scrive: `{ uid, rif, nome }`, senza profilo. */
const PABLO = { uid: 'veimuu14mqa0', rif: 'veimuu14mqa0', nome: 'ASA Scout MK4' };
const LUCAS = { uid: 'veimv15h6e40', rif: 'veimv15h6e40', nome: 'ASA Scout MK4' };
const FIAT_LUX = {
  formato: 'mutant-veicolo', versione: 1, id: 'veimvozx57q0', revisione: 21,
  proprietario: { tipo: 'gruppo' }, conducente: { chiave: 'PABLO-ZAION', nome: 'PABLO ZAION' },
  mezzo: { uid: 'veimvozx57q0', profilo: 'asa-scout-mk4', nome: 'FIAT LUX', pi: { corpo: 60, propulsione: 36, motore: 24 } },
};
const NEVERLOST = {
  formato: 'mutant-veicolo', versione: 1, id: 'veimvzoj07y0', revisione: 7,
  proprietario: { tipo: 'gruppo' }, conducente: null,
  mezzo: { uid: 'veimvzoj07y0', profilo: 'neverlost', nome: 'Neverlost' },
};
const pg = (nome, veicoli) => ({ nome, file: `${nome}_liv7_2026-11-11.json`, json: { scelte: { veicoli } } });

// --- 1. il riferimento rotto si vede --------------------------------------------------------------------

test('un riferimento a un record che non c’è viene trovato, e uno buono no', () => {
  assert.deepEqual(veicoliRotti([PABLO], [FIAT_LUX]).map((x) => x.rif), ['veimuu14mqa0']);
  assert.deepEqual(veicoliRotti([LUCAS], [FIAT_LUX]).map((x) => x.rif), ['veimv15h6e40']);
  // il riferimento buono non è rotto
  assert.deepEqual(veicoliRotti([{ uid: 'veimvozx57q0', rif: 'veimvozx57q0', nome: 'FIAT LUX' }], [FIAT_LUX]), []);
  // un veicolo locale (senza rif) non è un riferimento e non entra
  assert.deepEqual(veicoliRotti([{ uid: 'veix', profilo: 'asa-scout-mk4', nome: 'mio' }], [FIAT_LUX]), []);
  // registro vuoto: tutto rotto, ma niente eccezioni
  assert.equal(veicoliRotti([PABLO, LUCAS], []).length, 2);
  assert.deepEqual(veicoliRotti(null, null), []);
});

test('il candidato si riconosce dal nome, anche quando il record si chiama FIAT LUX e il riferimento «ASA Scout MK4»', () => {
  const c = candidatiPerVeicolo(PABLO, [FIAT_LUX, NEVERLOST], dati);
  assert.deepEqual(c.map((r) => r.id), ['veimvozx57q0'], 'il nome del modello deve bastare: il riferimento rotto non porta il profilo');
  // un nome che non somiglia a niente non dà candidati
  assert.deepEqual(candidatiPerVeicolo({ rif: 'veix', nome: 'Astronave di nessuno' }, [FIAT_LUX, NEVERLOST], dati), []);
  // con la copia (A.113) comanda il profilo, non il nome
  const conCopia = { rif: 'veix', nome: 'un nome qualunque', copia: { mezzo: { profilo: 'neverlost' } } };
  assert.deepEqual(candidatiPerVeicolo(conCopia, [FIAT_LUX, NEVERLOST], dati).map((r) => r.id), ['veimvzoj07y0']);
});

test('LA REGOLA: la riga dice il vero, con l’identificativo scritto', () => {
  const s = statoRiferimentoRotto(PABLO, [FIAT_LUX], dati);
  assert.match(s.testo, /veimuu14mqa0/, 'senza l’identificativo scritto non si capisce di che mezzo si parla');
  assert.match(s.testo, /non c’è più|non c’è/, 'deve dire che il record non c’è');
  assert.match(s.testo, /non si apre/, 'deve dire la conseguenza al tavolo');
  assert.match(s.testo, /Direttore/, 'deve dire chi lo rimette');
  assert.equal(s.azione, 'ricollega');
  // senza nessun candidato cambia l'azione e il testo lo dice
  const senza = statoRiferimentoRotto(PABLO, [NEVERLOST], dati);
  assert.equal(senza.azione, 'togli');
  assert.match(senza.testo, /nessun veicolo/);
});

test('il quadro conta i personaggi e dice chi: è la riga del controllo di inizio sessione', () => {
  const q = quadroRiferimentiRotti([pg('PABLO ZAION', [PABLO]), pg('LUCAS', [LUCAS]), pg('OSHI NAGATA', [])], [FIAT_LUX], dati);
  assert.equal(q.quanti, 2);
  assert.equal(q.sistemabili, 2, 'un candidato ciascuno: lo strumento li sa sistemare');
  assert.equal(q.inAttesa, 0);
  assert.match(q.riga, /PABLO ZAION/);
  assert.match(q.riga, /LUCAS/);
  assert.ok(!/OSHI/.test(q.riga), 'chi non ha riferimenti rotti non compare');
  // nessun rotto: la riga lo dice in chiaro, senza allarmare
  assert.match(quadroRiferimentiRotti([pg('OSHI NAGATA', [])], [FIAT_LUX], dati).riga, /nessuno/);
});

test('con due candidati il personaggio resta in attesa: lo risolve il Direttore dalla scheda', () => {
  const secondoScout = { ...FIAT_LUX, id: 'veimw0000001', mezzo: { ...FIAT_LUX.mezzo, uid: 'veimw0000001', nome: 'ASA Scout MK4' } };
  const q = quadroRiferimentiRotti([pg('PABLO ZAION', [PABLO])], [FIAT_LUX, secondoScout], dati);
  assert.equal(q.quanti, 1);
  assert.equal(q.sistemabili, 0, 'con due candidati non si sistema da soli');
  assert.equal(q.inAttesa, 1);
  assert.match(q.righe[0].testo, /ce ne sono 2|sceglie il Direttore/);
});

// --- 2. l'app non ricollega da sé -----------------------------------------------------------------------

test('LA REGOLA: senza una scelta del Direttore non si ricollega niente, nemmeno con un candidato solo', () => {
  // senza master: rifiutato, e le scelte non si toccano
  const senzaMaster = ricollegaVeicolo([PABLO], 'veimuu14mqa0', 'veimvozx57q0', [FIAT_LUX]);
  assert.ok(senzaMaster.errore, 'ha ricollegato senza il Direttore');
  assert.match(senzaMaster.errore, /solo il Direttore/);
  assert.equal(senzaMaster.veicoli, undefined, 'non deve tornare delle scelte nuove');
  // nemmeno il quadro, che è quello che guarda la scheda, cambia qualcosa
  const scelte = [PABLO];
  quadroRiferimentiRotti([pg('PABLO ZAION', scelte)], [FIAT_LUX], dati);
  assert.deepEqual(scelte, [PABLO], 'guardare non deve cambiare le scelte');
  // e togliere ha la stessa guardia
  assert.ok(togliRiferimentoRotto([PABLO], 'veimuu14mqa0').errore);
});

test('il Direttore ricollega, e la voce dice da dove viene', () => {
  const e = ricollegaVeicolo([PABLO], 'veimuu14mqa0', 'veimvozx57q0', [FIAT_LUX], { master: true, quando: '2026-11-15T12:00:00.000Z' });
  assert.ok(!e.errore, e.errore);
  assert.deepEqual(e.voce, {
    uid: 'veimvozx57q0', rif: 'veimvozx57q0', nome: 'FIAT LUX',
    ricollegato: { da: 'veimuu14mqa0', quando: '2026-11-15T12:00:00.000Z', chi: 'Direttore' },
  });
  assert.equal(e.veicoli.length, 1, 'si sostituisce la voce, non se ne aggiunge una seconda');
  assert.match(e.riga, /veimuu14mqa0/);
  assert.match(e.riga, /FIAT LUX/);
  // e adesso non è più rotto
  assert.deepEqual(veicoliRotti(e.veicoli, [FIAT_LUX]), []);
});

test('il Direttore non può ricollegare a un record che non c’è, né fare un doppione', () => {
  assert.match(ricollegaVeicolo([PABLO], 'veimuu14mqa0', 'veinonesiste', [FIAT_LUX], { master: true }).errore, /non è nel registro/);
  assert.match(ricollegaVeicolo([PABLO], 'veinonesiste', 'veimvozx57q0', [FIAT_LUX], { master: true }).errore, /non c’è un riferimento/);
  // la scheda già rimanda al candidato: ricollegare farebbe due voci sullo stesso mezzo
  const due = [PABLO, { uid: 'veimvozx57q0', rif: 'veimvozx57q0', nome: 'FIAT LUX' }];
  assert.match(ricollegaVeicolo(due, 'veimuu14mqa0', 'veimvozx57q0', [FIAT_LUX], { master: true }).errore, /rimanda già/);
});

test('il Direttore può togliere un riferimento rotto senza ricollegarlo', () => {
  const e = togliRiferimentoRotto([PABLO, { uid: 'veimvozx57q0', rif: 'veimvozx57q0', nome: 'FIAT LUX' }], 'veimuu14mqa0', { master: true });
  assert.ok(!e.errore, e.errore);
  assert.deepEqual(e.veicoli.map((v) => v.rif), ['veimvozx57q0']);
  assert.match(e.riga, /veimuu14mqa0/);
});
