// Passo 9: scheda finale (la stampa è la vista dedicata src/ui/stampa.js). Tutti i valori vengono da calcolaScheda(personaggio, dati):
// la creazione più i livelli acquisiti (cap. 8). Il controllo §2.17 riguarda la creazione.
import { h, segno } from './dom.js';
import { checklist } from '../checklist.js';
import { rigaAlLivello } from '../descrizioni.js';
import { info } from './tooltip.js';
import { valoreTiro } from '../tiri.js';

const GRADI_ROMANI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

export function renderScheda(ctx) {
  const { dati, scelte } = ctx;
  const s = ctx.schedaPersonaggio;
  if (!s.caratteristiche) {
    return [h('p', { class: 'nota errore' }, 'La scheda non si può calcolare: correggi le scelte segnalate.'), elencoErrori(s.errori)];
  }
  const voci = checklist(scelte, dati);
  const inc = s.incantesimi;
  const conMagia = inc && (inc.quote.totale > 0 || inc.conosciuti.length > 0);
  const nomeSalvezza = (id) => dati.caratteristiche.salvezze.find((x) => x.id === id)?.nome ?? id;
  const provvisori = s.talentiLiberi.filter((t) => t.provvisorio);
  const livelloMax = dati.regole.avanzamento.livello_massimo;

  return [
    h('div', { class: 'riga-azioni no-stampa' },
      h('button', { type: 'button', class: 'btn primario', onclick: ctx.stampa }, 'Stampa'),
      h('button', { type: 'button', class: 'btn', onclick: ctx.esporta }, 'Esporta JSON')),

    // Avanzamento (cap. 8): un livello alla volta, si annulla solo l'ultimo
    h('section', { class: 'riquadro avanzamento no-stampa' },
      h('h3', {}, `Livello ${s.livello}`),
      h('div', { class: 'riga-azioni' },
        s.livello < livelloMax
          ? h('button', { type: 'button', class: 'btn primario', disabled: !!ctx.motivoNoSalita, onclick: ctx.saliDiLivello }, `Sali al livello ${s.livello + 1}`)
          : h('span', { class: 'nota' }, `Livello massimo (${livelloMax}) raggiunto.`),
        ctx.livelli.length ? h('button', { type: 'button', class: 'btn pericolo', onclick: ctx.annullaUltimoLivello }, 'Annulla l’ultimo livello') : null),
      ctx.motivoNoSalita && s.livello < livelloMax ? h('p', { class: 'motivo' }, ctx.motivoNoSalita) : null),

    s.errori.length ? h('section', { class: 'riquadro attenzione no-stampa' },
      h('h3', {}, 'Scheda non ancora completa'), elencoErrori(s.errori)) : null,

    h('section', { class: 'controllo no-stampa' },
      h('h3', {}, 'Controllo finale della creazione (§2.17)'),
      h('ul', { class: 'checklist' }, voci.map((v) => h('li', { class: v.nonApplicabile ? 'na' : v.ok ? 'ok' : 'ko' },
        h('span', { class: 'spunta', 'aria-hidden': 'true' }, v.nonApplicabile ? '–' : v.ok ? '✓' : '✗'),
        h('span', { class: 'sr' }, v.nonApplicabile ? 'Non applicabile: ' : v.ok ? 'Fatto: ' : 'Da completare: '),
        v.testo)))),

    h('article', { class: 'scheda' },
      h('header', { class: 'scheda-testa' },
        h('h2', {}, scelte.nome.trim() || 'Personaggio senza nome'),
        h('p', {}, `${s.livello}° livello · ${s.corporazione} · ${s.addestramento} · ${s.classi.map((c) => `${c.nome} ${GRADI_ROMANI[c.grado]}`).join(', ')}`),
        scelte.concetto.trim() ? h('div', { class: 'background' }, h('h3', {}, 'Background'), h('p', { class: 'concetto' }, scelte.concetto)) : null),

      s.annotazioni.length ? h('section', { class: 'annotazioni' },
        h('h3', {}, 'Note'),
        h('ul', {}, s.annotazioni.map((a) => h('li', {}, a)))) : null,

      h('div', { class: 'scheda-griglia' },
        h('section', {},
          h('h3', {}, 'Caratteristiche'),
          h('table', { class: 'tabella compatta' },
            h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Valore'), h('th', {}, 'Mod'), h('th', {}, 'Mod Salv.'))),
            h('tbody', {}, Object.entries(s.caratteristiche).map(([sigla, c]) => h('tr', {},
              h('th', { scope: 'row' }, info('caratteristica', sigla, `${c.nome} (${sigla})`)), h('td', { class: 'forte' }, String(c.valore)),
              h('td', {}, segno(c.mod)), h('td', {}, segno(c.modSalvezza))))))),
        h('section', {},
          h('h3', {}, 'Valori derivati'),
          h('dl', { class: 'voci griglia-voci' },
            voce('Punti Vita', s.pv),
            voce('Punti Magia', s.pm === null ? 'da tirare' : String(s.pm)),
            voce('Iniziativa', `${segno(s.iniziativa)} (+1d10)`),
            voce('Movimento', `Passo ${s.movimento.passo} ${s.movimento.unita} · Corsa ${s.movimento.corsa} ${s.movimento.unita} · Scatto ${s.movimento.scatto} ${s.movimento.unita}`),
            voce('Azioni', `${s.azioni.movimento} di Movimento, ${s.azioni.principali} ${s.azioni.principali === 1 ? 'Principale' : 'Principali'} per Round`),
            voce('Punti Eroe', Number.isInteger(valoreTiro(scelte.puntiEroe)) ? `${valoreTiro(scelte.puntiEroe)} (max ${dati.regole.punti_eroe.riserva_massima}${scelte.puntiEroe.origine === 'manuale' ? ', tirato dal vivo' : ''})` : 'da determinare'),
            voce('Distintivi', '')),
          h('h3', {}, 'Prove Salvezza'),
          h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta' },
            h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Base'), h('th', {}, 'Mod'), h('th', {}, 'Addestr.'), h('th', {}, 'Corp.'),
              h('th', {}, 'Avanz.'), h('th', { title: 'Prova Salvezza Migliorata' }, 'Talenti'), h('th', {}, 'Totale'))),
            h('tbody', {}, Object.values(s.salvezze).map((v) => h('tr', {},
              h('th', { scope: 'row' }, `${v.nome} (${v.caratteristica})`), h('td', {}, String(v.base8)), h('td', {}, segno(v.modSpecifico)),
              h('td', {}, String(v.addestramento)), h('td', {}, String(v.corporazione)), h('td', {}, String(v.avanzamento)),
              h('td', {}, String(v.talenti ?? 0)),
              h('td', { class: 'forte', title: v.limitato ? `Limitato a ${v.tetto} (§1.2.3)` : null }, `${v.totale}${v.limitato ? '*' : ''}`)))))))),

      h('section', {},
        h('h3', {}, 'Abilità'),
        h('table', { class: 'tabella compatta abilita-scheda' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Abilità'), h('th', {}, 'Mod'), h('th', {}, 'Base'), h('th', {}, 'Corp'), h('th', {}, 'Avanz'), h('th', {}, 'VA'))),
          dati.abilita.categorie.map((cat) => h('tbody', {},
            h('tr', { class: 'categoria' }, h('th', { colspan: 6 }, cat)),
            s.abilita.filter((a) => a.categoria === cat).map((a) => h('tr', { class: a.daClasse ? 'di-classe' : null },
              h('th', { scope: 'row' }, info('abilita', a.nome), h('span', { class: 'sigla' }, ` ${a.caratteristica}`), a.daClasse ? ' •' : null),
              h('td', {}, segno(a.mod)), h('td', {}, String(a.base)), h('td', {}, String(a.corporazione)),
              h('td', {}, String(a.avanzamento)), h('td', { class: 'forte' }, String(a.totale)))))),
          h('tfoot', {}, h('tr', {}, h('td', { colspan: 6 }, `• Abilità di Classe. VA = Mod + Base + Corp + Avanz (massimo di Avanzamento al ${s.livello}° livello: ${s.abilita[0]?.limite ?? '—'}).`))))),

      h('section', {},
        h('h3', {}, 'Vantaggio dell’Addestramento'),
        h('p', {}, h('strong', {}, `${s.vantaggio.nome}. `), s.vantaggio.testo)),

      h('section', {},
        h('h3', {}, 'Classi e Talenti di Classe'),
        s.classi.map((c) => h('div', { class: 'classe-scheda' },
          h('h4', {}, `${c.nome} — Grado ${GRADI_ROMANI[c.grado]}`, h('span', { class: 'sigla' }, ` · ${c.addestramento}${c.taumaturgica ? ' · taumaturgica' : ''}`)),
          c.talenti.map((t) => h('div', { class: 'talento' },
            h('h5', {}, `${GRADI_ROMANI[t.grado]} Grado — ${t.nome}${t.scelto ? ' (a scelta)' : ''}`),
            t.testo.split('\n').map((p) => h('p', {}, p))))))),

      s.talentiLiberi.length || s.specializzazioni.length ? h('section', {},
        h('h3', {}, 'Talenti Liberi'),
        provvisori.length ? h('p', { class: 'riquadro attenzione' },
          `Talenti provvisori (ricavati dal Manuale della Magia, prerequisiti da definire con il master): ${provvisori.map((t) => t.nome).join(', ')}.`) : null,
        s.talentiLiberi.map((t) => h('div', { class: 'talento' },
          h('h5', {}, info('talento', t.id, t.nome),
            t.parametro ? ` (${nomeSalvezza(t.parametro)})` : null,
            t.annotazione ? ` — ${t.annotazione}` : null,
            h('span', { class: 'sigla' }, ` · ${t.livello}° livello`),
            t.provvisorio ? h('span', { class: 'etichetta' }, 'provvisorio') : null),
          t.testo.split('\n').map((p) => h('p', { class: 'piccolo' }, p)))),
        s.specializzazioni.length ? h('div', {},
          h('h4', {}, 'Specializzazioni'),
          h('ul', {}, s.specializzazioni.map((x) => h('li', {},
            info('talento', x.id, `Specializzazione in ${x.nome}`),
            ` — ${x.abilita.length ? x.abilita.join(', ') : 'Abilità della scheda dell’arma'}; ${effettoSpecializzazione(x.effetto)} (${x.livello}° livello)`)))) : null) : null,

      s.tecniche.length || s.tecnicheAmmesse ? h('section', {},
        h('h3', {}, `Tecniche Interiori (${s.tecniche.length} / ${s.tecnicheAmmesse})`),
        h('ul', {}, s.tecniche.map((t) => h('li', {},
          info('tecnica', t.id, t.nome), ` — costo ${t.costo}; ${t.azione}; durata ${t.durata}`)))) : null,

      conMagia ? h('section', {},
        h('h3', {}, `Incantesimi conosciuti (${inc.conosciuti.length} / ${inc.quote.totale})`),
        inc.conosciuti.length ? inc.conosciuti.map((i) => bloccoIncantesimo(i)) : h('p', {}, 'Nessuno scelto.'),
        h('p', { class: 'nota' }, `Livello massimo di lancio: ${inc.livelloMassimo}.${inc.scalaPotere === 'altri_utilizzatori' ? ' Prove di Potere con la scala «altri utilizzatori».' : ''} Scheda completa: clic sul nome, oppure Manuale della Magia alla scheda indicata.`)) : null,

      h('section', {},
        h('h3', {}, 'Equipaggiamento'),
        h('p', { class: 'testo-libero' }, scelte.equipaggiamento.trim() || '—')),

      h('section', { class: 'progressione' },
        h('h3', {}, 'Progressione'),
        h('table', { class: 'tabella compatta' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Livello'), h('th', {}, 'Scelte'))),
          h('tbody', {}, s.progressione.map((r) => h('tr', {},
            h('th', { scope: 'row' }, `${r.livello}°`),
            h('td', {}, r.righe.length ? h('ul', { class: 'righe-livello' }, r.righe.map((x) => h('li', {}, x))) : '—')))))),

      h('footer', { class: 'scheda-piede' }, `Dati: ${ctx.versioni}.`)),
  ];
}

