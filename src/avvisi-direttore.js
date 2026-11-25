// Il diario del Direttore (lotto 249): UN POSTO SOLO dove si legge che cosa è successo di irregolare al tavolo.
//
// Perché esiste, e va scritto perché la regola non si perda. La regola di Marcello ha due metà:
//   1. nessuno viene fermato — niente blocchi al tavolo (lotti 241, 246, 247, 248: 39 blocchi togliati);
//   2. il Direttore è sempre informato — ogni irregolarità produce un avviso che lui riceve.
// La seconda rende sicura la prima, perché **finora l'informazione stava nel blocco**: il pulsante spento era il
// messaggio. Toglierlo senza mettere altro la fa sparire — lo abbiamo visto nel 248, dove il movimento forzato di un
// mezzo non lasciava nessuna riga da nessuna parte.
//
// E una terza riga, che è la forma delle altre due: **il master non dà vidimazioni, legge.** Qui non c'è «Approva»
// e non c'è «Respingi»: niente in questo file richiede una risposta perché il gioco prosegua. Se il Direttore vuole
// intervenire usa gli strumenti che ha già (Modifica master, «Annulla», il registro dello scontro).
//
// La traccia NON sta qui: resta dov'è già (lo storico del personaggio, il registro dello scontro, il registro
// «Modifiche del master»). Questo è l'indice che dice al Direttore che cosa è successo e dove guardare.

export const FORMATO_AVVISI = 'mutant-avvisi-direttore';
export const VERSIONE_AVVISI = 1;
/** Oltre questo numero le voci più vecchie già lette si lasciano cadere: una serata, non un archivio. */
export const MAX_VOCI = 400;

/**
 * I livelli di gravità, col criterio scritto (Marcello: «avvisi più o meno grossi», due o tre livelli, non dieci).
 * Il criterio è quello suo: **quello che cambia un numero è più grosso di quello che non lo cambia.**
 */
export const GRAVITA = {
  grossa: { nome: 'grossa', ordine: 0, segno: '●', criterio: 'cambia un numero che resta nel file: PV, PM, punti, munizioni, PI, un livello, una scelta permanente' },
  media: { nome: 'media', ordine: 1, segno: '◐', criterio: 'cambia lo stato dello scontro o del tavolo: un movimento eseguito, uno Stato, un Round' },
  piccola: { nome: 'piccola', ordine: 2, segno: '○', criterio: 'non cambia nessun numero: un pannello aperto, una lettura, un dato che manca nelle regole' },
};
const gravitaValida = (g) => (Object.hasOwn(GRAVITA, String(g)) ? String(g) : 'media');

/** Il diario vuoto. */
export const nuovoDiario = () => ({ formato: FORMATO_AVVISI, versione: VERSIONE_AVVISI, voci: [] });

/** Un diario letto da file: si accetta quello che c'è e non si butta niente di leggibile. */
export function normalizzaDiario(o) {
  const voci = Array.isArray(o?.voci) ? o.voci.filter((v) => v && typeof v === 'object' && v.id).map(normalizzaVoce) : [];
  return { ...nuovoDiario(), ...(o && typeof o === 'object' ? o : {}), formato: FORMATO_AVVISI, versione: VERSIONE_AVVISI, voci };
}

function normalizzaVoce(v) {
  return {
    id: String(v.id),
    quando: String(v.quando ?? ''),
    chi: v.chi ? String(v.chi) : null,
    cosa: String(v.cosa ?? ''),
    numeri: v.numeri ? String(v.numeri) : null,
    motivo: v.motivo ? String(v.motivo) : null,
    dove: v.dove ? String(v.dove) : null,
    da: v.da ? String(v.da) : null,
    gravita: gravitaValida(v.gravita),
    letto: v.letto ? String(v.letto) : null,
  };
}

