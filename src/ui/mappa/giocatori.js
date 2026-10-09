// Mappa di battaglia, lotto 4 (docs/battlemap/piano.md; §3 della specifica): vista giocatori, #/mappa/giocatori, da
// aprire sul televisore, sul proiettore o su un tablet. Legge solo la scena filtrata dal server
// (/api/vista-giocatori: src/mappa/vista.js): mappa ridotta, griglia, token visibili con la barretta dei PV, il token di
// turno, nebbia piena; in alto il nome della scena, il Round e chi è di turno. Nessun comando del master: solo zoom
// (rotella, due dita), spostamento (trascinamento) e doppio tocco o doppio clic per «Adatta allo schermo».
// Si aggiorna da sola; la scena è quella scelta dal master o quella collegata allo scontro aperto.
// Lotto 6: sotto il titolo la barra dell'Iniziativa del master (./barra-iniziativa.js), senza comandi e già filtrata dal
// server: niente token nascosti né sotto la nebbia.
// Diretta (07/10, src/mappa/diretta.js): un flusso di eventi dal server (EventSource) porta il movimento che il master
// sta facendo: token scelto, area con il contorno, modalità e Q usati / disponibili in testata, percorso sotto il suo
// puntatore con i passi in ZoC, ZoC degli avversari visibili. Già filtrato dal server; sparisce quando il master lascia il
// token. Lo stesso flusso dice «aggiorna» quando la scena o lo scontro cambiano: la vista si rilegge subito.
// Tablet dei giocatori (fase 2, lotto 7; src/mappa/tablet.js): con «Sono…» il tablet sceglie il PG del giocatore (resta
// memorizzato sul tablet; nessuna password, si gioca in casa). In più: il proprio token evidenziato, la mini-scheda (PV,
// PM, Stati), «Centra su di me» e il movimento del proprio PG: Passo / Corsa / Scatto, tocco sul quadretto di arrivo
// (il server prova percorso e costo), tocco su «Conferma». Il server rifà ogni controllo prima di scrivere. Il
// campanellino del master e «Tocca a te» arrivano come avviso grande, con suono e vibrazione.
import { h, svuota } from '../dom.js';
import { cameraIniziale, sposta, adatta, adattaRettangolo, schermoDaMappa, rettangoloVisibile } from '../../mappa/camera.js';
import { dimensioniMappa, lineeVisibili } from '../../mappa/griglia.js';
import { daBase64 } from '../../mappa/celle.js';
import { trattiCoperti, rettangoloScoperto } from '../../mappa/nebbia.js';
import { chiaveRif } from '../../mappa/token.js';
import { creaTela } from './canvas.js';
import { creaGesti } from './gesti.js';
import { disegnaToken, coloriMappa, creaImmagini } from './disegno-token.js';
import { barraIniziativaEl } from './barra-iniziativa.js';
import { creaAudio } from './audio.js';
import { campanellaVista } from '../../mappa/audio.js';
import { disegnaArea, disegnaZoc, disegnaPercorso, coloriAree, disegnaTemplate, disegnaPorte, disegnaMuri, disegnaLineaTiro, disegnaLuci } from './disegno-aree.js';
import { celleDaMaschera, templateVisibili, ostacoliVisibili } from '../../mappa/template.js';
import { celleDellaDiretta, zocDellaDiretta, avversariDellaDiretta, trattiPercorso } from '../../mappa/diretta.js';
import { passiInZoc } from '../../mappa/zoc.js';
import { avviso } from '../avvisi.js';
import { leggiVersione, serveAggiornamento, urlRicarica } from '../../versione.js';
import { mappaDaSchermo } from '../../mappa/camera.js';
import { dimensioni, centroToken, celleToken } from '../../mappa/token.js';
import { apri as apriFinestrella } from '../finestrella.js';
import { creaAllarme } from '../allarme.js';

// fase 2, lotto 7: il PG scelto con «Sono…», ricordato su questo tablet
const CHIAVE_PG = 'mutant.tablet.pg';
const leggiPg = () => { try { return localStorage.getItem(CHIAVE_PG) || null; } catch { return null; } };
const scriviPg = (v) => { try { if (v) localStorage.setItem(CHIAVE_PG, v); else localStorage.removeItem(CHIAVE_PG); } catch { /* solo per questa volta */ } };
const TOCCO_PX = 10; // un dito che si sposta meno di così fa un tocco, non uno spostamento della vista

// due schermi del master (07/10): la vista si aggiorna entro 1–2 secondi dalle azioni del master
const INTERVALLO_MS = 1000;
// ritocchi del 07/10: ogni quanto la vista giocatori guarda se c'è una versione nuova dell'app
const CONTROLLO_VERSIONE_MS = 20000;

/**
 * @param ctx { dati }
 * @returns {() => void} chiude la pagina
 */
