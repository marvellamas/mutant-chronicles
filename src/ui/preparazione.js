// «Prepara scontro» del Tavolo del Master (richiesta di Marcello del 03/10/2026): bozze di scontro con nome, note
// per il master, nemici (bestiario salvato, creature pronte, «Crea nemico») con «Quanti» e lato, PG facoltativi e
// la difficoltà per 7 PG (solo informativa). Le bozze stanno sul server in scontri/ con stato «bozza»
// (src/preparazione.js, server.mjs): si salvano a ogni modifica, si duplicano, si eliminano (in scontri/archivio/).
// «Inizia» ne fa uno scontro vero con l'Iniziativa tirata e il Round 1. Finestra fuori dalla plancia che si ridisegna.
import { h } from './dom.js';
import { nascondiTooltip } from './tooltip.js';
import { avviso, avvisoErrore } from './avvisi.js';
import { apriEditorNemico } from './nemici.js';
import { apriCreaNemico, caricaUmano } from './crea-nemico.js';
import { leggiScontro, salvaScontro, idNuovo, pgDaVista } from './scontro.js';
import { elencoCartella, leggiCartella } from './cartella.js';
import { ultimiPerPersonaggio } from '../cartella.js';
import { vistaPlancia } from '../tavolo.js';
import { tira } from '../tiri.js';
import { dadoIniziativa } from '../scontro.js';
import {
  nuovaBozza, aggiungiVoce, cambiaVoce, togliVoce, cambiaBozza, duplicaBozza, eliminaBozza, iniziaBozza, pgDellaBozza, STATO_BOZZA,
} from '../preparazione.js';
import { profiloNemico, scelteCreatura, fileUmano, difficolta, infoBilancio, nomeEffettivo } from '../crea-nemico.js';

const virgola = (x) => String(x).replace('.', ',');

/** Bozze sul server: [{ id, nome, stato, revisione, mtime, nemici }]. */
export async function elencoBozze() {
  const r = await fetch('api/scontri', { cache: 'no-store' });
  if (!r.ok) throw new Error(`scontri non leggibili (${r.status})`);
  return (await r.json()).filter((s) => s.stato === STATO_BOZZA);
}

/**
 * Apre «Prepara scontro».
 * @param opzioni { bestiario: () => voci valide e no (src/nemici.js → vociBestiario), alTavolo: () => viste dei PG al
 *   tavolo, scontroAperto: () => bool, inizia: async (scontro, chiaviPg) → bool, salvatoBestiario: (nemico) → void }
 */
