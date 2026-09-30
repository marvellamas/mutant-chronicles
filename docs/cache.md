# Cache del browser e aggiornamenti dell'app

30 settembre 2026. Problema: dopo un aggiornamento serviva Ctrl+F5, altrimenti il browser teneva
moduli JavaScript vecchi e l'app si rompeva («does not provide an export named…», «Cannot read
properties of undefined»). Qui la diagnosi (chi mette in cache che cosa) e la soluzione.

## 1. Diagnosi

### Server locale: `serve` (avvia.bat, distribuzione/3_avvia.bat, `npm start`)

`serve` 14.2.6 (serve-handler 6.1.7) legge `serve.json` nella cartella servita. Il file c'è dal
25/09/2026 e chiede `Cache-Control: no-cache` per `**/*.@(js|css|json|html)`. Header misurati il
30/09 con `curl -D -` (porta di prova):

| Richiesta | Stato | Cache-Control | ETag | Last-Modified |
|---|---|---|---|---|
| `/` (index.html) | 200 | no-cache | sì | no |
| `/src/ui/app.js`, `/src/ui/tab.js` | 200 | no-cache | sì | no |
| `/data/regole.json`, `/img/immagini.json` | 200 | no-cache | sì | no |
| `/css/style.css` | 200 | no-cache | sì | no |
| `/index.html` | 301 → `/index` (cleanUrls) | — | — | — |

Con `no-cache` il browser tiene la copia ma la **rivalida** a ogni uso con l'ETag (`If-None-Match`
→ 304 senza corpo): costo quasi zero, e una ricarica normale (F5) prende sempre i file nuovi.
Quindi con `serve` in locale gli header sono già giusti. Restano due casi non coperti:

1. **App aperta durante l'aggiornamento.** La pagina già caricata ha in memoria il grafo dei
   moduli di prima; nessun header la fa ricaricare. Finché il giocatore (anche dal telefono, sulla
   Wi-Fi di Davide) non ricarica, usa il codice vecchio; e senza un segnale non sa di doverlo fare.
2. **Copie vecchie in cache da prima di `serve.json`**, o aperte con un altro server: vedi sotto.

### Server locale: `python -m http.server` (README, messaggio di index.html, anteprima di Claude Code)

Misurato il 30/09: risponde `200` con il solo `Last-Modified`, **senza `Cache-Control` né ETag**.
È la causa dei moduli vecchi visti il 30/09 (backlog 17: «import fallito finché non si ricarica
con Ctrl+F5»): l'anteprima di Claude Code usava proprio questo server.

### Euristica del browser senza `Cache-Control`

Una risposta 200 senza `Cache-Control`/`Expires` ma con `Last-Modified` è «euristicamente
fresca» (RFC 9111 §4.2.2): Chrome e Firefox la considerano valida per il **10% del tempo passato
dall'ultima modifica** (Firefox la limita a una settimana). Un modulo modificato 3 giorni prima
resta fresco ~7 ore: in quel tempo il browser lo riusa **senza chiedere al server**, anche con F5
sui sottorisorse (Chrome, con il reload normale, rivalida il documento principale ma non
necessariamente le risorse ancora fresche). Ctrl+F5 salta la cache: ecco perché «bastava Ctrl+F5».

### Il caso dei moduli ES

`index.html` viene ricaricato (o rivalidato), ma gli `import` interni (`import … from './tab.js'`)
sono richieste separate, ciascuna con la propria voce in cache. Il browser può quindi mescolare
un `app.js` nuovo con un `tab.js` vecchio (o viceversa): l'import di un nome che il file vecchio
non esporta fallisce al collegamento dei moduli («does not provide an export named …», pagina
ferma su «Caricamento…»), oppure una funzione nuova riceve dati di forma vecchia («Cannot read
properties of undefined»). Aggiungere `?v=` al solo `<script type="module" src>` non basta: gli
import relativi si risolvono **senza** la query della pagina che li importa.

### GitHub Pages

Pages (oggi non attivo per questo repo: `https://marvellamas.github.io/mutant-chronicles/`
risponde 404) manda per tutti i file `Cache-Control: max-age=600` con ETag e Last-Modified:
ogni file è fresco per 10 minuti dal momento in cui il browser l'ha preso. Nei 10 minuti dopo un
aggiornamento si possono avere moduli di versioni diverse, per lo stesso motivo del paragrafo
precedente; i dati (`data/*.json`, `img/immagini.json`) invece si chiedono già con
`cache: 'no-cache'` (`src/rules.js`, `src/ui/immagini.js`) e si rivalidano sempre.

### In sintesi

| Dove | Header | Rischio |
|---|---|---|
| `serve` (avvia.bat) | no-cache + ETag | solo l'app già aperta durante l'aggiornamento |
| `python -m http.server` | solo Last-Modified | moduli vecchi per ore (euristica 10%) |
| GitHub Pages | max-age=600 | moduli misti fino a 10 minuti |
| localStorage | non è cache HTTP | nessuno: i personaggi non si toccano |

## 2. Soluzione

Vincoli: niente passo di build per chi usa l'app, funziona con `serve` in locale e su GitHub
Pages, i personaggi nel browser (`localStorage`) non si toccano.