/**
 * Una voce nuova. Dice **chi, cosa, quando e i numeri**: «21:42 — Oshi si è mosso fuori turno (toccava a Michele):
 * 4 Q, da D7 a H7», non «irregolarità rilevata». Senza `cosa` non c'è voce: una riga che non dice niente è peggio
 * di nessuna riga.
 * @param chi il personaggio (o il mezzo) a cui è successo
 * @param cosa che cosa è stato fatto, in parole da tavolo
 * @param numeri i numeri che servono a capirlo (quadretti, PM, punti, PV)
 * @param motivo la regola che l'avviso ha segnalato
 * @param dove dove sta la traccia: «storico di OSHI», «registro dello scontro», «Modifiche del master»
 * @param da chi l'ha fatto: «tablet», «PC del Direttore», «app»
 */
export function nuovaVoce({ chi = null, cosa, numeri = null, motivo = null, dove = null, da = null, gravita = 'media', quando = null, id = null } = {}) {
  const testo = String(cosa ?? '').trim();
  if (!testo) return null;
  return normalizzaVoce({
    id: id ?? `av-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    quando: quando ?? new Date().toISOString(),
    chi, cosa: testo, numeri, motivo, dove, da, gravita, letto: null,
  });
}

/** Aggiunge una voce. Le più vecchie GIÀ LETTE cadono oltre MAX_VOCI; una non letta non si perde mai. */
export function aggiungi(diario, voce) {
  const d = normalizzaDiario(diario);
  if (!voce) return d;
  const voci = [...d.voci, normalizzaVoce(voce)];
  if (voci.length <= MAX_VOCI) return { ...d, voci };
  const nonLette = voci.filter((v) => !v.letto);
  const lette = voci.filter((v) => v.letto);
  const quante = Math.max(0, MAX_VOCI - nonLette.length);
  return { ...d, voci: [...lette.slice(-quante), ...nonLette].sort((a, b) => String(a.quando).localeCompare(String(b.quando))) };
}

/** Segna come letto: la voce **resta**, con l'ora in cui è stata letta. Non cancella niente, qui né altrove. */
export function segnaLetti(diario, ids, quando = new Date().toISOString()) {
  const d = normalizzaDiario(diario);
  const quali = ids === 'tutte' ? null : new Set((Array.isArray(ids) ? ids : [ids]).map(String));
  return { ...d, voci: d.voci.map((v) => (v.letto || (quali && !quali.has(v.id)) ? v : { ...v, letto: quando })) };
}

/** Le voci da leggere, le più recenti per prime. */
export const daLeggere = (diario) => [...normalizzaDiario(diario).voci].filter((v) => !v.letto).reverse();

/** Il conto per il tocco: quante da leggere e quante di quelle sono grosse. */
export function conto(diario) {
  const n = daLeggere(diario);
  return { da_leggere: n.length, grosse: n.filter((v) => v.gravita === 'grossa').length };
}

/** La vista del diario: le voci più recenti per prime, con il testo già pronto da leggere. */
export function vista(diario, { quante = 60 } = {}) {
  const d = normalizzaDiario(diario);
  const voci = [...d.voci].reverse().slice(0, quante).map((v) => ({ ...v, riga: rigaLeggibile(v), ora: ora(v.quando) }));
  return { ...conto(d), voci, totale: d.voci.length };
}

/** «21:42 — OSHI si è mosso fuori turno (toccava a Michele): 4 Q, da D7 a H7 · dal tablet». */
export function rigaLeggibile(v) {
  const x = normalizzaVoce(v);
  const pezzi = [ora(x.quando), '—'];
  if (x.chi) pezzi.push(`${x.chi}:`);
  pezzi.push(x.cosa);
  if (x.numeri) pezzi.push(`· ${x.numeri}`);
  if (x.motivo && !x.cosa.includes(x.motivo)) pezzi.push(`(${x.motivo})`);
  if (x.da) pezzi.push(`· ${x.da}`);
  return pezzi.join(' ').replace(/\s+/g, ' ').trim();
}

const ora = (iso) => {
  const d = new Date(String(iso));
  return Number.isNaN(d.getTime()) ? '—' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
