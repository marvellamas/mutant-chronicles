// Tavolo del Master, pezzo 4 (docs/tavolo-direttore.md): finestra «Colpito» su una carta della plancia (PG o
// nemico). Danno per applicazione (AC, Giocatore §5.10) scritto dal vivo o tirato dall'app, natura, tipo
// d'attacco, Difesa, proprietà; anteprima di src/danno.js → applicaColpo con la provenienza dell'AR; esito
// della PS di Tempra dove il §5.14 la chiede; «Applica» passa il risultato alla plancia, che lo scrive.
// La finestra sta fuori dalla plancia (che si ridisegna ogni pochi secondi), come l'editor dei nemici.
import { h } from './dom.js';
import { infoValore } from './tooltip.js';
import { specTiro, tira } from '../tiri.js';
import { applicaColpo } from '../danno.js';

/** «1d8+2» → spec di src/tiri.js (un gruppo di dadi più un fisso), oppure null. */
export function specDaFormula(formula) {
  const m = /^\s*(\d+)d(\d+)\s*([+-]\s*\d+)?\s*$/.exec(String(formula ?? ''));
  return m ? specTiro({ dadi: Number(m[1]), facce: Number(m[2]), fisso: m[3] ? Number(m[3].replace(/\s+/g, '')) : 0 }) : null;
}

/**
 * Apre la finestra.
 * @param bersaglio { nome, pv: { attuali, massimo }, ferite (null per i nemici), ar: { totale, magica, valori? }, statiAttivi? }
 * @param applica async (risultato, colpo, statiScelti: string[]) → true se scritto
 * @param proposta { formula, natura, tipo, ac, proprieta } facoltativa (per esempio dall'attacco di un nemico)
 */
