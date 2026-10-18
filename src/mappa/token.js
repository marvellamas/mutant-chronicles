// Token della mappa di battaglia (§7 della specifica; lotti 1 e 3 di docs/battlemap/piano.md). Il token non ricopia i
// dati del partecipante: nome, ritratto, PV, Stati e turno si leggono dallo scontro, dalle schede dei PG o dal
// registro dei veicoli a ogni disegno (src/mappa/partecipanti.js). Nel file della scena restano il riferimento
// (rif: { tipo: 'partecipante' | 'veicolo' | 'segnaposto', id }), la posizione (q: il Q in alto a sinistra
// dell'ingombro), l'ingombro in Q e il «nascosto» del master.
// Ingombro: un intero (lato di un quadrato: creature) oppure [colonne, righe] (veicoli, rettangolari). Un veicolo
// ruotato (08/10, src/mappa/forma.js: angolo e base) occupa solo i quadretti della sua forma, dentro quel rettangolo.
// Funzioni pure.
import { formaDi } from './forma.js';

/** «2 × 3 Q» → [2, 3]; «1 Q» → [1, 1]; altro → null (A.126, A.167: anche rettangolare e oltre 3 × 3). */
export function parseSpazio(testo) {
  const m = /^(?:1 Q|([1-9][0-9]?) × ([1-9][0-9]?) Q)$/.exec(String(testo ?? ''));
  if (!m) return null;
  return m[1] ? [Number(m[1]), Number(m[2])] : [1, 1];
}

/** Il nome dello spazio di un profilo («2 × 2 Q»), o null se non lo indica (A.126). */
export const spazioDi = (scheda) => (typeof scheda?.spazio === 'string' && scheda.spazio ? scheda.spazio : null);

/**
 * Lato del token in Q dal profilo della creatura (A.126, A.167): si usa il campo «spazio» (data/formato_nemici.json,
 * «1 Q» o «larghezza × lunghezza Q»), che non si deduce dalla Taglia. Un profilo senza il campo tiene il lato della
 * Taglia (token.ingombro_per_taglia), come prima: i nemici di sempre non cambiano. Il master può sempre cambiarlo sul
 * token.
 * Ripiego (18/10, finché la mappa non disegna le sagome vere): per uno spazio che non è un quadrato ammesso (6 × 6,
 * 2 × 1, 3 × 10…) il quadrato ammesso più grande che non supera il lato maggiore dell'ingombro dichiarato (Roc 6 × 6 → 3 × 3,
 * Worg 2 × 1 → 2 × 2) — un mostro enorme che occupa un quadretto è peggio di uno un po' troppo grande.
 * @param scheda il profilo del nemico, oppure la sola Taglia (come prima)
 */
export function ingombroDaTaglia(scheda, dati) {
  const T = dati?.mappa?.token ?? {};
  const profilo = scheda !== null && typeof scheda === 'object' ? scheda : { taglia: scheda };
  const dim = parseSpazio(profilo?.spazio);
  if (dim) {
    const massimo = Math.max(...dim);
    const ammessi = (T.ingombri_ammessi ?? [1]).filter((n) => n <= massimo);
    return ammessi.length ? Math.max(...ammessi) : 1;
  }
  return T.ingombro_per_taglia?.[profilo?.taglia] ?? 1;
}

/**
 * Ingombro vero del token di una creatura (A.126, A.167): quello del campo «spazio» del profilo, anche rettangolare e
 * oltre 3 × 3 — un intero per un quadrato (lato), [colonne, righe] per un rettangolo, nell'orientamento scritto —; senza
 * il campo, il lato della Taglia (come prima). Al massimo token.creatura_ingombro_max per lato.
 */
export function ingombroCreatura(scheda, dati) {
  const dim = parseSpazio(spazioDi(scheda));
  if (!dim) return ingombroDaTaglia(scheda, dati);
  const max = dati?.mappa?.token?.creatura_ingombro_max ?? 12;
  const [w, h] = dim.map((n) => Math.min(max, n));
  return w === h ? w : [w, h];
}

