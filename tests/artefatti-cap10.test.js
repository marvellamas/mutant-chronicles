// Lotto 4 della ricognizione del 02/10 sera: capitolo 10 dell'Equipaggiamento e §26 della Magia
// (tools/lotti/lotto_artefatti_cap10.mjs; regole.json → chroma.matrice, cristalli_matrice, schegge).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { contenitoriLancio, penalitaEstrazione, calcolaLancio } from '../src/lancio.js';
import { profiloSenzArmi, calcolaAttaccoRavvicinato } from '../src/attacco.js';
import { massimiSessione, inizializzaSessione, ricaricaMatrice, attivaArtefatto, modificaSessione } from '../src/sessione.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const art = dati.equipaggiamento.file.artefatti;
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const ogg = (id) => art.oggetti.find((o) => o.id === id);
const pg = (equipaggiamento) => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento };
  const s = calcolaScheda({ creazione, livelli: [] }, dati);
  return { creazione, s, m: massimiSessione(s, creazione, dati) };
};

test('catalogo: 23 Batterie Mistiche con il supporto base (A.75 chiusa), 19 Batterie Matrice + 4 fuori scala, 23 Schegge', () => {
  const b = art.oggetti.filter((o) => o.id.startsWith('batteria-da-'));
  assert.equal(b.length, 23);
  assert.ok(b.every((o) => o.peso === 0.2 && o.qualita === 'Comune' && o.ps_int === 10 && o.pi === 3 && !o['TODO(Davide)'] && Number.isInteger(o.creazione_cr)));
  const mat = art.oggetti.filter((o) => o.id.startsWith('batteria-matrice-'));
  assert.equal(mat.length, 19);
  // Magia §26.4: +1 Grado e +1 SnT; REP Epica per le colorate
  const r10 = ogg('batteria-matrice-da-10-pm-chroma-rosso');
  assert.deepEqual([r10.artefatto.potenza, r10.artefatto.sintonizzazione, r10.reperibilita, r10.costo, r10.artefatto.contenitore.matrice], ['Rara', 3, 'EP', 3000, true]);
  assert.equal(art.fuori_scala.profili.length, 4);
  const sch = art.oggetti.filter((o) => o.id.startsWith('scheggia-instabile-'));
  assert.equal(sch.length, 23);
  assert.ok(sch.every((o) => o.artefatto.scheggia && o.artefatto.sintonizzazione === 0 && o.artefatto.sintonizzabile === false && o.pi === 1));
  // 69 profili energetici: 65 oggetti + 4 fuori scala
  assert.equal(b.length + mat.length + sch.length + art.fuori_scala.profili.length, 69);
  assert.equal(dati.regole.chroma.cristalli_matrice.livelli.length, 20);
  assert.deepEqual(dati.regole.chroma.cristalli_matrice.livelli[5], { livello: 6, altezza_m: 6, larghezza_m: 2.5, raggio_m: 15000 });
});

test('Batteria Matrice: Matrice d’origine sulla voce; ricarica 2 PM/ora alla Matrice d’origine, 1 presso un’altra dello stesso colore, fino alla capacità', () => {
  const { s, m } = pg([voce('bm', 'artefatti:batteria-matrice-da-10-pm-chroma-rosso', 'trasportato', { sintonizzato: true, matrice: 'Rettungsanker' })]);
  const c = s.equipaggiamento.contenitori.find((x) => x.uid === 'bm');
  assert.deepEqual([c.matrice, c.costo, c.fontePg], [{ origine: 'Rettungsanker' }, 3, true]);
  const vuota = modificaSessione(inizializzaSessione(m), { chroma: { bm: { pmAttuali: 0 } } }, m);
  assert.equal(ricaricaMatrice(vuota, 'bm', 3, 'origine', dati, m).chroma.bm.pmAttuali, 6);
  assert.equal(ricaricaMatrice(vuota, 'bm', 3, 'stesso_colore', dati, m).chroma.bm.pmAttuali, 3);
  // da vuota a piena in 5 ore presso la Matrice d'origine (Magia §26.7), non oltre la capacità
  assert.equal(ricaricaMatrice(vuota, 'bm', 8, 'origine', dati, m).chroma.bm.pmAttuali, 10);
});

