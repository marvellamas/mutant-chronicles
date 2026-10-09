// Scheda digitale a tab (#/p/<id>): otto tab fissi (docs/layout-sd.md: Identità, Abilità, Combattimento,
// Poteri, Artefatti, Cibernetica, Inventario, Veicoli; Poteri contiene la Magia, con accesso
// agli incantesimi), Calendario (solo se attivo dall'ingranaggio: src/ui/calendario.js), docs/roadmap-equipaggiamento-e-scheda.md §3. I contenuti vengono da
// preparaTab() — gli stessi dati dei fogli di stampa, senza troncamenti — più la modalità
// tavolo: i valori attuali della sessione (src/sessione.js), che non si ricalcolano.
// Le penalità di Ferite, Affaticamento e Stati sono solo promemoria: i VA mostrati non le
// includono (le regole del cap. 5 sono situazionali).
import { h, segno } from './dom.js';
import { avviso } from './avvisi.js';
import { normalizzaTemporanei, variaTemporaneo, durataTemporaneo, togliTemporaneo, derivatiDi } from '../temporanei.js';
import { normalizzaCircostanze, aggiungiCircostanza, variaCircostanza, commutaCategoria, notaCircostanza, togliCircostanza, tutteSpuntate, TUTTO } from '../circostanze.js';
import { info, infoValore, etichettaMacro, pallini } from './tooltip.js';
import { stemma, iconaPagina } from './immagini.js';
import { classeMacrofamiglia } from '../palette.js';
import { formulaScomposizione, visioniPersonaggio, abilitaVista } from '../condizioni.js';
import { rigaScelte } from './pannello-passi.js';
import { colore, riempimento, condizioniAttiveAbilita } from '../interfaccia.js';
import { descriviFerite } from '../sessione.js';
import { statoIntegrita } from '../protezione.js';
import { renderEquipaggiamento } from './equipaggiamento.js';
import { testoDanno } from '../stampa.js';
import { assegnaMani, legendaModalita, aggiungiDanno, NOMI_FAMIGLIE_MUNIZIONI, NOMI_STATI, consumabili, normalizzaEquipaggiamento, testoEffettoOggetto, catalogo, risolvi, infoArtefattoVoce, infusiDi, regoleSintonizzazione, rapportoConversione, riserveNec, tempiProtezione, cambioProtezione } from '../equipaggiamento.js';
import { dotazioneApplicata, crediti } from '../dotazioni.js';
import { provenienzaCarico } from '../carico.js';
import { talentiSituazionali } from '../talenti.js';
import { gradiTaumaturgici } from '../incantesimi.js';
import { statoRicarica, disponibili, carichiniDi } from '../ricarica.js';
import { leggiImpostazioni, salvaImpostazioni } from './storage.js';
import { pannelloAttacco } from './attacco.js';
import { pugniPotenziati, profiloSenzArmi, profiloOndaInteriore, senzArmiDisponibile, SENZ_ARMI, ONDA, talentiAttacco, valoriDisciplina } from '../attacco.js';
import { pannelloLancio } from './lancio.js';
import { pulsanteMuovi } from '../round-scontro.js';
import { riquadroIncantesimiInCorso } from './incantesimi-in-corso.js';
import { sezioneRisorseInteriori, pannelloTecnica } from './tecniche.js';
import { tecnicaDi, testoFine } from '../tecniche.js';
import { statoPulsanteLancio, attivazioneInfusa } from '../lancio.js';
import { nomeRiserva, nomeAlimentazione } from '../fonti.js';
import { tabCalendario, pannelloAttivazione, pannelloImportaCalendario, pulsanteImportaCalendario } from './calendario.js';
import { conOrdinale } from '../lingua.js';
import { regoleRiparazione, esitoRiparazione, vaRiparazione, riparabile } from '../riparazione.js';
import { annullaPerdita, togliRecupero, preventivoIntervento, riabilitazione } from '../umanita.js';
import { impiantiAttivabili, cartucceDi, impostaCartucce, somministra, statoProcessore, attivaChip, terminaChip, nuovoIntervalloChip } from '../impianti.js';
import { tabVeicoli, promemoriaConducente } from './veicoli.js';

export const POSIZIONI_TAB = [
  { id: 'alto', etichetta: 'In alto, con Punti Eroe, PV e PM a sinistra (predefinita)' },
  { id: 'automatica', etichetta: 'Automatica (sinistra su schermi larghi, in basso su telefono e tablet)' },
  { id: 'sinistra', etichetta: 'Sinistra' },
  { id: 'basso', etichetta: 'In basso' },
];

// icone provvisorie (un carattere) finché la pagina non ha l'immagine nel manifesto (img/immagini.json)
const ICONE_TAB = { identita: '👤', abilita: '🎯', combattimento: '⚔', magia: '✦', poteri: '✦', artefatti: '🔮', cibernetica: '🦾', inventario: '🎒', veicoli: '🚗', calendario: '📅' };

/**
 * Otto tab fissi, uguali per tutti i personaggi (docs/layout-sd.md): «etichetta» nella riga, «titolo»
 * nel pannello, «icona» = id dell'immagine in img/pagine/ (Poteri usa per ora quella della Magia).
 */
export const TAB_FISSI = [
  { id: 'identita', etichetta: 'Identità' },
  { id: 'abilita', etichetta: 'Abilità' },
  { id: 'combattimento', etichetta: 'Combattimento' },
  { id: 'poteri', etichetta: 'Poteri', titolo: 'Poteri', icona: 'magia' },
  { id: 'artefatti', etichetta: 'Artefatti', titolo: 'Artefatti' },
  { id: 'cibernetica', etichetta: 'Cibernetica', titolo: 'Cibernetica' },
  { id: 'inventario', etichetta: 'Inventario', titolo: 'Inventario' },
  { id: 'veicoli', etichetta: 'Veicoli', titolo: 'Veicoli' },
];

/** Vecchi id dei tab che portano a uno dei fissi (#/p/<id>/t/magia apre Poteri). */
export const ALIAS_TAB = { magia: 'poteri' };

/**
 * Dalle tab di preparaTab (Identità, Abilità, Combattimento, Magia se c'è; Calendario aggiunto da
 * app.js) all'elenco fisso: i dati delle tab esistenti restano quelli; Poteri prende quelli della
 * Magia (null senza magia); i tab nuovi non hanno dati. Il Calendario resta in coda, se attivo.
 */
export function tabFissi(elenco) {
  const perId = new Map(elenco.map((t) => [t.id, t]));
  const fissi = TAB_FISSI.map((f) => {
    const origine = perId.get(f.da ?? f.id);
    return { ...f, titolo: (f.da ? f.titolo : origine?.titolo) ?? f.titolo ?? f.etichetta, dati: origine?.dati ?? null, contatore: origine?.contatore ?? null };
  });
  return [...fissi, ...elenco.filter((t) => t.id === 'calendario').map((t) => ({ ...t, etichetta: t.titolo }))];
}

/**
 * Contesto: { dati, tab: risultato di preparaTab, attiva: id della tab, scelte, livelli,
 *   sessione, massimi, penalita, posizione, puoAnnullareSessione, motivoNoSalita, messaggio,
 *   azioni: { vaiTab, sali, annullaLivello, stampa, esporta, modificaCreazione(passo?),
 *     nuovaSessione, annullaSessione, varia(campo, delta), imposta(campo, valore),
 *     commutaStato(id), convertiDistintivi, puntiEsperienza(v), note(v), posizione(v) },
 *   passi: { background, equipaggiamento }, ui }
 */
/**
 * «Scontro in corso» (08/10, tablet dei giocatori): con il server e il PG in uno scontro aperto, il pulsante per
 * muoverlo sulla mappa, attivo solo al suo turno; fuori turno dice chi è di turno.
 */
function riquadroScontro(ctx) {
  const s = ctx.roundScontro;
  const p = pulsanteMuovi(s);
  if (!p || !ctx.azioni.muoviSullaMappa) return null;
  return h('section', { class: `riquadro scontro-in-corso${s.diTurno ? ' tuo-turno' : ''}`, 'aria-label': 'Scontro in corso' },
    h('p', { class: 'scontro-in-corso-testo' }, h('strong', {}, 'Scontro in corso'), ` · ${s.nome} · Round ${s.round}`,
      h('br'), h('span', { class: p.attivo ? 'tuo-turno-testo' : 'nota' }, p.testo)),
    h('button', { type: 'button', class: 'btn primario btn-muovi-mappa', disabled: !p.attivo,
      title: s.diTurno ? 'Apre la mappa dello scontro con il tuo PG scelto: tocca il quadretto di arrivo, poi «Conferma»' : `Si attiva al tuo turno (ora tocca a ${s.turnoDi ?? '…'})`,
      onclick: () => ctx.azioni.muoviSullaMappa() }, '🗺 Muovi il PG sulla mappa'));
}

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
      // playtest del 05/10/2026: il pulsante Mutant a sinistra del nome (la riga in alto non c'è più)
      h('div', { class: 'riga-titolo' }, h('a', { class: 'marchio marchio-in-linea', href: '#/', title: 'Elenco dei personaggi' }, 'Mutant'),
        h('h1', { class: 'titolo-con-stemma' }, stemma(id.corporazione, '96', { classe: 'stemma-testa', alt: '', lato: 40 }), id.nome)),
      h('p', {}, h('strong', {}, `${id.livello}° livello`), ` · ${id.corporazione} · ${id.addestramento} · ${id.classi.map((c) => `${c.nome} ${c.grado}`).join(', ')}`),
      // riepilogo sempre visibile, in ogni tab: PV e PM attuali con la barra
      h('div', { class: 'riepilogo-risorse' },
        // il bordo dice «che cos'è» (palette: PV rosso, PM blu), la barra «come sta»
        barraRisorsa(ctx, 'PV', ctx.sessione.pvAttuali, ctx.massimi.pv, { classe: 'risorsa-pv' }),
        ctx.massimi.pm ? barraRisorsa(ctx, 'PM', ctx.sessione.pmAttuali, ctx.massimi.pm, { classe: 'risorsa-pm' }) : null)),
    h('div', { class: 'barra-azioni' },
      // aperta dalla plancia del Tavolo del Master (src/ui/ritorno.js)
      ctx.tornaAlTavolo ? h('button', { type: 'button', class: 'btn btn-torna-tavolo', onclick: ctx.tornaAlTavolo, title: 'Torna alla plancia del Tavolo del Master, allo stesso punto' }, '← Torna al tavolo') : null,
      // aperta dalla mappa di battaglia: grande e ben visibile (difetto 2 del 06/10/2026)
      ctx.tornaAllaMappa ? h('button', { type: 'button', class: 'btn primario btn-torna-mappa', onclick: ctx.tornaAllaMappa, title: 'Torna alla mappa: stessa scena, stesso zoom e stessa posizione' }, '← Torna alla mappa') : null,
      // Tavolo del Master, pezzo 6: solo con il server di Mutant
      // verifica del 06/10/2026: «Salvato sul PC del master alle hh:mm» (solo con il server)
      ctx.salvataggioMaster ? h('span', { class: `indicatore-salvataggio ${ctx.salvataggioMaster.stato}`, role: 'status', title: ctx.salvataggioMaster.file ? `File: personaggi/${ctx.salvataggioMaster.file}` : '' }, ctx.salvataggioMaster.testo) : null,
      ctx.collegamento ? h('span', { class: `indicatore-collegamento ${ctx.collegamento.stato}`, role: 'status', title: ctx.collegamento.titolo },
        ctx.collegamento.testo) : null,
      // Round collegato allo scontro (src/round-scontro.js): in ogni tab
      ctx.roundScontro ? h('span', { class: 'etichetta round-scontro-testa', role: 'status', title: `Scontro «${ctx.roundScontro.nome}»: il Round lo fa avanzare il master dalla plancia; le durate di Tecniche e Stati scadono con quel Round.` },
        `Round ${ctx.roundScontro.round} · dallo scontro`) : null,
      ctx.puoAnnullareSessione ? h('button', { type: 'button', class: 'btn', onclick: azioni.annullaSessione, title: 'Annulla l’ultima modifica ai valori di sessione o al calendario' }, '↶ Annulla') : null,
      id.livello < livelloMax
        ? h('button', { type: 'button', class: 'btn primario', disabled: !!ctx.motivoNoSalita, title: ctx.motivoNoSalita, onclick: azioni.sali }, `Sali al livello ${id.livello + 1}`)
        : null,
      menuAzioni(ctx),
      menuImpostazioni(ctx)));

  // riga in alto (predefinita) o colonna: con i tab in alto la colonna di sinistra con Punti Eroe, PV
  // e PM è un elemento a sé (colonna-risorse), visibile in ogni tab (docs/layout-sd.md, pezzo 1)
  const inAlto = ctx.posizione === 'alto';
  const nav = h('nav', { class: 'tab-nav', 'aria-label': 'Sezioni della scheda' },
    h('div', { class: 'colonna-tab' },
      h('div', { role: 'tablist' }, tab.tab.map((t) => h('button', {
        type: 'button', role: 'tab', id: `tab-${t.id}`, class: `tab-bottone${t.id === corrente.id ? ' attiva' : ''}`,
        'aria-selected': String(t.id === corrente.id), 'aria-controls': 'pannello-tab',
        onclick: () => azioni.vaiTab(t.id),
      }, iconaPagina(t.icona ?? t.id, '96', { classe: 'tab-icona-img', lato: 30 }) ?? h('span', { class: 'tab-icona', 'aria-hidden': 'true' }, ICONE_TAB[t.id] ?? '•'),
      h('span', { class: 'tab-etichetta' }, t.etichetta ?? t.titolo, t.contatore ? h('small', { class: 'tab-contatore' }, t.contatore) : null)))),
      // Punti Eroe, PV e PM sotto le tab quando stanno a sinistra (da 900 px: css/style.css);
      // su telefono e tablet con le tab in basso restano nella tab Identità
      inAlto ? null : h('div', { class: 'risorse-laterali', 'aria-label': 'Punti Eroe, Punti Vita e Punti Magia' }, colonnaRisorse(ctx, { ferite: corrente.id === 'identita' }))));
  const lato = inAlto ? h('aside', { class: 'colonna-risorse', 'aria-label': 'Punti Eroe, Punti Vita e Punti Magia' }, colonnaRisorse(ctx, { ferite: corrente.id === 'identita' })) : null;

  const contenuti = {
    identita: tabIdentita, abilita: tabAbilita, combattimento: tabCombattimento, calendario: tabCalendario,
    // Poteri: per ora la tab Magia com'è; senza accesso alla magia «Nessun potere» (docs/layout-sd.md)
    poteri: tabPoteri,
    artefatti: (c) => tabArtefatti(c),
    cibernetica: (c) => tabCibernetica(c),
    inventario: (c) => tabInventario(c),
    veicoli: (c) => tabVeicoli(c),
  };
  // badge della pagina accanto al titolo della tab (solo con l'immagine: senza, il titolo è già nella barra delle tab)
  const badge = iconaPagina(corrente.icona ?? corrente.id, '96', { classe: 'badge-pagina', lato: 48 });
  // filigrana: stemma in grigio nell'angolo di Identità (ingranaggio, predefinito sì)
  const filigrana = corrente.id === 'identita' && ctx.filigrana !== false ? stemma(id.corporazione, '512-grigio', { classe: 'filigrana', alt: '' }) : null;
  const pannello = h('section', { class: `tab-pannello${filigrana ? ' con-filigrana' : ''}`, id: 'pannello-tab', role: 'tabpanel', 'aria-labelledby': `tab-${corrente.id}` },
    filigrana ? h('div', { class: 'filigrana-contenitore', 'aria-hidden': 'true' }, filigrana) : null,
    badge ? h('div', { class: 'titolo-tab' }, badge, h('h2', {}, corrente.titolo)) : null,
    ctx.messaggio ? h('p', { class: `riquadro ${ctx.messaggio.tipo}`, role: 'status' }, ctx.messaggio.testo) : null,
    avvisoMaster(ctx.avvisoMaster),
    riquadroScontro(ctx),
    // punti liberi in eccesso: nella tab Abilità l'avviso sta sopra la tabella, con le Abilità segnate
    avvisoRegoleAggiornate(ctx, tab.scheda, { eccesso: corrente.id !== 'abilita' }),
    tab.errori?.length ? h('div', { class: 'riquadro attenzione' },
      h('p', {}, h('strong', {}, 'Scheda non ancora completa:')),
      h('ul', {}, tab.errori.slice(0, 6).map((e) => h('li', {}, e.livello > 1 ? `${e.livello}° livello: ${e.problema}` : e.problema)))) : null,
    contenuti[corrente.id](ctx, corrente.dati));

  // pannello «Attacca!» dell'arma scelta (src/ui/attacco.js), sopra la scheda
  // «Senz'armi»: profilo costruito qui (Corpo a corpo e danno dichiarato, src/attacco.js)
  // Onda Interiore (§8.9.4): profilo d'attacco finché la Tecnica è in corso
  const armaAttacco = !ctx.ui?.attacco ? null : ctx.ui.attacco.uid === SENZ_ARMI ? senzArmi(ctx)
    : ctx.ui.attacco.uid === ONDA ? profiloOndaInteriore(tab.scheda, ctx.sessione, ctx.dati)
      : (tab.scheda.equipaggiamento?.armi ?? []).find((a) => a.uid === ctx.ui.attacco.uid);
  if (ctx.ui?.attacco && !armaAttacco) ctx.ui.attacco = null;
  // pannello «Lancia!» dell'incantesimo scelto (src/ui/lancio.js)
  const incLancio = ctx.ui?.lancio ? (ctx.dati.incantesimi.incantesimi.find((i) => i.nome === ctx.ui.lancio.nome) ?? null) : null;
  if (ctx.ui?.lancio && !incLancio) ctx.ui.lancio = null;
  // pannello «Attiva» della Tecnica Interiore scelta (src/ui/tecniche.js)
  const tecAttiva = ctx.ui?.tecnica ? tecnicaDi(ctx.ui.tecnica.id, ctx.dati) : null;
  if (ctx.ui?.tecnica && !tecAttiva) ctx.ui.tecnica = null;
  return [h('div', { class: `scheda-tab pos-${ctx.posizione} larghezza-${ctx.larghezza ?? 'piena'}` }, barra, nav, lato, pannello),
    armaAttacco ? pannelloAttacco(ctx, armaAttacco) : null,
    incLancio ? (() => {
      // un errore nel pannello non deve lasciare il clic senza risposta: si mostra il motivo
      try { return pannelloLancio(ctx, incLancio); } catch (e) {
        console.error(e);
        return h('div', { class: 'riquadro errore', role: 'alert' },
          h('p', {}, h('strong', {}, `«Lancia!» non si è aperto per ${incLancio.nome}. `), 'Segnala il problema con questo testo: ', h('code', {}, String(e?.message ?? e))),
          h('button', { type: 'button', class: 'btn', onclick: () => { ctx.ui.lancio = null; ctx.azioni.ridisegna(); } }, 'Chiudi'));
      }
    })() : null,
    tecAttiva ? pannelloTecnica(ctx, tecAttiva) : null,
    ctx.ui?.attivaCalendario ? pannelloAttivazione(ctx) : null,
    ctx.ui?.importaCalendario ? pannelloImportaCalendario(ctx) : null];
}

/**
 * Regole aggiornate (per-davide A.52; Giocatore del 29/09, §8.3): Punti Abilità da completare o da
 * riassegnare (punti che non aumentano più il VA personale) negli eventi passati, con «Assegna» (un
 * evento alla volta, dal più vecchio), e punti in eccesso, soltanto segnalati.
 */
function avvisoRegoleAggiornate(ctx, scheda, { eccesso = true } = {}) {
  const da = scheda?.completamenti ?? [];
  const ecc = eccesso ? scheda?.avvisoPunti ?? null : null;
  if (!da.length && !ecc) return null;
  const n = da.reduce((s, c) => s + c.mancanti, 0);
  const r = da.reduce((s, c) => s + Object.values(c.inattivi ?? {}).reduce((t, v) => t + v, 0), 0);
  const dove = (c, k) => `${k} ${c.livello === 1 ? 'della creazione' : `${conOrdinale('del', c.livello)} livello`}`;
  const assegna = da.length ? h('div', { class: 'riquadro attenzione avviso-regole', role: 'status' },
    // testo di regole.json → regole_aggiornate.mancanti (A.90, 7 punti per Grado dal 04/10/2026)
    h('p', {}, h('strong', {}, ctx.avvisoMancanti ? ctx.avvisoMancanti.replaceAll('{n}', String(n)) : `${ctx.avvisoRegole}: hai ${n} Punti Abilità da assegnare`),
      ` (${da.map((c) => dove(c, c.mancanti)).join(', ')}). `,
      r ? `${r === n ? 'Sono' : `${r} sono`} punti già spesi che non aumentano più il VA personale (limiti delle categorie di competenza, §8.3): si riassegnano, gli altri restano. ` : null,
      h('button', { type: 'button', class: 'btn primario', onclick: ctx.azioni.completaPunti }, 'Assegna'))) : null;
  // i due avvisi sono indipendenti: riquadri separati, quello dell'eccesso per primo (si toglie prima)
  return h('div', { class: 'avvisi-regole' }, ecc ? avvisoPuntiEccesso(ctx, ecc) : null, assegna);
}

/**
 * Punti Abilità Liberi in eccesso (correzione di Davide del 03/10/2026, E&L: 5 per Grado anziché 10): testo
 * di regole.json → regole_aggiornate.eccesso, gli eventi con le Abilità che hanno ricevuto punti liberi e
 * «Togli». La scheda resta utilizzabile: finché non si tolgono, i punti contano nei VA.
 */
function avvisoPuntiEccesso(ctx, a) {
  return h('div', { class: 'riquadro errore avviso-eccesso', role: 'alert' },
    h('p', {}, h('strong', {}, a.testo), ' ',
      ctx.azioni.togliPunti ? h('button', { type: 'button', class: 'btn primario', onclick: () => ctx.azioni.togliPunti() }, 'Togli') : null),
    h('ul', {}, a.eventi.map((e) => h('li', {}, e.testo, ' ',
      ctx.azioni.togliPunti && a.eventi.length > 1 ? h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => ctx.azioni.togliPunti(e.livello) }, 'Togli da qui') : null))),
    h('p', { class: 'nota' }, 'Scegli tu da quali Abilità togliere: i punti si eliminano, non si riassegnano. Finché non li togli contano ancora nei VA della scheda, ma non puoi salire di livello (A.108).'));
}

/** Punti liberi degli eventi in eccesso ricevuti da un'Abilità: «creazione 2, 4° livello 1», o null. */
function liberiInEccesso(avviso, nome) {
  const voci = (avviso?.eventi ?? []).filter((e) => e.abilita?.[nome]).map((e) => `${e.livello === 1 ? 'creazione' : `${e.livello}° livello`} ${e.abilita[nome]}`);
  return voci.length ? voci.join(', ') : null;
}

