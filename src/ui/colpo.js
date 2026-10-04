// Tavolo del Master, pezzo 4 (docs/tavolo-direttore.md): finestra «Colpito» su una carta della plancia (PG o
// nemico). Danno per applicazione (AC, Giocatore §5.10) scritto dal vivo o tirato dall'app, natura, tipo
// d'attacco, Difesa, proprietà; anteprima di src/danno.js → applicaColpo con la provenienza dell'AR; esito
// della PS di Tempra dove il §5.14 la chiede; «Applica» passa il risultato alla plancia, che lo scrive.
// La finestra sta fuori dalla plancia (che si ridisegna ogni pochi secondi), come l'editor dei nemici.
//
// Il danno che si scrive sono i dadi con i bonus ordinari (§5.13, passi 1–2). Moltiplicatori e Successo
// Magistrale (§1.6) li applica il motore: l'interruttore «Successo Magistrale» arriva già acceso da un
// attacco Magistrale e si può accendere a mano (un PG che colpisce un nemico, un colpo scritto a mano).
// Prima del 04/10/2026 il raddoppio lo faceva solo «Tira con l'app» e il danno dei dadi veri non lo riceveva.
import { h } from './dom.js';
import { infoValore } from './tooltip.js';
import { specTiro, tira } from '../tiri.js';
import { applicaColpo, moltiplicatoreMagistrale } from '../danno.js';
import { periodicoDi } from '../periodici.js';

/** «1d8+2» → spec di src/tiri.js (un gruppo di dadi più un fisso), oppure null. */
export function specDaFormula(formula) {
  const m = /^\s*(\d+)d(\d+)\s*([+-]\s*\d+)?\s*$/.exec(String(formula ?? ''));
  return m ? specTiro({ dadi: Number(m[1]), facce: Number(m[2]), fisso: m[3] ? Number(m[3].replace(/\s+/g, '')) : 0 }) : null;
}

/**
 * Apre la finestra.
 * @param bersaglio { nome, pv: { attuali, massimo }, ferite (null per i nemici), ar: { totale, magica, valori? }, statiAttivi? }
 * @param applica async (risultato, colpo, statiScelti: string[], periodici: []) → true se scritto
 * @param proposta { formula, natura, tipo, ac, proprieta, moltiplicatore, magistrale, fonte, fonteNome }
 *   facoltativa (per esempio dall'attacco di un nemico)
 * @param fonti [{ id, nome }] partecipanti dello scontro, per la fonte degli Stati periodici (§5.15)
 */
