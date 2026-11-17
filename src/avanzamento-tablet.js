// L'avanzamento dell'adeguamento delle Abilità **mentre il giocatore assegna**, per la plancia del Direttore (lotto 215, 17/11/2026).
//
// Il problema. La bozza dell'assegnazione vive sul tablet (lotto 212) e il file del personaggio si scrive solo alla «Conferma»:
// quindi la plancia leggeva «0/21» per tutto il tempo, e il Direttore non poteva distinguere un giocatore fermo da uno a metà.
//
// Come si risolve senza scrivere la bozza nel file. Il tablet **comunica** al server quanti punti ha messo (un numero e due
// identificativi), il server li tiene **in memoria** e la plancia li legge. Non è un salvataggio: non tocca il file del personaggio,
// non passa dalla regola del server sui punti tolti da un tablet (`controllaPuntiDaTablet` guarda i file, qui non ne scriviamo), e se il
// server si riavvia si perde soltanto l'informazione, mai un punto. È solo informazione per il Direttore: un valore falso
// (un tablet che mente) cambia una riga di testo, non un VA.
//
// Funzioni pure.

/** Dopo quanto un avanzamento non si mostra più (un giocatore che ha chiuso la scheda e non è tornato). */
export const SCADENZA_MS = 6 * 60 * 60 * 1000;

/**
 * Il corpo di una comunicazione del tablet, ripulito. null se non è utilizzabile.
 * @returns { chiave, riga, assegnati, monte, quando }
 */
export function normalizzaAvanzamento(corpo, ora = Date.now()) {
  const chiave = typeof corpo?.chiave === 'string' ? corpo.chiave.trim().slice(0, 120) : '';
  const riga = typeof corpo?.riga === 'string' && corpo.riga ? corpo.riga.slice(0, 120) : null;
  const assegnati = Number(corpo?.assegnati);
  const monte = Number(corpo?.monte);
  if (!chiave || !Number.isInteger(assegnati) || !Number.isInteger(monte)) return null;
  if (monte < 1 || monte > 200 || assegnati < 0 || assegnati > monte) return null;
  return { chiave, riga, assegnati, monte, quando: ora };
}

/**
 * La riga di stato della plancia, con l'avanzamento del tablet se c'è e **se è di questo adeguamento** (stessa riga di registro).
 * Non si fida di un avanzamento di un adeguamento vecchio o già chiuso, e non scende mai sotto quello scritto nel file.
 * @param adeguamento il risultato di `statoPerPlancia` (può essere null)
 * @param av l'avanzamento del tablet ({ riga, assegnati, monte, quando }) o null
 */
export function conAvanzamentoTablet(adeguamento, av, ora = Date.now()) {
  if (!adeguamento || adeguamento.stato !== 'in corso' || !av) return adeguamento;
  if (!adeguamento.riga || av.riga !== adeguamento.riga || av.monte !== adeguamento.monte) return adeguamento;
  if (!Number.isFinite(av.quando) || ora - av.quando > SCADENZA_MS) return adeguamento;
  const assegnati = Math.max(adeguamento.assegnati, av.assegnati);
  if (assegnati === adeguamento.assegnati) return adeguamento;
  const rimasti = adeguamento.monte - assegnati;
  return {
    ...adeguamento, assegnati, sulTablet: true,
    finito: false, // finché non conferma, per il file non è finito
    testo: rimasti === 0
      ? `ha messo tutti i ${adeguamento.monte} punti sul tablet: manca solo «Conferma»`
      : `in corso: ${assegnati}/${adeguamento.monte} punti sul tablet (non ancora confermati), ne restano ${rimasti}`,
  };
}
