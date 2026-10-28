# A.174 — «Ricarica e medita» (28/10/2026)

Risposta di Davide del 23/10/2026 (Doc «per-davide.md», sezione 7): il comando unico è ammesso purché rispetti l'ordine
dei due passaggi — il personaggio spende PM già disponibili per ricaricare il cristallo, poi medita per recuperarli; si
applicano requisiti, rapporti, tempi, limiti e prove dei due passaggi; il recupero dipende dall'esito effettivo della
Meditazione; un'interruzione non annulla la ricarica già completata; il comando si chiama «Ricarica e medita» e mostra
PM spesi, carica ottenuta e PM effettivamente recuperati; non si spendono in anticipo PM ancora da recuperare.

## Che cosa faceva «Medita» prima

Il pannello calcolava **prima** il recupero (ore × PM per ora) e poi la conversione dal totale «PM attuali + PM
recuperati» (`pool` in `src/medita.js`). Con 2 PM e 6 ore di Riposo completo convertiva fino a 20 PM: versava nel
cristallo PM che il personaggio non aveva ancora, e i PM oltre il massimo personale «non si buttavano» perché finivano
nel cristallo. È proprio ciò che la A.174 esclude. I costi della ricarica (rapporto, Addestramento Taumaturgo, 1 AzP,
contatto e sintonizzazione, Prova di Potere dal secondo gruppo, limite di ore della Meditazione) si pagavano già tutti
(lotto del 20/10, `tests/medita-costi.test.js`): verificato, restano.

## Che cosa fa adesso

`src/medita.js` → `pianoMedita`, pannello in `src/ui/medita.js`:

1. **Ricarica** (primo passo del pannello): si sceglie «Solo Medita» o «Ricarica <cristallo>, poi medita». I gruppi
   possibili sono al massimo i PM di adesso divisi per il rapporto (3:1; 2:1 con Ricarica Efficiente o Conversione
   Migliorata; 1:1 con entrambi; Bianco sempre 2:1), entro la capacità del cristallo. Se se ne chiedono di più: «Non si
   può: 5 gruppi costano 15 PM e ne hai 10 adesso…», e ci si ferma a quelli possibili. Prova di Potere, 1 AzP, contatto e
   Addestramento come la ricarica fatta da sola (avvisi e «Procedi comunque» dove mancano).
2. **Meditazione** (secondo passo): la modalità (la Meditazione ordinaria della scheda o il recupero naturale; la
   Meditazione Profonda della 0.49 è una Tecnica a parte, A.178), le ore, le ore già fatte oggi (limite giornaliero) e
   «Com'è andata»: Completata, oppure Interrotta con le ore complete prima dell'interruzione. Il recupero parte dai PM
   rimasti dopo la ricarica e non supera il massimo personale.
3. **Conto**: la riga «Spesi 9 PM → Batteria Matrice da 10 PM (Chroma Rosso) +3 cariche · Meditazione: recuperati 6 PM»,
   le righe del conto in ordine (1. Ricarica, 2. Meditazione) e «Conferma: Ricarica e medita». La stessa riga va nel
   registro del personaggio. Senza cristallo il pannello è «Medita» come prima.

## Prove

- `tests/ricarica-medita-a174.test.js`: Taumaturgo con 10 PM e cristallo vuoto (9 PM spesi, +3, poi la Meditazione da 1
  PM); Meditazione interrotta (la ricarica resta, 0 PM recuperati); più gruppi dei PM disponibili (fermo a 3, avviso); i
  cinque rapporti di conversione; Meditazione ordinaria e limite di ore; pannello.
- `tests/medita.test.js` e `tests/medita-costi.test.js` aggiornati alla regola nuova.
- Browser a 820 px, server di prova sulla porta 3017, copia di Fratello Anselmo con 10 PM e una Batteria Matrice Rossa
  vuota: conto «Spesi 9 PM → … +3 cariche · Meditazione: recuperati 6 PM», PM 10 → 1 → 7; con «Interrotta» a 0 ore la
  riga dice «recuperati 0 PM» e, confermato, il file ha PM 1 e cristallo 3; con 5 gruppi chiesti l'avviso «Non si può».
