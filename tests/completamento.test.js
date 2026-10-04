// Regole aggiornate: completamento dei punti negli eventi già registrati (Giocatore, Doc del 27/09/2026:
// 10 Punti Abilità Liberi invece di 5, per-davide A.52) e riassegnazione dei punti che con i limiti del
// VA personale (Doc del 29/09/2026: categorie di competenza, §2.13, §8.3; per-davide A.57) non
// aumentano più il VA. E&L del 03/10/2026: 5 punti a ogni Grado, compreso il primo; i punti in più si tolgono con
// «Togli» (puntiDaTogliere, statoRiduzione, validaRiduzione, applicaRiduzione).
// Il completamento si prova con le regole del 29/09 (10 punti, copia dei dati): il meccanismo non dipende dal numero.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda, validaLivello } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza, annullaUltimoLivello } from '../src/character.js';
import { puntiDaCompletare, applicaCompletamento, validaCompletamento, statoCompletamento, puntiDaTogliere, statoRiduzione, validaRiduzione, applicaRiduzione } from '../src/avanzamento.js';
import { preparaStampa } from '../src/stampa.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE, tiro } from './personaggi.js';

const { dati: DATI } = await datiReali();
// regole del 29/09: 10 Punti Abilità Liberi per Grado
const dati = copia(DATI);
dati.regole.creazione.punti_abilita_liberi = 10;
for (const x of dati.regole.avanzamento.eventi) x.eventi = x.eventi.map((e) => e.replace(/^punti_abilita:\d+$/, 'punti_abilita:10'));

// Mishima Avventuriero Agente al 5° livello, esportato con le regole di prima (formato 6, 5 punti
// liberi alla creazione e al 4° livello)
const FILE_VECCHIO = JSON.stringify({
  formato: 'mutant-personaggio',
  versione: 6,
  scelte: { ...MISHIMA_AGENTE, puntiAbilitaLiberi: { 'Furtività': 2, 'Percezione': 2, 'Medicina': 1 } },
  livelli: [
    { livello: 2, caratteristiche: { DES: 2 } },
    { livello: 3, talentoLibero: { id: 'iniziativa-migliorata' } },
    { livello: 4, grado: { classe: 'Agente' }, tiroPV: tiro(4), talentoClasse: 'Reazione Operativa', puntiAbilita: { 'Medicina': 3, 'Sopravvivenza': 2 } },
    { livello: 5, talentoLibero: { id: 'prova-salvezza-migliorata', parametro: 'tempra' } },
  ],
});

const carica = () => {
  const { creazione, livelli } = deserializzaPersonaggio(FILE_VECCHIO);
  return { creazione: normalizza(creazione, dati).scelte, livelli };
};
const va = (s, nome) => s.abilita.find((a) => a.nome === nome);

test('formato precedente al 5° livello: basi nuove da sole, punti di Classe invariati, punti da completare e da riassegnare', () => {
  const p = carica();
  assert.deepEqual(p.creazione.puntiAbilitaLiberi, { 'Furtività': 2, 'Percezione': 2, 'Medicina': 1 }); // nulla tolto al caricamento
  const s = calcolaScheda(p, dati);
  assert.equal(s.livello, 5);
  // §2.3 del 29/09: basi dalla prima Classe (Agente: Medicina G 5, Armi medie G 5, Furtività P 6)
  assert.deepEqual(['Medicina', 'Armi medie', 'Furtività'].map((n) => [va(s, n).competenza, va(s, n).base]), [['G', 5], ['G', 5], ['P', 6]]);
  // +1 di Classe dell'Agente al Grado I e al Grado II: sempre registrati
  for (const a of ['Furtività', 'Percezione', 'Armi leggere', 'Cultura', 'Raggirare']) assert.equal(va(s, a).daClasse, 2, a);
  assert.equal(va(s, 'Medicina').daClasse, 0);
  // Furtività (P): 2 + 6 + 0 + 1 = 9 = limite del I Grado alla creazione: i 2 punti liberi sono inattivi;
  // Medicina (G): 2 + 5 = 7 = limite: il punto della creazione è inattivo; al 4° (limite 9) su 3 punti
  // ne entrano 2
  assert.deepEqual(s.completamenti.map((c) => [c.livello, c.mancanti, c.inattivi]), [[1, 8, { 'Furtività': 2, 'Medicina': 1 }], [4, 6, { 'Medicina': 1 }]]);
  assert.deepEqual([va(s, 'Furtività').liberi, va(s, 'Medicina').liberi], [0, 2]);
  assert.deepEqual(s.errori, []); // non sono errori: modalità tavolo, utility e stampa funzionano
  assert.ok(preparaStampa(p, dati).fogli.length >= 3);
  // l'avanzamento è bloccato, con il motivo
  const e = validaLivello(p, { caratteristiche: { FOR: 2 } }, dati);
  assert.equal(e.length, 1);
  assert.match(e[0].problema, /Regole aggiornate: prima di salire di livello assegna o riassegna 14 Punti Abilità \(8 della creazione, 6 del 4° livello\)/);
});

