// Vista di stampa dedicata (#/p/<id>/stampa), la SS: fogli A4 orizzontali, separati dalla
// vista digitale (docs/roadmap-equipaggiamento-e-scheda.md, §2.2). I contenuti vengono da
// preparaStampa() (src/stampa.js); qui solo HTML e impaginazione. Regole comuni (css/stampa.css):
// il carattere non si riduce mai (--ss-font, --ss-font-small); i riempitivi prendono lo spazio che
// resta; se un foglio 1–3 non entra lo si segnala nella barra, senza rimpicciolire il testo.
import { h, segno } from './dom.js';
import { stemma, iconaPagina } from './immagini.js';
import { pallini } from './tooltip.js';
import { crediti } from '../dotazioni.js';
import { COLORI_MACROFAMIGLIE } from '../palette.js';

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
      id === 'identita' && dati.corporazione ? h('div', { class: 'filigrana-stampa', 'aria-hidden': 'true' }, stemma(dati.corporazione, '512', { alt: '' })) : null,
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
// Foglio 3 — Combattimento ed equipaggiamento: in alto il riquadro compatto (Iniziativa,
// Movimento, Azioni, Difese, Prove Salvezza); poi le Armi con tutte le colonne e le file dei
// colpi; sotto Protezioni ed Equipaggiamento, Ferite e Stati, Punti Vita (riempitivo).

const COLONNE_ARMI = [
  ['nome', 'Arma'], ['abilita', 'Abilità'], ['va', 'VA'], ['danno', 'Danno'], ['ac', 'AC'], ['gittata', 'Gittata / portata'],
  ['inc', 'INC'], ['parata', 'Parata'], ['mani', 'Mani'], ['forza', 'FOR'], ['pi', 'PI'], ['qualita', 'Qualità'],
  ['capacita', 'Cap.'], ['modalita', 'Modalità'], ['proprieta', 'Proprietà'],
];

/**
 * Colpi sotto l'arma: un gruppo di quadratini per caricatore (etichetta «car. N») o per cella;
 * «colpi» per le armi a inserimento. I gruppi si affiancano quando entrano, con uno stacco largo,
 * e vanno a capo quando non entrano (un caricatore da 30 occupa una fila).
 */
function fileColpi(c, pi = []) {
  const etichetta = !c ? null : c.modo === 'inserimento' ? () => 'colpi' : c.modo === 'cella' ? (k) => `cella ${k}` : (k) => `car. ${k}`;
  return h('div', { class: 'file-colpi' },
    c ? Array.from({ length: c.file }, (_, k) => h('div', { class: 'caricatore' },
      h('span', { class: 'etichetta-colpi' }, etichetta(k + 1)), filaCaselle(c.capacita))) : null,
    pi.map(gruppoPI));
}

/**
 * PI da annerire a matita (Armamenti §7.2.1): un quadratino per PI massimo, stacco ogni 5, con
 * l'etichetta dell'oggetto. A 0 PI l'oggetto è Rotto.
 */
const gruppoPI = ({ etichetta, pi }) => h('div', { class: 'caricatore gruppo-pi' },
  h('span', { class: 'etichetta-colpi' }, etichetta ? `PI ${etichetta}` : 'PI'), filaCaselle(pi));

/** Protezioni con la colonna PI e, sotto ogni riga, i quadratini dei PI (armatura, rinforzo, elmetto). */
function tabellaProtezioni(d) {
  const colonne = [...d.protezioni.colonne, 'PI'];
  return h('table', { class: 'tabella-stampa protezioni-stampa' },
    h('thead', {}, h('tr', {}, colonne.map((c) => h('th', { class: c === 'PI' ? 'col-pi' : null }, c)))),
    d.protezioni.righe.length ? d.protezioni.righe.map((r, i) => {
      const pi = d.piProtezioni?.[i] ?? [];
      return h('tbody', {},
        h('tr', { class: 'riga-arma' }, r.map((v, j) => (j === 0 ? h('th', { scope: 'row' }, v) : h('td', {}, v))),
          h('td', { class: 'col-pi' }, pi.length ? pi.map((x) => x.pi).join(' + ') : '—')),
        pi.length ? h('tr', { class: 'riga-colpi' }, h('td', { colspan: colonne.length }, fileColpi(null, pi))) : null);
    }) : h('tbody', {}, h('tr', { class: 'da-compilare' }, colonne.map(() => h('td', {}, ' ')))));
}

