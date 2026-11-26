// Lotto 252, parte A — **le correzioni alle Abilità rimaste in piedi dopo l'adeguamento.**
//
// Il collaudo di Davide del 25/11/2026: Dimitri mostra Armi da mischia VA 6 invece di 8, perché il −2 registrato il
// 23/11 per compensare i due +1 del 2/11 è sopravvissuto all'adeguamento del 24/11 — l'adeguamento annullava le
// correzioni **del giorno dichiarato** (il 2/11), e quella era del giorno dopo. Il criterio è stato corretto
// (`src/adeguamento-abilita.js` → `correzioniAbilitaDaAnnullare`), ma un personaggio **già adeguato** non ripassa da
// lì: questo strumento trova le correzioni rimaste e le annulla lasciandole nello storico.
//
// Fa esattamente quello che Davide ha chiesto e niente di più: **nessun bonus nuovo**, nessuna Caratteristica toccata
// (A.293), nessun punto spostato, e solo i personaggi che hanno davvero una correzione rimasta.
//
// Uso:
//   node tools/correzione-compensativa.mjs <cartella dei personaggi> [--solo=NOME] [--scrivi]
// Senza `--scrivi` legge e dice che cosa farebbe. Con `--scrivi` riscrive il **file attuale** di ciascuno passando da
// `tools/scrivi-personaggio.mjs` (versione di salvataggio + 1, `aggiornato_il`, `aggiornato_da`) e **rilegge il file**
// per controllare invece di dichiarare.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fermaSeSconosciuti } from './argomenti.mjs';
import { personaggiDellaCartella } from './personaggi-cartella.mjs';
import { scriviPersonaggio } from './scrivi-personaggio.mjs';
import { caricaDati } from '../src/rules.js';
import { correzioniRimaste, annullaCorrezioniRimaste, vaAbilita } from '../src/adeguamento-abilita.js';


fermaSeSconosciuti('correzione-compensativa.mjs', process.argv.slice(2));
const arg = (n) => process.argv.slice(2).find((x) => x.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? null;
const SCRIVI = process.argv.includes('--scrivi');
const SOLO = arg('solo');
const cartella = process.argv.slice(2).find((x) => !x.startsWith('--'));

if (!cartella) {
  console.error('Uso: node tools/correzione-compensativa.mjs <cartella dei personaggi> [--solo=NOME] [--scrivi]');
  process.exit(2);
}

const RADICE = dirname(dirname(fileURLToPath(import.meta.url)));
const dati = (await caricaDati(async (n) => readFileSync(join(RADICE, 'data', n + '.json'), 'utf8'))).dati;
const va = (o, nome) => { const r = vaAbilita(o, nome, dati); return r.valore === null ? `? (${r.motivo})` : String(r.valore); };

const tutti = personaggiDellaCartella(cartella).filter((p) => !SOLO || p.nome.toUpperCase().includes(SOLO.toUpperCase()));
console.log(`\nCORREZIONI RIMASTE DOPO L'ADEGUAMENTO — ${tutti.length} personaggi in ${cartella}\n`);
let quanti = 0;
for (const p of tutti) {
  const o = p.json;
  const adeguato = o?.scelte?.regimeAbilita === 2;
  const rimaste = correzioniRimaste(o, dati);
  if (!rimaste.length) {
    console.log(`${p.nome.padEnd(18)} ${adeguato ? 'adeguato' : 'non adeguato'} · niente da annullare   (${p.file})`);
    continue;
  }
  quanti += 1;
  console.log(`${p.nome.padEnd(18)} adeguato · ${rimaste.length} da annullare   (${p.file})`);
  for (const x of rimaste) {
    const nome = x.chiave.replace('abilita:', '');
    const prima = va(o, nome);
    console.log(`  · ${nome}: ${x.numero > 0 ? '+' : ''}${x.numero} del ${String(x.quando).slice(0, 10)} «${x.motivo || 'senza motivo'}» · VA adesso ${prima ?? '?'}`);
  }
  const esito = annullaCorrezioniRimaste(o, dati, { quando: new Date(), chi: 'strumento del lotto 252' });
  for (const x of rimaste) {
    const nome = x.chiave.replace('abilita:', '');
    console.log(`  → ${nome}: VA ${va(o, nome) ?? '?'} diventa ${va(esito.nuovo, nome) ?? '?'}`);
  }
  if (!SCRIVI) {
    console.log('  (lettura: con --scrivi si annullano, con la riga nello storico)');
    continue;
  }
  scriviPersonaggio(p.percorso, esito.nuovo, { chi: 'master', quando: new Date() });
  const riletto = JSON.parse(readFileSync(p.percorso, 'utf8'));
  const restano = correzioniRimaste(riletto, dati);
  console.log(`  scritto ${p.file} · riletto: ${restano.length ? `ATTENZIONE, ne restano ${restano.length}` : 'nessuna correzione rimasta'}`);
  for (const x of rimaste) {
    const nome = x.chiave.replace('abilita:', '');
    console.log(`  controllato dal file: ${nome} VA ${va(riletto, nome) ?? '?'}`);
  }
}
console.log(`\n${quanti ? `${quanti} personaggi con correzioni rimaste` : 'nessun personaggio con correzioni rimaste'}${SCRIVI ? '' : ' · nessuna scrittura (manca --scrivi)'}`);
