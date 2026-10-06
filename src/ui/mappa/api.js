// Mappa di battaglia, lotto 2 (docs/battlemap/piano.md): richieste del browser del master alle API del lotto 1
// (/api/scene, /api/mappe) e copia ridotta dell'immagine preparata qui, con un canvas (nessuna libreria sul server).
import { dimensioniImmagine } from '../../mappa/immagine.js';

const errore = async (r) => new Error((await r.json().catch(() => ({}))).errore ?? `errore ${r.status}`);

/** Scene in scene/ (non archiviate), dalla più recente. */
export async function elencoScene() {
  const r = await fetch('api/scene', { cache: 'no-store' });
  if (!r.ok) throw await errore(r);
  return r.json();
}

/** La scena completa (vista master). */
export async function leggiScena(id) {
  const r = await fetch(`api/scene/${encodeURIComponent(id)}`, { cache: 'no-store' });
  if (!r.ok) throw await errore(r);
  return r.json();
}

/**
 * Salva la scena con la sua revisione. Restituisce { scena } (con la revisione nuova) oppure, se è stata cambiata
 * altrove, { conflitto: true, attuale } con la scena del server; gli altri errori sono eccezioni.
 */
export async function salvaScena(s) {
  const r = await fetch(`api/scene/${encodeURIComponent(s.id)}`, { method: 'PUT', body: JSON.stringify(s), headers: { 'Content-Type': 'application/json' } });
  if (r.status === 409) return { conflitto: true, attuale: (await r.json()).attuale };
  if (!r.ok) throw await errore(r);
  return { scena: await r.json() };
}

/** Carica un'immagine (Blob) in mappe/: { file, tipo, larghezza, altezza, dimensione }. */
export async function caricaImmagine(blob, nome, { ridotta = false } = {}) {
  const r = await fetch(`api/mappe?nome=${encodeURIComponent(nome)}${ridotta ? '&ridotta=1' : ''}`, { method: 'POST', body: blob, headers: { 'Content-Type': blob.type || 'application/octet-stream' } });
  if (!r.ok) throw await errore(r);
  return r.json();
}

/**
 * Controlla il file scelto prima di caricarlo (§4): peso entro immagini.massimo_mb, tipo JPG, PNG o WEBP vero.
 * Restituisce { tipo, larghezza, altezza } oppure { errore } con un testo per il master.
 */
export async function controllaFile(file, dati) {
  const I = dati.mappa.immagini;
  const mb = file.size / (1024 * 1024);
  if (mb > I.massimo_mb) {
    return { errore: `«${file.name}» pesa ${mb.toFixed(1).replace('.', ',')} MB: il limite è ${I.massimo_mb} MB (data/mappa.json). Salvala in JPG o WEBP, o riducila, e riprova.` };
  }
  const d = dimensioniImmagine(new Uint8Array(await file.arrayBuffer()));
  if (!d || !I.tipi[d.tipo]) return { errore: `«${file.name}» non è un’immagine JPG, PNG o WEBP.` };
  return d;
}

/**
 * Copia ridotta per la vista giocatori e i tablet (§4): lato massimo da immagini.ridotta, nel tipo dei dati (WEBP;
 * se il browser non sa scriverlo, quello che produce). null se l'immagine è già entro il lato massimo.
 */
export async function preparaRidotta(file, dati) {
  const R = dati.mappa.immagini.ridotta;
  const bitmap = await createImageBitmap(file);
  try {
    const lato = Math.max(bitmap.width, bitmap.height);
    if (lato <= R.lato_massimo_px) return null;
    const f = R.lato_massimo_px / lato;
    const tela = document.createElement('canvas');
    tela.width = Math.max(1, Math.round(bitmap.width * f));
    tela.height = Math.max(1, Math.round(bitmap.height * f));
    const c = tela.getContext('2d');
    c.imageSmoothingQuality = 'high';
    c.drawImage(bitmap, 0, 0, tela.width, tela.height);
    const mime = dati.mappa.immagini.tipi[R.tipo].mime;
    return await new Promise((ok, no) => tela.toBlob((b) => (b ? ok(b) : no(new Error('copia ridotta non riuscita'))), mime, R.qualita));
  } finally {
    bitmap.close?.();
  }
}
