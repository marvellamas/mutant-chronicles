// Veicoli (Manuale dei Veicoli 0.2; lotto 2 di docs/ricognizione-2026-10-03.md): dati in data/veicoli.json,
// motore puro in src/veicoli.js. Un test per ogni esempio numerico del manuale, più i casi limite:
// PI a 0 per struttura, Corazzato contro danno basso, doppia soglia nello stesso colpo.
import { test } from 'node:test';
import { catalogo } from '../src/equipaggiamento.js';
import assert from 'node:assert/strict';
import {
  profiloVeicolo, andaturaDi, movimentoMassimo, statoStruttura, soglieStruttura, vistaVeicolo,
  penalitaAttacco, localizza, arVeicolo, piDaDanno, applicaColpoVeicolo, assorbiConRinforzi,
  dadiCollisione, qCollisione, dannoOccupante, riparaVeicolo, conPi, andaturaResidua,
} from '../src/veicoli.js';
import { datiReali } from './helpers.js';

const { dati, errori } = await datiReali();
const V = dati.veicoli;
const auto = profiloVeicolo('autovettura-civile', dati);
const scout = profiloVeicolo('asa-scout-mk4', dati);
/** Mezzo integro dal profilo. */
const mezzo = (id, extra = {}) => ({ profilo: id, andatura: 'controllata', ...extra });

test('i dati dei veicoli passano il validatore e dicono da dove vengono', () => {
  assert.deepEqual(errori.filter((e) => e.file === 'veicoli.json'), []);
  assert.match(V.versione_manuale, /Veicoli 0\.2/);
  assert.equal(V.pilotare.caratteristica, 'INT');
  // la PS Integrità non è duplicata: viene dalla Qualità (regole.json → integrita)
  assert.equal(auto.ps_integrita, dati.regole.integrita.ps_per_qualita[auto.qualita]);
  assert.equal(scout.ps_integrita, dati.regole.integrita.ps_per_qualita[scout.qualita]);
});

// --- capitolo 2: andature e manovre ------------------------------------------------------

test('§2.1: con MOV 20 le andature danno 20, 40 e 60 Q; un beneficio di +2 Q porta a 22, 42 e 62', () => {
  const p = { mov_q: 20, man: 0, pi: { corpo: 12, propulsione: 8, motore: 8 } };
  assert.deepEqual(['controllata', 'veloce', 'massima'].map((a) => movimentoMassimo(p, a, dati).q), [20, 40, 60]);
  assert.deepEqual(['controllata', 'veloce', 'massima'].map((a) => movimentoMassimo(p, a, dati, { bonusQ: 2 }).q), [22, 42, 62]);
  assert.equal(movimentoMassimo(p, 'fermo', dati).q, 0);
  // §2.3: il Terreno Difficile costa 2 Q per Q attraversato
  assert.equal(movimentoMassimo(p, 'veloce', dati, { terrenoDifficile: true }).percorribili, 20);
});

test('§2.1: le andature dell’autovettura sono quelle della tabella del §9 (40, 80, 120 Q; 36, 72, 108 km/h)', () => {
  const q = ['controllata', 'veloce', 'massima'].map((a) => movimentoMassimo(auto, a, dati).q);
  assert.deepEqual(q, [40, 80, 120]);
  assert.deepEqual(q.map((x) => Math.round(x * V.misure.km_h_per_q_round)), [36, 72, 108]);
  assert.deepEqual(['controllata', 'veloce', 'massima'].map((a) => andaturaDi(a, dati).pilotare), [0, -2, -4]);
});

test('§2.4: la Frenata d’emergenza riuscita arresta dopo metà del movimento dell’andatura iniziale', () => {
  const p = { mov_q: 20, man: 0, pi: { corpo: 12, propulsione: 8, motore: 8 } };
  const massimo = movimentoMassimo(p, 'veloce', dati).q; // 40 Q
  const frenata = V.manovre.elenco.find((m) => m.id === 'frenata-emergenza');
  assert.equal(Math.ceil(massimo * frenata.frenata_frazione), 20, 'MOV 20 a Veloce: si ferma dopo 20 Q');
  assert.equal(frenata.andatura_di_riferimento, 'iniziale');
  assert.equal(frenata.va, -2);
});

