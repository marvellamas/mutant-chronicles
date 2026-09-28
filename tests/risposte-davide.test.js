// Risposte di Davide del 28/09/2026 (Doc «per-davide.md», sezione 7): A.7–A.12, A.14, A.21.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { prossimoLivello } from '../src/character.js';
import { catalogo, contenitori } from '../src/equipaggiamento.js';
import { testoTooltip } from '../src/descrizioni.js';
import { inizializzaSessione, massimiSessione, commutaCondizioneOggetto } from '../src/sessione.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE, LIVELLI_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const def = (rif) => catalogo(dati).perRif.get(rif);
/** Agente al 3° livello con la Specializzazione scelta come Talento Libero, e l'equipaggiamento dato. */
const conSpec = (spec, equipaggiamento) => calcolaScheda({
  creazione: { ...MISHIMA_AGENTE, equipaggiamento },
  livelli: [LIVELLI_AGENTE[0], { livello: 3, talentoLibero: { id: spec } }],
}, dati);
const arma = (s, uid) => s.equipaggiamento.armi.find((a) => a.uid === uid);

// --- A.7, A.9, A.11, A.12: famiglie e Specializzazioni -------------------------------------

test('A.9: Armi a Sega è una Specializzazione selezionabile e dà +1 VA e +1 danno al Chainreaper', () => {
  const p = prossimoLivello({ creazione: MISHIMA_AGENTE, livelli: [LIVELLI_AGENTE[0]] }, dati);
  const t = p.talentiLiberi.find((x) => x.id === 'specializzazione-armi-a-sega');
  assert.deepEqual([t.nome, t.ammesso], ['Specializzazione in Armi a Sega', true]);
  const senza = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [voce('c', 'armi_corporative:chainreaper', 'impugnata')] }, livelli: [LIVELLI_AGENTE[0]] }, dati);
  const con = conSpec('specializzazione-armi-a-sega', [voce('c', 'armi_corporative:chainreaper', 'impugnata')]);
  assert.equal(arma(con, 'c').va - arma(senza, 'c').va, 1);
  assert.equal(arma(con, 'c').bonusDanno, 1);
  assert.equal(arma(con, 'c').specializzazione, 'Specializzazione in Armi a Sega');
  assert.equal(def('armi_corporative:chainreaper').abilita, 'Armi da guerra'); // la famiglia non cambia l'Abilità
});

test('A.11: Panzerknacker nei Fucili d’Assalto; i moduli integrati tengono la propria Specializzazione', () => {
  assert.equal(def('armi_distanza_corporative:panzerknacker').specializzazione, 'specializzazione-fucili-d-assalto');
  assert.equal(def('armi_distanza_corporative:lanciagranate-panzerknacker').specializzazione, 'specializzazione-lanciagranate');
  assert.equal(def('armi_distanza_corporative:lanciagranate-volcano').specializzazione, 'specializzazione-lanciagranate');
  assert.equal(def('armi_distanza_corporative:lanciafiamme-eruptor').specializzazione, 'specializzazione-lanciafiamme');
  for (const [id, sp] of [['eruptor', 'fucili-di-precisione'], ['justifier', 'mitragliatori'], ['windrider-n4', 'carabine'], ['volcano', 'fucili-d-assalto']]) {
    assert.equal(def(`armi_distanza_corporative:${id}`).specializzazione, `specializzazione-${sp}`, id);
  }
});

test('A.7 e A.12: Pistola mitragliatrice compatta e pistole corporative in Pistole; Hellblazer in Armi al Plasma con Armi leggere', () => {
  assert.equal(def('armi_distanza:pistola-mitragliatrice-compatta').specializzazione, 'specializzazione-pistole');
  assert.equal(def('armi_distanza_corporative:mp105').specializzazione, 'specializzazione-pistole');
  assert.equal(def('armi_distanza_corporative:mp105gw').specializzazione, 'specializzazione-carabine');
  assert.equal(def('armi_distanza_corporative:nemesis-21').specializzazione, 'specializzazione-carabine');
  assert.equal(def('armi_distanza_corporative:nimrod-autocannon').specializzazione, 'specializzazione-mitragliatori');
  assert.deepEqual([def('armi_distanza_corporative:hellblazer').specializzazione, def('armi_distanza_corporative:hellblazer').abilita], ['specializzazione-armi-al-plasma', 'Armi leggere']);
});

test('A.12: SA30 a dardi, Specializzazione Pistole con +1 VA ma nessun +1 danno (Danno calibrato)', () => {
  const senza = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [voce('s', 'armi_distanza_corporative:sa30-a-dardi', 'impugnata'), voce('p', 'armi_distanza:pistola-semiautomatica', 'impugnata')] }, livelli: [LIVELLI_AGENTE[0]] }, dati);
  const con = conSpec('specializzazione-pistole', [voce('s', 'armi_distanza_corporative:sa30-a-dardi', 'impugnata'), voce('p', 'armi_distanza:pistola-semiautomatica', 'impugnata')]);
  assert.equal(arma(con, 's').va - arma(senza, 's').va, 1);
  assert.equal(arma(con, 's').bonusDanno, 0);
  assert.equal(arma(con, 'p').bonusDanno, 1); // le altre pistole hanno il +1 danno
});

