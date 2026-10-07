// «Reimposta Iniziativa» (ritocchi del 07/10/2026; src/scontro.js → reimpostaIniziativa, reimpostaIniziativaDi):
// per tutti con la regola del manuale (Iniziativa + 1d10, parità come A.123) o per uno solo (ritiro o valore a mano);
// chi è di turno resta di turno; una riga nel registro; «Indietro» la annulla.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nuovoScontro, aggiungiNemici, registraTiro, ordineIniziativa, diTurno, avanti, indietro, anteprimaIndietro, validaScontro, reimpostaIniziativa, reimpostaIniziativaDi } from '../src/scontro.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const T0 = new Date('2026-10-07T20:00:00Z');
const MAX = dati.mappa.iniziativa.indietro_max;
const legionario = JSON.parse(readFileSync(new URL('../esempi/nemici/legionario-oscuro.json', import.meta.url), 'utf8'));
/** Dadi in sequenza, «tirati dall'app». */
const dadi = (...v) => { let i = 0; return () => ({ valore: v[i++ % v.length], origine: 'app' }); };
const nomi = (s) => ordineIniziativa(s).ordinati.map((p) => p.nome);

/** Ada (PG, Iniziativa 3, DES 7) e due Legionari: ordine Leg 1, Ada, Leg 2; di turno Ada. */
function pronto() {
  let s = nuovoScontro({ id: 'reimposta-prova', adesso: T0, pg: [{ chiave: 'ada', nome: 'Ada', iniziativa: 3, des: 7, int: 5 }] });
  s = aggiungiNemici(s, legionario, 2, {}, T0);
  const [n1, n2] = s.partecipanti.filter((p) => p.tipo === 'nemico').map((p) => p.id);
  s = registraTiro(s, n1, 'd10', { valore: 10, origine: 'vivo' }, dati, T0);
  s = registraTiro(s, 'pg:ada', 'd10', { valore: 5, origine: 'vivo' }, dati, T0);
  s = registraTiro(s, n2, 'd10', { valore: 1, origine: 'vivo' }, dati, T0);
  s = avanti(s, T0, { indietroMax: MAX });
  return { s, n1, n2 };
}

test('per tutti: nuovi tiri, ordine nuovo, chi era di turno resta di turno, una riga; «Indietro» rimette tutto', () => {
  const { s, n1, n2 } = pronto();
  assert.deepEqual([nomi(s), diTurno(s).nome], [['Legionario Oscuro 1', 'Ada', 'Legionario Oscuro 2'], 'Ada']);
  const righe = s.registro.length;
  // Ada 1, Leg 1 1, Leg 2 10: Leg 2 in testa, Ada dopo (con Leg 1 decide il totale)
  const t = reimpostaIniziativa(s, dadi(1, 1, 10), dati, T0, { indietroMax: MAX });
  assert.equal(nomi(t)[0], 'Legionario Oscuro 2');
  assert.equal(diTurno(t).nome, 'Ada', 'di turno resta Ada');
  assert.equal(t.round, s.round);
  assert.equal(t.registro.length, righe + 1);
  assert.match(t.registro.at(-1).testo, /^Iniziativa reimpostata per tutti \(1d10\): .*Di turno resta Ada\.$/);
  assert.equal(validaScontro(t), null);
  // «Indietro»: tiri e turno di prima, una riga
  const a = anteprimaIndietro(t);
  assert.deepEqual([a.iniziativa, a.cambiaRound, a.diTurno.nome, a.altre], [true, false, 'Ada', 0]);
  const u = indietro(t, T0);
  assert.deepEqual([nomi(u), diTurno(u).nome], [nomi(s), 'Ada']);
  assert.deepEqual(u.partecipanti.map((p) => p.d10), s.partecipanti.map((p) => p.d10));
  assert.match(u.registro.at(-1).testo, /^Indietro: torna l’Iniziativa di prima della «Reimposta»; di turno Ada\./);
  // e lo storico dell'«Avanti» di prima resta: un altro «Indietro» torna a Leg 1
  assert.equal(diTurno(indietro(u, T0)).id, n1);
  assert.ok(n2);
});

