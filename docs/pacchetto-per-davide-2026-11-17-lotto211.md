# Pacchetto per il Doc «per-davide.md» — 17/11/2026, lotto 211

Da applicare al Google Doc da Cowork o da Marcello. Claude Code non scrive nei Doc di Davide.
Il Doc su Drive è sempre quello del lotto 208 (modificato il 16/11 alle 17:45 UTC); nessuna risposta nuova di Davide in sezione 7.
Questo pacchetto **si somma** a quelli dei lotti 209 e 210.

---

## 1. Sezione 1 — invariata

La scelta della strada per il livello 8 è ancora l'unica cosa che decide la serata.

## 2. Sezione 2 — due domande nuove (A.282 e A.283)

**A.282 — Che cosa fa diventare «Esausto neutro» un cristallo?** (17/11/2026). *In parole semplici:* la Magia 1.19 distingue un cristallo
**scarico** (0 PM, tiene colore e capacità) da un **Esausto neutro** (ha perso per sempre la capacità, non si ricarica, è materia prima).
Dice che l'uso ordinario non basta e che la frattura da sola neanche, ma non dice **cosa** lo fa diventare Esausto. *La domanda:* lo decidi tu
al tavolo, o c'è una regola? *Nel frattempo:* l'app chiama «scarico» un cristallo a 0 PM (prima «Trasparente») e non rende mai Esausto nessun
contenitore da sola.

**A.283 — Armatura Mistica a 0 PI dell'armatura: l'app deve calcolarlo?** (17/11/2026). *In parole semplici:* la scheda 22.2 dice che
l'incantesimo converte in Magica l'AR dell'armatura indossata, aggiunge il bonus una volta sola all'AR complessiva e che «a 0 PI la protezione
dipendente dall'equipaggiamento inutilizzabile non fornisce AR». Oggi l'app dà il bonus per tutta la durata, comunque sia l'armatura. Nessuno dei sette
ha Armatura Mistica. *La domanda:* basta il promemoria, o vuoi che il bonus si azzeri da solo a 0 PI? *Nel frattempo:* nessun calcolo.

## 3. Sezione 3 — da aggiungere

- **La Magia 1.19 è applicata alle 90 schede d'incantesimo** (17/11). **Per i sette non cambia niente**: nessun costo in PM, nessuna gittata, nessun numero di bersagli,
  nessuna durata, nessuna difficoltà di Prova di nessuna delle 623 righe delle tabelle. Cambiano **dieci testi** (sei per il Morente: Corpo Adattivo, Psicometabolismo, Cura Ferite, Cura Spirituale,
  Guarigione, Batteria Mistica; quattro che erano già indietro: Colpo Elementale, Presenza, Armatura Mistica, Negare Potere). **Lucas** (17 incantesimi) e **Dimitri** (18) hanno
  tutti i loro incantesimi con gli stessi costi; di nuovo c'è solo il testo di Guarigione, con la modalità d'emergenza (3 PM, 1 AP) che l'app aveva già dal lotto 193.
- **Un cristallo a 0 PM si chiama ora «scarico»**, come nella 1.19 §6 (la 1.11 lo diceva «Trasparente, ancora ricaricabile»). Cambia la parola nella scheda; nessun numero.
- **La 1.19 non contraddice niente di quello che avevamo applicato dalla 1.17**: prezzi di vendita (§24.3), Anello Grado IV / Molto Rara / SnT 4, CyberArma Rara / Grado III / SnT 3, Batterie, Guanti (13.800 cr), Pietra della Vigilanza (12.600 cr). Le pagine sono identiche.
- **Cariche Mistiche e frazioni: la 1.19 dice la stessa cosa della A.252**: una attivazione costa 1 CM intera o 1 carica intera, «non esistono consumi frazionari»; la ricarica è CM mancanti × 2 × conversione.
- **Non applicato, lotto a sé:** le **Pietre di Luna** (§26.8) e i **manufatti lunari dei Mutanti** (§28.5: Collana di papiro, Pugnale e Spada lunare d'osso, Spada dei Tre Riflessi — insieme con
  Armamenti §7.27 ed Equipaggiamento §10.14) e i **costi di creazione nuovi** dei §§24.4–24.7 (supporto 100 cr, corredo 1.200 cr, dotazione rituale 300 cr, Chroma grezzo 200/800 cr per PM): la procedura di creazione non è nel motore.

## 4. Sezione 5 — Manuali che l'app aspetta

- **Magia 1.19: recepita.** Il registro non ha più la 1.19 «in attesa». Le schede degli incantesimi sono tutte alla 1.19; `regole.json` (Poteri, Chroma, Cariche Mistiche) resta alla 1.11 perché nessun suo numero cambia. La pagina iniziale dice entrambe le cose.
- **Giocatore 0.64:** su Drive è la 0.64 (modificata il 15/11 alle 13:19 UTC), l'app è alla 0.63. **Non l'abbiamo ancora letta**: diff e recepimento in un lotto a sé.

## 5. Sezione 8 — Prove da fare

Aggiungere:

> ### Le schede degli incantesimi alla Magia 1.19
>
> Scheda di **Lucas** → tab **Poteri** → «Lancia!» su **Guarigione**: a livello 3 costa 3 PM e non chiede la Prova; tocca l'icona (i) di Guarigione: nella scheda deve esserci la sezione **«Stabilizzazione d'emergenza»** (3 PM, 1 AP, Contatto).
> «Lancia!» su **Colpo Elementale**, livello 3, Anticipazione **Colpi**: 5 PM (3 + 3, −1 Specializzazione in Elementi) e la Prova di Potere **18**; tocca il 18: il «Calcolo» elenca da dove viene ogni numero.
> Poi **Medita**: +8 PM all'ora. In nessuna scheda di incantesimo deve comparire il segno «⚑ Non tutta la scheda viene dalla Magia 1.19» (compare solo se un campo resta indietro).

> ### Un cristallo a 0 PM
>
> Nel riquadro Punti Magia, porta a 0 la riserva di un cristallo (per esempio i Guanti di Lucas, tasto −1 sei volte): la riga deve dire **«Scarico (colore Rosso)»**, non «Trasparente».

---

## 6. Per Marcello (non per Davide)

- Prove banali da fare: l'elenco è in «Da provare» del riepilogo. Il lettore delle schede è `node tools/importa-incantesimi.mjs` (sola lettura: confronta il manuale corrente con `data/incantesimi.json`); `--file=<testo.md>` lo prova su un'altra edizione.
