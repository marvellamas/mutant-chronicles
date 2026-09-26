// Tooltip unico per Abilità, Caratteristiche e Incantesimi, più il pannello modale con la
// scheda completa di un incantesimo. Il contenuto viene da src/descrizioni.js (funzioni pure).
//
// Comportamento:
//  - mouse: compare dopo RITARDO ms sul nome, resta aperto se il puntatore entra nel riquadro;
//  - tastiera: compare al focus, sparisce al blur o con Esc;
//  - tocco: un tocco sul nome lo apre, un tocco fuori lo chiude (i pulsanti vicini restano liberi);
//  - clic (mouse o tastiera) sul nome di un incantesimo: apre la scheda completa.
import { h, svuota } from './dom.js';
import { contenutoTooltip, schedaIncantesimo } from '../descrizioni.js';
import { classeMacrofamiglia } from '../palette.js';
import { gruppiPallini, testoLivelloBase } from '../incantesimi.js';

const RITARDO = 300;
const RITARDO_CHIUSURA = 150;
const MARGINE = 8;

let dati = null;
let riquadro = null;
let pannello = null;
let origine = null; // elemento che ha aperto il tooltip
let timerApri = null;
let timerChiudi = null;
let ultimoPuntatore = 'mouse';

/** Nome con tooltip. testo: ciò che si vede (default: id). */
export function info(tipo, id, testo = id) {
  return h('button', { type: 'button', class: 'voce-info', dataset: { infoTipo: tipo, infoId: id } }, testo);
}

// Contenuti liberi dei valori con scomposizione (tipo «valore»), legati all'elemento
const contenutiValore = new WeakMap();

/**
 * Valore con tooltip di contenuto libero { titolo, sottotitolo, sezioni: [{testo}], tabella }:
 * la scomposizione dei valori effettivi della scheda. Stesso comportamento dei nomi (tocco, tastiera).
 */
export function infoValore(figli, contenuto, { classe = '' } = {}) {
  const el = h('button', { type: 'button', class: `voce-info valore-info ${classe}`.trim(), dataset: { infoTipo: 'valore' } }, figli);
  contenutiValore.set(el, contenuto);
  return el;
}

/**
 * Etichetta con il nome della macrofamiglia di un incantesimo (docs/palette.md): accompagna il
 * colore, per chi non distingue i colori.
 */
export function etichettaMacro(macrofamiglia) {
  return macrofamiglia ? h('span', { class: 'etichetta-macro' }, macrofamiglia) : null;
}

/**
 * Pallini del livello base di un incantesimo (dai dati: livello_base), a gruppi di tre, nel colore
 * della macrofamiglia; «Livello base N: costa almeno N PM» (Magia sez. 1). Stanno su una riga e,
 * se accanto al nome non c'è posto, vanno a capo tutti insieme: mai troncati.
 */
export function pallini(livelloBase) {
  const gruppi = gruppiPallini(livelloBase);
  if (!gruppi.length) return null;
  const t = testoLivelloBase(livelloBase);
  return h('span', { class: 'pallini-livello', title: t, role: 'img', 'aria-label': t },
    gruppi.map((n) => h('span', { class: 'gruppo-pallini' }, Array.from({ length: n }, () => h('span', { class: 'pallino' })))));
}

/** Voce del catalogo di un incantesimo, dal nome. */
const incantesimoDi = (nome) => dati?.incantesimi?.incantesimi.find((i) => i.nome === nome) ?? null;
/** Macrofamiglia di un incantesimo del catalogo, dal nome. */
const macroDi = (nome) => incantesimoDi(nome)?.macrofamiglia ?? null;

/** Elenco di nomi con tooltip separati da virgole. */
export function elencoInfo(tipo, nomi) {
  return nomi.flatMap((n, i) => (i ? [', ', info(tipo, n)] : [info(tipo, n)]));
}