test('§1.4 e §2.4: il VA di Pilotare somma MAN, andatura, manovra e la penalità strutturale peggiore', () => {
  // esempio del §6.2: Pilotare 12, MAN 0, andatura Veloce, Sterzata stretta → 8
  const v = vistaVeicolo(mezzo('autovettura-civile', { andatura: 'veloce' }), dati, { pilotareVa: 12, manovra: 'sterzata-stretta' });
  assert.equal(v.pilotare.valore, 8);
  assert.deepEqual(v.pilotare.provenienza.righe.map((r) => r.valore), [12, -2, -2]);
  // B dell’esempio: Pilotare 10, stessa manovra → 6
  assert.equal(vistaVeicolo(mezzo('autovettura-civile', { andatura: 'veloce' }), dati, { pilotareVa: 10, manovra: 'sterzata-stretta' }).pilotare.valore, 6);
});

// --- capitolo 3: attacchi ----------------------------------------------------------------

test('§3.1: le penalità dell’andatura si sommano fra mezzo che spara e mezzo bersaglio', () => {
  // esempio del §6.2: arma VA 12, propria andatura Veloce −2, bersaglio Veloce −2 → 8
  const p = penalitaAttacco('veloce', 'veloce', dati);
  assert.equal(p.valore, -4);
  assert.equal(12 + p.valore, 8);
  assert.equal(penalitaAttacco('massima', 'controllata', dati).valore, -4);
  assert.equal(penalitaAttacco('controllata', 'controllata', dati).valore, 0);
  // fra occupanti dello stesso veicolo la velocità è condivisa: nessuna penalità
  assert.equal(penalitaAttacco('massima', 'massima', dati, { stessoVeicolo: true }).valore, 0);
});

// --- capitolo 4: strutture, localizzazione e danno ---------------------------------------

test('§4.2: la localizzazione con 1d20 copre le quattro voci, e senza occupanti esposti vale il Motore', () => {
  assert.equal(localizza(20, dati).bersaglio, 'corpo');
  assert.equal(localizza(8, dati).bersaglio, 'corpo');
  assert.equal(localizza(7, dati).bersaglio, 'propulsione');
  assert.equal(localizza(4, dati).bersaglio, 'propulsione');
  assert.equal(localizza(3, dati).bersaglio, 'motore');
  assert.equal(localizza(2, dati).bersaglio, 'motore');
  assert.equal(localizza(1, dati).bersaglio, 'occupanti');
  const dirottato = localizza(1, dati, { occupantiEsposti: false });
  assert.equal(dirottato.bersaglio, 'motore');
  assert.equal(dirottato.dirottato, true);
  // selezione accurata: la penalità della voce scelta
  assert.deepEqual([localizza(null, dati, { accurata: 'corpo' }).va, localizza(null, dati, { accurata: 'propulsione' }).va,
    localizza(null, dati, { accurata: 'motore' }).va, localizza(null, dati, { accurata: 'occupanti' }).va], [-2, -4, -6, -8]);
});

test('§4.4: con 12 PI massimi gli stati sono 12, 9–11, 5–8, 1–4 e 0; il Motore passa da −4 a −8 fra 5 e 4', () => {
  const s = (pi) => statoStruttura('motore', pi, 12, dati);
  assert.equal(s(12).stato, 'integro');
  assert.deepEqual([11, 10, 9].map((x) => s(x).stato), ['operativo', 'operativo', 'operativo']);
  assert.deepEqual([8, 5].map((x) => s(x).stato), ['colpito', 'colpito']);
  assert.deepEqual([4, 1].map((x) => s(x).stato), ['danneggiato', 'danneggiato']);
  assert.equal(s(0).stato, 'rotto');
  // l’esempio del §7.4: da 5 a 4 PI la penalità del Motore passa da −4 a −8
  assert.equal(s(5).penalita, -4);
  assert.equal(s(4).penalita, -8);
  // le soglie già calcolate, come le stampa la scheda
  assert.deepEqual(soglieStruttura('motore', 12, dati).map((x) => [x.stato, x.da, x.a]),
    [['integro', 12, 12], ['operativo', 9, 11], ['colpito', 5, 8], ['danneggiato', 1, 4], ['rotto', 0, 0]]);
});

