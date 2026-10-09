// Regole aggiornate: completamento dei punti negli eventi già registrati (Giocatore, Doc del 27/09/2026:
// 10 Punti Abilità Liberi invece di 5, per-davide A.52) e riassegnazione dei punti che con i limiti del
// VA personale (Doc del 29/09/2026: categorie di competenza, §2.13, §8.3; per-davide A.57) non
// aumentano più il VA.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda, validaLivello } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza, annullaUltimoLivello, serializza } from '../src/character.js';
import { puntiDaCompletare, applicaCompletamento, validaCompletamento, statoCompletamento, statoRimozione, validaRimozione, applicaRimozione } from '../src/avanzamento.js';
import { validaDati } from '../src/validate.js';
import { preparaStampa } from '../src/stampa.js';
import { datiReali, copia, conPuntiLiberi } from './helpers.js';
import { MISHIMA_AGENTE, tiro } from './personaggi.js';

const { dati: reali } = await datiReali();
// il meccanismo del completamento è nato con le regole del 27/09 (da 5 a 10 punti per Grado): i test del
// completamento e della riassegnazione simulano le regole a 10; dal 04/10/2026 i punti sono 7 (Giocatore del 03/10 sera,
// confermato da Davide, A.90): i file salvati con 10 hanno punti in eccesso, quelli con 5 punti da assegnare (in fondo)
const dati = conPuntiLiberi(reali, 10);

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

// Correzione di Davide del 03/10/2026 (E&L): 5 Punti Abilità Liberi a ogni Grado, compreso il primo,
// anziché 10. Un personaggio salvato con la regola di prima (10 per Grado) ha punti in eccesso: la scheda
// resta utilizzabile, l'avviso dice quanti sono e dove, e «Togli» li toglie un evento alla volta.
const FILE_DIECI = serializza({ ...MISHIMA_AGENTE, puntiAbilitaLiberi: { 'Percezione': 2, 'Tecnologia': 2, 'Cultura': 2, 'Raggirare': 4 } }, {
  livelli: [
    { livello: 2, caratteristiche: { DES: 2 } },
    { livello: 3, talentoLibero: { id: 'iniziativa-migliorata' } },
    { livello: 4, grado: { classe: 'Agente' }, tiroPV: tiro(4), talentoClasse: 'Reazione Operativa', puntiAbilita: { 'Medicina': 1, 'Sopravvivenza': 3, 'Atletica': 3, 'Tecnologia': 3 } },
    { livello: 5, talentoLibero: { id: 'prova-salvezza-migliorata', parametro: 'tempra' } },
  ],
});
const caricaDieci = () => {
  const { creazione, livelli } = deserializzaPersonaggio(FILE_DIECI);
  return { creazione: normalizza(creazione, reali).scelte, livelli };
};

test('regole correnti: 7 Punti Abilità Liberi alla creazione e a ogni Grado (Giocatore del 03/10 sera, A.90)', () => {
  assert.equal(reali.regole.creazione.punti_abilita_liberi, 7);
  const eventi = reali.regole.avanzamento.eventi.flatMap((x) => x.eventi.filter((e) => e.startsWith('punti_abilita:')).map((e) => [x.livello, e]));
  assert.deepEqual(eventi, [4, 8, 12, 16, 20].map((l) => [l, 'punti_abilita:7']));
  // le frasi del Giocatore copiate nei dati (verificate da tools/verifica_frasi.mjs) dicono lo stesso numero
  for (const f of reali.regole.creazione.frasi) assert.match(f, /\b7 (Punti|punti)/);
});

// salvato con la regola del 03/10 (5 per Grado, E&L): con 7 ha 2 punti da assegnare per evento, nulla si aggiunge da solo
const FILE_CINQUE = serializza({ ...MISHIMA_AGENTE, puntiAbilitaLiberi: { 'Percezione': 2, 'Raggirare': 3 } }, {
  livelli: [
    { livello: 2, caratteristiche: { DES: 2 } },
    { livello: 3, talentoLibero: { id: 'iniziativa-migliorata' } },
    { livello: 4, grado: { classe: 'Agente' }, tiroPV: tiro(4), talentoClasse: 'Reazione Operativa', puntiAbilita: { 'Medicina': 1, 'Sopravvivenza': 2, 'Atletica': 2 } },
    { livello: 5, talentoLibero: { id: 'prova-salvezza-migliorata', parametro: 'tempra' } },
  ],
});

