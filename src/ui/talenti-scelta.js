// Talenti v1.0 (lotto 2, 25/10/2026; ritocchi della sera): il riquadro «Da scegliere» della scheda, per i personaggi con
// regimeTalenti = 2. Un posto alla volta, dal primo vuoto: livello, categoria, Classe, le opzioni ammesse e le altre in
// grigio con il motivo. Ogni opzione dice che cosa fa (riga breve), la categoria, i prerequisiti, le scelte che apre e,
// in «Dettagli», il testo completo del catalogo (src/talenti-testi.js). Il conto dei posti e il controllo delle scelte
// NON si fanno qui: vengono da postiTalenti e scelteSuccessive (src/avanzamento.js), che app.js passa in `t.posti` e
// `t.successive`. Qui si disegna e basta.
//
// Le scelte aperte da un Talento (25/10 sera: gli Incantesimi di Incrementare Incantesimi o di Usufruitore di Magia, le
// Tecniche di Risorse Interiori) sono passi del riquadro come i posti dei Talenti: proposti subito dopo il Talento, e
// se si rimandano restano qui con il loro «Scegli».
//
// Chi sceglie: il giocatore, solo fra le opzioni ammesse (il server lo ricontrolla: src/talenti-tablet.js); il
// Direttore da «Modifica master», che può anche forzare un'opzione non ammessa con una conferma (resta nel registro).
// Senza connessione, o con modifiche offline in attesa, il riquadro lo dice invece di accettare una scelta che si perde.
import { h } from './dom.js';
import { chiedi } from './finestrella.js';
import { delNome } from '../lingua.js';
import { voceTalento, rigaBreve, schedaTalento, testoPrerequisiti, scelteAperte, nomeCategoria, testiIncantesimo, testiTecnica } from '../talenti-testi.js';
import { nomeCheSiApre } from './talento-leggibile.js';

const NOMI = {
  talento_libero: ['Talento Libero', 'Talenti Liberi'],
  maestria: ['Maestria', 'Maestrie'],
  specializzazione: ['Specializzazione', 'Specializzazioni'],
};
const NOMI_SUCCESSIVE = {
  incantesimi: ['Incantesimo', 'Incantesimi'],
  tecniche: ['Tecnica Interiore', 'Tecniche Interiori'],
};
const ORDINE = ['talento_libero', 'maestria', 'specializzazione'];
const chiave = (x) => `${x.categoria}:${x.livello}`;
export const chiaveSuccessiva = (s) => `succ:${s.tipo}:${s.livello}`;
const nomeDi = (cat, n = 1) => NOMI[cat][n === 1 ? 0 : 1];
const nomeSucc = (tipo, n = 1) => NOMI_SUCCESSIVE[tipo][n === 1 ? 0 : 1];

/** «1 Talento Libero, 2 Maestrie, 1 Specializzazione, 2 Incantesimi»: i posti vuoti e le scelte successive aperte. */
export function testoDaScegliere(categorie, successive = []) {
  const posti = ORDINE.filter((c) => categorie[c]?.mancanti > 0).map((c) => `${categorie[c].mancanti} ${nomeDi(c, categorie[c].mancanti)}`);
  const per = {};
  for (const s of successive) per[s.tipo] = (per[s.tipo] ?? 0) + s.quanti;
  const altre = Object.keys(NOMI_SUCCESSIVE).filter((k) => per[k] > 0).map((k) => `${per[k]} ${nomeSucc(k, per[k])}`);
  return [...posti, ...altre].join(', ');
}

/** La riga d'effetto di un Talento o di una Specializzazione (sempre un testo). La usa anche la creazione. */
export const rigaEffetto = (id, dati) => rigaBreve(id, dati);

/** Una scheda { intestazione, paragrafi } da un testo a paragrafi (incantesimi e Tecniche). */
const comeScheda = (testo) => ({ intestazione: '', paragrafi: String(testo ?? '').split('\n').map((p) => p.trim()).filter(Boolean) });

