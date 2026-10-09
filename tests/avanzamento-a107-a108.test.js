// A.107 (correzioni retroattive dell'avanzamento) e A.108 (Punti Abilità liberi in eccesso), risposte approvate da
// Davide il 05/10/2026 (E&L): src/avanzamento.js → validaCorrezione, conseguenzeCorrezione, applicaCorrezione,
// personaggioPrimaDi, motivoEccesso, validaLivello, statoRimozione, validaRimozione.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda, validaLivello } from '../src/calc.js';
import {
  validaCorrezione, conseguenzeCorrezione, applicaCorrezione, personaggioPrimaDi, puntiDaCompletare, applicaCompletamento,
  validaCompletamento, statoCompletamento, statoRimozione, validaRimozione, applicaRimozione,
} from '../src/avanzamento.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE, tiro } from './personaggi.js';

const { dati } = await datiReali();
const QUARTO = { 'Tecnologia': 3, 'Medicina': 2, 'Sopravvivenza': 2 };
// Mishima Agente al 6° livello con le regole correnti (7 punti per Grado): DES +2 al 2°, Grado II di Agente al 4°
const pg = (pa4 = QUARTO, sesto = { INT: 1, COS: 1 }) => ({
  creazione: { ...MISHIMA_AGENTE, puntiAbilitaLiberi: { 'Percezione': 2, 'Tecnologia': 1, 'Cultura': 1, 'Raggirare': 3 } },
  livelli: [
    { livello: 2, caratteristiche: { DES: 2 } },
    { livello: 3, talentoLibero: { id: 'iniziativa-migliorata' } },
    { livello: 4, grado: { classe: 'Agente' }, tiroPV: tiro(4), talentoClasse: 'Reazione Operativa', puntiAbilita: pa4 },
    { livello: 5, talentoLibero: { id: 'prova-salvezza-migliorata', parametro: 'tempra' } },
    { livello: 6, caratteristiche: sesto },
  ],
});
const ab = (p, nome) => calcolaScheda(p, dati).abilita.find((a) => a.nome === nome);

test('punto di partenza: scheda regolare, nessun avviso, salita di livello libera', () => {
  const s = calcolaScheda(pg(), dati);
  assert.deepEqual([s.errori, s.completamenti, s.eccessi, s.avvisoPunti], [[], [], [], null]);
  assert.deepEqual(validaLivello(pg(), { talentoLibero: { id: 'riflessi-fulminei' } }, dati).filter((e) => e.campo === 'livelli'), []);
});

test('A.107: si corregge un livello passato; il punto successivo che non aumenta più il VA si riassegna nello stesso evento', () => {
  const p = pg();
  const voce = { caratteristiche: { INT: 2 } }; // al 2° livello INT +2 al posto di DES +2
  // la correzione è valida e dice cosa cambia dopo: 1 punto di Tecnologia del 4° livello da riassegnare
  assert.deepEqual(validaCorrezione(p, 2, voce, dati), []);
  assert.deepEqual(conseguenzeCorrezione(p, 2, voce, dati), [{ livello: 4, evento: '4° livello', abilita: { 'Tecnologia': 1 }, tornano: {} }]);
  // la procedura parte dal personaggio fino al livello prima
  assert.equal(personaggioPrimaDi(p, 2).livelli.length, 0);
  assert.equal(personaggioPrimaDi(p, 4).livelli.length, 2);
  const c = applicaCorrezione(p, 2, voce);
  assert.deepEqual(c.livelli[0], { caratteristiche: { INT: 2 }, livello: 2 });
  assert.equal(c.livelli.length, 5); // i livelli successivi restano
  // ricalcolo in ordine: il 4° livello ha 1 punto da riassegnare, gli altri restano com'erano
  const da = puntiDaCompletare(c, dati);
  assert.deepEqual(da.map((x) => [x.livello, x.mancanti, x.inattivi]), [[4, 1, { 'Tecnologia': 1 }]]);
  assert.deepEqual(c.livelli[2].puntiAbilita, QUARTO);
  // salita bloccata finché non si riassegna
  assert.match(validaLivello(c, { talentoLibero: { id: 'riflessi-fulminei' } }, dati)[0].problema, /riassegna 1 Punti Abilità \(1 del 4° livello\)/);
  // riassegnazione nello stesso evento, con i limiti di allora: non di nuovo su Tecnologia
  assert.ok(validaCompletamento(c, 4, { 'Tecnologia': 1 }, dati).some((e) => e.tipo === 'violazione'));
  assert.equal(statoCompletamento(c, {}, dati).abilita.find((a) => a.nome === 'Tecnologia').inattivi, 1);
  assert.deepEqual(validaCompletamento(c, 4, { 'Atletica': 1 }, dati), []);
  const ok = applicaCompletamento(c, 4, { 'Atletica': 1 }, da[0].inattivi);
  assert.deepEqual(ok.livelli[2].puntiAbilita, { 'Tecnologia': 2, 'Medicina': 2, 'Sopravvivenza': 2, 'Atletica': 1 });
  const s = calcolaScheda(ok, dati);
  assert.deepEqual([s.errori, s.completamenti, s.eccessi], [[], [], []]);
  assert.deepEqual(validaLivello(ok, { talentoLibero: { id: 'riflessi-fulminei' } }, dati).filter((e) => e.campo === 'livelli'), []);
});

