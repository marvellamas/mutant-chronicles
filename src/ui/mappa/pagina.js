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
import { cameraIniziale, zoomVerso, sposta, adatta, mappaDaSchermo, schermoDaMappa, rettangoloVisibile, mantieniCentro } from '../../mappa/camera.js';
import { DISPOSIZIONI, NOMI_DISPOSIZIONI, prossimaDisposizione, normalizzaDisposizione, larghezzaBarra, trascinaBordo, chiaveSchermo } from '../../mappa/disposizione.js';
import { barraIniziativa } from '../../mappa/iniziativa.js';
import { barraIniziativaEl, stileBordo } from './barra-iniziativa.js';
import { bordoToken, assegnaColori, cambiaColore, tavolozzaPer, famiglia } from '../../mappa/colori.js';
import { scegliColore, chiedi, informa } from '../finestrella.js';
import { calibraDaQuadretto, applicaGriglia, dimensioniMappa, lineeVisibili, testoScala } from '../../mappa/griglia.js';
import { creaTela } from './canvas.js';
import { leggiScena, salvaScena, caricaImmagine, controllaFile, preparaRidotta } from './api.js';
import { agganciaQ, centroToken, tokenSottoPunto, disponiInFila, sovrapposti, chiaveRif } from '../../mappa/token.js';
import { pezziDellaScena, pezziSenzaToken, tokenOrfani, tokenPerPezzo } from '../../mappa/partecipanti.js';
import { daBase64, cella, conta } from '../../mappa/celle.js';
import { tratto, valoreModo, nebbiaProvvisoria, chiudiPennellata, rettangoloNebbia, tuttaNebbia, trattiCoperti } from '../../mappa/nebbia.js';
import { trattoMuri, muriProvvisori, chiudiTrattoMuri, rettangoloMuri } from '../../mappa/muri.js';
import { areaRaggiungibile, costoVerso, percorso, fasceRimaste, fasciaDi, celleArea, piuVicinaRaggiungibile } from '../../mappa/area.js';
import { muoviToken, usatoNelRound, mossoNelRound, annullaUltima, annullaUltimoMovimento, cambiaTokenAnnullabile, nuovoTurno } from '../../mappa/annulla.js';
import { disegnaMuri, disegnaArea, disegnaPercorso, coloriAree } from './disegno-aree.js';
import { apriMenuToken, chiudiMenuToken, menuAperto } from './menu-token.js';
import { diTurno } from '../../scontro.js';
import { statoMovimento, muoviVeicolo } from '../../veicoli-registro.js';
import { rigaMovimentoLibero } from '../../scontro.js';
import { aggiornaInScontri } from '../immagine-nemico.js';
import { aggiornaVeicolo } from '../veicoli-registro.js';
import { creaGesti } from './gesti.js';
import { svgQR } from '../../qr.js';
import { leggiRete } from '../collega.js';
import { creaFonti } from './fonti.js';
import { disegnaToken, coloriMappa, creaImmagini } from './disegno-token.js';
import { sezioneScontro, sezioneToken, TIPO_TRASCINA } from './pannello-scontro.js';
import { renderTavolo } from '../tavolo.js';
import { segnaDallaMappa, vistaDaRimettere, dimenticaMappa } from '../ritorno.js';
import { scegliImmagineNemico, impostaImmagineNemico } from '../immagine-nemico.js';

