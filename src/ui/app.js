// Avvio dell'app: carica e valida i dati, poi mostra home, wizard, scheda a tab, "Sali di
// livello" o stampa. Stato: le scelte della creazione, i livelli acquisiti (cap. 8) e i valori
// di sessione (modalità tavolo) del personaggio aperto; tutto il resto si ricalcola a ogni
// disegno con calcolaScheda / anteprima.
import { caricaDati } from '../rules.js';
import { formattaErrore, trovaTodo } from '../validate.js';
import { calcolaScheda, validaLivello } from '../calc.js';
import {
  nuoveScelte, normalizza, applicaModifica, anteprima, serializza, nomeFileEsportazione, deserializzaPersonaggio, applicaLivello, annullaUltimoLivello,
  CAMPI_ANAGRAFICA,
} from '../character.js';
import { h, svuota, scaricaFile } from './dom.js';
import * as archivio from './storage.js';
import { PASSI, passoVisibile, requisitoPasso } from './passi.js';
import { inizializzaTooltip, nascondiTooltip } from './tooltip.js';
import { renderRiepilogo } from './riepilogo.js';
import { renderSali } from './sali.js';
import { renderStampa, esciDallaStampa } from './stampa.js';
import { cercaSfondi, applicaSfondo } from './sfondi.js';
import { preparaStampa, preparaTab } from '../stampa.js';
import { renderTab } from './tab.js';
import {
  massimiSessione, allineaSessione, variaSessione, modificaSessione, commutaStato, nuovaSessione, convertiDistintivi, sessioneDopoLivello,
  penalitaSessione, variaMunizioni, ricaricaArma, variaChroma,
} from '../sessione.js';
import { conOrdinale } from '../lingua.js';

// Dopo la creazione si possono ancora cambiare solo i campi descrittivi: le altre scelte
// determinano i livelli successivi (ricognizione dell'avanzamento, §8).
const CAMPI_LIBERI_DOPO_LIVELLI = ['nome', 'concetto', 'equipaggiamento', 'puntiEsperienza', 'ritratto', ...CAMPI_ANAGRAFICA.map((c) => c.campo)];
// L'ultimo passo del wizard è la scheda: si apre come vista a tab (#/p/<id>).
const PASSO_SCHEDA = PASSI.length - 1;
const PASSO_EQUIPAGGIAMENTO = PASSI.findIndex((p) => p.titolo === 'Equipaggiamento');
const TAB = ['identita', 'abilita', 'combattimento', 'magia'];

const radice = document.getElementById('app');

const stato = {
  dati: null,
  versioni: '',
  id: null,
  scelte: null,
  livelli: [], // scelte dei livelli dal 2° in poi (cap. 8)
  sali: null, // bozza del livello successivo: { voce, passo, ui }. Non si salva fino alla conferma.
  sessione: null, // valori attuali della modalità tavolo (src/sessione.js); null finché non si apre la scheda
  sessionePrecedente: null, // per «Annulla ultima modifica» (una sola, in memoria)
  tab: 'identita',
  messaggioScheda: null,
  passo: 0,
  avvisi: [], // avvisi dell'ultima modifica che ha invalidato scelte a valle
  precedente: null, // scelte prima di quella modifica, per "Annulla"
  messaggioHome: null,
  avvisiDati: [],
  salvataggioOk: true,
  sfondi: [], // sfondi di Corporazione presenti in img/sfondi/ (src/ui/sfondi.js)
  ui: { aperti: new Set(), riepilogoAperto: false, tiroPE: null },
};

avvia();

async function avvia() {
  let risultato;
  try {
    risultato = await caricaDati();
  } catch (e) {
    return mostraErroriDati([{ file: '(avvio)', chiave: '', problema: e.message }]);
  }
  stato.dati = risultato.dati;
  stato.versioni = versioniDati(risultato.dati);
  document.getElementById('versioni').textContent = stato.versioni ? `Dati: ${stato.versioni}` : '';
  if (risultato.errori.length) return mostraErroriDati(risultato.errori);
  stato.avvisiDati = risultato.avvisi ?? [];
  inizializzaTooltip(stato.dati);
  stato.sfondi = await cercaSfondi(stato.dati.corporazioni.corporazioni.map((c) => c.nome));
  window.addEventListener('hashchange', daIndirizzo);
  // I menu della scheda (Azioni, impostazioni) si chiudono toccando altrove
  document.addEventListener('click', (e) => {
    for (const d of document.querySelectorAll('details.menu-azioni[open]')) if (!d.contains(e.target)) d.open = false;
  });
  window.addEventListener('beforeunload', (e) => {
    if (bozzaModificata()) e.preventDefault();
  });
  daIndirizzo();
}

