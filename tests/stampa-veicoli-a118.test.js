// Lotto 173, A.118 (Davide, 03/11/2026): «Un veicolo del gruppo, come FIAT LUX, ha una scheda condivisa. Nella stampa
// complessiva del gruppo compare una sola volta. Nella stampa del singolo PG, l’inclusione è facoltativa e viene
// preselezionata soltanto per il conducente. Stampare ulteriori copie non duplica il veicolo nell’inventario.»
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { preparaStampa, fogliDaStampare, veicoliFacoltativi, veicoliDelGruppoStampa, normalizzaOpzioniStampa } from '../src/stampa.js';
import { nuovoVeicolo } from '../src/veicoli.js';
import { nuovoRecord, riferimento } from '../src/veicoli-registro.js';

const { dati } = await datiReali();
const PABLO = { chiave: 'Pablo-Zaion', nome: 'PABLO ZAION' };
const DUNCAN = { chiave: 'DUNCAN-MCDUFF', nome: 'DUNCAN MCDUFF' };

const fiatLux = (() => {
  const r = nuovoRecord({ ...nuovoVeicolo('asa-scout-mk4', dati, { uid: 'veifiatlux1', nome: 'FIAT LUX' }) }, PABLO, { gruppo: true, guida: true });
  return r;
})();
const motoDiDuncan = nuovoRecord(nuovoVeicolo('autovettura-civile', dati, { uid: 'veimotodunc', nome: 'Auto di Duncan' }), DUNCAN, { gruppo: false });
const registro = [fiatLux, motoDiDuncan];

const stampaDi = (chi, veicoli = []) => preparaStampa({ creazione: { ...MISHIMA_AGENTE, nome: chi.nome, veicoli }, livelli: [] }, dati, { registroVeicoli: { record: registro, chi } });
const veicoliStampati = (st, opz = null, o = {}) => (fogliDaStampare(st.fogli, opz, o).find((f) => f.id === 'veicoli')?.dati.veicoli ?? []).map((v) => v.nome);

test('stampa del singolo PG: il veicolo del gruppo è facoltativo, preselezionato solo per il conducente', () => {
  // Pablo guida il FIAT LUX: preselezionato
  const pablo = stampaDi(PABLO, [riferimento(fiatLux)]);
  assert.deepEqual(veicoliFacoltativi(pablo.fogli), [{ id: 'veifiatlux1', nome: 'FIAT LUX', preselezionato: true, incluso: true }]);
  assert.deepEqual(veicoliStampati(pablo), ['FIAT LUX']);
  // e può toglierlo
  assert.deepEqual(veicoliStampati(pablo, { veicoli: { veifiatlux1: false } }), []);
  // Duncan non lo guida: c'è fra le spunte ma non è preselezionato; la sua auto si stampa sempre
  const duncan = stampaDi(DUNCAN, [riferimento(fiatLux), riferimento(motoDiDuncan)]);
  assert.deepEqual(veicoliFacoltativi(duncan.fogli).map((v) => [v.nome, v.preselezionato, v.incluso]), [['FIAT LUX', false, false]]);
  assert.deepEqual(veicoliStampati(duncan), ['Auto di Duncan']);
  assert.deepEqual(veicoliStampati(duncan, { veicoli: { veifiatlux1: true } }), ['FIAT LUX', 'Auto di Duncan']);
  // anche senza il riferimento nel file il veicolo del gruppo si può aggiungere, ma non è preselezionato
  const senza = stampaDi(DUNCAN, []);
  assert.deepEqual(veicoliFacoltativi(senza.fogli).map((v) => v.id), ['veifiatlux1']);
  assert.deepEqual(veicoliStampati(senza), ['Auto di Duncan'], 'l’auto di Duncan: la possiede, senza riferimento');
  // la spunta si salva con le preferenze di stampa (solo sì/no)
  assert.deepEqual(normalizzaOpzioniStampa({ veicoli: { veifiatlux1: true, x: 'sì' } }).veicoli, { veifiatlux1: true });
});

test('stampa del gruppo: il veicolo del gruppo una volta sola, anche se due PG lo hanno nel file e uno lo guida', () => {
  const fogliDeiPg = [stampaDi(PABLO, [riferimento(fiatLux)]), stampaDi(DUNCAN, [riferimento(fiatLux), riferimento(motoDiDuncan)])]
    .flatMap((st) => veicoliStampati(st, null, { senzaGruppo: true }));
  assert.deepEqual(fogliDeiPg, ['Auto di Duncan'], 'nei fogli dei PG nessun veicolo del gruppo, nemmeno per il conducente');
  // il foglio del gruppo: ogni record del gruppo una volta sola (anche se il registro letto lo ripete)
  const g = veicoliDelGruppoStampa([fiatLux, motoDiDuncan, fiatLux], dati);
  assert.deepEqual(g.fogli.map((f) => [f.id, f.titolo, f.dati.veicoli.map((v) => v.nome)]), [['veicoli', 'Veicoli del gruppo', ['FIAT LUX']]]);
  // in tutto: FIAT LUX compare una volta
  assert.equal([...fogliDeiPg, ...g.fogli[0].dati.veicoli.map((v) => v.nome)].filter((n) => n === 'FIAT LUX').length, 1);
  assert.equal(veicoliDelGruppoStampa([motoDiDuncan], dati), null, 'senza veicoli del gruppo nessun foglio');
});

test('stampare più copie non duplica il veicolo: né il file del PG né il registro cambiano', () => {
  const creazione = { ...MISHIMA_AGENTE, nome: PABLO.nome, veicoli: [riferimento(fiatLux)] };
  const prima = JSON.stringify({ creazione, registro });
  for (let i = 0; i < 3; i++) {
    preparaStampa({ creazione, livelli: [] }, dati, { registroVeicoli: { record: registro, chi: PABLO } });
    veicoliDelGruppoStampa(registro, dati);
  }
  assert.equal(JSON.stringify({ creazione, registro }), prima);
  assert.equal(creazione.veicoli.length, 1);
});