const ATTESA_SALVATAGGIO_MS = 600;
const ATTESA_RIPROVA_MS = 5000; // dopo un errore di rete o del server
const SCARTO_AVVISO = 0.15; // riquadro tracciato poco quadrato: si avvisa (non si rifiuta)
const TRASCINAMENTO_MINIMO_PX = 4;
const INTERVALLO_FONTI_MS = 3000; // come la plancia (src/ui/tavolo.js)
/** Gruppi della barra accanto alla mappa, nell'ordine (ritocchi del 06/10): chiave, segnalibro, suggerimento. */
const GRUPPI_BARRA = [
  ['scheda', 'Mini-scheda', 'Il token scelto: mini-scheda, movimento, Nascondi, Togli'],
  ['iniziativa', 'Iniziativa', 'Round, «Avanti», ordine d’Iniziativa, tiri da fare'],
  ['pg', 'PG', 'Le mini-schede dei PG al tavolo e i veicoli'],
  ['nemici', 'Nemici', 'Le mini-schede dei nemici nello scontro'],
  ['scontro', 'Scontro', 'Chi è al tavolo, bozze («Prepara scontro»), «Crea nemico», aggiungi nemici, durate, registro, bestiario'],
  ['mappa', 'Mappa', 'Collegamento, token da mettere, muri, nebbia, vista giocatori, griglia, scene'],
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
    // lotto 5: strumenti dei muri, fascia mostrata (1 Passo, 2 Corri, 3 Scatta), area del token scelto, percorso
    muri: { strumento: null, modo: 'muro', lato: 1 },
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
  };
  const B = V.barra;
  const chiaveDisp = chiaveSchermo(window.screen?.width ?? 0, window.screen?.height ?? 0);
  const leggiLocale = (k) => { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; } };
  const scriviLocale = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* solo per questa volta */ } };
  st.disp = normalizzaDisposizione(leggiLocale(chiaveDisp), B);
  st.centra = leggiLocale('mutant-mappa-centra-turno') !== false;
  st.mostraArea = leggiLocale('mutant-mappa-mostra-area') !== false;
  const leggiFonti = creaFonti(ctx.dati);

  // ── Struttura della pagina, creata una volta: si aggiornano solo i testi e i campi ──
  const el = {};
  el.scegliFile = h('input', { type: 'file', accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp', hidden: true, onchange: (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) caricaDaFile(f); } });
  el.titolo = h('h1', { class: 'mappa-titolo' }, 'Mappa');
  el.zoom = h('span', { class: 'mappa-zoom', title: 'Zoom (rotella, + e −)' }, '100 %');
  el.scala = h('span', { class: 'mappa-scala' });
  el.stato = h('span', { class: 'nota mappa-stato', 'aria-live': 'polite' });
  // lotto 6 (§11.1): tre disposizioni, sempre visibili in alto (anche Tab e doppio clic sul bordo)
  el.btnDisp = Object.fromEntries(DISPOSIZIONI.map((d) => [d, h('button', { type: 'button', class: 'btn btn-piccolo', 'aria-pressed': 'false', title: `${NOMI_DISPOSIZIONI[d]} (Tab per passare alla prossima)`, onclick: () => scegliDisposizione(d) }, NOMI_DISPOSIZIONI[d])]));
  el.btnGriglia = h('span', { class: 'mappa-disposizioni', role: 'group', 'aria-label': 'Disposizione' }, DISPOSIZIONI.map((d) => el.btnDisp[d]));
  el.btnCarica = h('button', { type: 'button', class: 'btn', title: 'Immagine di fondo: JPG, PNG o WEBP', onclick: () => el.scegliFile.click() }, 'Carica immagine');
  el.barra = h('header', { class: 'mappa-barra' },
    h('button', { type: 'button', class: 'btn', title: 'Torna alla plancia del Tavolo del Master', onclick: () => ctx.azioni.tavolo() }, '← Tavolo'),
    el.titolo,
    h('span', { class: 'mappa-comandi' },
      el.btnCarica, el.scegliFile,
      h('button', { type: 'button', class: 'btn tondo', title: 'Allontana (−)', 'aria-label': 'Allontana', onclick: () => zoomCentro(1 / V.passo_tasti) }, '−'),
      el.zoom,
      h('button', { type: 'button', class: 'btn tondo', title: 'Avvicina (+)', 'aria-label': 'Avvicina', onclick: () => zoomCentro(V.passo_tasti) }, '+'),
      h('button', { type: 'button', class: 'btn', title: 'Tutta la mappa nel riquadro (doppio clic su un punto vuoto della mappa)', onclick: () => adattaSchermo() }, 'Adatta allo schermo'),
      el.btnGriglia,
      // lotto 7 (§12, menu superiore): gli strumenti del master in un menu
      el.strumenti = h('details', { class: 'menu-strumenti' },
        h('summary', { class: 'btn', title: 'Strumenti del master: immagine, griglia, nebbia, muri, scene, movimenti dei giocatori' }, 'Strumenti ▾'),
        h('div', { class: 'menu-strumenti-voci', role: 'menu' },
          voceStrumenti('Carica immagine…', 'Immagine di fondo: JPG, PNG o WEBP', () => el.scegliFile.click()),
          voceStrumenti('Griglia', 'Calibra, colore, opacità, blocco', () => apriStrumento(el.pGriglia)),
          voceStrumenti('Nebbia', 'Pennello e rettangolo, Rivela / Copri, tutto', () => apriStrumento(el.pNebbia)),
          voceStrumenti('Muri e terreno', 'Muro, terreno difficile, gomma', () => apriStrumento(el.pMuri)),
          voceStrumenti('Vista giocatori', 'Quale scena vedono, QR, «Apri vista giocatori»', () => apriStrumento(el.pGiocatori)),
          voceStrumenti('Scene', 'Nuova, apri, rinomina, duplica, archivia', () => apriStrumento(document.getElementById('plancia-scene-mappa'))),
          voceStrumenti('Collegamento e token', 'Scontro o bozza collegati, pezzi da mettere in mappa', () => apriStrumento(el.secScontro)),
          el.bloccoGiocatori = h('button', { type: 'button', role: 'menuitemcheckbox', class: 'voce-strumenti', 'aria-checked': 'false', title: 'Pronto per la fase 2 (tab BattleMap dei giocatori): finché è acceso i giocatori non muovono i loro token', onclick: () => cambiaBloccoGiocatori() }, 'Blocca movimenti dei giocatori'))),
      h('button', { type: 'button', class: 'btn tondo', title: 'Scorciatoie e comandi (?)', 'aria-label': 'Scorciatoie e comandi', onclick: () => apriAiuto() }, '?')),
    el.scala, el.stato);
  el.riquadro = h('div', { class: 'mappa-tela', tabindex: '0', 'aria-label': 'Mappa: rotella per lo zoom, barra spaziatrice e mouse o trascinamento per spostarsi' });
  el.suggerimento = h('div', { class: 'mappa-suggerimento', hidden: true, role: 'status' });
  el.riquadro.append(el.suggerimento);
  el.pannello = h('div', { class: 'mappa-pannello', 'aria-label': 'Collegamento, muri, nebbia, vista giocatori e griglia' });
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
  el.pGiocatori = h('details', { class: 'mappa-sezione mappa-giocatori' });
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
      disegnaMuri(c, { scena: s, cam: st.cam, info, muri: daBase64(s.muri), terreno: daBase64(s.terreno), colori });
      const r = rettangoloVisibile(st.cam, info.larghezza, info.altezza);
      const q = g.q_px;
      const tratti = trattiCoperti(daBase64(s.nebbia.coperti), g.colonne, g.righe,
        { x0: Math.floor((r.x0 - g.scosto_x) / q), x1: Math.ceil((r.x1 - g.scosto_x) / q), y0: Math.floor((r.y0 - g.scosto_y) / q), y1: Math.ceil((r.y1 - g.scosto_y) / q) });
      // area raggiungibile del token scelto, sopra la nebbia (il master la vede sempre)
      // con «Mostra area» spento non si disegna (il percorso sotto il puntatore resta, nel livello «sopra»)
      const disegnaAreaScelta = () => { const a = st.mostraArea ? areaScelta() : null; if (a?.celle) disegnaArea(c, { scena: s, cam: st.cam, info, celle: a.celle, colori, stile: V.area }); };
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
        disegnaToken(c, { scena: st.scena, cam: st.cam, pezzi: st.mappaPezzi, colori: coloriMappa(el.riquadro), immagine, selezionato: st.selezionato, trascina: t, bordo: bordoDi, alone: ctx.dati.mappa.colori.alone_turno });
      }
      // percorso del token scelto (o trascinato) verso il quadretto sotto il puntatore, con i Q che costa
      if (st.percorso && st.scena) disegnaPercorso(c, { scena: st.scena, cam: st.cam, percorso: st.percorso.punti, ingombro: st.percorso.ingombro, costo: st.percorso.costo, fascia: st.percorso.fascia, colori: coloriAree(el.riquadro) });
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
  }, { ridimensionata: (prima, dopo) => { if (st.scena) cambiaCamera(mantieniCentro(st.cam, prima, dopo)); } });

  const immagine = creaImmagini(() => ridisegna(['sopra']));

  const aggiornaBarra = () => {
    el.zoom.textContent = `${Math.round(st.cam.scala * 100)} %`;
    const g = st.scena?.griglia;
    el.scala.textContent = g ? `${testoScala(ctx.dati)} · ${numero(g.q_px)} px per Q · ${g.colonne} × ${g.righe} Q` : testoScala(ctx.dati);
    el.stato.textContent = st.salvataggio.testo;
  };
  const ridisegna = (livelli) => { tela.richiedi(livelli); aggiornaBarra(); };
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
  const salvaOra = async () => {
    const S = st.salvataggio;
    clearTimeout(S.timer);
    if (S.inCorso || !S.modificata || !st.scena) return;
    S.inCorso = true;
    S.modificata = false;
    const inviata = st.scena;
    testoStato('Salvataggio…');
    try {
      const esito = await salvaScena(inviata);
      if (esito.conflitto) {
        avvisoErrore('La scena è stata cambiata in un’altra finestra: ripresa quella salvata sul server. Rifai l’ultima modifica, se serve.', { durata: 9000 });
        S.modificata = false;
        await usaScena(esito.attuale);
        testoStato(`Ripresa dal server alle ${ora()}`);
      } else {
        // le modifiche fatte durante il salvataggio restano: si aggiorna solo la revisione
        st.scena = { ...st.scena, revisione: esito.scena.revisione, aggiornato: esito.scena.aggiornato };
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
    invalidaArea();
    if (st.fonti !== null) { disegnaPannelloNebbia(); disegnaPannelloMuri(); disegnaPannelloGiocatori(); }
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
  svuota(el.pannello, el.secScontro, el.pMuri, el.pNebbia, el.pGiocatori, el.pGriglia);
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
      st.fonti = esito;
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
      annullaMovimento: () => annullaMovimentoUi(scelto.id),
      nuovoTurno: () => nuovoTurnoUi(scelto.id),
      mostraArea: () => cambiaMostraArea(),
      nuovoTurnoTutti: () => nuovoTurnoUi(null),
      nascondi: () => cambiaToken(scelto.id, (x) => ({ ...x, nascosto: !x.nascosto })),
      ingombro: (n) => cambiaToken(scelto.id, (x) => ({ ...x, ingombro: n, q: agganciaQ(st.scena.griglia, centroToken(st.scena.griglia, x).x, centroToken(st.scena.griglia, x).y, n) }), { controllaSovrapposti: true }),
      togli: () => togliToken(scelto.id),
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
    aggiornaFonti();
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
  function voceStrumenti(testo, titolo, azione) {
    return h('button', { type: 'button', role: 'menuitem', class: 'voce-strumenti', title: titolo, onclick: () => { el.strumenti.open = false; azione(); } }, testo);
  }
  /** Porta alla sezione dello strumento nel gruppo «Mappa» della barra e la apre. */
  function apriStrumento(sezione) {
    if (!sezione) return;
    if (st.disp.disposizione === 'mappa') scegliDisposizione('equilibrata');
    if (sezione.tagName === 'DETAILS' && !sezione.open) { sezione.open = true; sezione.dispatchEvent(new Event('toggle')); }
    sezione.scrollIntoView({ block: 'start' });
    segnaGruppo('mappa');
  }
  /** Blocco dei movimenti dei giocatori: si salva nella scena, lo userà la tab BattleMap della fase 2. */
  function cambiaBloccoGiocatori() {
    if (!st.scena) return;
    const v = !st.scena.bloccaGiocatori;
    st.scena = { ...st.scena, bloccaGiocatori: v };
    salvaPresto();
    aggiornaBlocco();
    avviso(v ? 'Movimenti dei giocatori bloccati (vale dalla fase 2, quando i giocatori muoveranno dal tablet).' : 'Movimenti dei giocatori sbloccati.');
  }
  function aggiornaBlocco() {
    const v = !!st.scena?.bloccaGiocatori;
    el.bloccoGiocatori.setAttribute('aria-checked', String(v));
    el.bloccoGiocatori.textContent = `${v ? '✓ ' : ''}Blocca movimenti dei giocatori`;
  }
  /** Pannello «?»: scorciatoie e comandi della mappa (§12). */
  function apriAiuto() {
    const righe = [
      ['Rotella, + e −', 'zoom (verso il puntatore con la rotella)'],
      ['Barra spaziatrice + mouse, o trascinare un punto vuoto', 'sposta la mappa'],
      ['Doppio clic su un punto vuoto', 'adatta allo schermo'],
      ['Clic su un token', 'lo sceglie: area di movimento e mini-scheda'],
      ['Clic su un quadretto dell’area, o trascinare il token', 'movimento nel Round'],
      ['Maiusc + clic o trascinamento', 'movimento libero (come «Libero»)'],
      ['Ctrl + clic su un token', 'scheda completa (PG) o mini-scheda (nemico)'],
      ['Clic destro su un token', 'menu: fasce, Annulla movimento, Nuovo turno, schede, Nascondi, Colore, Togli'],
      ['M', 'mostra o nasconde l’area di movimento'],
      ['Tab (Maiusc + Tab indietro)', 'cambia disposizione: Mappa grande, Equilibrata, Scontro grande'],
      ['Doppio clic sul bordo della barra', 'disposizione successiva; trascinarlo cambia la larghezza'],
      ['Ctrl + Z', 'annulla l’ultima azione del master (movimento, muri, nebbia, token)'],
      ['Esc', 'chiude menu e strumenti, poi la mini-scheda, poi deseleziona'],
      ['?', 'questo pannello'],
      ['Due dita (tablet)', 'zoom e spostamento; doppio tocco: adatta allo schermo'],
    ];
    informa({
      titolo: 'Scorciatoie e comandi della mappa', classe: 'aiuto-mappa',
      contenuto: h('table', { class: 'tabella compatta' }, h('tbody', {}, righe.map(([k, v]) => h('tr', {}, h('th', { scope: 'row' }, k), h('td', {}, v))))),
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
    if (st.selezionato === id) st.selezionato = null;
    st.scena = cambiaTokenAnnullabile(st.scena, prima, null, ctx.dati);
    dopoCambioToken();
  }

  function scegli(id) {
    // la fascia riparte da quella che il movimento già fatto ha raggiunto (3 Q usati su Passo 2: Corsa)
    if (st.selezionato !== id) st.fascia = fasciaRaggiunta(id);
    st.selezionato = id;
    invalidaArea();
    disegnaPannelli();
    disegnaIniziativa();
    ridisegna(['aree', 'sopra']);
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
    const t = tokenPerPezzo(pz, agganciaQ(st.scena.griglia, m.x, m.y, pz.ingombro));
    st.scena = cambiaTokenAnnullabile(st.scena, null, t, ctx.dati);
    avvisaSovrapposti([t.id]);
    st.selezionato = t.id;
    dopoCambioToken();
  }

  /** «Metti tutti»: una fila libera vicino al centro della vista (src/mappa/token.js → disponiInFila). */
  function mettiTutti() {
    const senza = pezziSenzaToken(st.scena, st.pezzi);
    if (!senza.length) return;
    const g = st.scena.griglia;
    const d = tela.dimensioni();
    const m = mappaDaSchermo(st.cam, d.larghezza / 2, d.altezza / 2);
    const centro = [Math.max(0, Math.min(g.colonne - 1, (m.x - g.scosto_x) / g.q_px)), Math.max(0, Math.min(g.righe - 1, (m.y - g.scosto_y) / g.q_px))];
    const muri = daBase64(st.scena.muri);
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
  const disegnoAttivo = () => (N.strumento ? { gruppo: 'nebbia', forma: N.strumento } : M.strumento ? { gruppo: 'muri', forma: M.strumento } : null);
  const quanteAnnulla = () => st.scena.annulla.length;
  const pulsanteScelta = (testo, attivo, onclick, titolo) => h('button', { type: 'button', class: `btn btn-piccolo${attivo ? ' scelto' : ''}`, 'aria-pressed': String(attivo), title: titolo, onclick }, testo);
  const pulsanteAnnulla = () => h('button', { type: 'button', class: 'btn btn-piccolo', disabled: !quanteAnnulla(), title: 'Annulla l’ultima azione del master: movimento, muro, nebbia, token (Ctrl+Z)', onclick: () => annullaUi() }, `Annulla (${quanteAnnulla()})`);
  const campoLato = (o) => h('label', { class: 'mappa-campo' }, h('span', {}, 'Dimensione del pennello (Q)'),
    h('input', { type: 'number', min: 1, max: 15, step: 1, value: String(o.lato), onchange: (e) => { o.lato = Math.max(1, Math.min(15, Math.round(Number(e.target.value) || 1))); e.target.value = String(o.lato); } }));
  function disegnaPannelloNebbia() {
    if (!st.scena) return;
    const g = st.scena.griglia;
    const coperti = conta(daBase64(st.scena.nebbia.coperti), g.colonne, g.righe);
    svuota(el.pNebbia,
      h('summary', {}, h('strong', {}, 'Nebbia'), ` (${coperti} Q coperti su ${g.colonne * g.righe})`),
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
        pulsanteScelta('Rettangolo', M.strumento === 'rettangolo', () => strumentoMuri(M.strumento === 'rettangolo' ? null : 'rettangolo'), 'Per le aree grandi: da un angolo all’altro')),
      h('div', { class: 'mappa-azioni-token', role: 'group', 'aria-label': 'Modalità dei muri' },
        pulsanteScelta('Muro', M.modo === 'muro', () => { M.modo = 'muro'; disegnaPannelloMuri(); }, 'Invalicabile'),
        pulsanteScelta('Terreno difficile', M.modo === 'terreno', () => { M.modo = 'terreno'; disegnaPannelloMuri(); }, 'Costa di più (provvisorio: ×2, A.128)'),
        pulsanteScelta('Gomma', M.modo === 'gomma', () => { M.modo = 'gomma'; disegnaPannelloMuri(); }, 'Toglie muri e terreno difficile')),
      campoLato(M),
      h('div', { class: 'mappa-azioni-token' }, pulsanteAnnulla()));
  }
  function strumentoNebbia(s) {
    N.strumento = s;
    if (s) M.strumento = null;
    dopoStrumento();
  }
  function strumentoMuri(s) {
    M.strumento = s;
    if (s) N.strumento = null;
    dopoStrumento();
  }
  function dopoStrumento() {
    if (disegnoAttivo() && st.strumento === 'calibra') impostaStrumento('sposta');
    el.riquadro.classList.toggle('nebbia', !!disegnoAttivo());
    st.percorso = null;
    disegnaPannelloNebbia();
    disegnaPannelloMuri();
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
    if (esito.voce.tipo === 'movimento' && !esito.errore) veicoloNonPiuMosso(prima.movimenti.find((x) => x.id === esito.voce.movimento));
    if (st.selezionato && !st.scena.token.some((t) => t.id === st.selezionato)) st.selezionato = null;
    if (esito.errore) avvisoErrore(`Non annullato: ${esito.errore}.`);
    else avviso(`Annullato: ${{ nebbia: 'nebbia', muri: 'muri', movimento: 'movimento', token: 'modifica del token', 'token tolto': 'token tolto (torna in mappa)', 'token messo': 'token messo (esce dalla mappa)' }[esito.testo] ?? esito.testo}.`, { chiave: 'annulla' });
    dopoDisegno();
  }

  // ── Area raggiungibile e movimento (lotto 5, §8) ──
  const FASCE = ['passo', 'corsa', 'scatto'];
  /** Quarta modalità accanto a Passo, Corri e Scatta: «Libero» (Maiusc ne è la scorciatoia). */
  const LIBERO = 4;
  function invalidaArea() { st.area = undefined; st.percorso = null; }
  /** Fascia già raggiunta dal movimento del token in questo Round (o turno): 1 Passo, 2 Corsa, 3 Scatto. */
  function fasciaRaggiunta(id) {
    const t = id ? st.scena?.token.find((x) => x.id === id) : null;
    const mov = t ? pezzoDi(t)?.movimento : null;
    if (!mov) return 1;
    const scontro = st.fonti?.scontro ?? null;
    const usato = usatoNelRound(st.scena, t.id, scontro?.id ?? null, scontro?.round ?? null);
    const i = FASCE.findIndex((f) => Number.isFinite(mov[f]) && usato <= mov[f]);
    return i < 0 ? 1 : i + 1;
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
    const base = { area: null, rimaste: null, usato: 0, fino: st.fascia, limite: 0, totale: 0, disponibili: null, celle: null, movimento: pz?.movimento ?? null, motivo: null, libero: false };
    // «Libero» (quarta modalità): nessuna area, nessun conteggio; il token va in qualunque quadretto
    if (st.fascia === LIBERO) return { ...base, libero: true, usato: pz?.movimento ? usatoNelRound(st.scena, t.id, scontro?.id ?? null, scontro?.round ?? null) : 0 };
    if (!pz?.movimento) return { ...base, motivo: pz ? 'nessun profilo di movimento' : 'fuori dallo scontro' };
    let usato = usatoNelRound(st.scena, t.id, scontro?.id ?? null, scontro?.round ?? null);
    if (pz.tipo === 'veicolo' && scontro) {
      // A.105: un solo movimento per Round, all'Iniziativa del conducente (src/veicoli-registro.js)
      const rec = recordVeicolo(t);
      const sv = rec ? statoMovimento(rec, scontro, diTurno(scontro)) : null;
      if (mossoNelRound(st.scena, t.id, scontro.id, scontro.round) || sv?.mosso) return { ...base, usato: pz.movimento.passo, motivo: `già mosso nel Round ${scontro.round}` };
      if (sv && !sv.puo) return { ...base, motivo: sv.motivo };
      usato = 0;
    }
    const rimaste = fasceRimaste(pz.movimento, usato);
    // fino alla fascia scelta (Passo, Corri, Scatta), o alla migliore disponibile sotto di essa
    const disponibili = FASCE.slice(0, st.fascia).filter((f) => rimaste[f] !== null);
    const limite = disponibili.length ? Math.max(...disponibili.map((f) => rimaste[f])) : 0;
    const tutte = FASCE.filter((f) => rimaste[f] !== null);
    const totale = tutte.length ? Math.max(...tutte.map((f) => rimaste[f])) : 0;
    const scelta = [...FASCE.slice(0, st.fascia)].reverse().find((f) => Number.isFinite(pz.movimento[f]));
    const g = st.scena.griglia;
    const area = areaRaggiungibile({
      colonne: g.colonne, righe: g.righe, muri: daBase64(st.scena.muri), terreno: daBase64(st.scena.terreno),
      token: st.scena.token.map((x) => ({ id: x.id, q: x.q, ingombro: x.ingombro, lato: pezzoDi(x)?.lato ?? null })),
      chi: { id: t.id, q: t.q, ingombro: t.ingombro, lato: pz.lato }, massimo: totale, regole: ctx.dati.mappa.movimento,
    });
    const quando = scontro ? 'del Round' : 'del turno';
    const piuAmpie = FASCE.slice(st.fascia).filter((f) => rimaste[f] > 0).map((f) => (f === 'corsa' ? 'Corri' : 'Scatta'));
    const motivo = limite > 0 ? null : !usato ? 'movimento 0 Q'
      : piuAmpie.length ? `${st.fascia === 1 ? 'Passo' : 'Corsa'} finito: scegli ${piuAmpie.join(' o ')}` : `movimento ${quando} finito (${numero(usato, 1)} Q)`;
    return { ...base, area, rimaste, usato, limite, totale, disponibili: scelta ? pz.movimento[scelta] : null, celle: celleArea(area, rimaste, st.fascia), motivo };
  }
  /** Area del token scelto, calcolata una volta finché non cambia qualcosa (invalidaArea). */
  function areaScelta() {
    if (st.area !== undefined) return st.area;
    const t = st.selezionato && !disegnoAttivo() ? st.scena.token.find((x) => x.id === st.selezionato) : null;
    st.area = t ? { token: t.id, ...infoArea(t) } : null;
    return st.area;
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
      avviso(`${nome}: quel quadretto è fuori dall’area${info.motivo ? ` (${info.motivo})` : ''}. Seleziona Libero (o tieni premuto Maiusc) per spostarlo comunque.`, { tipo: 'info', chiave: 'fuori-area' });
      return false;
    }
    const scontro = st.fonti?.scontro ?? null;
    const fascia = libero ? null : fasciaDi(costo, info.rimaste);
    st.scena = muoviToken(st.scena, t.id, { a: q, costo: libero ? null : costo, fascia, scontro: scontro?.id ?? null, round: scontro?.round ?? null, libero }, ctx.dati);
    if (libero) {
      avviso(`Libero: ${nome} spostato; non conta nel movimento${scontro ? ' (riga nel registro)' : ''}.`, { tipo: 'info', chiave: 'fuori-area' });
      if (scontro) aggiornaInScontri(scontro.id, (s) => rigaMovimentoLibero(s, nome, t.q, q)).catch((e) => avvisoErrore(`Riga del registro non scritta: ${e.message}`));
    }
    // il veicolo segna il suo movimento del Round nel registro unico
    const rec = recordVeicolo(t);
    if (rec && scontro && !libero) {
      try {
        aggiornaVeicolo(rec, muoviVeicolo(rec, scontro, diTurno(scontro))).then(({ record }) => {
          if (st.fonti) st.fonti.veicoli = st.fonti.veicoli.map((x) => (x.id === record.id ? record : x));
        }).catch((e) => avvisoErrore(`Movimento del veicolo non registrato: ${e.message}`));
      } catch (e) { avvisoErrore(`Movimento del veicolo non registrato: ${e.message}`); }
    }
    avvisaSovrapposti([t.id]);
    invalidaArea();
    dopoCambioToken();
    return true;
  }
  function annullaMovimentoUi(id = st.selezionato) {
    const esito = id ? annullaUltimoMovimento(st.scena, id) : null;
    if (!esito) { avviso('Nessun movimento da annullare per questo token.'); return; }
    if (esito.errore) { avvisoErrore(`Non annullato: ${esito.errore}.`); return; }
    st.scena = esito.scena;
    veicoloNonPiuMosso(esito.movimento);
    avviso('Annullato l’ultimo movimento.', { chiave: 'annulla' });
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
    return { mostraArea: st.mostraArea, movimento: info.movimento, rimaste: info.rimaste, usato: info.usato, disponibili: info.disponibili, fascia: st.fascia, motivo: info.motivo, annullabile: !!ultimo, veicolo: t.rif.tipo === 'veicolo', andatura: pezzoDi(t)?.andatura ?? null, senzaScontro: !st.fonti?.scontro };
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
  const premi = (e, p) => {
    el.riquadro.focus({ preventScroll: true });
    nascondiSuggerimento();
    chiudiMenuToken();
    if (!st.scena) return;
    const m = mappaDaSchermo(st.cam, p.x, p.y);
    if (st.daPiazzare && !st.spazio) { piazza(st.daPiazzare, m); return; }
    const base = { id: e.pointerId, x: p.x, y: p.y, x0: p.x, y0: p.y, mosso: false };
    const d = disegnoAttivo();
    if (d && !st.spazio && st.strumento !== 'calibra') {
      const q = qVicino(m);
      st.trascina = { ...base, modo: 'disegno', ...d, iniziale: d.gruppo === 'nebbia' ? { nebbia: st.scena.nebbia.coperti } : { muri: st.scena.muri, terreno: st.scena.terreno }, da: q, a: q };
      if (d.forma === 'pennello') { passoPennello(q, q); ridisegna(['aree']); } else ridisegna(['sopra']);
      return;
    }
    const tok = !st.spazio && st.strumento !== 'calibra' ? tokenSotto(m) : null;
    const modo = tok ? 'token' : st.strumento === 'calibra' && !st.spazio ? 'calibra' : 'sposta';
    st.trascina = { ...base, modo };
    if (modo === 'calibra') st.calibrazione = { a: m, b: null };
    if (tok) {
      const c = centroToken(st.scena.griglia, tok);
      // l'area del token trascinato: il trascinamento si aggancia solo dentro (Maiusc per uscire)
      Object.assign(st.trascina, { token: tok.id, q: tok.q, dx: m.x - c.x, dy: m.y - c.y, ingombro: tok.ingombro, info: infoArea(tok) });
    }
    el.riquadro.classList.toggle('trascina', modo !== 'calibra');
  };
  /** Un passo del pennello (nebbia o muri) da a ad b, senza voce di «annulla» (la voce arriva al rilascio). */
  function passoPennello(a, b) {
    if (st.trascina?.gruppo === 'muri') st.scena = muriProvvisori(st.scena, trattoMuri(st.scena, a, b, M.lato, M.modo));
    else {
      const g = st.scena.griglia;
      st.scena = nebbiaProvvisoria(st.scena, tratto(daBase64(st.scena.nebbia.coperti), g.colonne, g.righe, a, b, N.lato, valoreModo(N.modo)));
    }
  }
  const muovi = (e, p, mio) => {
    const t = st.trascina;
    if (!t || !mio) { suggerisci(e); return; }
    if (!t.mosso && Math.hypot(p.x - t.x0, p.y - t.y0) < TRASCINAMENTO_MINIMO_PX) return;
    t.mosso = true;
    if (t.modo === 'sposta') cambiaCamera(sposta(st.cam, p.x - t.x, p.y - t.y));
    else if (t.modo === 'disegno') {
      const q = qVicino(mappaDaSchermo(st.cam, p.x, p.y));
      if (q[0] !== t.a[0] || q[1] !== t.a[1]) {
        if (t.forma === 'pennello') { passoPennello(t.a, q); t.a = q; ridisegna(['aree']); } else { t.a = q; ridisegna(['sopra']); }
      }
    } else if (t.modo === 'token') {
      // §7 e §8: sempre al centro di un quadretto; dentro l'area raggiungibile, o dove si vuole con Maiusc
      const m = mappaDaSchermo(st.cam, p.x, p.y);
      const puntata = agganciaQ(st.scena.griglia, m.x - t.dx, m.y - t.dy, t.ingombro);
      const libero = e.shiftKey || !t.info?.area;
      // fuori dall'area il token resta sulla posizione raggiungibile più vicina al puntatore
      const q = libero ? puntata : piuVicinaRaggiungibile(t.info.area, puntata, t.info.limite) ?? t.q;
      t.oltre = !libero && chiedeFascia(t.info, puntata);
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
    const t = st.trascina;
    if (!t) return false;
    st.trascina = null;
    el.riquadro.classList.remove('trascina');
    if (annullato) { annullaGesto(t); return true; }
    if (t.modo === 'disegno') {
      if (t.gruppo === 'nebbia') st.scena = t.forma === 'rettangolo' ? rettangoloNebbia(st.scena, t.da, t.a, N.modo, ctx.dati) : chiudiPennellata(st.scena, t.iniziale.nebbia, ctx.dati);
      else st.scena = t.forma === 'rettangolo' ? rettangoloMuri(st.scena, t.da, t.a, M.modo, ctx.dati) : chiudiTrattoMuri(st.scena, t.iniziale, ctx.dati);
      dopoDisegno();
      return true;
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
      if (t.mosso) {
        if (!eseguiMovimento(tok, t.q, { libero: !!t.libero, info: t.info })) ridisegna(['sopra']);
        if (t.oltre) avvisaFascia(); // rilasciato oltre la fascia scelta: il token si è fermato al suo limite
      } else if (e.ctrlKey || e.metaKey) {
        // lotto 7 (§12): Ctrl+clic apre la scheda completa del PG, la mini-scheda per gli altri
        scegli(tok.id);
        apriSchedaToken(tok);
      } else {
        // clic: si sceglie il token, compare la sua area e si apre la sua carta accanto alla mappa
        scegli(tok.id);
        apriCarta(tok);
      }
      return true;
    }
    // clic su un quadretto con un token scelto: dentro l'area (o con Maiusc) il token ci va; altrimenti si deseleziona
    if (!t.mosso && st.selezionato) {
      const tok = st.scena.token.find((x) => x.id === st.selezionato);
      const info = areaScelta();
      if (tok && info) {
        const q = posizioneVerso(tok, mappaDaSchermo(st.cam, p.x, p.y));
        if (e.shiftKey || info.libero || costoDentro(info, q) < Infinity) { eseguiMovimento(tok, q, { libero: e.shiftKey || info.libero, info }); return true; }
        // oltre il Passo (o la Corsa) ma alla portata di una fascia più ampia: il clic non vale e lo si dice
        if (chiedeFascia(info, q)) { avvisaFascia(); return true; }
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
      st.scena = t.gruppo === 'nebbia' ? { ...st.scena, nebbia: { ...st.scena.nebbia, coperti: t.iniziale.nebbia } } : { ...st.scena, muri: t.iniziale.muri, terreno: t.iniziale.terreno };
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
  const suEsce = () => { nascondiSuggerimento(); if (st.percorso && !st.trascina) { st.percorso = null; ridisegna(['sopra']); } };
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
    const p = punto(e);
    const tok = tokenSotto(mappaDaSchermo(st.cam, p.x, p.y));
    if (!tok) { chiudiMenuToken(); return; }
    if (st.selezionato !== tok.id) scegli(tok.id);
    const pz = pezzoDi(tok);
    const mov = pz?.movimento;
    const ultimo = st.scena.movimenti.some((x) => x.token === tok.id);
    const conScontro = !!st.fonti?.scontro;
    const pg = pz?.tipo === 'pg';
    apriMenuToken(el.riquadro, p.x, p.y, pz?.nome ?? tok.nome ?? tok.id, [
      { testo: 'Passo', azione: () => cambiaFascia(1), scelta: st.fascia === 1, disabilitata: !mov },
      { testo: 'Corri', azione: () => cambiaFascia(2), scelta: st.fascia === 2, disabilitata: !Number.isFinite(mov?.corsa), titolo: 'Amplia l’area fino alla Corsa' },
      { testo: 'Scatta', azione: () => cambiaFascia(3), scelta: st.fascia === 3, disabilitata: !Number.isFinite(mov?.scatto), titolo: 'Amplia l’area fino allo Scatto' },
      { testo: 'Libero', azione: () => cambiaFascia(LIBERO), scelta: st.fascia === LIBERO, titolo: 'In qualunque quadretto, senza area e senza conteggio (scorciatoia: Maiusc)' },
      { testo: st.mostraArea ? 'Nascondi area (M)' : 'Mostra area (M)', azione: () => cambiaMostraArea() },
      { testo: 'Annulla ultimo movimento', azione: () => annullaMovimentoUi(tok.id), disabilitata: !ultimo },
      { testo: 'Nuovo turno', azione: () => nuovoTurnoUi(tok.id), disabilitata: conScontro, titolo: conScontro ? 'Con lo scontro aperto il movimento riparte al nuovo Round («Avanti»)' : 'Il movimento di questo token riparte da 0' },
      null,
      { testo: 'Apri mini-scheda', azione: () => apriCarta(tok), disabilitata: !pz },
      { testo: 'Apri scheda completa (Ctrl+clic)', azione: () => apriSchedaToken(tok), disabilitata: !pg || !recordPg(pz), titolo: pg ? 'La scheda del PG, con «Torna alla mappa»' : 'Solo per i PG' },
      null,
      { testo: tok.nascosto ? 'Mostra ai giocatori' : 'Nascondi ai giocatori', azione: () => cambiaToken(tok.id, (x) => ({ ...x, nascosto: !x.nascosto })) },
      { testo: 'Colore del bordo…', azione: () => coloreBordo(tok.id), disabilitata: !pz },
      { testo: 'Togli dalla mappa', azione: () => togliToken(tok.id) },
    ]);
  };
  const suTasto = (e) => {
    if (inCampo(e)) return;
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey && (document.activeElement === document.body || document.activeElement === el.riquadro || document.activeElement === el.bordo)) {
      e.preventDefault();
      scegliDisposizione(prossimaDisposizione(st.disp.disposizione, e.shiftKey ? -1 : 1));
      return;
    }
    // Ctrl+Z (lotto 5): annulla l'ultima azione del master (movimento, muro, nebbia, token messo o tolto)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') { e.preventDefault(); if (st.scena) annullaUi(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'm' || e.key === 'M') { e.preventDefault(); cambiaMostraArea(); return; }
    if (e.key === '?') { e.preventDefault(); apriAiuto(); return; }
    if (e.key === 'Escape' && el.strumenti.open) { el.strumenti.open = false; return; }
    if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') { e.preventDefault(); zoomCentro(V.passo_tasti); } else if (e.key === '-' || e.code === 'NumpadSubtract') { e.preventDefault(); zoomCentro(1 / V.passo_tasti); } else if (e.code === 'Space') {
      e.preventDefault(); // niente scorrimento della pagina
      if (!st.spazio) { st.spazio = true; el.riquadro.classList.add('spazio'); }
    } else if (e.key === 'Escape') {
      if (menuAperto()) chiudiMenuToken();
      else if (st.strumento === 'calibra') impostaStrumento('sposta');
      else if (disegnoAttivo()) { N.strumento = null; M.strumento = null; dopoStrumento(); } else if (st.daPiazzare) { st.daPiazzare = null; el.riquadro.classList.remove('piazza'); disegnaPannelli(); } else if (st.cartaAperta) chiudiCarta(); else if (st.selezionato) scegli(null);
    }
  };
  const suRilasciaTasto = (e) => {
    if (e.code === 'Space') { st.spazio = false; el.riquadro.classList.remove('spazio'); }
  };
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
      inMappa: { sezioni: el.slot },
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
        avanti: () => avantiDallaMappa(),
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
          h('span', { class: `mini-token lato-${v.lato ?? 'nessuno'}${stileBordo(v.bordo).classi}${v.diTurno ? ' di-turno' : ''}${v.nascosto ? ' nascosto' : ''}`, style: stileBordo(v.bordo).stile }, v.ritratto ? h('img', { src: v.ritratto, alt: '' }) : h('span', { class: 'iniziali' }, v.iniziali)),
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
    const t = id ? st.scena.token.find((x) => chiaveRif(x.rif) === chiaveRif({ tipo: 'partecipante', id })) : null;
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
    try { const r = await fetch('api/vista-giocatori/scelta', { cache: 'no-store' }); if (r.ok) st.sceltaGiocatori = (await r.json()).scena ?? null; } catch { /* resta quella di prima */ }
  }
  async function scegliPerGiocatori(scena) {
    try {
      const r = await fetch('api/vista-giocatori/scelta', { method: 'PUT', body: JSON.stringify({ scena }), headers: { 'Content-Type': 'application/json' } });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).errore ?? `errore ${r.status}`);
      st.sceltaGiocatori = scena;
      avviso(scena ? 'I giocatori vedono questa scena.' : 'Vista giocatori automatica: la scena collegata allo scontro aperto.');
    } catch (e) { avvisoErrore(`Scelta non salvata: ${e.message}`); }
    disegnaPannelloGiocatori();
  }
  function disegnaPannelloGiocatori() {
    if (!st.scena) return;
    const s = st.sceltaGiocatori;
    const url = indirizzoGiocatori();
    const qr = h('span', { class: 'qr-collega' });
    qr.innerHTML = svgQR(url, { pixel: 3 }); // SVG generato qui, dal solo indirizzo
    const testo = s === st.scena.id ? 'I giocatori vedono questa scena (scelta da te).'
      : s ? 'I giocatori vedono un’altra scena, scelta da te.'
        : `Automatica: i giocatori vedono la scena collegata allo scontro aperto${st.scena.collegamento?.scontro && st.fonti?.scontro ? ' (questa, se è la più recente)' : ''}.`;
    svuota(el.pGiocatori,
      h('summary', {}, h('strong', {}, 'Vista giocatori')),
      h('p', { class: 'nota' }, testo),
      h('div', { class: 'mappa-azioni-token' },
        s !== st.scena.id ? h('button', { type: 'button', class: 'btn btn-piccolo primario', onclick: () => scegliPerGiocatori(st.scena.id) }, 'Mostra questa scena') : null,
        s ? h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => scegliPerGiocatori(null) }, 'Automatica') : null,
        h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => window.open('#/mappa/giocatori', 'mutant-giocatori') }, 'Apri vista giocatori')),
      h('div', { class: 'mappa-qr' }, qr, h('small', { class: 'nota' }, url)),
      rete?.soloLocale ? h('p', { class: 'nota' }, 'Server acceso con --solo-locale: dai tablet non si raggiunge. Riavvialo con avvia-server.bat.') : null);
  }

  // ── Avvio ──
  testoStato('Lettura della scena…');
  leggiScena(ctx.id).then(async (s) => {
    if (st.chiusa) return;
    await usaScena(s);
    testoStato(s.aggiornato ? `Salvata alle ${ora(new Date(s.aggiornato))}` : '');
    const vista = vistaDaRimettere(sessionStorage, ctx.id);
    // tornati sulla mappa (in qualunque modo): il segno per «Torna alla mappa» non serve più
    dimenticaMappa(sessionStorage);
    if (vista?.cam && Number.isFinite(vista.cam.scala)) cambiaCamera(vista.cam); else adattaSchermo();
    if (vista?.selezionato && st.scena.token.some((t) => t.id === vista.selezionato)) st.selezionato = vista.selezionato;
    montaPlanciaBarra();
    aggiornaBlocco();
    await Promise.all([aggiornaFonti(), leggiScelta()]);
    disegnaPannelloNebbia();
    disegnaPannelloMuri();
    disegnaPannelloGiocatori();
    if (vista?.carta) { const t = st.scena.token.find((x) => chiaveRif(x.rif) === vista.carta); if (t) apriCarta(t); }
  }).catch((e) => {
    if (st.chiusa) return;
    svuota(radice, h('section', { class: 'mappa-pagina' }, h('p', { class: 'riquadro attenzione' }, `Scena non trovata: ${e.message}. `,
      h('button', { type: 'button', class: 'btn', onclick: () => ctx.azioni.tavolo() }, '← Tavolo'))));
  });

  const giro = setInterval(async () => {
    aggiornaFonti();
    const prima = st.sceltaGiocatori;
    await leggiScelta();
    if (st.sceltaGiocatori !== prima) disegnaPannelloGiocatori();
  }, INTERVALLO_FONTI_MS);

  return () => {
    st.chiusa = true;
    clearInterval(giro);
    if (st.salvataggio.modificata) salvaOra();
    gesti.distruggi();
    chiudiMenuToken();
    st.plancia?.();
    st.planciaBarra?.();
    osservaCorpo.disconnect();
    togliBordo();
    window.removeEventListener('keydown', suTasto);
    window.removeEventListener('keyup', suRilasciaTasto);
    tela.distruggi();
    st.immagine?.close?.();
  };
}