function menuAzioni(ctx) {
  const { azioni } = ctx;
  const voce = (testo, onclick, opz = {}) => h('button', { type: 'button', class: `btn${opz.pericolo ? ' pericolo' : ''}`, onclick, disabled: !!opz.disabilitato, title: opz.titolo ?? null }, testo);
  return h('details', { class: 'menu-azioni' },
    h('summary', { class: 'btn' }, 'Azioni ▾'),
    h('div', { class: 'menu-voci' },
      voce('Stampa', azioni.stampa),
      voce('SALVA PG (Esporta JSON)', azioni.esporta),
      // il solo calendario: anche su un personaggio senza calendario (lo crea e attiva la sezione)
      pulsanteImportaCalendario(ctx),
      voce('Modifica creazione', () => azioni.modificaCreazione()),
      ctx.livelli.length ? voce('Annulla l’ultimo livello', azioni.annullaLivello, { pericolo: true }) : null,
      h('hr', {}),
      voce('Nuova sessione', azioni.nuovaSessione, { titolo: 'PV e PM ai massimi, Stati, Ferite e Affaticamento a zero' }),
      voce('Annulla ultima modifica', azioni.annullaSessione, { disabilitato: !ctx.puoAnnullareSessione, titolo: 'Valori di sessione o calendario' }),
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
      h('p', { class: 'nota' }, 'Salvate in questo browser.'),
      // sezione facoltativa: si salva nel personaggio (e nel file esportato), non nel browser
      h('fieldset', {},
        h('legend', {}, 'Calendario'),
        [[true, 'Attivo'], [false, 'Non attivo']].map(([v, etichetta]) => h('label', { class: 'scelta-radio' },
          h('input', { type: 'radio', name: 'calendario-attivo', checked: !!ctx.calendario?.attivo === v, onchange: () => ctx.azioni.calendarioAttivo(v) }),
          ` ${etichetta}`)),
        h('p', { class: 'nota' }, 'Salvato nel personaggio. Spento, le note restano.'))));
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
 * Riquadri dei Punti Vita e dei Punti Magia con barra, bordo colorato e +/−. Compatti nella colonna
 * di sinistra (senza l'elenco dei cristalli, che resta nella tab Magia).
 */
/** Colonna di sinistra, uguale in ogni tab: Punti Eroe sopra i PV, poi PV e PM (docs/layout-sd.md). */
function colonnaRisorse(ctx, { ferite = false } = {}) {
  const s = ctx.sessione;
  const m = ctx.massimi;
  return [
    contatoreTavolo(ctx, { titolo: 'Punti Eroe', campo: 'puntiEroe', attuale: s.puntiEroe, massimo: m.puntiEroe, passi: [1], classe: 'riquadro-pe compatto' }),
    ...riquadriPvPm(ctx, { compatti: true, ferite }),
  ];
}

/** PV e PM; con `ferite` (tab Identità, playtest del 05/10/2026) il riquadro delle Ferite subito sotto i PV. */
function riquadriPvPm(ctx, { compatti = false, ferite = false } = {}) {
  const s = ctx.sessione;
  const m = ctx.massimi;
  const classe = compatti ? ' compatto' : '';
  return [
    contatoreTavolo(ctx, { titolo: 'Punti Vita', campo: 'pvAttuali', attuale: s.pvAttuali, massimo: m.pv, barra: true, classe: `riquadro-pv${classe}`, extra: pilloleAR(ctx) }),
    ferite ? h('div', { class: 'ferite-sotto-pv' }, riquadroFerite(ctx)) : null,
    compatti
      ? (m.pm ? contatoreTavolo(ctx, { titolo: 'Punti Magia', campo: 'pmAttuali', attuale: s.pmAttuali, massimo: m.pm, barra: true, classe: `riquadro-pm${classe}` }) : null)
      : riquadroPM(ctx),
  ];
}

/**
 * AR del personaggio accanto ai PV (docs/ricognizione-ar-pi.md): una pillola per valore (AR contro
 * danno Naturale e Magico, la più grande; contro Etereo; contro esplosioni se c'è Antiesplosione),
 * con la provenienza nel tooltip. Valori al tavolo: condizioni accese, oggetti Rotti esclusi.
 */
function pilloleAR(ctx) {
  const eq = ctx.tab.scheda.equipaggiamento;
  const ar = eq?.arEffettiva ?? eq?.ar;
  if (!ar) return null;
  const R = ctx.dati.regole.ar ?? {};
  const sottotitoli = {
    totale: 'Contro danno Naturale e Magico (§5.13, §5.24)',
    magica: 'Contro danno Etereo vale solo la parte magica (§5.24)',
  };
  // A.48: Tecniche Interiori che danno AR finché sono attive: si accendono con «Attiva» (tab Poteri,
  // §8.9.1) e qui si leggono soltanto, con il Round in cui scadono
  const attive = new Map((ctx.sessione?.tecnicheAttive ?? []).map((x) => [x.id, x]));
  const tecniche = (R.tecniche ?? []).filter((t) => attive.has(t.tecnica));
  return [
    h('div', { class: 'pillole-ar', role: 'group', 'aria-label': 'Armatura' },
      ar.valori.map((v) => infoValore([h('span', { class: 'etichetta-ar' }, v.etichetta), h('strong', {}, String(v.valore))], {
        titolo: `${v.etichetta === 'AR' ? 'AR' : `AR ${v.etichetta}`}: ${v.valore}`,
        sottotitolo: sottotitoli[v.id] ?? `Contro ${v.id.replace(/^contro:/, '')}: l’AR totale più la protezione specifica (§7.11.4, §7.4.3)`,
        provenienza: v.provenienza,
        sezioni: v.id === 'totale' && R.promemoria_cumulo_magia ? [{ testo: R.promemoria_cumulo_magia }] : [],
      }, { classe: `pillola-ar${v.principale ? ' principale' : ''}` }))),
    tecniche.length ? h('div', { class: 'pillole-condizionali tecniche-ar' }, tecniche.map((t) => {
      const tec = tecnicaDi(t.tecnica, ctx.dati);
      const nome = tec?.nome ?? t.tecnica;
      const effetto = `+${t.totale} AR${t.magica ? ' magica' : ' non magica'}${t.contro ? ` contro ${t.contro}` : ''}`;
      const fine = tec ? testoFine(tec, attive.get(t.tecnica)) : '';
      return h('span', { class: 'pillola-condizionale attivo', title: `${nome}: ${effetto}, ${fine}; si somma alle altre protezioni (A.48). Si attiva nella tab Poteri.` },
        h('span', { class: 'nome-condizionale' }, nome), h('span', { class: 'effetto-condizionale' }, ` · ${effetto} · ${fine}`));
    })) : null,
  ];
}

/**
 * Punti Integrità degli oggetti (Armamenti §7.2.1), riquadro comprimibile della modalità tavolo:
 * chiuso per impostazione predefinita, con «N oggetti · M danneggiati» nell'intestazione; lo stato
 * aperto/chiuso si ricorda nel browser (impostazioni → integritaAperta). Una riga compatta per
 * oggetto: nome, «PI n/max», − e + piccoli, «Ripara» (A.46), PS Integrità della Qualità. I danneggiati
 * in cima; gli esemplari identici integri in una riga sola con la quantità e «Danneggia uno» (A.47),
 * anche quando sono voci distinte dell'inventario (dotazione e acquisto). A 0 PI: «Rotto» e «Ripara»
 * in evidenza. Solo presentazione: dati e calcoli restano quelli di src/protezione.js.
 */
function sezioneIntegrita(ctx) {
  const lista = ctx.tab.scheda.equipaggiamento?.integrita ?? [];
  if (!lista.length) return null;
  const pi = ctx.sessione.integrita ?? {};
  const rip = regoleRiparazione(ctx.dati);
  const attuali = (x) => pi[x.uid] ?? x.piMax;
  // A.47: esemplari identici integri (stesso oggetto, stessi PI e PS) in una riga; i danneggiati a parte
  const righe = [];
  const gruppi = new Map();
  for (const x of lista) {
    const integro = x.gruppo || attuali(x) >= x.piMax;
    if (!integro) { righe.push({ x, n: attuali(x) }); continue; }
    const k = [x.nome, x.tipo, x.piMax, x.ps, x.qualita].join('|');
    const g = gruppi.get(k);
    if (g) { g.quantita += x.gruppo ?? 1; g.voci.push(x); } else {
      const nuovo = { x, n: x.piMax, quantita: x.gruppo ?? 1, voci: [x] };
      gruppi.set(k, nuovo);
      righe.push(nuovo);
    }
  }
  // danneggiati in cima (i Rotti per primi), poi gli integri nell'ordine dell'inventario
  const danno = (r) => (r.n < r.x.piMax ? r.n / r.x.piMax : 2);
  righe.sort((a, b) => danno(a) - danno(b));
  const oggetti = righe.reduce((s, r) => s + (r.quantita ?? 1), 0);
  const danneggiati = righe.filter((r) => r.n < r.x.piMax).length;
  const aperta = leggiImpostazioni().integritaAperta === true;
  const riga = ({ x, n, quantita = 1, voci = [x] }) => {
    const c = controlliPi(ctx, { x, n, quantita, voci });
    return h('tr', { class: c.classe },
      h('th', { scope: 'row' }, c.nome, c.etichetta),
      h('td', { class: 'forte pi-valore' }, c.valore),
      h('td', { class: 'pi-comandi' }, c.comandi),
      h('td', { class: 'pi-ps' }, c.ps));
  };
  // il pannello della riparazione aperto dalla riga dell'Inventario sta nella riga, non qui
  const dalRiquadro = ctx.ui.riparazione && ctx.ui.riparazione.dove !== 'riga';
  return h('details', {
    class: 'sezione-tab sezione-integrita', open: aperta || !!dalRiquadro || null,
    ontoggle: (e) => { if (e.target.open !== aperta) salvaImpostazioni({ ...leggiImpostazioni(), integritaAperta: e.target.open }); },
  },
    h('summary', {},
      h('h2', {}, 'Integrità degli oggetti (§7.2.1)'),
      h('span', { class: `riassunto-integrita${danneggiati ? ' con-danni' : ''}` },
        `${oggetti} ${oggetti === 1 ? 'oggetto' : 'oggetti'} · ${danneggiati} ${danneggiati === 1 ? 'danneggiato' : 'danneggiati'}`)),
    h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta integrita-tab' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Oggetto'), h('th', {}, 'PI'), h('th', {}, h('span', { class: 'sr' }, 'Comandi')), h('th', { class: 'pi-ps' }, 'PS Integrità'))),
      h('tbody', {}, righe.map(riga)))),
    dalRiquadro ? pannelloRiparazione(ctx, lista, pi, rip) : null,
    campiPiDirettore(ctx),
    h('p', { class: 'nota' }, 'Un colpo o una Parata ordinari non tolgono PI: si perdono con un attacco per rompere l’oggetto, un Magistrale che lo coinvolge, Corrosivo o Demolitrice e il danno Etereo, se la PS Integrità (1d20 ≤ PS) fallisce. A 0 PI l’oggetto è Rotto: non dà AR né i suoi effetti. Si ripara con «Ripara» (un’ora, Prova di Tecnologia, esito scelto dopo il tiro, A.46); il Direttore può sempre rimettere i PI con +.'));
}

/**
 * Controlli dei PI di un oggetto (Armamenti §7.2.1), comuni al riquadro Integrità e alla riga
 * dell'Inventario: { classe, nome, etichetta, valore, comandi, ps }. «PI n/max», − e +, «Ripara»
 * (A.46); per più esemplari integri «Danneggia uno» (A.47). `dove` dice dove si apre il pannello della
 * riparazione ('riquadro' o 'riga').
 */
function controlliPi(ctx, { x, n, quantita = 1, voci = [x] }, dove = 'riquadro') {
  const rip = regoleRiparazione(ctx.dati);
  const armi = ctx.tab.scheda.equipaggiamento?.armi ?? [];
  const ps = x.ps ? `${x.ps}${x.qualita ? ` (${x.qualita})` : ''}` : '—';
  if (quantita > 1) {
    // «Danneggia uno»: una voce con quantità > 1 si separa (A.47); fra voci distinte si toglie 1 PI all'ultima
    const conQuantita = voci.find((v) => v.gruppo);
    const danneggia = conQuantita ? () => ctx.azioni.danneggiaEsemplare(conQuantita.uid) : () => ctx.azioni.integrita(voci.at(-1).uid, -1);
    return {
      classe: 'gruppo-esemplari', nome: `${x.nome} ×${quantita}`, etichetta: h('span', { class: 'sigla' }, ' · integri'),
      valore: `PI ${x.piMax}/${x.piMax}`,
      comandi: h('button', { type: 'button', class: 'btn btn-piccolo btn-danneggia', title: 'Separa un esemplare in una riga propria, con 1 PI in meno (A.47).', onclick: danneggia }, 'Danneggia uno'),
      ps,
    };
  }
  const soglia = statoIntegrita(n, x.piMax, ctx.dati);
  const rotto = soglia?.effetto === 'inutilizzabile';
  const b = (delta) => h('button', {
    type: 'button', class: 'btn-tavolo btn-mini', onclick: () => ctx.azioni.integrita(x.uid, delta),
    disabled: delta < 0 ? n <= 0 : n >= x.piMax, 'aria-label': `${delta < 0 ? 'Togli' : 'Aggiungi'} 1 PI a ${x.nome}`,
  }, delta < 0 ? '−' : '+');
  const ripara = rip ? (() => {
    const cond = armi.find((w) => String(w.uid).split(':')[0] === x.uid)?.condizioneArma?.id ?? null;
    const ok = riparabile(x, cond, rip);
    return h('button', { type: 'button', class: `btn btn-piccolo btn-ripara${rotto && ok.si ? ' primario' : ''}`, disabled: !ok.si || n >= x.piMax,
      title: !ok.si ? ok.motivo : n >= x.piMax ? 'PI già al massimo.' : `Riparazione strutturale: ${rip.ore} ora, Prova di ${rip.abilita} (A.46).`,
      onclick: () => { ctx.ui.riparazione = { uid: x.uid, improvvisati: false, esito: null, dove }; ctx.azioni.ridisegna(); } }, 'Ripara');
  })() : null;
  return {
    classe: `${rotto ? 'rotto' : ''}${n < x.piMax ? ' danneggiato' : ''}`.trim() || null,
    nome: x.nome,
    etichetta: soglia ? h('span', { class: 'etichetta etichetta-rotto', title: 'A 0 PI l’oggetto è Rotto e non può essere utilizzato finché non viene riparato (§7.2.1). La rottura vale dal colpo successivo: non annulla la protezione già data contro il colpo che l’ha causata (A.44).' }, soglia.etichetta) : null,
    valore: `PI ${n}/${x.piMax}`,
    comandi: [b(-1), b(1), ripara],
    ps,
  };
}

/**
 * PI e Ripara nella riga di un oggetto dell'Inventario (docs/layout-sd.md, pezzo 2): gli stessi
 * controlli del riquadro Integrità (una voce con PI ha una sola riga di Integrità, con lo stesso uid);
 * il pannello della riparazione aperto da qui si apre sotto la riga.
 */
function piRigaInventario(ctx, r) {
  const lista = ctx.tab.scheda.equipaggiamento?.integrita ?? [];
  const x = lista.find((o) => o.uid === r.uid);
  if (!x) return null;
  const pi = ctx.sessione.integrita ?? {};
  const n = pi[x.uid] ?? x.piMax;
  // A.47: più esemplari integri restano in una riga, con «Danneggia uno»
  const c = controlliPi(ctx, { x, n, quantita: x.gruppo ?? 1 }, 'riga');
  const stato = ctx.ui.riparazione;
  return h('div', { class: 'pi-riga' },
    h('div', { class: `pi-voce${c.classe ? ` ${c.classe}` : ''}` },
      c.etichetta, h('strong', { class: 'pi-valore' }, c.valore), h('span', { class: 'pi-comandi' }, c.comandi), h('span', { class: 'pi-ps sigla' }, c.ps === '—' ? null : `PS Integrità ${c.ps}`)),
    stato?.dove === 'riga' && stato.uid === x.uid ? pannelloRiparazione(ctx, lista, pi, regoleRiparazione(ctx.dati)) : null);
}

/**
 * Comandi di tavolo nella riga dell'Inventario (docs/layout-sd.md, pezzo 3): condizione dell'arma
 * (A.49, §5.17), caricatori pieni di riserva delle armi a distanza (§7.20.2) e applicazioni dei kit
 * sanitari (§7.19). In Combattimento si vedono soltanto; «Ricarica» resta là.
 */
function tavoloRigaInventario(ctx, r) {
  if (r.deposito || r.fuoriCatalogo) return null;
  const nodi = [];
  const condizioni = ctx.dati.regole.condizioni_armi;
  if (condizioni && ['arma_ravvicinata', 'arma_distanza'].includes(r.tipo)) {
    const attuale = ctx.sessione.condizioniArmi?.[r.uid] ?? 'integra';
    nodi.push(h('label', { class: 'condizione-arma campo-inline', title: condizioni.elenco.find((c) => c.id === attuale)?.testo ?? 'Condizione dell’arma dopo una Complicazione (§5.17); distinta dai PI.' },
      h('span', { class: 'sigla' }, 'Condizione '),
      h('select', { onchange: (e) => ctx.azioni.condizioneArma(r.uid, e.target.value) },
        condizioni.elenco.map((c) => h('option', { value: c.id, selected: attuale === c.id }, c.nome)))));
  }
  const info = r.tipo === 'arma_distanza' ? ctx.massimi.ricarica?.[r.uid] ?? null : null;
  if (r.tipo === 'arma_distanza' && ctx.massimi.caricatori?.[r.uid] !== undefined && (!info || info.modo === 'caricatore' || info.modo === null)) {
    const m = ctx.sessione.munizioni?.[r.uid] ?? { riserve: 0 };
    const b = (d) => h('button', { type: 'button', class: 'btn-tavolo btn-mini', disabled: d < 0 && m.riserve <= 0,
      'aria-label': `${d > 0 ? 'Aggiungi' : 'Togli'} un caricatore di riserva a ${r.nome}`, onclick: () => ctx.azioni.munizioni(r.uid, 'riserve', d) }, d > 0 ? '+' : '−');
    nodi.push(h('div', { class: 'pi-voce' }, h('span', {}, info?.modo === 'caricatore' ? 'Caricatori pieni di riserva ' : 'Riserve '), h('strong', {}, String(m.riserve ?? 0)), h('span', { class: 'pi-comandi' }, b(-1), b(1))));
  }
  // §7.8: moduli integrati con alimentazione distinta (lanciagranate della Punisher…): colpi del modulo e
  // munizioni compatibili dell'Inventario; la ricarica e la scelta della granata sono nella tab Combattimento
  for (const uid of Object.keys(ctx.massimi.caricatori ?? {}).filter((k) => k.startsWith(`${r.uid}:`))) {
    const info = ctx.massimi.ricarica?.[uid];
    const prof = (ctx.tab.scheda.equipaggiamento?.armi ?? []).find((w) => w.uid === uid);
    const m = ctx.sessione.munizioni?.[uid] ?? { colpi: 0 };
    nodi.push(h('div', { class: 'pi-voce modulo-munizioni' },
      h('span', {}, `${prof?.nome ?? 'Modulo'}: `, h('strong', {}, `${m.colpi}`), ` / ${ctx.massimi.caricatori[uid] ?? '—'} colpi`,
        prof?.granataCaricata ? ` · ${prof.granataCaricata.nome}` : ''),
      info ? h('small', { class: 'nota' }, info.scorte.length ? ` · compatibili: ${info.scorte.map((x) => `${x.nome} ×${disponibili(x, ctx.sessione.scorte)}`).join(', ')}` : ' · nessuna munizione compatibile nell’Inventario') : null));
  }
  // NEC (Equipaggiamento 0.5, §5.4): riserva attuale come i PM dei contenitori, con − e + e la provenienza
  for (const x of riserveNec([r.voce], ctx.dati)) nodi.push(rigaNec(ctx, r, x));
  const kit = consumabili([r.voce], ctx.dati)[0];
  if (kit) {
    nodi.push(pannelloMunizioni(ctx, { uid: kit.uid, nome: kit.nome, munizioni: { capacita: kit.capacita, unita: kit.unita, ricarica: kit.ricarica ? `${kit.ricarica.applicazioni} ${kit.unita} costano ${kit.ricarica.costo.toLocaleString('it-IT')}` : null } }));
  }
  return nodi.length ? h('div', { class: 'tavolo-riga' }, nodi) : null;
}

/**
 * Riserva di un NEC nella riga dell'Inventario: «NEC 87 / 100 ore» (o Lx, o usi) con i pulsanti dei
 * passi di regole.json → nec.passi_tavolo e la provenienza al tooltip (quale NEC, consumo, paragrafo).
 * Si segna a mano: «Nuova sessione» non ricarica (§5.4.6).
 */
function rigaNec(ctx, r, x) {
  const n = ctx.sessione.nec?.[x.chiave] ?? x.massimo;
  const parte = x.nome !== r.nome ? x.nome.slice(r.nome.length).trim() : '';
  const b = (d) => h('button', {
    type: 'button', class: 'btn-tavolo btn-mini', disabled: d < 0 ? n <= 0 : n >= x.massimo,
    'aria-label': `${d > 0 ? 'Aggiungi' : 'Togli'} ${Math.abs(d)} ${x.unita} a ${x.nome}`, onclick: () => ctx.azioni.nec(x.chiave, d),
  }, d > 0 ? `+${d}` : `−${-d}`);
  return h('div', { class: `pi-voce riserva-nec${n === 0 ? ' esaurita' : ''}` },
    h('span', {}, `${x.unita === 'Lx' ? 'Riserva' : 'NEC'}${parte ? ` ${parte}` : ''} `),
    infoValore([h('strong', {}, n.toLocaleString('it-IT')), ` / ${x.massimo.toLocaleString('it-IT')} ${x.unita}`], {
      titolo: `Riserva: ${x.nome}`,
      // A.67 (E&L del 02/10): niente travaso di energia fra NEC (regole.json → nec.travaso)
      sottotitolo: `Si segna a mano (Equipaggiamento §5.4): «Nuova sessione» non ricarica; la ricarica completa richiede caricatore e fonte, un’ora.${ctx.dati.regole.nec?.travaso?.ammesso === false ? ` ${ctx.dati.regole.nec.travaso.decisione}` : ''}`,
      provenienza: x.provenienza,
    }, { classe: 'valore-nec' }),
    h('span', { class: 'pi-comandi' }, [...x.passi].reverse().map((p) => b(-p)), x.passi.map((p) => b(p))));
}

/**
 * Peso e carico in testa all'Inventario (§5.2.6, Equipaggiamento §1.6): «peso attuale / soglia», con
 * la provenienza al tooltip (cosa pesa, cosa è escluso perché nel deposito comune, i pesi da
 * definire); soglie, penalità e peso aggiuntivo della sessione sotto. Era nella tab Combattimento.
 */
function riquadroCarico(ctx) {
  const c = ctx.tab.scheda.carico;
  if (!c) return null;
  const kg = (v) => v.toLocaleString('it-IT', { maximumFractionDigits: 1 });
  const penalita = !!c.livello.effetto;
  const forza = ctx.tab.scheda.caratteristiche.FOR.valore;
  const esclusi = c.esclusi.length;
  return h('div', { class: 'contatore-tavolo riquadro-carico' },
    h('h3', {}, 'Carico (§5.2.6)'),
    // E&L 4 (A.30): un peso mancante è «da definire», non 0 kg; il totale noto è parziale e il livello
    // vale «almeno»: non si attesta l'assenza di penalità
    h('p', { class: `valore-tavolo${penalita ? ' oltre' : ''}` },
      infoValore([h('strong', {}, `${kg(c.peso)} kg`), c.parziale ? ' noti' : null], {
        titolo: 'Peso trasportato',
        sottotitolo: `${c.parziale ? 'Totale parziale: un peso mancante non vale 0 kg (E&L 4, A.30). ' : ''}${esclusi ? `${esclusi} ${esclusi === 1 ? 'oggetto' : 'oggetti'} nel deposito comune, fuori dal carico.` : ''}`.trim() || null,
        provenienza: provenienzaCarico(c),
      }, { classe: 'valore-carico' }),
      h('span', {}, ` / ${kg(c.soglie.ordinario)} kg`),
      h('span', {}, c.parziale ? ` · almeno ${c.livello.nome}` : ` · ${c.livello.nome}`)),
    h('p', { class: 'nota' }, `Ordinario fino a ${kg(c.soglie.ordinario)} kg, Sovraccarico fino a ${kg(c.soglie.massimo)} kg; spingere o trascinare su terreno piano fino a ${kg(c.soglie.spinta)} kg (FOR ${forza}${c.soglie.talento ? `, soglie raddoppiate da ${c.soglie.talento}` : ''}).`),
    h('p', { class: penalita ? 'avviso-carico' : 'nota' },
      // con il totale parziale l'Ordinario non attesta «nessuna penalità» (E&L 4)
      c.parziale && !penalita ? 'Sul peso noto nessuna penalità; con i pesi da definire il carico reale può essere maggiore: decide il Direttore.' : c.livello.promemoria,
      c.livello.movimento_q && c.passo !== null ? ` Passo ${c.passo} Q, prima delle altre penalità.` : ''),
    h('label', { class: 'campo-inline' }, 'Peso aggiuntivo (kg) ',
      h('input', { type: 'number', min: 0, step: 0.5, value: c.pesoExtra, 'aria-label': 'Peso aggiuntivo in kg', onchange: (e) => ctx.azioni.imposta('caricoExtra', Number(e.target.value) || 0) }),
      h('small', { class: 'nota' }, 'bottino, una creatura trasportata con il suo equipaggiamento…')));
}

/**
 * Tab Inventario (docs/layout-sd.md, pezzo 2): l'unica casa degli oggetti del personaggio. In testa
 * carico e crediti; poi gli avvisi dell'equipaggiamento, il riquadro Integrità (spostato dalla tab
 * Combattimento) e le sezioni per famiglia, con lo stato di ogni oggetto (compreso il deposito
 * comune), PI e Ripara nella riga; in fondo il catalogo, con «Aggiungi» e «Compra».
 */
function tabInventario(ctx) {
  const d = ctx.tab.tab.find((t) => t.id === 'combattimento')?.dati ?? null;
  const applicata = dotazioneApplicata(ctx.scelte.equipaggiamento);
  return [
    h('div', { class: 'griglia-tavolo testa-inventario' }, riquadroCarico(ctx), riquadroCrediti(ctx)),
    d?.avvisiEquipaggiamento?.length ? h('div', { class: 'riquadro attenzione' },
      h('p', {}, h('strong', {}, 'Equipaggiamento da controllare (avvisi, non blocchi: decide il master):')),
      h('ul', {}, d.avvisiEquipaggiamento.map((a) => h('li', {}, a)))) : null,
    sezioneIntegrita(ctx),
    sezione('Oggetti',
      h('p', { class: 'nota' }, 'Solo gli oggetti impugnati, imbracciati o indossati cambiano i valori. Il deposito comune tiene l’oggetto fuori dal carico e fuori dal tavolo.',
        applicata ? ' La dotazione iniziale (§2.16) si cambia dal passo Equipaggiamento della creazione.' : null),
      // senza dotazione iniziale il pulsante per applicarla sta nel riquadro Crediti, qui sopra
      renderEquipaggiamento({
        dati: ctx.dati, voci: ctx.scelte.equipaggiamento, ui: ctx.ui,
        aggiorna: ctx.azioni.equipaggiamento, ridisegna: ctx.azioni.ridisegna,
        inventario: true, rigaExtra: (r) => [piRigaInventario(ctx, r), tavoloRigaInventario(ctx, r)],
        compra: ctx.azioni.compra, crediti: ctx.sessione.crediti,
      })),
  ];
}

/**
 * Crediti attuali (§2.16.28, valore di sessione): +/− al tavolo. Senza dotazione iniziale
 * nell'inventario (personaggi creati prima del passo guidato) propone di applicarla.
 */
