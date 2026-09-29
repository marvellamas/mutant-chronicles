// Passo «Equipaggiamento iniziale» del wizard (Giocatore §2.16, E&L A.5–A.5.29): dotazione comune,
// scelte della Classe, crediti iniziali, acquisti con cessione degli armamenti di base, conferma.
// Le regole stanno in src/dotazioni.js; qui solo la presentazione.
import { h } from './dom.js';
import { componenteTiro } from './tiro.js';
import { catalogo, NOMI_TIPI, TIPI } from '../equipaggiamento.js';
import {
  dotazioneVuota, opzioniEffettive, sottoScelteRichieste, vociDotazione, applicaDotazione, dotazioneApplicata,
  contiDotazione, mancanzeDotazione, avvisiForza, specTiroCrediti, modelloAssegnato, armamentiCedibili,
  acquistabili, testoEffetto, catalogoCorporazione, crediti,
} from '../dotazioni.js';

/** Confronto delle voci della dotazione ignorando ciò che il giocatore può cambiare dopo (stato, note). */
const impronta = (voci) => JSON.stringify(voci.filter((v) => v.dotazione_iniziale)
  .map((v) => [v.uid, v.rif, v.personalizzato?.nome ?? null, v.quantita, v.dotazione_id ?? null]));

/**
 * @param {object} ctx contesto del wizard: { dati, scelte, ante, ui, aggiorna, ridisegna }
 * @returns {Node[]}
 */
