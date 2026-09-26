// Scheda digitale a tab (#/p/<id>): Identità, Abilità, Combattimento, Magia (solo con accesso
// agli incantesimi), docs/roadmap-equipaggiamento-e-scheda.md §3. I contenuti vengono da
// preparaTab() — gli stessi dati dei fogli di stampa, senza troncamenti — più la modalità
// tavolo: i valori attuali della sessione (src/sessione.js), che non si ricalcolano.
// Le penalità di Ferite, Affaticamento e Stati sono solo promemoria: i VA mostrati non le
// includono (le regole del cap. 5 sono situazionali).
import { h, segno } from './dom.js';
import { info, infoValore, etichettaMacro, pallini } from './tooltip.js';
import { stemma, iconaPagina } from './immagini.js';
import { classeMacrofamiglia } from '../palette.js';
import { formulaScomposizione } from '../condizioni.js';
import { colore, riempimento, condizioniAttiveAbilita } from '../interfaccia.js';
import { descriviFerite } from '../sessione.js';
import { renderEquipaggiamento } from './equipaggiamento.js';
import { testoDanno } from '../stampa.js';
import { legendaModalita, aggiungiDanno, NOMI_FAMIGLIE_MUNIZIONI, NOMI_STATI, consumabili, normalizzaEquipaggiamento } from '../equipaggiamento.js';

export const POSIZIONI_TAB = [
  { id: 'automatica', etichetta: 'Automatica (sinistra su schermi larghi, in basso su telefono e tablet)' },
  { id: 'sinistra', etichetta: 'Sinistra' },
  { id: 'basso', etichetta: 'In basso' },
  { id: 'alto', etichetta: 'In alto' },
];

const ICONE_TAB = { identita: '👤', abilita: '🎯', combattimento: '⚔', magia: '✦' };

/**
 * Contesto: { dati, tab: risultato di preparaTab, attiva: id della tab, scelte, livelli,
 *   sessione, massimi, penalita, posizione, puoAnnullareSessione, motivoNoSalita, messaggio,
 *   azioni: { vaiTab, sali, annullaLivello, stampa, esporta, modificaCreazione(passo?),
 *     nuovaSessione, annullaSessione, varia(campo, delta), imposta(campo, valore),
 *     commutaStato(id), convertiDistintivi, puntiEsperienza(v), note(v), posizione(v) },
 *   passi: { background, equipaggiamento }, ui }
 */
export function renderTab(ctx) {
  const { tab, attiva, azioni } = ctx;
  const corrente = tab.tab.find((t) => t.id === attiva) ?? tab.tab[0];
  const id = tab.tab[0].dati;
  const livelloMax = ctx.dati.regole.avanzamento.livello_massimo;

  const ritratto = ctx.scelte.ritratto;
  // ingranaggio: il ritratto, sfumato, anche come sfondo dell'intestazione
  const conSfondo = ritratto && ctx.ritrattoIntestazione;
  const barra = h('header', { class: `barra-scheda${conSfondo ? ' con-ritratto' : ''}`, style: conSfondo ? `--ritratto: url("${ritratto}")` : null },
    ritratto ? h('img', { class: 'ritratto-testa', src: ritratto, alt: '' }) : null,
    h('div', { class: 'barra-titolo' },
      // stemma della Corporazione accanto al nome (img/corporazioni/<id>-96; senza file, niente)
      h('h1', { class: 'titolo-con-stemma' }, stemma(id.corporazione, '96', { classe: 'stemma-testa', alt: '', lato: 40 }), id.nome),
      h('p', {}, h('strong', {}, `${id.livello}° livello`), ` · ${id.corporazione} · ${id.addestramento} · ${id.classi.map((c) => `${c.nome} ${c.grado}`).join(', ')}`),
      // riepilogo sempre visibile, in ogni tab: PV e PM attuali con la barra
      h('div', { class: 'riepilogo-risorse' },
        // il bordo dice «che cos'è» (palette: PV rosso, PM blu), la barra «come sta»
        barraRisorsa(ctx, 'PV', ctx.sessione.pvAttuali, ctx.massimi.pv, { classe: 'risorsa-pv' }),
        ctx.massimi.pm ? barraRisorsa(ctx, 'PM', ctx.sessione.pmAttuali, ctx.massimi.pm, { classe: 'risorsa-pm' }) : null)),
    h('div', { class: 'barra-azioni' },
      ctx.puoAnnullareSessione ? h('button', { type: 'button', class: 'btn', onclick: azioni.annullaSessione, title: 'Annulla l’ultima modifica ai valori di sessione' }, '↶ Annulla') : null,
      id.livello < livelloMax
        ? h('button', { type: 'button', class: 'btn primario', disabled: !!ctx.motivoNoSalita, title: ctx.motivoNoSalita, onclick: azioni.sali }, `Sali al livello ${id.livello + 1}`)
        : null,
      menuAzioni(ctx),
      menuImpostazioni(ctx)));

  const nav = h('nav', { class: 'tab-nav', 'aria-label': 'Sezioni della scheda' },
    h('div', { role: 'tablist' }, tab.tab.map((t) => h('button', {
      type: 'button', role: 'tab', id: `tab-${t.id}`, class: `tab-bottone${t.id === corrente.id ? ' attiva' : ''}`,
      'aria-selected': String(t.id === corrente.id), 'aria-controls': 'pannello-tab',
      onclick: () => azioni.vaiTab(t.id),
    }, iconaPagina(t.id, '96', { classe: 'tab-icona-img', lato: 30 }) ?? h('span', { class: 'tab-icona', 'aria-hidden': 'true' }, ICONE_TAB[t.id] ?? '•'),
    h('span', { class: 'tab-etichetta' }, t.titolo)))));

  const contenuti = { identita: tabIdentita, abilita: tabAbilita, combattimento: tabCombattimento, magia: tabMagia };
  // badge della pagina accanto al titolo della tab (solo con l'immagine: senza, il titolo è già nella barra delle tab)
  const badge = iconaPagina(corrente.id, '96', { classe: 'badge-pagina', lato: 48 });
  // filigrana: stemma in grigio nell'angolo di Identità (ingranaggio, predefinito sì)
  const filigrana = corrente.id === 'identita' && ctx.filigrana !== false ? stemma(id.corporazione, '512-grigio', { classe: 'filigrana', alt: '' }) : null;
  const pannello = h('section', { class: `tab-pannello${filigrana ? ' con-filigrana' : ''}`, id: 'pannello-tab', role: 'tabpanel', 'aria-labelledby': `tab-${corrente.id}` },
    filigrana ? h('div', { class: 'filigrana-contenitore', 'aria-hidden': 'true' }, filigrana) : null,
    badge ? h('div', { class: 'titolo-tab' }, badge, h('h2', {}, corrente.titolo)) : null,
    ctx.messaggio ? h('p', { class: `riquadro ${ctx.messaggio.tipo}`, role: 'status' }, ctx.messaggio.testo) : null,
    tab.errori?.length ? h('div', { class: 'riquadro attenzione' },
      h('p', {}, h('strong', {}, 'Scheda non ancora completa:')),
      h('ul', {}, tab.errori.slice(0, 6).map((e) => h('li', {}, e.livello > 1 ? `${e.livello}° livello: ${e.problema}` : e.problema)))) : null,
    contenuti[corrente.id](ctx, corrente.dati));

  return [h('div', { class: `scheda-tab pos-${ctx.posizione} larghezza-${ctx.larghezza ?? 'piena'}` }, barra, nav, pannello)];
}

function menuAzioni(ctx) {
  const { azioni } = ctx;
  const voce = (testo, onclick, opz = {}) => h('button', { type: 'button', class: `btn${opz.pericolo ? ' pericolo' : ''}`, onclick, disabled: !!opz.disabilitato, title: opz.titolo ?? null }, testo);
  return h('details', { class: 'menu-azioni' },
    h('summary', { class: 'btn' }, 'Azioni ▾'),
    h('div', { class: 'menu-voci' },
      voce('Stampa', azioni.stampa),
      voce('SALVA PG (Esporta JSON)', azioni.esporta),
      voce('Modifica creazione', () => azioni.modificaCreazione()),
      ctx.livelli.length ? voce('Annulla l’ultimo livello', azioni.annullaLivello, { pericolo: true }) : null,
      h('hr', {}),
      voce('Nuova sessione', azioni.nuovaSessione, { titolo: 'PV e PM ai massimi, Stati, Ferite e Affaticamento a zero' }),
      voce('Annulla ultima modifica di sessione', azioni.annullaSessione, { disabilitato: !ctx.puoAnnullareSessione }),
      ctx.motivoNoSalita ? h('p', { class: 'nota' }, ctx.motivoNoSalita) : null));
}

