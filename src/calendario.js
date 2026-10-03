// Calendario di gioco: sezione facoltativa della scheda digitale, fuori dalle regole. Note per
// giorno e fascia oraria, con bandierine di importanza e il segno «da ricordare». Non tocca
// calcoli, sessione, livelli né stampa. Le fasce (nome e ordine) e i significati delle
// bandierine sono in regole.json → calendario.
//
// Il blocco si salva accanto alle scelte e alla sessione (file del personaggio, formato 6):
//   { attivo, inizio: "AAAA-MM-GG", oggi: { data, fascia },
//     note: [ { id, data, fascia, testo, colore: null|rosso|giallo|verde, ricordare, creato } ] }
// «Nuova sessione» e i livelli non lo toccano. Funzioni pure: ogni modifica restituisce un
// calendario nuovo (o null se la modifica non è valida), così «Annulla» può tornare indietro.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export const COLORI = ['rosso', 'giallo', 'verde'];
/** Valore del filtro per le note senza bandierina. */
export const SENZA_BANDIERINA = 'nessuna';

export const GIORNI = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
export const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

/** Fasce della giornata, in ordine: [{ id, nome }] (regole.json → calendario.fasce). */
export const fasce = (dati) => dati.regole.calendario.fasce;
const idFasce = (dati) => fasce(dati).map((f) => f.id);

// --- Date «AAAA-MM-GG» (calendario gregoriano, senza fusi orari) ---------------------------

const parti = (data) => data.split('-').map(Number);
const daUtc = (ms) => new Date(ms).toISOString().slice(0, 10);
// Date.UTC legge gli anni 0–99 come 1900–1999: setUTCFullYear no (servono anche date lontane)
const ms = (a, m0, g) => { const d = new Date(0); d.setUTCFullYear(a, m0, g); return d.getTime(); };
const utc = (data) => { const [a, m, g] = parti(data); return ms(a, m - 1, g); };

/** true se la stringa è una data reale nel formato AAAA-MM-GG (anni 1–9999). */
export function dataValida(data) {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const [a, m, g] = parti(data);
  if (a < 1 || m < 1 || m > 12 || g < 1) return false;
  return g <= giorniNelMese(a, m);
}

function giorniNelMese(anno, mese) {
  return new Date(ms(anno, mese, 0)).getUTCDate();
}

/** Data spostata di n giorni (anche negativi), attraverso mesi e anni. */
export function aggiungiGiorni(data, n) {
  const d = new Date(utc(data));
  d.setUTCDate(d.getUTCDate() + n);
  return daUtc(d.getTime());
}

/** Data spostata di n mesi; il giorno si ferma all'ultimo del mese (31 gennaio + 1 → 28/29 febbraio). */
export function aggiungiMesi(data, n) {
  const [a, m, g] = parti(data);
  const totale = a * 12 + (m - 1) + n;
  const anno = Math.floor(totale / 12);
  const mese = totale - anno * 12 + 1;
  return daUtc(ms(anno, mese - 1, Math.min(g, giorniNelMese(anno, mese))));
}

/** Giorno della settimana: 0 = lunedì … 6 = domenica. */
export function giornoSettimana(data) {
  return (new Date(utc(data)).getUTCDay() + 6) % 7;
}

/** Lunedì della settimana della data. */
export const inizioSettimana = (data) => aggiungiGiorni(data, -giornoSettimana(data));

/** I sette giorni della settimana della data, da lunedì. */
export const giorniSettimana = (data) => Array.from({ length: 7 }, (_, i) => aggiungiGiorni(inizioSettimana(data), i));

/** Primo giorno del mese della data. */
export const inizioMese = (data) => `${data.slice(0, 7)}-01`;

/**
 * Settimane (da lunedì) che coprono il mese della data: [[7 date], …], con i giorni dei mesi
 * vicini per completare la prima e l'ultima riga (si riconoscono con stessoMese).
 */
export function grigliaMese(data) {
  const primo = inizioMese(data);
  const [a, m] = parti(primo);
  const ultimo = `${primo.slice(0, 8)}${String(giorniNelMese(a, m)).padStart(2, '0')}`;
  const settimane = [];
  for (let l = inizioSettimana(primo); l <= ultimo; l = aggiungiGiorni(l, 7)) settimane.push(giorniSettimana(l));
  return settimane;
}

export const stessoMese = (a, b) => a.slice(0, 7) === b.slice(0, 7);

/** «lunedì 3 marzo 2026» (breve: «lun 3 mar»). */
export function nomeData(data, { breve = false } = {}) {
  const [a, m, g] = parti(data);
  const gs = GIORNI[giornoSettimana(data)];
  return breve ? `${gs.slice(0, 3)} ${g} ${MESI[m - 1].slice(0, 3)}` : `${gs} ${g} ${MESI[m - 1]} ${a}`;
}

/** «marzo 2026». */
export const nomeMese = (data) => `${MESI[parti(data)[1] - 1]} ${parti(data)[0]}`;

// --- Modello ------------------------------------------------------------------------------

