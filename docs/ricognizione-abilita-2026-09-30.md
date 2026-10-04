# Ricognizione: categorie di competenza e limiti del VA personale (Giocatore del 29/09, 23:45)

Stato: **applicata il 30/09** (`docs/diff-manuali-2026-09-30.md`). Una differenza rispetto al §4, punto 6: la copia con le scelte vecchie è quella di b (15 punti inattivi, multiclasse), in `tests/collaudo/regole-27-09/`.

Fonte: il Google Doc del Manuale del Giocatore del 29/09/2026 alle 23:45 UTC, salvato in `docs/manuali-txt/giocatore.md`. Il 30/09 il Doc risulta invariato. Le citazioni qui sotto sono testuali.

Metodo:
- I profili delle 25 Classi sono stati estratti dal testo con uno script, non ricopiati a mano. Il risultato è controllato: 2 S, 6 P, 12 G, 4 N; tutte e 24 le Abilità, ognuna una volta sola.
- I VA «dopo» vengono da un prototipo della regola nuova, indipendente dal motore (`tools/prototipo_competenze.mjs`), confrontato con il motore attuale per il «prima».

## 1. La regola nuova, dal testo

### 1.1 Composizione del VA (§1.2.1, §4.2)

> **VA grezzo personale = Modificatore della Caratteristica + Base iniziale + bonus di Corporazione + Avanzamento. Il VA personale è il minore tra questa somma e il limite della categoria di competenza al Grado posseduto (§8.3). Il VA finale della Prova si ottiene applicando successivamente i bonus e le penalità pertinenti.** (§1.2.1)

> Solo dopo aggiungi i bonus e sottrai le penalità pertinenti alla Prova, ottenendo il VA finale. […] I bonus alla Prova di Equipaggiamento, Talenti, manovre e circostanze si applicano dopo il limite, secondo le rispettive condizioni di utilizzo. (§4.2)

> I punti automatici di Classe e gli aumenti di Caratteristica restano conteggiati nella somma grezza anche oltre il limite: la parte eccedente diventa efficace quando il limite sale. Non si spendono punti liberi che rimarrebbero inattivi. (§4.2)

**Scelta per il motore (verificata sul testo).** Il limite non riguarda l'Avanzamento: riguarda la somma personale (Mod + Base + Corp + Avanzamento). Lo dice il §8.3: «Il limite riguarda la somma Modificatore + Base iniziale + Corporazione + Avanzamento e sostituisce il precedente tetto uniforme ai punti di Avanzamento».

Nell'app:
- `totale` diventa il **VA personale**, cioè min(grezzo, limite);
- equipaggiamento, Specializzazioni, condizioni della sessione, manovre e circostanze si sommano **sopra** il VA personale e possono superare il limite, come dice il §1.2.1: «Bonus e penalità alla Prova si applicano dopo questi limiti e possono portarli oltre la soglia»;
- nessun VA in rosso;
- quando il grezzo supera il limite, la SD mostra il segno ⚑ e il tooltip dice di quanto.

### 1.2 Le quattro categorie di competenza (§2.3, §2.12)

> La prima Classe determina le basi delle ventiquattro Abilità: 2 Specializzate, 6 Professionali, 12 Generiche e 4 Non competenti. […] Le cinque Abilità di Classe che ricevono +1 a ogni Grado sono un beneficio distinto e restano quelle indicate nel Capitolo 3. (§2.3)

| Categoria | N. | Base | Punti |
|---|---|---|---|
| Specializzate (S) | 2 | 7 | 14 |
| Professionali (P) | 6 | 6 | 36 |
| Generiche (G) | 12 | 5 | 60 |
| Non competenti (N) | 4 | 3 | 12 |
| Totale | 24 | — | 122 |

> I 122 punti base sono assegnati dal profilo della prima Classe e non si distribuiscono liberamente. Restano fissi: acquisire una nuova Classe non riassegna né aumenta le basi iniziali. Le categorie delle Classi successive intervengono soltanto sui limiti del VA personale, secondo il multiclassamento (§8.7). Le sei categorie di consultazione del Capitolo 4 restano distinte […]. (§2.3)

Nell'app la competenza si chiama `competenza` (S/P/G/N), per non confonderla con `categoria`, il gruppo di consultazione (Distanza, Ravvicinato…).

### 1.3 Profili delle 25 Classi (Capitolo 3)

