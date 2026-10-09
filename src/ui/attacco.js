// Pannello «Attacca!» della tab Combattimento (backlog voce 5). Le regole stanno in src/attacco.js;
// qui solo la presentazione: passi con gruppi di pulsanti e interruttori (niente menu a tendina),
// risultato con la provenienza del VA (src/provenienza.js), «Spara» (a distanza) o «Attacca» (corpo a corpo e senz'armi). Nessun tiro di dado: al tavolo si tira a mano. Le scelte
// si ricordano per ogni arma nella sessione (sessione → attacchi). Impianto del pannello e
// componenti comuni in src/ui/pannello-passi.js (telefono: un passo per schermata; da 800 px le
// scelte a sinistra e il risultato a destra).
import { h, segno } from './dom.js';
import { infoValore, listaProvenienza } from './tooltip.js';
import {
  calcolaAttaccoDistanza, vincoliDistanza, dichiarazioneDistanza, richiedeImbracciatura, talentiAttacco, descriviModalita, descriviManovraDistanza,
  calcolaAttaccoRavvicinato, vincoliRavvicinato, dichiarazioneRavvicinato, manovreRavvicinate, descriviManovraRavvicinata,
  modificatoriDistanza, vaDueArmi, effettiSituazionaliAttacco, fasciaCarica,
  ESITI_ATLETICA, conProvaAtletica, penalitaMovimento, esitoAtletica,
} from '../attacco.js';
import { specTiro, tira } from '../tiri.js';
import { riquadroDanno, rigaScelte, interruttore, pannelloPassi } from './pannello-passi.js';
import { selettoreLuce } from './tab.js';
import { avviso } from './avvisi.js';

const PASSI = ['Il tuo movimento', 'Il bersaglio', 'Distanza', 'Tipo di tiro', 'Risultato'];
const numero = (n) => (n < 0 ? `−${-n}` : String(n));
const RAPIDE = [3, 10, 20, 40, 80, 160, 300, 500, 750, 1000, 1500];

/**
 * Caselle degli effetti situazionali degli oggetti sul tiro o sul danno (Braccio potenziato, Equipaggiamento
 * §7.5): «Nome · +1 danno se con il braccio potenziato», con la frase del manuale nel tooltip.
 */
function caselleOggetti(ctx, a, tipo, d, imposta) {
  return effettiSituazionaliAttacco(ctx.tab.scheda, tipo, { senzArmi: !!a.senzArmi }).map((x) => {
    const acceso = d.oggetti.includes(x.uid);
    const effetto = [x.attacco ? `${segno(x.attacco)} VA` : null, x.danno ? `${segno(x.danno)} danno` : null].filter(Boolean).join(', ');
    return interruttore(x.oggetto, acceso, (on) => imposta({ oggetti: on ? [...d.oggetti, x.uid] : d.oggetti.filter((u) => u !== x.uid) }),
      { mod: `${effetto}${x.se ? ` se ${x.se}` : ''}`, info: x.condizione ? { titolo: x.oggetto, sezioni: [{ testo: x.condizione }] } : null });
  });
}

/**
 * Pannello d'attacco per l'arma `a` (voce di scheda.equipaggiamento.armi).
 * ctx: contesto della scheda a tab (dati, tab.scheda, sessione, ui, azioni).
 */
/**
 * Linea di tiro della mappa (fase 2, lotto 3): «Apri la scheda per Attacca!» lascia in sessionStorage distanza e
 * Copertura per il PG; il primo «Attacca!» aperto nella sua scheda entro 10 minuti le usa come valori iniziali.
 */
export const CHIAVE_DALLA_MAPPA = 'mutant-attacco-dalla-mappa';
function dallaMappa(ctx, a, salvate) {
  let p = null;
  try { p = JSON.parse(sessionStorage.getItem(CHIAVE_DALLA_MAPPA) ?? 'null'); } catch { return salvate; }
  const nome = ctx.tab?.tab?.[0]?.dati?.nome;
  if (!p || !nome || String(p.nome).trim().toUpperCase() !== String(nome).trim().toUpperCase() || Date.now() - p.quando > 10 * 60 * 1000) return salvate;
  try { sessionStorage.removeItem(CHIAVE_DALLA_MAPPA); } catch { /* resta */ }
  // fase 2, lotto 4: anche la luce della zona del bersaglio, proposta in «Luce sul bersaglio» (modificabile)
  // ritocchi del 07/10: anche l'id del bersaglio nello scontro, proposto in «Contro un nemico dello scontro»; dal menu del
  // token senza linea di tiro solo quello (soloBersaglio)
  const v = { ...salvate, ...(p.soloBersaglio ? {} : { distanza: p.distanza, bersaglio: { ...(salvate.bersaglio ?? {}), copertura: p.copertura, distanza: p.distanza, ...(p.protetto ? { impegnato: true } : {}), ...(p.interposta ? { interposta: true } : {}) } }), ...(p.luceMappa ? { luceMappa: p.luceMappa } : {}), ...(p.bersaglioId ? { bersaglioScontro: p.bersaglioId } : {}) };
  queueMicrotask(() => {
    ctx.azioni.ricordaAttacco?.(a.uid, v);
    if (p.luce && p.luce !== ctx.sessione?.luce) ctx.azioni.imposta?.('luce', p.luce);
    avviso(p.soloBersaglio ? `Dalla mappa: bersaglio ${p.bersaglio ?? ''}.` : `Dalla mappa: bersaglio ${p.bersaglio ?? ''} a ${p.distanza} Q, Copertura ${p.copertura}${p.luceMappa ? `, ${p.luceMappa}` : ''}.`);
  });
  return v;
}

const D20 = specTiro({ dadi: 1, facce: 20, fisso: 0 });
const NOME_FASCIA = { passo: 'Passo', corsa: 'Corsa', scatto: 'Scatto' };

/**
 * A.136: alla prima apertura del pannello si chiede alla scena dello scontro il movimento dell'attaccante nel Round
 * (ctx.azioni.movimentoMappa, solo con il server e uno scontro aperto); con una Corsa o uno Scatto il movimento si
 * imposta da sé e il passo propone la Prova facoltativa di Atletica.
 */
