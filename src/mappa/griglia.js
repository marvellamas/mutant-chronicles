// Griglia della mappa di battaglia (lotto 2 di docs/battlemap/piano.md; §4 della specifica): calibrazione tracciando
// un quadretto o con i valori, righe e colonne calcolate, blocco, linee da disegnare. Funzioni pure.
// Coordinate in pixel dell'immagine originale; il Q (0, 0) comincia in (scosto_x, scosto_y).
import { dimensioniGriglia } from './scena.js';
import { daBase64, inBase64, ridimensiona } from './celle.js';
import { dimensioni } from './token.js';
import { lineeDi } from './muri-linee.js';
import { testoScalaScena } from './scala.js';

/** M2: un punto di un muro disegnato riportato dentro la griglia (col margine dei dati). */
const dentroQ = (v, max, margine) => Math.max(-margine, Math.min(max + margine, v));

/** Scostamento riportato dentro un quadretto: 0 ≤ scosto < q. */
export function normalizzaScosto(scosto, q) {
  const r = ((scosto % q) + q) % q;
  return Math.round(r * 100) / 100;
}

/**
 * Calibrazione dal riquadro tracciato sull'immagine fra i punti a e b, largo `quadretti` Q per lato (§4: «tracciando
 * un quadretto»; tracciarne più di uno insieme è più preciso). Restituisce { q_px, scosto_x, scosto_y, scarto } con
 * `scarto` = differenza relativa fra lato orizzontale e verticale (il riquadro dovrebbe essere quadrato), oppure
 * { errore } se il lato esce dai limiti di data/mappa.json → griglia.
 */
export function calibraDaQuadretto(a, b, quadretti, dati) {
  const G = dati.mappa.griglia;
  const n = Number(quadretti);
  if (!Number.isInteger(n) || n < 1) return { errore: 'quanti quadretti copre il riquadro: un intero da 1 in su' };
  const lx = Math.abs(b.x - a.x) / n;
  const ly = Math.abs(b.y - a.y) / n;
  const q = Math.round(((lx + ly) / 2) * 100) / 100;
  if (!(q >= G.q_px_min && q <= G.q_px_max)) {
    return { errore: `un quadretto risulta di ${q} pixel: deve stare fra ${G.q_px_min} e ${G.q_px_max} (traccia di nuovo, o cambia quanti quadretti copre)` };
  }
  return {
    q_px: q,
    scosto_x: normalizzaScosto(Math.min(a.x, b.x), q),
    scosto_y: normalizzaScosto(Math.min(a.y, b.y), q),
    scarto: Math.abs(lx - ly) / Math.max(lx, ly),
  };
}

/** Dimensioni della mappa in pixel: quelle dell'immagine o, senza immagine, quelle della griglia vuota. */
export function dimensioniMappa(scena) {
  if (scena.mappa) return { larghezza: scena.mappa.larghezza, altezza: scena.mappa.altezza };
  const g = scena.griglia;
  return { larghezza: g.scosto_x + g.colonne * g.q_px, altezza: g.scosto_y + g.righe * g.q_px };
}

const GEOMETRIA = ['q_px', 'scosto_x', 'scosto_y'];

/**
 * Nuova griglia (e, se cambia, nuova immagine) applicata alla scena: colonne e righe ricalcolate dall'immagine,
 * maschere di muri, terreno e nebbia ridimensionate (i Q nuovi della nebbia coperti se la nebbia iniziale è
 * coperta), token riportati dentro la griglia. Con la griglia bloccata (§4) la geometria non cambia: colore e
 * opacità sì. Restituisce { scena } oppure { errore }; la scena di partenza non si tocca.
 */
