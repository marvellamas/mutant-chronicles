// Zone di controllo (ZoC) e Attacchi di Opportunità sulla mappa (richiesta di Marcello del 07/10/2026).
// Regola del manuale (Giocatore §5.3; Armamenti §7.1.2): un personaggio provoca un Attacco di Opportunità quando, con
// un Movimento volontario, esce dalla portata ravvicinata di un avversario in grado di attaccarlo, salvo Ritirata o
// altre eccezioni; non lo provocano il Movimento forzato, l'ingresso nella portata, lo spostamento all'interno della
// portata, la Ritirata e il teletrasporto. La portata è quella dell'arma ravvicinata (1 Q di norma; 2 o 3 Q per Lancia,
// Tridente, armi inastate, Picca, Frusta) e vale tutto attorno all'ingombro del token. Una sola volta per Round per
// avversario.
// Quindi: la ZoC di un avversario è la fascia profonda quanto la sua portata attorno al suo ingombro; il movimento che
// esce da quella fascia (anche dopo esserci entrato: attraversare) provoca; entrare o fermarsi dentro no. La ZoC non
// blocca: segnala. Parametri in data/mappa.json → zoc. Funzioni pure.
import { dimensioni, chiaveRif } from './token.js';
import { stessaParte } from './area.js';

/** Portata ravvicinata del pezzo in Q: il massimo fra i suoi attacchi ravvicinati (nemici), altrimenti la predefinita. */
export function portataDi(p, dati) {
  const Z = dati.mappa.zoc;
  const portate = (p?.scheda?.attacchi ?? []).filter((a) => a.tipo === 'ravvicinato').map((a) => (Number.isInteger(a.portata_q) ? a.portata_q : Z.portata_predefinita));
  return portate.length ? Math.max(...portate) : Z.portata_predefinita;
}

/** Lo Stato che impedisce al pezzo gli Attacchi di Opportunità (A.132: Stordito, Svenuto), o null. */
export function statoCheImpedisce(p, dati) {
  const vietati = new Set(dati.mappa.zoc.stati_che_impediscono);
  const s = (p?.stati ?? []).find((x) => vietati.has(x.id ?? x));
  return s ? (s.id ?? s) : null;
}

/**
 * Il pezzo controlla una ZoC? Creature dello scontro (non i veicoli), non a 0 PV, senza Stati che impediscono di
 * attaccare (data/mappa.json → zoc.stati_che_impediscono: Stordito e Svenuto, A.132); per la vista giocatori, non
 * nascoste.
 */
export function controllaZoc(p, t, dati, { perGiocatori = false } = {}) {
  if (!p || !t || p.tipo === 'veicolo' || t.rif?.tipo === 'veicolo' || p.aZero) return false;
  if (perGiocatori && t.nascosto) return false;
  return !statoCheImpedisce(p, dati);
}

/** Gli avversari del token `idChi` che controllano una ZoC: [{ token, pezzo, portata }]. */
export function avversariZoc(scena, pezzi, idChi, dati, opzioni = {}) {
  const perChiave = new Map(pezzi.map((p) => [p.chiave, p]));
  const chi = scena.token.find((t) => t.id === idChi);
  const pChi = chi ? perChiave.get(chiaveRif(chi.rif)) : null;
  if (!chi || !pChi?.lato) return [];
  return scena.token
    .filter((t) => t.id !== idChi)
    .map((t) => ({ token: t, pezzo: perChiave.get(chiaveRif(t.rif)) ?? null }))
    .filter(({ token, pezzo }) => pezzo?.lato && !stessaParte(pezzo.lato, pChi.lato) && controllaZoc(pezzo, token, dati, opzioni))
    .map((x) => ({ ...x, portata: portataDi(x.pezzo, dati) }));
}

/**
 * ZoC inattive (A.132, risposta di Marcello del 07/10): gli avversari del token `idChi` che la controllerebbero ma
 * hanno uno Stato che impedisce gli Attacchi di Opportunità (Stordito, Svenuto). Non a 0 PV: quelli non si mostrano.
 * Solo per il master, che le vede tratteggiate: [{ token, pezzo, portata, stato }].
 */
export function avversariZocInattivi(scena, pezzi, idChi, dati) {
  const perChiave = new Map(pezzi.map((p) => [p.chiave, p]));
  const chi = scena.token.find((t) => t.id === idChi);
  const pChi = chi ? perChiave.get(chiaveRif(chi.rif)) : null;
  if (!chi || !pChi?.lato) return [];
  return scena.token
    .filter((t) => t.id !== idChi && t.rif?.tipo !== 'veicolo')
    .map((t) => ({ token: t, pezzo: perChiave.get(chiaveRif(t.rif)) ?? null }))
    .filter(({ pezzo }) => pezzo?.lato && pezzo.tipo !== 'veicolo' && !pezzo.aZero && !stessaParte(pezzo.lato, pChi.lato) && statoCheImpedisce(pezzo, dati))
    .map((x) => ({ ...x, portata: portataDi(x.pezzo, dati), stato: statoCheImpedisce(x.pezzo, dati) }));
}

