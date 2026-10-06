<!-- Copia fedele del Google Doc «Mutant — Mappa di battaglia (specifica)», bozza 2, ID 1UB3U98NoumK35w4nL5KHOwg7Nc-ET_-FMot7weanM3s, modificato il 2026-10-06T09:56:13Z; scaricata in Markdown il 06/10/2026. Fonte per i lavori della mappa (branch battlemap): non si modifica a mano, si riscarica se il Doc cambia. Piano tecnico: docs/battlemap/piano.md. Eccezione: le righe segnate «Aggiunta di Marcello» (06/10/2026, dopo il primo test sul suo PC) sono state aggiunte qui su sua richiesta e non sono ancora nel Doc: vanno riportate nel Doc e conservate se lo si riscarica. -->

# **Mutant — Mappa di battaglia**

*Specifica funzionale, bozza 2 — 06/10/2026. Scritta senza riferimento all’app di Davide; il confronto con quella app è un passo successivo.*

## **1\. Scopo e principi**

La Mappa di battaglia è un modulo del **Tavolo del Master** di Mutant: gira sullo stesso server sul PC del master, in rete locale, senza account esterni. Unisce in **un’unica app** la mappa, gli scontri, le schede dei PG, i nemici e i veicoli già gestiti da Mutant.

> * **Snella:** poche funzioni, tutte utili al tavolo; il resto in fasi successive.  
> * **Collegata:** ogni token è un partecipante vero (PG, nemico, veicolo) con PV, Stati, Iniziativa e movimento presi dai dati di Mutant. Niente valori ricopiati a mano.  
> * **Regole del manuale:** Iniziativa, Passo/Corsa/Scatto, gittate, aree degli incantesimi seguono i manuali di SIMPLY RPG.  
> * **Il master decide:** l’app propone e calcola, il master può sempre correggere, bloccare o annullare.

## **2\. Definizioni**

> * **Q (quadretto):** unità della griglia; 1 Q \= 1,5 m, come nei manuali.  
> * **Scena:** una mappa con la sua griglia, i muri, la nebbia e i token posizionati; si salva e si riapre.  
> * **Token:** la pedina di un partecipante sulla mappa.  
> * **Vista master:** lo schermo del master, che vede tutto.  
> * **Vista giocatori:** lo schermo condiviso (televisore, proiettore o tablet sul tavolo) che mostra solo ciò che i giocatori possono vedere.  
> * **Tab BattleMap:** la vista della mappa dentro la scheda di ciascun giocatore, sul suo dispositivo.  
> * **Template:** area semitrasparente piazzata sulla mappa (quadrato, cono, cerchio, oppure area rettangolare libera definita trascinando) per effetti ad area. Dura 1 Round se non specificato diversamente; può durare più Round o essere permanente.  
> * **Area raggiungibile:** i quadretti che un token può raggiungere nel suo turno con Passo, Corsa o Scatto.

## **3\. Schermi**

> * **Vista master** (PC del master): mappa completa, nebbia semitrasparente, token nascosti visibili, muri, barra dello scontro, tutti i comandi.  
> * **Vista giocatori** (secondo indirizzo, aperto su un altro schermo): mappa con la nebbia piena, solo token visibili, barra dell’Iniziativa; nessun comando del master. **Il filtro è applicato dal server**: ciò che è nascosto non arriva proprio al dispositivo.  
> * **Tab BattleMap** (scheda del giocatore): come la vista giocatori; il giocatore può muovere **solo il proprio token**, nel proprio turno, dentro l’area raggiungibile. Il master può bloccare i movimenti di tutti.  
> * Ogni schermo ha il proprio zoom e la propria posizione.

## **4\. Mappa**

> * **Immagine di fondo:** JPG, PNG o WEBP caricata dal master. Il server ne prepara una copia ridotta per tablet e telefoni.  
> * **Griglia:** quadrettata, regolabile in dimensione e scostamento (tracciando un quadretto sull’immagine o inserendo i valori), colore e trasparenza; poi si **blocca**.  
> * **Zoom:** rotella del mouse e tasti \+ / −.  
> * **Spostamento:** barra spaziatrice tenuta premuta \+ movimento del mouse; anche trascinando un punto vuoto.  
> * **Scene:** salvate in una cartella sul PC del master; si possono preparare prima della sessione, come «Prepara scontro», e collegare a una bozza di scontro.

## **5\. Nebbia di guerra**

> * All’apertura di una scena la mappa è coperta (o scoperta, a scelta del master).  
> * Il master rivela e copre con un **pennello** (per quadretti) o un **rettangolo**.  
> * Nella vista master la nebbia è semitrasparente; nella vista giocatori è piena.  
> * *Fase successiva:* rivelazione automatica in base alla vista dei PG.

## **6\. Muri e ostacoli**

