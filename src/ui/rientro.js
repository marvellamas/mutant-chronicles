// La schermata di rientro, sul PC del Direttore (22/10/2026, chiusura della pipeline dei salvataggi).
//
// È una schermata a parte, non un riquadro in un angolo: quando un tablet ha lavorato offline, quello che ha
// fatto va guardato, non intravisto. Si apre da sé quando ci sono modifiche in attesa (src/rientro.js,
// tavolo/rientro.json) e **solo sul PC dove gira Mutant**: durante una sessione normale, con i tablet
// collegati, Davide non vede niente — se non c'è niente in attesa questa schermata non esiste.
//
// Le regole dell'incontro, nell'ordine in cui contano:
//  - l'elenco è in italiano, personaggio per personaggio e in ordine di ora: «Aiko — −5 PV (21:40)», mai numeri nudi;
//  - si approva o si scarta una riga alla volta, o tutte insieme per quel personaggio;
//  - per i conflitti veri (un valore cambiato da tutt'e due le parti) le due versioni stanno affiancate e la
//    scelta è esplicita: nessun automatismo decide al posto suo;
//  - **chiudere non è scartare**: quello che non ha deciso resta in attesa e si ripresenta (anche al prossimo
//    avvio: sta sul server, non in questa pagina). Per questo la ✕ non chiede conferma e non perde niente.
//  - a risposta data il tablet se ne accorge da solo (ripresenta la coda e riceve gli esiti) e dice al
//    giocatore che cosa è passato e che cosa no: non c'è niente da comunicargli a voce.
import { h, svuota } from './dom.js';
import { avviso, avvisoErrore } from './avvisi.js';
import { leggiRientro, decidiRientro } from './cartella.js';
import { fasciaRientro } from '../rientro.js';

const INTERVALLO_MS = 10_000;

let elemento = null;
let dati = { personaggi: [] };
let aperta = false;
let chiusaSu = ''; // la firma di ciò che c'era quando Davide ha chiuso: non si riapre da sola sulle stesse righe
let inCorso = false;
let timer = null;

const firmaDi = (d) => (d?.personaggi ?? []).map((p) => `${p.pgId}:${p.righe.map((r) => r.id).join(',')}`).join('|');

/** Quante modifiche sono in attesa in tutto (per il pulsante del Tavolo e per decidere se aprire). */
export const inAttesaTotali = () => (dati.personaggi ?? []).reduce((n, p) => n + p.righe.length, 0);

const ora = (q) => {
  if (!q) return '';
  const d = new Date(q);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
};

const testoValore = (v) => {
  if (v === null || v === undefined || v === '') return '(vuoto)';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v.testo ?? v.nome ?? JSON.stringify(v);
  return String(v);
};

/** Una riga: l'etichetta già scritta in italiano dal tablet, l'ora, e i due pulsanti. */
function riga(pg, r, scelte) {
  const scelta = scelte.get(r.id) ?? null;
  const bottone = (valore, testo, classe) => h('button', {
    type: 'button',
    class: `btn btn-piccolo${scelta === valore ? ` ${classe}` : ''}`,
    'aria-pressed': String(scelta === valore),
    onclick: () => { if (scelta === valore) scelte.delete(r.id); else scelte.set(r.id, valore); disegna(); },
  }, testo);
  return h('li', { class: `rientro-riga${r.conflitto ? ' rientro-riga-conflitto' : ''}` },
    h('div', { class: 'rientro-riga-testo' },
      h('span', { class: 'rientro-etichetta' }, r.etichetta),
      r.quando ? h('span', { class: 'nota' }, ` (${ora(r.quando)})`) : null),
    r.conflitto
      ? h('div', { class: 'rientro-conflitto' },
        h('p', { class: 'nota' }, 'Cambiato da tutt’e due: scegli quale tieni.'),
        h('div', { class: 'rientro-versioni' },
          h('div', { class: 'rientro-versione' }, h('strong', {}, 'sul server: '), h('span', {}, testoValore(r.conflitto.sulServer))),
          h('div', { class: 'rientro-versione' }, h('strong', {}, 'dal tablet: '), h('span', {}, testoValore(r.conflitto.dalTablet)))))
      : null,
    h('div', { class: 'rientro-azioni' },
      bottone('approva', r.conflitto ? 'Tieni quella del tablet' : 'Approva', 'primario'),
      bottone('scarta', r.conflitto ? 'Tieni quella del server' : 'Scarta', 'pericolo')));
}

