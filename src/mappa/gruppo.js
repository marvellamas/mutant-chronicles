// Selezione multipla e spostamento di gruppo sulla mappa (richiesta di Marcello del 07/10/2026: piazzare in fretta tutti i
// PG o i nemici). Regola delle scorciatoie: Maiusc = movimento libero, per un token come per un gruppo. Lo spostamento di
// gruppo è sempre libero: niente conteggio dei Q, niente ZoC né Attacchi di Opportunità; la formazione resta; un token il
// cui quadretto d'arrivo è fuori dalla griglia, murato o occupato va al quadretto libero più vicino. Una sola voce di
// Ctrl+Z per tutto il gruppo. Funzioni pure.
import { dimensioni, celleToken } from './token.js';
import { cella } from './celle.js';

/**
 * I token il cui ingombro tocca il rettangolo fra i punti a e b (in Q, anche frazionari: il trascinamento del mouse).
 * @returns [id]
 */
export function tokenNelRettangolo(scena, a, b) {
  const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
  return scena.token.filter((t) => {
    const [w, h] = dimensioni(t.ingombro);
    return t.q[0] < x1 && t.q[0] + w > x0 && t.q[1] < y1 && t.q[1] + h > y0;
  }).map((t) => t.id);
}

/** Aggiunge o toglie un token dalla selezione (Maiusc+clic). */
export function alternaSelezione(selezione, id) {
  const s = new Set(selezione);
  if (s.has(id)) s.delete(id); else s.add(id);
  return s;
}

/**
 * Sposta insieme i token `ids` di `delta` ([dx, dy] in Q), mantenendo la formazione.
 * @param ostacoli maschera dei muri effettivi (muri e porte chiuse: src/mappa/porte.js → muriEffettivi)
 * @returns { scena, mossi: [{ id, da, a }], aggiustati: [{ id, voluto, a }], fermi: [id] } — scena con la voce di Ctrl+Z
 *   { tipo: 'gruppo', prima: [{ id, q }] }; nessun cambiamento: la scena com'è e mossi vuoto
 */
export function spostaGruppo(scena, ids, delta, ostacoli, dati, adesso = new Date()) {
  const { colonne: C, righe: R } = scena.griglia;
  const [dx, dy] = delta;
  const nelGruppo = new Set(ids);
  const gruppo = scena.token.filter((t) => nelGruppo.has(t.id));
  if (!gruppo.length || (!dx && !dy)) return { scena, mossi: [], aggiustati: [], fermi: [] };
  // Q occupati da chi non si muove; quelli del gruppo si liberano e si riempiono man mano
  const occupati = new Set(scena.token.filter((t) => !nelGruppo.has(t.id)).flatMap((t) => celleToken(t).map(([x, y]) => `${x},${y}`)));
  const libera = (t, q) => {
    const [w, h] = dimensioni(t.ingombro);
    if (q[0] < 0 || q[1] < 0 || q[0] + w > C || q[1] + h > R) return false;
    // i quadretti veri (anche di un veicolo ruotato, 08/10)
    for (const [x, y] of celleToken({ ...t, q })) if (occupati.has(`${x},${y}`) || cella(ostacoli, C, R, x, y)) return false;
    return true;
  };
  // il quadretto libero più vicino a quello voluto: anelli crescenti (diagonale 1 Q), a parità il più vicino in linea retta
  const vicina = (t, q) => {
    for (let r = 1; r < Math.max(C, R); r++) {
      const anello = [];
      for (let y = q[1] - r; y <= q[1] + r; y++) for (let x = q[0] - r; x <= q[0] + r; x++) {
        if (Math.max(Math.abs(x - q[0]), Math.abs(y - q[1])) === r && libera(t, [x, y])) anello.push([x, y]);
      }
      if (anello.length) return anello.sort((a, b) => Math.hypot(a[0] - q[0], a[1] - q[1]) - Math.hypot(b[0] - q[0], b[1] - q[1]))[0];
    }
    return null;
  };
  const mossi = [];
  const aggiustati = [];
  const fermi = [];
  const nuove = new Map();
  // prima chi va più avanti nella direzione dello spostamento, così la formazione non si blocca da sola
  const ordine = [...gruppo].sort((a, b) => (b.q[0] * Math.sign(dx) + b.q[1] * Math.sign(dy)) - (a.q[0] * Math.sign(dx) + a.q[1] * Math.sign(dy)));
  for (const t of ordine) {
    const voluto = [t.q[0] + dx, t.q[1] + dy];
    let a = libera(t, voluto) ? voluto : vicina(t, voluto);
    if (!a) { a = t.q; fermi.push(t.id); }
    else if (a !== voluto) aggiustati.push({ id: t.id, voluto, a });
    nuove.set(t.id, a);
    for (const [x, y] of celleToken({ ...t, q: a })) occupati.add(`${x},${y}`);
    if (a[0] !== t.q[0] || a[1] !== t.q[1]) mossi.push({ id: t.id, da: [...t.q], a: [...a] });
  }
  if (!mossi.length) return { scena, mossi, aggiustati, fermi };
  const token = scena.token.map((t) => (nuove.has(t.id) ? { ...t, q: [...nuove.get(t.id)] } : t));
  const voce = { tipo: 'gruppo', prima: gruppo.map((t) => ({ id: t.id, q: [...t.q] })), quando: adesso.toISOString() };
  return { scena: { ...scena, token, annulla: [...scena.annulla, voce].slice(-dati.mappa.scena.annulla_max) }, mossi, aggiustati, fermi };
}

/** Ctrl+Z dello spostamento di gruppo: tutti dov'erano (i token tolti nel frattempo si ignorano). */
export function annullaGruppo(scena, voce) {
  const prima = new Map(voce.prima.map((x) => [x.id, x.q]));
  return { ...scena, token: scena.token.map((t) => (prima.has(t.id) ? { ...t, q: [...prima.get(t.id)] } : t)) };
}
