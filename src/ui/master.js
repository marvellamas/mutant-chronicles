// «Modifica master» (12/10/2026): l'interfaccia della modalità master nella scheda di un PG. Le regole stanno in
// src/correzioni-master.js (funzioni pure); qui la fascia in alto, il tocco su un valore con la sua finestrella, il
// registro «Modifiche del master» della tab Identità e la finestrella del bonus di circostanza del Tavolo.
// ctx.master (solo in modalità master, src/ui/app.js): { correggi, diretta, annulla, esci, togliCircostanza, concediLivello, annullaUltimoLivello, scelteUltimoLivello }.
import { h, segno } from './dom.js';
import { apri } from './finestrella.js';

import { applicaCorrezioni, correzioniDi } from '../correzioni-master.js';

/** Fascia ben visibile in alto: «Modalità master — ogni modifica viene registrata» e «Esci». */
export function fasciaMaster(ctx) {
  if (!ctx.master) return null;
  return h('div', { class: 'fascia-master', role: 'status' },
    h('strong', {}, '🛠 Modalità master — ogni modifica viene registrata'),
    h('span', { class: 'nota' }, ' Tocca ✎ accanto a un valore per correggerlo; il registro è nella tab Identità.'),
    h('button', { type: 'button', class: 'btn btn-esci-master', onclick: () => ctx.master.esci() }, 'Esci'));
}

/**
 * Il tocco del master su un valore: «✎» accanto al valore, che apre la finestrella della correzione. Fuori dalla
 * modalità master non c'è nulla.
 * @param voci una voce o più (per esempio Passo, Corsa e Scatto): { chiave, etichetta, attuale, calcolato?, campo? }.
 *   `campo`: valore «a mano» della sessione (Punti Eroe…): si imposta direttamente, e la modifica entra nel registro.
 */
export function toccoMaster(ctx, voci, { testo = '✎' } = {}) {
  if (!ctx.master) return null;
  const lista = [voci].flat().filter(Boolean);
  if (!lista.length) return null;
  return h('button', {
    type: 'button', class: 'btn-tocco-master', title: `Modifica master: ${lista.map((v) => v.etichetta).join(', ')}`, 'aria-label': `Modifica master: ${lista[0].etichetta}`,
    onclick: (e) => { e.preventDefault?.(); e.stopPropagation?.(); apriCorrezione(ctx, lista); },
  }, testo);
}

/**
 * La finestrella: valore attuale, valore calcolato, «Aggiungi / togli N» oppure «Imposta a N», motivo facoltativo,
 * «Conferma». La correzione va nel registro del PG e il motore la applica dopo il calcolo.
 */
