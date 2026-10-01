// Avvio dell'app: carica e valida i dati, poi mostra home, wizard, scheda a tab, "Sali di
// livello" o stampa. Stato: le scelte della creazione, i livelli acquisiti (cap. 8) e i valori
// di sessione (modalità tavolo) del personaggio aperto; tutto il resto si ricalcola a ogni
// disegno con calcolaScheda / anteprima.
import { caricaDati } from '../rules.js';
import { formattaErrore, trovaTodo } from '../validate.js';
import { calcolaScheda, validaLivello } from '../calc.js';
import { separaEsemplare } from '../equipaggiamento.js';
import {
  nuoveScelte, normalizza, applicaModifica, anteprima, serializza, nomeFileEsportazione, nomeFileCalendario, deserializzaPersonaggio, applicaLivello, annullaUltimoLivello,
  CAMPI_ANAGRAFICA,
} from '../character.js';
import { h, svuota, scaricaFile } from './dom.js';
import * as archivio from './storage.js';
import { PASSI, passoVisibile, requisitoPasso } from './passi.js';
import { inizializzaTooltip, nascondiTooltip } from './tooltip.js';
import { renderRiepilogo } from './riepilogo.js';
import { renderSali } from './sali.js';
import { renderCompleta } from './completa.js';
import { validaCompletamento, applicaCompletamento, puntiDaCompletare, motivoCompletamento } from '../avanzamento.js';
import { renderStampa, esciDallaStampa } from './stampa.js';
import { barraPassi, barraFondoSeServe } from './navigazione.js';
import { cercaSfondi, applicaSfondo } from './sfondi.js';
import { caricaImmagini } from './immagini.js';
import { preparaStampa, preparaTab, normalizzaOpzioniStampa } from '../stampa.js';
import { renderTab, tabFissi, ALIAS_TAB } from './tab.js';
import {
  massimiSessione, allineaSessione, variaSessione, modificaSessione, commutaStato, commutaCondizioneOggetto, commutaTalento, commutaBonusTalenti, impostaCondizioneArma, riparaOggetto, spendiPmLancio, nuovaSessione, convertiDistintivi, sessioneDopoLivello,
  penalitaSessione, variaMunizioni, ricaricaArma, variaChroma, variaIntegrita, variaNec,
} from '../sessione.js';
import { conOrdinale } from '../lingua.js';
import { normalizzaCalendario, calendarioAttivo, attivaCalendario, disattivaCalendario, contaNote, fileCalendario, leggiFileCalendario } from '../calendario.js';
import { testoNote } from './calendario.js';

// Dopo la creazione si possono ancora cambiare solo i campi descrittivi: le altre scelte
// determinano i livelli successivi (ricognizione dell'avanzamento, §8).
const CAMPI_LIBERI_DOPO_LIVELLI = ['nome', 'concetto', 'equipaggiamento', 'dotazione', 'puntiEsperienza', 'ritratto', ...CAMPI_ANAGRAFICA.map((c) => c.campo)];
// L'ultimo passo del wizard è la scheda: si apre come vista a tab (#/p/<id>).
const PASSO_SCHEDA = PASSI.length - 1;
const PASSO_EQUIPAGGIAMENTO = PASSI.findIndex((p) => p.titolo === 'Equipaggiamento');
// tab della scheda (docs/layout-sd.md): gli otto fissi, il Calendario e i vecchi id (magia → poteri)
const TAB = ['identita', 'abilita', 'combattimento', 'poteri', 'artefatti', 'cibernetica', 'inventario', 'veicoli', 'calendario', 'magia'];

const radice = document.getElementById('app');

