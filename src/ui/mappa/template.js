// Template ad area nella vista master (fase 2, lotto 1; §10 della specifica; src/mappa/template.js per le forme):
// il mini-menu (forma, misura in Q, colore, durata in Round o «finché non lo tolgo», nome facoltativo, nascosto ai
// giocatori) e la sezione «Template» della barra (chi è dentro, Round che restano, Sposta, Nascondi, Togli).
// Il posizionamento (anteprima che segue il mouse, rotella per orientare, clic per fissare, Esc) sta in ./pagina.js.
import { h } from '../dom.js';
import { apri } from '../finestrella.js';
import { MISURE_FORMA, ORIENTABILI, roundRimasti } from '../../mappa/template.js';

const NOMI_MISURE = { raggio: 'Raggio', lato: 'Lato', larghezza: 'Larghezza', altezza: 'Altezza', lunghezza: 'Lunghezza' };
const q = (n) => `${String(n).replace('.', ',')} Q`;

/** «Raggio 2 Q», «Cono 6 × 3 Q», «Linea 5 Q», «Quadrato 3 × 3 Q», «Rettangolo 4 × 2 Q». */
export function testoMisure(t, regole) {
  const m = t.misure;
  const nome = regole.nomi_forme[t.forma] ?? t.forma;
  if (t.forma === 'cerchio') return `${nome} ${q(m.raggio)}`;
  if (t.forma === 'quadrato') return `${nome} ${m.lato} × ${q(m.lato)}`;
  if (t.forma === 'rettangolo') return `${nome} ${m.larghezza} × ${q(m.altezza)}`;
  if (t.forma === 'cono') return `${nome} ${m.lunghezza} × ${q(m.larghezza)}`;
  return `${nome} ${q(m.lunghezza)}`;
}

/** Etichetta sulla mappa: il nome (o la forma con la misura) e i Round che restano. */
export function etichettaTemplate(t, regole, round) {
  const r = roundRimasti(t, round);
  return `${t.nome || testoMisure(t, regole)}${r !== null ? ` · ${r} R` : ''}`;
}

/**
 * Mini-menu dei template (via principale, aggiunta di Marcello del 06/10/2026). Restituisce la bozza
 * { forma, misure, colore, nome, durata, nascosto } oppure null.
 * @param bozza l'ultima usata (si riparte da lì)
 */
export function apriMenuTemplate({ regole, bozza }) {
  return apri('menu-template', 'Template ad area', (fine) => {
    const st = { forma: bozza?.forma ?? regole.forme[0], misure: { ...(bozza?.misure ?? regole.misure_proposte[regole.forme[0]][1] ?? regole.misure_proposte[regole.forme[0]][0]) }, colore: bozza?.colore ?? regole.colori[0].valore, nome: bozza?.nome ?? '', durata: bozza?.durata === undefined ? regole.durata_round_predefinita : bozza.durata, nascosto: !!bozza?.nascosto };
    const corpo = h('div', { class: 'menu-template-corpo' });
    const disegna = () => {
      corpo.replaceChildren(...[
        h('div', { class: 'riga-scelte', role: 'group', 'aria-label': 'Forma' }, h('span', { class: 'etichetta' }, 'Forma'),
          regole.forme.map((f) => h('button', { type: 'button', class: `btn btn-piccolo${st.forma === f ? ' scelto' : ''}`, 'aria-pressed': String(st.forma === f), onclick: () => { st.forma = f; st.misure = { ...(regole.misure_proposte[f][1] ?? regole.misure_proposte[f][0]) }; disegna(); } }, regole.nomi_forme[f]))),
        h('div', { class: 'riga-scelte', role: 'group', 'aria-label': 'Misure proposte' }, h('span', { class: 'etichetta' }, 'Misura'),
          regole.misure_proposte[st.forma].map((m) => {
            const scelta = MISURE_FORMA[st.forma].every((k) => st.misure[k] === m[k]);
            return h('button', { type: 'button', class: `btn btn-piccolo${scelta ? ' scelto' : ''}`, 'aria-pressed': String(scelta), onclick: () => { st.misure = { ...m }; disegna(); } }, testoMisure({ forma: st.forma, misure: m }, regole).replace(/^\S+ /, ''));
          })),
        h('div', { class: 'riga-scelte' }, MISURE_FORMA[st.forma].map((k) => h('label', { class: 'campo-misura' }, `${NOMI_MISURE[k]} (Q) `,
          h('input', { type: 'number', min: 1, max: regole.misura_max_q, step: 1, value: String(st.misure[k] ?? 1), onchange: (e) => { st.misure[k] = Math.max(1, Math.min(regole.misura_max_q, Math.round(Number(e.target.value) || 1))); disegna(); } })))),
        ORIENTABILI.includes(st.forma) ? h('p', { class: 'nota' }, 'Parte dal bordo del Q di chi lo lancia (il suo Q non è incluso): con un token scelto si orienta verso il mouse, altrimenti con la rotella.') : null,
        h('div', { class: 'riga-scelte campioni', role: 'group', 'aria-label': 'Colore' }, h('span', { class: 'etichetta' }, 'Colore'),
          regole.colori.map((c) => h('button', { type: 'button', class: `campione${st.colore === c.valore ? ' scelto' : ''}`, 'aria-pressed': String(st.colore === c.valore), title: c.nome, onclick: () => { st.colore = c.valore; disegna(); } },
            h('span', { class: 'campione-colore', style: `background: ${c.valore}`, 'aria-hidden': 'true' }), c.nome))),
        h('div', { class: 'riga-scelte' },
          h('label', { class: 'campo-misura' }, 'Durata (Round) ', h('input', { type: 'number', min: 0, max: 99, step: 1, disabled: st.durata === null, value: st.durata === null ? '' : String(st.durata), onchange: (e) => { st.durata = Math.max(0, Math.round(Number(e.target.value) || 0)); } })),
          h('label', {}, h('input', { type: 'checkbox', checked: st.durata === null, onchange: (e) => { st.durata = e.target.checked ? null : regole.durata_round_predefinita; disegna(); } }), ' finché non lo tolgo')),
        h('p', { class: 'nota' }, 'Con lo scontro aperto la durata scende con i Round: il Round in cui lo piazzi non conta, dura fino alla fine del Round attuale + la durata.'),
        h('label', { class: 'finestrella-campo' }, h('span', {}, 'Nome (facoltativo)'),
          h('input', { type: 'text', maxlength: 40, value: st.nome, list: 'nomi-template', placeholder: 'Esplosione, Fumo…', oninput: (e) => { st.nome = e.target.value.trim(); } }),
          h('datalist', { id: 'nomi-template' }, regole.nomi_proposti.map((n) => h('option', { value: n })))),
        h('label', {}, h('input', { type: 'checkbox', checked: st.nascosto, onchange: (e) => { st.nascosto = e.target.checked; } }), ' Nascosto ai giocatori'),
      ].filter(Boolean)); // replaceChildren scriverebbe «null»
    };
    disegna();
    return [corpo,
      h('div', { class: 'riga-azioni finestrella-azioni' },
        h('button', { type: 'button', class: 'btn', onclick: () => fine(null) }, 'Annulla'),
        h('button', { type: 'button', class: 'btn primario', onclick: () => fine({ ...st, misure: { ...st.misure } }) }, 'Piazza sulla mappa'))];
  });
}

