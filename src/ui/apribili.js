// Lotto 186, parte A (10/11/2026, dal tavolo del 9/11): quello che il giocatore apre per leggere non si deve
// richiudere da solo.
//
// Il difetto. Sul tablet di un giocatore, aprire un potere per leggerlo e vederlo richiudersi subito. La causa non è
// il tocco che arriva due volte: è che lo stato «questo è aperto» stava **nel disegno**. `nomeCheSiApre` teneva
// l'apertura in `corpo.hidden` dell'elemento, e i <details> della scheda nascevano chiusi a ogni disegno: al primo
// ridisegno quegli elementi venivano sostituiti da elementi nuovi, chiusi. Durante uno scontro la scheda si ridisegna
// a ogni cambio di Round, di turno, di durata o di Stato (src/ui/app.js → aggiornaRoundScontro →
// ridisegnaSchedaQuandoLibera) e quando il Direttore avanza scena o capitolo (lotto 175): mentre il Direttore gioca,
// sul tablet è «subito».
//
// La regola, da qui in avanti: **ciò che si apre per leggere porta una chiave**, e l'apertura vive qui, fuori dal
// disegno. Così sopravvive a un ridisegno, come già facevano il wizard (ctx.ui.aperti) e i pochi <details> che si
// ricordavano da soli. Le chiavi si dimenticano quando si apre un altro personaggio (`dimenticaApribili`).
//
// Non è lo stesso difetto del lotto 177 (una riga che nasceva vuota e spostava quelle sotto) né del 183 (una
// finestrella che leggeva l'inventario del disegno precedente), ma è la stessa famiglia: uno stato che vive nel
// disegno non sopravvive al disegno.
import { h } from './dom.js';

const aperti = new Set(); // chiavi aperte adesso
const visti = new Set(); // chiavi già disegnate almeno una volta (per distinguere «nasce aperto» da «chiuso dal lettore»)

/** Era aperto al disegno precedente? */
export const eAperto = (chiave) => !!chiave && aperti.has(chiave);

/** Segna aperto o chiuso. Senza chiave non si ricorda niente: è legittimo, non tutto va ricordato. */
export function segnaApribile(chiave, aperto) {
  if (!chiave) return;
  visti.add(chiave);
  if (aperto) aperti.add(chiave);
  else aperti.delete(chiave);
}

/** Si dimentica tutto: si apre un altro personaggio e le chiavi del precedente non valgono più. */
export function dimenticaApribili() {
  aperti.clear();
  visti.clear();
}

/** Quante cose sono aperte adesso (diagnosi e test). */
export const quantiApribiliAperti = () => aperti.size;

/**
 * Un <details> che si ricorda se era aperto: uguale a `h('details', …)`, con in più la chiave.
 * Un `open: true` nelle proprietà vale solo la prima volta che quella chiave si disegna (un riquadro che nasce
 * aperto); da lì in poi comanda quello che ha scelto il lettore, anche se ha chiuso.
 * @param chiave stringa stabile fra un disegno e il successivo (mai un indice che cambia con l'ordine)
 */
export function dettagliRicordati(chiave, props = {}, ...figli) {
  const { open: iniziale, ...resto } = props;
  let aperto;
  if (!chiave) aperto = !!iniziale;
  else if (visti.has(chiave)) aperto = aperti.has(chiave);
  else { aperto = !!iniziale; segnaApribile(chiave, aperto); }
  const el = h('details', { ...resto, open: aperto }, ...figli);
  el.open = aperto; // `h` salta le proprietà false: qui `open` deve essere sempre un sì o un no esplicito
  if (chiave) el.addEventListener('toggle', () => segnaApribile(chiave, el.open));
  return el;
}