const stato = {
  dati: null,
  versioni: '',
  id: null,
  scelte: null,
  livelli: [], // scelte dei livelli dal 2° in poi (cap. 8)
  sali: null, // bozza del livello successivo: { voce, passo, ui }. Non si salva fino alla conferma.
  completa: null, // bozza dei Punti Abilità da completare (regole aggiornate): { punti }. Come «sali».
  sessione: null, // valori attuali della modalità tavolo (src/sessione.js); null finché non si apre la scheda
  calendario: null, // calendario di gioco (src/calendario.js); null = mai attivato
  // per «Annulla ultima modifica» (una sola, in memoria): { sessione, calendario } di prima
  precedenteTavolo: null,
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
  const versioni = document.getElementById('versioni');
  versioni.textContent = stato.versioni ? `Dati: ${stato.versioni}` : '';
  versioni.title = versioni.textContent; // la riga si tronca con «…»: il testo intero nel tooltip
  if (risultato.errori.length) return mostraErroriDati(risultato.errori);
  stato.avvisiDati = risultato.avvisi ?? [];
  inizializzaTooltip(stato.dati);
  await caricaImmagini(stato.dati);
  stato.sfondi = cercaSfondi(stato.dati.corporazioni.corporazioni);
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
  const completa = location.hash.match(/^#\/p\/([\w-]+)\/(completa)$/);
  if (stato.completa && !(completa && completa[1] === stato.id)) stato.completa = null;
  const stampa = location.hash.match(/^#\/p\/([\w-]+)\/(stampa)$/);
  const scheda = location.hash.match(/^#\/p\/([\w-]+)(?:\/t\/(\w+))?$/);
  const m = sali ?? completa ?? stampa ?? scheda ?? location.hash.match(/^#\/p\/([\w-]+)\/(\d+)$/);
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
    stato.calendario = normalizzaCalendario(salvato.calendario, stato.dati);
    stato.opzioniStampa = normalizzaOpzioniStampa(salvato.stampa);
    stato.precedenteTavolo = null;
    stato.ui.calendario = null;
    stato.ui.attivaCalendario = null;
    stato.ui.importaCalendario = null;
    stato.messaggioScheda = null;
    stato.avvisi = avvisi.length ? ['Il personaggio salvato non era più coerente con i dati attuali:', ...avvisi] : [];
    stato.precedente = null;
    stato.ui.aperti.clear();
    stato.ui.tiroPE = null;
    if (avvisi.length) persisti();
  }
  if (sali) return apriSali(Number(passoTesto));
  if (completa) return apriCompleta();
  if (stampa) return apriStampa();
  if (scheda) return apriScheda(TAB.includes(passoTesto) ? (ALIAS_TAB[passoTesto] ?? passoTesto) : null);
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
  stato.salvataggioOk = archivio.salva({ id: stato.id, scelte: stato.scelte, livelli: stato.livelli, sessione: stato.sessione, calendario: stato.calendario, stampa: stato.opzioniStampa ?? null, passo: stato.passo });
}

function esporta(scelte, livelli = [], sessione = null, calendario = null) {
  const versioniDatiFile = Object.fromEntries(Object.entries(stato.dati).map(([k, v]) => [k, v.versione_manuale]));
  scaricaFile(nomeFileEsportazione(scelte.nome, 1 + livelli.length), serializza(scelte, { versioniDati: versioniDatiFile, livelli, sessione, calendario }));
}

/** Sessione allineata ai massimi attuali (inizializzata se manca), o null se la scheda non si calcola. */
function sessioneAllineata(creazione, livelli, sessione) {
  const scheda = calcolaScheda({ creazione, livelli }, stato.dati);
  if (!scheda.caratteristiche) return sessione ?? null;
  return allineaSessione(sessione, massimiSessione(scheda, creazione, stato.dati));
}

async function importa(file) {
  try {
    const { creazione, livelli, sessione: sessioneFile, calendario: calendarioFile } = deserializzaPersonaggio(await file.text());
    const { scelte, avvisi } = normalizza(creazione, stato.dati);
    const id = archivio.nuovoId();
    // I livelli non si correggono in automatico: eventuali errori compaiono nella scheda.
    const errLivelli = livelli.length ? calcolaScheda({ creazione: scelte, livelli }, stato.dati).errori.filter((e) => e.campo.startsWith('livelli')) : [];
    if (errLivelli.length) avvisi.push(`Livelli con errori rispetto ai dati attuali: ${errLivelli[0].problema}`);
    // senza `sessione` nel file la si inizializza ai massimi; altrimenti la si limita ai massimi attuali
    const sessione = sessioneAllineata(scelte, livelli, sessioneFile);
    const calendario = normalizzaCalendario(calendarioFile, stato.dati);
    if (!archivio.salva({ id, scelte, livelli, sessione, calendario, passo: livelli.length || calcolaScheda(scelte, stato.dati).completa ? PASSO_SCHEDA : 0 })) {
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
      h('button', { type: 'button', class: 'btn', onclick: () => esporta(normalizza(s, stato.dati).scelte, livelli, p.sessione ?? null, normalizzaCalendario(p.calendario, stato.dati)) }, 'SALVA PG (Esporta JSON)'),
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
    motivoNoSalita: schedaPersonaggio.completamenti?.length ? motivoCompletamento(schedaPersonaggio.completamenti)
      : !scheda.completa ? 'Completa la creazione (passi precedenti) prima di salire di livello.'
        : schedaPersonaggio.errori.length ? 'Correggi gli errori dei livelli (o annulla l’ultimo) prima di salire ancora.' : null,
    saliDiLivello,
    stampa: () => vai(`#/p/${stato.id}/stampa`),
    annullaUltimoLivello: annullaLivello,
    ante: anteprima(scelte, dati),
    ui: stato.ui,
    versioni: stato.versioni,
    aggiorna,
    esporta: () => esporta(stato.scelte, stato.livelli, stato.sessione, stato.calendario),
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
  // la stessa barra in cima e (se il passo supera lo schermo) in fondo: src/ui/navigazione.js
  const barra = (posizione) => barraPassi({
    posizione,
    indietro: prec !== undefined ? { etichetta: '← Indietro', onclick: () => vaiAlPasso(prec) } : { etichetta: '← Personaggi', onclick: () => vai('#/') },
    avanti: succ !== undefined
      ? { etichetta: `${PASSI[succ].titolo} →`, corta: 'Avanti →', disabilitato: !!requisitoSucc, motivo: requisitoSucc, onclick: () => vaiAlPasso(succ) }
      : { etichetta: 'Torna ai personaggi', primario: false, onclick: () => vai('#/') },
  });
  const fondo = barra('fondo');

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
        barra('cima'),
        avvisi,
        corpo,
        fondo),
      renderRiepilogo(ctx))));
  barraFondoSeServe(fondo, radice);
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

// ---------------------------------------------------------------------------
// Completamento dei Punti Abilità di un evento passato (regole aggiornate, per-davide A.52):
// bozza in memoria, salvata nell'evento a cui appartiene solo con «Conferma»

function apriCompleta() {
  if (!stato.completa) stato.completa = { punti: {} };
  renderCompletaPagina();
  window.scrollTo(0, 0);
}

function renderCompletaPagina() {
  nascondiTooltip();
  const { dati } = stato;
  const bozza = stato.completa;
  document.title = `${stato.scelte.nome.trim() || 'Personaggio'} — Punti Abilità da assegnare · Mutant`;
  svuota(radice, ...renderCompleta({
    dati,
    personaggio: personaggio(),
    bozza: bozza.punti,
    titoloAvviso: dati.regole.regole_aggiornate?.punti_abilita ?? 'Regole aggiornate',
    aggiornaBozza(punti) {
      bozza.punti = punti;
      renderCompletaPagina();
    },
    conferma() {
      const ev = puntiDaCompletare(personaggio(), dati)[0];
      if (!ev || validaCompletamento(personaggio(), ev.livello, bozza.punti, dati).length) return renderCompletaPagina();
      // i punti inattivi dell'evento escono, quelli della bozza entrano (§8.3)
      const p = applicaCompletamento(personaggio(), ev.livello, bozza.punti, ev.inattivi);
      stato.scelte = p.creazione;
      stato.livelli = p.livelli;
      stato.completa = null;
      persisti();
      const restano = puntiDaCompletare(personaggio(), dati).reduce((s, c) => s + c.mancanti, 0);
      stato.messaggioScheda = { tipo: 'ok', testo: `Punti Abilità ${ev.livello === 1 ? 'della creazione' : `${conOrdinale('del', ev.livello)} livello`} ${ev.riassegna ? 'riassegnati' : 'assegnati'}.${restano ? ` Ne restano ${restano} da assegnare.` : ''}` };
      if (!stato.salvataggioOk) alert(`Punti assegnati, ma non salvati nel browser. ${testoSalvataggioFallito()}`);
      vai(`#/p/${stato.id}`);
    },
    esci() {
      stato.completa = null;
      vai(`#/p/${stato.id}`);
    },
  }));
  const fondo = radice.querySelector('.barra-fondo');
  if (fondo) barraFondoSeServe(fondo, radice);
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
  const fondoSali = radice.querySelector('.barra-fondo');
  if (fondoSali) barraFondoSeServe(fondoSali, radice);
}

// ---------------------------------------------------------------------------
// Vista di stampa: quattro fogli A4 orizzontali dai soli valori calcolati

function apriStampa() {
  nascondiTooltip();
  document.title = `${stato.scelte.nome.trim() || 'Personaggio'} — Stampa · Mutant`;
  const stampa = preparaStampa(personaggio(), stato.dati, { versioniDati: stato.versioni });
  const opzioni = normalizzaOpzioniStampa(stato.opzioniStampa);
  // le preferenze di stampa si salvano con il personaggio: ogni giocatore le ritrova come le ha lasciate
  const cambiaOpzioni = (modifica) => {
    stato.opzioniStampa = normalizzaOpzioniStampa({ ...opzioni, ...modifica });
    persisti();
    apriStampa();
  };
  svuota(radice, ...renderStampa({ stampa, opzioni, cambiaOpzioni, torna: () => vai(`#/p/${stato.id}`) }));
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
  // quinta tab, solo con il calendario attivo (non tocca preparaTab: la stampa resta com'è)
  if (tab.tab.length && calendarioAttivo(stato.calendario)) tab.tab.push({ id: 'calendario', titolo: 'Calendario', contatore: testoNote(contaNote(stato.calendario)) });
  // gli otto tab fissi (docs/layout-sd.md): preparaTab non cambia, la stampa resta com'è
  if (tab.tab.length) tab.tab = tabFissi(tab.tab);
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
  const richiesta = ALIAS_TAB[stato.tab] ?? stato.tab;
  const attiva = tab.tab.some((t) => t.id === richiesta) ? richiesta : 'identita';
  const impostazioni = archivio.leggiImpostazioni();
  applicaSfondo(stato.sfondi.find((s) => s.id === impostazioni.sfondo)?.url ?? null);
  const schedaCreazione = calcolaScheda(stato.scelte, dati);
  const messaggio = stato.messaggioScheda;
  stato.messaggioScheda = null;

  // Ogni modifica di sessione salva subito e tiene da parte lo stato precedente per «Annulla».
  const ricordaPrecedente = () => { stato.precedenteTavolo = { sessione: stato.sessione, calendario: stato.calendario }; };
  const cambiaSessione = (nuova, { ridisegna = true } = {}) => {
    if (!nuova) return;
    ricordaPrecedente();
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
    filigrana: impostazioni.filigranaCorporazione,
    puoAnnullareSessione: !!stato.precedenteTavolo,
    calendario: stato.calendario,
    spazioQuasiEsaurito: archivio.spazioQuasiEsaurito(),
    motivoNoSalita: tab.scheda.completamenti?.length ? motivoCompletamento(tab.scheda.completamenti)
      : !schedaCreazione.completa ? 'Completa la creazione prima di salire di livello.'
        : tab.errori.length ? 'Correggi gli errori dei livelli (o annulla l’ultimo) prima di salire ancora.' : null,
    // regole aggiornate (regole.json → regole_aggiornate): punti da completare e in eccesso
    avvisoRegole: dati.regole.regole_aggiornate?.punti_abilita ?? 'Regole aggiornate',
    messaggio: messaggio ?? (stato.salvataggioOk ? null : { tipo: 'errore', testo: testoSalvataggioFallito() }),
    passi: { background: 0, equipaggiamento: PASSO_EQUIPAGGIAMENTO },
    ui: stato.ui,
    azioni: {
      vaiTab,
      sali: saliDiLivello,
      completaPunti: () => vai(`#/p/${stato.id}/completa`),
      annullaLivello,
      stampa: () => vai(`#/p/${stato.id}/stampa`),
      esporta: () => esporta(stato.scelte, stato.livelli, stato.sessione, stato.calendario),
      modificaCreazione: (passo = 0) => vaiAlPasso(passo),
      nuovaSessione: () => {
        if (!confirm('Nuova sessione: PV e PM tornano ai massimi, Stati, Ferite e Affaticamento si azzerano. Note, Punti Eroe e Distintivi restano. Procedere?')) return;
        cambiaSessione(nuovaSessione(stato.sessione, massimi));
      },
      annullaSessione: () => {
        if (!stato.precedenteTavolo) return;
        ({ sessione: stato.sessione, calendario: stato.calendario } = stato.precedenteTavolo);
        stato.precedenteTavolo = null;
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      varia: (campo, delta) => cambiaSessione(variaSessione(stato.sessione, campo, delta, massimi)),
      imposta: (campo, valore) => cambiaSessione(modificaSessione(stato.sessione, { [campo]: valore }, massimi)),
      commutaStato: (id) => cambiaSessione(commutaStato(stato.sessione, id, massimi)),
      condizioneOggetto: (uid) => cambiaSessione(commutaCondizioneOggetto(stato.sessione, uid, massimi)),
      // Talenti (docs/censimento-talenti.md): situazionali e interruttore globale
      talento: (chiave) => cambiaSessione(commutaTalento(stato.sessione, chiave, massimi)),
      bonusTalenti: () => cambiaSessione(commutaBonusTalenti(stato.sessione, massimi)),
      condizioneArma: (uid, id) => cambiaSessione(impostaCondizioneArma(stato.sessione, uid, id, massimi)),
      ripara: (uid, piNuovi, costo) => cambiaSessione(riparaOggetto(stato.sessione, uid, piNuovi, costo, massimi)),
      // pannello «Attacca!»: le scelte si ricordano senza diventare «l'ultima modifica» da annullare;
      // «Spara» sì, così «Annulla» lo copre
      ricordaAttacco: (uid, scelte) => {
        stato.sessione = modificaSessione(stato.sessione, { attacchi: { ...(stato.sessione?.attacchi ?? {}), [uid]: scelte } }, massimi);
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      spara: (uid, munizioni) => cambiaSessione(variaMunizioni(stato.sessione, uid, 'colpi', -munizioni, massimi)),
      // pannello «Lancia!»: come per l'attacco, le scelte si ricordano senza diventare l'ultima modifica
      ricordaLancio: (nome, scelte) => {
        stato.sessione = modificaSessione(stato.sessione, { lanci: { ...(stato.sessione?.lanci ?? {}), [nome]: scelte } }, massimi);
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      lancia: (fonte) => cambiaSessione(spendiPmLancio(stato.sessione, fonte, massimi)),
      convertiDistintivi: () => cambiaSessione(convertiDistintivi(stato.sessione, massimi)),
      // le note si salvano a ogni tasto; l'annullamento riporta al testo di prima della modifica
      inizioNote: ricordaPrecedente,
      // calendario: ogni modifica (note, «Avanza», attivazione) salva ed è annullabile
      cambiaCalendario: (nuovo, { tab: vaiA = null } = {}) => {
        if (!nuovo) return;
        ricordaPrecedente();
        stato.calendario = nuovo;
        persisti();
        if (vaiA) return vaiTab(vaiA);
        renderScheda({ mantieniScorrimento: true });
      },
      // file del solo calendario (src/calendario.js → fileCalendario): l'export del personaggio non cambia
      esportaCalendario: () => {
        if (stato.calendario) scaricaFile(nomeFileCalendario(stato.scelte.nome), `${JSON.stringify(fileCalendario(stato.calendario, stato.scelte.nome), null, 2)}\n`);
      },
      // import: prima si legge e si controlla il file, poi un riquadro chiede conferma (ui.importaCalendario)
      leggiCalendario: async (file) => {
        stato.ui.importaCalendario = leggiFileCalendario(await file.text(), dati);
        renderScheda({ mantieniScorrimento: true });
      },
      confermaCalendario: () => {
        const r = stato.ui.importaCalendario;
        stato.ui.importaCalendario = null;
        if (!r?.ok) return renderScheda({ mantieniScorrimento: true });
        ricordaPrecedente();
        stato.calendario = r.calendario;
        persisti();
        vaiTab('calendario');
      },
      annullaImportCalendario: () => {
        stato.ui.importaCalendario = null;
        renderScheda({ mantieniScorrimento: true });
      },
      // ingranaggio: la prima attivazione chiede inizio e fascia (pannello); poi si accende e spegne
      calendarioAttivo: (attivo) => {
        if (attivo && !stato.calendario) {
          const oggi = new Date();
          const due = (n) => String(n).padStart(2, '0');
          stato.ui.attivaCalendario = { inizio: `${oggi.getFullYear()}-${due(oggi.getMonth() + 1)}-${due(oggi.getDate())}`, fascia: dati.regole.calendario.fasce[0].id };
          return renderScheda({ mantieniScorrimento: true });
        }
        ricordaPrecedente();
        stato.calendario = attivo ? attivaCalendario(stato.calendario, {}, dati) : disattivaCalendario(stato.calendario);
        persisti();
        if (attivo) return vaiTab('calendario');
        if (stato.tab === 'calendario') return vaiTab('identita');
        renderScheda({ mantieniScorrimento: true });
      },
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
      // tab Inventario (docs/layout-sd.md, pezzo 2): acquisto al tavolo, oggetto e crediti insieme
      compra: (voce, costo) => {
        const { scelte, avvisi } = applicaModifica(stato.scelte, { equipaggiamento: [...stato.scelte.equipaggiamento, voce] }, dati);
        stato.scelte = scelte;
        stato.sessione = variaSessione(stato.sessione, 'crediti', -costo, massimi);
        stato.messaggioScheda = avvisi.length ? { tipo: 'attenzione', testo: avvisi.join(' ') } : null;
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      ridisegna: () => renderScheda({ mantieniScorrimento: true }),
      // tab Cibernetica: perdite annullate per errore e recuperi concessi dal Direttore (Giocatore §5.21)
      umanita: (blocco) => {
        stato.scelte = applicaModifica(stato.scelte, { umanita: blocco }, dati).scelte;
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      // A.47: separa un esemplare danneggiato dal gruppo, con 1 PI in meno
      danneggiaEsemplare: (uid) => {
        const { voci, uid: nuovo } = separaEsemplare(stato.scelte.equipaggiamento, uid);
        if (!nuovo) return;
        stato.scelte = applicaModifica(stato.scelte, { equipaggiamento: voci }, dati).scelte;
        const m2 = massimiSessione(calcolaScheda(personaggio(), dati), stato.scelte, dati);
        stato.sessione = variaIntegrita(allineaSessione(stato.sessione, m2), nuovo, -1, m2);
        persisti();
        renderScheda({ mantieniScorrimento: true });
      },
      munizioni: (uid, campo, delta) => cambiaSessione(variaMunizioni(stato.sessione, uid, campo, delta, massimi)),
      ricarica: (uid) => cambiaSessione(ricaricaArma(stato.sessione, uid, massimi)),
      chroma: (uid, delta) => cambiaSessione(variaChroma(stato.sessione, uid, delta, massimi)),
      integrita: (uid, delta) => cambiaSessione(variaIntegrita(stato.sessione, uid, delta, massimi)),
      // riserva di un NEC (Equipaggiamento §5.4): ore, usi o Lx
      nec: (chiave, delta) => cambiaSessione(variaNec(stato.sessione, chiave, delta, massimi)),
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
      filigrana: (valore) => {
        archivio.salvaImpostazioni({ ...archivio.leggiImpostazioni(), filigranaCorporazione: valore });
        renderScheda({ mantieniScorrimento: true });
      },
    },
  }));
  if (mantieniScorrimento) window.scrollTo(0, y);
}