Le Generiche sono le 12 Abilità restanti. In ogni Classe le cinque Abilità di Classe sono 2 Specializzate e 3 Professionali, e coincidono con quelle già in `classi.json`: il §3.4 è invariato.

| Classe | Add. | Specializzate (7) | Professionali (6) | Non competenti (3) | Abilità di Classe (+1 per Grado) |
|---|---|---|---|---|---|
| Agente | Avventuriero | Percezione, Raggirare | Armi leggere, Cultura, Furtività, Oratoria, Difese, Tecnologia | Armi pesanti, Armi da guerra, Potere, Rituali | Armi leggere (P), Cultura (P), Furtività (P), Percezione (S), Raggirare (S) |
| Cacciatore | Avventuriero | Armi medie, Percezione | Armi da mischia, Difese, Occultismo, Atletica, Furtività, Sopravvivenza | Armi pesanti, Armi da guerra, Potere, Rituali | Armi medie (S), Armi da mischia (P), Furtività (P), Percezione (S), Sopravvivenza (P) |
| Esploratore | Avventuriero | Percezione, Sopravvivenza | Difese, Atletica, Furtività, Pilotare, Scienza, Tecnologia | Armi pesanti, Armi da guerra, Potere, Rituali | Atletica (P), Furtività (P), Percezione (S), Pilotare (P), Sopravvivenza (S) |
| Lestofante | Avventuriero | Furtività, Raggirare | Armi da mischia, Difese, Atletica, Percezione, Tecnologia, Oratoria | Armi pesanti, Armi da guerra, Potere, Rituali | Armi da mischia (P), Difese (P), Furtività (S), Raggirare (S), Tecnologia (P) |
| Paramedico | Avventuriero | Percezione, Medicina | Difese, Atletica, Pilotare, Sopravvivenza, Scienza, Tecnologia | Armi pesanti, Armi da guerra, Potere, Rituali | Atletica (P), Medicina (S), Percezione (S), Sopravvivenza (P), Tecnologia (P) |
| Artigliere | Combattente | Armi medie, Armi pesanti | Armi leggere, Difese, Atletica, Furtività, Percezione, Tecnologia | Artefatti, Occultismo, Potere, Rituali | Armi leggere (P), Armi medie (S), Armi pesanti (S), Atletica (P), Percezione (P) |
| Assaltatore | Combattente | Armi da mischia, Armi da guerra | Armi leggere, Corpo a corpo, Difese, Atletica, Percezione, Sopravvivenza | Artefatti, Occultismo, Potere, Rituali | Armi leggere (P), Armi da guerra (S), Armi da mischia (S), Atletica (P), Difese (P) |
| Incursore | Combattente | Furtività, Tecnologia | Armi da lancio, Armi leggere, Armi da mischia, Difese, Atletica, Percezione | Artefatti, Occultismo, Potere, Rituali | Armi leggere (P), Armi da mischia (P), Furtività (S), Percezione (P), Tecnologia (S) |
| Lottatore | Combattente | Corpo a corpo, Difese | Armi da mischia, Atletica, Furtività, Percezione, Sopravvivenza, Medicina | Armi medie, Armi pesanti, Artefatti, Rituali | Armi da mischia (P), Atletica (P), Corpo a corpo (S), Difese (S), Percezione (P) |
| Soldato | Combattente | Armi medie, Sopravvivenza | Armi leggere, Difese, Atletica, Percezione, Tecnologia, Oratoria | Artefatti, Occultismo, Potere, Rituali | Armi leggere (P), Armi medie (S), Difese (P), Percezione (P), Sopravvivenza (S) |
| Agricoltore | Lavoratore | Sopravvivenza, Scienza | Atletica, Percezione, Pilotare, Medicina, Tecnologia, Oratoria | Armi pesanti, Armi da guerra, Potere, Rituali | Atletica (P), Medicina (P), Percezione (P), Sopravvivenza (S), Tecnologia (P) |
| Artigiano | Lavoratore | Cultura, Tecnologia | Atletica, Furtività, Percezione, Scienza, Oratoria, Raggirare | Armi pesanti, Armi da guerra, Potere, Rituali | Cultura (S), Percezione (P), Raggirare (P), Scienza (P), Tecnologia (S) |
| Operaio | Lavoratore | Atletica, Tecnologia | Armi da mischia, Difese, Percezione, Pilotare, Sopravvivenza, Scienza | Artefatti, Occultismo, Potere, Rituali | Armi da mischia (P), Atletica (S), Percezione (P), Pilotare (P), Tecnologia (S) |
| Pilota | Lavoratore | Pilotare, Tecnologia | Armi leggere, Percezione, Sopravvivenza, Atletica, Scienza, Difese | Armi da guerra, Occultismo, Potere, Rituali | Armi leggere (P), Percezione (P), Pilotare (S), Sopravvivenza (P), Tecnologia (S) |
| Tecnico | Lavoratore | Scienza, Tecnologia | Atletica, Furtività, Percezione, Pilotare, Cultura, Raggirare | Armi pesanti, Armi da guerra, Potere, Rituali | Percezione (P), Pilotare (P), Raggirare (P), Scienza (S), Tecnologia (S) |
| Accademico | Studioso | Cultura, Scienza | Artefatti, Occultismo, Percezione, Medicina, Tecnologia, Oratoria | Armi medie, Armi pesanti, Armi da guerra, Potere | Cultura (S), Oratoria (P), Percezione (P), Scienza (S), Tecnologia (P) |
| Amministrativo | Studioso | Cultura, Oratoria | Percezione, Pilotare, Scienza, Tecnologia, Intrattenere, Raggirare | Armi pesanti, Armi da guerra, Potere, Rituali | Cultura (S), Oratoria (S), Percezione (P), Raggirare (P), Tecnologia (P) |
| Artista | Studioso | Intrattenere, Oratoria | Atletica, Furtività, Percezione, Cultura, Tecnologia, Raggirare | Armi pesanti, Armi da guerra, Potere, Rituali | Cultura (P), Intrattenere (S), Oratoria (S), Percezione (P), Tecnologia (P) |
| Medico | Studioso | Medicina, Scienza | Occultismo, Percezione, Sopravvivenza, Cultura, Tecnologia, Oratoria | Armi medie, Armi pesanti, Armi da guerra, Potere | Cultura (P), Medicina (S), Percezione (P), Scienza (S), Tecnologia (P) |
| Predicatore | Studioso | Occultismo, Oratoria | Artefatti, Rituali, Percezione, Cultura, Medicina, Intrattenere | Armi medie, Armi pesanti, Armi da guerra, Potere | Cultura (P), Occultismo (S), Oratoria (S), Percezione (P), Rituali (P) |
| Arcanista | Taumaturgo | Potere, Rituali | Armi da lancio, Difese, Artefatti, Occultismo, Percezione, Cultura | Armi medie, Armi pesanti, Armi da guerra, Pilotare | Artefatti (P), Occultismo (P), Percezione (P), Potere (S), Rituali (S) |
| Custode | Taumaturgo | Armi da mischia, Difese | Corpo a corpo, Artefatti, Occultismo, Potere, Atletica, Percezione | Armi medie, Armi pesanti, Pilotare, Scienza | Armi da mischia (S), Atletica (P), Difese (S), Percezione (P), Potere (P) |
| Invocatore | Taumaturgo | Occultismo, Potere | Armi da lancio, Corpo a corpo, Difese, Artefatti, Percezione, Oratoria | Armi medie, Armi pesanti, Armi da guerra, Scienza | Artefatti (P), Occultismo (S), Oratoria (P), Percezione (P), Potere (S) |
| Mistico | Taumaturgo | Potere, Medicina | Difese, Artefatti, Occultismo, Rituali, Percezione, Oratoria | Armi medie, Armi pesanti, Armi da guerra, Tecnologia | Medicina (S), Occultismo (P), Percezione (P), Potere (S), Rituali (P) |
| Tecnomante | Taumaturgo | Artefatti, Tecnologia | Armi leggere, Difese, Potere, Rituali, Percezione, Scienza | Armi da lancio, Armi pesanti, Armi da guerra, Sopravvivenza | Artefatti (S), Potere (P), Rituali (P), Scienza (P), Tecnologia (S) |

