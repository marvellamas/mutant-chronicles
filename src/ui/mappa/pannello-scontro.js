// Mappa di battaglia, lotto 3 (docs/battlemap/piano.md): sezioni «Scontro» e «Token» del pannello laterale della mappa.
//   Scontro: collegamento della scena allo scontro aperto o a una bozza di «Prepara scontro»; elenco dei pezzi senza
//            token (trascinabili sulla mappa, o «Metti» e poi un clic sulla mappa); «Metti tutti».
//   Token:   il token scelto: lato, PV, Stati, ingombro (3 × 3 solo se indicato dal master, A.126), Nascondi / Mostra,
//            Togli dalla mappa, «Carta nella plancia».
import { h } from '../dom.js';
import { dimensioni } from '../../mappa/token.js';

export const TIPO_TRASCINA = 'application/x-mutant-pezzo';

const NOMI_LATO = { pg: 'PG', alleato: 'alleato', avversario: 'avversario' };
const testoIngombro = (ing) => { const [w, h2] = dimensioni(ing); return `${w} × ${h2} Q`; };
const pallino = (lato) => h('span', { class: `mappa-pallino lato-${lato}`, 'aria-hidden': 'true' });

/**
 * @param v { collegamento, candidati: { aperti, bozze }, scontro, bozza, mancante, errori, senzaToken: [pezzo],
 *   daPiazzare: chiave | null }
 * @param a { collega(valore), collegaAperto(id), metti(chiave), mettiTutti() }
 */
