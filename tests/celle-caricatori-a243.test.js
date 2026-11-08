// Lotto 180 (08/11/2026): le cinque risposte di Davide del 06/11 su celle e caricatori.
//
// A.243 (celle) e A.249 (caricatori): «Estrarre soltanto costa 1 AzP; inserirne uno pronto in un'arma vuota costa 1 AzP;
//   la sostituzione diretta resta un'unica operazione da 1 AzP complessivo. Quello estratto conserva esattamente la
//   carica (i colpi) residui.»
// A.250: «Un caricatore compatibile, accessibile e con almeno un colpo è considerato pronto anche se non è pieno. Ha lo
//   stesso costo d'azione e beneficia normalmente di Ricarica Rapida o Ricarica Esperta.»
// A.244: «Fuori dal combattimento, riempire i caricatori richiede 1 minuto ogni 50 colpi trasferiti, o frazione,
//   calcolato sul totale dell'operazione. I caricatori devono essere estratti e le munizioni devono essere realmente
//   disponibili.»
// A.245: «Ogni singola cella possiede 2 PI. Una cella danneggiata deve essere separata dalla pila. A 0 PI è distrutta e
//   inutilizzabile, normalmente non riparabile: l'evento va registrato e la cella va rimossa dalle scorte utilizzabili.»
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { calcolaScheda } from '../src/calc.js';
import {
  massimiSessione, allineaSessione, inizializzaSessione, consumaColpi, ricaricaArma,
  togliCaricatoreArma, inserisciCaricatoreArma, riempiCaricatoreArma, riempiCaricatoriArma,
  togliCellaArma, inserisciCellaArma, variaPiCellaArma, separaCellaArma,
} from '../src/sessione.js';
import {
  costoOperazione, eProntoColpi, minutiRiempimento, testoMinuti, motivoRiempimento,
  celleDettaglio, piMassimiCella, caricatoriDiScorta, totaleColpi, disponibili, migliorCella,
} from '../src/ricarica.js';

const { dati } = await datiReali();
const FUCILE = 'armi_distanza:fucile-d-assalto'; // caricatore da 30, proiettili da fucile
const KEP = 'armi_distanza_corporative:kep-808'; // arma a cella
const voce = (uid, rif, extra = {}) => ({ uid, rif, stato: null, quantita: 1, note: '', ...extra });
const prepara = (equipaggiamento) => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  return { m, s: inizializzaSessione(m) };
};
const totale = (s, m, uid) => totaleColpi(m.ricarica[uid], s.munizioni[uid], s.scorte);

// ── A.243 e A.249: i tre costi ──

test('A.243 e A.249: estrarre 1 AzP, inserire 1 AzP, e la sostituzione diretta NON è la somma dei due', () => {
  const e = costoOperazione(dati, 'estrazione');
  const i = costoOperazione(dati, 'inserimento');
  const s = costoOperazione(dati, 'sostituzione');
  assert.equal(e.azioni, 1);
  assert.equal(i.azioni, 1);
  // il punto da non sbagliare: una sola operazione da 1 AzP complessivo, non 1 + 1
  assert.equal(s.azioni, 1, 'la sostituzione diretta costa 1 AzP, non 2');
  assert.notEqual(s.azioni, e.azioni + i.azioni);
  assert.match(s.testo, /un’unica operazione da 1 AzP complessivo, non due/);
  assert.match(e.azione, /1 AzP/);
  assert.match(i.azione, /1 AzP/);
});

test('A.243: per un pacco dei lanciafiamme la sostituzione resta quella del manuale (entrambe le mani), e resta 1 AzP', () => {
  const info = { modo: 'cella', cella: { unita: 'getti' } };
  const s = costoOperazione(dati, 'sostituzione', info);
  assert.match(s.azione, /entrambe le mani/);
  assert.equal(s.azioni, 1);
  assert.match(costoOperazione(dati, 'estrazione', info).azione, /1 AzP/);
});

