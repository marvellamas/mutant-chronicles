# Mappa di battaglia — guida per Davide

Una scena si prepara prima della sessione e si gioca dalla stessa pagina. Serve `avvia-server.bat` acceso sul PC del master; i giocatori guardano la mappa su un secondo schermo (televisore o tablet).

Questa guida si apre anche dall'app: nel Tavolo del Master «Guida della mappa», oppure il tasto «?» nella mappa.

Quando aggiorni o avvii Mutant, a Marcello arriva un avviso con la versione: serve a sapere se stai provando l'ultima. Per disattivarlo: `avvisi.json` → `attivo: false`. Il file sta in `avvisi/avvisi.json`.

**La barra in alto** ha cinque gruppi, da sinistra: «Mutant» e «← Tavolo» con il nome della scena; zoom, «Adatta» e le tre disposizioni; template e «🧹 Temporanei»; **«Strumenti»** (il menu più importante), «⋯» e «?»; musica, volumi e «Salvata alle…». Sugli schermi stretti i gruppi vanno a capo interi.

**Il menu «Strumenti»** ha sette categorie: 🗺 Preparazione mappa (immagine, griglia, muri e terreno, porte, luci, nebbia e nebbia automatica), 🎬 Scena (scene, collegamento e token, posizione iniziale), ⚔ In gioco (linea di tiro, template, area e ZoC, selezioni), 📺 Vista giocatori (apri, adatta, PV dei nemici, template e muri, suoni), 📱 Tablet dei giocatori (blocco, quando muovono, «Tocca a te», collegamento), ♫ Suoni (musica, audio muto), 🧹 Pulizia (cancella i template). A destra la scorciatoia; le voci che in quel momento non servono sono spente e dicono perché.

## Preparare la scena

1. **Prepara lo scontro.** Nel Tavolo del Master, «Prepara scontro» → «Nuova bozza». La bozza ha quattro riquadri: **1 Base** (nome, musica di fondo, note), **2 PG e veicoli** (PG con «Tutti» o a scelta; i veicoli che entreranno), **3 Nemici** (presenti, difficoltà, «Dal bestiario», «Creatura pronta», «Crea nemico»), **4 Mappa** («Prepara la mappa», scena, posizione iniziale). In fondo «Inizia», «Inizia e consuma la bozza», «Salva e chiudi»: passandoci sopra dicono cosa fanno. La bozza si salva da sola («Salvata alle…»).
2. **Prepara la mappa.** Nella bozza, sotto «Mappa», scegli «Nuova scena…» (o una scena esistente) e premi «Prepara la mappa»: la scena nasce collegata alla bozza e si apre.
3. **Immagine.** «Carica immagine» (o «Strumenti» → «Carica immagine…»): JPG, PNG o WEBP.
4. **Griglia.** «Strumenti» → «Griglia»: «Traccia un quadretto» sull'immagine, oppure scrivi il lato del quadretto in pixel. Quando combacia, «Blocca griglia».
5. **Muri.** «Strumenti» → «Muri e terreno»: «Rettangolo» o «Pennello», poi «Muro» o «Terreno difficile»; trascina sulla mappa. I giocatori non vedono i muri sotto la nebbia. **Porte:** nello stesso pannello «Porta», scegli aperta, chiusa o bloccata (e «segreta» se vuoi), poi clic su un quadretto di muro; un altro clic la toglie. La porta si mette da sola lungo il muro (verticale in un muro verticale); se serve, ← → la girano mentre la metti, o clic destro → «Ruota» dopo. Una porta segreta per i giocatori è muro finché non la riveli (clic destro → «Rivela ai giocatori»). In diagonale un token passa rasente allo spigolo di un muro o di una porta chiusa, ma non fra due muri che si toccano a spigolo.
6. **Token.** Nel gruppo «Mappa» della barra a destra, «Metti tutti» (o trascina un pezzo alla volta). Ogni PG ha il suo colore pieno, ogni tipo di nemico un colore tratteggiato con il nero; si cambiano con il clic destro → «Colore del bordo…».
7. **Nebbia.** «Strumenti» → «Nebbia»: la mappa parte coperta; con «Rivela» e il rettangolo scopri la zona iniziale. Tu la vedi trasparente, i giocatori nera.
8. **Posizione iniziale.** Quando la scena è pronta, «Strumenti» → «Salva posizione iniziale»: token, porte, template e nebbia restano registrati. Per rigiocare lo scontro (o dopo un errore) «Ripristina posizione iniziale»: tutto torna com'era, PV e Stati no; Ctrl+Z annulla.

