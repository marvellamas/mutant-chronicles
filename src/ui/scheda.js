// Passo 9: scheda finale, stampabile. Tutti i valori vengono da calcolaScheda(scelte, dati).
import { h, segno } from './dom.js';
import { checklist } from '../checklist.js';
import { statoIncantesimi } from '../incantesimi.js';

const trova = (lista, nome) => lista.find((x) => x.nome === nome);
const GRADI = { 1: 'I', 3: 'III', 5: 'V' };

export function renderScheda(ctx) {
  const { dati, scelte, scheda: s } = ctx;
  if (!s.caratteristiche) {
    return [h('p', { class: 'nota errore' }, 'La scheda non si può calcolare: correggi le scelte segnalate.'), elencoErrori(s.errori)];
  }
  const inc = statoIncantesimi(scelte, dati);
  const catalogo = dati.incantesimi.incantesimi;
  const incantesimi = scelte.incantesimi.map((n) => trova(catalogo, n)).filter(Boolean);
  const voci = checklist(scelte, dati);

  return [
    h('div', { class: 'riga-azioni no-stampa' },
      h('button', { type: 'button', class: 'btn primario', onclick: () => window.print() }, 'Stampa'),
      h('button', { type: 'button', class: 'btn', onclick: ctx.esporta }, 'Esporta JSON')),
    s.errori.length ? h('section', { class: 'riquadro attenzione no-stampa' },
      h('h3', {}, 'Scheda non ancora completa'), elencoErrori(s.errori)) : null,

    h('section', { class: 'controllo no-stampa' },
      h('h3', {}, 'Controllo finale (§2.17)'),
      h('ul', { class: 'checklist' }, voci.map((v) => h('li', { class: v.nonApplicabile ? 'na' : v.ok ? 'ok' : 'ko' },
        h('span', { class: 'spunta', 'aria-hidden': 'true' }, v.nonApplicabile ? '–' : v.ok ? '✓' : '✗'),
        h('span', { class: 'sr' }, v.nonApplicabile ? 'Non applicabile: ' : v.ok ? 'Fatto: ' : 'Da completare: '),
        v.testo)))),

    h('article', { class: 'scheda' },
      h('header', { class: 'scheda-testa' },
        h('h2', {}, scelte.nome.trim() || 'Personaggio senza nome'),
        h('p', {}, `${s.corporazione} · ${s.addestramento} · ${s.classe} (I Grado) · ${s.livello}° livello`),
        scelte.concetto.trim() ? h('p', { class: 'concetto' }, scelte.concetto) : null),

      h('div', { class: 'scheda-griglia' },
        h('section', {},
          h('h3', {}, 'Caratteristiche'),
          h('table', { class: 'tabella compatta' },
            h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Valore'), h('th', {}, 'Mod'), h('th', {}, 'Mod Salv.'))),
            h('tbody', {}, Object.entries(s.caratteristiche).map(([sigla, c]) => h('tr', {},
              h('th', { scope: 'row' }, `${c.nome} (${sigla})`), h('td', { class: 'forte' }, String(c.valore)),
              h('td', {}, segno(c.mod)), h('td', {}, segno(c.modSalvezza))))))),
        h('section', {},
          h('h3', {}, 'Valori derivati'),
          h('dl', { class: 'voci griglia-voci' },
            voce('Punti Vita', s.pv),
            voce('Punti Magia', s.pm ?? 'da tirare'),
            voce('Iniziativa', `${segno(s.iniziativa)} (+1d10)`),
            voce('Movimento', `Passo ${s.movimento.passo} ${s.movimento.unita} · Corsa ${s.movimento.corsa} ${s.movimento.unita} · Scatto ${s.movimento.scatto} ${s.movimento.unita}`),
            voce('Azioni', `${s.azioni.movimento} di Movimento, ${s.azioni.principali} Principale`),
            voce('Punti Eroe', Number.isInteger(scelte.puntiEroe) ? `${scelte.puntiEroe} (max ${dati.regole.punti_eroe.riserva_massima})` : 'da determinare'),
            voce('Distintivi', '')),
          h('h3', {}, 'Prove Salvezza'),
          h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta' },
            h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Base'), h('th', {}, 'Mod'), h('th', {}, 'Addestr.'), h('th', {}, 'Corp.'), h('th', {}, 'Avanz.'), h('th', {}, 'Totale'))),
            h('tbody', {}, Object.values(s.salvezze).map((v) => h('tr', {},
              h('th', { scope: 'row' }, `${v.nome} (${v.caratteristica})`), h('td', {}, String(v.base8)), h('td', {}, segno(v.modSpecifico)),
              h('td', {}, String(v.addestramento)), h('td', {}, String(v.corporazione)), h('td', {}, String(v.avanzamento)),
              h('td', { class: 'forte' }, String(v.totale))))))))),

      h('section', {},
        h('h3', {}, 'Abilità'),
        h('table', { class: 'tabella compatta abilita-scheda' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Abilità'), h('th', {}, 'Mod'), h('th', {}, 'Base'), h('th', {}, 'Corp'), h('th', {}, 'Avanz'), h('th', {}, 'VA'))),
          dati.abilita.categorie.map((cat) => h('tbody', {},
            h('tr', { class: 'categoria' }, h('th', { colspan: 6 }, cat)),
            s.abilita.filter((a) => a.categoria === cat).map((a) => h('tr', { class: a.daClasse ? 'di-classe' : null },
              h('th', { scope: 'row' }, a.nome, h('span', { class: 'sigla' }, ` ${a.caratteristica}`), a.daClasse ? ' •' : null),
              h('td', {}, segno(a.mod)), h('td', {}, String(a.base)), h('td', {}, String(a.corporazione)),
              h('td', {}, String(a.avanzamento)), h('td', { class: 'forte' }, String(a.totale)))))),
          h('tfoot', {}, h('tr', {}, h('td', { colspan: 6 }, '• Abilità di Classe. VA = Mod + Base + Corp + Avanz.'))))),

      h('section', {},
        h('h3', {}, 'Vantaggio dell’Addestramento'),
        h('p', {}, h('strong', {}, `${s.vantaggio.nome}. `), s.vantaggio.testo)),

      h('section', {},
        h('h3', {}, 'Talenti'),
        s.talenti.map((t) => h('div', { class: 'talento' },
          h('h4', {}, `${GRADI[t.grado] ?? t.grado} Grado — ${t.nome}`),
          t.testo.split('\n').map((p) => h('p', {}, p))))),

      inc ? h('section', {},
        h('h3', {}, `Incantesimi conosciuti (${inc.scelti} / ${inc.totale})`),
        incantesimi.length ? h('table', { class: 'tabella compatta' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Incantesimo'), h('th', {}, 'Famiglia'), h('th', {}, 'Liv. base'), h('th', {}, 'Scheda'))),
          h('tbody', {}, incantesimi.map((i) => h('tr', {},
            h('th', { scope: 'row' }, i.nome), h('td', {}, `${i.macrofamiglia} / ${i.specializzazione}`),
            h('td', {}, String(i.livello_base)), h('td', {}, `${i.scheda} (p. ${i.pagina})`)))))
          : h('p', {}, 'Nessuno scelto.'),
        h('p', { class: 'nota' }, `Livello massimo di lancio: ${inc.livelloMassimo}. Testo completo nel Manuale della Magia alle schede indicate.`)) : null,

      h('section', {},
        h('h3', {}, 'Equipaggiamento'),
        h('p', { class: 'testo-libero' }, scelte.equipaggiamento.trim() || '—')),

      h('footer', { class: 'scheda-piede' }, `Dati: ${ctx.versioni}.`)),
  ];
}

function voce(etichetta, valore) {
  return h('div', {}, h('dt', {}, etichetta), h('dd', {}, String(valore)));
}

function elencoErrori(errori) {
  return h('ul', {}, errori.map((e) => h('li', {}, e.problema)));
}
