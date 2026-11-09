import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 185, parte B (A.226): nella tab Veicoli si leggeva ancora «ASA Scout MK4». L'esemplare dei PG si chiama
// FIAT LUX; lo Scout MK4 è il modello di riferimento, e nei dati il modello non cambia. Qui: la regola del nome,
// la vista che la scheda disegna, la stampa del PG e quella del gruppo, e il campo del nome che non scrive più il
// modello come se fosse il nome dell'esemplare.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nomiVeicolo, nuovoVeicolo, vistaVeicoloPersonaggio } from '../src/veicoli.js';
import { veicoliStampa, veicoliDelGruppoStampa } from '../src/stampa.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const SCOUT = dati.veicoli.profili.find((p) => p.id === 'asa-scout-mk4');

test('il profilo dello Scout dichiara il nome del suo esemplare, e il modello resta quello che è', () => {
  assert.equal(SCOUT.nome, 'ASA Scout MK4', 'il modello nei dati non cambia');
  assert.equal(SCOUT.nome_esemplare.nome, 'FIAT LUX');
  assert.equal(SCOUT.nome_esemplare.solo_gruppo, true);
  assert.equal(SCOUT.nome_esemplare.rif, 'A.226');
  assert.match(SCOUT.nome_esemplare.nota, /modello di riferimento/);
});

test('nomiVeicolo: il nome dell’esemplare in evidenza, il modello come riferimento', () => {
  // 1. un nome suo batte tutto
  const suo = nomiVeicolo({ nome: 'La Grigia', gruppo: true }, SCOUT);
  assert.deepEqual([suo.nome, suo.modello, suo.decisione], ['La Grigia', 'ASA Scout MK4', null]);
  // 2. il caso vero del FIAT LUX: il record porta il nome del modello, cioè nessun nome proprio
  const lux = nomiVeicolo({ nome: 'ASA Scout MK4', gruppo: true }, SCOUT);
  assert.deepEqual([lux.nome, lux.modello, lux.decisione], ['FIAT LUX', 'ASA Scout MK4', 'A.226']);
  // 2b. e anche senza nessun nome scritto
  assert.equal(nomiVeicolo({ gruppo: true }, SCOUT).nome, 'FIAT LUX');
  assert.equal(nomiVeicolo({ nome: '   ', gruppo: true }, SCOUT).nome, 'FIAT LUX');
  // 3. uno Scout che non è del gruppo non è il FIAT LUX: resta il modello, e non si ripete come riferimento
  const mio = nomiVeicolo({ gruppo: false }, SCOUT);
  assert.deepEqual([mio.nome, mio.modello, mio.decisione], ['ASA Scout MK4', null, null]);
  // un altro profilo non ha nomi decisi: il modello fa da nome
  const auto = dati.veicoli.profili.find((p) => p.id === 'autovettura-civile');
  assert.deepEqual([nomiVeicolo({ gruppo: true }, auto).nome, nomiVeicolo({ gruppo: true }, auto).modello], [auto.nome, null]);
  // senza profilo non si rompe
  assert.equal(nomiVeicolo({}, null).nome, 'Veicolo');
});

test('nomiVeicolo non scrive niente: il record resta com’è', () => {
  const m = Object.freeze({ nome: 'ASA Scout MK4', gruppo: true, uid: 'v1' });
  const n = nomiVeicolo(m, SCOUT);
  assert.equal(n.nome, 'FIAT LUX');
  assert.equal(m.nome, 'ASA Scout MK4', 'il nome nel record non cambia');
  assert.equal(n.proprio, null, 'nessun nome proprio: il nome viene dalla decisione');
});

test('la scheda mostra FIAT LUX con «Modello: ASA Scout MK4» accanto', () => {
  const mezzo = { ...nuovoVeicolo('asa-scout-mk4', dati, { uid: 'v1' }), gruppo: true };
  assert.equal(mezzo.nome, 'ASA Scout MK4', 'nasce con il nome del modello: è il caso del FIAT LUX');
  const v = vistaVeicoloPersonaggio(mezzo, dati, { pilotare: null });
  assert.equal(v.nome, 'FIAT LUX', 'il titolo della scheda');
  assert.equal(v.nomi.modello, 'ASA Scout MK4', 'il modello accanto, come riferimento');
  assert.equal(v.nomi.decisione, 'A.226');
  assert.equal(v.profilo.nome, 'ASA Scout MK4', 'il profilo non è stato toccato');
});

test('nella tab il campo del nome non scrive più il modello come nome dell’esemplare', () => {
  const ui = readFileSync(new URL('../src/ui/veicoli.js', import.meta.url), 'utf8');
  // prima: `nome: e.target.value.trim() || p.nome` — svuotando il campo si scriveva il modello nel record, e il
  // nome deciso non si sarebbe più visto
  assert.doesNotMatch(ui, /nome: e\.target\.value\.trim\(\) \|\| p\.nome/);
  assert.match(ui, /nome: e\.target\.value\.trim\(\)\s*\}/);
  // il modello si legge accanto al nome, nella scheda e nella vista in sola lettura dei tablet
  assert.equal((ui.match(/Modello: \$\{/g) ?? []).length, 2);
});

test('la stampa porta il nome dell’esemplare: foglio del PG e stampa del gruppo', () => {
  const mezzo = { ...nuovoVeicolo('asa-scout-mk4', dati, { uid: 'v1' }), gruppo: true, conducente: true };
  const s = { abilita: {}, veicoli: [] };
  const f = veicoliStampa(s, { veicoli: [mezzo] }, dati);
  assert.equal(f.veicoli[0].nome, 'FIAT LUX', 'il titolo del foglio è «Veicoli · FIAT LUX»');
  assert.equal(f.veicoli[0].profilo.nome, 'ASA Scout MK4', 'il riquadro «Profilo · …» porta il modello');
  const g = veicoliDelGruppoStampa([{ id: 'r1', revisione: 1, proprietario: { tipo: 'gruppo' }, conducente: null, mezzo }], dati);
  assert.equal(g.fogli[0].dati.veicoli[0].nome, 'FIAT LUX');
  assert.equal(g.fogli[0].dati.veicoli[0].profilo.nome, 'ASA Scout MK4');
});
