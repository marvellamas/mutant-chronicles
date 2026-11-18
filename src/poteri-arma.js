// I poteri cromatici di un'arma-Artefatto (lotto 219): la Spada dei Tre Riflessi (Armamenti 0.86 §§7.27.2–7.27.3, Magia
// 1.19 §28.5, blocco del 13/11/2026 del Doc E&L). Funzioni pure.
//
// Come funziona, in una riga: il possessore sintonizzato che impugna la spada spende 1 AzP e **1 CM** (intera) per un
// colore, per 5 Round; un solo colore alla volta; cambiare, rinnovare o riattivare costa di nuovo e riparte dalla durata
// completa; lasciare la spada o spegnere il potere termina senza restituire la carica. La riserva è **una sola**, di
// 3 CM Bianche, **condivisa dai tre poteri** (le pietre colorate selezionano, non sono tre Batterie).
//
// L'app **propone, non obbliga** (CLAUDE.md): il costo giusto e i Round che restano; la sintonizzazione e l'impugnatura
// le giudica il tavolo e l'avviso lo dice. Il +1d4 si somma al danno dello stesso colpo (prima dell'Armatura) e i bonus
// «tenuti distinti»: danno base, bonus passivo, potere attivo e modificatori personali sono righe diverse.
//
// Stato: `sessione.attivazioniArmi[uid] = { dal, round, opzione }` (lo stesso registro della CyberArma: la durata si
// ricava dal Round corrente).
import { statoAttivazioneArma } from './attivazione-arma.js';

const isOggetto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

/** Il blocco `poteri_arma` valido di una voce di catalogo, o null. */
export const poteriDi = (def) => (isOggetto(def?.poteri_arma) && Array.isArray(def.poteri_arma.opzioni) && def.poteri_arma.opzioni.length ? def.poteri_arma : null);

/**
 * La opzione (il colore) attiva di un'arma adesso, o null: attivata, non scaduta, con un colore che il profilo conosce.
 * @param poteri `arma.poteriArma`
 */
export function potereAttivo(poteri, sessione, uid) {
  if (!poteri) return null;
  const stato = statoAttivazioneArma(sessione, uid);
  if (!stato?.attiva) return null;
  const x = sessione?.attivazioniArmi?.[uid];
  const opz = poteri.opzioni.find((o) => o.id === x?.opzione);
  return opz ? { ...opz, rimasti: stato.rimasti, dal: stato.dal, round: stato.round } : null;
}

/** «1d8+1» + «1d4» + fisso → «1d8+1d4+2»: i dadi si elencano prima, il fisso in fondo (la forma che leggono i tiri). */
export function formulaConPotere(formula, dadiExtra, fissoExtra = 0) {
  const m = /^((?:\d+d\d+\+)*\d+d\d+)([+-]\d+)?$/.exec(String(formula ?? '').trim());
  if (!m) return null;
  const fisso = Number(m[2] ?? 0) + (Number.isInteger(fissoExtra) ? fissoExtra : 0);
  const dadi = dadiExtra ? `${m[1]}+${dadiExtra}` : m[1];
  return fisso ? `${dadi}${fisso > 0 ? '+' : ''}${fisso}` : dadi;
}

/**
 * L'arma com'è mentre un colore è attivo: danno con il +1d4 (e il +1 del Verde), VA in più, e una riga per ogni modifica
 * (danno base, bonus passivo, potere attivo restano distinti). Senza potere attivo torna la stessa arma.
 */
export function armaConPotere(arma, sessione) {
  const attivo = potereAttivo(arma?.poteriArma, sessione, arma?.uid);
  if (!attivo) return arma;
  const base = arma.danno?.una_mano ?? null;
  const formula = formulaConPotere(base, attivo.dadi_extra, attivo.danno_fisso ?? 0);
  const va = Number.isInteger(attivo.va) ? attivo.va : 0;
  const riga = (etichetta, valore) => ({ etichetta, valore, fonte: 'oggetto', paragrafo: null });
  return {
    ...arma,
    ...(formula ? { danno: { ...arma.danno, una_mano: formula, due_mani: null } } : {}),
    ...(va ? {
      va: (arma.va ?? 0) + va, vaEffettivo: (arma.vaEffettivo ?? arma.va ?? 0) + va,
      scomposizione: [...(arma.scomposizione ?? []), riga(`Potere attivo: ${attivo.nome} (${attivo.colore})`, va)],
    } : {}),
    potereAttivo: { id: attivo.id, nome: attivo.nome, colore: attivo.colore, rimasti: attivo.rimasti, testo: attivo.testo, va, parata_va: attivo.parata_va ?? 0 },
  };
}

/**
 * Lo stato per la scheda: la riserva, che cosa costa, quale colore è attivo, i Round che restano. `riserva` è il numero di
 * CM attuali (intero) della riserva integrata.
 * @returns { cm, round, azione, riserva, opzioni: [{ id, nome, colore, testo, attiva }], attivo, puoAttivare }
 */
export function statoPoteri(arma, sessione, riserva) {
  const p = arma?.poteriArma;
  if (!p) return null;
  const attivo = potereAttivo(p, sessione, arma.uid);
  const r = Number.isInteger(riserva) ? riserva : null;
  return {
    nome: p.nome, cm: p.cm, round: p.round, azione: p.azione, richiede: p.richiede, riserva: r,
    puoAttivare: r === null ? true : r >= p.cm,
    attivo,
    opzioni: p.opzioni.map((o) => ({ id: o.id, nome: o.nome, colore: o.colore, testo: o.testo, attiva: attivo?.id === o.id })),
    sintesi: attivo ? `${attivo.nome} · ${attivo.rimasti} Round` : `${p.cm} CM · ${p.round} Round`,
  };
}

/** Una CM si spende intera: un costo che non è un intero positivo non si paga (A.252: niente frazioni nelle riserve). */
export const costoValido = (cm) => Number.isInteger(cm) && cm >= 1;
