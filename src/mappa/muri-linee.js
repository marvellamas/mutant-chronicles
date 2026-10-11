// Muri disegnati a mano libera (segnalazione M2 di Davide dell'11/10/2026, dopo la prova con la mappa della chiesa):
// oltre ai muri a quadretto (src/mappa/muri.js, una maschera di Q), un muro può essere un **tratto**: si trascina il
// mouse (o il dito) e il muro segue la linea, anche fuori dalla griglia e più sottile di un quadretto.
//
// Nella scena: scena.muriLinee = [{ id, punti: [[x, y], …], spessore }], con le coordinate in Q frazionari (lo stesso
// sistema dei token e dei template: 1 = un quadretto) e lo spessore in Q, dagli spessori di data/mappa.json →
// muri_linee.spessori (sottile, medio, quadretto). Un tratto ha almeno due punti; i punti troppo vicini si scartano
// mentre si disegna (semplifica), così un tratto lungo resta leggero.
//
// Valgono come i muri a quadretto: bloccano **dove passano**. Linea di tiro e Copertura (src/mappa/visuale.js →
// segmentoBloccato) e nebbia automatica (raggioLibero) li attraversano; il movimento (src/mappa/area.js) non passa
// dove il tratto taglia il passo fra due Q. Si cancellano con la gomma, come gli altri.
//
// La geometria è elementare e tutta qui: incrocio di due segmenti e distanza punto-segmento (per la gomma e per lo
// spessore). Funzioni pure.

/** Spessori dai dati (data/mappa.json → muri_linee.spessori): [{ id, nome, q }]. */
export const spessoriDati = (dati) => dati?.mappa?.muri_linee?.spessori ?? dati?.muri_linee?.spessori ?? [];
/** Lo spessore in Q di un id («sottile», «medio», «quadretto»), o quello predefinito. */
export function spessoreQ(id, dati) {
  const s = spessoriDati(dati);
  return (s.find((x) => x.id === id) ?? s.find((x) => x.id === (dati?.mappa?.muri_linee?.predefinito ?? 'medio')) ?? s[0])?.q ?? 0.2;
}
/** I muri disegnati della scena (sempre un elenco). */
export const lineeDi = (scena) => (Array.isArray(scena?.muriLinee) ? scena.muriLinee : []);

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];

/** Il segmento p→p2 incrocia il segmento q→q2? (estremi compresi, con una tolleranza per i tratti paralleli) */
export function incrociano(p, p2, q, q2, eps = 1e-9) {
  const r = sub(p2, p);
  const s = sub(q2, q);
  const d = cross(r, s);
  const qp = sub(q, p);
  if (Math.abs(d) < eps) {
    // paralleli: contano solo se sono sulla stessa retta e si sovrappongono
    if (Math.abs(cross(qp, r)) > eps) return false;
    const l = r[0] * r[0] + r[1] * r[1];
    if (l < eps) return false;
    const t0 = (qp[0] * r[0] + qp[1] * r[1]) / l;
    const t1 = t0 + (s[0] * r[0] + s[1] * r[1]) / l;
    return Math.max(0, Math.min(t0, t1)) <= Math.min(1, Math.max(t0, t1));
  }
  const t = cross(qp, s) / d;
  const u = cross(qp, r) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/** Distanza fra il punto p e il segmento a→b (in Q). */
export function distanzaPuntoSegmento(p, a, b) {
  const ab = sub(b, a);
  const l = ab[0] * ab[0] + ab[1] * ab[1];
  if (l < 1e-12) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / l;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + ab[0] * t), p[1] - (a[1] + ab[1] * t));
}

/** I tratti (coppie di punti consecutivi) di un muro disegnato: [[a, b], …]. */
export function tratti(linea) {
  const p = linea?.punti ?? [];
  const out = [];
  for (let i = 1; i < p.length; i++) out.push([p[i - 1], p[i]]);
  return out;
}

/** Rettangolo che contiene il muro, allargato dello spessore: { x0, y0, x1, y1 }. */
export function riquadro(linea) {
  const p = linea?.punti ?? [];
  if (!p.length) return null;
  const m = (linea.spessore ?? 0) / 2;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0: x0 - m, y0: y0 - m, x1: x1 + m, y1: y1 + m };
}

