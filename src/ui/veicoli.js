// Tab Veicoli della scheda digitale (lotto 3 dei Veicoli, docs/ricognizione-2026-10-03.md; Manuale dei Veicoli
// 0.2). I veicoli stanno nelle scelte del personaggio (decisione provvisoria in attesa di A.91, data/veicoli.json →
// personaggio); regole e calcoli in src/veicoli.js, qui solo l'interfaccia: aggiungi dal catalogo o scritto a
// mano, profilo, Pilotare del conducente con la provenienza, andature, tre strutture con PI, soglie e stato,
// rinforzi, NEC, «Colpito», «Ripara», PI a mano, «Rimuovi». Più il promemoria del conducente per Combattimento.
import { h, segno } from './dom.js';
import { infoValore } from './tooltip.js';
import { rigaScelte } from './pannello-passi.js';
import {
  nuovoVeicolo, vistaVeicoloPersonaggio, pilotareDelPersonaggio, colpisciVeicolo, applicaRiparazione, conPi,
  montaRicambio, struttureVeicolo, profiloDi, consumaRisorse, installaRicambioEnergia, munizioniArmaVeicolo,
  sollecitazioneFallita, eseguiCambioAndatura, movimentoMassimo, profiloVeicolo as profiloDelCatalogo,
} from '../veicoli.js';
import { migraVeicoli, nuovoRecord, riferimento, vede, eRiferimento, statoMovimento, muoviVeicolo, cambiaConducente, movimentoResiduo, stessaChiave, scegliAndatura } from '../veicoli-registro.js';
import { elencoVeicoli, scriviVeicolo, aggiornaVeicolo } from './veicoli-registro.js';

const numero = (n) => (Number.isInteger(n) ? n.toLocaleString('it-IT') : '—');
const daDefinire = () => h('em', { class: 'da-definire' }, 'da definire');
/** VA anche negativo, col segno meno tipografico. */
const va = (n) => (n < 0 ? `−${-n}` : String(n));
const intero = (v, d = 0) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? n : d; };
/** Abilità della tab Abilità (VA effettivi con la provenienza), per Pilotare del conducente. */
const abilitaDellaTab = (ctx) => {
  const tab = (ctx.tab.tab.find((t) => t.id === 'abilita')?.dati?.categorie ?? []).flatMap((c) => c.abilita ?? []);
  return tab.length ? tab : ctx.tab.scheda?.abilita ?? [];
};
/** Stato dei pannelli della tab (aggiungi, colpo, riparazione), in ctx.ui: non si salva. */
const statoUi = (ctx) => (ctx.ui.veicoli ??= { aggiungi: null, colpo: {}, ripara: {} });

/** Salva la lista dei veicoli nelle scelte, con un messaggio facoltativo in testa alla scheda. */
function salva(ctx, veicoli, messaggio = null) {
  ctx.azioni.veicoli(veicoli, messaggio);
}
const sostituisci = (ctx, mezzo) => (ctx.scelte.veicoli ?? []).map((v) => (v.uid === mezzo.uid ? mezzo : v));

export function tabVeicoli(ctx) {
  // A.91 (E&L del 05/10/2026): con il server il veicolo è un record unico del registro (veicoli/), condiviso con il
  // Tavolo del Master; senza server resta nel file del PG come copia locale
  if (ctx.server) return tabVeicoliRegistro(ctx);
  const veicoli = (ctx.scelte.veicoli ?? []).filter((v) => !eRiferimento(v));
  const P = ctx.dati.veicoli.personaggio ?? {};
  const pilotare = pilotareDelPersonaggio(abilitaDellaTab(ctx), ctx.dati, { scheda: ctx.tab.scheda });
  const riferimenti = (ctx.scelte.veicoli ?? []).filter(eRiferimento);
  return [
    h('p', { class: 'riquadro attenzione' }, 'Senza il server di Mutant (avvia-server.bat) il veicolo è una copia locale in questa scheda: la scheda unica condivisa con le altre schede e con il Tavolo del Master richiede il server (A.91).'),
    riferimenti.length ? h('p', { class: 'nota' }, `Nel registro dei veicoli del Tavolo: ${riferimenti.map((x) => x.nome).join(', ')}. Si vedono e si modificano con il server acceso.`) : null,
    h('div', { class: 'riga-azioni' }, h('button', { type: 'button', class: 'btn primario', onclick: () => { statoUi(ctx).aggiungi = statoUi(ctx).aggiungi ? null : { origine: ctx.dati.veicoli.profili[0]?.id ?? 'mano', nome: '', scheda: {} }; ctx.azioni.ridisegna(); } }, 'Aggiungi veicolo')),
    statoUi(ctx).aggiungi ? pannelloAggiungi(ctx) : null,
    veicoli.length ? veicoli.map((v) => schedaVeicolo(ctx, v, pilotare))
      : h('section', { class: 'riquadro nessun-potere' }, h('h2', {}, 'Nessun veicolo'),
        P.nessun_veicolo ? h('p', { class: 'nota' }, P.nessun_veicolo) : null),
  ];
}

// --- registro unico (A.91) ---------------------------------------------------------------------------

/** Stato del registro nella tab (ctx.ui, non si salva): record letti, avvisi della migrazione. */
const statoRegistro = (ctx) => (statoUi(ctx).registro ??= { stato: 'da-leggere', record: [], avvisi: [], letto: 0 });

/** Legge il registro e migra i veicoli salvati nel file del PG (una volta): nel file resta il riferimento. */
async function leggiRegistro(ctx) {
  const R = statoRegistro(ctx);
  R.stato = 'in-lettura';
  try {
    let lista = await elencoVeicoli();
    const m = migraVeicoli(ctx.scelte.veicoli ?? [], ctx.chi, lista);
    for (const rec of m.nuovi) {
      const r = await scriviVeicolo(rec);
      lista = [...lista.filter((x) => x.id !== rec.id), r.record ?? r.attuale];
    }
    R.record = lista;
    R.avvisi = m.avvisi;
    R.stato = 'pronto';
    R.letto = Date.now();
    R.errore = null;
    if (m.nuovi.length) ctx.azioni.veicoli(m.veicoli, `Veicoli nel registro unico del Tavolo: ${m.nuovi.map((x) => x.mezzo.nome).join(', ')} (A.91). Nella scheda resta il riferimento.`);
    else ctx.azioni.ridisegna();
  } catch (e) {
    R.stato = 'errore';
    R.errore = e.message;
    ctx.azioni.ridisegna();
  }
}

