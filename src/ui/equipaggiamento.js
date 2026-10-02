// Componente dell'equipaggiamento (roadmap §1.2–1.3), usato dal passo Equipaggiamento del wizard e
// dalla tab Inventario: elenco delle voci con stato, quantità e note; «Aggiungi oggetto» con
// cascata Tipo → Catalogo → Famiglia → Profilo, ricerca per nome e oggetto personalizzato.
// Non calcola nulla: i valori vengono da calcolaEquipaggiamento (src/equipaggiamento.js).
// Modalità Inventario (docs/layout-sd.md, pezzo 2; ctx.inventario): sezioni per famiglia
// (SEZIONI_INVENTARIO), stato con il deposito comune, costo / Qualità / reperibilità / peso nella
// riga, contenuto aggiunto dalla tab (ctx.rigaExtra: PI e Ripara) e «Compra» (ctx.compra).
import { h } from './dom.js';
import { info } from './tooltip.js';
import {
  TIPI, NOMI_TIPI, STATI, NOMI_STATI, catalogo, risolvi, opzioniCascata, cercaNelCatalogo, statoIniziale, puoMontare, rinforzoCompatibile, infoArtefattoVoce,
  regoleSintonizzazione, coloriChroma, testoEffettoOggetto, regolaCapolavoro, AMBITI_EFFETTO, NOMI_AMBITI, statiInventario, testoCura,
} from '../equipaggiamento.js';
import { pesoVoce } from '../carico.js';

import { GRUPPI_EQUIPAGGIAMENTO, SEZIONI_INVENTARIO, sezioneInventario } from '../palette.js';
import { tipoRiserva, alimentazione as alimentazioneRiserva, nomeRiserva, nomeAlimentazione } from '../fonti.js';
import { leggiImpostazioni, salvaImpostazioni } from './storage.js';