test('A.107: la correzione rispetta le regole del livello (7 punti, massimi) e non rende irregolari i livelli dopo', () => {
  const p = pg();
  // al 4° livello si possono correggere i punti, ma non più di 7 (A.108)
  const quarto = p.livelli[2];
  assert.ok(validaCorrezione(p, 4, { ...quarto, puntiAbilita: { ...QUARTO, 'Atletica': 1 } }, dati).some((e) => e.tipo === 'violazione' && /in eccesso/.test(e.problema)));
  assert.deepEqual(validaCorrezione(p, 4, { ...quarto, puntiAbilita: { 'Tecnologia': 1, 'Medicina': 2, 'Sopravvivenza': 2, 'Atletica': 2 } }, dati), []);
  // Caratteristica oltre il massimo del livello: errore del livello corretto
  assert.ok(validaCorrezione(p, 2, { caratteristiche: { DES: 3 } }, dati).length > 0);
  // un livello che non c'è
  assert.match(validaCorrezione(p, 9, {}, dati)[0].problema, /non c'è un 9° livello/);
});

test('A.107: un punto legittimo quando assegnato non si restituisce se un aumento automatico successivo supera il limite', () => {
  // al 6° INT +2: Tecnologia (INT) sale oltre il limite; i punti liberi del 4° restano, nessun punto da riassegnare
  const p = pg(QUARTO, { INT: 2 });
  const prima = ab(pg(), 'Tecnologia');
  const dopo = ab(p, 'Tecnologia');
  assert.equal(dopo.liberi, prima.liberi);
  assert.ok(dopo.grezzo > dopo.limite);
  assert.equal(dopo.totale, dopo.limite);
  const s = calcolaScheda(p, dati);
  assert.deepEqual([s.completamenti, s.errori], [[], []]);
});

// A.108: un PG salvato con la regola dei 10 punti
const dieci = (pa1 = { 'Percezione': 2, 'Tecnologia': 2, 'Cultura': 2, 'Raggirare': 4 }) => ({
  ...pg(),
  creazione: { ...pg().creazione, puntiAbilitaLiberi: pa1 },
});

test('A.108: eccesso speso → salita bloccata, il giocatore sceglie le assegnazioni, nessuna scelta automatica', () => {
  const p = dieci();
  const s = calcolaScheda(p, dati);
  assert.deepEqual(s.eccessi.map((e) => [e.livello, e.eccesso]), [[1, 3]]);
  // blocco con il motivo
  const e = validaLivello(p, { talentoLibero: { id: 'riflessi-fulminei' } }, dati);
  assert.match(e[0].problema, /Punti Abilità in eccesso \(A\.108\): prima di salire di livello togli 3 punti \(3 della creazione\)/);
  // nessuna scelta automatica: senza scelta del giocatore non si toglie nulla e il pannello parte vuoto
  assert.deepEqual(validaRimozione(p, 1, {}, dati).map((x) => x.tipo), ['incompleto']);
  const st = statoRimozione(p, {}, dati);
  assert.ok(st.abilita.every((a) => a.togli === 0));
  assert.deepEqual(p.creazione.puntiAbilitaLiberi, { 'Percezione': 2, 'Tecnologia': 2, 'Cultura': 2, 'Raggirare': 4 });
  // il giocatore sceglie: i punti escono e non si riassegnano (niente completamento dopo)
  const scelta = { 'Raggirare': 2, 'Cultura': 1 };
  assert.deepEqual(validaRimozione(p, 1, scelta, dati), []);
  const r = applicaRimozione(p, 1, scelta);
  const s2 = calcolaScheda(r, dati);
  assert.deepEqual([s2.eccessi, s2.completamenti, s2.errori, s2.avvisoPunti], [[], [], [], null]);
  assert.deepEqual(validaLivello(r, { talentoLibero: { id: 'riflessi-fulminei' } }, dati).filter((x) => x.campo === 'livelli'), []);
});

test('A.108: eccesso non speso (7 assegnati dei 10 di allora) → niente da togliere, niente da bloccare', () => {
  // con la regola dei 10 il giocatore aveva assegnato 7 punti e 3 restavano da assegnare: nel file non ci sono
  const p = dieci({ 'Percezione': 2, 'Tecnologia': 1, 'Cultura': 1, 'Raggirare': 3 });
  const s = calcolaScheda(p, dati);
  assert.deepEqual([s.eccessi, s.completamenti, s.avvisoPunti], [[], [], null]);
});

test('A.108 poi A.107: togliendo l’eccesso i livelli dopo si ricalcolano; un’altra correzione resta possibile', () => {
  // eccesso anche al 4° livello: 10 punti
  const p = { ...dieci(), livelli: dieci().livelli.map((v) => (v.livello === 4 ? { ...v, puntiAbilita: { ...QUARTO, 'Atletica': 3 } } : v)) };
  const s = calcolaScheda(p, dati);
  assert.deepEqual(s.eccessi.map((e) => [e.livello, e.eccesso]), [[1, 3], [4, 3]]);
  // il giocatore comincia dal 4°
  let r = applicaRimozione(p, 4, { 'Atletica': 3 });
  r = applicaRimozione(r, 1, { 'Raggirare': 3 });
  const s2 = calcolaScheda(r, dati);
  assert.deepEqual([s2.eccessi, s2.completamenti, s2.errori], [[], [], []]);
});

test('A.108 e A.107 su una copia di Lucas del 28/09 (10 + 10 punti): togliere, poi correggere il 2° livello', async () => {
  const { readFileSync } = await import('node:fs');
  const { deserializzaPersonaggio, normalizza } = await import('../src/character.js');
  const { creazione, livelli } = deserializzaPersonaggio(readFileSync(new URL('collaudo/Lucas_liv6_2026-09-28 (2).json', import.meta.url), 'utf8'));
  let p = { creazione: normalizza(creazione, dati).scelte, livelli };
  assert.deepEqual(calcolaScheda(p, dati).eccessi.map((e) => [e.livello, e.eccesso]), [[1, 3], [4, 3]]);
  // in «Togli» si vede quali punti già non aumentano il VA (indicazione, la scelta resta al giocatore)
  assert.ok(statoRimozione(p, {}, dati, 4).abilita.some((a) => a.inattivi > 0));
  p = applicaRimozione(applicaRimozione(p, 4, { 'Medicina': 3 }), 1, { 'Potere': 2, 'Occultismo': 1 });
  assert.deepEqual(calcolaScheda(p, dati).eccessi, []);
  // correzione del 2° livello: INT +2 al posto di SAG +1 e INT +1, con l'incantesimo in più delle quote
  const voce = { incantesimi: ['Piattaforma Levitante', 'Controllo Elementale'], caratteristiche: { INT: 2 } };
  assert.deepEqual(validaCorrezione(p, 2, voce, dati), []);
  // un punto del 4° livello da riassegnare (Armi medie) e uno che torna valido (Artefatti)
  assert.deepEqual(conseguenzeCorrezione(p, 2, voce, dati), [{ livello: 4, evento: '4° livello', abilita: { 'Armi medie': 1 }, tornano: { 'Artefatti': 1 } }]);
  // senza l'incantesimo in più la correzione è incompleta; abbassando INT le quote dei livelli dopo non tornano
  assert.ok(validaCorrezione(p, 2, { ...voce, incantesimi: ['Piattaforma Levitante'] }, dati).some((e) => e.tipo === 'incompleto'));
  assert.ok(validaCorrezione(p, 2, { incantesimi: ['Piattaforma Levitante'], caratteristiche: { SAG: 2 } }, dati).some((e) => /il 3° livello diventerebbe irregolare/.test(e.problema)));
});
