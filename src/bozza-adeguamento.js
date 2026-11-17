// La bozza dell'adeguamento delle Abilità è di UN personaggio e di UN adeguamento (lotto 212).
//
// Perché. Fino al 211 stava in una variabile sola per tutta l'app: assegnati cinque punti a Dimitri, aprendo Pablo si vedevano «9 punti» da
// assegnare, cioè i cinque di Dimitri nella scheda di Pablo, e «Conferma» li avrebbe scritti a lui. Sul PC del Direttore, che apre le schede
// una dopo l'altra, è il caso normale. In più la bozza viveva solo in memoria: un ricaricamento a metà serata la perdeva (un'ora di lavoro).
// Qui la bozza si salva per personaggio e per adeguamento (`riga` della nota di prima); se non corrisponde, non c'è. Funzioni pure sullo storage passato.

export const chiaveBozza = (id) => `mutant-bozza-adeguamento:${id}`;

/** La bozza salvata per quel personaggio **e** per quell'adeguamento, o null (mai una bozza di un altro). */
export function leggiBozzaSalvata(storage, id, riga) {
  if (!storage || !id) return null;
  try {
    const s = JSON.parse(storage.getItem(chiaveBozza(id)) ?? 'null');
    if (s && s.riga === (riga ?? null) && s.punti && typeof s.punti === 'object' && !Array.isArray(s.punti)) return s.punti;
  } catch { /* storage assente o guasto: si perde la bozza, mai un punto confermato */ }
  return null;
}

/** Salva (o toglie, con bozza null) la bozza di quel personaggio. */
export function salvaBozza(storage, id, riga, bozza) {
  if (!storage || !id) return;
  try {
    if (bozza) storage.setItem(chiaveBozza(id), JSON.stringify({ riga: riga ?? null, punti: bozza }));
    else storage.removeItem(chiaveBozza(id));
  } catch { /* come sopra */ }
}

/**
 * Il possesso in memoria: una bozza vale solo per il personaggio che l'ha creata. `stato` ha `bozza` e `di`; `id` è il personaggio aperto.
 * Torna la bozza del personaggio aperto (caricandola dallo storage se ha appena cambiato) o null.
 */
export function bozzaDi(stato, id, caricaSalvata) {
  if (stato.di !== id) { stato.bozza = null; stato.di = id; stato.bozza = caricaSalvata?.() ?? null; }
  return stato.bozza ?? null;
}

export function impostaBozza(stato, id, bozza) { stato.bozza = bozza; stato.di = id; }
