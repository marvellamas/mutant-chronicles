# Protocollo di comunicazione con Davide (master e autore dei manuali)

Scopo: nessun pasticcio. Ogni cosa che passa fra noi e Davide ha un solo posto dove sta e un solo formato.

## 1. I tre canali

| Cosa | Dove sta | Chi scrive | Chi legge |
|---|---|---|---|
| **Manuali** (fonte delle regole) | Google Doc di Davide (vedi `docs/manuali-drive.md`) | solo Davide | noi, in sola lettura, a ogni sessione |
| **Domande aperte ed errata** | `docs/per-davide.md` nel repo → copia su Google Doc "Per Davide" | noi | Davide |
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

## 3. Come Davide ci risponde

Nel suo Doc "E&L", una voce per decisione, con:

- numero della domanda (A.n) o "nuova regola";
- data;
- il testo approvato, completo (tipo, prerequisiti, molteplicità per i Talenti; formula e tabella per le regole);
- dove l'ha applicato nel manuale (paragrafo).

È il formato che usa già: va bene così.

## 4. Chi fa cosa a ogni sessione

1. **Code, all'apertura**: controlla i quattro manuali (procedura in `docs/manuali-drive.md`) e il Doc "E&L" (data di modifica); se sono cambiati, applica e riferisce; se no, dice "manuali e risposte invariati".
2. **Marcello**: passa le proposte a Davide (Google Doc "Per Davide" rigenerato quando serve) e riporta a Code eventuali risposte a voce, che Code registra in `risposte-master.md`.
3. **Davide**: modifica i manuali sui suoi Doc; risponde in "E&L". Non gli serve toccare il repo.

## 5. Cosa non fare

- Non correggere a mano i JSON per "seguire" una modifica del manuale senza registrarla in `risposte-master.md` o nel registro: dopo due settimane nessuno saprebbe più perché il dato è così.
- Non scrivere nei Doc di Davide, nemmeno commenti: le proposte passano dal formato del §2.
- Non tenere copie parallele delle domande (un solo `per-davide.md`, rigenerato su Drive; la copia vecchia va nel cestino).
