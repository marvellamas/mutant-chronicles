// Barra «Indietro / Avanti» dei passi (wizard e Sali di livello). Compare in cima a ogni passo
// e, identica, in fondo solo quando il passo è più alto dello schermo: nei passi corti due barre
// a pochi centimetri sembrerebbero un errore, mentre quella in cima sta sempre nello stesso posto.
// Su una riga anche a 375 px: le etichette lunghe hanno una forma corta e il motivo del blocco
// si tronca (resta intero nel title e nel testo per i lettori di schermo).
import { h } from './dom.js';

/**
 * @param {object} o
 * @param {{etichetta, onclick}} o.indietro
 * @param {{etichetta, corta?, onclick, disabilitato?: boolean, motivo?: string|null, primario?: boolean}} o.avanti
 * @param {{etichetta, corta?, onclick}|null} [o.extra] terzo pulsante (Esci senza salvare)
 * @param {'cima'|'fondo'} o.posizione
 */
export function barraPassi({ indietro, avanti, extra = null, posizione }) {
  const etichetta = (lunga, corta) => (corta
    ? [h('span', { class: 'etichetta-lunga' }, lunga), h('span', { class: 'etichetta-corta', 'aria-hidden': 'true' }, corta)]
    : lunga);
  return h(posizione === 'cima' ? 'nav' : 'footer', {
    class: `barra-passi barra-${posizione} no-stampa`,
    'aria-label': posizione === 'cima' ? 'Navigazione fra i passi' : null,
  },
  h('button', { type: 'button', class: 'btn', onclick: indietro.onclick }, indietro.etichetta),
  h('small', { class: 'motivo', title: avanti.motivo ?? null }, avanti.motivo ?? ''),
  h('button', {
    type: 'button', class: `btn${avanti.primario === false ? '' : ' primario'}`, disabled: !!avanti.disabilitato,
    title: avanti.motivo ?? null, 'aria-label': avanti.corta ? avanti.etichetta : null, onclick: avanti.onclick,
  }, etichetta(avanti.etichetta, avanti.corta)),
  extra ? h('button', { type: 'button', class: 'btn', 'aria-label': extra.corta ? extra.etichetta : null, onclick: extra.onclick }, etichetta(extra.etichetta, extra.corta)) : null);
}

let osservatore = null;
let suRidimensiona = null;

/**
 * Mostra la barra in fondo solo se la pagina, senza di essa, è più alta della finestra. Si
 * ricontrolla quando il contenuto cambia altezza (dettagli aperti, immagini) o la finestra cambia.
 */
export function barraFondoSeServe(fondo, contenitore) {
  osservatore?.disconnect();
  if (suRidimensiona) window.removeEventListener('resize', suRidimensiona);
  const controlla = () => {
    if (!fondo.isConnected) return;
    const propria = fondo.hidden ? 0 : fondo.getBoundingClientRect().height + parseFloat(getComputedStyle(fondo).marginTop || '0');
    fondo.hidden = document.documentElement.scrollHeight - propria <= window.innerHeight;
  };
  osservatore = new ResizeObserver(controlla);
  osservatore.observe(contenitore);
  suRidimensiona = controlla;
  window.addEventListener('resize', controlla);
  controlla();
}
