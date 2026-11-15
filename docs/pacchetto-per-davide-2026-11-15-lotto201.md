# Pacchetto per il Doc «per-davide.md» — Lotto 201 (15/11/2026): Pablo e Lucas non aprono il mezzo

Da applicare da Cowork (o Marcello): Claude Code non scrive nel Doc. Si applica **dopo** il pacchetto del lotto 200
(`docs/pacchetto-per-davide-2026-11-15-lotto200.md`).

Intestazione: «Aggiornato al 15 novembre 2026.»

Dettaglio: `docs/diff-lotto201-2026-11-15.md`.

**Nessuna domanda nuova**: la diagnosi prova che è un veicolo solo, ricreato tre volte, non due mezzi diversi da
tenere. Il primo numero libero resta **A.273**.

---

## Sezione 4 — Cose da sistemare nei manuali o nei file

**Sostituire** la riga aggiunta dal lotto 200 («Due personaggi rimandano a un veicolo che non c'è») con questa, che
dice la stessa cosa ma sa anche perché ed è già risolta dalla parte nostra.

> • **Pablo e Lucas non riescono ad aprire il mezzo, e con un comando si rimette a posto.** Nelle loro schede lo
> Scout è attaccato a un veicolo che nel tuo registro non esiste più: **Pablo** a `veimuu14mqa0`, **Lucas** a
> `veimv15h6e40`. Il FIAT LUX vero è `veimvozx57q0`. Per l'app quei due mezzi non esistono, quindi la scheda non li
> apre — e Pablo è il pilota.
>
> *Che cos'è successo, in parole semplici.* È **sempre lo stesso Scout**, registrato tre volte: il 4 ottobre, il 9
> ottobre e il 26 ottobre. Lo abbiamo verificato numero per numero — stesso modello, stessi PI 60/36/24, stessi 400
> colpi caricati e 800 di riserva, stessa energia, stesso proprietario (il gruppo) e Pablo alla guida: un mezzo
> solo. Nasceva un record nuovo ogni volta che una scheda che aveva lo Scout «in casa propria» lo passava al
> registro, perché il controllo dei doppioni guardava solo i mezzi marcati «del gruppo». Dei tre, nel tuo registro
> è rimasto l'ultimo; le schede di Pablo e Lucas erano rimaste attaccate ai primi due. **Non hai sbagliato niente
> tu**: il 2 novembre hai tolto dalla scheda di Pablo il riferimento buono (è un pulsante che c'è, e il mezzo resta
> nel registro), e sotto è riemerso quello morto di ottobre — che non si poteva nemmeno buttare, perché l'app non
> lo mostrava fra i mezzi.
>
> *Che cosa si fa adesso, e tu scegli come.* **Dalla scheda:** apri la tab Veicoli del personaggio in modifica
> master; dove c'era il vuoto adesso c'è una riga che dice qual è il mezzo che manca e, accanto, la tendina dei
> veicoli che esistono con «Ricollega». L'app **non ricollega da sé**, nemmeno quando il candidato giusto è
> evidente: scegli tu, perché attaccare il mezzo sbagliato sarebbe peggio che lasciarlo staccato. **Oppure con un
> comando:** `node tools/riferimenti-rotti.mjs` ti dice che cosa c'è da rimettere senza toccare niente, e
> aggiungendo `--scrivi` lo rimette dove il mezzo giusto è uno solo — che è il caso di adesso, per tutti e due.
> Tocca solo il file di adesso di ciascuno, scrive una riga nello storico, e rilanciato non trova più niente. Se un
> giorno i candidati fossero due, non sceglie: lo lascia e te lo dice.
>
> *E perché non ci siamo accorti prima.* Un mezzo staccato non si vedeva da nessuna parte finché qualcuno non apriva
> quella scheda al tavolo. Lo abbiamo trovato il 15 novembre per caso, correggendo un altro strumento, quando il più
> vecchio dei due era là **dal 4 ottobre**. Adesso il controllo che facciamo all'inizio di ogni sessione lo stampa
> in terza riga, con i nomi: se ricapita, lo sappiamo prima della serata e non durante.

---

## Sezione 8 — Prove al tavolo

**Aggiungere in coda:**

> **26. Rimetti il mezzo a Pablo e a Lucas.** Apri la tab Veicoli di Pablo in modifica master: dovresti vedere la
> riga che dice che il mezzo `veimuu14mqa0` non c'è più, e accanto la tendina con «FIAT LUX». Scegli e premi
> «Ricollega». Lo stesso per Lucas (`veimv15h6e40`). *Deve succedere:* la riga sparisce, compare l'avviso «Veicolo
> ricollegato…», e da quel momento la scheda apre il FIAT LUX con i suoi PI, le munizioni e le riserve. *Se
> preferisci farlo in un colpo:* `node tools/riferimenti-rotti.mjs --scrivi` li rimette tutti e due, e poi la
> scheda li apre.
>
> *Una cosa da guardare mentre ci sei:* prima di scegliere, «Ricollega» deve essere **spento**. Se fosse già
> premibile, o peggio se trovassi il mezzo già ricollegato senza aver scelto niente, dillo subito: vuol dire che
> l'app ha indovinato al posto tuo, ed è esattamente quello che non deve fare.
