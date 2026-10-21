// Riga di stato del tablet (21/10/2026, lotto «il tablet è una vista, non un proprietario», parte D): monta una
// volta, fuori da #app (come la fascia «Copia di lavoro», src/ui/copia-di-lavoro.js), così resta anche quando la
// pagina cambia. Solo con il server e fuori dal PC del Direttore (src/ui/app.js la monta con quella condizione):
// il Direttore ha già la sua fascia e il tasto MUTANT, qui serve solo ai tablet dei giocatori.
import { h, svuota } from './dom.js';
import { apri } from './finestrella.js';
import { avviso, avvisoErrore } from './avvisi.js';
import { rigaStatoTablet, motivoOffline } from '../stato-tablet.js';
import { idPersonaggio } from '../storico-personaggi.js';
import { chiaveDaFile, ultimiPerPg } from '../cartella.js';
import { leggiAssociazione, scegliAssociazione } from './dispositivo.js';
import { elencoCartella } from './cartella.js';

let dati = null;
let pg = null; // { pgId, pgNome } | null: null anche finché il primo controllo non è arrivato
let collegamento = { ok: true, ultimoOk: Date.now() };
let pgAperto = null; // l'identificativo del PG che la scheda sta mostrando adesso (src/ui/app.js → impostaPgAperto)
let elemento = null;
let timer = null;
let scegliendo = false; // la finestrella è aperta: non riaprirla una seconda volta dal poll

/** Il tablet può modificare adesso quello che sta mostrando? false offline, o guardando un PG che non è il
    proprio (parte C: «gli altri li vede, in sola lettura»). */
export const puoModificare = () => {
  if (!dati) return true;
  if (!rigaStatoTablet({ pg, collegamento }, dati).modificabile) return false;
  return !pg || !pgAperto || pgAperto === pg.pgId;
};
/** Il motivo da mettere nel titolo di un comando spento. */
export function motivoSpento() {
  if (!dati) return '';
  if (!rigaStatoTablet({ pg, collegamento }, dati).modificabile) return motivoOffline(dati);
  return 'Questo tablet può scrivere solo il personaggio che ha scelto: qui stai solo guardando.';
}
/** Il personaggio di questo tablet (null se non ha ancora scelto), per aprirlo da solo all'avvio. */
export const pgDiQuestoTablet = () => pg;
/** La scheda apre un personaggio (o nessuno): src/ui/app.js lo dichiara, per il gate del punto sopra. */
export function impostaPgAperto(pgId) { pgAperto = pgId ?? null; applica(); }

function applica() {
  if (!elemento) return;
  const r = rigaStatoTablet({ pg, collegamento }, dati);
  elemento.className = `fascia-stato-tablet stato-${r.stato}`;
  svuota(elemento,
    h('span', {}, r.testo),
    r.stato === 'senza_pg' ? h('button', { type: 'button', class: 'btn btn-piccolo', onclick: apriScelta }, 'Scegli') : null,
    r.stato !== 'senza_pg' && pg ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Scrivi da questo tablet un altro personaggio', onclick: apriScelta }, 'Cambia') : null,
  );
  // comandi spenti offline, o guardando un PG che non è il proprio (parte C/D, temporaneo finché non c'è il
  // lotto del rientro): un gate largo, non comando per comando — ogni singolo pulsante avrebbe richiesto di
  // toccare l'intera interfaccia della scheda
  document.body.classList.toggle('tablet-sola-lettura', !puoModificare());
}

async function scegliScheda() {
  const lista = await elencoCartella();
  if (!lista) { avvisoErrore('Il server non risponde: riprova fra poco.'); return null; }
  return ultimiPerPg(lista)
    .map((f) => ({ pgId: idPersonaggio({ pg: f.pg }, chiaveDaFile(f.file)), nome: f.nome, livello: f.livello }))
    .filter((x) => x.pgId);
}

function finestrellaScelta(elenco, attuale) {
  return apri('scegli-pg', 'Scegli il tuo personaggio', (fine) => [
    h('p', { class: 'nota' }, 'Da questo tablet potrai scrivere solo questo personaggio. Gli altri li vedrai, se la vista lo permette, in sola lettura. Puoi cambiare scelta in ogni momento.'),
    elenco.length
      ? h('ul', { class: 'elenco-scelta-pg' }, elenco.map((p) => h('li', {},
          h('button', { type: 'button', class: `btn${p.pgId === attuale ? ' primario' : ''}`, onclick: () => fine(p.pgId) }, `${p.nome} (livello ${p.livello})`))))
      : h('p', {}, 'Nessun personaggio nella cartella del server: chiedi al Direttore.'),
    h('div', { class: 'riga-azioni finestrella-azioni' }, h('button', { type: 'button', class: 'btn', onclick: () => fine(null) }, 'Annulla')),
  ]);
}

async function apriScelta() {
  if (scegliendo) return;
  scegliendo = true;
  try {
    const elenco = await scegliScheda();
    if (!elenco) return;
    const scelto = await finestrellaScelta(elenco, pg?.pgId ?? null);
    if (!scelto) return;
    const r = await scegliAssociazione(scelto);
    pg = r;
    applica();
    avviso(`Questo tablet ora mostra e può modificare «${r.pgNome ?? scelto}».`, { tipo: 'ok' });
    // un cambio di personaggio con una scheda diversa già aperta non ha senso restarci sopra: torna alla pagina iniziale
    if (location.hash.startsWith('#/p/')) location.hash = '#/';
  } catch (e) {
    avvisoErrore(`Scelta non riuscita: ${e.message}`);
  } finally {
    scegliendo = false;
  }
}

async function aggiorna() {
  const lista = await elencoCartella();
  const adesso = Date.now();
  if (lista) {
    collegamento = { ok: true, ultimoOk: adesso };
    pg = await leggiAssociazione();
  } else {
    collegamento = { ok: false, ultimoOk: collegamento.ultimoOk ?? adesso };
  }
  applica();
}

/** Monta la fascia (una volta sola) e avvia il controllo periodico e al ritorno in primo piano. */
export function montaStatoTablet(datiCaricati, { documento = document } = {}) {
  dati = datiCaricati;
  const gia = documento.getElementById('fascia-stato-tablet');
  if (gia) { elemento = gia; return elemento; }
  elemento = h('div', { id: 'fascia-stato-tablet', class: 'fascia-stato-tablet', role: 'status' });
  const copia = documento.getElementById('fascia-copia-di-lavoro');
  if (copia) copia.after(elemento); else documento.body.prepend(elemento);
  aggiorna();
  const T = dati.regole.interfaccia.dispositivo;
  timer = setInterval(aggiorna, Math.max(5, Number(T.intervallo_controllo_s) || 15) * 1000);
  // «quando il tablet torna in primo piano dopo essere stato in secondo piano o in stand-by, richiede lo stato
  // aggiornato» (parte B): niente da aspettare per il prossimo giro del timer
  documento.addEventListener('visibilitychange', () => { if (documento.visibilityState === 'visible') aggiorna(); });
  return elemento;
}