/** Da chiamare una volta, dopo il caricamento dei dati. */
export function inizializzaTooltip(datiRegole) {
  dati = datiRegole;
  riquadro = h('div', { id: 'tooltip', class: 'tooltip', role: 'tooltip', hidden: true });
  riquadro.addEventListener('pointerenter', () => clearTimeout(timerChiudi));
  riquadro.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') chiudiTra(); });
  document.body.append(riquadro);

  document.addEventListener('pointerdown', (e) => {
    ultimoPuntatore = e.pointerType || 'mouse';
    // tocco fuori dal nome e dal riquadro: chiude
    if (!riquadro.hidden && !riquadro.contains(e.target) && !e.target.closest?.('.voce-info')) nascondiTooltip();
  }, true);
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest?.('.voce-info');
    if (!el) return;
    clearTimeout(timerChiudi);
    if (el === origine && !riquadro.hidden) return;
    clearTimeout(timerApri);
    timerApri = setTimeout(() => mostra(el), RITARDO);
  });
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest?.('.voce-info');
    if (!el || el.contains(e.relatedTarget)) return;
    clearTimeout(timerApri);
    if (el === origine) chiudiTra();
  });
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest?.('.voce-info');
    if (el && ultimoPuntatore !== 'touch') mostra(el);
  });
  document.addEventListener('focusout', (e) => {
    const el = e.target.closest?.('.voce-info');
    if (el && el === origine && !riquadro.contains(e.relatedTarget)) chiudiTra();
  });
  document.addEventListener('click', (e) => {
    const el = e.target.closest?.('.voce-info');
    if (!el) return;
    e.preventDefault(); // dentro un <label> non deve cambiare la casella
    const tipo = el.dataset.infoTipo;
    if (ultimoPuntatore === 'touch' || ultimoPuntatore === 'pen') {
      if (origine === el && !riquadro.hidden) nascondiTooltip();
      else mostra(el);
    } else if (tipo === 'incantesimo') {
      apriScheda(el.dataset.infoId);
    } else if (riquadro.hidden || origine !== el) {
      mostra(el);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') ultimoPuntatore = 'tastiera';
    if (e.key === 'Escape' && !riquadro.hidden) {
      const el = origine;
      nascondiTooltip();
      el?.focus?.();
    }
  });
  window.addEventListener('resize', () => nascondiTooltip());
  window.addEventListener('scroll', () => { if (!riquadro.hidden && ultimoPuntatore === 'mouse') nascondiTooltip(); }, { passive: true });
}

function chiudiTra() {
  clearTimeout(timerChiudi);
  timerChiudi = setTimeout(nascondiTooltip, RITARDO_CHIUSURA);
}

export function nascondiTooltip() {
  clearTimeout(timerApri);
  clearTimeout(timerChiudi);
  if (!riquadro || riquadro.hidden) return;
  riquadro.hidden = true;
  origine?.removeAttribute('aria-describedby');
  origine?.classList.remove('attiva');
  origine = null;
}

function mostra(el) {
  if (!dati || !el.isConnected) return;
  const c = el.dataset.infoTipo === 'valore' ? contenutiValore.get(el) : contenutoTooltip(el.dataset.infoTipo, el.dataset.infoId, dati);
  if (!c) return;
  clearTimeout(timerChiudi);
  origine?.removeAttribute('aria-describedby');
  origine?.classList.remove('attiva');
  origine = el;
  // incantesimi: tinta e barra laterale della macrofamiglia (css/palette.css)
  const macro = el.dataset.infoTipo === 'incantesimo' ? macroDi(el.dataset.infoId) : null;
  riquadro.className = `tooltip${macro ? ` tooltip-incantesimo ${classeMacrofamiglia(macro)}` : ''}`;
  svuota(riquadro, contenuto(c, el.dataset.infoId, macro, macro ? incantesimoDi(el.dataset.infoId)?.livello_base : null));
  riquadro.hidden = false;
  riquadro.scrollTop = 0;
  el.setAttribute('aria-describedby', 'tooltip');
  el.classList.add('attiva');
  posiziona(el);
}

function contenuto(c, id, macro = null, livelloBase = null) {
  return [
    h('p', { class: 'tooltip-titolo' }, c.titolo, macro ? ' ' : null, pallini(livelloBase), livelloBase ? ' ' : null, etichettaMacro(macro)),
    c.sottotitolo ? h('p', { class: 'tooltip-sottotitolo' }, c.sottotitolo) : null,
    c.sezioni.map((s) => paragrafi(s.testo, s.etichetta)),
    c.tabella ? h('div', { class: 'tooltip-tabella' },
      h('p', { class: 'tooltip-etichetta' }, c.tabella.titolo),
      tabella(c.tabella.colonne, c.tabella.righe)) : null,
    c.apriScheda ? h('button', { type: 'button', class: 'btn tooltip-apri', onclick: () => apriScheda(id) }, 'Apri scheda completa') : null,
  ];
}