function versioniDati(dati) {
  const v = new Set();
  for (const f of Object.values(dati)) {
    for (const parte of String(f?.versione_manuale ?? '').split(';')) if (parte.trim()) v.add(parte.trim());
  }
  return [...v].join(', ');
}

function mostraErroriDati(errori) {
  const perFile = Map.groupBy ? Map.groupBy(errori, (e) => e.file) : raggruppa(errori);
  svuota(radice, h('section', { class: 'pagina-errori' },
    h('h1', {}, 'I dati delle regole contengono errori'),
    h('p', {}, 'L’app non parte finché i file in ', h('code', {}, 'data/'), ' non sono corretti, per non mostrare valori sbagliati. Correggi i punti seguenti e ricarica la pagina.'),
    [...perFile].map(([file, lista]) => h('section', {},
      h('h2', {}, file),
      h('ul', {}, lista.map((e) => h('li', {}, e.chiave ? h('code', {}, e.chiave) : null, e.chiave ? ': ' : null, e.problema))))),
    h('details', {}, h('summary', {}, 'Testo semplice (da copiare)'), h('pre', {}, errori.map(formattaErrore).join('\n')))));
}

function raggruppa(errori) {
  const m = new Map();
  for (const e of errori) m.set(e.file, [...(m.get(e.file) ?? []), e]);
  return m;
}

// ---------------------------------------------------------------------------
// Navigazione: #/ è la home, #/p/<id>/<passo> il wizard. Il tasto Indietro del browser funziona.

function vai(indirizzo) {
  if (location.hash === indirizzo) daIndirizzo();
  else location.hash = indirizzo;
}

const bozzaModificata = () => !!stato.sali && Object.keys(stato.sali.voce).length > 0;
const MSG_USCITA = 'Uscire da «Sali di livello»? Le scelte di questo livello non sono salvate e andranno perse.';
let hashDaIgnorare = null;

