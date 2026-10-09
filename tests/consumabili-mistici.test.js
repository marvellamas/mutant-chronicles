// Artefatti consumabili (Manuale della Magia §27, Doc dell'08/10/2026): tabella per Grado, campionario di pergamene,
// creazione (esempio del §27.2), acquisto, «Usa» che scala, esaurito, attivazione in combattimento, validatore.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { catalogo, contenitori, risolvi } from '../src/equipaggiamento.js';
import { validaDati } from '../src/validate.js';
import { costiCreazione, gradoVersione, consumabiliMistici, usaConsumabile, motivoNonUsabile, incantesimoDi, rigaGrado } from '../src/consumabili-mistici.js';
import { durataLancio, opzioniDurata } from '../src/durate-incantesimi.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const P = (id) => `artefatti:pergamena-di-${id}`;
const voce = (id, quantita = 1, stato = null, uid = 'p1') => ({ uid, rif: P(id), stato, quantita, note: '' });
const rigaCampionario = (id) => { const o = cat.perRif.get(P(id)); const c = o.artefatto.consumabile; return [c.grado, c.pm_sigillati, c.attivazione.testo, o.creazione_cr, o.costo, o.reperibilita]; };

test('§27.2: tabella per Grado e Grado della versione dal livello (§24.2)', () => {
  assert.deepEqual(['I', 'II', 'III', 'IV', 'V', 'VI'].map((g) => { const r = rigaGrado(g, dati); return [r.reagenti, r.creazione, r.vendita, r.reperibilita]; }),
    [[50, 75, 150, 'MR'], [100, 125, 250, 'MR'], [200, 225, 450, 'MR'], [400, 425, 850, 'LE'], [800, 825, 1650, 'LE'], [1600, 1625, 3250, 'LE']]);
  assert.deepEqual([1, 3, 4, 6, 8, 9, 11, 12, 15, 18].map((l) => gradoVersione(l, dati)), ['I', 'I', 'II', 'II', 'II', 'III', 'III', 'IV', 'V', 'VI']);
});

test('§27.3: le sei pergamene del campionario, con i numeri della tabella', () => {
  assert.deepEqual(rigaCampionario('cura-ferite-3'), ['I', 3, '1 AzP', 75, 150, 'MR']);
  assert.deepEqual(rigaCampionario('arma-mistica-3'), ['I', 3, '1 AzP', 75, 150, 'MR']);
  assert.deepEqual(rigaCampionario('armatura-mistica-3'), ['I', 3, '1 AzP', 75, 150, 'MR']);
  assert.deepEqual(rigaCampionario('individuare-6'), ['II', 6, '1 AzP', 125, 250, 'MR']);
  assert.deepEqual(rigaCampionario('esorcizzare-corruzione-6'), ['II', 6, '10 minuti', 125, 250, 'MR']);
  assert.deepEqual(rigaCampionario('rigenerazione-9'), ['III', 9, '3 ore continuative', 225, 450, 'MR']);
  // peso non dato dal manuale: vuoto, con la domanda (A.155)
  assert.equal(cat.perRif.get(P('cura-ferite-3')).peso, null);
  assert.match(cat.perRif.get(P('cura-ferite-3'))['TODO(Davide)'], /^A\.155/);
});

test('§27.2 creazione: l’esempio di Cura Ferite 3 (75 cr e 6 PM; Magistrale 50 cr e 5 PM)', () => {
  const c = costiCreazione({ grado: 'I', pmSigillati: 3 }, dati);
  assert.deepEqual([c.supporto, c.reagenti, c.creazione, c.ore, c.pmLavoro, c.pmSigillati, c.pmTotali, c.vendita], [25, 50, 75, 4, 3, 3, 6, 150]);
  const m = costiCreazione({ grado: 'I', pmSigillati: 3, magistrale: true }, dati);
  assert.deepEqual([m.reagenti, m.creazione, m.pmLavoro, m.pmSigillati, m.pmTotali], [25, 50, 2, 3, 5]);
  // Rigenerazione 9 (Grado III): 9 PM di lavoro + 9 sigillati; Magistrale 5 + 9, reagenti 100
  const r = costiCreazione({ grado: 'III', pmSigillati: 9, magistrale: true }, dati);
  assert.deepEqual([costiCreazione({ grado: 'III', pmSigillati: 9 }, dati).pmTotali, r.pmLavoro, r.reagenti, r.pmTotali], [18, 5, 100, 14]);
});

test('acquisto: scheda del catalogo Commerciale, SnT 0, fuori dalla sintonizzazione e dalle riserve di Chroma', () => {
  const r = risolvi(voce('cura-ferite-3', 2), cat);
  assert.deepEqual([r.tipo, r.def.catalogo, r.def.famiglia, r.def.costo], ['artefatto', 'Commerciale', 'Consumabili', 150]);
  const voci = [voce('cura-ferite-3', 2)];
  // i PM sigillati non sono una riserva del personaggio (§27.1, §27.4)
  assert.deepEqual(contenitori(voci, dati), []);
  const s = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: voci }, livelli: [] }, dati);
  assert.equal(s.equipaggiamento.sintonizzazione, null);
  assert.deepEqual(consumabiliMistici(voci, dati).map((x) => [x.nome, x.quantita, x.attivazione.inRound]), [['Pergamena di Cura Ferite 3', 2, true]]);
});