*Nota del 04/10/2026:* il profilo dell'Incursore in questa tabella è quello del 29/09. Dal Giocatore del 03/10 sera (§3.7) *Armi da guerra* è Professionale e *Armi da mischia* Generica (`data/classi.json`, `docs/risposte-master.md`, decisione 91).

### 1.4 Limite del VA personale per Grado (§8.3) e nel multiclasse (§8.7)

| Grado | S | P | G | N |
|---|---|---|---|---|
| I | 12 | 9 | 7 | 5 |
| II | 14 | 11 | 9 | 7 |
| III | 16 | 13 | 11 | 9 |
| IV | 18 | 15 | 13 | 11 |
| V | 20 | 17 | 15 | 13 |
| VI | 22 | 19 | 17 | 15 |

> Per ciascuna Abilità, G indica il totale dei Gradi in tutte le Classi possedute (massimo 6); gS è la somma dei Gradi soltanto nelle Classi che la classificano Specializzata; gP è la somma dei Gradi soltanto nelle Classi che la classificano Professionale. […] Specializzata = 10 + G + gS; Professionale = 7 + G + gP; Generica = 5 + 2 × G; Non competente = 3 + 2 × G. Usa il limite più alto fra quelli disponibili. Non sommare i limiti e non unire gS e gP. Acquisire una Classe non abbassa mai il limite già posseduto e non cambia la Base iniziale. (§8.7)