export function apriCorrezione(ctx, voci) {
  const lista = ctx.scelte?.correzioniMaster ?? [];
  const st = { voce: voci[0], tipo: voci[0].campo ? 'imposta' : 'aggiungi', numero: voci[0].campo ? voci[0].attuale ?? 0 : 0, motivo: '' };
  return apri('finestrella-master', `Modifica master: ${voci.length === 1 ? voci[0].etichetta : 'scegli il valore'}`, (fine) => {
    const corpo = h('div', { class: 'corpo-master' });
    const disegna = () => {
      const v = st.voce;
      const attive = v.campo ? [] : correzioniDi(lista, v.chiave);
      const calcolato = v.calcolato ?? (attive.length ? null : v.attuale);
      const numero = Number.isFinite(st.numero) ? st.numero : 0;
      // anteprima: che cosa diventa il valore con la correzione scritta
      const anteprima = v.campo ? numero
        : calcolato === null || calcolato === undefined ? null
          : applicaCorrezioni(calcolato, [...lista, { id: 'anteprima', chiave: v.chiave, tipo: st.tipo, numero, stato: 'attiva', motivo: '' }], v.chiave, v.limiti ?? {}).valore;
      const passo = (d) => h('button', { type: 'button', class: 'btn-tavolo', 'aria-label': `${d > 0 ? 'Aggiungi' : 'Togli'} ${Math.abs(d)}`, onclick: () => { st.numero = numero + d; disegna(); } }, d > 0 ? `+${d}` : `−${-d}`);
      corpo.replaceChildren(...[
        voci.length > 1 ? h('label', { class: 'finestrella-campo' }, h('span', {}, 'Valore'),
          h('select', { onchange: (e) => { st.voce = voci.find((x) => x.chiave === e.target.value) ?? voci[0]; st.tipo = st.voce.campo ? 'imposta' : st.tipo; st.numero = st.voce.campo ? st.voce.attuale ?? 0 : 0; disegna(); } },
            voci.map((x) => h('option', { value: x.chiave, selected: x.chiave === v.chiave }, x.etichetta)))) : null,
        h('p', { class: 'valori-master' }, 'Valore attuale: ', h('strong', {}, String(v.attuale ?? '—')),
          v.campo ? null : [' · calcolato dalle regole: ', h('strong', {}, calcolato === null || calcolato === undefined ? '—' : String(calcolato))]),
        attive.length ? h('p', { class: 'nota' }, 'Correzioni già attive: ', attive.map((x) => `${x.tipo === 'imposta' ? `impostato a ${x.numero}` : segno(x.numero)}${x.motivo ? ` (${x.motivo})` : ''}`).join('; '), '. Si annullano dal registro, nella tab Identità.') : null,
        v.campo ? null : h('div', { class: 'scelta-master', role: 'radiogroup', 'aria-label': 'Tipo di correzione' },
          [['aggiungi', 'Aggiungi / togli'], ['imposta', 'Imposta a']].map(([id, nome]) => h('button', {
            type: 'button', role: 'radio', 'aria-checked': String(st.tipo === id), class: `btn${st.tipo === id ? ' primario' : ''}`,
            onclick: () => { if (st.tipo === id) return; st.tipo = id; st.numero = id === 'imposta' ? v.attuale ?? 0 : 0; disegna(); },
          }, nome))),
        h('div', { class: 'numero-master pulsanti-tavolo' }, passo(-10), passo(-1),
          h('input', { type: 'number', step: 1, inputmode: 'numeric', class: 'input-master', value: numero, 'aria-label': st.tipo === 'imposta' ? 'Imposta a' : 'Aggiungi o togli',
            oninput: (e) => { st.numero = Math.round(Number(e.target.value)) || 0; } , onchange: () => disegna() }),
          passo(1), passo(10)),
        h('p', { class: 'anteprima-master' }, st.tipo === 'imposta' ? `Diventa ${numero}, qualunque sia il calcolo.` : `${segno(numero)} sul valore calcolato.`,
          anteprima !== null && anteprima !== undefined ? [' Risultato: ', h('strong', {}, String(anteprima))] : null),
        h('label', { class: 'finestrella-campo' }, h('span', {}, 'Motivo (facoltativo)'),
          h('input', { type: 'text', maxlength: 200, value: st.motivo, placeholder: 'es. dono del patrono, A.111…', oninput: (e) => { st.motivo = e.target.value; } })),
        h('div', { class: 'riga-azioni finestrella-azioni' },
          h('button', { type: 'button', class: 'btn', onclick: () => fine(null) }, 'Annulla'),
          h('button', { type: 'button', class: 'btn primario', disabled: v.campo ? numero === v.attuale : st.tipo === 'aggiungi' && numero === 0,
            onclick: () => {
              if (v.campo) ctx.master.diretta({ campo: v.campo, etichetta: v.etichetta, valore: numero, motivo: st.motivo });
              else ctx.master.correggi({ chiave: v.chiave, etichetta: v.etichetta, tipo: st.tipo, numero, motivo: st.motivo });
              fine(true);
            } }, 'Conferma')),
      ].filter(Boolean));
    };
    disegna();
    return [corpo];
  });
}

