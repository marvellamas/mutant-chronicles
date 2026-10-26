# «Cerca i personaggi» non trovava i personaggi di Davide (26/10/2026, sera)

Davide ha seguito le istruzioni di stasera (collegamento, Aggiorna, 1, poi C e P) e «Cerca i personaggi» ha risposto
«Non ho trovato nessun personaggio». Nella foto del suo desktop si vedevano **due cartelle «distribuzione»** insieme a
una «Dati precedenti…».

## Perché

Due voci con lo stesso nome sullo stesso desktop vogliono dire che Explorer sta mostrando insieme **cartelle diverse**:
quella dell'utente (`C:\Users\Dell\Desktop`), quella pubblica (`C:\Users\Public\Desktop`, sempre visibile insieme alla
propria) e, se OneDrive gestisce il desktop (comune con gli account Microsoft 365 aziendali), quella di OneDrive
(`C:\Users\Dell\OneDrive\Desktop`, o `OneDrive - <Nome Azienda>\Desktop` per gli account aziendali — il nome dopo il
trattino cambia da PC a PC). «Cerca i personaggi» guardava solo `C:\Users\Dell\Desktop`: i personaggi di Davide erano
quasi certamente nell'altra, con i PX di ieri sera intatti.

## A. Dove cerca adesso

- **Tutti i Desktop**: quello dell'utente, quello pubblico (`...\Public\Desktop`) e **ogni** cartella che comincia per
  «OneDrive» trovata nel profilo (personale o aziendale, con qualunque nome dopo il trattino) — letta dinamicamente,
  non un solo percorso fisso.
- Lo stesso per **Documenti** e **Download**, nelle stesse varianti.
- **Almeno 5 livelli di profondità** sotto ciascuna di queste cartelle (prima erano 4), qualunque sia il nome delle
  cartelle di mezzo: non serve che si chiamino «mutant» o «distribuzione».
- I personaggi si riconoscono da una sottocartella «personaggi» (senza badare a maiuscole o spazi nel nome) il cui
  contenuto viene **confermato aprendo almeno un file**: deve avere davvero la forma di un personaggio Mutant
  (`formato: "mutant-personaggio"`), non bastano il nome della cartella o il nome del file.
- Le cartelle che sono anche installazioni vere di Mutant (`Mutant.bat` o `server.mjs` accanto a `personaggi\`) vengono
  proposte **prima** delle altre; fra installazioni vere, o fra le altre, vince la più recente.
- Se la ricerca impiega più di un minuto, scrive ogni tanto dove sta guardando (non è un segno di errore: solo un
  PC lento o con molti file).

`tools/cerca-personaggi.mjs`: `cartelleUtente` (i Desktop/Documenti/Download, dinamici), `radiciDiRicerca` (le radici con
la loro profondità), `copieDellApp` (la ricerca, con conferma del contenuto e `onProgress`), `installazioniMutant` (per
la voce C, sotto), `eCopiaApp`.

## B. Il percorso si può scrivere a mano

Nella stessa domanda della voce P («Quale cartella vuoi usare?») si può anche scrivere, o incollare da Esplora risorse
(anche fra virgolette: `"C:\Mutant\mutant\personaggi"`), il percorso della cartella — quella con dentro i file dei
personaggi, o quella sopra. L'app controlla che dentro ci siano davvero personaggi validi, mostra nomi e PX, e chiede
SI prima di impostarla. `tools/cerca-personaggi.mjs` → `risolviPercorsoManuale`, `puliscePercorso`.

## C. Il collegamento sul desktop

La voce C «Controlla lo stato» ora elenca anche le altre installazioni di Mutant trovate sul PC (stesse radici della
voce P, ricerca più leggera: `installazioniMutant`), dicendo esplicitamente «Questa copia di Mutant (quella aperta
adesso): …», così si capisce subito quale copia ha aperto il collegamento sul desktop, anche se i dati (dopo la voce P)
sono altrove — cosa normale e già prevista (lotto del 26/10 mattina: qualunque copia dell'app usa la stessa cartella
dei dati, impostata nel profilo di Windows).

## D. Prova

Riprodotto il caso esatto: un desktop utente con una copia vuota (`Desktop\distribuzione\mutant`), un desktop OneDrive
con la copia vera (`OneDrive\Desktop\distribuzione\mutant`, personaggi con PX), una cartella «Dati precedenti\mutant»
più vecchia, senza `Mutant.bat`/`server.mjs` (solo i file dei personaggi). Con la cartella aperta dal collegamento
(quella vuota) come punto di partenza:

- «Cerca i personaggi» propone per prima la copia di OneDrive (installazione vera **e** più recente), poi segnala
  comunque «Dati precedenti» più sotto;
- il percorso scritto a mano funziona, sia la cartella «personaggi» sia quella sopra, anche fra virgolette;
- con il numero e SI, la cartella dei dati di questo PC diventa quella giusta;
- «Controlla lo stato» elenca le altre installazioni trovate (quella vuota e quella di OneDrive), non «Dati precedenti»
  (non è un'installazione vera: niente `Mutant.bat` né `server.mjs`).

`tests/dati-pc.test.js`, test «E». Provato anche sul fisso, in sola lettura: la ricerca sulle cartelle vere del PC
(Desktop, Documenti, Download, le copie di prova lasciate da lotti precedenti) finisce in pochi secondi, senza
«ci sto ancora mettendo un po'», e trova le cartelle attese senza falsi positivi.

## Per Davide, stasera

1. Dal collegamento «Mutant» sul desktop: **Aggiorna**, poi premi **1** per aprire il menu.
2. Premi **P** «Cerca i personaggi». Legge soltanto, può volerci un momento.
3. Guarda l'elenco «PERSONAGGI TROVATI»: deve esserci la versione di ieri sera, con i PX giusti.
4. In «CARTELLE CON PERSONAGGI», scrivi il numero di quella giusta (quella marcata «installazione di Mutant» con i PX
   di ieri, non quella vuota né «Dati precedenti») e Invio, poi **SI** e Invio.
5. Se Mutant è acceso, chiudi la finestra nera e riaccendilo con la voce **1**.
6. Premi **C** «Controlla lo stato»: i PX devono essere quelli di ieri sera, e sotto deve dirti dov'è l'altra copia di
   Mutant (quella vuota che apre il collegamento): da lì capisci che il collegamento resta sul desktop giusto, i
   personaggi li trova comunque.
