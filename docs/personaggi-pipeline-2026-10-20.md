# I personaggi: dove vivono, chi li scrive, che cosa succede offline

> **Com'è fatta adesso** (22/10/2026, pipeline chiusa). Questa prima parte dice com'è il sistema oggi: è quella da leggere fra sei mesi. Tutto il resto del documento è il diario dei quattro lotti che ci hanno portati qui, in ordine di tempo — serve per capire *perché* una cosa è così, non *com'è*.

## Com'è fatta adesso

### Dove vive un personaggio

Sul **PC del Direttore**, in `personaggi/`, un file per personaggio (`Nome_livN_AAAA-MM-GG.json`). Ogni altra installazione è una **copia di lavoro** e lo dice in cima a ogni pagina. L'identità non è il nome del file: è il campo `pg` che il file porta dalla nascita (`src/character.js` → `nuovoPg`). Ogni scrittura aggiunge `versione_salvataggio`, `aggiornato_il` e `aggiornato_da` (`giocatore`, `master`, `px`), e la versione di prima va in `personaggi/storico/<id>/` (una copia ogni 10 minuti al massimo, ultime 40).

Il browser di chi gioca ne tiene una copia in `localStorage`, ma non è l'originale: **se la cartella è cambiata vince la cartella**, anche a costo di scartare una modifica locale più recente (`src/cartella.js` → `confronta`).

### Chi lo scrive

| Chi | Come | Limiti |
|---|---|---|
| Il giocatore, dal suo tablet | `PUT /api/personaggi/<file>` | solo il personaggio che quel dispositivo ha scelto (`tavolo/dispositivi.json`); solo se non ha modifiche in attesa (sotto) |
| Il Direttore, dal suo PC | la scheda in «Modifica master», la plancia, il pannello PX | nessuno: il suo PC non è mai soggetto ai controlli |
| Il Direttore, approvando un rientro | `POST /api/rientro` | solo dal suo PC |

Ogni scrittura dichiara la revisione che ha visto (`X-Mutant-Mtime`): se il file è cambiato nel frattempo il server rifiuta (409) e la scheda apre il riquadro del conflitto con un messaggio leggibile. **Non si sovrascrive mai in silenzio.**

### Che cosa succede offline

Il tablet continua a funzionare: i comandi non si spengono. Ogni modifica diventa un'**operazione** nel giornale (`src/giornale.js`), con il suo identificativo e la sua ora, messa in coda nel `localStorage` del dispositivo (`src/ui/coda-offline.js`). La riga di stato lo dice: «offline da 7 minuti · 4 modifiche in attesa», e «Vedi la coda» le mostra — finché non sono partite si può togliere un tocco sbagliato.

Le operazioni sono di tre specie, e **la classificazione è la cosa più delicata di tutto il sistema**:

- **somma** — solo i percorsi dichiarati in `CONTATORI` (PV, PM, Punti Eroe, Distintivi, crediti, colpi e riserve, munizioni sciolte, PM dei contenitori, PI, riserve dei NEC, cartucce degli iniettori): si sommano a quello che è successo nel frattempo e non sono **mai** un conflitto;
- **insieme** — gli elenchi (oggetti, Stati, incantesimi, note del calendario, veicoli…): entrare e uscire è idempotente; un elemento *cambiato dentro* (azione `aggiorna`) è invece un'assegnazione sull'elemento;
- **assegna** — **tutto il resto**, compreso ogni numero che non è un contatore: FOR, un gradino di Ferita, i punti di un'Abilità, il Round. Qui il conflitto esiste, ed è vero solo se il valore è cambiato anche sul server.

Il default è l'assegnazione, non la somma: sbagliare così costa una domanda in più al Direttore, sbagliare nell'altro verso produce una Caratteristica falsa su una scheda che resta plausibile. Un campo numerico nuovo che nessuno ha classificato fa fallire `tests/giornale-campi.test.js`.

Quando il tablet torna in linea manda il giornale (`POST …/giornale`), e **da quel momento non scrive più il file da solo**: le sue modifiche sono proposte in attesa. Continua ad accodare anche le modifiche successive — altrimenti scavalcherebbero la fila — finché il Direttore non ha risposto.

### Che cosa vede il Direttore

Se nessun tablet ha lavorato offline, **niente**: la schermata di rientro non esiste. Quando c'è qualcosa in attesa (`tavolo/rientro.json`), sul suo PC si apre da sé una schermata a parte, «Rientro dei tablet» (`src/ui/rientro.js`), dovunque si trovi nell'app:

- l'elenco in italiano, personaggio per personaggio e in ordine di ora: «−5 PV (21:40)»;
- **Approva** o **Scarta** per riga, oppure «Approva tutte» / «Scarta tutte» per quel personaggio;
- per i conflitti veri le due versioni affiancate, con la scelta esplicita «Tieni quella del tablet» / «Tieni quella del server»;
- **chiudere non è scartare**: quello che non decide resta in attesa e si ripresenta, anche dopo un riavvio (sta sul server, non nella pagina).

Quando risponde: le approvate si applicano al file in ordine di ora, le scartate spariscono, il tablet se ne accorge al giro successivo, svuota le righe decise, dice al giocatore che cosa è passato e che cosa no, e riallinea la scheda a quello che il Direttore ha deciso.

### I file e i moduli, in breve

