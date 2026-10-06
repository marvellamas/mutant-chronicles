// Mappa di battaglia, lotto 3 (docs/battlemap/piano.md; §7 della specifica): disegno dei token sul livello «sopra».
// Ritratto del PG o cerchio con le iniziali; veicoli come rettangoli; bordo dai colori del 06/10 (src/mappa/colori.js:
// PG pieno col suo colore, nemici tratteggiati nero e colore del tipo, alleati doppio grigio-petrolio, veicoli col colore
// del proprietario), sempre con un contorno sottile scuro o chiaro; anello dei PV; piccole sigle degli Stati; a 0 PV in
// grigio; il token di turno con un alone bianco luminoso (non si confonde col giallo dei PG); i token nascosti (solo
// nella vista master) trasparenti.
import { schermoDaMappa } from '../../mappa/camera.js';
import { dimensioni, chiaveRif } from '../../mappa/token.js';

const SOGLIA_TESTO_PX = 16; // sotto questo lato in pixel di schermo niente testo né sigle

/** Colori dai token CSS (css/palette.css, css/style.css), letti una volta per disegno. */
export function coloriMappa(el) {
  const cs = getComputedStyle(el);
  const v = (n, d) => cs.getPropertyValue(n).trim() || d;
  return {
    pg: v('--accento', '#c06a2b'), alleato: v('--lato-alleato', '#0b7377'), avversario: v('--lato-avversario', '#a3238f'),
    pv: v('--pv', '#c8102e'), traccia: v('--mappa-traccia-pv', 'rgba(0,0,0,0.35)'), turno: v('--mappa-turno', '#ffd23f'),
    fondo: v('--superficie', '#fff'), testo: v('--testo', '#111'), selezione: v('--mappa-selezione', '#2b8cff'),
  };
}

/** Immagini dei ritratti (data URL), caricate una volta: `immagine(src)` restituisce l'elemento pronto o null. */
export function creaImmagini(quandoPronta) {
  const cache = new Map();
  return (src) => {
    if (!src) return null;
    let img = cache.get(src);
    if (!img) {
      img = new Image();
      img.onload = quandoPronta;
      img.src = src;
      cache.set(src, img);
    }
    return img.complete && img.naturalWidth ? img : null;
  };
}

const sigla = (nome) => String(nome ?? '?').replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';

/**
 * Disegna i token della scena. `pezzi`: Map(chiave del rif → pezzo, src/mappa/partecipanti.js); `trascina`: il token
 * spostato ora ({ id, q }) o null; `selezionato`: id del token scelto.
 */
export function disegnaToken(c, { scena, cam, pezzi, colori, immagine, selezionato = null, trascina = null, bordo = () => null, alone = '#ffffff' }) {
  const g = scena.griglia;
  const qs = g.q_px * cam.scala;
  const ordinati = [...scena.token].sort((a, b) => (a.id === selezionato) - (b.id === selezionato) || (a.id === trascina?.id) - (b.id === trascina?.id));
  for (const t of ordinati) {
    const q = trascina?.id === t.id ? trascina.q : t.q;
    const [w, h] = dimensioni(t.ingombro);
    const a = schermoDaMappa(cam, g.scosto_x + q[0] * g.q_px, g.scosto_y + q[1] * g.q_px);
    const box = { x: a.x, y: a.y, w: w * qs, h: h * qs };
    const p = pezzi.get(chiaveRif(t.rif)) ?? null;
    disegnaUno(c, { t, p, box, colori, immagine, qs, scelto: t.id === selezionato, inMano: trascina?.id === t.id, b: p ? bordo(p) : null, alone });
  }
}

