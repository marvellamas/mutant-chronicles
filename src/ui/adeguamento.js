// Adeguamento straordinario delle Abilità, lato giocatore (lotto 194, 13/11/2026): il pannello che il giocatore usa
// dal suo tablet per ridistribuire i Punti Abilità Liberi dopo il passaggio al profilo 4/7/9/4 (§8.3.1).
//
// Com'è al tavolo, e perché è fatto così. Sette giocatori, un tablet ciascuno, una serata. Quello che ha funzionato
// il 26/10 è stato **una scelta alla volta**, con il testo intero leggibile toccando il nome: qui è lo stesso.
//   - per ogni Abilità si legge **com'era e come diventa**, sulla stessa riga: «P VA 11 → S VA 13»;
//   - in testa, sempre, **quanti punti restano** dei suoi;
//   - «−» e «+» cambiano una cosa alla volta e si torna indietro senza ricominciare da capo: la bozza è il numero
//     che si vede, non un'aggiunta a qualcosa di nascosto;
//   - a punti finiti la scheda **lo dice** e accende «Conferma»: non lo lascia indovinare;
//   - quello che non si può fare ha il motivo scritto accanto, non è solo spento.
//
// La nota di prima è un riquadro a sé, aperto, perché è la cosa che al tavolo serve ritrovare per prima.
import { h } from './dom.js';
import { info } from './tooltip.js';
import { dettagliRicordati } from './apribili.js';
import { statoAssegnazione, notaPerScheda, testoAbilitaDiPrima } from '../adeguamento-abilita.js';

/** Una riga: com'era → come diventa, con «−» e «+». */
function riga(ctx, a, s) {
  const cambia = a.cambiaCategoria;
  const prima = a.prima ? `${a.prima.competenza} VA ${a.prima.va}` : '—';
  return h('tr', { class: `riga-adeguamento${a.punti ? ' con-punti' : ''}` },
    h('th', { scope: 'row' }, info('abilita', a.nome),
      h('span', { class: 'sigla' }, ` ${a.caratteristica}`),
      cambia ? h('span', { class: 'etichetta', title: `Con il profilo nuovo passa da ${a.prima.competenza} a ${a.competenza}: la base cambia da ${a.prima.base} a ${a.base}` }, `${a.prima.competenza}→${a.competenza}`) : null),
    h('td', { class: 'dettaglio' }, prima),
    h('td', { class: 'va-adeguamento' }, h('strong', {}, String(a.dopo.va)),
      h('small', { class: 'nota' }, ` / ${a.limite ?? '—'}`)),
    h('td', { class: 'punti-adeguamento' },
      h('button', { type: 'button', class: 'btn btn-piccolo', disabled: !a.punti, title: 'Togli un punto da questa Abilità', onclick: () => ctx.azioni.adeguamento.punto(a.nome, -1) }, '−'),
      h('span', { class: 'numero-punti' }, String(a.punti)),
      h('button', { type: 'button', class: 'btn btn-piccolo', disabled: !!a.motivoPiu, title: a.motivoPiu ?? `Assegna un punto: il massimo su questa Abilità è ${a.massimo}`, onclick: () => ctx.azioni.adeguamento.punto(a.nome, 1) }, '+')),
    h('td', { class: 'dettaglio nota' }, a.motivoPiu && !a.punti ? a.motivoPiu : ''));
}

/**
 * Il pannello dell'adeguamento, in testa alla tab Abilità. null se questo personaggio non ne ha uno aperto:
 * durante la serata i sette non saranno migrati tutti insieme, e chi non è stato toccato non deve vedere niente.
 */
export function riquadroAdeguamento(ctx) {
  const file = ctx.fileAdeguamento?.() ?? null;
  if (!file) return null;
  const s = statoAssegnazione(file, ctx.bozzaAdeguamento ?? null, ctx.dati);
  if (!s) return null;
  const cambiate = s.abilita.filter((a) => a.cambiaCategoria).length;
  return h('section', { class: `riquadro riquadro-adeguamento${s.finito ? ' adeguamento-finito' : ''}`, 'aria-label': 'Adeguamento delle Abilità' },
    h('header', { class: 'testa-gradi' },
      h('h3', {}, 'Adeguamento delle Abilità'),
      h('span', { class: 'contatore-adeguamento' }, s.finito ? 'fatto' : `${s.rimasti} punti`)),
    h('p', { class: 'nota' }, s.finito
      ? `Hai assegnato tutti i ${s.monte} punti. Controlla i numeri e tocca «Conferma»: da lì in poi la scheda è quella nuova.`
      : `Le tue Abilità passano al profilo nuovo del manuale: ${cambiate} cambiano categoria. I punti liberi si riassegnano da capo: ne hai ${s.monte} in tutto, te ne restano ${s.rimasti}.`),
    h('table', { class: 'tabella compatta tabella-adeguamento' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Abilità'), h('th', {}, 'Prima'), h('th', {}, 'Adesso / limite'), h('th', {}, 'Punti'), h('th', {}, ''))),
      h('tbody', {}, s.abilita.map((a) => riga(ctx, a, s)))),
    h('p', { class: 'azioni-adeguamento' },
      h('button', { type: 'button', class: 'btn btn-piccolo', disabled: !s.assegnati, title: 'Toglie tutti i punti assegnati e ricomincia', onclick: () => ctx.azioni.adeguamento.azzera() }, 'Ricomincia'),
      h('button', { type: 'button', class: 'btn primario btn-piccolo', disabled: !s.finito, title: s.finito ? 'Chiude l’adeguamento: i punti entrano nella scheda' : `Restano ${s.rimasti} punti da assegnare`, onclick: () => ctx.azioni.adeguamento.conferma() }, 'Conferma')),
    riquadroNotaDiPrima(ctx));
}

/**
 * Le Abilità di prima dell'adeguamento, in sola lettura: tutte e 24, con i punti evento per evento. Viene dalla riga
 * del registro del master (src/adeguamento-abilita.js) e **si legge dal tablet**: è il giocatore che ha bisogno di
 * ritrovare i suoi numeri. Resta anche dopo la conferma.
 */
export function riquadroNotaDiPrima(ctx) {
  const nota = notaPerScheda(ctx.scelte?.correzioniMaster);
  if (!nota) return null;
  const data = nota.quando ? new Date(nota.quando).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  return dettagliRicordati('nota-abilita-prima', { class: 'sezione-tab abilita-di-prima' },
    h('summary', {}, `Le tue Abilità prima dell’adeguamento${data ? ` (${data})` : ''}`),
    nota.abilita
      ? [h('ul', { class: 'elenco-abilita-prima' }, nota.abilita.map((a) => h('li', {}, h('small', {}, testoAbilitaDiPrima(a))))),
        nota.eventi.length ? h('p', { class: 'nota' }, `Punti liberi che avevi: ${nota.eventi.map((e) => `${e.evento} — ${Object.entries(e.punti).map(([x, n]) => `${x} +${n}`).join(', ') || 'nessuno'}`).join('; ')}.`) : null]
      : h('p', {}, nota.testo),
    h('p', { class: 'nota' }, `Profilo di prima: ${nota.profilo ?? '—'}, livello ${nota.livello ?? '—'}. Questa nota resta nella scheda: se qualcosa non torna, il Direttore può riportare tutto com’era.`));
}
