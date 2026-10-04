// Successo Magistrale nel danno applicato al tavolo (Giocatore §1.6, riga «Combattimento»: «L’attacco colpisce
// e il danno viene raddoppiato; un danno già ×2 diventa ×3. Si applica prima della Parata e dell’Armatura, alla
// sola prima istanza»; §5.13, passo 3). Bug trovato da Marcello e Davide il 04/10/2026: un Magistrale di un nemico
// su un PG non raddoppiava il danno, perché il moltiplicatore lo applicava soltanto il pulsante «Tira con l’app»
// della finestra «Colpito» e non il motore. Qui si verifica la catena intera: proposta dell'attacco del nemico →
// colpo → applicaColpo → AR → PV, con lo stesso calcolo per i PG che colpiscono i nemici.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applicaColpo, moltiplicatoreMagistrale, testoColpo } from '../src/danno.js';
import { attacchiDi, calcolaAttaccoNemico, propostaColpo } from '../src/nemico-attacco.js';
import { nuovoScontro, aggiungiNemici } from '../src/scontro.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const leggi = (f) => JSON.parse(readFileSync(new URL(`../esempi/${f}`, import.meta.url), 'utf8'));

// PG di prova: 20 PV, AR 4 non magica (come un Lucas al tavolo)
const lucas = () => ({ nome: 'Lucas', pv: { attuali: 20, massimo: 20 }, ferite: 0, ar: { totale: 4, magica: 0 } });
const colpo = (danni, extra = {}) => ({ danni, natura: 'Naturale', tipo: 'ravvicinato', difesa: 'nessuna', proprieta: [], ...extra });

test('§1.6: il Magistrale raddoppia il danno prima dell’Armatura, anche scritto dal vivo', () => {
  // dadi + bonus ordinari = 10 (quello che si scrive nella finestra, tirato con i dadi veri)
  const normale = applicaColpo(lucas(), colpo([10]), dati);
  assert.equal(normale.pvPersi, 6, '10 − AR 4 = 6');

  const magi = applicaColpo(lucas(), colpo([10], { magistrale: true }), dati);
  assert.equal(magi.applicazioni[0].dopoMoltiplicatore, 20, '§1.6: 10 ×2 = 20, prima dell’Armatura');
  assert.equal(magi.applicazioni[0].finale, 16, '20 − AR 4 = 16');
  assert.equal(magi.pv.dopo, 4);
  assert.equal(magi.pvPersi, 16);
  // il raddoppio prima dell'Armatura, non dopo: 10 − 4 = 6, poi ×2 farebbe 12, che è sbagliato
  assert.notEqual(magi.pvPersi, 12, 'il moltiplicatore non si applica dopo l’Armatura');
});

test('§1.6: un danno già ×2 diventa ×3 con il Magistrale, e il ×3 resta ×3', () => {
  assert.equal(moltiplicatoreMagistrale(1, dati), 2);
  assert.equal(moltiplicatoreMagistrale(2, dati), 3);
  assert.equal(moltiplicatoreMagistrale(3, dati), 3);
  // Carica: danno ×2 (§5.12). Con il Magistrale ×3, non ×4.
  const carica = applicaColpo(lucas(), colpo([10], { moltiplicatore: 2, magistrale: true }), dati);
  assert.equal(carica.applicazioni[0].dopoMoltiplicatore, 30, '10 ×3 = 30');
  assert.equal(carica.pvPersi, 20, '30 − AR 4 = 26, ma non si scende sotto 0 PV');
  // senza Magistrale la Carica resta ×2
  assert.equal(applicaColpo(lucas(), colpo([10], { moltiplicatore: 2 }), dati).applicazioni[0].dopoMoltiplicatore, 20);
});