test('PG salvato con 5 punti per Grado: 2 punti da assegnare per evento, con «Assegna»; nulla aggiunto da solo', () => {
  const { creazione, livelli } = deserializzaPersonaggio(FILE_CINQUE);
  const p = { creazione: normalizza(creazione, reali).scelte, livelli };
  assert.deepEqual(p.creazione.puntiAbilitaLiberi, { 'Percezione': 2, 'Raggirare': 3 });
  const s = calcolaScheda(p, reali);
  assert.deepEqual(s.completamenti.map((c) => [c.livello, c.mancanti]), [[1, 2], [4, 2]]);
  assert.equal(s.avvisoPunti, null);
  // testo dell'avviso dai dati, con il numero dei punti (src/ui/tab.js)
  assert.equal(reali.regole.regole_aggiornate.mancanti.replaceAll('{n}', '4'), 'Con la regola aggiornata di Davide hai 4 punti Abilità liberi ancora da assegnare');
  // finché mancano, l'avanzamento è bloccato con il rimando ad «Assegna»
  assert.ok(validaLivello(p, { caratteristiche: { FOR: 1, COS: 1 } }, reali).some((e) => /assegna 4 Punti Abilità/.test(e.problema)));
  // «Assegna»: la creazione, poi il 4° livello
  assert.deepEqual(validaCompletamento(p, 1, { 'Tecnologia': 1, 'Cultura': 1 }, reali), []);
  const dopo = applicaCompletamento(applicaCompletamento(p, 1, { 'Tecnologia': 1, 'Cultura': 1 }), 4, { 'Tecnologia': 2 });
  const s2 = calcolaScheda(dopo, reali);
  assert.deepEqual([s2.completamenti, s2.errori, s2.avvisoPunti], [[], [], null]);
});

test('PG salvato con la regola vecchia (10 per Grado): avviso con il numero esatto e le Abilità, scheda utilizzabile, salita bloccata (A.108)', () => {
  const p = caricaDieci();
  // nulla tolto al caricamento: i punti liberi sono nel file, separati dai +1 di Classe
  assert.equal(Object.values(p.creazione.puntiAbilitaLiberi).reduce((t, v) => t + v, 0), 10);
  const s = calcolaScheda(p, reali);
  assert.deepEqual(s.eccessi.map((c) => [c.livello, c.previsti, c.assegnati, c.eccesso]), [[1, 7, 10, 3], [4, 7, 10, 3]]);
  const a = s.avvisoPunti;
  assert.ok(a, 'manca l’avviso dei punti in eccesso');
  assert.equal(a.totale, 6);
  assert.equal(a.testo, 'Con la regola aggiornata di Davide hai 6 punti Abilità liberi in più del consentito: togline 6');
  assert.deepEqual(a.eventi[0].abilita, { 'Percezione': 2, 'Tecnologia': 2, 'Cultura': 2, 'Raggirare': 4 });
  assert.equal(a.eventi[1].testo, '4° livello: 10 punti liberi su 7 consentiti, 3 da togliere (punti liberi a Medicina 1, Sopravvivenza 3, Atletica 3, Tecnologia 3)');
  // la scheda resta utilizzabile (nessun errore, nessun completamento, si stampa), ma la salita di livello è bloccata
  // finché la scheda non è riconciliata (A.108, E&L del 05/10/2026)
  assert.deepEqual([s.errori, s.completamenti], [[], []]);
  const blocco = validaLivello(p, { caratteristiche: { FOR: 1, COS: 1 } }, reali);
  assert.equal(blocco.length, 1);
  assert.match(blocco[0].problema, /Punti Abilità in eccesso \(A\.108\): prima di salire di livello togli 6 punti \(3 della creazione, 3 del 4° livello\)/);
  const st = preparaStampa(p, reali);
  assert.equal(st.avvisoPunti.totale, 6);
  assert.equal(st.fogli.find((f) => f.id === 'abilita').dati.avvisoPunti.testo, a.testo);
  // la creazione da sola (wizard): il validatore delle scelte segnala l'eccesso, senza bloccare
  const sc = calcolaScheda(p.creazione, reali);
  assert.ok(sc.errori.some((e) => e.campo === 'puntiAbilitaLiberi' && e.tipo === 'eccesso' && /3 punti in eccesso/.test(e.problema)));
  assert.equal(sc.completa, true);
});

