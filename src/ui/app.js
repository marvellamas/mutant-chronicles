// Avvio dell'app: carica e valida i dati, poi mostra home, wizard, scheda a tab, "Sali di
// livello" o stampa. Stato: le scelte della creazione, i livelli acquisiti (cap. 8) e i valori
// di sessione (modalità tavolo) del personaggio aperto; tutto il resto si ricalcola a ogni
// disegno con calcolaScheda / anteprima.
import { caricaDati, versioniPersonaggio, FILE_SOLO_TAVOLO } from '../rules.js';
import { impiantiAttivabili, statoProcessore, attivaChip, terminaChip } from '../impianti.js';
import { formattaErrore, trovaTodo } from '../validate.js';
import { calcolaScheda, validaLivello } from '../calc.js';
import { separaEsemplare, restituisciGranate } from '../equipaggiamento.js';
import {
  nuoveScelte, normalizza, applicaModifica, anteprima, serializza, nomeFileEsportazione, nomeFileCalendario, deserializzaPersonaggio, applicaLivello, annullaUltimoLivello,
  CAMPI_ANAGRAFICA, nuovoPg,
} from '../character.js';
import { h, svuota, scaricaFile } from './dom.js';
import * as archivio from './storage.js';
import { elencoVeicoli, migraNelRegistro } from './veicoli-registro.js';
import { eRiferimento } from '../veicoli-registro.js';
import { serverCartella, elencoCartella, leggiCartella, leggiCartellaConRevisione, scriviCartella } from './cartella.js';
import { statoSalvataggioMaster, controllaRemoto, revisioneDaScrivere, differenzeSessione, testoScelta, indicatoreCollegamento, impronta } from '../collegamento.js';
import { leggiScontroAperto, leggiScontro, salvaScontro, leggiMovimentoRound } from './scontro.js';
import { registraRiga } from '../scontro.js';
import { elencoUnito, confronta, chiaveDaFile, chiavePersonaggio, messaggioSalvataggio, attesaRitentativo, nomeFileLibero, haNome, fileProvvisorio } from '../cartella.js';
import { renderTavolo } from './tavolo.js';
import { renderMappa } from './mappa/pagina.js';
import { renderGiocatori } from './mappa/giocatori.js';
import { creaAllarme } from './allarme.js';
import { renderGuidaMappa } from './guida.js';
import { avviso, avvisoErrore } from './avvisi.js';
import { controlloInUso } from './ridisegno.js';
import { urlMuovi, alRound, collegamentoScontro, tecnicheScadute, statiScaduti, durateCarta, testoDurata, idPg } from '../round-scontro.js';
import { bloccoControNemico } from './attacco-pg.js';
import { registraIncantesimo, terminaIncantesimo, concentrazioniInterrotte } from '../durate-incantesimi.js';
import { segnaDalTavolo, arrivoDalTavolo, tornaAlTavolo, scorrimentoDaRimettere, dimenticaTavolo, segnaDallaMappa, arrivoDallaMappa, tornaAllaMappa, dimenticaMappa } from './ritorno.js';
import { PASSI, passoVisibile, requisitoPasso } from './passi.js';
import { inizializzaTooltip, nascondiTooltip } from './tooltip.js';
import { renderRiepilogo } from './riepilogo.js';
import { renderSali } from './sali.js';
import { renderCompleta, renderTogli } from './completa.js';
import { validaCompletamento, applicaCompletamento, puntiDaCompletare, motivoCompletamento, statoRimozione, validaRimozione, applicaRimozione } from '../avanzamento.js';
import { renderStampa, esciDallaStampa } from './stampa.js';
import { barraPassi, barraFondoSeServe } from './navigazione.js';
import { cercaSfondi, applicaSfondo } from './sfondi.js';
import { caricaImmagini, iconaPagina } from './immagini.js';
import { preparaStampa, preparaTab, normalizzaOpzioniStampa, versioniCompatte } from '../stampa.js';
import { renderTab, tabFissi, ALIAS_TAB } from './tab.js';
import {
  massimiSessione, allineaSessione, variaSessione, modificaSessione, commutaStato, commutaCondizioneOggetto, commutaTalento, commutaBonusTalenti, impostaCondizioneArma, riparaOggetto, spendiPmLancio, ricaricaMatrice, attivaArtefatto, attivaTecnicaSessione, nuovoRoundSessione, terminaTecnicaSessione, nuovaSessione, convertiDistintivi, sessioneDopoLivello,
  penalitaSessione, variaMunizioni, consumaColpi, scegliGranata, granateDiPartenza, ricaricaArma, caricaDaCarichino, preparaCarichino, variaChroma, variaIntegrita, variaNec,
} from '../sessione.js';
import { conOrdinale } from '../lingua.js';
import { normalizzaCalendario, calendarioAttivo, attivaCalendario, disattivaCalendario, contaNote, fileCalendario, leggiFileCalendario, momentoCalendario } from '../calendario.js';
import { testoNote } from './calendario.js';

// Dopo la creazione si possono ancora cambiare solo i campi descrittivi: le altre scelte
// determinano i livelli successivi (ricognizione dell'avanzamento, §8).
const CAMPI_LIBERI_DOPO_LIVELLI = ['nome', 'concetto', 'equipaggiamento', 'dotazione', 'puntiEsperienza', 'ritratto', ...CAMPI_ANAGRAFICA.map((c) => c.campo)];
// L'ultimo passo del wizard è la scheda: si apre come vista a tab (#/p/<id>).
const PASSO_SCHEDA = PASSI.length - 1;
const PASSO_EQUIPAGGIAMENTO = PASSI.findIndex((p) => p.titolo === 'Equipaggiamento');
// tab della scheda (docs/layout-sd.md): gli otto fissi, il Calendario e i vecchi id (magia → poteri)
const TAB = ['identita', 'abilita', 'combattimento', 'poteri', 'artefatti', 'cibernetica', 'inventario', 'veicoli', 'calendario', 'magia'];

const radice = document.getElementById('app');

const stato = {
  dati: null,
  versioni: '',
  id: null,
  scelte: null,
  livelli: [], // scelte dei livelli dal 2° in poi (cap. 8)
  sali: null, // bozza del livello successivo: { voce, passo, ui }. Non si salva fino alla conferma.
  completa: null, // bozza dei Punti Abilità da completare (regole aggiornate): { punti }. Come «sali».
  sessione: null, // valori attuali della modalità tavolo (src/sessione.js); null finché non si apre la scheda
  calendario: null, // calendario di gioco (src/calendario.js); null = mai attivato
  // per «Annulla ultima modifica» (una sola, in memoria): { sessione, calendario } di prima
  precedenteTavolo: null,
  tab: 'identita',
  messaggioScheda: null,
  passo: 0,
  avvisi: [], // avvisi dell'ultima modifica che ha invalidato scelte a valle
  precedente: null, // scelte prima di quella modifica, per "Annulla"
  messaggioHome: null,
  avvisiDati: [],
  salvataggioOk: true,
  sfondi: [], // sfondi di Corporazione presenti in img/sfondi/ (src/ui/sfondi.js)
  ui: { aperti: new Set(), riepilogoAperto: false, tiroPE: null },
  // Tavolo del Master, pezzo 6: scheda collegata al server (solo con stato.cartella). stato: 'collegato' o
  // 'non_collegato' (ultimo controllo); conflitto: { file, mtime, testo, sessione } del master in attesa di una scelta
  collegamento: { stato: 'collegato', conflitto: null, scrivendo: false },
};

avvia();

async function avvia() {
  let risultato;
  try {
    risultato = await caricaDati();
  } catch (e) {
    return mostraErroriDati([{ file: '(avvio)', chiave: '', problema: e.message }]);
  }
  stato.dati = risultato.dati;
  stato.versioni = versioniDati(risultato.dati);
  const versioni = document.getElementById('versioni');
  versioni.textContent = stato.versioni ? `Dati: ${stato.versioni}` : '';
  versioni.title = versioni.textContent; // la riga si tronca con «…»: il testo intero nel tooltip
  if (risultato.errori.length) return mostraErroriDati(risultato.errori);
  stato.avvisiDati = risultato.avvisi ?? [];
  inizializzaTooltip(stato.dati);
  await caricaImmagini(stato.dati);
  stato.sfondi = cercaSfondi(stato.dati.corporazioni.corporazioni);
  // cartella dei personaggi (server.mjs): se il server non c'è l'app resta com'era
  stato.cartella = await serverCartella();
  // pezzo 6: con il server la scheda aperta controlla il proprio file (come la plancia, ogni 3 secondi)
  if (stato.cartella) setInterval(controllaScheda, INTERVALLO_COLLEGAMENTO_MS);
  window.addEventListener('hashchange', daIndirizzo);
  // I menu della scheda (Azioni, impostazioni) si chiudono toccando altrove
  document.addEventListener('click', (e) => {
    for (const d of document.querySelectorAll('details.menu-azioni[open]')) if (!d.contains(e.target)) d.open = false;
  });
  window.addEventListener('beforeunload', (e) => {
    if (bozzaModificata()) e.preventDefault();
  });
  daIndirizzo();
}

// piè di pagina della stampa: ogni manuale una volta, con la versione più recente (src/stampa.js → versioniCompatte)
function versioniDati(dati) {
  return versioniCompatte(Object.values(versioniPersonaggio(dati)));
}

function mostraErroriDati(errori) {
  const perFile = Map.groupBy ? Map.groupBy(errori, (e) => e.file) : raggruppa(errori);
  svuota(radice, h('section', { class: 'pagina-errori' },
    h('h1', {}, 'I dati delle regole contengono errori'),
    h('p', {}, 'L’app non parte finché i file in ', h('code', {}, 'data/'), ' non sono corretti, per non mostrare valori sbagliati. Correggi i punti seguenti e ricarica la pagina.'),
    [...perFile].map(([file, lista]) => h('section', {},
      h('h2', {}, file),
      h('ul', {}, lista.map((e) => h('li', {}, e.chiave ? h('code', {}, e.chiave) : null, e.chiave ? ': ' : null, e.problema))))),
    h('details', {}, h('summary', {}, 'Testo semplice (da copiare)'), h('pre', {}, errori.map(formattaErrore).join('\n')))));
}

function raggruppa(errori) {
  const m = new Map();
  for (const e of errori) m.set(e.file, [...(m.get(e.file) ?? []), e]);
  return m;
}

// ---------------------------------------------------------------------------
// Navigazione: #/ è la home, #/p/<id>/<passo> il wizard. Il tasto Indietro del browser funziona.

function vai(indirizzo) {
  if (location.hash === indirizzo) daIndirizzo();
  else location.hash = indirizzo;
}

const bozzaModificata = () => !!stato.sali && Object.keys(stato.sali.voce).length > 0;
const MSG_USCITA = 'Uscire da «Sali di livello»? Le scelte di questo livello non sono salvate e andranno perse.';
let hashDaIgnorare = null;

