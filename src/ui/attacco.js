// Pannello «Attacca!» della tab Combattimento (backlog voce 5). Le regole stanno in src/attacco.js;
// qui solo la presentazione: passi con righe di pulsanti (niente menu a tendina), risultato con la
// scomposizione e «Spara». Nessun tiro di dado: al tavolo si tira a mano. Le scelte si ricordano
// per ogni arma nella sessione (sessione → attacchi). Su telefono un passo per schermata con la
// barra Indietro / Avanti; da 800 px tutti i passi in colonna.
import { h, segno } from './dom.js';
import { infoValore } from './tooltip.js';
import { calcolaAttaccoDistanza, vincoliDistanza, dichiarazioneDistanza, richiedeImbracciatura, talentiAttacco, attaccoBase } from '../attacco.js';
import { formulaScomposizione } from '../condizioni.js';

const PASSI = ['Il tuo movimento', 'Il bersaglio', 'Distanza', 'Tipo di tiro', 'Risultato'];
const FONTI = { regole: 'regole', equipaggiamento: 'equipaggiamento', ferite: 'Ferite', affaticamento: 'Affaticamento', stato: 'Stato', oggetto: 'oggetto', movimento: 'movimento', bersaglio: 'bersaglio', copertura: 'Copertura', distanza: 'distanza', mirino: 'mirino', modalita: 'modalità', 'modalità': 'modalità', manovra: 'manovra', talento: 'Talento', situazione: 'situazione' };
const numero = (n) => (n < 0 ? `−${-n}` : String(n));
const RAPIDE = [3, 10, 20, 40, 80, 160, 300, 500, 750, 1000, 1500];

/**
 * Riga di scelte a pulsanti: [{ valore, etichetta, motivo? }]. Il pulsante scelto è evidenziato;
 * quelli non ammessi sono disabilitati con il motivo (title e testo sotto la riga).
 */
export function righaScelte(titolo, opzioni, attuale, scegli) {
  const motivi = opzioni.filter((o) => o.motivo && o.valore !== attuale).map((o) => `${o.etichetta}: ${o.motivo}`);
  return h('div', { class: 'scelta-attacco', role: 'group', 'aria-label': titolo },
    h('p', { class: 'scelta-titolo' }, titolo),
    h('div', { class: 'scelta-pulsanti' }, opzioni.map((o) => h('button', {
      type: 'button', class: `btn scelta-btn${o.valore === attuale ? ' scelta' : ''}`, 'aria-pressed': String(o.valore === attuale),
      disabled: !!o.motivo && o.valore !== attuale, title: o.motivo ?? o.titolo ?? null, onclick: () => scegli(o.valore),
    }, o.etichetta))),
    motivi.length ? h('small', { class: 'motivo' }, motivi.join(' · ')) : null);
}
export const siNo = (titolo, attuale, scegli, motivo = null) => righaScelte(titolo, [{ valore: false, etichetta: 'No' }, { valore: true, etichetta: 'Sì', motivo }], attuale, scegli);

/**
 * Pannello d'attacco per l'arma `a` (voce di scheda.equipaggiamento.armi).
 * ctx: contesto della scheda a tab (dati, tab.scheda, sessione, ui, azioni).
 */
