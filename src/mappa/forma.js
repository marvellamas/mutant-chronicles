// Veicoli ruotati sulla mappa di battaglia (richiesta di Marcello dell'08/10/2026): il veicolo è un rettangolo
// lungo × largo (in Q) con il muso verso `angolo` gradi, contati in senso orario da «in alto» (0 = muso in alto,
// 90 = a destra, 180 = in basso, 270 = a sinistra). Con angoli non retti i quadretti occupati sono quelli coperti per
// almeno metà dal rettangolo ruotato: la stessa regola dei template (src/mappa/template.js → qCoperto), misurata su
// CAMPIONI × CAMPIONI punti per Q (data/mappa.json → template.campioni_per_lato; tests/mappa-forma.test.js li tiene
// uguali). L'immagine ruota liscia; movimento, collisioni, linea di tiro, discesa e vista usano questi quadretti.
//
// Nel token (src/mappa/scena.js): angolo (intero 0–359), base [lungo, largo] e perno (il centro delle rotazioni di seguito); ingombro è il rettangolo che contiene i
// quadretti occupati e q il suo Q in alto a sinistra. Il centro del veicolo cade sempre su un incrocio o sul centro di
// un Q (la scelta con il numero di quadretti più vicino all'area vera del mezzo), così la forma dipende solo da base e angolo e si sposta con il token.
// Le scene di prima (direzione 'n' | 'e' | 's' | 'o', nessun angolo) restano valide: sono gli angoli retti.
// Funzioni pure.

export const CAMPIONI = 8;
const DIREZIONE_ANGOLO = { n: 0, e: 90, s: 180, o: 270 };

/** Angolo normalizzato a 0–359. */
export const normaAngolo = (a) => ((Math.round(a) % 360) + 360) % 360;

/** Angolo retto (0, 90, 180, 270)? */
export const retto = (a) => normaAngolo(a) % 90 === 0;

/** Base [lungo, largo] da un ingombro [colonne, righe]. */
export const baseDaIngombro = (ing) => { const [a, b] = Array.isArray(ing) ? ing : [ing ?? 1, ing ?? 1]; return [Math.max(a, b), Math.min(a, b)]; };

/** Il token ha la forma ruotata (angolo e base)? */
export const ruotato = (t) => Number.isInteger(t?.angolo) && Array.isArray(t?.base);

/**
 * Angolo del muso del token: il campo angolo; altrimenti dalla direzione delle scene di prima; altrimenti dall'ingombro
 * (più largo che alto: a destra; se no in basso, come l'immagine dei mezzi).
 */
export function angoloDi(t) {
  if (Number.isInteger(t?.angolo)) return normaAngolo(t.angolo);
  if (t?.direzione in DIREZIONE_ANGOLO) return DIREZIONE_ANGOLO[t.direzione];
  const ing = Array.isArray(t?.ingombro) ? t.ingombro : [t?.ingombro ?? 1, t?.ingombro ?? 1];
  return ing[0] > ing[1] ? 90 : 180;
}

/** La direzione più vicina all'angolo, fra le quattro delle scene di prima. */
export const direzioneVicina = (a) => ['n', 'e', 's', 'o'][Math.round(normaAngolo(a) / 90) % 4];

const cache = new Map();

/**
 * Quadretti occupati da un rettangolo base = [lungo, largo] con il muso verso `angolo`.
 * @returns { ingombro: [colonne, righe], celle: [[dx, dy], …] relative al Q in alto a sinistra, centro: [cx, cy] del
 *   veicolo relativo allo stesso Q (in Q), vertici: i quattro angoli del rettangolo relativi allo stesso Q }
 */
