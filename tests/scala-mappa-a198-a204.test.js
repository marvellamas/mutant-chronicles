// A.198 (scala della mappa, pedine in Q Tattici, limite 20) e A.204 (ordine delle misure dei draghi), risposte di Davide del 30/10/2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { datiReali } from './helpers.js';
import { scale, scalaDi, infoScala, qMetri, eTattica, testoScalaScena, scalaCambiabile, conScala, tokenDiScala } from '../src/mappa/scala.js';
import { nuovaScena, validaScena, riassuntoScena } from '../src/mappa/scena.js';
import { testoScala } from '../src/mappa/griglia.js';
import { ingombroCreatura, parseSpazio, spazioEffettivo, pedinaTattica } from '../src/mappa/token.js';
import { pezziDellaScena } from '../src/mappa/partecipanti.js';
import { nuovoScontro, aggiungiNemici } from '../src/scontro.js';
import { validaNemico } from '../src/validate.js';
import { leggiSpazio } from '../tools/importa-mostri.mjs';

const { dati } = await datiReali();
const DIR = fileURLToPath(new URL('../esempi/nemici/mostri/', import.meta.url));
const leggi = (id) => JSON.parse(readFileSync(`${DIR}${id}.json`, 'utf8'));
const scena = (extra = {}) => ({ ...nuovaScena({ id: 's', nome: 'S', colonne: 60, righe: 60, dati }), ...extra });
const tok = (id, ingombro, q = [3, 3]) => ({ id: `t-${id}`, rif: { tipo: 'partecipante', id }, q, ingombro, nascosto: false });

test('A.198: la scala è nei dati — Q Base 1,5 m e Q Tattici 15 m — e una scena nuova la dichiara; quelle di prima sono in Q Base', () => {
  assert.deepEqual(scale(dati).map((x) => [x.id, x.nome, x.q_metri]), [['base', 'Q Base', 1.5], ['tattica', 'Q Tattici', 15]]);
  const s = scena();
  assert.equal(s.scala, 'base');
  assert.equal(validaScena(s, dati), null);
  const { scala: _s, ...vecchia } = s;
  assert.equal(validaScena(vecchia, dati), null, 'una scena senza il campo è valida');
  assert.equal(scalaDi(vecchia, dati), 'base');
  assert.equal(scalaDi({ scala: 'tattica' }, dati), 'tattica');
  assert.equal(scalaDi({ scala: 'inventata' }, dati), 'base');
  assert.match(validaScena({ ...s, scala: 'inventata' }, dati), /^scala: una fra base, tattica/);
  assert.equal(validaScena({ ...s, scala: 'tattica' }, dati), null);
});

test('A.198: la scala si legge — testo per la barra, metri per Q, «Q Base · 1 Q = 1,5 m»', () => {
  assert.equal(testoScalaScena(scena(), dati), 'Q Base · 1 Q = 1,5 m');
  assert.equal(testoScalaScena(scena({ scala: 'tattica' }), dati), 'Q Tattici · 1 Q = 15 m');
  assert.equal(testoScala(dati, scena({ scala: 'tattica' })), 'Q Tattici · 1 Q = 15 m');
  assert.equal(testoScala(dati), 'Q Base · 1 Q = 1,5 m', 'senza scena: Q Base');
  assert.equal(qMetri(scena({ scala: 'tattica' }), dati), 15);
  assert.equal(infoScala(scena(), dati).nome, 'Q Base');
  assert.equal(eTattica(scena({ scala: 'tattica' }), dati), true);
  assert.equal(riassuntoScena(scena()).scala, undefined, 'l’elenco delle scene non cambia');
});

test('A.198: la scala si sceglie finché la scena non ha creature o veicoli; i PG e i token liberi non la bloccano', () => {
  const vuota = scena();
  assert.equal(scalaCambiabile(vuota).ok, true);
  assert.equal(conScala(vuota, 'tattica', dati).scala, 'tattica');
  assert.equal(conScala(vuota, 'base', dati), vuota, 'stessa scala: la scena non cambia');
  assert.equal(conScala(vuota, 'inventata', dati), null);
  const conPg = scena({ token: [tok('pg:ada', 1)] });
  assert.equal(scalaCambiabile(conPg).ok, true);
  const libero = scena({ token: [{ id: 'l', rif: { tipo: 'segnaposto', id: null }, q: [1, 1], ingombro: 1, nascosto: false }] });
  assert.equal(scalaCambiabile(libero).ok, true);
  const conMostro = scena({ token: [tok('nem:drago-rosso-antico:1', [10, 16])] });
  assert.equal(tokenDiScala(conMostro).length, 1);
  const no = scalaCambiabile(conMostro);
  assert.equal(no.ok, false);
  assert.match(no.motivo, /1 pedine di creature o veicoli/);
  assert.equal(conScala(conMostro, 'tattica', dati), null);
});