test('per tutti: parità fra avversari risolta con lo spareggio (1d10, solo fra chi resta alla pari)', () => {
  const { s, n1, n2 } = pronto();
  // i due Legionari pari (stessa scheda: stesse DES e INT): spareggio 4 e 4, poi 2 e 9
  const t = reimpostaIniziativa(s, dadi(3, 6, 6, 4, 4, 2, 9), dati, T0, { indietroMax: MAX });
  assert.deepEqual(ordineIniziativa(t).spareggi, []);
  assert.deepEqual(nomi(t).slice(0, 2), ['Legionario Oscuro 2', 'Legionario Oscuro 1']);
  assert.deepEqual([t.partecipanti.find((p) => p.id === n1).spareggio.valore, t.partecipanti.find((p) => p.id === n2).spareggio.valore], [2, 9]);
  assert.match(t.registro.at(-1).testo, /Parità fra avversari: spareggio Legionario Oscuro 1 4, Legionario Oscuro 2 4; spareggio Legionario Oscuro 1 2, Legionario Oscuro 2 9\./);
});

test('per uno solo: ritiro o valore a mano; spareggio facoltativo; dado fuori intervallo rifiutato; «Indietro»', () => {
  const { s, n2 } = pronto();
  // Leg 2 ritira: 10 → ora in testa (pari con Leg 1 sul totale: spareggio tirato)
  const t = reimpostaIniziativaDi(s, n2, { valore: 10, origine: 'app' }, dati, T0, { indietroMax: MAX, tiraSpareggio: dadi(3, 8) });
  assert.equal(diTurno(t).nome, 'Ada');
  assert.deepEqual(nomi(t), ['Legionario Oscuro 2', 'Legionario Oscuro 1', 'Ada']);
  assert.match(t.registro.at(-1).testo, /^Iniziativa di Legionario Oscuro 2 reimpostata: .* = \d+ \(prima \d+\)\. Parità con un avversario: spareggio/);
  // senza tiraSpareggio la parità resta da tirare nella colonna «Parità»
  const t2 = reimpostaIniziativaDi(s, n2, { valore: 10, origine: 'vivo' }, dati, T0);
  assert.equal(ordineIniziativa(t2).spareggi.length, 1);
  assert.equal(t2.indietro.length, s.indietro.length, 'senza indietroMax nessuna voce nuova');
  // a mano: il totale, anche fuori dall'intervallo del dado
  const m = reimpostaIniziativaDi(s, 'pg:ada', { totale: 30 }, dati, T0, { indietroMax: MAX });
  const ada = m.partecipanti.find((p) => p.id === 'pg:ada');
  assert.equal(ada.base + ada.d10.valore, 30);
  assert.equal(ada.d10.origine, 'mano');
  assert.deepEqual([nomi(m)[0], diTurno(m).nome], ['Ada', 'Ada']);
  assert.match(m.registro.at(-1).testo, /^Iniziativa di Ada reimpostata: Ada 30 \(a mano\) \(prima 8\)\./);
  assert.throws(() => reimpostaIniziativaDi(s, 'pg:ada', { valore: 11, origine: 'vivo' }, dati, T0), /1d10|10/);
  assert.throws(() => reimpostaIniziativaDi(s, 'pg:ada', { totale: 2.5 }, dati, T0), /intero/);
  // «Indietro»: torna 8, di turno Ada
  const u = indietro(m, T0);
  assert.equal(u.partecipanti.find((p) => p.id === 'pg:ada').d10.valore, 5);
  assert.equal(diTurno(u).nome, 'Ada');
});

test('chi è entrato dopo la «Reimposta» tiene il suo tiro all’«Indietro»; le modifiche dopo restano', () => {
  let { s } = pronto();
  s = reimpostaIniziativa(s, dadi(2, 5, 7), dati, T0, { indietroMax: MAX });
  s = aggiungiNemici(s, legionario, 1, {}, T0);
  const n3 = s.partecipanti.at(-1).id;
  s = registraTiro(s, n3, 'd10', { valore: 6, origine: 'app' }, dati, T0);
  const a = anteprimaIndietro(s);
  assert.equal(a.altre, 2);
  const u = indietro(s, T0);
  assert.equal(u.partecipanti.find((p) => p.id === n3).d10.valore, 6);
  assert.equal(diTurno(u).nome, 'Ada');
  assert.match(u.registro.at(-1).testo, /Restano le modifiche fatte dopo \(2 righe del registro\)/);
});

test('«Centra» dall’ordine d’Iniziativa: lo zoom sta in data/mappa.json, validato', async () => {
  const { validaDati } = await import('../src/validate.js');
  const { copia } = await import('./helpers.js');
  assert.ok(Number.isInteger(dati.mappa.iniziativa.centra_px_per_q));
  const d = copia(dati);
  d.mappa.iniziativa.centra_px_per_q = 2;
  assert.ok(validaDati(d).some((e) => e.file === 'mappa.json' && e.chiave === 'iniziativa.centra_px_per_q'));
});
