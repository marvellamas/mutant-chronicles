# Pacchetto per il Doc «Per Davide» — 26/11/2026, lotto 252

Da applicare al Doc da Cowork o da Marcello. Claude Code non scrive nei Google Doc.

## In testa alla sezione 1

> **Il rapporto di collaudo è servito.** Le due priorità sono corrette e le due prove che aspettavano sono
> sbloccate; qui sotto come si fanno.

> **Priorità 02 — Dimitri, Armi da mischia.** Corretto: adesso legge **8**, e il contatore dei punti non si è
> mosso. La causa era nostra e la diciamo per intero: l'adeguamento annullava le correzioni **del 2 novembre**,
> quelle che la A.293 elencava, e il −2 era del 23 — un giorno dopo l'elenco. Adesso annulla ogni correzione alle
> Abilità che era attiva quando l'adeguamento è stato fatto, quindi non ricapita. Il −2 resta scritto nel registro
> come «annullata», col motivo, e una riga nello storico lo dice. Non abbiamo aggiunto nessun +2 e non abbiamo
> toccato gli altri sei.

> **Priorità 02, l'altra metà.** Il motivo per cui l'hai visto tu e non noi: il riepilogo del VA mostrava
> «+2 Mod + 6 Base + 0 Corp + 0 Avanz» (che fa 8) e poi «Valore da regole: 6», senza una parola sul −2. Adesso la
> correzione è una riga del conto, col suo motivo, e accanto al VA si legge «−2 Correzione del master».

> **Priorità 01 — le due Neverlost.** Non abbiamo rimosso niente, come hai chiesto. I due record sono nati il
> **2 novembre a 40 secondi uno dall'altro**: l'uid porta dentro la data. Quello del gruppo (rev 7) ha **Rosso 100,
> Blu 10, Verde 30 e scudo 200**; quello personale (rev 1, mai più toccato) ha tutte e quattro quelle voci «da
> registrare». PI, rinforzi, munizioni, traiettoria, circuito e avarie sono identici. **Togliendo quello personale
> non si perde niente che l'altro non abbia già**; togliendo quello del gruppo si perderebbero il conducente, le tre
> riserve e lo scudo. La rimozione la fai tu dalla tab Veicoli: il pulsante mette prima il record in
> `veicoli/cancellati/` e lo sa rimettere. Nella stessa schermata c'è anche il riferimento rotto di Lucas (lo Scout
> MK4 che punta a un record del 9 ottobre che non c'è più): si ricollega o si toglie da lì.

## Sezione 1, la procedura della copia scrivibile (prova 04)

> **Avevi ragione, e il criterio era sbagliato.** La protezione rifiutava di scrivere in una cartella che contiene
> schede che la prova non ha creato: protegge i PG veri, ma proibisce proprio la prova che serve. Adesso una cartella
> può **dichiararsi copia di prova**, e dentro una cartella così si scrive. Le cartelle vere non si sbloccano con un
> file: quella protezione è un'altra e non è stata toccata.
>
> 1. nella cartella di Mutant: `node tools/copia-di-prova.mjs` — copia i sette dall'istantanea più recente in
>    `copie-di-prova\COPIA-DI-PROVA_<data>\` e stampa il comando del passo 2;
> 2. `node server.mjs --porta=3001 --cartella=…\COPIA-DI-PROVA_<data>\personaggi`;
> 3. apri `http://localhost:3001/`: in cima a ogni pagina devi leggere «COPIA DI PROVA del … — i personaggi veri non
>    sono in questa cartella». Se quella riga non c'è, **fermati**: stai lavorando sui file veri;
> 4. prova quello che vuoi: distribuire i punti, confermare, chiudere e riaprire la scheda;
> 5. per tornare indietro: chiudi il server e butta la cartella. I file veri non sono stati toccati.
>
> Provata qui fino in fondo: 14 punti distribuiti, confermati, scheda riaperta, assegnazioni e saldo corretti. (Sulla
> nostra copia il monte è 14 perché l'istantanea che abbiamo è del 21/11, col gruppo al 7° livello: i tuoi 21 sono
> quelli dell'8°.)

## Sezione 1, dove si leggono fonte e cariche (prova 02)

> Nella **carta dell'arma impugnata**, in Combattimento, e nel «?» dell'arma: una riga «Fonte». Dice «PM personali ·
> proprietà da Custode conservate», oppure «Riserva interna di CM · 1 CM + 1 AzP · 10 Round · adesso 3 / 5 CM · 30
> Round con queste», oppure «Conversione a NeC · 1 carica NeC Rosso + 1 AzP · 10 Round». Dove il numero delle cariche
> non è registrato, la riga lo dice invece di inventarlo. L'esemplare di Dimitri non è stato toccato.

## Sezione 1, la domanda nuova: A.314

> **A.314 — Le cariche della CyberArma: 10 CM e 5 cariche, o 5 CM e 10 cariche?** Nel rapporto scrivi «la fonte
> installata (PM personali, CM verde da 10 o NeC rosso da 5)». I nostri dati hanno i due numeri scambiati, e vengono
> da due tue risposte: la Batteria Verde ha **5 CM** (erano 10 PM, convertiti a 2:1 nella revisione delle Cariche
> Mistiche del 02/11) e la conversione a NeC usa un **NEC Rosso da 10 cariche** (A.237, 02/11). Non abbiamo cambiato
> niente: dicci quale coppia vale e la applichiamo in un lotto solo. Con la A.260 (una carica intera = 10 Round) la
> differenza al tavolo è fra 50 e 100 Round a piena carica.

## Sezione 3: le quattro voci di interfaccia, lette

> Le quattro modifiche di catalogo e interfaccia del rapporto sono lette e sono il lotto prossimo: il valore della
> CyberArma («Costo 7500» → «Valore indicativo: 7.500 cr»), le Spade dell'«Aggiungi oggetto», il «+X» → «+1» nella
> spiegazione di Percezione dell'Elmetto Recon, e il doppio paragrafo del decollo della Neverlost con
> «Rapida»/«Veloce».

## Da togliere dal Doc

La riga «l'adeguamento delle Abilità aspetta che Davide dica quando» non vale più: il rapporto dice che è stato
fatto il 24/11 alle 22:58 e che i sette risultano adeguati, con 21 punti disponibili su Dimitri.

**Il primo numero libero diventa A.315.**

## Per noi (non va nel Doc)

- i tre manuali del 25/11 (Giocatore 0.69, Armamenti 0.92, Veicoli 0.24) restano `recepimento_in_attesa` dal 251;
- i fatti dei «Controlli chiusi» verificati nei nostri dati coincidono tutti (copriruote 3/3/0/0 senza ricambi,
  circuito 120 = 6 × 20 con saldo «da registrare», Assetto armonico condizionato alla sintonizzazione, Umanità 19/20):
  l'unico che non torna è quello della A.314.