function tabVeicoliRegistro(ctx) {
  const R = statoRegistro(ctx);
  if (R.stato === 'da-leggere' || (R.stato === 'pronto' && Date.now() - R.letto > 15000)) { R.stato = 'in-lettura'; void leggiRegistro(ctx); }
  const P = ctx.dati.veicoli.personaggio ?? {};
  const pilotare = pilotareDelPersonaggio(abilitaDellaTab(ctx), ctx.dati, { scheda: ctx.tab.scheda });
  const rif = new Set((ctx.scelte.veicoli ?? []).filter(eRiferimento).map((x) => x.rif));
  const visibili = R.record.filter((x) => rif.has(x.id) || vede(x, ctx.chi));
  const locali = (ctx.scelte.veicoli ?? []).filter((v) => !eRiferimento(v));
  const mancanti = [...rif].filter((id) => R.stato === 'pronto' && !R.record.some((x) => x.id === id));
  const scrivi = async (prima, dopo, messaggio) => {
    try {
      const { record, conflitti } = await aggiornaVeicolo(prima, dopo);
      R.record = R.record.map((x) => (x.id === record.id ? record : x));
      const avviso = conflitti.length ? `${record.mezzo.nome}: ${conflitti.join(', ')} cambiati anche altrove nel frattempo, resta il valore del registro.` : null;
      ctx.azioni.veicoli(ctx.scelte.veicoli ?? [], avviso ?? messaggio ?? null);
    } catch (e) { R.errore = e.message; ctx.azioni.ridisegna(); }
  };
  const scheda = (rec) => {
    const mio = stessaChiave(rec.conducente?.chiave, ctx.chi?.chiave);
    const vista = { ...rec.mezzo, gruppo: rec.proprietario?.tipo === 'gruppo', conducente: mio };
    const togli = ({ gruppo: _g, conducente: _c, ...m }) => m;
    return schedaVeicolo(ctx, vista, pilotare, {
      aggiorna: (nuovo, messaggio = null) => scrivi(rec, { ...rec, mezzo: togli(nuovo) }, messaggio),
      gruppo: (si) => scrivi(rec, { ...rec, proprietario: si ? { tipo: 'gruppo' } : { tipo: 'pg', ...(ctx.chi?.pg ? { pg: ctx.chi.pg } : {}), chiave: ctx.chi?.chiave, nome: ctx.chi?.nome } }, si ? 'Veicolo del gruppo.' : 'Veicolo di questo personaggio.'),
      guida: (si) => scrivi(rec, { ...rec, conducente: si ? { ...(ctx.chi?.pg ? { pg: ctx.chi.pg } : {}), chiave: ctx.chi?.chiave, nome: ctx.chi?.nome } : (mio ? null : rec.conducente) }, si ? 'Alla guida.' : null),
      rimuovi: rif.has(rec.id) ? h('button', { type: 'button', class: 'btn', title: 'Toglie il riferimento da questa scheda; il record resta nel registro (veicoli/)', onclick: () => ctx.azioni.veicoli((ctx.scelte.veicoli ?? []).filter((x) => x.rif !== rec.id), `${rec.mezzo.nome}: riferimento tolto dalla scheda.`) }, 'Togli dalla scheda') : null,
      righe: h('p', { class: 'nota' }, `Registro unico (veicoli/${rec.id}.json, revisione ${rec.revisione}) · proprietario: ${rec.proprietario?.tipo === 'gruppo' ? 'il gruppo' : rec.proprietario?.nome ?? '—'} · conducente: ${rec.conducente?.nome ?? 'nessuno'}${rec.mitragliere ? ` · mitragliere: ${rec.mitragliere.nome}` : ''}`),
    });
  };
  return [
    h('p', { class: 'nota' }, 'Scheda unica dei veicoli (A.91): le modifiche vanno al registro del Tavolo e le vedono le altre schede e il master. Qui compaiono i veicoli di questo personaggio, quelli del gruppo e quello che guida.'),
    h('div', { class: 'riga-azioni' },
      h('button', { type: 'button', class: 'btn primario', onclick: () => { statoUi(ctx).aggiungi = statoUi(ctx).aggiungi ? null : { origine: ctx.dati.veicoli.profili[0]?.id ?? 'mano', nome: '', scheda: {} }; ctx.azioni.ridisegna(); } }, 'Aggiungi veicolo'),
      h('button', { type: 'button', class: 'btn', onclick: () => { R.stato = 'da-leggere'; ctx.azioni.ridisegna(); } }, 'Ricarica dal registro')),
    R.stato === 'errore' ? h('p', { class: 'riquadro errore' }, `Registro dei veicoli non leggibile: ${R.errore}`) : R.errore ? h('p', { class: 'riquadro attenzione' }, R.errore) : null,
    R.avvisi.map((x) => h('p', { class: 'riquadro attenzione' }, x)),
    mancanti.map((id) => h('p', { class: 'riquadro attenzione' }, `Il veicolo ${id} non è nel registro di questo server.`)),
    statoUi(ctx).aggiungi ? pannelloAggiungi(ctx, async (mezzo) => {
      const r = await scriviVeicolo(nuovoRecord(mezzo, ctx.chi, { gruppo: false, guida: false }));
      if (r.record) { R.record = [...R.record, r.record]; ctx.azioni.veicoli([...(ctx.scelte.veicoli ?? []), riferimento(r.record)], `Aggiunto il veicolo «${mezzo.nome}» al registro.`); }
    }) : null,
    R.stato === 'in-lettura' && !R.record.length ? h('p', { class: 'nota' }, 'Lettura del registro dei veicoli…') : null,
    visibili.map(scheda),
    // un veicolo rimasto nel file (doppione del gruppo): copia locale, con l'avviso
    locali.map((v) => schedaVeicolo(ctx, v, pilotare)),
    !visibili.length && !locali.length && R.stato === 'pronto' ? h('section', { class: 'riquadro nessun-potere' }, h('h2', {}, 'Nessun veicolo'), P.nessun_veicolo ? h('p', { class: 'nota' }, P.nessun_veicolo) : null) : null,
  ];
}

// --- aggiungi --------------------------------------------------------------------------------------

function pannelloAggiungi(ctx, inRegistro = null) {
  const a = statoUi(ctx).aggiungi;
  const profili = ctx.dati.veicoli.profili;
  const campo = (etichetta, chiave, { tipo = 'number', min = 0 } = {}) => h('label', { class: 'campo-veicolo' }, `${etichetta} `,
    h('input', { type: tipo, ...(tipo === 'number' ? { min, step: 1, inputmode: 'numeric', class: 'input-d10' } : {}), value: chiave.split('.').reduce((o, k) => o?.[k], a.scheda) ?? '',
      onchange: (e) => {
        const parti = chiave.split('.');
        let o = a.scheda;
        for (const k of parti.slice(0, -1)) o = (o[k] ??= {});
        o[parti.at(-1)] = tipo === 'number' ? intero(e.target.value, 0) : e.target.value;
      } }));
  const conferma = () => {
    const mezzo = a.origine === 'mano' ? nuovoVeicolo({ ...a.scheda, nome: a.nome || a.scheda.nome }, ctx.dati, { nome: a.nome }) : nuovoVeicolo(a.origine, ctx.dati, { nome: a.nome });
    if (!mezzo) return;
    statoUi(ctx).aggiungi = null;
    if (inRegistro) { void inRegistro(mezzo); return; }
    salva(ctx, [...(ctx.scelte.veicoli ?? []), mezzo], `Aggiunto il veicolo «${mezzo.nome}».`);
  };
  return h('section', { class: 'riquadro pannello-veicolo' },
    h('h2', {}, 'Aggiungi veicolo'),
    rigaScelte('Dal catalogo', [...profili.map((p) => ({ valore: p.id, etichetta: p.nome, riga: `MOV ${p.mov_q} Q · AR ${p.ar.totale} · ${p.equipaggio.posti} posti` })), { valore: 'mano', etichetta: 'Scritto a mano', riga: 'profilo libero' }],
      a.origine, (v) => { a.origine = v; ctx.azioni.ridisegna(); }),
    h('label', { class: 'campo-veicolo' }, 'Nome (facoltativo) ', h('input', { type: 'text', value: a.nome, placeholder: a.origine === 'mano' ? 'Veicolo' : profili.find((p) => p.id === a.origine)?.nome, onchange: (e) => { a.nome = e.target.value; } })),
    a.origine === 'mano' ? h('div', { class: 'campi-veicolo' },
      campo('MOV (Q)', 'mov_q'), campo('MAN (da −2 a +2)', 'man', { min: -2 }), campo('AR', 'ar.totale'), campo('di cui magica', 'ar.magica'),
      campo('Corazzato', 'corazzato'), campo('PI Corpo', 'pi.corpo', { min: 1 }), campo('PI Propulsione', 'pi.propulsione', { min: 1 }), campo('PI Motore', 'pi.motore', { min: 1 }),
      campo('Posti', 'equipaggio.posti', { min: 1 }), campo('Qualità', 'qualita', { tipo: 'text' })) : null,
    h('p', { class: 'riga-azioni' }, h('button', { type: 'button', class: 'btn primario', onclick: conferma }, 'Aggiungi'),
      h('button', { type: 'button', class: 'btn', onclick: () => { statoUi(ctx).aggiungi = null; ctx.azioni.ridisegna(); } }, 'Annulla')));
}