function effettoSpecializzazione(e) {
  const parti = [];
  if (e.va) parti.push(`${segno(e.va)} VA`);
  if (e.danno) parti.push(`${segno(e.danno)} danno`);
  if (e.pm) parti.push(`${segno(e.pm)} PM (minimo ${e.pm_minimo})`);
  return parti.join(', ');
}

/** Incantesimo conosciuto: intestazione, lancio e riga del livello base (anche in stampa). */
function bloccoIncantesimo(i) {
  const riga = rigaAlLivello(i, i.livello_base);
  return h('div', { class: 'incantesimo-scheda' },
    h('h4', {}, info('incantesimo', i.nome), h('span', { class: 'sigla' }, ` · ${i.macrofamiglia} / ${i.specializzazione} · livello base ${i.livello_base}`)),
    i.intestazione ? h('p', { class: 'piccolo' }, i.intestazione) : null,
    i.lancio ? h('p', { class: 'piccolo' }, i.lancio) : null,
    riga ? h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta' },
      h('thead', {}, h('tr', {}, Object.keys(riga).map((k) => h('th', {}, k)))),
      h('tbody', {}, h('tr', {}, Object.values(riga).map((v) => h('td', {}, v))))))
      : h('p', { class: 'nota' }, `Tabella non disponibile: Manuale della Magia, scheda ${i.scheda}.`));
}

function voce(etichetta, valore) {
  return h('div', {}, h('dt', {}, etichetta), h('dd', {}, String(valore)));
}

function elencoErrori(errori) {
  return h('ul', {}, errori.map((e) => h('li', {}, e.livello && e.livello > 1 ? `${e.livello}° livello: ${e.problema}` : e.problema)));
}
