// Suoni della mappa (richiesta di Marcello del 07/10/2026): effetti legati agli eventi dello scontro e musica di fondo.
// Funzioni pure: quali eventi sono successi fra due letture dello scontro, quale file suona per un evento
// (data/mappa.json → audio.effetti), impostazioni del PC (muto, volumi di Musica ed Effetti) e loro volume effettivo,
// file di musica ammessi (audio.musica.formati). Il lettore nel browser sta in src/ui/mappa/audio.js.

/** Chiave in localStorage delle impostazioni audio di questo PC (muto, volumi). */
export const CHIAVE_AUDIO = 'mutant-audio';

/**
 * Eventi audio previsti (data/mappa.json → audio.effetti), uno per evento (08/10): nuovo_round (campanella del Round,
 * sul PC del master e, con «Suoni anche nella vista giocatori», sullo schermo dei giocatori e sui tablet); tocca_a_te
 * («Tocca a te», mandato dal server al cambio di turno se il master l'ha acceso) e chiedi_di_muovere (🔔 del master),
 * sul tablet del giocatore; attacco_opportunita e template_scaduto previsti, senza file.
 */
export const EVENTI_AUDIO = ['nuovo_round', 'tocca_a_te', 'chiedi_di_muovere', 'attacco_opportunita', 'template_scaduto'];

/** L'evento audio di un avviso al tablet (server.mjs → /api/tablet/avviso, tipo turno o muovi). */
export const eventoAvviso = (tipo) => (tipo === 'turno' ? 'tocca_a_te' : 'chiedi_di_muovere');

/** File dell'effetto per un evento, o null (evento senza suono). */
export function effettoDi(evento, dati) {
  const f = dati.mappa.audio?.effetti?.[evento];
  return typeof f === 'string' && f ? f : null;
}

/**
 * Eventi audio fra due letture dello stesso scontro: nuovo_round quando il Round sale (un «Avanti» oltre l'ultimo
 * turno). Non suona alla prima lettura, con un altro scontro, con «Indietro» (il Round scende) né a scontro chiuso.
 */
export function eventiScontro(prima, dopo) {
  if (!prima || !dopo || prima.id !== dopo.id || dopo.stato !== 'aperto') return [];
  return Number.isInteger(prima.round) && Number.isInteger(dopo.round) && dopo.round > prima.round ? ['nuovo_round'] : [];
}

/**
 * La campanella del Round nella vista giocatori (08/10, domanda di Marcello: un suono «casuale» sul tablet): suona solo
 * quando, fra due letture consecutive e ravvicinate della stessa scena dello stesso scontro, il Round sale. Mai alla
 * prima lettura (apertura, ricaricamento, mappa aperta dalla scheda), mai dopo un buco nel collegamento più lungo di
 * `maxPausaMs` (riconnessione: il Round può essere salito da un pezzo), mai con «Indietro».
 * @param prima { scontro, round, quando } della lettura precedente (o null); dopo: la lettura nuova
 * @returns null oppure { evento: 'nuovo_round', round }
 */
export function campanellaVista(prima, dopo, maxPausaMs) {
  if (!prima || !dopo || !prima.scontro || prima.scontro !== dopo.scontro) return null;
  if (!Number.isInteger(prima.round) || !Number.isInteger(dopo.round) || dopo.round <= prima.round) return null;
  if (!(dopo.quando - prima.quando <= maxPausaMs)) return null;
  return { evento: 'nuovo_round', round: dopo.round };
}

const quota = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : d);

/** Impostazioni del PC normalizzate: { muto, musica, effetti } con i volumi fra 0 e 1 (predefiniti dai dati). */
export function impostazioniAudio(grezze, dati) {
  const P = dati.mappa.audio.volume_predefinito;
  const g = grezze && typeof grezze === 'object' ? grezze : {};
  return { muto: g.muto === true, musica: quota(g.musica, P.musica), effetti: quota(g.effetti, P.effetti) };
}

/** Volume effettivo di un canale ('musica' | 'effetti'): 0 con il muto generale. */
export const volumeDi = (imp, canale) => (imp.muto ? 0 : imp[canale]);

/** Il file è un formato di musica ammesso (data/mappa.json → audio.musica.formati) e un nome semplice, senza cartelle? */
export function fileMusicaValido(nome, dati) {
  const m = /^[^/\\]+\.([a-z0-9]+)$/i.exec(String(nome ?? ''));
  return !!m && !nome.startsWith('.') && dati.mappa.audio.musica.formati.includes(m[1].toLowerCase());
}

/** Indirizzo della musica di fondo sul server (server.mjs → /api/musica/<file>). */
export const urlMusica = (file) => `api/musica/${encodeURIComponent(file)}`;

/** Musica che deve suonare per lo scontro letto: il suo file se è aperto e ne ha uno, altrimenti null (si ferma). */
export const musicaDi = (scontro) => (scontro?.stato === 'aperto' && typeof scontro.musica === 'string' && scontro.musica ? scontro.musica : null);
