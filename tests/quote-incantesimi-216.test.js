import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 216 (A.287) — **un solo conto delle quote degli incantesimi.**
//
// Il difetto: i liberi vengono dall'Intelligenza, e due parti del codice la leggevano in modo diverso. La scheda applicava le correzioni del Direttore prima
// di contare; i controlli (creazione, «Sali di livello», «Da scegliere», storico) leggevano lo stato senza. Su un personaggio con una correzione di
// Intelligenza (Dimitri, −2 del 26/10) davano 6 e 8 liberi: la scheda diceva «18/20», il controllo ne voleva 22. Nessun test lo vedeva perché nessun
// personaggio dei test aveva una correzione di Intelligenza: due letture che coincidono «quasi sempre» non si accorgono di divergere.
//
// Questo test **costruisce** il caso (correzioni di Intelligenza in più e in meno, a ogni livello) e pretende che i due conti coincidano; e prova col
// mutante (lo stato senza correzioni) che saprebbe accorgersi del difetto di prima.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { dueConti, alProssimoLivello, comeApp } from '../tools/quote-incantesimi-controllo.mjs';
import { statoQuote, ricalcolaAvanzamento, validaLivello, caratteristicheEffettive } from '../src/avanzamento.js';
import { contoDaScheda, motivoBloccoIncantesimi } from '../src/quote-incantesimi.js';

const { dati } = await datiReali();
const leggi = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const PERSONAGGI = [
  ...readdirSync(new URL('../esempi/', import.meta.url)).filter((f) => f.endsWith('.json')).map((f) => `esempi/${f}`),
  ...readdirSync(new URL('../tests/collaudo/', import.meta.url)).filter((f) => f.endsWith('.json')).map((f) => `tests/collaudo/${f}`),
].filter((p) => { try { const o = leggi(p); return !!o.scelte; } catch { return false; } });

const conCorrezioneInt = (json, numero) => ({
  ...json,
  correzioni_master: [...(json.correzioni_master ?? []), { id: 'cm-test-int', quando: '2026-10-26T18:46:59.671Z', chiave: 'car:INT', etichetta: 'Intelligenza', tipo: 'aggiungi', numero, motivo: 'prova', stato: 'attiva' }],
});

test('i personaggi di prova ci sono, e almeno uno è un taumaturgo (altrimenti il test non guarda niente)', () => {
  assert.ok(PERSONAGGI.length >= 8, `solo ${PERSONAGGI.length} personaggi`);
  const conMagia = PERSONAGGI.filter((p) => dueConti(comeApp(leggi(p)), dati)?.controlli.totale > 0);
  assert.ok(conMagia.length >= 2, 'servono almeno due personaggi con quote di incantesimi');
});

for (const numero of [0, -2, +2, -4]) {
  test(`I DUE CONTI COINCIDONO su tutti i personaggi, adesso e al livello dopo, con una correzione di Intelligenza di ${numero >= 0 ? '+' : ''}${numero}`, () => {
    let guardati = 0;
    for (const p of PERSONAGGI) {
      const base = leggi(p);
      const json = numero ? conCorrezioneInt(base, numero) : base;
      const pers = comeApp(json);
      for (const [quando, pp] of [['adesso', pers], ['livello dopo', alProssimoLivello(pers, dati)]]) {
        if (!pp) continue;
        const c = dueConti(pp, dati);
        if (!c) continue;
        guardati += 1;
        assert.equal(c.diverge, false, `${p} (${quando}, INT ${numero}): controlli ${JSON.stringify(c.controlli)} contro scheda ${JSON.stringify(c.scheda)}`);
      }
    }
    assert.ok(guardati >= PERSONAGGI.length, `ha guardato solo ${guardati} conti: un controllo verde su zero voci non vale`);
  });
}

test('la correzione di Intelligenza MUOVE davvero i liberi (il caso non è neutro): −2 sul Custode toglie liberi, +2 ne dà', () => {
  const custode = leggi('esempi/Fratello-Anselmo-Viri_liv3_2026-10-02.json');
  const l = (json) => dueConti(comeApp(json), dati).controlli.liberi;
  const base = l(custode);
  assert.ok(l(conCorrezioneInt(custode, -4)) < base, 'un −4 deve abbassare i liberi');
  assert.ok(l(conCorrezioneInt(custode, +4)) > base, 'un +4 deve alzarli');
  assert.equal(l(conCorrezioneInt(custode, 0)), base);
});

test('MUTANTE: con lo stato SENZA le correzioni (la lettura di prima del 216) i due conti divergono — il test sa accorgersene', () => {
  const custode = conCorrezioneInt(leggi('esempi/Fratello-Anselmo-Viri_liv3_2026-10-02.json'), -4);
  const pers = comeApp(custode);
  const stato = ricalcolaAvanzamento(pers, dati).stato;
  const vecchio = statoQuote({ ...stato, correzioniMaster: [] }, dati); // come leggevano i controlli prima
  const nuovo = statoQuote(stato, dati);
  assert.notEqual(vecchio.liberi, nuovo.liberi, 'senza le correzioni i liberi sono un altro numero: è il difetto di prima');
  assert.equal(nuovo.liberi, dueConti(pers, dati).scheda.liberi);
});

