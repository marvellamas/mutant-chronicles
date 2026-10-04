# Tavolo del Master: piano di fattibilità

Branch `tavolo-direttore`, 1° ottobre 2026; **unito in `main` il 2 ottobre 2026** (decisione di Marcello, prima della sessione di prova: il pezzo 7 si fa su `main`). Piano di fattibilità; sono fatti il pezzo 1 (plancia dei PG in sola lettura), il pezzo 2 (scontro e Iniziativa), il pezzo 3 (nemici), il pezzo 4 (danno applicato), il pezzo 5 (attacchi dei nemici) e il pezzo 6 (giocatori collegati), più gli esempi del 2 ottobre e i nemici secondo le risposte di Davide ad A.73 (lotto 8). Resta il pezzo 7.

La visione di partenza è in `docs/backlog.md`, voce 14, su `main`. Al tavolo molti giocatori usano la scheda di carta. Il master tiene lo stato della scena su una plancia con PG e nemici:

- ordine di Iniziativa;
- PV, PM e Stati con indicatori;
- danno applicato con il calcolo dell'app (Difesa → AR per applicazione → PV → Ferite: non ci sono locativi);
- attacchi dei nemici, con il dado tirato dal vivo o dal sistema.

Il server gira sul PC di Davide o di Marcello. Gli altri si collegano con l'indirizzo IP, sulla stessa rete.

Regole del branch:
- `main` non si tocca.
- I dati di gioco (`data/*`) non si modificano qui. Se un pezzo li richiede (per esempio un bestiario), si fa su `main` e si porta dentro con un merge.

## Regole di lavoro (Marcello, 1° ottobre 2026)

1. **Mai nelle cartelle reali.** Non si scrive mai in `personaggi/`, `tavolo/`, `scontri/` e `nemici/` nella radice del repo, e non si usa la porta 3000: è il server acceso di Marcello.
   - Per ogni prova si usa un server su un'altra porta, con `--cartella=`, `--tavolo=`, `--scontri=`, `--nemici=` (e le opzioni future) puntate a cartelle temporanee fuori dal repo, cancellate a fine prova.
   - Se una prova richiede i file di Marcello, ci si ferma e si chiede.
   - Il cambio di branch tocca i LEGGIMI: `personaggi/LEGGIMI.txt`, `scontri/LEGGIMI.txt` e `nemici/LEGGIMI.txt` sono tracciati solo su questo branch. Passando a `main` git li toglie, tornando li rimette (stesso contenuto, data nuova). Gli altri file di quelle cartelle non sono tracciati e git non li tocca. Da sapere quando si confrontano le date delle cartelle prima e dopo una prova.
2. **Nome.** «Tavolo del Master», non «del Direttore», ovunque sia visibile all'utente: pulsante, titoli, avvisi, docs. Il nome del branch e dei file di codice resta com'è.
3. **Dati di gioco su `main`** (Marcello, 2 ottobre 2026). Se un pezzo del tavolo ha bisogno di dati di gioco nuovi (`data/*`), si fanno prima su main e si portano nel branch con un merge.
   - Il 2 ottobre sono passati su `main` `regole.json` → `prova` (pezzo 5) e → `danno_applicato` (pezzo 4), con `src/prova.js` e i controlli delle frasi. Da allora `data/` è uguale nei due branch.

## Deciso (Marcello, 1° ottobre 2026)

1. **Server.** Deve funzionare allo stesso modo sul PC di Davide (con `--rete`, Marcello collegato dal portatile via IP) o su quello di Marcello: nessuna dipendenza dalla macchina.
2. **Giocatori.** Per lo più su carta. La plancia è del master, che importa le schede e tiene lui lo stato. I giocatori collegati con l'app sono un di più (pezzo 6), non il caso base.
3. **Locativi.** Non esistono nel regolamento attuale (tolti da Davide). «Danno applicato» = Difesa → AR per applicazione → PV → Ferite, come nel Giocatore 0.45 (§5.13–5.15).
4. **Bestiario.**
   - Il formato di un nemico (campi, validatore) è una regola di gioco: andrà in `data/` su `main`, proposto da noi con `TODO(Davide)` finché Davide non scrive un bestiario.
   - I nemici di una campagna sono dati del master in `nemici/`, fuori da git come `personaggi/`.
5. **Dadi dei nemici.** Entrambi i modi, come in tutta l'app: tiro dal vivo con override, oppure tiro dell'app.
6. **Vista giocatori su schermo.** Non ora; si rivaluta dopo il pezzo 2.

**Da portare nel backlog su `main`** (qui `docs/backlog.md` non si tocca): l'icona del Tavolo del Master la fornirà Davide. Per ora il pulsante e la plancia usano l'icona della pagina Combattimento.

## 1. Che cosa c'è già (pezzo 0a, fatto)

**`server.mjs`.** È un server Node senza dipendenze.
- Serve l'app come `npx serve`, con gli stessi header di `serve.json`.
- Espone `/api/ping` e `/api/personaggi` (elenco, lettura, scrittura) sulla cartella `personaggi/`.
- I file hanno il nome e il contenuto dell'export («Nome_livN_AAAA-MM-GG.json», byte per byte).
- Non cancella mai nulla e scrive in modo atomico.
- Ascoltava solo su localhost (con `--rete` si apriva alla rete locale). Dal 3 ottobre 2026 ascolta su tutte le interfacce: vedi «Collegare i giocatori».
- Si avvia con `avvia-server.bat`.

**L'app** rileva il server con `/api/ping`.
- Se il server c'è, ogni salvataggio nel browser scrive anche il file in `personaggi/`.
- La pagina iniziale unisce browser e cartella, segnando l'origine di ogni personaggio. Se le due copie differiscono vince la più recente, con un avviso (`src/cartella.js`).
- Senza server l'app resta com'era: localStorage, export e import.

Questa è la base della plancia. I personaggi dei giocatori sono già file leggibili dal PC del master, se i giocatori aprono l'app servita da quel PC.

## 2. Architettura minima

```
PC del master (server.mjs --rete)
├── personaggi/            PG: file dell'export, scritti dalle schede dei giocatori o dal master
├── scontri/               uno stato di scontro per file (nuovo)
│   └── <id>.json          { versione, nome, round, turno, partecipanti: [...], registro: [...] }
├── nemici/                bestiario della campagna (nuovo, dati del master: vedi §3)
└── app                    index.html + #/tavolo (plancia), stesso codice dell'app
```

**La plancia** è una nuova rotta dell'app, `#/tavolo`, non un programma a parte.
- Riusa `calcolaScheda`, le condizioni, la provenienza e le utility.
- Legge e scrive solo tramite il server.
- Senza server, il pulsante della plancia non compare.

**Lo stato di scontro** sta in `scontri/<id>.json`. Contiene:
- l'elenco dei partecipanti, ciascuno con il riferimento a un PG (file in `personaggi/`) o a un nemico del bestiario con un'etichetta («Non Morto 2»);
- il valore di Iniziativa con il d10 tirato;
- i valori attuali dei nemici: PV, Stati, Ferite;
- il registro degli eventi («Round 2: Dex colpisce Non Morto 1, 7 danni, AR 2 → 5 PV»).

**I valori attuali dei PG** restano nella sessione del loro file: è la stessa `sessione` della scheda digitale.
- Quando il master cambia i PV di un PG, la plancia riscrive il file del PG.
- La scheda del giocatore se ne accorge al prossimo controllo, con la regola già fatta: vince il più recente, con un avviso.
- Per evitare scritture incrociate serve una scrittura con versione (§5, R1).

**Aggiornamento:** polling ogni 2–3 secondi su `GET /api/scontri/<id>` e sull'elenco dei personaggi, con l'`mtime` per non rileggere i file invariati. Niente WebSocket nella prima versione: sono zero dipendenze, sulla stessa rete bastano.

**API nuove**, sullo stesso schema di quelle dei personaggi:
- `GET/PUT /api/scontri/<id>`, con un controllo di versione che rifiuta una scrittura su una versione vecchia (fatto con un contatore `revisione`, pezzo 2);
- `GET /api/scontri`;
- `GET /api/nemici` e `PUT /api/nemici/<id>` (pezzo 3).

## 3. Che cosa serve dai dati e oggi manca

1. **Bestiario dei nemici.** Oggi non esiste: i manuali non hanno ancora un capitolo dei nemici.
   - Fatto: il formato è `data/formato_nemici.json` su `main` (1° ottobre 2026, per-davide A.73), con il validatore `validaNemico` in `src/validate.js` e un nemico d'esempio in `tests/nemici/`. La proposta di partenza era questa:
     ```json
     { "id": "legionario-non-morto", "nome": "Legionario Non Morto", "fonte": "master",
       "pv": 22, "ar": { "totale": 3, "magica": 0 }, "difese": 9, "salvezze": { "tempra": 12, "riflessi": 8, "volonta": 14, "magia": 10 },
       "iniziativa": 1, "movimento": { "passo": 6 },
       "attacchi": [ { "nome": "Spada da cerimonia", "va": 11, "danno": "1d8+2", "tipo": "ravvicinato", "portata_q": 1, "proprieta": [] } ],
       "note": "Immune alla Paura." }
     ```
   - Sono numeri «già fatti», come li scrive il master: non serve ricostruire un nemico con Caratteristiche e Classi.
   - Le armi possono puntare al catalogo (`"rif": "armi:spada-lunga"`), e allora il danno viene dalla scheda dell'arma.
   - **Chi lo inserisce:** il master, con un piccolo editor nella plancia (pezzo 3) o copiando file JSON. Davide decide se alcuni nemici diventano «ufficiali» (allora su `main`, in `data/`, con il validatore).
2. **Valori dei nemici al tavolo:** PV attuali, Stati, Ferite, Sanguinamento. Fatto: PV attuali e massimi, Ferite, Menomazioni, PM e Stati stanno nel partecipante dello scontro (A.73, decisione 7; sezione «Nemici secondo A.73»).
3. **Iniziativa:** la regola c'è (Giocatore §2.14: «Mod DES + Mod INT; in combattimento si aggiunge 1d10»; parità nel §5.1, «Parità di Iniziativa»). Va solo applicata: valore della scheda o del nemico + d10 dal vivo o dell'app, ordine e spareggi.
4. **Danno ricevuto:** la sequenza c'è (Giocatore §5.13–5.15).
   - Si applicano Difesa e Armatura, separatamente per ogni applicazione (AC), poi PV, PS Tempra per le Ferite e Sanguinamento.
   - Oggi l'app la mostra solo come testo: manca la funzione pura «applica un colpo» che parta dal danno tirato e restituisca la nuova sessione e il registro.
   - **Niente locativi** (deciso, punto 3): le AC «non assegnano locativi» e l'Armatura «non viene suddivisa per parti anatomiche» (Giocatore 0.45, §5.10 e §5.13). Il danno applicato è Difesa → AR per applicazione → PV → Ferite.

## 4. Che cosa si riusa dell'app di oggi

- **Valori dei PG:** `calcolaScheda` e `applicaCondizioni` (`src/condizioni.js`) danno VA, Difese, AR, Salvezze, Iniziativa e Movimento effettivi, con la provenienza.
- **Sessione:** `massimiSessione`, `variaSessione`, Ferite e Stati di `src/sessione.js`, per i PG senza cambiamenti e per i nemici con massimi propri.
- **AR:** `calcolaAR` (`src/protezione.js`), con le protezioni rotte e accese.
- **«Attacca!» lato master:** `calcolaAttaccoDistanza` e `calcolaAttaccoRavvicinato` (`src/attacco.js`) sono funzioni pure con un «personaggio» `{ scheda, sessione }`.
  - Per un PG si usano così come sono.
  - Per un nemico serve un adattatore: una «scheda minima», cioè un'arma con VA e danno e una sessione. Il pannello a passi (`src/ui/pannello-passi.js`) si riusa.
