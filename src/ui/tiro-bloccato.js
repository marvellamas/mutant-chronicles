// A.297 (lotto 228): il tiro dei PV o dei PM già registrato. Si legge, non si rifà.
// Al giocatore nessun pulsante «Tira» e nessun campo: il primo risultato vale (src/tiri-avanzamento.js). Al Direttore
// (`registrato.correggi`) una correzione con il motivo, per un errore materiale — il dado mostrava 6 e fu scritto 3 —: non è un secondo tiro.
import { h } from './dom.js';

/**
 * @param {{id, spec, tiro, valore, registrato}} o registrato: { corretto?: { da, motivo }, correggi?: (valore, motivo) => { errore? } | void }
 */
export function tiroBloccato({ id, spec, tiro, valore, registrato }) {
  const errore = h('p', { class: 'motivo', role: 'alert', id: `${id}-errore` });
  const c = registrato?.corretto;
  const correzione = registrato?.correggi ? (() => {
    const nuovo = h('input', { id: `${id}-corretto`, type: 'number', inputmode: 'numeric', step: 1, min: spec.minimo, max: spec.massimo, 'aria-label': 'Valore mostrato dal dado' });
    const motivo = h('input', { id: `${id}-motivo`, type: 'text', placeholder: 'Motivo (che cosa mostrava il dado)', 'aria-label': 'Motivo della correzione' });
    return h('form', {
      class: 'tiro-correzione',
      novalidate: true,
      onsubmit: (e) => {
        e.preventDefault();
        const r = registrato.correggi(nuovo.value.trim() === '' ? NaN : Number(nuovo.value), motivo.value);
        errore.textContent = r?.errore ?? '';
      },
    },
    h('label', { for: `${id}-corretto` }, 'Correzione del Direttore (errore materiale): '), nuovo, ' ', motivo, ' ', h('button', { type: 'submit', class: 'btn' }, 'Correggi'), errore);
  })() : null;
  return h('div', { class: 'tiro tiro-bloccato', 'data-tiro-bloccato': '' },
    h('p', { class: 'tiro-formula' }, 'Tiro: ', h('strong', {}, spec.formula)),
    h('p', { class: 'tiro-valore' }, 'Risultato: ', h('strong', {}, String(valore)), ' ',
      h('span', { class: `etichetta origine-${tiro?.origine ?? 'app'}` }, tiro?.origine === 'manuale' ? 'inserito a mano' : 'tirato dall’app'), ' ',
      h('span', { class: 'etichetta' }, '🔒 registrato')),
    h('p', { class: 'nota' }, 'Vale il primo risultato: non si rifà. Solo il Direttore corregge un errore materiale.', c ? ` Corretto dal Direttore da ${c.da} a ${valore}: ${c.motivo}.` : ''),
    correzione);
}
