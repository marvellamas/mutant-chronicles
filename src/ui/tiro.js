// Componente per un tiro di dado: "Tira" oppure "Inserisci il risultato tirato dal vivo".
// Generico: riceve la specifica del tiro (src/tiri.js) e il valore salvato
// { valore, origine }, e restituisce il nuovo valore con imposta(). Non sa in quale passo
// compare: lo useranno anche i tiri dell'avanzamento di livello.
import { h } from './dom.js';
import { tira, tiroManuale, valoreTiro } from '../tiri.js';

const casuale = (facce) => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % facce) + 1;
};

/**
 * @param {object} o
 * @param {string} o.id identificativo univoco nella pagina (per etichette e memoria dei dadi)
 * @param {{formula, minimo, massimo, dadi, facce, fisso}} o.spec da specTiro()
 * @param {{valore: number, origine: 'app'|'manuale'}|null} o.tiro valore attuale
 * @param {(tiro: object|null) => void} o.imposta salva il nuovo valore
 * @param {object} [o.memoria] oggetto che sopravvive ai ridisegni (per mostrare i singoli dadi)
 */
export function componenteTiro({ id, spec, tiro, imposta, memoria = {} }) {
  const valore = valoreTiro(tiro);
  const errore = h('p', { class: 'motivo', role: 'alert', id: `${id}-errore` });
  const input = h('input', {
    id: `${id}-valore`, type: 'number', inputmode: 'numeric', step: 1, min: spec.minimo, max: spec.massimo,
    value: tiro?.origine === 'manuale' ? String(valore) : '', 'aria-describedby': `${id}-intervallo ${id}-errore`,
  });
  const dettaglio = memoria[`tiro:${id}`];

  const inserisci = (e) => {
    e.preventDefault();
    const testo = input.value.trim();
    const r = tiroManuale(testo === '' ? NaN : Number(testo), spec);
    if (r.errore) {
      errore.textContent = r.errore;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    delete memoria[`tiro:${id}`];
    imposta(r.tiro);
  };

  const tiraOra = () => {
    const r = tira(spec, casuale);
    memoria[`tiro:${id}`] = spec.dadi > 1 || spec.fisso
      ? `${r.risultati.join(' + ')}${spec.fisso ? ` ${spec.fisso > 0 ? '+' : '−'} ${Math.abs(spec.fisso)}` : ''}`
      : null;
    imposta(r.tiro);
  };

  return h('div', { class: 'tiro' },
    h('p', { class: 'tiro-formula' }, 'Tiro: ', h('strong', {}, spec.formula),
      h('span', { class: 'nota', id: `${id}-intervallo` }, ` · risultato da ${spec.minimo} a ${spec.massimo}`)),
    h('div', { class: 'tiro-modi' },
      h('button', { type: 'button', class: 'btn primario', onclick: tiraOra }, `Tira ${spec.formula}`),
      h('span', { class: 'tiro-oppure' }, 'oppure'),
      h('form', { class: 'tiro-manuale', onsubmit: inserisci, novalidate: true },
        h('label', { for: `${id}-valore` }, 'risultato tirato dal vivo'),
        input,
        h('button', { type: 'submit', class: 'btn' }, 'Inserisci'))),
    errore,
    valore === null
      ? h('p', { class: 'tiro-valore vuoto' }, 'Nessun risultato: tira o inserisci il valore.')
      : h('p', { class: 'tiro-valore' }, 'Risultato: ', h('strong', {}, String(valore)), ' ',
        h('span', { class: `etichetta origine-${tiro.origine}` }, tiro.origine === 'manuale' ? 'inserito a mano' : 'tirato dall’app'),
        tiro.origine === 'app' && dettaglio ? h('small', { class: 'nota' }, ` (${dettaglio})`) : null));
}
