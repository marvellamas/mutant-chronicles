// Tab «PX della partita» del Tavolo del Master (A.161, approvata il 16/10/2026). Solo sul PC del master.
//
// L'app NON assegna mai PX da sola: il calcolatore propone, il Direttore vede per ogni giocatore le componenti
// e il totale finale modificabile, e SOLO «Assegna PX della partita» aggiorna i PG (una Modifica master
// «diretta» su scelte.puntiEsperienza, registrata come «PX della partita del …»). Salvare la bozza o
// ricalcolare non assegna. Correggere una partita sostituisce l'importo precedente, non ne aggiunge un altro.
//
// Il motore puro è in src/px-partita.js, i fattori in data/px_partita.json, l'archivio in px/px.json
// (server.mjs → /api/px, solo master). Qui: lettura/scrittura, costruttori delle partite, la patch del PG e il
// pannello. Niente automazioni al tavolo: si usa a fine partita.
import { h } from './dom.js';
import { avviso, avvisoErrore } from './avvisi.js';
import { chiedi } from './finestrella.js';
import { registraDiretta } from '../correzioni-master.js';
import {
  calcolaPartita, deltaAssegnazione, partitaAssegnata, riepilogo, csvRiepilogo, componentiGiocatore, presentiNella,
} from '../px-partita.js';

const errore = async (r) => Object.assign(new Error((await r.json().catch(() => ({}))).errore ?? `errore ${r.status}`), { stato: r.status });

/** L'archivio «PX della partita» dal server (px/px.json), o null se non c'è ancora. */
export async function leggiPx() {
  const r = await fetch('api/px', { cache: 'no-store' });
  if (!r.ok) throw await errore(r);
  return r.json();
}

/** Salva l'intero archivio «PX della partita». */
export async function salvaPx(db) {
  const r = await fetch('api/px', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(db) });
  if (!r.ok) throw await errore(r);
  return r.json();
}

/** Archivio di partenza, con le impostazioni di campagna di default dai dati. */
export function dbIniziale(dati) {
  const p = dati.px_partita;
  return {
    versione: 1,
    impostazioni: { baseline: p.campagna.baseline_px_default, atto: p.campagna.atto_default },
    giocatori: [], // { id, pg (file o identificativo), giocatore (nome del giocatore) }
    partite: [],
  };
}

const oggi = () => new Date().toISOString().slice(0, 10);
const idPartita = () => `partita-${Date.now().toString(36)}`;

/** Una partita vuota con tutti i giocatori presenti e i voti al minimo. */
export function nuovaPartita(dati, giocatori) {
  const p = dati.px_partita;
  const partecipanti = {};
  for (const g of giocatori ?? []) partecipanti[g.id] = { presente: true, partecipazione: p.voti.min, interpretazione: p.voti.min, contributo: p.voti.min, eccezionale: 0 };
  return {
    id: idPartita(), data: oggi(), titolo: 'Nuova partita', durata: 1, atto: p.campagna.atto_default,
    premioAtto: false, note: '', partecipanti, incontri: [], finali: {}, statoAssegnazione: 'bozza',
  };
}

/** Un incontro vuoto. */
export function nuovoIncontro() {
  return { id: `incontro-${Date.now().toString(36)}`, nome: 'Incontro', esito: 'Superato', nemici: [] };
}

/** I nemici di uno scontro della serata come voci d'incontro: nome, px (GS/PX della scheda) e quantità. */
export function nemiciDaScontro(scontro) {
  const nemici = (scontro?.nemici ?? []).map((n, i) => ({
    nome: n.nome ?? n.id ?? `Nemico ${i + 1}`,
    px: Number.isFinite(Number(n.gs_px?.px)) ? Number(n.gs_px.px) : undefined,
    titolo: n.gs_px?.gs,
    qty: Math.max(1, Number(n.quanti) || 1),
    principale: false,
  }));
  if (nemici.length && !nemici.some((x) => x.principale)) {
    // il principale proposto è quello di PX più alto (il master può cambiarlo)
    let best = 0;
    nemici.forEach((x, i) => { if ((x.px ?? 0) > (nemici[best].px ?? 0)) best = i; });
    nemici[best].principale = true;
  }
  return nemici;
}

