// Il rientro dei tablet (22/10/2026, chiusura della pipeline dei salvataggi). Funzioni pure: il deposito delle
// modifiche fatte offline, in attesa che il Direttore le approvi o le scarti, e come si applicano quando ha
// risposto. Il deposito sta in `tavolo/rientro.json`; il server lo legge e lo scrive (server.mjs → apiGiornale,
// apiRientro), l'interfaccia lo mostra (src/ui/rientro.js).
//
// La regola che tiene insieme tutto: **niente si applica prima della conferma**. Un tablet che ha lavorato
// offline manda il suo giornale (src/giornale.js) e le operazioni restano qui, in attesa; il personaggio sul
// server non cambia di un punto finché Davide non guarda. Chiudere la schermata non è scartare: quello che non
// ha deciso resta in attesa e si ripresenta. Il tablet, dal canto suo, tiene le righe nella sua coda finché non
// sa com'è andata, così niente si perde se il tablet si spegne, l'app si chiude o Davide non c'è.
//
//   rientro = { versione: 2, personaggi: { <pgId>: {
//                 nome,                       // l'ultimo nome visto, per leggere l'elenco senza aprire i file
//                 inAttesa: [ operazione ],   // il giornale in attesa, in ordine di quando è stato fatto
//                 decise: { <idOperazione>: 'approvata' | 'scartata' | 'ritirata' } } } }
//
// `decise` è anche l'idempotenza: un'operazione già decisa non torna in attesa se il tablet ripresenta il suo
// giornale (succede a ogni giro finché non ha ricevuto la risposta), e approvarla due volte non la applica due
// volte. Si tiene limitata (MASSIMO_DECISE per personaggio), perché è un registro, non uno storico.
import { applicaOperazione, valoreToccato, eAccodabile } from './giornale.js';

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const EPSILON = 1e-9;
const uguale = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < EPSILON : JSON.stringify(a) === JSON.stringify(b));

export const VERSIONE_RIENTRO = 2;
/** Quante decisioni si ricordano per personaggio (per non riapplicare ciò che è già stato deciso). */
export const MASSIMO_DECISE = 2000;
// «ritirata»: la voce l'ha tolta il giocatore stesso (la modifica è tornata com'era, o l'ha scartata dal tablet, o l'ha
// sostituita con una più recente): non è una decisione del Direttore, e non si ripresenta se il tablet la rimanda
const ESITI = ['approvata', 'scartata', 'ritirata'];

export const rientroVuoto = () => ({ versione: VERSIONE_RIENTRO, personaggi: {} });

/**
 * Legge il deposito com'è sul disco, qualunque cosa ci sia: un file mancante, rotto o nella forma del 21/10
 * (`applicate` + `inSospeso`, quando le variazioni si applicavano da sole) diventa la forma attuale senza
 * perdere niente — i conflitti che erano «in sospeso» tornano in attesa, che è dove li vuole Davide.
 */
export function normalizzaRientro(x) {
  if (!isOggetto(x) || !isOggetto(x.personaggi)) return rientroVuoto();
  const personaggi = {};
  for (const [pgId, v] of Object.entries(x.personaggi)) {
    if (!isOggetto(v)) continue;
    const inAttesa = (Array.isArray(v.inAttesa) ? v.inAttesa : [])
      .filter((o) => isOggetto(o) && typeof o.id === 'string' && Array.isArray(o.percorso));
    // forma del 21/10: i conflitti stavano in `inSospeso` come { operazione, attuale }
    const vecchi = (Array.isArray(v.inSospeso) ? v.inSospeso : [])
      .map((c) => c?.operazione).filter((o) => isOggetto(o) && typeof o.id === 'string' && Array.isArray(o.percorso));
    const decise = {};
    for (const [id, esito] of Object.entries(isOggetto(v.decise) ? v.decise : {})) if (ESITI.includes(esito)) decise[id] = esito;
    // `applicate` del 21/10: operazioni già scritte nel file, quindi già «approvate»
    for (const id of Array.isArray(v.applicate) ? v.applicate : []) if (typeof id === 'string' && !decise[id]) decise[id] = 'approvata';
    const visti = new Set();
    const tutte = [...inAttesa, ...vecchi].filter((o) => !decise[o.id] && !visti.has(o.id) && visti.add(o.id));
    personaggi[pgId] = { ...(typeof v.nome === 'string' && v.nome ? { nome: v.nome } : {}), inAttesa: ordinate(tutte), decise };
  }
  return { versione: VERSIONE_RIENTRO, personaggi };
}