test('«Togli»: l’evento lo sceglie il giocatore (A.108), solo punti liberi di quell’evento, esattamente l’eccesso', () => {
  let p = caricaDieci();
  // qualunque ordine: anche il 4° livello prima della creazione; un evento senza eccesso no
  assert.deepEqual(validaRimozione(p, 4, { 'Atletica': 3 }, reali), []);
  assert.equal(statoRimozione(p, {}, reali, 4).livello, 4);
  assert.deepEqual(statoRimozione(p, {}, reali).eventi.map((e) => [e.livello, e.eccesso]), [[1, 3], [4, 3]]);
  assert.match(validaRimozione(p, 2, { 'Atletica': 1 }, reali)[0].problema, /non ha punti in eccesso/);
  assert.match(validaRimozione(p, 1, { 'Medicina': 1 }, reali)[0].problema, /Medicina ha 0 punti liberi della creazione/);
  assert.deepEqual(validaRimozione(p, 1, { 'Raggirare': 2 }, reali).map((e) => e.tipo), ['incompleto']);
  assert.match(validaRimozione(p, 1, { 'Raggirare': 4, 'Cultura': 2 }, reali)[0].problema, /ne bastano 3/);
  const st = statoRimozione(p, { 'Raggirare': 2 }, reali);
  assert.deepEqual([st.livello, st.eccesso, st.rimasti], [1, 3, 1]);
  assert.deepEqual(st.abilita.map((x) => [x.nome, x.punti, x.togli]), [['Percezione', 2, 0], ['Tecnologia', 2, 0], ['Cultura', 2, 0], ['Raggirare', 4, 2]]);
  const creazione = { 'Raggirare': 2, 'Cultura': 1 };
  assert.deepEqual(validaRimozione(p, 1, creazione, reali), []);
  p = applicaRimozione(p, 1, creazione);
  assert.deepEqual(p.creazione.puntiAbilitaLiberi, { 'Percezione': 2, 'Tecnologia': 2, 'Cultura': 1, 'Raggirare': 2 });
  assert.equal(calcolaScheda(p, reali).avvisoPunti.testo, 'Con la regola aggiornata di Davide hai 3 punti Abilità liberi in più del consentito: togline 3');
  const quarto = { 'Sopravvivenza': 2, 'Atletica': 1 };
  assert.deepEqual(validaRimozione(p, 4, quarto, reali), []);
  p = applicaRimozione(p, 4, quarto);
  assert.deepEqual(p.livelli[2].puntiAbilita, { 'Medicina': 1, 'Sopravvivenza': 1, 'Atletica': 2, 'Tecnologia': 3 });
  const s = calcolaScheda(p, reali);
  assert.deepEqual([s.avvisoPunti, s.eccessi, s.errori, s.completamenti], [null, [], [], []]);
  assert.equal(statoRimozione(p, {}, reali), null);
});

test('personaggio nuovo con le regole correnti: nessun avviso', () => {
  const s = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, reali);
  assert.deepEqual([s.completamenti, s.eccessi, s.errori, s.avvisoPunti], [[], [], [], null]);
  // creazione in corso (altre scelte mancanti): resta un normale «incompleto» del wizard
  const inCorso = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, puntiAbilitaLiberi: {}, puntiCaratteristica: { FOR: 1 } }, livelli: [] }, reali);
  assert.deepEqual(inCorso.completamenti ?? [], []);
  assert.ok(inCorso.errori.some((e) => e.campo === 'creazione.puntiAbilitaLiberi' && e.tipo === 'incompleto'));
});

test('validatore dei dati: il testo dell’avviso dei punti in eccesso deve contenere «{n}»', () => {
  const d = copia(reali);
  d.regole.regole_aggiornate.eccesso = 'Hai troppi punti';
  assert.ok(validaDati(d).some((e) => /regole_aggiornate\.eccesso/.test(`${e.chiave ?? ''} ${e.messaggio ?? e.problema ?? JSON.stringify(e)}`)));
});