test('§4.4: Corpo e Motore a 0 PI mettono il mezzo fuori uso; la Propulsione resta usabile a −8 VA', () => {
  assert.equal(statoStruttura('corpo', 0, 12, dati).fuoriUso, true);
  assert.equal(statoStruttura('motore', 0, 8, dati).fuoriUso, true);
  const prop = statoStruttura('propulsione', 0, 8, dati);
  assert.equal(prop.fuoriUso, false, '§4.4: eccezione alla normale inutilizzabilità di un oggetto Rotto');
  assert.equal(prop.parziale, -8);
  // nella vista: solo la penalità peggiore, e il mezzo non è fuori uso con la sola Propulsione a 0
  const v = vistaVeicolo({ profilo: 'autovettura-civile', pi: { corpo: 12, propulsione: 0, motore: 8 } }, dati, { pilotareVa: 10 });
  assert.equal(v.fuoriUso, false);
  assert.equal(v.penalitaStrutturale, -8);
  assert.equal(v.pilotare.valore, 2);
  const rotto = vistaVeicolo({ profilo: 'autovettura-civile', pi: { corpo: 0, propulsione: 8, motore: 8 } }, dati, { pilotareVa: 10 });
  assert.equal(rotto.fuoriUso, true);
});

test('§4.4: fra le penalità strutturali si applica soltanto la peggiore, non la somma', () => {
  // Corpo Danneggiato (−4) e Motore Colpito (−4): resta −4, non −8
  const v = vistaVeicolo({ profilo: 'autovettura-civile', pi: { corpo: 3, propulsione: 8, motore: 5 } }, dati, { pilotareVa: 12 });
  assert.equal(v.penalitaStrutturale, -4);
  // Motore Danneggiato (−8) con Corpo Colpito (−2): vale −8
  const w = vistaVeicolo({ profilo: 'autovettura-civile', pi: { corpo: 7, propulsione: 8, motore: 2 } }, dati, { pilotareVa: 12 });
  assert.equal(w.penalitaStrutturale, -8);
  assert.equal(w.pilotare.valore, 4);
});

test('§4.3: l’esempio del manuale — 5 PI potenziali e Corazzato 2: 1 PI con PS riuscita, 3 con PS fallita', () => {
  // una struttura con Corazzato 2 e un colpo che produce 5 PI potenziali (25 danni oltre l’AR)
  const m = { profilo: 'asa-scout-mk4', pi: { corpo: 60, propulsione: 36, motore: 24 } };
  const colpo = (ps) => ({ danni: [25 + scout.ar.totale], natura: 'Naturale', ps });
  assert.equal(scout.corazzato, 1);
  // il manuale usa Corazzato 2: si verifica la procedura con un profilo scritto a mano
  const finto = { scheda: { ...scout, corazzato: 2 }, pi: { corpo: 60, propulsione: 36, motore: 24 } };
  const riuscita = applicaColpoVeicolo(finto, 'corpo', { danni: [25 + scout.ar.totale], natura: 'Naturale', ps: true }, dati);
  assert.equal(riuscita.piPotenziali, 5);
  assert.equal(riuscita.piPersi, 1, 'metà di 5 per eccesso è 3, meno Corazzato 2');
  const fallita = applicaColpoVeicolo(finto, 'corpo', { danni: [25 + scout.ar.totale], natura: 'Naturale', ps: false }, dati);
  assert.equal(fallita.piPersi, 3, '5 meno Corazzato 2');
  // e con il Corazzato 1 dello Scout: 3 − 1 = 2 con la PS riuscita, 5 − 1 = 4 con la PS fallita
  assert.equal(applicaColpoVeicolo(m, 'corpo', colpo(true), dati).piPersi, 2);
  assert.equal(applicaColpoVeicolo(m, 'corpo', colpo(false), dati).piPersi, 4);
});

test('§4.3: 1 PI ogni 5 danni o frazione, applicazione per applicazione', () => {
  assert.deepEqual([1, 5, 6, 10, 11, 25].map((d) => piDaDanno(d, dati)), [1, 1, 2, 2, 3, 5]);
  assert.equal(piDaDanno(0, dati), 0);
  // due applicazioni dello stesso colpo si convertono separatamente, poi si riuniscono nell’unica PS
  const m = { profilo: 'autovettura-civile' };
  const r = applicaColpoVeicolo(m, 'corpo', { danni: [7, 7], natura: 'Naturale', ps: false }, dati);
  assert.deepEqual(r.applicazioni.map((a) => [a.residuo, a.pi]), [[6, 2], [6, 2]]);
  assert.equal(r.piPotenziali, 4, 'separate: 2 + 2, non 1 PI ogni 5 di 12 danni');
  assert.equal(r.psRichiesta, true);
});