## Giocare

9. **Inizia lo scontro.** Dalla bozza, «Inizia» (la bozza resta) o «Inizia e consuma la bozza»; oppure, se hai già aperto la mappa collegata alla bozza, «Inizia scontro» nel riquadro «Scontro non ancora iniziato» (gruppo «Iniziativa» della barra): fa lo stesso di «Inizia». Subito dopo si apre la finestra «Iniziativa»: per ognuno scrivi il d10 tirato dal vivo (il totale lo fa l'app) o il totale a mano, oppure «Tira con l'app»; in cima «Tira con l'app per tutti i nemici» e «per tutti». Chi lasci vuoto resta fuori dall'ordine finché non ha un valore: nella barra compare «Iniziativa… (N senza)». Un nemico aggiunto a scontro iniziato chiede il suo valore allo stesso modo. Le scene collegate alla bozza passano da sole allo scontro appena aperto (lo dice un avviso) e i token preparati restano al loro posto.
10. **Schermo dei giocatori.** I giocatori (secondo schermo e tablet) vedono **la scena dello scontro aperto**. Senza scontro aperto, o con più di uno, vedono la scena che hai segnato con Strumenti → Vista giocatori → «Mostra questa ai giocatori»; se non ne hai segnata nessuna, «Il master non ha ancora aperto una mappa». Accanto al nome della scena, in alto, «📺 ai giocatori» dice se la stanno vedendo (un clic su «📺 non mostrata» la segna). Poi «Apri vista giocatori» sul secondo schermo.
11. **Il turno.** La linea dell'Iniziativa in alto si colora fino a chi tocca. «Avanti» passa al prossimo: il suo token diventa quello scelto, con la mini-scheda a destra e l'area di movimento. «Centra su attivo» porta la mappa su di lui. Se hai saltato qualcuno, «◀ Indietro» (o Maiusc+clic su «Avanti») torna al turno di prima, anche più volte e anche al Round precedente: tornano Stati, durate e template scaduti; PV e colpi dati nel frattempo restano. Se l'Iniziativa va rifatta, «⟳ Iniziativa» (nella barra) o «Reimposta Iniziativa» (nella plancia) la ritira per tutti, con conferma, o per uno solo: scegli il nome (nella plancia basta un clic sul nome) e ritira con l'app, scrivi il dado tirato dal vivo o il valore totale a mano. Chi è di turno resta di turno; «◀ Indietro» la annulla. Nell'ordine d'Iniziativa del gruppo «Iniziativa», ⌖ accanto a un nome (o il doppio clic sul nome) porta la mappa su quel token, con lo zoom, e lo sceglie; se il token non c'è, te lo dice. Chi arriva a 0 PV ha un'icona sopra il token e sul mini-token della barra: il teschio per i nemici, la croce rossa per i PG (anche sullo schermo dei giocatori, per i nemici che vedono).
12. **Movimento.** Clic su un quadretto dell'area (verde il Passo, giallo la Corsa, rosa lo Scatto) o trascina il token. Il Passo si può dividere in più clic, prima e dopo l’Azione Principale (2 Q, attacco, altri 4 Q). Per andare oltre il Passo scegli «Corri» o «Scatta» prima di muovere: Corsa e Scatto sono un blocco unico, il token si muove una volta sola e i Q non usati si perdono; dopo un Passo già cominciato non si possono più scegliere (per correre, «Annulla ultimo movimento» e rifai il movimento con «Corri»). Il pannello mostra i Q usati su quelli disponibili e, sotto, quanto resta del Passo o quanti Q sono andati persi; «Libero» (o Maiusc) lo sposta dove vuoi senza contare. «M» nasconde o mostra l'area. Per lasciare il token e fare altro: un altro clic sul token, Esc, o un clic fuori dall'area (non si muove e i Q già usati restano). **Maiusc = libero:** tenendo premuto Maiusc l'area sparisce, in alto compare «Libero» e il clic mette il token dove vuoi, senza contare i Q; lasciato Maiusc si torna come prima.

**Spostare un gruppo** (per piazzare in fretta tutti i PG o i nemici): «Strumenti» → «Seleziona tutti i PG» (o «i nemici», o «tutti»), oppure Maiusc + trascina un rettangolo su un punto vuoto, o Maiusc + clic sui token uno per uno. Poi trascina uno dei selezionati: si spostano tutti insieme, nella stessa formazione, senza contare i Q (le frecce li spostano di 1 Q). Chi trova il posto occupato va al quadretto libero più vicino; un solo Ctrl+Z rimette tutti; Esc annulla la selezione.

13. **Linea di tiro.** Scegli il token che tira e premi **L** (o clic destro → «Linea di tiro»): la linea segue il mouse e dice distanza e Copertura; clic su un bersaglio per fissarla. La Copertura si conta dal centro del quadretto di chi tira verso angoli e centro del bersaglio: 0 linee bloccate nessuna, 1–2 Leggera, 3–4 Media, 5 Totale. Per vedere le cinque linee: Maiusc+L (o «Strumenti» → «Mostra dettaglio linea di tiro»); i giocatori vedono solo la linea principale. L'avviso dice gittata, vista e Copertura, e per un nemico apre «Attacca!» con quei valori già impostati (per un PG apre la sua scheda: in fondo a «Attacca!», nel riquadro «Contro un nemico dello scontro», il bersaglio è già scelto; si tira, e se colpisce «Applica il danno» apre «Colpito» sul nemico e scala i suoi PV nello scontro, con una riga nel registro; si corregge con «Annulla questo colpo» o con «Annulla ultimo colpo» della plancia). Esc la chiude. Nel pannello «Nebbia», «Nebbia automatica» fa aprire la nebbia da sola dove i PG vedono. Se fra chi tira e il bersaglio c'è un altro personaggio, l'avviso lo dice e «Attacca!» propone «bersaglio protetto» (−4 e seconda Prova, §5.10).
14. **Porte in gioco.** Un clic su una porta la apre o la chiude (se è bloccata no: clic destro → «Sblocca»). Se il personaggio che muovi è accanto alla porta, «Apri porta» nel suo pannello o nel clic destro: costa 1 Azione Principale, che compare accanto ai Q usati, e finisce nel registro. Una porta chiusa o bloccata ferma il movimento come un muro.
15. **Template ad area.** Tasto **T** (o «Strumenti» → «Template ad area», o clic destro su un punto vuoto): scegli forma (Raggio, Cono, Linea, Quadrato, Rettangolo), misura, colore, durata e, se vuoi, un nome come «Esplosione». Il template segue il mouse: un cono o una linea parte dal token scelto verso il mouse (senza token si gira con la rotella). Clic per fissarlo, Esc per annullare. L'avviso e la sezione «Template» della barra dicono chi c'è dentro: il danno lo dai dalla mini-scheda con «Colpito». Con lo scontro aperto la durata scende da sola con i Round; i giocatori lo vedono, salvo «Nascosto ai giocatori». Mentre lo piazzi (o dopo, con «Sposta o ruota»), le frecce ← → lo girano di 45° e ↑ ↓ cambiano la misura. **Maiusc+T** (pulsante «◫ Template» in alto) nasconde e rimostra i template senza durata, i muri, le porte e il terreno difficile (per il movimento valgono sempre); con «anche a durata» anche gli altri template. Per lo schermo dei giocatori c'è la stessa scelta nella sezione «Vista giocatori».
16. **Colpi e Stati.** Nella mini-scheda: «Colpito» per il danno, «+ Stato» per gli Stati; tutto finisce nel registro dello scontro (gruppo «Scontro»).
17. **Il clic destro.** Sul token (o con la pressione lunga sul tablet): in cima Passo · Corsa · Scatto · Libero, poi i gruppi Movimento, Azioni, Strumenti e Scheda, solo con le voci che puoi usare in quel momento e la scorciatoia a destra; le voci rare stanno in «Opzioni ▸» (Nascondi ai giocatori, Colore del bordo, Togli dalla mappa, con conferma). Sulla porta, sul template e su un punto vuoto lo stesso schema. Vicino al bordo dello schermo il menu si apre verso sinistra o verso l'alto.
18. **Se sbagli.** Ctrl+Z annulla l’ultima azione sulla mappa (movimento, muri, nebbia, token, template, porte); «Annulla ultimo colpo» nel gruppo «Iniziativa».
19. **Lo spazio.** «Mappa grande», «Equilibrata», «Scontro grande» in alto (o Tab) cambiano quanto spazio ha la mappa; il bordo fra mappa e barra si trascina.

## Due schermi sullo stesso PC

Con un secondo monitor (o il televisore) collegato al PC del master:

1. Nella mappa, gruppo «Mappa» → «Vista giocatori»: «Apri vista giocatori» (la scena è quella dello scontro aperto, o quella segnata con «Mostra questa ai giocatori»). Si apre una seconda finestra del browser.
2. Trascina quella finestra sul secondo schermo (per la barra del titolo, oppure Windows + Maiusc + freccia).
3. Sul secondo schermo premi **F11** (o il pulsante «Schermo intero» della vista): restano solo la mappa e la barra dell'Iniziativa, senza barre, pulsanti né strumenti. Per uscire, F11 di nuovo. Se la mappa non è inquadrata bene, il pulsante «⤢ Adatta» in basso a destra (o il tasto **A**) la adatta alla parte scoperta; dal tuo schermo puoi farlo con «Adatta lo schermo dei giocatori» nella sezione «Vista giocatori». La vista giocatori già aperta prende da sola la versione nuova dell'app (si ricarica entro 20 secondi, o appena si ricollega al server riavviato).
4. Torna a lavorare nella finestra del master sul primo schermo: ogni azione (movimento, «Avanti», nebbia, colpi) arriva sul secondo schermo subito (al più un paio di secondi). Se il collegamento si interrompe, sullo schermo dei giocatori compare «Collegamento con il master perso: riprovo…».
5. **Il movimento si vede in diretta.** Quando scegli un token, sullo schermo dei giocatori compaiono la sua area di movimento, la modalità (Passo, Corsa, Scatto, Libero) con i Q usati, il percorso che indichi col mouse e le zone di controllo dei nemici vicini: i giocatori vedono dove possono andare e che cosa rischiano. Sparisce quando lasci il token. Non mostra mai token nascosti né quello che sta sotto la nebbia. Nella sezione «Vista giocatori» lo spegni con «Mostra il movimento ai giocatori», e le sole ZoC con «Mostra le ZoC ai giocatori». Un nemico Stordito o Svenuto non fa Attacchi di Opportunità: tu vedi la sua ZoC solo tratteggiata (nessun avviso), i giocatori non la vedono.

## Luci

Si preparano in pochi secondi e durante il gioco non si toccano più.

1. «Strumenti» → «Luci»: scegli la **luce della scena** (Luce, Penombra −2, Luce scarsa −4, Buio come Accecato). Per quasi tutte le scene basta questo.
2. Se serve, con il pennello o il rettangolo dipingi una **zona** diversa (una stanza buia, un corridoio in penombra, una sala illuminata); «Gomma» la toglie.
3. Le **torce**: clic destro sul token → Opzioni → «Porta una luce…» (bastoncino 2 Q, lanterna 6, torcia 10, o un altro raggio). La luce segue il token. **I muri non fermano la luce**: niente ombre, per semplicità.
4. Con la **nebbia automatica** (interruttore in cima alla sezione Nebbia, o «Strumenti» → «Nebbia automatica») i PG vedono lontano dove c'è Luce (30 Q), poco in Penombra (6 Q) e con Luce scarsa (3 Q), al Buio solo il quadretto accanto o fin dove arriva una torcia. **All'aperto di giorno spegni pure la nebbia.**
5. La linea di tiro e «Attacca!» propongono la penalità della zona del bersaglio (per esempio «Penombra −2»); puoi cambiarla. Ai giocatori le zone scure arrivano più scure, ma la mappa resta leggibile.

## Veicoli

- **Metterlo:** come gli altri token («Metti» fra i «senza token»); prima del clic, ← → scelgono dove punta il muso.
- **Girarlo:** con il veicolo scelto (o prima di metterlo), ← → lo girano di 10°, Maiusc+← → di 45° (anche clic destro → «Ruota…» e i pulsanti del pannello, che mostrano l’angolo: 0° è il muso in alto). Il **triangolino** sul lato anteriore, nel colore del proprietario, dice dove punta il muso; la stessa freccina è nella barra dell’Iniziativa, accanto al conducente. In diagonale il mezzo occupa i quadretti coperti almeno per metà: con il veicolo scelto li vedi con un velo leggero, e sono quelli che contano per movimento, muri, linea di tiro e discesa. Girare non consuma movimento (le curve sono comprese nella guida; sterzate strette e inversioni le gestisci a voce, domanda A.147 a Davide). Non si gira dentro un muro o un altro token. Ctrl+Z annulla.
- **Andatura:** con il veicolo scelto, riga «Andatura» del pannello (Fermo, Controllata, Veloce, Massima, con i Q del Round), oppure clic destro → gruppo «Movimento», oppure la carta del veicolo nella plancia. L'area si aggiorna subito. Nello scontro l'andatura cambia di una fascia per Round (Veicoli §2.1, una AzM di conduzione): da Fermo a Massima ci vogliono tre Round, e quella scelta resta segnata con ⟶. Fuori dallo scontro cambia subito. Con l'andatura Fermo il veicolo non si muove: un avviso lo dice, con le andature come pulsanti.
- **Guidarlo:** sceglilo e trascinalo come un token, o clic sul quadretto di arrivo: area di movimento sull'ingombro intero, con l'andatura della sua scheda, una volta per Round. Di norma lo muovi al turno del conducente (la mappa lo sceglie da sola), ma puoi muoverlo anche fuori turno. Senza conducente o senza scontro aperto resta fermo e un avviso dice perché; con Libero (Maiusc) lo sposti comunque.
- **Salire:** clic destro su un PG o un nemico accanto al veicolo → «Sali su … come conducente» (un PG) o «come passeggero». Il token sparisce e compare in piccolo sul veicolo (da due terzi a metà di un token, dentro l'ingombro, con il suo bordo; il conducente per primo, con un anello blu); nel pannello c'è l'elenco «A bordo».
- **Scendere:** pannello del veicolo → «A bordo» → gruppo «Scendi» (o clic destro sul veicolo → «Scendi»), il nome, poi clic su un quadretto evidenziato accanto al mezzo.
- **Sparare da bordo:** gruppo «Linea di tiro» (pannello o clic destro), il nome: la linea parte dal veicolo.
- Quante Azioni costano salire e scendere lo decide Davide (A.145): per ora contale a voce.

## Token in volo

- **Metterlo in volo:** clic destro sul token → gruppo «Movimento» → **«In volo»** (o l’interruttore nel pannello del token e nella sua carta). Un nemico che sa volare te lo propone quando lo metti in mappa. **«Quota…»** scrive l’altezza in Q accanto all’icona. Ctrl+Z annulla.
- **Come si vede:** l’ala sopra il token e un’ombra leggera sotto, anche sullo schermo dei giocatori e sul mini-token della barra dell’Iniziativa.
- **Cosa cambia:** si muove con il volo (6/12/18 Q, o il Passo in volo del profilo), passa sopra terreno difficile e token (non si ferma su un altro token), ma non attraversa muri e porte chiuse. Verso di lui e da lui niente token in mezzo né Copertura Leggera o Media; un muro pieno blocca. I giocatori lo vedono anche sotto la nebbia se un PG ha una linea senza muri: se vuoi che resti nascosto, nascondilo. Più alto della portata delle armi ravvicinate (con la quota) è fuori dalle zone di controllo.
- Domande per te: A.148 (Copertura e volo), A.149 (Picchiata e quota), A.150 (visto da lontano).

## Tablet dei giocatori

Ogni giocatore può guardare la mappa dal suo tablet (o telefono) e muovere da sé il proprio PG. Serve `avvia-server.bat` acceso sul PC del master e i tablet sulla **stessa rete Wi-Fi** di casa. Nessuna password: si gioca in casa, e chiunque sia sulla rete può scegliere un PG.

**Come si collega un giocatore (via principale: dalla sua scheda):**

1. Sul tablet il giocatore apre Mutant dall'indirizzo del PC del master (per esempio `http://192.168.1.20:3000`, vedi sotto) e la **scheda del suo PG**, come fa già per giocare.
2. Quando il suo PG è in uno scontro aperto, in cima alla scheda compare il riquadro **«Scontro in corso»** con **«🗺 Muovi il PG sulla mappa»**: si accende al suo turno (fuori turno è spento e dice «Non è il tuo turno · tocca a …»).
3. Il pulsante apre la mappa dello scontro con il PG già scelto e centrata su di lui: tocca il quadretto di arrivo, poi «Conferma», poi **«← Torna alla scheda»**. Quando chiudi lo scontro, il tablet torna da solo alla scheda.

**Riserva (secondo schermo, o un tablet senza la scheda):** l'indirizzo diretto della vista giocatori, per esempio `http://192.168.1.20:3000/#/mappa/giocatori` (o il QR), e «Sono…» per scegliere il PG, che il tablet ricorda.

**Dove trovi l'indirizzo (master):**

- nella finestra nera di `avvia-server.bat`, che all'avvio scrive gli indirizzi per i giocatori (`http://<IP del PC>:3000`);
- nella mappa, Strumenti → 📱 «Collega i tablet: QR e indirizzo…»: QR e indirizzo pronti, nella sezione «Vista giocatori»;
- nella plancia, il riquadro «Collega i giocatori».

L'indirizzo è fatto così: `http://`, l'**indirizzo IP del PC del master** (quattro numeri, di solito `192.168.x.y`), due punti e la **porta 3000**. Se servisse trovarlo a mano: sul PC, menu Start → «cmd» → `ipconfig` → la riga «Indirizzo IPv4» della scheda Wi-Fi o Ethernet. Se Windows chiede di consentire Node.js sulla rete, rispondi sì per le reti private. Con `--solo-locale` i tablet non si collegano.

**Che cosa fa il giocatore sul tablet:**

- vede la mappa come lo schermo dei giocatori (stessi segreti: niente token nascosti, niente sotto la nebbia), con il suo token evidenziato;
- in basso (a destra, col tablet in orizzontale) ha la sua mini-scheda: PV, PM e Stati, «tocca a te» quando è di turno, e «⌖ Centra su di me»;
- **muove solo il suo PG, solo al suo turno** (se non hai scelto «sempre»): sceglie Passo, Corsa o Scatto (pulsanti grandi), tocca il quadretto di arrivo dentro l'area verde, controlla il percorso e i Q, poi tocca **«Conferma»**. Se uscendo da una zona di controllo provoca un Attacco di Opportunità, il tablet lo avvisa prima della conferma. Due dita per lo zoom, trascinare per spostare la vista;
- niente «Libero», niente selezione di altri token, niente porte: quelle restano a te.

**Che cosa fai tu:**

- ogni movimento dai tablet lo controlla il **server** con le stesse regole della mappa (area, muri, porte chiuse, terreno difficile, Passo diviso, Corsa e Scatto in un blocco unico, turno, blocco): un movimento non valido viene rifiutato, qualunque cosa mandi il tablet;
- lo vedi sulla mappa entro un secondo, con l'avviso «📱 … si è mosso dal tablet» e, se serve, l'Attacco di Opportunità con «Attacca!». **Ctrl+Z** (o «Annulla» nell'avviso) lo annulla, come un movimento tuo;
- Strumenti → 📱 Tablet dei giocatori: **«Blocca movimenti dei giocatori»** (i tablet guardano soltanto, e lo vedono scritto), **«Movimento dai tablet: solo al proprio turno / sempre»**, **«Avviso «Tocca a te» ai tablet»** (all'arrivo del turno il tablet del PG mostra un avviso grande, con suono e vibrazione). Gli stessi interruttori stanno in fondo alla sezione «Vista giocatori»;
- nell'elenco dell'Iniziativa, accanto a ogni PG, **📱** pieno se il suo tablet è collegato (scheda o mappa aperta), sbiadito se no; **«🔔 Chiedi di muovere»** accanto a un tablet collegato: sul tablet l'avviso grande «Il master ti chiede di muovere <PG>», con suono, vibrazione (sui tablet che la supportano, di solito Android) e il pulsante «🗺 Muovi il PG sulla mappa».

**Limiti (senza HTTPS sulla rete di casa):**

- gli avvisi arrivano **solo con la pagina aperta** sul tablet: a pagina chiusa, in secondo piano o con lo schermo spento non arriva nulla. Tieni lo schermo acceso durante la sessione (la pagina lo chiede al tablet, dove il browser lo permette);
- il suono parte solo dopo il **primo tocco** sulla pagina: se il tablet lo blocca compare «🔈 Tocca per attivare l'audio»;
- se il tablet non è collegato, «Chiedi di muovere» te lo dice.

## Suoni

- **Campanella del Round:** a ogni nuovo Round suona sul PC della mappa (non con «Indietro»).
- **Musica di fondo:** copia i file nella cartella `musica/` accanto ad avvia-server.bat (MP3, OGG, WAV, M4A o AAC). Poi scegline uno in «Prepara scontro» («Musica di fondo: Scegli…») o nella mappa con ♫ in alto. Parte con lo scontro, si ripete di continuo e si ferma con «Fine scontro»; ⏸ / ▶ la mette in pausa.
- **Volume:** in alto 🔊 spegne tutto, i due cursori regolano Musica ed Effetti. Il PC se li ricorda.
- **Televisore con le casse:** Strumenti → «Suoni anche nella vista giocatori». Sullo schermo dei giocatori serve un primo clic per sbloccare l'audio (lo chiede un avviso); lo stesso vale per la mappa del master se il browser blocca l'audio.

## Zone di controllo

Scegliendo un token, in rosso compaiono le zone di controllo degli avversari: la fascia entro la portata delle loro armi ravvicinate (di solito 1 Q). Chi ne esce con il proprio movimento provoca un Attacco di Opportunità (Giocatore §5.3): compare un avviso, anche sullo schermo dei giocatori, con «Attacca!» per l'avversario. Entrare o muoversi dentro la zona non provoca nulla; «Libero» non segnala. Il tasto Z mostra o nasconde le zone.

Il tasto «?» in alto elenca tutte le scorciatoie. Alla fine, **«⏹ Fine scontro»** nella barra dell’Iniziativa in alto (o nel gruppo «Iniziativa»): chiede conferma, chiude lo scontro come nella plancia, ferma la musica e riporta alla scheda i tablet aperti dalla scheda.
