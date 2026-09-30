Fai questo lavoro, senza chiedere conferma. Siamo sul branch `layout-sd` (verifica con `git status -sb`). Pezzo 3 del piano di `docs/layout-sd.md`: la tab Combattimento. Fermati a fare una domanda solo se qualcosa blocca davvero, e in quel caso una domanda sola, precisa.

## 0. Prima di tutto

- Controllo manuali di inizio sessione (procedura in `docs/manuali-drive.md`); se qualcosa è cambiato, riferisci e applica prima.
- Rileggi `docs/layout-sd.md` (pezzo 3 e gli scostamenti annotati nel pezzo 2) e `docs/ricognizione-stati.md`.
- Immagini: togli `img/originali/` dall'ignore e mettila in Git (sono gli originali da cui `tools/genera_immagini.py` produce le versioni piccole; senza di loro il generatore non funziona su un altro PC). Commit a parte. Se la cartella pesa più di qualche MB, fermati e dimmi quanto.

## 1. Tab Combattimento

Segui il piano per il pezzo 3, senza anticipare i pezzi 4–6. In sintesi:

- **Colonna sinistra**: Punti Eroe sopra i PV (già dal pezzo 1); riquadro PV con l'AR in evidenza come oggi; Iniziativa, Movimento, Azioni, Prove Salvezza; poi le **armi impugnate** con VA per colpire, danno, modalità di fuoco, colpi nel caricatore e il pulsante **Ricarica** (resta qui); il numero di caricatori posseduti si cambia **solo** nell'Inventario, qui si vede e basta. Le utility «Attacca!» (distanza e corpo a corpo) si aprono da qui.
- **Colonna destra**, dall'alto: **Ferite**, **Affaticamento**, **Corruzione**, **Stati**, ciascuno un riquadro compatto con i gradi cliccabili e le penalità che entrano nei valori effettivi con provenienza, come oggi. Per la Corruzione: se `regole.json` ha già i gradi di Davide usali; altrimenti gradi provvisori sul modello dell'Affaticamento (nomi tipo Corrotto, Infettato, Eretico, con penalità uguali all'Affaticamento), marcati `TODO(Davide)` in `regole.json`, con una voce nuova nel pacchetto per il Doc (sezione 2, numerazione dopo A.58, con la riga *Nel frattempo:*). Il tracker esposizione/Corruzione/Umanità del backlog (voce 13) NON rientra in questo pezzo: solo i gradi.
- Ciò che oggi sta in Combattimento e il piano assegna altrove: **Sanitario** va nell'Inventario (sezione già esistente) e da qui resta solo un rimando o l'uso al tavolo se il piano lo prevede; **Artefatti/sintonizzazione** restano qui fino al pezzo 4, non toccarli.
- Nulla di nuovo nel motore: il pezzo sposta e riordina, i calcoli restano quelli. Se per farlo devi cambiare un calcolo, fermati e chiedi.
- SS: nessuna modifica in questo pezzo.

Test: la tab Combattimento mostra le armi impugnate e la Ricarica funziona; il numero di caricatori non è modificabile da qui; i gradi di Corruzione entrano nei valori effettivi con provenienza. Validator, `verifica_frasi` e test verdi; verifica nel browser a 1280, 800 e 375 px senza errori in console. `docs/layout-sd.md` aggiornato (pezzo 3 spuntato, scostamenti annotati).

## 2. Chiusura

Commit separati: immagini; pezzo 3 (uno o più commit sensati). Pusha `layout-sd`. Riepilogo finale in questa forma, senza altro: cosa contiene la colonna sinistra e la destra in cinque righe; cosa è uscito dalla tab e dove è andato; gradi di Corruzione usati (di Davide o provvisori); pacchetto per il Doc se c'è; esito validator e test.
