// Tavolo del Master, pezzo 3 (docs/tavolo-direttore.md): bestiario nella plancia, editor minimo di un
// tipo di nemico e carta compatta di un nemico nello scontro. L'editor si genera dal formato
// (data/formato_nemici.json): un campo nuovo nel formato compare da sé nel modulo. Le regole dei nemici
// nello scontro sono in src/scontro.js; qui presentazione e salvataggio (server.mjs → /api/nemici).
import { h } from './dom.js';
import { riempimento } from '../interfaccia.js';
import { validaNemico, formattaErrore, sorgentiNemico } from '../validate.js';
import { nemicoVuoto, voceVuota, pulisciNemico, idDaNome, testoMovimento } from '../nemici.js';
import { variaPvNemico, variaPmNemico, cambiaStatoNemico } from '../scontro.js';
import { statoIncantesimoNemico } from '../nemico-lancio.js';
import { nomeFerita } from '../danno.js';
import { nemicoDaPg } from '../nemico-da-pg.js';
import { elencoCartella, leggiCartella } from './cartella.js';
import { ultimiPerPersonaggio } from '../cartella.js';

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
  azioni: 'Azioni per Round', principali: 'Azioni Principali', abilita: 'Abilità', capacita: 'Capacità speciali e Talenti', livello: 'Livello della versione',
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
  // le stesse fonti del validatore (src/validate.js): Stati, Salvezze, Contromisure, Abilità…
  return sorgentiNemico(dati)[s.valori_da ?? s.chiavi_da] ?? [];
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
    h('p', { class: 'nota' }, 'Tipi di nemico della campagna, in nemici/ sul server: numeri già fatti, come li scrive il master, nel formato deciso da Davide (per-davide A.73).'),
    h('div', { class: 'riga-azioni' },
      h('button', { type: 'button', class: 'btn', onclick: () => apriEditorNemico(ctx, null, voci, salvato) }, 'Nuovo tipo'),
      h('button', { type: 'button', class: 'btn', title: 'Un tipo di nemico con i numeri di un personaggio (da personaggi/ o dal computer): il personaggio non cambia', onclick: () => apriDaPg(ctx, voci, salvato) }, 'Crea da un PG')),
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
export function apriEditorNemico(ctx, nemico, voci, salvato, { modello = null, origine = null, avvisi = [] } = {}) {
  const dati = ctx.dati;
  const formato = dati.formato_nemici;
  const nomi = nomiValori(dati);
  const nuovo = !nemico;
  // «Crea da un PG»: un tipo nuovo già compilato dal convertitore (src/nemico-da-pg.js), da rinominare
  const bozza = nemico ? structuredClone(nemico) : modello ? structuredClone(modello) : nemicoVuoto(dati);
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
        // A.73, decisione 9: un valore alternativo al numero («non_consentito»), con una casella
        if (s.oppure?.length) {
          const alt = s.oppure[0];
          const attivo = cont[k] === alt;
          return lab(h('span', { class: 'intero-oppure' },
            h('input', {
              type: 'number', step: 1, min: s.min ?? null, inputmode: 'numeric', class: 'input-numero', value: attivo ? '' : (cont[k] ?? ''), disabled: attivo,
              placeholder: s.obbligatorio ? null : 'dal Passo',
              oninput: (e) => { const v = e.target.value; imposta(v === '' ? undefined : (Number.isInteger(Number(v)) ? Number(v) : v)); },
            }),
            h('label', { class: 'casella-oppure' }, h('input', { type: 'checkbox', checked: attivo, onchange: (e) => { imposta(e.target.checked ? alt : undefined); disegna(); } }), ' ' + alt.replace(/_/g, ' '))));
        }
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
        h('h2', { id: 'editor-nemico-titolo' }, nuovo ? (origine ? `Nuovo tipo di nemico da ${origine}` : 'Nuovo tipo di nemico') : `Modifica: ${nemico.nome}`),
        h('button', { type: 'button', class: 'btn tondo chiudi', 'aria-label': 'Chiudi', onclick: () => finestra.close() }, '×')),
      h('p', { class: 'nota' }, 'Campi di data/formato_nemici.json (* obbligatori): numeri già fatti, nessun calcolo; Corsa e Scatto vuoti si calcolano dal Passo (per-davide A.73). Tieni il puntatore su un campo per la sua descrizione.'),
      origine ? h('p', { class: 'riquadro ok' }, `Numeri calcolati dalla scheda di ${origine} con le regole attuali (PV pieni, nessuno Stato). Dai un nome al tipo e salvalo: il personaggio non cambia.`) : null,
      avvisi.length ? h('div', { class: 'riquadro attenzione' }, h('p', {}, h('strong', {}, 'Da controllare:')), h('ul', {}, avvisi.map((x) => h('li', {}, x)))) : null,
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

