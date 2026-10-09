// Scheda stampata (Magia §27.4): i Consumabili nel foglio Inventario con Incantesimo, versione, attivazione ed esemplari.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { inventarioStampa } from '../src/stampa.js';
import { pianoCreazione } from '../src/consumabili-mistici.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const scheda = { abilita: [], talentiLiberi: [{ id: 'ritualista-minore' }], incantesimi: { conosciuti: [], livelloMassimo: 8 } };
const piano = (scelta) => pianoCreazione({ progetto: { disponibile: true }, ...scelta }, { scheda }, dati);

test('stampa: il foglio Inventario elenca i consumabili con Incantesimo, versione, attivazione ed esemplari', () => {
  const voci = [{ uid: 'p', rif: 'artefatti:pergamena-di-cura-ferite-3', stato: null, quantita: 2, note: '' },
    { ...piano({ incantesimo: 'Esorcizzare Corruzione', livello: 6, conosciutaDaAltri: true }).voce, uid: 'c' }];
  const s = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: voci }, livelli: [] }, dati);
  assert.deepEqual(inventarioStampa(s, dati).consumabili.map((x) => [x.nome, x.incantesimo, x.grado, x.pm, x.attivazione, x.esemplari, x.creato]), [
    ['Pergamena di Cura Ferite 3', 'Cura Ferite 3', 'I', 3, '1 AzP', 2, false],
    ['Pergamena di Esorcizzare Corruzione 6', 'Esorcizzare Corruzione 6', 'II', 6, '10 minuti', 1, true],
  ]);
});

test('stampa: senza Consumabili il riquadro non c’è', () => {
  const s = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [] }, livelli: [] }, dati);
  assert.deepEqual(inventarioStampa(s, dati).consumabili, []);
});