function riquadroCrediti(ctx) {
  const s = ctx.sessione;
  if (s.crediti === null) {
    return h('div', { class: 'contatore-tavolo riquadro-crediti' },
      h('h3', {}, 'Crediti'),
      h('p', { class: 'nota' }, 'Nessuna dotazione iniziale: crediti e oggetti del §2.16 non sono ancora registrati.'),
      bottoneDotazione(ctx));
  }
  // pulsanti da 1 a 1000, meno sopra e più sotto; ±500 e ±1000 («grande») spariscono per primi se
  // il riquadro è stretto (si fanno con il campo del totale), i piccoli restano sempre
  const PASSI_CREDITI = [1, 5, 10, 50, 100, 500, 1000];
  const b = (delta) => h('button', {
    type: 'button', class: `btn-tavolo btn-crediti${Math.abs(delta) >= 500 ? ' grande' : ''}`,
    onclick: () => ctx.azioni.varia('crediti', delta), disabled: delta < 0 && s.crediti + delta < 0,
    'aria-label': `${delta > 0 ? 'Aggiungi' : 'Togli'} ${Math.abs(delta)} crediti`,
  }, delta > 0 ? `+${delta}` : `−${-delta}`);
  return h('div', { class: 'contatore-tavolo riquadro-crediti' },
    h('h3', {}, 'Crediti'),
    // il totale si può anche scrivere: si registra come variazione rispetto al valore attuale
    h('p', { class: 'valore-tavolo' }, h('input', {
      type: 'number', min: 0, step: 1, inputmode: 'numeric', class: 'input-crediti', value: s.crediti, 'aria-label': 'Crediti attuali',
      onchange: (e) => { const n = Math.round(Number(e.target.value)); if (Number.isFinite(n) && n >= 0 && n !== s.crediti) ctx.azioni.varia('crediti', n - s.crediti); },
    })),
    h('div', { class: 'pulsanti-crediti' },
      h('div', { class: 'fila-crediti' }, [...PASSI_CREDITI].reverse().map((p) => b(-p))),
      h('div', { class: 'fila-crediti' }, PASSI_CREDITI.map((p) => b(p)))),
    Number.isInteger(s.creditiIniziali) ? h('p', { class: 'nota' }, `Saldo iniziale ${crediti(s.creditiIniziali)} (§2.16.28–29)`) : null);
}

/** Porta al passo Equipaggiamento del wizard, dove si sceglie e si applica la dotazione iniziale. */
function bottoneDotazione(ctx) {
  return h('button', { type: 'button', class: 'btn primario', onclick: () => ctx.azioni.modificaCreazione(ctx.passi.equipaggiamento) },
    'Applica la dotazione iniziale');
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
  // Convertire Potere e ricaricare (Magia sez. 6): rapporto con i Talenti (Ricarica Efficiente, Conversione Migliorata)
  const cv = rapportoConversione(ctx.tab.scheda, ctx.dati);
  const notaConversione = cv?.disponibile ? h('p', { class: 'nota' }, `Convertire Potere e ricaricare: ${cv.rapporto}:1`,
    cv.talenti.length ? ` (${cv.talenti.join(' e ')})` : '',
    Object.keys(cv.fissi).length ? `; ${Object.entries(cv.fissi).map(([c, n]) => `${c} ${n}:1`).join(', ')} in entrambi i sensi` : '', '.')
    // A.20: senza l'Addestramento Taumaturgo, con l'accesso alla magia, si può soltanto prelevare dal Bianco
    : cv?.prelievo?.disponibile ? h('p', { class: 'nota' }, `Prelievo dal Chroma ${Object.entries(cv.prelievo.rapporto).map(([c, n]) => `${c} ${n}:1`).join(', ')} nella riserva personale (contenitore sintonizzato, con contatto); ricaricarlo richiede l’Addestramento Taumaturgo.`)
    : null;
  return contatoreTavolo(ctx, {
    titolo: 'Punti Magia', campo: 'pmAttuali', attuale: s.pmAttuali, massimo: ctx.massimi.pm, barra: true, classe: 'riquadro-pm',
    nota: med ? `Recupero PM con Meditazione: ${med.pmPerOra} PM/ora, ${med.orePerGiorno} ${med.orePerGiorno === 1 ? 'ora' : 'ore'}/giorno` : null,
    extra: contenitori.length ? h('div', { class: 'cristalli' },
      h('h4', {}, 'Cristalli e riserve di Chroma'),
      h('p', { class: 'nota' }, 'Riserve separate: non si sommano ai PM personali.'),
      notaConversione,
      h('ul', { class: 'elenco-cristalli' }, contenitori.map((c) => h('li', {}, rigaCristallo(ctx, c))))) : notaConversione,
  });
}

/**
 * «Bonus/malus condizionali su Abilità»: interruttori degli oggetti in uso con effetti situazionali
 * (corredo di sopravvivenza nell'ambiente scelto, abiti eleganti in un ambiente formale, Scudo Magico…).
 * Accesi, i loro effetti entrano nei valori effettivi. Una fila di pillole compatte che va a capo
 * solo se non entra; il testo completo dell'effetto nel tooltip. Valore di sessione
 * (src/sessione.js → condizioniOggetti). La lama delle Guardie Sacre ha il suo interruttore nella
 * scheda dell'arma (tab Combattimento).
 */
function condizioniOggetti(ctx) {
  // i chip del Processore si accendono con «Attiva» (tab Cibernetica, §7.10: durata e limite di 24 ore)
  const effetti = (ctx.tab.scheda.equipaggiamento?.effettiOggetti ?? []).filter((e) => e.ambito === 'situazionale' && e.beneficio !== 'chip_processore');
  if (!effetti.length) return null;
  const perUid = new Map();
  for (const e of effetti) (perUid.get(e.uid) ?? perUid.set(e.uid, []).get(e.uid)).push(e);
  const accesi = new Set(ctx.sessione.condizioniOggetti ?? []);
  // nella pillola la forma breve («+2 Sopravvivenza», «+2 AR»); il testo completo nel tooltip
  const breve = (e) => ((e.tipo ?? 'va') === 'va' ? `${segno(e.valore)} ${e.abilita}` : e.tipo === 'ar' ? `${segno(e.valore)} AR` : testoEffettoOggetto(e).replace(/ \(con la condizione attiva\)$/, ''));
  return h('section', { class: 'riquadro condizionali-oggetti', 'aria-label': 'Bonus/malus condizionali su Abilità' },
    h('h3', { title: 'Accendi la condizione quando ricorre (ambiente, situazione formale, osservazione a distanza): l’effetto entra nel valore. Un solo bonus degli strumenti per Prova (Giocatore §1.4.1).' },
      'Bonus/malus condizionali su Abilità'),
    h('div', { class: 'pillole-condizionali' }, [...perUid].map(([uid, lista]) => {
      const acceso = accesi.has(uid);
      const completo = `${lista[0].oggetto}: ${lista.map((e) => testoEffettoOggetto(e)).join('; ')}.${lista.map((e) => e.condizione).filter(Boolean).map((c) => ` ${c}`).join('')}`;
      return h('label', { class: `pillola-condizionale${acceso ? ' attivo' : ''}`, title: completo },
        h('input', { type: 'checkbox', role: 'switch', checked: acceso, 'aria-label': completo, onchange: () => ctx.azioni.condizioneOggetto(uid) }),
        h('span', { class: 'nome-condizionale' }, lista[0].oggetto),
        h('span', { class: 'effetto-condizionale' }, ` · ${lista.map(breve).join(', ')}`));
    })));
}

/**
 * Interruttore «Bonus dei Talenti» (docs/censimento-talenti.md), in testa a Combattimento e Poteri, con
 * lo stesso componente dei toggle situazionali. Spento: i valori al tavolo, «Attacca!» e «Lancia!» non
 * contano i Talenti; la provenienza li elenca barrati.
 */
function interruttoreTalenti(ctx) {
  const effetti = ctx.tab.scheda.effettiTalenti ?? [];
  const on = ctx.tab.scheda.bonusTalenti !== false;
  const testo = on ? 'Bonus dei Talenti: contano nei valori, in «Attacca!» e in «Lancia!»'
    : 'Bonus dei Talenti spenti: i valori non li contano (nella provenienza sono barrati)';
  return h('div', { class: 'interruttore-talenti' },
    h('label', { class: `pillola-condizionale${on ? ' attivo' : ''}`, title: testo },
      h('input', { type: 'checkbox', role: 'switch', checked: on, 'aria-label': 'Bonus dei Talenti', onchange: ctx.azioni.bonusTalenti }),
      h('span', { class: 'nome-condizionale' }, 'Bonus dei Talenti'),
      h('span', { class: 'effetto-condizionale' }, on ? ` · accesi${effetti.length ? '' : ' (nessun effetto numerico tipizzato)'}` : ' · spenti')));
}

/**
 * Talenti situazionali (docs/censimento-talenti.md): un interruttore per acquisizione, lo stesso dei
 * bonus condizionali degli oggetti; il testo completo (la frase del manuale) nel tooltip. `filtro`
 * sceglie quali effetti mostrare (per esempio solo Difese e Salvezze in Combattimento).
 */
function condizioniTalenti(ctx, { titolo = 'Talenti da attivare', filtro = () => true } = {}) {
  const gruppi = talentiSituazionali(ctx.tab.scheda.effettiTalenti ?? []).filter((g) => g.effetti.some(filtro));
  if (!gruppi.length) return null;
  const accesi = new Set(ctx.tab.scheda.talentiAccesi ?? []);
  const off = ctx.tab.scheda.bonusTalenti === false;
  const breve = (e) => ((e.tipo ?? 'va') === 'va' ? `${segno(e.valore)} ${e.abilita}` : e.tipo === 'salvezza' ? `${segno(e.valore)} ${e.salvezza === 'volonta' ? 'Volontà' : e.salvezza[0].toUpperCase() + e.salvezza.slice(1)}` : testoEffettoOggetto(e));
  return h('section', { class: 'riquadro condizionali-oggetti condizionali-talenti', 'aria-label': titolo },
    h('h3', { title: 'Accendi il Talento quando ricorre la circostanza del manuale: il bonus entra nel valore. I bonus dei Talenti si sommano.' }, titolo),
    off ? h('p', { class: 'nota' }, 'Bonus dei Talenti spenti: gli interruttori non hanno effetto.') : null,
    h('div', { class: 'pillole-condizionali' }, gruppi.map((g) => {
      const acceso = accesi.has(g.chiave);
      const completo = `${g.talento}: ${g.condizione}`;
      return h('label', { class: `pillola-condizionale${acceso ? ' attivo' : ''}`, title: completo },
        h('input', { type: 'checkbox', role: 'switch', checked: acceso, 'aria-label': completo, onchange: () => ctx.azioni.talento(g.chiave) }),
        h('span', { class: 'nome-condizionale' }, g.talento),
        h('span', { class: 'effetto-condizionale' }, ` · ${g.effetti.map(breve).join(', ')}`));
    })));
}

/** Usi specifici dei Talenti sulle Prove di Caratteristica (Prova di Caratteristica Migliorata): righe a parte. */
function usiCaratteristicheTalenti(ctx) {
  const lista = ctx.tab.scheda.usiCaratteristicheTalenti ?? [];
  if (!lista.length) return null;
  return h('ul', { class: 'usi-salvezze nota' }, lista.map((u) => h('li', { title: [u.condizione, u.fonte].filter(Boolean).join(' — ') },
    h('strong', {}, `${segno(u.valore)} alle Prove dirette di ${u.caratteristiche.join(', ')}`), ` (${u.talento})`)));
}

/** A.47: PI fissati dal Direttore per gli oggetti senza PI a catalogo (facoltativo, nessun valore predefinito). */
function campiPiDirettore(ctx) {
  const lista = ctx.tab.scheda.equipaggiamento?.senzaPi ?? [];
  if (!lista.length) return null;
  const imposta = (uid, valore) => {
    const n = Number.parseInt(valore, 10);
    const voci = (ctx.scelte.equipaggiamento ?? []).map((v) => {
      if (v.uid !== uid) return v;
      const w = { ...v };
      if (Number.isInteger(n) && n >= 1) w.pi_direttore = n; else delete w.pi_direttore;
      return w;
    });
    ctx.azioni.equipaggiamento(voci);
  };
  return h('details', { class: 'pi-direttore' },
    h('summary', {}, `Oggetti senza PI a catalogo (${lista.length}): PI definiti dal Direttore`),
    h('p', { class: 'nota' }, 'Senza PI a catalogo un oggetto non è indistruttibile e non vale 0: se serve tenerne l’Integrità, il Direttore fissa i PI per analogia con oggetti comparabili (A.47).'),
    h('ul', {}, lista.map((x) => h('li', {}, h('label', {}, `${x.nome}: PI `,
      h('input', { type: 'number', min: 1, max: 99, value: x.piDirettore ?? '', placeholder: '—', 'aria-label': `PI di ${x.nome} definiti dal Direttore`, onchange: (e) => imposta(x.uid, e.target.value) }))))));
}

/** Pannello della riparazione strutturale di un oggetto (A.46): nessun dado, esito scelto dopo il tiro. */
function pannelloRiparazione(ctx, lista, pi, rip) {
  const stato = ctx.ui?.riparazione;
  const x = stato && lista.find((o) => o.uid === stato.uid);
  if (!rip || !x) return null;
  const n = pi[x.uid] ?? x.piMax;
  const va = vaRiparazione(ctx.tab.scheda, stato.improvvisati, rip, stato.uso ?? null);
  const e = stato.esito ? esitoRiparazione({ piAttuali: n, piMax: x.piMax, costo: x.costo }, stato.esito, rip) : null;
  const crediti = ctx.sessione.crediti;
  const chiudi = () => { ctx.ui.riparazione = null; ctx.azioni.ridisegna(); };
  return h('div', { class: 'riquadro pannello-riparazione', role: 'group', 'aria-label': `Riparazione di ${x.nome}` },
    h('h3', {}, `Ripara ${x.nome} · PI ${n}/${x.piMax}`),
    h('p', {}, `${rip.ore} ora di lavoro, Prova di ${rip.abilita}: `, h('strong', {}, va ? `VA ${va.totale}` : '—'),
      va && (va.improvvisati || va.uso) ? h('span', { class: 'sigla' }, ` (${va.base}${va.improvvisati ? ` ${segno(va.improvvisati)} strumenti improvvisati` : ''}${va.uso ? ` ${segno(va.uso.modificatore)} ${va.uso.fonti.join(', ') || va.uso.uso}` : ''})`) : null),
    // usi specifici di riparazione (Talenti, corredi): li sceglie il giocatore, se valgono per questo oggetto
    va?.usi?.length ? h('div', { class: 'scelte-esito' }, h('span', { class: 'nota' }, 'Uso specifico pertinente: '),
      [{ uso: null }, ...va.usi].map((u) => h('button', {
        type: 'button', class: `btn${(stato.uso ?? null) === u.uso ? ' primario' : ''}`, 'aria-pressed': String((stato.uso ?? null) === u.uso),
        title: u.uso ? `${u.fonti.join(', ')}: vale solo se l’oggetto rientra nell’uso` : null,
        onclick: () => { stato.uso = u.uso; ctx.azioni.ridisegna(); },
      }, u.uso ? `${u.uso} ${segno(u.modificatore)}` : 'Nessuno'))) : null,
    h('label', {}, h('input', { type: 'checkbox', checked: stato.improvvisati, onchange: () => { stato.improvvisati = !stato.improvvisati; ctx.azioni.ridisegna(); } }),
      ` Strumenti improvvisati (${segno(rip.strumenti_improvvisati_va)} VA)`),
    h('p', { class: 'nota' }, 'Tira al tavolo, poi scegli l’esito:'),
    h('div', { class: 'scelte-esito' }, rip.esiti.map((es) => h('button', { type: 'button', class: `btn${stato.esito === es.id ? ' primario' : ''}`, 'aria-pressed': String(stato.esito === es.id),
      onclick: () => { stato.esito = es.id; ctx.azioni.ridisegna(); } }, `${es.nome} (${segno(es.pi)} PI)`))),
    e ? h('p', {}, `PI ${n} → `, h('strong', {}, `${e.piNuovi}/${x.piMax}`),
      e.costoMateriali === null ? ' · materiali: prezzo di catalogo assente, costo a cura del Direttore'
        : ` · materiali ${e.costoMateriali.toLocaleString('it-IT')} crediti (${rip.materiali_percentuale}% del prezzo per PI recuperato)`,
      e.costoMateriali && !Number.isInteger(crediti) ? ' — crediti non tracciati: annotali a mano' : null,
      e.costoMateriali && Number.isInteger(crediti) && crediti < e.costoMateriali ? ` — crediti insufficienti (${crediti})` : null) : null,
    h('div', { class: 'barra-azioni' },
      h('button', { type: 'button', class: 'btn primario', disabled: !e,
        onclick: () => { ctx.ui.riparazione = null; ctx.azioni.ripara(x.uid, e.piNuovi, e.costoMateriali); } }, 'Conferma'),
      h('button', { type: 'button', class: 'btn', onclick: chiudi }, 'Annulla')));
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
  if (p.corruzione?.penalita) parti.push(`Corruzione: ${p.corruzione.nome} ${segno(p.corruzione.penalita)} a tutte le Prove`);
  if (p.stati.length) parti.push(`Stati: ${p.stati.map((s) => s.nome).join(', ')}`);
  if (!parti.length) return null;
  const soloTesto = p.stati.filter((s) => !s.effetto);
  return h('div', { class: 'riquadro attenzione promemoria' },
    h('p', {}, h('strong', {}, 'Condizioni di sessione. '), parti.join(' · '), '.'),
    h('p', { class: 'nota' }, 'I valori della scheda le includono già: ▼ in rosso i malus, ▲ in verde i bonus rispetto al valore da regole; tocca un valore per la scomposizione. La stampa resta a riposo.',
      soloTesto.length ? ` Senza effetto numerico, da applicare al tiro: ${soloTesto.map((s) => `${s.nome}: ${s.promemoria}`).join(' ')}` : null));
}

const FONTI = { regole: 'regole', equipaggiamento: 'equipaggiamento', oggetto: 'oggetto (condizione accesa)', ferite: 'Ferite (§5.14)', affaticamento: 'Affaticamento (§5.19)', stato: 'Stato (§5.18)' };

/**
 * Valore effettivo della modalità tavolo (regole + equipaggiamento + condizioni). Se differisce dal
 * valore da regole: rosso ▼ (malus) o verde ▲ (bonus); il segno resta leggibile senza colore.
 * Con più di una voce, un tocco o il passaggio del mouse mostra la scomposizione.
 */
function valoreEffettivo(nome, effettivo, daRegole, scomposizione = [], { pillola = false, dettaglio = null, disponibili = [], nonCumulati = [], provenienza = null } = {}) {
  if (effettivo === null || effettivo === undefined) return '—';
  const diff = daRegole === null || daRegole === undefined ? 0 : effettivo - daRegole;
  const verso = diff < 0 ? 'malus' : diff > 0 ? 'bonus' : '';
  const figli = [numero(effettivo),
    verso ? h('span', { class: 'segno-verso', 'aria-hidden': 'true' }, diff < 0 ? '▼' : '▲') : null,
    verso ? h('span', { class: 'sr' }, ` (${segno(diff)} rispetto al valore da regole ${numero(daRegole)})`) : null];
  // pillola: il VA finale in evidenza, sempre toccabile (anche con la sola voce «da regole»)
  const classe = `val-eff${pillola ? ' pillola-va' : ''} ${verso}`.trim();
  if (scomposizione.length <= 1 && !pillola && !provenienza) return h('span', { class: classe }, figli);
  // con la provenienza del motore (src/provenienza.js) la lista sostituisce formula e tabella; i bonus
  // non cumulati sono già righe della lista
  return infoValore(figli, {
    titolo: `${nome}: ${numero(effettivo)}`,
    sottotitolo: `Valore da regole ${numero(daRegole)}`,
    provenienza,
    sezioni: [
      dettaglio ? { etichetta: 'Da regole', testo: dettaglio } : null,
      scomposizione.length > 1 && !provenienza ? { testo: formulaScomposizione(nome, scomposizione) } : null,
      // effetti situazionali con la condizione spenta (docs/effetti-oggetti.md)
      ...disponibili.map((e) => ({ etichetta: 'Disponibile', testo: `${segno(e.valore)} ${e.oggetto} — attiva la condizione (tab Abilità, «Condizioni degli oggetti»)${e.condizione ? `. ${e.condizione}` : ''}` })),
      ...(provenienza ? [] : nonCumulati).map((e) => ({ etichetta: 'Non si somma', testo: `${segno(e.valore)} ${e.oggetto}: un solo modificatore degli strumenti per Prova (Giocatore §1.4.1).` })),
    ].filter(Boolean),
    tabella: provenienza ? undefined : {
      titolo: 'Scomposizione', colonne: ['Voce', 'Valore', 'Fonte'],
      righe: scomposizione.map((x, i) => ({ Voce: x.etichetta, Valore: i ? segno(x.valore) : numero(x.valore), Fonte: FONTI[x.fonte] ?? x.fonte })),
    },
  }, { classe });
}

/** Danno dell'arma con il tooltip della provenienza (motore: w.provenienzaDanno); senza, il testo del bonus. */
function dannoConProvenienza(a, testo) {
  if (!a.provenienzaDanno) return h('strong', { title: testoBonusCaratteristica(a.bonusCaratteristica) ?? null }, testo);
  return infoValore(h('strong', {}, testo), {
    titolo: `Danno (${a.nome}): ${testo}`,
    sottotitolo: 'Dado dell’arma e bonus fissi, per ogni colpo (§5.13)',
    provenienza: { ...a.provenienzaDanno, totale: testo },
    sezioni: [],
  }, { classe: 'valore-danno' });
}

/**
 * Valori d'uso specifico accanto alla pillola (docs/effetti-oggetti.md): «tracce 12 ▲», «lancio 8 ▼».
 * Il VA generale non cambia; il tooltip spiega base, modificatore, oggetto, condizione e paragrafo.
 */
/**
 * Bonus condizionali accanto al valore (docs/censimento-impianti.md): «+2 se con la vista» per gli effetti
 * situazionali di oggetti e Talenti su quell'Abilità, spenti o accesi; la casella accende o spegne la
 * condizione (sessione → condizioniOggetti / talentiAccesi), i chip del Processore passano da «Attiva»
 * (src/impianti.js). La frase del manuale nel tooltip.
 */
function condizionaliValore(ctx, nome, disponibili = []) {
  const s = ctx.tab.scheda;
  const accesiOgg = (s.oggettiAccesi ?? []).filter((e) => (e.tipo ?? 'va') === 'va' && e.abilita === nome);
  const talAccesi = new Set(s.talentiAccesi ?? []);
  const accesiTal = (s.effettiTalenti ?? []).filter((e) => (e.tipo ?? 'va') === 'va' && e.abilita === nome && e.ambito === 'situazionale' && talAccesi.has(e.chiave))
    .map((e) => ({ uid: e.chiave, oggetto: e.talento, valore: e.valore, condizione: e.condizione, se: e.se ?? null, talento: true }));
  const voci = [...disponibili.map((e) => ({ ...e, acceso: false })), ...accesiOgg.map((e) => ({ ...e, acceso: true })), ...accesiTal.map((e) => ({ ...e, acceso: true }))];
  if (!voci.length) return null;
  const commuta = (e) => (e.talento ? ctx.azioni.talento(e.uid) : e.beneficio === 'chip_processore' ? ctx.azioni.chip(e.uid) : ctx.azioni.condizioneOggetto(e.uid));
  return h('span', { class: 'condizionali-valore' }, voci.map((e) => {
    const testo = `${segno(e.valore)} ${e.se ? `se ${e.se}` : '(a condizione)'}`;
    const completo = `${e.oggetto}: ${testo}.${e.condizione ? ` ${e.condizione}` : ''}${e.acceso ? ' Accesa: già nel VA.' : ''}`;
    return h('label', { class: `condizionale-valore${e.acceso ? ' attivo' : ''}`, title: completo },
      h('input', { type: 'checkbox', checked: e.acceso, 'aria-label': completo, onchange: () => commuta(e) }), ' ', testo);
  }));
}