/** Categoria, prerequisiti e scelte che apre: le righe piccole sotto il nome. */
function righeInfo(id, dati) {
  const v = voceTalento(id, dati);
  if (!v) return [];
  const pre = testoPrerequisiti(v, dati);
  const apre = scelteAperte(v);
  return [
    pre.length ? h('small', { class: 'nota info-talento' }, `Requisiti: ${pre.join('; ')}`) : null,
    apre.length ? h('small', { class: 'nota info-talento apre' }, `Poi: ${apre.join('; ')}`) : null,
  ];
}

const descriviScelta = (s, dati) => (s ? `${voceTalento(s.id, dati)?.nome ?? s.id}${s.parametro ? ` (${s.parametro})` : ''}${s.annotazione ? ` — ${s.annotazione}` : ''}` : '—');

/**
 * Il riquadro. `t`: { posti (postiTalenti), successive (scelteSuccessive), dati, ui: { aperto, posto, filtro },
 * master (bool), bloccato (testo o null), azioni: { scegli(posto, scelta, { forzata }), scegliSuccessiva(s, id,
 * { forzata }), svuota(posto), chiudi(), riapri(), ridisegna() } }
 */
export function riquadroTalenti(t) {
  const P = t.posti;
  if (!P || P.regime !== 'nuovo') return null;
  const ui = t.ui;
  const succ = t.successive ?? [];
  const mancanti = P.posti.filter((x) => !x.scelta);
  const daFare = mancanti.length + succ.length;
  const daCambiare = P.posti.filter((x) => x.scelta && (!x.chiuso || t.master));
  // giocatore, tutto scelto e chiuso dal Direttore: niente riquadro
  if (!daFare && !daCambiare.length && !t.master) return null;
  const testa = daFare
    ? [h('p', {}, h('strong', {}, `Da scegliere: ${testoDaScegliere(P.categorie, succ)}`)),
      h('p', { class: 'nota' }, mancanti.length
        ? 'La scheda è incompleta finché non scegli i Talenti: mancano ancora i loro bonus, per questo alcuni valori (anche i PV) possono essere più bassi. È normale.'
        : 'Restano da scegliere le cose che i tuoi Talenti ti danno: tocca «Scegli».')]
    : [h('p', {}, h('strong', {}, 'Talenti: tutti scelti.'), P.posti.some((x) => x.chiuso) ? ' Il Direttore ha chiuso le scelte.' : ' Puoi ancora cambiarne una finché il Direttore non chiude.')];
  const azioniTesta = h('div', { class: 'riga-azioni' },
    t.bloccato ? null : h('button', { type: 'button', class: `btn${daFare ? ' primario' : ''}`, 'aria-expanded': String(!!ui.aperto), onclick: () => { ui.aperto = !ui.aperto; t.azioni.ridisegna(); } },
      ui.aperto ? 'Chiudi' : daFare ? 'Scegli' : 'Cambia una scelta'),
    t.master ? (P.posti.some((x) => x.chiuso)
      ? h('button', { type: 'button', class: 'btn', title: 'Il giocatore potrà di nuovo cambiare le scelte', onclick: t.azioni.riapri }, 'Riapri le scelte')
      : h('button', { type: 'button', class: 'btn', title: 'Da qui in poi le scelte fatte le cambia solo il Direttore', onclick: t.azioni.chiudi }, 'Chiudi le scelte')) : null);
  return h('section', { class: `riquadro ${daFare ? 'attenzione' : 'ok'} riquadro-talenti`, 'aria-label': 'Talenti da scegliere' },
    ...testa,
    t.bloccato ? h('p', { class: 'nota motivo', role: 'status' }, t.bloccato) : null,
    azioniTesta,
    ui.aperto && !t.bloccato ? corpo(t, P, succ) : null);
}

