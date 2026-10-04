// Pannello «Lancia!» della tab Magia (backlog voce 4). Le regole stanno in src/lancio.js; qui la
// presentazione, con lo stesso impianto del pannello «Attacca!» (src/ui/pannello-passi.js): passi con
// gruppi di pulsanti e interruttori, risultato con la provenienza del VA di Potere, «Lancia» che scala i PM ed è annullabile. Nessun
// tiro di dado. Le scelte si ricordano per incantesimo nella sessione (sessione → lanci).
import { h } from './dom.js';
import { pillola } from './attacco.js';
import { listaProvenienza } from './tooltip.js';
import { rigaScelte, interruttore, pannelloPassi } from './pannello-passi.js';
import { calcolaLancio, dichiarazioneLancio, versioniLancio, contenitoriLancio } from '../lancio.js';
import { classeMacrofamiglia } from '../palette.js';
import { avviso } from './avvisi.js';
import { durataLancio, opzioniDurata, arIncantesimo } from '../durate-incantesimi.js';

// conferma visibile del lancio (src/ui/avvisi.js); i nemici (ctx.calcola) la hanno dal registro dello scontro
function lanciaConAvviso(ctx, nome, fonte, registrazione = null) {
  const prima = ctx.sessione.pmAttuali;
  ctx.azioni.lancia(fonte, registrazione);
  if (ctx.calcola || !Number.isInteger(prima)) return;
  const dove = fonte.contenitore ? `; ${fonte.contenitore.pm} PM da ${fonte.contenitore.nome}` : '';
  avviso(`Incantesimo lanciato: ${nome} (PM ${prima} → ${Math.max(0, prima - (fonte.personali ?? 0))}${dove}).`);
}

const numero = (n) => (n < 0 ? `−${-n}` : String(n));
const segno = (n) => (n > 0 ? `+${n}` : numero(n));
const CONCENTRAZIONE = { no: 'nessuna', obbligatoria: 'obbligatoria, fino alla durata massima', a_scelta: 'a scelta: Concentrazione o durata fissa', durante_il_lancio: 'durante il lancio (procedura)' };

export function pannelloLancio(ctx, incantesimo) {
  const chiudi = () => { ctx.ui.lancio = null; ctx.azioni.ridisegna(); };
  return corpo(ctx, incantesimo, {
    etichetta: `Lancio di ${incantesimo.nome}`, titolo: `Lancia! · ${incantesimo.nome}`, chiudi, etichettaNav: 'Passi del lancio',
    classe: `lancio-pannello ${classeMacrofamiglia(incantesimo.macrofamiglia)}`,
  });
}

