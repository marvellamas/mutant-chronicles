# Pacchetto per il Doc «per-davide.md» — 9 ottobre 2026, lotto «equipaggiamento» (A.35 e Manuale dell'Equipaggiamento 0.6)

Da applicare nel Google Doc «per-davide.md» (`1Jg5rqbBtcHGE1E10xYElO_qCDCwh8K87LAInovtpF6A`) da Cowork o da Marcello,
secondo `docs/protocollo-davide.md` §5, **dopo** il pacchetto del 09/10 (`docs/pacchetto-per-davide-2026-10-09.md`), che
mette la A.35 nella sezione 3.

- A.35 esce dalla sezione 3 («In implementazione»), o dalla sezione 2 se quel pacchetto non è ancora applicato, e va fra
  le Risolte (sezione 6).
- Una domanda nuova nella sezione 2: A.154.

Fonte: decisione 155 di `docs/risposte-master.md` e lotto 6 di `docs/diff-davide-2026-10-08.md`.

---

```
*** DOC per-davide.md — voce A.35
*** AZIONE: sposta la voce A.35 nella sezione 6 (togliendola dalla sezione 3, o dalla sezione 2 se il pacchetto del 09/10 non è ancora applicato)

--- TESTO ---
A.35 — Acquisti iniziali: valore ceduto maggiore del prezzo (§2.16.29). L’eccedenza del valore degli armamenti ceduti sul prezzo di ciò che si prende torna in crediti: la procedura di acquisto mostra «Eccedenza restituita: +N cr» e il saldo iniziale la comprende, anche quando gli acquisti si rifanno con «Modifica creazione». Esempio: cedendo un’armatura da 1.800 crediti per un coltello da 80 si ricevono 1.720 crediti. Implementata il 09/10.
```

```
*** DOC per-davide.md — voce A.154
*** AZIONE: aggiungi in fondo alla sezione 2, sotto «Armamenti»

--- TESTO ---
A.154 — Peso della cartuccia del decontaminante (Manuale dell’Equipaggiamento 0.6, §3.5.1). Nella tabella del decontaminante il peso della «Cartuccia di ricambio» (5 dosi, 500 crediti) è un trattino: vuol dire che è trascurabile (0 kg) oppure manca il dato? Nel frattempo: nell’app il peso resta vuoto e la cartuccia non pesa sul carico.
```