function tabellaArmi(armi) {
  const n = COLONNE_ARMI.length;
  return h('table', { class: 'tabella-stampa armi-stampa' },
    h('thead', {}, h('tr', {}, COLONNE_ARMI.map(([k, t]) => h('th', { class: `col-${k}` }, t)))),
    armi.map((a) => h('tbody', {},
      h('tr', { class: 'riga-arma' }, COLONNE_ARMI.map(([k]) => (k === 'nome'
        ? h('th', { scope: 'row' }, a.nome, a.addosso ? h('span', { class: 'sigla' }, ' addosso') : null,
          // senza colpi, i PI stanno sotto il nome: la riga delle proprietà è spesso già su due righe
          !a.colpi && a.piMax ? fileColpi(null, [{ etichetta: '', pi: a.piMax }]) : null)
        : h('td', { class: `col-${k}` }, a[k] || '—')))),
      a.colpi ? h('tr', { class: 'riga-colpi' }, h('td', { colspan: n }, fileColpi(a.colpi, a.piMax ? [{ etichetta: '', pi: a.piMax }] : []))) : null)));
}

function foglioCombattimento(d) {
  const s = d.sintesi;
  const mov = s.movimento;
  const cella = (etichetta, ...valore) => h('div', { class: 'cella-sintesi' }, h('span', { class: 'nome-cella' }, etichetta), h('span', { class: 'valore-cella' }, ...valore));
  const eq = d.equipaggiamentoStampa;
  const casella = () => h('span', { class: 'casella' });
  const rigaEquip = (r) => h('tr', {}, h('th', { scope: 'row' }, r.nome, r.note ? h('span', { class: 'sigla' }, ` — ${r.note}`) : null),
    h('td', { class: 'peso' }, r.peso), h('td', { class: 'dove' }, casella()), h('td', { class: 'dove' }, casella()), h('td', { class: 'dove' }, casella()));
  const vuota = () => { const r = h('tr', { class: 'da-compilare' }, h('th', {}, ' '), h('td', {}, ' '), h('td', { class: 'dove' }, casella()), h('td', { class: 'dove' }, casella()), h('td', { class: 'dove' }, casella())); r.dataset.vuota = '1'; return r; };
  return [
    box({ titolo: null, classe: 'f3-sintesi' },
      h('div', { class: 'sintesi' },
        cella('Iniziativa', `${segno(s.iniziativa)} + ${s.dadoIniziativa}`),
        cella('Movimento', `Passo ${mov.passo} · Corsa ${mov.corsa} · Scatto ${mov.scatto} ${mov.unita}`),
        cella('Azioni', `${s.azioni.movimento} Mov. · ${s.azioni.principali} Princ.`),
        s.difese ? cella('Difese', `VA ${s.difese.va}`) : null,
        s.salvezze.map((x) => cella(x.nome, `${x.totale}${x.limitato ? '*' : ''}`))),
      // §5.18: i riassunti degli Stati non entrano a 10 pt; resta una fila di nomi da cerchiare
      h('p', { class: 'stati-nomi' }, h('strong', {}, 'Stati (§5.18)'), d.statiRiassunto.map((x) => h('span', {}, x.nome)))),
    box({ titolo: 'Armi', classe: 'f3-armi' }, tabellaArmi(d.armiStampa),
      tabellaProtezioni(d)),
    h('div', { class: 'f3-basso' },
      h('div', { class: 'colonna' },
        box({ titolo: 'Equipaggiamento', riempitivo: true },
          h('p', { class: 'crediti-stampa' }, h('strong', {}, 'Crediti '), h('span', { class: 'casella-lunga' }),
            d.creditiIniziali !== null ? h('span', { class: 'sigla' }, ` saldo iniziale ${crediti(d.creditiIniziali)}`) : null,
            eq.carico ? h('span', { class: 'sigla' }, ` · carico ${eq.carico.peso} kg (≤ ${eq.carico.ordinario} / ${eq.carico.massimo})${eq.carico.senzaPeso ? ` · ${eq.carico.senzaPeso} senza peso` : ''}`) : null),
          h('div', { class: 'riempi-righe' },
            h('table', { class: 'tabella-stampa equip-stampa' },
              h('thead', {}, h('tr', {}, h('th', {}, 'Oggetto'), h('th', {}, 'Peso'), h('th', { class: 'dove' }, 'ind'), h('th', { class: 'dove' }, 'zai'), h('th', { class: 'dove' }, 'Altro'))),
              h('tbody', {}, eq.righe.map(rigaEquip), Array.from({ length: 30 }, vuota)))))),
      h('div', { class: 'colonna' },
        box({ titolo: 'Ferite (§5.14)' },
          // senza intestazione: ferita, penalità a VA e PS, menomazione
          h('table', { class: 'tabella-stampa ferite' },
            h('tbody', {}, d.ferite.stati.map((f) => h('tr', {},
              h('td', {}, casella()), h('th', { scope: 'row' }, f.nome), h('td', {}, segno(f.penalita)), h('td', {}, f.menomazione ?? ''))),
            h('tr', {}, h('td', {}, casella()), h('th', { scope: 'row' }, 'Oltre Grave'), h('td', { colspan: 2 }, d.ferite.oltre))))),
        d.specializzazioni.length ? box({ titolo: 'Specializzazioni' }, h('ul', { class: 'elenco-talenti-stampa' }, d.specializzazioni.map((x) => h('li', {},
          h('strong', {}, x.nome), ` — ${x.abilita}; ${x.effetto}`)))) : null,
        d.tecniche.length || d.tecnicheAmmesse ? box({ titolo: `Tecniche Interiori (${d.tecniche.length} / ${d.tecnicheAmmesse})` },
          tabella(['Tecnica', 'Costo', 'Azione'], d.tecniche.map((x) => [x.nome, x.costo, x.azione]))) : null),
      box({ titolo: 'Punti Vita', tinta: 'pv', forte: true, riempitivo: true, classe: 'f3-pv' },
        // PV massimi e, accanto, l'AR (docs/ricognizione-ar-pi.md): un sottoriquadro per valore
        h('div', { class: 'f3-massimi' },
          h('div', { class: 'massimo' }, h('span', {}, 'massimi'), h('span', { class: 'valore' }, String(d.pv))),
          (d.arStampa?.valori ?? []).map((v) => h('div', { class: `massimo tinta-ar${v.principale ? ' principale' : ''}` },
            h('span', {}, v.etichetta), h('span', { class: 'valore' }, String(v.valore))))),
        d.arStampa ? h('p', { class: 'piccolo provenienza-ar' }, d.arStampa.provenienza) : null,
        h('p', { class: 'piccolo' }, 'attuali'),
        quadratini(d.pv, { piu: true }),
        righeGuida())),
  ];
}