function corpo(ctx, inc, intestazione) {
  const L = ctx.dati.regole.lancio;
  const m = inc.meccanica ?? {};
  const personaggio = { scheda: ctx.tab.scheda, sessione: ctx.sessione };
  const d = dichiarazioneLancio(ctx.sessione.lanci?.[inc.nome] ?? {});
  const versioni = versioniLancio(inc, ctx.tab.scheda, ctx.dati);
  if (d.versione === null || !versioni.some((v) => v.livello === d.versione && !v.motivo)) d.versione = [...versioni].reverse().find((v) => !v.motivo)?.livello ?? versioni[0]?.livello ?? null;
  const imposta = (modifica) => ctx.azioni.ricordaLancio(inc.nome, { ...d, ...modifica });
  // ctx.calcola: un lanciatore esterno (i nemici del Tavolo del Master, src/nemico-lancio.js) con il suo adattatore
  const r = ctx.calcola ? ctx.calcola(d) : calcolaLancio(personaggio, inc, d, ctx.dati);
  const contenitori = contenitoriLancio(personaggio, inc);
  const stato = (ctx.ui.lancio ??= { nome: inc.nome, passo: 0 });
  const conAnticipazione = !!m.anticipazione?.aspetti?.length;
  // Magia sez. 25: un Rituale (Rigenerazione) ha i Canali al posto di condizioni e fonte dei PM
  const titoli = r.rituale ? ['Versione', 'Rituale', 'Risultato'] : ['Versione', ...(conAnticipazione ? ['Anticipazione'] : []), 'Condizioni', 'PM', 'Risultato'];
  const componentiRichieste = [...(m.componenti ?? []), ...(m.invocazione_obbligatoria ? ['invocazione'] : [])];
  const bozza = (ctx.ui.effettoMagico ??= { nome: '', valore: 2 });
  // numeri di regola dai dati (regole.json → lancio) e dai Talenti del personaggio (scheda.magia)
  const mg = ctx.tab.scheda.magia ?? {};
  const focVa = mg.focalizzazioneVa ?? L.focalizzazione.va;
  const ingVa = mg.penalitaIngaggio ?? L.ingaggio.va;
  const riserva = ctx.tab.scheda.classi?.flatMap((c) => c.talenti ?? []).find((t) => t.effetti?.lancio?.pm_una_volta_per_scena) ?? null;
  const C = L.circostanze;
  const circostanze = Array.from({ length: (C.massimo - C.minimo) / C.passo + 1 }, (_, i) => C.minimo + i * C.passo);

  const passi = {
    Versione: [
      h('div', { class: 'scelta-pulsanti versioni-lancio', role: 'group', 'aria-label': 'Versione' }, versioni.map((v) => h('button', {
        type: 'button', class: `btn scelta-btn${v.livello === d.versione ? ' scelta' : ''}`, 'aria-pressed': String(v.livello === d.versione),
        disabled: !!v.motivo, title: v.motivo ?? null, onclick: () => imposta({ versione: v.livello }),
      }, `Livello ${v.livello} · ${v.pm} PM`))),
      versioni.some((v) => v.motivo) ? h('small', { class: 'motivo' }, `In grigio: ${versioni.find((v) => v.motivo).motivo}.`) : null,
      (() => {
        const v = versioni.find((x) => x.livello === d.versione);
        return v ? h('dl', { class: 'voci griglia-voci riga-versione' }, Object.entries(v.riga).map(([k, x]) => h('div', {}, h('dt', {}, k), h('dd', {}, x)))) : null;
      })(),
    ],
    Anticipazione: conAnticipazione ? [
      // tooltip sull'elenco: gli aspetti sono solo quelli della scheda (Incantesimi Plurimi non vale dove i Bersagli non ci sono)
      h('div', { class: 'aspetti-anticipazione', title: [r.anticipazione?.consentiti, ...(r.anticipazione?.talentiNonUsabili ?? [])].filter(Boolean).join('\n') },
        rigaScelte('Aspetto da anticipare (uno solo)', [{ valore: null, etichetta: 'Nessuna' }, ...m.anticipazione.aspetti.map((a, i) => ({ valore: i, etichetta: a.nome ?? a.etichetta, titolo: a.gradino }))],
          d.anticipazione, (x) => imposta({ anticipazione: x }))),
      h('p', { class: 'nota' }, r.anticipazione?.consentiti, ...(r.anticipazione?.talentiNonUsabili ?? []).map((t) => [' ', t])),
      d.anticipazione !== null ? h('p', { class: 'nota' }, h('strong', {}, 'Gradino: '), m.anticipazione.aspetti[d.anticipazione]?.gradino) : null,
      valoreAnticipatoUi(r.anticipazione?.valore),
      riquadroAnticipazione(r.anticipazione),
      h('details', {}, h('summary', {}, 'Testo della scheda'), h('p', { class: 'nota' }, m.anticipazione.frase)),
    ] : [],
    Condizioni: [
      interruttore('Focalizzazione', d.focalizzazione, (x) => imposta({ focalizzazione: x }), { mod: `${segno(focVa)} a Potere · ${L.focalizzazione.azioni_principali_prima} AP prima` }),
      interruttore('Ingaggio', d.ingaggio, (x) => imposta({ ingaggio: x }), { mod: `${ingVa ? numero(ingVa) : '0'} · Prova obbligatoria` }),
      componentiRichieste.length ? h('div', { class: 'scelta-attacco scelta-gruppo' },
        h('p', { class: 'scelta-titolo' }, `Componenti mancanti (${numero(L.componenti.penalita)} ciascuna, fino a ${numero(L.componenti.massimo)})`),
        h('div', { class: 'scelta-pulsanti' }, componentiRichieste.map((c) => {
          const manca = d.componentiMancanti.includes(c);
          return h('button', {
            type: 'button', class: `btn scelta-btn${manca ? ' scelta' : ''}`, 'aria-pressed': String(manca),
            onclick: () => imposta({ componentiMancanti: manca ? d.componentiMancanti.filter((x) => x !== c) : [...d.componentiMancanti, c] }),
          }, `${manca ? '✗ ' : ''}${L.componenti.nomi[c]}`);
        }))) : null,
      rigaScelte('Circostanza del Direttore (§1.4)', circostanze.map((x) => ({ valore: x, etichetta: x ? segno(x) : 'Normale' })), d.circostanza, (x) => imposta({ circostanza: x })),
      h('div', { class: 'scelta-attacco' },
        h('p', { class: 'scelta-titolo' }, 'Effetti magici su di te (vale il bonus maggiore e la penalità maggiore, sez. 7)'),
        d.effettiMagici.length ? h('ul', { class: 'effetti-magici' }, d.effettiMagici.map((e, i) => h('li', {}, `${e.nome} ${segno(e.valore)} `,
          h('button', { type: 'button', class: 'btn piccolo', onclick: () => imposta({ effettiMagici: d.effettiMagici.filter((_, j) => j !== i) }) }, 'Togli')))) : null,
        h('div', { class: 'distanza-riga' },
          h('input', { type: 'text', class: 'input-effetto', placeholder: 'es. Benedizione', value: bozza.nome, 'aria-label': 'Nome dell’effetto magico', oninput: (e) => { bozza.nome = e.target.value; } }),
          h('div', { class: 'scelta-pulsanti' }, [-4, -2, 2, 4].map((x) => h('button', { type: 'button', class: `btn scelta-btn${bozza.valore === x ? ' scelta' : ''}`, onclick: () => { bozza.valore = x; ctx.azioni.ridisegna(); } }, segno(x)))),
          h('button', { type: 'button', class: 'btn', onclick: () => { imposta({ effettiMagici: [...d.effettiMagici, { nome: bozza.nome.trim() || 'Effetto magico', valore: bozza.valore }] }); bozza.nome = ''; } }, 'Aggiungi'))),
      riserva
        ? interruttore('Riserva Tecnica (una volta per scena)', d.riservaTecnica, (x) => imposta({ riservaTecnica: x }), { mod: `${numero(riserva.effetti.lancio.pm_una_volta_per_scena)} PM` }) : null,
      // Talenti di lancio da dichiarare (Sovraccarico Controllato, Incantesimi Massimizzati): src/lancio.js
      ...(r.talenti_lancio ?? []).map((t) => interruttore(t.nome, t.acceso,
        (x) => imposta({ talentiLancio: x ? [...d.talentiLancio, t.chiave] : d.talentiLancio.filter((k) => k !== t.chiave) }), { info: t.condizione })),
    ],
    PM: [
      h('p', { class: 'nota' }, `Costo: ${r.pm_costo} PM · personali ${ctx.sessione.pmAttuali} / ${ctx.massimi.pm}`),
      rigaScelte('Da dove prendi i PM', [
        { valore: 'personali', etichetta: 'Personali', motivo: ctx.sessione.pmAttuali < r.pm_costo ? 'PM personali insufficienti' : null },
        ...contenitori.map((c) => ({ valore: `c:${c.uid}`, etichetta: `${c.nome} · ${c.pm}/${c.capacita} PM`, motivo: c.motivo ?? (c.pm < r.pm_costo ? `ha ${c.pm} PM: usa «Misto»` : null) })),
        ...contenitori.filter((c) => !c.motivo).map((c) => ({ valore: `m:${c.uid}`, etichetta: `Misto: ${c.nome} + personali` })),
      ], d.fonte === 'personali' ? 'personali' : `${d.fonte === 'misto' ? 'm' : 'c'}:${d.contenitore}`,
      (x) => imposta(x === 'personali' ? { fonte: 'personali', contenitore: null } : { fonte: x.startsWith('m:') ? 'misto' : 'contenitore', contenitore: x.slice(2) })),
      d.fonte === 'misto' ? rigaScelte('Dal contenitore', Array.from({ length: Math.max(1, Math.min(r.pm_costo - 1, contenitori.find((c) => c.uid === d.contenitore)?.pm ?? 1)) }, (_, i) => ({ valore: i + 1, etichetta: `${i + 1} PM` })),
        d.quotaContenitore, (x) => imposta({ quotaContenitore: x })) : null,
      contenitori.length ? null : h('p', { class: 'nota' }, 'Nessun contenitore di Chroma nell’inventario.'),
    ],
    Rituale: r.rituale ? passoRituale(ctx, d, r, imposta) : [],
    Risultato: r.rituale ? risultatoRituale(ctx, inc, r, d, imposta) : risultato(ctx, inc, r),
  };

  return pannelloPassi({ ...intestazione, passi: titoli.map((t) => ({ titolo: t, contenuto: passi[t] })), stato, ridisegna: ctx.azioni.ridisegna });
}

