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
> * **Regole confermate da Davide il 06/10/2026** (lotto R6, parametri in `data/mappa.json` → movimento):
>   * **A.124:** ogni diagonale costa 1 Q; non si attraversano muri né passaggi ostruiti. Passo 6, Corsa 12, Scatto 18 Q con i modificatori; il master corregge con «Libero». La mappa non conta le AzP (1 ai livelli 1–11, 2 ai 12–20, nella stessa Iniziativa).
>   * **A.127:** i quadretti degli alleati si attraversano al costo normale, quelli dei nemici no; non ci si ferma in un quadretto occupato; una pedina grande vuole libero tutto l’ingombro d’arrivo; attraversare un alleato non evita gli Attacchi di Opportunità.
>   * **A.128:** terreno difficile 2 Q per quadretto, anche in diagonale e in Corsa e Scatto; percorsi misti contati a tratti.
>   * **A.129:** solo il **Passo** si divide in più clic, prima e dopo le Azioni Principali (2 Q, attacco, altri 4 Q). **Corsa** e **Scatto** sono un **blocco unico**: il token si muove una volta sola e i Q non usati si perdono; dopo il blocco il movimento del Round è finito. Il pannello mostra «Q usati / disponibili» con quanto resta del Passo diviso, oppure i Q persi; pulsanti e clic destro spengono Corri e Scatta quando non si possono più scegliere, e un avviso lo spiega.
>   * **Domande aperte:** A.134 (diagonale rasente allo spigolo di un muro; provvisorio no) e A.136 (Corsa o Scatto dopo un Passo già cominciato; provvisorio no: si annulla il movimento e lo si rifà con Corri).
> * Veicoli: si muovono all’Iniziativa del conducente con la loro andatura (A.105).
> * **Ritocchi del 06/10/2026 (test di Marcello sul lotto 6):** l’area non è obbligatoria: l’interruttore **«Mostra area»** (nel pannello del token, nel clic destro e con il tasto **M**) la nasconde e la mostra, e la scelta resta memorizzata; il percorso al passaggio del mouse resta anche con l’area nascosta. L’area è **leggera**: riempimento molto trasparente e contorno ben visibile di ogni fascia, così la mappa sotto si vede (opacità in `data/mappa.json`).

### **8.1 Zone di controllo e Attacchi di Opportunità (07/10/2026)**

> * **Regola del manuale (Giocatore §5.3):** «Un personaggio provoca un Attacco di Opportunità quando, con un Movimento volontario, esce dalla portata ravvicinata di un avversario in grado di attaccarlo»; non lo provocano il movimento forzato, l’ingresso nella portata, lo spostamento all’interno, la Ritirata e il teletrasporto; una sola volta per Round. La portata è quella dell’arma ravvicinata (Armamenti §7.1.2: 1 Q di norma, 2–3 Q per armi lunghe).
> * **ZoC:** la fascia profonda quanto la portata attorno a tutto l’ingombro del token avversario (non a 0 PV, non Svenuto, non veicolo; per i giocatori non nascosto). Mentre un token è scelto o si muove le ZoC dei suoi avversari sono in rosso semitrasparente (interruttore «Mostra ZoC», tasto Z); i passi del percorso nella ZoC sono evidenziati; l’area non cambia.
> * **Avviso:** a movimento fatto (non «Libero»), uscendo dalla portata di un avversario: «Oshi è uscito dalla ZoC di Legionario 1! Attacco di Opportunità…», uno per avversario, con «Attacca!» dell’avversario e il bersaglio già scelto; riga nel registro e avviso nella vista giocatori. Nessun tiro automatico. Domande A.132 (Stordito) e A.133 (creature grandi).

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
> * **Aggiunta di Marcello (06/10/2026):** la via principale è un **mini-menu dei template** (forma, misura, colore, durata) da cui il master sceglie e piazza; il template proposto da un incantesimo («Lancia!») è **facoltativo**, una comodità in più.

## **11\. Gestione dello scontro**