test('§4.3: il danno Etereo incontra solo la componente magica dell’AR', () => {
  const prof = { ...auto, ar: { totale: 4, magica: 1 } };
  assert.equal(arVeicolo(prof, 'Naturale', dati), 4);
  assert.equal(arVeicolo(prof, 'Magico', dati), 4);
  assert.equal(arVeicolo(prof, 'Etereo', dati), 1);
  // stessa regola dei personaggi (regole.json → danno_applicato.ar_per_natura)
  assert.deepEqual(V.danno.ar_per_natura, dati.regole.danno_applicato.ar_per_natura);
});

test('§4.3: il Magistrale aggiunge il suo PI anche con il danno interamente assorbito', () => {
  const m = { profilo: 'asa-scout-mk4' }; // AR 4, Corazzato 1
  const assorbito = applicaColpoVeicolo(m, 'corpo', { danni: [3], natura: 'Naturale', magistrale: true, ps: false }, dati);
  assert.equal(assorbito.applicazioni[0].residuo, 0);
  assert.equal(assorbito.piPotenziali, 1, 'solo il PI del Magistrale');
  assert.equal(assorbito.piPersi, 0, 'Corazzato 1 lo riduce a 0');
  // senza Magistrale e con l’AR che annulla il danno non si perde nulla, nemmeno 1 PI
  const niente = applicaColpoVeicolo(m, 'corpo', { danni: [3], natura: 'Naturale', ps: true }, dati);
  assert.equal(niente.psRichiesta, false, '§4.3: il minimo di 1 vale solo se esiste una perdita potenziale');
  assert.equal(niente.piPersi, 0);
});

test('caso limite: Corazzato contro danno basso non fa perdere PI, e i PI non scendono sotto 0', () => {
  const m = { profilo: 'asa-scout-mk4', pi: { corpo: 60, propulsione: 36, motore: 1 } };
  // 6 danni − AR 4 = 2 → 1 PI potenziale, PS riuscita minimo 1, Corazzato 1 → 0
  const r = applicaColpoVeicolo(m, 'motore', { danni: [6], natura: 'Naturale', ps: true }, dati);
  assert.equal(r.piPotenziali, 1);
  assert.equal(r.piPersi, 0);
  assert.equal(r.pi.dopo, 1);
  // un colpo enorme non porta sotto 0
  const grosso = applicaColpoVeicolo(m, 'motore', { danni: [200], natura: 'Naturale', ps: false }, dati);
  assert.equal(grosso.pi.dopo, 0);
  assert.equal(grosso.stato.stato, 'rotto');
  assert.equal(grosso.stato.fuoriUso, true);
});

test('caso limite: un solo colpo attraversa due soglie e lo stato finale è quello raggiunto', () => {
  // Corpo 12 massimi, 11 PI (Operativo): un colpo che fa perdere 8 PI porta a 3, cioè Danneggiato
  const m = { profilo: 'autovettura-civile', pi: { corpo: 11, propulsione: 8, motore: 8 } };
  assert.equal(statoStruttura('corpo', 11, 12, dati).stato, 'operativo');
  const r = applicaColpoVeicolo(m, 'corpo', { danni: [41], natura: 'Naturale', ps: false }, dati); // 40 oltre AR 1 → 8 PI
  assert.equal(r.piPersi, 8);
  assert.equal(r.pi.dopo, 3);
  assert.equal(r.stato.stato, 'danneggiato', 'salta Colpito: conta solo lo stato finale');
  assert.equal(r.stato.penalita, -4);
});

test('Copriruote di Petra: la perdita esaurisce i pezzi montati in successione, l’eccedenza va alla Propulsione', () => {
  const r = scout.rinforzi[0];
  assert.equal(r.struttura, 'propulsione');
  assert.equal(r.protezione_iniziale_pi, 12, '4 montati × 3 PI');
  assert.equal(r.pi_nelle_scorte, 6, '2 ricambi × 3 PI');
  // l’esempio della scheda: il primo copriruota ha 1 PI, il secondo è integro; una perdita di 3 esaurisce il
  // primo e lascia il secondo a 1 PI
  const e = r.esempio;
  const a = assorbiConRinforzi([e.primo_pi, 3, 3, 3], e.perdita, dati);
  assert.equal(a.montati[0], 0);
  assert.equal(a.montati[1], e.secondo_dopo);
  assert.equal(a.allaStruttura, 0, 'le ruote non perdono Integrità');
  // quattro copriruote integri assorbono 12 PI; il tredicesimo arriva alla Propulsione
  assert.equal(assorbiConRinforzi([3, 3, 3, 3], 12, dati).allaStruttura, 0);
  assert.equal(assorbiConRinforzi([3, 3, 3, 3], 13, dati).allaStruttura, 1);
  assert.equal(assorbiConRinforzi([0, 0, 0, 0], 2, dati).allaStruttura, 2);
  assert.equal(r.aumenta_pi_massimi, false);
  assert.equal(r.bonus_ps, 0);
});

