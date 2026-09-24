import { readFile } from 'node:fs/promises';
import { caricaDati } from '../src/rules.js';

const cartellaDati = new URL('../data/', import.meta.url);

export const leggiDaDisco = (nome) => readFile(new URL(`${nome}.json`, cartellaDati), 'utf8');

/** Carica i dati reali dal disco tramite lo stesso caricatore usato dall'app. */
export async function datiReali() {
  const { dati, errori } = await caricaDati(leggiDaDisco);
  return { dati, errori };
}

/** Copia profonda, per modificare i dati in un test senza toccare gli altri. */
export const copia = (x) => structuredClone(x);
