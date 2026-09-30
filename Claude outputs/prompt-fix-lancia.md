Fai questo lavoro, senza chiedere conferma. Siamo su `main`. Correzione all'utility «Lancia!», niente altro.

Problema: con un Taumaturgo di 6° livello (Invocatore II, Fratellanza) il pulsante «Lancia!» funziona su tutti gli incantesimi conosciuti tranne **Guarigione** (scheda 21.6, versioni ai livelli 3 e 6) ed **Esorcizzare Corruzione** (scheda 21.5, versioni ai livelli 3 e 6). Il pulsante c'è, si clicca, non succede nulla e la console non aiuta l'utente. I due incantesimi hanno in comune: versioni solo a due livelli invece della scala 1–8, e colonne della tabella non standard (Beneficiari, Stati di ferita rimossi, Stati rimossi ciascuno, Massimo stato curabile) al posto di Guarigione/Danno.

1. Riproduci con il personaggio di collaudo che ha questi incantesimi (o aggiungili a `tests/collaudo/` a un Taumaturgo esistente) e trova la causa in `src/lancio.js` e nell'interfaccia dell'utility: filtro delle versioni accessibili, lettura delle colonne, o altro. Scrivi la causa nel riepilogo.
2. Regola generale da rispettare: **ogni incantesimo conosciuto si può lanciare** se ha almeno una versione accessibile al personaggio, qualunque siano i livelli disponibili e le colonne della tabella. L'utility mostra le versioni accessibili (qui: 3, e 6 se il personaggio ci arriva), il costo in PM, le condizioni di lancio (Rituale, Anticipazione, Focalizzazione, componenti, Ingaggio) e le colonne della versione così come sono nei dati, senza pretendere Guarigione o Danno. «Lancia» scala i PM come per gli altri.
3. Se nessuna versione è accessibile (livello troppo basso), il pulsante resta ma disabilitato, con il tooltip «richiede livello N». Mai un pulsante che non risponde.
4. Cerca nei dati tutti gli altri incantesimi con scala non continua o colonne non standard e verifica che si lancino: elencali nel riepilogo.

Test: Guarigione e Esorcizzare Corruzione lanciati da un 6° livello (versione 3 e versione 6), PM scalati; un incantesimo con nessuna versione accessibile mostra il pulsante disabilitato con il motivo. Validator e test verdi. Un commit, push di `main`.

Riepilogo in questa forma, senza altro: causa; cosa è cambiato; altri incantesimi con scala o colonne non standard e il loro esito; esito test.
