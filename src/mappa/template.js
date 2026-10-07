// Template ad area della mappa di battaglia (fase 2, lotto 1; §10 della specifica; A.122 «template delle aree»
// fra le funzioni indispensabili). Funzioni pure: forme, quadretti coperti, token dentro, durata in Round, filtro per i
// giocatori. Le forme e le misure vengono dai manuali (citazioni in data/mappa.json → template), i valori dai dati.
//
// Magia, «Gittate e geometria»: Raggio «distanza dal centro al limite»; Linea «lunghezza × larghezza, normalmente
// 1 Q»; Cono «lunghezza × larghezza finale, con apertura progressiva»; «un Q rientra nell'Area se è incluso per almeno
// metà»; «Linee e Coni originati dal lanciatore non includono automaticamente il suo Q». Cono Elementale: il cono
// «parte dal bordo dello spazio del Taumaturgo nella direzione dichiarata».
//
// Coordinate in Q: il Q (x, y) va da x a x + 1; il suo centro è (x + 0,5, y + 0,5). Un template ha un'origine (un Q)
// e, per cono e linea, una direzione in gradi (0 = verso destra, 90 = verso il basso, come lo schermo).
//   cerchio    { raggio }               dal centro del Q d'origine; metrica in data/mappa.json → template.metrica_raggio
//                                       («quadretti»: diagonale 1 Q come il movimento, A.124, il raggio è un quadrato
//                                       di 2r + 1 Q; «euclidea»: cerchio vero) — TODO(Davide) A.137
//   quadrato   { lato }                 centrato sul Q d'origine (lato pari: il Q d'origine è in alto a sinistra fra i
//                                       quattro centrali); Fuoco di Soppressione 3 × 3 Q, Campo di Forza
//   rettangolo { larghezza, altezza }   dal Q d'origine verso destra e verso il basso (area libera)
//   cono       { lunghezza, larghezza } dal bordo del Q d'origine; si allarga da cono_larghezza_iniziale alla larghezza
//                                       finale (trapezio) — TODO(Davide) A.138
//   linea      { lunghezza, larghezza } dal bordo del Q d'origine, larga linea_larghezza se non indicato
// Quadretti coperti: «almeno metà» del Q dentro l'area, misurata su campioni_per_lato² punti del Q; le forme a
// quadretti (cerchio a quadretti, quadrato, rettangolo) coprono Q interi. Cono e linea non coprono il Q d'origine.
import { daBase64, inBase64, nuovaMaschera } from './celle.js';
import { celleToken } from './token.js';

const EPS = 1e-9;
const rad = (g) => (g * Math.PI) / 180;

/** Misure attese per forma (per il validatore e il mini-menu). */
export const MISURE_FORMA = {
  cerchio: ['raggio'], quadrato: ['lato'], rettangolo: ['larghezza', 'altezza'], cono: ['lunghezza', 'larghezza'], linea: ['lunghezza'],
};
/** Forme che hanno una direzione. */
export const ORIENTABILI = ['cono', 'linea'];

/**
 * Il punto (px, py), in Q, è dentro la forma? Per cono e linea: distanza lungo l'asse dal bordo del Q d'origine
 * (sulla semiretta della direzione) e scarto laterale dall'asse.
 */
function puntoDentro(t, px, py, regole) {
  const ox = t.origine[0] + 0.5, oy = t.origine[1] + 0.5;
  const m = t.misure;
  const dx = px - ox, dy = py - oy;
  if (t.forma === 'cerchio') return Math.hypot(dx, dy) <= m.raggio + EPS;
  const a = rad(t.direzione ?? 0);
  const c = Math.cos(a), s = Math.sin(a);
  // con la metrica a quadretti (diagonale 1 Q, A.124) la lunghezza lungo l'asse si conta a quadretti anche in
  // diagonale; il bordo del Q d'origine è allora sempre a 0,5 Q dal centro
  const k = regole.metrica_raggio === 'quadretti' ? Math.max(Math.abs(c), Math.abs(s)) : 1;
  const bordo = 0.5 / Math.max(Math.abs(c), Math.abs(s)) * k;
  const lungo = (dx * c + dy * s) * k - bordo;
  const lato = Math.abs(-dx * s + dy * c);
  if (lungo <= EPS || lungo > m.lunghezza + EPS) return false;
  if (t.forma === 'linea') return lato <= (m.larghezza ?? regole.linea_larghezza) / 2 + EPS;
  // cono: da cono_larghezza_iniziale (al bordo del lanciatore) alla larghezza finale, apertura progressiva
  const w0 = regole.cono_larghezza_iniziale;
  return lato <= (w0 + (m.larghezza - w0) * (lungo / m.lunghezza)) / 2 + EPS;
}

