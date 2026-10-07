// Pagina «Guida della mappa» (#/guida-mappa): docs/battlemap/guida-davide.md letto dall'app e disegnato con
// src/guida.js. Si apre dal Tavolo del Master e dal pannello «?» della mappa, in una scheda a parte. Funziona anche
// senza il server (è un file statico); la guida resta una sola, nel repo.
import { h, svuota } from './dom.js';
import { blocchiMarkdown } from '../guida.js';

export const FILE_GUIDA_MAPPA = 'docs/battlemap/guida-davide.md';

const pezzi = (lista) => lista.map((p) => (p.grassetto ? h('strong', {}, p.testo) : p.codice ? h('code', {}, p.testo) : p.testo));

/** Disegna la guida in `radice`. */
export async function renderGuidaMappa(radice) {
  const corpo = h('article', { class: 'guida-mappa' }, h('p', { class: 'nota' }, 'Lettura della guida…'));
  svuota(radice, h('section', { class: 'guida-pagina' },
    h('p', {}, h('a', { href: '#/' }, '← Mutant')), corpo));
  let testo;
  try {
    const r = await fetch(FILE_GUIDA_MAPPA, { cache: 'no-store' });
    if (!r.ok) throw new Error(`errore ${r.status}`);
    testo = await r.text();
  } catch (e) {
    svuota(corpo, h('p', { class: 'nota' }, `Guida non leggibile (${e.message}): è in ${FILE_GUIDA_MAPPA}, nella cartella di Mutant.`));
    return;
  }
  svuota(corpo, ...blocchiMarkdown(testo).map((b) => {
    if (b.tipo === 'titolo') return h(`h${Math.min(4, b.livello + 1)}`, {}, ...pezzi(b.pezzi));
    if (b.tipo === 'numerato') return h('ol', b.inizio && b.inizio !== 1 ? { start: String(b.inizio) } : {}, ...b.voci.map((v) => h('li', {}, ...pezzi(v))));
    if (b.tipo === 'puntato') return h('ul', {}, ...b.voci.map((v) => h('li', {}, ...pezzi(v))));
    return h('p', {}, ...pezzi(b.pezzi));
  }));
}

/** Il collegamento alla guida, in una scheda nuova (la mappa o la plancia restano aperte). */
export const linkGuidaMappa = (testo = 'Guida della mappa') => h('a', { href: '#/guida-mappa', target: '_blank', rel: 'noopener', class: 'link-guida-mappa', title: 'La guida della mappa di battaglia per il master, in una scheda nuova' }, testo);