/** «Correzione del master +10 (motivo)» sotto un valore che non ha un suo «Calcolo» (PV e PM massimi, Caratteristiche). */
export function notaCorrezione(blocco) {
  if (!blocco?.righe?.length) return null;
  return h('small', { class: 'nota nota-correzione-master', title: `Calcolato dalle regole: ${blocco.calcolato}` },
    blocco.righe.map((x) => `${x.fonte} ${segno(x.valore)}${x.nota && x.nota !== 'senza motivo' ? ` (${x.nota})` : ''}`).join('; '));
}

const quando = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); };

/**
 * «Modifiche del master» nella tab Identità, vicino allo «Storico»: una riga per modifica con data, cosa (prima → dopo),
 * motivo. I giocatori la vedono in sola lettura; in modalità master ogni riga attiva ha «Annulla», che non la cancella:
 * la segna «annullata il …» e toglie l'effetto.
 * @param righe registro(scelte.correzioniMaster) di src/correzioni-master.js
 */
export function sezioneRegistro(ctx, righe) {
  // A.187: le concessioni di livello le vede solo il Direttore
  if (!ctx.master) righe = (righe ?? []).filter((x) => x.tipo !== 'concessione');
  if (!righe?.length && !ctx.master) return null;
  const attive = (righe ?? []).filter((x) => !x.annullata).length;
  return h('details', { class: 'sezione-tab registro-master', open: !!ctx.master || null },
    h('summary', {}, `Modifiche del master (${attive}${righe.length !== attive ? `, ${righe.length - attive} annullate` : ''})`),
    righe.length ? h('ul', { class: 'righe-registro-master' }, righe.map((x) => h('li', { class: x.annullata ? 'annullata' : null },
      h('small', { class: 'nota' }, `${quando(x.quando)} · `),
      h('span', { class: 'cosa-registro' }, x.cosa),
      x.motivo ? h('span', { class: 'motivo-registro' }, ` — ${x.motivo}`) : null,
      x.annullata ? h('small', { class: 'nota' }, ` · annullata il ${quando(x.annullataIl)}`) : null,
      ctx.master && !x.annullata ? h('button', { type: 'button', class: 'btn btn-piccolo btn-annulla-master', title: 'Toglie l’effetto di questa modifica; la riga resta nel registro, segnata come annullata', onclick: () => ctx.master.annulla(x.id) }, 'Annulla') : null)))
      : h('p', { class: 'nota' }, 'Nessuna modifica: tocca ✎ accanto a un valore.'),
    ctx.master ? null : h('p', { class: 'nota' }, 'Sola lettura: le modifiche le fa e le annulla il master dal Tavolo.'));
}

/**
 * Finestrella del Tavolo: bonus o malus di circostanza da mandare a un PG (S11).
 * @param R regole.json → circostanza ({ minimo, massimo, categorie }) @param scontro { id, nome } | null
 * @returns Promise<{ valore, categorie, nota, soloScontro } | null>
 */