test('A.198: in Q Base la creatura ha lo Spazio del profilo (fino a 20 per lato), in Q Tattici la pedina convenzionale; il drago antico e il Dragomedusa entrano nel campo', () => {
  const antico = leggi('drago-rosso-antico');
  assert.equal(antico.spazio, '10 × 16 Q');
  assert.equal(antico.pedina_tattica, '2 × 2 Q');
  assert.deepEqual(ingombroCreatura(antico, dati, 'base'), [10, 16]);
  assert.equal(ingombroCreatura(antico, dati, 'tattica'), 2);
  const adulto = leggi('dragomedusa-adulto');
  assert.deepEqual([adulto.spazio, adulto.pedina_tattica], ['10 × 14 Q', '2 × 1 Q']);
  assert.deepEqual(ingombroCreatura(adulto, dati, 'base'), [10, 14]);
  assert.deepEqual(ingombroCreatura(adulto, dati, 'tattica'), [2, 1]);
  const giovane = leggi('dragomedusa-giovane');
  assert.equal(giovane.pedina_tattica, '1 Q');
  assert.equal(ingombroCreatura(giovane, dati, 'tattica'), 1);
  // senza pedina il profilo ha 1 × 1 in Q Tattici; il resto della scala non cambia i PG (1 × 1)
  assert.equal(ingombroCreatura(leggi('roc'), dati, 'tattica'), 1);
  assert.equal(pedinaTattica(adulto).testo, '2 × 1 Q');
  assert.equal(pedinaTattica(leggi('roc')), null);
  // il massimo è 20: un profilo con 21 o 25 lati viene ricondotto a 20 sulla pedina
  assert.deepEqual(ingombroCreatura({ spazio: '20 × 20 Q' }, dati, 'base'), 20);
  assert.deepEqual(parseSpazio('21 × 3 Q'), [21, 3]);
  assert.ok(validaNemico({ ...antico, spazio: '21 × 3 Q' }, dati, 'x').length > 0);
  assert.deepEqual(validaNemico({ ...antico, spazio: '20 × 20 Q' }, dati, 'x'), []);
});

test('A.198: i pezzi dello scontro prendono la misura dalla scala della scena — la stessa creatura, due scale, due misure; le dimensioni vere non cambiano', () => {
  let sc = nuovoScontro({ id: 'x', pg: [], adesso: new Date('2026-10-30T10:00:00Z') });
  sc = aggiungiNemici(sc, leggi('dragomedusa-adulto'), 1, {}, new Date('2026-10-30T10:00:00Z'));
  const base = pezziDellaScena({ scontro: sc, scena: scena() }, dati).find((p) => p.tipo === 'nemico');
  const tattica = pezziDellaScena({ scontro: sc, scena: scena({ scala: 'tattica' }) }, dati).find((p) => p.tipo === 'nemico');
  assert.deepEqual(base.ingombro, [10, 14]);
  assert.deepEqual(tattica.ingombro, [2, 1]);
  assert.equal(spazioEffettivo(sc.partecipanti[0].scheda, dati).testo, '10 × 14 Q', 'la mini-scheda dice sempre lo spazio vero del corpo');
  assert.deepEqual(pezziDellaScena({ scontro: sc }, dati).find((p) => p.tipo === 'nemico').ingombro, [10, 14], 'senza scena: Q Base');
});

// ---- A.204 ---------------------------------------------------------------------------------------------------------
const tutti = readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${DIR}${f}`, 'utf8')));

test('A.204: il corpo disteso è lunghezza × larghezza nel manuale e larghezza × lunghezza nel campo — giovane 4 × 6, adulto 6 × 10, antico 10 × 16 (cucciolo 1 × 2), per tutte le famiglie di draghi', () => {
  const draghi = tutti.filter((n) => /^(drago-|dracolich)/.test(n.id) && !/fatato|tartaruga/.test(n.id));
  assert.equal(draghi.length, 46, "20 cromatici, 20 metallici, 5 d’ombra giovani, 1 Dracolich");
  const per = (re) => draghi.filter((n) => re.test(n.id));
  for (const n of per(/giovane$/)) assert.equal(n.spazio, '4 × 6 Q', n.id);
  for (const n of per(/adulto$/)) assert.equal(n.spazio, '6 × 10 Q', n.id);
  for (const n of per(/antico$/)) assert.equal(n.spazio, '10 × 16 Q', n.id);
  for (const n of per(/cucciolo$/)) assert.equal(n.spazio, '1 × 2 Q', n.id);
  // mai più largo che lungo: nel campo la prima misura (larghezza) non supera la seconda (lunghezza)
  for (const n of draghi) { const [w, h] = parseSpazio(n.spazio); assert.ok(w <= h, `${n.id}: ${n.spazio}`); }
  // le pedine in Q Tattici sono un dato distinto: 1 × 1 / 2 × 1 / 1 × 1 / 2 × 2
  for (const n of per(/giovane$/)) assert.equal(n.pedina_tattica, '1 Q', n.id);
  for (const n of per(/adulto$/)) assert.equal(n.pedina_tattica, '2 × 1 Q', n.id);
  for (const n of per(/cucciolo$/)) assert.equal(n.pedina_tattica, '1 Q', n.id);
  for (const n of per(/antico$/)) assert.equal(n.pedina_tattica, '2 × 2 Q', n.id);
  // e valgono come profili
  for (const n of draghi) assert.deepEqual(validaNemico(n, dati, n.id), [], n.id);
});

test('A.204: l’importatore scrive le misure del corpo disteso al contrario e quelle degli altri come sono', () => {
  assert.deepEqual(leggiSpazio('6 × 4 Q Base; pedina navale 1 × 1 Q Tattici', true), { spazio: '4 × 6 Q', grande: true });
  assert.deepEqual(leggiSpazio('16 × 10 Q Base; pedina navale 2 × 2 Q Tattici', true), { spazio: '10 × 16 Q', grande: true });
  assert.deepEqual(leggiSpazio('2 × 1 Q Base; pedina navale 1 × 1 Q Tattici', true), { spazio: '1 × 2 Q', grande: false });
  assert.deepEqual(leggiSpazio('3 × 10 Q', false), { spazio: '3 × 10 Q', grande: true });
  assert.ok(leggiSpazio('21 × 3 Q', false).oltre, 'oltre 20: fuori dal campo');
  assert.equal(leggiSpazio('20 × 3 Q', false).spazio, '20 × 3 Q');
});