function menuImpostazioni(ctx) {
  return h('details', { class: 'menu-azioni impostazioni' },
    h('summary', { class: 'btn icona', 'aria-label': 'Impostazioni', title: 'Impostazioni' }, '⚙'),
    h('div', { class: 'menu-voci' },
      h('fieldset', {},
        h('legend', {}, 'Posizione tab'),
        POSIZIONI_TAB.map((p) => h('label', { class: 'scelta-radio' },
          h('input', { type: 'radio', name: 'posizione-tab', value: p.id, checked: ctx.posizione === p.id, onchange: () => ctx.azioni.posizione(p.id) }),
          ` ${p.etichetta}`))),
      h('fieldset', {},
        h('legend', {}, 'Larghezza'),
        [['compatta', 'Compatta (colonna centrale)'], ['piena', 'Piena (usa gli schermi larghi)']].map(([v, etichetta]) => h('label', { class: 'scelta-radio' },
          h('input', { type: 'radio', name: 'larghezza-scheda', value: v, checked: (ctx.larghezza ?? 'piena') === v, onchange: () => ctx.azioni.larghezza(v) }),
          ` ${etichetta}`))),
      // sfondi di Corporazione: solo quelli con il file in img/sfondi/ (README)
      ctx.sfondi?.length ? h('fieldset', {},
        h('legend', {}, 'Sfondo'),
        [{ id: 'nessuno', nome: 'Nessuno' }, ...ctx.sfondi].map((s) => h('label', { class: 'scelta-radio' },
          h('input', { type: 'radio', name: 'sfondo-scheda', value: s.id, checked: (ctx.sfondo ?? 'nessuno') === s.id, onchange: () => ctx.azioni.sfondo(s.id) }),
          ` ${s.nome}`))) : null,
      h('fieldset', {},
        h('legend', {}, 'Filigrana'),
        h('label', { class: 'scelta-radio' },
          h('input', { type: 'checkbox', checked: ctx.filigrana !== false, onchange: (e) => ctx.azioni.filigrana(e.target.checked) }),
          ' Filigrana Corporazione in Identità')),
      h('fieldset', {},
        h('legend', {}, 'Ritratto'),
        h('label', { class: 'scelta-radio' },
          h('input', { type: 'checkbox', checked: !!ctx.ritrattoIntestazione, disabled: !ctx.scelte.ritratto, onchange: (e) => ctx.azioni.ritrattoIntestazione(e.target.checked) }),
          ' Ritratto come sfondo dell’intestazione'),
        ctx.scelte.ritratto ? null : h('p', { class: 'nota' }, 'Nessun ritratto: si carica nel passo Background.')),
      h('p', { class: 'nota' }, 'Salvate in questo browser.')));
}

// ---------------------------------------------------------------------------
// componenti della modalità tavolo

/** Contatore «attuali / massimi» con pulsanti grandi (≥ 44 px) per il dito. */
/**
 * Barra orizzontale di un valore attuale rispetto al massimo: si accorcia e cambia colore (verde,
 * giallo, rosso; soglie in regole.json → interfaccia.barre_pv_pm). Il numero resta sempre accanto,
 * così si legge anche senza colore.
 */
function barraRisorsa(ctx, etichetta, attuale, massimo, { classe = '' } = {}) {
  const col = colore(attuale, massimo, ctx.dati.regole.interfaccia.barre_pv_pm);
  return h('div', { class: `barra-risorsa ${classe}`.trim() },
    etichetta ? h('span', { class: 'barra-etichetta' }, etichetta) : null,
    h('span', {
      class: 'barra-traccia', role: 'meter', 'aria-label': etichetta || 'riserva',
      'aria-valuemin': 0, 'aria-valuemax': massimo, 'aria-valuenow': attuale,
    }, h('span', { class: `barra-riempimento ${col ?? ''}`.trim(), style: `width: ${riempimento(attuale, massimo)}%` })),
    h('span', { class: 'barra-numero' }, `${attuale} / ${massimo}`));
}

function contatoreTavolo(ctx, { titolo, campo, attuale, massimo, passi = [1, 5], nota = null, barra = false, extra = null, classe = '' }) {
  const b = (delta) => h('button', {
    type: 'button', class: 'btn-tavolo', onclick: () => ctx.azioni.varia(campo, delta),
    disabled: (delta < 0 && attuale <= 0) || (massimo !== null && delta > 0 && attuale >= massimo),
    'aria-label': `${delta > 0 ? 'Aggiungi' : 'Togli'} ${Math.abs(delta)} a ${titolo}`,
  }, delta > 0 ? `+${delta}` : `−${-delta}`);
  const meno = [...passi].reverse().map((p) => b(-p));
  const piu = passi.map((p) => b(p));
  return h('div', { class: `contatore-tavolo ${classe}`.trim() },
    h('h3', {}, titolo),
    h('p', { class: 'valore-tavolo', 'aria-live': 'polite' },
      h('strong', {}, String(attuale)), massimo !== null ? h('span', {}, ` / ${massimo}`) : null),
    barra && massimo ? barraRisorsa(ctx, '', attuale, massimo, { classe: 'grande' }) : null,
    h('div', { class: 'pulsanti-tavolo' }, meno, piu),
    nota ? h('p', { class: 'nota' }, nota) : null,
    extra);
}

/**
 * Riquadro dei Punti Magia: la riserva personale e, sotto, i contenitori di Chroma posseduti
 * (trasportati e sintonizzati per primi, gli altri in grigio). Due sottosezioni distinte: i PM dei
 * cristalli non si sommano mai alla riserva personale (Magia sez. 6).
 */
function riquadroPM(ctx) {
  const s = ctx.sessione;
  const contenitori = [...(ctx.tab.scheda.equipaggiamento?.contenitori ?? [])]
    .sort((x, y) => Number(y.trasportato && y.sintonizzato) - Number(x.trasportato && x.sintonizzato));
  // Magia sez. 6 e Talenti di Meditazione: valori calcolati, le ore non si contano
  const med = ctx.tab.scheda.magia?.meditazione;
  return contatoreTavolo(ctx, {
    titolo: 'Punti Magia', campo: 'pmAttuali', attuale: s.pmAttuali, massimo: ctx.massimi.pm, barra: true, classe: 'riquadro-pm',
    nota: med ? `Recupero PM con Meditazione: ${med.pmPerOra} PM/ora, ${med.orePerGiorno} ${med.orePerGiorno === 1 ? 'ora' : 'ore'}/giorno` : null,
    extra: contenitori.length ? h('div', { class: 'cristalli' },
      h('h4', {}, 'Cristalli e riserve di Chroma'),
      h('p', { class: 'nota' }, 'Riserve separate: non si sommano ai PM personali.'),
      h('ul', { class: 'elenco-cristalli' }, contenitori.map((c) => h('li', {}, rigaCristallo(ctx, c))))) : null,
  });
}

function promemoriaPenalita(ctx, { soloSenzaEffetto = false } = {}) {
  const p = ctx.penalita;
  if (soloSenzaEffetto) {
    const soli = p.stati.filter((s) => !s.effetto);
    return soli.length ? h('div', { class: 'riquadro attenzione promemoria' },
      h('p', {}, h('strong', {}, 'Stati senza effetto numerico, da applicare al tiro: '), soli.map((s) => `${s.nome}: ${s.promemoria}`).join(' '))) : null;
  }
  const parti = [];
  if (ctx.sessione.ferite) parti.push(`Ferite: ${p.ferite.nome}${p.ferite.penalita ? ` ${segno(p.ferite.penalita)} a VA e Prove Salvezza` : ''}`);
  if (p.affaticamento.penalita) parti.push(`Affaticamento: ${p.affaticamento.nome} ${segno(p.affaticamento.penalita)} a tutte le Prove`);
  if (p.stati.length) parti.push(`Stati: ${p.stati.map((s) => s.nome).join(', ')}`);
  if (!parti.length) return null;
  const soloTesto = p.stati.filter((s) => !s.effetto);
  return h('div', { class: 'riquadro attenzione promemoria' },
    h('p', {}, h('strong', {}, 'Condizioni di sessione. '), parti.join(' · '), '.'),
    h('p', { class: 'nota' }, 'I valori della scheda le includono già: ▼ in rosso i malus, ▲ in verde i bonus rispetto al valore da regole; tocca un valore per la scomposizione. La stampa resta a riposo.',
      soloTesto.length ? ` Senza effetto numerico, da applicare al tiro: ${soloTesto.map((s) => `${s.nome}: ${s.promemoria}`).join(' ')}` : null));
}

