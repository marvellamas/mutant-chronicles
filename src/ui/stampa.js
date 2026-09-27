// Vista di stampa dedicata (#/p/<id>/stampa), la SS: fogli A4 orizzontali, separati dalla
// vista digitale (docs/roadmap-equipaggiamento-e-scheda.md, §2.2). I contenuti vengono da
// preparaStampa() (src/stampa.js); qui solo HTML e impaginazione. Regole comuni (css/stampa.css):
// il carattere non si riduce mai (--ss-font, --ss-font-small); i riempitivi prendono lo spazio che
// resta; se un foglio 1–3 non entra lo si segnala nella barra, senza rimpicciolire il testo.
import { h, segno } from './dom.js';
import { stemma, iconaPagina } from './immagini.js';
import { pallini } from './tooltip.js';
import { crediti } from '../dotazioni.js';

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

const corpi = { identita: foglioIdentita, abilita: foglioAbilita, combattimento: foglioCombattimento, magia: foglioMagia };

function creaFoglio(id, titolo, dati, piede, corpo = corpi[id]) {
  return h('section', { class: `foglio foglio-${id}`, 'aria-label': titolo },
    h('div', { class: 'pagina' },
      h('header', { class: 'foglio-testa' },
        // badge della pagina accanto al titolo (un <img>: si stampa anche senza «grafica di sfondo»)
        h('span', { class: 'foglio-titolo' }, iconaPagina(id, '96', { classe: 'badge-foglio', lato: 48 }), titolo),
        h('span', { class: 'foglio-nome' }, piede.nome)),
      id === 'identita' && dati.corporazione ? h('div', { class: 'filigrana', 'aria-hidden': 'true' }, stemma(dati.corporazione, '512', { alt: '' })) : null,
      h('div', { class: 'foglio-corpo' }, corpo(dati)),
      h('footer', { class: 'foglio-piede' })));
}

/** Scrive «foglio N di M» in tutti i piè di pagina, dopo la divisione del foglio Magia. */
function numeraPiedi(contenitore, piede) {
  const fogli = [...contenitore.querySelectorAll('.foglio')];
  fogli.forEach((f, i) => {
    f.querySelector('.foglio-piede').textContent =
      `${piede.nome} · ${piede.livello}° livello · foglio ${i + 1} di ${fogli.length}${piede.versioni ? ` · Dati: ${piede.versioni}` : ''}`;
  });
}

