// Tavolo del Master, pezzi 2 e 3 (docs/tavolo-direttore.md): riquadro dello scontro nella plancia. Ordine
// d'Iniziativa con il dado dal vivo o dell'app, turni e Round, nemici dal bestiario (copie numerate),
// partecipanti scritti a mano (provvisori), durate degli Stati, registro. Le regole stanno in src/scontro.js; qui la
// presentazione e il salvataggio sul server con la revisione (server.mjs → /api/scontri).
import { h } from './dom.js';
import { infoValore } from './tooltip.js';
import { tira, tiroManuale } from '../tiri.js';
import {
  nuovoScontro, aggiungiPartecipante, attaccoManuale, togliPartecipante, registraTiro, ordineIniziativa, spostaAlleato,
  diTurno, registraDurata, avanti, chiudi, dadoIniziativa, durataStato, aggiungiNemici,
} from '../scontro.js';

const numero = (n) => (n < 0 ? `−${-n}` : String(n));
/** Tiro dal vivo: il valore scritto, controllato sull'intervallo del dado (src/tiri.js). */
const dalVivo = (valore, spec) => { const r = tiroManuale(valore, spec); if (r.errore) throw new Error(r.errore); return r.tiro; };

/** Scontro aperto più recente sul server, o null. */
export async function leggiScontroAperto() {
  const r = await fetch('api/scontri', { cache: 'no-store' });
  if (!r.ok) throw new Error(`scontri non leggibili (${r.status})`);
  const aperto = (await r.json()).find((s) => s.stato === 'aperto');
  if (!aperto) return null;
  return { id: aperto.id, revisione: aperto.revisione };
}