// --- scheda di un veicolo ---------------------------------------------------------------------------

function schedaVeicolo(ctx, mezzo, pilotare, registro = null) {
  const d = ctx.dati;
  const v = vistaVeicoloPersonaggio(mezzo, d, { pilotare });
  if (!v) {
    return h('section', { class: 'sezione-tab scheda-veicolo' }, h('h2', {}, mezzo.nome ?? 'Veicolo'),
      h('p', { class: 'riquadro attenzione' }, `Il profilo «${mezzo.profilo}» non è più nel catalogo dei veicoli: il mezzo resta nel file, senza scheda.`),
      pulsanteRimuovi(ctx, mezzo));
  }
  const p = v.profilo;
  // con il registro (A.91) le modifiche vanno al record unico; gruppo e conducente sono del record
  const aggiorna = registro ? registro.aggiorna : (nuovo, messaggio = null) => salva(ctx, sostituisci(ctx, nuovo), messaggio);
  return h('section', { class: `sezione-tab scheda-veicolo${v.vista.fuoriUso ? ' fuori-uso' : ''}`, dataset: { uid: mezzo.uid } },
    h('header', { class: 'testa-veicolo' },
      h('h2', {}, h('input', { type: 'text', class: 'nome-veicolo', value: v.nome, 'aria-label': 'Nome del veicolo', onchange: (e) => aggiorna({ ...mezzo, nome: e.target.value.trim() || p.nome }) })),
      h('span', { class: 'sigla' }, v.manuale ? 'scritto a mano' : `${p.nome} · ${p.paragrafo}`),
      h('label', { class: 'casella-veicolo' }, h('input', { type: 'checkbox', checked: v.gruppo, onchange: (e) => (registro ? registro.gruppo(e.target.checked) : aggiorna({ ...mezzo, gruppo: e.target.checked })) }), ' Veicolo del gruppo'),
      h('label', { class: 'casella-veicolo' }, h('input', { type: 'checkbox', checked: mezzo.conducente === true, onchange: (e) => (registro ? registro.guida(e.target.checked) : aggiorna({ ...mezzo, conducente: e.target.checked })) }), ' Lo guido io'),
      registro ? registro.rimuovi : pulsanteRimuovi(ctx, mezzo)),
    registro?.righe ?? null,
    v.vista.fuoriUso ? h('p', { class: 'riquadro errore' }, 'Fuori uso: Corpo principale o Motore a 0 PI. Il mezzo non funziona, non esplode e il movimento residuo prosegue (§5.5).') : null,
    v.gruppo && !registro ? h('p', { class: 'nota' }, 'Veicolo del gruppo: senza il server le modifiche restano in questa scheda (A.91).') : null,
    h('div', { class: 'veicolo-colonne' },
      h('div', {}, profiloVeicolo(v, d), pilotareVeicolo(v, d), andatureVeicolo(ctx, mezzo, v, aggiorna)),
      h('div', {}, struttureVeicoloUi(ctx, mezzo, v, aggiorna), rinforziVeicolo(mezzo, v, aggiorna, ctx), necVeicolo(ctx, mezzo, v, aggiorna), munizioniVeicolo(ctx, mezzo, v, aggiorna))),
    armiEProprieta(v),
    h('div', { class: 'riga-azioni azioni-veicolo' },
      h('button', { type: 'button', class: 'btn', onclick: () => { const u = statoUi(ctx); u.colpo[mezzo.uid] = u.colpo[mezzo.uid] ? null : { modo: 'd20', d20: 10, struttura: 'corpo', danni: '', natura: 'Naturale', magistrale: false, piAggiuntivi: 0, ps: 'fallita', esposti: true }; ctx.azioni.ridisegna(); } }, 'Colpito'),
      h('button', { type: 'button', class: 'btn', onclick: () => { const u = statoUi(ctx); u.ripara[mezzo.uid] = u.ripara[mezzo.uid] ? null : { struttura: v.strutture.find((s) => s.pi < s.massimi)?.struttura ?? 'corpo', esito: 'successo', capacita: [], improvvisati: false, kit: false }; ctx.azioni.ridisegna(); } }, 'Ripara')),
    statoUi(ctx).colpo[mezzo.uid] ? pannelloColpo(ctx, mezzo, v, aggiorna) : null,
    statoUi(ctx).ripara[mezzo.uid] ? pannelloRipara(ctx, mezzo, v, aggiorna) : null,
    h('label', { class: 'note-veicolo' }, 'Avarie e note ', h('textarea', { rows: 2, value: mezzo.avarie ?? '', onchange: (e) => aggiorna({ ...mezzo, avarie: e.target.value }) })));
}

function pulsanteRimuovi(ctx, mezzo) {
  return h('button', { type: 'button', class: 'btn pericolo', onclick: () => {
    if (!window.confirm(`Rimuovere il veicolo «${mezzo.nome}» da questa scheda?`)) return;
    salva(ctx, (ctx.scelte.veicoli ?? []).filter((x) => x.uid !== mezzo.uid), `Rimosso il veicolo «${mezzo.nome}».`);
  } }, 'Rimuovi');
}

function profiloVeicolo(v, d) {
  const p = v.profilo;
  const voce = (etichetta, valore) => h('div', { class: 'voce-profilo' }, h('dt', {}, etichetta), h('dd', {}, valore));
  return h('dl', { class: 'profilo-veicolo' },
    voce('MOV', `${numero(p.mov_q)} Q`),
    voce('MAN', `${segno(p.man ?? 0)}${v.fascia ? ` (${v.fascia.nome})` : ''}`),
    voce('Corazzato', String(p.corazzato ?? 0)),
    voce('AR', `${p.ar?.totale ?? 0}${p.ar?.magica ? ` (${p.ar.magica} magica)` : ''}`),
    voce('PS Integrità', p.ps_integrita !== null && p.ps_integrita !== undefined ? `${p.ps_integrita} (${p.qualita ?? '—'})` : daDefinire()),
    voce('Posti', p.equipaggio?.posti ? `${p.equipaggio.posti}${p.equipaggio.passeggeri !== undefined ? ` (conducente + ${p.equipaggio.passeggeri})` : ''}` : '—'),
    voce('Prezzo', v.daDefinire.prezzo ? [Number.isInteger(p.prezzo_cr) ? `${numero(p.prezzo_cr)} cr, parziale · ` : null, daDefinire()] : `${numero(p.prezzo_cr)} cr`),
    voce('Reperibilità', v.daDefinire.reperibilita ? daDefinire() : p.reperibilita),
    p.carico_kg ? voce('Carico', `${numero(p.carico_kg)} kg`) : null,
    v.todo ? h('p', { class: 'nota todo-veicolo' }, `Da chiarire con Davide: ${v.todo}`) : null);
}