// --- capitolo 5: collisioni e incidenti --------------------------------------------------

test('§5.1: 1d6 ogni 10 Q di riferimento o frazione, e i Q di riferimento per tipo di urto', () => {
  assert.equal(dadiCollisione('ostacolo-fermo', 20, dati).dadi, 2);
  assert.equal(dadiCollisione('ostacolo-fermo', 21, dati).dadi, 3, 'o frazione');
  assert.equal(dadiCollisione('ostacolo-fermo', 0, dati).dadi, 0, 'semplice contatto, senza danno');
  assert.equal(qCollisione('ostacolo-fermo', 40, 0, dati), 40);
  assert.equal(qCollisione('frontale', 40, 60, dati), 100);
  assert.equal(qCollisione('tamponamento', 60, 40, dati), 20);
  assert.equal(qCollisione('tamponamento', 40, 40, dati), 0, 'differenza 0: nessun danno da collisione');
  assert.equal(qCollisione('laterale', 40, 60, dati), 60);
});

test('§6.3: l’esempio dello Speronamento — VA 10 −4 −2 = 4, urto da 20 Q con 2d6', () => {
  const e = V.speronamento.esempio;
  const p = penalitaAttacco('massima', 'veloce', dati);
  assert.equal(10 + p.valore, e.va_finale, 'propria Massima −4 e bersaglio Veloce −2');
  const q = qCollisione('tamponamento', 60, 40, dati);
  assert.equal(q, e.q_riferimento);
  assert.equal(dadiCollisione('tamponamento', q, dati).dadi, e.dadi);
  // §1.4: lo Speronamento è un attacco, quindi senza MAN
  assert.equal(V.speronamento.man, false);
});

test('§5.2: l’esempio degli occupanti — 15 danni, 8 dopo la cintura, 4 con Tempra riuscita', () => {
  const e = V.collisioni.occupanti.esempio;
  assert.equal(dannoOccupante(e.danno, dati, { cintura: true }).danno, e.dopo_cintura);
  assert.equal(dannoOccupante(e.danno, dati, { cintura: true, tempra: true }).danno, e.dopo_tempra);
  // senza cintura la Tempra dimezza una sola volta, e l’espulsione resta possibile
  const senza = dannoOccupante(e.danno, dati, { tempra: true });
  assert.equal(senza.danno, 8);
  assert.equal(senza.espulsionePossibile, true);
  assert.equal(senza.salvezzaEspulsione, 'Riflessi');
  assert.equal(dannoOccupante(e.danno, dati, { cintura: true }).espulsionePossibile, false);
});

test('§5.4: la caduta fa 1d6 ogni 2 Q completi e l’AR non la riduce', () => {
  assert.equal(dadiCollisione('caduta', 4, dati).dadi, 2);
  assert.equal(dadiCollisione('caduta', 5, dati).dadi, 2, 'una frazione inferiore a 2 Q non aggiunge un dado');
  assert.equal(dadiCollisione('caduta', 1, dati).dadi, 0);
  assert.equal(dadiCollisione('caduta', 6, dati).arRiduce, false);
});

test('§5.5: l’esempio del passaggio dei comandi — a terra l’andatura scende di una fascia per Iniziativa', () => {
  // automobile MOV 20 a Veloce: senza conducente scende a Controllata e percorre 20 Q
  const r = andaturaResidua('veloce', 'terra', dati);
  assert.equal(r.andatura.id, 'controllata');
  assert.equal(r.scesa, true);
  assert.equal(movimentoMassimo({ mov_q: 20 }, r.andatura.id, dati).q, 20);
  assert.equal(andaturaResidua('controllata', 'terra', dati).andatura.id, 'fermo');
  assert.equal(andaturaResidua('fermo', 'terra', dati).scesa, false);
  // negli altri ambienti la conseguenza la dice il manuale, senza scalare l’andatura
  const aria = andaturaResidua('veloce', 'aria', dati);
  assert.equal(aria.scesa, false);
  assert.match(aria.conseguenza, /planata|precipita/);
  assert.equal(V.fuori_uso.passaggio_comandi.azioni_principali, 1);
  assert.equal(V.fuori_uso.passaggio_comandi.secondo_movimento, false);
});

