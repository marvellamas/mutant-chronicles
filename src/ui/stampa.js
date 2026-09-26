// Vista di stampa dedicata (#/p/<id>/stampa): fogli A4 orizzontali, separati dalla vista
// digitale (docs/roadmap-equipaggiamento-e-scheda.md, §2.2). I contenuti vengono da
// preparaStampa() (src/stampa.js); qui solo HTML e adattamento: se un foglio non entra nella
// sua pagina si riduce il carattere di quel foglio. Solo il foglio Magia, se non entra neanche
// al carattere minimo, continua su altre pagine (spezzaMagia), con le intestazioni ripetute.
import { h, segno } from './dom.js';
import { spezzaMagia, contaIncantesimi } from '../stampa.js';

const FOGLIO_STILE = 'css/stampa.css';
const CARATTERE = { iniziale: 9, minimo: 5.5, passo: 0.25, continuazione: 7 }; // pt

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

function creaFoglio(id, titolo, dati, piede) {
  return h('section', { class: `foglio foglio-${id}`, 'aria-label': titolo },
    h('div', { class: 'pagina' },
      h('header', { class: 'foglio-testa' },
        h('span', { class: 'foglio-titolo' }, titolo),
        h('span', { class: 'foglio-nome' }, piede.nome)),
      h('div', { class: 'foglio-corpo' }, corpi[id](dati)),
      h('footer', { class: 'foglio-piede' })));
}

/** Scrive «foglio N di M» in tutti i piè di pagina, dopo l'eventuale divisione del foglio Magia. */
function numeraPiedi(contenitore, piede) {
  const fogli = [...contenitore.querySelectorAll('.foglio')];
  fogli.forEach((f, i) => {
    f.querySelector('.foglio-piede').textContent =
      `${piede.nome} · ${piede.livello}° livello · foglio ${i + 1} di ${fogli.length}${piede.versioni ? ` · Dati: ${piede.versioni}` : ''}`;
  });
}

const eccede = (corpo) => corpo.scrollHeight > corpo.clientHeight + 1 || corpo.scrollWidth > corpo.clientWidth + 1;

/**
 * @param {object} o { stampa: risultato di preparaStampa, torna() }
 * @returns {Node[]} nodi da mettere nella pagina; l'adattamento parte da solo dopo il caricamento dello stile
 */
export function renderStampa({ stampa, torna }) {
  document.body.classList.add('vista-stampa');
  const avvisi = h('div', { class: 'barra-avvisi' });
  const barra = h('div', { class: 'barra-stampa' },
    h('button', { type: 'button', class: 'btn primario', onclick: () => window.print() }, 'Stampa'),
    h('button', { type: 'button', class: 'btn', onclick: torna }, 'Torna alla scheda'),
    h('span', { class: 'nota' }, 'A4 orizzontale. Per il PDF scegli «Salva come PDF» come stampante.'),
    avvisi);
  if (!stampa.fogli.length) {
    return [barra, h('p', { class: 'nota errore' }, 'La scheda non si può calcolare: correggi prima le scelte segnalate nella vista digitale.')];
  }
  if (!stampa.completa) avvisi.append(h('p', {}, 'Scheda non ancora completa: alcuni valori possono mancare.'));

  const contenitore = h('div', { class: 'fogli' }, stampa.fogli.map((f) => creaFoglio(f.id, f.titolo, f.dati, stampa.piede)));
  numeraPiedi(contenitore, stampa.piede);
  caricaStile().then(() => (document.fonts?.ready ?? Promise.resolve())).then(() => {
    const ridotti = [];
    for (const f of contenitore.querySelectorAll('.foglio')) {
      const esito = adatta(f.querySelector('.foglio-corpo'));
      const titolo = f.querySelector('.foglio-titolo').textContent;
      if (f.classList.contains('foglio-magia') && esito.eccede) {
        const pagine = impaginaMagia(contenitore, stampa.fogli.find((x) => x.id === 'magia').dati, stampa.piede);
        f.replaceWith(...pagine);
        avvisi.append(h('p', {}, `Il foglio Magia continua su ${pagine.length} pagine.`));
      } else if (esito.ridotto) ridotti.push(`${titolo} (${esito.pt} pt)`);
    }
    numeraPiedi(contenitore, stampa.piede);
    if (ridotti.length) avvisi.append(h('p', {}, `Carattere ridotto per stare nella pagina: ${ridotti.join(', ')}.`));
  });
  return [barra, contenitore];
}