export function formaRuotata(base, angolo, campioni = CAMPIONI) {
  const [L, W] = base;
  const a = normaAngolo(angolo);
  const chiave = `${L}x${W}@${a}/${campioni}`;
  if (cache.has(chiave)) return cache.get(chiave);
  const rad = (a * Math.PI) / 180;
  // muso (asse lungo) e fianco (asse largo) in coordinate della mappa (y verso il basso)
  const d = [Math.sin(rad), -Math.cos(rad)];
  const p = [Math.cos(rad), Math.sin(rad)];
  const EPS = 1e-9;
  const dentro = (x, y) => Math.abs(x * d[0] + y * d[1]) <= L / 2 + EPS && Math.abs(x * p[0] + y * p[1]) <= W / 2 + EPS;
  const vertici = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([s, t]) => [s * (L / 2) * d[0] + t * (W / 2) * p[0], s * (L / 2) * d[1] + t * (W / 2) * p[1]]);
  let migliore = null;
  // il centro su un incrocio (0) o sul centro di un Q (0,5), in x e in y
  for (const ox of [0, 0.5]) for (const oy of [0, 0.5]) {
    const xs = vertici.map((v) => v[0] + ox), ys = vertici.map((v) => v[1] + oy);
    const x0 = Math.floor(Math.min(...xs) - EPS), x1 = Math.ceil(Math.max(...xs) + EPS);
    const y0 = Math.floor(Math.min(...ys) - EPS), y1 = Math.ceil(Math.max(...ys) + EPS);
    const celle = [];
    let coperti = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      let n = 0;
      for (let i = 0; i < campioni; i++) for (let j = 0; j < campioni; j++) if (dentro(x + (i + 0.5) / campioni - ox, y + (j + 0.5) / campioni - oy)) n++;
      if (n * 2 >= campioni * campioni) { celle.push([x, y]); coperti += n; }
    }
    // il numero di quadretti più vicino all'area vera (lungo × largo); a parità, quello che il mezzo copre di più
    const scarto = Math.abs(celle.length - L * W);
    if (!migliore || scarto < migliore.scarto || (scarto === migliore.scarto && coperti > migliore.coperti)) migliore = { celle, ox, oy, scarto, coperti };
  }
  const mx = Math.min(...migliore.celle.map((c) => c[0])), my = Math.min(...migliore.celle.map((c) => c[1]));
  const Mx = Math.max(...migliore.celle.map((c) => c[0])), My = Math.max(...migliore.celle.map((c) => c[1]));
  const r = {
    ingombro: [Mx - mx + 1, My - my + 1],
    celle: migliore.celle.map(([x, y]) => [x - mx, y - my]),
    centro: [migliore.ox - mx, migliore.oy - my],
    vertici: vertici.map(([x, y]) => [x + migliore.ox - mx, y + migliore.oy - my]),
  };
  cache.set(chiave, r);
  return r;
}

/** La forma del token ruotato (o null per i rettangoli allineati: creature e veicoli delle scene di prima). */
export const formaDi = (t) => (ruotato(t) ? formaRuotata(t.base, t.angolo) : null);

/**
 * Il veicolo girato di `gradi` (positivi in senso orario) attorno al suo centro, dentro la griglia. Le scene di prima
 * (direzione e ingombro) passano alla forma con angolo e base. Restituisce il token nuovo, senza controllare ostacoli.
 */
export function ruotaDi(t, gradi, { colonne, righe }) {
  const base = Array.isArray(t.base) ? t.base : baseDaIngombro(t.ingombro);
  const prima = formaDi(t);
  // centro attuale in Q (assoluto)
  const [w0, h0] = Array.isArray(t.ingombro) ? t.ingombro : [t.ingombro, t.ingombro];
  const qui = prima ? [t.q[0] + prima.centro[0], t.q[1] + prima.centro[1]] : [t.q[0] + w0 / 2, t.q[1] + h0 / 2];
  // il perno delle rotazioni di seguito: senza, a ogni passo l'arrotondamento sposterebbe il mezzo (si perde quando il
  // veicolo si muove: il centro torna quello della sua posizione)
  const perno = Array.isArray(t.perno) && Math.hypot(t.perno[0] - qui[0], t.perno[1] - qui[1]) <= 0.75 ? t.perno : qui;
  const c = perno;
  const angolo = normaAngolo(angoloDi(t) + gradi);
  const f = formaRuotata(base, angolo);
  const [w, h] = f.ingombro;
  const x = Math.max(0, Math.min(colonne - w, Math.round(c[0] - f.centro[0])));
  const y = Math.max(0, Math.min(righe - h, Math.round(c[1] - f.centro[1])));
  const { direzione: _d, ...resto } = t;
  return { ...resto, angolo, base: [...base], ingombro: [w, h], q: [x, y], perno: [c[0], c[1]] };
}

/** Errore di forma di un token ruotato (null se va bene o se non è ruotato): angolo, base e ingombro coerenti. */
export function erroreForma(t) {
  if (t.angolo === undefined && t.base === undefined) return null;
  if (t.rif?.tipo !== 'veicolo') return 'angolo e base: solo per i veicoli';
  if (!Number.isInteger(t.angolo) || t.angolo < 0 || t.angolo > 359) return 'angolo: intero da 0 a 359';
  if (!Array.isArray(t.base) || t.base.length !== 2 || !t.base.every((n) => Number.isInteger(n) && n >= 1) || t.base[0] < t.base[1]) return 'base: [lungo, largo] interi, lungo ≥ largo';
  if (t.direzione !== undefined) return 'direzione e angolo insieme: basta l’angolo';
  if (t.perno !== undefined && !(Array.isArray(t.perno) && t.perno.length === 2 && t.perno.every((n) => typeof n === 'number' && Number.isFinite(n)))) return 'perno: [x, y] in Q';
  const f = formaRuotata(t.base, t.angolo);
  if (!Array.isArray(t.ingombro) || t.ingombro[0] !== f.ingombro[0] || t.ingombro[1] !== f.ingombro[1]) return `ingombro: con angolo ${t.angolo}° e base ${t.base.join(' × ')} è ${f.ingombro.join(' × ')}`;
  return null;
}
