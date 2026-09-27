// Pannello «Lancia!» della tab Magia (backlog voce 4). Le regole stanno in src/lancio.js; qui la
// presentazione, con lo stesso impianto del pannello «Attacca!» (src/ui/pannello-passi.js): passi con
// gruppi di pulsanti e interruttori, risultato con la scomposizione, «Lancia» che scala i PM ed è annullabile. Nessun
// tiro di dado. Le scelte si ricordano per incantesimo nella sessione (sessione → lanci).
import { h } from './dom.js';
import { pillola } from './attacco.js';
import { rigaScelte, interruttore, pannelloPassi } from './pannello-passi.js';
import { calcolaLancio, dichiarazioneLancio, versioniLancio, contenitoriLancio } from '../lancio.js';
import { classeMacrofamiglia } from '../palette.js';

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
  const versioni = versioniLancio(inc, ctx.tab.scheda);
  if (d.versione === null || !versioni.some((v) => v.livello === d.versione && !v.motivo)) d.versione = [...versioni].reverse().find((v) => !v.motivo)?.livello ?? versioni[0]?.livello ?? null;
  const imposta = (modifica) => ctx.azioni.ricordaLancio(inc.nome, { ...d, ...modifica });
  const r = calcolaLancio(personaggio, inc, d, ctx.dati);
  const contenitori = contenitoriLancio(personaggio, inc);
  const stato = (ctx.ui.lancio ??= { nome: inc.nome, passo: 0 });
  const conAnticipazione = !!m.anticipazione?.aspetti?.length;
  const titoli = ['Versione', ...(conAnticipazione ? ['Anticipazione'] : []), 'Condizioni', 'PM', 'Risultato'];
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
      rigaScelte('Aspetto da anticipare (uno solo)', [{ valore: null, etichetta: 'Nessuna' }, ...m.anticipazione.aspetti.map((a, i) => ({ valore: i, etichetta: a.nome ?? a.etichetta, titolo: a.gradino }))],
        d.anticipazione, (x) => imposta({ anticipazione: x })),
      d.anticipazione !== null ? h('p', { class: 'nota' }, h('strong', {}, 'Gradino: '), m.anticipazione.aspetti[d.anticipazione]?.gradino) : null,
      h('p', { class: 'riquadro attenzione' }, `PM ×${L.anticipazione.moltiplicatore_costo}, Potere più difficile di una categoria; la Prova è sempre obbligatoria (Magia sez. 12.3).`),
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
    Risultato: risultato(ctx, inc, r),
  };

  return pannelloPassi({ ...intestazione, passi: titoli.map((t) => ({ titolo: t, contenuto: passi[t] })), stato, ridisegna: ctx.azioni.ridisegna });
}

function risultato(ctx, inc, r) {
  const f = r.fonte_pm;
  const doveSpesa = [f.personali ? `${f.personali} personali` : null, f.contenitore ? `${f.contenitore.pm} da ${f.contenitore.nome}` : null].filter(Boolean).join(' + ');
  const azioni = r.azioni.azioni_principali ? `${r.azioni.azioni_principali} ${r.azioni.azioni_principali === 1 ? 'Azione Principale' : 'Azioni Principali'}` : r.azioni.tempo;
  return [
    r.impossibile ? h('div', { class: 'riquadro errore', role: 'alert' }, h('p', {}, h('strong', {}, 'Lancio non possibile. '), r.impossibile.motivo)) : null,
    h('div', { class: 'attacco-risultato' },
      h('p', { class: 'costo-lancio' }, h('strong', {}, `${r.pm_costo} PM`), ` · ${doveSpesa || '—'}`,
        r.costo.length > 1 ? h('small', { class: 'nota' }, ` (${r.costo.map((c, i) => (i ? `${segno(c.valore)} ${c.etichetta}` : `${c.valore} ${c.etichetta}`)).join(', ')})`) : null),
      r.prova_richiesta
        ? [h('p', { class: 'va-attacco' }, 'Prova di Potere ', pillola(inc.nome, r.va_potere_finale, r.scomposizione), h('small', { class: 'nota' }, ` · ${r.motivi_prova.join('; ')}`)),
          h('table', { class: 'tabella compatta scomposizione-attacco' },
            h('tbody', {}, r.scomposizione.map((x, i) => h('tr', {},
              h('th', { scope: 'row' }, x.etichetta, x.paragrafo ? h('small', { class: 'sigla' }, ` ${x.paragrafo}`) : null),
              h('td', { class: x.valore < 0 && i ? 'malus' : x.valore > 0 && i ? 'bonus' : null }, i ? segno(x.valore) : numero(x.valore)))),
              h('tr', { class: 'totale' }, h('th', { scope: 'row' }, 'VA di Potere'), h('td', {}, numero(r.va_potere_finale)))))]
        : h('p', { class: 'va-attacco' }, h('strong', {}, 'Prova di Potere: non richiesta'), h('small', { class: 'nota' }, ' (livelli 1–3 del Taumaturgo, senza obblighi)')),
      h('dl', { class: 'voci griglia-voci' },
        h('div', {}, h('dt', {}, 'Azioni'), h('dd', {}, azioni ?? '—', r.azioni.focalizzazione ? ' + 1 AP di Focalizzazione prima' : '')),
        h('div', {}, h('dt', {}, 'Concentrazione'), h('dd', {}, CONCENTRAZIONE[r.concentrazione] ?? 'da verificare')),
        r.tiro_per_colpire ? h('div', {}, h('dt', {}, 'Tiro per colpire'), h('dd', {}, `${r.tiro_per_colpire.abilita} ${numero(r.tiro_per_colpire.va)} (${segno(r.tiro_per_colpire.bonus)})`)) : null,
        r.contatto ? h('div', {}, h('dt', {}, 'Contatto'), h('dd', {}, `${r.contatto.abilita} ${numero(r.contatto.va)} (${segno(L.contatto.va)}) `, h('small', { class: 'nota' }, r.contatto.nota))) : null,
        r.salvezza_bersaglio ? h('div', {}, h('dt', {}, 'Salvezza del bersaglio'), h('dd', {}, r.salvezza_bersaglio.testo,
          r.salvezza_bersaglio.mod_ps ? ` · Mod. PS ${r.salvezza_bersaglio.mod_ps}` : '',
          r.salvezza_bersaglio.talento ? ` · ${r.salvezza_bersaglio.talento.nome} ${segno(r.salvezza_bersaglio.talento.valore)}` : '')) : null),
      r.promemoria.length ? h('ul', { class: 'promemoria-attacco' }, r.promemoria.map((p) => h('li', {}, p))) : null,
      h('div', { class: 'attacco-azioni' },
        h('button', {
          type: 'button', class: 'btn primario btn-grande', disabled: !!r.impossibile, title: r.impossibile?.motivo ?? null,
          onclick: () => ctx.azioni.lancia({ personali: f.personali, contenitore: f.contenitore }),
        }, `Lancia (−${r.pm_costo} PM)`),
        h('small', { class: 'nota' }, 'Tira 1d20 al tavolo, se serve la Prova. «Annulla» nell’intestazione annulla la spesa; il pannello resta aperto per rilanciare.'))),
  ];
}
