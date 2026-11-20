// Le Pietre di Luna intere (Magia §26.8; A.291, Davide 19/11/2026, lotto 225). Funzioni pure.
//
//   «Inserire nell'app tre voci distinte per le Pietre di Luna intere: 5 PM, 10 PM e 15 PM. Alla sintonizzazione si registra il
//   colore scelto per quella pietra. La scheda mostra un promemoria: il vincolo scade dopo 7 giorni di gioco consecutivi senza
//   contatto. **Il Direttore tiene il conto e conferma la scadenza. Solo a quella conferma**, per perdita di contatto, la pietra si
//   svuota e torna neutra; **l'app non applica la scadenza da sola.**»
//
// Perché l'app non la applica da sola (oltre al principio di CLAUDE.md: avvisa, non decide, l'ultima parola è del master): per
// contare «7 giorni di gioco consecutivi senza contatto» servirebbe sapere **quando** il possessore ha toccato la pietra l'ultima
// volta e quali sono i giorni di gioco — un dato che non esiste (nessuna voce registra un contatto; il Calendario è facoltativo e
// non sa che cosa sia un «contatto»). Non lo inventiamo: lo tiene il Direttore. Se un giorno si volesse un conto automatico
// servirebbe: l'ultimo contatto per ogni pietra (data di gioco), una definizione di «giorno di gioco» (i giorni del
// Calendario? i capitoli?) e il Calendario attivo su ogni personaggio. Niente di tutto questo è stato aggiunto.
//
// Come funziona nell'app: la pietra è un Artefatto a tutti gli effetti (voce `artefatto:pietra-di-luna-N-pm`); finché non ha un
// colore è **neutra** e non ha riserva; con un colore «funziona come una Batteria Mistica del colore scelto» — lo stesso
// contenitore, la stessa riserva di PM in `sessione.chroma[uid]` — e la sua SnT dipende dal colore (Rosso, Blu, Verde 1/2/3 per
// 5/10/15 PM; Bianco Universale 2/3/4; il Viola non rientra in questa procedura).

/** I colori che una Pietra di Luna può avere alla sintonizzazione (§26.8: il Viola non rientra). */
export const COLORI_PIETRA = ['Rosso', 'Blu', 'Verde', 'Bianco'];

/** Il promemoria che la scheda mostra, parola per parola quello della risposta. */
export const PROMEMORIA_VINCOLO = 'Il vincolo scade dopo 7 giorni di gioco consecutivi senza contatto con il possessore (Magia §26.8). Il Direttore tiene il conto e conferma la scadenza: solo a quella conferma la pietra si svuota e torna neutra. L’app non applica la scadenza da sola.';

export const eUnaPietra = (def) => !!def?.pietra_di_luna;

/** Il colore scelto per questa pietra (alla sintonizzazione), o null se è ancora neutra. */
export function colorePietra(voce) {
  const c = voce?.pietra?.colore;
  return COLORI_PIETRA.includes(c) ? c : null;
}

/** La SnT di una pietra: dipende dalla capacità e dal colore (il Bianco Universale costa 1 in più). */
export function sntPietra(def, colore) {
  const base = def?.pietra_di_luna?.snt_per_colore;
  if (!base) return null;
  const n = base[colore ?? 'Rosso'];
  return Number.isInteger(n) ? n : null;
}

/**
 * Le informazioni di Artefatto di una voce-pietra, nella stessa forma di `infoArtefatto`: con un colore è una Batteria di quel
 * colore (contenitore con la capacità della pietra); senza, una pietra neutra, senza riserva. La potenza e il Grado seguono la SnT
 * dalla tabella di §7.10 (`artefatti.json → sintonizzazione`).
 */
export function infoPietra(def, voce, dati) {
  const p = def?.pietra_di_luna;
  if (!p || !def.artefatto) return null;
  const colore = colorePietra(voce);
  const snt = sntPietra(def, colore);
  const gradi = dati?.equipaggiamento?.file?.artefatti?.sintonizzazione?.gradi ?? {};
  const romani = Object.keys(gradi);
  const potenze = dati?.equipaggiamento?.file?.artefatti?.sintonizzazione?.potenze ?? {};
  const potenza = Object.keys(potenze).find((k) => potenze[k] === snt) ?? def.artefatto.potenza;
  const grado = romani.find((g) => gradi[g] === potenza) ?? def.artefatto.grado;
  return {
    ...def.artefatto,
    sintonizzazione: snt ?? def.artefatto.sintonizzazione, potenza, grado,
    ...(colore ? { contenitore: { energia: colore, capacita_pm: p.capacita_pm } } : { contenitore: undefined }),
    pietra: { colore, neutra: !colore },
  };
}

/**
 * **La conferma del Direttore** (A.291): la pietra si svuota e torna neutra — colore tolto, sintonizzazione interrotta, riserva a 0.
 * È l'**unico** punto in cui una pietra perde il vincolo; senza `dalDirettore: true` non fa niente e lo dice. Nessuna funzione
 * dell'app (nuova sessione, Round, Calendario, ricarica, deposito) la chiama da sola.
 * @param voci l'equipaggiamento del personaggio  @param sessione la sessione (chroma per uid)
 * @returns { ok, voci, sessione, riga } | { ok: false, motivo }
 */