const fuoriDaRiquadro = (r, a, b) => !r || Math.max(a[0], b[0]) < r.x0 || Math.min(a[0], b[0]) > r.x1
  || Math.max(a[1], b[1]) < r.y0 || Math.min(a[1], b[1]) > r.y1;

/**
 * Il segmento a→b (in Q) è tagliato da uno dei muri disegnati? È il test che usano linea di tiro, Copertura,
 * nebbia automatica e movimento: un muro blocca dove passa.
 * @param linee scena.muriLinee (o il sottoinsieme già filtrato, per esempio senza i pezzi delle porte aperte)
 */
export function attraversa(linee, a, b) {
  for (const l of linee ?? []) {
    if (fuoriDaRiquadro(riquadro(l), a, b)) continue;
    for (const [p, q] of tratti(l)) if (incrociano(a, b, p, q)) return true;
  }
  return false;
}

/** Il primo muro disegnato che taglia il segmento a→b, o null (per il disegno e i messaggi). */
export function primoAttraversato(linee, a, b) {
  for (const l of linee ?? []) {
    if (fuoriDaRiquadro(riquadro(l), a, b)) continue;
    for (const [p, q] of tratti(l)) if (incrociano(a, b, p, q)) return l;
  }
  return null;
}

/** I muri disegnati che passano entro `raggio` Q dal punto p (la gomma, e il muro su cui agganciare una porta). */
export function lineeVicine(linee, p, raggio) {
  const out = [];
  for (const l of linee ?? []) {
    let d = Infinity;
    for (const [a, b] of tratti(l)) d = Math.min(d, distanzaPuntoSegmento(p, a, b));
    if (d <= raggio + (l.spessore ?? 0) / 2) out.push({ linea: l, distanza: d });
  }
  return out.sort((x, y) => x.distanza - y.distanza);
}

/** Il muro disegnato più vicino al punto p entro `raggio` Q, con il punto agganciato sul tratto, o null. */
export function aggancioSuLinea(linee, p, raggio) {
  let migliore = null;
  for (const l of linee ?? []) {
    for (const [a, b] of tratti(l)) {
      const ab = sub(b, a);
      const len2 = ab[0] * ab[0] + ab[1] * ab[1];
      const t = len2 < 1e-12 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / len2));
      const punto = [a[0] + ab[0] * t, a[1] + ab[1] * t];
      const d = Math.hypot(p[0] - punto[0], p[1] - punto[1]);
      if (d <= raggio && (!migliore || d < migliore.distanza)) migliore = { muro: l.id, punto, da: a, a: b, spessore: l.spessore, distanza: d };
    }
  }
  return migliore;
}

/**
 * I muri disegnati con un buco dove passa una porta aperta (M3): la porta agganciata a un tratto apre un passaggio
 * larga quanto il suo vano, e il resto del muro continua a bloccare. Si usa per la vista (src/mappa/visuale.js →
 * lineeVista) e per il movimento (src/mappa/porte.js → lineeEffettive); per il disegno il vano lo disegna la porta.
 * @param porte [{ aggancio: { muro, punto, larghezza? } }] le sole porte che aprono (aperte, non segrete)
 */
export function bucaConPorte(linee, porte, larghezzaPredefinita = 1) {
  const buchi = new Map();
  for (const p of porte ?? []) {
    const a = p.aggancio;
    if (!a?.muro || !Array.isArray(a.punto)) continue;
    if (!buchi.has(a.muro)) buchi.set(a.muro, []);
    buchi.get(a.muro).push({ centro: a.punto, raggio: (a.larghezza ?? larghezzaPredefinita) / 2 });
  }
  if (!buchi.size) return linee ?? [];
  const out = [];
  for (const l of linee ?? []) {
    const b = buchi.get(l.id);
    if (!b?.length) { out.push(l); continue; }
    let n = 0;
    for (const [a, c] of tratti(l)) {
      for (const pezzo of pezziFuoriDaiBuchi(a, c, b)) {
        out.push({ id: `${l.id}:${n++}`, punti: pezzo, spessore: l.spessore });
      }
    }
  }
  return out;
}