function valoriUso(nome, usi = []) {
  return usi.map((u) => {
    const verso = u.modificatore < 0 ? 'malus' : u.modificatore > 0 ? 'bonus' : '';
    return infoValore([h('span', { class: 'uso-etichetta' }, u.uso), ' ', numero(u.valore),
      verso ? h('span', { class: 'segno-verso', 'aria-hidden': 'true' }, u.modificatore < 0 ? '▼' : '▲') : null], {
      titolo: `${nome} per ${u.uso}: ${numero(u.valore)}`,
      sottotitolo: `VA ${numero(u.base)} ${segno(u.modificatore)}, solo per ${u.uso}: il VA di ${nome} non cambia`,
      sezioni: [
        ...u.oggetti.map((o) => ({ etichetta: `${o.oggetto} ${segno(o.valore)}${o.contato ? '' : ' (non si somma)'}`, testo: [o.condizione, o.fonte].filter(Boolean).join(' — ') || '—' })),
        u.assorbito ? { testo: 'Il bonus è già nel VA con la condizione accesa: un solo modificatore degli strumenti per Prova (Giocatore §1.4.1).' } : null,
      ].filter(Boolean),
    }, { classe: `valore-uso ${verso}`.trim() });
  });
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
  // Ordine (dall'alto): PV e PM (solo dove non stanno nella colonna di sinistra), anagrafica in una
  // riga espandibile, Caratteristiche e Prove Salvezza affiancate, Punti Eroe · Distintivi ·
  // Crediti, poi il resto. Su telefono lo stesso ordine, in una colonna.
  const espansa = leggiImpostazioni().anagraficaEspansa === true;
  const riga = [d.nome, ...d.anagrafica.filter((x) => x.valore).map((x) => (x.campo === 'soprannome' ? `«${x.valore}»` : `${x.etichetta} ${x.valore}`))].join(' · ');
  return [
    promemoriaPenalita(ctx),
    h('div', { class: 'griglia-tavolo pv-pm-identita' }, riquadriPvPm(ctx, { ferite: true })),

    h('section', { class: `sezione-tab anagrafica-sezione${espansa ? ' espansa' : ''}` },
      h('div', { class: 'anagrafica-testa' },
        h('h2', {}, 'Anagrafica'),
        h('button', {
          type: 'button', class: 'btn btn-piccolo', 'aria-expanded': String(espansa), 'aria-controls': 'anagrafica-dettaglio',
          onclick: () => { salvaImpostazioni({ ...leggiImpostazioni(), anagraficaEspansa: !espansa }); ctx.azioni.ridisegna(); },
        }, espansa ? 'Riduci' : 'Espandi')),
      espansa ? null : h('p', { class: 'anagrafica-riga', title: riga }, riga),
      espansa ? h('div', { id: 'anagrafica-dettaglio' },
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
        vuoti ? `Completa l’anagrafica (${vuoti} campi vuoti)` : 'Modifica anagrafica e Background')) : null),

    h('div', { class: 'griglia-due' },
      sezione('Caratteristiche',
        h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta tabella-caratteristiche' },
          h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Valore'), h('th', {}, 'Mod'), h('th', {}, 'Mod Salv.'), h('th', { class: 'col-temporaneo', title: 'Modificatore temporaneo dato dal master' }, 'Temp.'))),
          h('tbody', {}, d.caratteristiche.flatMap((c) => righeCaratteristica(ctx, c))))),
        usiCaratteristicheTalenti(ctx)),
      sezione('Prove Salvezza',
        h('table', { class: 'tabella compatta' },
          h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Car.'), h('th', {}, 'Valore'))),
          h('tbody', {}, d.salvezze.map((x) => h('tr', {},
            h('th', { scope: 'row' }, x.nome), h('td', {}, x.caratteristica),
            h('td', { class: 'cella-va', title: x.limitato ? `Limitato a ${x.tetto} (§1.2.3)` : null },
              valoreEffettivo(x.nome, x.effettivo, x.totale, x.scomposizione, { pillola: true, provenienza: x.provenienza }), x.limitato ? '*' : null))))),
        d.salvezze.some((x) => x.effettivo !== x.totale) ? h('p', { class: 'nota' }, 'Con le condizioni della sessione (Ferite, Affaticamento, Corruzione, Stati).') : null,
        usiSalvezze(ctx, d.salvezze))),

    h('div', { class: 'griglia-tre' },
      // Punti Eroe: nella colonna di sinistra; qui solo dove la colonna non si vede (css/style.css)
      contatoreTavolo(ctx, { titolo: 'Punti Eroe', campo: 'puntiEroe', attuale: s.puntiEroe, massimo: m.puntiEroe, passi: [1], classe: 'riquadro-pe pe-identita' }),
      contatoreTavolo(ctx, {
        titolo: 'Distintivi', campo: 'distintivi', attuale: s.distintivi, massimo: null, passi: [1],
        extra: h('button', {
          type: 'button', class: 'btn', onclick: ctx.azioni.convertiDistintivi,
          disabled: s.distintivi < m.distintiviPerPuntoEroe || s.puntiEroe >= m.puntiEroe,
          title: '§1.8.3: facoltativo, senza superare la riserva massima',
        }, `Converti ${m.distintiviPerPuntoEroe} in 1 Punto Eroe`),
      })),

    sezione('Combattimento e movimento',
      ctx.tab.scheda.tavolo
        ? h('div', { class: 'griglia-tavolo griglia-tavolo-compatta' }, riquadriTavolo(ctx))
        : h('dl', { class: 'voci griglia-voci' },
          h('div', {}, h('dt', {}, 'Iniziativa'), h('dd', {}, `${segno(d.iniziativa)} + ${d.dadoIniziativa}`)),
          h('div', {}, h('dt', {}, 'Movimento'), h('dd', {}, `Passo ${mov.passo} ${mov.unita} · Corsa ${mov.corsa} ${mov.unita} · Scatto ${mov.scatto} ${mov.unita}`)),
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
          h('td', {}, r.righe.length ? h('ul', { class: 'righe-livello' }, r.righe.map((x) => h('li', {}, x))) : '—',
            // A.107: un livello passato si corregge; i livelli dopo si ricalcolano
            r.livello >= 2 && ctx.azioni.correggiLivello ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Correggi le scelte di questo livello: i livelli successivi si ricalcolano in ordine (A.107)', onclick: () => ctx.azioni.correggiLivello(r.livello) }, 'Correggi') : null)))))),

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
  const eccesso = ctx.tab.scheda?.avvisoPunti ?? null;
  // sul telefono le colonne di dettaglio si nascondono e la formula va sotto il nome (come nel wizard)
  const tabella = (categorie) => h('table', { class: 'tabella compatta abilita-tab' },
    h('thead', {}, h('tr', {}, ['Abilità', 'Mod', 'Base', 'Corp', 'Avanz', 'Equip', 'VA'].map((c, i) => h('th', { class: i && i < 6 ? 'dettaglio' : null }, c)))),
    categorie.map((cat) => h('tbody', {},
      h('tr', { class: 'categoria' }, h('th', { colspan: 7 }, cat.nome)),
      cat.abilita.map((a) => h('tr', { class: a.diClasse ? 'di-classe' : null },
        h('th', { scope: 'row' }, info('abilita', a.nome), h('span', { class: 'sigla' }, ` ${a.caratteristica}`),
          a.competenza ? h('span', { class: 'sigla', title: `Competenza ${a.competenza} (prima Classe, §2.3)` }, ` ${a.competenza}`) : null, a.diClasse ? ' •' : null,
          // §8.3: VA grezzo oltre il limite del VA personale
          a.limite !== null && a.grezzo > a.limite ? h('span', { class: 'al-limite', title: `VA grezzo ${a.grezzo} oltre il limite ${a.limite} (§8.3): conta ${a.limite}` }, ' ⚑') : null,
          // punti liberi ricevuti in un evento con punti in eccesso (E&L del 03/10/2026)
          liberiInEccesso(eccesso, a.nome) ? h('span', { class: 'liberi-eccesso', title: `Punti liberi: ${liberiInEccesso(eccesso, a.nome)}. ${eccesso.testo}` }, ` ✱ liberi: ${liberiInEccesso(eccesso, a.nome)}`) : null,
          h('small', { class: 'formula' }, `${segno(a.mod)} Mod + ${a.base} Base + ${a.corporazione} Corp + ${a.avanzamento} Avanz${a.limite !== null ? `, limite ${a.limite}` : ''}${a.equip ? ` ${segno(a.equip)} Equip` : ''}`)),
        h('td', { class: 'dettaglio' }, segno(a.mod)), h('td', { class: 'dettaglio' }, String(a.base)), h('td', { class: 'dettaglio' }, String(a.corporazione)),
        h('td', { class: 'dettaglio' }, String(a.avanzamento)), h('td', { class: 'dettaglio', title: a.equip ? 'Equipaggiamento indossato (§7.11.1)' : null }, a.equip ? segno(a.equip) : '0'),
        h('td', { class: 'cella-va' }, h('span', { class: 'va-con-usi' }, valoreEffettivo(a.nome, a.effettivo, a.totale, a.scomposizione, {
          pillola: true, dettaglio: a.provenienza ? null : `${segno(a.mod)} Mod + ${a.base} Base + ${a.corporazione} Corp + ${a.avanzamento} Avanz = ${a.grezzo}${a.grezzo !== a.totale ? `, limite ${a.totale}` : ''}`,
          disponibili: a.disponibili, nonCumulati: a.nonCumulati, provenienza: a.provenienza,
        }), valoriUso(a.nome, a.usiSpecifici), condizionaliValore(ctx, a.nome, a.disponibili))))))));
  const tutte = condizioniAttiveAbilita(ctx.tab.scheda, ctx.dati);
  const condizioni = tutte.filter((c) => c.fonte !== 'uso');
  const usi = tutte.filter((c) => c.fonte === 'uso');
  const rigaCondizione = (c) => h('li', { class: `condizione ${c.fonte}` },
    h('span', { class: `val-eff ${c.verso}` }, h('span', { class: 'segno-verso', 'aria-hidden': 'true' }, c.verso === 'malus' ? '▼' : '▲'), ' '),
    h('strong', {}, `${c.nome}: `), h('span', { class: `effetto-condizione ${c.verso}` }, c.testo),
    c.uso ? h('span', { class: 'nota' }, ` (solo per ${c.uso}: vedi ${c.vedi})`) : null);
  // docs/layout-sd.md, pezzo 1: tabella compatta in alto; Condizioni attive (Ferite, Affaticamento,
  // carico, Stati, bonus/malus condizionali degli oggetti) in una colonna a destra, sempre presente
  return [
    h('div', { class: 'abilita-layout' },
      h('div', { class: 'abilita-principale' },
        sezione('Abilità',
          eccesso ? avvisoPuntiEccesso(ctx, eccesso) : null,
          h('div', { class: 'abilita-affiancate' }, tabella(d.categorie.slice(0, meta)), tabella(d.categorie.slice(meta))),
          h('p', { class: 'nota' }, `• Abilità di Classe. S / P / G / N: competenza nella prima Classe (§2.3). VA = Mod + Base + Corp + Avanz, al massimo il limite della categoria (⚑: oltre il limite, §8.3), + Equip (equipaggiamento indossato), più le condizioni della sessione (▼/▲ rispetto al valore da regole).${eccesso ? ' ✱: punti liberi ricevuti in un evento con punti in eccesso.' : ''}`))),
      h('aside', { class: 'colonna-condizioni', 'aria-label': 'Condizioni attive' },
        h('section', { class: 'riquadro condizioni-attive' },
          h('h2', {}, 'Condizioni attive'),
          condizioni.length ? h('ul', {}, condizioni.map(rigaCondizione)) : h('p', { class: 'nota' }, 'Nessuna: Ferite, Affaticamento e Stati si segnano qui sotto o nel Combattimento, il carico nell’Inventario.'),
          usi.length ? h('ul', { class: 'usi-specifici', 'aria-label': 'Solo per un uso specifico' }, usi.map(rigaCondizione)) : null),
        riquadroCircostanze(ctx),
        selettoreLuce(ctx),
        caselleVista(ctx),
        // A.60: Ferite, Affaticamento, Corruzione e Stati modificabili anche qui, come nel Combattimento
        ...(() => { const dc = ctx.tab.tab.find((x) => x.id === 'combattimento')?.dati; return dc ? condizioniModificabili(ctx, dc) : []; })(),
        condizioniOggetti(ctx),
        condizioniTalenti(ctx),
        promemoriaPenalita(ctx, { soloSenzaEffetto: true }))),
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
    // Tecniche Interiori: nella tab Poteri, con «Attiva» (richiesta di Davide del 02/10)
    d.tecniche.length || d.tecnicheAmmesse ? h('p', { class: 'nota rimando-tecniche' }, `Tecniche Interiori (${d.tecniche.length} / ${d.tecnicheAmmesse}): vedi Poteri.`) : null,
  ];
}

// ---------------------------------------------------------------------------
// Iniziativa, Movimento e Azioni effettivi (scheda.tavolo, src/condizioni.js → valoriTavolo): stesse
// pillole dei VA, con colore ▼/▲ rispetto ai valori da regole e la scomposizione nel tooltip.

function pillolaTavolo(titolo, parti, formato = numero) {
  const peggio = parti.some((p) => p.v.effettivo === null || p.v.effettivo < p.v.daRegole);
  const meglio = !peggio && parti.some((p) => p.v.effettivo > p.v.daRegole);
  const verso = peggio ? 'malus' : meglio ? 'bonus' : '';
  const testo = parti.map((p) => (p.v.effettivo === null ? '—' : formato(p.v.effettivo))).join(' · ');
  const figli = [testo, verso ? h('span', { class: 'segno-verso', 'aria-hidden': 'true' }, peggio ? '▼' : '▲') : null,
    verso ? h('span', { class: 'sr' }, ' (diverso dal valore da regole)') : null];
  return infoValore(figli, {
    titolo: `${titolo}: ${parti.map((p) => `${p.nome ? `${p.nome} ` : ''}${p.v.effettivo === null ? '—' : formato(p.v.effettivo)}`).join(' · ')}`,
    sottotitolo: `Valore da regole ${parti.map((p) => formato(p.v.daRegole)).join(' · ')}`,
    // provenienza del motore (src/condizioni.js → valoriTavolo): una lista per valore, poi le note
    ...(parti.every((p) => p.v.provenienza) ? {
      provenienze: parti.map((p) => ({ etichetta: p.nome || titolo, provenienza: { ...p.v.provenienza, totale: p.v.provenienza.totale === null ? null : formato(p.v.provenienza.totale) } })),
      sezioni: parti.flatMap((p) => p.v.note.map((n) => ({ etichetta: p.nome || null, testo: n }))),
    } : {
      sezioni: parti.map((p) => ({
        etichetta: p.nome || null,
        testo: [p.v.effettivo === null ? 'non disponibile' : formulaScomposizione(p.nome || titolo, p.v.scomposizione), ...p.v.note].join('\n'),
      })),
    }),
    tabella: parti.length === 1 && !parti[0].v.provenienza ? {
      titolo: 'Scomposizione', colonne: ['Voce', 'Valore', 'Fonte'],
      righe: parti[0].v.scomposizione.map((x, i) => ({ Voce: x.etichetta, Valore: i ? segno(x.valore) : formato(x.valore), Fonte: FONTI[x.fonte] ?? x.fonte })),
    } : undefined,
  }, { classe: `val-eff pillola-va ${verso}`.trim() });
}

function riquadriTavolo(ctx) {
  const t = ctx.tab.scheda.tavolo;
  if (!t) return [];
  const u = t.movimento.unita;
  return [
    h('div', { class: 'contatore-tavolo' }, h('h3', {}, 'Iniziativa'),
      h('p', { class: 'valore-tavolo' }, pillolaTavolo('Iniziativa', [{ nome: '', v: t.iniziativa }], segno), h('span', {}, ` + ${ctx.dati.regole.iniziativa.dado_in_combattimento}`)),
      h('p', { class: 'nota' }, 'Mod DES + Mod INT e Talenti (§2.14)')),
    h('div', { class: 'contatore-tavolo' }, h('h3', {}, 'Movimento'),
      h('p', { class: 'valore-tavolo' }, pillolaTavolo('Movimento', [{ nome: 'Passo', v: t.movimento.passo }, { nome: 'Corsa', v: t.movimento.corsa }, { nome: 'Scatto', v: t.movimento.scatto }]), h('span', {}, ` ${u}`)),
      h('p', { class: 'nota' }, 'Passo · Corsa · Scatto (§5.2)')),
    ...(ctx.tab.scheda.sensi?.length ? [h('div', { class: 'contatore-tavolo' }, h('h3', {}, 'Sensi'),
      ctx.tab.scheda.sensi.map((s) => h('p', { class: 'valore-tavolo', title: [s.condizione, s.fonte].join(' — ') }, h('strong', {}, `${s.raggioQ} Q`), ` ${s.nome}`)),
      h('p', { class: 'nota' }, ctx.tab.scheda.sensi.map((s) => s.fonte).join(' · ')))] : []),
    h('div', { class: 'contatore-tavolo' }, h('h3', {}, 'Azioni'),
      h('p', { class: 'valore-tavolo' }, pillolaTavolo('Azioni', [{ nome: 'Principali', v: t.azioni.principali }, { nome: 'di Movimento', v: t.azioni.movimento }])),
      h('p', { class: 'nota' }, 'Principali · di Movimento per Round (§5.1)')),
  ];
}

// ---------------------------------------------------------------------------
// Combattimento

/** Cambia lo stato di una voce dell'equipaggiamento (Impugna, Riponi, Indossa…): stesso campo dell'Inventario. */
function cambiaStato(ctx, uid, stato) {
  const base = String(uid).split(':')[0];
  ctx.azioni.equipaggiamento((ctx.scelte.equipaggiamento ?? []).map((v) => (v.uid === base ? { ...v, stato } : v)));
}

/** Stato «a riposo» di un oggetto tolto di mano o di dosso: Addosso se il tipo lo prevede, altrimenti Nello zaino. */
const statoRiposto = (stati) => (stati.includes('pronta') ? 'pronta' : 'zaino');

/**
 * Armi impugnate e scudo imbracciato nei riquadri delle mani (docs/layout-sd.md, pezzo 3): un riquadro
 * «Due mani» per un'arma a due mani, altrimenti mano destra e mano sinistra. A.60 (E&L del 05/10/2026): la mano
 * si registra sulla voce (`mano`: destra o sinistra, «Cambia mano»); senza, vale l'ordine dell'Inventario. Lo
 * scudo occupa la sua mano; due armi in mano non attivano da sole «Combattere con due armi» (casella in
 * «Attacca!»). Oltre le due mani un riquadro a parte (l'avviso sta sopra). I moduli integrati e l'attacco dello
 * scudo stanno con il loro oggetto.
 */
function riquadriMani(ctx, d) {
  const cat = catalogo(ctx.dati);
  const perUid = new Map((ctx.scelte.equipaggiamento ?? []).map((v) => [v.uid, risolvi(v, cat)]));
  const base = (uid) => String(uid).split(':')[0];
  const armi = d.armiCalcolate.filter((a) => !a.moduloDi && !a.daScudo);
  const figli = (uid) => d.armiCalcolate.filter((a) => (a.moduloDi || a.daScudo) && base(a.uid) === uid);
  const scudi = d.protezioniCalcolate.filter((p) => p.tipo === 'scudo' && perUid.get(base(p.uid))?.voce.stato === 'imbracciato');
  const riponi = (uid, nome) => {
    const r = perUid.get(base(uid));
    return r ? h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => cambiaStato(ctx, uid, statoRiposto(r.stati)), title: `Toglie ${nome} di mano (${NOMI_STATI[statoRiposto(r.stati)]}).` }, 'Riponi') : null;
  };
  const oggetti = [
    ...armi.map((a) => ({ uid: base(a.uid), mani: a.mani === 2 ? 2 : 1, nodi: [schedaArma(ctx, a), ...figli(a.uid).map((x) => schedaArma(ctx, x))], riponi: riponi(a.uid, a.nome) })),
    ...scudi.map((p) => ({ uid: base(p.uid), mani: 1, nodi: [schedaScudoInMano(ctx, p), ...figli(base(p.uid)).map((x) => schedaArma(ctx, x))], riponi: riponi(p.uid, p.nome) })),
  ];
  if (!oggetti.length) return [];
  const { slot, oltre } = assegnaMani(oggetti, (o) => perUid.get(o.uid)?.voce.mano ?? null);
  // «Cambia mano»: registra la mano sulla voce (A.60); con due oggetti a una mano li scambia
  const registra = (assegnazioni) => ctx.azioni.equipaggiamento((ctx.scelte.equipaggiamento ?? []).map((v) => (assegnazioni[v.uid] ? { ...v, mano: assegnazioni[v.uid] } : v)));
  const cambia = (o, lato) => {
    const altro = lato === 'destra' ? slot.sinistra : slot.destra;
    const nuovo = lato === 'destra' ? 'sinistra' : 'destra';
    return h('button', { type: 'button', class: 'btn btn-piccolo', title: altro ? 'Scambia gli oggetti fra le due mani' : `Passa alla mano ${nuovo}`,
      onclick: () => registra({ [o.uid]: nuovo, ...(altro ? { [altro.uid]: lato } : {}) }) }, altro ? '⇄ Scambia mani' : `→ mano ${nuovo}`);
  };
  const riquadro = (titolo, o, lato = null) => h('section', { class: `riquadro-mano${titolo === 'Due mani' ? ' due-mani' : ''}${titolo === 'Oltre le due mani' ? ' oltre' : ''}`, 'aria-label': titolo },
    h('header', { class: 'testa-mano' }, h('h3', {}, titolo), lato && !(lato === 'sinistra' && slot.destra) ? cambia(o, lato) : null, o.riponi), ...o.nodi);
  const riquadri = [];
  if (slot.due) riquadri.push(riquadro('Due mani', slot.due));
  else {
    riquadri.push(slot.destra ? riquadro('Mano destra', slot.destra, 'destra') : h('section', { class: 'riquadro-mano libera', 'aria-label': 'Mano destra' }, h('header', { class: 'testa-mano' }, h('h3', {}, 'Mano destra')), h('p', { class: 'vuoto' }, 'Libera.')));
    riquadri.push(slot.sinistra ? riquadro('Mano sinistra', slot.sinistra, 'sinistra') : h('section', { class: 'riquadro-mano libera', 'aria-label': 'Mano sinistra' }, h('header', { class: 'testa-mano' }, h('h3', {}, 'Mano sinistra')), h('p', { class: 'vuoto' }, 'Libera.')));
  }
  for (const o of oltre) riquadri.push(riquadro('Oltre le due mani', o));
  return riquadri;
}

/** Scudo imbracciato nel riquadro della mano: AR e Parata ravvicinata / a distanza con la provenienza. */
function schedaScudoInMano(ctx, p) {
  return h('article', { class: 'arma-tab scudo-in-mano' },
    h('div', { class: 'arma-testa' }, h('h3', {}, p.nome, h('small', { class: 'sigla' }, ' · Scudo'))),
    h('div', { class: 'arma-valori' },
      h('p', {}, h('span', { class: 'sigla' }, 'AR '), h('strong', {}, testoAr(p.ar))),
      p.parata ? h('p', { class: 'valore-tavolo' }, h('span', {}, 'Parata '),
        valoreEffettivo(`Parata ravvicinata (${p.nome})`, p.parata.ravvicinataEffettiva ?? p.parata.ravvicinata, p.parata.daRegole, p.parata.scomposizioneRavvicinata, { pillola: true, provenienza: p.parata.provenienzaRavvicinata }),
        h('small', { class: 'sigla' }, ' ravv. · '),
        valoreEffettivo(`Parata a distanza (${p.nome})`, p.parata.distanzaEffettiva ?? p.parata.distanza, p.parata.daRegole, p.parata.scomposizioneDistanza, { provenienza: p.parata.provenienzaDistanza }),
        h('small', { class: 'sigla' }, ' dist.')) : null));
}

/**
 * Oggetti disponibili da impugnare o da indossare (non nel deposito comune): una riga ciascuno con lo
 * stato attuale e il pulsante che lo cambia. Lo stesso campo della riga dell'Inventario.
 */
function oggettiDisponibili(ctx, tipi, { verbo, statoAttivo, soloNonAttivi = false, filtro = () => true }) {
  const cat = catalogo(ctx.dati);
  const voci = (ctx.scelte.equipaggiamento ?? []).map((v) => risolvi(v, cat))
    .filter((r) => tipi.includes(r.tipo) && filtro(r) && !r.deposito && !r.fuoriCatalogo && !(soloNonAttivi && r.attivo));
  if (!voci.length) return null;
  return h('ul', { class: 'elenco-disponibili' }, voci.map((r) => {
    const attivo = statoAttivo(r);
    return h('li', { class: r.attivo ? 'attivo' : null },
      h('span', {}, h('strong', {}, r.nome), h('small', { class: 'sigla' }, ` · ${NOMI_STATI[r.voce.stato] ?? 'Con sé'}`)),
      r.attivo
        ? h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => cambiaStato(ctx, r.uid, statoRiposto(r.stati)) }, r.tipo === 'scudo' || r.tipo === 'arma_ravvicinata' || r.tipo === 'arma_distanza' ? 'Riponi' : 'Togli')
        : attivo ? h('button', { type: 'button', class: 'btn btn-piccolo primario', onclick: () => cambiaStato(ctx, r.uid, attivo) }, verbo(r)) : null);
  }));
}

/**
 * Riga di una Caratteristica nella tab Identità con il modificatore temporaneo (primo playtest, 05/10/2026;
 * src/temporanei.js): − / + nella colonna «Temporaneo», il valore modificato con la base accanto, e sotto la
 * durata (numero − / + e unità) con «Togli». Si ripercuote su ciò che deriva dalla Caratteristica (tooltip).
 */
function righeCaratteristica(ctx, c) {
  const R = ctx.dati.regole.caratteristiche_temporanee;
  const riga = h('tr', { class: c.temporaneo !== undefined ? 'con-temporaneo' : null },
    h('th', { scope: 'row' }, info('caratteristica', c.sigla, `${c.nome} (${c.sigla})`)),
    h('td', { class: 'forte' }, String(c.valore), c.temporaneo !== undefined ? h('small', { class: `nota val-eff ${c.temporaneo < 0 ? 'malus' : 'bonus'}` }, ` (base ${c.base}${c.valore === ctx.dati.caratteristiche.valore_massimo || c.valore === ctx.dati.caratteristiche.valore_minimo ? ', al limite della tabella' : ''})`) : null),
    h('td', {}, segno(c.mod)), h('td', {}, segno(c.modSalvezza)),
    R ? h('td', { class: 'col-temporaneo' }, controlloTemporaneo(ctx, c, R)) : null);
  if (!R) return [riga];
  const x = normalizzaTemporanei(ctx.sessione.caratteristicheTemporanee, R).find((y) => y.sigla === c.sigla);
  if (!x) return [riga];
  const salva = (lista) => ctx.azioni.imposta('caratteristicheTemporanee', lista);
  const u = R.unita.find((y) => y.id === x.unita);
  return [riga, h('tr', { class: 'riga-durata-temporaneo' }, h('td', { colspan: 5 },
    h('div', { class: 'durata-temporaneo' },
      h('span', { class: 'nota' }, `${c.sigla} ${segno(x.valore)} per `),
      h('button', { type: 'button', class: 'btn-tavolo', disabled: x.numero <= 1, 'aria-label': `Durata di ${c.sigla}: togli 1`, onclick: () => salva(durataTemporaneo(ctx.sessione, c.sigla, { numero: x.numero - 1 }, R)) }, '−'),
      h('strong', {}, String(x.numero)),
      h('button', { type: 'button', class: 'btn-tavolo', 'aria-label': `Durata di ${c.sigla}: aggiungi 1`, onclick: () => salva(durataTemporaneo(ctx.sessione, c.sigla, { numero: x.numero + 1 }, R)) }, '+'),
      h('select', { 'aria-label': `Unità della durata di ${c.sigla}`, onchange: (e) => salva(durataTemporaneo(ctx.sessione, c.sigla, { unita: e.target.value }, R)) },
        R.unita.map((y) => h('option', { value: y.id, selected: y.id === x.unita }, y.nome))),
      h('small', { class: 'nota' }, u?.round ? ` dal Round ${x.dal} fino alla fine del Round ${x.al}` : ' · promemoria: si toglie a mano'),
      h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => salva(togliTemporaneo(ctx.sessione, c.sigla, R)) }, 'Togli'))))];
}