export function confermaScadenzaVincolo(voci, sessione, uid, { dalDirettore = false, quando = new Date() } = {}) {
  if (dalDirettore !== true) return { ok: false, motivo: 'La scadenza del vincolo la conferma solo il Direttore: l’app non la applica da sola (A.291).' };
  const v = (voci ?? []).find((x) => x?.uid === uid);
  if (!v) return { ok: false, motivo: 'oggetto non trovato' };
  if (!colorePietra(v)) return { ok: false, motivo: 'questa pietra è già neutra: non c’è un vincolo da far scadere' };
  const { sintonizzato: _s, pietra: _p, ...resto } = v;
  const chroma = { ...(sessione?.chroma ?? {}) };
  const prima = chroma[uid]?.pmAttuali;
  chroma[uid] = { ...(chroma[uid] ?? {}), pmAttuali: 0 };
  const riga = `Vincolo della Pietra di Luna scaduto per perdita di contatto (confermato dal Direttore, ${quando.toISOString().slice(0, 10)}): ${colorePietra(v)} → neutra${Number.isFinite(prima) ? `, ${prima} PM dispersi` : ''} (A.291).`;
  return { ok: true, voci: voci.map((x) => (x === v ? resto : x)), sessione: { ...(sessione ?? {}), chroma }, riga };
}

// ——— A.298 (Davide, 19/11/2026, lotto 228): la data dell'ultimo contatto e l'avviso «Verifica il vincolo» ————————————————————
//
//   «Per ogni Pietra di Luna intera si può registrare la data dell'ultimo contatto con il possessore. Il campo è facoltativo. Si
//   contano sette giorni consecutivi del calendario della campagna, non giorni reali, sessioni o capitoli. Un nuovo contatto fa
//   ripartire il conteggio dalla sua data. Con il calendario attivo e una data nota, dopo sette giorni senza contatto l'app deve
//   mostrare al Direttore «Verifica il vincolo». […] Se manca la data o il calendario non è attivo, resta il promemoria manuale
//   della A.291. Per le pietre già in gioco non si assegnano date presunte. L'avviso non modifica la pietra.»
//
// Il «calendario della campagna» è oggi il Calendario di gioco facoltativo di ciascun personaggio (blocco `calendario`, src/calendario.js):
// non esiste un calendario condiviso dal gruppo. Il conto usa quello del personaggio che porta la pietra, quando è attivo.
// **Queste funzioni non scrivono mai nella pietra**: leggono, e dicono. Svuotarla resta solo `confermaScadenzaVincolo`.
import { dataValida, aggiungiGiorni } from './calendario.js';

export const GIORNI_VINCOLO = 7;
export const TESTO_VERIFICA = 'Verifica il vincolo';

/**
 * Lo stato del vincolo di una pietra rispetto al calendario di chi la porta.
 * @returns {{ stato: 'neutra'|'senza_data'|'calendario_spento'|'in_corso'|'verifica', ultimoContatto: string|null, scadeIl: string|null, oggi: string|null, avviso: string|null }}
 *   'verifica' = sette giorni di calendario senza contatto: il Direttore guarda e decide; nient'altro succede.
 */
export function statoVincolo(voce, calendario) {
  const colore = colorePietra(voce);
  const contatto = voce?.pietra?.ultimoContatto;
  const nullo = { ultimoContatto: null, scadeIl: null, oggi: null, avviso: null };
  if (!colore) return { stato: 'neutra', ...nullo };
  if (!dataValida(contatto)) return { stato: 'senza_data', ...nullo };
  const scadeIl = aggiungiGiorni(contatto, GIORNI_VINCOLO);
  if (!calendario?.attivo || !dataValida(calendario?.oggi?.data)) return { stato: 'calendario_spento', ultimoContatto: contatto, scadeIl, oggi: null, avviso: null };
  const oggi = calendario.oggi.data;
  if (oggi >= scadeIl) return { stato: 'verifica', ultimoContatto: contatto, scadeIl, oggi, avviso: TESTO_VERIFICA };
  return { stato: 'in_corso', ultimoContatto: contatto, scadeIl, oggi, avviso: null };
}

/** Registra un nuovo contatto: la data sostituisce la precedente e il conto riparte da lì. Data non valida → niente, con il motivo. */
export function registraContatto(voce, data) {
  if (!colorePietra(voce)) return { ok: false, motivo: 'la pietra è neutra: non c’è un vincolo da contare' };
  if (!dataValida(data)) return { ok: false, motivo: 'la data non è valida (AAAA-MM-GG)' };
  return { ok: true, voce: { ...voce, pietra: { ...voce.pietra, ultimoContatto: data } } };
}

/** Toglie la data (il campo è facoltativo): la pietra torna a non avere un conto, e resta il promemoria manuale. */
export function toglieContatto(voce) {
  if (!voce?.pietra?.ultimoContatto) return voce;
  const { ultimoContatto: _u, ...pietra } = voce.pietra;
  return { ...voce, pietra };
}