export function chiediCircostanza({ nome, R, scontro = null }) {
  const st = { valore: 1, categorie: new Set(R.categorie.map((c) => c.id)), nota: '', soloScontro: !!scontro };
  return apri('finestrella-master', `Bonus di circostanza a ${nome}`, (fine) => {
    const corpo = h('div', { class: 'corpo-master' });
    const disegna = () => corpo.replaceChildren(...[
      h('div', { class: 'numero-master pulsanti-tavolo' },
        h('button', { type: 'button', class: 'btn-tavolo', disabled: st.valore <= R.minimo, 'aria-label': 'Togli 1', onclick: () => { st.valore -= 1; if (st.valore === 0) st.valore = -1; disegna(); } }, '−1'),
        h('strong', { class: 'valore-master', 'aria-live': 'polite' }, segno(st.valore)),
        h('button', { type: 'button', class: 'btn-tavolo', disabled: st.valore >= R.massimo, 'aria-label': 'Aggiungi 1', onclick: () => { st.valore += 1; if (st.valore === 0) st.valore = 1; disegna(); } }, '+1')),
      h('div', { class: 'categorie-circostanza', role: 'group', 'aria-label': 'A che cosa si applica' }, R.categorie.map((c) => h('label', { class: 'casella-circostanza' },
        h('input', { type: 'checkbox', checked: st.categorie.has(c.id), onchange: (e) => { if (e.target.checked) st.categorie.add(c.id); else st.categorie.delete(c.id); disegna(); } }), ` ${c.nome}`))),
      h('label', { class: 'finestrella-campo' }, h('span', {}, 'Descrizione breve'),
        h('input', { type: 'text', maxlength: 120, value: st.nota, placeholder: 'es. terreno favorevole, benedizione…', oninput: (e) => { st.nota = e.target.value; } })),
      scontro ? h('label', { class: 'casella-circostanza' }, h('input', { type: 'checkbox', checked: st.soloScontro, onchange: (e) => { st.soloScontro = e.target.checked; } }), ` Solo per questo scontro («${scontro.nome}»): si toglie da solo a «Fine scontro»`) : null,
      h('p', { class: 'nota' }, 'Il giocatore lo vede nelle «Condizioni attive» con la scritta «dal master» e non lo può togliere.'),
      h('div', { class: 'riga-azioni finestrella-azioni' },
        h('button', { type: 'button', class: 'btn', onclick: () => fine(null) }, 'Annulla'),
        h('button', { type: 'button', class: 'btn primario', disabled: !st.categorie.size, onclick: () => fine({ valore: st.valore, categorie: [...st.categorie], nota: st.nota.trim(), soloScontro: st.soloScontro }) }, 'Manda al PG')),
    ].filter(Boolean));
    disegna();
    return [corpo];
  });
}

/**
 * Azione del master che non è una correzione numerica («Annulla (errore)» dell'Umanità, «Togli» di un recupero…):
 * prima si conferma e si scrive il motivo facoltativo, poi l'azione parte e il motivo finisce nella riga del registro
 * «Modifiche del master» (13/10/2026: serve per la A.111 di Pablo). Fuori dalla modalità master resta la conferma di
 * sempre, senza registro.
 * @param ctx contesto della scheda @param azione { titolo, testo, conferma } @param fai () => void
 */
export async function conMotivoMaster(ctx, { titolo, testo, conferma = 'Conferma' }, fai) {
  if (!ctx.master) { if (globalThis.confirm?.(`${titolo} ${testo}`)) fai(); return; }
  const motivo = await apri('finestrella-master', titolo, (fine) => {
    const campo = h('input', { type: 'text', maxlength: 200, placeholder: 'es. A.111, inserito per prova…', 'aria-label': 'Motivo' });
    return [
      h('p', {}, testo),
      h('label', { class: 'finestrella-campo' }, h('span', {}, 'Motivo (facoltativo)'), campo),
      h('p', { class: 'nota' }, 'La modifica va nel registro «Modifiche del master» della tab Identità, con il motivo; da lì si annulla.'),
      h('div', { class: 'riga-azioni finestrella-azioni' },
        h('button', { type: 'button', class: 'btn', onclick: () => fine(null) }, 'Annulla'),
        h('button', { type: 'button', class: 'btn primario', onclick: () => fine({ motivo: campo.value.trim() }) }, conferma)),
    ];
  });
  if (!motivo) return;
  ctx.master.motivoProssima(motivo.motivo);
  fai();
}