/** − / + del modificatore temporaneo di una Caratteristica; il tooltip dice che cosa ne deriva (dai dati). */
function controlloTemporaneo(ctx, c, R) {
  const salva = (lista) => ctx.azioni.imposta('caratteristicheTemporanee', lista);
  // il modificatore impostato (la Caratteristica modificata si ferma ai limiti della tabella dei modificatori)
  const v = normalizzaTemporanei(ctx.sessione.caratteristicheTemporanee, R).find((y) => y.sigla === c.sigla)?.valore ?? 0;
  const deriva = derivatiDi(c.sigla, ctx.dati);
  return h('div', { class: 'controllo-temporaneo', title: `Modificatore temporaneo di ${c.nome}: vale per ${deriva.join('; ') || 'nessun valore derivato'}.` },
    h('button', { type: 'button', class: 'btn-tavolo', disabled: v <= R.minimo, 'aria-label': `${c.sigla} temporaneo: togli 1`, onclick: () => salva(variaTemporaneo(ctx.sessione, c.sigla, -1, R)) }, '−'),
    h('span', { class: `valore-temporaneo${v ? (v < 0 ? ' malus' : ' bonus') : ''}` }, v ? segno(v) : '0'),
    h('button', { type: 'button', class: 'btn-tavolo', disabled: v >= R.massimo, 'aria-label': `${c.sigla} temporaneo: aggiungi 1`, onclick: () => salva(variaTemporaneo(ctx.sessione, c.sigla, 1, R)) }, '+'));
}

/**
 * «Bonus di circostanza» (Giocatore §1.4; primo playtest, 05/10/2026): i modificatori dati dal master, in righe con
 * valore − / + (limiti in regole.json → circostanza), categorie a caselle (al primo valore diverso da 0 si spuntano
 * tutte; «Tutto» le spunta o le toglie tutte), nota e «Togli». Stesso stato in Combattimento, Poteri e Abilità
 * (sessione.circostanze); entrano nei valori effettivi e nelle utility con la provenienza (src/circostanze.js).
 */
function riquadroCircostanze(ctx) {
  const R = ctx.dati.regole.circostanza;
  if (!R) return null;
  const lista = normalizzaCircostanze(ctx.sessione.circostanze, R);
  const salva = (l) => ctx.azioni.imposta('circostanze', l);
  const casella = (x, id, nome, spuntata) => h('label', { class: `casella-circostanza${spuntata ? ' spuntata' : ''}` },
    h('input', { type: 'checkbox', checked: spuntata, onchange: () => salva(commutaCategoria(lista, x.id, id, R)) }), ` ${nome}`);
  const riga = (x) => h('div', { class: `riga-circostanza${x.valore ? '' : ' a-zero'}` },
    h('div', { class: 'valore-circostanza pulsanti-tavolo' },
      h('button', { type: 'button', class: 'btn-tavolo', disabled: x.valore <= R.minimo, 'aria-label': 'Circostanza: togli 1', onclick: () => salva(variaCircostanza(lista, x.id, -1, R)) }, '−1'),
      h('strong', { 'aria-live': 'polite' }, x.valore ? segno(x.valore) : '0'),
      h('button', { type: 'button', class: 'btn-tavolo', disabled: x.valore >= R.massimo, 'aria-label': 'Circostanza: aggiungi 1', onclick: () => salva(variaCircostanza(lista, x.id, 1, R)) }, '+1')),
    h('div', { class: 'categorie-circostanza', role: 'group', 'aria-label': 'A che cosa si applica' },
      casella(x, TUTTO, 'Tutto', tutteSpuntate(x, R)),
      R.categorie.map((c) => casella(x, c.id, c.nome, x.categorie.includes(c.id)))),
    h('div', { class: 'piede-circostanza' },
      h('input', { type: 'text', class: 'nota-circostanza', value: x.nota ?? '', maxlength: 120, placeholder: 'nota (facoltativa)', 'aria-label': 'Nota della circostanza',
        onchange: (e) => salva(notaCircostanza(lista, x.id, e.target.value.trim(), R)) }),
      h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => salva(togliCircostanza(lista, x.id, R)) }, 'Togli')),
    x.valore && !x.categorie.length ? h('small', { class: 'nota motivo' }, 'Nessuna categoria spuntata: non si applica a nulla.') : null);
  return h('section', { class: 'riquadro riquadro-circostanze', 'aria-label': 'Bonus di circostanza' },
    h('header', { class: 'testa-gradi' }, h('h3', {}, `Bonus di circostanza (${R.paragrafo})`),
      infoValore('?', { titolo: 'Bonus di circostanza', sottotitolo: R.paragrafo, sezioni: [{ testo: `Il modificatore che dà il master, da ${R.minimo} a +${R.massimo}. Si somma ai VA mostrati, a «Attacca!», «Lancia!», Prove Salvezza e Iniziativa delle categorie spuntate (Derivate: Prove Salvezza e Iniziativa); i valori da regole e la stampa non cambiano. Più righe si sommano.` }] }, { classe: 'info-gradi' }),
      h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => salva(aggiungiCircostanza(lista, R)) }, '+ Aggiungi')),
    lista.length ? lista.map(riga) : h('p', { class: 'nota' }, 'Nessuno: «+ Aggiungi» per segnare un bonus o malus del master.'));
}

/** Riga compatta di un riquadro della colonna destra: titolo, stato attuale e gradi cliccabili. */
function gradiCompatti(ctx, { titolo, campo, attuale, gradi, nota }) {
  const g = gradi[attuale];
  return h('section', { class: 'riquadro riquadro-gradi', 'aria-label': titolo },
    h('header', { class: 'testa-gradi' }, h('h3', {}, titolo),
      h('span', { class: `grado-attuale${g?.penalita ? ' con-penalita' : ''}` }, g ? `${g.nome}${g.penalita ? ` ${segno(g.penalita)}` : ''}` : '—'),
      nota ? infoValore('?', { titolo, sezioni: [{ testo: nota }] }, { classe: 'info-gradi' }) : null),
    h('div', { class: 'gradi-compatti', role: 'radiogroup', 'aria-label': titolo }, gradi.map((x, n) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(attuale === n), title: [x.nome, x.penalita === null ? null : x.penalita ? segno(x.penalita) : '0', x.descrizione].filter(Boolean).join(' · '),
      class: `grado${attuale === n ? ' attivo' : ''}${n > 0 && attuale >= n ? ' raggiunto' : ''}`,
      onclick: () => ctx.azioni.imposta(campo, n),
    }, x.breve ?? x.nome))));
}

/**
 * Tab Combattimento (docs/layout-sd.md, pezzo 3). Colonna sinistra: PV con l'AR (se la colonna delle
 * risorse non c'è), Difese, Iniziativa, Movimento, Azioni, Prove Salvezza; le armi in mano nei riquadri
 * delle mani, con «Attacca!» e «Ricarica»; le armi disponibili; le Protezioni; Artefatti e
 * sintonizzazione (fino al pezzo 4). Colonna destra: Ferite, Affaticamento, Corruzione, Stati, con le
 * penalità nei valori effettivi. Equipaggiamento, Integrità, Carico, caricatori di riserva, condizione
 * delle armi e applicazioni sanitarie si cambiano nell'Inventario.
 */
function tabCombattimento(ctx, d) {
  const s = ctx.sessione;
  const m = ctx.massimi;
  const idt = ctx.tab.tab.find((t) => t.id === 'identita')?.dati ?? null;
  const talenti = new Set((ctx.tab.scheda.talentiLiberi ?? []).map((t) => t.id));
  // Parata e Schivata Istintiva (§8.6.7): la «Parata/Schivata Libera» della proposta di Davide
  const istintive = (ctx.dati.talenti_liberi?.talenti ?? []).filter((t) => talenti.has(t.id)
    && (['parata-istintiva', 'schivata-istintiva'].includes(t.id) || (t.prerequisiti ?? []).some((p) => ['parata-istintiva', 'schivata-istintiva'].includes(p))));
  const mani = riquadriMani(ctx, d);
  const sanitari = consumabili(normalizzaEquipaggiamento(ctx.scelte.equipaggiamento), ctx.dati).filter((c) => c.gruppo === 'sanitario');
  return [
    interruttoreTalenti(ctx),
    promemoriaPenalita(ctx),
    riquadroCircostanze(ctx),
    // conducente di un veicolo: andatura e penalità come promemoria, senza cambiare i VA (Veicoli §2.1, §3.1)
    promemoriaConducente(ctx),
    d.avvisiEquipaggiamento.length ? h('div', { class: 'riquadro attenzione' },
      h('p', {}, h('strong', {}, 'Equipaggiamento da controllare (avvisi, non blocchi: decide il master):')),
      h('ul', {}, d.avvisiEquipaggiamento.map((a) => h('li', {}, a)))) : null,
    condizioniTalenti(ctx, { titolo: 'Talenti da attivare (Difese e Salvezze)', filtro: (e) => e.tipo === 'salvezza' || e.abilita === 'Difese' || e.tipo === 'riduzione_stato' }),
    h('div', { class: 'combattimento-layout' },
      h('div', { class: 'combattimento-principale' },
        h('div', { class: 'griglia-tavolo griglia-tavolo-compatta' },
          // con la colonna delle risorse i PV sono già lì: qui non si ripetono (css/style.css)
          contatoreTavolo(ctx, { titolo: 'Punti Vita', campo: 'pvAttuali', attuale: s.pvAttuali, massimo: m.pv, barra: true, classe: 'riquadro-pv pv-pm-identita', extra: pilloleAR(ctx) }),
          d.difese ? h('div', { class: 'contatore-tavolo' }, h('h3', {}, 'Difese'),
            h('p', { class: 'valore-tavolo' }, h('span', {}, 'VA '), valoreEffettivo('Difese', d.difese.effettivo, d.difese.totale, d.difese.scomposizione, { pillola: true, provenienza: d.difese.provenienza }),
              condizionaliValore(ctx, 'Difese', (ctx.tab.scheda.abilita ?? []).find((x) => x.nome === 'Difese')?.disponibili ?? [])),
            // §3.5.5, Disciplina Guardia: bonus a Difese contro gli attacchi ravvicinati (con Padronanza
            // della Disciplina anche a distanza); Controllo con Padronanza: resistere alle Manovre
            ...valoriDisciplina(ctx.tab.scheda, ctx.dati).map((t) => h('p', { class: 'nota' },
              `${t.testo}: `, t.contro === 'resistenza' ? h('strong', {}, segno(t.valore)) : h('strong', {}, `VA ${numero(d.difese.effettivo + t.valore)}`),
              t.contro === 'resistenza' ? ` (${t.nome})` : ` (${segno(t.valore)} ${t.nome})`)),
            istintive.length ? h('p', { class: 'proprieta-arma' }, istintive.map((t) => h('span', { class: 'etichetta', title: t.testo }, t.nome))) : null) : null,
          ...riquadriTavolo(ctx)),
        idt?.salvezze ? h('div', { class: 'contatore-tavolo salvezze-tavolo' }, h('h3', {}, 'Prove Salvezza'),
          h('p', { class: 'valore-tavolo pillole-salvezze' }, idt.salvezze.map((x) => h('span', { class: 'salvezza-pillola' }, h('small', { class: 'sigla' }, `${x.nome} `),
            valoreEffettivo(x.nome, x.effettivo, x.totale, x.scomposizione, { pillola: true, provenienza: x.provenienza })))),
          usiSalvezze(ctx, idt.salvezze)) : null,

        sezione('In mano',
          mani.length ? h('div', { class: 'riquadri-mani' }, mani) : h('p', { class: 'vuoto' }, 'Nessuna arma impugnata né scudo imbracciato: scegli qui sotto, o nella tab Inventario.'),
          senzArmiDisponibile(ctx.tab.scheda, ctx.dati) ? h('div', { class: 'armi-tab' }, schedaSenzArmi(ctx)) : null,
          schedaOnda(ctx),
          h('p', { class: 'nota' }, 'Caricatori di riserva e condizione delle armi qui si vedono soltanto: si cambiano nella tab Inventario. «Ricarica» consuma dalle riserve.')),

        sezione('Armi disponibili',
          oggettiDisponibili(ctx, ['arma_ravvicinata', 'arma_distanza'], { verbo: () => 'Impugna', statoAttivo: (r) => (r.stati.includes('impugnata') ? 'impugnata' : null), soloNonAttivi: true })
            ?? h('p', { class: 'vuoto' }, 'Nessun’altra arma con sé.'),
          // Artefatti che potenziano i pugni (Guanti da Combattimento Mistico, Armamenti §7.24): si indossano da qui
          oggettiDisponibili(ctx, ['artefatto'], { verbo: () => 'Indossa', statoAttivo: (r) => (r.stati.includes('indossata') ? 'indossata' : null), soloNonAttivi: true,
            filtro: (r) => (r.def?.effetti ?? []).some((e) => e.attacchi === 'senz_armi') })),

      sezione('Protezioni',
        vistaRapidaProtezioni(ctx, d),
        protezioniDisponibili(ctx),
        d.protezioniCalcolate.length
        ? h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta' },
          h('thead', {}, h('tr', {}, ['Protezione', 'AR', 'Categoria o taglia', 'Parata', 'Penalità', 'FOR'].map((c) => h('th', {}, c)))),
          h('tbody', {}, d.protezioniCalcolate.flatMap((p) => [
            h('tr', {},
              h('th', { scope: 'row' }, p.nome, p.rinforzo ? h('small', { class: 'sigla' }, ` + ${p.rinforzo.nome}`) : null),
              h('td', { class: 'forte' }, p.tipo === 'elmetto' ? '—' : testoAr(p.ar)),
              h('td', { title: p.categoriaBase && p.categoria !== p.categoriaBase ? 'Leggera portata ad AR 3 o più da un rinforzo: penalità della Media (§7.11.2)' : null },
                p.tipo === 'elmetto' ? 'Elmetto' : p.categoria !== p.categoriaBase && p.categoriaBase ? `${p.categoriaBase} → ${p.categoria}` : p.categoria ?? p.taglia ?? '—'),
              h('td', { title: p.parata ? `Difese ${p.parata.difese} + modificatori dello Scudo ${segno(p.parata.modificatori.ravvicinata)} / ${segno(p.parata.modificatori.distanza)} (§7.4.11)` : null },
                p.parata ? [
                  valoreEffettivo(`Parata ravvicinata (${p.nome})`, p.parata.ravvicinataEffettiva ?? p.parata.ravvicinata, p.parata.daRegole, p.parata.scomposizioneRavvicinata, { provenienza: p.parata.provenienzaRavvicinata }), ' ravv. · ',
                  valoreEffettivo(`Parata a distanza (${p.nome})`, p.parata.distanzaEffettiva ?? p.parata.distanza, p.parata.daRegole, p.parata.scomposizioneDistanza, { provenienza: p.parata.provenienzaDistanza }), ' dist.',
                ] : '—'),
              h('td', {}, testoPenalitaTab({ ...p.penalita, movimento_q: (p.penalita?.movimento_q ?? 0) + (p.mov ?? 0) || undefined })),
              h('td', {}, p.forRichiesta ? `${p.forRichiesta}${p.forMancante ? ` (−${p.forMancante} VA${p.tipo === 'scudo' ? ' a Parate e attacchi con lo Scudo' : ''})` : ''}` : '—')),
            ...p.alternative.map((a) => h('tr', { class: 'alternativa' },
              h('td', { colspan: 6 }, h('small', {}, `↳ ${a.condizione}: `,
                [a.ar ? `AR ${testoAr(a.ar)}` : null, a.parata ? `Parata ${numero(a.parata.ravvicinata)} ravv. · ${numero(a.parata.distanza)} dist.` : null,
                  a.forRichiesta ? `FOR ${a.forRichiesta}` : null, a.penalita ? `penalità: ${testoPenalitaTab(a.penalita)}` : null].filter(Boolean).join(' · '))))),
            p.proprieta.length ? h('tr', { class: 'alternativa' }, h('td', { colspan: 6 },
              h('span', { class: 'proprieta-arma' }, p.proprieta.map((x) => h('span', { class: 'etichetta', title: x.testo }, x.nome))))) : null,
            // effetti tipizzati delle proprietà e promemoria (docs/effetti-oggetti.md, docs/proprieta-armature.md)
            p.modifiche?.length || p.effetti?.some((e) => e.proprieta) || p.promemoria?.length ? h('tr', { class: 'alternativa' }, h('td', { colspan: 6 }, h('small', {},
              p.modifiche?.length ? [h('strong', {}, p.tipo === 'armatura' ? 'Elmetto standard con: ' : 'Modifiche: '), p.modifiche.join(', '), '. '] : null,
              p.effetti?.some((e) => e.proprieta) ? [h('strong', {}, 'Effetti: '), p.effetti.filter((e) => e.proprieta).map((e) => testoEffettoOggetto(e)).join(' · '), '. '] : null,
              p.promemoria?.length ? [h('strong', {}, 'Promemoria: '), p.promemoria.join(', '), '.'] : null))) : null,
          ]))))
        : h('p', { class: 'vuoto' }, 'Nessuna protezione indossata o imbracciata.'),
        resistenze(ctx),
        d.protezioniCalcolate.length ? h('p', { class: 'nota' }, 'Agilità vale per Schivata e Prove fisiche di Atletica e Furtività ostacolate (già nel VA di quelle Abilità, colonna Equip); non per la Parata. La penalità MOV si sottrae una volta al budget di movimento (§7.11.1). La Parata con lo Scudo è già calcolata: Difese con l’equipaggiamento, modificatori propri dello Scudo (§7.4.11) e FOR insufficiente (§7.1.6). L’AR dello Scudo vale anche senza Parata, purché sia imbracciato; due scudi non si sommano (§7.4).') : null),

      // §7.10: sintonizzazione e riserve stanno nella tab Artefatti (docs/layout-sd.md, pezzo 4)
      ctx.tab.scheda.equipaggiamento?.sintonizzazione ? h('p', { class: 'nota' }, 'Artefatti: sintonizzazione, attivazioni e riserve di Chroma nella tab Artefatti; qui le armi e le protezioni Artefatto mostrano già i loro effetti nei valori.') : null,

        sanitari.length ? h('p', { class: 'nota' }, `Kit e dispositivi sanitari (${sanitari.map((c) => c.nome).join(', ')}): le applicazioni si contano nella tab Inventario (§7.19).`) : null),

      h('aside', { class: 'colonna-stati', 'aria-label': 'Ferite, Affaticamento, Corruzione e Stati' },
        selettoreLuce(ctx),
        ...condizioniModificabili(ctx, d))),
  ];
}

/**
 * Ferite, Affaticamento, Corruzione e Stati modificabili: la colonna destra del Combattimento e, per A.60 (E&L del
 * 05/10/2026), anche della tab Abilità, con gli stessi campi della sessione.
 * @param d dati della tab Combattimento (affaticamento, corruzione, stati)
 */
/** Riquadro delle Ferite (§5.14), modificabile: colonna destra di Combattimento e Abilità, e sotto i PV in Identità. */
function riquadroFerite(ctx) {
  const m = ctx.massimi;
  const ferite = Array.from({ length: m.ferite + 1 }, (_, n) => ({ n, ...descriviFerite(n, ctx.dati) }))
    .map((g) => ({ nome: g.nome, breve: g.n === 0 ? 'Nessuna' : g.n > ctx.dati.regole.ferite.stati.length ? 'Oltre' : g.nome, penalita: g.penalita, descrizione: g.menomazione ?? null }));
  return gradiCompatti(ctx, { titolo: 'Ferite (§5.14)', campo: 'ferite', attuale: ctx.sessione.ferite, gradi: ferite,
    nota: 'Ogni nuova Ferita fa avanzare di un gradino. La penalità è cumulativa a VA e Prove Salvezza.' });
}

function condizioniModificabili(ctx, d) {
  const s = ctx.sessione;
  return [
        riquadroFerite(ctx),
        gradiCompatti(ctx, { titolo: 'Affaticamento (§5.19)', campo: 'affaticamento', attuale: s.affaticamento, gradi: d.affaticamento,
          nota: 'Si applica solo la penalità dello Stato attuale, a tutte le Prove di Caratteristica, Abilità e Salvezza.' }),
        d.corruzione?.length ? gradiCompatti(ctx, { titolo: 'Corruzione (§5.20)', campo: 'corruzione', attuale: s.corruzione ?? 0,
          gradi: d.corruzione.map((x) => ({ nome: x.nome, penalita: x.penalita, descrizione: x.manifestazioni })),
          nota: 'Corruzione Oscura (CROS): si applica solo la penalità dello Stato attuale, a tutte le Prove di Caratteristica, Abilità e Salvezza, comprese quelle contro ulteriori esposizioni. Non cambia Iniziativa, Movimento, Azioni, danni, Armatura, PV e PM. Oscuro: il personaggio diventa un PNG. «Nuova sessione» non la azzera.' }) : null,
        h('section', { class: 'riquadro riquadro-gradi', 'aria-label': 'Stati attivi' },
          h('header', { class: 'testa-gradi' }, h('h3', {}, 'Stati (§5.18)'),
            h('span', { class: `grado-attuale${s.statiAttivi.length ? ' con-penalita' : ''}` }, s.statiAttivi.length ? `${s.statiAttivi.length} attiv${s.statiAttivi.length === 1 ? 'o' : 'i'}` : 'nessuno')),
          h('ul', { class: 'stati-compatti' }, d.stati.map((st) => {
            const attivo = s.statiAttivi.includes(st.id);
            // durata registrata nella plancia dello scontro (src/round-scontro.js)
            const durata = attivo ? ctx.roundScontro?.durate?.find((d) => d.stato === st.id) : null;
            // perdita di PV a ogni Round registrata nella plancia (§5.15, §5.18): valore e fonte
            const perdita = attivo ? ctx.roundScontro?.periodici?.find((p) => p.stato === st.id) : null;
            return h('li', {}, h('label', { class: `stato-compatto${attivo ? ' attivo' : ''}` },
              h('input', { type: 'checkbox', checked: attivo, onchange: () => ctx.azioni.commutaStato(st.id) }),
              h('span', {}, st.nome),
              perdita ? h('small', { class: 'nota motivo', title: `${st.periodico?.paragrafo ?? '§5.18'}: la perdita la applica la plancia all’Iniziativa della fonte${perdita.fonte ? ` (${perdita.fonte})` : ' (alla fine del Round)'}, una volta per Round` }, ` · ${perdita.valore ?? perdita.formula} PV per Round`) : null,
              durata ? h('small', { class: 'nota', title: `fino alla fine del Round ${durata.al}, dallo scontro` }, ` · ${durata.rimasti} Round`) : null),
            infoValore('?', { titolo: st.nome, sottotitolo: st.durata, sezioni: [{ testo: `${st.promemoria}${st.riassunto ? ' (riassunto, non testo del manuale)' : ''}` }] }, { classe: 'info-gradi' }));
          }))),
  ];
}

/** Voci risolte delle protezioni del personaggio (non in deposito): armature, scudi, elmetti, rinforzi. */
function protezioniDelPg(ctx) {
  const cat = catalogo(ctx.dati);
  return (ctx.scelte.equipaggiamento ?? []).map((v) => risolvi(v, cat))
    .filter((r) => ['armatura', 'scudo', 'elmetto', 'rinforzo'].includes(r.tipo) && !r.deposito && !r.fuoriCatalogo);
}

/**
 * A.60 e A.110: vista rapida di armatura, rinforzi, scudo ed elmetto addosso, con i tempi per indossarli o toglierli
 * (regole.json → protezioni_rapide.tempi, src/equipaggiamento.js → tempiProtezione).
 */
function vistaRapidaProtezioni(ctx, d) {
  const P = ctx.dati.regole.protezioni_rapide;
  if (!P) return null;
  const voci = protezioniDelPg(ctx).filter((r) => r.attivo);
  const tempo = (r) => tempiProtezione(r, ctx.dati)?.testo ?? null;
  const righe = P.voci.map((x) => {
    const presenti = voci.filter((r) => r.tipo === x.tipo);
    const calcolata = (r) => d.protezioniCalcolate.find((p) => p.nome === r.nome);
    // rinforzi montati sull'armatura e indossati da soli (soprabiti, mantelli, Tabardo, Sottogiacca)
    const rinforzi = x.tipo === 'armatura' ? voci.filter((r) => r.tipo === 'rinforzo') : [];
    return h('li', {}, h('strong', {}, `${x.nome}: `),
      presenti.length ? presenti.map((r, k) => [k ? '; ' : '', r.nome, calcolata(r)?.ar && x.tipo !== 'elmetto' ? ` (AR ${testoAr(calcolata(r).ar)})` : '',
        tempo(r) ? h('small', { class: 'nota' }, ` · ${tempo(r)}`) : null]) : x.vuoto ?? '—',
      rinforzi.length ? h('span', { class: 'nota' }, ' · rinforzi: ', rinforzi.map((r, k) => [k ? ', ' : '', r.nome, tempo(r) ? ` (${tempo(r)})` : ''])) : null);
  });
  return h('div', { class: 'riquadro vista-protezioni' }, h('h3', {}, 'Protezioni addosso'), h('ul', {}, righe),
    ctx.roundScontro ? h('p', { class: 'nota' }, P.round) : null);
}

/**
 * A.110: «Indossa» / «Togli» (scudo: «Imbraccia» / «Riponi») con i tempi. Nel Round (scontro aperto) le protezioni in AzP
 * spendono l'Azione, armature e rinforzi strutturali no (servono minuti); la Sottogiacca IES sotto un'armatura no.
 * I rinforzi strutturali si montano dall'Inventario («Montata su:»).
 */
