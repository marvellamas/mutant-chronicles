// «Cerca nella scheda» (13/10/2026, richiesta di Marcello): l'icona 🔍 della testata apre un campo; si scrive una
// parola («tempra») e sotto compare tutto ciò che la contiene, con il valore accanto. Un tocco porta alla tab e al
// riquadro giusto, evidenziato per un attimo; se il valore si tira, si tira da lì (prompt 78).
// L'indice e la ricerca stanno in src/cerca-scheda.js (funzioni pure): qui solo la presentazione.
import { h } from './dom.js';
import { vociScheda, cercaVoci } from '../cerca-scheda.js';
import { apriTiro } from './tira-valore.js';

/** Evidenzia per un attimo, nella tab aperta, il primo riquadro che contiene `testo`. */
export function evidenziaNellaScheda(testo, { radice = document, durata = 1600 } = {}) {
  const q = String(testo ?? '').trim().toLowerCase();
  if (!q) return null;
  const pannello = radice.querySelector?.('.tab-pannello') ?? radice;
  const candidati = pannello?.querySelectorAll?.('section, .contatore-tavolo, li, tr, article, .riquadro') ?? [];
  let trovato = null;
  for (const n of candidati) {
    if (!n.textContent?.toLowerCase().includes(q)) continue;
    // il più interno che contiene la parola: si evita di evidenziare mezza pagina
    if (!trovato || trovato.contains?.(n)) trovato = n;
  }
  if (!trovato) return null;
  trovato.classList?.add('evidenziato');
  trovato.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  setTimeout(() => trovato.classList?.remove('evidenziato'), durata);
  return trovato;
}

/**
 * L'icona 🔍 e il campo nella testata della scheda.
 * @param ctx contesto della scheda a tab; `ctx.ui.cerca` tiene aperto il campo e il testo scritto
 */
export function cercaNellaScheda(ctx) {
  const st = (ctx.ui.cerca ??= { aperta: false, testo: '' });
  const chiudi = () => { st.aperta = false; st.testo = ''; ctx.azioni.ridisegna(); };
  const icona = h('button', {
    type: 'button', class: `btn icona btn-cerca${st.aperta ? ' attiva' : ''}`, 'aria-expanded': String(st.aperta),
    title: 'Cerca nella scheda: Abilità, Prove Salvezza, Talenti, oggetti, incantesimi, Stati…', 'aria-label': 'Cerca nella scheda',
    onclick: () => { st.aperta = !st.aperta; if (!st.aperta) st.testo = ''; ctx.azioni.ridisegna(); },
  }, '🔍');
  if (!st.aperta) return icona;

  const voci = vociScheda(ctx.tab.scheda, ctx.sessione, ctx.dati);
  const risultati = cercaVoci(voci, st.testo);
  const vai = (v) => {
    chiudi();
    if (ctx.attiva !== v.tab) ctx.azioni.vaiTab(v.tab); else ctx.azioni.ridisegna();
    setTimeout(() => evidenziaNellaScheda(v.cerca), 0);
  };
  const campo = h('input', {
    type: 'search', class: 'campo-cerca', value: st.testo, placeholder: 'Cerca nella scheda…', 'aria-label': 'Cerca nella scheda', autofocus: true,
    oninput: (e) => { st.testo = e.target.value; ctx.azioni.ridisegna(); },
    onkeydown: (e) => { if (e.key === 'Escape') { e.preventDefault(); chiudi(); } },
  });
  const riga = (v) => h('li', {},
    h('button', { type: 'button', class: 'risultato-cerca', title: v.testo ?? null, onclick: () => vai(v) },
      h('small', { class: 'sigla' }, `${v.gruppo} `), h('strong', {}, v.nome),
      v.valore ? h('span', { class: 'valore-cerca' }, ` — ${v.valore}`) : null),
    // prompt 78: se è un valore tirabile, si tira da qui
    v.tiro && Number.isFinite(v.tiro.va) ? h('button', {
      type: 'button', class: 'btn btn-piccolo btn-tira-cerca', title: `Tira ${v.nome}`,
      onclick: () => { const t = v.tiro; chiudi(); apriTiro(ctx, t); },
    }, '🎲') : null);
  return h('div', { class: 'cerca-scheda' },
    h('div', { class: 'riga-cerca' }, icona, campo,
      h('button', { type: 'button', class: 'btn icona', title: 'Chiudi la ricerca', 'aria-label': 'Chiudi la ricerca', onclick: chiudi }, '✕')),
    st.testo.trim().length < 2
      ? h('p', { class: 'nota esito-cerca' }, 'Scrivi almeno due lettere: cerco in Abilità, Prove Salvezza, Talenti, Specializzazioni, Tecniche, incantesimi, oggetti, Stati e note.')
      : risultati.length
        ? h('ul', { class: 'esiti-cerca' }, risultati.map(riga))
        : h('p', { class: 'nota esito-cerca' }, `Niente nella scheda per «${st.testo.trim()}».`));
}
