// Danno applicato (src/danno.js → applicaColpo), casi del Giocatore 0.45: §5.10 (AC e Difese), §5.13 (ordine,
// mai sotto 0), §5.14 (PV a 0, nuove Ferite per fascia ed esito della Tempra, Morte), §5.24 (natura del danno,
// Perforante e Laser, effetti delle proprietà). Nessun locativo (decisione 3 del piano).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applicaColpo, arApplicabile, nuoveFerite, testoColpo } from '../src/danno.js';
import { vistaPlancia } from '../src/tavolo.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const bersaglio = ({ pv = 20, massimo = 20, ferite = 0, totale = 5, magica = 0 } = {}) => ({ nome: 'Bersaglio', pv: { attuali: pv, massimo }, ferite, ar: { totale, magica } });
const colpo = (danni, extra = {}) => ({ danni, natura: 'Naturale', tipo: 'distanza', difesa: 'nessuna', proprieta: [], ...extra });

test('§5.13: l’AR che azzera il colpo, il danno finale mai sotto 0', () => {
  const r = applicaColpo(bersaglio({ totale: 5 }), colpo([4]), dati);
  assert.deepEqual([r.applicazioni[0].finale, r.pv.dopo, r.pvPersi], [0, 20, 0]);
  const p = applicaColpo(bersaglio({ totale: 5 }), colpo([9]), dati);
  assert.deepEqual([p.applicazioni[0].finale, p.pv.dopo], [4, 16]);
  assert.match(testoColpo('Rhea', colpo([9]), p), /Rhea colpito \(Naturale\): 9 − AR 5 = 4; PV 20 → 16\./);
});

test('§5.24: AR contro Etereo solo la componente magica (tabella dell’attacco da 7 danni)', () => {
  // «AR totale 6, di cui 1 magica»: Magico passa 1, Etereo passa 6
  const ar = { totale: 6, magica: 1 };
  const passa = (natura) => applicaColpo({ ...bersaglio(), ar }, colpo([7], { natura }), dati).applicazioni[0].finale;
  assert.deepEqual([passa('Naturale'), passa('Magico'), passa('Etereo')], [1, 1, 6]);
  // AR 5 interamente magica: Etereo 2
  assert.equal(applicaColpo({ ...bersaglio(), ar: { totale: 5, magica: 5 } }, colpo([7], { natura: 'Etereo' }), dati).applicazioni[0].finale, 2);
});

test('§5.24: Perforante sulla sola parte non magica, poi Laser dimezza per difetto (esempio di regole.json)', () => {
  const ar = { totale: 7, magica: 2 };
  const a = arApplicabile(ar, colpo([10], { proprieta: ['Perforante 2', 'Laser'] }), dati);
  assert.equal(a.valore, 2);
  assert.deepEqual(a.provenienza.righe.map((x) => x.valore), [7, -2, -3]);
  // contro Etereo Perforante non si applica
  assert.equal(arApplicabile(ar, colpo([10], { natura: 'Etereo', proprieta: ['Perforante 2'] }), dati).valore, 2);
  // Laser applica anche Plasma, solo se almeno 1 danno passa
  const r = applicaColpo({ ...bersaglio(), ar }, colpo([10], { proprieta: ['Laser'] }), dati);
  assert.ok(r.stati.some((s) => s.nome === 'Plasma'));
  assert.deepEqual(applicaColpo({ ...bersaglio(), ar: { totale: 20, magica: 0 } }, colpo([10], { proprieta: ['Laser'] }), dati).stati, []);
});