export function pannelloAttacco(ctx, a) {
  const chiudi = () => { ctx.ui.attacco = null; ctx.azioni.ridisegna(); };
  const corpo = a.tipo === 'arma_distanza' ? corpoDistanza(ctx, a) : corpoRavvicinato(a);
  return h('div', { class: 'attacco-sfondo', onclick: (e) => { if (e.target === e.currentTarget) chiudi(); } },
    h('section', { class: 'attacco-pannello', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Attacco con ${a.nome}` },
      h('header', { class: 'attacco-testa' },
        h('h2', {}, `Attacca! · ${a.nome}`),
        h('button', { type: 'button', class: 'btn', onclick: chiudi, 'aria-label': 'Chiudi il pannello d’attacco' }, 'Chiudi')),
      corpo));
}

function corpoRavvicinato(a) {
  const r = attaccoBase(a);
  return h('div', { class: 'attacco-risultato' },
    h('p', { class: 'va-attacco' }, 'VA per colpire ', pillola(a.nome, r.va_finale, r.scomposizione)),
    h('p', {}, h('span', { class: 'sigla' }, 'Danno '), h('strong', {}, r.danno_per_colpo ?? '—'), r.applicazioni !== 1 ? ` · AC ${r.applicazioni}` : null),
    r.parata ? h('p', {}, h('span', { class: 'sigla' }, 'Parata '), h('strong', {}, numero(r.parata.va)), r.parata.distanza !== null ? ` · a distanza ${numero(r.parata.distanza)}` : null) : null,
    h('p', { class: 'riquadro attenzione' }, 'Manovre in arrivo: l’utility per il corpo a corpo è la prossima.'));
}

/** VA in pillola con il tooltip della scomposizione riga per riga (fonte e paragrafo). */
export function pillola(nome, va, scomposizione) {
  return infoValore(numero(va), {
    titolo: `${nome}: ${numero(va)}`,
    sezioni: [{ testo: formulaScomposizione('VA', scomposizione) }],
    tabella: {
      titolo: 'Scomposizione', colonne: ['Voce', 'Valore', 'Fonte'],
      righe: scomposizione.map((x, i) => ({ Voce: x.etichetta, Valore: i ? segno(x.valore) : numero(x.valore), Fonte: [FONTI[x.fonte] ?? x.fonte, x.paragrafo].filter(Boolean).join(', ') })),
    },
  }, { classe: 'val-eff pillola-va pillola-attacco' });
}

function corpoDistanza(ctx, a) {
  const personaggio = { scheda: ctx.tab.scheda, sessione: ctx.sessione };
  const salvate = ctx.sessione.attacchi?.[a.uid] ?? {};
  const d = dichiarazioneDistanza(salvate);
  const imposta = (modifica) => ctx.azioni.ricordaAttacco(a.uid, { ...d, ...modifica, bersaglio: { ...d.bersaglio, ...(modifica.bersaglio ?? {}) } });
  const b = (modifica) => imposta({ bersaglio: modifica });
  const v = vincoliDistanza(personaggio, a, d, ctx.dati);
  const T = talentiAttacco(ctx.tab.scheda, ctx.dati);
  const r = calcolaAttaccoDistanza(personaggio, a, d, ctx.dati);
  const MF = ctx.dati.regole.modalita_di_fuoco;
  const colpi = ctx.sessione.munizioni?.[a.uid]?.colpi ?? null;
  const stato = (ctx.ui.attacco ??= { uid: a.uid, passo: 0 });
  const passo = Math.min(stato.passo ?? 0, PASSI.length - 1);
  const vai = (n) => { stato.passo = n; ctx.azioni.ridisegna(); };

  const passi = [
    [
      righaScelte('Movimento', [
        { valore: 'fermo', etichetta: 'Fermo' }, { valore: 'passo', etichetta: 'Passo' },
        { valore: 'corsa', etichetta: 'Corsa −2' }, { valore: 'scatto', etichetta: 'Scatto −6' },
      ], d.movimento, (x) => imposta({ movimento: x, ...(x === 'fermo' ? { evasivo: false } : {}), ...(!['fermo', 'passo'].includes(x) ? { coperturaPropria: 'nessuna' } : {}) })),
      siNo('Movimento Evasivo (AzM + AzP)', d.evasivo, (x) => imposta({ evasivo: x }), v.evasivo),
      righaScelte('Attacco dalla Copertura (AzM)', [
        { valore: 'nessuna', etichetta: 'Nessuna' },
        { valore: 'leggera', etichetta: 'Leggera −2', motivo: v.coperturaPropria },
        { valore: 'media', etichetta: 'Media −4', motivo: v.coperturaPropria },
      ], d.coperturaPropria, (x) => imposta({ coperturaPropria: x })),
    ],
    [
      righaScelte('Movimento del bersaglio', [
        { valore: 'fermo', etichetta: 'Fermo o Passo' }, { valore: 'corsa', etichetta: 'Corsa −2' }, { valore: 'scatto', etichetta: 'Scatto −4' },
      ], d.bersaglio.movimento, (x) => b({ movimento: x })),
      righaScelte('Movimento Evasivo del bersaglio', [
        { valore: 'no', etichetta: 'No' }, { valore: 'si', etichetta: 'Sì' }, { valore: 'migliorato', etichetta: 'Sì, Migliorato' },
      ], d.bersaglio.evasivoMigliorato ? 'migliorato' : d.bersaglio.evasivo ? 'si' : 'no', (x) => b({ evasivo: x !== 'no', evasivoMigliorato: x === 'migliorato' })),
      righaScelte('Copertura del bersaglio', [
        { valore: 'nessuna', etichetta: 'Nessuna' }, { valore: 'leggera', etichetta: 'Leggera −2' },
        { valore: 'media', etichetta: 'Media −4' }, { valore: 'totale', etichetta: 'Totale' },
      ], d.bersaglio.copertura, (x) => b({ copertura: x })),
      siNo('Impegnato in Ravvicinato, protetto da un alleato o con un ostaggio', d.bersaglio.impegnato, (x) => b({ impegnato: x })),
      siNo('Ignaro, immobilizzato o incapace di reagire', d.bersaglio.ignaro, (x) => b({ ignaro: x })),
      siNo('Il bersaglio ti impegna in Ravvicinato', d.bersaglio.tiImpegna, (x) => b({ tiImpegna: x })),
      T.some((t) => t.e.analisi_rapida) ? siNo('Analisi Rapida sul bersaglio (+2, una volta)', d.analisiRapida, (x) => imposta({ analisiRapida: x })) : null,
    ],
    [
      h('div', { class: 'scelta-attacco' },
        h('label', { class: 'scelta-titolo', for: `dist-${a.uid}` }, 'Distanza in Q'),
        h('div', { class: 'distanza-riga' },
          h('input', {
            id: `dist-${a.uid}`, type: 'number', min: 1, step: 1, inputmode: 'numeric', value: d.distanza, class: 'input-distanza',
            onchange: (e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 1) imposta({ distanza: Math.round(n) }); },
          }),
          h('span', { class: `fascia${r.fascia.va ? ' malus' : ''}` }, `fascia fino a ${r.fascia.fino_a} Q: ${numero(r.fascia.va)}`),
          a.gittataQ ? h('span', { class: 'nota' }, ` · gittata massima ${a.gittataQ} Q`) : null),
        h('div', { class: 'scelta-pulsanti' }, RAPIDE.filter((q) => !a.gittataQ || q <= a.gittataQ).map((q) => h('button', {
          type: 'button', class: `btn scelta-btn${d.distanza === q ? ' scelta' : ''}`, onclick: () => imposta({ distanza: q }),
        }, `${q}`)))),
      h('p', { class: 'nota' }, a.mirino
        ? `Mirino montato: ${a.mirino.nome} (riduce la penalità di ${a.mirino.riduzione}${a.mirino.distanza_max_q ? ` fino a ${a.mirino.distanza_max_q} Q` : ' entro la gittata'}${a.mirino.azp_minime > 1 ? `, almeno ${a.mirino.azp_minime} AzP` : ''}).`
        : 'Nessun mirino montato sull’arma (inventario).'),
    ],
    [
      righaScelte('Modalità', (a.modalita ?? []).filter((x) => x !== 'TM' && MF[x]).map((x) => ({ valore: x, etichetta: `${MF[x].nome}${MF[x].modificatore_va ? ` ${segno(MF[x].modificatore_va)}` : ''}`, motivo: v.modalita[x] })),
        d.modalita, (x) => imposta({ modalita: x, ...(ctx.dati.regole.attacco_distanza.modalita.manovre_ammesse[x]?.includes('mirato') ? {} : { mirato: false, ravvicinato: false, bruciapelo: false }) })),
      siNo('Tiro Mirato (+1 AzP)', d.mirato, (x) => imposta({ mirato: x }), v.mirato),
      d.distanza <= ctx.dati.regole.attacco_distanza.manovre.ravvicinato.distanza_max_q
        ? siNo('Tiro Ravvicinato (entro 3 Q)', d.ravvicinato || d.bersaglio.tiImpegna, (x) => imposta({ ravvicinato: x }), d.bersaglio.tiImpegna ? 'obbligatorio: il bersaglio ti impegna' : v.ravvicinato) : null,
      d.distanza <= ctx.dati.regole.attacco_distanza.manovre.bruciapelo.distanza_max_q
        ? siNo('Tiro a Bruciapelo (Contatto)', d.bruciapelo, (x) => imposta({ bruciapelo: x }), v.bruciapelo) : null,
      richiedeImbracciatura(a, ctx.dati) ? siNo('Arma Imbracciata (1 AzM)', d.imbracciata, (x) => imposta({ imbracciata: x })) : null,
    ],
    risultato(ctx, a, r, colpi, imposta),
  ];

  return h('div', { class: 'attacco-passi' },
    passi.map((contenuto, i) => h('section', { class: `attacco-passo${i === passo ? ' corrente' : ''}` },
      h('h3', {}, h('span', { class: 'num-passo' }, `${i + 1}`), ' ', PASSI[i]),
      contenuto)),
    // telefono: un passo per schermata
    h('nav', { class: 'attacco-nav', 'aria-label': 'Passi dell’attacco' },
      h('button', { type: 'button', class: 'btn', disabled: passo === 0, onclick: () => vai(passo - 1) }, '← Indietro'),
      h('span', { class: 'nota' }, `${passo + 1} / ${PASSI.length}`),
      passo < PASSI.length - 1 ? h('button', { type: 'button', class: 'btn primario', onclick: () => vai(passo + 1) }, `${PASSI[passo + 1]} →`) : null));
}

function risultato(ctx, a, r, colpi, imposta) {
  const spara = () => ctx.azioni.spara(a.uid, r.munizioni);
  return [
    r.impossibile ? h('div', { class: 'riquadro errore', role: 'alert' },
      h('p', {}, h('strong', {}, 'Attacco non possibile. '), r.impossibile.motivo),
      r.impossibile.proposta ? h('button', { type: 'button', class: 'btn', onclick: () => imposta({ modalita: r.impossibile.proposta.modalita }) }, `Usa ${r.impossibile.proposta.nome}`) : null) : null,
    h('div', { class: 'attacco-risultato' },
      h('p', { class: 'va-attacco' }, 'VA finale ', pillola(a.nome, r.va_finale, r.scomposizione), r.tiri > 1 ? h('span', { class: 'nota' }, ` · ${r.tiri} tiri, ciascuno con questo VA`) : null),
      h('table', { class: 'tabella compatta scomposizione-attacco' },
        h('tbody', {}, r.scomposizione.map((x, i) => h('tr', {},
          h('th', { scope: 'row' }, x.etichetta, x.paragrafo ? h('small', { class: 'sigla' }, ` ${x.paragrafo}`) : null),
          h('td', { class: x.valore < 0 && i ? 'malus' : x.valore > 0 && i ? 'bonus' : null }, i ? segno(x.valore) : numero(x.valore)))),
          h('tr', { class: 'totale' }, h('th', { scope: 'row' }, 'VA finale'), h('td', {}, numero(r.va_finale))))),
      h('dl', { class: 'voci griglia-voci' },
        h('div', {}, h('dt', {}, 'Azioni'), h('dd', {}, `${r.azioni_principali} ${r.azioni_principali === 1 ? 'Principale' : 'Principali'}${r.azioni_movimento ? ` + ${r.azioni_movimento} di Movimento` : ''}`)),
        h('div', {}, h('dt', {}, 'Munizioni'), h('dd', {}, `${r.munizioni}${colpi !== null ? ` (nel caricatore ${colpi})` : ''}`)),
        h('div', {}, h('dt', {}, 'Colpi a segno'), h('dd', {}, r.colpi_a_segno ? `${r.colpi_a_segno}${r.tiri > 1 ? ' per tiro riuscito' : ' con la Prova riuscita'}` : 'nessuno: effetto ad Area')),
        h('div', {}, h('dt', {}, 'Danno per colpo'), h('dd', {}, r.danno_per_colpo ?? '—', r.applicazioni !== 1 ? ` · ${r.applicazioni} applicazioni` : ''))),
      r.seconda_prova ? h('p', { class: 'nota' }, h('strong', {}, `Seconda Prova se fallisci: VA ${numero(r.seconda_prova.va)}. `), r.seconda_prova.testo) : null,
      r.promemoria.length ? h('ul', { class: 'promemoria-attacco' }, r.promemoria.map((p) => h('li', {}, p))) : null,
      h('div', { class: 'attacco-azioni' },
        h('button', {
          type: 'button', class: 'btn primario btn-grande', disabled: !!r.impossibile || (colpi !== null && colpi < r.munizioni),
          title: r.impossibile?.motivo ?? null, onclick: spara,
        }, `Spara (−${r.munizioni} ${r.munizioni === 1 ? 'munizione' : 'munizioni'})`),
        h('small', { class: 'nota' }, 'Tira 1d20 al tavolo. «Annulla» nell’intestazione annulla lo sparo; il pannello resta aperto per il prossimo tiro.'))),
  ];
}