// ---------------------------------------------------------------------------
// Foglio 4 — Magia (anche più pagine). Prima pagina: Punti Magia, valori di lancio, contenitori
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

function foglioMagia(d) {
  const v = d.valoriLancio;
  const voce = (nome, valore) => [h('dt', {}, nome), h('dd', {}, valore)];
  const incantesimi = elencoIncantesimi(d);
  return [
    h('div', { class: 'f4-testa' },
      box({ titolo: 'Punti Magia', tinta: 'pm', forte: true },
        h('div', { class: 'massimo' }, h('span', {}, 'massimi'), h('span', { class: 'valore' }, String(d.pm ?? '—'))),
        h('p', { class: 'piccolo' }, 'attuali'),
        d.pm ? quadratini(d.pm, { piu: true }) : null),
      box({ titolo: 'Lancio' },
        h('dl', { class: 'voci-stampa' },
          voce('Potere per lanciare', h('strong', {}, `VA ${v.potere ?? '—'}`), d.lancio ? ` (armatura ${segno(d.lancio.penalita)}, §7.11.1)` : null),
          voce('Focalizzazione', `${segno(v.focalizzazione)} a Potere (1 Azione Principale prima)`),
          voce('Ingaggio', `${segno(v.ingaggio)} a Potere, Prova sempre richiesta`),
          voce('Anticipazione', `PM ×${v.anticipazione}, Potere più difficile di una categoria`),
          voce('Armi da lancio', `${segno(v.armiDaLancio)} negli Incantesimi`),
          voce('Incantesimi', `conosciuti ${d.conosciuti} / ${d.quota} · livello massimo ${d.livelloMassimo}`)),
        h('table', { class: 'tabella-stampa scala' },
          h('tbody', {},
            h('tr', {}, h('th', {}, `Livello (scala ${d.scalaPotere})`), d.scala.map((r) => h('td', {}, r.livelli))),
            h('tr', {}, h('th', {}, 'Prova di Potere'), d.scala.map((r) => h('td', {}, r.prova)))))),
      d.riserve?.length ? box({ titolo: 'Contenitori di Chroma (Magia sez. 6)', classe: 'f4-riserve' },
        d.riserve.map((r) => h('div', { class: 'riserva' },
          h('p', {}, h('strong', {}, r.nome), h('span', { class: 'sigla' }, ` · ${r.energia} · ${r.integrato ? 'attivazioni (A.18)' : r.regoleRimandate ? 'regole rimandate' : r.macrofamiglie.length >= 3 ? 'tutte le macrofamiglie' : r.macrofamiglie.join(', ') || '—'} · ${r.sintonizzato ? 'sintonizzato' : 'da sintonizzare'} (${r.costo})`)),
          quadratini(r.capacita)))) : null),
    box({ titolo: `Incantesimi (${incantesimi.length})`, riempitivo: true, classe: 'f4-indice' },
      incantesimi.length ? tabellaIndice(incantesimi.map(rigaIndice)) : h('p', {}, 'Nessun incantesimo scelto.')),
  ];
}

