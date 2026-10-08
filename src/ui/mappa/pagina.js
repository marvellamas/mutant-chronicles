// Mappa di battaglia, lotto 2 (docs/battlemap/piano.md): pagina della scena nella vista master, #/mappa/<id>.
// Immagine di fondo (originale per il master, copia ridotta preparata qui per i giocatori), zoom con la rotella verso il
// puntatore e con + e −, spostamento con barra spaziatrice + mouse o trascinando, «Adatta allo schermo», griglia
// calibrata tracciando un quadretto o con i valori, colore e opacità, blocco. Ogni modifica si salva da sola sul
// server con la revisione; se la scena è cambiata altrove si avvisa e si riprende quella del server.
// Lotto 3: la scena si collega allo scontro aperto o a una bozza; i pezzi senza token si trascinano sulla mappa (o
// «Metti tutti»); i token si agganciano alla griglia, si spostano, si nascondono, si tolgono; il clic apre la carta
// nella plancia. PV, Stati, turno e ritratti si leggono ogni pochi secondi dalle fonti (./fonti.js), mai dalla scena.
// Lotto 4: nebbia (pennello e rettangolo, «Rivela» o «Copri», tutto, Ctrl+Z), semitrasparente qui e piena per i
// giocatori; gesti a due dita e doppio tocco (./gesti.js); sezione «Vista giocatori» con la scena mostrata, «Apri
// vista giocatori» e il codice QR.
// Lotto 5: muri e terreno difficile (pennello e rettangolo, «Muro», «Terreno difficile», «Gomma»); area raggiungibile del
// token scelto (Passo, Corri, Scatta) con il percorso sotto il puntatore; movimento con un clic o trascinando dentro
// l'area, registrato nel Round dello scontro, «Libero» (o Maiusc) per muovere dove si vuole; clic destro sul token; Ctrl+Z per l'ultima
// azione del master (movimento, muri, nebbia, token messo o tolto).
// Lotto 6: la plancia è la barra di destra (src/ui/tavolo.js con ctx.inMappa), con la mini-scheda del token scelto e il
// suo movimento in cima, «Scontro» (la plancia) e «Mappa» (collegamento, muri, nebbia, vista giocatori, griglia); tre
// disposizioni (Mappa grande, Equilibrata, Scontro grande) con i pulsanti in alto, Tab, doppio clic e trascinamento del
// bordo, ricordate per schermo; la barra dell'Iniziativa in cima con «Avanti» (lo stesso della plancia) e il centrare
// chi è di turno (./barra-iniziativa.js, src/mappa/iniziativa.js, src/mappa/disposizione.js).
// Logica pura in src/mappa/ (camera, griglia, token, partecipanti, nebbia, muri, area, annulla); disegno in ./canvas.js,
// ./disegno-token.js e ./disegno-aree.js.
import { h, svuota } from '../dom.js';
import { avviso, avvisoErrore } from '../avvisi.js';
import { cameraIniziale, zoomVerso, sposta, adatta, mappaDaSchermo, schermoDaMappa, rettangoloVisibile, mantieniCentro, riadattaCentro } from '../../mappa/camera.js';
import { DISPOSIZIONI, NOMI_DISPOSIZIONI, prossimaDisposizione, normalizzaDisposizione, larghezzaBarra, trascinaBordo, chiaveSchermo } from '../../mappa/disposizione.js';
import { barraIniziativa } from '../../mappa/iniziativa.js';
import { barraIniziativaEl, stileBordo } from './barra-iniziativa.js';
import { bordoToken, assegnaColori, cambiaColore, tavolozzaPer, famiglia } from '../../mappa/colori.js';
import { avversariZoc, avversariZocInattivi, celleZoc, passiInZoc, attacchiDiOpportunita, testoOpportunita, giaInQuestoRound } from '../../mappa/zoc.js';
import { scegliColore, chiedi, informa, apri as apriFinestrella } from '../finestrella.js';
import { calibraDaQuadretto, applicaGriglia, dimensioniMappa, lineeVisibili, testoScala } from '../../mappa/griglia.js';
import { creaTela } from './canvas.js';
import { leggiScena, salvaScena, caricaImmagine, controllaFile, preparaRidotta } from './api.js';
import { agganciaQ, centroToken, tokenSottoPunto, disponiInFila, sovrapposti, chiaveRif, dimensioni } from '../../mappa/token.js';
import { pezziDellaScena, pezziSenzaToken, tokenOrfani, tokenPerPezzo } from '../../mappa/partecipanti.js';
import { daBase64, inBase64, cella, conta } from '../../mappa/celle.js';
import { ostacoliVista, lineaDiTiro, testoCopertura, visuale as visualePg, nebbiaDopoVisuale, tokenPg } from '../../mappa/visuale.js';
import { fasciaDistanza } from '../../attacco.js';
import { CHIAVE_DALLA_MAPPA } from '../attacco.js';
import { tratto, valoreModo, nebbiaProvvisoria, chiudiPennellata, rettangoloNebbia, tuttaNebbia, trattiCoperti } from '../../mappa/nebbia.js';
import { trattoMuri, muriProvvisori, chiudiTrattoMuri, rettangoloMuri } from '../../mappa/muri.js';
import { areaRaggiungibile, costoVerso, percorso, statoFasce, fasciaDi, celleArea, piuVicinaRaggiungibile } from '../../mappa/area.js';
import { statoDiretta, visibileAiGiocatori } from '../../mappa/diretta.js';
import { salvaIniziale, ripristinaIniziale } from '../../mappa/iniziale.js';
import { muoviToken, usatoNelRound, fasceNelRound, mossoNelRound, annullaUltima, annullaUltimoMovimento, cambiaTokenAnnullabile, cambiaTemplateAnnullabile, cambiaPortaAnnullabile, togliTemplateAnnullabile, scadiTemplateAnnullabile, rimettiScaduti, nuovoTurno, turnoDi } from '../../mappa/annulla.js';
import { disegnaMuri, disegnaArea, disegnaPercorso, disegnaZoc, coloriAree, disegnaTemplate, disegnaPorte, disegnaLineaTiro, disegnaLuci } from './disegno-aree.js';
import { luceQ, luceIngombro, testoLuceBersaglio, categorieLuce, ambienteDi, trattoLuce, rettangoloLuce, conVoceLuce, cambiaAmbiente } from '../../mappa/luce.js';
import { celleTemplate, tokenDentro as tokenNelTemplate, nuovoTemplate, scaduto, direzioneVerso, ORIENTABILI, templateVisibili, ostacoliVisibili, ruota, cambiaMisura, permanente } from '../../mappa/template.js';
import { portaA, muriEffettivi, porteVicine, apriChiudi, nuovaPorta, conAzione, azpNelRound, orientamento, orientamentoPorta, ruotaPorta, opposto } from '../../mappa/porte.js';
import { apriMenuTemplate, sezioneTemplate, etichettaTemplate, testoMisure } from './template.js';
import { apriMenuToken, chiudiMenuToken, menuAperto } from './menu-token.js';
import { componiMenu, unisciMenu } from '../../mappa/menu.js';
import { diTurno, ordineIniziativa } from '../../scontro.js';
import { statoMovimento, muoviVeicolo, cambiaConducente, scegliAndatura } from '../../veicoli-registro.js';
import { DIREZIONI, NOMI_DIREZIONI, ingombroOrientato, ruotaSeLibero, sali, scendi, qPerScendere, veicoliVicini, aBordo, veicoloDi, veicoloFermo } from '../../mappa/veicoli-mappa.js';
import { rigaMovimentoLibero, rigaOpportunita, senzaOpportunitaDelMovimento, rigaPorta, rigaTemplateTolti, rigaGruppo, registraRiga } from '../../scontro.js';
import { tokenNelRettangolo, alternaSelezione, spostaGruppo } from '../../mappa/gruppo.js';
import { aggiornaInScontri } from '../immagine-nemico.js';
import { linkGuidaMappa } from '../guida.js';
import { aggiornaVeicolo } from '../veicoli-registro.js';
import { rigaAndature } from '../veicoli.js';
import { creaGesti } from './gesti.js';
import { svgQR } from '../../qr.js';
import { leggiRete } from '../collega.js';
import { creaFonti } from './fonti.js';
import { disegnaToken, coloriMappa, creaImmagini } from './disegno-token.js';
import { creaAudio } from './audio.js';
import { eventiScontro, musicaDi } from '../../mappa/audio.js';
import { scegliMusica } from '../musica.js';
import { leggiScontro, salvaScontro } from '../scontro.js';
import { cambiaBozza } from '../../preparazione.js';
import { sezioneScontro, sezioneToken, TIPO_TRASCINA } from './pannello-scontro.js';
import { renderTavolo } from '../tavolo.js';
import { segnaDallaMappa, vistaDaRimettere, dimenticaMappa } from '../ritorno.js';
import { scegliImmagineNemico, impostaImmagineNemico } from '../immagine-nemico.js';
import { impostazioniTablet, fondiMovimentiTablet } from '../../mappa/tablet.js';

const ATTESA_SALVATAGGIO_MS = 600;
const ATTESA_RIPROVA_MS = 5000; // dopo un errore di rete o del server
const SCARTO_AVVISO = 0.15; // riquadro tracciato poco quadrato: si avvisa (non si rifiuta)
const TRASCINAMENTO_MINIMO_PX = 4;
const PRESSIONE_LUNGA_MS = 550; // lotto 7: pressione lunga sul tablet = clic destro
const INTERVALLO_FONTI_MS = 3000; // come la plancia (src/ui/tavolo.js)
/** Gruppi della barra accanto alla mappa, nell'ordine (ritocchi del 06/10): chiave, segnalibro, suggerimento. */
const GRUPPI_BARRA = [
  ['scheda', 'Mini-scheda', 'Il token scelto: mini-scheda, movimento, Nascondi, Togli'],
  ['iniziativa', 'Iniziativa', 'Round, «Avanti», ordine d’Iniziativa, tiri da fare'],
  ['pg', 'PG', 'Le mini-schede dei PG al tavolo e i veicoli'],
  ['nemici', 'Nemici', 'Le mini-schede dei nemici nello scontro'],
  ['scontro', 'Scontro', 'Chi è al tavolo, bozze («Prepara scontro»), «Crea nemico», aggiungi nemici, durate, registro, bestiario'],
  ['mappa', 'Mappa', 'Collegamento, token da mettere, template, muri e porte, nebbia, luci, vista giocatori, griglia, scene'],
];

const numero = (n, cifre = 2) => String(Math.round(n * 10 ** cifre) / 10 ** cifre).replace('.', ',');
const ora = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const inCampo = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName ?? '') || e.target?.isContentEditable;

/**
 * Disegna la pagina della scena `ctx.id` in `radice`.
 * @param ctx { dati, id, azioni: { tavolo(), apriScheda(remoto, vista) } }
 * @returns {() => void} chiude la pagina (listener, osservatori, salvataggio in sospeso)
 */