- **«Lancia!»:** per i PG Taumaturghi, così com'è.
- **Tooltip della provenienza** (`src/provenienza.js`, `listaProvenienza`): ogni numero della plancia si spiega come nella scheda digitale.
- **Tiri:** `src/tiri.js` ha già il tiro «dall'app» o «dal vivo» con l'origine. Serve per il d10 dell'Iniziativa e per i dadi del danno dei nemici.

## 5. Pezzi di implementazione, in ordine

Ogni pezzo ha test sulle funzioni pure e una prova nel browser; i primi due non toccano `data/`.

1. ✔ **Pezzo 1 — Plancia in sola lettura dei PG** (fatto il 1° ottobre 2026). Rotta `#/tavolo`, solo con il server: una carta per PG da `personaggi/`.
   - **Ingresso.** Pulsante «Tavolo del Master» nella pagina iniziale, solo se `/api/ping` risponde. Dalla plancia, «Personaggi» torna indietro. Senza server, `#/tavolo` porta alla pagina iniziale con l'avviso «serve avvia-server.bat».
   - **Chi è al tavolo.** Il master spunta i personaggi della cartella. La selezione è salvata sul server in `tavolo/sessione.json` (`GET/PUT /api/tavolo`, fuori da git); per ognuno conta il file più recente.
   - **Carta del PG** (`src/tavolo.js` → `vistaPlancia`, `src/ui/tavolo.js`):
     - nome, ritratto, Corporazione, Classi e livello;
     - barre di PV (rosso), PM (blu, se ne ha) e Punti Eroe (verde);
     - AR (con contro Etereo) e Difese;
     - Ferita, Affaticamento e Corruzione col grado attivo, Stati come pillole;
     - armi in mano con VA e danno.
   - **Valori.** Vengono tutti da `calcolaScheda` con la sessione del file, come nella scheda digitale, con la provenienza nel tooltip. Nessun calcolo duplicato.
   - **Aggiornamento.** Ogni 3 secondi la plancia rilegge l'elenco della cartella e solo i file cambiati (mtime); l'indicatore dice «aggiornato N s fa». Il clic sul nome apre il personaggio nell'app, dove si fanno le modifiche.
   - **Server.** `--cartella=…` e `--tavolo=…` permettono di usare altre cartelle, per le prove o per più campagne.
   - **Test.** `tests/tavolo.test.js`: stessi valori di `calcolaScheda` per b, c, Lucas e d; selezione salvata e riletta; senza server niente plancia.
2. ✔ **Pezzo 2 — Scontro e Iniziativa** (fatto il 1° ottobre 2026). Riquadro «Scontro» in cima alla plancia; motore puro in `src/scontro.js`, interfaccia in `src/ui/scontro.js`.
   - **Server.** `scontri/<id>.json`, uno per scontro (fuori da git, tranne `scontri/LEGGIMI.txt`); `--scontri=…` per un'altra cartella. `GET /api/scontri` elenca gli aperti, `GET/PUT /api/scontri/<id>` legge e salva.
   - **Revisione.** Ogni file ha un contatore `revisione`: il `PUT` passa quella letta, il server la confronta con quella del file e salva con +1. Se non coincide risponde 409 con lo scontro attuale: la plancia lo ricarica e avvisa «cambiato in un'altra finestra, ripeti l'ultima azione».
   - **Nuovo scontro.** Parte con i PG al tavolo. Valore di Iniziativa = quello effettivo di `calcolaScheda` (Giocatore §2.14, con la provenienza nel tooltip), più 1d10 (`regole.json` → `iniziativa.dado_in_combattimento`): dal vivo (casella) o «Tira» dell'app, anche «Tira per tutti».
   - **Ordine e parità** (Giocatore §5.1). Totale più alto prima. A pari totale: Destrezza più alta, poi Intelligenza più alta. Se restano pari due alleati, scelgono loro (↑ ↓, ordine salvato). Se c'è di mezzo un avversario, spareggio con lo stesso dado, ritirato finché resta pari; lo spareggio non cambia il valore.
   - **Turni e Round.** La riga di turno e la carta del PG sono evidenziate. «Avanti» passa al successivo; dopo l'ultimo comincia il Round dopo. Le durate degli Stati in Round («1+1d3 Round») si tirano o si scrivono nel riquadro e scalano a ogni Round. Quando finiscono, il registro dice di togliere lo Stato dalla scheda. Le altre durate («fino a quando…») sono solo un promemoria.
   - **Partecipanti a mano.** «Aggiungi partecipante»: nome, Iniziativa, lato, DES e INT facoltative. Segnato «provvisorio» finché non ci sono i nemici (pezzo 3); si può togliere.
   - **Registro.** Una riga per evento, con ora e Round (creazione, tiri, spareggi, scelte d'ordine, partecipanti, durate, turni, Round, chiusura). Si apre e si chiude; il più recente in alto.
   - **Fine scontro.** Lo stato passa a «chiuso» e il file va in `scontri/archivio/<id>.json`. Non si cancella nulla.
   - **Test.** `tests/scontro.test.js`: dado e durate dai dati; ordine con parità (DES, INT, alleati, spareggio ritirato); partecipante a mano; Round e durate; 409 su revisione vecchia; archivio.
   - **Prova nel browser.** Server sulla porta 3001 con cartelle temporanee: tre PG di collaudo, un partecipante a mano, tre Round giocati da due finestre, una scrittura vecchia rifiutata con l'avviso, chiusura con archivio.
   - **Scostamenti dal piano.**
     - Contatore `revisione` nel corpo invece di `If-Match` (più semplice da leggere e da provare).
     - L'Iniziativa dei PG è fotografata alla creazione dello scontro: Stati presi dopo non la cambiano.
     - Le durate degli Stati stanno nello scontro, non nella scheda del PG; la plancia non tocca i file dei PG fino al pezzo 6.
3. ✔ **Pezzo 3 — Nemici** (fatto il 1° ottobre 2026). Il formato su `main`, il resto sul branch.
   - **Formato** (su `main`, portato qui con un merge). `data/formato_nemici.json` descrive i campi di un file nemico con un piccolo schema: tipo, obbligatorio, minimi, valori ammessi presi dagli altri dati (Stati, Salvezze, modalità di fuoco, nature del danno del §5.24), campi richiesti o ammessi secondo il tipo di attacco. `validaFormatoNemici` controlla il file all'avvio, `validaNemico` un file nemico. I punti che il Giocatore 0.45 non definisce sono `TODO(Davide)` con la scelta dichiarata (per-davide A.73).
     - Campi: formato, versione, id, nome, fonte; Caratteristiche facoltative (DES e INT per la parità); PV; PM; AR totale e magica; Difese; Iniziativa; Movimento (Passo; Corsa e Scatto facoltativi); quattro Salvezze; attacchi (nome, tipo ravvicinato o distanza, VA, danno, natura, proprietà, portata o gittata, modalità, AC, riferimento al catalogo, note); Stati iniziali; immunità agli Stati; incantesimi come promemoria; note.
   - **Bestiario.** `nemici/<id>.json`, un file per tipo, fuori da git tranne `nemici/LEGGIMI.txt`; `--nemici=…` per un'altra cartella. `GET /api/nemici` elenca i file (un JSON rotto con l'errore), `PUT /api/nemici/<id>` salva solo un tipo valido: il server carica i dati delle regole e usa lo stesso `validaNemico`. La plancia rivalida l'elenco quando cambia un file (`src/nemici.js` → `vociBestiario`): un file non valido è segnalato con gli errori e resta fuori dagli scontri, senza fermare la plancia.
   - **Editor.** Riquadro «Bestiario» in fondo alla plancia: «Nuovo tipo» e «Modifica» aprono una finestra con un modulo generato dal formato (`src/ui/nemici.js`). Un campo nuovo nel formato compare da sé. L'identificativo si propone dal nome; «Salva in nemici/» pulisce i campi vuoti, valida e mostra gli errori accanto ai campi. Il file si scrive con le chiavi nell'ordine del formato.
   - **Nello scontro.** «Aggiungi nemici»: tipo, quanti, lato. Le copie si chiamano «Nome 1», «Nome 2»…: la numerazione continua dopo quelle già usate, anche se tolte, così nel registro un'etichetta è sempre lo stesso nemico. Ogni copia porta una fotografia del tipo, i propri PV e i propri Stati. Iniziativa = valore del tipo + d10 (dal vivo o dell'app), con le parità del pezzo 2: DES e INT dalle Caratteristiche del tipo; se mancano, spareggio col dado contro un avversario. I partecipanti scritti a mano restano («Aggiungi partecipante a mano»).
   - **Carta del nemico.** Bordo col colore del lato (`--lato-avversario`, `--lato-alleato`, docs/palette.md), PV con − e +, AR e contro Etereo, Difese, Iniziativa, Salvezze, Movimento, Stati (aggiungi da un elenco senza quelli a cui è immune, togli con ×), attacchi, incantesimi e note. Più clic di fila su − o + fanno una sola riga di registro («PV 15 → 11 (−4)»). Le durate degli Stati in Round valgono anche per i nemici; alla fine lo Stato di un nemico si toglie da sé.
   - **Test.** `tests/nemici.test.js` (su `main`): formato valido e rotto, nemico valido, campi mancanti, valori non ammessi. `tests/nemici-scontro.test.js`: copie con etichette e PV indipendenti, registro dei PV, Iniziativa con le parità (DES, spareggio fra copie, tipo senza Caratteristiche, alleato), Stati e immunità, bestiario con file rotti, editor (bozza, pulizia), server.
   - **Prova nel browser.** Server sulla porta 3001 con cartelle temporanee: un tipo creato dall'editor (prima salvato vuoto, per vedere gli errori), poi modificato; un file rotto segnalato; tre copie con due PG di collaudo; parità PG-nemico risolta per Destrezza e spareggio fra copie con un pari da ritirare; due Round con PV a mano, uno Stato con durata e due finestre che si aggiornano a vicenda.
   - **Scostamenti dal piano.**
     - Il formato è uno schema nei dati, non solo un elenco di campi: validatore ed editor lo leggono.
     - Niente `rif` che prende il danno dal catalogo: il riferimento all'arma è solo informativo, i numeri restano quelli scritti (numeri già fatti).
     - Ferite e Affaticamento dei nemici non ci sono ancora (TODO(Davide) A.73): solo PV e Stati.
     - Il salvataggio di un tipo non ha revisione: due finestre che modificano lo stesso tipo, vince l'ultima (caso raro, a differenza dello scontro).
     - Le modifiche dello scontro dalla stessa finestra si mettono in fila, così i clic rapidi su − e + non vanno in conflitto fra loro.
   - **Esempi** (2 ottobre 2026). `esempi/` è tracciata in git: quattro PG inventati, scritti da `tools/genera_esempi.mjs` con il motore dell'app e controllati (validatore, checklist del §2.17, livelli, nessun avviso dell'equipaggiamento):
     - Rhea Valdis, Capitol, Artigliere, 5° livello: a distanza;
     - Torvald Krane, Bauhaus, Assaltatore, 6° livello: corpo a corpo, scudo, armatura;
     - Fratello Anselmo Viri, Fratellanza, Custode, 3° livello: due batterie e il Bordone Templare;
     - Nadia Ferro, Cybertronic, Tecnico, 4° livello: tre impianti e un chip.
     In `esempi/nemici/` due tipi: Predone delle Lande (debole, da gruppo) e Legionario Oscuro (forte). Nella plancia «Carica esempi» (`POST /api/esempi`) li copia in `personaggi/` e `nemici/` del server attivo, senza mai sovrascrivere (`COPYFILE_EXCL`): i file già presenti sono «saltati» e segnalati. I test del tavolo usano gli esempi al posto dei personaggi di collaudo.