/**
 * Impagina il foglio Magia: righe dell'indice che non entrano nella prima pagina e schede degli
 * incantesimi su pagine successive, riempite misurando nel DOM. Restituisce il numero di pagine.
 */
function impaginaMagia(contenitore, foglio, d, piede) {
  const incantesimi = elencoIncantesimi(d);
  // 1. indice: le righe oltre il fondo del riquadro passano alla pagina dopo
  const box1 = foglio.querySelector('.f4-indice > .contenuto');
  const fondo = box1.getBoundingClientRect().bottom - 1;
  const righe = [...foglio.querySelectorAll('.indice-magia tbody tr')];
  const primaFuori = righe.findIndex((r) => r.getBoundingClientRect().bottom > fondo);
  const resto = primaFuori < 0 ? [] : righe.slice(primaFuori);
  resto.forEach((r) => r.remove());
  if (!incantesimi.length) return 1;

  let ultima = foglio;
  let pagine = 1;
  const nuovaPagina = (conIndice) => {
    const f = creaFoglio('magia', 'Magia (continua)', d, piede, () => [
      conIndice ? box({ titolo: 'Incantesimi (continua)', classe: 'f4-indice-seguito' }, tabellaIndice(resto)) : null,
      h('div', { class: 'colonne-schede' }),
    ]);
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
  return pagine;
}