const trabocca = (el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
/** Il corpo del foglio o un riquadro (che taglia il contenuto) non contiene tutto. */
const eccede = (corpo) => trabocca(corpo) || [...corpo.querySelectorAll('.riquadro-stampa, .riquadro-stampa > .contenuto')].some(trabocca);

/**
 * @param {object} o { stampa: risultato di preparaStampa, torna() }
 * @returns {Node[]} nodi da mettere nella pagina; l'impaginazione parte da sola dopo il caricamento dello stile
 */
export function renderStampa({ stampa, torna }) {
  document.body.classList.add('vista-stampa');
  const avvisi = h('div', { class: 'barra-avvisi' });
  const barra = h('div', { class: 'barra-stampa' },
    h('button', { type: 'button', class: 'btn primario', onclick: () => window.print() }, 'Stampa'),
    h('button', { type: 'button', class: 'btn', onclick: torna }, 'Torna alla scheda'),
    h('span', { class: 'nota' }, 'A4 orizzontale. Per il PDF scegli «Salva come PDF» come stampante e attiva «Grafica di sfondo».'),
    avvisi);
  if (!stampa.fogli.length) {
    return [barra, h('p', { class: 'nota errore' }, 'La scheda non si può calcolare: correggi prima le scelte segnalate nella vista digitale.')];
  }
  if (!stampa.completa) avvisi.append(h('p', {}, 'Scheda non ancora completa: alcuni valori possono mancare.'));

  const contenitore = h('div', { class: 'fogli' }, stampa.fogli.map((f) => creaFoglio(f.id, f.titolo, f.dati, stampa.piede)));
  numeraPiedi(contenitore, stampa.piede);
  caricaStile().then(() => (document.fonts?.ready ?? Promise.resolve())).then(() => {
    const fuori = [];
    for (const f of [...contenitore.querySelectorAll('.foglio')]) {
      if (f.classList.contains('foglio-magia')) {
        const pagine = impaginaMagia(contenitore, f, stampa.fogli.find((x) => x.id === 'magia').dati, stampa.piede);
        if (pagine > 1) avvisi.append(h('p', {}, `Il foglio Magia è su ${pagine} pagine.`));
        continue;
      }
      riempiRighe(f);
      if (eccede(f.querySelector('.foglio-corpo'))) fuori.push(f.querySelector('.foglio-titolo').textContent);
    }
    numeraPiedi(contenitore, stampa.piede);
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
const riquadro = (titolo, ...contenuto) => box({ titolo }, ...contenuto);
const caselle = (n, classe = '') => h('span', { class: `caselle ${classe}` }, Array.from({ length: n }, () => h('span', { class: 'casella' })));
const righeVuote = (n) => h('div', { class: 'righe-vuote' }, Array.from({ length: n }, () => h('div', { class: 'riga-vuota' })));

/**
 * Quadratini da segnare a matita: file da 10 con uno stacco ogni 5 e il numero progressivo a
 * destra (10, 20, 30…). `piu` aggiunge una fila in più, vuota.
 */
function quadratini(n, { piu = false, perFila = 10 } = {}) {
  const fila = (da, quanti, inPiu) => h('div', { class: `fila-quadratini${inPiu ? ' in-piu' : ''}` },
    Array.from({ length: quanti }, (_, i) => [i && i % 5 === 0 ? h('span', { class: 'stacco' }) : null, h('span', { class: 'casella' })]),
    h('span', { class: 'progressivo' }, String(da + quanti)));
  const file = [];
  for (let da = 0; da < n; da += perFila) file.push(fila(da, Math.min(perFila, n - da), false));
  if (piu) file.push(fila(n, perFila, true));
  return h('div', { class: 'quadratini' }, file);
}

/** Fila di quadratini senza numeri (colpi di un caricatore): stacco ogni 5. */
const filaCaselle = (n) => h('span', { class: 'fila-quadratini' },
  Array.from({ length: n }, (_, i) => [i && i % 5 === 0 ? h('span', { class: 'stacco' }) : null, h('span', { class: 'casella' })]));

/** Righe guida a matita: lo sfondo del riempitivo. */
const righeGuida = () => h('div', { class: 'righe-guida' });

/** Righe da penna generate in abbondanza e tagliate a misura (riempiRighe). */
const righeDaPenna = (n, riga) => h('div', { class: 'riempi-righe' },
  Array.from({ length: n }, (_, i) => { const r = riga(i); r.dataset.vuota = '1'; return r; }));

function tabella(colonne, righe, { classe = '', vuote = 0 } = {}) {
  return h('table', { class: `tabella-stampa ${classe}` },
    h('thead', {}, h('tr', {}, colonne.map((c) => h('th', {}, c)))),
    h('tbody', {},
      righe.map((r) => h('tr', {}, r.map((v, i) => (i === 0 ? h('th', { scope: 'row' }, v) : h('td', {}, v))))),
      Array.from({ length: vuote }, () => h('tr', { class: 'da-compilare' }, colonne.map(() => h('td', {}, ' '))))));
}

// ---------------------------------------------------------------------------
// Foglio 1 — Identità: nome e anagrafica in alto, Caratteristiche in grande, poi Punti Eroe,
// Segni distintivi (un quadratino per riga) e il Background come riempitivo.

function foglioIdentita(d) {
  const campi = d.anagrafica.filter((x) => x.campo !== 'segniDistintivi');
  const segni = d.anagrafica.find((x) => x.campo === 'segniDistintivi')?.valore ?? '';
  const righeSegni = segni ? segni.split(/\n+|;\s*/).map((x) => x.trim()).filter(Boolean) : [];
  return [
    h('div', { class: 'f1-testa' },
      h('div', { class: 'f1-nome' },
        h('h1', {}, d.nome),
        h('p', {}, h('strong', {}, `${d.livello}° livello`), ` · ${d.corporazione} · ${d.addestramento}`),
        h('p', {}, d.classi.map((c) => `${c.nome} ${c.grado}`).join(' · '))),
      h('dl', { class: 'f1-anagrafica' },
        [...campi, { etichetta: 'PX', valore: d.puntiEsperienza === null ? '' : String(d.puntiEsperienza) }].map((x) =>
          h('div', { class: 'campo-anagrafica' }, h('dt', {}, x.etichetta), h('dd', {}, x.valore || ' '))))),
    box({ titolo: 'Caratteristiche', tinta: 'accento', forte: true, classe: 'f1-caratteristiche' },
      h('div', { class: 'tessere' }, d.caratteristiche.map((c) => h('div', { class: 'tessera' },
        h('span', { class: 'sigla-car' }, c.sigla), h('span', { class: 'nome-car' }, c.nome),
        h('span', { class: 'valore-car' }, String(c.valore)),
        h('span', { class: 'mod-car' }, h('span', {}, 'Mod ', h('strong', {}, segno(c.mod))), h('span', {}, 'Salv. ', h('strong', {}, segno(c.modSalvezza)))))))),
    h('div', { class: 'f1-basso' },
      h('div', { class: 'colonna' },
        box({ titolo: 'Punti Eroe', tinta: 'pe' },
          h('p', {}, d.puntiEroe.valore === null ? 'Iniziali: da determinare' : `Iniziali ${d.puntiEroe.valore} · riserva massima ${d.puntiEroe.massimo}`),
          quadratini(d.puntiEroe.massimo)),
        box({ titolo: 'Vantaggio dell’Addestramento' }, h('p', {}, h('strong', {}, `${d.vantaggio.nome}. `), d.vantaggio.testo)),
        d.annotazioni.length ? box({ titolo: 'Note' }, h('ul', {}, d.annotazioni.map((x) => h('li', {}, x)))) : null,
        box({ titolo: 'Segni distintivi', riempitivo: true },
          righeDaPenna(Math.max(30, righeSegni.length), (i) => h('div', { class: 'riga-da-penna' },
            h('span', { class: 'casella' }), h('span', { class: 'testo' }, righeSegni[i] ?? ''))))),
      box({ titolo: 'Background', riempitivo: true, classe: 'f1-background' },
        d.background ? h('p', { class: 'testo-background' }, d.background) : null,
        d.backgroundTroncato ? h('p', { class: 'piccolo' }, 'Testo completo nella scheda digitale.') : null,
        righeGuida())),
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
        h('th', { scope: 'row' }, `${a.nome} `, h('span', { class: 'sigla' }, a.caratteristica), a.diClasse ? ' •' : null),
        h('td', {}, segno(a.mod)), h('td', {}, String(a.base)), h('td', {}, String(a.corporazione)),
        h('td', {}, String(a.avanzamento)), h('td', { title: a.equip ? 'Equipaggiamento indossato (§7.11.1)' : null }, a.equip ? segno(a.equip) : '0'),
        h('td', { class: 'va' }, String(a.va)))))));
  const talento = (t, dettagli) => h('li', {}, h('strong', {}, t.nome), dettagli, ` — ${t.frase}`);
  return h('div', { class: 'f2-griglia' },
    box({ titolo: 'Abilità', tinta: 'accento', forte: true, classe: 'f2-abilita' },
      h('div', { class: 'abilita-affiancate' }, tabellaAbilita(d.categorie.slice(0, meta)), tabellaAbilita(d.categorie.slice(meta))),
      h('p', { class: 'piccolo' }, `• Abilità di Classe. VA = Mod + Base + Corp + Avanz + Equip (equipaggiamento indossato). Avanzamento massimo: ${d.limiteAvanzamento ?? '—'}.`)),
    h('div', { class: 'colonna' },
      box({ titolo: 'Talenti di Classe' }, h('ul', { class: 'elenco-talenti-stampa' }, d.talentiClasse.map((t) =>
        talento(t, h('span', { class: 'sigla' }, ` ${t.classe} ${t.grado}${t.scelto ? ', a scelta' : ''}`))))),
      d.talentiLiberi.length ? box({ titolo: 'Talenti Liberi' }, h('ul', { class: 'elenco-talenti-stampa' }, d.talentiLiberi.map((t) =>
        talento(t, [t.parametro ? ` (${t.parametro})` : null, t.annotazione ? ` — ${t.annotazione}` : null,
          h('span', { class: 'sigla' }, ` ${t.livello}° liv.`), t.provvisorio ? h('em', {}, ' provvisorio') : null])))) : null,
      box({ titolo: 'Annotazioni', riempitivo: true }, righeGuida())));
}