/** Il passo da mostrare: quello scelto, oppure il primo da fare (una scelta successiva prima dei posti dei livelli dopo). */
export function passoAttivo(P, succ, ui) {
  const s = succ.find((x) => chiaveSuccessiva(x) === ui.posto);
  if (s) return { successiva: s };
  const posto = P.posti.find((x) => chiave(x) === ui.posto);
  if (posto) return { posto };
  const primaSucc = succ[0];
  if (primaSucc && (!P.prossimo || primaSucc.livello <= P.prossimo.livello)) return { successiva: primaSucc };
  return { posto: P.prossimo ?? P.posti[0] };
}

function corpo(t, P, succ) {
  const ui = t.ui;
  const attivo = passoAttivo(P, succ, ui);
  const voci = [
    ...P.posti.map((x) => ({ livello: x.livello, ordine: 0, el: h('button', {
      type: 'button', class: `posto-talento${x === attivo.posto ? ' attuale' : ''}${x.scelta ? ' scelto' : ''}${x.scelta && !x.valida ? ' non-valido' : ''}`,
      'aria-current': x === attivo.posto ? 'step' : null,
      onclick: () => { ui.posto = chiave(x); ui.filtro = ''; t.azioni.ridisegna(); },
    }, `${x.livello}° ${nomeDi(x.categoria)}${x.scelta ? `: ${descriviScelta(x.scelta, t.dati)}` : ''}${x.chiuso ? ' 🔒' : ''}`, x === attivo.posto ? h('strong', { class: 'adesso' }, ' ← adesso') : null) })),
    ...succ.map((s) => ({ livello: s.livello, ordine: 1, el: h('button', {
      type: 'button', class: `posto-talento successiva${s === attivo.successiva ? ' attuale' : ''}`,
      'aria-current': s === attivo.successiva ? 'step' : null,
      onclick: () => { ui.posto = chiaveSuccessiva(s); ui.filtro = ''; t.azioni.ridisegna(); },
    }, `${s.livello}° ${nomeSucc(s.tipo, 2)}: ${s.quanti} da scegliere`, s === attivo.successiva ? h('strong', { class: 'adesso' }, ' ← adesso') : null) })),
  ].sort((a, b) => a.livello - b.livello || a.ordine - b.ordine);
  return h('div', { class: 'scelta-talenti' },
    h('p', { class: 'nota percorso-talenti' }, 'I tuoi posti, in ordine (tocca un posto già scelto per cambiarlo):'),
    h('ol', { class: 'posti-talenti', 'aria-label': 'I posti dei Talenti, in ordine' }, voci.map((v) => h('li', {}, v.el))),
    attivo.successiva ? passoSuccessivo(t, attivo.successiva) : postoAttivo(t, attivo.posto, succ));
}

function postoAttivo(t, x, succ) {
  const titolo = h('h3', {}, `${nomeDi(x.categoria)} del ${x.livello}° livello${x.classe ? ` · elenco ${delNome(x.classe)}` : ''}`);
  if (x.scelta) {
    const puo = !x.chiuso || t.master;
    const aperte = succ.filter((s) => s.livello === x.livello);
    const n = nomeCheSiApre(descriviScelta(x.scelta, t.dati), schedaTalento(x.scelta.id, t.dati));
    return h('div', { class: 'posto-attivo' }, titolo,
      h('div', { class: 'opzione-testo' }, n.nome, h('span', { class: 'riga-talento' }, rigaBreve(x.scelta.id, t.dati)), n.scheda),
      aperte.map((s) => h('p', { class: 'nota motivo' }, `${s.quanti === 1 ? 'Resta' : 'Restano'} ${s.quanti} ${nomeSucc(s.tipo, s.quanti)} da scegliere `,
        h('button', { type: 'button', class: 'btn primario', onclick: () => { t.ui.posto = chiaveSuccessiva(s); t.ui.filtro = ''; t.azioni.ridisegna(); } }, 'Scegli'))),
      !x.valida ? h('p', { class: 'nota motivo' }, `Non ammessa dalle regole: ${x.problemi.find((e) => e.tipo === 'violazione')?.problema ?? ''}${t.master ? '' : ' (l’ha forzata il Direttore)'}`) : null,
      puo ? h('button', { type: 'button', class: 'btn', onclick: () => t.azioni.svuota(x) }, 'Cambia questa scelta')
        : h('p', { class: 'nota' }, 'Il Direttore ha chiuso questa scelta: la cambia solo lui.'));
  }
  const ui = t.ui;
  const filtro = (ui.filtro ?? '').trim().toLowerCase();
  const opzioni = (x.opzioni ?? []).filter((o) => !filtro || o.nome.toLowerCase().includes(filtro));
  const ammesse = opzioni.filter((o) => o.ammesso);
  const altre = opzioni.filter((o) => !o.ammesso);
  return h('div', { class: 'posto-attivo' }, titolo, cercaCampo(t),
    h('ul', { class: 'opzioni-talento' }, ammesse.map((o) => opzione(t, x, o, true))),
    altre.length ? h('details', { class: 'opzioni-non-ammesse' },
      h('summary', {}, `${altre.length} non ${altre.length === 1 ? 'ammessa' : 'ammesse'} adesso${t.master ? ' (il Direttore può forzarle)' : ''}`),
      h('ul', { class: 'opzioni-talento' }, altre.map((o) => opzione(t, x, o, false)))) : null);
}

