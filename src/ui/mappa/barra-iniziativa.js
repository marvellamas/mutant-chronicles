// Barra dell'Iniziativa in cima alla mappa (lotto 6 di docs/battlemap/piano.md; §11 della specifica): una linea spessa
// graduata su cui i mini-token stanno al loro punteggio, dal più alto (a sinistra) al più basso. La linea si colora dal
// punteggio più alto fino a chi è di turno, il resto è grigio; al nuovo Round si riparte (ritocchi del 06/10). Per il
// master anche «Avanti» (lo stesso della plancia) e l'interruttore «Centra su attivo»; il clic su un mini-token sceglie
// il token in mappa e apre la sua mini-scheda. Nella vista giocatori la stessa barra, senza comandi. Dati da
// src/mappa/iniziativa.js.
import { h } from '../dom.js';
import { posizioneSullaScala, tacche, avanzamentoTurno } from '../../mappa/iniziativa.js';

const ALTEZZA_PILA_PX = 30;
const LINEA_PX = 24; // altezza del centro della linea: sopra, i numeri della scala

/**
 * @param barra da barraIniziativa (master) o dalla vista giocatori; null: «nessuno scontro aperto»
 * @param o { pxPerPunto, avanti?(), scegli?(voce), centra?: { attivo, cambia(v) }, vuoto?: testo senza scontro }
 */
export function barraIniziativaEl(barra, o = {}) {
  const comandi = !!o.avanti;
  if (!barra) return h('div', { class: 'mappa-iniziativa vuota' }, h('span', { class: 'nota' }, o.vuoto ?? 'Iniziativa: nessuno scontro aperto.'));
  const ampiezza = barra.massimo - barra.minimo;
  const fatto = (avanzamentoTurno(barra) * 100).toFixed(3);
  const interna = h('div', {
    class: 'iniziativa-scala-interna',
    style: `min-width: ${Math.round((ampiezza + 1) * o.pxPerPunto)}px; height: ${LINEA_PX + (barra.pile - 1) * ALTEZZA_PILA_PX + 20}px`,
  },
  // la linea: colorata fino a chi è di turno, grigia dopo
  h('div', { class: 'iniziativa-linea', style: `top: ${LINEA_PX}px; --fatto: ${fatto}%`, 'aria-hidden': 'true' }),
  tacche(barra).map((v) => {
    const x = (posizioneSullaScala(barra, v) * 100).toFixed(3);
    return [h('span', { class: 'iniziativa-tacca', style: `left: ${x}%`, 'aria-hidden': 'true' }, String(v)),
      h('span', { class: 'iniziativa-segno', style: `left: ${x}%; top: ${LINEA_PX}px`, 'aria-hidden': 'true' })];
  }),
  barra.voci.map((v) => miniToken(v, barra, o)));
  const diTurno = barra.voci.find((v) => v.diTurno);
  return h('div', { class: `mappa-iniziativa${comandi ? '' : ' senza-comandi'}`, role: 'group', 'aria-label': 'Barra dell’Iniziativa' },
    h('span', { class: 'iniziativa-round' }, h('strong', {}, `Round ${barra.round ?? '—'}`), diTurno ? h('small', {}, diTurno.nome) : null),
    h('div', { class: 'iniziativa-scala' }, interna),
    comandi ? h('span', { class: 'iniziativa-comandi' },
      h('button', { type: 'button', class: 'btn primario', title: 'Il turno passa al prossimo, che diventa il token scelto (lo stesso «Avanti» della plancia)', disabled: !barra.voci.length, onclick: () => o.avanti() }, 'Avanti'),
      o.centra ? h('button', {
        type: 'button', role: 'switch', 'aria-checked': String(!!o.centra.attivo), class: `interruttore-mappa${o.centra.attivo ? ' acceso' : ''}`,
        title: 'Al cambio di turno la mappa centra il token attivo, se è fuori vista', onclick: () => o.centra.cambia(!o.centra.attivo),
      }, h('span', { class: 'interruttore-mappa-pallino', 'aria-hidden': 'true' }), `Centra su attivo: ${o.centra.attivo ? 'sì' : 'no'}`) : null) : null);
}

/** Bordo di un mini-token (src/mappa/colori.js), come sul token in mappa: stile e classi. */
export function stileBordo(b) {
  if (!b) return { stile: '', classi: '' };
  return { stile: `--bordo: ${b.colore}; --contorno: ${b.contorno};${b.tratteggio ? ` --alterno: ${b.tratteggio};` : ''}`, classi: ` con-bordo${b.tratteggio ? ' tratteggio' : ''}${b.doppio ? ' doppio' : ''}` };
}

function miniToken(v, barra, o) {
  const x = posizioneSullaScala(barra, v.valore) * 100;
  const titolo = `${v.nome} · Iniziativa ${v.valore}${v.diTurno ? ' · di turno' : ''}${v.nascosto ? ' · nascosto ai giocatori' : ''}${o.scegli && !v.token ? ' · senza token in mappa' : ''}`;
  const corpo = v.ritratto ? h('img', { src: v.ritratto, alt: '' }) : h('span', { class: 'iniziali' }, v.iniziali);
  const sb = stileBordo(v.bordo);
  const attr = {
    class: `mini-token lato-${v.lato ?? 'nessuno'}${sb.classi}${v.diTurno ? ' di-turno' : ''}${v.nascosto ? ' nascosto' : ''}`,
    style: `left: ${x.toFixed(3)}%; top: ${LINEA_PX + v.pila * ALTEZZA_PILA_PX}px; ${sb.stile}`,
    title: titolo, 'aria-label': titolo, dataset: { chiave: v.chiave },
  };
  return o.scegli ? h('button', { type: 'button', ...attr, onclick: () => o.scegli(v) }, corpo) : h('span', attr, corpo);
}