test('§1.6: nelle applicazioni multiple il Magistrale vale solo per la prima', () => {
  // Raffica o AC 2: la prima applicazione ×2, le altre intere
  const r = applicaColpo({ ...lucas(), pv: { attuali: 60, massimo: 60 } }, colpo([10, 10], { magistrale: true, tipo: 'distanza' }), dati);
  assert.equal(r.applicazioni[0].dopoMoltiplicatore, 20);
  assert.equal(r.applicazioni[1].dopoMoltiplicatore, 10, '§1.6: solo la prima istanza');
  assert.equal(r.pvPersi, 16 + 6);
});

test('§1.6: la Parata dimezza il danno già moltiplicato; la Parata Magistrale lo annulla', () => {
  // §5.13: moltiplicatore (passo 3) → Difesa → Armatura
  const parata = applicaColpo(lucas(), colpo([10], { magistrale: true, difesa: 'parata' }), dati);
  assert.equal(parata.applicazioni[0].dopoMoltiplicatore, 20);
  assert.equal(parata.applicazioni[0].dopoDifesa, 10, 'dimezza per eccesso dopo il moltiplicatore');
  assert.equal(parata.pvPersi, 6);
  assert.equal(applicaColpo(lucas(), colpo([10], { magistrale: true, difesa: 'parata_magistrale' }), dati).pvPersi, 0);
});

test('il registro dice «Magistrale» e mostra il danno raddoppiato con la provenienza', () => {
  const c = colpo([10], { magistrale: true });
  const r = applicaColpo(lucas(), c, dati);
  const t = testoColpo('Lucas', c, r);
  assert.match(t, /Magistrale/, 'il registro dello scontro dice che è un Magistrale');
  assert.match(t, /10 ×2 = 20/, 'il danno raddoppiato è nella riga');
  assert.match(t, /PV 20 → 4/);
  // provenienza del danno dell'applicazione: dadi e bonus, moltiplicatore, Armatura
  const righe = r.applicazioni[0].provenienza.righe.map((x) => x.fonte).join(' | ');
  assert.match(righe, /Magistrale/);
});

test('Magistrale di un nemico su un PG: catena intera dall’attacco ai PV (Lama nefaria)', () => {
  const legionario = leggi('nemici/legionario-oscuro.json');
  const s = aggiungiNemici(nuovoScontro({ id: 'magistrale-prova', pg: [] }), legionario, 1);
  const p = s.partecipanti[0];
  const i = attacchiDi(p).findIndex((a) => a.nome === 'Lama nefaria');
  const { attacco, risultato } = calcolaAttaccoNemico(p, i, {}, dati);

  const proposta = propostaColpo(attacco, risultato, { magistrale: true });
  assert.equal(proposta.magistrale, true, '«Attacca!» passa il Magistrale a «Colpito»');
  assert.equal(proposta.moltiplicatore, 1, 'nessun moltiplicatore proprio: lo applica il motore');
  assert.equal(proposta.formula, '1d10+3');

  // la finestra «Colpito» costruisce il colpo dalla proposta: danno 10 (1d10+3 con un 7), Magico, Perforante 1
  const bersaglio = lucas();
  const c = { danni: [10], natura: proposta.natura, tipo: proposta.tipo, difesa: 'nessuna', proprieta: proposta.proprieta, moltiplicatore: proposta.moltiplicatore, magistrale: proposta.magistrale };
  const r = applicaColpo(bersaglio, c, dati);
  // AR 4 non magica − Perforante 1 = 3; 10 ×2 = 20 − 3 = 17
  assert.equal(r.applicazioni[0].ar.valore, 3);
  assert.equal(r.applicazioni[0].finale, 17);
  assert.equal(r.pv.dopo, 3, 'PV 20 → 3');
  // senza Magistrale sarebbero 7 danni: il bug applicava questi
  assert.equal(applicaColpo(bersaglio, { ...c, magistrale: false }, dati).pvPersi, 7);
});