const FONTI = { regole: 'regole', equipaggiamento: 'equipaggiamento', ferite: 'Ferite (§5.14)', affaticamento: 'Affaticamento (§5.19)', stato: 'Stato (§5.18)' };

/**
 * Valore effettivo della modalità tavolo (regole + equipaggiamento + condizioni). Se differisce dal
 * valore da regole: rosso ▼ (malus) o verde ▲ (bonus); il segno resta leggibile senza colore.
 * Con più di una voce, un tocco o il passaggio del mouse mostra la scomposizione.
 */
function valoreEffettivo(nome, effettivo, daRegole, scomposizione = [], { pillola = false, dettaglio = null } = {}) {
  if (effettivo === null || effettivo === undefined) return '—';
  const diff = daRegole === null || daRegole === undefined ? 0 : effettivo - daRegole;
  const verso = diff < 0 ? 'malus' : diff > 0 ? 'bonus' : '';
  const figli = [numero(effettivo),
    verso ? h('span', { class: 'segno-verso', 'aria-hidden': 'true' }, diff < 0 ? '▼' : '▲') : null,
    verso ? h('span', { class: 'sr' }, ` (${segno(diff)} rispetto al valore da regole ${numero(daRegole)})`) : null];
  // pillola: il VA finale in evidenza, sempre toccabile (anche con la sola voce «da regole»)
  const classe = `val-eff${pillola ? ' pillola-va' : ''} ${verso}`.trim();
  if (scomposizione.length <= 1 && !pillola) return h('span', { class: classe }, figli);
  return infoValore(figli, {
    titolo: `${nome}: ${numero(effettivo)}`,
    sottotitolo: `Valore da regole ${numero(daRegole)}`,
    sezioni: [dettaglio ? { etichetta: 'Da regole', testo: dettaglio } : null, scomposizione.length > 1 ? { testo: formulaScomposizione(nome, scomposizione) } : null].filter(Boolean),
    tabella: {
      titolo: 'Scomposizione', colonne: ['Voce', 'Valore', 'Fonte'],
      righe: scomposizione.map((x, i) => ({ Voce: x.etichetta, Valore: i ? segno(x.valore) : numero(x.valore), Fonte: FONTI[x.fonte] ?? x.fonte })),
    },
  }, { classe });
}

const sezione = (titolo, ...contenuto) => h('section', { class: 'sezione-tab' }, h('h2', {}, titolo), ...contenuto);
const paragrafi = (testo) => String(testo ?? '').split('\n').filter((x) => x.trim()).map((p) => h('p', {}, p));

// ---------------------------------------------------------------------------
// Identità