/** In ordine di quando sono state fatte (le più vecchie prima): è l'ordine in cui Davide le legge e si applicano. */
const ordinate = (ops) => [...ops].sort((a, b) => String(a.quando ?? '').localeCompare(String(b.quando ?? '')));

const statoPg = (rientro, pgId) => rientro.personaggi[pgId] ?? { inAttesa: [], decise: {} };

/**
 * Mette in attesa le operazioni arrivate da un tablet. Idempotente due volte: un'operazione già in attesa non
 * si duplica, una già decisa non torna in attesa.
 * @returns { rientro, inAttesa: [id] (tutte quelle in attesa adesso, anche di prima), decise: { id: esito }
 *   (fra quelle appena presentate: è la risposta che il tablet aspetta per svuotare la sua coda) }
 */
export function aggiungiOperazioni(rientro, pgId, operazioni, { nome = null, ritira = [] } = {}) {
  const r = normalizzaRientro(rientro);
  const pg = statoPg(r, pgId);
  const tutte = (Array.isArray(operazioni) ? operazioni : []).filter((o) => isOggetto(o) && typeof o.id === 'string' && Array.isArray(o.percorso));
  // 25/10/2026: le operazioni su campi riservati al Direttore (i PX) non entrano mai in attesa: si rispondono «scartate»,
  // così un tablet col codice di prima svuota la sua coda e non le rimanda
  const elenco = tutte.filter((o) => eAccodabile(o.percorso));
  const rifiutate = tutte.filter((o) => !eAccodabile(o.percorso)).map((o) => o.id);
  // le voci che il tablet ha ritirato, e quelle che una voce nuova sostituisce (la stessa modifica, finita): escono
  // dall'attesa e si ricordano come «ritirate», così se un tablet le rimanda non rientrano
  const daTogliere = new Set([...(Array.isArray(ritira) ? ritira : []), ...elenco.flatMap((o) => (Array.isArray(o.sostituisce) ? o.sostituisce : []))].filter((x) => typeof x === 'string'));
  const decise0 = { ...pg.decise };
  for (const id of rifiutate) decise0[id] = 'scartata';
  for (const id of daTogliere) if (!decise0[id]) decise0[id] = 'ritirata';
  const presenti = new Set(pg.inAttesa.map((o) => o.id));
  const nuove = elenco.filter((o) => !presenti.has(o.id) && !decise0[o.id]);
  const inAttesa = ordinate([...pg.inAttesa.filter((o) => !daTogliere.has(o.id)), ...nuove]);
  const decise = {};
  for (const o of [...elenco, ...tutte.filter((x) => rifiutate.includes(x.id))]) if (o.id && decise0[o.id]) decise[o.id] = decise0[o.id];
  const aggiornato = { ...pg, ...(nome ? { nome } : {}), inAttesa, decise: Object.fromEntries(Object.entries(decise0).slice(-MASSIMO_DECISE)) };
  return {
    rientro: { ...r, personaggi: { ...r.personaggi, [pgId]: aggiornato } },
    inAttesa: inAttesa.map((o) => o.id),
    decise,
    rifiutate,
  };
}

/** Le operazioni in attesa di un personaggio, in ordine. */
export const inAttesaDi = (rientro, pgId) => statoPg(normalizzaRientro(rientro), pgId).inAttesa;

/** C'è qualcosa da far vedere al Direttore? Se no, la schermata di rientro non si apre mai (è la regola: durante
    una sessione normale, con i tablet sempre collegati, Davide non deve vedere niente). */
export function ciSonoModifiche(rientro) {
  const r = normalizzaRientro(rientro);
  return Object.values(r.personaggi).some((p) => p.inAttesa.length > 0);
}

/**
 * Una riga da mostrare a Davide: l'etichetta in italiano, l'ora, e — se è un conflitto vero — le due versioni.
 * È un conflitto quando l'operazione sostituisce un valore (un'assegnazione, o un elemento di un elenco
 * cambiato dentro) che nel frattempo è cambiato anche sul server: lì serve una scelta esplicita. Le variazioni
 * (contatori ed elenchi) non sono mai un conflitto: si sommano a quello che è successo nel frattempo.
 */
