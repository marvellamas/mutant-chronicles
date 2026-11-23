// Il recupero dello scudo energetico di un veicolo (lotto 238, 23/11/2026). Funzioni pure.
//
// **Che cosa c'era già.** Il recupero della Neverlost esiste dal lotto 158: il profilo dice quanto recupera
// (`scudo.recupero`: 3 Round senza colpi, 20 ScE per Round) e `roundSenzaColpi` di `src/neverlost.js` muove il
// contatore **nel record** (`mezzo.scudo.sce`), fermandosi al massimo del profilo (`Math.min` con `sce_max`).
// Questo lotto non riscrive niente di tutto quello: il profilo dice quanto, il record quanto ha adesso, ed è la
// distinzione che abbiamo già.
//
// **Che cosa mancava, e perché conta.** Niente impediva di far recuperare lo scudo **fuori da uno scontro**: il
// pulsante «Round senza colpi» chiamava direttamente la funzione, e un Round fuori da un combattimento non
// esiste. Senza la guardia, un tocco distratto nella tab Veicoli fra due scontri avrebbe rimesso ScE che il
// manuale non dà: il §16 lega il recupero ai Round («Dopo tre rnd consecutivi senza essere colpito…») e i Round
// li conta lo scontro aperto. **Se il Direttore vuole il recupero fra due scontri, lo fa lui** — con il campo
// degli ScE, che si scrive a mano come sempre. L'app non lo fa da sé.
//
// Qui c'è quella guardia, in un posto solo, e niente altro: `recuperaScudo` è la sola strada per il recupero
// automatico, e senza uno scontro aperto torna il record **intatto** col motivo scritto.

import { roundSenzaColpi } from './neverlost.js';

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Il profilo dichiara uno scudo con un recupero? */
export const haRecupero = (profilo) => isOggetto(profilo?.scudo?.recupero)
  && Number.isFinite(profilo.scudo.recupero.sce_per_round) && Number.isFinite(profilo.scudo.recupero.round_senza_colpi);

/**
 * Lo scontro è aperto? Un Round esiste solo dentro uno scontro: il recupero si conta per Round, quindi fuori da
 * uno scontro non si conta. Uno scontro archiviato o chiuso non è aperto.
 */
export function scontroAperto(scontro) {
  if (!isOggetto(scontro)) return false;
  if (scontro.stato && scontro.stato !== 'aperto') return false;
  return Number.isFinite(scontro.round) && scontro.round >= 1;
}

/**
 * Si può recuperare adesso?
 * @returns {{ puo, motivo }} — `motivo` è la frase da scrivere accanto al pulsante quando non si può.
 */
export function puoRecuperare(mezzo, profilo, scontro) {
  if (!haRecupero(profilo)) return { puo: false, motivo: 'Questo mezzo non ha uno scudo con un recupero dichiarato dal manuale.' };
  if (!scontroAperto(scontro)) {
    return { puo: false, motivo: 'Il recupero si conta per Round, e i Round li conta uno scontro aperto: fuori da uno scontro l’app non rimette ScE. Se vuoi il recupero fra due scontri, scrivi tu gli ScE.' };
  }
  if (mezzo?.scudo?.attivo !== true) return { puo: false, motivo: 'Lo scudo è spento: si attiva prima (1 AzP e 1 carica Blu).' };
  if (mezzo?.scudo?.sce === null || mezzo?.scudo?.sce === undefined) return { puo: false, motivo: 'ScE da registrare: scrivi i punti attuali dello scudo.' };
  return { puo: true, motivo: null };
}

/**
 * Un Round senza colpi: il contatore sale e, dal Round dichiarato dal profilo, lo scudo recupera — **fino al
 * massimo** e **solo dentro uno scontro aperto**.
 *
 * Non lancia e non blocca niente: senza scontro torna il mezzo com'era, con il motivo fra gli avvisi. Chi lo
 * mostra scrive l'avviso; la parola finale è del Direttore, che gli ScE li può scrivere a mano.
 *
 * @returns {{ mezzo, righe, avvisi, recuperato }}
 */
export function recuperaScudo(mezzo, profilo, scontro) {
  const p = puoRecuperare(mezzo, profilo, scontro);
  if (!p.puo) return { mezzo, righe: [], avvisi: [p.motivo], recuperato: 0 };
  const prima = mezzo.scudo.sce;
  const r = roundSenzaColpi(mezzo, profilo);
  const dopo = r.mezzo?.scudo?.sce ?? prima;
  return { ...r, recuperato: dopo - prima };
}

/** Il quadro dello scudo per la scheda: quanto ha, quanto recupera, e se adesso può. */
export function statoScudo(mezzo, profilo, scontro) {
  if (!haRecupero(profilo)) return null;
  const R = profilo.scudo.recupero;
  const p = puoRecuperare(mezzo, profilo, scontro);
  return {
    sce: mezzo?.scudo?.sce ?? null,
    massimo: profilo.scudo.sce_max,
    attivo: mezzo?.scudo?.attivo === true,
    roundSenzaColpi: mezzo?.scudo?.round_senza_colpi ?? 0,
    recupero: { dalRound: R.round_senza_colpi, scePerRound: R.sce_per_round },
    puo: p.puo,
    motivo: p.motivo,
    testo: `Dal ${R.round_senza_colpi}° Round consecutivo senza colpi: +${R.sce_per_round} ScE per Round, fino a ${profilo.scudo.sce_max}.`,
  };
}
