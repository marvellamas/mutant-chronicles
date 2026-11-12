# Lotto 190 — ricognizione dei manuali riscritti l'11 e il 12/11/2026

12/11/2026. Nessuna modifica al codice, ai dati o ai PG: questo documento e il `LEGGIMI` della cartella
`docs/manuali-nuovi-2026-11-12/` sono l'unico esito scritto. Su Drive solo letture.

Davide ha pubblicato sette manuali nuovi in due giorni. Il protocollo del lotto 188 ha tenuto, con **un'eccezione
dichiarata qui sotto**; il salto è grosso e il pezzo più pesante tocca tutte e sette le schede dei PG.

---

## 0. Che cosa stampa la ricognizione, e che cosa dice Drive

`node tools/ricognizione-manuali.mjs` sul repo:

```
Manuale                              disco   prima pagina
Manuale del Giocatore                0.54    0.54
Manuale della Magia                  1.11    1.11
Manuale degli Armamenti              0.74    0.74
Manuale dell’Equipaggiamento         0.30    0.30
Manuale dei Veicoli                  0.10    0.10
Manuale dei Mostri                   0.47    0.47
Manuale del Direttore                0.46    0.46
Talenti, Specializzazioni e Maestrie 1.1     1.1
Revisione NEC — registro unico       2.11    2.11
Energia — riepilogo per l’app        1.0     1.0
ASA Scout MK4 — scheda               0.6     0.6
Neverlost — scheda tecnologica       1.6     —
Scudo Punisher Wächter               1.2     —
Guanti mistici di Lucas — scheda     1.0     —
CyberArma Opzioni per Dimitri        1.0     —
per-davide.md (domande a Davide)     —       —
E&L — Risposte e correzioni approvate —       —

Repo in ordine. Per il confronto con Drive: --drive=<elenco.json>.
```

Il repo è coerente con sé stesso: dice che cosa abbiamo recepito, non che cosa c'è su Drive. Il confronto con Drive
l'ho fatto leggendo la cartella di lavoro (`1p4jh2tKIN9kRimD4ifzth_YjWUZTH6-6`, 27 voci, una sola pagina).

**La tabella di Marcello è esatta su tutti e sette i numeri.** In più:

| Manuale | Recepita | Su Drive | ID cambiato? | Modificato |
| --- | --- | --- | --- | --- |
| Giocatore | 0.54 | **0.62** | no | 12/11 00:47 |
| Magia | 1.11 | **1.17** | no | 11/11 18:40 |
| Armamenti | 0.74 | **0.83** | no | 11/11 19:59 |
| Equipaggiamento | 0.30 | **0.41** | no | 11/11 18:43 |
| Veicoli | 0.10 | **0.17 nel nome, 0.18 nella prima pagina** | no | 12/11 13:54 |
| Mostri | 0.47 | **0.66** | no | 12/11 12:34 |
| Direttore | 0.46 | **0.49** | no | 12/11 00:50 |

**Il protocollo ha tenuto su sei regole su sette.** Stessi ID (regola 2), numeri che salgono (regola 4), un solo
file per manuale nella cartella di lavoro (regola 1), l'archivio con il solo Mostri 0.23 (regola 5), i Doc di
Davide intatti (regola 7).

**Regola 3 infranta, una volta.** Il Manuale dei Veicoli si chiama *«Manuale dei Veicoli v0.17»* ma la sua prima
pagina dice **EDIZIONE 0.18**. È stato toccato oggi alle 13:54, dopo che Marcello ha scritto il prompt: con ogni
probabilità Davide ha pubblicato la 0.18 senza rinominare il file. Non è grave di per sé — è esattamente il caso
che il controllo del 188 è nato per vedere — ma va detto a Davide, perché la regola serve proprio a non dover
indovinare quale file sia quale. **Finché non lo conferma, il manuale dei Veicoli è il solo dei sette di cui non
sappiamo con certezza il numero.**

---

## A. L'estrazione tiene, con un'aggiunta

### I file grossi sono immagini, e il testo non ne risente

| Manuale | File su Drive | Testo estratto | Immagini | Tempo |
| --- | --- | --- | --- | --- |
| Giocatore 0.62 | 306 KB | 534 KB, 6.299 righe | 0 | immediato |
| Magia 1.17 | 377 KB | 560 KB, 5.870 righe | 0 | immediato |
| **Armamenti 0.83** | **15,5 MB** | 452 KB, 5.776 righe | **8 (762 KB)** | immediato |
| **Equipaggiamento 0.41** | **1,8 MB** | 229 KB, 2.186 righe | **1 (99 KB)** | immediato |
| **Veicoli 0.18** | **4,9 MB** | 102 KB, 1.357 righe | **5 (972 KB)** | immediato |
| Mostri 0.66 (.docx) | 1,0 MB | 2,0 MB, 65.251 righe | — | **0,13 s** |
| Direttore 0.49 (.docx) | 36 KB | 16 KB | — | immediato |

Nessuna estrazione tronca, salta tabelle o impiega minuti. `tools/estrai-docx.mjs` legge il Mostri da 1 MB in
**0,13 secondi**: sui `.docx` non serve toccare niente.

