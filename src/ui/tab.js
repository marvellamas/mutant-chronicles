// Scheda digitale a tab (#/p/<id>): Identità, Abilità, Combattimento, Magia (solo con accesso
// agli incantesimi), docs/roadmap-equipaggiamento-e-scheda.md §3. I contenuti vengono da
// preparaTab() — gli stessi dati dei fogli di stampa, senza troncamenti — più la modalità
// tavolo: i valori attuali della sessione (src/sessione.js), che non si ricalcolano.
// Le penalità di Ferite, Affaticamento e Stati sono solo promemoria: i VA mostrati non le
// includono (le regole del cap. 5 sono situazionali).
import { h, segno } from './dom.js';
import { info } from './tooltip.js';
import { descriviFerite } from '../sessione.js';

export const POSIZIONI_TAB = [
  { id: 'automatica', etichetta: 'Automatica (sinistra su schermi larghi, in basso su telefono e tablet)' },
  { id: 'sinistra', etichetta: 'Sinistra' },
  { id: 'basso', etichetta: 'In basso' },
  { id: 'alto', etichetta: 'In alto' },
];

const ICONE_TAB = { identita: '👤', abilita: '🎯', combattimento: '⚔', magia: '✦' };

/**
 * Contesto: { dati, tab: risultato di preparaTab, attiva: id della tab, scelte, livelli,
 *   sessione, massimi, penalita, posizione, puoAnnullareSessione, motivoNoSalita, messaggio,
 *   azioni: { vaiTab, sali, annullaLivello, stampa, esporta, modificaCreazione(passo?),
 *     nuovaSessione, annullaSessione, varia(campo, delta), imposta(campo, valore),
 *     commutaStato(id), convertiDistintivi, puntiEsperienza(v), note(v), posizione(v) },
 *   passi: { background, equipaggiamento }, ui }
 */
export function renderTab(ctx) {
  const { tab, attiva, azioni } = ctx;
  const corrente = tab.tab.find((t) => t.id === attiva) ?? tab.tab[0];
  const id = tab.tab[0].dati;
  const livelloMax = ctx.dati.regole.avanzamento.livello_massimo;

  const barra = h('header', { class: 'barra-scheda' },
    h('div', { class: 'barra-titolo' },
      h('h1', {}, id.nome),
      h('p', {}, h('strong', {}, `${id.livello}° livello`), ` · ${id.corporazione} · ${id.addestramento} · ${id.classi.map((c) => `${c.nome} ${c.grado}`).join(', ')}`)),
    h('div', { class: 'barra-azioni' },
      ctx.puoAnnullareSessione ? h('button', { type: 'button', class: 'btn', onclick: azioni.annullaSessione, title: 'Annulla l’ultima modifica ai valori di sessione' }, '↶ Annulla') : null,
      id.livello < livelloMax
        ? h('button', { type: 'button', class: 'btn primario', disabled: !!ctx.motivoNoSalita, title: ctx.motivoNoSalita, onclick: azioni.sali }, `Sali al livello ${id.livello + 1}`)
        : null,
      menuAzioni(ctx),
      menuImpostazioni(ctx)));

  const nav = h('nav', { class: 'tab-nav', 'aria-label': 'Sezioni della scheda' },
    h('div', { role: 'tablist' }, tab.tab.map((t) => h('button', {
      type: 'button', role: 'tab', id: `tab-${t.id}`, class: `tab-bottone${t.id === corrente.id ? ' attiva' : ''}`,
      'aria-selected': String(t.id === corrente.id), 'aria-controls': 'pannello-tab',
      onclick: () => azioni.vaiTab(t.id),
    }, h('span', { class: 'tab-icona', 'aria-hidden': 'true' }, ICONE_TAB[t.id] ?? '•'), h('span', { class: 'tab-etichetta' }, t.titolo)))));

  const contenuti = { identita: tabIdentita, abilita: tabAbilita, combattimento: tabCombattimento, magia: tabMagia };
  const pannello = h('section', { class: 'tab-pannello', id: 'pannello-tab', role: 'tabpanel', 'aria-labelledby': `tab-${corrente.id}` },
    ctx.messaggio ? h('p', { class: `riquadro ${ctx.messaggio.tipo}`, role: 'status' }, ctx.messaggio.testo) : null,
    tab.errori?.length ? h('div', { class: 'riquadro attenzione' },
      h('p', {}, h('strong', {}, 'Scheda non ancora completa:')),
      h('ul', {}, tab.errori.slice(0, 6).map((e) => h('li', {}, e.livello > 1 ? `${e.livello}° livello: ${e.problema}` : e.problema)))) : null,
    contenuti[corrente.id](ctx, corrente.dati));

  return [h('div', { class: `scheda-tab pos-${ctx.posizione}` }, barra, nav, pannello)];
}

