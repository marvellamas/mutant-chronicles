// Identità di questo dispositivo (tablet) e il suo abbinamento al personaggio (21/10/2026, lotto «il tablet è
// una vista, non un proprietario», parte B/C). L'identificativo si genera una volta sola nel browser e resta
// nel suo localStorage: non è nel personaggio, non viaggia con un file. Un tablet nuovo (anche con la stessa
// app aperta, ma un browser diverso o svuotato) non eredita niente: sceglie di nuovo. Chiama src/dispositivi.js
// sul server (tavolo/dispositivi.json), mai il browser da solo.

const CHIAVE = 'mutant.dispositivo.id';

function nuovoId() {
  try { if (crypto?.randomUUID) return crypto.randomUUID(); } catch { /* ambienti senza crypto.randomUUID */ }
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * L'identificativo di questo dispositivo, creato la prima volta e tenuto nel suo localStorage. null se il
 * browser non lo permette (navigazione privata, permessi negati): niente identità stabile, si richiede la
 * scelta del personaggio a ogni apertura — meglio che inventarne una che sparirebbe comunque.
 */
export function idDispositivo() {
  try {
    let id = localStorage.getItem(CHIAVE);
    if (!id || !/^[A-Za-z0-9_-]{6,64}$/.test(id)) { id = nuovoId(); localStorage.setItem(CHIAVE, id); }
    return id;
  } catch {
    return null;
  }
}

const erroreDa = async (r) => Object.assign(new Error((await r.json().catch(() => ({}))).errore ?? `errore ${r.status}`), { stato: r.status });

/**
 * L'abbinamento di questo dispositivo: { pgId, pgNome, aggiornato } oppure null se non ha ancora scelto (o se
 * il server non risponde: si richiede al controllo successivo, non è un errore che blocca).
 */
export async function leggiAssociazione() {
  const id = idDispositivo();
  if (!id) return null;
  try {
    const r = await fetch('api/dispositivo', { headers: { 'X-Mutant-Dispositivo': id }, cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

/** Sceglie (o cambia) il personaggio di questo dispositivo: «da lì in avanti quel tablet può scrivere solo quel personaggio». */
export async function scegliAssociazione(pgId) {
  const id = idDispositivo();
  if (!id) throw new Error('questo browser non ricorda il dispositivo (navigazione privata o permessi negati): non è possibile scegliere il personaggio qui.');
  const r = await fetch('api/dispositivo', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mutant-Dispositivo': id }, body: JSON.stringify({ pgId }) });
  if (!r.ok) throw await erroreDa(r);
  return r.json();
}

/**
 * Le intestazioni da aggiungere a una scrittura di questo tablet (src/ui/cartella.js → scriviCartella), così il
 * server sa chi scrive e può applicare «scrive solo il proprio» (src/dispositivi.js). {} senza identità stabile:
 * il controllo del server non si applica (come un client di prima), la scrittura prosegue com'era.
 */
export function intestazioneDispositivo() {
  const id = idDispositivo();
  return id ? { 'X-Mutant-Da': 'giocatore', 'X-Mutant-Dispositivo': id } : {};
}