function disegnaUno(c, { t, p, box, colori, immagine, qs, scelto, inMano, b, alone }) {
  const colore = b?.colore ?? colori[p?.lato] ?? colori.testo;
  const veicolo = t.rif.tipo === 'veicolo';
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const r = Math.min(box.w, box.h) / 2 * 0.88;
  const bordo = Math.max(2, Math.min(6, r * 0.14));
  const testo = Math.min(box.w, box.h) >= SOGLIA_TESTO_PX;
  c.save();
  if (t.nascosto) c.globalAlpha = 0.45;
  if (inMano) c.globalAlpha *= 0.75;
  // alone del turno (A.73: Iniziativa della plancia; un veicolo all'Iniziativa del conducente, A.105): bianco luminoso
  // su un anello scuro, così si vede anche su una mappa chiara e non si confonde col giallo di un PG
  if (p?.diTurno) {
    c.save();
    c.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    c.lineWidth = bordo * 2.8;
    forma(c, veicolo, box, cx, cy, r + bordo * 1.5);
    c.stroke();
    c.shadowColor = alone;
    c.shadowBlur = Math.max(10, r * 0.8);
    c.strokeStyle = alone;
    c.lineWidth = bordo * 1.4;
    forma(c, veicolo, box, cx, cy, r + bordo * 1.5);
    c.stroke();
    c.restore();
  }
  // corpo: ritratto o iniziali; a 0 PV in grigio
  if (p?.aZero) c.filter = 'grayscale(1)';
  c.save();
  forma(c, veicolo, box, cx, cy, r);
  c.fillStyle = colori.fondo;
  c.fill();
  const img = p ? immagine(p.ritratto) : null;
  if (img) {
    c.clip();
    const lato = r * 2;
    const k = Math.max(lato / img.naturalWidth, lato / img.naturalHeight);
    c.drawImage(img, cx - (img.naturalWidth * k) / 2, cy - (img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
  } else {
    c.globalAlpha *= 0.22;
    c.fillStyle = colore;
    c.fill();
    c.globalAlpha /= 0.22;
    if (testo) {
      c.fillStyle = colori.testo;
      c.font = `700 ${Math.round(Math.min(r * 0.8, (veicolo ? box.h : r * 2) * 0.42))}px system-ui, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(p?.iniziali ?? sigla(t.nome), cx, cy + 1);
    }
  }
  c.restore();
  // bordo (src/mappa/colori.js): contorno sottile per il contrasto, poi pieno, doppio o tratteggiato nero e colore
  c.save();
  if (b?.contorno) {
    c.strokeStyle = b.contorno;
    c.globalAlpha *= 0.85;
    c.lineWidth = bordo + Math.max(2, bordo * 0.6);
    forma(c, veicolo, box, cx, cy, r);
    c.stroke();
    c.globalAlpha /= 0.85;
  }
  c.lineWidth = bordo;
  if (b?.tratteggio) {
    c.strokeStyle = b.tratteggio;
    forma(c, veicolo, box, cx, cy, r);
    c.stroke();
    c.setLineDash([bordo * 1.8, bordo * 1.4]);
  }
  c.strokeStyle = colore;
  forma(c, veicolo, box, cx, cy, r);
  c.stroke();
  if (b?.doppio) {
    c.setLineDash([]);
    c.strokeStyle = b.contorno;
    c.lineWidth = Math.max(1, bordo * 0.3);
    forma(c, veicolo, box, cx, cy, r);
    c.stroke();
  }
  c.restore();
  // anello dei PV (§7): l'arco pieno è la parte di PV rimasti
  if (p?.pv?.massimo > 0 && !veicolo) {
    const quota = Math.max(0, Math.min(1, p.pv.attuali / p.pv.massimo));
    const ra = r - bordo * 1.3;
    c.lineWidth = Math.max(1.5, bordo * 0.8);
    c.strokeStyle = colori.traccia;
    c.beginPath(); c.arc(cx, cy, ra, 0, Math.PI * 2); c.stroke();
    if (quota > 0) {
      c.strokeStyle = colori.pv;
      c.beginPath(); c.arc(cx, cy, ra, -Math.PI / 2, -Math.PI / 2 + quota * Math.PI * 2); c.stroke();
    }
  }
  c.filter = 'none';
  // Stati: piccole sigle in basso a destra, al massimo tre più «+n»
  if (testo && p?.stati?.length) {
    const rr = Math.max(6, Math.min(11, qs * 0.17));
    const elenco = p.stati.length > 3 ? [...p.stati.slice(0, 2).map((s) => sigla(s.nome)), `+${p.stati.length - 2}`] : p.stati.map((s) => sigla(s.nome));
    c.font = `700 ${Math.round(rr * 1.05)}px system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    elenco.forEach((s, i) => {
      const x = box.x + box.w - rr - i * rr * 2.1, y = box.y + box.h - rr;
      c.fillStyle = colori.testo;
      c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill();
      c.fillStyle = colori.fondo;
      c.fillText(s, x, y + 0.5);
    });
  }
  // selezione del master
  if (scelto) {
    c.strokeStyle = colori.selezione;
    c.lineWidth = 2;
    c.setLineDash([5, 3]);
    c.strokeRect(box.x + 1, box.y + 1, box.w - 2, box.h - 2);
  }
  c.restore();
}

/** Cerchio per le creature, rettangolo arrotondato per i veicoli (percorso pronto per fill o stroke). */
function forma(c, veicolo, box, cx, cy, r) {
  c.beginPath();
  if (!veicolo) { c.arc(cx, cy, r, 0, Math.PI * 2); return; }
  // stesso margine del cerchio dentro il suo Q; r più grande (alone del turno) allarga il rettangolo di conseguenza
  const margine = Math.min(box.w, box.h) / 2 - r;
  const w = box.w - 2 * margine, hh = box.h - 2 * margine;
  c.roundRect(box.x + margine, box.y + margine, w, hh, Math.min(w, hh) * 0.18);
}
