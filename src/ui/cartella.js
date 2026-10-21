// Collegamento con il server della cartella dei personaggi (server.mjs, branch tavolo-direttore). Se il
// server non c'è (npx serve, GitHub Pages) ogni funzione risponde «niente server» e l'app resta com'era:
// localStorage più export e import.
import { intestazioneDispositivo } from './dispositivo.js';

let disponibile = null; // null: non ancora chiesto
// «Modifica master» (12/10): la pagina è aperta sul PC dove gira il server? Lo dice il server in /api/ping («master»)
let master = false;
// che cosa ha risposto /api/ping nel campo «master»: undefined = server acceso prima del 13/10, che non lo dice
let pingMaster;
/** Contesto master: questa pagina è sul PC del server (mai un tablet in rete). Vale dopo serverCartella(). */
export const contestoMasterQui = () => disponibile === true && master;
/** Che cosa ha risposto il ping sul contesto master: true, false o undefined (server vecchio). Per la riga di stato. */
export const pingMasterQui = () => pingMaster;

/**
 * C'è il server della cartella? Prima una HEAD su versione.json, che c'è con qualunque server statico: solo
 * server.mjs risponde con l'intestazione X-Mutant-Server (così senza server nessuna richiesta fallisce e la
 * console resta pulita); poi /api/ping. Un secondo di attesa al massimo per ciascuna.
 */
export async function serverCartella() {
  if (disponibile !== null) return disponibile;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1000);
    const h = await fetch('versione.json', { method: 'HEAD', signal: ctrl.signal, cache: 'no-store' });
    if (h.headers.get('X-Mutant-Server') !== '1') { clearTimeout(t); disponibile = false; return disponibile; }
    const r = await fetch('api/ping', { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    const j = r.ok ? await r.json() : null;
    disponibile = j?.ok === true && j.app === 'mutant';
    pingMaster = disponibile ? j.master : undefined;
    master = disponibile && j.master === true;
  } catch {
    disponibile = false;
  }
  return disponibile;
}

/** Elenco dei file della cartella, o null se non si legge. */
export async function elencoCartella() {
  if (!(await serverCartella())) return null;
  try {
    const r = await fetch('api/personaggi', { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

/** Testo di un file della cartella. */
export async function leggiCartella(file) {
  const r = await fetch(`api/personaggi/${encodeURIComponent(file)}`, { cache: 'no-store' });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).errore ?? `errore ${r.status}`);
  return r.text();
}

/** «Aggiungi PG al tavolo»: scrive il file solo se non c'è già. { scritto: true } oppure { esiste: true }. */
export async function creaInCartella(file, testo) {
  const r = await fetch(`api/personaggi/${encodeURIComponent(file)}`, { method: 'PUT', body: testo, headers: { 'Content-Type': 'application/json', 'X-Mutant-Nuovo': '1', ...intestazioneDispositivo() } });
  const j = await r.json().catch(() => ({}));
  if (r.status === 409 && j.esiste) return { esiste: true };
  if (!r.ok) throw new Error(j.errore ?? `errore ${r.status}`);
  return { scritto: true, ...j };
}

/** Testo di un file con la sua revisione (data di modifica sul server): { testo, mtime }. */
export async function leggiCartellaConRevisione(file) {
  const r = await fetch(`api/personaggi/${encodeURIComponent(file)}`, { cache: 'no-store' });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).errore ?? `errore ${r.status}`);
  return { testo: await r.text(), mtime: r.headers.get('X-Mutant-Mtime') };
}

/**
 * Scrive un file nella cartella: { file, mtime }. Con `mtime` (la revisione letta) il server rifiuta la
 * scrittura se il file è cambiato nel frattempo: errore con `conflitto: true`. Se il file contiene un altro
 * personaggio il server rifiuta: errore con `altroPersonaggio: true`.
 */
export async function scriviCartella(file, testo, { mtime } = {}) {
  // «il tablet è una vista» (21/10/2026): l'identificativo del dispositivo, così il server sa chi scrive e
  // può rifiutare chi prova a scrivere un personaggio che non è il proprio. Sul PC del Direttore non ha
  // effetto (server.mjs → req.mutantMaster resta sempre autorizzato, qualunque intestazione porti).
  const headers = { 'Content-Type': 'application/json', ...(mtime ? { 'X-Mutant-Mtime': String(mtime) } : {}), ...intestazioneDispositivo() };
  const r = await fetch(`api/personaggi/${encodeURIComponent(file)}`, { method: 'PUT', body: testo, headers });
  const j = await r.json().catch(() => ({}));
  // `altroPersonaggio`: il file contiene un altro PG (bug del 04/10/2026): non è un conflitto di revisione, il
  // riquadro «Il master ha aggiornato» non si apre; il messaggio del server dice che cosa fare
  // `nonAutorizzato` (21/10/2026): questo dispositivo non può scrivere questo personaggio (non l'ha scelto, o ne
  // ha scelto un altro). Nemmeno questo è un conflitto di revisione: non si ritenta da soli, il messaggio resta
  // finché il giocatore non sceglie il personaggio giusto (o il Direttore corregge l'abbinamento).
  if (!r.ok) throw Object.assign(new Error(j.errore ?? `errore ${r.status}`), { conflitto: r.status === 409 && !j.altroPersonaggio, altroPersonaggio: !!j.altroPersonaggio, nonAutorizzato: !!j.nonAutorizzato });
  return j;
}

/** «Modifica master»: salva una copia del file del PG prima di cambiarne le scelte (solo dal PC del master) → nome della copia. */
export async function salvaBackupMaster(nome, testo) {
  const r = await fetch('api/backup-master', { method: 'POST', body: JSON.stringify({ nome, testo }), headers: { 'Content-Type': 'application/json' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.errore ?? `errore ${r.status}`);
  return j.file;
}

/** «Modifica master»: il testo di una copia salvata, per «Annulla» di una modifica di scelta. */
export async function leggiBackupMaster(file) {
  const r = await fetch(`api/backup-master/${encodeURIComponent(file)}`, { cache: 'no-store' });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).errore ?? `errore ${r.status}`);
  return r.text();
}
