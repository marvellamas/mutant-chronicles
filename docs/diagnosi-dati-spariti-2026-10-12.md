# «Dopo l'aggiornamento le cartelle di Davide sono vuote» — diagnosi del 12 ottobre 2026

Al tavolo del 12/10 Davide aggiorna Mutant e trova `personaggi/`, `nemici/`, `mappe/` vuote. Recupera copiando a
mano uno zip di «Salva sessione» sopra le cartelle. In più «Ripristina» gli propone **un solo** salvataggio,
mentre nella cartella ne vede diversi.

Ogni caso sospetto è riprodotto in `tests/dati-spariti.test.js`, su cartelle finte. Questo documento dice che
cosa è venuto fuori.

## In breve

**La causa quasi certa è il vecchio `1_scarica_o_aggiorna_app.bat`**, quello del pacchetto zip. Fino al
9 ottobre 2026 quel file, al passo [5/5], eseguiva:

```powershell
Get-ChildItem -Force $dest | Where-Object { $_.Name -ne 'node_modules' } | Remove-Item -Recurse -Force
```

cioè **cancellava tutto quello che c'era nella cartella `mutant`, tranne `node_modules`**, e poi ci spostava
dentro i file appena scaricati. Sparivano `personaggi/`, `nemici/`, `mappe/`, `scontri/`, `tavolo/`, `scene/`,
`musica/`, `galleria/`, `veicoli/`, `autosave/`, **`salvataggi/`** e `backup-master/`. Si salvavano soltanto
`data/` (copiata in `backup_dati/`) e gli sfondi `img/sfondi/*.jpg`.

