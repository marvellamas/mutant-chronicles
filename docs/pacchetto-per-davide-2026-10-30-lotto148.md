# Pacchetto per il Doc «per-davide.md» — Lotto 148 (30/10/2026, notte)

Da applicare da Cowork (o Marcello): Claude Code non scrive nel Doc. Si applica **sopra il Doc del 30/10 13:19**, **dopo** il pacchetto del lotto 147 (`docs/pacchetto-per-davide-2026-10-30-lotto147.md`), che nel Doc non c'è ancora. Dettaglio: `docs/diff-lotto148-2026-10-30.md`.

Intestazione: «Aggiornato al 30 ottobre 2026 (notte).»

---

## Sezione 2 — Domande aperte (in coda al blocco «Bestiario e mappa»)

> **A.222 — Il Dragomedusa: l'ordine del 14 × 10 e il corpo del giovane.** Il manuale scrive per l'adulto «ingombro corporeo personale di 14 × 10 Q Base». Per i draghi hai detto che il corpo disteso è lunghezza × larghezza e che l'app deve mostrare larghezza × lunghezza: abbiamo fatto lo stesso per il Dragomedusa adulto, quindi nel campo c'è «10 × 14». Vale così, o il 14 × 10 era già larghezza × lunghezza? Il Dragomedusa giovane non ha nessun ingombro in Q Base nel manuale (solo la pedina 1 × 1 in Q Tattici e «8–10 m»): quanto occupa in Q Base? *Nel frattempo:* adulto 10 × 14; giovane senza ingombro (vale la Taglia Grande).
>
> **A.223 — La testa della Madre delle Murene.** La testa dà l'origine di attacchi e soffio. Sulla mappa l'app mette la testa all'estremità del muso: si gira la creatura (anche di 45°) per portarla dove serve, e la linea di tiro e la distanza partono da lì. Ti va bene, o vuoi poter spostare la testa a mano su un altro quadretto della sagoma (per esempio con la Madre parzialmente emersa)? *Nel frattempo:* all'estremità del muso, senza spostarla a mano.
>
> **A.224 — La roccia sulla mappa.** In forma eterea la Murena della Roccia cucciolo attraversa la roccia. Nella mappa la roccia è fatta di muri: l'app fa passare la forma eterea attraverso i muri (la maschera dei muri), ma non quelli disegnati come linea sottile (muri e porte a linea). La roccia va disegnata come muri a quadretti, o vuoi un tipo di terreno «roccia» a parte, che solo le creature che la attraversano possono usare? *Nel frattempo:* muri a quadretti.
>
> **A.225 — I movimenti in una mappa a Q Tattici.** In Q Tattici le creature hanno la pedina del manuale (drago giovane 1 × 1, adulto 2 × 1, antico 2 × 2; Dragomedusa 1 × 1 e 2 × 1), ma Passo, Corsa e Scatto restano quelli del profilo, in Q Base: il volo del drago è scritto «8 / 16 / 24 Q Tattici». L'app deve convertire il volo (e la portata dei soffi, «linea 12 × 1 Q Tattici») quando la scena è in Q Tattici, o in una mappa a Q Tattici il movimento lo conti tu a mano? *Nel frattempo:* a mano; nessuna conversione.

## Sezione 3 — Risposte ricevute, in implementazione

**Togliere** le voci A.198, A.202, A.203 e A.204 (passano alla sezione 6). Restano A.190, A.191, A.192, A.193, A.195 e A.196.

## Sezione 6 — Risolte (aggiungere)

> • **A.198 — Le sagome più grandi e la scala della mappa** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* le creature possono occupare fino a 20 quadretti per lato: i draghi antichi (10 × 16) e il Dragomedusa adulto (10 × 14) hanno finalmente il loro spazio sulla mappa. In Q Base la sagoma è quella del profilo, rettangolare, e si gira di 45°; in Q Tattici si usano le pedine del manuale (Dragomedusa 1 × 1 il giovane, 2 × 1 l'adulto; drago 1 × 1, 2 × 1, 2 × 2). La mappa dichiara la sua scala — «Q Base · 1 Q = 1,5 m» o «Q Tattici · 1 Q = 15 m» — con un'etichetta sempre visibile, e la si sceglie finché non ci sono creature. Le regole dei muri e delle collisioni non cambiano: un angolo della sagoma non attraversa mai un muro, ricontrollato su tutte le sagome fino a 20 × 20 in tutti gli orientamenti.
>
> • **A.202 — La Murena della Roccia cucciolo** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* il 6 / 12 / 18 è il movimento della forma eterea (attraversa la roccia); non ha un movimento terrestre. In overdose è corporea: ferma, non attacca, non attraversa la roccia, non Schiva, fino alla fine del Round successivo; poi torna eterea da sola. Nella carta della creatura c'è il pulsante «Corporea (overdose)»; da corporea il movimento è zero e «Attacca!» avvisa che non attacca.
>
> • **A.203 — La Madre delle Murene** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* la scegli tu: parzialmente emersa (2 × 2) o completamente emersa (6 × 2); nella parziale resta la nota dei 4 Q di estensione nella roccia. Cambiando configurazione cambia solo la misura sulla mappa, nello stesso punto: PV, PM, Ferite, Stati e Azioni già spese restano tutti, è la stessa creatura. La testa dà l'origine degli attacchi e del soffio (domanda A.223).
>
> • **A.204 — L'ordine delle misure dei draghi** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* il corpo disteso è «lunghezza × larghezza» nel manuale e l'app lo mostra «larghezza × lunghezza»: giovane 4 × 6, adulto 6 × 10, antico 10 × 16, cucciolo 1 × 2. Trentasei draghi (15 giovani, 10 adulti, 10 cuccioli e il Dracolich) avevano le misure al contrario e sono stati corretti: sulla mappa erano stesi di traverso.

## Sezione 4 — Da correggere nella prossima edizione dei manuali

> • Mostri 0.46, schede dei draghi e del Dragomedusa: il corpo è scritto «lunghezza × larghezza» (6 × 4, 10 × 6, 16 × 10, 14 × 10) mentre il Giocatore e l'app contano «larghezza × lunghezza» per le altre creature (Spazio 3 × 10 per la Covata): un'avvertenza nel capitolo 8 eviterebbe l'inversione (A.204, A.222).

## Sezione 5 — Manuali che l'app aspetta

> • Uscite il 30/10 alle 17:38, non ancora lette né recepite: Equipaggiamento **0.25**, Veicoli **0.10**, ASA Scout **0.6**, registro NEC **2.10** (usciti alle 17:38; il registro era 2.9 alle 08:24).