export function renderDotazione(ctx) {
  const { dati, scelte } = ctx;
  const dd = dati.dotazioni;
  if (!scelte.classe || !dd.classi[scelte.classe]) {
    return [h('p', { class: 'riquadro attenzione' }, 'Scegli prima la Classe: la dotazione iniziale dipende dalla Classe (§2.16).')];
  }
  const d = scelte.dotazione ?? dotazioneVuota();
  const imposta = (modifica) => ctx.aggiorna({ dotazione: { ...dotazioneVuota(), ...d, ...modifica } });
  const cat = catalogo(dati);
  const classe = dd.classi[scelte.classe];
  const corp = scelte.corporazione;
  const forza = ctx.ante.caratteristiche?.FOR?.valore;
  const voci = vociDotazione(d, scelte.classe, corp, dati);
  const perFor = new Map(avvisiForza(voci, forza, dati).map((a) => [a.nome, a]));
  const conti = contiDotazione(d, scelte.classe, corp, dati, cat);
  const mancanze = mancanzeDotazione(d, scelte.classe, corp, dati);
  const applicata = dotazioneApplicata(scelte.equipaggiamento);
  const allineata = applicata && impronta(scelte.equipaggiamento) === impronta(voci);
  const reg = dd.oggetti_dotazione;
  const freelance = catalogoCorporazione(corp, dati) === 'Commerciale';

  return [
    h('p', { class: 'guida' }, 'Dotazione comune, alternative della Classe, crediti iniziali ed eventuali acquisti (§2.16). Alla fine metti tutto nell’inventario; l’inventario si può sempre completare più sotto, in «Altro equipaggiamento».'),

    // a. dotazione comune
    h('section', { class: 'dotazione-sezione' },
      h('h3', {}, 'Dotazione comune ', h('small', { class: 'sigla' }, '§2.16.1')),
      h('ul', { class: 'dotazione-comune' }, dd.comune.oggetti.map((x) => h('li', {},
        h('strong', {}, `${x.quantita}${x.unita ? ` ${x.unita}` : ''} `), reg[x.dotazione].nome))),
      dd.comune.note.map((n) => h('p', { class: 'nota' }, n))),

    // b. dotazione della Classe
    h('section', { class: 'dotazione-sezione' },
      h('h3', {}, `Dotazione della Classe: ${scelte.classe} `, h('small', { class: 'sigla' }, `§${classe.paragrafo}`)),
      h('p', { class: 'nota' }, freelance
        ? 'Freelance: si usa il catalogo Commerciale (§2.16.27).'
        : `Armamenti di base della ${corp}: il modello corporativo corrispondente al profilo commerciale (§2.16.27).`),
      opzioniEffettive(d, scelte.classe, dati).map((e) => gruppoScelta(ctx, e, d, imposta, cat, perFor)),
      sottoScelte(ctx, d, imposta),
      classe.note.length ? h('details', { class: 'note-dotazione' }, h('summary', {}, 'Note del manuale'),
        classe.note.map((n) => h('p', {}, n))) : null),

    // c. crediti
    h('section', { class: 'dotazione-sezione' },
      h('h3', {}, 'Crediti iniziali ', h('small', { class: 'sigla' }, '§2.16.28')),
      h('p', { class: 'nota' }, dd.crediti.testo[0]),
      componenteTiro({
        id: 'tiro-crediti', spec: specTiroCrediti(dati), tiro: d.crediti, memoria: ctx.ui,
        imposta: (tiro) => imposta({ crediti: tiro }),
      }),
      conti.iniziali !== null ? h('p', { class: 'crediti-iniziali' }, `${dati.regole.crediti_iniziali.formula} = `, h('strong', {}, crediti(conti.iniziali))) : null),

    // d. acquisti
    acquisti(ctx, d, imposta, conti, cat),

    // e. conferma
    h('section', { class: 'dotazione-sezione conferma-dotazione' },
      h('h3', {}, 'Nell’inventario'),
      perFor.size ? h('div', { class: 'riquadro attenzione', role: 'status' },
        h('p', {}, h('strong', {}, 'Requisiti di FOR non soddisfatti. '), 'Si può confermare lo stesso: decide il master (§2.16: «Ogni scelta deve rispettare i requisiti degli oggetti»).'),
        h('ul', {}, [...perFor.values()].map((a) => h('li', {}, a.testo)))) : null,
      mancanze.length ? h('ul', { class: 'mancanze' }, mancanze.map((m) => h('li', {}, m))) : null,
      applicata ? h('p', { class: allineata ? 'nota' : 'riquadro attenzione' }, allineata
        ? 'La dotazione iniziale è nell’inventario.'
        : 'La dotazione nell’inventario non corrisponde più alle scelte: aggiornala.') : null,
      h('button', {
        type: 'button', class: 'btn primario', disabled: mancanze.length > 0 || allineata,
        onclick: () => {
          if (applicata && !confirm('Le voci della dotazione iniziale nell’inventario vengono sostituite (stato e note compresi). Gli altri oggetti restano. Procedere?')) return;
          ctx.aggiorna({ equipaggiamento: applicaDotazione(scelte.equipaggiamento, voci) });
        },
      }, applicata ? 'Aggiorna la dotazione nell’inventario' : 'Metti la dotazione nell’inventario'),
      conti.saldo !== null ? h('p', { class: 'saldo' }, 'Crediti che restano al personaggio: ', h('strong', { class: conti.saldo < 0 ? 'negativo' : null }, crediti(conti.saldo))) : null),
  ];
}

