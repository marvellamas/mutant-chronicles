# Protocollo di lavoro fra Marcello, Claude Code, Cowork e Davide

Scopo: un solo documento per le domande a Davide, un solo posto per ogni cosa, nessuna copia parallela. Deciso da Marcello il 28/09/2026.

## 1. Chi fa cosa

| Chi | Che cosa fa | Dove lavora |
|---|---|---|
| **Davide** (master, autore dei manuali) | scrive i manuali; risponde alle domande **in coda** al Doc «per-davide.md» (sezione 7) | i suoi Doc dei manuali, il suo Doc «E&L», il Doc «per-davide.md» |
| **Claude Code** | legge Doc e manuali, applica le regole nei dati e nel codice, scrive le domande nuove e prepara le modifiche al Doc | il repo; Drive in sola lettura |
| **Cowork** | scrive nel Doc «per-davide.md» le modifiche preparate da Claude Code | il Google Doc, dal browser |
| **Marcello** | passa le modifiche da Claude Code a Cowork, controlla, fa da riserva: se Cowork non può scrivere nel Doc, incolla lui | tutto |

Claude Code non scrive mai nei Google Doc (non ha lo strumento per farlo, e i Doc di Davide sono comunque in sola lettura). Cowork non scrive nei Doc dei manuali né in «E&L»: soltanto in «per-davide.md».

## 2. I documenti

| Documento | Ruolo | Chi scrive |
|---|---|---|
| **Google Doc «per-davide.md»** (`1Jg5rqbBtcHGE1E10xYElO_qCDCwh8K87LAInovtpF6A`, link fisso) | **fonte unica** delle domande a Davide, dell'errata e delle voci risolte; in coda, le risposte di Davide | Cowork (o Marcello); Davide solo nella sezione 7 |
| `docs/per-davide.md` nel repo | copia del Doc, scaricata da Claude Code a ogni sessione (come i manuali in `docs/manuali-txt/`). **Non si modifica a mano**: la versione in Git dice com'era il Doc a quella data | Claude Code, solo scaricando |
| Doc dei manuali e Doc «E&L – Risposte e correzioni approvate» | di Davide; letti in sola lettura (`docs/manuali-drive.md`) | Davide |
| `docs/risposte-master.md` nel repo | registro datato delle decisioni recepite nell'app; vale più del manuale in caso di conflitto | Claude Code |

Il vecchio Doc «Per Davide — domande aperte ed errata (aggiornato 28/09)» (`1HK0EAO7igV6vr4eIoCRBIR9dHstUZGy8kU3utrtoomk`) non si usa più: le sue risposte sono riportate nella sezione 7 del Doc unico. Dopo il primo aggiornamento del Doc unico si rinomina «OBSOLETO — usare per-davide.md» e Marcello lo cestina.

## 3. Struttura del Doc «per-davide.md»