> * **Editor dei muri:** il master segna con un pennello i quadretti invalicabili (muri, rocce, acqua profonda) ed eventualmente il terreno difficile.  
> * I muri bloccano movimento e linea di tiro.  
> * *Fase 2:* **porte** apri/chiudi sui muri.  
> * *Fase 3:* **pre-analisi con AI** dell’immagine: l’AI propone muri e aree invalicabili, il master corregge con il pennello. Richiede una chiave API e internet sul PC del master.

## **7\. Token**

> * **Origine:** PG dal ritratto della scheda; nemici dal bestiario o da «Crea nemico»; veicoli dal loro record unico. Senza immagine: cerchio colorato con le iniziali.  
> * **Dimensione:** secondo la Taglia: 1 Q, oppure 2×2 Q per le creature grandi (e 3×3 se indicato).  
> * **Posizione:** sempre al centro di un quadretto; non esistono posizioni intermedie.  
> * **Stato visibile:** anello dei PV, icone degli Stati, evidenziazione del token di turno.  
> * **Nascosti:** il master può nascondere un token (visibile solo a lui) e rivelarlo.  
> * *Facoltativo, fase 3:* generazione dell’immagine del token con AI quando manca (chiave API, internet, piccolo costo per immagine).

## **8\. Movimento e area raggiungibile**

> * Selezionando un token compare l’**area raggiungibile con il Passo**, calcolata sulla griglia tenendo conto di muri e altri token.  
> * Dal menu del token: **Corri** o **Scatta** ampliano l’area (Passo / Corsa / Scatto dalla scheda, per esempio 6 / 12 / 18 Q), in tre colori.  
> * Si muove cliccando un quadretto dell’area (o trascinando); l’app registra il movimento del Round.  
> * **Annulla ultimo movimento** riporta il token dov’era.  
> * Come contano le diagonali e il terreno difficile: da confermare con Davide (A.124).  
> * Veicoli: si muovono all’Iniziativa del conducente con la loro andatura (A.105).

## **9\. Linea di tiro**

> * Dal menu del token, **Linea di tiro**: si clicca un punto o un token e compare una linea dal centro del token al punto.  
> * La linea mostra la **distanza in Q** e la **fascia di gittata** dell’arma scelta.  
> * **Colore:** verde se libera, giallo se attraversa altri token (PG o nemici: possibile Copertura), rosso se un muro la blocca.  
> * Da lì si può aprire «Attacca\!» con bersaglio e distanza già impostati.

## **10\. Template**

> * Forme: **quadrato, cono, cerchio**, adattati ai quadretti, e **area rettangolare libera** definita trascinando sulla mappa.  
> * Colori da una serie predefinita, semitrasparenti; si spostano, ruotano (il cono) ed eliminano.  
> * **Durata:** 1 Round se non indicato diversamente; si può impostare un numero di Round o «permanente». Scadono con il contatore dei Round dello scontro, con un avviso.  
> * Dal menu del token: **Genera un template da questo punto**, poi scelta di forma, misure e durata.  
> * Collegamento con «Lancia\!»: un incantesimo ad area propone il template della misura e della durata giuste.  
> * I token coperti dal template vengono evidenziati (utile per scegliere i bersagli).

## **11\. Gestione dello scontro**

> * **Barra laterale dello scontro:** è la plancia del Tavolo già esistente, ridisegnata come pannello accanto alla mappa.  
> * Cliccando un token si apre la sua mini-scheda nella barra (PV, Stati, attacchi, «Colpito», incantesimi); i danni si applicano da lì.  
> * **Barra dell’Iniziativa** in alto: una barra graduata con i mini-token (foto o iniziali colorate) posizionati sul loro valore di Iniziativa; il token di turno è evidenziato; «Avanti» passa al successivo e al nuovo Round.  
> * Tutto ciò che fa già la plancia resta: Round, durate, Sanguinamento e Stati periodici, bozze, «Crea nemico», veicoli.
> * **Aggiunta di Marcello (06/10/2026): non si lascia mai la mappa con un clic.** Il clic su un token apre la sua mini-scheda in un pannello a lato della mappa (la mini-scheda della plancia: PV, Stati, «Colpito», attacchi), con «Apri scheda completa» per un PG e «Apri nella plancia» per la plancia intera. La scheda completa di un PG, o la plancia, aperte dalla mappa hanno in alto un pulsante grande e ben visibile **«Torna alla mappa»** che riporta alla stessa scena, allo stesso zoom e alla stessa posizione, con il token e la mini-scheda di prima.

### **11.1 Ridimensionamento rapido mappa ↔ scontro**

Lo spazio dello schermo si sposta in un attimo fra mappa e barra dello scontro, a seconda di cosa serve in quel momento.

