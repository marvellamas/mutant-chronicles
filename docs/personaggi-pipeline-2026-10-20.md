# I personaggi dopo il lotto «un originale solo» (20/10/2026)

Prima parte della pipeline dei salvataggi decisa con Marcello il 20/10. Le altre due — il tablet come vista, l'offline e il rientro — vengono dopo, una per volta. Questo documento è la mappa da cui partono.

> La specifica completa (`claude/pipeline-salvataggi.md`) non è nel repo: ho lavorato sui punti A–G del prompt. Se il documento contiene decisioni che qui non compaiono, vanno rilette prima della seconda parte.

## A. Ricognizione: com'era prima di questo lotto

**I file.** 26 file di personaggio in `personaggi/` più `LEGGIMI.txt`, per **7 personaggi**: ogni file è un export completo, con il nome `Nome_livN_AAAA-MM-GG.json`. Un nuovo giorno o un nuovo livello creavano un file nuovo e i vecchi restavano (il server non cancella mai). Lucas ne aveva 10, Botha-Pretorius 5, Michele Giorgetti e Oshi Nagata 3, Duncan McDuff e Pablo Zaion 2, Dimitri Orlav 1.

**L'identità c'era già.** Tutti e 26 i file portano `pg` (per esempio `pg-2b1279a5686e2546624fd153`), creato alla nascita del personaggio e indipendente dal nome (`src/character.js` → `nuovoPg`): i 26 file danno **7 identificativi distinti**. Non serviva inventare un id: serviva usarlo dappertutto.

**Da dove veniva la lista.**

| Dove | Come | Problema |
|---|---|---|
| Pagina iniziale | `elencoUnito` (src/cartella.js), che raggruppa già per `pg` | nessuno: una riga per personaggio |
| Plancia del Tavolo | `elencoCartella()` + `ultimiPerPersonaggio` (per **nome** del file) | i PG «al tavolo» vanno scelti a mano in `tavolo/sessione.json` |
| Menu dei PX | `schede: stato.elenco`, cioè **tutti i file** | tre o quattro copie di ogni personaggio |
| Mini-schede e vista giocatori | il server legge l'ultimo file di ogni PG | nessuno |
| Tablet dei giocatori | la vista che il server calcola dai file | nessuno |

