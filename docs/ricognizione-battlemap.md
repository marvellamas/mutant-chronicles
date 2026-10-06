# Ricognizione: «EROI & LEGGENDE – Tavolo Digitale» di Davide (battlemap)

Data: 06/10/2026. Oggetto: esportazione dei sorgenti in `F:\REPOS\Eroi-Leggende` (α 0.29.1, commit `bd00782`, 03/10/2026),
scritta con l'agente di ChatGPT e pubblicata su «Sites» (Cloudflare Worker + D1 + R2, login con ChatGPT). Lettura sola:
nessuna installazione, build o modifica in quella cartella. Fonti: `LEGGIMI_RICOGNIZIONE.md`, `MANIFEST_RICOGNIZIONE.json`, i
sorgenti (`app/`, `lib/`, `worker/`, `db/`, `tests/`). Riferimenti nella forma `file:riga`.

**Passo 0 (repository di Mutant).** `.gitignore` esclude `personaggi/*` e tiene `!personaggi/LEGGIMI.txt` (righe ripristinate e
già nel commit 89f0ee2); nell'indice di `personaggi/` c'è solo il `LEGGIMI.txt`. Da sapere: i file reali dei sette PG sono
ancora tracciati in **`PersonaggiBackup/`** (commit fcddacb, «backup personaggi nuova cartella») e restano nella storia di git
(commit 32dfa86 e a5e0e47). Non li ho toccati: è una cartella creata apposta da Marcello. Se la decisione «i PG reali non
vanno nel repository dell'app» vale anche per il backup, basta `git rm -r --cached PersonaggiBackup/` più una riga in
`.gitignore`; per toglierli anche dalla storia servirebbe riscriverla (sconsigliato).

---

## 1. Funzioni

**Per il master** (console in `app/page.tsx`):
- **Mappa:**
  - immagine o video come sfondo (png, jpeg, webp, mp4, webm), con calibrazione della griglia in Q (si indica la larghezza della mappa in Q);
  - 1 Q = 1,5 m modificabile;
  - zoom e pan, rotazione a 90°;
  - costruttore di mappe a stanze (`map-editor.tsx`), che esporta un PNG a 72 px per Q e i muri e le porte.
- **Pedine:**
  - categorie PG, PNG, creatura, oggetto, veicolo;
  - dimensioni 1–10 × 1–10 Q, rotazione a 45°;
  - immagine, colore, visibilità («tutti» o «solo Direttore»), luce propria.
- **Muri e porte:**
  - disegno a polilinea; porte aperte, chiuse o bloccate;
  - collisione continua quando si trascina;
  - i PG aprono da soli le porte non bloccate.
- **Luci, linea di vista e nebbia:**
  - luci fisse o dinamiche (sempre accese, manuali, per prossimità), raggio = livello × 3 Q;
  - vista a raggio o a linea di vista (raycasting);
  - nebbia a pennello o a blocchi di Q, rivelata dalle luci.
- **Strumenti di scontro:**
  - template ad area (quadrato, cono, libero) con 14 effetti visivi;
  - misura delle distanze (le diagonali valgono 1) e anelli di portata 10/20/40/80/160 Q;
  - iniziativa con round, turni e note; nessun PV né condizioni.
- **Scene:**
  - autosalvataggio nel browser;
  - archivio online delle scene (snapshot JSON e file della mappa);
  - «richiamo» dei PG da una scena salvata.

**Per i giocatori** (`app/giocatore/page.tsx`, con login ChatGPT):
- si entra con il codice di sessione;
- si vede l'immagine della mappa renderizzata dal master (con la sua nebbia), aggiornata ogni circa 1 s;
- nel proprio turno il giocatore muove il proprio PG di 1 Q alla volta in orizzontale o verticale, entro il budget di Q
  fissato dal master;
- apre e chiude porte entro la portata, dichiara «azione», chiude il turno.

**Per l'aiuto-master** (`app/aiuto-direttore/page.tsx`):
- muove il PG di turno in 8 direzioni o trascinandolo, senza budget;
- vede l'elenco dei PG e lo stesso frame dei giocatori;
- va abilitato dal master.

**Veicoli:**
- pedina con ingombro; i PG salgono a bordo e il gruppo si muove e ruota insieme;
- li muove solo il master;
- nessuna iniziativa e nessun dato di regola (velocità, PI).

