// Completamento dei Punti Abilità Liberi di un evento passato (regole aggiornate: Giocatore, Doc del
// 27/09/2026, 10 punti invece di 5; per-davide A.52). Un evento alla volta, dal più vecchio: la
// creazione o un livello già preso. Stessa tabella di «Sali di livello», con i limiti di Avanzamento
// di quell'evento; nessun dado, nessun'altra scelta. Fino alla conferma i punti restano in una bozza.
// Controlli: statoCompletamento() e validaCompletamento() del motore (src/avanzamento.js).
import { h } from './dom.js';
import { statoCompletamento } from '../avanzamento.js';
import { contatore } from './passi.js';
import { tabellaPuntiAbilita } from './sali.js';
import { conOrdinale } from '../lingua.js';
import { barraPassi } from './navigazione.js';

/**
 * Contesto: { dati, personaggio, bozza, titoloAvviso, aggiornaBozza(punti), conferma(), esci() }
 * Restituisce i nodi della pagina.
 */
export function renderCompleta(ctx) {
  const { dati, personaggio, bozza } = ctx;
  const st = statoCompletamento(personaggio, bozza, dati);
  if (!st) {
    return [h('section', { class: 'passo' }, h('h1', {}, 'Punti Abilità da assegnare'),
      h('p', { class: 'riquadro ok' }, 'Nessun Punto Abilità da assegnare: il personaggio è in regola.'),
      h('button', { type: 'button', class: 'btn', onclick: ctx.esci }, '← Torna alla scheda'))];
  }
  const dell = st.livello === 1 ? 'della creazione' : `${conOrdinale('del', st.livello)} livello`;
  const imposta = (nome, v) => {
    const nuovo = { ...bozza, [nome]: v };
    if (v <= 0) delete nuovo[nome];
    ctx.aggiornaBozza(nuovo);
  };
  const minimo = dati.regole.creazione.va_minimo_per_punti_liberi;
  const bloccanti = st.errori.filter((e) => e.tipo === 'violazione');
  const barra = (posizione) => barraPassi({
    posizione,
    indietro: { etichetta: '← Esci senza salvare', onclick: ctx.esci },
    avanti: { etichetta: `Conferma i punti ${dell}`, corta: 'Conferma', disabilitato: st.errori.length > 0,
      motivo: st.rimasti > 0 ? `${st.rimasti} ${st.rimasti === 1 ? 'punto' : 'punti'} da assegnare` : bloccanti[0]?.problema ?? null, onclick: ctx.conferma },
  });
  return [h('div', { class: 'wizard sali completa' },
    h('section', { class: 'passo', 'aria-labelledby': 'titolo-passo' },
      h('header', { class: 'passo-testa' },
        h('p', { class: 'sopratitolo' }, `${ctx.titoloAvviso} · ${st.livello === 1 ? '§2.13' : '§8.3'}`),
        h('h1', { id: 'titolo-passo' }, `Punti Abilità ${dell}`)),
      barra('cima'),
      h('p', { class: 'guida' }, `Le regole correnti prevedono ${st.previsti} Punti Abilità Liberi ${dell}: ne erano stati assegnati ${st.assegnati}. `
        + `Assegna i ${st.mancanti} mancanti: si aggiungono ${st.livello === 1 ? 'alla creazione' : `${conOrdinale('al', st.livello)} livello`}, con l’Avanzamento massimo di allora (${st.limite}), `
        + `compresi i +1 di Classe già applicati; l’Abilità deve avere VA almeno ${minimo} prima dei punti liberi. I punti di Classe e le altre scelte non cambiano.`),
      contatore(st.rimasti, st.mancanti, 'Punti Abilità'),
      tabellaPuntiAbilita({ dati, abilita: st.abilita, limite: st.limite, rimasti: st.rimasti, imposta }),
      bloccanti.length ? h('div', { class: 'riquadro attenzione' },
        h('ul', {}, bloccanti.map((e) => h('li', { class: 'motivo' }, e.problema)))) : null,
      barra('fondo'))),
  ];
}