/**
 * Applica a un file di PG (oggetto esportato) l'assegnazione di `delta` PX come Modifica master «diretta» su
 * scelte.puntiEsperienza, con etichetta e motivo «PX della partita del …». Pura: ritorna il nuovo file.
 */
export function patchPgAssegnazione(pgFile, delta, etichetta, adesso = new Date()) {
  const scelte = pgFile.scelte ?? {};
  const prima = Number.isFinite(Number(scelte.puntiEsperienza)) ? Number(scelte.puntiEsperienza) : 0;
  const dopo = prima + Number(delta);
  // finestraMs 0: non fondere con altre modifiche di puntiEsperienza, resta una riga datata a sé
  const correzioni = registraDiretta(pgFile.correzioni_master, { chiave: 'puntiEsperienza', etichetta, prima, dopo }, { motivo: etichetta, adesso, finestraMs: 0 });
  return { ...pgFile, scelte: { ...scelte, puntiEsperienza: dopo }, correzioni_master: correzioni };
}

// ---- pannello ----

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('it-IT');
const media = (n) => (n === null || n === undefined ? '—' : n.toFixed(2).replace('.', ','));

/**
 * Il pannello della tab. `st`: { db, dati, uiPx:{ selezione, vista }, pxGiocatori:{id:px}, scontri:[{id,nemici}] }.
 * `az`: { salva(), ridisegna(), assegna(partita) } — assegna applica i delta ai PG (Modifica master).
 */
export function pannelloPx(ctx, st, az) {
  const p = st.dati.px_partita;
  const db = st.db;
  const vista = st.uiPx.vista ?? 'partita';
  const salva = () => { az.salva(); az.ridisegna(); };
  const partitaSel = db.partite.find((m) => m.id === st.uiPx.selezione) ?? null;

  const nav = h('div', { class: 'px-nav' },
    ...[['partita', 'Partita'], ['archivio', 'Archivio'], ['riepilogo', 'Riepilogo'], ['impostazioni', 'Impostazioni']].map(([k, et]) => h('button', {
      class: `btn small${vista === k ? ' attivo' : ''}`,
      onclick: () => { st.uiPx.vista = k; az.ridisegna(); },
    }, et)));

  let corpo;
  if (vista === 'impostazioni') corpo = vistaImpostazioni(st, az, salva);
  else if (vista === 'archivio') corpo = vistaArchivio(st, az);
  else if (vista === 'riepilogo') corpo = vistaRiepilogo(st);
  else corpo = vistaPartita(ctx, st, az, salva, partitaSel);

  return h('section', { class: 'px-pannello pannello' },
    h('h3', {}, 'PX della partita'),
    h('p', { class: 'nota' }, 'A fine partita: il calcolatore propone, tu correggi il totale finale, poi «Assegna PX della partita». I PX veri stanno sui PG. (A.161; fattori in data/px_partita.json.)'),
    nav, corpo);
}

