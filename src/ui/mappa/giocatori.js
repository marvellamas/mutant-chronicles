// Mappa di battaglia, lotto 4 (docs/battlemap/piano.md; §3 della specifica): vista giocatori, #/mappa/giocatori, da
// aprire sul televisore, sul proiettore o su un tablet. Legge solo la scena filtrata dal server
// (/api/vista-giocatori: src/mappa/vista.js): mappa ridotta, griglia, token visibili con l'anello dei PV, il token di
// turno, nebbia piena; in alto il nome della scena, il Round e chi è di turno. Nessun comando del master: solo zoom
// (rotella, due dita), spostamento (trascinamento) e doppio tocco o doppio clic per «Adatta allo schermo».
// Si aggiorna da sola; la scena è quella scelta dal master o quella collegata allo scontro aperto.
// Lotto 6: sotto il titolo la barra dell'Iniziativa del master (./barra-iniziativa.js), senza comandi e già filtrata dal
// server: niente token nascosti né sotto la nebbia.
import { h, svuota } from '../dom.js';
import { cameraIniziale, sposta, adatta, schermoDaMappa, rettangoloVisibile } from '../../mappa/camera.js';
import { dimensioniMappa, lineeVisibili } from '../../mappa/griglia.js';
import { daBase64 } from '../../mappa/celle.js';
import { trattiCoperti } from '../../mappa/nebbia.js';
import { chiaveRif } from '../../mappa/token.js';
import { creaTela } from './canvas.js';
import { creaGesti } from './gesti.js';
import { disegnaToken, coloriMappa, creaImmagini } from './disegno-token.js';
import { barraIniziativaEl } from './barra-iniziativa.js';

const INTERVALLO_MS = 2000;

/**
 * @param ctx { dati }
 * @returns {() => void} chiude la pagina
 */