- **Verifica:** con una sola Classe al Grado g le formule danno 10 + 2g, 7 + 2g, 5 + 2g e 3 + 2g, cioè esattamente la tabella. Lo dice anche il testo: «le formule restituiscono esattamente la tabella del §8.3».
- **Dati:** in `regole.json` vanno le formule, non la tabella. Un test controlla che le formule rigenerino la tabella; il validatore controlla la forma.
- **Esempi del §8.7, da usare come test:**
  - Pilota I + Agente I, G = 2: Pilotare S 13, Tecnologia S 13;
  - Pilota V + Agente I, G = 6: Cultura G 17.

### 1.5 Addestramento e Corporazione: che cosa resta (§2.2, §1.2.3, §8.7)

> L’Addestramento concede il vantaggio indicato al paragrafo 2.10, i bonus alle Salvezze del paragrafo 2.11 e l’accesso alle proprie Classi come prima scelta. Le basi delle ventiquattro Abilità dipendono invece dalla prima Classe […]. (§2.2)

**All'Addestramento restano:** il vantaggio (§2.10, invariato), i bonus alle Salvezze (§2.11, invariati) e la scelta della prima Classe fra le sue cinque. **Non dà più basi alle Abilità**, quindi `valori_base` esce da `addestramenti.json` e lo schema 76 / 8×4 / 12×3 / 4×2 esce da `regole.json`.

**Alla Corporazione restano** le Caratteristiche, il +1 a quattro Abilità e i bonus alle Salvezze. Il §2.9 corrisponde ai dati, compreso il Mishima su Armi da guerra, applicato il 30/09.
> Corporazione | 0–1 | Bonus fisso della Corporazione alla specifica Abilità, incluso nel VA personale. (§1.2.1)

Il +1 di Corporazione sta **sotto** il limite (vedi A.58).

## 2. Creazione, avanzamento, Specializzazioni

### 2.1 Creazione (§2.0, §2.12, §2.13, §2.17)

- **Ordine dei passi: invariato** (§2.0): Corporazione, Caratteristiche, Addestramento, prima Classe, 10 Punti Abilità Liberi, derivati, Punti Eroe, equipaggiamento, controllo.
- **Punti liberi: restano 10** (A.52, decisione 33: confermato). Il **limite 3** di Avanzamento iniziale **non vale più**:
  > Puoi assegnare più punti alla stessa Abilità soltanto quando ogni punto aumenta effettivamente il VA personale, senza superare il limite della sua categoria al I Grado: S 12, P 9, G 7, N 5. Il limite comprende Modificatore, Base iniziale, Corporazione e Avanzamento. Non si possono accantonare punti liberi inattivi oltre il limite. (§2.13)

  Il §8.3 lo conferma: «sostituisce il precedente tetto uniforme […] Non si sommano i due sistemi». Resta invece «L’Abilità deve avere VA almeno 1 prima dell’assegnazione dei punti liberi» (§2.13). Con la base minima 3 e il modificatore minimo −1 alla creazione non scatta mai, ma la regola resta nei dati.
- **Ordine dentro l'evento** (§3.1): «Si registrano prima i punti automatici di Classe e poi si assegnano i punti liberi». Un punto libero è valido se il grezzo, **dopo** i +1 di Classe e prima del punto stesso, è minore del limite.
- **Il +1 di Classe oltre il limite.** Oggi l'app lo scarta (`stato.persi`). Con la regola nuova si registra sempre:
  > I punti automatici oltre il limite restano registrati e possono diventare efficaci quando il limite aumenta (§3.1)