export function apriPreparazione(ctx, { bestiario, alTavolo, scontroAperto, inizia, salvatoBestiario = () => {} }) {
  const dati = ctx.dati;
  const BE = dati.bestiario;
  const st = { bozze: null, bozza: null, nuovoNome: '', errore: null, cartella: [], viste: new Map(), aperti: new Set(),
    daBestiario: { tipo: '', quanti: '1', lato: 'avversario' }, daCreatura: { id: BE.creature[0]?.id ?? '', grado: '', boss: false, quanti: '1', lato: 'avversario' } };
  const finestra = h('dialog', { class: 'pannello-scheda preparazione', 'aria-labelledby': 'preparazione-titolo' });
  finestra.addEventListener('close', () => { nascondiTooltip(); finestra.remove(); });

  const carica = async () => {
    try { st.bozze = (await elencoBozze()).sort((a, b) => b.mtime - a.mtime); st.errore = null; } catch (e) { st.errore = e.message; st.bozze = []; }
    disegna();
  };
  const caricaCartella = async () => {
    try { st.cartella = [...ultimiPerPersonaggio((await elencoCartella()) ?? []).values()]; } catch { st.cartella = []; }
    disegna();
  };
  // vista (Iniziativa, livello) di un PG della cartella, letta una volta
  const vista = async (chiave) => {
    if (st.viste.has(chiave)) return st.viste.get(chiave);
    const al = alTavolo().find((v) => v.chiaveCartella === chiave);
    if (al) { st.viste.set(chiave, al); return al; }
    const r = st.cartella.find((x) => x.file.startsWith(`${chiave}_liv`));
    if (!r) return null;
    try { const v = vistaPlancia(await leggiCartella(r.file), dati, r.file); st.viste.set(chiave, v); return v; } catch { return null; }
  };

  // salvataggi con la revisione; un conflitto ricarica la bozza attuale
  const salvaOra = async (nuova) => {
    try {
      const r = await salvaScontro(nuova);
      if (r.conflitto !== undefined) {
        st.bozza = r.conflitto?.stato === STATO_BOZZA ? r.conflitto : null;
        avvisoErrore('La bozza è stata cambiata in un’altra finestra: ho ricaricato quella attuale. Ripeti l’ultima modifica se serve.');
      } else st.bozza = r.scontro.stato === STATO_BOZZA ? r.scontro : null;
    } catch (e) { avvisoErrore(`Bozza non salvata: ${e.message}`); }
    disegna();
  };
  // le modifiche si mettono in fila: ognuna parte dalla bozza salvata dalla precedente (clic ravvicinati)
  let coda = Promise.resolve();
  const salva = (nuova) => { coda = coda.then(() => salvaOra(nuova)); return coda; };
  const modifica = (fn) => {
    coda = coda.then(async () => {
      if (!st.bozza) return;
      let nuova;
      try { nuova = fn(st.bozza); } catch (e) { avvisoErrore(e.message); return; }
      await salvaOra(nuova);
    });
    return coda;
  };

  // --- elenco delle bozze ---------------------------------------------------------------------------------
  const elenco = () => [
    h('p', { class: 'nota' }, 'Uno scontro preparato prima della sessione: nemici, quanti, note. Le bozze stanno sul server (scontri/) e restano finché non le elimini; «Inizia» ne fa uno scontro vero.'),
    st.errore ? h('p', { class: 'riquadro attenzione' }, st.errore) : null,
    h('div', { class: 'riga-azioni' },
      h('label', {}, 'Nome ', h('input', { type: 'text', maxlength: 60, placeholder: 'es. Imboscata al porto', value: st.nuovoNome, oninput: (e) => { st.nuovoNome = e.target.value; } })),
      h('button', { type: 'button', class: 'btn primario', onclick: async () => {
        const b = nuovaBozza({ nome: st.nuovoNome });
        st.nuovoNome = '';
        st.bozza = b;
        await salva(b);
        if (st.bozza) avviso(`Bozza «${st.bozza.nome}» creata.`);
      } }, 'Nuova bozza')),
    st.bozze === null ? h('p', { class: 'nota' }, 'Lettura delle bozze…')
      : st.bozze.length ? h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta' },
        h('thead', {}, h('tr', {}, ['Bozza', 'Nemici', 'Aggiornata', ''].map((x) => h('th', {}, x)))),
        h('tbody', {}, st.bozze.map((b) => h('tr', {},
          h('th', { scope: 'row' }, b.nome),
          h('td', {}, String(b.nemici ?? 0)),
          h('td', {}, new Date(b.mtime).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })),
          h('td', { class: 'azioni-scontro' },
            h('button', { type: 'button', class: 'btn btn-piccolo primario', onclick: () => apri(b.id) }, 'Apri'),
            h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => duplica(b.id) }, 'Duplica'),
            h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => elimina(b.id) }, 'Elimina')))))))
        : h('p', { class: 'vuoto' }, 'Nessuna bozza: scrivi un nome e «Nuova bozza».'),
  ];
  const apri = async (id) => {
    try { st.bozza = await leggiScontro(id); } catch (e) { avvisoErrore(e.message); return; }
    disegna();
    // i PG scelti nella bozza: livello per la difficoltà
    await caricaCartella();
    await Promise.all((st.bozza?.pg ?? []).map(vista));
    disegna();
  };
  const duplica = async (id) => {
    try {
      const copia = duplicaBozza(await leggiScontro(id));
      const r = await salvaScontro(copia);
      if (r.scontro) avviso(`Bozza duplicata: «${r.scontro.nome}».`);
    } catch (e) { avvisoErrore(`Non duplicata: ${e.message}`); }
    carica();
  };
  const elimina = async (id) => {
    try {
      const b = await leggiScontro(id);
      if (!confirm(`Eliminare la bozza «${b.nome}»? Il file passa in scontri/archivio/.`)) return;
      const r = await salvaScontro(eliminaBozza(b));
      if (r.scontro) avviso(`Bozza «${b.nome}» eliminata (in scontri/archivio/).`);
      if (st.bozza?.id === id) st.bozza = null;
    } catch (e) { avvisoErrore(`Non eliminata: ${e.message}`); }
    carica();
  };

  // --- una bozza ------------------------------------------------------------------------------------------
  const pgScelti = () => {
    const b = st.bozza;
    const tavolo = alTavolo();
    return b.pg?.length ? b.pg.map((k) => st.viste.get(k) ?? tavolo.find((v) => v.chiaveCartella === k) ?? { chiaveCartella: k, nome: k.replace(/-/g, ' '), livello: null }) : tavolo;
  };
  const livelloPg = () => {
    if (Number.isInteger(st.bozza.livello)) return { valore: st.bozza.livello, fonte: 'scritto a mano' };
    const l = pgScelti().map((v) => v.livello).filter(Number.isInteger);
    if (!l.length) return { valore: 8, fonte: 'nessun PG: si usa l’8°' };
    return { valore: Math.round(l.reduce((s, x) => s + x, 0) / l.length), fonte: `media dei PG (${st.bozza.pg?.length ? 'scelti' : 'al tavolo'})` };
  };
  const bozzaAperta = () => {
    const b = st.bozza;
    const liv = livelloPg();
    const d = difficolta(b.nemici.map((v) => ({ nemico: v.nemico, quanti: v.quanti })), liv.valore, dati);
    const voci = bestiario().filter((v) => v.nemico);
    const dB = st.daBestiario;
    if (!voci.some((v) => v.id === dB.tipo)) dB.tipo = voci[0]?.id ?? '';
    const dC = st.daCreatura;
    const creatura = BE.creature.find((c) => c.id === dC.id);
    if (creatura && !creatura.gradi.includes(dC.grado)) dC.grado = creatura.gradi[0];
    const pgNomi = new Set(b.pg ?? []);
    const chiaviCartella = [...new Set([...st.cartella.map((r) => r.file.replace(/_liv\d+_.*$/, '')), ...alTavolo().map((v) => v.chiaveCartella)])].sort((x, y) => x.localeCompare(y, 'it'));
    return [
      h('div', { class: 'riga-azioni' }, h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => { st.bozza = null; carica(); } }, '← Tutte le bozze')),
      h('label', { class: 'campo-nemico' }, h('span', {}, 'Nome dello scontro'), h('input', { type: 'text', maxlength: 60, value: b.nome, onchange: (e) => modifica((x) => cambiaBozza(x, { nome: e.target.value })) })),
      h('label', { class: 'campo-nemico' }, h('span', {}, 'Note per il master (non le vede nessun altro)'), h('textarea', { rows: 3, maxlength: 2000, value: b.note ?? '', onchange: (e) => modifica((x) => cambiaBozza(x, { note: e.target.value })) })),
      h('fieldset', { class: 'campo-nemico gruppo' }, h('legend', {}, 'PG (facoltativi: senza scelta, quelli al tavolo quando premi «Inizia»)'),
        chiaviCartella.length ? h('div', { class: 'caselle-nemico' }, chiaviCartella.map((k) => h('label', {}, h('input', { type: 'checkbox', checked: pgNomi.has(k), onchange: async (e) => {
          if (e.target.checked) await vista(k);
          modifica((x) => cambiaBozza(x, { pg: e.target.checked ? [...(x.pg ?? []), k] : (x.pg ?? []).filter((y) => y !== k) }));
        } }), ` ${k.replace(/-/g, ' ')}`))) : h('p', { class: 'nota' }, 'Nessun personaggio in personaggi/.')),
      riquadroDifficolta(b, d, liv),
      avvisoRari(b),
      h('h3', {}, `Nemici (${b.nemici.reduce((s, v) => s + v.quanti, 0)})`),
      b.nemici.length ? h('ul', { class: 'voci-bozza' }, b.nemici.map(voce)) : h('p', { class: 'vuoto' }, 'Nessun nemico: aggiungili qui sotto.'),
      h('div', { class: 'aggiungi-nemici' },
        h('h3', {}, 'Aggiungi'),
        h('div', { class: 'riga-aggiungi' },
          h('strong', {}, 'Dal bestiario '),
          voci.length ? [
            h('select', { 'aria-label': 'Tipo dal bestiario', onchange: (e) => { dB.tipo = e.target.value; } }, voci.map((v) => h('option', { value: v.id, selected: v.id === dB.tipo }, `${v.nemico.nome} (PV ${v.nemico.pv})`))),
            quantiLato(dB),
            h('button', { type: 'button', class: 'btn', onclick: () => { const n = voci.find((v) => v.id === dB.tipo)?.nemico; if (n) modifica((x) => aggiungiVoce(x, { nemico: n, quanti: Number(dB.quanti), lato: dB.lato, origine: 'bestiario' })); } }, 'Aggiungi'),
          ] : h('span', { class: 'nota' }, 'il bestiario è vuoto')),
        h('div', { class: 'riga-aggiungi' },
          h('strong', {}, 'Creatura pronta '),
          h('select', { 'aria-label': 'Creatura pronta', onchange: (e) => { dC.id = e.target.value; dC.boss = false; disegna(); } }, BE.creature.map((c) => h('option', { value: c.id, selected: c.id === dC.id }, c.nome))),
          h('select', { 'aria-label': 'Grado della creatura', onchange: (e) => { dC.grado = e.target.value; } }, (creatura?.gradi ?? []).map((g) => h('option', { value: g, selected: g === dC.grado }, BE.gradi.find((x) => x.id === g).nome))),
          creatura?.boss ? h('label', {}, h('input', { type: 'checkbox', checked: dC.boss, onchange: (e) => { dC.boss = e.target.checked; } }), ` Boss (${BE.gradi.find((x) => x.id === creatura.boss.grado).nome})`) : null,
          quantiLato(dC),
          h('button', { type: 'button', class: 'btn', onclick: () => aggiungiCreatura() }, 'Aggiungi')),
        h('div', { class: 'riga-aggiungi' },
          h('button', { type: 'button', class: 'btn', onclick: () => apriCreaNemico(ctx, {
            voci: bestiario(), livello: liv.valore, salvato: salvatoBestiario,
            destinazione: { etichetta: 'Aggiungi alla preparazione', aggiungi: async (n, { quanti, lato, origine }) => { await modifica((x) => aggiungiVoce(x, { nemico: n, quanti, lato, origine })); avviso(`${n.nome} ×${quanti} nella bozza «${st.bozza?.nome ?? ''}».`); return true; } },
          }) }, 'Crea nemico…'),
          h('span', { class: 'nota' }, ' procedura guidata o tutto a caso, dal Bestiario'))),
      h('div', { class: 'riga-azioni azioni-bozza' },
        h('button', { type: 'button', class: 'btn primario', disabled: !b.nemici.length, title: 'Crea lo scontro: Iniziativa tirata dall’app per tutti, Round 1. La bozza resta.', onclick: () => avvia(false) }, 'Inizia'),
        h('button', { type: 'button', class: 'btn', disabled: !b.nemici.length, title: 'Come «Inizia», poi la bozza passa in scontri/archivio/', onclick: () => avvia(true) }, 'Inizia e consuma la bozza'),
        h('button', { type: 'button', class: 'btn', onclick: () => duplica(b.id) }, 'Duplica'),
        h('button', { type: 'button', class: 'btn', onclick: () => elimina(b.id) }, 'Elimina')),
    ];
  };
  // difficoltà in parole semplici; i dettagli del calcolo nel suggerimento (richiesta di Marcello del 03/10)
  const delLivello = (l) => (l === 8 || l === 11 ? `dell’${l}°` : `del ${l}°`);
  const riquadroDifficolta = (b, d, liv) => {
    const vuota = !b.nemici.length;
    const soglie = BE.equilibrato.soglie.map((x) => (x.fino_a === null ? `oltre: ${x.nome}` : `fino a ${virgola(x.fino_a)}: ${x.nome}`)).join('; ');
    const dettagli = vuota ? 'Aggiungi almeno un nemico: la difficoltà si calcola dai loro gradi.'
      : `Somma delle frazioni: ${virgola(d.somma)} (${soglie}). Ogni nemico vale 1 diviso il numero di creature di uno scontro normale per il suo grado effettivo, nella tabella dei gruppi misti del Bestiario (§2.3), riga dei PG ${delLivello(d.livello)} livello; un Boss vale 1 contro i PG del suo livello. Solo indicativa.`;
    return h('div', { class: `riquadro difficolta-${vuota ? 'facile' : d.id}`, role: 'status', title: dettagli },
      h('p', {}, vuota ? h('strong', {}, 'Difficoltà: nessun nemico.')
        : [h('strong', {}, `Difficoltà per ${d.pg} PG di ${liv.valore}° livello: ${d.nome}.`),
          d.livello !== liv.valore ? ` Calcolata sulla riga ${delLivello(d.livello)} livello, la più vicina nella tabella del Bestiario.` : ` Calcolata sulla riga ${delLivello(d.livello)} livello della tabella del Bestiario.`,
          d.stime ? ` Per ${d.stime} nemic${d.stime === 1 ? 'o' : 'i'} il grado è stimato dai PV.` : '']),
      h('p', { class: 'nota' }, 'Livello dei PG: ',
        h('input', { type: 'number', min: 1, max: 20, step: 1, class: 'input-d10', 'aria-label': 'Livello dei PG per la difficoltà', placeholder: String(liv.valore), value: Number.isInteger(b.livello) ? b.livello : '', onchange: (e) => modifica((x) => cambiaBozza(x, { livello: e.target.value === '' ? null : Number(e.target.value) })) }),
        ` (${liv.fonte}). Passa sopra il riquadro per i dettagli del calcolo.`));
  };
  // Bestiario §3.9: una base rara (il Gigante) al massimo una per scontro sotto il grado indicato nei dati
  const avvisoRari = (b) => {
    const indice = (g) => BE.gradi.findIndex((x) => x.id === g);
    const perBase = new Map();
    for (const v of b.nemici) {
      const bb = v.nemico._bestiario;
      const m = bb?.scelte && BE.basi[bb.scelte.base]?.massimo_per_scontro;
      if (m && indice(bb.grado) < indice(m.sotto)) perBase.set(bb.scelte.base, (perBase.get(bb.scelte.base) ?? 0) + v.quanti);
    }
    const troppi = [...perBase].filter(([base, n]) => n > BE.basi[base].massimo_per_scontro.numero);
    return troppi.length ? h('p', { class: 'riquadro attenzione', role: 'status' }, troppi.map(([base, n]) => {
      const m = BE.basi[base].massimo_per_scontro;
      return `${BE.basi[base].nome}: al massimo ${m.numero} per scontro sotto il grado ${BE.gradi.find((g) => g.id === m.sotto).nome} (Bestiario ${BE.basi[base].paragrafo}); qui ce ne sono ${n}.`;
    }).join(' ')) : null;
  };
  const quantiLato = (o) => [
    h('label', {}, ' Quanti ', h('input', { type: 'number', min: 1, max: 30, step: 1, class: 'input-d10', value: o.quanti, oninput: (e) => { o.quanti = e.target.value; } })),
    h('label', {}, ' Lato ', h('select', { onchange: (e) => { o.lato = e.target.value; } }, ['avversario', 'alleato'].map((x) => h('option', { value: x, selected: o.lato === x }, x)))),
  ];
  const aggiungiCreatura = async () => {
    const dC = st.daCreatura;
    const scelte = scelteCreatura(dC.id, dC.grado, { boss: dC.boss }, dati);
    const umani = {};
    if (BE.basi[scelte.base].umano) {
      const id = fileUmano(scelte.tipoUmano, scelte.grado);
      const u = id ? await caricaUmano(id) : null;
      if (u) umani[id] = u;
    }
    const r = profiloNemico(scelte, dati, { umani });
    if (!r.nemico) { avvisoErrore(r.errori.join(' ')); return; }
    modifica((x) => aggiungiVoce(x, { nemico: r.nemico, quanti: Number(dC.quanti), lato: dC.lato, origine: 'creatura' }));
  };
  const voce = (v) => {
    const n = v.nemico;
    const info = infoBilancio(n, dati);
    const aperto = st.aperti.has(v.uid);
    return h('li', { class: 'voce-bozza' },
      h('div', { class: 'riga-aggiungi' },
        h('strong', {}, n.nome),
        h('small', { class: 'nota' }, ` · PV ${n.pv} · AR ${n.ar?.totale ?? 0}${n.ar?.magica ? ` (${n.ar.magica} magica)` : ''} · Difese ${n.difese} · Iniziativa ${n.iniziativa} · ${info.boss ? `Boss ${BE.gradi.find((g) => g.id === info.grado).nome}` : `grado ${info.stima ? 'stimato ' : 'effettivo '}${nomeEffettivo(info.grado_effettivo, dati).nome}`}`),
        h('label', {}, ' Quanti ', h('input', { type: 'number', min: 1, max: 30, step: 1, class: 'input-d10', value: v.quanti, 'aria-label': `Quanti ${n.nome}`, onchange: (e) => modifica((x) => cambiaVoce(x, v.uid, { quanti: Number(e.target.value) })) })),
        h('label', {}, ' Lato ', h('select', { 'aria-label': `Lato di ${n.nome}`, onchange: (e) => modifica((x) => cambiaVoce(x, v.uid, { lato: e.target.value })) }, ['avversario', 'alleato'].map((x) => h('option', { value: x, selected: v.lato === x }, x)))),
        h('button', { type: 'button', class: 'btn btn-piccolo', 'aria-expanded': String(aperto), onclick: () => { if (aperto) st.aperti.delete(v.uid); else st.aperti.add(v.uid); disegna(); } }, aperto ? 'Chiudi' : 'Guarda'),
        h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Nome, PV, armi e il resto della scheda: cambia solo questa voce della bozza, non il bestiario', onclick: () => ritocca(v) }, 'Ritocca'),
        h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => modifica((x) => togliVoce(x, v.uid)) }, 'Togli')),
      aperto ? schedaBreve(n) : null);
  };
  const schedaBreve = (n) => h('div', { class: 'scheda-breve' },
    h('p', {}, `Caratteristiche: ${Object.entries(n.caratteristiche ?? {}).map(([k, x]) => `${k} ${x}`).join(' · ') || '—'}`),
    h('p', {}, `Prove Salvezza: ${Object.entries(n.salvezze ?? {}).map(([k, x]) => `${dati.caratteristiche.salvezze.find((s) => s.id === k)?.nome ?? k} ${x}`).join(' · ')} · Passo ${n.movimento?.passo} Q · ${n.azioni?.principali ?? 1} AzP`),
    h('ul', {}, n.attacchi.map((a) => h('li', {}, `${a.nome}: VA ${a.va}, ${a.danno} ${a.natura}${a.proprieta?.length ? `, ${a.proprieta.join(', ')}` : ''}${a.tipo === 'distanza' ? `, gittata ${a.gittata_q ?? '—'} Q` : ''}`))),
    n.capacita?.length ? h('p', {}, h('strong', {}, 'Capacità: '), n.capacita.map((c) => c.nome).join(', ')) : null,
    n.note ? h('p', { class: 'nota' }, n.note) : null);
  const ritocca = (v) => {
    apriEditorNemico(ctx, v.nemico, [], () => {}, {
      titolo: `Ritocca nella bozza: ${v.nemico.nome}`, titoloSalva: 'Salva nella bozza',
      salva: async (n) => { await modifica((x) => cambiaVoce(x, v.uid, { nemico: n })); avviso(`${n.nome}: ritoccato nella bozza (il bestiario non cambia).`); },
    });
  };
  const avvia = async (consuma) => {
    if (scontroAperto()) { avvisoErrore('C’è già uno scontro aperto: chiudilo con «Fine scontro» prima di iniziarne un altro.'); return; }
    await coda;
    const b = st.bozza;
    const scelti = b.pg?.length ? (await Promise.all(b.pg.map(vista))).filter((x) => x?.completa) : alTavolo();
    const pg = pgDellaBozza(b, scelti.map(pgDaVista));
    const dado = dadoIniziativa(dati);
    let scontro;
    try { scontro = iniziaBozza(b, { id: idNuovo(), pg, dati, tiro: () => tira(dado).tiro }); } catch (e) { avvisoErrore(`Non iniziato: ${e.message}`); return; }
    const ok = await inizia(scontro, b.pg ?? []);
    if (!ok) return;
    if (consuma) {
      try { await salvaScontro(eliminaBozza(b)); } catch (e) { avvisoErrore(`Scontro iniziato, ma la bozza non è stata archiviata: ${e.message}`); }
    }
    avviso(`«${b.nome}» iniziato: Iniziativa tirata, Round 1.${consuma ? ' Bozza archiviata.' : ' La bozza resta.'}`);
    finestra.close();
  };

  const disegna = () => {
    nascondiTooltip();
    const scorrimento = finestra.scrollTop;
    finestra.replaceChildren(h('div', { class: 'pannello-contenuto' },
      h('header', { class: 'pannello-testa' },
        h('h2', { id: 'preparazione-titolo' }, st.bozza ? `Prepara scontro: ${st.bozza.nome}` : 'Prepara scontro'),
        h('button', { type: 'button', class: 'btn tondo chiudi', 'aria-label': 'Chiudi', onclick: () => finestra.close() }, '×')),
      st.bozza ? bozzaAperta() : elenco()));
    finestra.scrollTop = scorrimento;
  };
  disegna();
  document.body.append(finestra);
  finestra.showModal();
  carica();
  caricaCartella();
}
