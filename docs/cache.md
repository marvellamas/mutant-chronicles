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
