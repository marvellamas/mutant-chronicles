// Versione dell'app (docs/cache.md): confronto fra la versione caricata (meta «mutant-versione» di
// index.html, scritto da tools/versione.mjs) e quella del server (versione.json). Funzioni pure.

/** Ogni quanto l'app aperta ricontrolla versione.json, oltre che alla ripresa della finestra. */
export const INTERVALLO_CONTROLLO_MS = 5 * 60 * 1000;

/** { versione, data } da versione.json (oggetto già letto), o null se il contenuto non è valido. */
export function leggiVersione(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const versione = typeof v.versione === 'string' && /^[\w.-]{4,40}$/.test(v.versione) ? v.versione : null;
  if (!versione) return null;
  return { versione, data: typeof v.data === 'string' ? v.data : null };
}

/** C'è una versione nuova da caricare? Solo se entrambe sono note e diverse. */
export const serveAggiornamento = (caricata, remota) => !!caricata && !!remota && caricata !== remota;

/**
 * Indirizzo per ricaricare con la versione nuova: stessa pagina e stesso #indirizzo della scheda,
 * con ?v=<versione>. Un indirizzo nuovo per index.html salta anche la cache del documento (GitHub
 * Pages, max-age 600): il nuovo index.html porta l'importmap con i moduli ?v= nuovi.
 */
export function urlRicarica(href, versione) {
  const u = new URL(href);
  u.searchParams.set('v', versione);
  return `${u.pathname}${u.search}${u.hash}`;
}

/** Il titolo della versione da novita.json (scritto a mano), o null. */
export function leggiNovita(o) {
  const t = o && typeof o === 'object' && typeof o.titolo === 'string' ? o.titolo.trim() : '';
  return t ? t.slice(0, 60) : null;
}

/**
 * La versione in parole semplici (25/10/2026, «un ingresso solo», parte D), la stessa nell'app e in Mutant.bat:
 * «Versione del 25/10 · Talenti nuovi». La data è quella di versione.json, il titolo quello di novita.json. Senza data,
 * l'impronta.
 */
export function versioneInParole(v, titolo = null) {
  if (!v) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v.data ?? '');
  return `Versione ${m ? `del ${m[3]}/${m[2]}` : v.versione}${titolo ? ` · ${titolo}` : ''}`;
}

/** Testo per il piè di pagina: «Versione 746c34f047 · 2026-09-30 14:52». */
export const testoVersione = (v) => (v ? `Versione ${v.versione}${v.data ? ` · ${v.data}` : ''}` : '');

/**
 * Il server di Mutant (server.mjs) è stato acceso con una versione dell'app più vecchia di quella dei file? Il server
 * tiene in memoria il suo codice (validatori compresi) finché non lo si riavvia, mentre i file dell'app li legge
 * dal disco a ogni richiesta: dopo un aggiornamento senza riavvio, l'app nuova parla con il server vecchio
 * (primo test della mappa di Marcello, 06/10/2026: scene rifiutate). Vero se entrambe sono note e diverse, e anche con
 * un server di Mutant (`serverMutant`: intestazione X-Mutant-Server) che non dice la sua versione: è di prima del
 * 06/10, quando l'intestazione X-Mutant-Versione-Server non c'era (primo aggiornamento di Davide dopo la mappa).
 */
export const serverDaRiavviare = (versioneAvvio, versioneFile, serverMutant = false) => (!!versioneAvvio ? !!versioneFile && versioneAvvio !== versioneFile : !!serverMutant && !!versioneFile);