function movimentoDallaMappa(ctx, a, stato, salvate) {
  if (!ctx.azioni.movimentoMappa || stato.mappa !== undefined) return;
  stato.mappa = null;
  Promise.resolve(ctx.azioni.movimentoMappa()).then((m) => {
    if (!m?.fascia || ctx.ui.attacco !== stato) return;
    stato.mappa = m;
    if (conProvaAtletica(m.fascia, ctx.dati) && salvate.movimento !== m.fascia) {
      ctx.azioni.ricordaAttacco(a.uid, { ...salvate, movimento: m.fascia, atletica: null, atleticaTiro: null, evasivo: false, carica: false });
      avviso(`Dalla mappa: ${NOME_FASCIA[m.fascia]} in questo Round${m.daPasso ? ' (un Passo già cominciato diventato ' + NOME_FASCIA[m.fascia] + ')' : ''}. Puoi dichiarare la Prova facoltativa di Atletica.`);
    } else ctx.azioni.ridisegna();
  }).catch(() => {});
}

/** Riga «Dalla mappa» sotto il movimento: fascia del Round, Passo diventato blocco, Q contati. */
function notaMappa(stato) {
  const m = stato.mappa;
  if (!m?.fascia) return null;
  return h('p', { class: 'nota luce-mappa' }, `Dalla mappa (Round ${m.round}): ${NOME_FASCIA[m.fascia]}${m.daPasso ? ', da un Passo già cominciato' : ''}, ${m.q} Q.`);
}

/**
 * Prova facoltativa di Atletica di chi attacca (A.136): esito a scelta, oppure dal d20 dal vivo o tirato dall'app sul
 * VA di Atletica (quello della scheda, modificabile: per i nemici si scrive) con 0 in Corsa e −2 in Scatto.
 */
function provaAtletica(ctx, d, stato, imposta) {
  const P = ctx.dati.regole.attacco_distanza.movimento.prova_atletica;
  if (!P || !conProvaAtletica(d.movimento, ctx.dati)) return null;
  const senza = penalitaMovimento(d.movimento, null, ctx.dati);
  const abil = (ctx.tab.scheda?.abilita ?? []).find((x) => x.nome === P.abilita);
  const vaScheda = abil ? abil.effettivo ?? abil.va ?? null : null;
  stato.vaAtletica ??= Number.isInteger(vaScheda) ? vaScheda : null;
  const mod = P.modificatore[d.movimento] ?? 0;
  const tiro = (valore, origine) => {
    if (!Number.isInteger(stato.vaAtletica)) { avviso(`Scrivi il VA di ${P.abilita}.`, { tipo: 'errore' }); return; }
    const e = esitoAtletica(stato.vaAtletica, d.movimento, valore, ctx.dati);
    if (!e.esito) { avviso(`${e.testo} Restano le penalità senza Prova.`, { tipo: 'errore' }); imposta({ atletica: null, atleticaTiro: null }); return; }
    imposta({ atletica: e.esito, atleticaTiro: { valore, origine, va: e.va, testo: e.testo } });
  };
  const input = h('input', { type: 'number', min: 1, max: 20, step: 1, class: 'input-d10', 'aria-label': 'd20 dal vivo' });
  const t = d.atletica && d.atleticaTiro ? d.atleticaTiro : null;
  return [
    rigaScelte(`Prova facoltativa di ${P.abilita} (A.136)`, [
      { valore: 'no', etichetta: `Senza Prova ${numero(senza.proprio)}`, riga: `contro di te ${numero(senza.bersaglio)}` },
      ...ESITI_ATLETICA.map((e) => ({ valore: e, etichetta: `${P.esiti[e].nome} ${numero(P.esiti[e].proprio[d.movimento])}`, riga: `contro di te ${numero(P.esiti[e].bersaglio[d.movimento])}` })),
    ], d.atletica ?? 'no', (x) => imposta({ atletica: x === 'no' ? null : x, atleticaTiro: null })),
    h('div', { class: 'scelta-attacco scelta-distanza' },
      h('p', { class: 'scelta-titolo' }, `Tiro della Prova (dichiarala prima di tirare): ${P.abilita} ${numero(mod)} in ${NOME_FASCIA[d.movimento]}`),
      h('div', { class: 'distanza-riga' },
        h('label', {}, `VA ${P.abilita} `, h('input', { type: 'number', step: 1, class: 'input-d10', value: stato.vaAtletica ?? '', 'aria-label': `VA di ${P.abilita}`, onchange: (e) => { const n = Number(e.target.value); stato.vaAtletica = e.target.value === '' || !Number.isInteger(n) ? null : n; } })),
        input,
        h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => {
          const v = Number(input.value);
          if (!Number.isInteger(v) || v < 1 || v > 20) { avviso('Il d20 dal vivo va da 1 a 20.', { tipo: 'errore' }); return; }
          tiro(v, 'vivo');
        } }, 'Inserisci'),
        h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => tiro(tira(D20).tiro.valore, 'app') }, 'Tira 1d20 con l’app')),
      t ? h('small', { class: 'nota' }, `d20 ${t.origine === 'app' ? 'tirato dall’app' : 'dal vivo'}: ${t.testo}`) : null,
      h('small', { class: 'nota' }, 'I Q percorsi non cambiano con l’esito; gli effetti durano fino alla tua Iniziativa successiva.')),
  ];
}

/** Esito della Prova di Atletica del bersaglio in Corsa o Scatto (A.136): cambia la penalità per colpirlo. */
function provaAtleticaBersaglio(ctx, bers, b) {
  const P = ctx.dati.regole.attacco_distanza.movimento.prova_atletica;
  if (!P || bers.evasivo || !conProvaAtletica(bers.movimento, ctx.dati)) return null;
  const senza = penalitaMovimento(bers.movimento, null, ctx.dati);
  return rigaScelte(`Prova di ${P.abilita} del bersaglio (A.136)`, [
    { valore: 'no', etichetta: `Senza Prova ${numero(senza.bersaglio)}` },
    ...ESITI_ATLETICA.map((e) => ({ valore: e, etichetta: `${P.esiti[e].nome} ${numero(P.esiti[e].bersaglio[bers.movimento])}` })),
  ], bers.atletica ?? 'no', (x) => b({ atletica: x === 'no' ? null : x }));
}

export function pannelloAttacco(ctx, a) {
  const chiudi = () => { ctx.ui.attacco = null; ctx.azioni.ridisegna(); };
  const intestazione = { etichetta: `Attacco con ${a.nome}`, titolo: `Attacca! · ${a.nome}`, chiudi, etichettaNav: 'Passi dell’attacco' };
  if (a.tipo === 'arma_distanza') return corpoDistanza(ctx, a, intestazione);
  return corpoRavvicinato(ctx, a, intestazione);
}

