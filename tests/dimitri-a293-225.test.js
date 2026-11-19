import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 225 — A.293 (Davide, 19/11/2026): la procedura di Dimitri, tutta dall'app.
//   «Dopo il passaggio all'8° livello, Dimitri conserva DES +2, FOR −1 e CAR −1 del 2 novembre, oltre a SAG +2 e INT −2 già
//   confermate. Sono modifiche già attive: l'app deve mantenerle, senza applicarle una seconda volta. Non consumano né
//   aumentano i 21 punti. Delle correzioni manuali del 2 novembre, si annullano soltanto quelle alle Abilità.»
// Il file di prova è la copia dell'istantanea del 17/11 (tests/fixtures/dimitri-225/; l'originale resta in sola lettura).
//
// Il difetto che questo test difende, trovato cercando il «doppio conteggio»: la procedura (nota di prima, colonna «Adesso», limite e
// massimo dei punti) calcolava Dimitri dal file così com'è sul disco, dove le correzioni del master stanno in cima
// (`correzioni_master`) e non dentro le scelte: **le correzioni di Caratteristica non entravano**, e 24 Abilità su 24 avevano un VA
// diverso da quello della sua scheda. L'errore opposto al doppio conteggio, e lo stesso rischio: un numero sbagliato al tavolo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali, copia } from './helpers.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { calcolaSchedaPersonaggio } from '../src/avanzamento.js';
import { normalizzaCorrezioni } from '../src/correzioni-master.js';
import {
  notaDiPrima, pianoAdeguamento, statoAssegnazione, assegna, confermaAssegnazione, annullaAdeguamento,
  correzioniAbilitaDaAnnullare, MARCA,
} from '../src/adeguamento-abilita.js';

const { dati } = await datiReali();
const FILE = new URL('./fixtures/dimitri-225/Dimitri-Orlav_liv7_2026-11-11.json', import.meta.url);
const grezzo = () => JSON.parse(readFileSync(FILE, 'utf8'));

/** Il personaggio come lo calcola l'app (deserializzaPersonaggio porta le correzioni dentro le scelte). */
function scheda(oFile) {
  const pg = deserializzaPersonaggio(JSON.stringify(oFile));
  return calcolaSchedaPersonaggio({ creazione: normalizza(pg.creazione, dati).scelte, livelli: pg.livelli ?? [], sessione: pg.sessione }, dati);
}
const car = (s) => Object.fromEntries(Object.entries(s.caratteristiche).map(([k, v]) => [k, v.valore]));
const calcolati = (s) => Object.fromEntries(Object.entries(s.caratteristiche).map(([k, v]) => [k, v.calcolato ?? v.valore]));
const NETTO = { DES: 2, FOR: -1, CAR: -1, SAG: 2, INT: -2 };
const netto = (o) => {
  const n = {};
  for (const r of normalizzaCorrezioni(o.correzioni_master)) if (r.stato === 'attiva' && /^car:/.test(r.chiave)) n[r.chiave.slice(4)] = (n[r.chiave.slice(4)] ?? 0) + r.numero;
  return n;
};
/** Tutti i punti del monte, una scelta alla volta dove il limite lo permette (come farebbe il giocatore). */
function bozzaCompleta(o) {
  let bozza = {};
  for (let k = 0; k < 400; k++) {
    const s = statoAssegnazione(o, bozza, dati);
    if (!s || s.rimasti <= 0) break;
    const a = s.abilita.find((x, i) => !x.motivoPiu && i >= (k % s.abilita.length)) ?? s.abilita.find((x) => !x.motivoPiu);
    if (!a) break;
    bozza = assegna(o, bozza, a.nome, 1, dati);
  }
  return bozza;
}

