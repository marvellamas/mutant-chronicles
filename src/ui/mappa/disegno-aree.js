// Mappa di battaglia, lotto 5 (docs/battlemap/piano.md): disegno sul livello «aree» e «sopra» della vista master.
//   - muri come retino (righe oblique) e terreno difficile come puntinato, solo per il master: ai giocatori i muri
//     sotto la nebbia non arrivano proprio (src/mappa/vista.js) e la loro vista non li disegna;
//   - area raggiungibile in tre colori ben distinti (Passo, Corsa, Scatto: --mappa-passo, --mappa-corsa, --mappa-scatto),
//     leggera (ritocchi del 06/10): riempimento molto trasparente e contorno ben visibile di ogni fascia, con le
//     opacità di data/mappa.json → vista.area;
//   - percorso del token scelto verso il quadretto sotto il puntatore, con i Q che costa.
import { schermoDaMappa, rettangoloVisibile } from '../../mappa/camera.js';
import { dimensioni } from '../../mappa/token.js';
import { trattiCoperti } from '../../mappa/nebbia.js';

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
export function disegnaMuri(c, { scena, cam, info, muri, terreno, colori, aspetto = null }) {
  const g = scena.griglia;
  const v = visibili(g, cam, info);
  // 12/10: i muri a quadretto come quelli disegnati, grigio scuro con bordo bianco (data/mappa.json → muri_linee.aspetto)
  if (aspetto && muri) { disegnaMuriQuadretto(c, { g, cam, v, muri, aspetto }); muri = null; }
  // M1 (11/10): muri e terreno hanno due interruttori distinti, quindi una delle due maschere puo mancare
  for (const [maschera, tipo, colore] of [[terreno, 'puntinato', colori.terreno], [muri, 'retino', colori.muro]]) {
    if (!maschera) continue;
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
 * Muri disegnati a mano libera (M2 dell'11/10, src/mappa/muri-linee.js): ogni tratto è una linea piena, dello spessore
 * scelto (in Q, quindi segue lo zoom). Stesso colore dei muri a quadretto, perché al tavolo sono la stessa cosa.
 * @param linee [{ id, punti, spessore }]
 * @param anteprima il tratto che si sta disegnando adesso (più chiaro, con i capi tondi)
 */
export function disegnaMuriLinee(c, { scena, cam, linee, colore, anteprima = false, aspetto = null, selezionato = null }) {
  if (!linee?.length) return;
  const g = scena.griglia;
  const px = (q) => Math.max(1, q * g.q_px * cam.scala); // uno spessore sotto il pixel resterebbe invisibile
  const traccia = (l) => {
    c.beginPath();
    l.punti.forEach(([x, y], i) => {
      const s = schermoDaMappa(cam, g.scosto_x + x * g.q_px, g.scosto_y + y * g.q_px);
      if (i === 0) c.moveTo(s.x, s.y); else c.lineTo(s.x, s.y);
    });
    c.stroke();
  };
  const valide = linee.filter((l) => Array.isArray(l?.punti) && l.punti.length >= 2);
  c.save();
  // estremi squadrati: dove una porta interrompe il muro il taglio è netto
  c.lineCap = 'butt';
  c.lineJoin = 'round';
  c.globalAlpha = anteprima ? 0.7 : 1;
  // 12/10: prima il bordo (bianco, 2 px per lato), poi il muro grigio scuro: si vede anche su immagini molto scure
  if (aspetto?.bordo_px) {
    for (const l of valide) {
      const scelto = selezionato && (l.id === selezionato || String(l.id).startsWith(`${selezionato}:`));
      c.strokeStyle = scelto ? aspetto.selezione : aspetto.bordo;
      c.lineWidth = px(l.spessore ?? 0.25) + 2 * aspetto.bordo_px * (scelto ? 2 : 1);
      traccia(l);
    }
  }
  c.strokeStyle = aspetto?.colore ?? colore;
  for (const l of valide) { c.lineWidth = px(l.spessore ?? 0.25); traccia(l); }
  c.restore();
}

/** Muri a quadretto: riempimento grigio scuro semitrasparente e bordo bianco sui lati che danno fuori dal muro. */
function disegnaMuriQuadretto(c, { g, cam, v, muri, aspetto }) {
  const muro = (x, y) => x >= 0 && y >= 0 && x < g.colonne && y < g.righe && ((muri[(y * g.colonne + x) >> 3] >> ((y * g.colonne + x) & 7)) & 1) === 1;
  c.save();
  c.beginPath();
  const lati = [];
  for (let y = v.y0; y < v.y1; y++) {
    for (let x = v.x0; x < v.x1; x++) {
      if (!muro(x, y)) continue;
      const [rx, ry, rw, rh] = rettQ(g, cam, x, y);
      c.rect(rx, ry, rw, rh);
      if (!muro(x, y - 1)) lati.push([rx, ry, rx + rw, ry]);
      if (!muro(x, y + 1)) lati.push([rx, ry + rh, rx + rw, ry + rh]);
      if (!muro(x - 1, y)) lati.push([rx, ry, rx, ry + rh]);
      if (!muro(x + 1, y)) lati.push([rx + rw, ry, rx + rw, ry + rh]);
    }
  }
  c.globalAlpha = aspetto.quadretto_opacita ?? 0.6; c.fillStyle = aspetto.colore; c.fill();
  if (aspetto.bordo_px && lati.length) {
    c.globalAlpha = 1; c.strokeStyle = aspetto.bordo; c.lineWidth = aspetto.bordo_px; c.lineCap = 'square';
    c.beginPath();
    for (const [x0, y0, x1, y1] of lati) { c.moveTo(x0, y0); c.lineTo(x1, y1); }
    c.stroke();
  }
  c.restore();
}

/**
 * Area raggiungibile: `celle` (src/mappa/area.js → celleArea) con 1 Passo, 2 Corsa, 3 Scatto. Ogni fascia ha un
 * riempimento leggero e il suo contorno (i lati dei Q che confinano con un'altra fascia o con l'esterno).
 * @param stile data/mappa.json → vista.area
 */
export function disegnaArea(c, { scena, cam, info, celle, colori, stile, solo = null, tratteggio = null }) {
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
      if (stile.opacita_riempimento > 0) { c.globalAlpha = stile.opacita_riempimento; c.fillStyle = tinte[k]; c.fill(); }
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
      c.globalAlpha = stile.opacita_contorno; c.strokeStyle = tinte[k]; c.lineWidth = stile.spessore_contorno_px; c.lineCap = tratteggio ? 'butt' : 'round';
      if (tratteggio) c.setLineDash(tratteggio);
      c.stroke();
    }
    c.restore();
  }
}

/**
 * Zone di controllo degli avversari del token scelto (07/10, src/mappa/zoc.js): rosso semitrasparente con il contorno,
 * come l'area raggiungibile. `celle`: Uint8Array, 1 dentro una ZoC; `stile`: data/mappa.json → zoc.
 */
export function disegnaZoc(c, { scena, cam, info, celle, stile, inattiva = false }) {
  // A.132: la ZoC di chi non può fare Attacchi di Opportunità (Stordito, Svenuto) solo tratteggiata, senza riempimento
  const s = inattiva
    ? { opacita_riempimento: 0, opacita_contorno: stile.inattiva.opacita_contorno, spessore_contorno_px: 2 }
    : { opacita_riempimento: stile.opacita_riempimento, opacita_contorno: stile.opacita_contorno, spessore_contorno_px: 2 };
  disegnaArea(c, { scena, cam, info, celle, colori: { passo: stile.colore, corsa: stile.colore, scatto: stile.colore }, stile: s, solo: 1, tratteggio: inattiva ? stile.inattiva.tratteggio_px : null });
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

/**
 * Template ad area (fase 2, lotto 1; src/mappa/template.js): i Q coperti nel colore del template, riempimento leggero e
 * contorno come l'area di movimento, e il nome (o la forma) sul Q d'origine. `anteprima`: tratteggiato, mentre si piazza.
 * @param stile data/mappa.json → template ({ opacita_riempimento, opacita_contorno, spessore_contorno_px })
 */
export function disegnaTemplate(c, { scena, cam, info, celle, colore, stile, etichetta = null, posto = null, anteprima = false }) {
  disegnaArea(c, { scena, cam, info, celle, colori: { passo: colore, corsa: colore, scatto: colore }, stile: { ...stile, opacita_riempimento: anteprima ? stile.opacita_riempimento * 0.7 : stile.opacita_riempimento }, solo: 1 });
  if (etichetta && posto) nomeNellArea(c, { scena, cam, etichetta, posto, regole: stile.nome });
}

/**
 * Il nome dentro l'area del template (12/10/2026, punto 4): nel posto che dice src/mappa/template.js → postoNome,
 * largo al più quei Q (fra 1 e 3). Il testo si rimpicciolisce fino a px_min e poi si accorcia con i puntini: non esce
 * mai dall'area. Bordo bianco e pieno scuro, come i muri, così si legge su immagini chiare e scure.
 */
export function nomeNellArea(c, { scena, cam, etichetta, posto, regole = {} }) {
  const g = scena.griglia;
  const n = { altezza_q: 0.4, px_min: 9, px_max: 22, colore: '#111111', bordo: '#ffffff', bordo_px: 3, ...regole };
  const s = schermoDaMappa(cam, g.scosto_x + posto.q[0] * g.q_px, g.scosto_y + posto.q[1] * g.q_px);
  // quanto misura un quadretto sullo schermo adesso (zoom compreso)
  const a = schermoDaMappa(cam, g.scosto_x, g.scosto_y);
  const b = schermoDaMappa(cam, g.scosto_x + g.q_px, g.scosto_y);
  const qpx = Math.abs(b.x - a.x);
  scriviConBordo(c, { testo: etichetta, x: s.x, y: s.y, massimo: posto.larghezza * qpx, qpx, regole: n });
}

/**
 * Scritta con il bordo bianco, dentro una larghezza data (12/10/2026, punto 4): il corpo scende fino a `px_min` e, se
 * ancora non ci sta, il testo si accorcia con i puntini. La usano il nome dei template e l'etichetta dei token liberi
 * (punto 6), perché si leggano allo stesso modo su immagini chiare e scure.
 * @param o { testo, x, y (centro della scritta), massimo: px disponibili, qpx: quanto misura un Q sullo schermo, regole }
 * @returns il testo scritto davvero, o null se non si è scritto niente
 */
export function scriviConBordo(c, { testo: etichetta, x, y, massimo, qpx, regole = {} }) {
  const n = { altezza_q: 0.4, px_min: 9, px_max: 22, colore: '#111111', bordo: '#ffffff', bordo_px: 3, ...regole };
  if (!etichetta || !(massimo >= 6)) return null; // mappa rimpicciolita: non si leggerebbe comunque
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  let px = Math.max(n.px_min, Math.min(n.px_max, qpx * n.altezza_q));
  const misura = (s, dim) => { c.font = `700 ${dim}px system-ui, sans-serif`; return c.measureText(s).width; };
  while (px > n.px_min && misura(etichetta, px) > massimo) px = Math.max(n.px_min, px - 1);
  let testo = etichetta;
  if (misura(testo, px) > massimo) {
    // non ci sta nemmeno al minimo: si taglia con i puntini
    while (testo.length > 1 && misura(`${testo}…`, px) > massimo) testo = testo.slice(0, -1);
    testo = `${testo}…`;
  }
  c.font = `700 ${px}px system-ui, sans-serif`;
  c.lineJoin = 'round';
  c.lineWidth = n.bordo_px;
  c.strokeStyle = n.bordo;
  c.strokeText(testo, x, y);
  c.fillStyle = n.colore;
  c.fillText(testo, x, y);
  c.restore();
  return testo;
}

/**
 * Porte (fase 2, lotto 2; src/mappa/porte.js): aperta = due stipiti e il varco tratteggiato (verde), chiusa = battente
 * pieno (marrone), bloccata = battente pieno rosso con la croce; segreta (solo il master) = contorno tratteggiato viola
 * con la «S» sul Q.
 * M3 (11/10): la porta si disegna dove è agganciata, non più al centro del Q (segnalazione di Davide): sulla linea
 * della griglia del lato scelto (aggancio.lato), o sul tratto di un muro disegnato (aggancio.muro), con lo spessore di
 * quel muro. Senza aggancio resta il disegno di prima, al centro del Q.
 * @param porte [{ q, stato, segreta?, orientamento, aggancio? }]; colori: data/mappa.json → porte.colori
 * @param regole data/mappa.json → porte (spessore_q, larghezza_q); senza, i valori di prima
 */
export function disegnaPorte(c, { scena, cam, info, porte, colori, regole = null }) {
  const g = scena.griglia;
  const v = visibili(g, cam, info);
  const larghezzaQ = regole?.larghezza_q ?? 1;
  for (const p of porte) {
    const [x, y] = p.q;
    if (x < v.x0 - 2 || x > v.x1 + 1 || y < v.y0 - 2 || y > v.y1 + 1) continue;
    const b = banda(g, cam, p, larghezzaQ, regole);
    const colore = colori[p.stato] ?? colori.chiusa;
    c.save();
    c.translate(b.cx, b.cy);
    c.rotate(b.angolo);
    // il battente (o il varco) lungo il muro: lunghezza = il vano, spessore = quello del muro
    const bw = b.lunghezza, bh = b.spessore;
    const bx = -bw / 2, by = -bh / 2;
    if (p.stato === 'aperta') {
      // 12/10: la linea tratteggiata verde resta; i due estremi (cardini) sono punti neri con bordo bianco
      c.strokeStyle = colore; c.lineWidth = 2; c.setLineDash([4, 3]);
      c.beginPath(); c.moveTo(bx, 0); c.lineTo(bx + bw, 0); c.stroke();
      c.setLineDash([]);
      const r = Math.max(3, Math.min(8, Math.max(bh, 6) * 0.45));
      for (const cx of [bx, bx + bw]) {
        c.beginPath(); c.arc(cx, 0, r, 0, Math.PI * 2);
        c.fillStyle = regole?.cardine?.colore ?? '#111111'; c.fill();
        c.strokeStyle = regole?.cardine?.bordo ?? '#ffffff'; c.lineWidth = 2; c.stroke();
      }
    } else {
      // chiusa o bloccata: battente pieno con bordo bianco di 2 px (si vede su immagini scure) e filo scuro interno
      c.fillStyle = colore; c.fillRect(bx, by, bw, bh);
      c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
      c.strokeStyle = '#111'; c.lineWidth = 1; c.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
      if (p.stato === 'bloccata') {
        const r = Math.min(bw, Math.max(bh, 6)) * 0.3;
        c.strokeStyle = '#fff'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(-r, -r); c.lineTo(r, r); c.moveTo(r, -r); c.lineTo(-r, r); c.stroke();
      }
    }
    // 12/10: porta selezionata (strumento «Porta»): contorno evidente attorno al battente
    if (p.selezionata) { c.strokeStyle = regole?.selezione ?? '#ffb000'; c.lineWidth = 3; c.setLineDash([]); c.strokeRect(bx - 5, by - 5, bw + 10, bh + 10); }
    c.restore();
    // la segreta resta segnata sul Q (solo il master): si trova a occhio anche se il battente è sottile
    if (p.segreta) {
      const [rx, ry, rw, rh] = rettQ(g, cam, x, y);
      c.save();
      c.strokeStyle = colori.segreta; c.lineWidth = 2; c.setLineDash([5, 4]);
      c.strokeRect(rx + 2, ry + 2, rw - 4, rh - 4);
      c.setLineDash([]);
      c.fillStyle = colori.segreta; c.font = `700 ${Math.max(9, Math.min(16, rh * 0.35))}px system-ui, sans-serif`;
      c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText('S', rx + 4, ry + 3);
      c.restore();
    }
  }
}

/**
 * M3: dove disegnare il battente, in pixel dello schermo: { cx, cy, angolo, lunghezza, spessore }. Dall'aggancio della
 * porta (lato della griglia o tratto del muro disegnato); senza aggancio, al centro del Q come prima.
 */
function banda(g, cam, p, larghezzaQ, regole) {
  const sch = (qx, qy) => schermoDaMappa(cam, g.scosto_x + qx * g.q_px, g.scosto_y + qy * g.q_px);
  const px = (q) => q * g.q_px * cam.scala;
  // 12/10: geometria già calcolata in Q (src/mappa/porte.js → geometriaPorta): al centro dello spessore del muro, con lo
  // spessore della porta o quello del muro se la porta sarebbe più spessa
  if (p.geo?.centro && p.geo?.direzione) {
    const s = sch(p.geo.centro[0], p.geo.centro[1]);
    return { cx: s.x, cy: s.y, angolo: Math.atan2(p.geo.direzione[1], p.geo.direzione[0]), lunghezza: Math.max(6, px(p.geo.larghezza ?? larghezzaQ)), spessore: Math.max(3, px(p.geo.spessore ?? 0.25)) };
  }
  const [x, y] = p.q;
  const a = p.aggancio;
  const spessoreQ = a?.spessore ?? regole?.spessore_q ?? 0.28;
  if (a?.muro && Array.isArray(a.punto)) {
    // sul tratto: centro nel punto agganciato, direzione del tratto (da → a)
    const dir = Array.isArray(a.da) && Array.isArray(a.a) ? [a.a[0] - a.da[0], a.a[1] - a.da[1]] : [1, 0];
    const s = sch(a.punto[0], a.punto[1]);
    return { cx: s.x, cy: s.y, angolo: Math.atan2(dir[1], dir[0]), lunghezza: Math.max(6, px(a.larghezza ?? larghezzaQ)), spessore: Math.max(3, px(spessoreQ)) };
  }
  if (a?.lato) {
    // sulla linea della griglia: il lato del Q, lungo un quadretto
    const centri = { n: [x + 0.5, y], s: [x + 0.5, y + 1], o: [x, y + 0.5], e: [x + 1, y + 0.5] };
    const [qx, qy] = centri[a.lato] ?? centri.n;
    const s = sch(qx, qy);
    const verticale = a.lato === 'o' || a.lato === 'e';
    return { cx: s.x, cy: s.y, angolo: verticale ? Math.PI / 2 : 0, lunghezza: Math.max(6, px(larghezzaQ)), spessore: Math.max(3, px(spessoreQ)) };
  }
  // senza aggancio (porte salvate prima, lette da un server vecchio): al centro del Q, come prima di M3
  const s = sch(x + 0.5, y + 0.5);
  const verticale = p.orientamento === 'verticale';
  return { cx: s.x, cy: s.y, angolo: verticale ? Math.PI / 2 : 0, lunghezza: Math.max(6, px(1)), spessore: Math.max(3, px(0.28)) };
}

/**
 * Linea di tiro (fase 2, lotto 3; src/mappa/visuale.js): dal centro di chi tira al centro del bersaglio, nel colore della
 * Copertura, con l'etichetta (distanza, Copertura); `linee` (solo master, con «Mostra dettaglio linea di tiro»): le
 * cinque linee di controllo dal centro del Q di chi tira, tratteggiate se bloccate; `origine` (in Q): il punto di
 * partenza, per un ingombro grande il centro del Q più favorevole (07/10).
 * @param colori data/mappa.json → visuale.colori
 */
export function disegnaLineaTiro(c, { scena, cam, da, a, copertura, etichetta, colori, linee = null, origine = null }) {
  const g = scena.griglia;
  const sch = ([x, y]) => schermoDaMappa(cam, g.scosto_x + x * g.q_px, g.scosto_y + y * g.q_px);
  const centro = (t) => { const [w, h] = dimensioni(t.ingombro); return sch([t.q[0] + w / 2, t.q[1] + h / 2]); };
  const colore = colori[copertura] ?? colori.nessuna;
  c.save();
  if (linee) {
    c.lineWidth = 1.5;
    for (const l of linee) {
      const p = sch(l.da), q = sch(l.a);
      c.strokeStyle = l.bloccata ? colori.totale : colori.nessuna;
      c.globalAlpha = 0.8;
      c.setLineDash(l.bloccata ? [4, 4] : []);
      c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke();
    }
  }
  const p = origine ? sch(origine) : centro(da), q = centro(a);
  c.globalAlpha = 1;
  c.setLineDash([]);
  c.strokeStyle = colore;
  c.lineWidth = Math.max(3, Math.min(6, g.q_px * cam.scala * 0.08));
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke();
  c.beginPath(); c.arc(q.x, q.y, Math.max(6, g.q_px * cam.scala * 0.2), 0, Math.PI * 2); c.stroke();
  if (etichetta) {
    c.font = '700 13px system-ui, sans-serif';
    const larg = c.measureText(etichetta).width + 12;
    c.fillStyle = '#000'; c.globalAlpha = 0.85;
    c.fillRect(q.x + 10, q.y - 24, larg, 20);
    c.globalAlpha = 1; c.fillStyle = '#fff'; c.textBaseline = 'middle';
    c.fillText(etichetta, q.x + 16, q.y - 14);
  }
  c.restore();
}

/**
 * Luci della scena (fase 2, lotto 4; src/mappa/luce.js): un velo scuro sui Q in Penombra, Luce scarsa e Buio, con
 * l'opacità della categoria (data/mappa.json → luci.oscurita, per i giocatori luci.oscurita_giocatori, più leggera
 * perché la mappa resti leggibile). Sta sotto i token: il buio non li nasconde (a quello pensa la nebbia).
 * @param maschere { categoria: maschera a bit (src/mappa/celle.js) }
 */
export function disegnaLuci(c, { scena, cam, info, maschere, opacita, colore = '#05060a' }) {
  const g = scena.griglia;
  const v = visibili(g, cam, info);
  for (const [id, m] of Object.entries(maschere)) {
    const a = opacita[id];
    if (!(a > 0)) continue;
    const tratti = trattiCoperti(m, g.colonne, g.righe, v);
    if (!tratti.length) continue;
    c.save();
    c.globalAlpha = a;
    c.fillStyle = colore;
    c.beginPath();
    for (const [y, xa, xb] of tratti) c.rect(...rettQ(g, cam, xa, y, xb - xa, 1));
    c.fill();
    c.restore();
  }
}

/**
 * Selezione ed evidenziazione dell'editor (12/10/2026, src/mappa/editor.js): contorno giallo attorno agli oggetti
 * selezionati, contorno leggero su quello sotto il puntatore (D7: prima non si capiva mai che cosa si stava per
 * prendere) e maniglie quadrate sui vertici quando c'è un muro disegnato solo.
 * @param oggetti l'elenco di src/mappa/editor.js → oggettiScena
 * @param selezione chiavi selezionate; @param hover la chiave sotto il puntatore
 */
export function disegnaSelezione(c, { scena, cam, oggetti, selezione = [], hover = null, colori = {} }) {
  const g = scena.griglia;
  const scelte = new Set(selezione);
  if (!scelte.size && !hover) return;
  const giallo = colori.selezione ?? '#ffb000';
  const leggero = colori.hover ?? 'rgba(255, 176, 0, 0.45)';
  const punto = (x, y) => schermoDaMappa(cam, g.scosto_x + x * g.q_px, g.scosto_y + y * g.q_px);

  const contorno = (o, colore, spessore) => {
    c.save();
    c.strokeStyle = colore;
    c.lineWidth = spessore;
    c.setLineDash([]);
    c.lineJoin = 'round';
    if (o.tipo === 'muro') {
      c.beginPath();
      o.punti.forEach(([x, y], i) => { const s = punto(x, y); if (i === 0) c.moveTo(s.x, s.y); else c.lineTo(s.x, s.y); });
      c.lineCap = 'round';
      c.lineWidth = Math.max(spessore, (o.spessore ?? 0.25) * g.q_px * cam.scala + spessore * 2);
      c.globalAlpha = 0.55;
      c.stroke();
    } else if (o.tipo === 'terreno' || o.tipo === 'template') {
      c.globalAlpha = 0.95;
      for (const [x, y] of o.celle) {
        const [sx, sy, sw, sh] = rettQ(g, cam, x, y);
        // solo i lati che danno fuori dall'area: così si vede il contorno della macchia, non la griglia
        const dentro = (ax, ay) => o.celle.some(([bx, by]) => bx === ax && by === ay);
        c.beginPath();
        if (!dentro(x, y - 1)) { c.moveTo(sx, sy); c.lineTo(sx + sw, sy); }
        if (!dentro(x, y + 1)) { c.moveTo(sx, sy + sh); c.lineTo(sx + sw, sy + sh); }
        if (!dentro(x - 1, y)) { c.moveTo(sx, sy); c.lineTo(sx, sy + sh); }
        if (!dentro(x + 1, y)) { c.moveTo(sx + sw, sy); c.lineTo(sx + sw, sy + sh); }
        c.stroke();
      }
    } else {
      const [lc, lr] = dimensioni(o.ingombro ?? 1);
      const [sx, sy, sw, sh] = rettQ(g, cam, o.q[0], o.q[1], lc, lr);
      c.globalAlpha = 0.95;
      c.strokeRect(sx - 2, sy - 2, sw + 4, sh + 4);
    }
    c.restore();
  };

  if (hover && !scelte.has(hover)) {
    const o = oggetti.find((x) => x.chiave === hover);
    if (o) contorno(o, leggero, 3);
  }
  const selezionati = oggetti.filter((o) => scelte.has(o.chiave));
  for (const o of selezionati) contorno(o, giallo, 3);

  // maniglie: un muro disegnato solo, un quadratino per vertice
  if (selezionati.length === 1 && selezionati[0].tipo === 'muro') {
    c.save();
    c.fillStyle = giallo;
    c.strokeStyle = '#1d1f22';
    c.lineWidth = 1;
    for (const [x, y] of selezionati[0].punti) {
      const s = punto(x, y);
      c.fillRect(s.x - 5, s.y - 5, 10, 10);
      c.strokeRect(s.x - 5, s.y - 5, 10, 10);
    }
    c.restore();
  }
}

/** Il vertice del muro sotto il punto dello schermo (maniglia presa), o null: { indice, distanza }. */
export function manigliaSotto(scena, cam, muro, sx, sy, raggioPx = 9) {
  if (!muro?.punti) return null;
  const g = scena.griglia;
  let migliore = null;
  muro.punti.forEach(([x, y], i) => {
    const s = schermoDaMappa(cam, g.scosto_x + x * g.q_px, g.scosto_y + y * g.q_px);
    const d = Math.hypot(s.x - sx, s.y - sy);
    if (d <= raggioPx && (!migliore || d < migliore.distanza)) migliore = { indice: i, distanza: d };
  });
  return migliore;
}
