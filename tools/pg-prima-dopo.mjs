// Lotto 229 — gli stessi personaggi, due basi di dati: i valori che cambiano (sola lettura).
//   node tools/pg-prima-dopo.mjs --cartella=<personaggi> --base=<cartella di un'altra copia del repo, p. es. un worktree di un commit di prima>
// Per ogni personaggio (il file attuale, `personaggiDellaCartella`) confronta scheda ricalcolata e valori di tavolo della base e di questa copia.
// Le righe che DEVONO cambiare quando cambia un manuale — le etichette di edizione — si elencano a parte; ogni altra differenza è un valore.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { differenze } from './dotazione-asa.mjs';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';
fermaSeSconosciuti(process.argv.slice(2), ARGOMENTI['pg-prima-dopo.mjs'], 'pg-prima-dopo.mjs');

const arg = (n) => process.argv.slice(2).find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const cartella = arg('cartella'); const base = arg('base');
if (!cartella || !base) { console.error('servono --cartella= e --base='); process.exit(2); }
const qui = join(fileURLToPath(import.meta.url), '..', '..');
const esegui = (radice) => JSON.parse(execFileSync(process.execPath, [join(radice, 'tools', 'pg-valori.mjs'), `--cartella=${cartella}`], { cwd: radice, maxBuffer: 1 << 28 }).toString());
// le sole cose che DEVONO cambiare sono le sigle delle edizioni dentro i testi: si riportano alla corrente e si confronta il resto
const RIPORTA = [[/Armamenti 0.87/g, 'Armamenti 0.89'], [/Giocatore 0.64/g, 'Giocatore 0.65']];
const prima = JSON.parse(RIPORTA.reduce((s, [re, a]) => s.replace(re, a), JSON.stringify(esegui(base)))); const dopo = esegui(qui);
const ETICHETTA = /^$^/;
let valori = 0; let etichette = 0;
for (const nome of Object.keys(prima)) {
  if (!(nome in dopo)) { console.log(`${nome}: manca dopo`); valori++; continue; }
  const d = differenze(prima[nome], dopo[nome], '');
  const v = d.filter((x) => !ETICHETTA.test(x)); etichette += d.length - v.length; valori += v.length;
  console.log(`${nome}: ${v.length ? `${v.length} VALORI DIVERSI → ${v.slice(0, 8).join(', ')}` : 'identico'}${d.length - v.length ? ` (+${d.length - v.length} etichette)` : ''}`);
}
console.log(`\n${Object.keys(prima).length} personaggi · valori diversi ${valori} · etichette diverse ${etichette}`);
process.exit(valori ? 1 : 0);