4. ✔ **Pezzo 4 — Danno applicato** (fatto il 2 ottobre 2026), con la decisione 3 (niente locativi).
   - **Regole nei dati.** `regole.json` → `danno_applicato` (Giocatore §5.10, §5.13, §5.14, §5.24): effetto delle Difese su ogni applicazione (Parata dimezza per eccesso, Parata Magistrale e Schivata evitano), AR per natura (Etereo: solo la componente magica), valore «contro ravvicinato» se il bersaglio lo ha, Perforante e Laser, effetti delle proprietà, tabella delle nuove Ferite per fascia ed esito della Tempra; frasi verificate da `tools/verifica_frasi.mjs`.
   - **`applicaColpo`** (`src/danno.js`, funzione pura). Per ogni applicazione (AC): Difesa → AR applicabile (con la provenienza) → PV, mai sotto 0. Il danno oltre lo 0 dell'applicazione che ci arriva non fa Ferite. A 0 PV un danno finale positivo chiede la PS di Tempra: le nuove Ferite vengono dalla fascia e dall'esito scelto al tavolo, con la Morte oltre Grave e il promemoria delle Menomazioni (§5.14.1). Gli effetti delle proprietà (§5.24) valgono solo se almeno 1 danno supera l'AR: Sanguinante come Stato applicato, gli altri come Stato da applicare se la Prova fallisce, Laser porta con sé Plasma. Per i nemici niente Ferite (per-davide A.73): a 0 PV solo il promemoria.
   - **Plancia.** «Colpito» su ogni carta (PG e nemici), solo con uno scontro aperto. La finestra chiede applicazioni, danno (dal vivo o «Tira con l'app» da una formula), natura, tipo d'attacco, Difesa e proprietà. L'anteprima mostra la provenienza dell'AR per applicazione; «Applica» resta spento finché manca un esito della Tempra.
   - **Scrittura.** Per un PG la plancia rilegge il file con la sua revisione (data di modifica, intestazione `X-Mutant-Mtime`), cambia solo `pvAttuali`, `ferite` e `statiAttivi` con la serializzazione dell'app (`src/tavolo.js` → `testoConSessione`) e lo riscrive. Se nel frattempo il file è cambiato, il server risponde 409 e la plancia chiede di riaprire il colpo. Senza l'intestazione (la scheda digitale) la scrittura è quella di sempre. Per un nemico i valori stanno nello scontro.
   - **Registro e annullamento.** Ogni colpo è una riga di registro (danno, Difesa, AR, PV, Ferite) e va in una pila nello scontro (`colpi`, ultimi 30). «Annulla ultimo colpo» rimette PV, Ferite e Stati di prima: per un PG riscrive il file, solo se è ancora quello lasciato dal colpo.
   - **Test.** `tests/danno.test.js` (casi del manuale: AR che azzera, Etereo, Perforante e Laser, più applicazioni, Parata e Schivata, soglie delle Ferite, Morte, bersaglio PG), `tests/colpo-plancia.test.js` (file del PG riscritto con la revisione, 409, la scheda rilegge; colpi su un nemico e annullamento), `tests/esempi.test.js`.
   - **Prova nel browser.** Server sulla porta 3001 con cartelle temporanee: «Carica esempi» due volte (la seconda tutto saltato); scontro con Rhea e Torvald, due Predoni e un Legionario. Un colpo per tipo:
     - Torvald, corpo a corpo con Parata: 11 → 6 − AR 5 = 1;
     - Predone, a distanza, tirato dall'app;
     - Legionario, Etereo: solo l'AR magica 2;
     - Rhea, tre applicazioni fino a 0 PV, con la Tempra fallita: Ferita Importante e Sanguinamento.
     Poi «Annulla ultimo colpo» su Rhea, e la scheda digitale di Torvald che legge PV 31/32.
   - **Scostamenti dal piano.**
     - La revisione dei file dei PG è la data di modifica, non un contatore: il formato del personaggio non cambia.
     - Il danno da scrivere è quello tirato con bonus e moltiplicatori (passi 1–3 del §5.13). Magistrale e moltiplicatori non li calcola la plancia.
     - Contromisure (Ignifugo X e simili) e perdita immediata del Sanguinamento solo come testo (per-davide A.76). Per Perforante con più applicazioni c'è la domanda A.77.
   - **Ritocchi del 2 ottobre** (richiesti da Marcello dopo la prova del pezzo 4).
     - «← Torna al tavolo»: la scheda di un PG aperta dal nome nella plancia ha il pulsante nella barra del titolo, primo a sinistra di «Sali al livello» e «Azioni». Riporta alla plancia con lo scontro aperto e lo stesso scorrimento. La provenienza sta in sessionStorage (`src/ui/ritorno.js`): resiste a F5 e lascia l'indirizzo com'è, quindi il tasto indietro funziona. La pagina iniziale la cancella: aperta da lì, la scheda non ha il pulsante.
     - «Aggiungi PG al tavolo», accanto a «Chi è al tavolo»: sceglie uno o più file JSON di «SALVA PG» e li controlla come «Importa» (`src/tavolo.js` → `pgDaAggiungere`). Li scrive in `personaggi/` solo se lì non c'è già un file con lo stesso nome (intestazione `X-Mutant-Nuovo`, altrimenti 409) e li mette al tavolo; un doppione è saltato, non sovrascritto, e comunque messo al tavolo. Un nome che non segue il formato dell'export (per esempio «… (2).json» di un download doppio) si rifà dal nome e dal livello nel JSON, con la data di oggi. Un file non valido è segnalato e non si scrive.
     - Test: `tests/ritorno-aggiungi.test.js`. Prova nel browser sulla porta 3001 con cartelle temporanee e con gli esempi.
5. ✔ **Pezzo 5 — Attacchi dei nemici** (fatto il 2 ottobre 2026).
   - **Dove.** «Attacca» sulla carta di ogni nemico nello scontro e nella riga d'Iniziativa dei partecipanti a mano che hanno un attacco scritto («Aggiungi partecipante a mano» ha ora i campi facoltativi dell'attacco: nome, ravvicinato o a distanza, VA, danno, natura; portata 1 Q o gittata 10 Q in Tiro Singolo). Senza attacchi il pulsante non c'è.
   - **Scelta.** Attacco del tipo di nemico (dal formato) e bersaglio fra i PG al tavolo e gli altri nemici dello scontro, con PV, Difese e AR (per i PG dalla vista della plancia, cioè da `calcolaScheda`; per i nemici dal formato). Nemico contro nemico funziona allo stesso modo.
   - **Adattatore** (`src/nemico-attacco.js`, funzioni pure). Il nemico diventa un «personaggio» senza Talenti né equipaggiamento, con i suoi Stati; l'attacco diventa un'arma di «Attacca!» con VA, danno, AC, modalità, gittata o portata e proprietà del formato, e l'Abilità dall'arma del catalogo se c'è `rif`. `src/attacco.js` non cambia: VA finale e danno vengono dagli stessi `calcolaAttaccoDistanza` e `calcolaAttaccoRavvicinato` dei PG, con la provenienza.
   - **Pannello** (`src/ui/attacco-nemico.js`). È il pannello «Attacca!» dell'app (`src/ui/attacco.js` → `pannelloAttacco`) con un contesto che presenta il nemico. Valgono movimento, Copertura, Circostanze, Superiorità numerica, distanza e fasce, modalità di fuoco, Tiro Mirato, le Manovre del §5.12 (anche Magistrale e Carica). Non si mostrano le opzioni che dipendono dal PG: Combattere con due armi, Solo la mano non dominante, la nota sul mirino (arma `esterno`); le opzioni dei Talenti spariscono da sole perché il nemico non ne ha. Munizioni e «Spara» non contano: la riga finale del pannello (gancio `ctx.azioni.finale`) diventa tiro per colpire, esito e registro.
   - **Tiro ed esito** (`src/prova.js` → `esitoProva`, `regole.json` → `prova`, Giocatore §1.6–1.7). d20 dal vivo («Inserisci») o «Tira 1d20 con l'app», uno per tiro delle raffiche e per attacco delle Manovre con più attacchi. 1 Successo Magistrale, 20 Fallimento Maldestro, 2 Magistrale con VA almeno 21; dal lotto 8 gli attacchi si tirano anche con VA 20 o più (A.78, `tipo: 'attacco'`), VA 0 o meno impossibile; nelle Prove contrapposte si tira sempre e il confronto con il bersaglio si fa al tavolo.
   - **Registro e danno.** «Registra l'attacco» scrive una riga (chi, chi, con che cosa, VA, tiro, esito). Se colpisce, «Applica danno» scrive la stessa riga e apre «Colpito» del pezzo 4 sul bersaglio, già compilata con formula, natura, tipo, AC (per i colpi a segno delle raffiche riuscite) e proprietà; «Tira con l'app» applica i moltiplicatori dell'attacco (Bruciapelo, Carica…) e, con il Magistrale, quello della sola prima applicazione (§1.6). Il master conferma e lì valgono Difesa, AR, PV, Ferite e Tempra come nel pezzo 4.
   - **Test.** `tests/attacco-nemico.test.js`: VA e danno dal formato, distanza che cambia il VA, esiti del d20, «Colpito» precompilata per Legionario Oscuro → Torvald e Predone → Rhea, nemico contro nemico con attacco e colpo nel registro, partecipante a mano con attacco.
   - **Prova nel browser.** Server sulla porta 3001 con cartelle temporanee e gli esempi. Legionario Oscuro 1 → Torvald con la Lama nefaria: tiro 7 dal vivo, colpito; «Colpito» con 1d10+3 Magico e Perforante 1, tirato dall'app 6 − AR 4 = 2, PV 32 → 30. Predone delle Lande 1 → Rhea col fucile a canne mozze a 5 Q: 2 tirato dall'app, colpito; 6 dal vivo − AR 1 = 5, PV 28 → 23. Poi Legionario → Predone con un 20 (Maldestro, solo registro) e un Sicario a mano con una pistola.
   - **Scostamenti dal piano.** Il nemico non ha Difese «attive» nel tiro per colpire: come per i PG, la Difesa si sceglie in «Colpito» (§5.10). In `src/ui/attacco.js` due ritocchi soltanto: le opzioni nascoste con un'arma `esterno` e il gancio della riga finale.