/**
 * A.126, 16/10/2026: lo spazio che la pedina occupa davvero, con la provenienza — così la mini-scheda lo dice
 * sempre, anche per i profili che hanno solo la Taglia (segnalazione di Marcello: «Sgorbio delle Vasche»
 * Grande, pedina 2 × 2, mini-scheda muta).
 * @returns {{ lato, testo, dalProfilo, fonte, ripiego }} fonte: 'profilo' | 'taglia'; ripiego: la pedina è più
 *   piccola dello spazio dichiarato
 */
export function spazioEffettivo(scheda, dati) {
  const dim = parseSpazio(spazioDi(scheda));
  const lato = dim ? Math.max(...dim) : ingombroDaTaglia(scheda ?? null, dati);
  const dalProfilo = !!dim;
  const ripiego = false; // dal 18/10 la pedina ha la sagoma dichiarata (A.167)
  return {
    lato,
    testo: dalProfilo ? spazioDi(scheda) : `${lato} × ${lato} Q`,
    dalProfilo,
    fonte: dalProfilo ? 'profilo' : 'taglia',
    ripiego,
  };
}

/**
 * Ingombro di un veicolo [colonne, righe] dal suo profilo (data/veicoli.json → profili[].dimensioni.ingombro_q,
 * «3 × 2»), oppure dalle misure in metri (1 Q = 1,5 m), oppure quello predefinito dei dati.
 */
export function ingombroVeicolo(profilo, dati) {
  const T = dati.mappa.token;
  const max = T.veicolo_ingombro_max;
  const limita = (n) => Math.max(1, Math.min(max, n));
  const m = /^\s*(\d+)\s*[×x]\s*(\d+)\s*$/.exec(String(profilo?.dimensioni?.ingombro_q ?? ''));
  if (m) return [limita(Number(m[1])), limita(Number(m[2]))];
  const d = profilo?.dimensioni;
  if (d?.lunghezza_m > 0 && d?.larghezza_m > 0) return [limita(Math.ceil(d.lunghezza_m / dati.mappa.q_metri)), limita(Math.ceil(d.larghezza_m / dati.mappa.q_metri))];
  return [...T.veicolo_predefinito];
}

/** Ingombro come [colonne, righe]. */
export const dimensioni = (ingombro) => (Array.isArray(ingombro) ? [ingombro[0], ingombro[1]] : [ingombro ?? 1, ingombro ?? 1]);

/** Q occupati dal token: [[x, y], …] (per un veicolo ruotato, i quadretti della sua forma). */
export function celleToken(t) {
  const [x0, y0] = t.q;
  const f = formaDi(t);
  if (f) return f.celle.map(([dx, dy]) => [x0 + dx, y0 + dy]);
  const [w, h] = dimensioni(t?.ingombro);
  const r = [];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) r.push([x, y]);
  return r;
}

/** Il token sta tutto dentro la griglia? */
export function tokenDentro(t, colonne, righe) {
  const [w, h] = dimensioni(t?.ingombro);
  const [x, y] = t?.q ?? [];
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x + w <= colonne && y + h <= righe;
}

/**
 * Aggancio alla griglia (§7: «sempre al centro di un quadretto»): il token di ingombro dato, con il centro nel punto
 * (mx, my) della mappa, va sui Q più vicini e resta dentro la griglia. Un ingombro dispari si centra sul Q sotto il
 * punto, uno pari sull'incrocio più vicino. Restituisce q = [x, y] del Q in alto a sinistra.
 */
export function agganciaQ(griglia, mx, my, ingombro) {
  const [w, h] = dimensioni(ingombro);
  const { q_px: q, scosto_x: sx, scosto_y: sy, colonne, righe } = griglia;
  const x = Math.round((mx - sx) / q - w / 2);
  const y = Math.round((my - sy) / q - h / 2);
  return [Math.max(0, Math.min(colonne - w, x)), Math.max(0, Math.min(righe - h, y))];
}

