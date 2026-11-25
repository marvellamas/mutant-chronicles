// lotto 248: una riga che manca nei dati delle regole non ferma il gioco (gruppo D del registro dei blocchi,
// docs/registro-blocchi.md). Chi legge una tabella e non trova la riga dichiara il ripiego e va avanti; l'avviso
// arriva a chi guarda con il nome del dato, la chiave del file e il numero che non c'è.
//
// Perché sta in un posto solo: lunedì 22/11 il gioco si è fermato per un dato che non tornava, e un blocco che
// scatta per un valore mancante può essere un nostro difetto. Con un posto solo il ripiego è sempre dichiarato e
// mai silenzioso (principio 3: nessun numero cambia in silenzio).
//
// NON vale per i dati che rendono leggibile quello che si scrive (la nota di prima dell'adeguamento, la
// Specializzazione su cui registrare un'eccezione): quelli sono nel gruppo B del registro, e restano «no».

let aperte = 0;
let raccolte = [];

/** Apre una raccolta (un calcolo di scheda). Le chiamate si annidano: conta solo la più esterna. */
export function apriRaccolta() {
  if (aperte === 0) raccolte = [];
  aperte += 1;
}

/** Chiude la raccolta e torna le righe raccolte. */
export function chiudiRaccolta() {
  const righe = raccolte.slice();
  aperte = Math.max(0, aperte - 1);
  return righe;
}

/** Le righe raccolte finora (sola lettura). */
export function datiMancanti() {
  return raccolte.slice();
}

/**
 * Registra un dato che manca e torna il valore di ripiego, dichiarato.
 * @param dato che cosa manca, in parole da tavolo («la fascia dei livelli»)
 * @param chiave il file e la chiave, come vuole il principio 2 («regole.json → avanzamento.pv»)
 * @param valore il valore per cui non c'è la riga (un livello, una Caratteristica)
 * @param ripiego il valore che si usa al suo posto
 * @param come come si legge il ripiego, se non è il valore stesso («la fascia del 20° livello»)
 */
export function conRipiego({ dato, chiave, valore, ripiego, come = null }) {
  const testo = `Manca ${dato} per ${valore} (${chiave}): uso ${come ?? ripiego}. Controllalo tu.`;
  // fuori da una raccolta (un conto isolato, uno strumento) il ripiego vale lo stesso e non si accumula niente
  if (aperte > 0 && !raccolte.some((r) => r.testo === testo)) raccolte.push({ dato, chiave, valore, ripiego, come: come ?? String(ripiego), testo });
  return ripiego;
}

/** Attacca a un risultato (una scheda) le righe raccolte durante il calcolo, se ce ne sono. */
export function conDatiMancanti(scheda) {
  const righe = datiMancanti();
  return righe.length && scheda && typeof scheda === 'object' ? { ...scheda, datiMancanti: righe } : scheda;
}

/** La chiave numerica più vicina a `valore` in una tabella { "1": …, "2": … }, o null se la tabella è vuota. */
export function chiavePiuVicina(tabella, valore) {
  const n = Number(valore);
  const chiavi = Object.keys(tabella ?? {}).map(Number).filter((k) => Number.isFinite(k));
  if (!chiavi.length) return null;
  if (!Number.isFinite(n)) return String(Math.min(...chiavi));
  return String(chiavi.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a)));
}

/** La fascia più vicina a `livello` in un elenco di { da, a }, o null se l'elenco è vuoto. */
export function fasciaPiuVicina(elenco, livello) {
  const n = Number(livello);
  const righe = (Array.isArray(elenco) ? elenco : []).filter((x) => Number.isFinite(Number(x?.da)));
  if (!righe.length) return null;
  const distanza = (x) => (Number.isFinite(n) ? Math.min(Math.abs(Number(x.da) - n), Math.abs(Number(x.a ?? x.da) - n)) : Number(x.da));
  return righe.reduce((a, b) => (distanza(b) < distanza(a) ? b : a));
}