function menuAzioni(ctx) {
  const { azioni } = ctx;
  const voce = (testo, onclick, opz = {}) => h('button', { type: 'button', class: `btn${opz.pericolo ? ' pericolo' : ''}`, onclick, disabled: !!opz.disabilitato, title: opz.titolo ?? null }, testo);
  return h('details', { class: 'menu-azioni' },
    h('summary', { class: 'btn' }, 'Azioni ▾'),
    h('div', { class: 'menu-voci' },
      voce('Stampa', azioni.stampa),
      voce('Esporta JSON', azioni.esporta),
      voce('Modifica creazione', () => azioni.modificaCreazione()),
      ctx.livelli.length ? voce('Annulla l’ultimo livello', azioni.annullaLivello, { pericolo: true }) : null,
      h('hr', {}),
      voce('Nuova sessione', azioni.nuovaSessione, { titolo: 'PV e PM ai massimi, Stati, Ferite e Affaticamento a zero' }),
      voce('Annulla ultima modifica di sessione', azioni.annullaSessione, { disabilitato: !ctx.puoAnnullareSessione }),
      ctx.motivoNoSalita ? h('p', { class: 'nota' }, ctx.motivoNoSalita) : null));
}

function menuImpostazioni(ctx) {
  return h('details', { class: 'menu-azioni impostazioni' },
    h('summary', { class: 'btn icona', 'aria-label': 'Impostazioni', title: 'Impostazioni' }, '⚙'),
    h('div', { class: 'menu-voci' },
      h('fieldset', {},
        h('legend', {}, 'Posizione tab'),
        POSIZIONI_TAB.map((p) => h('label', { class: 'scelta-radio' },
          h('input', { type: 'radio', name: 'posizione-tab', value: p.id, checked: ctx.posizione === p.id, onchange: () => ctx.azioni.posizione(p.id) }),
          ` ${p.etichetta}`))),
      h('p', { class: 'nota' }, 'Salvata in questo browser.')));
}

// ---------------------------------------------------------------------------
// componenti della modalità tavolo

/** Contatore «attuali / massimi» con pulsanti grandi (≥ 44 px) per il dito. */
function contatoreTavolo(ctx, { titolo, campo, attuale, massimo, passi = [1, 5], nota = null }) {
  const b = (delta) => h('button', {
    type: 'button', class: 'btn-tavolo', onclick: () => ctx.azioni.varia(campo, delta),
    disabled: (delta < 0 && attuale <= 0) || (massimo !== null && delta > 0 && attuale >= massimo),
    'aria-label': `${delta > 0 ? 'Aggiungi' : 'Togli'} ${Math.abs(delta)} a ${titolo}`,
  }, delta > 0 ? `+${delta}` : `−${-delta}`);
  const meno = [...passi].reverse().map((p) => b(-p));
  const piu = passi.map((p) => b(p));
  return h('div', { class: 'contatore-tavolo' },
    h('h3', {}, titolo),
    h('p', { class: 'valore-tavolo', 'aria-live': 'polite' },
      h('strong', {}, String(attuale)), massimo !== null ? h('span', {}, ` / ${massimo}`) : null),
    h('div', { class: 'pulsanti-tavolo' }, meno, piu),
    nota ? h('p', { class: 'nota' }, nota) : null);
}