function tabIdentita(ctx, d) {
  const s = ctx.sessione;
  const m = ctx.massimi;
  const mov = d.movimento;
  const vuoti = d.anagrafica.filter((x) => !x.valore).length;
  return [
    promemoriaPenalita(ctx),
    h('div', { class: 'griglia-tavolo' },
      contatoreTavolo(ctx, { titolo: 'Punti Vita', campo: 'pvAttuali', attuale: s.pvAttuali, massimo: m.pv, barra: true, classe: 'riquadro-pv' }),
      riquadroPM(ctx),
      contatoreTavolo(ctx, { titolo: 'Punti Eroe', campo: 'puntiEroe', attuale: s.puntiEroe, massimo: m.puntiEroe, passi: [1], classe: 'riquadro-pe' }),
      h('div', {},
        contatoreTavolo(ctx, { titolo: 'Distintivi', campo: 'distintivi', attuale: s.distintivi, massimo: null, passi: [1] }),
        h('button', {
          type: 'button', class: 'btn', onclick: ctx.azioni.convertiDistintivi,
          disabled: s.distintivi < m.distintiviPerPuntoEroe || s.puntiEroe >= m.puntiEroe,
          title: '§1.8.3: facoltativo, senza superare la riserva massima',
        }, `Converti ${m.distintiviPerPuntoEroe} Distintivi in 1 Punto Eroe`))),

    sezione('Anagrafica',
      ctx.scelte.ritratto ? h('img', { class: 'ritratto-identita', src: ctx.scelte.ritratto, alt: `Ritratto di ${d.nome}` }) : null,
      // due colonne su desktop e tablet (le righe vanno giù per colonna), una sola su telefono
      h('dl', { class: 'anagrafica anagrafica-colonne', style: `--righe: ${Math.ceil((d.anagrafica.length + 5) / 2)}` },
        h('div', {}, h('dt', {}, 'Corporazione'), h('dd', {}, d.corporazione)),
        h('div', {}, h('dt', {}, 'Addestramento'), h('dd', {}, d.addestramento)),
        h('div', {}, h('dt', {}, 'Classi'), h('dd', {}, d.classi.map((c) => `${c.nome} ${c.grado}`).join(', '))),
        h('div', {}, h('dt', {}, 'Livello'), h('dd', {}, String(d.livello))),
        d.anagrafica.map((x) => h('div', {}, h('dt', {}, x.etichetta), h('dd', { class: x.valore ? null : 'vuoto' }, x.valore || '—'))),
        h('div', {}, h('dt', {}, h('label', { for: 'px' }, 'Punti esperienza')),
          h('dd', {}, h('input', {
            id: 'px', type: 'number', inputmode: 'numeric', step: 'any', class: 'input-px', value: d.puntiEsperienza ?? '',
            onchange: (e) => ctx.azioni.puntiEsperienza(e.target.value === '' || !Number.isFinite(Number(e.target.value)) ? null : Number(e.target.value)),
          })))),
      h('button', { type: 'button', class: 'btn', onclick: () => ctx.azioni.modificaCreazione(ctx.passi.background) },
        vuoti ? `Completa l’anagrafica (${vuoti} campi vuoti)` : 'Modifica anagrafica e Background')),

    h('div', { class: 'griglia-due' },
      sezione('Caratteristiche',
        h('table', { class: 'tabella compatta' },
          h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Valore'), h('th', {}, 'Mod'), h('th', {}, 'Mod Salv.'))),
          h('tbody', {}, d.caratteristiche.map((c) => h('tr', {},
            h('th', { scope: 'row' }, info('caratteristica', c.sigla, `${c.nome} (${c.sigla})`)),
            h('td', { class: 'forte' }, String(c.valore)), h('td', {}, segno(c.mod)), h('td', {}, segno(c.modSalvezza))))))),
      sezione('Prove Salvezza',
        h('table', { class: 'tabella compatta' },
          h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Car.'), h('th', {}, 'Valore'))),
          h('tbody', {}, d.salvezze.map((x) => h('tr', {},
            h('th', { scope: 'row' }, x.nome), h('td', {}, x.caratteristica),
            h('td', { class: 'cella-va', title: x.limitato ? `Limitato a ${x.tetto} (§1.2.3)` : null },
              valoreEffettivo(x.nome, x.effettivo, x.totale, x.scomposizione, { pillola: true }), x.limitato ? '*' : null))))),
        d.salvezze.some((x) => x.effettivo !== x.totale) ? h('p', { class: 'nota' }, 'Con le condizioni della sessione (Ferite, Affaticamento, Stati).') : null)),

    sezione('Combattimento e movimento',
      h('dl', { class: 'voci griglia-voci' },
        h('div', {}, h('dt', {}, 'Iniziativa'), h('dd', {}, `${segno(d.iniziativa)} + ${d.dadoIniziativa}`)),
        h('div', {}, h('dt', {}, 'Movimento'), h('dd', {}, `Passo ${mov.passo} ${mov.unita} · Corsa ${mov.corsa} ${mov.unita} · Scatto ${mov.scatto} ${mov.unita}`,
          ctx.tab.scheda.equipaggiamento?.movimentoQ ? h('small', { class: 'nota' }, ` · armatura MOV ${segno(ctx.tab.scheda.equipaggiamento.movimentoQ)} Q, una volta sul budget della modalità scelta (§7.11.1)`) : null)),
        h('div', {}, h('dt', {}, 'Azioni'), h('dd', {}, `${d.azioni.movimento} di Movimento, ${d.azioni.principali} ${d.azioni.principali === 1 ? 'Principale' : 'Principali'} per Round`)))),

    sezione('Vantaggio dell’Addestramento', h('p', {}, h('strong', {}, `${d.vantaggio.nome}. `), d.vantaggio.testo)),
    sezione('Background', d.background ? h('div', { class: 'testo-lungo' }, paragrafi(d.background)) : h('p', { class: 'vuoto' }, 'Nessun Background scritto.')),

    sezione('Note di sessione',
      h('textarea', {
        class: 'note-sessione', rows: 5, value: ctx.sessione.note, 'aria-label': 'Note di sessione',
        placeholder: 'Appunti della sessione: restano con «Nuova sessione».',
        onfocus: () => ctx.azioni.inizioNote(),
        oninput: (e) => ctx.azioni.note(e.target.value),
      })),

    d.annotazioni.length ? sezione('Note della scheda', h('ul', {}, d.annotazioni.map((a) => h('li', {}, a)))) : null,

    sezione('Progressione',
      h('table', { class: 'tabella compatta' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Livello'), h('th', {}, 'Scelte'))),
        h('tbody', {}, d.progressione.map((r) => h('tr', {},
          h('th', { scope: 'row' }, `${r.livello}°`),
          h('td', {}, r.righe.length ? h('ul', { class: 'righe-livello' }, r.righe.map((x) => h('li', {}, x))) : '—')))))),

    h('details', { class: 'sezione-tab' },
      h('summary', {}, `Controllo della creazione (§2.17): ${d.checklist.filter((v) => v.ok || v.nonApplicabile).length} / ${d.checklist.length}`),
      h('ul', { class: 'checklist' }, d.checklist.map((v) => h('li', { class: v.nonApplicabile ? 'na' : v.ok ? 'ok' : 'ko' },
        h('span', { class: 'spunta', 'aria-hidden': 'true' }, v.nonApplicabile ? '–' : v.ok ? '✓' : '✗'),
        h('span', { class: 'sr' }, v.nonApplicabile ? 'Non applicabile: ' : v.ok ? 'Fatto: ' : 'Da completare: '),
        v.testo)))),
  ];
}

// ---------------------------------------------------------------------------
// Abilità

function tabAbilita(ctx, d) {
  const meta = Math.ceil(d.categorie.length / 2);
  // sul telefono le colonne di dettaglio si nascondono e la formula va sotto il nome (come nel wizard)
  const tabella = (categorie) => h('table', { class: 'tabella compatta abilita-tab' },
    h('thead', {}, h('tr', {}, ['Abilità', 'Mod', 'Base', 'Corp', 'Avanz', 'Equip', 'VA'].map((c, i) => h('th', { class: i && i < 6 ? 'dettaglio' : null }, c)))),
    categorie.map((cat) => h('tbody', {},
      h('tr', { class: 'categoria' }, h('th', { colspan: 7 }, cat.nome)),
      cat.abilita.map((a) => h('tr', { class: a.diClasse ? 'di-classe' : null },
        h('th', { scope: 'row' }, info('abilita', a.nome), h('span', { class: 'sigla' }, ` ${a.caratteristica}`), a.diClasse ? ' •' : null,
          h('small', { class: 'formula' }, `${segno(a.mod)} Mod + ${a.base} Base + ${a.corporazione} Corp + ${a.avanzamento} Avanz${a.equip ? ` ${segno(a.equip)} Equip` : ''}`)),
        h('td', { class: 'dettaglio' }, segno(a.mod)), h('td', { class: 'dettaglio' }, String(a.base)), h('td', { class: 'dettaglio' }, String(a.corporazione)),
        h('td', { class: 'dettaglio' }, String(a.avanzamento)), h('td', { class: 'dettaglio', title: a.equip ? 'Equipaggiamento indossato (§7.11.1)' : null }, a.equip ? segno(a.equip) : '0'),
        h('td', { class: 'cella-va' }, valoreEffettivo(a.nome, a.effettivo, a.totale, a.scomposizione, {
          pillola: true, dettaglio: `${segno(a.mod)} Mod + ${a.base} Base + ${a.corporazione} Corp + ${a.avanzamento} Avanz = ${a.totale}`,
        })))))));
  const condizioni = condizioniAttiveAbilita(ctx.tab.scheda, ctx.dati);
  return [
    condizioni.length ? h('section', { class: 'riquadro condizioni-attive', 'aria-label': 'Condizioni attive' },
      h('h2', {}, 'Condizioni attive'),
      h('ul', {}, condizioni.map((c) => h('li', { class: `condizione ${c.fonte}` },
        h('span', { class: `val-eff ${c.verso}` }, h('span', { class: 'segno-verso', 'aria-hidden': 'true' }, c.verso === 'malus' ? '▼' : '▲'), ' '),
        h('strong', {}, `${c.nome}: `), h('span', { class: `effetto-condizione ${c.verso}` }, c.testo))))) : null,
    promemoriaPenalita(ctx, { soloSenzaEffetto: true }),
    sezione('Abilità',
      h('div', { class: 'abilita-affiancate' }, tabella(d.categorie.slice(0, meta)), tabella(d.categorie.slice(meta))),
      h('p', { class: 'nota' }, `• Abilità di Classe. VA = Mod + Base + Corp + Avanz + Equip (equipaggiamento indossato), più le condizioni della sessione (▼/▲ rispetto al valore da regole). Avanzamento massimo: ${d.limiteAvanzamento ?? '—'}.`)),
    h('div', { class: 'colonne-larghe' },
    sezione('Talenti di Classe', d.talentiClasse.map((t) => h('div', { class: 'talento' },
      h('h3', {}, t.nome, h('span', { class: 'sigla' }, ` · ${t.classe} ${t.grado}${t.scelto ? ', a scelta' : ''}`)),
      paragrafi(t.frase)))),
    d.talentiLiberi.length ? sezione('Talenti Liberi', d.talentiLiberi.map((t) => h('div', { class: 'talento' },
      h('h3', {}, info('talento', t.id, t.nome), t.parametro ? ` (${t.parametro})` : null, t.annotazione ? ` — ${t.annotazione}` : null,
        h('span', { class: 'sigla' }, ` · ${t.livello}° livello`), t.provvisorio ? h('span', { class: 'etichetta' }, 'provvisorio') : null),
      t.provvisorio ? h('p', { class: 'nota' }, 'Talento provvisorio: ricavato dal Manuale della Magia, prerequisiti da definire con il master.') : null,
      paragrafi(t.frase)))) : null),
    d.specializzazioni.length ? sezione('Specializzazioni', h('ul', {}, d.specializzazioni.map((x) => h('li', {},
      info('talento', x.id, x.nome), ` — ${x.abilita}; ${x.effetto} (${x.livello}° livello)`)))) : null,
    d.tecniche.length || d.tecnicheAmmesse ? sezione(`Tecniche Interiori (${d.tecniche.length} / ${d.tecnicheAmmesse})`,
      h('ul', {}, d.tecniche.map((t) => h('li', {}, info('tecnica', t.id, t.nome), ` — costo ${t.costo}; ${t.azione}; durata ${t.durata}`)))) : null,
  ];
}

// ---------------------------------------------------------------------------
// Combattimento

function tabCombattimento(ctx, d) {
  const s = ctx.sessione;
  const m = ctx.massimi;
  const gradini = Array.from({ length: m.ferite + 1 }, (_, n) => ({ n, ...descriviFerite(n, ctx.dati) }));
  return [
    promemoriaPenalita(ctx),
    d.avvisiEquipaggiamento.length ? h('div', { class: 'riquadro attenzione' },
      h('p', {}, h('strong', {}, 'Equipaggiamento da controllare (avvisi, non blocchi: decide il master):')),
      h('ul', {}, d.avvisiEquipaggiamento.map((a) => h('li', {}, a)))) : null,
    h('div', { class: 'griglia-tavolo' },
      contatoreTavolo(ctx, { titolo: 'Punti Vita', campo: 'pvAttuali', attuale: s.pvAttuali, massimo: m.pv, barra: true, classe: 'riquadro-pv' }),
      d.difese ? h('div', { class: 'contatore-tavolo' }, h('h3', {}, 'Difese'),
        h('p', { class: 'valore-tavolo' }, h('span', {}, 'VA '), valoreEffettivo('Difese', d.difese.effettivo, d.difese.totale, d.difese.scomposizione, { pillola: true })),
        h('p', { class: 'nota' }, `(${d.difese.caratteristica}) con l’equipaggiamento e le condizioni della sessione`)) : null),

    sezione('Armi impugnate', d.armiCalcolate.length
      ? h('div', { class: 'armi-tab' }, d.armiCalcolate.map((a) => schedaArma(ctx, a)))
      : h('p', { class: 'vuoto' }, 'Nessuna arma impugnata: cambia lo stato di un’arma in «Impugnata» qui sotto.')),

    sezione('Protezioni', d.protezioniCalcolate.length
      ? h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta' },
        h('thead', {}, h('tr', {}, ['Protezione', 'AR', 'Categoria o taglia', 'Parata', 'Penalità', 'FOR'].map((c) => h('th', {}, c)))),
        h('tbody', {}, d.protezioniCalcolate.flatMap((p) => [
          h('tr', {},
            h('th', { scope: 'row' }, p.nome, p.rinforzo ? h('small', { class: 'sigla' }, ` + ${p.rinforzo.nome}`) : null),
            h('td', { class: 'forte' }, testoAr(p.ar)),
            h('td', { title: p.categoriaBase && p.categoria !== p.categoriaBase ? 'Leggera portata ad AR 3 o più da un rinforzo: penalità della Media (§7.11.2)' : null },
              p.categoria !== p.categoriaBase && p.categoriaBase ? `${p.categoriaBase} → ${p.categoria}` : p.categoria ?? p.taglia ?? '—'),
            h('td', { title: p.parata ? `Difese ${p.parata.difese} + modificatori dello Scudo ${segno(p.parata.modificatori.ravvicinata)} / ${segno(p.parata.modificatori.distanza)} (§7.4.11)` : null },
              p.parata ? [
                valoreEffettivo(`Parata ravvicinata (${p.nome})`, p.parata.ravvicinataEffettiva ?? p.parata.ravvicinata, p.parata.daRegole, p.parata.scomposizioneRavvicinata), ' ravv. · ',
                valoreEffettivo(`Parata a distanza (${p.nome})`, p.parata.distanzaEffettiva ?? p.parata.distanza, p.parata.daRegole, p.parata.scomposizioneDistanza), ' dist.',
              ] : '—'),
            h('td', {}, testoPenalitaTab({ ...p.penalita, movimento_q: (p.penalita?.movimento_q ?? 0) + (p.mov ?? 0) || undefined })),
            h('td', {}, p.forRichiesta ? `${p.forRichiesta}${p.forMancante ? ` (−${p.forMancante} VA${p.tipo === 'scudo' ? ' a Parate e attacchi con lo Scudo' : ''})` : ''}` : '—')),
          ...p.alternative.map((a) => h('tr', { class: 'alternativa' },
            h('td', { colspan: 6 }, h('small', {}, `↳ ${a.condizione}: `,
              [a.ar ? `AR ${testoAr(a.ar)}` : null, a.parata ? `Parata ${numero(a.parata.ravvicinata)} ravv. · ${numero(a.parata.distanza)} dist.` : null,
                a.forRichiesta ? `FOR ${a.forRichiesta}` : null, a.penalita ? `penalità: ${testoPenalitaTab(a.penalita)}` : null].filter(Boolean).join(' · '))))),
          p.proprieta.length ? h('tr', { class: 'alternativa' }, h('td', { colspan: 6 },
            h('span', { class: 'proprieta-arma' }, p.proprieta.map((x) => h('span', { class: 'etichetta', title: x.testo }, x.nome))))) : null,
        ]))))
      : h('p', { class: 'vuoto' }, 'Nessuna protezione indossata o imbracciata.'),
      d.protezioniCalcolate.length ? h('p', { class: 'nota' }, 'Agilità vale per Schivata e Prove fisiche di Atletica e Furtività ostacolate (già nel VA di quelle Abilità, colonna Equip); non per la Parata. La penalità MOV si sottrae una volta al budget di movimento (§7.11.1). La Parata con lo Scudo è già calcolata: Difese con l’equipaggiamento, modificatori propri dello Scudo (§7.4.11) e FOR insufficiente (§7.1.6). L’AR dello Scudo vale anche senza Parata, purché sia imbracciato; due scudi non si sommano (§7.4).') : null),

    // §7.19: applicazioni di kit e dispositivi sanitari, con il contatore delle munizioni
    ...(() => {
      const lista = consumabili(normalizzaEquipaggiamento(ctx.scelte.equipaggiamento), ctx.dati).filter((c) => c.gruppo === 'sanitario');
      return lista.length ? [sezione('Sanitario (§7.19)', h('div', { class: 'armi-tab' }, lista.map((c) => h('article', { class: 'arma-tab' },
        h('h3', {}, c.nome),
        c.effettoBreve ? h('p', { class: 'effetto-breve' }, c.effettoBreve) : null,
        pannelloMunizioni(ctx, { uid: c.uid, nome: c.nome, munizioni: { capacita: c.capacita, unita: c.unita, ricarica: c.ricarica ? `${c.ricarica.applicazioni} ${c.unita} costano ${c.ricarica.costo.toLocaleString('it-IT')}` : null } })))))] : [];
    })(),
    // §7.10: Artefatti, sintonizzazione e riserve di PM
    ...(() => {
      const st = ctx.tab.scheda.equipaggiamento?.sintonizzazione;
      if (!st) return [];
      // i contenitori delle armi stanno accanto all'arma; gli altri nella tab Magia, se c'è, altrimenti qui
      const conMagia = ctx.tab.tab.some((t) => t.id === 'magia');
      const riserve = conMagia ? [] : (ctx.tab.scheda.equipaggiamento?.contenitori ?? []).filter((c) => !['arma_ravvicinata', 'arma_distanza'].includes(c.tipo));
      return [sezione('Artefatti e sintonizzazione (§7.10)',
        h('p', { class: `valore-tavolo${st.usata > st.capacita ? ' oltre' : ''}` }, h('span', {}, 'Sintonizzazione '), h('strong', {}, String(st.usata)), h('span', {}, ` / ${st.capacita}`)),
        h('p', { class: 'nota' }, `Capacità per ${st.gradi} Grad${st.gradi === 1 ? 'o' : 'i'} complessiv${st.gradi === 1 ? 'o' : 'i'}${st.talento ? ` con ${st.talento}` : ''}, prima dell’eventuale riduzione per Umanità (§5.21). Si segna «Sintonizzato» nella lista dell’equipaggiamento.`),
        h('ul', { class: 'elenco-sintonie' }, st.artefatti.map((x) => h('li', {}, `${x.sintonizzato ? '✔' : '○'} ${x.nome} · ${x.potenza}, costo ${x.costo}`))),
        (ctx.tab.scheda.equipaggiamento?.contenitori ?? []).length ? h('p', { class: 'nota' }, `I PM dei cristalli si modificano nel riquadro Punti Magia (tab Identità${conMagia ? ' o Magia' : ''}).`) : null,
        riserve.length ? h('div', { class: 'armi-tab' }, riserve.map((c) => schedaContenitore(ctx, c))) : null)];
    })(),

    sezione('Ferite (§5.14)',
      h('p', { class: 'nota' }, 'Ogni nuova Ferita fa avanzare di un gradino. La penalità è cumulativa a VA e Prove Salvezza.'),
      h('div', { class: 'selettore-livelli', role: 'radiogroup', 'aria-label': 'Ferite' }, gradini.map((g) => h('button', {
        type: 'button', role: 'radio', 'aria-checked': String(s.ferite === g.n), class: `livello-tavolo${s.ferite === g.n ? ' attivo' : ''}${g.n > 0 && s.ferite >= g.n ? ' raggiunto' : ''}`,
        onclick: () => ctx.azioni.imposta('ferite', g.n),
      }, h('strong', {}, g.nome), h('span', {}, g.penalita === null ? '' : g.penalita ? segno(g.penalita) : '0'), g.menomazione ? h('small', {}, g.menomazione) : null)))),

    sezione('Affaticamento (§5.19)',
      h('p', { class: 'nota' }, 'Si applica solo la penalità dello Stato attuale, a tutte le Prove di Caratteristica, Abilità e Salvezza.'),
      h('div', { class: 'selettore-livelli', role: 'radiogroup', 'aria-label': 'Affaticamento' }, d.affaticamento.map((a, n) => h('button', {
        type: 'button', role: 'radio', 'aria-checked': String(s.affaticamento === n), class: `livello-tavolo${s.affaticamento === n ? ' attivo' : ''}`,
        onclick: () => ctx.azioni.imposta('affaticamento', n),
      }, h('strong', {}, a.nome), h('span', {}, a.penalita ? segno(a.penalita) : '0'))))),

    // §5.2.6 e Equipaggiamento §1.6: peso trasportato e soglie; la penalità entra nei valori effettivi
    ...(() => {
      const c = ctx.tab.scheda.carico;
      if (!c) return [];
      const kg = (v) => v.toLocaleString('it-IT', { maximumFractionDigits: 1 });
      const penalita = !!c.livello.effetto;
      const forza = ctx.tab.scheda.caratteristiche.FOR.valore;
      const nomi = c.senzaPeso.length > 10 ? [...c.senzaPeso.slice(0, 10), '…'] : c.senzaPeso;
      return [sezione('Carico (§5.2.6)',
        h('p', { class: `valore-tavolo${penalita ? ' oltre' : ''}` }, h('span', {}, 'Peso trasportato '), h('strong', {}, `${kg(c.peso)} kg`), h('span', {}, ` · ${c.livello.nome}`)),
        h('p', { class: 'nota' }, `Ordinario fino a ${kg(c.soglie.ordinario)} kg, Sovraccarico fino a ${kg(c.soglie.massimo)} kg; spingere o trascinare su terreno piano fino a ${kg(c.soglie.spinta)} kg (FOR ${forza}${c.soglie.talento ? `, soglie raddoppiate da ${c.soglie.talento}` : ''}).`),
        h('p', { class: penalita ? 'avviso-carico' : 'nota' }, c.livello.promemoria, c.livello.movimento_q && c.passo !== null ? ` Passo ${c.passo} Q, prima delle altre penalità.` : ''),
        h('label', { class: 'campo-inline' }, 'Peso aggiuntivo (kg) ',
          h('input', { type: 'number', min: 0, step: 0.5, value: c.pesoExtra, 'aria-label': 'Peso aggiuntivo in kg', onchange: (e) => ctx.azioni.imposta('caricoExtra', Number(e.target.value) || 0) }),
          h('small', { class: 'nota' }, 'bottino, una creatura trasportata con il suo equipaggiamento…')),
        c.senzaPeso.length ? h('p', { class: 'nota' }, `Senza peso, non contati (${c.senzaPeso.length}): ${nomi.join(', ')}. Il catalogo degli Armamenti non riporta i pesi; per un oggetto personalizzato si indica nel campo «Peso».`) : null)];
    })(),

    sezione('Stati attivi (§5.18)',
      h('ul', { class: 'stati-tavolo' }, d.stati.map((st) => {
        const attivo = s.statiAttivi.includes(st.id);
        return h('li', {}, h('label', { class: `stato-tavolo${attivo ? ' attivo' : ''}` },
          h('input', { type: 'checkbox', checked: attivo, onchange: () => ctx.azioni.commutaStato(st.id) }),
          h('span', {}, h('strong', {}, st.nome), h('small', {}, ` · ${st.durata}`), h('br', {}), h('span', { class: 'promemoria-stato' }, st.promemoria, st.riassunto ? h('em', { class: 'riassunto' }, ' (riassunto, non testo del manuale)') : null))));
      }))),

    sezione('Equipaggiamento',
      h('p', { class: 'nota' }, 'Solo gli oggetti impugnati, imbracciati o indossati cambiano i valori. L’inserimento è manuale: le dotazioni iniziali del §2.16 non sono ancora automatiche.'),
      renderEquipaggiamento({
        dati: ctx.dati, voci: ctx.scelte.equipaggiamento, ui: ctx.ui,
        aggiorna: ctx.azioni.equipaggiamento, ridisegna: ctx.azioni.ridisegna,
      })),
  ];
}

