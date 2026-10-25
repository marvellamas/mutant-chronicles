// Talenti v1.0 (lotto 2, 25/10/2026): il riquadro «Da scegliere» della scheda, per i personaggi con
// regimeTalenti = 2. Un posto alla volta, dal primo vuoto: livello, categoria, Classe, le opzioni ammesse con una riga
// d'effetto e le altre in grigio con il motivo. Il conto dei posti e il controllo delle scelte NON si fanno qui: vengono
// da postiTalenti (src/avanzamento.js), che app.js calcola e passa in `t.posti`. Qui si disegna e basta.
//
// Chi sceglie: il giocatore, solo fra le opzioni ammesse (il server lo ricontrolla: src/talenti-tablet.js); il
// Direttore da «Modifica master», che può anche forzare un'opzione non ammessa con una conferma (resta nel registro).
// Senza connessione, o con modifiche offline in attesa, il riquadro lo dice invece di accettare una scelta che si perde.
import { h } from './dom.js';
import { chiedi } from './finestrella.js';

const NOMI = {
  talento_libero: ['Talento Libero', 'Talenti Liberi'],
  maestria: ['Maestria', 'Maestrie'],
  specializzazione: ['Specializzazione', 'Specializzazioni'],
};
const ORDINE = ['talento_libero', 'maestria', 'specializzazione'];
const chiave = (x) => `${x.categoria}:${x.livello}`;
const nomeDi = (cat, n = 1) => NOMI[cat][n === 1 ? 0 : 1];

/** «1 Talento Libero, 2 Maestrie, 1 Specializzazione»: i posti vuoti per categoria. */
export function testoDaScegliere(categorie) {
  return ORDINE.filter((c) => categorie[c]?.mancanti > 0).map((c) => `${categorie[c].mancanti} ${nomeDi(c, categorie[c].mancanti)}`).join(', ');
}

/** La voce del catalogo (Talento o Specializzazione). */
function voce(id, dati) {
  return dati.talenti_liberi.talenti.find((t) => t.id === id) ?? dati.specializzazioni.specializzazioni.find((s) => s.id === id) ?? null;
}

/** Una riga d'effetto: la sintesi, o la prima frase della scheda (Specializzazioni: il bonus e l'ambito). */
export function rigaEffetto(id, dati) {
  const v = voce(id, dati);
  if (!v) return '';
  const prima = (t) => String(t ?? '').split(/\n/)[0].split(/(?<=\.)\s/)[0];
  if (v.categoria === 'specializzazione' || 'ambito' in v) {
    const e = v.effetto ?? {};
    const bonus = [e.va ? `+${e.va} VA` : null, e.danno ? `+${e.danno} danno` : null, e.pm ? `${e.pm} PM` : null].filter(Boolean).join(', ');
    return `${bonus}${bonus ? ' · ' : ''}${prima(v.ambito)}`;
  }
  const s = Array.isArray(v.sintesi) ? v.sintesi[0] : v.sintesi;
  const r = s ?? prima(v.testo);
  return r.length > 180 ? `${r.slice(0, 177)}…` : r;
}

const descriviScelta = (s, dati) => (s ? `${voce(s.id, dati)?.nome ?? s.id}${s.parametro ? ` (${s.parametro})` : ''}${s.annotazione ? ` — ${s.annotazione}` : ''}` : '—');

/**
 * Il riquadro. `t`: { posti (postiTalenti), dati, ui: { aperto, posto, filtro }, master (bool), bloccato (testo o null),
 * azioni: { scegli(posto, scelta, { forzata }), svuota(posto), chiudi(), riapri(), ridisegna() } }
 */