function vistaPartita(ctx, st, az, salva, partita) {
  const db = st.db;
  const elenco = h('div', { class: 'px-scelta-partita' },
    h('label', {}, 'Partita ',
      h('select', { onchange: (e) => { st.uiPx.selezione = e.target.value || null; az.ridisegna(); } },
        h('option', { value: '' }, '— scegli o crea —'),
        ...db.partite.map((m) => h('option', { value: m.id, selected: m.id === st.uiPx.selezione }, `${m.data || 's.d.'} · ${m.titolo}${m.statoAssegnazione === 'assegnata' ? ' ✓' : ''}`)))),
    h('button', { class: 'btn small', onclick: () => {
      const m = nuovaPartita(st.dati, db.giocatori);
      db.partite.unshift(m); st.uiPx.selezione = m.id; salva();
    } }, '+ Nuova partita'));

  if (!partita) return h('div', {}, elenco, h('p', { class: 'vuoto' }, db.giocatori.length ? 'Scegli una partita o creane una nuova.' : 'Prima aggiungi i giocatori in «Impostazioni».'));

  const campo = (et, valore, onInput, tipo = 'text') => h('label', { class: 'px-campo' }, h('span', {}, et),
    h('input', { type: tipo, value: valore ?? '', oninput: (e) => onInput(tipo === 'number' ? Number(e.target.value) : e.target.value) }));

  const intest = h('div', { class: 'px-intest' },
    campo('Data', partita.data, (v) => { partita.data = v; az.salva(); }, 'date'),
    campo('Titolo', partita.titolo, (v) => { partita.titolo = v; az.salva(); }),
    h('label', { class: 'px-campo' }, h('span', {}, 'Durata'),
      h('select', { onchange: (e) => { partita.durata = Number(e.target.value); salva(); } },
        ...p(st).durata.opzioni.map((o) => h('option', { value: o.valore, selected: partita.durata === o.valore }, `${o.nome} ×${o.moltiplicatore_voti}`)))),
    h('label', { class: 'px-campo' }, h('span', {}, 'Atto'),
      h('select', { onchange: (e) => { partita.atto = e.target.value; salva(); } },
        ...p(st).atti.map((a) => h('option', { value: a.nome, selected: partita.atto === a.nome }, `Atto ${a.nome}`)))),
    h('label', { class: 'px-campo px-check' }, h('input', { type: 'checkbox', checked: !!partita.premioAtto, onchange: (e) => { partita.premioAtto = e.target.checked; salva(); } }),
      h('span', {}, `Premio di fine Atto (${fmt(premioDi(st, partita.atto))})`)));

  const calc = calcolaPartita(partita, st.pxGiocatori, p(st));
  const nPresenti = presentiNella(partita);

  const righeGiocatori = (db.giocatori ?? []).map((g) => {
    const part = partita.partecipanti[g.id] ?? (partita.partecipanti[g.id] = { presente: false, partecipazione: p(st).voti.min, interpretazione: p(st).voti.min, contributo: p(st).voti.min, eccezionale: 0 });
    const c = calc.perGiocatore[g.id] ?? componentiGiocatore(partita, g.id, st.pxGiocatori?.[g.id] ?? 0, p(st));
    const voto = (chiave) => h('input', { type: 'number', min: p(st).voti.min, max: p(st).voti.max, value: part[chiave], class: 'px-voto',
      oninput: (e) => { part[chiave] = Number(e.target.value); az.salva(); az.ridisegna(); } });
    const finaleVal = partita.finali?.[g.id];
    return h('tr', { class: part.presente ? '' : 'px-assente' },
      h('td', {}, h('label', { class: 'px-check' }, h('input', { type: 'checkbox', checked: !!part.presente, onchange: (e) => { part.presente = e.target.checked; az.salva(); az.ridisegna(); } }), h('span', {}, g.pg || g.id))),
      h('td', {}, part.presente ? voto('partecipazione') : '—'),
      h('td', {}, part.presente ? voto('interpretazione') : '—'),
      h('td', {}, part.presente ? voto('contributo') : '—'),
      h('td', {}, part.presente ? h('input', { type: 'number', value: part.eccezionale, class: 'px-voto', oninput: (e) => { part.eccezionale = Number(e.target.value); az.salva(); az.ridisegna(); } }) : '—'),
      h('td', { class: 'px-comp', title: `voti ${fmt(c.pxVoti)} · bonus ${fmt(c.pxBonus)} · incontri ${fmt(c.pxIncontri)} · premio ${fmt(c.premio)}` }, fmt(c.totaleSuggerito)),
      h('td', {}, part.presente ? h('input', { type: 'number', class: 'px-finale', value: Number.isFinite(Number(finaleVal)) ? finaleVal : c.totaleSuggerito,
        oninput: (e) => { partita.finali = { ...partita.finali, [g.id]: Number(e.target.value) }; az.salva(); } }) : '—'));
  });

  const tabella = h('table', { class: 'px-tabella' },
    h('thead', {}, h('tr', {}, h('th', {}, `Giocatore (${nPresenti} present${nPresenti === 1 ? 'e' : 'i'})`),
      h('th', {}, 'Part.'), h('th', {}, 'Interp.'), h('th', {}, 'Contr.'), h('th', {}, 'Bonus'), h('th', {}, 'Suggerito'), h('th', {}, 'Finale'))),
    h('tbody', {}, ...righeGiocatori));

  const assegna = h('button', { class: 'btn', onclick: async () => {
    const delta = deltaAssegnazione(partita, st.pxGiocatori, p(st));
    const nomi = Object.keys(delta);
    if (!nomi.length) { avviso('Niente da assegnare: i totali sono già quelli assegnati.', { tipo: 'info' }); return; }
    const testo = nomi.map((id) => `${(db.giocatori.find((g) => g.id === id)?.pg) || id}: ${delta[id] > 0 ? '+' : ''}${fmt(delta[id])}`).join('\n');
    if (!await chiedi({ titolo: `Assegni i PX di «${partita.titolo}»?`, testo: `${testo}\n\nAggiorna i PG presenti (Modifica master).`, si: 'Assegna' })) return;
    try { await az.assegna(partita); } catch (e) { avvisoErrore(e.message ?? String(e)); }
  } }, partita.statoAssegnazione === 'assegnata' ? 'Ri-assegna (correzione)' : 'Assegna PX della partita');

  return h('div', { class: 'px-partita' }, elenco, intest, incontriPartita(st, az, partita), tabella,
    h('div', { class: 'px-azioni' }, assegna,
      partita.statoAssegnazione === 'assegnata' ? h('span', { class: 'px-stato' }, `Assegnata il ${partita.assegnataIl || '—'}`) : h('span', { class: 'nota' }, 'Bozza: i PX non sono ancora assegnati.')));
}