function pilotareVeicolo(v, d) {
  if (!v.pilotarePersonale) return h('p', { class: 'nota' }, 'Il personaggio non ha l’Abilità Pilotare.');
  if (!v.conducente) {
    return h('p', { class: 'riga-pilotare' }, `Pilotare (personale): VA ${v.pilotarePersonale.va}. Spunta «Lo guido io» per il VA da conducente con MAN, andatura e danni.`);
  }
  const pr = v.pilotare;
  return h('p', { class: 'riga-pilotare' }, h('strong', {}, 'Pilotare da conducente: VA '),
    infoValore(h('strong', {}, va(pr.valore)), {
      titolo: `Pilotare (${v.nome}): ${va(pr.valore)}`,
      sottotitolo: 'VA personale + MAN + andatura + danni (solo la penalità peggiore, §4.4)',
      provenienza: pr.provenienza,
      sezioni: [{ testo: d.veicoli.pilotare.frasi?.[1] ?? '' }],
    }, { classe: 'pillola-va' }),
    h('small', { class: 'nota' }, ` · la guida ordinaria non richiede Prova (§1.2)`));
}

function andatureVeicolo(ctx, mezzo, v, aggiorna) {
  const A = v.andature;
  const attuale = v.vista.andatura;
  const scelta = v.andaturaScelta;
  // A.104: la scelta è l'andatura che si vuole adottare; l'attuale cambia solo quando il cambio è eseguito
  return h('div', { class: 'andature-veicolo' },
    rigaScelte('Andatura scelta (1 AzM cambia una fascia, §2.1)', A.map((a) => ({ valore: a.id, etichetta: a.nome, riga: `${numero(a.q)} Q` })), scelta?.id ?? attuale.id,
      (x) => aggiorna({ ...mezzo, andatura_scelta: x === mezzo.andatura ? null : x })),
    h('p', { class: 'riga-andatura' }, h('strong', {}, `Attuale: ${attuale.nome}`), scelta ? ` · scelta: ${scelta.nome} ` : ' ',
      scelta ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Una fascia verso quella scelta (1 AzM); il salto di due fasce richiede l’accelerazione forzata', onclick: () => { const n = eseguiCambioAndatura(mezzo, ctx.dati); aggiorna(n, `${v.nome}: andatura ${A.find((a) => a.id === n.andatura)?.nome}.`); } }, 'Esegui il cambio (1 AzM)') : null,
      scelta ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Fuori dal Round: l’andatura scelta diventa subito quella attuale', onclick: () => aggiorna({ ...mezzo, andatura: scelta.id, andatura_scelta: null }) }, 'Fuori dal Round: subito') : null),
    h('p', { class: 'nota' }, 'Per collisioni e attacchi conta l’andatura attuale, anche prima che il mezzo agisca nel Round; un mezzo fermo conta 0 Q (A.104).'),
    h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta tabella-andature' },
      h('thead', {}, h('tr', {}, ['Andatura', 'Q nel Round', 'Pilotare', 'Attacchi da bordo', 'Attacchi contro il mezzo'].map((c) => h('th', {}, c)))),
      h('tbody', {}, A.map((a) => h('tr', { class: a.attuale ? 'attuale' : null },
        h('th', { scope: 'row' }, a.nome), h('td', {}, numero(a.q)), h('td', {}, a.pilotare ? segno(a.pilotare) : '0'),
        h('td', {}, a.attacco_da_bordo ? segno(a.attacco_da_bordo) : '0'), h('td', {}, a.attacco_contro ? segno(a.attacco_contro) : '0')))))));
}

/** Quadratini dei PI di una struttura: bianchi i PI attuali, pieni quelli persi (come l’Umanità). */
function quadratiniPi(attuali, massimi) {
  return h('div', { class: 'quadratini-pi', role: 'img', 'aria-label': `${attuali} PI su ${massimi}` },
    Array.from({ length: massimi }, (_, i) => h('span', { class: `casella${i < attuali ? '' : ' persa'}` })));
}

function struttureVeicoloUi(ctx, mezzo, v, aggiorna) {
  return h('div', { class: 'strutture-veicolo' }, v.strutture.map((s) => {
    const cambia = (n) => aggiorna(conPi(mezzo, s.struttura, Math.max(0, Math.min(s.massimi, n))));
    const pen = s.fuoriUso ? 'fuori uso' : s.ripristinata ? `ripristinata: Pilotare ${segno(s.penalita)}` : s.penalita ? `Pilotare ${segno(s.penalita)}` : s.parziale ? `Pilotare ${segno(s.parziale)}` : 'nessuna penalità';
    return h('div', { class: `struttura-veicolo stato-${s.stato}` },
      h('h3', {}, s.nome, ' ', h('span', { class: `etichetta stato-struttura stato-${s.stato}` }, s.statoNome ?? '—'), h('small', { class: 'nota' }, ` · ${pen}`)),
      h('p', { class: 'riga-pi' },
        h('button', { type: 'button', class: 'btn tondo', 'aria-label': `Togli un PI a ${s.nome}`, disabled: s.pi <= 0, onclick: () => cambia(s.pi - 1) }, '−'),
        h('input', { type: 'number', class: 'input-d10', min: 0, max: s.massimi, value: s.pi, 'aria-label': `PI attuali di ${s.nome}`, onchange: (e) => cambia(intero(e.target.value, s.pi)) }),
        h('span', {}, ` / ${s.massimi} PI `),
        h('button', { type: 'button', class: 'btn tondo', 'aria-label': `Aggiungi un PI a ${s.nome}`, disabled: s.pi >= s.massimi, onclick: () => cambia(s.pi + 1) }, '+')),
      quadratiniPi(s.pi, s.massimi),
      h('p', { class: 'soglie-veicolo nota' }, s.soglie.map((x, i) => [i ? ' · ' : null,
        h('span', { class: x.stato === s.stato ? 'attuale' : null }, `${x.nome} ${x.da === x.a ? x.da : `${x.da}–${x.a}`}`, x.penalita === null ? ' (fuori uso)' : x.penalita ? ` (${segno(x.penalita)})` : '')])));
  }));
}