test('A.249: il caricatore estratto conserva esattamente i colpi residui, e il totale non cambia', () => {
  let { m, s } = prepara([voce('f', FUCILE, { stato: 'impugnata' }), voce('sc', 'munizioni:proiettili-da-fucile', { quantita: 10 })]);
  s = consumaColpi(s, 'f', 13, m);
  const t0 = totale(s, m, 'f');
  assert.equal(s.munizioni.f.colpi, 17);
  s = togliCaricatoreArma(s, 'f', m);
  assert.equal(s.munizioni.f.senzaCaricatore, true);
  assert.deepEqual(caricatoriDiScorta(s.munizioni.f, 30), [17], 'esce con i 17 colpi che aveva');
  assert.equal(totale(s, m, 'f'), t0);
  s = inserisciCaricatoreArma(s, 'f', 17, m);
  assert.equal(s.munizioni.f.colpi, 17);
  assert.equal(totale(s, m, 'f'), t0);
});

test('A.243: la cella estratta conserva esattamente la carica residua', () => {
  let { m, s } = prepara([voce('k', KEP, { stato: 'impugnata' }), voce('sc', 'munizioni:cella-kep-808', { quantita: 1 })]);
  const cap = m.caricatori.k;
  s = consumaColpi(s, 'k', 2, m);
  const resta = s.munizioni.k.colpi;
  assert.ok(resta > 0 && resta < cap);
  s = togliCellaArma(s, 'k', m);
  assert.deepEqual(celleDettaglio(s.munizioni.k, cap, piMassimiCella(dati)).map((x) => x.cariche), [resta]);
  s = inserisciCellaArma(s, 'k', { da: 'tolta', indice: 0 }, m);
  assert.equal(s.munizioni.k.colpi, resta, 'rientra con le cariche che aveva');
});

// ── A.250: il parziale è pronto ──

test('A.250: con almeno un colpo è pronto; un vuoto no', () => {
  assert.equal(eProntoColpi(1, dati), true);
  assert.equal(eProntoColpi(22, dati), true);
  assert.equal(eProntoColpi(0, dati), false);
  assert.equal(dati.equipaggiamento.file.munizioni.ricarica.caricatore_pronto.colpi_minimo, 1);
  // il promemoria della Ricarica Rapida lo dice, così al tavolo si applica anche a un parziale
  assert.match(dati.equipaggiamento.file.munizioni.ricarica.ricarica_rapida.promemoria, /almeno un colpo vale come pieno.*A\.250/);
});

test('A.250: un caricatore a 1 colpo entra nell’arma e costa come uno pieno; un vuoto non è pronto', () => {
  let { m, s } = prepara([voce('f', FUCILE, { stato: 'impugnata' })]);
  s = allineaSessione({ ...s, munizioni: { f: { colpi: 0, riserve: 0, senzaCaricatore: true, parziali: [1], vuoti: 1 } } }, m);
  const t0 = totale(s, m, 'f');
  // senza scelta entra il più carico fra quelli pronti: il parziale da 1, non il vuoto
  s = inserisciCaricatoreArma(s, 'f', null, m);
  assert.equal(s.munizioni.f.colpi, 1, 'il parziale da 1 colpo è pronto ed entra');
  assert.equal(costoOperazione(dati, 'inserimento').azioni, 1, 'stesso costo di uno pieno');
  assert.equal(totale(s, m, 'f'), t0);
  // restano solo i vuoti: nessuno è pronto, non entra niente
  s = togliCaricatoreArma(s, 'f', m);
  s = allineaSessione({ ...s, munizioni: { f: { colpi: 0, riserve: 0, senzaCaricatore: true, vuoti: 2 } } }, m);
  assert.deepEqual(inserisciCaricatoreArma(s, 'f', null, m), s, 'un caricatore vuoto non è pronto');
});

test('A.250: una cella con una sola carica è pronta; una vuota non si propone', () => {
  const { m } = prepara([voce('k', KEP, { stato: 'impugnata' })]);
  const info = m.ricarica.k;
  assert.equal(migliorCella(info, { colpi: 0, senzaCella: true, celle: [0] }, {}), null, 'una cella vuota non è pronta');
  const scelta = migliorCella(info, { colpi: 0, senzaCella: true, celle: [0, 1] }, {});
  assert.deepEqual([scelta.da, scelta.cariche], ['tolta', 1], 'con una carica è pronta');
});

// ── A.244: il tempo e le due condizioni ──

