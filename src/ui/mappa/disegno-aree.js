// Mappa di battaglia, lotto 5 (docs/battlemap/piano.md): disegno sul livello «aree» e «sopra» della vista master.
//   - muri come retino (righe oblique) e terreno difficile come puntinato, solo per il master: ai giocatori i muri
//     sotto la nebbia non arrivano proprio (src/mappa/vista.js) e la loro vista non li disegna;
//   - area raggiungibile in tre colori ben distinti (Passo, Corsa, Scatto: --mappa-passo, --mappa-corsa, --mappa-scatto),
//     leggera (ritocchi del 06/10): riempimento molto trasparente e contorno ben visibile di ogni fascia, con le
//     opacità di data/mappa.json → vista.area;
//   - percorso del token scelto verso il quadretto sotto il puntatore, con i Q che costa.
import { schermoDaMappa, rettangoloVisibile } from '../../mappa/camera.js';
import { dimensioni } from '../../mappa/token.js';

/** Limiti dei Q visibili nel riquadro, per non scorrere tutta la griglia a ogni disegno. */
function visibili(g, cam, info) {
  const r = rettangoloVisibile(cam, info.larghezza, info.altezza);
  const q = g.q_px;
  return {
    x0: Math.max(0, Math.floor((r.x0 - g.scosto_x) / q)), x1: Math.min(g.colonne, Math.ceil((r.x1 - g.scosto_x) / q)),
    y0: Math.max(0, Math.floor((r.y0 - g.scosto_y) / q)), y1: Math.min(g.righe, Math.ceil((r.y1 - g.scosto_y) / q)),
  };
}

/** Rettangolo dello schermo del Q (x, y). */
function rettQ(g, cam, x, y, w = 1, h = 1) {
  const a = schermoDaMappa(cam, g.scosto_x + x * g.q_px, g.scosto_y + y * g.q_px);
  const b = schermoDaMappa(cam, g.scosto_x + (x + w) * g.q_px, g.scosto_y + (y + h) * g.q_px);
  return [Math.floor(a.x), Math.floor(a.y), Math.ceil(b.x - a.x) + 1, Math.ceil(b.y - a.y) + 1];
}

/** Motivo ripetuto (retino o puntinato) per riempire i Q. */
const motivi = new Map();
function motivo(c, tipo, colore) {
  const chiave = `${tipo}|${colore}`;
  if (!motivi.has(chiave)) {
    const t = document.createElement('canvas');
    t.width = 10; t.height = 10;
    const x = t.getContext('2d');
    x.strokeStyle = colore; x.fillStyle = colore;
    if (tipo === 'retino') { x.lineWidth = 2; x.beginPath(); x.moveTo(-2, 12); x.lineTo(12, -2); x.moveTo(-2, 2); x.lineTo(2, -2); x.moveTo(8, 12); x.lineTo(12, 8); x.stroke(); } else { x.beginPath(); x.arc(5, 5, 1.6, 0, Math.PI * 2); x.fill(); }
    motivi.set(chiave, t);
  }
  return c.createPattern(motivi.get(chiave), 'repeat');
}

/** Muri (retino) e terreno difficile (puntinato) visibili al master. */
export function disegnaMuri(c, { scena, cam, info, muri, terreno, colori }) {
  const g = scena.griglia;
  const v = visibili(g, cam, info);
  for (const [maschera, tipo, colore] of [[terreno, 'puntinato', colori.terreno], [muri, 'retino', colori.muro]]) {
    c.save();
    c.beginPath();
    let n = 0;
    for (let y = v.y0; y < v.y1; y++) {
      for (let x = v.x0; x < v.x1; x++) {
        const i = y * g.colonne + x;
        if ((maschera[i >> 3] >> (i & 7)) & 1) { c.rect(...rettQ(g, cam, x, y)); n++; }
      }
    }
    if (n) {
      c.globalAlpha = 0.28; c.fillStyle = colore; c.fill();
      c.globalAlpha = 0.9; c.fillStyle = motivo(c, tipo, colore); c.fill();
    }
    c.restore();
  }
}

/**
 * Area raggiungibile: `celle` (src/mappa/area.js → celleArea) con 1 Passo, 2 Corsa, 3 Scatto. Ogni fascia ha un
 * riempimento leggero e il suo contorno (i lati dei Q che confinano con un'altra fascia o con l'esterno).
 * @param stile data/mappa.json → vista.area
 */