/** Il motivo, obbligatorio: la finestrella non conferma a campo vuoto. @returns Promise<string | null> */
function chiediMotivoObbligatorio({ titolo, testo, conferma }) {
  return apri('finestrella-master', titolo, (fine) => {
    const campo = h('input', { type: 'text', maxlength: 200, placeholder: 'es. recupero di una partita, deciso al tavolo…', 'aria-label': 'Motivo' });
    const vai = h('button', { type: 'button', class: 'btn primario', disabled: true, onclick: () => fine(campo.value.trim()) }, conferma);
    campo.addEventListener('input', () => { vai.disabled = !campo.value.trim(); });
    return [
      h('p', {}, testo),
      h('label', { class: 'finestrella-campo' }, h('span', {}, 'Motivo (obbligatorio)'), campo),
      h('div', { class: 'riga-azioni finestrella-azioni' }, h('button', { type: 'button', class: 'btn', onclick: () => fine(null) }, 'Annulla'), vai),
    ];
  });
}

/**
 * A.187 (28/10/2026): lo spazio del Direttore sul passaggio di livello, solo in modalità master.
 *  - «Concedi il passaggio al livello N»: quando i PX non bastano; chiede il motivo, lo scrive nel registro, i PX non cambiano;
 *  - con un livello più dei PX: «Annulla l'ultimo livello» (prima mostra le scelte che si perdono) o «Tieni come concessione».
 * @param ctx contesto della scheda (ctx.livelloPx, ctx.master, ctx.identita.livello) @returns elemento o null
 */
export function bloccoLivelloMaster(ctx, livello) {
  if (!ctx.master || !ctx.livelloPx) return null;
  const { permesso, oltre } = ctx.livelloPx;
  const azioni = [];
  if (oltre > 0 && livello > 1) {
    azioni.push(h('button', { type: 'button', class: 'btn btn-piccolo', onclick: async () => {
      const perse = ctx.master.scelteUltimoLivello();
      const ok = await apri('finestrella-master', `Annullare il livello ${livello}?`, (fine) => [
        h('p', {}, perse.length ? 'Si perdono queste scelte del livello:' : 'Il livello non ha scelte oltre al numero.'),
        perse.length ? h('ul', {}, perse.map((x) => h('li', {}, x))) : null,
        h('p', { class: 'nota' }, 'Il file di prima resta nelle copie del master (backup-master/) e la modifica va nel registro.'),
        h('div', { class: 'riga-azioni finestrella-azioni' }, h('button', { type: 'button', class: 'btn', onclick: () => fine(false) }, 'Lascia com’è'),
          h('button', { type: 'button', class: 'btn primario', onclick: () => fine(true) }, `Annulla il livello ${livello}`)),
      ]);
      if (ok) ctx.master.annullaUltimoLivello();
    } }, 'Annulla l’ultimo livello'));
    azioni.push(h('button', { type: 'button', class: 'btn btn-piccolo', onclick: async () => {
      const motivo = await chiediMotivoObbligatorio({ titolo: 'Tieni come concessione', testo: `Il livello ${livello} resta: i PX non cambiano e il passaggio si registra come concesso dal Direttore.`, conferma: 'Tieni come concessione' });
      if (motivo) ctx.master.concediLivello({ livello, motivo });
    } }, 'Tieni come concessione'));
  } else if (!permesso.ok && !permesso.concessione) {
    azioni.push(h('button', { type: 'button', class: 'btn btn-piccolo', onclick: async () => {
      const motivo = await chiediMotivoObbligatorio({ titolo: `Concedi il passaggio al livello ${permesso.prossimo}`, testo: 'Il giocatore potrà salire senza i PX richiesti. I PX non cambiano; il motivo va nel registro e il giocatore non lo vede.', conferma: `Concedi il livello ${permesso.prossimo}` });
      if (motivo) ctx.master.concediLivello({ livello: permesso.prossimo, motivo });
    } }, `Concedi il passaggio al livello ${permesso.prossimo}`));
  }
  return azioni.length ? h('div', { class: 'riga-azioni livello-master' }, h('small', { class: 'nota' }, 'Direttore:'), ...azioni) : null;
}