**Sessione online:**
- il master crea la sessione e condivide il link;
- assegna un PG a ogni giocatore e fissa per ogni PG movimento, azioni, costo delle porte e portata;
- sincronizzazione a polling (1,2 s il master, 1,1 s il giocatore).

## 2. Modello dati e confronto con le nostre regole

**Pedina** (`page.tsx:43`):
- campi: `{ id, name, position (px), sizeQ, widthQ?, heightQ?, facing?, vehicleId?, kind, visibility, colorIndex, imageDataUrl?, lightEnabled, lightRadiusQ, lightShadowQ }`;
- **non ha** Caratteristiche, PV, Stati né un legame con una scheda.

**Scena** (`SceneSnapshot`, `page.tsx:116-176`):
- circa 60 campi: mappa, camere, griglia, nebbia, luci, muri e porte, pedine, iniziativa, template;
- anche preferenze dell'interfaccia e selezioni correnti.

**Iniziativa** (`InitiativeEntry`, `page.tsx:60`; calcolo `page.tsx:285-305`):
- `{ pawnId, dexterity 1–30, intelligence 1–30, modifier, roll 1–12, initiative, extraActions 0–5 }`;
- `INI = d12 + floor((DES−10)/2) + floor((INT−10)/2) + modificatore`;
- ogni azione extra crea un altro turno a `INI − 3·k`;
- ordine: segmento, poi DES, poi ordine di inserimento.

**PG richiamato** (`lib/pg-recall.ts`):
- è solo la pedina con la sua voce d'iniziativa, letta da una scena salvata;
- i valori di DES e INT si inseriscono a mano.

**Veicoli** (`lib/vehicles.ts`):
- passeggeri via `vehicleId`, capienza solo geometrica;
- nessun turno né andatura.

| Tema | App di Davide | Mutant (manuali, decisioni) | Domanda per Davide |
| --- | --- | --- | --- |
| Iniziativa | d12 + (DES−10)/2 + (INT−10)/2, Caratteristiche 1–30 | Mod DES + Mod INT (tabella dei modificatori ordinari, Caratteristiche 1–10) + **1d10** (§2.14) | Quale formula vale al tavolo? Il d12 e la scala 1–30 sono di un'altra versione delle regole? |
| Parità | DES, poi ordine di inserimento («simultanea») | DES, poi INT; alleati scelgono; fra avversari 1d10 (Giocatore §5.1) | Le parità vanno risolte come nel manuale? |
| Azioni in più | `extraActions`: turni aggiuntivi a INI −3, −6… | 1 AzM + 1 AzP, la seconda AzP al 12° livello, **nello stesso turno** | Le azioni extra sono turni separati nel Round (segmenti) o azioni nello stesso turno? |
| Movimento | Libero per il master; online 1 Q ortogonale a passo, budget di Q a scelta del master | Passo 6 / Corsa 12 / Scatto 18 Q per Azione di Movimento, ridotti da armatura, carico, Stati | Le diagonali contano 1 Q (come nella misura della sua app) o 1,5? Il budget per turno è Passo/Corsa/Scatto? |
| Porte | Aprire costa `doorCost` azioni (impostato dal master) | Non c'è una regola sul costo delle porte | Quanto costa aprire una porta? |
| Luci | Raggio = livello × 3 Q, ombra = livello Q | A.106: luce sufficiente / penombra −2 / molto scarsa −4 / buio = Accecato | Il «livello» della luce è una regola? Come si traduce nei livelli di illuminazione di A.106? |
| Veicoli | Solo il master li muove, nessuna iniziativa | A.105: il mezzo si muove all'Iniziativa del conducente, una volta per Round, con l'andatura | Coerente nello spirito; serve la velocità per andatura sulla mappa (Q per Round)? |
| PV e Stati | Assenti | Nella scheda, nella plancia e nello scontro | Al tavolo li tieni su carta? |
| Scala | 1 Q = 1,5 m (modificabile) | 1 Q = 1,5 m (Giocatore §5.13) | Nessuna differenza. |

## 3. Ingressi e uscite

**`/api/scenes`** (`worker/index.ts`):
- richiede l'header `oai-authenticated-user-email` di Sites; in locale vale `preview@local`;
- `GET` restituisce l'elenco o la scena, `?map=1` restituisce il file della mappa;
- `POST` multipart (snapshot JSON fino a 1,8 MB + file della mappa); `DELETE` toglie la scena.