function protezioniDisponibili(ctx) {
  const voci = protezioniDelPg(ctx).filter((r) => r.tipo !== 'rinforzo' || r.def?.indossabile_da_solo);
  if (!voci.length) return null;
  const armaturaIndossata = voci.some((r) => r.tipo === 'armatura' && r.attivo);
  const inRound = !!ctx.roundScontro;
  const prova = (r, verso, stato) => {
    const c = cambioProtezione(r, verso, { inRound, armaturaIndossata: armaturaIndossata && !(r.tipo === 'armatura') }, ctx.dati);
    if (!c.ammesso) { avviso(`${r.nome}: ${c.motivo}.`, { tipo: 'errore' }); return; }
    // soprabiti, mantelli e Tabardo con un'armatura addosso: si fissano su di lei («Montata su:»), senza un montaggio in
    // più (A.110); da soli si indossano
    const armatura = voci.find((x) => x.tipo === 'armatura' && x.attivo);
    if (verso === 'indossa' && r.tipo === 'rinforzo' && armatura && r.stati.includes('in_uso')) {
      ctx.azioni.equipaggiamento((ctx.scelte.equipaggiamento ?? []).map((v) => (v.uid === r.uid ? { ...v, stato: 'in_uso', montato_su: armatura.uid } : v)));
    } else cambiaStato(ctx, r.uid, stato);
    if (c.testo) avviso(`${r.nome}: ${c.testo}`, { tipo: c.azp ? 'info' : 'ok' });
  };
  return h('ul', { class: 'elenco-disponibili' }, voci.map((r) => {
    const t = tempiProtezione(r, ctx.dati);
    const attivo = ['indossata', 'imbracciato'].find((x) => r.stati.includes(x)) ?? null;
    return h('li', { class: r.attivo ? 'attivo' : null },
      h('span', {}, h('strong', {}, r.nome), h('small', { class: 'sigla' }, ` · ${NOMI_STATI[r.voce.stato] ?? 'Con sé'}`),
        t ? h('small', { class: 'nota', title: t.condizione ?? null }, ` · ${t.testo}`) : null),
      r.attivo
        ? h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => prova(r, 'togli', statoRiposto(r.stati)) }, r.tipo === 'scudo' ? 'Riponi' : 'Togli')
        : attivo ? h('button', { type: 'button', class: 'btn btn-piccolo primario', onclick: () => prova(r, 'indossa', attivo) }, r.tipo === 'scudo' ? 'Imbraccia' : 'Indossa') : null);
  }));
}

/**
 * A.106 (E&L del 05/10/2026): luce sul bersaglio o sull'oggetto osservato, nella sessione (regole.json →
 * illuminazione). Penombra e luce molto scarsa entrano nei VA effettivi di attacchi e Difese e nella Percezione
 * visiva (valore a parte); il buio vale Accecato. Con una visione del personaggio, la casella la applica.
 */
export function selettoreLuce(ctx, { compatto = false } = {}) {
  const L = ctx.dati.regole.illuminazione;
  if (!L) return null;
  const s = ctx.sessione ?? {};
  const attuale = L.livelli.some((x) => x.id === s.luce) ? s.luce : L.livelli.find((x) => x.base)?.id;
  const liv = L.livelli.find((x) => x.id === attuale);
  const visioni = visioniPersonaggio(ctx.scelte?.equipaggiamento, s, ctx.dati);
  const contenuto = [
    rigaScelte('Luce sul bersaglio (A.106)', L.livelli.map((x) => ({ valore: x.id, etichetta: x.nome, riga: x.riga })), attuale, (x) => ctx.azioni.imposta('luce', x)),
    !compatto && liv?.descrizione ? h('p', { class: 'nota' }, liv.descrizione) : null,
    visioni.length && (L.visione?.elimina ?? []).includes(attuale)
      ? h('label', { class: 'casella-luce', title: L.visione.testo }, h('input', { type: 'checkbox', checked: s.luceVisione === true, onchange: (e) => ctx.azioni.imposta('luceVisione', e.target.checked) }),
        ` La tua visione copre il bersaglio (entro ${visioni.map((v) => `${v.portata_q} Q`).join(' o ')}): nessuna penalità`) : null,
  ];
  return compatto ? h('div', { class: 'scelta-luce' }, contenuto) : h('section', { class: 'riquadro riquadro-luce', 'aria-label': 'Luce' }, contenuto);
}

/**
 * A.116: con luce non sufficiente, «Richiede la vista» per le Abilità il cui uso dipende dalla vista: predefinite dagli
 * esempi della risposta (regole.json → illuminazione.richiede_vista), correggibili dal Direttore. Attacchi e Difese la
 * ricevono sempre, Percezione ha il suo valore visivo, Potere e Prove Salvezza mai.
 */
function caselleVista(ctx) {
  const L = ctx.dati.regole.illuminazione;
  const s = ctx.sessione ?? {};
  if (!L?.richiede_vista || !L.livelli.some((x) => x.id === s.luce && !x.base)) return null;
  const lista = abilitaVista(s, ctx.dati);
  const scelte = s.vistaAbilita ?? {};
  return h('div', { class: 'scelta-attacco scelta-gruppo caselle-vista', role: 'group', 'aria-label': 'Prove che richiedono la vista' },
    h('p', { class: 'scelta-titolo' }, 'Richiede la vista (A.116): la penalità di luce vale per queste Prove'),
    h('div', { class: 'scelta-pulsanti' }, lista.map((x) => h('button', {
      type: 'button', class: `btn scelta-btn${x.attiva ? ' scelta' : ''}`, 'aria-pressed': String(x.attiva),
      title: x.uso ? `Di solito sì: ${x.uso}. Il Direttore può correggere.` : 'Di solito no (conoscenze, ascolto): il Direttore può correggere.',
      onclick: () => ctx.azioni.imposta('vistaAbilita', { ...scelte, [x.nome]: !x.attiva }),
    }, x.nome))),
    h('small', { class: 'nota' }, `Attacchi e Difese la ricevono sempre; Percezione ha il suo valore visivo; mai Potere e Prove Salvezza. Nel buio: ${L.richiede_vista.testo_buio}.`));
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
/** Profilo «Senz'armi»: 1d4 o il dado dei Talenti, con il bonus di FOR (§5.13). */
function senzArmi(ctx) {
  return profiloSenzArmi(ctx.tab.scheda, ctx.dati);
}

/** Onda Interiore in corso (§8.9.4): il pugno proiettato a distanza, con «Attacca!». null altrimenti. */
function schedaOnda(ctx) {
  const a = profiloOndaInteriore(ctx.tab.scheda, ctx.sessione, ctx.dati);
  if (!a) return null;
  return h('div', { class: 'armi-tab' }, h('article', { class: 'arma-tab macro-tecnica' },
    h('div', { class: 'arma-testa' },
      h('h3', {}, a.nome, h('small', { class: 'sigla' }, ` · ${a.abilita} · ${a.tecnica.etichetta.replace(/^Tecnica: [^(]*/, '')}`)),
      a.va !== null ? h('button', { type: 'button', class: 'btn primario btn-attacca', onclick: () => { ctx.ui.attacco = { uid: ONDA, passo: 0 }; ctx.azioni.ridisegna(); } }, 'Attacca!') : null),
    h('div', { class: 'arma-valori' },
      h('p', { class: 'valore-tavolo' }, h('span', {}, 'VA '), a.va === null ? h('strong', {}, '—') : valoreEffettivo(`VA Onda Interiore (${a.abilita})`, a.vaEffettivo, a.va, a.scomposizione, { pillola: true, provenienza: a.provenienza })),
      h('p', {}, h('span', { class: 'sigla' }, 'Danno '), dannoConProvenienza(a, a.danno.una_mano ?? '—'), h('small', { class: 'sigla' }, ` ${a.natura}`)),
      h('p', {}, h('span', { class: 'sigla' }, 'Gittata '), `${a.portataQ} Q`))));
}

/** Voce fissa «Senz'armi» fra le armi (se non impugna nulla, ha Arti Marziali o è Lottatore). */
function schedaSenzArmi(ctx) {
  const a = senzArmi(ctx);
  const ultima = ctx.sessione.attacchi?.[SENZ_ARMI]?.ultima ?? null;
  return h('article', { class: 'arma-tab' },
    h('div', { class: 'arma-testa' },
      h('h3', {}, a.nome, h('small', { class: 'sigla' }, ` · ${a.abilita}`)),
      a.va !== null ? h('button', { type: 'button', class: 'btn primario btn-attacca', onclick: () => { ctx.ui.attacco = { uid: SENZ_ARMI, passo: 0 }; ctx.azioni.ridisegna(); } }, 'Attacca!') : null),
    h('div', { class: 'arma-valori' },
      h('p', { class: 'valore-tavolo' }, h('span', {}, 'VA '), a.va === null ? h('strong', {}, '—') : valoreEffettivo(`VA senz’armi (${a.abilita})`, a.vaEffettivo, a.va, a.scomposizione, { pillola: true, provenienza: a.provenienza })),
      h('p', {}, h('span', { class: 'sigla' }, 'Danno '), dannoConProvenienza(a, a.danno.una_mano ?? '—'),
        h('small', { class: 'sigla' }, ` (${a.dannoOrigine === 'base' ? 'base' : a.dannoOrigine}${a.bonusCaratteristica?.bonus ? `, ${a.bonusCaratteristica.sigla} ${segno(a.bonusCaratteristica.bonus)}` : ''})${a.natura ? ` · ${a.natura}` : ''}`)),
      h('p', {}, h('span', { class: 'sigla' }, 'Portata '), `${a.portataQ} Q`)),
    pugniPotenziati(ctx.tab.scheda) ? h('p', { class: 'nota' }, `${pugniPotenziati(ctx.tab.scheda).nome}: +1 VA sempre; l’attivazione (PM della riserva interna) si accende nella tab Artefatti e vale qui finché dura.`) : null,
    ultima ? h('p', { class: 'nota' }, `Ultima Manovra: ${ultima.nome}`) : null);
}

/**
 * Bonus alle Prove Salvezza per un uso specifico (effetti «salvezza» dell'equipaggiamento in uso:
 * Filtro respiratorio, Protezione occulta, Elusione…): il valore per quell'uso accanto alla PS, o
 * «+X alla PS già prevista» quando il manuale non dice quale.
 */
function usiSalvezze(ctx, salvezze) {
  const effetti = (ctx.tab.scheda.equipaggiamento?.effettiOggetti ?? []).filter((e) => e.tipo === 'salvezza');
  // Talenti (Resistenze, Addestramento Militare…): già calcolati, con il tetto delle Resistenze (§8.6)
  const talenti = ctx.tab.scheda.usiSalvezzeTalenti ?? [];
  if (!effetti.length && !talenti.length) return null;
  return h('ul', { class: 'usi-salvezze nota' }, effetti.map((e) => {
    const s = e.salvezza ? salvezze.find((x) => x.id === e.salvezza || x.nome.toLowerCase() === e.salvezza) : null;
    return h('li', { title: [e.condizione, e.fonte].filter(Boolean).join(' — ') },
      s ? [h('strong', {}, `${s.nome} ${numero(s.effettivo + e.valore)}`), ` solo ${e.uso} (${segno(e.valore)} ${e.oggetto})`]
        : [h('strong', {}, `${segno(e.valore)} alla PS già prevista`), ` ${e.uso} (${e.oggetto})`]);
  }), talenti.map((u) => h('li', { title: [u.condizione, u.fonte, u.limitato ? 'Limitato dal tetto della Salvezza (Giocatore §8.6)' : null].filter(Boolean).join(' — ') },
    u.nome ? [h('strong', {}, `${u.nome} ${numero(u.valore)}`), ` solo ${u.uso} (${segno(u.modificatore)} ${u.talento}${u.limitato ? ', al tetto' : ''})`]
      : [h('strong', {}, `${segno(u.modificatore)} alla Prova prevista`), ` ${u.uso} (${u.talento})`])));
}

/** Resistenze delle protezioni in uso: Contromisure (soglie del §5.24) e AR contro un tipo di danno. */
function resistenze(ctx) {
  const effetti = (ctx.tab.scheda.equipaggiamento?.effettiOggetti ?? []).filter((e) => e.tipo === 'contromisura' || e.tipo === 'ar_contro' || e.tipo === 'caratteristica');
  if (!effetti.length) return null;
  return h('p', { class: 'resistenze' }, h('strong', {}, 'Resistenze e usi specifici: '),
    effetti.map((e, i) => [i ? ' · ' : '', h('span', { title: [e.condizione, e.fonte].filter(Boolean).join(' — ') }, `${testoEffettoOggetto(e)} (${e.oggetto})`)]));
}

/** Tooltip del bonus di Caratteristica al danno (§5.13). */
function testoBonusCaratteristica(bc) {
  if (!bc) return null;
  if (bc.esclusoDa) return `${bc.esclusoDa}: niente bonus di ${bc.sigla} al danno (§5.13).`;
  return `Bonus di ${bc.sigla} al danno: ${segno(bc.bonus)} (${bc.sigla} ${bc.valore}, con il tetto del livello; §5.13). Già compreso nel danno.`;
}

function schedaArma(ctx, a) {
  const legenda = legendaModalita(ctx.dati);
  const mr = a.munizioneRiferimento;
  // §7.8: il danno dei lanciatori è quello della munizione caricata (qui la munizione di riferimento)
  const dannoTesto = a.dannoDaMunizione
    ? (mr ? aggiungiDanno(mr.danno, a.bonusDanno + (a.bonusCaratteristica?.bonus ?? 0)) : `dalla munizione${a.munizioni?.riferimento ? ` (${a.munizioni.riferimento})` : ''}`)
    : testoDanno(a.danno);
  return h('article', { class: `arma-tab${a.moduloDi ? ' modulo' : ''}` },
    h('div', { class: 'arma-testa' },
      h('h3', {}, a.nome, h('small', { class: 'sigla' }, ` · ${a.abilita ?? 'Abilità non indicata'}`)),
      // A.44: un’arma o uno scudo Rotti (0 PI) non possono attaccare finché non vengono riparati
      a.va !== null ? h('button', { type: 'button', class: 'btn primario btn-attacca', disabled: !!a.rotta || a.condizioneArma?.utilizzabile === false,
        title: a.rotta ? 'Rotto (0 PI): non può attaccare finché non viene riparato (§7.2.1, A.44).' : a.condizioneArma?.utilizzabile === false ? `${a.condizioneArma.nome}: ${a.condizioneArma.testo}` : null,
        onclick: () => { ctx.ui.attacco = { uid: a.uid, passo: 0 }; ctx.azioni.ridisegna(); } }, 'Attacca!') : null),
    // A.49: condizione dell'arma al tavolo (Giocatore §5.17), distinta dai PI: qui si legge, si cambia
    // nell'Inventario (docs/layout-sd.md, pezzo 3)
    a.condizioneArma && a.condizioneArma.id !== 'integra' ? h('p', { class: 'condizione-arma motivo', title: a.condizioneArma.testo }, h('span', { class: 'sigla' }, 'Condizione '), h('strong', {}, a.condizioneArma.nome)) : null,
    a.moduloDi ? h('p', { class: 'nota' }, `Modulo integrato di ${a.moduloDi}: si sceglie il profilo prima di ogni attacco; alimentazione separata (§7.8).`) : null,
    // risposta A.10: stato al tavolo dell'attacco (lama estratta), lo stesso interruttore della tab Abilità
    a.statoAlternativo ? h('label', { class: `stato-tavolo${a.statoAlternativo.acceso ? ' attivo' : ''}` },
      h('input', { type: 'checkbox', checked: !!a.statoAlternativo.acceso, onchange: () => ctx.azioni.condizioneOggetto(a.statoAlternativo.chiave) }),
      h('span', {}, h('strong', {}, a.statoAlternativo.nome.replace(/^./, (c) => c.toUpperCase())), h('small', {}, ` · cambiare costa ${a.statoAlternativo.costo}`))) : null,
    h('div', { class: 'arma-valori' },
      h('p', { class: 'valore-tavolo' }, h('span', {}, 'VA '), a.va === null ? h('strong', {}, '—') : valoreEffettivo(`VA per colpire (${a.nome})`, a.vaEffettivo ?? a.va, a.vaDaRegole ?? a.va, a.scomposizione, { pillola: true, provenienza: a.provenienza })),
      h('p', {}, h('span', { class: 'sigla' }, 'Danno '), dannoConProvenienza(a, dannoTesto)),
      a.ac !== null && a.ac !== 1 ? h('p', {}, h('span', { class: 'sigla', title: 'Applicazioni di danno per colpo a segno' }, 'AC '), a.ac === 'munizione' ? (mr ? String(mr.ac) : 'dalla munizione') : String(a.ac)) : null,
      mr ? h('p', {}, h('span', { class: 'sigla', title: 'Raggio di scoppio della munizione (§5.10)' }, 'RS '), `${mr.rs_q} Q`) : null,
      a.portataQ ? h('p', {}, h('span', { class: 'sigla' }, 'Portata '), `${a.portataQ} Q`) : null,
      a.gittataQ ? h('p', {}, h('span', { class: 'sigla' }, 'Gittata '), `${a.gittataQ} Q`, a.gittataFormula ? h('small', { class: 'sigla' }, ` (${a.gittataFormula})`) : null) : null,
      a.inc ? h('p', {}, h('span', { class: 'sigla', title: 'Affidabilità (tabella di Inceppamento)' }, 'INC '), String(a.inc)) : null,
      a.parata ? h('p', {}, h('span', { class: 'sigla' }, 'Parata '),
        h('strong', {}, valoreEffettivo(`Parata (${a.nome})`, a.parata.vaEffettivo ?? a.parata.va, a.parata.vaDaRegole ?? a.parata.va, a.parata.scomposizione, { provenienza: a.parata.provenienza })),
        a.parata.distanza !== null && a.parata.distanza !== undefined ? h('small', { class: 'sigla', title: 'Parata a distanza con un’arma: −8 VA (Giocatore §5.9)' }, ` · a distanza ${numero(a.parata.distanzaEffettiva ?? a.parata.distanza)}`) : null) : null),
    a.componenti.length ? h('p', { class: 'nota' }, a.componenti.map((c) => `${c.nome} ${segno(c.valore)}`).join(' · '),
      a.bonusDanno ? ` · danno +${a.bonusDanno} (${a.specializzazione})` : null,
      a.bonusCaratteristica?.bonus ? ` · danno ${segno(a.bonusCaratteristica.bonus)} (${a.bonusCaratteristica.sigla} ${a.bonusCaratteristica.valore}, §5.13)` : null,
      a.bonusCaratteristica?.esclusoDa ? ` · niente bonus di ${a.bonusCaratteristica.sigla} al danno (${a.bonusCaratteristica.esclusoDa})` : null) : null,
    a.modalita.length ? h('p', { class: 'proprieta-arma' }, h('span', { class: 'sigla' }, 'Modalità '),
      a.modalita.map((m) => etichettaModalita(ctx, m, legenda[m]))) : null,
    a.mov ? h('p', { class: 'nota' }, `MOV ${segno(a.mov)} Q mentre è impugnata (§7.7)`) : null,
    a.famigliaMunizioni || a.scorte?.length ? h('p', { class: 'nota' }, h('strong', {}, 'Munizioni: '),
      a.famigliaMunizioni ? `${NOMI_FAMIGLIE_MUNIZIONI[a.famigliaMunizioni]} (§7.20.9)` : null,
      // quantità rimasta: la voce meno quanto inserito ricaricando nella sessione (src/ricarica.js)
      a.scorte?.length ? `${a.famigliaMunizioni ? ' · ' : ''}in lista: ${a.scorte.map((x) => `${x.nome} ×${Math.max(0, x.quantita - (ctx.sessione.scorte?.[x.uid] ?? 0))}${ctx.sessione.scorte?.[x.uid] ? ` (di ${x.quantita})` : ''}`).join(', ')}` : null) : null,
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
      : a.tipo === 'arma_distanza' || a.munizioni?.capacita ? pannelloMunizioni(ctx, a, { riserveModificabili: false }) : null);
}

const ETICHETTE_MUNIZIONI = { colpi: 'Caricatore', cariche: 'Cariche nella cella', PM: 'PM nella riserva', applicazioni: 'Applicazioni', dosi: 'Dosi', set: 'Set di materiali' };
const SANITARI = ['applicazioni', 'dosi', 'set'];

const MODI_RICARICA = {
  caricatore: 'si sostituisce un caricatore pieno di riserva; quello tolto resta, vuoto o parziale (§7.20.2)',
  inserimento: 'si inseriscono munizioni sciolte compatibili fino alla capacità',
  // armi caricate direttamente (A.135): il testo sta nei dati (munizioni.json → ricarica.inserimento_singolo.testo)
  singolo: 'fino a 2 cartucce per operazione, 1 AzP (A.135)',
  cella: 'una cella piena compatibile sostituisce quella esaurita',
};

/** Riga dei carichini di un'arma (A.135): colpi di ogni carichino, «Usa carichino» e «Prepara». */
function rigaCarichini(ctx, a, info, m, capacita) {
  const C = ctx.dati.equipaggiamento.file.munizioni.ricarica.carichini;
  const stati = info.carichini.flatMap((c) => carichiniDi(ctx.sessione.carichini, c.uid, c.quantita, info.colpiCarichino));
  const pieni = stati.filter((n) => n > 0);
  const spazi = capacita === null ? 0 : capacita - m.colpi;
  const daRiempire = stati.some((n) => n < info.colpiCarichino) && info.scorte.some((s) => disponibili(s, ctx.sessione.scorte) > 0);
  const nome = info.carichini[0].nome;
  return h('div', { class: 'riga-munizioni carichini-tavolo' },
    h('span', {}, `${nome}: `, stati.map((n, i) => h('span', { class: `carichino${n ? '' : ' vuoto'}`, title: n ? `${n} colpi` : 'vuoto' }, `${i ? ' · ' : ''}${n}/${info.colpiCarichino}`))),
    h('button', { type: 'button', class: 'btn', disabled: !pieni.length || spazi <= 0, title: !pieni.length ? 'Nessun carichino preparato' : spazi <= 0 ? 'Arma già piena' : `Trasferisce fino a ${C?.per_operazione ?? 6} colpi in 1 AzP, entro gli spazi liberi; il resto rimane nel carichino (A.135)`,
      onclick: () => ctx.azioni.usaCarichino(a.uid) }, `Usa carichino +${Math.min(spazi, Math.max(0, ...pieni)) || 0}`),
    h('button', { type: 'button', class: 'btn', disabled: !daRiempire, title: daRiempire ? `Riempie un carichino con le munizioni sciolte compatibili: ${C?.preparazione ?? 'fuori dal combattimento'} (A.135)` : 'Nessun carichino da riempire o nessuna munizione compatibile',
      onclick: () => ctx.azioni.preparaCarichino(a.uid) }, 'Prepara'));
}

/**
 * Modalità tavolo: colpi nel caricatore e, per le armi a distanza, ricarica dalle riserve
 * (Giocatore §5.1.1, Armamenti §7.20.2, src/ricarica.js): caricatori pieni di riserva (+/−),
 * parziali e vuoti tolti, munizioni sciolte o celle dell'inventario. «Ricarica» è disabilitato,
 * con il motivo, se non c'è niente di compatibile. Le altre riserve si contano a mano.
 */
function pannelloMunizioni(ctx, a, { riserveModificabili = true } = {}) {
  // Armamenti §7.20.3: una granata da lancio non ha caricatore; ogni lancio consuma una granata della voce
  if (a.granata) {
    return h('div', { class: 'munizioni-tavolo' }, h('div', { class: 'riga-munizioni' }, h('span', {}, 'Granate ', h('strong', {}, String(a.granata.disponibili ?? a.granata.quantita)), ` / ${a.granata.quantita}`)),
      h('small', { class: 'nota' }, 'Ogni lancio («Attacca!») ne consuma una. La stessa granata si carica nei lanciagranate compatibili (§7.20.3); la quantità si cambia nell’Inventario.'));
  }
  const m = ctx.sessione.munizioni[a.uid] ?? { colpi: 0, riserve: 0 };
  const capacita = a.munizioni?.capacita ?? null;
  const info = a.tipo === 'arma_distanza' ? ctx.massimi.ricarica?.[a.uid] ?? null : null;
  const stato = info ? statoRicarica(info, m, ctx.sessione.scorte) : { possibile: capacita !== null && m.colpi < capacita, motivo: null, avviso: null };
  // Azione della ricarica: quella della scheda dell'arma se la dà (Balestre: «1 AzM»), altrimenti 1 AzP (Giocatore §5.1.1)
  const voceArma = (ctx.scelte.equipaggiamento ?? []).find((v) => v.uid === String(a.uid).split(':')[0]);
  const azioneRicarica = (voceArma?.rif ? catalogo(ctx.dati).perRif.get(voceArma.rif)?.ricarica : null) ?? '1 AzP, Giocatore §5.1.1';
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
      capacita !== null ? h('button', { type: 'button', class: 'btn', onclick: () => ctx.azioni.ricarica(a.uid), disabled: !stato.possibile, title: stato.motivo ?? `Ricarica (${azioneRicarica})` },
        info?.singolo ? `Ricarica +${Math.min(info.perOperazione ?? 1, capacita - m.colpi) || info.perOperazione || 1}` : 'Ricarica') : pulsante('colpi', 1, 'colpi')),
    stato.motivo && capacita !== null && m.colpi < capacita ? h('small', { class: 'motivo', role: 'status' }, `Ricarica: ${stato.motivo}.`) : null,
    stato.avviso ? h('small', { class: 'motivo' }, stato.avviso) : null,
    !info || info.modo === 'caricatore' || info.modo === null ? h('div', { class: 'riga-munizioni' },
      h('span', {}, info?.modo === 'caricatore' ? 'Caricatori pieni di riserva ' : 'Riserve ', h('strong', {}, String(m.riserve))),
      riserveModificabili ? [pulsante('riserve', -1, 'riserve'), pulsante('riserve', 1, 'riserve')] : h('small', { class: 'sigla' }, ' (si cambiano nell’Inventario)')) : null,
    info?.modo === 'caricatore' && (m.parziali?.length || m.vuoti) ? h('p', { class: 'nota riga-munizioni' },
      m.parziali?.length ? `Caricatori parziali: ${m.parziali.map((n) => `${n} colpi`).join(', ')}` : null,
      m.parziali?.length && m.vuoti ? ' · ' : null,
      m.vuoti ? `${info.vuoto?.nome ?? 'Caricatori vuoti'}: ×${m.vuoti}` : null) : null,
    // A.135: carichini rapidi del tipo dell'arma, con i colpi di ciascuno; «Usa carichino» (1 AzP, fino a 6 colpi entro gli
    // spazi liberi) e «Prepara» (fuori dal combattimento, dalle munizioni sciolte compatibili)
    info?.carichini?.length ? rigaCarichini(ctx, a, info, m, capacita) : null,
    // §7.20.3: un lanciagranate tiene un tipo di granata alla volta; cambiare tipo lo scarica (le granate tornano nell’Inventario)
    info?.granate && info.scorte.length ? h('label', { class: 'riga-munizioni campo-inline' }, h('span', {}, 'Granata caricata '),
      h('select', { 'aria-label': `Granata caricata in ${a.nome}`, onchange: (e) => ctx.azioni.scegliGranata(a.uid, e.target.value) },
        a.granataCaricata && !a.granataCaricata.uid ? h('option', { value: '', selected: true, disabled: true }, `${a.granataCaricata.nome} (di partenza)`) : null,
        info.scorte.map((x) => h('option', { value: x.uid, selected: a.granataCaricata?.uid === x.uid }, `${x.nome} ×${disponibili(x, ctx.sessione.scorte)}`))),
      h('small', { class: 'sigla' }, ' cambiare tipo scarica il lanciatore')) : null,
    info && info.modo !== 'caricatore' && info.modo !== null ? h('p', { class: 'nota riga-munizioni' },
      info.scorte.length ? `${info.modo === 'cella' ? 'Celle' : 'Munizioni sciolte'}: ${info.scorte.map((x) => `${x.nome} ×${disponibili(x, ctx.sessione.scorte)}`).join(', ')}`
        : `Nessuna ${info.modo === 'cella' ? 'cella' : 'munizione'} compatibile nell’inventario.`) : null,
    h('small', { class: 'nota' }, [
      info?.modo ? `Ricarica: ${info.singolo ? ctx.dati.equipaggiamento.file.munizioni.ricarica.inserimento_singolo?.testo ?? MODI_RICARICA.singolo : MODI_RICARICA[info.modo]}${info.singolo && info.perOperazione > 2 ? ` (tu: ${info.perOperazione}, Ricarica Migliorata)` : ''}.` : null,
      // Ricarica Rapida (Giocatore §8.6.4): una operazione gratuita per Round
      info?.modo && (ctx.tab.scheda.talentiLiberi ?? []).some((t) => t.id === ctx.dati.equipaggiamento.file.munizioni.ricarica.ricarica_rapida?.talento) ? ctx.dati.equipaggiamento.file.munizioni.ricarica.ricarica_rapida.promemoria : null,
      capacita === null ? 'Nessun caricatore nella scheda dell’arma: contatore libero.' : null,
      a.munizioni?.ricarica ? `Ricarica: ${a.munizioni.ricarica}.` : null,
      a.munizioni?.consumo ? `${a.munizioni.consumo.replace(/^./, (c) => c.toUpperCase())}.` : null,
      a.munizioni?.riferimento ? `Munizione di riferimento: ${a.munizioni.riferimento}.` : null,
      a.munizioni?.unita === 'PM' ? 'Le riserve si contano a mano.'
        : SANITARI.includes(a.munizioni?.unita) ? 'Si consuma all’inizio di ogni tentativo, anche se fallisce. Le ricariche di scorta si contano a mano.'
          : info?.modo ? null : 'Le riserve (caricatori o celle di scorta) si contano a mano: «Ricarica» non le scala.',
    ].filter(Boolean).join(' ')));
}