export function sezioneScontro(v, a) {
  const c = v.collegamento ?? {};
  const valore = c.scontro ? `s:${c.scontro}` : c.bozza ? `b:${c.bozza}` : '';
  const conosciuti = new Set([...v.candidati.aperti.map((s) => `s:${s.id}`), ...v.candidati.bozze.map((s) => `b:${s.id}`)]);
  const scelta = h('select', { class: 'mappa-collegamento', 'aria-label': 'Scontro collegato', onchange: (e) => a.collega(e.target.value) },
    h('option', { value: '', selected: !valore }, '— nessuno —'),
    v.candidati.aperti.length ? h('optgroup', { label: 'Scontro aperto' }, v.candidati.aperti.map((s) => h('option', { value: `s:${s.id}`, selected: valore === `s:${s.id}` }, `${s.nome} · Round ${s.round}`))) : null,
    v.candidati.bozze.length ? h('optgroup', { label: 'Bozze di «Prepara scontro»' }, v.candidati.bozze.map((s) => h('option', { value: `b:${s.id}`, selected: valore === `b:${s.id}` }, s.nome))) : null,
    valore && !conosciuti.has(valore) ? h('option', { value: valore, selected: true }, `${c.scontro ? 'Scontro' : 'Bozza'} non più disponibile`) : null);
  const aperto = v.candidati.aperti[0] ?? null;
  const avvisi = [];
  if (v.mancante === 'bozza' && aperto) {
    avvisi.push(h('p', { class: 'riquadro attenzione' }, 'La bozza collegata non c’è più (forse è iniziata). ',
      h('button', { type: 'button', class: 'btn btn-piccolo primario', onclick: () => a.collegaAperto(aperto.id) }, `Collega a «${aperto.nome}»`)));
  } else if (v.mancante) {
    avvisi.push(h('p', { class: 'riquadro attenzione' }, `${v.mancante === 'scontro' ? 'Lo scontro collegato è chiuso' : 'La bozza collegata non c’è più'}: i token restano sulla mappa. Scegli un altro collegamento.`));
  }
  if (v.errori.length) avvisi.push(h('p', { class: 'nota' }, `Lettura incompleta (i token non si tolgono finché non torna completa): ${v.errori.join('; ')}.`));
  const fonte = v.bozza ? 'bozza: i token si preparano prima di «Inizia»' : null;
  return h('section', { class: 'mappa-sezione', 'aria-label': 'Scontro' },
    h('h2', {}, 'Scontro'),
    h('label', { class: 'mappa-campo' }, h('span', {}, 'Collegata a'), scelta, fonte ? h('small', { class: 'nota' }, fonte) : null),
    avvisi,
    valore ? [
      h('div', { class: 'mappa-senza-testa' },
        h('h3', {}, `Senza token (${v.senzaToken.length})`),
        v.senzaToken.length ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Tutti in una fila libera vicino al centro della vista', onclick: () => a.mettiTutti() }, 'Metti tutti') : null),
      v.senzaToken.length ? h('ul', { class: 'mappa-senza' }, v.senzaToken.map((p) => h('li', {
        draggable: 'true', class: v.daPiazzare === p.chiave ? 'da-piazzare' : null, title: 'Trascina sulla mappa, oppure «Metti» e poi un clic sulla mappa',
        ondragstart: (e) => { e.dataTransfer.setData(TIPO_TRASCINA, p.chiave); e.dataTransfer.effectAllowed = 'copy'; },
      }, pallino(p.lato), h('span', { class: 'mappa-senza-nome' }, p.nome), h('small', { class: 'nota' }, ` ${testoIngombro(p.ingombro)}`),
      h('button', { type: 'button', class: 'btn btn-piccolo', 'aria-pressed': String(v.daPiazzare === p.chiave), onclick: () => a.metti(p.chiave) }, v.daPiazzare === p.chiave ? 'Clic sulla mappa…' : 'Metti'))))
        : h('p', { class: 'vuoto' }, 'Tutti in mappa.'),
    ] : h('p', { class: 'nota' }, 'Collega la scena a uno scontro o a una bozza per mettere in mappa PG, nemici e veicoli.'));
}

/**
 * @param t token scelto, p il suo pezzo (o null se il pezzo non si legge), a { nascondi(), togli(), ingombro(n), carta() }
 */
export function sezioneToken(t, p, dati, a) {
  if (!t) return h('section', { class: 'mappa-sezione', 'aria-label': 'Token' }, h('h2', {}, 'Token'), h('p', { class: 'nota' }, 'Clic su un token per sceglierlo e aprire la sua mini-scheda; trascinalo per spostarlo.'));
  const creatura = t.rif.tipo !== 'veicolo';
  const dettagli = [
    p ? `${NOMI_LATO[p.lato] ?? p.lato}${p.tipo === 'veicolo' ? ' · veicolo' : ''}` : 'fuori dallo scontro',
    p?.pv ? `PV ${p.pv.attuali}/${p.pv.massimo}${p.aZero ? ' (a terra)' : ''}` : null,
    p?.ferite ? `Ferita ${p.ferite}` : null,
    p?.conducente ? `conducente ${p.conducente}` : null,
    p?.diTurno ? 'di turno' : null,
  ].filter(Boolean);
  return h('section', { class: 'mappa-sezione', 'aria-label': 'Token scelto' },
    h('h2', {}, p ? pallino(p.lato) : null, ' ', p?.nome ?? t.nome ?? t.id),
    h('p', { class: 'nota' }, dettagli.join(' · ')),
    p?.stati?.length ? h('p', { class: 'mappa-stati' }, p.stati.map((s) => h('span', { class: 'etichetta' }, s.nome))) : null,
    creatura ? h('label', { class: 'mappa-campo' }, h('span', {}, 'Ingombro'),
      h('select', { onchange: (e) => a.ingombro(Number(e.target.value)) },
        dati.mappa.token.ingombri_ammessi.map((n) => h('option', { value: String(n), selected: t.ingombro === n }, `${n} × ${n} Q${n === p?.ingombro ? ' (dalla Taglia)' : ''}`))),
      h('small', { class: 'nota' }, 'Il 3 × 3 solo se indicato (A.126).'))
      : h('p', { class: 'nota' }, `Ingombro ${testoIngombro(t.ingombro)} dal profilo del veicolo.`),
    sezioneMovimento(a.mov, a),
    h('div', { class: 'mappa-azioni-token' },
      h('button', { type: 'button', class: 'btn btn-piccolo', title: t.nascosto ? 'I giocatori lo vedranno' : 'Solo il master lo vede', onclick: a.nascondi }, t.nascosto ? 'Mostra' : 'Nascondi'),
      h('button', { type: 'button', class: 'btn btn-piccolo', title: 'La mini-scheda nella plancia intera, con «Torna alla mappa»', onclick: a.carta, disabled: !p }, 'Apri nella plancia'),
      // A.131: immagine del tipo di nemico (tutte le copie, e il bestiario se c'è)
      p?.tipo === 'nemico' ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Immagine del token per tutte le copie di questo nemico e, se c’è, nel bestiario', onclick: a.immagine }, p.ritratto ? 'Cambia immagine…' : 'Immagine…') : null,
      p?.tipo === 'nemico' && p.ritratto ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Torna alle iniziali', onclick: a.togliImmagine }, 'Togli immagine') : null,
      h('button', { type: 'button', class: 'btn btn-piccolo pericolo', title: 'Il pezzo torna fra quelli senza token', onclick: a.togli }, 'Togli dalla mappa')));
}

const q = (n) => `${String(n).replace('.', ',')} Q`;

/**
 * Movimento del token scelto (lotto 5, §8): Passo, Corri e Scatta (l'area raggiungibile in tre colori), quanto ha già
 * usato nel Round, «Annulla ultimo movimento». Regole provvisorie in data/mappa.json → movimento (A.124, A.127–A.129).
 * @param m { movimento: { passo, corsa, scatto }, rimaste, usato, disponibili, fascia, motivo, annullabile, veicolo,
 *   andatura, senzaScontro }: senza scontro aperto il movimento si conta per turno, con «Nuovo turno».
 */
function sezioneMovimento(m, a) {
  if (!m) return null;
  const mov = m.movimento;
  const fasce = [['Passo', 1, mov?.passo], ['Corri', 2, mov?.corsa], ['Scatta', 3, mov?.scatto]];
  return h('div', { class: 'mappa-movimento' },
    h('p', { class: 'nota' }, mov
      ? (m.veicolo
        ? `${q(mov.passo)} all’andatura ${m.andatura ?? '—'}, una volta per Round all’Iniziativa del conducente.`
        : `Passo ${q(mov.passo)}${Number.isFinite(mov.corsa) ? ` · Corsa ${q(mov.corsa)}` : ''}${Number.isFinite(mov.scatto) ? ` · Scatto ${q(mov.scatto)}` : ''}.`)
      : 'Nessun profilo di movimento: si sposta con Libero (o Maiusc).'),
    // Q usati / disponibili con la fascia scelta, nel Round dello scontro o nel turno (senza scontro)
    mov && m.disponibili !== null && m.disponibili !== undefined ? h('p', { class: `mappa-usati${m.usato >= m.disponibili ? ' finito' : ''}` },
      h('strong', {}, `${String(m.usato).replace('.', ',')} / ${q(m.disponibili)}`), ` usati ${m.senzaScontro ? 'nel turno' : 'nel Round'}`) : null,
    m.motivo ? h('p', { class: 'nota motivo-movimento' }, `Area: ${m.motivo}. Con Libero (o Maiusc) il master lo sposta comunque.`) : null,
    m.fascia === 4 ? h('p', { class: 'nota' }, `Libero: in qualunque quadretto, senza area e senza conteggio${m.senzaScontro ? '' : '; nel registro dello scontro resta una riga'}.`) : null,
    h('div', { class: 'mappa-azioni-token', role: 'group', 'aria-label': 'Area raggiungibile' },
      mov && !m.veicolo ? fasce.map(([testo, n, v]) => h('button', {
        type: 'button', class: `btn btn-piccolo fascia-${n}${m.fascia === n ? ' scelto' : ''}`, 'aria-pressed': String(m.fascia === n),
        disabled: !Number.isFinite(v), title: Number.isFinite(v) ? `Area fino ${testo === 'Passo' ? 'al Passo' : testo === 'Corri' ? 'alla Corsa' : 'allo Scatto'}` : 'Non disponibile',
        onclick: () => a.fascia(n),
      }, testo)) : null,
      // quarta modalità (primo test di Marcello, 06/10/2026), per tutti i token: Maiusc ne è la scorciatoia
      h('button', { type: 'button', class: `btn btn-piccolo fascia-4${m.fascia === 4 ? ' scelto' : ''}`, 'aria-pressed': String(m.fascia === 4), title: 'In qualunque quadretto, senza area e senza conteggio (scorciatoia: Maiusc)', onclick: () => a.fascia(4) }, 'Libero')),
    h('div', { class: 'mappa-azioni-token' },
      h('button', { type: 'button', class: 'btn btn-piccolo', disabled: !m.annullabile, onclick: a.annullaMovimento }, 'Annulla ultimo movimento'),
      // senza scontro aperto il Round non avanza: il turno lo fa ripartire il master
      m.senzaScontro && mov ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Il movimento di questo token riparte da 0', onclick: a.nuovoTurno }, 'Nuovo turno') : null,
      m.senzaScontro ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Il movimento di tutti i token riparte da 0', onclick: a.nuovoTurnoTutti }, 'Nuovo turno per tutti') : null));
}
