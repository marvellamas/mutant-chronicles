// Piccole finestre dentro la pagina, nello stile dell'app, al posto di prompt() e confirm() del browser (richiesta di
// Marcello del 06/10/2026: vanno meglio sui tablet e si possono provare). Ognuna restituisce una Promise:
//   chiediTesto({ titolo, etichetta, valore, conferma })  → il testo scritto (spazi tolti) oppure null se annullata
//   chiedi({ titolo, testo, si, no, pericolo })            → true / false
//   scegliColore({ titolo, colori: [{ id, nome, valore }], attuale, nota }) → l'id scelto oppure null
// Esc e «Annulla» chiudono senza scelta; Invio conferma il testo.
import { h } from './dom.js';

/** Apre la finestrella e la chiude con il valore di `fine(valore)`. */
function apri(classe, titolo, corpo) {
  return new Promise((risolvi) => {
    let fatto = false;
    const d = h('dialog', { class: `finestrella ${classe}`, 'aria-label': titolo });
    const fine = (v) => { if (fatto) return; fatto = true; risolvi(v); d.close(); };
    d.addEventListener('close', () => { if (!fatto) { fatto = true; risolvi(null); } d.remove(); });
    d.append(h('h2', { class: 'finestrella-titolo' }, titolo), ...[corpo(fine)].flat());
    document.body.append(d);
    d.showModal();
    d.querySelector('input, [autofocus], .btn.primario')?.focus();
  });
}

export function chiediTesto({ titolo, etichetta = '', valore = '', conferma = 'OK', massimo = 120 }) {
  return apri('chiedi-testo', titolo, (fine) => {
    const campo = h('input', { type: 'text', value: valore, maxlength: massimo, 'aria-label': etichetta || titolo });
    const ok = () => { const v = campo.value.trim(); if (v) fine(v); else campo.focus(); };
    campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ok(); } });
    queueMicrotask(() => campo.select());
    return [
      h('label', { class: 'finestrella-campo' }, etichetta ? h('span', {}, etichetta) : null, campo),
      h('div', { class: 'riga-azioni finestrella-azioni' },
        h('button', { type: 'button', class: 'btn', onclick: () => fine(null) }, 'Annulla'),
        h('button', { type: 'button', class: 'btn primario', onclick: ok }, conferma)),
    ];
  });
}

export function chiedi({ titolo, testo = '', si = 'Sì', no = 'Annulla', pericolo = false }) {
  return apri('chiedi', titolo, (fine) => [
    testo ? h('p', {}, testo) : null,
    h('div', { class: 'riga-azioni finestrella-azioni' },
      h('button', { type: 'button', class: 'btn', onclick: () => fine(false) }, no),
      h('button', { type: 'button', class: `btn primario${pericolo ? ' pericolo' : ''}`, onclick: () => fine(true) }, si)),
  ]).then((v) => v === true);
}

export function scegliColore({ titolo, colori, attuale = null, nota = '' }) {
  return apri('scegli-colore', titolo, (fine) => [
    nota ? h('p', { class: 'nota' }, nota) : null,
    h('div', { class: 'campioni', role: 'group', 'aria-label': 'Colori' }, colori.map((c) => h('button', {
      type: 'button', class: `campione${c.id === attuale ? ' scelto' : ''}`, 'aria-pressed': String(c.id === attuale),
      title: c.nome, onclick: () => fine(c.id),
    }, h('span', { class: 'campione-colore', style: `background: ${c.valore}`, 'aria-hidden': 'true' }), c.nome))),
    h('div', { class: 'riga-azioni finestrella-azioni' }, h('button', { type: 'button', class: 'btn', onclick: () => fine(null) }, 'Annulla')),
  ]);
}