/** I pezzi del tratto a→b che restano fuori dai buchi (cerchi): [[p, q], …]. */
function pezziFuoriDaiBuchi(a, b, buchi) {
  // si lavora sul parametro t del tratto: si toglie l'intervallo coperto da ogni buco
  let intervalli = [[0, 1]];
  for (const { centro, raggio } of buchi) {
    const dentro = intervalloNelCerchio(a, b, centro, raggio);
    if (!dentro) continue;
    const prossimi = [];
    for (const [t0, t1] of intervalli) {
      if (dentro[1] <= t0 || dentro[0] >= t1) { prossimi.push([t0, t1]); continue; }
      if (dentro[0] > t0) prossimi.push([t0, dentro[0]]);
      if (dentro[1] < t1) prossimi.push([dentro[1], t1]);
    }
    intervalli = prossimi;
  }
  const punto = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  return intervalli.filter(([t0, t1]) => t1 - t0 > 1e-6).map(([t0, t1]) => [punto(t0), punto(t1)]);
}

/** L'intervallo [t0, t1] del tratto a→b che sta nel cerchio (centro, raggio), oppure null. */
function intervalloNelCerchio(a, b, centro, raggio) {
  const d = sub(b, a);
  const f = sub(a, centro);
  const A = d[0] * d[0] + d[1] * d[1];
  if (A < 1e-12) return Math.hypot(f[0], f[1]) <= raggio ? [0, 1] : null;
  const B = 2 * (f[0] * d[0] + f[1] * d[1]);
  const C = f[0] * f[0] + f[1] * f[1] - raggio * raggio;
  const disc = B * B - 4 * A * C;
  if (disc <= 0) return null;
  const r = Math.sqrt(disc);
  const t0 = Math.max(0, (-B - r) / (2 * A));
  const t1 = Math.min(1, (-B + r) / (2 * A));
  return t1 > t0 ? [t0, t1] : null;
}

/** Un punto nuovo si aggiunge al tratto solo se è abbastanza lontano dall'ultimo (semplifica mentre si disegna). */
export const abbastanzaLontano = (ultimo, p, minimo) => !ultimo || Math.hypot(p[0] - ultimo[0], p[1] - ultimo[1]) >= minimo;

/** Muro disegnato nuovo (id dato da chi chiama, come per i template e le porte). */
export const nuovaLinea = ({ id, punti, spessore }) => ({ id, punti: punti.map(([x, y]) => [arrotonda(x), arrotonda(y)]), spessore });
/** Due decimali: i file restano leggeri e leggibili (un centesimo di Q è 1,5 cm). */
const arrotonda = (v) => Math.round(v * 100) / 100;

/** La scena con un muro disegnato in più (una voce di «annulla» la aggiunge chi chiama). */
export function conLinea(scena, linea, massimo = Infinity) {
  const linee = [...lineeDi(scena), linea];
  if (linee.length > massimo) return scena;
  return { ...scena, muriLinee: linee };
}

/** La scena senza i muri disegnati indicati (gomma). */
export function senzaLinee(scena, ids) {
  const via = new Set(ids);
  if (!via.size) return scena;
  return { ...scena, muriLinee: lineeDi(scena).filter((l) => !via.has(l.id)) };
}

/**
 * Gli id dei muri disegnati che il rettangolo fra a e b prende (gomma a rettangolo): quelli con un punto dentro, o con
 * un tratto che ne attraversa un lato. Gli estremi sono in Q frazionari, in qualunque ordine.
 */
