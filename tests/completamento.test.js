// Regole aggiornate (Giocatore, Doc del 27/09/2026: Addestramenti a 76 punti, 10 Punti Abilità Liberi
// invece di 5; per-davide A.52): completamento dei punti negli eventi già registrati.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda, validaLivello } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza, annullaUltimoLivello } from '../src/character.js';
import { puntiDaCompletare, applicaCompletamento, validaCompletamento, statoCompletamento } from '../src/avanzamento.js';
import { preparaStampa } from '../src/stampa.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE, tiro } from './personaggi.js';

const { dati } = await datiReali();

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

test('formato precedente al 5° livello: basi nuove da sole, punti di Classe invariati, 10 punti da completare', () => {
  const p = carica();
  assert.deepEqual(p.creazione.puntiAbilitaLiberi, { 'Furtività': 2, 'Percezione': 2, 'Medicina': 1 }); // nulla tolto al caricamento
  const s = calcolaScheda(p, dati);
  assert.equal(s.livello, 5);
  // §2.4, Doc del 27/09: basi dell'Avventuriero rilette dai dati (Medicina 2 → 3, Armi medie 2 → 3)
  assert.equal(va(s, 'Medicina').base, 3);
  assert.equal(va(s, 'Armi medie').base, 3);
  // +1 di Classe dell'Agente al Grado I e al Grado II: non cambiano
  for (const a of ['Furtività', 'Percezione', 'Armi leggere', 'Cultura', 'Raggirare']) assert.equal(va(s, a).daClasse, 2, a);
  assert.equal(va(s, 'Medicina').daClasse, 0);
  // Medicina: Avanzamento 1 (creazione) + 3 (4° livello)
  assert.equal(va(s, 'Medicina').avanzamento, 4);
  assert.deepEqual(s.completamenti.map((c) => [c.livello, c.mancanti]), [[1, 5], [4, 5]]);
  assert.deepEqual(s.errori, []); // non sono errori: modalità tavolo, utility e stampa funzionano
  assert.ok(preparaStampa(p, dati).fogli.length >= 3);
  // l'avanzamento è bloccato, con il motivo
  const e = validaLivello(p, { caratteristiche: { FOR: 2 } }, dati);
  assert.equal(e.length, 1);
  assert.match(e[0].problema, /Regole aggiornate: prima di salire di livello assegna 10 Punti Abilità mancanti \(5 della creazione, 5 del 4° livello\)/);
});

test('completamento: un evento alla volta dal più vecchio, con i limiti di quell’evento', () => {
  let p = carica();
  // prima la creazione
  assert.match(validaCompletamento(p, 4, { 'Atletica': 5 }, dati)[0].problema, /prima la creazione/);
  // alla creazione l'Avanzamento massimo è 3: Furtività è già 1 + 2
  assert.ok(validaCompletamento(p, 1, { 'Furtività': 1 }, dati).some((e) => e.tipo === 'violazione' && /il massimo è 3/.test(e.problema)));
  // i punti non devono rendere irregolare un livello successivo: Medicina 1 + 3 al 4° è già 4
  assert.ok(validaCompletamento(p, 1, { 'Medicina': 1 }, dati).some((e) => /al 4° livello: Avanzamento 5/.test(e.problema)));
  // pannello: stessi dati della tabella di «Sali di livello», limite della creazione
  const st = statoCompletamento(p, { 'Armi leggere': 1 }, dati);
  assert.deepEqual([st.livello, st.mancanti, st.rimasti, st.limite], [1, 5, 4, 3]);
  assert.equal(st.abilita.find((a) => a.nome === 'Furtività').motivoPiu !== null, true);
  assert.equal(st.abilita.find((a) => a.nome === 'Atletica').motivoPiu, null);
  // meno dei mancanti: incompleto
  assert.deepEqual(validaCompletamento(p, 1, { 'Armi leggere': 1 }, dati).map((e) => e.tipo), ['incompleto']);

  const creazione = { 'Armi leggere': 1, 'Cultura': 1, 'Raggirare': 1, 'Atletica': 2 };
  assert.deepEqual(validaCompletamento(p, 1, creazione, dati), []);
  p = applicaCompletamento(p, 1, creazione);
  // registrato nella creazione, non come evento nuovo
  assert.equal(p.livelli.length, 4);
  assert.deepEqual(p.creazione.puntiAbilitaLiberi, { 'Furtività': 2, 'Percezione': 2, 'Medicina': 1, 'Armi leggere': 1, 'Cultura': 1, 'Raggirare': 1, 'Atletica': 2 });
  assert.deepEqual(puntiDaCompletare(p, dati).map((c) => [c.livello, c.mancanti]), [[4, 5]]);
  // al 4° livello il limite è 4
  assert.equal(statoCompletamento(p, {}, dati).limite, 4);
  const quarto = { 'Tecnologia': 3, 'Pilotare': 2 };
  assert.deepEqual(validaCompletamento(p, 4, quarto, dati), []);
  p = applicaCompletamento(p, 4, quarto);
  assert.deepEqual(p.livelli[2].puntiAbilita, { 'Medicina': 3, 'Sopravvivenza': 2, 'Tecnologia': 3, 'Pilotare': 2 });
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
  assert.equal(senza4.creazione.puntiAbilitaLiberi.Atletica, 2);
});

test('punti in eccesso rispetto alle regole correnti: non si tolgono, si segnalano', () => {
  const d = copia(dati);
  d.regole.creazione.punti_abilita_liberi = 5;
  for (const x of d.regole.avanzamento.eventi) x.eventi = x.eventi.map((e) => e.replace(/^punti_abilita:\d+$/, 'punti_abilita:5'));
  const livelli = [
    { livello: 2, caratteristiche: { DES: 2 } },
    { livello: 3, talentoLibero: { id: 'iniziativa-migliorata' } },
    { livello: 4, grado: { classe: 'Agente' }, tiroPV: tiro(4), talentoClasse: 'Reazione Operativa', puntiAbilita: { 'Medicina': 1, 'Sopravvivenza': 3, 'Atletica': 3, 'Tecnologia': 3 } },
  ];
  const creazione = normalizza(MISHIMA_AGENTE, d).scelte;
  assert.equal(Object.values(creazione.puntiAbilitaLiberi).reduce((s, v) => s + v, 0), 10); // nulla tolto
  const p = { creazione, livelli };
  const s = calcolaScheda(p, d);
  assert.deepEqual(s.eccessi.map((c) => [c.livello, c.eccesso]), [[1, 5], [4, 5]]);
  assert.deepEqual([s.errori, s.completamenti], [[], []]);
  assert.equal(calcolaScheda(creazione, d).completa, true);
  assert.deepEqual(validaLivello(p, { talentoLibero: { id: 'sempre-allerta' } }, d), []);
});

test('personaggio nuovo con le regole correnti: nessun avviso', () => {
  const s = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  assert.deepEqual([s.completamenti, s.eccessi, s.errori], [[], [], []]);
  // creazione in corso (altre scelte mancanti): resta un normale «incompleto» del wizard
  const inCorso = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, puntiAbilitaLiberi: {}, puntiCaratteristica: { FOR: 1 } }, livelli: [] }, dati);
  assert.deepEqual(inCorso.completamenti ?? [], []);
  assert.ok(inCorso.errori.some((e) => e.campo === 'creazione.puntiAbilitaLiberi' && e.tipo === 'incompleto'));
});
