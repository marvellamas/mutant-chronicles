# Tavolo del Master: piano di fattibilità

Branch `tavolo-direttore`, 1° ottobre 2026. Piano di fattibilità; sono fatti il pezzo 1 (plancia dei PG in sola lettura), il pezzo 2 (scontro e Iniziativa), il pezzo 3 (nemici) e il pezzo 4 (danno applicato), più gli esempi del 2 ottobre.

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
2. **Valori dei nemici al tavolo:** PV attuali, Stati, Ferite, Sanguinamento. Il formato può essere quello di `sessione` dei PG (`src/sessione.js`), con i massimi presi dal nemico e non da `calcolaScheda`.
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
5. **Pezzo 5 — Attacchi dei nemici.**
   - Adattatore nemico → «Attacca!» (VA con la situazione, Difese del bersaglio).
   - Dado dal vivo o dell'app, poi «applica» con il pezzo 4.
   - Le Prove di contrasto (Difese del PG) vengono dai valori effettivi della sua scheda.
6. **Pezzo 6 — Scrittura delle schede dei giocatori al tavolo.**
   - La scheda del giocatore ricarica la propria sessione se la plancia l'ha cambiata (polling sul proprio file, regola del più recente con avviso).
   - Indicatore «collegato / non collegato».
7. **Pezzo 7 — Prova al tavolo e merge su `main`**, dopo una sessione di gioco vera.

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
