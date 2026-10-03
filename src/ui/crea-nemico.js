// «Crea nemico» del Tavolo del Master (richiesta di Marcello del 03/10/2026): procedura guidata facoltativa basata
// sul Bestiario proposto (docs/bestiario/bestiario.md, cap. 2–6; dati in data/bestiario.json), in una finestra fuori
// dalla plancia che si ridisegna. Un passo per schermata con «Indietro», «Avanti» e «A caso» (tabelle del cap. 6):
// 1 Base o creatura pronta, 2 Grado (con i Round di resistenza attesi contro 7 PG), 3 Moduli, 4 Nome e descrizione,
// 5 Riepilogo con la provenienza di ogni valore, modificabile a mano. «Tutto a caso» fa i 5 passi del §6.6 in un
// clic, con un singolo passo da ritirare. Il calcolo sta in src/crea-nemico.js; qui solo presentazione.
import { h } from './dom.js';
import { infoValore, nascondiTooltip } from './tooltip.js';
import { rigaScelte, interruttore } from './pannello-passi.js';
import { avviso, avvisoErrore } from './avvisi.js';
import { salvaNemico } from './nemici.js';
import { validaNemico, formattaErrore } from '../validate.js';
import { provenienza, riga } from '../provenienza.js';
import { catalogo } from '../equipaggiamento.js';
import { testoMovimento } from '../nemici.js';
import {
  profiloNemico, scelteCreatura, fileUmano, SUFFISSO_UMANO, aCaso, ritiraPasso, mutazioniAmmesse, costoMutazione,
  costoModuli, gradoEffettivo, roundResistenza, testoCosto, proponiNome, proponiDescrizione, idDaNome,
} from '../crea-nemico.js';

const PASSI = ['Base', 'Grado', 'Moduli', 'Nome e descrizione', 'Riepilogo'];
const nuovoSeme = () => Math.floor(Math.random() * 2 ** 31) + 1;
const virgola = (x) => String(x).replace('.', ',');

// bestiario umano del Tavolo del Master: file statici accanto all'app (esempi/nemici/umani/)
const cacheUmani = {};
export async function caricaUmano(id) {
  if (cacheUmani[id] !== undefined) return cacheUmani[id];
  try {
    const r = await fetch(`esempi/nemici/umani/${id}.json`, { cache: 'no-cache' });
    cacheUmani[id] = r.ok ? await r.json() : null;
  } catch { cacheUmani[id] = null; }
  return cacheUmani[id];
}

// campi del riepilogo modificabili a mano: percorso nel nemico → etichetta
const CAMPI_RITOCCO = [
  ['pv', 'PV'], ['ar.totale', 'AR'], ['ar.magica', 'di cui magica'], ['difese', 'Difese'], ['iniziativa', 'Iniziativa'],
  ['movimento.passo', 'Passo (Q)'], ['azioni.principali', 'AzP'],
  ['salvezze.tempra', 'Tempra'], ['salvezze.riflessi', 'Riflessi'], ['salvezze.volonta', 'Volontà'], ['salvezze.magia', 'Magia'],
];
const PROV = { 'ar.totale': 'ar', 'movimento.passo': 'passo', 'azioni.principali': 'azioni' };
const leggi = (o, p) => p.split('.').reduce((x, k) => x?.[k], o);
const scrivi = (o, p, v) => { const k = p.split('.'); const ult = k.pop(); const c = k.reduce((x, y) => x[y], o); c[ult] = v; };

/**
 * Apre «Crea nemico».
 * @param opzioni { voci: bestiario (src/nemici.js → vociBestiario), salvato(nemico): dopo «Salva nel bestiario»,
 *   destinazione: { etichetta: «Aggiungi allo scontro» | «Aggiungi alla preparazione», aggiungi: async (nemico, { quanti, lato, origine }) → bool } | null,
 *   livello: livello dei PG per le tabelle casuali e il bilancio, iniziale: { scelte, nome, descrizione, ritocchi } per riaprire un nemico }
 */