// ---------------------------------------------------------------------------
// Foglio 3 — Combattimento

function foglioCombattimento(d) {
  return h('div', { class: 'griglia-combattimento' },
    riquadro('Armi', tabella(d.armi.colonne, d.armi.righe, { classe: 'da-penna', vuote: d.armi.righeVuote })),
    h('div', { class: 'colonna' },
      riquadro('Protezioni', tabella(d.protezioni.colonne, d.protezioni.righe, { classe: 'da-penna', vuote: d.protezioni.righeVuote })),
      d.difese ? riquadro('Difese', h('p', {}, `VA ${d.difese.va} `, h('span', { class: 'sigla' }, `(${d.difese.caratteristica})`))) : null,
      riquadro('Punti Vita', h('p', {}, `max ${d.pv} · attuali `, h('span', { class: 'casella-lunga' })))),
    h('div', { class: 'colonna' },
      riquadro('Ferite (§5.14)',
        h('table', { class: 'tabella-stampa ferite' },
          h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Stato'), h('th', {}, 'VA e PS'), h('th', {}, 'Menomazione'))),
          h('tbody', {}, d.ferite.stati.map((f) => h('tr', {},
            h('td', {}, h('span', { class: 'casella' })), h('th', { scope: 'row' }, f.nome), h('td', {}, segno(f.penalita)), h('td', { class: 'piccolo' }, f.menomazione ?? ''))),
          h('tr', {}, h('td', {}, h('span', { class: 'casella' })), h('th', { scope: 'row' }, 'Oltre Grave'), h('td', { colspan: 2 }, d.ferite.oltre))))),
      riquadro('Stati (§5.18)',
        h('ul', { class: 'stati-stampa' }, d.stati.map((s) => h('li', {},
          h('span', { class: 'casella' }), h('span', {}, h('strong', {}, s.nome), h('br', {}), h('span', { class: 'piccolo' }, s.durata)),
          h('span', { class: 'round' }, 'Round ', h('span', { class: 'casella-lunga corta' }))))))),
    h('div', { class: 'colonna' },
      riquadro('Equipaggiamento',
        h('p', { class: 'crediti-stampa' }, h('strong', {}, 'Crediti '), h('span', { class: 'casella-lunga' }),
          d.creditiIniziali !== null ? h('span', { class: 'piccolo' }, ` saldo iniziale ${crediti(d.creditiIniziali)}`) : null),
        d.equipaggiamento.length ? h('ul', { class: 'equip-stampa' }, d.equipaggiamento.map((x) => h('li', {}, x))) : null,
        d.equipaggiamentoTroncato ? h('p', { class: 'piccolo' }, 'Elenco completo nella scheda digitale.') : null,
        righeVuote(Math.max(3, 12 - d.equipaggiamento.length)))));
}