export function renderGiocatori(radice, ctx) {
  const V = ctx.dati.mappa.vista;
  const st = { vista: null, firma: null, cam: cameraIniziale(), immagine: null, fileImmagine: null, chiusa: false, errore: null, adattata: null, toccata: false, trascina: null };
  const el = {};
  el.titolo = h('strong', { class: 'giocatori-titolo' }, 'Mappa');
  el.turno = h('span', { class: 'giocatori-turno', 'aria-live': 'polite' });
  el.stato = h('span', { class: 'nota giocatori-stato' });
  el.schermo = h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Schermo intero', onclick: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()) }, 'Schermo intero');
  el.riquadro = h('div', { class: 'mappa-tela giocatori-tela', 'aria-label': 'Mappa dei giocatori: due dita o rotella per lo zoom, trascina per spostarti, doppio tocco per vedere tutto' });
  el.messaggio = h('p', { class: 'giocatori-messaggio', hidden: true });
  el.iniziativa = h('div', { class: 'mappa-iniziativa-posto', hidden: true });
  el.riquadro.append(el.messaggio);
  svuota(radice, h('section', { class: 'mappa-pagina giocatori-pagina' },
    h('header', { class: 'giocatori-barra' }, el.titolo, el.turno, el.stato, el.schermo), el.iniziativa, el.riquadro));

  const immagine = creaImmagini(() => tela.richiedi(['sopra']));
  const tela = creaTela(el.riquadro, {
    fondo: (c, info) => {
      const s = st.vista;
      if (!s) return;
      const { larghezza, altezza } = dimensioniMappa(s);
      c.save();
      c.translate(st.cam.ox, st.cam.oy);
      c.scale(st.cam.scala, st.cam.scala);
      if (st.immagine) { c.imageSmoothingEnabled = st.cam.scala < 2; c.drawImage(st.immagine, 0, 0, larghezza, altezza); } else {
        c.fillStyle = getComputedStyle(el.riquadro).getPropertyValue('--mappa-vuota').trim() || '#ddd';
        c.fillRect(0, 0, larghezza, altezza);
      }
      c.restore();
      const g = s.griglia;
      const linee = lineeVisibili(g, rettangoloVisibile(st.cam, info.larghezza, info.altezza), st.cam.scala, V);
      if (!linee) return;
      c.save();
      c.globalAlpha = g.opacita;
      c.strokeStyle = g.colore;
      c.lineWidth = 1;
      c.beginPath();
      const ya = schermoDaMappa(st.cam, 0, linee.y0).y, yb = schermoDaMappa(st.cam, 0, linee.y1).y;
      const xa = schermoDaMappa(st.cam, linee.x0, 0).x, xb = schermoDaMappa(st.cam, linee.x1, 0).x;
      for (const x of linee.xs) { const sx = Math.round(schermoDaMappa(st.cam, x, 0).x) + 0.5; c.moveTo(sx, ya); c.lineTo(sx, yb); }
      for (const y of linee.ys) { const sy = Math.round(schermoDaMappa(st.cam, 0, y).y) + 0.5; c.moveTo(xa, sy); c.lineTo(xb, sy); }
      c.stroke();
      c.restore();
    },
    // §5: per i giocatori la nebbia è piena
    aree: (c, info) => disegnaNebbia(c, info, 1),
    sopra: (c) => {
      const s = st.vista;
      if (!s) return;
      const pezzi = new Map(s.token.filter((t) => t.info).map((t) => [chiaveRif(t.rif), { ...t.info, ritratto: t.info.immagine, pv: t.info.pv === null ? null : { attuali: t.info.pv, massimo: 1 }, stati: [] }]));
      disegnaToken(c, { scena: s, cam: st.cam, pezzi, colori: coloriMappa(el.riquadro), immagine, bordo: (p) => p.bordo ?? null, alone: ctx.dati.mappa.colori.alone_turno });
    },
  });

  function disegnaNebbia(c, info, opacita) {
    const s = st.vista;
    if (!s) return;
    const g = s.griglia;
    const r = rettangoloVisibile(st.cam, info.larghezza, info.altezza);
    const q = g.q_px;
    const limiti = { x0: Math.floor((r.x0 - g.scosto_x) / q), x1: Math.ceil((r.x1 - g.scosto_x) / q), y0: Math.floor((r.y0 - g.scosto_y) / q), y1: Math.ceil((r.y1 - g.scosto_y) / q) };
    const tratti = trattiCoperti(daBase64(s.nebbia.coperti), g.colonne, g.righe, limiti);
    if (!tratti.length) return;
    c.save();
    c.globalAlpha = opacita;
    c.fillStyle = getComputedStyle(el.riquadro).getPropertyValue('--mappa-nebbia').trim() || '#111';
    c.beginPath();
    for (const [y, xa, xb] of tratti) {
      const a = schermoDaMappa(st.cam, g.scosto_x + xa * q, g.scosto_y + y * q);
      const b = schermoDaMappa(st.cam, g.scosto_x + xb * q, g.scosto_y + (y + 1) * q);
      // mezzo pixel in più: niente fessure fra righe vicine
      c.rect(Math.floor(a.x), Math.floor(a.y), Math.ceil(b.x - a.x) + 1, Math.ceil(b.y - a.y) + 1);
    }
    c.fill();
    c.restore();
  }

  // data-zoom e data-origine: lo zoom attuale, per le prove (come data-disegno-ms di ./canvas.js)
  const segnaCamera = () => { el.riquadro.dataset.zoom = String(Math.round(st.cam.scala * 1000) / 10); el.riquadro.dataset.origine = `${Math.round(st.cam.ox)},${Math.round(st.cam.oy)}`; };
  const cambiaCamera = (cam) => { st.cam = cam; st.toccata = true; segnaCamera(); tela.richiedi(); };
  const adattaSchermo = () => {
    if (!st.vista) return;
    const { larghezza, altezza } = dimensioniMappa(st.vista);
    const d = tela.dimensioni();
    st.cam = adatta(larghezza, altezza, d.larghezza, d.altezza, V);
    segnaCamera();
    st.toccata = false;
    tela.richiedi();
  };
  const gesti = creaGesti(el.riquadro, {
    vista: V, camera: () => st.cam, cambiaCamera, adatta: adattaSchermo,
    premi: (e, p) => { st.trascina = p; el.riquadro.classList.add('trascina'); },
    muovi: (e, p, mio) => { if (!mio || !st.trascina) return; cambiaCamera(sposta(st.cam, p.x - st.trascina.x, p.y - st.trascina.y)); st.trascina = p; },
    rilascia: () => { st.trascina = null; el.riquadro.classList.remove('trascina'); return false; },
    annulla: () => { st.trascina = null; el.riquadro.classList.remove('trascina'); },
  });
  // se la finestra cambia misura e nessuno ha toccato la vista, si riadatta
  const suMisura = () => { if (!st.toccata) adattaSchermo(); };
  window.addEventListener('resize', suMisura);

  const messaggio = (t) => { el.messaggio.textContent = t ?? ''; el.messaggio.hidden = !t; };
  async function usa(corpo) {
    st.vista = corpo.scena;
    const barra = corpo.scena?.iniziativa ?? null;
    el.iniziativa.hidden = !barra;
    svuota(el.iniziativa, barra ? barraIniziativaEl(barra, { pxPerPunto: V.barra.iniziativa_px_per_punto }) : null);
    if (!st.vista) {
      el.titolo.textContent = 'Mappa';
      el.turno.textContent = '';
      messaggio(corpo.motivo ?? 'Nessuna mappa in gioco.');
      tela.richiedi();
      return;
    }
    messaggio(null);
    document.title = `${st.vista.nome} · Giocatori · Mutant`;
    el.titolo.textContent = st.vista.nome;
    const t = st.vista.turno;
    el.turno.textContent = t ? [t.round ? `Round ${t.round}` : null, t.nome ? `di turno: ${t.nome}` : null].filter(Boolean).join(' · ') : '';
    const file = st.vista.mappa?.file ?? null;
    if (file !== st.fileImmagine) {
      st.fileImmagine = file;
      st.immagine?.close?.();
      st.immagine = null;
      if (file) {
        try { const r = await fetch(`api/mappe/${encodeURIComponent(file)}`); if (r.ok) st.immagine = await createImageBitmap(await r.blob()); } catch { /* resta il fondo neutro */ }
      }
    }
    // scena nuova o mappa di altre misure: si riparte da «Adatta allo schermo»
    const chiave = `${st.vista.id}|${st.vista.griglia.colonne}x${st.vista.griglia.righe}|${file}`;
    if (chiave !== st.adattata) { st.adattata = chiave; adattaSchermo(); } else tela.richiedi();
  }

  let inCorso = false;
  async function aggiorna() {
    if (st.chiusa || inCorso) return;
    inCorso = true;
    try {
      const r = await fetch(`api/vista-giocatori${st.firma ? `?firma=${st.firma}` : ''}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`errore ${r.status}`);
      const corpo = await r.json();
      st.errore = null;
      el.stato.textContent = '';
      if (!corpo.invariata) { st.firma = corpo.firma; await usa(corpo); }
    } catch (e) {
      // collegamento perso: la mappa resta com'era, con l'avviso (§13)
      st.errore = e.message;
      el.stato.textContent = 'Collegamento con il master perso: riprovo…';
    } finally { inCorso = false; }
  }
  aggiorna();
  const giro = setInterval(aggiorna, INTERVALLO_MS);
  // lo schermo del tavolo non si spegne mentre la vista è aperta (§13), dove il browser lo permette
  let blocco = null;
  const tieniAcceso = async () => { try { blocco = await navigator.wakeLock?.request('screen'); } catch { /* non concesso */ } };
  const suVisibile = () => { if (document.visibilityState === 'visible') tieniAcceso(); };
  tieniAcceso();
  document.addEventListener('visibilitychange', suVisibile);

  return () => {
    st.chiusa = true;
    clearInterval(giro);
    gesti.distruggi();
    tela.distruggi();
    window.removeEventListener('resize', suMisura);
    document.removeEventListener('visibilitychange', suVisibile);
    blocco?.release?.().catch(() => {});
    st.immagine?.close?.();
  };
}
