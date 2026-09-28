# Protocollo di comunicazione con Davide (master e autore dei manuali)

Scopo: nessun pasticcio. Ogni cosa che passa fra noi e Davide ha un solo posto dove sta e un solo formato.

## 1. I tre canali

| Cosa | Dove sta | Chi scrive | Chi legge |
|---|---|---|---|
| **Manuali** (fonte delle regole) | Google Doc di Davide (vedi `docs/manuali-drive.md`) | solo Davide | noi, in sola lettura, a ogni sessione |
| **Domande aperte ed errata** | `docs/per-davide.md` nel repo → Google Doc "Per Davide" (link fisso, aggiornato a mano: §2bis) | noi | Davide |
| **Risposte e decisioni** | Google Doc "E&L – Risposte e correzioni approvate" di Davide | Davide | noi, a ogni sessione |

Le risposte, una volta lette, vengono copiate in `docs/risposte-master.md` con la data (quello che c'è lì vale più del manuale finché il manuale non viene aggiornato) e la domanda sparisce da `per-davide.md`.

## 2. Come formuliamo una proposta di modifica al manuale

Quando chiediamo a Davide di cambiare il testo di un manuale (errata, precisazioni, schede mancanti), usiamo sempre questo formato, così lui può applicarlo con copia-incolla senza interpretare:

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

Una proposta per blocco; se la stessa correzione tocca tre paragrafi, tre blocchi. Il testo in CANCELLA deve essere *esattamente* quello del Doc (copiato, non riassunto), così Davide lo trova con Cerca.

## 2bis. Come si aggiorna il Doc «Per Davide»

Il Google Doc «Per Davide» ha un link fisso, che Davide conosce: **non si rigenera e non si sostituisce**. Le modifiche a `docs/per-davide.md` si riportano nel Doc a mano: Code prepara il testo pronto da incollare, Marcello lo incolla.

- Code prepara i blocchi ogni volta che una sessione cambia `docs/per-davide.md` (voce nuova, voce chiusa, «Nel frattempo» cambiato, intestazione), e li consegna nel riepilogo della sessione.
- I blocchi coprono tutte le differenze dall'ultimo testo consegnato (registro qui sotto): si ricavano con `git diff <commit del registro> -- docs/per-davide.md`.
- Un blocco per voce (o per sezione, se cambia l'intestazione di una sezione). Il testo è quello che deve comparire nel Doc: niente segni Markdown (asterischi, backtick), il grassetto si rimette a mano se serve.

```
*** DOC «PER DAVIDE» — <intestazione | sezione 0 | voce A.n | …>
*** AZIONE: <sostituisci la voce | aggiungi dopo la voce A.n | togli la voce>

--- TESTO ---
<testo pronto da incollare, oppure «nulla» per «togli»>
```

Per «sostituisci» e «togli» il titolo della voce (per esempio «A.52 — Addestramenti a 76 punti…») basta a trovarla con Cerca.

**Registro.** Ultimo testo di `docs/per-davide.md` consegnato per il Doc: commit `512bbbd` (28/09/2026). Code aggiorna questa riga ogni volta che consegna i blocchi.

## 3. Come Davide ci risponde

Nel suo Doc "E&L", una voce per decisione, con:

- numero della domanda (A.n) o "nuova regola";
- data;
- il testo approvato, completo (tipo, prerequisiti, molteplicità per i Talenti; formula e tabella per le regole);
- dove l'ha applicato nel manuale (paragrafo).

È il formato che usa già: va bene così.

## 4. Chi fa cosa a ogni sessione

1. **Code, all'apertura**: controlla i quattro manuali (procedura in `docs/manuali-drive.md`) e il Doc "E&L" (data di modifica); se sono cambiati, applica e riferisce; se no, dice "manuali e risposte invariati".
2. **Marcello**: incolla nel Google Doc "Per Davide" i blocchi preparati da Code (§2bis) e riporta a Code eventuali risposte a voce, che Code registra in `risposte-master.md`.
3. **Davide**: modifica i manuali sui suoi Doc; risponde in "E&L". Non gli serve toccare il repo.

## 5. Cosa non fare

- Non correggere a mano i JSON per "seguire" una modifica del manuale senza registrarla in `risposte-master.md` o nel registro: dopo due settimane nessuno saprebbe più perché il dato è così.
- Non scrivere nei Doc di Davide, nemmeno commenti: le proposte passano dal formato del §2.
- Non tenere copie parallele delle domande: un solo `per-davide.md`, riportato a mano nell'unico Doc "Per Davide" (link fisso: non si rigenera, non si crea un Doc nuovo).
