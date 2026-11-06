// Lotto 174 (05/11/2026): quanto della finestra coprono le righe ferme in cima alla pagina (fascia «Copia di prova»,
// riga di stato del tablet, «Nuova versione», rientro). Le colonne che restano incollate scorrendo (PV e PM, Stati,
// Condizioni attive, riepilogo della creazione, tab a sinistra, fascia del master) si fermano sotto di loro e non
// dietro: la misura sta nella variabile CSS --alto-fasce (0 dove non c'è niente, cioè sul PC del Direttore senza
// avvisi), letta da css/style.css. La mappa non ne ha bisogno: è una colonna flex e prende da sola quello che resta.
//
// Lotto 177 (06/11/2026): le righe erano tutte incollate a top: 0 e scorrendo finivano una sopra l'altra — sul
// tablet di una copia di prova la riga di stato spariva dietro la fascia gialla. Ora si impilano: ciascuna si ferma
// sotto quelle che la precedono (il top lo scrive questo modulo, in pixel) e --alto-fasce è la loro somma. Con una
// riga sola il top resta 0 e non cambia niente: sul PC del Direttore e sui tablet dei giocatori, che la fascia non
// ce l'hanno, la pagina è identica a prima.

export const SELETTORE_FASCE = '.fascia-copia-di-lavoro, .fascia-stato-tablet, .barra-aggiornamento, .fascia-rientro';

/** Una riga si impila se è incollata in cima: sticky o fixed con top 0 (o con il top scritto da noi). */
const inCima = (r) => (r.position === 'sticky' || r.position === 'fixed') && (r.impilata || Number.parseFloat(r.top) === 0);

/**
 * Dove si ferma ciascuna riga e quanto coprono in tutto, nell'ordine in cui stanno nella pagina.
 * @param {{ position: string, top: string, altezza: number, impilata?: boolean }[]} righe
 * @returns {{ top: (number|null)[], totale: number }} top null = riga non in cima, da non toccare
 */
export function pilaFasce(righe) {
  const top = [];
  let somma = 0;
  for (const r of righe ?? []) {
    if (!inCima(r)) { top.push(null); continue; }
    top.push(Math.round(somma));
    somma += r.altezza;
  }
  return { top, totale: Math.ceil(somma) };
}

/** Quanto coprono in tutto le righe ferme in cima (la somma: si impilano, non si sovrappongono). */
export const altezzaCoperta = (righe) => pilaFasce(righe).totale;

/** Tiene aggiornata --alto-fasce sull'elemento radice: righe che compaiono, spariscono o cambiano altezza. */
export function seguiAltezzaFasce(documento = document) {
  const radice = documento.documentElement;
  // spostare una riga ne cambia il posto, non la dimensione: il ResizeObserver non riscatta. Se qualche top è
  // cambiato si rimisura al disegno dopo (al massimo un paio di giri), così una riga che cresce dopo essere
  // comparsa non lascia indietro quelle sotto.
  let giro = 0;
  const misura = () => {
    const elementi = [...documento.querySelectorAll(SELETTORE_FASCE)];
    const righe = elementi.map((el) => {
      const cs = getComputedStyle(el);
      return {
        position: cs.position,
        top: cs.top,
        impilata: el.dataset.fasciaImpilata === '1',
        altezza: cs.display === 'none' ? 0 : el.getBoundingClientRect().height,
      };
    });
    const { top, totale } = pilaFasce(righe);
    let cambiato = false;
    elementi.forEach((el, i) => {
      if (top[i] === null) {
        if (el.dataset.fasciaImpilata) { delete el.dataset.fasciaImpilata; el.style.removeProperty('top'); cambiato = true; }
        return;
      }
      el.dataset.fasciaImpilata = '1';
      const px = `${top[i]}px`;
      if (el.style.top !== px) { el.style.top = px; cambiato = true; }
    });
    const px = `${totale}px`;
    if (radice.style.getPropertyValue('--alto-fasce') !== px) { radice.style.setProperty('--alto-fasce', px); cambiato = true; }
    if (cambiato && giro < 2 && typeof requestAnimationFrame === 'function') {
      giro += 1;
      requestAnimationFrame(() => { giro -= 1; misura(); });
    }
  };
  const ridimensiona = typeof ResizeObserver === 'function' ? new ResizeObserver(misura) : null;
  // una riga nasce vuota e si riempie subito dopo (la riga di stato del tablet): si guarda anche dentro, o quelle
  // sotto resterebbero al posto di prima. Non si guarda lo `style`, che è quello che scriviamo noi.
  const dentro = new MutationObserver(misura);
  const osservate = new WeakSet();
  const segui = () => {
    for (const el of documento.querySelectorAll(SELETTORE_FASCE)) {
      if (osservate.has(el)) continue;
      osservate.add(el);
      if (ridimensiona) ridimensiona.observe(el);
      dentro.observe(el, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    }
    misura();
  };
  // le righe stanno fra i figli del body (prepend) e compaiono dopo l'avvio: si guardano solo quelli, non tutta la pagina
  new MutationObserver(segui).observe(documento.body, { childList: true, attributes: true, attributeFilter: ['class', 'hidden'], subtree: false });
  addEventListener('resize', misura);
  segui();
  return misura;
}
