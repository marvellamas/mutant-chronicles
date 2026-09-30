Fai questo lavoro, senza chiedere conferma. Siamo sul branch `layout-sd` (verifica con `git status -sb`). Pezzo 4 del piano di `docs/layout-sd.md`: la tab Poteri e la tab Artefatti. Non tracciare `img/originali/` in Git: resta fuori, il generatore tiene le voci già generate. Fermati a fare una domanda solo se qualcosa blocca davvero, e in quel caso una domanda sola, precisa.

## 0. Prima di tutto

- Controllo manuali di inizio sessione (procedura in `docs/manuali-drive.md`); se qualcosa è cambiato, riferisci e applica prima.
- Rileggi `docs/layout-sd.md` (pezzo 4 e gli scostamenti dei pezzi 2 e 3).

## 1. Tab Poteri

- Visibile a **tutti** i personaggi, anche senza magia: chi non ha poteri vede un riquadro vuoto con una riga di spiegazione («Nessun potere: si acquisiscono con …» dal manuale, o niente testo se il manuale non lo dice).
- Contiene la **Magia esistente** così com'è oggi (PM, contenitori Chroma, valori di lancio, incantesimi conosciuti tinti per macrofamiglia, utility «Lancia!»), spostata senza cambiare il motore né i componenti. Le Tecniche Interiori e i poteri Sciamanici NON si aggiungono: Davide non li ha ancora scritti; se il piano prevede un segnaposto per le sezioni future, un'intestazione collassata vuota con la nota «in attesa del manuale», niente di più.
- Gli **artefatti con poteri** (quelli che danno incantesimi o effetti attivabili) compaiono anche qui, in una sezione «Da artefatti», in sola lettura: si gestiscono nella tab Artefatti.

## 2. Tab Artefatti

- Tab principale a sé (già nella riga dal pezzo 1). Qui va tutto ciò che oggi sta in Combattimento sotto «Artefatti e sintonizzazione»: elenco degli artefatti posseduti, sintonizzazione (capacità complessiva, +2 del Tecnomante, cosa occupa quanto), stato sintonizzato sì/no, effetti con provenienza. Stesse regole e stesso motore di oggi: il pezzo sposta, non cambia calcoli. Se per farlo devi cambiare un calcolo, fermati e chiedi.
- Gli artefatti con effetti di combattimento (bonus al VA per colpire, danno, AR) compaiono anche nella tab Combattimento in sola lettura, nel punto dove entra l'effetto, come già fanno gli altri oggetti con provenienza.
- L'acquisto e l'inventario fisico degli artefatti restano nell'Inventario (sezione «Artefatti e Chroma»): la tab Artefatti è la gestione, l'Inventario è il possesso. Un artefatto in deposito comune non è sintonizzabile.
- Icona e immagine del tab: usa `img/pagine/artefatti*` generate nel pezzo 2, come per gli altri tab.

## 3. Verifica

Test: un personaggio con magia vede PM e incantesimi in Poteri; uno senza magia vede il riquadro vuoto; un artefatto sintonizzato produce lo stesso valore effettivo di prima (confronto con un test esistente); un artefatto in deposito non conta nella sintonizzazione. Validator, `verifica_frasi` e test verdi; verifica nel browser a 1280, 800 e 375 px senza errori in console. `docs/layout-sd.md` aggiornato (pezzo 4 spuntato, scostamenti annotati).

## 4. Chiusura

Commit separati: Poteri; Artefatti. Pusha `layout-sd`. Riepilogo finale in questa forma, senza altro: cosa contiene Poteri in tre righe; cosa contiene Artefatti in tre righe; cosa è uscito da Combattimento; scostamenti dal piano; pacchetto per il Doc se c'è; esito validator e test.
