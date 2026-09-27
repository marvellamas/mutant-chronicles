// Tab «Calendario» della scheda digitale: sezione facoltativa (ingranaggio → Calendario), fuori
// dalle regole. Viste Giorno / Settimana / Mese, ricerca con filtri, «Avanza» di fascia e di
// giorno. Il modello e le funzioni pure sono in src/calendario.js; ogni modifica passa da
// ctx.azioni.cambiaCalendario, che salva e la rende annullabile («Annulla ultima modifica»).
// Tutto a tocco: campi grandi, un tocco apre, nessun doppio clic.
import { h } from './dom.js';
import {
  COLORI, SENZA_BANDIERINA, fasce, aggiungiGiorni, aggiungiMesi, giorniSettimana, grigliaMese, stessoMese,
  nomeData, nomeMese, GIORNI, noteDi, riepilogo, filtraNote, filtroVuoto, contaNote,
  avanzaFascia, avanzaGiorno, aggiungiNota, modificaNota, eliminaNota, attivaCalendario, dataValida,
} from '../calendario.js';

const VISTE = [
  { id: 'giorno', sigla: 'G', nome: 'Giorno' },
  { id: 'settimana', sigla: 'S', nome: 'Settimana' },
  { id: 'mese', sigla: 'M', nome: 'Mese' },
];

/** «1 nota», «12 note». */
export const testoNote = (n) => `${n} ${n === 1 ? 'nota' : 'note'}`;

const nuovoId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const nomeFascia = (dati, id) => fasce(dati).find((f) => f.id === id)?.nome ?? id;
const bandierina = (dati, colore) => dati.regole.calendario.bandierine.find((b) => b.id === colore);

/** Stato dell'interfaccia (in memoria, non si salva): vista, data mostrata, filtri, bozze. */
function statoUi(ctx) {
  const u = ctx.ui.calendario ??= { vista: 'giorno', data: ctx.calendario.oggi.data, filtro: { colori: [], ricordare: false, testo: '' }, modifica: null, bozze: {} };
  if (!dataValida(u.data)) u.data = ctx.calendario.oggi.data;
  return u;
}

// pallino della bandierina, con il nome nel tooltip (per chi non distingue i colori)
function pallino(dati, colore) {
  const b = bandierina(dati, colore);
  return b ? h('span', { class: `cal-pallino evento-${colore}`, title: b.nome, 'aria-label': b.nome, role: 'img' }) : null;
}
function segnoM(dati) {
  const r = dati.regole.calendario.ricordare;
  return h('span', { class: 'cal-m', title: r.nome, 'aria-label': r.nome }, r.sigla);
}

// Ctrl + rotellina (desktop): avanti = più vicino (Mese → Settimana → Giorno). Un passo ogni 300 ms,
// così la rotellina di un touchpad non salta da Giorno a Mese in un colpo.
let ultimoZoom = 0;
function zoomRotella(ctx, u) {
  return (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const ora = Date.now();
    if (ora - ultimoZoom < 300) return;
    const i = VISTE.findIndex((v) => v.id === u.vista);
    const j = Math.max(0, Math.min(VISTE.length - 1, i + (e.deltaY < 0 ? -1 : 1)));
    if (j === i) return;
    ultimoZoom = ora;
    u.vista = VISTE[j].id;
    ctx.azioni.ridisegna();
  };
}

export function tabCalendario(ctx) {
  const { dati } = ctx;
  const cal = ctx.calendario;
  const u = statoUi(ctx);
  const cambia = (nuovo) => { if (nuovo) ctx.azioni.cambiaCalendario(nuovo); };
  const apriGiorno = (data) => { u.vista = 'giorno'; u.data = data; ctx.azioni.ridisegna(); };

  const oggi = h('div', { class: 'cal-oggi' },
    h('p', {}, 'Oggi nel gioco: ', h('strong', {}, nomeData(cal.oggi.data)), ', ', h('strong', {}, nomeFascia(dati, cal.oggi.fascia))),
    h('div', { class: 'cal-avanza', role: 'group', 'aria-label': 'Avanza il tempo di gioco' },
      h('button', { type: 'button', class: 'btn', onclick: () => { cambia(avanzaFascia(cal, dati)); }, title: 'Fascia successiva; dopo la Notte, la Mattina del giorno dopo' }, '+ fascia'),
      h('button', { type: 'button', class: 'btn', onclick: () => { cambia(avanzaGiorno(cal, dati)); }, title: 'Mattina del giorno dopo' }, '+ giorno')));

  return h('div', { class: 'calendario', onwheel: zoomRotella(ctx, u) },
    h('div', { class: 'titolo-tab' }, h('h2', {}, 'Calendario'), h('span', { class: 'cal-conteggio' }, testoNote(contaNote(cal)))),
    ctx.spazioQuasiEsaurito ? h('p', { class: 'riquadro attenzione', role: 'status' },
      'Lo spazio del browser sta per finire (ritratti e note del calendario occupano spazio): usa «SALVA PG (Esporta JSON)» e rimuovi dalla pagina iniziale i personaggi che non servono.') : null,
    oggi,
    ricerca(ctx, u, apriGiorno),
    navigazione(ctx, u),
    u.vista === 'mese' ? vistaMese(ctx, u, apriGiorno)
      : u.vista === 'settimana' ? vistaSettimana(ctx, u, apriGiorno)
        : vistaGiorno(ctx, u, cambia));
}

