// Il giornale delle operazioni (21/10/2026, quarto e ultimo lotto della pipeline dei salvataggi, «si può
// modificare offline, e al rientro Davide approva»). È il punto su cui si regge tutto: un tablet offline non
// registra lo stato finale del personaggio, registra OGNI operazione fatta, in ordine, con un identificativo
// proprio — «−5 PV (21:40)», «+1 Pergamena di Cura Ferite (21:52)», «Stato Sanguinamento acceso (21:53)» — così
// riapplicarla due volte non la conta due volte, e il rientro può sommare invece di confrontare numeri nudi.
//
// Due categorie di operazione, che si comportano diversamente:
//  - VARIAZIONE («somma» un numero, «insieme» entra/esce da un elenco): si somma a quello che è successo nel
//    frattempo. Mai un conflitto: se il giocatore toglie 5 PV e il Direttore ne aggiunge 10 da un'altra parte,
//    il risultato giusto è +5. «insieme» è idempotente: aggiungere chi c'è già, o togliere chi non c'è, non fa
//    niente — ripetere l'operazione non la conta due volte anche senza l'identificativo.
//  - ASSEGNAZIONE («assegna»): sostituisce un valore (un testo, una scelta, un nome). Qui il conflitto è vero
//    solo se il valore è cambiato ANCHE sul server rispetto a quello che il tablet aveva visto: va chiesto,
//    non deciso in automatico.
//
// Come si classifica un campo (src/sessione.js, src/character.js): la regola di base guarda il TIPO del
// valore — un numero è una somma, un elenco è un insieme, tutto il resto (testo, booleano, un oggetto assegnato
// in blocco) è un'assegnazione. Due sole eccezioni, dove il tipo da solo sbaglierebbe:
//   - `sessione.round` è un numero ma non lo decide il giocatore (lo fa avanzare lo scontro): assegnazione.
//   - `scelte.puntiEsperienza` è un numero ma la scheda lo tratta come un totale scritto a mano (il campo
//     «Punti esperienza» dell'Identità), non come «ne ho guadagnati N»: assegnazione. I PX dati da Davide
//     passano da «Modifica master» o dal pannello PX, non da qui.
// Non c'è una lista da tenere aggiornata per ogni campo nuovo della sessione: un campo nuovo si classifica da
// solo, dal suo tipo, finché non è una delle due eccezioni.
//
// Funzioni pure: leggono e scrivono oggetti già caricati (scelte/sessione/calendario), non il disco né la rete.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const EPSILON = 1e-9;

/** I percorsi (in punti, «sessione.round») che il tipo del valore classificherebbe male. */
const ECCEZIONI_ASSEGNA = new Set(['sessione.round', 'scelte.puntiEsperienza']);

/** Com'è fatto un valore (dopo la risoluzione delle eccezioni): 'somma' | 'insieme' | 'assegna'. */
export function tipoCampo(percorso, valore) {
  const chiave = percorso.join('.');
  if (ECCEZIONI_ASSEGNA.has(chiave)) return 'assegna';
  if (typeof valore === 'number' && Number.isFinite(valore)) return 'somma';
  if (Array.isArray(valore)) return 'insieme';
  return 'assegna';
}

/** L'identificativo di un elemento di un insieme: il suo `uid`/`id` se è un oggetto, altrimenti il valore
    stesso (una stringa come il nome di uno Stato), altrimenti (ripiego) il suo JSON. */
function identitaElemento(x) {
  if (isOggetto(x)) return String(x.uid ?? x.id ?? JSON.stringify(x));
  return String(x);
}

const ugualeValore = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < EPSILON : JSON.stringify(a) === JSON.stringify(b));

/** Legge un valore da un oggetto, seguendo il percorso; undefined se non c'è. */
function leggi(radice, percorso) {
  let x = radice;
  for (const p of percorso) { if (!isOggetto(x) && !Array.isArray(x)) return undefined; x = x?.[p]; }
  return x;
}