/**
 * Sezione «Template» della barra: un elemento per template con misura, Round che restano, chi è dentro e i comandi.
 * @param voci [{ t, dentro: [nomi] }]
 * @param a { nuovo(), sposta(id), nascondi(id), togli(id), round }
 */
export function sezioneTemplate(voci, regole, a) {
  return [
    h('summary', {}, h('strong', {}, `Template${voci.length ? ` (${voci.length})` : ''}`)),
    h('div', { class: 'mappa-azioni-token' }, h('button', { type: 'button', class: 'btn btn-piccolo primario', title: 'Forma, misura, colore, durata e nome; poi lo piazzi sulla mappa (tasto T)', onclick: a.nuovo }, 'Nuovo template (T)'),
      a.cancellaTemporanei && voci.some(({ t }) => t.durata !== null && t.durata !== undefined) ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Toglie tutti i template a durata in Round (Ctrl+Z li rimette)', onclick: a.cancellaTemporanei }, 'Cancella temporanei') : null),
    voci.length ? h('ul', { class: 'lista-template' }, voci.map(({ t, dentro }) => h('li', {},
      h('span', { class: 'campione-colore', style: `background: ${t.colore}`, 'aria-hidden': 'true' }),
      h('strong', {}, t.nome || testoMisure(t, regole)),
      t.nome ? h('span', { class: 'nota' }, ` ${testoMisure(t, regole)}`) : null,
      h('span', { class: 'nota' }, roundRimasti(t, a.round) !== null ? ` · ancora ${roundRimasti(t, a.round)} Round` : t.durata === null ? ' · finché non lo togli' : ''),
      t.nascosto ? h('span', { class: 'nota' }, ' · nascosto ai giocatori') : null,
      h('div', { class: 'nota' }, dentro.length ? `Dentro: ${dentro.join(', ')}` : 'Nessun token dentro'),
      h('div', { class: 'mappa-azioni-token' },
        h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Lo riprendi: segue il mouse, ← → lo ruotano, ↑ ↓ cambiano la misura; clic per rimetterlo (Esc lo lascia dov’era)', onclick: () => a.sposta(t.id) }, 'Sposta o ruota'),
        h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => a.nascondi(t.id) }, t.nascosto ? 'Mostra ai giocatori' : 'Nascondi ai giocatori'),
        h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => a.togli(t.id) }, 'Togli'))))) : h('p', { class: 'nota' }, 'Nessun template sulla mappa.'),
  ];
}
