// Lotto 149: i veicoli passano alle cariche (Veicoli 0.10 §9.1 e §10, ASA Scout MK4 0.6, registro NEC 2.10; A.192, A.193).
// Autovettura 1.000 km con una CEC Rossa; Scout 750 km con un MEC Rosso (75 km a carica) e CEC Verde per i servizi (una carica
// per giorno di supporto vitale); aria a parte; chiusura della giornata a un tocco (A.219 aperta); conversione per frazione.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import {
  nuovoVeicolo, normalizzaVeicoli, registraViaggio, registraSupportoVitale, chiudiGiornata, ricaricaEnergia, ricaricaBombole,
  vistaVeicoloPersonaggio, installaRicambioEnergia, aggiungiRicambioEnergia, testoCariche,
} from '../src/veicoli.js';
import { normalizza } from '../src/character.js';
import { calcolaScheda } from '../src/calc.js';
import { massimiSessione, allineaSessione, variaNec } from '../src/sessione.js';
import { riserveNec } from '../src/equipaggiamento.js';

const { dati } = await datiReali();
const auto = () => nuovoVeicolo('autovettura-civile', dati, { uid: 'a' });
const scout = () => nuovoVeicolo('asa-scout-mk4', dati, { uid: 's' });
const E = (m) => normalizzaVeicoli([m], dati)[0].energia;

test('Autovettura: tre tratte brevi nello stesso giorno, poi «Chiudi la giornata» — l’arrotondamento è uno solo, non tre', () => {
  let m = auto();
  assert.deepEqual([E(m).rosso, E(m).km_giornata], [10, 0], '1 CEC Rossa piena: 10 cariche');
  for (const km of [30, 30, 30]) {
    const r = registraViaggio(m, km, dati);
    m = r.mezzo;
    assert.equal(E(m).rosso, 10, 'una tratta non tocca le cariche');
    assert.match(r.righe[0], /Viaggio: \+30 km/);
  }
  assert.equal(E(m).km_giornata, 90);
  const c = chiudiGiornata(m, dati);
  // 90 km = 1 carica ogni 100 km o frazione, una volta sola; arrotondando ogni tratta sarebbero state 3 cariche
  assert.deepEqual([E(c.mezzo).rosso, E(c.mezzo).km_giornata], [9, 0]);
  assert.match(c.righe[0], /90 km → 1 carica Rossa \(arrotondato una volta sola, 100 km a carica\)/);
  assert.deepEqual(c.avvisi, []);
  // il giorno dopo si riparte da zero: 101 km = 2 cariche; il resto della giornata prima non si porta dietro
  const d2 = chiudiGiornata(registraViaggio(c.mezzo, 101, dati).mezzo, dati);
  assert.equal(E(d2.mezzo).rosso, 7);
  // nessun km: nessuna carica
  assert.equal(E(chiudiGiornata(auto(), dati).mezzo).rosso, 10);
  assert.match(chiudiGiornata(auto(), dati).righe[0], /nessun consumo/);
  // l'Autovettura non ha supporto vitale né Verde
  assert.equal(E(auto()).verde, undefined);
});