/** Centro del token in pixel della mappa. */
export function centroToken(griglia, t) {
  const f = formaDi(t);
  if (f) return { x: griglia.scosto_x + (t.q[0] + f.centro[0]) * griglia.q_px, y: griglia.scosto_y + (t.q[1] + f.centro[1]) * griglia.q_px };
  const [w, h] = dimensioni(t.ingombro);
  return { x: griglia.scosto_x + (t.q[0] + w / 2) * griglia.q_px, y: griglia.scosto_y + (t.q[1] + h / 2) * griglia.q_px };
}

/** Il punto (mx, my) della mappa cade dentro l'ingombro del token? */
export function tokenSottoPunto(griglia, t, mx, my) {
  // veicolo ruotato: il punto deve cadere nel mezzo disegnato (il rettangolo ruotato) o in uno dei suoi quadretti, non
  // negli angoli vuoti del rettangolo che lo contiene
  const f = formaDi(t);
  if (f) {
    const px = (mx - griglia.scosto_x) / griglia.q_px - t.q[0] - f.centro[0], py = (my - griglia.scosto_y) / griglia.q_px - t.q[1] - f.centro[1];
    const rad = (t.angolo * Math.PI) / 180;
    if (Math.abs(px * Math.sin(rad) - py * Math.cos(rad)) <= t.base[0] / 2 && Math.abs(px * Math.cos(rad) + py * Math.sin(rad)) <= t.base[1] / 2) return true;
    const qx = Math.floor((mx - griglia.scosto_x) / griglia.q_px), qy = Math.floor((my - griglia.scosto_y) / griglia.q_px);
    return celleToken(t).some(([x, y]) => x === qx && y === qy);
  }
  const [w, h] = dimensioni(t.ingombro);
  const x0 = griglia.scosto_x + t.q[0] * griglia.q_px, y0 = griglia.scosto_y + t.q[1] * griglia.q_px;
  return mx >= x0 && my >= y0 && mx < x0 + w * griglia.q_px && my < y0 + h * griglia.q_px;
}

/**
 * Coppie di token che occupano almeno un Q in comune: [[idA, idB], …]. Non è un errore del file (il master può
 * ammucchiare i token mentre prepara la scena): serve all'interfaccia per avvisare. Se e quando due token possano
 * stare nello stesso Q è A.127 (data/mappa.json → movimento.fermarsi_su_alleato).
 */
export function sovrapposti(token) {
  const dove = new Map();
  const coppie = [];
  for (const t of token ?? []) {
    const visti = new Set();
    for (const [x, y] of celleToken(t)) {
      const k = `${x},${y}`;
      for (const altro of dove.get(k) ?? []) {
        if (!visti.has(altro)) { visti.add(altro); coppie.push([altro, t.id]); }
      }
      dove.set(k, [...(dove.get(k) ?? []), t.id]);
    }
  }
  return coppie;
}

/** I Q dove un token di questo ingombro, in q, starebbe sopra un altro token (escluso `tranne`) o su un muro. */
export function liberoPer(q, ingombro, { token = [], tranne = null, muro = () => false, colonne, righe, come = null }) {
  // come (08/10): il token di cui si prova la posizione, per la forma di un veicolo ruotato (angolo e base)
  const t = { ...(come ? { angolo: come.angolo, base: come.base } : {}), q, ingombro };
  if (!tokenDentro(t, colonne, righe)) return false;
  const occupate = new Set(token.filter((x) => x.id !== tranne).flatMap((x) => celleToken(x).map(([a, b]) => `${a},${b}`)));
  return celleToken(t).every(([x, y]) => !occupate.has(`${x},${y}`) && !muro(x, y));
}