6. ✔ **Pezzo 6 — Giocatori collegati** (fatto il 2 ottobre 2026). Caso: il giocatore ha la sua scheda aperta nell'app, collegata al server (anche con `--rete`), mentre il master gli applica un colpo dalla plancia.
   - **Controllo del proprio file.** Con il server, la scheda a tab aperta controlla ogni 3 secondi l'elenco di `personaggi/` (come la plancia), solo per il proprio personaggio: il file più recente con il suo nome. La voce del browser ricorda file, revisione (data di modifica sul server) e impronta del testo esportato dell'ultima sincronizzazione (`cartella`). Funzioni pure in `src/collegamento.js`.
   - **Aggiornamento.** Se il file non è più quello ricordato e la scheda non ha modifiche da scrivere, la scheda prende il file (sessione: PV, PM, Ferite, Affaticamento, Corruzione, Stati, munizioni, e tutto il resto) e resta sulla stessa tab e allo stesso punto, con l'avviso «Il master ha aggiornato la tua scheda: PV 28 → 25». «Annulla» non riporta indietro il colpo.
   - **Modifica locale.** Si confronta il contenuto (impronta del testo esportato), non le date: riaprire la scheda la risalva senza cambiarla e non deve fare un conflitto.
   - **Scritture della scheda con la revisione**, come la plancia nel pezzo 4: se il master ha scritto nel frattempo il server risponde 409 e la scheda non sovrascrive. Prima del pezzo 6 la scheda scriveva senza revisione e poteva cancellare un colpo appena applicato.
   - **Conflitto.** Il file è cambiato mentre la scheda aveva una modifica non ancora scritta nella cartella (le scritture si raccolgono per 1,5 secondi). Avviso in testa alla tab, con le differenze della versione del master:
     - «Aggiorna» prende la versione del master; la modifica del giocatore si perde;
     - «Tieni la mia» riscrive il file con la revisione vista nell'avviso, quindi vince solo se il master non ha scritto ancora. Se l'ha fatto, l'avviso torna con i valori nuovi.
     Finché non sceglie, la scheda resta salvata nel browser ma non scrive nella cartella.
   - **Registro.** La scelta va in una riga del registro dello scontro aperto, se c'è (`src/scontro.js` → `registraRiga`). Esempio: «Torvald Krane: il giocatore ha tenuto la sua versione della scheda al posto di quella del master (PV 20 → 25; Punti Eroe 5 → 4)».
   - **Indicatore** in testa alla scheda, accanto ai pulsanti: «collegato al tavolo» (verde) se l'ultimo controllo è riuscito, «non collegato» (grigio) se il server non risponde. Senza il server di Mutant non compare, e l'app non fa controlli periodici: resta com'era.
   - **Test.** `tests/collegamento.test.js`, con il server vero su cartelle temporanee. Coprono la rilettura del file cambiato dal master, il conflitto con «Aggiorna» e «Tieni la mia» (409 con una revisione vecchia), la scheda riaperta che non fa conflitto, le differenze, la riga di registro e l'indicatore assente senza server.
   - **Prova nel browser.** Server sulla porta 3001 con cartelle temporanee e gli esempi; plancia in una scheda del browser, Torvald nell'altra, sulla tab Combattimento.
     - Colpo dalla plancia, 8 − AR 5: la scheda passa da PV 28 a 25 da sola, sulla stessa tab e allo stesso punto.
     - Punto Eroe tolto nella scheda e subito un colpo, 10 − AR 5: avviso, file del master intatto (PV 20). «Tieni la mia»: PV 25 e Punti Eroe 4 nel file, riga nel registro. «Aggiorna» provato su un conflitto precedente, con la sua riga.
     - Server spento: indicatore grigio, poi di nuovo verde. Stessa scheda servita senza server di Mutant (porta 3002): nessun indicatore, solo il `ping` dell'avvio.
   - **Scostamenti dal piano.** Non c'è l'unione per blocchi del rischio R1, cioè il master che scrive solo la `sessione` e il giocatore solo le scelte. Bastano la revisione e la scelta del giocatore. La regola «vince il più recente» resta per la pagina iniziale.
7. **Pezzo 7 — Prova al tavolo e merge su `main`**, dopo una sessione di gioco vera. Che cosa manca:
   - una sessione vera con i giocatori collegati in rete (`--rete`) e su carta, per vedere tempi del controllo, avvisi e registro con più persone;
   - R2: un codice di sessione se il server gira su una rete non di casa;
   - R3: con PC diversi le date dei file sono del server, quelle della voce del browser no; per il pezzo 6 conta solo la revisione del server, ma la sincronizzazione della pagina iniziale usa ancora le due date;
   - le risposte di Davide alle domande nate da questo branch ancora aperte (per esempio A.76, A.77, A.78), prima del merge;
   - la pulizia dei LEGGIMI tracciati solo qui (`personaggi/`, `scontri/`, `nemici/`) e del pulsante «Carica esempi», da decidere se restano su `main`;
   - il merge su `main` con i test e la prova dell'app senza server.

## Dopo la prima prova (3 ottobre 2026)

Ritocchi segnalati da Marcello dopo la prima prova della plancia.

- **Tendina che si richiudeva.** L'aggiornamento periodico (ogni 3 secondi) ridisegnava tutta la plancia quando trovava novità, e sempre con «Chi è al tavolo» aperto: la tendina «Tipo» di «Aggiungi nemici», aperta, veniva sostituita da una nuova e chiusa. Ora il custode dei controlli (`src/ui/ridisegno.js`) vale per tutti i controlli della plancia e delle carte:
  - mentre una tendina, un campo o un'area di testo hanno il focus, il ridisegno periodico si rinvia, e si fa appena il focus esce;
  - i valori scritti o scelti e non ancora confermati («bozze») tornano nei controlli dopo un ridisegno, così come il focus;
  - i controlli senza aria-label hanno una `data-chiave` stabile;
  - «Aggiungi partecipante a mano», aperto o chiuso, resta com'era.
- **Avvisi** (`src/ui/avvisi.js`). Una funzione unica, `avviso` e `avvisoErrore`: avvisi brevi in basso a destra, che si chiudono da soli; gli errori sono rossi e restano 10 secondi. Nella plancia la conferma di ogni azione salvata è la riga nuova del registro dello scontro (`src/scontro.js` → `righeNuove`), e i clic ripetuti su − e + dei PV e dei PM aggiornano un solo avviso per nemico. Avvisi presenti:
  - nemici entrati, Iniziativa tirata, di turno e nuovo Round, durate degli Stati, fine scontro;
  - colpo applicato a un nemico o a un PG con danni e PV, «a 0 PV», Ferite e Menomazioni (`testoColpo`);
  - attacco di un nemico, incantesimo di un nemico con i PM, PV e PM cambiati a mano;
  - «Chi è al tavolo» salvato, tipo di nemico salvato;
  - errori: conflitto di revisione, server spento, azione non possibile, annullamento non fatto, esempi non caricati.
  
  Nella scheda: «Spara» («Colpo effettuato: Lucas, Carabina Punisher. Colpi: 30 → 29.») e «Lancia» («Incantesimo lanciato: … (PM 14 → 10)»). Il PG attacca dalla sua scheda e il danno si applica dalla plancia, quindi le conferme sono due: una per l'attacco e una per il danno.
- **Nemico a 0 PV.** La carta si riduce a una riga (nome, PV 0, Ferita) e va in fondo dopo gli altri nemici; un clic la riapre, e «Riduci» la richiude. Sopra 0 PV torna al suo posto, aperta. Nella tabella dell'Iniziativa resta al suo posto, in grigio: saltarlo o no lo decide il master. Il campo è `ridotta` del partecipante, salvato con lo scontro (`src/scontro.js` → `conPv`, `riduciNemico`).
- **Pagina iniziale.** Le etichette «solo browser», «cartella e browser» e «solo cartella» hanno un suggerimento al passaggio del mouse.
- **Test.** `tests/ridisegno.test.js`:
  - dieci giri di polling con una tendina aperta, senza ridisegno né cambio di valore o di focus;
  - bozze e focus dopo un ridisegno;
  - righe nuove del registro;
  - testo del colpo con 0 PV, Ferite e Menomazione;
  - carta ridotta a 0 PV.
- **Prova nel browser.** Server sulla porta 3017 con cartelle temporanee, poi cancellate:
  - tendina «Tipo» aperta 10 secondi mentre il server cambiava «Chi è al tavolo» ogni 2 secondi: stesso elemento, sempre con il focus;
  - Lucas spara con la Carabina Punisher, con l'avviso dei colpi;
  - «Colpito» sull'Eretico Veterano: 7 − AR 1 = 6, PV 25 → 19, con l'avviso;
  - con 30 danni l'Eretico va a 0 PV: carta ridotta in fondo, riga grigia nell'Iniziativa;
  - riaperto e curato a 1 PV, torna primo e aperto.
  
  Senza server l'app è invariata: nessuna etichetta, nessuna richiesta `/api`, console pulita.

## Round collegato fra scheda e tavolo (3 ottobre 2026)

Richiesta di Marcello: il contatore dei Round della scheda e il Round dello scontro della plancia erano separati.

**Com'era.**
- **Scheda.** Il contatore stava in `sessione.round`, avanzato a mano con «Nuovo Round» (tab Poteri). Contava solo le Tecniche Interiori:
  - `tecnicheAttive` con dal/al;
  - il limite «una per Round» (`ultimaTecnica`).
- **Incantesimi.** «Lancia!» non registra durate.
- **Stati.** Gli Stati della scheda (`statiAttivi`) non hanno durata.
- **Plancia.** Il Round dello scontro avanza con «Avanti» dopo l'ultimo dell'ordine. La plancia legge gli Stati del PG dal suo file. Le durate degli Stati dei PG le registra lei (`scontro.durate`) e, a scadenza, scriveva «toglilo dalla scheda».

**Come è ora** (`src/round-scontro.js`, funzioni pure):
- **Durate assolute.** Durate e Round sono numeri assoluti (dal, al). La regola «dal Round R alla fine del Round R + N, il Round di attivazione non conta» sta in `data/regole.json` → `durate_round` (Giocatore §8.9.1 e §5.18; Magia, «Scadenze e interruzione degli effetti»), con le frasi controllate da `tools/verifica_frasi.mjs`. La usano Tecniche (`fineTecnica`) e Stati dello scontro (`registraDurata`).
  - Correzione: gli Stati dello scontro finivano un Round prima del §5.18. Ora hanno `al` e finiscono alla fine del Round R + N.
  - I file di prima, con i soli Round rimasti, finiscono come allora.
- **Con il server e il PG in uno scontro aperto** (partecipante `pg:<nome>`):
  - la scheda legge il Round dello scontro a ogni controllo (3 secondi) e mostra la sua sessione vista a quel Round (`alRound`: Tecniche finite tolte, limite di una per Round su quel Round);
  - non scrive niente a ogni Round: la vista diventa sessione salvata solo alla prossima azione del giocatore;
  - prima di «Attiva» rilegge il Round dal server, quindi vale l'ordine del server;
  - etichetta «Round N · dallo scontro» in testa a ogni tab e nel contatore della tab Poteri;
  - «Nuovo Round» disattivato, con il suggerimento che spiega perché;
  - Round rimasti accanto agli Stati con durata (tab Combattimento);
  - avvisi (`src/ui/avvisi.js`): ingresso nello scontro, nuovo Round con le scadenze, fine dello scontro con le durate ancora attive;
  - il ridisegno si rinvia finché il giocatore usa un campo o ha aperto il pannello «Attiva» o «Lancia!».
- **La plancia scrive nel file del PG solo in tre momenti**, con la revisione e fino a tre tentativi:
  - **all'inizio dello scontro** le durate in corso passano sul Round 1 con i Round che restano (`riallinea`);
  - **a ogni nuovo Round** toglie gli Stati la cui durata è finita;
  - **alla fine dello scontro** porta la sessione al Round finale (`alRound`): la scheda riprende il suo contatore da lì e le durate restano con i Round rimasti (avviso nella plancia e nella scheda).
- **Plancia, carta del PG.** «Tecniche in corso: Nome · N Round» e gli Stati con i Round rimasti. Con Tecniche in corso c'è «Termina le durate», che le chiude in tutte le schede dei PG al tavolo.
- **Senza server, o con il PG non in uno scontro.** Nessuna differenza: contatore e «Nuovo Round» della scheda come prima.
- **Concorrenza.** Due «Avanti» sulla stessa revisione: il secondo riceve 409 e ricarica, il Round avanza una volta. La vista al Round è idempotente: nessuna durata si conta due volte.

**Test** (`tests/round-scontro.test.js`):
- regola nei dati;
- Tecnica attivata al Round 2 con R + 3 che scade al Round 6;
- seconda attivazione nello stesso Round rifiutata;
- fine dello scontro con durata attiva;
- inizio dello scontro;
- Stati con durata;
- senza server invariato;
- vista idempotente;
- due «Avanti» concorrenti sul server;
- file del PG.

Aggiornati i test degli Stati in `tests/scontro.test.js` e `tests/nemici-scontro.test.js`.

