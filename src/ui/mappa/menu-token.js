// Mappa di battaglia: menu del clic destro (o della pressione lunga sul tablet) su token, porta, template e punto vuoto.
// Riorganizzato il 07/10/2026 (richiesta di Marcello): riga rapida a pulsanti in cima, gruppi con intestazione, la
// scorciatoia a destra di ogni voce, «Opzioni» in un sottomenu che si apre al passaggio o al clic. La composizione
// (ordine, voci utilizzabili, gruppi vuoti, ripetizioni) sta in src/mappa/menu.js e in data/mappa.json → menu.
// Si chiude con un clic altrove, Esc o scegliendo una voce. Vicino ai bordi si apre verso sinistra o verso l'alto.
import { h } from '../dom.js';
import { posizioneMenu } from '../../mappa/menu.js';

let aperto = null;
let sotto = null;

export function chiudiMenuToken() {
  sotto?.remove();
  sotto = null;
  aperto?.remove();
  aperto = null;
  document.removeEventListener('pointerdown', fuori, true);
}
function fuori(e) { if (aperto && !aperto.contains(e.target) && !sotto?.contains(e.target)) chiudiMenuToken(); }

// il menu sta dentro il riquadro della mappa: i suoi eventi del puntatore non devono arrivare ai gesti della mappa
// (un clic su una voce sposterebbe anche il token scelto)
const ferma = (e) => e.stopPropagation();
const attributiComuni = {
  onpointerdown: ferma, onpointerup: ferma, onpointermove: ferma, onwheel: ferma, ondblclick: ferma,
  oncontextmenu: (e) => { e.preventDefault(); e.stopPropagation(); },
};

/** Una voce: testo a sinistra, scorciatoia a destra; spenta con il motivo nel suggerimento. */
function voceEl(v) {
  return h('button', {
    type: 'button', role: 'menuitem', class: `mappa-menu-voce${v.scelta ? ' scelta' : ''}${v.pericolo ? ' pericolo' : ''}`,
    disabled: !!v.disabilitata, title: v.titolo ?? null, 'aria-checked': v.scelta === undefined ? null : String(!!v.scelta),
    onclick: () => { chiudiMenuToken(); v.azione(); },
  }, h('span', { class: 'mappa-menu-testo' }, v.testo), v.tasto ? h('kbd', { class: 'mappa-menu-tasto' }, v.tasto) : null);
}

/**
 * Apre il menu in (x, y) dentro `contenitore` (pixel del contenitore).
 * @param menu { rapida: [voce], gruppi: [{ titolo, voci }], opzioni: [voce] } (src/mappa/menu.js → componiMenu)
 * @param o { altezza: altezza minima delle voci in px (data/mappa.json → menu.altezza_voce_px) }
 */
export function apriMenuToken(contenitore, x, y, titolo, menu, o = {}) {
  chiudiMenuToken();
  const { rapida = [], gruppi = [], opzioni = [] } = menu;
  const apriOpzioni = (pulsante) => {
    if (sotto) return;
    sotto = h('div', { class: 'mappa-menu mappa-sottomenu', role: 'menu', 'aria-label': 'Opzioni', style: o.altezza ? `--voce-menu: ${o.altezza}px` : null, ...attributiComuni }, opzioni.map(voceEl));
    contenitore.append(sotto);
    // a destra del menu, alla riga di «Opzioni»; se non c'è posto, a sinistra
    const m = aperto.getBoundingClientRect(), b = pulsante.getBoundingClientRect(), c = contenitore.getBoundingClientRect();
    const w = sotto.offsetWidth, hh = sotto.offsetHeight;
    const destra = m.right - c.left;
    const left = destra + w + 4 <= contenitore.clientWidth ? destra - 2 : m.left - c.left - w + 2;
    const pos = posizioneMenu(left, b.top - c.top, w, hh, contenitore.clientWidth, contenitore.clientHeight);
    sotto.style.left = `${Math.max(4, Math.min(left, contenitore.clientWidth - w - 4))}px`; // a destra o a sinistra, già scelto
    sotto.style.top = `${pos.top}px`;
    pulsante.setAttribute('aria-expanded', 'true');
  };
  const chiudiOpzioni = (pulsante) => { sotto?.remove(); sotto = null; pulsante?.setAttribute('aria-expanded', 'false'); };
  const pulsanteOpzioni = opzioni.length ? h('button', {
    type: 'button', class: 'mappa-menu-voce mappa-menu-opzioni', 'aria-haspopup': 'menu', 'aria-expanded': 'false', title: 'Voci usate di rado',
    // aperto dal passaggio del mouse, il clic che segue lo lascia aperto (prima lo richiudeva); poi il clic alterna
    onclick: (e) => { if (sotto?.dataset.da === 'passaggio') { sotto.dataset.da = 'clic'; return; } if (sotto) chiudiOpzioni(e.currentTarget); else { apriOpzioni(e.currentTarget); sotto.dataset.da = 'clic'; } },
    onpointerenter: (e) => { if (e.pointerType === 'mouse' && !sotto) { apriOpzioni(e.currentTarget); sotto.dataset.da = 'passaggio'; } },
  }, h('span', { class: 'mappa-menu-testo' }, 'Opzioni'), h('span', { class: 'mappa-menu-tasto', 'aria-hidden': 'true' }, '▸')) : null;
  aperto = h('div', {
    class: 'mappa-menu', role: 'menu', 'aria-label': `Menu di ${titolo}`,
    style: o.altezza ? `--voce-menu: ${o.altezza}px` : null, ...attributiComuni,
    // col mouse su un'altra voce il sottomenu delle opzioni si chiude
    onpointerover: (e) => { if (sotto && e.pointerType === 'mouse' && !e.target.closest('.mappa-menu-opzioni')) chiudiOpzioni(pulsanteOpzioni); },
  },
  h('p', { class: 'mappa-menu-titolo' }, titolo),
  rapida.length ? h('div', { class: 'mappa-menu-rapida', role: 'group', 'aria-label': 'Movimento rapido' }, rapida.map((v) => h('button', {
    type: 'button', class: `btn btn-piccolo${v.scelta ? ' scelto' : ''}`, disabled: !!v.disabilitata, title: v.titolo ?? null, 'aria-pressed': String(!!v.scelta),
    onclick: () => { chiudiMenuToken(); v.azione(); },
  }, v.testo))) : null,
  gruppi.map((g) => h('div', { class: 'mappa-menu-gruppo', role: 'group', 'aria-label': g.titolo },
    h('p', { class: 'mappa-menu-intestazione' }, g.titolo), g.voci.map(voceEl))),
  pulsanteOpzioni ? h('div', { class: 'mappa-menu-gruppo mappa-menu-piede' }, pulsanteOpzioni) : null);
  contenitore.append(aperto);
  // vicino al bordo verso sinistra o verso l'alto, mai fuori dal riquadro
  const pos = posizioneMenu(x, y, aperto.offsetWidth, aperto.offsetHeight, contenitore.clientWidth, contenitore.clientHeight);
  aperto.style.left = `${pos.left}px`;
  aperto.style.top = `${pos.top}px`;
  setTimeout(() => document.addEventListener('pointerdown', fuori, true), 0);
  aperto.querySelector('button:not([disabled])')?.focus({ preventScroll: true });
}

export const menuAperto = () => !!aperto;