### 2.2 Avanzamento (§8.1, §8.3, §8.7)

- Ogni Grado, anche di una Classe nuova, dà +1 alle cinque Abilità di quella Classe, sempre registrato, e ricalcola i limiti con le formule del §8.7.
- Una Classe nuova **non** cambia le basi, che restano della prima Classe. Può alzare i limiti: si usa la categoria migliore fra le Classi possedute.
- I punti liberi dei livelli 4, 8, 12, 16 e 20 seguono la stessa regola della creazione, con il limite di quel livello. Un livello senza Grado non cambia i limiti.
- Gli aumenti di Caratteristica ai livelli 2, 6, 10, 14 e 18 possono portare il grezzo oltre il limite. È ammesso: la parte eccedente torna efficace quando il limite sale (esempio del §8.4, verificato riga per riga).
- La tabella «Avanzamento massimo per livello» (3/4/5/6/7/8) **sparisce**.
- **Annullare l'ultimo livello** non cambia: il ricalcolo parte sempre dalle scelte.

### 2.3 Specializzazioni (§8.8)

> Le Specializzazioni ordinarie concedono +2 VA alla Prova di Abilità pertinente. (§8.8)

Sono bonus alla Prova, quindi stanno sopra il limite (§4.2). Nell'app le Specializzazioni nelle Abilità non entrano nel VA (restano promemoria situazionali), mentre quelle nelle armi (+1 VA, +1 danno) entrano nel VA dell'arma, che parte dal VA personale. Non serve cambiare nulla.

### 2.4 Altri effetti indiretti

- **Assistenza (§1.10):** il bonus dell'aiutante dipende dal suo VA (1–8 +1, 9–14 +2, 15–19 +3, 20+ +4). Con le basi più alte gli aiuti crescono. L'app non lo calcola.
- **2 naturale Magistrale con VA finale ≥ 21 (§1.6):** è già nell'app. Con i limiti fino a 22 diventa raggiungibile senza bonus esterni.

## 3. Prima → dopo

**Prima:** il motore di oggi, con le basi dell'Addestramento (76 punti) e il limite 3/4/5…

**Dopo:** la regola nuova, con il VA personale (grezzo limitato). I punti liberi diventati inattivi sono **esclusi** finché non si riassegnano (vedi §4).

Legenda: la lettera è la competenza nella **prima** Classe; ⚑ indica che il grezzo supera il limite (punti di Classe o aumenti di Caratteristica in attesa del limite).

Personaggi:
- **Agente (fixture)** è il `MISHIMA_AGENTE` dei test, con i punti del vecchio §2.13.
- **Agente (§2.13 nuovo)** è lo stesso personaggio con i punti del nuovo esempio del manuale: Percezione 2, Tecnologia 2, Cultura 2, Raggirare 4. Il prototipo ritrova tutti i numeri del testo: Percezione 12, Raggirare 12, Tecnologia 8, Cultura 9, Furtività e Armi leggere 9, Medicina 7.

