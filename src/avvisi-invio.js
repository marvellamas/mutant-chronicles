// L'invio di una voce al diario del Direttore (lotto 249). Un posto solo, perché **ogni** avviso ci passi: chi
// aggiunge un «Procedi comunque» non deve ricordarsi di scrivere anche al Direttore — ci pensa `conAvviso`.
//
// Non fa parte dell'azione: se il server non c'è (l'app aperta senza `avvia-server.bat`) o la rete cade, l'azione è
// già stata fatta e la traccia è già nello storico del personaggio. Qui non si blocca niente e non si aspetta
// niente: si manda e si va avanti.
import { conto as contoDiario } from './avvisi-direttore.js';

let ultimoConto = { da_leggere: 0, grosse: 0 };
// Chi sta usando la scheda adesso: lo scrive la scheda a ogni disegno, e 'conAvviso' lo mette in ogni voce senza
// che 32 punti di chiamata debbano ricordarselo. Niente nome, niente voce muta: resta «—».
let chiAdesso = null;
export const impostaChiAvvisa = (nome) => { chiAdesso = nome && String(nome).trim() ? String(nome).trim() : null; };
export const chiAvvisa = () => chiAdesso;
const ascoltatori = new Set();
/** Chi vuole sapere quante voci ci sono da leggere (il tocco nella plancia) si iscrive qui. */
export function alCambioAvvisi(f) { ascoltatori.add(f); return () => ascoltatori.delete(f); }
export const contoAvvisi = () => ({ ...ultimoConto });
function aggiorna(c) {
  if (!c || (c.da_leggere === ultimoConto.da_leggere && c.grosse === ultimoConto.grosse)) return;
  ultimoConto = { da_leggere: c.da_leggere ?? 0, grosse: c.grosse ?? 0 };
  for (const f of ascoltatori) { try { f(contoAvvisi()); } catch { /* un ascoltatore rotto non ferma gli altri */ } }
}

/**
 * Manda una voce. Non lancia mai e non si attende: torna true se è arrivata.
 * @param voce { chi, cosa, numeri?, motivo?, dove?, gravita? } — vedi src/avvisi-direttore.js
 */
export async function mandaAvviso(voce) {
  if (!voce?.cosa) return false;
  try {
    const r = await fetch('api/avvisi', { method: 'POST', body: JSON.stringify(voce), headers: { 'Content-Type': 'application/json' } });
    if (!r.ok) return false;
    aggiorna(await r.json().catch(() => null));
    return true;
  } catch { return false; }
}

/** Il diario per il Direttore: la vista pronta da leggere, o null se il server non c'è. */
export async function leggiAvvisi() {
  try {
    const r = await fetch('api/avvisi', { cache: 'no-store' });
    if (!r.ok) return null;
    const v = await r.json();
    aggiorna(v);
    return v;
  } catch { return null; }
}

/** Segna lette: `ids` o 'tutte'. Le voci restano, con l'ora in cui sono state lette. Solo dal PC del Direttore. */
export async function segnaAvvisiLetti(ids = 'tutte') {
  try {
    const r = await fetch('api/avvisi/letti', { method: 'POST', body: JSON.stringify({ ids }), headers: { 'Content-Type': 'application/json' } });
    if (!r.ok) return null;
    const v = await r.json();
    aggiorna(v);
    return v;
  } catch { return null; }
}

/** Il conto da un diario già in mano (per i test e per chi legge il file da sé). */
export const contoDi = contoDiario;
