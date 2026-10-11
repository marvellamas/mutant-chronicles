// «Mappa semplice» (N3, deciso da Marcello e Davide: l'app aiuta il tavolo e non lo rallenta): un interruttore della
// scena (scena.semplice) che spegne tutte le automazioni della mappa. Con «Mappa semplice» la mappa è un'immagine con
// griglia, muri, porte, pedine e template: il master sposta chi vuole dove vuole, senza conferme.
//   - nebbia: si apre lo stesso attorno ai PG quando si muovono, in modo semplice (quello che vedono da dove stanno,
//     fermati da muri e porte chiuse); luci e sensi speciali no, restano della mappa completa; la nebbia a mano resta;
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

/**
 * «La nebbia si apre con i PG» (12/10/2026, segnalazione di Marcello: creata la nebbia e mosso il PG, non si apriva).
 * L'interruttore è scena.visuale.automatica. Se la scena non lo ha: acceso di base (data/mappa.json →
 * visuale.automatica_predefinita) per le scene nate da quando c'è «Mappa semplice» (hanno il campo `semplice`); le scene
 * salvate prima restano come sono (spento), finché il master non lo cambia.
 */
export function nebbiaConPg(scena, dati = null) {
  if (typeof scena?.visuale?.automatica === 'boolean') return scena.visuale.automatica;
  return typeof scena?.semplice === 'boolean' ? (dati?.mappa?.visuale?.automatica_predefinita ?? dati?.visuale?.automatica_predefinita ?? true) === true : false;
}

/**
 * Come si apre la nebbia quando i PG si muovono: null (non si apre), 'semplice' (con «Mappa semplice»: quello che il PG
 * vede da dove sta, fermato da muri e porte chiuse, senza luci né sensi) o 'completa' (con luci e sensi speciali).
 */
export const modoNebbia = (scena, dati = null) => (!nebbiaConPg(scena, dati) ? null : mappaSemplice(scena) ? 'semplice' : 'completa');

/** La nebbia automatica completa (luci, sensi, «ombra» per i giocatori) lavora su questa scena? Non con «Mappa semplice». */
export const nebbiaAutomaticaAttiva = (scena, dati = null) => modoNebbia(scena, dati) === 'completa';

/**
 * La linea di tiro in «Mappa semplice»: resta la distanza (e la geometria da disegnare); Copertura, creatura interposta,
 * bersaglio protetto e cause non si calcolano.
 */
export const lineaSemplice = (r) => (r ? { ...r, copertura: 'nessuna', vista: 'libera', interposta: false, protetto: false, inMezzo: [], causa: null, semplice: true } : r);

/** Le automazioni che la scena usa, per le spiegazioni dell'interfaccia e per i test. */
export function automazioni(scena) {
  const s = mappaSemplice(scena);
  return { nebbiaAutomatica: nebbiaAutomaticaAttiva(scena), nebbia: modoNebbia(scena), luci: !s, movimento: !s, atletica: !s, copertura: !s, opportunita: !s };
}
