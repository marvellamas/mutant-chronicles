// Movimento in diretta nella vista giocatori (richiesta di Marcello del 07/10/2026; §3.1 della specifica): mentre il
// master sceglie e muove un token, il secondo schermo mostra la stessa area di movimento, la modalità (Passo, Corsa,
// Scatto, Libero), i Q usati / disponibili, il percorso sotto il puntatore e le ZoC degli avversari. Non è salvato nella
// scena: il master lo manda al server (PUT /api/vista-giocatori/diretta) a ogni cambio, il server lo filtra con la
// scena in gioco e lo spinge ai giocatori (EventSource), senza attendere il giro di lettura della vista.
//
// Segreti (§3): il filtro sta nel server, come per la vista. Niente diretta per un token nascosto o tutto sotto la
// nebbia; l'area perde i Q sotto la nebbia; il percorso si interrompe dove il token finirebbe tutto sotto la nebbia;
// le ZoC restano solo per gli avversari che i giocatori vedono (e i passi «in ZoC» del percorso li calcola la vista
// giocatori da quelle: un avversario nascosto non si indovina). L'area la calcola il master senza gli ostacoli che i
// giocatori non vedono (token nascosti o sotto la nebbia), così un buco nell'area non rivela nessuno.
// Template (fase 2): stesso posto nello stato condiviso, con la regola della vista (non nascosti, origine visibile).
// Funzioni pure, condivise da master, server, vista giocatori e test.
import { daBase64, inBase64, nuovaMaschera, senza, cella, mascheraValida } from './celle.js';
import { celleToken } from './token.js';
import { celleZoc } from './zoc.js';

export const MODI = ['passo', 'corsa', 'scatto', 'libero'];
const PUNTI_MAX = 2000;

/** Il token si vede nella vista giocatori? Non nascosto e con almeno un Q fuori dalla nebbia (come src/mappa/vista.js). */
export function visibileAiGiocatori(t, scena, nebbia = daBase64(scena.nebbia.coperti)) {
  const { colonne: C, righe: R } = scena.griglia;
  return !t.nascosto && celleToken(t).some(([x, y]) => !cella(nebbia, C, R, x, y));
}

/**
 * Stato della diretta che il master manda al server.
 * @param o { scena, token, modo: passo | corsa | scatto | libero, usato, disponibili, celle: Int8Array per Q (0, 1 Passo,
 *   2 Corsa, 3 Scatto: src/mappa/area.js → celleArea) o null, percorso: { punti, costo, fascia } o null,
 *   zoc: avversari (src/mappa/zoc.js → avversariZoc) o null, template: [] (fase 2), quando: ms }
 */
export function statoDiretta({ scena, token, modo, usato = 0, disponibili = null, celle = null, percorso = null, zoc = null, template = [], quando = Date.now() }) {
  const { colonne: C, righe: R } = scena.griglia;
  let area = null;
  if (celle) {
    area = [1, 2, 3].map((k) => {
      const m = nuovaMaschera(C, R);
      for (let i = 0; i < C * R; i++) if (celle[i] === k) m[i >> 3] |= 1 << (i & 7);
      return inBase64(m);
    });
  }
  return {
    versione: 1, scena: scena.id, token: token.id, q: [...token.q], ingombro: token.ingombro, modo, usato, disponibili, area,
    percorso: percorso?.punti?.length ? { punti: percorso.punti.map((p) => [p[0], p[1]]), costo: percorso.costo, fascia: percorso.fascia ?? null } : null,
    zoc: zoc ? zoc.map((a) => ({ token: a.token.id, q: [...a.token.q], ingombro: a.token.ingombro, portata: a.portata })) : null,
    template, quando,
  };
}

const intero = (n) => Number.isInteger(n);
const posizione = (p) => Array.isArray(p) && p.length === 2 && intero(p[0]) && intero(p[1]);
const numero = (n) => typeof n === 'number' && Number.isFinite(n);

/** Errore di forma della diretta mandata dal master (null se va bene: null stesso è «nessuna selezione»). */
export function validaDiretta(d) {
  if (d === null) return null;
  if (typeof d !== 'object' || Array.isArray(d)) return 'oggetto o null atteso';
  if (d.versione !== 1) return 'versione: 1 attesa';
  if (typeof d.scena !== 'string' || typeof d.token !== 'string') return 'scena e token: id attesi';
  if (!posizione(d.q)) return 'q: [x, y] interi attesi';
  if (!MODI.includes(d.modo)) return `modo: ${MODI.join(', ')}`;
  if (!numero(d.usato) || (d.disponibili !== null && !numero(d.disponibili))) return 'usato e disponibili: numeri';
  if (d.area !== null && !(Array.isArray(d.area) && d.area.length === 3 && d.area.every((m) => typeof m === 'string'))) return 'area: tre maschere o null';
  if (d.percorso !== null) {
    const p = d.percorso;
    if (!p || !Array.isArray(p.punti) || !p.punti.length || p.punti.length > PUNTI_MAX || !p.punti.every(posizione) || !numero(p.costo)) return 'percorso: punti [x, y] e costo';
  }
  if (d.zoc !== null && !(Array.isArray(d.zoc) && d.zoc.length <= 500 && d.zoc.every((a) => a && typeof a.token === 'string' && posizione(a.q) && intero(a.portata) && a.portata >= 0))) return 'zoc: elenco di { token, q, portata }';
  if (!Array.isArray(d.template ?? [])) return 'template: elenco';
  if (!numero(d.quando)) return 'quando: istante in ms';
  return null;
}