/**
 * «Metti tutti» (lotto 3): dispone i pezzi in una fila libera vicino al Q `centro`, uno accanto all'altro, sulla
 * riga libera più vicina al centro: righe sopra e sotto a distanza crescente, fila centrata e poi spostata a destra e
 * a sinistra. Una fila è libera se nessun suo Q è occupato da un token o da un muro.
 * Se nessuna fila intera entra, ogni pezzo va nel posto libero più vicino al centro. I pezzi sono
 * { id, ingombro }; restituisce { posti: [{ id, q }], nonPiazzati: [id] }.
 */
export function disponiInFila(pezzi, centro, { token = [], muro = () => false, colonne, righe }) {
  const dims = pezzi.map((p) => dimensioni(p.ingombro));
  const larghezza = dims.reduce((s, [w]) => s + w, 0);
  const altezza = Math.max(1, ...dims.map(([, h]) => h));
  const libero = (q, ing, gia) => liberoPer(q, ing, { token: [...token, ...gia], muro, colonne, righe });
  const prova = (x0, y0) => {
    const gia = [];
    let x = x0;
    for (const [i, p] of pezzi.entries()) {
      const [w, h] = dims[i];
      const q = [x, y0 + Math.floor((altezza - h) / 2)];
      if (!libero(q, p.ingombro, gia)) return null;
      gia.push({ id: `_${p.id}`, q, ingombro: p.ingombro });
      x += w;
    }
    return gia.map((g, i) => ({ id: pezzi[i].id, q: g.q }));
  };
  if (!pezzi.length) return { posti: [], nonPiazzati: [] };
  const x0 = Math.round(centro[0] - larghezza / 2), y0 = Math.round(centro[1] - altezza / 2);
  if (larghezza <= colonne && altezza <= righe) {
    for (let dy = 0; dy <= righe; dy++) {
      for (const y of dy ? [y0 - dy, y0 + dy] : [y0]) {
        if (y < 0 || y + altezza > righe) continue;
        for (let dx = 0; dx <= colonne; dx++) {
          for (const x of dx ? [x0 + dx, x0 - dx] : [x0]) {
            if (x < 0 || x + larghezza > colonne) continue;
            const posti = prova(x, y);
            if (posti) return { posti, nonPiazzati: [] };
          }
        }
      }
    }
  }
  // nessuna fila intera: uno alla volta, il posto libero più vicino al centro (distanza in Q, poi riga, poi colonna)
  const posti = [];
  const nonPiazzati = [];
  for (const p of pezzi) {
    const [w, h] = dimensioni(p.ingombro);
    let migliore = null;
    for (let y = 0; y + h <= righe; y++) {
      for (let x = 0; x + w <= colonne; x++) {
        if (!libero([x, y], p.ingombro, posti.map((q) => ({ ...q, ingombro: pezzi.find((z) => z.id === q.id).ingombro })))) continue;
        const d = Math.max(Math.abs(x + w / 2 - centro[0]), Math.abs(y + h / 2 - centro[1]));
        if (!migliore || d < migliore.d) migliore = { d, q: [x, y] };
      }
    }
    if (migliore) posti.push({ id: p.id, q: migliore.q });
    else nonPiazzati.push(p.id);
  }
  return { posti, nonPiazzati };
}

/** Iniziali per il cerchio senza immagine: due lettere del nome, più il numero del nemico («Predone 2» → «P2»). */
export function iniziali(nome, numero = null) {
  const parole = String(nome ?? '').replace(/\d+/g, ' ').trim().split(/[\s\-–—]+/).filter(Boolean);
  const lettere = (parole.length > 1 ? parole[0][0] + parole[1][0] : (parole[0] ?? '?').slice(0, 2)).toUpperCase();
  return numero !== null && numero !== undefined ? `${lettere.slice(0, 1)}${numero}` : lettere;
}

/** Riferimento di un token come chiave: «partecipante:pg:lucas», «veicolo:vei-…». */
export const chiaveRif = (rif) => `${rif?.tipo}:${rif?.id ?? ''}`;
