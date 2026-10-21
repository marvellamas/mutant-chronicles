// La coda delle operazioni offline (21/10/2026, quarto lotto: «si può modificare offline, e al rientro Davide
// approva»). Qui il lato del tablet: la coda vive nel suo localStorage (non sul server, finché non si collega:
// «la coda resta sul dispositivo finché non riceve una risposta»), e l'ultima base nota — lo stato (scelte,
// sessione, calendario) dell'ultima volta che si è saputo allineati al server — da cui si calcola la prossima
// differenza (src/giornale.js → operazioniDaDiff).
import { operazioniDaDiff } from '../giornale.js';

const CHIAVE_BASE = (id) => `mutant.coda.base.${id}`;
const CHIAVE_CODA = (id) => `mutant.coda.operazioni.${id}`;

const leggi = (chiave, ripiego) => { try { const v = localStorage.getItem(chiave); return v ? JSON.parse(v) : ripiego; } catch { return ripiego; } };
const scrivi = (chiave, valore) => { try { localStorage.setItem(chiave, JSON.stringify(valore)); return true; } catch { return false; } };

/** Lo stato tracciato («scelte», «sessione», «calendario»: gli stessi dell'esportazione). */
const statoDi = (scelte, sessione, calendario) => ({ scelte: scelte ?? null, sessione: sessione ?? null, calendario: calendario ?? null });

/** L'ultima base nota di un personaggio: null se non ce n'è ancora una (primo collegamento, o coda vuota). */
export function leggiBase(id) {
  return leggi(CHIAVE_BASE(id), null);
}

/** Fissa la base (dopo un salvataggio riuscito, o la prima lettura dal server): azzera il riferimento, non la coda. */
export function fissaBase(id, scelte, sessione, calendario) {
  scrivi(CHIAVE_BASE(id), statoDi(scelte, sessione, calendario));
}

/** Le operazioni in coda per un personaggio, in ordine (le più vecchie prima). */
export function leggiCoda(id) {
  const c = leggi(CHIAVE_CODA(id), []);
  return Array.isArray(c) ? c : [];
}

// Etichette leggibili dei percorsi più comuni (il resto ha un'etichetta generica, costruita dal percorso):
// non è un elenco da cui dipende la correttezza — src/giornale.js classifica comunque dal tipo — serve solo a
// scrivere «−5 PV» invece di «sessione.pvAttuali: −5» nel giornale e nella schermata di rientro.
const NOMI_SOMMA = {
  'sessione.pvAttuali': 'PV', 'sessione.pmAttuali': 'PM', 'sessione.puntiEroe': 'Punti Eroe',
  'sessione.distintivi': 'Distintivi', 'sessione.crediti': 'crediti', 'sessione.ferite': 'Ferite',
  'sessione.affaticamento': 'Affaticamento', 'sessione.corruzione': 'Corruzione', 'sessione.caricoExtra': 'kg di carico extra',
};
// segno tipografico, come src/ui/dom.js → segno(): «+2», «−1», mai il trattino ASCII
const segno = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

function etichettaSomma(percorso, delta) {
  const chiave = percorso.join('.');
  if (NOMI_SOMMA[chiave]) return `${segno(delta)} ${NOMI_SOMMA[chiave]}`;
  const m = /^sessione\.(munizioni|scorte|chroma|integrita|nec|carichini)\.(.+)$/.exec(chiave);
  if (m) return `${segno(delta)} ${m[1]} (${m[2]})`;
  return `${segno(delta)} ${chiave}`;
}

function etichettaInsieme(percorso, azione, valore) {
  const chiave = percorso.join('.');
  const nome = typeof valore === 'string' ? valore : valore?.nome ?? valore?.rif ?? valore?.uid ?? JSON.stringify(valore);
  if (chiave === 'sessione.statiAttivi') return `Stato ${nome} ${azione === 'aggiungi' ? 'acceso' : 'spento'}`;
  if (chiave === 'scelte.equipaggiamento') return `${azione === 'aggiungi' ? '+1' : '−1'} ${nome}`;
  if (chiave === 'sessione.talentiAccesi') return `Talento ${nome} ${azione === 'aggiungi' ? 'acceso' : 'spento'}`;
  return `${chiave}: ${azione} ${nome}`;
}

function etichettaAssegna(percorso) {
  const chiave = percorso.join('.');
  if (chiave === 'scelte.nome') return 'Nome del personaggio';
  if (chiave === 'sessione.note') return 'Note del personaggio';
  if (chiave.startsWith('calendario.')) return 'Nota del calendario';
  return chiave;
}

const ETICHETTE = new Proxy({}, {
  get: (_, chiave) => (info) => {
    if (info.delta !== undefined) return etichettaSomma(chiave.split('.'), info.delta);
    if (info.azione !== undefined) return etichettaInsieme(chiave.split('.'), info.azione, info.valore);
    return etichettaAssegna(chiave.split('.'));
  },
});

/**
 * Accoda le operazioni fra la base nota e lo stato attuale (se ce ne sono: senza modifiche non si accoda
 * niente). Aggiorna la base al nuovo stato, così la prossima differenza riparte da qui — la coda cresce di
 * operazione in operazione, non si ricalcola da capo. Ogni operazione ha il suo identificativo (src/giornale.js):
 * ripresentarle al rientro, anche più volte, non le conta due volte.
 * @returns le operazioni appena accodate (vuoto se niente era cambiato)
 */
export function accoda(id, scelte, sessione, calendario, { quando = new Date() } = {}) {
  const base = leggiBase(id) ?? statoDi(null, null, null);
  const dopo = statoDi(scelte, sessione, calendario);
  const nuove = operazioniDaDiff(base, dopo, { quando, etichette: ETICHETTE });
  if (nuove.length) {
    scrivi(CHIAVE_CODA(id), [...leggiCoda(id), ...nuove]);
    scrivi(CHIAVE_BASE(id), dopo);
  }
  return nuove;
}

/** Il giocatore toglie una riga dalla propria coda (ha sbagliato tocco e lo sa, prima che arrivi al Direttore). */
export function togliDallaCoda(id, opId) {
  scrivi(CHIAVE_CODA(id), leggiCoda(id).filter((o) => o.id !== opId));
}

/** Dopo una risposta del server: le operazioni applicate (accettate) si tolgono dalla coda; quelle in
    conflitto restano, così il giocatore sa che sono ancora in attesa del Direttore. Aggiorna anche la base al
    nuovo stato scritto sul server (`risultato`), per le differenze successive. */
export function confermaRisposta(id, { applicati = [], risultato = null } = {}) {
  if (applicati.length) scrivi(CHIAVE_CODA(id), leggiCoda(id).filter((o) => !applicati.includes(o.id)));
  if (risultato) scrivi(CHIAVE_BASE(id), statoDi(risultato.scelte, risultato.sessione, risultato.calendario));
}

/** Quante operazioni sono in coda (per la riga di stato: «4 modifiche in attesa»). */
export const inCoda = (id) => leggiCoda(id).length;