const barraPm = (p, modifica) => h('div', { class: 'plancia-barra risorsa-pm' },
  h('span', { class: 'barra-etichetta' }, 'PM'),
  h('span', { class: 'barra-traccia', role: 'meter', 'aria-label': `PM di ${p.nome}`, 'aria-valuemin': 0, 'aria-valuemax': p.pm.massimo, 'aria-valuenow': p.pm.attuali },
    h('span', { class: 'barra-riempimento', style: `width: ${riempimento(p.pm.attuali, p.pm.massimo)}%` })),
  h('span', { class: 'barra-numero' }, `${p.pm.attuali} / ${p.pm.massimo}`),
  h('span', { class: 'pv-nemico-pulsanti' },
    h('button', { type: 'button', class: 'btn btn-piccolo', 'aria-label': `${p.nome}: −1 PM`, disabled: p.pm.attuali <= 0, onclick: () => modifica((x) => variaPmNemico(x, p.id, -1)) }, '−'),
    h('button', { type: 'button', class: 'btn btn-piccolo', 'aria-label': `${p.nome}: +1 PM`, disabled: p.pm.attuali >= p.pm.massimo, onclick: () => modifica((x) => variaPmNemico(x, p.id, 1)) }, '+')));

/** «1 Azione Principale e 1 di Movimento» dal campo azioni (A.73, decisione 5). */
function testoAzioni(a) {
  const pl = (n, uno, piu) => `${n} ${n === 1 ? uno : piu}`;
  return `${pl(a.principali, 'Azione Principale', 'Azioni Principali')} e ${a.movimento} di Movimento${a.eccezioni ? ` (${a.eccezioni})` : ''}`;
}

/**
 * Carta compatta di un nemico nello scontro: PV e PM con − e +, Ferita e Menomazioni (A.73, decisione 7), AR,
 * Difese, Azioni, Movimento, Resistenze (Immunità e Contromisure), Abilità, attacchi, incantesimi con «Lancia!»
 * (decisione 8) e capacità come promemoria.
 */