export function applicaGriglia(scena, cambi, dati, { mappa } = {}) {
  const G = dati.mappa.griglia;
  const prima = scena.griglia;
  const cambiaGeometria = GEOMETRIA.some((k) => cambi[k] !== undefined && cambi[k] !== prima[k]) || cambi.colonne !== undefined || cambi.righe !== undefined;
  if (prima.bloccata && cambi.bloccata !== false && (cambiaGeometria || mappa)) return { errore: 'la griglia è bloccata: sbloccala per cambiarla' };
  const g = { ...prima, ...cambi };
  if (typeof g.q_px !== 'number' || !(g.q_px >= G.q_px_min && g.q_px <= G.q_px_max)) return { errore: `dimensione del quadretto: da ${G.q_px_min} a ${G.q_px_max} pixel` };
  if (!(typeof g.opacita === 'number' && g.opacita >= 0 && g.opacita <= 1)) return { errore: 'opacità: da 0 a 1' };
  // 13/10: spessore delle linee (px dello schermo), fra i gradini di data/mappa.json → griglia.spessori
  if (g.spessore !== undefined) g.spessore = spessoreGriglia(g, dati);
  g.scosto_x = normalizzaScosto(Number(g.scosto_x) || 0, g.q_px);
  g.scosto_y = normalizzaScosto(Number(g.scosto_y) || 0, g.q_px);
  const nuovaMappa = mappa === undefined ? scena.mappa : mappa;
  const dim = nuovaMappa ? dimensioniGriglia(nuovaMappa, g) : { colonne: g.colonne, righe: g.righe };
  const S = dati.mappa.scena;
  if (!(dim.colonne >= 1 && dim.colonne <= S.colonne_max && dim.righe >= 1 && dim.righe <= S.righe_max)) {
    return { errore: `la griglia risulta di ${dim.colonne} × ${dim.righe} Q: al massimo ${S.colonne_max} × ${S.righe_max} (quadretti più grandi)` };
  }
  g.colonne = dim.colonne;
  g.righe = dim.righe;
  const C0 = prima.colonne, R0 = prima.righe;
  const margine = dati.mappa.muri_linee?.margine_q ?? 2;
  const adatta = (b64, riempi) => (C0 === g.colonne && R0 === g.righe ? b64 : inBase64(ridimensiona(daBase64(b64), C0, R0, g.colonne, g.righe, riempi)));
    const dentro = (t) => {
    const [w, h] = dimensioni(t.ingombro);
    return { ...t, q: [Math.max(0, Math.min(g.colonne - w, t.q[0])), Math.max(0, Math.min(g.righe - h, t.q[1]))] };
  };
  return {
    scena: {
      ...scena,
      mappa: nuovaMappa,
      griglia: g,
      muri: adatta(scena.muri, false),
      terreno: adatta(scena.terreno, false),
      nebbia: { ...scena.nebbia, coperti: adatta(scena.nebbia.coperti, scena.nebbia.iniziale === 'coperta') },
      token: scena.token.map(dentro),
      template: scena.template.filter((t) => t.origine[0] < g.colonne && t.origine[1] < g.righe),
      // M2 (11/10): i muri disegnati sono in Q, quindi restano dove sono; se la griglia si stringe si riportano
      // dentro (con il margine dei dati), altrimenti la scena non si potrebbe più salvare
      ...((l) => (l.length ? { muriLinee: l.map((x) => ({ ...x, punti: x.punti.map(([px, py]) => [dentroQ(px, g.colonne, margine), dentroQ(py, g.righe, margine)]) })) } : {}))(lineeDi(scena)),
    },
  };
}

/**
 * Linee della griglia da disegnare nel rettangolo visibile (pixel della mappa): { xs, ys, x0, x1, y0, y1 } con le
 * coordinate delle verticali e delle orizzontali e gli estremi dei segmenti. null se a questo zoom un Q sarebbe
 * più piccolo di vista.griglia_px_schermo_minimi pixel (griglia troppo fitta per servire) o se non si vede nulla.
 */
export function spessoreGriglia(griglia, dati) {
  const G = dati?.mappa?.griglia ?? {};
  const gradini = G.spessori ?? [];
  const predefinito = G.predefinita?.spessore ?? gradini[0]?.px ?? 1;
  const v = Number(griglia?.spessore);
  if (!Number.isFinite(v) || v <= 0) return predefinito;
  if (!gradini.length) return v;
  // il gradino più vicino: nel file può esserci un valore vecchio o scritto a mano
  return gradini.reduce((a, b) => (Math.abs(b.px - v) < Math.abs(a.px - v) ? b : a)).px;
}

/** Lo scarto di mezzo pixel che rende nitide le linee dispari (1 e 3 px); con le pari non serve. */
export const scostoNitido = (px) => (Math.round(px) % 2 === 1 ? 0.5 : 0);

export function lineeVisibili(griglia, rett, scala, vista) {
  const { q_px: q, scosto_x: sx, scosto_y: sy, colonne, righe } = griglia;
  if (q * scala < vista.griglia_px_schermo_minimi) return null;
  const x0 = Math.max(sx, rett.x0), x1 = Math.min(sx + colonne * q, rett.x1);
  const y0 = Math.max(sy, rett.y0), y1 = Math.min(sy + righe * q, rett.y1);
  if (x0 > x1 || y0 > y1) return null;
  const xs = [], ys = [];
  for (let k = Math.max(0, Math.ceil((x0 - sx) / q)); k <= colonne && sx + k * q <= x1; k++) xs.push(sx + k * q);
  for (let k = Math.max(0, Math.ceil((y0 - sy) / q)); k <= righe && sy + k * q <= y1; k++) ys.push(sy + k * q);
  return { xs, ys, x0, x1, y0, y1 };
}

/** Q sotto un punto della mappa: [x, y] oppure null fuori dalla griglia. */
export function qDaPunto(griglia, mx, my) {
  const x = Math.floor((mx - griglia.scosto_x) / griglia.q_px);
  const y = Math.floor((my - griglia.scosto_y) / griglia.q_px);
  return x >= 0 && y >= 0 && x < griglia.colonne && y < griglia.righe ? [x, y] : null;
}

/** Testo della scala per la barra (§4): «Q Base · 1 Q = 1,5 m» (A.198: con la scala dichiarata dalla scena, se c'è). */
export const testoScala = (dati, scena = null) => testoScalaScena(scena, dati);
