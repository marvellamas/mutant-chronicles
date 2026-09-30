Fai questo lavoro, senza chiedere conferma. Siamo sul branch `layout-sd` (verifica con `git status -sb`; se non ci sei, `git checkout layout-sd`). Tre passi in sequenza: allineamento con `main`, immagini, pezzo 2 del piano di `docs/layout-sd.md`. Fermati a fare una domanda solo se qualcosa blocca davvero, e in quel caso una domanda sola, precisa.

## 0. Allineamento con `main`

- `git merge main` dentro `layout-sd`. Su `main` è arrivata la riforma delle Abilità (basi per categoria, tetto per Grado, migrazione «Regole aggiornate»): risolvi gli eventuali conflitti tenendo **entrambe** le cose, il layout del pezzo 1 e la regola nuova. Dopo il merge: validator, `verifica_frasi`, test: tutto verde prima di andare avanti. Se un conflitto non è ovvio, fermati e chiedi.
- Controllo manuali di inizio sessione (procedura in `docs/manuali-drive.md`): se qualcosa è cambiato, riferisci e applica prima del resto.

## 1. Immagini

In `img/pagine/` ci sono quattro originali nuovi (Artefatti, Cibernetica, Veicoli, Equipaggiamento). Spostali in `img/originali/Pages/` con lo stesso nome degli altri, installa Pillow (`pip install pillow`), esegui `python tools/genera_immagini.py` e verifica che le versioni piccole siano generate nella cartella giusta. Commit a parte.

## 2. Pezzo 2 del piano: tab Inventario

Segui `docs/layout-sd.md` per il pezzo 2, sezione per sezione, senza anticipare i pezzi 3–6. In sintesi, quello che il pezzo deve dare:

- **Tab Inventario** come unica casa degli oggetti del personaggio: sezioni collassabili per famiglia (armi, protezioni, munizioni/caricatori, equipaggiamento generico, cristalli/contenitori Chroma), stesso componente e stessi colori delle sezioni già esistenti.
- **Stato dell'oggetto** su ogni riga, un solo controllo: impugnato / indossato / zaino / deposito comune, secondo le regole del piano (che cosa può essere impugnato, quanti oggetti indossati per tipo, cosa esce dal peso). Il motore e la SS leggono lo stato da un solo campo; se oggi lo stato vive in campi diversi (indossato, in_mano…), unificali con migrazione del salvataggio e test.
- **PI e Ripara fusi nella riga dell'oggetto**: «PI n/max» con − e +, etichetta danneggiato/Rotto, pulsante Ripara accanto, come nel riquadro Integrità di oggi, che in questo pezzo sparisce dalla tab Combattimento (resta solo nell'Inventario). Il riquadro comprimibile con i tooltip di provenienza resta lo stesso, cambia solo dove sta.
- **Peso e carico** in testa alla tab: carico attuale / carico noto, con la provenienza al tooltip (cosa pesa e cosa è escluso per lo stato).
- **Acquisti in modalità tavolo**: il pulsante per comprare (crediti ±) e il catalogo si aprono da qui, non altrove.
- La tab Combattimento in questo pezzo perde solo ciò che il piano sposta nell'Inventario; il resto lo tocca il pezzo 3.
- SS: nessuna modifica in questo pezzo, salvo che il foglio 3 continui a stampare correttamente con il campo di stato unificato.

Test: stato unificato con migrazione, peso che cambia con lo stato, PI/Ripara dalla riga Inventario. Validator e test verdi. `CLAUDE.md` e `docs/layout-sd.md` aggiornati (pezzo 2 spuntato, con gli scostamenti dal piano se ce ne sono).

## 3. Chiusura

Commit separati: merge; immagini; pezzo 2 (uno o più commit sensati). Pusha `layout-sd`. Riepilogo finale in questa forma, senza altro: esito del merge (conflitti risolti e dove); immagini generate; cosa contiene la tab Inventario in cinque righe; cosa ha perso la tab Combattimento; campo di stato unificato e migrazione; esito validator e test; domande nuove per Davide se ne sono nate.