1. **Intestazione con le istruzioni per Davide** (e per l'AI che usa): rispondere in coda, non toccare le domande.
2. Sezioni 1–2: **domande aperte** (A.n). Ogni voce dice cosa fa l'app *nel frattempo*. Una voce con risposta ricevuta ma non ancora implementata resta qui con la riga «Risposta ricevuta il gg/mm (sezione 7): in implementazione.».
3. Sezione 3: **da correggere nella prossima edizione dei manuali** (errata); le voci già sistemate nel manuale sono barrate.
4. Sezione 4: da rileggere. Sezione 5: manuali che l'app aspetta.
5. Sezione 6: **Risolte**. Una riga per voce: numero, titolo, sintesi, «implementata il gg/mm».
6. Sezione 7: **Risposte di Davide**, in coda. Davide aggiunge un blocco per risposta (A.n, data, testo). Le risposte restano lì anche dopo l'implementazione: sono la traccia di ciò che ha detto.

Il testo del Doc è per Davide: niente percorsi di file, nomi di chiavi JSON o dettagli del repo.

## 4. Ciclo di una domanda

1. **Nasce** (Claude Code): serve una decisione di Davide → `TODO(Davide)` nel JSON o nel codice, e una voce A.n nuova (numero successivo al più alto usato) nel pacchetto per il Doc (§5).
2. **Va nel Doc** (Cowork o Marcello): la voce si inserisce nella sezione 1 o 2.
3. **Risposta** (Davide): in coda, sezione 7.
4. **Si recepisce** (Claude Code, alla sessione successiva): la risposta diventa una riga datata in `docs/risposte-master.md`; si applica nei dati e nel codice; si toglie il `TODO(Davide)`. Nel pacchetto per il Doc: prima la riga «Risposta ricevuta… in implementazione» (se l'implementazione non è finita nella stessa sessione), poi lo spostamento in «Risolte».
5. **Si chiude** (Cowork o Marcello): la voce passa dalla sezione 1–2 alla sezione 6, con la data.

Le proposte di modifica del testo dei manuali (errata con il testo esatto) seguono il formato del §6 e vanno nella sezione 3 del Doc.

## 5. Pacchetto per il Doc

Ogni sessione di Claude Code che deve cambiare il Doc chiude con un **pacchetto per il Doc**: l'elenco delle modifiche, pronte da applicare, in questo formato.

```
*** DOC per-davide.md — <intestazione | sezione n | voce A.n>
*** AZIONE: <aggiungi in fondo alla sezione n | aggiungi dopo la voce A.n | sostituisci la voce A.n | sposta la voce A.n nella sezione 6 | aggiungi la riga alla voce A.n>

--- TESTO ---
<testo esatto, in forma leggibile per Davide; per «sposta», la riga da scrivere nella sezione 6>
```

- Un blocco per voce. Il titolo della voce (per esempio «A.52 — Addestramenti a 76 punti…») basta per trovarla con Cerca.
- Il grassetto si usa solo per il titolo delle voci; niente Markdown in eccesso.
- Chi applica il pacchetto (Cowork o Marcello) **non lo incolla nel repo**: il repo si aggiorna da solo alla sessione successiva, quando Claude Code scarica il Doc.
- Alla sessione successiva Claude Code confronta la copia scaricata con il pacchetto e segnala ciò che manca o non torna.

## 6. Proposte di modifica al testo dei manuali

Quando chiediamo a Davide di cambiare il testo di un manuale (errata, precisazioni, schede mancanti), il blocco è questo, così lui può applicarlo con copia-incolla senza interpretare:

```
*** MANUALE: <Giocatore | Magia | Armamenti | Equipaggiamento>
*** PARAGRAFO: §x.y.z — <titolo del paragrafo>
*** POSIZIONE: <dopo la frase "…" | in sostituzione della tabella … | in fondo al paragrafo>
*** MOTIVO: <una riga: perché serve, con il riferimento alla domanda A.n se c'è>

--- CANCELLA ---
<testo esatto da togliere, copiato dal Doc, oppure "nulla">

--- INSERISCI ---
<testo nuovo, pronto da incollare, nello stile del manuale>
```

Una proposta per blocco; il testo in CANCELLA è *esattamente* quello del Doc del manuale, così Davide lo trova con Cerca.

## 7. A ogni sessione di Claude Code

1. Controllo di `docs/manuali-drive.md`: i quattro manuali, «E&L» **e il Doc «per-davide.md»** (data di modifica).
2. Se il Doc «per-davide.md» è cambiato: scaricarlo in `docs/per-davide.md`, `git diff`, e leggere la sezione 7 per le risposte nuove; recepirle come al §4, punto 4.
3. A fine sessione: pacchetto per il Doc (§5), se serve.

## 8. Cosa non fare

- Non creare un altro Doc per Davide né rigenerarne uno: il link è fisso.
- Non modificare a mano `docs/per-davide.md` nel repo, e non incollarci i pacchetti.
- Non correggere i JSON per «seguire» un manuale o una risposta senza registrarla in `docs/risposte-master.md` o nel registro dei manuali.
- Non scrivere nei Doc dei manuali né in «E&L».