function incontriPartita(st, az, partita) {
  const righe = (partita.incontri ?? []).map((inc, i) => h('div', { class: 'px-incontro' },
    h('input', { value: inc.nome, oninput: (e) => { inc.nome = e.target.value; az.salva(); } }),
    h('span', { class: 'nota' }, (inc.nemici ?? []).map((n) => `${n.nome}${n.principale ? ' ★' : ''} ×${n.qty} (${fmt(n.px ?? 0)})`).join(', ') || 'nessun nemico'),
    h('button', { class: 'icon-btn', title: 'Togli l’incontro', onclick: () => { partita.incontri.splice(i, 1); az.salva(); az.ridisegna(); } }, '✕')));
  const scontri = st.scontri ?? [];
  return h('div', { class: 'px-incontri' },
    h('h4', {}, 'Incontri superati'),
    ...righe,
    h('div', { class: 'px-incontri-azioni' },
      h('button', { class: 'btn small', onclick: () => { partita.incontri.push(nuovoIncontro()); az.salva(); az.ridisegna(); } }, '+ Incontro a mano'),
      ...scontri.map((s) => h('button', { class: 'btn small ghost', title: 'Importa i nemici di questo scontro', onclick: () => {
        const inc = nuovoIncontro(); inc.nome = s.nome || s.id; inc.nemici = nemiciDaScontro(s); partita.incontri.push(inc); az.salva(); az.ridisegna();
      } }, `↓ ${s.nome || s.id}`))));
}

function vistaArchivio(st, az) {
  const db = st.db;
  const assegnate = db.partite.filter((m) => m.statoAssegnazione === 'assegnata');
  if (!assegnate.length) return h('p', { class: 'vuoto' }, 'Nessuna partita assegnata.');
  return h('div', { class: 'px-archivio' }, ...assegnate.map((m) => h('div', { class: 'px-archivio-riga' },
    h('span', {}, `${m.data || 's.d.'} · ${m.titolo}`),
    h('span', { class: 'nota' }, Object.entries(m.assegnato ?? {}).map(([id, v]) => `${(db.giocatori.find((g) => g.id === id)?.pg) || id}: ${fmt(v)}`).join(', ')),
    h('button', { class: 'btn small', onclick: () => { st.uiPx.selezione = m.id; st.uiPx.vista = 'partita'; az.ridisegna(); } }, 'Modifica'))));
}

