// Riserve Batteria o Cariche, proprietà Esclusive o Universali, una sola fonte esterna per pagamento
// (Magia §26.2, Armamenti §7.5 e §7.5.1; regole.json → chroma.riserve; src/fonti.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { normalizzaEquipaggiamento, infoArtefattoVoce, risolvi, catalogo } from '../src/equipaggiamento.js';
import { contenitoriLancio, attivazioneInfusa } from '../src/lancio.js';
import { validaPagamento, tipoRiserva, alimentazione, fontePerPg } from '../src/fonti.js';
import { spendiPmLancio, massimiSessione, inizializzaSessione } from '../src/sessione.js';
import { statoAttivazione, tecnicaDi } from '../src/tecniche.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const cura = dati.incantesimi.incantesimi.find((i) => i.nome === 'Cura Ferite');
const anello = (extra = {}) => ({
  uid: 'a', rif: null, stato: 'indossata', quantita: 1, note: '', sintonizzato: true,
  personalizzato: { nome: 'Anello di Rigenerazione', tipo: 'artefatto', potenza: 'Rara', energia: 'Verde', capacita_pm: 10, infuso: { incantesimo: 'Rigenerazione', livello: 9 }, ...extra },
});

test('dati: tipi di riserva, alimentazioni, predefiniti delle schede anteriori (Cariche, Esclusive), una fonte esterna', () => {
  const R = dati.regole.chroma.riserve;
  assert.deepEqual([R.tipi.batteria.fonte_per_pg, R.tipi.cariche.fonte_per_pg], [true, false]);
  assert.deepEqual(R.alimentazioni.esclusiva.fonti, ['interna']);
  assert.deepEqual([R.integrata_predefinita, R.proprieta_predefinita, R.fonti_esterne_per_pagamento], ['cariche', 'esclusiva', 1]);
  assert.deepEqual([tipoRiserva({ integrato: false }, dati), tipoRiserva({ integrato: true }, dati), alimentazione({ integrato: true }, dati)], ['batteria', 'cariche', 'esclusiva']);
});

test('pagamento con due fonti esterne rifiutato; una fonte esterna con PM personali ammessa', () => {
  const due = validaPagamento({ costo: 6, personali: 0, esterne: [{ uid: 'p', nome: 'Pietra', pm: 4 }, { uid: 'b', nome: 'Batteria Verde', pm: 2 }] }, dati);
  assert.equal(due.ok, false);
  assert.match(due.errori[0], /una sola fonte esterna.*Pietra e Batteria Verde/);
  // l'esempio della Pietra della Vigilanza (Magia §26.6.1): 4 PM dalla Pietra e 2 personali
  assert.deepEqual(validaPagamento({ costo: 6, personali: 2, esterne: [{ uid: 'p', pm: 4 }] }, dati), { ok: true, errori: [] });
  assert.match(validaPagamento({ costo: 6, personali: 1, esterne: [{ uid: 'p', pm: 4 }] }, dati).errori[0], /fanno 5 PM, il costo è 6/);
  // proprietà Esclusiva: solo la riserva interna
  assert.equal(validaPagamento({ costo: 3, esterne: [{ uid: 'g', pm: 3 }], interna: 'g', soloInterna: true }, dati).ok, true);
  assert.equal(validaPagamento({ costo: 3, personali: 1, esterne: [{ uid: 'g', pm: 2 }], interna: 'g', soloInterna: true }, dati).ok, false);
  // la sessione accetta un solo contenitore per spesa (spendiPmLancio)
  const s = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  const m = massimiSessione(s, MISHIMA_AGENTE, dati);
  assert.equal(spendiPmLancio(inizializzaSessione(m), { personali: 99 }, m), null);
});

test('riserva a Cariche di un’arma (§7.5.1): alimenta solo la sua attivazione, non «Lancia!» (A.18 resta valida)', () => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [voce('bo', 'armi_corporative:bordone-templare', 'impugnata', { sintonizzato: true })] };
  const s = calcolaScheda({ creazione, livelli: [] }, dati);
  const c = s.equipaggiamento.contenitori.find((x) => x.uid === 'bo');
  assert.deepEqual([c.integrato, c.riserva, c.alimentazione, c.fontePg], [true, 'cariche', 'esclusiva', false]);
  assert.deepEqual(contenitoriLancio({ scheda: s, sessione: {} }, cura), []);
  // l'attivazione resta quella dell'arma: +1d6 Magico dal Chroma integrato
  assert.equal(s.equipaggiamento.armi[0].attivazione.danno_extra, '1d6');
});

test('Artefatto con riserva Batteria integrata: è una fonte per «Lancia!»; con Cariche no', () => {
  const conBatteria = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [anello({ riserva: 'batteria', alimentazione: 'universale' })] }, livelli: [] }, dati);
  const c = conBatteria.equipaggiamento.contenitori.find((x) => x.uid === 'a');
  assert.deepEqual([c.riserva, c.alimentazione, fontePerPg(c, dati)], ['batteria', 'universale', true]);
  assert.deepEqual(contenitoriLancio({ scheda: conBatteria, sessione: {} }, cura).map((x) => x.uid), ['a']);
  const conCariche = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [anello()] }, livelli: [] }, dati);
  assert.deepEqual(contenitoriLancio({ scheda: conCariche, sessione: {} }, cura), []);
});

test('proprietà Universale: la riserva interna per quanto ha, il resto dai PM personali; Esclusiva: solo la riserva', () => {
  const [v] = normalizzaEquipaggiamento([anello({ riserva: 'cariche', alimentazione: 'universale' })]);
  assert.deepEqual([v.personalizzato.riserva, v.personalizzato.alimentazione], ['cariche', 'universale']);
  const info = infoArtefattoVoce(risolvi(v, catalogo(dati)), dati);
  const riserva = { energia: 'Verde', macrofamiglie: ['Spirituale'], alimentazione: 'universale' };
  const u = attivazioneInfusa(info.infuso, riserva, { pm: 6, personali: 5, sintonizzato: true, deposito: false }, dati);
  assert.deepEqual([u.motivo, u.pagamento], [null, { interna: 6, personali: 3 }]);
  assert.match(attivazioneInfusa(info.infuso, riserva, { pm: 6, personali: 2, sintonizzato: true, deposito: false }, dati).motivo, /6 dalla riserva e 3 personali, ne hai 2/);
  const e = attivazioneInfusa(info.infuso, { ...riserva, alimentazione: 'esclusiva' }, { pm: 6, personali: 20, sintonizzato: true, deposito: false }, dati);
  assert.match(e.motivo, /proprietà Esclusiva: solo la riserva interna/);
});

test('Tecniche Interiori: invariate, solo PM personali (Giocatore §8.9.1)', () => {
  const t = tecnicaDi('aura-di-resistenza', dati);
  const st = statoAttivazione({ tecniche: [{ id: t.id }], pm: 20 }, { pmAttuali: 3, round: 1, chroma: { b: { pmAttuali: 30 } } }, t, dati);
  assert.match(st.motivo, /solo i PM personali/);
});
