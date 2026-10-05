// Perdite periodiche di PV degli Stati al tavolo (src/periodici.js): Sanguinamento (Giocatore §5.15),
// Incendiato e Avvelenato (§5.18). Bug trovato da Marcello e Davide il 04/10/2026: Sanguinamento 1 applicato
// a un PG non gli toglieva il PV al Round successivo, perché la plancia non applicava nulla in automatico.
//
// Regola (§5.15): «Alla prima applicazione il personaggio perde immediatamente X PV ignorando Armatura, Parata
// e Schivata; le applicazioni successive avvengono all’Iniziativa di chi lo ha procurato, al massimo una volta
// per Round.» «Questa perdita non porta i PV sotto 0 e, quando li riduce a 0, non produce immediatamente una
// Ferita.» Più Sanguinamenti non si sommano: si usa il valore più alto. Termina solo quando viene fermato.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  statiPeriodici, periodicoDi, registraPeriodico, togliPeriodici, perditeDovute,
  applicaPerdita, pvDopoPerdita, testoPerdita, periodiciDi, allineaPeriodici,
} from '../src/periodici.js';
import { nuovoScontro, aggiungiNemici, registraTiro, avanti, diTurno, validaScontro, ordineIniziativa } from '../src/scontro.js';
import { applicaColpo, testoColpo } from '../src/danno.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const leggi = (f) => JSON.parse(readFileSync(new URL(`../esempi/${f}`, import.meta.url), 'utf8'));
const legionario = leggi('nemici/legionario-oscuro.json');
const ADESSO = new Date('2026-10-04T10:00:00Z');

/** Scontro con un PG (Lucas) e un Legionario, Iniziativa già tirata: il nemico agisce prima del PG. */
function scontroPronto({ pgIniziativa = 3, nemicoD10 = 9, pgD10 = 2 } = {}) {
  let s = nuovoScontro({ id: 'periodici-prova', pg: [{ chiave: 'lucas', nome: 'Lucas', iniziativa: pgIniziativa, des: 2, int: 1 }], adesso: ADESSO });
  s = aggiungiNemici(s, legionario, 1, {}, ADESSO);
  const nemico = s.partecipanti.find((p) => p.tipo === 'nemico');
  s = registraTiro(s, 'pg:lucas', 'd10', { valore: pgD10, origine: 'vivo' }, dati, ADESSO);
  s = registraTiro(s, nemico.id, 'd10', { valore: nemicoD10, origine: 'vivo' }, dati, ADESSO);
  return { s, nemico };
}

test('i dati dicono quali Stati hanno una perdita periodica (§5.15, §5.18)', () => {
  const ids = statiPeriodici(dati).map((s) => s.id).sort();
  assert.deepEqual(ids, ['avvelenato', 'incendiato', 'sanguinamento']);
  const sang = periodicoDi('sanguinamento', dati);
  assert.equal(sang.danno, 'valore', 'Sanguinamento perde X PV, il suo valore');
  assert.deepEqual(sang.ignora, ['armatura', 'parata', 'schivata']);
  assert.equal(periodicoDi('incendiato', dati).danno, '1d4');
  assert.equal(periodicoDi('avvelenato', dati).danno, 'dalla_fonte');
  assert.equal(periodicoDi('stordito', dati), null, 'gli altri Stati restano promemoria');
});

test('§5.15: la perdita non porta sotto 0 PV e non produce Ferite arrivando a 0', () => {
  assert.equal(pvDopoPerdita(18, 1), 17);
  assert.equal(pvDopoPerdita(1, 3), 0, 'non si scende sotto 0');
  assert.equal(pvDopoPerdita(0, 1), 0);
});