/** Riduce il carattere del corpo finché il contenuto non esce dalla pagina. */
function adatta(corpo, iniziale = CARATTERE.iniziale) {
  let pt = iniziale;
  corpo.style.fontSize = `${pt}pt`;
  while (eccede(corpo) && pt > CARATTERE.minimo) {
    pt = Math.max(CARATTERE.minimo, pt - CARATTERE.passo);
    corpo.style.fontSize = `${pt}pt`;
  }
  return { pt, ridotto: pt < iniziale, eccede: eccede(corpo) };
}

/**
 * Divide gli incantesimi su più pagine Magia, riempiendo ciascuna al carattere di continuazione:
 * per ogni pagina aggiunge incantesimi finché entrano (misurando nel DOM), poi passa alla
 * successiva. La divisione in gruppi con intestazioni ripetute è di spezzaMagia (funzione pura).
 */
function impaginaMagia(contenitore, magia, piede) {
  const totale = contaIncantesimi(magia.macrofamiglie);
  const tagli = [];
  let usati = 0;
  const entra = (pagina, titolo) => {
    const el = creaFoglio('magia', titolo, pagina, piede);
    contenitore.append(el);
    const corpo = el.querySelector('.foglio-corpo');
    corpo.style.fontSize = `${CARATTERE.continuazione}pt`;
    const ok = !eccede(corpo);
    el.remove();
    return ok;
  };
  while (usati < totale) {
    let n = 1;
    for (let prova = 2; usati + prova <= totale; prova++) {
      const pagina = spezzaMagia(magia, [...tagli, prova])[tagli.length];
      if (!entra(pagina, 'Magia')) break;
      n = prova;
    }
    tagli.push(n);
    usati += n;
  }
  return spezzaMagia(magia, tagli).map((pagina, k) => {
    const el = creaFoglio('magia', k ? 'Magia (continua)' : 'Magia', pagina, piede);
    contenitore.append(el);
    // un incantesimo da solo più alto della pagina: si riduce il carattere di quella pagina
    adatta(el.querySelector('.foglio-corpo'), CARATTERE.continuazione);
    el.remove();
    return el;
  });
}

// ---------------------------------------------------------------------------
// componenti

const riquadro = (titolo, ...contenuto) => h('section', { class: 'riquadro-stampa' }, h('h2', {}, titolo), ...contenuto);
const caselle = (n, classe = '') => h('span', { class: `caselle ${classe}` }, Array.from({ length: n }, () => h('span', { class: 'casella' })));
const righeVuote = (n) => h('div', { class: 'righe-vuote' }, Array.from({ length: n }, () => h('div', { class: 'riga-vuota' })));

function tabella(colonne, righe, { classe = '', vuote = 0 } = {}) {
  return h('table', { class: `tabella-stampa ${classe}` },
    h('thead', {}, h('tr', {}, colonne.map((c) => h('th', {}, c)))),
    h('tbody', {},
      righe.map((r) => h('tr', {}, r.map((v, i) => (i === 0 ? h('th', { scope: 'row' }, v) : h('td', {}, v))))),
      Array.from({ length: vuote }, () => h('tr', { class: 'da-compilare' }, colonne.map(() => h('td', {}, ' '))))));
}

// ---------------------------------------------------------------------------
// Foglio 1 — Identità

