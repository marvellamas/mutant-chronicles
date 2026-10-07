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
import { h, svuota } from '../dom.js';
import { cameraIniziale, sposta, adatta, schermoDaMappa, rettangoloVisibile } from '../../mappa/camera.js';
import { dimensioniMappa, lineeVisibili } from '../../mappa/griglia.js';
import { daBase64 } from '../../mappa/celle.js';
import { trattiCoperti } from '../../mappa/nebbia.js';
import { chiaveRif } from '../../mappa/token.js';
import { creaTela } from './canvas.js';
import { creaGesti } from './gesti.js';
import { disegnaToken, coloriMappa, creaImmagini } from './disegno-token.js';
import { barraIniziativaEl } from './barra-iniziativa.js';
import { disegnaArea, disegnaZoc, disegnaPercorso, coloriAree, disegnaTemplate, disegnaPorte, disegnaMuri } from './disegno-aree.js';
import { celleDaMaschera, templateVisibili, ostacoliVisibili } from '../../mappa/template.js';
import { celleDellaDiretta, zocDellaDiretta, avversariDellaDiretta, trattiPercorso } from '../../mappa/diretta.js';
import { passiInZoc } from '../../mappa/zoc.js';
import { avviso } from '../avvisi.js';

// due schermi del master (07/10): la vista si aggiorna entro 1–2 secondi dalle azioni del master
const INTERVALLO_MS = 1000;

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
  const st = { vista: null, firma: null, cam: cameraIniziale(), immagine: null, fileImmagine: null, chiusa: false, errore: null, adattata: null, toccata: false, trascina: null, diretta: null, celle: { area: null, zoc: null } };
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
  el.riquadro.append(el.messaggio, el.movimento);
  svuota(radice, h('section', { class: 'mappa-pagina giocatori-pagina' },
    h('header', { class: 'giocatori-barra' }, el.titolo, el.turno, el.stato, el.schermo), el.iniziativa, el.riquadro));

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
      if (d) {
        const s = st.vista;
        const zoc = st.celle.zoc;
        if (zoc) disegnaZoc(c, { scena: s, cam: st.cam, info, celle: zoc, stile: ctx.dati.mappa.zoc });
        if (st.celle.area) disegnaArea(c, { scena: s, cam: st.cam, info, celle: st.celle.area, colori: coloriAree(el.riquadro), stile: V.area });
      }
      disegnaNebbia(c, info, 1);
    },
    sopra: (c) => {
      const s = st.vista;
      if (!s) return;
      const pezzi = new Map(s.token.filter((t) => t.info).map((t) => [chiaveRif(t.rif), { ...t.info, ritratto: t.info.immagine, pv: t.info.pv === null ? null : { attuali: t.info.pv, massimo: 1 }, stati: [] }]));
      const d = direttaAttuale();
      disegnaToken(c, { scena: s, cam: st.cam, pezzi, colori: coloriMappa(el.riquadro), immagine, selezionato: d?.token ?? null, bordo: (p) => p.bordo ?? null, alone: ctx.dati.mappa.colori.alone_turno, ritrattoVerticale: ctx.dati.mappa.token.ritratto_verticale, pv: { stile: ctx.dati.mappa.pv_token, mostra: () => true } });
      // percorso del master, a tratti fra le interruzioni della nebbia; il costo all'ultimo tratto
      if (d?.percorso) {
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
    el.movimento.hidden = !a?.token;
    el.movimento.textContent = a?.token ? [`Movimento${t?.info?.nome ? ` di ${t.info.nome}` : ''}: ${NOMI_MODI[a.modo]}`,
      a.modo !== 'libero' && a.disponibili !== null ? `${numeroQ(a.usato)} / ${numeroQ(a.disponibili)} Q usati` : null].filter(Boolean).join(' · ') : '';
    el.movimento.className = `giocatori-movimento${a ? ` modo-${a.modo}` : ''}`;
    // il token è già altrove (movimento appena fatto): la vista si rilegge senza aspettare il giro
    if (a && t && (t.q[0] !== a.q[0] || t.q[1] !== a.q[1])) aggiorna();
    tela.richiedi(['aree', 'sopra']);
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
    st.cam = adatta(larghezza, altezza, d.larghezza, d.altezza, V);
    segnaCamera();
    st.toccata = false;
    tela.richiedi();
  };
  const gesti = creaGesti(el.riquadro, {
    vista: V, camera: () => st.cam, cambiaCamera, adatta: adattaSchermo,
    premi: (e, p) => { st.trascina = p; el.riquadro.classList.add('trascina'); },
    muovi: (e, p, mio) => { if (!mio || !st.trascina) return; cambiaCamera(sposta(st.cam, p.x - st.trascina.x, p.y - st.trascina.y)); st.trascina = p; },
    rilascia: () => { st.trascina = null; el.riquadro.classList.remove('trascina'); return false; },
    annulla: () => { st.trascina = null; el.riquadro.classList.remove('trascina'); },
  });
  // se la finestra cambia misura e nessuno ha toccato la vista, si riadatta
  const suMisura = () => { if (!st.toccata) adattaSchermo(); };
  window.addEventListener('resize', suMisura);

  const messaggio = (t) => { el.messaggio.textContent = t ?? ''; el.messaggio.hidden = !t; };
  async function usa(corpo) {
    st.vista = corpo.scena;
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
    svuota(el.iniziativa, barra ? barraIniziativaEl(barra, { pxPerPunto: V.barra.iniziativa_px_per_punto }) : null);
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
  }

  let inCorso = false;
  async function aggiorna() {
    if (st.chiusa || inCorso) return;
    inCorso = true;
    try {
      const r = await fetch(`api/vista-giocatori${st.firma ? `?firma=${st.firma}` : ''}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`errore ${r.status}`);
      const corpo = await r.json();
      st.errore = null;
      el.stato.textContent = '';
      if (!corpo.invariata) { st.firma = corpo.firma; await usa(corpo); }
    } catch (e) {
      // collegamento perso: la mappa resta com'era, con l'avviso (§13)
      st.errore = e.message;
      el.stato.textContent = 'Collegamento con il master perso: riprovo…';
    } finally { inCorso = false; }
  }
  aggiorna();
  const giro = setInterval(aggiorna, INTERVALLO_MS);
  // diretta: EventSource si ricollega da solo (retry del server: 1 s)
  const flusso = typeof EventSource === 'function' ? new EventSource('api/vista-giocatori/diretta') : null;
  flusso?.addEventListener('diretta', (e) => { try { usaDiretta(JSON.parse(e.data)); } catch { /* evento rovinato: si aspetta il prossimo */ } });
  flusso?.addEventListener('aggiorna', () => aggiorna());
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
    clearInterval(giro);
    flusso?.close();
    gesti.distruggi();
    tela.distruggi();
    window.removeEventListener('resize', suMisura);
    document.removeEventListener('visibilitychange', suVisibile);
    document.removeEventListener('fullscreenchange', suSchermo);
    window.removeEventListener('resize', suSchermo);
    document.body.classList.remove('schermo-intero');
    blocco?.release?.().catch(() => {});
    st.immagine?.close?.();
  };
}
