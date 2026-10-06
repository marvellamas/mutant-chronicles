// Mappa di battaglia, lotto 2 (docs/battlemap/piano.md): pagina della scena nella vista master, #/mappa/<id>.
// Immagine di fondo (originale per il master, copia ridotta preparata qui per i giocatori), zoom con la rotella verso il
// puntatore e con + e −, spostamento con barra spaziatrice + mouse o trascinando, «Adatta allo schermo», griglia
// calibrata tracciando un quadretto o con i valori, colore e opacità, blocco. Ogni modifica si salva da sola sul
// server con la revisione; se la scena è cambiata altrove si avvisa e si riprende quella del server.
// Logica pura in src/mappa/camera.js e src/mappa/griglia.js; disegno in ./canvas.js.
import { h, svuota } from '../dom.js';
import { avviso, avvisoErrore } from '../avvisi.js';
import { cameraIniziale, zoomVerso, fattoreRotella, sposta, adatta, mappaDaSchermo, schermoDaMappa, rettangoloVisibile } from '../../mappa/camera.js';
import { calibraDaQuadretto, applicaGriglia, dimensioniMappa, lineeVisibili, testoScala } from '../../mappa/griglia.js';
import { creaTela } from './canvas.js';
import { leggiScena, salvaScena, caricaImmagine, controllaFile, preparaRidotta } from './api.js';

const ATTESA_SALVATAGGIO_MS = 600;
const SCARTO_AVVISO = 0.15; // riquadro tracciato poco quadrato: si avvisa (non si rifiuta)
const TRASCINAMENTO_MINIMO_PX = 4;

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
  };

  // ── Struttura della pagina, creata una volta: si aggiornano solo i testi e i campi ──
  const el = {};
  el.scegliFile = h('input', { type: 'file', accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp', hidden: true, onchange: (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) caricaDaFile(f); } });
  el.titolo = h('h1', { class: 'mappa-titolo' }, 'Mappa');
  el.zoom = h('span', { class: 'mappa-zoom', title: 'Zoom (rotella, + e −)' }, '100 %');
  el.scala = h('span', { class: 'mappa-scala' });
  el.stato = h('span', { class: 'nota mappa-stato', 'aria-live': 'polite' });
  el.btnGriglia = h('button', { type: 'button', class: 'btn', 'aria-expanded': 'true', onclick: () => { el.pannello.hidden = !el.pannello.hidden; el.btnGriglia.setAttribute('aria-expanded', String(!el.pannello.hidden)); } }, 'Griglia');
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
  el.pannello = h('aside', { class: 'mappa-pannello', 'aria-label': 'Griglia' });
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
    aree: () => {},
    sopra: (c) => {
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
      testoStato('Non salvata');
      avvisoErrore(`Scena non salvata: ${e.message}`);
    } finally {
      S.inCorso = false;
      // anche a pagina chiusa: l'ultima modifica non si perde
      if (S.modificata) S.timer = setTimeout(salvaOra, ATTESA_SALVATAGGIO_MS);
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
    aggiornaPannello();
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
  svuota(el.pannello,
    h('h2', {}, 'Griglia'),
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

  // ── Puntatore, rotella e tastiera (§12) ──
  const punto = (e) => { const r = el.riquadro.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const suRotella = (e) => {
    e.preventDefault();
    const p = punto(e);
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    cambiaCamera(zoomVerso(st.cam, p.x, p.y, fattoreRotella(dy, V), V));
  };
  const suPremi = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    el.riquadro.focus({ preventScroll: true });
    const p = punto(e);
    const modo = st.strumento === 'calibra' && !st.spazio ? 'calibra' : 'sposta';
    st.trascina = { id: e.pointerId, x: p.x, y: p.y, x0: p.x, y0: p.y, mosso: false, modo };
    if (modo === 'calibra') st.calibrazione = { a: mappaDaSchermo(st.cam, p.x, p.y), b: null };
    el.riquadro.setPointerCapture(e.pointerId);
    el.riquadro.classList.toggle('trascina', modo === 'sposta');
  };
  const suMuovi = (e) => {
    const t = st.trascina;
    if (!t || t.id !== e.pointerId) return;
    const p = punto(e);
    if (!t.mosso && Math.hypot(p.x - t.x0, p.y - t.y0) < TRASCINAMENTO_MINIMO_PX) return;
    t.mosso = true;
    if (t.modo === 'sposta') cambiaCamera(sposta(st.cam, p.x - t.x, p.y - t.y));
    else { st.calibrazione.b = mappaDaSchermo(st.cam, p.x, p.y); ridisegna(['sopra']); }
    t.x = p.x; t.y = p.y;
  };
  const suRilascia = (e) => {
    const t = st.trascina;
    if (!t || t.id !== e.pointerId) return;
    st.trascina = null;
    el.riquadro.classList.remove('trascina');
    if (t.modo === 'calibra') {
      if (t.mosso) chiudiCalibrazione();
      else { st.calibrazione = null; ridisegna(['sopra']); }
    }
  };
  const suTasto = (e) => {
    if (inCampo(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') { e.preventDefault(); zoomCentro(V.passo_tasti); } else if (e.key === '-' || e.code === 'NumpadSubtract') { e.preventDefault(); zoomCentro(1 / V.passo_tasti); } else if (e.code === 'Space') {
      e.preventDefault(); // niente scorrimento della pagina
      if (!st.spazio) { st.spazio = true; el.riquadro.classList.add('spazio'); }
    } else if (e.key === 'Escape' && st.strumento === 'calibra') impostaStrumento('sposta');
  };
  const suRilasciaTasto = (e) => {
    if (e.code === 'Space') { st.spazio = false; el.riquadro.classList.remove('spazio'); }
  };
  el.riquadro.addEventListener('wheel', suRotella, { passive: false });
  el.riquadro.addEventListener('pointerdown', suPremi);
  el.riquadro.addEventListener('pointermove', suMuovi);
  el.riquadro.addEventListener('pointerup', suRilascia);
  el.riquadro.addEventListener('pointercancel', suRilascia);
  window.addEventListener('keydown', suTasto);
  window.addEventListener('keyup', suRilasciaTasto);

  // ── Avvio ──
  testoStato('Lettura della scena…');
  leggiScena(ctx.id).then(async (s) => {
    if (st.chiusa) return;
    await usaScena(s);
    testoStato(s.aggiornato ? `Salvata alle ${ora(new Date(s.aggiornato))}` : '');
    adattaSchermo();
  }).catch((e) => {
    if (st.chiusa) return;
    svuota(radice, h('section', { class: 'mappa-pagina' }, h('p', { class: 'riquadro attenzione' }, `Scena non trovata: ${e.message}. `,
      h('button', { type: 'button', class: 'btn', onclick: () => ctx.azioni.tavolo() }, '← Tavolo'))));
  });

  return () => {
    st.chiusa = true;
    if (st.salvataggio.modificata) salvaOra();
    window.removeEventListener('keydown', suTasto);
    window.removeEventListener('keyup', suRilasciaTasto);
    tela.distruggi();
    st.immagine?.close?.();
  };
}
