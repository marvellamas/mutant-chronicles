// Lotto 185: aspettare un server di prova senza un budget preso a caso.
//
// Prima ogni test che avviava `node server.mjs` scriveva il suo giro di attesa: «sessanta volte, ogni 250 ms».
// Due difetti. Il primo: se il processo moriva subito (porta occupata, flag sbagliato) il test aspettava comunque
// quindici secondi e poi diceva soltanto «il server non risponde», senza la causa. Il secondo: il primo quarto di
// secondo era sempre speso, anche quando il server era già pronto.
//
// `attendiServer` prova subito, poi ogni 100 ms, e si arrende **appena il processo esce**, dicendo codice e output.
// Il tempo massimo resta quello del test (`{ timeout: … }` di node:test): qui non si allunga nulla, si smette prima.
import { setTimeout as dormi } from 'node:timers/promises';

/**
 * Aspetta che `prova()` torni qualcosa di diverso da null/undefined/false e lo restituisce.
 * @param prova funzione (anche asincrona) che tenta la richiesta e torna null se il server non c'è ancora
 * @param figlio il processo avviato con spawn: se esce prima, l'attesa finisce subito con l'errore
 * @param ms tempo massimo di sicurezza (il limite vero è il timeout del test)
 */
export async function attendiServer(prova, { figlio = null, ms = 60000, passo = 100, cosa = 'il server di prova' } = {}) {
  let uscita = null;
  let testo = '';
  if (figlio) {
    figlio.on('exit', (codice, segnale) => { uscita = { codice, segnale }; });
    for (const flusso of [figlio.stdout, figlio.stderr]) flusso?.on('data', (d) => { testo += d; });
  }
  const fine = Date.now() + ms;
  for (;;) {
    const r = await prova();
    if (r !== null && r !== undefined && r !== false) return r;
    if (uscita) throw new Error(`${cosa} è uscito prima di rispondere (codice ${uscita.codice}${uscita.segnale ? `, segnale ${uscita.segnale}` : ''}).${testo ? `\n${testo.trim()}` : ''}`);
    if (Date.now() >= fine) throw new Error(`${cosa} non ha risposto in ${Math.round(ms / 1000)} s.${testo ? `\n${testo.trim()}` : ''}`);
    await dormi(passo);
  }
}

/** La stessa attesa per una condizione che non è una richiesta (per esempio «chi occupa la porta»). */
export const attendiCondizione = (cond, opzioni = {}) => attendiServer(async () => ((await cond()) ? true : null), opzioni);
