// Mappa di battaglia, lotto 3 (docs/battlemap/piano.md; §7 della specifica): disegno dei token sul livello «sopra».
// Ritratto del PG o cerchio con le iniziali; veicoli come rettangoli; bordo dai colori del 06/10 (src/mappa/colori.js:
// PG pieno col suo colore, nemici tratteggiati nero e colore del tipo, alleati doppio grigio-petrolio, veicoli col colore
// del proprietario), con un contorno sottile scuro o chiaro solo all'esterno; barretta rossa dei PV sul fondo, sopra il
// bordo (07/10, data/mappa.json → pv_token; al posto dell'anello); piccole sigle degli Stati; a 0 PV in
// grigio; il token di turno con un alone bianco luminoso (non si confonde col giallo dei PG); i token nascosti (solo
// nella vista master) trasparenti.
import { schermoDaMappa } from '../../mappa/camera.js';
import { dimensioni, chiaveRif } from '../../mappa/token.js';
import { direzioneDi, angoloImmagine, postiCerchietti } from '../../mappa/veicoli-mappa.js';
import { inVolo, quotaDi } from '../../mappa/volo.js';
import { angoloDi, formaDi, baseDaIngombro } from '../../mappa/forma.js';

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
export function disegnaToken(c, { scena, cam, pezzi, colori, immagine, selezionato = null, trascina = null, bordo = () => null, alone = '#ffffff', pv = null, ritrattoVerticale = 0.5, zero = null, volo = null }) {
  const g = scena.griglia;
  const qs = g.q_px * cam.scala;
  const ordinati = [...scena.token].sort((a, b) => (a.id === selezionato) - (b.id === selezionato) || (a.id === trascina?.id) - (b.id === trascina?.id));
  for (const t of ordinati) {
    const q = trascina?.id === t.id ? trascina.q : t.q;
    // 08/10: il veicolo si disegna nel suo riferimento, ruotato liscio verso il muso, con il triangolino del muso
    if (t.rif.tipo === 'veicolo') { disegnaVeicolo(c, { t, q, g, cam, qs, pezzi, colori, immagine, scelto: t.id === selezionato, inMano: trascina?.id === t.id, bordo, alone, pv, ritrattoVerticale, zero }); continue; }
    const [w, h] = dimensioni(t.ingombro);
    const a = schermoDaMappa(cam, g.scosto_x + q[0] * g.q_px, g.scosto_y + q[1] * g.q_px);
    const box = { x: a.x, y: a.y, w: w * qs, h: h * qs };
    const p = pezzi.get(chiaveRif(t.rif)) ?? null;
    disegnaUno(c, { t, p, box, colori, immagine, qs, scelto: t.id === selezionato, inMano: trascina?.id === t.id, b: p ? bordo(p) : null, alone, pv, ritrattoVerticale, zero, volo });
    // chi è a bordo (fase 2, lotto 5; ritocchi del 08/10): come i token, due terzi di un Q, in griglia sul veicolo, il
    // conducente per primo con un anello del colore della selezione (pezzi della mappa o info della vista giocatori)
    const bordo_ = [...(t.passeggeri ?? [])].sort((a, x) => (x.ruolo === 'conducente') - (a.ruolo === 'conducente'));
    if (bordo_.length) {
      // dentro l'ingombro, lontano dal bordo del mezzo (lo spessore del bordo e il margine della sua forma)
      const posti = postiCerchietti(bordo_.length, box, qs, { margine: Math.min(box.w, box.h) * 0.06 + Math.max(2, Math.min(6, Math.min(box.w, box.h) * 0.06)) + 1 });
      bordo_.forEach((x, i) => {
        const pz = pezzi.get(chiaveRif(x.rif)) ?? (x.info ? { ...x.info, ritratto: x.info.immagine } : null);
        const pb = { x: posti[i].x, y: posti[i].y, w: posti[i].lato, h: posti[i].lato };
        disegnaUno(c, { t: { ...x, nascosto: t.nascosto || x.nascosto }, p: pz, box: pb, colori, immagine, qs: posti[i].lato, scelto: false, inMano: false, b: pz ? bordo(pz) : null, alone, pv, ritrattoVerticale, zero });
        if (x.ruolo === 'conducente') {
          c.save();
          c.strokeStyle = colori.selezione;
          c.lineWidth = Math.max(2, pb.w * 0.07);
          c.beginPath(); c.arc(pb.x + pb.w / 2, pb.y + pb.h / 2, pb.w / 2 - c.lineWidth / 2, 0, Math.PI * 2); c.stroke();
          c.restore();
        }
      });
    }
  }
}