/** Un gruppo della tabella della Classe: testo del manuale e alternative (radio), o l'oggetto assegnato. */
function gruppoScelta(ctx, { gruppo, opzione, automatica }, d, imposta, cat, perFor) {
  const nome = `dot-${gruppo.id}`;
  const descr = (o) => {
    const parti = [];
    for (const x of o.oggetti) {
      if (x.dotazione) {
        const r = ctx.dati.dotazioni.oggetti_dotazione[x.dotazione];
        // con una scheda di catalogo (Equipaggiamento 0.3) gli effetti vengono da lì
        const effetti = r.rif ? cat.perRif.get(r.rif)?.effetti : r.effetti;
        if (effetti?.length) parti.push(testoEffetto({ ...r, effetti }));
        continue;
      }
      const m = modelloAssegnato(x.rif, ctx.scelte.corporazione, ctx.dati, cat);
      const def = cat.perRif.get(m.rif);
      if (m.corporativo) parti.push(`modello corporativo: ${def.nome}`);
      if (m.nota) parti.push(m.nota);
      if (Number.isInteger(def?.for_richiesta)) parti.push(`FOR ${def.for_richiesta}`);
      if (perFor.has(def?.nome)) parti.push(h('span', { class: 'motivo' }, perFor.get(def.nome).testo));
    }
    if (o.munizioni) parti.push(`munizioni: ${o.munizioni.colpi} colpi${o.munizioni.caricatori ? ` in ${o.munizioni.caricatori} caricatori` : ''}`);
    return parti.flatMap((p, i) => (i ? [' · ', p] : [p]));
  };
  const testo = [h('p', { class: 'testo-manuale' }, gruppo.testo), gruppo.testo_munizioni ? h('p', { class: 'testo-manuale nota' }, gruppo.testo_munizioni) : null];
  if (automatica) {
    return h('div', { class: 'gruppo-dotazione' },
      h('h4', {}, gruppo.etichetta), ...testo,
      opzione ? h('p', { class: 'assegnato' }, h('strong', {}, opzione.nome), ' ', h('small', {}, descr(opzione)))
        : h('p', { class: 'nota' }, 'Dipende da un’altra scelta.'));
  }
  return h('fieldset', { class: `gruppo-dotazione${opzione ? '' : ' da-scegliere'}` },
    h('legend', {}, gruppo.etichetta), ...testo,
    gruppo.opzioni.map((o) => h('label', { class: `opzione-dotazione${opzione?.id === o.id ? ' scelta' : ''}` },
      h('input', { type: 'radio', name: nome, value: o.id, checked: opzione?.id === o.id, onchange: () => imposta({ opzioni: { ...d.opzioni, [gruppo.id]: o.id } }) }),
      h('span', {}, h('strong', {}, o.nome), ' ', h('small', {}, descr(o))))));
}

/** Ambiente del corredo, versione del corredo agricolo, ambito del corredo di analisi. */
function sottoScelte(ctx, d, imposta) {
  const richieste = sottoScelteRichieste(d, ctx.scelte.classe, ctx.dati);
  if (!richieste.length) return null;
  const cambia = (id, v) => imposta({ sotto: { ...d.sotto, [id]: v } });
  return h('div', { class: 'sotto-scelte' }, richieste.map((s) => {
    const id = `sotto-${s.oggetto}`;
    const valore = d.sotto?.[s.oggetto] ?? '';
    return h('p', { class: 'campo' },
      h('label', { for: id }, `${s.nome}: ${s.etichetta.toLowerCase()}`),
      s.libero
        ? h('input', { id, type: 'text', value: valore, maxlength: 60, placeholder: `es. ${s.esempi.join(', ')}`, onchange: (e) => cambia(s.oggetto, e.target.value) })
        : h('select', { id, onchange: (e) => cambia(s.oggetto, e.target.value) },
          h('option', { value: '', selected: !valore }, '— scegli —'),
          s.valori.map((v) => h('option', { value: v, selected: v === valore }, v))));
  }));
}