test('A.8: Pugnale in mischia con Coltelli e Pugnali, lanciato con Armi da Lancio, mai cumulate', () => {
  const equip = [voce('m', 'armi:pugnale', 'impugnata'), voce('l', 'armi_distanza:pugnale', 'impugnata')];
  const mischia = conSpec('specializzazione-coltelli-e-pugnali', equip);
  assert.equal(arma(mischia, 'm').specializzazione, 'Specializzazione in Coltelli e Pugnali');
  assert.equal(arma(mischia, 'l').specializzazione, null);
  const lancio = conSpec('specializzazione-armi-da-lancio', equip);
  assert.equal(arma(lancio, 'm').specializzazione, null);
  assert.equal(arma(lancio, 'l').specializzazione, 'Specializzazione in Armi da Lancio');
  assert.equal(arma(lancio, 'l').bonusDanno, 1);
  // Ascia leggera: Asce in mischia, Armi da Lancio al lancio
  assert.equal(def('armi:ascia-leggera').specializzazione, 'specializzazione-asce');
  assert.equal(def('armi_distanza:ascia-leggera').specializzazione, 'specializzazione-armi-da-lancio');
});

test('controllo finale: ogni arma del catalogo ha una Specializzazione, salvo la Rainy Dayer (A.13, aperta)', () => {
  const senza = catalogo(dati).oggetti.filter((o) => (o.tipo === 'arma_ravvicinata' || o.tipo === 'arma_distanza') && !o.specializzazione).map((o) => o.nome);
  assert.deepEqual(senza, ['Rainy Dayer']);
});

// --- A.10: Scudo delle Guardie Sacre ------------------------------------------------------

test('A.10: Scudo delle Guardie Sacre, lama ritratta 1d6+1 e lama estratta 1d6+1+1d4 al tavolo, indipendente da Scudo Magico', () => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [voce('g', 'scudi:scudo-delle-guardie-sacre', 'imbracciato')] };
  const aRiposo = calcolaScheda({ creazione, livelli: [] }, dati);
  const att = aRiposo.equipaggiamento.armi.find((a) => a.uid === 'g:attacco');
  assert.deepEqual([att.nome, att.danno.una_mano, att.statoAlternativo.costo], ['Scudo delle Guardie Sacre (attacco, lama ritratta)', '1d6+1', '1 Azione Principale']);
  const m = massimiSessione(aRiposo, creazione, dati);
  assert.ok(m.oggettiSituazionali.includes('g:lama'));
  let s = commutaCondizioneOggetto(inizializzaSessione(m), 'g:lama', m);
  const tavolo = calcolaScheda({ creazione, livelli: [], sessione: s }, dati);
  const conLama = tavolo.equipaggiamento.armi.find((a) => a.uid === 'g:attacco');
  assert.deepEqual([conLama.nome, conLama.danno.una_mano], ['Scudo delle Guardie Sacre (attacco, lama estratta)', '1d6+1d4+1']);
  // la lama non attiva Scudo Magico: l'AR resta quella a riposo
  assert.equal(tavolo.equipaggiamento.arEffettiva.totale, aRiposo.equipaggiamento.protezioni[0].ar.totale);
  s = commutaCondizioneOggetto(s, 'g', m); // Scudo Magico acceso, lama sempre estratta
  const entrambi = calcolaScheda({ creazione, livelli: [], sessione: s }, dati);
  assert.equal(entrambi.equipaggiamento.arEffettiva.totale, 4);
  assert.equal(entrambi.equipaggiamento.armi.find((a) => a.uid === 'g:attacco').danno.una_mano, '1d6+1d4+1');
});

// --- A.14: batterie da 5 PM e disponibilità degli Artefatti Mistici -------------------------

test('A.14: batterie da 5 PM con i valori approvati, cariche all’acquisto; scala di reperibilità fino a Leggendaria', () => {
  for (const [c, rep, costo, pot, sint] of [['rosso', 'MR', 10000, 'Comune', 1], ['blu', 'MR', 10000, 'Comune', 1], ['verde', 'MR', 10000, 'Comune', 1], ['bianco', 'LE', 50000, 'Non Comune', 2]]) {
    const b = def(`artefatti:batteria-da-5-pm-chroma-${c}`);
    assert.deepEqual([b.reperibilita, b.costo, b.qualita, b.ps_int, b.pi, b.peso, b.artefatto.contenitore.capacita_pm], [rep, costo, 'Comune', 10, 3, 0.2, 5], c);
    assert.deepEqual([b.artefatto.potenza, b.artefatto.sintonizzazione], [pot, sint], c); // invariati (§7.10)
  }
  assert.deepEqual(Object.values(dati.equipaggiamento.indice.reperibilita).map((r) => r.nome), ['Comune', 'Non comune', 'Rara', 'Molto rara', 'Leggendaria']);
  assert.match(dati.equipaggiamento.indice._nota_reperibilita, /non un listino/);
  // cariche all'acquisto (A.19): il contenitore nuovo è pieno
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [voce('b', 'artefatti:batteria-da-5-pm-chroma-verde', 'trasportato')] };
  const s = calcolaScheda({ creazione, livelli: [] }, dati);
  const m = massimiSessione(s, creazione, dati);
  assert.equal(m.contenitoreNuovo, 'pieno');
  assert.deepEqual(inizializzaSessione(m).chroma.b, { pmAttuali: 5 });
  assert.equal(contenitori(creazione.equipaggiamento, dati)[0].capacita, 5);
});

test('A.14: la disponibilità degli Artefatti Mistici compare nel tooltip degli Artefatti', () => {
  const t = JSON.stringify(testoTooltip('oggetto', 'artefatti:batteria-da-5-pm-chroma-rosso', dati));
  assert.match(t, /La Fratellanza è l’unica a produrne in quantità/);
  assert.match(t, /Molto rara/);
  assert.doesNotMatch(JSON.stringify(testoTooltip('oggetto', 'armi:pugnale', dati)), /Artefatti Mistici/);
});
