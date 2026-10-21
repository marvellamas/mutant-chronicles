// Dispositivi (tablet dei giocatori) e il personaggio che possono scrivere (21/10/2026, lotto «il tablet è
// una vista, non un proprietario», parte C; riquadro del Direttore, parte B del lotto «le code dell'originale»,
// 21/10/2026 pomeriggio). Persistenza in `tavolo/dispositivi.json` (server.mjs), come `tavolo/sessione.json`:
// niente di nuovo da aggiungere alle tre liste delle cartelle (tavolo/ c'è già).
//
// Un dispositivo è un tablet (o il browser di un giocatore): un identificativo generato una volta sola dal
// browser stesso (src/ui/dispositivo.js), che resta nel suo localStorage. Qui si tiene l'abbinamento
// dispositivo → personaggio (`pgId`, l'identificativo stabile di src/storico-personaggi.js, non un nome di
// file): «Alla prima connessione il giocatore sceglie il suo personaggio… da lì in avanti quel tablet può
// scrivere solo quel personaggio» (E&L del 20/10). Il PC del Direttore non passa mai di qui: resta fuori da
// questo controllo (contesto master, server.mjs → req.mutantMaster).
//
// Il record di un dispositivo resta anche senza un personaggio scelto (pgId null): comincia a esistere al primo
// «si è fatto vivo» (GET /api/dispositivo, src/ui/dispositivo.js → leggiAssociazione, server.mjs →
// dispositivoVisto) e «Stacca» (il Direttore, dal riquadro «Tablet e personaggi scelti») lo svuota senza
// cancellarlo — altrimenti il Direttore lo vedrebbe sparire dall'elenco invece che leggere «tablet non ancora
// assegnato», e non potrebbe più correggerlo.
//
// Funzioni pure: leggono e scrivono l'oggetto già caricato, non il disco.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
/** Un identificativo di dispositivo plausibile: quello che genera crypto.randomUUID(), o un ripiego simile. */
const ID_VALIDO = /^[A-Za-z0-9_-]{6,64}$/;

/** L'archivio, ripulito: solo le voci con un dispositivo valido. pgId/pgNome null = non ha ancora scelto (o il
    Direttore lo ha staccato), ma il dispositivo resta nell'elenco. */
export function normalizzaDispositivi(o) {
  const dispositivi = {};
  if (isOggetto(o) && isOggetto(o.dispositivi)) {
    for (const [id, v] of Object.entries(o.dispositivi)) {
      if (!ID_VALIDO.test(id) || !isOggetto(v)) continue;
      const pgId = typeof v.pgId === 'string' && v.pgId.trim() ? v.pgId.trim() : null;
      dispositivi[id] = {
        pgId,
        pgNome: pgId && typeof v.pgNome === 'string' && v.pgNome.trim() ? v.pgNome.trim() : null,
        aggiornato: typeof v.aggiornato === 'string' ? v.aggiornato : new Date(0).toISOString(),
      };
    }
  }
  return { versione: 1, dispositivi };
}

/** Il record di un dispositivo: { pgId: null, pgNome: null, aggiornato } se si è fatto vivo ma non ha ancora
    scelto (o è stato staccato); null se questo dispositivo non è mai stato visto. */
export function associazioneDi(db, idDispositivo) {
  if (!ID_VALIDO.test(String(idDispositivo ?? ''))) return null;
  return normalizzaDispositivi(db).dispositivi[idDispositivo] ?? null;
}

/**
 * «Si è fatto vivo»: crea il record se è la prima volta (senza personaggio), altrimenti aggiorna solo il momento
 * — mai il personaggio scelto. Si chiama a ogni controllo del dispositivo (GET /api/dispositivo), così «da
 * quanto tempo si è fatto vivo» nel riquadro del Direttore riflette l'uso vero, non solo l'ultima scelta.
 */
export function dispositivoVisto(db, idDispositivo, quando = new Date()) {
  if (!ID_VALIDO.test(String(idDispositivo ?? ''))) return normalizzaDispositivi(db);
  const n = normalizzaDispositivi(db);
  const prima = n.dispositivi[idDispositivo] ?? { pgId: null, pgNome: null, aggiornato: new Date(0).toISOString() };
  return { ...n, dispositivi: { ...n.dispositivi, [idDispositivo]: { ...prima, aggiornato: new Date(quando).toISOString() } } };
}

/** Il dispositivo sceglie (o cambia) il suo personaggio: si può cambiare in ogni momento, dallo stesso dispositivo. */
export function conAssociazione(db, idDispositivo, pgId, pgNome = null, quando = new Date()) {
  if (!ID_VALIDO.test(String(idDispositivo ?? '')) || typeof pgId !== 'string' || !pgId.trim()) return normalizzaDispositivi(db);
  const n = normalizzaDispositivi(db);
  return { ...n, dispositivi: { ...n.dispositivi, [idDispositivo]: { pgId: pgId.trim(), pgNome: pgNome ?? null, aggiornato: new Date(quando).toISOString() } } };
}

/** Il Direttore toglie l'abbinamento (per correggerlo, o per liberare il dispositivo): il dispositivo resta
    nell'elenco, senza personaggio («tablet non ancora assegnato»), non sparisce. */
export function senzaAssociazione(db, idDispositivo, quando = new Date()) {
  if (!ID_VALIDO.test(String(idDispositivo ?? ''))) return normalizzaDispositivi(db);
  const n = normalizzaDispositivi(db);
  if (!n.dispositivi[idDispositivo]) return n;
  return { ...n, dispositivi: { ...n.dispositivi, [idDispositivo]: { pgId: null, pgNome: null, aggiornato: new Date(quando).toISOString() } } };
}

/**
 * Questo dispositivo può scrivere il personaggio `pgId`? Si usa solo quando la scrittura si dichiara «giocatore»
 * e porta un identificativo di dispositivo: senza l'uno o l'altro (client di prima, strumenti, test) non si
 * applica, per compatibilità (come le altre migrazioni silenziose del progetto).
 */
export function puoScrivere(db, idDispositivo, pgId) {
  const a = associazioneDi(db, idDispositivo);
  return !!a?.pgId && !!pgId && a.pgId === pgId;
}

/** Elenco per «Tablet e personaggi scelti» del Direttore, dal più recente: [{ id, pgId, pgNome, aggiornato }]. */
export function elencoDispositivi(db) {
  return Object.entries(normalizzaDispositivi(db).dispositivi)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => (b.aggiornato > a.aggiornato ? 1 : b.aggiornato < a.aggiornato ? -1 : 0));
}
