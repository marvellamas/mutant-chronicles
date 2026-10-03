// Ridisegno della plancia del Tavolo del Master senza disturbare chi la sta usando (segnalazione di Marcello
// dopo la prima prova: la tendina «Tipo» di «Aggiungi nemici» si richiudeva da sola ogni secondo o due).
// La plancia si ridisegna intera (svuota + nuovo albero) quando l'aggiornamento periodico trova novità: un
// <select> aperto o un campo in cui si scrive venivano sostituiti da elementi nuovi, chiusi e senza focus.
//
// Il custode fa tre cose, per tutti i controlli della plancia e delle carte:
// - mentre un controllo (tendina, campo, area di testo) ha il focus, il ridisegno dell'aggiornamento periodico
//   si rinvia; si fa appena il focus esce dai controlli;
// - i valori scritti o scelti e non ancora confermati («bozze») si rimettono nei controlli nuovi con la stessa
//   chiave; le bozze dei controlli che non ci sono più si dimenticano;
// - dopo un ridisegno voluto (un'azione dell'utente) il focus torna sul controllo con la stessa chiave.
// Le caselle di spunta e i pulsanti di scelta agiscono subito: non sono bozze.
// Funzioni senza dipendenze dal DOM vero (bastano querySelectorAll, contains, value, focus): i test le usano
// con oggetti finti (tests/ridisegno.test.js).

export const SELETTORE_CONTROLLI = 'input:not([type="file"]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea';

/** Testo proprio di un'etichetta, senza quello dei figli (le opzioni di una tendina dentro la <label>). */
function testoProprio(el) {
  return [...(el?.childNodes ?? [])].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
}

/** Chiave stabile di un controllo fra un disegno e il successivo: data-chiave, aria-label, name, etichetta. */
export function chiaveControllo(el) {
  if (!el) return null;
  const d = el.dataset?.chiave ?? el.getAttribute?.('data-chiave');
  if (d) return d;
  const aria = el.getAttribute?.('aria-label');
  if (aria) return aria;
  const nome = el.getAttribute?.('name');
  if (nome) return `${el.tagName}:${nome}`;
  const etichetta = testoProprio(el.closest?.('label'));
  return etichetta ? `${el.tagName}:${etichetta}` : null;
}

/** È un controllo che si sta usando (focus su una tendina, un campo, un'area di testo dentro la radice)? */
export function controlloInUso(radice, attivo) {
  if (!attivo || !radice?.contains?.(attivo)) return false;
  return typeof attivo.matches === 'function' ? attivo.matches(SELETTORE_CONTROLLI) : ['INPUT', 'SELECT', 'TEXTAREA'].includes(attivo.tagName);
}

/**
 * Custode dei controlli di `radice`.
 * @param opzioni { documento: per activeElement (predefinito: document), ridisegna: ridisegno rinviato }
 */
export function creaCustode(radice, { documento = globalThis.document, ridisegna = () => {} } = {}) {
  const bozze = new Map(); // chiave → valore scritto o scelto e non ancora confermato
  let rinviato = false;
  const attivo = () => documento?.activeElement ?? null;

  const ricorda = (e) => {
    const el = e.target;
    if (!radice?.contains?.(el) || !['INPUT', 'SELECT', 'TEXTAREA'].includes(el?.tagName)) return;
    if (el.type === 'checkbox' || el.type === 'radio' || el.type === 'file' || el.type === 'hidden') return;
    const k = chiaveControllo(el);
    if (k) bozze.set(k, el.value);
  };
  const uscita = () => {
    if (!rinviato) return;
    // il focus si sposta dopo focusout: si guarda al turno successivo
    setTimeout(() => {
      if (!rinviato || controlloInUso(radice, attivo())) return;
      rinviato = false;
      ridisegna();
    }, 0);
  };
  radice?.addEventListener?.('input', ricorda, true);
  radice?.addEventListener?.('change', ricorda, true);
  radice?.addEventListener?.('focusout', uscita, true);

  return {
    bozze,
    get rinviato() { return rinviato; },
    /** Aggiornamento periodico: true se si può ridisegnare ora; altrimenti il ridisegno resta in attesa. */
    puoRidisegnare() {
      if (controlloInUso(radice, attivo())) { rinviato = true; return false; }
      rinviato = false;
      return true;
    },
    /** Prima di svuotare: quale controllo ha il focus e dove è il cursore. */
    fotografa() {
      const el = attivo();
      if (!controlloInUso(radice, el)) return { attivo: null };
      let selezione = null;
      try { selezione = typeof el.selectionStart === 'number' ? [el.selectionStart, el.selectionEnd] : null; } catch { selezione = null; }
      return { attivo: chiaveControllo(el), selezione };
    },
    /** Dopo il nuovo disegno: le bozze nei controlli con la stessa chiave, il focus dov'era. */
    ripristina(foto = { attivo: null }) {
      const presenti = new Set();
      for (const el of radice?.querySelectorAll?.(SELETTORE_CONTROLLI) ?? []) {
        const k = chiaveControllo(el);
        if (!k) continue;
        presenti.add(k);
        if (bozze.has(k)) {
          const v = bozze.get(k);
          // una tendina tiene la scelta solo se l'opzione c'è ancora (uno Stato appena aggiunto non c'è più)
          if (el.tagName !== 'SELECT' || [...(el.options ?? [])].some((o) => o.value === v)) el.value = v;
        }
        if (foto.attivo && k === foto.attivo) {
          el.focus?.({ preventScroll: true });
          if (foto.selezione) { try { el.setSelectionRange?.(...foto.selezione); } catch { /* campi numerici */ } }
        }
      }
      for (const k of [...bozze.keys()]) if (!presenti.has(k)) bozze.delete(k);
    },
    /** Una bozza confermata (il valore è entrato nello scontro): non si rimette più. */
    dimentica(chiave) { bozze.delete(chiave); },
    /** Uscendo dalla plancia: niente più ascolti sulla radice. */
    smonta() {
      rinviato = false;
      radice?.removeEventListener?.('input', ricorda, true);
      radice?.removeEventListener?.('change', ricorda, true);
      radice?.removeEventListener?.('focusout', uscita, true);
    },
  };
}