/**
 * Veicolo (08/10, orientamento libero; src/mappa/forma.js): il rettangolo lungo × largo con il muso verso angoloDi(t)
 * (0° in alto, senso orario), disegnato in un riferimento ruotato attorno al suo centro; l'immagine ruota liscia, i
 * quadretti occupati seguono la regola «almeno metà». Scelto: i quadretti occupati con un contorno leggero. Il
 * triangolino sul lato anteriore, nel colore del proprietario, dice dove punta il muso. Chi è a bordo resta dritto.
 */
function disegnaVeicolo(c, { t, q, g, cam, qs, pezzi, colori, immagine, scelto, inMano, bordo, alone, pv, ritrattoVerticale, zero }) {
  const p = pezzi.get(chiaveRif(t.rif)) ?? null;
  const b = p ? bordo(p) : null;
  const f = formaDi(t);
  const [w, h] = dimensioni(t.ingombro);
  const centro = f ? [q[0] + f.centro[0], q[1] + f.centro[1]] : [q[0] + w / 2, q[1] + h / 2];
  const s = schermoDaMappa(cam, g.scosto_x + centro[0] * g.q_px, g.scosto_y + centro[1] * g.q_px);
  const [L, W] = Array.isArray(t.base) ? t.base : baseDaIngombro(t.ingombro);
  const ang = ((angoloDi(t) - 180) * Math.PI) / 180;
  // quadretti occupati (veicolo scelto): contorno leggero
  if (scelto) {
    const celle = f ? f.celle.map(([dx, dy]) => [q[0] + dx, q[1] + dy]) : null;
    c.save();
    c.strokeStyle = colori.selezione;
    c.fillStyle = colori.selezione;
    c.lineWidth = 1.5;
    c.setLineDash([4, 3]);
    for (const [x, y] of celle ?? Array.from({ length: w * h }, (_, i) => [q[0] + (i % w), q[1] + Math.floor(i / w)])) {
      const a = schermoDaMappa(cam, g.scosto_x + x * g.q_px, g.scosto_y + y * g.q_px);
      c.globalAlpha = 0.14;
      c.fillRect(Math.round(a.x) + 1, Math.round(a.y) + 1, qs - 2, qs - 2);
      c.globalAlpha = 0.8;
      c.strokeRect(Math.round(a.x) + 1.5, Math.round(a.y) + 1.5, qs - 3, qs - 3);
    }
    c.restore();
  }
  // nel riferimento del veicolo il muso è in basso (180°): box verticale largo × lungo, centrato
  const box = { x: -(W * qs) / 2, y: -(L * qs) / 2, w: W * qs, h: L * qs };
  c.save();
  c.translate(s.x, s.y);
  c.rotate(ang);
  disegnaUno(c, { t: { ...t, direzione: 's' }, p, box, colori, immagine, qs, scelto, inMano, b, alone, pv, ritrattoVerticale, zero });
  // muso: triangolino sul lato anteriore, nel colore del proprietario, con il contorno per il contrasto
  const lato = Math.max(8, Math.min(box.w * 0.42, qs * 0.5));
  const y0 = box.y + box.h - Math.max(2, Math.min(6, Math.min(box.w, box.h) * 0.06)) * 0.5;
  c.beginPath();
  c.moveTo(-lato / 2, y0 - lato * 0.15);
  c.lineTo(lato / 2, y0 - lato * 0.15);
  c.lineTo(0, y0 + lato * 0.55);
  c.closePath();
  c.fillStyle = b?.colore ?? colori.selezione;
  c.globalAlpha = t.nascosto ? 0.45 : 1;
  c.fill();
  c.lineWidth = Math.max(1.5, lato * 0.1);
  c.strokeStyle = b?.contorno ?? '#000000';
  c.stroke();
  c.restore();
  // chi è a bordo: le posizioni nel riferimento del veicolo, i cerchietti dritti sullo schermo
  const bordo_ = [...(t.passeggeri ?? [])].sort((a, x) => (x.ruolo === 'conducente') - (a.ruolo === 'conducente'));
  if (!bordo_.length) return;
  const posti = postiCerchietti(bordo_.length, box, qs, { margine: Math.min(box.w, box.h) * 0.06 + Math.max(2, Math.min(6, Math.min(box.w, box.h) * 0.06)) + 1 });
  const cos = Math.cos(ang), sin = Math.sin(ang);
  bordo_.forEach((x, i) => {
    const pz = pezzi.get(chiaveRif(x.rif)) ?? (x.info ? { ...x.info, ritratto: x.info.immagine } : null);
    const lx = posti[i].x + posti[i].lato / 2, ly = posti[i].y + posti[i].lato / 2;
    const cx = s.x + lx * cos - ly * sin, cy = s.y + lx * sin + ly * cos;
    const pb = { x: cx - posti[i].lato / 2, y: cy - posti[i].lato / 2, w: posti[i].lato, h: posti[i].lato };
    disegnaUno(c, { t: { ...x, nascosto: t.nascosto || x.nascosto }, p: pz, box: pb, colori, immagine, qs: posti[i].lato, scelto: false, inMano: false, b: pz ? bordo(pz) : null, alone, pv, ritrattoVerticale, zero });
    if (x.ruolo === 'conducente') {
      c.save();
      c.strokeStyle = colori.selezione;
      c.lineWidth = Math.max(2, pb.w * 0.07);
      c.beginPath(); c.arc(pb.x + pb.w / 2, pb.y + pb.h / 2, pb.w / 2 - c.lineWidth / 2, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
  });
}

function disegnaUno(c, { t, p, box, colori, immagine, qs, scelto, inMano, b, alone, pv, ritrattoVerticale, zero, volo = null }) {
  const colore = b?.colore ?? colori[p?.lato] ?? colori.testo;
  const veicolo = t.rif.tipo === 'veicolo';
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const r = Math.min(box.w, box.h) / 2 * 0.88;
  const bordo = Math.max(2, Math.min(6, r * 0.14));
  const testo = Math.min(box.w, box.h) >= SOGLIA_TESTO_PX;
  // in volo (08/10, data/mappa.json → volo): un'ombra leggera sotto, spostata in basso, dice che è sollevato
  const aria = !veicolo && inVolo(t);
  if (aria) {
    c.save();
    c.globalAlpha = t.nascosto ? 0.22 : 0.45;
    c.fillStyle = '#000000';
    c.beginPath();
    c.ellipse(cx + r * 0.12, cy + r * 0.55, r * 0.9, r * 0.45, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
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
  // fase 2, lotto 5: l'immagine del veicolo (data/veicoli.json → profili[].mappa), ruotata con il muso del token
  const imgV = veicolo && p ? immagine(p.immagine ?? p.veicoloImmagine ?? null) : null;
  if (!imgV) { c.fillStyle = colori.fondo; c.fill(); }
  const img = p && !veicolo ? immagine(p.ritratto) : null;
  if (imgV) {
    c.clip();
    const ang = angoloImmagine(direzioneDi(t), p.musoImmagine ?? 's');
    const margine = Math.min(box.w, box.h) / 2 - r;
    const w = box.w - 2 * margine, hh = box.h - 2 * margine;
    c.translate(cx, cy);
    c.rotate((ang * Math.PI) / 180);
    // ruotato di 90° o 270° l'immagine (verticale) va disegnata con i lati scambiati
    const [dw, dh] = ang % 180 ? [hh, w] : [w, hh];
    c.drawImage(imgV, -dw / 2, -dh / 2, dw, dh);
  } else if (img) {
    // 07/10: il ritratto riempie il cerchio fino al bordo colorato, l'unica cornice; delle foto più alte che larghe si
    // tiene il quadrato verso l'alto (data/mappa.json → token.ritratto_verticale), dove sta il viso
    c.clip();
    const w = img.naturalWidth, hh = img.naturalHeight, lato = Math.min(w, hh);
    const sx = (w - lato) / 2, sy = hh > w ? (hh - lato) * ritrattoVerticale : (hh - lato) / 2;
    c.drawImage(img, sx, sy, lato, lato, cx - r, cy - r, r * 2, r * 2);
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
  // bordo (src/mappa/colori.js): contorno sottile per il contrasto solo all'esterno (dentro il bordo colorato non ci sono
  // altre cornici: il ritratto arriva fino al bordo), poi pieno, doppio o tratteggiato nero e colore
  c.save();
  if (b?.contorno) {
    const w = Math.max(1.5, bordo * 0.35);
    c.strokeStyle = b.contorno;
    c.globalAlpha *= 0.85;
    c.lineWidth = w;
    forma(c, veicolo, box, cx, cy, r + bordo / 2 + w / 2);
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
  c.filter = 'none';
  // in volo: l'icona in alto a destra, sopra il bordo, e la quota in Q se c'è
  const iconaVolo = aria && volo ? immagine(volo.icona) : null;
  if (aria && volo) {
    const l = Math.max(12, r * 2 * volo.quota_icona);
    const ix = cx + r * 0.95 - l / 2, iy = cy - r * 0.95 - l / 2;
    c.save();
    if (t.nascosto) c.globalAlpha = 0.45;
    if (iconaVolo) c.drawImage(iconaVolo, ix, iy, l, l);
    else { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(ix + l / 2, iy + l / 2, l / 2, 0, Math.PI * 2); c.fill(); }
    const quota = quotaDi(t);
    if (quota && testo) {
      c.font = `700 ${Math.round(Math.max(10, l * 0.5))}px system-ui, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'top';
      c.lineWidth = 3;
      c.strokeStyle = '#000000';
      c.strokeText(`${quota} Q`, ix + l / 2, iy + l);
      c.fillStyle = '#ffffff';
      c.fillText(`${quota} Q`, ix + l / 2, iy + l);
    }
    c.restore();
  }
  // ritocchi del 07/10: a 0 PV il teschio (nemici) o la croce rossa (PG) sopra il token; `zero`: data/mappa.json → pv_zero
  const icona = p?.aZero && zero ? immagine(p.lato === 'pg' ? zero.pg : zero.nemico) : null;
  if (icona) {
    const l = r * 2 * zero.quota_token;
    c.save();
    if (t.nascosto) c.globalAlpha = 0.45;
    c.drawImage(icona, cx - l / 2, cy - l / 2, l, l);
    c.restore();
  }
  // barretta dei PV (07/10, al posto dell'anello): sul fondo del token, sopra il bordo, larga quanto il quadretto o
  // l'ingombro a PV pieni e più corta in proporzione ai PV persi; `pv`: { stile: data/mappa.json → pv_token, mostra(p) }
  if (pv && p?.pv?.massimo > 0 && pv.mostra(p)) {
    const quota = Math.max(0, Math.min(1, p.pv.attuali / p.pv.massimo));
    const alto = Math.max(pv.stile.spessore_minimo_px, bordo * pv.stile.rispetto_al_bordo);
    const y = (veicolo ? box.y + box.h - (Math.min(box.w, box.h) / 2 - r) : cy + r) - alto / 2;
    c.save();
    c.globalAlpha = t.nascosto ? 0.45 : 1;
    c.fillStyle = pv.stile.traccia;
    c.fillRect(box.x, y, box.w, alto);
    c.fillStyle = pv.stile.colore;
    if (quota > 0) c.fillRect(box.x, y, box.w * quota, alto);
    c.restore();
  }
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