// --- capitolo 7: riparazioni e Talenti ---------------------------------------------------

test('§7.1: la riparazione recupera 1 PI col successo, 2 col Magistrale, e ne toglie 1 col Maldestro', () => {
  const m = { profilo: 'autovettura-civile', pi: { corpo: 9, propulsione: 8, motore: 8 } };
  assert.equal(riparaVeicolo(m, 'corpo', 'successo', dati).pi.dopo, 10);
  assert.equal(riparaVeicolo(m, 'corpo', 'magistrale', dati).pi.dopo, 11);
  assert.equal(riparaVeicolo(m, 'corpo', 'fallimento', dati).pi.dopo, 9);
  const maldestro = riparaVeicolo(m, 'corpo', 'maldestro', dati);
  assert.equal(maldestro.pi.dopo, 8);
  assert.equal(maldestro.persi, 1);
  // non si supera il massimo, e dal fondo si può ripartire (una struttura Rotta è riparabile)
  assert.equal(riparaVeicolo({ profilo: 'autovettura-civile', pi: { corpo: 12, propulsione: 8, motore: 8 } }, 'corpo', 'magistrale', dati).pi.dopo, 12);
  const daZero = riparaVeicolo({ profilo: 'autovettura-civile', pi: { corpo: 0, propulsione: 8, motore: 8 } }, 'corpo', 'successo', dati);
  assert.equal(daZero.pi.dopo, 1);
  assert.equal(daZero.stato.fuoriUso, false);
  assert.equal(riparaVeicolo({ profilo: 'autovettura-civile', pi: { corpo: 0, propulsione: 8, motore: 8 } }, 'corpo', 'maldestro', dati).pi.dopo, 0, 'minimo 0');
});

test('§7.1 e §9.1: l’esempio dei costi — 3 PI del Corpo costano 750 cr di ricambi e 300 di manodopera', () => {
  let m = { profilo: 'autovettura-civile', pi: { corpo: 9, propulsione: 8, motore: 8 } };
  let ricambi = 0;
  let ore = 0;
  for (let i = 0; i < 3; i++) {
    const r = riparaVeicolo(m, 'corpo', 'successo', dati);
    ricambi += r.costoRicambi;
    ore += r.minuti / 60;
    m = conPi(m, 'corpo', r.pi.dopo);
  }
  assert.equal(m.pi.corpo, 12);
  assert.equal(ricambi, 750, '3 PI × 250 cr');
  assert.equal(ore * auto.officina_cr_per_ora, 300, 'tre ore a 100 cr');
  assert.equal(ricambi + ore * auto.officina_cr_per_ora, 1050);
  // §9.1: recuperare da 0 tutte e tre le strutture costa 5.800 cr di materiali
  const totale = Object.entries(auto.pi).reduce((s, [k, pi]) => s + pi * auto.ricambi_cr_per_pi[k], 0);
  assert.equal(totale, 5800);
});

test('§7.2: Meccanico di Bordo dimezza il tempo e dà +2 a Tecnologia; le riduzioni non scendono sotto la metà', () => {
  const m = { profilo: 'autovettura-civile', pi: { corpo: 9, propulsione: 8, motore: 8 } };
  const r = riparaVeicolo(m, 'corpo', 'successo', dati, { capacita: ['Meccanico di Bordo'] });
  assert.equal(r.minuti, 30);
  assert.equal(r.va, 2);
  const due = riparaVeicolo(m, 'corpo', 'successo', dati, { capacita: ['Meccanico di Bordo', 'Duro Lavoro'] });
  assert.equal(due.minuti, 30, 'non si scende sotto metà del tempo ordinario');
  assert.equal(due.va, 5, '+2 e +3');
  // strumenti improvvisati: −2 VA
  assert.equal(riparaVeicolo(m, 'corpo', 'successo', dati, { strumentiImprovvisati: true }).va, -2);
  // Manutenzione Preventiva para il PI del Fallimento Maldestro
  assert.equal(riparaVeicolo(m, 'corpo', 'maldestro', dati, { capacita: ['Manutenzione Preventiva'] }).persi, 0);
});