function rinforziVeicolo(mezzo, v, aggiorna, ctx) {
  if (!v.rinforzi.length) return null;
  return h('div', { class: 'rinforzi-veicolo' }, v.rinforzi.map((r) => {
    const nuovo = montaRicambio(mezzo, r.id);
    return h('div', {},
      h('h3', {}, r.nome, h('small', { class: 'nota' }, ` · ${r.struttura}, PS Integrità ${r.ps ?? '—'}`)),
      h('p', {}, 'Montati: ', r.montati.map((n, i) => h('span', { class: `pezzo-rinforzo${n === 0 ? ' esaurito' : ''}` }, `${i ? ' · ' : ''}${n}/${r.piPerPezzo}`)),
        ` · ricambi: ${r.ricambi.length ? r.ricambi.map((n) => `${n}/${r.piPerPezzo}`).join(', ') : 'nessuno'} `,
        h('button', { type: 'button', class: 'btn btn-piccolo', disabled: !nuovo, title: nuovo ? 'Sostituisce il primo pezzo esaurito con un ricambio (30 minuti e una Prova di Tecnologia, dalla scheda)' : 'Serve un pezzo esaurito e un ricambio', onclick: () => aggiorna(nuovo, `${r.nome}: montato un ricambio.`) }, 'Monta un ricambio'), ' ',
        // A.101: Terre del Fuoco, oltre 30 Q effettivi nel Round una PS Integrità 12; fallita: −1 PI
        r.sollecitazioni ? h('button', { type: 'button', class: 'btn btn-piccolo', title: `${r.sollecitazioni.ambiente}: oltre ${r.sollecitazioni.oltre_q} Q effettivi nel Round, una PS Integrità ${r.sollecitazioni.ps_integrita} a fine movimento. Fallita: −1 PI al copriruota attivo, o alla Propulsione; ignora AR e Corazzato.`, onclick: () => { const x = sollecitazioneFallita(mezzo, ctx.dati); aggiorna(x.mezzo, x.avviso); } }, 'Sollecitazione: PS fallita') : null),
      h('p', { class: 'nota' }, r.frasi[1] ?? ''));
  }));
}

function necVeicolo(ctx, mezzo, v, aggiorna) {
  const n = v.nec;
  const r = v.risorse;
  if (!n && !r?.verde && !r?.aria) return null;
  const u = statoUi(ctx);
  const c = (u.consumi ??= {})[mezzo.uid] ??= { km: '', fermo: '', supporto: '' };
  const numeroDa = (x) => Math.max(0, Number.parseFloat(String(x).replace(',', '.')) || 0);
  const applica = () => {
    const esito = consumaRisorse(mezzo, { km: numeroDa(c.km), oreFermo: numeroDa(c.fermo), oreSupporto: numeroDa(c.supporto) }, ctx.dati);
    u.consumi[mezzo.uid] = { km: '', fermo: '', supporto: '' };
    aggiorna(esito.mezzo, [...esito.righe, ...esito.avvisi].join('; ') || null);
  };
  const banco = (lista, cap, colore, etichetta) => lista.map((lx, i) => h('label', { class: 'campo-veicolo' }, `${etichetta} ${lista.length > 1 ? i + 1 : ''} `,
    h('input', { type: 'number', class: 'input-lx', min: 0, max: cap, step: 100, value: lx, 'aria-label': `Lx residui, ${etichetta} ${i + 1}`,
      onchange: (e) => { const nuovi = [...lista]; nuovi[i] = Math.max(0, Math.min(cap, intero(e.target.value, lx))); aggiorna({ ...mezzo, energia: { ...mezzo.energia, [colore]: nuovi } }); } }), ` / ${numero(cap)} Lx `));
  const ricambio = (colore, ric) => h('button', { type: 'button', class: 'btn btn-piccolo', disabled: !ric?.length, title: 'Installa il ricambio al posto del NEC più scarico; quello tolto resta fra i ricambi con il suo residuo (niente travaso)',
    onclick: () => { const x = installaRicambioEnergia(mezzo, colore, ctx.dati); if (x) aggiorna(x, `${v.nome}: installato il ricambio ${colore === 'rosso' ? 'Rosso' : 'Verde'}.`); } }, 'Installa il ricambio');
  return h('div', { class: 'nec-veicolo' },
    h('h3', {}, 'Energia e supporto vitale'),
    r?.rosso ? [
      h('p', {}, h('strong', {}, `${r.rosso.nome}: ${numero(r.rosso.totale)} / ${numero(r.rosso.capacita)} Lx`), r.rosso.autonomiaKm !== null ? ` · ${numero(r.rosso.autonomiaKm)} km di autonomia` : ''),
      h('p', {}, banco(r.rosso.banchi, r.rosso.capacitaBanco, 'rosso', 'Banco')),
      h('p', { class: 'nota' }, `Ricambi: ${r.rosso.ricambi.length ? r.rosso.ricambi.map((x) => `${numero(x)} Lx`).join(', ') : 'nessuno'} `, ricambio('rosso', r.rosso.ricambi)),
      h('p', { class: 'nota' }, 'Consumo ', Number.isInteger(r.rosso.consumoKm) ? `${r.rosso.consumoKm} Lx/km` : daDefinire(), r.rosso.consumoFermo ? ` · da fermo con i servizi ${r.rosso.consumoFermo} Lx/ora` : '', r.rosso.erogazione ? ` · erogazione massima ${numero(r.rosso.erogazione)} Lx/ora` : ''),
    ] : n ? h('p', {}, `${n.nec}: `, daDefinire()) : null,
    r?.verde ? [
      h('p', {}, h('strong', {}, `${r.verde.nome}: ${numero(r.verde.totale)} / ${numero(r.verde.capacita)} Lx`), ` · supporto vitale ${r.verde.consumoOra} Lx/ora, ${r.verde.ore} ore`),
      h('p', {}, banco(r.verde.moduli, r.verde.capacita, 'verde', 'Modulo')),
      h('p', { class: 'nota' }, `Ricambi: ${r.verde.ricambi.length ? r.verde.ricambi.map((x) => `${numero(x)} Lx`).join(', ') : 'nessuno'} `, ricambio('verde', r.verde.ricambi)),
    ] : null,
    r?.aria ? h('p', {}, h('strong', {}, `Aria: ${r.aria.ore} / ${r.aria.massimo} ore`), ` · riserva fissa ${r.aria.fissa} h, bombole ${r.aria.bombole.map((x) => `${x} h`).join(', ') || 'nessuna'}`) : null,
    r?.rosso || r?.verde ? h('div', { class: 'consumi-veicolo' },
      h('label', { class: 'campo-veicolo' }, 'Viaggio (km) ', h('input', { type: 'text', inputmode: 'decimal', class: 'input-d10', value: c.km, onchange: (e) => { c.km = e.target.value; } })),
      h('label', { class: 'campo-veicolo' }, 'Da fermo con i servizi (ore) ', h('input', { type: 'text', inputmode: 'decimal', class: 'input-d10', value: c.fermo, onchange: (e) => { c.fermo = e.target.value; } })),
      r?.verde ? h('label', { class: 'campo-veicolo' }, 'Supporto vitale (ore) ', h('input', { type: 'text', inputmode: 'decimal', class: 'input-d10', value: c.supporto, onchange: (e) => { c.supporto = e.target.value; } })) : null,
      h('button', { type: 'button', class: 'btn btn-piccolo', onclick: applica }, 'Consuma')) : null,
    r?.aria?.testo ? h('p', { class: 'nota' }, r.aria.testo) : null);
}