export function apriColpo(ctx, bersaglio, { applica, proposta = {} }) {
  const D = ctx.dati.regole.danno_applicato;
  const st = {
    ac: proposta.ac ?? 1, formula: proposta.formula ?? '', danni: [], natura: proposta.natura ?? 'Naturale', tipo: proposta.tipo ?? 'distanza',
    difesa: 'nessuna', proprieta: (proposta.proprieta ?? []).join(', '), tempra: [], stati: null, errore: null, inCorso: false,
    moltiplicatore: proposta.moltiplicatore ?? 1, moltiplicatorePrimo: proposta.moltiplicatorePrimo ?? proposta.moltiplicatore ?? 1,
  };
  const finestra = h('dialog', { class: 'pannello-scheda finestra-colpo', 'aria-labelledby': 'colpo-titolo' });
  // chiusa con Esc o dai pulsanti: si toglie subito dalla pagina
  const chiudi = () => { if (finestra.open) finestra.close(); finestra.remove(); };
  finestra.addEventListener('close', () => finestra.remove());
  const colpo = () => ({
    danni: Array.from({ length: st.ac }, (_, i) => st.danni[i]).map((x) => (Number.isInteger(x) ? x : 0)),
    natura: st.natura, tipo: st.tipo, difesa: st.difesa,
    proprieta: st.proprieta.split(',').map((x) => x.trim()).filter(Boolean),
    tempra: st.tempra,
  });
  const scelta = (etichetta, valori, attuale, imposta) => h('div', { class: 'scelta-attacco' },
    h('p', { class: 'scelta-titolo' }, etichetta),
    h('div', { class: 'scelta-pulsanti' }, valori.map((v) => h('button', {
      type: 'button', class: `btn scelta-btn${v.valore === attuale ? ' scelta' : ''}`, 'aria-pressed': String(v.valore === attuale),
      onclick: () => { imposta(v.valore); disegna(); },
    }, v.etichetta))));

  const disegna = () => {
    const c = colpo();
    const r = applicaColpo(bersaglio, c, ctx.dati);
    if (st.stati === null || st.stati.chiave !== r.stati.map((s) => s.nome).join()) {
      // Stati proposti: quelli automatici spuntati, quelli con la Prova da spuntare se la Prova fallisce
      st.stati = { chiave: r.stati.map((s) => s.nome).join(), scelti: new Set(r.stati.filter((s) => s.automatico && s.id).map((s) => s.id)) };
    }
    const esiti = Object.entries(D.nuove_ferite.esiti);
    finestra.replaceChildren(h('form', { class: 'pannello-contenuto', method: 'dialog', onsubmit: (e) => e.preventDefault() },
      h('header', { class: 'pannello-testa' },
        h('h2', { id: 'colpo-titolo' }, `Colpito: ${bersaglio.nome}`),
        h('button', { type: 'button', class: 'btn tondo chiudi', 'aria-label': 'Chiudi', onclick: () => chiudi() }, '×')),
      h('p', { class: 'nota' }, `PV ${bersaglio.pv.attuali} / ${bersaglio.pv.massimo}${bersaglio.ferite !== null ? ` · Ferite ${bersaglio.ferite}` : ''} · AR ${bersaglio.ar?.totale ?? 0}${bersaglio.ar?.magica ? `, di cui ${bersaglio.ar.magica} magica` : ''}. Il danno è quello tirato, con bonus e moltiplicatori (§5.13, passi 1–3).`),
      scelta('Applicazioni (AC, §5.10)', [1, 2, 3, 4, 5, 6].map((n) => ({ valore: n, etichetta: String(n) })), st.ac, (v) => { st.ac = v; }),
      st.moltiplicatore > 1 || st.moltiplicatorePrimo > 1 ? h('p', { class: 'nota' }, `Dall’attacco: «Tira con l’app» moltiplica ×${st.moltiplicatore} ogni applicazione${st.moltiplicatorePrimo !== st.moltiplicatore ? ` e ×${st.moltiplicatorePrimo} la prima (Successo Magistrale, §1.6)` : ''}. Dal vivo scrivi il danno già moltiplicato.`) : null,
      h('div', { class: 'distanza-riga' },
        h('label', {}, 'Formula ', h('input', { type: 'text', class: 'input-formula', placeholder: '1d8+2', value: st.formula, oninput: (e) => { st.formula = e.target.value; } })),
        h('button', { type: 'button', class: 'btn', title: 'Un gruppo di dadi più un fisso, per esempio «1d8+2»', onclick: () => {
          const s = specDaFormula(st.formula);
          if (!s) { st.errore = 'Formula non riconosciuta: scrivi per esempio «1d8+2», oppure i danni dal vivo.'; disegna(); return; }
          st.errore = null;
          // moltiplicatori dell'attacco (pezzo 5): di ogni applicazione e, con il Magistrale, della sola prima (§1.6)
          st.danni = Array.from({ length: st.ac }, (_, i) => tira(s).tiro.valore * (i === 0 ? st.moltiplicatorePrimo : st.moltiplicatore)); disegna();
        } }, 'Tira con l’app')),
      h('div', { class: 'danni-colpo' }, Array.from({ length: st.ac }, (_, i) => h('label', {}, `Danno ${i + 1} `,
        h('input', { type: 'number', min: 0, step: 1, class: 'input-d10', value: st.danni[i] ?? '', 'aria-label': `Danno dell’applicazione ${i + 1}, dal vivo`,
          onchange: (e) => { st.danni[i] = e.target.value === '' ? undefined : Number(e.target.value); disegna(); } })))),
      scelta('Natura del danno (§5.24)', Object.keys(D.ar_per_natura).map((n) => ({ valore: n, etichetta: n })), st.natura, (v) => { st.natura = v; }),
      scelta('Attacco', [{ valore: 'ravvicinato', etichetta: 'Ravvicinato' }, { valore: 'distanza', etichetta: 'A distanza' }], st.tipo, (v) => { st.tipo = v; }),
      scelta('Difesa del bersaglio (§5.10)', D.difese.map((d) => ({ valore: d.id, etichetta: d.nome })), st.difesa, (v) => { st.difesa = v; }),
      h('label', { class: 'campo' }, h('span', {}, 'Proprietà del colpo (separate da virgola)'),
        h('input', { type: 'text', placeholder: 'Perforante 2, Laser, Sanguinante 1', value: st.proprieta, onchange: (e) => { st.proprieta = e.target.value; disegna(); } })),
      // anteprima
      h('div', { class: 'attacco-risultato anteprima-colpo' },
        h('ol', {}, r.applicazioni.map((a, i) => h('li', {},
          `${a.tirato}${a.dopoDifesa !== a.tirato ? ` → ${a.dopoDifesa} (${r.difesa.nome})` : ''} − AR `,
          infoValore(h('strong', {}, String(a.ar.valore)), { titolo: `AR applicabile: ${a.ar.valore}`, sottotitolo: 'Giocatore §5.13, §5.24', provenienza: a.ar.provenienza }),
          ` = ${a.finale} · PV ${a.pvPrima} → ${a.pvDopo}`,
          a.tempra ? h('span', { class: 'tempra-colpo' }, ` · PS di Tempra (danno ${a.tempra.fascia}): `,
            h('select', { 'aria-label': `Esito della PS di Tempra, applicazione ${i + 1}`, onchange: (e) => { st.tempra[i] = e.target.value || null; disegna(); } },
              h('option', { value: '' }, '— esito —'), esiti.map(([k, n]) => h('option', { value: k, selected: st.tempra[i] === k }, `${n}: ${a.tempra.tabella[k]} Ferite`)))) : null))),
        h('p', {}, h('strong', {}, `PV ${r.pv.prima} → ${r.pv.dopo}`),
          r.ferite ? ` · Ferite ${r.ferite.prima} → ${r.ferite.dopo}${r.ferite.nome ? ` (${r.ferite.nome})` : ''}` : '',
          r.morte ? h('strong', { class: 'motivo' }, ' · Morte') : null),
        r.stati.length ? h('div', {}, h('p', { class: 'scelta-titolo' }, 'Effetti del colpo (§5.24)'),
          r.stati.map((s) => h('p', {}, s.id ? h('label', {}, h('input', { type: 'checkbox', checked: st.stati.scelti.has(s.id),
            onchange: (e) => { if (e.target.checked) st.stati.scelti.add(s.id); else st.stati.scelti.delete(s.id); } }), ` ${s.automatico ? 'Applica' : 'Se la Prova fallisce, applica'} ${s.nome} · `) : null, h('small', { class: 'nota' }, s.testo)))) : null,
        r.promemoria.length ? h('ul', { class: 'promemoria-attacco' }, r.promemoria.map((p) => h('li', {}, p))) : null),
      st.errore ? h('p', { class: 'riquadro errore', role: 'alert' }, st.errore) : null,
      h('div', { class: 'riga-azioni' },
        h('button', {
          type: 'button', class: 'btn primario', disabled: st.inCorso || r.tempraMancanti.length > 0 || !c.danni.some((x) => x > 0),
          title: r.tempraMancanti.length ? 'Scegli l’esito della PS di Tempra' : null,
          onclick: async () => {
            st.inCorso = true; st.errore = null; disegna();
            try {
              if (await applica(r, c, [...st.stati.scelti])) { chiudi(); return; }
            } catch (e) { st.errore = e.message; }
            st.inCorso = false; disegna();
          },
        }, 'Applica'),
        h('button', { type: 'button', class: 'btn', onclick: () => chiudi() }, 'Annulla'))));
  };
  disegna();
  document.body.append(finestra);
  finestra.showModal();
}