/**
 * Riquadro dell'Anticipazione: cosa vale per questo lancio con i Talenti del personaggio (raddoppio dei
 * PM, difficoltà, Calcolo Arcano), una riga per regola con la fonte.
 */
function riquadroAnticipazione(a) {
  if (!a?.regole?.length) return null;
  return h('div', { class: 'riquadro attenzione regole-anticipazione' },
    h('ul', {}, a.regole.map((x) => h('li', {}, x.testo, h('small', { class: 'nota' }, ` (${x.fonte})`)))));
}

/** Valore che si ottiene con l'aspetto anticipato (scala della scheda), oppure «da definire al tavolo». */
function valoreAnticipatoUi(v) {
  if (!v) return null;
  if (v.daDefinire) return h('p', { class: 'valore-anticipato' }, h('strong', {}, `${v.aspetto}: valore da definire al tavolo`), h('small', { class: 'nota' }, ` (${v.daDefinire})`));
  return h('div', { class: 'valore-anticipato' },
    v.righe.map((x) => h('p', {}, `${x.colonna}: `, h('strong', {}, x.a), h('small', { class: 'nota' }, ` (era ${x.da}${x.nota ? `; ${x.nota}` : ''})`))),
    v.conseguenze?.length ? h('ul', { class: 'nota' }, v.conseguenze.map((c) => h('li', {}, c))) : null);
}