function foglioIdentita(d) {
  const mov = d.movimento;
  return [
    h('div', { class: 'intestazione-personaggio' },
      h('h1', {}, d.nome),
      h('p', {}, h('strong', {}, `${d.livello}° livello`), ` · ${d.corporazione} · ${d.addestramento} · `,
        d.classi.map((c) => `${c.nome} ${c.grado}`).join(', '))),
    h('div', { class: 'griglia-identita' },
      h('div', { class: 'colonna' },
        riquadro('Caratteristiche', tabella(['', 'Valore', 'Mod', 'Mod Salv.'],
          d.caratteristiche.map((c) => [`${c.nome} (${c.sigla})`, String(c.valore), segno(c.mod), segno(c.modSalvezza)]), { classe: 'numeri' })),
        riquadro('Prove Salvezza', tabella(['', 'Car.', 'Totale'],
          d.salvezze.map((s) => [s.nome, s.caratteristica, `${s.totale}${s.limitato ? '*' : ''}`]), { classe: 'numeri' }),
        d.salvezze.some((s) => s.limitato) ? h('p', { class: 'piccolo' }, `* limitato a ${d.salvezze[0].tetto} (§1.2.3)`) : null)),
      h('div', { class: 'colonna' },
        h('div', { class: 'coppia' },
          riquadro('Punti Vita', h('p', { class: 'valore-grande' }, `max ${d.pv}`), h('div', { class: 'casella-grande' }, h('span', {}, 'attuali'))),
          riquadro('Punti Magia', h('p', { class: 'valore-grande' }, `max ${d.pm ?? '—'}`), h('div', { class: 'casella-grande' }, h('span', {}, 'attuali')))),
        riquadro('Punti Eroe',
          h('p', {}, d.puntiEroe.valore === null ? 'Iniziali: da determinare' : `Iniziali ${d.puntiEroe.valore} · riserva massima ${d.puntiEroe.massimo}`),
          caselle(d.puntiEroe.massimo)),
        riquadro('Distintivi', righeVuote(3)),
        riquadro('Combattimento',
          h('dl', { class: 'voci-stampa' },
            h('dt', {}, 'Iniziativa'), h('dd', {}, `${segno(d.iniziativa)} + ${d.dadoIniziativa}`),
            h('dt', {}, 'Movimento'), h('dd', {}, `Passo ${mov.passo} ${mov.unita} · Corsa ${mov.corsa} ${mov.unita} · Scatto ${mov.scatto} ${mov.unita}`),
            h('dt', {}, 'Azioni'), h('dd', {}, `${d.azioni.movimento} di Movimento, ${d.azioni.principali} ${d.azioni.principali === 1 ? 'Principale' : 'Principali'} per Round`)))),
      h('div', { class: 'colonna' },
        riquadro('Vantaggio dell’Addestramento', h('p', {}, h('strong', {}, `${d.vantaggio.nome}. `), d.vantaggio.testo)),
        riquadro('Anagrafica',
          h('dl', { class: 'anagrafica-stampa' },
            d.anagrafica.map((x) => [h('dt', {}, x.etichetta), h('dd', { class: x.valore ? null : 'da-compilare' }, x.valore || ' ')]),
            h('dt', {}, 'Punti esperienza'), h('dd', { class: d.puntiEsperienza === null ? 'da-compilare' : null }, d.puntiEsperienza === null ? ' ' : String(d.puntiEsperienza)))),
        riquadro('Background', d.background ? h('p', { class: 'testo-background' }, d.background) : righeVuote(4),
          d.backgroundTroncato ? h('p', { class: 'piccolo' }, 'Testo completo nella scheda digitale.') : null),
        d.annotazioni.length ? riquadro('Note', h('ul', { class: 'piccolo' }, d.annotazioni.map((a) => h('li', {}, a)))) : null)),
  ];
}

// ---------------------------------------------------------------------------
// Foglio 2 — Abilità e statistiche

