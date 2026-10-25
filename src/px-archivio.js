// Archivio «PX della partita» in memoria, con un salvataggio che non perde niente (25/10/2026, prova di Davide
// del 24/10: giocatori, personaggi, nome partita e incontri sparivano, e restavano solo passando da
// «Impostazioni» a «Riepilogo»).
//
// Il difetto era nel giro del Tavolo, ogni 3 secondi:
//   1. rileggeva px/px.json e, se non era uguale a quello in memoria, SOSTITUIVA l'archivio con la copia del server.
//      Una lettura partita prima del salvataggio (o con le ultime lettere ancora da scrivere) riportava indietro
//      tutto; i campi della pagina, che tenevano in mano gli oggetti di prima, scrivevano in oggetti ormai
//      orfani — modifiche mai salvate e mai viste;
//   2. la «migrazione silenziosa» dei giocatori scriveva sul server la copia APPENA LETTA, cioè vecchia, sopra
//      quello che si era appena digitato;
//   3. ogni tasto era una scrittura a sé, senza ordine: due richieste in volo potevano arrivare scambiate.
// Passare da una scheda all'altra «aiutava» solo perché ridisegnava la pagina con l'archivio del momento.
//
// Ora l'archivio è uno solo e lo tiene questo modulo: chi modifica avvisa con `modifica()`; il salvataggio parte
// da solo dopo una breve pausa (e subito alla chiusura della pagina), una richiesta alla volta, e se ne ha
// perso una la ripete; il giro di aggiornamento non sostituisce mai l'archivio mentre ci sono modifiche da
// scrivere o una lettura iniziata prima dell'ultima modifica. Niente di questo conosce il DOM: si prova con
// funzioni finte (tests/px-archivio.test.js).

const uguali = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * @param scrivi (db, { keepalive }) → promessa: salva l'intero archivio sul server
 * @param attesaMs pausa fra l'ultima modifica e il salvataggio (unisce i tasti ravvicinati)
 * @param ritentaMs pausa prima di riprovare dopo un errore
 * @param aCambio (stato) → void, chiamata a ogni cambio di stato: { stato, errore, quando }
 * @param timer { imposta, annulla }: sostituibile nei test
 */
export function creaArchivioPx({ scrivi, attesaMs = 500, ritentaMs = 3000, aCambio = () => {}, timer = { imposta: setTimeout, annulla: clearTimeout } } = {}) {
  let db = null;
  let rev = 0; // cresce a ogni modifica
  let revScritta = 0; // l'ultima `rev` che il server ha confermato
  let gettone = 0; // cresce a ogni modifica e a ogni salvataggio finito: invalida le letture iniziate prima
  let inVolo = null;
  let attesa = null;
  let stato = 'salvato'; // 'salvato' | 'da-salvare' | 'salvataggio' | 'errore'
  let errore = null;
  let quando = null;

  const imposta = (s, e = null) => { stato = s; errore = e; aCambio({ stato, errore, quando }); };
  const sporco = () => rev !== revScritta;

  async function ciclo(opz) {
    while (sporco()) {
      const r = rev;
      imposta('salvataggio');
      try {
        await scrivi(db, opz);
      } catch (e) {
        imposta('errore', e?.message ?? String(e));
        attesa = timer.imposta(() => { attesa = null; void salva(); }, ritentaMs);
        return false;
      }
      revScritta = r;
      gettone += 1;
      quando = new Date();
    }
    imposta('salvato');
    return true;
  }

  /** Scrive subito (se c'è qualcosa da scrivere) e risponde quando il server ha confermato; false se non è riuscito. */
  function salva(opz = {}) {
    if (attesa) { timer.annulla(attesa); attesa = null; }
    if (inVolo) return inVolo.then(() => (sporco() ? salva(opz) : stato === 'salvato'));
    if (!sporco() || !db) return Promise.resolve(stato !== 'errore');
    inVolo = ciclo(opz).finally(() => { inVolo = null; });
    return inVolo;
  }

  return {
    get db() { return db; },
    get stato() { return { stato, errore, quando, sporco: sporco() }; },
    /** Da chiamare PRIMA di leggere dal server: la lettura vale solo se nel frattempo non è cambiato niente. */
    gettone: () => gettone,
    /**
     * Il giro di aggiornamento porta la copia del server. Ritorna true se l'archivio è cambiato (un'altra finestra
     * ha scritto), false se è rimasto quello in memoria.
     * @param letto l'archivio dal server, o null se il file non c'è ancora
     * @param prima il `gettone()` preso prima di iniziare la lettura
     * @param iniziale () → archivio di partenza, quando né il server né la memoria ne hanno uno
     */
    sincronizza(letto, prima, iniziale) {
      if (!db) { db = letto ?? iniziale(); return true; }
      if (sporco() || inVolo || attesa) return false; // ci sono modifiche nostre da scrivere: vincono loro
      if (prima !== gettone) return false; // la lettura è partita prima di un nostro salvataggio: è già vecchia
      if (!letto || uguali(letto, db)) return false;
      db = letto;
      return true;
    },
    /** Qualcuno ha cambiato `db` sul posto (o l'ha sostituito con `nuovo`): da salvare. */
    modifica(nuovo) {
      if (nuovo) db = nuovo;
      rev += 1;
      gettone += 1;
      if (attesa) timer.annulla(attesa);
      attesa = timer.imposta(() => { attesa = null; void salva(); }, attesaMs);
      imposta('da-salvare');
    },
    salva,
  };
}

/** La riga di stato sotto il titolo del pannello. */
export function testoSalvataggio({ stato, errore, quando }, adesso = new Date()) {
  if (stato === 'errore') return { tipo: 'errore', testo: `Non salvato: ${errore ?? 'errore'}. Ci riprovo da solo; controlla che avvia-server.bat sia aperto.` };
  if (stato === 'da-salvare' || stato === 'salvataggio') return { tipo: 'attesa', testo: 'Salvataggio in corso…' };
  if (!quando) return { tipo: 'ok', testo: 'Tutto salvato.' };
  const sec = Math.max(0, Math.round((adesso - quando) / 1000));
  return { tipo: 'ok', testo: sec < 10 ? 'Salvato ora.' : `Salvato alle ${quando.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}.` };
}