**`/api/live`** (`worker/live.ts`):
- richiede `oai-authenticated-user-id` e non ha ripieghi locali: senza login ChatGPT risponde 401;
- `GET` restituisce lo stato proiettato per ruolo o il frame WebP;
- `POST` gestisce `create`, `join`, `join-assistant`, `command`, `assign`, `assistant-access`, `close`, `sync`;
- master con autorità sullo stato, comandi in coda su D1, concorrenza ottimistica sulla versione.

**File:**
- **non c'è nessun export né import di file JSON** delle scene: si salvano solo sul server online, oppure nel browser;
- si caricano solo l'immagine o il video della mappa e le immagini delle pedine, salvate come data URL nello snapshot;
- l'unico file prodotto è il PNG del costruttore di mappe.

**Autenticazione:**
- serve il login ChatGPT di Sites per l'archivio delle scene e per ogni partecipante della sessione online;
- un giocatore senza account ChatGPT non può entrare.

## 4. Esecuzione

**In locale su Windows:**
- gli script (`scripts/*.sh`) richiedono Bash, flock, GNU timeout, curl: servono WSL, oppure `npm install` e `npx vite` a mano;
- `vite.config.ts` simula D1 e R2 con Miniflare (plugin Cloudflare), senza installare Wrangler a parte;
- le scene funzionano anche in locale;
- **le sessioni online no**: senza un proxy che inietti l'identità rispondono 401, e fuori da Sites servirebbe un'identità propria.

**Dipendenze:** circa 380 KB di lockfile, React 19, Next/vinext, Vite 8, Tailwind, Drizzle. Davide non gestisce né GitHub né il
software: ogni modifica passa dall'agente di ChatGPT.

## 5. Qualità

**`app/page.tsx` (5846 righe, ~300 KB):**
- un solo componente React di circa 5000 righe, con ~98 `useState`, ~75 `useRef` e 18 `useEffect`;
- la funzione di disegno è lunga circa 800 righe; lo snapshot elenca circa 55 dipendenze;
- quasi ogni dato esiste due volte (stato e ref) e va allineato a mano;
- `loadMap` riazzera circa 50 stati uno per uno.

**Logica duplicata:** il calcolo dei turni è sia in `page.tsx` sia in `lib/live-rules.ts`; i tipi della pedina sono ridefiniti
tre volte.

**Test:**
- `tests/live-session.test.mjs` con circa 38 casi sulle regole online, i veicoli, le porte e le API;
- un test di rendering;
- `npm test` esegue solo il rendering;
- nessun test sulla console del master.

**Parti pulite:**
- `lib/` è fatto di funzioni pure, immutabili e documentate: geometria, movimento, veicoli, regole online;
- sono riusabili togliendo i tipi TypeScript.

**Rischi di manutenzione:** alti. Ogni funzione nuova tocca il monolite; nessun annulla globale; preferenze e dati di gioco nello
stesso snapshot salvato ogni 350 ms.

---

## 6. Strade per l'integrazione

**A — File di scena.**
- La plancia di Mutant esporterebbe pedine (PG, nemici, veicoli) e iniziativa nel formato `SceneSnapshot`.
- Ma l'app di Davide **non ha un import di file**: andrebbe aggiunto da lui, con l'agente di ChatGPT, nel monolite.
- In alternativa si potrebbe scrivere in `/api/scenes`, che però richiede il login di Sites dal browser e un'origine diversa.
- Dovremmo convertire l'iniziativa in d12 e Caratteristiche 1–30, e porta solo dati statici (niente PV né turni condivisi).
- **Costo per noi:** piccolo (1 sessione). **Per Davide:** una funzione nuova nella sua app. **Valore:** basso.
- **Rischio:** due app comunque, il problema del playtest resta.

**B — Collegamento in tempo reale.**
- Il sito di Davide è HTTPS su Internet, il nostro server è HTTP in rete locale: i browser bloccano le chiamate da HTTPS a HTTP
  (contenuto misto).
- Servirebbero un tunnel HTTPS (cloudflared o ngrok) o un certificato locale, CORS, un'identità comune con il login ChatGPT e
  una mappatura continua fra i due modelli di dati.
