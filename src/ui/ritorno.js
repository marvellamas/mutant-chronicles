// «← Torna al tavolo» (Tavolo del Master): la scheda di un PG aperta dalla plancia ricorda da dove arriva.
// Il segno sta in sessionStorage (per scheda del browser): resiste al ricaricamento (F5) e lascia libero
// l'indirizzo, così il tasto indietro funziona come sempre. Aprendo la scheda dalla pagina iniziale il
// segno non c'è (la pagina iniziale lo cancella): per il giocatore non cambia nulla.
// Le funzioni ricevono lo storage, per i test (tests/ritorno.test.js).

const CHIAVE = 'mutant.ritornoTavolo';

function leggi(storage) {
  try { return JSON.parse(storage?.getItem(CHIAVE) ?? 'null'); } catch { return null; }
}
function scrivi(storage, v) {
  try { if (v) storage?.setItem(CHIAVE, JSON.stringify(v)); else storage?.removeItem(CHIAVE); } catch { /* storage non disponibile: niente pulsante */ }
}

/** La plancia apre la scheda del personaggio `id`: si ricorda lo scorrimento della plancia. */
export function segnaDalTavolo(storage, id, scroll = 0) {
  scrivi(storage, { id, scroll: Math.max(0, Math.round(scroll || 0)), tornando: false });
}

/** La scheda `id` è stata aperta dalla plancia? (anche dopo un ricaricamento) */
export function arrivoDalTavolo(storage, id) {
  const r = leggi(storage);
  return !!r && !!id && r.id === id;
}

/** «Torna al tavolo»: la plancia, appena disegnata, rimette lo scorrimento di prima. */
export function tornaAlTavolo(storage) {
  const r = leggi(storage);
  if (r) scrivi(storage, { ...r, tornando: true });
}

/** Scorrimento da rimettere aprendo la plancia, una volta sola (null se non si torna da una scheda). */
export function scorrimentoDaRimettere(storage) {
  const r = leggi(storage);
  if (!r?.tornando) return null;
  scrivi(storage, { ...r, tornando: false });
  return r.scroll;
}

/** La pagina iniziale dimentica la provenienza: le schede aperte da lì non hanno il pulsante. */
export function dimenticaTavolo(storage) {
  scrivi(storage, null);
}
