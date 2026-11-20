// Lotto 229 — i valori ricalcolati dei personaggi di una cartella, con i dati di QUESTA copia del repo (sola lettura).
//   node tools/pg-valori.mjs --cartella=<cartella con i personaggi>      → JSON su stdout: { nome: { scheda, tavolo } }
// Lo usa `tools/pg-prima-dopo.mjs` per confrontare due basi di dati (un commit di prima e quello di adesso) sugli stessi personaggi.
import './guardia-subito.mjs';
import { readFileSync } from 'node:fs';
import { caricaDati } from '../src/rules.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { valoriDi } from './dotazione-asa.mjs';
import { personaggiDellaCartella } from './personaggi-cartella.mjs';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';
fermaSeSconosciuti(process.argv.slice(2), ARGOMENTI['pg-valori.mjs'], 'pg-valori.mjs');

const arg = process.argv.slice(2).find((a) => a.startsWith('--cartella='))?.slice(11);
if (!arg) { console.error('serve --cartella=<cartella con i personaggi>'); process.exit(2); }
const radice = new URL('../', import.meta.url);
const { dati } = await caricaDati(async (n) => readFileSync(new URL(`data/${n}.json`, radice), 'utf8'));
const out = {};
for (const p of personaggiDellaCartella(arg)) {
  const pg = deserializzaPersonaggio(readFileSync(p.percorso, 'utf8'));
  const personaggio = { creazione: normalizza(pg.creazione, dati).scelte, livelli: pg.livelli ?? [], sessione: pg.sessione };
  out[`${p.nome} (${p.file})`] = valoriDi(personaggio, dati);
}
process.stdout.write(JSON.stringify(out));