test('il file di prova è quello giusto: DES +2, FOR −1, CAR −1, SAG +2, INT −2 attive, e le 4 correzioni alle Abilità del 2 novembre', () => {
  const o = grezzo();
  assert.deepEqual(netto(o), NETTO);
  const ab = normalizzaCorrezioni(o.correzioni_master).filter((r) => r.stato === 'attiva' && /^abilita:/.test(r.chiave) && !r[MARCA]);
  assert.equal(ab.length, 4, 'due +1 ad Armi da mischia, −1 a Percezione, −1 a Scienza');
  assert.deepEqual(ab.map((r) => `${r.chiave}${r.numero > 0 ? '+' : ''}${r.numero}`).sort(), ['abilita:Armi da mischia+1', 'abilita:Armi da mischia+1', 'abilita:Percezione-1', 'abilita:Scienza-1']);
  assert.ok(ab.every((r) => r.quando.startsWith('2026-11-02')));
});

test('le Caratteristiche corrette contano UNA volta: valore = calcolato + correzione netta, per tutte e cinque', () => {
  const s = scheda(grezzo());
  const c = car(s), base = calcolati(s);
  for (const [sigla, n] of Object.entries(NETTO)) assert.equal(c[sigla], base[sigla] + n, `${sigla}: ${base[sigla]} + (${n}) deve fare ${c[sigla]}`);
  assert.equal(c.COS, base.COS, 'una Caratteristica senza correzioni non cambia');
});

test('LA PROCEDURA VEDE DIMITRI COME LA SUA SCHEDA: 24 Abilità su 24 con lo stesso VA e lo stesso modificatore (era 0 su 24)', () => {
  const o = grezzo();
  const app = scheda(o);
  const nota = notaDiPrima(o, dati);
  assert.equal(nota.abilita.length, 24);
  for (const a of app.abilita) {
    const n = nota.abilita.find((x) => x.nome === a.nome);
    assert.equal(n.mod, a.mod, `${a.nome}: modificatore della procedura ${n.mod}, della scheda ${a.mod}`);
    assert.equal(n.va, a.totale, `${a.nome}: VA della procedura ${n.va}, della scheda ${a.totale}`);
  }
  // se il file arriva già con le correzioni dentro le scelte (l'app in memoria) non si sommano una seconda volta
  const dentro = copia(o);
  dentro.scelte.correzioniMaster = normalizzaCorrezioni(o.correzioni_master);
  const nota2 = notaDiPrima(dentro, dati);
  assert.deepEqual(nota2.abilita.map((x) => [x.nome, x.mod, x.va]), nota.abilita.map((x) => [x.nome, x.mod, x.va]), 'nessun doppio conteggio con le correzioni già dentro le scelte');
});

test('A.293: la procedura annulla le SOLE 4 correzioni alle Abilità del 2 novembre; le Caratteristiche restano attive, con gli stessi id e numeri', () => {
  const o = grezzo();
  const prima = normalizzaCorrezioni(o.correzioni_master);
  const da = correzioniAbilitaDaAnnullare(o.correzioni_master, dati);
  assert.equal(da.length, 4);
  const p = pianoAdeguamento(o, dati);
  assert.equal(p.bloccato, false, p.motivo ?? '');
  assert.equal(p.annullate.length, 4);
  const dopo = normalizzaCorrezioni(p.nuovo.correzioni_master);
  const nota = dopo.find((x) => x[MARCA]);
  assert.ok(nota, 'la riga della nota di prima c’è');
  assert.deepEqual([...nota.correzioniAnnullate].sort(), da.map((x) => x.id).sort(), 'la nota ricorda quali ha annullato');
  for (const r of prima) {
    const d = dopo.find((x) => x.id === r.id);
    assert.ok(d, `la riga ${r.id} resta nel registro (nello storico)`);
    if (/^abilita:/.test(r.chiave)) {
      assert.equal(d.stato, 'annullata', `${r.etichetta}: annullata`);
      assert.ok(d.annullataIl && d.annullataPer, 'con quando e perché');
    } else {
      assert.equal(d.stato, r.stato, `${r.chiave} (${r.etichetta}): lo stato non cambia`);
      assert.equal(d.numero, r.numero, `${r.chiave}: il numero non cambia`);
    }
  }
  // il mutante: se la regola prendesse anche le Caratteristiche, qui cambierebbero
  assert.deepEqual(netto(p.nuovo), NETTO, 'le correzioni di Caratteristica nette sono quelle di prima');
});