/** Un personaggio: il nome, le sue righe in ordine di ora, «tutte insieme» e «Applica». */
function bloccoPg(pg, scelte) {
  const tutte = (valore) => () => { for (const r of pg.righe) scelte.set(r.id, valore); disegna(); };
  const decise = pg.righe.filter((r) => scelte.has(r.id)).length;
  return h('section', { class: 'rientro-pg' },
    h('header', { class: 'rientro-pg-testa' },
      h('h3', {}, pg.nome),
      h('span', { class: 'nota' }, `${pg.righe.length} modific${pg.righe.length === 1 ? 'a' : 'he'} fuori linea`),
      h('div', { class: 'rientro-tutte' },
        h('button', { type: 'button', class: 'btn btn-piccolo', onclick: tutte('approva') }, 'Approva tutte'),
        h('button', { type: 'button', class: 'btn btn-piccolo', onclick: tutte('scarta') }, 'Scarta tutte'),
        h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => { for (const r of pg.righe) scelte.delete(r.id); disegna(); } }, 'Lascia in attesa'))),
    h('ul', { class: 'rientro-elenco' }, pg.righe.map((r) => riga(pg, r, scelte))),
    h('div', { class: 'riga-azioni' },
      h('button', { type: 'button', class: 'btn primario', disabled: decise === 0, onclick: () => applica(pg, scelte) },
        decise === 0 ? 'Scegli che cosa fare' : `Applica a ${pg.nome} (${decise} di ${pg.righe.length})`),
      decise < pg.righe.length ? h('span', { class: 'nota' }, `${pg.righe.length - decise} resta${pg.righe.length - decise === 1 ? '' : 'no'} in attesa`) : null));
}

const scelteDi = new Map(); // pgId → Map(idOperazione → 'approva' | 'scarta')
const scelteDel = (pgId) => { if (!scelteDi.has(pgId)) scelteDi.set(pgId, new Map()); return scelteDi.get(pgId); };

async function applica(pg, scelte) {
  if (inCorso) return;
  inCorso = true;
  try {
    const r = await decidiRientro(pg.pgId, Object.fromEntries(scelte));
    scelteDi.delete(pg.pgId);
    const parti = [];
    if (r.approvate?.length) parti.push(`${r.approvate.length} approvat${r.approvate.length === 1 ? 'a' : 'e'}`);
    if (r.scartate?.length) parti.push(`${r.scartate.length} scartat${r.scartate.length === 1 ? 'a' : 'e'}`);
    if (r.restano) parti.push(`${r.restano} ancora in attesa`);
    avviso(`${pg.nome}: ${parti.join(', ')}.`, { tipo: 'ok' });
    await aggiorna();
  } catch (e) {
    avvisoErrore(`Rientro non applicato: ${e.message}`);
  } finally {
    inCorso = false;
    disegna();
  }
}

function disegna() {
  if (!elemento) return;
  disegnaFascia();
  elemento.hidden = !aperta;
  document.body.classList.toggle('con-rientro', aperta);
  if (!aperta) { svuota(elemento); return; }
  svuota(elemento,
    h('div', { class: 'rientro-foglio', role: 'dialog', 'aria-label': 'Rientro dei tablet' },
      h('header', { class: 'rientro-testa' },
        h('h2', {}, 'Rientro dei tablet'),
        h('p', { class: 'nota' }, 'Queste modifiche sono state fatte senza collegamento. Niente è ancora stato scritto sulle schede: decidi tu. Quello che lasci in attesa resta qui e te lo richiedo dopo.'),
        h('button', { type: 'button', class: 'btn btn-chiudi', title: 'Chiudi: quello che non hai deciso resta in attesa', onclick: chiudi }, '✕')),
      h('div', { class: 'rientro-corpo' }, dati.personaggi.map((pg) => bloccoPg(pg, scelteDel(pg.pgId))))));
}