/** Scrive un valore in una copia dell'oggetto, creando gli oggetti intermedi se mancano. */
function scrivi(radice, percorso, valore) {
  if (!percorso.length) return valore;
  const [p, ...resto] = percorso;
  const base = isOggetto(radice) ? radice : {};
  return { ...base, [p]: resto.length ? scrivi(base[p], resto, valore) : valore };
}

/** Le foglie di un oggetto (percorso, valore): un array è già una foglia (non si scende dentro gli elementi). */
function* foglie(obj, percorso = []) {
  if (Array.isArray(obj)) { yield [percorso, obj]; return; }
  if (isOggetto(obj)) { for (const [k, v] of Object.entries(obj)) yield* foglie(v, [...percorso, k]); return; }
  yield [percorso, obj];
}

let contatore = 0;
/** Un identificativo di operazione: non si ripete nemmeno con due chiamate nello stesso millisecondo. */
function nuovoId(quando) {
  contatore = (contatore + 1) % 1e6;
  return `op-${new Date(quando).getTime().toString(36)}-${contatore.toString(36)}`;
}

/**
 * Le operazioni fra due stati «prima» e «dopo» ({ scelte, sessione, calendario }, gli stessi oggetti della
 * scheda), con l'etichetta leggibile per il giornale e la schermata di rientro.
 * @param prima lo stato di cui il tablet si fida (l'ultimo visto o scritto)
 * @param dopo lo stato dopo la modifica del giocatore
 * @param etichette percorso (punti) → funzione che dà l'etichetta: (info) => testo. `info` è { delta, valore,
 *   azione, nuovo, visto }. Senza etichetta per un percorso, un testo generico col percorso stesso.
 */
export function operazioniDaDiff(prima, dopo, { quando = new Date(), etichette = {} } = {}) {
  const prime = new Map([...foglie(prima)].map(([p, v]) => [p.join('.'), v]));
  const viste = new Set();
  const op = [];
  const etichetta = (percorso, info) => etichette[percorso.join('.')]?.(info) ?? `${percorso.join('.')}`;
  for (const [percorso, valoreDopo] of foglie(dopo)) {
    const chiave = percorso.join('.');
    viste.add(chiave);
    const valorePrima = prime.get(chiave);
    const tipo = tipoCampo(percorso, valoreDopo);
    if (tipo === 'somma') {
      const delta = (Number(valoreDopo) || 0) - (Number(valorePrima) || 0);
      if (Math.abs(delta) < EPSILON) continue;
      op.push({ id: nuovoId(quando), quando: new Date(quando).toISOString(), percorso, tipo, delta, etichetta: etichetta(percorso, { delta }) });
    } else if (tipo === 'insieme') {
      const primaArr = Array.isArray(valorePrima) ? valorePrima : [];
      const dopoArr = valoreDopo;
      const idPrima = new Map(primaArr.map((x) => [identitaElemento(x), x]));
      const idDopo = new Map(dopoArr.map((x) => [identitaElemento(x), x]));
      for (const [id, x] of idDopo) if (!idPrima.has(id)) op.push({ id: nuovoId(quando), quando: new Date(quando).toISOString(), percorso, tipo, azione: 'aggiungi', valore: x, identita: id, etichetta: etichetta(percorso, { azione: 'aggiungi', valore: x }) });
      for (const [id, x] of idPrima) if (!idDopo.has(id)) op.push({ id: nuovoId(quando), quando: new Date(quando).toISOString(), percorso, tipo, azione: 'togli', valore: x, identita: id, etichetta: etichetta(percorso, { azione: 'togli', valore: x }) });
    } else {
      if (ugualeValore(valorePrima, valoreDopo)) continue;
      op.push({ id: nuovoId(quando), quando: new Date(quando).toISOString(), percorso, tipo, visto: valorePrima, nuovo: valoreDopo, etichetta: etichetta(percorso, { visto: valorePrima, nuovo: valoreDopo }) });
    }
  }
  // un percorso sparito del tutto (un oggetto che aveva una chiave e non ce l'ha più): un'assegnazione a undefined
  for (const [chiave, valorePrima] of prime) {
    if (viste.has(chiave) || valorePrima === undefined) continue;
    const percorso = chiave.split('.');
    if (tipoCampo(percorso, valorePrima) === 'insieme') continue; // un insieme sparito del tutto: niente da togliere qui, lo gestisce il ramo sopra se «dopo» ha ancora la chiave (anche vuota)
    op.push({ id: nuovoId(quando), quando: new Date(quando).toISOString(), percorso, tipo: 'assegna', visto: valorePrima, nuovo: undefined, etichetta: etichetta(percorso, { visto: valorePrima, nuovo: undefined }) });
  }
  return op;
}