// ---------------------------------------------------------------------------
// Contenitori di Chroma (Magia sez. 6; Armamenti §7.5, §7.5.1, §7.10)

const AGGETTIVI_MACRO = { Fisica: 'Fisici', Mentale: 'Mentali', Spirituale: 'Spirituali' };

/** Quali Incantesimi può alimentare un contenitore, dal colore (regole.json → chroma.colori). */
function testoAlimenta(c) {
  if (c.regoleRimandate) return `Chroma ${c.energia} (energia ${c.energiaNome ?? '—'}): regole di impiego rimandate (Magia sez. 6).`;
  // Magia §26.2: le Cariche alimentano soltanto il proprio Artefatto (le armi del §7.5.1, risposta A.18);
  // una Batteria integrata è anche una fonte per gli Incantesimi compatibili
  if (c.integrato && !c.fontePg) return `Cariche, energia ${c.energiaNome}: alimentano soltanto le attivazioni dell’oggetto; non pagano Incantesimi e non si prelevano (Magia §26.2).`;
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

/**
 * Attivazione a durata di un Artefatto (Guanti da Combattimento Mistico, Armamenti §7.24): i PM dalla riserva
 * interna e la condizione accesa in una modifica sola; «Termina» la spegne. L'effetto entra in «Attacca!».
 */
function attivazioneArtefattoUi(ctx, x, r, riserva) {
  const at = r?.def?.attivazione_artefatto;
  if (!at) return null;
  const chiave = `attivazione:${x.uid}`;
  const accesa = (ctx.sessione.condizioniOggetti ?? []).includes(chiave);
  const pm = riserva ? ctx.sessione.chroma?.[riserva.uid]?.pmAttuali ?? 0 : 0;
  const motivo = x.deposito ? 'nel deposito comune' : !x.sintonizzato ? 'non sintonizzato' : !r.attivo ? 'non indossato' : pm < at.pm ? `la riserva ha ${pm} PM, ne servono ${at.pm}` : null;
  return h('div', { class: 'attivazione-infusa' },
    h('p', {}, h('strong', {}, 'Attivazione: '), `${at.pm} PM dalla riserva interna, ${at.azione}, ${at.durata}: danni dei pugni di natura ${at.natura} e +${at.danno} al danno (${at.fonte}).`),
    accesa ? h('p', { class: 'nota' }, h('strong', {}, 'Attiva'), ` · vale in «Attacca!» senz’armi; dura ${at.durata}. `,
      h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => ctx.azioni.condizioneOggetto(chiave) }, 'Termina')) : null,
    motivo && !accesa ? h('p', { class: 'nota motivo' }, `Non attivabile ora: ${motivo}.`) : null,
    h('button', { type: 'button', class: 'btn', disabled: !!motivo, title: motivo ?? `Scala ${at.pm} PM dalla riserva e accende l’effetto; una nuova attivazione rinnova la durata`,
      onclick: () => ctx.azioni.attivaArtefatto(x.uid, at.pm) }, accesa ? `Rinnova (−${at.pm} PM)` : `Attiva (−${at.pm} PM)`));
}

/**
 * Batteria Matrice (Magia §26.4): Matrice d'origine sulla voce e ricarica automatica per le ore passate entro il
 * raggio della Matrice d'origine (2 PM/ora) o di un'altra dello stesso colore (1 PM/ora). La tabella dei
 * Cristalli Matrice (Magia §26.3) è nel tooltip.
 */
function ricaricaMatriceUi(ctx, c) {
  if (!c.matrice) return null;
  const M = ctx.dati.regole.chroma.matrice;
  const C = ctx.dati.regole.chroma.cristalli_matrice;
  const u = (ctx.ui.matrice ??= {})[c.uid] ??= { ore: 1, presso: 'origine' };
  const cambiaOrigine = (testo) => ctx.azioni.equipaggiamento((ctx.scelte.equipaggiamento ?? []).map((v) => {
    if (v.uid !== c.uid) return v;
    const w = { ...v };
    if (testo.trim()) w.matrice = testo.trim(); else delete w.matrice;
    return w;
  }));
  const raggio = (m) => (m >= 1000 ? `${m / 1000} km` : `${m} m`);
  return h('div', { class: 'ricarica-matrice' },
    h('label', { class: 'campo' }, h('span', {}, 'Matrice d’origine'),
      h('input', { type: 'text', value: c.matrice.origine ?? '', placeholder: 'da registrare (Equipaggiamento §10.3)', onchange: (e) => cambiaOrigine(e.target.value) })),
    h('p', { class: 'nota' }, h('strong', {}, 'Ricarica dalla Matrice'), ` (Magia §26.4): ${M.frasi[0]} ${M.frasi[1]} ${M.frasi[2]}`,
      C ? h('span', { class: 'sottolineato-info', title: C.livelli.map((l) => `Livello ${l.livello}: ${l.altezza_m} × ${l.larghezza_m} m, raggio ${raggio(l.raggio_m)}`).join(' · ') }, ' Raggi dei Cristalli Matrice per livello (Magia §26.3): passa il mouse.') : null),
    h('div', { class: 'riga-azioni' },
      h('select', { onchange: (e) => { u.presso = e.target.value; } },
        h('option', { value: 'origine', selected: u.presso === 'origine' }, `presso la Matrice d’origine (${M.pm_ora_origine} PM/ora)`),
        h('option', { value: 'stesso_colore', selected: u.presso === 'stesso_colore' }, `presso un’altra Matrice ${c.energia} (${M.pm_ora_stesso_colore} PM/ora)`)),
      h('input', { type: 'number', min: 1, step: 1, value: u.ore, 'aria-label': 'Ore passate', onchange: (e) => { u.ore = Math.max(1, Math.round(Number(e.target.value) || 1)); } }),
      h('span', {}, ' ore '),
      h('button', { type: 'button', class: 'btn', onclick: () => ctx.azioni.ricaricaMatrice(c.uid, u.ore, u.presso) }, 'Ricarica dalla Matrice')));
}

/** Scheda di un contenitore: nome, colore, PM, sintonizzazione, trasporto. */
function schedaContenitore(ctx, c) {
  return h('article', { class: 'arma-tab contenitore-tab' },
    h('h3', {}, c.nome, h('small', { class: 'sigla' }, c.integrato ? ` · riserva integrata nell’oggetto: ${nomeRiserva(c.riserva, ctx.dati)}, proprietà ${nomeAlimentazione(c.alimentazione, ctx.dati)}` : c.potenza ? ` · ${c.potenza}` : '')),
    h('p', { class: 'nota' },
      c.scheggia ? 'Scheggia instabile: SnT 0, non si sintonizza; ogni prelievo richiede una Prova di Potere di estrazione (Magia §26.5)'
        : c.sintonizzato ? `✔ Sintonizzato (SnT ${c.costo}, §7.10)` : `○ Non sintonizzato (SnT ${c.costo}): senza sintonizzazione non alimenta lanci`,
      ' · ', c.trasportato ? 'trasportato' : c.integrato ? `oggetto ${NOMI_STATI[c.stato]?.toLowerCase() ?? 'non trasportato'}` : 'nello zaino'),
    // vista estesa, in sola lettura: i PM si modificano nel riquadro Punti Magia
    pannelloChroma(ctx, c, { conPulsanti: false }),
    ricaricaMatriceUi(ctx, c));
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

/**
 * Tab Poteri (docs/layout-sd.md, pezzo 4), per tutti i personaggi: la Magia com'è (PM, contenitori,
 * valori di lancio, incantesimi, «Lancia!»); senza accesso alla magia un riquadro con la riga del
 * manuale (regole.json → poteri.nessuno). Poi gli Artefatti con poteri, in sola lettura, e le sezioni
 * future chiuse (regole.json → poteri.in_arrivo).
 */
function tabPoteri(ctx, d) {
  const p = ctx.dati.regole.poteri ?? {};
  const risorse = sezioneRisorseInteriori(ctx);
  // i dati del foglio Poteri esistono anche con le sole Tecniche (conMagia: false): la Magia solo se c'è
  if (d && d.conMagia === false) d = null;
  return [
    interruttoreTalenti(ctx),
    riquadroCircostanze(ctx),
    ...(d ? tabMagia(ctx, d) : risorse ? [] : [h('section', { class: 'riquadro nessun-potere' }, h('h2', {}, 'Nessun potere'), p.nessuno ? h('p', { class: 'nota' }, p.nessuno) : null)]),
    // Risorse Interiori (Giocatore §8.9; richiesta di Davide del 02/10): le Tecniche con «Attiva»
    risorse,
    sezioneDaArtefatti(ctx),
    ...(p.in_arrivo ?? []).map((x) => h('details', { class: 'sezione-tab in-arrivo' },
      h('summary', {}, h('h2', {}, x.nome)), h('p', { class: 'nota' }, x.nota))),
  ];
}

/**
 * «Da artefatti» (Poteri): gli Artefatti con un potere, cioè un'attivazione (§7.1.4) o una riserva
 * di Chroma integrata (§7.5.1). Sola lettura: sintonizzazione e riserve si gestiscono nella tab
 * Artefatti. Nulla se il personaggio non ne ha.
 */
function sezioneDaArtefatti(ctx) {
  const st = ctx.tab.scheda.equipaggiamento?.sintonizzazione;
  if (!st) return null;
  const cat = catalogo(ctx.dati);
  const perUid = new Map((ctx.scelte.equipaggiamento ?? []).map((v) => [v.uid, risolvi(v, cat)]));
  const conPotere = st.artefatti.map((x) => ({ x, r: perUid.get(x.uid) })).filter(({ r }) => r?.def?.attivazione || infoArtefattoVoce(r, ctx.dati)?.contenitore?.integrato || infusiDi(infoArtefattoVoce(r, ctx.dati)).length);
  const contenitori = ctx.tab.scheda.equipaggiamento?.contenitori ?? [];
  if (!conPotere.length) return null;
  return sezione('Da artefatti',
    h('ul', { class: 'elenco-da-artefatti' }, conPotere.map(({ x, r }) => {
      const at = r.def?.attivazione;
      const ris = infoArtefattoVoce(r, ctx.dati)?.contenitore;
      return h('li', {},
        h('strong', {}, x.nome), h('small', { class: 'sigla' }, ` · ${x.sintonizzato ? 'sintonizzato' : 'non sintonizzato'}${r.deposito ? ' · nel deposito comune' : ''}`),
        at ? h('p', { class: 'nota' }, `Attivazione: +${at.danno_extra} ${at.natura}${at.anche ? ` e ${at.anche}` : ''} al danno del colpo (§7.1.4)${at.sintonizzazione ? `, Sintonizzazione ${at.sintonizzazione}` : ''}.`) : null,
        ris ? h('p', { class: 'nota' }, `Riserva integrata di Chroma ${ris.energia}, ${ris.capacita_pm} PM: ${nomeRiserva(ris.riserva ?? ctx.dati.regole.chroma.riserve?.integrata_predefinita, ctx.dati)}, proprietà ${nomeAlimentazione(ris.alimentazione ?? ctx.dati.regole.chroma.riserve?.proprieta_predefinita, ctx.dati)} (Magia §26.2).`) : null,
        attivazioneInfusaUi(ctx, x, r, contenitori.find((c) => c.uid === x.uid && c.integrato), { conPulsante: false }));
    })),
    h('p', { class: 'nota' }, 'Sola lettura: sintonizzazione e riserve si gestiscono nella tab Artefatti.'));
}

/**
 * Tab Artefatti (docs/layout-sd.md, pezzo 4): la gestione degli Artefatti Mistici posseduti. In testa
 * la sintonizzazione (§7.10: capacità per Gradi complessivi, bonus del Talento, cosa occupa quanto);
 * poi una scheda per Artefatto con stato nell'Inventario, «Sintonizzato» (non nel deposito comune),
 * potenza e costo, effetti con la provenienza (VA e danno dell'arma in mano, AR della protezione
 * indossata, attivazione, riserva integrata); infine le riserve di Chroma a sé. Acquisto e possesso
 * restano nell'Inventario. Stesso motore di prima (calcolaEquipaggiamento → sintonizzazione, contenitori).
 */
function tabArtefatti(ctx) {
  const eq = ctx.tab.scheda.equipaggiamento;
  const st = eq?.sintonizzazione;
  if (!st) {
    return [h('section', { class: 'riquadro nessun-potere' }, h('h2', {}, 'Nessun Artefatto'),
      h('p', { class: 'nota' }, 'Gli Artefatti Mistici si acquistano e si tengono nella tab Inventario (sezione «Artefatti, cristalli e contenitori di Chroma»); qui si gestiscono sintonizzazione, attivazioni e riserve (Armamenti §7.5, §7.10).'))];
  }
  const rs = regoleSintonizzazione(ctx.dati);
  const cat = catalogo(ctx.dati);
  const perUid = new Map((ctx.scelte.equipaggiamento ?? []).map((v) => [v.uid, risolvi(v, cat)]));
  const base = (uid) => String(uid).split(':')[0];
  const sintonizza = (uid, si) => ctx.azioni.equipaggiamento((ctx.scelte.equipaggiamento ?? []).map((v) => {
    if (v.uid !== uid) return v;
    const w = { ...v };
    if (si) w.sintonizzato = true; else delete w.sintonizzato;
    return w;
  }));
  const contenitori = eq.contenitori ?? [];
  const esterni = contenitori.filter((c) => !c.integrato);
  const scheda = (x) => {
    const r = perUid.get(x.uid);
    const def = r?.def;
    const arma = (eq.armi ?? []).find((a) => base(a.uid) === x.uid && !a.moduloDi);
    const prot = (eq.protezioni ?? []).find((p) => base(p.uid) === x.uid);
    const riserva = contenitori.find((c) => c.uid === x.uid && c.integrato);
    return h('article', { class: `arma-tab artefatto-scheda${x.sintonizzato ? ' sintonizzato' : ''}${x.deposito ? ' in-deposito' : ''}` },
      h('div', { class: 'arma-testa' },
        h('h3', {}, def ? info('oggetto', def.rif, x.nome) : x.nome, h('small', { class: 'sigla' }, ` · ${x.tipologia ?? 'Artefatto'}${x.potenza ? ` · ${x.potenza}` : ''}`))),
      h('p', { class: 'nota' }, `Nell’Inventario: ${NOMI_STATI[r?.voce.stato] ?? 'con sé'}. SnT ${x.costo}.`),
      // §7.10: con sole proprietà passive SnT 0, nessuna sintonizzazione; Magia §26.5: Schegge instabili SnT 0
      !x.sintonizzabile ? h('p', { class: 'nota' }, def?.artefatto?.scheggia ? 'Scheggia instabile: SnT 0, non si sintonizza; estrarre PM richiede una Prova di Potere (Magia §26.5).' : 'Sole proprietà passive: SnT 0, si usano senza sintonizzazione (Armamenti §7.10).')
        : h('label', { class: `stato-tavolo${x.sintonizzato ? ' attivo' : ''}`, title: x.deposito ? 'Nel deposito comune la Sintonizzazione resta e occupa la capacità; togli la spunta per interromperla (A.59). Una batteria depositata non alimenta.' : null },
          h('input', { type: 'checkbox', checked: x.sintonizzato, onchange: (e) => sintonizza(x.uid, e.target.checked) }),
          h('span', {}, h('strong', {}, 'Sintonizzato'), h('small', {}, ` · SnT ${x.costo}${x.deposito ? ' · nel deposito comune: occupa la capacità, non alimenta' : ''}`))),
      // effetti con la provenienza, dove entrano: l'arma in mano, la protezione indossata
      arma ? h('p', { class: 'valore-tavolo' }, h('span', {}, 'VA per colpire '),
        valoreEffettivo(`VA per colpire (${arma.nome})`, arma.vaEffettivo ?? arma.va, arma.vaDaRegole ?? arma.va, arma.scomposizione, { pillola: true, provenienza: arma.provenienza }),
        h('span', { class: 'sigla' }, ' · danno '), dannoConProvenienza(arma, testoDanno(arma.danno))) : null,
      prot && prot.tipo !== 'elmetto' ? h('p', {}, h('span', { class: 'sigla' }, 'AR '), h('strong', {}, testoAr(prot.ar))) : null,
      def?.attivazione ? h('p', { class: 'nota', title: 'Proprietà a carica: si dichiara prima della Prova per colpire (§7.1.4)' },
        h('strong', {}, 'Attivazione: '), `+${def.attivazione.danno_extra} ${def.attivazione.natura}${def.attivazione.anche ? ` e ${def.attivazione.anche}` : ''} al danno del colpo`) : null,
      !arma && !prot && (r?.tipo === 'arma_ravvicinata' || r?.tipo === 'arma_distanza' || ['armatura', 'scudo'].includes(r?.tipo))
        ? h('p', { class: 'nota' }, 'Non è in mano né indossato: i suoi effetti non contano ora.') : null,
      attivazioneInfusaUi(ctx, x, r, riserva, { conPulsante: true }),
      attivazioneArtefattoUi(ctx, x, r, riserva),
      riserva ? pannelloChroma(ctx, riserva, { conPulsanti: true }) : null);
  };
  return [
    h('div', { class: 'griglia-tavolo' },
      h('div', { class: `contatore-tavolo${st.usata > st.capacita ? ' oltre' : ''}` }, h('h3', {}, 'Sintonizzazione (§7.10)'),
        h('p', { class: `valore-tavolo${st.usata > st.capacita ? ' oltre' : ''}` }, h('strong', {}, String(st.usata)), h('span', {}, ` / ${st.capacita}`)),
        h('p', { class: 'nota' }, `Capacità per ${st.gradi} Grad${st.gradi === 1 ? 'o' : 'i'} complessiv${st.gradi === 1 ? 'o' : 'i'}: ${rs.capacita_per_gradi[st.gradi - 1]}`,
          st.talento ? `, +${rs.talento.bonus} da ${st.talento}` : null,
          st.umanita ? [', ', infoValore(`${segno(st.umanita)} per l’Umanità`, { titolo: `Capacità di Sintonizzazione: ${st.capacita}`, sottotitolo: 'Armamenti §7.10, Giocatore §5.21', provenienza: st.provenienza }), ' (tab Cibernetica).'] : '.'),
        st.usata > st.capacita ? h('p', { class: 'avviso-carico' }, `Oltre la capacità: il personaggio sceglie quali sintonizzazioni interrompere (§7.10).`) : null,
        h('ul', { class: 'elenco-sintonie' }, st.artefatti.map((x) => h('li', {}, `${x.sintonizzato ? '✔' : '○'} ${x.nome} · SnT ${x.costo}${x.deposito ? ' · deposito comune' : ''}`))))),
    sezione('Artefatti posseduti', h('div', { class: 'armi-tab' }, st.artefatti.map(scheda))),
    esterni.length ? sezione('Riserve di Chroma',
      h('p', { class: 'nota' }, 'Cristalli, batterie e contenitori: i PM si modificano anche nel riquadro Punti Magia. Un contenitore alimenta un lancio se trasportato, sintonizzato e compatibile (Magia sez. 6).'),
      h('div', { class: 'armi-tab' }, esterni.map((c) => schedaContenitore(ctx, c)))) : null,
  ];
}

/**
 * Tab Cibernetica (Equipaggiamento 0.5, cap. 7; Giocatore §5.21): Umanità con la provenienza, gli
 * effetti della fascia, gli impianti installati per famiglia come schede (effetti con la loro
 * provenienza, chip del Processore), le perdite registrate e i recuperi concessi dal Direttore. Gli
 * impianti si comprano e si installano nell'Inventario (sezione «Impianti cibernetici e chip»): lo stato
 * «Installato» registra il costo UMN (src/umanita.js).
 */
/**
 * Parte «al tavolo» della scheda di un impianto attivabile (docs/censimento-impianti.md, src/impianti.js):
 * iniettori con le cartucce e «Somministra» (§7.9); Processore con i chip, «Attiva», «Termina» e «Passate
 * le 24 ore» (§7.10); per gli altri l'Azione per attivarli, come promemoria. Le frasi del manuale nel tooltip.
 */
function attivabile(ctx, imp, mieiChip = []) {
  if (!imp) return null;
  const frasi = imp.frasi.join(' ');
  if (imp.tipo === 'cariche') {
    const n = cartucceDi(ctx.sessione, imp.uid);
    const max = imp.cartucce;
    return h('div', { class: 'attivabile-impianto' },
      h('p', {}, h('strong', {}, 'Cartucce caricate: '),
        h('button', { type: 'button', class: 'btn tondo', 'aria-label': 'Una cartuccia in meno', disabled: n <= 0, onclick: () => ctx.azioni.impianto((s) => impostaCartucce(s, imp.uid, n - 1, max)) }, '−'),
        h('span', { class: 'conteggio-cartucce' }, ` ${n} / ${max} `),
        h('button', { type: 'button', class: 'btn tondo', 'aria-label': 'Una cartuccia in più', disabled: n >= max, onclick: () => ctx.azioni.impianto((s) => impostaCartucce(s, imp.uid, n + 1, max)) }, '+'),
        ' ', h('button', { type: 'button', class: 'btn primario', disabled: n <= 0, title: frasi, onclick: () => ctx.azioni.impianto((s) => somministra(s, imp.uid), 'Caricatore vuoto: rifornirlo richiede un minuto (§7.9).') }, `Somministra (${imp.azione})`)),
      h('p', { class: 'nota' }, `Una cartuccia del §6.2 o dei naniti del §6.7, con i loro effetti; venduto senza cartucce, rifornimento in un minuto (§7.9). La cartuccia somministrata si toglie dall’Inventario a mano.`));
  }
  if (imp.tipo === 'chip') {
    const st = statoProcessore(ctx.sessione, imp, ctx.dati);
    const nomi = new Map(mieiChip.map((c) => [c.uid, c]));
    return h('div', { class: 'chip-processore attivabile-impianto' },
      h('h4', {}, 'Chip'),
      st.chip.length ? h('ul', {}, st.chip.map((c) => h('li', {},
        nomi.get(c.uid)?.def ? info('oggetto', nomi.get(c.uid).def.rif, c.nome) : c.nome,
        ` · ${c.acceso ? 'attivo' : c.inserito ? 'inserito' : NOMI_STATI[nomi.get(c.uid)?.voce.stato] ?? 'con sé'}`, ' ',
        c.acceso ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Interrompe l’effetto: il conteggio delle 24 ore resta (§7.10).', onclick: () => ctx.azioni.impianto((s) => terminaChip(s, imp)) }, 'Termina')
          : h('button', { type: 'button', class: 'btn btn-piccolo primario', disabled: !!c.motivo, title: c.motivo ?? frasi, onclick: () => ctx.azioni.impianto((s) => attivaChip(s, imp, c.uid, ctx.dati), c.motivo) }, `Attiva (${imp.azione})`),
        c.motivo && c.inserito ? h('small', { class: 'motivo' }, ` ${c.motivo}`) : null)))
        : h('p', { class: 'nota' }, 'Nessun chip: si comprano nell’Inventario.'),
      st.attivo ? h('p', { class: 'nota' }, `Chip attivo per ${st.durataMinuti} minuti consecutivi: il bonus è nel VA dell’Abilità. Terminalo a mano quando la durata finisce.`) : null,
      st.usato ? h('p', {}, h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => ctx.azioni.impianto((s) => nuovoIntervalloChip(s, imp)) }, `Passate le ${st.intervalloOre} ore`),
        h('small', { class: 'nota' }, ` attivazione già usata: una ogni ${st.intervalloOre} ore dal momento dell’attivazione (§7.10)`)) : null,
      h('p', { class: 'nota' }, `Un solo chip alla volta, ${st.durataMinuti} minuti, una attivazione ogni ${st.intervalloOre} ore; il bonus non vale per combattimento, Incantesimi, Risorse Interiori e Sintonizzazione (§7.10).`));
  }
  return h('p', { class: 'nota attivabile-impianto', title: frasi }, h('strong', {}, `Attivare: ${imp.azione}. `), imp.frasi[0],
    imp.todo ? h('span', { class: 'etichetta', title: imp.todo }, ' da chiarire con Davide') : null);
}

