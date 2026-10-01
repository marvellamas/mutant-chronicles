# Tavolo del Direttore: piano di fattibilità

Branch `tavolo-direttore`, 1° ottobre 2026. È un piano: non c'è ancora nessuna plancia.

La visione di partenza è in `docs/backlog.md`, voce 14, su `main`. Al tavolo molti giocatori usano la scheda di carta. Il Direttore tiene lo stato della scena su una plancia con PG e nemici:

- ordine di Iniziativa;
- PV, PM e Stati con indicatori;
- danno applicato con il calcolo dell'app;
- attacchi dei nemici, con il dado tirato dal vivo o dal sistema.

Il server gira sul PC di Davide o di Marcello. Gli altri si collegano con l'indirizzo IP, sulla stessa rete.

Regole del branch:
- `main` non si tocca.
- I dati di gioco (`data/*`) non si modificano qui. Se un pezzo li richiede (per esempio un bestiario), si fa su `main` e si porta dentro con un merge.

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

Questa è la base della plancia. I personaggi dei giocatori sono già file leggibili dal PC del Direttore, se i giocatori aprono l'app servita da quel PC.

## 2. Architettura minima

```
PC del Direttore (server.mjs --rete)
├── personaggi/            PG: file dell'export, scritti dalle schede dei giocatori o dal Direttore
├── scontri/               uno stato di scontro per file (nuovo)
│   └── <id>.json          { versione, nome, round, turno, partecipanti: [...], registro: [...] }
├── nemici/                bestiario della campagna (nuovo, dati del Direttore: vedi §3)
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
- Quando il Direttore cambia i PV di un PG, la plancia riscrive il file del PG.
- La scheda del giocatore se ne accorge al prossimo controllo, con la regola già fatta: vince il più recente, con un avviso.
- Per evitare scritture incrociate serve una scrittura con versione (§5, R1).

**Aggiornamento:** polling ogni 2–3 secondi su `GET /api/scontri/<id>` e sull'elenco dei personaggi, con l'`mtime` per non rileggere i file invariati. Niente WebSocket nella prima versione: sono zero dipendenze, sulla stessa rete bastano.

**API nuove**, sullo stesso schema di quelle dei personaggi:
- `GET/PUT /api/scontri/<id>`, con un controllo di versione (`If-Match`: mtime o contatore) che rifiuta una scrittura su una versione vecchia;
- `GET /api/scontri`;
- `GET /api/nemici`.

## 3. Che cosa serve dai dati e oggi manca

1. **Bestiario dei nemici.** Oggi non esiste: i manuali non hanno ancora un capitolo dei nemici.
   - Formato proposto, un file per nemico in `nemici/` (o un `data/bestiario.json` su `main`, se Davide vuole che sia regola condivisa):
     ```json
     { "id": "legionario-non-morto", "nome": "Legionario Non Morto", "fonte": "Direttore",
       "pv": 22, "ar": { "totale": 3, "magica": 0 }, "difese": 9, "salvezze": { "tempra": 12, "riflessi": 8, "volonta": 14, "magia": 10 },
       "iniziativa": 1, "movimento": { "passo": 6 },
       "attacchi": [ { "nome": "Spada da cerimonia", "va": 11, "danno": "1d8+2", "tipo": "ravvicinato", "portata_q": 1, "proprieta": [] } ],
       "note": "Immune alla Paura." }
     ```
   - Sono numeri «già fatti», come li scrive il Direttore: non serve ricostruire un nemico con Caratteristiche e Classi.
   - Le armi possono puntare al catalogo (`"rif": "armi:spada-lunga"`), e allora il danno viene dalla scheda dell'arma.
   - **Chi lo inserisce:** il Direttore, con un piccolo editor nella plancia (pezzo 3) o copiando file JSON. Davide decide se alcuni nemici diventano «ufficiali» (allora su `main`, in `data/`, con il validatore).
2. **Valori dei nemici al tavolo:** PV attuali, Stati, Ferite, Sanguinamento. Il formato può essere quello di `sessione` dei PG (`src/sessione.js`), con i massimi presi dal nemico e non da `calcolaScheda`.
3. **Iniziativa:** la regola c'è (Giocatore §2.14: «Mod DES + Mod INT; in combattimento si aggiunge 1d10»; parità nel §5.1, «Parità di Iniziativa»). Va solo applicata: valore della scheda o del nemico + d10 dal vivo o dell'app, ordine e spareggi.
4. **Danno ricevuto:** la sequenza c'è (Giocatore §5.13–5.15).
   - Si applicano Difesa e Armatura, separatamente per ogni applicazione (AC), poi PV, PS Tempra per le Ferite e Sanguinamento.
   - Oggi l'app la mostra solo come testo: manca la funzione pura «applica un colpo» che parta dal danno tirato e restituisca la nuova sessione e il registro.
   - **«Locativo»:** il Giocatore 0.45 dice che le AC «non assegnano locativi» e che l'Armatura «non viene suddivisa per parti anatomiche». Quindi oggi non c'è una tabella dei locativi da calcolare (vedi le domande, §6).

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

1. **Pezzo 1 — Plancia in sola lettura dei PG.** Rotta `#/tavolo`, solo con il server: una carta per PG da `personaggi/`.
   - Ogni carta mostra nome, PV e PM attuali/massimi con le barre, AR, Stati, Ferite, Affaticamento e arma in mano.
   - Polling ogni 3 secondi con l'`mtime`; avviso quando un file non si legge.
   - È un prompt solo: funzioni già pronte e nessuna scrittura.
