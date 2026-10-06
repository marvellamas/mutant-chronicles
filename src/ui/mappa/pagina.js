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
// Logica pura in src/mappa/ (camera, griglia, token, partecipanti, nebbia); disegno in ./canvas.js e ./disegno-token.js.
import { h, svuota } from '../dom.js';
import { avviso, avvisoErrore } from '../avvisi.js';
import { cameraIniziale, zoomVerso, sposta, adatta, mappaDaSchermo, schermoDaMappa, rettangoloVisibile } from '../../mappa/camera.js';
import { calibraDaQuadretto, applicaGriglia, dimensioniMappa, lineeVisibili, testoScala } from '../../mappa/griglia.js';
import { creaTela } from './canvas.js';
import { leggiScena, salvaScena, caricaImmagine, controllaFile, preparaRidotta } from './api.js';
import { agganciaQ, centroToken, tokenSottoPunto, disponiInFila, sovrapposti, chiaveRif } from '../../mappa/token.js';
import { pezziDellaScena, pezziSenzaToken, tokenOrfani, tokenPerPezzo } from '../../mappa/partecipanti.js';
import { daBase64, cella, conta } from '../../mappa/celle.js';
import { tratto, valoreModo, nebbiaProvvisoria, chiudiPennellata, rettangoloNebbia, tuttaNebbia, annullaNebbia, quantiQ, trattiCoperti } from '../../mappa/nebbia.js';
import { creaGesti } from './gesti.js';
import { svgQR } from '../../qr.js';
import { leggiRete } from '../collega.js';
import { creaFonti } from './fonti.js';
import { disegnaToken, coloriMappa, creaImmagini } from './disegno-token.js';
import { sezioneScontro, sezioneToken, TIPO_TRASCINA } from './pannello-scontro.js';
import { apriCartaInPlancia } from './canale.js';
import { scegliImmagineNemico, impostaImmagineNemico } from '../immagine-nemico.js';

const ATTESA_SALVATAGGIO_MS = 600;
const ATTESA_RIPROVA_MS = 5000; // dopo un errore di rete o del server
const SCARTO_AVVISO = 0.15; // riquadro tracciato poco quadrato: si avvisa (non si rifiuta)
const TRASCINAMENTO_MINIMO_PX = 4;
const INTERVALLO_FONTI_MS = 3000; // come la plancia (src/ui/tavolo.js)

const numero = (n, cifre = 2) => String(Math.round(n * 10 ** cifre) / 10 ** cifre).replace('.', ',');
const ora = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const inCampo = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName ?? '') || e.target?.isContentEditable;