function promemoriaPenalita(ctx) {
  const p = ctx.penalita;
  const parti = [];
  if (ctx.sessione.ferite) parti.push(`Ferite: ${p.ferite.nome}${p.ferite.penalita ? ` ${segno(p.ferite.penalita)} a VA e Prove Salvezza` : ''}`);
  if (p.affaticamento.penalita) parti.push(`Affaticamento: ${p.affaticamento.nome} ${segno(p.affaticamento.penalita)} a tutte le Prove`);
  if (p.stati.length) parti.push(`Stati: ${p.stati.map((s) => s.nome).join(', ')}`);
  if (!parti.length) return null;
  return h('div', { class: 'riquadro attenzione promemoria' },
    h('p', {}, h('strong', {}, 'Promemoria di sessione. '), parti.join(' · '), '.'),
    p.totale ? h('p', { class: 'nota' }, `Totale alle Prove: ${segno(p.totale)}. I valori della scheda non includono queste penalità: applicale al tiro (cap. 5).`) : null);
}

const sezione = (titolo, ...contenuto) => h('section', { class: 'sezione-tab' }, h('h2', {}, titolo), ...contenuto);
const paragrafi = (testo) => String(testo ?? '').split('\n').filter((x) => x.trim()).map((p) => h('p', {}, p));

// ---------------------------------------------------------------------------
// Identità