function chiudi() {
  aperta = false;
  chiusaSu = firmaDi(dati); // non si riapre da sola finché non arriva qualcosa di nuovo
  disegna();
}

/** Apre la schermata (dal pulsante del Tavolo, o da sola quando arriva qualcosa di nuovo). */
export function apriRientro() {
  if (!inAttesaTotali()) return false;
  aperta = true;
  disegna();
  return true;
}

async function aggiorna() {
  const r = await leggiRientro();
  if (!r) return; // niente server, o non è il PC del Direttore: la schermata non esiste
  dati = { personaggi: Array.isArray(r.personaggi) ? r.personaggi : [] };
  // le scelte già fatte su righe che non ci sono più (decise da un'altra finestra) si dimenticano
  for (const [pgId, scelte] of scelteDi) {
    const pg = dati.personaggi.find((p) => p.pgId === pgId);
    if (!pg) { scelteDi.delete(pgId); continue; }
    for (const id of [...scelte.keys()]) if (!pg.righe.some((x) => x.id === id)) scelte.delete(id);
  }
  const firma = firmaDi(dati);
  if (!inAttesaTotali()) { aperta = false; chiusaSu = ''; } else if (!aperta && firma !== chiusaSu) aperta = true; // qualcosa di nuovo: si ripresenta
  disegna();
}

/**
 * La fascia fissa in cima alla pagina (25/10/2026): «Rientro dei tablet: 4 modifiche… [Apri]». Sta fuori da #app, come
 * la fascia «Copia di lavoro», quindi c'è su ogni pagina del Direttore — scheda, Tavolo, mappa — e non sparisce
 * quando la pagina si ridisegna. C'è solo con modifiche in attesa e la schermata chiusa (src/rientro.js → fasciaRientro).
 */
function disegnaFascia() {
  const f = fasciaRientro({ personaggi: dati.personaggi, aperta });
  let el = document.getElementById('fascia-rientro');
  if (!f) { el?.remove(); return; }
  if (!el) {
    el = h('div', { id: 'fascia-rientro', class: 'fascia-rientro', role: 'status' });
    const copia = document.getElementById('fascia-copia-di-lavoro');
    if (copia) copia.after(el); else document.body.prepend(el);
  }
  svuota(el,
    h('span', { class: 'fascia-rientro-testo' }, f.testo),
    h('button', { type: 'button', class: 'btn primario btn-piccolo', title: 'Apre la schermata del rientro: approvi o scarti le modifiche, o le lasci in attesa', onclick: () => apriRientro() }, 'Apri'));
}

/**
 * Monta la schermata, una volta sola, e avvia il controllo periodico. Va chiamata **solo sul PC del Direttore e
 * solo con il server**: altrove l'API risponde 403 e non ci sarebbe niente da mostrare.
 */
export function montaRientro({ documento = document } = {}) {
  if (elemento) return elemento;
  elemento = documento.getElementById('schermata-rientro') ?? h('div', { id: 'schermata-rientro', class: 'schermata-rientro', hidden: true });
  if (!elemento.isConnected) documento.body.append(elemento);
  void aggiorna();
  timer = setInterval(() => { void aggiorna(); }, INTERVALLO_MS);
  documento.addEventListener('visibilitychange', () => { if (documento.visibilityState === 'visible') void aggiorna(); });
  return elemento;
}

/** Per i test: ferma il controllo periodico. */
export function fermaRientro() { clearInterval(timer); timer = null; }