// ---------------------------------------------------------------------------
// Foglio 4 — Magia

function foglioMagia(d) {
  // nelle pagine di continuazione (spezzaMagia) l'intestazione del foglio non si ripete
  return [
    d.continuazione ? null : h('div', { class: 'testa-magia' },
      riquadro('Punti Magia', h('p', { class: 'valore-grande' }, `max ${d.pm ?? '—'}`), h('div', { class: 'casella-grande' }, h('span', {}, 'attuali')),
        d.lancio ? h('p', { class: 'piccolo' }, h('strong', {}, `Potere per lanciare ${d.lancio.va}`), ` (armatura ${segno(d.lancio.penalita)}, §7.11.1)`) : null),
      riquadro('Incantesimi',
        h('p', {}, `Conosciuti ${d.conosciuti} / ${d.quota}`),
        h('p', {}, h('strong', {}, `Livello massimo: ${d.livelloMassimo}`))),
      riquadro(`Prove di Potere (scala ${d.scalaPotere})`,
        h('table', { class: 'tabella-stampa scala' },
          h('tbody', {},
            h('tr', {}, h('th', {}, 'Livello'), d.scala.map((r) => h('td', {}, r.livelli))),
            h('tr', {}, h('th', {}, 'Prova'), d.scala.map((r) => h('td', {}, r.prova))))))),
    !d.continuazione && d.riserve?.length ? riquadro('Riserve esterne (Magia sez. 6)',
      h('table', { class: 'tabella-stampa riserve' },
        h('thead', {}, h('tr', {}, ['Contenitore', 'Chroma', 'Alimenta', 'Sint.', 'PM attuali'].map((c) => h('th', {}, c)))),
        h('tbody', {}, d.riserve.map((r) => h('tr', {},
          h('td', {}, r.nome, r.integrato ? h('span', { class: 'sigla' }, ' (integrata)') : null),
          h('td', {}, r.energia),
          h('td', {}, r.integrato ? 'attivazioni (A.18)' : r.regoleRimandate ? 'regole rimandate' : r.macrofamiglie.length >= 3 ? 'tutte' : r.macrofamiglie.join(', ') || '—'),
          h('td', {}, r.sintonizzato ? `✔ ${r.costo}` : `○ ${r.costo}`),
          // una casella per PM fino a 25; oltre, una riga da compilare
          h('td', {}, r.capacita <= 25 ? caselle(r.capacita, 'piccole') : [h('span', { class: 'casella-lunga corta' }), ` / ${r.capacita}`])))))) : null,
    h('div', { class: 'colonne-incantesimi' },
      d.macrofamiglie.length ? d.macrofamiglie.map((m) => [
        h('h2', { class: 'macro' }, m.nome, m.continua ? h('span', { class: 'sigla' }, ' (continua)') : null),
        m.specializzazioni.map((sp) => [
          h('h3', { class: 'spec' }, sp.nome, sp.continua ? ' (continua)' : null),
          sp.incantesimi.map((i) => h('article', { class: 'incantesimo-stampa' },
            h('h4', {}, i.nome, ' ', pallini(i.livelloBase), h('span', { class: 'sigla' }, ` · livello base ${i.livelloBase}`)),
            i.intestazione ? h('p', { class: 'piccolo' }, i.intestazione) : null,
            i.lancio ? h('p', {}, i.lancio) : null,
            i.righe.length ? tabella(i.colonne, i.righe, { classe: 'versioni' })
              : h('p', { class: 'piccolo' }, `Tabella: Manuale della Magia, scheda ${i.scheda}.`))),
        ]),
      ]) : h('p', {}, 'Nessun incantesimo scelto.')),
  ];
}

/** Foglio Magia: per ora una pagina, con l'avviso se non entra (l'impaginazione è del foglio 4). */
function impaginaMagia(contenitore, foglio) {
  riempiRighe(foglio);
  return 1;
}
