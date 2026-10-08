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
    h('h2', {}, 'Collegamento e token da mettere'),
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
    // fase 2, lotto 5: girare il mezzo e chi è a bordo (conducente e passeggeri), con «Scendi» e la linea di tiro
    creatura ? null : h('div', { class: 'mappa-azioni-token' },
      h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Gira il veicolo di 90° in senso antiorario (←)', onclick: () => a.ruota(-1) }, '↺ Ruota'),
      h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Gira il veicolo di 90° in senso orario (→)', onclick: () => a.ruota(1) }, 'Ruota ↻')),
    creatura ? null : h('div', { class: 'mappa-a-bordo' },
      h('h3', {}, `A bordo (${a.aBordo.length}${p?.posti ? ` su ${p.posti.conducente + p.posti.passeggeri} posti` : ''})`),
      a.aBordo.length ? h('ul', {}, a.aBordo.map((x) => h('li', {}, h('span', {}, x.nome, x.ruolo === 'conducente' ? h('small', { class: 'nota' }, ' · conducente') : null),
        ' ', h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Scegli un quadretto libero accanto al veicolo', onclick: () => a.scendi(x.id) }, 'Scendi…'),
        ' ', h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Linea di tiro dal veicolo (dal suo quadretto più favorevole)', onclick: () => a.lineaPasseggero(x.id) }, 'Linea di tiro'))))
        : h('p', { class: 'nota' }, 'Nessuno: clic destro su un PG o un nemico accanto al veicolo → «Sali».')),
    sezioneMovimento(a.mov, a),
    h('div', { class: 'mappa-azioni-token' },
      h('button', { type: 'button', class: 'btn btn-piccolo', title: t.nascosto ? 'I giocatori lo vedranno' : 'Solo il master lo vede', onclick: a.nascondi }, t.nascosto ? 'Mostra' : 'Nascondi'),
      // A.131: immagine del tipo di nemico (tutte le copie, e il bestiario se c'è)
      p?.tipo === 'nemico' ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Immagine del token per tutte le copie di questo nemico e, se c’è, nel bestiario', onclick: a.immagine }, p.ritratto ? 'Cambia immagine…' : 'Immagine…') : null,
      p?.tipo === 'nemico' && p.ritratto ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Torna alle iniziali', onclick: a.togliImmagine }, 'Togli immagine') : null,
      p ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Colore del bordo del token (per un nemico: tutte le copie del tipo)', onclick: a.colore }, 'Colore del bordo…') : null,
      h('button', { type: 'button', class: 'btn btn-piccolo pericolo', title: 'Il pezzo torna fra quelli senza token', onclick: a.togli }, 'Togli dalla mappa')));
}

const q = (n) => `${String(n).replace('.', ',')} Q`;

/**
 * Movimento del token scelto (lotto 5, §8): Passo, Corri e Scatta (l'area raggiungibile in tre colori), quanto ha già
 * usato nel Round, «Annulla ultimo movimento». Regole in data/mappa.json → movimento (A.124, A.127–A.129): il Passo si
 * divide, Corsa e Scatto sono un blocco unico (escluse dopo un Passo cominciato; chiusa: il blocco fatto, Q persi).
 * Porte (fase 2, lotto 2; A.125): le AzP usate nel Round accanto ai Q usati (solo conteggio, nulla si blocca) e
 * «Apri porta» / «Chiudi porta» per le porte adiacenti.
 * @param m { movimento: { passo, corsa, scatto }, rimaste, usato, disponibili, fascia, motivo, nota, escluse, chiusa, annullabile, veicolo, azp, porte,
 *   andatura, senzaScontro }: senza scontro aperto il movimento si conta per turno, con «Nuovo turno».
 */
function sezioneMovimento(m, a) {
  if (!m) return null;
  const mov = m.movimento;
  const fasce = [['Passo', 1, mov?.passo, 'passo'], ['Corri', 2, mov?.corsa, 'corsa'], ['Scatta', 3, mov?.scatto, 'scatto']];
  const spenta = (f) => f !== 'passo' && ((m.escluse ?? []).includes(f) || !!m.chiusa);
  return h('div', { class: 'mappa-movimento' },
    h('p', { class: 'nota' }, mov
      ? (m.veicolo
        ? `${q(mov.passo)} all’andatura ${m.andatura ?? '—'}, una volta per Round all’Iniziativa del conducente.`
        : `Passo ${q(mov.passo)}${Number.isFinite(mov.corsa) ? ` · Corsa ${q(mov.corsa)}` : ''}${Number.isFinite(mov.scatto) ? ` · Scatto ${q(mov.scatto)}` : ''}.`)
      : 'Nessun profilo di movimento: si sposta con Libero (o Maiusc).'),
    // Q usati / disponibili con la fascia scelta, nel Round dello scontro o nel turno (senza scontro)
    mov && m.disponibili !== null && m.disponibili !== undefined ? h('p', { class: `mappa-usati${m.usato >= m.disponibili ? ' finito' : ''}` },
      h('strong', {}, `${String(m.usato).replace('.', ',')} / ${q(m.disponibili)}`), ` usati ${m.senzaScontro ? 'nel turno' : 'nel Round'}`,
      m.azp ? h('span', { class: 'azp-usate', title: 'Azioni Principali usate (porte, A.125): si contano, non bloccano' }, ` · ${m.azp} AzP`) : null) : null,
    // A.129: Passo diviso (quanto resta) o blocco di Corsa e Scatto (Q persi)
    m.nota ? h('p', { class: 'nota nota-fasce' }, m.nota) : null,
    m.motivo ? h('p', { class: 'nota motivo-movimento' }, `Area: ${m.motivo}. Con Libero (o Maiusc) il master lo sposta comunque.`) : null,
    m.fascia === 4 ? h('p', { class: 'nota' }, `Libero: in qualunque quadretto, senza area e senza conteggio${m.senzaScontro ? '' : '; nel registro dello scontro resta una riga'}.`) : null,
    // ritocchi del 06/10: l'area non è obbligatoria (anche clic destro e tasto M); il percorso resta
    mov ? h('button', { type: 'button', role: 'switch', 'aria-checked': String(!!m.mostraArea), class: `interruttore-mappa${m.mostraArea ? ' acceso' : ''}`, title: 'Mostra o nasconde l’area di movimento (tasto M); il percorso sotto il puntatore resta', onclick: a.mostraArea },
      h('span', { class: 'interruttore-mappa-pallino', 'aria-hidden': 'true' }), `Mostra area: ${m.mostraArea ? 'sì' : 'no'}`) : null,
    // ZoC (07/10): le zone di controllo degli avversari, interruttore come l'area (tasto Z)
    mov ? h('button', { type: 'button', role: 'switch', 'aria-checked': String(!!m.mostraZoc), class: `interruttore-mappa${m.mostraZoc ? ' acceso' : ''}`, title: 'Zone di controllo degli avversari (tasto Z): uscendone si provoca un Attacco di Opportunità (Giocatore §5.3)', onclick: a.mostraZoc },
      h('span', { class: 'interruttore-mappa-pallino', 'aria-hidden': 'true' }), `Mostra ZoC: ${m.mostraZoc ? 'sì' : 'no'}`) : null,
    h('div', { class: 'mappa-azioni-token', role: 'group', 'aria-label': 'Area raggiungibile' },
      mov && !m.veicolo ? fasce.map(([testo, n, v, f]) => h('button', {
        type: 'button', class: `btn btn-piccolo fascia-${n}${m.fascia === n ? ' scelto' : ''}`, 'aria-pressed': String(m.fascia === n),
        disabled: !Number.isFinite(v) || spenta(f),
        title: !Number.isFinite(v) ? 'Non disponibile'
          : spenta(f) ? (m.chiusa ? 'Movimento del Round finito: Corsa o Scatto già fatti in un blocco' : 'Passo già cominciato: Corsa e Scatto si fanno in un blocco unico, da fermi')
          : f === 'passo' ? 'Area fino al Passo (si divide prima e dopo l’Azione Principale)' : `Area fino ${f === 'corsa' ? 'alla Corsa' : 'allo Scatto'} (un blocco unico: i Q non usati si perdono)`,
        onclick: () => a.fascia(n),
      }, testo)) : null,
      // quarta modalità (primo test di Marcello, 06/10/2026), per tutti i token: Maiusc ne è la scorciatoia
      h('button', { type: 'button', class: `btn btn-piccolo fascia-4${m.fascia === 4 ? ' scelto' : ''}`, 'aria-pressed': String(m.fascia === 4), title: 'In qualunque quadretto, senza area e senza conteggio (scorciatoia: Maiusc)', onclick: () => a.fascia(4) }, 'Libero')),
    m.porte?.length && !m.veicolo ? h('div', { class: 'mappa-azioni-token', role: 'group', 'aria-label': 'Porte vicine' },
      m.porte.map((p) => h('button', { type: 'button', class: 'btn btn-piccolo', title: p.stato === 'bloccata' ? 'Porta bloccata: serve sbloccarla, scassinarla o forzarla' : 'Adiacente, con una mano libera, senza Prova: 1 AzP (A.125)', onclick: () => a.porta(p.id) },
        p.stato === 'aperta' ? 'Chiudi porta' : p.stato === 'bloccata' ? 'Apri porta (bloccata)' : 'Apri porta'))) : null,
    h('div', { class: 'mappa-azioni-token' },
      h('button', { type: 'button', class: 'btn btn-piccolo', disabled: !m.annullabile, onclick: a.annullaMovimento }, 'Annulla ultimo movimento'),
      // fase 2, lotto 3: linea di tiro verso il mouse o un token (distanza, vista, Copertura)
      a.lineaTiro ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Distanza, vista e Copertura verso il mouse o un token (Giocatore §5.8); clic per fissarla', onclick: a.lineaTiro }, 'Linea di tiro (L)') : null,
      // senza scontro aperto il Round non avanza: il turno lo fa ripartire il master
      m.senzaScontro && mov ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Il movimento di questo token riparte da 0', onclick: a.nuovoTurno }, 'Nuovo turno') : null,
      m.senzaScontro ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Il movimento di tutti i token riparte da 0', onclick: a.nuovoTurnoTutti }, 'Nuovo turno per tutti') : null));
}