test('Scout: 750 km nominali, 75 km a carica — le tratte brevi si sommano e si arrotonda per eccesso alla chiusura', () => {
  let m = scout();
  const v = vistaVeicoloPersonaggio(m, dati).risorse;
  assert.deepEqual([v.rosso.cariche, v.rosso.massimo, v.rosso.kmPerCarica, v.rosso.autonomiaKm, v.rosso.autonomiaNominaleKm], [10, 10, 75, 750, 750]);
  for (const km of [20, 20, 20]) m = registraViaggio(m, km, dati).mezzo;
  assert.equal(vistaVeicoloPersonaggio(m, dati).risorse.rosso.daAddebitare, 1, 'in anteprima: 60 km → una carica');
  assert.equal(E(chiudiGiornata(m, dati).mezzo).rosso, 9, '60 km su 75: una carica sola');
  // esattamente 75 km = una carica; 76 km = due
  assert.equal(E(chiudiGiornata(registraViaggio(scout(), 75, dati).mezzo, dati).mezzo).rosso, 9);
  assert.equal(E(chiudiGiornata(registraViaggio(scout(), 76, dati).mezzo, dati).mezzo).rosso, 8);
  // riserva esaurita: avviso, non blocco
  const quasiVuoto = { ...scout(), energia: { ...E(scout()), rosso: 1 } };
  const fine = chiudiGiornata(registraViaggio(quasiVuoto, 200, dati).mezzo, dati);
  assert.equal(E(fine.mezzo).rosso, 0);
  assert.match(fine.avvisi[0], /Riserva Rossa esaurita: mancano 2 cariche/);
});

test('Scout: supporto vitale acceso due volte nello stesso giorno = una carica Verde; un giorno senza uso non consuma', () => {
  let m = scout();
  // giorno 1: due accensioni (1 h e 2 h)
  m = registraSupportoVitale(m, 1, dati).mezzo;
  const seconda = registraSupportoVitale(m, 2, dati);
  m = seconda.mezzo;
  assert.match(seconda.righe[1], /già usato oggi: la carica Verde è una sola/);
  assert.equal(E(m).verde, 10, 'la carica Verde si toglie solo alla chiusura');
  assert.equal(E(m).aria, 21, 'l’aria scende subito, ora per ora');
  m = chiudiGiornata(m, dati).mezzo;
  assert.deepEqual([E(m).verde, E(m).aria, E(m).supporto_oggi], [9, 21, false]);
  // giorno 2: nessun uso → valori invariati
  const g2 = chiudiGiornata(m, dati);
  assert.deepEqual([E(g2.mezzo).verde, E(g2.mezzo).aria], [9, 21]);
  assert.match(g2.righe.join(' '), /non usato oggi: nessuna carica Verde/);
  // giorno 3: sei ore → Verde 8, aria 15 (l'esempio della scheda: 3 h → 9 e 21; poi 6 h → 8 e 15)
  const g3 = chiudiGiornata(registraSupportoVitale(g2.mezzo, 6, dati).mezzo, dati).mezzo;
  assert.deepEqual([E(g3).verde, E(g3).aria], [8, 15]);
  // aria esaurita: avviso
  const esaurita = registraSupportoVitale(registraSupportoVitale(scout(), 20, dati).mezzo, 6, dati);
  assert.equal(E(esaurita.mezzo).aria, 0);
  assert.match(esaurita.avvisi[0], /Aria esaurita: mancano 2 ore/);
  // l'elettronica ordinaria non aggiunge consumi: senza viaggio né supporto la giornata è vuota
  assert.deepEqual(E(chiudiGiornata(scout(), dati).mezzo), E(scout()));
});