export function cartaNemico(ctx, p, { modifica, diTurnoOra = false, onColpito = null, onAttacca = null, onLancia = null, onRiduci = null }) {
  const n = p.scheda;
  const dati = ctx.dati;
  // a 0 PV la carta si riduce a una riga (nome, PV, Ferita) e va in fondo; un clic la riapre (src/scontro.js → conPv)
  if (p.pv.attuali === 0 && p.ridotta) {
    const fer = p.ferite ? ` · Ferita ${nomeFerita(p.ferite, dati)}` : '';
    return h('article', { class: `carta-plancia carta-nemico carta-ridotta lato-${p.lato} a-zero`, 'aria-label': `${p.nome}, a 0 PV` },
      h('button', { type: 'button', class: 'btn-link riga-ridotta', 'aria-expanded': 'false', title: 'Riapri la carta', onclick: () => onRiduci?.(false) },
        h('span', { class: 'freccia' }, '▸ '), h('strong', {}, p.nome), ` · PV 0 / ${p.pv.massimo}${fer}`));
  }
  const stati = dati.regole.stati?.elenco ?? [];
  const nomeStato = (id) => stati.find((s) => s.id === id)?.nome ?? id;
  const salvezze = dati.caratteristiche.salvezze.map((s) => `${s.nome.slice(0, 3)} ${n.salvezze?.[s.id] ?? '—'}`).join(' · ');
  const aggiungibili = stati.filter((s) => !p.stati.includes(s.id) && !(n.immunita ?? []).includes(s.id));
  const ferite = p.ferite ?? 0;
  const ferita = ferite ? dati.regole.ferite.stati[ferite - 1] : null;
  const attacco = (a) => h('li', {},
    h('span', {}, a.nome),
    h('span', {}, ' VA ', h('strong', {}, numero(a.va)), ' · danno ', h('strong', {}, a.danno), ` ${a.natura}`,
      a.tipo === 'ravvicinato' ? ` · portata ${a.portata_q} Q` : ` · gittata ${a.gittata_q} Q`,
      a.modalita?.length ? ` · ${a.modalita.join(', ')}` : '', a.ac ? ` · AC ${a.ac}` : '',
      a.proprieta?.length ? h('small', { class: 'nota' }, ` · ${a.proprieta.join(', ')}`) : null,
      a.note ? h('small', { class: 'nota' }, ` · ${a.note}`) : null));
  // A.73, decisione 8: completi con «Lancia!», incompleti come promemoria con il motivo
  const incantesimo = (i, k) => {
    const st = statoIncantesimoNemico(i, dati);
    const senzaPm = !p.pm ? 'il nemico non ha PM' : p.pm.attuali < i.costo_pm ? `PM insufficienti: ${p.pm.attuali}` : null;
    return h('li', {},
      h('span', {}, i.nome, i.livello ? ` (livello ${i.livello})` : ''),
      h('span', {}, i.va !== undefined ? [' VA ', h('strong', {}, numero(i.va))] : null, i.costo_pm !== undefined ? ` · ${i.costo_pm} PM` : '',
        i.note ? h('small', { class: 'nota' }, ` · ${i.note}`) : null,
        st.completo && onLancia
          ? [' ', h('button', { type: 'button', class: 'btn btn-piccolo btn-lancia', disabled: !!senzaPm, title: senzaPm, onclick: () => onLancia(k) }, 'Lancia!')]
          : h('small', { class: 'nota' }, ` · promemoria${st.motivo ? `: ${st.motivo}` : ''}`)));
  };
  const resistenze = [
    n.immunita?.length ? `Immune a: ${n.immunita.map(nomeStato).join(', ')}` : null,
    n.contromisure?.length ? `Contromisure: ${n.contromisure.map((c) => (c.valore ? `${c.nome} ${c.valore}` : c.nome)).join(', ')}` : null,
  ].filter(Boolean);
  return h('article', { class: `carta-plancia carta-nemico lato-${p.lato}${diTurnoOra ? ' di-turno' : ''}${p.pv.attuali === 0 ? ' a-zero' : ''}`, 'aria-label': `${p.nome}, ${p.lato}${diTurnoOra ? ', di turno' : ''}` },
    h('header', { class: 'carta-plancia-testa' }, h('div', {},
      h('h2', {}, p.nome),
      h('p', { class: 'nota' }, h('span', { class: 'nome-lato' }, p.lato), ` · ${n.nome}`, n.fonte ? ` · ${n.fonte}` : '')),
      // pezzo 4: «Colpito» (src/ui/colpo.js)
      h('span', { class: 'pulsanti-carta' },
        p.pv.attuali === 0 && onRiduci ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Riduci la carta a una riga, in fondo', onclick: () => onRiduci(true) }, 'Riduci') : null,
        // pezzo 5: «Attacca» (src/ui/attacco-nemico.js)
        onAttacca ? h('button', { type: 'button', class: 'btn btn-piccolo btn-attacca', onclick: onAttacca }, 'Attacca') : null,
        onColpito ? h('button', { type: 'button', class: 'btn btn-piccolo btn-colpito', onclick: onColpito }, 'Colpito') : null)),
    barraPv(p, modifica),
    p.pm ? barraPm(p, modifica) : n.pm !== undefined ? h('p', { class: 'nota' }, `PM ${n.pm}`) : null,
    // A.73, decisione 7: Stato di Ferita e Menomazioni come i PG (§5.14, §5.14.1); nessun Affaticamento
    ferite || p.menomazioni?.length ? h('p', { class: 'plancia-condizioni' },
      ferite ? h('span', { class: 'etichetta condizione-plancia' }, `Ferita ${nomeFerita(ferite, dati)}${ferita ? ` (${numero(ferita.penalita)})` : ''}`) : null,
      (p.menomazioni ?? []).map((m) => [' ', h('span', { class: 'etichetta condizione-plancia menomazione-plancia', title: 'PS di Tempra per la Menomazione (§5.14.1)' }, `Menomazione (${m.stato}, PS di Tempra): ${m.testo}`)])) : null,
    h('p', { class: 'plancia-valori' },
      h('span', {}, 'AR ', h('strong', { class: 'pillola-plancia pillola-ar' }, String(n.ar.totale)),
        n.ar.magica !== n.ar.totale ? h('small', { class: 'nota' }, ' · contro Etereo ', h('strong', { class: 'pillola-plancia' }, String(n.ar.magica))) : null),
      h('span', {}, ' · Difese ', h('strong', { class: 'pillola-plancia' }, numero(n.difese))),
      h('span', {}, ' · Iniziativa ', h('strong', { class: 'pillola-plancia' }, numero(n.iniziativa)))),
    n.azioni ? h('p', { class: 'nota azioni-nemico' }, `Azioni per Round: ${testoAzioni(n.azioni)}`) : null,
    h('p', { class: 'nota' }, `Salvezze: ${salvezze} · ${testoMovimento(n, dati)}`),
    h('p', { class: 'plancia-stati' },
      p.stati.map((id) => h('span', { class: 'etichetta stato-plancia' }, nomeStato(id), ' ',
        h('button', { type: 'button', class: 'btn-link', 'aria-label': `Togli ${nomeStato(id)} a ${p.nome}`, onclick: () => modifica((x) => cambiaStatoNemico(x, p.id, stati.find((s) => s.id === id), false)) }, '×'))),
      aggiungibili.length ? h('select', { class: 'aggiungi-stato', 'aria-label': `Aggiungi uno Stato a ${p.nome}`, onchange: (e) => {
        const s = stati.find((x) => x.id === e.target.value);
        if (s) modifica((x) => cambiaStatoNemico(x, p.id, s, true));
      } }, h('option', { value: '' }, '+ Stato'), aggiungibili.map((s) => h('option', { value: s.id }, s.nome))) : null),
    resistenze.length ? h('p', { class: 'nota resistenze-nemico' }, resistenze.join(' · ')) : null,
    n.abilita?.length ? h('p', { class: 'nota abilita-nemico' }, 'Abilità: ', n.abilita.map((a) => `${a.nome} ${numero(a.va)}`).join(' · ')) : null,
    n.attacchi.length ? h('ul', { class: 'plancia-armi' }, n.attacchi.map(attacco)) : h('p', { class: 'nota' }, 'Nessun attacco.'),
    n.incantesimi?.length ? h('ul', { class: 'plancia-armi incantesimi-nemico', 'aria-label': 'Incantesimi' }, n.incantesimi.map(incantesimo)) : null,
    n.capacita?.length ? h('details', { class: 'capacita-nemico' }, h('summary', {}, `Capacità speciali (${n.capacita.length})`),
      h('ul', { class: 'nota' }, n.capacita.map((c) => h('li', {}, h('strong', {}, c.nome), `: ${c.effetto}`, c.costo ? ` · costo ${c.costo}` : '', c.limiti ? ` · ${c.limiti}` : '')))) : null,
    n.note ? h('p', { class: 'nota' }, n.note) : null);
}

