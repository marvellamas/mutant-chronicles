// Lotto 174 (05/11/2026): quanto della finestra coprono le righe ferme in cima alla pagina (fascia «Copia di prova»,
// riga di stato del tablet, «Nuova versione», rientro). Le colonne che restano incollate scorrendo (PV e PM, Stati,
// Condizioni attive, riepilogo della creazione, tab a sinistra, fascia del master) si fermano sotto di loro e non
// dietro: la misura sta nella variabile CSS --alto-fasce (0 dove non c'è niente, cioè sul PC del Direttore senza
// avvisi), letta da css/style.css. La mappa non ne ha bisogno: è una colonna flex e prende da sola quello che resta.
// Le righe sono tutte «sticky» con top: 0, quindi scorrendo si sovrappongono: copre la più alta, non la somma.

export const SELETTORE_FASCE = '.fascia-copia-di-lavoro, .fascia-stato-tablet, .barra-aggiornamento, .fascia-rientro';

/**
 * Quanto coprono le righe ferme in cima: la più alta fra quelle incollate in alto (position sticky o fixed con top 0).
 * @param {{ position: string, top: string, altezza: number }[]} righe
 * @returns {number} pixel interi
 */
export function altezzaCoperta(righe) {
  let max = 0;
  for (const r of righe ?? []) {
    if (!(r.position === 'sticky' || r.position === 'fixed')) continue;
    if (Number.parseFloat(r.top) !== 0) continue;
    if (r.altezza > max) max = r.altezza;
  }
  return Math.ceil(max);
}

/** Tiene aggiornata --alto-fasce sull'elemento radice: righe che compaiono, spariscono o cambiano altezza. */
export function seguiAltezzaFasce(documento = document) {
  const radice = documento.documentElement;
  const misura = () => {
    const righe = [...documento.querySelectorAll(SELETTORE_FASCE)].map((el) => {
      const cs = getComputedStyle(el);
      return { position: cs.position, top: cs.top, altezza: cs.display === 'none' ? 0 : el.getBoundingClientRect().height };
    });
    const px = `${altezzaCoperta(righe)}px`;
    if (radice.style.getPropertyValue('--alto-fasce') !== px) radice.style.setProperty('--alto-fasce', px);
  };
  const ridimensiona = typeof ResizeObserver === 'function' ? new ResizeObserver(misura) : null;
  const osservate = new WeakSet();
  const segui = () => {
    for (const el of documento.querySelectorAll(SELETTORE_FASCE)) if (ridimensiona && !osservate.has(el)) { osservate.add(el); ridimensiona.observe(el); }
    misura();
  };
  // le righe stanno fra i figli del body (prepend) e compaiono dopo l'avvio: si guardano solo quelli, non tutta la pagina
  new MutationObserver(segui).observe(documento.body, { childList: true, attributes: true, attributeFilter: ['class', 'hidden'], subtree: false });
  addEventListener('resize', misura);
  segui();
  return misura;
}