test('Scout: la ricarica completa riporta Rosso e Verde a 10 e NON ripristina l’aria; le bombole si ricaricano a parte', () => {
  let m = scout();
  m = registraViaggio(m, 750, dati).mezzo;
  m = registraSupportoVitale(m, 24, dati).mezzo;
  m = chiudiGiornata(m, dati).mezzo;
  assert.deepEqual([E(m).rosso, E(m).verde, E(m).aria], [0, 9, 0]);
  const r = ricaricaEnergia(m, dati);
  // 10 cariche MEC a 30 cr e 1 carica CEC a 10 cr; due postazioni indipendenti: 120 minuti (12 min per carica MEC)
  assert.deepEqual([r.costo, r.minuti], [310, 120]);
  assert.deepEqual([E(r.mezzo).rosso, E(r.mezzo).verde, E(r.mezzo).aria], [10, 10, 0], 'l’aria resta a zero');
  assert.match(r.righe.join(' '), /L’aria non cambia/);
  assert.equal(ricaricaEnergia(r.mezzo, dati), null, 'già carico: niente da ricaricare');
  // dal tutto vuoto la ricarica completa costa 400 cr in due ore (300 + 100), tre in successione
  const vuoto = { ...scout(), energia: { ...E(scout()), rosso: 0, verde: 0 } };
  assert.deepEqual([ricaricaEnergia(vuoto, dati).costo, ricaricaEnergia(vuoto, dati).minuti], [400, 120]);
  assert.equal(ricaricaEnergia(vuoto, dati, { inSuccessione: true }).minuti, 180);
  // bombole: 100 cr e 20 minuti ciascuna, in successione; qui 3 da riempire = 300 cr e un'ora
  const b = ricaricaBombole(r.mezzo, dati);
  assert.deepEqual([b.costo, b.minuti, E(b.mezzo).aria], [300, 60, 24]);
  assert.equal(ricaricaBombole(b.mezzo, dati), null);
  // l'Autovettura: 1 CEC Rossa, 100 cr in un'ora
  const a = registraViaggio(auto(), 1000, dati).mezzo;
  const ra = ricaricaEnergia(chiudiGiornata(a, dati).mezzo, dati);
  assert.deepEqual([ra.costo, ra.minuti, E(ra.mezzo).rosso], [100, 60, 10]);
});

test('ricambi: l’accumulatore di scorta si installa senza travaso e si aggiunge pieno (scorte facoltative)', () => {
  assert.deepEqual([E(scout()).rosso_ricambi, E(scout()).verde_ricambi], [[], []], 'nessuna scorta di partenza (Scout 0.6)');
  assert.equal(installaRicambioEnergia(scout(), 'rosso', dati), null);
  let m = aggiungiRicambioEnergia(scout(), 'rosso', dati);
  assert.deepEqual(E(m).rosso_ricambi, [10]);
  m = chiudiGiornata(registraViaggio(m, 300, dati).mezzo, dati).mezzo; // 4 cariche
  const i = installaRicambioEnergia(m, 'rosso', dati);
  assert.deepEqual([E(i).rosso, E(i).rosso_ricambi], [10, [6]], 'quello tolto resta fra i ricambi con le sue cariche');
  assert.equal(testoCariche(1), '1 carica');
  assert.equal(testoCariche(3.3333), '3,3333 cariche');
});

// ---------------------------------------------------------------------------------------------------------------------
// A.193: le riserve salvate in Lx passano alle cariche conservando la frazione

const lxScout = (extra = {}) => ({ uid: 's', profilo: 'asa-scout-mk4', andatura: 'fermo', pi: { corpo: 60, propulsione: 36, motore: 24 }, ...extra });

test('A.193: uno Scout al 50% ha il MEC Rosso a 5 cariche su 10; il valore di prima resta nel file', () => {
  const salvato = lxScout({ energia: { rosso: [25000, 25000], rosso_ricambi: [], verde: [5000], verde_ricambi: [], aria: { fissa: 4, bombole: [8, 8] } } });
  const [m] = normalizzaVeicoli([salvato], dati);
  assert.deepEqual([m.energia.rosso, m.energia.verde, m.energia.aria], [5, 5, 20], '50% di 10, 50% di 10, 4 + 8 + 8 ore');
  assert.equal(m.energia.modello, 'cariche');
  assert.deepEqual(m.energia_prima.energia, salvato.energia, 'il valore originale si conserva');
  assert.equal(m.energia_prima.regola, 'A.193');
  // un'Autovettura a un quarto: 12.500 Lx su 50.000 → 2,5 cariche, senza arrotondare per eccesso
  const [a] = normalizzaVeicoli([{ uid: 'a', profilo: 'autovettura-civile', andatura: 'fermo', pi: { corpo: 12, propulsione: 8, motore: 8 }, energia: { rosso: [12500], rosso_ricambi: [] } }], dati);
  assert.equal(a.energia.rosso, 2.5);
});

