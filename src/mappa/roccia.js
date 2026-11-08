// La creatura dentro la roccia (A.255, Davide 06/11/2026). Funzioni pure.
//
// «La Murena eterea può terminare il movimento dentro la roccia. Finché è completamente immersa non ha linea di vista
// o d'effetto verso l'esterno, non può attaccare né essere normalmente bersagliata e non percepisce automaticamente
// oltre la parete. Per attaccare deve emergere quanto basta e spendere il normale movimento; se non lo esaurisce può
// rientrare con il movimento residuo. Se viene eccezionalmente resa corporea nella roccia, viene spostata nella casella
// libera più vicina alla superficie, diventa corporea e Prona, senza attacchi di opportunità; a parità di distanza
// decide il Direttore.»
//
// «Completamente immersa» vuol dire che **ogni** quadretto della sagoma è roccia: con un solo quadretto fuori è emersa
// e vale tutto il normale. Emergere e rientrare nello stesso Round non ha bisogno di niente di nuovo: è il normale
// movimento, che la forma eterea spende per attraversare la roccia (A.224, src/mappa/area.js).
//
// A parità di distanza l'app **propone** le caselle e non ne sceglie una: decide il Direttore (CLAUDE.md: l'app
// propone, non obbliga; l'ultima parola è del master). Le regole stanno in data/mappa.json → `roccia`.
import { celle as celleToken } from './sagoma.js';
import { rocciaEffettiva } from './porte.js';

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const lista = (v) => (Array.isArray(v) ? v : []);

/** Il blocco `roccia` dei dati della mappa. */
export const regoleRoccia = (dati) => (isOggetto(dati?.mappa?.roccia) ? dati.mappa.roccia : null);

/** Un lettore «questo quadretto è roccia?» dalla maschera della scena (A.224: le porte non sono roccia). */
export function letturaRoccia(scena) {
  const g = scena?.griglia ?? {};
  const C = g.colonne ?? 0;
  const R = g.righe ?? 0;
  const m = rocciaEffettiva(scena);
  if (!m || !C || !R) return () => false;
  const byte = bytePerQ(m, C, R);
  return (x, y) => (x >= 0 && y >= 0 && x < C && y < R ? !!byte[y * C + x] : false);
}

/** La maschera della roccia come un byte per quadretto: un bit per Q, come in src/mappa/area.js. */
function bytePerQ(maschera, C, R) {
  const r = new Uint8Array(C * R);
  if (maschera) for (let i = 0; i < C * R; i++) r[i] = (maschera[i >> 3] >> (i & 7)) & 1;
  return r;
}

/** La creatura attraversa la roccia nella sua forma attuale? (A.202, A.224: `forme[].attraversa_roccia`) */
export const attraversaRoccia = (pezzo) => pezzo?.attraversaRoccia === true;

/**
 * La creatura è **completamente immersa** nella roccia? Ogni quadretto della sagoma dev'essere roccia.
 * Con un solo quadretto fuori è emersa: vale tutto il normale.
 */
export function immersoNellaRoccia(token, scena) {
  const mie = celleToken(token);
  if (!mie.length) return false;
  const roccia = letturaRoccia(scena);
  return mie.every(([x, y]) => roccia(x, y));
}

/** Quanti quadretti della sagoma sono fuori dalla roccia (0 = completamente immersa). */
export function quadrettiEmersi(token, scena) {
  const roccia = letturaRoccia(scena);
  return celleToken(token).filter(([x, y]) => !roccia(x, y)).length;
}

/**
 * Che cosa può e non può fare una creatura immersa, dai dati.
 * @returns {{ immersa, vista, effetto, attacca, bersagliabile, percepisce, testo, perAttaccare }}
 *   Per una creatura non immersa, o che non attraversa la roccia, tutto `true` e `immersa: false`.
 */
