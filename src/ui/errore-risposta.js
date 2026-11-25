// Lotto 249 (parte F): il motivo che il server dà non si butta.
//
// «bestiario non leggibile (500)» non dice niente a nessuno: il server, in quel caso, stava spiegando che la
// cartella non era scrivibile. Un avviso che non dice niente è il difetto che questo lotto chiude, e vale anche
// per gli avvisi tecnici: chi legge una risposta non riuscita prende il campo `errore` del corpo, e usa il numero
// soltanto se il corpo non c'è.

/**
 * L'errore da una risposta non riuscita: il messaggio del server se c'è, altrimenti «<cosa> non leggibile (<stato>)».
 * @param r la Response
 * @param cosa che cosa si stava leggendo, in parole da tavolo («bestiario», «elenco della musica»)
 */
export async function erroreRisposta(r, cosa) {
  const corpo = await r.json().catch(() => null);
  const motivo = typeof corpo?.errore === 'string' && corpo.errore.trim() ? corpo.errore.trim() : null;
  return Object.assign(new Error(motivo ? `${cosa}: ${motivo}` : `${cosa} non leggibile (${r.status})`), { stato: r.status });
}
