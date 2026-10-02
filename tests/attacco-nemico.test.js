// Tavolo del Master, pezzo 5: attacchi dei nemici con «Attacca!» (src/nemico-attacco.js), esito del d20
// (src/prova.js, Giocatore §1.6–1.7), proposta per «Colpito» (pezzo 4), nemico contro nemico, partecipanti a
// mano con un attacco e riga di registro (src/scontro.js → registraAttacco). Esempi di esempi/nemici/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attacchiDi, armaDaAttacco, calcolaAttaccoNemico, leggiDanno, propostaColpo } from '../src/nemico-attacco.js';
import { esitoProva } from '../src/prova.js';
import { tiriRichiesti, esitoAttacco } from '../src/ui/attacco-nemico.js';
import { applicaColpo } from '../src/danno.js';
import { vistaPlancia } from '../src/tavolo.js';
import { nuovoScontro, aggiungiNemici, aggiungiPartecipante, attaccoManuale, registraAttacco, registraColpo, validaScontro } from '../src/scontro.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const leggi = (f) => JSON.parse(readFileSync(new URL(`../esempi/${f}`, import.meta.url), 'utf8'));
const legionario = leggi('nemici/legionario-oscuro.json');
const predone = leggi('nemici/predone-delle-lande.json');
const s0 = aggiungiNemici(aggiungiNemici(nuovoScontro({ id: 'scontro-attacchi', pg: [] }), legionario, 1), predone, 1);
const [leg, pre] = s0.partecipanti;
const indice = (p, nome) => attacchiDi(p).findIndex((a) => a.nome === nome);

test('adattatore: il VA e il danno dell’attacco vengono dal formato, senza bonus aggiunti', () => {
  const lama = calcolaAttaccoNemico(leg, indice(leg, 'Lama nefaria'), {}, dati);
  assert.equal(lama.arma.tipo, 'arma_ravvicinata');
  assert.equal(lama.arma.esterno, true);
  assert.equal(lama.risultato.va_finale, 13);
  assert.equal(lama.risultato.danno.formula, '1d10+3');
  assert.ok(lama.risultato.provenienza.righe?.length ?? lama.risultato.provenienza.length, 'provenienza del VA presente');

  const fucile = calcolaAttaccoNemico(pre, indice(pre, 'Fucile a canne mozze'), { distanza: 5 }, dati);
  assert.equal(fucile.arma.tipo, 'arma_distanza');
  assert.equal(fucile.risultato.va_finale, 7);
  assert.equal(leggiDanno(fucile.risultato.danno_per_colpo).formula, '2d4');
});

test('adattatore: la distanza e le opzioni di «Attacca!» cambiano il VA come per i PG', () => {
  const vicino = calcolaAttaccoNemico(leg, indice(leg, "Fucile d'assalto"), { distanza: 20 }, dati);
  const lontano = calcolaAttaccoNemico(leg, indice(leg, "Fucile d'assalto"), { distanza: 200 }, dati);
  assert.ok(lontano.risultato.va_finale < vicino.risultato.va_finale || lontano.risultato.impossibile, 'oltre la gittata il VA cala o l’attacco è impossibile');
});

test('§1.6–1.7: esiti del d20 (Magistrale, Maldestro, 2 con VA alto, automatico, impossibile)', () => {
  assert.equal(esitoProva(13, 1, dati).esito, 'magistrale');
  assert.equal(esitoProva(13, 20, dati).esito, 'maldestro');
  assert.equal(esitoProva(13, 13, dati).esito, 'successo');
  assert.equal(esitoProva(13, 14, dati).esito, 'fallimento');
  assert.equal(esitoProva(13, 2, dati).esito, 'successo');
  const soglia = dati.regole.magistrale_naturale.soglia_va;
  // il 2 Magistrale con VA almeno 21 vale solo dove si tira comunque (§1.7.1: tiro obbligatorio, Prove contrapposte)
  assert.equal(esitoProva(soglia, 2, dati).esito, 'automatico');
  assert.equal(esitoProva(soglia, 2, dati, { obbligatoria: true }).esito, 'magistrale');
  assert.equal(esitoProva(soglia - 1, 2, dati, { obbligatoria: true }).esito, 'successo');
  assert.equal(esitoProva(20, null, dati).esito, 'automatico');
  assert.equal(esitoProva(0, 5, dati).esito, 'impossibile');
  assert.equal(esitoProva(10, null, dati).esito, 'da_tirare');
});

test('esito dell’attacco: colpito, mancato, Magistrale, Maldestro; raffiche con un tiro per colpo', () => {
  const { arma, risultato } = calcolaAttaccoNemico(leg, indice(leg, 'Lama nefaria'), {}, dati);
  const tiri = tiriRichiesti(arma, risultato);
  assert.equal(tiri.length, 1);
  assert.deepEqual([esitoAttacco(tiri, [9], dati).esito, esitoAttacco(tiri, [9], dati).colpisce], ['successo', true]);
  assert.deepEqual([esitoAttacco(tiri, [15], dati).esito, esitoAttacco(tiri, [15], dati).colpisce], ['fallimento', false]);
  assert.deepEqual([esitoAttacco(tiri, [1], dati).esito, esitoAttacco(tiri, [1], dati).magistrale], ['magistrale', true]);
  assert.equal(esitoAttacco(tiri, [20], dati).esito, 'maldestro');
  assert.equal(esitoAttacco(tiri, [null], dati).completo, false);
  const due = [{ va: 10 }, { va: 10 }];
  const e = esitoAttacco(due, [15, 4], dati);
  assert.deepEqual([e.colpisce, e.riusciti, e.esito], [true, 1, 'successo']);
});