function corpoRavvicinato(ctx, a, intestazione) {
  const R = ctx.dati.regole.attacco_ravvicinato;
  const personaggio = { scheda: ctx.tab.scheda, sessione: ctx.sessione };
  // le scelte salvate contengono anche l’ultima Manovra: si conservano
  const salvate = dallaMappa(ctx, a, ctx.sessione.attacchi?.[a.uid] ?? {});
  const d = dichiarazioneRavvicinato(salvate);
  const imposta = (modifica) => ctx.azioni.ricordaAttacco(a.uid, { ...salvate, ...d, ...modifica, bersaglio: { ...d.bersaglio, ...(modifica.bersaglio ?? {}) } });
  const b = (modifica) => imposta({ bersaglio: modifica });
  const v = vincoliRavvicinato(personaggio, a, d, ctx.dati);
  const T = talentiAttacco(ctx.tab.scheda, ctx.dati, 'attacco_ravvicinato');
  const ha = (k) => T.find((t) => t.e[k] !== undefined) ?? null;
  const r = calcolaAttaccoRavvicinato(personaggio, a, d, ctx.dati);
  const stato = (ctx.ui.attacco ??= { uid: a.uid, passo: 0 });
  movimentoDallaMappa(ctx, a, stato, salvate);
  const manovraScelta = d.manovra[0];
  const statoATerra = (ctx.sessione.statiAttivi ?? []).includes(R.a_terra.stato);
  const carica = fasciaCarica(d.percorsoQ, R.carica);
  // A.40: l'ultima fascia arriva alla Corsa massima del personaggio
  const corsaQ = a.corsaQ ?? ctx.tab?.scheda?.tavolo?.movimento?.corsa?.effettivo ?? ctx.tab?.scheda?.movimento?.corsa ?? null;
  const cm = T.find((t) => t.e.carica?.moltiplicatore);
  const molt = cm ? cm.e.carica.moltiplicatore : R.carica.moltiplicatore;
  // §5.7: il VA della coppia in mano, con il Talento di quella combinazione (lo stesso del calcolo)
  const due = vaDueArmi(ctx.tab.scheda, a, ctx.dati);
  // Manovre con più bersagli (Spazzata, Combattimento Multiplo): VA per numero, con la versione Migliorata
  const mScelta = manovreRavvicinate(ctx.tab.scheda, ctx.dati)[manovraScelta];
  const migB = mScelta?.va_per_bersagli ? T.find((t) => t.e.manovra?.[mScelta.riduzione_da ?? manovraScelta]) : null;
  const vaBersagli = (n) => { const va = mScelta.va_per_bersagli[n]; const rid = migB?.e.manovra[mScelta.riduzione_da ?? manovraScelta].riduzione ?? 0; return va + Math.min(rid, -va); };

  const passi = [
    { titolo: 'Il tuo movimento', contenuto: [
      rigaScelte('Movimento', [
        { valore: 'fermo', etichetta: 'Fermo' }, { valore: 'passo', etichetta: 'Passo' }, { valore: 'corsa', etichetta: 'Corsa' }, { valore: 'scatto', etichetta: 'Scatto' },
      ], d.movimento, (x) => imposta({ movimento: x, atletica: null, atleticaTiro: null })),
      notaMappa(stato),
      d.carica ? null : provaAtletica(ctx, d, stato, imposta),
      interruttore('Carica', d.carica, (x) => imposta({ carica: x, ...(x ? { controcarica: false, manovra: 'normale' } : {}) }),
        { motivo: d.carica ? v.carica : null, mod: `${carica ? numero(carica.va) : R.carica.fasce.map((f) => numero(f.va)).join('/')} · danno ×${molt}`, info: infoRegola('Carica', R.carica) }),
      d.carica ? h('div', { class: 'scelta-attacco scelta-distanza' },
        h('label', { class: 'scelta-titolo', for: `percorso-${a.uid}` }, 'Percorso della Carica in Q'),
        h('div', { class: 'distanza-riga' },
          h('input', { id: `percorso-${a.uid}`, type: 'number', min: 1, step: 1, inputmode: 'numeric', value: d.percorsoQ, class: 'input-distanza', onchange: (e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 0) imposta({ percorsoQ: Math.round(n) }); } }),
          h('span', { class: `fascia${carica ? ' malus' : ''}` }, carica ? `${carica.da}–${carica.a ?? 'Corsa'} Q: ${numero(carica.va)}, chi ti attacca ${numero(carica.avversari)}` : 'fuori tabella')),
        h('div', { class: 'scelta-pulsanti' }, [...new Set([...R.carica.fasce.flatMap((f) => [f.da, f.a]).filter(Number.isInteger), ...(Number.isInteger(corsaQ) ? [corsaQ] : [])])].sort((x, y) => x - y).map((q) => h('button', { type: 'button', class: `btn scelta-btn${d.percorsoQ === q ? ' scelta' : ''}`, onclick: () => imposta({ percorsoQ: q }) }, q === corsaQ ? `${q} (Corsa)` : String(q))))) : null,
      interruttore('Controcarica (al posto delle Difese)', d.controcarica, (x) => imposta({ controcarica: x, ...(x ? { carica: false, manovra: 'normale' } : {}) }),
        { motivo: d.controcarica ? v.controcarica : null, mod: `${numero(R.controcarica.va)} · danno ×${molt}`, info: infoRegola('Controcarica', R.controcarica) }),
      interruttore('Sei A Terra', d.aTerra || statoATerra, (x) => imposta({ aTerra: x }),
        { motivo: statoATerra ? `dallo Stato della sessione: il ${numero(R.a_terra.proprio)} è già nel VA` : null, mod: numero(R.a_terra.proprio), info: infoRegola('A Terra', R.a_terra) }),
      // attaccante esterno (nemico del Tavolo del Master): niente opzioni di mani ed equipaggiamento del PG
      a.esterno ? null : interruttore('Combatti con due armi', d.dueArmi, (x) => imposta({ dueArmi: x, ...(x ? { manovra: 'normale' } : {}) }),
        { motivo: v.dueArmi, mod: `${v.secondaArma ? `con ${v.secondaArma.nome} · ` : ''}${numero(due.va)} a ciascuno${due.talento ? ` (${due.talento})` : ''}`, info: infoRegola('Combattere con due armi', R.due_armi) }),
      !d.dueArmi && !a.senzArmi && !a.esterno ? interruttore('Solo la mano non dominante', d.manoNonDominante, (x) => imposta({ manoNonDominante: x }),
        { mod: T.some((t) => t.e.mano_non_dominante) ? '0 (Ambidestro)' : numero(R.mano_non_dominante.va), info: infoRegola('Mano non dominante', R.mano_non_dominante) }) : null,
      interruttore('Imboscata (Azione dichiarata)', d.imboscata, (x) => imposta({ imboscata: x }),
        { mod: numero(ha('imboscata')?.e.imboscata.va ?? R.imboscata.va), info: infoRegola('Imboscata', R.imboscata) }),
      interruttore('Attacco di Opportunità', d.opportunita, (x) => imposta({ opportunita: x, ...(x ? { manovra: 'normale' } : {}) }),
        { mod: 'gratuito · solo attacco normale', info: infoRegola('Attacco di Opportunità', R.opportunita) }),
      ha('primo_attacco') ? interruttore('Primo attacco del combattimento', d.primoAttacco, (x) => imposta({ primoAttacco: x }), { mod: `${segno(ha('primo_attacco').e.primo_attacco.va)} (${ha('primo_attacco').nome})` }) : null,
      ...caselleOggetti(ctx, a, 'ravvicinati', d, imposta),
    ] },
    { titolo: 'Il bersaglio', contenuto: [
      // fase 2, lotto 4: la luce sul bersaglio anche nel corpo a corpo (A.106: attacchi che dipendono dalla vista), con
      // la riga della luce proposta dalla mappa
      selettoreLuce(ctx, { compatto: true }),
      salvate.luceMappa ? h('p', { class: 'nota luce-mappa' }, salvate.luceMappa) : null,
      interruttore('A Terra', d.bersaglio.aTerra, (x) => b({ aTerra: x }), { mod: segno(R.a_terra.bersaglio) }),
      interruttore('Ignaro della tua presenza', d.bersaglio.ignaro, (x) => b({ ignaro: x }), { mod: ha('ignaro') ? `${segno(ha('ignaro').e.ignaro.va)} (${ha('ignaro').nome})` : 'per i Talenti' }),
      ha('alleato_adiacente') ? interruttore('Adiacente a un alleato', d.bersaglio.alleatoAdiacente, (x) => b({ alleatoAdiacente: x }), { mod: `${segno(ha('alleato_adiacente').e.alleato_adiacente.va)} (${ha('alleato_adiacente').nome})` }) : null,
      rigaScelte('Copertura del bersaglio (§5.8: se l’ostacolo lo protegge dalla tua direzione)', ['nessuna', 'leggera', 'media', 'totale'].map((c) => ({
        valore: c, etichetta: c[0].toUpperCase() + c.slice(1),
        riga: c === 'nessuna' ? null : c === 'totale' ? 'nessun attacco diretto' : `${numero((d.bersaglio.coperturaMigliorata ? R.copertura.bersaglio_migliorata : R.copertura.bersaglio)[c])} VA`,
      })), d.bersaglio.copertura, (x) => b({ copertura: x })),
      d.bersaglio.copertura === 'leggera' || d.bersaglio.copertura === 'media' ? interruttore('Il bersaglio ha Copertura Migliorata', d.bersaglio.coperturaMigliorata, (x) => b({ coperturaMigliorata: x }),
        { mod: `${numero(R.copertura.bersaglio_migliorata.leggera)} / ${numero(R.copertura.bersaglio_migliorata.media)}`, info: infoRegola('Copertura', R.copertura) }) : null,
      // §5.3 (E&L 14): Superiorità numerica
      h('div', { class: 'scelta-attacco scelta-distanza' },
        h('label', { class: 'scelta-titolo', for: `attaccanti-${a.uid}` }, 'Attaccanti in ravvicinato contro il bersaglio (te compreso)'),
        h('div', { class: 'distanza-riga' },
          h('input', { id: `attaccanti-${a.uid}`, type: 'number', min: 1, step: 1, inputmode: 'numeric', value: d.attaccanti, class: 'input-distanza', onchange: (e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 1) imposta({ attaccanti: Math.round(n) }); } }),
          (() => { const f = R.superiorita_numerica.fasce.find((x) => d.attaccanti >= x.da && (x.a === null || d.attaccanti <= x.a)); return h('span', { class: `fascia${f?.va ? ' bonus' : ''}`, title: R.superiorita_numerica.frasi.join(' ') }, f?.va ? `${segno(f.va)} VA (Superiorità numerica, §5.3)` : 'nessun bonus'); })()),
        h('div', { class: 'scelta-pulsanti' }, [1, 3, 6, 8].map((q) => h('button', { type: 'button', class: `btn scelta-btn${d.attaccanti === q ? ' scelta' : ''}`, onclick: () => imposta({ attaccanti: q }) }, q === 8 ? '8+' : String(q))))),
      rigaScelte('Circostanza del Direttore (§1.4)', R.circostanze.valori.map((x) => ({ valore: x, etichetta: x ? segno(x) : 'Normale' })), d.circostanza, (x) => imposta({ circostanza: x })),
      h('div', { class: 'scelta-attacco scelta-distanza' },
        h('label', { class: 'scelta-titolo', for: `dist-${a.uid}` }, `Distanza in Q (portata ${v.portata} Q)`),
        h('div', { class: 'distanza-riga' },
          h('input', { id: `dist-${a.uid}`, type: 'number', min: 1, step: 1, inputmode: 'numeric', value: d.bersaglio.distanza, class: 'input-distanza', onchange: (e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 1) b({ distanza: Math.round(n) }); } }),
          h('span', { class: `fascia${d.bersaglio.distanza > v.portata ? ' malus' : ''}` }, d.bersaglio.distanza > v.portata ? 'oltre la portata' : d.bersaglio.distanza === 1 ? 'Contatto' : 'entro la portata')),
        h('div', { class: 'scelta-pulsanti' }, [...new Set([1, 2, 3, v.portata, 6])].sort((x, y) => x - y).map((q) => h('button', { type: 'button', class: `btn scelta-btn${d.bersaglio.distanza === q ? ' scelta' : ''}`, onclick: () => b({ distanza: q }) }, String(q))))),
    ] },
    { titolo: 'Manovra', contenuto: [
      rigaScelte('Manovra', Object.entries(v.manovre).filter(([, x]) => !x.nascosta).map(([id, x]) => ({
        valore: id, etichetta: manovreRavvicinate(ctx.tab.scheda, ctx.dati)[id].nome, motivo: x.motivo, ...descriviManovraRavvicinata(id, ctx.tab.scheda, ctx.dati),
      })), manovraScelta, (x) => imposta({ manovra: x })),
      // §5.12 (E&L 7–8): l'opposizione la sceglie il bersaglio prima del tiro
      R.manovre[manovraScelta]?.prova?.scelta_bersaglio ? rigaScelte('Il bersaglio si oppone con (lo sceglie lui, prima del tiro)',
        R.manovre[manovraScelta].prova.contro.map((x) => ({ valore: x, etichetta: x })), d.opposizione, (x) => imposta({ opposizione: x })) : null,
      mScelta?.va_per_bersagli ? rigaScelte(`Bersagli (${mScelta.nome})`, Object.keys(mScelta.va_per_bersagli).map(Number).map((n) => ({ valore: n, etichetta: `${n} bersagli`, riga: `${numero(vaBersagli(n))} VA${migB ? ` (${migB.nome})` : ''}` })), d.bersagli, (x) => imposta({ bersagli: x })) : null,
      a.senzArmi ? h('p', { class: 'nota' }, `Danno senz’armi: ${a.danno.una_mano} (${a.dannoOrigine === 'base' ? `base ${a.dannoBase}` : `${a.dannoBase}, ${a.dannoOrigine}`}${a.bonusCaratteristica?.bonus ? `, ${a.bonusCaratteristica.sigla} ${a.bonusCaratteristica.bonus > 0 ? '+' : ''}${a.bonusCaratteristica.bonus}` : ''}; §5.13).`) : null,
    ] },
    { titolo: 'Risultato', contenuto: risultatoRavvicinato(ctx, a, r) },
  ];
  return pannelloPassi({ ...intestazione, passi, stato, ridisegna: ctx.azioni.ridisegna });
}