test('completamento: un evento alla volta dal più vecchio, con i limiti di quell’evento', () => {
  let p = carica();
  // prima la creazione
  assert.match(validaCompletamento(p, 4, { 'Atletica': 5 }, dati)[0].problema, /prima la creazione/);
  // alla creazione Furtività è già al limite P del I Grado (9): nessun punto la aumenta
  assert.ok(validaCompletamento(p, 1, { 'Furtività': 1 }, dati).some((e) => e.tipo === 'violazione' && /già al limite/.test(e.problema)));
  // pannello: stessi dati della tabella di «Sali di livello», limite per Abilità
  const st = statoCompletamento(p, { 'Tecnologia': 1 }, dati);
  assert.deepEqual([st.livello, st.mancanti, st.rimasti, st.riassegna], [1, 8, 7, true]);
  const ab = (n) => st.abilita.find((a) => a.nome === n);
  assert.deepEqual([ab('Furtività').limite, ab('Furtività').totale, ab('Furtività').inattivi], [9, 9, 2]);
  assert.equal(ab('Furtività').motivoPiu !== null, true);
  assert.equal(ab('Raggirare').motivoPiu, null);
  // meno dei mancanti: incompleto
  assert.deepEqual(validaCompletamento(p, 1, { 'Tecnologia': 1 }, dati).map((e) => e.tipo), ['incompleto']);

  // i punti inattivi escono dall'evento, quelli nuovi entrano; registrato nella creazione
  const creazione = { 'Tecnologia': 2, 'Cultura': 2, 'Raggirare': 4 };
  assert.deepEqual(validaCompletamento(p, 1, creazione, dati), []);
  p = applicaCompletamento(p, 1, creazione, puntiDaCompletare(p, dati)[0].inattivi);
  assert.equal(p.livelli.length, 4);
  assert.deepEqual(p.creazione.puntiAbilitaLiberi, { 'Percezione': 2, 'Tecnologia': 2, 'Cultura': 2, 'Raggirare': 4 });
  assert.deepEqual(puntiDaCompletare(p, dati).map((c) => [c.livello, c.mancanti]), [[4, 6]]);
  const quarto = { 'Tecnologia': 3, 'Pilotare': 3 };
  assert.deepEqual(validaCompletamento(p, 4, quarto, dati), []);
  p = applicaCompletamento(p, 4, quarto, puntiDaCompletare(p, dati)[0].inattivi);
  assert.deepEqual(p.livelli[2].puntiAbilita, { 'Medicina': 2, 'Sopravvivenza': 2, 'Tecnologia': 3, 'Pilotare': 3 });
  assert.deepEqual(puntiDaCompletare(p, dati), []);
  const s = calcolaScheda(p, dati);
  assert.deepEqual([s.errori, s.completamenti, s.eccessi], [[], [], []]);
  // avanzamento sbloccato
  assert.deepEqual(validaLivello(p, { caratteristiche: { FOR: 1, COS: 1 } }, dati), []);
  // annullare l'ultimo livello si comporta come prima; annullato il 4°, i suoi punti (anche quelli
  // completati) se ne vanno con lui, quelli della creazione restano
  const senza4 = annullaUltimoLivello(annullaUltimoLivello(p));
  assert.equal(senza4.livelli.length, 2);
  assert.deepEqual(puntiDaCompletare(senza4, dati), []);
  assert.equal(senza4.creazione.puntiAbilitaLiberi.Raggirare, 4);
});

test('riassegnazione: i punti nuovi non devono rendere inattivi quelli dei livelli successivi (§8.3)', () => {
  // creazione con 2 punti inattivi su Furtività; al 4° livello 3 punti su Tecnologia (P, limite 11)
  const p = {
    creazione: { ...MISHIMA_AGENTE, puntiAbilitaLiberi: { 'Percezione': 2, 'Cultura': 2, 'Raggirare': 4, 'Furtività': 2 } },
    livelli: [
      { livello: 2, caratteristiche: { DES: 2 } },
      { livello: 3, talentoLibero: { id: 'iniziativa-migliorata' } },
      { livello: 4, grado: { classe: 'Agente' }, tiroPV: tiro(4), talentoClasse: 'Reazione Operativa', puntiAbilita: { 'Tecnologia': 3, 'Medicina': 2, 'Pilotare': 2, 'Oratoria': 3 } },
    ],
  };
  assert.deepEqual(puntiDaCompletare(p, dati).map((c) => [c.livello, c.mancanti]), [[1, 2]]);
  // Tecnologia alla creazione: 0 + 6 → 8, poi al 4° 8 + 3 = 11 = limite: resta tutto attivo
  assert.deepEqual(validaCompletamento(p, 1, { 'Tecnologia': 2 }, dati), []);
  // con 4 punti su Tecnologia al 4° livello lo spazio non c'è più: 8 + 4 = 12 oltre il limite 11
  const oltre = { ...p, livelli: p.livelli.map((v) => (v.livello === 4 ? { ...v, puntiAbilita: { 'Tecnologia': 4, 'Medicina': 2, 'Pilotare': 2, 'Oratoria': 2 } } : v)) };
  assert.ok(validaCompletamento(oltre, 1, { 'Tecnologia': 2 }, dati).some((x) => /renderebbe inattivi 1 punti di Tecnologia del 4° livello/.test(x.problema)));
});