> * **Barra laterale dello scontro:** è la plancia del Tavolo già esistente, ridisegnata come pannello accanto alla mappa.  
> * Cliccando un token si apre la sua mini-scheda nella barra (PV, Stati, attacchi, «Colpito», incantesimi); i danni si applicano da lì.  
> * **Barra dell’Iniziativa** in alto: una barra graduata con i mini-token (foto o iniziali colorate) posizionati sul loro valore di Iniziativa; il token di turno è evidenziato; «Avanti» passa al successivo e al nuovo Round.  
> * Tutto ciò che fa già la plancia resta: Round, durate, Sanguinamento e Stati periodici, bozze, «Crea nemico», veicoli.
> * **Ritocchi del 06/10/2026 — barra dell’Iniziativa:** non un riquadro, ma una **linea spessa graduata** su cui i mini-token stanno al loro punteggio, dal più alto (a sinistra) al più basso. La linea si colora man mano che il turno avanza: dal punteggio più alto fino a chi è di turno è colorata, il resto è grigio; al nuovo Round si azzera. L’interruttore **«Centra su attivo»** (acceso / spento ben visibile) centra la mappa sul token di turno se è fuori vista. **«Avanti»** seleziona il nuovo token di turno: mini-scheda aperta e area di movimento sul token attivo (il precedente non resta selezionato).
> * **Ritocchi del 06/10/2026 — barra laterale ordinata:** in cima alla barra i **segnalibri** fissi; un clic porta alla sezione e il segnalibro attivo è evidenziato. Le sezioni, in quest’ordine (dal token che si sta muovendo agli strumenti di preparazione):
>   1. **Mini-scheda:** il token scelto, il suo movimento (Passo / Corri / Scatta / Libero, «Mostra area», usati / disponibili), Nascondi, Togli;
>   2. **Iniziativa:** Round, «Avanti», «Fine scontro», ordine d’Iniziativa, tiri da fare;
>   3. **PG:** mini-schede dei PG al tavolo e veicoli;
>   4. **Nemici:** mini-schede dei nemici nello scontro;
>   5. **Scontro:** chi è al tavolo, «Prepara scontro» (bozze), «Crea nemico», aggiungi nemici e partecipanti, durate, registro, «Collega i giocatori», bestiario;
>   6. **Mappa:** collegamento allo scontro e token da mettere, muri, nebbia, vista giocatori, griglia, scene.
>
>   Niente doppioni: le scene stanno solo nel gruppo Mappa, «Apri nella plancia» solo nella mini-scheda.
> * **Ritocchi del 06/10/2026 — «Prepara scontro»:** «Tutti» / «Nessuno» sopra le caselle dei PG; la bozza si salva da sola e lo dice («Salvata alle hh:mm»), con **«Salva e chiudi»**; sotto i pulsanti la spiegazione di **«Inizia»** (avvia lo scontro, la bozza resta riutilizzabile) e di **«Inizia e consuma la bozza»** (avvia e archivia la bozza); **«Prepara la mappa»** apre la mappa con una scena collegata alla bozza (una esistente o una nuova), pronta per mettere i token.
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
> * **M:** mostra o nasconde l’area di movimento.  
> * **Ctrl \+ clic su un token:** apre la scheda (PG) o la mini-scheda (nemico).  
> * **Aggiunta di Marcello (06/10/2026):** il clic semplice su un token apre la sua mini-scheda a lato della mappa, senza lasciarla; dalla scheda completa o dalla plancia aperte dalla mappa si torna con **«Torna alla mappa»** (stessa scena, zoom e posizione), come al §11.  
> * **Alt \+ clic su un token:** linea di tiro verso il punto cliccato dopo.  
> * **Ctrl \+ Z:** annulla l’ultima azione del master.  
> * **Esc:** chiude menu e strumenti.  
> * Elenco definitivo da stabilire; le scorciatoie si mostrano nei suggerimenti dei pulsanti.

### **Menu con clic destro sul token**

> * Linea di tiro  
> * Corri / Scatta (amplia l’area raggiungibile), Libero
> * Mostra / Nascondi area (M)  
> * Genera un template da questo punto  
> * Annulla ultimo movimento  
> * (master) Nascondi / Mostra, Apri scheda, Togli dalla mappa

> * **Fatto nel lotto 7 (06/10/2026):** menu completo anche con la **pressione lunga** sul tablet; voci Passo / Corri / Scatta / Libero, Mostra area, Annulla ultimo movimento, Nuovo turno, Apri mini-scheda, Apri scheda completa, Nascondi / Mostra, Colore del bordo, Togli dalla mappa. Linea di tiro e template arriveranno con la fase 2.

### **Menu superiore**

Le stesse azioni più gli strumenti del master: carica mappa, griglia, nebbia, muri, template, scene, disposizione mappa ↔ scontro, blocco dei movimenti dei giocatori.

> * **Fatto nel lotto 7 (06/10/2026):** menu «Strumenti» (immagine, griglia, nebbia, muri e terreno, vista giocatori, scene, collegamento, «Blocca movimenti dei giocatori», pronto per la fase 2), pulsanti delle disposizioni e «?» con l'elenco delle scorciatoie. Nomi e conferme con finestrelle dentro la pagina, non con quelle del browser.
> * **Colori dei bordi (decisione di Marcello del 06/10/2026):** PG bordo pieno, un colore per PG (blu, rosso, giallo, verde chiaro, azzurro, arancione, verde scuro), stabile nella scena e modificabile; nemici bordo tratteggiato nero e colore del tipo (viola, lilla, verde marcio, bordeaux, marrone, grigio piombo, ocra scura), uguale per le copie; alleati non PG bordo doppio grigio-petrolio; veicoli il colore del PG proprietario (grigio se del gruppo); alone del turno bianco luminoso. Stessi colori nella barra dell'Iniziativa e nella vista giocatori.

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
> * Linea di tiro con Copertura; template (anche rettangolari e con durata) da un **mini-menu dei template** (forma, misura, colore, durata); il collegamento a «Lancia\!» è facoltativo.  
> * Porte; veicoli sulla mappa.  
> * Avvisi di turno, richiami del master, suoni.

### **Fase 3**

> * Pre-analisi dei muri con AI; token generati con AI.  
> * Rivelazione automatica della nebbia; luci e linea di vista.

## **15\. Decisioni e domande per Davide**

> * **Iniziativa — deciso:** si usa il sistema del Manuale del Giocatore di Mutant (Mod DES \+ Mod INT \+ 1d10; parità per DES, poi INT, poi scelta fra alleati o 1d10 fra avversari). Il d12 dell’app di Davide appartiene al sistema precedente.  
> * **Risposte del 06/10/2026:** A.121 ritirata; A.122 priorità delle funzioni (resta «Aiuto-master»); A.124, A.127, A.128 e A.129 sul movimento, applicate il 07/10 (§8); A.125 porte e luci (restano i veicoli e le vecchie etichette delle luci).  
> * **Ancora aperte:** A.126 (creature 3 × 3), A.132 (Stordito e AdO), A.133 (portata delle creature grandi), A.134 (diagonale rasente allo spigolo), A.136 (Corsa o Scatto dopo un Passo cominciato).

## **16\. Fuori ambito**

> * Account e login esterni; uso via internet fuori dalla rete locale.  
> * Costruttore di mappe a stanze, mappe video, effetti grafici elaborati.
