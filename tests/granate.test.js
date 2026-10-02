// Granate come munizioni dei lanciagranate (Armamenti §7.20.3; correzione di Davide del 02/10/2026,
// tools/lotti/lotto_granate_0210.mjs): una granata è un oggetto solo, si lancia a mano o si carica; i moduli
// integrati hanno un'alimentazione distinta; la granata caricata stabilisce danno, AC, RS e proprietà.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { massimiSessione, inizializzaSessione, ricaricaArma, consumaColpi, scegliGranata } from '../src/sessione.js';
import { statoRicarica } from '../src/ricarica.js';
import { catalogo } from '../src/equipaggiamento.js';
import { calcolaAttaccoDistanza, dichiarazioneDistanza } from '../src/attacco.js';
import { normalizza } from '../src/character.js';
import { armiStampa } from '../src/stampa.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const voce = (uid, rif, stato, quantita = 1) => ({ uid, rif, stato, quantita, note: '' });
const MOD = 'p:lanciagranate-carabina-punisher';
const STD = 'armi_distanza:granata-a-frammentazione';
const FUMO = 'corredi_dispositivi:granata-fumogena';
const prepara = (voci) => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: voci };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  return { creazione, m, s: inizializzaSessione(m) };
};
const arma = (creazione, s, uid) => calcolaScheda({ creazione, livelli: [], sessione: s }, dati).equipaggiamento.armi.find((a) => a.uid === uid);

test('§7.20.3: quattro granate con danno, AC, RS, proprietà, REP, costo e confezione da cinque senza sconto', () => {
  const g = (rif) => cat.perRif.get(rif);
  const attese = {
    [STD]: ['1d6+1', '1d3', 1, ['Sbilanciante', 'Sbalzante 1'], 'NC', 80],
    'munizioni:granata-a-frammentazione-pesante': ['1d10+1', '1d3', 2, ['Sbilanciante', 'Sbalzante 1'], 'RA', 180],
    [FUMO]: [null, null, 2, [], 'NC', 120],
    'corredi_dispositivi:granata-elettroshock': ['2d4', 1, 1, ['Elettricità'], 'RA', 200],
  };
  for (const [rif, [danno, ac, rs, prop, rep, costo]] of Object.entries(attese)) {
    const o = g(rif);
    assert.deepEqual([o.esplosivo.danno, o.esplosivo.ac, o.esplosivo.rs_q, o.esplosivo.proprieta, o.reperibilita, o.costo], [danno, ac, rs, prop, rep, costo], rif);
    assert.deepEqual(o.confezione, { quantita: 5, costo: 5 * costo }, rif);
  }
  // la standard, la Fumogena e l'Elettroshock si lanciano anche a mano: Armi da Lancio, VA 0, FOR 3, FOR × 3 Q, INC 8
  for (const rif of [STD, FUMO, 'corredi_dispositivi:granata-elettroshock']) {
    const o = g(rif);
    assert.deepEqual([o.tipo, o.abilita, o.modificatore_va, o.for_richiesta, o.gittata_per_for, o.inc, o.pi], ['arma_distanza', 'Armi da lancio', 0, 3, 3, 8, 4], rif);
  }
  assert.equal(g('munizioni:granata-a-frammentazione-pesante').tipo, 'munizioni');
});

test('§7.20.3: compatibilità del formato standard (18 lanciatori) e Deathlock Drum solo con la pesante', () => {
  const std = cat.perRif.get(STD).compatibile_con;
  assert.equal(std.length, 18);
  for (const rif of ['armi_distanza:lanciagranate', 'armi_distanza_corporative:lanciagranate-alleanza', 'armi_distanza_corporative:lanciagranate-carabina-punisher', 'corredi_dispositivi:howler', 'armi_distanza_corporative:lanciagranate-shogun']) assert.ok(std.includes(rif), rif);
  assert.deepEqual(cat.perRif.get(FUMO).compatibile_con, std);
  assert.ok(!std.includes('armi_distanza_corporative:lanciagranate-deathlock-drum'));
  // il Deathlock rifiuta la standard: fra le sue scorte solo la pesante
  const { m } = prepara([voce('d', 'armi_distanza_corporative:deathlock-drum', 'impugnata'), voce('g', STD, 'zaino', 5), voce('h', 'munizioni:granata-a-frammentazione-pesante', null, 5)]);
  assert.deepEqual(m.ricarica['d:lanciagranate-deathlock-drum'].scorte.map((x) => x.uid), ['h']);
});