function paragrafi(testo, etichetta) {
  return String(testo).split('\n').map((p, i) => h('p', {},
    i === 0 && etichetta ? h('strong', {}, `${etichetta}: `) : null, p));
}

function tabella(colonne, righe, evidenzia) {
  return h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta' },
    h('thead', {}, h('tr', {}, colonne.map((k) => h('th', {}, k)))),
    h('tbody', {}, righe.map((r) => h('tr', { class: evidenzia !== undefined && String(Object.values(r)[0]).trim() === evidenzia ? 'evidenziata' : null },
      colonne.map((k) => h('td', {}, r[k] ?? '')))))));
}

/** Sopra o sotto, a sinistra o a destra, sempre dentro la finestra. */
function posiziona(el) {
  const r = el.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  riquadro.style.maxHeight = '';
  riquadro.style.left = '0px';
  riquadro.style.top = '0px';
  const larghezza = riquadro.offsetWidth;
  const sotto = vh - r.bottom - MARGINE;
  const sopra = r.top - MARGINE;
  const altezza = riquadro.offsetHeight;
  let top;
  if (altezza + 6 <= sotto || sotto >= sopra) {
    top = r.bottom + 6;
    riquadro.style.maxHeight = `${Math.max(120, sotto - 6)}px`;
  } else {
    const disponibile = sopra - 6;
    riquadro.style.maxHeight = `${Math.max(120, disponibile)}px`;
    top = Math.max(MARGINE, r.top - 6 - Math.min(altezza, disponibile));
  }
  // allineato al nome; se sborda a destra si sposta a sinistra
  let left = r.left;
  if (left + larghezza > vw - MARGINE) left = Math.max(MARGINE, Math.min(r.right, vw - MARGINE) - larghezza);
  riquadro.style.left = `${Math.max(MARGINE, left)}px`;
  riquadro.style.top = `${top}px`;
}

// ---------------------------------------------------------------------------
// Pannello modale con la scheda completa

export function apriScheda(nome) {
  const s = schedaIncantesimo(nome, dati);
  if (!s) return;
  nascondiTooltip();
  if (!pannello) {
    pannello = h('dialog', { class: 'pannello-scheda', 'aria-labelledby': 'pannello-titolo' });
    // clic sullo sfondo (fuori dal contenuto): chiude
    pannello.addEventListener('click', (e) => { if (e.target === pannello) pannello.close(); });
    document.body.append(pannello);
  }
  const macro = macroDi(nome);
  pannello.replaceChildren(h('div', { class: `pannello-contenuto ${classeMacrofamiglia(macro)}`.trim() },
    h('header', { class: 'pannello-testa' },
      h('h2', { id: 'pannello-titolo' }, s.titolo, macro ? ' ' : null, pallini(incantesimoDi(nome)?.livello_base), ' ', etichettaMacro(macro)),
      h('button', { type: 'button', class: 'btn tondo chiudi', 'aria-label': 'Chiudi', onclick: () => pannello.close() }, '×')),
    h('p', { class: 'tooltip-sottotitolo' }, s.intestazione),
    paragrafi(s.lancio),
    paragrafi(s.descrizione),
    s.tabellaMancante ? h('p', { class: 'nota' }, 'Tabella delle versioni non disponibile nei dati (TODO): consulta il manuale.') : null,
    s.tabelle.map((t) => h('section', {},
      t.titolo ? h('h3', {}, t.titolo) : null,
      tabella(t.colonne, t.righe, t.evidenzia),
      t.evidenzia ? h('p', { class: 'nota' }, `Evidenziata la riga del livello base (${s.livelloBase}).`) : null)),
    s.regole ? h('section', {}, h('h3', {}, 'Regole'), paragrafi(s.regole)) : null,
    h('p', { class: 'nota' }, s.riferimento)));
  pannello.showModal();
  pannello.querySelector('.chiudi').focus();
}
