// Una cartella di personaggi **come quella di Davide**: più versioni per personaggio (lotto 200, 15/11/2026).
//
// **Perché esiste.** La nostra copia locale ha un file per personaggio, e tutte le prove degli strumenti girano su
// quella. La cartella vera no: l'istantanea del 14/11/2026 porta **37 file per sette personaggi** — cinque versioni
// datate ciascuno, perché l'app salva un file nuovo a ogni serata e non sovrascrive mai. È per questo che
// `tools/adegua-abilita.mjs` ha potuto camminare sui file invece che sui personaggi per due giorni senza che
// nessuna prova dicesse niente: da noi file e personaggi erano la stessa cosa.
//
// Chi prova uno strumento che legge `personaggi/` usa questa cartella, non una con un file ciascuno.
//
// I contenuti vengono dai personaggi del repo (`esempi/` e `tests/collaudo/`): **nessun dato di Davide entra nei
// test**, i suoi file si leggono soltanto e stanno fuori da git. Quello che imita la sua cartella è la **forma**:
// nomi, date, livelli crescenti, `aggiornato_il` e tempi di modifica in ordine.
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/** I sette del tavolo: nome e Classe come nell'istantanea del 14/11, per leggere i rapporti come li legge Davide. */
export const SETTE = [
  { nome: 'BOTHA PRETORIUS', chiave: 'BOTHA-PRETORIUS', pg: 'pg-collaudo-botha' },
  { nome: 'DUNCAN MCDUFF', chiave: 'DUNCAN-MCDUFF', pg: 'pg-collaudo-duncan' },
  { nome: 'Dimitri Orlav', chiave: 'Dimitri-Orlav', pg: 'pg-collaudo-dimitri' },
  { nome: 'LUCAS', chiave: 'LUCAS', pg: 'pg-collaudo-lucas' },
  { nome: 'MICHELE GIORGETTI', chiave: 'MICHELE-GIORGETTI', pg: 'pg-collaudo-michele' },
  { nome: 'OSHI NAGATA', chiave: 'OSHI-NAGATA', pg: 'pg-collaudo-oshi' },
  { nome: 'PABLO ZAION', chiave: 'PABLO-ZAION', pg: 'pg-collaudo-pablo' },
];

/** Le cinque date di una serata dopo l'altra, come nella cartella vera: l'ultima è quella attuale. */
export const SERATE = ['2026-10-26', '2026-11-02', '2026-11-05', '2026-11-09', '2026-11-11'];

/** I personaggi del repo che si possono usare come contenuto (hanno `scelte` e si ricalcolano). */
export function sorgenti(radice = new URL('../', import.meta.url), escludi = []) {
  const out = [];
  const fuori = (d) => escludi.some((x) => d.includes(x));
  for (const dove of ['esempi', 'tests/collaudo']) {
    const dir = new URL(`${dove}/`, radice);
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
      try {
        const o = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
        if (o?.scelte && !fuori(`${dove}/${f}`)) out.push({ dove: `${dove}/${f}`, json: o });
      } catch { /* non è un personaggio */ }
    }
  }
  return out;
}

/**
 * Scrive la cartella e la torna.
 * @param opz.quanti quanti personaggi (default sette, come il tavolo)
 * @param opz.versioni quante versioni per personaggio (default cinque, come la cartella vera)
 * @param opz.escludi pezzi di percorso dei personaggi del repo da non usare come contenuto (per esempio il
 *   Predicatore, che la A.267 blocca: `--applica` non scrive per nessuno se anche uno solo è bloccato, quindi una
 *   prova sull'annullamento lo lascia fuori — e lo dice, invece di avere una cartella che non si sa com'è fatta)
 * @returns {{ cartella, salvataggi, voci: [{ nome, chiave, pg, attuale, file: [...] }], quantiFile }}
 */
export function cartellaComeDavide({ quanti = 7, versioni = 5, escludi = [], radice = new URL('../', import.meta.url) } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'mutant-come-davide-'));
  const cartella = join(base, 'personaggi');
  const salvataggi = join(base, 'salvataggi');
  mkdirSync(cartella, { recursive: true });
  const fonti = sorgenti(radice, escludi);
  if (!fonti.length) throw new Error('nessun personaggio nel repo da usare come contenuto');
  const voci = [];
  let quantiFile = 0;
  SETTE.slice(0, quanti).forEach((chi, i) => {
    const fonte = fonti[i % fonti.length].json;
    const livelloFinale = 1 + (Array.isArray(fonte.livelli) ? fonte.livelli.length : 0);
    const file = [];
    SERATE.slice(-versioni).forEach((data, k) => {
      // le versioni vecchie hanno meno livelli: è quello che succede davvero salendo una serata per volta
      const indietro = Math.min(versioni - 1 - k, Math.max(0, livelloFinale - 1));
      const livelli = (fonte.livelli ?? []).slice(0, (fonte.livelli ?? []).length - indietro);
      const livello = 1 + livelli.length;
      const nome = `${chi.chiave}_liv${livello}_${data}.json`;
      const json = {
        ...fonte,
        pg: chi.pg,
        scelte: { ...fonte.scelte, nome: chi.nome },
        livelli,
        aggiornato_il: `${data}T19:52:0${k}.000Z`,
        aggiornato_da: 'collaudo',
      };
      const percorso = join(cartella, nome);
      writeFileSync(percorso, `${JSON.stringify(json, null, 2)}\n`);
      // i tempi di modifica in ordine, come li lascia una serata dopo l'altra
      const t = new Date(`${data}T19:52:0${k}.000Z`).getTime() / 1000;
      utimesSync(percorso, t, t);
      file.push({ nome, percorso, data, livello });
      quantiFile += 1;
    });
    voci.push({ ...chi, file, attuale: file[file.length - 1] });
  });
  return { base, cartella, salvataggi, voci, quantiFile };
}

/** Le impronte di ogni file della cartella: per il confronto byte per byte. */
export function improntaCartella(cartella) {
  const out = {};
  for (const f of readdirSync(cartella).sort()) out[f] = readFileSync(join(cartella, f));
  return out;
}

/** Che cosa è cambiato fra due impronte: [{ file, cosa }]. */
export function differenze(prima, dopo) {
  const out = [];
  for (const f of Object.keys(prima)) {
    if (!(f in dopo)) out.push({ file: f, cosa: 'sparito' });
    else if (!prima[f].equals(dopo[f])) out.push({ file: f, cosa: 'cambiato' });
  }
  for (const f of Object.keys(dopo)) if (!(f in prima)) out.push({ file: f, cosa: 'nuovo' });
  return out;
}