export function renderGiocatori(radice, ctx) {
  const V = ctx.dati.mappa.vista;
  // 07/10: i mini-token ritagliano il ritratto alla stessa altezza dei token (data/mappa.json → token.ritratto_verticale)
  document.documentElement.style.setProperty('--ritratto-y', `${ctx.dati.mappa.token.ritratto_verticale * 100}%`);
  // 07/10: barretta dei PV dei mini-token (data/mappa.json → pv_token)
  for (const [k, v] of [['--pv-colore', ctx.dati.mappa.pv_token.colore], ['--pv-traccia', ctx.dati.mappa.pv_token.traccia], ['--pv-mini-alto', `${ctx.dati.mappa.pv_token.mini_token_px}px`]]) document.documentElement.style.setProperty(k, v);
  const st = { vista: null, firma: null, cam: cameraIniziale(), immagine: null, fileImmagine: null, chiusa: false, errore: null, adattata: null, toccata: false, trascina: null, diretta: null, celle: { area: null, zoc: null },
    // fase 2, lotto 7: tablet del giocatore
    // 08/10: dalla scheda del PG il PG arriva già scelto (ctx.pg), con lo scontro e la scheda a cui tornare
    pg: ctx.pg || leggiPg(), daScheda: !!(ctx.pg && ctx.scheda), centrato: false, mosso: false, pgs: [], io: null, fascia: 1, prova: null, inVolo: false, turnoPrima: null, celleMie: null };
  const T = ctx.dati.mappa.tablet;
  const el = {};
  el.titolo = h('strong', { class: 'giocatori-titolo' }, 'Mappa');
  el.turno = h('span', { class: 'giocatori-turno', 'aria-live': 'polite' });
  el.stato = h('span', { class: 'nota giocatori-stato' });
  el.movimento = h('span', { class: 'giocatori-movimento', 'aria-live': 'polite', hidden: true });
  el.schermo = h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Schermo intero', onclick: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()) }, 'Schermo intero');
  el.riquadro = h('div', { class: 'mappa-tela giocatori-tela', 'aria-label': 'Mappa dei giocatori: due dita o rotella per lo zoom, trascina per spostarti, doppio tocco per vedere tutto' });
  el.messaggio = h('p', { class: 'giocatori-messaggio', hidden: true });
  el.iniziativa = h('div', { class: 'mappa-iniziativa-posto', hidden: true });
  // la riga del movimento sta sulla mappa: resta anche a schermo intero, dove la testata sparisce
  // ritocchi del 07/10: «Adatta allo schermo», discreto sulla mappa, resta anche a schermo intero (tasto A)
  // ritocchi del 07/10 (test di Marcello): un pulsante vero, come quelli del master, non solo un'icona semitrasparente
  el.adatta = h('button', { type: 'button', class: 'btn giocatori-adatta', title: 'Adatta allo schermo: tutta la parte di mappa scoperta (tasto A, doppio tocco)', 'aria-label': 'Adatta allo schermo', onclick: () => adattaSchermo() }, h('span', { 'aria-hidden': 'true' }, '⤢'), ' Adatta');
  // fase 2, lotto 7: «Sono…», pannello del tablet, avviso grande, sblocco dell'audio
  el.sono = h('button', { type: 'button', class: 'btn btn-piccolo tablet-sono', hidden: true, onclick: () => scegliPg() }, 'Sono…');
  el.torna = h('button', { type: 'button', class: 'btn tablet-torna', hidden: !(ctx.pg && ctx.scheda), onclick: () => tornaAllaScheda() }, '← Torna alla scheda');
  el.tablet = h('section', { class: 'tablet-pannello', hidden: true, 'aria-label': 'Il tuo PG' });
  el.riquadro.append(el.messaggio, el.movimento, el.adatta);
  svuota(radice, h('section', { class: 'mappa-pagina giocatori-pagina' },
    h('header', { class: 'giocatori-barra' }, el.torna, el.titolo, el.turno, el.sono, el.stato, el.schermo), el.iniziativa,
    // la mappa e, sul tablet del giocatore, il suo pannello: sotto in verticale, a destra in orizzontale
    h('div', { class: 'giocatori-corpo' }, el.riquadro, el.tablet)));

  const immagine = creaImmagini(() => tela.richiedi(['sopra']));
  const tela = creaTela(el.riquadro, {
    fondo: (c, info) => {
      const s = st.vista;
      if (!s) return;
      const { larghezza, altezza } = dimensioniMappa(s);
      c.save();
      c.translate(st.cam.ox, st.cam.oy);
      c.scale(st.cam.scala, st.cam.scala);
      if (st.immagine) { c.imageSmoothingEnabled = st.cam.scala < 2; c.drawImage(st.immagine, 0, 0, larghezza, altezza); } else {
        c.fillStyle = getComputedStyle(el.riquadro).getPropertyValue('--mappa-vuota').trim() || '#ddd';
        c.fillRect(0, 0, larghezza, altezza);
      }
      c.restore();
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
    // §5: per i giocatori la nebbia è piena; sotto, le ZoC e l'area della diretta (già senza i Q sotto la nebbia)
    aree: (c, info) => {
      // template ad area (fase 2, lotto 1): quelli della scena e l'anteprima di quello che il master sta piazzando,
      // già filtrati dal server (solo i Q fuori dalla nebbia, niente nascosti)
      // ritocchi del 07/10: «Mostra / nascondi template» scelto dal master per i giocatori (template senza durata, muri,
      // porte e terreno; con «anche a durata» anche gli altri); l'anteprima di chi piazza resta
      const sov = st.vista?.sovrapposizioni;
      if (st.vista && ostacoliVisibili(sov)) disegnaMuri(c, { scena: st.vista, cam: st.cam, info, muri: daBase64(st.vista.muri), terreno: daBase64(st.vista.terreno), colori: coloriAree(el.riquadro) });
      if (st.vista) for (const t of [...templateVisibili(st.vista.template ?? [], sov), ...(direttaAttuale()?.template ?? [])]) disegnaTemplateGiocatori(c, info, t);
      // porte (fase 2, lotto 2): già filtrate dal server (niente segrete non rivelate, niente sotto la nebbia)
      if (st.vista?.porte?.length && ostacoliVisibili(sov)) disegnaPorte(c, { scena: st.vista, cam: st.cam, info, porte: st.vista.porte, colori: ctx.dati.mappa.porte.colori });
      const d = direttaAttuale();
      // fase 2, lotto 7: l'area del proprio PG (dal server, senza i Q sotto la nebbia) fino alla fascia scelta, se il
      // master non sta mostrando un movimento
      const mie = celleMie();
      if (mie) {
        // al proprio movimento il tablet mostra la sua area e le ZoC degli avversari visibili, non la diretta del master
        const zoc = zocMie();
        if (zoc) disegnaZoc(c, { scena: st.vista, cam: st.cam, info, celle: zoc, stile: ctx.dati.mappa.zoc });
        disegnaArea(c, { scena: st.vista, cam: st.cam, info, celle: mie, colori: coloriAree(el.riquadro), stile: V.area });
      } else if (d) {
        const s = st.vista;
        const zoc = st.celle.zoc;
        if (zoc) disegnaZoc(c, { scena: s, cam: st.cam, info, celle: zoc, stile: ctx.dati.mappa.zoc });
        if (st.celle.area) disegnaArea(c, { scena: s, cam: st.cam, info, celle: st.celle.area, colori: coloriAree(el.riquadro), stile: V.area });
      }
      // fase 2, lotto 4: le zone in Penombra, Luce scarsa e Buio più scure (già filtrate dal server: niente sotto la nebbia)
      if (st.vista?.luce) disegnaLuci(c, { scena: st.vista, cam: st.cam, info, maschere: Object.fromEntries(Object.entries(st.vista.luce).map(([k, v]) => [k, daBase64(v)])), opacita: ctx.dati.mappa.luci.oscurita_giocatori });
      disegnaNebbia(c, info, 1);
      // fase 2, lotto 3: con la nebbia automatica le zone esplorate ma non viste adesso sono più scure
      if (st.vista?.ombra) disegnaOmbra(c, info);
    },
    sopra: (c) => {
      const s = st.vista;
      if (!s) return;
      const pezzi = new Map(s.token.filter((t) => t.info).map((t) => [chiaveRif(t.rif), { ...t.info, ritratto: t.info.immagine, pv: t.info.pv === null ? null : { attuali: t.info.pv, massimo: 1 }, stati: [] }]));
      const d = direttaAttuale();
      const mio = !!celleMie();
      disegnaToken(c, { scena: s, cam: st.cam, pezzi, colori: coloriMappa(el.riquadro), immagine, selezionato: (mio ? st.io.token : d?.token) ?? st.io?.token ?? null, bordo: (p) => p.bordo ?? null, alone: ctx.dati.mappa.colori.alone_turno, ritrattoVerticale: ctx.dati.mappa.token.ritratto_verticale, pv: { stile: ctx.dati.mappa.pv_token, mostra: () => true }, zero: ctx.dati.mappa.pv_zero, volo: ctx.dati.mappa.volo });
      // fase 2, lotto 3: la linea di tiro del master (già filtrata dal server)
      if (d?.linea) disegnaLineaTiro(c, { scena: s, cam: st.cam, da: d.linea.da, a: d.linea.a, copertura: d.linea.copertura, etichetta: d.linea.testo ?? `${d.linea.distanza} Q · ${{ nessuna: 'nessuna Copertura', leggera: 'Copertura Leggera', media: 'Copertura Media', totale: 'Copertura Totale' }[d.linea.copertura] ?? ''}`, colori: ctx.dati.mappa.visuale.colori });
      // 08/10: la linea di tiro del giocatore (dal tablet), al posto di quella del master
      if (st.linea) disegnaLineaTiro(c, { scena: s, cam: st.cam, da: st.linea.da, a: st.linea.a, copertura: st.linea.copertura, etichetta: `${st.linea.distanza} Q · ${st.linea.testo}${st.linea.interposta ? ' · creatura interposta' : ''}${st.linea.protetto ? ' · protetto' : ''}`, colori: ctx.dati.mappa.visuale.colori });
      // fase 2, lotto 7: il percorso provato dal tablet, in attesa di «Conferma»
      if (st.prova && st.io?.token) {
        const mio = s.token.find((t) => t.id === st.io.token);
        const tratti = trattiPercorso(st.prova.percorso);
        tratti.forEach((t, i) => disegnaPercorso(c, { scena: s, cam: st.cam, percorso: t, ingombro: mio?.ingombro ?? 1, costo: i === tratti.length - 1 ? st.prova.costo : null, fascia: st.prova.fascia, colori: coloriAree(el.riquadro) }));
      }
      // percorso del master, a tratti fra le interruzioni della nebbia; il costo all'ultimo tratto
      if (d?.percorso && !mio) {
        const tratti = trattiPercorso(d.percorso.punti);
        const avv = avversariDellaDiretta(d);
        const colori = coloriAree(el.riquadro);
        tratti.forEach((t, i) => disegnaPercorso(c, { scena: s, cam: st.cam, percorso: t, ingombro: d.ingombro, costo: i === tratti.length - 1 ? d.percorso.costo : null, fascia: d.percorso.fascia, colori, inZoc: avv.length ? passiInZoc(t, d.ingombro, avv) : null, coloreZoc: ctx.dati.mappa.zoc.colore }));
      }
    },
  });
  const celleTemplate = new Map(); // celle per maschera (la stessa maschera torna a ogni lettura)
  function disegnaTemplateGiocatori(c, info, t) {
    const chiave = `${st.vista.griglia.colonne}x${st.vista.griglia.righe}|${t.celle}`;
    if (!celleTemplate.has(chiave)) { if (celleTemplate.size > 200) celleTemplate.clear(); celleTemplate.set(chiave, celleDaMaschera(t.celle, st.vista.griglia)); }
    const celle = celleTemplate.get(chiave);
    // il nome sul Q coperto più vicino al centro dei Q coperti
    let origine = null;
    if (t.nome) {
      const C = st.vista.griglia.colonne;
      let sx = 0, sy = 0, n = 0;
      for (let i = 0; i < celle.length; i++) if (celle[i]) { sx += i % C; sy += Math.floor(i / C); n++; }
      if (n) origine = [Math.floor(sx / n), Math.floor(sy / n)];
    }
    disegnaTemplate(c, { scena: st.vista, cam: st.cam, info, celle, colore: t.colore, stile: ctx.dati.mappa.template, etichetta: t.nome ?? null, origine });
  }
  /** La diretta, se riguarda la scena mostrata. */
  const direttaAttuale = () => (st.diretta && st.vista && st.diretta.scena === st.vista.id ? st.diretta : null);
  const NOMI_MODI = { passo: 'Passo', corsa: 'Corsa', scatto: 'Scatto', libero: 'Libero' };
  const numeroQ = (n) => String(n).replace('.', ',');
  /** Celle calcolate una volta per diretta (area e ZoC), e la riga in testata. */
  function usaDiretta(d) {
    st.diretta = d;
    const a = direttaAttuale();
    st.celle = { area: a ? celleDellaDiretta(a, st.vista) : null, zoc: a ? zocDellaDiretta(a, st.vista) : null };
    const t = a ? st.vista.token.find((x) => x.id === a.token) : null;
    el.movimento.hidden = !a?.token || !!st.io?.permesso?.puo;
    // (una diretta può portare solo la linea di tiro o l'anteprima di un template)
    el.movimento.textContent = a?.token ? [`Movimento${t?.info?.nome ? ` di ${t.info.nome}` : ''}: ${NOMI_MODI[a.modo]}`,
      a.modo !== 'libero' && a.disponibili !== null ? `${numeroQ(a.usato)} / ${numeroQ(a.disponibili)} Q usati` : null].filter(Boolean).join(' · ') : '';
    el.movimento.className = `giocatori-movimento${a ? ` modo-${a.modo}` : ''}`;
    // il token è già altrove (movimento appena fatto): la vista si rilegge senza aspettare il giro
    if (a && t && (t.q[0] !== a.q[0] || t.q[1] !== a.q[1])) aggiorna();
    tela.richiedi(['aree', 'sopra']);
  }

  /** Zone esplorate ma non viste adesso dai PG (vista.ombra, nebbia automatica): un velo scuro. */
  function disegnaOmbra(c, info) {
    const s = st.vista;
    const g = s.griglia;
    const r = rettangoloVisibile(st.cam, info.larghezza, info.altezza);
    const q = g.q_px;
    const tratti = trattiCoperti(daBase64(s.ombra), g.colonne, g.righe, { x0: Math.floor((r.x0 - g.scosto_x) / q), x1: Math.ceil((r.x1 - g.scosto_x) / q), y0: Math.floor((r.y0 - g.scosto_y) / q), y1: Math.ceil((r.y1 - g.scosto_y) / q) });
    if (!tratti.length) return;
    c.save();
    c.globalAlpha = ctx.dati.mappa.visuale.opacita_esplorate;
    c.fillStyle = getComputedStyle(el.riquadro).getPropertyValue('--mappa-nebbia').trim() || '#111';
    c.beginPath();
    for (const [y, xa, xb] of tratti) {
      const a = schermoDaMappa(st.cam, g.scosto_x + xa * q, g.scosto_y + y * q);
      const b = schermoDaMappa(st.cam, g.scosto_x + xb * q, g.scosto_y + (y + 1) * q);
      c.rect(Math.floor(a.x), Math.floor(a.y), Math.ceil(b.x - a.x) + 1, Math.ceil(b.y - a.y) + 1);
    }
    c.fill();
    c.restore();
  }
  function disegnaNebbia(c, info, opacita) {
    const s = st.vista;
    if (!s) return;
    const g = s.griglia;
    const r = rettangoloVisibile(st.cam, info.larghezza, info.altezza);
    const q = g.q_px;
    const limiti = { x0: Math.floor((r.x0 - g.scosto_x) / q), x1: Math.ceil((r.x1 - g.scosto_x) / q), y0: Math.floor((r.y0 - g.scosto_y) / q), y1: Math.ceil((r.y1 - g.scosto_y) / q) };
    const tratti = trattiCoperti(daBase64(s.nebbia.coperti), g.colonne, g.righe, limiti);
    if (!tratti.length) return;
    c.save();
    c.globalAlpha = opacita;
    c.fillStyle = getComputedStyle(el.riquadro).getPropertyValue('--mappa-nebbia').trim() || '#111';
    c.beginPath();
    for (const [y, xa, xb] of tratti) {
      const a = schermoDaMappa(st.cam, g.scosto_x + xa * q, g.scosto_y + y * q);
      const b = schermoDaMappa(st.cam, g.scosto_x + xb * q, g.scosto_y + (y + 1) * q);
      // mezzo pixel in più: niente fessure fra righe vicine
      c.rect(Math.floor(a.x), Math.floor(a.y), Math.ceil(b.x - a.x) + 1, Math.ceil(b.y - a.y) + 1);
    }
    c.fill();
    c.restore();
  }

  // data-zoom e data-origine: lo zoom attuale, per le prove (come data-disegno-ms di ./canvas.js)
  const segnaCamera = () => { el.riquadro.dataset.zoom = String(Math.round(st.cam.scala * 1000) / 10); el.riquadro.dataset.origine = `${Math.round(st.cam.ox)},${Math.round(st.cam.oy)}`; };
  const cambiaCamera = (cam) => { st.cam = cam; st.toccata = true; segnaCamera(); tela.richiedi(); };
  const adattaSchermo = () => {
    if (!st.vista) return;
    const { larghezza, altezza } = dimensioniMappa(st.vista);
    const d = tela.dimensioni();
    // la parte fuori dalla nebbia (tutta la mappa se è tutta scoperta o tutta coperta)
    const r = rettangoloScoperto(daBase64(st.vista.nebbia.coperti), st.vista.griglia);
    st.cam = r ? adattaRettangolo(r, d.larghezza, d.altezza, V) : adatta(larghezza, altezza, d.larghezza, d.altezza, V);
    segnaCamera();
    st.toccata = false;
    tela.richiedi();
  };
  const gesti = creaGesti(el.riquadro, {
    vista: V, camera: () => st.cam, cambiaCamera, adatta: adattaSchermo,
    premi: (e, p) => { st.trascina = { ...p, x0: p.x, y0: p.y, mosso: false }; el.riquadro.classList.add('trascina'); },
    muovi: (e, p, mio) => {
      if (!mio || !st.trascina) return;
      if (Math.hypot(p.x - st.trascina.x0, p.y - st.trascina.y0) > TOCCO_PX) st.trascina.mosso = true;
      cambiaCamera(sposta(st.cam, p.x - st.trascina.x, p.y - st.trascina.y));
      st.trascina = { ...st.trascina, x: p.x, y: p.y };
    },
    rilascia: (e, p, annullato) => {
      const t = st.trascina;
      st.trascina = null;
      el.riquadro.classList.remove('trascina');
      // fase 2, lotto 7: un tocco (senza spostare la vista) sceglie il quadretto di arrivo del proprio PG
      return !annullato && t && !t.mosso ? tocco(p) : false;
    },
    annulla: () => { st.trascina = null; el.riquadro.classList.remove('trascina'); },
  });
  // se la finestra cambia misura e nessuno ha toccato la vista, si riadatta
  const suMisura = () => { if (!st.toccata) adattaSchermo(); };
  window.addEventListener('resize', suMisura);
  // anche quando cambia solo il riquadro (barra dell'Iniziativa, scheda tornata visibile: prima l'adattamento poteva
  // essere calcolato con il riquadro a misura zero e la mappa restava ingrandita)
  const osservatore = typeof ResizeObserver === 'function' ? new ResizeObserver(() => suMisura()) : null;
  osservatore?.observe(el.riquadro);
  const suTasto = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName ?? '')) return;
    if (e.key === 'a' || e.key === 'A') { e.preventDefault(); adattaSchermo(); }
  };
  window.addEventListener('keydown', suTasto);

  // suoni della vista giocatori: spenti finché il master non accende «suona anche nella vista giocatori» (scena → audio)
  const audio = creaAudio(ctx.dati, { attivo: () => !!st.vista?.audio?.giocatori });
  const messaggio = (t) => { el.messaggio.textContent = t ?? ''; el.messaggio.hidden = !t; };
  async function usa(corpo) {
    usaTablet(corpo);
    // 08/10: la lettura precedente (scontro, Round, quando) per la campanella (src/mappa/audio.js → campanellaVista)
    const lettura = (v) => (v?.collegamento?.scontro ? { scontro: v.collegamento.scontro, round: v.turno?.round ?? null, quando: Date.now() } : null);
    const letturaPrima = st.ultimaLettura ?? null;
    st.vista = corpo.scena;
    // suoni (07/10): solo con «suona anche nella vista giocatori» acceso dal master; campanella al nuovo Round, musica
    audio.riprova();
    // la musica di fondo solo sullo schermo del tavolo, non sui tablet dei giocatori (08/10)
    audio.musica(st.pg ? null : st.vista?.audio?.musica ?? null);
    st.ultimaLettura = lettura(st.vista);
    const campanella = campanellaVista(letturaPrima, st.ultimaLettura, ctx.dati.mappa.audio.campanella_vista_pausa_max_ms);
    // ogni suono con il suo avviso scritto, così si capisce che cosa è suonato
    if (campanella && audio.effetto('nuovo_round')) avviso(`🔔 Nuovo Round ${campanella.round}`, { tipo: 'info', chiave: 'nuovo-round', durata: 5000 });
    // ZoC (07/10): gli Attacchi di Opportunità nuovi diventano un avviso anche qui (la prima lettura non li ripete)
    const primaLettura = !st.opportunitaViste;
    st.opportunitaViste ??= new Set();
    for (const o of corpo.scena?.opportunita ?? []) {
      const k = `${o.ora}|${o.testo}`;
      if (st.opportunitaViste.has(k)) continue;
      st.opportunitaViste.add(k);
      if (!primaLettura) avviso(o.testo, { tipo: 'info', durata: 12000 });
    }
    const barra = corpo.scena?.iniziativa ?? null;
    el.iniziativa.hidden = !barra;
    svuota(el.iniziativa, barra ? barraIniziativaEl(barra, { pxPerPunto: V.barra.iniziativa_px_per_punto, zero: ctx.dati.mappa.pv_zero, voloIcona: ctx.dati.mappa.volo.icona }) : null);
    if (!st.vista) {
      el.titolo.textContent = 'Mappa';
      el.turno.textContent = '';
      messaggio(corpo.motivo ?? 'Nessuna mappa in gioco.');
      tela.richiedi();
      return;
    }
    messaggio(null);
    // la diretta si ricalcola sulla scena nuova (nebbia e griglia possono essere cambiate)
    if (st.diretta) { const d = st.diretta; st.diretta = null; usaDiretta(d); }
    document.title = `${st.vista.nome} · Giocatori · Mutant`;
    el.titolo.textContent = st.vista.nome;
    const t = st.vista.turno;
    el.turno.textContent = t ? [t.round ? `Round ${t.round}` : null, t.nome ? `di turno: ${t.nome}` : null].filter(Boolean).join(' · ') : '';
    const file = st.vista.mappa?.file ?? null;
    if (file !== st.fileImmagine) {
      st.fileImmagine = file;
      st.immagine?.close?.();
      st.immagine = null;
      if (file) {
        try { const r = await fetch(`api/mappe/${encodeURIComponent(file)}`); if (r.ok) st.immagine = await createImageBitmap(await r.blob()); } catch { /* resta il fondo neutro */ }
      }
    }
    // scena nuova o mappa di altre misure: si riparte da «Adatta allo schermo»
    const chiave = `${st.vista.id}|${st.vista.griglia.colonne}x${st.vista.griglia.righe}|${file}`;
    if (chiave !== st.adattata) { st.adattata = chiave; adattaSchermo(); } else tela.richiedi();
    // dalla scheda (08/10): la mappa si apre centrata sul PG, dopo il primo «Adatta» (una volta; poi la muove il giocatore)
    if (st.daScheda && !st.centrato && st.io?.token && st.vista.token.some((t) => t.id === st.io.token)) { st.centrato = true; centraSuDiMe(); }
  }

  // ── Tablet del giocatore (fase 2, lotto 7) ──
  // avviso grande con suono e vibrazione (src/ui/allarme.js), anche senza «suona anche nella vista giocatori»
  const allarme = creaAllarme(ctx.dati);
  /** Avviso dal master («Chiedi di muovere») o «Tocca a te» (dal server): sulla mappa il pulsante centra sul PG. */
  function mostraAllarme(testo, tipo = 'muovi') {
    allarme.mostra({ testo, tipo, azioni: st.io?.token ? [{ testo: '🗺 Muovi il PG sulla mappa', primario: true, fai: () => centraSuDiMe() }] : [] });
  }

  /** «Sono…»: il PG del giocatore su questo tablet (ricordato), oppure solo guardare (lo schermo del tavolo). */
  async function scegliPg() {
    const elenco = st.pgs ?? [];
    const scelta = await apriFinestrella('tablet-scegli', 'Chi sei?', (fine) => [
      h('p', { class: 'nota' }, 'Scegli il tuo PG: questo tablet lo ricorda. Nessuna password: si gioca in casa.'),
      elenco.length ? h('div', { class: 'tablet-scelte' }, elenco.map((p) => h('button', { type: 'button', class: `btn${p.chiave === st.pg ? ' scelto' : ''}`, 'aria-pressed': String(p.chiave === st.pg), onclick: () => fine(p.chiave) }, p.nome)))
        : h('p', {}, 'Nessun PG in questa scena: aspetta che il master la prepari.'),
      h('div', { class: 'riga-azioni finestrella-azioni' },
        h('button', { type: 'button', class: 'btn', onclick: () => fine('') }, 'Solo guardare (schermo del tavolo)'),
        h('button', { type: 'button', class: 'btn', onclick: () => fine(null) }, 'Annulla')),
    ]);
    if (scelta === null) return;
    st.pg = scelta || null;
    scriviPg(st.pg);
    st.io = null; st.prova = null; st.turnoPrima = null; st.celleMie = null;
    st.firma = null;
    apriFlusso();
    aggiornaTablet();
    await aggiorna();
    centraSuDiMe();
  }

  /** Il blocco `io` e l'elenco dei PG dalla vista; «Tocca a te» al cambio di turno, se il master lo ha acceso. */
  /** «← Torna alla scheda» (vista aperta dalla scheda del PG). */
  function tornaAllaScheda() { if (ctx.scheda && ctx.tornaAllaScheda) ctx.tornaAllaScheda(ctx.scheda); }
  function usaTablet(corpo) {
    // 08/10: aperta dalla scheda, lo scontro è finito («Fine scontro» del master): si torna alla scheda
    if (st.daScheda && corpo.scontroAperto === false) {
      avviso('Lo scontro è finito: torni alla scheda.', { tipo: 'info', chiave: 'tablet-fine' });
      tornaAllaScheda();
      return;
    }
    st.pgs = corpo.pgs ?? [];
    const prima = st.io;
    st.io = st.pg ? corpo.io ?? null : null;
    st.celleMie = null;
    if (st.io?.permesso?.puo) el.movimento.hidden = true;
    const turno = !!st.io?.mini?.diTurno;
    // «Tocca a te» lo manda il server al cambio di turno (08/10), alla scheda o alla mappa aperta
    st.turnoPrima = st.io?.mini ? turno : null;
    // il permesso è cambiato o il token si è mosso: la prova non vale più
    if (st.prova && (!st.io?.permesso?.puo || prima?.area?.usato !== st.io?.area?.usato)) st.prova = null;
    aggiornaTablet();
  }

  /** Celle dell'area del proprio PG fino alla fascia scelta (1 Passo, 2 Corsa, 3 Scatto), o null. */
  function celleMie() {
    if (!st.io?.permesso?.puo || !st.io.area || !st.vista) return null;
    if (st.celleMie?.fascia === st.fascia) return st.celleMie.celle;
    const celle = celleDellaDiretta({ area: st.io.area.maschere }, st.vista);
    if (celle) for (let i = 0; i < celle.length; i++) if (celle[i] > st.fascia) celle[i] = 0;
    st.celleMie = { fascia: st.fascia, celle };
    return celle;
  }

  /** ZoC degli avversari visibili attorno al proprio token (dal server, già filtrate), o null. */
  function zocMie() {
    if (!st.io?.zoc?.length || !st.vista) return null;
    return zocDellaDiretta({ zoc: st.io.zoc }, st.vista);
  }

  /** Q di arrivo sotto il dito (il Q in alto a sinistra dell'ingombro, centrato sul dito). */
  function qSotto(p) {
    const g = st.vista.griglia;
    const m = mappaDaSchermo(st.cam, p.x, p.y);
    const mio = st.vista.token.find((t) => t.id === st.io?.token);
    const [w, hh] = dimensioni(mio?.ingombro ?? 1);
    return [Math.floor((m.x - g.scosto_x) / g.q_px - (w - 1) / 2), Math.floor((m.y - g.scosto_y) / g.q_px - (hh - 1) / 2)];
  }

  /** Un tocco sulla mappa: con il permesso di muovere, la prova del movimento verso quel quadretto. */
  function tocco(p) {
    if (!st.pg || !st.vista || !st.io) return false;
    // 08/10: «Linea di tiro» attiva: il tocco sceglie il bersaglio, un token o un quadretto (anche fuori turno)
    if (st.lineaModo) { lineaVerso(p); return true; }
    if (!st.io.permesso?.puo) {
      if (st.io.permesso?.motivo) avviso(st.io.permesso.motivo, { tipo: 'info', chiave: 'tablet-fermo' });
      return true;
    }
    const a = qSotto(p);
    const mio = st.vista.token.find((t) => t.id === st.io.token);
    if (mio && a[0] === mio.q[0] && a[1] === mio.q[1]) { st.prova = null; aggiornaTablet(); tela.richiedi(['sopra']); return true; }
    provaVerso(a);
    return true;
  }

  /** «Linea di tiro» dal tablet (08/10): dal proprio PG al token o al quadretto toccato; la calcola il server. */
  function cambiaLineaModo(v = !st.lineaModo) {
    st.lineaModo = v;
    if (!v) st.linea = null;
    st.prova = null;
    aggiornaTablet();
    tela.richiedi(['sopra']);
  }
  async function lineaVerso(p) {
    const g = st.vista.griglia;
    const m = mappaDaSchermo(st.cam, p.x, p.y);
    const q = [Math.floor((m.x - g.scosto_x) / g.q_px), Math.floor((m.y - g.scosto_y) / g.q_px)];
    // un token che il giocatore vede in quel quadretto (il più in alto), altrimenti il quadretto
    const t = [...st.vista.token].reverse().find((x) => x.id !== st.io.token && celleToken(x).some(([a, b]) => a === q[0] && b === q[1]));
    try {
      const r = await fetch('api/vista-giocatori/linea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scena: st.vista.id, pg: st.pg, ...(ctx.scontro ? { scontro: ctx.scontro } : {}), ...(t ? { token: t.id } : { q }) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) { avviso(j.errore ?? 'Linea di tiro non disponibile.', { tipo: 'info', chiave: 'tablet-linea' }); return; }
      st.linea = { ...j, nome: j.nome ?? t?.info?.nome ?? null };
    } catch { avviso('Collegamento con il master perso: riprova.', { tipo: 'errore', chiave: 'tablet-linea' }); }
    aggiornaTablet();
    tela.richiedi(['sopra']);
  }
  const testoLinea = (l) => [`${l.distanza} Q`, l.testo, l.interposta ? `creatura interposta (${ctx.dati.regole.attacco_distanza.interposta?.va ?? -2} VA, A.144)` : null, l.protetto ? 'bersaglio protetto (−4 VA, §5.10)' : null, l.luce ? `luce: ${l.luce}` : null, l.inVolo ? 'in volo' : null].filter(Boolean).join(' · ');

  const chiama = async (corpo) => {
    const r = await fetch('api/vista-giocatori/movimento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scena: st.vista.id, pg: st.pg, fascia: st.fascia, ...(ctx.scontro ? { scontro: ctx.scontro } : {}), ...corpo }) });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok && j.ok !== false, ...j };
  };
  async function provaVerso(a) {
    if (st.inVolo) return;
    st.inVolo = true;
    try {
      const r = await chiama({ a, prova: true });
      if (!r.ok) { st.prova = null; avviso(r.errore ?? 'Movimento non possibile.', { tipo: 'info', chiave: 'tablet-prova' }); }
      else st.prova = { a, ...r };
    } catch { avviso('Collegamento con il master perso: riprova.', { tipo: 'errore', chiave: 'tablet-prova' }); } finally { st.inVolo = false; }
    aggiornaTablet();
    tela.richiedi(['sopra']);
  }
  async function conferma() {
    if (!st.prova || st.inVolo) return;
    st.inVolo = true;
    aggiornaTablet();
    try {
      const r = await chiama({ a: st.prova.a });
      if (!r.ok) avviso(r.errore ?? 'Movimento non riuscito.', { tipo: 'errore', chiave: 'tablet-prova' });
      else {
        const ao = (r.opportunita ?? []).map((o) => `Attacco di Opportunità di ${o.nome}!`);
        st.mosso = true;
        avviso([`Ti sei mosso: ${numeroQ(r.costo)} Q (${NOMI_MODI[r.fascia] ?? r.fascia}).`, ...ao, r.blocco ? 'Corsa e Scatto sono un blocco unico: movimento del Round finito.' : null].filter(Boolean), { tipo: ao.length ? 'info' : 'ok', chiave: 'tablet-mosso', durata: ao.length ? 12000 : 5000,
          azioni: st.daScheda ? [{ testo: '← Torna alla scheda', fai: () => tornaAllaScheda() }] : [] });
      }
    } catch { avviso('Collegamento con il master perso: riprova.', { tipo: 'errore', chiave: 'tablet-prova' }); } finally { st.inVolo = false; }
    st.prova = null;
    st.firma = null;
    await aggiorna();
    aggiornaTablet();
    tela.richiedi(['aree', 'sopra']);
  }
  function cambiaFascia(n) {
    st.fascia = n;
    st.prova = null;
    st.celleMie = null;
    aggiornaTablet();
    tela.richiedi(['aree', 'sopra']);
  }
  /** «Centra su di me»: il proprio token al centro, con lo zoom attuale. */
  function centraSuDiMe() {
    const t = st.vista?.token.find((x) => x.id === st.io?.token);
    if (!t) { if (st.io) avviso('Il tuo token non si vede sulla mappa.', { tipo: 'info', chiave: 'tablet-centra' }); return; }
    const c = centroToken(st.vista.griglia, t);
    const d = tela.dimensioni();
    cambiaCamera({ ...st.cam, ox: d.larghezza / 2 - c.x * st.cam.scala, oy: d.altezza / 2 - c.y * st.cam.scala });
  }
  const barra = (v, classe) => (v?.massimo > 0 ? h('span', { class: `tablet-barra ${classe}`, title: `${v.attuali} / ${v.massimo}` }, h('span', { style: `width: ${Math.max(0, Math.min(100, (v.attuali / v.massimo) * 100))}%` })) : null);
  /** Il pannello del tablet: mini-scheda, stato del movimento, fasce, conferma. */
  function aggiornaTablet() {
    const pgs = st.pgs ?? [];
    el.sono.hidden = st.daScheda || (!st.pg && !pgs.length);
    el.sono.textContent = st.pg ? `Tu: ${st.io?.nome ?? st.pg} ▾` : 'Sono…';
    el.sono.title = st.pg ? 'Cambia PG o torna a guardare soltanto' : 'Scegli il tuo PG per muoverlo da questo tablet';
    el.tablet.hidden = !st.pg;
    if (!st.pg) { svuota(el.tablet); return; }
    const io = st.io;
    if (!io) { svuota(el.tablet, h('p', { class: 'nota' }, st.vista ? 'Lettura del tuo PG…' : 'Nessuna mappa in gioco.')); return; }
    if (!io.trovato) { svuota(el.tablet, h('p', { class: 'tablet-motivo' }, io.permesso?.motivo ?? ''), h('button', { type: 'button', class: 'btn', onclick: () => scegliPg() }, 'Cambia PG')); return; }
    const m = io.mini;
    const pm = m?.pm;
    const mini = h('div', { class: 'tablet-mini' },
      h('strong', { class: 'tablet-nome' }, io.nome, m?.diTurno ? h('span', { class: 'tablet-tuo-turno' }, ' · tocca a te') : null),
      m?.pv ? h('span', { class: 'tablet-valore' }, 'PV ', h('b', {}, `${m.pv.attuali} / ${m.pv.massimo}`), barra(m.pv, 'pv')) : null,
      pm ? h('span', { class: 'tablet-valore' }, 'PM ', h('b', {}, `${pm.attuali} / ${pm.massimo}`), barra(pm, 'pm')) : null,
      h('span', { class: 'tablet-stati' }, [m?.ferite, ...(m?.stati ?? [])].filter(Boolean).join(', ') || 'Nessuno Stato'));
    const puo = !!io.permesso?.puo;
    const a = io.area;
    const stato = puo
      ? h('p', { class: 'tablet-stato puo' }, a?.motivo ? `Movimento: ${a.motivo}.` : `Tocca un quadretto dell’area, poi «Conferma». Usati ${numeroQ(a?.usato ?? 0)} Q.`)
      : h('p', { class: `tablet-stato${io.impostazioni?.bloccato ? ' bloccato' : ''}` }, io.impostazioni?.bloccato ? '🔒 ' : '', io.permesso?.motivo ?? '');
    const r = a?.rimaste ?? {};
    const fasce = puo ? h('div', { class: 'tablet-fasce', role: 'group', 'aria-label': 'Fascia di movimento' }, ['passo', 'corsa', 'scatto'].map((f, i) => h('button', {
      type: 'button', class: `btn modo-${f}${st.fascia === i + 1 ? ' scelto' : ''}`, 'aria-pressed': String(st.fascia === i + 1), disabled: r[f] === null || r[f] === undefined,
      title: r[f] === null ? (a?.escluse?.includes(f) ? 'Passo già cominciato: Corsa e Scatto si fanno da fermi' : 'Non disponibile') : `${NOMI_MODI[f]}: ${numeroQ(r[f])} Q`,
      onclick: () => cambiaFascia(i + 1),
    }, NOMI_MODI[f], r[f] !== null && r[f] !== undefined ? h('small', {}, ` ${numeroQ(r[f])} Q`) : null))) : null;
    const p = st.prova;
    const conf = p ? h('div', { class: 'tablet-conferma' },
      h('p', {}, `Arrivo: ${numeroQ(p.costo)} Q (${NOMI_MODI[p.fascia] ?? p.fascia})`, p.blocco ? `, blocco unico${p.persi ? `: ${numeroQ(p.persi)} Q persi` : ''}` : ''),
      ...(p.opportunita ?? []).map((o) => h('p', { class: 'tablet-zoc' }, `⚠ Esci dalla ZoC di ${o.nome}: Attacco di Opportunità!`)),
      h('div', { class: 'riga-azioni' },
        h('button', { type: 'button', class: 'btn', onclick: () => { st.prova = null; aggiornaTablet(); tela.richiedi(['sopra']); } }, 'Annulla'),
        h('button', { type: 'button', class: 'btn primario', disabled: st.inVolo, onclick: () => conferma() }, 'Conferma'))) : null;
    el.torna.className = `btn tablet-torna${st.mosso ? ' primario' : ''}`;
    const linea = st.linea ? h('div', { class: 'tablet-conferma tablet-linea' }, h('p', {}, `🎯 ${st.linea.nome ? `${st.linea.nome}: ` : ''}${testoLinea(st.linea)}`), st.linea.copertura === 'totale' ? h('p', { class: 'tablet-zoc' }, 'Copertura Totale: non si può attaccare direttamente (§5.8).') : null) : null;
    svuota(el.tablet, mini, stato, fasce, conf, linea,
      h('div', { class: 'riga-azioni tablet-comandi' },
        h('button', { type: 'button', class: `btn${st.lineaModo ? ' scelto' : ''}`, 'aria-pressed': String(!!st.lineaModo), title: 'Dal tuo PG verso un token o un quadretto che vedi: distanza, Copertura, protetto, luce. Anche fuori turno; non cambia nulla', onclick: () => cambiaLineaModo() }, st.lineaModo ? '🎯 Linea di tiro: tocca il bersaglio (chiudi)' : '🎯 Linea di tiro'),
        h('button', { type: 'button', class: 'btn', onclick: () => centraSuDiMe() }, '⌖ Centra su di me'),
        st.daScheda ? h('button', { type: 'button', class: `btn${st.mosso ? ' primario' : ''}`, onclick: () => tornaAllaScheda() }, '← Torna alla scheda') : null));
  }

  let inCorso = false;
  async function aggiorna() {
    if (st.chiusa || inCorso) return;
    inCorso = true;
    try {
      const q = new URLSearchParams();
      if (st.firma) q.set('firma', st.firma);
      if (st.pg) q.set('pg', st.pg);
      if (ctx.scontro) q.set('scontro', ctx.scontro);
      const r = await fetch(`api/vista-giocatori${q.size ? `?${q}` : ''}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`errore ${r.status}`);
      const corpo = await r.json();
      st.errore = null;
      el.stato.textContent = '';
      if (!corpo.invariata) { st.firma = corpo.firma; await usa(corpo); }
      // la lettura è riuscita anche se nulla è cambiato: per la campanella conta il tempo dall'ultima lettura riuscita
      else if (st.ultimaLettura) st.ultimaLettura.quando = Date.now();
    } catch (e) {
      // collegamento perso: la mappa resta com'era, con l'avviso (§13)
      st.errore = e.message;
      el.stato.textContent = 'Collegamento con il master perso: riprovo…';
    } finally { inCorso = false; }
  }
  aggiorna();
  const giro = setInterval(aggiorna, INTERVALLO_MS);
  // diretta: EventSource si ricollega da solo (retry del server: 1 s)
  // fase 2, lotto 7: il tablet apre il flusso con il suo PG (per il campanellino); cambiando PG si riapre
  let flusso = null;
  function apriFlusso() {
    flusso?.close();
    flusso = typeof EventSource === 'function' ? new EventSource(`api/vista-giocatori/diretta${st.pg ? `?pg=${encodeURIComponent(st.pg)}` : ''}`) : null;
    flusso?.addEventListener('diretta', (e) => { try { usaDiretta(JSON.parse(e.data)); } catch { /* evento rovinato: si aspetta il prossimo */ } });
    flusso?.addEventListener('aggiorna', () => aggiorna());
    flusso?.addEventListener('open', () => controllaVersione());
    // il master chiede «Adatta allo schermo» (sezione «Vista giocatori»)
    flusso?.addEventListener('adatta', () => adattaSchermo());
    flusso?.addEventListener('avviso', (e) => { try { const a = JSON.parse(e.data); mostraAllarme(a.testo, a.tipo); } catch { /* evento rovinato */ } });
  }
  // ritocchi del 07/10: la vista giocatori si aggiorna da sola a una versione nuova dell'app (a schermo intero la barra
  // «Nuova versione» non si vede, e una finestra aperta prima dell'aggiornamento restava sul codice vecchio): controllo
  // ogni CONTROLLO_VERSIONE_MS e a ogni ricollegamento del flusso (server riavviato); niente da perdere ricaricando
  const caricata = document.querySelector('meta[name="mutant-versione"]')?.content || null;
  const controllaVersione = async () => {
    if (st.chiusa) return;
    try {
      const r = await fetch('versione.json', { cache: 'no-store' });
      const v = r.ok ? leggiVersione(await r.json()) : null;
      if (v && serveAggiornamento(caricata, v.versione)) location.href = urlRicarica(location.href, v.versione);
    } catch { /* senza rete: si riprova al prossimo giro */ }
  };
  const giroVersione = setInterval(controllaVersione, CONTROLLO_VERSIONE_MS);
  apriFlusso();
  // a schermo intero (pulsante o F11, anche sul secondo monitor) solo mappa e barra dell'Iniziativa: niente testata,
  // barre né comandi; l'avviso «collegamento perso» resta (css/style.css → body.schermo-intero). F11 non avvisa la
  // pagina: si riconosce dalla finestra grande quanto lo schermo
  const suSchermo = () => document.body.classList.toggle('schermo-intero', !!document.fullscreenElement
    || (window.innerHeight >= screen.height - 1 && window.innerWidth >= screen.width - 1));
  suSchermo();
  document.addEventListener('fullscreenchange', suSchermo);
  window.addEventListener('resize', suSchermo);
  // lo schermo del tavolo non si spegne mentre la vista è aperta (§13), dove il browser lo permette
  let blocco = null;
  const tieniAcceso = async () => { try { blocco = await navigator.wakeLock?.request('screen'); } catch { /* non concesso */ } };
  const suVisibile = () => { if (document.visibilityState === 'visible') tieniAcceso(); };
  tieniAcceso();
  document.addEventListener('visibilitychange', suVisibile);

  return () => {
    st.chiusa = true;
    audio.chiudi();
    allarme.distruggi();
    clearInterval(giro);
    clearInterval(giroVersione);
    flusso?.close();
    gesti.distruggi();
    tela.distruggi();
    window.removeEventListener('resize', suMisura);
    osservatore?.disconnect();
    window.removeEventListener('keydown', suTasto);
    document.removeEventListener('visibilitychange', suVisibile);
    document.removeEventListener('fullscreenchange', suSchermo);
    window.removeEventListener('resize', suSchermo);
    document.body.classList.remove('schermo-intero');
    blocco?.release?.().catch(() => {});
    st.immagine?.close?.();
  };
}