test('A.244: 1 minuto ogni 50 colpi, o frazione, sul TOTALE dell’operazione', () => {
  assert.equal(minutiRiempimento(0, dati), 0);
  assert.equal(minutiRiempimento(1, dati), 1);
  assert.equal(minutiRiempimento(50, dati), 1);
  assert.equal(minutiRiempimento(51, dati), 2);
  assert.equal(minutiRiempimento(120, dati), 3, '120 colpi in un’operazione sono 3 minuti');
  // non 1 minuto per caricatore: 3 caricatori da 40 in un’operazione sono 120 colpi → 3 minuti, non 3 × 1
  assert.equal(minutiRiempimento(40, dati) * 3, 3);
  assert.equal(minutiRiempimento(120, dati), 3);
  assert.equal(testoMinuti(1), '1 minuto');
  assert.equal(testoMinuti(3), '3 minuti');
});

test('A.244: il caricatore nell’arma non si riempie — va estratto prima, e lo dice', () => {
  let { m, s } = prepara([voce('f', FUCILE, { stato: 'impugnata' }), voce('sc', 'munizioni:proiettili-da-fucile', { quantita: 40 })]);
  s = consumaColpi(s, 'f', 10, m);
  const t0 = totale(s, m, 'f');
  const prima = s.munizioni.f.colpi;
  assert.deepEqual(riempiCaricatoreArma(s, 'f', { quale: 'inserito', quanti: 5 }, m), s, 'non trasferisce niente');
  assert.equal(s.munizioni.f.colpi, prima);
  assert.match(motivoRiempimento(m.ricarica.f, s.munizioni.f, s.scorte, { quale: 'inserito' }), /estratto/);
  // estratto, si riempie
  s = togliCaricatoreArma(s, 'f', m);
  s = riempiCaricatoreArma(s, 'f', { quale: 20, quanti: 5 }, m);
  assert.deepEqual(caricatoriDiScorta(s.munizioni.f, 30), [25]);
  assert.equal(totale(s, m, 'f'), t0, 'il totale dei proiettili non cambia');
});

test('A.244: senza munizioni davvero disponibili non si trasferisce niente, e lo dice', () => {
  // nessuna voce di munizioni sciolte nell’inventario: non c’è niente con cui riempire
  let { m, s } = prepara([voce('f', FUCILE, { stato: 'impugnata' })]);
  s = allineaSessione({ ...s, munizioni: { f: { colpi: 0, riserve: 0, senzaCaricatore: true, parziali: [10] } } }, m);
  assert.equal((m.ricarica.f.scorte ?? []).reduce((n, x) => n + disponibili(x, s.scorte), 0), 0);
  const t0 = totale(s, m, 'f');
  const dopo = riempiCaricatoreArma(s, 'f', { quale: 10, quanti: 5 }, m);
  assert.deepEqual(caricatoriDiScorta(dopo.munizioni.f, 30), [10], 'resta com’era');
  assert.equal(totale(dopo, m, 'f'), t0, 'nessun colpo creato dal nulla');
  assert.match(motivoRiempimento(m.ricarica.f, s.munizioni.f, s.scorte), /munizioni/);
});

test('A.244: «Riempi i caricatori» dice i minuti del totale e non tocca quello inserito', () => {
  let { m, s } = prepara([voce('f', FUCILE, { stato: 'impugnata' }), voce('sc', 'munizioni:proiettili-da-fucile', { quantita: 200 })]);
  s = consumaColpi(s, 'f', 20, m);
  s = allineaSessione({ ...s, munizioni: { ...s.munizioni, f: { ...s.munizioni.f, vuoti: 4 } } }, m);
  const t0 = totale(s, m, 'f');
  const dentroPrima = s.munizioni.f.colpi;
  s = riempiCaricatoriArma(s, 'f', m);
  assert.equal(s.munizioni.f.colpi, dentroPrima, 'il caricatore nell’arma resta com’era (A.244)');
  assert.equal(s.munizioni.f.riserve, 4, 'i quattro vuoti estratti sono pieni');
  assert.equal(totale(s, m, 'f'), t0, 'nessun colpo creato o perso');
  // 4 × 30 = 120 colpi trasferiti → 3 minuti sul totale
  assert.equal(minutiRiempimento(120, dati), 3);
});

// ── A.245: 2 PI per cella ──