Il 9 ottobre il file è stato corretto (`distribuzione/aggiorna-da-zip.ps1`, elenco in
`tools/file-locali.json`), ma **`1_scarica_o_aggiorna_app.bat` sta fuori dalla cartella `mutant`**: la copia
aggiornata finisce in `mutant\distribuzione\`, non sopra quella che Davide apre. Chi ha installato da zip
prima del 9 ottobre continua quindi a usare la versione che cancella, **a ogni aggiornamento**.

Questo spiega anche «Ripristina proponeva solo l'ultimo salvataggio»: la cartella `salvataggi/` veniva
cancellata insieme al resto, e l'unico zip rimasto era quello creato subito dopo. I diversi salvataggi che
Davide vedeva erano nella cartella di **Google Drive** (`config-salvataggi.json` → `cartella_drive`) o in
`backup_dati/`, e «Ripristina» non guardava né lì né in `backup-prima-aggiornamento/`.

## I casi, uno per uno

| # | Caso | Esito |
|---|---|---|
| 1 | **Vecchio `1_scarica_o_aggiorna_app.bat`** (pacchetto zip, prima del 09/10) | **È la causa.** Riprodotto: cancella ogni cartella di dati tranne `node_modules`. Non si aggiorna da sé perché sta fuori da `mutant\`. |
| 2 | `aggiorna.bat` (Git) | **Non c'entra.** `git pull --ff-only` non tocca i file non tracciati: le cartelle dei dati sono tutte in `.gitignore`. Riprodotto con un repository vero. L'unico `git checkout` è sui due soli file `versione.json` e `index.html`. |
| 3 | Riavvio automatico dopo l'aggiornamento (`tools/riavvia.mjs`, prompt 77) | **Non c'entra.** Riparte dalla stessa cartella: `avviaServer` usa `resolve(radice)` sia come `cwd` sia come `start /d`, e `radice` è la cartella di `tools/riavvia.mjs`. |
| 4 | Server avviato da un'altra cartella (`%~dp0`, collegamento) | **Non succede con i file dell'app.** `server.mjs` legge `RADICE` da `import.meta.url`, mai da `process.cwd()`; tutti i `.bat` fanno `cd /d "%~dp0"`; il collegamento del desktop ha la cartella di lavoro giusta; `Mutant.bat` fuori dalla sua cartella se ne accorge e lo dice. **Resta possibile con due copie dell'app**: si aggiorna una e si apre l'altra. |
| 5 | `git clean`, `git reset --hard`, `git checkout` forzati | **Non ce ne sono.** Controllato su tutti gli script `.bat`, `.ps1` e `.mjs` del repository; il test li rifiuta d'ora in poi. |
| 6 | Esempi copiati «solo se mancano» | **Non sovrascrivono.** `/api/esempi` usa `COPYFILE_EXCL`: un file con lo stesso nome si salta e si segnala. Riprodotto con un PG e un nemico di Davide. |
| 7 | Percorsi di `config-salvataggi.json` | **Non c'entrano con i dati.** `cartella_drive` è solo una destinazione in più: lo zip resta sempre anche in `salvataggi/`, e la copia su Drive è una `copyFile`, non uno spostamento. |

## Due difetti trovati strada facendo

- **`backup-master/` non era nell'elenco dei file locali** (`tools/file-locali.json`): anche l'aggiornamento da
  zip *corretto* la cancellava. Il controllo del `.gitignore` nel test del 09/10 cercava `^[a-z]+/\*$` e il
  trattino di `backup-master` non rientrava. Corretto, con il test che ora accetta i trattini.
- **«Ripristina» guardava solo `salvataggi/` e `autosave/`**: non `backup-prima-aggiornamento/` né la cartella
  di Google Drive, cioè proprio i posti dove i salvataggi sopravvivono a un aggiornamento sbagliato.

## Come si verifica sul PC di Davide (per Marcello)

Tre controlli, in quest'ordine.

1. **Con che cosa aggiorna.** Guardare la cartella in cui Davide apre l'app. Se accanto a una cartella
   chiamata `mutant` ci sono `1_scarica_o_aggiorna_app.bat`, `2_installa_node.bat` e `3_avvia.bat`, è
   l'installazione da zip. Aprire `1_scarica_o_aggiorna_app.bat` con il Blocco note e cercare la parola
   **`aggiorna-da-zip.ps1`**: se **non** c'è, è la versione vecchia, quella che cancella — è la causa.
   Se invece la cartella dell'app contiene `.git` e Davide usa `aggiorna.bat` o la voce 2 della console, non è
   questo il problema.
2. **Da quale cartella parte il server.** Aprire Mutant e guardare la finestra nera: la riga
   «I personaggi si salvano anche in …» dice il percorso in uso. Confrontarlo con la cartella che Davide
   crede di usare: se sono due cartelle diverse, ha due copie dell'app.
3. **Se i file ci sono ancora.** Nella cartella dell'app guardare `backup-prima-aggiornamento\` (zip
   `locali_….zip`), `salvataggi\`, `backup_dati\` e la cartella di Google Drive impostata in
   `config-salvataggi.json`. Se in uno di questi ci sono zip con la data giusta, i dati non sono persi: si
   rimettono con «Ripristina» (voce 4 della console), che ora li elenca tutti.

## Che cosa è stato fatto

- **Punto 2.** `backup-master/` nell'elenco dei locali; copia zip di sicurezza **prima di ogni aggiornamento**,
  Git compreso (`tools/dati-locali.mjs`); controllo **dopo** l'aggiornamento che si ferma e propone di
  rimettere la copia se una cartella che aveva file è rimasta vuota; il file dello zip che aggiorna anche se
  stesso, così la versione vecchia sparisce dal PC di Davide al primo aggiornamento.
- **Punto 3.** All'avvio, con `personaggi/` vuota e salvataggi disponibili, la console e il Tavolo lo dicono,
  con il percorso della cartella in uso.
- **Punto 4.** «Ripristina» elenca tutti i salvataggi di `salvataggi/`, `backup-prima-aggiornamento/`,
  `autosave/` e della cartella di Google Drive, con data, tipo, dimensione e contenuto.
- **Punto 5.** Istruzioni per Davide aggiornate (`docs/guida-davide.md`, `distribuzione/LEGGIMI.txt`).
