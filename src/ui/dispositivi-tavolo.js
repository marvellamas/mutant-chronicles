// Il Tavolo del Master vede chi è collegato (21/10/2026, «le code dell'originale», parte B): oggi
// GET/PUT /api/dispositivi si usava solo con curl. Qui le chiamate per il Direttore (src/ui/collega.js le
// mostra dentro «Collega i giocatori», non in una tab nuova); il dispositivo stesso usa src/ui/dispositivo.js.
const errore = async (r) => Object.assign(new Error((await r.json().catch(() => ({}))).errore ?? `errore ${r.status}`), { stato: r.status });

/** L'elenco dei dispositivi collegati: [{ id, pgId, pgNome, aggiornato }], o null se il server non risponde. */
export async function leggiDispositivi() {
  try {
    const r = await fetch('api/dispositivi', { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

/** Corregge (o toglie, con pgId: null) l'abbinamento di un dispositivo. */
export async function correggiDispositivo(id, pgId) {
  const r = await fetch(`api/dispositivi/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pgId }) });
  if (!r.ok) throw await errore(r);
  return r.json();
}