export function apriColpo(ctx, bersaglio, { applica, proposta = {}, fonti = [] }) {
  const D = ctx.dati.regole.danno_applicato;
  const st = {
    ac: proposta.ac ?? 1, formula: proposta.formula ?? '', danni: [], natura: proposta.natura ?? 'Naturale', tipo: proposta.tipo ?? 'distanza',
    difesa: 'nessuna', proprieta: (proposta.proprieta ?? []).join(', '), tempra: [], stati: null, errore: null, inCorso: false,
    moltiplicatore: proposta.moltiplicatore ?? 1, magistrale: !!proposta.magistrale,
    // fonte delle perdite periodiche: quella dell'attacco, altrimenti la prima proposta (chi è di turno)
    fonte: proposta.fonte ?? fonti[0]?.id ?? null,
    valori: {}, // valore X degli Stati periodici proposti (Sanguinante 1 → 1), modificabile
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
    // §1.6, §5.13: moltiplicatore e Magistrale li applica applicaColpo, prima di Difesa e Armatura
    moltiplicatore: st.moltiplicatore, magistrale: st.magistrale,
    // §5.15: perdita immediata degli Stati periodici scelti, che ignora Armatura, Parata e Schivata
    periodiciImmediati: periodiciScelti(),
  });
  /** Stati periodici spuntati, con il valore scritto o quello della proprietà del colpo. */
  const periodiciScelti = () => [...(st.stati?.scelti ?? [])].flatMap((id) => {
    const per = periodicoDi(id, ctx.dati);
    if (!per) return [];
    const scritto = st.valori[id] ?? (per.danno === 'valore' ? st.proposti?.[id] ?? 1 : per.danno === 'dalla_fonte' ? '' : per.danno);
    const numero = Number(scritto);
    const valore = Number.isInteger(numero) && numero > 0 ? numero : null;
    const formula = valore === null && /^\d+d\d+([+-]\d+)?$/.test(String(scritto).trim()) ? String(scritto).trim() : null;
    return [{ stato: id, valore, formula, fonte: st.fonte }];
  });
  const scelta = (etichetta, valori, attuale, imposta) => h('div', { class: 'scelta-attacco' },
    h('p', { class: 'scelta-titolo' }, etichetta),
    h('div', { class: 'scelta-pulsanti' }, valori.map((v) => h('button', {
      type: 'button', class: `btn scelta-btn${v.valore === attuale ? ' scelta' : ''}`, 'aria-pressed': String(v.valore === attuale),
      onclick: () => { imposta(v.valore); disegna(); },
    }, v.etichetta))));

  const disegna = () => {
    let c = colpo();
    let r = applicaColpo(bersaglio, c, ctx.dati);
    const chiave = r.stati.map((s) => s.nome).join();
    if (st.stati === null || st.stati.chiave !== chiave) {
      // Stati proposti: quelli automatici spuntati, quelli con la Prova da spuntare se la Prova fallisce
      st.stati = { chiave, scelti: new Set(r.stati.filter((s) => s.automatico && s.id).map((s) => s.id)) };
      // valore X dalla proprietà del colpo (Sanguinante 1 → 1), modificabile nel campo
      st.proposti = Object.fromEntries(r.stati.filter((s) => s.id).map((s) => [s.id, s.valore]));
      // gli Stati periodici appena spuntati hanno una perdita immediata (§5.15): si ricalcola
      c = colpo();
      r = applicaColpo(bersaglio, c, ctx.dati);
    }
    const esiti = Object.entries(D.nuove_ferite.esiti);
    finestra.replaceChildren(h('form', { class: 'pannello-contenuto', method: 'dialog', onsubmit: (e) => e.preventDefault() },
      h('header', { class: 'pannello-testa' },
        h('h2', { id: 'colpo-titolo' }, `Colpito: ${bersaglio.nome}`),
        h('button', { type: 'button', class: 'btn tondo chiudi', 'aria-label': 'Chiudi', onclick: () => chiudi() }, '×')),
      h('p', { class: 'nota' }, `PV ${bersaglio.pv.attuali} / ${bersaglio.pv.massimo}${bersaglio.ferite !== null ? ` · Ferite ${bersaglio.ferite}` : ''} · AR ${bersaglio.ar?.totale ?? 0}${bersaglio.ar?.magica ? `, di cui ${bersaglio.ar.magica} magica` : ''}. Scrivi i dadi con i bonus ordinari (§5.13, passi 1–2): moltiplicatori e Successo Magistrale li applica l’app, prima della Difesa e dell’Armatura.`),
      scelta('Applicazioni (AC, §5.10)', [1, 2, 3, 4, 5, 6].map((n) => ({ valore: n, etichetta: String(n) })), st.ac, (v) => { st.ac = v; }),
      // §1.6: il Magistrale raddoppia il danno (×2 → ×3) sulla sola prima applicazione, prima di Parata e Armatura
      h('div', { class: 'scelta-attacco' },
        h('p', { class: 'scelta-titolo' }, 'Esito dell’attacco (§1.6)'),
        h('label', { class: 'interruttore-magistrale' },
          h('input', {
            type: 'checkbox', checked: st.magistrale,
            onchange: (e) => { st.magistrale = e.target.checked; disegna(); },
          }), ` Successo Magistrale: danno ×${moltiplicatoreMagistrale(st.moltiplicatore, ctx.dati)} sulla prima applicazione`),
        st.moltiplicatore > 1 ? h('p', { class: 'nota' }, `L’attacco ha già danno ×${st.moltiplicatore} (Carica, Bruciapelo…): con il Magistrale diventa ×${moltiplicatoreMagistrale(st.moltiplicatore, ctx.dati)}, non ×${st.moltiplicatore * 2} (§1.6).`) : null),
      scelta('Moltiplicatore di ogni applicazione', [1, 2, 3].map((n) => ({ valore: n, etichetta: `×${n}` })), st.moltiplicatore, (v) => { st.moltiplicatore = v; }),
      h('div', { class: 'distanza-riga' },
        h('label', {}, 'Formula ', h('input', { type: 'text', class: 'input-formula', placeholder: '1d8+2', value: st.formula, oninput: (e) => { st.formula = e.target.value; } })),
        h('button', { type: 'button', class: 'btn', title: 'Un gruppo di dadi più un fisso, per esempio «1d8+2». Il moltiplicatore lo applica l’app dopo', onclick: () => {
          const s = specDaFormula(st.formula);
          if (!s) { st.errore = 'Formula non riconosciuta: scrivi per esempio «1d8+2», oppure i danni dal vivo.'; disegna(); return; }
          st.errore = null;
          // solo i dadi con i bonus: moltiplicatore e Magistrale li applica applicaColpo (§5.13, passo 3)
          st.danni = Array.from({ length: st.ac }, () => tira(s).tiro.valore); disegna();
        } }, 'Tira con l’app')),
      h('div', { class: 'danni-colpo' }, Array.from({ length: st.ac }, (_, i) => h('label', {}, `Danno ${i + 1} `,
        h('input', { type: 'number', min: 0, step: 1, class: 'input-d10', value: st.danni[i] ?? '', 'aria-label': `Danno dell’applicazione ${i + 1}: dadi e bonus ordinari, dal vivo`,
          onchange: (e) => { st.danni[i] = e.target.value === '' ? undefined : Number(e.target.value); disegna(); } })))),
      scelta('Natura del danno (§5.24)', Object.keys(D.ar_per_natura).map((n) => ({ valore: n, etichetta: n })), st.natura, (v) => { st.natura = v; }),
      scelta('Attacco', [{ valore: 'ravvicinato', etichetta: 'Ravvicinato' }, { valore: 'distanza', etichetta: 'A distanza' }], st.tipo, (v) => { st.tipo = v; }),
      scelta('Difesa del bersaglio (§5.10)', D.difese.map((d) => ({ valore: d.id, etichetta: d.nome })), st.difesa, (v) => { st.difesa = v; }),
      h('label', { class: 'campo' }, h('span', {}, 'Proprietà del colpo (separate da virgola)'),
        h('input', { type: 'text', placeholder: 'Perforante 2, Laser, Sanguinante 1', value: st.proprieta, onchange: (e) => { st.proprieta = e.target.value; disegna(); } })),
      // anteprima
      h('div', { class: 'attacco-risultato anteprima-colpo' },
        h('ol', {}, r.applicazioni.map((a, i) => h('li', {},
          // §5.13: dadi e bonus → moltiplicatore (Magistrale sulla prima) → Difesa → Armatura
          infoValore(h('span', {}, String(a.tirato)), { titolo: `Danno dei dadi e bonus: ${a.tirato}`, sottotitolo: 'Giocatore §5.13, passi 1–2', provenienza: a.provenienza }),
          a.moltiplicatore > 1 ? h('strong', { class: a.magistrale ? 'danno-magistrale' : null }, ` ×${a.moltiplicatore} = ${a.dopoMoltiplicatore}`) : null,
          a.magistrale ? h('small', { class: 'nota' }, ' (Magistrale)') : null,
          a.dopoDifesa !== a.dopoMoltiplicatore ? ` → ${a.dopoDifesa} (${r.difesa.nome})` : '',
          ' − AR ',
          infoValore(h('strong', {}, String(a.ar.valore)), { titolo: `AR applicabile: ${a.ar.valore}`, sottotitolo: 'Giocatore §5.13, §5.24', provenienza: a.ar.provenienza }),
          ` = ${a.finale} · PV ${a.pvPrima} → ${a.pvDopo}`,
          a.tempra ? h('span', { class: 'tempra-colpo' }, ` · PS di Tempra (danno ${a.tempra.fascia}): `,
            h('select', { 'aria-label': `Esito della PS di Tempra, applicazione ${i + 1}`, onchange: (e) => { st.tempra[i] = e.target.value || null; disegna(); } },
              h('option', { value: '' }, '— esito —'), esiti.map(([k, n]) => h('option', { value: k, selected: st.tempra[i] === k }, `${n}: ${a.tempra.tabella[k]} Ferite`)))) : null))),
        h('p', {}, h('strong', {}, `PV ${r.pv.prima} → ${r.pv.dopo}`),
          r.ferite ? ` · Ferite ${r.ferite.prima} → ${r.ferite.dopo}${r.ferite.nome ? ` (${r.ferite.nome})` : ''}` : '',
          r.morte ? h('strong', { class: 'motivo' }, ' · Morte') : null),
        r.stati.length ? h('div', {}, h('p', { class: 'scelta-titolo' }, 'Effetti del colpo (§5.24)'),
          r.stati.map((s) => {
            const per = s.id ? periodicoDi(s.id, ctx.dati) : null;
            return h('div', { class: 'stato-colpo' },
              h('p', {}, s.id ? h('label', {}, h('input', { type: 'checkbox', checked: st.stati.scelti.has(s.id),
                onchange: (e) => { if (e.target.checked) st.stati.scelti.add(s.id); else st.stati.scelti.delete(s.id); disegna(); } }), ` ${s.automatico ? 'Applica' : 'Se la Prova fallisce, applica'} ${s.nome} · `) : null,
                h('small', { class: 'nota' }, s.testo)),
              // Stato con una perdita periodica (§5.15): valore X e fonte, che ne dice l'Iniziativa
              per && st.stati.scelti.has(s.id) ? h('div', { class: 'periodico-colpo' },
                per.danno === 'valore'
                  ? h('label', {}, `${s.nome} X: `, h('input', {
                    type: 'number', min: 1, step: 1, class: 'input-d10', 'aria-label': `Valore di ${s.nome}`,
                    value: st.valori[s.id] ?? st.proposti?.[s.id] ?? s.valore ?? 1,
                    onchange: (e) => { st.valori[s.id] = Number(e.target.value) || 1; disegna(); },
                  }), ' PV per Round')
                  : h('label', {}, `${s.nome}: `, h('input', {
                    type: 'text', class: 'input-formula', placeholder: per.danno === '1d4' ? '1d4' : '1d4, 2…', 'aria-label': `Danno periodico di ${s.nome}`,
                    value: st.valori[s.id] ?? (per.danno === 'dalla_fonte' ? '' : per.danno),
                    onchange: (e) => { st.valori[s.id] = e.target.value.trim(); disegna(); },
                  }), ' per Round'),
                fonti.length ? h('label', {}, ' Fonte (Iniziativa): ', h('select', {
                  'aria-label': `Fonte di ${s.nome}`, onchange: (e) => { st.fonte = e.target.value || null; disegna(); },
                }, fonti.map((f) => h('option', { value: f.id, selected: st.fonte === f.id }, f.nome)),
                h('option', { value: '', selected: st.fonte === null }, 'nessuna Iniziativa (fine del Round)'))) : null,
                h('small', { class: 'nota' }, ` La perdita si ripete all’Iniziativa della fonte, una volta per Round (${per.paragrafo}). ${per.fine}.`)) : null);
          })) : null,
        r.promemoria.length ? h('ul', { class: 'promemoria-attacco' }, r.promemoria.map((p) => h('li', {}, p))) : null),
      st.errore ? h('p', { class: 'riquadro errore', role: 'alert' }, st.errore) : null,
      h('div', { class: 'riga-azioni' },
        h('button', {
          type: 'button', class: 'btn primario', disabled: st.inCorso || r.tempraMancanti.length > 0 || !c.danni.some((x) => x > 0),
          title: r.tempraMancanti.length ? 'Scegli l’esito della PS di Tempra' : null,
          onclick: async () => {
            st.inCorso = true; st.errore = null; disegna();
            try {
              // perdite periodiche da registrare nello scontro (§5.15): la prima l'ha già applicata il colpo
              const periodici = periodiciScelti().map((p) => ({
                stato: p.stato, fonte: p.fonte,
                ...(p.valore ? { valore: p.valore } : {}),
                ...(p.formula ? { formula: p.formula } : {}),
              }));
              if (await applica(r, c, [...st.stati.scelti], periodici)) { chiudi(); return; }
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
