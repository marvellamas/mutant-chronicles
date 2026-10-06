// Mappa di battaglia, lotto 3 (docs/battlemap/piano.md): «il clic su un token apre la sua carta nella plancia».
// La mappa e la plancia sono due pagine (spesso su due schermi): si parlano con un BroadcastChannel dello stesso
// browser. Se nessuna plancia risponde, la mappa la apre in un'altra finestra e la carta si mostra appena è pronta
// (richiesta lasciata in localStorage per pochi secondi). Si cerca la carta con data-pezzo (chiave del rif del token).
import { stessaChiave } from '../../veicoli-registro.js';

const NOME = 'mutant-mappa';
const CHIAVE_ATTESA = 'mutant.mappa.cartaDaAprire';
const ATTESA_RISPOSTA_MS = 350;
const VALIDITA_MS = 15000;

const canale = () => (typeof BroadcastChannel === 'function' ? new BroadcastChannel(NOME) : null);

/**
 * Lato mappa: chiede alla plancia la carta del pezzo. Risolve con 'mostrata', 'assente', 'aperta' (nuova finestra)
 * o 'bloccata' (il browser non ha aperto la finestra).
 */
export function apriCartaInPlancia(chiave) {
  const c = canale();
  return new Promise((risolvi) => {
    let fatto = false;
    const fine = (esito) => { if (fatto) return; fatto = true; c?.close(); risolvi(esito); };
    if (c) {
      c.onmessage = (e) => { if (e.data?.tipo === 'carta' && e.data.chiave === chiave) fine(e.data.trovata ? 'mostrata' : 'assente'); };
      c.postMessage({ tipo: 'apri-carta', chiave });
    }
    setTimeout(() => {
      if (fatto) return;
      try { localStorage.setItem(CHIAVE_ATTESA, JSON.stringify({ chiave, quando: Date.now() })); } catch { /* senza memoria locale: si apre solo la plancia */ }
      const finestra = window.open(`${location.pathname}#/tavolo`, 'mutant-plancia');
      fine(finestra ? 'aperta' : 'bloccata');
    }, ATTESA_RISPOSTA_MS);
  });
}

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
  // scorrimento immediato: quello «smooth» non parte in una finestra o in un tab in secondo piano
  carta.scrollIntoView({ block: 'center' });
  carta.classList.remove('carta-dalla-mappa');
  void carta.offsetWidth; // l'evidenziazione riparte anche se era già in corso
  carta.classList.add('carta-dalla-mappa');
  setTimeout(() => carta.classList.remove('carta-dalla-mappa'), 2500);
  return true;
}

/**
 * Lato plancia: risponde alle richieste della mappa. `pronta()` dice se la plancia ha già disegnato le carte.
 * Restituisce { controllaAttesa(), chiudi() }: controllaAttesa() dopo ogni disegno mostra la carta chiesta da una
 * mappa che ha appena aperto questa finestra.
 */
export function ascoltaMappa(radice) {
  const c = canale();
  if (c) {
    c.onmessage = (e) => {
      if (e.data?.tipo !== 'apri-carta') return;
      const trovata = mostraCarta(radice, e.data.chiave);
      c.postMessage({ tipo: 'carta', chiave: e.data.chiave, trovata });
    };
  }
  return {
    controllaAttesa() {
      let attesa = null;
      try { attesa = JSON.parse(localStorage.getItem(CHIAVE_ATTESA) ?? 'null'); } catch { /* niente */ }
      if (!attesa) return;
      if (Date.now() - attesa.quando > VALIDITA_MS) { try { localStorage.removeItem(CHIAVE_ATTESA); } catch { /* niente */ } return; }
      if (mostraCarta(radice, attesa.chiave)) { try { localStorage.removeItem(CHIAVE_ATTESA); } catch { /* niente */ } }
    },
    chiudi() { c?.close(); },
  };
}