test('A.193: niente arrotondamento per eccesso — le frazioni restano dentro e la scheda mostra le cariche intere', () => {
  const [m] = normalizzaVeicoli([lxScout({ energia: { rosso: [50000, 16666], rosso_ricambi: [], verde: [10000], verde_ricambi: [], aria: { fissa: 8, bombole: [8, 8] } } })], dati);
  assert.equal(m.energia.rosso, 6.6666, '66.666 su 100.000 = 6,6666 cariche, non 7');
  const v = vistaVeicoloPersonaggio(m, dati).risorse.rosso;
  assert.equal(v.cariche, 6.6666);
  assert.equal(Math.floor(v.cariche), 6);
  assert.equal(v.autonomiaKm, 499, '6,6666 × 75 km, per difetto');
  // la chiusura della giornata sottrae dalle cariche con la frazione
  const c = chiudiGiornata(registraViaggio(m, 10, dati).mezzo, dati).mezzo;
  assert.equal(c.energia.rosso, 5.6666);
});

test('A.193: la conversione non si ripete — riaprire e salvare più volte lascia le cariche dove sono', () => {
  const salvato = lxScout({ energia: { rosso: [25000, 25000], rosso_ricambi: [], verde: [5000], verde_ricambi: [], aria: { fissa: 4, bombole: [8, 8] } } });
  const una = normalizzaVeicoli([salvato], dati);
  // si usa il mezzo (due cariche in meno) e lo si riapre più volte: il file di prima non ricalcola nulla
  const usato = chiudiGiornata(registraViaggio(una[0], 150, dati).mezzo, dati).mezzo;
  assert.equal(usato.energia.rosso, 3);
  let m = usato;
  for (let i = 0; i < 3; i++) m = normalizzaVeicoli([JSON.parse(JSON.stringify(m))], dati)[0];
  assert.deepEqual(m.energia, usato.energia);
  assert.deepEqual(m.energia_prima, una[0].energia_prima, 'il valore di prima è sempre lo stesso, scritto una volta');
  // anche passando dal file (JSON) senza ripassare dalle riserve di prima
  const rilettura = normalizzaVeicoli(JSON.parse(JSON.stringify([m])), dati)[0];
  assert.equal(rilettura.energia.rosso, 3);
  // il vecchio «nec: { lx }» di prima del 05/10 si converte allo stesso modo
  assert.equal(normalizzaVeicoli([lxScout({ nec: { lx: 30000 } })], dati)[0].energia.rosso, 3);
});

test('A.193: partendo dal record com’è nel file (ancora in Lx), la prima azione scrive le cariche e conserva il valore di prima', () => {
  const salvato = lxScout({ energia: { rosso: [25000, 25000], rosso_ricambi: [], verde: [5000], verde_ricambi: [], aria: { fissa: 4, bombole: [8, 8] } } });
  for (const azione of [(m) => registraViaggio(m, 60, dati), (m) => registraSupportoVitale(m, 3, dati), (m) => chiudiGiornata(m, dati), (m) => ({ mezzo: ricaricaEnergia(m, dati).mezzo }), (m) => ({ mezzo: ricaricaBombole(m, dati)?.mezzo ?? m })]) {
    const x = azione(salvato).mezzo;
    assert.equal(x.energia.modello, 'cariche');
    assert.deepEqual(x.energia_prima.energia, salvato.energia, 'il valore originale resta nel file');
    // e riaprendo il file così com'è stato scritto non si riconverte
    assert.deepEqual(normalizzaVeicoli([JSON.parse(JSON.stringify(x))], dati)[0].energia_prima, x.energia_prima);
  }
  // l'originale in Lx non viene toccato (le funzioni sono pure)
  assert.deepEqual(salvato.energia.rosso, [25000, 25000]);
});