/** Tooltip di una regola del blocco attacco_ravvicinato: titolo, paragrafo e frasi del manuale. */
function infoRegola(titolo, regola) {
  return { titolo, sottotitolo: regola.paragrafo, sezioni: [...(regola.frasi ?? []).map((f) => ({ testo: f })), regola['TODO(Davide)'] ? { etichetta: 'Provvisorio', testo: regola['TODO(Davide)'] } : null].filter(Boolean) };
}

function risultatoRavvicinato(ctx, a, r) {
  const ultima = ctx.sessione.attacchi?.[a.uid]?.ultima ?? null;
  return [
    r.impossibile ? h('div', { class: 'riquadro errore', role: 'alert' }, h('p', {}, h('strong', {}, 'Attacco non possibile. '), r.impossibile.motivo)) : null,
    r.avvisi.length ? h('div', { class: 'riquadro attenzione' }, r.avvisi.map((x) => h('p', {}, x))) : null,
    h('div', { class: 'attacco-risultato' },
      riquadroDanno([r.danno?.testo ? { valore: r.danno.testo, dettagli: [r.danno.natura, r.danno.testo_magistrale ? `Magistrale ${r.danno.testo_magistrale}` : null] } : null]),
      h('p', { class: 'va-attacco' }, `${r.prova?.tipo === 'contrapposta' ? 'VA della Prova ' : 'VA finale '}`, pillola(a.nome, r.va_finale, r.provenienza),
        h('small', { class: 'nota' }, ` · ${r.manovra?.nome ?? ''}`)),
      r.attacchi.length > 1 ? h('ul', { class: 'promemoria-attacco' }, r.attacchi.map((x) => h('li', {}, `${x.etichetta}: VA ${numero(x.va)}${x.danno ? ` · danno ${x.danno} (della propria arma)` : ''}`))) : null,
      h('div', { class: 'provenienza-attacco' }, listaProvenienza(r.provenienza, 'VA finale')),
      h('dl', { class: 'voci griglia-voci' },
        h('div', {}, h('dt', {}, 'Azioni'), h('dd', {}, r.azioni_principali ? `${r.azioni_principali} ${r.azioni_principali === 1 ? 'Principale' : 'Principali'}` : 'nessuna (gratuito)', r.azioni_movimento ? ` + ${r.azioni_movimento} di Movimento` : '')),
        h('div', {}, h('dt', {}, 'Bersaglio'), h('dd', {}, r.prova?.testo ?? '—')),
        // il danno da tirare sta in evidenza in cima (riquadroDanno); qui solo quando non c'è
        r.danno?.testo ? null : h('div', {}, h('dt', {}, 'Danno'), h('dd', {}, r.danno === null ? 'nessuno' : 'da definire')),
        r.dopo_armatura.length ? h('div', {}, h('dt', {}, 'Dopo l’Armatura'), h('dd', {}, r.dopo_armatura.map((x) => x.etichetta).join(' · '), h('small', { class: 'nota' }, ' (solo se almeno 1 danno la supera)'))) : null,
        r.effetti.length ? h('div', {}, h('dt', {}, 'Effetti'), h('dd', {}, r.effetti.join(' '))) : null),
      r.dopo_armatura.length ? h('ul', { class: 'promemoria-attacco' }, r.dopo_armatura.map((x) => h('li', {}, x.testo))) : null,
      r.promemoria.length ? h('ul', { class: 'promemoria-attacco' }, r.promemoria.map((p) => h('li', {}, p))) : null,
      promemoriaAR(ctx, a),
      // Tavolo del Master (pezzo 5): un attaccante esterno sostituisce la riga finale con tiro per colpire ed esito
      ctx.azioni.finale ? ctx.azioni.finale(r) : h('div', { class: 'attacco-azioni' },
        h('button', {
          type: 'button', class: 'btn primario btn-grande', disabled: !!r.impossibile, title: r.impossibile?.motivo ?? null,
          onclick: () => ctx.azioni.ricordaAttacco(a.uid, { ...(ctx.sessione.attacchi?.[a.uid] ?? {}), ultima: { manovra: r.manovra.id, nome: r.manovra.nome } }),
        }, 'Attacca'),
        h('small', { class: 'nota' }, ultima ? `Ultima Manovra con quest’arma: ${ultima.nome}. ` : '', 'Tira 1d20 al tavolo. «Attacca» non consuma nulla: registra la Manovra usata.'))),
      // ritocchi del 07/10: con il PG in uno scontro aperto, il bersaglio fra i nemici e «Applica il danno» (src/ui/attacco-pg.js)
      ctx.azioni.finale ? null : ctx.azioni.controNemico?.(ctx, a, r) ?? null,
  ];
}