**Prova** (porta 3017, cartelle temporanee e una copia di Aiko Tenzan, poi cancellate), con plancia e scheda in due finestre:
- «Attiva» Radici della Montagna al Round 2 (fino al Round 5); la carta mostra 4, 3, 2, 1 Round; al Round 6 scade nella plancia e nella scheda;
- Aura di Resistenza al Round 6: la seconda Tecnica è bloccata nello stesso Round; al Round 10 la scheda avvisa «Scaduta: Aura di Resistenza»;
- «Fine scontro» con Radici ancora attiva: avvisi in entrambe le finestre, la scheda riprende dal Round finale con la durata intatta; «Termina le durate» la chiude;
- un nuovo scontro riallinea la durata al Round 1;
- con il campo delle note in uso la scheda non si ridisegna, poi si aggiorna;
- senza server la scheda è invariata.

**Resta fuori.** Le durate degli Incantesimi nella scheda: fatte il 3 ottobre 2026, sezione seguente.

## Durate degli Incantesimi lanciati (3 ottobre 2026)

Richiesta di Marcello: «Lancia!» non registrava durate; ora gli Incantesimi si contano come le Tecniche Interiori.

**Ricognizione** (Manuale della Magia, `docs/manuali-txt/`; dati in `incantesimi.json` → `versioni`). Le durate stanno nelle colonne delle versioni («Durata», «Durata fissa», «Durata max», «Durata Con», «Con/Senza Concentrazione», «Durata A/B»…). Sui 90 incantesimi:

| Tipo | Incantesimi |
|---|---|
| istantanea (nessuna durata) | 15 |
| durata fissa | 49 |
| durata fissa o a Concentrazione, a scelta | 13 |
| solo a Concentrazione | 2 |
| durata per modalità (Resistenza Fisica, Efficienza, Marchio Psichico) | 3 |
| fino a una condizione (Comando) | 1 |
| procedura (cure, Psicometria, Rigenerazione, Impronta Mistica…) | 7 |

Valori per versione: 189 in Round, 331 in minuti, ore o giorni, 4 altri (con le durate a Concentrazione di Individuare, A.88 del 03/10). Mancava nei dati la seconda tabella di Marchio Psichico (inseguimento e combattimento): aggiunta. Individuare sembrava senza durata massima a Concentrazione (A.88): la colonna c’era, abbreviata in «Concentr. massima»; recepita il 03/10 (E&L), con l’Anticipazione solo sulla durata scelta e l’avviso in «Lancia!» se si anticipa l’altra.

**Dati.** `tools/durate_incantesimi.mjs --scrivi` → `meccanica.durata` di ogni incantesimo: `tipo` (durata, istantanea, procedura, condizione), `colonna`, `concentrazione`, `concentrazione_doppia` (Scudo: a Concentrazione il doppio della durata fissa), `modalita`. Il validatore (`validaDurateIncantesimi`) controlla tipi, colonne in ogni versione e valori leggibili. Scadenza con `regole.json` → `durate_round` (la stessa delle Tecniche). Allungare la durata: Anticipazione della Durata (gradino successivo della scala, sez. 12.3); Incantesimi Estesi toglie il raddoppio dei PM (`anticipazione_senza_raddoppio`), come già in «Lancia!». AR degli incantesimi già calcolata dalla scheda: `regole.json` → `ar.incantesimi` (Scudo, Armatura di Forza, Pelle Corazzata), con le frasi verificate.

**Scheda** (`src/durate-incantesimi.js`, `src/ui/incantesimi-in-corso.js`):
- nel pannello di «Lancia!» il riquadro «Durata e bersagli»: la durata della versione (anticipata se si anticipa la Durata), la modalità, «Con Concentrazione» dove si sceglie, i bersagli («su di me», gli altri partecipanti dello scontro, «Altri bersagli» a parole);
- dopo il lancio, nella tab Poteri «Incantesimi in corso»: Round rimasti, Concentrazione, bersagli, «AR +N nella scheda», «Termina»; le durate a tempo sono promemoria con il testo e l'ora del calendario, se attivo;
- un nuovo incantesimo a Concentrazione termina quello mantenuto prima (avviso);
- scadenza con «Nuovo Round» della scheda o, in scontro, con il Round dello scontro; avviso «Scaduta: …»;
- AR di Scudo, Armatura di Forza e Pelle Corazzata su di sé solo finché la durata è attiva, con la riga «incantesimo, fino alla fine del Round N» nella provenienza;
- «Su di te, dai nemici»: gli incantesimi dei nemici sul PG, con l'avviso quando finiscono;
- sessione `incantesimiAttivi`, scritta solo se non vuota: i file senza incantesimi lanciati non cambiano; «Nuova sessione» la chiude.

**Plancia:**
- carta del PG: «Incantesimi in corso: Nome · N Round (su di sé / bersagli)» e «Su di lui» con gli incantesimi di nemici e altri PG;
- carta del nemico: i suoi incantesimi in corso e quelli che ha addosso;
- valori della carta del PG (AR compresa) calcolati al Round dello scontro (`vistaPlancia(…, round)`), come nella scheda;
- «Termina le durate» chiude Tecniche e incantesimi nelle schede e gli incantesimi dei nemici nello scontro.

**Nemici.** «Lancia!» del nemico con lo stesso riquadro: la durata va in `scontro.effetti` (`registraLancioNemico`), con la riga nel registro «dura fino alla fine del Round N, su …»; a «Avanti» scade («… è finito.»).

**Stampa.** Invariata: l'elenco degli incantesimi del foglio 5 mostra già la durata.

**Correzioni nate dalla prova:** «Termina le durate» non chiudeva gli incantesimi nel file del PG (la sessione nuova si unisce a quella del file: ora scrive una lista vuota); la carta della plancia mostrava l'AR dell'incantesimo anche dopo la scadenza.

**Test** (`tests/durate-incantesimi.test.js`):
- dati e validatore;
- 3 Round al Round 2, che scade alla fine del Round 5 in scheda e in scontro;
- durata in minuti come promemoria;
- Anticipazione con Incantesimi Estesi (10 → 20 Round);
- «Termina» e «Termina le durate»;
- AR di Armatura di Forza fino alla scadenza, anche nella carta della plancia;
- incantesimo di un nemico su un PG;
- collaudo: i PG d'esempio a riposo invariati.

**Prova** (porta 3017, cartelle temporanee e una copia di Fratello Anselmo Viri, poi cancellate), con plancia e scheda in due finestre:
- Armatura di Forza al Round 2: AR 1 → 3 con la provenienza; carta «11 Round»; al Round 13 AR 1 in scheda e plancia, avviso «Scaduta»;
- «Termina» nella scheda; Alterare Immagine 5 minuti come promemoria; «Termina le durate» dalla plancia;
- Catene di Forza di un nemico su Anselmo: su entrambe le carte e nella scheda, fine al Round 22, registro;
- senza server (porta 8017): contatore della scheda, scadenza al Round 7.


## Due bug della prima prova di scontro (4 ottobre 2026)

Marcello e Davide, in un piccolo scontro di prova sulla plancia, hanno trovato due cose che non funzionavano.

### 1. Il Magistrale di un nemico non raddoppiava il danno

**Regola.** Giocatore §1.6, «Effetti del Successo Magistrale», riga *Combattimento*: «L'attacco colpisce e il danno viene raddoppiato; un danno già ×2 diventa ×3. Si applica **prima della Parata e dell'Armatura**, alla sola prima istanza». Il §5.13 mette il moltiplicatore al passo 3, dopo i dadi e i bonus ordinari e prima di Difese e Armatura; il §1.6 aggiunge che «danni persistenti, Sanguinamento ed effetti secondari successivi non vengono moltiplicati».

**Causa.** La catena del tiro era giusta (`esitoAttacco` riconosceva il Magistrale, `propostaColpo` calcolava il moltiplicatore), ma il raddoppio lo applicava **solo il pulsante «Tira con l'app»** della finestra «Colpito»: moltiplicava il numero appena tirato. Al tavolo i dadi sono veri e il danno si scrive a mano, e quel numero arrivava intatto in `applicaColpo`, che di moltiplicatori non sapeva nulla. Stesso buco per un PG che colpiva un nemico dalla plancia: «Colpito» si apriva senza alcun modo di dire che il colpo era Magistrale.

**Correzione.** Il moltiplicatore è passato nel motore:
- `regole.json` → **`magistrale`** (chiave di primo livello, spostata da `attacco_ravvicinato.magistrale`: il §1.6 è una regola generale del danno, non del solo corpo a corpo), con `raddoppio`, `da_x2`, `massimo`, `solo_prima_applicazione` e `prima_di: [difesa, armatura]`; validatore in `src/validate.js`;
- `src/danno.js` → `moltiplicatoreMagistrale` (×1 → ×2, ×2 → ×3, ×3 resta ×3) e `applicaColpo`, che ora accetta `moltiplicatore` e `magistrale` nel colpo e applica il moltiplicatore **prima di Difesa e Armatura**, alla sola prima applicazione, con la provenienza di ogni passo. Il danno del colpo sono i dadi con i bonus ordinari, scritti dal vivo o tirati dall'app: il numero arriva dallo stesso punto in entrambi i casi;
- `src/attacco.js` importa la funzione da `danno.js` (una sola fonte per la regola);
- `src/nemico-attacco.js` → `propostaColpo` passa `magistrale` (non più un moltiplicatore già calcolato) e la **fonte** dell'attacco, per gli Stati periodici;
- `src/ui/colpo.js`: interruttore **«Successo Magistrale: danno ×N sulla prima applicazione»**, acceso da un attacco Magistrale e accendibile a mano (un PG che colpisce un nemico, un colpo scritto a mano); scelta del moltiplicatore dell'attacco; anteprima che mostra `10 ×2 = 20 (Magistrale) − AR 4 = 16`;
- registro dello scontro: «Torvald Krane colpito (Magico, **Successo Magistrale**, Perforante 1): 10 ×2 = 20 − AR 4 = 16; PV 32 → 16».

Vale per ravvicinato e distanza, armi e attacchi naturali, Spazzata compresa (un «Colpito» per bersaglio, ognuno col suo esito) e per i PG che colpiscono i nemici: è lo stesso `applicaColpo`.

### 2. Il Sanguinamento non toglieva PV

**Regola.** Giocatore §5.15: «Sanguinamento possiede un valore X. Alla prima applicazione il personaggio perde **immediatamente X PV ignorando Armatura, Parata e Schivata**; le applicazioni successive avvengono **all'Iniziativa di chi lo ha procurato, al massimo una volta per Round**. Questa perdita non porta i PV sotto 0 e, quando li riduce a 0, non produce immediatamente una Ferita. Se al momento dell'applicazione si trova già a 0 PV, il personaggio effettua Tempra: con successo non subisce nuove Ferite, con fallimento subisce direttamente una Ferita. Più Sanguinamenti non si sommano: si usa il valore più alto.» Non scade da sé: finisce solo con le procedure per fermarlo (Medicina, Incantesimi). Il §5.18 ripete la regola per tutti gli Stati e la Magia aggiunge che «una fonte priva di Iniziativa usa la fine del RND» e che «se la fonte esce di scena, si conserva la sua Iniziativa».

**Causa.** Lo Stato veniva applicato correttamente (proprietà `Sanguinante X` del §5.24), ma **nessuno lo faceva valere**: `avanti()` scalava solo le durate in Round, e il Sanguinamento non ha una durata in Round. Mancavano anche il valore X (lo Stato si salvava come semplice id, senza numero) e la fonte, che dice a quale Iniziativa tocca.