| Abilità | Agente (fixture) | Agente (§2.13 nuovo) | a Assaltatore 8° | b Arcanista/Mistico 12° | c Tecnico 5° |
|---|---|---|---|---|---|
| Armi da lancio | 5 → **7** G | 5 → **7** G | 6 → **8** G | 3 → **6** P | 6 → **8** G |
| Armi leggere | 8 → **9** P | 7 → **9** P | 12 → **13** P | 3 → **5** G | 11 → **9** G |
| Armi medie | 3 → **5** G | 3 → **5** G | 9 → **9** G | 6 → **7** N | 6 → **8** G |
| Armi pesanti | 3 → **4** N | 3 → **4** N | 9 → **9** G | 2 → **3** N | 3 → **3** N |
| Armi da guerra | 5 → **5** N | 5 → **5** N | 13 → **15** S | 2 → **3** N | 2 → **3** N |
| Armi da mischia | 5 → **7** G | 5 → **7** G | 12 → **15** S | 3 → **5** G | 7 → **8** G |
| Corpo a corpo | 5 → **7** G | 5 → **7** G | 7 → **9** P | 3 → **5** G | 3 → **5** G |
| Difese | 6 → **8** P | 6 → **8** P | 12 → **12** P | 3 → **6** P | 6 → **8** G |
| Artefatti | 5 → **7** G | 5 → **7** G | 5 → **5** N | 15 → **15** P | 4 → **6** G |
| Occultismo | 3 → **6** G | 3 → **6** G | 1 → **2** N | 15 → **15** P | 5 → **8** G |
| Potere | 4 → **5** N | 4 → **5** N | 4 → **5** N | 15 → **18** S | 3 → **4** N |
| Rituali | 2 → **3** N | 2 → **3** N | 1 → **2** N | 14 → **16** S | 5 → **6** N |
| Atletica | 6 → **7** G | 6 → **7** G | 13 → **13** P | 2 → **5** G | 5 → **7** P |
| Furtività | 9 → **9** P | 7 → **9** P | 7 → **9** G | 3 → **5** G | 7 → **10** P |
| Percezione | 9 → **12** S | 9 → **12** S | 9 → **12** P | 16 → **15** P ⚑ | 8 → **10** P |
| Sopravvivenza | 6 → **7** G | 6 → **7** G | 8 → **11** P | 8 → **10** G | 9 → **9** G |
| Cultura | 5 → **8** P | 6 → **9** P | 3 → **5** G | 8 → **10** P | 4 → **7** P |
| Intrattenere | 3 → **5** G | 3 → **5** G | 3 → **5** G | 8 → **10** G | 4 → **6** G |
| Oratoria | 3 → **6** P | 3 → **6** P | 3 → **5** G | 12 → **11** G | 4 → **6** G |
| Raggirare | 6 → **9** S | 9 → **12** S | 3 → **5** G | 4 → **6** G | 9 → **10** P |
| Medicina | 8 → **7** G | 5 → **7** G | 7 → **9** G | 14 → **16** G | 9 → **9** G |
| Pilotare | 4 → **5** G | 4 → **5** G | 4 → **6** G | 7 → **7** N | 11 → **11** P ⚑ |
| Scienza | 3 → **5** G | 3 → **5** G | 1 → **4** G | 14 → **12** G | 10 → **14** S |
| Tecnologia | 3 → **6** P | 5 → **8** P | 4 → **6** G | 13 → **12** G | 11 → **14** S |

**Che cosa si vede:**
- Le Specializzate e le Professionali salgono di 2–3 punti.
- Chi aveva investito in un'Abilità che per la sua prima Classe è Generica o Non competente scende. Gli esempi: Medicina dell'Agente 8 → 7; Armi leggere del Tecnico 11 → 9; Scienza e Tecnologia di b 14 → 12 e 13 → 12.
- Il multiclasse b ha Percezione 16 → 15 con ⚑. Arcanista e Mistico danno entrambe il +1 a Percezione, ma il limite P a G = 4 è 7 + 4 + 4 = 15.
- PV, PM, Salvezze e Iniziativa non cambiano.

## 4. Punti liberi già spesi che la regola nuova rende inattivi

Tutti i personaggi salvati con le regole del 27–29/09 hanno punti che oggi non aumenterebbero il VA personale.

**Risultato per i personaggi di prova:**