function testoPenalitaTab(pen = {}) {
  const parti = [];
  if (pen.attacchi_ravvicinati) parti.push(`attacchi ravvicinati ${segno(pen.attacchi_ravvicinati)}`);
  if (pen.attacchi_distanza) parti.push(`a distanza ${segno(pen.attacchi_distanza)}`);
  if (pen.agilita) parti.push(`Agilità ${segno(pen.agilita)}`);
  if (pen.movimento_q) parti.push(`MOV ${segno(pen.movimento_q)} Q`);
  if (pen.lancio_potere) parti.push(`lancio con Potere ${segno(pen.lancio_potere)}`);
  return parti.join(' · ') || 'nessuna';
}

const testoAr = (ar) => (ar ? `${ar.totale}${ar.magica ? ` (${ar.magica} magica)` : ''}` : '—');

/** Numero con il segno meno tipografico, senza «+» (per i VA). */
const numero = (n) => (n < 0 ? `−${-n}` : String(n));

/** Arma impugnata: VA per colpire con la scomposizione, danno, portata o gittata, Parata, munizioni. */
function schedaArma(ctx, a) {
  const legenda = legendaModalita(ctx.dati);
  const mr = a.munizioneRiferimento;
  // §7.8: il danno dei lanciatori è quello della munizione caricata (qui la munizione di riferimento)
  const dannoTesto = a.dannoDaMunizione
    ? (mr ? aggiungiDanno(mr.danno, a.bonusDanno) : `dalla munizione${a.munizioni?.riferimento ? ` (${a.munizioni.riferimento})` : ''}`)
    : testoDanno(a.danno);
  return h('article', { class: `arma-tab${a.moduloDi ? ' modulo' : ''}` },
    h('h3', {}, a.nome, h('small', { class: 'sigla' }, ` · ${a.abilita ?? 'Abilità non indicata'}`)),
    a.moduloDi ? h('p', { class: 'nota' }, `Modulo integrato di ${a.moduloDi}: si sceglie il profilo prima di ogni attacco; alimentazione separata (§7.8).`) : null,
    h('div', { class: 'arma-valori' },
      h('p', { class: 'valore-tavolo' }, h('span', {}, 'VA '), a.va === null ? h('strong', {}, '—') : valoreEffettivo(`VA per colpire (${a.nome})`, a.vaEffettivo ?? a.va, a.vaDaRegole ?? a.va, a.scomposizione, { pillola: true })),
      h('p', {}, h('span', { class: 'sigla' }, 'Danno '), h('strong', {}, dannoTesto)),
      a.ac !== null && a.ac !== 1 ? h('p', {}, h('span', { class: 'sigla', title: 'Applicazioni di danno per colpo a segno' }, 'AC '), a.ac === 'munizione' ? (mr ? String(mr.ac) : 'dalla munizione') : String(a.ac)) : null,
      mr ? h('p', {}, h('span', { class: 'sigla', title: 'Raggio di scoppio della munizione (§5.10)' }, 'RS '), `${mr.rs_q} Q`) : null,
      a.portataQ ? h('p', {}, h('span', { class: 'sigla' }, 'Portata '), `${a.portataQ} Q`) : null,
      a.gittataQ ? h('p', {}, h('span', { class: 'sigla' }, 'Gittata '), `${a.gittataQ} Q`, a.gittataFormula ? h('small', { class: 'sigla' }, ` (${a.gittataFormula})`) : null) : null,
      a.inc ? h('p', {}, h('span', { class: 'sigla', title: 'Affidabilità (tabella di Inceppamento)' }, 'INC '), String(a.inc)) : null,
      a.parata ? h('p', {}, h('span', { class: 'sigla' }, 'Parata '),
        h('strong', {}, valoreEffettivo(`Parata (${a.nome})`, a.parata.vaEffettivo ?? a.parata.va, a.parata.vaDaRegole ?? a.parata.va, a.parata.scomposizione)),
        a.parata.distanza !== null && a.parata.distanza !== undefined ? h('small', { class: 'sigla', title: 'Parata a distanza con un’arma: −8 VA (Giocatore §5.9)' }, ` · a distanza ${numero(a.parata.distanzaEffettiva ?? a.parata.distanza)}`) : null) : null),
    a.componenti.length ? h('p', { class: 'nota' }, a.componenti.map((c) => `${c.nome} ${segno(c.valore)}`).join(' · '),
      a.bonusDanno ? ` · danno +${a.bonusDanno} (${a.specializzazione})` : null) : null,
    a.modalita.length ? h('p', { class: 'proprieta-arma' }, h('span', { class: 'sigla' }, 'Modalità '),
      a.modalita.map((m) => etichettaModalita(ctx, m, legenda[m]))) : null,
    a.mov ? h('p', { class: 'nota' }, `MOV ${segno(a.mov)} Q mentre è impugnata (§7.7)`) : null,
    a.famigliaMunizioni || a.scorte?.length ? h('p', { class: 'nota' }, h('strong', {}, 'Munizioni: '),
      a.famigliaMunizioni ? `${NOMI_FAMIGLIE_MUNIZIONI[a.famigliaMunizioni]} (§7.20.9)` : null,
      a.scorte?.length ? `${a.famigliaMunizioni ? ' · ' : ''}in lista: ${a.scorte.map((x) => `${x.nome} ×${x.quantita}`).join(', ')}` : null) : null,
    a.accessori?.length ? h('p', { class: 'nota' }, h('strong', {}, 'Accessori: '), a.accessori.map((x) => x.nome).join(', '),
      a.dannoAccessori ? ` · danno ${segno(a.dannoAccessori)}` : null) : null,
    a.mirino ? h('p', { class: 'nota', title: a.mirino.testo }, `${a.mirino.nome}: −${a.mirino.riduzione} alla penalità di distanza (fino a 0), ${a.mirino.distanza_max_q ? `fino a ${a.mirino.distanza_max_q} Q` : 'entro la gittata'}${a.mirino.azp_minime ? `, almeno ${a.mirino.azp_minime} AzP` : ''} (§7.3)`) : null,
    ...(a.condizionali ?? []).map((c) => h('p', { class: 'nota' }, `Con ${c.nome}, ${c.condizione}: VA `, h('strong', {}, numero(c.vaTotale)), ` (${segno(c.va)}, §7.3.2)`)),
    a.attivazione ? h('p', { class: 'nota', title: 'Proprietà a carica: si dichiara prima della Prova per colpire (§7.1.4)' },
      h('strong', {}, 'Attivazione: '), `+${a.attivazione.danno_extra} ${a.attivazione.natura}${a.attivazione.anche ? ` e ${a.attivazione.anche}` : ''} al danno del colpo`,
      a.attivazione.sintonizzazione ? ` · Sintonizzazione ${a.attivazione.sintonizzazione}` : null) : null,
    a.naturaDanno && a.naturaDanno !== 'Naturale' ? h('p', { class: 'nota' }, `Danno ${a.naturaDanno}.`) : null,
    a.manovre.length ? h('p', { class: 'nota' }, h('strong', {}, 'Manovre compatibili: '), a.manovre.join(', ')) : null,
    a.proprieta.length ? h('p', { class: 'proprieta-arma' }, a.proprieta.map((p) => h('span', { class: 'etichetta', title: p.testo }, p.nome))) : null,
    mr ? h('p', { class: 'nota' }, `Con ${mr.nome}: ${mr.proprieta.join('; ')}. Danno, AC e RS sono della munizione, non bonus del lanciatore (§7.8).`) : null,
    // §7.5.1: la riserva di Chroma integrata non è un caricatore: +/− manuali, niente «Ricarica»
    a.contenitore ? pannelloChroma(ctx, (ctx.tab.scheda.equipaggiamento?.contenitori ?? []).find((c) => c.uid === a.uid), { conPulsanti: true })
      : a.tipo === 'arma_distanza' || a.munizioni?.capacita ? pannelloMunizioni(ctx, a) : null);
}

