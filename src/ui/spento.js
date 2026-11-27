// Lotto 258 — **un pulsante spento dice perché, al tocco.** Una funzione sola per tutta l'app.
//
// Il problema: su 108 pulsanti spenti (`disabled`), 65 davano il motivo nel solo `title` e 43 nemmeno quello. Il `title`
// è il suggerimento del mouse: su un tablet non c'è, e un pulsante `disabled` non riceve nemmeno il tocco (il browser
// non manda l'evento). Il giocatore tocca, non succede niente e non sa perché: è un blocco muto, la classe opposta ai
// blocchi ma con la stessa regola (CLAUDE.md: l'app aiuta il tavolo, non lo rallenta; il giocatore sa sempre che cosa è
// successo).
//
// Il rimedio, in un posto solo: un pulsante «spento» non è `disabled` ma `aria-disabled="true"` — resta toccabile,
// comunque non fa quello che farebbe — con il suo motivo in `data-motivo`. Un solo ascoltatore sul documento (fase di
// cattura, quindi prima di qualunque `onclick`) ferma il clic e mostra il motivo come avviso breve («Adesso non si
// può: …»), che non occupa spazio fisso. Il `title` segue il motivo (per il mouse) e torna com'era quando il pulsante
// si riaccende.
//
// Come si usa:
//   h('button', { …, spento: motivo })      // motivo: testo; vuoto/false/null = acceso
//   spegni(el, motivo)                      // per aggiornare un pulsante già disegnato (valori vivi)
//
// **Non c'è una terza strada**: `tests/spento-258.test.js` fallisce se in `src/` un `h('button', …)` ha un `disabled:`
// o se un pulsante si spegne senza motivo.

let installato = false;

/** Il testo del motivo, o '' se il pulsante è acceso. */
export const motivoSpento = (el) => (el?.getAttribute?.('aria-disabled') === 'true' ? (el.dataset?.motivo ?? '') : '');

/** Un pulsante è «spento» se lo è per `disabled` o per `aria-disabled` (le due forme che esistono in app). */
export const eSpento = (el) => !!el && (el.disabled === true || el.getAttribute?.('aria-disabled') === 'true');

/**
 * Il motivo di un tasto − o + che è arrivato a un limite, o null: un posto solo per le stesse due frasi.
 * @param valore il valore adesso; @param delta il passo (negativo = −); @param max null se non c'è un massimo
 * @param nome «PV di Oshi», «Distintivi»…
 */
export function motivoLimite(valore, delta, max, nome) {
  if (delta < 0) return valore <= 0 ? `${nome} già a 0.` : null;
  return max !== null && max !== undefined && valore >= max ? `${nome} già al massimo (${max}).` : null;
}

/** Quello che si dice quando il motivo è stato dimenticato: un difetto, ma mai un pulsante muto. */
export const MOTIVO_DI_RIPIEGO = 'Adesso non si può fare.';

/**
 * Spegne (motivo non vuoto) o riaccende (null, false, '') un pulsante.
 * @param el il pulsante
 * @param motivo una frase breve che dice perché non si può, e se possibile che cosa fare («Scegli prima un cristallo»)
 */
export function spegni(el, motivo) {
  if (!el) return el;
  const testo = typeof motivo === 'string' ? motivo.trim() : (motivo ? MOTIVO_DI_RIPIEGO : '');
  if (testo) {
    if (el.dataset.titoloBase === undefined) el.dataset.titoloBase = el.getAttribute('title') ?? '';
    el.setAttribute('aria-disabled', 'true');
    el.dataset.motivo = testo;
    el.setAttribute('title', testo);
    installaMotivoAlTocco();
    return el;
  }
  if (el.getAttribute('aria-disabled') === 'true' && el.dataset.motivo !== undefined) {
    el.removeAttribute('aria-disabled');
    delete el.dataset.motivo;
    const base = el.dataset.titoloBase;
    delete el.dataset.titoloBase;
    if (base) el.setAttribute('title', base); else el.removeAttribute('title');
  }
  return el;
}

/** L'ascoltatore unico (si installa da solo alla prima volta che un pulsante si spegne). */
export function installaMotivoAlTocco() {
  if (installato || typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
  installato = true;
  document.addEventListener('click', (e) => {
    const b = e.target?.closest?.('button[aria-disabled="true"][data-motivo]');
    if (!b) return;
    // prima di qualunque onclick del pulsante o dei suoi antenati: il pulsante spento non deve fare niente
    e.preventDefault();
    e.stopImmediatePropagation();
    import('./avvisi.js').then((m) => {
      m.avviso(b.dataset.motivo, { tipo: 'info', chiave: 'motivo-tasto', durata: 4500 });
      // una finestrella modale sta sopra a tutto, avvisi compresi: dentro una, il contenitore degli avvisi va a stare con lei
      const finestra = b.closest?.('dialog');
      const contenitore = document.getElementById('avvisi');
      if (finestra?.open && contenitore && contenitore.parentNode !== finestra) finestra.append(contenitore);
    });
  }, true);
}
