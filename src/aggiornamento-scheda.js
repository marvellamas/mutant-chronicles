// «Il master ha aggiornato la tua scheda» — chi, e con quali modifiche in sospeso (25/10/2026, segnalazione di
// Davide del 24/10, Test 4). Funzioni pure: i testi stanno in regole.json → interfaccia.dispositivo.
//
// Il difetto, riprodotto con due server e un tablet offline: quando il file sul server cambia, la scheda lo
// ricarica con un banner verde che diceva sempre «Il master ha aggiornato la tua scheda» —
//   - anche sulla pagina del Direttore, quando a scrivere era stato un tablet;
//   - anche quando il giocatore aveva modifiche fatte offline in attesa, che nel banner non comparivano;
//   - e il riquadro «Aggiorna / Tieni la mia» non teneva conto del giornale: «Aggiorna» mostrava il valore del
//     Direttore e prometteva di perdere la modifica, ma le voci restavano in coda e partivano lo stesso.
// I due meccanismi (il «server vince» del 112 e il giornale con approvazione dei 113/114) non si conoscevano.
import { tempoTrascorso } from './stato-tablet.js';

const plurale = (n) => (n === 1 ? '1 modifica' : `${n} modifiche`);
const riempi = (testo, valori) => Object.entries(valori).reduce((t, [k, v]) => t.replaceAll(`{${k}}`, v), testo);

/**
 * Il banner dopo che la scheda ha preso la versione del server.
 * @param chi chi ha scritto quella versione (aggiornato_da: 'master' | 'giocatore' | 'px' | null)
 * @param perMaster la pagina è quella del Direttore (non un tablet)
 * @param differenze le differenze di sessione già scritte («PV 18 → 19»)
 * @param inCoda quante modifiche offline del giocatore sono ancora in attesa del Direttore
 * @returns { tipo: 'ok' | 'attenzione', testo }
 */
export function testoAggiornamento({ chi = null, perMaster = false, differenze = [], inCoda = 0 }, dati) {
  const T = dati.regole.interfaccia.dispositivo.aggiornamento_scheda;
  const per = (perMaster ? T.pagina_direttore : T.tablet);
  const chiave = chi in per ? chi : 'altro';
  const diff = differenze.length ? `: ${differenze.join('; ')}` : '';
  const coda = inCoda > 0 && !perMaster ? riempi(T.con_coda, { modifiche: plurale(inCoda) }) : '';
  // con modifiche in attesa non è più un «tutto a posto» verde: il giocatore deve accorgersene
  return { tipo: coda ? 'attenzione' : 'ok', testo: `${per[chiave]}${diff}.${coda}` };
}

const CHI = { master: 'il Direttore', giocatore: 'un altro tuo dispositivo', px: 'il calcolo dei PX' };

/**
 * Il riquadro di conflitto di un tablet che ha modifiche fatte offline in attesa: non «Aggiorna / Tieni la mia»
 * (vedi sopra) ma le due scelte che hanno un senso — vedere la scheda del Direttore lasciando le proprie modifiche in
 * attesa, oppure scartarle.
 * @param conflitto { nome, chi, quando }  la versione del server e chi l'ha scritta
 * @param righe le voci in coda (con `etichetta` e `quando`)
 */
export function conflittoConCoda({ conflitto, righe }, dati, adesso = Date.now()) {
  const C = dati.regole.interfaccia.dispositivo.conflitto_con_coda;
  const n = righe.length;
  return {
    messaggio: riempi(C.messaggio, {
      nome: (conflitto?.nome ?? '').trim() || 'Il personaggio',
      chi: CHI[conflitto?.chi] ?? 'qualcun altro',
      quando: tempoTrascorso(adesso - new Date(conflitto?.quando ?? adesso).getTime()),
      modifiche: plurale(n),
    }),
    spiegazione: C.spiegazione,
    vedi: C.vedi, vediTitolo: C.vedi_titolo,
    scarta: riempi(C.scarta, { modifiche: n === 1 ? 'la mia modifica' : `le mie ${n} modifiche` }), scartaTitolo: C.scarta_titolo,
    righe: righe.map((o) => o.etichetta ?? o.id),
    scartate: riempi(C.scartate, { modifiche: plurale(n) }),
  };
}