test('A.193: i ricambi di prima (Banchi e Moduli) e un profilo non certo restano «da convertire»', () => {
  const salvato = lxScout({ energia: { rosso: [50000, 50000], rosso_ricambi: [50000], verde: [10000], verde_ricambi: [10000], aria: { fissa: 8, bombole: [8, 8] } } });
  const [m] = normalizzaVeicoli([salvato], dati);
  assert.deepEqual(m.energia.rosso_ricambi, [], 'il nuovo profilo non ha scorte: nessun numero inventato');
  assert.deepEqual(m.energia.ricambi_da_convertire, { rosso: [50000], verde: [10000] });
  const v = vistaVeicoloPersonaggio(m, dati).risorse;
  assert.deepEqual([v.rosso.ricambiDaConvertire, v.verde.ricambiDaConvertire], [[50000], [10000]]);
  // profilo senza capacità di prima nei dati: la riserva è «da convertire» fino alla verifica del Direttore
  const incerti = { ...dati, veicoli: { ...dati.veicoli, profili: dati.veicoli.profili.map((p) => (p.id === 'asa-scout-mk4' ? { ...p, energia_precedente: undefined } : p)) } };
  const [x] = normalizzaVeicoli([lxScout({ energia: { rosso: [25000, 25000], rosso_ricambi: [], verde: [5000], verde_ricambi: [], aria: { fissa: 8, bombole: [8, 8] } } })], incerti);
  assert.deepEqual([x.energia.rosso, x.energia.verde, x.energia.da_convertire], [null, null, ['rosso', 'verde']]);
  assert.equal(x.energia.aria, 24, 'le ore d’aria non cambiano unità: si conservano');
  assert.deepEqual(x.energia_prima.energia.rosso, [25000, 25000]);
  const vista = vistaVeicoloPersonaggio(x, incerti).risorse;
  assert.deepEqual([vista.rosso.daConvertire, vista.verde.daConvertire, vista.rosso.autonomiaKm], [true, true, null]);
  // non si inventa nulla: la chiusura della giornata non toglie cariche e tiene i chilometri
  const c = chiudiGiornata(registraViaggio(x, 80, incerti).mezzo, incerti);
  assert.equal(c.mezzo.energia.rosso, null);
  assert.equal(c.mezzo.energia.km_giornata, 80);
  assert.match(c.avvisi[0], /«da convertire» \(A\.193\)/);
  // e il «da convertire» sopravvive alle riaperture
  assert.equal(normalizzaVeicoli([JSON.parse(JSON.stringify(c.mezzo))], incerti)[0].energia.rosso, null);
});

// ---------------------------------------------------------------------------------------------------------------------
// A.193 sulle riserve dei personaggi (Lx, UE o ore dei lotti precedenti)

const voce = (uid, rif, extra = {}) => ({ uid, rif, stato: 'zaino', quantita: 1, note: '', ...extra });
const sessione = (equipaggiamento, nec) => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  return { m, s: allineaSessione({ nec }, m) };
};