function risultato(ctx, inc, r) {
  // numeri di regola dai dati (regole.json → lancio): qui serve la penalità del Contatto (Magia sez. 2)
  const L = ctx.dati.regole.lancio;
  // E&L 18: procedura rituale non ancora definita (Rigenerazione): nessun costo né Prova
  if (r.rituale_non_definito) {
    const [prima, ...resto] = String(r.impossibile?.motivo ?? '').split(/(?<=:)\s/);
    return [h('div', { class: 'riquadro attenzione', role: 'status' }, h('p', {}, h('strong', {}, prima), resto.length ? ` ${resto.join(' ')}` : ''))];
  }
  const f = r.fonte_pm;
  const doveSpesa = [f.personali ? `${f.personali} personali` : null, f.contenitore ? `${f.contenitore.pm} da ${f.contenitore.nome}` : null].filter(Boolean).join(' + ');
  const azioni = r.azioni.azioni_principali ? `${r.azioni.azioni_principali} ${r.azioni.azioni_principali === 1 ? 'Azione Principale' : 'Azioni Principali'}` : r.azioni.tempo;
  const durataEBersagli = bloccoDurata(ctx, inc, r);
  return [
    r.impossibile ? h('div', { class: 'riquadro errore', role: 'alert' }, h('p', {}, h('strong', {}, 'Lancio non possibile. '), r.impossibile.motivo)) : null,
    r.avvisi?.length ? h('div', { class: 'riquadro attenzione' }, r.avvisi.map((x) => h('p', {}, x))) : null,
    h('div', { class: 'attacco-risultato' },
      h('p', { class: 'costo-lancio' }, h('strong', {}, `${r.pm_costo} PM`), ` · ${doveSpesa || '—'}`,
        r.costo.length > 1 ? h('small', { class: 'nota' }, ` (${r.costo.map((c, i) => (i ? `${segno(c.valore)} ${c.etichetta}` : `${c.valore} ${c.etichetta}`)).join(', ')})`) : null),
      r.prova_richiesta
        ? [h('p', { class: 'va-attacco' }, 'Prova di Potere ', pillola(inc.nome, r.va_potere_finale, r.provenienza), h('small', { class: 'nota' }, ` · ${r.motivi_prova.join('; ')}`)),
          h('div', { class: 'provenienza-attacco' }, listaProvenienza(r.provenienza, 'VA di Potere'))]
        : h('p', { class: 'va-attacco' }, h('strong', {}, 'Prova di Potere: non richiesta'), h('small', { class: 'nota' }, ' (livelli 1–3 del Taumaturgo, senza obblighi)')),
      h('dl', { class: 'voci griglia-voci' },
        // Anticipazione (sez. 12.3): il valore nuovo dell'aspetto, dalla scala della scheda
        ...(r.anticipazione?.valore ? (r.anticipazione.valore.daDefinire
          ? [h('div', { class: 'riga-anticipata' }, h('dt', {}, `${r.anticipazione.valore.aspetto} (anticipata)`), h('dd', {}, h('strong', {}, 'valore da definire al tavolo'), h('small', { class: 'nota' }, ` (${r.anticipazione.valore.daDefinire})`)))]
          : r.anticipazione.valore.righe.map((x) => h('div', { class: 'riga-anticipata' }, h('dt', {}, `${x.colonna} (anticipata)`),
            h('dd', {}, h('strong', {}, x.a), h('small', { class: 'nota' }, ` (era ${x.da}${x.nota ? `; ${x.nota}` : ''})`))))) : []),
        h('div', {}, h('dt', {}, 'Azioni'), h('dd', {}, azioni ?? '—', r.azioni.focalizzazione ? ' + 1 AP di Focalizzazione prima' : '')),
        h('div', {}, h('dt', {}, 'Concentrazione'), h('dd', {}, CONCENTRAZIONE[r.concentrazione] ?? 'da verificare')),
        r.tiro_per_colpire ? h('div', {}, h('dt', {}, 'Tiro per colpire'), h('dd', {}, `${r.tiro_per_colpire.abilita} ${numero(r.tiro_per_colpire.va)} (${segno(r.tiro_per_colpire.bonus)})`)) : null,
        r.contatto ? h('div', {}, h('dt', {}, 'Contatto'), h('dd', {}, `${r.contatto.abilita} ${numero(r.contatto.va)} (${segno(L.contatto.va)}) `, h('small', { class: 'nota' }, r.contatto.nota))) : null,
        // Magia sez. 7, Giocatore §5.13: danno della versione con il bonus di SAG e i Talenti di lancio
        // (provenienza in una riga: «1d6 +1 SAG +1 Incantesimi Aggressivi (Grado I)»)
        ...(r.danno?.voci ?? []).map((x) => h('div', {}, h('dt', {}, x.colonna), h('dd', {}, h('strong', {}, x.testo),
          x.provenienza && x.provenienza !== x.base ? h('small', { class: 'nota' }, ` (${x.provenienza})`) : null))),
        ...(r.cura?.voci ?? []).map((x) => h('div', {}, h('dt', {}, x.colonna), h('dd', {}, h('strong', {}, x.testo),
          x.provenienza && x.provenienza !== x.base ? h('small', { class: 'nota' }, ` (${x.provenienza})`) : null))),
        r.salvezza_bersaglio ? h('div', {}, h('dt', {}, 'Salvezza del bersaglio'), h('dd', {}, r.salvezza_bersaglio.testo,
          r.salvezza_bersaglio.mod_ps ? ` · Mod. PS ${r.salvezza_bersaglio.mod_ps}` : '',
          r.salvezza_bersaglio.talento ? ` · ${r.salvezza_bersaglio.talento.nome} ${segno(r.salvezza_bersaglio.talento.valore)}` : '')) : null),
      // Anticipazione: le conseguenze che la scheda lega all'aspetto e le regole che valgono con i Talenti
      r.anticipazione?.valore?.conseguenze?.length ? h('ul', { class: 'promemoria-attacco' }, r.anticipazione.valore.conseguenze.map((c) => h('li', {}, c))) : null,
      r.aspetto ? riquadroAnticipazione(r.anticipazione) : null,
      // note del manuale dei Talenti sotto il danno («una sola volta per bersaglio, al primo colpo»)
      r.danno?.note?.length ? h('ul', { class: 'note-danno nota' }, r.danno.note.map((n) => h('li', {}, n))) : null,
      r.promemoria.length ? h('ul', { class: 'promemoria-attacco' }, r.promemoria.map((p) => h('li', {}, p))) : null,
      durataEBersagli.elemento,
      h('div', { class: 'attacco-azioni' },
        h('button', {
          type: 'button', class: 'btn primario btn-grande', disabled: !!r.impossibile, title: r.impossibile?.motivo ?? null,
          onclick: () => lanciaConAvviso(ctx, inc.nome, { personali: f.personali, contenitore: f.contenitore }, durataEBersagli.registrazione()),
        }, `Lancia (−${r.pm_costo} PM)`),
        h('small', { class: 'nota' }, ctx.calcola
          ? 'Tira 1d20 al tavolo, se serve la Prova. Il lancio va nel registro dello scontro; i PM si correggono con − e + sulla carta.'
          : 'Tira 1d20 al tavolo, se serve la Prova. «Annulla» nell’intestazione annulla la spesa; il pannello resta aperto per rilanciare.'))),
  ];
}