function munizioniVeicolo(ctx, mezzo, v, aggiorna) {
  const m = v.risorse?.munizioni;
  if (!m) return null;
  return h('div', { class: 'munizioni-veicolo' }, (v.profilo.armi ?? []).map((a, i) => {
    const x = m[i];
    if (!x) return null;
    const spara = (n) => aggiorna(munizioniArmaVeicolo(mezzo, i, { sparati: n }, ctx.dati));
    return h('p', {}, h('strong', {}, `${a.nome}: `), `${x.caricate} / ${a.capacita} caricate · riserva ${x.riserva} `,
      h('label', {}, 'colpi sparati ', h('input', { type: 'number', min: 1, class: 'input-d10', value: '', onchange: (e) => spara(intero(e.target.value, 0)) })), ' ',
      h('button', { type: 'button', class: 'btn btn-piccolo', disabled: !x.riserva || x.caricate >= a.capacita, onclick: () => aggiorna(munizioniArmaVeicolo(mezzo, i, { ricarica: true }, ctx.dati), `${a.nome}: ricaricata dalla riserva.`) }, 'Ricarica'),
      Number.isInteger(a.cr_per_colpo) ? h('small', { class: 'nota' }, ` · ${a.cr_per_colpo} cr a colpo`) : null);
  }));
}

function armiEProprieta(v) {
  const p = v.profilo;
  if (!(p.armi ?? []).length && !(p.proprieta ?? []).length && !(p.sistemi ?? []).length) return null;
  return h('div', { class: 'armi-proprieta-veicolo' },
    (p.armi ?? []).length ? h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta' },
      h('thead', {}, h('tr', {}, ['Arma di bordo', 'Abilità', 'Danno', 'Gittata', 'Modalità', 'Operatore'].map((c) => h('th', {}, c)))),
      h('tbody', {}, p.armi.map((a) => h('tr', {}, h('th', { scope: 'row' }, a.nome), h('td', {}, a.abilita), h('td', {}, a.danno), h('td', {}, `${numero(a.gittata_q)} Q`),
        h('td', {}, (a.modalita ?? []).join(', ')), h('td', {}, a.operatore ?? '—')))))) : null,
    [...(p.proprieta ?? []), ...(p.sistemi ?? [])].length ? h('ul', { class: 'proprieta-veicolo' }, [...(p.proprieta ?? []), ...(p.sistemi ?? [])].map((x) => h('li', {}, h('strong', {}, `${x.nome}: `), x.testo))) : null);
}

// --- Colpito e Ripara -------------------------------------------------------------------------------

function pannelloColpo(ctx, mezzo, v, aggiorna) {
  const d = ctx.dati;
  const c = statoUi(ctx).colpo[mezzo.uid];
  const ridisegna = () => ctx.azioni.ridisegna();
  const danni = String(c.danni).split(/[\s,;+]+/).map((x) => intero(x, NaN)).filter(Number.isFinite);
  const colpo = { danni, natura: c.natura, magistrale: c.magistrale, piAggiuntivi: intero(c.piAggiuntivi, 0), ps: c.ps === 'riuscita' };
  const scelta = c.modo === 'd20' ? { d20: Math.min(20, Math.max(1, intero(c.d20, 1))) } : { struttura: c.struttura };
  const r = danni.length || colpo.magistrale || colpo.piAggiuntivi ? colpisciVeicolo(mezzo, scelta, colpo, d, { occupantiEsposti: c.esposti }) : null;
  const L = d.veicoli.localizzazione;
  const nomeStr = (id) => d.veicoli.strutture.elenco.find((s) => s.id === id)?.nome ?? (id === 'occupanti' ? 'Occupanti' : id);
  return h('section', { class: 'riquadro pannello-veicolo pannello-colpo' },
    h('h3', {}, `Colpito: ${v.nome}`),
    rigaScelte('Localizzazione (§4.2)', [{ valore: 'd20', etichetta: '1d20', riga: 'tirato al tavolo' }, { valore: 'scelta', etichetta: 'Selezione accurata', riga: 'dichiarata prima della Prova' }], c.modo, (x) => { c.modo = x; ridisegna(); }),
    c.modo === 'd20'
      ? h('p', {}, h('label', {}, 'd20 ', h('input', { type: 'number', min: 1, max: 20, class: 'input-d10', value: c.d20, onchange: (e) => { c.d20 = intero(e.target.value, 1); ridisegna(); } })),
        h('small', { class: 'nota' }, ` ${L.righe.map((x) => `${x.da === x.a ? x.da : `${x.da}–${x.a}`} ${nomeStr(x.bersaglio)}`).join(' · ')}`),
        h('label', { class: 'casella-veicolo' }, h('input', { type: 'checkbox', checked: c.esposti, onchange: (e) => { c.esposti = e.target.checked; ridisegna(); } }), ' occupanti esposti'))
      : rigaScelte('Struttura', L.righe.filter((x) => x.bersaglio !== 'occupanti').map((x) => ({ valore: x.bersaglio, etichetta: nomeStr(x.bersaglio), riga: `${segno(x.accurata_va)} VA all’attacco` })), c.struttura, (x) => { c.struttura = x; ridisegna(); }),
    h('p', {}, h('label', {}, 'Danno di ogni applicazione ', h('input', { type: 'text', value: c.danni, placeholder: 'es. 9 o 7, 6', onchange: (e) => { c.danni = e.target.value; ridisegna(); } })),
      h('small', { class: 'nota' }, ' già con i moltiplicatori, prima dell’AR')),
    rigaScelte('Natura del danno', Object.keys(d.veicoli.danno.ar_per_natura).map((n) => ({ valore: n, etichetta: n })), c.natura, (x) => { c.natura = x; ridisegna(); }),
    h('p', {}, h('label', { class: 'casella-veicolo' }, h('input', { type: 'checkbox', checked: c.magistrale, onchange: (e) => { c.magistrale = e.target.checked; ridisegna(); } }), ' Successo Magistrale (+1 PI)'),
      h('label', {}, ' PI aggiuntivi delle proprietà ', h('input', { type: 'number', min: 0, class: 'input-d10', value: c.piAggiuntivi, onchange: (e) => { c.piAggiuntivi = intero(e.target.value, 0); ridisegna(); } }))),
    rigaScelte(`PS Integrità ${v.profilo.ps_integrita ?? '—'} della struttura (una per colpo, tirata al tavolo)`, [{ valore: 'fallita', etichetta: 'Fallita' }, { valore: 'riuscita', etichetta: 'Riuscita', riga: 'dimezza, minimo 1' }], c.ps, (x) => { c.ps = x; ridisegna(); }),
    r ? dettaglioColpo(r, d) : h('p', { class: 'nota' }, 'Scrivi il danno per vedere il calcolo.'),
    h('p', { class: 'riga-azioni' },
      h('button', { type: 'button', class: 'btn primario', disabled: !r, onclick: () => { statoUi(ctx).colpo[mezzo.uid] = null; aggiorna(r.mezzo, r.avviso); } }, 'Applica'),
      h('button', { type: 'button', class: 'btn', onclick: () => { statoUi(ctx).colpo[mezzo.uid] = null; ridisegna(); } }, 'Chiudi')));
}

function dettaglioColpo(r, d) {
  if (r.occupanti) return h('p', { class: 'riquadro attenzione' }, r.avviso);
  return h('div', { class: 'dettaglio-colpo' },
    h('p', {}, h('strong', {}, `${d.veicoli.strutture.elenco.find((s) => s.id === r.localizzazione.bersaglio)?.nome}${r.localizzazione.dirottato ? ' (occupanti non esposti: il Motore, §4.2)' : ''}`)),
    h('ul', {}, [...r.esito.provenienza.righe.map((x) => h('li', {}, `${x.fonte}: ${String(x.fonte).startsWith('Applicazione') ? x.valore : segno(x.valore)} PI${x.nota ? ` · ${x.nota}` : ''}`)),
      r.rinforzi ? h('li', {}, `${r.rinforzi.nome}: ${r.rinforzi.assorbiti} PI assorbiti, ${r.rinforzi.allaStruttura} alla struttura`) : null]),
    h('p', { class: 'riquadro attenzione' }, r.avviso));
}