- **Mishima Agente (fixture dei test, §2.13 vecchio)** (Agente 1): 1° livello Furtività 2 su 2 (VA grezzo prima 9, limite 9); 1° livello Medicina 3 su 3 (VA grezzo prima 7, limite 7); 1° livello Armi leggere 1 su 1 (VA grezzo prima 9, limite 9) — totale 6 punti.
- **a_imperiale_assaltatore_l8** (Assaltatore 3): 1° livello Armi da guerra 1 su 2 (VA grezzo prima 11, limite 12); 1° livello Difese 2 su 2 (VA grezzo prima 9, limite 9); 1° livello Atletica 1 su 1 (VA grezzo prima 10, limite 9); 1° livello Armi medie 1 su 3 (VA grezzo prima 5, limite 7); 4° livello Armi leggere 1 su 2 (VA grezzo prima 10, limite 11); 4° livello Armi pesanti 1 su 2 (VA grezzo prima 8, limite 9); 8° livello Atletica 1 su 1 (VA grezzo prima 13, limite 13) — totale 8 punti.
- **b_fratellanza_arcanista_l12** (Arcanista 2, Mistico 2): 1° livello Occultismo 2 su 2 (VA grezzo prima 10, limite 9); 1° livello Artefatti 1 su 1 (VA grezzo prima 9, limite 9); 1° livello Oratoria 2 su 2 (VA grezzo prima 7, limite 7); 1° livello Scienza 2 su 2 (VA grezzo prima 7, limite 7); 1° livello Tecnologia 1 su 1 (VA grezzo prima 7, limite 7); 4° livello Rituali 1 su 2 (VA grezzo prima 12, limite 13); 4° livello Percezione 1 su 1 (VA grezzo prima 12, limite 11); 4° livello Scienza 1 su 2 (VA grezzo prima 8, limite 9); 4° livello Tecnologia 1 su 2 (VA grezzo prima 8, limite 9); 8° livello Percezione 1 su 1 (VA grezzo prima 14, limite 13); 8° livello Tecnologia 1 su 2 (VA grezzo prima 10, limite 11); 12° livello Artefatti 1 su 1 (VA grezzo prima 15, limite 15) — totale 15 punti.
- **c_freelance_tecnico_l5** (Tecnico 2): 1° livello Armi leggere 2 su 2 (VA grezzo prima 8, limite 7); 1° livello Raggirare 2 su 2 (VA grezzo prima 9, limite 9); 1° livello Medicina 1 su 2 (VA grezzo prima 6, limite 7); 1° livello Sopravvivenza 1 su 1 (VA grezzo prima 7, limite 7); 4° livello Armi leggere 1 su 1 (VA grezzo prima 9, limite 9); 4° livello Pilotare 1 su 1 (VA grezzo prima 12, limite 11) — totale 8 punti.

**Scelte per l'app (ipotesi di A.57):**

1. **Nessuna scelta si perde né si cambia da sola.** Il file salvato resta com'è finché il giocatore non riassegna.
2. **Cosa conta nel calcolo:** a ogni evento (creazione, livelli 4, 8, 12…) il motore conta come efficaci solo i punti che aumentano il VA personale in quel momento. I punti inattivi restano fuori dalla somma, altrimenti diventerebbero efficaci da soli quando il limite sale, e il §8.3 lo vieta («non possono essere accantonati»).
3. **L'avviso «Regole aggiornate»** in cima alla SD dice «N Punti Abilità da riassegnare», con l'evento e le Abilità. «Riassegna» apre il pannello già usato per A.52: si lavora un evento alla volta, dal più vecchio. I punti inattivi di quell'evento tornano disponibili e si spendono di nuovo con i limiti di quel momento; la conferma scrive i punti nuovi nell'evento.
4. **Blocchi:** finché ci sono punti da riassegnare, «Sali di livello» è bloccato, come per i punti mancanti di A.52. Una riassegnazione che renderebbe inattivi punti di eventi successivi è rifiutata con il motivo.
5. **Formato del file:** resta il 7. La struttura delle scelte non cambia (`creazione.puntiAbilitaLiberi`, `livelli[].puntiAbilita`), quindi non serve una migrazione del formato. La «migrazione» è il ricalcolo, più la riassegnazione guidata.
6. **I tre personaggi di collaudo** vanno riassegnati una volta, come farebbe un giocatore, perché restino personaggi di riferimento validi. Una copia di a con le scelte vecchie diventa il test «personaggio salvato con le regole vecchie».

## 5. Che cosa cambia nell'app

