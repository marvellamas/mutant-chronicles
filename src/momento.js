// Scena e capitolo della campagna (lotto 175, A.233, Davide 02/11/2026): «Il capitolo è distinto dall'Atto dei PX: un Atto
// può comprendere più capitoli. Il Direttore stabilisce quando iniziano una nuova scena o un nuovo capitolo, tramite
// comandi nella propria plancia che rinnovano sui tablet soltanto gli utilizzi pertinenti. […] Questi comandi non
// ripristinano PM, munizioni o altre risorse.» Funzioni pure; il server le salva in tavolo/momento.json.
//
// Il momento è solo una coppia di numeri, { scena, capitolo }: un uso per scena consumato si ricorda il numero della scena
// (src/usi-talenti.js) e torna disponibile quando il numero cambia. Il comando non scrive nei file dei personaggi, quindi
// non può toccare PM, munizioni o riserve. «Annulla» rimette i numeri di prima (lo storico tiene gli ultimi comandi).
// Scena e capitolo sono indipendenti: un capitolo nuovo non rinnova gli usi per scena, e viceversa.
const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const positivo = (n, d = 1) => (Number.isInteger(n) && n >= 1 ? n : d);
export const AZIONI_MOMENTO = ['scena', 'capitolo'];
export const STORICO_MOMENTO = 20;

/** Il momento salvato, ripulito: { scena, capitolo, storico: [{ azione, prima: { scena, capitolo }, quando }] }. */
export function normalizzaMomento(x) {
  const o = isOggetto(x) ? x : {};
  const storico = (Array.isArray(o.storico) ? o.storico : [])
    .filter((s) => isOggetto(s) && AZIONI_MOMENTO.includes(s.azione) && isOggetto(s.prima))
    .map((s) => ({ azione: s.azione, prima: { scena: positivo(s.prima.scena), capitolo: positivo(s.prima.capitolo) }, quando: typeof s.quando === 'string' ? s.quando : null }))
    .slice(-STORICO_MOMENTO);
  return { scena: positivo(o.scena), capitolo: positivo(o.capitolo), storico };
}

/**
 * «Nuova scena» o «Nuovo capitolo»: il numero sale di uno, l'altro non cambia; il comando va nello storico per «Annulla».
 * @returns il momento nuovo, o null per un'azione sconosciuta
 */
export function avanzaMomento(m, azione, quando = null) {
  if (!AZIONI_MOMENTO.includes(azione)) return null;
  const x = normalizzaMomento(m);
  return { ...x, [azione]: x[azione] + 1, storico: [...x.storico, { azione, prima: { scena: x.scena, capitolo: x.capitolo }, quando }].slice(-STORICO_MOMENTO) };
}

/** «Annulla»: rimette i numeri di prima dell'ultimo comando. null se non c'è niente da annullare. */
export function annullaMomento(m) {
  const x = normalizzaMomento(m);
  const ultimo = x.storico.at(-1);
  if (!ultimo) return null;
  return { scena: ultimo.prima.scena, capitolo: ultimo.prima.capitolo, storico: x.storico.slice(0, -1) };
}

/** Quello che vede un tablet: i due numeri e l'ultimo comando (per dire «annullabile»), senza lo storico. */
export const momentoPubblico = (m) => {
  const x = normalizzaMomento(m);
  const u = x.storico.at(-1);
  return { scena: x.scena, capitolo: x.capitolo, ...(u ? { ultimo: { azione: u.azione, quando: u.quando } } : {}) };
};