1. **Header in locale: `serve.json`** (c'era già). `Cache-Control: no-cache` per
   `.js`, `.css`, `.json`, `.html`; le immagini restano in cache. Con `serve` una ricarica
   normale (F5) prende sempre i file nuovi. `python -m http.server` non lo legge: il README
   consiglia `avvia.bat` o `npm start`, e l'anteprima di Claude Code usa ora `serve`
   (`.claude/launch.json`).
2. **Versione dell'app: `tools/versione.mjs` → `versione.json`.** La versione è un'impronta del
   contenuto dei file serviti (index.html senza le parti generate, `src/**/*.js`, `css/**/*.css`,
   `data/**/*.json`, `img/immagini.json`), con i fine riga normalizzati. Scelta al posto dell'hash
   del commit perché:
   - non serve Git: il pacchetto di Davide scarica lo zip, senza repository;
   - cambia anche se Davide modifica a mano un file di `data/`;
   - è la stessa prima e dopo il commit: l'hash del commit non si può scrivere dentro il commit stesso.

   Se l'impronta non cambia lo script non scrive nulla. `node tools/versione.mjs --controlla`
   esce con 1 se `versione.json` e `index.html` non sono aggiornati.
3. **Moduli con `?v=`: importmap in `index.html`, scritto dallo script.** Fra i marcatori
   `versione:inizio` e `versione:fine` ci sono:
   - il meta `mutant-versione`, cioè la versione del codice caricato;
   - un `<script type="importmap">` che dà a ogni modulo di `src/` l'indirizzo `./src/x.js?v=<versione>`.

   `?v=` c'è anche sui fogli di stile e sui due `<script type="module">`. Gli `import` relativi si
   risolvono all'indirizzo senza query e l'importmap li rimappa a quello con `?v=`: a ogni
   versione cambiano gli indirizzi di **tutti** i moduli, e il browser non può riusare né
   mescolare file vecchi, con qualunque server. Il solo `?v=` sull'ingresso non bastava (§1, moduli
   ES). Importmap: Chrome 89, Firefox 108, Safari 16.4 e successivi.
4. **Avviso di aggiornamento: `src/ui/aggiornamento.js`.** È un modulo a sé, caricato prima di
   `app.js`: parte anche se i moduli dell'app non riescono a collegarsi. Funzioni pure in
   `src/versione.js`. Il modulo:
   - all'avvio legge `versione.json` con `cache: 'no-store'` e scrive la versione nel piè di pagina;
   - a ogni ripresa della finestra (`visibilitychange`) e ogni 5 minuti lo rilegge;
   - se la versione del server è diversa da quella caricata, mostra in alto «Nuova versione
     disponibile» con **Ricarica**.

   «Ricarica» apre la stessa pagina (stesso `#indirizzo`) con `?v=<versione nuova>`.
   `location.reload()` da solo non basta: riusa l'`index.html` che il browser ha già, e su GitHub
   Pages quello può essere vecchio fino a 10 minuti, con il vecchio importmap. Un indirizzo nuovo
   per il documento costringe a prendere l'`index.html` nuovo, e con lui i moduli nuovi.
5. **Avviatori.** `avvia.bat` e `distribuzione/3_avvia.bat` eseguono `node tools/versione.mjs`
   prima di accendere il server; se non riesce si prosegue. Con Git basta `git pull` e
   `avvia.bat`; con il pacchetto zip lo script ricalcola la versione della cartella scaricata.
6. **GitHub Pages** (se lo si attiva). `index.html` è in cache al massimo 10 minuti
   (`max-age=600`), quindi un giocatore che apre l'app entro 10 minuti da un aggiornamento può
   caricare ancora la versione precedente, ma intera e coerente, perché l'importmap porta gli
   indirizzi `?v=` vecchi. Appena `versione.json` risponde con la versione nuova (subito: si legge
   con `no-store`), compare la barra, e «Ricarica» carica la nuova. Ritardo massimo senza la
   barra: 10 minuti.

I dati di `data/` si chiedevano già con `cache: 'no-cache'` e restano così. Il `localStorage` non si
tocca: la ricarica cambia solo l'indirizzo, e i personaggi restano dove sono.

## 3. Verifica (da ripetere)

Eseguita il 30/09/2026 con `serve` sulla porta 3000 (quello di `avvia.bat`) e il browser
dell'anteprima.

1. `node tools/versione.mjs`, poi `avvia.bat` (o `npm start`). Apri l'app: nel piè di pagina
   «Versione <impronta> · <data>»; negli strumenti per sviluppatori (Rete) i moduli hanno `?v=<impronta>`.
2. **F5 senza nuova versione.** Cambia una riga in un modulo importato (non l'ingresso), per esempio
   il testo di `testoVersione` in `src/versione.js`. **Non** rilanciare lo script. Premi F5
   (non Ctrl+F5): il piè di pagina mostra il testo cambiato. Esito del 30/09: sì, grazie a
   `no-cache` più ETag di `serve.json`.
3. **Nuova versione con l'app aperta.** Cambia di nuovo la riga e lancia `node tools/versione.mjs`:
   stampa una versione nuova. Torna sulla finestra dell'app, o aspetta 5 minuti: in alto compare
   «Nuova versione disponibile … Ricarica». Esito del 30/09: sì, dopo il ritorno sulla finestra.
4. Premi **Ricarica**: l'indirizzo diventa `/?v=<nuova>`, i moduli arrivano con `?v=<nuova>`, il
   piè di pagina mostra la versione e il testo nuovi, la barra sparisce. Esito del 30/09: sì.
5. Rimetti la riga com'era e rilancia `node tools/versione.mjs`.
