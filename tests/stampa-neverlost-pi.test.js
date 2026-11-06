import '../tools/guardia-subito.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { scalaPiVeicolo, veicoliStampa } from '../src/stampa.js';
import { nuovoVeicolo } from '../src/veicoli.js';

// Lotto 177 (06/11/2026): la pagina di stampa della Neverlost non entrava nel foglio. Le sue strutture hanno
// 300 + 180 + 120 PI: con una casella per PI servivano 600 quadratini e la colonna centrale era alta 1.020 px
// contro i 653 del foglio. Ora una casella vale più PI, ma solo quando servirebbero troppe caselle.
const { dati } = await datiReali();
const S = dati.veicoli.strutture.stampa;

test('la scala vale solo dove serve: la Neverlost la usa, lo Scout e l’Autovettura no', () => {
  assert.equal(scalaPiVeicolo([60, 36, 24], dati).perCasella, 1, 'Scout MK4: una casella per PI, come prima');
  assert.equal(scalaPiVeicolo([30, 18, 12], dati).perCasella, 1, 'Autovettura');
  assert.equal(scalaPiVeicolo([300, 180, 120], dati).perCasella, 5, 'Neverlost');
});

test('con la scala le caselle stanno nel limite, e sono quelle di un mezzo che già entrava', () => {
  const nave = [300, 180, 120];
  const s = scalaPiVeicolo(nave, dati);
  const caselle = nave.reduce((n, m) => n + s.caselle(m), 0);
  assert.ok(caselle <= S.caselle_massime_totali, `${caselle} caselle`);
  // lo Scout entra nel foglio: la nave non ne chiede di più
  assert.equal(caselle, [60, 36, 24].reduce((n, m) => n + scalaPiVeicolo([60, 36, 24], dati).caselle(m), 0));
  assert.deepEqual(nave.map((m) => s.caselle(m)), [60, 36, 24]);
});

test('il passo è lo stesso per tutte le strutture del mezzo ed è il più piccolo che basta', () => {
  const s = scalaPiVeicolo([300, 180, 120], dati);
  assert.ok(S.passi.includes(s.perCasella));
  const minore = S.passi[S.passi.indexOf(s.perCasella) - 1];
  const caselleCon = (p) => [300, 180, 120].reduce((n, m) => n + Math.ceil(m / p), 0);
  assert.ok(caselleCon(minore) > S.caselle_massime_totali, 'un passo più piccolo non basterebbe');
});

test('una casella si annerisce solo quando il blocco di PI è perso per intero', () => {
  const s = scalaPiVeicolo([300, 180, 120], dati);
  assert.equal(s.pieni(0), 0);
  assert.equal(s.pieni(4), 0, '4 PI persi su 5 non anneriscono la casella');
  assert.equal(s.pieni(5), 1);
  assert.equal(s.pieni(37), 7);
  assert.equal(s.pieni(300), 60, 'distrutta: tutte piene');
});

test('la scala arriva alla stampa dentro ogni veicolo, struttura per struttura', () => {
  const scheda = { abilita: {}, equipaggiamento: {} };
  const veicoli = [nuovoVeicolo('neverlost', dati, { nome: 'Neverlost' }), nuovoVeicolo('asa-scout-mk4', dati, { nome: 'Scout' })];
  const fogli = veicoliStampa(scheda, { veicoli }, dati);
  const [nave, scout] = fogli.veicoli;
  assert.equal(nave.scalaPi.perCasella, 5);
  assert.equal(scout.scalaPi.perCasella, 1);
  assert.deepEqual(nave.scalaPi.strutture.corpo, { caselle: 60, pieni: 0 });
  assert.deepEqual(scout.scalaPi.strutture.corpo, { caselle: 60, pieni: 0 });
  // una nave colpita: le caselle piene seguono i PI persi
  const colpita = { ...veicoli[0], pi: { ...veicoli[0].pi, corpo: 227 } };
  const f2 = veicoliStampa(scheda, { veicoli: [colpita] }, dati).veicoli[0];
  assert.deepEqual(f2.scalaPi.strutture.corpo, { caselle: 60, pieni: Math.floor((300 - 227) / 5) });
});

test('senza il blocco nei dati niente cambia: una casella per PI', () => {
  const senza = { veicoli: { ...dati.veicoli, strutture: { ...dati.veicoli.strutture, stampa: undefined } } };
  const s = scalaPiVeicolo([300, 180, 120], senza);
  assert.equal(s.perCasella, 1);
  assert.equal(s.caselle(300), 300);
});
