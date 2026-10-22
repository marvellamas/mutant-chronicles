// Riga di stato del tablet (21/10/2026, lotto «il tablet è una vista, non un proprietario», parte D; estesa lo
// stesso giorno, quarto lotto, «si può modificare offline, e al rientro Davide approva»): monta una volta,
// fuori da #app (come la fascia «Copia di lavoro»), così resta anche quando la pagina cambia. Solo con il
// server e fuori dal PC del Direttore: il Direttore ha già la sua fascia e il tasto MUTANT.
import { h, svuota } from './dom.js';
import { apri } from './finestrella.js';
import { avviso, avvisoErrore } from './avvisi.js';
import { rigaStatoTablet, motivoSolaLettura } from '../stato-tablet.js';
import { idPersonaggio } from '../storico-personaggi.js';
import { chiaveDaFile, ultimiPerPg, fileDiPgStabile } from '../cartella.js';
import { leggiAssociazione, scegliAssociazione } from './dispositivo.js';
import { elencoCartella, inviaGiornale } from './cartella.js';
import { leggiCoda, togliDallaCoda, confermaRisposta, inCoda as contaInCoda } from './coda-offline.js';

let dati = null;
let pg = null; // { pgId, pgNome } | null: null anche finché il primo controllo non è arrivato
let collegamento = { ok: true, ultimoOk: Date.now() };
let pgAperto = null; // l'identificativo del PG che la scheda sta mostrando adesso (src/ui/app.js → impostaPgAperto)
let elemento = null;
let timer = null;
let scegliendo = false; // la finestrella è aperta: non riaprirla una seconda volta dal poll
let codaVisibile = false;
let inviandoGiornale = false;
let ricaricaScheda = null; // src/ui/app.js la fornisce: rilegge la scheda aperta dal server

/** Come si rilegge la scheda dal server, quando il Direttore ha risposto (src/ui/app.js → ricaricaDaCartella). */
export function impostaRicaricaScheda(fn) { ricaricaScheda = fn; }

/** Il tablet può modificare adesso quello che sta mostrando? L'unico motivo di sola lettura (parte C): guardare
    un personaggio che non è il proprio — sempre, online o offline (dal 21/10 pomeriggio l'offline non spegne
    più i comandi: si accodano, src/ui/coda-offline.js). */
export const puoModificare = () => !pg || !pgAperto || pgAperto === pg.pgId;
/** Il server non risponde adesso? src/ui/app.js la usa per accodare invece di tentare una scrittura che
    fallirebbe comunque (parte B). false finché il monitoraggio non è partito (non un tablet, o server assente). */
export const eOffline = () => !collegamento.ok && dati !== null;
/** Il motivo da mettere nel titolo di un comando spento. */
export const motivoSpento = () => (dati ? motivoSolaLettura(dati) : '');
/** Il personaggio di questo tablet (null se non ha ancora scelto), per aprirlo da solo all'avvio. */
export const pgDiQuestoTablet = () => pg;
/** La scheda apre un personaggio (o nessuno): src/ui/app.js lo dichiara, per il gate del punto sopra. */
export function impostaPgAperto(pgId) { pgAperto = pgId ?? null; applica(); }

function righeCoda() {
  if (!pg) return [];
  return leggiCoda(pg.pgId);
}