export async function leggiScontro(id) {
  const r = await fetch(`api/scontri/${encodeURIComponent(id)}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`scontro non leggibile (${r.status})`);
  return r.json();
}

/** Salva: { scontro } se riesce, { conflitto: scontro attuale } se un'altra finestra l'ha cambiato. */
export async function salvaScontro(s) {
  const r = await fetch(`api/scontri/${encodeURIComponent(s.id)}`, { method: 'PUT', body: JSON.stringify(s), headers: { 'Content-Type': 'application/json' } });
  const j = await r.json().catch(() => ({}));
  if (r.status === 409) return { conflitto: j.attuale ?? null };
  if (!r.ok) throw new Error(j.errore ?? `errore ${r.status}`);
  return { scontro: j };
}

export const idNuovo = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `scontro-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

/**
 * Riquadro dello scontro.
 * @param ctx { dati }
 * @param st stato della plancia: { scontro, viste (file → vista), pgAlTavolo: [vista], avvisoScontro, registroAperto, bozza,
 *   bestiario: voci di src/nemici.js → vociBestiario, bozzaNemici }
 * @param modifica (fn: scontro → scontro) salva il nuovo stato con la revisione
 * @param crea (scontro) salva uno scontro nuovo
 */
export function pannelloScontro(ctx, st, { modifica, crea, ridisegna, annullaColpo = null, attacca = null }) {
  const s = st.scontro;
  const dado = dadoIniziativa(ctx.dati);
  if (!s) {
    return h('section', { class: 'riquadro scontro-pannello' },
      h('h2', {}, 'Scontro'),
      h('p', { class: 'nota' }, `Nessuno scontro aperto. «Nuovo scontro» parte con i PG al tavolo; l’Iniziativa di ciascuno è quella della scheda più ${dado.formula}, tirato dal vivo o dall’app (Giocatore §2.14, §5.1).`),
      h('button', {
        type: 'button', class: 'btn primario', disabled: !st.pgAlTavolo.length, title: st.pgAlTavolo.length ? null : 'Prima scegli chi è al tavolo',
        onclick: () => crea(nuovoScontro({ id: idNuovo(), pg: st.pgAlTavolo.map(pgDaVista) })),
      }, 'Nuovo scontro'));
  }
  const { ordinati, daTirare, spareggi, scelteAlleati } = ordineIniziativa(s);
  const diT = diTurno(s);
  const vistaDi = (p) => (p.tipo === 'pg' ? st.pgAlTavolo.find((v) => v.chiaveCartella === p.chiave) ?? null : null);
  const tiroDalVivo = (p, campo) => {
    const input = h('input', { type: 'number', min: dado.minimo, max: dado.massimo, step: 1, inputmode: 'numeric', class: 'input-d10', 'aria-label': `${campo === 'd10' ? 'Tiro d’Iniziativa' : 'Spareggio'} di ${p.nome}, dal vivo` });
    return h('span', { class: 'tiro-scontro' },
      input,
      h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => {
        const v = Number(input.value);
        modifica((x) => registraTiro(x, p.id, campo, dalVivo(v, dado), ctx.dati));
      } }, 'Inserisci'),
      h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => modifica((x) => registraTiro(x, p.id, campo, tira(dado).tiro, ctx.dati)) }, `Tira ${dado.formula}`));
  };
  const baseConProvenienza = (p) => {
    const v = vistaDi(p);
    return v?.iniziativa?.provenienza
      ? infoValore(h('span', {}, numero(p.base)), { titolo: `Iniziativa di ${p.nome}: ${numero(p.base)}`, sottotitolo: 'Valore della scheda al momento dello scontro (§2.14)', provenienza: v.iniziativa.provenienza })
      : h('span', {}, numero(p.base));
  };
  const origine = (t) => (t.origine === 'app' ? 'app' : 'dal vivo');
  const riga = (p, i) => {
    const inSpareggio = spareggi.some((g) => g.includes(p.id));
    const gruppoAlleati = scelteAlleati.find((g) => g.includes(p.id));
    // un nemico a 0 PV resta nella tabella, in grigio, al suo posto: saltarlo o no lo decide il master
    return h('tr', { class: `${diT?.id === p.id ? 'di-turno' : ''}${p.provvisorio ? ' provvisorio' : ''}${p.tipo === 'nemico' && p.pv.attuali === 0 ? ' a-zero' : ''}`.trim(), 'aria-current': diT?.id === p.id ? 'true' : null },
      h('td', { class: 'pos-scontro' }, diT?.id === p.id ? '▶' : String(i + 1)),
      h('th', { scope: 'row', class: p.tipo === 'nemico' ? `lato-${p.lato}` : null }, p.nome, p.provvisorio ? h('span', { class: 'etichetta' }, 'provvisorio') : null,
        p.lato === 'avversario' || p.tipo === 'nemico' ? h('small', { class: 'nota nome-lato' }, ` ${p.lato}`) : null,
        p.tipo === 'nemico' ? h('small', { class: 'nota' }, ` · PV ${p.pv.attuali}/${p.pv.massimo}`) : null),
      h('td', {}, baseConProvenienza(p), ` + ${p.d10.valore}`, h('small', { class: 'nota' }, ` (${origine(p.d10)})`)),
      h('td', { class: 'totale-scontro' }, h('strong', {}, numero(p.base + p.d10.valore))),
      h('td', { class: 'parita-scontro' },
        inSpareggio ? [h('small', { class: 'motivo' }, p.spareggio ? `spareggio ${p.spareggio.valore}: alla pari, ritira ` : 'Parità con un avversario: spareggio '), tiroDalVivo(p, 'spareggio')]
          : p.spareggio ? h('small', { class: 'nota' }, `spareggio ${p.spareggio.valore}`) : null,
        gruppoAlleati ? h('span', { class: 'sposta-alleato', title: 'Parità fra alleati: scelgono loro l’ordine (§5.1)' },
          h('button', { type: 'button', class: 'btn btn-piccolo', 'aria-label': `${p.nome} prima`, onclick: () => modifica((x) => spostaAlleato(x, p.id, -1)) }, '↑'),
          h('button', { type: 'button', class: 'btn btn-piccolo', 'aria-label': `${p.nome} dopo`, onclick: () => modifica((x) => spostaAlleato(x, p.id, 1)) }, '↓')) : null),
      h('td', { class: 'azioni-scontro' },
        // pezzo 5: un partecipante a mano con un attacco scritto può attaccare (i nemici dalla loro carta)
        attacca && p.tipo === 'manuale' && p.attacco ? h('button', { type: 'button', class: 'btn btn-piccolo btn-attacca', title: `${p.attacco.nome}: VA ${p.attacco.va}, ${p.attacco.danno} ${p.attacco.natura}`, onclick: () => attacca(p) }, 'Attacca') : null,
        p.tipo === 'manuale' || p.tipo === 'nemico' ? h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => modifica((x) => togliPartecipante(x, p.id)) }, 'Togli') : null));
  };

  // durate degli Stati di PG e nemici (dati: «1+1d3 Round»), registrate nello scontro e scalate a fine Round
  const idStati = (p) => (p.tipo === 'pg' ? (vistaDi(p)?.stati ?? []).map((x) => x.id) : p.tipo === 'nemico' ? p.stati : []);
  const statiPg = s.partecipanti.flatMap((p) => idStati(p).map((id) => ({ p, stato: ctx.dati.regole.stati.elenco.find((y) => y.id === id) })))
    .filter((x) => x.stato);
  const durata = ({ p, stato }) => {
    const spec = durataStato(stato);
    const reg = s.durate.find((d) => d.partecipante === p.id && d.stato === stato.id);
    if (!spec) return h('li', {}, `${p.nome}: ${stato.nome} — ${stato.durata} (promemoria).`);
    if (reg) return h('li', {}, `${p.nome}: ${stato.nome} — `, h('strong', {}, `${reg.rimasti} Round`), ' rimasti');
    const input = h('input', { type: 'number', min: spec.minimo, max: spec.massimo, step: 1, class: 'input-d10', 'aria-label': `Durata di ${stato.nome} di ${p.nome}` });
    return h('li', {}, `${p.nome}: ${stato.nome} — ${stato.durata}: `, input,
      h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => modifica((x) => registraDurata(x, p.id, stato, dalVivo(Number(input.value), spec), undefined, ctx.dati)) }, 'Inserisci'),
      h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => modifica((x) => registraDurata(x, p.id, stato, tira(spec).tiro, undefined, ctx.dati)) }, `Tira ${spec.formula}`));
  };

  const b = (st.bozza ??= { nome: '', base: '', lato: 'avversario', des: '', int: '', aNome: '', aTipo: 'ravvicinato', aVa: '', aDanno: '', aNatura: 'Naturale' });
  // «Aggiungi nemici»: un tipo valido del bestiario e quante copie
  const tipi = (st.bestiario ?? []).filter((v) => v.nemico);
  const bn = (st.bozzaNemici ??= { tipo: '', quante: '1', lato: 'avversario' });
  if (!tipi.some((v) => v.id === bn.tipo)) bn.tipo = tipi[0]?.id ?? '';
  const aggiungiNemiciRiga = h('div', { class: 'aggiungi-nemici' },
    h('h3', {}, 'Aggiungi nemici'),
    tipi.length ? h('div', { class: 'riga-aggiungi' },
      // data-chiave: il ridisegno periodico rimette scelte e focus nel controllo giusto (src/ui/ridisegno.js)
      h('label', {}, 'Tipo ', h('select', { dataset: { chiave: 'nemici-tipo' }, onchange: (e) => { bn.tipo = e.target.value; } },
        tipi.map((v) => h('option', { value: v.id, selected: v.id === bn.tipo }, `${v.nemico.nome} (Iniziativa ${numero(v.nemico.iniziativa)}, PV ${v.nemico.pv})`)))),
      h('label', {}, 'Quanti ', h('input', { type: 'number', min: 1, max: 30, step: 1, class: 'input-d10', value: bn.quante, dataset: { chiave: 'nemici-quanti' }, oninput: (e) => { bn.quante = e.target.value; } })),
      h('label', {}, 'Lato ', h('select', { dataset: { chiave: 'nemici-lato' }, onchange: (e) => { bn.lato = e.target.value; } },
        h('option', { value: 'avversario', selected: bn.lato === 'avversario' }, 'avversario'), h('option', { value: 'alleato', selected: bn.lato === 'alleato' }, 'alleato'))),
      h('button', { type: 'button', class: 'btn', onclick: () => {
        const tipo = tipi.find((v) => v.id === bn.tipo)?.nemico;
        modifica((x) => aggiungiNemici(x, tipo, Number(bn.quante), { lato: bn.lato }));
      } }, 'Aggiungi'))
      : h('p', { class: 'nota' }, 'Nessun tipo valido nel bestiario: crealo con «Nuovo tipo» (riquadro Bestiario, in fondo alla plancia).'));
  const campo = (k, attr) => h('input', { ...attr, value: b[k], dataset: { chiave: `manuale-${k}` }, oninput: (e) => { b[k] = e.target.value; } });
  const intero = (v) => (v === '' ? null : Number(v));

  return h('section', { class: 'riquadro scontro-pannello' },
    h('header', { class: 'scontro-testa' },
      h('h2', {}, `${s.nome} · Round ${s.round}`),
      h('div', { class: 'riga-azioni' },
        h('button', { type: 'button', class: 'btn primario', disabled: !ordinati.length, onclick: () => modifica((x) => avanti(x)) }, 'Avanti'),
        // pezzo 4: annulla l'ultimo colpo applicato (PV, Ferite e Stati di prima)
        annullaColpo && s.colpi?.length ? h('button', { type: 'button', class: 'btn', title: `Ultimo: ${s.colpi.at(-1).testo}`, onclick: () => { if (confirm(`Annullare l’ultimo colpo a ${s.colpi.at(-1).nome}?`)) annullaColpo(); } }, 'Annulla ultimo colpo') : null,
        h('button', { type: 'button', class: 'btn', onclick: () => { if (confirm('Chiudere lo scontro? Il file passa in scontri/archivio/.')) modifica((x) => chiudi(x)); } }, 'Fine scontro'))),
    st.avvisoScontro ? h('p', { class: 'riquadro attenzione', role: 'status' }, st.avvisoScontro) : null,
    diT ? h('p', { class: 'di-turno-testo' }, 'Di turno: ', h('strong', {}, diT.nome)) : null,
    ordinati.length ? h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta ordine-iniziativa' },
      h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Partecipante'), h('th', {}, `Iniziativa + ${dado.formula}`), h('th', {}, 'Totale'), h('th', {}, 'Parità'), h('th', {}, ''))),
      h('tbody', {}, ordinati.map(riga)))) : null,
    daTirare.length ? h('div', { class: 'da-tirare' },
      h('h3', {}, `Da tirare (${dado.formula})`),
      h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => modifica((x) => daTirare.reduce((acc, p) => registraTiro(acc, p.id, 'd10', tira(dado).tiro, ctx.dati), x)) }, 'Tira per tutti con l’app'),
      h('ul', {}, daTirare.map((p) => h('li', {}, h('strong', {}, p.nome), p.provvisorio ? h('span', { class: 'etichetta' }, 'provvisorio') : null, ' · Iniziativa ', baseConProvenienza(p), ' + ', tiroDalVivo(p, 'd10'))))) : null,
    aggiungiNemiciRiga,
    // aperto o chiuso resta com'era dopo il ridisegno periodico
    h('details', { class: 'aggiungi-partecipante', open: !!st.manualeAperto, ontoggle: (e) => { st.manualeAperto = e.target.open; } }, h('summary', {}, 'Aggiungi partecipante a mano (provvisorio, senza scheda)'),
      h('div', { class: 'riga-aggiungi' },
        h('label', {}, 'Nome ', campo('nome', { type: 'text', maxlength: 60 })),
        h('label', {}, 'Iniziativa ', campo('base', { type: 'number', step: 1, class: 'input-d10' })),
        h('label', {}, 'Lato ', h('select', { dataset: { chiave: 'manuale-lato' }, onchange: (e) => { b.lato = e.target.value; } },
          h('option', { value: 'avversario', selected: b.lato === 'avversario' }, 'avversario'), h('option', { value: 'alleato', selected: b.lato === 'alleato' }, 'alleato'))),
        h('label', { title: 'Per la parità (§5.1): facoltativo' }, 'DES ', campo('des', { type: 'number', step: 1, class: 'input-d10' })),
        h('label', { title: 'Per la parità (§5.1): facoltativo' }, 'INT ', campo('int', { type: 'number', step: 1, class: 'input-d10' }))),
      // pezzo 5: attacco facoltativo (senza, il pulsante «Attacca» non c'è)
      h('div', { class: 'riga-aggiungi' },
        h('label', { title: 'Facoltativo: con un attacco il partecipante può usare «Attacca»' }, 'Attacco ', campo('aNome', { type: 'text', maxlength: 60, placeholder: 'es. Pistola' })),
        h('label', {}, 'Tipo ', h('select', { dataset: { chiave: 'manuale-tipo' }, onchange: (e) => { b.aTipo = e.target.value; } },
          h('option', { value: 'ravvicinato', selected: b.aTipo === 'ravvicinato' }, 'ravvicinato'), h('option', { value: 'distanza', selected: b.aTipo === 'distanza' }, 'a distanza'))),
        h('label', {}, 'VA ', campo('aVa', { type: 'number', step: 1, class: 'input-d10' })),
        h('label', {}, 'Danno ', campo('aDanno', { type: 'text', maxlength: 20, class: 'input-formula', placeholder: '1d8+2' })),
        h('label', {}, 'Natura ', h('select', { dataset: { chiave: 'manuale-natura' }, onchange: (e) => { b.aNatura = e.target.value; } },
          ['Naturale', 'Magico', 'Etereo'].map((n) => h('option', { value: n, selected: b.aNatura === n }, n)))),
        h('button', { type: 'button', class: 'btn', onclick: () => {
          const attacco = (b.aNome ?? '').trim() ? { nome: b.aNome, tipo: b.aTipo, va: intero(b.aVa), danno: b.aDanno, natura: b.aNatura } : null;
          if (attacco && !attaccoManuale(attacco)) { alert('Attacco incompleto: servono nome, VA intero e danno come «1d8+2» (oppure lascia vuoto il nome dell’attacco).'); return; }
          const dati = { nome: b.nome, base: intero(b.base), lato: b.lato, des: intero(b.des), int: intero(b.int), attacco };
          modifica((x) => aggiungiPartecipante(x, dati)).then((ok) => { if (ok) { st.bozza = null; ridisegna(); } });
        } }, 'Aggiungi'))),
    statiPg.length ? h('div', { class: 'durate-stati' }, h('h3', {}, 'Durate degli Stati'), h('ul', {}, statiPg.map(durata))) : null,
    h('details', { class: 'registro-scontro', open: st.registroAperto, ontoggle: (e) => { st.registroAperto = e.target.open; } },
      h('summary', {}, `Registro (${s.registro.length})`),
      h('ol', { reversed: true }, [...s.registro].reverse().map((r) => h('li', {}, h('small', { class: 'nota' }, `${new Date(r.ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · Round ${r.round} · `), r.testo)))));
}

/** PG per un nuovo scontro, dalla vista della plancia (Iniziativa effettiva, Caratteristiche per la parità). */
export function pgDaVista(v) {
  const [des, int] = Object.values(v.caratteristichePerParita ?? {});
  return { chiave: v.chiaveCartella, nome: v.nome, iniziativa: v.iniziativa?.valore ?? 0, des: des ?? null, int: int ?? null };
}
