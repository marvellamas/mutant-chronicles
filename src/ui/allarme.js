// Avviso grande sul tablet del giocatore (fase 2, lotto 7; 08/10): testo a tutto schermo, suono
// (data/mappa.json → audio.effetti.avviso_giocatore, Sounds/Effects/PlayerAlert.mp3) e vibrazione dove il tablet la
// supporta (data/mappa.json → tablet.vibrazione_ms), con i pulsanti dell'avviso (per esempio «Muovi il PG sulla mappa»).
// Lo usano la vista tablet (src/ui/mappa/giocatori.js) e la scheda del PG (src/ui/app.js).
// I browser suonano solo dopo un primo tocco sulla pagina: se il suono viene rifiutato compare «🔈 Tocca per attivare
// l'audio»; il primo tocco qualunque sblocca (un suono a volume zero, che serve a Safari).
import { h, svuota } from './dom.js';

/**
 * @param dati i dati delle regole (dati.mappa.tablet, dati.mappa.audio)
 * @returns { mostra({ testo, tipo: 'muovi' | 'turno' | …, azioni: [{ testo, fai, primario? }] }), chiudi(), distruggi() }
 */
export function creaAllarme(dati) {
  const T = dati.mappa.tablet;
  const file = dati.mappa.audio.effetti.avviso_giocatore ?? null;
  let timer = null;
  let sbloccato = false;
  const el = h('div', { class: 'tablet-allarme', hidden: true, role: 'alertdialog', 'aria-live': 'assertive', onclick: (e) => { if (!e.target.closest('button')) chiudi(); } });
  const audioBtn = h('button', { type: 'button', class: 'btn tablet-audio', hidden: true, onclick: () => sblocca() }, '🔈 Tocca per attivare l’audio');
  document.body.append(el, audioBtn);
  function sblocca() {
    audioBtn.hidden = true;
    if (sbloccato || !file) return;
    const a = new Audio(file);
    a.volume = 0;
    a.play().then(() => { sbloccato = true; }).catch(() => {});
  }
  const alTocco = () => { sblocca(); document.removeEventListener('pointerdown', alTocco, true); };
  document.addEventListener('pointerdown', alTocco, true);
  function suona() {
    if (!file) return;
    const a = new Audio(file);
    a.play().then(() => { sbloccato = true; }).catch((e) => { if (e?.name === 'NotAllowedError') audioBtn.hidden = false; });
  }
  function chiudi() { clearTimeout(timer); el.hidden = true; }
  function mostra({ testo, tipo = 'muovi', azioni = [] }) {
    clearTimeout(timer);
    svuota(el,
      h('div', { class: 'tablet-allarme-testo' }, h('span', { class: 'tablet-allarme-icona', 'aria-hidden': 'true' }, tipo === 'turno' ? '⚔' : '🔔'), testo),
      azioni.length ? h('div', { class: 'tablet-allarme-azioni' }, azioni.map((a) => h('button', { type: 'button', class: `btn${a.primario ? ' primario' : ''}`, onclick: () => { chiudi(); a.fai(); } }, a.testo))) : null,
      h('p', { class: 'tablet-allarme-nota' }, 'Tocca per chiudere'));
    el.className = `tablet-allarme tipo-${tipo}`;
    el.hidden = false;
    suona();
    try { navigator.vibrate?.(T.vibrazione_ms); } catch { /* niente vibrazione */ }
    timer = setTimeout(chiudi, T.avviso_durata_ms);
  }
  return {
    mostra,
    chiudi,
    aperto: () => !el.hidden,
    distruggi() { chiudi(); document.removeEventListener('pointerdown', alTocco, true); el.remove(); audioBtn.remove(); },
  };
}
