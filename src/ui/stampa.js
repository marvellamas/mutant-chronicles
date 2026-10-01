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
import { normalizzaOpzioniStampa, fogliDaStampare, numeraPagine, testoPiede, iconaFoglio, schemaQuadratini, righeElencoIncantesimi, abbreviaSS } from '../stampa.js';

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

const corpi = { identita: foglioIdentita, abilita: foglioAbilita, combattimento: foglioCombattimento, inventario: foglioInventario, poteri: foglioMagia, artefatti: foglioArtefatti, cibernetica: foglioCibernetica };

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
  const numeri = numeraPagine(pagine.map((f) => ({ id: f.dataset.foglio, seguito: f.classList.contains('seguito'), parti: f.classList.contains('pagine-proprie') })), fogliPersonaggio);
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

  const contenitore = h('div', { class: 'fogli' }, fogli.map((f) => {
    const foglio = creaFoglio(f.id, f.titolo, { ...f.dati, ...(f.id === 'poteri' ? { soloElenco: opz.magia === 'elenco' } : {}) }, stampa.piede);
    if (f.id !== 'combattimento') return foglio;
    // foglio 3 su due pagine fisse (docs/layout-ss.md, ritocchi post-stampa): Armi, poi Condizione
    // ed equipaggiamento indossato; le continuazioni delle armi si inseriscono fra le due
    const condizione = creaFoglio(f.id, 'Condizione ed equipaggiamento indossato', f.dati, stampa.piede, foglioCondizione);
    foglio.classList.add('pagine-proprie');
    condizione.classList.add('seguito', 'pagine-proprie', 'f3-pagina-condizione');
    return [foglio, condizione];
  }));
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
      if (f.classList.contains('foglio-cibernetica') && f.classList.contains('seguito')) continue; // impaginate da impaginaCibernetica
      if (f.classList.contains('foglio-cibernetica')) {
        const pagine = impaginaCibernetica(f, stampa.fogli.find((x) => x.id === 'cibernetica').dati, stampa.piede);
        if (pagine > 1) avvisi.append(h('p', {}, `Il foglio Cibernetica è su ${pagine} pagine.`));
        if (eccede(f.querySelector('.foglio-corpo'))) { f.dataset.fuori = '1'; fuori.push('Cibernetica'); }
        continue;
      }
      if (f.classList.contains('foglio-artefatti') && f.classList.contains('seguito')) continue; // impaginate da impaginaArtefatti
      if (f.classList.contains('foglio-artefatti')) {
        const pagine = impaginaArtefatti(f, stampa.fogli.find((x) => x.id === 'artefatti').dati, stampa.piede);
        if (pagine > 1) avvisi.append(h('p', {}, `Il foglio Artefatti è su ${pagine} pagine.`));
        if (eccede(f.querySelector('.foglio-corpo'))) { f.dataset.fuori = '1'; fuori.push('Artefatti'); }
        continue;
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
        const pagine = impaginaCombattimento(f, stampa.fogli.find((x) => x.id === 'combattimento').dati, stampa.piede) + 1;
        if (pagine > 2) avvisi.append(h('p', {}, `Il foglio Combattimento è su ${pagine} pagine (le armi continuano).`));
      }
      if (f.classList.contains('f3-pagina-condizione')) impaginaCondizione(f);
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
function quadratini(massimo, { compatto = false, bloccoInPiu = false, pieni = 0, perRiga, righeInPiu = 0 } = {}) {
  const el = h('div', { class: `quadratini${compatto ? ' compatti' : ''}` }, schemaQuadratini(massimo, { compatto, perRiga, righeInPiu }).blocchi.map(bloccoQuadratini));
  // i primi «pieni» prestampati (punti di sintonizzazione già occupati, scelta salvata nel file)
  [...el.querySelectorAll('.casella:not(.oltre)')].slice(0, Math.max(0, pieni)).forEach((c) => c.classList.add('piena'));
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
// Foglio 3 — Combattimento, su due pagine fisse (docs/layout-ss.md, pezzo 3 e ritocchi post-stampa).
// Pagina 1, Armi: in alto la fascia con i Punti Vita (quadratini a righe lunghe, PV massimi, AR e
// VA Difese in evidenza) e la sintesi (Iniziativa, Movimento, Azioni, Prove Salvezza); sotto, le
// Armi a tutta larghezza con il profilo d'uso, la casella «in mano», colpi, PI e condizione; le armi
// che non entrano continuano su pagine in più del foglio 3. Pagina 2, Condizione ed equipaggiamento
// indossato: Ferite, Affaticamento, Corruzione Oscura e Stati su quattro colonne, Protezioni e
// Sanitario, e se avanza spazio il riquadro «Azioni di combattimento» (solo valori dei dati).

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

/** Riquadri di stato della pagina 2 del foglio 3: Ferite, Affaticamento, Corruzione Oscura, Stati (§5.14, §5.19, §5.20, §5.18). */
function riquadriCondizioni(d) {
  return [
    box({ titolo: 'Ferite (§5.14)', classe: 'f3-ferite' },
      tabellaGradi([...d.ferite.stati.map((f) => ({ nome: f.nome, penalita: penalitaTesto(f.penalita), nota: f.menomazione ?? '' })),
        { nome: 'Oltre Grave', penalita: '', nota: d.ferite.oltre }])),
    box({ titolo: 'Affaticamento (§5.19)', classe: 'f3-affaticamento' },
      tabellaGradi(d.affaticamento.map((x) => ({ nome: x.nome, penalita: penalitaTesto(x.penalita) })))),
    d.corruzione.length ? box({ titolo: 'Corruzione Oscura (§5.20)', classe: 'f3-corruzione' },
      tabellaGradi(d.corruzione.map((x) => ({ nome: x.irreversibile ? `${x.nome} (irreversibile)` : x.nome, penalita: penalitaTesto(x.penalita) })))) : null,
    box({ titolo: 'Stati (§5.18)', classe: 'f3-stati' },
      tabellaGradi(d.statiStampa.map((x) => ({ nome: x.nome, penalita: '', nota: x.effetto || '—' })), { classe: 'stati-gradi' })),
  ];
}

/**
 * Continuazione delle armi del foglio 3: se la pagina 1 non entra, le armi passano, dall'ultima, a
 * pagine «Combattimento (continua)» inserite prima della pagina 2 (un'arma con le sue file è un
 * tbody, mai spezzato; nella pagina 1 resta almeno un'arma). La fascia dei PV non si sposta.
 * @returns {number} pagine delle armi (la pagina 1 e le sue continuazioni)
 */
function impaginaCombattimento(foglio, d, piede) {
  const corpo = foglio.querySelector('.foglio-corpo');
  if (!eccede(corpo)) return 1;
  const theadArmi = corpo.querySelector('.armi-stampa thead');
  const pagine = [{ foglio, corpo }];
  const nuovaPagina = () => {
    const armi = box({ titolo: 'Armi (continua)', classe: 'f3-armi' }, h('table', { class: 'tabella-stampa armi-stampa' }, theadArmi.cloneNode(true)));
    const f = creaFoglio('combattimento', 'Combattimento (continua)', d, piede, () => armi);
    f.classList.add('seguito', 'pagine-proprie');
    // lo stesso piè di pagina del foglio: misurando, l'altezza del corpo è già quella vera
    f.querySelector('.foglio-piede').textContent = foglio.querySelector('.foglio-piede').textContent;
    pagine.at(-1).foglio.after(f);
    const pg = { foglio: f, corpo: f.querySelector('.foglio-corpo') };
    pagine.push(pg);
    return pg;
  };
  const tabArmi = (pg) => pg.corpo.querySelector('.f3-armi .armi-stampa');
  const armiDi = (pg) => [...tabArmi(pg).querySelectorAll(':scope > tbody')];
  for (let k = 0; k < pagine.length && k < 10; k++) {
    for (let giro = 0; giro < 300 && eccede(pagine[k].corpo); giro++) {
      const a = armiDi(pagine[k]);
      if (a.length <= 1) break;
      const t = tabArmi(pagine[k + 1] ?? nuovaPagina());
      t.insertBefore(a.at(-1), t.querySelector(':scope > tbody'));
    }
  }
  return pagine.length;
}

/**
 * Pagina 2 del foglio 3: il riquadro «Azioni di combattimento» si stampa solo per gruppi interi che
 * entrano. I gruppi si provano nell'ordine dei dati (prima il tiro se ci sono armi a distanza,
 * altrimenti le manovre corpo a corpo): uno che non entra si salta e si prova il seguente. Senza
 * gruppi il riquadro non c'è. Mai una terza pagina.
 */
function impaginaCondizione(foglio) {
  const corpo = foglio.querySelector('.foglio-corpo');
  const riquadro = corpo.querySelector('.f3-azioni');
  if (!riquadro) return;
  const contenitore = riquadro.querySelector('.azioni-gruppi');
  const gruppi = [...contenitore.children];
  gruppi.forEach((g) => g.remove());
  for (const g of gruppi) {
    contenitore.append(g);
    if (eccede(corpo)) g.remove();
  }
  if (!contenitore.children.length) riquadro.remove();
}

/** Un gruppo del riquadro Azioni: oltre 6 righe, la tabella si divide in due metà affiancate. */
function gruppoAzioni(g) {
  const meta = Math.ceil(g.righe.length / 2);
  const tabelle = g.righe.length > 6
    ? h('div', { class: 'azioni-meta' }, tabella(g.colonne, g.righe.slice(0, meta), { classe: 'azioni-stampa' }), tabella(g.colonne, g.righe.slice(meta), { classe: 'azioni-stampa' }))
    : tabella(g.colonne, g.righe, { classe: 'azioni-stampa' });
  return h('div', { class: `azioni-gruppo${g.righe.length > 6 ? ' largo' : ''}`, dataset: { gruppo: g.id } }, h('h3', {}, g.titolo), tabelle);
}

/** Pagina 1 del foglio 3: fascia Punti Vita + sintesi, poi le Armi a tutta larghezza. */
function foglioCombattimento(d) {
  const s = d.sintesi;
  const mov = s.movimento;
  const voce = (nome, ...valore) => h('tr', {}, h('th', { scope: 'row' }, nome), h('td', {}, ...valore));
  const valore = (etichetta, v, classe = '') => h('div', { class: `massimo ${classe}`.trim() }, h('span', {}, etichetta), h('span', { class: 'valore' }, String(v)));
  return [
    h('div', { class: 'f3-fascia' },
      box({ titolo: 'Punti Vita', tinta: 'pv', forte: true, classe: 'f3-pv' },
        h('div', { class: 'f3-pv-quadratini' },
          h('p', { class: 'piccolo' }, 'attuali'),
          // righe da 25, stacco ogni 5, cumulato a destra; neri fino al massimo, grigi a completare
          // almeno tre righe, e sempre una riga grigia oltre il massimo
          quadratini(d.pv, { compatto: true, perRiga: 25, righeInPiu: Math.max(1, 3 - Math.ceil(d.pv / 25)) })),
        h('div', { class: 'f3-valori' },
          h('div', { class: 'f3-massimi' },
            valore('massimi', d.pv),
            // AR in evidenza (docs/ricognizione-ar-pi.md), un riquadro per valore con la sua etichetta
            (d.arStampa?.valori ?? []).map((v) => valore(v.etichetta, v.valore, `tinta-ar${v.principale ? ' principale' : ''}`)),
            // VA Difese, il valore già calcolato (con la Caratteristica)
            s.difese ? valore(`Difese (${s.difese.caratteristica})`, `VA ${s.difese.va}`, 'tinta-difese') : null),
          d.istintive?.length ? h('p', { class: 'piccolo' }, d.istintive.join(', ')) : null,
          d.arStampa ? h('p', { class: 'piccolo provenienza-ar' }, d.arStampa.provenienza) : null)),
      // sintesi: stessa larghezza dei riquadri di stato della pagina 2, verde dei Punti Eroe
      box({ titolo: 'Sintesi', tinta: 'pe', forte: true, classe: 'f3-sintesi' },
        h('table', { class: 'tabella-sintesi' }, h('tbody', {},
          voce('Iniziativa', `${segno(s.iniziativa)} + ${s.dadoIniziativa}`),
          voce('Movimento', `Passo ${mov.passo} · Corsa ${mov.corsa} · Scatto ${mov.scatto} ${mov.unita}`),
          voce('Azioni', `${s.azioni.movimento} Mov. · ${s.azioni.principali} Princ.`),
          s.salvezze.map((x) => voce(x.nome, `${x.totale}${x.limitato ? '*' : ''}`)))))),
    box({ titolo: 'Armi', classe: 'f3-armi' }, tabellaArmi(d.armiStampa, d.condizioniArmi ?? [])),
  ];
}

/**
 * Pagina 2 del foglio 3: stato su quattro colonne (gli Stati, i più lunghi, nella quarta a tutta
 * altezza); Protezioni e Sanitario nelle prime tre, sotto Ferite, Affaticamento e Corruzione;
 * in fondo le Azioni di combattimento.
 */
function foglioCondizione(d) {
  return [
    h('div', { class: `f3-condizione-griglia${d.sanitario?.length ? '' : ' senza-sanitario'}` },
      riquadriCondizioni(d),
      box({ titolo: 'Protezioni', classe: 'f3-protezioni' }, tabellaProtezioni(d)),
      d.sanitario?.length ? boxSanitario(d.sanitario) : null),
    d.azioni?.length ? box({ titolo: 'Azioni di combattimento', classe: 'f3-azioni' },
      h('div', { class: 'azioni-gruppi' }, d.azioni.map(gruppoAzioni))) : null,
  ];
}

// ---------------------------------------------------------------------------
// Foglio 6 — Artefatti (docs/layout-ss.md, pezzo 5): in testa la sintonizzazione (capacità con la
// provenienza, punti occupati a quadratini, elenco con i costi); poi una scheda per Artefatto come
// nella tab della SD e una riga per ogni riserva di Chroma, su tre colonne; in fondo le Note come
// riempitivo. I PM delle riserve stanno nel foglio Poteri (decisione 5): qui il rimando, salvo che
// il personaggio non abbia la magia.

const puntoChroma = (energia) => h('span', { class: `chroma-punto chroma-${String(energia).toLowerCase()}`, 'aria-hidden': 'true' });
const casellaSi = (si) => h('span', { class: `casella${si ? ' piena' : ''}` });
const rimandoPM = (d) => (d.foglioPoteri ? `PM: vedi foglio ${d.foglioPoteri}` : null);

function schedaArtefatto(d, a) {
  return h('article', { class: 'scheda-artefatto riquadro-stampa' },
    h('h2', {}, a.nome, h('span', { class: 'sigla' }, ` · ${a.tipologia} · ${a.potenza}`)),
    h('div', { class: 'contenuto' },
      h('p', {}, casellaSi(a.sintonizzato), h('strong', {}, ' Sintonizzato'), ` · occupa ${a.costo}`,
        h('span', { class: 'sigla' }, ` · nell’Inventario: ${a.stato}${a.deposito ? ' (non sintonizzabile)' : ''}`)),
      a.arma ? h('p', {}, h('strong', {}, `VA ${a.arma.va}`), ` · danno ${a.arma.danno}`,
        a.arma.provenienzaVa ? h('span', { class: 'piccolo provenienza-art' }, ` (${a.arma.provenienzaVa})`) : null,
        a.arma.provenienzaDanno ? h('span', { class: 'piccolo provenienza-art' }, ` · danno: ${a.arma.provenienzaDanno}`) : null) : null,
      a.ar ? h('p', {}, h('strong', {}, `AR ${a.ar.testo}`), a.ar.provenienza ? h('span', { class: 'piccolo provenienza-art' }, ` ${a.ar.provenienza}`) : null) : null,
      a.nonInUso ? h('p', { class: 'piccolo' }, 'Non è in mano né indossato: i suoi effetti non contano ora.') : null,
      a.attivazione ? h('p', {}, h('strong', {}, 'Attivazione: '), a.attivazione, h('span', { class: 'sigla' }, ' (§7.1.4)')) : null,
      a.riserva ? h('p', {}, puntoChroma(a.riserva.energia), h('strong', {}, 'Riserva integrata: '), `Chroma ${a.riserva.energia}, ${a.riserva.capacita} PM`,
        d.pmQui ? quadratini(a.riserva.capacita, { compatto: true }) : h('span', { class: 'sigla' }, ` — ${rimandoPM(d)}`)) : null));
}

function rigaRiserva(d, r) {
  return h('div', { class: 'riserva-art' },
    h('p', {}, casellaSi(r.sintonizzato), ' ', puntoChroma(r.energia), h('strong', {}, r.nome),
      h('span', { class: 'sigla' }, ` · ${r.energia} · ${r.capacita} PM · ${r.potenza} · occupa ${r.costo}${r.deposito ? ' · deposito comune' : ''}${d.pmQui ? '' : ` · ${rimandoPM(d)}`}`)),
    d.pmQui ? quadratini(r.capacita, { compatto: true }) : null);
}

function foglioArtefatti(d) {
  const s = d.sintonizzazione;
  return [
    box({ titolo: 'Sintonizzazione (§7.10)', classe: 'art-sintonia' },
      h('div', { class: 'art-sintonia-testa' },
        h('div', { class: 'massimo' }, h('span', {}, 'capacità'), h('span', { class: 'valore' }, String(s.capacita))),
        h('div', {},
          h('p', { class: 'piccolo' }, `${s.daGradi ?? '—'} per ${s.gradi} Grad${s.gradi === 1 ? 'o' : 'i'} complessiv${s.gradi === 1 ? 'o' : 'i'}`,
            s.talento ? `, +${s.bonusTalento} da ${s.talento}` : '',
            s.umanita ? `, ${segno(s.umanita)} per l’Umanità (§5.21${d.foglioCibernetica ? `, foglio ${d.foglioCibernetica}` : ''}).` : ', prima dell’eventuale riduzione per Umanità (§5.21).'),
          h('p', { class: 'piccolo' }, `Occupati ora: ${s.usata} (caselle piene: Artefatti segnati «sintonizzato»).`),
          quadratini(s.capacita, { compatto: true, pieni: s.usata })),
        h('ul', { class: 'elenco-sintonie-stampa' }, s.elenco.map((x) => h('li', {}, casellaSi(x.sintonizzato), ` ${x.nome} · ${x.costo}${x.deposito ? ' · deposito comune' : ''}`))))),
    h('div', { class: 'art-colonne' },
      d.schede.map((a) => schedaArtefatto(d, a)),
      d.riserve.length ? box({ titolo: 'Riserve di Chroma', classe: 'art-riserve' }, d.riserve.map((r) => rigaRiserva(d, r))) : null),
    box({ titolo: 'Note sugli Artefatti', riempitivo: true, classe: 'art-note' }, righeGuida()),
  ];
}

/**
 * Impagina il foglio Artefatti: le schede (e il riquadro delle riserve) su tre colonne bilanciate;
 * se con le Note (almeno due righe guida) la pagina non entra, le schede passano, dall'ultima, a
 * «Artefatti (continua)», che riceve anche le Note. Una scheda non si spezza.
 * @returns {number} pagine del foglio
 */
function impaginaArtefatti(foglio, d, piede) {
  const corpo = foglio.querySelector('.foglio-corpo');
  if (!eccede(corpo)) return 1;
  const colonne = corpo.querySelector('.art-colonne');
  const note = corpo.querySelector('.art-note');
  const seguito = h('div', { class: 'art-colonne' });
  const f = creaFoglio('artefatti', 'Artefatti (continua)', d, piede, () => [seguito]);
  f.classList.add('seguito');
  f.querySelector('.foglio-piede').textContent = foglio.querySelector('.foglio-piede').textContent;
  foglio.after(f);
  f.querySelector('.foglio-corpo').append(note);
  for (let giro = 0; giro < 50 && eccede(corpo) && colonne.children.length > 1; giro++) seguito.prepend(colonne.lastElementChild);
  return 2;
}

// ---------------------------------------------------------------------------
// Foglio Cibernetica (Equipaggiamento 0.5, cap. 7; Giocatore §5.21; docs/layout-ss.md): in testa
// l'Umanità (valore, quadratini con le caselle piene = UMN perduta, provenienza) e accanto la tabella
// delle fasce con la riga attuale e gli effetti attuali; poi le schede degli impianti installati per
// famiglia su tre colonne, le perdite e i recuperi, il rimando al foglio 4; in fondo le Note.

function testaCibernetica(d) {
  const u = d.umanita;
  const tabFasce = h('table', { class: 'tabella-stampa fasce-umanita' },
    h('thead', {}, h('tr', {}, ['', 'UMN', 'Caselle piene', 'Condizione', 'PM Max', 'PS Magia vs Corr.', 'Sintonizz.'].map((c) => h('th', {}, c)))),
    h('tbody', {}, u.fasce.map((f) => h('tr', { class: f.attuale ? 'attuale' : null },
      h('td', {}, casellaSi(f.attuale)), h('th', { scope: 'row' }, f.umn), h('td', {}, f.perduti), h('td', {}, f.condizione),
      h('td', {}, f.pm ? segno(f.pm) : '0'), h('td', {}, f.ps ? segno(f.ps) : '0'), h('td', {}, f.sintonizzazione ? segno(f.sintonizzazione) : '0')))));
  const effetti = [
    `PM Massimi ${u.pm ?? '—'}${u.pmUmanita ? ` (${segno(u.pmUmanita)} per l’Umanità, mai sotto ${u.pmMinimo})` : ''}`,
    u.ps ? `PS di Magia ${segno(u.ps)} solo contro la Corruzione` : null,
    u.sintonizzazione ? `Capacità di Sintonizzazione ${u.sintonizzazione.capacita}${u.sintonizzazione.riduzione ? ` (${segno(u.sintonizzazione.riduzione)}, minimo ${u.sintonizzazioneMinimo}${d.foglioArtefatti ? `, foglio ${d.foglioArtefatti}` : ''})` : ''}` : null,
    u.risorseInteriori ? null : 'a UMN 0 niente Risorse Interiori, né Tecniche che ne dipendono',
  ].filter(Boolean);
  return h('div', { class: 'cib-testa' },
    box({ titolo: 'Umanità (§5.21)', classe: 'cib-umanita' },
      h('div', { class: 'cib-umanita-testa' },
        h('div', { class: 'massimo' }, h('span', {}, 'attuale'), h('span', { class: 'valore' }, String(u.valore)), h('span', {}, `su ${u.massimo}`)),
        h('div', {},
          quadratini(u.massimo, { compatto: true, pieni: u.perduta }),
          h('p', { class: 'piccolo' }, 'Caselle piene = UMN perduta: alla prossima installazione si anneriscono da sinistra quante il costo UMN. Le bianche sono l’Umanità attuale; nessun recupero naturale.'))),
      u.provenienza ? h('p', { class: 'piccolo provenienza-art' }, u.provenienza) : null,
      h('p', {}, h('strong', {}, `${u.condizione}: `), effetti.join(' · '), '.')),
    box({ titolo: 'Fasce di Umanità', classe: 'cib-fasce' }, tabFasce,
      h('p', { class: 'piccolo' }, 'Vale soltanto la fascia del valore attuale. PM Massimi mai sotto 1; Sintonizzazione mai sotto 0; a UMN 0 niente Risorse Interiori.')));
}

function schedaImpianto(d, a, famiglia) {
  return h('article', { class: 'scheda-artefatto scheda-impianto riquadro-stampa' },
    h('h2', {}, a.nome, h('span', { class: 'sigla' }, ` · UMN ${a.umn}${a.paragrafo ? ` · ${a.paragrafo}` : ''}`)),
    h('div', { class: 'contenuto' },
      h('p', { class: 'sigla' }, famiglia),
      a.breve && !a.effetti.length ? h('p', {}, a.breve) : null,
      a.effetti.length ? h('p', {}, h('strong', {}, 'Effetti: '), a.effetti.join(' · ')) : null,
      a.scartati.length ? h('p', { class: 'piccolo' }, `Non si somma con un beneficio equivalente già attivo (§7.1): ${a.scartati.join(' · ')}.`) : null,
      a.sin ? h('p', { class: 'piccolo' }, 'Armi e dispositivi con SIN: bonus della loro scheda (foglio 3).') : null,
      a.cartucce ? h('p', { class: 'piccolo' }, `Cartucce ${a.cartucce}, vendute a parte (§7.9).`) : null,
      a.chip ? h('div', { class: 'chip-stampa' }, h('p', {}, h('strong', {}, 'Chip: '), a.chip.length ? a.chip.map((c, i) => [i ? ' · ' : null, casellaSi(c.inserito), ` ${c.nome}`]) : 'nessuno'),
        h('p', { class: 'piccolo' }, `Uno alla volta, ${d.chipDurata ?? 30} minuti, una attivazione ogni ${d.chipIntervallo ?? 24} ore; non per combattimento, Incantesimi, Risorse Interiori e Sintonizzazione (§7.10). Ultima attivazione: ________`)) : null,
      a.piMax ? h('div', { class: 'pi-inv' }, h('span', { class: 'etichetta-colpi' }, 'PI'), quadratini(a.piMax, { compatto: true }),
        h('span', { class: 'sigla' }, ` PS Integrità ${a.ps ?? '—'}`)) : null));
}

function foglioCibernetica(d) {
  const schede = d.gruppi.flatMap((g) => g.schede.map((a) => schedaImpianto(d, a, g.famiglia)));
  const stati = { installato: 'installato', tolto: 'tolto: la perdita resta', assente: 'non più nell’inventario: la perdita resta' };
  return [
    testaCibernetica(d),
    h('div', { class: 'art-colonne cib-colonne' },
      schede.length ? schede : box({ titolo: 'Impianti installati' }, h('p', {}, 'Nessun impianto installato.')),
      box({ titolo: 'Perdite e recuperi di Umanità', classe: 'cib-perdite' },
        d.perdite.length ? h('ul', { class: 'elenco-sintonie-stampa' }, d.perdite.map((p) => h('li', {}, h('strong', {}, `−${p.umn}`), ` ${p.nome} · ${stati[p.stato]}`))) : h('p', {}, 'Nessuna perdita registrata.'),
        d.recuperi.length ? h('ul', { class: 'elenco-sintonie-stampa' }, d.recuperi.map((x) => h('li', {}, h('strong', {}, `+${x.punti}`), ` ${x.nota || 'recupero concesso dal Direttore'}`))) : null,
        h('p', { class: 'piccolo' }, `Impianti non installati, chip e PI: foglio ${d.foglioInventario ?? 4} (Inventario). Installazione in una struttura medica attrezzata, a parte (§7.1).`))),
    box({ titolo: 'Note sulla cibernetica', riempitivo: true, classe: 'art-note cib-note' }, righeGuida()),
  ];
}

/**
 * Impagina il foglio Cibernetica come il foglio Artefatti: se con le Note la pagina non entra, le
 * schede passano, dall'ultima, a «Cibernetica (continua)», che riceve anche le Note. Se senza le Note
 * tutto entra, le Note si tolgono: niente pagina con le sole righe guida.
 */
function impaginaCibernetica(foglio, d, piede) {
  const corpo = foglio.querySelector('.foglio-corpo');
  if (!eccede(corpo)) return 1;
  const colonne = corpo.querySelector('.cib-colonne');
  const note = corpo.querySelector('.cib-note');
  note.remove();
  if (!eccede(corpo)) return 1;
  const seguito = h('div', { class: 'art-colonne cib-colonne' });
  const f = creaFoglio('cibernetica', 'Cibernetica (continua)', d, piede, () => [seguito]);
  f.classList.add('seguito');
  f.querySelector('.foglio-piede').textContent = foglio.querySelector('.foglio-piede').textContent;
  foglio.after(f);
  f.querySelector('.foglio-corpo').append(note);
  for (let giro = 0; giro < 50 && eccede(corpo) && colonne.children.length > 1; giro++) seguito.prepend(colonne.lastElementChild);
  return 2;
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
    r.piMax || r.condizioni || r.nec?.length ? h('tr', { class: 'riga-pi' }, h('td', { colspan: n },
      r.piMax ? h('div', { class: 'pi-inv' }, h('span', { class: 'etichetta-colpi' }, 'PI'), quadratini(r.piMax, { compatto: true })) : null,
      // NEC (Equipaggiamento §5.4): riserva a quadratini, una casella per unità o per decimo della riserva
      (r.nec ?? []).map((x) => h('div', { class: 'pi-inv nec-inv' }, h('span', { class: 'etichetta-colpi' }, x.etichetta), quadratini(x.caselle, { compatto: true }),
        h('span', { class: 'sigla' }, x.perCasella === 1 ? ` ${x.massimo} ${x.unita}` : ` 1 casella = ${x.perCasella.toLocaleString('it-IT')} ${x.unita} (${x.massimo.toLocaleString('it-IT')} ${x.unita})`))),
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
// Foglio 5 — Poteri (docs/layout-ss.md, pezzo 4 e ritocchi post-stampa). Prima pagina con tutto il
// «di base» su due colonne: a sinistra Punti Magia (quadratini a righe lunghe), batterie e riserve
// di Chroma, Lancio su righe compatte e il rimando agli Artefatti; a destra, a tutta altezza,
// l'elenco degli incantesimi conosciuti (una riga ciascuno, tinta della macrofamiglia, numero di
// scheda). Se l'elenco non entra continua sotto la colonna sinistra e solo in ultimo su «5 (segue)».
// Poi, con «Elenco e schede complete», una scheda per incantesimo con il testo completo,
// nell'ordine dell'elenco, in tre colonne; una scheda non si spezza se entra in una colonna.

const tintaMacro = (m) => COLORI_MACROFAMIGLIE[m] ?? null;
const elencoIncantesimi = (d) => d.macrofamiglie.flatMap((m) => m.specializzazioni.flatMap((sp) =>
  sp.incantesimi.map((i) => ({ ...i, macrofamiglia: i.macrofamiglia ?? m.nome, specializzazione: sp.nome }))));

const COLONNE_ELENCO = ['Incantesimo', 'Liv.', 'PM', 'Gittata', 'Durata', 'Scheda'];

/** Riga dell'elenco: intestazione della macrofamiglia o incantesimo (righeElencoIncantesimi in src/stampa.js). */
function rigaIndice(r, { continua = false } = {}) {
  if (r.tipo === 'macro') {
    return h('tr', { class: `macro-riga tinta-${r.tinta}`, dataset: { macro: r.nome } },
      h('th', { colspan: COLONNE_ELENCO.length, scope: 'rowgroup' }, `${r.nome}${continua ? ' (continua)' : ` · ${r.numero}`}`));
  }
  return h('tr', { class: `tinta-${r.tinta}`, dataset: { macro: r.macrofamiglia } },
    h('th', { scope: 'row' }, r.nome), h('td', { class: 'centro' }, String(r.livello)), h('td', { class: 'centro' }, r.pm),
    h('td', {}, r.gittata), h('td', {}, r.durata), h('td', { class: 'centro' }, r.scheda));
}

const tabellaIndice = (righe) => h('table', { class: 'tabella-stampa indice-magia' },
  h('thead', {}, h('tr', {}, COLONNE_ELENCO.map((c) => h('th', {}, c)))),
  h('tbody', {}, righe));

/** Righe tolte da un elenco e messe in un altro: si apre con l'intestazione della macrofamiglia («continua»). */
function conIntestazione(righe, macrofamiglie) {
  const prima = righe[0];
  if (!prima || prima.classList.contains('macro-riga')) return righe;
  const m = macrofamiglie.find((x) => x.nome === prima.dataset.macro);
  return [rigaIndice({ tipo: 'macro', nome: prima.dataset.macro, tinta: tintaMacro(m?.nome ?? prima.dataset.macro) }, { continua: true }), ...righe];
}

/** Righe di un elenco che escono dal fondo del contenitore; un'intestazione rimasta sola le segue. */
function righeOltre(tbody, contenitore) {
  const fondo = contenitore.getBoundingClientRect().bottom - 0.5;
  const righe = [...tbody.rows];
  let k = righe.findIndex((r) => r.getBoundingClientRect().bottom > fondo);
  if (k < 0) return [];
  if (k > 0 && righe[k - 1].classList.contains('macro-riga')) k--;
  return righe.slice(k);
}

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
  const incantesimi = elencoIncantesimi(d);
  const med = d.meditazione;
  // etichetta: valore, due per riga; le voci lunghe prendono la riga intera
  const voce = (nome, ...valore) => {
    const testo = [nome, ...valore].map((x) => (typeof x === 'string' ? x : x?.textContent ?? '')).join(' ');
    return h('div', { class: `f5-voce${testo.length > 38 ? ' intera' : ''}` }, h('span', { class: 'f5-etichetta' }, `${nome}:`), ' ', ...valore);
  };
  const conversione = d.conversione ? [`Conv. Potere e ricarica: ${d.conversione.rapporto}:1`,
    d.conversione.talenti.length ? ` (${d.conversione.talenti.join(' e ')})` : '',
    Object.keys(d.conversione.fissi).length ? `; ${Object.entries(d.conversione.fissi).map(([c, n]) => `${c} ${n}:1`).join(', ')} nei due sensi` : '', '.'].join('') : null;
  return h('div', { class: 'f5-griglia' },
    h('div', { class: 'colonna f5-sinistra' },
      box({ titolo: 'Punti Magia', tinta: 'pm', forte: true, classe: 'f5-pm' },
        h('div', { class: 'f5-pm-testa' },
          h('div', { class: 'massimo' }, h('span', {}, 'massimi'), h('span', { class: 'valore' }, String(d.pm ?? '—'))),
          // Magia sez. 6: recupero con la Meditazione, come nel riquadro della SD
          med ? h('span', {}, `Recupero (Meditaz.): ${med.pmPerOra} PM/ora, ${med.orePerGiorno} ${med.orePerGiorno === 1 ? 'ora' : 'ore'}/g.`) : null),
        h('p', { class: 'piccolo' }, 'attuali'),
        // come i PV del foglio 3: righe da 25, stacco ogni 5, almeno due righe e sempre una riga grigia
        d.pm ? quadratini(d.pm, { compatto: true, perRiga: 25, righeInPiu: Math.max(1, 2 - Math.ceil(d.pm / 25)) }) : null),
      // decisione 5: batterie e riserve di Chroma con i PM qui (il foglio Artefatti ha la sola sintonizzazione)
      // abbreviazioni solo sulla carta (abbreviaSS): «Batt. 5 PM (Chroma R.)»; l'energia resta per intero nella sigla
      d.riserve?.length ? box({ titolo: 'Batt. e riserve di Chroma (Magia sez. 6)', classe: 'f4-riserve f5-riserve' },
        d.riserve.map((r) => h('div', { class: 'f5-riserva' },
          h('span', { class: `chroma-punto chroma-${String(r.energia).toLowerCase()}`, 'aria-hidden': 'true' }),
          h('span', { class: 'f5-riserva-nome' }, h('strong', {}, abbreviaSS(r.nome)),
            h('span', { class: 'sigla' }, abbreviaSS(` · ${r.energia} · ${r.integrato ? 'attivazioni (A.18)' : r.regoleRimandate ? 'regole rimandate' : r.macrofamiglie.length >= 3 ? 'tutte le macrofamiglie' : r.macrofamiglie.join(', ') || '—'} · ${r.sintonizzato ? 'sintonizzato' : 'da sintonizzare'} (${r.costo})`))),
          quadratini(r.capacita, { compatto: true }))),
        conversione ? h('p', { class: 'piccolo f5-conversione' }, conversione) : null) : null,
      box({ titolo: 'Lancio', classe: 'f5-lancio' },
        h('div', { class: 'f5-voci' },
          voce('Potere per lanciare', h('strong', {}, `VA ${v.potere ?? '—'}`), d.lancio ? ` (armatura ${segno(d.lancio.penalita)}, §7.11.1)` : ''),
          voce('Armi da lancio', `${segno(v.armiDaLancio)} negli Incant.`),
          voce('Focalizz.', `${segno(v.focalizzazione)} a Potere (1 AzP prima)`),
          voce('Ingaggio', `${segno(v.ingaggio)} a Potere, Prova sempre`),
          voce('Anticip.', `PM ×${v.anticipazione}, Potere più diff. di una categ.`),
          voce('Incant.', `conosciuti ${d.conosciuti} / ${d.quota} · liv. max ${d.livelloMassimo}`),
          // Magia sez. 1, come nel riquadro Incantesimi della SD
          d.gradi ? voce('Gradi taum.', d.gradi.testo) : null),
        // scala della Prova di Potere in verticale: stretta in larghezza, più lunga in altezza
        h('table', { class: 'tabella-stampa scala scala-verticale' },
          h('thead', {}, h('tr', {}, h('th', {}, `Livello (${d.scalaPotere})`), h('th', {}, 'Prova di Potere'))),
          h('tbody', {}, d.scala.map((r) => h('tr', {}, h('td', {}, r.livelli), h('td', {}, r.prova)))))),
      h('div', { class: 'f5-coda' },
        d.daArtefatti?.length ? h('p', { class: 'da-artefatti-stampa' }, h('strong', {}, 'Da artefatti: '), `${d.daArtefatti.join(', ')}${d.foglioArtefatti ? ` — vedi foglio ${d.foglioArtefatti}` : ''}.`) : null,
        d.soloElenco && incantesimi.length ? notaSoloElenco() : null)),
    box({ titolo: `Incantesimi conosciuti (${incantesimi.length})`, classe: 'f4-indice f5-elenco' },
      incantesimi.length ? tabellaIndice(righeElencoIncantesimi(d.macrofamiglie).map((r) => rigaIndice(r))) : h('p', {}, 'Nessun incantesimo scelto.')));
}

/**
 * Elenco della prima pagina del foglio 5: le righe oltre il fondo della colonna destra continuano
 * sotto la colonna sinistra («Incantesimi (continua)»); quelle che non entrano neanche lì passano a
 * «5 (segue)». Il carattere non si riduce.
 * @returns {HTMLTableRowElement[]} righe per la pagina dopo
 */
function impaginaElenco(foglio, d) {
  const elenco = foglio.querySelector('.f5-elenco');
  const tbody = elenco?.querySelector('.indice-magia tbody');
  if (!tbody) return [];
  const fuori = righeOltre(tbody, elenco.querySelector(':scope > .contenuto'));
  if (!fuori.length) return [];
  fuori.forEach((r) => r.remove());
  const sinistra = foglio.querySelector('.f5-sinistra');
  const tabella2 = tabellaIndice(conIntestazione(fuori, d.macrofamiglie));
  const seguito = box({ titolo: 'Incantesimi (continua)', classe: 'f5-elenco-seguito' }, tabella2);
  sinistra.insertBefore(seguito, sinistra.querySelector(':scope > .f5-coda'));
  const resto = righeOltre(tabella2.tBodies[0], seguito.querySelector(':scope > .contenuto'));
  resto.forEach((r) => r.remove());
  // un seguito senza incantesimi non serve: tutto alla pagina dopo
  if (!tabella2.querySelector('tbody tr:not(.macro-riga)')) {
    seguito.remove();
    return conIntestazione(fuori, d.macrofamiglie);
  }
  return conIntestazione(resto, d.macrofamiglie);
}

/**
 * Impagina il foglio Magia: righe dell'indice che non entrano nella prima pagina e schede degli
 * incantesimi su pagine successive, riempite misurando nel DOM. Le schede si impaginano sempre,
 * per contare le pagine che aggiungono; con «Solo elenco» (d.soloElenco) poi si tolgono.
 * @returns {{ pagine, pagineSchede }} pagine stampate e pagine che aggiungono le schede complete
 */
function impaginaMagia(contenitore, foglio, d, piede) {
  const incantesimi = elencoIncantesimi(d);
  // 1. elenco: colonna destra, poi sotto la colonna sinistra, poi la pagina dopo
  const resto = impaginaElenco(foglio, d);
  if (!incantesimi.length) return { pagine: 1, pagineSchede: 0 };
  // la nota di «Solo elenco» va in fondo all'elenco: se l'elenco continua, la porta la pagina dopo
  if (resto.length) foglio.querySelector('.f5-coda .nota-solo-elenco')?.remove();

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
