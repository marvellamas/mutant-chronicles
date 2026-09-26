// Riepilogo live: colonna laterale su desktop, barra richiudibile su telefono.
import { h, segno } from './dom.js';
import { info } from './tooltip.js';
import { valoreTiro } from '../tiri.js';
import { conOrdinale } from '../lingua.js';

export function renderRiepilogo(ctx) {
  const { dati, scelte, ante, ui } = ctx;
  const cr = dati.regole.creazione;
  const inc = ante.incantesimi;
  const valore = (v) => (v === null || v === undefined ? '—' : String(v));
  const pmTesto = ante.pm ?? (scelte.classe && ante.caratteristiche ? 'da tirare' : null);

  const breve = [
    `PV ${valore(ante.pv)}`,
    `PM ${valore(pmTesto)}`,
    `Car. ${ante.puntiCaratteristicaRimasti}/${cr.punti_caratteristica}`,
    `Abil. ${ante.puntiAbilitaRimasti}/${cr.punti_abilita_liberi}`,
  ].join(' · ');

  return h('aside', { class: `riepilogo${ui.riepilogoAperto ? ' aperto' : ''}`, 'aria-label': 'Riepilogo del personaggio' },
    h('button', { type: 'button', class: 'riepilogo-barra', 'aria-expanded': String(!!ui.riepilogoAperto),
      onclick: () => { ui.riepilogoAperto = !ui.riepilogoAperto; ctx.ridisegnaRiepilogo(); } },
      h('span', {}, 'Riepilogo'), h('span', { class: 'breve' }, breve), h('span', { class: 'freccia', 'aria-hidden': 'true' }, '▴')),
    h('div', { class: 'riepilogo-corpo' },
      h('h2', {}, scelte.nome.trim() || 'Nuovo personaggio'),
      h('p', { class: 'identita' }, [scelte.corporazione, scelte.addestramento, scelte.classe].map((x) => x ?? '…').join(' · ')),
      ctx.livelli?.length ? h('p', { class: 'nota' }, `Valori della creazione (1° livello). Il personaggio è ${conOrdinale('al', 1 + ctx.livelli.length)} livello: vedi la scheda finale.`) : null,

      h('h3', {}, 'Da spendere'),
      h('ul', { class: 'da-spendere' },
        rimasti('Punti Caratteristica', ante.puntiCaratteristicaRimasti, cr.punti_caratteristica),
        rimasti('Punti Abilità Liberi', ante.puntiAbilitaRimasti, cr.punti_abilita_liberi),
        inc ? rimasti('Incantesimi', inc.totale - inc.scelti, inc.totale) : null,
        Number.isInteger(valoreTiro(scelte.puntiEroe)) ? null : h('li', { class: 'attenzione' }, 'Punti Eroe da determinare')),

      h('h3', {}, 'Caratteristiche'),
      ante.caratteristiche
        ? h('dl', { class: 'valori' }, Object.entries(ante.caratteristiche).map(([s, c]) => h('div', {},
          h('dt', {}, info('caratteristica', s)), h('dd', {}, String(c.valore), h('small', {}, ` ${segno(c.mod)}`)))))
        : h('p', { class: 'vuoto' }, 'Scegli la Corporazione.'),

      h('dl', { class: 'voci in-linea' },
        h('div', {}, h('dt', {}, 'PV'), h('dd', {}, valore(ante.pv))),
        h('div', {}, h('dt', {}, 'PM'), h('dd', {}, valore(pmTesto))),
        h('div', {}, h('dt', {}, 'Iniziativa'), h('dd', {}, ante.iniziativa === null ? '—' : segno(ante.iniziativa)))),

      h('h3', {}, 'Salvezze'),
      ante.salvezze
        ? h('dl', { class: 'voci in-linea' }, Object.values(ante.salvezze).map((v) => h('div', {}, h('dt', {}, v.nome), h('dd', {}, valore(v.totale)))))
        : h('p', { class: 'vuoto' }, 'Servono Corporazione e Addestramento.')));
}

function rimasti(etichetta, n, totale) {
  const classe = n === 0 ? 'ok' : n < 0 ? 'errore' : 'attenzione';
  return h('li', { class: classe }, `${etichetta}: `, h('strong', {}, String(n)), ` / ${totale}`);
}