const ETICHETTE_MUNIZIONI = { colpi: 'Caricatore', cariche: 'Cariche nella cella', PM: 'PM nella riserva', applicazioni: 'Applicazioni', dosi: 'Dosi', set: 'Set di materiali' };
const SANITARI = ['applicazioni', 'dosi', 'set'];

/**
 * Modalità tavolo: colpi nel caricatore (dalla capacità del catalogo, «Ricarica» lo riporta al
 * massimo) e riserve (caricatori di scorta, quantità libera).
 */
function pannelloMunizioni(ctx, a) {
  const m = ctx.sessione.munizioni[a.uid] ?? { colpi: 0, riserve: 0 };
  const capacita = a.munizioni?.capacita ?? null;
  const pulsante = (campo, d, etichetta) => h('button', {
    type: 'button', class: 'btn-tavolo', disabled: (d < 0 && m[campo] <= 0) || (campo === 'colpi' && d > 0 && capacita !== null && m.colpi >= capacita),
    'aria-label': `${d > 0 ? 'Aggiungi' : 'Togli'} ${Math.abs(d)} ${etichetta} a ${a.nome}`,
    onclick: () => ctx.azioni.munizioni(a.uid, campo, d),
  }, d > 0 ? `+${d}` : `−${-d}`);
  return h('div', { class: 'munizioni-tavolo' },
    h('div', { class: 'riga-munizioni' },
      h('span', {}, ETICHETTE_MUNIZIONI[a.munizioni?.unita ?? 'colpi'] ?? 'Caricatore', ' ', h('strong', {}, String(m.colpi)), capacita !== null ? ` / ${capacita}` : ''),
      pulsante('colpi', -1, 'colpi'),
      capacita !== null && capacita >= 10 ? pulsante('colpi', -5, 'colpi') : null,
      capacita !== null ? h('button', { type: 'button', class: 'btn', onclick: () => ctx.azioni.ricarica(a.uid), disabled: m.colpi >= capacita }, 'Ricarica') : pulsante('colpi', 1, 'colpi')),
    h('div', { class: 'riga-munizioni' },
      h('span', {}, 'Riserve ', h('strong', {}, String(m.riserve))),
      pulsante('riserve', -1, 'riserve'), pulsante('riserve', 1, 'riserve')),
    h('small', { class: 'nota' }, [
      capacita === null ? 'Nessun caricatore nella scheda dell’arma: contatore libero.' : null,
      a.munizioni?.ricarica ? `Ricarica: ${a.munizioni.ricarica}.` : null,
      a.munizioni?.consumo ? `${a.munizioni.consumo.replace(/^./, (c) => c.toUpperCase())}.` : null,
      a.munizioni?.riferimento ? `Munizione di riferimento: ${a.munizioni.riferimento}.` : null,
      a.munizioni?.unita === 'PM' ? 'Le riserve si contano a mano.'
        : SANITARI.includes(a.munizioni?.unita) ? 'Si consuma all’inizio di ogni tentativo, anche se fallisce. Le ricariche di scorta si contano a mano.'
          : 'Le riserve (caricatori o celle di scorta) si contano a mano: «Ricarica» non le scala.',
    ].filter(Boolean).join(' ')));
}