function daIndirizzo() {
  if (hashDaIgnorare !== null && location.hash === hashDaIgnorare) {
    hashDaIgnorare = null;
    return;
  }
  esciDallaStampa();
  applicaSfondo(null); // lo sfondo scelto vale solo nella SD (renderScheda)
  const sali = location.hash.match(/^#\/p\/([\w-]+)\/sali\/(\d+)$/);
  // Uscire dalla bozza del livello (tasto Indietro, link, indirizzo) chiede conferma.
  if (stato.sali && !(sali && sali[1] === stato.id)) {
    if (bozzaModificata() && !confirm(MSG_USCITA)) {
      hashDaIgnorare = `#/p/${stato.id}/sali/${stato.sali.passo}`;
      location.hash = hashDaIgnorare;
      return;
    }
    stato.sali = null;
  }
  const stampa = location.hash.match(/^#\/p\/([\w-]+)\/(stampa)$/);
  const scheda = location.hash.match(/^#\/p\/([\w-]+)(?:\/t\/(\w+))?$/);
  const m = sali ?? stampa ?? scheda ?? location.hash.match(/^#\/p\/([\w-]+)\/(\d+)$/);
  if (!m) {
    stato.id = null;
    stato.scelte = null;
    stato.livelli = [];
    return renderHome();
  }
  const [, id, passoTesto] = m;
  const appenaCaricato = stato.id !== id;
  if (appenaCaricato) {
    const salvato = archivio.carica(id);
    if (!salvato) {
      stato.messaggioHome = { tipo: 'errore', testo: 'Personaggio non trovato in questo browser.' };
      return vai('#/');
    }
    const { scelte, avvisi } = normalizza(salvato.scelte, stato.dati);
    stato.id = id;
    stato.scelte = scelte;
    stato.livelli = Array.isArray(salvato.livelli) ? salvato.livelli : [];
    stato.sessione = salvato.sessione ?? null;
    stato.sessionePrecedente = null;
    stato.messaggioScheda = null;
    stato.avvisi = avvisi.length ? ['Il personaggio salvato non era più coerente con i dati attuali:', ...avvisi] : [];
    stato.precedente = null;
    stato.ui.aperti.clear();
    stato.ui.tiroPE = null;
    if (avvisi.length) persisti();
  }
  if (sali) return apriSali(Number(passoTesto));
  if (stampa) return apriStampa();
  if (scheda) return apriScheda(TAB.includes(passoTesto) ? passoTesto : null);
  const passo = Math.min(Number(passoTesto), PASSI.length - 1);
  // L'ultimo passo del wizard è la scheda a tab
  if (passo === PASSO_SCHEDA) return vai(`#/p/${id}`);
  // Gli avvisi riguardano l'ultima modifica: cambiando passo non servono più.
  if (!appenaCaricato && passo !== stato.passo) {
    stato.avvisi = [];
    stato.precedente = null;
  }
  stato.passo = passo;
  persisti();
  renderWizard();
  window.scrollTo(0, 0);
}

const vaiAlPasso = (i) => vai(`#/p/${stato.id}/${i}`);

const personaggio = () => ({ creazione: stato.scelte, livelli: stato.livelli });

// ---------------------------------------------------------------------------
// Persistenza

/** Avviso quando il salvataggio nel browser non riesce: spazio esaurito o storage bloccato. */
function testoSalvataggioFallito() {
  return archivio.erroreSalvataggio() === 'quota'
    ? 'Spazio del browser esaurito: le ultime modifiche NON sono salvate. Usa «SALVA PG (Esporta JSON)» subito, poi esporta e rimuovi i personaggi vecchi (o i ritratti) dalla pagina iniziale.'
    : 'Il browser non permette il salvataggio: usa «SALVA PG (Esporta JSON)» per non perdere il personaggio.';
}

function persisti() {
  if (!stato.id) return;
  stato.salvataggioOk = archivio.salva({ id: stato.id, scelte: stato.scelte, livelli: stato.livelli, sessione: stato.sessione, passo: stato.passo });
}

function esporta(scelte, livelli = [], sessione = null) {
  const versioniDatiFile = Object.fromEntries(Object.entries(stato.dati).map(([k, v]) => [k, v.versione_manuale]));
  scaricaFile(nomeFileEsportazione(scelte.nome, 1 + livelli.length), serializza(scelte, { versioniDati: versioniDatiFile, livelli, sessione }));
}

/** Sessione allineata ai massimi attuali (inizializzata se manca), o null se la scheda non si calcola. */
function sessioneAllineata(creazione, livelli, sessione) {
  const scheda = calcolaScheda({ creazione, livelli }, stato.dati);
  if (!scheda.caratteristiche) return sessione ?? null;
  return allineaSessione(sessione, massimiSessione(scheda, creazione, stato.dati));
}

async function importa(file) {
  try {
    const { creazione, livelli, sessione: sessioneFile } = deserializzaPersonaggio(await file.text());
    const { scelte, avvisi } = normalizza(creazione, stato.dati);
    const id = archivio.nuovoId();
    // I livelli non si correggono in automatico: eventuali errori compaiono nella scheda.
    const errLivelli = livelli.length ? calcolaScheda({ creazione: scelte, livelli }, stato.dati).errori.filter((e) => e.campo.startsWith('livelli')) : [];
    if (errLivelli.length) avvisi.push(`Livelli con errori rispetto ai dati attuali: ${errLivelli[0].problema}`);
    // senza `sessione` nel file la si inizializza ai massimi; altrimenti la si limita ai massimi attuali
    const sessione = sessioneAllineata(scelte, livelli, sessioneFile);
    if (!archivio.salva({ id, scelte, livelli, sessione, passo: livelli.length || calcolaScheda(scelte, stato.dati).completa ? PASSO_SCHEDA : 0 })) {
      throw new Error(archivio.erroreSalvataggio() === 'quota' ? 'spazio del browser esaurito: esporta e rimuovi personaggi vecchi, poi riprova.' : 'il browser non permette di salvare (navigazione privata o permessi).');
    }
    stato.messaggioHome = {
      tipo: avvisi.length ? 'attenzione' : 'ok',
      testo: `Importato «${scelte.nome || file.name}».`,
      dettagli: avvisi,
    };
  } catch (e) {
    stato.messaggioHome = { tipo: 'errore', testo: `Import non riuscito: ${e.message}` };
  }
  renderHome();
}

// ---------------------------------------------------------------------------
// Home

function renderHome() {
  nascondiTooltip();
  document.title = 'Mutant — Creazione personaggio';
  const personaggi = archivio.elenco();
  const todo = trovaTodo(stato.dati);
  const msg = stato.messaggioHome;
  stato.messaggioHome = null;

  const inputFile = h('input', { type: 'file', accept: '.json,application/json', class: 'nascosto',
    onchange: (e) => e.target.files[0] && importa(e.target.files[0]) });

  svuota(radice, h('section', { class: 'home' },
    h('h1', {}, 'I tuoi personaggi'),
    msg ? h('div', { class: `riquadro ${msg.tipo}`, role: 'status' }, h('p', {}, msg.testo),
      msg.dettagli?.length ? h('ul', {}, msg.dettagli.map((d) => h('li', {}, d))) : null) : null,
    h('div', { class: 'riga-azioni' },
      h('button', { type: 'button', class: 'btn primario', onclick: nuovoPersonaggio }, 'Nuovo personaggio'),
      h('button', { type: 'button', class: 'btn', onclick: () => inputFile.click() }, 'Importa file JSON'),
      inputFile),
    personaggi.length
      ? h('ul', { class: 'elenco-personaggi' }, personaggi.map(rigaPersonaggio))
      : h('p', { class: 'vuoto' }, 'Nessun personaggio salvato in questo browser.'),
    h('p', { class: 'nota' }, 'I personaggi si salvano automaticamente in questo browser. Per spostarli su un altro dispositivo o passarli al master, usa «SALVA PG (Esporta JSON)» e Importa.'),
    h('section', { class: 'info-dati' },
      h('h2', {}, 'Dati delle regole'),
      h('p', {}, stato.versioni),
      stato.avvisiDati.length ? h('details', {}, h('summary', {}, `${stato.avvisiDati.length} avvisi sui dati (non bloccanti)`),
        h('ul', {}, stato.avvisiDati.map((a) => h('li', {}, h('code', {}, `${a.file} › ${a.chiave}`), ': ', a.problema)))) : null,
      todo.length ? h('details', {}, h('summary', {}, `${todo.length} valori o domande marcati TODO(Davide) nei dati`),
        h('ul', {}, todo.map((t) => h('li', {}, h('code', {}, t.percorso), ' — ', t.testo)))) : null)));
}

function rigaPersonaggio(p) {
  const s = p.scelte ?? {};
  const livelli = Array.isArray(p.livelli) ? p.livelli : [];
  const data = p.aggiornato ? new Date(p.aggiornato).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '';
  return h('li', { class: 'carta personaggio' },
    h('div', {},
      h('h2', {}, s.nome?.trim() || 'Senza nome'),
      h('p', {}, h('strong', {}, `Livello ${1 + livelli.length}`), ' · ', [s.corporazione, s.addestramento, s.classe].filter(Boolean).join(' · ') || 'Appena iniziato'),
      h('p', { class: 'nota' }, `Modificato ${data}`)),
    h('div', { class: 'riga-azioni' },
      h('button', { type: 'button', class: 'btn primario', onclick: () => vai(p.passo === PASSO_SCHEDA ? `#/p/${p.id}` : `#/p/${p.id}/${p.passo ?? 0}`) }, 'Apri'),
      h('button', { type: 'button', class: 'btn', onclick: () => esporta(normalizza(s, stato.dati).scelte, livelli, p.sessione ?? null) }, 'SALVA PG (Esporta JSON)'),
      h('button', { type: 'button', class: 'btn pericolo', onclick: () => {
        if (confirm(`Eliminare «${s.nome?.trim() || 'Senza nome'}» da questo browser? L’operazione non si annulla (esporta prima il file se vuoi conservarlo).`)) {
          archivio.elimina(p.id);
          renderHome();
        }
      } }, 'Elimina')));
}

function nuovoPersonaggio() {
  const id = archivio.nuovoId();
  if (!archivio.salva({ id, scelte: nuoveScelte(), passo: 0 })) {
    stato.messaggioHome = { tipo: 'attenzione', testo: 'Il browser non permette di salvare: il personaggio andrà perso chiudendo la pagina. Usa Esporta per conservarlo.' };
  }
  stato.id = null;
  vai(`#/p/${id}/0`);
}

// ---------------------------------------------------------------------------
// Wizard

function contesto() {
  const { dati, scelte } = stato;
  const scheda = calcolaScheda(scelte, dati);
  const schedaPersonaggio = calcolaScheda(personaggio(), dati);
  const ctx = {
    dati,
    scelte,
    scheda,
    schedaPersonaggio,
    livelli: stato.livelli,
    motivoNoSalita: !scheda.completa ? 'Completa la creazione (passi precedenti) prima di salire di livello.'
      : schedaPersonaggio.errori.length ? 'Correggi gli errori dei livelli (o annulla l’ultimo) prima di salire ancora.' : null,
    saliDiLivello,
    stampa: () => vai(`#/p/${stato.id}/stampa`),
    annullaUltimoLivello: annullaLivello,
    ante: anteprima(scelte, dati),
    ui: stato.ui,
    versioni: stato.versioni,
    aggiorna,
    esporta: () => esporta(stato.scelte, stato.livelli),
    ridisegnaRiepilogo,
    ridisegna: () => renderWizard(),
  };
  return ctx;
}

/** Applica una modifica alle scelte, invalida ciò che non torna più a valle e salva. */
function aggiorna(modifica, { ridisegna = true } = {}) {
  // Con livelli acquisiti la creazione è bloccata: cambiarla renderebbe incoerenti i livelli.
  const bloccati = Object.keys(modifica).filter((k) => !CAMPI_LIBERI_DOPO_LIVELLI.includes(k));
  if (stato.livelli.length && bloccati.length) {
    stato.avvisi = [`La creazione è bloccata perché il personaggio è ${conOrdinale('al', 1 + stato.livelli.length)} livello. Per cambiarla annulla prima i livelli dalla scheda finale.`];
    stato.precedente = null;
    return renderWizard();
  }
  const prima = stato.scelte;
  const { scelte, avvisi } = applicaModifica(prima, modifica, stato.dati);
  stato.scelte = scelte;
  if (avvisi.length) {
    stato.avvisi = avvisi;
    stato.precedente = prima;
  } else if (ridisegna) {
    stato.avvisi = [];
    stato.precedente = null;
  }
  persisti();
  if (ridisegna || avvisi.length) renderWizard();
  else ridisegnaRiepilogo();
}

function annulla() {
  stato.scelte = stato.precedente;
  stato.precedente = null;
  stato.avvisi = [];
  persisti();
  renderWizard();
}

function ridisegnaRiepilogo() {
  const vecchio = radice.querySelector('.riepilogo');
  if (vecchio) vecchio.replaceWith(renderRiepilogo(contesto()));
}

function renderWizard() {
  nascondiTooltip();
  const ctx = contesto();
  const visibili = PASSI.map((_, i) => i).filter((i) => passoVisibile(i, ctx));
  if (!visibili.includes(stato.passo)) stato.passo = visibili.find((i) => i > stato.passo) ?? visibili.at(-1);
  const passo = PASSI[stato.passo];
  const requisito = requisitoPasso(stato.passo, ctx);
  const pos = visibili.indexOf(stato.passo);
  const prec = visibili[pos - 1];
  const succ = visibili[pos + 1];
  const requisitoSucc = succ === undefined ? null : requisitoPasso(succ, ctx);
  document.title = `${stato.scelte.nome.trim() || 'Nuovo personaggio'} — ${passo.titolo} · Mutant`;

  const nav = h('nav', { class: 'passi', 'aria-label': 'Passi della creazione' },
    h('ol', {}, visibili.map((i, n) => {
      const p = PASSI[i];
      const req = requisitoPasso(i, ctx);
      const completo = !req && p.completo(ctx);
      return h('li', {}, h('button', {
        type: 'button',
        class: `passo-link${i === stato.passo ? ' attuale' : ''}${completo ? ' completo' : ''}`,
        'aria-current': i === stato.passo ? 'step' : null,
        disabled: !!req && i !== stato.passo,
        title: req ?? (completo ? 'Completo' : 'Da completare'),
        onclick: () => vaiAlPasso(i),
      }, h('span', { class: 'num' }, completo ? '✓' : String(n)), h('span', { class: 'etichetta-passo' }, p.titolo)));
    })));

  const avvisi = stato.avvisi.length ? h('div', { class: 'riquadro attenzione avvisi', role: 'alert' },
    h('p', {}, h('strong', {}, stato.precedente ? 'La modifica ha cambiato scelte successive:' : 'Attenzione:')),
    h('ul', {}, stato.avvisi.map((a) => h('li', {}, a))),
    h('div', { class: 'riga-azioni' },
      stato.precedente ? h('button', { type: 'button', class: 'btn', onclick: annulla }, 'Annulla la modifica') : null,
      h('button', { type: 'button', class: 'btn', onclick: () => { stato.avvisi = []; stato.precedente = null; renderWizard(); } }, 'Ho capito'))) : null;

  const corpo = requisito
    ? [h('p', { class: 'nota errore' }, requisito)]
    : passo.render(ctx);

  svuota(radice, h('div', { class: 'wizard' },
    nav,
    h('div', { class: 'layout' },
      h('section', { class: 'passo', 'aria-labelledby': 'titolo-passo' },
        h('header', { class: 'passo-testa' },
          h('p', { class: 'sopratitolo' }, `Passo ${pos} di ${visibili.length - 1} · ${passo.rif}`),
          h('h1', { id: 'titolo-passo' }, passo.titolo)),
        stato.salvataggioOk ? null : h('p', { class: 'riquadro errore', role: 'alert' }, testoSalvataggioFallito()),
        stato.livelli.length && stato.passo !== PASSO_SCHEDA ? h('p', { class: 'riquadro attenzione no-stampa' },
          `Personaggio ${conOrdinale('al', 1 + stato.livelli.length)} livello: la creazione si può consultare ma non modificare (tranne nome, Background, ritratto, anagrafica ed equipaggiamento). Per cambiarla annulla i livelli dalla scheda finale.`) : null,
        avvisi,
        corpo,
        h('footer', { class: 'passo-piede no-stampa' },
          prec !== undefined ? h('button', { type: 'button', class: 'btn', onclick: () => vaiAlPasso(prec) }, '← Indietro')
            : h('button', { type: 'button', class: 'btn', onclick: () => vai('#/') }, '← Personaggi'),
          succ !== undefined
            ? h('button', { type: 'button', class: 'btn primario', disabled: !!requisitoSucc, title: requisitoSucc, onclick: () => vaiAlPasso(succ) },
              `${PASSI[succ].titolo} →`)
            : h('button', { type: 'button', class: 'btn', onclick: () => vai('#/') }, 'Torna ai personaggi'),
          requisitoSucc ? h('small', { class: 'motivo' }, requisitoSucc) : null)),
      renderRiepilogo(ctx))));
  // Su telefono la barra dei passi scorre: tiene visibile il passo corrente.
  // (solo scorrimento orizzontale della barra: la pagina non deve saltare)
  const attuale = nav.querySelector('.attuale');
  if (attuale && nav.scrollWidth > nav.clientWidth) {
    const a = attuale.getBoundingClientRect();
    const n = nav.getBoundingClientRect();
    nav.scrollLeft += a.left + a.width / 2 - (n.left + n.width / 2);
  }
}

// ---------------------------------------------------------------------------
// Sali di livello (cap. 8): bozza in memoria, salvata solo con "Conferma"

function saliDiLivello() {
  stato.sali = { voce: {}, passo: 0, ui: { aperti: new Set(), filtroTalenti: null } };
  vai(`#/p/${stato.id}/sali/0`);
}

/** Massimi di sessione del personaggio attuale (null se la scheda non si calcola). */
function massimiAttuali() {
  const scheda = calcolaScheda(personaggio(), stato.dati);
  return scheda.caratteristiche ? massimiSessione(scheda, stato.scelte, stato.dati) : null;
}

/** Cambia i livelli e porta PV e PM attuali insieme ai massimi (sessioneDopoLivello). */
function cambiaLivelli(livelli) {
  const prima = massimiAttuali();
  stato.livelli = livelli;
  const dopo = massimiAttuali();
  if (prima && dopo && stato.sessione) stato.sessione = sessioneDopoLivello(stato.sessione, prima, dopo);
}

function annullaLivello() {
  const n = 1 + stato.livelli.length;
  if (!stato.livelli.length || !confirm(`Annullare ${conOrdinale('il', n)} livello? Le sue scelte andranno perse (si torna ${conOrdinale('al', n - 1)} livello).`)) return;
  cambiaLivelli(annullaUltimoLivello(personaggio()).livelli);
  persisti();
  stato.messaggioScheda = { tipo: 'ok', testo: `${n}° livello annullato.` };
  renderScheda();
}

function apriSali(passo) {
  if (!stato.sali) stato.sali = { voce: {}, passo: 0, ui: { aperti: new Set(), filtroTalenti: null } };
  stato.sali.passo = passo;
  renderSaliPagina();
  window.scrollTo(0, 0);
}

function renderSaliPagina() {
  nascondiTooltip();
  const { dati } = stato;
  const bozza = stato.sali;
  document.title = `${stato.scelte.nome.trim() || 'Personaggio'} — Sali al livello ${2 + stato.livelli.length} · Mutant`;
  svuota(radice, ...renderSali({
    dati,
    personaggio: personaggio(),
    voce: bozza.voce,
    passo: bozza.passo,
    ui: bozza.ui,
    aggiornaVoce(modifica) {
      const voce = { ...bozza.voce, ...modifica };
      // le chiavi vuote si tolgono: il motore rifiuta le scelte non previste dal livello
      for (const [k, v] of Object.entries(voce)) {
        if (v === undefined || v === null || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length) || (Array.isArray(v) && !v.length)) delete voce[k];
      }
      bozza.voce = voce;
      renderSaliPagina();
    },
    vaiPasso: (i) => vai(`#/p/${stato.id}/sali/${i}`),
    conferma() {
      if (validaLivello(personaggio(), bozza.voce, dati).length) return renderSaliPagina();
      cambiaLivelli(applicaLivello(personaggio(), bozza.voce).livelli);
      stato.sali = null;
      stato.passo = PASSO_SCHEDA;
      persisti();
      if (!stato.salvataggioOk) alert(`Livello aggiunto, ma non salvato nel browser. ${testoSalvataggioFallito()}`);
      vai(`#/p/${stato.id}`);
    },
    esci() {
      if (bozzaModificata() && !confirm(MSG_USCITA)) return;
      stato.sali = null;
      vai(`#/p/${stato.id}`);
    },
  }));
}

// ---------------------------------------------------------------------------
// Vista di stampa: quattro fogli A4 orizzontali dai soli valori calcolati

function apriStampa() {
  nascondiTooltip();
  document.title = `${stato.scelte.nome.trim() || 'Personaggio'} — Stampa · Mutant`;
  const stampa = preparaStampa(personaggio(), stato.dati, { versioniDati: stato.versioni });
  svuota(radice, ...renderStampa({ stampa, torna: () => vai(`#/p/${stato.id}`) }));
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------------------
// Scheda a tab (#/p/<id>) e modalità tavolo

function apriScheda(tab) {
  if (tab) stato.tab = tab;
  stato.passo = PASSO_SCHEDA;
  persisti();
  renderScheda();
  window.scrollTo(0, 0);
}

/** Cambia tab senza aggiungere voci alla cronologia: il tasto Indietro non scorre le tab. */
function vaiTab(id) {
  stato.tab = id;
  history.replaceState(null, '', `#/p/${stato.id}/t/${id}`);
  renderScheda();
  window.scrollTo(0, 0);
}

function renderScheda({ mantieniScorrimento = false } = {}) {
  nascondiTooltip();
  const y = window.scrollY;
  const { dati } = stato;
  // le tab mostrano i valori effettivi con le condizioni della sessione; la stampa no
  const tab = preparaTab(personaggio(), dati, { sessione: stato.sessione });
  document.title = `${stato.scelte.nome.trim() || 'Personaggio'} — Scheda · Mutant`;
  if (!tab.tab.length) {
    svuota(radice, h('section', { class: 'passo' },
      h('h1', {}, stato.scelte.nome.trim() || 'Personaggio'),
      h('p', { class: 'nota errore' }, 'La scheda non si può ancora calcolare: completa la creazione.'),
      h('button', { type: 'button', class: 'btn primario', onclick: () => vaiAlPasso(0) }, 'Continua la creazione')));
    return;
  }
  const massimi = massimiSessione(tab.scheda, stato.scelte, dati);
  // Se i massimi sono cambiati (nuovo livello, tabella modificata) i valori attuali si limitano,
  // senza riazzerarli; alla prima apertura la sessione si inizializza ai massimi.
  const allineata = allineaSessione(stato.sessione, massimi);
  if (JSON.stringify(allineata) !== JSON.stringify(stato.sessione)) {
    stato.sessione = allineata;
    persisti();
  }
  const attiva = tab.tab.some((t) => t.id === stato.tab) ? stato.tab : 'identita';
  const impostazioni = archivio.leggiImpostazioni();
  applicaSfondo(stato.sfondi.find((s) => s.id === impostazioni.sfondo)?.url ?? null);
  const schedaCreazione = calcolaScheda(stato.scelte, dati);
  const messaggio = stato.messaggioScheda;
  stato.messaggioScheda = null;

  // Ogni modifica di sessione salva subito e tiene da parte lo stato precedente per «Annulla».
  const cambiaSessione = (nuova, { ridisegna = true } = {}) => {
    if (!nuova) return;
    stato.sessionePrecedente = stato.sessione;
    stato.sessione = nuova;
    persisti();
    if (ridisegna) renderScheda({ mantieniScorrimento: true });
  };

  svuota(radice, ...renderTab({
    dati,
    tab,
    attiva,
    scelte: stato.scelte,
    livelli: stato.livelli,
    sessione: stato.sessione,
    massimi,
    penalita: penalitaSessione(stato.sessione, dati),
    posizione: impostazioni.posizioneTab,
    larghezza: impostazioni.larghezzaScheda,
    sfondi: stato.sfondi,
    sfondo: impostazioni.sfondo,
    ritrattoIntestazione: impostazioni.ritrattoIntestazione,
    puoAnnullareSessione: !!stato.sessionePrecedente,
    motivoNoSalita: !schedaCreazione.completa ? 'Completa la creazione prima di salire di livello.'
      : tab.errori.length ? 'Correggi gli errori dei livelli (o annulla l’ultimo) prima di salire ancora.' : null,
    messaggio: messaggio ?? (stato.salvataggioOk ? null : { tipo: 'errore', testo: testoSalvataggioFallito() }),
    passi: { background: 0, equipaggiamento: PASSO_EQUIPAGGIAMENTO },
    ui: stato.ui,
    azioni: {
      vaiTab,
      sali: saliDiLivello,
      annullaLivello,
      stampa: () => vai(`#/p/${stato.id}/stampa`),
      esporta: () => esporta(stato.scelte, stato.livelli, stato.sessione),
      modificaCreazione: (passo = 0) => vaiAlPasso(passo),
      nuovaSessione: () => {
        if (!confirm('Nuova sessione: PV e PM tornano ai massimi, Stati, Ferite e Affaticamento si azzerano. Note, Punti Eroe e Distintivi restano. Procedere?')) return;
        cambiaSessione(nuovaSessione(stato.sessione, massimi));
      },
      annullaSessione: () => {
        if (!stato.sessionePrecedente) return;
        stato.sessione = stato.sessionePrecedente;
        stato.sessionePrecedente = null;
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      varia: (campo, delta) => cambiaSessione(variaSessione(stato.sessione, campo, delta, massimi)),
      imposta: (campo, valore) => cambiaSessione(modificaSessione(stato.sessione, { [campo]: valore }, massimi)),
      commutaStato: (id) => cambiaSessione(commutaStato(stato.sessione, id, massimi)),
      convertiDistintivi: () => cambiaSessione(convertiDistintivi(stato.sessione, massimi)),
      // le note si salvano a ogni tasto; l'annullamento riporta al testo di prima della modifica
      inizioNote: () => { stato.sessionePrecedente = stato.sessione; },
      note: (testo) => {
        stato.sessione = modificaSessione(stato.sessione, { note: testo }, massimi);
        persisti();
      },
      // equipaggiamento: modificabile anche con livelli acquisiti (campo descrittivo della creazione)
      equipaggiamento: (voci) => {
        const { scelte, avvisi } = applicaModifica(stato.scelte, { equipaggiamento: voci }, dati);
        stato.scelte = scelte;
        if (avvisi.length) stato.messaggioScheda = { tipo: 'attenzione', testo: avvisi.join(' ') };
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      ridisegna: () => renderScheda({ mantieniScorrimento: true }),
      munizioni: (uid, campo, delta) => cambiaSessione(variaMunizioni(stato.sessione, uid, campo, delta, massimi)),
      ricarica: (uid) => cambiaSessione(ricaricaArma(stato.sessione, uid, massimi)),
      chroma: (uid, delta) => cambiaSessione(variaChroma(stato.sessione, uid, delta, massimi)),
      puntiEsperienza: (valore) => {
        stato.scelte = applicaModifica(stato.scelte, { puntiEsperienza: valore }, dati).scelte;
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      posizione: (valore) => {
        archivio.salvaImpostazioni({ ...archivio.leggiImpostazioni(), posizioneTab: valore });
        renderScheda({ mantieniScorrimento: true });
      },
      larghezza: (valore) => {
        archivio.salvaImpostazioni({ ...archivio.leggiImpostazioni(), larghezzaScheda: valore });
        renderScheda({ mantieniScorrimento: true });
      },
      sfondo: (valore) => {
        archivio.salvaImpostazioni({ ...archivio.leggiImpostazioni(), sfondo: valore });
        renderScheda({ mantieniScorrimento: true });
      },
      ritrattoIntestazione: (valore) => {
        archivio.salvaImpostazioni({ ...archivio.leggiImpostazioni(), ritrattoIntestazione: valore });
        renderScheda({ mantieniScorrimento: true });
      },
    },
  }));
  if (mantieniScorrimento) window.scrollTo(0, y);
}
