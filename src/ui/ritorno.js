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

// «Torna alla mappa» (mappa di battaglia, difetto 2 del primo test di Marcello, 06/10/2026): la scheda completa di un
// PG o la carta di un nemico nella plancia aperte dalla mappa ricordano la scena e la vista (zoom, posizione, token
// scelto, carta aperta), e il pulsante riporta lì. Anche questo in sessionStorage, per scheda del browser.
const CHIAVE_MAPPA = 'mutant.ritornoMappa';

function leggiMappa(storage) {
  try { return JSON.parse(storage?.getItem(CHIAVE_MAPPA) ?? 'null'); } catch { return null; }
}
function scriviMappa(storage, v) {
  try { if (v) storage?.setItem(CHIAVE_MAPPA, JSON.stringify(v)); else storage?.removeItem(CHIAVE_MAPPA); } catch { /* niente pulsante */ }
}

/**
 * La mappa apre la scheda del PG `id` (o, con id null, la plancia sulla carta `carta`): si ricordano la scena e la
 * vista. `vista`: { cam: { scala, ox, oy }, selezionato, carta }.
 */
export function segnaDallaMappa(storage, { scena, id = null, carta = null, vista = null }) {
  scriviMappa(storage, { scena, id, carta, vista, tornando: false });
}

/** Scena a cui tornare dalla scheda `id` (o dalla plancia, con id null), oppure null. */
export function arrivoDallaMappa(storage, id = null) {
  const r = leggiMappa(storage);
  return r && r.scena && (r.id ?? null) === (id ?? null) ? r.scena : null;
}

/** Carta da mostrare nella plancia aperta dalla mappa, una volta sola (null se non si arriva dalla mappa). */
export function cartaDallaMappa(storage) {
  const r = leggiMappa(storage);
  if (!r?.carta || r.id || r.cartaMostrata) return null;
  scriviMappa(storage, { ...r, cartaMostrata: true });
  return r.carta;
}

/** «Torna alla mappa»: la mappa, appena aperta, rimette la vista di prima. */
export function tornaAllaMappa(storage) {
  const r = leggiMappa(storage);
  if (r) scriviMappa(storage, { ...r, tornando: true });
  return r?.scena ?? null;
}

/** Vista da rimettere aprendo la scena `scena`, una volta sola (null se non si torna dalla scheda o dalla plancia). */
export function vistaDaRimettere(storage, scena) {
  const r = leggiMappa(storage);
  if (!r?.tornando || r.scena !== scena) return null;
  scriviMappa(storage, null);
  return r.vista ?? null;
}

/** La pagina iniziale e la plancia aperta da sé dimenticano la mappa: niente pulsante altrove. */
export function dimenticaMappa(storage) {
  scriviMappa(storage, null);
}
