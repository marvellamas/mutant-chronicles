// Avvio dell'app: carica e valida i dati, poi mostra home o wizard.
// Stato: un solo oggetto "scelte" per il personaggio aperto; tutto il resto si ricalcola
// a ogni disegno con calcolaScheda / anteprima.
import { caricaDati } from '../rules.js';
import { formattaErrore, trovaTodo } from '../validate.js';
import { calcolaScheda } from '../calc.js';
import { nuoveScelte, normalizza, applicaModifica, anteprima, serializza, deserializza } from '../character.js';
import { h, svuota, scaricaFile, nomeFileSicuro } from './dom.js';
import * as archivio from './storage.js';
import { PASSI, passoVisibile, requisitoPasso } from './passi.js';
import { inizializzaTooltip, nascondiTooltip } from './tooltip.js';
import { renderRiepilogo } from './riepilogo.js';

const radice = document.getElementById('app');

const stato = {
  dati: null,
  versioni: '',
  id: null,
  scelte: null,
  passo: 0,
  avvisi: [], // avvisi dell'ultima modifica che ha invalidato scelte a valle
  precedente: null, // scelte prima di quella modifica, per "Annulla"
  messaggioHome: null,
  avvisiDati: [],
  salvataggioOk: true,
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
  window.addEventListener('hashchange', daIndirizzo);
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

function daIndirizzo() {
  const m = location.hash.match(/^#\/p\/([\w-]+)\/(\d+)$/);
  if (!m) {
    stato.id = null;
    stato.scelte = null;
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
    stato.avvisi = avvisi.length ? ['Il personaggio salvato non era più coerente con i dati attuali:', ...avvisi] : [];
    stato.precedente = null;
    stato.ui.aperti.clear();
    stato.ui.tiroPE = null;
    if (avvisi.length) persisti();
  }
  const passo = Math.min(Number(passoTesto), PASSI.length - 1);
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

// ---------------------------------------------------------------------------
// Persistenza

function persisti() {
  if (!stato.id) return;
  stato.salvataggioOk = archivio.salva({ id: stato.id, scelte: stato.scelte, passo: stato.passo });
}

function esporta(scelte) {
  const versioniDatiFile = Object.fromEntries(Object.entries(stato.dati).map(([k, v]) => [k, v.versione_manuale]));
  scaricaFile(nomeFileSicuro(scelte.nome), serializza(scelte, { versioniDati: versioniDatiFile }));
}

async function importa(file) {
  try {
    const grezze = deserializza(await file.text());
    const { scelte, avvisi } = normalizza(grezze, stato.dati);
    const id = archivio.nuovoId();
    if (!archivio.salva({ id, scelte, passo: 0 })) throw new Error('Impossibile salvare nel browser (spazio o permessi).');
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
    h('p', { class: 'nota' }, 'I personaggi si salvano automaticamente in questo browser. Per spostarli su un altro dispositivo o passarli al master, usa Esporta e Importa.'),
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
  const data = p.aggiornato ? new Date(p.aggiornato).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '';
  return h('li', { class: 'carta personaggio' },
    h('div', {},
      h('h2', {}, s.nome?.trim() || 'Senza nome'),
      h('p', {}, [s.corporazione, s.addestramento, s.classe].filter(Boolean).join(' · ') || 'Appena iniziato'),
      h('p', { class: 'nota' }, `Modificato ${data}`)),
    h('div', { class: 'riga-azioni' },
      h('button', { type: 'button', class: 'btn primario', onclick: () => vai(`#/p/${p.id}/${p.passo ?? 0}`) }, 'Apri'),
      h('button', { type: 'button', class: 'btn', onclick: () => esporta(normalizza(s, stato.dati).scelte) }, 'Esporta'),
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
  const ctx = {
    dati,
    scelte,
    scheda: calcolaScheda(scelte, dati),
    ante: anteprima(scelte, dati),
    ui: stato.ui,
    versioni: stato.versioni,
    aggiorna,
    esporta: () => esporta(stato.scelte),
    ridisegnaRiepilogo,
  };
  return ctx;
}

/** Applica una modifica alle scelte, invalida ciò che non torna più a valle e salva. */
function aggiorna(modifica, { ridisegna = true } = {}) {
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
        stato.salvataggioOk ? null : h('p', { class: 'riquadro attenzione' }, 'Il browser non permette il salvataggio automatico: usa Esporta per non perdere il personaggio.'),
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
