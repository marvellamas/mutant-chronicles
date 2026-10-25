// La riga «Copia di lavoro» in cima a ogni pagina (20/10/2026). Sta fuori dalla radice dell'app, come il pulsante
// «torna in cima»: la scheda, il Tavolo, la plancia, la mappa e la vista dei giocatori sul tablet si ridisegnano
// continuamente, la riga no. Sull'installazione del Direttore non viene montata affatto.
import { h } from './dom.js';
import { fasciaDaMostrare } from '../copia-di-lavoro.js';

/** Lo stato dell'installazione dal server (/api/ping). Senza server (nessuna cartella) non è una copia di lavoro. */
export async function leggiStatoInstallazione(fetchFn = fetch) {
  try {
    const r = await fetchFn('api/ping', { cache: 'no-store' });
    if (!r.ok) return null;
    const p = await r.json();
    return p?.copiaDiLavoro ? { copiaDiLavoro: true, nota: typeof p.notaCopia === 'string' ? p.notaCopia : '', ...(typeof p.nomePc === 'string' && p.nomePc ? { nomePc: p.nomePc } : {}) } : null;
  } catch { return null; }
}

/**
 * Monta la riga in cima al documento, una volta sola. Restituisce l'elemento, o null se non c'è niente da dire.
 * La riga si legge da un metro: sta sopra tutto, occupa la larghezza della pagina e resta anche scorrendo.
 */
export function montaFasciaCopia(stato, { documento = document } = {}) {
  const f = fasciaDaMostrare(stato);
  if (!f) return null;
  const gia = documento.getElementById('fascia-copia-di-lavoro');
  if (gia) return gia;
  const el = h('div', { id: 'fascia-copia-di-lavoro', class: 'fascia-copia-di-lavoro', role: 'status' },
    h('strong', {}, f.testo),
    f.nota ? h('span', { class: 'nota-copia' }, ` · ${f.nota}`) : null);
  documento.body.prepend(el);
  documento.body.classList?.add('con-fascia-copia');
  return el;
}