// ---------------------------------------------------------------------------
// Contenitori di Chroma (Magia sez. 6; Armamenti §7.5, §7.5.1, §7.10)

const AGGETTIVI_MACRO = { Fisica: 'Fisici', Mentale: 'Mentali', Spirituale: 'Spirituali' };

/** Quali Incantesimi può alimentare un contenitore, dal colore (regole.json → chroma.colori). */
function testoAlimenta(c) {
  if (c.regoleRimandate) return `Chroma ${c.energia} (energia ${c.energiaNome ?? '—'}): regole di impiego rimandate (Magia sez. 6).`;
  // §7.5.1: la riserva integrata alimenta le attivazioni; per i lanci si attende Davide (per-davide A.18)
  if (c.integrato) return `Energia ${c.energiaNome}: alimenta le attivazioni dell’oggetto (§7.5.1); se alimenti anche gli Incantesimi è da confermare (per-davide A.18).`;
  if (!c.macrofamiglie.length) return 'Non alimenta Incantesimi.';
  if (c.macrofamiglie.length >= 3) return `Energia ${c.energiaNome}: alimenta Incantesimi di ogni macrofamiglia.`;
  return `Energia ${c.energiaNome}: alimenta Incantesimi ${c.macrofamiglie.map((m) => AGGETTIVI_MACRO[m] ?? m).join(' e ')}.`;
}

/**
 * Riga di un contenitore di Chroma: colore, PM attuali / capacità, barra e +/− manuali. È l'unico
 * controllo che modifica i PM di un cristallo (riquadro Punti Magia e riserva accanto all'arma).
 * A 0 PM il Chroma è Trasparente, con l'alone del colore. I contenitori non trasportati o non
 * sintonizzati sono in grigio.
 */
