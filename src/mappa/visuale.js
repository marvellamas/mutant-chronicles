// Linea di visuale e di tiro della mappa di battaglia (fase 2, lotto 3; §9 della specifica). Funzioni pure.
//
// I manuali non danno una regola geometrica per la linea di vista: il Giocatore dà gli effetti della Copertura (§5.8:
// Leggera −2 VA, Media −4 VA, Totale «il bersaglio non può essere attaccato direttamente»; «la Copertura è
// direzionale»), la gittata (§5.11, fasce dei 10, 20, 40… Q) e la diagonale da 1 Q (§5.10, Scarto; A.124). La regola
// sulla griglia è quindi provvisoria e sta nei dati (data/mappa.json → visuale, TODO(Davide) A.140 e A.141):
//   - ostacoli alla vista: i muri e le porte negli stati che bloccano la vista (porte.bloccano_vista; aperte libere);
//   - Copertura «dal centro» (decisione di Marcello del 07/10/2026, al posto di «dagli angoli»): dal centro del Q di chi
//     tira si tracciano cinque linee, verso i quattro angoli e il centro dell'ingombro del bersaglio, e si contano quelle
//     che attraversano un Q ostacolo (sfiorarne il bordo non conta); il numero di linee bloccate (0–5) dà il livello
//     (visuale.copertura_linee). Chi tira con un ingombro grande (2 × 2, 3 × 3, veicoli) parte dal centro del suo Q più
//     favorevole (quello con meno linee bloccate): come sporgersi dal proprio spazio;
//   - i token in mezzo (07/10, A.141 e A.144): per il Giocatore §5.10 «Sparare contro un nemico impegnato in
//     Ravvicinato, protetto da un alleato o che usa un ostaggio impone −4 VA» con la seconda Prova per il bersaglio
//     secondario; il §5.8 parla di ostacoli. Con visuale.token_in_mezzo «protetto» (predefinito, dal manuale) un token
//     attraversato dalla linea fra i centri propone il «bersaglio impegnato o protetto» in «Attacca!», senza Copertura;
//     con «copertura» (proposta di Marcello del 07/10) i token contano come ostacoli nelle cinque linee, con la stessa
//     tabella. Non contano i token a 0 PV o A Terra (sotto la linea) e, per i giocatori, quelli nascosti (contaToken);
//   - distanza fra gli ingombri con la diagonale da 1 Q;
//   - visuale dei PG (nebbia automatica, motore a parte ma stesso punto di partenza): raggi dal centro del Q del PG
//     (di ogni Q, per un ingombro grande) verso il centro di ogni Q entro il raggio, attraversando la griglia
//     Q per Q (si vede il Q ostacolo, non oltre; fra due ostacoli in diagonale non si passa). Le luci (prossimo lotto:
//     penombra, buio) entreranno con `luce`, una funzione del Q che potrà ridurre il raggio o togliere Q.
import { daBase64, cella, impostaCella } from './celle.js';
import { dimensioni, celleToken } from './token.js';
import { distanzaIngombri } from './zoc.js';
import { raggiScoperta } from './luce.js';

/** Ostacoli alla vista: muri disegnati, porte che bloccano la vista; `perGiocatori`: le porte segrete sono muro. */
export function ostacoliVista(scena, regolePorte, { perGiocatori = false } = {}) {
  const { colonne: C, righe: R } = scena.griglia;
  const m = daBase64(scena.muri);
  for (const p of scena.porte ?? []) impostaCella(m, C, R, p.q[0], p.q[1], (perGiocatori && p.segreta) || regolePorte.bloccano_vista.includes(p.stato));
  return m;
}

/**
 * Il segmento a → b (punti in Q) attraversa l'interno di un Q ostacolo? Campioni ogni 1 / `campioni` di Q; i punti sui
 * bordi dei Q (entro `bordo`) contano solo fra due ostacoli, sugli angoli fra due ostacoli in diagonale: una linea che
 * sfiora un muro non è bloccata, una che corre dentro il muro o si infila fra due muri in diagonale sì.
 */
