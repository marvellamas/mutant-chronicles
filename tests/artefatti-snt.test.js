// Lotto 2 del 02/10 (docs/diff-manuali-2026-10-02.md): SnT 0 per gli Artefatti con sole proprietà passive
// (Armamenti §7.10, Magia §24.2) e risposta A.18 (Magia §24.2, §24.7): la riserva integrata alimenta
// soltanto le funzioni del proprio Artefatto, non paga Incantesimi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { normalizzaEquipaggiamento } from '../src/equipaggiamento.js';
import { contenitoriLancio } from '../src/lancio.js';
import { preparaStampa } from '../src/stampa.js';
import { validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const personalizzato = (uid, p, extra = {}) => ({ uid, rif: null, stato: 'trasportato', quantita: 1, note: '', personalizzato: { tipo: 'artefatto', ...p }, ...extra });
const scheda = (equipaggiamento) => calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento }, livelli: [] }, dati);

test('Artefatto personalizzato con sole proprietà passive: SnT 0, niente sintonizzazione né capacità occupata', () => {
  const eq = scheda([
    personalizzato('a', { nome: 'Amuleto della Fede', potenza: 'Rara', solo_passive: true }, { sintonizzato: true }),
    personalizzato('b', { nome: 'Bracciale attivo', potenza: 'Rara' }, { sintonizzato: true }),
  ]).equipaggiamento;
  const per = Object.fromEntries(eq.sintonizzazione.artefatti.map((x) => [x.uid, x]));
  assert.deepEqual([per.a.costo, per.a.sintonizzabile, per.a.sintonizzato], [0, false, false]);
  assert.deepEqual([per.b.costo, per.b.sintonizzabile, per.b.sintonizzato], [3, true, true]);
  assert.equal(eq.sintonizzazione.usata, 3);
  // la scelta si conserva nel file
  assert.equal(normalizzaEquipaggiamento([personalizzato('a', { nome: 'Amuleto', potenza: 'Rara', solo_passive: true })])[0].personalizzato.solo_passive, true);
});

test('validatore: proprieta_attive voce per voce; con sole passive SnT 0, non sintonizzabile, senza riserva', () => {
  const e = (modifica) => { const d = copia(dati); modifica(d); return validaDati(d).map((x) => `${x.chiave}: ${x.problema}`).join('\n'); };
  const f = (d) => d.equipaggiamento.file.artefatti;
  assert.match(e((d) => { delete f(d).artefatti_catalogo[0].proprieta_attive; }), /artefatti_catalogo\[0\]\.proprieta_attive: true o false/);
  const passiva = e((d) => { Object.assign(f(d).artefatti_catalogo[0], { proprieta_attive: false }); });
  assert.match(passiva, /artefatti_catalogo\[0\]\.sintonizzabile: con sole proprietà passive deve valere false/);
  assert.match(passiva, /artefatti_catalogo\[0\]\.sintonizzazione: con sole proprietà passive la SnT è 0/);
  assert.match(passiva, /artefatti_catalogo\[0\]\.contenitore: una riserva serve a proprietà attive/);
  const giusta = e((d) => { const a = f(d).artefatti_catalogo[0]; Object.assign(a, { proprieta_attive: false, sintonizzabile: false, sintonizzazione: 0 }); delete a.contenitore; });
  assert.doesNotMatch(giusta, /artefatti_catalogo\[0\]/);
});

test('A.18: «Lancia!» non offre la riserva integrata come fonte di PM; le batterie a sé sì', () => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [
    voce('v', 'armi_corporative:spada-vindicator', 'pronta', { sintonizzato: true }),
    voce('r', 'artefatti:batteria-da-5-pm-chroma-rosso', 'trasportato', { sintonizzato: true }),
  ] };
  const s = calcolaScheda({ creazione, livelli: [] }, dati);
  // la scheda conosce ancora la riserva integrata (la tab Artefatti la mostra e la segna)
  assert.ok(s.equipaggiamento.contenitori.some((c) => c.uid === 'v' && c.integrato));
  const fisico = dati.incantesimi.incantesimi.find((i) => i.macrofamiglia === 'Fisica');
  const c = contenitoriLancio({ scheda: s, sessione: {} }, fisico);
  assert.deepEqual(c.map((x) => x.uid), ['r']);
});

test('SS, foglio 6: con sole proprietà passive niente casella «Sintonizzato»', () => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [personalizzato('a', { nome: 'Amuleto della Fede', potenza: 'Rara', solo_passive: true })] };
  const d = preparaStampa({ creazione, livelli: [] }, dati);
  assert.match(JSON.stringify(d.fogli), /"sintonizzabile":false/);
});
