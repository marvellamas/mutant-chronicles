// Luci della mappa di battaglia, versione semplice (fase 2, lotto 4; decisione di Marcello del 07/10/2026): si
// preparano in pochi secondi e non si ritoccano durante il gioco. Niente ombre dinamiche, niente intensità, niente
// livelli numerici. Funzioni pure; parametri in data/mappa.json → luci, categorie e penalità in data/regole.json →
// illuminazione (A.106: Luce sufficiente nessuna penalità, Penombra −2, Luce molto scarsa −4, Buio totale come
// Accecato; A.116).
//
// Nella scena: luce?: { ambiente: id della categoria, zone?: { id: maschera base64 } } (assente: Luce sufficiente).
// Un Q ha al massimo una zona (dipingerne una toglie le altre); senza zona vale l'ambiente. I token possono portare una
// luce: token.luce = raggio in Q; entro il raggio (diagonale 1 Q, dall'ingombro) la zona diventa Luce. I muri non
// fermano la luce: nessun calcolo d'ombra, scelta voluta per semplicità.
import { daBase64, inBase64, nuovaMaschera, pennello, rettangolo } from './celle.js';
import { tratto } from './nebbia.js';
import { dimensioni } from './token.js';

/** Le categorie in ordine (indice 0 = Luce sufficiente), con nome e riga dalla regola (regole.json → illuminazione). */
export function categorieLuce(dati) {
  const livelli = dati.regole.illuminazione.livelli;
  return dati.mappa.luci.categorie.map((id) => { const l = livelli.find((x) => x.id === id); return { id, nome: l?.nome ?? id, riga: l?.riga ?? '' }; });
}

/** L'ambiente della scena (la sua luce di base). */
export const ambienteDi = (scena, dati) => (dati.mappa.luci.categorie.includes(scena.luce?.ambiente) ? scena.luce.ambiente : dati.mappa.luci.predefinita);

/** Ci sono luci da considerare (scena non tutta in Luce sufficiente, senza zone né luci portate)? */
export function conLuci(scena, dati) {
  return ambienteDi(scena, dati) !== dati.mappa.luci.predefinita || Object.keys(scena.luce?.zone ?? {}).length > 0;
}

/**
 * La categoria di ogni Q (indice in data/mappa.json → luci.categorie): ambiente, poi le zone, poi le luci portate dai
 * token (Luce entro il raggio).
 * @returns Uint8Array, un byte per Q
 */
export function luceQ(scena, dati) {
  const { colonne: C, righe: R } = scena.griglia;
  const cat = dati.mappa.luci.categorie;
  const m = new Uint8Array(C * R).fill(Math.max(0, cat.indexOf(ambienteDi(scena, dati))));
  for (const [id, b64] of Object.entries(scena.luce?.zone ?? {})) {
    const k = cat.indexOf(id);
    if (k < 0) continue;
    const z = daBase64(b64);
    for (let i = 0; i < C * R; i++) if ((z[i >> 3] >> (i & 7)) & 1) m[i] = k;
  }
  const luce = Math.max(0, cat.indexOf(dati.mappa.luci.predefinita));
  for (const t of scena.token ?? []) {
    if (!(Number.isFinite(t.luce) && t.luce > 0)) continue;
    const [w, h] = dimensioni(t.ingombro);
    const r = Math.floor(t.luce);
    for (let y = Math.max(0, t.q[1] - r); y < Math.min(R, t.q[1] + h + r); y++) {
      for (let x = Math.max(0, t.q[0] - r); x < Math.min(C, t.q[0] + w + r); x++) m[y * C + x] = luce;
    }
  }
  return m;
}

/** La categoria del Q q (id), per la penalità proposta in «Attacca!». */
export function luceDi(scena, q, dati, mappa = luceQ(scena, dati)) {
  const { colonne: C } = scena.griglia;
  return dati.mappa.luci.categorie[mappa[q[1] * C + q[0]]] ?? dati.mappa.luci.predefinita;
}

/** La luce di un ingombro: la peggiore fra i suoi Q (il bersaglio grande in parte al buio è in parte nascosto). */
export function luceIngombro(scena, t, dati, mappa = luceQ(scena, dati)) {
  const { colonne: C, righe: R } = scena.griglia;
  const [w, h] = dimensioni(t.ingombro);
  let peggiore = 0;
  for (let y = t.q[1]; y < Math.min(R, t.q[1] + h); y++) for (let x = t.q[0]; x < Math.min(C, t.q[0] + w); x++) peggiore = Math.max(peggiore, mappa[y * C + x]);
  return dati.mappa.luci.categorie[peggiore];
}

/** Testo della penalità proposta: «Penombra −2 (zona del bersaglio)»; null con Luce sufficiente. */
export function testoLuceBersaglio(id, dati) {
  if (id === dati.mappa.luci.predefinita) return null;
  const c = categorieLuce(dati).find((x) => x.id === id);
  return c ? `${c.nome} ${c.riga} (zona del bersaglio)` : null;
}

/**
 * Raggio di scoperta della nebbia automatica per ogni Q (data/mappa.json → luci.raggio_scoperta_q): dipende dalla luce
 * del Q visto, non da quella del PG. Restituisce la funzione (x, y) → raggio in Q e il raggio massimo. A.142: null = nessun
 * limite (Infinity), 0 = nessun Q oltre la propria pedina.
 */
