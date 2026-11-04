// Lotto 172, A.225 (Davide, 03/11/2026): ogni distanza conserva la sua unità e si converte nella scala della scena, una volta
// sola; 1 Q Tattico = 10 Q Base; frazioni esatte; gli ingombri convenzionali delle pedine non si convertono.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { converti, inScala, inQBase, misureInScala, movimentoInScala } from '../src/mappa/distanze.js';
import { misureDelTemplate, templateInScala, nuovoTemplate, celleTemplate, erroreTemplate, cambiaMisura, testoMisure } from '../src/mappa/template.js';
import { conScala } from '../src/mappa/scala.js';
import { pezziDellaScena } from '../src/mappa/partecipanti.js';
import { movimentoInVolo } from '../src/mappa/volo.js';
import { portataInScena } from '../src/mappa/zoc.js';
import { ingombroCreatura } from '../src/mappa/token.js';
import { nuovaScena } from '../src/mappa/scena.js';

const { dati } = await datiReali();
const BASE = { scala: 'base' };
const TATTICA = { scala: 'tattica' };
const RT = dati.mappa.template;
const giovane = JSON.parse(readFileSync(new URL('../esempi/nemici/mostri/dragomedusa-giovane.json', import.meta.url), 'utf8'));

test('converti: 1 Q Tattico = 10 Q Base dai metri delle scale; stessa unità identica; frazioni esatte, mai arrotondate per eccesso', () => {
  assert.equal(converti(12, 'tattica', 'base', dati), 120);
  assert.equal(converti(120, 'base', 'tattica', dati), 12);
  assert.equal(converti(4, 'base', 'tattica', dati), 0.4, 'non 0,4000000000000001 e non 1');
  assert.equal(converti(1, 'base', 'tattica', dati), 0.1);
  assert.equal(converti(7, 'base', 'base', dati), 7);
  assert.equal(converti(1.25, 'tattica', 'tattica', dati), 1.25);
  // il rapporto viene dai dati (1,5 e 15 m), non dal codice
  const altri = structuredClone(dati);
  altri.mappa.scale.elenco.find((s) => s.id === 'tattica').q_metri = 30;
  assert.equal(converti(1, 'tattica', 'base', altri), 20);
  assert.equal(inScala({ valore: 12, unita: 'tattica' }, BASE, dati), 120);
  assert.equal(inScala({ valore: 12, unita: 'tattica' }, TATTICA, dati), 12);
});

test('il soffio di 12 × 1 Q Tattici: in Q Base diventa 120 × 10 (non 1.200); in Q Tattici si usa così com’è', () => {
  const base = nuovaScena({ id: 's', nome: 'S', colonne: 200, righe: 40, dati });
  const md = misureDelTemplate({ lunghezza: 12, larghezza: 1 }, 'tattica', base, dati);
  assert.deepEqual(md.misure, { lunghezza: 120, larghezza: 10 });
  assert.deepEqual(md.dichiarate, { unita: 'tattica', misure: { lunghezza: 12, larghezza: 1 } });
  const t = nuovoTemplate({ id: 't', forma: 'linea', misure: md.misure, dichiarate: md.dichiarate, origine: [0, 20], direzione: 0, colore: '#ff0000' });
  assert.equal(erroreTemplate(t, RT), null, 'una misura dichiarata entro il massimo vale anche se convertita è più lunga');
  const celle = celleTemplate(t, base.griglia, RT);
  const n = celle.reduce((s, x) => s + x, 0);
  // larga 10 e centrata sul Q d'origine copre 11 righe (le due di bordo per metà: «almeno metà», Magia): 120 × 11
  assert.ok(n >= 1150 && n <= 1350, `circa 120 × 10 quadretti, non 1.200 × 100: ${n}`);
  assert.match(testoMisure(t, { ...RT, nome_scala: (u) => dati.mappa.scale.elenco.find((x) => x.id === u).nome }), /Linea 12 Q Tattici → 120 Q/);
  // nella scala della scena: nessuna conversione, nessuna misura dichiarata da ricordare
  const tat = nuovaScena({ id: 't', nome: 'T', colonne: 40, righe: 40, dati });
  const md2 = misureDelTemplate({ lunghezza: 12, larghezza: 1 }, 'tattica', { ...tat, scala: 'tattica' }, dati);
  assert.deepEqual(md2, { misure: { lunghezza: 12, larghezza: 1 }, dichiarate: null });
  // la seconda conversione non c'è: un template già convertito, riportato alla stessa scala, non cambia
  assert.deepEqual(templateInScala(t, 'base', base, dati).misure, { lunghezza: 120, larghezza: 10 });
});

