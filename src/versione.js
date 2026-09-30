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

/** Testo per il piè di pagina: «Versione 746c34f047 · 2026-09-30 14:52». */
export const testoVersione = (v) => (v ? `Versione ${v.versione}${v.data ? ` · ${v.data}` : ''}` : '');