export function renderMappa(radice, ctx) {
  const V = ctx.dati.mappa.vista;
  // 07/10: i mini-token ritagliano il ritratto alla stessa altezza dei token (data/mappa.json → token.ritratto_verticale)
  document.documentElement.style.setProperty('--ritratto-y', `${ctx.dati.mappa.token.ritratto_verticale * 100}%`);
  // 07/10: barretta dei PV dei mini-token (data/mappa.json → pv_token)
  for (const [k, v] of [['--pv-colore', ctx.dati.mappa.pv_token.colore], ['--pv-traccia', ctx.dati.mappa.pv_token.traccia], ['--pv-mini-alto', `${ctx.dati.mappa.pv_token.mini_token_px}px`]]) document.documentElement.style.setProperty(k, v);
  const st = {
    scena: null,
    immagine: null, // ImageBitmap dell'originale
    fileImmagine: null,
    cam: cameraIniziale(),
    strumento: 'sposta', // 'sposta' | 'calibra'
    quadretti: 1,
    calibrazione: null, // { a, b } in pixel della mappa
    spazio: false,
    trascina: null, // { id, x, y, mosso, modo }
    salvataggio: { modificata: false, inCorso: false, timer: null, testo: '' },
    chiusa: false,
    // lotto 3: fonti lette (scontro o bozza, schede, veicoli), pezzi che ne derivano, token scelto, pezzo da piazzare
    fonti: null,
    pezzi: [],
    mappaPezzi: new Map(),
    selezionato: null,
    daPiazzare: null,
    firmaPannello: null,
    // lotto 4: strumenti della nebbia e scena scelta per i giocatori (null = automatica)
    nebbia: { strumento: null, modo: 'rivela', lato: 3 },
    sceltaGiocatori: null,
    inGioco: null,
    // lotto 5: strumenti dei muri, fascia mostrata (1 Passo, 2 Corri, 3 Scatta), area del token scelto, percorso
    // fase 2, lotto 4: zone di luce a pennello (come il terreno difficile)
    luci: { strumento: null, modo: 'buio', lato: 3 },
    muri: { strumento: null, modo: 'muro', lato: 1, porta: { stato: ctx.dati.mappa.porte.stato_predefinito, segreta: false, verso: null } },
    fascia: 1,
    area: undefined,
    percorso: null,
    // difetto 2: carta del token scelto in un pannello accanto alla mappa (la plancia in modalità «carta sola»)
    cartaAperta: null,
    plancia: null,
    // lotto 6: disposizione della barra (per schermo), scheda della barra, plancia intera nella barra, centrare il turno
    disp: null,
    planciaBarra: null,
    centra: true,
    turnoVisto: null,
    // ritocchi del 06/10: l'area raggiungibile si mostra o si nasconde (pannello, clic destro, tasto M), ricordato
    mostraArea: true,
    // ZoC (07/10): le zone di controllo degli avversari del token scelto, interruttore «Mostra ZoC» (tasto Z)
    mostraZoc: true,
    // 07/10: barretta dei PV sui token, «Mostra PV sui token» (tasto P)
    mostraPv: true,
    // Attacchi di Opportunità segnalati da questa pagina ({ scontro, round, da, movimento }) e movimenti annullati:
    // il controllo «uno per Round» li vede subito, senza aspettare la rilettura dello scontro (Giocatore §5.3)
    opportunita: [],
    movimentiRitirati: new Set(),
    // diretta (07/10): il movimento mandato alla vista giocatori (chiave dell'ultimo stato, invio in corso, prossimo)
    diretta: { pronta: false, chiave: null, inVolo: false, prossimo: undefined, areaG: null },
  };
  const B = V.barra;
  const chiaveDisp = chiaveSchermo(window.screen?.width ?? 0, window.screen?.height ?? 0);
  const leggiLocale = (k) => { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; } };
  const scriviLocale = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* solo per questa volta */ } };
  // fase 2, lotto 1: template ad area. bozza: l'ultima scelta del mini-menu (ricordata); anteprima: il template che
  // segue il mouse mentre si piazza; sposta: l'id del template ripreso con «Sposta»; ancorato: cono e linea che partono
  // dal token scelto e si orientano verso il mouse
  st.tpl = { bozza: leggiLocale('mutant-mappa-template'), anteprima: null, sposta: null, ancorato: false, firma: null };
  st.disp = normalizzaDisposizione(leggiLocale(chiaveDisp), B);
  st.centra = leggiLocale('mutant-mappa-centra-turno') !== false;
  st.mostraArea = leggiLocale('mutant-mappa-mostra-area') !== false;
  st.mostraZoc = leggiLocale('mutant-mappa-mostra-zoc') !== false;
  st.mostraPv = leggiLocale('mutant-mappa-mostra-pv') !== false;
  // 07/10: le linee di controllo della linea di tiro (verso angoli e centro del bersaglio), spente di default
  st.dettaglioLinea = leggiLocale('mutant-mappa-dettaglio-linea') === true;
  const leggiFonti = creaFonti(ctx.dati);

  // ── Struttura della pagina, creata una volta: si aggiornano solo i testi e i campi ──
  const el = {};
  el.scegliFile = h('input', { type: 'file', accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp', hidden: true, onchange: (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) caricaDaFile(f); } });
  el.titolo = h('h1', { class: 'mappa-titolo' }, 'Mappa');
  // 08/10: se i giocatori (secondo schermo e tablet) vedono questa scena; un clic la mostra a loro
  el.aiGiocatori = h('button', { type: 'button', class: 'btn btn-piccolo indicatore-giocatori', onclick: () => { if (st.inGioco !== ctx.id) scegliPerGiocatori(ctx.id); else apriStrumento(el.pGiocatori); } });
  el.zoom = h('span', { class: 'mappa-zoom', title: 'Zoom (rotella, + e −)' }, '100 %');
  el.scala = h('span', { class: 'mappa-scala' });
  el.stato = h('span', { class: 'nota mappa-stato', 'aria-live': 'polite' });
  // lotto 6 (§11.1): tre disposizioni, sempre visibili in alto (anche Tab e doppio clic sul bordo)
  // difetto 1 del collaudo del lotto 7: barra su una riga anche a 1366 × 768 e su tablet; icone con il suggerimento, le
  // parole solo sugli schermi larghi (.lungo in css/style.css)
  const ICONE_DISPOSIZIONI = { mappa: '🗺', equilibrata: '⚖', scontro: '⚔' };
  const conIcona = (icona, testo) => [h('span', { class: 'icona', 'aria-hidden': 'true' }, icona), h('span', { class: 'lungo' }, ` ${testo}`)];
  el.btnDisp = Object.fromEntries(DISPOSIZIONI.map((d) => [d, h('button', { type: 'button', class: 'btn btn-piccolo', 'aria-pressed': 'false', 'aria-label': NOMI_DISPOSIZIONI[d], title: `${NOMI_DISPOSIZIONI[d]} (Tab per passare alla prossima)`, onclick: () => scegliDisposizione(d) }, conIcona(ICONE_DISPOSIZIONI[d], NOMI_DISPOSIZIONI[d]))]));
  el.btnGriglia = h('span', { class: 'mappa-disposizioni', role: 'group', 'aria-label': 'Disposizione' }, DISPOSIZIONI.map((d) => el.btnDisp[d]));
  el.btnCarica = h('button', { type: 'button', class: 'btn', title: 'Immagine di fondo: JPG, PNG o WEBP', onclick: () => el.scegliFile.click() }, 'Carica immagine');
  // ritocchi del 08/10 (test di Marcello): cinque gruppi distinti, che vanno a capo interi: 1 «Mutant», «← Tavolo» e il
  // nome della scena (la testata dell'app sparisce: una riga in meno); 2 zoom e disposizioni; 3 sovrapposizioni;
  // 4 «Strumenti» (il più importante), «⋯» e «?»; 5 suoni e stato del salvataggio
  el.barra = h('header', { class: 'mappa-barra' },
    h('span', { class: 'mappa-gruppo gruppo-app', role: 'group', 'aria-label': 'App' },
      h('a', { class: 'marchio marchio-in-linea', href: '#/', title: 'Elenco dei personaggi' }, 'Mutant'),
      h('button', { type: 'button', class: 'btn', title: 'Torna alla plancia del Tavolo del Master', 'aria-label': 'Torna al Tavolo', onclick: () => ctx.azioni.tavolo() }, conIcona('←', 'Tavolo')),
      el.titolo, el.aiGiocatori),
    h('span', { class: 'mappa-gruppo gruppo-vista', role: 'group', 'aria-label': 'Zoom e disposizione' },
      el.scegliFile,
      h('button', { type: 'button', class: 'btn tondo', title: 'Allontana (−)', 'aria-label': 'Allontana', onclick: () => zoomCentro(1 / V.passo_tasti) }, '−'),
      el.zoom,
      h('button', { type: 'button', class: 'btn tondo', title: 'Avvicina (+)', 'aria-label': 'Avvicina', onclick: () => zoomCentro(V.passo_tasti) }, '+'),
      h('button', { type: 'button', class: 'btn', title: 'Adatta allo schermo: tutta la mappa nel riquadro (tasto A, anche doppio clic su un punto vuoto)', 'aria-label': 'Adatta allo schermo', onclick: () => adattaSchermo() }, conIcona('⤢', 'Adatta')),
      el.btnGriglia),
    // ritocchi del 07/10: «Mostra / nascondi template» (Maiusc+T), con «anche i template a durata»
    el.sovrapposizioni = h('span', { class: 'mappa-sovrapposizioni mappa-gruppo gruppo-sovr', role: 'group', 'aria-label': 'Sovrapposizioni' },
        el.btnSovr = h('button', { type: 'button', class: 'btn btn-piccolo', 'aria-pressed': 'true', title: 'Mostra o nasconde i template senza durata, i muri, le porte e il terreno difficile (Maiusc+T); per il movimento valgono sempre', onclick: () => cambiaSovrapposizioni('master', 'nascoste') }, conIcona('◫', 'Template')),
        el.ancheDurata = h('label', { class: 'casella-sovr', title: 'Il pulsante nasconde e mostra anche i template con durata in Round' }, h('input', { type: 'checkbox', onchange: () => cambiaSovrapposizioni('master', 'ancheDurata') }), h('span', { class: 'lungo' }, ' anche a durata')),
        // ritocchi del 07/10: toglie in un colpo i template a durata (quelli dello scontro)
        h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Cancella template temporanei: toglie tutti i template a durata in Round; quelli senza durata, muri, porte e terreno restano (Ctrl+Z li rimette)', 'aria-label': 'Cancella template temporanei', onclick: () => cancellaTemplate({ tutti: false }) }, conIcona('🧹', 'Temporanei'))),
    h('span', { class: 'mappa-gruppo gruppo-strumenti', role: 'group', 'aria-label': 'Strumenti' },
      // lotto 7 (§12, menu superiore): gli strumenti del master in un menu
      // ritocchi del 08/10: categorie con intestazione e icona dai dati (data/mappa.json → strumenti); si ricostruisce a ogni
      // apertura, così stati e voci spente sono sempre quelli del momento
      el.strumenti = h('details', { class: 'menu-strumenti', ontoggle: (e) => { if (e.target.open) disegnaMenuStrumenti(); } },
        h('summary', { class: 'btn', title: 'Strumenti del master: immagine, griglia, nebbia, muri, scene, movimenti dei giocatori', 'aria-label': 'Strumenti' }, conIcona('🛠', 'Strumenti'), ' ▾'),
        el.vociStrumenti = h('div', { class: 'menu-strumenti-voci menu-strumenti-gruppi', role: 'menu' })),
      // «Altro»: immagine, scala della griglia e scorciatoie, fuori dalla riga
      el.altro = h('details', { class: 'menu-strumenti menu-altro' },
        h('summary', { class: 'btn', title: 'Altro: carica immagine, scala della griglia, scorciatoie', 'aria-label': 'Altro' }, '⋯'),
        h('div', { class: 'menu-strumenti-voci', role: 'menu' },
          h('button', { type: 'button', role: 'menuitem', class: 'voce-strumenti', title: 'Immagine di fondo: JPG, PNG o WEBP', onclick: () => { el.altro.open = false; el.scegliFile.click(); } }, 'Carica immagine…'),
          h('button', { type: 'button', role: 'menuitem', class: 'voce-strumenti', title: 'Scorciatoie e comandi (?)', onclick: () => { el.altro.open = false; apriAiuto(); } }, 'Scorciatoie e comandi (?)'),
          el.voceMostraPv = h('button', { type: 'button', role: 'menuitemcheckbox', class: 'voce-strumenti', 'aria-checked': 'true', title: 'Barretta rossa dei PV sotto i token (tasto P); i giocatori vedono sempre quella dei PG', onclick: () => { el.altro.open = false; cambiaMostraPv(); } }, 'Mostra PV sui token (P)'),
          h('p', { class: 'nota voce-strumenti-nota' }, el.scala))),
      h('button', { type: 'button', class: 'btn tondo', title: 'Scorciatoie e comandi (?)', 'aria-label': 'Scorciatoie e comandi', onclick: () => apriAiuto() }, '?')),
    h('span', { class: 'mappa-gruppo gruppo-suoni', role: 'group', 'aria-label': 'Suoni e salvataggio' },
      // suoni (07/10): musica di fondo dello scontro e, accanto, muto e volumi (disegnaAudio)
      el.audio = h('span', { class: 'mappa-audio', role: 'group', 'aria-label': 'Suoni' }),
      el.stato));
  el.riquadro = h('div', { class: 'mappa-tela', tabindex: '0', 'aria-label': 'Mappa: rotella per lo zoom, barra spaziatrice e mouse o trascinamento per spostarsi' });
  el.suggerimento = h('div', { class: 'mappa-suggerimento', hidden: true, role: 'status' });
  el.riquadro.append(el.suggerimento);
  // 07/10: Maiusc premuto con un token scelto = Libero (l'area sparisce); selezione multipla con il contatore
  el.liberoInfo = h('div', { class: 'mappa-badge mappa-badge-libero', hidden: true, role: 'status' }, 'Libero (Maiusc): clic dove vuoi, senza conteggio');
  el.gruppoInfo = h('div', { class: 'mappa-badge mappa-badge-gruppo', hidden: true, role: 'status' });
  el.riquadro.append(el.liberoInfo, el.gruppoInfo);
  el.pannello = h('div', { class: 'mappa-pannello', 'aria-label': 'Collegamento, template, muri, nebbia, luci, vista giocatori e griglia' });
  el.cartaCorpo = h('div', { class: 'mappa-carta-corpo' });
  el.carta = h('section', { class: 'mappa-carta', 'aria-label': 'Mini-scheda del token', hidden: true },
    h('div', { class: 'mappa-carta-testa' },
      h('strong', {}, 'Mini-scheda'),
      h('button', { type: 'button', class: 'btn btn-piccolo', title: 'La stessa mini-scheda nella plancia intera, con «Torna alla mappa»', onclick: () => apriNellaPlancia() }, 'Apri nella plancia'),
      h('button', { type: 'button', class: 'btn tondo', 'aria-label': 'Chiudi la mini-scheda', title: 'Chiudi (Esc)', onclick: () => chiudiCarta() }, '×')),
    el.cartaCorpo);
  el.secScontro = h('div');
  el.secToken = h('div');
  el.pGriglia = h('details', { class: 'mappa-sezione mappa-griglia' });
  el.pNebbia = h('details', { class: 'mappa-sezione mappa-nebbia', open: true });
  el.pMuri = h('details', { class: 'mappa-sezione mappa-muri' });
  el.pLuci = h('details', { class: 'mappa-sezione mappa-luci' });
  el.pGiocatori = h('details', { class: 'mappa-sezione mappa-giocatori' });
  el.pTemplate = h('details', { class: 'mappa-sezione mappa-template', open: true });
  // lotto 6: barra dell'Iniziativa in cima; a destra della mappa il bordo da trascinare e la barra (§11)
  el.iniziativa = h('div', { class: 'mappa-iniziativa-posto', hidden: true });
  // ritocchi del 06/10: la barra a gruppi, con i segnalibri fissi in cima (un clic porta alla sezione, quello attivo è
  // evidenziato). Ordine: chi si sta muovendo, chi tocca, i PG, i nemici, la gestione dello scontro, gli strumenti
  // della mappa. La plancia (src/ui/tavolo.js con ctx.inMappa.sezioni) riempie Iniziativa, PG, Nemici, Scontro e le
  // scene del gruppo Mappa.
  el.gruppi = Object.fromEntries(GRUPPI_BARRA.map(([k, titolo]) => [k, h('section', { class: 'laterale-sezione', id: `laterale-${k}`, 'aria-label': titolo, dataset: { gruppo: k } },
    h('h2', { class: 'laterale-titolo' }, titolo))]));
  el.slot = Object.fromEntries(['iniziativa', 'pg', 'nemici', 'scontro', 'mappa'].map((k) => [k, h('div', { class: `laterale-slot slot-${k}` })]));
  el.gruppi.scheda.append(el.carta, el.secToken);
  for (const k of ['iniziativa', 'pg', 'nemici', 'scontro']) el.gruppi[k].append(el.slot[k]);
  el.gruppi.mappa.append(el.pannello, el.slot.mappa);
  el.segnalibri = Object.fromEntries(GRUPPI_BARRA.map(([k, titolo, spiega]) => [k, h('button', { type: 'button', class: 'segnalibro', title: spiega, onclick: () => vaiAlGruppo(k) }, titolo)]));
  el.ridotta = h('div', { class: 'laterale-ridotta', 'aria-label': 'Mini-token: clic per la mini-scheda' });
  el.piena = h('div', { class: 'laterale-piena' },
    h('nav', { class: 'laterale-segnalibri', 'aria-label': 'Sezioni della barra' }, GRUPPI_BARRA.map(([k]) => el.segnalibri[k])),
    GRUPPI_BARRA.map(([k]) => el.gruppi[k]));
  el.laterale = h('aside', { class: 'mappa-laterale', 'aria-label': 'Scontro, mini-scheda e strumenti della mappa' }, el.ridotta, el.piena);
  el.bordo = h('div', { class: 'mappa-bordo', role: 'separator', 'aria-orientation': 'vertical', 'aria-label': 'Bordo fra mappa e barra: trascina per allargare, doppio clic per cambiare disposizione', title: 'Trascina per allargare o stringere la barra; doppio clic: prossima disposizione', tabindex: '0' });
  el.corpo = h('div', { class: 'mappa-corpo' }, el.riquadro, el.bordo, el.laterale);
  el.pagina = h('section', { class: 'mappa-pagina' }, el.barra, el.iniziativa, el.corpo);
  svuota(radice, el.pagina);

  // ── Disegno ──
  const tela = creaTela(el.riquadro, {
    fondo: (c, info) => {
      const s = st.scena;
      if (!s) return;
      const { larghezza, altezza } = dimensioniMappa(s);
      c.save();
      c.translate(st.cam.ox, st.cam.oy);
      c.scale(st.cam.scala, st.cam.scala);
      if (st.immagine) {
        c.imageSmoothingEnabled = st.cam.scala < 2;
        c.drawImage(st.immagine, 0, 0, larghezza, altezza);
      } else {
        c.fillStyle = getComputedStyle(el.riquadro).getPropertyValue('--mappa-vuota').trim() || '#ddd';
        c.fillRect(0, 0, larghezza, altezza);
      }
      c.restore();
      // griglia in pixel dello schermo, linee nitide di 1 px
      const g = s.griglia;
      const linee = lineeVisibili(g, rettangoloVisibile(st.cam, info.larghezza, info.altezza), st.cam.scala, V);
      if (!linee) return;
      c.save();
      c.globalAlpha = g.opacita;
      c.strokeStyle = g.colore;
      c.lineWidth = 1;
      c.beginPath();
      const ya = schermoDaMappa(st.cam, 0, linee.y0).y, yb = schermoDaMappa(st.cam, 0, linee.y1).y;
      const xa = schermoDaMappa(st.cam, linee.x0, 0).x, xb = schermoDaMappa(st.cam, linee.x1, 0).x;
      for (const x of linee.xs) { const sx = Math.round(schermoDaMappa(st.cam, x, 0).x) + 0.5; c.moveTo(sx, ya); c.lineTo(sx, yb); }
      for (const y of linee.ys) { const sy = Math.round(schermoDaMappa(st.cam, 0, y).y) + 0.5; c.moveTo(xa, sy); c.lineTo(xb, sy); }
      c.stroke();
      c.restore();
    },
    // §5: per il master la nebbia è semitrasparente (i giocatori la vedono piena: ./giocatori.js)
    aree: (c, info) => {
      const s = st.scena;
      if (!s) return;
      const g = s.griglia;
      const colori = coloriAree(el.riquadro);
      // lotto 5: muri (retino) e terreno difficile (puntinato), solo per il master
      // ritocchi del 07/10: muri, porte e terreno si possono nascondere («Mostra / nascondi template»); valgono comunque
      const ostacoli = ostacoliVisibili(sovrapposizioni('master'));
      if (ostacoli) disegnaMuri(c, { scena: s, cam: st.cam, info, muri: daBase64(s.muri), terreno: daBase64(s.terreno), colori });
      // fase 2, lotto 2: le porte, ciascuna con il suo stato (le segrete con la «S»)
      if (ostacoli && s.porte?.length) disegnaPorte(c, { scena: s, cam: st.cam, info, porte: s.porte.map((p) => ({ ...p, orientamento: orientamentoPorta(s, p) })), colori: ctx.dati.mappa.porte.colori });
      // 07/10: anteprima della porta da mettere sotto il puntatore, con l'orientamento (← → per girarla)
      const ap = st.muri.strumento === 'porta' ? anteprimaPorta() : null;
      if (ap) { c.save(); c.globalAlpha = 0.6; disegnaPorte(c, { scena: s, cam: st.cam, info, porte: [ap], colori: ctx.dati.mappa.porte.colori }); c.restore(); }
      // fase 2, lotto 4: zone in Penombra, Luce scarsa e Buio, più scure (sotto i token)
      const lm = maschereLuce();
      if (lm) disegnaLuci(c, { scena: s, cam: st.cam, info, maschere: lm, opacita: ctx.dati.mappa.luci.oscurita });
      const r = rettangoloVisibile(st.cam, info.larghezza, info.altezza);
      const q = g.q_px;
      const tratti = trattiCoperti(daBase64(s.nebbia.coperti), g.colonne, g.righe,
        { x0: Math.floor((r.x0 - g.scosto_x) / q), x1: Math.ceil((r.x1 - g.scosto_x) / q), y0: Math.floor((r.y0 - g.scosto_y) / q), y1: Math.ceil((r.y1 - g.scosto_y) / q) });
      // area raggiungibile del token scelto, sopra la nebbia (il master la vede sempre)
      // con «Mostra area» spento non si disegna (il percorso sotto il puntatore resta, nel livello «sopra»)
      const disegnaAreaScelta = () => {
        disegnaTemplateScena(c, info);
        // prima le ZoC degli avversari del token scelto o trascinato (sotto l'area), poi l'area
        const id = st.trascina?.modo === 'token' ? st.trascina.token : st.selezionato;
        if (st.mostraZoc && id && !disegnoAttivo()) {
          // A.132: prima le ZoC inattive (Stordito, Svenuto), tratteggiate; poi quelle attive
          const inattivi = avversariZocInattivi(s, st.pezzi, id, ctx.dati);
          if (inattivi.length) disegnaZoc(c, { scena: s, cam: st.cam, info, celle: celleZoc(s, inattivi), stile: ctx.dati.mappa.zoc, inattiva: true });
          const avv = avversariZoc(s, st.pezzi, id, ctx.dati);
          if (avv.length) disegnaZoc(c, { scena: s, cam: st.cam, info, celle: celleZoc(s, avv), stile: ctx.dati.mappa.zoc });
        }
        const a = st.mostraArea && !liberoConMaiusc() ? areaScelta() : null;
        if (a?.celle) disegnaArea(c, { scena: s, cam: st.cam, info, celle: a.celle, colori, stile: V.area });
      };
      if (!tratti.length) { disegnaAreaScelta(); return; }
      c.save();
      c.globalAlpha = 0.5;
      c.fillStyle = getComputedStyle(el.riquadro).getPropertyValue('--mappa-nebbia').trim() || '#111';
      c.beginPath();
      for (const [y, xa, xb] of tratti) {
        const a = schermoDaMappa(st.cam, g.scosto_x + xa * q, g.scosto_y + y * q);
        const b = schermoDaMappa(st.cam, g.scosto_x + xb * q, g.scosto_y + (y + 1) * q);
        c.rect(Math.floor(a.x), Math.floor(a.y), Math.ceil(b.x - a.x) + 1, Math.ceil(b.y - a.y) + 1);
      }
      c.fill();
      c.restore();
      disegnaAreaScelta();
    },
    sopra: (c) => {
      if (st.scena) {
        const t = st.trascina?.modo === 'token' ? { id: st.trascina.token, q: st.trascina.q } : null;
        disegnaToken(c, { scena: st.scena, cam: st.cam, pezzi: st.mappaPezzi, colori: coloriMappa(el.riquadro), immagine, selezionato: st.selezionato, trascina: t, bordo: bordoDi, alone: ctx.dati.mappa.colori.alone_turno, ritrattoVerticale: ctx.dati.mappa.token.ritratto_verticale, pv: { stile: ctx.dati.mappa.pv_token, mostra: () => st.mostraPv }, zero: ctx.dati.mappa.pv_zero });
        disegnaSelezioneGruppo(c);
        // fase 2, lotto 5: i quadretti liberi accanto al veicolo per «Scendi»
        if (st.scendi) {
          const g = st.scena.griglia;
          c.save();
          c.fillStyle = 'rgba(43, 140, 255, 0.28)';
          c.strokeStyle = 'rgba(43, 140, 255, 0.9)';
          c.lineWidth = 2;
          for (const [x, y] of st.scendi.celle) {
            const a = schermoDaMappa(st.cam, g.scosto_x + x * g.q_px, g.scosto_y + y * g.q_px);
            const b = schermoDaMappa(st.cam, g.scosto_x + (x + 1) * g.q_px, g.scosto_y + (y + 1) * g.q_px);
            c.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
            c.strokeRect(a.x + 1, a.y + 1, b.x - a.x - 2, b.y - a.y - 2);
          }
          c.restore();
        }
      }
      // percorso del token scelto (o trascinato) verso il quadretto sotto il puntatore, con i Q che costa
      // fase 2, lotto 3: la linea di tiro del token scelto verso il mouse o il bersaglio
      disegnaLineaScelta(c);
      if (st.percorso && st.scena) disegnaPercorso(c, { scena: st.scena, cam: st.cam, percorso: st.percorso.punti, ingombro: st.percorso.ingombro, costo: st.percorso.costo, fascia: st.percorso.fascia, colori: coloriAree(el.riquadro), inZoc: zocDelPercorso(st.percorso), coloreZoc: ctx.dati.mappa.zoc.colore });
      // anteprima del rettangolo di nebbia o di muri
      const tn = st.trascina;
      if (tn?.modo === 'disegno' && tn.forma === 'rettangolo' && st.scena) {
        const g = st.scena.griglia;
        const a = schermoDaMappa(st.cam, g.scosto_x + Math.min(tn.da[0], tn.a[0]) * g.q_px, g.scosto_y + Math.min(tn.da[1], tn.a[1]) * g.q_px);
        const b = schermoDaMappa(st.cam, g.scosto_x + (Math.max(tn.da[0], tn.a[0]) + 1) * g.q_px, g.scosto_y + (Math.max(tn.da[1], tn.a[1]) + 1) * g.q_px);
        c.save();
        c.strokeStyle = getComputedStyle(el.riquadro).getPropertyValue('--mappa-traccia').trim() || '#d00';
        c.lineWidth = 2;
        c.setLineDash([6, 4]);
        c.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
        c.restore();
      }
      const k = st.calibrazione;
      if (!k?.b) return;
      const a = schermoDaMappa(st.cam, k.a.x, k.a.y), b = schermoDaMappa(st.cam, k.b.x, k.b.y);
      c.save();
      c.strokeStyle = getComputedStyle(el.riquadro).getPropertyValue('--mappa-traccia').trim() || '#d00';
      c.lineWidth = 2;
      c.setLineDash([6, 4]);
      c.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      c.restore();
    },
  }, {
    // la barra che si allarga tiene zoom e centro (lotto 6); la finestra che cambia misura riadatta lo zoom al riquadro
    // mantenendo il centro (difetto 3 del collaudo del lotto 7)
    ridimensionata: (prima, dopo) => {
      if (!st.scena) return;
      const finestra = Date.now() - finestraCambiata < 600;
      cambiaCamera(finestra ? riadattaCentro(st.cam, prima, dopo, V) : mantieniCentro(st.cam, prima, dopo));
    },
  });
  // difetto 5 del collaudo del lotto 7: «Inizia» ha ricollegato questa scena dalla bozza allo scontro nuovo; si prende
  // il collegamento e la revisione del server tenendo le modifiche in corso
  const suRicollegate = (e) => {
    const nuova = (e.detail ?? []).find((x) => x.id === ctx.id);
    if (!nuova || !st.scena) return;
    st.scena = { ...st.scena, collegamento: nuova.collegamento, revisione: nuova.revisione, aggiornato: nuova.aggiornato };
    st.fonti = null;
    disegnaPannelli();
    aggiornaFonti().then(() => { st.planciaBarra?.ridisegna?.(); disegnaIniziativa(); selezionaDiTurno(); });
  };
  window.addEventListener('mutant:scene-ricollegate', suRicollegate);
  let finestraCambiata = 0;
  const suFinestra = () => { finestraCambiata = Date.now(); };
  window.addEventListener('resize', suFinestra);

  const immagine = creaImmagini(() => ridisegna(['sopra']));
  // suoni della mappa (07/10): effetti degli eventi dello scontro, sul PC del master
  const audio = creaAudio(ctx.dati);
  // muto generale e volumi di Musica ed Effetti (0–100 %), ricordati su questo PC (src/mappa/audio.js → CHIAVE_AUDIO)
  const cursore = (canale, etichetta) => h('label', { class: 'cursore-audio', title: `${etichetta}: volume su questo PC` },
    h('span', { class: 'lungo' }, etichetta),
    h('input', { type: 'range', min: 0, max: 100, step: 5, value: Math.round(audio.impostazioni()[canale] * 100), 'aria-label': `Volume ${etichetta}`,
      oninput: (e) => { audio.imposta({ [canale]: Number(e.target.value) / 100 }); aggiornaControlliAudio(); } }));
  el.audioMuto = h('button', { type: 'button', class: 'btn btn-piccolo tondo', onclick: () => { audio.imposta({ muto: !audio.impostazioni().muto }); aggiornaControlliAudio(); } });
  el.audioMusica = h('span', { class: 'mappa-audio-musica' });
  el.audioCursori = [cursore('musica', 'Musica'), cursore('effetti', 'Effetti')];
  function aggiornaControlliAudio() {
    const i = audio.impostazioni();
    el.audioMuto.textContent = i.muto ? '🔇' : '🔊';
    el.audioMuto.title = i.muto ? 'Audio spento su questo PC: clic per riaccenderlo' : 'Spegne tutti i suoni su questo PC (musica ed effetti)';
    el.audioMuto.setAttribute('aria-pressed', String(i.muto));
    el.audioMuto.setAttribute('aria-label', i.muto ? 'Riaccendi l’audio' : 'Audio muto');
    for (const [k, l] of [['musica', el.audioCursori[0]], ['effetti', el.audioCursori[1]]]) {
      const inp = l.querySelector('input');
      if (document.activeElement !== inp) inp.value = String(Math.round(i[k] * 100));
      inp.title = `${Math.round(i[k] * 100)} %${i.muto ? ' (muto)' : ''}`;
      l.classList.toggle('spento', i.muto);
    }
  }

  const aggiornaBarra = () => {
    el.zoom.textContent = `${Math.round(st.cam.scala * 100)} %`;
    const g = st.scena?.griglia;
    el.scala.textContent = g ? `${testoScala(ctx.dati)} · ${numero(g.q_px)} px per Q · ${g.colonne} × ${g.righe} Q` : testoScala(ctx.dati);
    el.stato.textContent = st.salvataggio.testo;
  };
  const ridisegna = (livelli) => { tela.richiedi(livelli); aggiornaBarra(); programmaDiretta(); };
  // anche il livello della nebbia segue zoom e spostamenti (nel lotto 4 restava fermo); data-zoom e data-origine
  // dicono la vista attuale, per le prove (come data-disegno-ms di ./canvas.js e la vista giocatori)
  const cambiaCamera = (cam) => {
    st.cam = cam;
    el.riquadro.dataset.zoom = String(Math.round(cam.scala * 1000) / 10);
    el.riquadro.dataset.origine = `${Math.round(cam.ox)},${Math.round(cam.oy)}`;
    ridisegna(['fondo', 'aree', 'sopra']);
  };
  const zoomCentro = (f) => { const { larghezza, altezza } = tela.dimensioni(); cambiaCamera(zoomVerso(st.cam, larghezza / 2, altezza / 2, f, V)); };
  const adattaSchermo = () => {
    if (!st.scena) return;
    const { larghezza, altezza } = dimensioniMappa(st.scena);
    const d = tela.dimensioni();
    cambiaCamera(adatta(larghezza, altezza, d.larghezza, d.altezza, V));
  };

  // ── Salvataggio con revisione (lotto 1: PUT /api/scene/<id>, 409 se cambiata altrove) ──
  const testoStato = (t) => { st.salvataggio.testo = t; aggiornaBarra(); };
  const salvaPresto = () => {
    st.salvataggio.modificata = true;
    st.salvataggio.rifiutata = false;
    testoStato('Modifiche da salvare…');
    clearTimeout(st.salvataggio.timer);
    st.salvataggio.timer = setTimeout(salvaOra, ATTESA_SALVATAGGIO_MS);
  };
  const salvaOra = async ({ keepalive = false } = {}) => {
    const S = st.salvataggio;
    clearTimeout(S.timer);
    if (S.inCorso || !S.modificata || !st.scena) return;
    S.inCorso = true;
    S.modificata = false;
    const inviata = st.scena;
    testoStato('Salvataggio…');
    try {
      const esito = await salvaScena(inviata, { keepalive });
      if (esito.conflitto) {
        avvisoErrore('La scena è stata cambiata in un’altra finestra: ripresa quella salvata sul server. Rifai l’ultima modifica, se serve.', { durata: 9000 });
        S.modificata = false;
        await usaScena(esito.attuale);
        testoStato(`Ripresa dal server alle ${ora()}`);
      } else {
        // le modifiche fatte durante il salvataggio restano: si aggiorna solo la revisione
        // 08/10: se nel frattempo un tablet ha mosso un PG, il server ha fuso le scritture (esito.scena.fusi): qui si
        // riprendono quei movimenti, senza toccare il resto
        const fusi = esito.scena.fusi ?? [];
        st.scena = { ...(fusi.length ? fondiMovimentiTablet(st.scena, esito.scena, fusi, ctx.dati) : st.scena), revisione: esito.scena.revisione, aggiornato: esito.scena.aggiornato };
        if (fusi.length) {
          invalidaArea();
          disegnaPannelli();
          disegnaIniziativa();
          ridisegna(['aree', 'sopra']);
          aggiornaFonti().then(() => { for (const id of fusi) { const m = st.scena.movimenti.find((x) => x.id === id); if (m) avvisaMovimentoTablet(m); } });
        }
        testoStato(S.modificata ? 'Modifiche da salvare…' : `Salvata alle ${ora()}`);
      }
    } catch (e) {
      S.modificata = true;
      // rifiutata dal server (400): riprovare non serve, si riprova alla prossima modifica; un errore di rete o del
      // server si riprova da solo, con calma (primo test di Marcello: una pila di avvisi identici ogni 600 ms)
      S.rifiutata = e.stato === 400;
      testoStato(S.rifiutata ? 'Non salvata: rifiutata dal server' : 'Non salvata: riprovo…');
      avvisoErrore(`Scena non salvata: ${e.message}`);
    } finally {
      S.inCorso = false;
      // anche a pagina chiusa: l'ultima modifica non si perde
      if (S.modificata && !S.rifiutata) S.timer = setTimeout(salvaOra, S.testo.startsWith('Non salvata') ? ATTESA_RIPROVA_MS : ATTESA_SALVATAGGIO_MS);
    }
  };

  const cambiaGriglia = (cambi, opzioni) => {
    const esito = applicaGriglia(st.scena, cambi, ctx.dati, opzioni);
    if (esito.errore) { avvisoErrore(`Griglia: ${esito.errore}.`); aggiornaPannello(); return false; }
    st.scena = esito.scena;
    aggiornaPannello();
    // collaudo del lotto 7: le maschere cambiano misura con la griglia, anche i conteggi di nebbia e muri
    disegnaPannelloNebbia();
    disegnaPannelloMuri();
    disegnaPannelloLuci();
    ridisegna(['fondo', 'aree', 'sopra']);
    salvaPresto();
    return true;
  };

  // ── Immagine di fondo ──
  const caricaBitmap = async (file) => {
    if (!file) return null;
    const r = await fetch(`api/mappe/${encodeURIComponent(file)}`);
    if (!r.ok) throw new Error(`immagine ${file} non trovata (${r.status})`);
    return createImageBitmap(await r.blob());
  };
  const usaScena = async (s) => {
    st.scena = s;
    el.titolo.textContent = s.nome;
    document.title = `${s.nome} · Mappa · Mutant`;
    if (s.mappa?.file !== st.fileImmagine) {
      st.immagine?.close?.();
      st.immagine = null;
      st.fileImmagine = s.mappa?.file ?? null;
      try { st.immagine = await caricaBitmap(st.fileImmagine); } catch (e) { avvisoErrore(`Immagine di fondo: ${e.message}`); }
    }
    if (st.pGrigliaIniziale !== true) { el.pGriglia.open = !s.griglia.bloccata; st.pGrigliaIniziale = true; }
    if (st.selezionato && !s.token.some((t) => t.id === st.selezionato)) st.selezionato = null;
    aggiornaPannello();
    disegnaPannelli();
    st.tpl.firma = null;
    disegnaPannelloTemplate();
    if (el.btnSovr) aggiornaSovrapposizioni();
    aggiornaVociIniziale();
    invalidaArea();
    if (st.fonti !== null) { disegnaPannelloNebbia(); disegnaPannelloMuri(); disegnaPannelloLuci(); disegnaPannelloGiocatori(); }
    ridisegna();
  };

  async function caricaDaFile(file) {
    if (st.scena.griglia.bloccata) return avvisoErrore('La griglia è bloccata: sbloccala per cambiare l’immagine di fondo.');
    const controllo = await controllaFile(file, ctx.dati);
    if (controllo.errore) return avvisoErrore(controllo.errore, { durata: 12000 });
    el.btnCarica.disabled = true;
    testoStato(`Caricamento di ${file.name}…`);
    try {
      const ridotta = await preparaRidotta(file, ctx.dati);
      const orig = await caricaImmagine(file, st.scena.nome);
      const rid = ridotta ? await caricaImmagine(ridotta, st.scena.nome, { ridotta: true }) : null;
      const mappa = { file: orig.file, ridotta: rid?.file ?? null, larghezza: orig.larghezza, altezza: orig.altezza };
      const bitmap = await createImageBitmap(file);
      if (!cambiaGriglia({}, { mappa })) { bitmap.close?.(); testoStato(''); return; }
      st.immagine?.close?.();
      st.immagine = bitmap;
      st.fileImmagine = orig.file;
      adattaSchermo();
      avviso(`Immagine caricata: ${orig.larghezza} × ${orig.altezza} px${rid ? `, copia per i giocatori ${rid.larghezza} × ${rid.altezza}` : ''}. Ora calibra la griglia.`);
    } catch (e) {
      testoStato('');
      avvisoErrore(`Immagine non caricata: ${e.message}`, { durata: 12000 });
    } finally {
      el.btnCarica.disabled = false;
    }
  }

  // ── Pannello della griglia (§4) ──
  const campo = (etichetta, input, nota = null) => h('label', { class: 'mappa-campo' }, h('span', {}, etichetta), input, nota ? h('small', { class: 'nota' }, nota) : null);
  const G = ctx.dati.mappa.griglia;
  el.q = h('input', { type: 'number', min: G.q_px_min, max: G.q_px_max, step: '0.01', onchange: (e) => cambiaGriglia({ q_px: Number(e.target.value) }) });
  el.sx = h('input', { type: 'number', step: '0.5', onchange: (e) => cambiaGriglia({ scosto_x: Number(e.target.value) }) });
  el.sy = h('input', { type: 'number', step: '0.5', onchange: (e) => cambiaGriglia({ scosto_y: Number(e.target.value) }) });
  el.colonne = h('input', { type: 'number', min: 1, max: ctx.dati.mappa.scena.colonne_max, step: '1', onchange: (e) => cambiaGriglia({ colonne: Math.round(Number(e.target.value)) }) });
  el.righe = h('input', { type: 'number', min: 1, max: ctx.dati.mappa.scena.righe_max, step: '1', onchange: (e) => cambiaGriglia({ righe: Math.round(Number(e.target.value)) }) });
  el.dimVuota = h('div', { class: 'mappa-campi-riga' }, campo('Colonne', el.colonne), campo('Righe', el.righe));
  el.colore = h('input', { type: 'color', oninput: (e) => cambiaGriglia({ colore: e.target.value }) });
  el.opacita = h('input', { type: 'range', min: 0, max: 1, step: '0.05', oninput: (e) => cambiaGriglia({ opacita: Number(e.target.value) }) });
  el.quadretti = h('input', { type: 'number', min: 1, max: 50, step: '1', value: '1', onchange: (e) => { st.quadretti = Math.max(1, Math.round(Number(e.target.value) || 1)); e.target.value = st.quadretti; } });
  el.traccia = h('button', { type: 'button', class: 'btn', onclick: () => impostaStrumento(st.strumento === 'calibra' ? 'sposta' : 'calibra') }, 'Traccia un quadretto');
  el.blocca = h('button', { type: 'button', class: 'btn', onclick: () => bloccaGriglia() });
  el.info = h('p', { class: 'nota mappa-info' });
  el.notaBlocco = h('p', { class: 'riquadro attenzione mappa-nota-blocco', hidden: true }, 'Griglia bloccata: dimensione e scostamento non cambiano, così nebbia, muri e token restano allineati. Colore e opacità sì.');
  svuota(el.pannello, el.secScontro, el.pTemplate, el.pMuri, el.pNebbia, el.pLuci, el.pGiocatori, el.pGriglia);
  svuota(el.pGriglia,
    h('summary', {}, h('strong', {}, 'Griglia')),
    h('p', { class: 'nota' }, 'Calibra tracciando sull’immagine un quadretto (o un riquadro di più quadretti) oppure inserendo i valori. Poi blocca la griglia.'),
    h('div', { class: 'mappa-calibra' }, el.traccia,
      campo('Il riquadro copre', el.quadretti, 'quadretti per lato')),
    el.dimVuota,
    campo('Lato del quadretto (px dell’immagine)', el.q),
    h('div', { class: 'mappa-campi-riga' }, campo('Scostamento X', el.sx), campo('Scostamento Y', el.sy)),
    h('div', { class: 'mappa-campi-riga' }, campo('Colore', el.colore), campo('Opacità', el.opacita)),
    el.info, el.notaBlocco, el.blocca);

  function aggiornaPannello() {
    const g = st.scena?.griglia;
    if (!g) return;
    const fissa = g.bloccata;
    for (const [input, v] of [[el.q, g.q_px], [el.sx, g.scosto_x], [el.sy, g.scosto_y], [el.colonne, g.colonne], [el.righe, g.righe]]) {
      if (document.activeElement !== input) input.value = String(v);
      input.disabled = fissa;
    }
    el.colore.value = g.colore;
    el.opacita.value = String(g.opacita);
    el.dimVuota.hidden = !!st.scena.mappa; // con l'immagine righe e colonne si calcolano
    el.traccia.disabled = fissa || !st.scena.mappa;
    el.traccia.title = st.scena.mappa ? 'Trascina sull’immagine da un angolo all’angolo opposto di un quadretto disegnato (Esc annulla)' : 'Serve un’immagine di fondo';
    el.quadretti.disabled = fissa;
    el.notaBlocco.hidden = !fissa;
    el.blocca.textContent = fissa ? 'Sblocca griglia' : 'Blocca griglia';
    el.blocca.classList.toggle('primario', !fissa);
    const { larghezza, altezza } = dimensioniMappa(st.scena);
    el.info.textContent = `${g.colonne} × ${g.righe} Q (${numero(g.colonne * ctx.dati.mappa.q_metri, 1)} × ${numero(g.righe * ctx.dati.mappa.q_metri, 1)} m) · ${testoScala(ctx.dati)} · mappa di ${Math.round(larghezza)} × ${Math.round(altezza)} px`;
    if (fissa && st.strumento === 'calibra') impostaStrumento('sposta');
    aggiornaBarra();
  }

  async function bloccaGriglia() {
    const g = st.scena.griglia;
    if (g.bloccata && !(await chiedi({ titolo: 'Sbloccare la griglia?', testo: 'Cambiando dimensione o scostamento, nebbia, muri e token disegnati finora potrebbero non combaciare più con l’immagine.', si: 'Sblocca' }))) return;
    if (cambiaGriglia({ bloccata: !g.bloccata })) avviso(g.bloccata ? 'Griglia sbloccata.' : 'Griglia bloccata.');
  }

  function impostaStrumento(s) {
    st.strumento = s;
    st.calibrazione = null;
    el.traccia.classList.toggle('scelto', s === 'calibra');
    el.traccia.textContent = s === 'calibra' ? 'Annulla traccia (Esc)' : 'Traccia un quadretto';
    el.riquadro.classList.toggle('calibra', s === 'calibra');
    ridisegna(['sopra']);
  }

  function chiudiCalibrazione() {
    const k = st.calibrazione;
    impostaStrumento('sposta');
    if (!k?.b) return;
    const esito = calibraDaQuadretto(k.a, k.b, st.quadretti, ctx.dati);
    if (esito.errore) return avvisoErrore(`Calibrazione: ${esito.errore}.`, { durata: 9000 });
    if (cambiaGriglia({ q_px: esito.q_px, scosto_x: esito.scosto_x, scosto_y: esito.scosto_y })) {
      avviso(esito.scarto > SCARTO_AVVISO
        ? `Griglia calibrata, ma il riquadro tracciato non era quadrato (lati diversi del ${Math.round(esito.scarto * 100)} %): controlla e, se serve, ritraccia o correggi i valori.`
        : `Griglia calibrata: ${numero(esito.q_px)} px per Q. Controlla l’allineamento, poi «Blocca griglia».`, { durata: 8000 });
    }
  }

  // ── Token dello scontro (lotto 3) ──
  /** Rilegge scontro o bozza, schede e veicoli; toglie i token dei pezzi usciti (solo con una lettura completa). */
  let lettura = null;
  async function aggiornaFonti() {
    if (!st.scena || st.chiusa) return;
    if (lettura) return lettura;
    lettura = (async () => {
      const prima = st.mappaPezzi;
      const primaLettura = st.fonti === null;
      const esito = await leggiFonti(st.scena.collegamento);
      if (st.chiusa) return;
      // 07/10: al nuovo Round la campanella (data/mappa.json → audio.effetti), anche se l'«Avanti» viene da un'altra finestra
      for (const ev of eventiScontro(st.fonti?.scontro ?? null, esito.scontro ?? null)) audio.effetto(ev);
      // musica di fondo dello scontro aperto: parte quando c'è, si ferma alla chiusura (o se la si toglie)
      audio.musica(musicaDi(esito.scontro));
      st.fonti = esito;
      disegnaAudio();
      st.pezzi = pezziDellaScena(esito, ctx.dati);
      st.mappaPezzi = new Map(st.pezzi.map((p) => [p.chiave, p]));
      // §6 del lotto: chi esce dallo scontro perde il token, con un avviso; mai con una lettura incompleta
      if ((esito.scontro || esito.bozza) && !esito.errori.length) {
        const orfani = tokenOrfani(st.scena, st.pezzi);
        const cambio = st.collegamentoPrecedente;
        st.collegamentoPrecedente = null;
        if (orfani.length && cambio && !(await chiedi({ titolo: 'Cambiare collegamento?', testo: `Con il nuovo collegamento ${orfani.length} token non hanno più un partecipante e verranno tolti dalla mappa (${orfani.map((t) => prima.get(chiaveRif(t.rif))?.nome ?? t.id).join(', ')}).`, si: 'Procedi', no: 'Torna al collegamento di prima' }))) {
          // si torna indietro: collegamento di prima, token intatti, nuova lettura
          st.scena = { ...st.scena, collegamento: cambio };
          st.fonti = null;
          salvaPresto();
          setTimeout(() => aggiornaFonti(), 0);
          return;
        }
        if (orfani.length) {
          const nomi = orfani.map((t) => prima.get(chiaveRif(t.rif))?.nome ?? t.id);
          st.scena = { ...st.scena, token: st.scena.token.filter((t) => !orfani.includes(t)) };
          if (orfani.some((t) => t.id === st.selezionato)) st.selezionato = null;
          avviso(`${nomi.join(', ')}: non ${nomi.length > 1 ? 'sono' : 'è'} più nello scontro, token tolt${nomi.length > 1 ? 'i' : 'o'} dalla mappa.`, { durata: 8000 });
          salvaPresto();
        }
        const nuovi = primaLettura ? [] : pezziSenzaToken(st.scena, st.pezzi).filter((p) => !prima.has(p.chiave));
        if (nuovi.length) avviso(`Nello scontro: ${nuovi.map((p) => p.nome).join(', ')}. Fra i «senza token», da mettere in mappa.`, { durata: 8000 });
      }
      if (coloraNuovi()) salvaPresto();
      scadiTemplate();
      disegnaPannelloTemplate();
      invalidaArea();
      disegnaPannelli();
      disegnaIniziativa();
      seguiTurno();
      ridisegna(['aree', 'sopra']);
    })().finally(() => { lettura = null; });
    return lettura;
  }

  function disegnaPannelli() {
    if (!st.scena) return;
    const f = st.fonti ?? { candidati: { aperti: [], bozze: [] }, errori: [], mancante: null, scontro: null, bozza: null };
    const senza = pezziSenzaToken(st.scena, st.pezzi);
    const scelto = st.scena.token.find((t) => t.id === st.selezionato) ?? null;
    const pz = scelto ? pezzoDi(scelto) : null;
    // si ridisegna solo se cambia qualcosa: un menu aperto non si chiude da solo ogni tre secondi
    const firma = JSON.stringify([st.scena.collegamento, f.candidati.aperti.map((x) => [x.id, x.nome, x.round]), f.candidati.bozze.map((x) => [x.id, x.nome]),
      f.mancante, f.errori, !!f.scontro, !!f.bozza, f.scontro?.round, senza.map((p) => [p.chiave, p.nome, p.lato, p.ingombro]), st.daPiazzare, scelto, pz,
      scelto ? movimentoPannello(scelto) : null]);
    if (firma === st.firmaPannello) return;
    st.firmaPannello = firma;
    svuota(el.secScontro, sezioneScontro({ ...f, collegamento: st.scena.collegamento, senzaToken: senza, daPiazzare: st.daPiazzare }, {
      collega: (v) => collega(v ? { scontro: v.startsWith('s:') ? v.slice(2) : null, bozza: v.startsWith('b:') ? v.slice(2) : null } : { scontro: null, bozza: null }),
      collegaAperto: (id) => collega({ scontro: id, bozza: null }),
      metti: (chiave) => { st.daPiazzare = st.daPiazzare === chiave ? null : chiave; el.riquadro.classList.toggle('piazza', !!st.daPiazzare); disegnaPannelli(); },
      mettiTutti,
    }));
    svuota(el.secToken, sezioneToken(scelto, pz, ctx.dati, {
      mov: scelto ? movimentoPannello(scelto) : null,
      fascia: (n) => cambiaFascia(n),
      lineaTiro: () => iniziaLinea(scelto.id),
      // fase 2, lotto 2 (A.125): la porta adiacente, 1 AzP
      porta: (id) => { const p = st.scena.porte?.find((x) => x.id === id); if (p) portaToken(scelto, p, p.stato === 'aperta' ? 'chiudi' : 'apri'); },
      annullaMovimento: () => annullaMovimentoUi(scelto.id),
      nuovoTurno: () => nuovoTurnoUi(scelto.id),
      mostraArea: () => cambiaMostraArea(),
      mostraZoc: () => cambiaMostraZoc(),
      nuovoTurnoTutti: () => nuovoTurnoUi(null),
      nascondi: () => cambiaToken(scelto.id, (x) => ({ ...x, nascosto: !x.nascosto })),
      ingombro: (n) => cambiaToken(scelto.id, (x) => ({ ...x, ingombro: n, q: agganciaQ(st.scena.griglia, centroToken(st.scena.griglia, x).x, centroToken(st.scena.griglia, x).y, n) }), { controllaSovrapposti: true }),
      togli: () => togliToken(scelto.id),
      // fase 2, lotto 5: veicolo
      rigaAndature: () => (recordVeicolo(scelto) ? rigaAndature(ctx.dati, recordVeicolo(scelto).mezzo, (id) => andaturaUi(scelto, id), { classe: 'mappa-andature' }) : null),
      ruota: (verso) => ruotaVeicoloUi(scelto.id, verso),
      aBordo: aBordo(scelto).map((x) => ({ id: x.id, nome: nomeTok(x), ruolo: x.ruolo })),
      scendi: (id) => iniziaScendi(scelto.id, id),
      lineaPasseggero: (id) => lineaPasseggero(scelto.id, id),
      colore: () => coloreBordo(scelto.id),
      carta: () => apriNellaPlancia(pz?.chiave),
      immagine: async () => { const img = await scegliImmagineNemico(ctx.dati, pz?.nome); if (img) await immagineNemico(pz, img); },
      togliImmagine: () => immagineNemico(pz, null),
    }));
  }

  /** A.131: immagine (o iniziali, con null) del tipo di nemico, nello scontro o nella bozza collegati e nel bestiario. */
  async function immagineNemico(pz, immagine) {
    if (!pz?.nemico) return;
    try {
      await impostaImmagineNemico({ tipo: pz.nemico, immagine, scontro: st.fonti?.scontro?.id ?? null, bozza: st.fonti?.bozza?.id ?? null, nome: pz.nome.replace(/\s+\d+$/, '') });
      await aggiornaFonti();
    } catch (e) { avvisoErrore(`Immagine non salvata: ${e.message}`); }
  }

  function collega(collegamento) {
    // se il nuovo collegamento toglierebbe dei token, la prossima lettura chiede conferma (aggiornaFonti)
    st.collegamentoPrecedente = st.scena.collegamento;
    st.scena = { ...st.scena, collegamento: { ...st.scena.collegamento, ...collegamento } };
    st.fonti = null; // nessun avviso di «nuovi» per il cambio di collegamento
    salvaPresto();
    disegnaPannelli();
    aggiornaFonti().then(() => st.planciaBarra?.ridisegna?.());
  }

  /** Bordo di un pezzo con i colori della scena (src/mappa/colori.js). */
  function bordoDi(p) { return bordoToken(p, st.scena?.colori, ctx.dati); }
  /** Primo ingresso in mappa: un colore ai PG e ai tipi di nemico che non ne hanno; true se la scena è cambiata. */
  function coloraNuovi() {
    if (!st.scena) return false;
    const n = assegnaColori(st.scena, st.pezzi, ctx.dati);
    if (n === st.scena) return false;
    st.scena = n;
    return true;
  }
  function dopoCambioToken() {
    coloraNuovi();
    invalidaArea();
    salvaPresto();
    disegnaPannelli();
    disegnaPannelloTemplate(); // chi è dentro i template cambia con i token
    if (st.scena?.token.some((t) => t.luce) || el.pLuci?.querySelector('.elenco-luci')) disegnaPannelloLuci(); // le luci portate seguono i token
    aggiornaVisuale();
    disegnaIniziativa(); // token messi, tolti, nascosti: anche la barra dell'Iniziativa
    ridisegna(['aree', 'sopra']); // l'area raggiungibile sta nel livello «aree»
  }

  function cambiaToken(id, fn, { controllaSovrapposti = false } = {}) {
    const prima = st.scena.token.find((t) => t.id === id);
    if (!prima) return;
    st.scena = cambiaTokenAnnullabile(st.scena, prima, fn(prima), ctx.dati);
    if (controllaSovrapposti) avvisaSovrapposti([id]);
    dopoCambioToken();
  }

  /** Due token sullo stesso Q non sono un errore (A.127): si avvisa soltanto. */
  function avvisaSovrapposti(ids) {
    const nomeDi = (id) => { const t = st.scena.token.find((x) => x.id === id); return (t && pezzoDi(t)?.nome) ?? t?.nome ?? id; };
    const coppie = sovrapposti(st.scena.token).filter(([a, b]) => ids.includes(a) || ids.includes(b));
    if (coppie.length) avviso(`Sovrapposti: ${coppie.map(([a, b]) => `${nomeDi(a)} e ${nomeDi(b)}`).join('; ')}.`, { durata: 5000 });
  }

  /** «Togli dalla mappa»: il pezzo torna fra quelli senza token (Ctrl+Z lo rimette). */
  /** Il record della cartella del PG del pezzo (per la scheda completa), se le fonti lo hanno letto. */
  const recordPg = (pz) => (pz?.tipo === 'pg' ? st.fonti?.record?.get(pz.pg) ?? null : null);
  /** «Apri scheda completa» (clic destro, Ctrl+clic): la scheda del PG con «Torna alla mappa»; per gli altri la mini-scheda. */
  function apriSchedaToken(t) {
    const pz = pezzoDi(t);
    const r = recordPg(pz);
    if (r) apriSchedaCompleta(r);
    else apriCarta(t);
  }
  /** Una voce del menu «Strumenti»: chiude il menu e fa l'azione. */
  /** Porta alla sezione dello strumento nel gruppo «Mappa» della barra e la apre. */
  function apriStrumento(sezione) {
    if (!sezione) return;
    if (st.disp.disposizione === 'mappa') scegliDisposizione('equilibrata');
    if (sezione.tagName === 'DETAILS' && !sezione.open) { sezione.open = true; sezione.dispatchEvent(new Event('toggle')); }
    // difetto del 07/10: la sezione va in cima alla barra, sotto i segnalibri fissi (scrollIntoView la lasciava sotto di
    // loro); il segnalibro è quello del gruppo che la contiene; la sezione si evidenzia per un momento
    const barra = el.piena;
    if (barra?.contains(sezione)) {
      const testa = barra.querySelector('.laterale-segnalibri')?.offsetHeight ?? 0;
      barra.scrollTop += sezione.getBoundingClientRect().top - barra.getBoundingClientRect().top - testa - 6;
    } else sezione.scrollIntoView({ block: 'start' });
    const gruppo = Object.entries(el.gruppi ?? {}).find(([, g]) => g.contains(sezione))?.[0] ?? 'mappa';
    segnaGruppo(gruppo);
    sezione.classList.remove('mappa-evidenzia');
    void sezione.offsetWidth;
    sezione.classList.add('mappa-evidenzia');
    setTimeout(() => sezione.classList.remove('mappa-evidenzia'), 1600);
  }
  /** Blocco dei movimenti dei giocatori: si salva nella scena; il server lo controlla a ogni movimento dai tablet. */
  function cambiaBloccoGiocatori() {
    if (!st.scena) return;
    const v = !st.scena.bloccaGiocatori;
    st.scena = { ...st.scena, bloccaGiocatori: v };
    salvaPresto();
    aggiornaBlocco();
    disegnaPannelloGiocatori();
    avviso(v ? 'Movimenti dei giocatori bloccati: i tablet vedono la mappa ma non muovono.' : 'Movimenti dei giocatori sbloccati: i tablet muovono il proprio PG.');
  }
  /** Tablet dei giocatori (fase 2, lotto 7): movimento solo al proprio turno o sempre; avviso «Tocca a te». */
  function cambiaTablet(campo) {
    if (!st.scena) return;
    const imp = impostazioniTablet(st.scena, ctx.dati);
    const tablet = { movimento: imp.movimento, avvisoTurno: imp.avvisoTurno };
    if (campo === 'movimento') tablet.movimento = imp.movimento === 'sempre' ? 'turno' : 'sempre';
    else tablet.avvisoTurno = !imp.avvisoTurno;
    st.scena = { ...st.scena, tablet };
    salvaPresto();
    aggiornaBlocco();
    disegnaPannelloGiocatori();
    avviso(campo === 'movimento'
      ? (tablet.movimento === 'sempre' ? 'Movimento dai tablet: sempre, anche fuori turno.' : 'Movimento dai tablet: solo al proprio turno dello scontro.')
      : (tablet.avvisoTurno ? 'Avviso «Tocca a te»: il tablet del PG di turno lo mostra, con suono e vibrazione (la pagina deve essere aperta).' : 'Avviso «Tocca a te» spento.'), { chiave: 'tablet', tipo: 'info' });
  }
  /**
   * Movimenti dai tablet (fase 2, lotto 7): il server scrive la scena (revisione +1). Ogni secondo la mappa guarda se la
   * revisione è cambiata e, se non ha modifiche sue in corso, riprende la scena del server: il master vede il movimento
   * in diretta e lo annulla con Ctrl+Z (la voce è nella pila della scena). Con modifiche in corso aspetta il salvataggio.
   */
  let controlloRevisione = null;
  async function controllaRevisione() {
    const S = st.salvataggio;
    if (!st.scena || st.chiusa || controlloRevisione || S.modificata || S.inCorso || st.trascina) return;
    controlloRevisione = (async () => {
      try {
        const r = await fetch(`api/scene/${encodeURIComponent(ctx.id)}?revisione=${st.scena.revisione}`, { cache: 'no-store' });
        if (!r.ok) return;
        const nuova = await r.json();
        if (nuova.invariata || st.chiusa || S.modificata || S.inCorso || st.trascina || !(nuova.revisione > st.scena.revisione)) return;
        const prima = new Set(st.scena.movimenti.map((m) => m.id));
        const daTablet = nuova.movimenti.filter((m) => m.tablet && !prima.has(m.id));
        await usaScena(nuova);
        testoStato(`Aggiornata alle ${ora()}`);
        if (daTablet.length) {
          dopoCambioToken();
          // la scena è già quella del server: niente da salvare
          clearTimeout(S.timer); S.modificata = false; testoStato(`Aggiornata alle ${ora()}`);
          await aggiornaFonti();
          for (const m of daTablet) avvisaMovimentoTablet(m);
        }
      } catch { /* senza rete: si riprova al prossimo giro */ } finally { controlloRevisione = null; }
    })();
  }
  /** Un movimento arrivato da un tablet: l'avviso con Ctrl+Z e gli Attacchi di Opportunità scritti dal server. */
  function avvisaMovimentoTablet(m) {
    const t = st.scena.token.find((x) => x.id === m.token);
    const nome = (t && pezzoDi(t)?.nome) ?? m.tablet;
    avviso(`📱 ${nome} si è mosso dal tablet: ${numero(m.costo ?? 0, 1)} Q (${NOMI_FASCE[m.fascia] ?? 'movimento'}). Ctrl+Z per annullarlo.`, { tipo: 'info', chiave: `tablet-${m.id}`, durata: 8000,
      azioni: [{ testo: 'Annulla', fai: () => { if (st.scena.annulla.at(-1)?.movimento === m.id) annullaUi(); else annullaMovimentoUi(m.token); } }] });
    for (const r of (st.fonti?.scontro?.registro ?? []).filter((x) => x.opportunita?.movimento === m.id)) {
      const idDa = r.opportunita.da;
      const da = st.pezzi.find((p) => p.rif?.id === idDa);
      const puo = st.planciaBarra?.puoAttaccare?.(idDa);
      avviso([testoOpportunita(nome, da?.nome ?? idDa), 'Nessun tiro automatico.'], { tipo: 'info', durata: 15000,
        azioni: puo ? [{ testo: `Attacca! (${da?.nome ?? idDa} → ${nome})`, fai: () => st.planciaBarra.attaccaContro(idDa, r.opportunita.contro) }] : [] });
    }
  }
  /** «Adatta lo schermo dei giocatori»: l'evento arriva alle viste giocatori aperte (canale della diretta). */
  async function adattaGiocatori() {
    try {
      const r = await fetch('api/vista-giocatori/adatta', { method: 'POST' });
      const c = await r.json();
      avviso(c.giocatori ? `Schermo dei giocatori adattato (${c.giocatori} ${c.giocatori === 1 ? 'vista aperta' : 'viste aperte'}).` : 'Nessuna vista giocatori aperta.', { chiave: 'adatta' });
    } catch (e) { avvisoErrore(`Non adattato: ${e.message}`); }
  }
  // ── Posizione iniziale della scena (07/10; src/mappa/iniziale.js) ──
  const quandoIniziale = () => { const q = st.scena?.iniziale?.quando; if (!q) return null; const d = new Date(q); return `${d.toLocaleDateString('it-IT')} alle ${ora(d)}`; };
  function aggiornaVociIniziale() {
    if (el.strumenti?.open) disegnaMenuStrumenti();
  }
  async function salvaInizialeUi() {
    if (!st.scena) return;
    const q = quandoIniziale();
    if (q && !(await chiedi({ titolo: 'Sovrascrivere la posizione iniziale?', testo: `C'è già una posizione iniziale, salvata il ${q}: sarà sostituita da quella di adesso.`, si: 'Sovrascrivi' }))) return;
    st.scena = salvaIniziale(st.scena);
    salvaPresto();
    aggiornaVociIniziale();
    avviso(`Posizione iniziale salvata (${quandoIniziale()}): ${st.scena.token.length} token, ${st.scena.porte?.length ?? 0} porte, ${st.scena.template.length} template e la nebbia.`, { chiave: 'iniziale' });
  }
  async function ripristinaInizialeUi({ chiedendo = true } = {}) {
    if (!st.scena?.iniziale) { avviso('Questa scena non ha una posizione iniziale: «Salva posizione iniziale» nel menu Strumenti.', { chiave: 'iniziale' }); return; }
    if (chiedendo && !(await chiedi({ titolo: 'Ripristinare la posizione iniziale?', testo: `Token, porte, template e nebbia tornano come il ${quandoIniziale()}. PV, Stati e registro dello scontro non cambiano; i Q usati nel Round ripartono da 0. Ctrl+Z lo annulla.`, si: 'Ripristina' }))) return;
    const completa = (st.fonti?.scontro || st.fonti?.bozza) && !st.fonti.errori.length;
    const sc = st.fonti?.scontro ?? null;
    const r = ripristinaIniziale(st.scena, { chiaviPresenti: completa ? new Set(st.pezzi.map((p) => p.chiave)) : null, scontro: sc?.id ?? null, round: sc?.round ?? null, annullaMax: ctx.dati.mappa.scena.annulla_max });
    if (!r) return;
    st.scena = r.scena;
    if (st.selezionato && !st.scena.token.some((t) => t.id === st.selezionato)) st.selezionato = null;
    st.tpl.firma = null;
    st.luceCache = null;
    disegnaPannelloNebbia();
    disegnaPannelloLuci();
    disegnaPannelloTemplate();
    dopoCambioToken();
    avviso([`Posizione iniziale ripristinata (${quandoIniziale()}). Ctrl+Z per tornare indietro.`,
      r.ignorati.length ? `Non più nello scontro, ignorati: ${r.ignorati.map((t) => t.nome ?? t.rif?.id ?? t.id).join(', ')}.` : null,
      r.nuovi.length ? `Nuovi, restano dove sono: ${r.nuovi.map((t) => pezzoDi(t)?.nome ?? t.nome ?? t.id).join(', ')}.` : null], { chiave: 'iniziale', durata: 10000 });
  }
  // ── «Mostra / nascondi template» (ritocchi del 07/10): scelte memorizzate nella scena, del master e dei giocatori ──
  const sovrapposizioni = (chi) => ({ nascoste: false, ancheDurata: false, ...(st.scena?.sovrapposizioni?.[chi] ?? {}) });
  function cambiaSovrapposizioni(chi, campo) {
    if (!st.scena) return;
    const v = sovrapposizioni(chi);
    v[campo] = !v[campo];
    st.scena = { ...st.scena, sovrapposizioni: { ...(st.scena.sovrapposizioni ?? {}), [chi]: v } };
    salvaPresto();
    aggiornaSovrapposizioni();
    disegnaPannelloGiocatori();
    if (chi === 'master') {
      if (campo === 'nascoste') avviso(v.nascoste ? `Nascosti: template senza durata${v.ancheDurata ? ' e a durata' : ''}, muri, porte e terreno (valgono comunque). Maiusc+T per mostrarli.` : 'Template, muri, porte e terreno mostrati.', { chiave: 'sovrapposizioni' });
      ridisegna(['aree']);
    } else avviso(v.nascoste ? 'Ai giocatori: template e muri nascosti.' : 'Ai giocatori: template e muri mostrati.', { chiave: 'sovrapposizioni' });
  }
  function aggiornaSovrapposizioni() {
    const v = sovrapposizioni('master');
    el.btnSovr.setAttribute('aria-pressed', String(!v.nascoste));
    el.btnSovr.classList.toggle('spento', v.nascoste);
    el.btnSovr.title = `${v.nascoste ? 'Nascosti' : 'Mostrati'}: template senza durata${v.ancheDurata ? ' e a durata' : ''}, muri, porte e terreno difficile (Maiusc+T). Per il movimento valgono sempre.`;
    el.btnSovr.querySelector('.lungo').textContent = ` Template: ${v.nascoste ? 'no' : 'sì'}`;
    el.ancheDurata.querySelector('input').checked = v.ancheDurata;
  }
  function aggiornaBlocco() {
    if (el.strumenti?.open) disegnaMenuStrumenti();
  }
  /**
   * Menu «Strumenti» (ritocchi del 08/10): gruppi e voci da data/mappa.json → strumenti, con l'icona del gruppo, la
   * scorciatoia a destra, lo stato (sì/no) nelle voci a interruttore e le voci non usabili spente con il motivo.
   */
  function disegnaMenuStrumenti() {
    const sc = st.scena;
    const f = st.fonti;
    const sn = (v) => (v ? 'sì' : 'no');
    const q = quandoIniziale();
    const g = sc?.sovrapposizioni?.giocatori ?? {};
    const VOCI = {
      immagine: { testo: 'Immagine di fondo…', titolo: 'JPG, PNG o WEBP', azione: () => el.scegliFile.click() },
      griglia: { testo: 'Griglia', titolo: 'Calibra, colore, opacità, blocco', azione: () => apriStrumento(el.pGriglia) },
      muri: { testo: 'Muri e terreno', titolo: 'Muro, terreno difficile, gomma', azione: () => apriStrumento(el.pMuri) },
      porte: { testo: 'Porte', titolo: 'Clic su un Q di muro: mette una porta; clic su una porta: la toglie', azione: () => { apriStrumento(el.pMuri); if (st.muri.strumento !== 'porta') strumentoMuri('porta'); } },
      luci: { testo: 'Luci', titolo: 'Luce della scena e zone a pennello', azione: () => apriStrumento(el.pLuci) },
      nebbia: { testo: 'Nebbia', titolo: 'Pennello e rettangolo, Rivela / Copri, tutto', azione: () => apriStrumento(el.pNebbia) },
      nebbia_automatica: { testo: `Nebbia automatica: ${sn(sc?.visuale?.automatica)}`, titolo: 'La nebbia si apre da sola dove i PG vedono', azione: () => cambiaVisualeAutomatica() },
      scene: { testo: 'Scene…', titolo: 'Nuova, apri, rinomina, duplica, archivia', azione: () => apriStrumento(document.getElementById('plancia-scene-mappa')) },
      collegamento: { testo: 'Collegamento e token', titolo: 'Scontro o bozza collegati, pezzi da mettere in mappa', azione: () => apriStrumento(el.secScontro) },
      salva_iniziale: { testo: q ? 'Salva posizione iniziale (sovrascrive)' : 'Salva posizione iniziale', titolo: 'Token, porte, template e nebbia come sono adesso', azione: () => salvaInizialeUi() },
      ripristina_iniziale: { testo: q ? `Ripristina posizione iniziale (${q})` : 'Ripristina posizione iniziale', titolo: 'Rimette token, porte, template e nebbia; Ctrl+Z annulla', azione: () => ripristinaInizialeUi(), spenta: q ? null : 'Nessuna posizione iniziale salvata in questa scena' },
      linea: { testo: 'Linea di tiro', tasto: 'L', titolo: 'Dal token scelto verso un token o un quadretto', azione: () => iniziaLinea(st.selezionato), spenta: st.selezionato ? null : 'Scegli prima il token che tira' },
      dettaglio_linea: { testo: testoDettaglioLinea(), tasto: 'Maiusc+L', titolo: 'Le cinque linee di controllo della linea di tiro (solo qui)', azione: () => cambiaDettaglioLinea() },
      template: { testo: 'Template ad area…', tasto: 'T', titolo: 'Raggio, cono, linea, quadrato, rettangolo', azione: () => nuovoTemplateUi() },
      mostra_area: { testo: `Mostra area: ${sn(st.mostraArea)}`, tasto: 'M', titolo: 'L’area di movimento del token scelto', azione: () => cambiaMostraArea() },
      mostra_zoc: { testo: `Mostra ZoC: ${sn(st.mostraZoc)}`, tasto: 'Z', titolo: 'Le zone di controllo degli avversari', azione: () => cambiaMostraZoc() },
      seleziona_pg: { testo: 'Seleziona tutti i PG', titolo: 'Per spostarli insieme: trascinane uno, o le frecce', azione: () => selezionaTipo('pg') },
      seleziona_nemici: { testo: 'Seleziona tutti i nemici', titolo: 'Gli avversari in mappa', azione: () => selezionaTipo('nemici') },
      seleziona_tutti: { testo: 'Seleziona tutti', titolo: 'Tutti i token in mappa', azione: () => selezionaTipo('tutti') },
      mostra_giocatori: { testo: st.inGioco === ctx.id ? 'Mostrata ai giocatori ✓' : 'Mostra questa ai giocatori', titolo: 'Segna questa scena per lo schermo dei giocatori e i tablet (con uno scontro aperto vedono comunque la sua scena)', azione: () => scegliPerGiocatori(ctx.id) },
      vista_giocatori: { testo: 'Vista giocatori: scena, QR, apri…', titolo: 'Quale scena vedono, il QR, «Apri vista giocatori»', azione: () => apriStrumento(el.pGiocatori) },
      adatta_giocatori: { testo: 'Adatta lo schermo dei giocatori', titolo: 'Lo schermo dei giocatori inquadra tutta la parte scoperta', azione: () => adattaGiocatori() },
      pv_nemici: { testo: `PV dei nemici ai giocatori: ${sn(sc?.pvNemiciGiocatori)}`, titolo: 'La barretta dei PV dei nemici nella vista giocatori (quella dei PG si vede sempre)', azione: () => cambiaPvNemiciGiocatori() },
      sovrapposizioni_giocatori: { testo: `Template e muri ai giocatori: ${sn(!g.nascoste)}`, titolo: 'Template senza durata, muri, porte e terreno sullo schermo dei giocatori', azione: () => cambiaSovrapposizioni('giocatori', 'nascoste') },
      suoni_giocatori: { testo: `Suoni anche ai giocatori: ${sn(sc?.audio?.giocatori)}`, titolo: 'Campanella e musica anche sullo schermo dei giocatori (televisore con le casse)', azione: () => cambiaAudioGiocatori() },
      blocco_giocatori: { testo: `Blocca movimenti dei giocatori: ${sn(sc?.bloccaGiocatori)}`, titolo: 'I tablet dei giocatori vedono la mappa ma non muovono (lo dice anche il tablet)', azione: () => cambiaBloccoGiocatori() },
      // fase 2, lotto 7: tablet dei giocatori (src/mappa/tablet.js)
      movimento_tablet: { testo: `Movimento dai tablet: ${impostazioniTablet(sc, ctx.dati).movimento === 'sempre' ? 'sempre' : 'solo al proprio turno'}`, titolo: 'Solo al proprio turno dello scontro aperto, oppure sempre (anche fuori turno e senza scontro)', azione: () => cambiaTablet('movimento') },
      avviso_turno_tablet: { testo: `Avviso «Tocca a te» ai tablet: ${sn(impostazioniTablet(sc, ctx.dati).avvisoTurno)}`, titolo: 'Quando arriva il turno di un PG, il suo tablet mostra l’avviso grande con suono e vibrazione', azione: () => cambiaTablet('avvisoTurno') },
      collega_tablet: { testo: 'Collega i tablet: QR e indirizzo…', titolo: 'L’indirizzo da aprire sui tablet (stessa rete Wi-Fi), poi «Sono…»', azione: () => apriStrumento(el.pGiocatori) },
      musica: { testo: 'Musica di fondo…', titolo: 'Un file della cartella musica/ del server', azione: () => scegliMusicaUi(), spenta: f?.scontro || f?.bozza ? null : 'Collega la scena a uno scontro o a una bozza' },
      muto: { testo: `Audio su questo PC: ${audio.impostazioni().muto ? 'muto' : 'attivo'}`, titolo: 'Spegne o riaccende musica ed effetti su questo PC', azione: () => { audio.imposta({ muto: !audio.impostazioni().muto }); aggiornaControlliAudio(); } },
      cancella_temporanei: { testo: 'Cancella template temporanei', titolo: 'Toglie i template a durata in Round; Ctrl+Z li rimette', azione: () => cancellaTemplate({ tutti: false }), spenta: (sc?.template ?? []).some((t) => Number.isInteger(t.durata)) ? null : 'Nessun template a durata in mappa' },
      cancella_tutti: { testo: 'Cancella tutti i template…', titolo: 'Anche quelli senza durata, con conferma; Ctrl+Z li rimette', azione: () => cancellaTemplate({ tutti: true }), spenta: sc?.template?.length ? null : 'Nessun template in mappa' },
    };
    svuota(el.vociStrumenti, ctx.dati.mappa.strumenti.gruppi.map((gr) => h('div', { class: 'gruppo-strumenti-menu', role: 'group', 'aria-label': gr.titolo },
      h('p', { class: 'voce-strumenti-titolo' }, h('span', { class: 'icona', 'aria-hidden': 'true' }, gr.icona), ` ${gr.titolo}`),
      gr.voci.map((id) => {
        const v = VOCI[id];
        if (!v) return null;
        return h('button', {
          type: 'button', role: 'menuitem', class: 'voce-strumenti', disabled: !sc || !!v.spenta, title: !sc ? 'Nessuna scena aperta' : v.spenta ?? v.titolo,
          onclick: () => { el.strumenti.open = false; v.azione(); },
        }, h('span', { class: 'voce-testo' }, v.testo), v.tasto ? h('kbd', { class: 'voce-tasto' }, v.tasto) : null);
      }))));
  }
  /** Pannello «?»: scorciatoie e comandi della mappa (§12). */
  function apriAiuto() {
    const righe = [
      ['Rotella, + e −', 'zoom (verso il puntatore con la rotella)'],
      ['Barra spaziatrice + mouse, o trascinare un punto vuoto', 'sposta la mappa'],
      ['A, o doppio clic su un punto vuoto', 'adatta allo schermo (anche nella vista giocatori: la parte scoperta)'],
      ['Clic su un token', 'lo sceglie: area di movimento e mini-scheda'],
      ['Clic sul token scelto, Esc, o clic fuori dall’area', 'lo lascia: area e percorso spariscono, i Q usati restano'],
      ['Clic su un quadretto dell’area, o trascinare il token', 'movimento nel Round: il Passo si divide in più clic; Corsa e Scatto sono un blocco unico (una mossa, i Q non usati si perdono) e solo da fermi (A.129)'],
      ['Maiusc (tenuto premuto, con un token scelto)', 'movimento libero: l’area sparisce, il clic o il trascinamento vanno dove vuoi, senza conteggio; rilasciato, si torna alla modalità di prima'],
      ['Maiusc + trascina su un punto vuoto', 'rettangolo di selezione: tutti i token dentro'],
      ['Maiusc + clic su un token', 'lo aggiunge o lo toglie dalla selezione'],
      ['Strumenti → «Seleziona tutti i PG / i nemici / tutti»', 'anche dal clic destro su un punto vuoto'],
      ['Trascina uno dei token selezionati (o frecce)', 'si spostano tutti insieme, in formazione, liberi (niente Q, ZoC né Attacchi di Opportunità); chi trova il posto occupato va al più vicino libero; un solo Ctrl+Z; Esc o clic su un punto vuoto annulla la selezione'],
      ['Ctrl + clic su un token', 'scheda completa (PG) o mini-scheda (nemico)'],
      ['Clic destro su un token (o pressione lunga sul tablet)', 'in cima Passo · Corsa · Scatto · Libero; poi Movimento, Azioni (Attacca!, porte vicine), Strumenti (linea, area, ZoC, template), Scheda; «Opzioni ▸»: Nascondi, Colore del bordo, Togli dalla mappa. Solo le voci utilizzabili, la scorciatoia a destra'],
      ['T (o Strumenti → «Template ad area», o clic destro su un punto vuoto)', 'nuovo template: forma, misura in Q, colore, durata in Round, nome'],
      ['Mentre piazzi un template', 'segue il mouse; cono e linea partono dal token scelto verso il mouse; ← → ruotano di 45° (rettangolo: 90°), ↑ ↓ cambiano la misura, rotella 15°; clic per fissarlo, Esc per annullare'],
      ['Clic destro su un template', 'Sposta o ruota (poi le frecce), Nascondi / Mostra ai giocatori; «Opzioni ▸»: Togli'],
      ['Strumenti → «Luci»', 'luce della scena (Luce, Penombra −2, Luce scarsa −4, Buio come Accecato); zone a pennello o a rettangolo, «Gomma» per toglierle; Ctrl+Z annulla'],
      ['Clic destro su un token → Opzioni → «Porta una luce…»', 'una torcia o una lanterna (raggi del catalogo): Luce attorno al token, che la porta con sé; i muri non la fermano'],
      ['Clic destro su un punto vuoto', 'Nuovo template qui; con un token scelto, Linea di tiro fin qui'],
      ['Strumenti → «Salva posizione iniziale» / «Ripristina posizione iniziale»', 'token, porte, template e nebbia della scena, per rigiocarla; PV, Stati e registro dello scontro non cambiano; Ctrl+Z annulla il ripristino'],
      ['Pulsante «🧹 Temporanei» (o Strumenti → «Cancella template temporanei»)', 'toglie in un colpo i template a durata (con conferma e il numero); quelli senza durata restano; Ctrl+Z li rimette'],
      ['Maiusc+T (pulsante «◫ Template»)', 'mostra o nasconde i template senza durata, muri, porte e terreno (per il movimento valgono sempre); con «anche a durata» anche i template a Round'],
      ['Strumenti → Muri e terreno → «Porta»', 'clic su un Q di muro: porta (aperta, chiusa o bloccata; segreta); clic su una porta: la toglie'],
      ['Clic su una porta', 'il master la apre o la chiude (bloccata: no); clic destro: il token scelto vicino la apre (1 AzP); Apri / Chiudi, Blocca / Sblocca; «Opzioni ▸»: Ruota, Rivela / Rendi segreta, Togli'],
      ['L (o clic destro → «Linea di tiro»)', 'dal token scelto verso il mouse o un token: distanza (diagonale 1 Q), vista, Copertura (§5.8) con la causa, token in mezzo come «bersaglio protetto» (§5.10); clic per fissarla: «Attacca!» con distanza e Copertura; Esc per chiudere'],
      ['Nebbia automatica (pannello Nebbia)', 'la nebbia si apre dove i PG vedono (muri e porte chiuse fermano la vista); per i giocatori le zone esplorate restano più scure'],
      ['Maiusc+L (o Strumenti → «Mostra dettaglio linea di tiro»)', 'mostra o nasconde le cinque linee di controllo della linea di tiro, dal centro di chi tira verso angoli e centro del bersaglio (solo qui)'],
      ['Strumento «Porta»: ← →', 'gira la porta da mettere (verticale / orizzontale); di solito segue da sola i muri vicini. Sulla porta già messa: clic destro → «Ruota»'],
      ['Token scelto accanto a una porta', 'clic destro o pannello: «Apri porta» / «Chiudi porta», 1 AzP e una riga nel registro (A.125)'],
      ['♫ in alto', 'musica di fondo dello scontro (file della cartella musica/ del server): parte con lo scontro, si ripete, si ferma alla chiusura; ⏸ / ▶ la mette in pausa'],
      ['🔊 e cursori Musica / Effetti', 'muto generale e volumi su questo PC (ricordati); la campanella suona a ogni nuovo Round. Strumenti → «Suoni anche nella vista giocatori» per il televisore con le casse'],
      ['Avviso «clic per attivare l’audio»', 'il browser blocca i suoni finché non tocchi la pagina: un clic qualunque li sblocca'],
      ['Veicolo da mettere o scelto: ← →', 'gira il veicolo di 90° (anche clic destro → «Ruota»); Ctrl+Z annulla'],
      ['Veicolo scelto: riga «Andatura» del pannello (o clic destro → «Movimento»)', 'Fermo, Controllata, Veloce, Massima con i Q del Round; l’area si aggiorna subito. Nello scontro una fascia per Round (Veicoli §2.1): il resto resta scelto per i Round dopo. Con l’andatura Fermo il veicolo non si muove e un avviso lo dice, con le andature come pulsanti'],
      ['Veicolo: muoverlo', 'trascinalo o clic sul quadretto di arrivo, come un token; una volta per Round'],
      ['Clic destro su un PG o un nemico accanto a un veicolo', '«Sali su … come conducente» (un PG) o «come passeggero»: il token va a bordo e si muove con il mezzo'],
      ['Pannello del veicolo → «A bordo» (o clic destro sul veicolo)', 'gruppo «Scendi»: il nome, poi clic su un quadretto evidenziato accanto; gruppo «Linea di tiro»: la linea di chi è a bordo, dal veicolo'],
      ['Mappa collegata a una bozza', 'gruppo «Iniziativa» → «Inizia scontro»: come «Inizia» della bozza, poi la finestra «Iniziativa»'],
      ['Tablet dei giocatori', 'aprono la vista giocatori (Strumenti → «Collega i tablet»), toccano «Sono…» e muovono il proprio PG: tocco sul quadretto, poi «Conferma». Il server controlla ogni movimento; tu lo vedi in diretta e lo annulli con Ctrl+Z'],
      ['📱 e 🔔 nell’elenco dell’Iniziativa', '📱 pieno: il tablet del PG è collegato (pagina aperta); 🔔 manda al suo tablet un avviso grande con suono e vibrazione'],
      ['Strumenti → Tablet dei giocatori', 'blocca i movimenti, «solo al proprio turno» o «sempre», avviso automatico «Tocca a te»'],
      ['Strumenti (in alto)', 'sette categorie: Preparazione mappa, Scena, In gioco, Vista giocatori, Tablet dei giocatori, Suoni, Pulizia; scorciatoia a destra, le voci spente dicono perché'],
      ['M', 'mostra o nasconde l’area di movimento'],
      ['Z', 'mostra o nasconde le zone di controllo (ZoC) degli avversari'],
      ['P', 'mostra o nasconde la barretta dei PV sui token (solo per te)'],
      ['Tab (Maiusc + Tab indietro)', 'cambia disposizione: Mappa grande, Equilibrata, Scontro grande'],
      ['Doppio clic sul bordo della barra', 'disposizione successiva; trascinarlo cambia la larghezza'],
      ['Ctrl + Z', 'annulla l’ultima azione del master (movimento, muri, nebbia, token)'],
      ['Esc', 'chiude menu e strumenti, poi lascia il token scelto, poi chiude la mini-scheda'],
      ['?', 'questo pannello'],
      ['Due dita (tablet)', 'zoom e spostamento; doppio tocco: adatta allo schermo'],
    ];
    informa({
      titolo: 'Scorciatoie e comandi della mappa', classe: 'aiuto-mappa',
      contenuto: h('div', {}, h('table', { class: 'tabella compatta' }, h('tbody', {}, righe.map(([k, v]) => h('tr', {}, h('th', { scope: 'row' }, k), h('td', {}, v))))),
        // la guida per il master (docs/battlemap/guida-davide.md), in una scheda nuova
        h('p', {}, linkGuidaMappa('Guida completa della mappa (preparare la scena, giocare, due schermi)'))),
    });
  }
  /** «Colore del bordo»: il master sceglie il colore di un PG o di un tipo di nemico (tutte le sue copie). */
  async function coloreBordo(id) {
    const t = st.scena.token.find((x) => x.id === id);
    const p = t ? pezzoDi(t) : null;
    const tav = p ? tavolozzaPer(p, ctx.dati) : null;
    if (!tav) { avviso(famiglia(p) === 'veicolo' ? 'Il veicolo ha il colore del suo proprietario (o il grigio del gruppo).' : 'Gli alleati hanno sempre il bordo grigio-petrolio doppio.'); return; }
    const scelto = await scegliColore({
      titolo: `Colore del bordo: ${famiglia(p) === 'nemici' ? (p.scheda?.nome ?? p.nome.replace(/\s+\d+$/, '')) : p.nome}`,
      colori: tav, attuale: bordoDi(p).id,
      nota: famiglia(p) === 'nemici' ? 'Vale per tutte le copie di questo tipo; si distinguono dal numero.' : 'Il colore resta a questo PG in questa scena.',
    });
    if (!scelto || !st.scena) return;
    st.scena = cambiaColore(st.scena, p, scelto);
    dopoCambioToken();
  }
  function togliToken(id) {
    const prima = st.scena.token.find((t) => t.id === id);
    if (!prima) return;
    if (aBordo(prima).length) { avvisoErrore('Prima fai scendere chi è a bordo (pannello del veicolo → «A bordo» → «Scendi…»).'); return; }
    if (st.selezionato === id) st.selezionato = null;
    st.scena = cambiaTokenAnnullabile(st.scena, prima, null, ctx.dati);
    dopoCambioToken();
  }

  function scegli(id) {
    // la fascia riparte da quella che il movimento già fatto ha raggiunto (3 Q usati su Passo 2: Corsa)
    if (st.selezionato !== id) st.fascia = fasciaRaggiunta(id);
    const nuovo = st.selezionato !== id;
    st.selezionato = id;
    invalidaArea();
    disegnaPannelli();
    disegnaIniziativa();
    ridisegna(['aree', 'sopra']);
    // ritocchi del 08/10: un veicolo che non si può muovere lo dice subito (mai un silenzio), con il modo di farlo
    const t = nuovo && id ? st.scena?.token.find((x) => x.id === id) : null;
    if (t?.rif.tipo === 'veicolo' && st.fascia !== LIBERO) {
      const info = infoArea(t);
      if (!info.area && info.motivo) avviso(info.fermoAndatura ? `${info.motivo}.` : `${pezzoDi(t)?.nome ?? 'Veicolo'}: ${info.motivo}.`, { tipo: 'info', chiave: 'veicolo-fermo', durata: 12000, azioni: info.fermoAndatura ? azioniAndatura(t) : [] });
    }
  }

  /**
   * Difetto 2 (primo test di Marcello, 06/10/2026): il clic su un token apre la sua carta in un pannello accanto alla
   * mappa, senza lasciarla: la plancia in modalità «carta sola» (src/ui/tavolo.js), con PV, Stati, «Colpito» e
   * «Apri scheda completa». Si aggiorna da sola come la plancia.
   */
  function apriCarta(t) {
    const pz = pezzoDi(t);
    if (!pz) return avvisoErrore('Questo token non è più nello scontro: nessuna mini-scheda da aprire.');
    apriCartaChiave(pz.chiave);
  }
  /** Mini-scheda del pezzo `chiave` in cima alla barra (anche di un partecipante senza token in mappa). */
  function apriCartaChiave(chiave, { riapri = true } = {}) {
    st.cartaAperta = chiave;
    el.carta.hidden = false;
    // lotto 6: con la barra ridotta il clic su un token la riapre sulla sua mini-scheda (non il cambio di turno)
    if (riapri && st.disp.disposizione === 'mappa') scegliDisposizione('equilibrata');
    el.piena.scrollTop = 0;
    segnaGruppo('scheda');
    if (st.plancia) st.plancia.ridisegna();
    else {
      st.plancia = renderTavolo(el.cartaCorpo, {
        dati: ctx.dati,
        soloCarta: () => st.cartaAperta,
        azioni: { personaggi: () => {}, mappa: () => {}, apri: (r) => apriSchedaCompleta(r) },
      });
    }
  }
  function chiudiCarta() {
    st.plancia?.();
    st.plancia = null;
    st.cartaAperta = null;
    el.carta.hidden = true;
    svuota(el.cartaCorpo);
  }
  /** La vista da rimettere tornando dalla scheda o dalla plancia: zoom, posizione, token scelto, carta aperta. */
  const vistaAttuale = () => ({ cam: { ...st.cam }, selezionato: st.selezionato, carta: st.cartaAperta });
  /** «Apri scheda completa» del PG: la scheda ha «Torna alla mappa» (src/ui/ritorno.js). */
  function apriSchedaCompleta(r) {
    if (st.salvataggio.modificata) salvaOra();
    ctx.azioni.apriScheda(r, { scena: ctx.id, vista: vistaAttuale() });
  }
  /** «Apri nella plancia»: la plancia intera nella stessa finestra, sulla carta, con «Torna alla mappa». */
  function apriNellaPlancia(chiave = st.cartaAperta) {
    if (!chiave) return;
    if (st.salvataggio.modificata) salvaOra();
    segnaDallaMappa(sessionStorage, { scena: ctx.id, carta: chiave, vista: vistaAttuale() });
    ctx.azioni.tavolo();
  }

  /** Mette in mappa il pezzo `chiave` con il centro più vicino possibile al punto m della mappa (aggancio §7). */
  function piazza(chiave, m) {
    st.daPiazzare = null;
    el.riquadro.classList.remove('piazza');
    const pz = st.mappaPezzi.get(chiave);
    if (!pz || st.scena.token.some((t) => chiaveRif(t.rif) === chiave)) { disegnaPannelli(); return; }
    // fase 2, lotto 5: un veicolo entra con il muso scelto con ← → durante il piazzamento (di norma in basso)
    const dir = pz.tipo === 'veicolo' ? st.dirPiazza ?? 's' : null;
    const ingombro = dir ? ingombroOrientato(pz.ingombro, dir) : pz.ingombro;
    const t = { ...tokenPerPezzo({ ...pz, ingombro }, agganciaQ(st.scena.griglia, m.x, m.y, ingombro)), ...(dir ? { direzione: dir } : {}) };
    st.dirPiazza = null;
    st.scena = cambiaTokenAnnullabile(st.scena, null, t, ctx.dati);
    avvisaSovrapposti([t.id]);
    st.selezionato = t.id;
    dopoCambioToken();
  }

  // ── Veicoli sulla mappa (fase 2, lotto 5; src/mappa/veicoli-mappa.js): girare, salire, scendere, linea dei passeggeri ──
  const muroQ = () => { const muri = muriEffettivi(st.scena); const g = st.scena.griglia; return (x, y) => cella(muri, g.colonne, g.righe, x, y); };
  const nomeTok = (t) => pezzoDi(t)?.nome ?? t?.nome ?? t?.id ?? '—';
  /** Andatura del veicolo dalla mappa (ritocchi del 08/10): nel registro unico, poi area ricalcolata subito. */
  async function andaturaUi(t, id) {
    const rec = recordVeicolo(t);
    if (!rec) { avvisoErrore('Registro del veicolo non trovato: l’andatura si cambia dalla sua scheda.'); return; }
    let r;
    try { r = scegliAndatura(rec, id, st.fonti?.scontro ?? null, ctx.dati); } catch (e) { avvisoErrore(e.message); return; }
    try {
      const { record } = await aggiornaVeicolo(rec, r.rec);
      if (st.fonti) st.fonti.veicoli = st.fonti.veicoli.map((x) => (x.id === record.id ? record : x));
      avviso(r.testo, { tipo: 'info', chiave: 'andatura' });
      await aggiornaFonti();
      invalidaArea();
      disegnaPannelli();
      ridisegna(['aree', 'sopra']);
    } catch (e) { avvisoErrore(`Andatura non salvata: ${e.message}`); }
  }
  /** Le andature come pulsanti di un avviso (veicolo fermo). */
  const azioniAndatura = (t) => ctx.dati.veicoli.andature.elenco.filter((a) => a.moltiplicatore > 0).map((a) => ({ testo: a.nome, fai: () => andaturaUi(t, a.id) }));
  /** Gira il veicolo di 90° attorno al suo centro (Ctrl+Z annulla); non su muri o altri token. */
  function ruotaVeicoloUi(id, verso) {
    const prima = st.scena.token.find((t) => t.id === id);
    if (!prima) return;
    const r = ruotaSeLibero(st.scena, id, verso, muroQ());
    if (r.errore) { avvisoErrore(`${nomeTok(prima)} non si gira: ${r.errore}.`); return; }
    st.scena = cambiaTokenAnnullabile(st.scena, prima, r.token, ctx.dati);
    avviso(`${nomeTok(prima)}: muso ${NOMI_DIREZIONI[r.token.direzione]} (Ctrl+Z annulla).`, { tipo: 'info', chiave: 'ruota-veicolo' });
    dopoCambioToken();
  }
  /** ← → : gira il veicolo da mettere (prima del clic) o quello scelto. */
  function frecciaVeicolo(e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return false;
    const verso = e.key === 'ArrowRight' ? 1 : -1;
    const daMettere = st.daPiazzare ? st.mappaPezzi.get(st.daPiazzare) : null;
    if (daMettere?.tipo === 'veicolo') {
      e.preventDefault();
      st.dirPiazza = DIREZIONI[(DIREZIONI.indexOf(st.dirPiazza ?? 's') + (verso < 0 ? 3 : 1)) % 4];
      avviso(`${daMettere.nome}: muso ${NOMI_DIREZIONI[st.dirPiazza]}; clic sulla mappa per metterlo.`, { tipo: 'info', chiave: 'ruota-veicolo' });
      return true;
    }
    const t = st.selezionato && !st.gruppo.size && !st.trascina ? st.scena.token.find((x) => x.id === st.selezionato) : null;
    if (t?.rif.tipo !== 'veicolo') return false;
    e.preventDefault();
    ruotaVeicoloUi(t.id, verso);
    return true;
  }
  /** Una riga nel registro dello scontro aperto (salire, scendere). */
  function rigaVeicolo(testo) {
    const scontro = st.fonti?.scontro;
    if (scontro) scriviRegistro(scontro.id, (x) => registraRiga(x, testo), 'Riga del registro (veicolo)');
  }
  /** Conducente nel registro unico del veicolo (A.91): il PG che sale come conducente, nessuno quando scende. */
  async function conducenteNelRegistro(vTok, pgTok) {
    const rec = recordVeicolo(vTok);
    if (!rec) { avvisoErrore('Registro del veicolo non trovato: il conducente non è cambiato nella sua scheda.'); return; }
    const nuovo = pgTok ? { chiave: pgTok.rif.id.replace(/^pg:/, ''), nome: nomeTok(pgTok) } : null;
    try {
      const { record } = await aggiornaVeicolo(rec, cambiaConducente(rec, nuovo));
      if (st.fonti) st.fonti.veicoli = st.fonti.veicoli.map((x) => (x.id === record.id ? record : x));
      await aggiornaFonti();
    } catch (e) { avvisoErrore(`Conducente non salvato nella scheda del veicolo: ${e.message}`); }
  }
  /** «Sali sul veicolo» (come conducente o passeggero): il token esce dalla mappa e va a bordo. */
  async function saliUi(idTok, idVeicolo, ruolo) {
    const tok = st.scena.token.find((t) => t.id === idTok);
    const vTok = st.scena.token.find((t) => t.id === idVeicolo);
    if (!tok || !vTok) return;
    if (ruolo === 'conducente' && pezzoDi(tok)?.tipo !== 'pg') { avvisoErrore('Il conducente della scheda del veicolo è un PG (A.91): un nemico sale come passeggero.'); return; }
    const r = sali(st.scena, idTok, idVeicolo, ruolo, pezzoDi(vTok)?.posti ?? { conducente: 1, passeggeri: 0 }, ctx.dati);
    if (r.errore) { avvisoErrore(`${nomeTok(tok)} non sale: ${r.errore}.`); return; }
    st.scena = r.scena;
    if (st.selezionato === idTok) st.selezionato = idVeicolo;
    avviso(`${nomeTok(tok)} sale su ${nomeTok(vTok)} come ${ruolo}. Costo in Azioni da definire (A.145): applicalo a voce. Ctrl+Z annulla.`, { tipo: 'info', chiave: 'bordo' });
    rigaVeicolo(`Mappa: ${nomeTok(tok)} sale su ${nomeTok(vTok)} (${ruolo}).`);
    dopoCambioToken();
    if (ruolo === 'conducente') await conducenteNelRegistro(vTok, tok);
  }
  /** «Scendi»: si sceglie con un clic il quadretto libero accanto al veicolo (evidenziato). */
  function iniziaScendi(idVeicolo, idPasseggero) {
    const vTok = st.scena.token.find((t) => t.id === idVeicolo);
    const p = aBordo(vTok).find((x) => x.id === idPasseggero);
    if (!p) return;
    const celle = qPerScendere(st.scena, idVeicolo, idPasseggero, muroQ());
    if (!celle.length) { avvisoErrore('Nessun quadretto libero accanto al veicolo: sposta qualcosa o il veicolo.'); return; }
    st.scendi = { veicolo: idVeicolo, passeggero: idPasseggero, celle };
    avviso(`${nomeTok(p)} scende: clic su un quadretto evidenziato accanto a ${nomeTok(vTok)} (Esc annulla).`, { tipo: 'info', chiave: 'scendi', durata: 15000 });
    ridisegna(['sopra']);
  }
  async function scendiQui(m) {
    const { veicolo, passeggero } = st.scendi;
    const vTok = st.scena.token.find((t) => t.id === veicolo);
    const p = aBordo(vTok).find((x) => x.id === passeggero);
    if (!p) { st.scendi = null; return; }
    const q = typeof p.ingombro === 'number' && p.ingombro > 1 ? agganciaQ(st.scena.griglia, m.x, m.y, p.ingombro) : qVicino(m);
    const r = scendi(st.scena, veicolo, passeggero, q, ctx.dati, { muro: muroQ() });
    if (r.errore) { avviso(`${r.errore} (Esc annulla).`, { chiave: 'scendi' }); return; }
    st.scendi = null;
    st.scena = r.scena;
    st.selezionato = passeggero;
    avviso(`${nomeTok(p)} scende da ${nomeTok(vTok)}. Costo in Azioni da definire (A.145). Ctrl+Z annulla.`, { tipo: 'info', chiave: 'scendi' });
    rigaVeicolo(`Mappa: ${nomeTok(p)} scende da ${nomeTok(vTok)}.`);
    dopoCambioToken();
    if (r.passeggero.ruolo === 'conducente') await conducenteNelRegistro(vTok, null);
  }
  /** Linea di tiro di chi è a bordo: parte dal veicolo, dal quadretto dell'ingombro più favorevole (come i token grandi). */
  function lineaPasseggero(idVeicolo, idPasseggero) {
    iniziaLinea(idVeicolo);
    if (st.linea) st.linea.passeggero = idPasseggero;
  }

  /** «Metti tutti»: una fila libera vicino al centro della vista (src/mappa/token.js → disponiInFila). */
  function mettiTutti() {
    const senza = pezziSenzaToken(st.scena, st.pezzi);
    if (!senza.length) return;
    const g = st.scena.griglia;
    const d = tela.dimensioni();
    const m = mappaDaSchermo(st.cam, d.larghezza / 2, d.altezza / 2);
    const centro = [Math.max(0, Math.min(g.colonne - 1, (m.x - g.scosto_x) / g.q_px)), Math.max(0, Math.min(g.righe - 1, (m.y - g.scosto_y) / g.q_px))];
    const muri = muriEffettivi(st.scena);
    const { posti, nonPiazzati } = disponiInFila(senza.map((p) => ({ id: p.chiave, ingombro: p.ingombro })), centro,
      { token: st.scena.token, muro: (x, y) => cella(muri, g.colonne, g.righe, x, y), colonne: g.colonne, righe: g.righe });
    const nuovi = posti.map((x) => tokenPerPezzo(st.mappaPezzi.get(x.id), x.q));
    for (const t of nuovi) st.scena = cambiaTokenAnnullabile(st.scena, null, t, ctx.dati);
    if (nonPiazzati.length) avvisoErrore(`Non c’è posto per: ${nonPiazzati.map((k) => st.mappaPezzi.get(k)?.nome ?? k).join(', ')}.`);
    else avviso(`In mappa: ${nuovi.length} token.`);
    dopoCambioToken();
  }

  // ── Strumenti di disegno (lotti 4 e 5): nebbia (§5) e muri (§6), pennello o rettangolo, uno solo attivo ──
  const N = st.nebbia;
  const M = st.muri;
  const qVicino = (m) => {
    const g = st.scena.griglia;
    return [Math.max(0, Math.min(g.colonne - 1, Math.floor((m.x - g.scosto_x) / g.q_px))), Math.max(0, Math.min(g.righe - 1, Math.floor((m.y - g.scosto_y) / g.q_px)))];
  };
  /** Lo strumento di disegno attivo: { gruppo: 'nebbia' | 'muri', forma: 'pennello' | 'rettangolo' } oppure null. */
  const L = st.luci;
  const disegnoAttivo = () => (N.strumento ? { gruppo: 'nebbia', forma: N.strumento } : M.strumento ? { gruppo: 'muri', forma: M.strumento } : L.strumento ? { gruppo: 'luci', forma: L.strumento } : null);
  const quanteAnnulla = () => st.scena.annulla.length;
  const pulsanteScelta = (testo, attivo, onclick, titolo) => h('button', { type: 'button', class: `btn btn-piccolo${attivo ? ' scelto' : ''}`, 'aria-pressed': String(attivo), title: titolo, onclick }, testo);
  const pulsanteAnnulla = () => h('button', { type: 'button', class: 'btn btn-piccolo', disabled: !quanteAnnulla(), title: 'Annulla l’ultima azione del master: movimento, muro, nebbia, token (Ctrl+Z)', onclick: () => annullaUi() }, `Annulla (${quanteAnnulla()})`);
  const campoLato = (o) => h('label', { class: 'mappa-campo' }, h('span', {}, 'Dimensione del pennello (Q)'),
    h('input', { type: 'number', min: 1, max: 15, step: 1, value: String(o.lato), onchange: (e) => { o.lato = Math.max(1, Math.min(15, Math.round(Number(e.target.value) || 1))); e.target.value = String(o.lato); } }));
  function disegnaPannelloNebbia() {
    if (!st.scena) return;
    aggiornaVoceNebbiaAutomatica();
    const g = st.scena.griglia;
    const coperti = conta(daBase64(st.scena.nebbia.coperti), g.colonne, g.righe);
    svuota(el.pNebbia,
      h('summary', {}, h('strong', {}, 'Nebbia'), ` (${coperti} Q coperti su ${g.colonne * g.righe}; automatica: ${st.scena.visuale?.automatica ? 'sì' : 'no'})`),
      // 07/10 (test di Marcello): l'interruttore della nebbia automatica in cima alla sezione, evidente, con lo stato
      // fase 2, lotto 3: nebbia automatica dalla visuale dei PG
      h('button', { type: 'button', role: 'switch', 'aria-checked': String(!!st.scena.visuale?.automatica), class: `interruttore-mappa interruttore-evidente${st.scena.visuale?.automatica ? ' acceso' : ''}`, title: `La nebbia si apre da sola dove i PG vedono (fino a ${ctx.dati.mappa.visuale.raggio_q} Q; muri e porte chiuse fermano la vista). Le zone esplorate restano scoperte; per i giocatori, più scure. La nebbia a mano continua a funzionare.`, onclick: () => cambiaVisualeAutomatica() },
        h('span', { class: 'interruttore-mappa-pallino', 'aria-hidden': 'true' }), `Nebbia automatica (visuale dei PG): ${st.scena.visuale?.automatica ? 'sì' : 'no'}`),
      h('p', { class: 'nota' }, st.scena.visuale?.automatica ? 'Spostando un PG la nebbia si apre dove vede: in Luce fino a 30 Q, in Penombra 6, con Luce scarsa 3, al Buio solo attorno a lui (Strumenti → Luci).' : 'Spenta: la nebbia la apri e la chiudi solo tu, con gli strumenti qui sotto. Accesa, si apre da sola dove i PG vedono quando si spostano.'),
      h('p', { class: 'nota' }, 'Per te è semitrasparente, per i giocatori piena. Scegli lo strumento e trascina sulla mappa; la barra spaziatrice resta per spostarti.'),
      h('div', { class: 'mappa-azioni-token', role: 'group', 'aria-label': 'Strumento della nebbia' },
        pulsanteScelta('Pennello', N.strumento === 'pennello', () => strumentoNebbia(N.strumento === 'pennello' ? null : 'pennello'), 'Dipingi per quadretti'),
        pulsanteScelta('Rettangolo', N.strumento === 'rettangolo', () => strumentoNebbia(N.strumento === 'rettangolo' ? null : 'rettangolo'), 'Da un angolo all’altro')),
      h('div', { class: 'mappa-azioni-token', role: 'group', 'aria-label': 'Modalità della nebbia' },
        pulsanteScelta('Rivela', N.modo === 'rivela', () => { N.modo = 'rivela'; disegnaPannelloNebbia(); }, 'Toglie la nebbia'),
        pulsanteScelta('Copri', N.modo === 'copri', () => { N.modo = 'copri'; disegnaPannelloNebbia(); }, 'Mette la nebbia')),
      campoLato(N),
      h('div', { class: 'mappa-azioni-token' },
        h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => tuttaUi('copri') }, 'Copri tutto'),
        h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => tuttaUi('rivela') }, 'Rivela tutto'),
        pulsanteAnnulla()));
  }
  /** Lotto 5, §6: muri invalicabili e terreno difficile per quadretti; «Gomma» toglie l'uno e l'altro. */
  function disegnaPannelloMuri() {
    if (!st.scena) return;
    const g = st.scena.griglia;
    const muri = conta(daBase64(st.scena.muri), g.colonne, g.righe);
    const terreno = conta(daBase64(st.scena.terreno), g.colonne, g.righe);
    svuota(el.pMuri,
      h('summary', {}, h('strong', {}, 'Muri'), ` (${muri} Q di muro, ${terreno} di terreno difficile)`),
      h('p', { class: 'nota' }, 'Muri e terreno difficile si vedono solo qui (retino e puntinato) e decidono l’area raggiungibile. Ai giocatori non arrivano quelli sotto la nebbia.'),
      h('div', { class: 'mappa-azioni-token', role: 'group', 'aria-label': 'Strumento dei muri' },
        pulsanteScelta('Pennello', M.strumento === 'pennello', () => strumentoMuri(M.strumento === 'pennello' ? null : 'pennello'), 'Dipingi per quadretti'),
        pulsanteScelta('Rettangolo', M.strumento === 'rettangolo', () => strumentoMuri(M.strumento === 'rettangolo' ? null : 'rettangolo'), 'Per le aree grandi: da un angolo all’altro'),
        pulsanteScelta('Porta', M.strumento === 'porta', () => strumentoMuri(M.strumento === 'porta' ? null : 'porta'), 'Clic su un Q di muro: mette una porta; clic su una porta: la toglie')),
      M.strumento === 'porta' ? h('div', { class: 'mappa-azioni-token', role: 'group', 'aria-label': 'Porta nuova' },
        ctx.dati.mappa.porte.stati.map((s) => pulsanteScelta(ctx.dati.mappa.porte.nomi_stati[s], M.porta.stato === s, () => { M.porta.stato = s; disegnaPannelloMuri(); }, `Le porte nuove nascono ${ctx.dati.mappa.porte.nomi_stati[s].toLowerCase()}`)),
        h('label', { title: 'Per i giocatori è muro finché non la riveli (clic destro → Rivela)' }, h('input', { type: 'checkbox', checked: M.porta.segreta, onchange: (e) => { M.porta.segreta = e.target.checked; } }), ' segreta'),
        // 07/10: orientamento, automatico dai muri vicini o scelto con ← →
        h('span', { class: 'nota' }, M.porta.verso ? `${M.porta.verso}, scelta a mano (← →)` : 'orientamento automatico dai muri (← → per girarla)'),
        M.porta.verso ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Torna all’orientamento automatico, dai muri vicini', onclick: () => { M.porta.verso = null; disegnaPannelloMuri(); ridisegna(['aree']); } }, 'Automatico') : null) : null,
      h('div', { class: 'mappa-azioni-token', role: 'group', 'aria-label': 'Modalità dei muri' },
        pulsanteScelta('Muro', M.modo === 'muro', () => { M.modo = 'muro'; disegnaPannelloMuri(); }, 'Invalicabile'),
        pulsanteScelta('Terreno difficile', M.modo === 'terreno', () => { M.modo = 'terreno'; disegnaPannelloMuri(); }, 'Costa di più (provvisorio: ×2, A.128)'),
        pulsanteScelta('Gomma', M.modo === 'gomma', () => { M.modo = 'gomma'; disegnaPannelloMuri(); }, 'Toglie muri e terreno difficile')),
      campoLato(M),
      h('div', { class: 'mappa-azioni-token' }, pulsanteAnnulla()));
  }
  function strumentoNebbia(s) {
    N.strumento = s;
    if (s) { M.strumento = null; L.strumento = null; }
    dopoStrumento();
  }
  function strumentoMuri(s) {
    M.strumento = s;
    if (s) { N.strumento = null; L.strumento = null; }
    dopoStrumento();
  }
  function strumentoLuci(s) {
    L.strumento = s;
    if (s) { N.strumento = null; M.strumento = null; }
    dopoStrumento();
  }
  /**
   * Fase 2, lotto 4 (decisione di Marcello del 07/10: luci semplici, pronte in pochi secondi): la luce della scena, un
   * menu con le quattro categorie (A.106), e se serve le zone a pennello; le luci portate dai token dal loro menu.
   */
  function disegnaPannelloLuci() {
    if (!st.scena) return;
    const cats = categorieLuce(ctx.dati);
    const amb = ambienteDi(st.scena, ctx.dati);
    const zone = Object.keys(st.scena.luce?.zone ?? {}).length;
    const portate = st.scena.token.filter((t) => t.luce).length;
    svuota(el.pLuci,
      h('summary', {}, h('strong', {}, 'Luci'), ` (${cats.find((c) => c.id === amb)?.nome ?? amb}${zone ? ', con zone' : ''}${portate ? `, ${portate} ${portate === 1 ? 'luce portata' : 'luci portate'}` : ''})`),
      h('p', { class: 'nota' }, 'Luce della scena: basta per quasi tutte le scene. Le zone a pennello sono facoltative (stanza buia, corridoio in penombra); le torce si danno ai token dal loro menu (Opzioni → «Porta una luce»). I muri non fermano la luce.'),
      h('label', { class: 'mappa-campo' }, h('span', {}, 'Luce della scena'),
        h('select', { onchange: (e) => { st.scena = cambiaAmbiente(st.scena, e.target.value, ctx.dati); dopoLuci(); } },
          cats.map((c) => h('option', { value: c.id, selected: c.id === amb }, `${c.nome} (${c.riga})`)))),
      h('div', { class: 'mappa-azioni-token', role: 'group', 'aria-label': 'Strumento delle zone di luce' },
        pulsanteScelta('Pennello', L.strumento === 'pennello', () => strumentoLuci(L.strumento === 'pennello' ? null : 'pennello'), 'Dipingi una zona per quadretti'),
        pulsanteScelta('Rettangolo', L.strumento === 'rettangolo', () => strumentoLuci(L.strumento === 'rettangolo' ? null : 'rettangolo'), 'Una stanza intera, da un angolo all’altro')),
      h('div', { class: 'mappa-azioni-token', role: 'group', 'aria-label': 'Categoria della zona' },
        cats.map((c) => pulsanteScelta(c.nome, L.modo === c.id, () => { L.modo = c.id; disegnaPannelloLuci(); }, `Zona: ${c.nome} (${c.riga})`)),
        pulsanteScelta('Gomma', L.modo === 'gomma', () => { L.modo = 'gomma'; disegnaPannelloLuci(); }, 'Toglie le zone: torna la luce della scena')),
      campoLato(L),
      h('div', { class: 'mappa-azioni-token' }, pulsanteAnnulla()),
      // le luci portate dai token: chi, quanto, e «Cambia» (lo stesso di Opzioni → «Porta una luce…»)
      h('p', { class: 'mappa-sottotitolo' }, h('strong', {}, 'Luci portate')),
      portate
        ? h('ul', { class: 'elenco-luci' }, st.scena.token.filter((t) => t.luce).map((t) => h('li', {},
          `${pezzoDi(t)?.nome ?? t.nome ?? t.id}: ${t.luce} Q `,
          h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Cambia il raggio o spegni', onclick: () => luceToken(t) }, 'Cambia'))))
        : h('p', { class: 'nota' }, 'Nessuna. Clic destro su un token → Opzioni → «Porta una luce…».'));
  }
  /** Dopo un cambio delle luci: nebbia automatica, pannello, salvataggio, disegno. */
  function dopoLuci() {
    st.luceCache = null;
    aggiornaVisuale();
    salvaPresto();
    disegnaPannelloLuci();
    disegnaPannelli();
    ridisegna(['aree', 'sopra']);
  }
  /** Maschere delle zone scure per il velo (cache per luci e posizioni dei token che portano una luce). */
  function maschereLuce() {
    const s = st.scena;
    if (!s) return null;
    const chiave = JSON.stringify([s.luce ?? null, s.token.filter((t) => t.luce).map((t) => [t.q, t.ingombro, t.luce])]);
    if (st.luceCache?.chiave === chiave) return st.luceCache.maschere;
    const { colonne: C, righe: R } = s.griglia;
    const cat = ctx.dati.mappa.luci.categorie;
    let maschere = null;
    if (s.luce) {
      const m = luceQ(s, ctx.dati);
      maschere = {};
      for (let k = 0; k < cat.length; k++) {
        if (cat[k] === ctx.dati.mappa.luci.predefinita) continue;
        const z = new Uint8Array(Math.ceil((C * R) / 8));
        for (let i = 0; i < C * R; i++) if (m[i] === k) z[i >> 3] |= 1 << (i & 7);
        maschere[cat[k]] = z;
      }
    }
    st.luceCache = { chiave, maschere };
    return maschere;
  }
  /** «Porta una luce» dal menu del token: raggi del catalogo (data/mappa.json → luci.sorgenti), un altro raggio, spegni. */
  async function luceToken(tok) {
    const LU = ctx.dati.mappa.luci;
    const nome = pezzoDi(tok)?.nome ?? tok.nome ?? tok.id;
    const campo = h('input', { type: 'number', min: 1, max: LU.raggio_max_q, step: 1, value: String(tok.luce ?? 3), class: 'input-d10', 'aria-label': 'Raggio in Q' });
    const scelta = await apriFinestrella('scegli-luce', `Luce portata da ${nome}`, (fine) => [
      h('p', { class: 'nota' }, 'Entro il raggio la zona diventa Luce e segue il token. I muri non fermano la luce (nessun calcolo d’ombra).'),
      h('div', { class: 'mappa-azioni-token', role: 'group', 'aria-label': 'Sorgenti' },
        LU.sorgenti.map((x) => h('button', { type: 'button', class: `btn${tok.luce === x.raggio_q ? ' primario' : ''}`, onclick: () => fine(x.raggio_q) }, `${x.nome} · ${x.raggio_q} Q`))),
      h('div', { class: 'mappa-azioni-token' }, h('label', {}, 'Altro raggio (Q) ', campo),
        h('button', { type: 'button', class: 'btn', onclick: () => fine(Math.max(1, Math.min(LU.raggio_max_q, Math.round(Number(campo.value) || 1)))) }, 'Usa')),
      h('div', { class: 'riga-azioni finestrella-azioni' },
        tok.luce ? h('button', { type: 'button', class: 'btn', onclick: () => fine(0) }, 'Spegni') : null,
        h('button', { type: 'button', class: 'btn', onclick: () => fine(null) }, 'Annulla')),
    ]);
    if (scelta === null || scelta === undefined) return;
    cambiaToken(tok.id, (x) => { const { luce: _, ...senza } = x; return scelta > 0 ? { ...senza, luce: scelta } : senza; });
    st.luceCache = null;
    avviso(scelta > 0 ? `${nome} porta una luce: ${scelta} Q attorno a sé.` : `${nome}: luce spenta.`, { chiave: 'luce' });
    disegnaPannelloLuci();
  }
  function dopoStrumento() {
    if (disegnoAttivo() && st.strumento === 'calibra') impostaStrumento('sposta');
    el.riquadro.classList.toggle('nebbia', !!disegnoAttivo());
    st.percorso = null;
    disegnaPannelloNebbia();
    disegnaPannelloMuri();
    disegnaPannelloLuci();
    ridisegna(['aree', 'sopra']);
  }
  function dopoDisegno() {
    invalidaArea();
    salvaPresto();
    disegnaPannelloNebbia();
    disegnaPannelloMuri();
    disegnaPannelli();
    ridisegna(['aree', 'sopra']);
  }
  async function tuttaUi(modo) {
    if (!(await chiedi(modo === 'copri'
      ? { titolo: 'Coprire tutta la mappa?', testo: 'I giocatori non vedranno più nulla (Ctrl+Z annulla).', si: 'Copri tutto' }
      : { titolo: 'Rivelare tutta la mappa?', testo: 'I giocatori vedranno tutto (Ctrl+Z annulla).', si: 'Rivela tutto' }))) return;
    st.scena = tuttaNebbia(st.scena, modo, ctx.dati);
    dopoDisegno();
  }
  /**
   * Ctrl+Z (lotto 5): annulla l'ultima azione del master, qualunque sia (src/mappa/annulla.js). Un token tolto non torna
   * se il suo partecipante non è più nello scontro (solo con una lettura completa delle fonti).
   */
  function annullaUi() {
    const completa = (st.fonti?.scontro || st.fonti?.bozza) && !st.fonti.errori.length;
    const prima = st.scena;
    const esito = annullaUltima(st.scena, { chiaviPresenti: completa ? new Set(st.pezzi.map((p) => p.chiave)) : null });
    if (!esito) { avviso('Niente da annullare.'); return; }
    st.scena = esito.scena;
    if (esito.voce.tipo === 'movimento' && !esito.errore) {
      veicoloNonPiuMosso(prima.movimenti.find((x) => x.id === esito.voce.movimento));
      ritiraOpportunita(esito.voce.movimento);
    }
    if (st.selezionato && !st.scena.token.some((t) => t.id === st.selezionato)) st.selezionato = null;
    if (['template', 'ripristino', 'template-tolti', 'template-scaduti'].includes(esito.voce.tipo)) { st.tpl.firma = null; disegnaPannelloTemplate(); }
    if (esito.voce.tipo === 'ripristino') { invalidaArea(); disegnaPannelli(); }
    if (esito.voce.tipo === 'gruppo') dopoCambioToken();
    if (esito.errore) avvisoErrore(`Non annullato: ${esito.errore}.`);
    else avviso(`Annullato: ${{ nebbia: 'nebbia', muri: 'muri', movimento: 'movimento', token: 'modifica del token', 'token tolto': 'token tolto (torna in mappa)', 'token messo': 'token messo (esce dalla mappa)' }[esito.testo] ?? esito.testo}.`, { chiave: 'annulla' });
    dopoDisegno();
  }

  // ── Area raggiungibile e movimento (lotto 5, §8) ──
  const FASCE = ['passo', 'corsa', 'scatto'];
  // ── Maiusc = movimento libero, per un token e per un gruppo (07/10; src/mappa/gruppo.js) ──
  st.gruppo = new Set();
  st.maiusc = false;
  /** Maiusc premuto con un token scelto: Libero finché si tiene (l'area sparisce, il clic va dove si vuole). */
  function liberoConMaiusc() { return st.maiusc && !!st.selezionato && !st.gruppo.size; }
  function cambiaMaiusc(v) {
    if (st.maiusc === v) return;
    st.maiusc = v;
    aggiornaBadge();
    if (v) st.percorso = null;
    ridisegna(['aree', 'sopra']);
  }
  function aggiornaBadge() {
    if (!el.liberoInfo) return;
    el.liberoInfo.hidden = !liberoConMaiusc();
    const n = st.gruppo.size;
    el.gruppoInfo.hidden = !n;
    if (n) svuota(el.gruppoInfo, h('strong', {}, `${n} token selezionat${n === 1 ? 'o' : 'i'}`), ' · trascinane uno per spostarli tutti (libero) · frecce: 1 Q · Esc annulla ',
      h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Annulla la selezione (Esc)', onclick: () => cambiaGruppo(new Set()) }, '✕'));
  }
  /** La selezione multipla cambia: contorni, contatore; il token scelto singolo si lascia. */
  function cambiaGruppo(nuova) {
    st.gruppo = new Set([...nuova].filter((id) => st.scena?.token.some((t) => t.id === id)));
    if (st.gruppo.size && st.selezionato) scegli(null);
    aggiornaBadge();
    ridisegna(['aree', 'sopra']);
  }
  /** «Seleziona tutti i PG / i nemici / tutti» (Strumenti, clic destro su un punto vuoto). */
  function selezionaTipo(tipo) {
    const ok = (t) => (tipo === 'tutti' ? true : tipo === 'pg' ? t.rif?.tipo === 'partecipante' && String(t.rif.id).startsWith('pg:') : pezzoDi(t)?.lato === 'avversario');
    const ids = st.scena.token.filter(ok).map((t) => t.id);
    cambiaGruppo(new Set(ids));
    if (!ids.length) avviso(tipo === 'pg' ? 'Nessun PG in mappa.' : tipo === 'nemici' ? 'Nessun nemico in mappa.' : 'Nessun token in mappa.', { chiave: 'gruppo' });
  }
  /** Sposta il gruppo di delta Q (trascinamento o frecce): libero, una riga nel registro, un solo Ctrl+Z. */
  function muoviGruppo(delta) {
    const ids = [...st.gruppo];
    const r = spostaGruppo(st.scena, ids, delta, muriEffettivi(st.scena), ctx.dati);
    if (!r.mossi.length) { if (r.fermi.length) avviso('Nessun quadretto libero per il gruppo.', { tipo: 'info', chiave: 'gruppo' }); ridisegna(['sopra']); return; }
    st.scena = r.scena;
    const sc = st.fonti?.scontro ?? null;
    if (sc) scriviRegistro(sc.id, (x) => rigaGruppo(x, { quanti: r.mossi.length, aggiustati: r.aggiustati.length }), 'Riga del registro (spostamento di gruppo)');
    const nomeDi = (id) => { const t = st.scena.token.find((x) => x.id === id); return (t && pezzoDi(t)?.nome) ?? t?.nome ?? id; };
    avviso([`Spostati ${r.mossi.length} token insieme (libero, Ctrl+Z li rimette).`,
      r.aggiustati.length ? `Al quadretto libero più vicino: ${r.aggiustati.map((x) => nomeDi(x.id)).join(', ')}.` : null,
      r.fermi.length ? `Fermi (nessun posto libero): ${r.fermi.map(nomeDi).join(', ')}.` : null], { chiave: 'gruppo', tipo: r.aggiustati.length || r.fermi.length ? 'info' : 'ok' });
    dopoCambioToken();
  }
  /** Contorni dei token selezionati, rettangolo di selezione, sagome del gruppo mentre se ne trascina uno. */
  function disegnaSelezioneGruppo(c) {
    const g = st.scena.griglia;
    const col = ctx.dati.mappa.colori.selezione_gruppo;
    const rett = (q, ingombro, tratteggio) => {
      const [w, h2] = dimensioni(ingombro);
      const a = schermoDaMappa(st.cam, g.scosto_x + q[0] * g.q_px, g.scosto_y + q[1] * g.q_px);
      const b = schermoDaMappa(st.cam, g.scosto_x + (q[0] + w) * g.q_px, g.scosto_y + (q[1] + h2) * g.q_px);
      c.setLineDash(tratteggio);
      c.strokeRect(a.x + 1, a.y + 1, b.x - a.x - 2, b.y - a.y - 2);
    };
    c.save();
    c.strokeStyle = col;
    c.lineWidth = 3;
    const t = st.trascina;
    const delta = t?.modo === 'token' && t.diGruppo && t.q0 ? [t.q[0] - t.q0[0], t.q[1] - t.q0[1]] : null;
    for (const tok of st.scena.token) {
      if (!st.gruppo.has(tok.id)) continue;
      rett(tok.q, tok.ingombro, [6, 4]);
      if (delta && (delta[0] || delta[1]) && tok.id !== t.token) { c.globalAlpha = 0.7; rett([tok.q[0] + delta[0], tok.q[1] + delta[1]], tok.ingombro, [2, 3]); c.globalAlpha = 1; }
    }
    if (t?.modo === 'selezione' && t.mosso) {
      const a = schermoDaMappa(st.cam, t.da.x, t.da.y), b = schermoDaMappa(st.cam, t.a.x, t.a.y);
      c.setLineDash([5, 4]); c.lineWidth = 2;
      c.globalAlpha = 0.15; c.fillStyle = col; c.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      c.globalAlpha = 1; c.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    }
    c.restore();
  }
  /** Quarta modalità accanto a Passo, Corri e Scatta: «Libero» (Maiusc ne è la scorciatoia). */
  const LIBERO = 4;
  function invalidaArea() {
    st.area = undefined;
    st.percorso = null;
    // diretta (07/10): il percorso torna da solo verso il punto sotto il puntatore (le fonti si rileggono ogni secondo:
    // prima il percorso spariva finché il mouse non si muoveva, anche sullo schermo dei giocatori)
    if (st.puntatore && !st.trascina) queueMicrotask(() => { if (!st.chiusa && !st.trascina && st.puntatore && st.scena) aggiornaPercorso(st.puntatore); });
  }
  /** Fascia già raggiunta dal movimento del token in questo Round (o turno): 1 Passo, 2 Corsa, 3 Scatto. */
  function fasciaRaggiunta(id) {
    const t = id ? st.scena?.token.find((x) => x.id === id) : null;
    const mov = t ? pezzoDi(t)?.movimento : null;
    if (!mov) return 1;
    const scontro = st.fonti?.scontro ?? null;
    // A.129: dopo una Corsa o uno Scatto (blocco unico) resta quella fascia; il Passo diviso resta al Passo
    const fatte = fasceNelRound(st.scena, t.id, scontro?.id ?? null, scontro?.round ?? null);
    return Math.max(0, ...fatte.map((f) => FASCE.indexOf(f))) + 1;
  }
  const NOMI_FASCE = { passo: 'Passo', corsa: 'Corsa', scatto: 'Scatto' };
  /**
   * Fasce del token nel Round (A.129, src/mappa/area.js → statoFasce) con i testi per il master: `nonPiu` quando Corsa e
   * Scatto non si possono più scegliere perché il Passo è cominciato, `nota` per il pannello (Passo diviso, Q persi).
   */
  function fasceToken(t, pz, usato) {
    const scontro = st.fonti?.scontro ?? null;
    const fatte = pz.tipo === 'veicolo' && scontro ? [] : fasceNelRound(st.scena, t.id, scontro?.id ?? null, scontro?.round ?? null);
    const sf = statoFasce(pz.movimento, usato, fatte, ctx.dati.mappa.movimento);
    const quando = scontro ? 'in questo Round' : 'in questo turno';
    const escluse = sf.escluse.map((f) => NOMI_FASCE[f]).join(' e ');
    const nonPiu = sf.escluse.length ? `${escluse} non più disponibil${sf.escluse.length > 1 ? 'i' : 'e'}: ${pz.nome} ha già cominciato il Passo (${numero(usato, 1)} Q) ${quando}, e Corsa e Scatto si fanno in un blocco unico. Per correre, «Annulla ultimo movimento» e rifallo con Corri o Scatta.` : null;
    // il blocco chiuso lo dice già il motivo dell'area (Q persi)
    const nota = !sf.chiusa && usato > 0 && sf.rimaste.passo > 0 ? `Passo diviso: restano ${numero(sf.rimaste.passo, 1)} Q, anche dopo l’Azione Principale.` : null;
    return { ...sf, nonPiu, nota };
  }
  /** Record del veicolo nel registro (fonti), o null. */
  const recordVeicolo = (t) => (t.rif.tipo === 'veicolo' ? (st.fonti?.veicoli ?? []).find((r) => r.id === t.rif.id) ?? null : null);
  /**
   * Area del token: { area, rimaste, usato, fino, limite, totale, disponibili, celle, motivo, movimento }. `limite`: Q
   * che restano con la fascia scelta; `totale`: con la fascia più ampia (l'area si calcola fin lì, per riconoscere i
   * clic che chiedono Corsa o Scatto); `disponibili`: Q della fascia scelta, già usati compresi. Senza movimento (segnaposto,
   * scritti a mano, scheda non ancora letta) area null e motivo; il master muove comunque, tenendo premuto Maiusc.
   */
  function infoArea(t) {
    const pz = pezzoDi(t);
    const scontro = st.fonti?.scontro ?? null;
    const base = { area: null, rimaste: null, usato: 0, fino: st.fascia, limite: 0, totale: 0, disponibili: null, celle: null, movimento: pz?.movimento ?? null, motivo: null, libero: false, escluse: [], chiusa: null, nonPiu: null, nota: null };
    // «Libero» (quarta modalità): nessuna area, nessun conteggio; il token va in qualunque quadretto
    if (st.fascia === LIBERO) {
      if (!pz?.movimento) return { ...base, libero: true };
      const u = usatoNelRound(st.scena, t.id, scontro?.id ?? null, scontro?.round ?? null);
      const sf = fasceToken(t, pz, u);
      return { ...base, libero: true, usato: u, rimaste: sf.rimaste, escluse: sf.escluse, chiusa: sf.chiusa, nonPiu: sf.nonPiu, nota: sf.nota };
    }
    if (!pz?.movimento) return { ...base, motivo: pz ? 'nessun profilo di movimento' : 'fuori dallo scontro' };
    let usato = usatoNelRound(st.scena, t.id, scontro?.id ?? null, scontro?.round ?? null);
    // veicoli (A.105; ritocchi del 08/10): con lo scontro aperto e un conducente nello scontro l'area c'è sempre, anche
    // fuori dal suo turno (il master lo muove come un token), una volta per Round; altrimenti il motivo, mai un silenzio
    let notaVeicolo = null;
    if (pz.tipo === 'veicolo') {
      const rec = recordVeicolo(t);
      const sv = rec && scontro ? statoMovimento(rec, scontro, diTurno(scontro), { fuoriTurno: true, dati: ctx.dati }) : null;
      const mosso = scontro ? mossoNelRound(st.scena, t.id, scontro.id, scontro.round) || !!sv?.mosso : false;
      const f = veicoloFermo(rec, scontro, sv ? { ...sv, mosso, motivo: mosso ? `già mosso nel Round ${scontro.round}` : sv.motivo } : null);
      if (rec && f.motivo) return { ...base, usato: mosso ? pz.movimento.passo : 0, motivo: f.motivo, fermoAndatura: !!f.andatura };
      notaVeicolo = f.nota;
      usato = 0;
    }
    // A.129: il Passo si divide; Corsa e Scatto sono un blocco unico (i Q non usati si perdono)
    const sf = fasceToken(t, pz, usato);
    const rimaste = sf.rimaste;
    // fino alla fascia scelta (Passo, Corri, Scatta), o alla migliore disponibile sotto di essa
    const disponibili = FASCE.slice(0, st.fascia).filter((f) => rimaste[f] !== null);
    const limite = disponibili.length ? Math.max(...disponibili.map((f) => rimaste[f])) : 0;
    const tutte = FASCE.filter((f) => rimaste[f] !== null);
    const totale = tutte.length ? Math.max(...tutte.map((f) => rimaste[f])) : 0;
    // A.129: fin dove arriverebbero Corsa e Scatto esclusi, per riconoscere i clic che li chiedono (avviso, non «lascia»)
    const portata = sf.escluse.length ? Math.max(...sf.escluse.map((f) => pz.movimento[f])) : 0;
    const scelta = sf.chiusa ?? [...FASCE.slice(0, st.fascia)].reverse().find((f) => rimaste[f] !== null);
    const g = st.scena.griglia;
    const area = areaRaggiungibile({
      colonne: g.colonne, righe: g.righe, muri: muriEffettivi(st.scena), terreno: daBase64(st.scena.terreno),
      token: st.scena.token.map((x) => ({ id: x.id, q: x.q, ingombro: x.ingombro, lato: pezzoDi(x)?.lato ?? null })),
      chi: { id: t.id, q: t.q, ingombro: t.ingombro, lato: pz.lato }, massimo: Math.max(totale, portata), regole: ctx.dati.mappa.movimento,
    });
    const quando = scontro ? 'del Round' : 'del turno';
    const piuAmpie = FASCE.slice(st.fascia).filter((f) => rimaste[f] > 0).map((f) => (f === 'corsa' ? 'Corri' : 'Scatta'));
    const motivo = sf.chiusa ? `${NOMI_FASCE[sf.chiusa]} fatta in un blocco unico: movimento ${quando} finito${sf.persi ? ` (${numero(sf.persi, 1)} Q non usati persi)` : ''}`
      : limite > 0 ? null : !usato ? 'movimento 0 Q'
      : piuAmpie.length ? `${st.fascia === 1 ? 'Passo' : 'Corsa'} finito: scegli ${piuAmpie.join(' o ')}` : `movimento ${quando} finito (${numero(usato, 1)} Q)`;
    return { ...base, area, rimaste, usato, limite, totale, disponibili: scelta ? pz.movimento[scelta] : null, celle: celleArea(area, rimaste, st.fascia), motivo, escluse: sf.escluse, chiusa: sf.chiusa, nonPiu: sf.nonPiu, nota: [notaVeicolo, sf.nota].filter(Boolean).join(' ') || null, portata };
  }
  /** Area del token scelto, calcolata una volta finché non cambia qualcosa (invalidaArea). */
  function areaScelta() {
    if (st.area !== undefined) return st.area;
    const t = st.selezionato && !disegnoAttivo() ? st.scena.token.find((x) => x.id === st.selezionato) : null;
    st.area = t ? { token: t.id, ...infoArea(t) } : null;
    return st.area;
  }
  /** Passi del percorso dentro una ZoC degli avversari del token che si muove (null con «Mostra ZoC» spento). */
  function zocDelPercorso(per) {
    const id = st.trascina?.modo === 'token' ? st.trascina.token : st.selezionato;
    if (!st.mostraZoc || !id || !per?.punti?.length) return null;
    return passiInZoc(per.punti, per.ingombro, avversariZoc(st.scena, st.pezzi, id, ctx.dati));
  }
  /** «Mostra PV sui token»: interruttore ricordato (localStorage); vale solo per la vista master. */
  function cambiaMostraPv(v = !st.mostraPv) {
    st.mostraPv = v;
    scriviLocale('mutant-mappa-mostra-pv', v);
    aggiornaVoceMostraPv();
    disegnaIniziativa();
    avviso(v ? 'PV mostrati sui token (P per nasconderli).' : 'PV nascosti sui token (P per mostrarli); i giocatori vedono comunque quelli dei PG.', { chiave: 'mostra-pv' });
    ridisegna(['sopra']);
  }
  function aggiornaVoceMostraPv() {
    el.voceMostraPv.setAttribute('aria-checked', String(st.mostraPv));
    el.voceMostraPv.textContent = `${st.mostraPv ? '✓ ' : ''}Mostra PV sui token (P)`;
  }
  /** PV dei nemici nella vista giocatori: scelta del master salvata nella scena, predefinito nascosto. */
  // ── Diretta del movimento per la vista giocatori (07/10, src/mappa/diretta.js) ──
  // A ogni ridisegno si confronta una chiave dello stato (token scelto, fascia, area, percorso, interruttori); se cambia,
  // lo stato nuovo va al server (PUT /api/vista-giocatori/diretta), con al più una richiesta in volo: quelle intermedie
  // si saltano, l'ultima arriva sempre. Il server lo filtra e lo spinge ai giocatori; nulla si salva nella scena.
  const idOggetti = new WeakMap();
  let ultimoId = 0;
  const idDi = (o) => { if (!o || typeof o !== 'object') return 0; if (!idOggetti.has(o)) idOggetti.set(o, ++ultimoId); return idOggetti.get(o); };
  function programmaDiretta() {
    // solo a pagina pronta (durante l'avvio alcune funzioni non sono ancora definite)
    if (st.chiusa || !st.diretta.pronta) return;
    const s = st.scena;
    const id = st.trascina?.modo === 'token' ? st.trascina.token : st.selezionato;
    // fase 2, lotto 1: l'anteprima del template che si piazza (non quello nascosto ai giocatori), anche senza token
    const anteprima = st.tpl?.anteprima && !st.tpl.anteprima.nascosto ? st.tpl.anteprima : null;
    const attiva = !!s && s.movimentoGiocatori !== false && !!id && !disegnoAttivo() && !st.tpl?.anteprima;
    if (attiva && !st.trascina) areaScelta();
    // fase 2, lotto 3: la linea di tiro, filtrata dal server come il percorso
    const lin = lineaPerDiretta();
    const chiave = attiva || anteprima || lin ? JSON.stringify([idDi(s), attiva ? id : null, st.fascia, s.zocGiocatori, idDi(st.area), idDi(st.pezzi), st.percorso?.punti?.at(-1) ?? null, st.trascina?.info ? idDi(st.trascina.info) : 0, idDi(anteprima), lin]) : 'nessuna';
    if (chiave === st.diretta.chiave) return;
    st.diretta.chiave = chiave;
    let stato = null;
    try { stato = attiva ? costruisciDiretta(id) : null; } catch { stato = null; }
    if (anteprima) stato = stato ? { ...stato, template: [anteprima] } : statoDiretta({ scena: s, template: [anteprima] });
    if (lin) stato = stato ? { ...stato, linea: lin } : statoDiretta({ scena: s, linea: lin });
    // lo stesso stato (a parte l'istante) non si rimanda: le fonti si rileggono ogni secondo
    const testo = JSON.stringify(stato && { ...stato, quando: 0 });
    if (testo === st.diretta.testo) return;
    st.diretta.testo = testo;
    mandaDiretta(stato);
  }
  /** Lo stato della diretta per il token `id`: area e percorso senza gli ostacoli che i giocatori non vedono. */
  function costruisciDiretta(id) {
    const s = st.scena;
    const t = s.token.find((x) => x.id === id);
    if (!t) return null;
    const info = st.trascina?.modo === 'token' && st.trascina.token === id && st.trascina.info ? st.trascina.info : areaScelta();
    if (!info) return null;
    const modo = info.libero ? 'libero' : FASCE[st.fascia - 1] ?? 'passo';
    let celle = null;
    let per = null;
    if (info.area && !info.libero) {
      // l'area dei giocatori: gli stessi muri e terreno, ma solo i token che vedono (un buco non rivela un nascosto)
      if (st.diretta.areaG?.per !== info.area) {
        const nebbia = daBase64(s.nebbia.coperti);
        const g = s.griglia;
        const pz = pezzoDi(t);
        const areaG = areaRaggiungibile({
          colonne: g.colonne, righe: g.righe, muri: muriEffettivi(s, { perGiocatori: true }), terreno: daBase64(s.terreno),
          token: s.token.filter((x) => x.id === t.id || visibileAiGiocatori(x, s, nebbia)).map((x) => ({ id: x.id, q: x.q, ingombro: x.ingombro, lato: pezzoDi(x)?.lato ?? null })),
          chi: { id: t.id, q: t.q, ingombro: t.ingombro, lato: pz?.lato ?? null }, massimo: info.totale, regole: ctx.dati.mappa.movimento,
        });
        st.diretta.areaG = { per: info.area, area: areaG, celle: celleArea(areaG, info.rimaste, st.fascia), fascia: st.fascia };
      }
      if (st.diretta.areaG.fascia !== st.fascia) st.diretta.areaG = { ...st.diretta.areaG, celle: celleArea(st.diretta.areaG.area, info.rimaste, st.fascia), fascia: st.fascia };
      celle = st.diretta.areaG.celle;
      const fine = st.percorso?.punti?.at(-1);
      const costo = fine ? costoVerso(st.diretta.areaG.area, fine) : Infinity;
      if (fine && costo < Infinity && costo > 0) per = { punti: percorso(st.diretta.areaG.area, fine), costo, fascia: fasciaDi(costo, info.rimaste) };
    }
    const zoc = s.zocGiocatori === false ? null : avversariZoc(s, st.pezzi, id, ctx.dati, { perGiocatori: true });
    return statoDiretta({ scena: s, token: t, modo, usato: info.usato ?? 0, disponibili: info.disponibili ?? null, celle, percorso: per, zoc });
  }
  function mandaDiretta(stato) {
    if (st.diretta.inVolo) { st.diretta.prossimo = stato; return; }
    st.diretta.inVolo = true;
    fetch('api/vista-giocatori/diretta', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stato), keepalive: stato === null })
      .catch(() => { /* senza server o collegamento perso: la vista giocatori resta senza diretta */ })
      .finally(() => {
        st.diretta.inVolo = false;
        if (st.diretta.prossimo !== undefined) { const p = st.diretta.prossimo; st.diretta.prossimo = undefined; mandaDiretta(p); }
      });
  }
  /** «Movimento ai giocatori» e «ZoC ai giocatori» (sezione «Vista giocatori»): accesi se non spenti, salvati nella scena. */
  function cambiaDirettaGiocatori(campo) {
    if (!st.scena) return;
    const v = st.scena[campo] === false;
    st.scena = { ...st.scena, [campo]: v };
    salvaPresto();
    disegnaPannelloGiocatori();
    programmaDiretta();
    avviso(campo === 'movimentoGiocatori'
      ? (v ? 'I giocatori vedono il movimento del token scelto: area, percorso e Q usati.' : 'I giocatori non vedono più il movimento.')
      : (v ? 'I giocatori vedono le ZoC degli avversari del token scelto.' : 'I giocatori non vedono più le ZoC.'));
  }
  function cambiaPvNemiciGiocatori() {
    if (!st.scena) return;
    const v = !st.scena.pvNemiciGiocatori;
    st.scena = { ...st.scena, pvNemiciGiocatori: v };
    salvaPresto();
    disegnaPannelloGiocatori();
    avviso(v ? 'I giocatori vedono i PV dei nemici.' : 'I giocatori non vedono i PV dei nemici.');
  }
  // ── Template ad area (fase 2, lotto 1; §10 della specifica; src/mappa/template.js) ──
  const RT = ctx.dati.mappa.template;
  const celleDi = new WeakMap();
  /** Q coperti dal template (calcolati una volta per oggetto: i template cambiano solo sostituendoli). */
  const celleTpl = (t) => { if (!celleDi.has(t)) celleDi.set(t, celleTemplate(t, st.scena.griglia, RT)); return celleDi.get(t); };
  const roundAttuale = () => st.fonti?.scontro?.round ?? null;
  const nomeToken = (k) => pezzoDi(k)?.nome ?? k.nome ?? k.id;
  /** Chi è dentro il template: i nomi (per «Colpito» sulla plancia; nessun tiro automatico). */
  const dentroTpl = (t) => tokenNelTemplate(t, st.scena, RT, celleTpl(t)).map(nomeToken);
  function disegnaTemplateScena(c, info) {
    const s = st.scena;
    for (const t of templateVisibili(s.template, sovrapposizioni('master'))) {
      if (t.id === st.tpl.sposta) continue;
      disegnaTemplate(c, { scena: s, cam: st.cam, info, celle: celleTpl(t), colore: t.colore ?? RT.colori[0].valore, stile: RT, etichetta: `${etichettaTemplate(t, RT, roundAttuale())}${t.nascosto ? ' (nascosto)' : ''}`, origine: t.origine });
    }
    const a = st.tpl.anteprima;
    if (a) disegnaTemplate(c, { scena: s, cam: st.cam, info, celle: celleTpl(a), colore: a.colore, stile: RT, etichetta: a.nome || testoMisure(a, RT), origine: a.origine, anteprima: true });
  }
  /** Mini-menu, poi il piazzamento; `origine`: il Q del clic destro (l'anteprima parte da lì). */
  async function nuovoTemplateUi(origine = null) {
    if (!st.scena) return;
    const b = await apriMenuTemplate({ regole: RT, bozza: st.tpl.bozza });
    if (!b || !st.scena) return;
    st.tpl.bozza = b;
    scriviLocale('mutant-mappa-template', b);
    iniziaPiazzamento({ ...b, id: `tpl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}` }, origine);
  }
  function iniziaPiazzamento(base, origine = null, sposta = null) {
    const g = st.scena.griglia;
    const o = origine ?? [Math.floor(g.colonne / 2), Math.floor(g.righe / 2)];
    st.tpl.sposta = sposta;
    st.tpl.direzioneFissa = !!sposta; // spostando un template fissato la sua direzione resta (si cambia con le frecce)
    st.tpl.anteprima = { ...base, origine: o, ...(ORIENTABILI.includes(base.forma) ? { direzione: base.direzione ?? 0 } : {}) };
    el.riquadro.classList.add('piazza-template');
    avviso(ORIENTABILI.includes(base.forma)
      ? 'Template: con un token scelto parte da lui e si orienta verso il mouse; senza, segue il mouse. ← → ruotano di 45° (anche la rotella, di 15°), ↑ ↓ cambiano la misura. Clic per fissarlo, Esc per annullare.'
      : `Template: segue il mouse. ${base.forma === 'rettangolo' ? '← → lo girano di 90°, ' : ''}↑ ↓ cambiano la misura. Clic per fissarlo, Esc per annullare.`, { tipo: 'info', chiave: 'template', durata: 8000 });
    ridisegna(['aree']);
  }
  /** L'anteprima segue il punto m della mappa: cono e linea dal token scelto verso m, le altre forme su m. */
  function aggiornaAnteprima(m) {
    const a = st.tpl.anteprima;
    if (!a) return;
    const g = st.scena.griglia;
    const verso = [(m.x - g.scosto_x) / g.q_px, (m.y - g.scosto_y) / g.q_px];
    const tok = ORIENTABILI.includes(a.forma) && !st.tpl.sposta && st.selezionato ? st.scena.token.find((x) => x.id === st.selezionato) : null;
    let nuovo;
    if (tok) {
      const [w, hh] = Array.isArray(tok.ingombro) ? tok.ingombro : [tok.ingombro ?? 1, tok.ingombro ?? 1];
      const origine = [tok.q[0] + Math.floor((w - 1) / 2), tok.q[1] + Math.floor((hh - 1) / 2)];
      nuovo = { ...a, origine, direzione: st.tpl.direzioneFissa ? a.direzione : direzioneVerso(origine, verso) };
    } else nuovo = { ...a, origine: qVicino(m) };
    st.tpl.ancorato = !!tok;
    if (nuovo.origine[0] === a.origine[0] && nuovo.origine[1] === a.origine[1] && nuovo.direzione === a.direzione) return;
    st.tpl.anteprima = nuovo;
    ridisegna(['aree']);
  }
  /** Rotella durante il piazzamento di un cono o di una linea non ancorati: ruota di 15° (niente zoom). */
  const suRotellaTemplate = (e) => {
    const a = st.tpl.anteprima;
    if (!a || !ORIENTABILI.includes(a.forma) || st.tpl.ancorato) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    st.tpl.anteprima = { ...a, direzione: (((a.direzione ?? 0) + (e.deltaY > 0 ? 15 : -15)) % 360 + 360) % 360 };
    ridisegna(['aree']);
  };
  el.riquadro.addEventListener('wheel', suRotellaTemplate, { capture: true, passive: false });
  /**
   * Frecce durante il piazzamento (ritocchi del 07/10): ← → ruotano cono e linea di 45° (partendo dalla direzione di
   * quel momento, anche verso il mouse da un token scelto, che poi resta fissa) e il rettangolo di 90°; ↑ ↓ cambiano la
   * misura fra quelle proposte. Restituisce true se ha usato il tasto.
   */
  function frecciaTemplate(e) {
    const a = st.tpl.anteprima;
    if (!a || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return false;
    e.preventDefault();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (!ORIENTABILI.includes(a.forma) && a.forma !== 'rettangolo') { avviso(`${RT.nomi_forme[a.forma]}: non ha un verso da girare (↑ ↓ cambiano la misura).`, { chiave: 'template' }); return true; }
      st.tpl.anteprima = ruota(a, e.key === 'ArrowRight' ? 1 : -1);
      if (ORIENTABILI.includes(a.forma)) st.tpl.direzioneFissa = true;
    } else st.tpl.anteprima = cambiaMisura(a, e.key === 'ArrowUp' ? 1 : -1, RT);
    avviso(`${st.tpl.anteprima.nome || testoMisure(st.tpl.anteprima, RT)}${ORIENTABILI.includes(a.forma) ? ` · ${st.tpl.anteprima.direzione}°` : ''}`, { chiave: 'template', durata: 2500 });
    ridisegna(['aree']);
    return true;
  }
  function annullaPiazzamento() {
    st.tpl.anteprima = null;
    st.tpl.sposta = null;
    el.riquadro.classList.remove('piazza-template');
    avviso('Template annullato.', { tipo: 'info', chiave: 'template' });
    ridisegna(['aree']);
  }
  /** Clic: il template si fissa (nuovo o spostato), si salva con la scena e l'avviso dice chi c'è dentro. */
  function fissaTemplate() {
    const a = st.tpl.anteprima;
    if (!a) return;
    const scontro = st.fonti?.scontro ?? null;
    const prima = st.tpl.sposta ? st.scena.template.find((t) => t.id === st.tpl.sposta) ?? null : null;
    const t = prima ? { ...prima, origine: [...a.origine], misure: { ...a.misure }, ...(ORIENTABILI.includes(a.forma) ? { direzione: a.direzione } : {}) }
      : nuovoTemplate({ id: a.id, forma: a.forma, misure: a.misure, origine: a.origine, direzione: a.direzione ?? 0, colore: a.colore, nome: a.nome, durata: a.durata, round: scontro?.round ?? null, nascosto: a.nascosto, scontro: scontro?.id ?? null });
    st.scena = cambiaTemplateAnnullabile(st.scena, prima, t, ctx.dati);
    st.tpl.anteprima = null;
    st.tpl.sposta = null;
    el.riquadro.classList.remove('piazza-template');
    const dentro = dentroTpl(t);
    avviso([`${t.nome || testoMisure(t, RT)}${prima ? ' spostato' : ''}: ${dentro.length ? `dentro ${dentro.join(', ')}` : 'nessun token dentro'}.`,
      dentro.length ? 'Il danno si applica dalla plancia («Colpito»): nessun tiro automatico.' : null], { tipo: 'info', chiave: 'template', durata: 12000 });
    dopoTemplate();
  }
  function dopoTemplate() {
    salvaPresto();
    disegnaPannelloTemplate();
    ridisegna(['aree']);
  }
  function cambiaTemplate(id, fn) {
    const prima = st.scena.template.find((t) => t.id === id);
    if (!prima) return;
    st.scena = cambiaTemplateAnnullabile(st.scena, prima, fn(prima), ctx.dati);
    dopoTemplate();
  }
  const togliTemplate = (id) => cambiaTemplate(id, () => null);
  const nascondiTemplate = (id) => cambiaTemplate(id, (t) => ({ ...t, nascosto: !t.nascosto }));
  function spostaTemplate(id) {
    const t = st.scena.template.find((x) => x.id === id);
    if (t) iniziaPiazzamento(t, t.origine, id);
  }
  /** Con il Round dello scontro (Magia, «Scadenze e interruzione degli effetti»): fino alla fine del Round R + N. */
  function scadiTemplate() {
    const sc = st.fonti?.scontro;
    if (!sc || !st.scena) return;
    // «Indietro» oltre il cambio di Round (07/10): i template scaduti dopo il Round attuale tornano
    const r = rimettiScaduti(st.scena, sc.id, sc.round);
    if (r.rimessi.length) {
      st.scena = r.scena;
      st.tpl.firma = null;
      salvaPresto();
      avviso(`Round ${sc.round} di nuovo: torna${r.rimessi.length > 1 ? 'no' : ''} ${r.rimessi.map((t) => t.nome || testoMisure(t, RT)).join(', ')}.`, { tipo: 'info', chiave: 'template-rimessi', durata: 8000 });
    }
    const via = st.scena.template.filter((t) => t.scontro === sc.id && scaduto(t, sc.round));
    if (!via.length) return;
    st.scena = scadiTemplateAnnullabile(st.scena, (t) => via.includes(t), { scontro: sc.id, round: sc.round }, ctx.dati).scena;
    salvaPresto();
    avviso(`Template scadut${via.length > 1 ? 'i' : 'o'}: ${via.map((t) => `${t.nome || testoMisure(t, RT)} (fine del Round ${t.fine_round})`).join(', ')}.`, { tipo: 'info', durata: 10000 });
  }
  function disegnaPannelloTemplate() {
    if (!st.scena) return;
    const voci = st.scena.template.map((t) => ({ t, dentro: dentroTpl(t) }));
    const firma = JSON.stringify([voci, roundAttuale()]);
    if (firma === st.tpl.firma) return;
    st.tpl.firma = firma;
    svuota(el.pTemplate, ...sezioneTemplate(voci, RT, { nuovo: () => nuovoTemplateUi(), cancellaTemporanei: () => cancellaTemplate({ tutti: false }), sposta: spostaTemplate, nascondi: nascondiTemplate, togli: togliTemplate, round: roundAttuale() }));
  }
  // ── Linea di tiro e visuale (fase 2, lotto 3; src/mappa/visuale.js; Giocatore §5.8, §5.10, §5.11) ──
  const RV = ctx.dati.mappa.visuale;
  const NOMI_COPERTURA = { nessuna: 'nessuna Copertura', leggera: 'Copertura Leggera', media: 'Copertura Media', totale: 'Copertura Totale' };
  st.linea = null;
  function iniziaLinea(id) {
    const tok = id ? st.scena.token.find((x) => x.id === id) : null;
    if (!tok) { avviso('Scegli prima il token che tira (clic sul token), poi L.', { chiave: 'linea' }); return; }
    if (st.selezionato !== id) scegli(id);
    st.linea = { da: id, a: null, punto: null, fissa: false };
    el.riquadro.classList.add('linea-tiro');
    avviso('Linea di tiro: muovi il mouse su un token o un quadretto; clic per fissarla. Esc (o L) per chiuderla.', { tipo: 'info', chiave: 'linea' });
    ridisegna(['sopra']);
  }
  function chiudiLinea() {
    st.linea = null;
    el.riquadro.classList.remove('linea-tiro');
    ridisegna(['sopra']);
  }
  /** Il bersaglio della linea sotto il punto m: un token (non chi tira) o il Q. */
  function bersaglioIn(m) {
    const t = tokenSotto(m);
    return t && t.id !== st.linea.da ? { a: t.id, punto: null } : { a: null, punto: qVicino(m) };
  }
  function aggiornaLinea(m) {
    const b = bersaglioIn(m);
    if (b.a === st.linea.a && b.punto?.join() === st.linea.punto?.join()) return;
    st.linea = { ...st.linea, ...b };
    ridisegna(['sopra']);
  }
  /** Calcolo della linea (cache per bersaglio e scena). */
  const cacheLinea = { chiave: null, valore: null };
  function calcolaLinea() {
    const l = st.linea;
    const da = l ? st.scena.token.find((x) => x.id === l.da) : null;
    const a = l?.a ? st.scena.token.find((x) => x.id === l.a) : null;
    if (!da || (!a && !l.punto)) return null;
    const chiave = JSON.stringify([idDi(st.scena), l.da, l.a, l.punto]);
    if (cacheLinea.chiave === chiave) return cacheLinea.valore;
    const r = lineaDiTiro(st.scena, da, a ?? l.punto, ostacoliVista(st.scena, RP), RV, { contaToken: contaInLinea });
    cacheLinea.chiave = chiave;
    cacheLinea.valore = { ...r, da, a: a ?? { q: l.punto, ingombro: 1 } };
    return cacheLinea.valore;
  }
  /**
   * 07/10 (A.141, A.144): i token che contano nella linea di tiro (in mezzo o come ostacolo): non quelli a 0 PV o A Terra
   * (sotto la linea); per i giocatori nemmeno i nascosti.
   */
  function contaInLinea(t) {
    const p = pezzoDi(t);
    return !p?.aZero && !(p?.stati ?? []).some((x) => (x?.id ?? x) === 'a-terra');
  }
  const testoLinea = (r) => `${r.distanza} Q · ${testoCopertura(r)}${r.protetto ? ' · protetto' : ''}`;
  function disegnaLineaScelta(c) {
    if (!st.linea || !st.scena) return;
    const r = calcolaLinea();
    if (!r) return;
    disegnaLineaTiro(c, { scena: st.scena, cam: st.cam, da: r.da, a: r.a, copertura: r.copertura, etichetta: `${testoLinea(r)}${st.dettaglioLinea ? ` · ${r.bloccate}/5 bloccate` : ''}`, colori: RV.colori, linee: st.dettaglioLinea ? r.linee : null, origine: r.origine });
  }
  /** «Mostra dettaglio linea di tiro» (07/10): interruttore del master, ricordato su questo schermo. */
  function testoDettaglioLinea() { return `Mostra dettaglio linea di tiro: ${st.dettaglioLinea ? 'sì' : 'no'}`; }
  function cambiaDettaglioLinea(v = !st.dettaglioLinea) {
    st.dettaglioLinea = v;
    scriviLocale('mutant-mappa-dettaglio-linea', v);
    if (el.strumenti?.open) disegnaMenuStrumenti();
    avviso(v ? 'Dettaglio della linea di tiro: le cinque linee di controllo dal centro di chi tira (solo qui).' : 'Dettaglio della linea di tiro nascosto: resta la linea principale.', { chiave: 'linea', tipo: 'info', durata: 3000 });
    ridisegna(['sopra']);
  }
  /** La linea per la vista giocatori (il server la filtra con le regole dei segreti). */
  function lineaPerDiretta() {
    if (!st.linea || !st.scena) return null;
    const r = calcolaLinea();
    if (!r) return null;
    // 07/10: per i giocatori la linea si ricalcola con quello che vedono: porte segrete come muro, niente token nascosti
    // (né come ostacolo né in mezzo), così la Copertura non tradisce un token che non vedono
    const g = lineaDiTiro(st.scena, r.da, r.a.id ? r.a : r.a.q, ostacoliVista(st.scena, RP, { perGiocatori: true }), RV, { contaToken: (t) => !t.nascosto && contaInLinea(t) });
    return { da: st.linea.da, a: st.linea.a, punto: st.linea.a ? null : st.linea.punto, distanza: g.distanza, copertura: g.copertura, vista: g.vista, testo: `${g.distanza} Q · ${testoCopertura(g)}${g.protetto ? ' · protetto' : ''}` };
  }
  /** Clic con la linea attiva: fissa il bersaglio e dice distanza, gittata, vista, Copertura; «Attacca!» con quei valori. */
  function fissaLinea(m) {
    const t = tokenSotto(m);
    if (t && t.id === st.linea.da) { chiudiLinea(); return; }
    st.linea = { ...st.linea, ...bersaglioIn(m), fissa: true };
    ridisegna(['sopra']);
    const r = calcolaLinea();
    if (!r) return;
    const veicoloDa = r.da;
    // fase 2, lotto 5: chi è a bordo tira dal veicolo (linea dal mezzo, attaccante il passeggero)
    const passeggero = st.linea.passeggero ? aBordo(veicoloDa).find((x) => x.id === st.linea.passeggero) ?? null : null;
    const daTok = passeggero ?? r.da, aTok = st.linea.a ? st.scena.token.find((x) => x.id === st.linea.a) : null;
    const nomeDa = `${pezzoDi(daTok)?.nome ?? daTok.nome ?? daTok.id}${passeggero ? ` (da ${nomeTok(veicoloDa)})` : ''}`;
    const nomeA = aTok ? pezzoDi(aTok)?.nome ?? aTok.nome ?? aTok.id : `il quadretto (${st.linea.punto.join(', ')})`;
    const gittata = fasciaDistanza(r.distanza, ctx.dati).va;
    const pen = { leggera: ctx.dati.regole.attacco_distanza.copertura.bersaglio.leggera, media: ctx.dati.regole.attacco_distanza.copertura.bersaglio.media }[r.copertura];
    const righe = [
      `${nomeDa} → ${nomeA}: ${r.distanza} Q (gittata ${gittata ? `${gittata} VA` : '0'}), vista ${r.vista}, ${testoCopertura(r)}${pen ? ` (${pen} VA)` : ''}.`,
      r.copertura === 'totale' ? 'Il bersaglio non può essere attaccato direttamente (§5.8).' : null,
      // 07/10: token in mezzo (Giocatore §5.10, A.141, A.144): «bersaglio impegnato o protetto» proposto in «Attacca!»
      r.protetto ? `In mezzo: ${r.inMezzo.map((x) => pezzoDi(x)?.nome ?? x.nome ?? x.id).join(', ')}: bersaglio protetto (§5.10), −4 VA; se il tiro fallisce, seconda Prova a −4: con successo manca tutti, altrimenti colpisce chi sta in mezzo. Proposto in «Attacca!».` : null,
      r.causa?.token?.length ? `Copertura data da: ${r.causa.token.map((x) => pezzoDi(x)?.nome ?? x.nome ?? x.id).join(', ')}${r.causa.muro ? ' e da muri o porte' : ''}.` : null,
      'Regola della Copertura sulla griglia provvisoria (A.140).',
    ];
    const azioni = [];
    // fase 2, lotto 4: la luce della zona del bersaglio, proposta in «Attacca!» (modificabile), con la sua riga
    const luceB = luceIngombro(st.scena, aTok ?? { q: st.linea.punto, ingombro: 1 }, ctx.dati);
    const rigaLuce = testoLuceBersaglio(luceB, ctx.dati);
    if (rigaLuce) righe.splice(1, 0, `Luce: ${rigaLuce}.`);
    const preset = { distanza: r.distanza, bersaglio: { copertura: r.copertura, distanza: r.distanza, ...(r.protetto ? { impegnato: true } : {}) }, luce: luceB, ...(rigaLuce ? { luceMappa: rigaLuce } : {}) };
    if (aTok && r.copertura !== 'totale') {
      const pzDa = pezzoDi(daTok);
      const idDa = daTok.rif?.id, idA = aTok.rif?.id;
      if (st.fonti?.scontro && st.planciaBarra?.puoAttaccare?.(idDa)) azioni.push({ testo: `Attacca! (${nomeDa} → ${nomeA})`, fai: () => st.planciaBarra.attaccaContro(idDa, idA, preset) });
      else if (pzDa?.tipo === 'pg' && recordPg(pzDa)) azioni.push({ testo: `Apri la scheda di ${nomeDa} per «Attacca!»`, fai: () => {
        try { sessionStorage.setItem(CHIAVE_DALLA_MAPPA, JSON.stringify({ nome: pzDa.nome, distanza: r.distanza, copertura: r.copertura, protetto: r.protetto, bersaglio: nomeA, bersaglioId: idA ?? null, luce: luceB, luceMappa: rigaLuce, quando: Date.now() })); } catch { /* senza: valori a mano */ }
        apriSchedaToken(daTok);
      } });
    }
    avviso(righe, { tipo: 'info', chiave: 'linea', durata: 20000, azioni });
  }
  // ── Nebbia automatica (fase 2, lotto 3): la nebbia si apre dove i PG vedono; prossimo lotto: le luci ──
  function aggiornaVisuale() {
    const s = st.scena;
    if (!s?.visuale?.automatica) return;
    const g = s.griglia;
    const visti = visualePg(s, tokenPg(s), ostacoliVista(s, RP, { perGiocatori: true }), RV, null, ctx.dati.mappa);
    const m = nebbiaDopoVisuale(s.nebbia.coperti, visti, g.colonne, g.righe);
    if (!m) return;
    st.scena = { ...s, nebbia: { ...s.nebbia, coperti: inBase64(m) } };
    salvaPresto();
    disegnaPannelloNebbia();
    ridisegna(['aree']);
  }
  /** «Suoni anche nella vista giocatori» (07/10): un'opzione della scena, che la vista giocatori legge. */
  function cambiaAudioGiocatori() {
    if (!st.scena) return;
    const v = !st.scena.audio?.giocatori;
    st.scena = { ...st.scena, audio: { giocatori: v } };
    salvaPresto();
    aggiornaVoceNebbiaAutomatica();
    avviso(v ? 'Suoni anche nella vista giocatori: sullo schermo dei giocatori serve un clic per sbloccare l’audio (lo chiede un avviso).' : 'Suoni solo su questo PC.', { chiave: 'audio-giocatori', tipo: 'info' });
  }
  function aggiornaVoceNebbiaAutomatica() {
    if (el.strumenti?.open) disegnaMenuStrumenti();
  }
  function cambiaVisualeAutomatica() {
    if (!st.scena) return;
    const v = !st.scena.visuale?.automatica;
    st.scena = { ...st.scena, visuale: { automatica: v } };
    salvaPresto();
    disegnaPannelloNebbia();
    const g = st.scena.griglia;
    const prima = conta(daBase64(st.scena.nebbia.coperti), g.colonne, g.righe);
    if (v) aggiornaVisuale();
    const dopo = conta(daBase64(st.scena.nebbia.coperti), g.colonne, g.righe);
    // 07/10: con la scena tutta in Luce i PG vedono fino a 30 Q e la nebbia si apre quasi tutta subito: lo si dice
    const quasiTutta = v && prima > 0 && dopo < prima * 0.1;
    avviso(v ? ['Nebbia automatica accesa: si apre dove i PG vedono quando si spostano; per i giocatori le zone esplorate restano più scure.', prima ? `Aperti ora ${prima - dopo} Q su ${prima} coperti.` : 'La mappa è già tutta scoperta: «Copri tutto» per ripartire.', quasiTutta ? 'In Luce i PG vedono fino a 30 Q: per una scena da esplorare metti Penombra o Buio (Strumenti → Luci).' : null] : 'Nebbia automatica spenta: la nebbia la muovi solo tu.', { chiave: 'visuale', tipo: 'info', durata: 9000 });
    aggiornaVoceNebbiaAutomatica();
  }
  // ── Porte (fase 2, lotto 2; A.125; src/mappa/porte.js) ──
  const RP = ctx.dati.mappa.porte;
  const AVVISO_BLOCCATA = 'Porta bloccata: serve sbloccarla, scassinarla o forzarla.';
  function dopoPorta() {
    aggiornaVisuale();
    invalidaArea();
    salvaPresto();
    disegnaPannelli();
    ridisegna(['aree', 'sopra']);
  }
  /** Strumento «Porta»: clic su un Q mette una porta (stato e segreta dal pannello) o toglie quella che c'è. */
  function mettiTogliPorta(q) {
    const c = portaA(st.scena, q);
    if (c) { st.scena = cambiaPortaAnnullabile(st.scena, c, null, ctx.dati); avviso('Porta tolta.', { chiave: 'porta' }); dopoPorta(); return; }
    if ((st.scena.porte?.length ?? 0) >= RP.porte_max) { avvisoErrore(`Al massimo ${RP.porte_max} porte.`); return; }
    // 07/10: l'orientamento si salva (automatico dai muri, o quello scelto con ← →)
    const p = nuovaPorta({ id: `porta-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, q, stato: M.porta.stato, segreta: M.porta.segreta, orientamento: M.porta.verso ?? orientamento(st.scena, q) });
    st.scena = cambiaPortaAnnullabile({ ...st.scena, porte: st.scena.porte ?? [] }, null, p, ctx.dati);
    avviso(`Porta ${RP.nomi_stati[p.stato].toLowerCase()}${p.segreta ? ', segreta' : ''}.`, { chiave: 'porta' });
    dopoPorta();
  }
  /** Anteprima della porta nuova sotto il puntatore (strumento «Porta»): { q, stato, segreta, orientamento } o null. */
  function anteprimaPorta() {
    const q = st.portaSotto;
    if (!q || !st.scena || portaA(st.scena, q)) return null;
    return { q, stato: M.porta.stato, segreta: M.porta.segreta, orientamento: M.porta.verso ?? orientamento(st.scena, q) };
  }
  /** ← → con lo strumento «Porta» (07/10): gira la porta da mettere; la scelta resta per le porte successive. */
  function frecciaPorta(e) {
    if (M.strumento !== 'porta' || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return false;
    e.preventDefault();
    const ora = anteprimaPorta()?.orientamento ?? M.porta.verso ?? 'orizzontale';
    M.porta.verso = opposto(ora);
    avviso(`Porta ${M.porta.verso} (← → per girarla; «Automatico» nel pannello per tornare ai muri).`, { chiave: 'porta', durata: 2500 });
    disegnaPannelloMuri();
    ridisegna(['aree']);
    return true;
  }
  /** Cambio di stato deciso dal master (nessuna AzP): Apri, Chiudi, Blocca, Sblocca, Rivela, Rendi segreta. */
  function cambiaPortaMaster(porta, dopo, testo) {
    st.scena = cambiaPortaAnnullabile(st.scena, porta, { ...porta, ...dopo }, ctx.dati);
    avviso(testo, { chiave: 'porta' });
    dopoPorta();
  }
  /** Clic del master sulla porta: aperta ↔ chiusa; bloccata: l'avviso. */
  function portaMaster(porta) {
    if (porta.stato === 'bloccata') { avviso([AVVISO_BLOCCATA, 'Clic destro sulla porta → «Sblocca».'], { tipo: 'info', chiave: 'porta' }); return; }
    cambiaPortaMaster(porta, { stato: porta.stato === 'aperta' ? 'chiusa' : 'aperta' }, porta.stato === 'aperta' ? 'Porta chiusa.' : 'Porta aperta.');
  }
  /**
   * Il token apre o chiude una porta adiacente (A.125): 1 AzP nel Round, senza Prova; una riga nel registro dello
   * scontro. La porta bloccata non si apre. Nulla si blocca: l'AzP si conta e si mostra accanto ai Q usati.
   */
  function portaToken(tok, porta, azione) {
    const r = apriChiudi(porta, azione);
    if (r.errore === 'bloccata') { avviso(AVVISO_BLOCCATA, { tipo: 'info', chiave: 'porta' }); return; }
    if (r.errore) { avviso(`La porta è ${r.errore}.`, { chiave: 'porta' }); return; }
    const scontro = st.fonti?.scontro ?? null;
    const nome = pezzoDi(tok)?.nome ?? tok.nome ?? tok.id;
    const id = `az-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    let s = conAzione(st.scena, { id, token: tok.id, porta: porta.id, azione, scontro: scontro?.id ?? null, round: scontro?.round ?? null, ...(scontro ? {} : { turno: turnoDi(st.scena, tok.id) }), quando: new Date().toISOString() }, RP);
    s = cambiaPortaAnnullabile(s, porta, r.porta, ctx.dati, id);
    st.scena = s;
    if (scontro) scriviRegistro(scontro.id, (x) => rigaPorta(x, { nome, azione, azp: RP.costo_azp }), 'Riga del registro (porta)');
    avviso(`${nome} ${azione === 'apri' ? 'apre' : 'chiude'} la porta: ${RP.costo_azp} AzP.`, { chiave: 'porta' });
    dopoPorta();
  }
  /** AzP usate dal token nel Round (o nel turno), per il pannello. */
  const azpToken = (t) => { const sc = st.fonti?.scontro ?? null; return azpNelRound(st.scena, t.id, sc?.id ?? null, sc?.round ?? null, sc ? null : turnoDi(st.scena, t.id)); };
  /** Voci del clic destro su una porta (data/mappa.json → menu.porta): del token scelto adiacente, poi del master. */
  function fabbrichePorta(porta, scelto) {
    const nomeScelto = scelto ? pezzoDi(scelto)?.nome ?? scelto.id : null;
    const adiacente = scelto && porteVicine(st.scena, scelto).some((p) => p.id === porta.id);
    const or = orientamentoPorta(st.scena, porta);
    return {
      porta_token: () => (adiacente && porta.stato !== 'bloccata'
        ? { testo: `${nomeScelto}: ${porta.stato === 'aperta' ? 'chiudi' : 'apri'} la porta`, tasto: `${RP.costo_azp} AzP`, titolo: 'Adiacente, con una mano libera, senza Prova (A.125)', azione: () => portaToken(scelto, porta, porta.stato === 'aperta' ? 'chiudi' : 'apri') }
        : null),
      apri_chiudi: () => (porta.stato === 'aperta' ? { testo: 'Chiudi', tasto: 'clic', titolo: 'Decide il master: nessuna AzP', azione: () => cambiaPortaMaster(porta, { stato: 'chiusa' }, 'Porta chiusa.') }
        : porta.stato === 'chiusa' ? { testo: 'Apri', tasto: 'clic', titolo: 'Decide il master: nessuna AzP', azione: () => portaMaster(porta) } : null),
      blocca: () => (porta.stato === 'bloccata' ? { testo: 'Sblocca', titolo: 'La porta torna chiusa', azione: () => cambiaPortaMaster(porta, { stato: 'chiusa' }, 'Porta sbloccata: ora è chiusa.') }
        : { testo: 'Blocca', azione: () => cambiaPortaMaster(porta, { stato: 'bloccata' }, 'Porta bloccata.') }),
      ruota: () => ({ testo: `Ruota (ora ${or})`, azione: () => { const r = ruotaPorta(st.scena, porta); cambiaPortaMaster(porta, { orientamento: r.orientamento }, `Porta ${r.orientamento}.`); } }),
      segreta: () => (porta.segreta ? { testo: 'Rivela ai giocatori', azione: () => cambiaPortaMaster(porta, { segreta: false }, 'Porta rivelata: ora i giocatori la vedono.') }
        : { testo: 'Rendi segreta', titolo: 'Per i giocatori è muro finché non la riveli', azione: () => cambiaPortaMaster(porta, { segreta: true }, 'Porta segreta: per i giocatori è muro.') }),
      togli_porta: () => ({ testo: 'Togli la porta', tasto: 'Ctrl+Z la rimette', pericolo: true, azione: () => { st.scena = cambiaPortaAnnullabile(st.scena, porta, null, ctx.dati); avviso('Porta tolta (Ctrl+Z la rimette).', { chiave: 'porta' }); dopoPorta(); } }),
    };
  }
  /** Voci del clic destro su un template (data/mappa.json → menu.template). */
  function fabbricheTemplate(t) {
    const nome = t.nome || testoMisure(t, RT);
    return {
      sposta_template: () => ({ testo: 'Sposta o ruota', chiave: `${t.id}:sposta`, titolo: 'Segue il mouse; ← → lo ruotano, ↑ ↓ cambiano la misura; clic per rimetterlo', azione: () => spostaTemplate(t.id) }),
      nascondi_template: () => ({ testo: t.nascosto ? 'Mostra ai giocatori' : 'Nascondi ai giocatori', chiave: `${t.id}:nascondi`, azione: () => nascondiTemplate(t.id) }),
      togli_template: () => ({ testo: `Togli «${nome}»`, chiave: `${t.id}:togli`, tasto: 'Ctrl+Z', pericolo: true, azione: () => togliTemplate(t.id) }),
    };
  }
  /** Le voci del menu nel formato del renderer, con l'altezza per il dito (data/mappa.json → menu). */
  const MENU = ctx.dati.mappa.menu;
  const apriMenu = (p, titolo, menu) => apriMenuToken(el.riquadro, p.x, p.y, titolo, menu, { altezza: MENU.altezza_voce_px });
  /**
   * «Cancella template temporanei»  /**
   * «Cancella template temporanei» (ritocchi del 07/10): via in un colpo i template a durata in Round, con conferma e
   * il numero; `tutti`: anche quelli senza durata, con una conferma più forte. Ctrl+Z li rimette; una riga nel registro.
   */
  async function cancellaTemplate({ tutti }) {
    if (!st.scena) return;
    const via = tutti ? () => true : (t) => !permanente(t);
    const quanti = st.scena.template.filter(via).length;
    if (!quanti) { avviso(tutti ? 'Nessun template sulla mappa.' : 'Nessun template temporaneo (a durata) sulla mappa.', { chiave: 'template' }); return; }
    const restano = st.scena.template.length - quanti;
    const ok = await chiedi(tutti
      ? { titolo: `Togliere tutti i ${quanti} template?`, testo: 'Anche quelli senza durata («finché non lo tolgo»). Muri, porte e terreno restano. Ctrl+Z li rimette.', si: `Togli tutti (${quanti})`, pericolo: true }
      : { titolo: `Tolgo ${quanti} template temporane${quanti === 1 ? 'o' : 'i'}?`, testo: `Quelli a durata in Round. Restano${restano ? ` ${restano} template senza durata,` : ''} muri, porte e terreno. Ctrl+Z li rimette.`, si: 'Togli' });
    if (!ok || !st.scena) return;
    const r = togliTemplateAnnullabile(st.scena, via, ctx.dati);
    st.scena = r.scena;
    const sc = st.fonti?.scontro ?? null;
    if (sc) scriviRegistro(sc.id, (x) => rigaTemplateTolti(x, { quanti: r.tolti.length, temporanei: !tutti }), 'Riga del registro (template tolti)');
    avviso(`Tolt${r.tolti.length === 1 ? 'o' : 'i'} ${r.tolti.length} template${tutti ? '' : (r.tolti.length === 1 ? ' temporaneo' : ' temporanei')}. Ctrl+Z per rimetterli.`, { chiave: 'template' });
    dopoTemplate();
  }
  /**
   * Clic destro su un punto senza token (07/10: gruppi con intestazione e «Opzioni»): la porta del Q, i template che lo
   * coprono, poi gli strumenti del punto (data/mappa.json → menu.porta, .template, .mappa).
   */
  function menuMappa(p) {
    if (!st.scena) return;
    const q = qVicino(mappaDaSchermo(st.cam, p.x, p.y));
    const qui = st.scena.template.filter((t) => celleTpl(t)[q[1] * st.scena.griglia.colonne + q[0]]);
    const porta = portaA(st.scena, q);
    const scelto = st.selezionato ? st.scena.token.find((x) => x.id === st.selezionato) : null;
    const g = st.scena.griglia;
    const fabbricheMappa = {
      template_qui: () => ({ testo: 'Nuovo template qui…', tasto: 'T', azione: () => nuovoTemplateUi(q) }),
      seleziona_pg: () => ({ testo: 'Seleziona tutti i PG', azione: () => selezionaTipo('pg') }),
      seleziona_nemici: () => ({ testo: 'Seleziona tutti i nemici', azione: () => selezionaTipo('nemici') }),
      seleziona_tutti: () => ({ testo: 'Seleziona tutti', azione: () => selezionaTipo('tutti') }),
      annulla_selezione: () => (st.gruppo.size ? { testo: `Annulla la selezione (${st.gruppo.size})`, tasto: 'Esc', azione: () => cambiaGruppo(new Set()) } : null),
      linea_qui: () => (scelto ? { testo: `Linea di tiro di ${pezzoDi(scelto)?.nome ?? scelto.id} fin qui`, tasto: 'L', azione: () => { iniziaLinea(scelto.id); fissaLinea({ x: g.scosto_x + (q[0] + 0.5) * g.q_px, y: g.scosto_y + (q[1] + 0.5) * g.q_px }); } } : null),
    };
    const menu = unisciMenu([
      ...(porta ? [componiMenu(MENU.porta, fabbrichePorta(porta, scelto))] : []),
      ...qui.map((t) => componiMenu({ ...MENU.template, gruppi: MENU.template.gruppi.map((x) => ({ ...x, titolo: x.titolo.replace('{nome}', `Template «${t.nome || testoMisure(t, RT)}»`) })) }, fabbricheTemplate(t))),
      componiMenu(MENU.mappa, fabbricheMappa),
    ]);
    apriMenu(p, porta ? `Porta ${RP.nomi_stati[porta.stato].toLowerCase()}${porta.segreta ? ', segreta' : ''}` : qui.length ? 'Template' : `Quadretto (${q.join(', ')})`, menu);
  }
    /** «Mostra ZoC»: interruttore ricordato (localStorage), come «Mostra area». */
  function cambiaMostraZoc(v = !st.mostraZoc) {
    st.mostraZoc = v;
    scriviLocale('mutant-mappa-mostra-zoc', v);
    avviso(v ? 'Zone di controllo mostrate (Z per nasconderle).' : 'Zone di controllo nascoste (Z per mostrarle); gli avvisi degli Attacchi di Opportunità restano.', { chiave: 'mostra-zoc' });
    disegnaPannelli();
    ridisegna(['aree', 'sopra']);
  }
  /**
   * Dopo un movimento (non «Libero»): gli Attacchi di Opportunità provocati (Giocatore §5.3: uscire dalla portata di
   * un avversario). Un avviso per avversario con «Attacca!» quando l'avversario ha un attacco nella plancia, e una riga
   * nel registro dello scontro aperto. Solo segnalazione: nessun tiro.
   */
  function segnalaOpportunita(t, punti, movimento = null) {
    const pz = pezzoDi(t);
    if (!pz || pz.tipo === 'veicolo' || pz.aZero || punti.length < 2) return;
    const avv = avversariZoc(st.scena, st.pezzi, t.id, ctx.dati);
    const scontro = st.fonti?.scontro ?? null;
    // Giocatore §5.3, «una sola volta per Round» per attaccante: registro letto + segnalazioni di questa pagina
    if (scontro) st.opportunita = st.opportunita.filter((l) => l.scontro === scontro.id && l.round === scontro.round);
    const giaAvuto = giaInQuestoRound(scontro, st.opportunita, st.movimentiRitirati);
    const eccezioni = (pz.scheda?.capacita ?? []).filter((c) => String(c.effetto ?? '').includes(ctx.dati.mappa.zoc.frase_eccezione)).map((c) => c.nome);
    const righeRegistro = [];
    for (const a of attacchiDiOpportunita(punti, t.ingombro, avv)) {
      const idDa = a.token.rif.id;
      const gia = giaAvuto.has(idDa);
      const righe = [testoOpportunita(pz.nome, a.pezzo.nome),
        gia ? `${a.pezzo.nome} ha già avuto un Attacco di Opportunità in questo Round: uno solo per Round.` : null,
        `Salvo Ritirata${eccezioni.length ? ` o ${eccezioni.join(', ')}` : ''}. Nessun tiro automatico.`];
      const puo = scontro && !gia && st.planciaBarra?.puoAttaccare?.(idDa);
      avviso(righe, {
        tipo: 'info', durata: 15000,
        azioni: puo ? [{ testo: `Attacca! (${a.pezzo.nome} → ${pz.nome})`, fai: () => st.planciaBarra.attaccaContro(idDa, t.rif.id) }] : [],
      });
      if (scontro && !gia) {
        righeRegistro.push({ da: idDa, nomeDa: a.pezzo.nome, contro: t.rif.id, nomeContro: pz.nome, movimento });
        st.opportunita.push({ scontro: scontro.id, round: scontro.round, da: idDa, nomeDa: a.pezzo.nome, movimento });
      }
    }
    // tutte le righe in una sola scrittura dello scontro (con la revisione)
    if (righeRegistro.length) scriviRegistro(scontro.id, (s) => righeRegistro.reduce((x, r) => rigaOpportunita(x, r), s), 'Righe del registro (Attacchi di Opportunità)');
  }
  /**
   * Movimento annullato («Annulla ultimo movimento» o Ctrl+Z): gli Attacchi di Opportunità che aveva provocato si
   * ritirano. Escono dal registro dello scontro (le righe portano l'id del movimento) e dal controllo «uno per Round»,
   * così rifacendo il movimento l'avversario può di nuovo attaccare; un avviso lo dice.
   */
  function ritiraOpportunita(movimento) {
    if (!movimento) return;
    const ritirate = st.opportunita.filter((l) => l.movimento === movimento);
    const nelRegistro = (st.fonti?.scontro?.registro ?? []).some((r) => r.opportunita?.movimento === movimento);
    if (!ritirate.length && !nelRegistro) return;
    st.movimentiRitirati.add(movimento);
    st.opportunita = st.opportunita.filter((l) => l.movimento !== movimento);
    const scontro = st.fonti?.scontro ?? null;
    if (scontro) scriviRegistro(scontro.id, (s) => senzaOpportunitaDelMovimento(s, movimento), 'Attacchi di Opportunità ritirati');
    const nomi = ritirate.map((l) => l.nomeDa).join(', ');
    avviso(`Movimento annullato: ritirato l’Attacco di Opportunità${nomi ? ` di ${nomi}` : ''}.`, { tipo: 'info', chiave: 'opportunita-ritirata' });
  }
  /**
   * Righe nel registro dello scontro (07/10/2026): aggiornaInScontri ritenta da sé sui conflitti e sugli errori
   * passeggeri del server; se non basta, l'avviso lo dice e offre «Riprova», così le righe non si perdono in silenzio.
   */
  function scriviRegistro(id, cambia, cosa) {
    aggiornaInScontri(id, cambia).catch((e) => avvisoErrore(`${cosa}: non scritte nello scontro (${e.message}).`, {
      durata: 60000, azioni: [{ testo: 'Riprova', fai: () => scriviRegistro(id, cambia, cosa) }],
    }));
  }
  /** «Mostra area»: interruttore ricordato (localStorage). */
  function cambiaMostraArea(v = !st.mostraArea) {
    st.mostraArea = v;
    scriviLocale('mutant-mappa-mostra-area', v);
    avviso(v ? 'Area di movimento mostrata (M per nasconderla).' : 'Area di movimento nascosta (M per mostrarla); il percorso resta.', { chiave: 'mostra-area' });
    disegnaPannelli();
    ridisegna(['aree', 'sopra']);
  }
  function cambiaFascia(n) {
    // A.129: Corsa e Scatto non si scelgono più dopo un Passo cominciato, né dopo un blocco già fatto
    const t = st.selezionato ? st.scena?.token.find((x) => x.id === st.selezionato) : null;
    const f = FASCE[n - 1];
    if (t && f && f !== 'passo') {
      const info = st.area?.token === t.id ? st.area : infoArea(t);
      if (info.escluse?.includes(f)) { avviso(info.nonPiu, { tipo: 'info', chiave: 'fuori-area', durata: 9000 }); return; }
      if (info.chiusa) { avviso(`${pezzoDi(t)?.nome ?? 'Il token'}: ${info.motivo}. Con Libero (o Maiusc) il master lo sposta comunque.`, { tipo: 'info', chiave: 'fuori-area' }); return; }
    }
    st.fascia = n;
    invalidaArea();
    disegnaPannelli();
    ridisegna(['aree', 'sopra']);
  }
  /** Posizione del token se il suo centro va nel punto m della mappa (aggancio §7). */
  const posizioneVerso = (t, m) => agganciaQ(st.scena.griglia, m.x, m.y, t.ingombro);
  /** Costo per arrivare in q con l'area data (Infinity se fuori o oltre la fascia scelta). */
  const costoDentro = (info, q) => { const c = info?.area ? costoVerso(info.area, q) : Infinity; return c <= (info?.limite ?? 0) ? c : Infinity; };
  /** q si raggiunge solo con una fascia più ampia di quella scelta (Corsa o Scatto)? */
  const chiedeFascia = (info, q) => { const c = info?.area ? costoVerso(info.area, q) : Infinity; return c > (info?.limite ?? 0) && c <= (info?.totale ?? 0); };
  /** Avviso per un movimento oltre la fascia scelta (primo test di Marcello, 06/10/2026). */
  const avvisaFascia = () => avviso(st.fascia === 3 ? 'Seleziona Libero per effettuare questo movimento' : st.fascia === 2 ? 'Seleziona Scatto per effettuare questo movimento' : 'Seleziona Corsa o Scatto per effettuare questo movimento', { tipo: 'info', chiave: 'fuori-area' });

  /**
   * Movimento (§8): dentro l'area si registra nel Round dello scontro, con la sua fascia; con `libero` («Libero» o
   * Maiusc) il master sposta dove vuole, il movimento non conta e nel registro dello scontro aperto resta una riga. Un veicolo nello scontro segna anche il suo
   * movimento del Round nel registro unico (A.105).
   */
  function eseguiMovimento(t, q, { libero = false, info = infoArea(t) } = {}) {
    if (q[0] === t.q[0] && q[1] === t.q[1]) return false;
    const costo = costoDentro(info, q);
    const nome = pezzoDi(t)?.nome ?? t.nome ?? t.id;
    if (!libero && costo === Infinity && chiedeFascia(info, q)) { avvisaFascia(); return false; }
    if (!libero && costo === Infinity) {
      // A.129: oltre il Passo rimasto, se Corsa e Scatto non sono più permessi lo dice
      if (info.nonPiu) { avviso([`${nome}: quel quadretto è oltre il Passo rimasto (${numero(info.rimaste?.passo ?? 0, 1)} Q).`, info.nonPiu, 'Con Libero (o Maiusc) il master lo sposta comunque.'], { tipo: 'info', chiave: 'fuori-area', durata: 9000 }); return false; }
      avviso(`${nome}: quel quadretto è fuori dall’area${info.motivo ? ` (${info.motivo})` : ''}. Seleziona Libero (o tieni premuto Maiusc) per spostarlo comunque.`, { tipo: 'info', chiave: 'fuori-area' });
      return false;
    }
    const scontro = st.fonti?.scontro ?? null;
    const fascia = libero ? null : fasciaDi(costo, info.rimaste);
    // ZoC: il percorso fatto, per gli Attacchi di Opportunità (non con «Libero»: è il master che sposta)
    const fatto = !libero && info.area ? percorso(info.area, q) : [];
    st.scena = muoviToken(st.scena, t.id, { a: q, costo: libero ? null : costo, fascia, scontro: scontro?.id ?? null, round: scontro?.round ?? null, libero }, ctx.dati);
    if (libero) {
      avviso(`Libero: ${nome} spostato; non conta nel movimento${scontro ? ' (riga nel registro)' : ''}.`, { tipo: 'info', chiave: 'fuori-area' });
      if (scontro) scriviRegistro(scontro.id, (s) => rigaMovimentoLibero(s, nome, t.q, q), 'Riga del registro (movimento libero)');
    }
    // il veicolo segna il suo movimento del Round nel registro unico
    const rec = recordVeicolo(t);
    if (rec && scontro && !libero) {
      try {
        aggiornaVeicolo(rec, muoviVeicolo(rec, scontro, diTurno(scontro), { fuoriTurno: true, dati: ctx.dati })).then(({ record }) => {
          if (st.fonti) st.fonti.veicoli = st.fonti.veicoli.map((x) => (x.id === record.id ? record : x));
        }).catch((e) => avvisoErrore(`Movimento del veicolo non registrato: ${e.message}`));
      } catch (e) { avvisoErrore(`Movimento del veicolo non registrato: ${e.message}`); }
    }
    avvisaSovrapposti([t.id]);
    invalidaArea();
    dopoCambioToken();
    // A.129: Corsa e Scatto in un blocco unico; i Q non usati si perdono
    if (fascia && !ctx.dati.mappa.movimento.divisibili.includes(fascia)) {
      const persi = Math.max(0, (info.movimento?.[fascia] ?? 0) - info.usato - costo);
      avviso(`${nome}: ${NOMI_FASCE[fascia]} in un blocco unico (${numero(info.usato + costo, 1)} Q)${persi ? `; i ${numero(persi, 1)} Q non usati sono persi` : ''}. Movimento ${scontro ? 'del Round' : 'del turno'} finito.`, { tipo: 'info', chiave: 'blocco' });
    }
    if (fatto.length) segnalaOpportunita(t, fatto, st.scena.movimenti.at(-1)?.id ?? null);
    return true;
  }
  function annullaMovimentoUi(id = st.selezionato) {
    const esito = id ? annullaUltimoMovimento(st.scena, id) : null;
    if (!esito) { avviso('Nessun movimento da annullare per questo token.'); return; }
    if (esito.errore) { avvisoErrore(`Non annullato: ${esito.errore}.`); return; }
    st.scena = esito.scena;
    veicoloNonPiuMosso(esito.movimento);
    avviso('Annullato l’ultimo movimento.', { chiave: 'annulla' });
    ritiraOpportunita(esito.movimento?.id);
    invalidaArea();
    dopoCambioToken();
  }
  /**
   * Annullato il movimento di un veicolo nel Round: anche il registro unico torna «non mosso» (A.105), così la mappa e
   * la plancia restano d'accordo e il conducente può muoverlo di nuovo.
   */
  function veicoloNonPiuMosso(mov) {
    if (!mov || mov.libero) return;
    const t = st.scena.token.find((x) => x.id === mov.token);
    const rec = t ? recordVeicolo(t) : null;
    if (!rec || rec.movimento?.scontro !== mov.scontro || rec.movimento?.round !== mov.round) return;
    aggiornaVeicolo(rec, { ...rec, movimento: null }).then(({ record }) => {
      if (st.fonti) st.fonti.veicoli = st.fonti.veicoli.map((x) => (x.id === record.id ? record : x));
      invalidaArea();
      disegnaPannelli();
      ridisegna(['aree', 'sopra']);
    }).catch((e) => avvisoErrore(`Registro del veicolo non aggiornato: ${e.message}`));
  }
  /** Dati del movimento per il pannello del token. */
  function movimentoPannello(t) {
    const info = st.area?.token === t.id ? st.area : infoArea(t);
    const ultimo = [...st.scena.movimenti].reverse().find((x) => x.token === t.id);
    return { mostraArea: st.mostraArea, mostraZoc: st.mostraZoc, movimento: info.movimento, rimaste: info.rimaste, usato: info.usato, disponibili: info.disponibili, fascia: st.fascia, motivo: info.motivo, nota: info.nota, escluse: info.escluse ?? [], chiusa: info.chiusa ?? null, annullabile: !!ultimo, azp: azpToken(t), porte: porteVicine(st.scena, t).map((p) => ({ id: p.id, stato: p.stato })), veicolo: t.rif.tipo === 'veicolo', andatura: pezzoDi(t)?.andatura ?? null, senzaScontro: !st.fonti?.scontro };
  }
  /** «Nuovo turno» senza scontro aperto: il conteggio del movimento riparte per un token o per tutti (null). */
  function nuovoTurnoUi(id = null) {
    st.scena = nuovoTurno(st.scena, id);
    if (!id || st.selezionato === id) st.fascia = 1;
    avviso(id ? 'Nuovo turno: il movimento di questo token riparte da 0.' : 'Nuovo turno per tutti: il movimento riparte da 0.', { chiave: 'turno' });
    dopoCambioToken();
  }

  // ── Puntatore, rotella e tastiera (§12); gesti comuni in ./gesti.js (lotto 4: due dita, doppio tocco) ──
  const punto = (e) => { const r = el.riquadro.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  // lotto 7: pressione lunga su un token col dito o la penna = clic destro (menu del token sul tablet)
  let pressioneLunga = null;
  const fermaPressione = () => { clearTimeout(pressioneLunga); pressioneLunga = null; };
  const premi = (e, p) => {
    fermaPressione();
    if (e.pointerType && e.pointerType !== 'mouse') {
      pressioneLunga = setTimeout(() => {
        pressioneLunga = null;
        const t = st.trascina;
        if (!t || t.mosso || t.modo !== 'token') return;
        annullaGesto(t);
        menuSu(p);
      }, PRESSIONE_LUNGA_MS);
    }
    el.riquadro.focus({ preventScroll: true });
    nascondiSuggerimento();
    chiudiMenuToken();
    if (!st.scena) return;
    const m = mappaDaSchermo(st.cam, p.x, p.y);
    if (st.daPiazzare && !st.spazio) { piazza(st.daPiazzare, m); return; }
    // fase 2, lotto 5: un clic su un quadretto accanto al veicolo fa scendere chi si è scelto
    if (st.scendi && !st.spazio) { scendiQui(m); return; }
    // fase 2, lotto 1: un clic fissa il template che si sta piazzando
    if (st.tpl.anteprima && !st.spazio) { aggiornaAnteprima(m); fissaTemplate(); return; }
    // fase 2, lotto 3: con la linea di tiro un clic fissa il bersaglio (un token o un Q); su chi tira, esce
    if (st.linea && !st.spazio) { fissaLinea(m); return; }
    const base = { id: e.pointerId, x: p.x, y: p.y, x0: p.x, y0: p.y, mosso: false };
    const d = disegnoAttivo();
    if (d && d.forma === 'porta' && !st.spazio && st.strumento !== 'calibra') { mettiTogliPorta(qVicino(m)); return; }
    if (d && !st.spazio && st.strumento !== 'calibra') {
      const q = qVicino(m);
      st.trascina = { ...base, modo: 'disegno', ...d, iniziale: d.gruppo === 'nebbia' ? { nebbia: st.scena.nebbia.coperti } : d.gruppo === 'luci' ? { luce: st.scena.luce ?? null } : { muri: st.scena.muri, terreno: st.scena.terreno }, da: q, a: q };
      if (d.forma === 'pennello') { passoPennello(q, q); ridisegna(['aree']); } else ridisegna(['sopra']);
      return;
    }
    const tok = !st.spazio && st.strumento !== 'calibra' ? tokenSotto(m) : null;
    // 07/10: Maiusc + trascina su un punto vuoto = rettangolo di selezione (Maiusc + clic, senza trascinare, resta il
    // movimento libero del token scelto)
    if (!tok && e.shiftKey && !st.spazio && st.strumento !== 'calibra') { st.trascina = { ...base, modo: 'selezione', da: m, a: m }; return; }
    const modo = tok ? 'token' : st.strumento === 'calibra' && !st.spazio ? 'calibra' : 'sposta';
    st.trascina = { ...base, modo };
    if (modo === 'calibra') st.calibrazione = { a: m, b: null };
    if (tok) {
      const c = centroToken(st.scena.griglia, tok);
      // l'area del token trascinato: il trascinamento si aggancia solo dentro (Maiusc per uscire)
      Object.assign(st.trascina, { token: tok.id, q: tok.q, q0: [...tok.q], dx: m.x - c.x, dy: m.y - c.y, ingombro: tok.ingombro, info: infoArea(tok), diGruppo: st.gruppo.has(tok.id) && st.gruppo.size > 1 });
    }
    el.riquadro.classList.toggle('trascina', modo !== 'calibra');
  };
  /** Un passo del pennello (nebbia o muri) da a ad b, senza voce di «annulla» (la voce arriva al rilascio). */
  function passoPennello(a, b) {
    if (st.trascina?.gruppo === 'muri') st.scena = muriProvvisori(st.scena, trattoMuri(st.scena, a, b, M.lato, M.modo));
    else if (st.trascina?.gruppo === 'luci') { st.scena = trattoLuce(st.scena, a, b, L.lato, L.modo, ctx.dati); st.luceCache = null; }
    else {
      const g = st.scena.griglia;
      st.scena = nebbiaProvvisoria(st.scena, tratto(daBase64(st.scena.nebbia.coperti), g.colonne, g.righe, a, b, N.lato, valoreModo(N.modo)));
    }
  }
  const muovi = (e, p, mio) => {
    if (st.tpl.anteprima && !st.trascina) { aggiornaAnteprima(mappaDaSchermo(st.cam, p.x, p.y)); return; }
    if (st.linea && !st.linea.fissa && !st.trascina) { aggiornaLinea(mappaDaSchermo(st.cam, p.x, p.y)); return; }
    const t = st.trascina;
    if (!t || !mio) { suggerisci(e); return; }
    if (!t.mosso && Math.hypot(p.x - t.x0, p.y - t.y0) < TRASCINAMENTO_MINIMO_PX) return;
    t.mosso = true;
    fermaPressione();
    if (t.modo === 'sposta') cambiaCamera(sposta(st.cam, p.x - t.x, p.y - t.y));
    else if (t.modo === 'selezione') { t.a = mappaDaSchermo(st.cam, p.x, p.y); ridisegna(['sopra']); }
    else if (t.modo === 'disegno') {
      const q = qVicino(mappaDaSchermo(st.cam, p.x, p.y));
      if (q[0] !== t.a[0] || q[1] !== t.a[1]) {
        if (t.forma === 'pennello') { passoPennello(t.a, q); t.a = q; ridisegna(['aree']); } else { t.a = q; ridisegna(['sopra']); }
      }
    } else if (t.modo === 'token') {
      // §7 e §8: sempre al centro di un quadretto; dentro l'area raggiungibile, o dove si vuole con Maiusc
      const m = mappaDaSchermo(st.cam, p.x, p.y);
      const puntata = agganciaQ(st.scena.griglia, m.x - t.dx, m.y - t.dy, t.ingombro);
      // il gruppo si sposta sempre libero (07/10)
      const libero = e.shiftKey || !t.info?.area || t.diGruppo;
      // fuori dall'area il token resta sulla posizione raggiungibile più vicina al puntatore
      const q = libero ? puntata : piuVicinaRaggiungibile(t.info.area, puntata, t.info.limite) ?? t.q;
      t.oltre = !libero && chiedeFascia(t.info, puntata);
      // A.129: oltre il Passo rimasto con Corsa e Scatto non più permessi
      t.oltreNonPiu = !libero && !!t.info?.nonPiu && costoVerso(t.info.area, puntata) > t.info.limite;
      if (q[0] !== t.q[0] || q[1] !== t.q[1] || t.libero !== libero) {
        t.q = q;
        t.libero = libero;
        st.percorso = libero ? null : { punti: percorso(t.info.area, q), costo: costoVerso(t.info.area, q), ingombro: t.ingombro, fascia: fasciaDi(costoVerso(t.info.area, q), t.info.rimaste) };
        ridisegna(['sopra']);
      }
    } else { st.calibrazione.b = mappaDaSchermo(st.cam, p.x, p.y); ridisegna(['sopra']); }
    t.x = p.x; t.y = p.y;
  };
  /** Restituisce true se il rilascio ha colpito qualcosa (niente doppio tocco per «Adatta»). */
  const rilascia = (e, p, annullato) => {
    fermaPressione();
    const t = st.trascina;
    if (!t) return false;
    st.trascina = null;
    el.riquadro.classList.remove('trascina');
    if (annullato) { annullaGesto(t); return true; }
    if (t.modo === 'disegno') {
      if (t.gruppo === 'nebbia') st.scena = t.forma === 'rettangolo' ? rettangoloNebbia(st.scena, t.da, t.a, N.modo, ctx.dati) : chiudiPennellata(st.scena, t.iniziale.nebbia, ctx.dati);
      else if (t.gruppo === 'luci') {
        // fase 2, lotto 4: una voce di Ctrl+Z per pennellata o rettangolo
        const fatta = t.forma === 'rettangolo' ? rettangoloLuce(st.scena, t.da, t.a, L.modo, ctx.dati) : st.scena;
        st.scena = conVoceLuce(fatta, t.iniziale.luce, ctx.dati);
        dopoLuci();
        return true;
      } else st.scena = t.forma === 'rettangolo' ? rettangoloMuri(st.scena, t.da, t.a, M.modo, ctx.dati) : chiudiTrattoMuri(st.scena, t.iniziale, ctx.dati);
      dopoDisegno();
      return true;
    }
    if (t.modo === 'selezione') {
      if (t.mosso) {
        const g = st.scena.griglia;
        const inQ = (pt) => [(pt.x - g.scosto_x) / g.q_px, (pt.y - g.scosto_y) / g.q_px];
        const ids = tokenNelRettangolo(st.scena, inQ(t.da), inQ(t.a));
        cambiaGruppo(new Set(ids));
        if (!ids.length) avviso('Nessun token nel rettangolo.', { chiave: 'gruppo' });
        return true;
      }
      // Maiusc + clic su un punto vuoto: il movimento libero del token scelto, come prima (sotto)
      st.trascina = null;
    }
    if (t.modo === 'calibra') {
      if (t.mosso) chiudiCalibrazione();
      else { st.calibrazione = null; ridisegna(['sopra']); }
      return true;
    }
    if (t.modo === 'token') {
      const tok = st.scena.token.find((x) => x.id === t.token);
      st.percorso = null;
      if (!tok) { ridisegna(['sopra']); return true; }
      // 07/10: un token del gruppo trascinato porta con sé tutti gli altri, in formazione, sempre libero
      if (t.mosso && t.diGruppo) { muoviGruppo([t.q[0] - tok.q[0], t.q[1] - tok.q[1]]); return true; }
      // Maiusc + clic su un token: dentro o fuori dalla selezione multipla (con il token scelto, se c'era)
      if (!t.mosso && e.shiftKey) {
        const base = !st.gruppo.size && st.selezionato && st.selezionato !== tok.id ? new Set([st.selezionato]) : st.gruppo;
        cambiaGruppo(alternaSelezione(base, tok.id));
        return true;
      }
      if (st.gruppo.size && !t.mosso) cambiaGruppo(new Set());
      if (t.mosso) {
        if (!eseguiMovimento(tok, t.q, { libero: !!t.libero, info: t.info })) ridisegna(['sopra']);
        if (t.oltre) avvisaFascia(); // rilasciato oltre la fascia scelta: il token si è fermato al suo limite
        else if (t.oltreNonPiu) avviso(t.info.nonPiu, { tipo: 'info', chiave: 'fuori-area', durata: 9000 });
      } else if (e.ctrlKey || e.metaKey) {
        // lotto 7 (§12): Ctrl+clic apre la scheda completa del PG, la mini-scheda per gli altri
        scegli(tok.id);
        apriSchedaToken(tok);
      } else if (st.selezionato === tok.id) {
        // 07/10: ricliccare il token scelto lo lascia (area e percorso spariscono; i Q usati restano)
        scegli(null);
      } else {
        // clic: si sceglie il token, compare la sua area e si apre la sua carta accanto alla mappa
        scegli(tok.id);
        apriCarta(tok);
      }
      return true;
    }
    // fase 2, lotto 2: clic su una porta (senza token sopra): il master la apre o la chiude; con un token scelto che ci
    // può arrivare (porta aperta dentro l'area) vale il movimento
    // 07/10: clic su un punto vuoto con una selezione multipla: la selezione si annulla
    if (!t.mosso && st.gruppo.size && !e.shiftKey) { cambiaGruppo(new Set()); return true; }
    if (!t.mosso && t.modo === 'sposta' && !st.spazio && !e.shiftKey) {
      const mm = mappaDaSchermo(st.cam, p.x, p.y);
      const porta = portaA(st.scena, qVicino(mm));
      if (porta && !tokenSotto(mm)) {
        const tok = st.selezionato ? st.scena.token.find((x) => x.id === st.selezionato) : null;
        const info = tok ? areaScelta() : null;
        if (!(tok && info && costoDentro(info, posizioneVerso(tok, mm)) < Infinity)) { portaMaster(porta); return true; }
      }
    }
    // clic su un quadretto con un token scelto: dentro l'area (o con Maiusc) il token ci va; altrimenti si deseleziona,
    // senza muovere e senza avvisi (07/10: il master lascia il token per fare altro)
    if (!t.mosso && st.selezionato) {
      const tok = st.scena.token.find((x) => x.id === st.selezionato);
      const info = areaScelta();
      if (tok && info) {
        const q = posizioneVerso(tok, mappaDaSchermo(st.cam, p.x, p.y));
        if (e.shiftKey || info.libero || costoDentro(info, q) < Infinity) { eseguiMovimento(tok, q, { libero: e.shiftKey || info.libero, info }); return true; }
        // A.129: un quadretto che chiederebbe Corsa o Scatto, non più permessi dopo il Passo cominciato: avviso, il token resta scelto
        if (info.nonPiu && info.area && costoVerso(info.area, q) <= info.portata) { eseguiMovimento(tok, q, { info }); return true; }
      }
      scegli(null);
    }
    return t.mosso;
  };
  /** Il gesto di un dito si interrompe (arriva il secondo dito): niente resta a metà. */
  function annullaGesto(t = st.trascina) {
    st.trascina = null;
    st.percorso = null;
    el.riquadro.classList.remove('trascina');
    if (!t) return;
    if (t.modo === 'disegno' && t.iniziale) {
      if (t.gruppo === 'luci') { const { luce: _, ...senza } = st.scena; st.scena = t.iniziale.luce ? { ...senza, luce: t.iniziale.luce } : senza; st.luceCache = null; } else st.scena = t.gruppo === 'nebbia' ? { ...st.scena, nebbia: { ...st.scena.nebbia, coperti: t.iniziale.nebbia } } : { ...st.scena, muri: t.iniziale.muri, terreno: t.iniziale.terreno };
      ridisegna(['aree', 'sopra']);
    }
    if (t.modo === 'calibra') st.calibrazione = null;
    ridisegna(['sopra']);
  }
  const tokenSotto = (m) => {
    const ordine = [...st.scena.token].sort((a, b) => (a.id === st.selezionato) - (b.id === st.selezionato));
    return ordine.reverse().find((t) => tokenSottoPunto(st.scena.griglia, t, m.x, m.y)) ?? null;
  };
  const pezzoDi = (t) => st.mappaPezzi.get(chiaveRif(t.rif)) ?? null;
  // nome, PV e Stati al passaggio del mouse; con un token scelto, il percorso verso il quadretto sotto il puntatore
  const nascondiSuggerimento = () => { el.suggerimento.hidden = true; };
  const suggerisci = (e) => {
    if (!st.scena) return nascondiSuggerimento();
    const p = punto(e);
    const m = mappaDaSchermo(st.cam, p.x, p.y);
    aggiornaPercorso(m);
    // 07/10: il Q sotto il puntatore per l'anteprima della porta
    if (M.strumento === 'porta') { const q = qVicino(m); if (q.join() !== st.portaSotto?.join()) { st.portaSotto = q; ridisegna(['aree']); } }
    if (e.pointerType !== 'mouse') return nascondiSuggerimento();
    const t = tokenSotto(m);
    if (!t) return nascondiSuggerimento();
    const pz = pezzoDi(t);
    const righe = [pz?.nome ?? t.nome ?? t.id,
      pz?.pv ? `PV ${pz.pv.attuali}/${pz.pv.massimo}` : null,
      pz?.stati?.length ? pz.stati.map((x) => x.nome).join(', ') : null,
      pz?.diTurno ? 'di turno' : null, t.nascosto ? 'nascosto ai giocatori' : null, pz ? null : 'fuori dallo scontro'].filter(Boolean);
    el.suggerimento.textContent = righe.join(' · ');
    el.suggerimento.style.left = `${Math.min(p.x + 14, el.riquadro.clientWidth - 220)}px`;
    el.suggerimento.style.top = `${p.y + 16}px`;
    el.suggerimento.hidden = false;
  };
  /** Percorso mostrato mentre il puntatore passa sopra l'area del token scelto. */
  function aggiornaPercorso(m) {
    st.puntatore = m;
    if (liberoConMaiusc()) { if (st.percorso) { st.percorso = null; ridisegna(['sopra']); } return; }
    const info = areaScelta();
    const tok = info ? st.scena.token.find((x) => x.id === info.token) : null;
    let nuovo = null;
    if (tok && info.area) {
      const q = posizioneVerso(tok, m);
      const costo = costoDentro(info, q);
      if (costo < Infinity && (q[0] !== tok.q[0] || q[1] !== tok.q[1])) nuovo = { punti: percorso(info.area, q), costo, ingombro: tok.ingombro, fascia: fasciaDi(costo, info.rimaste), q };
    }
    const prima = st.percorso?.q?.join() ?? null;
    if ((nuovo?.q?.join() ?? null) === prima) return;
    st.percorso = nuovo;
    ridisegna(['sopra']);
  }
  const suEsce = () => { nascondiSuggerimento(); st.puntatore = null; if (st.percorso && !st.trascina) { st.percorso = null; ridisegna(['sopra']); } };
  // trascinamento dall'elenco dei pezzi senza token
  const suSopra = (e) => { if ([...e.dataTransfer.types].includes(TIPO_TRASCINA)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } };
  const suLascia = (e) => {
    const chiave = e.dataTransfer.getData(TIPO_TRASCINA);
    if (!chiave || !st.scena) return;
    e.preventDefault();
    const p = punto(e);
    piazza(chiave, mappaDaSchermo(st.cam, p.x, p.y));
  };
  /** Clic destro sul token (§12): Passo / Corri / Scatta, Annulla ultimo movimento, Nascondi, Carta, Togli. */
  const suMenu = (e) => {
    if (!st.scena) return;
    e.preventDefault();
    menuSu(punto(e));
  };
  /** Menu del token nel punto p del riquadro (clic destro, o pressione lunga sul tablet). */
  function menuSu(p) {
    const tok = tokenSotto(mappaDaSchermo(st.cam, p.x, p.y));
    if (!tok) { menuMappa(p); return; }
    if (st.selezionato !== tok.id) scegli(tok.id);
    const pz = pezzoDi(tok);
    const mov = pz?.movimento;
    const ultimo = st.scena.movimenti.some((x) => x.token === tok.id);
    const conScontro = !!st.fonti?.scontro;
    const pg = pz?.tipo === 'pg';
    // A.129: Corsa e Scatto spenti dopo un Passo cominciato o un blocco già fatto
    const info = mov ? (st.area?.token === tok.id ? st.area : infoArea(tok)) : null;
    const bloccata = (f) => !!info && (info.escluse?.includes(f) || !!info.chiusa);
    const titoloBloccata = info?.chiusa ? `${NOMI_FASCE[info.chiusa]} già fatta: movimento finito` : 'Passo già cominciato: Corsa e Scatto sono un blocco unico';
    const id = tok.rif?.id;
    const nome = pz?.nome ?? tok.nome ?? tok.id;
    const ultimaVoce = st.scena.annulla.at(-1);
    const motivoFermo = !mov ? 'Senza movimento: pezzo fuori dallo scontro o senza scheda' : null;
    // le voci del token (data/mappa.json → menu.token dice ordine e gruppi; qui solo cosa fanno e quando si possono usare)
    const fabbriche = {
      passo: () => ({ testo: 'Passo', azione: () => cambiaFascia(1), scelta: st.fascia === 1, disabilitata: !mov, titolo: motivoFermo ?? `Area fino al Passo (${mov.passo} Q)` }),
      corsa: () => ({ testo: 'Corsa', azione: () => cambiaFascia(2), scelta: st.fascia === 2, disabilitata: !Number.isFinite(mov?.corsa) || bloccata('corsa'), titolo: motivoFermo ?? (bloccata('corsa') ? titoloBloccata : 'Amplia l’area fino alla Corsa (un blocco unico: i Q non usati si perdono)') }),
      scatto: () => ({ testo: 'Scatto', azione: () => cambiaFascia(3), scelta: st.fascia === 3, disabilitata: !Number.isFinite(mov?.scatto) || bloccata('scatto'), titolo: motivoFermo ?? (bloccata('scatto') ? titoloBloccata : 'Amplia l’area fino allo Scatto (un blocco unico: i Q non usati si perdono)') }),
      libero: () => ({ testo: 'Libero', azione: () => cambiaFascia(LIBERO), scelta: st.fascia === LIBERO, titolo: 'In qualunque quadretto, senza area e senza conteggio (scorciatoia: tieni premuto Maiusc)' }),
      annulla_movimento: () => (ultimo ? { testo: 'Annulla ultimo movimento', tasto: ultimaVoce?.tipo === 'movimento' && ultimaVoce.token === tok.id ? 'Ctrl+Z' : null, azione: () => annullaMovimentoUi(tok.id) } : null),
      nuovo_turno: () => (conScontro ? null : { testo: 'Nuovo turno', titolo: 'Senza scontro: il movimento di questo token riparte da 0', azione: () => nuovoTurnoUi(tok.id) }),
      // fase 2, lotto 5: salire su un veicolo accanto (conducente se è un PG e il posto è libero, passeggero se ci sono posti)
      sali: () => {
        if (tok.rif.tipo !== 'partecipante') return null;
        const voci = veicoliVicini(st.scena, tok).flatMap((v) => {
          const pv = pezzoDi(v);
          const bordo = aBordo(v);
          const posti = pv?.posti ?? { conducente: 1, passeggeri: 0 };
          return [
            pg && bordo.filter((x) => x.ruolo === 'conducente').length < posti.conducente ? { testo: `Sali su ${nomeTok(v)} come conducente`, chiave: `sali:${v.id}:conducente`, titolo: 'Diventa il conducente nella scheda del veicolo; costo in Azioni da definire (A.145)', azione: () => saliUi(tok.id, v.id, 'conducente') } : null,
            bordo.filter((x) => x.ruolo === 'passeggero').length < posti.passeggeri ? { testo: `Sali su ${nomeTok(v)} come passeggero`, chiave: `sali:${v.id}:passeggero`, titolo: 'Il token sparisce dalla mappa e va con il veicolo; costo in Azioni da definire (A.145)', azione: () => saliUi(tok.id, v.id, 'passeggero') } : null,
          ].filter(Boolean);
        });
        return voci.length ? voci : null;
      },
      andature: () => {
        const rec = tok.rif.tipo === 'veicolo' ? recordVeicolo(tok) : null;
        if (!rec) return null;
        return ctx.dati.veicoli.andature.elenco.map((a) => ({ testo: `Andatura ${a.nome}`, chiave: `andatura:${a.id}`, scelta: rec.mezzo?.andatura === a.id, titolo: rec.mezzo?.andatura === a.id ? 'Andatura attuale' : 'Nello scontro: una fascia per Round (Veicoli §2.1)', azione: () => andaturaUi(tok, a.id) }));
      },
      ruota_veicolo: () => (tok.rif.tipo === 'veicolo' ? [
        { testo: 'Ruota a sinistra', tasto: '←', chiave: 'ruota:-1', azione: () => ruotaVeicoloUi(tok.id, -1) },
        { testo: 'Ruota a destra', tasto: '→', chiave: 'ruota:1', azione: () => ruotaVeicoloUi(tok.id, 1) },
      ] : null),
      // ritocchi del 08/10: prima tutte le discese (gruppo «Scendi»), poi tutte le linee di tiro (gruppo «Linea di tiro»)
      scendi_bordo: () => (tok.rif.tipo === 'veicolo' && aBordo(tok).length ? aBordo(tok).map((x) => ({ testo: `${nomeTok(x)}${x.ruolo === 'conducente' ? ' (conducente)' : ''}…`, chiave: `scendi:${x.id}`, titolo: 'Scende: poi un clic su un quadretto libero accanto al veicolo', azione: () => iniziaScendi(tok.id, x.id) })) : null),
      linea_bordo: () => (tok.rif.tipo === 'veicolo' && aBordo(tok).length ? aBordo(tok).map((x) => ({ testo: nomeTok(x), chiave: `linea:${x.id}`, titolo: 'Linea di tiro dal veicolo, dal suo quadretto più favorevole', azione: () => lineaPasseggero(tok.id, x.id) })) : null),
      attacca: () => {
        if (conScontro && st.planciaBarra?.puoAttaccare?.(id)) return { testo: 'Attacca!', titolo: 'Il pannello «Attacca!» del nemico; con la linea di tiro fissata, bersaglio, distanza e Copertura già scelti', azione: () => st.planciaBarra.attaccaContro(id, st.linea?.da === tok.id ? st.scena.token.find((x) => x.id === st.linea.a)?.rif?.id ?? null : null) };
        if (pg && recordPg(pz)) return { testo: 'Attacca! (scheda)', titolo: 'L’attacco di un PG si fa dalla sua scheda, tab Combattimento; con la linea di tiro fissata, il bersaglio è già scelto', azione: () => {
          // ritocchi del 07/10: con la linea di tiro da questo token, il bersaglio (nemico dello scontro) già proposto
          const bTok = st.linea?.da === tok.id ? st.scena.token.find((x) => x.id === st.linea.a) : null;
          if (bTok?.rif?.tipo === 'partecipante') {
            try { sessionStorage.setItem(CHIAVE_DALLA_MAPPA, JSON.stringify({ nome: pz.nome, soloBersaglio: true, bersaglio: pezzoDi(bTok)?.nome ?? null, bersaglioId: bTok.rif.id, quando: Date.now() })); } catch { /* senza: si sceglie nel pannello */ }
          }
          apriSchedaToken(tok);
        } };
        return null;
      },
      // fase 2, lotto 2 (A.125): le porte adiacenti, 1 AzP ciascuna (la bloccata non si apre: «Sblocca» è del master)
      porta_token: () => porteVicine(st.scena, tok).filter((porta) => porta.stato !== 'bloccata').map((porta) => ({ testo: `${porta.stato === 'aperta' ? 'Chiudi' : 'Apri'} la porta`, chiave: `porta:${porta.id}`, tasto: `${ctx.dati.mappa.porte.costo_azp} AzP`, titolo: 'Adiacente, con una mano libera, senza Prova (A.125)', azione: () => portaToken(tok, porta, porta.stato === 'aperta' ? 'chiudi' : 'apri') })),
      linea: () => ({ testo: 'Linea di tiro', tasto: 'L', titolo: 'Distanza, vista e Copertura verso il mouse o un token (Giocatore §5.8, §5.11)', azione: () => iniziaLinea(tok.id) }),
      area: () => (mov ? { testo: st.mostraArea ? 'Nascondi area' : 'Mostra area', tasto: 'M', azione: () => cambiaMostraArea() } : null),
      zoc: () => ({ testo: st.mostraZoc ? 'Nascondi ZoC' : 'Mostra ZoC', tasto: 'Z', titolo: 'Zone di controllo degli avversari: uscendone si provoca un Attacco di Opportunità (§5.3)', azione: () => cambiaMostraZoc() }),
      template_qui: () => ({ testo: 'Template da qui…', tasto: 'T', titolo: 'Un template con l’origine sul token (raggio, cono, linea…)', azione: () => nuovoTemplateUi([...tok.q]) }),
      mini_scheda: () => (pz ? { testo: 'Apri mini-scheda', tasto: 'clic', azione: () => apriCarta(tok) } : null),
      scheda_completa: () => (pg && recordPg(pz) ? { testo: 'Apri scheda completa', tasto: 'Ctrl+clic', titolo: 'La scheda del PG, con «Torna alla mappa»', azione: () => apriSchedaToken(tok) } : null),
      nascondi: () => ({ testo: tok.nascosto ? 'Mostra ai giocatori' : 'Nascondi ai giocatori', azione: () => cambiaToken(tok.id, (x) => ({ ...x, nascosto: !x.nascosto })) }),
      colore_bordo: () => (pz ? { testo: 'Colore del bordo…', azione: () => coloreBordo(tok.id) } : null),
      selezione_token: () => ({ testo: st.gruppo.has(tok.id) ? 'Togli dalla selezione' : 'Aggiungi alla selezione', tasto: 'Maiusc+clic', titolo: 'Selezione multipla: trascinando uno dei selezionati si spostano tutti, liberi e in formazione', azione: () => cambiaGruppo(alternaSelezione(!st.gruppo.size && st.selezionato && st.selezionato !== tok.id ? new Set([st.selezionato]) : st.gruppo, tok.id)) }),
      luce_token: () => ({ testo: tok.luce ? `Luce portata: ${tok.luce} Q…` : 'Porta una luce…', titolo: 'Torcia, lanterna…: la zona attorno al token diventa Luce e lo segue', azione: () => luceToken(tok) }),
      togli_token: () => ({ testo: 'Togli dalla mappa…', pericolo: true, titolo: 'Con conferma; resta nello scontro', azione: async () => {
        if (await chiedi({ titolo: `Togliere ${nome} dalla mappa?`, testo: 'Resta nello scontro: lo rimetti dai «senza token» del gruppo «Mappa». Ctrl+Z lo riporta qui.', si: 'Togli', pericolo: true })) togliToken(tok.id);
      } }),
    };
    apriMenu(p, nome, componiMenu(MENU.token, fabbriche));
  }
  const suTasto = (e) => {
    if (inCampo(e)) return;
    // 07/10: Maiusc premuto = Libero per il token scelto (l'area sparisce); rilasciato, si torna alla modalità di prima
    if (e.key === 'Shift') { cambiaMaiusc(true); return; }
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey && (document.activeElement === document.body || document.activeElement === el.riquadro || document.activeElement === el.bordo)) {
      e.preventDefault();
      scegliDisposizione(prossimaDisposizione(st.disp.disposizione, e.shiftKey ? -1 : 1));
      return;
    }
    // Ctrl+Z (lotto 5): annulla l'ultima azione del master (movimento, muro, nebbia, token messo o tolto)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') { e.preventDefault(); if (st.scena) annullaUi(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'm' || e.key === 'M') { e.preventDefault(); cambiaMostraArea(); return; }
    if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); cambiaMostraZoc(); return; }
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); cambiaMostraPv(); return; }
    if ((e.key === 'a' || e.key === 'A') && !e.shiftKey) { e.preventDefault(); adattaSchermo(); return; }
    if (frecciaTemplate(e)) return;
    if (frecciaPorta(e)) return;
    if (frecciaVeicolo(e)) return;
    if (e.key === 'Escape' && st.scendi) { e.preventDefault(); st.scendi = null; ridisegna(['sopra']); avviso('Discesa annullata.', { chiave: 'scendi' }); return; }
    // 07/10: le frecce spostano il gruppo selezionato di 1 Q (un Ctrl+Z per passo)
    if (st.gruppo.size && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      muoviGruppo({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]);
      return;
    }
    if (e.key === 'Escape' && st.gruppo.size && !menuAperto()) { e.preventDefault(); cambiaGruppo(new Set()); return; }
    if (e.shiftKey && e.key.toLowerCase() === ctx.dati.mappa.template.tasto && st.scena) { e.preventDefault(); cambiaSovrapposizioni('master', 'nascoste'); return; }
    if (e.key.toLowerCase() === ctx.dati.mappa.template.tasto && st.scena && !st.tpl.anteprima) { e.preventDefault(); nuovoTemplateUi(); return; }
    if (e.key === 'Escape' && st.tpl.anteprima) { e.preventDefault(); annullaPiazzamento(); return; }
    if (e.key === 'Escape' && st.linea) { e.preventDefault(); chiudiLinea(); return; }
    if (e.key.toLowerCase() === ctx.dati.mappa.visuale.tasto && e.shiftKey && st.scena) { e.preventDefault(); cambiaDettaglioLinea(); return; }
    if (e.key.toLowerCase() === ctx.dati.mappa.visuale.tasto && !e.shiftKey && st.scena) { e.preventDefault(); if (st.linea) chiudiLinea(); else iniziaLinea(st.selezionato); return; }
    if (e.key === '?') { e.preventDefault(); apriAiuto(); return; }
    if (e.key === 'Escape' && (el.strumenti.open || el.altro.open)) { el.strumenti.open = false; el.altro.open = false; return; }
    if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') { e.preventDefault(); zoomCentro(V.passo_tasti); } else if (e.key === '-' || e.code === 'NumpadSubtract') { e.preventDefault(); zoomCentro(1 / V.passo_tasti); } else if (e.code === 'Space') {
      e.preventDefault(); // niente scorrimento della pagina
      if (!st.spazio) { st.spazio = true; el.riquadro.classList.add('spazio'); }
    } else if (e.key === 'Escape') {
      if (menuAperto()) chiudiMenuToken();
      else if (st.strumento === 'calibra') impostaStrumento('sposta');
      else if (disegnoAttivo()) { N.strumento = null; M.strumento = null; L.strumento = null; dopoStrumento(); } else if (st.daPiazzare) { st.daPiazzare = null; el.riquadro.classList.remove('piazza'); disegnaPannelli(); } else if (st.selezionato) scegli(null); else if (st.cartaAperta) chiudiCarta(); // 07/10: Esc prima lascia il token, poi chiude la mini-scheda
    }
  };
  const suRilasciaTasto = (e) => {
    if (e.code === 'Space') { st.spazio = false; el.riquadro.classList.remove('spazio'); }
    if (e.key === 'Shift') cambiaMaiusc(false);
  };
  // la finestra perde il fuoco con Maiusc premuto (Alt+Tab): il tasto non torna su, lo si rilascia qui
  const suSfuoca = () => cambiaMaiusc(false);
  window.addEventListener('blur', suSfuoca);
  const gesti = creaGesti(el.riquadro, {
    vista: V, camera: () => st.cam, cambiaCamera, adatta: adattaSchermo,
    premi, muovi, rilascia, annulla: () => annullaGesto(),
    // doppio clic del mouse: «Adatta» solo su un punto vuoto, senza strumenti attivi e senza un token scelto
    vuoto: (p) => !disegnoAttivo() && st.strumento !== 'calibra' && !!st.scena && !st.selezionato && !tokenSotto(mappaDaSchermo(st.cam, p.x, p.y)),
  });
  el.riquadro.addEventListener('pointerleave', suEsce);
  el.riquadro.addEventListener('dragover', suSopra);
  el.riquadro.addEventListener('drop', suLascia);
  el.riquadro.addEventListener('contextmenu', suMenu);
  window.addEventListener('keydown', suTasto);
  window.addEventListener('keyup', suRilasciaTasto);

  // ── Lotto 6: barra accanto alla mappa, disposizioni, barra dell'Iniziativa (§11, §11.1) ──
  function applicaDisposizione() {
    const totale = el.corpo.clientWidth;
    if (!totale) return;
    el.laterale.style.width = `${larghezzaBarra(st.disp, totale, B)}px`;
    el.pagina.dataset.disposizione = st.disp.disposizione;
    for (const d of DISPOSIZIONI) { el.btnDisp[d].classList.toggle('scelto', d === st.disp.disposizione); el.btnDisp[d].setAttribute('aria-pressed', String(d === st.disp.disposizione)); }
    const ridotta = st.disp.disposizione === 'mappa';
    el.ridotta.hidden = !ridotta;
    el.piena.hidden = ridotta;
    if (ridotta) disegnaRidotta();
  }
  function scegliDisposizione(d) {
    st.disp = { ...st.disp, disposizione: d };
    scriviLocale(chiaveDisp, st.disp);
    applicaDisposizione();
  }
  /** Segnalibro: porta alla sezione del gruppo, che diventa quello evidenziato. */
  function vaiAlGruppo(k) {
    if (st.disp.disposizione === 'mappa') scegliDisposizione('equilibrata');
    el.gruppi[k].scrollIntoView({ block: 'start' });
    segnaGruppo(k);
  }
  function segnaGruppo(k) {
    for (const [n, b] of Object.entries(el.segnalibri)) { b.classList.toggle('attivo', n === k); b.setAttribute('aria-current', n === k ? 'true' : 'false'); }
  }
  /** Il segnalibro segue lo scorrimento: il gruppo la cui sezione è in cima alla barra. */
  const suScorriBarra = () => {
    const cima = el.piena.getBoundingClientRect().top + el.piena.querySelector('.laterale-segnalibri').offsetHeight + 8;
    let attivo = GRUPPI_BARRA[0][0];
    for (const [k] of GRUPPI_BARRA) if (el.gruppi[k].getBoundingClientRect().top <= cima) attivo = k;
    segnaGruppo(attivo);
  };
  el.piena.addEventListener('scroll', suScorriBarra, { passive: true });

  // il bordo: trascinato allarga o stringe la barra (sotto una certa larghezza torna «Mappa grande»), doppio clic cambia
  const bordo = { attivo: null };
  const suPremiBordo = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    bordo.attivo = e.pointerId;
    el.bordo.setPointerCapture(e.pointerId);
    el.pagina.classList.add('trascina-bordo');
  };
  const suMuoviBordo = (e) => {
    if (bordo.attivo !== e.pointerId) return;
    const r = el.corpo.getBoundingClientRect();
    st.disp = trascinaBordo(st.disp, r.right - e.clientX, r.width, B);
    applicaDisposizione();
  };
  const suLasciaBordo = (e) => {
    if (bordo.attivo !== e.pointerId) return;
    bordo.attivo = null;
    el.pagina.classList.remove('trascina-bordo');
    scriviLocale(chiaveDisp, st.disp);
  };
  const suDoppioBordo = () => scegliDisposizione(prossimaDisposizione(st.disp.disposizione));
  el.bordo.addEventListener('pointerdown', suPremiBordo);
  el.bordo.addEventListener('pointermove', suMuoviBordo);
  el.bordo.addEventListener('pointerup', suLasciaBordo);
  el.bordo.addEventListener('pointercancel', suLasciaBordo);
  el.bordo.addEventListener('dblclick', suDoppioBordo);
  const togliBordo = () => { for (const [ev, f] of [['pointerdown', suPremiBordo], ['pointermove', suMuoviBordo], ['pointerup', suLasciaBordo], ['pointercancel', suLasciaBordo], ['dblclick', suDoppioBordo]]) el.bordo.removeEventListener(ev, f); };
  const osservaCorpo = new ResizeObserver(() => applicaDisposizione());
  osservaCorpo.observe(el.corpo);
  applicaDisposizione();
  segnaGruppo(GRUPPI_BARRA[0][0]);

  /** La plancia intera nella barra (src/ui/tavolo.js, ctx.inMappa): tutto quello che fa a pagina intera. */
  function montaPlanciaBarra() {
    if (st.planciaBarra) return;
    st.planciaBarra = renderTavolo(el.piena, {
      dati: ctx.dati,
      inMappa: { sezioni: el.slot, centra: (chiave) => centraSuPezzo(chiave), collegamento: () => (st.scena ? { ...st.scena.collegamento, nomeBozza: st.fonti?.bozza?.nome ?? null } : null) },
      azioni: {
        personaggi: () => ctx.azioni.personaggi?.(),
        // «Prepara la mappa» sulla scena già aperta: si rilegge, con il nuovo collegamento
        mappa: (id) => (id === ctx.id ? location.reload() : ctx.azioni.mappa?.(id)),
        apri: (r) => apriSchedaCompleta(r),
        planciaIntera: () => apriPlanciaIntera(),
      },
    });
  }
  /** «Plancia intera»: la plancia a pagina intera con «Torna alla mappa» (sulla mini-scheda aperta, se c'è). */
  function apriPlanciaIntera() {
    if (st.salvataggio.modificata) salvaOra();
    segnaDallaMappa(sessionStorage, { scena: ctx.id, carta: st.cartaAperta, vista: vistaAttuale() });
    ctx.azioni.tavolo();
  }

  /** Barra dell'Iniziativa del master: dallo scontro aperto letto dalle fonti (nessuna barra con una bozza). */
  // dichiarazioni di funzione (non const): applicaDisposizione le usa già all'avvio, se lo schermo ricorda «Mappa grande»
  function barraAttuale() { return st.scena ? barraIniziativa({ scontro: st.fonti?.scontro ?? null, pezzi: st.pezzi, scena: st.scena, bordoDi }) : null; }
  function disegnaIniziativa() {
    const barra = barraAttuale();
    el.iniziativa.hidden = !barra;
    if (barra) {
      svuota(el.iniziativa, barraIniziativaEl(barra, {
        pxPerPunto: B.iniziativa_px_per_punto,
        pv: st.mostraPv,
        zero: ctx.dati.mappa.pv_zero,
        avanti: () => avantiDallaMappa(),
        indietro: st.planciaBarra?.indietro ? () => indietroDallaMappa() : null,
        puoIndietro: st.planciaBarra?.puoIndietro?.() ?? null,
        reimposta: st.planciaBarra?.reimposta ? () => reimpostaDallaMappa() : null,
        daTirare: st.planciaBarra?.chiediIniziativa && st.fonti?.scontro ? { nomi: ordineIniziativa(st.fonti.scontro).daTirare.map((p) => p.nome), chiedi: async () => { await st.planciaBarra.chiediIniziativa(); await aggiornaFonti(); } } : null,
        scegli: (v) => scegliDallaBarra(v),
        centra: { attivo: st.centra, cambia: (x) => { st.centra = x; scriviLocale('mutant-mappa-centra-turno', x); disegnaIniziativa(); if (x) seguiTurno(true); } },
      }));
      const sc = pezzoScelto()?.chiave;
      for (const b of el.iniziativa.querySelectorAll('.mini-token')) b.classList.toggle('scelto', !!sc && b.dataset.chiave === sc);
    }
    if (st.disp.disposizione === 'mappa') disegnaRidotta(barra);
  }
  function pezzoScelto() { const t = st.selezionato ? st.scena?.token.find((x) => x.id === st.selezionato) : null; return t ? pezzoDi(t) : null; }
  /** «Mappa grande»: colonna stretta con i mini-token (in ordine d'Iniziativa, se c'è lo scontro), i PV e il turno. */
  function disegnaRidotta(barra = barraAttuale()) {
    const voci = barra ? barra.voci : st.pezzi.filter((p) => st.scena?.token.some((t) => chiaveRif(t.rif) === p.chiave)).map((p) => ({ chiave: p.chiave, nome: p.nome, iniziali: p.iniziali, lato: p.lato, ritratto: p.ritratto, pv: p.pv, diTurno: p.diTurno, bordo: bordoDi(p), token: st.scena.token.find((t) => chiaveRif(t.rif) === p.chiave)?.id ?? null, nascosto: !!st.scena.token.find((t) => chiaveRif(t.rif) === p.chiave)?.nascosto }));
    const scelto = pezzoScelto()?.chiave;
    svuota(el.ridotta,
      barra ? h('p', { class: 'ridotta-round' }, `R ${barra.round}`) : null,
      voci.map((v) => {
        const quota = v.pv?.massimo > 0 ? Math.max(0, Math.min(1, v.pv.attuali / v.pv.massimo)) : null;
        const titolo = `${v.nome}${v.pv ? ` · PV ${v.pv.attuali}/${v.pv.massimo}` : ''}${v.diTurno ? ' · di turno' : ''}${v.nascosto ? ' · nascosto ai giocatori' : ''}`;
        return h('button', { type: 'button', class: `ridotta-voce${v.diTurno ? ' di-turno' : ''}${v.chiave === scelto ? ' scelto' : ''}`, title: titolo, 'aria-label': titolo, onclick: () => scegliDallaBarra(v) },
          h('span', { class: `mini-token lato-${v.lato ?? 'nessuno'}${stileBordo(v.bordo).classi}${v.diTurno ? ' di-turno' : ''}${v.nascosto ? ' nascosto' : ''}`, style: stileBordo(v.bordo).stile }, v.ritratto ? h('img', { src: v.ritratto, alt: '' }) : h('span', { class: 'iniziali' }, v.iniziali),
            // 07/10: l'icona a 0 PV, come sul token
            (v.aZero ?? st.pezzi.find((p) => p.chiave === v.chiave)?.aZero) ? h('img', { class: 'icona-zero', src: v.lato === 'pg' ? ctx.dati.mappa.pv_zero.pg : ctx.dati.mappa.pv_zero.nemico, alt: '' }) : null),
          quota !== null ? h('span', { class: 'pv-mini', style: `--quota: ${quota}` }) : null);
      }));
  }
  /** Clic su un mini-token (barra dell'Iniziativa o colonna ridotta): token scelto in mappa, mini-scheda aperta. */
  function scegliDallaBarra(v) {
    const t = v.token ? st.scena.token.find((x) => x.id === v.token) : null;
    if (t) { scegli(t.id); centraToken(t, { soloSeFuori: true }); }
    apriCartaChiave(v.chiave);
  }
  /** «Avanti» della barra dell'Iniziativa: lo stesso della plancia (stessa coda e stessa revisione dello scontro). */
  async function avantiDallaMappa() {
    if (!st.planciaBarra?.avanti) return;
    await st.planciaBarra.avanti();
    await aggiornaFonti();
  }
  /** «Indietro» della barra (07/10): lo stesso della plancia; i template scaduti tornano con scadiTemplate. */
  async function indietroDallaMappa() {
    if (!st.planciaBarra?.indietro) return;
    await st.planciaBarra.indietro();
    await aggiornaFonti();
  }
  /** «Reimposta Iniziativa» della barra (07/10): la stessa della plancia (stessa coda e stessa revisione dello scontro). */
  async function reimpostaDallaMappa() {
    if (!st.planciaBarra?.reimposta) return;
    if (await st.planciaBarra.reimposta()) await aggiornaFonti();
  }
  /**
   * «Centra» dall'ordine d'Iniziativa della barra (⌖ o doppio clic sul nome; ritocchi del 07/10): la mappa si centra sul
   * token, con lo zoom di data/mappa.json → iniziativa.centra_px_per_q, e lo sceglie; senza token, un avviso.
   */
  function centraSuPezzo(chiave) {
    const t = st.scena?.token.find((x) => chiaveRif(x.rif) === chiave);
    const nome = st.pezzi.find((p) => p.chiave === chiave)?.nome ?? chiave.replace(/^partecipante:/, '');
    if (!t) { avviso(`${nome} non è sulla mappa: mettilo con «Metti» in «Senza token» (gruppo «Mappa»).`, { chiave: 'centra' }); return; }
    const scala = Math.min(V.zoom_max, Math.max(V.zoom_min, ctx.dati.mappa.iniziativa.centra_px_per_q / st.scena.griglia.q_px));
    const c = centroToken(st.scena.griglia, t);
    const d = tela.dimensioni();
    cambiaCamera({ ...st.cam, scala, ox: d.larghezza / 2 - c.x * scala, oy: d.altezza / 2 - c.y * scala });
    scegli(t.id);
    apriCartaChiave(chiave, { riapri: false });
  }
  /**
   * Suoni nella barra in alto (07/10): ♫ «Musica di fondo» (file della cartella musica/ del server, nello scontro aperto
   * o nella bozza collegata) e ▶/⏸ della musica.
   */
  function disegnaAudio() {
    if (!el.audio) return;
    // la prima volta: muto e cursori, che poi restano (il ridisegno non interrompe il trascinamento)
    if (!el.audio.childNodes.length) { el.audio.append(el.audioMusica, el.audioMuto, ...el.audioCursori); aggiornaControlliAudio(); }
    const f = st.fonti;
    const file = f?.scontro ? f.scontro.musica ?? null : f?.bozza ? f.bozza.musica ?? null : null;
    const m = audio.statoMusica();
    const puo = !!(f?.scontro || f?.bozza);
    svuota(el.audioMusica,
      h('button', { type: 'button', class: `btn btn-piccolo${file ? ' acceso' : ''}`, disabled: !puo, title: puo ? `Musica di fondo: ${file ?? 'nessuna'} (clic per sceglierla dalla cartella musica/)` : 'Musica di fondo: collega la scena a uno scontro o a una bozza', 'aria-label': 'Musica di fondo', onclick: () => scegliMusicaUi() },
        conIcona('♫', file ? file.replace(/\.[^.]+$/, '') : 'Musica')),
      f?.scontro && file ? h('button', { type: 'button', class: 'btn btn-piccolo tondo', title: m.pausa ? 'Riprendi la musica' : 'Metti in pausa la musica', 'aria-label': m.pausa ? 'Riprendi la musica' : 'Pausa della musica', onclick: () => { audio.pausa(!m.pausa); disegnaAudio(); } }, m.pausa ? '▶' : '⏸') : null);
  }
  /** «Musica di fondo»: la scelta va nello scontro aperto (con una riga nel registro) o nella bozza collegata. */
  async function scegliMusicaUi() {
    const f = st.fonti;
    const attuale = f?.scontro?.musica ?? f?.bozza?.musica ?? null;
    const scelta = await scegliMusica(attuale, ctx.dati.mappa.audio.musica.formati);
    if (!scelta || scelta.file === attuale) return;
    try {
      if (f?.scontro && st.planciaBarra?.impostaMusica) await st.planciaBarra.impostaMusica(scelta.file);
      else if (f?.bozza) {
        const b = await leggiScontro(f.bozza.id);
        const r = await salvaScontro(cambiaBozza(b, { musica: scelta.file }));
        if (!r.scontro) throw new Error('la bozza è cambiata in un’altra finestra: riprova');
      }
    } catch (e) { avvisoErrore(`Musica non salvata: ${e.message}`); }
    audio.pausa(false);
    await aggiornaFonti();
  }
  /** Centra la vista sul token (con `soloSeFuori`, solo se è fuori dal riquadro o troppo vicino al bordo). */
  function centraToken(t, { soloSeFuori = false } = {}) {
    const g = st.scena.griglia;
    const c = centroToken(g, t);
    const d = tela.dimensioni();
    const s = schermoDaMappa(st.cam, c.x, c.y);
    const margine = Math.min(80, d.larghezza / 6, d.altezza / 6);
    if (soloSeFuori && s.x >= margine && s.x <= d.larghezza - margine && s.y >= margine && s.y <= d.altezza - margine) return;
    cambiaCamera({ ...st.cam, ox: d.larghezza / 2 - c.x * st.cam.scala, oy: d.altezza / 2 - c.y * st.cam.scala });
  }
  /** Il token di chi è di turno nello scontro aperto diventa quello scelto, con la mini-scheda (senza riaprire la barra). */
  function selezionaDiTurno() {
    const s = st.fonti?.scontro;
    const id = s ? diTurno(s)?.id : null;
    if (!id) return;
    // fase 2, lotto 5: chi è a bordo non ha un token in mappa: si sceglie il veicolo su cui si trova
    const t = st.scena.token.find((x) => chiaveRif(x.rif) === chiaveRif({ tipo: 'partecipante', id })) ?? veicoloDi(st.scena, chiaveRif({ tipo: 'partecipante', id }))?.veicolo;
    if (t) scegli(t.id);
    apriCartaChiave(chiaveRif({ tipo: 'partecipante', id }), { riapri: false });
  }
  /**
   * Al cambio di turno («Avanti» della barra o della plancia, anche da un'altra finestra) il token attivo diventa quello
   * scelto, con la sua mini-scheda e la sua area (ritocchi del 06/10: non resta scelto il precedente); con «Centra su
   * attivo» la mappa lo centra, se è fuori vista.
   */
  function seguiTurno(subito = false) {
    const s = st.fonti?.scontro;
    const chiave = s ? `${s.id}:${s.round}:${s.turno}` : null;
    const cambiato = chiave !== st.turnoVisto;
    const primo = st.turnoVisto === null;
    st.turnoVisto = chiave;
    if (!chiave || (!subito && (!cambiato || primo))) return;
    const id = diTurno(s)?.id;
    const t = id ? st.scena.token.find((x) => chiaveRif(x.rif) === chiaveRif({ tipo: 'partecipante', id })) ?? veicoloDi(st.scena, chiaveRif({ tipo: 'partecipante', id }))?.veicolo ?? null : null;
    if (!subito && !st.trascina) {
      scegli(t?.id ?? null);
      if (id) apriCartaChiave(chiaveRif({ tipo: 'partecipante', id }), { riapri: false });
    }
    if (t && st.centra) centraToken(t, { soloSeFuori: true });
  }

  // ── Vista giocatori (lotto 4): quale scena vedono, «Apri vista giocatori», codice QR ──
  let rete = null;
  leggiRete().then((r) => { rete = r; disegnaPannelloGiocatori(); });
  const indirizzoGiocatori = () => {
    const base = !rete?.soloLocale && rete?.indirizzi?.length ? rete.indirizzi[0].url : `${location.origin}${location.pathname}`;
    return `${base.replace(/\/?$/, '/')}#/mappa/giocatori`;
  };
  async function leggiScelta() {
    try {
      const r = await fetch('api/vista-giocatori/scelta', { cache: 'no-store' });
      if (r.ok) { const j = await r.json(); st.sceltaGiocatori = j.scena ?? null; st.inGioco = j.inGioco ?? null; }
    } catch { /* resta quella di prima */ }
    aggiornaIndicatoreGiocatori();
  }
  /** L'indicatore accanto al nome: i giocatori vedono questa scena? (regola del server: scenaInGioco) */
  function aggiornaIndicatoreGiocatori() {
    const mostrata = st.inGioco === ctx.id;
    el.aiGiocatori.className = `btn btn-piccolo indicatore-giocatori${mostrata ? ' mostrata' : ''}`;
    el.aiGiocatori.textContent = mostrata ? '📺 ai giocatori' : '📺 non mostrata';
    el.aiGiocatori.title = mostrata ? 'I giocatori (secondo schermo e tablet) vedono questa scena' : `I giocatori ${st.inGioco ? 'vedono un’altra scena' : 'non vedono nessuna mappa'}: clic per mostrare questa`;
  }
  async function scegliPerGiocatori(scena) {
    try {
      const r = await fetch('api/vista-giocatori/scelta', { method: 'PUT', body: JSON.stringify({ scena }), headers: { 'Content-Type': 'application/json' } });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).errore ?? `errore ${r.status}`);
      st.sceltaGiocatori = scena;
      await leggiScelta();
      // 08/10: con uno scontro aperto i giocatori vedono la sua scena; la scena segnata vale senza scontro (o con più scontri)
      avviso(st.inGioco === ctx.id ? 'I giocatori vedono questa scena.' : scena ? 'Segnata per i giocatori: la vedranno quando non c’è uno scontro aperto con un’altra scena.' : 'Nessuna scena segnata: i giocatori vedono la scena dello scontro aperto.');
    } catch (e) { avvisoErrore(`Scelta non salvata: ${e.message}`); }
    disegnaPannelloGiocatori();
  }
  function disegnaPannelloGiocatori() {
    if (!st.scena) return;
    const s = st.sceltaGiocatori;
    const url = indirizzoGiocatori();
    const qr = h('span', { class: 'qr-collega' });
    qr.innerHTML = svgQR(url, { pixel: 3 }); // SVG generato qui, dal solo indirizzo
    // 08/10: una regola sola (server.mjs → scenaInGioco): la scena dello scontro aperto; senza scontro (o con più
    // scontri) quella segnata «mostrata ai giocatori»; altrimenti nessuna
    const testo = [st.inGioco === st.scena.id ? 'I giocatori vedono questa scena.' : st.inGioco ? 'I giocatori vedono un’altra scena.' : 'I giocatori non vedono nessuna mappa.',
      s === st.scena.id ? 'È segnata «mostrata ai giocatori».' : s ? 'È segnata un’altra scena.' : 'Nessuna scena segnata.',
      'Con uno scontro aperto vedono la sua scena; altrimenti quella segnata.'].join(' ');
    svuota(el.pGiocatori,
      h('summary', {}, h('strong', {}, 'Vista giocatori')),
      h('p', { class: 'nota' }, testo),
      h('div', { class: 'mappa-azioni-token' },
        s !== st.scena.id ? h('button', { type: 'button', class: 'btn btn-piccolo primario', onclick: () => scegliPerGiocatori(st.scena.id) }, 'Mostra questa ai giocatori') : null,
        s ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Toglie il segno: senza scontro aperto i giocatori non vedono nessuna mappa', onclick: () => scegliPerGiocatori(null) }, 'Togli il segno') : null,
        h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Una finestra a parte, da trascinare sul secondo schermo e mettere a schermo intero (F11)', onclick: () => window.open('#/mappa/giocatori', 'mutant-giocatori', 'popup,width=1280,height=800') }, 'Apri vista giocatori'),
        // ritocchi del 07/10: lo schermo dei giocatori inquadra di nuovo tutta la parte scoperta
        h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Lo schermo dei giocatori inquadra tutta la parte di mappa scoperta', onclick: () => adattaGiocatori() }, 'Adatta lo schermo dei giocatori')),
      // 07/10: i giocatori vedono sempre la barretta dei PV dei PG; quella dei nemici solo se il master la mostra
      h('button', { type: 'button', role: 'switch', 'aria-checked': String(!!st.scena.pvNemiciGiocatori), class: `interruttore-mappa${st.scena.pvNemiciGiocatori ? ' acceso' : ''}`, title: 'La barretta dei PV dei nemici nella vista giocatori (quella dei PG si vede sempre)', onclick: () => cambiaPvNemiciGiocatori() },
        h('span', { class: 'interruttore-mappa-pallino', 'aria-hidden': 'true' }), `PV dei nemici ai giocatori: ${st.scena.pvNemiciGiocatori ? 'mostrati' : 'nascosti'}`),
      // diretta (07/10): area, modalità, Q usati e percorso del token scelto, e le ZoC dei suoi avversari visibili
      ...[['movimentoGiocatori', 'Mostra il movimento ai giocatori', 'L’area, la modalità, i Q usati e il percorso del token scelto anche sullo schermo dei giocatori (mai per i token nascosti o sotto la nebbia)'],
        ['zocGiocatori', 'Mostra le ZoC ai giocatori', 'Le zone di controllo degli avversari visibili del token scelto, sullo schermo dei giocatori']].map(([campo, testo, titolo]) => {
        const acceso = st.scena[campo] !== false;
        return h('button', { type: 'button', role: 'switch', 'aria-checked': String(acceso), class: `interruttore-mappa${acceso ? ' acceso' : ''}`, title: titolo, disabled: campo === 'zocGiocatori' && st.scena.movimentoGiocatori === false, onclick: () => cambiaDirettaGiocatori(campo) },
          h('span', { class: 'interruttore-mappa-pallino', 'aria-hidden': 'true' }), `${testo}: ${acceso ? 'sì' : 'no'}`);
      }),
      // ritocchi del 07/10: la stessa scelta, separata, per lo schermo dei giocatori
      (() => {
        const g = sovrapposizioni('giocatori');
        return h('div', { class: 'mappa-azioni-token' },
          h('button', { type: 'button', role: 'switch', 'aria-checked': String(!g.nascoste), class: `interruttore-mappa${!g.nascoste ? ' acceso' : ''}`, title: 'Template senza durata, muri, porte e terreno difficile sullo schermo dei giocatori', onclick: () => cambiaSovrapposizioni('giocatori', 'nascoste') },
            h('span', { class: 'interruttore-mappa-pallino', 'aria-hidden': 'true' }), `Template e muri ai giocatori: ${g.nascoste ? 'nascosti' : 'mostrati'}`),
          h('label', { title: 'Nasconde ai giocatori anche i template con durata in Round' }, h('input', { type: 'checkbox', checked: g.ancheDurata, onchange: () => cambiaSovrapposizioni('giocatori', 'ancheDurata') }), ' anche a durata'));
      })(),
      h('div', { class: 'mappa-qr' }, qr, h('small', { class: 'nota' }, url)),
      // fase 2, lotto 7: i tablet dei giocatori aprono lo stesso indirizzo e scelgono «Sono…»
      (() => {
        const imp = impostazioniTablet(st.scena, ctx.dati);
        const interruttore = (acceso, testo, titolo, fai) => h('button', { type: 'button', role: 'switch', 'aria-checked': String(acceso), class: `interruttore-mappa${acceso ? ' acceso' : ''}`, title: titolo, onclick: fai },
          h('span', { class: 'interruttore-mappa-pallino', 'aria-hidden': 'true' }), testo);
        return h('div', { class: 'mappa-tablet' },
          h('p', { class: 'nota' }, h('strong', {}, 'Tablet dei giocatori: '), 'aprono questo indirizzo (o il QR) e toccano «Sono…» per scegliere il loro PG; poi lo muovono da soli. Nessuna password: si gioca in casa.'),
          interruttore(!imp.bloccato, `Movimenti dai tablet: ${imp.bloccato ? 'bloccati' : 'permessi'}`, 'Bloccati: i tablet vedono ma non muovono', () => cambiaBloccoGiocatori()),
          interruttore(imp.movimento === 'sempre', `Quando: ${imp.movimento === 'sempre' ? 'sempre' : 'solo al proprio turno'}`, 'Solo al proprio turno dello scontro aperto, oppure sempre', () => cambiaTablet('movimento')),
          interruttore(imp.avvisoTurno, `Avviso «Tocca a te»: ${imp.avvisoTurno ? 'sì' : 'no'}`, 'Il tablet del PG di turno mostra l’avviso grande, con suono e vibrazione', () => cambiaTablet('avvisoTurno')));
      })(),
      rete?.soloLocale ? h('p', { class: 'nota' }, 'Server acceso con --solo-locale: dai tablet non si raggiunge. Riavvialo con avvia-server.bat.') : null);
  }

  // ── Avvio ──
  testoStato('Lettura della scena…');
  leggiScena(ctx.id).then(async (s) => {
    if (st.chiusa) return;
    await usaScena(s);
    st.diretta.pronta = true;
    testoStato(s.aggiornato ? `Salvata alle ${ora(new Date(s.aggiornato))}` : '');
    const vista = vistaDaRimettere(sessionStorage, ctx.id);
    // tornati sulla mappa (in qualunque modo): il segno per «Torna alla mappa» non serve più
    dimenticaMappa(sessionStorage);
    if (vista?.cam && Number.isFinite(vista.cam.scala)) cambiaCamera(vista.cam); else adattaSchermo();
    if (vista?.selezionato && st.scena.token.some((t) => t.id === vista.selezionato)) st.selezionato = vista.selezionato;
    montaPlanciaBarra();
    aggiornaBlocco();
    aggiornaSovrapposizioni();
    aggiornaVociIniziale();
    aggiornaVoceMostraPv();
    await Promise.all([aggiornaFonti(), leggiScelta()]);
    // aperta da «Prepara scontro» → «Prepara la mappa»: se c'è una posizione iniziale, si propone di partire da quella
    let proponi = null;
    try { proponi = sessionStorage.getItem('mutant-mappa-proponi-iniziale'); sessionStorage.removeItem('mutant-mappa-proponi-iniziale'); } catch { /* niente */ }
    if (proponi === ctx.id && st.scena?.iniziale && await chiedi({ titolo: 'Partire dalla posizione iniziale?', testo: `Questa scena ha una posizione iniziale salvata il ${quandoIniziale()}: token, porte, template e nebbia.`, si: 'Parti da quella', no: 'Lascia com’è' })) ripristinaInizialeUi({ chiedendo: false });
    disegnaPannelloNebbia();
    disegnaPannelloMuri();
    // difetto del 07/10: la sezione «Luci» non si disegnava mai all'apertura e restava vuota
    disegnaPannelloLuci();
    disegnaPannelloGiocatori();
    if (vista?.carta) { const t = st.scena.token.find((x) => chiaveRif(x.rif) === vista.carta); if (t) apriCarta(t); }
    // difetto 2 del collaudo del lotto 7: aprendo o ricaricando la pagina senza una vista da rimettere, il token di turno
    // dello scontro aperto torna scelto, con la mini-scheda e l'area
    else if (!vista?.selezionato) selezionaDiTurno();
  }).catch((e) => {
    if (st.chiusa) return;
    svuota(radice, h('section', { class: 'mappa-pagina' }, h('p', { class: 'riquadro attenzione' }, `Scena non trovata: ${e.message}. `,
      h('button', { type: 'button', class: 'btn', onclick: () => ctx.azioni.tavolo() }, '← Tavolo'))));
  });

  // fase 2, lotto 7: i movimenti dai tablet arrivano entro un secondo
  const giroRevisione = setInterval(() => controllaRevisione(), 1000);
  const giro = setInterval(async () => {
    aggiornaFonti();
    const prima = [st.sceltaGiocatori, st.inGioco].join();
    await leggiScelta();
    if ([st.sceltaGiocatori, st.inGioco].join() !== prima) disegnaPannelloGiocatori();
  }, INTERVALLO_FONTI_MS);

  // verifica della persistenza (07/10): la finestra va in secondo piano o si chiude: le modifiche non ancora salvate
  // (si salvano 600 ms dopo l'ultima) partono subito; chiudendo, con keepalive (la richiesta sopravvive alla pagina)
  const suNascosta = () => { if (document.visibilityState === 'hidden' && st.salvataggio.modificata) salvaOra(); };
  const suChiusura = () => { if (st.salvataggio.modificata) salvaOra({ keepalive: true }); };
  document.addEventListener('visibilitychange', suNascosta);
  window.addEventListener('pagehide', suChiusura);

  return () => {
    document.removeEventListener('visibilitychange', suNascosta);
    window.removeEventListener('pagehide', suChiusura);
    // la vista giocatori perde la diretta quando il master lascia la mappa
    if (st.diretta.chiave !== 'nessuna') { st.diretta.inVolo = false; mandaDiretta(null); }
    st.chiusa = true;
    audio.chiudi();
    clearInterval(giro);
    clearInterval(giroRevisione);
    if (st.salvataggio.modificata) salvaOra();
    gesti.distruggi();
    chiudiMenuToken();
    st.plancia?.();
    st.planciaBarra?.();
    osservaCorpo.disconnect();
    togliBordo();
    window.removeEventListener('keydown', suTasto);
    window.removeEventListener('resize', suFinestra);
    window.removeEventListener('mutant:scene-ricollegate', suRicollegate);
    window.removeEventListener('keyup', suRilasciaTasto);
    window.removeEventListener('blur', suSfuoca);
    tela.distruggi();
    st.immagine?.close?.();
  };
}
