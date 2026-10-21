// Dispositivi (tablet dei giocatori) e il personaggio che possono scrivere (21/10/2026, lotto «il tablet è
// una vista, non un proprietario», parte C). Persistenza in `tavolo/dispositivi.json` (server.mjs), come
// `tavolo/sessione.json`: niente di nuovo da aggiungere alle tre liste delle cartelle (tavolo/ c'è già).
//
// Un dispositivo è un tablet (o il browser di un giocatore): un identificativo generato una volta sola dal
// browser stesso (src/ui/dispositivo.js), che resta nel suo localStorage. Qui si tiene solo l'abbinamento
// dispositivo → personaggio (`pgId`, l'identificativo stabile di src/storico-personaggi.js, non un nome di
// file): «Alla prima connessione il giocatore sceglie il suo personaggio… da lì in avanti quel tablet può
// scrivere solo quel personaggio» (E&L del 20/10). Il PC del Direttore non passa mai di qui: resta fuori da
// questo controllo (contesto master, server.mjs → req.mutantMaster).
//
// Funzioni pure: leggono e scrivono l'oggetto già caricato, non il disco.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
/** Un identificativo di dispositivo plausibile: quello che genera crypto.randomUUID(), o un ripiego simile. */
const ID_VALIDO = /^[A-Za-z0-9_-]{6,64}$/;

/** L'archivio, ripulito: solo le voci con un dispositivo e un pgId validi. */
export function normalizzaDispositivi(o) {
  const dispositivi = {};
  if (isOggetto(o) && isOggetto(o.dispositivi)) {
    for (const [id, v] of Object.entries(o.dispositivi)) {
      if (!ID_VALIDO.test(id) || !isOggetto(v) || typeof v.pgId !== 'string' || !v.pgId.trim()) continue;
      dispositivi[id] = {
        pgId: v.pgId.trim(),
        pgNome: typeof v.pgNome === 'string' && v.pgNome.trim() ? v.pgNome.trim() : null,
        aggiornato: typeof v.aggiornato === 'string' ? v.aggiornato : new Date(0).toISOString(),
      };
    }
  }
  return { versione: 1, dispositivi };
}

/** L'abbinamento di un dispositivo: { pgId, pgNome, aggiornato } oppure null se non ha ancora scelto. */
export function associazioneDi(db, idDispositivo) {
  if (!ID_VALIDO.test(String(idDispositivo ?? ''))) return null;
  return normalizzaDispositivi(db).dispositivi[idDispositivo] ?? null;
}

/** Il dispositivo sceglie (o cambia) il suo personaggio: si può cambiare in ogni momento, dallo stesso dispositivo. */
export function conAssociazione(db, idDispositivo, pgId, pgNome = null, quando = new Date()) {
  if (!ID_VALIDO.test(String(idDispositivo ?? '')) || typeof pgId !== 'string' || !pgId.trim()) return normalizzaDispositivi(db);
  const n = normalizzaDispositivi(db);
  return { ...n, dispositivi: { ...n.dispositivi, [idDispositivo]: { pgId: pgId.trim(), pgNome: pgNome ?? null, aggiornato: new Date(quando).toISOString() } } };
}

/** Il Direttore toglie l'abbinamento (per correggerlo, o per liberare il dispositivo). */
export function senzaAssociazione(db, idDispositivo) {
  const n = normalizzaDispositivi(db);
  const { [idDispositivo]: via, ...resto } = n.dispositivi;
  return { ...n, dispositivi: resto };
}

/**
 * Questo dispositivo può scrivere il personaggio `pgId`? Si usa solo quando la scrittura si dichiara «giocatore»
 * e porta un identificativo di dispositivo: senza l'uno o l'altro (client di prima, strumenti, test) non si
 * applica, per compatibilità (come le altre migrazioni silenziose del progetto).
 */
export function puoScrivere(db, idDispositivo, pgId) {
  const a = associazioneDi(db, idDispositivo);
  return !!a && !!pgId && a.pgId === pgId;
}

/** Elenco per «Chi è collegato» del Direttore, dal più recente: [{ id, pgId, pgNome, aggiornato }]. */
export function elencoDispositivi(db) {
  return Object.entries(normalizzaDispositivi(db).dispositivi)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => (b.aggiornato > a.aggiornato ? 1 : b.aggiornato < a.aggiornato ? -1 : 0));
}