test('le correzioni si applicano UNA volta sola: caratteristicheEffettive su uno stato già corretto non le ripete', () => {
  const pers = comeApp(conCorrezioneInt(leggi('esempi/Fratello-Anselmo-Viri_liv3_2026-10-02.json'), -2));
  const st = ricalcolaAvanzamento(pers, dati).stato;
  const una = caratteristicheEffettive(st, dati);
  assert.equal(una.INT, st.car.INT - 2);
  assert.deepEqual(caratteristicheEffettive({ ...st, car: una, carCorrette: true }, dati), una, 'dichiarate già corrette: invariate');
});

test('un avviso sulle quote dovuto a una correzione di Intelligenza lo dice, e non dà la colpa a una «scelta forzata dal Direttore»', () => {
  // il Custode con 8 incantesimi e una correzione che abbassa i liberi sotto quanti ne ha scelti
  const duro = conCorrezioneInt(leggi('esempi/Fratello-Anselmo-Viri_liv3_2026-10-02.json'), -8);
  const pers = comeApp(duro);
  const st = ricalcolaAvanzamento(pers, dati).stato;
  const voce = { grado: { classe: st.classi[0].nome }, tiroPV: 1, tiroPM: 1 };
  const err = validaLivello(pers, voce, dati);
  const q = err.filter((e) => /incantesimi|Intelligenza/.test(e.problema));
  assert.ok(q.length, 'il caso di prova deve produrre davvero l avviso: un test che non lo produce non prova niente');
  {
    assert.match(q[0].problema, /Intelligenza/, 'deve dire che viene dalla correzione di Intelligenza');
    assert.ok(q[0].procedibile, 'e non deve bloccare');
    assert.doesNotMatch(q[0].problema, /forzata dal Direttore/);
  }
});

// --- C: chi non può procedere deve sapere cosa manca e chi lo sblocca ---
const catalogoFinto = [
  { nome: 'A', macrofamiglia: 'Fisica', livello_base: 1 }, { nome: 'B', macrofamiglia: 'Mentale', livello_base: 1 }, { nome: 'C', macrofamiglia: 'Fisica', livello_base: 9 },
];
const contoPieno = (residuo) => contoDaScheda({ quote: { perMacro: { Fisica: 1, Mentale: 1 }, liberi: 0, liberiUsati: 0, totale: 2 + residuo }, conosciuti: [{ nome: 'X', macrofamiglia: 'Fisica' }, { nome: 'Y', macrofamiglia: 'Mentale' }], livelloMassimo: 3, scalaPotere: 'taumaturgo' });

test('VICOLO CIECO: mancano incantesimi e ogni riga è fuori quota → una riga che dice cosa manca e chi sblocca', () => {
  const m = motivoBloccoIncantesimi(contoPieno(2), catalogoFinto, { noti: new Set(['X', 'Y']), nuovi: [], master: false });
  assert.ok(m, 'il giocatore bloccato deve avere una spiegazione');
  assert.match(m, /Ti mancano 2 incantesimi/);
  assert.match(m, /Direttore/);
  assert.match(m, /Modifica master/);
  assert.ok(!m.includes('\n'), 'una riga, non un riquadro');
});

test('niente vicolo cieco: non compare se qualcosa si può ancora scegliere, se non manca niente, o per il Direttore', () => {
  const libero = [{ nome: 'Z', macrofamiglia: 'Mentale', livello_base: 1 }];
  const conMentale = contoDaScheda({ quote: { perMacro: { Fisica: 1, Mentale: 2 }, liberi: 0, liberiUsati: 0, totale: 3 }, conosciuti: [{ nome: 'X', macrofamiglia: 'Fisica' }, { nome: 'Y', macrofamiglia: 'Mentale' }], livelloMassimo: 3, scalaPotere: 'taumaturgo' });
  assert.equal(motivoBloccoIncantesimi(conMentale, libero, { noti: new Set(['X', 'Y']), nuovi: [], master: false }), null, 'c\'è un posto libero');
  assert.equal(motivoBloccoIncantesimi(contoPieno(0), catalogoFinto, { noti: new Set(['X', 'Y']), nuovi: [], master: false }), null, 'non manca niente');
  assert.equal(motivoBloccoIncantesimi(contoPieno(2), catalogoFinto, { noti: new Set(['X', 'Y']), nuovi: [], master: true }), null, 'il Direttore forza: non è bloccato');
});

// --- il difetto che il tablet ha fatto vedere: un avviso «procedibile» che per un tablet fermava tutto in silenzio ---
test('IL TABLET NON RESTA BLOCCATO IN SILENZIO: ogni avviso procedibile ha la finestrella «Procedi comunque» nella conferma della salita', () => {
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  const i = app.indexOf('async conferma()');
  assert.ok(i > 0);
  const corpo = app.slice(i, i + 7000);
  // la salita normale (non la correzione) deve chiedere conferma per gli avvisi procedibili invece di ridisegnare e basta
  const salita = corpo.slice(corpo.indexOf('const inMaster'));
  assert.match(salita, /every\(\(e\) => e\.procedibile\)/, 'la salita normale deve riconoscere gli avvisi procedibili');
  assert.match(salita, /Procedi comunque/, 'e chiedere «Procedi comunque»');
  assert.match(salita, /bozza\.procedi = true/);
  assert.match(salita, /registraStorico\(testoProcedi/, 'lasciando la riga nello storico');
});
