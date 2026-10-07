// Suoni della mappa (richiesta di Marcello del 07/10/2026): effetti legati agli eventi dello scontro e musica di fondo.
// Funzioni pure: quali eventi sono successi fra due letture dello scontro, quale file suona per un evento
// (data/mappa.json → audio.effetti), impostazioni del PC (muto, volumi di Musica ed Effetti) e loro volume effettivo,
// file di musica ammessi (audio.musica.formati). Il lettore nel browser sta in src/ui/mappa/audio.js.

/** Chiave in localStorage delle impostazioni audio di questo PC (muto, volumi). */
export const CHIAVE_AUDIO = 'mutant-audio';

/** Eventi audio previsti (data/mappa.json → audio.effetti); per ora suona solo nuovo_round. */
export const EVENTI_AUDIO = ['nuovo_round', 'attacco_opportunita', 'template_scaduto'];

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

const quota = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : d);

/** Impostazioni del PC normalizzate: { muto, musica, effetti } con i volumi fra 0 e 1 (predefiniti dai dati). */
export function impostazioniAudio(grezze, dati) {
  const P = dati.mappa.audio.volume_predefinito;
  const g = grezze && typeof grezze === 'object' ? grezze : {};
  return { muto: g.muto === true, musica: quota(g.musica, P.musica), effetti: quota(g.effetti, P.effetti) };
}

/** Volume effettivo di un canale ('musica' | 'effetti'): 0 con il muto generale. */
export const volumeDi = (imp, canale) => (imp.muto ? 0 : imp[canale]);
