// Lotto 250: la pagina non mangia più gli errori.
//
// **Il motivo, che va scritto perché la regola non si perda.** Nel lotto 249 «Sposta i punti» del giocatore lanciava
// `ReferenceError: ridisegna is not defined`: il file si salvava, il pannello restava aperto come se non fosse
// successo niente, e l'avviso al Direttore non partiva mai. Al tavolo si vede come «ho premuto e non è successo
// niente», che è il modo peggiore in cui un'app si rompe: non dà errore, non fa niente, e chi la usa pensa di aver
// sbagliato lui. La guardia del 247 non lo vedeva perché prova il motore e non la pagina.
//
// **Un errore inghiottito è informazione persa, esattamente come un blocco togliato senza avviso** (la regola ferrea
// di CLAUDE.md). Quindi un errore che non ha un posto dove andare finisce qui, e qui si vede in tre posti diversi,
// ciascuno con quello che gli serve:
//   - al **giocatore** una riga comprensibile, breve, senza termini tecnici: «Qualcosa non è andato: … Riprova, o
//     chiama il Direttore.»;
//   - al **Direttore**, nel suo diario (lotto 249), la cosa precisa: il messaggio, il file e la riga;
//   - a **noi**, in console, l'errore intero con la sua pila.
//
// **Non blocca.** Non c'è finestrella, non c'è conferma, niente aspetta una risposta: la regola vale anche per gli
// errori. E non diventa un muro: lo stesso errore ripetuto si conta una volta sola (`chiave`), come fa il modulo
// degli avvisi brevi dal 06/10.
import { avvisoErrore } from './avvisi.js';
import { mandaAvviso, chiAvvisa } from '../avvisi-invio.js';

/** Quante volte lo stesso errore è già passato di qui: il secondo non ridisegna l'avviso, lo conta. */
const visti = new Map();
let installato = false;

/** La riga per chi gioca: corta, senza pile e senza nomi di funzioni. */
export function rigaPerIlGiocatore(messaggio) {
  const m = String(messaggio ?? '').replace(/\s+/g, ' ').trim();
  // «ReferenceError: ridisegna is not defined» non dice niente a un giocatore: resta il fatto, non il nome tecnico
  const tecnico = /^(Reference|Type|Range|Syntax|Internal)Error\b/.test(m) || /is not (defined|a function)/.test(m);
  const corto = tecnico || m.length > 90 ? '' : `: ${m}`;
  return `Qualcosa non è andato${corto}. Quello che hai fatto potrebbe non essere stato salvato: riprova, o chiama il Direttore.`;
}

/** La riga per il Direttore: la cosa precisa, perché è lui che poi ci dice che cosa è successo. */
export function rigaPerIlDirettore(e, dove) {
  const m = String(e?.message ?? e ?? 'errore senza messaggio').replace(/\s+/g, ' ').trim();
  return dove ? `${m} (${dove})` : m;
}

/**
 * Registra un errore che nessuno ha gestito. Non lancia mai e non aspetta niente.
 * @param e l'errore (o il motivo di una promessa rifiutata)
 * @param dove file e riga, se il browser le dà
 */
export function erroreVisto(e, dove = null) {
  const messaggio = String(e?.message ?? e ?? '');
  const chiave = `errore:${messaggio}:${dove ?? ''}`;
  const quante = (visti.get(chiave) ?? 0) + 1;
  visti.set(chiave, quante);
  // a noi, intero
  try { console.error('[Mutant] errore non gestito:', e, dove ?? ''); } catch { /* console assente: non è un motivo per fermarsi */ }
  // al giocatore, una riga: `avvisoErrore` conta da sé le ripetizioni con la stessa chiave
  try { avvisoErrore(rigaPerIlGiocatore(messaggio), { chiave }); } catch { /* se nemmeno l'avviso si disegna resta la console */ }
  // al Direttore, nel diario: la cosa precisa. Solo la prima volta, perché il diario non è un registro tecnico.
  if (quante === 1) {
    try {
      mandaAvviso({
        chi: chiAvvisa(),
        cosa: 'un errore dell’app non gestito: quello che stava facendo potrebbe non essere stato salvato',
        numeri: null,
        motivo: rigaPerIlDirettore(e, dove),
        dove: 'console del browser (dettaglio tecnico)',
        gravita: 'grossa',
      });
    } catch { /* il diario non è parte dell'azione: se non c'è il server, resta la console */ }
  }
  return { messaggio, quante };
}

/** Si installa una volta, all'avvio della pagina. Senza `window` (nei test puri) non fa niente. */
export function installaErroriVisti(finestra = typeof window === 'undefined' ? null : window) {
  if (!finestra || installato) return false;
  installato = true;
  finestra.addEventListener('error', (ev) => {
    // un'immagine o uno script che non carica arriva qui come evento di risorsa: non è un errore di codice
    if (!ev?.error && !ev?.message) return;
    const dove = ev.filename ? `${String(ev.filename).split('/').pop()}:${ev.lineno ?? '?'}` : null;
    erroreVisto(ev.error ?? ev.message, dove);
  });
  finestra.addEventListener('unhandledrejection', (ev) => {
    erroreVisto(ev?.reason ?? 'promessa rifiutata senza motivo', null);
  });
  return true;
}

/** Per i test: azzera il conto delle ripetizioni. */
export function azzeraErroriVisti() { visti.clear(); }
