// Piccole utilità DOM, senza dipendenze.

/**
 * Crea un elemento. props: class, on<Evento>, dataset, proprietà DOM (value, checked, disabled…)
 * o attributi; i figli possono essere nodi, stringhe, numeri, array o null.
 */
export function h(tag, props, ...figli) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'open' || k === 'selected') el[k] = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  aggiungi(el, figli);
  return el;
}

export function aggiungi(el, figli) {
  for (const f of [figli].flat(Infinity)) {
    if (f === null || f === undefined || f === false) continue;
    el.append(f instanceof Node ? f : String(f));
  }
  return el;
}

export function svuota(el, ...figli) {
  el.replaceChildren();
  return aggiungi(el, figli);
}

/** Numero con segno tipografico: +2, −1, 0. */
export function segno(n) {
  if (n === null || n === undefined) return '—';
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${-n}`;
  return '0';
}

/** "4 + 1d6", "2", "1d4". */
export function dadi({ fisso, dado }) {
  if (!dado) return String(fisso);
  return fisso ? `${fisso} + 1d${dado}` : `1d${dado}`;
}

/** Scarica un testo come file. */
export function scaricaFile(nomeFile, testo, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([testo], { type: tipo }));
  const a = h('a', { href: url, download: nomeFile });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