function vistaRiepilogo(st) {
  const righe = riepilogo(st.db.partite, st.db.giocatori, st.db.impostazioni, p(st));
  if (!righe.length) return h('p', { class: 'vuoto' }, 'Nessun giocatore.');
  const csv = () => {
    const blob = new Blob([csvRiepilogo(righe, p(st))], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'px-riepilogo.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return h('div', { class: 'px-riepilogo' },
    h('table', { class: 'px-tabella' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Personaggio'), h('th', {}, 'Giocatore'), h('th', {}, 'PX'), h('th', {}, 'Livello'), h('th', {}, 'Al prossimo'), h('th', {}, 'Partite'), h('th', {}, 'Medie P/I/C'))),
      h('tbody', {}, ...righe.map((r) => h('tr', {},
        h('td', {}, r.pg), h('td', {}, r.giocatore || '—'), h('td', {}, `${fmt(r.px)}`), h('td', {}, `${r.livello} (${r.titolo})`),
        h('td', {}, typeof r.mancanti === 'number' ? fmt(r.mancanti) : r.mancanti), h('td', {}, `${r.partite}`),
        h('td', {}, `${media(r.mediaPartecipazione)} / ${media(r.mediaInterpretazione)} / ${media(r.mediaContributo)}`))))),
    h('button', { class: 'btn small ghost', onclick: csv }, '↓ Esporta riepilogo CSV'));
}

function vistaImpostazioni(st, az, salva) {
  const db = st.db;
  const imp = db.impostazioni;
  const schede = st.schede ?? []; // { file, nome, pg }
  const righeGioc = (db.giocatori ?? []).map((g, i) => h('div', { class: 'px-gioc-riga' },
    h('input', { value: g.giocatore ?? '', placeholder: 'Giocatore', oninput: (e) => { g.giocatore = e.target.value; az.salva(); } }),
    h('select', { title: 'Personaggio (i PX stanno sul PG)', onchange: (e) => { g.pgFile = e.target.value || null; g.pg = schede.find((s) => s.file === e.target.value)?.nome || g.pg; az.salva(); } },
      h('option', { value: '' }, '— PG —'),
      ...schede.map((s) => h('option', { value: s.file, selected: g.pgFile === s.file }, `${s.nome} (liv ${s.livello})`))),
    h('button', { class: 'icon-btn', title: 'Togli il giocatore', onclick: () => { db.giocatori.splice(i, 1); salva(); } }, '✕')));
  return h('div', { class: 'px-impostazioni' },
    h('label', { class: 'px-campo' }, h('span', {}, 'Atto corrente'),
      h('select', { onchange: (e) => { imp.atto = e.target.value; salva(); } }, ...p(st).atti.map((a) => h('option', { value: a.nome, selected: imp.atto === a.nome }, `Atto ${a.nome} (fino al livello ${a.limite_livello})`)))),
    h('label', { class: 'px-campo' }, h('span', {}, 'PX iniziali comuni'),
      h('input', { type: 'number', value: imp.baseline, oninput: (e) => { imp.baseline = Number(e.target.value); az.salva(); } })),
    h('h4', {}, 'Giocatori e personaggi'),
    h('p', { class: 'nota' }, 'I PX stanno sul PG: cambiare il nome del giocatore non sposta i punti.'),
    ...righeGioc,
    h('button', { class: 'btn small', onclick: () => { db.giocatori.push({ id: `g-${Date.now().toString(36)}`, giocatore: '', pg: '', pgFile: null }); salva(); } }, '+ Giocatore'));
}

const p = (st) => st.dati.px_partita;
const premioDi = (st, atto) => p(st).atti.find((a) => a.nome === atto)?.premio ?? 0;