/** Distanza in Q fra due ingombri (Chebyshev fra rettangoli: 1 = adiacenti, 0 = sovrapposti). */
export function distanzaIngombri(qa, ia, qb, ib) {
  const [wa, ha] = dimensioni(ia), [wb, hb] = dimensioni(ib);
  const dx = Math.max(0, qb[0] - (qa[0] + wa - 1), qa[0] - (qb[0] + wb - 1));
  const dy = Math.max(0, qb[1] - (qa[1] + ha - 1), qa[1] - (qb[1] + hb - 1));
  return Math.max(dx, dy);
}

/** Il token che sta in `q` con il suo ingombro è dentro la portata dell'avversario `a`? */
export const inPortata = (q, ingombro, a) => distanzaIngombri(q, ingombro, a.token.q, a.token.ingombro) <= a.portata;

/** Q delle ZoC degli avversari (fuori dai loro ingombri): Uint8Array per Q della griglia, 1 = dentro una ZoC. */
export function celleZoc(scena, avversari) {
  const { colonne: C, righe: R } = scena.griglia;
  const m = new Uint8Array(C * R);
  for (const a of avversari) {
    const [w, h] = dimensioni(a.token.ingombro);
    const [x0, y0] = a.token.q;
    for (let y = Math.max(0, y0 - a.portata); y < Math.min(R, y0 + h + a.portata); y++) {
      for (let x = Math.max(0, x0 - a.portata); x < Math.min(C, x0 + w + a.portata); x++) {
        if (x >= x0 && x < x0 + w && y >= y0 && y < y0 + h) continue;
        m[y * C + x] = 1;
      }
    }
  }
  return m;
}

/** Posizioni del percorso in cui almeno un Q del token sta in una ZoC (per evidenziarle). */
export function passiInZoc(percorso, ingombro, avversari) {
  return percorso.map((q) => avversari.some((a) => inPortata(q, ingombro, a)));
}

/**
 * Attacchi di Opportunità provocati da un movimento (Giocatore §5.3): per ogni avversario, il primo passo del percorso
 * in cui il token, che era nella sua portata, ne esce. `percorso`: posizioni dalla partenza all'arrivo, comprese.
 * @returns [{ token, pezzo, portata, passo }]
 */
export function attacchiDiOpportunita(percorso, ingombro, avversari) {
  const r = [];
  for (const a of avversari) {
    let dentro = percorso.length ? inPortata(percorso[0], ingombro, a) : false;
    for (let i = 1; i < percorso.length; i++) {
      const ora = inPortata(percorso[i], ingombro, a);
      if (dentro && !ora) { r.push({ ...a, passo: i }); break; }
      dentro = ora;
    }
  }
  return r;
}

/**
 * Avversari che hanno già avuto il loro Attacco di Opportunità nel Round dello scontro (Giocatore §5.3: «una sola volta
 * per Round»). Contano le righe del registro dello scontro letto (che si rilegge ogni secondo) e le segnalazioni fatte
 * da questa pagina e non ancora rilette (`locali`: scritte o in coda di scrittura), così una raffica di movimenti non ne
 * segnala uno a ogni passo. Le righe dei movimenti annullati (`ritirati`: id dei movimenti) non contano più.
 * @param locali [{ scontro, round, da, movimento }]
 * @returns Set degli id dei partecipanti attaccanti
 */
export function giaInQuestoRound(scontro, locali = [], ritirati = new Set()) {
  const r = new Set();
  if (!scontro) return r;
  for (const x of scontro.registro ?? []) {
    if (x.round === scontro.round && x.opportunita?.da && !ritirati.has(x.opportunita.movimento)) r.add(x.opportunita.da);
  }
  for (const l of locali) if (l.scontro === scontro.id && l.round === scontro.round && !ritirati.has(l.movimento)) r.add(l.da);
  return r;
}

/** Testo dell'avviso: «Oshi è uscito dalla portata di Legionario 1: Attacco di Opportunità nei suoi confronti!» */
export const testoOpportunita = (nomeChi, nomeAvversario) => `${nomeChi} è uscito dalla ZoC di ${nomeAvversario}! Attacco di Opportunità di ${nomeAvversario} nei suoi confronti (Giocatore §5.3).`;
