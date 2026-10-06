// Barra dell'Iniziativa in cima alla mappa (lotto 6 di docs/battlemap/piano.md; §11 della specifica): scala graduata con
// i mini-token sul loro valore, chi è di turno in evidenza, il Round. Per il master anche «Avanti» (lo stesso della
// plancia) e «Centra chi è di turno»; il clic su un mini-token sceglie il token in mappa e apre la sua mini-scheda. Nella
// vista giocatori la stessa barra, senza comandi. Dati da src/mappa/iniziativa.js.
import { h } from '../dom.js';
import { posizioneSullaScala, tacche } from '../../mappa/iniziativa.js';

const ALTEZZA_PILA_PX = 30;

/**
 * @param barra da barraIniziativa (master) o dalla vista giocatori; null: «nessuno scontro aperto»
 * @param o { pxPerPunto, avanti?(), scegli?(voce), centra?: { attivo, cambia(v) }, vuoto?: testo senza scontro }
 */
export function barraIniziativaEl(barra, o = {}) {
  const comandi = !!o.avanti;
  if (!barra) return h('div', { class: 'mappa-iniziativa vuota' }, h('span', { class: 'nota' }, o.vuoto ?? 'Iniziativa: nessuno scontro aperto.'));
  const ampiezza = barra.massimo - barra.minimo;
  const interna = h('div', {
    class: 'iniziativa-scala-interna',
    style: `min-width: ${Math.round((ampiezza + 1) * o.pxPerPunto)}px; height: ${barra.pile * ALTEZZA_PILA_PX + 16}px`,
  },
  tacche(barra).map((v) => h('span', { class: 'iniziativa-tacca', style: `left: ${(posizioneSullaScala(barra, v) * 100).toFixed(3)}%` }, String(v))),
  barra.voci.map((v) => miniToken(v, barra, o)));
  const diTurno = barra.voci.find((v) => v.diTurno);
  return h('div', { class: `mappa-iniziativa${comandi ? '' : ' senza-comandi'}`, role: 'group', 'aria-label': 'Barra dell’Iniziativa' },
    h('span', { class: 'iniziativa-round' }, h('strong', {}, `Round ${barra.round ?? '—'}`), diTurno ? h('small', {}, diTurno.nome) : null),
    h('div', { class: 'iniziativa-scala' }, interna),
    comandi ? h('span', { class: 'iniziativa-comandi' },
      h('button', { type: 'button', class: 'btn primario', title: 'Il turno passa al prossimo (lo stesso «Avanti» della plancia)', disabled: !barra.voci.length, onclick: () => o.avanti() }, 'Avanti'),
      o.centra ? h('label', { class: 'iniziativa-centra', title: 'Al cambio di turno la mappa centra il token di turno, se è fuori vista' },
        h('input', { type: 'checkbox', checked: o.centra.attivo, onchange: (e) => o.centra.cambia(e.target.checked) }), ' Centra di turno') : null) : null);
}

function miniToken(v, barra, o) {
  const x = posizioneSullaScala(barra, v.valore) * 100;
  const titolo = `${v.nome} · Iniziativa ${v.valore}${v.diTurno ? ' · di turno' : ''}${v.nascosto ? ' · nascosto ai giocatori' : ''}${o.scegli && !v.token ? ' · senza token in mappa' : ''}`;
  const corpo = v.ritratto ? h('img', { src: v.ritratto, alt: '' }) : h('span', { class: 'iniziali' }, v.iniziali);
  const attr = {
    class: `mini-token lato-${v.lato ?? 'nessuno'}${v.diTurno ? ' di-turno' : ''}${v.nascosto ? ' nascosto' : ''}`,
    style: `left: ${x.toFixed(3)}%; top: ${v.pila * ALTEZZA_PILA_PX}px`,
    title: titolo, 'aria-label': titolo, dataset: { chiave: v.chiave },
  };
  return o.scegli ? h('button', { type: 'button', ...attr, onclick: () => o.scegli(v) }, corpo) : h('span', attr, corpo);
}
