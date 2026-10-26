# Una sola installazione: Mutant si accorge da solo di essere la copia sbagliata (27/10/2026)

Ricostruzione di Marcello: sul desktop di Davide c'era il pacchetto `distribuzione` (lo zip e la cartella estratta).
Aprendo `1_scarica_o_aggiorna_app.bat` da lì, il pacchetto ha creato una copia **nuova e vuota** in
`C:\Users\Dell\Desktop\distribuzione\mutant`, invece di aggiornare l'installazione vera (quella con i personaggi).
Il collegamento sul desktop apriva quella copia vuota. Stesso difetto di fondo di sempre: due posti diversi da cui
fare la stessa cosa.

Regola da oggi: **il pacchetto `distribuzione` serve solo a installare Mutant la prima volta**, su un PC dove non
c'è ancora. Tutto il resto — aprire, aggiornare, tutto — si fa solo dal collegamento «Mutant» e dal suo menu.

## A. Mutant si accorge di essere la copia sbagliata

All'avvio (`tools/console.mjs` → `voceAvvio`, quindi anche subito dopo ogni «2. Aggiorna», che riapre Mutant.bat da
sé): se la cartella dei dati di questo PC non ha personaggi, si cerca un'altra installazione che li ha, con la stessa
ricerca della voce P (lotto 127, raggio ridotto per un controllo che parte da solo senza che nessuno l'abbia chiesto:
solo Desktop/Documenti/Download — utente, pubblico, OneDrive — e la cartella dell'utente, non le cartelle sopra
l'installazione stessa: in una prova, o in un'installazione in un percorso molto corto, risalire potrebbe arrivare
alla cartella TEMP del PC, piena di cartelle di altre prove).

- **Trovata un'altra installazione vera** (con `Mutant.bat` o `server.mjs`): una domanda sola, con i nomi e i PX dei
  personaggi trovati e quando è stato l'ultimo salvataggio. Con SI: diventa lei la cartella dei dati di questo PC,
  il suo codice si mette al passo con quello appena scaricato (si riusa lo stesso script dell'aggiornamento da zip,
  `distribuzione/aggiorna-da-zip.ps1`: aggiorna solo i file dell'app, mai personaggi/tavolo/salvataggi…), e il
  collegamento «Mutant» sul desktop punta da adesso a quella installazione. La copia vuota non si cancella: si segna
  per essere rinominata in «…-NON-USARE» non appena non è più quella in uso (mai mentre è la cartella da cui si è
  appena partiti: rinominare la propria cartella di lavoro mentre un programma ci gira dentro è rischioso su
  Windows). La rinomina avviene al prossimo avvio di Mutant, quando parte dall'installazione buona.
- **Trovata solo una copia senza i marcatori dell'app** (una cartella sul cloud, una copia di sicurezza): non si usa
  da dove sta — la sincronizzazione scriverebbe sui file mentre si gioca — si propone invece di copiarla dentro
  questa installazione.
- Senza SI, o senza risposta: non si cambia niente, e si richiede alla prossima apertura.

`tools/ripara-installazione.mjs` (nuovo): `controllaSeSbagliata`, `segnaCartellaVuota`/`eseguiRinominePendenti` (le
cartelle vuote in attesa, in un elenco nel profilo di Windows), `copiaPersonaggiDentro`, `aggiornaCodiceAltra`.
`tools/console.mjs` → `proponiRiparazione`, richiamata da `voceAvvio`.

## B. Il pacchetto non crea mai una seconda installazione

`distribuzione/1_scarica_o_aggiorna_app.bat`: prima di scaricare o estrarre qualunque cosa, se non si sta
aggiornando la stessa cartella (`MUTANT_DA_AGGIORNA`, o la cartella di destinazione esiste già) controlla se Mutant è
già da qualche parte su questo PC — l'impostazione del profilo, o una ricerca leggera nei Desktop/Documenti/Download
— e se lo trova non installa niente: dice dov'è e invita a usare il collegamento sul desktop, con «questo pacchetto
puoi cancellarlo».

## C. Aggiornare si fa solo da dentro

La voce 2 di Mutant.bat aggiornava già sempre la cartella da cui parte, mai una cartella nuova accanto; da oggi, se
per farlo usa internamente il programma del pacchetto (copie senza Git), gli dice **in modo esplicito** quale
cartella aggiornare (`MUTANT_DEST_ESPLICITA`), invece di farglielo capire dalla propria posizione.

## Prova

`tests/ripara-installazione.test.js` (10 prove, vere: PowerShell, robocopy, il collegamento `.lnk` su un desktop
finto — mai quello reale): il caso di Davide riprodotto esattamente (un'installazione vuota, una vera con 7
personaggi e i PX, una cartella «Dati precedenti» solo cloud) propone per prima quella vera; con SI il codice
dell'installazione vera si mette al passo, il collegamento punta a lei, la cartella vuota è segnata e si rinomina
al prossimo avvio da un'altra cartella (mai da se stessa); senza un'altra installazione ma con una copia sul cloud,
si copia dentro; senza niente, nessuna domanda.

Il pacchetto (parte B) provato a mano, sul PC vero, in sola lettura sulle cartelle reali:

- con un'installazione già pronta altrove (profilo impostato): si ferma, dice dov'è, non crea `mutant\` né chiama
  la rete;
- su un PC senza Mutant: supera il controllo e arriva al passo della rete (fermato lì solo perché la prova non ha
  davvero scaricato nulla).

## Per Davide, stasera

1. Dal collegamento «Mutant» sul desktop: **2. Aggiorna Mutant**.
2. Se Mutant si accorge da sola di essere nella copia vuota, farà una domanda con i nomi dei personaggi trovati e i
   PX: rispondere **SI**.
3. Chiudere quella finestra e riaprire Mutant dal collegamento sul desktop: da lì in avanti apre l'installazione con
   i personaggi, e il collegamento stesso punta già a quella giusta.
4. Il pacchetto `distribuzione` (lo zip e la cartella estratta) non serve più: si può cancellare.
