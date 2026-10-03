// Avvisi brevi che scompaiono da soli (segnalazione di Marcello dopo la prima prova del Tavolo del Master:
// senza una conferma sembrava che i pulsanti non avessero funzionato). Una funzione unica, riusata dalla plancia
// e dalla scheda: conferme in verde, errori in rosso (restano di più e si chiudono con un clic).
// Gli avvisi stanno in un contenitore fisso del documento, fuori dalla plancia che si ridisegna.
import { h } from './dom.js';

const DURATA = { ok: 4500, info: 4500, errore: 10000 };

function contenitore() {
  let c = document.getElementById('avvisi');
  if (!c) {
    c = h('div', { id: 'avvisi', class: 'avvisi', 'aria-live': 'polite' });
    document.body.append(c);
  }
  return c;
}

/**
 * Mostra un avviso.
 * @param testo una riga o più (array: una riga ciascuna)
 * @param opzioni { tipo: 'ok' | 'info' | 'errore', chiave: un avviso nuovo con la stessa chiave sostituisce il
 *   precedente (clic ripetuti su − e +), durata in ms }
 * @returns l'elemento dell'avviso, o null senza documento (test)
 */
export function avviso(testo, { tipo = 'ok', chiave = null, durata = DURATA[tipo] ?? DURATA.ok } = {}) {
  if (typeof document === 'undefined' || !testo || (Array.isArray(testo) && !testo.length)) return null;
  const c = contenitore();
  if (chiave) for (const x of c.querySelectorAll('.avviso')) if (x.dataset.chiave === chiave) x.remove();
  const righe = [testo].flat().filter(Boolean);
  const el = h('div', {
    class: `avviso avviso-${tipo}`, role: tipo === 'errore' ? 'alert' : 'status', dataset: chiave ? { chiave } : null,
    title: 'Clic per chiudere', onclick: () => el.remove(),
  }, righe.map((r) => h('p', {}, r)));
  c.append(el);
  // al massimo cinque avvisi insieme: i più vecchi lasciano il posto
  while (c.children.length > 5) c.firstElementChild.remove();
  setTimeout(() => el.remove(), durata);
  return el;
}

/** Errore ben visibile: resta più a lungo, si chiude con un clic. */
export const avvisoErrore = (testo, opzioni = {}) => avviso(testo, { ...opzioni, tipo: 'errore' });