// --- Ricerca e filtri ------------------------------------------------------------------------

function ricerca(ctx, u, apriGiorno) {
  const { dati } = ctx;
  const f = u.filtro;
  const commuta = (colore) => {
    f.colori = f.colori.includes(colore) ? f.colori.filter((x) => x !== colore) : [...f.colori, colore];
    ctx.azioni.ridisegna();
  };
  const chip = (attivo, contenuto, onclick, titolo) => h('button', { type: 'button', class: `btn scelta-btn cal-chip${attivo ? ' scelta' : ''}`, 'aria-pressed': String(attivo), onclick, title: titolo }, contenuto);
  const campo = h('input', {
    type: 'search', id: 'cal-cerca', class: 'cal-cerca', placeholder: 'Cerca nelle note…', value: f.testo, 'aria-label': 'Cerca nel testo delle note',
    oninput: (e) => { f.testo = e.target.value; u.fuocoCerca = e.target.selectionStart; ctx.azioni.ridisegna(); },
  });
  // la scheda si ridisegna a ogni tasto: il cursore torna dov'era
  if (u.fuocoCerca !== undefined) {
    const pos = u.fuocoCerca;
    delete u.fuocoCerca;
    requestAnimationFrame(() => { campo.focus(); campo.setSelectionRange(pos, pos); });
  }
  const vuoto = filtroVuoto(f);
  const trovate = vuoto ? [] : filtraNote(ctx.calendario, f, dati);
  return h('section', { class: 'cal-ricerca', 'aria-label': 'Ricerca nelle note' },
    h('div', { class: 'scelta-pulsanti' },
      dati.regole.calendario.bandierine.map((b) => chip(f.colori.includes(b.id), [pallino(dati, b.id), ` ${b.nome}`], () => commuta(b.id), `Solo le note ${b.nome.toLowerCase()}`)),
      chip(f.colori.includes(SENZA_BANDIERINA), 'Senza bandierina', () => commuta(SENZA_BANDIERINA), 'Solo le note normali'),
      chip(f.ricordare, [segnoM(dati), ` ${dati.regole.calendario.ricordare.nome}`], () => { f.ricordare = !f.ricordare; ctx.azioni.ridisegna(); }, 'Solo le note da ricordare')),
    h('div', { class: 'cal-riga-cerca' }, campo,
      vuoto ? null : h('button', { type: 'button', class: 'btn', onclick: () => { u.filtro = { colori: [], ricordare: false, testo: '' }; ctx.azioni.ridisegna(); } }, 'Azzera')),
    vuoto ? null : h('div', { class: 'cal-risultati' },
      h('p', { class: 'nota' }, trovate.length ? `${testoNote(trovate.length)} ${trovate.length === 1 ? 'trovata' : 'trovate'}, in ordine di data. Tocca per aprire il giorno.` : 'Nessuna nota trovata.'),
      trovate.length ? h('ol', { class: 'cal-elenco' }, trovate.map((n) => h('li', {},
        h('button', { type: 'button', class: 'cal-risultato', onclick: () => apriGiorno(n.data) },
          h('span', { class: 'cal-quando' }, `${nomeData(n.data, { breve: true })} ${n.data.slice(0, 4)} · ${nomeFascia(dati, n.fascia)}`),
          h('span', { class: 'cal-testo-riga' }, pallino(dati, n.colore), n.ricordare ? segnoM(dati) : null, ` ${n.testo}`))))) : null));
}

