// Avvisi brevi che scompaiono da soli (segnalazione di Marcello dopo la prima prova del Tavolo del Master:
// senza una conferma sembrava che i pulsanti non avessero funzionato). Una funzione unica, riusata dalla plancia
// e dalla scheda: conferme in verde, errori in rosso (restano di più e si chiudono con un clic).
// Gli avvisi stanno in un contenitore fisso del documento, fuori dalla plancia che si ridisegna.
// Lo stesso avviso ripetuto mentre è ancora visibile non se ne aggiunge un altro: si mostra una volta, con «×N»,
// e il suo tempo riparte (primo test della mappa di Marcello, 06/10/2026: una pila di errori identici).
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

/** Firma di un avviso: due avvisi con la stessa firma sono lo stesso messaggio. */
export const firmaAvviso = (tipo, righe) => `${tipo}|${[righe].flat().filter(Boolean).join('\n')}`;

/**
 * Mostra un avviso.
 * @param testo una riga o più (array: una riga ciascuna)
 * @param opzioni { tipo: 'ok' | 'info' | 'errore', chiave: un avviso nuovo con la stessa chiave sostituisce il
 *   precedente (clic ripetuti su − e +), durata in ms, azioni: [{ testo, fai }] pulsanti dentro l'avviso }
 * @returns l'elemento dell'avviso, o null senza documento (test)
 */
export function avviso(testo, { tipo = 'ok', chiave = null, durata = DURATA[tipo] ?? DURATA.ok, azioni = [] } = {}) {
  if (typeof document === 'undefined' || !testo || (Array.isArray(testo) && !testo.length)) return null;
  const c = contenitore();
  if (chiave) for (const x of c.querySelectorAll('.avviso')) if (x.dataset.chiave === chiave) x.remove();
  const righe = [testo].flat().filter(Boolean);
  const firma = firmaAvviso(tipo, righe);
  // lo stesso messaggio ancora visibile: contatore e tempo da capo, nessun avviso in più
  const uguale = chiave ? null : [...c.querySelectorAll('.avviso')].find((x) => x.dataset.firma === firma);
  if (uguale) {
    const volte = Number(uguale.dataset.volte || 1) + 1;
    uguale.dataset.volte = String(volte);
    let conta = uguale.querySelector('.avviso-volte');
    if (!conta) { conta = h('span', { class: 'avviso-volte', 'aria-label': `ripetuto ${volte} volte` }); uguale.prepend(conta); }
    conta.textContent = `×${volte}`;
    clearTimeout(uguale._timer);
    uguale._timer = setTimeout(() => uguale.remove(), durata);
    c.append(uguale); // in fondo, fra i più recenti
    return uguale;
  }
  const el = h('div', {
    class: `avviso avviso-${tipo}`, role: tipo === 'errore' ? 'alert' : 'status', dataset: { firma, volte: '1', ...(chiave ? { chiave } : {}) },
    title: 'Clic per chiudere', onclick: () => el.remove(),
  }, righe.map((r) => h('p', {}, r)),
  // pulsanti (per esempio «Attacca!» dall'avviso di un Attacco di Opportunità): fanno la loro azione e chiudono
  azioni.length ? h('div', { class: 'avviso-azioni' }, azioni.map((a) => h('button', { type: 'button', class: 'btn btn-piccolo primario', onclick: (e) => { e.stopPropagation(); el.remove(); a.fai(); } }, a.testo))) : null);
  c.append(el);
  // al massimo cinque avvisi insieme: i più vecchi lasciano il posto
  while (c.children.length > 5) c.firstElementChild.remove();
  el._timer = setTimeout(() => el.remove(), durata);
  return el;
}

/** Errore ben visibile: resta più a lungo, si chiude con un clic. */
export const avvisoErrore = (testo, opzioni = {}) => avviso(testo, { ...opzioni, tipo: 'errore' });
