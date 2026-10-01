// Vista di stampa dedicata (#/p/<id>/stampa), la SS: fogli A4 orizzontali, separati dalla
// vista digitale (docs/roadmap-equipaggiamento-e-scheda.md, §2.2). I contenuti vengono da
// preparaStampa() (src/stampa.js); qui solo HTML e impaginazione. Regole comuni (css/stampa.css):
// il carattere non si riduce mai (--ss-font, --ss-font-small); i riempitivi prendono lo spazio che
// resta. Il foglio Combattimento e il foglio Poteri continuano in una pagina successiva
// quando non entrano; se un foglio non entra comunque lo si segnala nella barra, senza rimpicciolire
// il testo (e tools/collaudo_pdf.mjs fallisce).
import { h, segno } from './dom.js';
import { stemma, iconaPagina } from './immagini.js';
import { pallini } from './tooltip.js';
import { crediti } from '../dotazioni.js';
import { COLORI_MACROFAMIGLIE } from '../palette.js';
import { normalizzaOpzioniStampa, fogliDaStampare, numeraPagine, testoPiede, iconaFoglio, schemaQuadratini } from '../stampa.js';

const FOGLIO_STILE = 'css/stampa.css';

/** Carica css/stampa.css solo in questa vista: il suo @page non deve toccare le altre pagine. */
function caricaStile() {
  let link = document.getElementById('stile-stampa');
  if (link) return link.dataset.pronto ? Promise.resolve() : new Promise((ok) => link.addEventListener('load', ok, { once: true }));
  link = h('link', { rel: 'stylesheet', href: FOGLIO_STILE, id: 'stile-stampa' });
  const pronto = new Promise((ok) => link.addEventListener('load', () => { link.dataset.pronto = '1'; ok(); }, { once: true }));
  document.head.append(link);
  return pronto;
}

/** Da chiamare uscendo dalla vista di stampa. */
export function esciDallaStampa() {
  document.body.classList.remove('vista-stampa');
  document.getElementById('stile-stampa')?.remove();
}

const corpi = { identita: foglioIdentita, abilita: foglioAbilita, combattimento: foglioCombattimento, inventario: foglioInventario, poteri: foglioMagia };

function creaFoglio(id, titolo, dati, piede, corpo = corpi[id]) {
  return h('section', { class: `foglio foglio-${id}`, 'aria-label': titolo, dataset: { foglio: id } },
    h('div', { class: 'pagina' },
      h('header', { class: 'foglio-testa' },
        // badge della pagina accanto al titolo (un <img>: si stampa anche senza «grafica di sfondo»)
        h('span', { class: 'foglio-titolo' }, iconaPagina(iconaFoglio(id), '96', { classe: 'badge-foglio', lato: 48 }), titolo),
        h('span', { class: 'foglio-nome' }, piede.nome)),
      id === 'identita' && dati.corporazione ? h('div', { class: 'filigrana-stampa', 'aria-hidden': 'true' }, stemma(dati.corporazione, '512', { alt: '' })) : null,
      h('div', { class: 'foglio-corpo' }, corpo(dati)),
      h('footer', { class: 'foglio-piede' })));
}

/**
 * Piè di pagina di tutte le pagine, dopo le continuazioni: «foglio N» fisso (fra i fogli del
 * personaggio, anche se se ne stampano solo alcuni) e «pagina P di T» reale (docs/layout-ss.md, §5.2).
 */
function numeraPiedi(contenitore, piede, fogliPersonaggio) {
  const pagine = [...contenitore.querySelectorAll('.foglio')];
  const numeri = numeraPagine(pagine.map((f) => ({ id: f.dataset.foglio, seguito: f.classList.contains('seguito') })), fogliPersonaggio);
  pagine.forEach((f, i) => { f.querySelector('.foglio-piede').textContent = testoPiede(piede, numeri[i]); });
}

