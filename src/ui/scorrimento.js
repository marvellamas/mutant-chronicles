// Posizione della pagina durante i ridisegni della scheda (richiesta del 19/10/2026, dal tablet).
// La scheda si ridisegna intera a ogni modifica di un valore (svuota + nuovo albero): per un istante il documento
// diventa più corto della finestra e il browser (sul tablet in particolare) riporta la pagina in cima, anche se poi
// si rimette lo scorrimento di prima. Il rimedio è tenere ferma l'altezza della radice per tutto il ridisegno e
// rimettere la posizione dopo, anche al fotogramma successivo.
//
// Funzioni con finestra e documento passati, così si provano senza browser (tests/tablet-scorrimento.test.js).

/**
 * Esegue `ridisegna` tenendo ferma la posizione dello scorrimento: la radice mantiene l'altezza di prima finché il
 * nuovo albero non c'è, poi lo scorrimento si rimette (subito e al fotogramma dopo) e l'altezza si libera.
 */
export function conScorrimentoFisso(radice, ridisegna, { finestra = window, rinvia = (f) => requestAnimationFrame(f) } = {}) {
  const y = finestra.scrollY;
  const x = finestra.scrollX ?? 0;
  const altezza = finestra.document?.documentElement?.scrollHeight ?? 0;
  if (radice?.style && altezza > 0) radice.style.minHeight = `${altezza}px`;
  try {
    return ridisegna();
  } finally {
    finestra.scrollTo(x, y);
    rinvia(() => {
      finestra.scrollTo(x, y);
      if (radice?.style) radice.style.minHeight = '';
    });
  }
}

/** Il pulsante «torna in cima» si vede solo oltre la soglia (regole.json → interfaccia.torna_sopra.soglia_px). */
export const tornaSopraVisibile = (scrollY, soglia) => Number.isFinite(scrollY) && Number.isFinite(soglia) && scrollY > soglia;

/**
 * Pulsante fisso in basso a destra che riporta in cima, visibile solo quando si è scesi abbastanza. Sta fuori dalla
 * radice della scheda (che si svuota a ogni ridisegno) e non occupa spazio nel flusso: non copre i contenuti, è un
 * cerchio piccolo nell'angolo (css/style.css → .torna-sopra). Si monta una volta sola.
 */
export function montaTornaSopra(config, { finestra = window, documento = document } = {}) {
  if (documento.getElementById('torna-sopra')) return null;
  const pulsante = documento.createElement('button');
  pulsante.type = 'button';
  pulsante.id = 'torna-sopra';
  pulsante.className = 'torna-sopra';
  pulsante.hidden = true;
  pulsante.title = config.etichetta;
  pulsante.setAttribute('aria-label', config.etichetta);
  pulsante.textContent = '↑';
  pulsante.addEventListener('click', () => finestra.scrollTo({ top: 0, behavior: 'smooth' }));
  const aggiorna = () => { pulsante.hidden = !tornaSopraVisibile(finestra.scrollY, config.soglia_px); };
  finestra.addEventListener('scroll', aggiorna, { passive: true });
  finestra.addEventListener('resize', aggiorna, { passive: true });
  documento.body.append(pulsante);
  aggiorna();
  return pulsante;
}