export function riquadroTalenti(t) {
  const P = t.posti;
  if (!P || P.regime !== 'nuovo') return null;
  const ui = t.ui;
  const mancanti = P.posti.filter((x) => !x.scelta);
  const daCambiare = P.posti.filter((x) => x.scelta && (!x.chiuso || t.master));
  // giocatore, tutto scelto e chiuso dal Direttore: niente riquadro
  if (!mancanti.length && !daCambiare.length && !t.master) return null;
  const testa = mancanti.length
    ? [h('p', {}, h('strong', {}, `Da scegliere: ${testoDaScegliere(P.categorie)}`)),
      h('p', { class: 'nota' }, 'La scheda è incompleta finché non scegli i Talenti: mancano ancora i loro bonus, per questo alcuni valori (anche i PV) possono essere più bassi. È normale.')]
    : [h('p', {}, h('strong', {}, 'Talenti: tutti scelti.'), P.posti.some((x) => x.chiuso) ? ' Il Direttore ha chiuso le scelte.' : ' Puoi ancora cambiarne una finché il Direttore non chiude.')];
  const azioniTesta = h('div', { class: 'riga-azioni' },
    t.bloccato ? null : h('button', { type: 'button', class: `btn${mancanti.length ? ' primario' : ''}`, 'aria-expanded': String(!!ui.aperto), onclick: () => { ui.aperto = !ui.aperto; t.azioni.ridisegna(); } },
      ui.aperto ? 'Chiudi' : mancanti.length ? 'Scegli' : 'Cambia una scelta'),
    t.master ? (P.posti.some((x) => x.chiuso)
      ? h('button', { type: 'button', class: 'btn', title: 'Il giocatore potrà di nuovo cambiare le scelte', onclick: t.azioni.riapri }, 'Riapri le scelte')
      : h('button', { type: 'button', class: 'btn', title: 'Da qui in poi le scelte fatte le cambia solo il Direttore', onclick: t.azioni.chiudi }, 'Chiudi le scelte')) : null);
  return h('section', { class: `riquadro ${mancanti.length ? 'attenzione' : 'ok'} riquadro-talenti`, 'aria-label': 'Talenti da scegliere' },
    ...testa,
    t.bloccato ? h('p', { class: 'nota motivo', role: 'status' }, t.bloccato) : null,
    azioniTesta,
    ui.aperto && !t.bloccato ? corpo(t, P) : null);
}

function corpo(t, P) {
  const ui = t.ui;
  const attivo = P.posti.find((x) => chiave(x) === ui.posto) ?? P.prossimo ?? P.posti[0];
  const elencoPosti = h('ol', { class: 'posti-talenti' }, P.posti.map((x) => h('li', {},
    h('button', {
      type: 'button', class: `posto-talento${x === attivo ? ' attuale' : ''}${x.scelta ? ' scelto' : ''}${x.scelta && !x.valida ? ' non-valido' : ''}`,
      'aria-current': x === attivo ? 'step' : null,
      onclick: () => { ui.posto = chiave(x); ui.filtro = ''; t.azioni.ridisegna(); },
    }, `${x.livello}° · ${nomeDi(x.categoria)}${x.scelta ? ` · ${descriviScelta(x.scelta, t.dati)}` : ' · da scegliere'}${x.chiuso ? ' 🔒' : ''}`))));
  return h('div', { class: 'scelta-talenti' }, elencoPosti, postoAttivo(t, attivo));
}