/**
 * Applica un'operazione a uno stato: per «somma» aggiunge il delta al valore attuale (qualunque esso sia, da
 * dopo che l'ha vista l'ultima volta); per «insieme» aggiunge o toglie l'elemento (per identità), senza
 * duplicare né fallire se non c'è; per «assegna» scrive `op.nuovo` — chi chiama (unisciGiornale) decide se è il
 * momento giusto per farlo (un'assegnazione in conflitto non va qui).
 */
export function applicaOperazione(stato, op) {
  if (op.tipo === 'somma') {
    const attuale = Number(leggi(stato, op.percorso)) || 0;
    return scrivi(stato, op.percorso, attuale + op.delta);
  }
  if (op.tipo === 'insieme') {
    const attuale = leggi(stato, op.percorso);
    const arr = Array.isArray(attuale) ? attuale : [];
    const presente = arr.some((x) => identitaElemento(x) === op.identita);
    if (op.azione === 'aggiungi') return presente ? stato : scrivi(stato, op.percorso, [...arr, op.valore]);
    return presente ? scrivi(stato, op.percorso, arr.filter((x) => identitaElemento(x) !== op.identita)) : stato;
  }
  return scrivi(stato, op.percorso, op.nuovo);
}

/**
 * Il rientro: il confronto a tre (parte C). `serverAttuale` è lo stato vero adesso (che Davide può aver
 * cambiato mentre il tablet era offline); `operazioni` è il giornale del tablet, in ordine. Le variazioni si
 * applicano sempre (nessuna domanda); le assegnazioni si applicano se il valore sul server è ancora quello che
 * il tablet aveva visto, altrimenti sono un conflitto vero e restano in sospeso (non si applicano, non si
 * scartano: li decide Davide — la schermata di rientro è il prossimo lotto).
 * @param applicate un Set() di identificativi già applicati in un rientro precedente (idempotenza: ripresentare
 *   lo stesso giornale — per esempio dopo un errore di rete a metà approvazione — non li riconta)
 * @returns { risultato, applicati: [id,...] (quelli applicati ORA, non quelli già applicati prima), conflitti:
 *   [{ operazione, attuale }] (le assegnazioni in sospeso, col valore vero del server) }
 */
export function unisciGiornale(serverAttuale, operazioni, applicate = new Set()) {
  let risultato = serverAttuale;
  const applicati = [];
  const conflitti = [];
  for (const op of operazioni ?? []) {
    if (applicate.has(op.id)) continue; // già fatto in un giro precedente: non riapplicare
    if (op.tipo === 'somma' || op.tipo === 'insieme') {
      risultato = applicaOperazione(risultato, op);
      applicati.push(op.id);
    } else {
      const attuale = leggi(risultato, op.percorso);
      if (ugualeValore(attuale, op.visto)) {
        risultato = applicaOperazione(risultato, op);
        applicati.push(op.id);
      } else {
        conflitti.push({ operazione: op, attuale });
      }
    }
  }
  return { risultato, applicati, conflitti };
}
