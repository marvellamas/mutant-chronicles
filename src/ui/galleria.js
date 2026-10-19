// Galleria del master (N1, 13/10/2026): la tab «Galleria» del Tavolo del Master, accanto a «Nemici».
//
// Si trascinano le immagini nella tab (o «Aggiungi immagini»); per ognuna nome e categoria, modificabili, e
// «Elimina». Griglia di miniature con filtro per categoria e ricerca; un clic apre l'anteprima grande, che vede
// solo il master. «Mostra ai giocatori» la manda allo schermo dei giocatori e a tutti i tablet; quando qualcosa è
// mostrato, in cima la fascia «Ai giocatori: … · Nascondi a tutti».
//
// Le miniature e la copia ridotta le prepara il browser del master al caricamento (src/ui/mappa/api.js →
// preparaRidotta): si generano una volta e restano nella cartella, così la griglia non scarica le immagini intere.
// Le regole stanno in data/galleria.json, il motore puro in src/galleria.js, la cartella e le API in server.mjs.
import { h } from './dom.js';
import { avviso, avvisoErrore } from './avvisi.js';
import { chiedi, apri } from './finestrella.js';
import { preparaRidotta } from './mappa/api.js';
import { vociPerMaster, categorieGalleria, nomeDaFile, conCopiaRidotta, ridottaPerGiocatori, eGif } from '../galleria.js';

const errore = async (r) => Object.assign(new Error((await r.json().catch(() => ({}))).errore ?? `errore ${r.status}`), { stato: r.status });

/** L'indice della galleria (schede, copie e immagine mostrata). */
export async function leggiGalleria() {
  const r = await fetch('api/galleria', { cache: 'no-store' });
  if (!r.ok) throw await errore(r);
  return r.json();
}

/** Indirizzo di un file della galleria (originale, copia ridotta o miniatura). */
export const urlGalleria = (file) => (file ? `api/galleria/img/${encodeURIComponent(file)}` : null);

async function chiamata(percorso, opzioni) {
  const r = await fetch(`api/galleria${percorso}`, opzioni);
  if (!r.ok) throw await errore(r);
  return r.json();
}