/**
 * «Crea da un PG»: sceglie un personaggio (l'ultimo file di ognuno in personaggi/, o un file dal computer), lo
 * converte con src/nemico-da-pg.js e apre l'editor del nemico già compilato. Il file del PG si legge soltanto.
 */
export async function apriDaPg(ctx, voci, salvato) {
  const finestra = h('dialog', { class: 'pannello-scheda scelta-pg-nemico', 'aria-labelledby': 'scelta-pg-titolo' });
  finestra.addEventListener('close', () => finestra.remove());
  let errore = null;
  let lista = null;
  const converti = (testo, origine) => {
    const r = nemicoDaPg(testo, ctx.dati);
    if (r.errore) { errore = `${origine}: ${r.errore}`; disegna(); return; }
    finestra.close();
    apriEditorNemico(ctx, null, voci, salvato, { modello: r.nemico, origine: r.nemico.nome, avvisi: r.avvisi });
  };
  const daCartella = async (f) => {
    try { converti(await leggiCartella(f.file), f.file); } catch (e) { errore = `${f.file}: ${e.message}`; disegna(); }
  };
  const scelta = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
    if (f) converti(await f.text(), f.name);
  } });
  const disegna = () => {
    finestra.replaceChildren(h('div', { class: 'pannello-contenuto' },
      h('header', { class: 'pannello-testa' },
        h('h2', { id: 'scelta-pg-titolo' }, 'Crea un nemico da un PG'),
        h('button', { type: 'button', class: 'btn tondo chiudi', 'aria-label': 'Chiudi', onclick: () => finestra.close() }, '×')),
      h('p', { class: 'nota' }, 'PV, AR, Difese, Iniziativa, Movimento, Salvezze e attacchi vengono dalla scheda del personaggio, come li calcola l’app. Poi si apre l’editor: dai un nome al tipo e salvalo in nemici/.'),
      errore ? h('p', { class: 'riquadro attenzione', role: 'alert' }, errore) : null,
      lista === null ? h('p', { class: 'nota' }, 'Lettura di personaggi/…')
        : lista.length ? h('ul', { class: 'bestiario-elenco' }, lista.map((f) => h('li', {},
          h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => daCartella(f) }, f.nome.replace(/-/g, ' ')), h('small', { class: 'nota' }, ` ${f.file}`))))
          : h('p', { class: 'vuoto' }, 'Nessun personaggio in personaggi/.'),
      h('div', { class: 'riga-azioni' },
        h('button', { type: 'button', class: 'btn', onclick: () => scelta.click() }, 'Dal computer…'), scelta,
        h('button', { type: 'button', class: 'btn', onclick: () => finestra.close() }, 'Annulla'))));
  };
  disegna();
  document.body.append(finestra);
  finestra.showModal();
  const elenco = await elencoCartella();
  lista = [...ultimiPerPersonaggio(elenco ?? []).values()].sort((a, b) => a.file.localeCompare(b.file, 'it'));
  if (!elenco) errore = 'personaggi/ non leggibile: scegli un file dal computer.';
  if (finestra.isConnected) disegna();
}