| Parte | Cambiamento |
|---|---|
| `data/classi.json` | `competenze: { S: [2], P: [6], G: [12], N: [4] }` per le 25 Classi, dal Capitolo 3; `versione_manuale` e fonte aggiornati |
| `data/regole.json` | `competenze`: base, numero e formula del limite per categoria (fisso, per Grado totale, per Grado nella categoria), 122 punti. Tolti `addestramento` (76 e schema), `creazione.avanzamento_massimo_iniziale` e `avanzamento.avanzamento_massimo_abilita` |
| `data/addestramenti.json` | tolto `valori_base`: restano identità, vantaggio, Salvezze e fonte |
| `src/validate.js` | ogni Classe copre le 24 Abilità una volta sola, con i numeri per categoria presi da `regole.json`; le formule del limite sono numeri; niente più controllo dei 76 punti |
| Motore (`calc.js`, `avanzamento.js`) | base dalla prima Classe; limite per Abilità (§8.7); VA personale = min(grezzo, limite); +1 di Classe sempre registrato; punti liberi validi solo se aumentano il VA personale; punti inattivi esclusi e segnalati come «da riassegnare»; `stato.persi` eliminato |
| Provenienza (`src/provenienza.js`) | riga «Competenza P (Agente)» con la base al posto di «Addestramento … valore base»; riga del limite quando il grezzo lo supera |
| Wizard | passo Addestramento senza la tabella delle basi; passo Classe con le quattro categorie; passo Abilità con il limite I per Abilità e il testo nuovo |
| Sali di livello | limite per Abilità dopo il Grado scelto, al posto dell'Avanzamento massimo del livello |
| Completamento (`completa.js`) | anche per la riassegnazione dei punti inattivi |
| SD e SS | colonna «Base» con la competenza (es. «6 P»); nota del limite al posto di «Avanzamento massimo»; valori già limitati; layout invariato |
| Controllo §2.17 (`checklist.js`) | testo nuovo |
| Test | fixture `MISHIMA_AGENTE` con i punti del nuovo §2.13; VA dei test adattati; test nuovi (esempio del manuale, §8.4, multiclasse del §8.7, personaggio con le regole vecchie, validatore sulle 25 Classi) |
| `CLAUDE.md` | principio 2 (il validatore) e principio 5 (Furtività 9, ora 2 + 6 + 0 + 1) |

## 6. Contraddizioni e domande per Davide

**A.56 — La riforma supera la decisione 33 (A.52)?**
- Il 28/09 Davide ha confermato gli Addestramenti a 76 punti con basi 2–4 e i 10 Punti Abilità Liberi con il limite 3 (decisione 33).
- Il Doc del 29/09 alle 23:45 toglie le basi all'Addestramento, le dà alla prima Classe (7/6/5/3, 122 punti) e sostituisce il limite 3 con i limiti per categoria.
- La nostra regola dice che, in caso di conflitto fra manuale e risposte approvate, vale la risposta.

*Nel frattempo:* vale il manuale del 29/09, che è più recente. Dei 76 punti resta solo la conferma dei 10 punti liberi.

**A.57 — Personaggi già creati: i punti liberi diventati inattivi.**
- Con le regole nuove, ogni personaggio già creato ha punti che non aumentano più il VA personale: 6 punti per l'Agente dei test, 8 per a e per c, 15 per b.
- Si riassegnano (evento per evento, con i limiti di quel momento), oppure restano dove sono, inattivi, e tornano efficaci quando il limite sale?

*Nel frattempo:* si riassegnano dall'avviso in cima alla scheda. Finché non si riassegnano non contano, e «Sali di livello» è bloccato.

**A.58 — Il +1 di Corporazione può essere annullato dal limite.**
- Il §1.2.1 mette il bonus di Corporazione dentro il VA personale.
- Un'Abilità Non competente con Caratteristica 7 e bonus di Corporazione arriva a 2 + 3 + 1 = 6 contro il limite 5 del I Grado: il +1 della Corporazione non conta finché il limite non sale.
- Capita anche con le Generiche (limite 7) e Caratteristica 7: 2 + 5 + 1 = 8.

È voluto?

*Nel frattempo:* sì, come dice il testo. Il +1 resta nel grezzo e diventa efficace quando il limite sale.

Senza domanda, perché il testo è chiaro:
- il limite vale per il VA personale, non per l'Avanzamento;
- i +1 di Classe oltre il limite restano registrati;
- una Classe nuova non cambia le basi;
- le Specializzazioni stanno sopra il limite.

## 7. Rischi e controlli

- **Rischio: `totale` cambia significato** (da somma a VA personale). Chi lo usa lo prende come VA senza equipaggiamento: armi, «Attacca!», «Lancia!», stampa, provenienza. È il valore giusto. `vaPrimaDeiLiberi` e i controlli dei punti devono usare il grezzo.
  Controllo: test sui VA delle armi e sul Potere di «Lancia!».
- **Rischio: il completamento (A.52) riusa la stessa tabella.** Il limite da unico diventa per Abilità.
  Controllo: test del pannello su un evento vecchio.
- **Rischio: i test esistenti usano i VA vecchi in molti punti.** Si adattano ai valori nuovi, spiegando nel commento da dove vengono; nessuno si cancella.
- **Rischio: i PDF di collaudo cambiano.**
  Controllo: si rigenerano dopo la riassegnazione.
- **Rischio: `tools/prototipo_competenze.mjs` è un doppione della regola.** Resta come strumento della ricognizione; i test del motore non lo usano.