test('§7.3: la Riparazione d’Emergenza non recupera PI e mette −2 VA al posto della penalità', () => {
  const E = V.riparazione.emergenza;
  assert.equal(E.pi, 0);
  assert.equal(E.va_temporaneo, -2);
  // Motore a 0 PI (mezzo fuori uso) ripristinato: il mezzo torna a funzionare con −2 VA
  const m = { profilo: 'autovettura-civile', pi: { corpo: 12, propulsione: 8, motore: 0 }, ripristini: [{ struttura: 'motore' }] };
  const v = vistaVeicolo(m, dati, { pilotareVa: 12 });
  assert.equal(v.fuoriUso, false);
  assert.equal(v.penalitaStrutturale, -2);
  assert.equal(v.pilotare.valore, 10);
  // senza il ripristino lo stesso mezzo è fuori uso
  assert.equal(vistaVeicolo({ ...m, ripristini: [] }, dati, { pilotareVa: 12 }).fuoriUso, true);
});

test('§7.4: l’esempio del Sovraccarico Tecnico — il Motore da 5 a 4 PI passa a Danneggiato e −8 VA', () => {
  const e = V.sovraccarico_tecnico.esempio;
  const m = { profilo: 'asa-scout-mk4', pi: { corpo: 60, propulsione: 36, motore: e.motore_prima } };
  // il manuale usa un mezzo con Motore 12 massimi: si verifica la procedura con quei numeri
  const finto = { scheda: { ...scout, pi: { ...scout.pi, motore: e.massimo } }, pi: { corpo: 18, propulsione: 10, motore: e.motore_prima } };
  assert.equal(statoStruttura('motore', e.motore_prima, e.massimo, dati).stato, e.stato_prima);
  const dopo = conPi(finto, 'motore', e.motore_prima - V.sovraccarico_tecnico.pi_spesi);
  const s = statoStruttura('motore', dopo.pi.motore, e.massimo, dati);
  assert.equal(dopo.pi.motore, e.motore_dopo);
  assert.equal(s.stato, e.stato_dopo);
  assert.equal(s.penalita, e.va);
  // serve almeno 2 PI nella riserva, e il PI si toglie da una sola struttura
  assert.equal(V.sovraccarico_tecnico.pi_minimi_richiesti, 2);
  assert.ok(m.pi.motore >= V.sovraccarico_tecnico.pi_minimi_richiesti);
});

test('§7.4: Spinta al Limite dà +2 Q dopo il moltiplicatore dell’andatura e rischia 1 o 2 PI del Motore', () => {
  const S = V.spinta_al_limite;
  assert.equal(S.movimento_q, 2);
  // +2 Q dopo il moltiplicatore: MOV 30 a Massima fa 90, con la Spinta 92
  assert.equal(movimentoMassimo(scout, 'massima', dati).q, 90);
  assert.equal(movimentoMassimo(scout, 'massima', dati, { bonusQ: S.movimento_q }).q, 92);
  assert.equal(S.prova_alla_scadenza.struttura, 'motore');
  assert.deepEqual([S.prova_alla_scadenza.fallimento_pi, S.prova_alla_scadenza.maldestro_pi], [1, 2]);
  assert.equal(S.perdita_senza_ps, true, 'la perdita non passa dalla PS Integrità né da AR o Corazzato');
});

// --- profili -----------------------------------------------------------------------------

test('§9: il profilo dell’autovettura civile è quello della tabella del manuale', () => {
  assert.deepEqual([auto.mov_q, auto.man, auto.ps_integrita, auto.ar.totale, auto.corazzato], [40, 0, 10, 1, 0]);
  assert.deepEqual(auto.pi, { corpo: 12, propulsione: 8, motore: 8 });
  assert.deepEqual([auto.equipaggio.conducente, auto.equipaggio.passeggeri, auto.equipaggio.posti], [1, 4, 5]);
  assert.equal(auto.prezzo_cr, 20000);
  // §9.1: 50.000 Lx ÷ 50 Lx/km = 1.000 km
  assert.equal(auto.alimentazione.capacita_lx / auto.alimentazione.consumo_lx_km, auto.alimentazione.autonomia_km);
  // alla velocità massima: 120 Q per Round → 108 km/h → 5.400 Lx/h, entro l’erogazione del Banco
  const kmh = movimentoMassimo(auto, 'massima', dati).q * V.misure.km_h_per_q_round;
  assert.equal(kmh * auto.alimentazione.consumo_lx_km, 5400);
  assert.ok(kmh * auto.alimentazione.consumo_lx_km <= auto.alimentazione.erogazione_lx_h);
});