function pannelloCoda() {
  const righe = righeCoda();
  if (!righe.length) return null;
  // la ✕ c'è solo finché la riga non è partita: «togliere una riga prima che arrivi al Direttore». Una volta
  // mandata, la decisione è sua — toglierla di qui non la toglierebbe dalla sua schermata, la nasconderebbe
  // soltanto al giocatore.
  const partite = collegamento.ok;
  return h('div', { class: 'coda-offline-pannello' },
    h('p', { class: 'nota' }, partite
      ? 'Mandate al Direttore: le vedrà nella sua schermata di rientro e deciderà se tenerle. Qui restano finché non risponde.'
      : 'In attesa: partiranno quando torni collegato. Hai sbagliato tocco? Toglila prima che arrivi al Direttore.'),
    h('ul', { class: 'coda-offline-elenco' }, righe.map((op) => h('li', {},
      h('span', {}, op.etichetta), h('small', { class: 'nota' }, ` (${new Date(op.quando).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })})`),
      partite ? null : h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Togli questa modifica dalla coda', onclick: () => { togliDallaCoda(pg.pgId, op.id); applica(); } }, '✕')))));
}

function applica() {
  if (!elemento) return;
  const n = pg ? contaInCoda(pg.pgId) : 0;
  const r = rigaStatoTablet({ pg, collegamento, inCoda: n }, dati);
  elemento.className = `fascia-stato-tablet stato-${r.stato}`;
  svuota(elemento,
    h('div', { class: 'fascia-stato-tablet-riga' },
      h('span', {}, r.testo),
      n > 0 ? h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => { codaVisibile = !codaVisibile; applica(); } }, `${codaVisibile ? 'Nascondi' : 'Vedi'} la coda (${n})`) : null,
      r.stato === 'senza_pg' ? h('button', { type: 'button', class: 'btn btn-piccolo', onclick: apriScelta }, 'Scegli') : null,
      r.stato !== 'senza_pg' && pg ? h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Scrivi da questo tablet un altro personaggio', onclick: apriScelta }, 'Cambia') : null,
    ),
    codaVisibile && n > 0 ? pannelloCoda() : null,
  );
  // il solo gate che resta: guardare un personaggio che non è il proprio (parte C), mai per l'offline
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
    codaVisibile = false;
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

/**
 * Il rientro: manda la coda del proprio personaggio al server, che la mette in attesa del Direttore (niente si
 * applica prima della sua conferma, src/rientro.js). La coda resta sul tablet finché lui non risponde: quando
 * risponde, le righe decise escono e il giocatore legge che cosa è passato e che cosa no. Si rimanda a ogni
 * giro proprio per raccogliere quella risposta — ripresentare lo stesso giornale non duplica niente.
 * Non manda niente se la coda è vuota, se questo dispositivo non ha ancora scelto un personaggio, o se un
 * invio precedente è ancora in corso.
 */
async function inviaCoda() {
  if (inviandoGiornale || !pg) return;
  const coda = leggiCoda(pg.pgId);
  if (!coda.length) return;
  inviandoGiornale = true;
  try {
    const lista = await elencoCartella();
    const file = lista ? fileDiPgStabile(lista, pg.pgId)?.file : null;
    if (!file) return; // il server non risponde, o il personaggio non c'è più: si riprova al giro successivo
    const r = await inviaGiornale(file, coda);
    const { approvate, scartate } = confermaRisposta(pg.pgId, r);
    if (approvate.length) avviso(`Il Direttore ha approvato: ${approvate.join('; ')}.`, { tipo: 'ok', durata: 9000 });
    if (scartate.length) avviso(`Il Direttore NON ha tenuto: ${scartate.join('; ')}.`, { tipo: 'attenzione', durata: 12000 });
    // il Direttore ha risposto: la scheda si riallinea a quello che ha deciso. Senza questo, una modifica
    // scartata resterebbe sullo schermo del giocatore (e tornerebbe nel file alla prima scrittura normale).
    if (approvate.length || scartate.length) await ricaricaScheda?.();
    applica();
  } catch (e) {
    // offline per davvero, o il server è tornato ma risponde male: la coda resta, si riprova al giro successivo
    console.warn(`Rientro non riuscito: ${e.message}`);
  } finally {
    inviandoGiornale = false;
  }
}

async function aggiorna() {
  const lista = await elencoCartella();
  const adesso = Date.now();
  const eraOffline = !collegamento.ok;
  if (lista) {
    collegamento = { ok: true, ultimoOk: adesso };
    // dal 21/10 pomeriggio il server crea il record del dispositivo al primo contatto (per farlo comparire nel
    // riquadro del Direttore anche prima che scelga), quindi risponde { pgId: null } invece di niente: senza
    // personaggio è come non avere l'abbinamento — la riga deve dire «scegli il tuo personaggio» e offrire «Scegli».
    const abbinamento = await leggiAssociazione();
    pg = abbinamento?.pgId ? abbinamento : null;
    // appena si riconnette, non al giro dopo. E poi a ogni giro finché la coda non è vuota: non per rimandare le
    // stesse operazioni (il server le ha già in attesa e non le duplica) ma per raccogliere la risposta del
    // Direttore quando arriva, e dire al giocatore che cosa è passato.
    if (eraOffline || contaInCoda(pg?.pgId ?? '')) await inviaCoda();
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
