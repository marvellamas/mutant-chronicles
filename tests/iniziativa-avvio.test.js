// Iniziativa chiesta all'avvio dello scontro (difetto del test di Marcello del 07/10/2026): niente tiri automatici;
// d10 dal vivo controllato, totale a mano, «Tira con l'app per tutti i nemici»; chi resta vuoto è fuori dall'ordine;
// i partecipanti aggiunti dopo si chiedono a parte; gli scontri già iniziati non cambiano (src/scontro.js →
// registraIniziative, senzaIniziativaNuovi).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nuovoScontro, aggiungiNemici, aggiungiPartecipante, registraTiro, registraIniziative, senzaIniziativaNuovi, ordineIniziativa, diTurno, avanti, validaScontro } from '../src/scontro.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const T0 = new Date('2026-10-07T22:00:00Z');
const legionario = JSON.parse(readFileSync(new URL('../esempi/nemici/legionario-oscuro.json', import.meta.url), 'utf8'));

function avvio() {
  let s = nuovoScontro({ id: 'avvio', adesso: T0, pg: [{ chiave: 'ada', nome: 'Ada', iniziativa: 3, des: 7, int: 5 }, { chiave: 'bo', nome: 'Bo', iniziativa: 1, des: 5, int: 5 }] });
  s = aggiungiNemici(s, legionario, 2, {}, T0);
  return s;
}
const nemici = (s) => s.partecipanti.filter((p) => p.tipo === 'nemico');

test('all’avvio nessuno ha l’Iniziativa: tutti nuovi «da tirare», da chiedere', () => {
  const s = avvio();
  assert.ok(s.partecipanti.every((p) => !p.d10));
  assert.equal(ordineIniziativa(s).ordinati.length, 0);
  assert.deepEqual(senzaIniziativaNuovi(null, s), s.partecipanti.map((p) => p.id));
  // scontro chiuso: niente
  assert.deepEqual(senzaIniziativaNuovi(null, { ...s, stato: 'chiuso' }), []);
});

test('d10 dal vivo (controllato), totale a mano, app; chi resta vuoto fuori dall’ordine; una riga', () => {
  const s = avvio();
  const [n1, n2] = nemici(s).map((p) => p.id);
  const righe = s.registro.length;
  const t = registraIniziative(s, [
    { id: 'pg:ada', tiro: { valore: 6, origine: 'manuale' } },
    { id: n1, tiro: { valore: 9, origine: 'app' } },
    { id: n2, totale: 20 },
  ], dati, T0);
  assert.equal(t.registro.length, righe + 1);
  assert.equal(t.registro.at(-1).testo, 'Iniziativa: Legionario Oscuro 2 20 (a mano); Legionario Oscuro 1 2 + 1d10 9 = 11; Ada 3 + 1d10 6 (dal vivo) = 9. Ancora da tirare: Bo.');
  const { ordinati, daTirare } = ordineIniziativa(t);
  assert.deepEqual(ordinati.map((p) => p.nome), ['Legionario Oscuro 2', 'Legionario Oscuro 1', 'Ada']);
  assert.deepEqual(daTirare.map((p) => p.nome), ['Bo']);
  assert.equal(diTurno(t).nome, 'Legionario Oscuro 2');
  assert.equal(t.partecipanti.find((p) => p.id === n2).d10.origine, 'mano');
  assert.equal(validaScontro(t), null);
  // d10 fuori intervallo e totale non intero: rifiutati, con il nome
  assert.throws(() => registraIniziative(s, [{ id: 'pg:bo', tiro: { valore: 11, origine: 'manuale' } }], dati, T0), /Bo: .*1 a 10/);
  assert.throws(() => registraIniziative(s, [{ id: 'pg:bo', totale: 4.5 }], dati, T0), /Bo: .*intero/);
  // nessuna voce: nulla cambia
  assert.equal(registraIniziative(s, [], dati, T0), s);
});

test('«Tira con l’app per tutti i nemici»: solo i nemici, i PG restano da scrivere; parità come A.123', () => {
  const s = avvio();
  // come fa la finestra: un tiro d'app per ogni non-PG; i due Legionari pari sul totale (stesse DES e INT)
  const voci = s.partecipanti.filter((p) => p.tipo !== 'pg').map((p) => ({ id: p.id, tiro: { valore: 5, origine: 'app' } }));
  const t = registraIniziative(s, voci, dati, T0);
  assert.deepEqual(ordineIniziativa(t).daTirare.map((p) => p.nome), ['Ada', 'Bo']);
  assert.deepEqual(ordineIniziativa(t).spareggi, [nemici(s).map((p) => p.id)], 'avversari alla pari: spareggio da tirare (§5.1)');
});

test('un partecipante aggiunto a scontro iniziato si chiede a parte, chi è di turno resta; gli scontri già iniziati non cambiano', () => {
  let s = avvio();
  s = registraIniziative(s, s.partecipanti.map((p, i) => ({ id: p.id, tiro: { valore: i + 1, origine: 'app' } })), dati, T0);
  s = avanti(s, T0);
  const chi = diTurno(s).id;
  const prima = s;
  // nuovi nemici e un partecipante a mano: entrano senza Iniziativa (niente tiro automatico)
  s = aggiungiNemici(s, legionario, 1, {}, T0);
  s = aggiungiPartecipante(s, { nome: 'Sicario', base: 2 }, T0);
  const nuovi = senzaIniziativaNuovi(prima, s);
  assert.equal(nuovi.length, 2);
  assert.ok(s.partecipanti.filter((p) => nuovi.includes(p.id)).every((p) => !p.d10));
  assert.equal(diTurno(s).id, chi);
  const t = registraIniziative(s, [{ id: nuovi[0], totale: 99 }], dati, T0);
  assert.equal(diTurno(t).id, chi, 'chi era di turno resta di turno');
  assert.deepEqual(ordineIniziativa(t).daTirare.map((p) => p.nome), ['Sicario']);
  // uno scontro già iniziato, letto di nuovo (stesse persone): niente da chiedere, nessun valore cambiato
  assert.deepEqual(senzaIniziativaNuovi(prima, prima), []);
  const vecchio = registraTiro(avvio(), 'pg:ada', 'd10', { valore: 4, origine: 'app' }, dati, T0);
  assert.deepEqual(senzaIniziativaNuovi(vecchio, vecchio), []);
});
