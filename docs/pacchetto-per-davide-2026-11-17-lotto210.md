# Pacchetto per il Doc «per-davide.md» — 17/11/2026, lotto 210

Da applicare al Google Doc da Cowork o da Marcello. Claude Code non scrive nei Doc di Davide.
Il Doc su Drive è quello del lotto 208 (modificato il 16/11 alle 17:45 UTC); nessuna risposta nuova di Davide in sezione 7.
Questo pacchetto **si somma** a quello del lotto 209 (`docs/pacchetto-per-davide-2026-11-17-lotto209.md`).

---

## 1. Sezione 1 — invariata

La scelta della strada per il livello 8 è ancora l'unica cosa che decide la serata di lunedì.

## 2. Sezione 2 — due domande nuove (A.280 e A.281)

**A.280 — Dove sta il centro del settore di 120° della M606 dello Scout?** (17/11/2026). *In parole semplici:* il Manuale dei
Veicoli 0.19 e il tuo raccordo dell'11 novembre dicono che la postazione dello Scout (arma e schermo insieme) ruota in un settore
orizzontale di **120°**, limitato dagli ostacoli reali. Non dicono **centrato dove**: davanti al mezzo, di lato, dove punta
l'artigliere? Per la Neverlost scrivi «arco frontale 90°» e «arco frontale 180°», per lo Scout non c'è un «frontale». *La domanda:*
i 120° sono centrati sull'avanti del veicolo, o su un'altra direzione? *Nel frattempo:* nella scheda del mezzo la tabella delle
armi di bordo dice «settore di 120° · centro non indicato dal manuale (A.280)» e **non controlla niente** sulla mappa: se un
bersaglio sta dentro o fuori lo giudichi tu.

**A.281 — Le due correzioni +1 al VA di Armi da mischia di Dimitri (2 novembre): erano per il Verde?** (17/11/2026). *In parole
semplici:* nel file di Dimitri ci sono due correzioni del master di **+1 al «VA di Armi da mischia»**, del 2 novembre alle 18:32 e
alle 18:34, senza motivo. Da oggi l'app calcola da sola il bonus del focalizzatore Verde (+1 VA d'attacco, +1 Parata, +1 danno,
dal §7.25): se quelle correzioni erano il modo di darglielo a mano, il +1 del Verde è contato due volte: oggi il VA con la CyberArma è **10** (7 dell’Abilità senza correzioni, +2 le correzioni, +1 il Verde
calcolato); se una delle due era per il Verde, annullandola torna **9**. *La domanda:* erano per il Verde? Se sì, annulla quella (o quelle) in «Modifica master», riga per
riga. *Nel frattempo:* non le abbiamo toccate; valgono per **ogni** arma da mischia, non solo per la CyberArma.

## 3. Sezione 3 — da aggiungere

