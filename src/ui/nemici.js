// Tavolo del Master, pezzo 3 (docs/tavolo-direttore.md): bestiario nella plancia, editor minimo di un
// tipo di nemico e carta compatta di un nemico nello scontro. L'editor si genera dal formato
// (data/formato_nemici.json): un campo nuovo nel formato compare da sé nel modulo. Le regole dei nemici
// nello scontro sono in src/scontro.js; qui presentazione e salvataggio (server.mjs → /api/nemici).
import { h } from './dom.js';
import { riempimento } from '../interfaccia.js';
import { validaNemico, formattaErrore } from '../validate.js';
import { nemicoVuoto, voceVuota, pulisciNemico, idDaNome } from '../nemici.js';
import { variaPvNemico, cambiaStatoNemico } from '../scontro.js';

const numero = (n) => (n < 0 ? `−${-n}` : String(n));

/** Elenco del bestiario dal server: [{ file, mtime, nemico } | { file, mtime, errore }]. */
export async function elencoNemici() {
  const r = await fetch('api/nemici', { cache: 'no-store' });
  if (!r.ok) throw new Error(`bestiario non leggibile (${r.status})`);
  return r.json();
}

async function salvaNemico(n) {
  const r = await fetch(`api/nemici/${encodeURIComponent(n.id)}`, { method: 'PUT', body: JSON.stringify(n), headers: { 'Content-Type': 'application/json' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.errore ?? `errore ${r.status}`), { errori: j.errori });
  return j;
}

// etichette dei campi del formato: presentazione (i campi e le regole stanno nel formato)
const ETICHETTE = {
  pv: 'PV', pm: 'PM', ar: 'AR', va: 'VA', ac: 'AC', id: 'Identificativo (nome del file)', portata_q: 'Portata (Q)', gittata_q: 'Gittata (Q)',
  costo_pm: 'Costo (PM)', immunita: 'Immunità', modalita: 'Modalità', proprieta: 'Proprietà', magica: 'di cui magica',
  totale: 'totale', difese: 'Difese', iniziativa: 'Iniziativa', movimento: 'Movimento (Q)', salvezze: 'Prove Salvezza',
};
const etichetta = (k) => ETICHETTE[k] ?? (k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' '));

/** Nomi leggibili dei valori ammessi (Stati, Salvezze, modalità di fuoco) dai dati. */
function nomiValori(dati) {
  return {
    stati: Object.fromEntries((dati.regole.stati?.elenco ?? []).map((s) => [s.id, s.nome])),
    salvezze: Object.fromEntries((dati.caratteristiche.salvezze ?? []).map((s) => [s.id, s.nome])),
    modalita_di_fuoco: Object.fromEntries(Object.entries(dati.regole.modalita_di_fuoco ?? {}).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [k, `${k} · ${v.nome}`])),
  };
}
function valoriAmmessi(s, dati) {
  if (s.valori) return s.valori;
  const fonti = {
    caratteristiche: dati.caratteristiche.caratteristiche.map((c) => c.sigla),
    salvezze: dati.caratteristiche.salvezze.map((x) => x.id),
    stati: (dati.regole.stati?.elenco ?? []).map((x) => x.id),
    modalita_di_fuoco: Object.keys(dati.regole.modalita_di_fuoco ?? {}).filter((k) => !k.startsWith('_')),
    nature_danno: dati.formato_nemici.nature_danno,
  };
  return fonti[s.valori_da ?? s.chiavi_da] ?? [];
}

/**
 * Riquadro del bestiario: tipi validi con «Modifica», file non validi con gli errori, «Nuovo tipo».
 * @param voci src/nemici.js → vociBestiario
 */
