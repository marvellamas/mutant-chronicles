# Pacchetto per il Doc «per-davide.md» — Lotto 163 (02/11/2026, sera): celle e caricatori (A.215)

Da applicare da Cowork (o Marcello): Claude Code non scrive nel Doc. Si applica **sopra il Doc del 02/11 alle 15:22**,
quello appena incollato, con le tue risposte del 02/11 in coda.

Intestazione: «Aggiornato al 2 novembre 2026 (sera).»

Dettaglio: `docs/diff-lotto163-2026-11-02.md`.

---

## Sezione 1 — Domande che bloccano un lavoro in corso

**Togliere** A.231 e A.235: hanno la tua risposta del 02/11 e passano alla sezione 3. La sezione resta con:

> Nessuna, al momento. Grazie per le risposte del 02/11.

## Sezione 2 — Domande aperte

**Togliere** A.220, A.221 e A.230: hanno la risposta del 02/11 e passano alla sezione 3.

**Aggiungere**, nel blocco «Energia e mezzi»:

> **A.243 — Togliere soltanto una cella, o metterla in un’arma vuota** (02/11/2026). *In parole semplici:* il manuale
> dice quanto costa **sostituire** una cella pronta (1 AzP, §7.20.5) o un pacco (1 AzP e due mani, §7.20.6). Adesso nell’app
> la cella si può anche togliere e basta, oppure inserire in un’arma che non ne ha. Quanto costano queste due cose da sole?
> *Nel frattempo:* l’app mostra il costo del cambio e non ne inventa un altro.
>
> **A.244 — Quanto tempo per riempire un caricatore** (02/11/2026). *In parole semplici:* fuori dal combattimento, con
> «Riempi i caricatori», l’app riempie in un colpo solo il caricatore inserito e quelli tolti con le munizioni sciolte, e
> dice quanti colpi ha trasferito. Il manuale non dice quanto tempo ci vuole (per i carichini c’è «1 minuto ogni 50 colpi»).
> Vale lo stesso tempo, un altro, o nessun tempo da segnare? *Nel frattempo:* l’app non segna un tempo.
>
> **A.245 — Una cella danneggiata** (02/11/2026). *In parole semplici:* l’Integrità delle celle è quella della voce
> nell’Inventario (2 PI), non di ogni singola cella. Se una cella si rompe, come la segniamo fra quelle tolte? Si butta, si
> ripara, o resta e non si usa? *Nel frattempo:* l’app non distingue una cella rotta e non toglie niente.

## Sezione 3 — Risposte ricevute, in implementazione

**Togliere** la voce A.215 (passa alla sezione 6), con la sua nota «Nel frattempo il trasformatore ricarica ancora la cella
che sta nell’arma…»: non è più vera.

**Aggiungere:**

> • **A.231 — La CyberArma di Dimitri** (risposta del 02/11). L’esemplare è l’originale di Park; «Consegna l’arma» aggiornerà
> quella voce, senza crearne una seconda, con i nomi «CyberArma Park» (storico) e «CyberArma Dimitri». Il modulo esce dalla
> spada e il Viola diventa un oggetto a parte. *Nell’app:* oggi la consegna crea una voce nuova: da cambiare nel prossimo
> lotto della CyberArma.
>
> • **A.235 — La CyberArma degli Armamenti aggiornati** (risposta del 02/11). Famiglie per forma come nella A.166 (la frusta
> non dà da sola Immobilizzare); peso e Integrità per esemplare (Park: 0,5 kg, Non Comune, PS 12, 4 PI); costruiscono solo i
> Custodi, con la procedura base che hai confermato. *Nell’app:* famiglie, peso e Integrità ci sono già, e la costruzione
> è già riservata ai Custodi; manca la procedura del Custode con i suoi tempi e costi, da aggiungere nello stesso lotto
> della A.231.
>
> • **A.230 — Le Specializzazioni tolte che non sono di Potere** (risposta del 02/11). Anche Armi Inastate e Archi e
> Balestre avranno «Tienila come eccezione» e «Sostituiscila gratis». *Nel frattempo:* hanno l’avviso. Nessuno dei sette
> personaggi le ha.
>
> • **A.220 — Le Ferite e l’Iniziativa dei personaggi** (risposta del 02/11). La penalità dello Stato di Ferita vale anche
> per l’Iniziativa dei PG. *Nel frattempo:* oggi vale solo per i nemici; si cambia in un lotto piccolo.
>
> • **A.221 — Il Magistrale su un ×5** (risposta del 02/11). Resta ×5, come fa già l’app. Restano da controllare il limite
> alla prima istanza di danno e il Soffio risolto solo con le Salvezze (nessun Magistrale).

## Sezione 6 — Risolte (aggiungere)

> • **A.215 — Le celle e i caricatori si tolgono, si riempiono e si rimettono** (risposta del 30/10; app aggiornata il
> 02/11/2026). *In parole semplici:* una cella adesso è una cosa che si sposta.
> - «Togli la cella» la toglie con le cariche che ha; una cella vuota resta, non sparisce.
> - «Inserisci» rimette la stessa o un’altra. «Cambia cella» toglie quella dentro e mette la più carica che hai.
> - Il trasformatore ricarica solo le celle tolte. Se scegli quella inserita, rifiuta e dice perché.
> - I pacchi dei lanciafiamme funzionano allo stesso modo, ognuno come una cosa sola, e si cambiano con 1 AzP e due mani;
>   le celle con 1 AzP.
> - Anche le armi elettrificate da mischia hanno le loro celle: senza una cella pronta non si «ricaricano» più gratis.
>   Dimitri (spada, 4 cariche su 5) e Oshi (katana, 5 su 5) non ne hanno di scorta.
> - I caricatori si riempiono fuori dal combattimento con «Riempi i caricatori», in un colpo solo. Nel tuo esempio
>   dell’Axis: 15/15 e 23 colpi sciolti, sempre un caricatore.
>
> I personaggi salvati non cambiano: chi aveva una cella nell’arma la ritrova con le stesse cariche.

## Sezione 8 — Prove da fare (aggiungere)

> **Celle e trasformatore (A.215).** Scheda di un personaggio con un’arma a cella, una cella di scorta, un trasformatore e
> una CEC dello stesso colore. Tab **Combattimento**: spara fino a 0 → **«Togli la cella»** (resta «vuota») → **«Inserisci»**
> la piena. Tab **Inventario** → «Tampone» → colore → la cella **tolta** → «Ricarica». Scegli invece quella **inserita**:
> deve rifiutare e dirti perché.