export function disegnaArea(c, { scena, cam, info, celle, colori, stile, solo = null }) {
  const g = scena.griglia;
  const v = visibili(g, cam, info);
  const tinte = [null, colori.passo, colori.corsa, colori.scatto];
  const val = (x, y) => (x < 0 || y < 0 || x >= g.colonne || y >= g.righe ? 0 : celle[y * g.colonne + x]);
  const punto = (x, y) => { const s = schermoDaMappa(cam, g.scosto_x + x * g.q_px, g.scosto_y + y * g.q_px); return [Math.round(s.x) + 0.5, Math.round(s.y) + 0.5]; };
  for (let k = solo ?? 1; k <= (solo ?? 3); k++) {
    c.save();
    c.beginPath();
    let n = 0;
    for (let y = v.y0; y < v.y1; y++) {
      for (let x = v.x0; x < v.x1; x++) if (celle[y * g.colonne + x] === k) { c.rect(...rettQ(g, cam, x, y)); n++; }
    }
    if (n) {
      c.globalAlpha = stile.opacita_riempimento; c.fillStyle = tinte[k]; c.fill();
      // contorno: un lato per ogni Q della fascia che confina con altro
      c.beginPath();
      for (let y = v.y0; y < v.y1; y++) {
        for (let x = v.x0; x < v.x1; x++) {
          if (val(x, y) !== k) continue;
          for (const [dx, dy, a, b] of [[0, -1, [x, y], [x + 1, y]], [0, 1, [x, y + 1], [x + 1, y + 1]], [-1, 0, [x, y], [x, y + 1]], [1, 0, [x + 1, y], [x + 1, y + 1]]]) {
            if (val(x + dx, y + dy) === k) continue;
            c.moveTo(...punto(...a)); c.lineTo(...punto(...b));
          }
        }
      }
      c.globalAlpha = stile.opacita_contorno; c.strokeStyle = tinte[k]; c.lineWidth = stile.spessore_contorno_px; c.lineCap = 'round'; c.stroke();
    }
    c.restore();
  }
}

/**
 * Zone di controllo degli avversari del token scelto (07/10, src/mappa/zoc.js): rosso semitrasparente con il contorno,
 * come l'area raggiungibile. `celle`: Uint8Array, 1 dentro una ZoC; `stile`: data/mappa.json → zoc.
 */
export function disegnaZoc(c, { scena, cam, info, celle, stile }) {
  disegnaArea(c, { scena, cam, info, celle, colori: { passo: stile.colore, corsa: stile.colore, scatto: stile.colore }, stile: { opacita_riempimento: stile.opacita_riempimento, opacita_contorno: stile.opacita_contorno, spessore_contorno_px: 2 }, solo: 1 });
}

/** Percorso del token (posizioni del Q in alto a sinistra) con il costo in Q all'arrivo; `inZoc`: passi in una ZoC. */
export function disegnaPercorso(c, { scena, cam, percorso, ingombro, costo, fascia, colori, inZoc = null, coloreZoc = '#e03131' }) {
  if (!percorso?.length) return;
  const g = scena.griglia;
  const [w, h] = dimensioni(ingombro);
  const centro = ([x, y]) => schermoDaMappa(cam, g.scosto_x + (x + w / 2) * g.q_px, g.scosto_y + (y + h / 2) * g.q_px);
  const colore = colori[fascia] ?? colori.passo;
  c.save();
  c.strokeStyle = colore;
  c.lineWidth = Math.max(3, Math.min(8, g.q_px * cam.scala * 0.12));
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.setLineDash([]);
  c.beginPath();
  percorso.forEach((p, i) => { const s = centro(p); if (i) c.lineTo(s.x, s.y); else c.moveTo(s.x, s.y); });
  c.stroke();
  // i passi dentro una ZoC: un quadrato rosso attorno al Q (la ZoC non blocca, segnala)
  if (inZoc?.some(Boolean)) {
    const lato = g.q_px * cam.scala;
    c.save();
    c.strokeStyle = coloreZoc;
    c.lineWidth = Math.max(2, lato * 0.08);
    percorso.forEach((p, i) => {
      if (!inZoc[i]) return;
      const s = centro(p);
      c.strokeRect(s.x - lato * 0.32, s.y - lato * 0.32, lato * 0.64, lato * 0.64);
    });
    c.restore();
  }
  if (costo === null || costo === undefined) { c.restore(); return; }
  const fine = centro(percorso.at(-1));
  const testo = `${String(costo).replace('.', ',')} Q`;
  c.font = '700 13px system-ui, sans-serif';
  const larg = c.measureText(testo).width + 10;
  c.fillStyle = colori.fondo;
  c.globalAlpha = 0.9;
  c.fillRect(fine.x + 8, fine.y - 22, larg, 18);
  c.globalAlpha = 1;
  c.fillStyle = colori.testo;
  c.textBaseline = 'middle';
  c.fillText(testo, fine.x + 13, fine.y - 13);
  c.restore();
}

/** Colori dell'area e dei muri dai token CSS (css/style.css, pagina della mappa). */
export function coloriAree(el) {
  const cs = getComputedStyle(el);
  const v = (n, d) => cs.getPropertyValue(n).trim() || d;
  return {
    passo: v('--mappa-passo', '#1f9d55'), corsa: v('--mappa-corsa', '#d9a400'), scatto: v('--mappa-scatto', '#d6336c'),
    muro: v('--mappa-muro', '#c0392b'), terreno: v('--mappa-terreno', '#2b6cb0'),
    fondo: v('--superficie', '#fff'), testo: v('--testo', '#111'),
  };
}
