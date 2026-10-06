# Mappa di battaglia — piano tecnico

Data: 06/10/2026. Branch `battlemap`. Fonte delle funzioni: `docs/battlemap/specifica.md` (bozza 2 approvata da Marcello).
Ricognizione dell'app di Davide: `docs/ricognizione-battlemap.md`. Decisioni: `docs/risposte-master.md` (115, A.123
Iniziativa del manuale; 116, nessun riuso di codice) e domande aperte A.122, A.124, A.125, più le nuove A.126–A.130 in
fondo a questo documento.

Una scelta di fondo guida tutto il piano: **la specifica è a celle**. I token stanno sempre al centro di un Q, i muri
sono Q invalicabili dipinti a pennello, la nebbia si copre per Q. L'app di Davide invece lavora in pixel continui, con
muri a segmenti e pedine ruotate di 45°. Il modello a celle è più semplice da calcolare e da testare.

**Si scrive tutto da zero** (decisione di Marcello del 06/10/2026, decisione 116): dall'app di Davide non si copia né
si adatta codice, e la domanda A.121 è ritirata. La sua app resta solo un riferimento per le funzioni che lui usa al
tavolo (A.122).

---

## 1. Confronto con l'app di Davide (solo le funzioni)

| Funzione della specifica | Nell'app di Davide | In Mutant |
| --- | --- | --- |
| §4 Immagine di fondo, copia ridotta | Immagine o video, nessuna copia ridotta | Upload al server, copia ridotta fatta dal browser del master |
| §4 Griglia calibrabile e bloccabile | Px per Q dalla larghezza in Q, scostamento, opacità | Calibrazione tracciando un quadretto o con i valori; blocco |
| §4 Zoom e pan | Rotella verso il cursore | Camera in un modulo puro (`src/mappa/camera.js`) |
| §5 Nebbia manuale | Tratti a pennello in pixel, applicati sul frame del master | Maschera di Q coperti, filtrata dal server |
| §6 Muri a pennello per Q | Muri e porte come segmenti, costruttore a stanze | Muri come celle |
| §7 Token con Taglia, PV, Stati, nascosti | Pedina da 1 a 10 Q, visibilità «solo Direttore», niente PV né Stati | Ingombro dalla Taglia; PV e Stati dallo scontro |
| §8 Area raggiungibile Passo/Corsa/Scatto | Assente: il master muove senza limiti | Ricerca a costo minimo sulle celle, costi dai dati |
| §8 Annulla ultimo movimento | No | Registro dei movimenti del Round nella scena |
| §8 Veicoli all'INI del conducente | Salire, scendere, gruppo che si muove e ruota; nessuna iniziativa | Nostro, con il registro dei veicoli (fase 2) |
| §9 Linea di tiro (fase 2) | Misura senza muri; linea di vista a raycasting | Linea su griglia (celle attraversate) contro muri e token |
| §10 Template (fase 2) | Quadrato, cono, libero | Celle coperte da un modulo puro, misure dai dati degli incantesimi |
| §11 Barra dello scontro | Iniziativa d12 (sistema precedente, A.123) | La nostra plancia |
| §11.1 Mappa ↔ scontro | No | Nostro |
| §12 Menu con clic destro, scorciatoie | Scorciatoie del tastierino, niente menu contestuale | Nostro |
| §13 Avvisi e suoni (fase 2) | No | `src/ui/avvisi.js` |
| Fase 2: porte | Porte aperte, chiuse o bloccate | Porta = cella speciale sul muro (aperta o chiusa) |
| Fase 3: luci e rivelazione automatica | Luci a livello, raycasting | Linea di vista a celle; luci solo se A.122 dice che servono |

Nessun modulo dell'app di Davide entra in Mutant. Senza riuso servono circa una sessione in più sull'intero progetto,
quasi tutta per i veicoli sulla mappa (fase 2).

## 2. Che cosa c'è già in Mutant