function foglioAbilita(d) {
  // due tabelle affiancate (metà delle categorie ciascuna): in una sola colonna le 24 Abilità
  // occuperebbero tutta l'altezza del foglio
  const meta = Math.ceil(d.categorie.length / 2);
  const tabellaAbilita = (categorie) => h('table', { class: 'tabella-stampa numeri abilita-stampa' },
    h('thead', {}, h('tr', {}, ['Abilità', 'Mod', 'Base', 'Corp', 'Avanz', 'Equip', 'VA'].map((c) => h('th', {}, c)))),
    categorie.map((cat) => h('tbody', {},
      h('tr', { class: 'categoria' }, h('th', { colspan: 7 }, cat.nome)),
      cat.abilita.map((a) => h('tr', {},
        h('th', { scope: 'row' }, `${a.nome} `, h('span', { class: 'sigla' }, a.caratteristica), a.diClasse ? ' •' : null),
        h('td', {}, segno(a.mod)), h('td', {}, String(a.base)), h('td', {}, String(a.corporazione)),
        h('td', {}, String(a.avanzamento)), h('td', { title: a.equip ? 'Equipaggiamento indossato (§7.11.1)' : null }, a.equip ? segno(a.equip) : '0'), h('td', { class: 'forte' }, String(a.va)))))));
  return h('div', { class: 'griglia-abilita' },
    h('div', { class: 'colonna' },
      riquadro('Abilità',
        h('div', { class: 'abilita-affiancate' }, tabellaAbilita(d.categorie.slice(0, meta)), tabellaAbilita(d.categorie.slice(meta))),
        h('p', { class: 'piccolo' }, `• Abilità di Classe. VA = Mod + Base + Corp + Avanz + Equip (equipaggiamento indossato). Avanzamento massimo: ${d.limiteAvanzamento ?? '—'}.`)),
      d.specializzazioni.length ? riquadro('Specializzazioni', h('ul', { class: 'elenco-talenti-stampa' }, d.specializzazioni.map((x) => h('li', {},
        h('strong', {}, x.nome), ` — ${x.abilita}; ${x.effetto}`)))) : null,
      d.tecniche.length || d.tecnicheAmmesse ? riquadro(`Tecniche Interiori (${d.tecniche.length} / ${d.tecnicheAmmesse})`,
        tabella(['Tecnica', 'Costo', 'Azione'], d.tecniche.map((t) => [t.nome, t.costo, t.azione]))) : null,
      riquadro('Annotazioni', righeVuote(3))),
    h('div', { class: 'colonna' },
      riquadro('Talenti di Classe', h('ul', { class: 'elenco-talenti-stampa' }, d.talentiClasse.map((t) => h('li', {},
        h('strong', {}, t.nome), h('span', { class: 'sigla' }, ` ${t.classe} ${t.grado}${t.scelto ? ', a scelta' : ''}`), ` — ${t.frase}`)))),
      d.talentiLiberi.length ? riquadro('Talenti Liberi', h('ul', { class: 'elenco-talenti-stampa' }, d.talentiLiberi.map((t) => h('li', {},
        h('strong', {}, t.nome), t.parametro ? ` (${t.parametro})` : null, t.annotazione ? ` — ${t.annotazione}` : null,
        h('span', { class: 'sigla' }, ` ${t.livello}° liv.`), t.provvisorio ? h('em', {}, ' provvisorio') : null, ` — ${t.frase}`)))) : null));
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
      riquadro('Punti Magia', h('p', { class: 'valore-grande' }, `max ${d.pm ?? '—'}`), h('div', { class: 'casella-grande' }, h('span', {}, 'attuali'))),
      riquadro('Incantesimi',
        h('p', {}, `Conosciuti ${d.conosciuti} / ${d.quota}`),
        h('p', {}, h('strong', {}, `Livello massimo: ${d.livelloMassimo}`))),
      riquadro(`Prove di Potere (scala ${d.scalaPotere})`,
        h('table', { class: 'tabella-stampa scala' },
          h('tbody', {},
            h('tr', {}, h('th', {}, 'Livello'), d.scala.map((r) => h('td', {}, r.livelli))),
            h('tr', {}, h('th', {}, 'Prova'), d.scala.map((r) => h('td', {}, r.prova))))))),
    h('div', { class: 'colonne-incantesimi' },
      d.macrofamiglie.length ? d.macrofamiglie.map((m) => [
        h('h2', { class: 'macro' }, m.nome, m.continua ? h('span', { class: 'sigla' }, ' (continua)') : null),
        m.specializzazioni.map((sp) => [
          h('h3', { class: 'spec' }, sp.nome, sp.continua ? ' (continua)' : null),
          sp.incantesimi.map((i) => h('article', { class: 'incantesimo-stampa' },
            h('h4', {}, i.nome, h('span', { class: 'sigla' }, ` · livello base ${i.livelloBase}`)),
            i.intestazione ? h('p', { class: 'piccolo' }, i.intestazione) : null,
            i.lancio ? h('p', {}, i.lancio) : null,
            i.righe.length ? tabella(i.colonne, i.righe, { classe: 'versioni' })
              : h('p', { class: 'piccolo' }, `Tabella: Manuale della Magia, scheda ${i.scheda}.`))),
        ]),
      ]) : h('p', {}, 'Nessun incantesimo scelto.')),
  ];
}