- **Costo:** grande, sui due lati. **Rischio:** molto alto (rete, login, due app da tenere allineate). Sconsigliata.

**C — Una sola app.**
- **C1, la mappa dentro Mutant:** riscrittura della mappa come modulo del Tavolo del Master, riusando le funzioni pure di `lib/`
  (geometria, movimento, veicoli). Stessa rete, stesso server, stessi PG, scontri e veicoli. Costo medio-grande (vedi §8),
  rischio contenuto, niente login esterni.
- **C2, il contrario:** portare schede, regole e plancia di Mutant dentro la sua app. Non praticabile: monolite React su Sites,
  senza schede né regole, che Davide non gestisce.

**Raccomandazione.** La strada C1:
- una sola app, un solo server sul PC del master, i PG e lo scontro già nostri che diventano pedine;
- dall'app di Davide si riusano le idee e le funzioni pure di geometria e movimento, non il codice dell'interfaccia;
- A e B costano meno solo in apparenza: lasciano due app, cioè il problema del playtest.

## 7. Inventario delle funzioni della sua app

| Funzione | Valutazione | Difetto concettuale o d'uso, e come lo eviteremmo |
| --- | --- | --- |
| Immagine della mappa come sfondo | Indispensabile | Calibrazione indicando la larghezza in Q: noi con due clic su una cella (o la larghezza), salvata con la mappa. |
| Griglia in Q, 1 Q = 1,5 m | Indispensabile | Nessuno. |
| Zoom e pan | Indispensabile | Su telefono: gesti a due dita, non la rotella. |
| Pedine PG e nemici | Indispensabile | **Pedina scollegata dalla scheda**: nome e immagine si reinseriscono a mano. Noi: la pedina è il partecipante dello scontro (PG con ritratto, PV, Stati; nemico del bestiario); niente doppioni. |
| Iniziativa e turni | Indispensabile | **DES e INT si reinseriscono a mano, formula diversa dal manuale.** Noi: l'iniziativa è quella dello scontro della plancia (già tirata e ordinata); la mappa evidenzia la pedina di turno. |
| Movimento con aggancio alla griglia | Indispensabile | **Il master non ha limiti; online il budget è un numero a mano per ogni PG.** Noi: Passo/Corsa/Scatto dal PG (armatura, carico, Stati già calcolati), con gli anelli e il conteggio dei Q mentre si trascina. |
| Misura delle distanze | Indispensabile | Diagonali a 1 Q (da confermare con Davide). Noi: dai dati, e gittate delle armi del PG (corta, media, lunga). |
| PV e Stati sulle pedine | Indispensabile (manca nella sua app) | Noi li abbiamo già: barra dei PV e Stati sulla pedina, «Colpito» dalla pedina. |
| Vista del giocatore sul telefono | Indispensabile | **Login ChatGPT, codice, assegnazione a mano, quattro limiti per PG.** Noi: il giocatore è già collegato alla sua scheda (stesso server); la mappa si apre dalla scheda, la propria pedina è già sua. |
| Muri e porte | Utile | Riusiamo la collisione continua e l'apertura delle porte (`pawn-movement.ts`). |
| Nebbia di guerra | Utile | Nebbia lato master su un'immagine del frame: noi una maschera di Q coperti salvata nella scena, applicata anche alla vista del giocatore. |
| Template ad area | Utile | Noi collegati agli incantesimi e alle granate («Lancia!», area dai dati). |
| Anelli di portata | Utile | Noi: Passo/Corsa/Scatto e gittate, non 10/20/40/80/160 fissi. |
| Veicoli sulla mappa | Utile | Senza dati di regola nella sua app; noi la pedina è il record unico del veicolo (A.91) e si muove all'Iniziativa del conducente (A.105). |
| Luci e linea di vista | Utile, più avanti | Costose da calcolare sui telefoni; noi solo se Davide le usa davvero. |
| Rotazione delle pedine e pedine rettangolari | Utile (veicoli) | Riuso di `pawn-geometry.ts`. |
| Scene salvate | Indispensabile | Noi: file JSON in una cartella `scene/` del server (come gli scontri), con la mappa in `mappe/`. |
| Richiamo dei PG da una scena | Superflua | Da noi i PG sono già nella cartella. |
| Costruttore di mappe a stanze | Superflua all'inizio | Utile per chi non ha mappe pronte; dopo. |
| Mappa video | Superflua | Pesante sui telefoni. |
| Rotazione della mappa a 90° | Superflua | Basta ruotare l'immagine prima. |
| Aiuto-master | Superflua | La plancia e la mappa del master fanno lo stesso; eventualmente una seconda finestra del master. |
| Effetti visivi dei template (14) | Superflua | Un colore per natura del danno basta. |
| Vista giocatori locale (finestra a parte) | Utile | Noi: la vista giocatore è la stessa pagina, anche su un secondo schermo. |

