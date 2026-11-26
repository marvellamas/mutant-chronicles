import '../tools/guardia-subito.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { contoVa, modificatoriAttivi } from '../src/scheda-vista.js';
import { correzioniAbilitaDaAnnullare, correzioniRimaste, annullaCorrezioniRimaste, quandoAdeguato, vaAbilita } from '../src/adeguamento-abilita.js';

// Lotto 252 — **il collaudo di Davide del 25/11/2026, due difetti con una causa sola.**
//
// Dimitri mostrava Armi da mischia VA 6 invece di 8: il −2 registrato il 23/11 per compensare i due +1 del 2/11 era
// sopravvissuto all'adeguamento del 24/11. Due cose, e la seconda è la ragione per cui è sfuggito a noi:
//   1. l'adeguamento annullava le correzioni **del giorno dichiarato**, e quella era del giorno dopo;
//   2. il «Calcolo» mostrava Mod + Base + Corp + Avanz (che fa 8) e poi «Valore da regole: 6», senza una parola sul −2:
//      **un conto che non torna**, e nessuno lo vedeva.
const { dati } = await datiReali();

const riga = (extra = {}) => ({
  nome: 'Armi da mischia', caratteristica: 'DES', mod: 2, base: 6, corporazione: 0, avanzamento: 0,
  grezzo: 8, limite: 12, totale: 6, calcolato: 8, effettivo: 6,
  scomposizione: [{ etichetta: 'da regole', valore: 6 }],
  correzioniMaster: [{ fonte: 'Correzione del master', valore: -2, nota: 'senza motivo' }],
  ...extra,
});

test('IL RIEPILOGO DEL VA: una correzione del master che cambia il VA si legge nel conto, non solo nel dettaglio', () => {
  const c = contoVa(riga());
  assert.equal(c.correzioniMaster.length, 1, 'il conto del VA deve portare la correzione del master');
  assert.equal(c.correzioniMaster[0].valore, -2);
  assert.match(c.correzioniMaster[0].voce, /Correzione del master/);
  // e il conto torna: da regole 8, con la correzione 6
  assert.equal(c.calcolato, 8);
  assert.equal(c.daRegole, 6);
  const somma = c.colonne.reduce((a, x) => a + x.valore, 0);
  assert.equal(somma + c.correzioniMaster.reduce((a, x) => a + x.valore, 0), c.daRegole,
    `le colonne fanno ${somma} e il valore mostrato è ${c.daRegole}: senza la riga della correzione il riepilogo non torna`);
});

test('IL RIEPILOGO DEL VA: la correzione è anche fra i modificatori attivi accanto al VA', () => {
  const m = modificatoriAttivi(riga());
  assert.ok(m.some((x) => /Correzione del master/.test(x.voce) && x.valore === -2),
    'accanto al VA si vedono i bonus e i malus attivi: una correzione del master è un malus attivo');
});

test('IL RIEPILOGO DEL VA: senza correzioni non cambia niente (nessuna riga in più)', () => {
  const c = contoVa(riga({ correzioniMaster: undefined, totale: 8, calcolato: undefined, effettivo: 8 }));
  assert.deepEqual(c.correzioniMaster, []);
  assert.equal(c.calcolato, null);
  assert.equal(modificatoriAttivi(riga({ correzioniMaster: undefined })).length, 0);
});

const dimitri = (quandoCorrezione) => ({
  formato: 'mutant-personaggio',
  scelte: { nome: 'Dimitri Orlav', regimeAbilita: 2, puntiDirettore: { quando: '2026-11-24T22:58:00.000Z', adeguamento: true, totale: 0 } },
  livelli: [],
  sessione: {},
  correzioni_master: [
    { id: 'due-piu-uno', quando: '2026-11-02T18:34:00.000Z', chiave: 'abilita:Armi da mischia', etichetta: 'VA di Armi da mischia', tipo: 'aggiungi', numero: 1, motivo: '', stato: 'annullata' },
    { id: 'compensativa', quando: quandoCorrezione, chiave: 'abilita:Armi da mischia', etichetta: 'VA di Armi da mischia', tipo: 'aggiungi', numero: -2, motivo: '', stato: 'attiva' },
    { id: 'caratteristica', quando: '2026-11-02T18:00:00.000Z', chiave: 'car:DES', etichetta: 'DES', tipo: 'aggiungi', numero: 2, motivo: 'resta', stato: 'attiva' },
  ],
});

test('L’ADEGUAMENTO non lascia in piedi una correzione alle Abilità dello stesso tipo di quelle che annulla', () => {
  // il criterio non guarda più il giorno: una correzione di calcolo a un'Abilità, attiva al momento dell'adeguamento,
  // si annulla qualunque sia la sua data (il −2 del 23/11 lo ha trovato Davide, non noi)
  const da = correzioniAbilitaDaAnnullare(dimitri('2026-11-23T20:21:00.000Z').correzioni_master, dati);
  assert.ok(da.some((x) => x.id === 'compensativa'), 'la correzione del 23/11 deve essere fra quelle da annullare');
  assert.ok(!da.some((x) => String(x.chiave).startsWith('car:')), 'le Caratteristiche non si toccano (A.293)');
  // e il criterio è dichiarato nei dati, col suo perché
  const R = dati.regole.adeguamento_abilita.annulla_correzioni_abilita;
  assert.equal(R.tutte_le_correzioni_di_calcolo, true);
  assert.match(R.perche_tutte, /lotto 252|23\/11/i, 'il perché del criterio largo si scrive nei dati');
});

test('UN PERSONAGGIO GIÀ ADEGUATO: la correzione rimasta si trova e si annulla, con la riga nello storico', () => {
  const o = dimitri('2026-11-23T20:21:00.000Z');
  assert.equal(quandoAdeguato(o), '2026-11-24T22:58:00.000Z');
  const rimaste = correzioniRimaste(o, dati);
  assert.equal(rimaste.length, 1);
  assert.equal(rimaste[0].id, 'compensativa');
  const esito = annullaCorrezioniRimaste(o, dati, { quando: new Date('2026-11-26T09:00:00.000Z') });
  assert.equal(esito.nuovo.correzioni_master.find((x) => x.id === 'compensativa').stato, 'annullata');
  assert.equal(esito.nuovo.correzioni_master.find((x) => x.id === 'caratteristica').stato, 'attiva', 'le Caratteristiche restano');
  assert.match(esito.nuovo.sessione.storico.at(-1).testo, /Armi da mischia -2/, 'la riga resta nello storico, che il Direttore rilegge');
  // nessun bonus nuovo: il numero delle righe non cambia (si annulla, non si aggiunge)
  assert.equal(esito.nuovo.correzioni_master.length, o.correzioni_master.length, 'niente +2 aggiunto: Davide ha chiesto di annullare, non di compensare');
});

test('UNA CORREZIONE FATTA DOPO L’ADEGUAMENTO non si tocca: è una decisione del Direttore di adesso', () => {
  const o = dimitri('2026-11-25T09:00:00.000Z'); // dopo il 24/11 22:58
  assert.deepEqual(correzioniRimaste(o, dati), [], 'una correzione successiva all’adeguamento resta attiva');
});

test('il VA si legge da un file del disco, e quando non si può il motivo si dice', () => {
  const r = vaAbilita({ scelte: {}, livelli: [] }, 'Armi da mischia', dati);
  assert.equal(r.valore, null);
  assert.ok(r.motivo && r.motivo.length > 3, 'un «?» senza motivo è un ripiego silenzioso (lotto 248)');
});