test('Carabina Punisher: 5 granate standard, carica il modulo, «Attacca!» 1d6+1 AC 1d3 RS 1 Q, 2 → 1, «Ricarica»', () => {
  let { creazione, m, s } = prepara([voce('p', 'armi_distanza_corporative:carabina-punisher', 'impugnata'), voce('g', STD, 'zaino', 5)]);
  // alimentazione distinta: caricatore della carabina e del modulo, ricarica del modulo dalle granate
  assert.equal(m.caricatori[MOD], 2);
  assert.deepEqual(m.ricarica[MOD].scorte.map((x) => [x.uid, x.quantita]), [['g', 5]]);
  assert.equal(m.ricarica.p.granate, undefined);
  // si sceglie la granata: la carica di partenza (munizione di riferimento) torna alla voce, poi si carica
  s = scegliGranata(s, MOD, 'g', m);
  assert.deepEqual([s.munizioni[MOD].colpi, s.munizioni[MOD].tipo], [0, 'g']);
  s = ricaricaArma(s, MOD, m);
  assert.deepEqual([s.munizioni[MOD].colpi, s.scorte.g], [2, 2]);
  // «Attacca!» con il modulo: Abilità, VA e gittata del lanciatore; danno, AC, RS e proprietà della granata
  const w = arma(creazione, s, MOD);
  assert.deepEqual([w.munizioneRiferimento.danno, w.munizioneRiferimento.ac, w.munizioneRiferimento.rs_q, w.granataCaricata.uid], ['1d6+1', '1d3', 1, 'g']);
  assert.deepEqual([w.abilita, w.gittataQ], ['Armi medie', 70]);
  const r = calcolaAttaccoDistanza({ scheda: calcolaScheda({ creazione, livelli: [], sessione: s }, dati), sessione: s }, w, dichiarazioneDistanza({ distanza: 20 }), dati);
  assert.match(r.danno_per_colpo, /^1d6\+\d+$/);
  assert.equal(r.applicazioni, '1d3');
  assert.equal(r.munizioni, 1);
  s = consumaColpi(s, MOD, r.munizioni, m);
  assert.equal(s.munizioni[MOD].colpi, 1);
  assert.equal(s.munizioni.p.colpi, m.caricatori.p); // la carabina non cambia
  s = ricaricaArma(s, MOD, m);
  assert.deepEqual([s.munizioni[MOD].colpi, s.scorte.g], [2, 3]);
});

test('Fumogena nello stesso modulo: cambiare tipo scarica il modulo e rimette le standard nella voce', () => {
  let { creazione, m, s } = prepara([voce('p', 'armi_distanza_corporative:carabina-punisher', 'impugnata'), voce('g', STD, 'zaino', 5), voce('f', FUMO, 'zaino', 5)]);
  s = ricaricaArma(scegliGranata(s, MOD, 'g', m), MOD, m);
  assert.deepEqual(s.scorte, { g: 2 });
  s = scegliGranata(s, MOD, 'f', m);
  assert.deepEqual([s.munizioni[MOD].colpi, s.scorte.g ?? 0], [0, 0]);
  assert.equal(statoRicarica(m.ricarica[MOD], s.munizioni[MOD], s.scorte).possibile, true);
  s = ricaricaArma(s, MOD, m);
  assert.deepEqual([s.munizioni[MOD].colpi, s.munizioni[MOD].tipo, s.scorte.f], [2, 'f', 2]);
  const w = arma(creazione, s, MOD);
  assert.deepEqual([w.munizioneRiferimento.nome, w.munizioneRiferimento.danno, w.munizioneRiferimento.rs_q, w.danno], ['Granata fumogena', null, 2, null]);
});