function postoAttivo(t, x) {
  const titolo = h('h3', {}, `${nomeDi(x.categoria)} del ${x.livello}° livello${x.classe ? ` · elenco del ${x.classe}` : ''}`);
  if (x.scelta) {
    const puo = !x.chiuso || t.master;
    return h('div', { class: 'posto-attivo' }, titolo,
      h('p', {}, h('strong', {}, descriviScelta(x.scelta, t.dati)), ' — ', rigaEffetto(x.scelta.id, t.dati)),
      !x.valida ? h('p', { class: 'nota motivo' }, `Non ammessa dalle regole: ${x.problemi.find((e) => e.tipo === 'violazione')?.problema ?? ''}${t.master ? '' : ' (l’ha forzata il Direttore)'}`) : null,
      puo ? h('button', { type: 'button', class: 'btn', onclick: () => t.azioni.svuota(x) }, 'Cambia questa scelta')
        : h('p', { class: 'nota' }, 'Il Direttore ha chiuso questa scelta: la cambia solo lui.'));
  }
  const ui = t.ui;
  const filtro = (ui.filtro ?? '').trim().toLowerCase();
  const opzioni = (x.opzioni ?? []).filter((o) => !filtro || o.nome.toLowerCase().includes(filtro));
  const ammesse = opzioni.filter((o) => o.ammesso);
  const altre = opzioni.filter((o) => !o.ammesso);
  const cerca = h('input', { type: 'search', placeholder: 'Cerca per nome', value: ui.filtro ?? '', 'aria-label': 'Cerca un Talento',
    oninput: (e) => { ui.filtro = e.target.value; t.azioni.ridisegna({ fuoco: 'cerca-talento' }); }, id: 'cerca-talento' });
  return h('div', { class: 'posto-attivo' }, titolo, cerca,
    h('ul', { class: 'opzioni-talento' }, ammesse.map((o) => opzione(t, x, o, true))),
    altre.length ? h('details', { class: 'opzioni-non-ammesse' },
      h('summary', {}, `${altre.length} non ${altre.length === 1 ? 'ammessa' : 'ammesse'} adesso${t.master ? ' (il Direttore può forzarle)' : ''}`),
      h('ul', { class: 'opzioni-talento' }, altre.map((o) => opzione(t, x, o, false)))) : null);
}

function opzione(t, posto, o, ammessa) {
  const def = voce(o.id, t.dati);
  // parametro (Caratteristica, Salvezza) e annotazione (la disciplina di Sport): si chiedono qui, prima di scegliere
  const valori = o.parametri?.length ? o.parametri
    : def?.parametro === 'caratteristica' ? t.dati.caratteristiche.caratteristiche.map((c) => c.sigla)
      : def?.parametro === 'salvezza' ? t.dati.caratteristiche.salvezze.map((s) => s.id) : null;
  const selPar = valori ? h('select', { 'aria-label': `${o.nome}: ${def?.parametro === 'salvezza' ? 'Salvezza' : 'Caratteristica'}` }, valori.map((v) => h('option', { value: v }, v))) : null;
  const annot = def?.annotazione ? h('input', { type: 'text', placeholder: def.annotazione, maxlength: 60, 'aria-label': `${o.nome}: ${def.annotazione}` }) : null;
  const scelta = () => ({ id: o.id, ...(selPar ? { parametro: selPar.value } : {}), ...(annot?.value.trim() ? { annotazione: annot.value.trim() } : {}) });
  const vai = async () => {
    if (annot && !annot.value.trim()) { annot.focus(); annot.reportValidity?.(); return; }
    if (ammessa) { t.azioni.scegli(posto, scelta()); return; }
    if (!t.master) return;
    const ok = await chiedi({
      titolo: `Forzare ${o.nome}?`,
      testo: `Le regole non la ammettono adesso: ${o.motivo}. L’app avvisa e non blocca: se la vuoi lo stesso, la scelta resta nel registro del master come forzata.`,
      si: 'Forza la scelta',
    });
    if (ok) t.azioni.scegli(posto, scelta(), { forzata: o.motivo });
  };
  return h('li', { class: `opzione-talento${ammessa ? '' : ' bloccato'}` },
    h('div', { class: 'opzione-testo' }, h('strong', {}, o.nome), h('small', { class: 'nota' }, ` ${rigaEffetto(o.id, t.dati)}`),
      ammessa ? null : h('small', { class: 'motivo' }, ` ${o.motivo}`)),
    h('div', { class: 'opzione-azioni' }, selPar, annot,
      ammessa ? h('button', { type: 'button', class: 'btn primario', onclick: vai }, 'Scegli')
        : t.master ? h('button', { type: 'button', class: 'btn', onclick: vai }, 'Forza…') : null));
}