**Difetti concettuali principali dell'app di Davide** (e come li evitiamo):
1. **Due fonti di verità per il PG:** scheda su carta (o in Mutant) e pedina in mappa con i valori ricopiati. Da noi la pedina è
   la scheda.
2. **Iniziativa con una formula diversa dal manuale** (d12, Caratteristiche 1–30) e reinserita a ogni scontro. Da noi viene
   dalla plancia, con le regole del manuale.
3. **Movimento senza regole per il master** e a budget manuale per i giocatori. Da noi Passo, Corsa e Scatto calcolati, con le
   penalità già nella scheda.
4. **Sessione online macchinosa:** sei passaggi prima di giocare, login ChatGPT, link, assegnazioni, limiti, mappa bloccata
   durante la sessione. Da noi i giocatori sono già collegati alla loro scheda sullo stesso server.
5. **Snapshot che mescola gioco e interfaccia**, salvato di continuo, e nessun annulla. Da noi la scena contiene solo i dati di
   gioco, con l'annulla dell'ultima azione come nella scheda.

## 8. Riscrittura della mappa dentro Mutant (strada C1)

**Architettura** (nel nostro stack: HTML, moduli ES, `server.mjs`, dati in `data/`, file in cartelle locali, nessun login):
- **Server:**
  - cartelle `mappe/` (immagini caricate, con una copia ridotta per i telefoni) e `scene/` (JSON con revisione, come gli
    scontri; fuori da git con `LEGGIMI.txt`);
  - API `/api/mappe` e `/api/scene` sullo stesso schema di `/api/scontri` (revisione e conflitto 409);
  - entrambe le cartelle vanno anche in `salva-sessione.bat`.
- **Dati:** `data/mappa.json` con dimensione del Q in metri, colori delle pedine per lato, raggi della vista, colori per natura
  dell'area. Le distanze vengono dalle regole (movimento, gittate, aree degli incantesimi).
- **Motore puro** (`src/mappa.js`, testato con `node --test`):
  - conversioni Q ↔ px, aggancio alla griglia, distanza in Q (con la regola delle diagonali decisa da Davide);
  - Q raggiungibili con Passo, Corsa e Scatto, aree dei template;
  - collisioni e porte, adattando `pawn-geometry` e `pawn-movement`;
  - pedine dai partecipanti dello scontro (`src/scontro.js`) e dai veicoli del registro (`src/veicoli-registro.js`).
- **Interfaccia:**
  - `src/ui/mappa.js`: un canvas con livelli (mappa, griglia, nebbia, pedine, misura), aperto dalla plancia («Mappa dello
    scontro») e dalla scheda del giocatore;
  - il master trascina tutte le pedine; il giocatore solo la propria, nel suo turno;
  - i Q del Passo e della Corsa sono evidenziati e il movimento resta nel limite.
- **Sincronizzazione:** polling come la plancia (1–3 s), con la revisione della scena. Il movimento del giocatore è una richiesta
  breve, che il server accetta solo nel suo turno.
- **Vista del giocatore:** riceve la scena già filtrata dal server (pedine nascoste e Q coperti tolti), così sul telefono non
  arriva quello che non deve vedere.

**Da riusare dell'app di Davide:**
- **Da portare in JS adattandole:** le funzioni pure di `lib/pawn-geometry.ts` (aggancio, ingombro, rotazione a 45°, collisione
  fra rettangoli orientati, segmento contro pedina), `lib/pawn-movement.ts` (barriere, apertura atomica delle porte) e
  `lib/vehicles.ts` (salire, scendere, gruppo che si muove e ruota). Restano da tenere i test corrispondenti di
  `live-session.test.mjs`.
