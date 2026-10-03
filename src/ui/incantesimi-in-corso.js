// «Incantesimi in corso» della tab Poteri (richiesta di Marcello del 03/10/2026; src/durate-incantesimi.js): gli
// incantesimi lanciati con «Lancia!» che hanno una durata, con i Round che restano o il testo della durata, i bersagli e
// «Termina» (dissolto, Concentrazione interrotta); il contatore dei Round della scheda, oppure quello dello scontro
// (src/round-scontro.js), come per le Tecniche Interiori; gli incantesimi lanciati dai nemici sul personaggio.
import { h } from './dom.js';
import { incantesimiInCorso, testoBersagli } from '../durate-incantesimi.js';
import { roundRimasti } from '../round-scontro.js';

export function riquadroIncantesimiInCorso(ctx) {
  const s = ctx.sessione;
  const r = Number.isInteger(s.round) ? s.round : 1;
  const attivi = incantesimiInCorso(s);
  const subiti = ctx.roundScontro?.effetti ?? [];
  const scontro = ctx.roundScontro;
  return h('div', { class: 'contatore-tavolo incantesimi-in-corso' },
    h('h3', {}, 'Incantesimi in corso'),
    h('p', { class: 'nota' }, 'Round ', h('strong', {}, String(r)), scontro ? h('span', { class: 'round-scontro' }, ' · dallo scontro') : null, ' ',
      h('button', {
        type: 'button', class: 'btn btn-piccolo', onclick: ctx.azioni.nuovoRound, disabled: !!scontro,
        title: scontro ? `Sei nello scontro «${scontro.nome}»: il Round lo fa avanzare il master dalla plancia.` : 'Passa al Round successivo: scadono le durate finite',
      }, 'Nuovo Round')),
    attivi.length ? h('ul', {}, attivi.map((x) => h('li', {},
      h('strong', {}, x.nome), x.livello ? ` (livello ${x.livello}${x.modalita ? `, ${x.modalita}` : ''})` : '',
      x.al === null || x.al === undefined
        ? h('span', {}, ` · ${x.testo}`, x.quando ? h('small', { class: 'nota' }, ` · dal ${x.quando}`) : null, h('small', { class: 'nota' }, ' · promemoria'))
        : h('span', { title: `dal Round ${x.dal}, fino alla fine del Round ${x.al}` }, ` · ${roundRimasti(x.al, r)} Round`),
      x.concentrazione ? h('small', { class: 'nota' }, ' · Concentrazione') : null,
      x.bersagli?.length ? h('small', { class: 'nota' }, ` · ${testoBersagli(x.bersagli)}`) : null,
      x.ar ? h('small', { class: 'nota' }, ` · AR +${x.ar.totale}${x.ar.magica ? ' magica' : ''} nella scheda`) : null,
      ' ', h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Incantesimo dissolto o Concentrazione interrotta (Magia: 1 AP per interromperlo, salvo la scheda)', onclick: () => ctx.azioni.terminaIncantesimo(x.uid) }, 'Termina'))))
      : h('p', { class: 'nota' }, 'Nessuno. «Lancia!» registra qui gli incantesimi con una durata.'),
    subiti.length ? [h('h4', {}, 'Su di te, dai nemici'), h('ul', {}, subiti.map((e) => h('li', {}, h('strong', {}, e.nome), ` da ${e.da}`, e.rimasti === null ? ` · ${e.testo}` : ` · ${e.rimasti} Round`)))] : null);
}