function rigaCristallo(ctx, c) {
  const pm = ctx.sessione.chroma?.[c.uid]?.pmAttuali ?? 0;
  const esausto = pm === 0;
  const pronto = c.trasportato && c.sintonizzato;
  const pulsante = (d) => h('button', {
    type: 'button', class: 'btn-tavolo', disabled: d < 0 ? pm <= 0 : pm >= c.capacita,
    'aria-label': `${d > 0 ? 'Aggiungi' : 'Togli'} ${Math.abs(d)} PM a ${c.nome}`,
    onclick: () => ctx.azioni.chroma(c.uid, d),
  }, d > 0 ? `+${d}` : `−${-d}`);
  return h('div', { class: `riga-cristallo${pronto ? '' : ' inattivo'}` },
    h('div', { class: 'cristallo-testa' },
      h('span', { class: `chroma-punto chroma-${c.energia.toLowerCase()}${esausto ? ' esausto' : ''}`, 'aria-hidden': 'true' }),
      h('span', { class: 'cristallo-nome' }, c.nome,
        h('small', { class: 'sigla' }, ` · ${esausto ? `Trasparente (alone ${c.energia})` : `Chroma ${c.energia}`}${pronto ? '' : c.sintonizzato ? ' · non trasportato' : ' · non sintonizzato'}`))),
    h('div', { class: 'cristallo-valori' },
      barraRisorsa(ctx, '', pm, c.capacita),
      pulsante(-1), pulsante(1)));
}

/** Riserva di Chroma: la riga del cristallo, con la nota su cosa alimenta e come si ricarica. */
function pannelloChroma(ctx, c, { conPulsanti = true } = {}) {
  if (!c) return null;
  const pm = ctx.sessione.chroma?.[c.uid]?.pmAttuali ?? 0;
  return h('div', { class: 'munizioni-tavolo chroma-tavolo' },
    conPulsanti ? rigaCristallo(ctx, c)
      : h('p', {}, h('span', { class: `chroma-punto chroma-${c.energia.toLowerCase()}${pm === 0 ? ' esausto' : ''}`, 'aria-hidden': 'true' }),
        pm === 0 ? `Trasparente (alone ${c.energia}) ` : `Chroma ${c.energia} `, h('strong', {}, String(pm)), ` / ${c.capacita} PM`),
    h('small', { class: 'nota' }, [
      testoAlimenta(c),
      'Si ricarica solo con Convertire Potere (Magia sez. 6): «Nuova sessione» e il riposo non la riempiono.',
    ].join(' ')));
}

/** Scheda di un contenitore: nome, colore, PM, sintonizzazione, trasporto. */
function schedaContenitore(ctx, c) {
  return h('article', { class: 'arma-tab contenitore-tab' },
    h('h3', {}, c.nome, h('small', { class: 'sigla' }, c.integrato ? ' · riserva integrata nell’oggetto' : ` · ${c.potenza}`)),
    h('p', { class: 'nota' },
      c.sintonizzato ? `✔ Sintonizzato (costo ${c.costo}, §7.10)` : `○ Non sintonizzato (costo ${c.costo}): senza sintonizzazione non alimenta lanci`,
      ' · ', c.trasportato ? 'trasportato' : c.integrato ? `oggetto ${NOMI_STATI[c.stato]?.toLowerCase() ?? 'non trasportato'}` : 'nello zaino'),
    // vista estesa, in sola lettura: i PM si modificano nel riquadro Punti Magia
    pannelloChroma(ctx, c, { conPulsanti: false }));
}

/** Sigla di una modalità di fuoco con il tooltip del §5.10 (regole.json → modalita_di_fuoco). */
function etichettaModalita(ctx, sigla, nomeCatalogo) {
  const m = ctx.dati.regole.modalita_di_fuoco?.[sigla];
  if (!m) return h('span', { class: 'etichetta', title: nomeCatalogo ?? sigla }, sigla);
  const segnoVa = (v) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0');
  return infoValore(sigla, {
    titolo: `${sigla} · ${m.nome}`,
    sottotitolo: `Manuale del Giocatore ${m.paragrafo}`,
    sezioni: [
      { etichetta: 'Regola', testo: m.regola },
      { etichetta: 'Colpi consumati', testo: String(m.colpi_consumati) },
      { etichetta: 'Azioni', testo: `${m.azioni_principali} ${m.azioni_principali === 1 ? 'Azione Principale' : 'Azioni Principali'}` },
      { etichetta: 'VA', testo: segnoVa(m.modificatore_va) },
      { etichetta: 'Colpi a segno', testo: m.colpi_a_segno },
      m.migliorata ? { etichetta: m.migliorata.talento, testo: m.migliorata.modificatore_va !== undefined ? `VA ${segnoVa(m.migliorata.modificatore_va)}` : `consumo ${m.migliorata.colpi_consumati}` } : null,
      m.note ? { etichetta: 'Note', testo: m.note } : null,
    ].filter(Boolean),
  }, { classe: 'etichetta' });
}

// ---------------------------------------------------------------------------
// Magia

function tabMagia(ctx, d) {
  const s = ctx.sessione;
  const contenitori = ctx.tab.scheda.equipaggiamento?.contenitori ?? [];
  const perLancio = ctx.dati.regole.chroma?.contenitori_per_lancio ?? 1;
  return [
    h('div', { class: 'magia-testa' },
    h('div', { class: 'griglia-tavolo' },
      riquadroPM(ctx),
      h('div', { class: 'contatore-tavolo' }, h('h3', {}, 'Incantesimi'),
        h('p', { class: 'valore-tavolo' }, h('strong', {}, String(d.conosciuti)), h('span', {}, ` / ${d.quota}`)),
        h('p', { class: 'nota' }, `Livello massimo di lancio: ${d.livelloMassimo}`),
        // Magia sez. 2 e 3, con i Talenti di magia (regole.json → lancio)
        (() => {
          const mg = ctx.tab.scheda.magia;
          if (!mg) return null;
          return h('p', { class: 'nota' },
            `Focalizzazione ${segno(mg.focalizzazioneVa)} a Potere · Ingaggio ${segno(mg.penalitaIngaggio)} a Potere · Armi da lancio negli Incantesimi ${segno(mg.tiroArmiDaLancio)}`,
            mg.contromagia ? ` · Contromagia ${segno(mg.contromagia.penalita)} VA${mg.contromagia.serveConoscenza ? ', solo Incantesimi conosciuti' : ', anche Incantesimi non conosciuti'}` : null,
            mg.magiaOccultata ? ' · Magia Occultata: per contrastarti serve una Prova di Occultismo' : null);
        })(),
        ctx.tab.scheda.equipaggiamento?.lancioPotere ? h('p', { class: 'nota' }, `Armatura: ${segno(ctx.tab.scheda.equipaggiamento.lancioPotere)} VA alle Prove di Potere per lanciare (§7.11.1)`) : null)),
    sezione(`Prove di Potere (scala ${d.scalaPotere})`,
      h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Livello'), h('th', {}, 'Prova'))),
        h('tbody', {}, d.scala.map((r) => h('tr', {}, h('th', { scope: 'row' }, r.livelli), h('td', {}, r.prova)))))))),
    contenitori.length ? sezione('Riserve esterne',
      h('p', { class: 'nota' }, `Magia sez. 6: il costo di un lancio si paga con i PM personali, con ${perLancio === 1 ? 'un solo contenitore' : `al massimo ${perLancio} contenitori`} trasportato, sintonizzato e compatibile, o con entrambi. Possedere PM in un contenitore non evita lo svenimento a 0 PM personali. I PM dei cristalli si modificano nel riquadro Punti Magia, qui sopra.`),
      h('div', { class: 'armi-tab' }, contenitori.map((c) => schedaContenitore(ctx, c)))) : null,
    d.macrofamiglie.length ? d.macrofamiglie.map((mf) => sezione(mf.nome,
      mf.specializzazioni.map((sp) => h('div', { class: 'incantesimi-griglia' },
        h('h3', { class: 'spec' }, sp.nome),
        sp.incantesimi.map((i) => h('article', { class: `incantesimo-scheda ${classeMacrofamiglia(mf.nome)}` },
          h('h4', {}, info('incantesimo', i.nome), ' ', pallini(i.livelloBase), ' ', etichettaMacro(mf.nome), h('span', { class: 'sigla' }, ` · livello base ${i.livelloBase} · scheda ${i.scheda}`)),
          i.intestazione ? h('p', { class: 'piccolo' }, i.intestazione) : null,
          i.lancio ? h('p', { class: 'piccolo' }, i.lancio) : null,
          i.righe.length ? h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta' },
            h('thead', {}, h('tr', {}, i.colonne.map((c) => h('th', {}, c)))),
            h('tbody', {}, i.righe.map((r) => h('tr', {}, r.map((v) => h('td', {}, v)))))))
            : h('p', { class: 'nota' }, `Tabella non disponibile: Manuale della Magia, scheda ${i.scheda}.`)))))))
      : sezione('Incantesimi', h('p', { class: 'vuoto' }, 'Nessun incantesimo scelto.')),
  ];
}