/** VA in pillola con il tooltip della provenienza del motore (src/provenienza.js), una riga per contributo. */
export function pillola(nome, va, provenienza) {
  return infoValore(numero(va), { titolo: `${nome}: ${numero(va)}`, provenienza, sezioni: [] }, { classe: 'val-eff pillola-va pillola-attacco' });
}

function corpoDistanza(ctx, a, intestazione) {
  const personaggio = { scheda: ctx.tab.scheda, sessione: ctx.sessione };
  const salvate = dallaMappa(ctx, a, ctx.sessione.attacchi?.[a.uid] ?? {});
  const d = dichiarazioneDistanza(salvate);
  const imposta = (modifica) => ctx.azioni.ricordaAttacco(a.uid, { ...(salvate.luceMappa ? { luceMappa: salvate.luceMappa } : {}), ...d, ...modifica, bersaglio: { ...d.bersaglio, ...(modifica.bersaglio ?? {}) } });
  const b = (modifica) => imposta({ bersaglio: modifica });
  const v = vincoliDistanza(personaggio, a, d, ctx.dati);
  const T = talentiAttacco(ctx.tab.scheda, ctx.dati);
  const r = calcolaAttaccoDistanza(personaggio, a, d, ctx.dati);
  const MF = ctx.dati.regole.modalita_di_fuoco;
  // granate da lancio (§7.20.3): quelle rimaste nella voce dell’Inventario
  const colpi = a.granata ? a.granata.disponibili ?? null : ctx.sessione.munizioni?.[a.uid]?.colpi ?? null;
  const stato = (ctx.ui.attacco ??= { uid: a.uid, passo: 0 });
  movimentoDallaMappa(ctx, a, stato, salvate);
  const R = ctx.dati.regole.attacco_distanza;
  const M = R.manovre;
  const evasivoProprio = R.movimento_evasivo.proprio[d.movimento];
  const man = (id) => descriviManovraDistanza(id, a, ctx.dati, T);
  const analisi = T.find((t) => t.e.analisi_rapida);
  const primo = T.find((t) => t.e.primo_attacco);
  const imboscato = T.find((t) => t.e.nascosto);
  const designato = T.find((t) => t.e.preparazione);
  // §5.7 (regole e Talenti in attacco_ravvicinato: Pistolero, Duellante, Ambidestro)
  const R7 = ctx.dati.regole.attacco_ravvicinato;
  const T7 = talentiAttacco(ctx.tab.scheda, ctx.dati, 'attacco_ravvicinato');
  // etichette con i Talenti del personaggio, come nel calcolo (src/attacco.js → modificatoriDistanza, vaDueArmi)
  const MD = modificatoriDistanza(ctx.tab.scheda, ctx.dati);
  const due = vaDueArmi(ctx.tab.scheda, a, ctx.dati);
  const conTal = (n) => (n ? ` (${n})` : '');

  const passi = [
    [
      rigaScelte('Movimento', [
        { valore: 'fermo', etichetta: 'Fermo' }, { valore: 'passo', etichetta: 'Passo' },
        { valore: 'corsa', etichetta: `Corsa ${numero(MD.movimento.corsa)}${conTal(MD.talenti.movimento)}` }, { valore: 'scatto', etichetta: `Scatto ${numero(MD.movimento.scatto)}${conTal(MD.talenti.movimento)}` },
      ], d.movimento, (x) => imposta({ movimento: x, atletica: null, atleticaTiro: null, ...(x === 'fermo' ? { evasivo: false } : {}), ...(!['fermo', 'passo'].includes(x) ? { coperturaPropria: 'nessuna' } : {}) })),
      notaMappa(stato),
      d.evasivo ? null : provaAtletica(ctx, d, stato, imposta),
      interruttore('Movimento Evasivo', d.evasivo, (x) => imposta({ evasivo: x }), { motivo: v.evasivo, mod: `AzM + AzP${evasivoProprio ? ` · ${numero(evasivoProprio)}` : ''}` }),
      rigaScelte('Attacco dalla Copertura (AzM)', [
        { valore: 'nessuna', etichetta: 'Nessuna' },
        { valore: 'leggera', etichetta: `Leggera ${numero(MD.copertura.leggera)}${conTal(MD.talenti.copertura)}`, motivo: v.coperturaPropria },
        { valore: 'media', etichetta: `Media ${numero(MD.copertura.media)}${conTal(MD.talenti.copertura)}`, motivo: v.coperturaPropria },
      ], d.coperturaPropria, (x) => imposta({ coperturaPropria: x })),
      a.esterno ? null : interruttore('Combatti con due armi', d.dueArmi, (x) => imposta({ dueArmi: x, ...(x ? { modalita: 'S', mirato: false } : {}) }),
        { motivo: v.dueArmi, mod: `${v.secondaArma ? `con ${v.secondaArma.nome} · ` : ''}${numero(due.va)} a ciascuno${conTal(due.talento)}` }),
      !d.dueArmi && !a.esterno ? interruttore('Solo la mano non dominante', d.manoNonDominante, (x) => imposta({ manoNonDominante: x }),
        { mod: T7.some((t) => t.e.mano_non_dominante) ? '0 (Ambidestro)' : numero(R7.mano_non_dominante.va) }) : null,
      ...caselleOggetti(ctx, a, 'distanza', d, imposta),
    ],
    [
      selettoreLuce(ctx, { compatto: true }),
      // fase 2, lotto 4: la riga della luce proposta dalla mappa
      salvate.luceMappa ? h('p', { class: 'nota luce-mappa' }, salvate.luceMappa) : null,
      rigaScelte('Movimento del bersaglio', [
        { valore: 'fermo', etichetta: 'Fermo' }, { valore: 'passo', etichetta: 'Passo' }, { valore: 'corsa', etichetta: `Corsa ${numero(R.movimento.bersaglio.corsa)}` }, { valore: 'scatto', etichetta: `Scatto ${numero(R.movimento.bersaglio.scatto)}` },
      ], d.bersaglio.movimento, (x) => b({ movimento: x, atletica: null })),
      provaAtleticaBersaglio(ctx, d.bersaglio, b),
      rigaScelte('Movimento Evasivo del bersaglio', [
        { valore: 'no', etichetta: 'No' }, { valore: 'si', etichetta: 'Sì' }, { valore: 'migliorato', etichetta: 'Sì, Migliorato' },
      ], d.bersaglio.evasivoMigliorato ? 'migliorato' : d.bersaglio.evasivo ? 'si' : 'no', (x) => b({ evasivo: x !== 'no', evasivoMigliorato: x === 'migliorato' })),
      rigaScelte('Copertura del bersaglio', [
        { valore: 'nessuna', etichetta: 'Nessuna' }, { valore: 'leggera', etichetta: `Leggera ${numero(R.copertura.bersaglio.leggera)}` },
        { valore: 'media', etichetta: `Media ${numero(R.copertura.bersaglio.media)}` }, { valore: 'totale', etichetta: 'Totale' },
      ], d.bersaglio.copertura, (x) => b({ copertura: x })),
      interruttore('Impegnato in Ravvicinato, protetto da un alleato o con un ostaggio', d.bersaglio.impegnato, (x) => b({ impegnato: x }), { mod: `${numero(MD.impegnato)}${conTal(MD.talenti.impegnato)}` }),
      // A.141 e A.144 (decisione 145): −2 una volta sola, senza seconda Prova
      // sintesi A Terra (05/10/2026): a distanza −2 a chi lo attacca
      R.a_terra ? interruttore('Bersaglio A Terra', d.bersaglio.aTerra, (x) => b({ aTerra: x }), { mod: numero(R.a_terra.bersaglio) }) : null,
      R.interposta ? interruttore('Creatura interposta sulla linea di tiro (una o più, non quella già contata come impegnato)', d.bersaglio.interposta, (x) => b({ interposta: x }), { mod: numero(R.interposta.va) }) : null,
      interruttore('Ignaro, immobilizzato o incapace di reagire', d.bersaglio.ignaro, (x) => b({ ignaro: x }), { mod: M.bruciapelo.nome.replace('Tiro a ', '') }),
      interruttore('Ti impegna in Ravvicinato', d.bersaglio.tiImpegna, (x) => b({ tiImpegna: x }), { mod: `${M.ravvicinato.nome.replace('Tiro ', '')} obbligatorio` }),
      analisi ? interruttore('Analisi Rapida (una volta)', d.analisiRapida, (x) => imposta({ analisiRapida: x }), { mod: segno(analisi.e.analisi_rapida.va) }) : null,
      primo ? interruttore(`Primo attacco del combattimento (entro ${primo.e.primo_attacco.distanza_max_q} Q)`, d.primoAttacco, (x) => imposta({ primoAttacco: x }), { mod: `${segno(primo.e.primo_attacco.va)} (${primo.nome})` }) : null,
      imboscato ? interruttore('Sei nascosto e il bersaglio è ignaro', d.nascosto, (x) => imposta({ nascosto: x, ...(x ? { bersaglio: { ...d.bersaglio, ignaro: true } } : {}) }),
        { mod: `+${imboscato.e.nascosto.danno} danni (${imboscato.nome})` }) : null,
      designato ? rigaScelte(`Preparazione (${designato.nome})`, Array.from({ length: Math.floor(designato.e.preparazione.massimo / designato.e.preparazione.dopo_armatura_per_azione) + 1 }, (_, n) => ({
        valore: n, etichetta: n ? `${n} AzP · +${n * designato.e.preparazione.dopo_armatura_per_azione} dopo l’Armatura` : 'Nessuna',
      })), d.preparazione, (x) => imposta({ preparazione: x })) : null,
    ],
    [
      h('div', { class: 'scelta-attacco scelta-distanza' },
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
      a.esterno ? null : h('p', { class: 'nota' }, a.mirino
        ? `Mirino montato: ${a.mirino.nome} (riduce la penalità di ${a.mirino.riduzione}${a.mirino.distanza_max_q ? ` fino a ${a.mirino.distanza_max_q} Q` : ' entro la gittata'}${a.mirino.azp_minime > 1 ? `, almeno ${a.mirino.azp_minime} AzP` : ''}).`
        : 'Nessun mirino montato sull’arma (inventario).'),
    ],
    [
      rigaScelte('Modalità', (a.modalita ?? []).filter((x) => x !== 'TM' && MF[x]).map((x) => ({ valore: x, etichetta: MF[x].nome, motivo: v.modalita[x], ...descriviModalita(x, ctx.dati, T) })),
        d.modalita, (x) => imposta({ modalita: x, ...(ctx.dati.regole.attacco_distanza.modalita.manovre_ammesse[x]?.includes('mirato') ? {} : { mirato: false, ravvicinato: false, bruciapelo: false }) })),
      interruttore(M.mirato.nome, d.mirato, (x) => imposta({ mirato: x }), { motivo: v.mirato, mod: man('mirato').riga, info: man('mirato').info }),
      d.distanza <= M.ravvicinato.distanza_max_q
        ? interruttore(`${M.ravvicinato.nome} (≤ ${M.ravvicinato.distanza_max_q} Q)`, d.ravvicinato || d.bersaglio.tiImpegna, (x) => imposta({ ravvicinato: x }),
          { motivo: d.bersaglio.tiImpegna ? 'obbligatorio: il bersaglio ti impegna' : v.ravvicinato, mod: man('ravvicinato').riga, info: man('ravvicinato').info }) : null,
      d.distanza <= M.bruciapelo.distanza_max_q
        ? interruttore(`${M.bruciapelo.nome} (Contatto)`, d.bruciapelo, (x) => imposta({ bruciapelo: x }), { motivo: v.bruciapelo, mod: man('bruciapelo').riga, info: man('bruciapelo').info }) : null,
      // A.38: già imbracciata (non si paga di nuovo), imbracciata in questo Round (1 AzM) o senza Imbracciatura (−4)
      richiedeImbracciatura(a, ctx.dati) ? rigaScelte('Imbracciatura', [
        { valore: 'gia', etichetta: 'Già imbracciata' }, { valore: 'ora', etichetta: 'Imbraccio ora (1 AzM)' }, { valore: 'no', etichetta: `Senza ${numero(R.imbracciatura.va)}` },
      ], d.imbracciaOra ? 'ora' : d.imbracciata ? 'gia' : 'no', (x) => imposta({ imbracciata: x !== 'no', imbracciaOra: x === 'ora' })) : null,
    ],
    risultato(ctx, a, r, colpi, imposta),
  ];

  return pannelloPassi({ ...intestazione, passi: passi.map((contenuto, i) => ({ titolo: PASSI[i], contenuto })), stato, ridisegna: ctx.azioni.ridisegna });
}

/**
 * Promemoria sull'Armatura del bersaglio (regole.json → ar.promemoria_danno, Giocatore §5.13, §5.24)
 * e, se l'arma è Rotta (0 PI, Armamenti §7.2.1), l'avviso che non si può usare.
 */
function promemoriaAR(ctx, a) {
  const testo = ctx.dati.regole.ar?.promemoria_danno;
  // A.50: ordine delle riduzioni dell'AR del bersaglio (regole.json → ar.ordine_riduzioni); parte chiuso anche quando
  // l'arma o la munizione ha una delle proprietà che lo toccano (richiesta di Marcello del 07/10: allungava molto la
  // colonna «Risultato»), e in quel caso il titolo lo segnala; nessun calcolo del danno
  const o = ctx.dati.regole.ar?.ordine_riduzioni;
  const nomi = [...(a.proprieta ?? []).map((p) => String(p.nome ?? p)), ...(a.munizioneRiferimento?.proprieta ?? []).map(String)];
  const pertinente = !!o && o.proprieta.some((x) => nomi.some((n) => n.startsWith(x)));
  return [
    a.rotta ? h('div', { class: 'riquadro attenzione' }, h('p', {}, h('strong', {}, `${a.nome} è Rotta (0 PI): `), 'non può essere utilizzata finché non viene riparata (Armamenti §7.2.1).')) : null,
    testo ? h('p', { class: 'nota promemoria-ar' }, h('strong', {}, 'Armatura del bersaglio: '), testo) : null,
    o ? h('details', { class: 'nota promemoria-ar' },
      h('summary', {}, 'Perforante, Laser, Incendiato: ordine delle riduzioni dell’AR (A.50)', pertinente ? h('strong', {}, ' · vale per quest’arma') : null),
      h('ol', {}, o.passi.map((x) => h('li', {}, x))),
      h('p', {}, h('em', {}, 'Esempio: '), o.esempio),
      h('p', {}, o.incendiato)) : null,
  ];
}

function risultato(ctx, a, r, colpi, imposta) {
  // conferma visibile del colpo (src/ui/avvisi.js): chi spara, con che cosa, munizioni prima e dopo
  const spara = () => {
    ctx.azioni.spara(a.uid, r.munizioni);
    const chi = ctx.scelte?.nome ? `${ctx.scelte.nome}, ` : '';
    const conto = colpi !== null ? ` ${a.granata ? 'Granate' : 'Colpi'}: ${colpi} → ${Math.max(0, colpi - r.munizioni)}.` : ` ${r.munizioni} ${r.munizioni === 1 ? 'munizione' : 'munizioni'}.`;
    avviso(`Colpo effettuato: ${chi}${a.nome}.${conto}`);
  };
  return [
    r.impossibile ? h('div', { class: 'riquadro errore', role: 'alert' },
      h('p', {}, h('strong', {}, 'Attacco non possibile. '), r.impossibile.motivo),
      r.impossibile.proposta ? h('button', { type: 'button', class: 'btn', onclick: () => imposta({ modalita: r.impossibile.proposta.modalita }) }, `Usa ${r.impossibile.proposta.nome}`) : null) : null,
    r.avvisi?.length ? h('div', { class: 'riquadro attenzione' }, r.avvisi.map((x) => h('p', {}, x))) : null,
    h('div', { class: 'attacco-risultato' },
      riquadroDanno([r.danno_per_colpo ? { valore: r.danno_per_colpo, dettagli: [r.colpi_a_segno > 1 || r.applicazioni !== 1 ? 'per colpo' : null, r.applicazioni !== 1 ? `${r.applicazioni} applicazioni` : null,
        r.danno_magistrale && r.danno_magistrale !== r.danno_per_colpo ? `Magistrale ${r.danno_magistrale}` : null] } : null]),
      h('p', { class: 'va-attacco' }, 'VA finale ', pillola(a.nome, r.va_finale, r.provenienza), r.tiri > 1 ? h('span', { class: 'nota' }, ` · ${r.tiri} tiri, ciascuno con questo VA`) : null),
      h('div', { class: 'provenienza-attacco' }, listaProvenienza(r.provenienza, 'VA finale')),
      h('dl', { class: 'voci griglia-voci' },
        h('div', {}, h('dt', {}, 'Azioni'), h('dd', {}, `${r.azioni_principali} ${r.azioni_principali === 1 ? 'Principale' : 'Principali'}${r.azioni_movimento ? ` + ${r.azioni_movimento} di Movimento` : ''}`)),
        h('div', {}, h('dt', {}, 'Munizioni'), h('dd', {}, `${r.munizioni}${colpi !== null ? (a.granata ? ` (granate ${colpi})` : ` (nel caricatore ${colpi})`) : ''}`)),
        h('div', {}, h('dt', {}, 'Colpi a segno'), h('dd', {}, r.colpi_a_segno ? `${r.colpi_a_segno}${r.tiri > 1 ? ' per tiro riuscito' : ' con la Prova riuscita'}` : 'nessuno: effetto ad Area')),
        r.danno_per_colpo ? null : h('div', {}, h('dt', {}, 'Danno per colpo'), h('dd', {}, '—')),
        r.dopo_armatura?.length ? h('div', {}, h('dt', {}, 'Dopo l’Armatura'), h('dd', {}, r.dopo_armatura.map((x) => x.etichetta).join(' · '), h('small', { class: 'nota' }, ' (solo se almeno 1 danno la supera)'))) : null),
      r.attacchi?.length > 1 ? h('ul', { class: 'promemoria-attacco' }, r.attacchi.map((x) => h('li', {}, `${x.etichetta}: VA ${numero(x.va)}${x.danno ? ` · danno ${x.danno} (della propria arma)` : ''}`))) : null,
      r.dopo_armatura?.length ? h('ul', { class: 'promemoria-attacco' }, r.dopo_armatura.map((x) => h('li', {}, x.testo))) : null,
      r.seconda_prova ? h('p', { class: 'nota' }, h('strong', {}, `Seconda Prova se fallisci: VA ${numero(r.seconda_prova.va)}. `), r.seconda_prova.testo) : null,
      r.promemoria.length ? h('ul', { class: 'promemoria-attacco' }, r.promemoria.map((p) => h('li', {}, p))) : null,
      promemoriaAR(ctx, a),
      // Tavolo del Master (pezzo 5): un attaccante esterno sostituisce la riga finale con tiro per colpire ed esito
      ctx.azioni.finale ? ctx.azioni.finale(r) : h('div', { class: 'attacco-azioni' },
        h('button', {
          type: 'button', class: 'btn primario btn-grande', disabled: !!r.impossibile || (colpi !== null && colpi < r.munizioni),
          title: r.impossibile?.motivo ?? null, onclick: spara,
        }, `Spara (−${r.munizioni} ${r.munizioni === 1 ? 'munizione' : 'munizioni'})`),
        h('small', { class: 'nota' }, 'Tira 1d20 al tavolo. «Annulla» nell’intestazione annulla lo sparo; il pannello resta aperto per il prossimo tiro.'))),
      // ritocchi del 07/10: con il PG in uno scontro aperto, il bersaglio fra i nemici e «Applica il danno» (src/ui/attacco-pg.js)
      ctx.azioni.finale ? null : ctx.azioni.controNemico?.(ctx, a, r) ?? null,
  ];
}
