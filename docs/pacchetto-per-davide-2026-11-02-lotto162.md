# Pacchetto per il Doc «per-davide.md» — Lotto 162 (02/11/2026): le tue risposte del 30/10 e del 01/11

Da applicare da Cowork (o Marcello): Claude Code non scrive nel Doc. Si applica **sopra il Doc del 01/11 19:29**, **dopo**
i pacchetti dei lotti 147–158 che nel Doc non ci sono ancora.

Intestazione: «Aggiornato al 2 novembre 2026 (lotto 162).»

Dettaglio: `docs/diff-lotto162-2026-11-02.md`.

---

## Sezione 2 — Domande aperte

**Togliere** le voci A.208, A.209, A.210, A.211, A.212, A.213, A.215, A.217, A.218, A.219 e A.229 (hanno la risposta:
vanno nella sezione 3 o nella 6, qui sotto).

**Aggiungere:**

> • **A.241 — Le Specializzazioni tolte che non sono di Potere** (02/11/2026). *In parole semplici:* con la A.229 hai
> deciso per le Specializzazioni di Potere già prese e non più nell'elenco: restano finché il Direttore le tiene come
> eccezione o le sostituisce gratis. Il manuale toglie anche due voci che non sono di Potere: Armi Inastate all'Incursore
> e Archi e Balestre all'Invocatore (era la A.230). Vale la stessa regola anche per loro? Per ora chi le ha le tiene con
> l'avviso e nessuno le può scegliere di nuovo; i due pulsanti del Direttore ci sono solo per le voci di Potere. Nessuno
> dei sette personaggi ha una di queste due voci.
>
> • **A.242 — Il documento «Talenti, Specializzazioni e Maestrie v1.1»** (02/11/2026). *In parole semplici:* nella A.229
> lo citi insieme al Giocatore 0.54 e alla Magia 1.11, ma nella cartella condivisa abbiamo solo la v1.0 del 7/10. Puoi
> condividerlo? Per ora l'app usa gli elenchi del Giocatore 0.54 e della Magia 1.11, che la tua risposta conferma.

## Sezione 3 — Risposte ricevute, in implementazione (aggiungere)

> • **A.208 — Iniziativa degli Elementali maggiori** (risposta del 30/10). Da soli tirano 1d10 con bonus 0: l'app fa già
> così. Manca la modalità «agisce subito dopo l'evocatore» nella plancia: è il prossimo lavoro sugli scontri.
>
> • **A.209 — Parata e Schivata dei modelli PNG** (risposta del 30/10). Serve un campo nuovo nella scheda dei nemici. Nel
> frattempo l'app usa la Parata, come prima.
>
> • **A.210 — PX dei modelli PNG senza GS** (risposta del 30/10). Campo PX anche senza GS e «GS non assegnato» nella scheda e
> nel calcolatore: da fare insieme alla A.209.
>
> • **A.212 — Concessioni speciali con i loro numeri** (risposta del 30/10). Abilità, VA, PM e limiti della concessione
> usati da «Lancia!», o «gestione manuale». Nel frattempo la concessione resta un testo che scrivi tu e rende lanciabile
> l'incantesimo; dal tablet un giocatore non la può scrivere.
>
> • **A.215 — Celle e caricatori che si tolgono e si riempiono** (risposta del 30/10). È un lavoro grande sulle munizioni.
> Nel frattempo il trasformatore ricarica ancora la cella che sta nell'arma, come prima: la tua risposta lo vieta, ma
> finché l'app non sa «togliere» la cella, vietarlo vorrebbe dire non poterla ricaricare affatto. Cambierà insieme al
> resto della A.215.

## Sezione 6 — Risolte (aggiungere)

> • **A.229 — Specializzazioni di Potere per Classe** (risposta del 01/11; app aggiornata il 02/11/2026). *In parole
> semplici:* ogni Classe sceglie le Specializzazioni dal suo elenco del Giocatore 0.54. Custode, Invocatore, Mistico e
> Tecnomante non hanno più tutte e nove quelle di Potere (l'Arcanista sì); con Usufruitore di Magia si aprono di nuovo.
> Chi ne ha già una non più nel suo elenco la tiene, con i suoi effetti e un avviso, finché tu decidi da «Modifica
> master»:
> - «Tienila come eccezione», con il motivo;
> - oppure «Sostituiscila gratis», tenendo il posto.
>
> Prima di cambiare l'app salva una copia della scheda, e la decisione va nel registro. Il giocatore non può decidere al
> posto tuo. Dei sette personaggi nessuno è toccato: Lucas ha Elementi e Manifestazione, che restano nell'elenco
> dell'Invocatore.
>
> • **A.211 — «Appreso» lo conferma il Direttore** (risposta del 30/10; app aggiornata il 02/11/2026). *In parole
> semplici:* quando un giocatore aggiunge un incantesimo a mano, entra come «annotato». Se dice che l'ha appreso, l'app
> scrive «appreso da confermare» e te lo chiede; finché non confermi non si lancia e non conta come conosciuto. Tu lo
> confermi dalla scheda dell'incantesimo con «Segna come appreso».
>
> • **A.213 — Incantesimi aggiunti prima della distinzione** (risposta del 30/10). L'app faceva già così: restano «da
> classificare», si lanciano come prima e li classifichi tu, con la riga nello storico.
>
> • **A.217 — Vecchi Banchi e Moduli** (risposta del 30/10). L'app faceva già così: un Banco diventa una CEC dello stesso
> colore con la stessa frazione, un Modulo senza corrispondenza resta «da convertire», una volta sola. (I ricambi di
> prima dei mezzi sono ancora la A.227.)
>
> • **A.218 — Il Bestiario v0.64** (risposta del 30/10). Grazie del chiarimento: per il Soffio del Dragomedusa l'app usa
> già 8d10 × 5 e 12d10 × 5 Magici, dal Mostri 0.46.
>
> • **A.219 — «Chiudi la giornata»** (risposta del 30/10). L'app faceva già così: è un tuo tocco, anche senza Calendario,
> arrotonda una volta e non addebita due volte; il supporto vitale una volta al giorno. La proposta di chiusura dal
> Calendario, che hai detto facoltativa, non c'è.

## Sezione 8 — Prove da fare (aggiungere)

> **Le Specializzazioni di Potere (A.229).** Dopo «Aggiorna»: apri la scheda di un Taumaturgo che ha un posto di
> Specializzazione libero → riquadro «Da scegliere». Fra quelle di Potere ci sono solo quelle della sua Classe; le altre
> sono in grigio con «Non è più nell'elenco … (A.229)».
>
> **«Appreso» da confermare (A.211).** Da un tablet: tab Poteri → «Aggiungi un incantesimo a mano» → «Appreso (lo
> conferma il Direttore)». Sul tuo PC, in «Modifica master», la scheda dell'incantesimo dice «Annotato, appreso da
> confermare»; «Segna come appreso» lo conferma.
