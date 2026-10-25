# «Ogni volta che aggiorno non mi trova i personaggi» — diagnosi e correzione (26/10/2026)

Davide: «ogni volta che aggiorno l'app, non mi trova i personaggi. Ieri sera ho messo i PX a tutti e stamattina dopo
l'aggiornamento non li ho più trovati». Lunedì lancia la voce 7 (passaggio ai Talenti nuovi): se l'app guardasse la
cartella sbagliata, il passaggio si farebbe sulle copie vecchie, senza i PX di ieri, e il controllo finale direbbe verde
lo stesso. `stato-mutant.txt` del PC di Davide non c'era: la diagnosi è sul codice e su una copia che imita la sua
installazione (pacchetto zip: `1_scarica_o_aggiorna_app.bat` e, accanto, la cartella `mutant\`).

## A. Che cosa fa ogni modo di aggiornare

| Modo | Che cosa sostituisce | Che cosa cancella | Che cosa lascia |
|---|---|---|---|
| **Voce 2 con Git** (`aggiorna.bat` → `git pull --ff-only`) | i file dell'app tracciati da Git | nulla | tutte le cartelle di dati (sono fuori da Git) |
| **Voce 2 senza Git** (`aggiorna.bat` → `..\1_scarica_o_aggiorna_app.bat`) | come il pacchetto zip, nella stessa cartella `mutant\` | come il pacchetto zip | come il pacchetto zip |
| **`1_scarica_o_aggiorna_app.bat`** (e lo script `aggiorna-da-zip.ps1`) | i file dell'app nella cartella `mutant\` **accanto a sé** | i file dell'app vecchia, mai quelli di `tools\file-locali.json` | `personaggi\`, `px\`, `tavolo\`, `salvataggi\` e le altre cartelle di dati, `config-salvataggi.json` (nelle cartelle di dati si aggiungono solo i `LEGGIMI.txt`) |

- `config-salvataggi.json` resta sempre al suo posto. **Non ha mai detto dove sono i personaggi**: contiene autosave,
  cartella di Google Drive, ntfy. Il server usava sempre `personaggi\` della cartella dell'app da cui parte.
- Il ruolo del PC e gli avvisi stavano già nel profilo di Windows (25/10 e lotto 117): nessun aggiornamento li tocca.
- **Sì, dopo un aggiornamento l'app poteva guardare un'altra cartella.** `1_scarica_o_aggiorna_app.bat` aggiorna (o
  crea) la cartella `mutant\` *accanto a dove sta lui*. Lanciato da un altro posto (un pacchetto scaricato di nuovo,
  una copia sul Desktop, la cartella Download), crea una copia nuova dell'app con `personaggi\` vuota. Alla fine chiama
  `tools/riavvia.mjs`, che **spegneva il Mutant acceso (quello della cartella vecchia, con i personaggi) e accendeva al
  suo posto quello della copia nuova, vuota**. Il browser, sulla stessa porta, mostrava la copia nuova: «non trovo i
  personaggi». I PX di ieri erano nella cartella vecchia, intatti, ma nessuno la guardava più. Il controllo «dopo»
  (12/10) contava i file della cartella aggiornata e non se ne accorgeva: quella nuova era vuota anche prima.

## B. Un aggiornamento non tocca mai i dati né le impostazioni

- **Dove sono i dati di questo PC** è un'impostazione del profilo di Windows: `%APPDATA%\Mutant\dati.json`, accanto ad
  avvisi e ruolo (`tools/dati-pc.mjs`). La cartella indicata contiene `personaggi\`, `px\`, `tavolo\`, `salvataggi\`… e
  `config-salvataggi.json`. Server e menu la leggono; qualunque copia dell'app, vecchia o nuova, usa la stessa.
- **Migrazione silenziosa.** La prima volta che una copia dell'app parte (server o menu) e ha già dei personaggi, scrive
  sé stessa come cartella dei dati. Prima legge `config-salvataggi.json`: se indicasse un'altra cartella dei personaggi,
  varrebbe quella. Una copia vuota non scrive mai niente.
- Se la cartella impostata non c'è più, si usa quella dell'app e lo si dice (server e menu), con il rimando a «Cerca i
  personaggi».
- `1_scarica_o_aggiorna_app.bat`, quando sta per creare una copia nuova su un PC che ha già i dati altrove, lo dice.
- **Test**:
  - `tests/dati-pc.test.js`, per ogni modo: zip (lo script vero, sulla copia vecchia e su una nuova in un'altra cartella)
    e `git pull`, più il controllo che nessuno script di aggiornamento scriva nelle cartelle di dati; nessun byte di
    `personaggi\`, `px\`, `tavolo\`, `salvataggi\` cambia;
  - il server di una copia nuova trova i personaggi della cartella impostata;
  - `tests/profilo-di-prova.mjs`: i test non leggono e non scrivono mai il profilo vero di chi li lancia.

## C. L'aggiornamento controlla di non averli persi

Prima di aggiornare la voce 2 (e `1_scarica_o_aggiorna_app.bat` lanciato da solo) annota cartella, numero, nome e PX di
ogni personaggio. Dopo, li rilegge dal server per la strada dell'app (`tools/esito-aggiornamento.mjs`):

```
  Aggiornato: prima eri alla versione del 25/10, ora sei a quella del 26/10 (Talenti nuovi).
  Personaggi: 7 in C:\Mutant\mutant\personaggi, PX invariati.            (in verde)
```

oppure, in rosso:

```
  ATTENZIONE: i personaggi non sono quelli di prima (prima 7, adesso 7).
  La cartella dei personaggi e' cambiata: prima …, adesso ….
    - Dimitri Orlav: prima 330 PX, adesso 1900 PX.
  Non giocare e non fare il passaggio ai Talenti (voce 7) finche' non tornano:
  premi P "Cerca i personaggi" nel menu: …
```

La voce 7, prima del SI, mostra la cartella e i PX di ogni personaggio. La voce C «Controlla lo stato» mostra i PX.

## D. «Cerca i personaggi» (voce P)

Legge soltanto. Cerca:
- le copie dell'app nella cartella dell'app e in quelle sopra e accanto (le versioni precedenti del pacchetto), nella
  cartella dei dati, sul Desktop, in Documenti, in Download, in `C:\Mutant` e nella cartella dell'utente;
- in ciascuna: `personaggi\` e il suo storico, gli zip di `salvataggi\`, `backup-prima-aggiornamento\`, `autosave\`,
  e `px\px.json` con il suo storico;
- la cartella di Google Drive scritta in qualunque `config-salvataggi.json`;
- i file esportati in Documenti e Download.

Per ogni personaggio mette in cima la versione più recente, cioè quando il server l'ha salvata (`aggiornato_il`), e
mostra livello e PX. La data dello zip o dello storico non conta (è quella della copia, non del personaggio). Elenca il
pannello PX trovato e le cartelle con personaggi, con quella in uso. Chiede il numero della cartella da usare e poi SI:
l'unica cosa che scrive è la cartella dei dati di questo PC. Nessun file si sposta o si cancella.

## E. Prova

- **Copia che imita il PC di Davide** (profilo di Windows finto, GitHub finto): personaggi in una cartella diversa da
  quella predefinita, PX 300–360 assegnati attraverso il server e una partita nel pannello PX.
  - voce 2 (zip): «Personaggi: 7 in …\dati-altrove\…, PX invariati» in verde;
  - `1_scarica_o_aggiorna_app.bat` da un pacchetto nuovo in un'altra cartella: l'avviso, poi la copia nuova usa gli
    stessi personaggi, con i PX (voce C);
  - `git pull`: nel test;
  - il guaio di stamattina (impostazione persa fra prima e dopo): il controllo lo dice in rosso, con i sette nomi e i
    PX; «Cerca i personaggi» mette in cima le versioni con i PX di ieri e la cartella giusta al numero 1; con 1 e SI il
    controllo torna verde.
- **Sul fisso** (profilo di Windows vero): i dati del fisso copiati in F:mutant-dati-prova e impostati lì, PX 500–530
  assegnati attraverso il server; voce 2 con Git sul repository e due aggiornamenti da zip della copia
  distribuzionemutant: sempre «Personaggi: 7 in F:mutant-dati-provapersonaggi, PX invariati»; impostazione tolta fra
  prima e dopo: rosso con i nomi e i PX; «Cerca» ha messo F:mutant-dati-prova al numero 1 con i PX 500–530; scelta con
  SI, di nuovo verde. Alla fine il profilo del fisso è tornato su F:REPOSmutant.

Trovati e corretti nella prova: in «Cerca» le copie negli zip e nello storico passavano davanti alle versioni vere,
perché contava la data della copia; «Cerca» non guardava la radice dei dischi (una cartella come F:mutant-dati-prova o D:Mutant sfuggiva: ora guarda due livelli sotto la radice del disco dell'app e di quello dell'utente); la stessa cartella scritta con il nome corto (`BEASTM~1`) o lungo sembrava diversa.