/**
 * «Durata e bersagli» del Risultato (richiesta di Marcello del 03/10, src/durate-incantesimi.js): la durata della
 * versione (con l'Anticipazione), la modalità e la Concentrazione se la scheda le prevede, i bersagli (sé stessi, gli
 * altri partecipanti dello scontro, altri a parole). «Lancia» registra l'incantesimo fra gli effetti in corso.
 * @returns {{ elemento, registrazione: () => { nome, livello, durata, bersagli, ar } | null }}
 */
function bloccoDurata(ctx, inc, r) {
  const op = opzioniDurata(inc);
  const u = (ctx.ui.durataLancio ??= { nome: inc.nome, modalita: null, concentrazione: false, se: null, ids: [], altri: '' });
  if (u.nome !== inc.nome) Object.assign(u, { nome: inc.nome, modalita: null, concentrazione: false, se: null, ids: [], altri: '' });
  const durata = durataLancio(inc, r.livello, { modalita: u.modalita, concentrazione: u.concentrazione, anticipazione: r.anticipazione?.valore });
  // «Personale» o un lanciatore che è un PG: di solito su di sé; i nemici scelgono fra i partecipanti
  const personale = (inc.versioni ?? []).some((v) => /personale/i.test(String(v.Gittata ?? '')));
  if (u.se === null) u.se = !ctx.calcola && (personale || !!arIncantesimo(inc, r.livello, ctx.dati));
  const partecipanti = ctx.partecipanti ?? [];
  const ridisegna = () => ctx.azioni.ridisegna();
  const conDurata = ['round', 'tempo', 'condizione'].includes(durata.tipo);
  const testo = durata.tipo === 'round' ? `${durata.round} RND, fino alla fine del Round R + ${durata.round} (il Round del lancio non conta)`
    : durata.tipo === 'tempo' ? `${durata.testo}, promemoria senza contatore` : durata.testo;
  const elemento = h('div', { class: 'riquadro durata-lancio' },
    h('p', {}, h('strong', {}, 'Durata: '), testo, durata.anticipata ? h('small', { class: 'nota' }, ' (anticipata)') : null,
      durata.concentrazione ? h('small', { class: 'nota' }, ' · a Concentrazione: si mantiene un solo incantesimo') : null),
    op.modalita.length ? rigaScelte('Modalità', op.modalita.map((m) => ({ valore: m.id, etichetta: m.nome })), durata.modalita ?? op.modalita[0].id, (v) => { u.modalita = v; ridisegna(); }) : null,
    op.concentrazioneAScelta ? interruttore('Con Concentrazione', u.concentrazione, (v) => { u.concentrazione = v; ridisegna(); }, { mod: 'durata massima' }) : null,
    durata.anticipazioneAltraDurata ? h('p', { class: 'nota attenzione' }, 'L’Anticipazione riguarda la durata dell’altra modalità: sale di un gradino soltanto la durata scelta (E&L A.88). Scegli l’aspetto della durata che usi.') : null,
    op.todo ? h('p', { class: 'nota' }, `Da chiarire con Davide: ${op.todo.replace(/\s*\((A\.\d+, )?docs.*$/, '')}`) : null,
    conDurata ? [
      h('p', { class: 'scelta-titolo' }, 'Bersagli'),
      h('div', { class: 'caselle-nemico' },
        ctx.calcola ? null : h('label', {}, h('input', { type: 'checkbox', checked: !!u.se, onchange: (e) => { u.se = e.target.checked; } }), ' su di me'),
        partecipanti.map((p) => h('label', {}, h('input', { type: 'checkbox', checked: u.ids.includes(p.id), onchange: (e) => { u.ids = e.target.checked ? [...u.ids, p.id] : u.ids.filter((x) => x !== p.id); } }), ` ${p.nome}`))),
      h('label', { class: 'campo-nemico' }, h('span', {}, 'Altri bersagli (a parole)'), h('input', { type: 'text', maxlength: 80, value: u.altri, placeholder: 'es. la porta, un alleato fuori scena', oninput: (e) => { u.altri = e.target.value; } })),
    ] : null);
  const registrazione = () => {
    if (!conDurata) return null;
    const bersagli = [
      ...(u.se && !ctx.calcola ? [{ nome: 'sé', se: true }] : []),
      ...partecipanti.filter((p) => u.ids.includes(p.id)).map((p) => ({ id: p.id, nome: p.nome })),
      ...u.altri.split(',').map((x) => x.trim()).filter(Boolean).map((nome) => ({ nome })),
    ];
    const ar = u.se ? arIncantesimo(inc, r.livello, ctx.dati, r.anticipazione?.valore) : null;
    return { nome: inc.nome, livello: r.livello, durata, bersagli, ...(ar ? { ar } : {}) };
  };
  return { elemento, registrazione };
}