test('Scheggia instabile: SnT 0, senza sintonizzazione è una fonte di «Lancia!»; promemoria della Prova di estrazione', () => {
  const { s, m } = pg([voce('sc', 'artefatti:scheggia-instabile-da-5-pm-chroma-verde', 'trasportato')]);
  const c = s.equipaggiamento.contenitori.find((x) => x.uid === 'sc');
  assert.deepEqual([c.scheggia, c.sintonizzato], [true, false]);
  assert.ok(!s.equipaggiamento.sintonizzazione?.artefatti?.find((x) => x.uid === 'sc')?.sintonizzato);
  const cura = dati.incantesimi.incantesimi.find((i) => i.nome === 'Cura Ferite');
  const [f] = contenitoriLancio({ scheda: s, sessione: inizializzaSessione(m) }, cura);
  assert.deepEqual([f.uid, f.motivo, f.scheggia], ['sc', null, true]);
  // Magia §26.5.1: −2 VA ogni 3 PM o frazione
  assert.deepEqual([1, 3, 4, 30, 31].map((n) => penalitaEstrazione(n, dati)), [-2, -2, -4, -20, -22]);
  const sess = inizializzaSessione(m);
  const r = calcolaLancio({ scheda: s, sessione: sess }, cura, { fonte: 'contenitore', contenitore: 'sc' }, dati);
  assert.ok(r.promemoria.some((p) => /Scheggia instabile: prima una Prova di Potere obbligatoria per estrarre/.test(p)));
});

test('Guanti da Combattimento Mistico: +1 VA ai pugni indossati, anche senza sintonizzazione; attivazione 3 PM: pugni Magici e +1 al danno', () => {
  const senza = pg([]);
  const con = pg([voce('g', 'artefatti:guanti-da-combattimento-mistico', 'indossata')]);
  const a0 = profiloSenzArmi(senza.s, dati);
  const a1 = profiloSenzArmi(con.s, dati);
  assert.equal(a1.vaEffettivo - a0.vaEffettivo, 1);
  // non valgono per le armi impugnate
  assert.ok(!con.s.equipaggiamento.armi.some((w) => w.scomposizione?.some((x) => /Guanti/.test(x.etichetta))));
  // attivazione: serve la sintonizzazione; spende 3 PM dalle Cariche e accende la condizione
  const sint = pg([voce('g', 'artefatti:guanti-da-combattimento-mistico', 'indossata', { sintonizzato: true })]);
  const s1 = attivaArtefatto(inizializzaSessione(sint.m), 'g', 3, sint.m);
  assert.deepEqual([s1.chroma.g.pmAttuali, s1.condizioniOggetti.includes('attivazione:g')], [7, true]);
  const sch = calcolaScheda({ creazione: sint.creazione, livelli: [], sessione: s1 }, dati);
  const a2 = profiloSenzArmi(sch, dati);
  assert.equal(a2.natura, 'Magico');
  assert.ok(a2.provenienzaDanno.righe.some((r) => /Guanti da Combattimento Mistico \(attivazione\)/.test(r.fonte) && r.valore === 1));
  const att = calcolaAttaccoRavvicinato({ scheda: sch, sessione: s1 }, a2, {}, dati);
  assert.equal(att.danno.natura, 'Magico');
  // riserva insufficiente: null
  assert.equal(attivaArtefatto(modificaSessione(inizializzaSessione(sint.m), { chroma: { g: { pmAttuali: 2 } } }, sint.m), 'g', 3, sint.m), null);
});

test('Pietra della Vigilanza: Batteria Verde 10 PM con due proprietà Universali, fonte anche per «Lancia!»', () => {
  const p = ogg('pietra-della-vigilanza');
  assert.deepEqual(p.artefatto.infusi.map((x) => `${x.incantesimo} ${x.livello}`), ['Individuare 6', 'Esorcizzare Corruzione 6']);
  const { s } = pg([voce('p', 'artefatti:pietra-della-vigilanza', 'trasportato', { sintonizzato: true })]);
  const c = s.equipaggiamento.contenitori.find((x) => x.uid === 'p');
  assert.deepEqual([c.riserva, c.alimentazione, c.fontePg, c.costo], ['batteria', 'universale', true, 3]);
  // il kit individuale (Batteria Matrice 10 PM, Pietra, Guanti) occupa 8 SnT (Magia §26.1)
  const kit = pg([voce('bm', 'artefatti:batteria-matrice-da-10-pm-chroma-rosso', 'trasportato', { sintonizzato: true }), voce('p', 'artefatti:pietra-della-vigilanza', 'trasportato', { sintonizzato: true }), voce('g', 'artefatti:guanti-da-combattimento-mistico', 'indossata', { sintonizzato: true })]);
  assert.deepEqual([kit.s.equipaggiamento.sintonizzazione.usata, kit.s.equipaggiamento.sintonizzazione.capacita], [8, 8]);
});
