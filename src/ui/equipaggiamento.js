// Componente dell'equipaggiamento (roadmap §1.2–1.3), usato dal passo Equipaggiamento del wizard e
// dalla tab Combattimento: elenco delle voci con stato, quantità e note; «Aggiungi oggetto» con
// cascata Tipo → Catalogo → Famiglia → Profilo, ricerca per nome e oggetto personalizzato.
// Non calcola nulla: i valori vengono da calcolaEquipaggiamento (src/equipaggiamento.js).
import { h } from './dom.js';
import { info } from './tooltip.js';
import {
  TIPI, NOMI_TIPI, STATI, NOMI_STATI, catalogo, risolvi, opzioniCascata, cercaNelCatalogo, statoIniziale,
} from '../equipaggiamento.js';

const nuovoUid = () => `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const armiTipi = ['arma_ravvicinata', 'arma_distanza'];

/**
 * @param {object} ctx { dati, voci, ui (memoria fra i ridisegni), aggiorna(voci), ridisegna() }
 * @returns {Node[]}
 */
export function renderEquipaggiamento(ctx) {
  return [elencoVoci(ctx), pannelloAggiungi(ctx)];
}

// ---------------------------------------------------------------------------
// Elenco

function elencoVoci(ctx) {
  const { dati, voci } = ctx;
  const cat = catalogo(dati);
  const risolte = voci.map((v) => risolvi(v, cat));
  if (!risolte.length) return h('p', { class: 'vuoto' }, 'Nessun oggetto. Aggiungili dal catalogo o come oggetti personalizzati.');
  const cambia = (uid, modifica) => ctx.aggiorna(voci.map((v) => (v.uid === uid ? { ...v, ...modifica } : v)));
  const armi = risolte.filter((r) => armiTipi.includes(r.tipo));
  return h('ul', { class: 'elenco-equip' }, risolte.map((r) => {
    const v = r.voce;
    const stati = STATI[r.tipo] ?? [];
    return h('li', { class: `voce-equip${r.attivo ? ' attiva' : ''}${r.fuoriCatalogo ? ' fuori' : ''}` },
      h('div', { class: 'equip-testa' },
        h('div', {},
          h('strong', {}, r.def ? info('oggetto', r.def.rif, r.nome) : r.nome),
          h('small', { class: 'sigla' }, ` · ${NOMI_TIPI[r.tipo]}${r.def ? ` · ${r.def.catalogo}` : ''}`),
          r.personalizzato ? h('span', { class: 'etichetta' }, 'personalizzato') : null,
          r.fuoriCatalogo ? h('p', { class: 'motivo' }, 'Non più in catalogo: resta in lista, senza effetti.') : null),
        h('button', {
          type: 'button', class: 'btn pericolo piccolo-btn', 'aria-label': `Togli ${r.nome}`,
          onclick: () => { if (confirm(`Togliere «${r.nome}» dall’equipaggiamento?`)) ctx.aggiorna(voci.filter((x) => x.uid !== v.uid)); },
        }, 'Togli')),
      stati.length && !r.fuoriCatalogo ? h('div', { class: 'stati-equip', role: 'radiogroup', 'aria-label': `Stato di ${r.nome}` },
        stati.map((st) => h('button', {
          type: 'button', role: 'radio', 'aria-checked': String(v.stato === st),
          class: `stato-equip${v.stato === st ? ' attivo' : ''}`, onclick: () => cambia(v.uid, { stato: st }),
        }, NOMI_STATI[st]))) : null,
      r.tipo === 'accessorio' && armi.length ? h('label', { class: 'campo-inline' }, 'Montato su ',
        h('select', { onchange: (e) => cambia(v.uid, { montato_su: e.target.value || undefined }) },
          h('option', { value: '' }, '—'),
          armi.map((a) => h('option', { value: a.uid, selected: v.montato_su === a.uid }, a.nome)))) : null,
      h('div', { class: 'equip-riga' },
        h('span', { class: 'quantita' }, 'Quantità ',
          h('button', { type: 'button', class: 'btn-tavolo piccolo', disabled: v.quantita <= 1, 'aria-label': `Togli uno a ${r.nome}`, onclick: () => cambia(v.uid, { quantita: v.quantita - 1 }) }, '−'),
          h('output', {}, String(v.quantita)),
          h('button', { type: 'button', class: 'btn-tavolo piccolo', 'aria-label': `Aggiungi uno a ${r.nome}`, onclick: () => cambia(v.uid, { quantita: v.quantita + 1 }) }, '+')),
        h('input', {
          type: 'text', class: 'note-equip', value: v.note, placeholder: 'Note (es. «danneggiata», «regalo di…»)', 'aria-label': `Note su ${r.nome}`,
          onchange: (e) => cambia(v.uid, { note: e.target.value }),
        })),
      r.personalizzato && v.personalizzato?.testo ? h('p', { class: 'nota' }, v.personalizzato.testo) : null);
  }));
}

// ---------------------------------------------------------------------------
// Aggiungi

function pannelloAggiungi(ctx) {
  const { dati, ui } = ctx;
  ui.equip ??= { tipo: null, catalogo: null, famiglia: null, rif: null, cerca: '', pers: { nome: '', tipo: 'altro', abilita: '', danno: '', ar: '' } };
  const s = ui.equip;
  const op = opzioniCascata(dati, s);
  const scelto = s.rif ? catalogo(dati).perRif.get(s.rif) : null;
  const imposta = (modifica) => { Object.assign(s, modifica); ctx.ridisegna(); };
  const aggiungiVoce = (voce) => {
    ctx.aggiorna([...ctx.voci, voce]);
  };

  const risultati = h('ul', { class: 'risultati-ricerca' });
  const mostraRisultati = () => {
    const trovati = cercaNelCatalogo(dati, s.cerca);
    risultati.replaceChildren(...trovati.map((o) => h('li', {}, h('button', {
      type: 'button', class: 'btn', onclick: () => imposta({ tipo: o.tipo, catalogo: o.catalogo, famiglia: o.famiglia, rif: o.rif, cerca: '' }),
    }, o.nome, h('small', { class: 'sigla' }, ` · ${o.famiglia} · ${o.catalogo}`)))));
    if (s.cerca.trim().length >= 2 && !trovati.length) risultati.append(h('li', { class: 'vuoto' }, 'Nessun oggetto con questo nome nel catalogo.'));
  };
  mostraRisultati();

  const selettore = (etichetta, valore, opzioni, onchange, nomeOpzione = (x) => x) => h('label', { class: 'campo' }, h('span', {}, etichetta),
    h('select', { onchange: (e) => onchange(e.target.value || null), disabled: !opzioni.length },
      h('option', { value: '' }, opzioni.length ? '— scegli —' : '—'),
      opzioni.map((o) => h('option', { value: o, selected: o === valore }, nomeOpzione(o)))));

  const p = s.pers;
  const difese = dati.equipaggiamento?.file?.armature?.abilita_difese;
  const abilitaArmi = dati.abilita.abilita.filter((a) => ['Distanza', 'Ravvicinato'].includes(a.categoria) && a.nome !== difese).map((a) => a.nome);
  return h('section', { class: 'aggiungi-equip' },
    h('h3', {}, 'Aggiungi oggetto'),
    h('label', { class: 'campo' }, h('span', {}, 'Cerca per nome'),
      h('input', { type: 'search', value: s.cerca, placeholder: 'es. spada, alabarda, armatura', oninput: (e) => { s.cerca = e.target.value; mostraRisultati(); } })),
    risultati,
    h('div', { class: 'cascata' },
      selettore('Tipo', s.tipo, op.tipi, (v) => imposta({ tipo: v, catalogo: null, famiglia: null, rif: null }), (t) => NOMI_TIPI[t]),
      selettore('Catalogo', s.catalogo, op.cataloghi, (v) => imposta({ catalogo: v, famiglia: null, rif: null })),
      selettore('Famiglia', s.famiglia, op.famiglie, (v) => imposta({ famiglia: v, rif: null })),
      selettore('Profilo', s.rif, op.profili.map((o) => o.rif), (v) => imposta({ rif: v }), (r) => op.profili.find((o) => o.rif === r)?.nome ?? r)),
    scelto ? h('div', { class: 'riquadro ok profilo-scelto' },
      h('p', {}, h('strong', {}, info('oggetto', scelto.rif, scelto.nome)), h('small', { class: 'sigla' }, ` · ${scelto.paragrafo}`)),
      h('p', { class: 'nota' }, riassuntoProfilo(scelto)),
      h('button', {
        type: 'button', class: 'btn primario',
        onclick: () => {
          Object.assign(s, { rif: null });
          aggiungiVoce({ uid: nuovoUid(), rif: scelto.rif, stato: statoIniziale(scelto.tipo, ctx.voci, dati), quantita: 1, note: '' });
        },
      }, `Aggiungi ${scelto.nome}`)) : null,
    h('details', { class: 'personalizzato', open: !!ui.equipPersAperto, ontoggle: (e) => { ui.equipPersAperto = e.target.open; } },
      h('summary', {}, 'Oggetto personalizzato'),
      h('p', { class: 'nota' }, 'Per ciò che il catalogo non ha ancora o per le improvvisazioni del master. Un’arma con l’Abilità indicata mostra il VA per colpire; un’armatura con l’AR mostra la protezione.'),
      h('div', { class: 'griglia-anagrafica' },
        h('label', { class: 'campo' }, h('span', {}, 'Nome'), h('input', { type: 'text', value: p.nome, maxlength: 80, oninput: (e) => { p.nome = e.target.value; } })),
        h('label', { class: 'campo' }, h('span', {}, 'Tipo'),
          h('select', { onchange: (e) => { p.tipo = e.target.value; ctx.ridisegna(); } }, TIPI.map((t) => h('option', { value: t, selected: p.tipo === t }, NOMI_TIPI[t])))),
        armiTipi.includes(p.tipo) ? h('label', { class: 'campo' }, h('span', {}, 'Abilità'),
          h('select', { onchange: (e) => { p.abilita = e.target.value; } }, h('option', { value: '' }, '—'), abilitaArmi.map((a) => h('option', { value: a, selected: p.abilita === a }, a)))) : null,
        armiTipi.includes(p.tipo) ? h('label', { class: 'campo' }, h('span', {}, 'Danno'), h('input', { type: 'text', value: p.danno, placeholder: 'es. 1d6+1', oninput: (e) => { p.danno = e.target.value; } })) : null,
        ['armatura', 'scudo'].includes(p.tipo) ? h('label', { class: 'campo' }, h('span', {}, 'AR'), h('input', { type: 'number', min: 0, step: 1, value: p.ar, oninput: (e) => { p.ar = e.target.value; } })) : null),
      h('button', {
        type: 'button', class: 'btn',
        onclick: () => {
          if (!p.nome.trim()) { alert('Scrivi il nome dell’oggetto.'); return; }
          const personalizzato = { nome: p.nome.trim(), tipo: p.tipo };
          if (armiTipi.includes(p.tipo) && p.abilita) personalizzato.abilita = p.abilita;
          if (armiTipi.includes(p.tipo) && p.danno.trim()) personalizzato.danno = p.danno.trim();
          if (['armatura', 'scudo'].includes(p.tipo) && p.ar !== '' && Number.isInteger(Number(p.ar))) personalizzato.ar = Number(p.ar);
          Object.assign(p, { nome: '', abilita: '', danno: '', ar: '' });
          aggiungiVoce({ uid: nuovoUid(), rif: null, personalizzato, stato: statoIniziale(personalizzato.tipo, ctx.voci, dati), quantita: 1, note: '' });
        },
      }, 'Aggiungi oggetto personalizzato')));
}

function riassuntoProfilo(o) {
  const parti = [];
  if (o.abilita) parti.push(o.abilita);
  if (o.danno) parti.push(`danno ${[o.danno.una_mano, o.danno.due_mani].filter(Boolean).join(' / ')}`);
  if (o.danno_da_munizione) parti.push('danno dalla munizione');
  if (o.portata_q) parti.push(`portata ${o.portata_q} Q`);
  if (o.gittata_q) parti.push(`gittata ${o.gittata_q} Q`);
  if (o.gittata_per_for) parti.push(`gittata FOR × ${o.gittata_per_for} Q`);
  if (o.munizioni?.capacita) parti.push(o.munizioni.unita === 'cariche' ? `${o.munizioni.capacita} cariche` : o.munizioni.unita === 'PM' ? `riserva ${o.munizioni.capacita} PM` : `CC ${o.munizioni.capacita}`);
  if (o.modalita?.length) parti.push(o.modalita.join(' '));
  if (o.ar) parti.push(`AR ${o.ar.totale}`);
  if (o.taglia) parti.push(o.taglia);
  if (o.parata) parti.push(`Parata ${o.parata.ravvicinata >= 0 ? '+' : '−'}${Math.abs(o.parata.ravvicinata)} / ${o.parata.distanza >= 0 ? '+' : '−'}${Math.abs(o.parata.distanza)}`);
  if (o.mov) parti.push(`MOV −${-o.mov} Q`);
  if (o.categoria) parti.push(o.categoria);
  if (o.for_richiesta) parti.push(`FOR ${o.for_richiesta}`);
  if (o.costo !== undefined) parti.push(`costo ${o.costo.toLocaleString('it-IT')}`);
  if (o.proprieta?.length) parti.push(o.proprieta.map((p) => p.nome).join(', '));
  return parti.join(' · ');
}
