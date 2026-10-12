// Barra degli strumenti della mappa e pannello di quello che è selezionato (12/10/2026,
// docs/battlemap/ricognizione-editor-2026-10-12.md). Prima gli strumenti stavano dentro tre pannelli richiudibili,
// con tre pulsanti «Pennello» e tre «Rettangolo», e due righe accese insieme di cui una sola contava (D6).
// Adesso: una riga sola, sempre in vista, un solo strumento attivo e ben evidenziato; Esc torna a Seleziona.
import { h, svuota } from '../dom.js';
import { STRUMENTI } from '../../mappa/editor.js';

/**
 * La barra: un pulsante per strumento, più la casella «Aggancia alla griglia» (che conta per Muro e Seleziona).
 * @param o { attivo, aggancia, onStrumento(id), onAggancia(acceso) }
 * @returns { el, aggiorna({ strumento, aggancia }) }
 */
export function barraStrumenti({ attivo = 'seleziona', aggancia = true, onStrumento, onAggancia } = {}) {
  const bottoni = new Map();
  for (const s of STRUMENTI) {
    bottoni.set(s.id, h('button', {
      type: 'button', class: 'btn mappa-strumento', 'aria-pressed': String(s.id === attivo),
      title: `${s.nome} (${s.tasto}) — ${s.titolo}`, 'aria-label': s.nome,
      onclick: () => onStrumento?.(s.id),
    }, h('span', { class: 'mappa-strumento-icona', 'aria-hidden': 'true' }, s.icona), h('span', { class: 'mappa-strumento-nome' }, s.nome)));
  }
  const casella = h('input', { type: 'checkbox', checked: aggancia, onchange: (e) => onAggancia?.(e.target.checked) });
  const elAggancia = h('label', {
    class: 'mappa-aggancia',
    title: 'I vertici dei muri si mettono sugli incroci della griglia e sui punti medi delle sue linee, a qualunque spessore. Spenta, il muro è libero.',
  }, casella, 'Aggancia alla griglia');

  const el = h('div', { class: 'mappa-strumenti', role: 'toolbar', 'aria-label': 'Strumenti della mappa' },
    h('span', { class: 'mappa-strumenti-gruppo' }, [...bottoni.values()]), elAggancia);

  return {
    el,
    aggiorna({ strumento, aggancia: ag } = {}) {
      for (const [id, b] of bottoni) {
        const scelto = id === strumento;
        b.setAttribute('aria-pressed', String(scelto));
        b.classList.toggle('scelto', scelto);
      }
      if (ag !== undefined) casella.checked = !!ag;
      // l'aggancio conta solo dove si disegnano o si spostano i vertici
      const serve = strumento === 'muro' || strumento === 'seleziona';
      elAggancia.classList.toggle('spenta', !serve);
      casella.disabled = !serve;
    },
  };
}

/**
 * Il pannello «Selezione»: che cosa è selezionato, le sue proprietà e «Elimina».
 * @param o { onElimina(), onProprieta(chiave, valore), onDeseleziona() }
 * @returns { el, aggiorna(riassunto) } con il riassunto di src/mappa/editor.js → riassuntoSelezione
 */
export function pannelloSelezione({ onElimina, onProprieta, onDeseleziona } = {}) {
  const corpo = h('div', { class: 'mappa-selezione-corpo' });
  const el = h('div', { class: 'mappa-selezione', role: 'group', 'aria-label': 'Selezione' }, corpo);
  return {
    el,
    aggiorna(r) {
      if (!r || !r.quanti) {
        svuota(corpo, h('p', { class: 'nota' }, 'Niente selezionato. Con Seleziona: clic su un oggetto per prenderlo, Maiusc per più d’uno, trascina per spostarlo, Canc per cancellarlo.'));
        el.hidden = false;
        return;
      }
      const righe = [h('p', { class: 'mappa-selezione-titolo' }, r.testo)];
      for (const p of r.proprieta ?? []) {
        if (p.tipo === 'casella') {
          righe.push(h('label', { class: 'mappa-selezione-prop' },
            h('input', { type: 'checkbox', checked: !!p.valore, onchange: (e) => onProprieta?.(p.chiave, e.target.checked) }), p.etichetta));
        } else if (p.tipo === 'scelta') {
          righe.push(h('div', { class: 'mappa-selezione-prop' }, h('span', { class: 'mappa-selezione-etichetta' }, p.etichetta),
            h('div', { class: 'mappa-azioni-token', role: 'group', 'aria-label': p.etichetta }, (p.valori ?? []).map((v) => h('button', {
              type: 'button', class: `btn btn-piccolo${v.valore === p.valore ? ' scelto' : ''}`, 'aria-pressed': String(v.valore === p.valore),
              onclick: () => onProprieta?.(p.chiave, v.valore),
            }, v.nome)))));
        } else {
          righe.push(h('p', { class: 'nota' }, `${p.etichetta}: ${p.valore}`));
        }
      }
      righe.push(h('div', { class: 'mappa-azioni-token' },
        h('button', { type: 'button', class: 'btn btn-piccolo pericolo', onclick: () => onElimina?.() }, 'Elimina (Canc)'),
        h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => onDeseleziona?.() }, 'Deseleziona (Esc)')));
      svuota(corpo, ...righe);
      el.hidden = false;
    },
  };
}