test('A.245: ogni cella ha 2 PI; una danneggiata si separa dalla pila e si segue da sola', () => {
  assert.equal(piMassimiCella(dati), 2);
  let { m, s } = prepara([voce('k', KEP, { stato: 'impugnata' }), voce('sc', 'munizioni:cella-kep-808', { quantita: 3 })]);
  const cap = m.caricatori.k;
  const scorta = m.ricarica.k.scorte[0];
  assert.equal(disponibili(scorta, s.scorte), 3);
  const r = separaCellaArma(s, 'k', scorta.uid, 1, m);
  s = r.sessione;
  assert.equal(disponibili(scorta, s.scorte), 2, 'la pila ha una cella in meno');
  const dett = celleDettaglio(s.munizioni.k, cap, 2);
  assert.equal(dett.length, 1);
  assert.deepEqual([dett[0].cariche, dett[0].pi, dett[0].rotta], [cap, 1, false], 'si segue da sola, con 1 PI su 2');
});

test('A.245: a 0 PI la cella è distrutta, non si inserisce e non si ricarica; resta scritta', () => {
  let { m, s } = prepara([voce('k', KEP, { stato: 'impugnata' }), voce('sc', 'munizioni:cella-kep-808', { quantita: 1 })]);
  const cap = m.caricatori.k;
  s = togliCellaArma(s, 'k', m); // una cella tolta, piena
  let r = variaPiCellaArma(s, 'k', 0, -1, m);
  s = r.sessione;
  assert.equal(r.distrutta, false, 'a 1 PI è solo danneggiata');
  r = variaPiCellaArma(s, 'k', 0, -1, m);
  s = r.sessione;
  assert.equal(r.distrutta, true, 'a 0 PI è distrutta: chi chiama scrive la riga nello storico');
  const dett = celleDettaglio(s.munizioni.k, cap, 2);
  assert.deepEqual([dett[0].pi, dett[0].rotta], [0, true]);
  assert.ok(Array.isArray(s.munizioni.k.celle) && s.munizioni.k.celle.length === 1, 'resta scritta, non si cancella in silenzio');
  // fuori dalle scorte utilizzabili: non si propone e non si inserisce
  const senza = { ...s.munizioni.k, celle: s.munizioni.k.celle };
  const scelta = migliorCella({ ...m.ricarica.k, scorte: [] }, senza, {});
  assert.equal(scelta, null, 'una cella distrutta non si propone');
  const dopo = inserisciCellaArma(s, 'k', { da: 'tolta', indice: 0 }, m);
  assert.deepEqual(dopo, s, 'e non si inserisce');
});

test('A.245: la cella inserita ha i suoi PI e se li porta dietro quando esce', () => {
  let { m, s } = prepara([voce('k', KEP, { stato: 'impugnata' })]);
  const cap = m.caricatori.k;
  const r = variaPiCellaArma(s, 'k', 'inserita', -1, m);
  s = r.sessione;
  assert.equal(s.munizioni.k.piCella, 1);
  s = togliCellaArma(s, 'k', m);
  const dett = celleDettaglio(s.munizioni.k, cap, 2);
  assert.deepEqual([dett[0].pi, dett[0].rotta], [1, false], 'esce con 1 PI su 2');
  assert.equal(s.munizioni.k.piCella, undefined);
  // e rientrando li ritrova
  s = inserisciCellaArma(s, 'k', { da: 'tolta', indice: 0 }, m);
  assert.equal(s.munizioni.k.piCella, 1);
});

test('A.245: i file di prima non cambiano forma — una cella intera resta il numero delle sue cariche', () => {
  const { m } = prepara([voce('k', KEP, { stato: 'impugnata' }), voce('sc', 'munizioni:cella-kep-808', { quantita: 1 })]);
  const prima = allineaSessione({ munizioni: { k: { colpi: 3, riserve: 0, celle: [5, 0] } }, scorte: {} }, m);
  assert.deepEqual(prima.munizioni.k.celle, [5, 0], 'nessuna migrazione: restano numeri');
  assert.deepEqual(celleDettaglio(prima.munizioni.k, 10, 2).map((x) => [x.cariche, x.pi]), [[5, 2], [0, 2]], 'e valgono 2 PI su 2');
  const dopo = variaPiCellaArma(prima, 'k', 1, -1, m).sessione;
  assert.deepEqual(dopo.munizioni.k.celle, [5, { c: 0, pi: 1 }], 'solo quella danneggiata diventa un oggetto');
});