| Cosa | Dove |
|---|---|
| Classificazione dei campi, operazioni, confronto a tre | `src/giornale.js` (`CONTATORI`, `ASSEGNA_DICHIARATI`, `campiNonClassificati`) |
| Coda del tablet ed etichette in italiano | `src/ui/coda-offline.js` |
| Riga di stato del tablet | `src/stato-tablet.js`, `src/ui/stato-tablet.js` |
| Deposito delle modifiche in attesa e decisioni | `src/rientro.js`, `tavolo/rientro.json` |
| API | `server.mjs`: `POST /api/personaggi/<file>/giornale`, `GET` e `POST /api/rientro` |
| Schermata del Direttore | `src/ui/rientro.js`, `css/style.css` → `.schermata-rientro` |
| Identità del dispositivo e abbinamento | `src/ui/dispositivo.js`, `src/dispositivi.js`, `tavolo/dispositivi.json` |
| Test | `tests/giornale.test.js`, `tests/giornale-campi.test.js`, `tests/rientro.test.js`, `tests/rientro-tablet.test.js`, `tests/giornale-server.test.js`, `tests/coda-offline.test.js`, `tests/stato-tablet.test.js` |

---

# Il diario dei quattro lotti (20–22/10/2026)

## Chi tiene l'originale (chiarimento di Marcello, 20/10 sera)

**I personaggi veri stanno sul PC del Direttore.** Quella è l'unica cartella `personaggi/` che conta.

- Ogni altra installazione (il portatile di chi sviluppa, una copia per provare) è una **copia di lavoro**: serve a provare, non a custodire. I 26 file analizzati nella ricognizione qui sotto erano di una copia di lavoro, non gli originali.
- **I personaggi non viaggiano da una copia di lavoro all'originale** se non con un'operazione esplicita e dichiarata. Mai in automatico, mai di nascosto dentro un ripristino.
- **Come si marca una copia di lavoro:** un file `COPIA-DI-LAVORO.txt` nella cartella dell'app o in `personaggi/`; la prima riga è una nota libera. Basta crearlo, senza toccare il codice, e non è tracciato da git (su un'altra installazione sarebbe un avviso falso). Dove c'è, in cima a ogni pagina — scheda, Tavolo, plancia, mappa, tablet dei giocatori — compare la riga «Copia di lavoro — i personaggi veri sono sul PC del Direttore». Sul PC del Direttore non compare niente.
- **Prima di sovrascrivere** (ripristino, caricamento di un salvataggio) si dice da dove arrivano i dati e che cosa sostituiscono. Se i dati vengono da una copia di lavoro e la destinazione è l'originale, l'avviso è forte e la conferma si scrive per esteso (`SOVRASCRIVI`). Il marcatore dentro `personaggi/` viaggia nello zip del salvataggio: è così che il ripristino sa da dove vengono i dati.
- **Scegliere l'originale fra più file** non si fa con la data del file: cinque PG su sette avevano la stessa ora perché riscritti insieme da un recupero. Si guardano i segni dentro — livello, PX, calendario di gioco — e dove non concordano si dichiara **caso dubbio** invece di scegliere (`src/confronto-personaggi.js`).

Per il terzo prompt: il rientro dall'offline è un'operazione esplicita verso l'originale, quindi segue le regole di questa sezione.

Prima parte della pipeline dei salvataggi decisa con Marcello il 20/10; la seconda («il tablet è una vista, non un proprietario») è in coda a questo documento. La terza — l'offline e il rientro — viene dopo.

> La specifica completa (`claude/pipeline-salvataggi.md`) non è nel repo: ho lavorato sui punti A–G del prompt. Se il documento contiene decisioni che qui non compaiono, vanno rilette prima della terza parte.

## A. Ricognizione: com'era prima di questo lotto

**I file.** 26 file di personaggio in `personaggi/` più `LEGGIMI.txt`, per **7 personaggi**: ogni file è un export completo, con il nome `Nome_livN_AAAA-MM-GG.json`. Un nuovo giorno o un nuovo livello creavano un file nuovo e i vecchi restavano (il server non cancella mai). Lucas ne aveva 10, Botha-Pretorius 5, Michele Giorgetti e Oshi Nagata 3, Duncan McDuff e Pablo Zaion 2, Dimitri Orlav 1.

**L'identità c'era già.** Tutti e 26 i file portano `pg` (per esempio `pg-2b1279a5686e2546624fd153`), creato alla nascita del personaggio e indipendente dal nome (`src/character.js` → `nuovoPg`): i 26 file danno **7 identificativi distinti**. Non serviva inventare un id: serviva usarlo dappertutto.

**Da dove veniva la lista.**

| Dove | Come | Problema |
|---|---|---|
| Pagina iniziale | `elencoUnito` (src/cartella.js), che raggruppa già per `pg` | nessuno: una riga per personaggio |
| Plancia del Tavolo | `elencoCartella()` + `ultimiPerPersonaggio` (per **nome** del file) | i PG «al tavolo» vanno scelti a mano in `tavolo/sessione.json` |
| Menu dei PX | `schede: stato.elenco`, cioè **tutti i file** | tre o quattro copie di ogni personaggio |
| Mini-schede e vista giocatori | il server legge l'ultimo file di ogni PG | nessuno |
| Tablet dei giocatori | la vista che il server calcola dai file | nessuno |

