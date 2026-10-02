# Tavolo del Master: piano di fattibilità

Branch `tavolo-direttore`, 1° ottobre 2026. Piano di fattibilità; sono fatti il pezzo 1 (plancia dei PG in sola lettura), il pezzo 2 (scontro e Iniziativa), il pezzo 3 (nemici), il pezzo 4 (danno applicato), il pezzo 5 (attacchi dei nemici) e il pezzo 6 (giocatori collegati), più gli esempi del 2 ottobre e i nemici secondo le risposte di Davide ad A.73 (lotto 8). Resta il pezzo 7.

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
- Ascolta solo su localhost; con `--rete` si apre agli altri dispositivi della rete locale.
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
- **R2. Rete e sicurezza.** Con `--rete` chiunque sulla rete locale può scrivere in `personaggi/` e `scontri/`.
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