test('LA PROCEDURA INTERA: DES, FOR, CAR, INT e SAG non si muovono; le 3 Abilità tornano senza correzione; i punti non li tocca', () => {
  const o = grezzo();
  const cPrima = car(scheda(o));
  const p = pianoAdeguamento(o, dati);
  assert.equal(p.bloccato, false);
  const dopoApplica = p.nuovo;
  assert.deepEqual(car(scheda(dopoApplica)), cPrima, 'dopo --applica nessuna Caratteristica si è mossa');
  // il giocatore assegna tutto il monte e conferma
  const bozza = bozzaCompleta(dopoApplica);
  const conf = confermaAssegnazione(dopoApplica, bozza, dati);
  assert.equal(conf.ok, true, conf.motivo ?? '');
  const finale = conf.file;
  const sFine = scheda(finale);
  assert.deepEqual(car(sFine), cPrima, 'a fine procedura DES, FOR, CAR, INT, SAG sono quelli di prima: né applicate di nuovo né perse');
  const c = car(sFine), base = calcolati(sFine);
  for (const [sigla, n] of Object.entries(NETTO)) assert.equal(c[sigla], base[sigla] + n, `${sigla}: una volta sola`);
  // «non consumano né aumentano i 21 punti»: i punti assegnati fanno esattamente il monte, correzioni o no
  const stato = statoAssegnazione(dopoApplica, bozza, dati);
  assert.equal(stato.rimasti, 0);
  assert.equal(stato.assegnati, stato.monte, 'le correzioni non entrano nel conto dei punti');
  assert.equal(p.monte.monte, stato.monte);
  // annullata equivale a non esserci: le tre Abilità non portano più le correzioni del 2 novembre
  const senzaRighe = copia(finale);
  senzaRighe.correzioni_master = normalizzaCorrezioni(senzaRighe.correzioni_master).filter((r) => !(/^abilita:/.test(r.chiave) && !r[MARCA]));
  const a = scheda(finale).abilita.map((x) => [x.nome, x.effettivo ?? x.totale]);
  const b = scheda(senzaRighe).abilita.map((x) => [x.nome, x.effettivo ?? x.totale]);
  assert.deepEqual(a, b);
});

test('--annulla riporta Dimitri com’era: le correzioni alle Abilità tornano attive e il registro è quello di partenza', () => {
  const o = grezzo();
  const p = pianoAdeguamento(o, dati);
  const r = annullaAdeguamento(p.nuovo);
  assert.equal(r.ok, true, r.motivo ?? '');
  const norm = (f) => JSON.stringify({ ...f, correzioni_master: normalizzaCorrezioni(f.correzioni_master) });
  assert.equal(norm(r.file), norm(o), 'identico a prima: nessuna riga annullata in più, nessuna in meno');
  assert.deepEqual(netto(r.file), NETTO);
});

test('un’Abilità corretta in un altro giorno non si annulla: la regola è quella dichiarata nei dati, non «ogni correzione di Abilità»', () => {
  const o = grezzo();
  const x = copia(o);
  x.correzioni_master = [...x.correzioni_master, { id: 'cor-prova-225', quando: '2026-11-20T10:00:00.000Z', chiave: 'abilita:Furtività', etichetta: 'VA di Furtività', tipo: 'aggiungi', numero: 1, motivo: 'dopo la serata', stato: 'attiva' }];
  const da = correzioniAbilitaDaAnnullare(x.correzioni_master, dati);
  assert.equal(da.length, 4, 'una correzione del 20 novembre non è fra quelle del 2 novembre');
  assert.ok(!da.some((r) => r.id === 'cor-prova-225'));
  // e la riga della nota di prima («abilita», senza i due punti) non è una correzione di VA
  const p = pianoAdeguamento(x, dati);
  const nota = normalizzaCorrezioni(p.nuovo.correzioni_master).find((r) => r[MARCA]);
  assert.equal(correzioniAbilitaDaAnnullare([nota], dati).length, 0);
});