test('«Colpito» precompilata: Legionario Oscuro contro Torvald, corpo a corpo, danno Magico', () => {
  const { attacco, risultato } = calcolaAttaccoNemico(leg, indice(leg, 'Lama nefaria'), {}, dati);
  const p = propostaColpo(attacco, risultato, { magistrale: false });
  assert.deepEqual({ formula: p.formula, natura: p.natura, tipo: p.tipo, ac: p.ac, proprieta: p.proprieta, m: p.moltiplicatore, m1: p.moltiplicatorePrimo },
    { formula: '1d10+3', natura: 'Magico', tipo: 'ravvicinato', ac: 1, proprieta: ['Perforante 1'], m: 1, m1: 1 });
  const magi = propostaColpo(attacco, risultato, { magistrale: true });
  assert.equal(magi.moltiplicatorePrimo, risultato.danno.moltiplicatore_magistrale);
  assert.ok(magi.moltiplicatorePrimo > 1);
  // la proposta va in applicaColpo come nella finestra: danno 10 Magico con Perforante 1 su Torvald
  const torvald = vistaPlancia(readFileSync(new URL('../esempi/Torvald-Krane_liv6_2026-10-02.json', import.meta.url), 'utf8'), dati, 'Torvald-Krane_liv6_2026-10-02.json');
  const r = applicaColpo({ nome: torvald.nome, pv: torvald.pv, ferite: torvald.ferite.grado, ar: torvald.ar }, { danni: [10], natura: p.natura, tipo: p.tipo, difesa: 'nessuna', proprieta: p.proprieta }, dati);
  assert.ok(r.pv.dopo < torvald.pv.attuali);
});

test('«Colpito» precompilata: un Predone spara a Rhea (2d4, a distanza, Naturale)', () => {
  const { attacco, risultato } = calcolaAttaccoNemico(pre, indice(pre, 'Fucile a canne mozze'), { distanza: 5 }, dati);
  const p = propostaColpo(attacco, risultato, { colpiASegno: 1 });
  assert.deepEqual([p.formula, p.natura, p.tipo, p.ac], ['2d4', 'Naturale', 'distanza', 1]);
});

test('nemico contro nemico: il Predone attacca il Legionario, attacco e colpo nel registro, scontro valido', () => {
  const { attacco, risultato } = calcolaAttaccoNemico(pre, indice(pre, 'Machete'), {}, dati);
  let s = registraAttacco(s0, { attaccante: pre.nome, bersaglio: leg.nome, arma: attacco.nome, va: risultato.va_finale, tiri: [{ valore: 3, origine: 'vivo', esito: 'successo' }], esito: 'successo' });
  assert.match(s.registro.at(-1).testo, new RegExp(`${pre.nome} attacca ${leg.nome} con Machete: VA 8, tiro 3 \\(dal vivo\\) → colpito\\.`));
  const p = propostaColpo(attacco, risultato);
  const r = applicaColpo({ nome: leg.nome, pv: leg.pv, ferite: null, ar: leg.scheda.ar }, { danni: [9], natura: p.natura, tipo: p.tipo, difesa: 'nessuna', proprieta: p.proprieta }, dati);
  s = registraColpo(s, { bersaglio: leg.id, nome: leg.nome, tipo: 'nemico', testo: 'colpo', prima: { pv: leg.pv.attuali, stati: [] }, dopo: { pv: r.pv.dopo, stati: [] } });
  assert.equal(s.partecipanti.find((x) => x.id === leg.id).pv.attuali, r.pv.dopo);
  assert.ok(s.registro.findIndex((x) => /attacca/.test(x.testo)) < s.registro.findIndex((x) => x.testo === 'colpo'));
  assert.doesNotThrow(() => validaScontro(s));
});

test('partecipante a mano: l’attacco scritto si registra e si usa; senza attacco niente pulsante', () => {
  assert.equal(attaccoManuale({ nome: 'Pistola', va: 9 }), null);
  assert.equal(attaccoManuale({ nome: 'Pistola', va: 9, danno: 'tanto' }), null);
  let s = aggiungiPartecipante(s0, { nome: 'Sicario', base: 3, attacco: { nome: 'Pistola', tipo: 'distanza', va: 9, danno: '1d8 + 1', natura: 'Naturale' } });
  s = aggiungiPartecipante(s, { nome: 'Passante', base: 0 });
  const sicario = s.partecipanti.find((x) => x.nome === 'Sicario');
  const passante = s.partecipanti.find((x) => x.nome === 'Passante');
  assert.deepEqual(sicario.attacco, { nome: 'Pistola', tipo: 'distanza', va: 9, danno: '1d8+1', natura: 'Naturale', gittata_q: 10, modalita: ['S'] });
  assert.equal(attacchiDi(passante).length, 0);
  const { risultato } = calcolaAttaccoNemico(sicario, 0, { distanza: 5 }, dati);
  assert.equal(risultato.va_finale, 9);
  assert.equal(leggiDanno(risultato.danno_per_colpo).formula, '1d8+1');
  assert.doesNotThrow(() => validaScontro(s));
});

test('armaDaAttacco: con «rif» del catalogo l’Abilità viene dall’arma, senza resta nulla', () => {
  assert.equal(armaDaAttacco({ nome: 'X', tipo: 'ravvicinato', va: 5, danno: '1d6' }, 'u', dati).abilita, null);
});