export function apriCreaNemico(ctx, { voci = [], salvato = () => {}, destinazione = null, livello = 8, iniziale = null } = {}) {
  const dati = ctx.dati;
  const BE = dati.bestiario;
  const st = {
    passo: iniziale ? 4 : 0,
    scelte: iniziale?.scelte ? structuredClone(iniziale.scelte) : { base: 'insettoide', grado: 'semplice', boss: false, mutazioni: [], corrotto: null, equipaggiamento: null },
    nome: iniziale?.nome ?? '', descrizione: iniziale?.descrizione ?? '', nomeToccato: !!iniziale?.nome, descrToccata: !!iniziale?.descrizione,
    id: iniziale?.id ?? '', idToccato: !!iniziale?.id,
    ritocchi: iniziale?.ritocchi ? { ...iniziale.ritocchi } : {},
    livello, contesto: 'scontro', casuale: null, quanti: 1, lato: 'avversario', errori: [], salvatoIn: null,
  };
  const finestra = h('dialog', { class: 'pannello-scheda crea-nemico', 'aria-labelledby': 'crea-nemico-titolo' });
  finestra.addEventListener('close', () => { nascondiTooltip(); finestra.remove(); });

  // scelte cambiate: i ritocchi a mano e il nome proposto ripartono
  const cambia = (fn) => { fn(st.scelte); st.ritocchi = {}; st.errori = []; st.salvatoIn = null; disegna(); };
  const umanoServe = () => (BE.basi[st.scelte.base]?.umano ? fileUmano(st.scelte.tipoUmano ?? BE.basi.umano.tipi[0], st.scelte.grado) : null);
  const profilo = () => {
    const id = umanoServe();
    const umani = id && cacheUmani[id] ? { [id]: cacheUmani[id] } : {};
    if (id && cacheUmani[id] === undefined) caricaUmano(id).then(disegna);
    const nome = st.nomeToccato ? st.nome : '';
    const r = profiloNemico({ ...st.scelte, nome, descrizione: st.descrToccata ? st.descrizione : '', ...(st.idToccato && st.id ? { id: st.id } : {}) }, dati, { umani });
    if (id && cacheUmani[id] === undefined) r.errori = ['Lettura del bestiario umano…'];
    if (!r.nemico) return r;
    // ritocchi a mano dopo il calcolo, con la loro riga di provenienza
    for (const [p, v] of Object.entries(st.ritocchi)) {
      const prima = leggi(r.nemico, p);
      if (prima === undefined || v === prima) continue;
      scrivi(r.nemico, p, v);
      const k = PROV[p] ?? p;
      if (typeof v === 'number') (r.provenienza[k] ??= []).push(riga('Ritocco a mano', v - (typeof prima === 'number' ? prima : 0)));
      else (r.provenienza[k] ??= []).push(riga('Ritocco a mano', v));
    }
    r.nemico._bestiario = { ...r.nemico._bestiario, descrizione: st.descrToccata ? st.descrizione : undefined, ...(Object.keys(st.ritocchi).length ? { ritocchi: { ...st.ritocchi } } : {}) };
    return r;
  };

  // --- passi ---------------------------------------------------------------------------------------------
  const passoBase = () => {
    const s = st.scelte;
    const basi = Object.entries(BE.basi);
    const base = BE.basi[s.base];
    return [
      rigaScelte('Base (cap. 3)', basi.map(([id, b]) => ({ valore: id, etichetta: b.nome, riga: b.paragrafo, titolo: b.comportamento ?? b.nota ?? null })), s.creatura ? null : s.base,
        (v) => cambia((x) => { Object.assign(x, { base: v, creatura: undefined, mutazioni: x.mutazioni.filter((m) => mutazioniAmmesse(v, dati).some((y) => y.id === m)) }); if (BE.basi[v].umano) { x.tipoUmano ??= BE.basi.umano.tipi[0]; if (!SUFFISSO_UMANO[x.grado]) x.grado = 'medio'; } else delete x.tipoUmano; if (!BE.moduli.equipaggiamento.basi.includes(v)) x.equipaggiamento = null; })),
      base?.umano && !s.creatura ? rigaScelte('Tipo umano (bestiario umano del Tavolo del Master)', base.tipi.map((t) => ({ valore: t, etichetta: base.nomi_tipi?.[t] ?? t })), s.tipoUmano,
        (v) => cambia((x) => { x.tipoUmano = v; })) : null,
      rigaScelte('Oppure una creatura pronta (cap. 5)', BE.creature.map((c) => ({ valore: c.id, etichetta: c.nome, riga: `${BE.basi[c.base].nome} · ${c.gradi.map((g) => BE.gradi.find((y) => y.id === g).nome).join(', ')}${c.boss ? ' · Boss' : ''}` })), s.creatura ?? null,
        (v) => cambia((x) => { const c = BE.creature.find((y) => y.id === v); Object.assign(x, scelteCreatura(v, c.gradi.includes(x.grado) ? x.grado : c.gradi[0], {}, dati)); })),
      h('p', { class: 'nota' }, s.creatura ? BE.creature.find((c) => c.id === s.creatura)?.descrizione : base?.umano ? base.nota : `${base?.nome}: ${base?.comportamento ?? ''}`),
    ];
  };

  const passoGrado = () => {
    const s = st.scelte;
    const c = s.creatura ? BE.creature.find((x) => x.id === s.creatura) : null;
    const base = BE.basi[s.base];
    const opzioni = BE.gradi.map((g) => ({
      valore: g.id, etichetta: g.nome,
      riga: `${g.livelli}° · Round di resistenza ${virgola(g.round_resistenza)}`,
      motivo: c && !c.gradi.includes(g.id) ? 'la creatura pronta non ha questo grado' : base.umano && !SUFFISSO_UMANO[g.id] ? `${base.per_grado[g.id].tipo}: da preparare (§3.2)` : null,
    }));
    const bossPossibile = c ? !!c.boss : true;
    return [
      rigaScelte('Grado (§2.1)', opzioni, s.grado, (v) => cambia((x) => { if (c) Object.assign(x, scelteCreatura(c.id, v, {}, dati)); else { x.grado = v; x.boss = false; } })),
      interruttore('Boss (§2.5)', !!s.boss, (v) => cambia((x) => { if (c) Object.assign(x, scelteCreatura(c.id, v ? c.boss.grado : c.gradi[0], { boss: v }, dati)); else x.boss = v; }),
        { mod: `${BE.boss.round_resistenza} Round, PV del Boss, AzP +${BE.boss.azp_in_piu}`, motivo: bossPossibile ? null : 'questa creatura pronta non ha il Boss', info: { titolo: 'Boss', sottotitolo: '§2.5: un avversario unico che vale da solo uno scontro contro 7 PG del suo livello. PV dalla tabella del Boss × il moltiplicatore della base, × 0,7 per ogni punto di AR oltre il grado; un’AzP in più che non attacca; soglia di fase a metà PV.' } }),
      h('p', { class: 'nota' }, `Round di resistenza: quanti Round resiste contro 7 PG del livello del grado che concentrano gli attacchi (§2.1, Appendice A.3). ${c?.boss ? `Il Boss della creatura pronta è di grado ${BE.gradi.find((g) => g.id === c.boss.grado).nome}.` : ''}`),
      tabellaGrado(),
    ];
  };
  const tabellaGrado = () => h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta' },
    h('thead', {}, h('tr', {}, ['Grado', 'Livelli', 'PV', 'VA', 'Difese', 'AR', 'Danno', 'AzP', 'Round di resistenza'].map((x) => h('th', {}, x)))),
    h('tbody', {}, BE.gradi.map((g) => h('tr', { class: g.id === st.scelte.grado ? 'di-turno' : null }, [g.nome, g.livelli, g.pv, g.va, g.difese, g.ar, g.danno, g.azp, virgola(g.round_resistenza)].map((x) => h('td', {}, String(x))))))));

  const passoModuli = () => {
    const s = st.scelte;
    if (s.creatura) {
      const c = BE.creature.find((x) => x.id === s.creatura);
      return [h('p', { class: 'nota' }, `${c.nome}: i moduli sono quelli della creatura pronta (${c.paragrafo}). Per cambiarli, scegli una base al passo 1.`), riepilogoCosto()];
    }
    const K = BE.moduli.corrotto;
    const livelloC = K.livelli.find((l) => l.id === s.corrotto?.livello);
    const togli = (lista, id) => lista.filter((x) => x !== id);
    const manif = (tipo, elenco, quante) => elenco.map((m) => interruttore(m.nome, (s.corrotto?.[tipo] ?? []).includes(m.id),
      (v) => cambia((x) => { x.corrotto[tipo] = v ? [...x.corrotto[tipo], m.id] : togli(x.corrotto[tipo], m.id); }),
      { mod: m.effetti?.costo ? testoCosto(m.effetti.costo) : null, info: { titolo: m.nome, sottotitolo: m.effetto }, motivo: !(s.corrotto?.[tipo] ?? []).includes(m.id) && (s.corrotto?.[tipo] ?? []).length >= quante ? `già ${quante}` : null }));
    const E = BE.moduli.equipaggiamento;
    const conEquip = E.basi.includes(s.base);
    const fascia = E.fasce.find((f) => f.id === s.equipaggiamento?.fascia);
    const cat = catalogo(dati);
    const gE = fascia ? BE.gradi[Math.min(BE.gradi.length - 1, BE.gradi.findIndex((g) => g.id === s.grado) + fascia.salto)] : null;
    const armiFascia = gE ? E.per_grado[gE.id].armi.map((r) => cat.perRif.get(r)).filter(Boolean) : [];
    return [
      rigaScelte('Corrotto dall’Oscura Simmetria (§4.2)', [{ valore: null, etichetta: 'No' }, ...K.livelli.map((l) => ({ valore: l.id, etichetta: l.nome, riga: `${testoCosto(l.costo)} · ${l.manifestazioni.minori} minore${l.manifestazioni.maggiori ? ` e ${l.manifestazioni.maggiori} maggior${l.manifestazioni.maggiori > 1 ? 'i' : 'e'}` : ''}`, titolo: l.effetto }))],
        s.corrotto?.livello ?? null, (v) => cambia((x) => { x.corrotto = v ? { livello: v, minori: (x.corrotto?.minori ?? []).slice(0, 1), maggiori: (x.corrotto?.maggiori ?? []).slice(0, K.livelli.find((l) => l.id === v).manifestazioni.maggiori) } : null; })),
      livelloC ? [h('p', { class: 'scelta-titolo' }, `Manifestazioni minori: ${livelloC.manifestazioni.minori}`), griglia(manif('minori', K.manifestazioni_minori, livelloC.manifestazioni.minori))] : null,
      livelloC?.manifestazioni.maggiori ? [h('p', { class: 'scelta-titolo' }, `Manifestazioni maggiori: ${livelloC.manifestazioni.maggiori}`), griglia(manif('maggiori', K.manifestazioni_maggiori, livelloC.manifestazioni.maggiori))] : null,
      h('p', { class: 'scelta-titolo' }, 'Mutazioni (§4.3)'),
      griglia(mutazioniAmmesse(s.base, dati).map((m) => interruttore(m.nome, s.mutazioni.includes(m.id),
        (v) => cambia((x) => { x.mutazioni = v ? [...x.mutazioni, m.id] : togli(x.mutazioni, m.id); }),
        { mod: testoCosto(costoMutazione(m, s.base, s.grado, dati)), info: { titolo: m.nome, sottotitolo: m.effetto } }))),
      conEquip ? rigaScelte('Equipaggiamento (§4.4)', [{ valore: null, etichetta: 'No' }, ...E.fasce.map((f) => ({ valore: f.id, etichetta: f.nome, riga: testoCosto(f.costo) }))], s.equipaggiamento?.fascia ?? null,
        (v) => cambia((x) => { x.equipaggiamento = v ? { fascia: v } : null; })) : null,
      fascia ? [h('p', { class: 'scelta-titolo' }, `Armi della fascia ${gE.nome}: ${E.per_grado[gE.id].protezione}, AR ${E.per_grado[gE.id].ar}`),
        griglia(armiFascia.map((o) => interruttore(o.nome, (s.equipaggiamento.armi ?? predefinite(armiFascia)).includes(o.rif),
          (v) => cambia((x) => { const att = x.equipaggiamento.armi ?? predefinite(armiFascia); x.equipaggiamento.armi = v ? [...att, o.rif] : att.filter((r) => r !== o.rif); }),
          { mod: `${o.danno?.una_mano ?? o.danno?.due_mani}${o.gittata_q ? `, ${o.gittata_q} Q` : ''}` })))] : null,
      riepilogoCosto(),
    ];
  };
  const griglia = (celle) => h('div', { class: 'griglia-interruttori' }, celle);
  const predefinite = (armi) => [armi.find((o) => o.tipo === 'arma_ravvicinata'), armi.find((o) => o.tipo === 'arma_distanza')].filter(Boolean).map((o) => o.rif);
  const riepilogoCosto = () => {
    const c = costoModuli(st.scelte, dati);
    const g = BE.gradi.find((x) => x.id === st.scelte.grado);
    const eff = st.scelte.boss ? null : gradoEffettivo(st.scelte.grado, c.totale, dati);
    return h('p', { class: `riquadro ${c.totale > BE.costo_massimo ? 'attenzione' : 'ok'}`, role: 'status' },
      `Costo dei moduli ${testoCosto(c.totale)}${c.voci.length ? ` (${c.voci.map((v) => `${v.fonte} ${testoCosto(v.valore)}`).join(', ')})` : ''}. `,
      st.scelte.boss ? `Boss ${g.nome}: ${BE.boss.round_resistenza} Round di resistenza.` : `Grado effettivo ${eff.nome} (§2.4): circa ${virgola(roundResistenza(eff.valore, dati))} Round di resistenza contro 7 PG.`,
      c.totale > BE.costo_massimo ? ` Oltre +${BE.costo_massimo}: meglio scegliere direttamente un grado più alto (§2.4).` : '');
  };

  const passoNome = () => {
    const proposta = proponiNome(st.scelte, dati);
    const descr = proponiDescrizione(st.scelte, dati);
    const nome = st.nomeToccato ? st.nome : proposta;
    const id = st.idToccato ? st.id : idDaNome(nome);
    const gia = voci.some((v) => v.file === `${id}.json`);
    return [
      h('label', { class: 'campo-nemico' }, h('span', {}, 'Nome'), h('input', { type: 'text', maxlength: 80, value: nome, oninput: (e) => { st.nome = e.target.value; st.nomeToccato = true; const c = finestra.querySelector('[data-campo="id"]'); if (c && !st.idToccato) c.value = idDaNome(st.nome); } })),
      h('label', { class: 'campo-nemico' }, h('span', {}, 'Descrizione breve'), h('textarea', { rows: 4, maxlength: 600, value: st.descrToccata ? st.descrizione : descr, oninput: (e) => { st.descrizione = e.target.value; st.descrToccata = true; } })),
      h('label', { class: 'campo-nemico' }, h('span', {}, 'Identificativo (nome del file in nemici/)'), h('input', { type: 'text', maxlength: 60, value: id, dataset: { campo: 'id' }, oninput: (e) => { st.id = idDaNome(e.target.value); st.idToccato = true; } })),
      gia ? h('p', { class: 'riquadro attenzione' }, `In nemici/ c’è già ${id}.json: salvando nel bestiario lo sostituisci (te lo chiedo prima), oppure cambia il nome.`) : null,
      h('p', { class: 'nota' }, 'Proposta automatica dalla base e dai moduli: modificala liberamente. «A caso» rimette la proposta.'),
    ];
  };

  const passoRiepilogo = () => {
    const r = profilo();
    const s = st.scelte;
    if (!r.nemico) return [st.casuale ? pannelloCasuale() : null, h('div', { class: 'riquadro attenzione', role: 'alert' }, h('ul', {}, r.errori.map((e) => h('li', {}, e))))];
    const n = r.nemico;
    const prov = (k, valore) => (r.provenienza[k]?.length ? provenienza(r.provenienza[k], valore) : null);
    const cella = (p, etichetta) => {
      const v = leggi(n, p);
      const pr = prov(PROV[p] ?? p, v);
      return h('label', { class: 'campo-ritocco' }, h('span', {}, etichetta),
        h('input', { type: 'number', step: 1, class: 'input-d10', value: v, 'aria-label': `${etichetta} di ${n.nome}`, onchange: (e) => { const x = Number(e.target.value); if (Number.isInteger(x)) { st.ritocchi[p] = x; disegna(); } } }),
        pr ? infoValore('ⓘ', { titolo: `${etichetta}: ${v}`, provenienza: pr }, { classe: 'info-opzione' }) : null);
    };
    const nature = dati.formato_nemici.nature_danno;
    const errori = validaNemico(n, dati, '');
    return [
      st.casuale ? pannelloCasuale() : null,
      h('p', {}, h('strong', {}, n.nome), h('small', { class: 'nota' }, ` · nemici/${n.id}.json`)),
      h('p', { class: 'nota' }, n.fonte, ' · ', s.boss ? `Boss, ${BE.boss.round_resistenza} Round di resistenza` : `grado effettivo ${r.effettivo.nome}, circa ${virgola(r.round.effettivo)} Round di resistenza contro 7 PG`, '.'),
      r.avvisi.length ? h('div', { class: 'riquadro attenzione' }, h('ul', {}, r.avvisi.map((x) => h('li', {}, x)))) : null,
      h('div', { class: 'griglia-ritocchi' }, CAMPI_RITOCCO.map(([p, e]) => cella(p, e))),
      h('p', { class: 'nota' }, `Caratteristiche: ${Object.entries(n.caratteristiche ?? {}).map(([k, v]) => `${k} ${v}`).join(' · ')}.`),
      h('p', { class: 'nota' }, `Movimento: ${testoMovimento(n, dati)}${n.taglia === 'grande' ? ' · Taglia Grande (+2 VA a chi lo attacca)' : ''}${n.movimento?.volo ? ' · −2 VA a chi lo attacca in volo' : ''}.`),
      h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta attacchi-crea' },
        h('thead', {}, h('tr', {}, ['Attacco', 'Tipo', 'VA', 'Danno', 'Natura', 'Proprietà'].map((x) => h('th', {}, x)))),
        h('tbody', {}, n.attacchi.map((a, i) => h('tr', {},
          h('th', { scope: 'row' }, a.nome),
          h('td', {}, a.tipo === 'distanza' ? `a distanza${a.gittata_q ? `, ${a.gittata_q} Q` : ''}` : `ravvicinato, portata ${a.portata_q ?? 1} Q`),
          h('td', {}, h('input', { type: 'number', step: 1, class: 'input-d10', value: a.va, 'aria-label': `VA di ${a.nome}`, onchange: (e) => { const x = Number(e.target.value); if (Number.isInteger(x)) { st.ritocchi[`attacchi.${i}.va`] = x; disegna(); } } }),
            r.provenienza[`attacchi.${i}.va`] ? infoValore('ⓘ', { titolo: `VA ${a.nome}: ${a.va}`, provenienza: provenienza(r.provenienza[`attacchi.${i}.va`], a.va) }, { classe: 'info-opzione' }) : null),
          h('td', {}, h('input', { type: 'text', class: 'input-formula', maxlength: 20, value: a.danno, 'aria-label': `Danno di ${a.nome}`, onchange: (e) => { st.ritocchi[`attacchi.${i}.danno`] = e.target.value.trim(); disegna(); } }),
            r.provenienza[`attacchi.${i}.danno`] ? infoValore('ⓘ', { titolo: `Danno ${a.nome}: ${a.danno}`, provenienza: { totale: a.danno, righe: r.provenienza[`attacchi.${i}.danno`] } }, { classe: 'info-opzione' }) : null),
          h('td', {}, h('select', { 'aria-label': `Natura di ${a.nome}`, onchange: (e) => { st.ritocchi[`attacchi.${i}.natura`] = e.target.value; disegna(); } }, nature.map((x) => h('option', { value: x, selected: x === a.natura }, x)))),
          h('td', {}, (a.proprieta ?? []).join(', ') || '—', a.note ? h('small', { class: 'nota' }, ` (${a.note})`) : null)))))),
      n.abilita?.length ? h('p', {}, h('strong', {}, 'Abilità: '), n.abilita.map((a) => `${a.nome} ${a.va}`).join(', ')) : null,
      n.immunita?.length ? h('p', {}, h('strong', {}, 'Immunità: '), n.immunita.map((x) => dati.regole.stati.elenco.find((y) => y.id === x)?.nome ?? x).join(', ')) : null,
      h('details', { class: 'capacita-crea' }, h('summary', {}, `Capacità (${n.capacita.length})`), h('ul', {}, n.capacita.map((c) => h('li', {}, h('strong', {}, c.nome), ': ', c.effetto)))),
      h('p', { class: 'nota' }, n.note),
      Object.keys(st.ritocchi).length ? h('p', { class: 'nota' }, `Ritoccati a mano: ${Object.keys(st.ritocchi).join(', ')}. `, h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => { st.ritocchi = {}; disegna(); } }, 'Togli i ritocchi')) : null,
      errori.length || st.errori.length ? h('div', { class: 'riquadro attenzione', role: 'alert' }, h('p', {}, h('strong', {}, 'Da correggere:')), h('ul', {}, [...errori, ...st.errori].map((e) => h('li', {}, typeof e === 'string' ? e : formattaErrore({ ...e, file: '' }).replace(/^ › /, ''))))) : null,
      st.salvatoIn ? h('p', { class: 'riquadro ok', role: 'status' }, `Salvato nel bestiario: nemici/${st.salvatoIn}.`) : null,
      h('div', { class: 'riga-azioni' },
        h('button', { type: 'button', class: 'btn primario', disabled: errori.length > 0, onclick: () => salvaNelBestiario(n) }, 'Salva nel bestiario'),
        destinazione ? [
          h('label', {}, 'Quanti ', h('input', { type: 'number', min: 1, max: 30, step: 1, class: 'input-d10', value: st.quanti, oninput: (e) => { st.quanti = e.target.value; } })),
          h('label', {}, 'Lato ', h('select', { onchange: (e) => { st.lato = e.target.value; } }, ['avversario', 'alleato'].map((x) => h('option', { value: x, selected: st.lato === x }, x)))),
          h('button', { type: 'button', class: 'btn primario', disabled: errori.length > 0, onclick: () => aggiungi(n) }, destinazione.etichetta),
        ] : null),
    ];
  };

  // «Tutto a caso»: i 5 passi del §6.6 con i tiri e «Ritira» per ciascuno
  const pannelloCasuale = () => h('details', { class: 'riquadro casuale', open: true },
    h('summary', {}, h('strong', {}, 'Tutto a caso'), ` · seme ${st.casuale.seme} · PG di ${st.casuale.livello}° livello, ${st.casuale.contesto} · difficoltà ${st.casuale.difficolta}: ${st.casuale.numero} creatur${st.casuale.numero === 1 ? 'a' : 'e'} (§6.3.4)`),
    h('ol', { class: 'passi-casuali' }, st.casuale.passi.map((p) => h('li', {},
      h('strong', {}, p.titolo), ': ',
      p.tiri.map((t, i) => h('span', { class: t.ritirato ? 'ritirato' : null }, i ? ' · ' : '', `${t.tabella} ${t.dado ? `${t.dado} = ${t.valore} → ` : ''}${t.risultato}`, t.ritirato ? ' (si ritira)' : '', t.nota ? ` (${t.nota})` : '')),
      ' ', h('button', { type: 'button', class: 'btn btn-piccolo', title: `Ritira solo «${p.titolo}»: gli altri passi restano`, onclick: () => ritira(p.id) }, 'Ritira')))));
  const ritira = (id) => {
    st.casuale = ritiraPasso(st.casuale, id, dati, { nuovoSeme: nuovoSeme() });
    applicaCasuale();
    avviso(`Ritirato: ${st.casuale.passi.find((p) => p.id === id)?.titolo ?? id}.`, { tipo: 'info', chiave: 'crea-ritira' });
  };
  const applicaCasuale = () => {
    st.scelte = structuredClone(st.casuale.scelte);
    st.quanti = st.casuale.numero;
    st.nomeToccato = false; st.descrToccata = false; st.idToccato = false; st.ritocchi = {}; st.errori = []; st.salvatoIn = null;
    disegna();
  };
  const tuttoACaso = () => {
    st.casuale = aCaso({ seme: nuovoSeme(), livello: st.livello, contesto: st.contesto }, dati);
    st.passo = PASSI.length - 1;
    applicaCasuale();
  };
  // «A caso» di un solo passo, con le tabelle del cap. 6; i passi già scelti restano
  const aCasoPasso = () => {
    const s = st.scelte;
    const fissi = { base: s.base, tipoUmano: s.tipoUmano, grado: s.grado, boss: s.boss };
    const seme = nuovoSeme();
    if (st.passo === 0) {
      const x = aCaso({ seme, livello: st.livello, contesto: st.contesto, fissa: { grado: s.grado, boss: s.boss } }, dati).scelte;
      cambia((y) => { Object.assign(y, { base: x.base, tipoUmano: x.tipoUmano, creatura: undefined, mutazioni: [], corrotto: null, equipaggiamento: null }); if (!x.tipoUmano) delete y.tipoUmano; });
    } else if (st.passo === 1) {
      if (s.creatura) {
        const c = BE.creature.find((y) => y.id === s.creatura);
        cambia((y) => Object.assign(y, scelteCreatura(c.id, c.gradi[seme % c.gradi.length], {}, dati)));
      } else {
        const x = aCaso({ seme, livello: st.livello, contesto: st.contesto, fissa: { base: s.base, tipoUmano: s.tipoUmano } }, dati).scelte;
        cambia((y) => { y.grado = x.grado; y.boss = x.boss; });
      }
    } else if (st.passo === 2 && !s.creatura) {
      const x = aCaso({ seme, livello: st.livello, contesto: st.contesto, fissa: fissi }, dati).scelte;
      cambia((y) => { y.mutazioni = x.mutazioni; y.corrotto = x.corrotto; y.equipaggiamento = x.equipaggiamento; });
    } else if (st.passo === 3) {
      st.nomeToccato = false; st.descrToccata = false; st.idToccato = false; disegna();
    }
  };

  // --- azioni finali -------------------------------------------------------------------------------------
  const pronto = (n) => {
    const errori = validaNemico(n, dati, '');
    if (errori.length) { st.errori = []; disegna(); return false; }
    return true;
  };
  const salvaNelBestiario = async (n) => {
    if (!pronto(n)) return;
    if (voci.some((v) => v.file === `${n.id}.json`) && st.salvatoIn !== `${n.id}.json` && !confirm(`In nemici/ c’è già ${n.id}.json: sostituirlo?`)) return;
    try {
      await salvaNemico(n);
      st.salvatoIn = `${n.id}.json`;
      avviso(`«${n.nome}» salvato nel bestiario (nemici/${n.id}.json).`);
      salvato(n);
    } catch (e) {
      st.errori = (e.errori ?? [{ chiave: '', problema: e.message }]).map((x) => (typeof x === 'string' ? x : `${x.chiave ? `${x.chiave}: ` : ''}${x.problema}`));
      avvisoErrore(`Non salvato: ${e.message}`);
    }
    disegna();
  };
  const aggiungi = async (n) => {
    if (!pronto(n)) return;
    const q = Number(st.quanti);
    if (!Number.isInteger(q) || q < 1 || q > 30) { avvisoErrore('«Quanti»: da 1 a 30.'); return; }
    const ok = await destinazione.aggiungi(structuredClone(n), { quanti: q, lato: st.lato, origine: st.scelte.creatura ? 'creatura' : 'crea-nemico' });
    if (ok !== false) finestra.close();
  };

  // --- disegno ------------------------------------------------------------------------------------------
  const contenuti = [passoBase, passoGrado, passoModuli, passoNome, passoRiepilogo];
  const disegna = () => {
    nascondiTooltip();
    const passo = st.passo;
    const ultimo = passo === PASSI.length - 1;
    const scorrimento = finestra.scrollTop;
    finestra.replaceChildren(h('div', { class: 'pannello-contenuto' },
      h('header', { class: 'pannello-testa' },
        h('h2', { id: 'crea-nemico-titolo' }, 'Crea nemico', h('small', { class: 'nota' }, ` · passo ${passo + 1} di ${PASSI.length}: ${PASSI[passo]}`)),
        h('button', { type: 'button', class: 'btn tondo chiudi', 'aria-label': 'Chiudi', onclick: () => finestra.close() }, '×')),
      h('nav', { class: 'passi-crea', 'aria-label': 'Passi di «Crea nemico»' }, PASSI.map((t, i) => h('button', { type: 'button', class: `btn btn-piccolo${i === passo ? ' primario' : ''}`, 'aria-current': i === passo ? 'step' : null, onclick: () => { st.passo = i; disegna(); } }, `${i + 1} ${t}`))),
      h('div', { class: 'riga-azioni tutto-caso' },
        h('label', { title: 'Per le tabelle casuali del cap. 6 (grado del gruppo, §2.1) e per il numero di creature' }, 'Livello dei PG ', h('input', { type: 'number', min: 1, max: 20, step: 1, class: 'input-d10', value: st.livello, onchange: (e) => { const v = Number(e.target.value); if (v >= 1 && v <= 20) st.livello = v; } })),
        h('label', {}, 'Contesto ', h('select', { onchange: (e) => { st.contesto = e.target.value; } }, [['pattuglia', 'pattuglia (§6.3.1)'], ['scontro', 'scontro (§6.3.2)'], ['tana', 'tana (§6.3.3)']].map(([v, t]) => h('option', { value: v, selected: st.contesto === v }, t)))),
        h('button', { type: 'button', class: 'btn', title: 'La procedura in 5 passi del §6.6 in un clic, poi il riepilogo: ogni passo si può ritirare', onclick: tuttoACaso }, 'Tutto a caso')),
      h('section', { class: 'passo-crea' }, contenuti[passo]()),
      h('nav', { class: 'attacco-nav crea-nav', 'aria-label': 'Indietro e avanti' },
        h('button', { type: 'button', class: 'btn', disabled: passo === 0, onclick: () => { st.passo -= 1; disegna(); } }, '← Indietro'),
        !ultimo && !(passo === 2 && st.scelte.creatura) ? h('button', { type: 'button', class: 'btn', title: 'Questo passo con le tabelle del cap. 6; gli altri restano', onclick: aCasoPasso }, 'A caso') : null,
        !ultimo ? h('button', { type: 'button', class: 'btn primario', onclick: () => { st.passo += 1; disegna(); } }, `${PASSI[passo + 1]} →`) : null)));
    finestra.scrollTop = scorrimento;
  };
  disegna();
  document.body.append(finestra);
  finestra.showModal();
}

/** Riapre nella procedura un nemico del bestiario creato con «Crea nemico» (blocco _bestiario). */
export function apriDaBestiario(ctx, nemico, opzioni) {
  const b = nemico?._bestiario;
  if (!b?.scelte) return false;
  apriCreaNemico(ctx, { ...opzioni, iniziale: { scelte: b.scelte, nome: nemico.nome, descrizione: b.descrizione ?? '', id: nemico.id, ritocchi: b.ritocchi ?? {} } });
  return true;
}