export function pannelloBestiario(ctx, voci, { aperto, onToggle, salvato }) {
  const validi = voci.filter((v) => v.nemico);
  const rotti = voci.filter((v) => !v.nemico);
  return h('details', { class: 'riquadro bestiario', open: aperto, ontoggle: (e) => onToggle(e.target.open) },
    h('summary', {}, h('strong', {}, 'Bestiario'), ` (${validi.length} tip${validi.length === 1 ? 'o' : 'i'}${rotti.length ? `, ${rotti.length} file non valid${rotti.length === 1 ? 'o' : 'i'}` : ''})`),
    h('p', { class: 'nota' }, 'Tipi di nemico della campagna, in nemici/ sul server: numeri già fatti, come li scrive il master. Il formato dei campi è una proposta in attesa di Davide (per-davide A.73).'),
    h('div', { class: 'riga-azioni' }, h('button', { type: 'button', class: 'btn', onclick: () => apriEditorNemico(ctx, null, voci, salvato) }, 'Nuovo tipo')),
    validi.length ? h('ul', { class: 'bestiario-elenco' }, validi.map((v) => h('li', {},
      h('strong', {}, v.nemico.nome), h('small', { class: 'nota' }, ` ${v.file}`), ' · ',
      `PV ${v.nemico.pv} · AR ${v.nemico.ar.totale} · Difese ${v.nemico.difese} · Iniziativa ${numero(v.nemico.iniziativa)} · ${v.nemico.attacchi.length} attacc${v.nemico.attacchi.length === 1 ? 'o' : 'hi'} `,
      h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => apriEditorNemico(ctx, v.nemico, voci, salvato) }, 'Modifica'))))
      : h('p', { class: 'vuoto' }, 'Nessun tipo di nemico: «Nuovo tipo» ne crea uno.'),
    rotti.length ? h('div', { class: 'riquadro attenzione' },
      h('p', {}, h('strong', {}, 'File non validi: '), 'restano fuori dagli scontri finché non si correggono (a mano o salvandoli dall’editor).'),
      h('ul', {}, rotti.map((v) => h('li', {}, h('strong', {}, v.file), h('ul', {}, v.errori.slice(0, 6).map((e) => h('li', {}, e)), v.errori.length > 6 ? h('li', {}, `… altri ${v.errori.length - 6}`) : null))))) : null);
}

/**
 * Editor di un tipo di nemico in una finestra modale (fuori dalla plancia, che si ridisegna ogni pochi
 * secondi): un modulo generato dal formato, la validazione e il salvataggio in nemici/.
 */