export function lineeNelRettangolo(linee, a, b) {
  const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]);
  const y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
  const dentro = ([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const lati = [[[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]]];
  const out = [];
  for (const l of linee ?? []) {
    if (!Array.isArray(l?.punti)) continue;
    const preso = l.punti.some(dentro) || tratti(l).some(([p, p2]) => lati.some(([c, c2]) => incrociano(p, p2, c, c2)));
    if (preso) out.push(l.id);
  }
  return out;
}

/**
 * La scena con i muri disegnati aggiunti e/o togliti, e la sua voce di «annulla» (compatta: gli id aggiunti e i muri
 * togliti per intero). Niente da fare, o più di `linee_max` muri: la scena com'è.
 * @param dati regole dell'app (data/mappa.json)
 */
export function conMuriLinee(scena, { aggiungi = [], togli = [] }, dati, adesso = new Date()) {
  const regole = dati?.mappa?.muri_linee ?? {};
  const presenti = lineeDi(scena);
  const via = new Set(togli);
  const tolte = presenti.filter((l) => via.has(l.id));
  const ids = new Set(presenti.map((l) => l.id));
  const nuove = aggiungi.filter((l) => l && !ids.has(l.id));
  if (!tolte.length && !nuove.length) return scena;
  const linee = [...presenti.filter((l) => !via.has(l.id)), ...nuove];
  if (linee.length > (regole.linee_max ?? Infinity)) return scena;
  const voce = { tipo: 'muri-linee', aggiunte: nuove.map((l) => l.id), tolte, quando: adesso.toISOString() };
  return {
    ...scena,
    muriLinee: linee,
    annulla: [...(scena.annulla ?? []), voce].slice(-(dati?.mappa?.scena?.annulla_max ?? 50)),
  };
}

/**
 * Errore di forma di un muro disegnato (null se va bene).
 * @param regole data/mappa.json → muri_linee
 */
export function erroreLinea(l, regole, colonne, righe) {
  if (!l || typeof l.id !== 'string' || !/^[a-zA-Z0-9:_-]{1,80}$/.test(l.id)) return 'id mancante';
  if (!Array.isArray(l.punti) || l.punti.length < 2 || l.punti.length > (regole?.punti_max ?? 2000)) return `punti: da 2 a ${regole?.punti_max ?? 2000}`;
  const m = (regole?.margine_q ?? 2);
  for (const p of l.punti) {
    if (!Array.isArray(p) || p.length !== 2 || !p.every((v) => typeof v === 'number' && Number.isFinite(v))) return 'punti: coppie di numeri in Q';
    // si disegna anche appena fuori dalla griglia (il muro sul bordo), non all'infinito
    if (p[0] < -m || p[1] < -m || p[0] > colonne + m || p[1] > righe + m) return 'punti: dentro la griglia (o appena fuori)';
  }
  const q = (regole?.spessori ?? []).map((s) => s.q);
  if (!(typeof l.spessore === 'number' && l.spessore > 0 && l.spessore <= (regole?.spessore_max_q ?? 1))) return `spessore: da 0 a ${regole?.spessore_max_q ?? 1} Q`;
  if (q.length && !q.some((x) => Math.abs(x - l.spessore) < 1e-6)) return `spessore: uno fra ${q.join(', ')} Q`;
  return null;
}

/** Problema nei dati dei muri disegnati (data/mappa.json → muri_linee), o null. Lo usa src/validate.js. */
export function erroreDatiMuriLinee(M) {
  if (!M || typeof M !== 'object') return { chiave: 'muri_linee', problema: 'oggetto mancante' };
  if (!Array.isArray(M.spessori) || !M.spessori.length) return { chiave: 'muri_linee.spessori', problema: 'elenco degli spessori mancante' };
  const ids = new Set();
  for (const [i, s] of M.spessori.entries()) {
    const k = `muri_linee.spessori[${i}]`;
    if (typeof s?.id !== 'string' || !s.id) return { chiave: `${k}.id`, problema: 'id mancante' };
    if (ids.has(s.id)) return { chiave: `${k}.id`, problema: `«${s.id}» ripetuto` };
    ids.add(s.id);
    if (typeof s.nome !== 'string' || !s.nome.trim()) return { chiave: `${k}.nome`, problema: 'nome per il pannello mancante' };
    if (!(typeof s.q === 'number' && s.q > 0 && s.q <= (M.spessore_max_q ?? 1))) return { chiave: `${k}.q`, problema: `spessore in Q da 0 a ${M.spessore_max_q ?? 1}` };
  }
  if (!ids.has(M.predefinito)) return { chiave: 'muri_linee.predefinito', problema: `uno fra ${[...ids].join(', ')}` };
  for (const [k, min] of [['linee_max', 1], ['punti_max', 2], ['punto_minimo_q', 0], ['gomma_raggio_q', 0], ['spessore_max_q', 0], ['margine_q', 0]]) {
    const v = M[k];
    if (!(typeof v === 'number' && v > min - 1e-9)) return { chiave: `muri_linee.${k}`, problema: `numero da ${min} in su` };
  }
  return null;
}