test('lancio a mano di una granata standard: la stessa voce, senza doppioni; il lancio consuma una granata', () => {
  let { creazione, m, s } = prepara([voce('p', 'armi_distanza_corporative:carabina-punisher', 'impugnata'), voce('g', STD, 'impugnata', 3)]);
  assert.equal(m.caricatori.g, undefined); // nessun caricatore: si lancia dalla quantità della voce
  assert.equal(m.granate.g, 3);
  let w = arma(creazione, s, 'g');
  assert.deepEqual([w.abilita, w.gittataQ, w.inc, w.granata.disponibili], ['Armi da lancio', 6 * 3, 8, 3]);
  s = consumaColpi(s, 'g', 1, m);
  assert.equal(arma(creazione, s, 'g').granata.disponibili, 2);
  // caricare il lanciagranate prende dalla stessa voce
  s = ricaricaArma(scegliGranata(s, MOD, 'g', m), MOD, m);
  assert.deepEqual([s.munizioni[MOD].colpi, arma(creazione, s, 'g').granata.disponibili], [2, 0]);
  assert.equal(consumaColpi(s, 'g', 1, m).scorte.g, 3); // non oltre la quantità
});

test('migrazione: una granata salvata come arma da lancio resta utilizzabile anche nel lanciagranate', () => {
  const vecchio = { ...MISHIMA_AGENTE, equipaggiamento: [voce('p', 'armi_distanza_corporative:carabina-punisher', 'impugnata'), voce('g', STD, 'pronta', 2)] };
  const { scelte, avvisi } = normalizza(vecchio, dati);
  assert.deepEqual(avvisi, []);
  assert.equal(scelte.equipaggiamento[1].rif, STD);
  const m = massimiSessione(calcolaScheda({ creazione: scelte, livelli: [] }, dati), scelte, dati);
  // vecchia sessione con la granata come caricatore da 1: si ignora, la voce resta la scorta
  const s = inizializzaSessione(m);
  assert.deepEqual(m.ricarica[MOD].scorte.map((x) => x.uid), ['g']);
  assert.equal(s.munizioni.g, undefined);
});

test('collaudo: chi non ha lanciagranate non cambia; la SS della Punisher tiene «car. 1/2» per il modulo', () => {
  const righe = ['armi_distanza_corporative:carabina-punisher', 'armi_distanza_corporative:deathlock-drum'].flatMap((rif) => {
    const { creazione } = prepara([voce('p', rif, 'impugnata')]);
    return armiStampa(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  });
  const colpi = (nome) => righe.find((x) => x.nome === nome).colpi;
  assert.deepEqual(colpi('Lanciagranate Carabina Punisher'), { modo: 'caricatore', capacita: 2, file: 2 });
  assert.deepEqual(colpi('Lanciagranate Deathlock Drum'), { modo: 'inserimento', capacita: 6, file: 1 }); // come prima
  assert.equal(righe.find((x) => x.nome === 'Lanciagranate Carabina Punisher').danno, '1d6+1 (mun.)');
  const solo = prepara([voce('x', 'armi_distanza:pistola-semiautomatica', 'impugnata')]);
  assert.equal(Object.keys(solo.m.granate).length, 0);
  assert.deepEqual(Object.keys(solo.m.ricarica), ['x']);
});

test('A.86, nel frattempo: danno della tabella senza bonus di Caratteristica (lanciatore e lancio a mano); flag nei dati', () => {
  assert.equal(dati.regole.danno_caratteristica.esplosivi.senza_bonus, true);
  const armaDi = (rif, uid, d = dati) => {
    const { creazione, s: ses } = prepara([voce(uid, rif, 'impugnata', 2)]);
    return calcolaScheda({ creazione, livelli: [], sessione: ses }, d).equipaggiamento.armi.find((x) => x.uid === uid);
  };
  // modulo della Punisher e granata lanciata a mano: danno della tabella, il bonus escluso con il motivo
  const mod = armaDi('armi_distanza_corporative:carabina-punisher', 'p');
  assert.equal(mod.uid, 'p');
  const modulo = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [voce('p', 'armi_distanza_corporative:carabina-punisher', 'impugnata')] }, livelli: [] }, dati).equipaggiamento.armi.find((x) => x.uid === MOD);
  assert.deepEqual([modulo.danno.una_mano, modulo.bonusCaratteristica?.bonus ?? 0], ['1d6+1', 0]);
  const g = armaDi(STD, 'g');
  assert.deepEqual([g.danno.una_mano, g.bonusCaratteristica.bonus], ['1d6+1', 0]);
  assert.match(g.bonusCaratteristica.esclusoDa, /A.86/);
  // il lanciarazzi: danno del razzo di riferimento senza bonus
  const lr = armaDi('armi_distanza:lanciarazzi', 'r');
  assert.equal(lr.danno.una_mano, lr.munizioneRiferimento.danno);
  // senza il flag torna il bonus del §5.13 (DES 7 del Mishima: +1 alle Armi da lancio)
  const d2 = structuredClone(dati);
  d2.regole.danno_caratteristica.esplosivi.senza_bonus = false;
  assert.equal(armaDi(STD, 'g', d2).danno.una_mano, '1d6+2');
});

