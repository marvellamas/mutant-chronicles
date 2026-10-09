// Aiuto-master (per-davide A.122, risposta di Davide dell'08/10/2026): ruolo facoltativo che il Direttore assegna a un
// tablet collegato e revoca quando vuole, senza una pagina separata. Uno solo alla volta; vale per lo scontro aperto in
// cui è stato assegnato e si perde alla sua chiusura o al riavvio del server (lo stato sta solo in memoria).
// - Muove soltanto il PG del turno attivo, con gli stessi controlli del tablet del giocatore (movimento, Q, muri, porte,
//   quadretti occupati: src/mappa/tablet.js → eseguiMovimentoGiocatore); nessun «Libero».
// - Vede la mappa come i giocatori (src/mappa/vista.js): niente nascosti, niente sotto la nebbia, niente note del Direttore.
// - Non modifica schede, risorse, Iniziativa, scena, nebbia, luci o nemici: il server rifiuta ogni scrittura che porta
//   l'intestazione del ruolo, salvo il movimento e la linea di tiro (che non scrive).
// - Ogni suo movimento lascia nel registro dello scontro «mosso da Aiuto-master (tablet di …)».
// Funzioni pure, usate dal server (server.mjs) e dai test.
import { stessaChiave } from '../veicoli-registro.js';
import { diTurno } from '../scontro.js';

/** Intestazione HTTP con cui il tablet dell'Aiuto-master firma le sue richieste (il valore è il gettone del ruolo). */
export const INTESTAZIONE = 'x-mutant-aiuto-master';

/** Richieste ammesse per l'Aiuto-master: tutte le letture; fra le scritture solo il movimento e la linea di tiro. */
const AMMESSE = new Set(['/api/vista-giocatori/movimento', '/api/vista-giocatori/linea']);

/** Che cosa tocca una richiesta, per il messaggio di rifiuto. */
function ambito(percorso) {
  if (/^\/api\/(personaggi|cartella)/.test(percorso)) return 'le schede dei personaggi';
  if (percorso.startsWith('/api/scontri')) return 'lo scontro (Iniziativa, turni, danni, risorse)';
  if (percorso.startsWith('/api/scene') || percorso.startsWith('/api/mappe') || percorso.startsWith('/api/vista-giocatori')) return 'la scena (mappa, token, nebbia, luci, muri)';
  if (percorso.startsWith('/api/nemici')) return 'i nemici';
  if (percorso.startsWith('/api/veicoli')) return 'i veicoli';
  if (percorso.startsWith('/api/tablet')) return 'i tablet e i ruoli';
  if (percorso.startsWith('/api/tavolo')) return 'chi è al tavolo';
  return 'i dati del tavolo';
}

/**
 * Una richiesta che porta l'intestazione dell'Aiuto-master è ammessa? null se sì, altrimenti { stato: 403, errore }
 * con un messaggio chiaro. Le letture (GET, HEAD) passano sempre.
 */
export function rifiutoAiuto(metodo, percorso) {
  if (metodo === 'GET' || metodo === 'HEAD' || AMMESSE.has(percorso)) return null;
  return { stato: 403, errore: `L’Aiuto-master può soltanto muovere il PG del turno attivo: modificare ${ambito(percorso)} spetta al Direttore.` };
}

/** Nuovo ruolo: { chiave (PG del tablet), nome, scontro, gettone, dal }. Sostituisce l'eventuale precedente (uno alla volta). */
export function assegnaAiuto({ chiave, nome, scontro }, gettone, adesso = new Date()) {
  return { chiave, nome: nome || chiave, scontro, gettone, dal: adesso.toISOString() };
}

/** Il ruolo vale ancora? Serve lo scontro in cui è stato assegnato, ancora aperto. */
export const ruoloValido = (ruolo, scontro) => !!ruolo && !!scontro && scontro.id === ruolo.scontro && scontro.stato === 'aperto';

/** Il ruolo dopo il salvataggio di uno scontro: si perde quando quello scontro si chiude. */
export const ruoloDopoScontro = (ruolo, dopo) => (ruolo && dopo && dopo.id === ruolo.scontro && dopo.stato !== 'aperto' ? null : ruolo);

/** È il tablet dell'Aiuto-master (stesso PG e gettone giusto)? */
export const eAiuto = (ruolo, chiave, gettone) => !!ruolo && !!gettone && gettone === ruolo.gettone && stessaChiave(ruolo.chiave, chiave);

/**
 * Il PG che l'Aiuto-master può muovere adesso: { ok, chiave, nome } oppure { ok: false, stato, errore }. Solo il PG del
 * turno attivo; con `bersaglio` (il PG che il tablet crede di muovere) diverso dal PG di turno, rifiuto.
 */
export function pgDaMuovere(ruolo, scontro, bersaglio = null) {
  if (!ruolo) return { ok: false, stato: 403, errore: 'Non sei Aiuto-master: il Direttore ha revocato il ruolo.' };
  if (!ruoloValido(ruolo, scontro)) return { ok: false, stato: 403, errore: 'Il ruolo di Aiuto-master vale solo nello scontro in cui il Direttore lo ha dato, finché è aperto.' };
  const t = diTurno(scontro);
  if (!t || t.tipo !== 'pg') return { ok: false, stato: 422, errore: 'Di turno non c’è un PG: l’Aiuto-master muove solo il PG del turno attivo.' };
  if (bersaglio && !stessaChiave(bersaglio, t.chiave)) return { ok: false, stato: 403, errore: `Puoi muovere solo il PG del turno attivo (${t.nome}).` };
  return { ok: true, chiave: t.chiave, nome: t.nome };
}

/** Il ruolo come lo vede il Direttore (senza gettone). */
export const ruoloPubblico = (ruolo) => (ruolo ? { chiave: ruolo.chiave, nome: ruolo.nome, scontro: ruolo.scontro, dal: ruolo.dal } : null);
