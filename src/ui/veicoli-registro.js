// Client del registro dei veicoli (A.91, server.mjs → /api/veicoli): lettura, scrittura con la revisione e modifiche
// concorrenti senza perdite (src/veicoli-registro.js → applicaPatch). Solo con il server di Mutant.
import { applicaPatch, migraVeicoli } from '../veicoli-registro.js';

/** Tutti i record del registro. Errore se il server non risponde. */
export async function elencoVeicoli() {
  const r = await fetch('api/veicoli', { cache: 'no-store' });
  if (!r.ok) throw new Error(`registro dei veicoli non leggibile (${r.status})`);
  return r.json();
}

/** Scrive un record: { record } oppure { conflitto: true, attuale } se è cambiato altrove. */
export async function scriviVeicolo(rec) {
  const { mtime: _m, ...dati } = rec;
  const r = await fetch(`api/veicoli/${encodeURIComponent(rec.id)}`, { method: 'PUT', body: JSON.stringify(dati), headers: { 'Content-Type': 'application/json' } });
  const corpo = await r.json().catch(() => ({}));
  if (r.status === 409) return { conflitto: true, attuale: corpo.attuale };
  if (!r.ok) throw new Error(corpo.errore ?? `veicolo non salvato (${r.status})`);
  return { record: corpo };
}

/**
 * Applica la modifica `prima → dopo` al record del registro: con un conflitto rilegge il record attuale e riapplica
 * solo i campi cambiati (un campo cambiato anche altrove resta quello del registro e si segnala).
 * @returns {{ record, conflitti: string[] }}
 */
export async function aggiornaVeicolo(prima, dopo) {
  let base = prima;
  const conflitti = new Set();
  for (let i = 0; i < 3; i++) {
    const p = applicaPatch(base, prima, dopo);
    p.conflitti.forEach((c) => conflitti.add(c));
    const r = await scriviVeicolo({ ...p.record, revisione: base.revisione });
    if (!r.conflitto) return { record: r.record, conflitti: [...conflitti] };
    base = r.attuale;
  }
  throw new Error('il veicolo è cambiato tre volte di fila: riprova');
}

/**
 * Migrazione all'apertura della scheda con il server (A.91): i veicoli locali del PG diventano record del registro
 * (una sola volta per veicolo; doppioni del gruppo con un avviso, senza unione). Restituisce le scelte dei veicoli
 * con i riferimenti, i record creati e gli avvisi.
 */
export async function migraNelRegistro(veicoli, chi) {
  const registro = await elencoVeicoli();
  const m = migraVeicoli(veicoli, chi, registro);
  for (const rec of m.nuovi) await scriviVeicolo(rec); // un 409 vuol dire che c'è già: resta quello
  return m;
}
