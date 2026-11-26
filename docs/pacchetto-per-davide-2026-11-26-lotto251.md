# Pacchetto per il Doc «Per Davide» — 26/11/2026, lotto 251

Da applicare al Doc da Cowork o da Marcello. Claude Code non scrive nei Google Doc.

## In testa alla sezione 1: le due cose del tuo collaudo del 25/11

La riga «l'adeguamento aspetta che tu dica quando» **non va più scritta**: il tuo rapporto dice che il 24/11 alle
22:58 l'adeguamento è stato fatto e che i sette risultano adeguati, con 21 punti disponibili. Al suo posto, le due
priorità che hai segnato:

> **Priorità 01 — Pablo vede due Neverlost.** Nel registro ci sono due record (`veimvzoj07y0`, del gruppo, con Pablo
> conducente; `veimvzojvax1`, personale, senza conducente). È la domanda A.285, ancora aperta. Non tocchiamo niente:
> prima confrontiamo stato, riserve e collegamenti dei due, come hai chiesto — la revisione 1 da sola non prova che
> il secondo sia vuoto. Appena il confronto è fatto ti diciamo quale dei due tenere e con che cosa dentro.

> **Priorità 02 — Dimitri, Armi da mischia 6 invece di 8.** Visto e confermato: l'adeguamento ha annullato i due +1
> del 2/11 (come chiedeva la A.293) ma non il −2 del 23/11 che li compensava, e quel −2 è rimasto addosso. Lo
> annulliamo con lo storico, solo su Dimitri e solo quella riga, senza aggiungere nessun +2 e senza toccare gli
> altri sei. Dopo la correzione Armi da mischia deve leggere 8 e il contatore deve restare a 21 punti liberi: è
> esattamente la verifica che hai scritto.

## Sezione 3, «Novità nell'app» — due righe

> **I comandi del combattimento sono stati ripassati nel browser vero.** Uno per uno, premuti davvero in una partita
> finta preparata con l'app: il danno applicato a un nemico, la ricarica, il movimento sulla mappa, uno Stato acceso,
> un uso di Talento, la riparazione di un oggetto, i PV, l'attacco e il lancio. **Quindici comandi, quindici provati:
> uno era rotto.**

> **Quello rotto era muto, non sbagliato.** Il «+5» dei Punti Vita, quando i PV sono già al massimo, si spegneva
> senza dire perché: succedeva dopo ogni cura, e il giocatore vedeva solo un pulsante che non reagiva. Adesso dice
> «Punti Vita già al massimo: per andare oltre, il ✎ del Direttore». Nient'altro è cambiato nei numeri.

## Nessuna domanda nuova

Il lotto non tocca regole: non apre domande. **Il primo numero libero resta A.314.**

## Per noi (non va nel Doc)

- il ripasso si lancia con `node tools/ripassa-clic.mjs` (`--tablet` per il lato del giocatore,
  `--senza-preparazione` per il giro corto); i presupposti stanno in `tests/preparazione-tavolo.js`;
- il censimento dei motivi nel solo `title`: `node tools/motivi-nel-title.mjs` — 64 candidati e 43 pulsanti spenti
  senza nessun motivo, da decidere con Marcello;
- i sette del gruppo E sono scritti in parole da tavolo in `docs/registro-blocchi.md`;
- su Drive: Giocatore 0.69, Armamenti 0.92, Veicoli 0.24 (25/11 15:36 UTC), dichiarate non lette nel registro;
  l'istantanea `mutant-stato_2026-11-24_2224.zip` è su Drive e non in `istantanee/`.