test('attacco a distanza di un nemico: il Magistrale vale come in ravvicinato', () => {
  const legionario = leggi('nemici/legionario-oscuro.json');
  const s = aggiungiNemici(nuovoScontro({ id: 'magistrale-distanza', pg: [] }), legionario, 1);
  const p = s.partecipanti[0];
  const i = attacchiDi(p).findIndex((a) => a.tipo === 'distanza');
  const { attacco, risultato } = calcolaAttaccoNemico(p, i, { distanza: 20 }, dati);
  const proposta = propostaColpo(attacco, risultato, { magistrale: true });
  assert.equal(proposta.magistrale, true);
  const r = applicaColpo(lucas(), { danni: [6], natura: proposta.natura, tipo: proposta.tipo, difesa: 'nessuna', proprieta: proposta.proprieta, moltiplicatore: proposta.moltiplicatore, magistrale: true }, dati);
  assert.equal(r.applicazioni[0].dopoMoltiplicatore, 12);
  assert.equal(r.pvPersi, 8, '12 − AR 4 = 8');
});

test('Spazzata di un nemico: la proposta porta il Magistrale, e ogni bersaglio ha il suo colpo', () => {
  // §5.12: la Spazzata colpisce più bersagli; «Colpito» si apre su uno per volta, ciascuno con il proprio esito.
  // «Restano valide le regole generali sul Successo Magistrale per gli attacchi con più istanze di danno» (§3.9).
  const mishima = leggi('nemici/umani/guerriero-mishima-veterano.json');
  const s = aggiungiNemici(nuovoScontro({ id: 'magistrale-spazzata', pg: [] }), mishima, 1);
  const p = s.partecipanti[0];
  const i = attacchiDi(p).findIndex((a) => a.tipo !== 'distanza');
  const { attacco, risultato } = calcolaAttaccoNemico(p, i, { manovra: 'spazzata' }, dati);
  assert.ok(risultato.danno || risultato.danno_per_colpo, 'la Spazzata ha un danno');
  const proposta = propostaColpo(attacco, risultato, { magistrale: true });
  assert.equal(proposta.magistrale, true, 'il Magistrale arriva a «Colpito» anche con la Spazzata');
  // il bersaglio colpito magistralmente raddoppia; gli altri no
  const primo = applicaColpo(lucas(), colpo([8], { magistrale: true, moltiplicatore: proposta.moltiplicatore }), dati);
  const altro = applicaColpo(lucas(), colpo([8], { moltiplicatore: proposta.moltiplicatore }), dati);
  assert.equal(primo.pvPersi, 12, '8 ×2 = 16 − AR 4');
  assert.equal(altro.pvPersi, 4, 'l’altro bersaglio non riceve il raddoppio');
});

test('un PG che colpisce un nemico dalla plancia usa lo stesso calcolo', () => {
  const legionario = leggi('nemici/legionario-oscuro.json');
  const s = aggiungiNemici(nuovoScontro({ id: 'magistrale-pg', pg: [] }), legionario, 1);
  const p = s.partecipanti[0];
  const bersaglio = { nome: p.nome, pv: p.pv, ferite: p.ferite ?? 0, ar: p.scheda.ar };
  const senza = applicaColpo(bersaglio, colpo([9]), dati);
  const con = applicaColpo(bersaglio, colpo([9], { magistrale: true }), dati);
  assert.equal(con.applicazioni[0].dopoMoltiplicatore, 18);
  assert.equal(con.pvPersi, senza.applicazioni[0].finale + 9, 'il raddoppio passa interamente ai PV quando l’AR è già scalata');
});

test('il Magistrale non moltiplica le perdite periodiche (§1.6: «Danni persistenti, Sanguinamento…»)', () => {
  const c = colpo([10], { magistrale: true, proprieta: ['Sanguinante 1'] });
  const r = applicaColpo(lucas(), c, dati);
  const sang = r.stati.find((x) => x.id === 'sanguinamento');
  assert.ok(sang, 'Sanguinante applica lo Stato');
  assert.equal(sang.valore, 1, 'il valore X resta 1, non raddoppiato');
});
