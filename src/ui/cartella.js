// Collegamento con il server della cartella dei personaggi (server.mjs, branch tavolo-direttore). Se il
// server non c'è (npx serve, GitHub Pages) ogni funzione risponde «niente server» e l'app resta com'era:
// localStorage più export e import.

let disponibile = null; // null: non ancora chiesto

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
  const r = await fetch(`api/personaggi/${encodeURIComponent(file)}`, { method: 'PUT', body: testo, headers: { 'Content-Type': 'application/json', 'X-Mutant-Nuovo': '1' } });
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
 * scrittura se il file è cambiato nel frattempo: errore con `conflitto: true`.
 */
export async function scriviCartella(file, testo, { mtime } = {}) {
  const headers = { 'Content-Type': 'application/json', ...(mtime ? { 'X-Mutant-Mtime': String(mtime) } : {}) };
  const r = await fetch(`api/personaggi/${encodeURIComponent(file)}`, { method: 'PUT', body: testo, headers });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.errore ?? `errore ${r.status}`), { conflitto: r.status === 409 });
  return j;
}