test('E&L del 03/10/2026: 5 punti per Grado; i punti in più non si tolgono da soli, si segnalano e si tolgono con «Togli»', () => {
  assert.equal(DATI.regole.creazione.punti_abilita_liberi, 5);
  assert.ok(DATI.regole.avanzamento.eventi.filter((x) => x.eventi.some((e) => e.startsWith('punti_abilita:'))).every((x) => x.eventi.includes('punti_abilita:5')));
  const livelli = [
    { livello: 2, caratteristiche: { DES: 2 } },
    { livello: 3, talentoLibero: { id: 'iniziativa-migliorata' } },
    { livello: 4, grado: { classe: 'Agente' }, tiroPV: tiro(4), talentoClasse: 'Reazione Operativa', puntiAbilita: { 'Medicina': 1, 'Sopravvivenza': 3, 'Atletica': 3, 'Tecnologia': 3 } },
  ];
  const vecchia = { ...MISHIMA_AGENTE, puntiAbilitaLiberi: { 'Percezione': 2, 'Tecnologia': 2, 'Cultura': 2, 'Raggirare': 4 } };
  const creazione = normalizza(vecchia, DATI).scelte;
  assert.equal(Object.values(creazione.puntiAbilitaLiberi).reduce((t, v) => t + v, 0), 10); // nulla tolto al caricamento
  let p = { creazione, livelli };
  const s0 = calcolaScheda(p, DATI);
  assert.deepEqual(s0.eccessi.map((c) => [c.livello, c.eccesso]), [[1, 5], [4, 5]]);
  assert.deepEqual([s0.errori, s0.completamenti], [[], []]);
  // l'avanzamento è bloccato con l'avviso di Davide
  const blocco = validaLivello(p, { talentoLibero: { id: 'sempre-allerta' } }, DATI);
  assert.match(blocco[0].problema, /^Con la nuova regola di Davide hai 10 punti Abilità liberi in più del consentito: togline 10/);
  // «Togli»: un evento alla volta dal più vecchio, esattamente i punti in eccesso, non più di quelli assegnati
  assert.match(validaRiduzione(p, 4, { 'Tecnologia': 3, 'Atletica': 2 }, DATI)[0].problema, /prima la creazione/);
  assert.ok(validaRiduzione(p, 1, { 'Cultura': 3 }, DATI).some((e) => /Cultura: in questo evento ha 2 punti liberi/.test(e.problema)));
  assert.deepEqual(validaRiduzione(p, 1, { 'Cultura': 2 }, DATI).map((e) => e.tipo), ['incompleto']);
  const st = statoRiduzione(p, { 'Cultura': 2 }, DATI);
  assert.deepEqual([st.livello, st.eccesso, st.rimasti], [1, 5, 3]);
  assert.deepEqual(st.abilita.map((a) => [a.nome, a.punti, a.togli]), [['Percezione', 2, 0], ['Tecnologia', 2, 0], ['Cultura', 2, 2], ['Raggirare', 4, 0]]);
  const togli1 = { 'Cultura': 2, 'Tecnologia': 2, 'Raggirare': 1 };
  assert.deepEqual(validaRiduzione(p, 1, togli1, DATI), []);
  p = applicaRiduzione(p, 1, togli1);
  assert.deepEqual(p.creazione.puntiAbilitaLiberi, { 'Percezione': 2, 'Raggirare': 3 });
  assert.deepEqual(puntiDaTogliere(p, DATI).map((c) => [c.livello, c.eccesso]), [[4, 5]]);
  // al 4° livello Sopravvivenza e Atletica hanno un punto che non aumenta il VA (§8.3): «Togli» lo indica e conviene toglierlo
  assert.deepEqual(statoRiduzione(p, {}, DATI).abilita.filter((x) => x.inattivi).map((x) => [x.nome, x.inattivi]), [['Sopravvivenza', 1], ['Atletica', 1]]);
  p = applicaRiduzione(p, 4, { 'Sopravvivenza': 1, 'Atletica': 3, 'Tecnologia': 1 });
  const s1 = calcolaScheda(p, DATI);
  assert.deepEqual([s1.errori, s1.completamenti, s1.eccessi], [[], [], []]);
  assert.deepEqual(validaLivello(p, { talentoLibero: { id: 'sempre-allerta' } }, DATI), []);
});

test('personaggio nuovo con le regole correnti: nessun avviso', () => {
  const dati = DATI;
  const s = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  assert.deepEqual([s.completamenti, s.eccessi, s.errori], [[], [], []]);
  // creazione in corso (altre scelte mancanti): resta un normale «incompleto» del wizard
  const inCorso = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, puntiAbilitaLiberi: {}, puntiCaratteristica: { FOR: 1 } }, livelli: [] }, dati);
  assert.deepEqual(inCorso.completamenti ?? [], []);
  assert.ok(inCorso.errori.some((e) => e.campo === 'creazione.puntiAbilitaLiberi' && e.tipo === 'incompleto'));
});
