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
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RADICE, registro, voce, testoManuale, testoEdizione, righeDiTesto, celleDiTesto } from './manuali.mjs';

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
 * I **corpora** dichiarati: insiemi di dati del repo che non sono file di `data/` e che dichiarano comunque
 * l'edizione da cui vengono — oggi `esempi/nemici/`, le schede delle creature, generate dal Mostri 0.47 e non
 * ancora rigenerate (lotto 197).
 *
 * Perché esistono. La nona regola dice «ogni insieme di dati dichiara l'edizione da cui viene», e `data/` non è
 * l'unico posto in cui il repo tiene dati copiati da un manuale. Senza questa riga, il giorno in cui `data/` si
 * allinea alla 0.67 i controlli delle creature leggerebbero il manuale nuovo e diventerebbero rossi per il solo
 * fatto che Davide ha pubblicato: esattamente ciò che la nona regola serve a evitare. Un corpus dichiarato deve
 * esistere su disco, altrimenti è un'eccezione dimenticata e `corporaFuoriPosto` lo dice.
 */
export const corpora = (radice = RADICE) => Object.keys(eccezioni()).filter((k) => !k.startsWith('data/')).map((k) => ({ chiave: k, esiste: existsSync(join(radice, k)) }));

export const corporaFuoriPosto = (radice = RADICE) => corpora(radice).filter((c) => !c.esiste);

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

/**
 * L'edizione di un manuale **da cui i dati del repo vengono davvero** (lotto 191).
 *
 * Perché serve. Un manuale si recepisce (il testo entra in `docs/manuali-txt/` e il registro lo dichiara corrente)
 * prima che i dati si rigenerino: fra i due momenti passa un lotto. In quel mezzo, chi confronta un dato con «il
 * manuale» deve leggere l'edizione **da cui quel dato è stato copiato**, non la corrente — altrimenti un controllo
 * giusto diventa rosso solo perché Davide ha pubblicato, e l'unica via per farlo tornare verde sarebbe spegnerlo.
 * L'edizione non si scrive nel controllo: la dice `edizioni_in_attesa`, con il suo motivo e il suo lotto. Quando il
 * lotto rigenera i dati e toglie l'eccezione, questa funzione torna a dare la corrente da sé.
 *
 * Si ferma se due file dichiarano edizioni diverse dello stesso manuale: a quel punto «il manuale dei dati» non
 * esiste più come cosa sola, e chi legge deve saperlo invece di prendere la prima.
 */
export function edizioneDeiDati(id, radice = RADICE) {
  const corrente = voce(id).versione;
  const viste = new Set();
  // i corpora dichiarati (insiemi di dati fuori dalla cartella data/): la loro edizione conta come quella di un file
  for (const [chiave, m] of Object.entries(eccezioni())) {
    if (chiave.startsWith('data/')) continue;
    const e = m?.[id];
    if (e?.edizione && e.edizione !== corrente) viste.add(e.edizione);
  }
  for (const r of quadroEdizioni(radice)) {
    for (const m of r.manuali) {
      if (m.id !== id || m.allineata || !m.eccezione) continue;
      for (const v of m.citate) if (v !== corrente) viste.add(v);
    }
  }
  if (viste.size > 1) throw new Error(`i dati dichiarano più edizioni di «${id}»: ${[...viste].join(', ')} — «il manuale dei dati» non è più una cosa sola`);
  return viste.size ? [...viste][0] : corrente;
}

/** Il testo dell'edizione da cui i dati vengono: la corrente, o quella dichiarata in attesa. */
export function testoDeiDati(id, radice = RADICE) {
  const v = edizioneDeiDati(id, radice);
  return v === voce(id).versione ? testoManuale(id) : testoEdizione(id, v);
}

/** Le righe piatte e le celle dell'edizione da cui i dati vengono (come `righeManuale`/`celleManuale`). */
export const righeDeiDati = (id, radice = RADICE) => righeDiTesto(testoDeiDati(id, radice));
export const celleDeiDati = (id, radice = RADICE) => celleDiTesto(testoDeiDati(id, radice));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const quadro = quadroEdizioni();
  for (const r of quadro) {
    const stato = r.manuali.map((m) => `${m.id} ${m.citate.join('/')}${m.allineata ? ' ✓' : m.eccezione ? ` ⏸ ${m.corrente} (${m.eccezione.domanda ?? 'in attesa'})` : ` → ${m.corrente}`}`);
    console.log(`${r.file.padEnd(46)} ${stato.join(' · ') || '(nessun manuale del registro)'}`);
  }
  for (const c of corpora()) {
    const m = eccezioni()[c.chiave];
    const stato = Object.entries(m).map(([id, e]) => `${id} ${e.edizione ?? '?'} ⏸ ${voce(id).versione} (${e.lotto ?? 'in attesa'})`);
    console.log(`${c.chiave.padEnd(46)} ${stato.join(' · ')}${c.esiste ? '' : '  ← non esiste su disco'}`);
  }
  const fuori = edizioniArretrate();
  const corpiFuori = corporaFuoriPosto();
  console.log(`\n${fuori.length} dichiarazioni arretrate su ${quadro.length} file; ${corpora().length} corpora dichiarati${corpiFuori.length ? `, ${corpiFuori.length} che non esistono su disco` : ''}.`);
  process.exitCode = fuori.length || corpiFuori.length ? 1 : 0;
}