function pannelloRipara(ctx, mezzo, v, aggiorna) {
  const d = ctx.dati;
  const R = d.veicoli.riparazione;
  const p = statoUi(ctx).ripara[mezzo.uid];
  const ridisegna = () => ctx.azioni.ridisegna();
  const { mezzo: nuovo, riparazione: r } = applicaRiparazione(mezzo, p.struttura, p.esito, d, { capacita: p.capacita, strumentiImprovvisati: p.improvvisati, kit: p.kit });
  const capacitaNomi = R.capacita.map((c) => (typeof c === 'string' ? c : c.nome));
  return h('section', { class: 'riquadro pannello-veicolo pannello-ripara' },
    h('h3', {}, `Ripara: ${v.nome}`),
    h('p', { class: 'nota' }, `Riparazione ordinaria: ${R.minuti} minuti per struttura, Prova di Tecnologia al termine (§7.1).`),
    rigaScelte('Struttura', v.strutture.map((s) => ({ valore: s.struttura, etichetta: s.nome, riga: `${s.pi}/${s.massimi} PI` })), p.struttura, (x) => { p.struttura = x; ridisegna(); }),
    rigaScelte('Esito della Prova di Tecnologia', R.esiti.map((e) => ({ valore: e.id, etichetta: e.nome, riga: `${segno(e.pi)} PI` })), p.esito, (x) => { p.esito = x; ridisegna(); }),
    h('fieldset', { class: 'capacita-riparazione' }, h('legend', {}, 'Capacità professionali (§7.2)'),
      capacitaNomi.map((n) => h('label', { class: 'casella-veicolo' }, h('input', { type: 'checkbox', checked: p.capacita.includes(n), onchange: (e) => { p.capacita = e.target.checked ? [...p.capacita, n] : p.capacita.filter((x) => x !== n); ridisegna(); } }), ` ${n}`)),
      h('label', { class: 'casella-veicolo' }, h('input', { type: 'checkbox', checked: p.improvvisati, onchange: (e) => { p.improvvisati = e.target.checked; ridisegna(); } }), ' Strumenti improvvisati'),
      v.profilo.kit_riparazione ? h('label', { class: 'casella-veicolo', title: v.profilo.kit_riparazione.testo }, h('input', { type: 'checkbox', checked: p.kit, onchange: (e) => { p.kit = e.target.checked; ridisegna(); } }), ` ${v.profilo.kit_riparazione.nome} (+${v.profilo.kit_riparazione.tecnologia})`) : null),
    h('ul', { class: 'dettaglio-ripara' },
      h('li', {}, `PI: ${r.pi.prima} → ${r.pi.dopo} su ${r.pi.massimi} (${r.stato.statoNome})`),
      h('li', {}, `Tempo: ${r.minuti} minuti${r.va ? ` · Tecnologia ${segno(r.va)}` : ''}`),
      h('li', {}, 'Ricambi: ', r.recuperati ? (r.costoDaDefinire ? daDefinire() : `${numero(r.costoRicambi)} cr`) : 'nessuno'),
      ...r.note.map((x) => h('li', { class: 'nota' }, x))),
    h('p', { class: 'riga-azioni' },
      h('button', { type: 'button', class: 'btn primario', onclick: () => { statoUi(ctx).ripara[mezzo.uid] = null; aggiorna(nuovo, `${v.nome}, ${r.stato.nome}: ${r.esito}, PI ${r.pi.prima} → ${r.pi.dopo} (${r.stato.statoNome}).`); } }, 'Applica'),
      h('button', { type: 'button', class: 'btn', onclick: () => { statoUi(ctx).ripara[mezzo.uid] = null; ridisegna(); } }, 'Chiudi')));
}

// --- promemoria del conducente (tab Combattimento) --------------------------------------------------

/**
 * Se il personaggio guida un veicolo: andatura, Pilotare da conducente e penalità agli attacchi (§2.1, §3.1),
 * come promemoria. I VA a riposo della scheda non cambiano.
 */
export function promemoriaConducente(ctx) {
  // con il server anche i veicoli del registro (A.91) che questo PG guida, se la tab li ha già letti
  const dalRegistro = ctx.server ? (ctx.ui.veicoli?.registro?.record ?? []).filter((r) => stessaChiave(r.conducente?.chiave, ctx.chi?.chiave)).map((r) => ({ ...r.mezzo, conducente: true })) : [];
  const guidati = [...(ctx.scelte.veicoli ?? []), ...dalRegistro].filter((x) => x.conducente === true && profiloDi(x, ctx.dati));
  if (!guidati.length) return null;
  const pilotare = pilotareDelPersonaggio(abilitaDellaTab(ctx), ctx.dati, { scheda: ctx.tab.scheda });
  return h('div', { class: 'riquadro nota promemoria-conducente' }, guidati.map((m) => {
    const v = vistaVeicoloPersonaggio(m, ctx.dati, { pilotare });
    const a = v.vista.andatura;
    return h('p', {}, h('strong', {}, `Alla guida di ${v.nome}: `),
      `andatura ${a.nome}${v.pilotare ? `, Pilotare ${va(v.pilotare.valore)}` : ''}`,
      a.attacco_da_bordo ? `; attacchi da bordo ${segno(a.attacco_da_bordo)}, attacchi contro il mezzo ${segno(a.attacco_contro)} (§3.1)` : '; nessuna penalità di velocità agli attacchi',
      v.vista.penalitaStrutturale ? `; danni del mezzo: Pilotare ${segno(v.vista.penalitaStrutturale)}` : '',
      v.vista.fuoriUso ? '; FUORI USO' : '',
      '. I VA della scheda non cambiano: le penalità si applicano al tavolo.');
  }));
}

export { struttureVeicolo };

// --- carta del veicolo nella plancia del master (A.105) -------------------------------------------------------------

/**
 * Carta di un veicolo del registro nel Tavolo del Master: PI e condizione delle tre strutture, AR, Corazzato, andatura,
 * energia e autonomie, conducente e mitragliere, movimento del Round. Il mezzo non ha Iniziativa né Azioni: si muove
 * all'Iniziativa del conducente, una volta per Round (il cambio di conducente non ne concede un secondo).
 * @param ctx { dati, ui, azioni: { ridisegna } }
 * @param o { scontro, diTurno, persone: [{ pg?, chiave, nome }], incapace(chiave) → bool, scrivi(nuovoRecord, messaggio) }
 */
/**
 * Riga rapida delle andature (ritocchi del 08/10; Veicoli §2.1): Fermo, Controllata, Veloce, Massima, con i Q del
 * Round; quella attuale evidenziata, quella scelta per dopo (A.104) segnata. Nella carta della plancia e nella mappa.
 */
