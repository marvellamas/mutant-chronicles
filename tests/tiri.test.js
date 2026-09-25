import { test } from 'node:test';
import assert from 'node:assert/strict';
import { specTiro, tira, tiroManuale, migraTiro, valoreTiro } from '../src/tiri.js';
import { nuoveScelte, normalizza, deserializza, serializza, specTiroPM, specTiroPuntiEroe } from '../src/character.js';
import { calcolaScheda, validaScelte } from '../src/calc.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();

const ARCANISTA = {
  ...nuoveScelte(),
  nome: 'Ada', concetto: 'Arcanista della Fratellanza',
  corporazione: 'Fratellanza', puntiCaratteristica: { INT: 2, SAG: 1, COS: 2 },
  addestramento: 'Taumaturgo', classe: 'Arcanista',
  puntiAbilitaLiberi: { 'Potere': 2, 'Occultismo': 2, 'Cultura': 1 },
};

// --- specifica e tiro ---------------------------------------------------------------------

test('formula e intervallo dai dati: 1d4 dei PM, 2d3+1 dei Punti Eroe', () => {
  assert.deepEqual(
    (({ formula, minimo, massimo }) => ({ formula, minimo, massimo }))(specTiroPM(dati.classi.classi.find((c) => c.nome === 'Arcanista'))),
    { formula: '1d4', minimo: 1, massimo: 4 });
  const pe = specTiroPuntiEroe(dati);
  assert.equal(pe.formula, '2d3+1');
  assert.equal(pe.minimo, dati.regole.punti_eroe.minimo);
  assert.equal(pe.massimo, dati.regole.punti_eroe.massimo);
  assert.equal(specTiroPM(dati.classi.classi.find((c) => c.nome === 'Agente')), null); // PM fissi
});

test('tira: somma dei dadi più il fisso, origine "app"', () => {
  const sequenza = [2, 3];
  const r = tira(specTiro({ dadi: 2, facce: 3, fisso: 1 }), () => sequenza.shift());
  assert.deepEqual(r.tiro, { valore: 6, origine: 'app' });
  assert.deepEqual(r.risultati, [2, 3]);
});

// --- rifiuto dei valori fuori intervallo ----------------------------------------------------

test('inserimento manuale: accetta i valori nell’intervallo con origine "manuale"', () => {
  const pe = specTiro({ dadi: 2, facce: 3, fisso: 1 });
  for (const v of [3, 5, 7]) assert.deepEqual(tiroManuale(v, pe), { tiro: { valore: v, origine: 'manuale' } });
});

test('inserimento manuale: rifiuta i valori fuori intervallo spiegando il motivo', () => {
  const pe = specTiro({ dadi: 2, facce: 3, fisso: 1 });
  assert.equal(tiroManuale(2, pe).errore, '2 non è possibile con 2d3+1: il risultato va da 3 a 7.');
  assert.equal(tiroManuale(8, pe).errore, '8 non è possibile con 2d3+1: il risultato va da 3 a 7.');
  assert.match(tiroManuale(0, specTiro({ facce: 4 })).errore, /da 1 a 4/);
  assert.match(tiroManuale(2.5, pe).errore, /numero intero da 3 a 7/);
  assert.match(tiroManuale(NaN, pe).errore, /numero intero/);
  assert.equal(tiroManuale(8, pe).tiro, undefined);
});

test('validaScelte rifiuta un tiro dei PM fuori intervallo, anche se inserito a mano', () => {
  const e = validaScelte({ ...ARCANISTA, tiroDadoPM: { valore: 5, origine: 'manuale' } }, dati);
  assert.ok(e.some((x) => x.campo === 'tiroDadoPM' && x.tipo === 'violazione' && /5 non è possibile con 1d4/.test(x.problema)));
  const ok = calcolaScheda({ ...ARCANISTA, tiroDadoPM: { valore: 4, origine: 'manuale' } }, dati);
  assert.equal(ok.pm, 7 + 5 + 4);
});

test('normalizza scarta con avviso un tiro salvato fuori intervallo', () => {
  const r = normalizza({ ...ARCANISTA, tiroDadoPM: { valore: 3, origine: 'app' }, puntiEroe: { valore: 9, origine: 'manuale' } }, dati);
  assert.equal(r.scelte.puntiEroe, null);
  assert.deepEqual(r.scelte.tiroDadoPM, { valore: 3, origine: 'app' });
  assert.deepEqual(r.avvisi, ['Punti Eroe (2d3+1): 9 non è possibile con 2d3+1: il risultato va da 3 a 7. Da rideterminare.']);
});

// --- migrazione del formato vecchio ---------------------------------------------------------

test('migraTiro: numero semplice → { valore, origine: "app" }', () => {
  assert.deepEqual(migraTiro(3), { valore: 3, origine: 'app' });
  assert.deepEqual(migraTiro({ valore: 4, origine: 'manuale' }), { valore: 4, origine: 'manuale' });
  assert.deepEqual(migraTiro({ valore: 4 }), { valore: 4, origine: 'app' });
  assert.equal(migraTiro(null), null);
  assert.equal(migraTiro(undefined), null);
  assert.throws(() => migraTiro('tre'), /non interpretabile/);
  assert.equal(valoreTiro(3), 3);
  assert.equal(valoreTiro({ valore: 3, origine: 'manuale' }), 3);
  assert.equal(valoreTiro(null), null);
});

test('personaggio salvato col formato vecchio: i tiri numerici migrano senza avvisi', () => {
  const vecchio = { ...ARCANISTA, tiroDadoPM: 3, puntiEroe: 6 };
  const r = normalizza(vecchio, dati);
  assert.deepEqual(r.avvisi, []);
  assert.deepEqual(r.scelte.tiroDadoPM, { valore: 3, origine: 'app' });
  assert.deepEqual(r.scelte.puntiEroe, { valore: 6, origine: 'app' });
  assert.equal(calcolaScheda(r.scelte, dati).pm, 15);
});

test('personaggio vecchio con tiro non valido: scartato con avviso', () => {
  const r = normalizza({ ...ARCANISTA, tiroDadoPM: 9, puntiEroe: 'tanti' }, dati);
  assert.equal(r.scelte.tiroDadoPM, null);
  assert.equal(r.scelte.puntiEroe, null);
  assert.equal(r.avvisi.length, 2);
});

test('file esportato in formato 1 (tiri numerici): si importa e si migra', () => {
  const file = JSON.stringify({ formato: 'mutant-personaggio', versione: 1, scelte: { ...ARCANISTA, tiroDadoPM: 2, puntiEroe: 4 } });
  const r = normalizza(deserializza(file), dati);
  assert.deepEqual(r.scelte.tiroDadoPM, { valore: 2, origine: 'app' });
  assert.deepEqual(r.scelte.puntiEroe, { valore: 4, origine: 'app' });
  // riesportato, il file è nel formato attuale e conserva l'origine
  const nuovo = JSON.parse(serializza({ ...r.scelte, puntiEroe: { valore: 4, origine: 'manuale' } }));
  assert.equal(nuovo.versione, 2);
  assert.deepEqual(nuovo.scelte.puntiEroe, { valore: 4, origine: 'manuale' });
});
