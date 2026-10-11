// Porte della mappa di battaglia (fase 2, lotto 2; §6 della specifica; A.125, decisione 130 di docs/risposte-master.md).
// Regola di Davide: aprire o chiudere una normale porta accessibile e non bloccata costa 1 AzP, senza Prova, essendo
// adiacenti e con una mano libera; attraversarla consuma il normale movimento, separato dall'apertura; una porta
// bloccata richiede prima la procedura per sbloccarla, scassinarla o forzarla; «chiusa» e «bloccata» sono distinte.
//
// Una porta sta su un Q (di solito un Q di muro): { id, q: [x, y], stato: aperta | chiusa | bloccata, segreta,
// orientamento? }. L'orientamento (ritocchi del 07/10) è solo il disegno lungo il muro: si sceglie da solo dai muri vicini
// quando la porta si mette, si gira con ← → durante il piazzamento o con «Ruota»; le scene di prima senza il campo lo
// ricavano dai muri. Movimento e linea di visuale guardano il Q intero, quindi non cambiano.
// Per il movimento la porta aperta è un passaggio, chiusa o bloccata è muro (stesso trattamento dei muri anche per le
// diagonali, A.124 e A.134). Una porta segreta, per i giocatori, è muro finché il master non la rivela (segreta: false):
// nei dati che il server manda ai giocatori resta un Q di muro, senza la porta. Per la linea di visuale (prossimo lotto)
// una porta che non è aperta blocca la vista (data/mappa.json → porte.bloccano_vista).
// M3 (11/10): una porta si disegna sul muro su cui si mette, non più al centro del Q (segnalazione di Davide dopo la
// prova con la mappa della chiesa). Il campo «aggancio» dice dove:
//   { lato: 'n' | 'e' | 's' | 'o', spessore }               sulla linea della griglia di quel lato del Q;
//   { muro, punto, da, a, spessore, larghezza? }            sul tratto di un muro disegnato (src/mappa/muri-linee.js),
//                                                           con lo stesso spessore di quel muro.
// Per le regole non cambia nulla: la porta resta sul suo Q (apertura, chiusura, movimento, vista: A.139). Le porte
// salvate prima non hanno l'aggancio e si convertono alla lettura (agganciaDiPorta), sulla linea della griglia più
// vicina, tenendo l'orientamento che avevano.
// Le azioni dei token (aprire, chiudere) si contano come AzP del Round in scena.azioni; il registro dello scontro ha
// la sua riga (src/scontro.js → rigaPorta). Funzioni pure.
import { daBase64, cella, impostaCella } from './celle.js';
import { celleToken } from './token.js';
import { lineeDi, bucaConPorte, aggancioSuLinea } from './muri-linee.js';

export const STATI_PORTA = ['aperta', 'chiusa', 'bloccata'];
export const ORIENTAMENTI = ['orizzontale', 'verticale'];
/** M3: i lati del Q a cui una porta si può agganciare (nord, est, sud, ovest), nell'ordine di «Ruota». */
export const LATI = ['n', 'e', 's', 'o'];
const ASSE = { n: 'orizzontale', s: 'orizzontale', e: 'verticale', o: 'verticale' };
export const opposto = (o) => (o === 'verticale' ? 'orizzontale' : 'verticale');

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

/**
 * I muri disegnati (M2) per il movimento: tutti, meno il vano delle porte aperte agganciate a un tratto (M3).
 * Per il movimento conta lo stato: solo la porta aperta è un passaggio, chiusa e bloccata restano muro.
 * `perGiocatori`: una porta segreta resta muro anche se aperta (nessuna fuga di informazioni).
 */
