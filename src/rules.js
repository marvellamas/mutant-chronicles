// Caricamento dei dati delle regole (data/*.json) e validazione all'avvio.
import { validaDati, avvisiDati } from './validate.js';

export const FILE_DATI = ['caratteristiche', 'abilita', 'corporazioni', 'addestramenti', 'classi', 'incantesimi', 'regole',
  'talenti_liberi', 'specializzazioni', 'tecniche_interiori', 'dotazioni', 'formato_nemici', 'bestiario', 'veicoli', 'mappa'];

/** Lettore per il browser: scarica data/<nome>.json accanto a index.html. */
export function lettoreFetch(base = 'data/') {
  return async (nome) => {
    const risposta = await fetch(`${base}${nome}.json`, { cache: 'no-cache' });
    if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
    return risposta.text();
  };
}

/**
 * Carica e valida tutti i file dati.
 * @param {(nome: string) => Promise<string>} leggi restituisce il testo del file <nome>.json
 * @returns {Promise<{dati: object, errori: {file: string, chiave: string, problema: string}[], avvisi: object[]}>}
 *   errori: bloccanti; avvisi: punti da completare (TODO) che non impediscono l'avvio
 */
export async function caricaDati(leggi = lettoreFetch()) {
  const dati = {};
  const erroriLettura = [];
  await Promise.all(FILE_DATI.map(async (nome) => {
    let testo;
    try {
      testo = await leggi(nome);
    } catch (e) {
      erroriLettura.push({ file: `${nome}.json`, chiave: '', problema: `impossibile leggere il file (${e.message})` });
      return;
    }
    try {
      dati[nome] = JSON.parse(testo);
    } catch (e) {
      erroriLettura.push({ file: `${nome}.json`, chiave: '', problema: `JSON non valido: ${e.message}` });
    }
  }));
  await caricaEquipaggiamento(leggi, dati, erroriLettura);
  // Se un file non si legge, validaDati lo segnala come mancante: evitiamo il doppione.
  const errori = [...erroriLettura, ...validaDati(dati).filter((e) => !erroriLettura.some((l) => l.file === e.file && e.chiave === ''))];
  return { dati, errori, avvisi: errori.length ? [] : avvisiDati(dati) };
}

/**
 * Catalogo dell'equipaggiamento: data/equipaggiamento/index.json elenca i file dei lotti.
 * Aggiungere un lotto = aggiungere un file e una riga nell'indice. Risultato in
 * dati.equipaggiamento = { versione_manuale, indice, file: { <id>: contenuto } }.
 */
async function caricaEquipaggiamento(leggi, dati, erroriLettura) {
  const leggiJson = async (nome) => {
    try {
      return JSON.parse(await leggi(nome));
    } catch (e) {
      erroriLettura.push({ file: `${nome}.json`, chiave: '', problema: e instanceof SyntaxError ? `JSON non valido: ${e.message}` : `impossibile leggere il file (${e.message})` });
      return null;
    }
  };
  const indice = await leggiJson('equipaggiamento/index');
  if (!indice) return;
  const file = {};
  await Promise.all((Array.isArray(indice.file) ? indice.file : []).map(async (voce) => {
    if (typeof voce?.file !== 'string' || !voce.file.endsWith('.json')) return; // lo segnala il validatore
    const contenuto = await leggiJson(`equipaggiamento/${voce.file.slice(0, -5)}`);
    if (contenuto) file[voce.id] = contenuto;
  }));
  dati.equipaggiamento = { versione_manuale: indice.versione_manuale, indice, file };
}

// Dati che non riguardano (ancora) il personaggio: non entrano nelle versioni dei dati scritte nel suo file né
// nel piede della stampa. Il Bestiario proposto è del Tavolo del Master. I veicoli (lotto 3) stanno nel file del PG
// che li possiede (A.91, decisione provvisoria), ma veicoli.json resta qui: così le versioni dei dati scritte nei
// file dei PG senza veicoli non cambiano. La mappa di battaglia (mappa.json) è solo del Tavolo del Master.
export const FILE_SOLO_TAVOLO = ['bestiario', 'veicoli', 'mappa'];

/** Versione del manuale di ogni file dati che riguarda il personaggio: { file: versione_manuale }. */
export function versioniPersonaggio(dati) {
  return Object.fromEntries(Object.entries(dati ?? {}).filter(([k]) => !FILE_SOLO_TAVOLO.includes(k)).map(([k, v]) => [k, v?.versione_manuale]));
}