> * **Tre disposizioni** con un pulsante ciascuna, sempre visibili in alto: **Mappa grande** (barra ridotta a una colonna stretta con i mini-token e i PV), **Equilibrata** (circa due terzi mappa, un terzo scontro), **Scontro grande** (barra larga con le mini-schede complete, mappa ridotta).  
> * **Scorciatoia** per passare da una disposizione all’altra (per esempio il tasto **Tab**), più **doppio clic sul bordo** fra mappa e barra.  
> * **Trascinamento del bordo** per una larghezza libera.  
> * Con la barra ridotta, cliccare un token la riapre sulla sua mini-scheda.  
> * La scelta resta memorizzata per quello schermo.

## **12\. Comandi**

### **Scorciatoie**

> * **Rotella / \+ / −:** zoom.  
> * **Barra spaziatrice \+ mouse:** sposta la mappa.  
> * **Tab:** cambia la disposizione mappa ↔ scontro.  
> * **Ctrl \+ clic su un token:** apre la scheda (PG) o la mini-scheda (nemico).  
> * **Aggiunta di Marcello (06/10/2026):** il clic semplice su un token apre la sua mini-scheda a lato della mappa, senza lasciarla; dalla scheda completa o dalla plancia aperte dalla mappa si torna con **«Torna alla mappa»** (stessa scena, zoom e posizione), come al §11.  
> * **Alt \+ clic su un token:** linea di tiro verso il punto cliccato dopo.  
> * **Ctrl \+ Z:** annulla l’ultima azione del master.  
> * **Esc:** chiude menu e strumenti.  
> * Elenco definitivo da stabilire; le scorciatoie si mostrano nei suggerimenti dei pulsanti.

### **Menu con clic destro sul token**

> * Linea di tiro  
> * Corri / Scatta (amplia l’area raggiungibile)  
> * Genera un template da questo punto  
> * Annulla ultimo movimento  
> * (master) Nascondi / Mostra, Apri scheda, Togli dalla mappa

### **Menu superiore**

Le stesse azioni più gli strumenti del master: carica mappa, griglia, nebbia, muri, template, scene, disposizione mappa ↔ scontro, blocco dei movimenti dei giocatori.

## **13\. Notifiche e suoni**

> * **Avvisi nell’app** (tab BattleMap e scheda aperta sul tablet): «Sei il prossimo: preparati\!», «È il tuo turno», «Il tuo incantesimo scade al prossimo Round».  
> * **Richiamo del master:** il master può mandare un avviso a un giocatore o a tutti, con un breve testo.  
> * **Suoni brevi** e **vibrazione** (sui dispositivi Android) per turno e richiami, con un interruttore per spegnerli. Il browser riproduce i suoni solo dopo il primo tocco sulla pagina.  
> * **Limite:** le notifiche di sistema con l’app chiusa o in secondo piano non sono possibili su una rete locale senza HTTPS; gli avvisi funzionano con la pagina aperta. Consiglio: tablet con lo schermo che non si spegne durante la sessione.

## **14\. Fasi**

### **Versione minima (utilizzabile al tavolo)**

> * Mappa, griglia, zoom e spostamento; scene salvate.  
> * Vista master e vista giocatori con filtro dal server.  
> * Nebbia manuale.  
> * Token collegati allo scontro, con Taglia, PV e Stati; token nascosti.  
> * Muri con il pennello; area raggiungibile con Passo/Corsa/Scatto; annulla movimento.  
> * Barra laterale dello scontro con ridimensionamento rapido, barra dell’Iniziativa.  
> * Menu con clic destro e scorciatoie principali.

### **Fase 2**

> * Tab BattleMap con movimento dei giocatori dal tablet.  
> * Linea di tiro con Copertura; template (anche rettangolari e con durata) e collegamento a «Lancia\!».  
> * Porte; veicoli sulla mappa.  
> * Avvisi di turno, richiami del master, suoni.

### **Fase 3**

> * Pre-analisi dei muri con AI; token generati con AI.  
> * Rivelazione automatica della nebbia; luci e linea di vista.

## **15\. Decisioni e domande per Davide**

> * **Iniziativa — deciso:** si usa il sistema del Manuale del Giocatore di Mutant (Mod DES \+ Mod INT \+ 1d10; parità per DES, poi INT, poi scelta fra alleati o 1d10 fra avversari). Il d12 dell’app di Davide appartiene al sistema precedente.  
> * **Ancora da chiedere** (Doc fisso): A.121 (riuso del suo codice), A.122 (funzioni usate davvero), A.124 (Azioni extra, movimento, diagonali), A.125 (porte, luci, veicoli).

## **16\. Fuori ambito**

> * Account e login esterni; uso via internet fuori dalla rete locale.  
> * Costruttore di mappe a stanze, mappe video, effetti grafici elaborati.
