# Risposte di Davide del 23 e del 25/10/2026: confronto con l'app (27/10, lotto 133)

Fonte: Doc «per-davide.md», sezione 7 (modificato il 25/10/2026 alle 22:32 UTC; copia in `docs/per-davide.md`). Manuali
controllati su Drive: nessuna novità (Giocatore 0.49 del 21/10, Magia 1.6, Armamenti 0.64, Equipaggiamento 0.8, E&L del 15/10).

Per ogni risposta: che cosa dice Davide, che cosa faceva l'app, che cosa cambia.

## 25/10

| Risposta | Davide | L'app prima | Cosa cambia |
|---|---|---|---|
| **A.179** | La 0.49 sostituisce la A.48: Aura +2 AR magica / 5 Round; Pelle +1 non magica contro Ravvicinati Naturali o Magici / 5 Round; Aura + Pelle = +3 / +2 / +2, con Corazza Potenziata +4 / +3 / +3. La decisione 41 resta nello storico, sostituita. | **Già così** (lotto 116, commit 9e84978 e seguenti): Mano Curativa 1/2/2/4 (1/1/1/3 con l'Hachimaki), le 11 Tecniche, Meditazione Profonda 1d6 + Mod COS PV, 3 PM, 2 rec. Aff. | Niente nel codice. Una prova nuova sul calcolo vero (`tests/ar-cumuli-a179.test.js`): +3 / +2 / +2 e +4 / +3 / +3. La decisione 41 segnata come sostituita. Il lotto 116 **c'era**, non è stato applicato di nuovo. |
| **A.180** | La scheda mostra i valori approvati; la coda: valore precedente, valore proposto, «In attesa di approvazione»; il giocatore ritira finché è pendente; il ritiro risulta al Direttore e non tocca la scheda; dopo l'approvazione un ripensamento è una richiesta nuova. | La scheda mostrava già la versione del server. La coda mostrava solo l'etichetta e la ✕ valeva solo prima dell'invio; un ritiro spariva senza traccia per il Direttore. | `src/coda-dettaglio.js` (precedente/proposto/dicitura, anche per le voci vecchie senza `prima`/`dopo`); «Ritira» anche sulle voci già arrivate; `ritirate` nel rientro del Direttore con «Ritirata dal giocatore» e «Visto»; fascia del rientro anche per i soli ritiri. |
| **A.181** | Adottata la v1.0: Talenti Liberi 3,5,…,19; Maestrie 2,6,10,14,18; Specializzazioni 1,4,8,12,16,20; al 6° due Talenti Liberi, due Maestrie, due Specializzazioni oltre a quelli di Classe. | **Già così** (lotti 120–125). | Niente. |
| **A.182** | Vale la A.135: 2 cartucce per AzP, fino a 4 con Ricarica Esperta (anche nell'operazione gratuita); «fino a tre» da correggere nel documento; limiti di capacità; non per il caricatore amovibile. | **Già così** nei numeri (decisione 139). Il testo di Ricarica Esperta nel catalogo diceva ancora «fino a tre». | Testo del catalogo: «fino a quattro»; note dei dati e del codice: A.182 risolta. «fino a tre» fra le correzioni al documento. |
| **A.183** | Scelte nell'ordine dei livelli e con i prerequisiti posseduti; Specializzazione iniziale dalla prima Classe, quella del 4° dalla Classe aumentata al Grado II; la conversione sostituisce le vecchie scelte; copia e riepilogo conservati. | **Già così** (controllo `controllaSceltaTalento`, nota dei Talenti di prima nel registro, zip della voce 7). | Una prova in più (`tests/talenti-a183-a185.test.js`). |
| **A.184** | Talento ripreso: scelte conservate entro le quote. Non ripreso: cessano capacità e quote che dipendevano solo da lui, le scelte restano nello storico senza effetti, le fonti indipendenti restano. | **Diverso**: le tre Tecniche di Oshi restavano attive e la scheda avvisava «Tecniche conosciute 3, ammesse 0». | `scelteInStorico` (`src/avanzamento.js`): nei Talenti nuovi, Tecniche e incantesimi oltre le quote sono storico (`scheda.storico`), senza effetti; riquadro «Scelte in storico» nella tab Poteri; nessun avviso di quota; rapporto del passaggio. Ripreso il Talento le scelte tornano attive entro le quote. Tecniche del Lottatore (con la Classe) e della Scuola Mishima (a cui si è iniziati) restano sempre attive. I Talenti di prima non cambiano. |
| **A.185** | Specializzazione dopo la Classe iniziale; un Taumaturgo ha una sola scelta iniziale fra le nove di Potere; gli ampliamenti di Usufruitore di Magia e Ritualista si aprono solo con il requisito. | **Già così**. | Una prova in più. |

**Contraddizione segnalata, non risolta (A.188).** L'A.184 dice che i cambi delle scelte conservate richiedono
l'approvazione del Direttore; lunedì 26/10 Davide ha detto che ogni giocatore cambia sempre i propri incantesimi
(lotti 130 e 131). Resta la regola del tavolo, più recente.

## 23/10 (non ancora registrate prima di questo lotto)

| Risposta | Esito |
|---|---|
| **A.178** | Già così (0.49 recepita il 22/10). |
| **A.175** | Già così (Guanti: proprietà attiva con «Attiva», 3 PM dalle cariche interne). |
| **A.177** | Già così; aggiunta l'ora di ricezione accanto a quella della modifica. |
| **A.174** | **Non applicata**: «Ricarica e medita» (nome, riepilogo di PM spesi / carica / PM recuperati). Lotto a parte. |
| **A.176** | **Non applicata**: gli incantesimi aggiunti dal Direttore come appresi contano come conosciuti. Lotto a parte. |

## Prove (su copie e in memoria, nessun dato reale)

- coda del tablet con precedente / proposto e ritiro che arriva al Direttore: `tests/coda-a180.test.js`, `tests/giornale-server.test.js` (server vero su cartella temporanea);
- Oshi Nagata (copia della fixture) senza Risorse Interiori: tre Tecniche in storico, senza AR, senza avviso; con il Talento ripreso tornano attive: `tests/storico-a184.test.js`;
- Aura + Pelle + Corazza: `tests/ar-cumuli-a179.test.js`.
