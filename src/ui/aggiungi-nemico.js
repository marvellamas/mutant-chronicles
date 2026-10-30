// «Aggiungi nemico» (segnalazione M4 di Davide dell'11/10/2026: la prima volta ci era riuscito, la seconda non aveva
// più capito come fare). Un solo pulsante, lo stesso dappertutto — bozza di scontro, scontro aperto, mappa di
// battaglia — apre questa finestra: un campo di ricerca e un elenco solo, con dentro
//   - i nemici prestabiliti del bestiario della campagna (i file di nemici/ sul server), pronti all'uso;
//   - le creature del Bestiario proposto (data/bestiario.json), da cui si ricava il nemico scegliendo il Grado.
// Sotto, sempre nello stesso punto: «Quanti», «Lato» e «Aggiungi». La finestra **resta aperta** dopo l'aggiunta, con
// la riga «aggiunto», così aggiungerne un altro (o lo stesso due volte di fila) è un clic. «Crea nemico…» apre la
// procedura guidata di sempre, per un tipo nuovo.
//
// Dove finisce il nemico lo decide chi apre la finestra (`destinazione.aggiungi`): nella bozza (scontri/<id>.json,
// stato bozza), nello scontro aperto (scontri/<id>.json) o in tutti e due per la mappa. Il bestiario di nemici/ non
// si tocca mai: il nemico aggiunto è una copia, e i ritocchi fatti dopo restano in quello scontro.
import { h } from './dom.js';
import { avviso, avvisoErrore } from './avvisi.js';
import { nascondiTooltip } from './tooltip.js';
import { apriCreaNemico, caricaUmano } from './crea-nemico.js';
import { profiloNemico, scelteCreatura, fileUmano } from '../crea-nemico.js';

const numero = (n) => (n >= 0 ? `+${n}` : String(n));
/** Testo su cui cerca il campo «Cerca» (nome, famiglia, descrizione, note). */
// A.201: anche gli alias (la forma di prima di un nome rinominato) e l'apostrofo diritto della tastiera per quello curvo
const cercabile = (x) => [x.nome, ...(x.alias ?? []), x.famiglia, x.descrizione, x.note, x.sottotitolo].filter(Boolean).join(' ').toLowerCase();
const senzaAccenti = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[‘’‛ʼ]/g, "'").toLowerCase();

/**
 * Le voci dell'elenco, dai nemici prestabiliti e dalle creature del Bestiario proposto, filtrate dalla ricerca.
 * Funzione pura (la provano i test): non tocca il DOM.
 * @param voci bestiario del server (src/nemici.js → vociBestiario): [{ id, file, nemico }]
 * @param BE data/bestiario.json
 * @param cerca testo cercato (anche vuoto)
 * @returns [{ chiave, tipo: 'prestabilito' | 'creatura', nome, sottotitolo, origine, nemico?, creatura?, gradi? }]
 */
export function vociAggiungiNemico(voci, BE, cerca = '') {
  const q = senzaAccenti(cerca.trim());
  const prestabiliti = (voci ?? []).filter((v) => v.nemico).map((v) => ({
    chiave: `prestabilito:${v.id}`,
    tipo: 'prestabilito',
    nome: v.nemico.nome,
    alias: v.nemico.alias ?? [],
    sottotitolo: `PV ${v.nemico.pv} · Iniziativa ${numero(v.nemico.iniziativa)}${v.nemico.ar?.totale ? ` · AR ${v.nemico.ar.totale}` : ''}`,
    origine: 'Bestiario della campagna (nemici/)',
    nemico: v.nemico,
    file: v.file,
  }));
  const creature = (BE?.creature ?? []).map((c) => ({
    chiave: `creatura:${c.id}`,
    tipo: 'creatura',
    nome: c.nome,
    sottotitolo: `${c.gradi.map((g) => BE.gradi.find((x) => x.id === g)?.nome ?? g).join(', ')}${c.boss ? ' · Boss' : ''}`,
    origine: `Bestiario proposto · ${BE.basi?.[c.base]?.nome ?? c.base}`,
    famiglia: c.famiglia,
    descrizione: c.descrizione,
    creatura: c,
    gradi: c.gradi,
  }));
  const tutte = [...prestabiliti, ...creature];
  if (!q) return tutte;
  return tutte.filter((x) => senzaAccenti(cercabile(x)).includes(q));
}

