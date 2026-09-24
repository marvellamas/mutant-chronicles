// Caricamento dei dati delle regole (data/*.json) e validazione all'avvio.
import { validaDati } from './validate.js';

export const FILE_DATI = ['caratteristiche', 'abilita', 'corporazioni', 'addestramenti', 'classi', 'incantesimi', 'regole'];

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
 * @returns {Promise<{dati: object, errori: {file: string, chiave: string, problema: string}[]}>}
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
  // Se un file non si legge, validaDati lo segnala come mancante: evitiamo il doppione.
  const errori = [...erroriLettura, ...validaDati(dati).filter((e) => !erroriLettura.some((l) => l.file === e.file && e.chiave === ''))];
  return { dati, errori };
}