export function lineeEffettive(scena, { perGiocatori = false, larghezza = 1 } = {}) {
  const linee = lineeDi(scena);
  if (!linee.length) return linee;
  const aperte = (scena.porte ?? []).filter((p) => p.aggancio?.muro && p.stato === 'aperta' && !(perGiocatori && p.segreta));
  return aperte.length ? bucaConPorte(linee, aperte, larghezza) : linee;
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

/** Nuova porta sul Q q (con l'orientamento e, da M3, l'aggancio al muro, se dati). */
export const nuovaPorta = ({ id, q, stato = 'chiusa', segreta = false, orientamento = null, aggancio = null }) => ({
  id, q: [...q], stato, segreta,
  ...(ORIENTAMENTI.includes(orientamento) ? { orientamento } : {}),
  ...(aggancio ? { aggancio } : {}),
});

/**
 * M3: dove si aggancia una porta che si mette sul Q q, dal punto scelto (Q frazionari, il centro del Q se non c'è).
 * Prima si cerca un muro disegnato entro `aggancio_raggio_q`: la porta va sul tratto, con il suo spessore. Senza
 * muri disegnati vicini si prende la linea della griglia più vicina al punto, lungo l'asse del muro (o quello
 * chiesto con ← →).
 * @param dati data/mappa.json (o { mappa })
 */
export function agganciaPorta(scena, q, punto, dati, { verso = null } = {}) {
  const R = dati?.mappa?.porte ?? {};
  const p = punto ?? [q[0] + 0.5, q[1] + 0.5];
  const linee = lineeDi(scena);
  const su = linee.length ? aggancioSuLinea(linee, p, R.aggancio_raggio_q ?? 0.7) : null;
  if (su) return { muro: su.muro, punto: arrotonda2(su.punto), da: arrotonda2(su.da), a: arrotonda2(su.a), spessore: su.spessore };
  return { lato: latoVicino(scena, q, p, verso), spessore: R.spessore_q ?? 0.25 };
}
const arrotonda2 = (pt) => [Math.round(pt[0] * 100) / 100, Math.round(pt[1] * 100) / 100];

/**
 * M3: la linea della griglia più vicina al punto, fra i due lati del Q lungo l'asse del muro: per un muro che corre
 * in orizzontale il lato nord o quello sud, per un muro verticale ovest o est. L'asse viene dai muri vicini, o da
 * `verso` se il master l'ha scelto con ← →.
 */
export function latoVicino(scena, q, punto, verso = null) {
  const asse = ORIENTAMENTI.includes(verso) ? verso : orientamento(scena, q);
  const p = punto ?? [q[0] + 0.5, q[1] + 0.5];
  if (asse === 'orizzontale') return p[1] - q[1] <= 0.5 ? 'n' : 's';
  return p[0] - q[0] <= 0.5 ? 'o' : 'e';
}

/**
 * M3: l'aggancio di una porta, quello salvato o, per le porte salvate prima, quello convertito: la linea della
 * griglia più vicina, tenendo l'orientamento che la porta aveva (nord per le orizzontali, ovest per le verticali).
 * La porta resta utilizzabile in ogni caso: l'aggancio serve solo a disegnarla.
 */
export function agganciaDiPorta(scena, p, dati) {
  if (p.aggancio) return p.aggancio;
  const o = orientamentoPorta(scena, p);
  return { lato: o === 'verticale' ? 'o' : 'n', spessore: dati?.mappa?.porte?.spessore_q ?? 0.25 };
}

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
 * Orientamento automatico della porta sul Q q, lungo i muri vicini (ritocchi del 07/10): muri (o altre porte) sopra e
 * sotto → verticale, a destra e a sinistra → orizzontale; si contano i Q accanto e, a parità, quelli a due Q; a parità
 * piena orizzontale. Prima bastava un muro a lato per farla orizzontale.
 * @returns 'orizzontale' | 'verticale'
 */
export function orientamento(scena, q) {
  const { colonne: C, righe: R } = scena.griglia;
  const m = daBase64(scena.muri);
  const porte = new Set((scena.porte ?? []).map((p) => p.q.join()));
  const muro = (x, y) => (cella(m, C, R, x, y) || porte.has(`${x},${y}`) ? 1 : 0);
  const [x, y] = q;
  for (const d of [1, 2]) {
    const v = muro(x, y - d) + muro(x, y + d);
    const o = muro(x - d, y) + muro(x + d, y);
    if (v !== o) return v > o ? 'verticale' : 'orizzontale';
  }
  return 'orizzontale';
}

/**
 * Orientamento della porta: dall'aggancio se c'è (M3), altrimenti quello salvato o quello automatico dai muri
 * (scene di prima del 07/10). Per una porta agganciata a un muro disegnato conta la direzione del tratto.
 */
export function orientamentoPorta(scena, p) {
  const a = p.aggancio;
  if (a?.lato && LATI.includes(a.lato)) return ASSE[a.lato];
  if (a?.da && a?.a) return Math.abs(a.a[0] - a.da[0]) >= Math.abs(a.a[1] - a.da[1]) ? 'orizzontale' : 'verticale';
  return ORIENTAMENTI.includes(p.orientamento) ? p.orientamento : orientamento(scena, p.q);
}

/**
 * «Ruota» (07/10): la porta girata di 90°. M3: una porta agganciata alla griglia passa al lato dopo (n → e → s → o),
 * così si gira e si sposta sulla linea giusta con lo stesso comando; una agganciata a un muro disegnato non si gira
 * (segue il tratto).
 */
export function ruotaPorta(scena, p) {
  if (p.aggancio?.muro) return p;
  if (p.aggancio?.lato && LATI.includes(p.aggancio.lato)) {
    const lato = LATI[(LATI.indexOf(p.aggancio.lato) + 1) % LATI.length];
    return { ...p, aggancio: { ...p.aggancio, lato }, orientamento: ASSE[lato] };
  }
  return { ...p, orientamento: opposto(orientamentoPorta(scena, p)) };
}

/**
 * Porte per i giocatori (vista e diretta): senza le segrete non rivelate (sono muro nella maschera dei muri) e senza
 * quelle sotto la nebbia; con l'orientamento per il disegno. [{ id, q, stato, orientamento }]
 */
export function portePerGiocatori(scena, dati = null) {
  const { colonne: C, righe: R } = scena.griglia;
  const nebbia = daBase64(scena.nebbia.coperti);
  return (scena.porte ?? []).filter((p) => !p.segreta && !cella(nebbia, C, R, p.q[0], p.q[1]))
    // M3 (11/10): anche l'aggancio al muro, così i giocatori la vedono dove la vede il master
    .map((p) => ({ id: p.id, q: [...p.q], stato: p.stato, orientamento: orientamentoPorta(scena, p), ...(dati ? { aggancio: agganciaDiPorta(scena, p, dati) } : p.aggancio ? { aggancio: p.aggancio } : {}) }));
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
  if (p.orientamento !== undefined && !ORIENTAMENTI.includes(p.orientamento)) return `orientamento: ${ORIENTAMENTI.join(' o ')}`;
  // M3 (11/10): aggancio al muro, facoltativo (le porte salvate prima non l'hanno)
  if (p.aggancio !== undefined) {
    const a = p.aggancio;
    const coppia = (v) => Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === 'number' && Number.isFinite(x));
    const spessore = (v) => v === undefined || (typeof v === 'number' && v > 0 && v <= 2);
    if (!a || typeof a !== 'object' || Array.isArray(a)) return 'aggancio: lato della griglia o muro disegnato';
    if (a.muro !== undefined) {
      if (typeof a.muro !== 'string' || !a.muro) return 'aggancio.muro: id del muro disegnato';
      if (!coppia(a.punto)) return 'aggancio.punto: coppia di numeri in Q';
      for (const k of ['da', 'a']) if (a[k] !== undefined && !coppia(a[k])) return `aggancio.${k}: coppia di numeri in Q`;
      if (a.larghezza !== undefined && !(typeof a.larghezza === 'number' && a.larghezza > 0 && a.larghezza <= 4)) return 'aggancio.larghezza: vano in Q (al massimo 4)';
    } else if (!LATI.includes(a.lato)) return `aggancio.lato: ${LATI.join(', ')}`;
    if (!spessore(a.spessore)) return 'aggancio.spessore: spessore in Q (al massimo 2)';
  }
  return null;
}


