// Schermo intero (lotto 166, 02/11/2026, richiesta di Marcello): al tavolo i giocatori usano i tablet e la barra del
// browser si mangia parecchio spazio in alto (la regola «in alto il minimo possibile» di CLAUDE.md). Un tocco e la pagina
// prende tutto lo schermo, un altro e si torna indietro. Una sola implementazione, usata nella scheda, nella plancia del
// Tavolo e nella mappa (quella del master e la vista dei giocatori). Adattata da un'altra app di Marcello.
//
// Le regole del pulsante:
//  - tutta la pagina (document.documentElement), non un riquadro;
//  - sempre le due forme, con e senza «webkit» (Safari e iPad), per metodi, proprietà ed eventi;
//  - se il browser non lo permette il pulsante non c'è: nasce `hidden` e compare solo con fullscreenEnabled (o
//    webkitFullscreenEnabled). Su iPhone non è supportato: lì non compare;
//  - la richiesta parte direttamente dal tocco, senza attese in mezzo: altrimenti il browser la rifiuta;
//  - l'icona segue lo stato (⛶ fuori, ✕ dentro) ascoltando l'evento di cambio, perché si esce anche con Esc o con il
//    gesto del sistema;
//  - un errore non rompe niente: avviso breve «Schermo intero non disponibile qui»;
//  - lo stato non si ricorda fra una visita e l'altra: lo schermo intero si chiede solo con un gesto.
// Lo sfondo resta quello dell'app a schermo intero: background esplicito su html e body (css/style.css).
import { h } from './dom.js';
import { avviso } from './avvisi.js';

/**
 * Che cosa offre il browser, nelle due forme. Funzione pura sul documento (nei test un documento finto).
 * @returns {{ disponibile: boolean, attivo: () => boolean, entra: () => any, esci: () => any }}
 */
export function apiSchermoIntero(doc = globalThis.document) {
  const radice = doc?.documentElement;
  const chiedi = radice?.requestFullscreen ?? radice?.webkitRequestFullscreen;
  const lascia = doc?.exitFullscreen ?? doc?.webkitExitFullscreen;
  const permesso = !!(doc?.fullscreenEnabled || doc?.webkitFullscreenEnabled);
  return {
    disponibile: typeof chiedi === 'function' && typeof lascia === 'function' && permesso,
    attivo: () => !!(doc?.fullscreenElement || doc?.webkitFullscreenElement),
    entra: () => chiedi.call(radice),
    esci: () => lascia.call(doc),
  };
}

/** Icona ed etichetta del pulsante per lo stato: ⛶ «Schermo intero» fuori, ✕ «Esci da schermo intero» dentro. */
export const statoPulsante = (attivo) => (attivo
  ? { icona: '✕', etichetta: 'Esci da schermo intero', premuto: 'true' }
  : { icona: '⛶', etichetta: 'Schermo intero', premuto: 'false' });

/** Allinea un pulsante allo stato attuale. */
function allinea(btn, api) {
  const s = statoPulsante(api.attivo());
  btn.textContent = s.icona;
  btn.setAttribute('aria-label', s.etichetta);
  btn.setAttribute('aria-pressed', s.premuto);
  btn.title = s.etichetta;
}

// Un ascolto solo per documento, che allinea tutti i pulsanti presenti: la scheda si ridisegna spesso, e un ascolto per
// pulsante resterebbe appeso a pulsanti che non ci sono più.
const ascoltati = new WeakSet();
function ascolta(doc, api) {
  if (ascoltati.has(doc)) return;
  ascoltati.add(doc);
  const tutti = () => { for (const b of doc.querySelectorAll?.('.btn-schermo-intero') ?? []) allinea(b, api); };
  doc.addEventListener('fullscreenchange', tutti);
  doc.addEventListener('webkitfullscreenchange', tutti);
}

/**
 * Il pulsante, piccolo, per l'intestazione. Nasce nascosto e resta così se il browser non permette lo schermo intero.
 * @param opz { doc, classe: classi in più, per esempio «btn-piccolo» dove la barra le usa }
 */
export function pulsanteSchermoIntero({ doc = globalThis.document, classe = '' } = {}) {
  const api = apiSchermoIntero(doc);
  const btn = h('button', { type: 'button', class: `btn tondo btn-schermo-intero${classe ? ` ${classe}` : ''}` });
  btn.hidden = true;
  if (!api.disponibile) return btn;
  btn.hidden = false;
  allinea(btn, api);
  ascolta(doc, api);
  btn.addEventListener('click', async () => {
    // la richiesta parte qui, subito, dal tocco: niente attese prima
    try {
      if (api.attivo()) await api.esci();
      else await api.entra();
    } catch {
      avviso('Schermo intero non disponibile qui', { tipo: 'errore', chiave: 'schermo-intero' });
    }
    allinea(btn, api);
  });
  return btn;
}