// --- Navigazione ---------------------------------------------------------------------------

function navigazione(ctx, u) {
  const passo = { giorno: (d, s) => aggiungiGiorni(d, s), settimana: (d, s) => aggiungiGiorni(d, 7 * s), mese: (d, s) => aggiungiMesi(d, s) }[u.vista];
  const vai = (s) => { u.data = passo(u.data, s); ctx.azioni.ridisegna(); };
  const sett = giorniSettimana(u.data);
  const titolo = u.vista === 'giorno' ? nomeData(u.data)
    : u.vista === 'mese' ? nomeMese(u.data)
      : `${nomeData(sett[0], { breve: true })} – ${nomeData(sett[6], { breve: true })} ${sett[6].slice(0, 4)}`;
  const unita = VISTE.find((v) => v.id === u.vista).nome.toLowerCase();
  return h('div', { class: 'cal-nav' },
    h('div', { class: 'cal-nav-frecce' },
      h('button', { type: 'button', class: 'btn tondo', onclick: () => vai(-1), 'aria-label': `${unita} precedente`, title: `${unita} precedente` }, '←'),
      h('h3', { class: 'cal-titolo', 'aria-live': 'polite' }, titolo),
      h('button', { type: 'button', class: 'btn tondo', onclick: () => vai(1), 'aria-label': `${unita} successiv${u.vista === 'settimana' ? 'a' : 'o'}`, title: `${unita} successiv${u.vista === 'settimana' ? 'a' : 'o'}` }, '→')),
    h('div', { class: 'cal-nav-azioni' },
      h('button', { type: 'button', class: 'btn', onclick: () => { u.data = ctx.calendario.oggi.data; ctx.azioni.ridisegna(); }, title: 'Torna al giorno di oggi nel gioco' }, 'Oggi'),
      h('div', { class: 'cal-zoom', role: 'group', 'aria-label': 'Vista (anche Ctrl + rotellina)' },
        VISTE.map((v) => h('button', {
          type: 'button', class: `btn scelta-btn${u.vista === v.id ? ' scelta' : ''}`, 'aria-pressed': String(u.vista === v.id), title: v.nome, 'aria-label': v.nome,
          onclick: () => { u.vista = v.id; ctx.azioni.ridisegna(); },
        }, v.sigla)))));
}

// --- Giorno --------------------------------------------------------------------------------

function sceltaBandierina(dati, attuale, scegli) {
  return h('div', { class: 'scelta-pulsanti cal-bandierine', role: 'group', 'aria-label': 'Bandierina' },
    [{ id: null, nome: 'Normale' }, ...dati.regole.calendario.bandierine].map((b) => h('button', {
      type: 'button', class: `btn scelta-btn${attuale === b.id ? ' scelta' : ''}`, 'aria-pressed': String(attuale === b.id), onclick: () => scegli(b.id),
    }, b.id ? [pallino(dati, b.id), ` ${b.nome}`] : b.nome)));
}
function sceltaM(dati, attivo, commuta) {
  const r = dati.regole.calendario.ricordare;
  return h('button', { type: 'button', class: `btn scelta-btn${attivo ? ' scelta' : ''}`, 'aria-pressed': String(attivo), onclick: commuta, title: r.nome }, segnoM(dati), ` ${r.nome}`);
}