export function segmentoBloccato(ost, C, R, a, b, campioni = 10, bordo = 0.02) {
  const lung = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.ceil(lung * campioni));
  for (let i = 1; i < n; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / n, y = a[1] + ((b[1] - a[1]) * i) / n;
    const qx = Math.floor(x), qy = Math.floor(y);
    const fx = x - qx, fy = y - qy;
    const bx = fx < bordo ? -1 : fx > 1 - bordo ? 1 : 0, by = fy < bordo ? -1 : fy > 1 - bordo ? 1 : 0;
    const m = (dx, dy) => cella(ost, C, R, qx + dx, qy + dy);
    if (!bx && !by) { if (m(0, 0)) return true; continue; }
    // sul bordo fra due Q: bloccata solo se sono ostacoli tutti e due (lungo il muro, non accanto)
    if (bx && !by) { if (m(0, 0) && m(bx, 0)) return true; continue; }
    if (by && !bx) { if (m(0, 0) && m(0, by)) return true; continue; }
    // sull'angolo fra quattro Q: bloccata se due Q opposti in diagonale sono ostacoli (non ci si infila fra i due)
    if ((m(0, 0) && m(bx, by)) || (m(bx, 0) && m(0, by))) return true;
  }
  return false;
}

/** Angoli dell'ingombro del token (in Q). */
const angoli = (t) => { const [w, h] = dimensioni(t.ingombro); const [x, y] = t.q; return [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]; };
/** Centro dell'ingombro (in Q). */
export const centro = (t) => { const [w, h] = dimensioni(t.ingombro); return [t.q[0] + w / 2, t.q[1] + h / 2]; };

/** Centri dei Q dell'ingombro (in Q): i punti da cui può tirare un token grande. */
export const centriQ = (t) => celleToken(t).map(([x, y]) => [x + 0.5, y + 0.5]);
/** I cinque punti del bersaglio: i quattro angoli e il centro del suo ingombro. */
export const puntiBersaglio = (t) => [...angoli(t), centro(t)];

/**
 * Copertura del bersaglio `a` per chi tira da `da` (token: { q, ingombro }), «dal centro»: cinque linee dal centro del
 * Q di chi tira (il più favorevole, per un ingombro grande) ai quattro angoli e al centro del bersaglio.
 * @param regole data/mappa.json → visuale (copertura_linee: livello per 0–5 linee bloccate)
 * @returns { livello: nessuna | leggera | media | totale, bloccate: 0–5, origine: [x, y] in Q, linee: [{ da, a, bloccata }] }
 */
export function copertura(scena, da, a, ost, regole) {
  const { colonne: C, righe: R } = scena.griglia;
  const verso = puntiBersaglio(a);
  let migliore = null;
  for (const p of centriQ(da)) {
    const linee = verso.map((q) => ({ da: p, a: q, bloccata: segmentoBloccato(ost, C, R, p, q, regole.campioni_per_q) }));
    const bloccate = linee.filter((l) => l.bloccata).length;
    if (!migliore || bloccate < migliore.bloccate) migliore = { bloccate, origine: p, linee };
    if (bloccate === 0) break;
  }
  return { livello: regole.copertura_linee[migliore.bloccate], ...migliore };
}

/** Token (diversi da chi tira e dal bersaglio) attraversati dalla linea fra i centri: il «protetto» del §5.10. */
export function tokenInMezzo(scena, da, a, regole) {
  const p = centro(da), q = centro(a);
  const lung = Math.hypot(q[0] - p[0], q[1] - p[1]);
  const n = Math.max(2, Math.ceil(lung * regole.campioni_per_q));
  const celle = new Map();
  for (const t of scena.token) if (t.id !== da.id && t.id !== a.id) for (const [x, y] of celleToken(t)) celle.set(`${x},${y}`, t);
  const r = new Set();
  for (let i = 1; i < n; i++) {
    const x = p[0] + ((q[0] - p[0]) * i) / n, y = p[1] + ((q[1] - p[1]) * i) / n;
    const t = celle.get(`${Math.floor(x)},${Math.floor(y)}`);
    if (t) r.add(t);
  }
  return [...r];
}

/** Maschera dei Q occupati dai token che contano come ostacolo (07/10). */
function maschereToken(scena, tokens) {
  const { colonne: C, righe: R } = scena.griglia;
  const m = new Uint8Array(Math.ceil((C * R) / 8));
  for (const t of tokens) for (const [x, y] of celleToken(t)) impostaCella(m, C, R, x, y, true);
  return m;
}
/** Unione di due maschere. */
function unione(a, b) { const m = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) m[i] = a[i] | b[i]; return m; }