**L'aggiunta che serve** riguarda i Google Doc, non i Word. L'esportazione in Markdown **incolla le immagini nel
testo**, come definizioni in coda: `[image1]: <data:image/png;base64,…>`. Sull'Armamenti sono 762 KB di base64 su
1,2 MB di file — il testo vero è 452 KB. Lasciarle dentro vuol dire un file che per tre quarti non è testo, diff
illeggibili e ricerche che pescano stringhe dentro il base64. Nel lotto che recepirà serve un passaggio che
**tolga le definizioni e conti quante sono, lasciando i richiami `![][imageN]` dove stavano**, così si vede il
posto dell'immagine e si può controllare se portava informazione. Qui l'ho fatto con uno script di prova; va messo
accanto a `tools/estrai-docx.mjs`, perché la stessa regola vale per ogni Doc che Davide illustrerà d'ora in poi.

### Le immagini non portano informazione che il testo non ha

Le ho guardate una per una, dal loro contesto:

- **Armamenti, 8**: cinque sono le tavole dei focalizzatori delle CyberArmi (§7.25.6, «Le prime quattro tavole
  illustrano i focalizzatori di riferimento… la quinta raffigura l'esemplare di Dimitri»), tre illustrano le
  dotazioni storiche ASA del §7.26. Accanto a ciascuna il profilo di gioco è **scritto per esteso**: «Divisa di
  servizio ASA — Armatura leggera · AR 2 · AR magica 0 · FOR 3 · PI 6 · PS Integrità 12 · Qualità Non comune · 3 kg».
- **Veicoli, 5** e **Equipaggiamento, 1**: stessa natura, illustrazioni di mezzi e oggetti già descritti a parole.

**Nessuna tabella fotografata al posto di scritta.** Se un giorno ne comparisse una, il richiamo `![][imageN]`
rimasto nel testo è il segnale per accorgersene.

### I nomi dei file estratti

Seguono la regola 3: versione nel nome, e coincide con la prima riga — per sei manuali su sette. Il Veicoli è
l'eccezione detta sopra: l'ho salvato come `veicoli-0.18.md`, **dal numero della prima pagina, non dal titolo del
file**, perché è la prima pagina che il protocollo fa comandare sul contenuto. Va riallineato con Davide.

---

## B. Il registro della sezione 7: tre righe su ventisette

Ho letto la sezione 7 del Doc «Per Davide» per intero (1.788 righe, modificato l'11/11 alle 10:50). Le righe di
registro, nel formato concordato, sono **tre**:

> **Magia 1.16 — 11/11/2026.** Correzione di pubblicazione: ripristinate A.261–A.263 — formula di vendita degli
> Artefatti con coefficiente Epica 4; Batterie finite calcolate dalla formula; Anello con Rigenerazione 9
> riportato a Grado IV, potenza Molto Rara e SnT 4. Mantenute le nuove regole su Cristalli, Pietre di Luna e
> lavorazioni industriali.

> **Equipaggiamento 0.40 — 11/11/2026.** Correzione di pubblicazione: ripristinate A.261 e A.264 — prezzi delle
> Batterie finite calcolati dalla formula generale; valore degli accumulatori parzialmente carichi stimato dal
> prezzo pieno meno il costo delle cariche mancanti, con valore effettivo stabilito dal Direttore. Mantenute le
> nuove regole industriali e il profilo della CyberArma di Dimitri.

> **Mostri 0.47 — 10/11/2026.** Cambiati: §7.12 Dragomedusa giovane 6 × 4 e adulto 14 × 10 Q Base; precisata la
> corrispondenza in metri e l'ordine dei campi nell'app; distinti ingombro corporeo, pedina tattica e portata dei
> filamenti; eliminato il precedente riferimento ai 15–20 metri.

### Quello che manca

Fra ciò che abbiamo recepito e ciò che c'è su Drive sono passate **ventisette pubblicazioni**. Il registro ne
copre tre, e **una delle tre (Mostri 0.47) è un'edizione che avevamo già**. Le altre due riguardano versioni che
non sono quelle correnti (Magia 1.16, non la 1.17; Equipaggiamento 0.40, non la 0.41).

Mancano le righe di:

- **Giocatore 0.55 → 0.62** (otto pubblicazioni) — ed è il manuale che cambia le schede dei PG;
- **Magia 1.12 → 1.15 e 1.17** (cinque);
- **Armamenti 0.75 → 0.83** (nove);
- **Equipaggiamento 0.31 → 0.39 e 0.41** (dieci);
- **Veicoli 0.11 → 0.18** (otto);
- **Mostri 0.48 → 0.66** (diciannove);
- **Direttore 0.47 → 0.49** (tre).

**Per questi il confronto è stato alla cieca**, cioè fatto diffando i testi senza sapere che cosa Davide
intendesse cambiare. Quello che segue viene dai diff, non dal suo registro: è più esposto all'errore di
interpretazione, e dove una differenza è ambigua l'ho messa fra le domande invece che fra le certezze.
**Da chiedere a Davide: le righe di registro delle ventisette pubblicazioni, o almeno delle sette correnti.**

### Il Doc E&L, modificato oggi alle 13:51

Qui c'è il materiale che nel Doc «Per Davide» non è passato, ed è sostanziale. Le registrazioni del **12 novembre**:

1. **«Progressioni delle Abilità dei PNG generici»** — approva il raccordo dei 25 modelli e **dichiara il file
   JSON come fonte per l'app**. Dice anche che «la versione 0.66 sostituisce la 0.65 sullo stesso file Drive»:
   esiste quindi una 0.65 che non abbiamo mai visto, superata prima che la guardassimo.
2. **Sette blocchi «Acquisizioni approvate del PNG …»**, uno per Agente, Cacciatore, Esploratore, Lestofante,
   Paramedico, **Artigliere e Assaltatore**, ciascuno con Specializzazioni, Maestrie e Talenti Liberi livello per
   livello. L'ultimo chiude con: «approvati … e Assaltatore (sette profili); **gli altri profili sono ancora in
   revisione**».

Marcello ne aveva visti cinque: il Doc è stato esteso oggi dopo che ha scritto il prompt.

---

## C. Che cosa è cambiato, manuale per manuale

Le tre fasce: **1** tocca i PG veri, **2** tocca dati o codice, **3** solo testo.

### C.0 — Il pezzo grosso: il profilo delle Abilità passa da 2/6/12/4 a 4/7/9/4 — **fascia 1**

Giocatore 0.62 §§1.2.1, 2.3, 8.3. È la cosa più pesante dei sette manuali, e sta dietro anche al JSON e al
Bestiario.

**Le categorie.** La prima Classe non assegna più 2 Specializzate, 6 Professionali, 12 Generiche e 4 Non
competenti, ma **4 S, 7 P, 9 G e 4 N**. Le basi restano 7/6/5/3; il totale dei punti base passa da **122 a 127**.
Tutti e 25 i profili di Classe del manuale sono riscritti, e tutti e 25 hanno la nuova forma (verificato uno per
uno sul testo).

**I limiti del VA personale**, ora distanziati di 2 punti come diceva Marcello:

| Grado | S | P | G | N | | S | P | G | N |
| :-- | --: | --: | --: | --: | :-: | --: | --: | --: | --: |
| | **0.54** | | | | | **0.62** | | | |
| I | 12 | 9 | 7 | 5 | → | 12 | **10** | **8** | **6** |
| II | 14 | 11 | 9 | 7 | → | 14 | **12** | **10** | **8** |
| III | 16 | 13 | 11 | 9 | → | 16 | **14** | **12** | **10** |
| IV | 18 | 15 | 13 | 11 | → | 18 | **16** | **14** | **12** |
| V | 20 | 17 | 15 | 13 | → | 20 | **18** | **16** | **14** |
| VI | 22 | 19 | 17 | 15 | → | 22 | **20** | **18** | **16** |

Le Specializzate non cambiano; P, G e N salgono di 1 a ogni Grado. Nei dati cambia soltanto il `fisso` di
`regole.json → competenze` (P 7→8, G 5→6, N 3→4): la pendenza di 2 per Grado resta.

**§8.3.1 Adeguamento straordinario** è la procedura di migrazione, scritta da Davide: si adeguano prima categorie
e basi, si completa l'eventuale passaggio di livello già autorizzato, si ricostruiscono gli incrementi automatici
di Classe, e **si ridistribuisce da zero il monte complessivo dei punti liberi** — 7 per ogni Grado complessivo,
inclusi quelli già spesi. «Le precedenti assegnazioni libere vengono azzerate.»

#### Che cosa cambia nei file dei sette PG

Le sette schede sono tutte `regimeTalenti: 2`. Per ciascuna ho confrontato il profilo della sua prima Classe nel
0.54 e nel 0.62: **nessuna Abilità scende di categoria, da 4 a 5 salgono.**

| Personaggio | Classe | Abilità che cambiano categoria |
| --- | --- | --- |
| **BOTHA PRETORIUS** | Artigliere | 4: Percezione P→S (+1), **Armi da lancio G→S (+2)**, Pilotare G→P (+1), Sopravvivenza G→P (+1) |
| **Dimitri Orlav** | Tecnomante | 4: Scienza P→S (+1), Armi da mischia G→P (+1), **Occultismo G→S (+2)**, Pilotare G→P (+1) |
| **DUNCAN MCDUFF** | Incursore | 5: Armi leggere P→S, Armi da guerra P→S, Corpo a corpo G→P, Sopravvivenza G→P, Raggirare G→P (tutte +1) |
| **LUCAS** | Invocatore | 5: Armi da lancio P→S, Percezione P→S, Rituali G→P, Atletica G→P, Cultura G→P (tutte +1) |
| **MICHELE GIORGETTI** | Agente | 5: Armi leggere P→S, Furtività P→S, Corpo a corpo G→P, Atletica G→P, Medicina G→P (tutte +1) |
| **OSHI NAGATA** | Assaltatore | 5: Difese P→S, Atletica P→S, Armi da lancio G→P, Armi medie G→P, Furtività G→P (tutte +1) |
| **PABLO ZAION** | Pilota | 5: Percezione P→S, Sopravvivenza P→S, Armi medie G→P, Cultura G→P, Oratoria G→P (tutte +1) |

Nel **file** cambia:

- `scelte.puntiAbilita` della creazione e `livelli[].puntiAbilita` di ogni livello: §8.3.1 li azzera e li fa
  ridistribuire da capo, con il giocatore;
- niente altro direttamente — categoria, base e limite sono calcolati, non salvati (principio 3).

Nella **scheda** cambia il VA di quelle 4–5 Abilità per la base, e potenzialmente di molte altre perché il limite
P/G/N sale di 1 a ogni Grado: punti che oggi sono registrati e inefficaci possono tornare efficaci.

**Non si può fare senza il tavolo.** L'azzeramento e la ridistribuzione dei punti liberi sono una scelta del
giocatore, come fu per i Talenti il 26/10.

#### Il nodo dei livelli

Il **Direttore 0.49 §9.8.3** («Adeguamento del gruppo dei Guardiani dei Sigilli») dice:

> Davide autorizza il passaggio dei sette personaggi **dal livello 7 al livello 8** … Cinque personaggi hanno
> maturato i PX necessari; per gli altri due il Direttore registra l'avanzamento straordinario senza assegnare i
> PX mancanti… Per tutti i personaggi il livello 8 corrisponde a tre Gradi complessivi… Il monte da redistribuire
> è **21 punti liberi** per personaggio.
> **Oshi Nagata è stato ricreato come Assaltatore di II Grado, senza Gradi da Lestofante.** Al passaggio al
> livello 8 aumenta l'Assaltatore al III Grado.

Ma i file dicono un'altra cosa: **sei personaggi sono al livello 6 e uno (Lucas) al 7**, e in `px/` non c'è ancora
nessun `px.json` — nessun PX è stato assegnato nell'app. Il salto da fare non è 7→8 ma **6→8 per sei di loro**, a
meno che Davide non abbia in mano PX che l'app non ha mai visto.

**Da chiarire con Davide prima di toccare qualunque cosa**, perché 21 punti liberi presuppongono tre Gradi, cioè
il livello 8: se si parte dal 6 i Gradi sono due e il monte è 14. È il primo punto da mettere sul tavolo.

### C.1 — Morente: una regola di combattimento nuova — **fascia 1**

Giocatore 0.62 §§5.14.2 e 5.14.3, più Equipaggiamento 0.41 (Stabilizzazione d'emergenza, Cartuccia Stabilizzante,
Protocollo Morente della UMC Automatica). Nel 0.54 la parola «Morente» compariva **una volta sola**, dentro un
Talento; adesso sono due paragrafi pieni.

- **Ingresso**: quando le Ferite superano Grave si diventa Morente, con penalità −8 a VA, Salvezze **e Iniziativa**
  (che è la A.220) e Svenuto automatico. Si annota un **contatore di sopravvivenza pari alla COS** posseduta
  all'ingresso, fisso per quell'episodio.
- **Decorso**: −1 per ogni Round completo; a 0 **si muore**. Curare non ferma il decorso.
- **Colpo d'ingresso**: esaurisce lì le proprie Ferite eccedenti, il contatore parte pieno; i colpi successivi
  tolgono 1 Round per Ferita.
- **Stabilizzazione**: una cura *specifica* riporta a Grave, mantiene −8 e **disattiva** il contatore. Davide
  distingue espressamente «contatore attivo esaurito» (morte) da «contatore disattivato a 0» (non morte).
- **§5.14.3**: il recupero dei PV, la cura ordinaria delle Ferite e il solo arresto del Sanguinamento **non**
  stabilizzano. Riposo, Cura Ferite, Cartuccia Curativa, Protocollo Shock e Cura Spirituale non fermano il
  contatore.

Nell'app oggi c'è lo stato «Oltre» con i malus di Grave (A.159) e la morte del §5.14 come **avviso, non blocco**.
La 0.62 ci mette sopra un contatore che scade e uccide. Tocca `regole.json → ferite`, la sessione, la tab
Combattimento, i Talenti medici (Triage Estremo del Paramedico cambia testo e funzionamento) e il Tavolo.

Tocca i PG veri in gioco, non nel file: nessuno dei sette è Morente adesso.

### C.2 — Salto della Tigre: salto fisico, non trasferimento — **fascia 2**

Giocatore 0.62, §8.9. **Costo e gittata non cambiano**: 4 PM, 6 Q, istantanea. Cambia la natura e cambiano i
vincoli:

> Compie un **salto fisico, non un teletrasporto**. Deve poter saltare: non può farlo se è **Immobilizzato**
> (§5.18) o **vincolato a un oggetto fisso**, per esempio con le manette.

È la Tecnica che Oshi ha usato al tavolo il 9/11. Nei dati il costo resta 4: cambia quello che l'app deve
**permettere** — oggi «Attiva» non guarda lo Stato Immobilizzato. Avvisa, non bloccare.

### C.3 — Magistrale, 3 naturale e tiro obbligatorio — **fascia 3, già applicato**

Il 0.62 scrive nel manuale quello che l'app fa dalla A.78 (02/10): «Con Successo Magistrale Migliorato, il 2
riuscito è Magistrale e, **da VA finale 21, lo è anche il 3**»; «attacchi e Difese attive … richiedono il tiro
anche con VA finale almeno 20, salvo eccezioni esplicite come Colpo Elementale». `regole.json → prova` ha già
`magistrale_migliorato.naturali` e `tiro_sempre`.

**Una differenza vera, piccola**: i 3 Punti Eroe per annullare il Magistrale di un avversario valgono ora anche
sul **3** naturale, non solo sul 2. *Fascia 2.*

### C.4 — Nomi e rimandi di Maestrie e Manovre — **fascia 2**

Armamenti 0.83: «Ricarica Migliorata» diventa ovunque «la **Maestria Ricarica Esperta**», con rimando al Giocatore
§8.6.4. È il manuale che si allinea alla riforma dei Talenti v1.0/v1.1 che l'app ha già. I numeri non cambiano
(2 cartucce per AzP, 4 con la Maestria, 6 con carichino). Nei dati vanno rinominati i riferimenti in
`munizioni.json → ricarica` e nelle voci dei Talenti superati: **nessun valore cambia**, cambia un nome che
l'app usa come chiave.

### C.5 — CyberArma: potenza e SnT — **fascia 1 (Dimitri)**

Magia 1.17 §24.1 e Armamenti 0.83 §7.25:

> La CyberArma ha **potenza Rara, Grado III e SnT base 3**. La SnT effettiva scende a **2 per il Tecnomante**, a
> **1 per un Custode** e a **0 per il Custode che l'ha costruita** e ne è proprietario.

Rispetto alla 1.11 («impiego del Custode 1, Tecnomante 2, NeC 3») è una riorganizzazione: la potenza è una sola
(Rara/III/3) e le SnT di impiego sono riduzioni. **La SnT 0 del Custode costruttore è nuova.** In più: «CyberArma
con riserva mistica — riserva dedicata da **5 o 10 CM**» (prima solo 5).

Tocca la scheda di Dimitri, che ha una CyberArma: `sintonizzazione_per_classe` in `armi.json` e la capacità di
sintonizzazione impegnata.

### C.6 — Prezzi degli Artefatti: arriva il coefficiente Epica — **fascia 2**

Magia 1.17 §24.3:

> Prezzo indicativo di vendita = costo completo di creazione × 3 × coefficiente di potenza, arrotondato per
> eccesso al multiplo di 50 cr: Comune 1, Non Comune 1,5, Rara 2, Molto Rara 3, **Epica 4**, Leggendaria 5.

`regole.json → prezzi_artefatti.coefficienti` ha oggi Comune 1 / Non Comune 1,5 / Rara 2 / Molto Rara 3 /
Leggendaria 5: **manca Epica 4**. E «il prezzo indicativo delle Batterie finite segue la formula del §24.3»: i
prezzi di catalogo delle Batterie ora **derivano** dalla formula invece di convivere con essa. Le Batterie
colorate passano da REP Molto Rara a **Epica**.

### C.7 — Bestiario: i 25 PNG generici ci sono tutti — **fascia 2**

Mostri 0.66, sottotitolo «PROGRESSIONI PNG» (la 0.47 era «COVATA E CATALOGO DEL BESTIARIO»). Il testo passa da
36.807 a 65.251 righe. I modelli PNG generici passano da **10 a 25**: oltre ai dieci che avevamo, ci sono
Agricoltore, Artigiano, Operaio, Pilota, Tecnico, Accademico, Amministrativo, Artista, Medico, Predicatore,
Arcanista, Custode, Invocatore, Mistico, Tecnomante. Chiude il buco del lotto 143 («dieci modelli su venticinque»)
e risolve le domande A.205–A.210 per costruzione.

### C.8 — Mostri senza Ferite, +30% ai PV — **fascia 2**

Direttore 0.49 §9.9, nuovo. Le creature usano **solo i PV**: niente Morente, niente penalità da Ferite, niente
Menomazioni automatiche; a 0 PV sono fuori combattimento. Le schede «comprendono già +30% ai PV massimi,
arrotondato per eccesso: il valore si usa direttamente. **Non si applicano ×1,33 o ×1,50, né un secondo aumento**
durante la preparazione o l'importazione». Una Ferita diretta contro di loro toglie 5 PV ignorando l'AR; curare
uno stato di Ferita ne recupera 5.

Tocca `formato_nemici.json`, l'importatore dei mostri e la plancia. **Attenzione al doppio aumento**: se
l'importatore rilegge le schede 0.66 e qualcosa applicasse di nuovo il +30%, i PV di tutto il bestiario
raddoppierebbero di fatto. Va messo un controllo.

### C.9 — Veicoli: quattro capitoli nuovi — **fascia 2**

Veicoli 0.18: capitoli **11 Neverlost e combattimento navale tattico**, **12 motocicletta civile**, **13 furgone
civile**, **14 Nave mineraria e Rimorchiatore commerciali**. Il §11 formalizza nel manuale la Neverlost che
abbiamo costruito dalla scheda tecnica 1.6 (lotto 158). In più, ASA diventa **SIA** («Nel 504 PE la SIA è
l'agenzia attiva dell'Alleanza, succeduta all'ASA»): lo Scout di catalogo è «SIA Scout MK4», il FIAT LUX resta
«ASA Scout MK4 FIAT LUX», esemplare storico di oltre 600 anni. Conferma la A.226 e la A.257: prezzo di catalogo
126.510 cr distinto dalla stima del Direttore, «non è fissato uno sconto percentuale».

### C.10 — Il resto, fascia 3

Armamenti: nuovo §7.26 «Dotazioni storiche ASA della Neverlost» con le divise e il Soprabito d'ordinanza; i
cataloghi corporativi riordinati. Equipaggiamento: §5.4.12 «Materiali e fabbricazione industriale», §10.4.1
«Valore dei frammenti di Matrice» (tocca la A.246), «Valigetta investigativa SIA». Magia: Cristalli, Pietre di
Luna e lavorazioni industriali.

---

## D. Il file JSON: è usabile direttamente, e si verifica da solo

`SIMPLY_RPG_PNG_Abilita_v0.66.json`, 1,6 MB, caricato oggi alle 12:34.

### Struttura

```
schema_version       "1.0"
versione_dati        "bestiario-0.66-png-abilita"
manuale_giocatore    "0.62"
manuale_mostri       "0.66"
data                 "2026-11-12"
ambito               "Competenze, assegnazioni e VA derivati dei 25 modelli PNG Classe/Grado;
                      non è un catalogo completo degli effetti e delle acquisizioni."
istruzioni           (come leggerlo e che cosa non è)
basi                 { S:7, P:6, G:5, N:3 }
limiti_per_grado     { S:[12,14,16,18,20,22], P:[10,…,20], G:[8,…,18], N:[6,…,16] }
modelli              25
sha256_manuale_mostri "d7bd1fb1…51169a"
```

**25 modelli**, uno per Classe, nell'ordine di `data/classi.json`. Ogni modello ha `classe`, `sistema_salute`,
`bonus_corporazione`, `competenze` (le quattro liste S/P/G/N), `abilita_automatiche` (le cinque di Classe),
`priorita_operativa`, `progressione` (sei Gradi) e `tabelle_derivate`. Ogni Grado ha `livello`, `caratteristiche`,
`punti_liberi_totali`, `nuove_assegnazioni`, `sequenza_assegnazione`, `punti_liberi_cumulativi` e **`abilita`**:
per ciascuna delle 24, `caratteristica, categoria, modificatore, base, corporazione, automatici, punti_liberi,
va_grezzo, limite, va_personale`. Le `tabelle_derivate` danno per Grado PV, PM, INI, AP, AR, Parata, Schivata e
gli attacchi pronti con VA e danno.

### Si può usare direttamente? **Sì, e con una fiducia che non abbiamo mai avuto**

Tre controlli, tutti passati:

1. **L'impronta.** Il JSON dichiara lo `sha256` del Manuale dei Mostri. Ho ricalcolato lo sha256 del `.docx`
   scaricato da Drive: **coincide byte per byte**. È la stessa idea della regola 4 del nostro protocollo, applicata
   da Davide: il JSON dice a quale manuale appartiene, e lo dimostra.
2. **I numeri di controllo del Doc E&L.** «Agente I Armi leggere 11, Furtività 10, Atletica 6; Custode I Artefatti
   7 con limite 8, Custode III Artefatti 8 con limite 12; Tecnomante I Occultismo 12 e Potere 9» — **sette su
   sette esatti**. «Ogni modello al III Grado deve avere 21 punti liberi complessivi; al VI 42» — **25 modelli su
   25, a entrambi i Gradi**.
3. **La coerenza interna.** Su tutte le **3.600** voci (25 modelli × 6 Gradi × 24 Abilità): `va_grezzo` = mod +
   base + corporazione + automatici + liberi in 3.600 casi su 3.600; `va_personale` = min(grezzo, limite) in 3.600
   su 3.600; categoria e base sempre d'accordo con `competenze` e `basi`; limite sempre d'accordo con
   `limiti_per_grado`. **Zero incoerenze.**

È un guadagno grosso: `tools/importa-png-generici.mjs` oggi ricava dieci modelli leggendo tabelle dal Word, con
tutta la fragilità che abbiamo visto nel lotto 143. Con il JSON si leggono **venticinque** modelli completi da una
fonte strutturata, con l'impronta del manuale per sapere a quale edizione corrispondono. **Proposta: il JSON
diventa la fonte dei PNG generici e l'estrazione dal Word resta solo per i campi che il JSON non ha.**

### Che cosa il JSON NON contiene

**Specializzazioni, Maestrie e Talenti Liberi non ci sono**, a nessun livello, in nessuno dei 25 modelli. Lo dice
il campo `ambito` e lo conferma il Doc E&L:

> Il Bestiario 0.66 e il file dati 0.66 **conservano per ora il precedente blocco delle Abilità** e devono ricevere
> queste acquisizioni nel consolidamento successivo.

Quindi, rispetto alla domanda di Marcello: il JSON **non corrisponde** ai profili approvati nel Doc E&L sulle
acquisizioni, perché non le contiene affatto. Corrisponde invece perfettamente sulle Abilità, che è quello che
dichiara di coprire. Le acquisizioni approvate stanno **solo nel Doc E&L**, a parole, e arriveranno nei dati con
un consolidamento successivo del Bestiario.

### Gli altri profili «ancora in revisione»

Approvati **sette**: Agente, Cacciatore, Esploratore, Lestofante, Paramedico, Artigliere, Assaltatore. (Marcello
ne aveva visti cinque; il Doc è stato esteso oggi.)

**In revisione, diciotto**: Incursore, Lottatore, Soldato, Agricoltore, Artigiano, Operaio, Pilota, Tecnico,
Accademico, Amministrativo, Artista, Medico, Predicatore, Arcanista, Custode, Invocatore, Mistico, Tecnomante.

---

## E. Le quattro domande aperte

### A.261 — la formula del prezzo contro i prezzi di catalogo: **RISPOSTA**

Magia 1.17 §24.3 e Equipaggiamento 0.41 §10.2, con la riga di registro dell'11/11. **Vince la formula**: «Il
prezzo indicativo delle Batterie finite segue la formula del §24.3 e i valori completi del Manuale
dell'Equipaggiamento, §10.2». I prezzi di catalogo che non tornavano sono stati ricalcolati, non mantenuti.

**È cambiata rispetto al 09/11**, e questa è la parte importante: la scala dei coefficienti ha ora **sei** gradini
invece di cinque — «Comune 1, Non Comune 1,5, Rara 2, Molto Rara 3, **Epica 4**, Leggendaria 5». Il nostro
`regole.json` non ha Epica, e le Batterie colorate passano a REP Epica.

### A.263 — Grado e SnT dell'Anello: **RISPOSTA**

Magia 1.17: «un anello con la sola Rigenerazione 9 Esclusiva è di **Grado IV, potenza Molto Rara e SnT 4**». La
riga di registro lo conferma: «Anello con Rigenerazione 9 riportato a Grado IV, potenza Molto Rara e SnT 4».

**È cambiata rispetto al 09/11**: la 1.11 diceva «Grado III e SnT 3». Nei dati l'Anello è Molto Rara con 5 CM
Verdi e 13.500 cr (quelli restano, perché la formula con Molto Rara 3 li conferma): cambiano **Grado III → IV** e
**SnT 3 → 4**.

### A.265 — la potenza della CyberArma: **RISPOSTA**

Magia 1.17 §24.1 e Armamenti 0.83 §7.25: «La CyberArma ha **potenza Rara, Grado III e SnT base 3**. La SnT
effettiva scende a 2 per il Tecnomante, a 1 per un Custode e a **0 per il Custode che l'ha costruita** e ne è
proprietario.» La domanda era proprio come conciliare «SnT 1 e 2 per impiego» con una potenza unica: la risposta è
che la potenza è una (Rara/III/3) e le SnT d'impiego sono riduzioni. La SnT 0 del costruttore è nuova.

### A.266 — i NEC in cariche o in UE: **NON risposta, ma ora si ricompone**

Il **Giocatore 0.62 §2.16.1 dice ancora la stessa frase**, invariata per otto pubblicazioni:

> I NEC usano riserve distinte UER, UEB e UEV. Per le armi si annotano cariche o colpi: **1 UE dello stesso colore
> ripristina dieci cariche personali** mediante trasformatore dedicato, conservando il resto nel tampone.

Però l'**Equipaggiamento 0.41 §5.4** e il **Direttore 0.49 §9.7** ora definiscono il rapporto in modo esplicito:

> UER, UEB e UEV **misurano la stessa energia** in ogni impiego. Una carica rappresenta invece un utilizzo
> calibrato per il formato… **CEC — 100 UE; 10 cariche da 10 UE.**

Con questa definizione i conti tornano: **1 carica CEC = 10 UE → 100 cariche personali**, che è esattamente il
tampone da 100 cariche NEC che l'app fa dal lotto 146. **I due manuali non si contraddicono più: dicono lo stesso
numero in due unità.** Quello che resta è che il §2.16.1 parla in UE dove tutto il resto parla in cariche, e il
giocatore lo legge alla creazione.

La domanda scende da «due manuali dicono numeri diversi» a «una frase sola da riscrivere nell'unità giusta». Ma
non la chiudo da solo: **va confermata a Davide in una riga**, e la A.266 resta aperta fino ad allora.

---

## F. Che cosa proponiamo

### I lotti, in ordine

| # | Contenuto | PG veri | Serve Davide o il tavolo |
| --- | --- | --- | --- |
| **A** | **Estrazione e registro.** Il passaggio che toglie le immagini dai Doc esportati in Markdown; i sette testi in `docs/manuali-txt/` con la versione nel nome; `tools/manuali.json` aggiornato. | no | la versione vera dei Veicoli (0.17 o 0.18) |
| **B** | **Il profilo 4/7/9/4 e i limiti.** `regole.json → competenze` (numero, `punti_base_totali` 127, `fisso` P/G/N), i 25 profili di `classi.json`, l'invariante del validatore, `src/competenze.js`. Senza toccare i PG. | no | no |
| **C** | **L'adeguamento dei sette PG** (§8.3.1 del Giocatore, §9.8.3 del Direttore): azzeramento e ridistribuzione dei punti liberi, eventuale passaggio di livello, caso di Oshi. | **sì** | **sì: sessione al tavolo** |
| **D** | **Morente.** §§5.14.2–3, cure specifiche, Cartuccia Stabilizzante, Protocollo Morente della UMC, Triage Estremo. | **sì, in gioco** | una conferma sul rapporto con «Oltre» (A.159) |
| **E** | **I 25 PNG generici dal JSON.** `importa-png-generici` legge il JSON, controlla lo sha256 del manuale, e il Word resta per i campi che il JSON non ha. Più §9.9 «Mostri senza Ferite» e il +30% con il controllo del doppio aumento. | no | no |
| **F** | **Prezzi e CyberArma.** Coefficiente Epica, Batterie dalla formula e REP Epica (A.261), Anello Grado IV / SnT 4 (A.263), CyberArma Rara/III/3 con le SnT d'impiego (A.265). | **sì (Dimitri)** | no: sono risposte |
| **G** | **Nomi delle Maestrie** nei rimandi dei manuali (Ricarica Esperta ecc.) e Salto della Tigre come salto fisico. | no | no |
| **H** | **Veicoli 11–14**: Neverlost dal manuale, motocicletta, furgone, nave mineraria, rimorchiatore; ASA → SIA. | no | no |
| **I** | **Il resto di fascia 3** e le acquisizioni dei PNG approvati, quando Davide le consolida nei dati. | no | aspetta il consolidamento |

L'ordine conta: **B prima di C** (le regole prima delle schede), **C prima di tutto il resto che tocca i PG**, ed
**E dopo B** perché il JSON usa già il profilo nuovo.

### Lotti aperti che cambiano

- **Il debito del 189 — i testi dei Talenti dal Giocatore 0.50 — non va più alla 0.54: va alla 0.62.**
  `tools/lotti/lotto_testi_completi_talenti.mjs` è l'unico `testoEdizione` rimasto indietro, appuntato alla 0.50.
  Rifarlo sulla 0.54 sarebbe lavoro buttato: la 0.62 riscrive le categorie e i rimandi delle Maestrie. **Va
  rifatto una volta sola, sulla 0.62, dentro il lotto B o G.** Di conseguenza `giocatore-0.50.md` resta in
  `docs/manuali-txt/` finché quel lotto non passa, e poi si archivia insieme alle altre edizioni superate.
- **`tools/importa-png-generici.mjs`**: l'estrazione dei dieci modelli dal Word diventa in gran parte inutile. Non
  si butta (serve per i campi fuori dal JSON), ma non è più la fonte.
- **`tools/importa-mostri.mjs`**: va riletto per il §9.9 (PV già comprensivi del +30%) prima di importare la 0.66,
  o il bestiario si gonfia.
- **A.258** (Eretici provvisori, lotto 183): con 25 PNG generici completi, il profilo umano «costruito come PG» ha
  ora un'alternativa canonica. Da rivedere, non da rifare.

### Che cosa non si può fare senza una sessione al tavolo

**Una sola cosa, ma è la più grossa: il lotto C.** Il §8.3.1 azzera le assegnazioni libere di tutti e sette i
personaggi e le fa rifare con i limiti nuovi — 21 punti a testa se il livello è 8, 14 se è 6. È una scelta del
giocatore, Abilità per Abilità, esattamente come fu per i Talenti il 26/10. Con sette personaggi e 24 Abilità
ciascuno, è una serata.

Prima di quella serata servono **tre risposte di Davide**:

1. **Da che livello partiamo?** Il Direttore 0.49 dice «dal livello 7 all'8», i file dicono sei al livello 6 e
   Lucas al 7, e nell'app non c'è ancora nessun PX assegnato. Da questo dipende il monte: 21 punti o 14.
2. **Oshi Nagata.** «È stato ricreato come Assaltatore di II Grado, senza Gradi da Lestofante»: il suo file dice
   già Assaltatore, ed è l'unico dei sette fermo al 07/10. Va verificato insieme che cosa intende.
3. **Chi sono i due** che ricevono l'avanzamento straordinario senza PX: «i due destinatari sono individuati dal
   Direttore nelle rispettive Schede», e noi non li sappiamo.

Conviene saperlo con qualche giorno di anticipo: il lotto B si può fare subito e da soli, ma senza queste tre
risposte il C non parte.

---

## Da chiedere a Davide

1. **I Veicoli: 0.17 o 0.18?** Il file si chiama v0.17, la prima pagina dice EDIZIONE 0.18 (regola 3).
2. **Le righe di registro** delle ventisette pubblicazioni, o almeno delle sette correnti: senza, il confronto è
   alla cieca (regola 6).
3. **A.266**: il §2.16.1 del Giocatore conta ancora in UE mentre tutto il resto conta in cariche. Con la
   definizione del §5.4 (1 carica CEC = 10 UE) i numeri tornano: basta una conferma che la lettura è quella.
4. **Il livello di partenza dei sette**, Oshi, e i due dell'avanzamento straordinario (sopra).

Nessuna domanda nuova numerata: le quattro sono chiarimenti su risposte già date o sul protocollo, non ambiguità
dei dati. Il primo numero libero resta **A.267**.