/**
 * Apre «Aggiungi nemico».
 * @param opzioni {
 *   voci: il bestiario del server (src/nemici.js → vociBestiario),
 *   livello: livello dei PG (per «Crea nemico…»),
 *   dove: una riga che dice dove finisce il nemico («nello scontro «Agguato»», «nella bozza …»),
 *   destinazione: { aggiungi: async (nemico, { quanti, lato, origine }) → bool },
 *   salvato: dopo «Salva nel bestiario» di «Crea nemico…»,
 *   ricarica: () => {} per rileggere il bestiario dopo «Crea nemico…» }
 */
export function apriAggiungiNemico(ctx, { voci = [], livello = 8, dove = '', destinazione, salvato = () => {}, ricarica = null } = {}) {
  const dati = ctx.dati;
  const BE = dati.bestiario;
  const st = { cerca: '', scelta: null, grado: null, boss: false, quanti: '1', lato: 'avversario', fatti: [], occupato: false };
  const finestra = h('dialog', { class: 'pannello-scheda aggiungi-nemico', 'aria-labelledby': 'aggiungi-nemico-titolo' });
  finestra.addEventListener('close', () => { nascondiTooltip(); finestra.remove(); });

  const elenco = () => vociAggiungiNemico(voci, BE, st.cerca);
  const sceltaDi = () => elenco().find((x) => x.chiave === st.scelta) ?? null;

  const scegli = (x) => {
    st.scelta = x.chiave;
    // la creatura del Bestiario proposto ha bisogno del Grado: si parte dal primo
    st.grado = x.tipo === 'creatura' ? (x.gradi?.includes(st.grado) ? st.grado : x.gradi?.[0] ?? null) : null;
    st.boss = false;
    disegna();
  };

  /** Il nemico da aggiungere: la copia del prestabilito, o il profilo calcolato dalla creatura e dal Grado. */
  const nemicoScelto = async (x) => {
    if (x.tipo === 'prestabilito') return structuredClone(x.nemico);
    const scelte = scelteCreatura(x.creatura.id, st.grado, { boss: st.boss }, dati);
    const umani = {};
    if (BE.basi[scelte.base]?.umano) {
      const id = fileUmano(scelte.tipoUmano, scelte.grado);
      const u = id ? await caricaUmano(id) : null;
      if (u) umani[id] = u;
    }
    const r = profiloNemico(scelte, dati, { umani });
    if (!r.nemico) { avvisoErrore(r.errori.join(' ')); return null; }
    return r.nemico;
  };

  const aggiungi = async () => {
    const x = sceltaDi();
    if (!x || st.occupato) return;
    const q = Number(st.quanti);
    if (!Number.isInteger(q) || q < 1 || q > 30) { avvisoErrore('«Quanti»: da 1 a 30.'); return; }
    st.occupato = true;
    disegna();
    try {
      const n = await nemicoScelto(x);
      if (!n) return;
      const ok = await destinazione.aggiungi(n, { quanti: q, lato: st.lato, origine: x.tipo === 'prestabilito' ? 'bestiario' : 'creatura' });
      if (ok === false) return;
      // la finestra resta aperta: aggiungerne un altro (o lo stesso di nuovo) è un clic
      st.fatti = [...st.fatti, `${n.nome} ×${q}${st.lato === 'alleato' ? ' (alleato)' : ''}`];
      avviso(`${n.nome} ×${q}${dove ? ` ${dove}` : ''}.`);
    } finally {
      st.occupato = false;
      disegna();
    }
  };

  const riga = (x) => {
    const scelto = x.chiave === st.scelta;
    return h('li', {},
      h('button', {
        type: 'button',
        class: `voce-nemico${scelto ? ' scelta' : ''}`,
        'aria-pressed': String(scelto),
        onclick: () => scegli(x),
        ondblclick: () => { scegli(x); aggiungi(); },
      },
      h('span', { class: 'voce-nemico-nome' }, x.nome),
      h('span', { class: 'voce-nemico-dati' }, x.sottotitolo),
      h('span', { class: 'nota voce-nemico-origine' }, x.origine)),
      // il Grado si sceglie qui, sulla voce scelta: resta tutto in un posto
      scelto && x.tipo === 'creatura' ? h('div', { class: 'voce-nemico-grado' },
        h('label', {}, 'Grado ', h('select', { onchange: (e) => { st.grado = e.target.value; } },
          (x.gradi ?? []).map((g) => h('option', { value: g, selected: g === st.grado }, BE.gradi.find((y) => y.id === g)?.nome ?? g)))),
        x.creatura.boss ? h('label', {}, h('input', { type: 'checkbox', checked: st.boss, onchange: (e) => { st.boss = e.target.checked; } }), ` Boss (${BE.gradi.find((y) => y.id === x.creatura.boss.grado)?.nome})`) : null) : null);
  };

  // I controlli si costruiscono una volta sola e restano: scrivendo nella ricerca si ridisegna solo l'elenco, così il
  // fuoco e il punto del cursore non saltano a ogni lettera (e «Quanti» non si svuota mentre lo si scrive).
  const campoCerca = h('input', {
    type: 'search', value: '', placeholder: 'nome, famiglia, descrizione…',
    oninput: (e) => { st.cerca = e.target.value; disegna(); },
    onkeydown: (e) => { if (e.key === 'Enter' && st.scelta) { e.preventDefault(); aggiungi(); } },
  });
  const campoQuanti = h('input', { type: 'number', min: 1, max: 30, step: 1, class: 'input-d10', value: st.quanti, oninput: (e) => { st.quanti = e.target.value; } });
  const campoLato = h('select', { 'aria-label': 'Lato del nemico', onchange: (e) => { st.lato = e.target.value; } },
    ['avversario', 'alleato'].map((v) => h('option', { value: v }, v)));
  const elencoUi = h('ul', { class: 'elenco-nemici', 'aria-label': 'Nemici da aggiungere' });
  const vuotoUi = h('p', { class: 'vuoto', hidden: true });
  const sceltoUi = h('span', { class: 'nota scelto-nemico' });
  const fattiUi = h('p', { class: 'riquadro ok', role: 'status', hidden: true });
  const btnAggiungi = h('button', { type: 'button', class: 'btn primario', onclick: () => aggiungi() }, 'Aggiungi');

  const disegna = () => {
    const lista = elenco();
    const x = sceltaDi();
    elencoUi.replaceChildren(...lista.map(riga));
    elencoUi.hidden = !lista.length;
    vuotoUi.hidden = !!lista.length;
    vuotoUi.textContent = `Nessun nemico trovato per «${st.cerca}». Prova con un'altra parola, o «Crea nemico…».`;
    sceltoUi.textContent = x
      ? `Scelto: ${x.nome}${x.tipo === 'creatura' ? ` (${BE.gradi.find((y) => y.id === st.grado)?.nome ?? ''})` : ''}`
      : 'Scegli un nemico dall’elenco';
    btnAggiungi.disabled = !x || st.occupato;
    btnAggiungi.textContent = st.occupato ? 'Aggiungo…' : 'Aggiungi';
    fattiUi.hidden = !st.fatti.length;
    fattiUi.textContent = `Aggiunti${dove ? ` ${dove}` : ''}: ${st.fatti.join(', ')}.`;
  };

  finestra.append(h('div', { class: 'pannello-contenuto' },
    h('header', { class: 'pannello-testa' },
      h('h2', { id: 'aggiungi-nemico-titolo' }, 'Aggiungi nemico', dove ? h('small', { class: 'nota' }, ` · ${dove}`) : null),
      h('button', { type: 'button', class: 'btn tondo chiudi', 'aria-label': 'Chiudi', onclick: () => finestra.close() }, '×')),
    h('p', { class: 'nota' }, 'I nemici già pronti del bestiario della campagna e le creature del Bestiario proposto, in un elenco solo. Scegline uno e premi «Aggiungi»; la finestra resta aperta per il prossimo.'),
    h('label', { class: 'cerca-nemico' }, h('span', {}, 'Cerca'), campoCerca),
    elencoUi,
    vuotoUi,
    h('div', { class: 'riga-azioni aggiungi-nemico-azioni' },
      sceltoUi,
      h('label', {}, 'Quanti ', campoQuanti),
      h('label', {}, 'Lato ', campoLato),
      btnAggiungi),
    fattiUi,
    h('div', { class: 'riga-azioni' },
      h('button', { type: 'button', class: 'btn', title: 'Un tipo nuovo: procedura guidata o tutto a caso, dal Bestiario proposto', onclick: () => { finestra.close(); apriCreaNemico(ctx, { voci, livello, salvato: (n) => { salvato(n); ricarica?.(); }, destinazione: { etichetta: 'Aggiungi', aggiungi: destinazione.aggiungi } }); } }, 'Crea nemico…'),
      h('button', { type: 'button', class: 'btn', onclick: () => finestra.close() }, 'Chiudi'))));

  disegna();
  document.body.append(finestra);
  finestra.showModal();
  campoCerca.focus();
  return finestra;
}