test('la scena cambia scala: i template tornano alla misura scritta e si riconvertono, senza moltiplicarsi', () => {
  const s0 = { ...nuovaScena({ id: 's', nome: 'S', colonne: 60, righe: 60, dati }), scala: 'tattica' };
  const t = nuovoTemplate({ id: 't', forma: 'linea', misure: { lunghezza: 12, larghezza: 1 }, origine: [1, 1], colore: '#ff0000' });
  const s1 = conScala({ ...s0, template: [t] }, 'base', dati);
  assert.deepEqual(s1.template[0].misure, { lunghezza: 120, larghezza: 10 });
  assert.deepEqual(s1.template[0].dichiarate, { unita: 'tattica', misure: { lunghezza: 12, larghezza: 1 } });
  const s2 = conScala(s1, 'tattica', dati);
  assert.deepEqual(s2.template[0].misure, { lunghezza: 12, larghezza: 1 }, 'non 1,2 e non 1.200');
  assert.equal(s2.template[0].dichiarate, undefined);
  // cambiare la misura con ↑ ↓ dà una misura nella scala della scena: la dichiarata di prima non vale più
  assert.equal(cambiaMisura(s1.template[0], 1, RT).dichiarate, undefined);
});

test('movimento e volo: il Dragomedusa giovane (volo 120 Q Base, 12 Q Tattici) vola 12 in Q Tattici e 120 in Q Base', () => {
  const scontro = { partecipanti: [{ id: 'nem:dg:1', tipo: 'nemico', nemico: 'dg', nome: 'Dragomedusa 1', lato: 'avversario', pv: { attuali: 10, massimo: 10 }, stati: [], scheda: giovane }], round: 1, turno: null, iniziativa: [] };
  const inBase = pezziDellaScena({ scontro, scena: BASE }, dati).find((p) => p.tipo === 'nemico');
  const inTat = pezziDellaScena({ scontro, scena: TATTICA }, dati).find((p) => p.tipo === 'nemico');
  assert.equal(inBase.voloQ, 120);
  assert.equal(inTat.voloQ, 12, 'non 120');
  assert.deepEqual([inBase.movimento.passo, inTat.movimento.passo], [4, 0.4]);
  assert.equal(movimentoInVolo(inTat, dati, TATTICA).passo, 12);
  // il volo predefinito del Giocatore §5.2.3 (6 / 12 / 18 Q Base) in Q Tattici: 0,6 / 1,2 / 1,8
  const senza = { ...inTat, voloQ: null, scheda: null };
  assert.deepEqual(movimentoInVolo(senza, dati, TATTICA), { passo: 0.6, corsa: 1.2, scatto: 1.8 });
  assert.deepEqual(movimentoInVolo(senza, dati, BASE), dati.mappa.volo.movimento_predefinito.passo === 6 ? { passo: 6, corsa: 12, scatto: 18 } : movimentoInVolo(senza, dati, BASE));
  // gli ingombri convenzionali non si convertono: la pedina del Dragomedusa giovane resta 1 × 1 in Q Tattici
  assert.equal(ingombroCreatura(giovane, dati, 'tattica'), 1);
  assert.deepEqual(movimentoInScala({ passo: 6, corsa: null, scatto: 18 }, 'base', TATTICA, dati), { passo: 0.6, corsa: null, scatto: 1.8, unita: 'tattica' });
  assert.deepEqual(misureInScala({ raggio: 2 }, 'base', TATTICA, dati), { raggio: 0.2 });
});

test('«Attacca!» e zone di controllo: la distanza della mappa va in Q Base per le gittate; la portata in Q Base si divide per 10 in Q Tattici', () => {
  assert.equal(inQBase(12, TATTICA, dati), 120);
  assert.equal(inQBase(12, BASE, dati), 12, 'in Q Base la distanza della mappa è già quella delle gittate');
  const p = { scheda: { attacchi: [{ tipo: 'ravvicinato', portata_q: 2 }] } };
  assert.deepEqual([portataInScena(p, BASE, dati), portataInScena(p, TATTICA, dati)], [2, 0.2]);
});
