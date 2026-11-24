// «Annulla» dell'ultima azione (lotto 244). Funzioni pure: lo stato vero sta in src/ui/app.js, qui si decide che cosa il pulsante può dire.
//
// COSA ANNULLA OGGI (e cosa no) — scritto qui perché un pulsante grande in cima promette «torno indietro da qualsiasi errore», e se copre
// solo una parte delle azioni, al tavolo qualcuno lo preme credendo di aver rimediato:
//
//  • ANNULLA l'ultimo cambiamento dei **valori di sessione** (PV, PM, Ferite, Stati, munizioni, caricatori e celle, riserve di Chroma,
//    Round, durate, Tecniche e incantesimi in corso, usi dei Talenti, Punti Eroe, Distintivi…) e del **calendario**: la scheda tiene UNA
//    fotografia, quella di prima dell'ultima di queste azioni, e «Annulla» la rimette.
//  • NON ANNULLA — e il pulsante lo dice, spento, col motivo — tutto ciò che cambia le **scelte** o i **livelli** del personaggio
//    (acquisti e crediti spesi, oggetti, incantesimi aggiunti o tolti, creazione, salita di livello, Talenti, progetti, veicoli,
//    cibernetica), un **tiro** o una riga dello **storico**, e ogni cambiamento arrivato da fuori (un altro tablet, il master). Alcune di
//    queste hanno un annullo proprio: «Annulla l'ultimo livello», l'«Annulla» di ogni riga del registro del master.
//
// LA REGOLA CHE TIENE ONESTO IL PULSANTE: la fotografia dice anche com'era lo stato **subito dopo** l'azione che la ha scattata. Se al
// momento di premere lo stato è diverso (è successa un'altra cosa che non sa annullare), il pulsante è spento e dice quale: non annulla
// «quella di prima» al posto dell'ultima. E non può risalire più indietro di una azione.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Lo stato che conta per l'annullo: i quattro riferimenti (cambiano sempre oggetto quando cambiano di valore). */
export const fotografia = ({ sessione = null, calendario = null, scelte = null, livelli = null } = {}) => ({ sessione, calendario, scelte, livelli });

/** La fotografia «di prima» dell'ultima azione annullabile; `dopo` si riempie appena l'azione ha finito (vedi `chiudiPrecedente`). */
export const nuovoPrecedente = (prima, tipo = 'sessione') => ({ prima: { sessione: prima?.sessione ?? null, calendario: prima?.calendario ?? null }, dopo: null, tipo, nonAnnullabile: null });

/** Registra com'è lo stato subito dopo l'azione (una volta sola). */
export function chiudiPrecedente(prec, ora) {
  if (prec && !prec.dopo) prec.dopo = fotografia(ora);
  return prec;
}

/** Un'azione che ha già scattato la fotografia ma ha cambiato anche altro: da qui non si annulla, e si dice perché. */
export function segnaNonAnnullabile(prec, motivo) {
  if (prec) prec.nonAnnullabile = motivo;
  return prec;
}

/** Un cambiamento che non è un'azione da annullare (la memoria delle scelte di «Attacca!» e «Lancia!»): il riferimento lo segue. */
export function sincronizzaRiferimento(prec, base, ora) {
  if (prec?.dopo) prec.dopo = { ...prec.dopo, sessione: ora.sessione };
  else if (base) base = { ...base, sessione: ora.sessione };
  return base;
}

const NOMI_CHIAVI = {
  storico: 'lo storico del personaggio', tiri: 'i tiri', note: 'le note', crediti: 'i crediti', munizioni: 'le munizioni',
  chroma: 'le riserve di Chroma', integrita: 'l’integrità degli oggetti', nec: 'le riserve NEC',
};

function chiaviCambiate(a, b) {
  const x = isOggetto(a) ? a : {};
  const y = isOggetto(b) ? b : {};
  return Object.keys({ ...x, ...y }).filter((k) => JSON.stringify(x[k]) !== JSON.stringify(y[k]));
}

/**
 * Che cosa è cambiato rispetto al riferimento, a parole: «gli oggetti, i crediti o le scelte del personaggio», «lo storico del
 * personaggio»… Vuota se non è cambiato niente.
 */
export function cosaCambiato(riferimento, ora) {
  if (!riferimento) return [];
  const out = [];
  if (riferimento.scelte !== ora.scelte) out.push('gli oggetti, i crediti o le scelte del personaggio');
  if (riferimento.livelli !== ora.livelli) out.push('i livelli del personaggio');
  if (riferimento.sessione !== ora.sessione) {
    const k = chiaviCambiate(riferimento.sessione, ora.sessione);
    if (k.length) out.push(k.length <= 2 ? k.map((x) => NOMI_CHIAVI[x] ?? `valori di sessione (${x})`).join(' e ') : 'valori di sessione');
  }
  if (riferimento.calendario !== ora.calendario && JSON.stringify(riferimento.calendario) !== JSON.stringify(ora.calendario)) out.push('il calendario');
  return [...new Set(out)];
}

/**
 * Che cosa farebbe «Annulla» adesso: «PV 34 → 40», o «Stati: − Sanguinante». Le differenze fra lo stato di adesso e la fotografia di prima.
 * @param differenze la funzione `differenzeSessione` di src/collegamento.js
 */
export function descriviAnnullo(prec, ora, { differenze = () => [], nomeStato = (x) => x } = {}) {
  if (!prec) return '';
  const d = differenze(ora.sessione, prec.prima.sessione, nomeStato);
  if (JSON.stringify(ora.calendario) !== JSON.stringify(prec.prima.calendario)) d.push('calendario');
  return d.join('; ');
}

/**
 * Lo stato del pulsante «Annulla»: { attivo, vuoto, etichetta, motivo }.
 *   attivo    vero solo se l'ULTIMA azione è quella della fotografia e il pulsante sa rimetterla com'era
 *   etichetta cosa annullerà («PV 34 → 40»), solo se attivo
 *   motivo    perché non si può, in una frase («L'ultima azione non si annulla: …»), solo se spento
 *   vuoto     vero se non c'è ancora niente da annullare (nessuna azione fatta)
 * @param prec la fotografia (o null)
 * @param base lo stato di riferimento quando non c'è una fotografia (alla riapertura della scheda o dopo un aggiornamento da fuori)
 * @param ora lo stato di adesso, fotografia()
 */
export function statoAnnulla(prec, base, ora, opz = {}) {
  const riferimento = prec ? prec.dopo : base;
  const cambiato = cosaCambiato(riferimento, ora);
  if (cambiato.length) {
    return { attivo: false, vuoto: false, etichetta: null, motivo: `L’ultima azione non si annulla: ha cambiato ${cambiato.join(' e ')}. Questo pulsante rimette solo i valori di sessione e il calendario.` };
  }
  if (!prec) return { attivo: false, vuoto: true, etichetta: null, motivo: 'Niente da annullare: non hai ancora fatto nessuna azione.' };
  if (prec.nonAnnullabile) return { attivo: false, vuoto: false, etichetta: null, motivo: `L’ultima azione non si annulla: ${prec.nonAnnullabile}.` };
  const testo = descriviAnnullo(prec, ora, opz);
  return { attivo: true, vuoto: false, etichetta: testo || 'ultima modifica', motivo: null };
}
