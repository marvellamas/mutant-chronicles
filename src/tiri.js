// Tiri di dado salvati nelle scelte: { valore, origine: "app" | "manuale" }.
// Formato generico, non legato a un passo: lo usano i PM delle Classi taumaturgiche, i
// Punti Eroe e, in futuro, i tiri dell'avanzamento di livello (docs/ricognizione-avanzamento.md, §5).

export const ORIGINI = ['app', 'manuale'];

/**
 * Descrive un tiro: { dadi, facce, fisso } → formula, minimo e massimo.
 * Es. { dadi: 2, facce: 3, fisso: 1 } → "2d3+1", 3–7; { facce: 4 } → "1d4", 1–4.
 */
export function specTiro({ dadi = 1, facce, fisso = 0 }) {
  const segno = fisso > 0 ? `+${fisso}` : fisso < 0 ? `−${-fisso}` : '';
  return { dadi, facce, fisso, formula: `${dadi}d${facce}${segno}`, minimo: dadi + fisso, massimo: dadi * facce + fisso };
}

/** Tira i dadi. `casuale(facce)` restituisce un intero 1..facce (iniettabile per i test). */
export function tira(spec, casuale = (f) => Math.floor(Math.random() * f) + 1) {
  const risultati = Array.from({ length: spec.dadi }, () => casuale(spec.facce));
  return { tiro: { valore: risultati.reduce((s, x) => s + x, 0) + spec.fisso, origine: 'app' }, risultati };
}

/** Motivo per cui un valore non è ammesso per questo tiro, oppure null. */
export function motivoFuoriIntervallo(valore, spec) {
  if (!Number.isInteger(valore)) return `Inserisci un numero intero da ${spec.minimo} a ${spec.massimo}.`;
  if (valore < spec.minimo || valore > spec.massimo) {
    return `${valore} non è possibile con ${spec.formula}: il risultato va da ${spec.minimo} a ${spec.massimo}.`;
  }
  return null;
}

/**
 * Risultato tirato dal vivo e inserito a mano.
 * @returns {{tiro: {valore, origine}} | {errore: string}}
 */
export function tiroManuale(valore, spec) {
  const errore = motivoFuoriIntervallo(valore, spec);
  return errore ? { errore } : { tiro: { valore, origine: 'manuale' } };
}

/**
 * Porta un tiro salvato al formato attuale. Migrazione: un numero semplice (formato
 * precedente, senza indicazione dell'origine) diventa { valore, origine: "app" }.
 * Restituisce null per assenza di tiro; lancia un Error per valori non interpretabili.
 */
export function migraTiro(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return { valore: v, origine: 'app' };
  if (typeof v === 'object' && !Array.isArray(v) && 'valore' in v) {
    return { valore: v.valore, origine: ORIGINI.includes(v.origine) ? v.origine : 'app' };
  }
  throw new Error(`tiro non interpretabile: ${JSON.stringify(v)}`);
}

/** Valore numerico di un tiro (accetta anche il formato precedente), o null. */
export function valoreTiro(v) {
  if (typeof v === 'number') return v;
  return v && typeof v === 'object' && Number.isInteger(v.valore) ? v.valore : null;
}

/** Il tiro è presente e ammesso per questa specifica. */
export function tiroValido(v, spec) {
  const n = valoreTiro(v);
  return n !== null && motivoFuoriIntervallo(n, spec) === null;
}