export function rigaAndature(dati, mezzo, scegli, { classe = '' } = {}) {
  const p = profiloDelCatalogo(mezzo?.profilo, dati) ?? mezzo?.scheda ?? null;
  return h('div', { class: `riga-andature ${classe}`.trim(), role: 'group', 'aria-label': 'Andatura' },
    dati.veicoli.andature.elenco.map((a) => {
      const q = p ? movimentoMassimo(p, a.id, dati).q : null;
      const attuale = mezzo?.andatura === a.id, dopo = mezzo?.andatura_scelta === a.id;
      return h('button', { type: 'button', class: `btn btn-piccolo${attuale ? ' scelto' : ''}`, 'aria-pressed': String(attuale),
        title: `${a.nome}${q !== null ? `: ${q} Q per Round` : ''}${a.pilotare ? `, Pilotare ${a.pilotare}` : ''}${dopo ? ' (scelta per i prossimi Round)' : ''}`,
        onclick: () => scegli(a.id) }, a.nome, q !== null ? h('small', {}, ` ${q} Q`) : null, dopo ? h('small', {}, ' ⟶') : null);
    }));
}

export function cartaVeicoloPlancia(ctx, rec, o) {
  const d = ctx.dati;
  const mezzo = { ...rec.mezzo, conducente: false, gruppo: rec.proprietario?.tipo === 'gruppo' };
  const v = vistaVeicoloPersonaggio(mezzo, d);
  if (!v) return h('article', { class: 'carta-plancia' }, h('h2', {}, rec.mezzo?.nome ?? rec.id), h('p', { class: 'riquadro attenzione' }, 'Profilo non più nel catalogo dei veicoli.'));
  // ritocchi del 08/10: con l'andatura Fermo «Muovi» è spento, con il motivo
  const st = statoMovimento(rec, o.scontro, o.diTurno, { dati: d });
  const persona = (k) => o.persone.find((x) => stessaChiave(x.chiave, k)) ?? null;
  const scelta = (etichetta, attuale, cambia) => h('label', { class: 'campo-veicolo' }, `${etichetta} `,
    h('select', { onchange: (e) => cambia(persona(e.target.value)) },
      h('option', { value: '', selected: !attuale }, 'nessuno'),
      [...o.persone, ...(attuale && !persona(attuale.chiave) ? [attuale] : [])].map((x) => h('option', { value: x.chiave, selected: stessaChiave(attuale?.chiave, x.chiave) }, x.nome))));
  const incapace = rec.conducente && o.incapace(rec.conducente.chiave);
  const residuo = incapace ? movimentoResiduo(rec, d) : null;
  const scrivi = (nuovoMezzo, messaggio) => o.scrivi({ ...rec, mezzo: (({ conducente: _c, gruppo: _g, ...m }) => m)(nuovoMezzo) }, messaggio);
  return h('article', { class: `carta-plancia carta-veicolo${v.vista.fuoriUso ? ' fuori-uso' : ''}${st.conducente && o.diTurno?.id === st.conducente.id ? ' di-turno' : ''}`, 'aria-label': v.nome },
    h('header', { class: 'carta-plancia-testa' }, h('div', {},
      h('h2', {}, v.nome),
      h('p', { class: 'nota' }, `${v.profilo.nome} · ${rec.proprietario?.tipo === 'gruppo' ? 'del gruppo' : `di ${rec.proprietario?.nome ?? '—'}`} · revisione ${rec.revisione}`))),
    v.vista.fuoriUso ? h('p', { class: 'riquadro errore' }, 'Fuori uso (§5.5): il movimento residuo prosegue.') : null,
    h('ul', { class: 'plancia-strutture-veicolo' }, v.strutture.map((s) => h('li', {}, h('strong', {}, `${s.nome}: ${s.pi} / ${s.massimi} PI`), ' ', h('span', { class: `etichetta stato-struttura stato-${s.stato}` }, s.statoNome ?? '—')))),
    h('p', { class: 'plancia-valori' }, `AR ${v.profilo.ar?.totale ?? '—'}${v.profilo.ar?.magica ? ` (magica ${v.profilo.ar.magica})` : ''} · Corazzato ${v.profilo.corazzato || 0} · andatura ${v.vista.andatura.nome}`),
    v.risorse?.rosso ? h('p', { class: 'nota' }, `${v.risorse.rosso.nome}: ${numero(v.risorse.rosso.totale)} / ${numero(v.risorse.rosso.capacita)} Lx${v.risorse.rosso.autonomiaKm !== null ? ` · ${numero(v.risorse.rosso.autonomiaKm)} km` : ''}`) : null,
    v.risorse?.verde ? h('p', { class: 'nota' }, `${v.risorse.verde.nome}: ${numero(v.risorse.verde.totale)} Lx · supporto vitale ${v.risorse.verde.ore} ore`) : null,
    v.risorse?.aria ? h('p', { class: 'nota' }, `Aria: ${v.risorse.aria.ore} / ${v.risorse.aria.massimo} ore`) : null,
    h('p', {},
      scelta('Conducente', rec.conducente, (p) => o.scrivi(cambiaConducente(rec, p), p ? `${v.nome}: alla guida ${p.nome}${st.mosso ? ' (il mezzo si è già mosso in questo Round)' : ''}.` : `${v.nome}: nessun conducente.`)), ' ',
      scelta('Mitragliere', rec.mitragliere, (p) => o.scrivi({ ...rec, mitragliere: p ? { ...(p.pg ? { pg: p.pg } : {}), chiave: p.chiave, nome: p.nome } : null }, null))),
    // ritocchi del 08/10: andatura scelta dalla carta, una fascia per Round nello scontro (Veicoli §2.1, A.104)
    rigaAndature(d, rec.mezzo, (id) => { const r = scegliAndatura(rec, id, o.scontro, d); o.scrivi(r.rec, r.testo); }),
    o.scontro ? h('p', { class: 'movimento-veicolo' },
      h('strong', {}, st.mosso ? `Movimento già eseguito nel Round ${o.scontro.round}` : 'Movimento del Round non ancora eseguito'), ' ',
      h('button', { type: 'button', class: 'btn btn-piccolo', disabled: !st.puo, title: st.motivo ?? 'Il mezzo si muove adesso, all’Iniziativa del conducente', onclick: () => o.scrivi(muoviVeicolo(rec, o.scontro, o.diTurno), `${v.nome} si muove all’Iniziativa di ${rec.conducente.nome}.`) }, 'Muovi'),
      st.motivo && !st.mosso ? h('small', { class: 'nota' }, ` ${st.motivo}`) : null) : h('p', { class: 'nota' }, 'Nessuno scontro aperto: il mezzo si muove all’Iniziativa del conducente quando c’è uno scontro.'),
    residuo ? h('p', { class: 'riquadro attenzione' }, `${rec.conducente.nome} non può guidare: il movimento residuo prosegue all’Iniziativa precedente finché un nuovo conducente interviene o il mezzo si arresta (§5.6); a terra l’andatura scende a ${residuo.andatura.nome}.${residuo.conseguenza ? ` ${residuo.conseguenza}` : ''}`) : null,
    h('p', { class: 'riga-azioni' }, h('button', { type: 'button', class: 'btn', onclick: () => { const u = statoUi(ctx); u.colpo[mezzo.uid] = u.colpo[mezzo.uid] ? null : { modo: 'd20', d20: 10, struttura: 'corpo', danni: '', natura: 'Naturale', magistrale: false, piAggiuntivi: 0, ps: 'fallita', esposti: true }; ctx.azioni.ridisegna(); } }, 'Colpito')),
    statoUi(ctx).colpo[mezzo.uid] ? pannelloColpo(ctx, mezzo, v, scrivi) : null);
}
