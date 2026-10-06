// Mappa di battaglia, lotto 5 (docs/battlemap/piano.md; §12 della specifica): menu con il clic destro sul token, nella
// vista master. Voci: Passo / Corri / Scatta (l'area raggiungibile), Annulla ultimo movimento, Nascondi / Mostra,
// Carta, Togli dalla mappa. Si chiude con un clic altrove, Esc o scegliendo una voce. Il menu completo arriva nel lotto 7.
import { h } from '../dom.js';

let aperto = null;

export function chiudiMenuToken() {
  aperto?.remove();
  aperto = null;
  document.removeEventListener('pointerdown', fuori, true);
}
function fuori(e) { if (aperto && !aperto.contains(e.target)) chiudiMenuToken(); }

/**
 * Apre il menu in (x, y) dentro `contenitore` (pixel del contenitore).
 * @param voci [{ testo, azione, disabilitata?, scelta?, titolo? } | null (separatore)]
 */
export function apriMenuToken(contenitore, x, y, titolo, voci) {
  chiudiMenuToken();
  // il menu sta dentro il riquadro della mappa: i suoi eventi del puntatore non devono arrivare ai gesti della mappa
  // (un clic su una voce sposterebbe anche il token scelto)
  const ferma = (e) => e.stopPropagation();
  aperto = h('div', {
    class: 'mappa-menu', role: 'menu', 'aria-label': `Menu di ${titolo}`,
    onpointerdown: ferma, onpointerup: ferma, onpointermove: ferma, onwheel: ferma, ondblclick: ferma,
    oncontextmenu: (e) => { e.preventDefault(); e.stopPropagation(); },
  },
    h('p', { class: 'mappa-menu-titolo' }, titolo),
    voci.map((v) => (v ? h('button', {
      type: 'button', role: 'menuitem', class: v.scelta ? 'scelta' : null, disabled: !!v.disabilitata, title: v.titolo ?? null,
      onclick: () => { chiudiMenuToken(); v.azione(); },
    }, v.testo) : h('hr', {}))));
  contenitore.append(aperto);
  // dentro il riquadro, anche vicino ai bordi
  const r = aperto.getBoundingClientRect();
  const lc = contenitore.clientWidth, ac = contenitore.clientHeight;
  aperto.style.left = `${Math.max(4, Math.min(x, lc - r.width - 4))}px`;
  aperto.style.top = `${Math.max(4, Math.min(y, ac - r.height - 4))}px`;
  setTimeout(() => document.addEventListener('pointerdown', fuori, true), 0);
  aperto.querySelector('button:not([disabled])')?.focus({ preventScroll: true });
}

export const menuAperto = () => !!aperto;