test('Sanguinamento 1 su un PG: toglie 1 PV all’Iniziativa della fonte, un Round dopo l’altro', () => {
  const { s, nemico } = scontroPronto();
  // «Colpito» ha già applicato la perdita immediata nel Round 1: la registrazione parte da lì
  let x = registraPeriodico(s, { bersaglio: 'pg:lucas', nome: 'Lucas', tipo: 'pg', chiave: 'lucas', stato: 'sanguinamento', valore: 1, fonte: nemico.id, fonteNome: nemico.nome }, ADESSO, dati);
  assert.equal(periodiciDi(x, 'pg:lucas').length, 1);
  assert.equal(validaScontro(x), null, 'lo scontro resta valido con i periodici');
  // nel Round 1 non si applica più nulla: una volta per Round, e la prima l'ha già fatta il colpo
  assert.deepEqual(perditeDovute(x, dati), []);

  // il nemico agisce primo: «Avanti» passa a Lucas, poi comincia il Round 2 col turno del nemico
  x = avanti(x, ADESSO); // turno di Lucas, Round 1
  assert.deepEqual(perditeDovute(x, dati), [], 'non è l’Iniziativa della fonte');
  x = avanti(x, ADESSO); // Round 2, turno del nemico (la fonte)
  assert.equal(x.round, 2);
  assert.equal(diTurno(x).id, nemico.id);

  const dovute = perditeDovute(x, dati);
  assert.equal(dovute.length, 1, 'all’Iniziativa della fonte il Sanguinamento si applica');
  assert.equal(dovute[0].bersaglio, 'pg:lucas');
  assert.equal(dovute[0].valore, 1);
  assert.equal(dovute[0].stato, 'sanguinamento');

  // la plancia scrive i PV nel file del PG e conferma la perdita
  const applicata = applicaPerdita(x, dovute[0], { pvPrima: 18, pvDopo: 17 }, ADESSO, dati);
  assert.match(applicata.registro.at(-1).testo, /Sanguinamento: Lucas perde 1 PV \(PV 18 → 17\)/);
  assert.equal(testoPerdita(dovute[0], { pvPrima: 18, pvDopo: 17 }, dati), 'Sanguinamento: Lucas perde 1 PV (PV 18 → 17)');

  // nessun doppio conteggio: subito dopo non c'è più nulla da applicare in questo Round
  assert.deepEqual(perditeDovute(applicata, dati), [], 'una sola volta per Round');

  // Round 3: si applica di nuovo
  let y = avanti(applicata, ADESSO); // turno di Lucas
  y = avanti(y, ADESSO); // Round 3, turno del nemico
  assert.equal(y.round, 3);
  const seconde = perditeDovute(y, dati);
  assert.equal(seconde.length, 1, 'due volte di fila: anche al Round 3');
  const dopo = applicaPerdita(y, seconde[0], { pvPrima: 17, pvDopo: 16 }, ADESSO, dati);
  assert.deepEqual(perditeDovute(dopo, dati), []);
});

test('nessun doppio conteggio con due «Avanti» concorrenti', () => {
  const { s, nemico } = scontroPronto();
  let x = registraPeriodico(s, { bersaglio: 'pg:lucas', nome: 'Lucas', tipo: 'pg', chiave: 'lucas', stato: 'sanguinamento', valore: 1, fonte: nemico.id, fonteNome: nemico.nome }, ADESSO, dati);
  x = avanti(avanti(x, ADESSO), ADESSO); // Round 2, turno della fonte
  const dovuta = perditeDovute(x, dati)[0];
  const primo = applicaPerdita(x, dovuta, { pvPrima: 18, pvDopo: 17 }, ADESSO, dati);
  // seconda finestra della plancia: parte dallo stesso stato e prova ad applicare la stessa perdita
  assert.throws(() => applicaPerdita(primo, dovuta, { pvPrima: 18, pvDopo: 17 }, ADESSO, dati), /già applicata/i);
  // e dallo stato di prima, la perdita non è più dovuta una volta riletto quello salvato
  assert.deepEqual(perditeDovute(primo, dati), []);
  assert.equal(primo.registro.filter((r) => /Sanguinamento: Lucas perde/.test(r.testo)).length, 1);
});

test('il Sanguinamento si ferma quando lo Stato viene tolto', () => {
  const { s, nemico } = scontroPronto();
  let x = registraPeriodico(s, { bersaglio: 'pg:lucas', nome: 'Lucas', tipo: 'pg', chiave: 'lucas', stato: 'sanguinamento', valore: 1, fonte: nemico.id, fonteNome: nemico.nome }, ADESSO, dati);
  x = togliPeriodici(x, 'pg:lucas', ['sanguinamento'], ADESSO, dati);
  assert.deepEqual(periodiciDi(x, 'pg:lucas'), []);
  assert.match(x.registro.at(-1).testo, /Sanguinamento di Lucas: fermato/);
  x = avanti(avanti(x, ADESSO), ADESSO);
  assert.deepEqual(perditeDovute(x, dati), [], 'fermato: nessuna perdita');
});