**Quando si scriveva su disco.** Solo da `PUT /api/personaggi/<file>`, chiamato da: la scheda (`programmaCartella`, con **1,5 s** di attesa dopo l'ultima modifica), la plancia («Colpito», bonus di circostanza), il pannello PX («Assegna PX»). In più il server riscrive un file quando migra i veicoli nel registro (A.91, una volta per veicolo) e toglie i file provvisori di un PG che ha preso il nome. **Preparare nemici, scontri, scene o mappe non scriveva e non scrive nessun personaggio**: sono API e cartelle separate (verificato con un test).

**Chi teneva una copia in memoria.** `stato.sessione` e `stato.scelte` della scheda (con `localStorage` come copia del browser); `stato.elenco`, `stato.testi` e `stato.viste` della plancia (rilette per mtime); `cacheFile` del server (solo `{ pg, nome }` per data e dimensione del file); `migrazioni.visti`. Nessuna di queste era «l'originale»: era proprio il difetto.

## B. Che cos'è l'originale, adesso

- **L'id stabile è il `pg`** che ogni file porta dalla nascita. Non cambia mai, nemmeno cambiando nome (test). I file di prima senza `pg` usano come ripiego il «Nome» del file (`nome-Lucas`).
- Ogni file porta in più, scritti dal server a ogni salvataggio (`src/storico-personaggi.js`):
  - `versione_salvataggio`: contatore che sale di 1 a ogni scrittura. **Non si chiama `versione`** perché quel campo è già la versione del *formato* del file (oggi 8) e cambiarlo avrebbe fatto rifiutare i file dall'app.
  - `aggiornato_il` (ISO) e `aggiornato_da`: `giocatore`, `master` o `px`. Chi scrive lo dichiara con l'intestazione `X-Mutant-Da`; senza, vale `master` se la richiesta viene dal PC del server, altrimenti `giocatore`.
  - **Migrazione silenziosa:** un file senza quei campi vale versione 1 e si apre come prima.
- **Le versioni vecchie** vanno in `personaggi/storico/<id>/<AAAA-MM-GGTHH-MM-SS>.json` prima di ogni sovrascrittura. Nessun elenco dell'app la mostra: `storico` non passa il filtro dei nomi dei file dei personaggi. Con il salvataggio a ogni modifica una copia per tocco sarebbe insostenibile: **una copia ogni 10 minuti al massimo** per personaggio, **ultime 40** conservate.

### Quello che NON ho fatto, e perché

La specifica chiedeva di rinominare i file in `personaggi/<id>.json`. **Mi sono fermato**, perché il nome del file oggi non è solo un nome: è la **chiave con cui i personaggi sono scritti dentro altri dati già salvati**. `chiaveDaFile(file)` (per esempio `LUCAS`) compare in:

- `tavolo/sessione.json` → `personaggi: ["LUCAS", "BOTHA-PRETORIUS", …]` (chi è al tavolo);
- `scontri/*.json` e `scontri/archivio/*.json` → partecipanti `pg:LUCAS` (anche negli scontri archiviati);
- `scene/*.json` → token `pg:LUCAS` sulla mappa di battaglia;
- `veicoli/*.json` → proprietario e conducente.

Rinominando i file, `chiaveDaFile` restituirebbe `pg-2b1279…` e **tutti quei riferimenti si romperebbero in una volta sola**: i PG sparirebbero dal tavolo, dagli scontri in corso e dalle scene. Non è un rischio che valga la pena correre insieme a tutto il resto, e non si ripara con un controllo in più: va fatto il contrario, cioè **prima** disaccoppiare la chiave del tavolo dal nome del file.

**Come farlo (per la seconda parte):** introdurre la chiave `pg:<id>` accanto a quella per nome, far accettare a tutti i lettori (plancia, scene, scontri, veicoli) tutte e due le forme, migrare i riferimenti salvati, e **solo allora** rinominare i file. Nel frattempo il beneficio pratico — un personaggio una volta sola — c'è già senza toccare i nomi (punto C).

## C. La lista viene dal disco

`GET /api/personaggi` rilegge la cartella a ogni richiesta (era già così) e `src/cartella.js` → **`ultimiPerPg`** dà un file solo per identificativo, il più recente. Lo usa il menu del pannello PX, dove si vedevano tre o quattro copie di ogni personaggio: ora **7 voci** con i file veri del progetto (provato). La pagina iniziale raggruppava già per `pg` e mostra 7 righe.

## D. Si salva a ogni modifica

L'attesa fra l'ultima modifica e la scrittura è in `regole.json` → `interfaccia.salvataggio.attesa_ms`, portata da 1500 a **400 ms**: unisce i tocchi ravvicinati (+1, +1, +1) in una scrittura sola senza perdere niente. In più, quando la pagina si nasconde o si chiude (`visibilitychange`, `pagehide`, cioè anche il tablet che passa a un'altra app) ciò che è in attesa **si scrive subito**. Spegnere il server non perde più niente: al massimo l'ultimo tocco.

Fuori dalla sessione i personaggi restano intoccabili: preparare nemici, scontri, scene o mappe non scrive nessun file di PG (test). Si cambiano solo con un'azione esplicita: la scheda, «Modifica master» o il pannello PX.

## E. «Apri» e «Modifica master» nell'elenco

Ogni riga dell'elenco dei personaggi (pagina iniziale) ha «Apri» e, **solo sul PC del Direttore e solo con la cartella**, «Modifica master», che apre la scheda in modalità master. Prima bisognava passare dalle mini-schede di uno scontro.

## F. La pulizia: rapporto prima, spostamento dopo

`node tools/pulizia-personaggi.mjs` stampa il rapporto e **non tocca niente**. Con `--sposta`, dopo l'ok, tiene in `personaggi/` il file più recente di ogni personaggio e sposta gli altri in `personaggi/storico/<id>/`: niente viene cancellato, i file che non sono personaggi non si toccano. Il rapporto del 20/10 è nel riepilogo della sessione: 26 file → 7.

## Dove guardare, per le prossime due parti

| Cosa | Dove |
|---|---|
| Identità, versione, storico | `src/storico-personaggi.js`, `server.mjs` → `archivia`, PUT `/api/personaggi/<file>` |
| Un personaggio una volta sola | `src/cartella.js` → `ultimiPerPg` |
| Lista, conflitti, chi vince | `src/cartella.js` → `elencoUnito`, `confronta`, `fileDelPg` |
| Scrittura dalla scheda | `src/ui/app.js` → `persisti`, `programmaCartella`, `scriviInCartella`, `salvaSubitoSeInAttesa` |
| Scrittura dalla plancia e dai PX | `src/ui/tavolo.js`, `src/ui/px-partita.js` |
| Vista dei tablet | `server.mjs` → schede dei PG per la vista giocatori; `src/mappa/tablet.js` |
| Chiave del tavolo da disaccoppiare | `chiaveDaFile` in `src/ui/tavolo.js`, `src/tavolo.js`, `server.mjs` |
| Pulizia | `tools/pulizia-personaggi.mjs` |
| Test | `tests/pipeline-salvataggi.test.js` |

## Seconda parte: il tablet è una vista, non un proprietario (21/10/2026)

### A. Ricognizione: com'era prima di questo lotto

**Come un tablet sapeva quale personaggio mostrare.** Non lo sapeva: non c'era un concetto di «questo tablet». Chiunque apriva l'app con il server vedeva l'elenco di `GET /api/personaggi` (già un file solo per `pg`, parte 1), poteva aprire **qualunque** personaggio, e da quel momento in poi lo editava come se fosse il proprio — niente lo impediva. L'unica cosa che decideva «chi vince» in caso di scrittura concorrente era la data del file (`X-Mutant-Mtime`, già presente, pezzo 6 del Tavolo del Master): un conflitto apriva il riquadro «Il master ha aggiornato» con «Aggiorna» e «Tieni la mia».

**Dove teneva la sua copia.** Nel `localStorage` del browser (`archivio.js`), esattamente come il browser del Direttore: nessuna differenza di ruolo. Aprire un personaggio dalla cartella lo portava lì (`apriDaCartella`), e da quel momento la copia locale veniva trattata come paritaria all'originale: `sincronizzaCartella()` fa vincere «il più recente» fra browser e cartella, con un avviso — per un tablet questo significa che una copia locale rimasta indietro poteva, in teoria, vincere su una più recente scritta altrove, anche se **in pratica non succede mai in silenzio**: il controllo di versione (sotto) rifiuta comunque una scrittura basata su una revisione vecchia.

**Che cosa succedeva con una versione più recente sul server.** Già gestito bene: `scriviCartella` manda la revisione letta (`X-Mutant-Mtime`), il server rifiuta con 409 se è cambiata, e la scheda (ogni 3 secondi, `controllaScheda`) se ne accorge da sola e apre il riquadro del conflitto — **non sovrascrive mai in silenzio**. Era basato sulla data del file (`mtime`), non su `versione_salvataggio` (che pure esiste dalla parte 1); il messaggio non diceva chi avesse scritto né da quanto tempo.

**Quali scritture poteva mandare.** Tutte: `PUT /api/personaggi/<file>` non aveva alcun controllo su CHI stesse scrivendo, solo SE il file che stava per sovrascrivere era quello letto (parte 1) o uno esistente (bug del 04/10). Un tablet poteva scrivere qualunque personaggio della cartella.

### B+C. Il personaggio arriva dal server; ciascuno scrive solo il proprio

- **Identità del dispositivo:** un identificativo generato dal browser stesso (`crypto.randomUUID()`), tenuto nel suo `localStorage` (`src/ui/dispositivo.js`), mandato come intestazione `X-Mutant-Dispositivo` a ogni scrittura (`src/ui/cartella.js` → `scriviCartella`, `creaInCartella`). Non viaggia nel personaggio, non si esporta: un browser svuotato, o un tablet nuovo, sceglie di nuovo.
- **L'abbinamento dispositivo → personaggio** sta in `tavolo/dispositivi.json` (`src/dispositivi.js`, funzioni pure; `server.mjs` → `apiDispositivo` lo legge e scrive): `GET`/`POST /api/dispositivo` per sé stessi (ogni dispositivo, nessun controllo del Direttore: è la scelta del giocatore), `GET /api/dispositivi` e `PUT /api/dispositivi/<id>` solo dal PC del Direttore (per vedere chi è collegato e correggere un abbinamento sbagliato).
- **Il controllo vero è nel server:** `PUT /api/personaggi/<file>` rifiuta (403, `nonAutorizzato: true`) una scrittura che dichiara `X-Mutant-Da: giocatore` con un dispositivo associato a un **altro** personaggio, o non ancora associato a nessuno. **Il PC del Direttore (`req.mutantMaster`) non è mai soggetto al controllo**, qualunque intestazione porti: resta sempre autorizzato, come oggi (Modifica master, PX della partita, «Colpito» dalla plancia). Senza `X-Mutant-Dispositivo` (client di prima, strumenti, `node --test`) il controllo non si applica: migrazione silenziosa, come le altre di questo progetto.
- **Il pannello PX (`px/px.json` → `giocatori[]`) non è stato raddoppiato:** traccia nome del giocatore + file del PG per i Punti Esperienza, un'altra cosa (e un altro problema: il suo `pgFile` è un nome di file, che può restare indietro dopo un livello — non toccato in questo lotto, fuori perimetro). L'abbinamento dispositivo→PG di questa parte usa l'identificativo stabile (`pg`), non un nome di file, proprio per non avere lo stesso problema.
- **La scelta del personaggio** è un pulsante nella riga di stato (sotto), con una finestrella che elenca i personaggi del server (sempre dal server, mai dal browser): «Scegli» quando non ha ancora scelto, «Cambia» da lì in avanti. Non blocca la navigazione: si può guardare la pagina iniziale senza aver scelto, ma non si può scrivere.
- **Non fatto in questo lotto** (deliberatamente, per non allargare il lavoro): riscrivere `sincronizzaCartella()`/`apriDaCartella` per far «vincere sempre il server» invece di «vince il più recente». Non serve per la sicurezza — il controllo di versione (parte E) impedisce comunque a una copia locale vecchia di sovrascrivere una più recente — ma resta un pezzo di codice che tratta concettualmente la copia del browser come paritaria. Se Marcello lo vuole comunque più esplicito, è un intervento piccolo da fare a parte.

### D. La riga di stato

`src/stato-tablet.js` (puro: il testo, l'orologio) + `src/ui/stato-tablet.js` (il DOM, il `fetch`, la finestrella di scelta). Montata una volta fuori da `#app`, come la fascia «Copia di lavoro» (stesso punto d'aggancio): resta visibile cambiando pagina. **Solo per i tablet** (`stato.cartella && !stato.master`): il PC del Direttore ha già la sua fascia e il tasto MUTANT.

- **«collegato · Aiko · aggiornata 21:14»** quando va tutto bene; **«collegato · scegli il tuo personaggio»** se non ha ancora scelto; **«offline da 3 minuti · stai vedendo una copia · non puoi modificare»** quando il server non risponde. Le frasi sono in `regole.json` → `interfaccia.dispositivo` (come il resto dei messaggi di salvataggio), non nel codice.
- **Il controllo gira ogni 15 secondi** (`intervallo_controllo_s`) e **al ritorno in primo piano** (`visibilitychange`): niente da aspettare riaprendo il tablet dopo che è stato in sfondo.
- **Offline, o guardando un personaggio che non è il proprio**, i comandi che modificano si spengono: una classe sul `<body>` (`tablet-sola-lettura`) e una regola CSS larga (`pointer-events: none` su bottoni, campi e select dentro `#app`), non un controllo per ciascuno dei tanti comandi della scheda — l'avrebbe allargato troppo. **È una misura temporanea**: il terzo lotto (offline con il giornale delle operazioni e la schermata di rientro) la sostituirà con qualcosa di più preciso (per esempio lasciare scrivere offline in un giornale locale, e farlo passare al rientro).

### E. Ogni scrittura dichiara la versione che ha visto

Il controllo di versione (409, revisione rifiutata) **esisteva già** dal pezzo 6 del Tavolo del Master (basato su `X-Mutant-Mtime`, la data del file) e funzionava correttamente: non sovrascrive, non fonde, apre un riquadro con la scelta del giocatore. Non l'ho sostituito con `versione_salvataggio`: il meccanismo (confronto di una revisione, 409 se cambiata) è lo stesso, solo la chiave è diversa, e cambiarla avrebbe voluto dire toccare `src/collegamento.js` e i suoi test senza un beneficio pratico — `versione_salvataggio` esiste già nel file per chi la vuole leggere (il registro, lo storico).

Quello che **ho aggiunto**: il messaggio leggibile, con chi e da quanto tempo, come richiesto. `versioneRemota()` (src/ui/app.js) ora legge anche `aggiornato_da` e `aggiornato_il` dal file remoto; `messaggioConflittoVersione()` (src/stato-tablet.js) li trasforma in «"Aiko" è stata modificata da il Direttore un minuto fa. Ricarica e riprova.» — «il Direttore» per `master`, «un altro tuo dispositivo» per `giocatore` (con l'abbinamento di C, un conflitto fra giocatori sullo stesso file può venire solo dallo stesso giocatore da un secondo dispositivo, mai da un estraneo), «il calcolo dei PX» per `px`. Il riquadro esistente (`avvisoMaster` in `src/ui/tab.js`) mostra questo messaggio al posto del precedente «Il master ha aggiornato… alle HH:MM:SS», con «Aggiorna» (= ricarica) e «Tieni la mia» (in più rispetto alla richiesta: prova a salvare comunque, se nel frattempo nessuno ha scritto ancora).

## Terza parte: le code dell'originale (21/10/2026, pomeriggio)

Quattro cose rimaste aperte dai due lotti precedenti, chiuse prima dell'offline e del rientro (altrimenti il giornale delle operazioni avrebbe ereditato il difetto di trattare una copia come l'originale).

### A. Il server vince sempre

`confronta()` (`src/cartella.js`) non guarda più la data per decidere chi vince quando **sia** il browser **sia** la cartella sono cambiati: vince sempre la cartella, anche scartando una modifica del browser più recente ma non ancora scritta (con un avviso che lo dice, invece del vecchio «la copia nella cartella era più recente»). Il browser scrive solo quando la cartella **non** è cambiata: è il salvataggio normale, non un conflitto. L'unica eccezione legittima resta il tablet offline (terzo lotto, non scrive ancora). **Non si è rotto niente**: aprire la scheda senza server continua a funzionare com'era (`confronta()` entra in gioco solo quando risponde `GET /api/personaggi`).

### B. Il riquadro degli abbinamenti, nel Tavolo del Master

«Tablet e personaggi scelti», dentro «Collega i giocatori» (non una tab nuova): elenco dei dispositivi, il personaggio (o «tablet non ancora assegnato»), da quanto tempo si è fatto vivo, una tendina per riassegnare e «Stacca». Per farlo comparire anche un dispositivo che si è collegato ma non ha ancora scelto, `GET /api/dispositivo` ora crea il suo record al primo contatto (`src/dispositivi.js` → `dispositivoVisto`) invece di restare senza traccia finché non sceglie; «Stacca» svuota il personaggio ma non cancella il dispositivo, altrimenti sparirebbe dall'elenco invece di restare correggibile.

### C. Il pannello PX usa l'identificativo, non il nome del file

`giocatori[].pgFile` (nome di file, invecchia) → `pgStabile` (l'identificativo stabile, come altrove): `idStabileDiFile`/`fileDiPgStabile` in `src/cartella.js` (condivise con l'abbinamento dei tablet), `migraGiocatoriAPgStabile` in `src/px-partita.js` per la migrazione silenziosa di quello che c'è già — una sola volta, quando il Tavolo rilegge `px/px.json`. Le righe che non si risolvono (il file non è più nell'elenco) **non si indovinano**: restano come sono, segnalate sia nel riepilogo sia in un avviso dentro «Impostazioni» del pannello PX, per Marcello.

### D. Lo sforamento in Identità

`.griglia-due` (Caratteristiche + Prove Salvezza): stesso `min-width: auto` degli ultimi due lotti, su `.controllo-temporaneo` invece che sulla tabella delle Abilità o `.riquadro-mano`. Lo stesso rimedio: `min-width: 0` sui figli diretti della griglia. La rete di sicurezza del lotto «condizioni attive» (112 combinazioni: 8 tab × 7 larghezze × 2 orientamenti) è stata rigirata con una scheda di prova completa: pulita ovunque, compreso questo punto.

### Dove guardare, per la quarta parte (offline con il giornale delle operazioni e la schermata di rientro)

| Cosa | Dove |
|---|---|
| Identità del dispositivo | `src/ui/dispositivo.js` |
| Abbinamento dispositivo → PG, «si è fatto vivo» | `src/dispositivi.js`, `server.mjs` → `apiDispositivo`, `tavolo/dispositivi.json` |
| Il riquadro del Direttore | `src/ui/collega.js` → `elencoDispositivi`, `src/ui/dispositivi-tavolo.js`, `src/ui/tavolo.js` → `aggiornaDispositivi` |
| Controllo «scrive solo il proprio» | `server.mjs`, `PUT /api/personaggi/<file>` (cerca «il tablet è una vista») |
| «Il server vince sempre» | `src/cartella.js` → `confronta`, `src/ui/app.js` → `sincronizzaCartella` |
| Riga di stato, offline, sola lettura | `src/stato-tablet.js`, `src/ui/stato-tablet.js`, `css/style.css` → `.fascia-stato-tablet`, `.tablet-sola-lettura` |
| Messaggio del conflitto | `src/stato-tablet.js` → `messaggioConflittoVersione`, `src/ui/app.js` → `versioneRemota`, `src/ui/tab.js` → `avvisoMaster` |
| PX con l'identificativo stabile | `src/px-partita.js` → `migraGiocatoriAPgStabile`, `fileDelGiocatore`; `src/cartella.js` → `idStabileDiFile`, `fileDiPgStabile` |
| Test | `tests/dispositivi.test.js`, `tests/dispositivi-server.test.js`, `tests/stato-tablet.test.js`, `tests/collega-dispositivi.test.js`, `tests/px-pg-stabile.test.js`, `tests/sforamento-caratteristiche.test.js`, `tests/cartella.test.js` |

- Decidere che cosa succede se due dispositivi diversi risultano associati allo stesso personaggio (oggi: l'ultimo che sceglie vince, senza avviso all'altro) — non toccato in questo lotto, non richiesto.

## Quarta parte: si può modificare offline, e al rientro Davide approva (21/10/2026, pomeriggio)

Tolta la misura temporanea della terza parte («offline → sola lettura»): un tablet senza connessione **continua a scrivere**, in un giornale locale che si somma a quello che è successo nel frattempo quando torna in linea. **Fatte le parti A, B e C (il motore, la coda, il confronto a tre lato server). Non fatta la parte D** (la schermata di rientro sul PC del Direttore): si è fermato qui per restare dentro il permesso esplicito di Marcello di chiudere a metà, lasciando la schermata al prossimo prompt.

### A. Il giornale delle operazioni

`src/giornale.js` (puro): non registra lo stato finale, registra **operazioni** — ciascuna con un identificativo, un momento, e uno di tre tipi:

- **`somma`** (`delta`): un numero che si aggiunge a quello che c'è, non lo sostituisce. È il tipo di default per ogni valore numerico (PV, PM, PX, crediti, munizioni…): due modifiche indipendenti alla stessa cosa si sommano sempre, senza mai essere un conflitto.
- **`insieme`** (aggiunta/rimozione per identità): il tipo di default per ogni campo che è un elenco (oggetti posseduti, Stati attivi…): aggiungere o togliere un elemento è idempotente (lo stesso elemento tolto due volte resta tolto) e due dispositivi che toccano elementi diversi dello stesso elenco non si scontrano mai.
- **`assegna`** (`nuovo`, con `visto`, il valore con cui il tablet era partito): per tutto il resto — un testo, una nota, una scelta — che non ha senso sommare. Qui, e solo qui, un conflitto è possibile: se il server ha un valore diverso da quello che il tablet aveva visto, vince la domanda, non l'automatismo.

**La classificazione era per tipo** (`tipoCampo` in `src/giornale.js`): un numero era sempre `somma`, un array sempre `insieme`, il resto `assegna`, con due sole eccezioni dichiarate (`sessione.round`, `scelte.puntiEsperienza`). Il ragionamento era che un elenco di campi invecchia mentre una regola per tipo si applica da sola anche ai campi di domani. **Era sbagliata nella direzione pericolosa, ed è stata rovesciata il 22/10** (quinta parte, sotto): le eccezioni non erano due, e sommare un numero che non è un contatore produce una Caratteristica falsa che nessuno nota.

`operazioniDaDiff(prima, dopo)` genera le operazioni confrontando due stati (il modo in cui il client costruisce il giornale: non si scrive a mano un'operazione per ogni pulsante, si confronta lo stato prima e dopo il tocco). `applicaOperazione` le rimette sopra uno stato. `unisciGiornale(serverAttuale, operazioni, applicate)` è il confronto a tre: applica sempre `somma` e `insieme`, applica `assegna` solo se il valore attuale del server coincide con quello che l'operazione aveva visto (altrimenti va in `conflitti`), e non riapplica un'operazione il cui identificativo è già in `applicate` (idempotenza: ripresentare lo stesso giornale dopo un errore di rete non duplica nulla).

### B. Si modifica offline, e si vede che si sta modificando offline

`src/ui/coda-offline.js`: ogni personaggio ha una coda nel `localStorage` di questo dispositivo (`leggiCoda`/`accoda`/`togliDallaCoda`), con un'etichetta leggibile per operazione («−5 PV», «+1 Pergamena di Cura Ferite», «Stato Sanguinamento acceso»). `leggiBase`/`fissaBase` tengono la «base» nota — l'ultimo stato visto dal server — per costruire il diff solo di quello che è cambiato da lì: fissata dopo ogni scrittura riuscita, dopo ogni ricaricamento dal server (`ricaricaDaCartella`) e alla primissima apertura di un personaggio (`src/ui/app.js` → `daIndirizzo`), altrimenti la primissima modifica offline confronterebbe con il vuoto e la coda sarebbe un diluvio di operazioni finte.

`src/stato-tablet.js` non spegne più i comandi offline (`modificabile` è sempre `true`): la fascia di stato dice «offline da {tempo} · {N} modifiche in attesa · le vedrà il Direttore quando torni collegato», o, a coda vuota, «offline da {tempo} · puoi continuare a modificare». «Vedi la coda (N)» (`src/ui/stato-tablet.js`) apre un pannello con le righe in attesa e una ✕ per toglierne una prima che arrivi al Direttore (il tocco sbagliato). **L'unico motivo di sola lettura rimasto** è guardare un personaggio che non è il proprio, online o offline — mai l'essere offline in sé.

### C. Il rientro: il confronto a tre

Quando il tablet torna in linea (`aggiorna()` in `src/ui/stato-tablet.js` nota la transizione offline→online), manda subito la coda a `POST /api/personaggi/<file>/giornale` (`inviaGiornale` in `src/ui/cartella.js`). Il server (`server.mjs` → `apiGiornale`) applica lo stesso controllo «scrive solo il proprio» di `PUT`, chiama `unisciGiornale`, scrive il file solo se qualcosa è stato applicato, e **mette da parte i conflitti veri** in `tavolo/rientro.json` (per pgId: `applicate`, l'elenco idempotente, capato a 2000; `inSospeso`, i conflitti in attesa della schermata di rientro). Risponde `{ applicati, conflitti }`: il tablet toglie dalla sua coda solo quello che il server ha confermato, mostra un avviso («N modifiche viste dal Direttore» / «N in attesa: il Direttore deve scegliere»), e **le operazioni in conflitto restano nella coda del tablet** finché Davide non risponde (la parte D, non fatta).

### D. La schermata di rientro — rimandata alla quinta parte

`tavolo/rientro.json` esisteva già e si riempiva, ma non c'era ancora una pagina che lo mostrasse. Il lotto si è fermato qui, con il permesso esplicito di Marcello («se diventa lungo, fermati dopo il giornale e la coda»).

## Quinta parte: la classificazione dei campi e la schermata di rientro (22/10/2026)

La chiusura della pipeline. Due cose, in quest'ordine perché la prima è quella che fa danno in silenzio.

### A. Rovesciato il default della classificazione

Il problema, nelle parole di Marcello: «FOR, il livello, i PV massimi, la COS, un VA, una capacità, le ore di meditazione già fatte: sono numeri, ma non sono contatori. Portare FOR da 10 a 12 offline non è «+2» da sommare a quello che ha fatto Davide: è una sostituzione. Se entrambi toccano quel valore e l'app li somma, esce un numero che nessuno dei due ha mai scritto, e non se ne accorge nessuno, perché la scheda resta plausibile.»

Quindi: **si somma solo ciò che è dichiarato contatore; tutto il resto assegna.** Due registri in `src/giornale.js`, che sono anche la documentazione:

- `CONTATORI` — 13 percorsi (modelli con `*` per le chiavi dinamiche): `sessione.pvAttuali`, `pmAttuali`, `puntiEroe`, `distintivi`, `crediti`, `munizioni.*.colpi`, `munizioni.*.riserve`, `munizioni.*.vuoti`, `scorte.*`, `chroma.*.pmAttuali`, `integrita.*`, `nec.*`, `impianti.cartucce.*`. Ciascuno è un valore che cambia «di quanto», non «a quanto».
- `ASSEGNA_DICHIARATI` — i numeri su cui si è *deciso* che non sono contatori, con il motivo accanto: gradini e indici (`ferite`, `affaticamento`, `corruzione`, `intensitaStati.*`), valori scritti interi (`caricoExtra`, `creditiIniziali`, `chroma.*.iniziale`, `scelte.puntiEsperienza`), riferimenti temporali (`round`, `ultimaTecnica.round`, i quattro di `morente`, i due di `attivazioniArmi.*`), i due elenchi di numeri uguali fra loro (`carichini.*`, `munizioni.*.parziali`: due carichini da 3 colpi sono due cose, un insieme li fonderebbe), la memoria dei pannelli (`attacchi.**`, `lanci.**`) e le scelte del personaggio (`puntiCaratteristica.*`, `puntiAbilitaLiberi.*`, `puntiEroe.valore`, `dotazione.**`).

Il comportamento sarebbe lo stesso anche senza il secondo registro — il default copre tutto — ma senza non si saprebbe che qualcuno ci ha pensato, e soprattutto `campiNonClassificati()` non avrebbe niente con cui confrontare: `tests/giornale-campi.test.js` fallisce finché un campo numerico non è in uno dei due, sui personaggi d'esempio **e** su una sessione con tutti i blocchi facoltativi pieni. Il controllo ha trovato subito un campo che era sfuggito (`sessione.chroma.*.iniziale`).

**Azione nuova `aggiorna`**: un elemento cambiato *dentro* un elenco (una nota del calendario riscritta, la quantità di un oggetto, i PI di un veicolo) prima spariva in silenzio — l'identità c'è prima e dopo, quindi non era né un'aggiunta né una rimozione. Ora è un'assegnazione sull'elemento, e va in conflitto se anche il Direttore ha toccato lo stesso elemento: è il caso della nota del calendario dell'esempio.

### B. La schermata di rientro, e «niente si applica prima della conferma»

Il modello è cambiato: fino al 21/10 le variazioni si applicavano da sole al rientro e solo i conflitti restavano da parte. Adesso **tutto quello che arriva da un tablet offline va in attesa** (`src/rientro.js`, `tavolo/rientro.json`) e il file non cambia di un punto finché Davide non risponde — è quello che dice il nome della cosa, ed è l'unica lettura che rende sensato «chiudere non è scartare».

La schermata (`src/ui/rientro.js`) è descritta nella prima parte di questo documento. Due conseguenze meno ovvie, che sono costate i due difetti trovati nella prova a mano:

1. la coda del tablet e la riga di stato devono usare la **stessa chiave** (l'identificativo stabile `pg`, non quello della voce del browser): con due chiavi diverse la coda si riempiva da una parte e si leggeva dall'altra, cioè non sarebbe partita mai;
2. **un tablet con righe in attesa non scrive il file nemmeno da collegato.** Al rientro la scrittura normale riprendeva e mandava tutto lo stato locale con un `PUT`, scavalcando l'approvazione; e le modifiche fatte dopo avrebbero superato in fila quelle ancora in attesa. Ora si accoda finché la coda non è vuota, e quando il Direttore ha risposto la scheda si riallinea a quello che ha deciso (senza, una modifica scartata sarebbe rimasta sullo schermo del giocatore e sarebbe tornata nel file alla prima scrittura).

Entrambi hanno un test che li ferma (`tests/rientro-tablet.test.js`).

### Che cosa è stato provato davvero

- **Automatico:** `npm test`, 2258 prove verdi, validatore e `verifica_frasi.mjs` verdi. Fra queste: la classificazione campo per campo (`giornale-campi`), FOR cambiata da tutt'e due che diventa un conflitto e i PV che invece si sommano, la nota del calendario riscritta da tutt'e due, il deposito e le decisioni (`rientro`), il giro completo lato server con due server veri «Direttore» e «tablet» (`giornale-server`: niente si applica prima della conferma, approvazione parziale, chiusura senza rispondere, doppia approvazione, 403 per i tablet).
- **A mano, nel browser:** due server veri sulla stessa cartella di prova (uno con `eMaster` forzato a `false`: sullo stesso PC qualunque browser su `localhost` è riconosciuto come il PC del Direttore, quindi una seconda finestra non basta). Giro completo: tablet collegato che scrive normalmente → server spento → fascia «offline da pochi secondi · 4 modifiche in attesa», comandi ancora attivi → quattro modifiche (−5 PV, −5 PM, +1 Distintivo, le note) → il Direttore riscrive le note dal suo PC → server riacceso → il file **non** cambia e la schermata si apre da sola sul PC del Direttore con le quattro righe in ordine di ora e il conflitto con le due versioni → approvate due, scartata una, conflitto risolto a favore del server → il file diventa PV 19, PM 16 (scartata), Distintivi 1, note del Direttore → il tablet svuota la coda e la sua scheda mostra esattamente quei valori. Sforamenti: schermata e pannello della coda misurati a 360, 480, 600, 768, 820, 912 e 1100 px, nessun elemento fuori dalla finestra.
- **Non provato:** l'avviso che il tablet mostra al giocatore («Il Direttore ha approvato: …») è stato visto solo per i suoi effetti (la coda si svuota, la scheda si riallinea): il messaggio era già scaduto quando l'ho guardato. Da vedere con un tablet vero.