**Correzione.** Perdite periodiche come meccanismo a sé, con gli stessi criteri delle durate:
- **dati**: `regole.json` → `stati.periodici` (regole comuni: `quando: iniziativa_fonte`, `senza_fonte: fine_round`, `max_per_round: 1`, testo dell'avviso) e `periodico` sulle voci di `stati.elenco`: **Sanguinamento** (`danno: valore`, ignora armatura, parata e schivata), **Incendiato** (`1d4`, ignora l'AR non magica) e **Avvelenato** (`dalla_fonte`: il valore lo dà il veleno). Validatore in `src/validate.js`;
- **motore**: `src/periodici.js`, funzioni pure (`registraPeriodico`, `perditeDovute`, `applicaPerdita`, `togliPeriodici`, `allineaPeriodici`, `pvDopoPerdita`). Ogni perdita in corso sta nello scontro, in `periodici`: bersaglio, Stato, valore o formula, fonte e `ultimo` (ultimo Round applicato), che rende l'applicazione **idempotente**: due «Avanti» in due finestre non la contano due volte (la seconda applicazione dà errore e `perditeDovute` non la propone più);
- **prima applicazione**: `applicaColpo` accetta `periodiciImmediati` e toglie subito X PV dopo il danno, ignorando AR e Difese, **senza** il moltiplicatore del Magistrale (§1.6). Nel registro: «Sanguinamento 1: −1 PV subito (PV 16 → 15)»;
- **applicazioni successive**: la plancia (`src/ui/tavolo.js` → `applicaPeriodici`) le applica da sé quando il turno arriva alla fonte, al massimo una volta per Round. Per un nemico i PV stanno nello scontro; per un PG si scrive nel suo file con la revisione, come già fanno le durate. Avviso e riga di registro: «**Sanguinamento: Torvald Krane perde 1 PV (PV 15 → 14)**». Per Incendiato e i veleni la formula la tira l'app e la riga lo dice;
- **a 0 PV** non si applica nulla da sé: serve la PS di Tempra, e il registro la chiede (§5.15);
- **barra «Stati che togliono PV ogni Round»** nella plancia: le perdite in corso con valore e fonte e il pulsante **«Ferma»** (lo Stato è stato arrestato: si toglie anche dalla scheda del PG o dalla carta del nemico); gli Stati periodici attivi senza valore — messi a mano dalla scheda — hanno **«Registra»**, che chiede valore e fonte;
- **finestra «Colpito»**: per uno Stato periodico si scelgono il valore X (proposto dalla proprietà) e la fonte fra i partecipanti dello scontro, con «nessuna Iniziativa (fine del Round)» per le fonti che non ne hanno;
- **scheda del PG**: `collegamentoScontro` porta anche i periodici, e la tab Combattimento scrive «Sanguinamento **· 1 PV per Round**» accanto allo Stato, con la fonte nel suggerimento. I PV aggiornati arrivano dal file, come per gli altri cambiamenti della plancia.