const trabocca = (el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
/** Righe vere (non da compilare) di un riempitivo a righe tagliate dal suo fondo. */
const righeTagliate = (corpo) => [...corpo.querySelectorAll('.riempi-righe')].some((c) => {
  const fondo = c.getBoundingClientRect().bottom + 0.5;
  return [...c.querySelectorAll('tbody > tr')].some((r) => !r.dataset.vuota && r.getBoundingClientRect().bottom > fondo);
});
/** Il corpo del foglio o un riquadro (che taglia il contenuto) non contiene tutto. */
const eccede = (corpo) => trabocca(corpo) || [...corpo.querySelectorAll('.riquadro-stampa, .riquadro-stampa > .contenuto, .colonna')].some(trabocca)
  || righeTagliate(corpo);

/**
 * @param {object} o { stampa: risultato di preparaStampa, opzioni: preferenze di stampa
 *   (normalizzaOpzioniStampa), cambiaOpzioni(modifica), torna() }
 * @returns {Node[]} nodi da mettere nella pagina; l'impaginazione parte da sola dopo il caricamento dello stile
 */
export function renderStampa({ stampa, torna, opzioni = null, cambiaOpzioni = null }) {
  document.body.classList.add('vista-stampa');
  const opz = normalizzaOpzioniStampa(opzioni);
  const fogli = fogliDaStampare(stampa.fogli, opz);
  const avvisi = h('div', { class: 'barra-avvisi' });
  // scelta per il foglio Poteri (docs/layout-ss.md, §5.3), solo se il personaggio ha la magia; la
  // preferenza resta «magia»; la stima delle pagine in più arriva dopo l'impaginazione
  const stimaSchede = h('span', { class: 'stima-pagine' }, '');
  const conMagia = fogli.some((f) => f.id === 'poteri');
  const sceltaMagia = conMagia ? h('fieldset', { class: 'scelta-stampa' },
    h('legend', {}, 'Foglio Poteri'),
    [['elenco', 'Solo elenco'], ['completo', 'Elenco e schede complete']].map(([valore, testo]) => h('label', {},
      h('input', { type: 'radio', name: 'stampa-magia', value: valore, checked: opz.magia === valore, onchange: () => cambiaOpzioni?.({ magia: valore }) }),
      ` ${testo}`, valore === 'completo' ? stimaSchede : null))) : null;
  const barra = h('div', { class: 'barra-stampa' },
    h('button', { type: 'button', class: 'btn primario', onclick: () => window.print() }, 'Stampa'),
    sceltaMagia,
    h('button', { type: 'button', class: 'btn', onclick: torna }, 'Torna alla scheda'),
    h('span', { class: 'nota' }, 'A4 orizzontale. Per il PDF scegli «Salva come PDF» come stampante e attiva «Grafica di sfondo».'),
    avvisi);
  if (!stampa.fogli.length) {
    return [barra, h('p', { class: 'nota errore' }, 'La scheda non si può calcolare: correggi prima le scelte segnalate nella vista digitale.')];
  }
  if (!stampa.completa) avvisi.append(h('p', {}, 'Scheda non ancora completa: alcuni valori possono mancare.'));

  const contenitore = h('div', { class: 'fogli' }, fogli.map((f) => creaFoglio(f.id, f.titolo, { ...f.dati, ...(f.id === 'poteri' ? { soloElenco: opz.magia === 'elenco' } : {}) }, stampa.piede)));
  numeraPiedi(contenitore, stampa.piede, stampa.fogli);
  caricaStile().then(() => (document.fonts?.ready ?? Promise.resolve())).then(() => {
    const fuori = [];
    const controllati = new Set();
    // la continuazione del foglio 3 nasce nel ciclo: la lista si rilegge a ogni giro
    for (let f; (f = [...contenitore.querySelectorAll('.foglio')].find((x) => !controllati.has(x)));) {
      controllati.add(f);
      if (f.classList.contains('foglio-poteri') && f.classList.contains('seguito')) continue; // impaginate da impaginaMagia
      if (f.classList.contains('foglio-poteri')) {
        const { pagine, pagineSchede } = impaginaMagia(contenitore, f, { ...stampa.fogli.find((x) => x.id === 'poteri').dati, soloElenco: opz.magia === 'elenco' }, stampa.piede);
        stimaSchede.textContent = pagineSchede ? ` (≈ ${pagineSchede} ${pagineSchede === 1 ? 'pagina' : 'pagine'} in più)` : ' (nessuna pagina in più)';
        if (pagine > 1) avvisi.append(h('p', {}, `Il foglio Poteri è su ${pagine} pagine.`));
        continue;
      }
      if (f.classList.contains('foglio-abilita') && !f.classList.contains('seguito')) {
        const { pagine } = impaginaAbilita(f, stampa.fogli.find((x) => x.id === 'abilita').dati, stampa.piede);
        if (pagine > 1) avvisi.append(h('p', {}, `Il foglio Abilità è su ${pagine} pagine.`));
      }
      if (f.classList.contains('foglio-inventario') && f.classList.contains('seguito')) continue; // impaginate da impaginaInventario
      if (f.classList.contains('foglio-inventario')) {
        const { pagine, troppoLunghe } = impaginaInventario(f, stampa.fogli.find((x) => x.id === 'inventario').dati, stampa.piede);
        if (pagine > 1) avvisi.append(h('p', {}, `Il foglio Inventario è su ${pagine} pagine.`));
        if (troppoLunghe.length) {
          f.dataset.fuori = '1';
          fuori.push(`Inventario (sezioni più lunghe di una pagina: ${troppoLunghe.join(', ')})`);
        }
        continue;
      }
      if (f.classList.contains('foglio-combattimento') && !f.classList.contains('seguito')) {
        const pagine = impaginaCombattimento(f, stampa.fogli.find((x) => x.id === 'combattimento').dati, stampa.piede);
        if (pagine > 1) avvisi.append(h('p', {}, `Il foglio Combattimento è su ${pagine} pagine.`));
      }
      riempiRighe(f);
      if (eccede(f.querySelector('.foglio-corpo'))) {
        f.dataset.fuori = '1'; // lo legge tools/collaudo_pdf.mjs
        fuori.push(f.querySelector('.foglio-titolo').textContent);
      }
    }
    aggiungiBlocchiInPiu(contenitore);
    numeraPiedi(contenitore, stampa.piede, stampa.fogli);
    if (fuori.length) avvisi.append(h('p', { class: 'motivo' }, `Non entra nella pagina: ${fuori.join(', ')}. Il carattere non si riduce: accorcia i testi nella scheda digitale.`));
  });
  return [barra, contenitore];
}

/**
 * Riempitivi a righe: il contenitore .riempi-righe riceve più righe del necessario (con i loro
 * quadratini o le loro celle); dopo l'impaginazione si tolgono quelle che escono dal fondo.
 */
function riempiRighe(radice) {
  for (const c of radice.querySelectorAll('.riempi-righe')) {
    const fondo = c.getBoundingClientRect().bottom + 0.5;
    const righe = [...c.querySelectorAll(':scope > *, :scope > table > tbody > tr')].filter((r) => r.dataset.vuota);
    for (let i = righe.length - 1; i >= 0 && righe[i].getBoundingClientRect().bottom > fondo; i--) righe[i].remove();
  }
}

// ---------------------------------------------------------------------------
// componenti

/** Riquadro con intestazione piena colorata. tinta: 'pv' | 'pm' | 'pe' | 'accento' | 'fisica' | 'mentale' | 'spirituale'. */
function box({ titolo, tinta = null, forte = false, riempitivo = false, classe = '' }, ...contenuto) {
  return h('section', { class: ['riquadro-stampa', tinta ? `tinta-${tinta}` : '', forte ? 'forte' : '', riempitivo ? 'riempitivo' : '', classe].filter(Boolean).join(' ') },
    titolo ? h('h2', {}, titolo) : null,
    h('div', { class: 'contenuto' }, ...contenuto));
}

/**
 * Quadratini con un massimo, il solo componente della SS (docs/layout-ss.md, §3; schema in
 * src/stampa.js → schemaQuadratini): righe da 10 con stacco dopo la quinta e cumulato a destra,
 * blocchi da 5 righe; caselle oltre il massimo in grigio (.casella.oltre). `compatto`: righe fino
 * al massimo (colpi, PI, Punti Eroe, Distintivi, riserve); `bloccoInPiu`: un blocco grigio in più
 * aggiunto dopo l'impaginazione solo se entra (aggiungiBlocchiInPiu).
 */
function quadratini(massimo, { compatto = false, bloccoInPiu = false } = {}) {
  const el = h('div', { class: `quadratini${compatto ? ' compatti' : ''}` }, schemaQuadratini(massimo, { compatto }).blocchi.map(bloccoQuadratini));
  if (bloccoInPiu) el.dataset.bloccoInPiu = String(massimo);
  return el;
}

function bloccoQuadratini(b) {
  const riga = (r) => h('div', { class: `fila-quadratini${r.caselle.some(Boolean) ? '' : ' oltre'}` },
    r.caselle.map((disponibile, k) => [k && k % 5 === 0 ? h('span', { class: 'stacco' }) : null, h('span', { class: `casella${disponibile ? '' : ' oltre'}` })]),
    h('span', { class: 'progressivo' }, String(r.cumulato)));
  return h('div', { class: `blocco-quadratini${b.facoltativo ? ' facoltativo' : ''}` }, b.righe.map(riga));
}

/**
 * Blocchi in più dei quadratini (PV, PM): dopo l'impaginazione se ne aggiunge uno, grigio, e si
 * toglie se fa uscire il contenuto dal riquadro o dalla pagina.
 */
function aggiungiBlocchiInPiu(contenitore) {
  for (const q of contenitore.querySelectorAll('.quadratini[data-blocco-in-piu]')) {
    const b = schemaQuadratini(Number(q.dataset.bloccoInPiu), { bloccoInPiu: true }).blocchi.at(-1);
    const el = bloccoQuadratini(b);
    q.append(el);
    const corpo = q.closest('.foglio-corpo');
    const riquadro = q.closest('.riquadro-stampa');
    if ((corpo && eccede(corpo)) || (riquadro && trabocca(riquadro.querySelector(':scope > .contenuto') ?? riquadro))) el.remove();
  }
}

/** Righe guida a matita: lo sfondo del riempitivo. */
const righeGuida = () => h('div', { class: 'righe-guida' });

function tabella(colonne, righe, { classe = '', vuote = 0 } = {}) {
  return h('table', { class: `tabella-stampa ${classe}` },
    h('thead', {}, h('tr', {}, colonne.map((c) => h('th', {}, c)))),
    h('tbody', {},
      righe.map((r) => h('tr', {}, r.map((v, i) => (i === 0 ? h('th', { scope: 'row' }, v) : h('td', {}, v))))),
      Array.from({ length: vuote }, () => h('tr', { class: 'da-compilare' }, colonne.map(() => h('td', {}, ' '))))));
}

// ---------------------------------------------------------------------------
// Foglio 1 — Identità: nome e anagrafica (Segni distintivi compresi) in alto, Caratteristiche in
// grande, poi Punti Eroe, Distintivi (5 quadratini: al quinto si segna un Punto Eroe, §1.8.3) e
// Vantaggio; sotto, le Prove Salvezza e accanto il Background come riempitivo.

function foglioIdentita(d) {
  // PX dopo il Peso: prima riga di campi brevi, poi Occhi, Capelli, Mano dominante e Segni distintivi (largo)
  const px = { campo: 'puntiEsperienza', etichetta: 'PX', valore: d.puntiEsperienza === null ? '' : String(d.puntiEsperienza) };
  const i = d.anagrafica.findIndex((x) => x.campo === 'peso');
  const campi = i < 0 ? [...d.anagrafica, px] : [...d.anagrafica.slice(0, i + 1), px, ...d.anagrafica.slice(i + 1)];
  return [
    h('div', { class: 'f1-testa' },
      h('div', { class: 'f1-nome' },
        h('h1', {}, d.nome),
        h('p', {}, h('strong', {}, `${d.livello}° livello`), ` · ${d.corporazione} · ${d.addestramento}`),
        h('p', {}, d.classi.map((c) => `${c.nome} ${c.grado}`).join(' · '))),
      h('dl', { class: 'f1-anagrafica' },
        campi.map((x) => h('div', { class: `campo-anagrafica campo-${x.campo}` }, h('dt', {}, x.etichetta), h('dd', {}, x.valore || ' '))))),
    box({ titolo: 'Caratteristiche', tinta: 'accento', forte: true, classe: 'f1-caratteristiche' },
      h('div', { class: 'tessere' }, d.caratteristiche.map((c) => h('div', { class: 'tessera' },
        h('span', { class: 'sigla-car' }, c.sigla), h('span', { class: 'nome-car' }, c.nome),
        h('span', { class: 'valore-car' }, String(c.valore)),
        h('span', { class: 'mod-car' }, h('span', {}, 'Mod ', h('strong', {}, segno(c.mod))), h('span', {}, 'Salv. ', h('strong', {}, segno(c.modSalvezza)))))))),
    h('div', { class: 'f1-basso' },
      h('div', { class: 'f1-risorse' },
        box({ titolo: 'Punti Eroe', tinta: 'pe' },
          h('p', {}, d.puntiEroe.valore === null ? 'Iniziali: da determinare' : `Iniziali ${d.puntiEroe.valore} · riserva massima ${d.puntiEroe.massimo}`),
          quadratini(d.puntiEroe.massimo, { compatto: true })),
        // §1.8.3: 5 Distintivi = 1 Punto Eroe; al quinto annerito si segna il Punto Eroe e si cancellano
        box({ titolo: 'Distintivi', tinta: 'pe', classe: 'f1-distintivi' }, quadratini(5, { compatto: true })),
        box({ titolo: 'Vantaggio dell’Addestramento' }, h('p', {}, h('strong', {}, `${d.vantaggio.nome}. `), d.vantaggio.testo)),
        d.annotazioni.length ? box({ titolo: 'Note' }, h('ul', {}, d.annotazioni.map((x) => h('li', {}, x)))) : null),
      h('div', { class: 'f1-sotto' },
        // Prove Salvezza (§1.2.3): valori a riposo, come il resto della SS
        box({ titolo: 'Prove Salvezza', tinta: 'accento', forte: true, classe: 'f1-salvezze' },
          h('div', { class: 'tessere-salvezze' }, d.salvezze.map((x) => h('div', { class: 'tessera tessera-salvezza' },
            h('span', { class: 'sigla-car' }, x.nome), h('span', { class: 'nome-car' }, x.caratteristica),
            h('span', { class: 'valore-car' }, `${x.totale}${x.limitato ? '*' : ''}`)))),
          d.salvezze.some((x) => x.limitato) ? h('p', { class: 'piccolo' }, `* limitata a ${d.salvezze[0].tetto} (§1.2.3)`) : null),
      box({ titolo: 'Background', riempitivo: true, classe: 'f1-background' },
        d.background ? h('p', { class: 'testo-background' }, d.background) : null,
        d.backgroundTroncato ? h('p', { class: 'piccolo' }, 'Testo completo nella scheda digitale.') : null,
        righeGuida()))),
  ];
}

// ---------------------------------------------------------------------------
// Foglio 2 — Abilità: la tabella occupa tutta l'altezza a sinistra; a destra i Talenti (prima
// frase) e le Annotazioni come riempitivo. Specializzazioni e Tecniche stanno nel foglio 3.

function foglioAbilita(d) {
  // due tabelle affiancate, metà delle categorie ciascuna, alte quanto la pagina
  const meta = Math.ceil(d.categorie.length / 2);
  const tabellaAbilita = (categorie) => h('table', { class: 'tabella-stampa numeri abilita-stampa' },
    h('thead', {}, h('tr', {}, ['Abilità', 'Mod', 'Base', 'Corp', 'Avanz', 'Equip', 'VA'].map((c) => h('th', {}, c)))),
    categorie.map((cat) => h('tbody', {},
      h('tr', { class: 'categoria' }, h('th', { colspan: 7 }, cat.nome)),
      cat.abilita.map((a) => h('tr', {},
        h('th', { scope: 'row' }, `${a.nome} `, h('span', { class: 'sigla' }, a.competenza ? `${a.caratteristica} ${a.competenza}` : a.caratteristica), a.diClasse ? ' •' : null,
          a.limite !== null && a.grezzo > a.limite ? ' ⚑' : null),
        h('td', {}, segno(a.mod)), h('td', {}, String(a.base)), h('td', {}, String(a.corporazione)),
        h('td', {}, String(a.avanzamento)), h('td', { title: a.equip ? 'Equipaggiamento indossato (§7.11.1)' : null }, a.equip ? segno(a.equip) : '0'),
        h('td', { class: 'va' }, String(a.va)))))));
  const talento = (t, dettagli) => h('li', {}, h('strong', {}, t.nome), dettagli, ` — ${t.frase}`);
  return h('div', { class: 'f2-griglia' },
    box({ titolo: 'Abilità', tinta: 'accento', forte: true, classe: 'f2-abilita' },
      h('div', { class: 'abilita-affiancate' }, tabellaAbilita(d.categorie.slice(0, meta)), tabellaAbilita(d.categorie.slice(meta))),
      h('p', { class: 'piccolo' }, '• Abilità di Classe. S / P / G / N: competenza (§2.3). VA = Mod + Base + Corp + Avanz, al massimo il limite (⚑: VA grezzo oltre il limite, §8.3), + Equip (equipaggiamento indossato).')),
    h('div', { class: 'colonna' },
      box({ titolo: 'Talenti di Classe' }, h('ul', { class: 'elenco-talenti-stampa' }, d.talentiClasse.map((t) =>
        talento(t, h('span', { class: 'sigla' }, ` ${t.classe} ${t.grado}${t.scelto ? ', a scelta' : ''}`))))),
      d.talentiLiberi.length ? box({ titolo: 'Talenti Liberi' }, h('ul', { class: 'elenco-talenti-stampa' }, d.talentiLiberi.map((t) =>
        talento(t, [t.parametro ? ` (${t.parametro})` : null, t.annotazione ? ` — ${t.annotazione}` : null,
          h('span', { class: 'sigla' }, ` ${t.livello}° liv.`), t.provvisorio ? h('em', {}, ' provvisorio') : null])))) : null,
      // dal foglio 3 (pezzo 2): Specializzazioni e Tecniche Interiori, come nella tab Abilità della SD
      d.specializzazioni.length ? box({ titolo: 'Specializzazioni', classe: 'f2-spostabile' }, h('ul', { class: 'elenco-talenti-stampa' }, d.specializzazioni.map((x) => h('li', {},
        h('strong', {}, x.nome), ` — ${x.abilita}; ${x.effetto}`)))) : null,
      d.tecniche.length || d.tecnicheAmmesse ? box({ titolo: `Tecniche Interiori (${d.tecniche.length} / ${d.tecnicheAmmesse})`, classe: 'f2-spostabile' },
        tabella(['Tecnica', 'Costo', 'Azione'], d.tecniche.map((x) => [x.nome, x.costo, x.azione]))) : null,
      box({ titolo: 'Annotazioni', riempitivo: true, classe: 'f2-annotazioni' }, righeGuida())));
}

/**
 * Continuazione del foglio 2 (docs/layout-ss.md, pezzi 2 e 3): la tabella delle Abilità non si
 * spezza mai. Se la colonna destra entra con le Annotazioni (almeno tre righe guida), resta tutto
 * nella prima pagina e le Annotazioni riempiono la colonna. Altrimenti le Annotazioni vanno per
 * ultime nella pagina «Abilità (continua)» e i riquadri che non entrano passano lì, dall'ultimo;
 * la continuazione usa tutta la larghezza: riquadri su una o due colonne a sinistra e Annotazioni a
 * destra a tutta altezza, oppure riquadri su tre colonne e Annotazioni sotto, a riempire la pagina.
 * @returns {{ pagine, fuori: boolean }} fuori: i riquadri non entrano neppure nella continuazione
 */
function impaginaAbilita(foglio, d, piede) {
  const corpo = foglio.querySelector('.foglio-corpo');
  if (!eccede(corpo)) return { pagine: 1, fuori: false };
  const colonna = corpo.querySelector('.f2-griglia > .colonna');
  const annotazioni = colonna.querySelector('.f2-annotazioni');
  annotazioni.remove();
  const spostabili = () => [...colonna.querySelectorAll(':scope > .riquadro-stampa')];
  const riquadri = h('div', { class: 'f2-seguito-riquadri' });
  const f = creaFoglio('abilita', 'Abilità (continua)', d, piede, () => h('div', { class: 'f2-seguito' }, riquadri, annotazioni));
  f.classList.add('seguito');
  // lo stesso piè di pagina del foglio: misurando, l'altezza del corpo è già quella vera
  f.querySelector('.foglio-piede').textContent = foglio.querySelector('.foglio-piede').textContent;
  foglio.after(f);
  for (let giro = 0; giro < 20 && eccede(corpo) && spostabili().length; giro++) riquadri.prepend(spostabili().at(-1));
  // disposizione della continuazione: la prima che entra
  const seguito = f.querySelector('.f2-seguito');
  const corpo2 = f.querySelector('.foglio-corpo');
  const n = riquadri.children.length;
  if (!n) riquadri.remove(); // sono passate solo le Annotazioni: tutta la pagina
  const prova = ([k, sotto]) => {
    seguito.classList.toggle('sotto', sotto);
    seguito.style.setProperty('--colonne', String(k));
    return !eccede(corpo2);
  };
  const ok = [[Math.max(1, Math.min(n, 2)), false], [2, false], [3, true]].some(prova);
  return { pagine: 2, fuori: eccede(corpo) || !ok };
}

// ---------------------------------------------------------------------------
// Foglio 3 — Combattimento (docs/layout-ss.md, pezzo 3). Due colonne come la tab della SD: a
// sinistra la sintesi (Iniziativa, Movimento, Azioni, Difese con Parata/Schivata Istintiva, Prove
// Salvezza), le Armi con il profilo d'uso, la casella «in mano» e sotto ogni arma colpi, PI e
// condizione; le Protezioni con i PI; il Sanitario con le applicazioni; i Punti Vita come
// riempitivo. A destra, a tutta altezza, Ferite, Affaticamento, Corruzione Oscura e Stati, con la
// penalità dei dati accanto a ogni grado.

// profilo d'uso dell'arma (decisione 4: il possesso, cioè costo, Qualità, peso, stato, sta nel foglio 4)
const COLONNE_ARMI = [
  ['nome', 'Arma'], ['abilita', 'Abilità'], ['va', 'VA'], ['danno', 'Danno'], ['gittata', 'Gittata / portata'],
  ['mani', 'Mani'], ['modalita', 'Modalità'], ['inc', 'INC'], ['parata', 'Parata'], ['forza', 'FOR'],
];

/**
 * Colpi sotto l'arma: un gruppo di quadratini per caricatore (etichetta «car. N») o per cella;
 * «colpi» per le armi a inserimento. I gruppi si affiancano quando entrano, con uno stacco largo,
 * e vanno a capo quando non entrano (un caricatore da 30 occupa tre righe).
 */
function fileColpi(c, pi = []) {
  const etichetta = !c ? null : c.modo === 'inserimento' ? () => 'colpi' : c.modo === 'cella' ? (k) => `cella ${k}` : (k) => `car. ${k}`;
  return h('div', { class: 'file-colpi' },
    c ? Array.from({ length: c.file }, (_, k) => h('div', { class: 'caricatore' },
      h('span', { class: 'etichetta-colpi' }, etichetta(k + 1)), quadratini(c.capacita, { compatto: true }))) : null,
    pi.map(gruppoPI));
}

/**
 * PI da annerire a matita (Armamenti §7.2.1), anche qui oltre che nel foglio 4 (decisione 6): un
 * quadratino per PI massimo, con l'etichetta dell'oggetto. A 0 PI l'oggetto è Rotto.
 */
const gruppoPI = ({ etichetta, pi }) => h('div', { class: 'caricatore gruppo-pi' },
  h('span', { class: 'etichetta-colpi' }, etichetta ? `PI ${etichetta}` : 'PI'), quadratini(pi, { compatto: true }));

/** Protezioni indossate con AR, categoria e note (proprietà) e, sotto ogni riga, i PI a quadratini. */
function tabellaProtezioni(d) {
  const colonne = d.protezioni.colonne;
  return h('table', { class: 'tabella-stampa protezioni-stampa' },
    h('thead', {}, h('tr', {}, colonne.map((c) => h('th', {}, c)))),
    d.protezioni.righe.length ? d.protezioni.righe.map((r, i) => {
      const pi = d.piProtezioni?.[i] ?? [];
      return h('tbody', {},
        h('tr', { class: 'riga-arma' }, r.map((v, j) => (j === 0 ? h('th', { scope: 'row' }, v) : h('td', {}, v)))),
        pi.length ? h('tr', { class: 'riga-colpi' }, h('td', { colspan: colonne.length }, fileColpi(null, pi))) : null);
    }) : h('tbody', {}, h('tr', { class: 'da-compilare' }, colonne.map(() => h('td', {}, ' ')))));
}

/**
 * Armi: una riga per arma con il profilo d'uso e la casella «in mano» (sulla carta la mano non
 * conta); sotto, colpi a quadratini per caricatore, PI a quadratini, condizione da cerchiare (A.49)
 * e proprietà in piccolo. Un'arma con le sue righe è un tbody: la continuazione non lo spezza.
 */
function tabellaArmi(armi, condizioni = []) {
  const n = COLONNE_ARMI.length + 1;
  return h('table', { class: 'tabella-stampa armi-stampa' },
    h('thead', {}, h('tr', {}, h('th', { class: 'col-in-mano', title: 'In mano' }, 'In mano'), COLONNE_ARMI.map(([k, t]) => h('th', { class: `col-${k}` }, t)))),
    armi.map((a) => h('tbody', {},
      h('tr', { class: 'riga-arma' },
        h('td', { class: 'col-in-mano' }, h('span', { class: 'casella' })),
        COLONNE_ARMI.map(([k]) => (k === 'nome'
          ? h('th', { scope: 'row' }, a.nome, a.addosso ? h('span', { class: 'sigla' }, ' addosso') : null)
          : h('td', { class: `col-${k}` }, a[k] || '—')))),
      h('tr', { class: 'riga-colpi' }, h('td', { colspan: n },
        fileColpi(a.colpi ?? null, a.piMax ? [{ etichetta: '', pi: a.piMax }] : []),
        condizioni.length || (a.proprieta && a.proprieta !== '—') ? h('p', { class: 'dettagli-arma sigla' },
          condizioni.length ? ['Condizione (A.49): ', condizioni.join(' · ')] : null,
          a.proprieta && a.proprieta !== '—' ? [condizioni.length ? ' — ' : null, 'Proprietà: ', a.proprieta] : null) : null)))));
}

/** Sanitario (decisione 7): un kit per riga, con le applicazioni a quadratini (§7.19). */
const boxSanitario = (kit) => box({ titolo: 'Sanitario', classe: 'f3-sanitario' },
  kit.map((k) => h('div', { class: 'caricatore kit-sanitario' }, h('span', { class: 'nome-kit' }, k.nome), h('span', { class: 'etichetta-colpi' }, k.unita), quadratini(k.applicazioni, { compatto: true }))));

/** Gradi da cerchiare con la penalità accanto (Ferite, Affaticamento, Corruzione): una tabella. */
const tabellaGradi = (righe, { classe = '' } = {}) => h('table', { class: `tabella-stampa gradi-stampa ${classe}`.trim() },
  h('tbody', {}, righe.map((r) => h('tr', {},
    h('td', { class: 'col-casella' }, h('span', { class: 'casella' })),
    h('th', { scope: 'row' }, r.nome),
    h('td', { class: 'col-penalita' }, r.penalita),
    r.nota !== undefined ? h('td', { class: 'nota-grado sigla' }, r.nota ?? '') : null))));

const penalitaTesto = (v) => (v === null || v === undefined ? '—' : v === 0 ? '0' : segno(v));

/** Colonna destra del foglio 3: Ferite, Affaticamento, Corruzione Oscura, Stati (§5.14, §5.19, §5.20, §5.18). */
function colonnaCondizioni(d) {
  return h('div', { class: 'colonna f3-destra' },
    box({ titolo: 'Ferite (§5.14)', classe: 'f3-ferite' },
      tabellaGradi([...d.ferite.stati.map((f) => ({ nome: f.nome, penalita: penalitaTesto(f.penalita), nota: f.menomazione ?? '' })),
        { nome: 'Oltre Grave', penalita: '', nota: d.ferite.oltre }])),
    box({ titolo: 'Affaticamento (§5.19)', classe: 'f3-affaticamento' },
      tabellaGradi(d.affaticamento.map((x) => ({ nome: x.nome, penalita: penalitaTesto(x.penalita) })), { classe: 'due-colonne' })),
    d.corruzione.length ? box({ titolo: 'Corruzione Oscura (§5.20)', classe: 'f3-corruzione' },
      tabellaGradi(d.corruzione.map((x) => ({ nome: x.irreversibile ? `${x.nome} (irreversibile)` : x.nome, penalita: penalitaTesto(x.penalita) })), { classe: 'due-colonne' })) : null,
    box({ titolo: 'Stati (§5.18)', classe: 'f3-stati' },
      tabellaGradi(d.statiStampa.map((x) => ({ nome: x.nome, penalita: '', nota: x.effetto || '—' })), { classe: 'stati-gradi' })));
}

/**
 * Continuazione del foglio 3: se la colonna sinistra non entra, ciò che non sta passa a una pagina
 * «Combattimento (continua)» a tutta larghezza (la colonna destra non si ripete). Passano, dall'ultimo
 * in ordine di lettura: il Sanitario, le Protezioni, le armi (un'arma con le sue file è un tbody,
 * mai spezzato). Nella prima pagina restano la sintesi e il riquadro Punti Vita, con l'altezza
 * minima di css/stampa.css (.f3-pv).
 * @returns {number} pagine del foglio
 */
function impaginaCombattimento(foglio, d, piede) {
  const corpo = foglio.querySelector('.foglio-corpo');
  // conta solo la colonna sinistra: la colonna destra (Ferite, Stati…) non passa alla continuazione
  const sinistra = corpo.querySelector('.f3-sinistra');
  const eccedeIn = (el) => trabocca(el) || [...el.querySelectorAll('.riquadro-stampa, .riquadro-stampa > .contenuto')].some(trabocca);
  if (!eccedeIn(sinistra)) return 1;
  const theadArmi = corpo.querySelector('.armi-stampa thead');
  const pagine = [{ corpo, contenitore: sinistra }];
  const nuovaPagina = () => {
    const armi = box({ titolo: 'Armi (continua)', classe: 'f3-armi' }, h('table', { class: 'tabella-stampa armi-stampa' }, theadArmi.cloneNode(true)));
    const contenitore = h('div', { class: 'colonna f3-seguito' }, armi);
    const f = creaFoglio('combattimento', 'Combattimento (continua)', d, piede, () => contenitore);
    f.classList.add('seguito');
    // lo stesso piè di pagina del foglio: misurando, l'altezza del corpo è già quella vera
    f.querySelector('.foglio-piede').textContent = foglio.querySelector('.foglio-piede').textContent;
    (pagine.at(-1).foglio ?? foglio).after(f);
    const pg = { foglio: f, corpo: f.querySelector('.foglio-corpo'), contenitore };
    pagine.push(pg);
    return pg;
  };
  const tabArmi = (pg) => pg.contenitore.querySelector(':scope > .f3-armi .armi-stampa');
  const armiDi = (pg) => [...(tabArmi(pg)?.querySelectorAll(':scope > tbody') ?? [])];
  const riquadri = (pg) => [...pg.contenitore.querySelectorAll(':scope > .f3-protezioni, :scope > .f3-sanitario')];
  const verso = (k) => pagine[k + 1] ?? nuovaPagina();
  const sposta = (k) => {
    const pg = pagine[k];
    const r = riquadri(pg);
    if (r.length) {
      const dopo = verso(k);
      dopo.contenitore.insertBefore(r.at(-1), dopo.contenitore.querySelector(':scope > .f3-armi').nextSibling);
      return true;
    }
    const a = armiDi(pg);
    if (a.length > (k > 0 ? 1 : 0)) {
      const t = tabArmi(verso(k));
      t.insertBefore(a.at(-1), t.querySelector(':scope > tbody'));
      return true;
    }
    return false;
  };
  for (let k = 0; k < pagine.length && k < 10; k++) {
    for (let giro = 0; giro < 300 && eccedeIn(pagine[k].contenitore) && sposta(k); giro++);
  }
  // riquadri Armi rimasti senza armi
  for (const pg of pagine) {
    const box = pg.contenitore.querySelector(':scope > .f3-armi');
    if (box && !armiDi(pg).length) box.remove();
  }
  return pagine.length;
}

function foglioCombattimento(d) {
  const s = d.sintesi;
  const mov = s.movimento;
  const cella = (etichetta, ...valore) => h('div', { class: 'cella-sintesi' }, h('span', { class: 'nome-cella' }, etichetta), h('span', { class: 'valore-cella' }, ...valore));
  return h('div', { class: 'f3-griglia' },
    h('div', { class: 'colonna f3-sinistra' },
      // la fila dei nomi degli Stati non c'è più: gli Stati hanno il loro riquadro a destra
      box({ titolo: null, classe: 'f3-sintesi' },
        h('div', { class: 'sintesi' },
          cella('Iniziativa', `${segno(s.iniziativa)} + ${s.dadoIniziativa}`),
          cella('Movimento', `Passo ${mov.passo} · Corsa ${mov.corsa} · Scatto ${mov.scatto} ${mov.unita}`),
          cella('Azioni', `${s.azioni.movimento} Mov. · ${s.azioni.principali} Princ.`),
          s.difese ? cella('Difese', `VA ${s.difese.va}`, d.istintive?.length ? h('span', { class: 'sigla' }, ` (${d.istintive.join(', ')})`) : null) : null,
          s.salvezze.map((x) => cella(x.nome, `${x.totale}${x.limitato ? '*' : ''}`)))),
      box({ titolo: 'Armi', classe: 'f3-armi' }, tabellaArmi(d.armiStampa, d.condizioniArmi ?? [])),
      box({ titolo: 'Protezioni', classe: 'f3-protezioni' }, tabellaProtezioni(d)),
      d.sanitario?.length ? boxSanitario(d.sanitario) : null,
      box({ titolo: 'Punti Vita', tinta: 'pv', forte: true, riempitivo: true, classe: 'f3-pv' },
        // PV massimi e, accanto, l'AR in evidenza (docs/ricognizione-ar-pi.md): un sottoriquadro per valore
        h('div', { class: 'f3-massimi' },
          h('div', { class: 'massimo' }, h('span', {}, 'massimi'), h('span', { class: 'valore' }, String(d.pv))),
          (d.arStampa?.valori ?? []).map((v) => h('div', { class: `massimo tinta-ar${v.principale ? ' principale' : ''}` },
            h('span', {}, v.etichetta), h('span', { class: 'valore' }, String(v.valore))))),
        d.arStampa ? h('p', { class: 'piccolo provenienza-ar' }, d.arStampa.provenienza) : null,
        h('p', { class: 'piccolo' }, 'attuali'),
        quadratini(d.pv, { bloccoInPiu: true }),
        righeGuida())),
    colonnaCondizioni(d));
}

// ---------------------------------------------------------------------------
// Foglio 4 — Inventario (docs/layout-ss.md, pezzo 1): in testa Crediti e Carico su una riga; poi le
// sezioni della tab Inventario su due colonne (CSS columns), una tabella per sezione con
// l'intestazione nel colore della categoria; per ogni oggetto costo, Qualità, peso, quattro
// caselle di stato (l'attuale prestampata piena), PS Integrità e, sotto, i PI a quadratini. In fondo
// il riempitivo «Da aggiungere». Le sezioni che non entrano passano alla pagina dopo, intere.

const COLONNE_INVENTARIO = (d) => ['Oggetto', 'Costo', 'Qualità', 'Peso', ...d.stati.map((x) => x.sigla), 'PS'];

function tabellaInventario(d, righe, { vuote = 0 } = {}) {
  const n = COLONNE_INVENTARIO(d).length;
  const caselle = (stato) => d.stati.map((x) => h('td', { class: 'stato-inv', title: x.nome }, h('span', { class: `casella${x.id === stato ? ' piena' : ''}` })));
  const voce = (r) => h('tbody', { class: 'oggetto-inv' },
    h('tr', {},
      h('th', { scope: 'row' }, r.nome, r.note ? h('span', { class: 'sigla' }, ` — ${r.note}`) : null),
      h('td', { class: 'costo-inv' }, r.costo), h('td', { class: 'qualita-inv' }, r.qualita), h('td', { class: 'peso-inv' }, r.peso),
      caselle(r.stato), h('td', { class: 'ps-inv' }, r.ps ?? '—')),
    r.piMax || r.condizioni ? h('tr', { class: 'riga-pi' }, h('td', { colspan: n },
      r.piMax ? h('div', { class: 'pi-inv' }, h('span', { class: 'etichetta-colpi' }, 'PI'), quadratini(r.piMax, { compatto: true })) : null,
      r.condizioni ? h('p', { class: 'condizioni-inv sigla' }, 'Condizione (A.49): ', r.condizioni.join(' · ')) : null)) : null);
  // «Da aggiungere»: righe vuote con le stesse colonne e i PI a caselle vuote (da scrivere a matita)
  const vuota = () => {
    const t = h('tbody', { class: 'oggetto-inv da-compilare' },
      h('tr', {}, h('th', {}, ' '), h('td', {}, ' '), h('td', {}, ' '), h('td', {}, ' '), caselle(null), h('td', {}, ' ')),
      // una riga di 10 caselle tutte disponibili: il massimo si scrive a matita
      h('tr', { class: 'riga-pi' }, h('td', { colspan: n }, h('div', { class: 'pi-inv' }, h('span', { class: 'etichetta-colpi' }, 'PI'), quadratini(10, { compatto: true })))));
    t.dataset.vuota = '1';
    return t;
  };
  return h('table', { class: 'tabella-stampa inventario-stampa' },
    h('thead', {}, h('tr', {}, COLONNE_INVENTARIO(d).map((c, i) => h('th', { class: i >= 4 && i < 4 + d.stati.length ? 'stato-inv' : null }, c)))),
    righe.map(voce), Array.from({ length: vuote }, vuota));
}

const sezioneInventario = (d, s) => box({ titolo: `${s.titolo} (${s.righe.length})`, classe: `inv-sezione tinta-${s.colore}` }, tabellaInventario(d, s.righe));

function testaInventario(d) {
  const c = d.carico;
  return h('div', { class: 'inv-testa' },
    h('p', {}, h('strong', {}, 'Crediti '), h('span', { class: 'casella-lunga' }),
      d.creditiIniziali !== null ? h('span', { class: 'sigla' }, ` saldo iniziale ${crediti(d.creditiIniziali)}`) : null),
    c ? h('p', {}, h('strong', {}, 'Carico '), h('span', { class: 'casella-lunga corta' }), ' kg',
      h('span', { class: 'sigla' }, ` · noto ${c.peso}${c.parziale ? ` (${c.senzaPeso} da definire)` : ''} · Ordinario ≤ ${c.ordinario} · Sovraccarico ≤ ${c.massimo} (§5.2.6)`)) : null,
    h('p', { class: 'sigla legenda-stati' }, 'Stato: ', d.stati.map((x, i) => [i ? ' · ' : null, h('strong', {}, x.sigla), ` ${x.nome}`]), ' — la casella piena è lo stato salvato.'));
}

function foglioInventario(d) {
  return [testaInventario(d), h('div', { class: 'inv-colonne' }, d.sezioni.map((s) => sezioneInventario(d, s)))];
}

/**
 * Impagina il foglio Inventario: le sezioni entrano nelle due colonne della pagina nell'ordine della
 * tab; una sezione che non entra nello spazio rimasto passa intera alla pagina dopo («Inventario
 * (continua)», senza la testa). Una sezione più alta di una colonna si divide fra le due colonne;
 * solo se non entra neppure in una pagina intera si segnala (e il collaudo fallisce). In fondo
 * all'ultima pagina il riempitivo «Da aggiungere», con le righe che entrano.
 * @returns {{ pagine, troppoLunghe: string[] }}
 */
function impaginaInventario(foglio, d, piede) {
  let colonne = foglio.querySelector('.inv-colonne');
  const sezioni = [...colonne.children];
  sezioni.forEach((s) => s.remove());
  let ultima = foglio;
  let pagine = 1;
  const nuovaPagina = () => {
    const f = creaFoglio('inventario', 'Inventario (continua)', d, piede, () => h('div', { class: 'inv-colonne' }));
    f.classList.add('seguito');
    // lo stesso piè di pagina del foglio (si riscrive alla fine): misurando, l'altezza del corpo è già quella vera
    f.querySelector('.foglio-piede').textContent = foglio.querySelector('.foglio-piede').textContent;
    ultima.after(f);
    ultima = f;
    pagine++;
    return f.querySelector('.inv-colonne');
  };
  const troppoLunghe = [];
  for (const s of sezioni) {
    colonne.append(s);
    if (trabocca(colonne) && colonne.children.length > 1) {
      colonne = nuovaPagina();
      colonne.append(s);
    }
    if (trabocca(colonne)) troppoLunghe.push(s.querySelector('h2')?.textContent ?? '?');
  }
  // riempitivo: righe vuote finché entrano; con meno di due righe libere non si stampa
  const extra = box({ titolo: 'Da aggiungere', classe: 'inv-sezione inv-da-aggiungere' }, tabellaInventario(d, [], { vuote: 30 }));
  colonne.append(extra);
  const vuote = () => [...extra.querySelectorAll('tbody[data-vuota]')];
  while (trabocca(colonne) && vuote().length) vuote().at(-1).remove();
  if (vuote().length < 2) extra.remove();
  return { pagine, troppoLunghe };
}

// ---------------------------------------------------------------------------
// Foglio 5 — Poteri (oggi la Magia; anche più pagine). Prima pagina: Punti Magia, valori di lancio, contenitori
// di Chroma e l'indice degli incantesimi (una riga ciascuno, colorata per macrofamiglia); le
// righe che non entrano continuano nella pagina dopo. Poi una scheda per incantesimo con il testo
// completo, nell'ordine dell'indice, in tre colonne; una scheda non si spezza se entra in una
// colonna (break-inside: avoid).

const tintaMacro = (m) => COLORI_MACROFAMIGLIE[m] ?? null;
const elencoIncantesimi = (d) => d.macrofamiglie.flatMap((m) => m.specializzazioni.flatMap((sp) =>
  sp.incantesimi.map((i) => ({ ...i, macrofamiglia: i.macrofamiglia ?? m.nome, specializzazione: sp.nome }))));

function rigaIndice(i) {
  return h('tr', { class: `tinta-${tintaMacro(i.macrofamiglia)}` },
    h('th', { scope: 'row' }, i.nome), h('td', { class: 'centro' }, String(i.livelloBase)), h('td', {}, `${i.macrofamiglia} · ${i.specializzazione}`),
    h('td', { class: 'centro' }, i.indice.pm), h('td', {}, i.indice.tempo), h('td', {}, i.indice.gittata), h('td', {}, i.indice.durata));
}

const tabellaIndice = (righe) => h('table', { class: 'tabella-stampa indice-magia' },
  h('thead', {}, h('tr', {}, ['Incantesimo', 'Liv.', 'Macrofamiglia', 'PM', 'Tempo di lancio', 'Gittata', 'Durata'].map((c) => h('th', {}, c)))),
  h('tbody', {}, righe));

function schedaIncantesimo(i) {
  return h('article', { class: `scheda-incantesimo tinta-${tintaMacro(i.macrofamiglia)}` },
    h('header', {}, h('span', { class: 'nome-incantesimo' }, i.nome), ' ', pallini(i.livelloBase),
      h('span', { class: 'sigla' }, ` ${i.macrofamiglia} · ${i.specializzazione} · livello base ${i.livelloBase}`)),
    h('div', { class: 'corpo-scheda' },
      i.intestazione ? h('p', { class: 'intestazione' }, i.intestazione) : null,
      i.lancio ? h('p', {}, i.lancio) : null,
      i.descrizione ? h('p', { class: 'testo-lungo' }, i.descrizione) : null,
      i.righe.length ? tabella(i.colonne, i.righe, { classe: 'versioni-stampa' })
        : h('p', { class: 'piccolo' }, `Tabella: Manuale della Magia, scheda ${i.scheda}.`),
      i.regole ? h('p', { class: 'testo-lungo' }, i.regole) : null));
}

/** «Solo elenco»: in fondo all'indice, perché mancano le schede. */
const notaSoloElenco = () => h('p', { class: 'piccolo nota-solo-elenco' }, 'Schede complete non stampate: testo nel Manuale della Magia.');

function foglioMagia(d) {
  const v = d.valoriLancio;
  const voce = (nome, valore) => [h('dt', {}, nome), h('dd', {}, valore)];
  const incantesimi = elencoIncantesimi(d);
  return [
    h('div', { class: 'f4-testa' },
      box({ titolo: 'Punti Magia', tinta: 'pm', forte: true },
        h('div', { class: 'massimo' }, h('span', {}, 'massimi'), h('span', { class: 'valore' }, String(d.pm ?? '—'))),
        h('p', { class: 'piccolo' }, 'attuali'),
        d.pm ? quadratini(d.pm, { bloccoInPiu: true }) : null),
      box({ titolo: 'Lancio' },
        h('dl', { class: 'voci-stampa' },
          voce('Potere per lanciare', h('strong', {}, `VA ${v.potere ?? '—'}`), d.lancio ? ` (armatura ${segno(d.lancio.penalita)}, §7.11.1)` : null),
          voce('Focalizzazione', `${segno(v.focalizzazione)} a Potere (1 Azione Principale prima)`),
          voce('Ingaggio', `${segno(v.ingaggio)} a Potere, Prova sempre richiesta`),
          voce('Anticipazione', `PM ×${v.anticipazione}, Potere più difficile di una categoria`),
          voce('Armi da lancio', `${segno(v.armiDaLancio)} negli Incantesimi`),
          voce('Incantesimi', `conosciuti ${d.conosciuti} / ${d.quota} · livello massimo ${d.livelloMassimo}`),
          // Magia sez. 1, come nel riquadro Incantesimi della SD
          d.gradi ? voce('Gradi taumaturgici', d.gradi.testo) : null),
        h('table', { class: 'tabella-stampa scala' },
          h('tbody', {},
            h('tr', {}, h('th', {}, `Livello (scala ${d.scalaPotere})`), d.scala.map((r) => h('td', {}, r.livelli))),
            h('tr', {}, h('th', {}, 'Prova di Potere'), d.scala.map((r) => h('td', {}, r.prova)))))),
      // decisione 5: batterie e riserve di Chroma con i PM qui (il foglio Artefatti ha la sola sintonizzazione)
      d.riserve?.length ? box({ titolo: 'Batterie e riserve di Chroma (Magia sez. 6)', classe: 'f4-riserve' },
        d.riserve.map((r) => h('div', { class: 'riserva' },
          h('p', {}, h('span', { class: `chroma-punto chroma-${String(r.energia).toLowerCase()}`, 'aria-hidden': 'true' }), h('strong', {}, r.nome),
            h('span', { class: 'sigla' }, ` · ${r.energia} · ${r.integrato ? 'attivazioni (A.18)' : r.regoleRimandate ? 'regole rimandate' : r.macrofamiglie.length >= 3 ? 'tutte le macrofamiglie' : r.macrofamiglie.join(', ') || '—'} · ${r.sintonizzato ? 'sintonizzato' : 'da sintonizzare'} (${r.costo})`)),
          quadratini(r.capacita, { compatto: true }))),
        d.conversione ? h('p', { class: 'piccolo' }, `Convertire Potere e ricaricare: ${d.conversione.rapporto}:1`,
          d.conversione.talenti.length ? ` (${d.conversione.talenti.join(' e ')})` : '',
          Object.keys(d.conversione.fissi).length ? `; ${Object.entries(d.conversione.fissi).map(([c, n]) => `${c} ${n}:1`).join(', ')} in entrambi i sensi` : '', '.') : null) : null),
    d.daArtefatti?.length ? h('p', { class: 'da-artefatti-stampa' }, h('strong', {}, 'Da artefatti: '), `${d.daArtefatti.join(', ')} — vedi foglio ${d.foglioArtefatti}.`) : null,
    box({ titolo: `Incantesimi (${incantesimi.length})`, riempitivo: true, classe: 'f4-indice' },
      incantesimi.length ? tabellaIndice(incantesimi.map(rigaIndice)) : h('p', {}, 'Nessun incantesimo scelto.'),
      d.soloElenco && incantesimi.length ? notaSoloElenco() : null),
  ];
}

/**
 * Impagina il foglio Magia: righe dell'indice che non entrano nella prima pagina e schede degli
 * incantesimi su pagine successive, riempite misurando nel DOM. Le schede si impaginano sempre,
 * per contare le pagine che aggiungono; con «Solo elenco» (d.soloElenco) poi si tolgono.
 * @returns {{ pagine, pagineSchede }} pagine stampate e pagine che aggiungono le schede complete
 */
function impaginaMagia(contenitore, foglio, d, piede) {
  const incantesimi = elencoIncantesimi(d);
  // 1. indice: le righe oltre il fondo del riquadro passano alla pagina dopo (la nota di «Solo
  // elenco» resta in fondo all'indice, anche quando l'indice continua)
  const box1 = foglio.querySelector('.f4-indice > .contenuto');
  const nota = box1.querySelector('.nota-solo-elenco');
  const fondo = box1.getBoundingClientRect().bottom - 1 - (nota ? nota.getBoundingClientRect().height : 0);
  const righe = [...foglio.querySelectorAll('.indice-magia tbody tr')];
  const primaFuori = righe.findIndex((r) => r.getBoundingClientRect().bottom > fondo);
  const resto = primaFuori < 0 ? [] : righe.slice(primaFuori);
  resto.forEach((r) => r.remove());
  if (resto.length && nota) nota.remove();
  if (!incantesimi.length) return { pagine: 1, pagineSchede: 0 };

  let ultima = foglio;
  let pagine = 1;
  const nuovaPagina = (conIndice) => {
    const f = creaFoglio('poteri', 'Poteri (continua)', d, piede, () => [
      conIndice ? box({ titolo: 'Incantesimi (continua)', classe: 'f4-indice-seguito' }, tabellaIndice(resto), d.soloElenco ? notaSoloElenco() : null) : null,
      h('div', { class: 'colonne-schede' }),
    ]);
    f.classList.add('seguito');
    ultima.after(f);
    ultima = f;
    pagine++;
    return f.querySelector('.colonne-schede');
  };
  let colonne = nuovaPagina(resto.length > 0);
  // altezza naturale di una scheda nella larghezza di una colonna
  const stile = getComputedStyle(colonne);
  const larghezza = (colonne.clientWidth - 2 * parseFloat(stile.columnGap)) / 3;
  const misura = h('div', { class: 'misura-scheda', style: `width: ${larghezza}px` });
  colonne.closest('.foglio').append(misura);
  const altezzaColonna = colonne.clientHeight;
  const fuori = [];
  for (const i of incantesimi) {
    const scheda = schedaIncantesimo(i);
    misura.append(scheda);
    // una scheda più alta di una colonna continua nella colonna accanto; le altre non si spezzano
    if (scheda.getBoundingClientRect().height > altezzaColonna) scheda.classList.add('lunga');
    colonne.append(scheda);
    if (trabocca(colonne) && colonne.children.length > 1) {
      colonne = nuovaPagina(false);
      colonne.append(scheda);
    }
    if (trabocca(colonne)) fuori.push(i.nome);
  }
  misura.remove();
  if (fuori.length) console.warn('Schede più lunghe di una pagina:', fuori.join(', '));
  // pagine con il solo indice: la prima e, se l'indice continua, quella dopo (senza schede)
  const pagineElenco = resto.length ? 2 : 1;
  if (d.soloElenco) {
    let f = foglio.nextElementSibling;
    for (let k = 1; k < pagine && f; k++) {
      const dopo = f.nextElementSibling;
      if (k < pagineElenco) f.querySelector('.colonne-schede')?.remove();
      else f.remove();
      f = dopo;
    }
    return { pagine: pagineElenco, pagineSchede: pagine - pagineElenco };
  }
  return { pagine, pagineSchede: pagine - pagineElenco };
}