function tabIdentita(ctx, d) {
  const s = ctx.sessione;
  const m = ctx.massimi;
  const mov = d.movimento;
  const vuoti = d.anagrafica.filter((x) => !x.valore).length;
  return [
    promemoriaPenalita(ctx),
    h('div', { class: 'griglia-tavolo' },
      contatoreTavolo(ctx, { titolo: 'Punti Vita', campo: 'pvAttuali', attuale: s.pvAttuali, massimo: m.pv }),
      contatoreTavolo(ctx, { titolo: 'Punti Magia', campo: 'pmAttuali', attuale: s.pmAttuali, massimo: m.pm }),
      contatoreTavolo(ctx, { titolo: 'Punti Eroe', campo: 'puntiEroe', attuale: s.puntiEroe, massimo: m.puntiEroe, passi: [1] }),
      h('div', {},
        contatoreTavolo(ctx, { titolo: 'Distintivi', campo: 'distintivi', attuale: s.distintivi, massimo: null, passi: [1] }),
        h('button', {
          type: 'button', class: 'btn', onclick: ctx.azioni.convertiDistintivi,
          disabled: s.distintivi < m.distintiviPerPuntoEroe || s.puntiEroe >= m.puntiEroe,
          title: '§1.8.3: facoltativo, senza superare la riserva massima',
        }, `Converti ${m.distintiviPerPuntoEroe} Distintivi in 1 Punto Eroe`))),

    sezione('Anagrafica',
      h('dl', { class: 'anagrafica' },
        h('dt', {}, 'Corporazione'), h('dd', {}, d.corporazione),
        h('dt', {}, 'Addestramento'), h('dd', {}, d.addestramento),
        h('dt', {}, 'Classi'), h('dd', {}, d.classi.map((c) => `${c.nome} ${c.grado}`).join(', ')),
        h('dt', {}, 'Livello'), h('dd', {}, String(d.livello)),
        d.anagrafica.map((x) => [h('dt', {}, x.etichetta), h('dd', { class: x.valore ? null : 'vuoto' }, x.valore || '—')]),
        h('dt', {}, h('label', { for: 'px' }, 'Punti esperienza')),
        h('dd', {}, h('input', {
          id: 'px', type: 'number', inputmode: 'numeric', step: 'any', class: 'input-px', value: d.puntiEsperienza ?? '',
          onchange: (e) => ctx.azioni.puntiEsperienza(e.target.value === '' || !Number.isFinite(Number(e.target.value)) ? null : Number(e.target.value)),
        }))),
      h('button', { type: 'button', class: 'btn', onclick: () => ctx.azioni.modificaCreazione(ctx.passi.background) },
        vuoti ? `Completa l’anagrafica (${vuoti} campi vuoti)` : 'Modifica anagrafica e Background')),

    h('div', { class: 'griglia-due' },
      sezione('Caratteristiche',
        h('table', { class: 'tabella compatta' },
          h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Valore'), h('th', {}, 'Mod'), h('th', {}, 'Mod Salv.'))),
          h('tbody', {}, d.caratteristiche.map((c) => h('tr', {},
            h('th', { scope: 'row' }, info('caratteristica', c.sigla, `${c.nome} (${c.sigla})`)),
            h('td', { class: 'forte' }, String(c.valore)), h('td', {}, segno(c.mod)), h('td', {}, segno(c.modSalvezza))))))),
      sezione('Prove Salvezza',
        h('table', { class: 'tabella compatta' },
          h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Car.'), h('th', {}, 'Valore'))),
          h('tbody', {}, d.salvezze.map((x) => h('tr', {},
            h('th', { scope: 'row' }, x.nome), h('td', {}, x.caratteristica),
            h('td', { class: 'forte', title: x.limitato ? `Limitato a ${x.tetto} (§1.2.3)` : null }, `${x.totale}${x.limitato ? '*' : ''}`))))),
        ctx.penalita.totale ? h('p', { class: 'nota' }, `Promemoria: ${segno(ctx.penalita.totale)} per Ferite e Affaticamento, non incluso.`) : null)),

    sezione('Combattimento e movimento',
      h('dl', { class: 'voci griglia-voci' },
        h('div', {}, h('dt', {}, 'Iniziativa'), h('dd', {}, `${segno(d.iniziativa)} + ${d.dadoIniziativa}`)),
        h('div', {}, h('dt', {}, 'Movimento'), h('dd', {}, `Passo ${mov.passo} ${mov.unita} · Corsa ${mov.corsa} ${mov.unita} · Scatto ${mov.scatto} ${mov.unita}`)),
        h('div', {}, h('dt', {}, 'Azioni'), h('dd', {}, `${d.azioni.movimento} di Movimento, ${d.azioni.principali} ${d.azioni.principali === 1 ? 'Principale' : 'Principali'} per Round`)))),

    sezione('Vantaggio dell’Addestramento', h('p', {}, h('strong', {}, `${d.vantaggio.nome}. `), d.vantaggio.testo)),
    sezione('Background', d.background ? paragrafi(d.background) : h('p', { class: 'vuoto' }, 'Nessun Background scritto.')),

    sezione('Note di sessione',
      h('textarea', {
        class: 'note-sessione', rows: 5, value: ctx.sessione.note, 'aria-label': 'Note di sessione',
        placeholder: 'Appunti della sessione: restano con «Nuova sessione».',
        onfocus: () => ctx.azioni.inizioNote(),
        oninput: (e) => ctx.azioni.note(e.target.value),
      })),

    d.annotazioni.length ? sezione('Note della scheda', h('ul', {}, d.annotazioni.map((a) => h('li', {}, a)))) : null,

    sezione('Progressione',
      h('table', { class: 'tabella compatta' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Livello'), h('th', {}, 'Scelte'))),
        h('tbody', {}, d.progressione.map((r) => h('tr', {},
          h('th', { scope: 'row' }, `${r.livello}°`),
          h('td', {}, r.righe.length ? h('ul', { class: 'righe-livello' }, r.righe.map((x) => h('li', {}, x))) : '—')))))),

    h('details', { class: 'sezione-tab' },
      h('summary', {}, `Controllo della creazione (§2.17): ${d.checklist.filter((v) => v.ok || v.nonApplicabile).length} / ${d.checklist.length}`),
      h('ul', { class: 'checklist' }, d.checklist.map((v) => h('li', { class: v.nonApplicabile ? 'na' : v.ok ? 'ok' : 'ko' },
        h('span', { class: 'spunta', 'aria-hidden': 'true' }, v.nonApplicabile ? '–' : v.ok ? '✓' : '✗'),
        h('span', { class: 'sr' }, v.nonApplicabile ? 'Non applicabile: ' : v.ok ? 'Fatto: ' : 'Da completare: '),
        v.testo)))),
  ];
}

// ---------------------------------------------------------------------------
// Abilità

function tabAbilita(ctx, d) {
  const meta = Math.ceil(d.categorie.length / 2);
  const tabella = (categorie) => h('table', { class: 'tabella compatta abilita-tab' },
    h('thead', {}, h('tr', {}, ['Abilità', 'Mod', 'Base', 'Corp', 'Avanz', 'VA'].map((c) => h('th', {}, c)))),
    categorie.map((cat) => h('tbody', {},
      h('tr', { class: 'categoria' }, h('th', { colspan: 6 }, cat.nome)),
      cat.abilita.map((a) => h('tr', { class: a.diClasse ? 'di-classe' : null },
        h('th', { scope: 'row' }, info('abilita', a.nome), h('span', { class: 'sigla' }, ` ${a.caratteristica}`), a.diClasse ? ' •' : null),
        h('td', {}, segno(a.mod)), h('td', {}, String(a.base)), h('td', {}, String(a.corporazione)),
        h('td', {}, String(a.avanzamento)), h('td', { class: 'forte' }, String(a.va)))))));
  return [
    promemoriaPenalita(ctx),
    sezione('Abilità',
      h('div', { class: 'abilita-affiancate' }, tabella(d.categorie.slice(0, meta)), tabella(d.categorie.slice(meta))),
      h('p', { class: 'nota' }, `• Abilità di Classe. VA = Mod + Base + Corp + Avanz. Avanzamento massimo: ${d.limiteAvanzamento ?? '—'}.`)),
    sezione('Talenti di Classe', d.talentiClasse.map((t) => h('div', { class: 'talento' },
      h('h3', {}, t.nome, h('span', { class: 'sigla' }, ` · ${t.classe} ${t.grado}${t.scelto ? ', a scelta' : ''}`)),
      paragrafi(t.frase)))),
    d.talentiLiberi.length ? sezione('Talenti Liberi', d.talentiLiberi.map((t) => h('div', { class: 'talento' },
      h('h3', {}, info('talento', t.id, t.nome), t.parametro ? ` (${t.parametro})` : null, t.annotazione ? ` — ${t.annotazione}` : null,
        h('span', { class: 'sigla' }, ` · ${t.livello}° livello`), t.provvisorio ? h('span', { class: 'etichetta' }, 'provvisorio') : null),
      t.provvisorio ? h('p', { class: 'nota' }, 'Talento provvisorio: ricavato dal Manuale della Magia, prerequisiti da definire con il master.') : null,
      paragrafi(t.frase)))) : null,
    d.specializzazioni.length ? sezione('Specializzazioni', h('ul', {}, d.specializzazioni.map((x) => h('li', {},
      info('talento', x.id, x.nome), ` — ${x.abilita}; ${x.effetto} (${x.livello}° livello)`)))) : null,
    d.tecniche.length || d.tecnicheAmmesse ? sezione(`Tecniche Interiori (${d.tecniche.length} / ${d.tecnicheAmmesse})`,
      h('ul', {}, d.tecniche.map((t) => h('li', {}, info('tecnica', t.id, t.nome), ` — costo ${t.costo}; ${t.azione}; durata ${t.durata}`)))) : null,
  ];
}

// ---------------------------------------------------------------------------
// Combattimento

function tabCombattimento(ctx, d) {
  const s = ctx.sessione;
  const m = ctx.massimi;
  const gradini = Array.from({ length: m.ferite + 1 }, (_, n) => ({ n, ...descriviFerite(n, ctx.dati) }));
  return [
    promemoriaPenalita(ctx),
    h('div', { class: 'griglia-tavolo' },
      contatoreTavolo(ctx, { titolo: 'Punti Vita', campo: 'pvAttuali', attuale: s.pvAttuali, massimo: m.pv }),
      d.difese ? h('div', { class: 'contatore-tavolo' }, h('h3', {}, 'Difese'),
        h('p', { class: 'valore-tavolo' }, h('strong', {}, `VA ${d.difese.va}`)), h('p', { class: 'nota' }, `(${d.difese.caratteristica}) senza penalità di sessione`)) : null),

    sezione('Ferite (§5.14)',
      h('p', { class: 'nota' }, 'Ogni nuova Ferita fa avanzare di un gradino. La penalità è cumulativa a VA e Prove Salvezza.'),
      h('div', { class: 'selettore-livelli', role: 'radiogroup', 'aria-label': 'Ferite' }, gradini.map((g) => h('button', {
        type: 'button', role: 'radio', 'aria-checked': String(s.ferite === g.n), class: `livello-tavolo${s.ferite === g.n ? ' attivo' : ''}${g.n > 0 && s.ferite >= g.n ? ' raggiunto' : ''}`,
        onclick: () => ctx.azioni.imposta('ferite', g.n),
      }, h('strong', {}, g.nome), h('span', {}, g.penalita === null ? '' : g.penalita ? segno(g.penalita) : '0'), g.menomazione ? h('small', {}, g.menomazione) : null)))),

    sezione('Affaticamento (§5.19)',
      h('p', { class: 'nota' }, 'Si applica solo la penalità dello Stato attuale, a tutte le Prove di Caratteristica, Abilità e Salvezza.'),
      h('div', { class: 'selettore-livelli', role: 'radiogroup', 'aria-label': 'Affaticamento' }, d.affaticamento.map((a, n) => h('button', {
        type: 'button', role: 'radio', 'aria-checked': String(s.affaticamento === n), class: `livello-tavolo${s.affaticamento === n ? ' attivo' : ''}`,
        onclick: () => ctx.azioni.imposta('affaticamento', n),
      }, h('strong', {}, a.nome), h('span', {}, a.penalita ? segno(a.penalita) : '0'))))),

    sezione('Stati attivi (§5.18)',
      h('ul', { class: 'stati-tavolo' }, d.stati.map((st) => {
        const attivo = s.statiAttivi.includes(st.id);
        return h('li', {}, h('label', { class: `stato-tavolo${attivo ? ' attivo' : ''}` },
          h('input', { type: 'checkbox', checked: attivo, onchange: () => ctx.azioni.commutaStato(st.id) }),
          h('span', {}, h('strong', {}, st.nome), h('small', {}, ` · ${st.durata}`), h('br', {}), h('span', { class: 'promemoria-stato' }, st.promemoria, st.riassunto ? h('em', { class: 'riassunto' }, ' (riassunto, non testo del manuale)') : null))));
      }))),

    sezione('Armi e protezioni',
      h('p', { class: 'nota' }, 'Il catalogo dell’equipaggiamento (Manuale degli Armamenti) non è ancora nell’app: per ora armi, protezioni e munizioni si annotano nell’equipaggiamento o sulla scheda stampata.')),

    sezione('Equipaggiamento',
      d.equipaggiamento.length ? h('ul', {}, d.equipaggiamento.map((x) => h('li', {}, x))) : h('p', { class: 'vuoto' }, 'Nessun equipaggiamento annotato.'),
      h('button', { type: 'button', class: 'btn', onclick: () => ctx.azioni.modificaCreazione(ctx.passi.equipaggiamento) }, 'Modifica equipaggiamento')),
  ];
}

// ---------------------------------------------------------------------------
// Magia

function tabMagia(ctx, d) {
  const s = ctx.sessione;
  return [
    h('div', { class: 'griglia-tavolo' },
      contatoreTavolo(ctx, { titolo: 'Punti Magia', campo: 'pmAttuali', attuale: s.pmAttuali, massimo: ctx.massimi.pm }),
      h('div', { class: 'contatore-tavolo' }, h('h3', {}, 'Incantesimi'),
        h('p', { class: 'valore-tavolo' }, h('strong', {}, String(d.conosciuti)), h('span', {}, ` / ${d.quota}`)),
        h('p', { class: 'nota' }, `Livello massimo di lancio: ${d.livelloMassimo}`))),
    sezione(`Prove di Potere (scala ${d.scalaPotere})`,
      h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Livello'), h('th', {}, 'Prova'))),
        h('tbody', {}, d.scala.map((r) => h('tr', {}, h('th', { scope: 'row' }, r.livelli), h('td', {}, r.prova))))))),
    d.macrofamiglie.length ? d.macrofamiglie.map((mf) => sezione(mf.nome,
      mf.specializzazioni.map((sp) => h('div', {},
        h('h3', { class: 'spec' }, sp.nome),
        sp.incantesimi.map((i) => h('article', { class: 'incantesimo-scheda' },
          h('h4', {}, info('incantesimo', i.nome), h('span', { class: 'sigla' }, ` · livello base ${i.livelloBase} · scheda ${i.scheda}`)),
          i.intestazione ? h('p', { class: 'piccolo' }, i.intestazione) : null,
          i.lancio ? h('p', { class: 'piccolo' }, i.lancio) : null,
          i.righe.length ? h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta' },
            h('thead', {}, h('tr', {}, i.colonne.map((c) => h('th', {}, c)))),
            h('tbody', {}, i.righe.map((r) => h('tr', {}, r.map((v) => h('td', {}, v)))))))
            : h('p', { class: 'nota' }, `Tabella non disponibile: Manuale della Magia, scheda ${i.scheda}.`)))))))
      : sezione('Incantesimi', h('p', { class: 'vuoto' }, 'Nessun incantesimo scelto.')),
  ];
}
