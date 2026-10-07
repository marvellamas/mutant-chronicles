// Mappa di battaglia, lotto 4 (docs/battlemap/piano.md; §12 della specifica): gesti del puntatore comuni alla vista
// master e alla vista giocatori.
//   - rotella: zoom verso il puntatore;
//   - un dito o il mouse: lo decide la pagina (spostare la vista, un token, la nebbia…), con la cattura del puntatore;
//   - due dita: zoom e spostamento insieme (src/mappa/camera.js → pizzica); il gesto in corso di un dito si annulla;
//   - doppio tocco su un punto vuoto: «Adatta allo schermo».
import { zoomVerso, fattoreRotella, pizzica } from '../../mappa/camera.js';

const DOPPIO_TOCCO_MS = 320;
const DOPPIO_TOCCO_PX = 36;

/**
 * @param el il riquadro della mappa
 * @param o { vista: data/mappa.json → vista, camera(): camera attuale, cambiaCamera(cam), adatta(),
 *   premi(e, p), muovi(e, p), rilascia(e, p) → true se il rilascio ha «colpito» qualcosa (niente doppio tocco),
 *   annulla(): il gesto di un dito si interrompe (arriva il secondo dito) }
 *   p = { x, y } in pixel del riquadro.
 * @returns { distruggi() }
 */
export function creaGesti(el, o) {
  const dita = new Map(); // pointerId → { x, y }
  let pizzico = null; // { cam, m0, d0 }
  let singolo = null; // pointerId del gesto di un dito in corso
  let ultimoTocco = null; // { t, x, y }
  const punto = (e) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const centro = () => { const [a, b] = [...dita.values()]; return { m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, d: Math.hypot(a.x - b.x, a.y - b.y) }; };

  const suRotella = (e) => {
    e.preventDefault();
    const p = punto(e);
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    o.cambiaCamera(zoomVerso(o.camera(), p.x, p.y, fattoreRotella(dy, o.vista), o.vista));
  };
  const suPremi = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = punto(e);
    dita.set(e.pointerId, p);
    try { el.setPointerCapture(e.pointerId); } catch { /* puntatore già rilasciato */ }
    if (dita.size === 2) {
      if (singolo !== null) { o.annulla?.(); singolo = null; }
      const { m, d } = centro();
      pizzico = { cam: o.camera(), m0: m, d0: d };
      return;
    }
    if (dita.size === 1) { singolo = e.pointerId; o.premi?.(e, p); }
  };
  const suMuovi = (e) => {
    const p = punto(e);
    if (dita.has(e.pointerId)) dita.set(e.pointerId, p);
    if (pizzico && dita.size === 2) {
      const { m, d } = centro();
      o.cambiaCamera(pizzica(pizzico.cam, pizzico.m0, pizzico.d0, m, d, o.vista));
      return;
    }
    o.muovi?.(e, p, singolo === e.pointerId);
  };
  const suRilascia = (e) => {
    const p = punto(e);
    const eraSingolo = singolo === e.pointerId;
    dita.delete(e.pointerId);
    if (pizzico) {
      // finito il pizzico, il dito che resta non sposta nulla finché non si alza anche lui
      if (dita.size < 2) pizzico = null;
      return;
    }
    if (!eraSingolo) return;
    singolo = null;
    const colpito = o.rilascia?.(e, p, e.type === 'pointercancel');
    if (e.type === 'pointercancel' || colpito || e.pointerType !== 'touch') return;
    const ora = performance.now();
    if (ultimoTocco && ora - ultimoTocco.t < DOPPIO_TOCCO_MS && Math.hypot(p.x - ultimoTocco.x, p.y - ultimoTocco.y) < DOPPIO_TOCCO_PX) {
      ultimoTocco = null;
      o.adatta();
    } else ultimoTocco = { t: ora, x: p.x, y: p.y };
  };
  // doppio clic del mouse: come il doppio tocco
  const suDoppioClic = (e) => { if (!o.vuoto || o.vuoto(punto(e))) o.adatta(); };

  el.addEventListener('wheel', suRotella, { passive: false });
  el.addEventListener('pointerdown', suPremi);
  el.addEventListener('pointermove', suMuovi);
  el.addEventListener('pointerup', suRilascia);
  el.addEventListener('pointercancel', suRilascia);
  el.addEventListener('dblclick', suDoppioClic);
  return {
    distruggi() {
      el.removeEventListener('wheel', suRotella);
      el.removeEventListener('pointerdown', suPremi);
      el.removeEventListener('pointermove', suMuovi);
      el.removeEventListener('pointerup', suRilascia);
      el.removeEventListener('pointercancel', suRilascia);
      el.removeEventListener('dblclick', suDoppioClic);
    },
  };
}
