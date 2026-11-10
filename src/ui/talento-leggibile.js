// Il nome di un Talento che si tocca e apre la sua scheda intera, sotto, sul posto (25/10/2026 notte, richiesta di
// Marcello per il riquadro «Da scegliere»). Si richiude toccando di nuovo il nome. Non è una finestra: la lista resta
// dov'è e non si perde il punto. Il segno ▸ / ▾ e la sottolineatura dicono che il nome si può toccare.
// Lo usano il riquadro «Da scegliere» (src/ui/talenti-scelta.js) e l'elenco dei Talenti della scheda (src/ui/tab.js).
//
// Lotto 186 (A): l'apertura non sta più in `corpo.hidden` e basta. Con una `chiave` vive in src/ui/apribili.js, fuori
// dal disegno, e sopravvive a un ridisegno: prima bastava che il Direttore avanzasse il Round perché quello che il
// giocatore stava leggendo si richiudesse da sé.
import { h } from './dom.js';
import { eAperto, segnaApribile } from './apribili.js';

/**
 * Il nome e la scheda che apre: { nome, scheda }. Il chiamante mette `nome` dove va il nome e `scheda` sotto l'opzione.
 * @param testo il nome da mostrare @param scheda { intestazione, paragrafi } (src/talenti-testi.js → schedaTalento)
 * @param dopo testo facoltativo accanto al nome, dentro il pulsante (per esempio « · Maestria»)
 * @param chiave stringa stabile fra un disegno e il successivo: senza, si richiude al primo ridisegno
 */
export function nomeCheSiApre(testo, scheda, { dopo = null, etichetta = null, chiave = null } = {}) {
  const corpo = h('div', { class: 'scheda-talento' },
    scheda?.intestazione ? h('p', { class: 'intestazione-talento' }, h('em', {}, scheda.intestazione)) : null,
    ...(scheda?.paragrafi ?? []).map((p) => h('p', {}, p)));
  const aperto = eAperto(chiave);
  corpo.hidden = !aperto;
  const segno = h('span', { class: 'segno-apri', 'aria-hidden': 'true' }, aperto ? '▾ ' : '▸ ');
  const bottone = h('button', {
    type: 'button', class: 'nome-talento', 'aria-expanded': String(aperto),
    'aria-label': `${etichetta ?? testo}: tocca per leggere il testo completo`,
    // un tocco su un <button> dà un solo `click`: niente handler di tocco, altrimenti il primo aprirebbe e il
    // secondo richiuderebbe (tests/apribili-186.test.js lo controlla)
    onclick: () => {
      const apri = corpo.hidden;
      corpo.hidden = !apri;
      bottone.setAttribute('aria-expanded', String(apri));
      segno.textContent = apri ? '▾ ' : '▸ ';
      segnaApribile(chiave, apri);
    },
  }, segno, h('strong', {}, testo), dopo);
  return { nome: bottone, scheda: corpo };
}