test('A.193 sui PG: una cella a metà vale metà della capacità nuova; il valore di prima resta, il resto va nel registro', () => {
  // NEC Rosso standard (ora NEC 5, 5 cariche): 250 Lx su 500 = metà = 2,5 cariche → segnate 2 per difetto, registrate 2,5
  const { m, s } = sessione([voce('n', 'nec:rosso-standard')], { n: 250 });
  assert.equal(s.nec['n#c'], 2);
  assert.equal(s.nec.n, 250, 'il valore di prima resta nel file');
  assert.deepEqual(s.necConvertite['n#c'], { da: 'n', valore: 250, capacita: 500, esatto: 2.5, applicato: 2, massimo: 5 });
  // un NEC Blu standard (NEC Blu 5): 125 Lx su 250 → anch'esso metà = 2,5 cariche; il Verde standard non ha più contatore (§5.4.3)
  assert.equal(sessione([voce('v', 'nec:blu-standard')], { v: 125 }).s.nec['v#c'], 2);
  assert.equal(sessione([voce('v', 'nec:verde-standard')], { v: 1000 }).s.nec['v#c'], undefined);
  // la tuta: 31 ore su 40 → 7,75 cariche su 10
  const t = sessione([voce('t', 'esplorazione:tuta-extraveicolare')], { t: 31 }).s;
  assert.deepEqual([t.nec['t#c'], t.necConvertite['t#c'].esatto], [7, 7.75]);
  // una riserva piena resta piena, una vuota vuota, un valore oltre la capacità di prima si ferma al massimo
  assert.equal(sessione([voce('n', 'nec:rosso-standard')], { n: 500 }).s.nec['n#c'], 5);
  assert.equal(sessione([voce('n', 'nec:rosso-standard')], { n: 0 }).s.nec['n#c'], 0);
  assert.equal(sessione([voce('n', 'nec:rosso-standard')], { n: 900 }).s.nec['n#c'], 5);
  // senza riserve di prima non si scrive il registro, e il PG di prima non cambia
  assert.equal(sessione([voce('n', 'nec:rosso-standard')], {}).s.necConvertite, undefined);
  assert.equal(Object.keys(m.necPrecedenti ?? {}).length, 1);
});

test('A.193 sui PG: la conversione non si ripete alle aperture successive e le frazioni restano nel registro', () => {
  const eq = [voce('n', 'nec:rosso-standard')];
  const { m, s } = sessione(eq, { n: 250 });
  // si usa una carica, poi si riapre più volte: né il valore né il registro si toccano
  const dopo = variaNec(s, 'n#c', -1, m);
  assert.equal(dopo.nec['n#c'], 1);
  let x = dopo;
  for (let i = 0; i < 3; i++) x = allineaSessione(JSON.parse(JSON.stringify(x)), m);
  assert.equal(x.nec['n#c'], 1, 'non si riconverte da 250 Lx');
  assert.equal(x.nec.n, 250);
  assert.equal(x.necConvertite['n#c'].esatto, 2.5, 'il registro della conversione resta quello');
  // se la riserva si toglie dal catalogo del PG, sparisce anche il suo registro
  assert.equal(allineaSessione(x, sessione([], {}).m).necConvertite, undefined);
});

test('A.193 sui PG: un Banco di prima passa alla CEC con la sua frazione (Lx o UE); un Modulo resta «da convertire» (A.217)', () => {
  // i personaggi salvati con il Banco Rosso si leggono come CEC Rossa e portano con sé la voce di prima
  const letto = normalizza({ ...MISHIMA_AGENTE, equipaggiamento: [voce('b', 'nec:banco-rosso'), voce('mv', 'nec:modulo-verde')] }, dati).scelte.equipaggiamento;
  assert.deepEqual(letto.map((x) => [x.rif, x.rif_prima]), [['nec:cec-rosso', 'nec:banco-rosso'], ['nec:cec-verde', 'nec:modulo-verde']]);
  const { m, s } = sessione(letto, { b: 25000, mv: 5000 });
  assert.equal(s.nec['b#c'], 5, 'metà di 50.000 Lx = metà delle 10 cariche della CEC');
  assert.equal(s.nec['mv#c'], undefined, 'il Modulo non ha un profilo nuovo certo (A.217): da convertire');
  assert.equal(s.nec.mv, 5000, 'e il valore resta nel file');
  const ue = allineaSessione({ nec: { 'b#ue': 40 } }, m);
  assert.equal(ue.nec['b#c'], 4, '40 UE su 100 = 4 cariche su 10');
  // una voce comprata dopo il passaggio, senza voce di prima, con un valore in Lx: nessuna capacità certa, resta da convertire
  const cec = sessione([voce('c', 'nec:cec-verde')], { c: 6000 }).s;
  assert.equal(cec.nec['c#c'], undefined);
  assert.equal(riserveNec(letto, dati).find((x) => x.uid === 'mv').precedenti, undefined);
});