test('§5.15: più Sanguinamenti non si sommano, si usa il valore più alto', () => {
  const { s, nemico } = scontroPronto();
  let x = registraPeriodico(s, { bersaglio: 'pg:lucas', nome: 'Lucas', tipo: 'pg', chiave: 'lucas', stato: 'sanguinamento', valore: 1, fonte: nemico.id, fonteNome: nemico.nome }, ADESSO, dati);
  x = registraPeriodico(x, { bersaglio: 'pg:lucas', nome: 'Lucas', tipo: 'pg', chiave: 'lucas', stato: 'sanguinamento', valore: 2, fonte: nemico.id, fonteNome: nemico.nome }, ADESSO, dati);
  const p = periodiciDi(x, 'pg:lucas');
  assert.equal(p.length, 1, 'una sola perdita per Stato e bersaglio');
  assert.equal(p[0].valore, 2, 'si usa il valore più alto');
  // un valore più basso non sostituisce quello in corso
  const y = registraPeriodico(x, { bersaglio: 'pg:lucas', nome: 'Lucas', tipo: 'pg', chiave: 'lucas', stato: 'sanguinamento', valore: 1, fonte: nemico.id, fonteNome: nemico.nome }, ADESSO, dati);
  assert.equal(periodiciDi(y, 'pg:lucas')[0].valore, 2);
});

test('Sanguinamento su un nemico: la plancia gli scala i PV nello scontro', () => {
  let s = nuovoScontro({ id: 'periodici-nemico', pg: [{ chiave: 'lucas', nome: 'Lucas', iniziativa: 9, des: 3, int: 2 }], adesso: ADESSO });
  s = aggiungiNemici(s, legionario, 1, {}, ADESSO);
  const nemico = s.partecipanti.find((p) => p.tipo === 'nemico');
  s = registraTiro(s, 'pg:lucas', 'd10', { valore: 9, origine: 'vivo' }, dati, ADESSO);
  s = registraTiro(s, nemico.id, 'd10', { valore: 1, origine: 'vivo' }, dati, ADESSO);
  // il PG fa Sanguinare il nemico: la fonte è il PG, che agisce primo
  let x = registraPeriodico(s, { bersaglio: nemico.id, nome: nemico.nome, tipo: 'nemico', stato: 'sanguinamento', valore: 2, fonte: 'pg:lucas', fonteNome: 'Lucas' }, ADESSO, dati);
  const pvPrima = nemico.pv.attuali;
  x = avanti(avanti(x, ADESSO), ADESSO); // Round 2, turno del PG (la fonte)
  const dovute = perditeDovute(x, dati);
  assert.equal(dovute.length, 1);
  assert.equal(dovute[0].tipo, 'nemico');
  assert.equal(dovute[0].pvPrima, pvPrima, 'per un nemico i PV stanno nello scontro');
  const dopo = applicaPerdita(x, dovute[0], null, ADESSO, dati);
  assert.equal(dopo.partecipanti.find((p) => p.id === nemico.id).pv.attuali, pvPrima - 2);
  assert.match(dopo.registro.at(-1).testo, new RegExp(`Sanguinamento: ${nemico.nome} perde 2 PV`));
});

test('a 0 PV la perdita non si applica da sé: serve la PS di Tempra (§5.15)', () => {
  const { s, nemico } = scontroPronto();
  let x = registraPeriodico(s, { bersaglio: 'pg:lucas', nome: 'Lucas', tipo: 'pg', chiave: 'lucas', stato: 'sanguinamento', valore: 1, fonte: nemico.id, fonteNome: nemico.nome }, ADESSO, dati);
  x = avanti(avanti(x, ADESSO), ADESSO);
  const dovuta = perditeDovute(x, dati)[0];
  const r = applicaPerdita(x, dovuta, { pvPrima: 0, pvDopo: 0 }, ADESSO, dati);
  assert.match(r.registro.at(-1).testo, /0 PV.*Tempra/i, 'il registro chiede la PS di Tempra');
  // la perdita resta in corso e non si riapplica da sé nello stesso Round
  assert.deepEqual(perditeDovute(r, dati), []);
});

test('fonte fuori dallo scontro: la perdita si applica alla fine del Round (Magia)', () => {
  const { s } = scontroPronto();
  let x = registraPeriodico(s, { bersaglio: 'pg:lucas', nome: 'Lucas', tipo: 'pg', chiave: 'lucas', stato: 'sanguinamento', valore: 1, fonte: null, fonteNome: 'una trappola' }, ADESSO, dati);
  const { ordinati } = ordineIniziativa(x);
  // all'ultimo turno del Round la perdita è dovuta
  let y = x;
  for (let i = 0; i < ordinati.length - 1; i++) y = avanti(y, ADESSO);
  assert.equal(y.round, 1);
  assert.equal(y.turno, ordinati.length - 1, 'ultimo turno del Round');
  // nel Round 1 l'ha già fatta il colpo; dal Round 2 in poi vale la fine del Round
  let z = avanti(y, ADESSO); // Round 2
  for (let i = 0; i < ordinati.length - 1; i++) z = avanti(z, ADESSO);
  assert.equal(perditeDovute(z, dati).length, 1, 'fonte senza Iniziativa: fine del Round');
});

