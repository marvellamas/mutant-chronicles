// «Le code dell'originale» (21/10/2026), parte C: giocatori[].pgFile (un nome di file, che invecchia) diventa
// pgStabile (l'identificativo stabile del personaggio). Stesso difetto già tolto altrove: un livello o un nuovo
// nome cambia il file, e un abbinamento per nome di file si stacca in silenzio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migraGiocatoriAPgStabile, fileDelGiocatore } from '../src/px-partita.js';
import { fileDiPgStabile } from '../src/cartella.js';

// elenco come lo dà GET /api/personaggi: file più vecchio e più nuovo dello stesso personaggio (pg uguale)
const ELENCO = [
  { file: 'Aiko_liv3_2026-10-10.json', nome: 'Aiko', livello: 3, mtime: 100, pg: 'pg-aiko' },
  { file: 'Aiko_liv4_2026-10-20.json', nome: 'Aiko', livello: 4, mtime: 500, pg: 'pg-aiko' },
  { file: 'Botha_liv2_2026-10-05.json', nome: 'Botha', livello: 2, mtime: 200, pg: null }, // file di prima, senza pg
];

test('fileDiPgStabile: il file più recente con quell’identificativo', () => {
  const f = fileDiPgStabile(ELENCO, 'pg-aiko');
  assert.equal(f.file, 'Aiko_liv4_2026-10-20.json');
});

test('fileDiPgStabile: un personaggio di prima (senza pg) si risolve dal «Nome» del file', () => {
  const f = fileDiPgStabile(ELENCO, 'nome-Botha');
  assert.equal(f.file, 'Botha_liv2_2026-10-05.json');
});

test('fileDiPgStabile: null se il personaggio non c’è più nell’elenco (spostato in storico/)', () => {
  assert.equal(fileDiPgStabile(ELENCO, 'pg-sparito'), null);
  assert.equal(fileDiPgStabile(ELENCO, null), null);
  assert.equal(fileDiPgStabile([], 'pg-aiko'), null);
});

test('migraGiocatoriAPgStabile: una riga con pgFile risolvibile prende pgStabile, e resta risolvibile dopo un livello', () => {
  const db = { giocatori: [{ id: 'g1', giocatore: 'Marcello', pg: 'Aiko', pgFile: 'Aiko_liv3_2026-10-10.json' }] };
  const { db: migrato, cambiato, nonMigrate } = migraGiocatoriAPgStabile(db, ELENCO);
  assert.equal(cambiato, true);
  assert.equal(nonMigrate.length, 0);
  const g = migrato.giocatori[0];
  assert.equal(g.pgStabile, 'pg-aiko');
  assert.equal(g.pgFile, 'Aiko_liv3_2026-10-10.json'); // il campo vecchio resta, per chi lo legge ancora
  // ed è risolvibile anche dopo il livello (il file è cambiato, l'identificativo no)
  assert.equal(fileDelGiocatore(ELENCO, g).file, 'Aiko_liv4_2026-10-20.json');
});

test('migraGiocatoriAPgStabile: una riga già migrata non si tocca', () => {
  const db = { giocatori: [{ id: 'g1', pgStabile: 'pg-aiko', pgFile: 'Aiko_liv3_2026-10-10.json' }] };
  const { db: migrato, cambiato } = migraGiocatoriAPgStabile(db, ELENCO);
  assert.equal(cambiato, false);
  assert.strictEqual(migrato, db); // stesso oggetto: nessuna copia inutile
});

test('migraGiocatoriAPgStabile: una riga senza PG associato non si tocca', () => {
  const db = { giocatori: [{ id: 'g1', giocatore: 'Senza PG', pg: '', pgFile: null }] };
  const { db: migrato, cambiato, nonMigrate } = migraGiocatoriAPgStabile(db, ELENCO);
  assert.equal(cambiato, false);
  assert.equal(nonMigrate.length, 0);
  assert.strictEqual(migrato, db);
});

test('migraGiocatoriAPgStabile: il file non c’è più nell’elenco → non si indovina, si segnala', () => {
  const db = { giocatori: [
    { id: 'g1', giocatore: 'Marcello', pg: 'Aiko', pgFile: 'Aiko_liv3_2026-10-10.json' },
    { id: 'g2', giocatore: 'Davide', pg: 'Personaggio sparito', pgFile: 'Sparito_liv1_2026-09-01.json' },
  ] };
  const { db: migrato, cambiato, nonMigrate } = migraGiocatoriAPgStabile(db, ELENCO);
  assert.equal(cambiato, true); // g1 si migra comunque
  assert.deepEqual(nonMigrate, [{ id: 'g2', giocatore: 'Davide', pgFile: 'Sparito_liv1_2026-09-01.json' }]);
  assert.equal(migrato.giocatori[0].pgStabile, 'pg-aiko');
  assert.equal(migrato.giocatori[1].pgStabile, undefined); // non toccata
  assert.equal(migrato.giocatori[1].pgFile, 'Sparito_liv1_2026-09-01.json'); // resta com'era
});

test('fileDelGiocatore: preferisce pgStabile; usa pgFile solo se non ancora migrata', () => {
  assert.equal(fileDelGiocatore(ELENCO, { pgStabile: 'pg-aiko', pgFile: 'nome-vecchio-ormai-sbagliato.json' }).file, 'Aiko_liv4_2026-10-20.json');
  assert.equal(fileDelGiocatore(ELENCO, { pgFile: 'Botha_liv2_2026-10-05.json' }).file, 'Botha_liv2_2026-10-05.json');
  assert.equal(fileDelGiocatore(ELENCO, { pgStabile: 'pg-sparito', pgFile: 'Sparito_liv1_2026-09-01.json' }), null);
  assert.equal(fileDelGiocatore(ELENCO, {}), null);
});
