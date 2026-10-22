// Il giornale delle operazioni (21/10/2026, quarto e ultimo lotto della pipeline dei salvataggi, «si può
// modificare offline, e al rientro Davide approva»). È il punto su cui si regge tutto: un tablet offline non
// registra lo stato finale del personaggio, registra OGNI operazione fatta, in ordine, con un identificativo
// proprio — «−5 PV (21:40)», «+1 Pergamena di Cura Ferite (21:52)», «Stato Sanguinamento acceso (21:53)» — così
// riapplicarla due volte non la conta due volte, e il rientro può sommare invece di confrontare numeri nudi.
//
// Due categorie di operazione, che si comportano diversamente:
//  - VARIAZIONE («somma» un contatore, «insieme» entra/esce da un elenco): si somma a quello che è successo nel
//    frattempo. Mai un conflitto: se il giocatore toglie 5 PV e il Direttore ne aggiunge 10 da un'altra parte,
//    il risultato giusto è +5. «insieme» è idempotente: aggiungere chi c'è già, o togliere chi non c'è, non fa
//    niente — ripetere l'operazione non la conta due volte anche senza l'identificativo.
//  - ASSEGNAZIONE («assegna», e «insieme» con azione «aggiorna», cioè un elemento dell'elenco cambiato dentro:
//    una nota del calendario riscritta, la quantità di un oggetto): sostituisce un valore. Qui il conflitto è
//    vero solo se il valore è cambiato ANCHE sul server rispetto a quello che il tablet aveva visto: va
//    chiesto, non deciso in automatico.
//
// COME SI CLASSIFICA UN CAMPO (22/10/2026, revisione decisa da Marcello: «è lì che si fa il danno silenzioso»).
// Fino al 21/10 la regola era «ogni numero è una somma, salvo due eccezioni». Era sbagliata nella direzione
// pericolosa: FOR, il livello, i PV massimi, un VA, un gradino di Ferita sono numeri ma NON sono contatori.
// Portare FOR da 10 a 12 offline non è «+2» da sommare a quello che ha fatto Davide: è una sostituzione. Se
// tutti e due toccano quel valore e l'app li somma, esce un numero che nessuno dei due ha mai scritto, su una
// scheda che resta plausibile: nessuno se ne accorge.
//
// Quindi il default è rovesciato: **si somma solo ciò che è dichiarato contatore (CONTATORI); tutto il resto
// assegna**, e gli elenchi restano insiemi. Sbagliare in questa direzione produce una domanda in più al
// Direttore; sbagliare nell'altra produce una Caratteristica falsa.
//
// Due registri, che sono anche la documentazione della classificazione (docs/personaggi-pipeline-2026-10-20.md):
//   - CONTATORI: i percorsi che si sommano. Un campo nuovo NON entra qui da solo.
//   - ASSEGNA_DICHIARATI: i numeri (e i pochi elenchi) su cui qualcuno ha *deciso* che non sono contatori. Non
//     cambiano il comportamento — il default li coprirebbe comunque — servono perché un numero non classificato
//     fa fallire `tests/giornale-campi.test.js` (campiNonClassificati): nessuno aggiunge un campo numerico
//     senza decidere che cos'è.
// I percorsi sono modelli: `*` è una chiave qualunque (un uid, una sigla, il nome di un'Abilità), `**` è tutto
// il sottoalbero.
//
// Funzioni pure: leggono e scrivono oggetti già caricati (scelte/sessione/calendario), non il disco né la rete.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const EPSILON = 1e-9;

/**
 * I contatori: numeri che si sommano, perché ogni modifica è «quanto è cambiato», non «quanto vale». Due
 * modifiche indipendenti si sommano e non sono mai un conflitto (il giocatore toglie 5 PV mentre il Direttore
 * ne aggiunge 10: il risultato giusto è +5).
 */
export const CONTATORI = [
  'sessione.pvAttuali', // danni e cure, −5 / +3
  'sessione.pmAttuali', // PM spesi e recuperati
  'sessione.puntiEroe', // spesi e concessi
  'sessione.distintivi', // guadagnati e convertiti
  'sessione.crediti', // spesi e incassati
  'sessione.munizioni.*.colpi', // colpi nel caricatore: sparati e ricaricati
  'sessione.munizioni.*.riserve', // caricatori pieni di scorta
  'sessione.munizioni.*.vuoti', // caricatori vuoti messi via
  'sessione.scorte.*', // munizioni sciolte consumate
  'sessione.chroma.*.pmAttuali', // PM di un contenitore: spesi e ricaricati
  'sessione.integrita.*', // PI di un oggetto: persi e riparati
  'sessione.nec.*', // riserva di un NEC: consumata e ricaricata
  'sessione.impianti.cartucce.*', // cartucce di un iniettore: somministrate e rifornite
];

/**
 * I numeri (e i due elenchi) su cui si è deciso che NON sono contatori. Elenco ragionato, non un ripiego: il
 * comportamento sarebbe lo stesso anche senza, ma senza non si saprebbe che qualcuno ci ha pensato.
 */