test('Incendiato: perdita con il dado, Avvelenato: valore dalla fonte', () => {
  const { s, nemico } = scontroPronto();
  let x = registraPeriodico(s, { bersaglio: 'pg:lucas', nome: 'Lucas', tipo: 'pg', chiave: 'lucas', stato: 'incendiato', fonte: nemico.id, fonteNome: nemico.nome }, ADESSO, dati);
  assert.equal(periodiciDi(x, 'pg:lucas')[0].formula, '1d4', 'Incendiato: 1d4 dai dati, non un valore fisso');
  x = registraPeriodico(x, { bersaglio: 'pg:lucas', nome: 'Lucas', tipo: 'pg', chiave: 'lucas', stato: 'avvelenato', formula: '1d6', fonte: nemico.id, fonteNome: nemico.nome }, ADESSO, dati);
  assert.equal(periodiciDi(x, 'pg:lucas').length, 2);
  x = avanti(avanti(x, ADESSO), ADESSO);
  const dovute = perditeDovute(x, dati);
  assert.equal(dovute.length, 2);
  assert.ok(dovute.every((d) => d.formula && d.valore === null), 'il valore lo dà il dado al momento');
  // la plancia tira e passa il valore
  const dopo = applicaPerdita(x, { ...dovute[0], valore: 3, tiro: { valore: 3, origine: 'app' } }, { pvPrima: 10, pvDopo: 7 }, ADESSO, dati);
  assert.match(dopo.registro.at(-1).testo, /perde 3 PV \(PV 10 → 7\)/);
  assert.match(dopo.registro.at(-1).testo, /1d4/, 'la riga dice da dove viene il numero');
});

test('senza un valore Avvelenato resta un promemoria', () => {
  const { s, nemico } = scontroPronto();
  assert.throws(
    () => registraPeriodico(s, { bersaglio: 'pg:lucas', nome: 'Lucas', tipo: 'pg', chiave: 'lucas', stato: 'avvelenato', fonte: nemico.id, fonteNome: nemico.nome }, ADESSO, dati),
    /valore o una formula/i,
  );
});

test('§5.15: la prima applicazione toglie subito X PV, ignorando Armatura, Parata e Schivata', () => {
  const b = { nome: 'Lucas', pv: { attuali: 20, massimo: 20 }, ferite: 0, ar: { totale: 6, magica: 0 } };
  // il colpo passa l'Armatura di 4, poi Sanguinamento 1 toglie 1 PV subito, senza Armatura
  const r = applicaColpo(b, {
    danni: [10], natura: 'Naturale', tipo: 'ravvicinato', difesa: 'nessuna', proprieta: ['Sanguinante 1'],
    periodiciImmediati: [{ stato: 'sanguinamento', valore: 1 }],
  }, dati);
  assert.equal(r.applicazioni[0].finale, 4, '10 − AR 6 = 4');
  assert.equal(r.pv.dopo, 15, '20 − 4 (colpo) − 1 (Sanguinamento subito) = 15');
  assert.deepEqual(r.immediate.map((x) => [x.nome, x.valore, x.pvPrima, x.pvDopo]), [['Sanguinamento', 1, 16, 15]]);
  assert.match(testoColpo('Lucas', { natura: 'Naturale', proprieta: ['Sanguinante 1'] }, r), /Sanguinamento 1: −1 PV subito \(PV 16 → 15\)/);

  // la Schivata evita il colpo, ma lo Stato non viene applicato: nessuna perdita immediata da registrare
  const evitato = applicaColpo(b, { danni: [10], natura: 'Naturale', difesa: 'schivata', proprieta: ['Sanguinante 1'], periodiciImmediati: [] }, dati);
  assert.equal(evitato.pvPersi, 0);
  assert.deepEqual(evitato.stati, [], '§5.24: nessun effetto se l’Armatura non è superata');
});

test('§1.6: il Magistrale non raddoppia la perdita immediata del Sanguinamento', () => {
  const b = { nome: 'Lucas', pv: { attuali: 30, massimo: 30 }, ferite: 0, ar: { totale: 0, magica: 0 } };
  const r = applicaColpo(b, {
    danni: [5], natura: 'Naturale', difesa: 'nessuna', proprieta: ['Sanguinante 2'], magistrale: true,
    periodiciImmediati: [{ stato: 'sanguinamento', valore: 2 }],
  }, dati);
  assert.equal(r.applicazioni[0].dopoMoltiplicatore, 10, 'il colpo sì: 5 ×2');
  assert.equal(r.immediate[0].valore, 2, 'la perdita periodica no (§1.6)');
  assert.equal(r.pv.dopo, 18, '30 − 10 − 2');
});