export function statoImmersione(token, scena, dati, { pezzo = null } = {}) {
  const libero = { immersa: false, vista: true, effetto: true, attacca: true, bersagliabile: true, percepisce: true, testo: null, perAttaccare: null };
  if (pezzo && !attraversaRoccia(pezzo)) return libero;
  if (!immersoNellaRoccia(token, scena)) return libero;
  const I = regoleRoccia(dati)?.immersione ?? {};
  return {
    immersa: true,
    vista: I.vista === true,
    effetto: I.effetto === true,
    attacca: I.attacca === true,
    bersagliabile: I.bersagliabile === true,
    percepisce: I.percepisce_oltre === true,
    testo: I.testo ?? 'Completamente immersa nella roccia: nessuna linea di vista o d’effetto verso l’esterno, non può attaccare né essere normalmente bersagliata.',
    perAttaccare: I.per_attaccare ?? 'Per attaccare deve emergere quanto basta, spendendo il normale movimento; se non lo esaurisce può rientrare con il movimento residuo nello stesso Round.',
  };
}

/** Il motivo per cui un attacco non parte, o null. */
export function motivoNonAttacca(token, scena, dati, { pezzo = null } = {}) {
  const s = statoImmersione(token, scena, dati, { pezzo });
  return s.immersa && !s.attacca ? `${s.testo} ${s.perAttaccare}` : null;
}

/** Il motivo per cui la creatura non è bersagliabile, o null. */
export function motivoNonBersagliabile(token, scena, dati, { pezzo = null } = {}) {
  const s = statoImmersione(token, scena, dati, { pezzo });
  return s.immersa && !s.bersagliabile ? s.testo : null;
}

/**
 * Le caselle libere più vicine alla superficie, per una creatura resa corporea dentro la roccia (A.255).
 * «Libera» = fuori dalla roccia, dentro la griglia, senza muri né altri token che la bloccano; si cerca a partire dal
 * token, a distanza crescente, e si tengono **tutte** quelle a pari distanza: a parità decide il Direttore.
 * @param ambiente { colonne, righe, muro(x,y), occupato(x,y) }
 * @returns {{ proposte: [[x, y]], distanza, pariMerito, nessuna }}
 */
export function usciteDallaRoccia(token, scena, ambiente = {}) {
  const g = scena?.griglia ?? {};
  const C = ambiente.colonne ?? g.colonne ?? 0;
  const R = ambiente.righe ?? g.righe ?? 0;
  const roccia = letturaRoccia(scena);
  const muro = typeof ambiente.muro === 'function' ? ambiente.muro : () => false;
  const occupato = typeof ambiente.occupato === 'function' ? ambiente.occupato : () => false;
  const mie = celleToken(token);
  const partenza = mie.length ? mie : [[token?.q?.[0] ?? 0, token?.q?.[1] ?? 0]];
  const centro = [
    partenza.reduce((s, c) => s + c[0], 0) / partenza.length,
    partenza.reduce((s, c) => s + c[1], 0) / partenza.length,
  ];
  const libere = [];
  for (let y = 0; y < R; y++) {
    for (let x = 0; x < C; x++) {
      if (roccia(x, y) || muro(x, y) || occupato(x, y)) continue;
      // distanza in Q (diagonale compresa, come il resto della mappa): il massimo fra i due assi
      const d = Math.max(Math.abs(x + 0.5 - (centro[0] + 0.5)), Math.abs(y + 0.5 - (centro[1] + 0.5)));
      libere.push({ q: [x, y], d });
    }
  }
  if (!libere.length) return { proposte: [], distanza: null, pariMerito: false, nessuna: true };
  const minima = libere.reduce((m, c) => Math.min(m, c.d), Infinity);
  const proposte = libere.filter((c) => Math.abs(c.d - minima) < 1e-9).map((c) => c.q);
  return { proposte, distanza: minima, pariMerito: proposte.length > 1, nessuna: false };
}

/**
 * Che cosa succede a una creatura resa corporea dentro la roccia: le caselle proposte, lo Stato e il fatto che non
 * provoca attacchi di opportunità. L'app propone: la casella la sceglie il Direttore.
 */
export function resaCorporeaNellaRoccia(token, scena, dati, ambiente = {}) {
  if (!immersoNellaRoccia(token, scena)) return null;
  const C = regoleRoccia(dati)?.resa_corporea ?? {};
  const u = usciteDallaRoccia(token, scena, ambiente);
  return {
    ...u,
    stato: C.stato ?? 'Prona',
    senzaOpportunita: C.senza_opportunita === true,
    testo: C.testo ?? 'Resa corporea nella roccia: si sposta nella casella libera più vicina alla superficie, diventa corporea e Prona, senza attacchi di opportunità.',
    decideIlDirettore: C.decide_il_direttore ?? 'A parità di distanza sceglie il Direttore.',
  };
}