const comeJson = (corpo) => ({ body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json' } });

export const mostraAiGiocatori = (file) => chiamata('/mostra', { method: 'POST', ...comeJson({ file }) });
export const nascondiATutti = () => chiamata('/mostra', { method: 'DELETE' });
export const cambiaVoce = (file, modifica) => chiamata(`/voce/${encodeURIComponent(file)}`, { method: 'PUT', ...comeJson(modifica) });
export const eliminaImmagine = (file) => chiamata(`/voce/${encodeURIComponent(file)}`, { method: 'DELETE' });

/** Carica un file (Blob) in galleria/; con `variante` è una copia dell'immagine `di`. */
async function caricaFile(blob, { nome, variante = null, di = null }) {
  const p = new URLSearchParams({ nome });
  if (variante) { p.set('variante', variante); p.set('di', di); }
  const r = await fetch(`api/galleria?${p}`, { method: 'POST', body: blob, headers: { 'Content-Type': blob.type || 'application/octet-stream' } });
  if (!r.ok) throw await errore(r);
  return r.json();
}

/**
 * Carica un'immagine scelta dal master: l'originale resta sul suo PC, e accanto vanno la copia ridotta (per lo
 * schermo dei giocatori e i tablet) e la miniatura (per la griglia). Le copie si fanno qui con un canvas: sul
 * server non c'è nessuna libreria di immagini. Se il browser non ce la fa, resta l'originale.
 */
export async function caricaImmagineGalleria(file, dati) {
  // 19/10: una GIF non ha la copia ridotta (il canvas la fermerebbe al primo fotogramma): ai giocatori va l'originale
  const G = dati.galleria;
  const mb = file.size / (1024 * 1024);
  if (mb > G.massimo_mb) throw new Error(`«${file.name}» pesa ${mb.toFixed(1).replace('.', ',')} MB: il limite è ${G.massimo_mb} MB (data/galleria.json).`);
  const nome = nomeDaFile(file.name);
  const { file: salvato, indice } = await caricaFile(file, { nome });
  let ultimo = indice;
  const copia = async (variante, lato) => {
    try {
      // i dati della mappa hanno lo stesso formato (tipo e qualità): preparaRidotta vale anche qui
      const blob = await preparaRidotta(file, { mappa: { immagini: { ridotta: G[variante === 'mini' ? 'miniatura' : 'ridotta'], tipi: G.tipi } } }, { latoMassimo: lato });
      if (!blob) return;
      ultimo = (await caricaFile(blob, { nome, variante, di: salvato })).indice;
    } catch { /* senza copia si usa l'originale: la galleria funziona lo stesso */ }
  };
  if (conCopiaRidotta(file.name)) await copia('ridotta', G.ridotta.lato_massimo_px);
  await copia('mini', G.miniatura.lato_massimo_px);
  return { file: salvato, indice: ultimo };
}

/** Il peso in MB di una GIF della cartella (null se non è una GIF o non si legge): serve ad avvisare prima di mostrarla. */
async function pesoGifMb(file) {
  if (!eGif(file)) return null;
  try {
    const r = await fetch(urlGalleria(file), { cache: 'force-cache' });
    return r.ok ? (await r.blob()).size / (1024 * 1024) : null;
  } catch { return null; }
}

/** Le copie che mancano a un'immagine già nella cartella (per esempio copiata a mano): si fanno al volo. */
export async function completaCopie(voce, dati) {
  const serveRidotta = conCopiaRidotta(voce.file);
  if ((voce.ridotta || !serveRidotta) && voce.mini) return null;
  const G = dati.galleria;
  const r = await fetch(urlGalleria(voce.file), { cache: 'force-cache' });
  if (!r.ok) return null;
  const blob = await r.blob();
  let indice = null;
  for (const [variante, conf] of [['ridotta', G.ridotta], ['mini', G.miniatura]]) {
    if (voce[variante] || (variante === 'ridotta' && !serveRidotta)) continue;
    try {
      const copia = await preparaRidotta(blob, { mappa: { immagini: { ridotta: conf, tipi: G.tipi } } }, { latoMassimo: conf.lato_massimo_px });
      if (!copia) continue;
      indice = (await caricaFile(copia, { nome: voce.nome, variante, di: voce.file })).indice;
    } catch { /* niente copia: resta l'originale */ }
  }
  return indice;
}

/**
 * La tab «Galleria» della plancia (src/ui/tavolo.js la chiama con lo stato e le azioni).
 * @param st { indice, categoria, cerca, inCorso } stato della tab, ricordato dalla plancia
 * @param az { ricarica(indice), ridisegna() }
 */
export function pannelloGalleria(ctx, st, az) {
  const G = ctx.dati.galleria;
  const indice = st.indice ?? { immagini: [], mostrata: null };
  const voci = vociPerMaster(indice, { categoria: st.categoria, cerca: st.cerca });
  const mostrata = indice.immagini.find((v) => v.file === indice.mostrata) ?? null;

  const aggiorna = (i) => { if (i) st.indice = i; az.ridisegna(); };
  const conErrore = async (cosa, fai) => {
    try { aggiorna(await fai()); } catch (e) { avvisoErrore(`${cosa}: ${e.message}. Controlla che la finestra di avvia-server.bat sia aperta.`); }
  };
  const mostra = (v) => conErrore(`«${v.nome}» non mostrata`, async () => {
    // 19/10: una GIF pesante va a tutti i tablet così com'è (resta animata): il Direttore è avvisato, non bloccato
    const mb = await pesoGifMb(v.file);
    if (mb !== null && mb > G.gif.peso_avviso_mb && !await chiedi({ titolo: 'GIF pesante', testo: G.testi.gif_pesante.replace('{nome}', v.nome).replace('{mb}', mb.toFixed(1).replace('.', ',')), si: 'Mostra comunque' })) return null;
    const r = await mostraAiGiocatori(v.file);
    avviso(`Ai giocatori: ${v.nome}.`, { chiave: 'galleria' });
    return r.indice;
  });
  const nascondi = () => conErrore('Immagine non nascosta', async () => {
    const r = await nascondiATutti();
    avviso('Immagine nascosta a tutti.', { chiave: 'galleria' });
    return r.indice;
  });

  // campi nome e categoria di una scheda: si salvano quando si esce dal campo
  const rinomina = (v) => h('input', {
    type: 'text', class: 'galleria-nome', value: v.nome, title: v.nome, 'aria-label': `Nome di ${v.nome}`,
    onchange: (e) => conErrore('Nome non salvato', () => cambiaVoce(v.file, { nome: e.target.value.trim() || v.nome, categoria: v.categoria })),
  });
  const categorie = categorieGalleria(indice, ctx.dati);
  const categoriaDi = (v) => h('select', {
    class: 'galleria-categoria', 'aria-label': `Categoria di ${v.nome}`,
    onchange: (e) => conErrore('Categoria non salvata', () => cambiaVoce(v.file, { nome: v.nome, categoria: e.target.value || null })),
  }, h('option', { value: '', selected: !v.categoria }, '— senza categoria —'),
  categorie.map((c) => h('option', { value: c, selected: v.categoria === c }, c)));

  const anteprima = (v) => apri('finestrella-galleria', v.nome, (fine) => [
    h('img', { class: 'galleria-grande', src: urlGalleria(ridottaPerGiocatori(v) ?? v.file), alt: v.nome }),
    h('p', { class: 'nota' }, 'Questa anteprima la vedi solo tu: ai giocatori arriva con «Mostra ai giocatori».'),
    h('div', { class: 'riga-azioni finestrella-azioni' },
      h('button', { type: 'button', class: 'btn', onclick: () => fine(true) }, 'Chiudi'),
      h('button', { type: 'button', class: 'btn primario', onclick: () => { fine(true); mostra(v); } }, '📺 Mostra ai giocatori')),
  ]);

  const elimina = async (v) => {
    if (!await chiedi({ titolo: `Elimina «${v.nome}»?`, testo: 'L’immagine e le sue copie vanno via dalla cartella galleria/. Non si può annullare.', si: 'Elimina', pericolo: true })) return;
    conErrore('Immagine non eliminata', async () => {
      const i = await eliminaImmagine(v.file);
      avviso(`«${v.nome}» eliminata dalla galleria.`);
      return i;
    });
  };

  const miniatura = (v) => {
    const img = h('img', { class: 'galleria-mini', loading: 'lazy', src: urlGalleria(v.mini ?? v.ridotta ?? v.file), alt: v.nome });
    // una miniatura che manca (immagine copiata a mano) si prepara qui, una volta sola
    if (!v.mini && !st.inCorso) completaCopie(v, ctx.dati).then((i) => { if (i) aggiorna(i); }).catch(() => {});
    // 13/10: riquadro fisso, stesse proporzioni per tutte: l'immagine si ritaglia e non spinge la scheda
    return h('span', { class: 'galleria-riquadro-mini' }, img);
  };

  /**
   * Una scheda della griglia (rifatta il 13/10 dopo la schermata di Marcello: le schede si accavallavano, i nomi
   * lunghi uscivano e la prima aveva una riga in più). Tutte uguali: miniatura in un riquadro fisso (ritagliata),
   * nome su una riga sola con i puntini, categoria sotto, e in fondo una riga di pulsanti sempre della stessa
   * altezza — «Mostra ai giocatori» in evidenza, gli altri due come icone con il suggerimento.
   */
  const carta = (v) => {
    const mostrataOra = indice.mostrata === v.file;
    const iconaBtn = (icona, titolo, fai, { pericolo = false } = {}) => h('button', {
      type: 'button', class: `btn btn-piccolo btn-icona-galleria${pericolo ? ' pericolo' : ''}`, title: titolo, 'aria-label': titolo, onclick: fai,
    }, icona);
    return h('article', { class: `galleria-carta${mostrataOra ? ' mostrata' : ''}` },
      h('button', { type: 'button', class: 'galleria-tocco', title: 'Anteprima grande (solo per te)', onclick: () => anteprima(v) }, miniatura(v)),
      h('div', { class: 'galleria-dati' }, rinomina(v), categoriaDi(v)),
      h('div', { class: 'galleria-azioni' },
        h('button', { type: 'button', class: `btn btn-piccolo galleria-mostra${mostrataOra ? '' : ' primario'}`, disabled: mostrataOra,
          title: mostrataOra ? 'È già sugli schermi dei giocatori' : 'La manda allo schermo dei giocatori e a tutti i tablet',
          onclick: () => mostra(v) }, mostrataOra ? '📺 Ai giocatori' : '📺 Mostra ai giocatori'),
        v.mostrata && v.daiGiocatori !== false
          ? iconaBtn('🚫', 'Togli dalla galleria dei giocatori (a te resta)', () => conErrore('Non tolta', () => cambiaVoce(v.file, { daiGiocatori: false })))
          : null,
        iconaBtn('🗑', 'Elimina: cancella il file dalla cartella galleria/', () => elimina(v), { pericolo: true })));
  };

  // «Aggiungi immagini» e il trascinamento: stessa strada
  const scelta = h('input', { type: 'file', accept: Object.values(G.tipi).map((t) => t.mime).join(','), multiple: true, hidden: true,
    onchange: (e) => { aggiungi([...e.target.files]); e.target.value = ''; } });
  const aggiungi = async (file) => {
    const immagini = file.filter((f) => Object.values(G.tipi).some((t) => t.mime === f.type) || /\.(jpe?g|png|webp|gif)$/i.test(f.name));
    if (!immagini.length) return avvisoErrore('Nessuna immagine fra i file scelti: vanno bene JPG, PNG, WEBP e GIF.');
    st.inCorso = true;
    az.ridisegna();
    let ultimo = null;
    for (const f of immagini) {
      try {
        ultimo = (await caricaImmagineGalleria(f, ctx.dati)).indice;
        // 19/10: una GIF pesante va ai giocatori com'è: lo si dice subito, senza bloccare
        if (eGif(f.name) && f.size / (1024 * 1024) > G.gif.peso_avviso_mb) avviso(`«${f.name}» è una GIF da ${(f.size / (1024 * 1024)).toFixed(1).replace('.', ',')} MB: ai giocatori va com'è (resta animata) e su più tablet può pesare.`, { tipo: 'info', chiave: 'galleria-gif', durata: 12000 });
      } catch (e) { avvisoErrore(`«${f.name}» non caricata: ${e.message}`); }
    }
    st.inCorso = false;
    if (ultimo) { avviso(`Galleria: ${immagini.length === 1 ? 'immagine caricata' : `${immagini.length} immagini caricate`}.`, { chiave: 'galleria' }); aggiorna(ultimo); } else az.ridisegna();
  };

  const zona = h('div', {
    class: 'galleria-zona', ondragover: (e) => { e.preventDefault(); zona.classList.add('sopra'); },
    ondragleave: () => zona.classList.remove('sopra'),
    ondrop: (e) => { e.preventDefault(); zona.classList.remove('sopra'); aggiungi([...(e.dataTransfer?.files ?? [])]); },
  },
  h('div', { class: 'riga-azioni' },
    h('button', { type: 'button', class: 'btn primario', onclick: () => scelta.click() }, 'Aggiungi immagini'), scelta,
    h('input', { type: 'search', class: 'galleria-cerca', placeholder: 'Cerca per nome', value: st.cerca ?? '', 'aria-label': 'Cerca un’immagine per nome',
      oninput: (e) => { st.cerca = e.target.value; az.ridisegna(); } }),
    h('select', { class: 'galleria-filtro', 'aria-label': 'Filtra per categoria', onchange: (e) => { st.categoria = e.target.value || null; az.ridisegna(); } },
      h('option', { value: '', selected: !st.categoria }, 'Tutte le categorie'),
      categorie.map((c) => h('option', { value: c, selected: st.categoria === c }, c))),
    h('button', { type: 'button', class: 'btn', title: 'Rilegge la cartella galleria/ (anche le immagini copiate a mano)', onclick: () => conErrore('Galleria non letta', leggiGalleria) }, '⟳ Rileggi la cartella')),
  st.inCorso ? h('p', { class: 'nota' }, 'Caricamento in corso…') : null,
  voci.length
    ? h('div', { class: 'galleria-griglia' }, voci.map(carta))
    : h('p', { class: 'vuoto' }, indice.immagini.length ? 'Nessuna immagine con questo filtro.' : G.testi.vuota));

  return h('section', { class: 'riquadro galleria-pannello', 'aria-label': 'Galleria' },
    h('h2', {}, 'Galleria'),
    mostrata
      ? h('div', { class: 'galleria-fascia', role: 'status' },
        h('img', { class: 'galleria-fascia-mini', src: urlGalleria(mostrata.mini ?? mostrata.ridotta ?? mostrata.file), alt: '' }),
        h('strong', {}, G.testi.fascia.replace('{nome}', mostrata.nome)),
        h('button', { type: 'button', class: 'btn btn-piccolo', onclick: nascondi }, G.testi.nascondi))
      : h('p', { class: 'nota' }, 'Nessuna immagine ai giocatori in questo momento.'),
    zona);
}

/** La fascia «Ai giocatori: …» per la testata del Tavolo (la stessa informazione, in una riga). */
export function fasciaGalleria(ctx, indice, { nascondi, vai }) {
  const v = indice?.immagini?.find((x) => x.file === indice.mostrata);
  if (!v) return null;
  return h('div', { class: 'galleria-fascia galleria-fascia-testa', role: 'status' },
    h('button', { type: 'button', class: 'galleria-fascia-tocco', title: 'Vai alla Galleria', onclick: vai },
      h('img', { class: 'galleria-fascia-mini', src: urlGalleria(v.mini ?? v.ridotta ?? v.file), alt: '' }),
      h('strong', {}, ctx.dati.galleria.testi.fascia.replace('{nome}', v.nome))),
    h('button', { type: 'button', class: 'btn btn-piccolo', onclick: nascondi }, ctx.dati.galleria.testi.nascondi));
}
