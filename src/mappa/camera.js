// Camera della mappa di battaglia (lotto 2 di docs/battlemap/piano.md; §4 e §12 della specifica): trasformazione fra
// le coordinate della mappa (pixel dell'immagine originale) e quelle dello schermo (pixel CSS del riquadro).
//   schermo = mappa × scala + (ox, oy)
// Funzioni pure, senza DOM: le usa src/ui/mappa/ e le provano i test. Limiti dello zoom in data/mappa.json → vista.

/** Camera iniziale: scala 1, origine in alto a sinistra. */
export const cameraIniziale = () => ({ scala: 1, ox: 0, oy: 0 });

/** Punto dello schermo → punto della mappa. */
export function mappaDaSchermo(cam, sx, sy) {
  return { x: (sx - cam.ox) / cam.scala, y: (sy - cam.oy) / cam.scala };
}

/**
 * Il riquadro cambia misura (lotto 6: la barra accanto alla mappa si allarga o si stringe): stesso zoom e stesso punto
 * della mappa al centro del riquadro.
 */
export function mantieniCentro(cam, prima, dopo) {
  if (!prima?.larghezza || !prima?.altezza) return cam;
  return { ...cam, ox: cam.ox + (dopo.larghezza - prima.larghezza) / 2, oy: cam.oy + (dopo.altezza - prima.altezza) / 2 };
}

/** Punto della mappa → punto dello schermo. */
export function schermoDaMappa(cam, mx, my) {
  return { x: mx * cam.scala + cam.ox, y: my * cam.scala + cam.oy };
}

const limita = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Zoom di `fattore` tenendo fermo il punto dello schermo (sx, sy): il punto della mappa sotto il puntatore resta
 * sotto il puntatore (§12: «zoom con la rotella»). La scala resta fra vista.zoom_min e vista.zoom_max.
 */
export function zoomVerso(cam, sx, sy, fattore, vista) {
  const scala = limita(cam.scala * fattore, vista.zoom_min, vista.zoom_max);
  const r = scala / cam.scala;
  return { scala, ox: sx - (sx - cam.ox) * r, oy: sy - (sy - cam.oy) * r };
}

/**
 * Zoom a due dita (lotto 4): dalla camera all'inizio del gesto (cam0), con le dita a distanza d0 e centro m0, alla
 * camera con le dita a distanza d e centro m. Il punto della mappa che era sotto m0 finisce sotto m: si zooma e ci si
 * sposta insieme, come sui telefoni.
 */
export function pizzica(cam0, m0, d0, m, d, vista) {
  const z = zoomVerso(cam0, m0.x, m0.y, d0 > 0 ? d / d0 : 1, vista);
  return { ...z, ox: z.ox + (m.x - m0.x), oy: z.oy + (m.y - m0.y) };
}

/** Fattore di zoom della rotella: deltaY positivo (verso di sé) allontana. */
export const fattoreRotella = (deltaY, vista) => vista.passo_rotella ** -deltaY;

/** Spostamento dello schermo di (dx, dy) pixel (barra spaziatrice + mouse, trascinamento su un punto vuoto). */
export function sposta(cam, dx, dy) {
  return { ...cam, ox: cam.ox + dx, oy: cam.oy + dy };
}

/**
 * «Adatta allo schermo»: la mappa intera (larghezza × altezza in pixel della mappa) centrata nel riquadro
 * (lv × av), con vista.margine_adatta_px intorno. Riquadro vuoto o mappa vuota: camera iniziale.
 */
export function adatta(larghezza, altezza, lv, av, vista) {
  const m = vista.margine_adatta_px ?? 0;
  if (!(larghezza > 0 && altezza > 0 && lv > 2 * m && av > 2 * m)) return cameraIniziale();
  const scala = limita(Math.min((lv - 2 * m) / larghezza, (av - 2 * m) / altezza), vista.zoom_min, vista.zoom_max);
  return { scala, ox: (lv - larghezza * scala) / 2, oy: (av - altezza * scala) / 2 };
}

/**
 * Rettangolo della mappa visibile nel riquadro (lv × av), in pixel della mappa: serve a disegnare solo la parte
 * di griglia che si vede.
 */
export function rettangoloVisibile(cam, lv, av) {
  const a = mappaDaSchermo(cam, 0, 0);
  const b = mappaDaSchermo(cam, lv, av);
  return { x0: a.x, y0: a.y, x1: b.x, y1: b.y };
}