export function apriEditorNemico(ctx, nemico, voci, salvato) {
  const dati = ctx.dati;
  const formato = dati.formato_nemici;
  const nomi = nomiValori(dati);
  const nuovo = !nemico;
  const bozza = nemico ? structuredClone(nemico) : nemicoVuoto(dati);
  let errori = [];
  let idToccato = !nuovo;
  const finestra = h('dialog', { class: 'pannello-scheda editor-nemico', 'aria-labelledby': 'editor-nemico-titolo' });
  finestra.addEventListener('close', () => finestra.remove());

  // un campo del formato; `cont` è l'oggetto che lo contiene, `k` la chiave, `percorso` per gli errori
  const campo = (s, cont, k, percorso, disegna) => {
    const err = errori.filter((e) => e.chiave === percorso);
    const marca = err.length ? h('small', { class: 'motivo' }, ` ${err.map((e) => e.problema).join('; ')}`) : null;
    const tit = s.descrizione ?? null;
    const lab = (figlio) => h('label', { class: `campo-nemico${err.length ? ' con-errore' : ''}`, title: tit }, h('span', {}, etichetta(k), s.obbligatorio ? ' *' : ''), figlio, marca);
    const imposta = (v) => { if (v === undefined) delete cont[k]; else cont[k] = v; };
    switch (s.tipo) {
      case 'costante':
        cont[k] = s.valore;
        return null;
      case 'testo': case 'dadi':
        return lab(h('input', {
          type: 'text', value: cont[k] ?? '', disabled: k === 'id' && !nuovo, maxlength: 400, placeholder: s.tipo === 'dadi' ? '1d8+2' : null,
          oninput: (e) => {
            imposta(e.target.value === '' ? undefined : e.target.value);
            if (k === 'id') idToccato = true;
            if (k === 'nome' && percorso === 'nome' && nuovo && !idToccato) { bozza.id = idDaNome(e.target.value); const c = finestra.querySelector('[data-campo="id"]'); if (c) c.value = bozza.id; }
          },
          dataset: { campo: percorso },
        }));
      case 'intero':
        return lab(h('input', {
          type: 'number', step: 1, min: s.min ?? null, max: s.max ?? null, inputmode: 'numeric', class: 'input-numero', value: cont[k] ?? '',
          oninput: (e) => { const v = e.target.value; imposta(v === '' ? undefined : (Number.isInteger(Number(v)) ? Number(v) : v)); },
        }));
      case 'scelta': {
        const ammessi = valoriAmmessi(s, dati);
        return lab(h('select', { onchange: (e) => { imposta(e.target.value === '' ? undefined : e.target.value); disegna(); } },
          h('option', { value: '', selected: cont[k] === undefined }, '—'),
          ammessi.map((v) => h('option', { value: v, selected: cont[k] === v }, nomi[s.valori_da]?.[v] ?? v))));
      }
      case 'lista': {
        const v = s.voce;
        if (v.tipo === 'scelta') {
          // più scelte: caselle
          const scelti = new Set(cont[k] ?? []);
          return h('fieldset', { class: `campo-nemico gruppo${err.length ? ' con-errore' : ''}`, title: tit }, h('legend', {}, etichetta(k), s.obbligatorio ? ' *' : ''),
            h('div', { class: 'caselle-nemico' }, valoriAmmessi(v, dati).map((x) => h('label', {}, h('input', {
              type: 'checkbox', checked: scelti.has(x),
              onchange: (e) => { if (e.target.checked) scelti.add(x); else scelti.delete(x); imposta(scelti.size ? valoriAmmessi(v, dati).filter((y) => scelti.has(y)) : (s.obbligatorio ? [] : undefined)); },
            }), ` ${nomi[v.valori_da]?.[x] ?? x}`))), marca,
            errori.filter((e) => e.chiave.startsWith(`${percorso}[`)).map((e) => h('small', { class: 'motivo' }, ` ${e.chiave}: ${e.problema}`)));
        }
        if (v.tipo !== 'oggetto') {
          // testi: separati da virgola
          return lab(h('input', { type: 'text', value: (cont[k] ?? []).join(', '), placeholder: 'separati da virgola', oninput: (e) => {
            const parti = e.target.value.split(',').map((x) => x.trim()).filter(Boolean);
            imposta(parti.length ? parti : (s.obbligatorio ? [] : undefined));
          } }));
        }
        const voci = cont[k] ?? [];
        return h('fieldset', { class: 'campo-nemico gruppo', title: tit }, h('legend', {}, etichetta(k), s.obbligatorio ? ' *' : '', marca),
          voci.map((x, i) => h('fieldset', { class: 'voce-nemico' },
            h('legend', {}, `${etichetta(k)} ${i + 1}`, ' ', h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => { voci.splice(i, 1); disegna(); } }, 'Togli')),
            campiOggetto(v, x, `${percorso}[${i}]`, disegna))),
          h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => { cont[k] = [...voci, voceVuota(s)]; disegna(); } }, `Aggiungi a ${etichetta(k)}`));
      }
      case 'oggetto':
        cont[k] ??= {};
        return h('fieldset', { class: 'campo-nemico gruppo', title: tit }, h('legend', {}, etichetta(k), s.obbligatorio ? ' *' : '', marca), campiOggetto(s, cont[k], percorso, disegna));
      case 'mappa': {
        cont[k] ??= {};
        const m = cont[k];
        return h('fieldset', { class: `campo-nemico gruppo${err.length ? ' con-errore' : ''}`, title: tit }, h('legend', {}, etichetta(k), s.obbligatorio ? ' *' : '', marca),
          h('div', { class: 'riga-mappa' }, valoriAmmessi(s, dati).map((c) => campo({ ...s.valore, obbligatorio: !!s.tutte }, m, c, `${percorso}.${c}`, disegna))
            .map((el, i) => { const c = valoriAmmessi(s, dati)[i]; const sp = el?.querySelector('span'); if (sp && nomi[s.chiavi_da]?.[c]) sp.textContent = `${nomi[s.chiavi_da][c]}${s.tutte ? ' *' : ''}`; return el; })));
      }
      default:
        return null;
    }
  };
  const campiOggetto = (s, obj, percorso, disegna) => {
    const vale = (cond) => Object.entries(cond ?? {}).every(([f, x]) => obj[f] === x);
    return h('div', { class: 'campi-nemico' }, Object.entries(s.campi)
      .filter(([, c]) => !c.ammesso_se || vale(c.ammesso_se))
      .map(([k, c]) => campo(c.richiesto_se && vale(c.richiesto_se) ? { ...c, obbligatorio: true } : c, obj, k, percorso ? `${percorso}.${k}` : k, disegna)));
  };

  const disegna = () => {
    finestra.replaceChildren(h('form', { class: 'pannello-contenuto', method: 'dialog', onsubmit: (e) => e.preventDefault() },
      h('header', { class: 'pannello-testa' },
        h('h2', { id: 'editor-nemico-titolo' }, nuovo ? 'Nuovo tipo di nemico' : `Modifica: ${nemico.nome}`),
        h('button', { type: 'button', class: 'btn tondo chiudi', 'aria-label': 'Chiudi', onclick: () => finestra.close() }, '×')),
      h('p', { class: 'nota' }, 'Campi di data/formato_nemici.json (* obbligatori): numeri già fatti, nessun calcolo. Il formato è una proposta in attesa di Davide (per-davide A.73); tieni il puntatore su un campo per la sua descrizione.'),
      errori.length ? h('div', { class: 'riquadro attenzione', role: 'alert' }, h('p', {}, h('strong', {}, `Da correggere (${errori.length}):`)),
        h('ul', {}, errori.map((e) => h('li', {}, formattaErrore({ ...e, file: '' }).replace(/^ › /, ''))))) : null,
      campiOggetto({ campi: formato.campi }, bozza, '', disegna),
      h('div', { class: 'riga-azioni' },
        h('button', { type: 'button', class: 'btn primario', onclick: salva }, 'Salva in nemici/'),
        h('button', { type: 'button', class: 'btn', onclick: () => finestra.close() }, 'Annulla'))));
  };
  const salva = async () => {
    if (nuovo && !bozza.id && bozza.nome) bozza.id = idDaNome(bozza.nome);
    const n = pulisciNemico(bozza, dati);
    errori = validaNemico(n, dati, '');
    if (!errori.length && nuovo && voci.some((v) => v.file === `${n.id}.json`) && !confirm(`In nemici/ c’è già ${n.id}.json: sostituirlo?`)) return;
    if (errori.length) { disegna(); finestra.querySelector('[role="alert"]')?.scrollIntoView({ block: 'nearest' }); return; }
    try {
      await salvaNemico(n);
      finestra.close();
      salvato(n);
    } catch (e) {
      errori = e.errori ?? [{ chiave: '', problema: e.message }];
      disegna();
    }
  };
  disegna();
  document.body.append(finestra);
  finestra.showModal();
  finestra.querySelector('input:not([disabled])')?.focus();
}

