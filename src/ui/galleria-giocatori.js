// Galleria, lato giocatori (N1, 13/10/2026): l'immagine che il master mostra, a tutto schermo sopra la scheda o la
// mappa, con una ✕ per chiuderla da soli (chiuderla sul proprio tablet non la chiude agli altri), e l'elenco
// «Galleria» con le immagini già mostrate in questa campagna.
//
// Arriva tutto dal server: l'evento «galleria» sul flusso già aperto (vista giocatori e tablet) e, all'apertura
// della pagina, /api/galleria/giocatori. Ai giocatori va la copia ridotta, mai l'originale, e mai un'immagine che
// il master non ha ancora mostrato (src/galleria.js → galleriaGiocatori).
import { h } from './dom.js';
import { apri } from './finestrella.js';
import { ridottaPerGiocatori } from '../galleria.js';

const url = (file) => `api/galleria/img/${encodeURIComponent(file)}`;
/** Quella che si fa vedere: la copia ridotta se c'è, altrimenti l'originale. */
export const urlPerGiocatori = (v) => (v ? url(ridottaPerGiocatori(v) ?? v.file) : null);

/** Lo stato della galleria per questo schermo: l'immagine mostrata adesso e l'elenco di quelle già mostrate. */
export async function statoGalleriaGiocatori() {
  const r = await fetch('api/galleria/giocatori', { cache: 'no-store' });
  if (!r.ok) throw new Error(`errore ${r.status}`);
  return r.json();
}

/**
 * La sovrapposizione a tutto schermo. Una sola alla volta: mostrarne un'altra sostituisce la precedente.
 * @returns { mostra(immagine), chiudi(), chiusa() } — `mostra(null)` la toglie («Nascondi a tutti» del master)
 */
export function sovrapposizioneGalleria({ dentro = document.body, suChiusura = null } = {}) {
  let el = null;
  let fileAperto = null;
  const chiudi = () => { el?.remove(); el = null; fileAperto = null; };
  return {
    chiudi,
    aperta: () => !!el,
    file: () => fileAperto,
    mostra(v, { daSola = false } = {}) {
      if (!v) return chiudi();
      // la stessa immagine già aperta non si ridisegna (niente sfarfallio a ogni evento)
      if (fileAperto === v.file && el) return;
      chiudi();
      fileAperto = v.file;
      el = h('div', { class: 'galleria-sovrapposizione', role: 'dialog', 'aria-label': `Immagine: ${v.nome}` },
        h('img', { src: urlPerGiocatori(v), alt: v.nome }),
        v.nome ? h('p', { class: 'galleria-didascalia' }, v.nome) : null,
        h('button', { type: 'button', class: 'btn galleria-chiudi', title: 'Chiudi l’immagine (solo sul tuo schermo)', onclick: () => { chiudi(); suChiusura?.(); } }, '✕'));
      // Esc la chiude come la ✕: resta aperta agli altri
      el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { chiudi(); suChiusura?.(); } });
      dentro.append(el);
      if (!daSola) el.querySelector('.galleria-chiudi')?.focus();
    },
  };
}

/**
 * Collega la sovrapposizione al flusso di eventi già aperto (vista giocatori o scheda sul tablet) e legge lo stato
 * iniziale. Restituisce la sovrapposizione, così la pagina può chiuderla quando se ne va.
 */
export function collegaGalleria(flusso, opzioni = {}) {
  const s = sovrapposizioneGalleria(opzioni);
  const ascolta = (f) => f?.addEventListener?.('galleria', (e) => {
    let v = null;
    try { v = JSON.parse(e.data); } catch { return; }
    s.mostra(v, { daSola: true });
  });
  ascolta(flusso);
  statoGalleriaGiocatori().then((g) => { if (g.mostrata) s.mostra(g.mostrata, { daSola: true }); }).catch(() => { /* senza server: niente galleria */ });
  return Object.assign(s, { ascolta });
}

/**
 * L'elenco «Galleria» del giocatore: le immagini già mostrate in questa campagna, la più recente in cima; un tocco
 * la apre grande. Le immagini mai mostrate non ci sono, e nemmeno quelle che il master ha tolto.
 */
export async function apriGalleriaGiocatore(dati) {
  let g = { immagini: [] };
  try { g = await statoGalleriaGiocatori(); } catch (e) { g = { immagini: [], errore: e.message }; }
  return apri('finestrella-galleria', 'Galleria', (fine) => [
    g.errore ? h('p', { class: 'riquadro attenzione' }, `Galleria non letta: ${g.errore}. Serve il collegamento al tavolo.`) : null,
    g.immagini.length
      ? h('div', { class: 'galleria-elenco' }, g.immagini.map((v) => h('button', {
        type: 'button', title: `Apri «${v.nome}»`,
        onclick: () => { fine(true); sovrapposizioneGalleria().mostra(v); },
      }, h('img', { src: url(v.mini ?? v.ridotta ?? v.file), alt: '', loading: 'lazy' }), h('span', {}, v.nome))))
      : h('p', { class: 'vuoto' }, dati?.galleria?.testi?.vuota_giocatori ?? 'Nessuna immagine mostrata finora.'),
    h('div', { class: 'riga-azioni finestrella-azioni' },
      h('button', { type: 'button', class: 'btn primario', onclick: () => fine(true) }, 'Chiudi')),
  ].filter(Boolean));
}