const cercaCampo = (t) => h('input', { type: 'search', placeholder: 'Cerca per nome', value: t.ui.filtro ?? '', 'aria-label': 'Cerca per nome',
  oninput: (e) => { t.ui.filtro = e.target.value; t.azioni.ridisegna({ fuoco: 'cerca-talento' }); }, id: 'cerca-talento' });

function opzione(t, posto, o, ammessa) {
  const def = voceTalento(o.id, t.dati);
  // parametro (Caratteristica, Salvezza) e annotazione (la disciplina di Sport, le lingue di Poliglotta): si chiedono
  // qui, prima di scegliere
  const valori = o.parametri?.length ? o.parametri
    : def?.parametro === 'caratteristica' ? t.dati.caratteristiche.caratteristiche.map((c) => c.sigla)
      : def?.parametro === 'salvezza' ? t.dati.caratteristiche.salvezze.map((s) => s.id) : null;
  const selPar = valori ? h('select', { 'aria-label': `${o.nome}: ${def?.parametro === 'salvezza' ? 'Salvezza' : 'Caratteristica'}` }, valori.map((v) => h('option', { value: v }, v))) : null;
  const annot = def?.annotazione ? h('input', { type: 'text', placeholder: def.annotazione, maxlength: 60, 'aria-label': `${o.nome}: ${def.annotazione}` }) : null;
  const scelta = () => ({ id: o.id, ...(selPar ? { parametro: selPar.value } : {}), ...(annot?.value.trim() ? { annotazione: annot.value.trim() } : {}) });
  const vai = async () => {
    if (annot && !annot.value.trim()) { annot.focus(); annot.reportValidity?.(); return; }
    if (ammessa) { t.azioni.scegli(posto, scelta()); return; }
    if (!t.master) return;
    const ok = await chiedi({
      titolo: `Forzare ${o.nome}?`,
      testo: `Le regole non la ammettono adesso: ${o.motivo}. L’app avvisa e non blocca: se la vuoi lo stesso, la scelta resta nel registro del master come forzata.`,
      si: 'Forza la scelta',
    });
    if (ok) t.azioni.scegli(posto, scelta(), { forzata: o.motivo });
  };
  // 25/10 notte: il nome si tocca e apre la scheda intera del Talento, sotto, sul posto (src/ui/talento-leggibile.js)
  const n = nomeCheSiApre(o.nome, schedaTalento(o.id, t.dati), { dopo: h('span', { class: 'sigla' }, ` · ${nomeCategoria(def?.categoria) || nomeDi(posto.categoria)}`) });
  return h('li', { class: `opzione-talento${ammessa ? '' : ' bloccato'}` },
    h('div', { class: 'opzione-testo' },
      n.nome,
      h('span', { class: 'riga-talento' }, rigaBreve(o.id, t.dati)),
      ...righeInfo(o.id, t.dati),
      ammessa ? null : h('small', { class: 'motivo' }, ` ${o.motivo}`),
      n.scheda),
    h('div', { class: 'opzione-azioni' }, selPar, annot,
      ammessa ? h('button', { type: 'button', class: 'btn primario', onclick: vai }, 'Scegli')
        : t.master ? h('button', { type: 'button', class: 'btn', onclick: vai }, 'Forza…') : null));
}