/**
 * La diretta per i giocatori: null se non c'è, se riguarda un'altra scena, se il master non mostra il movimento
 * (scena.movimentoGiocatori false) o se il token non si vede; altrimenti senza i Q sotto la nebbia, con il percorso
 * interrotto (null) dove il token sparirebbe nella nebbia e le ZoC dei soli avversari visibili (nessuna con
 * scena.zocGiocatori false). Il token e le sue misure vengono dalla scena salvata, la posizione dal master.
 */
export function direttaPerGiocatori(d, scena) {
  if (!d || !scena || d.scena !== scena.id || scena.movimentoGiocatori === false || validaDiretta(d)) return null;
  const { colonne: C, righe: R } = scena.griglia;
  const nebbia = daBase64(scena.nebbia.coperti);
  const t = scena.token.find((x) => x.id === d.token);
  if (!t || !visibileAiGiocatori({ ...t, q: d.q }, scena, nebbia)) return null;
  const area = d.area && d.area.every((m) => mascheraValida(m, C, R)) ? d.area.map((m) => inBase64(senza(daBase64(m), nebbia))) : null;
  let percorso = null;
  if (d.percorso) {
    const punti = d.percorso.punti.map((p) => (visibileAiGiocatori({ q: p, ingombro: t.ingombro }, scena, nebbia) ? p : null));
    if (punti.some(Boolean)) percorso = { punti, costo: d.percorso.costo, fascia: d.percorso.fascia ?? null };
  }
  const zoc = scena.zocGiocatori === false || !d.zoc ? null : d.zoc.flatMap((a) => {
    const z = scena.token.find((x) => x.id === a.token);
    return z && visibileAiGiocatori({ ...z, q: a.q }, scena, nebbia) ? [{ q: a.q, ingombro: z.ingombro, portata: a.portata }] : [];
  });
  const template = (d.template ?? []).filter((x) => x && !x.nascosto && posizione(x.origine) && !cella(nebbia, C, R, x.origine[0], x.origine[1])).map(({ nascosto, ...x }) => x);
  return { scena: d.scena, token: d.token, q: d.q, ingombro: t.ingombro, modo: d.modo, usato: d.usato, disponibili: d.disponibili, area, percorso, zoc, template, quando: d.quando };
}

/** Dalla diretta filtrata: Int8Array per Q con 1 Passo, 2 Corsa, 3 Scatto (per disegnaArea), o null. */
export function celleDellaDiretta(d, scena) {
  if (!d?.area) return null;
  const { colonne: C, righe: R } = scena.griglia;
  const r = new Int8Array(C * R);
  for (let k = 3; k >= 1; k--) {
    const m = daBase64(d.area[k - 1]);
    for (let i = 0; i < C * R; i++) if (m[i >> 3] & (1 << (i & 7))) r[i] = k;
  }
  return r;
}

/** Avversari della diretta nella forma di src/mappa/zoc.js ({ token: { q, ingombro }, portata }). */
export const avversariDellaDiretta = (d) => (d?.zoc ?? []).map((a) => ({ token: { q: a.q, ingombro: a.ingombro }, portata: a.portata }));

/** Q delle ZoC della diretta fuori dalla nebbia (Uint8Array per Q, 1 dentro), o null. */
export function zocDellaDiretta(d, scena) {
  if (!d?.zoc?.length) return null;
  const { colonne: C, righe: R } = scena.griglia;
  const m = celleZoc(scena, avversariDellaDiretta(d));
  const nebbia = daBase64(scena.nebbia.coperti);
  for (let i = 0; i < C * R; i++) if (nebbia[i >> 3] & (1 << (i & 7))) m[i] = 0;
  return m;
}

/** Tratti continui del percorso (fra le interruzioni della nebbia): [[p, …], …]. */
export function trattiPercorso(punti) {
  const r = [];
  let cur = [];
  for (const p of punti ?? []) {
    if (p) cur.push(p); else if (cur.length) { r.push(cur); cur = []; }
  }
  if (cur.length) r.push(cur);
  return r;
}

