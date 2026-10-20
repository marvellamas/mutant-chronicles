// Tabelle di consultazione (19/10/2026, richiesta dal tablet): recupero dei PM (tab Poteri) e dei PV (tab Combattimento),
// in sola lettura, prese dai manuali (regole.json → tabelle_consultazione). Ciascuna sta in un blocco richiudibile e
// chiuso, così non allunga la pagina a chi non la cerca. Nessun controllo: né campi né pulsanti, nessun calcolo che
// cambi un valore della scheda; solo la riga del personaggio è evidenziata, con i valori che già mostra la scheda.
import { h } from './dom.js';

const tabella = (colonne, righe, { evidenzia = () => false, classe = '' } = {}) => h('table', { class: `tabella compatta tabella-consulta ${classe}`.trim() },
  h('thead', {}, h('tr', {}, colonne.map((c) => h('th', { scope: 'col' }, c)))),
  h('tbody', {}, righe.map((riga) => h('tr', { class: evidenzia(riga) ? 'riga-tua' : null },
    riga.celle.map((c, i) => (i === 0 ? h('th', { scope: 'row' }, c) : h('td', {}, c)))))));

const note = (n) => (n?.length ? h('ul', { class: 'nota note-consulta' }, n.map((t) => h('li', {}, t))) : null);

const blocco = (id, titolo, fonte, ...figli) => h('details', { class: 'sezione-tab tabella-consultazione', id: `tabella-${id}` },
  h('summary', {}, h('h2', {}, titolo), h('span', { class: 'sigla' }, ` · ${fonte}`)),
  h('div', { class: 'corpo-consulta' }, ...figli));

/** Recupero dei PM: la tabella del recupero naturale, la Meditazione e, se il personaggio la ha, la sua riga. */
export function tabellaRecuperoPm(ctx) {
  const t = ctx.dati.regole.tabelle_consultazione.recupero_pm;
  const med = ctx.tab.scheda.magia?.meditazione ?? null;
  return blocco('recupero-pm', t.titolo, t.fonte,
    tabella(t.colonne, t.righe.map((r) => ({ celle: [r.fase, r.valore, r.esempi] }))),
    h('h3', {}, t.meditazione.titolo),
    h('p', { class: 'nota' }, t.meditazione.accesso),
    tabella(t.meditazione.colonne, t.meditazione.righe.map((r) => ({ celle: [r.parametro, r.regola] }))),
    med ? h('p', { class: 'nota tua-riga' }, h('strong', {}, 'Per questo personaggio: '), `${med.pmPerOra} PM per ora completa, ${med.orePerGiorno} ${med.orePerGiorno === 1 ? 'ora' : 'ore'} al giorno (valori già calcolati nel riquadro dei Punti Magia).`) : null,
    note(t.meditazione.note),
    note(t.note));
}

/** Recupero dei PV: la tabella per condizione, il Riposo completo per COS (con la riga del personaggio) e i kit in combattimento. */
export function tabellaRecuperoPv(ctx) {
  const t = ctx.dati.regole.tabelle_consultazione.recupero_pv;
  const cos = ctx.tab.scheda.caratteristiche?.COS?.valore ?? null;
  const ic = t.in_combattimento;
  const segnoMod = (m) => (m > 0 ? `+${m}` : String(m).replace('-', '−'));
  return blocco('recupero-pv', t.titolo, t.fonte,
    tabella(t.colonne, t.righe.map((r) => ({ celle: [r.condizione, r.recupero, r.limite] }))),
    h('h3', {}, t.riposo_completo.titolo),
    tabella(t.riposo_completo.colonne, t.riposo_completo.righe.map((r) => ({ cos: r.cos, celle: [String(r.cos), segnoMod(r.mod), String(r.pv)] })),
      { evidenzia: (r) => r.cos === cos, classe: 'tabella-cos' }),
    cos !== null ? h('p', { class: 'nota tua-riga' }, h('strong', {}, 'Per questo personaggio: '), `COS ${cos}${cos >= 1 && cos <= 10 ? `, ${t.riposo_completo.righe[cos - 1].pv} PV con il Riposo completo` : ': la tabella del manuale arriva a COS 10'}.`) : null,
    note(t.note),
    h('h3', {}, ic.titolo),
    h('p', { class: 'nota' }, ic.fonte),
    tabella(ic.colonne, ic.righe.map((r) => ({ celle: [r.kit, r.successo, r.magistrale] }))),
    note(ic.note));
}