/**
 * Rituale (Magia §24.6, sez. 25: Rigenerazione): i Canali, ciascuno con il VA pertinente e i PM che
 * versa; l'aiuto al VA dell'Officiante viene dalla tabella (src/lancio.js → aiutoCanale).
 */
function passoRituale(ctx, d, r, imposta) {
  const R = r.rituale;
  const C = ctx.dati.regole.lancio.circostanze;
  const circostanze = Array.from({ length: (C.massimo - C.minimo) / C.passo + 1 }, (_, i) => C.minimo + i * C.passo);
  const bozza = (ctx.ui.canale ??= { va: 8, pm: 0 });
  return [
    h('p', { class: 'nota' }, `Rituale di Grado ${R.grado_romano}: fino a ${R.canali_massimo} Canali oltre all’Officiante. Ogni Canale partecipa per tutta la celebrazione, non tira e aiuta il VA secondo il proprio VA di ${R.abilita} (fino a +${R.aiuto_massimo} in tutto); chi versa energia dà almeno 1 PM (Magia §24.6).`),
    d.canali.length ? h('ul', { class: 'effetti-magici' }, r.rituale.canali.map((c, i) => h('li', {}, `Canale ${i + 1}: VA ${c.va} → aiuto ${segno(c.aiuto)}, ${c.pm} PM `,
      h('button', { type: 'button', class: 'btn piccolo', onclick: () => imposta({ canali: d.canali.filter((_, j) => j !== i) }) }, 'Togli')))) : h('p', { class: 'nota' }, 'Nessun Canale: l’Officiante celebra da solo.'),
    d.canali.length < R.canali_massimo ? h('div', { class: 'distanza-riga' },
      h('label', {}, `VA di ${R.abilita} del Canale `, h('input', { type: 'number', step: 1, class: 'input-d10', value: bozza.va, oninput: (e) => { bozza.va = Number(e.target.value); } })),
      h('label', {}, ' PM che versa ', h('input', { type: 'number', step: 1, min: 0, class: 'input-d10', value: bozza.pm, oninput: (e) => { bozza.pm = Number(e.target.value); } })),
      h('button', { type: 'button', class: 'btn', onclick: () => {
        if (!Number.isInteger(bozza.va) || !Number.isInteger(bozza.pm) || bozza.pm < 0) return;
        imposta({ canali: [...d.canali, { va: bozza.va, pm: bozza.pm }] });
      } }, 'Aggiungi Canale')) : null,
    h('p', { class: 'nota' }, `PM: ${r.pm_costo} in tutto · Officiante ${R.officiante} (almeno ${R.officiante_minimo}) · Canali ${R.pm_canali}. Personali: ${ctx.sessione.pmAttuali} / ${ctx.massimi.pm}.`),
    rigaScelte('Circostanza del Direttore (§1.4)', circostanze.map((x) => ({ valore: x, etichetta: x ? segno(x) : 'Normale' })), d.circostanza, (x) => imposta({ circostanza: x })),
  ];
}

