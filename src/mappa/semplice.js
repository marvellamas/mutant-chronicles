// «Mappa semplice» (N3, deciso da Marcello e Davide: l'app aiuta il tavolo e non lo rallenta): un interruttore della
// scena (scena.semplice) che spegne tutte le automazioni della mappa. Con «Mappa semplice» la mappa è un'immagine con
// griglia, muri, porte, pedine e template: il master sposta chi vuole dove vuole, senza conferme.
//   - nebbia automatica e sensi speciali: spenti (la nebbia a mano resta);
//   - luci: non limitano la vista e non arrivano ad «Attacca!»;
//   - conteggio del movimento: nessuna area, nessuna fascia, nessun blocco, niente Attacchi di Opportunità proposti;
//   - Prova di Atletica proposta dal movimento del Round (A.136): non proposta;
//   - linea di tiro: si traccia e dà la distanza; Copertura, creatura interposta e protetto non si calcolano.
// Acceso di base per le scene nuove (data/mappa.json → scena.semplice_predefinita); le scene salvate prima non hanno il
// campo e restano come sono (spento) finché il master non lo cambia. Funzioni pure, per pagina, server, tablet e test.

/** La scena è in «Mappa semplice»? */
export const mappaSemplice = (scena) => scena?.semplice === true;

/** Valore di «Mappa semplice» per una scena nuova (data/mappa.json → scena.semplice_predefinita). */
export const semplicePredefinita = (dati) => dati?.mappa?.scena?.semplice_predefinita === true;

/** La scena con l'interruttore cambiato; spento, il campo resta scritto (false) così si distingue da una scena vecchia. */
export const conSemplice = (scena, acceso) => ({ ...scena, semplice: !!acceso });

/** La nebbia automatica (e con lei sensi speciali e limiti delle luci) lavora su questa scena? */
export const nebbiaAutomaticaAttiva = (scena) => !!scena?.visuale?.automatica && !mappaSemplice(scena);

/**
 * La linea di tiro in «Mappa semplice»: resta la distanza (e la geometria da disegnare); Copertura, creatura interposta,
 * bersaglio protetto e cause non si calcolano.
 */
export const lineaSemplice = (r) => (r ? { ...r, copertura: 'nessuna', vista: 'libera', interposta: false, protetto: false, inMezzo: [], causa: null, semplice: true } : r);

/** Le automazioni che la scena usa, per le spiegazioni dell'interfaccia e per i test. */
export function automazioni(scena) {
  const s = mappaSemplice(scena);
  return { nebbiaAutomatica: nebbiaAutomaticaAttiva(scena), luci: !s, movimento: !s, atletica: !s, copertura: !s, opportunita: !s };
}
