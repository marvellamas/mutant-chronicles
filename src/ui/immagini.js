// Immagini nell'interfaccia: stemmi delle Corporazioni e icone delle pagine (src/immagini.js).
// Il manifesto img/immagini.json si legge una volta all'avvio; senza manifesto o senza la voce
// richiesta le funzioni restituiscono null e chi le chiama mostra il ripiego (testo o emoji).
import { h } from './dom.js';
import { percorsoImmagine, stemmaCorporazione } from '../immagini.js';

let manifesto = null;
let dati = null;

/** Da chiamare una volta, dopo il caricamento dei dati. Non lancia mai: senza file, niente immagini. */
export async function caricaImmagini(datiRegole) {
  dati = datiRegole;
  try {
    const r = await fetch('img/immagini.json', { cache: 'no-cache' });
    manifesto = r.ok ? await r.json() : null;
  } catch {
    manifesto = null;
  }
}

/**
 * <picture>: WebP se c'è e il browser lo legge, altrimenti il PNG. È un <img> (non uno sfondo CSS),
 * quindi si stampa anche senza «grafica di sfondo». Se il file non si carica si toglie da solo.
 */
function figura(p, { classe = '', alt = '', lato = null } = {}) {
  if (!p) return null;
  const img = h('img', {
    class: classe, src: p.src, alt, width: lato, height: lato, decoding: 'async', draggable: 'false',
    onerror: (e) => e.target.closest('picture')?.remove(),
  });
  return h('picture', { class: 'figura' }, p.webp ? h('source', { type: 'image/webp', srcset: p.webp }) : null, img);
}

/** Stemma della Corporazione (dal nome), o null. variante: '96' | '512' | '512-grigio'. */
export function stemma(nome, variante = '96', opz = {}) {
  return figura(stemmaCorporazione(manifesto, dati, nome, variante), { alt: `Stemma ${nome}`, ...opz });
}

/** Sfondi di Corporazione elencati nel manifesto: { id: url }. */
export function sfondiElencati() {
  const s = manifesto?.sfondi;
  return s && typeof s === 'object' ? Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v === 'string')) : {};
}

/** Icona di una pagina della scheda (id della tab), o null. */
export function iconaPagina(tab, variante = '96', opz = {}) {
  return figura(percorsoImmagine(manifesto, 'pagine', tab, variante), opz);
}