/** Risultato del Rituale: requisiti, Prova di Rituali con la provenienza, PM e pulsanti per l'esito. */
function risultatoRituale(ctx, inc, r, d, imposta) {
  const R = r.rituale;
  const M = R.magistrale;
  return [
    r.impossibile ? h('div', { class: 'riquadro errore', role: 'alert' }, h('p', {}, h('strong', {}, 'Rituale non possibile. '), r.impossibile.motivo)) : null,
    r.avvisi?.length ? h('div', { class: 'riquadro attenzione' }, r.avvisi.map((x) => h('p', {}, x))) : null,
    h('div', { class: 'attacco-risultato' },
      h('p', { class: 'costo-lancio' }, h('strong', {}, `${r.pm_costo} PM`), ` · Officiante ${R.officiante}${R.pm_canali ? ` + Canali ${R.pm_canali}` : ''}`,
        h('small', { class: 'nota' }, ' (totale del Rituale, Magia 21.10)')),
      h('p', { class: 'va-attacco' }, `Prova di ${R.abilita} `, pillola(inc.nome, r.va_potere_finale, r.provenienza), h('small', { class: 'nota' }, ` · ${r.motivi_prova.join('; ')}`)),
      h('div', { class: 'provenienza-attacco' }, listaProvenienza(r.provenienza, `VA di ${R.abilita}`)),
      h('dl', { class: 'voci griglia-voci' },
        h('div', {}, h('dt', {}, 'Grado'), h('dd', {}, R.grado_romano)),
        h('div', {}, h('dt', {}, 'Celebrazione'), h('dd', {}, `${R.ore} ore, contatto continuo`)),
        h('div', {}, h('dt', {}, 'Reagenti'), h('dd', {}, `${R.reagenti.toLocaleString('it-IT')} cr`)),
        h('div', {}, h('dt', {}, 'Canali'), h('dd', {}, `${R.canali.length} su ${R.canali_massimo}${R.aiuto ? ` · aiuto ${segno(R.aiuto)}` : ''}`)),
        h('div', {}, h('dt', {}, 'Rigenerazione'), h('dd', {}, `${R.rigenerazione} dopo il successo`)),
        h('div', {}, h('dt', {}, 'Successo Magistrale'), h('dd', {}, `${M.totale} PM (Officiante ${M.officiante}${M.canaliTotale ? `, Canali ${M.canali.join(' + ')}` : ''}), metà dei reagenti`))),
      // A.74 punto 2 (E&L del 02/10): dopo il Magistrale i partecipanti ripartiscono liberamente il costo dimezzato
      h('div', { class: 'ripartizione-magistrale' },
        h('p', { class: 'nota' }, h('strong', {}, 'Ripartizione dopo un Successo Magistrale: '), `${M.totale} PM in tutto; nessuno oltre la quota dichiarata, l’Officiante almeno metà Grado, ogni Canale con un contributo almeno 1 PM${M.proposta ? ' (proposta: si può cambiare)' : ''}.`),
        h('div', { class: 'distanza-riga' },
          h('label', {}, 'Officiante ', h('input', { type: 'number', min: 0, step: 1, class: 'input-d10', value: M.officiante,
            onchange: (e) => imposta({ magistrale: { officiante: Math.round(Number(e.target.value) || 0), canali: M.canali } }) })),
          M.canali.map((v, i) => h('label', {}, ` Canale ${i + 1} `, h('input', { type: 'number', min: 0, step: 1, class: 'input-d10', value: v,
            onchange: (e) => imposta({ magistrale: { officiante: M.officiante, canali: M.canali.map((x, j) => (j === i ? Math.round(Number(e.target.value) || 0) : x)) } }) })))),
        M.errori.length ? h('ul', { class: 'nota motivo' }, M.errori.map((x) => h('li', {}, x))) : null),
      r.promemoria.length ? h('ul', { class: 'promemoria-attacco' }, r.promemoria.map((p) => h('li', {}, p))) : null,
      h('div', { class: 'attacco-azioni' },
        h('button', {
          type: 'button', class: 'btn primario btn-grande', disabled: !!r.impossibile, title: r.impossibile?.motivo ?? 'Successo o fallimento: i PM si consumano comunque',
          onclick: () => lanciaConAvviso(ctx, inc.nome, { personali: R.officiante, contenitore: null }),
        }, `Rituale concluso (−${R.officiante} PM)`),
        h('button', {
          type: 'button', class: 'btn btn-grande', disabled: !!r.impossibile || M.errori.length > 0, title: M.errori[0] ?? null,
          onclick: () => lanciaConAvviso(ctx, inc.nome, { personali: M.officiante, contenitore: null }),
        }, `Con Successo Magistrale (−${M.officiante} PM)`),
        h('small', { class: 'nota' }, 'Tira 1d20 al tavolo alla fine della celebrazione. Successo o fallimento consumano i PM; se la celebrazione si interrompe prima della Prova non si spendono. «Annulla» nell’intestazione annulla la spesa.'))),
  ];
}