test('§10: il profilo dell’ASA Scout MK4 è quello della sua scheda', () => {
  assert.deepEqual([scout.mov_q, scout.man, scout.ps_integrita, scout.ar.totale, scout.ar.magica, scout.corazzato], [30, 0, 12, 4, 0, 1]);
  assert.deepEqual(scout.pi, { corpo: 60, propulsione: 36, motore: 24 });
  assert.equal(scout.equipaggio.posti, 8);
  assert.equal(scout.qualita, 'Non comune');
  assert.equal(scout.reperibilita, 'Rara');
  // A.101 (E&L del 05/10/2026): valore della configurazione approvata 202.520 cr, somma delle voci
  assert.equal(scout.prezzo_cr, 202520);
  assert.equal(scout.valore_voci.reduce((t, x) => t + x.cr, 0), 202520);
  assert.deepEqual(scout.ricambi_cr_per_pi, { corpo: 300, propulsione: 250, motore: 500 });
  assert.equal(scout.officina_cr_per_ora, 100);
  assert.equal(scout.corazzato, 1); // A.103: l'esempio del §4.3 con Corazzato 2 è generico
  // le andature: 30, 60, 90 Q (27, 54, 81 km/h)
  const q = ['controllata', 'veloce', 'massima'].map((a) => movimentoMassimo(scout, a, dati).q);
  assert.deepEqual(q, [30, 60, 90]);
  assert.deepEqual(q.map((x) => Math.round(x * V.misure.km_h_per_q_round)), [27, 54, 81]);
  // il mitragliatore M606: Armi pesanti, 1d8+3, 600 Q, 400 colpi, 3 cr a colpo, 400 + 800 iniziali (A.101)
  const m606 = scout.armi[0];
  assert.deepEqual([m606.abilita, m606.danno, m606.gittata_q, m606.capacita, m606.cr_per_colpo, m606.prezzo_cr], ['Armi pesanti', '1d8+3', 600, 400, 3, 19000]);
  assert.deepEqual(m606.munizioni_iniziali, { caricate: 400, riserva: 800 });
  assert.ok(catalogo(dati).perRif.get(m606.rif), 'la M606 è la scheda del catalogo');
  assert.ok(m606.operatore.includes('artigliere'));
  // le due riserve Rosse: 100.000 Lx e 20.000 Lx/h
  assert.deepEqual([scout.alimentazione.capacita_lx, scout.alimentazione.erogazione_lx_h], [100000, 20000]);
  // A.101: 200 Lx/km a ogni andatura, 500 km nominali; supporto vitale Verde 200 Lx/h; aria 8 + 8 + 8 ore
  assert.equal(scout.alimentazione.capacita_lx / scout.alimentazione.consumo_lx_km, scout.alimentazione.autonomia_km);
  assert.equal(scout.supporto_vitale.verde.consumo_lx_h, 200);
  assert.equal(scout.supporto_vitale.aria.riserva_fissa_ore + scout.supporto_vitale.aria.bombole_ore.reduce((t, x) => t + x, 0), 24);
  assert.equal(profiloVeicolo('autovettura-civile', dati).reperibilita, 'Comune'); // A.102
});

test('la vista di un mezzo integro riempie i valori dal profilo e non tocca i dati del mezzo', () => {
  const m = mezzo('asa-scout-mk4');
  const v = vistaVeicolo(m, dati, { pilotareVa: 11 });
  assert.deepEqual(v.strutture.map((s) => [s.struttura, s.pi, s.stato, s.penalita]),
    [['corpo', 60, 'integro', 0], ['propulsione', 36, 'integro', 0], ['motore', 24, 'integro', 0]]);
  assert.equal(v.penalitaStrutturale, 0);
  assert.equal(v.pilotare.valore, 11);
  assert.equal(v.movimento.q, 30);
  assert.deepEqual(m, { profilo: 'asa-scout-mk4', andatura: 'controllata' }, 'il mezzo non è stato modificato');
  // conPi restituisce un oggetto nuovo
  const dopo = conPi(m, 'motore', 20);
  assert.equal(dopo.pi.motore, 20);
  assert.equal(m.pi, undefined);
});
