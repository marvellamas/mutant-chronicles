// Porte della mappa di battaglia (fase 2, lotto 2; §6 della specifica; A.125, decisione 130 di docs/risposte-master.md).
// Regola di Davide: aprire o chiudere una normale porta accessibile e non bloccata costa 1 AzP, senza Prova, essendo
// adiacenti e con una mano libera; attraversarla consuma il normale movimento, separato dall'apertura; una porta
// bloccata richiede prima la procedura per sbloccarla, scassinarla o forzarla; «chiusa» e «bloccata» sono distinte.
//
// Una porta sta su un Q (di solito un Q di muro): { id, q: [x, y], stato: aperta | chiusa | bloccata, segreta }.
// Per il movimento la porta aperta è un passaggio, chiusa o bloccata è muro (stesso trattamento dei muri anche per le
// diagonali, A.124 e A.134). Una porta segreta, per i giocatori, è muro finché il master non la rivela (segreta: false):
// nei dati che il server manda ai giocatori resta un Q di muro, senza la porta. Per la linea di visuale (prossimo lotto)
// una porta che non è aperta blocca la vista (data/mappa.json → porte.bloccano_vista).
// Le azioni dei token (aprire, chiudere) si contano come AzP del Round in scena.azioni; il registro dello scontro ha
// la sua riga (src/scontro.js → rigaPorta). Funzioni pure.
import { daBase64, cella, impostaCella } from './celle.js';
import { celleToken } from './token.js';

export const STATI_PORTA = ['aperta', 'chiusa', 'bloccata'];

const stessoQ = (a, b) => a[0] === b[0] && a[1] === b[1];
/** La porta sul Q q, o null. */
export const portaA = (scena, q) => (scena.porte ?? []).find((p) => stessoQ(p.q, q)) ?? null;

/**
 * Maschera dei muri per il movimento (e per la vista, prossimo lotto): i muri disegnati, più le porte chiuse o bloccate,
 * meno le porte aperte. `perGiocatori`: le porte segrete restano muro qualunque sia il loro stato (nessuna fuga).
 */
export function muriEffettivi(scena, { perGiocatori = false } = {}) {
  const { colonne: C, righe: R } = scena.griglia;
  const m = daBase64(scena.muri);
  for (const p of scena.porte ?? []) {
    const muro = (perGiocatori && p.segreta) || p.stato !== 'aperta';
    impostaCella(m, C, R, p.q[0], p.q[1], muro);
  }
  return m;
}

/** La porta blocca la linea di visuale? (prossimo lotto: data/mappa.json → porte.bloccano_vista) */
export const bloccaVista = (p, regole) => regole.bloccano_vista.includes(p.stato);

/** Il token è adiacente alla porta (un Q del suo ingombro a distanza 1, anche in diagonale)? */
export function adiacente(token, porta) {
  return celleToken(token).some(([x, y]) => Math.max(Math.abs(x - porta.q[0]), Math.abs(y - porta.q[1])) === 1);
}
/** Le porte adiacenti al token (per «Apri porta» / «Chiudi porta» dal suo menu e dal pannello). */
export const porteVicine = (scena, token) => (scena.porte ?? []).filter((p) => adiacente(token, p));

/**
 * Apre o chiude una porta: { porta } con lo stato nuovo, oppure { errore }. «apri» su una porta bloccata non funziona
 * (serve prima sbloccarla, scassinarla o forzarla); aprire una porta aperta o chiudere una chiusa non cambia nulla.
 */
export function apriChiudi(porta, azione) {
  if (azione === 'apri') {
    if (porta.stato === 'bloccata') return { errore: 'bloccata' };
    if (porta.stato === 'aperta') return { errore: 'già aperta' };
    return { porta: { ...porta, stato: 'aperta' } };
  }
  if (porta.stato !== 'aperta') return { errore: 'già chiusa' };
  return { porta: { ...porta, stato: 'chiusa' } };
}

/** Nuova porta sul Q q. */
export const nuovaPorta = ({ id, q, stato = 'chiusa', segreta = false }) => ({ id, q: [...q], stato, segreta });

/**
 * Azione di un token su una porta, contata come AzP del Round (A.125: 1 AzP). Senza scontro si conta per turno, come
 * il movimento (src/mappa/annulla.js → turnoDi).
 * @param a { id, token, porta, azione: 'apri' | 'chiudi', scontro, round, turno?, quando }
 */
export function conAzione(scena, a, regole) {
  const azioni = [...(scena.azioni ?? []), { ...a, tipo: 'porta', azp: regole.costo_azp }];
  return { ...scena, azioni: azioni.slice(-regole.azioni_max) };
}
/** AzP usate dal token nel Round dello scontro (o nel turno, senza scontro). */
export function azpNelRound(scena, idToken, scontro, round, turno = null) {
  return (scena.azioni ?? []).filter((x) => x.token === idToken && (scontro ? x.scontro === scontro && x.round === round : !x.scontro && x.turno === turno))
    .reduce((n, x) => n + (x.azp ?? 0), 0);
}

/**
 * Orientamento del disegno della porta: lungo i muri vicini (muro a destra o a sinistra: la porta è orizzontale).
 * @returns 'orizzontale' | 'verticale'
 */
export function orientamento(scena, q) {
  const { colonne: C, righe: R } = scena.griglia;
  const m = daBase64(scena.muri);
  const muro = (x, y) => cella(m, C, R, x, y);
  const lati = muro(q[0] - 1, q[1]) || muro(q[0] + 1, q[1]);
  const sopraSotto = muro(q[0], q[1] - 1) || muro(q[0], q[1] + 1);
  return sopraSotto && !lati ? 'verticale' : 'orizzontale';
}

/**
 * Porte per i giocatori (vista e diretta): senza le segrete non rivelate (sono muro nella maschera dei muri) e senza
 * quelle sotto la nebbia; con l'orientamento per il disegno. [{ id, q, stato, orientamento }]
 */
export function portePerGiocatori(scena) {
  const { colonne: C, righe: R } = scena.griglia;
  const nebbia = daBase64(scena.nebbia.coperti);
  return (scena.porte ?? []).filter((p) => !p.segreta && !cella(nebbia, C, R, p.q[0], p.q[1]))
    .map((p) => ({ id: p.id, q: [...p.q], stato: p.stato, orientamento: orientamento(scena, p.q) }));
}

/**
 * La maschera dei muri da mandare ai giocatori: i muri disegnati e le porte segrete come muro; le porte visibili
 * escono dalla maschera (le disegna la vista, con il loro stato). Sotto la nebbia nulla (lo toglie src/mappa/vista.js).
 */
export function muriPerGiocatori(scena) {
  const { colonne: C, righe: R } = scena.griglia;
  const m = daBase64(scena.muri);
  for (const p of scena.porte ?? []) impostaCella(m, C, R, p.q[0], p.q[1], !!p.segreta);
  return m;
}

/** Errore di forma di una porta della scena (null se va bene). */
export function errorePorta(p, colonne, righe) {
  if (!p || typeof p.id !== 'string' || !/^[a-zA-Z0-9:_-]{1,80}$/.test(p.id)) return 'id mancante';
  if (!Array.isArray(p.q) || p.q.length !== 2 || !p.q.every(Number.isInteger) || p.q[0] < 0 || p.q[1] < 0 || p.q[0] >= colonne || p.q[1] >= righe) return 'q: un Q della griglia';
  if (!STATI_PORTA.includes(p.stato)) return `stato: ${STATI_PORTA.join(', ')}`;
  if (typeof p.segreta !== 'boolean') return 'segreta: vero o falso';
  return null;
}