/** Il passo di una scelta aperta da un Talento: gli Incantesimi o le Tecniche, uno alla volta, già filtrati. */
function passoSuccessivo(t, s) {
  const ui = t.ui;
  const filtro = (ui.filtro ?? '').trim().toLowerCase();
  const opzioni = (s.opzioni ?? []).filter((o) => !filtro || o.nome.toLowerCase().includes(filtro));
  const ammesse = opzioni.filter((o) => o.ammesso);
  const altre = opzioni.filter((o) => !o.ammesso);
  const testi = (o) => (s.tipo === 'incantesimi' ? testiIncantesimo(o.id, t.dati) : testiTecnica(o.id, t.dati));
  const voce = (o, ammessa) => {
    const tx = testi(o);
    const vai = async () => {
      if (ammessa) { t.azioni.scegliSuccessiva(s, o.id); return; }
      if (!t.master) return;
      const ok = await chiedi({
        titolo: `Forzare ${o.nome}?`,
        testo: `Le regole non lo ammettono adesso: ${o.motivo}. L’app avvisa e non blocca: se lo vuoi lo stesso, la scelta resta nel registro del master come forzata.`,
        si: 'Forza la scelta',
      });
      if (ok) t.azioni.scegliSuccessiva(s, o.id, { forzata: o.motivo });
    };
    const n = nomeCheSiApre(o.nome, comeScheda(tx.testo), { dopo: h('span', { class: 'sigla' }, ` · ${o.gruppo}${o.livelloBase ? ` · liv. base ${o.livelloBase}` : ''}`) });
    return h('li', { class: `opzione-talento${ammessa ? '' : ' bloccato'}` },
      h('div', { class: 'opzione-testo' },
        n.nome,
        tx.riga ? h('span', { class: 'riga-talento' }, tx.riga) : null,
        ammessa ? null : h('small', { class: 'motivo' }, ` ${o.motivo}`),
        n.scheda),
      h('div', { class: 'opzione-azioni' },
        ammessa ? h('button', { type: 'button', class: 'btn primario', onclick: vai }, 'Scegli')
          : t.master ? h('button', { type: 'button', class: 'btn', onclick: vai }, 'Forza…') : null));
  };
  const restano = s.quanti === 1 ? 'ne resta 1' : `ne restano ${s.quanti}`;
  const guida = s.tipo === 'incantesimi'
    ? `Da ${s.fonti.join(', ')}: ${restano}. Livello massimo degli incantesimi: ${s.livelloMassimo}. Qui ci sono solo quelli che il personaggio può prendere adesso.`
    : `Da ${s.fonti.join(', ')}: ${restano}. Qui ci sono solo quelle che il personaggio può prendere adesso.`;
  return h('div', { class: 'posto-attivo' },
    h('h3', {}, `${nomeSucc(s.tipo, 2)} del ${s.livello}° livello`),
    h('p', { class: 'nota' }, guida),
    h('div', { class: 'riga-azioni' }, h('button', { type: 'button', class: 'btn', onclick: () => { ui.posto = null; ui.aperto = false; ui.filtro = ''; t.azioni.ridisegna(); } }, 'Più tardi')),
    cercaCampo(t),
    h('ul', { class: 'opzioni-talento' }, ammesse.map((o) => voce(o, true))),
    altre.length ? h('details', { class: 'opzioni-non-ammesse' },
      h('summary', {}, `${altre.length} non ${altre.length === 1 ? 'ammesso' : 'ammessi'} adesso${t.master ? ' (il Direttore può forzarli)' : ''}`),
      h('ul', { class: 'opzioni-talento' }, altre.map((o) => voce(o, false)))) : null);
}