export function rigaOperazione(op, stato) {
  const variazione = op.tipo === 'somma' || (op.tipo === 'insieme' && op.azione !== 'aggiorna');
  const attuale = variazione ? undefined : valoreToccato(stato, op);
  const conflitto = !variazione && !uguale(attuale, op.visto);
  return {
    id: op.id,
    etichetta: op.etichetta ?? op.percorso.join('.'),
    quando: op.quando ?? null,
    percorso: op.percorso.join('.'),
    variazione,
    ...(conflitto ? { conflitto: { sulServer: attuale ?? null, dalTablet: op.nuovo ?? null } } : {}),
  };
}

/**
 * Applica le decisioni di Davide a uno stato ({ scelte, sessione, calendario }). Le approvate si applicano in
 * ordine di quando sono state fatte, **senza più controllare i conflitti**: li ha già guardati lui, e
 * «approva» su un conflitto vuol dire «tieni la versione del tablet». Le scartate non toccano niente.
 * @param decisioni { <idOperazione>: 'approva' | 'scarta' }: quelle che non ci sono restano in attesa
 * @returns { risultato, approvate: [id], scartate: [id], restano: [operazione] }
 */
export function applicaDecisioni(stato, operazioni, decisioni) {
  let risultato = stato;
  const approvate = [];
  const scartate = [];
  const restano = [];
  for (const op of ordinate(operazioni ?? [])) {
    const d = decisioni?.[op.id];
    if (d === 'approva') { risultato = applicaOperazione(risultato, op); approvate.push(op.id); } else if (d === 'scarta') scartate.push(op.id);
    else restano.push(op);
  }
  return { risultato, approvate, scartate, restano };
}

/** Registra gli esiti nel deposito: le operazioni decise escono dall'attesa e restano in `decise`. */
export function registraDecisioni(rientro, pgId, { approvate = [], scartate = [] }) {
  const r = normalizzaRientro(rientro);
  const pg = statoPg(r, pgId);
  const fatte = new Set([...approvate, ...scartate]);
  const decise = { ...pg.decise };
  for (const id of approvate) decise[id] = 'approvata';
  for (const id of scartate) decise[id] = 'scartata';
  const limitate = Object.fromEntries(Object.entries(decise).slice(-MASSIMO_DECISE));
  return { ...r, personaggi: { ...r.personaggi, [pgId]: { ...pg, inAttesa: pg.inAttesa.filter((o) => !fatte.has(o.id)), decise: limitate } } };
}

/**
 * Il riassunto per la fascia fissa del Direttore (25/10/2026): quante modifiche sono in attesa e di chi. null se non
 * c'è niente: allora la fascia non esiste (a tavolo normale, con i tablet collegati, Davide non deve vedere niente).
 * @param personaggi quello che risponde GET /api/rientro: [{ nome, righe: [...] }]
 */
export function riassuntoRientro(personaggi) {
  const lista = (Array.isArray(personaggi) ? personaggi : []).filter((p) => Array.isArray(p?.righe) && p.righe.length);
  const n = lista.reduce((t, p) => t + p.righe.length, 0);
  if (!n) return null;
  const di = lista.length === 1 ? (lista[0].nome || 'un personaggio') : `${lista.length} personaggi`;
  return { n, personaggi: lista.length, testo: `Rientro dei tablet: ${n === 1 ? '1 modifica fatta' : `${n} modifiche fatte`} senza collegamento, in attesa della tua risposta (${di})` };
}

/**
 * La fascia fissa in cima alla pagina del Direttore: c'è quando — e solo quando — ci sono modifiche in attesa e la
 * schermata di rientro è chiusa (se è aperta è lei stessa a dirlo). È l'unico modo per riaprirla dopo averla
 * chiusa: chiudere non è scartare, quello che non si decide resta e deve restare raggiungibile da qualunque pagina
 * (la scheda, il Tavolo, la mappa), non solo da una. Il 24/10 il pulsante stava soltanto nella barra compatta
 * della mappa e nella testata del Tavolo non c'era: chi chiudeva la schermata non aveva più modo di riaprirla.
 */
export function fasciaRientro({ personaggi, aperta = false } = {}) {
  if (aperta) return null;
  return riassuntoRientro(personaggi);
}
