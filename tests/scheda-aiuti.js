// Aiuti comuni ai test della scheda a tab (estratti da tests/scheda-ritocchi.test.js il 13/10/2026, così un altro
// file di test può usarli senza rieseguire quei test): un PG d'esempio con la sua sessione e la scheda resa nel DOM finto.
import { readFileSync, readdirSync } from 'node:fs';
import { installaDomFinto } from './dom-finto.js';
import { datiReali, copia } from './helpers.js';
import { preparaTab } from '../src/stampa.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { massimiSessione, allineaSessione, penalitaSessione } from '../src/sessione.js';

installaDomFinto();
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { renderTab, tabFissi } = await import('../src/ui/tab.js');
const { dati } = await datiReali();
export { dati };

export const cartella = new URL('../esempi/', import.meta.url);
export const ESEMPI = readdirSync(cartella).filter((f) => f.endsWith('.json'));

/** Un PG d'esempio con la sua sessione (modificabile con `cambia`) e il contesto della scheda a tab. */
export function contesto(file, { attiva = 'identita', cambia = null, scelte = null } = {}) {
  const p = deserializzaPersonaggio(readFileSync(new URL(file, cartella), 'utf8'));
  let creazione = normalizza(p.creazione, dati).scelte;
  if (scelte) creazione = normalizza(scelte(copia(creazione)), dati).scelte;
  const riposo = preparaTab({ creazione, livelli: p.livelli }, dati);
  const massimi = massimiSessione(riposo.scheda, creazione, dati);
  const sessione = allineaSessione(p.sessione, massimi);
  cambia?.(sessione);
  const tab = preparaTab({ creazione, livelli: p.livelli }, dati, { sessione });
  tab.tab = tabFissi(tab.tab);
  const chiamate = [];
  const azioni = new Proxy({}, { get: (_, nome) => (...argomenti) => { chiamate.push([nome, ...argomenti]); } });
  return { dati, tab, attiva, scelte: creazione, livelli: p.livelli, sessione, massimi, penalita: penalitaSessione(sessione, dati), posizione: 'alto', larghezza: 'piena',
    sfondi: [], passi: { background: 0, equipaggiamento: 8 }, ui: {}, azioni, chiamate, partecipanti: [], chi: {}, server: false };
}

/** La scheda resa: radice finta con tutti i nodi, e gli aiuti per cercarli. */
export function resa(ctx) {
  const radice = document.createElement('div');
  radice.append(...renderTab(ctx).filter(Boolean));
  const tutti = radice.tutti();
  return { radice, tutti, classe: (c) => radice.querySelectorAll(`.${c}`), testo: () => radice.textContent };
}
export const clic = (nodo) => (nodo.ascolti.click ?? []).forEach((f) => f({ preventDefault() {}, stopPropagation() {}, target: nodo }));
export const TAB = ['identita', 'abilita', 'combattimento', 'poteri', 'artefatti', 'cibernetica', 'veicoli', 'inventario'];
