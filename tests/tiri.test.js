import { test } from 'node:test';
import assert from 'node:assert/strict';
import { specTiro, tira, tiroManuale, migraTiro, valoreTiro } from '../src/tiri.js';
import { nuoveScelte, normalizza, deserializza, serializza, specTiroPuntiEroe, VERSIONE_FORMATO } from '../src/character.js';
import { calcolaScheda, validaLivello } from '../src/calc.js';
import { datiReali } from './helpers.js';
import { ARCANISTA as ARCANISTA_COMPLETA } from './personaggi.js';

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
    (({ formula, minimo, massimo }) => ({ formula, minimo, massimo }))(specTiro({ facce: dati.classi.classi.find((c) => c.nome === 'Arcanista').pm_per_grado.dado })),
    { formula: '1d4', minimo: 1, massimo: 4 });
  const pe = specTiroPuntiEroe(dati);
  assert.equal(pe.formula, '2d3+1');
  assert.equal(pe.minimo, dati.regole.punti_eroe.minimo);
  assert.equal(pe.massimo, dati.regole.punti_eroe.massimo);
  assert.equal(dati.classi.classi.find((c) => c.nome === 'Agente').pm_per_grado.dado, 0); // PM fissi
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

test('un tiro dei PM fuori intervallo inserito a mano è rifiutato (Grado successivo al primo)', () => {
  // Alla creazione il dado dei PM è massimizzato (decisione 6): i tiri restano nei Gradi successivi.
  const p = {
    versione: 2, creazione: ARCANISTA_COMPLETA, // con i 13 incantesimi della creazione
    livelli: [
      { livello: 2, caratteristiche: { COS: 1, DES: 1 } },
      { livello: 3, talentoLibero: { id: 'sempre-allerta' } },
    ],
  };
  const voce = { grado: { classe: 'Arcanista' }, tiroPV: { valore: 3, origine: 'app' }, tiroPM: { valore: 5, origine: 'manuale' },
    talentoClasse: 'Geometria Arcana', puntiAbilita: { 'Percezione': 2, 'Rituali': 2, 'Artefatti': 1 },
    incantesimi: ['Protezione dagli Elementi', 'Irrobustire', 'Distrazione', 'Empatia', 'Cura Spirituale', 'Arma Mistica'] };
  const e = validaLivello(p, voce, dati);
  assert.ok(e.some((x) => x.campo === 'tiroPM' && x.tipo === 'violazione' && /5 non è possibile con 1d4/.test(x.problema)), JSON.stringify(e));
  assert.deepEqual(validaLivello(p, { ...voce, tiroPM: { valore: 4, origine: 'manuale' } }, dati), []);
});

test('normalizza scarta con avviso un tiro salvato fuori intervallo', () => {
  const r = normalizza({ ...ARCANISTA, puntiEroe: { valore: 9, origine: 'manuale' } }, dati);
  assert.equal(r.scelte.puntiEroe, null);
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
  assert.deepEqual(r.scelte.puntiEroe, { valore: 6, origine: 'app' });
  // il tiro dei PM della creazione viene ignorato: dado massimizzato (decisione 6)
  assert.equal('tiroDadoPM' in r.scelte, false);
  assert.equal(calcolaScheda(r.scelte, dati).pm, 7 + 5 + 4);
});

test('personaggio vecchio con tiro non valido: scartato con avviso', () => {
  const r = normalizza({ ...ARCANISTA, tiroDadoPM: 9, puntiEroe: 'tanti' }, dati);
  assert.equal(r.scelte.puntiEroe, null);
  assert.equal(r.avvisi.length, 1); // il vecchio tiro dei PM sparisce senza avviso
});

test('file esportato in formato 1 (tiri numerici): si importa e si migra', () => {
  const file = JSON.stringify({ formato: 'mutant-personaggio', versione: 1, scelte: { ...ARCANISTA, tiroDadoPM: 2, puntiEroe: 4 } });
  const r = normalizza(deserializza(file), dati);
  assert.equal('tiroDadoPM' in r.scelte, false);
  assert.deepEqual(r.scelte.puntiEroe, { valore: 4, origine: 'app' });
  // riesportato, il file è nel formato attuale e conserva l'origine
  const nuovo = JSON.parse(serializza({ ...r.scelte, puntiEroe: { valore: 4, origine: 'manuale' } }));
  assert.equal(nuovo.versione, VERSIONE_FORMATO);
  assert.deepEqual(nuovo.scelte.puntiEroe, { valore: 4, origine: 'manuale' });
});
