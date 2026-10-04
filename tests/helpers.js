import { readFile } from 'node:fs/promises';
import { caricaDati } from '../src/rules.js';

const cartellaDati = new URL('../data/', import.meta.url);

export const leggiDaDisco = (nome) => readFile(new URL(`${nome}.json`, cartellaDati), 'utf8');

/** Carica i dati reali dal disco tramite lo stesso caricatore usato dall'app. */
export async function datiReali() {
  return caricaDati(leggiDaDisco);
}

/** Copia profonda, per modificare i dati in un test senza toccare gli altri. */
export const copia = (x) => structuredClone(x);

/**
 * Copia dei dati con `n` Punti Abilità Liberi alla creazione e a ogni Grado (regole.json → creazione e
 * avanzamento.eventi). Dal 04/10/2026 sono 7 (Giocatore del 03/10 sera, A.90); i test del completamento e della riassegnazione
 * simulano le regole a 10 (27/09–02/10) con cui sono stati salvati i file di collaudo.
 */
export function conPuntiLiberi(dati, n) {
  const d = copia(dati);
  d.regole.creazione.punti_abilita_liberi = n;
  for (const x of d.regole.avanzamento.eventi) x.eventi = x.eventi.map((e) => e.replace(/^punti_abilita:\d+$/, `punti_abilita:${n}`));
  return d;
}