export const ASSEGNA_DICHIARATI = [
  // gradini e indici di uno stato: 3 + 2 non è «Profonda più Importante», è un gradino che non esiste
  'sessione.ferite',
  'sessione.affaticamento',
  'sessione.corruzione',
  'sessione.intensitaStati.*',
  // valori che si scrivono interi in un campo, non si incrementano
  'sessione.caricoExtra', // kg: il giocatore scrive il totale trasportato
  'sessione.creditiIniziali', // istantanea del saldo iniziale visto, non una somma di spese
  'sessione.chroma.*.iniziale', // PM impostati per un contenitore trovato (E&L 2): un'istantanea, non una ricarica
  'scelte.puntiEsperienza', // il totale dei PX, scritto a mano nell'Identità
  // riferimenti temporali: un Round non è il contatore di nessuno (lo fa avanzare lo scontro)
  'sessione.round',
  'sessione.ultimaTecnica.round',
  'sessione.morente.dal',
  'sessione.morente.turno',
  'sessione.morente.iniziale',
  'sessione.morente.tolti',
  'sessione.attivazioniArmi.*.dal',
  'sessione.attivazioniArmi.*.round',
  // elenchi di numeri uguali fra loro: due carichini da 3 colpi sono due cose, non una (un insieme li fonderebbe)
  'sessione.carichini.*',
  'sessione.munizioni.*.parziali',
  // memoria dei pannelli «Attacca!» e «Lancia!»: scelte dell'ultima volta, si sostituiscono in blocco
  'sessione.attacchi.**',
  'sessione.lanci.**',
  // scelte del personaggio: sono assegnazioni, mai somme. È il caso di FOR dell'esempio: i punti assegnati a una
  // Caratteristica o a un'Abilità sono «quanto vale», non «quanto è cambiato»
  'scelte.puntiCaratteristica.*',
  'scelte.puntiAbilitaLiberi.*',
  'scelte.puntiEroe.valore', // il tiro dei Punti Eroe iniziali (§2.15)
  'scelte.dotazione.**', // equipaggiamento iniziale: tiro dei crediti, opzioni, acquisti (§2.16)
];

/** Un percorso corrisponde a un modello con `*` (una chiave) e `**` (tutto il sottoalbero)? */
function corrisponde(percorso, modello) {
  const m = modello.split('.');
  for (let i = 0; i < m.length; i++) {
    if (m[i] === '**') return percorso.length >= i;
    if (i >= percorso.length) return false;
    if (m[i] !== '*' && m[i] !== percorso[i]) return false;
  }
  return percorso.length === m.length;
}

const eContatore = (percorso) => CONTATORI.some((m) => corrisponde(percorso, m));
const eDichiarato = (percorso) => ASSEGNA_DICHIARATI.some((m) => corrisponde(percorso, m));

/**
 * Com'è fatto un valore: 'somma' (solo i CONTATORI), 'insieme' (un elenco, salvo i due dichiarati) o
 * 'assegna' (tutto il resto, compreso ogni numero non dichiarato contatore).
 */
export function tipoCampo(percorso, valore) {
  if (eDichiarato(percorso)) return 'assegna';
  if (typeof valore === 'number' && Number.isFinite(valore)) return eContatore(percorso) ? 'somma' : 'assegna';
  if (Array.isArray(valore)) return 'insieme';
  return 'assegna';
}

/**
 * I percorsi numerici di uno stato che nessuno ha classificato: né contatori né assegnazioni dichiarate. Al
 * tavolo si comportano come assegnazioni (il default sicuro), ma `tests/giornale-campi.test.js` fallisce finché
 * ci sono, così un campo numerico nuovo non entra nel modello senza che qualcuno decida che cos'è.
 */
export function campiNonClassificati(stato) {
  const fuori = [];
  for (const [percorso, valore] of foglie(stato)) {
    if (typeof valore !== 'number' || !Number.isFinite(valore)) continue;
    if (eContatore(percorso) || eDichiarato(percorso)) continue;
    fuori.push(percorso.join('.'));
  }
  return [...new Set(fuori)];
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
      // stesso elemento (stesso uid o id) cambiato dentro: una nota del calendario riscritta, la quantità di un
      // oggetto, i PI di un veicolo. Senza questo ramo la modifica sparirebbe in silenzio (l'identità c'è prima
      // e dopo, quindi non è né un'aggiunta né una rimozione): è un'assegnazione sull'elemento, e può andare in
      // conflitto se anche il Direttore ha toccato lo stesso elemento.
      for (const [id, x] of idDopo) {
        const prima = idPrima.get(id);
        if (prima === undefined || ugualeValore(prima, x)) continue;
        op.push({ id: nuovoId(quando), quando: new Date(quando).toISOString(), percorso, tipo, azione: 'aggiorna', identita: id, visto: prima, nuovo: x, etichetta: etichetta(percorso, { azione: 'aggiorna', valore: x, visto: prima, nuovo: x }) });
      }
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
 * Il valore che un'operazione di assegnazione sta per sostituire, com'è adesso: il campo stesso, oppure
 * l'elemento dell'elenco con quell'identità (azione «aggiorna»); undefined se non c'è più.
 */
export function valoreToccato(stato, op) {
  if (op.tipo === 'insieme' && op.azione === 'aggiorna') {
    const arr = leggi(stato, op.percorso);
    return (Array.isArray(arr) ? arr : []).find((x) => identitaElemento(x) === op.identita);
  }
  return leggi(stato, op.percorso);
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
    // «aggiorna»: lo stesso elemento cambiato dentro. Se non c'è più (il Direttore l'ha tolto) non lo si
    // resuscita: la decisione è sua, e unisciGiornale l'ha già segnalato come conflitto.
    if (op.azione === 'aggiorna') return presente ? scrivi(stato, op.percorso, arr.map((x) => (identitaElemento(x) === op.identita ? op.nuovo : x))) : stato;
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
    if (op.tipo === 'somma' || (op.tipo === 'insieme' && op.azione !== 'aggiorna')) {
      risultato = applicaOperazione(risultato, op);
      applicati.push(op.id);
    } else {
      // assegnazione (un valore, o un elemento dell'elenco cambiato dentro): si applica solo se il server è
      // ancora com'era quando il tablet l'ha visto; altrimenti è un conflitto vero e lo decide Davide
      const attuale = valoreToccato(risultato, op);
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