/** Il Q (x, y) è coperto dal template? */
export function qCoperto(t, x, y, regole) {
  const m = t.misure;
  if (t.forma === 'quadrato') {
    const x0 = t.origine[0] - Math.floor((m.lato - 1) / 2), y0 = t.origine[1] - Math.floor((m.lato - 1) / 2);
    return x >= x0 && x < x0 + m.lato && y >= y0 && y < y0 + m.lato;
  }
  if (t.forma === 'rettangolo') return x >= t.origine[0] && x < t.origine[0] + m.larghezza && y >= t.origine[1] && y < t.origine[1] + m.altezza;
  if (t.forma === 'cerchio' && regole.metrica_raggio === 'quadretti') return Math.max(Math.abs(x - t.origine[0]), Math.abs(y - t.origine[1])) <= Math.floor(m.raggio + EPS);
  if (ORIENTABILI.includes(t.forma) && x === t.origine[0] && y === t.origine[1]) return false;
  // «almeno metà» del Q: i punti di campione dentro l'area
  const n = regole.campioni_per_lato;
  let dentro = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (puntoDentro(t, x + (i + 0.5) / n, y + (j + 0.5) / n, regole)) dentro++;
  return dentro * 2 >= n * n;
}

/** Estensione massima del template attorno all'origine, in Q (per limitare la ricerca). */
function estensione(t) {
  const m = t.misure;
  return Math.ceil(Math.max(m.raggio ?? 0, m.lato ?? 0, m.larghezza ?? 0, m.altezza ?? 0, m.lunghezza ?? 0)) + 2;
}

/** Q coperti dal template: Uint8Array per Q della griglia (1 = coperto). */
export function celleTemplate(t, griglia, regole) {
  const { colonne: C, righe: R } = griglia;
  const r = new Uint8Array(C * R);
  const e = estensione(t);
  const [ox, oy] = t.origine;
  for (let y = Math.max(0, oy - e); y < Math.min(R, oy + e + 1); y++) {
    for (let x = Math.max(0, ox - e); x < Math.min(C, ox + e + 1); x++) if (qCoperto(t, x, y, regole)) r[y * C + x] = 1;
  }
  return r;
}

/** Token con almeno un Q dentro il template (chi è dentro, per «Colpito» sulla plancia: nessun tiro automatico). */
export function tokenDentro(t, scena, regole, celle = celleTemplate(t, scena.griglia, regole)) {
  const C = scena.griglia.colonne;
  return scena.token.filter((k) => celleToken(k).some(([x, y]) => x >= 0 && y >= 0 && x < C && y < scena.griglia.righe && celle[y * C + x]));
}

/**
 * Durata (Magia, «Scadenze e interruzione degli effetti», come regole.json → durate_round): il Round del lancio non si
 * conta; con durata N piazzato nel Round R il template resta fino alla fine del Round R + N. `durata` null: finché il
 * master non lo toglie. Senza scontro aperto non c'è un Round: niente scadenza automatica.
 */
export const fineRound = (durata, round) => (durata === null || durata === undefined || !Number.isInteger(round) ? null : round + durata);
/** Il template è scaduto al Round `round`? */
export const scaduto = (t, round) => Number.isInteger(t.fine_round) && Number.isInteger(round) && round > t.fine_round;
/** Round che restano (compreso quello in corso), o null. */
export const roundRimasti = (t, round) => (Number.isInteger(t.fine_round) && Number.isInteger(round) ? Math.max(0, t.fine_round - round + 1) : null);

/** Direzione in gradi dal centro del Q `da` al punto `verso` (in Q), arrotondata al grado. */
export function direzioneVerso(da, verso) {
  const g = (Math.atan2(verso[1] - (da[1] + 0.5), verso[0] - (da[0] + 0.5)) * 180) / Math.PI;
  return Math.round(((g % 360) + 360) % 360);
}

/** Nuovo template dal mini-menu. */
export function nuovoTemplate({ id, forma, misure, origine, direzione = 0, colore, nome = '', durata = null, round = null, nascosto = false, scontro = null }) {
  return {
    id, forma, origine: [...origine], misure: { ...misure }, ...(ORIENTABILI.includes(forma) ? { direzione } : {}),
    colore, ...(nome ? { nome } : {}), durata, fine_round: fineRound(durata, round), scontro, nascosto,
  };
}

/**
 * Rotazione con le frecce (ritocchi del 07/10): cono e linea a passi di `passo` gradi (45°: le otto direzioni della
 * griglia, quadretti coperti regolari), agganciati al multiplo più vicino; il rettangolo ruota di 90° scambiando i lati.
 * Raggio e quadrato non hanno verso: restano uguali.
 */
export function ruota(t, verso, passo = 45) {
  if (ORIENTABILI.includes(t.forma)) {
    const n = Math.round((t.direzione ?? 0) / passo) + verso;
    return { ...t, direzione: ((n * passo) % 360 + 360) % 360 };
  }
  if (t.forma === 'rettangolo') return { ...t, misure: { larghezza: t.misure.altezza, altezza: t.misure.larghezza } };
  return t;
}
/**
 * Misura successiva o precedente fra quelle proposte (data/mappa.json → template.misure_proposte): ↑ la più grande dopo
 * quella attuale, ↓ la più piccola prima; da una misura fuori elenco si parte dalla più vicina.
 */