function daIndirizzo() {
  if (hashDaIgnorare !== null && location.hash === hashDaIgnorare) {
    hashDaIgnorare = null;
    return;
  }
  esciDallaStampa();
  applicaSfondo(null); // lo sfondo scelto vale solo nella SD (renderScheda)
  // Tavolo del Master (docs/tavolo-direttore.md, pezzo 1): uscendo si ferma l'aggiornamento periodico
  stato.fermaTavolo?.();
  stato.fermaTavolo = null;
  if (location.hash === '#/tavolo') {
    stato.id = null;
    stato.scelte = null;
    stato.livelli = [];
    if (!stato.cartella) {
      stato.messaggioHome = { tipo: 'attenzione', testo: 'Il Tavolo del Master serve il server di Mutant: avvia l’app con avvia-server.bat (node server.mjs).' };
      return vai('#/');
    }
    document.title = 'Tavolo del Master · Mutant';
    // «← Torna al tavolo» da una scheda: la plancia rimette lo scorrimento di prima (src/ui/ritorno.js)
    const scorrimento = scorrimentoDaRimettere(sessionStorage);
    stato.fermaTavolo = renderTavolo(radice, { dati: stato.dati, scorrimento, azioni: { personaggi: () => vai('#/'), apri: (r) => apriDaCartella(r, { dalTavolo: true }), mappa: (id) => vai(`#/mappa/${id}`) } });
    return;
  }
  // guida della mappa per il master (docs/battlemap/guida-davide.md): file statico, anche senza il server
  if (location.hash === '#/guida-mappa') {
    stato.id = null;
    stato.scelte = null;
    stato.livelli = [];
    document.title = 'Guida della mappa · Mutant';
    renderGuidaMappa(radice);
    return;
  }
  // Mappa di battaglia, lotto 4: vista giocatori (televisore, proiettore, tablet), solo lettura, solo con il server
  // 08/10: dalla scheda del PG, #/mappa/giocatori?pg=<chiave>&scontro=<id>&scheda=<id>: il PG già scelto, «Torna alla scheda»
  const vistaGiocatori = location.hash.match(/^#\/mappa\/giocatori(?:\?(.*))?$/);
  if (vistaGiocatori) {
    stato.id = null;
    stato.scelte = null;
    stato.livelli = [];
    if (!stato.cartella) {
      stato.messaggioHome = { tipo: 'attenzione', testo: 'La vista giocatori della mappa serve il server di Mutant acceso sul PC del master.' };
      return vai('#/');
    }
    document.title = 'Giocatori · Mappa · Mutant';
    const p = new URLSearchParams(vistaGiocatori[1] ?? '');
    stato.fermaTavolo = renderGiocatori(radice, { dati: stato.dati, pg: p.get('pg'), scontro: p.get('scontro'), scheda: p.get('scheda'), tornaAllaScheda: (id) => vai(`#/p/${id}`) });
    return;
  }
  // Mappa di battaglia (lotto 2, docs/battlemap/piano.md): la scena nella vista master, solo con il server
  const scenaMappa = location.hash.match(/^#\/mappa\/([a-z0-9-]{1,60})$/);
  if (scenaMappa) {
    stato.id = null;
    stato.scelte = null;
    stato.livelli = [];
    if (!stato.cartella) {
      stato.messaggioHome = { tipo: 'attenzione', testo: 'La mappa di battaglia serve il server di Mutant: avvia l’app con avvia-server.bat (node server.mjs).' };
      return vai('#/');
    }
    document.title = 'Mappa · Mutant';
    stato.fermaTavolo = renderMappa(radice, {
      dati: stato.dati, id: scenaMappa[1],
      // difetto 2 (06/10/2026): la scheda completa aperta dalla mappa ha «Torna alla mappa»
      // lotto 6: la plancia nella barra della mappa porta anche alla pagina dei personaggi e alle altre scene
      azioni: { tavolo: () => vai('#/tavolo'), apriScheda: (r, dallaMappa) => apriDaCartella(r, { dallaMappa }), personaggi: () => vai('#/'), mappa: (id) => vai(`#/mappa/${id}`) },
    });
    return;
  }
  const sali = location.hash.match(/^#\/p\/([\w-]+)\/sali\/(\d+)$/);
  // Uscire dalla bozza del livello (tasto Indietro, link, indirizzo) chiede conferma.
  if (stato.sali && !(sali && sali[1] === stato.id)) {
    if (bozzaModificata() && !confirm(MSG_USCITA)) {
      hashDaIgnorare = `#/p/${stato.id}/sali/${stato.sali.passo}`;
      location.hash = hashDaIgnorare;
      return;
    }
    stato.sali = null;
  }
  const completa = location.hash.match(/^#\/p\/([\w-]+)\/(completa|togli)$/);
  if (stato.completa && !(completa && completa[1] === stato.id && completa[2] === stato.completa.modo)) stato.completa = null;
  const stampa = location.hash.match(/^#\/p\/([\w-]+)\/(stampa)$/);
  const scheda = location.hash.match(/^#\/p\/([\w-]+)(?:\/t\/(\w+))?$/);
  const m = sali ?? completa ?? stampa ?? scheda ?? location.hash.match(/^#\/p\/([\w-]+)\/(\d+)$/);
  if (!m) {
    stato.id = null;
    stato.scelte = null;
    stato.livelli = [];
    // la pagina iniziale: le schede aperte da qui non hanno «Torna al tavolo»
    dimenticaTavolo(sessionStorage);
    dimenticaMappa(sessionStorage);
    return renderHome();
  }
  const [, id, passoTesto] = m;
  const appenaCaricato = stato.id !== id;
  if (appenaCaricato) {
    const salvato = archivio.carica(id);
    if (!salvato) {
      stato.messaggioHome = { tipo: 'errore', testo: 'Personaggio non trovato in questo browser.' };
      return vai('#/');
    }
    const { scelte, avvisi } = normalizza(salvato.scelte, stato.dati);
    stato.id = id;
    // un PG di prima riceve l'identificativo alla prima apertura (bug del 04/10/2026), senza cambiare altro: con il
    // server si prende quello del suo file, se c'è già, e il file lo registra subito
    if (!salvato.pg) {
      if (!stato.cartella) assicuraPg(id);
      else elencoCartella().then((lista) => { if (!archivio.carica(id)?.pg && lista) { assicuraPg(id, lista); scriviInCartella(id, { revisione: id === stato.id }); } }, () => {});
    }
    stato.scelte = scelte;
    stato.livelli = Array.isArray(salvato.livelli) ? salvato.livelli : [];
    stato.sessione = salvato.sessione ?? null;
    stato.calendario = normalizzaCalendario(salvato.calendario, stato.dati);
    stato.opzioniStampa = normalizzaOpzioniStampa(salvato.stampa);
    stato.precedenteTavolo = null;
    stato.collegamento.conflitto = null;
    stato.ui.calendario = null;
    stato.ui.attivaCalendario = null;
    stato.ui.importaCalendario = null;
    stato.messaggioScheda = null;
    stato.avvisi = avvisi.length ? ['Il personaggio salvato non era più coerente con i dati attuali:', ...avvisi] : [];
    stato.precedente = null;
    stato.ui.aperti.clear();
    stato.ui.tiroPE = null;
    if (avvisi.length) persisti();
  }
  if (sali) return apriSali(Number(passoTesto));
  if (completa) return completa[2] === 'togli' ? apriTogli() : apriCompleta();
  if (stampa) return apriStampa();
  if (scheda) return apriScheda(TAB.includes(passoTesto) ? (ALIAS_TAB[passoTesto] ?? passoTesto) : null);
  const passo = Math.min(Number(passoTesto), PASSI.length - 1);
  // L'ultimo passo del wizard è la scheda a tab
  if (passo === PASSO_SCHEDA) return vai(`#/p/${id}`);
  // Gli avvisi riguardano l'ultima modifica: cambiando passo non servono più.
  if (!appenaCaricato && passo !== stato.passo) {
    stato.avvisi = [];
    stato.precedente = null;
  }
  stato.passo = passo;
  persisti();
  renderWizard();
  window.scrollTo(0, 0);
}

const vaiAlPasso = (i) => vai(`#/p/${stato.id}/${i}`);

const personaggio = () => ({ creazione: stato.scelte, livelli: stato.livelli });

// ---------------------------------------------------------------------------
// Persistenza

/** Avviso quando il salvataggio nel browser non riesce: spazio esaurito o storage bloccato. */
function testoSalvataggioFallito() {
  return archivio.erroreSalvataggio() === 'quota'
    ? 'Spazio del browser esaurito: le ultime modifiche NON sono salvate. Usa «SALVA PG (Esporta JSON)» subito, poi esporta e rimuovi i personaggi vecchi (o i ritratti) dalla pagina iniziale.'
    : 'Il browser non permette il salvataggio: usa «SALVA PG (Esporta JSON)» per non perdere il personaggio.';
}

function persisti() {
  if (!stato.id) return;
  stato.salvataggioOk = archivio.salva({ id: stato.id, scelte: stato.scelte, livelli: stato.livelli, sessione: stato.sessione, calendario: stato.calendario, stampa: stato.opzioniStampa ?? null, passo: stato.passo });
  if (stato.cartella) programmaCartella(stato.id);
}

/**
 * Nome e testo dell'export di un personaggio: gli stessi per «SALVA PG» e per la cartella. `pg`: identificativo
 * del personaggio (src/character.js → nuovoPg), scritto nel file. `radice`: il «Nome» del file, quando non è
 * quello del nome del PG (nella cartella, con il suffisso di src/cartella.js → nomeFileLibero).
 */
function fileEsportazione(scelte, livelli = [], sessione = null, calendario = null, pg = null, radice = null) {
  const versioniDatiFile = versioniPersonaggio(stato.dati);
  return { file: nomeFileEsportazione(radice ?? scelte.nome, 1 + livelli.length), testo: serializza(scelte, { versioniDati: versioniDatiFile, livelli, sessione, calendario, pg }) };
}

/**
 * L'identificativo del personaggio della voce `id`: quello che ha, oppure quello del suo file nella cartella
 * (un PG di prima la cui copia è già stata scritta altrove con l'identificativo), oppure uno nuovo. Si dà alla
 * voce senza cambiare altro (prima apertura di un PG di prima, bug del 04/10/2026).
 */
function assicuraPg(id, lista = null) {
  const p = archivio.carica(id);
  if (!p) return null;
  if (p.pg) return p.pg;
  const delFile = p.cartella?.file ? (lista ?? []).find((x) => x.file === p.cartella.file)?.pg ?? null : null;
  const pg = delFile ?? nuovoPg();
  archivio.segnaPg(id, pg);
  return pg;
}

function esporta(scelte, livelli = [], sessione = null, calendario = null, pg = null) {
  const { file, testo } = fileEsportazione(scelte, livelli, sessione, calendario, pg);
  scaricaFile(file, testo);
}

// Cartella dei personaggi (server.mjs, src/cartella.js): dopo ogni salvataggio nel browser il personaggio
// si scrive anche in personaggi/, con il testo dell'export; le scritture ravvicinate si raccolgono
// Ritentativo del salvataggio quando il server non risponde (richiesta di Davide del 04/10/2026):
// si riprova ogni «ritenta_ogni_s» secondi (regole.json → interfaccia.salvataggio) finché il server
// torna; appena scrive, l'avviso diventa «Salvato nella cartella personaggi/». Un solo ritentativo
// alla volta, per il personaggio aperto: le modifiche successive aggiornano il contenuto da scrivere.
const ritentativo = { id: null, timer: null, opzioni: null };
function programmaRitentativo(id, opzioni = {}) {
  if (ritentativo.id === id && ritentativo.timer) { ritentativo.opzioni = opzioni; return; }
  clearTimeout(ritentativo.timer);
  ritentativo.id = id;
  ritentativo.opzioni = opzioni;
  ritentativo.timer = setTimeout(() => {
    ritentativo.timer = null;
    scriviInCartella(id, { revisione: id === stato.id, ...ritentativo.opzioni });
  }, attesaRitentativo(stato.dati));
}
function fineRitentativo(id) {
  clearTimeout(ritentativo.timer);
  ritentativo.id = null;
  ritentativo.timer = null;
  ritentativo.opzioni = null;
  const m = messaggioSalvataggio({ riuscito: true, ritentato: true }, stato.dati);
  stato.messaggioScheda = { tipo: m.tipo, testo: m.testo };
  mostraMessaggioScheda(id);
}

/**
 * Mostra subito `stato.messaggioScheda` nella scheda aperta: il salvataggio nella cartella gira da sé un
 * secondo e mezzo dopo l'ultima modifica, quindi senza questo il messaggio si vedrebbe solo al ridisegno
 * successivo. Usa lo stesso ridisegno prudente dell'aggiornamento periodico, che rinvia se il giocatore sta
 * usando un controllo.
 */
function mostraMessaggioScheda(id) {
  if (id !== stato.id) return;
  ridisegnaSchedaQuandoLibera();
}

const attesaCartella = new Map();
function programmaCartella(id) {
  clearTimeout(attesaCartella.get(id));
  // pezzo 6: con un aggiornamento del master in attesa di una scelta la scheda non scrive
  if (id === stato.id && stato.collegamento.conflitto) return;
  attesaCartella.set(id, setTimeout(() => { attesaCartella.delete(id); scriviInCartella(id, { revisione: id === stato.id }); }, 1500));
}

/**
 * Scrive il personaggio nella cartella. Con `revisione` (la scheda aperta, pezzo 6) scrive solo se il file
 * non è cambiato dall'ultima sincronizzazione, come la plancia (pezzo 4): altrimenti apre il conflitto.
 * `mtime`: revisione da usare al posto di quella ricordata («Tieni la mia»).
 */
async function scriviInCartella(id, { revisione = false, mtime = null } = {}) {
  if (!archivio.carica(id)) return null;
  // un PG senza nome resta nel browser (05/10/2026): nella cartella va un solo file, con il nome giusto
  if (!haNome(archivio.carica(id).scelte)) return null;
  // il nome del file è unico per personaggio (src/cartella.js → nomeFileLibero): serve l'elenco della cartella
  let elenco = null;
  try { elenco = await elencoCartella(); } catch { elenco = null; }
  assicuraPg(id, elenco);
  const p = archivio.carica(id);
  const { scelte } = normalizza(p.scelte, stato.dati);
  const radice = elenco ? nomeFileLibero({ ...p, scelte }, elenco) : null;
  const { file, testo } = fileEsportazione(scelte, p.livelli ?? [], p.sessione ?? null, normalizzaCalendario(p.calendario, stato.dati), p.pg, radice);
  const conRevisione = revisione && p.cartella;
  // pezzo 6: il contenuto è quello già nella cartella (la scheda si è solo riaperta): niente da scrivere
  if (conRevisione && !mtime && p.cartella.file === file && p.cartella.impronta === impronta(testo)) return null;
  if (conRevisione) stato.collegamento.scrivendo = true;
  try {
    let rev = mtime ?? (conRevisione ? revisioneDaScrivere(p, file) : null);
    if (conRevisione && !rev) {
      // file nuovo (nuovo giorno o livello): prima si controlla che quello vecchio non sia cambiato
      const lista = await elencoCartella();
      if (lista && controllaRemoto(p, lista).azione !== 'niente') { stato.collegamento.scrivendo = false; await apriConflitto(); return null; }
      rev = lista?.some((f) => f.file === file) ? String(lista.find((f) => f.file === file).mtime) : null;
    }
    const r = await scriviCartella(file, testo, { mtime: rev });
    archivio.segnaCartella(id, { file: r.file, mtime: r.mtime, salvato: p.aggiornato, impronta: impronta(testo) });
    if (id === stato.id) aggiornaIndicatoreSalvataggio();
    // il server è tornato dopo un salvataggio fallito: lo si dice, e il ritentativo si ferma
    if (ritentativo.id === id) fineRitentativo(id);
    return r;
  } catch (e) {
    if (conRevisione && e.conflitto) { stato.collegamento.scrivendo = false; await apriConflitto(); return null; }
    // richiesta di Davide del 04/10: col server spento un messaggio comprensibile, e si ritenta da soli
    const m = messaggioSalvataggio({ errore: e }, stato.dati);
    if (m.tecnico) console.warn(`Salvataggio nella cartella non riuscito (${file}):`, m.tecnico);
    const nuovo = stato.messaggioScheda?.testo !== m.testo;
    stato.messaggioScheda = { tipo: m.tipo, testo: m.testo };
    // il salvataggio gira da sé un secondo e mezzo dopo l'ultima modifica: il messaggio va mostrato subito,
    // altrimenti si vedrebbe solo al ridisegno successivo. Si ridisegna una volta sola (non a ogni
    // ritentativo) e mai mentre si sta scrivendo in un campo, per non far perdere il segno.
    if (nuovo) mostraMessaggioScheda(id);
    if (m.ritenta) programmaRitentativo(id, { mtime });
    return null;
  } finally {
    if (conRevisione) stato.collegamento.scrivendo = false;
  }
}

// ---------------------------------------------------------------------------
// Tavolo del Master, pezzo 6: scheda del giocatore collegata (src/collegamento.js)

const INTERVALLO_COLLEGAMENTO_MS = 3000;
// la scheda a tab del personaggio aperto (non il wizard, «Sali», «Assegna» o la stampa)
const inScheda = () => !!stato.id && new RegExp(`^#/p/${stato.id}(?:/t/\\w+)?$`).test(location.hash);
const nomeStato = (id) => stato.dati.regole.stati?.elenco?.find((s) => s.id === id)?.nome ?? id;

/** Indicatore in testa alla scheda: si aggiorna sul posto, senza ridisegnare. */
function mostraCollegamento(nuovo) {
  if (stato.collegamento.stato === nuovo) return;
  stato.collegamento.stato = nuovo;
  const el = document.querySelector('.indicatore-collegamento');
  if (!el) return;
  const i = indicatoreCollegamento(true, nuovo === 'collegato');
  el.className = `indicatore-collegamento ${i.stato}`;
  el.textContent = i.testo;
  el.title = i.titolo;
}

/** Un giro di controllo: il file del personaggio è cambiato sul server? E il Round dello scontro? */
async function controllaScheda() {
  if (!inScheda() || stato.collegamento.scrivendo) return;
  const id = stato.id;
  const lista = await elencoCartella();
  mostraCollegamento(lista ? 'collegato' : 'non_collegato');
  if (!lista || id !== stato.id || !inScheda() || stato.collegamento.scrivendo) return;
  const voce = archivio.carica(id);
  const { azione } = controllaRemoto(voce, lista, !!stato.collegamento.conflitto, improntaLocale(id));
  if (azione === 'ricarica') await ricaricaDaCartella();
  else if (azione === 'conflitto') await apriConflitto();
  // verifica del 06/10/2026: una modifica fatta col server irraggiungibile (o con un altro PG aperto) e non ancora
  // nella cartella si scrive appena il server risponde, senza aspettare la pagina iniziale
  else if (!stato.collegamento.conflitto && !attesaCartella.has(id) && !ritentativo.timer && haNome(voce.scelte)
    && (!voce.cartella || voce.cartella.impronta !== improntaLocale(id))) programmaCartella(id);
  aggiornaIndicatoreSalvataggio();
  await aggiornaRoundScontro();
}

// Round collegato fra scheda e tavolo (richiesta di Marcello del 03/10, src/round-scontro.js): con il server e il PG
// in uno scontro aperto il Round è quello dello scontro, che fa avanzare solo la plancia. La scheda mostra la sua
// sessione vista a quel Round (Tecniche finite, limite di una per Round) senza scriverla: la scrive solo quando il
// giocatore fa qualcosa. Fuori da uno scontro, o senza server, il contatore è quello della scheda, come prima.
// stato.scontroPg: { id, nome, round, durate } | null; stato.roundFinale: { id, round } dopo la fine dello scontro.

// 08/10: avvisi del master alla scheda del PG aperta sul tablet («Chiedi di muovere», «Tocca a te»): un flusso di
// eventi (server.mjs → /api/tablet/eventi) finché il PG è in uno scontro aperto e la scheda è aperta
let flussoAvvisi = null; // { pg, es }
let allarmeScheda = null;
function flussoAvvisiScheda(chiave, coll) {
  const vuole = coll && chiave && inScheda() ? chiave : null;
  if (flussoAvvisi?.pg === vuole) return;
  flussoAvvisi?.es.close();
  flussoAvvisi = null;
  if (!vuole || typeof EventSource !== 'function') return;
  const es = new EventSource(`api/tablet/eventi?pg=${encodeURIComponent(vuole)}`);
  es.addEventListener('avviso', (e) => {
    let a;
    try { a = JSON.parse(e.data); } catch { return; }
    allarmeScheda ??= creaAllarme(stato.dati);
    const id = stato.id;
    const scontro = a.scontro ?? stato.scontroPg?.id ?? null;
    allarmeScheda.mostra({ testo: a.testo, tipo: a.tipo, azioni: scontro ? [{ testo: '🗺 Muovi il PG sulla mappa', primario: true, fai: () => vai(urlMuovi(vuole, scontro, id)) }] : [] });
  });
  flussoAvvisi = { pg: vuole, es };
}
window.addEventListener('hashchange', () => { if (!inScheda()) { flussoAvvisiScheda(null, null); allarmeScheda?.chiudi(); } });

/** Chiave del personaggio aperto nella cartella del server (src/cartella.js), o null se non c'è. */
function chiaveCartellaAperta() {
  const f = archivio.carica(stato.id)?.cartella?.file;
  return f ? chiaveDaFile(f) : null;
}

/** Sessione della scheda vista al Round dello scontro (o al Round finale, finché il file non lo riporta). */
function sessioneVista() {
  const s = stato.sessione;
  if (stato.scontroPg) return alRound(s, stato.scontroPg.round);
  if (stato.roundFinale?.id === stato.id) return alRound(s, stato.roundFinale.round);
  return s;
}

let ultimoScontroLetto = null; // { id, revisione, scontro }
/** Legge lo scontro aperto (solo con il server) e confronta il Round con quello visto prima: avvisi e ridisegno. */
async function aggiornaRoundScontro() {
  if (!stato.cartella || !stato.id || !stato.sessione) return;
  const chiave = chiaveCartellaAperta();
  let coll = null;
  try {
    const aperto = chiave ? await leggiScontroAperto() : null;
    if (aperto) {
      if (ultimoScontroLetto?.id !== aperto.id || ultimoScontroLetto?.revisione !== aperto.revisione) {
        ultimoScontroLetto = { ...aperto, scontro: await leggiScontro(aperto.id) };
      }
      coll = collegamentoScontro(ultimoScontroLetto.scontro, chiave);
    }
  } catch {
    return; // server spento: resta quello che c'era, l'indicatore del collegamento lo dice
  }
  const prima = stato.scontroPg;
  stato.scontroPg = coll;
  flussoAvvisiScheda(chiave, coll);
  const dati = stato.dati;
  if (!prima && coll) {
    stato.roundFinale = null;
    avviso(`Sei nello scontro «${coll.nome}»: il Round lo fa avanzare il master dalla plancia (Round ${coll.round}).`, { tipo: 'info', chiave: 'round-scontro' });
  } else if (prima && coll && coll.round !== prima.round) {
    const scadute = [...tecnicheScadute(alRound(stato.sessione, prima.round), prima.round, coll.round, dati), ...statiScaduti(prima, coll)];
    avviso([`Round ${coll.round} (dallo scontro).`, scadute.length ? `Scadut${scadute.length === 1 ? 'a' : 'e'}: ${scadute.join(', ')}.` : null].filter(Boolean), { tipo: scadute.length ? 'ok' : 'info', chiave: 'round-scontro' });
  } else if (prima && !coll) {
    stato.roundFinale = { id: stato.id, round: prima.round };
    const ancora = durateCarta(alRound(stato.sessione, prima.round), null, dati);
    avviso([`Lo scontro «${prima.nome}» è finito: il contatore dei Round torna alla scheda (Round ${prima.round}).`,
      ancora.length ? `Durate ancora attive, con i Round che restano: ${ancora.map(testoDurata).join(', ')}.` : null].filter(Boolean), { tipo: 'info', durata: 9000, chiave: 'round-scontro' });
  } else if (!(prima && coll && JSON.stringify([prima.durate, prima.effetti, prima.diTurno, prima.turnoDi]) !== JSON.stringify([coll.durate, coll.effetti, coll.diTurno, coll.turnoDi]))) return;
  ridisegnaSchedaQuandoLibera();
}

/**
 * Ridisegno della scheda dopo un aggiornamento periodico: se il giocatore sta usando un controllo (tendina, campo,
 * pannello «Attiva» o «Lancia!» aperto) si rinvia, come nella plancia (src/ui/ridisegno.js).
 */
function ridisegnaSchedaQuandoLibera() {
  if (!inScheda()) return;
  const occupato = controlloInUso(radice, document.activeElement) || !!stato.ui?.tecnica || !!document.querySelector('.attacco-sfondo');
  if (!occupato) { renderScheda({ mantieniScorrimento: true }); return; }
  if (stato.ridisegnoRinviato) return;
  stato.ridisegnoRinviato = true;
  const riprova = () => {
    if (!stato.ridisegnoRinviato) return;
    if (controlloInUso(radice, document.activeElement) || !!stato.ui?.tecnica || !!document.querySelector('.attacco-sfondo')) { setTimeout(riprova, 1000); return; }
    stato.ridisegnoRinviato = false;
    if (inScheda()) renderScheda({ mantieniScorrimento: true });
  };
  setTimeout(riprova, 1000);
}

/** Impronta del testo che l'export (e la cartella) darebbe oggi al personaggio. */
function improntaLocale(id) {
  const p = archivio.carica(id);
  if (!p) return null;
  return impronta(fileEsportazione(normalizza(p.scelte, stato.dati).scelte, p.livelli ?? [], p.sessione ?? null, normalizzaCalendario(p.calendario, stato.dati), p.pg ?? null).testo);
}

/** Indicatore «Salvato sul PC del master alle hh:mm» della scheda aperta, o null senza server. */
function indicatoreSalvataggio(id) {
  const p = id ? archivio.carica(id) : null;
  if (!p) return null;
  return statoSalvataggioMaster({ server: !!stato.cartella, haNome: haNome(p.scelte), cartella: p.cartella ?? null, improntaLocale: improntaLocale(id) }, stato.dati);
}
/** Aggiorna l'indicatore sul posto, senza ridisegnare la scheda. */
function aggiornaIndicatoreSalvataggio() {
  const el = document.querySelector('.indicatore-salvataggio');
  const i = indicatoreSalvataggio(stato.id);
  if (!el || !i) return;
  el.className = `indicatore-salvataggio ${i.stato}`;
  el.textContent = i.testo;
  el.title = i.file ? `File: personaggi/${i.file}` : '';
}

/** Registra la sincronizzazione con il file `file` alla revisione `mtime`, con l'impronta del contenuto attuale. */
function segnaSincronizzato(id, file, mtime) {
  archivio.segnaCartella(id, { file, mtime, salvato: archivio.carica(id).aggiornato, impronta: improntaLocale(id) });
}

/** Ultima versione del file del personaggio aperto: { file, mtime, testo, sessione } o null. */
async function versioneRemota() {
  const voce = archivio.carica(stato.id);
  const lista = await elencoCartella();
  const { remoto } = controllaRemoto(voce, lista ?? []);
  if (!remoto) return null;
  const { testo, mtime } = await leggiCartellaConRevisione(remoto.file);
  const p = deserializzaPersonaggio(testo);
  const { scelte } = normalizza(p.creazione, stato.dati);
  return { file: remoto.file, mtime: Number(mtime), testo, nome: String(scelte.nome ?? '').trim() || 'Senza nome', sessione: sessioneAllineata(scelte, p.livelli ?? [], p.sessione) };
}

/**
 * Carica nella scheda la versione del file (il master l'ha cambiata): la voce del browser prende il
 * testo del file, la scheda resta sulla stessa tab e allo stesso punto.
 */
async function ricaricaDaCartella(v = null) {
  const id = stato.id;
  try {
    v ??= await versioneRemota();
  } catch {
    return false;
  }
  if (!v || id !== stato.id) return false;
  const prima = stato.sessione;
  clearTimeout(attesaCartella.get(id));
  attesaCartella.delete(id);
  const voce = archivio.carica(id);
  salvaDaTesto(v.testo, id, voce?.passo ?? PASSO_SCHEDA);
  const ora = archivio.carica(id);
  segnaSincronizzato(id, v.file, v.mtime);
  stato.scelte = normalizza(ora.scelte, stato.dati).scelte;
  stato.livelli = ora.livelli ?? [];
  stato.sessione = ora.sessione;
  stato.calendario = normalizzaCalendario(ora.calendario, stato.dati);
  // «Annulla» riporterebbe i valori di prima del master
  stato.precedenteTavolo = null;
  stato.collegamento.conflitto = null;
  const diff = differenzeSessione(prima, stato.sessione, nomeStato);
  stato.messaggioScheda = { tipo: 'ok', testo: `Il master ha aggiornato la tua scheda${diff.length ? `: ${diff.join('; ')}` : ''}.` };
  if (inScheda()) renderScheda({ mantieniScorrimento: true });
  return true;
}

/** Il file è cambiato mentre la scheda aveva modifiche da scrivere: avviso con «Aggiorna» e «Tieni la mia». */
async function apriConflitto() {
  const id = stato.id;
  // nessuna modifica vera (il contenuto è quello già sincronizzato): si ricarica e basta
  const voce = archivio.carica(id);
  if (!stato.collegamento.conflitto && voce?.cartella?.impronta && voce.cartella.impronta === improntaLocale(id)) return ricaricaDaCartella();
  let v;
  try {
    v = await versioneRemota();
  } catch {
    return;
  }
  if (!v || id !== stato.id) return;
  clearTimeout(attesaCartella.get(id));
  attesaCartella.delete(id);
  const c = stato.collegamento.conflitto;
  if (c && c.file === v.file && c.mtime === v.mtime) return;
  stato.collegamento.conflitto = v;
  if (inScheda()) renderScheda({ mantieniScorrimento: true });
}

/** Riga nel registro dello scontro aperto (se c'è), con un nuovo tentativo se un'altra finestra l'ha cambiato. */
async function rigaRegistro(testo) {
  try {
    const aperto = await leggiScontroAperto();
    if (!aperto) return;
    let s = await leggiScontro(aperto.id);
    for (let i = 0; i < 3; i++) {
      const r = await salvaScontro(registraRiga(s, testo));
      if (r.conflitto === undefined || !r.conflitto || r.conflitto.stato !== 'aperto') return;
      s = r.conflitto;
    }
  } catch {
    // il registro è un promemoria: senza scontro leggibile la scelta vale comunque
  }
}

/** Scelte dell'avviso. «Aggiorna»: la versione del master. «Tieni la mia»: la scheda riscrive il file. */
async function sceltaConflitto(scelta) {
  const c = stato.collegamento.conflitto;
  if (!c) return;
  const nome = stato.scelte.nome.trim() || 'Personaggio';
  if (scelta === 'aggiorna') {
    const diff = differenzeSessione(stato.sessione, c.sessione, nomeStato);
    // la versione più recente del file, se nel frattempo è cambiata ancora
    if (await ricaricaDaCartella()) rigaRegistro(testoScelta(nome, 'aggiorna', diff));
    return;
  }
  const diff = differenzeSessione(c.sessione, stato.sessione, nomeStato);
  stato.collegamento.conflitto = null;
  // con la revisione vista nell'avviso: se il master ha scritto ancora, l'avviso torna con i suoi valori nuovi
  const r = await scriviInCartella(stato.id, { revisione: true, mtime: String(c.mtime) });
  if (r) {
    stato.messaggioScheda = { tipo: 'ok', testo: 'Hai tenuto la tua versione: è stata salvata nella cartella al posto di quella del master.' };
    rigaRegistro(testoScelta(nome, 'tieni', diff));
  }
  if (inScheda()) renderScheda({ mantieniScorrimento: true });
}

/** Sessione allineata ai massimi attuali (inizializzata se manca), o null se la scheda non si calcola. */
function sessioneAllineata(creazione, livelli, sessione) {
  const scheda = calcolaScheda({ creazione, livelli }, stato.dati);
  if (!scheda.caratteristiche) return sessione ?? null;
  return allineaSessione(sessione, massimiSessione(scheda, creazione, stato.dati));
}

/**
 * Personaggio dal testo di un export (file importato o file della cartella), salvato nel browser con
 * `id` (nuovo se manca). @returns {{ id, scelte, avvisi }}
 */
function salvaDaTesto(testo, id = archivio.nuovoId(), passo = null) {
  const { creazione, livelli, sessione: sessioneFile, calendario: calendarioFile, pg } = deserializzaPersonaggio(testo);
  const { scelte, avvisi } = normalizza(creazione, stato.dati);
  const errLivelli = livelli.length ? calcolaScheda({ creazione: scelte, livelli }, stato.dati).errori.filter((e) => e.campo.startsWith('livelli')) : [];
  if (errLivelli.length) avvisi.push(`Livelli con errori rispetto ai dati attuali: ${errLivelli[0].problema}`);
  // punti liberi in eccesso con le regole correnti (7 per Grado dal 04/10/2026, A.90): si segnalano all'import
  const eccesso = calcolaScheda({ creazione: scelte, livelli }, stato.dati).avvisoPunti;
  if (eccesso) avvisi.push(`${eccesso.testo} (${eccesso.eventi.map((e) => e.testo).join('; ')}).`);
  const sessione = sessioneAllineata(scelte, livelli, sessioneFile);
  const calendario = normalizzaCalendario(calendarioFile, stato.dati);
  if (!archivio.salva({ id, scelte, livelli, sessione, calendario, pg, passo: passo ?? (livelli.length || calcolaScheda(scelte, stato.dati).completa ? PASSO_SCHEDA : 0) })) {
    throw new Error(archivio.erroreSalvataggio() === 'quota' ? 'spazio del browser esaurito: esporta e rimuovi personaggi vecchi, poi riprova.' : 'il browser non permette di salvare (navigazione privata o permessi).');
  }
  return { id, scelte, avvisi };
}

/**
 * Sincronizza browser e cartella (src/cartella.js → confronta): vince il più recente, con un avviso.
 * @returns elenco unito per la pagina iniziale, con gli avvisi
 */
async function sincronizzaCartella() {
  const remoti = await elencoCartella();
  if (!remoti) return { righe: elencoUnito(archivio.elenco(), null), avvisi: ['Cartella personaggi/ non leggibile: elenco del solo browser.'] };
  const avvisi = [];
  for (const r of elencoUnito(archivio.elenco(), remoti).filter((x) => x.origine === 'entrambi')) {
    const { azione, conflitto } = confronta(r.voce, r.remoto);
    const nome = r.voce.scelte?.nome?.trim() || 'Senza nome';
    if (azione === 'leggi') {
      try {
        const testo = await leggiCartella(r.remoto.file);
        const prima = r.voce.aggiornato;
        salvaDaTesto(testo, r.voce.id, r.voce.passo);
        segnaSincronizzato(r.voce.id, r.remoto.file, r.remoto.mtime);
        avvisi.push(conflitto || prima
          ? `«${nome}»: la copia nella cartella (${r.remoto.file}) era più recente di quella del browser ed è stata caricata.`
          : `«${nome}»: caricata dalla cartella (${r.remoto.file}).`);
      } catch (e) {
        avvisi.push(`«${nome}»: file ${r.remoto.file} non leggibile (${e.message}); resta la copia del browser.`);
      }
    } else if (azione === 'scrivi') {
      const w = await scriviInCartella(r.voce.id);
      if (w && conflitto) avvisi.push(`«${nome}»: la copia del browser era più recente di quella nella cartella ed è stata salvata come ${w.file}.`);
    }
  }
  // personaggi del browser mai salvati nella cartella (creati prima del server): ci vanno ora; chi è già
  // stato sincronizzato e non ha più il file è stato tolto a mano dalla cartella, e non si ricrea
  // (l'abbinamento ai file è per identificativo: un PG nuovo non prende mai il file di un altro con un nome simile)
  for (const r of elencoUnito(archivio.elenco(), remoti).filter((x) => x.origine === 'browser' && !x.voce.cartella)) await scriviInCartella(r.voce.id);
  return { righe: elencoUnito(archivio.elenco(), await elencoCartella()), avvisi };
}

async function importa(file) {
  try {
    const { id, scelte, avvisi } = salvaDaTesto(await file.text());
    if (stato.cartella) await scriviInCartella(id);
    stato.messaggioHome = {
      tipo: avvisi.length ? 'attenzione' : 'ok',
      testo: `Importato «${scelte.nome || file.name}».`,
      dettagli: avvisi,
    };
  } catch (e) {
    stato.messaggioHome = { tipo: 'errore', testo: `Import non riuscito: ${e.message}` };
  }
  renderHome();
}


// ---------------------------------------------------------------------------
// Home

/**
 * Pagina iniziale. Con il server della cartella (server.mjs) prima si mostra il browser, poi si
 * sincronizza con personaggi/ e si ridisegna con l'elenco unito (`unito`: { righe, avvisi }).
 */
function renderHome(unito = null) {
  nascondiTooltip();
  document.title = 'Mutant — Creazione personaggio';
  const righe = unito?.righe ?? elencoUnito(archivio.elenco(), null);
  // i punti da chiarire delle regole del personaggio: il Bestiario proposto (solo Tavolo del Master) ha i suoi
  const todo = trovaTodo(Object.fromEntries(Object.entries(stato.dati).filter(([k]) => !FILE_SOLO_TAVOLO.includes(k))));
  const msg = stato.messaggioHome ?? (unito?.avvisi.length ? { tipo: 'attenzione', testo: 'Cartella personaggi/', dettagli: unito.avvisi } : null);
  stato.messaggioHome = null;
  if (stato.cartella && !unito) {
    sincronizzaCartella().then((u) => { if (['', '#', '#/'].includes(location.hash)) renderHome(u); });
  }

  const inputFile = h('input', { type: 'file', accept: '.json,application/json', class: 'nascosto',
    onchange: (e) => e.target.files[0] && importa(e.target.files[0]) });

  svuota(radice, h('section', { class: 'home' },
    h('h1', {}, 'I tuoi personaggi'),
    msg ? h('div', { class: `riquadro ${msg.tipo}`, role: 'status' }, h('p', {}, msg.testo),
      msg.dettagli?.length ? h('ul', {}, msg.dettagli.map((d) => h('li', {}, d))) : null) : null,
    h('div', { class: 'riga-azioni' },
      h('button', { type: 'button', class: 'btn primario', onclick: nuovoPersonaggio }, 'Nuovo personaggio'),
      h('button', { type: 'button', class: 'btn', onclick: () => inputFile.click() }, 'Importa file JSON'),
      // Tavolo del Master: solo con il server della cartella (server.mjs)
      stato.cartella ? h('button', { type: 'button', class: 'btn btn-tavolo-direttore', onclick: () => vai('#/tavolo') },
        iconaPagina('combattimento', '96', { classe: 'icona-pulsante', lato: 24 }), 'Tavolo del Master') : null,
      inputFile),
    righe.length
      ? h('ul', { class: 'elenco-personaggi' }, righe.map((r) => (r.voce ? rigaPersonaggio(r.voce, r.origine) : rigaCartella(r.remoto))))
      : h('p', { class: 'vuoto' }, stato.cartella ? 'Nessun personaggio nel browser né nella cartella personaggi/.' : 'Nessun personaggio salvato in questo browser.'),
    h('p', { class: 'nota' }, stato.cartella
      ? 'I personaggi si salvano in questo browser e nella cartella personaggi/ del progetto (server di Mutant): i file sono gli stessi di «SALVA PG». Se le due copie differiscono vince la più recente, con un avviso.'
      : 'I personaggi si salvano automaticamente in questo browser. Per spostarli su un altro dispositivo o passarli al master, usa «SALVA PG (Esporta JSON)» e Importa.'),
    h('section', { class: 'info-dati' },
      h('h2', {}, 'Dati delle regole'),
      h('p', {}, stato.versioni),
      stato.avvisiDati.length ? h('details', {}, h('summary', {}, `${stato.avvisiDati.length} avvisi sui dati (non bloccanti)`),
        h('ul', {}, stato.avvisiDati.map((a) => h('li', {}, h('code', {}, `${a.file} › ${a.chiave}`), ': ', a.problema)))) : null,
      todo.length ? h('details', {}, h('summary', {}, `${todo.length} valori o domande marcati TODO(Davide) nei dati`),
        h('ul', {}, todo.map((t) => h('li', {}, h('code', {}, t.percorso), ' — ', t.testo)))) : null)));
}

// origine di un personaggio nella pagina iniziale, con il server della cartella
const ORIGINI = { browser: 'solo browser', entrambi: 'cartella e browser', cartella: 'solo cartella' };
// suggerimenti al passaggio del mouse: che cosa vuol dire l'etichetta e che cosa si può fare
const SPIEGA_ORIGINI = {
  browser: 'Solo browser: il personaggio è salvato in questo browser ma non nella cartella personaggi/ del server. Aprilo e salvalo per metterne una copia nella cartella.',
  entrambi: 'Cartella e browser: il file è in personaggi/ ed è aperto anche in questo browser. Le modifiche fatte qui si salvano anche nella cartella.',
  cartella: 'Solo cartella: il file è in personaggi/ ma non è mai stato aperto in questo browser. Aprilo per lavorarci.',
};

function rigaPersonaggio(p, origine = 'browser') {
  const s = p.scelte ?? {};
  const livelli = Array.isArray(p.livelli) ? p.livelli : [];
  const data = p.aggiornato ? new Date(p.aggiornato).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '';
  return h('li', { class: 'carta personaggio' },
    h('div', {},
      h('h2', {}, s.nome?.trim() || 'Senza nome', stato.cartella ? h('span', { class: 'etichetta origine-personaggio', title: SPIEGA_ORIGINI[origine] }, ORIGINI[origine]) : null),
      h('p', {}, h('strong', {}, `Livello ${1 + livelli.length}`), ' · ', [s.corporazione, s.addestramento, s.classe].filter(Boolean).join(' · ') || 'Appena iniziato'),
      h('p', { class: 'nota' }, `Modificato ${data}`, p.cartella?.file ? ` · cartella: ${p.cartella.file}` : '')),
    h('div', { class: 'riga-azioni' },
      h('button', { type: 'button', class: 'btn primario', onclick: () => vai(p.passo === PASSO_SCHEDA ? `#/p/${p.id}` : `#/p/${p.id}/${p.passo ?? 0}`) }, 'Apri'),
      h('button', { type: 'button', class: 'btn', onclick: () => esporta(normalizza(s, stato.dati).scelte, livelli, p.sessione ?? null, normalizzaCalendario(p.calendario, stato.dati), assicuraPg(p.id)) }, 'SALVA PG (Esporta JSON)'),
      h('button', { type: 'button', class: 'btn pericolo', onclick: () => {
        if (confirm(`Eliminare «${s.nome?.trim() || 'Senza nome'}» da questo browser? L’operazione non si annulla (esporta prima il file se vuoi conservarlo).`)) {
          archivio.elimina(p.id);
          renderHome();
        }
      } }, 'Elimina')));
}

/**
 * Apre nell'app un personaggio della cartella (pagina iniziale, Tavolo del Master): prima si
 * sincronizzano browser e cartella (vince il più recente), poi si apre la copia del browser; se il
 * personaggio è solo nella cartella lo si porta nel browser.
 */
async function apriDaCartella(r, { dalTavolo = false, dallaMappa = null } = {}) {
  try {
    await sincronizzaCartella();
    const locale = elencoUnito(archivio.elenco(), [r]).find((x) => x.origine === 'entrambi')?.voce ?? null;
    let id = locale?.id ?? null;
    if (!id) {
      const testo = await leggiCartella(r.file);
      const nuovo = salvaDaTesto(testo);
      id = nuovo.id;
      segnaSincronizzato(id, r.file, r.mtime);
      if (nuovo.avvisi.length) stato.messaggioScheda = { tipo: 'attenzione', testo: nuovo.avvisi.join(' ') };
    }
    const p = archivio.carica(id);
    // aperta dalla plancia: la scheda mostra «← Torna al tavolo» (anche dopo F5)
    if (dalTavolo) segnaDalTavolo(sessionStorage, id, window.scrollY);
    // aperta dalla mappa di battaglia: «Torna alla mappa» riporta alla scena, allo zoom e alla posizione di prima
    if (dallaMappa) segnaDallaMappa(sessionStorage, { scena: dallaMappa.scena, id, vista: dallaMappa.vista });
    vai(p.passo === PASSO_SCHEDA ? `#/p/${id}` : `#/p/${id}/${p.passo ?? 0}`);
  } catch (e) {
    stato.messaggioHome = { tipo: 'errore', testo: `Apertura di ${r.file} non riuscita: ${e.message}` };
    vai('#/');
  }
}

/** Personaggio presente solo nella cartella (creato su un altro PC o copiato a mano): «Apri» lo porta nel browser. */
function rigaCartella(r) {
  const data = new Date(r.mtime).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
  const apri = () => apriDaCartella(r);
  // file provvisorio di un PG senza nome (versioni precedenti): «senza nome», con che cosa fare
  const provvisorio = fileProvvisorio(r.file);
  return h('li', { class: 'carta personaggio' },
    h('div', {},
      h('h2', {}, provvisorio ? 'Senza nome' : r.nome.replace(/-/g, ' '), provvisorio
        ? h('span', { class: 'etichetta origine-personaggio', title: 'File provvisorio di un personaggio salvato prima di avere un nome (versioni precedenti): aprilo e dagli un nome, e il file prende il nome giusto; se non serve, toglilo dalla cartella personaggi/.' }, 'senza nome')
        : h('span', { class: 'etichetta origine-personaggio', title: SPIEGA_ORIGINI.cartella }, ORIGINI.cartella)),
      h('p', {}, h('strong', {}, `Livello ${r.livello}`), ' · ', r.file),
      h('p', { class: 'nota' }, `Modificato ${data}`)),
    h('div', { class: 'riga-azioni' }, h('button', { type: 'button', class: 'btn primario', onclick: apri }, 'Apri')));
}

function nuovoPersonaggio() {
  const id = archivio.nuovoId();
  // l'identificativo nasce con il personaggio (src/character.js → nuovoPg): non dipende dal nome
  if (!archivio.salva({ id, scelte: nuoveScelte(), passo: 0, pg: nuovoPg() })) {
    stato.messaggioHome = { tipo: 'attenzione', testo: 'Il browser non permette di salvare: il personaggio andrà perso chiudendo la pagina. Usa Esporta per conservarlo.' };
  }
  stato.id = null;
  vai(`#/p/${id}/0`);
}

// ---------------------------------------------------------------------------
// Wizard

function contesto() {
  const { dati, scelte } = stato;
  const scheda = calcolaScheda(scelte, dati);
  const schedaPersonaggio = calcolaScheda(personaggio(), dati);
  const ctx = {
    dati,
    scelte,
    scheda,
    schedaPersonaggio,
    livelli: stato.livelli,
    motivoNoSalita: schedaPersonaggio.completamenti?.length ? motivoCompletamento(schedaPersonaggio.completamenti)
      : !scheda.completa ? 'Completa la creazione (passi precedenti) prima di salire di livello.'
        : schedaPersonaggio.errori.length ? 'Correggi gli errori dei livelli (o annulla l’ultimo) prima di salire ancora.' : null,
    saliDiLivello,
    stampa: () => vai(`#/p/${stato.id}/stampa`),
    annullaUltimoLivello: annullaLivello,
    ante: anteprima(scelte, dati),
    ui: stato.ui,
    versioni: stato.versioni,
    aggiorna,
    esporta: () => esporta(stato.scelte, stato.livelli, stato.sessione, stato.calendario, assicuraPg(stato.id)),
    ridisegnaRiepilogo,
    ridisegna: () => renderWizard(),
  };
  return ctx;
}

/** Applica una modifica alle scelte, invalida ciò che non torna più a valle e salva. */
function aggiorna(modifica, { ridisegna = true } = {}) {
  // Con livelli acquisiti la creazione è bloccata: cambiarla renderebbe incoerenti i livelli.
  const bloccati = Object.keys(modifica).filter((k) => !CAMPI_LIBERI_DOPO_LIVELLI.includes(k));
  if (stato.livelli.length && bloccati.length) {
    stato.avvisi = [`La creazione è bloccata perché il personaggio è ${conOrdinale('al', 1 + stato.livelli.length)} livello. Per cambiarla annulla prima i livelli dalla scheda finale.`];
    stato.precedente = null;
    return renderWizard();
  }
  const prima = stato.scelte;
  const { scelte, avvisi } = applicaModifica(prima, modifica, stato.dati);
  stato.scelte = scelte;
  if (avvisi.length) {
    stato.avvisi = avvisi;
    stato.precedente = prima;
  } else if (ridisegna) {
    stato.avvisi = [];
    stato.precedente = null;
  }
  persisti();
  if (ridisegna || avvisi.length) renderWizard();
  else ridisegnaRiepilogo();
}

function annulla() {
  stato.scelte = stato.precedente;
  stato.precedente = null;
  stato.avvisi = [];
  persisti();
  renderWizard();
}

function ridisegnaRiepilogo() {
  const vecchio = radice.querySelector('.riepilogo');
  if (vecchio) vecchio.replaceWith(renderRiepilogo(contesto()));
}

function renderWizard() {
  nascondiTooltip();
  const ctx = contesto();
  const visibili = PASSI.map((_, i) => i).filter((i) => passoVisibile(i, ctx));
  if (!visibili.includes(stato.passo)) stato.passo = visibili.find((i) => i > stato.passo) ?? visibili.at(-1);
  const passo = PASSI[stato.passo];
  const requisito = requisitoPasso(stato.passo, ctx);
  const pos = visibili.indexOf(stato.passo);
  const prec = visibili[pos - 1];
  const succ = visibili[pos + 1];
  const requisitoSucc = succ === undefined ? null : requisitoPasso(succ, ctx);
  document.title = `${stato.scelte.nome.trim() || 'Nuovo personaggio'} — ${passo.titolo} · Mutant`;

  const nav = h('nav', { class: 'passi', 'aria-label': 'Passi della creazione' },
    h('ol', {}, visibili.map((i, n) => {
      const p = PASSI[i];
      const req = requisitoPasso(i, ctx);
      const completo = !req && p.completo(ctx);
      return h('li', {}, h('button', {
        type: 'button',
        class: `passo-link${i === stato.passo ? ' attuale' : ''}${completo ? ' completo' : ''}`,
        'aria-current': i === stato.passo ? 'step' : null,
        disabled: !!req && i !== stato.passo,
        title: req ?? (completo ? 'Completo' : 'Da completare'),
        onclick: () => vaiAlPasso(i),
      }, h('span', { class: 'num' }, completo ? '✓' : String(n)), h('span', { class: 'etichetta-passo' }, p.titolo)));
    })));

  const avvisi = stato.avvisi.length ? h('div', { class: 'riquadro attenzione avvisi', role: 'alert' },
    h('p', {}, h('strong', {}, stato.precedente ? 'La modifica ha cambiato scelte successive:' : 'Attenzione:')),
    h('ul', {}, stato.avvisi.map((a) => h('li', {}, a))),
    h('div', { class: 'riga-azioni' },
      stato.precedente ? h('button', { type: 'button', class: 'btn', onclick: annulla }, 'Annulla la modifica') : null,
      h('button', { type: 'button', class: 'btn', onclick: () => { stato.avvisi = []; stato.precedente = null; renderWizard(); } }, 'Ho capito'))) : null;

  const corpo = requisito
    ? [h('p', { class: 'nota errore' }, requisito)]
    : passo.render(ctx);
  // la stessa barra in cima e (se il passo supera lo schermo) in fondo: src/ui/navigazione.js
  const barra = (posizione) => barraPassi({
    posizione,
    indietro: prec !== undefined ? { etichetta: '← Indietro', onclick: () => vaiAlPasso(prec) } : { etichetta: '← Personaggi', onclick: () => vai('#/') },
    avanti: succ !== undefined
      ? { etichetta: `${PASSI[succ].titolo} →`, corta: 'Avanti →', disabilitato: !!requisitoSucc, motivo: requisitoSucc, onclick: () => vaiAlPasso(succ) }
      : { etichetta: 'Torna ai personaggi', primario: false, onclick: () => vai('#/') },
  });
  const fondo = barra('fondo');

  svuota(radice, h('div', { class: 'wizard' },
    nav,
    h('div', { class: 'layout' },
      h('section', { class: 'passo', 'aria-labelledby': 'titolo-passo' },
        h('header', { class: 'passo-testa' },
          h('p', { class: 'sopratitolo' }, `Passo ${pos} di ${visibili.length - 1} · ${passo.rif}`),
          h('h1', { id: 'titolo-passo' }, passo.titolo)),
        stato.salvataggioOk ? null : h('p', { class: 'riquadro errore', role: 'alert' }, testoSalvataggioFallito()),
        stato.livelli.length && stato.passo !== PASSO_SCHEDA ? h('p', { class: 'riquadro attenzione no-stampa' },
          `Personaggio ${conOrdinale('al', 1 + stato.livelli.length)} livello: la creazione si può consultare ma non modificare (tranne nome, Background, ritratto, anagrafica ed equipaggiamento). Per cambiarla annulla i livelli dalla scheda finale.`) : null,
        barra('cima'),
        avvisi,
        corpo,
        fondo),
      renderRiepilogo(ctx))));
  barraFondoSeServe(fondo, radice);
  // Su telefono la barra dei passi scorre: tiene visibile il passo corrente.
  // (solo scorrimento orizzontale della barra: la pagina non deve saltare)
  const attuale = nav.querySelector('.attuale');
  if (attuale && nav.scrollWidth > nav.clientWidth) {
    const a = attuale.getBoundingClientRect();
    const n = nav.getBoundingClientRect();
    nav.scrollLeft += a.left + a.width / 2 - (n.left + n.width / 2);
  }
}

// ---------------------------------------------------------------------------
// Sali di livello (cap. 8): bozza in memoria, salvata solo con "Conferma"

function saliDiLivello() {
  stato.sali = { voce: {}, passo: 0, ui: { aperti: new Set(), filtroTalenti: null } };
  vai(`#/p/${stato.id}/sali/0`);
}

/** Massimi di sessione del personaggio attuale (null se la scheda non si calcola). */
function massimiAttuali() {
  const scheda = calcolaScheda(personaggio(), stato.dati);
  return scheda.caratteristiche ? massimiSessione(scheda, stato.scelte, stato.dati) : null;
}

/** Cambia i livelli e porta PV e PM attuali insieme ai massimi (sessioneDopoLivello). */
function cambiaLivelli(livelli) {
  const prima = massimiAttuali();
  stato.livelli = livelli;
  const dopo = massimiAttuali();
  if (prima && dopo && stato.sessione) stato.sessione = sessioneDopoLivello(stato.sessione, prima, dopo);
}

function annullaLivello() {
  const n = 1 + stato.livelli.length;
  if (!stato.livelli.length || !confirm(`Annullare ${conOrdinale('il', n)} livello? Le sue scelte andranno perse (si torna ${conOrdinale('al', n - 1)} livello).`)) return;
  cambiaLivelli(annullaUltimoLivello(personaggio()).livelli);
  persisti();
  stato.messaggioScheda = { tipo: 'ok', testo: `${n}° livello annullato.` };
  renderScheda();
}

// ---------------------------------------------------------------------------
// Completamento dei Punti Abilità di un evento passato (regole aggiornate, per-davide A.52):
// bozza in memoria, salvata nell'evento a cui appartiene solo con «Conferma»

function apriCompleta() {
  if (!stato.completa) stato.completa = { modo: 'completa', punti: {} };
  renderCompletaPagina();
  window.scrollTo(0, 0);
}

function renderCompletaPagina() {
  nascondiTooltip();
  const { dati } = stato;
  const bozza = stato.completa;
  document.title = `${stato.scelte.nome.trim() || 'Personaggio'} — Punti Abilità da assegnare · Mutant`;
  svuota(radice, ...renderCompleta({
    dati,
    personaggio: personaggio(),
    bozza: bozza.punti,
    titoloAvviso: dati.regole.regole_aggiornate?.punti_abilita ?? 'Regole aggiornate',
    aggiornaBozza(punti) {
      bozza.punti = punti;
      renderCompletaPagina();
    },
    conferma() {
      const ev = puntiDaCompletare(personaggio(), dati)[0];
      if (!ev || validaCompletamento(personaggio(), ev.livello, bozza.punti, dati).length) return renderCompletaPagina();
      // i punti inattivi dell'evento escono, quelli della bozza entrano (§8.3)
      const p = applicaCompletamento(personaggio(), ev.livello, bozza.punti, ev.inattivi);
      stato.scelte = p.creazione;
      stato.livelli = p.livelli;
      stato.completa = null;
      persisti();
      const restano = puntiDaCompletare(personaggio(), dati).reduce((s, c) => s + c.mancanti, 0);
      stato.messaggioScheda = { tipo: 'ok', testo: `Punti Abilità ${ev.livello === 1 ? 'della creazione' : `${conOrdinale('del', ev.livello)} livello`} ${ev.riassegna ? 'riassegnati' : 'assegnati'}.${restano ? ` Ne restano ${restano} da assegnare.` : ''}` };
      if (!stato.salvataggioOk) alert(`Punti assegnati, ma non salvati nel browser. ${testoSalvataggioFallito()}`);
      vai(`#/p/${stato.id}`);
    },
    esci() {
      stato.completa = null;
      vai(`#/p/${stato.id}`);
    },
  }));
  const fondo = radice.querySelector('.barra-fondo');
  if (fondo) barraFondoSeServe(fondo, radice);
}

// Punti Abilità Liberi in eccesso (correzione di Davide del 03/10/2026, E&L: 5 per Grado anziché 10): bozza
// in memoria, tolta dall'evento a cui appartiene solo con «Conferma»
function apriTogli() {
  if (!stato.completa) stato.completa = { modo: 'togli', punti: {} };
  renderTogliPagina();
  window.scrollTo(0, 0);
}

function renderTogliPagina() {
  nascondiTooltip();
  const { dati } = stato;
  const bozza = stato.completa;
  const avviso = calcolaScheda(personaggio(), dati).avvisoPunti;
  document.title = `${stato.scelte.nome.trim() || 'Personaggio'} — Punti Abilità in eccesso · Mutant`;
  svuota(radice, ...renderTogli({
    dati,
    personaggio: personaggio(),
    bozza: bozza.punti,
    testoAvviso: avviso?.testo ?? (dati.regole.regole_aggiornate?.punti_abilita ?? 'Regole aggiornate'),
    aggiornaBozza(punti) {
      bozza.punti = punti;
      renderTogliPagina();
    },
    conferma() {
      const ev = statoRimozione(personaggio(), {}, dati);
      if (!ev || validaRimozione(personaggio(), ev.livello, bozza.punti, dati).length) return renderTogliPagina();
      const p = applicaRimozione(personaggio(), ev.livello, bozza.punti);
      stato.scelte = p.creazione;
      stato.livelli = p.livelli;
      stato.completa = null;
      persisti();
      const restano = calcolaScheda(personaggio(), dati).avvisoPunti?.totale ?? 0;
      stato.messaggioScheda = { tipo: 'ok', testo: `Tolti ${ev.eccesso} Punti Abilità ${ev.livello === 1 ? 'della creazione' : `${conOrdinale('del', ev.livello)} livello`}.${restano ? ` Ne restano ${restano} da togliere.` : ''}` };
      if (!stato.salvataggioOk) alert(`Punti tolti, ma non salvati nel browser. ${testoSalvataggioFallito()}`);
      vai(`#/p/${stato.id}`);
    },
    esci() {
      stato.completa = null;
      vai(`#/p/${stato.id}`);
    },
  }));
  const fondo = radice.querySelector('.barra-fondo');
  if (fondo) barraFondoSeServe(fondo, radice);
}

function apriSali(passo) {
  if (!stato.sali) stato.sali = { voce: {}, passo: 0, ui: { aperti: new Set(), filtroTalenti: null } };
  stato.sali.passo = passo;
  renderSaliPagina();
  window.scrollTo(0, 0);
}

function renderSaliPagina() {
  nascondiTooltip();
  const { dati } = stato;
  const bozza = stato.sali;
  document.title = `${stato.scelte.nome.trim() || 'Personaggio'} — Sali al livello ${2 + stato.livelli.length} · Mutant`;
  svuota(radice, ...renderSali({
    dati,
    personaggio: personaggio(),
    voce: bozza.voce,
    passo: bozza.passo,
    ui: bozza.ui,
    aggiornaVoce(modifica) {
      const voce = { ...bozza.voce, ...modifica };
      // le chiavi vuote si tolgono: il motore rifiuta le scelte non previste dal livello
      for (const [k, v] of Object.entries(voce)) {
        if (v === undefined || v === null || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length) || (Array.isArray(v) && !v.length)) delete voce[k];
      }
      bozza.voce = voce;
      renderSaliPagina();
    },
    vaiPasso: (i) => vai(`#/p/${stato.id}/sali/${i}`),
    conferma() {
      if (validaLivello(personaggio(), bozza.voce, dati).length) return renderSaliPagina();
      cambiaLivelli(applicaLivello(personaggio(), bozza.voce).livelli);
      stato.sali = null;
      stato.passo = PASSO_SCHEDA;
      persisti();
      if (!stato.salvataggioOk) alert(`Livello aggiunto, ma non salvato nel browser. ${testoSalvataggioFallito()}`);
      vai(`#/p/${stato.id}`);
    },
    esci() {
      if (bozzaModificata() && !confirm(MSG_USCITA)) return;
      stato.sali = null;
      vai(`#/p/${stato.id}`);
    },
  }));
  const fondoSali = radice.querySelector('.barra-fondo');
  if (fondoSali) barraFondoSeServe(fondoSali, radice);
}

// ---------------------------------------------------------------------------
// Vista di stampa: quattro fogli A4 orizzontali dai soli valori calcolati

async function apriStampa() {
  nascondiTooltip();
  document.title = `${stato.scelte.nome.trim() || 'Personaggio'} — Stampa · Mutant`;
  // A.91: con il server i veicoli si stampano dal registro unico; se non risponde, il foglio lo dice
  let registroVeicoli = null;
  if (stato.cartella) {
    const chi = { pg: archivio.carica(stato.id)?.pg ?? null, chiave: chiavePersonaggio(stato.scelte?.nome ?? ''), nome: String(stato.scelte?.nome ?? '').trim() };
    try { registroVeicoli = { record: await elencoVeicoli(), chi }; } catch (e) { registroVeicoli = { record: [], chi, errore: e.message }; }
  }
  const stampa = preparaStampa(personaggio(), stato.dati, { versioniDati: stato.versioni, registroVeicoli, modificatori: stato.sessione });
  const opzioni = normalizzaOpzioniStampa(stato.opzioniStampa);
  // le preferenze di stampa si salvano con il personaggio: ogni giocatore le ritrova come le ha lasciate
  const cambiaOpzioni = (modifica) => {
    stato.opzioniStampa = normalizzaOpzioniStampa({ ...opzioni, ...modifica });
    persisti();
    apriStampa();
  };
  svuota(radice, ...renderStampa({ stampa, opzioni, cambiaOpzioni, torna: () => vai(`#/p/${stato.id}`) }));
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------------------
// Scheda a tab (#/p/<id>) e modalità tavolo

function apriScheda(tab) {
  if (tab) stato.tab = tab;
  stato.passo = PASSO_SCHEDA;
  persisti();
  renderScheda();
  window.scrollTo(0, 0);
  migraVeicoliAllApertura();
}

/**
 * A.91 (difetto del collaudo del 05/10/2026): con il server i veicoli ancora nel file del PG passano nel registro
 * appena si apre la scheda, non solo dalla tab Veicoli; nel PG resta il riferimento.
 */
function migraVeicoliAllApertura() {
  if (!stato.cartella || !(stato.scelte?.veicoli ?? []).some((v) => v && typeof v === 'object' && !eRiferimento(v))) return;
  const id = stato.id;
  const prima = stato.scelte.veicoli;
  const chi = { pg: archivio.carica(id)?.pg ?? null, chiave: chiavePersonaggio(stato.scelte?.nome ?? ''), nome: String(stato.scelte?.nome ?? '').trim() };
  migraNelRegistro(prima, chi).then((m) => {
    if (stato.id !== id || stato.scelte.veicoli !== prima) return; // cambiato nel frattempo: ci pensa la tab
    if (!m.veicoli.some((v, i) => eRiferimento(v) && !eRiferimento(prima[i]))) return;
    const { scelte } = applicaModifica(stato.scelte, { veicoli: m.veicoli }, stato.dati);
    stato.scelte = scelte;
    stato.messaggioScheda = { tipo: m.avvisi.length ? 'attenzione' : 'ok', testo: [`Veicoli nel registro unico del Tavolo (A.91): ${m.nuovi.map((x) => x.mezzo.nome).join(', ') || 'riferimenti aggiornati'}.`, ...m.avvisi].join(' ') };
    persisti();
    if (stato.passo === PASSO_SCHEDA) renderScheda({ mantieniScorrimento: true });
  }).catch(() => { /* registro non raggiungibile: resta la copia locale */ });
}

/** Cambia tab senza aggiungere voci alla cronologia: il tasto Indietro non scorre le tab. */
function vaiTab(id) {
  stato.tab = id;
  history.replaceState(null, '', `#/p/${stato.id}/t/${id}`);
  renderScheda();
  window.scrollTo(0, 0);
}

function renderScheda({ mantieniScorrimento = false } = {}) {
  nascondiTooltip();
  const y = window.scrollY;
  const { dati } = stato;
  // Round collegato allo scontro (src/round-scontro.js): la sessione vista al Round dello scontro, in memoria; si
  // salva solo con la prossima modifica del giocatore
  if (stato.sessione) stato.sessione = sessioneVista();
  if (stato.roundFinale && (stato.roundFinale.id !== stato.id || (stato.sessione?.round ?? 1) >= stato.roundFinale.round)) stato.roundFinale = null;
  // le tab mostrano i valori effettivi con le condizioni della sessione; la stampa no
  const tab = preparaTab(personaggio(), dati, { sessione: stato.sessione });
  // quinta tab, solo con il calendario attivo (non tocca preparaTab: la stampa resta com'è)
  if (tab.tab.length && calendarioAttivo(stato.calendario)) tab.tab.push({ id: 'calendario', titolo: 'Calendario', contatore: testoNote(contaNote(stato.calendario)) });
  // gli otto tab fissi (docs/layout-sd.md): preparaTab non cambia, la stampa resta com'è
  if (tab.tab.length) tab.tab = tabFissi(tab.tab);
  document.title = `${stato.scelte.nome.trim() || 'Personaggio'} — Scheda · Mutant`;
  if (!tab.tab.length) {
    svuota(radice, h('section', { class: 'passo' },
      h('h1', {}, stato.scelte.nome.trim() || 'Personaggio'),
      h('p', { class: 'nota errore' }, 'La scheda non si può ancora calcolare: completa la creazione.'),
      h('button', { type: 'button', class: 'btn primario', onclick: () => vaiAlPasso(0) }, 'Continua la creazione')));
    return;
  }
  const massimi = massimiSessione(tab.scheda, stato.scelte, dati);
  // Se i massimi sono cambiati (nuovo livello, tabella modificata) i valori attuali si limitano,
  // senza riazzerarli; alla prima apertura la sessione si inizializza ai massimi.
  const allineata = allineaSessione(stato.sessione, massimi);
  if (JSON.stringify(allineata) !== JSON.stringify(stato.sessione)) {
    stato.sessione = allineata;
    persisti();
  }
  const richiesta = ALIAS_TAB[stato.tab] ?? stato.tab;
  const attiva = tab.tab.some((t) => t.id === richiesta) ? richiesta : 'identita';
  const impostazioni = archivio.leggiImpostazioni();
  applicaSfondo(stato.sfondi.find((s) => s.id === impostazioni.sfondo)?.url ?? null);
  const schedaCreazione = calcolaScheda(stato.scelte, dati);
  const messaggio = stato.messaggioScheda;
  stato.messaggioScheda = null;

  // Ogni modifica di sessione salva subito e tiene da parte lo stato precedente per «Annulla».
  const ricordaPrecedente = () => { stato.precedenteTavolo = { sessione: stato.sessione, calendario: stato.calendario }; };
  const cambiaSessione = (nuova, { ridisegna = true } = {}) => {
    if (!nuova) return;
    ricordaPrecedente();
    stato.sessione = nuova;
    persisti();
    if (ridisegna) renderScheda({ mantieniScorrimento: true });
  };

  svuota(radice, ...renderTab({
    dati,
    tab,
    attiva,
    scelte: stato.scelte,
    livelli: stato.livelli,
    sessione: stato.sessione,
    massimi,
    penalita: penalitaSessione(stato.sessione, dati),
    posizione: impostazioni.posizioneTab,
    larghezza: impostazioni.larghezzaScheda,
    sfondi: stato.sfondi,
    sfondo: impostazioni.sfondo,
    ritrattoIntestazione: impostazioni.ritrattoIntestazione,
    filigrana: impostazioni.filigranaCorporazione,
    puoAnnullareSessione: !!stato.precedenteTavolo,
    // scheda aperta dalla plancia del Tavolo del Master: il pulsante per tornarci (src/ui/ritorno.js)
    tornaAlTavolo: arrivoDalTavolo(sessionStorage, stato.id) ? () => { tornaAlTavolo(sessionStorage); vai('#/tavolo'); } : null,
    // scheda aperta dalla mappa di battaglia: il pulsante grande per tornarci (src/ui/ritorno.js)
    tornaAllaMappa: arrivoDallaMappa(sessionStorage, stato.id) ? () => { const scena = tornaAllaMappa(sessionStorage); vai(`#/mappa/${scena}`); } : null,
    // pezzo 6: indicatore e avviso del collegamento, solo con il server della cartella
    collegamento: indicatoreCollegamento(stato.cartella, stato.collegamento.stato === 'collegato'),
    // verifica del 06/10/2026: dove sta la scheda (src/collegamento.js → statoSalvataggioMaster)
    salvataggioMaster: indicatoreSalvataggio(stato.id),
    avvisoMaster: stato.cartella && stato.collegamento.conflitto ? {
      differenze: differenzeSessione(stato.sessione, stato.collegamento.conflitto.sessione, nomeStato),
      ora: new Date(stato.collegamento.conflitto.mtime),
      // quale PG e quale file (bug del 04/10/2026): chi legge capisce se è davvero il suo
      nome: stato.collegamento.conflitto.nome ?? null,
      file: stato.collegamento.conflitto.file ?? null,
      aggiorna: () => sceltaConflitto('aggiorna'),
      tieni: () => sceltaConflitto('tieni'),
    } : null,
    calendario: stato.calendario,
    // Round dello scontro (src/round-scontro.js): { id, nome, round, durate, effetti, partecipanti } o null
    roundScontro: stato.scontroPg,
    // bersagli di un incantesimo con durata, nel pannello «Lancia!»: gli altri partecipanti dello scontro
    partecipanti: stato.scontroPg?.partecipanti ?? [],
    spazioQuasiEsaurito: archivio.spazioQuasiEsaurito(),
    motivoNoSalita: tab.scheda.completamenti?.length ? motivoCompletamento(tab.scheda.completamenti)
      : !schedaCreazione.completa ? 'Completa la creazione prima di salire di livello.'
        : tab.errori.length ? 'Correggi gli errori dei livelli (o annulla l’ultimo) prima di salire ancora.' : null,
    // regole aggiornate (regole.json → regole_aggiornate): punti da completare e in eccesso
    avvisoRegole: dati.regole.regole_aggiornate?.punti_abilita ?? 'Regole aggiornate',
    avvisoMancanti: dati.regole.regole_aggiornate?.mancanti ?? null,
    // A.91: registro unico dei veicoli solo con il server; il PG si riconosce dal suo identificativo e dalla chiave
    server: Boolean(stato.cartella),
    chi: { pg: archivio.carica(stato.id)?.pg ?? null, chiave: chiavePersonaggio(stato.scelte?.nome ?? ''), nome: String(stato.scelte?.nome ?? '').trim() },
    messaggio: messaggio ?? (stato.salvataggioOk ? null : { tipo: 'errore', testo: testoSalvataggioFallito() }),
    passi: { background: 0, equipaggiamento: PASSO_EQUIPAGGIAMENTO },
    ui: stato.ui,
    azioni: {
      vaiTab,
      // 08/10: «Muovi il PG sulla mappa» (riquadro «Scontro in corso»): la vista tablet della scena dello scontro, con il PG
      muoviSullaMappa: stato.scontroPg && chiaveCartellaAperta() ? () => vai(urlMuovi(chiaveCartellaAperta(), stato.scontroPg.id, stato.id)) : null,
      // A.136: in «Attacca!» la Corsa o lo Scatto del PG nel Round, dalla scena dello scontro
      movimentoMappa: stato.scontroPg && chiaveCartellaAperta() ? () => leggiMovimentoRound(stato.scontroPg.id, idPg(chiaveCartellaAperta())) : null,
      sali: saliDiLivello,
      completaPunti: () => vai(`#/p/${stato.id}/completa`),
      togliPunti: () => vai(`#/p/${stato.id}/togli`),
      annullaLivello,
      stampa: () => vai(`#/p/${stato.id}/stampa`),
      esporta: () => esporta(stato.scelte, stato.livelli, stato.sessione, stato.calendario, assicuraPg(stato.id)),
      modificaCreazione: (passo = 0) => vaiAlPasso(passo),
      nuovaSessione: () => {
        if (!confirm('Nuova sessione: PV e PM tornano ai massimi, Stati, Ferite e Affaticamento si azzerano, il Round torna a 1 senza Tecniche attive. Note, Punti Eroe e Distintivi restano. Procedere?')) return;
        cambiaSessione(nuovaSessione(stato.sessione, massimi));
      },
      annullaSessione: () => {
        if (!stato.precedenteTavolo) return;
        ({ sessione: stato.sessione, calendario: stato.calendario } = stato.precedenteTavolo);
        stato.precedenteTavolo = null;
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      varia: (campo, delta) => cambiaSessione(variaSessione(stato.sessione, campo, delta, massimi)),
      imposta: (campo, valore) => cambiaSessione(modificaSessione(stato.sessione, { [campo]: valore }, massimi)),
      commutaStato: (id) => cambiaSessione(commutaStato(stato.sessione, id, massimi)),
      condizioneOggetto: (uid) => cambiaSessione(commutaCondizioneOggetto(stato.sessione, uid, massimi)),
      // impianti attivabili (src/impianti.js): «Somministra», cartucce, «Attiva» dei chip; null = non si può
      impianto: (fn, motivo = null) => {
        const nuova = fn(modificaSessione(stato.sessione, {}, massimi));
        if (!nuova) { stato.messaggioScheda = { tipo: 'attenzione', testo: motivo ?? 'Azione non possibile.' }; renderScheda({ mantieniScorrimento: true }); return; }
        cambiaSessione(modificaSessione(nuova, {}, massimi));
      },
      // chip del Processore dalla nota «+4 se con il chip attivo» (tab Abilità): «Attiva» o «Termina»
      chip: (uid) => {
        const imp = impiantiAttivabili(stato.scelte.equipaggiamento, dati).find((x) => x.chip.some((c) => c.uid === uid));
        if (!imp) { stato.messaggioScheda = { tipo: 'attenzione', testo: 'Il chip conta solo con un Processore neurale di Abilità installato (Equipaggiamento §7.10).' }; renderScheda({ mantieniScorrimento: true }); return; }
        const st = statoProcessore(stato.sessione, imp, dati);
        const c = st.chip.find((x) => x.uid === uid);
        const nuova = c.acceso ? terminaChip(stato.sessione, imp) : attivaChip(stato.sessione, imp, uid, dati);
        if (!nuova) { stato.messaggioScheda = { tipo: 'attenzione', testo: `${c.nome}: ${c.motivo ?? 'non si può attivare'}.` }; renderScheda({ mantieniScorrimento: true }); return; }
        cambiaSessione(modificaSessione(nuova, {}, massimi));
      },
      // Talenti (docs/censimento-talenti.md): situazionali e interruttore globale
      talento: (chiave) => cambiaSessione(commutaTalento(stato.sessione, chiave, massimi)),
      bonusTalenti: () => cambiaSessione(commutaBonusTalenti(stato.sessione, massimi)),
      condizioneArma: (uid, id) => cambiaSessione(impostaCondizioneArma(stato.sessione, uid, id, massimi)),
      ripara: (uid, piNuovi, costo) => cambiaSessione(riparaOggetto(stato.sessione, uid, piNuovi, costo, massimi)),
      // pannello «Attacca!»: le scelte si ricordano senza diventare «l'ultima modifica» da annullare;
      // «Spara» sì, così «Annulla» lo copre
      ricordaAttacco: (uid, scelte) => {
        stato.sessione = modificaSessione(stato.sessione, { attacchi: { ...(stato.sessione?.attacchi ?? {}), [uid]: scelte } }, massimi);
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      // granate da lancio: il colpo si scala dalla voce (Armamenti §7.20.3, src/sessione.js → consumaColpi)
      spara: (uid, munizioni) => cambiaSessione(consumaColpi(stato.sessione, uid, munizioni, massimi)),
      // ritocchi del 07/10: nello scontro aperto, «Attacca!» contro un nemico dello scontro con «Applica il danno»
      // (src/ui/attacco-pg.js); il bersaglio proposto dalla linea di tiro della mappa, se c'è
      controNemico: stato.scontroPg && stato.cartella ? (c, a, r) => bloccoControNemico(c, a, r, {
        scontro: stato.scontroPg, pg: { id: idPg(chiaveCartellaAperta()), nome: stato.scelte.nome.trim() || 'PG' },
        bersaglio: stato.sessione?.attacchi?.[a.uid]?.bersaglioScontro ?? null,
        aggiorna: () => aggiornaRoundScontro(),
      }) : null,
      // pannello «Lancia!»: come per l'attacco, le scelte si ricordano senza diventare l'ultima modifica
      ricordaLancio: (nome, scelte) => {
        stato.sessione = modificaSessione(stato.sessione, { lanci: { ...(stato.sessione?.lanci ?? {}), [nome]: scelte } }, massimi);
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      // «Lancia!»: PM spesi e, se l'incantesimo ha una durata, fra gli incantesimi in corso (src/durate-incantesimi.js); in
      // uno scontro il Round è quello del server al momento del lancio
      lancia: async (fonte, registrazione = null) => {
        if (stato.scontroPg && registrazione) { await aggiornaRoundScontro(); stato.sessione = sessioneVista(); }
        let nuova = spendiPmLancio(stato.sessione, fonte, massimi);
        if (nuova && registrazione) {
          const quando = calendarioAttivo(stato.calendario) ? momentoCalendario(stato.calendario, dati) : null;
          const con = registraIncantesimo(nuova, { ...registrazione, ...(quando ? { quando } : {}) }, dati);
          const interrotte = concentrazioniInterrotte(nuova, con);
          if (interrotte.length) avviso(`Concentrazione interrotta: ${interrotte.join(', ')} (si mantiene un solo incantesimo).`, { tipo: 'info' });
          nuova = modificaSessione(con, {}, massimi);
        }
        cambiaSessione(nuova);
      },
      terminaIncantesimo: (uid) => cambiaSessione(modificaSessione(terminaIncantesimo(stato.sessione, uid), {}, massimi)),
      // Batteria Matrice (Magia §26.4) e Artefatti con attivazione a durata (Armamenti §7.24): modifiche annullabili
      ricaricaMatrice: (uid, ore, presso) => cambiaSessione(ricaricaMatrice(stato.sessione, uid, ore, presso, dati, massimi)),
      attivaArtefatto: (uid, pm) => cambiaSessione(attivaArtefatto(stato.sessione, uid, pm, massimi)),
      // Tecniche Interiori (Giocatore §8.9.1, src/tecniche.js): ogni passo è una modifica annullabile
      // in uno scontro il Round è quello del server al momento dell'attivazione: si rilegge prima (vale l'ordine del server)
      attivaTecnica: async (id, opz) => {
        if (stato.scontroPg) { await aggiornaRoundScontro(); stato.sessione = sessioneVista(); }
        const nuova = attivaTecnicaSessione(stato.sessione, tab.scheda, id, dati, opz, massimi);
        if (!nuova) { avvisoErrore('Tecnica non attivata: il Round o i PM sono cambiati nel frattempo (una sola Tecnica per Round, §8.9.1).'); renderScheda({ mantieniScorrimento: true }); return; }
        cambiaSessione(nuova);
      },
      // con lo scontro il Round lo fa avanzare la plancia: il pulsante è disattivato (src/ui/tecniche.js)
      nuovoRound: () => {
        if (stato.scontroPg) return;
        const prima = stato.sessione;
        const dopo = nuovoRoundSessione(prima, massimi);
        const scadute = tecnicheScadute(prima, prima.round ?? 1, dopo.round, dati);
        if (scadute.length) avviso(`Round ${dopo.round}. Scadut${scadute.length === 1 ? 'a' : 'e'}: ${scadute.join(', ')}.`, { chiave: 'round-scheda' });
        cambiaSessione(dopo);
      },
      terminaTecnica: (id) => cambiaSessione(terminaTecnicaSessione(stato.sessione, id, massimi)),
      convertiDistintivi: () => cambiaSessione(convertiDistintivi(stato.sessione, massimi)),
      // le note si salvano a ogni tasto; l'annullamento riporta al testo di prima della modifica
      inizioNote: ricordaPrecedente,
      // calendario: ogni modifica (note, «Avanza», attivazione) salva ed è annullabile
      cambiaCalendario: (nuovo, { tab: vaiA = null } = {}) => {
        if (!nuovo) return;
        ricordaPrecedente();
        stato.calendario = nuovo;
        persisti();
        if (vaiA) return vaiTab(vaiA);
        renderScheda({ mantieniScorrimento: true });
      },
      // file del solo calendario (src/calendario.js → fileCalendario): l'export del personaggio non cambia
      esportaCalendario: () => {
        if (stato.calendario) scaricaFile(nomeFileCalendario(stato.scelte.nome), `${JSON.stringify(fileCalendario(stato.calendario, stato.scelte.nome), null, 2)}\n`);
      },
      // import: prima si legge e si controlla il file, poi un riquadro chiede conferma (ui.importaCalendario)
      leggiCalendario: async (file) => {
        stato.ui.importaCalendario = leggiFileCalendario(await file.text(), dati);
        renderScheda({ mantieniScorrimento: true });
      },
      confermaCalendario: () => {
        const r = stato.ui.importaCalendario;
        stato.ui.importaCalendario = null;
        if (!r?.ok) return renderScheda({ mantieniScorrimento: true });
        ricordaPrecedente();
        stato.calendario = r.calendario;
        persisti();
        vaiTab('calendario');
      },
      annullaImportCalendario: () => {
        stato.ui.importaCalendario = null;
        renderScheda({ mantieniScorrimento: true });
      },
      // ingranaggio: la prima attivazione chiede inizio e fascia (pannello); poi si accende e spegne
      calendarioAttivo: (attivo) => {
        if (attivo && !stato.calendario) {
          const oggi = new Date();
          const due = (n) => String(n).padStart(2, '0');
          stato.ui.attivaCalendario = { inizio: `${oggi.getFullYear()}-${due(oggi.getMonth() + 1)}-${due(oggi.getDate())}`, fascia: dati.regole.calendario.fasce[0].id };
          return renderScheda({ mantieniScorrimento: true });
        }
        ricordaPrecedente();
        stato.calendario = attivo ? attivaCalendario(stato.calendario, {}, dati) : disattivaCalendario(stato.calendario);
        persisti();
        if (attivo) return vaiTab('calendario');
        if (stato.tab === 'calendario') return vaiTab('identita');
        renderScheda({ mantieniScorrimento: true });
      },
      note: (testo) => {
        stato.sessione = modificaSessione(stato.sessione, { note: testo }, massimi);
        persisti();
      },
      // equipaggiamento: modificabile anche con livelli acquisiti (campo descrittivo della creazione)
      equipaggiamento: (voci) => {
        const { scelte, avvisi } = applicaModifica(stato.scelte, { equipaggiamento: voci }, dati);
        stato.scelte = scelte;
        if (avvisi.length) stato.messaggioScheda = { tipo: 'attenzione', testo: avvisi.join(' ') };
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      // tab Inventario (docs/layout-sd.md, pezzo 2): acquisto al tavolo, oggetto e crediti insieme
      compra: (voce, costo) => {
        const { scelte, avvisi } = applicaModifica(stato.scelte, { equipaggiamento: [...stato.scelte.equipaggiamento, voce] }, dati);
        stato.scelte = scelte;
        stato.sessione = variaSessione(stato.sessione, 'crediti', -costo, massimi);
        stato.messaggioScheda = avvisi.length ? { tipo: 'attenzione', testo: avvisi.join(' ') } : null;
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      ridisegna: () => renderScheda({ mantieniScorrimento: true }),
      // tab Veicoli: i mezzi del personaggio (scelte.veicoli: copie locali senza server, riferimenti al registro con il server, A.91)
      veicoli: (lista, messaggio = null) => {
        const { scelte, avvisi } = applicaModifica(stato.scelte, { veicoli: lista }, dati);
        stato.scelte = scelte;
        stato.messaggioScheda = avvisi.length ? { tipo: 'attenzione', testo: avvisi.join(' ') } : messaggio ? { tipo: 'ok', testo: messaggio } : null;
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      // tab Cibernetica, A.69 e A.70 (E&L del 05/10/2026): intervento su un impianto o Riabilitazione, con i crediti
      cibernetica: (modifica, costo = 0, messaggio = null) => {
        const { scelte, avvisi } = applicaModifica(stato.scelte, modifica, dati);
        stato.scelte = scelte;
        if (costo) stato.sessione = variaSessione(stato.sessione, 'crediti', -costo, massimi);
        stato.messaggioScheda = avvisi.length ? { tipo: 'attenzione', testo: avvisi.join(' ') } : messaggio ? { tipo: 'ok', testo: messaggio } : null;
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      // tab Cibernetica: perdite annullate per errore e recuperi concessi dal Direttore (Giocatore §5.21)
      umanita: (blocco) => {
        stato.scelte = applicaModifica(stato.scelte, { umanita: blocco }, dati).scelte;
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      // A.47: separa un esemplare danneggiato dal gruppo, con 1 PI in meno
      danneggiaEsemplare: (uid) => {
        const { voci, uid: nuovo } = separaEsemplare(stato.scelte.equipaggiamento, uid);
        if (!nuovo) return;
        stato.scelte = applicaModifica(stato.scelte, { equipaggiamento: voci }, dati).scelte;
        const m2 = massimiSessione(calcolaScheda(personaggio(), dati), stato.scelte, dati);
        stato.sessione = variaIntegrita(allineaSessione(stato.sessione, m2), nuovo, -1, m2);
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      munizioni: (uid, campo, delta) => cambiaSessione(variaMunizioni(stato.sessione, uid, campo, delta, massimi)),
      ricarica: (uid) => cambiaSessione(ricaricaArma(stato.sessione, uid, massimi)),
      // A.135: carichini rapidi
      usaCarichino: (uid) => cambiaSessione(caricaDaCarichino(stato.sessione, uid, massimi)),
      preparaCarichino: (uid) => cambiaSessione(preparaCarichino(stato.sessione, uid, massimi)),
      // §7.20.3: granata da caricare in un lanciagranate (un tipo alla volta)
      // le granate della carica di partenza tornano nell'Inventario come munizione di riferimento (§7.8)
      scegliGranata: (uid, voceUid) => {
        const ritorno = granateDiPartenza(stato.sessione, uid, voceUid, massimi);
        if (!ritorno) { cambiaSessione(scegliGranata(stato.sessione, uid, voceUid, massimi)); return; }
        stato.sessione = scegliGranata(stato.sessione, uid, voceUid, massimi);
        stato.scelte = applicaModifica(stato.scelte, { equipaggiamento: restituisciGranate(stato.scelte.equipaggiamento, ritorno, `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, dati) }, dati).scelte;
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      chroma: (uid, delta) => cambiaSessione(variaChroma(stato.sessione, uid, delta, massimi)),
      integrita: (uid, delta) => cambiaSessione(variaIntegrita(stato.sessione, uid, delta, massimi)),
      // riserva di un NEC (Equipaggiamento §5.4): ore, usi o Lx
      nec: (chiave, delta) => cambiaSessione(variaNec(stato.sessione, chiave, delta, massimi)),
      puntiEsperienza: (valore) => {
        stato.scelte = applicaModifica(stato.scelte, { puntiEsperienza: valore }, dati).scelte;
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      posizione: (valore) => {
        archivio.salvaImpostazioni({ ...archivio.leggiImpostazioni(), posizioneTab: valore });
        renderScheda({ mantieniScorrimento: true });
      },
      larghezza: (valore) => {
        archivio.salvaImpostazioni({ ...archivio.leggiImpostazioni(), larghezzaScheda: valore });
        renderScheda({ mantieniScorrimento: true });
      },
      sfondo: (valore) => {
        archivio.salvaImpostazioni({ ...archivio.leggiImpostazioni(), sfondo: valore });
        renderScheda({ mantieniScorrimento: true });
      },
      ritrattoIntestazione: (valore) => {
        archivio.salvaImpostazioni({ ...archivio.leggiImpostazioni(), ritrattoIntestazione: valore });
        renderScheda({ mantieniScorrimento: true });
      },
      filigrana: (valore) => {
        archivio.salvaImpostazioni({ ...archivio.leggiImpostazioni(), filigranaCorporazione: valore });
        renderScheda({ mantieniScorrimento: true });
      },
    },
  }));
  if (mantieniScorrimento) window.scrollTo(0, y);
}
