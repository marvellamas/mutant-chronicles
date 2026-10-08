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
 * @param o { pxPerPunto, avanti?(), fine?(): «Fine scontro» (08/10, con conferma), indietro?(), puoIndietro?: anteprima di «Indietro» o null, reimposta?(), scegli?(voce),
 *   centra?: { attivo, cambia(v) }, vuoto?: testo senza scontro, zero?: data/mappa.json → pv_zero (icone a 0 PV),
 *   daTirare?: { nomi: [...], chiedi() } partecipanti ancora senza Iniziativa (solo master) }
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
      // «Indietro» (07/10): annulla l'ultimo «Avanti» (anche Maiusc+clic su «Avanti»); solo master
      o.indietro ? h('button', { type: 'button', class: 'btn', disabled: !o.puoIndietro, title: o.puoIndietro ? `Annulla l’ultimo ${o.puoIndietro.iniziativa ? '«Reimposta Iniziativa»' : '«Avanti»'}: torna il turno di ${o.puoIndietro.diTurno?.nome ?? '—'}${o.puoIndietro.cambiaRound ? `, Round ${o.puoIndietro.round}` : ''} (Maiusc+clic su «Avanti»)` : 'Nessun «Avanti» da annullare' , onclick: () => o.indietro() }, '◀ Indietro') : null,
      // difetto del test del 07/10: chi è ancora senza Iniziativa resta fuori dalla linea; il pulsante apre la finestra
      o.daTirare?.nomi.length ? h('button', { type: 'button', class: 'btn primario', title: `Senza Iniziativa, fuori dall’ordine: ${o.daTirare.nomi.join(', ')}`, onclick: () => o.daTirare.chiedi() }, `Iniziativa… (${o.daTirare.nomi.length} senza)`) : null,
      // «Reimposta Iniziativa» (07/10): per tutti o per uno solo, la stessa della plancia
      o.reimposta ? h('button', { type: 'button', class: 'btn', title: 'Reimposta Iniziativa: ritira per tutti (con conferma) o per uno solo (ritiro o valore a mano); chi è di turno resta di turno; «Indietro» la annulla', disabled: !barra.voci.length, onclick: () => o.reimposta() }, '⟳ Iniziativa') : null,
      h('button', { type: 'button', class: 'btn primario', title: 'Il turno passa al prossimo, che diventa il token scelto (lo stesso «Avanti» della plancia; Maiusc+clic: «Indietro»)', disabled: !barra.voci.length, onclick: (e) => (e.shiftKey && o.indietro ? o.indietro() : o.avanti()) }, 'Avanti'),
      // 08/10: «Fine scontro» anche dalla mappa (con conferma): la musica si ferma, i tablet tornano alla scheda
      o.fine ? h('button', { type: 'button', class: 'btn btn-fine-scontro', title: 'Chiude lo scontro (con conferma), come «Fine scontro» della plancia: il file passa in scontri/archivio/, la musica si ferma, i tablet tornano alla scheda', onclick: () => o.fine() }, '⏹ Fine scontro') : null,
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
  const titolo = `${v.nome} · Iniziativa ${v.valore}${v.aZero ? ' · a 0 PV' : ''}${v.diTurno ? ' · di turno' : ''}${v.nascosto ? ' · nascosto ai giocatori' : ''}${o.scegli && !v.token ? ' · senza token in mappa' : ''}`;
  const corpo = v.ritratto ? h('img', { src: v.ritratto, alt: '' }) : h('span', { class: 'iniziali' }, v.iniziali);
  // ritocchi del 07/10: a 0 PV, piccolo, il teschio (nemici) o la croce rossa (PG), come sul token
  const zero = v.aZero && o.zero ? h('img', { class: 'icona-zero', src: v.lato === 'pg' ? o.zero.pg : o.zero.nemico, alt: '' }) : null;
  const sb = stileBordo(v.bordo);
  const attr = {
    class: `mini-token lato-${v.lato ?? 'nessuno'}${sb.classi}${v.diTurno ? ' di-turno' : ''}${v.nascosto ? ' nascosto' : ''}`,
    style: `left: ${x.toFixed(3)}%; top: ${LINEA_PX + v.pila * ALTEZZA_PILA_PX}px; ${sb.stile}`,
    title: titolo, 'aria-label': titolo, dataset: { chiave: v.chiave },
  };
  const el = o.scegli ? h('button', { type: 'button', ...attr, onclick: () => o.scegli(v) }, corpo, zero) : h('span', attr, corpo, zero);
  // 07/10: la barretta dei PV come sui token, sul fondo del mini-token e sopra il bordo, larga quanto il mini-token
  // (fuori dall'elemento, che taglia il ritratto); misure e colori da data/mappa.json → pv_token (variabili CSS)
  if (!(v.pv?.massimo > 0) || o.pv === false) return el;
  const quota = Math.max(0, Math.min(1, v.pv.attuali / v.pv.massimo));
  return [el, h('span', { class: 'pv-barretta', 'aria-hidden': 'true', style: `left: ${x.toFixed(3)}%; top: ${LINEA_PX + v.pila * ALTEZZA_PILA_PX}px; --quota: ${quota}` })];
}
