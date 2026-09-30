Fai questo lavoro, senza chiedere conferma. Siamo sul branch `layout-sd` (verifica con `git status -sb`). Pezzi 5 e 6 del piano di `docs/layout-sd.md`: i due tab vuoti e la chiusura del branch. NON fare il merge su `main`: lo decide Marcello dopo aver provato l'app. Fermati a fare una domanda solo se qualcosa blocca davvero, e in quel caso una domanda sola, precisa.

## 0. Prima di tutto

- Controllo manuali di inizio sessione (procedura in `docs/manuali-drive.md`); se qualcosa è cambiato, riferisci e applica prima.
- Rileggi `docs/layout-sd.md` per intero, compresi gli scostamenti dei pezzi 2–4, e `docs/manuali-txt/layout-app-davide.md` (la proposta originale di Davide): il pezzo 6 confronta il risultato con la proposta.

## 1. Pezzo 5: Cibernetica e Veicoli

Due tab vuoti, stesso componente degli altri: un riquadro con la riga «In attesa del manuale» e, se il manuale del Giocatore o dell'Equipaggiamento ne accennano da qualche parte, il rimando al paragrafo. Icone da `img/pagine/cibernetica-*` e `veicoli-*`. Nessun dato, nessun campo nel salvataggio. Un commit.

## 2. Pezzo 6: verifica complessiva e chiusura

**Confronto con la proposta di Davide.** Scorri `layout-app-davide.md` punto per punto e scrivi in `docs/layout-sd.md`, sezione «Esito», per ogni punto: fatto / fatto diversamente (come e perché) / rimandato (a cosa aspetta). Gli scostamenti già annotati nei pezzi 2–4 confluiscono qui.

**Percorso completo nel browser.** Con almeno due personaggi salvati (uno con magia e artefatti, uno senza), a 1280, 800 e 375 px: apri, passa per tutti gli otto tab, cambia stato a un oggetto nell'Inventario e verifica che Combattimento e Artefatti lo riflettano, ricarica un'arma, segna una Ferita e un grado di Corruzione, lancia un incantesimo, esporta e reimporta il personaggio. Nessun errore in console, nessuno scorrimento orizzontale, nessun valore che cambia rispetto a `main` per lo stesso personaggio (confronta `calcolaScheda` sui due branch con il file di collaudo `tests/collaudo/`: i valori effettivi devono essere identici, cambia solo dove stanno).

**SS.** La scheda da stampare non è stata toccata dai pezzi 1–5, ma legge i dati che i pezzi hanno spostato o aggiunto (`deposito`, Corruzione, artefatti). Rigenera i PDF di prova con `tools/collaudo_pdf.mjs` per i due personaggi, controlla che i fogli 1–3 non sbordino e che «(deposito comune)» e il grado di Corruzione compaiano dove il piano li prevede (se non li prevede, non aggiungerli). Metti i PDF in `docs/esempi-stampa/` con il suffisso `-layout`.

**Regole aggiornate.** Apri un personaggio salvato prima della riforma delle Abilità (c'è in `tests/collaudo/`): l'avviso «Regole aggiornate» deve comparire e funzionare anche con i tab nuovi.

**Pacchetto per il Doc.** Una voce nuova (sezione 2, numerazione dopo A.58): «Un Artefatto lasciato nel deposito comune resta sintonizzato? L'app oggi non lo conta nella capacità e la sua riserva non alimenta, ma ricorda la scelta e la riattiva quando l'oggetto torna con sé» con la riga *Nel frattempo*. Più una voce in sezione 6 (proposte) se dal confronto con la proposta di Davide emergono punti che l'app fa diversamente e che lui deve sapere (per esempio: Crediti spostati nell'Inventario, Tecniche Interiori restano in Abilità, la mano non viene registrata). Formato dei blocchi come nel protocollo.

**Docs.** `docs/layout-sd.md` (tutti i pezzi spuntati, sezione Esito), `docs/backlog.md` (spunta la ristrutturazione; aggiungi «icone dei tab da Davide», «cache-busting dei moduli JS» e «export/import del solo Calendario» se non ci sono già), `CLAUDE.md` (struttura dei tab aggiornata, dove vive cosa), `docs/palette.md` se hai aggiunto colori.

## 3. Chiusura

Commit separati: pezzo 5; esito e docs; PDF di prova. Pusha `layout-sd`. Poi scrivi in due righe il comando per il merge (da `main`: `git merge layout-sd` e cosa aspettarsi, se è fast-forward o no), senza eseguirlo.

Riepilogo finale in questa forma, senza altro: punti della proposta di Davide fatti / diversi / rimandati (numeri); esito del percorso nel browser; esito del confronto dei valori con `main`; PDF generati e pagine; pacchetto per il Doc (voci e titoli); esito validator, `verifica_frasi` e test; i comandi per il merge.