function tabCibernetica(ctx) {
  const scheda = ctx.tab.scheda;
  const u = scheda.umanita;
  const eq = scheda.equipaggiamento;
  const cat = catalogo(ctx.dati);
  const voci = (ctx.scelte.equipaggiamento ?? []).map((v) => risolvi(v, cat));
  const installati = voci.filter((r) => r.tipo === 'impianto' && r.voce.stato === 'installato');
  const chip = voci.filter((r) => r.def?.richiede_innesto);
  const versoInventario = h('p', { class: 'nota rimando-inventario' },
    'Gli impianti e i chip si comprano e si installano nella tab ',
    h('button', { type: 'button', class: 'btn-link', onclick: () => ctx.azioni.vaiTab('inventario') }, 'Inventario'),
    ', sezione «Impianti cibernetici e chip»: lo stato «Installato» registra il costo UMN. L’installazione richiede una struttura medica attrezzata e si paga a parte (Equipaggiamento §7.1).');
  if (!u) return [h('section', { class: 'riquadro nessun-potere' }, h('h2', {}, 'Umanità non disponibile'), h('p', { class: 'nota' }, 'Mancano le regole dell’Umanità (regole.json → umanita).'))];

  // Umanità: valore con la provenienza, quadratini (neri = UMN perduta, docs/layout-ss.md), fascia
  const quadratini = h('div', { class: 'quadratini-umanita', role: 'img', 'aria-label': `Umanità ${u.valore} su ${u.massimo}: ${u.massimo - u.valore} perduti` },
    Array.from({ length: u.massimo }, (_, i) => h('span', { class: `casella${i >= u.valore ? ' persa' : ''}` })));
  const m = u.modificatori;
  const st = eq?.sintonizzazione;
  const effetti = [
    h('li', {}, h('strong', {}, 'PM Massimi: '), m.pm ? `${segno(m.pm)}${scheda.pmUmanita !== m.pm ? ` (applicato ${segno(scheda.pmUmanita)}: non sotto ${u.pmMinimo})` : ''}` : 'nessuna riduzione'),
    h('li', {}, h('strong', {}, 'PS di Magia contro la Corruzione: '), m.ps_magia_corruzione ? `${segno(m.ps_magia_corruzione)} (solo contro la Corruzione)` : 'nessuna penalità'),
    h('li', {}, h('strong', {}, 'Capacità di Sintonizzazione: '), m.sintonizzazione
      ? [segno(m.sintonizzazione), st ? [' · ', infoValore(`ora ${st.capacita}`, { titolo: `Capacità di Sintonizzazione: ${st.capacita}`, sottotitolo: 'Armamenti §7.10, Giocatore §5.21', provenienza: st.provenienza })] : null, ` (minimo ${u.sintonizzazioneMinimo})`]
      : 'nessuna riduzione'),
    u.risorseInteriori ? null : h('li', { class: 'avviso-carico' }, 'A UMN 0 il personaggio non può utilizzare Risorse Interiori, comprese le Tecniche che ne dipendono.'),
  ];
  const testa = h('div', { class: 'griglia-tavolo' },
    h('div', { class: `contatore-tavolo umanita-tavolo${u.valore < u.massimo ? ' ridotta' : ''}` }, h('h3', {}, 'Umanità (§5.21)'),
      h('p', { class: 'valore-tavolo' }, infoValore(h('strong', {}, String(u.valore)), {
        titolo: `Umanità: ${u.valore}`, sottotitolo: `${u.condizione} · Giocatore §5.21, Equipaggiamento §7.1`, provenienza: u.provenienza,
      }), h('span', {}, ` / ${u.massimo}`)),
      quadratini,
      h('p', { class: 'nota' }, h('strong', {}, u.condizione), ` (fascia ${u.fascia.min === u.fascia.max ? u.fascia.min : `${u.fascia.min}–${u.fascia.max}`}). Nessun recupero naturale: cure e riparazioni non restituiscono Umanità.`)),
    h('div', { class: 'contatore-tavolo' }, h('h3', {}, 'Effetti della fascia'), h('ul', { class: 'effetti-umanita' }, effetti)));

  // schede degli impianti installati, per famiglia del manuale (ordine del catalogo)
  const famiglie = [...new Set(installati.map((r) => r.def?.famiglia ?? 'Impianti personalizzati'))];
  // impianti attivabili (src/impianti.js): iniettori, Processore, promemoria dell'Azione
  const attivabili = impiantiAttivabili(ctx.scelte.equipaggiamento, ctx.dati);
  const effettiDi = (uid) => (eq?.effettiOggetti ?? []).filter((e) => e.uid === uid);
  const schedaImpianto = (r) => {
    const def = r.def;
    const miei = effettiDi(r.uid);
    // effetti scartati perché un beneficio equivalente maggiore vale già (§7.1, «Cumulo»)
    const scartati = (r.effetti ?? []).filter((e) => !miei.some((x) => x.condizione === e.condizione && x.valore === e.valore && (x.tipo ?? 'va') === (e.tipo ?? 'va')));
    const piMax = ctx.massimi?.integrita?.[r.uid];
    const pi = Number.isInteger(piMax) ? (ctx.sessione.integrita?.[r.uid] ?? piMax) : null;
    const mieiChip = def?.innesto ? chip.filter((c) => c.def.richiede_innesto === def.innesto) : [];
    return h('article', { class: 'arma-tab impianto-scheda' },
      h('div', { class: 'arma-testa' },
        h('h3', {}, def ? info('oggetto', def.rif, r.nome) : r.nome,
          h('small', { class: 'sigla' }, ` · ${def?.catalogo === 'Cybertronic' ? 'CYBERTRONIC' : 'standard'} · UMN ${def?.umn ?? r.voce.personalizzato?.umn ?? 0}${def?.paragrafo ? ` · ${def.paragrafo}` : ''}`))),
      def?.effetto_breve ? h('p', { class: 'nota' }, def.effetto_breve) : null,
      miei.length ? h('ul', { class: 'effetti-impianto' }, miei.map((e) => h('li', { title: [e.condizione, e.fonte].filter(Boolean).join(' — ') },
        h('strong', {}, testoEffettoOggetto(e)), e.ambito === 'situazionale' ? (e.beneficio === 'chip_processore' ? ' · con «Attiva» del Processore' : ` · casella accanto al valore${e.se ? ` («${segno(e.valore)} se ${e.se}»)` : ''}`) : null))) : null,
      scartati.length ? h('p', { class: 'nota' }, `Non si somma con un beneficio equivalente già attivo (§7.1, «Cumulo»): ${scartati.map((e) => testoEffettoOggetto(e)).join('; ')}.`) : null,
      def?.innesto === 'interfaccia_neurale' ? h('p', { class: 'nota' }, 'Le armi e i dispositivi con SIN in mano ricevono il bonus indicato dalla loro scheda (tab Combattimento).') : null,
      attivabile(ctx, attivabili.find((x) => x.uid === r.uid) ?? null, mieiChip),
      h('p', { class: 'nota' }, [pi !== null ? `PI ${pi} / ${piMax} (Ripara nell’Inventario)` : null, def?.installazione_costo ? `installazione ${def.installazione_costo.toLocaleString('it-IT')} cr` : null].filter(Boolean).join(' · ')),
      pulsanteIntervento(r, 'rimozione'));
  };

  // A.69 (E&L del 05/10/2026): installare, rimuovere e reinstallare con clinica o personaggio (regole.json → impianti.procedure)
  const P = ctx.dati.regole.impianti?.procedure;
  const ui = (ctx.ui.intervento ??= {});
  const pulsanteIntervento = (r, tipo) => (P ? h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => { ctx.ui.intervento = ui.uid === r.uid && ui.tipo === tipo ? {} : { uid: r.uid, tipo, modo: 'clinica', esito: 'successo', cp: false }; ctx.azioni.ridisegna(); } }, P.interventi[tipo].nome) : null);
  const pannelloIntervento = () => {
    if (!ui.uid || !P) return null;
    const r = voci.find((x) => x.uid === ui.uid);
    if (!r) return null;
    const pr = preventivoIntervento(ui.tipo, r.def, { modo: ui.modo, esito: ui.esito, chirurgiaPrecisa: ui.cp }, ctx.dati);
    const imposta = (k, v) => { ui[k] = v; ctx.azioni.ridisegna(); };
    const applica = () => {
      const voci = pr.completato ? ctx.scelte.equipaggiamento.map((v) => (v.uid === r.uid ? { ...v, stato: pr.statoDopo } : v)) : ctx.scelte.equipaggiamento;
      ctx.ui.intervento = {};
      ctx.azioni.cibernetica({ equipaggiamento: voci }, pr.costo, `${pr.nome} di ${r.nome}: ${pr.completato ? 'completata' : 'non riuscita'} (${pr.ore} ore, ${pr.costo.toLocaleString('it-IT')} cr)${pr.ferita ? '; peggiora di uno lo Stato di Ferita del paziente' : ''}.`);
    };
    return h('section', { class: 'riquadro pannello-veicolo pannello-intervento' },
      h('h3', {}, `${pr.nome}: ${r.nome}`),
      rigaScelte('Chi opera', [{ valore: 'clinica', etichetta: 'Clinica', riga: 'riesce sempre' }, { valore: 'personaggio', etichetta: 'Personaggio', riga: `${P.personaggio.prova}, set ${P.personaggio.set_chirurgico_cr} cr` }], ui.modo, (v) => imposta('modo', v)),
      ui.modo === 'personaggio' ? [h('p', { class: 'nota' }, `Requisiti: ${P.personaggio.requisiti}. ${P.postazioni.testo}`),
        rigaScelte(`Esito della Prova di ${P.personaggio.prova}`, Object.entries(P.esiti).map(([id, e]) => ({ valore: id, etichetta: e.nome })), ui.esito, (v) => imposta('esito', v))] : null,
      h('label', { class: 'casella-veicolo' }, h('input', { type: 'checkbox', checked: ui.cp, onchange: (e) => imposta('cp', e.target.checked) }), ` ${P.chirurgia_precisa.talento} (−${Math.round(P.chirurgia_precisa.riduzione * 100)}% del tempo)`),
      h('ul', {}, h('li', {}, `Tempo: ${String(pr.ore).replace('.', ',')} ore`),
        h('li', {}, 'Costo: ', pr.tariffa === null ? 'tariffa da definire (manca l’installazione nel catalogo)' : `${pr.costo.toLocaleString('it-IT')} cr${pr.materiali ? ` (set chirurgico ${pr.materiali} cr)` : ''}`),
        pr.testo ? h('li', {}, pr.testo) : null,
        h('li', { class: 'nota' }, ui.tipo === 'rimozione' ? 'La rimozione non restituisce UMN: rende recuperabile la perdita con la Riabilitazione (A.70).' : 'Reinstallare lo stesso esemplare non fa ripagare la perdita non recuperata; gli UMN già recuperati per questo impianto si riconsumano (A.69).')),
      h('p', { class: 'riga-azioni' }, h('button', { type: 'button', class: 'btn primario', onclick: applica }, 'Applica e paga'),
        h('button', { type: 'button', class: 'btn', onclick: () => { ctx.ui.intervento = {}; ctx.azioni.ridisegna(); } }, 'Chiudi')));
  };
  // impianti nell'inventario non installati: installare o reinstallare (stesso esemplare con una perdita registrata)
  const fermi = voci.filter((r) => r.tipo === 'impianto' && r.voce.stato !== (ctx.dati.regole.impianti?.stato_installato ?? 'installato') && !r.deposito);
  const nonInstallati = fermi.length ? h('ul', { class: 'impianti-fermi' }, fermi.map((r) => {
    const gia = u.perdite.some((p) => p.uid === r.uid);
    return h('li', {}, h('strong', {}, r.nome), gia ? ' · già installato prima: la perdita resta registrata' : ` · UMN ${r.def?.umn ?? 0} all’installazione`, ' ', pulsanteIntervento(r, gia ? 'reinstallazione' : 'installazione'));
  })) : null;

  // perdite registrate (restano anche se l'impianto si toglie) e recuperi concessi dal Direttore
  const blocco = ctx.scelte.umanita ?? null;
  const NOTE_PERDITA = { installato: 'installato', tolto: 'tolto: la perdita resta', assente: 'non più nell’inventario: la perdita resta' };
  const RB = ctx.dati.regole.umanita?.riabilitazione;
  const ria = (ctx.ui.riabilitazione ??= {});
  const pannelloRiabilitazione = (p) => {
    if (ria.uid !== p.uid || !RB) return null;
    const esito = riabilitazione(blocco, p.uid, { modo: ria.modo ?? 'clinica', esito: ria.esito ?? 'successo' }, u, ctx.dati);
    const imposta = (k, v) => { ria[k] = v; ctx.azioni.ridisegna(); };
    return h('div', { class: 'riquadro pannello-intervento' },
      rigaScelte('Riabilitazione (ciclo di 7 giorni)', [{ valore: 'clinica', etichetta: 'Clinica', riga: `${RB.clinica.cr.toLocaleString('it-IT')} cr, +${RB.clinica.punti}` }, { valore: 'personaggio', etichetta: 'Personaggio', riga: `${RB.personaggio.cr} cr e ${RB.personaggio.prova}` }], ria.modo ?? 'clinica', (v) => imposta('modo', v)),
      (ria.modo ?? 'clinica') === 'personaggio' ? rigaScelte(`Esito della Prova di ${RB.personaggio.prova}`, Object.entries(RB.personaggio.esiti).map(([id, n]) => ({ valore: id, etichetta: id[0].toUpperCase() + id.slice(1), riga: `+${n}` })), ria.esito ?? 'successo', (v) => imposta('esito', v)) : null,
      h('p', {}, `Recupero: +${esito.punti} UMN (recuperabili ${p.recuperabile}), ${esito.costo.toLocaleString('it-IT')} cr, ${esito.giorni} giorni${esito.ferita ? '; Maldestro: peggiora di uno lo Stato di Ferita' : ''}.`),
      h('p', { class: 'riga-azioni' }, h('button', { type: 'button', class: 'btn primario', onclick: () => { ctx.ui.riabilitazione = {}; ctx.azioni.cibernetica({ umanita: esito.blocco }, esito.costo, `Riabilitazione per ${p.nome}: +${esito.punti} UMN.`); } }, 'Applica e paga'),
        h('button', { type: 'button', class: 'btn', onclick: () => { ctx.ui.riabilitazione = {}; ctx.azioni.ridisegna(); } }, 'Chiudi')));
  };
  const perdite = u.perdite.length ? h('ul', { class: 'perdite-umanita' }, u.perdite.map((p) => h('li', {},
    h('strong', {}, `−${p.umn}`), ` ${p.nome} · ${NOTE_PERDITA[p.stato]}`, p.recuperato ? ` · recuperati ${p.recuperato}` : '',
    p.recuperabile > 0 && RB ? h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => { ctx.ui.riabilitazione = ria.uid === p.uid ? {} : { uid: p.uid }; ctx.azioni.ridisegna(); } }, 'Riabilitazione') : null,
    pannelloRiabilitazione(p),
    p.stato !== 'installato' ? h('button', {
      type: 'button', class: 'btn btn-piccolo', title: 'Solo per un impianto segnato «Installato» per errore: §7.1, la rimozione non restituisce Umanità.',
      onclick: () => { if (confirm(`Annullare la perdita di ${p.umn} UMN per «${p.nome}»? Solo se l’impianto era stato segnato installato per errore.`)) ctx.azioni.umanita(annullaPerdita(blocco, p.uid)); },
    }, 'Annulla (errore)') : null))) : h('p', { class: 'vuoto' }, 'Nessuna perdita registrata.');
  const recuperi = h('div', { class: 'recuperi-umanita' },
    u.avvisi?.length ? h('p', { class: 'riquadro attenzione' }, u.avvisi.join(' ')) : null,
    u.recuperi.length ? h('ul', {}, u.recuperi.map((x, i) => h('li', {}, h('strong', {}, `+${x.punti}`), x.legacy ? ` ${x.nota || 'recupero concesso dal Direttore'} (prima della procedura, A.111)` : ` Riabilitazione (${x.nota})${x.riconsumato ? ': riconsumato, impianto reinstallato (A.69)' : ''}`,
      h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Toglie il recupero registrato per errore', onclick: () => ctx.azioni.umanita(togliRecupero(blocco, i)) }, 'Togli')))) : null,
    h('p', { class: 'nota' }, 'L’Umanità si recupera soltanto con la Riabilitazione, dopo la rimozione di un impianto: una volta per perdita, fino a UMN 20 (A.70, A.92).'));

  return [
    testa,
    versoInventario,
    installati.length
      ? famiglie.map((f) => sezione(f, h('div', { class: 'armi-tab' }, installati.filter((r) => (r.def?.famiglia ?? 'Impianti personalizzati') === f).map(schedaImpianto))))
      : sezione('Impianti installati', h('p', { class: 'vuoto' }, 'Nessun impianto installato.')),
    pannelloIntervento(),
    nonInstallati ? sezione('Impianti nell’inventario, non installati', nonInstallati) : null,
    sezione('Perdite e recuperi di Umanità', perdite, recuperi),
  ];
}

/**
 * Riga «Gradi taumaturgici» in fondo al riquadro Incantesimi della tab Poteri (Magia sez. 1): Grado
 * complessivo con le Classi che contribuiscono; nel tooltip la provenienza e il livello massimo che
 * ne deriva. Valore calcolato (src/incantesimi.js → gradiTaumaturgici); senza Classi taumaturgiche
 * non compare.
 */
function rigaGradiTaumaturgici(ctx) {
  const g = gradiTaumaturgici(ctx.tab.scheda, ctx.dati);
  if (!g) return null;
  return h('p', { class: 'nota gradi-taumaturgici' }, 'Gradi taumaturgici: ', infoValore(h('strong', {}, g.testo), {
    titolo: `Gradi taumaturgici: ${g.gradi}`,
    sottotitolo: 'Somma dei Gradi delle Classi taumaturgiche (Magia sez. 1)',
    provenienza: g.provenienza,
  }));
}

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
        (() => {
          // uso specifico «lancio» (armatura, §7.11.1): accanto ai PM, con il VA di Potere per lanciare
          const potere = ctx.tab.scheda.abilita?.find((a) => a.nome === 'Potere');
          const usi = (potere?.usiSpecifici ?? []).filter((u) => u.uso === 'lancio');
          return usi.length ? h('p', { class: 'lancio-potere' }, 'Potere per lanciare: ', valoriUso('Potere', usi)) : null;
        })(),
        rigaGradiTaumaturgici(ctx)),
      // incantesimi lanciati con una durata (src/durate-incantesimi.js)
      riquadroIncantesimiInCorso(ctx)),
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
          h('div', { class: 'arma-testa' },
            h('h4', {}, info('incantesimo', i.nome), ' ', pallini(i.livelloBase), ' ', etichettaMacro(mf.nome), h('span', { class: 'sigla' }, ` · livello base ${i.livelloBase} · scheda ${i.scheda}`)),
            (() => {
              // senza versioni accessibili il pulsante resta, disabilitato con il motivo (mai un pulsante muto)
              const inc = ctx.dati.incantesimi.incantesimi.find((x) => x.nome === i.nome);
              const st = inc ? statoPulsanteLancio(inc, ctx.tab.scheda, ctx.dati) : { disabilitato: true, motivo: 'incantesimo non più nel catalogo' };
              return h('button', { type: 'button', class: 'btn primario btn-attacca', disabled: st.disabilitato, title: st.motivo,
                onclick: () => { ctx.ui.lancio = { nome: i.nome, passo: 0 }; ctx.azioni.ridisegna(); } }, 'Lancia!');
            })()),
          i.intestazione ? h('p', { class: 'piccolo' }, i.intestazione) : null,
          i.lancio ? h('p', { class: 'piccolo' }, i.lancio) : null,
          i.righe.length ? h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella compatta' },
            h('thead', {}, h('tr', {}, i.colonne.map((c) => h('th', {}, c)))),
            h('tbody', {}, i.righe.map((r) => h('tr', {}, r.map((v) => h('td', {}, v)))))))
            : h('p', { class: 'nota' }, `Tabella non disponibile: Manuale della Magia, scheda ${i.scheda}.`)))))))
      : sezione('Incantesimi', h('p', { class: 'vuoto' }, 'Nessun incantesimo scelto.')),
  ];
}

/**
 * Attivazione di un incantesimo infuso (Magia §24.2; Rigenerazione §25.4): costo in PM della versione
 * dalla riserva integrata, senza Prove; tempo di attivazione. Nella tab Artefatti con il pulsante
 * «Attiva» (scala la riserva, annullabile); in Poteri «Da artefatti» in sola lettura.
 */
function attivazioneInfusaUi(ctx, x, r, riserva, opz) {
  const info = r ? infoArtefattoVoce(r, ctx.dati) : null;
  const infusi = infusiDi(info);
  if (!infusi.length) return null;
  // più proprietà infuse (Pietra della Vigilanza): una riga per ciascuna, la riserva è condivisa
  return infusi.length === 1 ? attivazioneInfusaRiga(ctx, x, infusi[0], riserva, opz) : h('div', {}, infusi.map((i) => attivazioneInfusaRiga(ctx, x, i, riserva, opz)));
}

function attivazioneInfusaRiga(ctx, x, infuso, riserva, { conPulsante }) {
  const pm = riserva ? ctx.sessione.chroma?.[riserva.uid]?.pmAttuali ?? 0 : 0;
  const a = attivazioneInfusa(infuso, riserva ?? null, { pm, personali: ctx.sessione.pmAttuali, sintonizzato: x.sintonizzato, deposito: x.deposito }, ctx.dati);
  if (!a) return h('p', { class: 'nota motivo' }, `Incantesimo infuso «${infuso.incantesimo}» non trovato fra gli incantesimi.`);
  // Magia §26.2: Esclusiva solo dalla riserva interna; Universale anche con PM personali, una sola fonte esterna
  const universale = a.alimentazione === 'universale';
  const quote = a.pagamento && universale && a.pagamento.personali ? `${a.pagamento.interna} dalla riserva e ${a.pagamento.personali} personali` : `${a.pm} PM dalla riserva dell’Artefatto`;
  return h('div', { class: 'attivazione-infusa' },
    h('p', {}, h('strong', {}, `${a.incantesimo} ${a.livello}: `), `${quote} · ${a.tempo} · nessuna Prova (Magia §24.2${a.energie ? ', §25.4' : ''}) · proprietà ${nomeAlimentazione(a.alimentazione, ctx.dati)} (§26.2).`),
    a.motivo ? h('p', { class: 'nota motivo' }, `Non attivabile ora: ${a.motivo}.`) : null,
    conPulsante ? h('button', { type: 'button', class: 'btn', disabled: !!a.motivo, title: a.motivo ?? 'Scala i PM; «Annulla» li restituisce',
      onclick: () => (universale && a.pagamento?.personali
        ? ctx.azioni.lancia({ personali: a.pagamento.personali, contenitore: riserva && a.pagamento.interna ? { uid: riserva.uid, pm: a.pagamento.interna } : null })
        : ctx.azioni.chroma(riserva.uid, -a.pm)) }, `Attiva (−${a.pm} PM)`) : null);
}

/**
 * Tavolo del Master, pezzo 6: il master ha cambiato la scheda mentre il giocatore aveva modifiche non
 * ancora salvate nella cartella. «Aggiorna» prende la versione del master, «Tieni la mia» la sovrascrive.
 */
function avvisoMaster(a) {
  if (!a) return null;
  const ora = a.ora.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return h('div', { class: 'riquadro attenzione avviso-master', role: 'alert' },
    // quale PG e quale file: chi legge capisce se è davvero il suo personaggio (bug del 04/10/2026)
    h('p', {}, h('strong', {}, `Il master ha aggiornato la scheda di ${a.nome ?? 'questo personaggio'}`), a.file ? ` (file ${a.file})` : null,
      ` alle ${ora}, mentre avevi una modifica non ancora salvata nella cartella.`),
    a.differenze.length ? h('p', {}, 'Nella versione del master: ', a.differenze.join('; '), '.') : null,
    h('div', { class: 'riga-azioni' },
      h('button', { type: 'button', class: 'btn primario', onclick: a.aggiorna, title: 'Prende la versione del master; la tua ultima modifica si perde' }, 'Aggiorna'),
      h('button', { type: 'button', class: 'btn', onclick: a.tieni, title: 'Salva la tua versione al posto di quella del master, solo se nel frattempo non l’ha cambiata ancora' }, 'Tieni la mia')),
    h('p', { class: 'nota' }, 'Finché non scegli, la scheda resta salvata nel browser ma non nella cartella. La scelta va nel registro dello scontro.'));
}