2. **Pezzo 2 — Scontro e Iniziativa.**
   - `scontri/` sul server con la versione (`If-Match`).
   - Si crea uno scontro e si aggiungono i PG; il d10 è dal vivo o dell'app, poi ordine, spareggi e Round/turno corrente con «Avanti».
   - Il registro degli eventi è in sola aggiunta.
3. **Pezzo 3 — Nemici.**
   - Formato del bestiario (§3) in `nemici/`, con un validatore dedicato e un editor minimo nella plancia.
   - Si aggiungono più copie di un nemico con etichette diverse; PV e Stati sono indicatori nella plancia.
4. **Pezzo 4 — Danno applicato.**
   - Funzione pura `applicaColpo(bersaglio, danno tirato, natura, AC)` secondo §5.13–5.15: Difesa, AR per applicazione, PV, PS Tempra suggerita, Sanguinamento. Restituisce la nuova sessione e la riga del registro.
   - Plancia: «Colpito» su un partecipante.
   - Per i PG la plancia scrive anche il file del giocatore.
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
- **R1. Scritture incrociate.** Giocatore e Direttore cambiano lo stesso PG insieme. Oggi vince il più recente, ma si può perdere una modifica.
  - Proposta per il pezzo 6: il Direttore scrive solo la `sessione`, il giocatore solo le scelte. Il server unisce i due blocchi, con una versione per blocco.
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

**Domande per Marcello**
1. **Dove gira il server al tavolo:** sul PC di Davide (il Direttore) o su quello di Marcello? Cambia chi deve avere Node e chi apre `avvia-server.bat --rete`.
2. **I giocatori usano l'app al tavolo** (telefono o portatile collegati al server) **o solo la carta?** Se solo la carta, i PG nella plancia sono quelli importati dal Direttore e il pezzo 6 non serve.
3. **«Danno con locativo calcolato dal sistema»:** il Giocatore 0.45 non ha locativi (§5.10, «AC … non assegna locativi»; §5.13, Armatura «non suddivisa per parti anatomiche»).
   - S'intende l'applicazione del danno con Difesa, AR per applicazione, PV e Ferite (pezzo 4), oppure Davide ha in mente una tabella dei locativi?
   - Nel secondo caso è una regola da chiedere a Davide.
4. **Bestiario:** dati del Direttore (in `nemici/`, fuori da git come `personaggi/`) o regola condivisa (`data/bestiario.json` su `main`, validato)? Lo decide Davide; per partire propongo `nemici/` locale.
5. **Dadi dei nemici:** di default dal vivo (il Direttore tira e scrive) o dell'app?
6. **Visibilità:** la plancia è solo del Direttore, o serve anche una vista «giocatori» in sola lettura (ordine di Iniziativa, chi è di turno) da mostrare su uno schermo?