test('Lucas (collaudo): il modulo della Punisher torna a 1d6+1', async () => {
  const { readFileSync } = await import('node:fs');
  const { deserializzaPersonaggio } = await import('../src/character.js');
  const { calcolaSchedaPersonaggio } = await import('../src/avanzamento.js');
  const p = deserializzaPersonaggio(readFileSync(new URL('./collaudo/Lucas_liv6_2026-09-28 (2).json', import.meta.url), 'utf8'));
  const w = calcolaSchedaPersonaggio(p, dati).equipaggiamento.armi.find((x) => x.nome === 'Lanciagranate Carabina Punisher');
  assert.deepEqual(w.danno, { una_mano: '1d6+1', due_mani: '1d6+1' });
});

test('cambio di tipo: le 2 granate di partenza tornano nell’Inventario come standard (5 comprate + 2 = 7)', async () => {
  const { granateDiPartenza } = await import('../src/sessione.js');
  const { restituisciGranate } = await import('../src/equipaggiamento.js');
  let { creazione, m, s } = prepara([voce('p', 'armi_distanza_corporative:carabina-punisher', 'impugnata'), voce('g', STD, 'zaino', 5)]);
  assert.equal(s.munizioni[MOD].colpi, 2);
  const ritorno = granateDiPartenza(s, MOD, 'g', m);
  assert.deepEqual(ritorno, { rif: STD, quantita: 2 });
  s = scegliGranata(s, MOD, 'g', m);
  const voci = restituisciGranate(creazione.equipaggiamento, ritorno, 'nuova', dati);
  assert.deepEqual(voci.map((v) => [v.uid, v.quantita]), [['p', 1], ['g', 7]]);
  // con le scelte nuove: 7 disponibili, poi la ricarica ne inserisce 2
  const c2 = { ...creazione, equipaggiamento: voci };
  const m2 = massimiSessione(calcolaScheda({ creazione: c2, livelli: [] }, dati), c2, dati);
  s = ricaricaArma(s, MOD, m2);
  assert.deepEqual([s.munizioni[MOD].colpi, m2.ricarica[MOD].scorte[0].quantita - s.scorte.g], [2, 5]);
  // dopo una ricarica il tipo è una voce: niente carica di partenza da restituire
  assert.equal(granateDiPartenza(s, MOD, 'g', m2), null);
  // senza granate nell'Inventario, le 2 di partenza diventano una voce nuova
  const { creazione: c3, m: m3, s: s3 } = prepara([voce('p', 'armi_distanza_corporative:carabina-punisher', 'impugnata'), voce('f', FUMO, 'zaino', 1)]);
  const r3 = granateDiPartenza(s3, MOD, 'f', m3);
  assert.deepEqual(restituisciGranate(c3.equipaggiamento, r3, 'nuova', dati).map((v) => [v.uid, v.rif, v.quantita]), [['p', 'armi_distanza_corporative:carabina-punisher', 1], ['f', FUMO, 1], ['nuova', STD, 2]]);
});