/** Calendario nuovo, attivo, con «oggi» all'inizio scelto. null se data o fascia non sono valide. */
export function nuovoCalendario(inizio, fascia, dati) {
  if (!dataValida(inizio) || !idFasce(dati).includes(fascia)) return null;
  return { attivo: true, inizio, oggi: { data: inizio, fascia }, note: [] };
}

function notaValida(n, dati) {
  return isOggetto(n) && typeof n.id === 'string' && n.id && dataValida(n.data) && idFasce(dati).includes(n.fascia)
    && typeof n.testo === 'string' && n.testo.trim() !== '';
}

/**
 * Calendario letto da un file o dal browser: i personaggi senza blocco (o con un blocco
 * illeggibile) non hanno il calendario → null. Le note non valide si scartano; i campi
 * facoltativi mancanti prendono il valore predefinito.
 */
export function normalizzaCalendario(c, dati) {
  if (!isOggetto(c)) return null;
  const inizio = dataValida(c.inizio) ? c.inizio : dataValida(c.oggi?.data) ? c.oggi.data : null;
  if (!inizio) return null;
  const f = idFasce(dati);
  const oggi = { data: dataValida(c.oggi?.data) ? c.oggi.data : inizio, fascia: f.includes(c.oggi?.fascia) ? c.oggi.fascia : f[0] };
  const note = (Array.isArray(c.note) ? c.note : []).filter((n) => notaValida(n, dati)).map((n) => ({
    id: n.id, data: n.data, fascia: n.fascia, testo: n.testo,
    colore: COLORI.includes(n.colore) ? n.colore : null,
    ricordare: n.ricordare === true,
    creato: typeof n.creato === 'string' ? n.creato : null,
  }));
  return { attivo: c.attivo === true, inizio, oggi, note };
}

export const calendarioAttivo = (c) => !!c?.attivo;

/**
 * Attiva il calendario. Alla prima attivazione servono inizio e fascia; se il personaggio lo
 * aveva già (disattivato), si riaccende con le sue note e il suo «oggi».
 */
export function attivaCalendario(c, { inizio, fascia } = {}, dati) {
  if (isOggetto(c)) return { ...c, attivo: true };
  return nuovoCalendario(inizio, fascia, dati);
}

/** Disattiva: il blocco resta (note comprese) ma la scheda non lo mostra. */
export const disattivaCalendario = (c) => (isOggetto(c) ? { ...c, attivo: false } : c);

/** «+ fascia»: la fascia successiva; dopo l'ultima (Notte) la prima (Mattina) del giorno dopo. */
export function avanzaFascia(c, dati) {
  const f = idFasce(dati);
  const i = f.indexOf(c.oggi.fascia);
  if (i < f.length - 1) return { ...c, oggi: { data: c.oggi.data, fascia: f[i + 1] } };
  return { ...c, oggi: { data: aggiungiGiorni(c.oggi.data, 1), fascia: f[0] } };
}

/** «+ giorno»: la prima fascia (Mattina) del giorno dopo. */
export function avanzaGiorno(c, dati) {
  return { ...c, oggi: { data: aggiungiGiorni(c.oggi.data, 1), fascia: idFasce(dati)[0] } };
}

/** Porta «oggi» a una data e fascia qualsiasi (null se non valide). */
export function impostaOggi(c, data, fascia, dati) {
  if (!dataValida(data) || !idFasce(dati).includes(fascia)) return null;
  return { ...c, oggi: { data, fascia } };
}

/**
 * Aggiunge una nota. id e creato li dà chi chiama (le funzioni restano pure).
 * @returns calendario nuovo, o null se la nota non è valida (testo vuoto, data o fascia errate)
 */
export function aggiungiNota(c, { data, fascia, testo, colore = null, ricordare = false }, { id, creato }, dati) {
  const nota = { id, data, fascia, testo: String(testo ?? '').trim(), colore: COLORI.includes(colore) ? colore : null, ricordare: ricordare === true, creato };
  if (!notaValida(nota, dati) || c.note.some((n) => n.id === id)) return null;
  return { ...c, note: [...c.note, nota] };
}

/**
 * Modifica i campi di una nota (testo, colore, ricordare, data, fascia): spostarla in un'altra
 * fascia o in un altro giorno è una modifica di data e fascia. null se il risultato non è valido.
 */
export function modificaNota(c, id, campi, dati) {
  const vecchia = c.note.find((n) => n.id === id);
  if (!vecchia) return null;
  const nuova = { ...vecchia };
  for (const k of ['data', 'fascia', 'testo', 'colore', 'ricordare']) if (k in campi) nuova[k] = campi[k];
  nuova.testo = String(nuova.testo ?? '').trim();
  if (!COLORI.includes(nuova.colore)) nuova.colore = null;
  nuova.ricordare = nuova.ricordare === true;
  if (!notaValida(nuova, dati)) return null;
  return { ...c, note: c.note.map((n) => (n.id === id ? nuova : n)) };
}

