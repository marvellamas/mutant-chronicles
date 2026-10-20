// Un originale solo (20/10/2026, lotto «pipeline dei salvataggi», parte B): ogni file di un personaggio porta la sua
// versione, quando è stato scritto e da chi, e la copia di prima finisce in `personaggi/storico/<id>/<data-ora>.json`.
// Funzioni pure (il server le usa in server.mjs; nessun accesso al disco qui).
//
// - `versione`: un contatore che sale di 1 a ogni scrittura. Un file di prima, senza `versione`, parte da 1 e non si rompe
//   (migrazione silenziosa): la prima riscrittura gli dà `versione: 2`.
// - `aggiornato_il`: quando è stato scritto (ISO). `aggiornato_da`: chi l'ha scritto — «giocatore» (un tablet),
//   «master» (il PC del Direttore) o «px» (il pannello dei PX della partita).
// - `id`: l'identificativo stabile del personaggio, che non cambia mai, nemmeno se il personaggio cambia nome. È il `pg`
//   che ogni file porta dalla nascita (src/character.js → nuovoPg); per i file di prima, senza `pg`, si usa il «Nome»
//   del file, che per loro è l'unica identità che c'è.
// - Lo storico non è un elenco da cui scegliere: serve a salvare la pelle. Nessuna parte dell'app lo mostra, e la
//   cartella `storico/` non passa mai il filtro dei nomi dei file dei personaggi (src/cartella.js → NOME_FILE).
// - Con il salvataggio a ogni modifica (parte D) una copia per tocco sarebbe insostenibile: si tiene una copia ogni
//   `MINUTI_FRA_COPIE` al massimo per personaggio, e si conservano le ultime `COPIE_PER_PG`.

/** Chi ha scritto il file. */
export const AUTORI = ['giocatore', 'master', 'px'];
/** Una copia storica al massimo ogni dieci minuti per personaggio (il resto sarebbe rumore). */
export const MINUTI_FRA_COPIE = 10;
/** Copie conservate per personaggio: le più vecchie si tolgono (come backup-master). */
export const COPIE_PER_PG = 40;
/** Cartella delle versioni vecchie, dentro `personaggi/`. Nessun elenco dell'app la mostra. */
export const CARTELLA_STORICO = 'storico';

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * L'identificativo stabile di un personaggio, dal contenuto del suo file: il `pg` della nascita; per i file di prima
 * che non ce l'hanno, il «Nome» del file (`ripiego`), che è l'unica identità che hanno. null se non si ricava nulla.
 */
export function idPersonaggio(o, ripiego = null) {
  if (typeof o?.pg === 'string' && /^[A-Za-z0-9._-]{3,80}$/.test(o.pg)) return o.pg;
  const r = String(ripiego ?? '').trim();
  return r ? `nome-${r.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 60)}` : null;
}

/** Nome della cartella dello storico di un id, al sicuro da percorsi strani. */
export const cartellaStorico = (id) => String(id ?? '').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 80) || 'senza-id';

/** Nome del file di una copia storica: «AAAA-MM-GGTHH-MM-SS.json» (ordinabile, leggibile). */
export const nomeCopiaStorica = (quando = new Date()) => `${new Date(quando).toISOString().slice(0, 19).replace(/:/g, '-')}.json`;

/** La versione di un file letto: il contatore se c'è e vale, altrimenti 1 (file di prima: migrazione silenziosa). */
export function versioneDi(o) {
  const v = o?.versione_salvataggio;
  return Number.isInteger(v) && v >= 1 ? v : 1;
}

/**
 * Il personaggio da scrivere, con i suoi metadati: versione del file di prima + 1 (il primo è 1), quando e da chi.
 * Non tocca nient'altro: le scelte, i livelli, la sessione e i blocchi del master restano com'erano.
 * @param nuovo l'oggetto del personaggio in arrivo (già controllato: formato «mutant-personaggio»)
 * @param esistente l'oggetto del file che si sta per sovrascrivere, o null se il file non c'è
 * @param chi 'giocatore' | 'master' | 'px'
 */
export function conMetadati(nuovo, esistente, { chi = 'giocatore', quando = new Date() } = {}) {
  const autore = AUTORI.includes(chi) ? chi : 'giocatore';
  return {
    ...nuovo,
    versione_salvataggio: esistente ? versioneDi(esistente) + 1 : versioneDi(nuovo),
    aggiornato_il: new Date(quando).toISOString(),
    aggiornato_da: autore,
  };
}

/**
 * Serve una copia storica del file che si sta per sovrascrivere? No se non c'è niente da conservare, se il contenuto
 * non cambia, o se l'ultima copia è più recente di `MINUTI_FRA_COPIE` (con il salvataggio a ogni tocco le copie
 * sarebbero migliaia). `ultime`: i nomi delle copie già presenti, in ordine qualunque.
 */
export function serveCopia(esistente, { ultime = [], quando = new Date(), minuti = MINUTI_FRA_COPIE } = {}) {
  if (!isOggetto(esistente)) return false;
  const piuRecente = [...ultime].sort().at(-1);
  if (!piuRecente) return true;
  const t = Date.parse(String(piuRecente).replace(/\.json$/, '').replace(/T(\d{2})-(\d{2})-(\d{2})$/, 'T$1:$2:$3Z'));
  if (!Number.isFinite(t)) return true;
  return new Date(quando).getTime() - t >= minuti * 60000;
}

/** Le copie da togliere perché oltre `COPIE_PER_PG`: le più vecchie (i nomi sono ordinabili). */
export function copieDaTogliere(nomi, massimo = COPIE_PER_PG) {
  const ordinate = [...(nomi ?? [])].filter((n) => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/.test(n)).sort();
  return ordinate.length <= massimo ? [] : ordinate.slice(0, ordinate.length - massimo);
}
