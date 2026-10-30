# Pacchetto per il Doc «per-davide.md» — Lotto 147 (30/10/2026, sera)

Da applicare da Cowork (o Marcello): Claude Code non scrive nel Doc. Si applica **sopra il Doc del 30/10 12:31** (quello che ha già il pacchetto della ricognizione), sezione per sezione. Dettaglio: `docs/diff-lotto147-2026-10-30.md`.

Intestazione: «Aggiornato al 30 ottobre 2026 (sera).»

---

## Sezione 2 — Domande aperte (in coda al blocco «Personaggi e salvataggi» e al blocco «Bestiario e mappa»)

> **A.220 — Le Ferite abbassano l'Iniziativa dei personaggi?** Con la tua A.200 le Ferite e le condizioni continuano a dare penalità all'Iniziativa dei nemici (il minimo 0 è solo del bonus base): ora un nemico con una Ferita Profonda tira −4 + d10. Per i personaggi, invece, l'app non toglie niente all'Iniziativa per le Ferite, perché la tabella del §5.14 parla di «VA e Prove Salvezza». Le Ferite abbassano anche l'Iniziativa dei PG? *Nel frattempo:* per i PG no, per i nemici sì.
>
> **A.221 — Il Successo Magistrale su un danno ×5.** Il §1.6 dice ×1 → ×2, ×2 → ×3, ×3 resta ×3. Per i danni con moltiplicatore più alto (le creature come «8d10×5») l'app prima li abbassava a ×3 con il Magistrale (un errore nostro, corretto). Adesso il Magistrale su un ×5 lascia ×5 (non aggiunge e non toglie). È la regola giusta, o un ×5 con il Magistrale diventa ×6? *Nel frattempo:* resta ×5.

## Sezione 3 — Risposte ricevute, in implementazione

**Togliere** le voci A.197, A.199, A.200, A.201, A.205, A.206 e A.207 (passano alla sezione 6). Restano A.190, A.191, A.192, A.193, A.195, A.196, A.198, A.202, A.203, A.204.

## Sezione 6 — Risolte (aggiungere)

> • **A.206 — Parata a Mani Nude del Lottatore** (risposta del 30/10, **modifica di regola**; app aggiornata il 30/10/2026). *In parole semplici:* la Parata a Mani Nude ora fa parte dell'Addestramento al Combattimento Senz'Armi del I Grado: ogni Lottatore, qualunque Disciplina, con almeno una mano libera para gli attacchi ravvicinati, con 1 AzP anche fuori Iniziativa; se riesce, il danno si dimezza per eccesso prima dell'Armatura; il Magistrale lo annulla; non vale contro attacchi a distanza, Aree o attacchi imparabili; con Parata Istintiva vale anche a mani nude; nessun PM. Il vecchio Talento a scelta ora si chiama «Parata a Mani Nude Migliorata» e dà +2 VA alle Difese per parare a mani nude (si somma alla Guardia, non vale con il bastone, non tocca Schivata, Elusione o Parate con armi). *Nell'app:* le scelte già fatte del vecchio Talento si leggono come il Talento nuovo, senza toccare i file dei personaggi (nessuno dei sette ha il vecchio Talento: non c'è niente da riscrivere); il Lottatore dei modelli PNG para a mani nude a VA 12 (I Grado) e poi 17, 20, 22, 25, 27, con la Schivata 12, 15, 18, 20, 23, 25. La nostra vecchia proposta A.206 (Difese = Schivata al I Grado) è tolta.
>
> • **A.197 — Il premio di fine Atto non si duplica** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* la seconda assegnazione dello stesso premio allo stesso personaggio, nello stesso Atto, è bloccata, anche se la si tenta da un'altra partita; il premio spetta anche agli assenti. Per correggere un'assegnazione sbagliata c'è la rettifica con il motivo, che resta nel registro; un premio in più si scrive nel «Bonus», senza toccare quello di fine Atto. È l'unica eccezione al principio «l'app avvisa, non blocca».
>
> • **A.199 — I danni con moltiplicatore** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* un danno come «8d10×5» si tira dall'app: tira gli otto d10, li somma e moltiplica per cinque, e mostra i dadi, la somma e il totale; Difese e Armatura si applicano dopo. Vale per tutte le creature (97 voci) e per il Soffio del Dragomedusa: 8d10×5 il giovane, 12d10×5 l'adulto, Magici. Le armi navali della Neverlost useranno lo stesso calcolo quando entrerà.
>
> • **A.200 — L'Iniziativa dei PNG umani** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* il minimo 0 è solo del bonus base di Iniziativa, anche per i tre Inquisitori; le penalità di Ferite e condizioni si sommano dopo, e il totale può essere negativo (un nemico con Iniziativa 0 e una Ferita Profonda fa −4 + d10). Prima l'app non applicava nessuna penalità all'Iniziativa dei nemici. Per i personaggi: domanda A.220.
>
> • **A.201 — I nomi dei draghi metallici** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* tutti gli stadi si chiamano Drago d'ottone, di rame, di bronzo, d'argento, d'oro. Le forme di prima («Drago di ottone adulto») restano come alias nella ricerca, senza duplicare le creature.
>
> • **A.205 — Diplomazia e Oratoria** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* «Diplomazia» è Oratoria, con gli stessi valori (Driade 13, Marinide 10), anche nell'importazione delle schede dal manuale.
>
> • **A.207 — Natura del danno e AC delle armi** (risposta del 30/10; verificata il 30/10/2026). *In parole semplici:* le armi ordinarie di umani e umanoidi fanno danni Naturali e AC 1 per colpo, salvo indicazione del profilo; il «Danno completo» comprende già i bonus ordinari, quindi non si aggiunge nulla (resta l'EQ dei modelli PNG); AC 1 non limita il numero di attacchi. Controllati tutti i 341 nemici prestabiliti, le creature del Bestiario proposto, i 120 profili dei modelli PNG e la conversione da personaggio: nessuno somma due volte i bonus.

## Sezione 4 — Da correggere nella prossima edizione dei manuali

> • Mostri 0.46, tabella dei PNG generici del Lottatore: la Parata «—» del I Grado e i valori 15, 18, 20, 23, 25 non sono più quelli della tua risposta A.206 (12, 17, 20, 22, 25, 27 con la Parata a mani nude): da riallineare.

## Sezione 5 — Manuali che l'app aspetta

> • Giocatore: il §3.5.5 aggiornato il 30/10 (12:24) è recepito. L'edizione dice ancora 0.50.