/**
 * La linea di tiro da un token verso un altro token (o verso un Q): distanza (diagonale 1 Q), vista libera o bloccata,
 * Copertura con la causa, token in mezzo. Verso un Q vuoto: il Q come bersaglio di 1 × 1.
 * @param o { contaToken(t): il token conta (in mezzo o come ostacolo)? } — di norma tutti tranne 0 PV e A Terra; per i
 *   giocatori anche i nascosti esclusi, così la linea che vedono non tradisce un token che non vedono
 * @returns { distanza, copertura, bloccate, linee, origine, vista, inMezzo: [token], causa: { muro, token: [token] },
 *   protetto: vero se si propone il «bersaglio impegnato o protetto» (§5.10) }
 */
export function lineaDiTiro(scena, da, verso, ost, regole, { contaToken = () => true } = {}) {
  const a = verso.q ? verso : { id: null, q: verso, ingombro: 1 };
  const { colonne: C, righe: R } = scena.griglia;
  const candidati = scena.token.filter((t) => t.id !== da.id && t.id !== a.id && contaToken(t));
  const comeOstacolo = regole.token_in_mezzo === 'copertura';
  const mt = comeOstacolo && candidati.length ? maschereToken(scena, candidati) : null;
  const cop = copertura(scena, da, a, mt ? unione(ost, mt) : ost, regole);
  // la causa delle linee bloccate: muro (o porta chiusa) prima, poi token
  let muro = 0;
  const tokCausa = new Set();
  for (const l of cop.linee) {
    if (!l.bloccata) continue;
    if (segmentoBloccato(ost, C, R, l.da, l.a, regole.campioni_per_q)) { muro++; l.causa = 'muro'; continue; }
    l.causa = 'token';
    for (const t of candidati) if (segmentoBloccato(maschereToken(scena, [t]), C, R, l.da, l.a, regole.campioni_per_q)) tokCausa.add(t);
  }
  const inMezzo = tokenInMezzo({ ...scena, token: [da, a, ...candidati].filter((t) => t.id) }, da, a, regole);
  return {
    distanza: distanzaIngombri(da.q, da.ingombro, a.q, a.ingombro),
    copertura: cop.livello, bloccate: cop.bloccate, linee: cop.linee, origine: cop.origine,
    vista: cop.livello === 'totale' ? 'bloccata' : cop.livello === 'nessuna' ? 'libera' : 'parziale',
    inMezzo,
    causa: { muro, token: [...tokCausa] },
    protetto: !comeOstacolo && inMezzo.length > 0,
  };
}

/** «Copertura Media (muro + 1 token)», «nessuna Copertura»; per l'etichetta della linea. */
export function testoCopertura(r) {
  const base = { nessuna: 'nessuna Copertura', leggera: 'Copertura Leggera', media: 'Copertura Media', totale: 'Copertura Totale' }[r.copertura];
  if (r.copertura === 'nessuna') return base;
  const parti = [r.causa?.muro ? 'muro' : null, r.causa?.token?.length ? `${r.causa.token.length} token` : null].filter(Boolean);
  return parti.length ? `${base} (${parti.join(' + ')})` : base;
}

/**
 * Q visti dal centro del Q `o` entro `raggio` (metrica «quadretti»: diagonale 1 Q; «euclidea»). Raggio per raggio si
 * attraversano i Q (Amanatides e Woo): il Q ostacolo si vede, oltre no; passando esattamente per un angolo, la vista
 * è chiusa solo se entrambi i Q ai lati sono ostacoli. `fuori` (prossimo lotto, luci): Q che non si vedono comunque.
 * Scrive in `visti` (Uint8Array per Q).
 */