/** §2.16.29: acquisti facoltativi, cedendo gli armamenti di base al 100 % del prezzo. */
function acquisti(ctx, d, imposta, conti, cat) {
  const { dati, scelte } = ctx;
  const cedibili = armamentiCedibili(d, scelte.classe, scelte.corporazione, dati, cat);
  const giaCeduti = new Set(conti.acquisti.flatMap((a) => a.cede));
  const bozza = ctx.ui.acquistoDotazione ??= { rif: '', cede: [] };
  const lista = acquistabili(scelte.corporazione, dati, cat);
  const scelto = cat.perRif.get(bozza.rif);
  const cedeBozza = bozza.cede.filter((g) => cedibili.some((c) => c.gruppo === g) && !giaCeduti.has(g));
  const valoreBozza = cedeBozza.reduce((s, g) => s + cedibili.find((c) => c.gruppo === g).valore, 0);
  const conguaglio = scelto ? Math.max(0, scelto.costo - valoreBozza) : 0;
  const saldoDopo = conti.saldo === null ? null : conti.saldo - conguaglio;
  const motivo = !scelto ? 'Scegli un oggetto.' : conti.saldo === null ? 'Tira prima i crediti iniziali.'
    : saldoDopo < 0 ? `Crediti insufficienti: servono ${crediti(conguaglio)}, ne restano ${crediti(conti.saldo)}.` : null;
  const perTipo = TIPI.map((t) => [t, lista.filter((o) => o.tipo === t)]).filter(([, l]) => l.length);
  // lo stesso nome in due famiglie (Pugnale da mischia e da lancio): si aggiunge la famiglia
  const ripetuti = new Set(lista.map((o) => o.nome).filter((n, i, a) => a.indexOf(n) !== i));
  const ridisegna = () => ctx.ridisegna();

  return h('section', { class: 'dotazione-sezione' },
    h('h3', {}, 'Acquisti iniziali (facoltativi) ', h('small', { class: 'sigla' }, '§2.16.29')),
    dati.dotazioni.scambio.testo.slice(0, 2).map((t) => h('p', { class: 'nota' }, t)),
    conti.acquisti.length ? h('ul', { class: 'elenco-acquisti' }, conti.acquisti.map((a, i) => h('li', {},
      h('span', {}, h('strong', {}, a.nome), ` ${crediti(a.prezzo)}`,
        a.cede.length ? ` − ceduto ${a.cede.map((g) => cedibili.find((c) => c.gruppo === g)?.nome ?? g).join(', ')} (${crediti(a.valoreCeduto)})` : '',
        ` → conguaglio ${crediti(a.conguaglio)}`,
        a.eccedenza ? h('small', { class: 'motivo' }, ` Il valore ceduto supera il prezzo di ${crediti(a.eccedenza)}: il §2.16.29 non prevede il resto.`) : null),
      h('button', { type: 'button', class: 'btn piccolo', onclick: () => imposta({ acquisti: d.acquisti.filter((_, j) => j !== i) }) }, 'Togli')))) : null,
    h('div', { class: 'nuovo-acquisto' },
      h('p', { class: 'campo' },
        h('label', { for: 'acquisto-oggetto' }, `Oggetto (catalogo ${catalogoCorporazione(scelte.corporazione, dati)}${catalogoCorporazione(scelte.corporazione, dati) === 'Commerciale' ? '' : ' e Commerciale'})`),
        h('select', { id: 'acquisto-oggetto', onchange: (e) => { bozza.rif = e.target.value; ridisegna(); } },
          h('option', { value: '', selected: !bozza.rif }, '— scegli —'),
          perTipo.map(([t, l]) => h('optgroup', { label: NOMI_TIPI[t] }, l.map((o) => h('option', { value: o.rif, selected: o.rif === bozza.rif },
            `${o.nome}${ripetuti.has(o.nome) ? ` (${o.famiglia})` : ''} · ${crediti(o.costo)}${o.catalogo === 'Commerciale' ? '' : ` · ${o.catalogo}`}${Number.isInteger(o.for_richiesta) ? ` · FOR ${o.for_richiesta}` : ''}`)))))),
      cedibili.length ? h('fieldset', { class: 'cessioni' }, h('legend', {}, 'Armamenti di base da cedere (100 % del prezzo)'),
        cedibili.map((c) => h('label', {},
          h('input', {
            type: 'checkbox', checked: cedeBozza.includes(c.gruppo), disabled: giaCeduti.has(c.gruppo),
            onchange: (e) => { bozza.cede = e.target.checked ? [...cedeBozza, c.gruppo] : cedeBozza.filter((g) => g !== c.gruppo); ridisegna(); },
          }),
          ` ${c.nome} (${c.etichetta.toLowerCase()}) · ${crediti(c.valore)}${giaCeduti.has(c.gruppo) ? ' · già ceduto' : ''}`))) : null,
      scelto ? h('p', { class: 'nota' }, `Conguaglio ${crediti(conguaglio)}`, saldoDopo !== null ? ` · saldo dopo l’acquisto ${crediti(saldoDopo)}` : '') : null,
      motivo && scelto ? h('p', { class: 'motivo', role: 'alert' }, motivo) : null,
      h('button', {
        type: 'button', class: 'btn', disabled: !!motivo,
        onclick: () => {
          ctx.ui.acquistoDotazione = { rif: '', cede: [] };
          imposta({ acquisti: [...(d.acquisti ?? []), { rif: bozza.rif, cede: cedeBozza }] });
        },
      }, 'Aggiungi l’acquisto')),
    dati.dotazioni.scambio.testo.slice(3, 4).map((t) => h('p', { class: 'nota' }, t)));
}