test('§5.10: più applicazioni (AC) separate; Parata dimezza per eccesso ogni applicazione, Schivata le evita', () => {
  // PV 7, AR 3, AC 3 da 8: 5 → PV 2; 5 → PV 0 (l'eccesso non fa Ferite); la terza a 0 PV chiede la Tempra
  const r = applicaColpo(bersaglio({ pv: 7, totale: 3 }), colpo([8, 8, 8]), dati);
  assert.deepEqual(r.applicazioni.map((a) => [a.finale, a.pvDopo]), [[5, 2], [5, 0], [5, 0]]);
  assert.deepEqual([r.pv.dopo, r.tempraMancanti], [0, [2]]);
  assert.equal(r.applicazioni[2].tempra.fascia, '1–5');
  const conEsito = applicaColpo(bersaglio({ pv: 7, totale: 3 }), colpo([8, 8, 8], { tempra: [null, null, 'fallimento'] }), dati);
  assert.deepEqual([conEsito.ferite.dopo, conEsito.ferite.nome, conEsito.tempraMancanti], [1, 'Superficiale', []]);
  // Parata: 9 → 5 per applicazione, prima dell'AR
  const parata = applicaColpo(bersaglio({ totale: 2 }), colpo([9, 9], { difesa: 'parata' }), dati);
  assert.deepEqual(parata.applicazioni.map((a) => [a.dopoDifesa, a.finale]), [[5, 3], [5, 3]]);
  assert.equal(applicaColpo(bersaglio(), colpo([30, 30], { difesa: 'schivata' }), dati).pvPersi, 0);
  assert.equal(applicaColpo(bersaglio(), colpo([30], { difesa: 'parata_magistrale' }), dati).pvPersi, 0);
});

test('§5.14: soglie delle nuove Ferite per fascia ed esito; oltre Grave la Morte; Menomazioni', () => {
  assert.deepEqual(['successo_magistrale', 'successo', 'fallimento', 'fallimento_maldestro'].map((e) => nuoveFerite(12, e, dati).ferite), [0, 2, 3, 4]);
  assert.deepEqual([nuoveFerite(5, 'fallimento', dati).fascia, nuoveFerite(6, 'fallimento', dati).fascia, nuoveFerite(26, 'fallimento', dati).fascia], ['1–5', '6–10', '26+']);
  assert.equal(nuoveFerite(40, 'successo', dati).ferite, 5);
  // a 0 PV con 2 Ferite: 12 danni finali e Tempra fallita → +3 = 5 (Grave), con il promemoria delle Menomazioni
  const r = applicaColpo(bersaglio({ pv: 0, ferite: 2, totale: 0 }), colpo([12], { tempra: ['fallimento'] }), dati);
  assert.deepEqual([r.ferite.dopo, r.ferite.nome, r.morte], [5, 'Grave', false]);
  assert.ok(r.promemoria.some((p) => /Profonda: PS di Tempra per la Menomazione/.test(p)));
  // le Menomazioni raggiunte per la prima volta, anche come dato (i nemici le registrano: A.73, decisione 7)
  assert.deepEqual(r.menomazioni.map((x) => x.stato), ['Profonda', 'Seria', 'Grave']);
  // 26+ con fallimento: 6 Ferite, oltre Grave → Morte
  const m = applicaColpo(bersaglio({ pv: 0, ferite: 0, totale: 0 }), colpo([30], { tempra: ['fallimento'] }), dati);
  assert.deepEqual([m.ferite.dopo, m.ferite.nome, m.morte], [6, 'Morte', true]);
  // senza grado di Ferite (null): a 0 PV solo il promemoria, nessuna PS di Tempra
  const n = applicaColpo({ ...bersaglio({ pv: 0 }), ferite: null }, colpo([10]), dati);
  assert.deepEqual([n.ferite, n.tempraMancanti, n.menomazioni], [null, [], []]);
  assert.match(n.promemoria[0], /Ferite non registrate/);
});

test('bersaglio PG dalla scheda: AR della vista della plancia (valori con la provenienza), Sanguinante come Stato', () => {
  const testo = readFileSync(new URL('../esempi/Torvald-Krane_liv6_2026-10-02.json', import.meta.url), 'utf8');
  const v = vistaPlancia(testo, dati, 'Torvald-Krane_liv6_2026-10-02.json');
  const b = { nome: v.nome, pv: v.pv, ferite: v.ferite.grado, ar: v.ar };
  const r = applicaColpo(b, colpo([12], { tipo: 'ravvicinato', proprieta: ['Sanguinante 1'] }), dati);
  assert.equal(r.applicazioni[0].ar.valore, v.ar.totale);
  assert.equal(r.pv.dopo, v.pv.attuali - (12 - v.ar.totale));
  assert.deepEqual(r.stati.map((s) => [s.id, s.automatico]), [['sanguinamento', true]]);
});