**Altri Stati periodici.** Dei undici Stati del §5.18 solo tre togliono PV a ogni Round e sono tutti automatici: Sanguinamento (valore X), Incendiato (1d4, l'app tira) e Avvelenato (valore o formula del veleno, da scrivere: il manuale non dà numeri fissi — quelli dei veleni del Bestiario stanno in `data/bestiario.json` → `mutazioni.veleno`). Gli altri otto non hanno effetti periodici sui PV e restano promemoria con i loro effetti sui valori, come prima.

**Prova** (porta 3177, cartelle temporanee e una copia di Torvald Krane, poi cancellate), con plancia e scheda in due finestre:
- Legionario Oscuro, Lama nefaria, tiro 1 naturale → «Colpito: Successo Magistrale»; «Colpito» con l'interruttore già acceso, danno 10 scritto dal vivo, proprietà «Perforante 1, Sanguinante 1» → anteprima `10 ×2 = 20 − AR 4 = 16`, totale PV 32 → 15 (16 del colpo più 1 di Sanguinamento immediato); prima della correzione il danno restava 10 e i PV scendevano a 22;
- fonte proposta: «Legionario Oscuro 1», cioè chi ha attaccato;
- Round 2, all'Iniziativa del Legionario: avviso «Sanguinamento: Torvald Krane perde 1 PV (PV 15 → 14)», carta e scheda a 14; Round 3: 14 → 13; nessuna doppia applicazione nello stesso Round;
- «Ferma»: al Round 4 i PV restano 13 e lo Stato si toglie anche dalla scheda; «Registra» (valore 1, fonte di turno) lo rimette, e il Round 5 torna a togliere 1 PV;
- la scheda nella seconda finestra mostra PV 12/32, Round 5 e «Sanguinamento · 1 PV per Round»;
- senza server (porta 8178, server statico): app invariata, nessun errore in console.

## Basi nuove del Bestiario nella plancia (3 ottobre 2026)

Quadrupede, Alato, Strisciante e Gigante (Bestiario §3.6–3.9) e le loro creature pronte arrivano in «Crea nemico» e «Prepara scontro» dai dati (`data/bestiario.json`), senza codice nuovo per le basi.
- **Formato dei nemici.** Due campi facoltativi: «Passo in volo» (`movimento.volo`) e «Taglia» (`taglia`: normale o grande). L'editor li mostra da sé; la carta del nemico li segnala con un'etichetta e la regola nel suggerimento (−2 VA a chi attacca in volo, +2 VA contro la taglia Grande: proposte del Bestiario §3.1.1).
- **Riepilogo di «Crea nemico».** Mostra anche Movimento, volo e taglia.
- **«Prepara scontro».**
  - Il riquadro della difficoltà è in parole semplici («Difficoltà per 7 PG di 6° livello: facile. Calcolata sulla riga del 5° livello, la più vicina nella tabella del Bestiario»), con i dettagli del calcolo nel suggerimento; senza nemici dice «Difficoltà: nessun nemico».
  - Avvisa se nella bozza ci sono più Giganti di quanti ne ammette il Bestiario sotto il grado Potente (`massimo_per_scontro` della base).
- **Prova.** Su porta di prova e cartelle temporanee: un Gigante Potente e due Alati Medi creati con «Crea nemico», messi in una bozza e avviati con «Inizia», con Iniziativa e Round 1; sulle carte compaiono «Taglia Grande» e «Vola · Passo in volo 8 Q». Senza server l'app è invariata.

## Identità dei personaggi nella cartella (4 ottobre 2026)

Bug segnalato da Marcello. Un PG nuovo («LUCAS») creato con il server, mentre «Lucas» era al tavolo, all'ultimo passo mostrava «Il master ha aggiornato la tua scheda…». La scheda riconosceva il suo file dal «Nome» del file. Quando la plancia riscriveva il file dell'altro, quello diventava il file più recente con la stessa chiave. Su Windows, inoltre, «Lucas_…» e «LUCAS_…» sono lo stesso file.

- **Identificativo.** Ogni PG ha un identificativo «pg» creato alla nascita (`src/character.js` → `nuovoPg`), scritto nel file (campo facoltativo, formato 8 invariato) e nella voce del browser. La scheda e la pagina iniziale riconoscono il file dal «pg» (`src/cartella.js` → `fileDelPg`; `src/collegamento.js` → `fileRemoto`). La plancia lo conserva nelle sue riscritture.
- **Nome del file.** Resta leggibile e diventa unico per PG (`nomeFileLibero`). Se un altro PG ha già un file con lo stesso nome, anche solo a meno di maiuscole, accenti o spazi, il PG nuovo prende un suffisso («LUCAS-2_liv1_…json»). La plancia continua a usare il «Nome».
- **Server.** L'elenco riporta il «pg» di ogni file. Una scrittura su un file (o su uno con lo stesso nome a meno di maiuscole e accenti) che contiene un altro personaggio è rifiutata con 409 e il messaggio «il file … contiene un altro personaggio (…): non sovrascritto». La scheda non lo tratta come un conflitto di revisione.
- **PG di prima.** I PG senza identificativo lo ricevono alla prima apertura, o entrando al tavolo con «Aggiungi PG al tavolo», senza cambiare altro. Con il server si prende quello del loro file, se c'è già. Finché non lo hanno si riconoscono dal «Nome», come prima.
- **Nomi che si confondono.** Se due file vecchi hanno nomi che si confondono («Lucas» e «LUCAS»), la plancia lo segnala in «Chi è al tavolo».
- **Primo salvataggio** (5 ottobre 2026). Un PG senza nome resta nel browser e non va nella cartella. Quando prende il nome si scrive un solo file con il nome giusto. Se dalle versioni precedenti esiste un file provvisorio «personaggio_liv1_….json» dello stesso PG (stesso identificativo), il server lo toglie dopo aver scritto quello nuovo: è una rinomina (`src/cartella.js` → `fileProvvisorio`, `haNome`). I provvisori orfani compaiono nella pagina iniziale come «Senza nome».
- **Riquadro del conflitto.** Quando il conflitto riguarda davvero lo stesso PG, dice quale PG e quale file: «Il master ha aggiornato la scheda di Lucas (file Lucas_liv6_2026-10-04.json) alle …».

## Collegare i giocatori (3 ottobre 2026)

Marcello aveva avviato solo `avvia-server.bat` e non vedeva a quale indirizzo dovevano collegarsi i giocatori: il server ascoltava solo su `127.0.0.1`, salvo `--rete`.

- **Interfacce.** `server.mjs` ascolta su tutte le interfacce (`0.0.0.0`); `--solo-locale` lo tiene chiuso a questo computer, `--rete` è ancora accettato ma non serve più.
- **Finestra del server.** In evidenza fra due righe di uguali stampa «Giocatori: aprite http://<IP>:<porta> dalla stessa rete Wi-Fi», una riga per indirizzo IPv4 della rete locale, e sotto:
  - l'indirizzo per questo computer;
  - le reti virtuali escluse;
  - la nota sul firewall (permesso a Node.js per le «reti private»);
  - cosa fare se i giocatori non si collegano (rete «privata» e non «pubblica», firewall).
- **Indirizzi.** Li sceglie `src/rete.js` → `indirizziRete`: solo IPv4, niente loopback né 169.254.x. Le interfacce virtuali evidenti (WSL, Hyper-V, VirtualBox, VMware, Docker, VPN…) si riconoscono dal nome e si escludono; se non ne resta nessuna vera, si mostrano tutte con il nome.
- **Plancia.** Il riquadro «Collega i giocatori» (`src/ui/collega.js`, dati da `GET /api/rete`) mostra gli stessi indirizzi, con «Copia» e un codice QR per ciascuno. Il QR è generato in locale da `src/qr.js`, scritto per l'app senza librerie né servizi esterni: modalità byte, livello M, versioni 1–6.
- **avvia.bat.** Resta com'è e non va aperto insieme ad `avvia-server.bat`, che basta per tutto: è l'avvio di chi usa l'app senza server.
- **Test.**
  - `tests/qr.test.js`: vettore Reed–Solomon noto, bit di formato dello standard, decodifica di controllo di ogni versione, indirizzi con interfacce finte, testo della finestra;
  - `tests/rete-server.test.js`: il server risponde su un indirizzo della rete locale.
- **Prova.** Plancia aperta da `http://192.168.1.57:3017` (porta di prova, cartelle temporanee), «Copia» funzionante anche fuori da localhost. Senza server l'app è invariata.

## «Crea nemico» e «Prepara scontro» (3 ottobre 2026)

Richiesta di Marcello del 3 ottobre: due funzioni nuove della plancia, raggiungibili anche senza scontro aperto, basate sul Bestiario proposto (`docs/bestiario/bestiario.md`, cap. 2–6). L'editor manuale dei nemici resta com'è.

**Il Bestiario come dati** (`data/bestiario.json`):
- lo scrive `tools/lotti/lotto_bestiario_dati.mjs --scrivi`, che legge le tabelle del documento:
  - scala dei gradi, Boss, equilibrio (A.3) e gruppi misti;
  - basi del cap. 3 ed equipaggiamento del §4.4, con le armi del catalogo;
  - tabelle casuali del cap. 6;
- effetti numerici dei moduli (cap. 4) e ricette delle creature pronte (cap. 5) sono scritti nel lotto dal testo dei paragrafi;
- fonte «Bestiario, proposta» e `TODO(Davide)`: è una proposta in attesa di Davide;
- validatore `validaBestiario` (`src/validate.js`): Stati, Abilità, nature, armi del catalogo, facce dei dadi, id delle tabelle;
- `tests/bestiario.test.js` rilegge il documento e confronta PV, VA, Difese, AR, danno, Boss e tabelle;
- il Bestiario non entra nelle versioni dei dati del personaggio né nei punti da chiarire della pagina iniziale (`src/rules.js` → `FILE_SOLO_TAVOLO`, `versioniPersonaggio`): l'app senza server resta com'era.
- `bestiario.md`: PV del Bruto della Breccia Boss 171 (155 × 1,1 arrotondato come le basi; prima 170).

**«Crea nemico»** (motore `src/crea-nemico.js`, finestra `src/ui/crea-nemico.js`). Un passo per schermata con «Indietro», «Avanti» e «A caso», che usa le tabelle del cap. 6 e lascia com'erano gli altri passi:
1. base (Umano con il tipo del bestiario umano, Insettoide, Aracnoide, Umanoide mostruoso) oppure una delle 7 creature pronte;
2. grado (Minore → Molto potente, e Boss), con i Round di resistenza attesi contro 7 PG;
3. moduli: Corrotto con livello e Manifestazioni, Mutazioni ammesse per la base, Equipaggiamento con le armi del catalogo; costo e grado effettivo (§2.4) sempre in vista;
4. nome, descrizione e identificativo, con una proposta modificabile;
5. riepilogo: profilo completo nel formato A.73, provenienza di ogni valore (base, grado, moduli, ritocco a mano) nei tooltip, valori modificabili a mano.

In fondo:
- «Salva nel bestiario» scrive in `nemici/`; con lo scontro aperto c'è anche «Aggiungi allo scontro», da «Prepara scontro» «Aggiungi alla preparazione»;
- «Tutto a caso» fa i 5 passi del §6.6 in un clic, con i tiri a vista e «Ritira» per ogni passo (per esempio una sola Mutazione), poi lo stesso riepilogo;
- un nemico salvato dalla procedura ha il blocco `_bestiario` (scelte, grado, costo, grado effettivo, ritocchi) e nel Bestiario il pulsante «Procedura», che lo riapre sul riepilogo.

**«Prepara scontro»** (modello `src/preparazione.js`, finestra `src/ui/preparazione.js`):
- **Bozze.** Stanno in `scontri/` con stato «bozza», accanto agli scontri, che le ignorano. Il server le valida con `validaBozza`; «Elimina» e «Inizia e consuma la bozza» le spostano in `scontri/archivio/`, senza cancellarle.
- **Contenuto.** Nome, note per il master e nemici con «Quanti» e lato. I nemici vengono dal bestiario salvato, dalle creature pronte o da «Crea nemico»; ognuno si guarda e si ritocca con l'editor dei nemici, solo nella bozza.
- **PG.** Sono facoltativi: senza scelta, quelli al tavolo alla partenza.
- **Difficoltà per 7 PG.** È solo informativa, da 1 / numero della tabella dei gruppi misti (§2.3), con i mezzi gradi e il Boss. Per un nemico del bestiario senza `_bestiario` il grado si stima dai PV, e la difficoltà lo dice.
- **Salvataggio.** Ogni modifica si salva con la revisione, in fila.
- **«Inizia».** Rifiuta se c'è già uno scontro aperto. Mette al tavolo i PG scelti e crea lo scontro: PG, copie numerate dei nemici, Iniziativa tirata dall'app per tutti, Round 1, note e la riga «Dalla preparazione …».

**Decisioni prese:**
- le creature pronte sono ricette calcolate dal motore; il test le confronta con le tabelle del cap. 5, e coincidono tutte;
- la Ragnatela è una capacità, con VA e gittata nel testo: il formato A.73 vuole i dadi negli attacchi;
- PV arrotondati all'unità;
- il Boss è «Boss di grado X»;
- Umani:
  - vengono dai file del bestiario umano (`esempi/nemici/umani/`), letti come file statici;
  - Potente e Molto potente non ci sono per gli umani (Comandante e Campione sono da preparare);
  - l'equipaggiamento di un umano prende le armi della fascia con il VA delle sue armi dello stesso tipo e l'armatura se è migliore;
- Mimetismo su una base senza Furtività: avviso, il +4 si applica a mano;
- nomi proposti senza virgola («Scavafosse Semplice»): le copie nello scontro aggiungono il numero;
- a «Inizia» i PG scelti si aggiungono a quelli già al tavolo, senza toglierne.

**Test e prova:**
- test: `tests/bestiario.test.js`, `tests/crea-nemico.test.js` (creature del cap. 5, Insettoide Medio con 2 Mutazioni, Umano Corrotto livello 2, «a caso» con seme fisso e ritiro, 100 semi validi), `tests/preparazione.test.js` (modello, «Inizia», server con cartelle temporanee);
- prova nel browser: server sulla porta 3017 con cartelle temporanee, poi cancellate, e un PG di prova «Lucas» copiato da un esempio:
  - Aracnoide Potente con Veleno e Toccato (Sangue fermo) creato con la procedura, salvato e riaperto con «Procedura»;
  - tutto a caso con una Mutazione ritirata (Mimetismo → Sensi oscuri);
  - bozza «Imboscata al porto» con 3 nemici (Ragno delle cisterne e 2 Scavafosse ritoccati) e Lucas: scheda chiusa e riaperta, bozza ritrovata, «Inizia» con Iniziativa e Round 1 corretti;
  - «Duplica» e «Inizia e consuma la bozza», con l'archiviazione;
  - «Aggiungi allo scontro» dalla procedura;
  - telefono senza scorrimento orizzontale;
- senza server l'app è invariata: console pulita, nessuna richiesta `/api`.

## Bestiario proposto (2 ottobre 2026)

Davide non ha ancora un bestiario. Questi nemici umani sono **proposte, da validare con lui** (per-davide A.79). Sono costruiti con le regole di creazione e avanzamento dei PG (Giocatore 0.45), così i numeri vengono dal motore e non da stime. Ogni file lo dice nella fonte («costruito come PG (…)») e nelle note («Proposta, da validare con Davide»).

**Convertitore «PG → nemico»** (`src/nemico-da-pg.js` → `nemicoDaPg`, funzione pura).
- Prende il file di un personaggio e produce un nemico nel formato di `data/formato_nemici.json`, con i numeri di `calcolaScheda` e una sessione nuova (PV pieni, nessuno Stato): PV, PM, AR «totale, di cui magica», Difese, Iniziativa e Movimento al tavolo, le quattro Salvezze, le Caratteristiche.
- Gli attacchi vengono dalle armi addosso (impugnate o pronte), dalla stessa voce di `scheda.equipaggiamento.armi` che usa «Attacca!»: VA effettivo, danno con il bonus di Caratteristica (o quello della munizione), natura, proprietà, portata o gittata, modalità, AC, `rif` del catalogo. Un'arma non in mano si misura mettendola in mano in una copia del personaggio.
- I Talenti diventano capacità speciali (nome e prima frase del testo), come promemoria: gli effetti generali sono già nei numeri, quelli situazionali e le opzioni di «Attacca!» legate ai Talenti si applicano a mano. Dal lotto 8 anche Azioni, Contromisure, Abilità e incantesimi completi (sezione «Nemici secondo A.73»).
- Nessun dato di gioco nuovo: la regola 3 non è servita.

**«Crea da un PG»**, nel Bestiario della plancia. Sceglie un personaggio (l'ultimo file di ognuno in `personaggi/`, o un file dal computer) e apre l'editor del nemico già compilato, con gli eventuali avvisi. Si rinomina il tipo (l'identificativo segue il nome) e si salva in `nemici/`. Il file del PG si legge soltanto.

**Il set** (`esempi/nemici/umani/`, 30 file, scritti da `tools/genera_nemici_umani.mjs`).
- Dieci tipi in tre gradi: Recluta (2° livello), Veterano (5°), Élite (8°). Nome «Tipo — Grado».
- Ogni nemico è un PG costruito con `tools/genera_esempi.mjs` → `costruisci`, poi passato al convertitore. «Carica esempi» li copia in `nemici/` senza sovrascrivere.
- Scelte comuni, non vincolate dal manuale:
  - Caratteristiche e Punti Abilità uno alla volta in un ordine di preferenza del ruolo, solo dove il motore li accetta; dopo le Abilità preferite, tutte le altre nell'ordine del manuale, così i punti si assegnano tutti.
  - Ai livelli con le Caratteristiche: le prime due della lista del ruolo che il motore accetta.
  - Talenti liberi (3°, 5°, 7° livello) e Talento a scelta di Classe (Grado II, 4° livello) da una lista di preferenza, con ripiego sul primo valido; tutte le preferenze sono state accettate.
  - Dado dei PV (e dei PM) dei Gradi al valore medio arrotondato per eccesso: d8 → 5, d6 → 4, d4 → 3.
  - Equipaggiamento iniziale del §2.16 con il modello corporativo: alla Recluta le prime opzioni; dal Veterano il fucile d'assalto e l'armatura media, dove la Classe le offre. Nessun acquisto in più.
  - Taumaturghi: incantesimi in ordine di livello e di nome, come per i PG d'esempio.
- Una riga per tipo (Corporazione, Addestramento e Classe; arma in mano; Talenti liberi e di Classe preferiti):
  - **Fante Capitol**: Capitol, Combattente, Soldato. Carabina CAR10, dal Veterano fucile d'assalto M40 e armatura media. Mira Rapida, Raffica Breve Migliorata, Copertura Migliorata; Supporto d'Attacco.
  - **Soldato Bauhaus**: Bauhaus, Combattente, Soldato. Carabina KR10, poi fucile d'assalto STG10 e armatura media. Copertura Migliorata, Mira Rapida, Buona Costituzione; Supporto di Difesa.
  - **Guerriero Mishima**: Mishima, Combattente, Assaltatore. Spada leggera e scudo piccolo, poi spada lunga, scudo medio e armatura media; pistola Ronin 25AP pronta. Affondo Migliorato, Parata Migliorata, Iniziativa Migliorata; Carica Brutale.
  - **Agente Cybertronic**: Cybertronic, Avventuriero, Agente. Pistola P500 e coltello. Pistolero, Estrazione Rapida, Schivata Migliorata; Mira Selettiva.
  - **Soldato Imperiale**: Imperiali, Combattente, Soldato. Carabina Defender, poi fucile d'assalto Conqueror 10 e armatura media. Mira Rapida, Sempre Allerta, Raffica Breve Migliorata; Supporto d'Attacco.
  - **Inquisitore della Fratellanza**: Fratellanza, Taumaturgo, Custode. Spada leggera, scudo dell'accolito, pistola Nemesis 100, una batteria da 5 PM; incantesimi completi per «Lancia!» (lotto 8). Resistenza alla Corruzione, Lancio in Combattimento, Resistenza alla Paura; Fenditura Mistica.
  - **Guardia di sicurezza**: Freelance, Combattente, Soldato. Carabina sempre, dal Veterano armatura media. Sempre Allerta, Copertura Migliorata, Visione Perfetta; Supporto di Difesa.
  - **Criminale di strada**: Freelance, Avventuriero, Lestofante. Pistola semiautomatica e pugnale. Estrazione Rapida, Pistolero, Ritirata Migliorata; Fuga tra la Folla.
  - **Mercenario**: Freelance, Combattente, Artigliere. Fucile d'assalto con mirino reflex e bipiede, coltello. Raffica Breve Migliorata, Mira Rapida, Ricarica Rapida; Raffica Estesa.
  - **Eretico**: Freelance, Combattente, Incursore. Pistola semiautomatica con silenziatore e pugnale da combattimento. Imboscata Migliorata, Resistenza alla Corruzione, Affondo Migliorato; Attacco Silenzioso. Solo la parte umana: nelle note un `TODO(Davide)` per i Doni dell'Oscura Simmetria, nessun potere inventato.
- PV / VA dell'arma in mano / AR ai tre gradi (Recluta · Veterano · Élite):

  | Tipo | Arma | Recluta | Veterano | Élite |
  |---|---|---|---|---|
  | Fante Capitol | CAR10 → M40 | 20 / 11 / 1 | 29 / 13 / 3 | 39 / 15 / 3 |
  | Soldato Bauhaus | KR10 → STG10 | 20 / 13 / 1 | 29 / 14 / 3 | 44 / 16 / 3 |
  | Guerriero Mishima | spada leggera → spada lunga | 19 / 12 / 2 | 29 / 13 / 5 | 39 / 15 / 5 |
  | Agente Cybertronic | P500 | 16 / 9 / 1 | 24 / 11 / 1 | 32 / 13 / 1 |
  | Soldato Imperiale | Defender → Conqueror 10 | 20 / 10 / 1 | 29 / 12 / 3 | 39 / 14 / 3 |
  | Inquisitore della Fratellanza | spada leggera | 16 / 10 / 2 | 23 / 14 / 2 | 31 / 16 / 2 |
  | Guardia di sicurezza | carabina | 20 / 11 / 1 | 29 / 13 / 3 | 39 / 15 / 3 |
  | Criminale di strada | pistola semiautomatica | 15 / 7 / 1 | 22 / 9 / 1 | 29 / 11 / 1 |
  | Mercenario | fucile d'assalto | 20 / 12 / 1 | 29 / 14 / 1 | 39 / 16 / 1 |
  | Eretico | pistola semiautomatica | 17 / 7 / 1 | 25 / 9 / 1 | 33 / 11 / 1 |

**Test.** `tests/nemici-umani.test.js` controlla:
- il convertitore su Torvald, con PV, AR, Difese, Iniziativa, Salvezze, VA e danno uguali a quelli della sua scheda;
- lo stesso VA finale e lo stesso danno in «Attacca!» per il PG e per il nemico convertito;
- il PG d'origine, che resta com'era;
- i 30 nemici: validi, senza problemi di costruzione e in sincronia con il generatore;
- i tre gradi, che crescono in PV, VA e Difese.

`tests/esempi.test.js` controlla anche la copia del bestiario umano con «Carica esempi».

**Prova nel browser.** Server sulla porta 3001 con cartelle temporanee:
- «Carica esempi»: 36 file copiati, 32 tipi validi nel Bestiario.
- «Crea da un PG» su Rhea: editor compilato (PV 28, AR 1, Difese 11, SR20 VA 14 1d6+4), rinominato «Tiratrice Capitol» e salvato; il file di Rhea non cambia.
- Scontro con i quattro PG d'esempio contro due «Fante Capitol — Recluta» e un «Agente Cybertronic — Veterano». L'Agente spara a Rhea con la P500 (VA 11), la colpisce, e «Colpito» precompilata porta Rhea da 28 a 23 PV.

## Nemici secondo A.73 (lotto 8, 2 ottobre 2026)

Davide ha risposto ad A.73 (E&L del 02/10, decisioni 5–9; `docs/risposte-master.md`, decisione 83). Il formato è su `main` (`data/formato_nemici.json`, `validaNemico`), portato qui con il merge.

**Formato.**
- Campi nuovi: `azioni` (Principali e di Movimento per Round, eccezioni), `contromisure` (nome del §5.24 e valore), `abilita` (nome e VA), `capacita` (nome, effetto, costo, limiti).
- Le sei Caratteristiche restano facoltative; una mancante non vale 0 e non ricalcola nulla.
- Movimento: Passo obbligatorio; Corsa e Scatto mancanti valgono 2× e 3× il Passo; `"non_consentito"` è diverso da «mancante».
- Incantesimi: completi con nome, livello, VA di lancio e costo in PM; incompleti restano un promemoria.

**Plancia.**
- **Ferite e Menomazioni** (decisione 7). Il nemico entra nello scontro con `ferite: 0`, `menomazioni: []` e i PM del tipo (`src/scontro.js` → `aggiungiNemici`). «Colpito» segue la procedura dei PG: a 0 PV il danno finale chiede la PS di Tempra e dà Ferite per fascia (§5.14). Le Menomazioni raggiunte per la prima volta (Profonda, Seria, Grave) si registrano con il promemoria della PS (§5.14.1; `src/danno.js` → `applicaColpo`, campo `menomazioni`). Nessun Affaticamento. `registraColpo` e `annullaUltimoColpo` salvano e ripristinano anche Ferite e Menomazioni. La carta mostra «Ferita Profonda (−4)» e le Menomazioni come la carta dei PG.
- **«Lancia!»** (decisione 8). Adattatore `src/nemico-lancio.js`, come `src/nemico-attacco.js` per «Attacca!»:
  - il nemico è un lanciatore senza Talenti né contenitori, con il VA della voce come Potere;
  - la scheda dell'incantesimo è ristretta alla versione del nemico, con il suo costo;
  - `src/lancio.js` non cambia: valgono Anticipazione, Focalizzazione, Ingaggio, componenti, circostanze e cumulo;
  - il VA della voce è «già calcolato per quella versione», perciò la base è VA − penalità di livello della sez. 1 e il totale torna il VA del nemico;
  - il danno è quello della versione, senza bonus di SAG, con un promemoria;
  - la Prova segue le regole del Taumaturgo (livelli 1–3 senza Prova), con un promemoria per chi non lo è.

  Il pannello è quello dei PG (`src/ui/lancio.js`, con il gancio `ctx.calcola`), aperto da `src/ui/lancio-nemico.js`. «Lancia» scrive il lancio nel registro e scala i PM del nemico (`registraLancioNemico`). Se l'incantesimo ha danno, si sceglie il bersaglio e si apre «Colpito» già compilata (`propostaLancio`): formula della versione, natura, Colpi come applicazioni. PM con − e + sulla carta (`variaPmNemico`). Un incantesimo incompleto, senza scheda o che si esegue con un Rituale resta un promemoria con il motivo.
- **Campi nuovi sulla carta e nell'editor.**
  - Sulla carta: Azioni per Round; Contromisure accanto alle Immunità; Abilità con il VA; capacità speciali in un riquadro richiudibile.
  - L'editor si genera dal formato: i campi nuovi compaiono da soli. Le scelte di Contromisure e Abilità usano le stesse fonti del validatore (`sorgentiNemico`). Corsa e Scatto hanno la casella «non consentito».
- **Movimento** (decisione 9; `src/nemici.js` → `movimentoNemico`, `testoMovimento`): «Passo 6 Q · Corsa 12 Q* · Scatto 18 Q* (* dal Passo)», oppure «Scatto non consentito», senza calcolo.
- **Parità d'Iniziativa** (decisione 6). Si confrontano DES, poi INT. Se a uno dei due manca la Caratteristica da confrontare, si va subito allo spareggio con 1d10, ripetuto finché c'è parità: non si passa a INT (`confrontoCar` in `src/scontro.js`).
- **A.78 negli attacchi dei nemici**: `esitoAttacco` passa `tipo: 'attacco'` a `esitoProva`, quindi con VA 20 o più si tira comunque.

**Esempi.**
- Il Legionario Oscuro e il Predone delle Lande hanno tutte e sei le Caratteristiche, Azioni, Abilità e capacità.
- Il Legionario ha anche Contromisura Imbottita 2, Scatto «non consentito», Dardo Psichico completo (livello 3, VA 10, 3 PM) e un rituale senza scheda come promemoria.
- I 30 umani sono rigenerati con `tools/genera_nemici_umani.mjs`. Il convertitore aggiunge sei Caratteristiche, Azioni, Contromisure delle protezioni in uso, le Abilità di Classe più Percezione, Furtività e Atletica, e i Talenti come capacità. Per gli incantesimi dei Taumaturghi prende la versione più alta accessibile, con VA e costo calcolati da «Lancia!» del PG.

**Test.**
- `tests/nemici-a73.test.js`: Ferita e Menomazione su un nemico, registrate e annullate; «Lancia!» con dati completi, Ingaggio, PM scalati e insufficienti, voci incomplete; movimento non consentito; parità con una Caratteristica mancante; A.78; esempi aggiornati.
- `tests/nemici-umani.test.js`: campi nuovi del convertitore su Torvald, e gli incantesimi dell'Inquisitore Veterano, con lo stesso VA e lo stesso costo in «Lancia!».
- `tests/danno.test.js`: Menomazioni come dato.

**Prova nel browser.** Server sulla porta 3007 con cartelle temporanee e gli esempi, cancellate alla fine.
- Scontro con Torvald, «Inquisitore della Fratellanza — Veterano 1» e «Legionario Oscuro 1».
- Carta dell'Inquisitore: PM 21/21, Azioni, Contromisure Imbottita 1, Abilità, otto incantesimi con «Lancia!». Carta del Legionario: «Scatto non consentito», un promemoria.
- L'Inquisitore lancia Colpo Elementale livello 8, VA 8 (10 − 2 di livello):
  - con l'Ingaggio, VA 6 e PM 21 → 13;
  - di nuovo senza Ingaggio, PM 13 → 5;
  - bersaglio Torvald, «Colpito» precompilata 3d6+5 Magico, 14 − AR 5 = 9, PV 32 → 23.
- Il Legionario prende 50 (PV 38 → 0), poi 17 − AR 5 = 12 a 0 PV. Si apre la PS di Tempra: fallimento, Ferite 0 → 3. La carta mostra «Ferita Profonda (−4)» e la Menomazione temporanea leggera.
- Larghezza del telefono: nessuno scorrimento orizzontale.

**Da segnalare a Davide** (nuove voci dopo A.83):
- Prova di Potere dei nemici: il formato non dice se un nemico è Taumaturgo, e la plancia applica le regole del Taumaturgo.
- Bonus di SAG al danno degli incantesimi dei nemici: il formato non lo prevede, e la plancia non lo aggiunge.

## 6. Rischi e domande aperte

**Rischi**
- **R1. Scritture incrociate.** Giocatore e master cambiano lo stesso PG insieme. Oggi vince il più recente, ma si può perdere una modifica.
  - Proposta per il pezzo 6: il master scrive solo la `sessione`, il giocatore solo le scelte. Il server unisce i due blocchi, con una versione per blocco.
  - È l'unica «unione», ed è per blocchi interi.
- **R2. Rete e sicurezza.** Dal 3 ottobre il server ascolta sempre sulla rete locale (prima solo con `--rete`): chiunque sulla rete locale può scrivere in `personaggi/` e `scontri/`.
  - Va bene a casa, non su una rete pubblica.
  - Rimedio semplice, se serve: un codice di sessione da inserire una volta, controllato dal server.
- **R3. Orologi diversi fra i PC.** Il confronto «più recente» usa l'ora del server per i file e quella del browser per la copia locale.
  - Sullo stesso PC non è un problema. In rete conviene che sia il server a timbrare anche le scritture dei browser (pezzo 6).
- **R4. Nomi uguali.** Due PG con lo stesso nome sono lo stesso file.
  - Per la cartella va bene (un nome per personaggio), ma andrebbe detto ai giocatori.
  - In alternativa, un identificativo dentro il nome del file. Questo però cambierebbe il formato dell'export, che oggi è uguale byte per byte.
- **R5. File storici.** Un file per giorno e per livello: la cartella cresce.
  - Il server non cancella. Un comando «archivia i vecchi» si può aggiungere quando serve.
- **R6. Telefono dei giocatori.** Polling e scritture ogni 1,5 secondi vanno bene in rete locale; con molti giocatori vanno contenuti (scrittura solo a riposo, già così).

**Domande per Marcello:** tutte risposte, nella sezione «Deciso» in testa.