export function raggiScoperta(scena, dati, mappa = luceQ(scena, dati)) {
  const { colonne: C } = scena.griglia;
  const cat = dati.mappa.luci.categorie;
  const raggi = cat.map((id) => dati.mappa.luci.raggio_scoperta_q[id] ?? Infinity);
  return { raggio: (x, y) => raggi[mappa[y * C + x]], massimo: Math.max(...raggi) };
}

// ── Zone a pennello (come il terreno difficile): una maschera per categoria, «gomma» le toglie tutte ──
export const MODI_LUCE = (dati) => [...dati.mappa.luci.categorie, 'gomma'];

/** Le maschere delle zone (una per categoria, vuote se mancano). */
function maschere(scena, dati) {
  const { colonne: C, righe: R } = scena.griglia;
  return Object.fromEntries(dati.mappa.luci.categorie.map((id) => [id, scena.luce?.zone?.[id] ? daBase64(scena.luce.zone[id]) : nuovaMaschera(C, R)]));
}
/** Luce della scena con le maschere date (le vuote non si scrivono). */
function conZone(scena, m, dati) {
  const zone = {};
  for (const [id, z] of Object.entries(m)) if (z.some((b) => b)) zone[id] = inBase64(z);
  const ambiente = ambienteDi(scena, dati);
  const luce = Object.keys(zone).length || ambiente !== dati.mappa.luci.predefinita ? { ambiente, ...(Object.keys(zone).length ? { zone } : {}) } : undefined;
  const { luce: _, ...senza } = scena;
  return luce ? { ...senza, luce } : senza;
}
/** Applica `fn(maschera, valore)` a ogni maschera: il modo scelto acceso, gli altri spenti (gomma: tutti spenti). */
function dipingi(scena, modo, dati, fn) {
  const m = maschere(scena, dati);
  for (const id of Object.keys(m)) m[id] = fn(m[id], id === modo);
  return conZone(scena, m, dati);
}
/** Un tratto di pennello (senza voce di Ctrl+Z: la voce arriva al rilascio, chiudiTrattoLuce). */
export function trattoLuce(scena, da, a, lato, modo, dati) {
  const { colonne: C, righe: R } = scena.griglia;
  return dipingi(scena, modo, dati, (z, v) => tratto(z, C, R, da, a, lato, v));
}
/** Un clic col pennello in un punto. */
export function puntoLuce(scena, q, lato, modo, dati) {
  const { colonne: C, righe: R } = scena.griglia;
  return dipingi(scena, modo, dati, (z, v) => pennello(z, C, R, q[0], q[1], lato, v));
}
/** Rettangolo fra due Q, estremi compresi. */
export function rettangoloLuce(scena, a, b, modo, dati) {
  const { colonne: C, righe: R } = scena.griglia;
  return dipingi(scena, modo, dati, (z, v) => rettangolo(z, C, R, a[0], a[1], b[0], b[1], v));
}

/** Con la voce di Ctrl+Z ({ tipo: 'luce', prima }) se la luce è cambiata rispetto a `prima` (la luce di partenza). */
export function conVoceLuce(scena, prima, dati, adesso = new Date()) {
  if (JSON.stringify(scena.luce ?? null) === JSON.stringify(prima ?? null)) return scena;
  return { ...scena, annulla: [...scena.annulla, { tipo: 'luce', prima: prima ?? null, quando: adesso.toISOString() }].slice(-dati.mappa.scena.annulla_max) };
}

/** Luce della scena (menu con le categorie), con la voce di Ctrl+Z. */
export function cambiaAmbiente(scena, ambiente, dati, adesso) {
  const prima = scena.luce;
  const zone = scena.luce?.zone;
  const luce = ambiente === dati.mappa.luci.predefinita && !zone ? undefined : { ambiente, ...(zone ? { zone } : {}) };
  const { luce: _, ...senza } = scena;
  return conVoceLuce(luce ? { ...senza, luce } : senza, prima, dati, adesso);
}

/** Ctrl+Z della luce: com'era. */
export function annullaLuce(scena, voce) {
  const { luce: _, ...senza } = scena;
  return voce.prima ? { ...senza, luce: voce.prima } : senza;
}

/** Errore di forma della luce della scena (null se va bene). */
export function erroreLuce(luce, dati, mascheraValida) {
  if (typeof luce !== 'object' || !luce) return 'oggetto atteso';
  if (!dati.mappa.luci.categorie.includes(luce.ambiente)) return `ambiente: ${dati.mappa.luci.categorie.join(', ')}`;
  if (luce.zone !== undefined) {
    if (typeof luce.zone !== 'object' || !luce.zone) return 'zone: oggetto';
    for (const [id, z] of Object.entries(luce.zone)) {
      if (!dati.mappa.luci.categorie.includes(id)) return `zone.${id}: categoria sconosciuta`;
      if (!mascheraValida(z)) return `zone.${id}: maschera della griglia`;
    }
  }
  return null;
}

/** Errore della luce portata da un token (null se va bene). */
export const erroreLuceToken = (v, dati) => (v === undefined || (Number.isInteger(v) && v >= 1 && v <= dati.mappa.luci.raggio_max_q) ? null : `luce: raggio intero da 1 a ${dati.mappa.luci.raggio_max_q} Q`);