test('§5.15: a 0 PV la perdita immediata non toglie PV e chiede la PS di Tempra', () => {
  const b = { nome: 'Lucas', pv: { attuali: 3, massimo: 20 }, ferite: 1, ar: { totale: 0, magica: 0 } };
  const r = applicaColpo(b, {
    danni: [3], natura: 'Naturale', difesa: 'nessuna', proprieta: ['Sanguinante 1'],
    periodiciImmediati: [{ stato: 'sanguinamento', valore: 1 }],
  }, dati);
  assert.equal(r.pv.dopo, 0, 'il colpo porta a 0 PV');
  assert.equal(r.immediate[0].pvDopo, 0, 'la perdita non scende sotto 0 e non toglie nulla');
  assert.ok(r.promemoria.some((x) => /Tempra/.test(x)));
});

test('gli Stati attivi senza una perdita registrata si riconoscono (Stato messo dalla scheda)', () => {
  const { s, nemico } = scontroPronto();
  // Marcello mette Sanguinamento dalla scheda del PG: nessuna perdita registrata nello scontro
  const mancanti = allineaPeriodici(s, [{ bersaglio: 'pg:lucas', nome: 'Lucas', tipo: 'pg', chiave: 'lucas', stati: ['sanguinamento'] }], dati);
  assert.deepEqual(mancanti.daRegistrare.map((x) => x.stato), ['sanguinamento']);
  // e una perdita in corso il cui Stato non c'è più va chiusa, ma non nel Round in cui è nata (la plancia
  // potrebbe non avere ancora riletto il file del PG dove lo Stato è stato appena scritto)
  let x = registraPeriodico(s, { bersaglio: nemico.id, nome: nemico.nome, tipo: 'nemico', stato: 'sanguinamento', valore: 1, fonte: 'pg:lucas', fonteNome: 'Lucas' }, ADESSO, dati);
  const senzaStato = [{ bersaglio: nemico.id, nome: nemico.nome, tipo: 'nemico', stati: [] }];
  assert.deepEqual(allineaPeriodici(x, senzaStato, dati).daChiudere, [], 'nel Round in cui nasce non si chiude');
  const r = allineaPeriodici(avanti(avanti(x, ADESSO), ADESSO), senzaStato, dati); // Round 2
  assert.deepEqual(r.daChiudere.map((y) => y.stato), ['sanguinamento']);
});

test('A.76: Sanguinante solo se almeno 1 danno supera l’AR; una perdita iniziale per attacco, la maggiore', () => {
  const b = { nome: 'Lucas', pv: { attuali: 20, massimo: 20 }, ferite: 0, ar: { totale: 0, magica: 0 } };
  // esempio della decisione: 20 PV, 5 danni e Sanguinante 2 → 13 PV
  const es = applicaColpo(b, { danni: [5], natura: 'Naturale', difesa: 'nessuna', proprieta: ['Sanguinante 2'], periodiciImmediati: [{ stato: 'sanguinamento', valore: 2 }] }, dati);
  assert.equal(es.pv.dopo, 13);
  // più colpi dello stesso attacco: una sola perdita iniziale, con il valore maggiore
  const raffica = applicaColpo(b, { danni: [3, 3], natura: 'Naturale', difesa: 'nessuna', proprieta: ['Sanguinante 2'],
    periodiciImmediati: [{ stato: 'sanguinamento', valore: 1 }, { stato: 'sanguinamento', valore: 2 }] }, dati);
  assert.deepEqual(raffica.immediate.map((x) => x.valore), [2]);
  assert.equal(raffica.pv.dopo, 20 - 6 - 2);
  // nessun danno oltre l'AR: lo Stato non si applica, anche se la finestra lo propone
  const corazzato = { ...b, ar: { totale: 10, magica: 0 } };
  const fermo = applicaColpo(corazzato, { danni: [5], natura: 'Naturale', difesa: 'nessuna', proprieta: ['Sanguinante 2'], periodiciImmediati: [{ stato: 'sanguinamento', valore: 2 }] }, dati);
  assert.deepEqual([fermo.immediate, fermo.pv.dopo], [[], 20]);
  assert.ok(fermo.promemoria.some((p) => /A\.76/.test(p)));
});
