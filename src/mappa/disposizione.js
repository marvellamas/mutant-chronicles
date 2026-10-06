// Barra accanto alla mappa (lotto 6 di docs/battlemap/piano.md; §11 e §11.1 della specifica): la plancia diventa il
// pannello di destra della mappa, in tre disposizioni.
//   mappa        «Mappa grande»: colonna stretta con i mini-token, i PV e il turno
//   equilibrata  circa due terzi mappa, un terzo scontro
//   scontro      «Scontro grande»: barra larga, mappa ridotta
// Il bordo fra mappa e barra si trascina; la scelta si ricorda per schermo (localStorage, chiave con le dimensioni dello
// schermo). Parametri in data/mappa.json → vista.barra. Funzioni pure.

export const DISPOSIZIONI = ['mappa', 'equilibrata', 'scontro'];
export const NOMI_DISPOSIZIONI = { mappa: 'Mappa grande', equilibrata: 'Equilibrata', scontro: 'Scontro grande' };

/** La disposizione dopo `d` (Tab, doppio clic sul bordo), o prima con verso −1 (Maiusc+Tab). */
export function prossimaDisposizione(d, verso = 1) {
  const i = DISPOSIZIONI.indexOf(d);
  return DISPOSIZIONI[((i < 0 ? 1 : i) + verso + DISPOSIZIONI.length) % DISPOSIZIONI.length];
}

/** Stato della barra: la disposizione e la frazione di pagina di «Equilibrata» e di «Scontro grande». */
export const disposizioneIniziale = (B) => ({ disposizione: 'equilibrata', frazioni: { equilibrata: B.equilibrata, scontro: B.scontro_grande } });

const limita = (v, min, max) => Math.min(max, Math.max(min, v));

/** Stato letto dal localStorage (o da qualunque fonte): valori fuori misura tornano a quelli di data/mappa.json. */
export function normalizzaDisposizione(v, B) {
  const base = disposizioneIniziale(B);
  if (!v || typeof v !== 'object') return base;
  const fr = (k) => (Number.isFinite(v.frazioni?.[k]) ? limita(v.frazioni[k], B.frazione_minima, B.frazione_massima) : base.frazioni[k]);
  return { disposizione: DISPOSIZIONI.includes(v.disposizione) ? v.disposizione : base.disposizione, frazioni: { equilibrata: fr('equilibrata'), scontro: fr('scontro') } };
}

/** Larghezza della barra in pixel per una pagina larga `totale`: la mappa tiene almeno mappa_minima_px. */
export function larghezzaBarra(stato, totale, B) {
  if (stato.disposizione === 'mappa') return B.mappa_grande_px;
  const voluta = stato.frazioni[stato.disposizione] * totale;
  return Math.round(Math.max(B.mappa_grande_px, Math.min(voluta, totale - B.mappa_minima_px)));
}

/**
 * Bordo trascinato: la barra larga `larghezza` pixel su una pagina larga `totale`. Sotto riduci_sotto_px la barra torna
 * «Mappa grande»; altrimenti la frazione si scrive nella disposizione in corso («Mappa grande» diventa «Equilibrata»).
 */
export function trascinaBordo(stato, larghezza, totale, B) {
  if (larghezza < B.riduci_sotto_px) return { ...stato, disposizione: 'mappa' };
  const disposizione = stato.disposizione === 'mappa' ? 'equilibrata' : stato.disposizione;
  const frazione = limita(Math.min(larghezza, totale - B.mappa_minima_px) / totale, B.frazione_minima, B.frazione_massima);
  return { disposizione, frazioni: { ...stato.frazioni, [disposizione]: Math.round(frazione * 1000) / 1000 } };
}

/** Chiave del localStorage per questo schermo: la scelta di un televisore non vale per il portatile. */
export const chiaveSchermo = (larghezza, altezza) => `mutant-mappa-disposizione:${Math.round(larghezza)}x${Math.round(altezza)}`;
