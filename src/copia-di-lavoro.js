// Chi tiene l'originale (20/10/2026, chiarimento di Marcello): i personaggi veri stanno sul PC del Direttore. Quella è
// l'unica cartella `personaggi/` che conta; ogni altra installazione è una copia di lavoro, che serve a provare, non a
// custodire. Un personaggio non passa da una copia di lavoro all'originale se non con un'operazione esplicita e dichiarata.
//
// Come si marca un'installazione come copia di lavoro: si mette un file **COPIA-DI-LAVORO.txt** nella cartella
// dell'applicazione o in `personaggi/`. Basta crearlo, senza toccare il codice; la prima riga del file è una nota libera
// («il portatile di Marcello») che l'app mostra. Sul PC del Direttore il file non c'è e l'app non dice niente: dove si
// gioca non si aggiunge rumore.
//
// Il file dentro `personaggi/` finisce anche nei salvataggi (zip di «Salva sessione»): così un ripristino sa da dove
// vengono i dati che sta per rimettere, ed è proprio quello che serve (tools/ripristina.mjs).
//
// Funzioni pure: il server legge il disco, l'interfaccia disegna (src/ui/copia-di-lavoro.js).

/** Nome del file che marca un'installazione come copia di lavoro. */
export const NOME_MARCATORE = 'COPIA-DI-LAVORO.txt';

/** La riga, ben visibile, che compare in cima a ogni pagina di una copia di lavoro. */
export const TESTO_COPIA = 'Copia di lavoro — i personaggi veri sono sul PC del Direttore';

const primaRiga = (testo) => String(testo ?? '').split(/\r?\n/).map((r) => r.trim()).find((r) => r && !r.startsWith('#')) ?? '';

/**
 * Lo stato dell'installazione dal contenuto del marcatore.
 * @param contenuto il testo del file, oppure null se il file non c'è
 * @returns {{ copiaDiLavoro: boolean, nota: string }}
 */
export function statoInstallazione(contenuto) {
  if (contenuto === null || contenuto === undefined) return { copiaDiLavoro: false, nota: '' };
  return { copiaDiLavoro: true, nota: primaRiga(contenuto).slice(0, 120) };
}

/**
 * «Un ingresso solo» (25/10/2026, parte C): il ruolo scelto da Mutant.bat (tools/ruolo-pc.mjs, nel profilo dell'utente)
 * vale sopra il vecchio file COPIA-DI-LAVORO.txt. «prova»: copia di prova, con il nome vero del PC; «originale»: il PC del
 * Direttore, nessuna fascia anche se il vecchio file c'è. Senza ruolo scelto decide il file, come prima.
 * @param ruolo { ruolo: 'originale' | 'prova' | null, nomePc } @param marcatore lo stato dal file (statoInstallazione)
 * @returns {{ copiaDiLavoro, nota, nomePc?, ruolo? }}
 */
export function statoDaRuolo(ruolo, marcatore = statoInstallazione(null)) {
  if (ruolo?.ruolo === 'prova') return { copiaDiLavoro: true, nota: '', nomePc: String(ruolo.nomePc ?? '').slice(0, 80), ruolo: 'prova' };
  if (ruolo?.ruolo === 'originale') return { copiaDiLavoro: false, nota: '', ruolo: 'originale' };
  return marcatore;
}

/** La riga della copia di prova con il nome del PC su cui gira. */
export const testoCopiaDiProva = (nomePc) => `Copia di prova su ${nomePc || 'questo PC'} — i personaggi veri sono sul PC del Direttore`;

/**
 * Che cosa mostrare in cima alla pagina: null sull'installazione del Direttore (nessun rumore dove si gioca).
 * @param stato { copiaDiLavoro, nota, nomePc? } da /api/ping
 */
export function fasciaDaMostrare(stato) {
  if (!stato?.copiaDiLavoro) return null;
  // ruolo scelto: il nome vero del PC, letto dal sistema; senza (il vecchio file scritto a mano) come prima
  if (stato.nomePc) return { testo: testoCopiaDiProva(stato.nomePc), nota: '' };
  return { testo: TESTO_COPIA, nota: stato.nota || '' };
}

/**
 * Che cosa dire prima di un'operazione che può sovrascrivere i personaggi (ripristino, caricamento di un salvataggio,
 * importazione). Dice da dove arrivano i dati e che cosa stanno per sostituire; quando i dati vengono da una copia di
 * lavoro e la destinazione è l'originale (il PC del Direttore) l'avviso è più forte e serve una conferma scritta.
 * @param opz { origine: 'copia'|'originale'|'sconosciuta', destinazione: 'copia'|'originale', che: cosa si sostituisce,
 *              daDove: nome leggibile della sorgente (il file dello zip, il nome del file importato) }
 * @returns {{ livello: 'avviso'|'forte', titolo, righe: string[], confermaScritta: string|null }}
 */
export function avvisoSovrascrittura({ origine = 'sconosciuta', destinazione = 'copia', che = 'i personaggi', daDove = '' } = {}) {
  const dove = destinazione === 'originale'
    ? 'questa è l’installazione del Direttore: la sua cartella personaggi/ è l’originale'
    : 'questa è una copia di lavoro: i personaggi veri restano sul PC del Direttore';
  const da = origine === 'copia' ? 'una copia di lavoro' : origine === 'originale' ? 'l’installazione del Direttore' : 'un’installazione che non si dichiara';
  const forte = origine === 'copia' && destinazione === 'originale';
  return {
    livello: forte ? 'forte' : 'avviso',
    titolo: forte ? 'Stai per sovrascrivere i personaggi veri con dati di una copia di lavoro' : `Stai per sostituire ${che}`,
    righe: [
      `I dati arrivano da: ${da}${daDove ? ` (${daDove})` : ''}.`,
      `Vanno a sostituire: ${che}. ${dove}.`,
      ...(forte ? ['Le partite giocate sul PC del Direttore andrebbero perse: i dati di una copia di lavoro servono a provare, non a custodire.'] : []),
    ],
    confermaScritta: forte ? 'SOVRASCRIVI' : null,
  };
}
