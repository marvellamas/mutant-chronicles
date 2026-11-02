// A.220 (Davide, 02/11/2026; Giocatore 0.54 §5.14 del 02/11): le Ferite abbassano l'Iniziativa di PG, PNG e creature con la
// penalità dello Stato di Ferita raggiunto, senza sommare quelle degli stati precedenti. Per i nemici il minimo 0 vale sul
// bonus base, prima della penalità (A.200), e il totale può essere negativo. La penalità deve entrare UNA volta sola.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { inizializzaSessione, massimiSessione, modificaSessione } from '../src/sessione.js';
import { baseIniziativaNemico } from '../src/iniziativa-creature.js';
import { vistaPlancia } from '../src/tavolo.js';
import { serializza } from '../src/character.js';
import { nemicoDaPg } from '../src/nemico-da-pg.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const creazione = copia(MISHIMA_AGENTE);
const riposo = calcolaScheda({ creazione, livelli: [] }, dati);
const m = massimiSessione(riposo, creazione, dati);
const indice = (nome) => dati.regole.ferite.stati.findIndex((s) => s.nome === nome) + 1;
const conFerite = (n) => {
  const sessione = modificaSessione(inizializzaSessione(m), { ferite: n }, m);
  return { s: calcolaScheda({ creazione, livelli: [], sessione }, dati), sessione };
};
const ini = (s) => s.tavolo.iniziativa;

test('A.220: Ferita Profonda −4 all’Iniziativa del PG, con la riga nella provenienza, una volta sola', () => {
  assert.equal(riposo.iniziativa, 2); // Mishima Avventuriero Agente: Iniziativa +2 (§2.14)
  const { s } = conFerite(indice('Profonda'));
  assert.equal(ini(s).effettivo, -2, 'bonus +2 con Ferita Profonda: 1d10 −2');
  assert.equal(ini(s).daRegole, 2, 'il valore da regole (stampa, riposo) non cambia');
  const righe = ini(s).scomposizione.filter((v) => v.fonte === 'ferite');
  assert.equal(righe.length, 1, 'una sola voce delle Ferite');
  assert.deepEqual([righe[0].etichetta, righe[0].valore], ['Ferita Profonda', -4]);
  assert.ok(ini(s).provenienza.righe.some((r) => r.fonte === 'Ferita Profonda' && r.valore === -4));
  // VA e Prove Salvezza come prima
  assert.equal(s.salvezze.tempra.effettivo, riposo.salvezze.tempra.effettivo - 4);
});

test('A.220: si usa lo stato raggiunto, non la somma; oltre Grave come Grave; senza Ferite nulla', () => {
  for (const [nome, pen] of [['Superficiale', -1], ['Importante', -2], ['Seria', -6], ['Grave', -8]]) {
    assert.equal(ini(conFerite(indice(nome)).s).effettivo, 2 + pen, nome);
  }
  assert.equal(ini(conFerite(dati.regole.ferite.stati.length + 1).s).effettivo, 2 - 8, 'Morente: malus di Grave');
  assert.equal(ini(conFerite(0).s).effettivo, 2);
});

test('A.220: la plancia prende per lo scontro l’Iniziativa con la Ferita, senza aggiungerla di nuovo', () => {
  const { sessione } = conFerite(indice('Profonda'));
  const testo = serializza(creazione, { livelli: [], sessione, pg: 'pg-prova-a220' });
  const v = vistaPlancia(testo, dati, 'Prova_liv1_2026-11-02.json');
  assert.equal(v.iniziativa.valore, -2);
});

test('A.220 con A.200: nemico con bonus +2 e Ferita Profonda tira 1d10 −2; bonus negativo portato a 0 prima della penalità', () => {
  const p = { tipo: 'nemico', scheda: { iniziativa: 2 }, ferite: indice('Profonda'), stati: [] };
  const b = baseIniziativaNemico(p, dati);
  assert.equal(b.base, -2);
  assert.equal(b.modifica.voci.length, 1, 'la Ferita entra una volta sola');
  const basso = baseIniziativaNemico({ ...p, scheda: { iniziativa: -3 } }, dati);
  assert.deepEqual([basso.minimo, basso.base], [0, -4]);
});

test('A.220: «PG → nemico» parte da una sessione senza Ferite (nessun doppio conteggio quando il nemico viene ferito)', () => {
  const { sessione } = conFerite(indice('Profonda'));
  const r = nemicoDaPg(serializza(creazione, { livelli: [], sessione, pg: 'pg-prova-a220' }), dati);
  if (r.errore) assert.fail(r.errore);
  assert.equal((r.nemico ?? r).iniziativa, 2);
});
