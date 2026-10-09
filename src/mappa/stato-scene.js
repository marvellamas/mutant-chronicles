// Stato dello scontro accanto a ogni scena dell'elenco delle mappe (richiesta di Marcello del 09/10/2026; Tavolo del
// Master e gruppo «Mappa» della barra della mappa, src/ui/mappa/scene.js). Funzioni pure.
//   «in-corso»    la scena è collegata allo scontro aperto;
//   «terminato»   è collegata a uno scontro che non è più aperto (chiuso, o passato in scontri/archivio/);
//   «bozza»       è collegata a una bozza non ancora iniziata;
//   null          non è collegata, o la bozza non c'è più.

/**
 * @param collegamento scena.collegamento ({ scontro, bozza } o null)
 * @param scontri elenco di /api/scontri: [{ id, stato: 'aperto' | 'chiuso' | 'bozza' | … }]
 * @param aperto id dello scontro aperto, se lo si sa già (la plancia lo tiene aggiornato); altrimenti dall'elenco
 */
export function statoScontroScena(collegamento, scontri = [], aperto = undefined) {
  const c = collegamento ?? {};
  const lista = Array.isArray(scontri) ? scontri : [];
  if (c.scontro) {
    const inCorso = aperto !== undefined ? aperto === c.scontro : lista.some((x) => x.id === c.scontro && x.stato === 'aperto');
    return inCorso ? 'in-corso' : 'terminato';
  }
  if (c.bozza && lista.some((x) => x.id === c.bozza && x.stato === 'bozza')) return 'bozza';
  return null;
}

/** Etichette dell'elenco (testo e suggerimento). */
export const ETICHETTE_SCENA = {
  'in-corso': { testo: 'In corso', titolo: 'Collegata allo scontro aperto' },
  terminato: { testo: 'Scontro terminato', titolo: 'Lo scontro collegato è chiuso' },
  bozza: { testo: 'Bozza', titolo: 'Collegata a una bozza di scontro non ancora iniziata' },
};

/** Le scene con il loro stato, prima quelle «In corso», poi le altre nell'ordine di prima. */
export function sceneConStato(elenco, scontri = [], aperto = undefined) {
  const voci = (elenco ?? []).map((v, i) => ({ ...v, statoScontro: statoScontroScena(v.collegamento, scontri, aperto), ordine: i }));
  return voci.sort((a, b) => (b.statoScontro === 'in-corso') - (a.statoScontro === 'in-corso') || a.ordine - b.ordine).map(({ ordine, ...v }) => v);
}