| Pezzo | Dove | Uso nella mappa |
| --- | --- | --- |
| Plancia e scontri: partecipanti, Iniziativa con 1d10 e parità del manuale, turno, Round, «Avanti» | `src/scontro.js`, `src/ui/scontro.js`, `src/ui/tavolo.js` | La barra dello scontro è la plancia; il token di turno è `diTurno(scontro)`; la barra dell'Iniziativa usa l'ordine già calcolato (A.123) |
| Round e durate, Stati con durata, Stati periodici (Sanguinamento) | `src/round-scontro.js`, `src/periodici.js` | Durata dei template (fase 2); avvisi «scade al prossimo Round» |
| Carte dei PG e dei nemici, «Colpito», «Attacca», «Lancia!» dei nemici | `src/ui/tavolo.js` → `cartaPg`, `src/ui/nemici.js` → `cartaNemico` | Clic su un token: la sua carta nella barra |
| Nemici dal bestiario e «Crea nemico», bozze «Prepara scontro» | `src/crea-nemico.js`, `src/preparazione.js` | Una scena si collega a una bozza o a uno scontro aperto (§4) |
| Veicoli con record unico, movimento all'INI del conducente | `src/veicoli-registro.js` (`statoMovimento`, `muoviVeicolo`) | Token del veicolo (fase 2) |
| Taglia nel formato dei nemici (`normale` / `grande`) | `data/formato_nemici.json` → `taglia` | Dimensione del token: 1 Q o 2×2 Q (3×3 da chiarire, A.126) |
| Passo, Corsa e Scatto effettivi (armatura, carico, Stati, Tecniche) | `src/condizioni.js` → `valoriTavolo` | Le tre fasce dell'area raggiungibile; il movimento dei nemici dal loro profilo |
| Ritratti dei PG | `scelte.ritratto` (`src/ritratto.js`) | Immagine del token, servita dal server con la cache (non dentro la scena) |
| Gittate delle armi, fasce di distanza | `regole.json` → `attacco_distanza.distanza`, catalogo armi | Linea di tiro con la fascia (fase 2) |
| Aree degli incantesimi | `incantesimi.json` → versioni con «Raggio Q», «Lunghezza Q», «Larghezza finale Q» | Template proposti da «Lancia!» (fase 2) |
| «Attacca!» e «Lancia!» | `src/attacco.js`, `src/lancio.js`, pannello a passi | Aperti dalla linea di tiro con bersaglio e distanza già impostati (fase 2) |
| Avvisi, ridisegno senza perdere il punto, polling | `src/ui/avvisi.js`, `src/ui/ridisegno.js`, `INTERVALLO_MS` della plancia | Stesso schema per la mappa e la vista giocatori |
| Identità dei PG, giocatori collegati | `src/cartella.js`, `src/collegamento.js` | Il giocatore sa qual è il suo token (tab BattleMap, fase 2) |
| Revisioni e conflitto 409, scrittura atomica | `server.mjs` (scontri, veicoli) | Stesso schema per le scene |
| Copia di fine sessione | `tools/salva-sessione.mjs` | Si aggiungono `scene/` e `mappe/` all'elenco delle cartelle |

## 3. Architettura della versione minima (§14)

**Dove vive il codice:**
- **Logica pura**, senza DOM, testata con `node --test`:
  - `src/mappa/griglia.js`: Q ↔ pixel, calibrazione, camera (zoom verso un punto, pan);
  - `src/mappa/scena.js`: formato, normalizzazione, validazione, revisione;
  - `src/mappa/celle.js`: maschere di Q per muri e nebbia, pennello, rettangolo;
  - `src/mappa/area.js`: area raggiungibile, percorso, costi;
  - `src/mappa/token.js`: token dallo scontro, ingombro dalla Taglia, posizionamento libero;
  - `src/mappa/vista.js`: il filtro della vista giocatori, condiviso con il server;
  - `src/mappa/annulla.js`: pila delle azioni del master.
- **Interfaccia:**
  - `src/ui/mappa/canvas.js`: livelli, disegno su richiesta;
  - `src/ui/mappa/strumenti.js`: carica mappa, griglia, nebbia, muri;
  - `src/ui/mappa/barra.js`: plancia accanto e ridimensionamento;
  - `src/ui/mappa/iniziativa.js`;
  - `src/ui/mappa/menu.js`: clic destro, menu superiore, scorciatoie;
  - `src/ui/mappa/giocatori.js`: la vista sul secondo schermo.
- **Stile e dati:** `css/mappa.css`; regole e costanti in `data/mappa.json` (validatore), mai nel codice.

**Disegno: Canvas 2D a livelli**, sovrapposti nello stesso riquadro:
1. fondo e griglia, che cambiano solo con zoom, pan o calibrazione;
2. muri, nebbia e aree (raggiungibile, template);
3. token, selezione e linee.