test('«Usa» scala un esemplare; l’ultimo esaurisce e toglie la voce', () => {
  const altro = { uid: 'x', rif: 'esplorazione:nastro-tecnico', stato: null, quantita: 1, note: '' };
  const r = usaConsumabile([voce('arma-mistica-3', 3), altro], 'p1', dati);
  assert.deepEqual([r.rimasti, r.esaurito, r.voci.find((v) => v.uid === 'p1').quantita, r.voci.length], [2, false, 2, 2]);
  const ultimo = usaConsumabile([voce('arma-mistica-3', 1), altro], 'p1', dati);
  assert.deepEqual([ultimo.rimasti, ultimo.esaurito, ultimo.voci.map((v) => v.uid)], [0, true, ['x']]);
  // esaurito: non c'è più niente da usare
  assert.equal(usaConsumabile(ultimo.voci, 'p1', dati), null);
  // un oggetto qualsiasi non è un consumabile mistico
  assert.equal(usaConsumabile([altro], 'x', dati), null);
  // nel deposito comune non si usa
  assert.equal(usaConsumabile([voce('arma-mistica-3', 2, 'deposito')], 'p1', dati), null);
});

test('in combattimento: 1 AzP sì; 10 minuti e 3 ore no («fuori dal combattimento»)', () => {
  const voci = [voce('cura-ferite-3', 1, null, 'a'), voce('esorcizzare-corruzione-6', 1, null, 'b'), voce('rigenerazione-9', 1, null, 'c')];
  const [cura, esorcizza, rigenera] = consumabiliMistici(voci, dati);
  assert.deepEqual([cura.attivazione.azp, cura.attivazione.inRound, motivoNonUsabile(cura, { inScontro: true })], [1, true, null]);
  assert.equal(motivoNonUsabile(esorcizza, { inScontro: true }), 'si usa fuori dal combattimento');
  assert.match(motivoNonUsabile(rigenera, { inScontro: true }), /3 ore continuative/);
  assert.equal(usaConsumabile(voci, 'b', dati, { inScontro: true }), null);
  assert.equal(usaConsumabile(voci, 'a', dati, { inScontro: true }).rimasti, 0);
  // fuori dallo scontro si usano tutte
  assert.equal(motivoNonUsabile(esorcizza), null);
});

test('effetti a durata: quelli dell’Incantesimo infuso (§27.1)', () => {
  const durata = (id, opz) => { const x = consumabiliMistici([voce(id)], dati)[0]; return durataLancio(incantesimoDi(x.consumabile, dati), x.consumabile.livello, opz); };
  assert.deepEqual([durata('arma-mistica-3').tipo, durata('arma-mistica-3').round, durata('arma-mistica-3').concentrazione], ['round', 5, false]);
  assert.deepEqual([durata('armatura-mistica-3').round], [5]);
  assert.equal(durata('cura-ferite-3').tipo, 'istantanea');
  // Individuare 6: durata fissa di 5 RND oppure Concentrazione fino a 10 minuti, a scelta
  assert.equal(opzioniDurata(incantesimoDi({ incantesimo: 'Individuare' }, dati)).concentrazioneAScelta, true);
  assert.deepEqual([durata('individuare-6').round, durata('individuare-6', { concentrazione: true }).testo, durata('individuare-6', { concentrazione: true }).concentrazione], [5, '10 minuti', true]);
});

test('validatore: tabella, Grado, PM sigillati, prezzo e SnT dei Consumabili', () => {
  assert.deepEqual(validaDati(dati), []);
  const errori = (modifica) => { const d = copia(dati); modifica(d.equipaggiamento.file.artefatti); return validaDati(d).map((e) => JSON.stringify(e)).join('\n'); };
  const idx = (a, id) => a.oggetti.findIndex((o) => o.id === `pergamena-di-${id}`);
  assert.match(errori((a) => { a.consumabili.gradi[1].vendita = 300; }), /gradi\[1\]\.vendita/);
  assert.match(errori((a) => { a.consumabili.gradi[2].livelli = [10, 11]; }), /livelli/);
  assert.match(errori((a) => { a.oggetti[idx(a, 'cura-ferite-3')].artefatto.consumabile.pm_sigillati = 4; }), /pm_sigillati/);
  assert.match(errori((a) => { a.oggetti[idx(a, 'cura-ferite-3')].artefatto.consumabile.livello = 6; }), /non è del Grado I/);
  assert.match(errori((a) => { a.oggetti[idx(a, 'rigenerazione-9')].costo = 400; }), /costo/);
  assert.match(errori((a) => { a.oggetti[idx(a, 'individuare-6')].artefatto.sintonizzazione = 2; }), /SnT 0/);
  assert.match(errori((a) => { a.oggetti[idx(a, 'individuare-6')].artefatto.consumabile.attivazione = { testo: '1 AzP' }; }), /attivazione/);
  assert.match(errori((a) => { a.oggetti[idx(a, 'arma-mistica-3')].artefatto.consumabile.incantesimo = 'Arma Mistiche'; }), /inesistente/);
});
