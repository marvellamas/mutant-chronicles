// Mappa di battaglia: porta in vista una carta della plancia (data-pezzo = chiave del rif del token) e la evidenzia.
// Difetto 2 del primo test di Marcello (06/10/2026): il clic su un token apriva la plancia con window.open, che in
// alcuni browser sostituiva la pagina della mappa. Ora il clic apre la carta in un pannello accanto alla mappa
// (src/ui/mappa/pagina.js con la plancia in modalità «carta sola»); «Apri nella plancia» va alla plancia nella
// stessa finestra, con «Torna alla mappa» (src/ui/ritorno.js), e la plancia usa questa funzione per la carta.
import { stessaChiave } from '../../veicoli-registro.js';

/** Stessa carta? Per i PG la chiave del file si confronta come fa la plancia (maiuscole, accenti). */
function stessoPezzo(a, b) {
  const pg = /^partecipante:pg:(.*)$/;
  const ma = pg.exec(a), mb = pg.exec(b);
  return ma && mb ? stessaChiave(ma[1], mb[1]) : a === b;
}

/** Cerca la carta in `radice`, la porta in vista e la evidenzia per un momento. true se c'è. */
export function mostraCarta(radice, chiave) {
  const carta = [...radice.querySelectorAll('[data-pezzo]')].find((x) => stessoPezzo(x.dataset.pezzo, chiave));
  if (!carta) return false;
  if (carta.tagName === 'DETAILS') carta.open = true;
  // 08/10: la carta può stare in un gruppo richiuso del Tavolo (mini-schede dei PG o dei nemici): si apre
  for (let p = carta.parentElement?.closest('details'); p; p = p.parentElement?.closest('details')) p.open = true;
  // scorrimento immediato: quello «smooth» non parte in una finestra o in un tab in secondo piano
  carta.scrollIntoView({ block: 'center' });
  carta.classList.remove('carta-dalla-mappa');
  void carta.offsetWidth; // l'evidenziazione riparte anche se era già in corso
  carta.classList.add('carta-dalla-mappa');
  setTimeout(() => carta.classList.remove('carta-dalla-mappa'), 2500);
  return true;
}