function vistaGiorno(ctx, u, cambia) {
  const { dati } = ctx;
  const cal = ctx.calendario;
  return h('div', { class: 'cal-giorno' }, fasce(dati).map((f) => {
    const eOra = cal.oggi.data === u.data && cal.oggi.fascia === f.id;
    const note = noteDi(cal, u.data, f.id, dati);
    const chiave = `${u.data}|${f.id}`;
    const b = u.bozze[chiave] ??= { testo: '', colore: null, ricordare: false };
    const aggiungi = () => {
      const nuovo = aggiungiNota(cal, { data: u.data, fascia: f.id, ...b }, { id: nuovoId(), creato: new Date().toISOString() }, dati);
      if (!nuovo) return;
      delete u.bozze[chiave];
      cambia(nuovo);
    };
    return h('section', { class: `cal-fascia${eOra ? ' ora' : ''}`, 'aria-label': `${f.nome}${eOra ? ' (ora)' : ''}` },
      h('h4', {}, f.nome, eOra ? h('span', { class: 'cal-ora' }, ' · Oggi, adesso') : null),
      note.length ? h('ul', { class: 'cal-note' }, note.map((n) => (u.modifica?.id === n.id ? notaInModifica(ctx, u, cambia) : notaRiga(ctx, u, n, cambia)))) : null,
      h('div', { class: 'cal-aggiungi' },
        h('input', {
          type: 'text', class: 'cal-testo', value: b.testo, placeholder: `Nuova nota (${f.nome.toLowerCase()})`, 'aria-label': `Nuova nota: ${f.nome}`,
          oninput: (e) => { b.testo = e.target.value; },
          onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); aggiungi(); } },
        }),
        sceltaBandierina(dati, b.colore, (c) => { b.colore = c; ctx.azioni.ridisegna(); }),
        h('div', { class: 'scelta-pulsanti' },
          sceltaM(dati, b.ricordare, () => { b.ricordare = !b.ricordare; ctx.azioni.ridisegna(); }),
          h('button', { type: 'button', class: 'btn primario', onclick: aggiungi }, 'Aggiungi'))));
  }));
}

function notaRiga(ctx, u, n, cambia) {
  const { dati } = ctx;
  return h('li', { class: `cal-nota${n.colore ? ` evento-${n.colore}` : ''}` },
    h('p', { class: 'cal-testo-riga' }, pallino(dati, n.colore), n.ricordare ? segnoM(dati) : null, ` ${n.testo}`),
    h('div', { class: 'cal-nota-azioni' },
      h('button', { type: 'button', class: 'btn', onclick: () => { u.modifica = { id: n.id, testo: n.testo, colore: n.colore, ricordare: n.ricordare, data: n.data, fascia: n.fascia }; ctx.azioni.ridisegna(); } }, 'Modifica o sposta'),
      h('button', {
        type: 'button', class: 'btn pericolo',
        onclick: () => { if (confirm(`Eliminare la nota «${n.testo.length > 60 ? `${n.testo.slice(0, 60)}…` : n.testo}»? Si può recuperare subito con «Annulla».`)) cambia(eliminaNota(ctx.calendario, n.id)); },
      }, 'Elimina')));
}

function notaInModifica(ctx, u, cambia) {
  const { dati } = ctx;
  const m = u.modifica;
  const salva = () => {
    const nuovo = modificaNota(ctx.calendario, m.id, m, dati);
    if (!nuovo) { alert('Serve un testo e una data valida.'); return; }
    u.modifica = null;
    // se la nota va in un altro giorno, la vista la segue
    u.data = m.data;
    cambia(nuovo);
  };
  return h('li', { class: 'cal-nota in-modifica' },
    h('input', { type: 'text', class: 'cal-testo', value: m.testo, 'aria-label': 'Testo della nota', oninput: (e) => { m.testo = e.target.value; }, onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); salva(); } } }),
    sceltaBandierina(dati, m.colore, (c) => { m.colore = c; ctx.azioni.ridisegna(); }),
    sceltaM(dati, m.ricordare, () => { m.ricordare = !m.ricordare; ctx.azioni.ridisegna(); }),
    h('div', { class: 'cal-sposta' },
      h('label', {}, 'Giorno ', h('input', { type: 'date', value: m.data, oninput: (e) => { m.data = e.target.value; } })),
      h('label', {}, 'Fascia ', h('select', { onchange: (e) => { m.fascia = e.target.value; } },
        fasce(dati).map((f) => h('option', { value: f.id, selected: m.fascia === f.id }, f.nome))))),
    h('div', { class: 'scelta-pulsanti' },
      h('button', { type: 'button', class: 'btn primario', onclick: salva }, 'Salva'),
      h('button', { type: 'button', class: 'btn', onclick: () => { u.modifica = null; ctx.azioni.ridisegna(); } }, 'Annulla')));
}

// --- Settimana e Mese ----------------------------------------------------------------------

// tutto il riquadro è il bersaglio del tocco: un tocco apre il giorno
const apribile = (classe, etichetta, apri, ...figli) => h('div', {
  class: classe, role: 'button', tabindex: '0', 'aria-label': etichetta, onclick: apri,
  onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apri(); } },
}, ...figli);