const nuovoUid = () => `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const armiTipi = ['arma_ravvicinata', 'arma_distanza'];

/**
 * @param {object} ctx { dati, voci, ui (memoria fra i ridisegni), aggiorna(voci), ridisegna(),
 *   inventario?: true, rigaExtra?(r) → nodi, compra?(voce, costo), crediti?: numero | null }
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
  // gruppi per tipo (docs/palette.md) o, nell'Inventario, sezioni per famiglia: espandibili, con lo
  // stato ricordato nel browser. A gruppo chiuso gli oggetti attivi restano visibili in una riga
  // compatta: cambiano i valori della scheda.
  const chiave = ctx.inventario ? 'sezioniInventarioChiuse' : 'gruppiEquipChiusi';
  const chiusi = new Set(leggiImpostazioni()[chiave] ?? []);
  const gruppi = ctx.inventario
    ? SEZIONI_INVENTARIO.map((s) => ({ id: s.id, titolo: s.titolo, colore: s.colore, colonna: s.colonna, sotto: !!s.sottosezioneDi, voci: risolte.filter((r) => sezioneInventario(r)?.id === s.id) }))
    : GRUPPI_EQUIPAGGIAMENTO.map((g) => ({ id: g.tipo, titolo: g.titolo, colore: g.colore, voci: risolte.filter((r) => (TIPI.includes(r.tipo) ? r.tipo : 'altro') === g.tipo) }));
  const sezione = (g) => {
    const delGruppo = g.voci;
    if (!delGruppo.length) return null;
    const aperto = !chiusi.has(g.id);
    const attivi = delGruppo.filter((r) => r.attivo);
    return h('section', { class: `gruppo-equip${aperto ? '' : ' chiuso'}${g.sotto ? ' sottosezione' : ''}` },
      h('details', {
        open: aperto,
        ontoggle: (e) => {
          if (e.target.open === aperto) return; // il toggle iniziale non è un cambio
          const nuovi = new Set(leggiImpostazioni()[chiave] ?? []);
          if (e.target.open) nuovi.delete(g.id); else nuovi.add(g.id);
          salvaImpostazioni({ ...leggiImpostazioni(), [chiave]: [...nuovi] });
          ctx.ridisegna?.();
        },
      },
      h('summary', {}, h('span', { class: 'etichetta-cat', style: `--cat: var(--${g.colore})` }, g.titolo), ` (${delGruppo.length})`),
      h('ul', { class: 'elenco-equip' }, delGruppo.map((r) => voceEquip(ctx, r, risolte, cambia)))),
      !aperto && attivi.length ? h('ul', { class: 'elenco-compatto', 'aria-label': `${g.titolo}: oggetti attivi` }, attivi.map((r) => h('li', {},
        h('strong', {}, r.nome), h('small', { class: 'sigla' }, ` · ${NOMI_STATI[r.voce.stato] ?? ''}${r.voce.quantita > 1 ? ` · ×${r.voce.quantita}` : ''}`)))) : null);
  };
  // Inventario (richiesta di Davide del 02/10): due colonne con le sezioni nell'ordine dei dati
  // (src/palette.js → SEZIONI_INVENTARIO, «colonna»); su schermi stretti una colonna sola, prima la
  // sinistra poi la destra. Nel wizard i gruppi restano in una colonna.
  if (ctx.inventario) {
    const colonna = (lato) => h('div', { class: `colonna-inventario ${lato}` }, gruppi.filter((g) => (g.colonna ?? 'destra') === lato).map(sezione));
    return h('div', { class: 'gruppi-equip inventario-colonne' }, colonna('sinistra'), colonna('destra'));
  }
  return h('div', { class: 'gruppi-equip' }, gruppi.map(sezione));
}

/**
 * «Montata su:» di un rinforzo (richiesta di Davide del 02/10; Armamenti §7.11.2, §7.23.9): le sole
 * armature indossate e compatibili, «Indossato da solo» per soprabiti e mantelli (indossabile_da_solo,
 * regole.json → rinforzi), nello zaino e, nell'Inventario, il deposito comune. Se l'armatura su cui è
 * montato non è più indossata il rinforzo resta montato su di lei (rinforzi.armatura_tolta) e qui si dice.
 */
/**
 * Armatura Capolavoro del Corazzaio (A.61, E&L del 02/10; classi.json → capolavoro_armatura): la Contromisura
 * numerica scelta alla costruzione, +1 (assente: 1). Si salva sulla voce («capolavoro»), l'effetto è nelle
 * Resistenze e una riga nella provenienza dell'AR.
 */
function sceltaCapolavoro(ctx, r, cambia) {
  const R = regolaCapolavoro(ctx.dati);
  if (!R) return null;
  const v = r.voce;
  return h('label', { class: 'campo campo-riga capolavoro', title: R.decisione },
    h('span', {}, `Capolavoro (${R.talento}): `),
    h('select', { onchange: (e) => cambia(v.uid, { capolavoro: e.target.value ? { contromisura: e.target.value } : undefined }) },
      h('option', { value: '', selected: !v.capolavoro }, 'no'),
      R.contromisure.map((x) => h('option', { value: x.nome, selected: v.capolavoro?.contromisura === x.nome }, `${x.nome} +${R.valore} (contro ${x.effetto})`))));
}

function montataSu(ctx, r, risolte, cambia) {
  const v = r.voce;
  const armature = risolte.filter((t) => t.tipo === 'armatura' && t.uid !== r.uid);
  const compatibili = armature.filter((t) => t.attivo && rinforzoCompatibile(r, t));
  const su = v.stato === 'in_uso' && v.montato_su ? armature.find((t) => t.uid === v.montato_su) ?? null : null;
  // «in uso» senza armatura (salvataggi in cui il rinforzo non era stato montato): da scegliere
  const valore = su ? `arm:${su.uid}` : v.stato === 'in_uso' ? 'scegli' : v.stato === 'indossata' ? 'da-solo' : v.stato === 'deposito' ? 'deposito' : 'zaino';
  const scelte = [...compatibili, ...(su && !compatibili.includes(su) ? [su] : [])];
  const scegli = (x) => {
    if (x.startsWith('arm:')) cambia(v.uid, { stato: 'in_uso', montato_su: x.slice(4) });
    else cambia(v.uid, { stato: x === 'da-solo' ? 'indossata' : x, montato_su: undefined });
  };
  const nota = su && !su.attivo ? `Resta montato su ${su.nome}, che non è indossata: nessun effetto finché non la indossi (regole.json → rinforzi).`
    : su && !rinforzoCompatibile(r, su) ? `${su.nome} non ammette questo rinforzo: nessun effetto (§7.11.2).`
      : v.stato === 'in_uso' && !su ? 'Scegli l’armatura su cui è montato.'
        : !compatibili.length && !r.def?.indossabile_da_solo ? 'Nessuna armatura indossata lo ammette: indossane una compatibile per montarlo.' : null;
  return h('div', { class: 'montata-su' },
    h('label', { class: 'campo-inline' }, 'Montata su: ',
      h('select', { onchange: (e) => scegli(e.target.value), 'aria-label': `${r.nome}: montata su` },
        valore === 'scegli' ? h('option', { value: '', disabled: true, selected: true }, '— scegli l’armatura —') : null,
        scelte.map((a) => h('option', { value: `arm:${a.uid}`, selected: valore === `arm:${a.uid}` }, `${a.nome}${a.attivo ? '' : ' (non indossata)'}`)),
        r.def?.indossabile_da_solo ? h('option', { value: 'da-solo', selected: valore === 'da-solo' }, 'Indossato da solo') : null,
        h('option', { value: 'zaino', selected: valore === 'zaino' }, NOMI_STATI.zaino),
        ctx.inventario ? h('option', { value: 'deposito', selected: valore === 'deposito' }, NOMI_STATI.deposito) : null)),
    valore === 'da-solo' ? h('small', { class: 'nota' }, ` ${testoDaSolo(ctx.dati)}`) : null,
    nota ? h('p', { class: 'nota motivo' }, nota) : null);
}

/** Che cosa dà un rinforzo indossato da solo, dalla regola nei dati (regole.json → rinforzi.da_solo). */
function testoDaSolo(dati) {
  const d = dati.regole?.rinforzi?.da_solo ?? {};
  return d.ar === 'propria' ? 'Da solo: AR del rinforzo, senza armatura.' : 'Da solo: nessuna AR (§7.23.4: non è un profilo autonomo di armatura), in attesa di Davide (A.80).';
}

/** Una voce dell'elenco, completa di stato, quantità, peso e note. */
function voceEquip(ctx, r, risolte, cambia) {
  const { dati, voci } = ctx;
  const v = r.voce;
  // del tipo, oppure In uso / Nello zaino per gli oggetti con effetti; nell'Inventario più il deposito
  // comune (null = «Con sé» per i tipi senza stati)
  const stati = ctx.inventario ? statiInventario(r) : r.stati;
  const art = r.fuoriCatalogo ? null : infoArtefattoVoce(r, dati);
  // Magia sez. 6: ogni contenitore si sintonizza e si ricarica da solo, quindi una voce ciascuno
  const contenitoreSingolo = art?.contenitore && !art.contenitore.integrato;
  return h('li', { class: `voce-equip${r.attivo ? ' attiva' : ''}${r.fuoriCatalogo ? ' fuori' : ''}${r.deposito ? ' in-deposito' : ''}`, dataset: { uid: v.uid } },
    h('div', { class: 'equip-testa' },
      h('div', {},
        h('strong', {}, r.def ? info('oggetto', r.def.rif, r.nome) : r.nome),
        h('small', { class: 'sigla' }, ` · ${NOMI_TIPI[r.tipo]}${r.def ? ` · ${r.def.catalogo}` : ''}`),
        v.dotazione_iniziale ? h('span', { class: 'etichetta', title: 'Dotazione iniziale (§2.16): rifacendola, la voce si sostituisce' }, 'dotazione')
          : r.personalizzato ? h('span', { class: 'etichetta' }, 'personalizzato') : null,
        // riga breve con l'effetto dal manuale (catalogo → effetto_breve)
        r.def?.effetto_breve ? h('p', { class: 'effetto-breve' }, r.def.effetto_breve) : null,
        // Equipaggiamento 0.5, cap. 6: promemoria delle cure con i numeri (campo «cura»), senza tiri
        ctx.inventario && r.def?.cura ? h('p', { class: 'nota promemoria-cura' }, testoCura(r.def.cura)) : null,
        r.fuoriCatalogo ? h('p', { class: 'motivo' }, 'Non più in catalogo: resta in lista, senza effetti.') : null,
        ctx.inventario ? datiOggetto(ctx, r) : null),
      h('button', {
        type: 'button', class: 'btn pericolo piccolo-btn', 'aria-label': `Togli ${r.nome}`,
        onclick: () => { if (confirm(`Togliere «${r.nome}» dall’equipaggiamento?`)) ctx.aggiorna(voci.filter((x) => x.uid !== v.uid)); },
      }, 'Togli')),
    r.tipo === 'rinforzo' && !r.fuoriCatalogo ? montataSu(ctx, r, risolte, cambia) : null,
    ctx.inventario && r.tipo === 'armatura' && !r.fuoriCatalogo ? sceltaCapolavoro(ctx, r, cambia) : null,
    r.tipo !== 'rinforzo' && stati.length && (!r.fuoriCatalogo || ctx.inventario) ? h('div', { class: 'stati-equip', role: 'radiogroup', 'aria-label': `Stato di ${r.nome}` },
      stati.map((st) => h('button', {
        type: 'button', role: 'radio', 'aria-checked': String(v.stato === st),
        class: `stato-equip${v.stato === st ? ' attivo' : ''}${st === 'deposito' ? ' stato-deposito' : ''}`, onclick: () => cambia(v.uid, { stato: st }),
        title: st === 'deposito' ? 'Resta del personaggio, ma fuori dal carico e senza effetti; non disponibile al tavolo.' : null,
      }, st === null ? 'Con sé' : NOMI_STATI[st]))) : null,
    ctx.rigaExtra ? ctx.rigaExtra(r) : null,
    art && ctx.inventario ? h('p', { class: 'nota' }, `${v.sintonizzato === true && !r.deposito ? 'Sintonizzato' : 'Non sintonizzato'} (SnT ${art.sintonizzazione}, §7.10): si gestisce nella tab Artefatti.`)
      : art ? h('label', { class: 'campo-inline' },
        h('input', { type: 'checkbox', checked: v.sintonizzato === true, onchange: (e) => cambia(v.uid, { sintonizzato: e.target.checked || undefined }) }),
        ` Sintonizzato (SnT ${art.sintonizzazione}, §7.10)`) : null,
    art?.contenitore ? h('p', { class: 'nota' }, `Chroma ${art.contenitore.energia}, ${art.contenitore.capacita_pm} PM${art.contenitore.integrato ? `, riserva integrata: ${nomeRiserva(tipoRiserva(art.contenitore, dati), dati)}, proprietà ${nomeAlimentazione(alimentazioneRiserva(art.contenitore, dati), dati)} (Magia §26.2)` : ''}.`) : null,
    // E&L 2 (A.19): acquistato pieno; trovato con la carica stabilita dal Direttore
    contenitoreSingolo ? h('div', { class: 'campo-inline' },
      h('label', {}, h('input', { type: 'checkbox', checked: Number.isInteger(v.pm_iniziali), onchange: (e) => cambia(v.uid, { pm_iniziali: e.target.checked ? 0 : undefined }) }),
        ' Trovato (non acquistato)'),
      Number.isInteger(v.pm_iniziali) ? h('label', {}, ' · PM attuali ',
        h('input', { type: 'number', min: 0, max: art.contenitore.capacita_pm, step: 1, value: v.pm_iniziali, 'aria-label': `PM attuali di ${r.nome}, trovato`,
          onchange: (e) => { const n = Math.round(Number(e.target.value)); if (Number.isFinite(n)) cambia(v.uid, { pm_iniziali: Math.max(0, Math.min(n, art.contenitore.capacita_pm)) }); } }),
        ` / ${art.contenitore.capacita_pm}`) : h('small', { class: 'nota' }, ' acquistato: pieno'),
      h('small', { class: 'nota' }, ' (vale all’inserimento; al tavolo i PM si scalano con − e +)')) : null,
    r.tipo === 'accessorio' && risolte.some((t) => puoMontare(r, t)) ? h('label', { class: 'campo-inline' }, 'Montato su ',
      h('select', { onchange: (e) => cambia(v.uid, { montato_su: e.target.value || undefined }) },
        h('option', { value: '' }, '—'),
        risolte.filter((t) => puoMontare(r, t)).map((a) => h('option', { value: a.uid, selected: v.montato_su === a.uid }, a.nome)))) : null,
    h('div', { class: 'equip-riga' },
      contenitoreSingolo ? h('span', { class: 'quantita nota' }, 'Un contenitore per voce: per averne un altro, aggiungilo di nuovo.')
        : h('span', { class: 'quantita' }, 'Quantità ',
          h('button', { type: 'button', class: 'btn-tavolo piccolo', disabled: v.quantita <= 1, 'aria-label': `Togli uno a ${r.nome}`, onclick: () => cambia(v.uid, { quantita: v.quantita - 1 }) }, '−'),
          h('output', {}, String(v.quantita)),
          h('button', { type: 'button', class: 'btn-tavolo piccolo', 'aria-label': `Aggiungi uno a ${r.nome}`, onclick: () => cambia(v.uid, { quantita: v.quantita + 1 }) }, '+')),
      // §1.6: il peso degli oggetti personalizzati si corregge qui (quelli del catalogo vengono dai dati)
      r.personalizzato ? h('label', { class: 'campo-inline peso-equip' }, 'Peso kg ',
        h('input', {
          type: 'number', min: 0, step: 0.1, value: v.personalizzato?.peso ?? '', 'aria-label': `Peso di ${r.nome} in kg per unità`,
          onchange: (e) => {
            const { peso, ...resto } = v.personalizzato ?? {};
            const n = e.target.value === '' ? null : Number(e.target.value);
            cambia(v.uid, { personalizzato: n !== null && Number.isFinite(n) && n >= 0 ? { ...resto, peso: n } : resto });
          },
        })) : null,
      h('input', {
        type: 'text', class: 'note-equip', value: v.note, placeholder: 'Note (es. «danneggiata», «regalo di…»)', 'aria-label': `Note su ${r.nome}`,
        onchange: (e) => cambia(v.uid, { note: e.target.value }),
      })),
    r.personalizzato && v.personalizzato?.testo ? h('p', { class: 'nota' }, v.personalizzato.testo) : null,
    // effetti sui VA (docs/effetti-oggetti.md): contano solo con l'oggetto in uso
    r.effetti.length ? h('ul', { class: 'effetti-voce' }, r.effetti.map((e) => h('li', {},
      h('span', { class: 'effetto-oggetto' }, testoEffettoOggetto(e)),
      e.condizione ? h('small', { class: 'nota' }, ` — ${e.condizione}`) : null))) : null,
    r.personalizzato && !v.dotazione_id ? editorEffetti(ctx, v, cambia) : null);
}

/**
 * Costo, Qualità, reperibilità e peso di un oggetto (Inventario, docs/layout-sd.md): dal catalogo o,
 * per i personalizzati, il peso scritto dal giocatore.
 */
function datiOggetto(ctx, r) {
  const d = r.def ?? {};
  const rep = d.reperibilita ? ctx.dati.equipaggiamento?.indice?.reperibilita?.[d.reperibilita] ?? null : null;
  const peso = pesoVoce(r);
  const parti = [
    Number.isFinite(d.costo) ? `costo ${d.costo.toLocaleString('it-IT')}` : null,
    // Equipaggiamento §7.1: costo UMN registrato all'installazione e servizio d'installazione a parte
    Number.isInteger(d.umn) ? h('span', { title: 'Costo in Umanità, registrato quando l’impianto passa a «Installato» (Giocatore §5.21): toglierlo non lo restituisce.' }, `UMN ${d.umn}`) : null,
    Number.isFinite(d.installazione_costo) ? `installazione ${d.installazione_costo.toLocaleString('it-IT')}` : null,
    d.qualita ? `Qualità ${d.qualita}` : null,
    d.reperibilita ? h('span', { title: rep ? `${rep.nome}: ${rep.ricerca}` : null }, `reperibilità ${(rep?.nome ?? d.reperibilita).toLowerCase()}`) : null,
    r.voce.stato === 'installato' ? 'installato: fuori dal carico'
      : peso !== null ? `${String(peso).replace('.', ',')} kg${r.voce.quantita > 1 ? ' l’uno' : ''}` : r.fuoriCatalogo ? null : 'peso da definire',
  ].filter(Boolean);
  if (!parti.length) return null;
  return h('p', { class: 'dati-oggetto' }, parti.flatMap((x, i) => (i ? [' · ', x] : [x])));
}

/**
 * Piccolo editor degli effetti di un oggetto personalizzato: Abilità, valore, ambito (sempre,
 * condizione da attivare al tavolo, solo per un uso), uso e condizione (testo libero).
 */
function editorEffetti(ctx, v, cambia) {
  const effetti = v.personalizzato?.effetti ?? [];
  const bozze = (ctx.ui.effettiNuovi ??= {});
  const b = (bozze[v.uid] ??= { abilita: '', valore: '', ambito: 'generale', uso: '', condizione: '' });
  const salva = (lista) => cambia(v.uid, { personalizzato: { ...v.personalizzato, effetti: lista } });
  const id = (k) => `eff-${v.uid}-${k}`;
  return h('details', { class: 'editor-effetti', open: ctx.ui.aperti?.has?.(id('d')) || null, ontoggle: (e) => ctx.ui.aperti?.[e.target.open ? 'add' : 'delete']?.(id('d')) },
    h('summary', {}, `Effetti sui VA (${effetti.length})`),
    effetti.length ? h('ul', {}, effetti.map((e, i) => h('li', {}, testoEffettoOggetto(e), e.condizione ? h('small', { class: 'nota' }, ` — ${e.condizione}`) : null, ' ',
      h('button', { type: 'button', class: 'btn piccolo', onclick: () => salva(effetti.filter((_, j) => j !== i)) }, 'Togli')))) : null,
    h('div', { class: 'griglia-form' },
      h('label', { class: 'campo', for: id('a') }, h('span', {}, 'Abilità'),
        h('select', { id: id('a'), onchange: (e) => { b.abilita = e.target.value; } }, h('option', { value: '' }, '—'),
          ctx.dati.abilita.abilita.map((a) => h('option', { value: a.nome, selected: b.abilita === a.nome }, a.nome)))),
      h('label', { class: 'campo', for: id('v') }, h('span', {}, 'Valore (VA)'),
        h('input', { id: id('v'), type: 'number', step: 1, value: b.valore, oninput: (e) => { b.valore = e.target.value; } })),
      h('label', { class: 'campo', for: id('m') }, h('span', {}, 'Quando vale'),
        h('select', { id: id('m'), onchange: (e) => { b.ambito = e.target.value; ctx.ridisegna?.(); } },
          AMBITI_EFFETTO.map((x) => h('option', { value: x, selected: b.ambito === x }, NOMI_AMBITI[x])))),
      b.ambito === 'uso_specifico' ? h('label', { class: 'campo', for: id('u') }, h('span', {}, 'Uso (breve)'),
        h('input', { id: id('u'), type: 'text', maxlength: 40, placeholder: 'es. tracce', value: b.uso, oninput: (e) => { b.uso = e.target.value; } })) : null,
      h('label', { class: 'campo', for: id('c') }, h('span', {}, 'Condizione (testo)'),
        h('input', { id: id('c'), type: 'text', maxlength: 300, placeholder: 'es. negli ambienti formali', value: b.condizione, oninput: (e) => { b.condizione = e.target.value; } }))),
    h('button', {
      type: 'button', class: 'btn',
      onclick: () => {
        const valore = Number(b.valore);
        if (!b.abilita) { alert('Scegli l’Abilità.'); return; }
        if (!Number.isInteger(valore) || valore === 0) { alert('Il valore è un intero diverso da 0 (es. 2 o −1).'); return; }
        if (b.ambito === 'uso_specifico' && !b.uso.trim()) { alert('Scrivi l’uso, in breve (es. «tracce»).'); return; }
        const e = { abilita: b.abilita, valore, ambito: b.ambito };
        if (b.ambito === 'uso_specifico') e.uso = b.uso.trim();
        if (b.condizione.trim()) e.condizione = b.condizione.trim();
        bozze[v.uid] = { abilita: '', valore: '', ambito: 'generale', uso: '', condizione: '' };
        salva([...effetti, e]);
      },
    }, 'Aggiungi effetto'));
}

// ---------------------------------------------------------------------------
// Aggiungi

function pannelloAggiungi(ctx) {
  const { dati, ui } = ctx;
  ui.equip ??= { tipo: null, catalogo: null, famiglia: null, rif: null, cerca: '', pers: { nome: '', tipo: 'altro', abilita: '', danno: '', ar: '', potenza: '', energia: '', capacita: '', peso: '' } };
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
  const potenze = Object.keys(regoleSintonizzazione(dati)?.potenze ?? {});
  // il Chroma Viola non è un contenitore (risposta A.21): «contenitore»: false
  const colori = Object.entries(coloriChroma(dati)).filter(([, x]) => !x.esausto && x.contenitore !== false).map(([nome]) => nome);
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
      h('div', { class: 'barra-azioni' },
        h('button', {
          type: 'button', class: 'btn primario',
          onclick: () => {
            Object.assign(s, { rif: null });
            aggiungiVoce({ uid: nuovoUid(), rif: scelto.rif, stato: statoIniziale(scelto.tipo, ctx.voci, dati, scelto.effetti ?? []), quantita: 1, note: '' });
          },
        }, `Aggiungi ${scelto.nome}`),
        // Inventario, modalità tavolo: compra al prezzo di catalogo, scalando i crediti attuali
        ctx.compra ? bottoneCompra(ctx, scelto, () => {
          Object.assign(s, { rif: null });
          return { uid: nuovoUid(), rif: scelto.rif, stato: statoIniziale(scelto.tipo, ctx.voci, dati, scelto.effetti ?? []), quantita: 1, note: '' };
        }) : null,
        // confezione (granate da cinque, Armamenti §7.20.3: «singole o in confezioni da cinque, senza sconto»)
        ctx.compra && scelto.confezione ? bottoneCompra(ctx, { ...scelto, costo: scelto.confezione.costo }, () => {
          Object.assign(s, { rif: null });
          return { uid: nuovoUid(), rif: scelto.rif, stato: statoIniziale(scelto.tipo, ctx.voci, dati, scelto.effetti ?? []), quantita: scelto.confezione.quantita, note: '' };
        }, `Compra ${scelto.confezione.quantita}`) : null)) : null,
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
        ['armatura', 'scudo'].includes(p.tipo) ? h('label', { class: 'campo' }, h('span', {}, 'AR'), h('input', { type: 'number', min: 0, step: 1, value: p.ar, oninput: (e) => { p.ar = e.target.value; } })) : null,
        // §7.10: la potenza dà il costo di sintonizzazione; Magia sez. 6: colore e capacità del Chroma
        p.tipo === 'artefatto' ? h('label', { class: 'campo' }, h('span', {}, 'Potenza'),
          h('select', { onchange: (e) => { p.potenza = e.target.value; } }, h('option', { value: '' }, '—'),
            potenze.map((x) => h('option', { value: x, selected: p.potenza === x }, `${x} (SnT ${regoleSintonizzazione(dati).potenze[x]})`)))) : null,
        // Armamenti §7.10: con sole proprietà passive la SnT è 0, qualunque sia la potenza
        p.tipo === 'artefatto' ? h('label', { class: 'campo campo-casella', title: 'Armamenti §7.10: «Un Artefatto con sole proprietà passive ha SnT 0, qualunque sia la sua potenza.»' },
          h('input', { type: 'checkbox', checked: !!p.soloPassive, onchange: (e) => { p.soloPassive = e.target.checked; } }), h('span', {}, ' Sole proprietà passive (SnT 0)')) : null,
        // Magia §24.2, §25.4: incantesimo infuso (proprietà attiva), pagato dalla riserva integrata, senza Prove
        p.tipo === 'artefatto' ? h('label', { class: 'campo', title: 'Magia §24.2: una proprietà ad attivazione riproduce una versione completa della scheda; dopo la Sintonizzazione si attiva senza Potere né Componenti e paga dalla riserva dell’Artefatto.' },
          h('span', {}, 'Incantesimo infuso (facoltativo)'),
          h('select', { onchange: (e) => { p.infuso = e.target.value; } }, h('option', { value: '' }, 'nessuno'),
            [...(dati.incantesimi?.incantesimi ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, 'it')).map((i) => h('option', { value: i.nome, selected: p.infuso === i.nome }, i.nome)))) : null,
        p.tipo === 'artefatto' ? h('label', { class: 'campo' }, h('span', {}, 'Livello della versione infusa'),
          h('input', { type: 'number', min: 1, max: 18, step: 1, value: p.livelloInfuso ?? '', oninput: (e) => { p.livelloInfuso = e.target.value; } })) : null,
        p.tipo === 'artefatto' ? h('label', { class: 'campo' }, h('span', {}, 'Chroma (contenitore)'),
          h('select', { onchange: (e) => { p.energia = e.target.value; } }, h('option', { value: '' }, 'nessuno'),
            colori.map((x) => h('option', { value: x, selected: p.energia === x }, x)))) : null,
        p.tipo === 'artefatto' ? h('label', { class: 'campo' }, h('span', {}, 'Capacità (PM)'),
          h('input', { type: 'number', min: 1, step: 1, value: p.capacita, oninput: (e) => { p.capacita = e.target.value; } })) : null,
        // Magia §26.2: con un incantesimo infuso la riserva è integrata; il progetto dice se è Batteria o
        // Cariche e se la proprietà è Esclusiva o Universale (predefiniti: Cariche, Esclusiva)
        p.tipo === 'artefatto' ? h('label', { class: 'campo', title: dati.regole.chroma.riserve?.tipi ? Object.values(dati.regole.chroma.riserve.tipi).map((x) => `${x.nome}: ${x.testo}`).join(' · ') : null },
          h('span', {}, 'Riserva integrata (con incantesimo infuso)'),
          h('select', { onchange: (e) => { p.riserva = e.target.value; } },
            Object.entries(dati.regole.chroma.riserve?.tipi ?? {}).map(([k, x]) => h('option', { value: k, selected: (p.riserva || dati.regole.chroma.riserve.integrata_predefinita) === k }, x.nome)))) : null,
        p.tipo === 'artefatto' ? h('label', { class: 'campo', title: dati.regole.chroma.riserve?.alimentazioni ? Object.values(dati.regole.chroma.riserve.alimentazioni).map((x) => `${x.nome}: ${x.testo}`).join(' · ') : null },
          h('span', {}, 'Proprietà infusa'),
          h('select', { onchange: (e) => { p.alimentazione = e.target.value; } },
            Object.entries(dati.regole.chroma.riserve?.alimentazioni ?? {}).map(([k, x]) => h('option', { value: k, selected: (p.alimentazione || dati.regole.chroma.riserve.proprieta_predefinita) === k }, x.nome)))) : null,
        // Equipaggiamento §1.6: peso per unità, per il carico della modalità tavolo
        h('label', { class: 'campo' }, h('span', {}, 'Peso (kg per unità)'),
          h('input', { type: 'number', min: 0, step: 0.1, value: p.peso ?? '', oninput: (e) => { p.peso = e.target.value; } }))),
      h('button', {
        type: 'button', class: 'btn',
        onclick: () => {
          if (!p.nome.trim()) { alert('Scrivi il nome dell’oggetto.'); return; }
          const personalizzato = { nome: p.nome.trim(), tipo: p.tipo };
          if (armiTipi.includes(p.tipo) && p.abilita) personalizzato.abilita = p.abilita;
          if (armiTipi.includes(p.tipo) && p.danno.trim()) personalizzato.danno = p.danno.trim();
          if (['armatura', 'scudo'].includes(p.tipo) && p.ar !== '' && Number.isInteger(Number(p.ar))) personalizzato.ar = Number(p.ar);
          if ((p.peso ?? '') !== '') {
            const peso = Number(p.peso);
            if (!Number.isFinite(peso) || peso < 0) { alert('Il peso è in kg, un numero ≥ 0.'); return; }
            personalizzato.peso = peso;
          }
          if (p.tipo === 'artefatto') {
            if (!p.potenza) { alert('Scegli la potenza dell’Artefatto: dà la SnT, il costo di Sintonizzazione (§7.10).'); return; }
            personalizzato.potenza = p.potenza;
            if (p.soloPassive && p.energia) { alert('Un Artefatto con sole proprietà passive non ha una riserva di Chroma: la riserva alimenta proprietà attive (Magia §24.2).'); return; }
            if (p.soloPassive) personalizzato.solo_passive = true;
            if (p.infuso) {
              const livello = Number(p.livelloInfuso);
              const inc = dati.incantesimi.incantesimi.find((i) => i.nome === p.infuso);
              const livelli = (inc?.versioni ?? []).map((r) => Number(String(r.Livello ?? r['Livello e PM'] ?? '').replace(/[^\d]/g, '')));
              if (p.soloPassive) { alert('Un incantesimo infuso ad attivazione è una proprietà attiva: togli «Sole proprietà passive».'); return; }
              if (!livelli.includes(livello)) { alert(`Livello della versione infusa: uno fra ${livelli.join(', ')} (scheda di ${p.infuso}).`); return; }
              personalizzato.infuso = { incantesimo: p.infuso, livello };
            }
            if (p.energia) {
              const capacita = Number(p.capacita);
              if (!Number.isInteger(capacita) || capacita < 1) { alert('Indica la capacità del contenitore in PM (intero ≥ 1).'); return; }
              Object.assign(personalizzato, { energia: p.energia, capacita_pm: capacita });
              // Magia §26.2: tipo di riserva e alimentazione, solo per la riserva integrata di un incantesimo infuso
              if (personalizzato.infuso) {
                if (p.riserva) personalizzato.riserva = p.riserva;
                if (p.alimentazione) personalizzato.alimentazione = p.alimentazione;
              }
            }
          }
          Object.assign(p, { nome: '', abilita: '', danno: '', ar: '', potenza: '', energia: '', capacita: '', peso: '', soloPassive: false, infuso: '', livelloInfuso: '', riserva: '', alimentazione: '' });
          aggiungiVoce({ uid: nuovoUid(), rif: null, personalizzato, stato: statoIniziale(personalizzato.tipo, ctx.voci, dati), quantita: 1, note: '' });
        },
      }, 'Aggiungi oggetto personalizzato')));
}

/** «Compra (−N crediti)»: disabilitato, con il motivo, se il prezzo manca o i crediti non bastano. */
function bottoneCompra(ctx, scelto, nuovaVoce, etichetta = 'Compra') {
  const costo = Number.isFinite(scelto.costo) ? scelto.costo : null;
  const motivo = costo === null ? 'Prezzo di catalogo assente: aggiungi l’oggetto e scala i crediti a mano.'
    : !Number.isInteger(ctx.crediti) ? 'Crediti non tracciati: applica prima la dotazione iniziale, oppure aggiungi l’oggetto e annota la spesa a mano.'
      : ctx.crediti < costo ? `Crediti insufficienti (${ctx.crediti.toLocaleString('it-IT')}).` : null;
  return h('button', {
    type: 'button', class: 'btn', disabled: !!motivo, title: motivo,
    onclick: () => ctx.compra(nuovaVoce(), costo),
  }, costo === null ? etichetta : `${etichetta} (−${costo.toLocaleString('it-IT')} crediti)`);
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
  if (o.costo !== undefined && o.costo !== null) parti.push(`costo ${o.costo.toLocaleString('it-IT')}`);
  if (o.proprieta?.length) parti.push(o.proprieta.map((p) => p.nome).join(', '));
  return parti.join(' · ');
}