export function cambiaMisura(t, verso, regole) {
  const lista = regole.misure_proposte[t.forma] ?? [];
  if (!lista.length) return t;
  const chiavi = MISURE_FORMA[t.forma];
  const k = chiavi[0];
  let i = lista.findIndex((m) => chiavi.every((c) => m[c] === t.misure[c]));
  if (i < 0) {
    // la più vicina sulla misura principale, poi un passo nel verso chiesto
    const sotto = lista.filter((m) => m[k] <= t.misure[k]).length - 1;
    i = verso > 0 ? sotto + 1 : sotto;
  } else i += verso;
  i = Math.max(0, Math.min(lista.length - 1, i));
  // il rettangolo tiene il suo orientamento (lato lungo in orizzontale o in verticale)
  const m = { ...lista[i] };
  if (t.forma === 'rettangolo' && t.misure.altezza > t.misure.larghezza) return { ...t, misure: { larghezza: m.altezza, altezza: m.larghezza } };
  return { ...t, misure: m };
}

/** Template senza durata («finché non lo tolgo»): quelli che «Mostra / nascondi template» toglie sempre. */
export const permanente = (t) => t.durata === null || t.durata === undefined || t.permanente === true;
/**
 * Template da disegnare secondo la scelta «Mostra / nascondi template» (ritocchi del 07/10): `sov` =
 * scena.sovrapposizioni.master o .giocatori, { nascoste, ancheDurata }. Nascoste: via i template senza durata e, con
 * «anche i template a durata», anche gli altri. Le stesse sovrapposizioni nascoste sono muri, porte e terreno.
 */
export function templateVisibili(lista, sov) {
  if (!sov?.nascoste) return lista ?? [];
  return sov.ancheDurata ? [] : (lista ?? []).filter((t) => !permanente(t));
}
/** Ostacoli (muri, porte, terreno difficile) disegnati? Valgono comunque per il movimento. */
export const ostacoliVisibili = (sov) => !sov?.nascoste;

/** Errore di forma di un template della scena (null se va bene); \`regole\`: data/mappa.json → template. */
export function erroreTemplate(t, regole) {
  if (!regole.forme.includes(t.forma)) return `forma: ${regole.forme.join(', ')}`;
  const attese = MISURE_FORMA[t.forma] ?? [];
  for (const k of attese) if (!(typeof t.misure?.[k] === 'number' && t.misure[k] > 0 && t.misure[k] <= regole.misura_max_q)) return `misure.${k}: da 0 a ${regole.misura_max_q} Q`;
  if (ORIENTABILI.includes(t.forma) && !(typeof t.direzione === 'number' && Number.isFinite(t.direzione))) return 'direzione: gradi';
  if (t.colore !== undefined && !/^#[0-9a-fA-F]{6}$/.test(String(t.colore))) return 'colore: #rrggbb';
  if (t.nome !== undefined && !(typeof t.nome === 'string' && t.nome.length <= 40)) return 'nome: al più 40 caratteri';
  if (t.durata !== undefined && t.durata !== null && !(Number.isInteger(t.durata) && t.durata >= 0)) return 'durata: Round (intero) o null';
  return null;
}

/**
 * Template per i giocatori (vista e diretta; §3 dei segreti): niente template nascosti; dei visibili solo i Q fuori dalla
 * nebbia, come maschera (la forma sotto la nebbia non arriva). Nessun template se tutti i suoi Q sono sotto la nebbia.
 * @returns [{ id, forma, colore, nome?, celle: base64 }]
 */
export function templatePerGiocatori(lista, scena, regole) {
  const { colonne: C, righe: R } = scena.griglia;
  const nebbia = daBase64(scena.nebbia.coperti);
  const r = [];
  for (const t of lista ?? []) {
    if (!t || t.nascosto || erroreTemplate(t, regole) || !Array.isArray(t.origine)) continue;
    const celle = celleTemplate(t, scena.griglia, regole);
    const m = nuovaMaschera(C, R);
    let n = 0;
    for (let i = 0; i < C * R; i++) if (celle[i] && !(nebbia[i >> 3] & (1 << (i & 7)))) { m[i >> 3] |= 1 << (i & 7); n++; }
    if (!n) continue;
    r.push({ id: t.id, forma: t.forma, colore: t.colore ?? regole.colori[0].valore, ...(t.nome ? { nome: t.nome } : {}), permanente: permanente(t), celle: inBase64(m) });
  }
  return r;
}

/** Celle di un template già filtrato per i giocatori (Uint8Array per Q). */
export function celleDaMaschera(base64, griglia) {
  const { colonne: C, righe: R } = griglia;
  const m = daBase64(base64);
  const r = new Uint8Array(C * R);
  if (!m) return r;
  for (let i = 0; i < C * R; i++) if (m[i >> 3] & (1 << (i & 7))) r[i] = 1;
  return r;
}