/**
 * Disegna la pagina della scena `ctx.id` in `radice`.
 * @param ctx { dati, id, azioni: { tavolo() } }
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
  };
  const leggiFonti = creaFonti(ctx.dati);

  // ── Struttura della pagina, creata una volta: si aggiornano solo i testi e i campi ──
  const el = {};
  el.scegliFile = h('input', { type: 'file', accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp', hidden: true, onchange: (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) caricaDaFile(f); } });
  el.titolo = h('h1', { class: 'mappa-titolo' }, 'Mappa');
  el.zoom = h('span', { class: 'mappa-zoom', title: 'Zoom (rotella, + e −)' }, '100 %');
  el.scala = h('span', { class: 'mappa-scala' });
  el.stato = h('span', { class: 'nota mappa-stato', 'aria-live': 'polite' });
  el.btnGriglia = h('button', { type: 'button', class: 'btn', 'aria-expanded': 'true', title: 'Scontro, token e griglia', onclick: () => { el.pannello.hidden = !el.pannello.hidden; el.btnGriglia.setAttribute('aria-expanded', String(!el.pannello.hidden)); } }, 'Pannello');
  el.btnCarica = h('button', { type: 'button', class: 'btn', title: 'Immagine di fondo: JPG, PNG o WEBP', onclick: () => el.scegliFile.click() }, 'Carica immagine');
  el.barra = h('header', { class: 'mappa-barra' },
    h('button', { type: 'button', class: 'btn', title: 'Torna alla plancia del Tavolo del Master', onclick: () => ctx.azioni.tavolo() }, '← Tavolo'),
    el.titolo,
    h('span', { class: 'mappa-comandi' },
      el.btnCarica, el.scegliFile,
      h('button', { type: 'button', class: 'btn tondo', title: 'Allontana (−)', 'aria-label': 'Allontana', onclick: () => zoomCentro(1 / V.passo_tasti) }, '−'),
      el.zoom,
      h('button', { type: 'button', class: 'btn tondo', title: 'Avvicina (+)', 'aria-label': 'Avvicina', onclick: () => zoomCentro(V.passo_tasti) }, '+'),
      h('button', { type: 'button', class: 'btn', title: 'Tutta la mappa nel riquadro', onclick: () => adattaSchermo() }, 'Adatta allo schermo'),
      el.btnGriglia),
    el.scala, el.stato);
  el.riquadro = h('div', { class: 'mappa-tela', tabindex: '0', 'aria-label': 'Mappa: rotella per lo zoom, barra spaziatrice e mouse o trascinamento per spostarsi' });
  el.suggerimento = h('div', { class: 'mappa-suggerimento', hidden: true, role: 'status' });
  el.riquadro.append(el.suggerimento);
  el.pannello = h('aside', { class: 'mappa-pannello', 'aria-label': 'Scontro, token e griglia' });
  el.secScontro = h('div');
  el.secToken = h('div');
  el.pGriglia = h('details', { class: 'mappa-sezione mappa-griglia' });
  el.pNebbia = h('details', { class: 'mappa-sezione mappa-nebbia', open: true });
  el.pGiocatori = h('details', { class: 'mappa-sezione mappa-giocatori' });
  svuota(radice, h('section', { class: 'mappa-pagina' }, el.barra, h('div', { class: 'mappa-corpo' }, el.riquadro, el.pannello)));

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
      const r = rettangoloVisibile(st.cam, info.larghezza, info.altezza);
      const q = g.q_px;
      const tratti = trattiCoperti(daBase64(s.nebbia.coperti), g.colonne, g.righe,
        { x0: Math.floor((r.x0 - g.scosto_x) / q), x1: Math.ceil((r.x1 - g.scosto_x) / q), y0: Math.floor((r.y0 - g.scosto_y) / q), y1: Math.ceil((r.y1 - g.scosto_y) / q) });
      if (!tratti.length) return;
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
    },
    sopra: (c) => {
      if (st.scena) {
        const t = st.trascina?.modo === 'token' ? { id: st.trascina.token, q: st.trascina.q } : null;
        disegnaToken(c, { scena: st.scena, cam: st.cam, pezzi: st.mappaPezzi, colori: coloriMappa(el.riquadro), immagine, selezionato: st.selezionato, trascina: t });
      }
      // anteprima del rettangolo di nebbia
      const tn = st.trascina;
      if (tn?.modo === 'nebbia' && st.nebbia.strumento === 'rettangolo' && st.scena) {
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
  });

  const immagine = creaImmagini(() => ridisegna(['sopra']));

  const aggiornaBarra = () => {
    el.zoom.textContent = `${Math.round(st.cam.scala * 100)} %`;
    const g = st.scena?.griglia;
    el.scala.textContent = g ? `${testoScala(ctx.dati)} · ${numero(g.q_px)} px per Q · ${g.colonne} × ${g.righe} Q` : testoScala(ctx.dati);
    el.stato.textContent = st.salvataggio.testo;
  };
  const ridisegna = (livelli) => { tela.richiedi(livelli); aggiornaBarra(); };
  const cambiaCamera = (cam) => { st.cam = cam; ridisegna(['fondo', 'sopra']); };
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
    ridisegna(['fondo']);
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
    if (st.fonti !== null) { disegnaPannelloNebbia(); disegnaPannelloGiocatori(); }
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
  svuota(el.pannello, el.secScontro, el.secToken, el.pNebbia, el.pGiocatori, el.pGriglia);
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

  function bloccaGriglia() {
    const g = st.scena.griglia;
    if (g.bloccata && !confirm('Sbloccare la griglia? Cambiando dimensione o scostamento, nebbia, muri e token disegnati finora potrebbero non combaciare più con l’immagine.')) return;
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
        if (orfani.length && cambio && !confirm(`Con il nuovo collegamento ${orfani.length} token non hanno più un partecipante e verranno tolti dalla mappa (${orfani.map((t) => prima.get(chiaveRif(t.rif))?.nome ?? t.id).join(', ')}). Procedere? «Annulla» torna al collegamento di prima.`)) {
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
      disegnaPannelli();
      ridisegna(['sopra']);
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
      f.mancante, f.errori, !!f.scontro, !!f.bozza, f.scontro?.round, senza.map((p) => [p.chiave, p.nome, p.lato, p.ingombro]), st.daPiazzare, scelto, pz]);
    if (firma === st.firmaPannello) return;
    st.firmaPannello = firma;
    svuota(el.secScontro, sezioneScontro({ ...f, collegamento: st.scena.collegamento, senzaToken: senza, daPiazzare: st.daPiazzare }, {
      collega: (v) => collega(v ? { scontro: v.startsWith('s:') ? v.slice(2) : null, bozza: v.startsWith('b:') ? v.slice(2) : null } : { scontro: null, bozza: null }),
      collegaAperto: (id) => collega({ scontro: id, bozza: null }),
      metti: (chiave) => { st.daPiazzare = st.daPiazzare === chiave ? null : chiave; el.riquadro.classList.toggle('piazza', !!st.daPiazzare); disegnaPannelli(); },
      mettiTutti,
    }));
    svuota(el.secToken, sezioneToken(scelto, pz, ctx.dati, {
      nascondi: () => cambiaToken(scelto.id, (x) => ({ ...x, nascosto: !x.nascosto })),
      ingombro: (n) => cambiaToken(scelto.id, (x) => ({ ...x, ingombro: n, q: agganciaQ(st.scena.griglia, centroToken(st.scena.griglia, x).x, centroToken(st.scena.griglia, x).y, n) }), { controllaSovrapposti: true }),
      togli: () => { const id = scelto.id; st.selezionato = null; st.scena = { ...st.scena, token: st.scena.token.filter((x) => x.id !== id) }; dopoCambioToken(); },
      carta: () => apriCarta(scelto),
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

  function dopoCambioToken() {
    salvaPresto();
    disegnaPannelli();
    ridisegna(['sopra']);
  }

  function cambiaToken(id, fn, { controllaSovrapposti = false } = {}) {
    st.scena = { ...st.scena, token: st.scena.token.map((t) => (t.id === id ? fn(t) : t)) };
    if (controllaSovrapposti) avvisaSovrapposti([id]);
    dopoCambioToken();
  }

  /** Due token sullo stesso Q non sono un errore (A.127): si avvisa soltanto. */
  function avvisaSovrapposti(ids) {
    const nomeDi = (id) => { const t = st.scena.token.find((x) => x.id === id); return (t && pezzoDi(t)?.nome) ?? t?.nome ?? id; };
    const coppie = sovrapposti(st.scena.token).filter(([a, b]) => ids.includes(a) || ids.includes(b));
    if (coppie.length) avviso(`Sovrapposti: ${coppie.map(([a, b]) => `${nomeDi(a)} e ${nomeDi(b)}`).join('; ')}.`, { durata: 5000 });
  }

  function scegli(id) {
    st.selezionato = id;
    disegnaPannelli();
    ridisegna(['sopra']);
  }

  async function apriCarta(t) {
    const pz = pezzoDi(t);
    if (!pz) return avvisoErrore('Questo token non è più nello scontro: nessuna carta da aprire.');
    if (pz.tipo === 'manuale') return avviso(`${pz.nome} è scritto a mano nello scontro: non ha una carta, è nel riquadro dello scontro della plancia.`);
    const esito = await apriCartaInPlancia(pz.chiave);
    if (esito === 'bloccata') avvisoErrore('Il browser non ha aperto la plancia in un’altra finestra: aprila tu (indirizzo …#/tavolo) e riprova il clic.');
    else if (esito === 'assente') avviso(`La carta di ${pz.nome} non è nella plancia (${pz.tipo === 'pg' ? 'il PG non è al tavolo' : 'scontro non aperto'}).`);
  }

  /** Mette in mappa il pezzo `chiave` con il centro più vicino possibile al punto m della mappa (aggancio §7). */
  function piazza(chiave, m) {
    st.daPiazzare = null;
    el.riquadro.classList.remove('piazza');
    const pz = st.mappaPezzi.get(chiave);
    if (!pz || st.scena.token.some((t) => chiaveRif(t.rif) === chiave)) { disegnaPannelli(); return; }
    const t = tokenPerPezzo(pz, agganciaQ(st.scena.griglia, m.x, m.y, pz.ingombro));
    st.scena = { ...st.scena, token: [...st.scena.token, t] };
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
    st.scena = { ...st.scena, token: [...st.scena.token, ...nuovi] };
    if (nonPiazzati.length) avvisoErrore(`Non c’è posto per: ${nonPiazzati.map((k) => st.mappaPezzi.get(k)?.nome ?? k).join(', ')}.`);
    else avviso(`In mappa: ${nuovi.length} token.`);
    dopoCambioToken();
  }

  // ── Nebbia (lotto 4, §5): pennello e rettangolo, «Rivela» o «Copri», tutto, Ctrl+Z ──
  const N = st.nebbia;
  const qVicino = (m) => {
    const g = st.scena.griglia;
    return [Math.max(0, Math.min(g.colonne - 1, Math.floor((m.x - g.scosto_x) / g.q_px))), Math.max(0, Math.min(g.righe - 1, Math.floor((m.y - g.scosto_y) / g.q_px)))];
  };
  const contaNebbia = () => st.scena.annulla.filter((v) => v?.tipo === 'nebbia').length;
  const pulsanteScelta = (testo, attivo, onclick, titolo) => h('button', { type: 'button', class: `btn btn-piccolo${attivo ? ' scelto' : ''}`, 'aria-pressed': String(attivo), title: titolo, onclick }, testo);
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
      h('label', { class: 'mappa-campo' }, h('span', {}, 'Dimensione del pennello (Q)'),
        h('input', { type: 'number', min: 1, max: 15, step: 1, value: String(N.lato), onchange: (e) => { N.lato = Math.max(1, Math.min(15, Math.round(Number(e.target.value) || 1))); e.target.value = String(N.lato); } })),
      h('div', { class: 'mappa-azioni-token' },
        h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => tuttaUi('copri') }, 'Copri tutto'),
        h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => tuttaUi('rivela') }, 'Rivela tutto'),
        h('button', { type: 'button', class: 'btn btn-piccolo', disabled: !contaNebbia(), title: 'Ctrl+Z', onclick: () => annullaNebbiaUi() }, `Annulla (${contaNebbia()})`)));
  }
  function strumentoNebbia(s) {
    N.strumento = s;
    if (s && st.strumento === 'calibra') impostaStrumento('sposta');
    el.riquadro.classList.toggle('nebbia', !!s);
    disegnaPannelloNebbia();
  }
  function dopoNebbia() {
    salvaPresto();
    disegnaPannelloNebbia();
    ridisegna(['aree', 'sopra']);
  }
  function tuttaUi(modo) {
    if (!confirm(modo === 'copri' ? 'Coprire di nebbia tutta la mappa? I giocatori non vedranno più nulla (Ctrl+Z annulla).' : 'Rivelare tutta la mappa ai giocatori? (Ctrl+Z annulla)')) return;
    st.scena = tuttaNebbia(st.scena, modo, ctx.dati);
    dopoNebbia();
  }
  function annullaNebbiaUi() {
    const esito = annullaNebbia(st.scena);
    if (!esito) { avviso('Nessuna modifica della nebbia da annullare.'); return; }
    st.scena = esito.scena;
    avviso(`Nebbia: annullata l’ultima modifica (${quantiQ(esito.voce.tratti)} Q).`);
    dopoNebbia();
  }

  // ── Puntatore, rotella e tastiera (§12); gesti comuni in ./gesti.js (lotto 4: due dita, doppio tocco) ──
  const punto = (e) => { const r = el.riquadro.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const premi = (e, p) => {
    el.riquadro.focus({ preventScroll: true });
    nascondiSuggerimento();
    if (!st.scena) return;
    const m = mappaDaSchermo(st.cam, p.x, p.y);
    if (st.daPiazzare && !st.spazio) { piazza(st.daPiazzare, m); return; }
    const base = { id: e.pointerId, x: p.x, y: p.y, x0: p.x, y0: p.y, mosso: false };
    if (N.strumento && !st.spazio && st.strumento !== 'calibra') {
      const q = qVicino(m);
      st.trascina = { ...base, modo: 'nebbia', iniziale: st.scena.nebbia.coperti, da: q, a: q };
      if (N.strumento === 'pennello') {
        const g = st.scena.griglia;
        st.scena = nebbiaProvvisoria(st.scena, tratto(daBase64(st.scena.nebbia.coperti), g.colonne, g.righe, q, q, N.lato, valoreModo(N.modo)));
        ridisegna(['aree']);
      } else ridisegna(['sopra']);
      return;
    }
    const tok = !st.spazio && st.strumento !== 'calibra' ? tokenSotto(m) : null;
    const modo = tok ? 'token' : st.strumento === 'calibra' && !st.spazio ? 'calibra' : 'sposta';
    st.trascina = { ...base, modo };
    if (modo === 'calibra') st.calibrazione = { a: m, b: null };
    if (tok) {
      const c = centroToken(st.scena.griglia, tok);
      Object.assign(st.trascina, { token: tok.id, q: tok.q, dx: m.x - c.x, dy: m.y - c.y, ingombro: tok.ingombro });
    }
    el.riquadro.classList.toggle('trascina', modo !== 'calibra');
  };
  const muovi = (e, p, mio) => {
    const t = st.trascina;
    if (!t || !mio) { suggerisci(e); return; }
    if (!t.mosso && Math.hypot(p.x - t.x0, p.y - t.y0) < TRASCINAMENTO_MINIMO_PX) return;
    t.mosso = true;
    if (t.modo === 'sposta') cambiaCamera(sposta(st.cam, p.x - t.x, p.y - t.y));
    else if (t.modo === 'nebbia') {
      const q = qVicino(mappaDaSchermo(st.cam, p.x, p.y));
      if (q[0] !== t.a[0] || q[1] !== t.a[1]) {
        if (N.strumento === 'pennello') {
          const g = st.scena.griglia;
          st.scena = nebbiaProvvisoria(st.scena, tratto(daBase64(st.scena.nebbia.coperti), g.colonne, g.righe, t.a, q, N.lato, valoreModo(N.modo)));
          t.a = q;
          ridisegna(['aree']);
        } else { t.a = q; ridisegna(['sopra']); }
      }
    } else if (t.modo === 'token') {
      // §7: il token resta sempre al centro di un quadretto anche mentre si trascina (nessuna regola di movimento:
      // arrivano nel lotto 5)
      const m = mappaDaSchermo(st.cam, p.x, p.y);
      const q = agganciaQ(st.scena.griglia, m.x - t.dx, m.y - t.dy, t.ingombro);
      if (q[0] !== t.q[0] || q[1] !== t.q[1]) { t.q = q; ridisegna(['sopra']); }
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
    if (t.modo === 'nebbia') {
      st.scena = N.strumento === 'rettangolo' ? rettangoloNebbia(st.scena, t.da, t.a, N.modo, ctx.dati) : chiudiPennellata(st.scena, t.iniziale, ctx.dati);
      dopoNebbia();
      return true;
    }
    if (t.modo === 'calibra') {
      if (t.mosso) chiudiCalibrazione();
      else { st.calibrazione = null; ridisegna(['sopra']); }
      return true;
    }
    if (t.modo === 'token') {
      const tok = st.scena.token.find((x) => x.id === t.token);
      if (!tok) { ridisegna(['sopra']); return true; }
      if (t.mosso) {
        if (tok.q[0] !== t.q[0] || tok.q[1] !== t.q[1]) cambiaToken(tok.id, (x) => ({ ...x, q: t.q }), { controllaSovrapposti: true });
        else ridisegna(['sopra']);
      } else {
        // clic: si sceglie il token e si apre la sua carta nella plancia
        scegli(tok.id);
        apriCarta(tok);
      }
      return true;
    }
    if (!t.mosso && st.selezionato) scegli(null);
    return t.mosso;
  };
  /** Il gesto di un dito si interrompe (arriva il secondo dito): niente resta a metà. */
  function annullaGesto(t = st.trascina) {
    st.trascina = null;
    el.riquadro.classList.remove('trascina');
    if (!t) return;
    if (t.modo === 'nebbia' && t.iniziale) { st.scena = { ...st.scena, nebbia: { ...st.scena.nebbia, coperti: t.iniziale } }; ridisegna(['aree', 'sopra']); }
    if (t.modo === 'calibra') st.calibrazione = null;
    ridisegna(['sopra']);
  }
  const tokenSotto = (m) => {
    const ordine = [...st.scena.token].sort((a, b) => (a.id === st.selezionato) - (b.id === st.selezionato));
    return ordine.reverse().find((t) => tokenSottoPunto(st.scena.griglia, t, m.x, m.y)) ?? null;
  };
  const pezzoDi = (t) => st.mappaPezzi.get(chiaveRif(t.rif)) ?? null;
  // nome, PV e Stati al passaggio del mouse
  const nascondiSuggerimento = () => { el.suggerimento.hidden = true; };
  const suggerisci = (e) => {
    if (!st.scena || e.pointerType !== 'mouse') return nascondiSuggerimento();
    const p = punto(e);
    const t = tokenSotto(mappaDaSchermo(st.cam, p.x, p.y));
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
  const suEsce = () => nascondiSuggerimento();
  // trascinamento dall'elenco dei pezzi senza token
  const suSopra = (e) => { if ([...e.dataTransfer.types].includes(TIPO_TRASCINA)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } };
  const suLascia = (e) => {
    const chiave = e.dataTransfer.getData(TIPO_TRASCINA);
    if (!chiave || !st.scena) return;
    e.preventDefault();
    const p = punto(e);
    piazza(chiave, mappaDaSchermo(st.cam, p.x, p.y));
  };
  const suTasto = (e) => {
    if (inCampo(e)) return;
    // Ctrl+Z (lotto 4): annulla l'ultima modifica della nebbia
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') { e.preventDefault(); if (st.scena) annullaNebbiaUi(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') { e.preventDefault(); zoomCentro(V.passo_tasti); } else if (e.key === '-' || e.code === 'NumpadSubtract') { e.preventDefault(); zoomCentro(1 / V.passo_tasti); } else if (e.code === 'Space') {
      e.preventDefault(); // niente scorrimento della pagina
      if (!st.spazio) { st.spazio = true; el.riquadro.classList.add('spazio'); }
    } else if (e.key === 'Escape') {
      if (st.strumento === 'calibra') impostaStrumento('sposta');
      else if (N.strumento) strumentoNebbia(null);
      else if (st.daPiazzare) { st.daPiazzare = null; el.riquadro.classList.remove('piazza'); disegnaPannelli(); } else if (st.selezionato) scegli(null);
    }
  };
  const suRilasciaTasto = (e) => {
    if (e.code === 'Space') { st.spazio = false; el.riquadro.classList.remove('spazio'); }
  };
  const gesti = creaGesti(el.riquadro, {
    vista: V, camera: () => st.cam, cambiaCamera, adatta: adattaSchermo,
    premi, muovi, rilascia, annulla: () => annullaGesto(),
    // doppio clic del mouse: «Adatta» solo su un punto vuoto e senza strumenti attivi
    vuoto: (p) => !N.strumento && st.strumento !== 'calibra' && !!st.scena && !tokenSotto(mappaDaSchermo(st.cam, p.x, p.y)),
  });
  el.riquadro.addEventListener('pointerleave', suEsce);
  el.riquadro.addEventListener('dragover', suSopra);
  el.riquadro.addEventListener('drop', suLascia);
  window.addEventListener('keydown', suTasto);
  window.addEventListener('keyup', suRilasciaTasto);

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
    adattaSchermo();
    await Promise.all([aggiornaFonti(), leggiScelta()]);
    disegnaPannelloNebbia();
    disegnaPannelloGiocatori();
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
    window.removeEventListener('keydown', suTasto);
    window.removeEventListener('keyup', suRilasciaTasto);
    tela.distruggi();
    st.immagine?.close?.();
  };
}