Menu, barre e carte sono DOM normale, come il resto dell'app. Si ridisegna solo il livello che cambia, in un
`requestAnimationFrame`, mai a ogni evento del puntatore: niente animazioni continue. L'immagine si decodifica una volta
(`createImageBitmap`) e si disegna con la trasformazione della camera (`setTransform`).

**Formato della scena** (`scene/<id>.json`, fuori da git con `LEGGIMI.txt`; immagini in `mappe/`, anch'essa fuori da git):

```
{ formato: "mutant-scena", versione: 1, id, nome, revisione, aggiornato,
  mappa: { file, ridotta, larghezza, altezza },            // pixel dell'originale; i file stanno in mappe/
  griglia: { q_px, scosto_x, scosto_y, colore, opacita, bloccata, colonne, righe },
  muri: "<maschera di Q in base64>", terreno?: "<maschera>",   // 1 bit per Q
  nebbia: { iniziale: "coperta" | "scoperta", coperti: "<maschera>" },
  token: [ { id, rif: { tipo: "partecipante" | "veicolo" | "segnaposto", id }, q: [x, y], nascosto: false } ],
  collegamento: { scontro: id | null, bozza: id | null },
  movimenti: [ { round, token, da: [x, y], a: [x, y], percorso: 7, fascia: "passo" } ],   // movimenti del Round
  annulla: [ … ] }                                         // ultime azioni del master, limitate
```

Il token non ricopia nulla: nome, ritratto, PV, Stati, Taglia e movimento si leggono dal partecipante dello scontro o
dal record del veicolo a ogni disegno (§1, «Collegata»). Le preferenze di schermo (zoom, posizione, disposizione) stanno
nel browser di quello schermo, non nella scena.

**API del server** (`server.mjs`, stesso schema di scontri e veicoli: scrittura atomica, revisione, 409):
- **Mappe:**
  - `POST /api/mappe` carica l'originale e la copia ridotta (corpo binario, `?nome=`);
  - `GET /api/mappe/<file>` restituisce l'immagine, con la cache del browser e la versione nel nome.
- **Scene:**
  - `GET /api/scene` restituisce l'elenco;
  - `GET /api/scene/<id>` restituisce la scena completa, per il master;
  - `PUT /api/scene/<id>` salva con la revisione;
  - `GET /api/scene/<id>?vista=giocatori` restituisce **la scena filtrata dal server** (`src/mappa/vista.js`): niente
    token nascosti, niente token sotto la nebbia, niente muri sotto la nebbia, nebbia piena; nessun dato del master.
- **Fase 2:** `POST /api/scene/<id>/movimento` per il giocatore. Il server ricontrolla il turno, il token e l'area
  raggiungibile prima di scrivere.
- `salva-sessione.mjs` aggiunge `scene/` e `mappe/`.

**Copia ridotta per tablet e telefoni, senza dipendenze native.**
- **Chi la fa:** Node non ridimensiona immagini senza una libreria nativa (per esempio `sharp`), che non vogliamo. La
  prepara quindi il browser del master al caricamento: `createImageBitmap`, poi un canvas al lato massimo dei dati (per
  esempio 2048 px), poi `toBlob('image/webp')`. Carica entrambe le versioni.
- **A chi va:** il server la conserva e la dà alla vista giocatori e ai telefoni; il PC del master usa l'originale.
- **Cosa serve:** solo un browser recente; nessuna installazione.
- **Limite dichiarato:** l'immagine di fondo arriva intera al dispositivo dei giocatori. Il filtro del server toglie
  token, muri e posizioni sotto la nebbia, ma non può mascherare i pixel dell'immagine senza una libreria. La nebbia sul
  disegno è piena, quindi a schermo non si vede nulla; un giocatore che apre gli strumenti del browser potrebbe vedere
  la mappa intera (A.130).

**Area raggiungibile** (`src/mappa/area.js`, pura):
- **Calcolo:** ricerca a costo minimo (Dijkstra su griglia) dal Q del token, su un massimo di Scatto Q.
- **Costi dai dati** (`data/mappa.json`):
  - ortogonale 1;
  - diagonale **provvisoria**: 1 Q, come la misura dell'app di Davide, con il `TODO(Davide)` A.124 e l'alternativa 1/2/1 pronta;
  - terreno difficile ×2 provvisorio (A.128).
- **Ostacoli:**
  - i muri bloccano;
  - i token nemici bloccano;
  - gli alleati si attraversano ma non si occupano (provvisorio, A.127);
  - i token grandi devono entrare con tutto l'ingombro.
- **Limiti:** dai valori effettivi della scheda (`valoriTavolo` → movimento) per i PG, dal profilo per i nemici.
- **Risultato:** le celle con la fascia (Passo, Corsa, Scatto, in tre colori) e il percorso fino alla cella scelta.
- **Movimento a pezzi** nello stesso turno (A.129): il budget si consuma sommando i movimenti del Round.

**Annulla:**
- **Del token:** «Annulla ultimo movimento» toglie l'ultima voce di `movimenti` di quel token e lo riporta dov'era.
- **Del master:** `Ctrl+Z` usa la pila `annulla` della scena (spostamenti, muri, nebbia, nascondi), con un limite di
  voci nei dati.
- Le due cose restano separate: il giocatore annulla solo il proprio movimento, nel proprio turno.

**Ridimensionamento mappa ↔ scontro (§11.1):**
- **Disposizione:** griglia CSS a due colonne con un separatore trascinabile.
- **Tre disposizioni:** Mappa grande, Equilibrata, Scontro grande, ognuna con una classe che cambia la larghezza della barra.
- **Comandi:** `Tab` passa da una disposizione all'altra; doppio clic sul separatore; trascinamento per una larghezza libera.
- **Memoria:** la scelta vale per quello schermo e sta nel suo browser (`localStorage` con try/catch, come le altre
  preferenze).
- **Barra stretta:** solo mini-token e PV. Un clic su un token la riapre sulla sua carta.

**Barra dell'Iniziativa:**
- **Scala:** una scala graduata dal valore minimo al massimo dello scontro, con i mini-token (ritratto o iniziali
  colorate) messi sul loro valore.
- **Parità:** gli spareggi già risolti dalla plancia si affiancano.
- **Turno:** il token di turno è evidenziato; «Avanti» è quello della plancia (stessa funzione, stessa revisione).

**Scorciatoie e menu (§12):**
- **Gestore unico della tastiera**, attivo solo con la mappa aperta e mai mentre si scrive in un campo:
  - rotella e `+`/`−` per lo zoom;
  - spazio + mouse per spostarsi;
  - `Tab` per la disposizione;
  - `Ctrl`+clic per aprire scheda o carta;
  - `Alt`+clic per la linea di tiro (fase 2);
  - `Ctrl+Z` per annullare;
  - `Esc` per chiudere.
- **Menu con clic destro sul token:**
  - Corri / Scatta;
  - Annulla ultimo movimento;
  - per il master: Nascondi / Mostra, Apri scheda, Togli dalla mappa;
  - nelle fasi 2 e 3: Linea di tiro, Genera template.
- **Menu superiore:** gli strumenti del master. Le scorciatoie compaiono nei suggerimenti dei pulsanti.
- **Su tablet:** il menu del token si apre con una pressione lunga.

**Pagine:**
- **`#/mappa`**: la mappa del master, aperta dalla plancia con il pulsante «Mappa».
- **`#/mappa/giocatori`**: la vista giocatori, secondo indirizzo per il televisore o il tablet sul tavolo, in sola lettura.
- **Tab BattleMap della scheda**: arriva in fase 2.

## 4. Lotti

### Versione minima (§14), un lotto per prompt, in ordine

Stato: lotto 1 fatto il 06/10/2026 (scene e immagini sul server, logica pura e test: `tests/mappa.test.js`, `tests/mappa-server.test.js`; l'elenco delle scene nella plancia passa al lotto 2, con la prima interfaccia).

Stato: lotto 2 fatto il 06/10/2026: elenco delle scene nella plancia (voce «Mappa»: nuova, apri, rinomina, duplica, archivia in `scene/archivio/`), pagina `#/mappa/<id>` con immagine (copia ridotta preparata dal browser), Canvas a tre livelli, zoom, spostamento, «Adatta allo schermo», griglia calibrata tracciando un riquadro o con i valori, colore, opacità, blocco. Logica pura in `src/mappa/camera.js` e `src/mappa/griglia.js` (`tests/mappa-griglia.test.js`); interfaccia in `src/ui/mappa/`. Prova con un'immagine di 4000 × 3000 px: 0,1–0,2 ms di CPU per disegno.

Stato: lotto 3 fatto il 06/10/2026: collegamento della scena allo scontro aperto o a una bozza (gli id dei partecipanti che «Inizia» creerà coincidono, così i token preparati restano validi), elenco dei pezzi senza token (trascinamento, «Metti» e clic, «Metti tutti» in una fila libera vicino al centro), token agganciati alla griglia con ingombro dalla Taglia (3 × 3 a mano, A.126) e veicoli rettangolari dal profilo, ritratto o iniziali, bordo del lato, anello dei PV, sigle degli Stati, grigio a 0 PV, alone del turno (anche per il veicolo all'Iniziativa del conducente), Nascondi / Mostra, Togli, clic che porta la carta nella plancia (BroadcastChannel), token tolti con avviso quando il partecipante esce (con conferma se a toglierli è un cambio di collegamento). Logica pura in `src/mappa/token.js` e `src/mappa/partecipanti.js` (`tests/mappa-token.test.js`); interfaccia in `src/ui/mappa/` (fonti, disegno-token, pannello-scontro, canale).

| # | Lotto | Dimensione | Dipende da | Test | Al tavolo, alla fine del lotto |
| --- | --- | --- | --- | --- | --- |
| 1 | **Scene sul server**: `data/mappa.json` con il validatore; `src/mappa/scena.js`, `celle.js`, `vista.js`; API `/api/scene` e `/api/mappe`; cartelle `scene/` e `mappe/` con `LEGGIMI.txt`; copia di fine sessione. | Medio | — | Formato e normalizzazione, maschere, filtro della vista giocatori (token nascosti e sotto la nebbia tolti), API con revisione e 409, upload | Ancora niente a schermo: elenco delle scene nella plancia |
| 2 | **Mappa e griglia**: pagina `#/mappa` dalla plancia; carica immagine (originale e copia ridotta dal browser); canvas a livelli; zoom (rotella, `+`/`−`) e spostamento (spazio + mouse, trascinamento sul vuoto); griglia calibrata tracciando un quadretto o con i valori, colore, trasparenza, blocco; salvataggio della scena. | Grande | 1 | Camera (zoom verso il punto), calibrazione, Q ↔ pixel | Davide carica una sua mappa, allinea la griglia e la salva |
| 3 | **Token dello scontro**: collegamento della scena a uno scontro aperto o a una bozza; token dai partecipanti (ritratto, iniziali, Taglia 1 o 2×2 Q); posizionamento al centro dei Q; anello dei PV, icone degli Stati, token di turno; nascosti; «Togli dalla mappa». | Grande | 2 | Token dallo scontro, ingombro, posizioni libere, nascosti | I PG e i nemici dello scontro stanno sulla mappa con PV e Stati veri |
| 4 | **Vista giocatori e nebbia**: secondo indirizzo `#/mappa/giocatori` (polling, zoom proprio); nebbia iniziale coperta o scoperta, pennello per Q e rettangolo, semitrasparente per il master e piena per i giocatori; filtro dal server. | Medio | 3 | Filtro (nebbia, nascosti), pennello e rettangolo sulle maschere | Il televisore mostra la mappa con la nebbia; il master rivela una stanza alla volta |
| 5 | **Muri e area raggiungibile**: pennello dei muri (e del terreno difficile); area con Passo in evidenza, Corri / Scatta in tre colori; movimento cliccando o trascinando dentro l'area; movimenti del Round; «Annulla ultimo movimento»; `Ctrl+Z` del master. | Grande | 3 (4 per la vista) | Area con muri, token, alleati, ingombri grandi, diagonali dei dati, movimento a pezzi; pila dell'annulla | Il master muove i token con le regole del manuale e annulla un errore |
| 6 | **Barra dello scontro e Iniziativa**: plancia come pannello accanto alla mappa (carte, «Colpito», «Avanti»); tre disposizioni con `Tab`, doppio clic e trascinamento del bordo; barra dell'Iniziativa graduata; clic su un token apre la sua carta. | Grande | 3 | Scala dell'Iniziativa (posizioni, parità) e disposizioni come funzioni pure | Tutto lo scontro si gestisce da un solo schermo, senza la plancia a parte |
| 7 | **Menu e scorciatoie; collaudo**: menu con clic destro (e pressione lunga), menu superiore, scorciatoie principali con i suggerimenti; prova con copie dei PG su PC, tablet e televisore. | Medio | 2–6 | Tabella delle scorciatoie (nessun conflitto con i campi), resto dal collaudo | La versione minima della specifica, pronta per una sessione vera |

**Totale della versione minima:** 7 lotti, circa 9–12 sessioni di lavoro. Ogni lotto lascia l'app funzionante e
`main` intatto: il branch `battlemap` si unisce a `main` quando la versione minima è collaudata, o lotto per lotto se
Marcello preferisce.

### Fase 2

1. **Tab BattleMap** nella scheda con il movimento del giocatore dal tablet (`POST /api/scene/<id>/movimento`, controllo nel server) e il blocco dei movimenti dal master.
2. **Linea di tiro**: distanza, fascia di gittata dell'arma, colori libera / attraversa token (Copertura) / bloccata; apre «Attacca!» con bersaglio e distanza.
3. **Template**: quadrato, cono, cerchio, rettangolo libero; durata in Round con avviso alla scadenza; proposta da «Lancia!» con le misure dell'incantesimo; token coperti evidenziati.
4. **Porte** sui muri (aperta, chiusa).
5. **Veicoli sulla mappa**: ingombro, passeggeri, movimento all'Iniziativa del conducente con l'andatura.
6. **Avvisi** di turno («Sei il prossimo», «È il tuo turno»), richiami del master, suoni brevi e vibrazione con interruttore.

### Fase 3

- Rivelazione automatica della nebbia con la vista dei PG; luci e linea di vista (solo se A.122 dice che servono).
- Pre-analisi dei muri e immagini dei token con l'AI. Sono le uniche funzioni che richiedono internet e una chiave API
  sul PC del master, quindi vanno decise a parte, perché la specifica esclude i servizi esterni (§16).

## 5. Rischi e mitigazioni

- **Prestazioni sui tablet.**
  - Canvas grandi e ridisegni frequenti rallentano o esauriscono la memoria (iOS limita i canvas a circa 16 milioni di pixel).
  - Mitigazioni: copia ridotta per i dispositivi deboli; tre livelli separati; ridisegno solo su richiesta; nebbia e muri
    come maschere di Q, non immagini; ritratti piccoli in cache.
  - Un lotto non si chiude senza la prova su un tablet vero.
- **Immagini grandi.**
  - Il caricamento supera il limite attuale del server (10 MB, pensato per i PG).
  - Limite proprio per le mappe nei dati (per esempio 30 MB), messaggio chiaro se lo si supera.
  - Mai immagini dentro il JSON della scena, al contrario dei data URL dell'app di Davide.
  - Cache del browser con la versione nel nome del file.
- **Sincronizzazione.**
  - Polling come la plancia (1–3 s) e revisione con 409.
  - Il movimento del giocatore (fase 2) è una richiesta piccola e verificata dal server, non una riscrittura della scena,
    così non cancella le modifiche del master.
  - Mappa e plancia scrivono lo stesso scontro con la stessa revisione: «Avanti» resta uno solo.
- **Schermo doppio.**
  - La vista giocatori è un secondo indirizzo, aperto in una seconda finestra sul televisore collegato al PC o su un
    tablet. Deve restare aperta e attiva: avviso «collegamento perso» se il polling si ferma, schermo che non si spegne
    (§13).
  - Il master non deve confondere le finestre: la vista giocatori non ha comandi e lo dice in alto.
- **Riservatezza.** L'immagine intera arriva ai giocatori (vedi §3). Sul tavolo basta; se no, servirebbe una libreria
  nativa o il frame calcolato dal master (A.130).
- **Due app che convivono.** Finché la mappa non è completa, Davide può usare la sua app. La specifica (§1) chiede una
  sola app: la versione minima deve coprire quello che lui usa davvero (A.122) prima di proporgliela.

## 6. Domande nuove per Davide

- **A.126 — Taglia dei token.** Le creature «grandi» occupano 2×2 Q. Quando 3×3 («se indicato», §7)? Serve un campo
  «ingombro in Q» nel formato dei nemici, oltre a normale e grande?
- **A.127 — Attraversare i Q occupati.** Durante il movimento si può passare nel Q di un alleato? E di un nemico? Ci si
  può fermare nel Q di un alleato?
- **A.128 — Terreno difficile.** Quanto costa un Q di terreno difficile (il doppio?) e vale anche per Corsa e Scatto?
- **A.129 — Movimento diviso.** Nello stesso turno si può muovere, attaccare e muovere ancora (il Passo si spende a
  pezzi)? Corsa e Scatto consumano anche l'Azione Principale?
- **A.130 — Mappa sotto la nebbia.** Va tenuta segreta anche a chi apre gli strumenti del browser, o basta che non si
  veda sullo schermo? (Nel primo caso serve un passo in più, vedi §3.)