**Quando si scriveva su disco.** Solo da `PUT /api/personaggi/<file>`, chiamato da: la scheda (`programmaCartella`, con **1,5 s** di attesa dopo l'ultima modifica), la plancia («Colpito», bonus di circostanza), il pannello PX («Assegna PX»). In più il server riscrive un file quando migra i veicoli nel registro (A.91, una volta per veicolo) e toglie i file provvisori di un PG che ha preso il nome. **Preparare nemici, scontri, scene o mappe non scriveva e non scrive nessun personaggio**: sono API e cartelle separate (verificato con un test).

**Chi teneva una copia in memoria.** `stato.sessione` e `stato.scelte` della scheda (con `localStorage` come copia del browser); `stato.elenco`, `stato.testi` e `stato.viste` della plancia (rilette per mtime); `cacheFile` del server (solo `{ pg, nome }` per data e dimensione del file); `migrazioni.visti`. Nessuna di queste era «l'originale»: era proprio il difetto.

## B. Che cos'è l'originale, adesso

- **L'id stabile è il `pg`** che ogni file porta dalla nascita. Non cambia mai, nemmeno cambiando nome (test). I file di prima senza `pg` usano come ripiego il «Nome» del file (`nome-Lucas`).
- Ogni file porta in più, scritti dal server a ogni salvataggio (`src/storico-personaggi.js`):
  - `versione_salvataggio`: contatore che sale di 1 a ogni scrittura. **Non si chiama `versione`** perché quel campo è già la versione del *formato* del file (oggi 8) e cambiarlo avrebbe fatto rifiutare i file dall'app.
  - `aggiornato_il` (ISO) e `aggiornato_da`: `giocatore`, `master` o `px`. Chi scrive lo dichiara con l'intestazione `X-Mutant-Da`; senza, vale `master` se la richiesta viene dal PC del server, altrimenti `giocatore`.
  - **Migrazione silenziosa:** un file senza quei campi vale versione 1 e si apre come prima.
- **Le versioni vecchie** vanno in `personaggi/storico/<id>/<AAAA-MM-GGTHH-MM-SS>.json` prima di ogni sovrascrittura. Nessun elenco dell'app la mostra: `storico` non passa il filtro dei nomi dei file dei personaggi. Con il salvataggio a ogni modifica una copia per tocco sarebbe insostenibile: **una copia ogni 10 minuti al massimo** per personaggio, **ultime 40** conservate.

### Quello che NON ho fatto, e perché

La specifica chiedeva di rinominare i file in `personaggi/<id>.json`. **Mi sono fermato**, perché il nome del file oggi non è solo un nome: è la **chiave con cui i personaggi sono scritti dentro altri dati già salvati**. `chiaveDaFile(file)` (per esempio `LUCAS`) compare in:

- `tavolo/sessione.json` → `personaggi: ["LUCAS", "BOTHA-PRETORIUS", …]` (chi è al tavolo);
- `scontri/*.json` e `scontri/archivio/*.json` → partecipanti `pg:LUCAS` (anche negli scontri archiviati);
- `scene/*.json` → token `pg:LUCAS` sulla mappa di battaglia;
- `veicoli/*.json` → proprietario e conducente.

Rinominando i file, `chiaveDaFile` restituirebbe `pg-2b1279…` e **tutti quei riferimenti si romperebbero in una volta sola**: i PG sparirebbero dal tavolo, dagli scontri in corso e dalle scene. Non è un rischio che valga la pena correre insieme a tutto il resto, e non si ripara con un controllo in più: va fatto il contrario, cioè **prima** disaccoppiare la chiave del tavolo dal nome del file.

**Come farlo (per la seconda parte):** introdurre la chiave `pg:<id>` accanto a quella per nome, far accettare a tutti i lettori (plancia, scene, scontri, veicoli) tutte e due le forme, migrare i riferimenti salvati, e **solo allora** rinominare i file. Nel frattempo il beneficio pratico — un personaggio una volta sola — c'è già senza toccare i nomi (punto C).

## C. La lista viene dal disco

`GET /api/personaggi` rilegge la cartella a ogni richiesta (era già così) e `src/cartella.js` → **`ultimiPerPg`** dà un file solo per identificativo, il più recente. Lo usa il menu del pannello PX, dove si vedevano tre o quattro copie di ogni personaggio: ora **7 voci** con i file veri del progetto (provato). La pagina iniziale raggruppava già per `pg` e mostra 7 righe.

## D. Si salva a ogni modifica

L'attesa fra l'ultima modifica e la scrittura è in `regole.json` → `interfaccia.salvataggio.attesa_ms`, portata da 1500 a **400 ms**: unisce i tocchi ravvicinati (+1, +1, +1) in una scrittura sola senza perdere niente. In più, quando la pagina si nasconde o si chiude (`visibilitychange`, `pagehide`, cioè anche il tablet che passa a un'altra app) ciò che è in attesa **si scrive subito**. Spegnere il server non perde più niente: al massimo l'ultimo tocco.

Fuori dalla sessione i personaggi restano intoccabili: preparare nemici, scontri, scene o mappe non scrive nessun file di PG (test). Si cambiano solo con un'azione esplicita: la scheda, «Modifica master» o il pannello PX.

## E. «Apri» e «Modifica master» nell'elenco

Ogni riga dell'elenco dei personaggi (pagina iniziale) ha «Apri» e, **solo sul PC del Direttore e solo con la cartella**, «Modifica master», che apre la scheda in modalità master. Prima bisognava passare dalle mini-schede di uno scontro.

## F. La pulizia: rapporto prima, spostamento dopo

`node tools/pulizia-personaggi.mjs` stampa il rapporto e **non tocca niente**. Con `--sposta`, dopo l'ok, tiene in `personaggi/` il file più recente di ogni personaggio e sposta gli altri in `personaggi/storico/<id>/`: niente viene cancellato, i file che non sono personaggi non si toccano. Il rapporto del 20/10 è nel riepilogo della sessione: 26 file → 7.

## Dove guardare, per le prossime due parti

| Cosa | Dove |
|---|---|
| Identità, versione, storico | `src/storico-personaggi.js`, `server.mjs` → `archivia`, PUT `/api/personaggi/<file>` |
| Un personaggio una volta sola | `src/cartella.js` → `ultimiPerPg` |
| Lista, conflitti, chi vince | `src/cartella.js` → `elencoUnito`, `confronta`, `fileDelPg` |
| Scrittura dalla scheda | `src/ui/app.js` → `persisti`, `programmaCartella`, `scriviInCartella`, `salvaSubitoSeInAttesa` |
| Scrittura dalla plancia e dai PX | `src/ui/tavolo.js`, `src/ui/px-partita.js` |
| Vista dei tablet | `server.mjs` → schede dei PG per la vista giocatori; `src/mappa/tablet.js` |
| Chiave del tavolo da disaccoppiare | `chiaveDaFile` in `src/ui/tavolo.js`, `src/tavolo.js`, `server.mjs` |
| Pulizia | `tools/pulizia-personaggi.mjs` |
| Test | `tests/pipeline-salvataggi.test.js` |