- **I focalizzatori della CyberArma, applicati** (17/11). Il bonus di ogni colore è nei dati e si calcola dove si calcola il VA,
  con la riga **«Focalizzatore Verde (CyberArma, §7.25) +1»** nel «Calcolo» e nella carta dell'arma. Dal manuale: **Bianco +3 al
  danno** (e ×2 al danno complessivo contro l'Oscura Simmetria, come condizione, non come numero); **Verde +1 VA d'attacco, +1
  Parata, +1 danno**; **Rosso** (Plasma), **Blu** (Elettricità) e **Viola** (Corruzione) **non hanno un numero nel manuale**: l'app
  lo dice e non ne inventa uno; Plasma e Elettricità sono effetti sul bersaglio e li applichi tu. Il **Custode** non riceve il
  bonus dall'app, perché la sua tabella per Grado ce l'ha già dentro. **Per Dimitri**, dopo il comando che sistema la sua voce
  (prova «La CyberArma di Dimitri» in sezione 8): VA con la CyberArma **9 → 10**, Parata con l'arma **8 → 9**, danno **1d8+1 → 1d8+2**.
  Per gli altri sei non cambia niente: nessuno ha una CyberArma.
- **Rosso e Blu: le proprietà del danno** (Plasma, Elettricità del §5.24) sono un lavoro a parte: l'app non le applica ancora al
  bersaglio. *Nel frattempo* le dici tu al tavolo, e la carta dell'arma lo scrive.
- **I settori di tiro delle armi di bordo** (17/11). Applicati i **120° della M606 dello Scout** (sostituiscono i 360° della scheda
  0.6) e strutturati tutti i settori dei manuali: torrette della Neverlost 360°, cannone arco frontale 90°, lanciamissili arco
  frontale 180°. Nella tabella delle armi di bordo c'è la colonna «Arco di tiro». **La mappa non sa niente di settori di tiro** e
  farglielo valere è un lavoro più grande di una riga (un'arma di bordo che spara da una pedina, e il centro del settore: A.280).
  *Nel frattempo* è un dato che si legge, non un controllo.
- **Cosa cambia per Pablo (FIAT LUX) in uno scontro vero:** l'app ora dice che il settore della M606 è di 120° e non di 360°,
  che l'arma e la protezione bassa sono smontabili e che lo schermo concede Copertura solo nelle direzioni in cui scherma, senza
  aumentare l'AR. Se l'artigliere spara a un bersaglio fuori dal settore, **l'app non obietta**: la decisione è tua.
- **Il testo del progetto «Paradise»** descrive ora l'arma vera: il Verde è già installato; i giorni 1 e 2 sono già compresi nella
  configurazione attuale; resta il giorno 3 (modulo SIN, forma, collaudo). I numeri non sono cambiati.
- **Gli strumenti da riga di comando non rovinano più i metadati di un personaggio.** Cinque strumenti riscrivevano il file di un
  personaggio senza far salire il numero di versione di salvataggio (uno li perdeva del tutto): un tablet che salvava partendo da un
  file superato passava senza il conflitto dovuto. Ora passano tutti da un punto solo. Conseguenza: **l'annullamento
  dell'adeguamento riporta tutto com'era tranne il numero di versione e l'ora**, che salgono sempre (prima si diceva «identico byte
  per byte»).

## 4. Sezione 5 — Manuali che l'app aspetta, da correggere

- **Il controllo di inizio sessione dice ora se su Drive c'è un'istantanea più recente di quella che abbiamo.** La nuova (15
  novembre, 18:45) è arrivata: è in `istantanee/`, in sola lettura. Dal 15/11 18:45 il riferimento rotto di **Pablo non c'è più**
  (resta quello di **Lucas**): nella sezione 4 del Doc, la voce «Pablo e Lucas non riescono ad aprire il mezzo» va corretta: **solo
  Lucas**. Nelle tue due scene non ci sono pedine appese.

## 5. Sezione 8 — Prove da fare

Aggiungere, dopo «La CyberArma di Dimitri» (lotto 209):

> ### Il bonus del focalizzatore
>
> Dopo aver sistemato la voce di Dimitri (prova precedente): scheda di **Dimitri** → tab **Combattimento** → la CyberArma. Deve dire
> **VA 10** (con «+1 rispetto al valore da regole 9»), **Parata 9**, **danno 1d8+2**, e sotto la riga **«Focalizzatore Verde: VA +1 ·
> Parata +1 · danno +1»**. Apri **«Attacca!»** → **«Calcolo»**: fra le righe c'è «Focalizzatore Verde (CyberArma, §7.25) +1». Se il suo VA
> ti sembra troppo alto di uno, è la **A.281** (le due correzioni del 2 novembre): guarda in «Modifica master» → Identità → registro.

> ### Il settore della M606
>
> Scheda di **Pablo** → tab **Veicoli** → il FIAT LUX → tabella «Arma di bordo»: l'ultima colonna, **«Arco di tiro»**, deve dire «settore
> di 120° · centro non indicato dal manuale (A.280)». Passandoci sopra col mouse si legge che l'arma e lo schermo sono smontabili e che la
> protezione non aumenta l'AR.

---

## 6. Per Marcello (non per Davide)

- `mutant-stato_2026-11-15_1845.zip` è in `istantanee/` (zip e cartella aperta, sola lettura). Il controllo di inizio sessione ora
  la vede e, quando su Drive ce ne sarà una più nuova, lo dice con una riga e codice di uscita 3.
