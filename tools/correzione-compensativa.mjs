// Lotto 252, parte A — **le correzioni alle Abilità rimaste in piedi dopo l'adeguamento.**
// Lotto 256, parte C — **e la premessa su cui corregge, verificata prima di scrivere.**
//
// Il collaudo di Davide del 25/11/2026: Dimitri mostra Armi da mischia VA 6 invece di 8, perché il −2 registrato il
// 23/11 per compensare i due +1 del 2/11 è sopravvissuto all'adeguamento del 24/11. Il lotto 252 ha costruito lo
// strumento su quello stato. L'istantanea del 27/11 ne mostra un altro: nei file che Davide ci manda i tre sono tutti
// attivi, il file non è adeguato e la somma fa 0 (Armi da mischia 11, non 6 e non 8). Uno strumento che corregge deve
// controllare la premessa su cui corregge: altrimenti, con i +1 ancora vivi, annullare il −2 darebbe +2 dove serve 0.
//
// Prima di scrivere si ferma e dice che cosa ha trovato se: il file non è adeguato; le correzioni attive dell'Abilità
// già si compensano (somma 0); annullarle lascerebbe attive correzioni di segno opposto; il VA dopo non è VA prima − somma
// annullata; il metro di Davide (`regole.json` → `adeguamento_abilita.metro`: Armi da mischia 8 e 21 punti liberi) non torna.
// Dopo aver scritto rilegge il file e rifà il conto: se è diverso rimette i byte di prima e lo dice.
//
// Uso:
//   node tools/correzione-compensativa.mjs <cartella dei personaggi> [--solo=NOME] [--scrivi]
// Senza `--scrivi` legge e dice che cosa farebbe. Con `--scrivi` riscrive il **file attuale** di ciascuno passando da
// `tools/scrivi-personaggio.mjs` (versione di salvataggio + 1, `aggiornato_il`, `aggiornato_da`).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fermaSeSconosciuti } from './argomenti.mjs';
import { personaggiDellaCartella } from './personaggi-cartella.mjs';
import { scriviPersonaggio } from './scrivi-personaggio.mjs';
import { caricaDati } from '../src/rules.js';
import { correzioniRimaste, annullaCorrezioniRimaste, verificaCompensazione, vaAbilita, adeguamentoAperto } from '../src/adeguamento-abilita.js';

/** Il metro dichiarato nei dati per questo personaggio (nome o inizio del nome), o null. */
export function metroDi(nome, dati) {
  const m = dati?.regole?.adeguamento_abilita?.metro;
  if (!Array.isArray(m)) return null;
  const n = String(nome ?? '').toUpperCase();
  return m.find((x) => n.includes(String(x.personaggio).toUpperCase())) ?? null;
}

/**
 * Il piano, senza scrivere niente. `ok` solo se la premessa regge.
 * @returns {{ ok, motivi: string[], verifica: object, esito: object|null }}
 */
export function pianoCompensazione(o, dati, { nome = '' } = {}) {
  const metro = metroDi(nome, dati);
  const verifica = verificaCompensazione(o, dati, { metro });
  if (!verifica.ok) return { ok: false, motivi: verifica.motivi, verifica, esito: null };
  const esito = annullaCorrezioniRimaste(o, dati, { quando: new Date(), chi: 'strumento del lotto 256' });
  return { ok: true, motivi: [], verifica, esito };
}

/**
 * Scrive solo se il piano regge, poi rilegge dal disco e ripete il conto. Se non torna, rimette i byte di prima.
 * `scrivi` è iniettabile per provare il rollback.
 * @returns {{ scritto: boolean, annullato: boolean, motivi: string[], verifica: object }}
 */
export function applicaCompensazione(percorso, dati, { nome = '', scrivi = (p, n, o) => scriviPersonaggio(p, n, o), quando = new Date() } = {}) {
  const originale = readFileSync(percorso, 'utf8');
  const o = JSON.parse(originale);
  const piano = pianoCompensazione(o, dati, { nome });
  if (!piano.ok) return { scritto: false, annullato: false, motivi: piano.motivi, verifica: piano.verifica };
  scrivi(percorso, piano.esito.nuovo, { chi: 'master', quando });
  const riletto = JSON.parse(readFileSync(percorso, 'utf8'));
  const motivi = [];
  const metro = metroDi(nome, dati);
  if (correzioniRimaste(riletto, dati).length) motivi.push('dopo la scrittura restano correzioni da annullare');
  for (const r of piano.verifica.abilita) {
    const v = vaAbilita(riletto, r.nome, dati).valore;
    if (v !== r.atteso) motivi.push(`${r.nome}: riletto dal file vale ${v}, atteso ${r.atteso}`);
  }
  if (metro) {
    const v = vaAbilita(riletto, metro.abilita, dati).valore;
    if (v !== metro.va) motivi.push(`metro: ${metro.abilita} riletto vale ${v}, atteso ${metro.va}`);
    if (Number.isInteger(metro.punti_disponibili)) {
      const ap = adeguamentoAperto(riletto, dati);
      if (!ap || ap.rimasti !== metro.punti_disponibili) motivi.push(`metro: contatore riletto ${ap ? ap.rimasti : 'non leggibile'}, atteso ${metro.punti_disponibili}`);
    }
  }
  if (motivi.length) {
    writeFileSync(percorso, originale); // i byte di prima, identici
    return { scritto: false, annullato: true, motivi, verifica: piano.verifica };
  }
  return { scritto: true, annullato: false, motivi: [], verifica: piano.verifica };
}

async function principale() {
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
  const tutti = personaggiDellaCartella(cartella).filter((p) => !SOLO || p.nome.toUpperCase().includes(SOLO.toUpperCase()));
  console.log(`\nCORREZIONI RIMASTE DOPO L'ADEGUAMENTO — ${tutti.length} personaggi in ${cartella}\n`);
  let fatti = 0; let fermati = 0;
  for (const p of tutti) {
    const piano = pianoCompensazione(p.json, dati, { nome: p.nome });
    if (!piano.ok) {
      const solo = piano.motivi.length === 1 && piano.motivi[0] === 'nessuna correzione da annullare';
      if (solo) { console.log(`${p.nome.padEnd(18)} niente da annullare   (${p.file})`); continue; }
      fermati += 1;
      console.log(`${p.nome.padEnd(18)} NON CORREGGO   (${p.file})`);
      for (const m of piano.motivi) console.log(`  · ${m}`);
      continue;
    }
    console.log(`${p.nome.padEnd(18)} da annullare   (${p.file})`);
    for (const r of piano.verifica.abilita) console.log(`  · ${r.nome}: VA ${r.vaPrima} → ${r.vaDopo} (somma annullata ${r.sommaDaAnnullare})`);
    if (!SCRIVI) { console.log('  (lettura: con --scrivi si annullano, con la riga nello storico)'); continue; }
    const e = applicaCompensazione(p.percorso, dati, { nome: p.nome });
    if (e.annullato) { fermati += 1; console.log('  ANNULLATO: il file è stato rimesso com\'era'); for (const m of e.motivi) console.log(`  · ${m}`); }
    else { fatti += 1; console.log('  scritto e riletto: il conto torna'); }
  }
  console.log(`\n${fatti} corretti · ${fermati} fermati dalla guardia${SCRIVI ? '' : ' · nessuna scrittura (manca --scrivi)'}`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) await principale();