export const spostaNota = (c, id, data, fascia, dati) => modificaNota(c, id, { data, fascia }, dati);

export function eliminaNota(c, id) {
  return c.note.some((n) => n.id === id) ? { ...c, note: c.note.filter((n) => n.id !== id) } : null;
}

// --- Letture --------------------------------------------------------------------------------

/** Note in ordine cronologico: data, poi fascia (ordine di regole.json), poi creazione. */
export function ordinaNote(note, dati) {
  const f = idFasce(dati);
  return [...note].sort((a, b) => a.data.localeCompare(b.data) || f.indexOf(a.fascia) - f.indexOf(b.fascia)
    || String(a.creato ?? '').localeCompare(String(b.creato ?? '')));
}

/** Note di un giorno (e di una fascia, se indicata), in ordine. */
export function noteDi(c, data, fascia, dati) {
  return ordinaNote(c.note.filter((n) => n.data === data && (!fascia || n.fascia === fascia)), dati);
}

/** Riepilogo di un giorno o di una fascia per Settimana e Mese: bandierine presenti (in ordine), «M», quante note. */
export function riepilogo(note) {
  return {
    colori: COLORI.filter((x) => note.some((n) => n.colore === x)),
    ricordare: note.some((n) => n.ricordare),
    n: note.length,
  };
}

const semplifica = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** true se il filtro non restringe nulla. */
export const filtroVuoto = (f) => !f?.colori?.length && !f?.ricordare && !String(f?.testo ?? '').trim();

/**
 * Ricerca: { colori: [rosso|giallo|verde|nessuna…], ricordare: bool, testo }. Le bandierine
 * scelte valgono in alternativa fra loro (rosso O giallo); «M» e testo si aggiungono (E).
 * Il testo si cerca senza maiuscole né accenti. Risultati in ordine cronologico.
 */
export function filtraNote(c, filtro, dati) {
  const colori = filtro?.colori ?? [];
  const testo = semplifica(filtro?.testo ?? '').trim();
  return ordinaNote(c.note.filter((n) => (!colori.length || colori.includes(n.colore ?? SENZA_BANDIERINA))
    && (!filtro?.ricordare || n.ricordare)
    && (!testo || semplifica(n.testo).includes(testo))), dati);
}

export const contaNote = (c) => (Array.isArray(c?.note) ? c.note.length : 0);

// --- File del solo calendario --------------------------------------------------------------
// Il calendario è uno, quello di chi tiene il tempo: si passa da un personaggio all'altro con un
// file a sé. Intestazione fissa, poi il blocco così com'è nel salvataggio del personaggio:
//   { tipo: "calendario", versione: 1, app: "mutant", esportato: "<ISO>", da: "<nome>", calendario: {…} }
// L'import sostituisce l'intero blocco (nessuna unione) e attiva la sezione.

export const FILE_CALENDARIO = { tipo: 'calendario', versione: 1, app: 'mutant' };
const NON_CALENDARIO = 'Non è un file calendario di Mutant: nessuna modifica.';

/** Contenuto del file del solo calendario (oggetto da serializzare). */
export function fileCalendario(c, da, esportato = new Date()) {
  return { ...FILE_CALENDARIO, esportato: esportato.toISOString(), da: String(da ?? ''), calendario: c };
}

/**
 * Legge un file del solo calendario. Tipo, app e versione devono tornare, e il blocco deve essere
 * un calendario leggibile; altrimenti { ok: false, errore } e nulla cambia.
 * @returns {{ ok: true, calendario, da, esportato } | { ok: false, errore }}
 */
export function leggiFileCalendario(testo, dati) {
  let f = null;
  try { f = JSON.parse(testo); } catch { f = null; }
  if (!isOggetto(f) || f.tipo !== FILE_CALENDARIO.tipo || f.app !== FILE_CALENDARIO.app) return { ok: false, errore: NON_CALENDARIO };
  if (f.versione !== FILE_CALENDARIO.versione) {
    return { ok: false, errore: `Non è un file calendario di Mutant che questa versione sa leggere (versione ${f.versione}, attesa ${FILE_CALENDARIO.versione}): nessuna modifica.` };
  }
  const c = normalizzaCalendario(f.calendario, dati);
  if (!c) return { ok: false, errore: 'Il file calendario di Mutant non contiene un calendario leggibile: nessuna modifica.' };
  return { ok: true, calendario: { ...c, attivo: true }, da: typeof f.da === 'string' ? f.da : '', esportato: typeof f.esportato === 'string' ? f.esportato : null };
}

/** Il momento di «oggi» in testo, per i promemoria delle durate a tempo (src/durate-incantesimi.js): «gio 3 ott 2026, sera». */
export function momentoCalendario(c, dati) {
  if (!c?.oggi?.data) return null;
  const fascia = fasce(dati).find((f) => f.id === c.oggi.fascia)?.nome ?? c.oggi.fascia;
  return `${nomeData(c.oggi.data, { breve: true })} ${parti(c.oggi.data)[0]}, ${String(fascia).toLowerCase()}`;
}
