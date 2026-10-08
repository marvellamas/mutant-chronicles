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

### **3.1 Movimento in diretta nella vista giocatori (07/10/2026)**

> * **Perché:** al tavolo il secondo schermo lo guardano i giocatori; quando il master muove i loro token devono vedere dove possono andare e che cosa rischiano.
> * **Che cosa vedono:** finché il master tiene scelto un token (o lo trascina), sul loro schermo compaiono la stessa **area di movimento** con il contorno, la riga «Movimento di Oshi: Corsa · 3 / 12 Q usati» sopra la mappa (anche a schermo intero), il **percorso** che il master indica col mouse con il costo in Q e i passi dentro una ZoC evidenziati, le **ZoC** degli avversari visibili del token (stesso rosso semitrasparente) e il token scelto evidenziato. Tutto sparisce appena il master lascia il token (Esc, clic fuori, altro clic sul token) o la mappa.
> * **Interruttori del master** (sezione «Vista giocatori», salvati nella scena): «Mostra il movimento ai giocatori» (acceso per impostazione predefinita) e «Mostra le ZoC ai giocatori».
> * **Canale:** lo stato «selezione / area / percorso / ZoC» non si salva nella scena. Il master lo manda al server a ogni cambio (PUT `/api/vista-giocatori/diretta`, al più una richiesta in volo); il server lo filtra e lo spinge alle viste giocatori con un flusso di eventi (EventSource, GET dello stesso indirizzo), che dice anche «aggiorna» quando scena, scontro o scelta cambiano. Latenza misurata nella prova del 07/10 sullo stesso PC: 2–7 ms dal master allo schermo dei giocatori. La lettura ogni secondo della vista resta come riserva.
> * **Segreti (filtro del server, `src/mappa/diretta.js`):** nessuna diretta per un token nascosto o tutto sotto la nebbia; l'area perde i Q sotto la nebbia; il percorso si interrompe dove il token sparirebbe nella nebbia; le ZoC solo degli avversari che i giocatori vedono, e i passi «in ZoC» li calcola la vista giocatori da quelle. L'area per i giocatori la calcola il master senza gli ostacoli che i giocatori non vedono: un buco nell'area non rivela un nemico nascosto (il percorso mostrato può quindi essere più corto di quello vero). I PV seguono le regole della vista (nemici solo se il master li mostra).
> * **Template (fase 2):** lo stato condiviso ha già il posto (`template`), con la regola della vista: niente template nascosti o con l'origine sotto la nebbia.
> * **Adatta allo schermo (07/10/2026):** nella vista giocatori il pulsante «⤢ Adatta» in basso a destra, ben visibile (contrasto come i pulsanti del master; resta a schermo intero e con la barra dell'Iniziativa) e il tasto A, come nel master, inquadrano tutta la parte di mappa scoperta; il master può chiederlo da «Vista giocatori» → «Adatta lo schermo dei giocatori» (evento «adatta» sul flusso della diretta). L'adattamento si rifà da solo quando il riquadro cambia misura, finché nessuno ha toccato la vista. La vista giocatori controlla `versione.json` ogni 20 s e a ogni ricollegamento del flusso: con una versione nuova si ricarica da sola (a schermo intero la barra «Nuova versione» non si vede).

## **4\. Mappa**

> * **Immagine di fondo:** JPG, PNG o WEBP caricata dal master. Il server ne prepara una copia ridotta per tablet e telefoni.  
> * **Griglia:** quadrettata, regolabile in dimensione e scostamento (tracciando un quadretto sull’immagine o inserendo i valori), colore e trasparenza; poi si **blocca**.  
> * **Zoom:** rotella del mouse e tasti \+ / −.  
> * **Spostamento:** barra spaziatrice tenuta premuta \+ movimento del mouse; anche trascinando un punto vuoto.  
> * **Scene:** salvate in una cartella sul PC del master; si possono preparare prima della sessione, come «Prepara scontro», e collegare a una bozza di scontro.
> * **Posizione iniziale (07/10/2026; `src/mappa/iniziale.js`).** «Strumenti → Salva posizione iniziale» registra nella scena posizione, ingombro e «nascosto» di ogni token, le porte, i template e la nebbia (non muri e terreno, che sono la struttura della scena, né lo scontro); un solo salvataggio, sovrascrivibile con conferma, con data e ora nella voce. «Ripristina posizione iniziale» (con conferma) rimette tutto com’era: i token il cui partecipante non è più nello scontro si ignorano con un avviso, quelli nuovi restano dove sono, i Q usati e le AzP del Round ripartono da 0, i template a durata ripartono dal Round attuale; PV, Stati e registro dello scontro non cambiano; Ctrl+Z annulla il ripristino. Aprendo la mappa da «Prepara scontro» → «Prepara la mappa», se la scena ha una posizione iniziale, si propone di partire da quella.
> * **Persistenza (verificata il 07/10/2026 con una prova vera: server chiuso subito dopo l’ultima azione).** Si conservano: token e posizioni, Q usati e AzP del Round (movimenti e azioni nella scena), porte, template con la loro scadenza, nebbia, posizione iniziale, cronologia di Ctrl+Z (sta nella scena), e nello scontro PV, Round, turno e registro. Non si conservano: il token scelto, lo zoom e la posizione della vista (tranne tornando da scheda o plancia), la diretta per i giocatori (si rifà da sola). La scena si salva 600 ms dopo l’ultima modifica; se il server è chiuso in quel momento, la pagina rimasta aperta riprova ogni 5 s e salva appena torna; se la pagina va in secondo piano o si chiude, il salvataggio parte subito (chiudendo, con keepalive, per le scene fino a 60 kB; oltre, una richiesta normale che il browser può interrompere). Le scritture sul server sono atomiche e in coda: un file a metà non esiste.

## **5\. Nebbia di guerra**

> * All’apertura di una scena la mappa è coperta (o scoperta, a scelta del master).  
> * Il master rivela e copre con un **pennello** (per quadretti) o un **rettangolo**.  
> * Nella vista master la nebbia è semitrasparente; nella vista giocatori è piena.  
> * *Fase successiva:* rivelazione automatica in base alla vista dei PG.

## **6\. Muri e ostacoli**

> * **Editor dei muri:** il master segna con un pennello i quadretti invalicabili (muri, rocce, acqua profonda) ed eventualmente il terreno difficile.  
> * I muri bloccano movimento e linea di tiro.  
> * **Porte (fatto il 07/10/2026, fase 2, lotto 2; `src/mappa/porte.js`, `data/mappa.json` → porte; A.125, decisione 130).** Regola di Davide: aprire o chiudere una normale porta accessibile e non bloccata costa **1 AzP**, senza Prova, essendo adiacenti e con una mano libera; attraversarla consuma il normale movimento; una porta bloccata richiede prima di sbloccarla, scassinarla o forzarla; «chiusa» e «bloccata» sono distinte.
>   * **Disegno:** «Strumenti → Muri e terreno → Porta»: un clic su un Q di muro mette una porta (aperta, chiusa o bloccata; «segreta» a scelta), un clic su una porta la toglie. Aperta = stipiti verdi e varco tratteggiato; chiusa = battente marrone; bloccata = battente rosso con la croce; segreta (solo master) = contorno viola tratteggiato con la «S». Dati nella scena (`porte`, `azioni`), validati.
>   * **Orientamento (ritocchi del 07/10/2026):** la porta segue il muro: muri (o altre porte) sopra e sotto → verticale, a destra e a sinistra → orizzontale (si contano i Q accanto e, a parità, quelli a due Q; a parità piena orizzontale). Durante il piazzamento un’anteprima mostra la porta sotto il puntatore e ← → la girano (la scelta resta per le porte successive; «Automatico» nel pannello torna ai muri); sulla porta già messa clic destro → «Ruota». L’orientamento si salva nella porta (`orientamento`, facoltativo: le scene di prima lo ricavano dai muri) e arriva così alla vista giocatori. Movimento e linea di visuale guardano il Q intero della porta, quindi l’orientamento non li cambia.
>   * **Movimento:** aperta = passaggio; chiusa o bloccata = muro per l’area e il percorso: in diagonale si passa rasente a una porta chiusa, non fra una porta chiusa e un muro a spigolo (A.124, A.134).
>   * **Aprire e chiudere:** il master con un clic sulla porta (o clic destro: Apri, Chiudi, Blocca, Sblocca, Rivela / Rendi segreta, Togli); il token scelto adiacente con «Apri porta» / «Chiudi porta» (clic destro o pannello): 1 AzP contata nel Round accanto ai Q usati (non blocca nulla) e una riga nel registro. Bloccata: «Porta bloccata: serve sbloccarla, scassinarla o forzarla»; «Sblocca» solo dal master. Adiacente anche in diagonale (A.139).
>   * **Giocatori:** le porte visibili con il loro stato (arrivano dopo il salvataggio della scena, entro un secondo); le **segrete** non rivelate sono un Q di muro anche nei dati del server, e muro anche per l’area di movimento mostrata ai giocatori.
>   * **Vista:** per ora le porte non cambiano la nebbia; con la linea di visuale (prossimo lotto) le porte chiuse e bloccate fermeranno la vista (`porte.bloccano_vista`).
> * *Fase 3:* **pre-analisi con AI** dell’immagine: l’AI propone muri e aree invalicabili, il master corregge con il pennello. Richiede una chiave API e internet sul PC del master.

## **7\. Token**

> * **Origine:** PG dal ritratto della scheda; nemici dal bestiario o da «Crea nemico»; veicoli dal loro record unico. Senza immagine: cerchio colorato con le iniziali.  
> * **Dimensione:** secondo la Taglia: 1 Q, oppure 2×2 Q per le creature grandi (e 3×3 se indicato).  
> * **Posizione:** sempre al centro di un quadretto; non esistono posizioni intermedie.  
> * **Stato visibile:** barretta rossa dei PV sul fondo del token (07/10/2026, al posto dell'anello: lunga quanto i PV rimasti), icone degli Stati, alone bianco del token di turno.  
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
>   * **A.134 (risposta di Marcello del 07/10):** in diagonale si passa rasente allo spigolo di un muro (uno dei due quadretti ai lati murato); se lo sono entrambi (passaggio chiuso a spigolo) la diagonale è vietata. Le porte chiuse o bloccate contano come muri (`data/mappa.json` → movimento.diagonale_spigolo).
>   * **Domanda aperta:** A.136 (Corsa o Scatto dopo un Passo già cominciato; provvisorio no: si annulla il movimento e lo si rifà con Corri).
> * Veicoli: si muovono all’Iniziativa del conducente con la loro andatura (A.105; per la mappa confermato da A.125, risposta di Marcello del 07/10).
> * **Veicoli sulla mappa (fase 2, lotto 5, fatto il 07/10):**
>   * **Token:** immagine e ingombro dalla scheda del veicolo (`data/veicoli.json` → profili[].mappa.immagine con il muso, dimensioni.ingombro_q): lo ASA Scout è 4 × 2 Q come nel suo manuale, con l’immagine `img/Tokens/ASAScout-mappa.png`. Entra con il muso in basso.
>   * **Orientamento:** a passi di 90° (frecce ← → prima del clic che lo mette e con il veicolo scelto; clic destro → «Ruota»; pannello «↺ Ruota» e «Ruota ↻»); l’immagine ruota con l’ingombro, attorno al centro, non su muri o token; Ctrl+Z annulla. I 45° no: un rettangolo in diagonale non sta su Q interi.
>   * **Movimento:** all’Iniziativa del conducente (quello della scheda del veicolo, A.91), una volta per Round, area sull’ingombro intero; senza conducente il mezzo è fermo (il master lo sposta con Libero).
>   * **A bordo:** clic destro su un PG o un nemico accanto (1 Q) → «Sali su … come conducente» (solo un PG: diventa il conducente della scheda) o «come passeggero», entro i posti del profilo. Il token esce dalla mappa: un cerchietto sul veicolo e l’elenco «A bordo» nel pannello; i passeggeri vanno con il mezzo e restano nell’Iniziativa. «Scendi…» e un clic su un quadretto libero accanto (evidenziato). Una riga nel registro; Ctrl+Z annulla. Costo in Azioni: `TODO(Davide)` A.145.
>   * **Linea di tiro:** il veicolo è un ostacolo come un token grande; chi è a bordo tira dal mezzo, dal suo Q più favorevole (pannello o clic destro → «Linea di tiro di …»). Attacchi di Opportunità e veicoli: `TODO(Davide)` A.146 (per ora né provocano né controllano zone).
>   * **Vista giocatori:** veicolo con immagine, muso e cerchietti di chi è a bordo (i nascosti no); un PG a bordo guarda dal veicolo per la nebbia automatica.
> * **Ritocchi del 06/10/2026 (test di Marcello sul lotto 6):** l’area non è obbligatoria: l’interruttore **«Mostra area»** (nel pannello del token, nel clic destro e con il tasto **M**) la nasconde e la mostra, e la scelta resta memorizzata; il percorso al passaggio del mouse resta anche con l’area nascosta. L’area è **leggera**: riempimento molto trasparente e contorno ben visibile di ogni fascia, così la mappa sotto si vede (opacità in `data/mappa.json`).

### **8.1 Zone di controllo e Attacchi di Opportunità (07/10/2026)**

> * **Regola del manuale (Giocatore §5.3):** «Un personaggio provoca un Attacco di Opportunità quando, con un Movimento volontario, esce dalla portata ravvicinata di un avversario in grado di attaccarlo»; non lo provocano il movimento forzato, l’ingresso nella portata, lo spostamento all’interno, la Ritirata e il teletrasporto; una sola volta per Round. La portata è quella dell’arma ravvicinata (Armamenti §7.1.2: 1 Q di norma, 2–3 Q per armi lunghe).
> * **ZoC:** la fascia profonda quanto la portata attorno a tutto l’ingombro del token avversario (non a 0 PV, non Stordito né Svenuto, non veicolo; per i giocatori non nascosto). **A.132 (risposta di Marcello del 07/10):** uno Stordito non fa Attacchi di Opportunità; il master vede la sua ZoC solo tratteggiata («inattiva», nessun avviso), i giocatori non la vedono. Mentre un token è scelto o si muove le ZoC dei suoi avversari sono in rosso semitrasparente (interruttore «Mostra ZoC», tasto Z); i passi del percorso nella ZoC sono evidenziati; l’area non cambia.
> * **Avviso:** a movimento fatto (non «Libero»), uscendo dalla portata di un avversario: «Oshi è uscito dalla ZoC di Legionario 1! Attacco di Opportunità…», uno per avversario, con «Attacca!» dell’avversario e il bersaglio già scelto; riga nel registro e avviso nella vista giocatori. Nessun tiro automatico. Domanda aperta A.133 (creature grandi).

## **9\. Linea di tiro**

> * Dal menu del token, **Linea di tiro**: si clicca un punto o un token e compare una linea dal centro del token al punto.  
> * La linea mostra la **distanza in Q** e la **fascia di gittata** dell’arma scelta.  
> * **Colore:** verde se libera, giallo se attraversa altri token (PG o nemici: possibile Copertura), rosso se un muro la blocca.  
> * Da lì si può aprire «Attacca\!» con bersaglio e distanza già impostati.
> * **Fatto il 07/10/2026 (fase 2, lotto 3; `src/mappa/visuale.js`, `data/mappa.json` → visuale).** Dal manuale: Giocatore §5.8 (Copertura Leggera −2, Media −4, Totale «il bersaglio non può essere attaccato direttamente»; «la Copertura è direzionale»), §5.10 (bersaglio «protetto da un alleato» −4), §5.11 (gittata a fasce), diagonale 1 Q (Scarto, A.124). Nessun manuale dice come si legge la Copertura sulla griglia: regola provvisoria (A.140).
>   * **Uso:** con un token scelto, tasto **L** (o clic destro → «Linea di tiro», o pannello del token): la linea segue il mouse verso un token o un Q; clic per fissarla, Esc o L per chiuderla. Etichetta «7 Q · Copertura Leggera», colore della Copertura; per il master, con l’interruttore «Mostra dettaglio linea di tiro» (Strumenti, o Maiusc+L; spento di default), anche le cinque linee di controllo (tratteggiate rosse quelle bloccate) e il numero di linee bloccate; i giocatori vedono solo la linea principale. Avviso con distanza, gittata (§5.11), vista (libera, parziale, bloccata), Copertura e token in mezzo.
>   * **Copertura «dal centro» (decisione di Marcello del 07/10/2026, al posto di «dagli angoli»):** dal centro del Q di chi tira, cinque linee verso i quattro angoli e il centro dell’ingombro del bersaglio; linee che attraversano muri o porte chiuse/bloccate: **0 nessuna, 1–2 Leggera, 3–4 Media, 5 Totale** (`visuale.copertura_linee`). Sfiorare il bordo di un muro non blocca; correre lungo due muri o infilarsi fra due muri in diagonale sì. Rispetto a prima chi tira non si «sporge» più dal vertice del suo Q: dietro uno spigolo la Copertura sale di un gradino (per esempio Leggera → Media), un pilastro di 1 Q sulla stessa riga copre del tutto.
>   * **Token grandi:** chi tira con un ingombro 2 × 2, 3 × 3 o un veicolo parte dal centro del suo Q più favorevole (quello con meno linee bloccate: si sporge dal proprio spazio); un bersaglio grande si guarda ai quattro angoli e al centro del suo ingombro. La linea principale parte dal punto scelto.
>   * **Token in mezzo (07/10/2026; A.141, A.144):** il Giocatore §5.10 dà per chi spara contro un nemico «impegnato in Ravvicinato, protetto da un alleato o che usa un ostaggio» −4 VA e una seconda Prova a −4 (con successo manca tutti, altrimenti colpisce il bersaglio secondario); il §5.8 dà la Copertura degli ostacoli. Con `visuale.token_in_mezzo` «protetto» (predefinito, dal manuale) un token attraversato dalla linea fra i centri non dà Copertura: l’avviso lo nomina e «Attacca!» parte con «Impegnato in Ravvicinato, protetto da un alleato o con un ostaggio» acceso (modificabile). Con «copertura» (proposta di Marcello, da confermare con Davide in A.144) i token contano come ostacoli nelle cinque linee, con la stessa tabella. Non contano i token a 0 PV o A Terra. L’etichetta dice la causa: «Copertura Media (muro + 1 token)», «· protetto». Vista giocatori: la linea si ricalcola con quello che vedono (porte segrete come muro, niente token nascosti), così un token nascosto non trapela. Non vale per la nebbia automatica né per il movimento.
>   * **«Attacca!»:** dalla linea fissata su un token, per un nemico si apre «Attacca!» con bersaglio, distanza e Copertura già impostati (modificabili); per un PG «Apri la scheda»: il primo «Attacca!» della sua scheda (entro 10 minuti) parte con quella distanza e quella Copertura.
>   * **Giocatori:** la linea del master in diretta, con l’etichetta, solo fra token che vedono (niente nascosti, niente sotto la nebbia; verso un Q, il Q fuori dalla nebbia); arrivano le posizioni, non gli id.
>   * **Nebbia automatica** (spenta di default, salvata nella scena; dal 07/10 l’interruttore sta in cima alla sezione Nebbia, ben visibile, con lo stato nel titolo, e anche nel menu Strumenti; accendendolo, un avviso dice quanti Q si sono aperti e, se la scena è tutta in Luce, che i PG vedono fino a 30 Q): la nebbia si apre dove i PG vedono, fino a 30 Q (A.142), con muri e porte chiuse che fermano la vista (stesso punto di partenza della linea di tiro: il centro del Q del PG, di ogni Q per un ingombro grande, verso il centro di ogni Q; motore a parte, un raggio per Q, per restare veloce); le zone esplorate restano scoperte. Per i giocatori quelle non viste adesso sono più scure e senza i token che non sono PG. La nebbia a mano continua a funzionare. Prossimo lotto: le luci (penombra, buio) entreranno nel parametro «fuori» della visuale.
>   * **Luci, versione semplice (fatto il 07/10/2026, fase 2, lotto 4; decisione di Marcello; `src/mappa/luce.js`, `data/mappa.json` → luci).** Si preparano in pochi secondi e non si ritoccano in gioco: niente ombre dinamiche, intensità o livelli numerici. Le quattro categorie di A.106 / A.116: **Luce** (nessuna penalità), **Penombra** −2, **Luce scarsa** −4, **Buio** (come Accecato, −8). **Luce della scena:** un menu nella sezione «Luci» della colonna di destra, subito dopo Nebbia (Strumenti → Luci la apre, la porta in cima e la evidenzia), predefinita Luce; in fondo alla sezione l'elenco delle luci portate dai token, con «Cambia». **Zone** facoltative a pennello o a rettangolo, una categoria per Q («Gomma» le toglie), salvate nella scena come maschere (`luce: { ambiente, zone }`; scene di prima: Luce). **Luci portate:** dal menu del token, Opzioni → «Porta una luce…», con i raggi del catalogo (bastoncino 2, lanterna e lampada frontale 6, torcia 10 Q) o un altro raggio (`token.luce`); entro il raggio la zona è Luce e segue il token; **i muri non fermano la luce** (nessun calcolo d’ombra, scelta voluta). **Nebbia automatica:** il raggio di scoperta dipende dalla luce del Q visto, non del PG: Luce 30 Q (A.142), Penombra 6, Luce scarsa 3, Buio 1 (`luci.raggio_scoperta_q`), sempre fermato da muri e porte chiuse. **«Attacca!»** dalla linea di tiro propone la luce della zona del bersaglio (la peggiore fra i Q di un bersaglio grande) in «Luce sul bersaglio», modificabile, con la riga «Penombra −2 VA (zona del bersaglio)»; nessun blocco. **Vista giocatori:** le zone scure più scure, la mappa leggibile; il buio non nasconde i token (a quello pensa la nebbia). Le vecchie etichette numeriche delle luci non si usano (A.125, superata). Domanda nuova A.143 (visione notturna e nebbia).
>   * **Tempi** (test su 300 × 300 Q con muri): visuale di 6 PG con raggio 30 Q 3–4 ms; 100 linee di tiro 3–4 ms.

## **10\. Template**

> * **Fatto il 07/10/2026 (fase 2, lotto 1; `src/mappa/template.js`, parametri in `data/mappa.json` → template).** Forme dai manuali: **Raggio** («distanza dal centro al limite», Magia, «Gittate e geometria»; esplosioni, granate con Raggio di Scoppio 1–2 Q, razzi 2–4 Q, fumogena 2 Q), **Cono** («lunghezza × larghezza finale, con apertura progressiva», dal bordo dello spazio di chi lo lancia; Cono Elementale da 3 × 2 a 18 × 9 Q), **Linea** («lunghezza × larghezza, normalmente 1 Q»), **Quadrato** (Fuoco di Soppressione 3 × 3 Q, Giocatore §5.10; Campo di Forza) e **Rettangolo** (area libera; Piattaforma Levitante). Il Muro Elementale (segmenti di 1 Q) si disegna con linee o rettangoli.
> * **Q coperti:** la regola del manuale, «un Q rientra nell'Area se è incluso per almeno metà» (misurata su 64 punti del Q); il raggio si conta a quadretti come il movimento (diagonale 1 Q, A.124): raggio 2 Q = 5 × 5 Q (A.137); cono e linea non includono il Q di chi lancia; il cono si allarga da 1 Q alla larghezza finale (A.138).
> * **Mini-menu** (tasto **T**, «Strumenti → Template ad area», clic destro su un punto vuoto): forma, misura in Q (misure dei manuali come scorciatoie), colore, durata in Round o «finché non lo tolgo», nome facoltativo, nascosto ai giocatori. **Piazzamento:** anteprima agganciata alla griglia che segue il mouse; cono e linea partono dal token scelto e si orientano verso il mouse, senza token si ruotano con la rotella (15°); clic per fissare, Esc per annullare.
> * **Chi è dentro:** all'avviso del piazzamento e nella sezione «Template» della barra (gruppo Mappa), per «Colpito» sulla plancia; nessun tiro automatico. **Gestione:** Sposta, Nascondi / Mostra ai giocatori, Togli (sezione e clic destro sul template), Ctrl+Z. **Durata:** come le altre durate in Round, fino alla fine del Round R + N; scaduto, esce con un avviso; salvati nella scena.
> * **Giocatori:** i template visibili in diretta, anche l'anteprima mentre il master piazza; dal server arrivano solo i Q fuori dalla nebbia (nessuna forma), niente template nascosti.
> * **Ritocchi del 07/10/2026:** frecce ← → (cono e linea a passi di 45°, le otto direzioni della griglia; rettangolo 90°) e ↑ ↓ (misura proposta successiva o precedente) durante il piazzamento, anche con un token scelto (parte dalla direzione verso il mouse) e per i template ripresi con «Sposta o ruota». **«Mostra / nascondi template»** (pulsante «◫ Template», Maiusc+T): template senza durata, muri, porte e terreno difficile (validi comunque per il movimento); casella «anche a durata»; scelta salvata nella scena, separata per lo schermo dei giocatori.
> * Proposta dall'incantesimo («Lancia!»): non ancora, perché `incantesimi.json` non ha i dati dell'area in forma strutturata (forma e misure sono nel testo delle schede); servirebbe un lotto di estrazione.

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
> * **«Indietro» (ritocchi del 07/10/2026; `src/scontro.js` → `indietro`; `data/mappa.json` → iniziativa.indietro_max, 20 passi):** accanto ad «Avanti», nella barra e nella plancia (solo master; anche Maiusc+clic su «Avanti»). Annulla l’ultimo «Avanti» e riporta turno, Round, durate degli Stati (con i Round rimasti), effetti degli incantesimi dei nemici, Stati tolti ai nemici, perdite periodiche applicate a quel turno (PV dei nemici nello scontro, PV dei PG nel loro file, se non sono cambiati dopo), Stati dei PG tornati in corso e template scaduti al cambio di Round; i Q usati seguono da sé il Round. Ripetibile: lo storico sta nello scontro (`indietro`). Le modifiche fatte dopo l’«Avanti» (PV, «Colpito», Stati, movimenti) restano e l’avviso lo dice; al ritorno di Round l’avviso «Torno al Round N: le durate scalate tornano come prima»; una riga nel registro. **Non ripristina:** le Tecniche e gli incantesimi dei PG che la scheda aveva già chiuso e salvato al Round dopo (la scheda non torna indietro di Round), le righe del registro già scritte (restano, con quella di «Indietro»), gli Attacchi di Opportunità già segnalati.
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
> * **Riordinato il 07/10/2026 (richiesta di Marcello; `src/mappa/menu.js`, `src/ui/mappa/menu-token.js`, ordine e gruppi in `data/mappa.json` → menu):** in cima una riga rapida a pulsanti **Passo · Corsa · Scatto · Libero** (quella attiva evidenziata, quelle non permesse spente con il motivo nel suggerimento); poi gruppi con intestazione: **Movimento** (Annulla ultimo movimento, Nuovo turno senza scontro), **Azioni** (Attacca!, Apri / Chiudi la porta vicina, 1 AzP), **Strumenti** (Linea di tiro L, Mostra / Nascondi area M, ZoC Z, Template da qui T), **Scheda** (Apri mini-scheda, Apri scheda completa Ctrl+clic); **Opzioni ▸**, sottomenu al passaggio o al clic: Nascondi / Mostra ai giocatori, Colore del bordo, Togli dalla mappa (rossa, in fondo, con conferma). Solo le voci utilizzabili in quel momento, gruppi vuoti nascosti, niente voci ripetute, scorciatoia a destra, voci alte almeno 40 px (`menu.altezza_voce_px`) per il dito; vicino al bordo destro o in basso il menu si apre verso sinistra o verso l’alto. Stesso schema sulla **porta** (Azioni: il token scelto vicino la apre o chiude; Porta: Apri / Chiudi, Blocca / Sblocca; Opzioni: Ruota, Rivela / Rendi segreta, Togli), sul **template** (Sposta o ruota, Nascondi / Mostra; Opzioni: Togli) e sul **punto vuoto** (Strumenti: Nuovo template qui, Linea di tiro fin qui con un token scelto); porta e template sotto lo stesso clic stanno nello stesso menu, un gruppo ciascuno.
> * **Maiusc = movimento libero, per un token e per un gruppo (richiesta di Marcello del 07/10/2026; `src/mappa/gruppo.js`).** *Token scelto:* tenendo premuto Maiusc l’area e il percorso spariscono e compare «Libero (Maiusc)»; il clic o il trascinamento mettono il token in qualunque quadretto, senza conteggio, con la riga nel registro di sempre; rilasciato Maiusc (anche perdendo il fuoco della finestra) si torna alla modalità di prima. *Selezione multipla* (solo master, in preparazione e in scontro): Maiusc + trascina su un punto vuoto = rettangolo (i token che lo toccano); Maiusc + clic su un token = dentro o fuori; Strumenti e clic destro su un punto vuoto = «Seleziona tutti i PG / i nemici / tutti»; clic destro sul token = «Aggiungi alla / Togli dalla selezione». Contorno tratteggiato azzurro (`colori.selezione_gruppo`), diverso dall’alone del turno e dal token scelto; contatore «N token selezionati» sulla mappa. *Spostamento:* trascinando uno dei selezionati (o con le frecce, 1 Q) si muovono tutti, in formazione, sempre liberi (niente Q, ZoC né Attacchi di Opportunità); un token col quadretto d’arrivo murato, occupato o fuori dalla griglia va al libero più vicino (avviso); una riga nel registro («spostati N token insieme»), un solo Ctrl+Z. Esc o clic su un punto vuoto annullano la selezione. La vista giocatori vede lo spostamento come sempre, senza i token nascosti. *Conflitti:* Maiusc+T, Maiusc+L e Maiusc+Tab sono combinazioni con un altro tasto e restano come prima; Maiusc+clic su «Avanti» sta fuori dalla mappa; Maiusc+clic su un punto vuoto resta il movimento libero del token scelto, Maiusc+trascina su un punto vuoto (che prima spostava la vista) ora è il rettangolo: la vista si sposta con la barra spaziatrice o trascinando senza Maiusc.

### **Menu superiore**

Le stesse azioni più gli strumenti del master: carica mappa, griglia, nebbia, muri, template, scene, disposizione mappa ↔ scontro, blocco dei movimenti dei giocatori.

> * **Fatto nel lotto 7 (06/10/2026):** menu «Strumenti» (immagine, griglia, nebbia, muri e terreno, vista giocatori, scene, collegamento, «Blocca movimenti dei giocatori», pronto per la fase 2), pulsanti delle disposizioni e «?» con l'elenco delle scorciatoie. Nomi e conferme con finestrelle dentro la pagina, non con quelle del browser.
> * **Colori dei bordi (decisione di Marcello del 06/10/2026):** PG bordo pieno, un colore per PG (blu, rosso, giallo, verde chiaro, azzurro, arancione, verde scuro), stabile nella scena e modificabile; nemici bordo tratteggiato nero e colore del tipo (viola, lilla, verde marcio, bordeaux, marrone, grigio piombo, ocra scura), uguale per le copie; alleati non PG bordo doppio grigio-petrolio; veicoli il colore del PG proprietario (grigio se del gruppo); alone del turno bianco luminoso. Stessi colori nella barra dell'Iniziativa e nella vista giocatori.

## **13\. Notifiche e suoni**

> * **Avvisi nell’app** (tab BattleMap e scheda aperta sul tablet): «Sei il prossimo: preparati\!», «È il tuo turno», «Il tuo incantesimo scade al prossimo Round».  
> * **Richiamo del master:** il master può mandare un avviso a un giocatore o a tutti, con un breve testo.  
> * **Suoni brevi** e **vibrazione** (sui dispositivi Android) per turno e richiami, con un interruttore per spegnerli. Il browser riproduce i suoni solo dopo il primo tocco sulla pagina.  
> * **Suoni della mappa (07/10/2026, fatto):** campanella al nuovo Round (`Sounds/Effects/RoundBell.mp3`; elenco evento → file in `data/mappa.json` → `audio.effetti`, pronto per Attacco di Opportunità e scadenza dei template); musica di fondo per scontro, scelta nella preparazione o nella mappa fra i file della cartella `musica/` del server (MP3, OGG, WAV, M4A, AAC), ripetuta finché lo scontro è aperto; nella barra in alto muto generale e cursori Musica ed Effetti, ricordati sul PC del master. I suoni stanno sul PC del master; «Suoni anche nella vista giocatori» (Strumenti, spento di norma) li porta sullo schermo dei giocatori. Autoplay bloccato dal browser: avviso «clic per attivare l’audio».  
> * **Limite:** le notifiche di sistema con l’app chiusa o in secondo piano non sono possibili su una rete locale senza HTTPS; gli avvisi funzionano con la pagina aperta. Consiglio: tablet con lo schermo che non si spegne durante la sessione.

## **13 bis. Tablet dei giocatori (fase 2, lotto 7, fatto l'08/10/2026)**

> * **Quale scena vedono i giocatori (08/10, dal test con un tablet vero; `server.mjs` → `scenaInGioco`):** una regola sola per secondo schermo e tablet. Con un solo scontro aperto (o quello chiesto con `?scontro=`), la sua scena (fra più scene collegate quella segnata, altrimenti la più recente); con nessuno o più scontri aperti, la scena segnata dal master «mostrata ai giocatori»; altrimenti nessuna, con «Il master non ha ancora aperto una mappa». Prima vinceva sempre la scena «scelta» in `tavolo/mappa-giocatori.json`, anche vecchia: il tablet di Marcello ha aperto una mappa di prova. Indicatore «📺 ai giocatori» accanto al nome della scena nella mappa del master. Con lo scontro della scena finito (anche in `scontri/archivio/`) i token prendono ancora nome e immagine dai suoi partecipanti; un token senza partecipante non arriva ai giocatori (prima era un «?»).

> * **Collegamento:** il tablet apre la vista giocatori (`http://<IP del PC del master>:3000/#/mappa/giocatori`, QR nella sezione «Vista giocatori» e Strumenti → «Collega i tablet») sulla rete di casa, in HTTP. «Sono…» sceglie il PG (il campo `pg` del file, univoco), ricordato sul tablet (`localStorage`). Nessuna password: si gioca in casa; «Solo guardare» per lo schermo del tavolo.
> * **Vista:** quella dei giocatori, con gli stessi filtri dei segreti calcolati dal server; in più il proprio token evidenziato, la mini-scheda (PV, PM, Stati, «tocca a te»), «Centra su di me». Il blocco `io` arriva da `GET /api/vista-giocatori?pg=<chiave>` con i soli dati del proprio PG.
> * **Movimento** (`src/mappa/tablet.js`, `POST /api/vista-giocatori/movimento`): solo il proprio PG; solo al proprio turno dello scontro aperto, oppure sempre (`scena.tablet.movimento`, scelta del master); mai con «Blocca movimenti dei giocatori». Stesse regole del master: Passo diviso, Corsa e Scatto in un blocco unico (A.129), area con muri, porte chiuse, terreno difficile e ingombri, ZoC con l'avviso dell'Attacco di Opportunità prima della conferma. Niente Libero, niente selezione multipla, niente porte. Tocco sul quadretto → prova del server (percorso e costo) → «Conferma». Il server rifà il controllo sulla scena completa e scrive la scena (revisione +1, voce per Ctrl+Z, movimento segnato `tablet`) e le righe degli Attacchi di Opportunità nel registro dello scontro. L'area mostrata al tablet si calcola senza gli ostacoli che i giocatori non vedono; un quadretto che sembra libero ma non lo è viene rifiutato con «c'è qualcosa che non vedi».
> * **Scritture contemporanee (08/10):** il movimento dal tablet tocca solo posizione, Q usati e voce per Ctrl+Z di quel token. Il server ricorda le revisioni scritte dai tablet: un salvataggio del master su una revisione vecchia, se in mezzo ci sono solo movimenti dai tablet, si fonde (`fondiMovimentiTablet`) invece di rispondere 409, e la mappa del master riprende quei movimenti in silenzio. Nessuna perdita, nessun avviso «cambiata in un’altra finestra». Una modifica da un’altra finestra del master resta un conflitto, come prima.
> * **Master:** la mappa guarda la revisione della scena ogni secondo (`GET /api/scene/<id>?revisione=N`) e, se non ha modifiche sue in corso, riprende quella del server: il movimento si vede in diretta, con l'avviso e «Attacca!»; Ctrl+Z lo annulla e ritira l'Attacco di Opportunità.
> * **Notifiche:** nell'elenco dell'Iniziativa 📱 (tablet collegato: flusso di eventi aperto o vista letta negli ultimi secondi, `data/mappa.json` → `tablet.collegato_s`) e 🔔, che manda al solo tablet di quel PG (`POST /api/tablet/avviso`, evento `avviso` sul flusso del tablet) un avviso grande con il suono `Sounds/Effects/PlayerAlert.mp3` e la vibrazione, dove c'è. Facoltativo, interruttore del master: «Tocca a te» quando arriva il turno del PG.
> * **Limiti:** senza HTTPS niente notifiche di sistema: gli avvisi arrivano solo con la pagina aperta; il suono chiede un primo tocco («Tocca per attivare l'audio»). Il PG a bordo di un veicolo non muove (lo muove il conducente, dalla mappa del master).

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

> * Tab BattleMap con movimento dei giocatori dal tablet (fatto l'08/10/2026: §13 bis).  
> * Linea di tiro con Copertura; template (anche rettangolari e con durata) da un **mini-menu dei template** (forma, misura, colore, durata); il collegamento a «Lancia\!» è facoltativo.  
> * Porte; veicoli sulla mappa.  
> * Avvisi di turno, richiami del master, suoni (fatto: campanellino e «Tocca a te» sui tablet, §13 bis; suoni della mappa, §13).

### **Fase 3**

> * Pre-analisi dei muri con AI; token generati con AI.  
> * Rivelazione automatica della nebbia; luci e linea di vista.

## **15\. Decisioni e domande per Davide**

> * **Iniziativa — deciso:** si usa il sistema del Manuale del Giocatore di Mutant (Mod DES \+ Mod INT \+ 1d10; parità per DES, poi INT, poi scelta fra alleati o 1d10 fra avversari). Il d12 dell’app di Davide appartiene al sistema precedente.  
> * **Risposte del 06/10/2026:** A.121 ritirata; A.122 priorità delle funzioni (resta «Aiuto-master»); A.124, A.127, A.128 e A.129 sul movimento, applicate il 07/10 (§8); A.125 porte e luci (le vecchie etichette delle luci: superate dal sistema semplice, decisione di Marcello del 07/10).
> * **Risposte di Marcello del 07/10/2026 (decisioni del gruppo, Davide può rivederle):** A.132 (uno Stordito non fa AdO; ZoC tratteggiata solo per il master); A.134 (diagonale rasente allo spigolo sì, fra due muri a spigolo no); A.125 (i veicoli si muovono all’Iniziativa del conducente, come A.105; da applicare con il lotto dei veicoli).  
> * **Ancora aperte:** A.126 (creature 3 × 3), A.133 (portata delle creature grandi), A.136 (Corsa o Scatto dopo un Passo cominciato), A.143 (visione notturna e nebbia automatica).

## **16\. Fuori ambito**

> * Account e login esterni; uso via internet fuori dalla rete locale.  
> * Costruttore di mappe a stanze, mappe video, effetti grafici elaborati.