export function qVisti(ost, C, R, o, raggio, metrica, visti = new Uint8Array(C * R), fuori = null, raggioDi = null) {
  const [ox, oy] = o;
  if (ox < 0 || oy < 0 || ox >= C || oy >= R) return visti;
  visti[oy * C + ox] = 1;
  const r = Math.floor(raggio);
  for (let ty = Math.max(0, oy - r); ty <= Math.min(R - 1, oy + r); ty++) {
    for (let tx = Math.max(0, ox - r); tx <= Math.min(C - 1, ox + r); tx++) {
      if (visti[ty * C + tx]) continue;
      const dx = tx - ox, dy = ty - oy;
      if (metrica === 'euclidea' && dx * dx + dy * dy > raggio * raggio) continue;
      // fase 2, lotto 4: il raggio dipende dalla luce del Q visto (src/mappa/luce.js → raggiScoperta)
      if (raggioDi) { const d = metrica === 'euclidea' ? Math.hypot(dx, dy) : Math.max(Math.abs(dx), Math.abs(dy)); if (d > raggioDi(tx, ty)) continue; }
      if (fuori?.(tx, ty)) continue;
      if (raggioLibero(ost, C, R, ox, oy, tx, ty)) visti[ty * C + tx] = 1;
    }
  }
  return visti;
}

/** Il raggio dal centro di (x0, y0) al centro di (x1, y1) arriva al Q d'arrivo senza attraversare ostacoli? */
function raggioLibero(ost, C, R, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const sx = Math.sign(dx), sy = Math.sign(dy);
  const adx = Math.abs(dx), ady = Math.abs(dy);
  // tempi (in frazioni del raggio) per attraversare un Q in x e in y
  const tdx = adx ? 1 / adx : Infinity, tdy = ady ? 1 / ady : Infinity;
  let tmx = adx ? 0.5 / adx : Infinity, tmy = ady ? 0.5 / ady : Infinity;
  let x = x0, y = y0;
  const muro = (a, b) => cella(ost, C, R, a, b);
  while (x !== x1 || y !== y1) {
    if (Math.abs(tmx - tmy) < 1e-9) {
      // per l'angolo: chiuso se ai due lati ci sono ostacoli
      if (muro(x + sx, y) && muro(x, y + sy)) return false;
      x += sx; y += sy; tmx += tdx; tmy += tdy;
    } else if (tmx < tmy) { x += sx; tmx += tdx; } else { y += sy; tmy += tdy; }
    if (x === x1 && y === y1) return true;
    if (muro(x, y)) return false;
  }
  return true;
}

/**
 * Visuale dei PG (nebbia automatica): i Q visti da almeno un Q di uno dei token `origini`, con gli ostacoli `ost`.
 * Con `mappa` (data/mappa.json, fase 2, lotto 4) il raggio dipende dalla luce del Q visto (luci.raggio_scoperta_q:
 * Luce fino a visuale.raggio_q, Penombra 6, Luce scarsa 3, Buio 1), non da quella del PG.
 * @param regole data/mappa.json → visuale ({ raggio_q, metrica })
 */
export function visuale(scena, origini, ost, regole, fuori = null, mappa = null) {
  const { colonne: C, righe: R } = scena.griglia;
  const visti = new Uint8Array(C * R);
  const l = mappa?.luci ? raggiScoperta(scena, { mappa }) : null;
  const raggioDi = l ? (x, y) => Math.min(regole.raggio_q, l.raggio(x, y)) : null;
  const raggio = l ? Math.min(regole.raggio_q, l.massimo) : regole.raggio_q;
  for (const t of origini) for (const q of celleToken(t)) qVisti(ost, C, R, q, raggio, regole.metrica, visti, fuori, raggioDi);
  return visti;
}

/** Nebbia dopo la visuale: i Q visti escono dalla nebbia e restano scoperti (esplorati). Null se nulla cambia. */
export function nebbiaDopoVisuale(coperti64, visti, C, R) {
  const m = daBase64(coperti64);
  let cambiati = 0;
  for (let i = 0; i < C * R; i++) if (visti[i] && (m[i >> 3] & (1 << (i & 7)))) { m[i >> 3] &= ~(1 << (i & 7)); cambiati++; }
  return cambiati ? m : null;
}

/** I token dei PG che guardano (non nascosti): riferimenti ai partecipanti «pg:…». */
// fase 2, lotto 5: un veicolo con un PG a bordo vede come un PG (i PG a bordo guardano dal mezzo)
export const tokenPg = (scena) => scena.token.filter((t) => !t.nascosto && ((t.rif?.tipo === 'partecipante' && String(t.rif.id).startsWith('pg:'))
  || (t.passeggeri ?? []).some((p) => !p.nascosto && String(p.rif?.id).startsWith('pg:'))));
