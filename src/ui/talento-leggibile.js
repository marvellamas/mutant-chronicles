// Il nome di un Talento che si tocca e apre la sua scheda intera, sotto, sul posto (25/10/2026 notte, richiesta di
// Marcello per il riquadro «Da scegliere»). Si richiude toccando di nuovo il nome. Non è una finestra: la lista resta
// dov'è e non si perde il punto. Il segno ▸ / ▾ e la sottolineatura dicono che il nome si può toccare.
// Lo usano il riquadro «Da scegliere» (src/ui/talenti-scelta.js) e l'elenco dei Talenti della scheda (src/ui/tab.js).
import { h } from './dom.js';

/**
 * Il nome e la scheda che apre: { nome, scheda }. Il chiamante mette `nome` dove va il nome e `scheda` sotto l'opzione.
 * @param testo il nome da mostrare @param scheda { intestazione, paragrafi } (src/talenti-testi.js → schedaTalento)
 * @param dopo testo facoltativo accanto al nome, dentro il pulsante (per esempio « · Maestria»)
 */
export function nomeCheSiApre(testo, scheda, { dopo = null, etichetta = null } = {}) {
  const corpo = h('div', { class: 'scheda-talento' },
    scheda?.intestazione ? h('p', { class: 'intestazione-talento' }, h('em', {}, scheda.intestazione)) : null,
    ...(scheda?.paragrafi ?? []).map((p) => h('p', {}, p)));
  corpo.hidden = true;
  const segno = h('span', { class: 'segno-apri', 'aria-hidden': 'true' }, '▸ ');
  const bottone = h('button', {
    type: 'button', class: 'nome-talento', 'aria-expanded': 'false',
    'aria-label': `${etichetta ?? testo}: tocca per leggere il testo completo`,
    onclick: () => {
      const apri = corpo.hidden;
      corpo.hidden = !apri;
      bottone.setAttribute('aria-expanded', String(apri));
      segno.textContent = apri ? '▾ ' : '▸ ';
    },
  }, segno, h('strong', {}, testo), dopo);
  return { nome: bottone, scheda: corpo };
}