const barraPv = (p, modifica) => h('div', { class: 'plancia-barra risorsa-pv' },
  h('span', { class: 'barra-etichetta' }, 'PV'),
  h('span', { class: 'barra-traccia', role: 'meter', 'aria-label': `PV di ${p.nome}`, 'aria-valuemin': 0, 'aria-valuemax': p.pv.massimo, 'aria-valuenow': p.pv.attuali },
    h('span', { class: 'barra-riempimento', style: `width: ${riempimento(p.pv.attuali, p.pv.massimo)}%` })),
  h('span', { class: 'barra-numero' }, `${p.pv.attuali} / ${p.pv.massimo}`),
  h('span', { class: 'pv-nemico-pulsanti' },
    h('button', { type: 'button', class: 'btn btn-piccolo', 'aria-label': `${p.nome}: −1 PV`, disabled: p.pv.attuali <= 0, onclick: () => modifica((x) => variaPvNemico(x, p.id, -1)) }, '−'),
    h('button', { type: 'button', class: 'btn btn-piccolo', 'aria-label': `${p.nome}: +1 PV`, disabled: p.pv.attuali >= p.pv.massimo, onclick: () => modifica((x) => variaPvNemico(x, p.id, 1)) }, '+')));

/** Carta compatta di un nemico nello scontro: PV con − e +, AR, Difese, attacchi, Stati. */
export function cartaNemico(ctx, p, { modifica, diTurnoOra = false }) {
  const n = p.scheda;
  const dati = ctx.dati;
  const stati = dati.regole.stati?.elenco ?? [];
  const nomeStato = (id) => stati.find((s) => s.id === id)?.nome ?? id;
  const salvezze = dati.caratteristiche.salvezze.map((s) => `${s.nome.slice(0, 3)} ${n.salvezze?.[s.id] ?? '—'}`).join(' · ');
  const mov = n.movimento ?? {};
  const aggiungibili = stati.filter((s) => !p.stati.includes(s.id) && !(n.immunita ?? []).includes(s.id));
  const attacco = (a) => h('li', {},
    h('span', {}, a.nome),
    h('span', {}, ' VA ', h('strong', {}, numero(a.va)), ' · danno ', h('strong', {}, a.danno), ` ${a.natura}`,
      a.tipo === 'ravvicinato' ? ` · portata ${a.portata_q} Q` : ` · gittata ${a.gittata_q} Q`,
      a.modalita?.length ? ` · ${a.modalita.join(', ')}` : '', a.ac ? ` · AC ${a.ac}` : '',
      a.proprieta?.length ? h('small', { class: 'nota' }, ` · ${a.proprieta.join(', ')}`) : null,
      a.note ? h('small', { class: 'nota' }, ` · ${a.note}`) : null));
  return h('article', { class: `carta-plancia carta-nemico lato-${p.lato}${diTurnoOra ? ' di-turno' : ''}${p.pv.attuali === 0 ? ' a-zero' : ''}`, 'aria-label': `${p.nome}, ${p.lato}${diTurnoOra ? ', di turno' : ''}` },
    h('header', { class: 'carta-plancia-testa' }, h('div', {},
      h('h2', {}, p.nome),
      h('p', { class: 'nota' }, h('span', { class: 'nome-lato' }, p.lato), ` · ${n.nome}`, n.fonte ? ` · ${n.fonte}` : ''))),
    barraPv(p, modifica),
    n.pm !== undefined ? h('p', { class: 'nota' }, `PM ${n.pm}`) : null,
    h('p', { class: 'plancia-valori' },
      h('span', {}, 'AR ', h('strong', { class: 'pillola-plancia pillola-ar' }, String(n.ar.totale)),
        n.ar.magica !== n.ar.totale ? h('small', { class: 'nota' }, ' · contro Etereo ', h('strong', { class: 'pillola-plancia' }, String(n.ar.magica))) : null),
      h('span', {}, ' · Difese ', h('strong', { class: 'pillola-plancia' }, numero(n.difese))),
      h('span', {}, ' · Iniziativa ', h('strong', { class: 'pillola-plancia' }, numero(n.iniziativa)))),
    h('p', { class: 'nota' }, `Salvezze: ${salvezze} · Movimento ${mov.passo} / ${mov.corsa ?? mov.passo * 2} / ${mov.scatto ?? mov.passo * 3} Q`),
    h('p', { class: 'plancia-stati' },
      p.stati.map((id) => h('span', { class: 'etichetta stato-plancia' }, nomeStato(id), ' ',
        h('button', { type: 'button', class: 'btn-link', 'aria-label': `Togli ${nomeStato(id)} a ${p.nome}`, onclick: () => modifica((x) => cambiaStatoNemico(x, p.id, stati.find((s) => s.id === id), false)) }, '×'))),
      aggiungibili.length ? h('select', { class: 'aggiungi-stato', 'aria-label': `Aggiungi uno Stato a ${p.nome}`, onchange: (e) => {
        const s = stati.find((x) => x.id === e.target.value);
        if (s) modifica((x) => cambiaStatoNemico(x, p.id, s, true));
      } }, h('option', { value: '' }, '+ Stato'), aggiungibili.map((s) => h('option', { value: s.id }, s.nome))) : null),
    n.immunita?.length ? h('p', { class: 'nota' }, `Immune a: ${n.immunita.map(nomeStato).join(', ')}`) : null,
    n.attacchi.length ? h('ul', { class: 'plancia-armi' }, n.attacchi.map(attacco)) : h('p', { class: 'nota' }, 'Nessun attacco.'),
    n.incantesimi?.length ? h('p', { class: 'nota' }, 'Incantesimi: ', n.incantesimi.map((i) => [i.nome, i.va !== undefined ? ` VA ${i.va}` : '', i.costo_pm !== undefined ? ` (${i.costo_pm} PM)` : ''].join('')).join(', ')) : null,
    n.note ? h('p', { class: 'nota' }, n.note) : null);
}
