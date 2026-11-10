// L'edizione che ogni file di `data/` dichiara, confrontata con l'edizione corrente del suo manuale
// (lotto 189, 10/11/2026).
//
// Perché. Il principio 4 di CLAUDE.md dice che ogni file dati riporta `versione_manuale`. Il lotto 188 ha scoperto
// che quelle etichette erano rimaste indietro di quattro, sei, ventiquattro versioni, e che i controlli «i dati
// citano il manuale» restavano verdi soltanto perché in `docs/manuali-txt/` viveva ancora la copia di allora.
// Un'etichetta vecchia non vuol dire contenuto vecchio, ma nessuno poteva più distinguere i due casi. Qui
// l'etichetta torna a essere una dichiarazione controllabile: il file dice da quale edizione vengono i suoi dati,
// e il controllo dice se quella è l'edizione corrente.
//
// Le eccezioni non si nascondono: un file che resta indietro perché il manuale nuovo cambia una regola ancora da
// decidere sta in `tools/manuali.json` → `edizioni_in_attesa`, con il motivo e il numero della domanda.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RADICE, registro, voce } from './manuali.mjs';

/** Come si scrive un manuale dentro `versione_manuale` → il suo id nel registro. */
export const NOMI = {
  Giocatore: 'giocatore',
  Magia: 'magia',
  Armamenti: 'armamenti',
  Equipaggiamento: 'equipaggiamento',
  Equipaggiamenti: 'equipaggiamento',
  Veicoli: 'veicoli',
  Mostri: 'mostri',
  Direttore: 'direttore',
};

/** I file di dati, in ordine: `data/*.json` e poi `data/equipaggiamento/*.json`. */
export function fileDati(radice = RADICE) {
  const out = [];
  for (const f of readdirSync(join(radice, 'data')).sort()) if (f.endsWith('.json')) out.push('data/' + f);
  for (const f of readdirSync(join(radice, 'data', 'equipaggiamento')).sort()) if (f.endsWith('.json')) out.push('data/equipaggiamento/' + f);
  return out;
}

/**
 * I manuali citati da una stringa `versione_manuale`, con tutte le versioni che ne cita.
 * «Veicoli 0.2 (…), scheda ASA Scout MK4 0.2; … Veicoli 0.10» → { veicoli: ['0.2', '0.10'] }
 * Quello che non è un manuale del registro (Talenti v1.0, Galleria 1, E&L, bozze) si ignora: non ha un'edizione
 * corrente con cui confrontarsi.
 */
export function manualiCitati(testo) {
  const out = {};
  // «Direttore §9.3» è un paragrafo, non un'edizione: dopo il nome si ammettono spazi e «v», non il §.
  const re = new RegExp(`\\b(${Object.keys(NOMI).join('|')})\\b[ ,;]{0,2}v?(\\d+(?:\\.\\d+)*)`, 'g');
  for (const m of String(testo ?? '').matchAll(re)) {
    const id = NOMI[m[1]];
    (out[id] ??= []).push(m[2]);
  }
  return out;
}

/** Le eccezioni dichiarate: { "data/x.json": { manuale, motivo, domanda? } }. */
export const eccezioni = () => registro().edizioni_in_attesa ?? {};

/**
 * Il quadro: una riga per file di dati, con i manuali citati, l'edizione corrente e l'esito.
 * @returns [{ file, dichiarata, manuali: [{ id, citate, corrente, allineata, eccezione? }], fuori }]
 */
export function quadroEdizioni(radice = RADICE) {
  const ecc = eccezioni();
  return fileDati(radice).map((f) => {
    const j = JSON.parse(readFileSync(join(radice, f), 'utf8'));
    const citati = manualiCitati(j.versione_manuale);
    const manuali = Object.entries(citati).map(([id, citate]) => {
      const corrente = voce(id).versione;
      const eccezione = ecc[f]?.[id] ?? null;
      return { id, citate, corrente, allineata: citate.includes(corrente), eccezione };
    });
    return { file: f, dichiarata: j.versione_manuale ?? null, manuali, fuori: manuali.filter((m) => !m.allineata && !m.eccezione) };
  });
}

/** Le righe fuori posto, pronte da stampare. */
export const edizioniArretrate = (radice = RADICE) => quadroEdizioni(radice)
  .flatMap((r) => r.fuori.map((m) => ({ file: r.file, manuale: m.id, citate: m.citate, corrente: m.corrente })));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const quadro = quadroEdizioni();
  for (const r of quadro) {
    const stato = r.manuali.map((m) => `${m.id} ${m.citate.join('/')}${m.allineata ? ' ✓' : m.eccezione ? ` ⏸ ${m.corrente} (${m.eccezione.domanda ?? 'in attesa'})` : ` → ${m.corrente}`}`);
    console.log(`${r.file.padEnd(46)} ${stato.join(' · ') || '(nessun manuale del registro)'}`);
  }
  const fuori = edizioniArretrate();
  console.log(`\n${fuori.length} dichiarazioni arretrate su ${quadro.length} file.`);
  process.exitCode = fuori.length ? 1 : 0;
}
