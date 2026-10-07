// Attacchi di Opportunità: uno per attaccante nel Round (Giocatore §5.3: «Non consuma Azioni, può essere effettuato
// anche senza Azioni disponibili e una sola volta per Round»). Correzione del 07/10/2026: il controllo guardava solo
// lo scontro riletto ogni secondo e una raffica di movimenti ne segnalava sei; ora conta anche le segnalazioni locali
// non ancora rilette, e annullando il movimento l'attacco si ritira (src/mappa/zoc.js → giaInQuestoRound;
// src/scontro.js → rigaOpportunita, senzaOpportunitaDelMovimento).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attacchiDiOpportunita, avversariZoc, giaInQuestoRound } from '../src/mappa/zoc.js';
import { nuovoScontro, rigaOpportunita, senzaOpportunitaDelMovimento, opportunitaNelRound } from '../src/scontro.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const pg = (id) => ({ chiave: `partecipante:pg:${id}`, tipo: 'pg', pg: id, lato: 'pg', nome: id, stati: [] });
const nem = (id) => ({ chiave: `partecipante:nem:${id}`, tipo: 'nemico', nemico: 'x', lato: 'avversario', nome: id, stati: [], scheda: { attacchi: [{ tipo: 'ravvicinato', portata_q: 1 }] } });
const tok = (p, q) => ({ id: `t-${p.nome}`, rif: { tipo: 'partecipante', id: p.chiave.slice('partecipante:'.length) }, q, ingombro: 1, nascosto: false });

const michele = pg('Michele'), p1 = nem('Predone 1'), p2 = nem('Predone 2');
const scena = { griglia: { colonne: 20, righe: 20 }, token: [tok(michele, [5, 5]), tok(p1, [6, 6]), tok(p2, [12, 5])] };
const avv = avversariZoc(scena, [michele, p1, p2], 't-Michele', dati);
const scontroVuoto = () => ({ ...nuovoScontro({ id: 'sc', nome: 'Prova', pg: [{ chiave: 'Michele', nome: 'Michele', iniziativa: 5, des: 5, int: 5 }] }), round: 1 });

/** Come la mappa: i movimenti in fila; per ognuno gli attacchi provocati e solo i nuovi segnalati (registro + locali). */
function giocaMovimenti(percorsi, { scontro = scontroVuoto(), riletto = (s) => s } = {}) {
  let s = scontro;
  const locali = [];
  const segnalati = [];
  percorsi.forEach((punti, i) => {
    const gia = giaInQuestoRound(riletto(s), locali);
    for (const a of attacchiDiOpportunita(punti, 1, avv)) {
      const da = a.token.rif.id;
      if (gia.has(da)) continue;
      segnalati.push(da);
      locali.push({ scontro: s.id, round: s.round, da, movimento: `m${i}` });
      s = rigaOpportunita(s, { da, nomeDa: a.pezzo.nome, contro: 'pg:Michele', nomeContro: 'Michele', movimento: `m${i}` });
    }
  });
  return { s, segnalati, locali };
}

test('Giocatore §5.3: «una sola volta per Round» nel testo del manuale', async () => {
  const { readFileSync } = await import('node:fs');
  const testo = readFileSync(new URL('../docs/manuali-txt/giocatore.md', import.meta.url), 'utf8');
  assert.match(testo, /può essere effettuato anche senza Azioni disponibili e \*\*una sola volta per Round\*\*/);
});

test('un movimento che entra ed esce due volte dalla ZoC dello stesso nemico: un solo attacco', () => {
  // dentro la ZoC del Predone 1 (attorno a [6, 6]), fuori, di nuovo dentro, di nuovo fuori
  const punti = [[5, 5], [5, 4], [6, 5], [6, 3], [7, 3]];
  const a = attacchiDiOpportunita(punti, 1, avv);
  assert.deepEqual(a.map((x) => x.pezzo.nome), ['Predone 1']);
  assert.equal(a[0].passo, 1, 'alla prima uscita');
});

test('raffica di movimenti ravvicinati nello stesso Round: un solo attacco per nemico, anche con lo scontro riletto in ritardo', () => {
  const dentroFuori = [[5, 5], [5, 4], [5, 3]];
  const rientra = [[5, 3], [5, 5]];
  // lo scontro «riletto» resta quello di prima della raffica (il giro di lettura di un secondo non è ancora passato)
  const vecchio = scontroVuoto();
  const { s, segnalati } = giocaMovimenti(Array.from({ length: 6 }, (_, i) => (i % 2 ? rientra : dentroFuori)), { scontro: vecchio, riletto: () => vecchio });
  assert.deepEqual(segnalati, ['nem:Predone 1']);
  assert.equal(s.registro.filter((r) => r.opportunita).length, 1);
});

test('due nemici: al massimo due attacchi, uno ciascuno; al Round dopo di nuovo', () => {
  const tra = [[5, 5], [6, 5], [11, 6], [13, 7], [13, 9]]; // esce dalla ZoC del Predone 1, poi passa e esce da quella del 2
  const { s, segnalati } = giocaMovimenti([tra, [[13, 9], [11, 6], [13, 9]], tra]);
  assert.deepEqual(segnalati.sort(), ['nem:Predone 1', 'nem:Predone 2']);
  assert.equal(s.registro.filter((r) => r.opportunita).length, 2);
  // Round 2: il registro conta per Round
  const r2 = giocaMovimenti([tra], { scontro: { ...s, round: 2 } });
  assert.equal(r2.segnalati.length, 2);
});

test('scrittura: se lo scontro letto ora ha già la riga (altra finestra, coda), nessun doppione', () => {
  let s = rigaOpportunita(scontroVuoto(), { da: 'nem:Predone 1', nomeDa: 'Predone 1', contro: 'pg:Michele', nomeContro: 'Michele', movimento: 'm1' });
  const n = s.registro.length;
  s = rigaOpportunita(s, { da: 'nem:Predone 1', nomeDa: 'Predone 1', contro: 'pg:Oshi', nomeContro: 'Oshi', movimento: 'm2' });
  assert.equal(s.registro.length, n, 'uno solo per attaccante, anche contro un altro bersaglio (§5.3)');
  assert.ok(opportunitaNelRound(s, 'nem:Predone 1'));
});

test('annullare il movimento ritira l’attacco: fuori dal registro e dal controllo; rifacendolo si segnala di nuovo', () => {
  const { s, locali } = giocaMovimenti([[[5, 5], [5, 4], [5, 3]]]);
  assert.equal(s.registro.filter((r) => r.opportunita).length, 1);
  const ritirati = new Set(['m0']);
  assert.equal(giaInQuestoRound(s, locali, ritirati).size, 0, 'il movimento annullato non conta più');
  const pulito = senzaOpportunitaDelMovimento(s, 'm0');
  assert.equal(pulito.registro.filter((r) => r.opportunita).length, 0);
  assert.equal(senzaOpportunitaDelMovimento(pulito, 'm0'), pulito, 'niente da togliere: stesso oggetto');
  const { segnalati } = giocaMovimenti([[[5, 5], [5, 4], [5, 3]]], { scontro: pulito });
  assert.deepEqual(segnalati, ['nem:Predone 1']);
});