- **Da prendere come idea:** il poligono di visibilità a raycasting (`page.tsx:605-651`), per il lotto delle luci.
- **Da riscrivere:** tutta l'interfaccia, il disegno, il modello della scena, iniziativa, sessioni e API, legati a React, Sites e
  al monolite.
- **Licenza:** il codice è di Davide; va chiesto il permesso di riusarlo.

**Lotti** (dimensione; sessioni di lavoro come quelle fatte finora):

| Lotto | Contenuto | Dimensione | Sessioni |
| --- | --- | --- | --- |
| 1 — MVP | Caricamento dell'immagine (copia ridotta per i telefoni), calibrazione della griglia, zoom e pan anche a due dita. Pedine dai partecipanti dello scontro (PG con ritratto, PV e Stati; nemici; veicoli). Trascinamento con aggancio e conteggio dei Q, anelli Passo/Corsa/Scatto della pedina di turno, misura con gittate. Turno evidenziato dall'iniziativa della plancia. Scene salvate in `scene/`. Vista del giocatore sul telefono (sola lettura, la sua pedina evidenziata). | Grande | 3–4 |
| 2 | Movimento del giocatore dal telefono nel suo turno, nel limite di Passo e Corsa. Pedine nascoste. «Colpito» e «Attacca» dalla pedina. | Medio | 2 |
| 3 | Muri e porte (riuso delle funzioni pure), collisione nel trascinamento. | Medio | 1–2 |
| 4 | Nebbia a Q (copri e rivela a pennello o a blocchi), filtrata dal server per i giocatori. | Medio | 1–2 |
| 5 | Template ad area da «Lancia!» e granate (cerchio, cono, quadrato), con i bersagli coinvolti. | Medio | 1–2 |
| 6 | Veicoli sulla mappa: ingombro, passeggeri, movimento all'Iniziativa del conducente con l'andatura (A.105). | Medio | 1–2 |
| 7 | Luci e linea di vista (raycasting), visione per giocatore e illuminazione di A.106. | Grande | 2–3 |
| 8 (facoltativo) | Costruttore di mappe a stanze, rotazione della mappa, effetti grafici. | Medio | 2 |

- **MVP utilizzabile al tavolo:** lotto 1, circa 3–4 sessioni. Con i lotti 2–4 (circa 4–6 sessioni in più) copre quello che
  oggi Davide usa probabilmente di più. Tutto, lotti 1–7: circa 12–16 sessioni.
- **Mancheranno nell'MVP:** muri e porte, nebbia, luci e linea di vista, template ad area, veicoli in movimento sulla mappa,
  movimento dal telefono, costruttore di mappe, mappe video, rotazione della mappa, aiuto-master.

**Rischi:**
- **Prestazioni sui telefoni:** mappe da 4–8 mila pixel e il ridisegno a ogni gesto. Copia ridotta lato browser al caricamento
  (canvas, senza dipendenze), livelli separati, ridisegno solo dove cambia; la nebbia e la vista a raycasting sono le parti più
  pesanti (lotto 7 per ultimo).
- **Immagini grandi** nel trasferimento in rete locale: cache del browser con la versione nel nome, mai la mappa dentro il JSON
  della scena (al contrario dei data URL dell'app di Davide).
- **Sincronizzazione:** due persone che muovono la stessa pedina. Revisione con conflitto 409 come per gli scontri; il turno
  decide chi può muovere.
- **Riservatezza:** la nebbia lato browser si aggira; per questo la scena del giocatore arriva già filtrata dal server.
- **Davide** deve poter fare tutto dalla plancia, senza GitHub: la mappa si apre dallo stesso `avvia-server.bat`.

**Da chiedere a Davide** (prima del lotto 1):
1. Quali funzioni della sua app usa davvero al tavolo? Mappe proprie o costruite, nebbia, luci, porte, template, vista dei
   giocatori sul telefono o su un secondo schermo?
2. Le mappe che usa: dimensioni tipiche in pixel e in Q, immagini o video?
3. Le regole della tabella al §2: formula dell'iniziativa, diagonali, costo delle porte, azioni extra, livelli delle luci.
4. Se possiamo riusare le sue funzioni di geometria, movimento e veicoli (sono sue).
5. Come vuole i PG sulla mappa: mossi dal giocatore dal telefono, o solo dal master?