function vistaSettimana(ctx, u, apriGiorno) {
  const { dati } = ctx;
  const cal = ctx.calendario;
  return h('div', { class: 'cal-settimana' }, giorniSettimana(u.data).map((d) => {
    const tutte = noteDi(cal, d, null, dati);
    return apribile(`cal-colonna${d === cal.oggi.data ? ' oggi' : ''}`, `${nomeData(d)}: ${testoNote(tutte.length)}`, () => apriGiorno(d),
      h('p', { class: 'cal-colonna-testa' }, nomeData(d, { breve: true }), d === cal.oggi.data ? h('span', { class: 'cal-ora' }, ' · oggi') : null),
      fasce(dati).map((f) => {
        const note = tutte.filter((n) => n.fascia === f.id);
        const ora = d === cal.oggi.data && f.id === cal.oggi.fascia;
        return h('div', { class: `cal-fascia-breve${ora ? ' ora' : ''}` },
          h('span', { class: 'cal-fascia-nome' }, f.nome),
          note.map((n) => h('span', { class: 'cal-riga-breve' }, pallino(dati, n.colore), n.ricordare ? segnoM(dati) : null, ` ${n.testo}`)));
      }));
  }));
}

function vistaMese(ctx, u, apriGiorno) {
  const { dati } = ctx;
  const cal = ctx.calendario;
  return h('div', { class: 'cal-mese' },
    h('div', { class: 'cal-mese-testa', 'aria-hidden': 'true' }, GIORNI.map((g) => h('span', {}, g.slice(0, 3)))),
    grigliaMese(u.data).map((settimana) => h('div', { class: 'cal-mese-riga' }, settimana.map((d) => {
      const r = riepilogo(noteDi(cal, d, null, dati));
      const fuori = !stessoMese(d, u.data);
      return apribile(`cal-cella${fuori ? ' fuori' : ''}${d === cal.oggi.data ? ' oggi' : ''}`, `${nomeData(d)}: ${testoNote(r.n)}`, () => apriGiorno(d),
        h('span', { class: 'cal-numero' }, String(Number(d.slice(8)))),
        h('span', { class: 'cal-segni' }, COLORI.filter((c) => r.colori.includes(c)).map((c) => pallino(dati, c)), r.ricordare ? segnoM(dati) : null),
        r.n ? h('span', { class: 'cal-quante' }, String(r.n)) : null);
    }))));
}

// --- Attivazione (ingranaggio) -------------------------------------------------------------

/** Pannello della prima attivazione: data d'inizio (selettore) e fascia di partenza. */
export function pannelloAttivazione(ctx) {
  const { dati } = ctx;
  const a = ctx.ui.attivaCalendario;
  const chiudi = () => { ctx.ui.attivaCalendario = null; ctx.azioni.ridisegna(); };
  const conferma = () => {
    const nuovo = attivaCalendario(null, { inizio: a.inizio, fascia: a.fascia }, dati);
    if (!nuovo) { alert('Scegli una data valida.'); return; }
    ctx.ui.attivaCalendario = null;
    ctx.ui.calendario = null;
    ctx.azioni.cambiaCalendario(nuovo, { tab: 'calendario' });
  };
  return h('div', { class: 'attacco-sfondo', onclick: (e) => { if (e.target === e.currentTarget) chiudi(); } },
    h('section', { class: 'attacco-pannello', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Attiva il calendario' },
      h('header', { class: 'attacco-testa' }, h('h2', {}, 'Attiva il calendario'),
        h('button', { type: 'button', class: 'btn', onclick: chiudi }, 'Chiudi')),
      h('p', { class: 'nota' }, 'Il calendario tiene le note della campagna per giorno e fascia. Non cambia regole, valori né stampa. Si può spegnere dall’ingranaggio: le note restano.'),
      h('label', { class: 'cal-campo' }, 'Giorno d’inizio della campagna',
        h('input', { type: 'date', value: a.inizio, oninput: (e) => { a.inizio = e.target.value; } })),
      h('fieldset', {}, h('legend', {}, 'Fascia di partenza'),
        h('div', { class: 'scelta-pulsanti' }, fasce(dati).map((f) => h('button', {
          type: 'button', class: `btn scelta-btn${a.fascia === f.id ? ' scelta' : ''}`, 'aria-pressed': String(a.fascia === f.id),
          onclick: () => { a.fascia = f.id; ctx.azioni.ridisegna(); },
        }, f.nome)))),
      h('div', { class: 'scelta-pulsanti' }, h('button', { type: 'button', class: 'btn primario', onclick: conferma }, 'Attiva'))));
}
