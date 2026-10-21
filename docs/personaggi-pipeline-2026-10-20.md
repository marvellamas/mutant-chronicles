# I personaggi dopo il lotto «un originale solo» (20/10/2026)

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

### Resta per la terza parte (offline con il giornale delle operazioni e la schermata di rientro)

- Sostituire il gate largo «tablet-sola-lettura» con qualcosa che permetta di scrivere offline in un giornale locale, e lo applichi al rientro con una conferma (non più solo lettura finché non si torna online).
- Decidere che cosa succede se due dispositivi diversi risultano associati allo stesso personaggio (oggi: l'ultimo che sceglie vince, senza avviso all'altro).
- Lo sforamento trovato dalla rete di sicurezza del lotto «condizioni attive» nella tabella delle Caratteristiche di «Modifica master» a 820–912 px (stesso «min-width: auto» del resto, mai sistemato perché fuori da quel lotto): va bene affrontarlo insieme, dato che tocca lo stesso genere di difetto.

### Dove guardare, per la terza parte

| Cosa | Dove |
|---|---|
| Identità del dispositivo | `src/ui/dispositivo.js` |
| Abbinamento dispositivo → PG | `src/dispositivi.js`, `server.mjs` → `apiDispositivo`, `tavolo/dispositivi.json` |
| Controllo «scrive solo il proprio» | `server.mjs`, `PUT /api/personaggi/<file>` (cerca «il tablet è una vista») |
| Riga di stato, offline, sola lettura | `src/stato-tablet.js`, `src/ui/stato-tablet.js`, `css/style.css` → `.fascia-stato-tablet`, `.tablet-sola-lettura` |
| Messaggio del conflitto | `src/stato-tablet.js` → `messaggioConflittoVersione`, `src/ui/app.js` → `versioneRemota`, `src/ui/tab.js` → `avvisoMaster` |
| Test | `tests/dispositivi.test.js`, `tests/dispositivi-server.test.js`, `tests/stato-tablet.test.js` |
