# Catalogo dell'equipaggiamento: lotti da estrarre

Stato al 26 settembre 2026 (lotti 2–14 fatti: tutti i lotti di oggetti del manuale). Fonte: Manuale degli Armamenti v0.50. Metodo: `tools/estrai_manuali.py`
e `docs/pilota-estrazione-armamenti.md`.

Questa è la lista dei prompt successivi: **un lotto per prompt**, nell'ordine di utilità al
tavolo. Ogni lotto aggiunge uno o più file in `data/equipaggiamento/` e una riga in `index.json`.
Poi si estende il validatore per i campi nuovi e si aggiungono i test.

Le pagine sono quelle **reali** del PDF, ricavate dai titoli dei paragrafi. Dal §7.18 in poi
l'indice del manuale riporta una pagina in meno. «Tabelle» è il numero trovato da pdfplumber
su quelle pagine: le tabelle impilate contano come una.

## Già nel catalogo (lotto 1, dal pilota)

| File | Contenuto | Paragrafo | Pagine |
|---|---|---|---|
| `armi.json` | 28 armi ravvicinate del catalogo Commerciale | §7.1.1–7.1.3 | 4–7 |
| `armature.json` | 3 armature commerciali civili, penalità per categoria | §7.11.1–7.11.3 | 62–63 |
| `armi_distanza.json` | 22 armi a distanza del catalogo Commerciale (lotto 2) | §7.7 | 33–36 |
| `scudi.json` | 26 scudi commerciali e corporativi (lotto 3) | §7.4 | 23–30 |
| `armi_corporative.json` | 39 armi ravvicinate dei cataloghi corporativi (lotto 4) | §7.1.9 | 11–17 |
| `armature_corporative.json` | 83 armature dei cataloghi corporativi, esoscheletri compresi (lotto 6) | §7.11.5–7.17.5 | 64–103 |
| `corredi_dispositivi.json` | 60 corredi, dispositivi, esoscheletro APE, Iron Mastiff, armi e granate Imperial; tabella SIN (lotto 7) | §7.12–7.17 | 69–105 |
| `accessori_armi.json` | 15 accessori delle armi: mirini, riduzione del rumore, supporti, illuminazione e visione (lotto 8) | §7.3 | 19–22 |
| `rinforzi.json` | 22 rinforzi: profili Leggero e Pesante, 4 modelli commerciali, soprabiti BLEU e ASA, 14 specialistici (lotto 9, poi Armamenti 0.53 §7.23) | §7.11.2, §7.23 | 62, 131 |
| `munizioni.json` | 49 munizioni, caricatori, granata pesante, razzi, celle, combustibile, dardi chimici; tabella delle famiglie delle armi (lotto 10) | §7.20 | 114–121 |
| `sanitario.json` | 16 oggetti sanitari: kit, cartucce, UMC, dispositivi portatili, diagnostica e chirurgia (lotto 11) | §7.19 | 109–113 |
| `artefatti.json` | regole di sintonizzazione, 6 Artefatti già nel catalogo, 4 batterie da 5 PM (lotto 12) | §7.5, §7.10 | 30–31, 58–60 |
| `unita_robotiche.json` | Cuirassier Attila e Generatore RF366 (lotto 14) | §7.18 | 107–108 |
| `armi_distanza_corporative.json` | 81 armi a distanza corporative, 19 moduli integrati, 6 munizioni di riferimento (lotto 5) | §7.8 | 36–52 |

Da completare nello stesso ambito, a basso costo:
- ✔ **Manovre compatibili** dei profili commerciali — §7.1.7, pp. 9–10 (lotto 13, fatto il
  26 settembre 2026, commit «Lotto 13 del catalogo: Manovre compatibili dei profili commerciali»).
  - **Fonte:** `docs/lotti/lotto13-manovre/`, generatore `tools/lotti/lotto13_manovre.mjs`.
  - **Estrazione:** 2 tabelle, una per pagina. **28 righe su 28 giuste al primo colpo**, una
    per ogni profilo commerciale, ritrovate nel testo; **0 correzioni a mano**.
  - **Dati:** il generatore aggiunge a `armi.json` soltanto il campo `manovre` e controlla che il
    resto di ogni oggetto resti identico (il diff ha solo righe aggiunte). «—» della Frusta
    diventa `["generali"]`, come nelle schede corporative.
  - **Scheda:** le Manovre compatibili compaiono nella scheda dell'arma impugnata e nel tooltip,
    come per le armi corporative.
  - **Dubbi per Davide:** nessuno.
- ✔ **Rinforzi** delle armature — §7.11.2, p. 62 (lotto 9, fatto il 26 settembre 2026, commit
  «Lotto 9 del catalogo: kit di rinforzo delle armature»).
  - **Fonte:** `docs/lotti/lotto9-rinforzi/`, generatore `tools/lotti/lotto9_rinforzi.mjs`, dati
    `data/equipaggiamento/rinforzi.json`.
  - **Oggetti:** 4, cioè i kit Leggero e Pesante e i due soprabiti che il manuale descrive come
    Rinforzi Leggeri riservati: Soprabito blu di ordinanza per la BLEU (§7.11.5) e Soprabito ASA
    per le due divise ASA (§7.11.7).
  - **Estrazione:** 2 righe su 2 dalla tabella, ritrovate nel testo. I valori dei soprabiti si
    leggono dalla loro frase e il generatore controlla che coincidano col kit Leggero. **0
    correzioni a mano.**
  - **Calcolo:**
    - un kit «in uso» montato su un'armatura indossata aggiunge AR e FOR richiesta, se il
      modello lo ammette (`rinforzi_ammessi`, `compatibile_con`);
    - una Leggera portata fisicamente ad AR 3 o più usa le penalità della Media, ricalcolate con
      gli effetti delle proprietà native;
    - un solo kit per armatura; gli altri danno un avviso, come i kit non ammessi.
  - **Armature corporative rigenerate:** Articolazioni, Assetti e Assetto mistico hanno ora
    `effetto.penalita` (`annulla` / `riduce`). Le calcola la stessa funzione dell'app
    (`penalitaConEffetti`), usata anche dal generatore del lotto 6. Le penalità salvate non sono
    cambiate: 0 differenze su 83 modelli.
  - **Test dal manuale:**
    - le tre configurazioni commerciali della tabella di p. 62;
    - il Mortificator rinforzato del §7.17.5 (Media, −1 attacchi e Agilità, −1 MOV, −2 al
      lancio);
    - la Divisa operativa ASA col Soprabito del §7.11.7 (AR 4, FOR 5, Media).
  - **Dubbi per Davide:** nessuno.
- ✔ **Catalogo dei rinforzi** — Armamenti 0.53, §7.23 (28 settembre 2026).
  - **Fonte:** testo del Doc (`docs/manuali-txt/armamenti.md`), generatore
    `tools/lotti/lotto_rinforzi_723.py`, dati `data/equipaggiamento/rinforzi.json` (riscritto).
  - **Oggetti:** 22. I due profili di categoria del §7.23.1 (stessi id del lotto 9), i quattro modelli
    commerciali del §7.23.2, i soprabiti BLEU e ASA del §7.23.3 (stessi id, nomi nuovi) e i 14
    specialistici del §7.23.6 (Qualità Non comune, PS 12; Eisenwall 10 PI).
  - **Proprietà:** tradotte in effetti con la funzione del lotto delle armature, quindi con le stesse
    chiavi di cumulo. Nuove chiavi `beneficio` anche sulle armature (contromisure, Mimetismo e
    Mimetica ambientale, SIN): §7.23.9, «si usa il maggiore applicabile». Articolazione d'assalto del
    rinforzo riduce la penalità ravvicinata dell'armatura fino a 0, se l'armatura non l'ha già.
    Discreta resta promemoria nella riga della protezione.
  - **Calcolo:** le proprietà del rinforzo valgono solo se è il kit valido di un'armatura indossata.
    Limite: la riduzione della penalità (Sode d'assalto) non segue lo stato «rotto» del rinforzo, che
    oggi toglie AR ed effetti ma non tocca le penalità.
  - **Test dal manuale** (`tests/rinforzi.test.js`): esempi del §7.23.5, Breacher del §7.23.7, esempi
    del §7.23.9 (Imbottita, Mimetismo, Sode su leggera e media), Missione non montabile sulla Marte.
  - **Dubbi per Davide:** nessuno.

## Da estrarre, in ordine di utilità

### 1. ✔ Armi a distanza commerciali — §7.7, pp. 33–36 (lotto 2, fatto)

Fatto il 26 settembre 2026, commit «Lotto 2 del catalogo: armi a distanza commerciali».

Il lotto finisce a p. 36, non a p. 35 come scritto in origine: su p. 36 stanno la tabella
economica di Archi e balestre, le Armi speciali e le Granate.

- **Fonte:** `docs/lotti/lotto2-armi-distanza/grezzo/` (10 CSV di pdfplumber, pp. 33–36),
  `pulito/armi_distanza.csv`, generatore `tools/lotti/lotto2_armi_distanza.mjs`, dati
  `data/equipaggiamento/armi_distanza.json`.
- **Estrazione:** 8 gruppi × 3 sottotabelle = 24 sottotabelle reali. pdfplumber ne trova 10:
  - le sottotabelle di un gruppo impilate si leggono come una sola (p. 33: 1 invece di 3);
  - due gruppi sono spezzati fra due pagine: Lanciatori 34→35, Archi e balestre 35→36.
- **Regola di separazione (generica, nel generatore):**
  - via righe e celle vuote;
  - ogni riga che comincia con «Modello» apre una nuova sottotabella con la sua intestazione;
  - i record si riuniscono per nome del modello attraverso tutti i file del lotto;
  - ogni blocco «Modello | Danno …» apre un gruppo, con i nomi dei titoli del §7.7 (fuori
    dalle tabelle) elencati nel generatore e controllati nel numero (8).
- **Righe:** 22 armi, 66 righe di sottotabella. Dopo la regola generica **22 su 22 giuste al
  primo colpo**, controllate riga per riga sulle immagini delle pp. 33–36; **0 correzioni a
  mano**. Nessuna cella andata a capo, nessuna colonna spostata.
- **Conversioni** (regole del generatore, non correzioni):
  - 15 costi con il punto delle migliaia;
  - «Munizione» / «Mun.» nelle colonne Danno e AC (Lanciagranate, Lanciarazzi) →
    `danno_da_munizione`, `ac: "munizione"`;
  - «FOR × 3» in Max Q (Pugnale, Ascia leggera, Shuriken, Granata) → `gittata_per_for: 3`,
    calcolata con la FOR del personaggio;
  - «—» in CC e INC → `null`;
  - MOV scritto con il trattino ASCII «-1», «-2» → interi negativi.
- **Testo sotto le tabelle** (proprietà, munizione di riferimento, ricarica, consumo): annotato
  a mano nel generatore, parola per parola. Le proprietà con nome (Sbilanciante, Plasma, Fuoco,
  RS 1, Sbalzante 1) hanno il testo del Giocatore §5.10/§5.24. Nessuna tocca VA, danno, Difese
  o AR, quindi nessun `effetto` strutturato.
- **Schema esteso:** `ac`, `modificatore_va`, `gittata_per_for`, `munizioni` { capacita,
  ricarica, consumo, riferimento }, `inc`, `mov`, `modalita` con legenda nel file,
  `danno_da_munizione`, `stesso_oggetto` (Pugnale e Ascia leggera: `armi:pugnale`,
  `armi:ascia-leggera`).
- **Dubbi per Davide:** Specializzazione della Pistola mitragliatrice compatta e delle armi
  ravvicinate lanciate (`docs/per-davide.md`, A.7 e A.8; `TODO(Davide)` in
  `armi_distanza.json`).

Scheda originale del lotto:


- **Contenuto:** pistole, fucili, armi medie, lanciagranate, armi da lancio (compresi Pugnale e
  Ascia leggera lanciati).
- **Struttura:** per ogni gruppo **tre sottotabelle impilate**:
  - Danno/AC/VA/FOR/Max Q/CC/INC;
  - Abilità/Mani/PI/MOV/Modalità;
  - Qualità/PS INT/REP/Costo.
  pdfplumber le legge come una sola tabella; vanno divise sulle righe «Modello» e riunite per
  modello.
- **Campi nuovi:** `gittata_q` (Max Q), `cc` (capacità del caricatore), `inc`, `modalita`
  (S, RB, RM, RL, TR, FS, DC), `mov`, `ac` (applicazioni di danno), modificatore `va` della
  scheda.
- **Proprietà in prosa** sotto le tabelle («HD14M. Proprietà: Sbilanciante…»); valori speciali
  come «Mun.».
- **Effetti sulla scheda:**
  - il modificatore VA dell'arma entra nel VA per colpire;
  - la penalità MOV si aggiunge alla sessione;
  - il contatore munizioni della modalità tavolo potrà partire da `cc`.
- **Per Davide:** i profili lanciati che condividono prezzo e Integrità con l'arma ravvicinata
  (stesso oggetto, due profili?).

### 2. ✔ Scudi — §7.4, pp. 23–30 (lotto 3, fatto)

Fatto il 26 settembre 2026, commit «Lotto 3 del catalogo: scudi (§7.4, pp. 23–30)».

- **Fonte:** `docs/lotti/lotto3-scudi/`:
  - `grezzo/`: 8 CSV di pdfplumber, pp. 23–30;
  - `prosa/`: il §7.4 estratto con `--prosa`, per le schede in prosa;
  - `pulito/scudi.csv`.

  Generatore `tools/lotti/lotto3_scudi.mjs`, dati `data/equipaggiamento/scudi.json`.
- **Estrazione:** pdfplumber trova tutte le 8 tabelle del lotto, senza unirle. Diventano dati
  quattro sottotabelle:
  - §7.4.2 «Protezione requisiti e Integrità» e «Qualità reperibilità e costi», ciascuna
    spezzata su due pagine;
  - la tabella del §7.4.11.

  Le tabelle del §7.4 (taglie, confronto Tonfa e scudi) e del §7.4.1 sono regole, riportate
  nelle note.
- **Righe:**
  - **26 scudi su 26 giusti al primo colpo**, 52 righe delle due sottotabelle del §7.4.2;
  - **16 righe su 16** del §7.4.11.

  Tutte controllate riga per riga sulle immagini delle pp. 23–30. **0 correzioni a mano** sui
  valori delle tabelle. Unica riga spezzata («Tonfa … +2 / Difensiva»), nella tabella di
  confronto del §7.4, che non entra nei dati.
- **Prosa (scritto a mano dal testo):** gli scudi corporativi §7.4.4–7.4.10 non hanno tabelle
  proprie. Le proprietà di ogni scudo sono **trascritte a mano** dalla sua scheda (elenco
  `PROPRIETA` nel generatore). I testi delle proprietà sono quelli del §7.4.3 parola per parola.
  Le note sono il primo paragrafo di ogni scheda, preso in automatico dal testo in prosa.
- **Regole nuove del generatore:**
  1. i record si riuniscono sulla cella «Catalogo — Modello», che si divide in catalogo e nome;
  2. la tabella §7.4.11 raggruppa i modelli per nome breve («BLEU e CSS», «Scudi Cybertronic
     senza SIN»). L'assegnazione ai modelli è scritta a mano, e il generatore controlla che ogni
     scudo ne abbia una e che nessuna riga resti non assegnata;
  3. le righe «con SIN», «con Scudo Magico» e la condizione di Contenimento diventano
     `profili_alternativi`, così come Antiesplosione 1 (AR +4 contro esplosioni);
  4. paragrafi del testo in prosa: un paragrafo finisce con una riga corta (meno di 90
     caratteri) chiusa da un punto. Per l'ultimo scudo di ogni sezione i paragrafi successivi
     sono note della sezione (`note_per_catalogo`), salvo le Guardie Sacre, che hanno più
     paragrafi propri.

     L'euristica ha sbagliato una volta: nella scheda §7.4.1 del Punisher una riga piena finisce
     con un punto. Corretto nel generatore fermando il testo del §7.4.1 alla frase «Le armature,
     i rinforzi…», che è una regola generale.
- **Schema esteso:**
  - `taglia`, `parata` { ravvicinata, distanza };
  - `profili_alternativi` [{ condizione, parata?, ar? }];
  - `attacco` { abilita, mani, danno, portata_q, condizione?, note } per Punisher e Guardie
    Sacre;
  - `mov`, `note_per_catalogo`;
  - formule di danno con somme di dadi («1d6+1d4»).

  In `regole.json`: `difese.parata_distanza_arma` = −8 (Giocatore §5.9), per la Parata a
  distanza con un'arma.
- **Calcolo:**
  - la Parata con lo Scudo è già calcolata: Difese con l'equipaggiamento, modificatori del
    §7.4.11, FOR insufficiente (§7.1.6), anche per i profili alternativi;
  - la FOR mancante dello Scudo tocca solo Parate e attacchi con lo Scudo (non Agilità e
    Difese, come per le armature);
  - gli Scudi enormi tolgono 1 Q al MOV;
  - due scudi imbracciati danno un avviso;
  - l'attacco del Punisher (e la lama delle Guardie Sacre) compare fra le armi;
  - le armi ravvicinate mostrano anche la Parata a distanza (−8 VA).
- **Dubbi per Davide:** nessuna domanda aperta. Un errata di nomenclatura in
  `docs/per-davide.md` (B).

### 3. Cataloghi corporativi

In ordine di peso:

- ✔ **Armi ravvicinate corporative** — §7.1.9, pp. 11–17 (lotto 4, fatto il 26 settembre 2026,
  commit «Lotto 4 del catalogo: armi ravvicinate corporative»).
  - **Fonte:** `docs/lotti/lotto4-armi-ravvicinate-corporative/`:
    - `grezzo/`: 16 CSV, pp. 11–17;
    - `prosa/`: il §7.1 da `--prosa`;
    - `pulito/armi_ravvicinate_corporative.csv`.

    Generatore `tools/lotti/lotto4_armi_ravvicinate_corporative.mjs`, dati
    `data/equipaggiamento/armi_corporative.json` (39 armi).
  - **Estrazione:** pdfplumber trova tutte le 14 tabelle del §7.1.9, due per Corporazione
    (profilo e dati economici), senza unirle. **40 righe su 40 giuste al primo colpo**,
    controllate sulle immagini delle pp. 11–17; **0 correzioni a mano**.

    Unico errore strutturale: l'intestazione «Costo / proposto» su due righe, in 6 tabelle su 7.
    La riga «proposto» si salta.

    Lo Scudo delle Guardie Sacre (40ª riga) è già in `scudi.json`.
  - **Prosa:** le righe «Proprietà e impiego» di ogni modello («Nome. Proprietà: …. Attivazione:
    …. Manovre compatibili: ….») si leggono con un'espressione regolare, **39 su 39** senza
    correzioni. La nota di ogni modello va dall'inizio della sua riga all'inizio della
    successiva, così comprende frasi come «Il raccordo con il KI sarà integrato
    successivamente». I paragrafi dopo le righe dei modelli sono note del catalogo
    (`note_per_catalogo`, mostrate nel tooltip).
  - **Regole nuove del generatore:**
    1. le Corporazioni sono titoli fuori dalle tabelle, elencate in ordine e controllate nel
       numero (7);
    2. «Imperiali» diventa «Imperial», come nel §7.4.8 e nel §7.14;
    3. ogni proprietà deve avere una definizione, altrimenti il generatore si ferma. Sono 15
       tipi, tutti con il testo del §7.1.3–7.1.4 o del Giocatore §5.24;
    4. «Attivazione: +XdY Natura; 5 cariche a cella | 5 PM; Sintonizzazione N» diventa
       `attivazione` { danno_extra, natura, sintonizzazione } e `munizioni` { capacita,
       unita: cariche | PM };
    5. **la famiglia (e la Specializzazione) non è nelle tabelle corporative**: si assegna solo
       se il nome contiene una famiglia commerciale o un suo nome alternativo (§7.1.1). Gli altri
       12 modelli restano «Da classificare», senza Specializzazione, con `TODO(Davide)`.
  - **Schema esteso:**
    - effetto `va` (Precisa X, nel VA per colpire);
    - `attivazione`, `manovre`, `natura_danno`;
    - `munizioni.unita` (colpi, cariche, PM): le cariche delle celle e i PM delle riserve usano
      il contatore di sessione, con «Ricarica» che sostituisce la cella.
  - **Dubbi per Davide:** famiglia di 12 armi (A.9); danno della lama dello Scudo delle Guardie
    Sacre, diverso fra §7.1.9 e §7.4.10 (A.10). Per quest'ultimo `scudi.json` ora ha
    l'attacco senza lama dalla tabella del §7.1.9 (1d6+1).

- ✔ **Armi a distanza corporative** — §7.8, pp. 36–52 (lotto 5, fatto il 26 settembre 2026,
  commit «Lotto 5 del catalogo: armi a distanza corporative»).
  - **Fonte:** `docs/lotti/lotto5-armi-distanza-corporative/`:
    - `grezzo/`: i CSV delle pp. 37–52;
    - `prosa/`: il §7.8 da `--prosa`;
    - `pulito/armi_distanza_corporative.csv`.

    Generatore `tools/lotti/lotto5_armi_distanza_corporative.mjs`, dati
    `data/equipaggiamento/armi_distanza_corporative.json`.
  - **Estrazione:** 100 righe (81 armi e 19 moduli integrati) più le 6 munizioni di riferimento
    dei lanciatori (p. 52). **106 righe su 106 giuste al primo colpo**, controllate sulle immagini
    delle pp. 36–52; **0 correzioni a mano** sui valori.

    Errori strutturali, tutti risolti da regole generiche:
    - tre sottotabelle impilate per gruppo (profilo, impiego, dati economici), a volte spezzate
      fra due pagine (Bolter 09, Kensai/Dragonfire/Daimyo);
    - 9 righe di continuazione: la cella «Come arma» dei moduli va a capo in 3 tabelle;
    - separatore delle migliaia anche in Max Q e CC («1.700», «1.000»);
    - intestazione «Costo» oppure «Costo proposto»; segni meno misti «-» e «−».
  - **Regole nuove del generatore:**
    1. una riga con meno celle della precedente, tutte in colonne dove la precedente ha testo, è
       una continuazione e si unisce per indice di colonna;
    2. Corporazione e gruppo vengono dai titoli del testo in prosa: il gruppo è la riga prima
       dell'intestazione «Modello Danno AC…»;
    3. i moduli integrati (PI «Condivisi», REP «Come arma», Costo «Incluso») diventano oggetti con
       `modulo_di` e PI/reperibilità/costo null. L'arma principale si ricava dal nome
       («Lanciagranate <arma>»);
    4. la munizione di riferimento viene dalla frase del modello oppure dal paragrafo
       «Compatibilità dei nuovi cataloghi»;
    5. la Specializzazione segue un ordine di regole scritto nel generatore: nome, munizione,
       proprietà Plasma, gruppo, testo, analogia con il §7.7. Il conteggio è: 25 per nome, 1 per
       munizione, 2 per proprietà, 19 per gruppo, 11 per testo, 26 per analogia, 16 da
       classificare.
  - **Schema esteso:**
    - `modulo_di`: il modulo non compare nella cascata né nella ricerca. Con l'arma impugnata
      diventa un secondo profilo d'attacco, con un contatore munizioni proprio (`uid:modulo`);
    - `munizioni_riferimento` nel file: danno, AC e RS dei lanciatori «Munizione», mostrati nella
      scheda, nella stampa e nel tooltip. Servono anche per il Lanciagranate e il Lanciarazzi
      commerciali;
    - il validatore controlla `modulo_di`, i campi null dei moduli e la munizione di riferimento.
  - **Dubbi per Davide:** Specializzazione di 16 armi (A.11) e conferma di quelle date per
    analogia con il §7.7 (A.12). In B aggiunto «Imperiali» anche nel §7.8.
- ✔ **Armature corporative** — §7.11.5–7.17.5, pp. 64–103 (lotto 6, fatto il 26 settembre 2026,
  commit «Lotto 6 del catalogo: armature corporative»). Comprende Bauhaus con gli esoscheletri
  (§7.11.5–7.11.6), Alleanza (§7.11.7), Capitol (§7.13.1–7.13.3), Imperial (§7.14.1–7.14.3),
  Cybertronic (§7.15.2–7.15.3), Mishima (§7.16.1–7.16.4) e Fratellanza (§7.17.2–7.17.5).
  - **Fonte:** `docs/lotti/lotto6-armature-corporative/`:
    - `grezzo/`: i 55 CSV delle pp. 63–103, di cui il lotto legge 22;
    - `prosa/`: i paragrafi 7.11–7.17 da `--prosa`;
    - `pulito/armature_corporative.csv`.

    Generatore `tools/lotti/lotto6_armature_corporative.mjs`, dati
    `data/equipaggiamento/armature_corporative.json` (83 armature).
  - **Estrazione:** **166 righe su 166 giuste al primo colpo**, cioè profilo e dati economici di
    83 modelli; **0 correzioni a mano** sui valori.
    - Il generatore controlla ogni riga contro il testo in prosa, che è un'estrazione
      indipendente dello stesso PDF: si ferma se una riga non compare identica.
    - 17 righe di continuazione unite: «AR / magica» degli esoscheletri, «Pesante /
      servoassistita» della Felis e i nomi lunghi nelle tabelle dei rinforzi.
  - **Penalità effettive:** categoria del §7.11.1 più gli effetti delle proprietà. Gli effetti
    sono: Assetto da pattuglia/incursione/anfibio → MOV 0; Articolazione d'assalto → +1 ravv.;
    Articolazione da/di tiro → +1 dist.; Articolazione da ricognizione → Agilità 0; Assetto
    mistico X → +X al lancio.
    - 77 modelli calcolati così; le 14 righe della tabella del §7.17.4 (Fratellanza) tornano
      tutte.
    - Le armature servoassistite (Felis, Powersuit, Shoa Ace Custom, Demonhunter) usano le
      tabelle del manuale, con il profilo a sistema spento come `profili_alternativi`.
    - Gli esoscheletri Bauhaus usano MOV della tabella e −5 al lancio (§7.11.6).
  - **Proprietà:** 81 modelli dal testo e 2 scritti a mano (gli esoscheletri Bauhaus, che le
    elencano nel testo comune).
    - Per Bauhaus e Alleanza vale solo la dichiarazione «Proprietà: …», perché il testo nomina
      anche proprietà assenti («senza Articolazione d'assalto»).
    - Le definizioni sono quelle del §7.11.4, del §7.16.3 e del §7.17.1. 18 proprietà proprie
      di un modello (SIN, Protezione climatica, Tenuta subacquea…) prendono le frasi del modello
      che le spiegano.
  - **Rinforzi ammessi:** dalle tabelle Capitol, Imperial e Mishima; i nomi abbreviati si
    confrontano con il nome corto o con una parola unica del modello. Per gli altri cataloghi
    dalle frasi del testo. I kit di rinforzo non sono ancora oggetti del catalogo (vedi «Da
    completare»).
  - **Restano testo, senza calcolo:** bonus condizionati (Mimetismo, SIN, Antiesplosione,
    Colpo assistito a sistema acceso, Imbracatura da artigliere) e le regole di pilotaggio degli
    esoscheletri. Le tabelle di reparto e di assegnazione restano nella prosa.
  - **Schema esteso:** `rinforzi_ammessi` e `profili_alternativi` (FOR e penalità) validati
    anche per le armature; `supporti` degli esoscheletri. Scheda, stampa e tooltip mostrano il
    profilo a sistema spento, le penalità effettive e i rinforzi ammessi.
  - **Dubbi per Davide:** nessuno nuovo. In B tre incoerenze di nome (Articolazione da/di tiro,
    Manutenzione semplice/agevolata, titolo Bauhaus senza virgola).
- ✔ **Corredi e dispositivi corporativi** — §7.12–7.17.7, pp. 69–105 (lotto 7, fatto il 26 settembre
  2026, commit «Lotto 7 del catalogo: corredi e dispositivi corporativi»). Comprende anche i
  corredi dell'Alleanza del §7.12 e l'Iron Mastiff (§7.14.5), che stanno fra i dispositivi.
  - **Fonte:** `docs/lotti/lotto7-corredi-dispositivi/`:
    - `grezzo/`: i CSV delle pp. 69–106, di cui il lotto legge 24;
    - `prosa/`: i paragrafi 7.12–7.17;
    - `pulito/corredi_dispositivi.csv`.

    Generatore `tools/lotti/lotto7_corredi_dispositivi.mjs`, dati
    `data/equipaggiamento/corredi_dispositivi.json`.
  - **Oggetti:** 60 in tutto:
    - 39 corredi professionali (tipo `altro`) e 5 Kit trauma (tipo `sanitario`, 5
      applicazioni);
    - propulsore Banshee, 2 paracadute e Jet-Chute, Interfaccia Neurale e 5 moduli IAS (tipo
      `accessorio`);
    - esoscheletro APE (tipo `armatura`) e Iron Mastiff (tipo `altro`, con le sue tabelle);
    - Howler, Rainy Dayer, Granata fumogena ed elettroshock (tipo `arma_distanza`).

    La Frammentazione del §7.14.7 è la Granata a frammentazione commerciale e non si duplica.
  - **Estrazione:** 60 righe di catalogo; **0 correzioni a mano**.
    - Le 96 righe di dati delle tabelle lette compaiono tutte identiche nel testo in prosa; il
      generatore si ferma altrimenti.
    - 16 righe di continuazione unite.
    - Qualità, PS e REP assenti da alcune tabelle vengono dalla frase comune del paragrafo, che
      il generatore controlla.
  - **Regole nuove del generatore:**
    1. tabelle senza colonna del nome e tabelle con due intestazioni impilate;
    2. note prese dal paragrafo sotto il titolo (corredi, armi, moduli) oppure da intervalli
       di righe riconosciuti da prime e ultime parole (dispositivi), togliendo le righe che
       ripetono una tabella;
    3. le tabelle «Voce | Regola», esiti, configurazioni e modalità diventano `tabelle`;
    4. id con il catalogo quando lo stesso nome esiste in più cataloghi.
  - **Calcolo nuovo:**
    - **SIN (§7.15.1):** `sin_armi` elenca 15 armi dei lotti 4 e 5. Con l'Interfaccia Neurale
      «in uso» aggiunge +SIN al VA per colpire, moduli compresi.
    - **Rainy Dayer:** `scudo_integrato`, cioè AR +1 e Parata 0 / −4 come Scudo quando è
      impugnata.
    - **Howler:** da polso, `mani: 0`.
    - **APE:** penalità su una singola Abilità (`penalita.abilita`: Furtività −2).
    - Granata fumogena senza danno (`nessun_danno`).
  - **Restano testo:** i +2 VA degli strumenti Professionali (solo per le attività descritte),
    le regole di volo e atterraggio, i moduli IAS, il SIN delle armature, le dotazioni per
    reparto e gli esempi di costo.
  - **Dubbi per Davide:** Specializzazione della Rainy Dayer (A.13).

### 4. ✔ Accessori delle armi — §7.3, pp. 19–22 (lotto 8, fatto)

Fatto il 26 settembre 2026, commit «Lotto 8 del catalogo: accessori delle armi».

- **Fonte:** `docs/lotti/lotto8-accessori-armi/`:
  - `grezzo/`: 6 CSV, pp. 19–22;
  - `prosa/`: il §7.3;
  - `pulito/accessori_armi.csv`.

  Generatore `tools/lotti/lotto8_accessori_armi.mjs`, dati `data/equipaggiamento/accessori_armi.json`.
- **Oggetti:** 15 in tutto:
  - 3 mirini;
  - Attenuatore, Smorzatore e Silenziatore, più le versioni rinforzate per mitragliatori;
  - Bipiede e Treppiede;
  - Torcia tattica, 2 moduli di visione e la batteria di servizio.
- **Estrazione:** pdfplumber trova tutte le 6 tabelle. **20 righe su 20 giuste al primo
  colpo**, ritrovate nel testo in prosa dal generatore; **0 correzioni a mano**. 6 celle andate a
  capo unite.
- **Regole nuove del generatore:**
  1. le due tabelle dei mirini si riuniscono per nome senza maiuscole («Di Precisione» / «Di
     precisione»);
  2. le versioni rinforzate si derivano dalla frase «stessi modificatori, costo doppio» e «i
     rinforzati hanno PI 4»;
  3. Qualità, PS e PI comuni dalle frasi del paragrafo;
  4. il controllo incrociato con la prosa accetta le celle spezzate in mezzo alle righe vicine:
     le parole della riga devono stare vicino al nome.
- **Schema e calcolo:**
  - `si_monta_su` generalizza `montato_su`: arma, mirino (moduli di visione), armatura (per i
    rinforzi).
  - `effetto_arma` (Smorzatore −1 VA; Silenziatore −2 VA e −1 danno) entra sempre nel VA e nel
    danno dell'arma impugnata.
  - `mirino` mostra la riduzione della penalità di distanza e il suo limite.
  - `bonus_condizionato` (Bipiede +1, Treppiede +2) mostra il VA in appoggio accanto a quello
    normale.
  - `gruppo_esclusivo`: un solo mirino, un solo dispositivo di rumore, un solo supporto e un
    solo modulo per mirino; gli altri danno un avviso.
  - La lista dell'equipaggiamento propone come «Montato su» solo gli oggetti compatibili.
- **Restano testo:** la compatibilità per famiglia o modello («predisposti», revolver esclusi…),
  la preparazione in Azioni, gli effetti di luce e visione.
- **Dubbi per Davide:** nessuno.

### 5. ✔ Munizioni e alimentazioni — §7.20, pp. 114–121 (lotto 10, fatto)

Fatto il 26 settembre 2026, commit «Lotto 10 del catalogo: munizioni e alimentazioni».

- **Fonte:** `docs/lotti/lotto10-munizioni/`:
  - `grezzo/`: 17 CSV, pp. 114–121;
  - `prosa/`: il §7.20;
  - `pulito/munizioni.csv`.

  Generatore `tools/lotti/lotto10_munizioni.mjs`, dati `data/equipaggiamento/munizioni.json`.
- **Oggetti:** 49 di tipo `munizioni`, più il caricatore da campo:
  - 7 famiglie ordinarie e 14 varianti speciali per famiglia;
  - cartucce Nimrod, ordinarie e con le 4 varianti;
  - caricatori vuoti e contenitori;
  - granata a frammentazione pesante e 4 razzi;
  - 4 celle;
  - combustibile e 5 serbatoi;
  - 2 dardi chimici.

  Granata standard, Fumogena ed Elettroshock sono già nel catalogo (lotti 2 e 7) e non si
  duplicano.
- **Estrazione:** pdfplumber trova tutte le 17 tabelle; la tabella dei prezzi speciali è
  spezzata su due pagine. **93 righe su 93 giuste al primo colpo**, ritrovate nel testo in
  prosa; **0 correzioni a mano** sui dati del lotto.
- **Controlli incrociati (107, tutti superati):**
  - prezzi speciali = ordinario × moltiplicatore, Nimrod compreso;
  - costi per colpo delle tabelle del §7.20.9 = costi unitari del §7.20.1;
  - granate e razzi = munizioni di riferimento e granate già estratte nei lotti 2, 5 e 7;
  - capacità di celle, serbatoi e dardi = capacità delle armi compatibili.
- **Un errore trovato nei dati del lotto 1:** il Tirapugni concussivo non aveva le 5 cariche
  né l'attivazione strutturate, che pure sono nel suo testo (§7.1.1). Il §7.20.5 lo mette fra
  le 17 armi della cella ravvicinata e il controllo si è fermato. Corretto a mano in
  `armi.json`: `munizioni` 5 cariche e `attivazione` +1d6 Concussivo, come le armi corporative
  a cella.
- **Regole nuove del generatore:**
  1. nomi delle armi confrontati senza spazi e trattini, dentro il Catalogo della riga («CAR 24»
     → CAR24, «Ronin 45 AP» → Ronin 45AP); un alias («Pistola Punisher» → Punisher);
  2. le armi della cella ravvicinata si ricavano dai dati (cella da 5 cariche) e si controllano
     nel numero (17) e nei cataloghi della tabella;
  3. catalogo di celle, serbatoi e razzi = catalogo delle armi compatibili, quando è uno solo.
- **Schema e calcolo:**
  - `munizione` (famiglia, variante, confezione), `esplosivo` (danno, AC, RS), `cella`
    (capacità, unità, costo di ricarica);
  - `compatibile_con` vale anche per le munizioni (verso le armi);
  - `munizioni_armi`: la tabella del §7.20.9 con 71 armi corporative, più 14 armi commerciali
    (aggiunte al collaudo del 26 settembre 2026). Il §7.20.1 dà la munizione di riferimento
    delle armi commerciali per categoria: pistole → proiettili da pistola; carabine, fucili
    d'assalto e di precisione, mitragliatore leggero → da fucile; mitragliatore pesante →
    pesanti; fucile a pompa e doppietta → pallini; arco → frecce; balestre → dardi. Prima
    mancavano e la scheda non mostrava le scorte compatibili.
  - Nella scheda dell'arma impugnata compaiono la famiglia di munizioni e le scorte
    compatibili della lista, con la quantità.
- **Restano testo:** gli effetti delle varianti (Perforante sull'AR del bersaglio, Incendiaria
  −1 al danno, Concussiva) e dei dardi. Il contatore di sessione non sa quale variante è
  caricata; il caricamento misto si annota a mano, come dice il manuale.
- **Dubbi per Davide:** nessuno.

### 6. ✔ Equipaggiamento sanitario — §7.19, pp. 109–113 (lotto 11, fatto)

Fatto il 26 settembre 2026, commit «Lotto 11 del catalogo: equipaggiamento sanitario».

- **Fonte:** `docs/lotti/lotto11-sanitario/`:
  - `grezzo/`: 9 CSV, pp. 109–113;
  - `prosa/`: il §7.19;
  - `pulito/sanitario.csv`.

  Generatore `tools/lotti/lotto11_sanitario.mjs`, dati `data/equipaggiamento/sanitario.json`.
- **Oggetti:** 16 in tutto:
  - 3 kit di pronto soccorso: improvvisato, standard, professionale;
  - 3 cartucce;
  - 3 UMC (tipo `accessorio`, montate su un'armatura);
  - iniettore, pistola sanitaria e Spray;
  - 2 scanner, kit chirurgico e postazione medica.
- **Estrazione:** 28 righe, ritrovate nel testo in prosa.
  - La tabella degli esiti dei kit (p. 109) esce storta: pdfplumber sposta 10 celle di una o
    due colonne e ne stacca due frammenti in tabelle a parte.
  - **Regola nuova:** ogni cella va alla colonna dell'intestazione più vicina, e i frammenti
    devono risultare già contenuti nella tabella ricostruita. Con questa regola le 3 righe
    tornano giuste; **0 correzioni a mano**.
- **Controlli incrociati (54, tutti superati):**
  - i 5 Kit trauma dei cataloghi (lotto 7) hanno esattamente il profilo Professionale;
  - i carichi di esempio delle UMC tornano con i prezzi delle cartucce, entro la capacità;
  - i bonus degli strumenti compaiono nel testo di ogni dispositivo.
- **Modalità tavolo:** `applicazioni` (con `nome_applicazioni`: dosi, set) diventa un contatore
  nella nuova sezione «Sanitario» della tab Combattimento, con «Ricarica» e «Riserve» come per
  le armi. Vale per kit, Kit trauma, Spray, kit chirurgico, postazione e Corredo Dr. Diana. La
  capacità è applicazioni × quantità.
- **Schema:** `strumenti` (modificatore alla Prova indicata: promemoria, non entra nei VA),
  `esiti` (successo e Magistrale), `capacita_cartucce`, `effetto`, `uno_per_personaggio` (UMC:
  avviso se ne sono in uso due).
- **Restano testo:** procedure di medicazione, limite di una somministrazione rapida per Round,
  protocolli automatici delle UMC, carichi misti di cartucce.
- **Dubbi per Davide:** nessuno.

### 7. ✔ Artefatti — §7.5, pp. 30–31; §7.10, pp. 58–60 (lotto 12, fatto)

Fatto il 26 settembre 2026, commit «Lotto 12 del catalogo: artefatti e sintonizzazione».

- **Fonte:** `docs/lotti/lotto12-artefatti/`:
  - `grezzo/`: le 2 tabelle del §7.10; le altre delle stesse pagine sono di lotti già fatti o
    del §7.9;
  - `prosa/`: §7.5, §7.10 e la scheda 22.6 del Manuale della Magia.

  Generatore `tools/lotti/lotto12_artefatti.mjs`, dati `data/equipaggiamento/artefatti.json`.
- **Contenuto:** è un lotto di regole più che di oggetti.
  - `sintonizzazione`: capacità per Gradi complessivi (4–9), +2 di Architetto TecnoMistico,
    potenza → costo (Comune 1 … Leggendaria 6), tipologie. La tabella della potenza non è
    riconosciuta da pdfplumber e si legge dal testo in prosa.
  - `artefatti_catalogo`: tipologia, potenza, costo e riserva dei 6 profili con riserva mistica
    già nel catalogo (5 armi del lotto 4, Scudo delle Guardie Sacre del lotto 3).
  - 4 batterie da 5 PM (Chroma Rosso, Blu, Verde, Bianco), che il §7.10 cita come esempio di
    potenza. Senza prezzo: `TODO(Davide)`.
- **Controlli incrociati (53, tutti superati):**
  - capacità del Taumaturgo = capacità ordinaria; Architetto = +2 a ogni Grado;
  - Sintonizzazione e riserva dei lotti 3 e 4 = §7.5.1;
  - ogni costo di sintonizzazione = potenza dichiarata. Questo controllo è anche nel
    validatore, così una modifica di Davide incoerente viene segnalata.
  - **0 correzioni a mano.**
- **Calcolo e scheda:**
  - capacità di sintonizzazione del personaggio dalla somma dei Gradi di Classe e dal Talento
    Architetto TecnoMistico;
  - casella «Sintonizzato» sugli Artefatti della lista (scelta salvata nella voce);
  - somma dei costi e avviso oltre la capacità;
  - sezione «Artefatti e sintonizzazione» nella tab Combattimento, con il contatore dei PM per
    le batterie e lo Scudo delle Guardie Sacre. Le armi con riserva avevano già il loro.
- **Restano testo:** riduzione per Umanità (§5.21, l'app non la registra ancora: la capacità
  mostrata è quella prima della riduzione), analisi e identificazione, ricarica dei PM con i
  rapporti del §7.5.1, benefici artigianali e carico manuale del §7.5.
- **Dubbi per Davide:** prezzo e profilo delle batterie (A.14).

### 8. Resto del manuale

- ✔ **Prezzi di riferimento delle armi** — §7.9, pp. 53–58: **controllo incrociato** dei costi
  estratti dagli altri lotti, non dati nuovi (collaudo del 26 settembre 2026).
  - **Fonte:** `docs/lotti/collaudo-prezzi/`, script `tools/lotti/collaudo_prezzi.mjs`.
  - **Esito:** 146 righe confrontate, **146 uguali, 0 differenze, 0 correzioni**.
  - Al §7.9 mancano le tabelle a distanza di Fratellanza, Imperiali e Mishima: segnalato in
    `per-davide.md`, sezione B.
- **Integrità degli oggetti** — §7.2.1, p. 18: regole di PI e PS INT. Servirà quando la
  modalità tavolo terrà i PI attuali degli oggetti.
- ✔ **Unità robotiche** — §7.18, pp. 107–108 (lotto 14, fatto il 26 settembre 2026, commit
  «Lotto 14 del catalogo: unità robotiche»).
  - **Fonte:** `docs/lotti/lotto14-unita-robotiche/`, generatore
    `tools/lotti/lotto14_unita_robotiche.mjs`, dati `data/equipaggiamento/unita_robotiche.json`.
  - **Scelta:** entrano nel catalogo come l'Iron Mastiff del lotto 7, cioè oggetti «altro» della
    famiglia «Unità robotiche» con profilo, VA del robot e configurazioni in `tabelle`. Il
    Generatore RF366 è un modulo del robot: la compatibilità resta testo.
  - **Estrazione:** 3 tabelle, una con due tabelle impilate (profilo e Abilità | VA). **15 righe
    su 15 giuste**, ritrovate nel testo; **0 correzioni a mano**.
  - **Controllo incrociato:** il costo di ogni configurazione (Fuciliere, Supporto, Supporto
    pesante) = telaio 75.000 + prezzo dell'arma già nel catalogo (lotto 5).
  - **Restano da integrare nel manuale:** Prove Salvezza del robot, tempi di ricarica, ricambi
    energetici (il §7.18.1 le rimanda). Segnalato in `per-davide.md`, sezione D.
  - **Dubbi per Davide:** nessuno.
- **Contenuti ancora da sviluppare** — §7.6, p. 32: niente da estrarre; da ricontrollare alla
  prossima edizione.
- ✔ **Modelli corporativi di base** — Armamenti v0.52 §7.22 (E&L A.5.30), fatto il 27 settembre
  2026. 41 profili nuovi (23 fucili, 8 armature, 10 scudi) trascritti dalle tabelle del Doc nel
  generatore `tools/lotti/lotto_7_22_corporativi_base.mjs`, che riempie anche
  `data/dotazioni.json` → `corporativi.abbinamenti` (48 corrispondenze). I 7 modelli già presenti
  conservano i loro valori. Famiglie nuove: «Fucili di base», «Armature di base».
- ✔ **Elmetti e modifiche** — Armamenti v0.52 §7.21, fatto il 27 settembre 2026 (lotto elmetti).
  - **Fonte:** Google Doc v0.52, testo in `docs/manuali-txt/armamenti.md` (non il PDF 0.50).
    Generatore `tools/lotti/lotto_elmetti.mjs`, dati `data/equipaggiamento/elmetti.json`, riga in
    `index.json`. 31 oggetti: elmetto standard di ricambio (§7.21.4), 15 modifiche commerciali,
    15 elmetti corporativi (§7.21.5, Commando §7.21.6).
  - **Tipo nuovo `elmetto`** (stati Indossato / Nello zaino, gruppo con il colore `--cat-elmetti`).
    Le modifiche sono accessori con `si_monta_su: ["elmetto", "armatura"]` e `modifica_elmetto`:
    contano solo montate su un elmetto indossato o sull'armatura indossata (il suo elmetto standard).
  - **Regole d'uso** in `regole.json → elmetti` (frasi verificate): nessuna AR, un solo elmetto
    indossato (avviso), lo standard è compreso nell'armatura, nessun requisito FOR né penalità.
    Il manuale le dà tutte: nessuna domanda per Davide.
  - **Effetti:** schema esteso (`docs/effetti-oggetti.md`): Assistenza offensiva → `attacco`,
    Allerta tattica → `iniziativa`, Filtro/Antibagliore/Protezione acustica ed Elusione → `salvezza`,
    Sensori → `va` situazionale su Percezione, Interfaccia di pilotaggio → `va` d'uso specifico,
    Assistenza difensiva → `va` su Difese. Copie dello stesso beneficio non si sommano (`beneficio`).
    Visione notturna e termica e SIN percettivo restano testo (il SIN richiede l'innesto).
  - **Scostamenti:** nessun peso (A.30); le modifiche non hanno PI né Qualità propri
    («condividono l'Integrità dell'elmetto», §7.21.3).
- ✔ **Proprietà delle armature corporative** — Armamenti v0.52 §7.11–§7.17, §7.22.5, fatto il
  27 settembre 2026. Censimento e classificazione in `docs/proprieta-armature.md`; generatore
  `tools/lotti/lotto_proprieta_armature.py`, che scrive `effetti` in `armature_corporative.json`
  (stesso file, stesso ordine, nessun campo tolto) e `proprieta_gestite` in `armature.json`.
  - **Scostamento:** le armature corporative sono 91 (non 51): tutte coperte; 88 ricevono effetti.
  - **38 proprietà distinte:** 26 numeriche, 4 testuali (promemoria), 8 già gestite dalle penalità
    effettive o dai PI, 0 rimandate.
  - **Frasi:** per le Contromisure e Colpo assistito il testo della proprietà nei dati è un
    riassunto del generatore del lotto 6: la «condizione» usa la frase del §7.11.4 e del §7.14.

## Regole di ogni lotto

- **Metodo:** CSV grezzo (`--tabelle`), CSV pulito controllato riga per riga sulle immagini
  delle pagine, poi generatore in `tools/lotti/` come `lotto1_pilota.mjs`. Da lì in poi la
  fonte è il JSON.
- **Campi comuni a ogni oggetto:** `id`, `nome`, `tipo`, `catalogo`, `famiglia`,
  `nomi_alternativi`, `note_manuale`, `paragrafo`, `versione_manuale`.
- **Effetti strutturati solo per ciò che la scheda calcola** (come `Difensiva +2` →
  `{ parata_va: 2 }`); il resto resta testo del manuale.
- **Ambiguità:** non inventare, mettere `TODO(Davide)` e annotare la risposta in
  `docs/risposte-master.md`.

- ✔ **Armamenti 0.54: KEP 808 e Colt Hammershot** — fatto il 29 settembre 2026 (voce M9 di
  `docs/ricognizione-2026-09-28.md`). Generatore `tools/lotti/lotto_armamenti_054.mjs`
  (idempotente, frasi controllate nel testo del Doc): due armi in `armi_distanza_corporative.json`
  nell'ordine del §7.8 (dopo Hellblazer e Jemson 45), la cella KEP 808 in `munizioni.json`
  (§7.20.5) e la Hammershot fra le armi a proiettili da pistola (§7.20.9).
  - **Specializzazioni:** KEP 808 → Armi al Plasma (§7.7: «utilizzano soltanto la
    Specializzazione Armi al Plasma»); Hammershot → Pistole.
  - **Ricarica:** Hammershot a tamburo (famiglia Revolver, E&L 19: una operazione riempie il
    tamburo); KEP 808 a cella.

## Manuale dell'Equipaggiamento 0.3: ricognizione dei capitoli 2, 3, 4 e 6 (29/09/2026)

Fonte: Google Doc «Manuale dell'Equipaggiamento», edizione 0.3 (testo in `docs/manuali-txt/equipaggiamento.md`, identico alla versione del 29/09 13:02 UTC). I capitoli 5, 7 e 8 non sono ancora scritti. Scheda standard del §1.10: si riportano solo i campi pertinenti; un dato necessario ma non definito «verrà integrato» e non vale 0 (§1.11, E&L 4 e 15). Nei dati: campo assente, mai 0.

| Cap. | Sezioni | Voci | Campi nelle schede | Effetti numerici |
|---|---|---|---|---|
| 2 Dotazioni personali | 2.1 Contenitori e trasporto (6), 2.3 Illuminazione (4 + batteria di servizio), 2.4 Abbigliamento (6), 2.5 Oggetti quotidiani (3) | 19 (+ la batteria di servizio, già nel catalogo come `accessori_armi:batteria-di-servizio`) | peso, costo, REP (tutte CO); niente Qualità, PS Integrità, PI | Abiti da viaggio +1 Atletica (uso); Abiti eleganti +1 Oratoria (situazionale); Completo invernale e per caldo estremo +2 PS Tempra (uso) |
| 3 Esplorazione e sopravvivenza | 3.1 Accampamento (6), 3.2 Viveri e cucina (7), 3.3 Orientamento e arrampicata (3), 3.4 Corredo di sopravvivenza ambientale (1), 3.5 Protezioni ambientali (4) | 21 | peso, costo, REP; Qualità, PS Integrità e PI solo per Corredo da assalto verticale (6 PI) e Corredo di sopravvivenza ambientale (4 PI) | Sacco a pelo invernale +2 PS Tempra (uso); Corredo di orientamento +1 Sopravvivenza (uso); assalto verticale +2 Atletica (uso); sopravvivenza ambientale +2 Sopravvivenza (situazionale, ambiente scelto); Maschera filtrante +2 PS Tempra (uso); Tuta anticontaminazione +2 PS Tempra (uso) |
| 4 Comunicazione e rilevamento | 4.1 Comunicatori (3), 4.2 Ottiche e visori (4), 4.3 Rilevamento e sorveglianza (4) | 11 | peso, costo, REP; niente Qualità, PS Integrità, PI | Binocolo +1 Percezione (uso: dettagli a distanza) |
| 6 Equipaggiamento sanitario | 6.1 Kit di pronto soccorso, 6.2 Cartucce, 6.3 UMC, 6.4 Dispositivi portatili, 6.5 Diagnostica e chirurgia, 6.6 Farmaci e antidoti | 16 già nel catalogo (`sanitario.json`, dal §7.19 degli Armamenti: stessi valori), 7 nuove (ricariche dei kit Standard e Professionale, contenitore di ricambio dello Spray, set chirurgico e confezione da cinque, Farmaco terapeutico, Antidoto) | PI, Qualità, PS Integrità, REP, costo; **nessun peso** | Farmaco terapeutico +2 PS Tempra (uso); i bonus di kit e diagnostica sono già nel catalogo |

Testuali (promemoria, nessun numero applicabile dalla scheda): contenitori, luci, poncho, tende e telo, materassino, viveri, depuratore, respiratore, comunicatori, monocolo, visori (tolgono penalità di luce: situazioni del tavolo), registratore, videosorveglianza, allarme, rilevatore, antidoto.

### Le 44 voci «senza scheda» di A.34

Trovano la scheda in questi capitoli **27 voci**, più una già nel catalogo degli Armamenti, per un totale di **28**:

- **Cap. 2 (13):** abiti comuni, zaino da viaggio, cintura attrezzata, borraccia, torcia elettrica, corredo personale, utensile multiuso, accendino, abiti eleganti, abiti da viaggio, lampada frontale, lanterna elettrica, completo cerimoniale (profilo Abiti eleganti).
- **Cap. 3 (7):** sacco a pelo, razione da viaggio, tenda da 2 posti, corredo di orientamento, corredo da assalto verticale, corredo di sopravvivenza ambientale, maschera filtrante.
- **Cap. 4 (7):** comunicatore personale, comunicatore da squadra, binocolo, monocolo periscopico, registratore audiovisivo, kit di videosorveglianza, rilevatore ambientale.
- **Cap. 6 (1):** ricarica per il Kit trauma (profilo Professionale: 300 per 5 applicazioni).
- **Già nel catalogo degli Armamenti (1):** corredo di manutenzione da campo (§7.13.7, `corredi_dispositivi`).

**Restano senza scheda 16:** corredo da scasso, da camuffamento, agricolo, artigianale professionale, elettronico e informatico, di ricerca documentale, di analisi da campo, amministrativo, scenico, rituale; cassetta degli attrezzi; strumento musicale portatile; terminale per produzione multimediale; testo dottrinale e simbolo; focus personale. Sono strumenti professionali o dispositivi specialistici: aspettano i capitoli 5 e 7.

### Scelte dei lotti

- Un file per capitolo: `dotazioni_personali.json` (cap. 2), `esplorazione.json` (cap. 3), `comunicazione.json` (cap. 4). Il cap. 6 aggiorna `sanitario.json`, che ha già le stesse schede: niente doppioni.
- Le voci di dotazione (`data/dotazioni.json → oggetti_dotazione`) ricevono `rif` verso la scheda di catalogo. `risolvi()` (`src/equipaggiamento.js`) legge la scheda attraverso `dotazione_id`, quindi anche i personaggi già salvati vedono peso, prezzo, Qualità e PI al caricamento. Il nome resta quello della dotazione, perché porta l'ambiente scelto.
- Se l'effetto della scheda contraddice quello scritto dal §2.16, vale la scheda del manuale e la differenza si segnala.
- Acquistabili: sono voci del catalogo Commerciale con prezzo, quindi entrano da sole negli acquisti iniziali (§2.16.29: «catalogo della propria Corporazione») e nell'elenco dell'inventario al tavolo.

### Stato dei lotti (29/09/2026)

Generatore unico `tools/lotti/lotto_equipaggiamento_03.mjs --capitolo N [--scrivi]`: frasi controllate nel Doc, collegamento delle voci di dotazione, un commit per capitolo.

- ✔ **Cap. 2** — `dotazioni_personali.json`, 19 voci (4 con effetti); 13 voci di dotazione collegate, più il Corredo di manutenzione da campo (Armamenti §7.13.7). Differenza segnalata: Abiti da viaggio, un uso («arrampicata ed equilibrio») diventa due, per combinarsi con il Corredo da assalto verticale e con l'equilibrio di A Terra.
- ✔ **Cap. 3** — `esplorazione.json`, 21 voci (6 con effetti); 7 voci di dotazione collegate.
- ✔ **Cap. 4** — `comunicazione.json`, 11 voci (1 con effetti); 7 voci di dotazione collegate. Differenza segnalata: Binocolo, «situazionale» nel §2.16.7, uso specifico nel §4.2 (vale la scheda).
- ✔ **Cap. 6** — `sanitario.json` aggiornato: le 16 schede del §7.19 coincidono; 7 voci nuove (1 con effetti); 1 voce di dotazione collegata.

## Manuale dell'Equipaggiamento 0.5: lotto 2, capitolo 5 e NEC (01/10/2026)

Fonte: Google Doc del 01/10/2026, 08:32 UTC (`docs/manuali-txt/equipaggiamento.md`). Diff e stato in `docs/diff-manuali-2026-10-01.md`.

- **Catalogo NEC (§5.4).** File `nec.json`, generato da `tools/lotti/lotto_equipaggiamento_05.mjs --parte nec`, con 14 voci:
  - 4 celle: Verde compatto, Rosso, Blu e Verde standard;
  - 6 pacchi: Moduli e Banchi Rosso, Blu e Verde;
  - 2 contenitori vuoti;
  - 2 stazioni di ricarica.

  Ogni NEC ha `nec` (colore, formato, celle, capacità in Lx, erogazione in Lx/h) e `ricarica_costo` (0,01 cr/Lx, controllato dal validatore). Le regole stanno in `regole.json` → `nec` (tariffa, tempi di ricarica e sostituzione, tabella dei tipi, passi al tavolo, frasi controllate).
  - Il caricatore portatile del §5.4.6 è il «Caricatore da campo» degli Armamenti (`munizioni.json`): stessi valori, riceve nome alternativo e trasferimento.
  - Celle d'arma e pacchi dei lanciafiamme restano in `munizioni.json` (Armamenti §§7.20.5–7.20.6).
- **Alimentazione degli oggetti.** Campo `alimentazione`: NEC del catalogo (`nec:…`, oppure `null` con `descrizione` per un NEC dedicato), poi `consumo_lxh` e `autonomia_ore`, oppure `lx_per_uso`, `usi` e `unita_usi` (§5.4.2: «ore oppure cariche»).
  - Campi facoltativi: `componenti` (videosorveglianza, allarme) ed `esterna` (postazioni e laboratorio, che non comprendono il NEC).
  - Scritto nei cap. 2–4 da `lotto_equipaggiamento_03.mjs` (ora alla 0.5) e negli altri oggetti da `--parte alimentazione`: accessori delle armi, scanner, elmetto ASA Recon, corredi degli Armamenti, Cuirassier, postazione medica.
- **Al tavolo.** `src/equipaggiamento.js` → `riserveNec`: Lx per celle e pacchi, ore o usi per gli apparecchi. Nella sessione il blocco `nec`: i nuovi partono carichi e «Nuova sessione» non ricarica. Nella riga dell'Inventario «NEC 87 / 100 ore» con − e + e la provenienza al tooltip.
  - SS, foglio 4: quadratini, uno per unità fino a 50, altrimenti dieci caselle da un decimo («1 casella = 10 ore»). È una scelta di presentazione, non una regola.
- **Strumenti professionali** (§§5.1–5.3, 5.5–5.8). File `strumenti_professionali.json`, `--parte strumenti`: 29 voci, 12 con effetti nello schema (uso specifico accanto all'Abilità; Telo mimetico situazionale; Piede di porco +2 FOR per fare leva).
  - Corredo di manutenzione da campo e Valigetta ASA restano le schede degli Armamenti, con l'alimentazione.
  - Il Focus personale semplice (§5.8) è a catalogo.
  - Collegate 13 voci di dotazione (A.34). Restano senza scheda il Corredo agricolo Standard e lo Strumento musicale portatile (A.65).
- **Cap. 2–4 alla 0.5.** Alimentazione NEC; §3.2 con il NEC Rosso del fornello (10 preparazioni; la «Cartuccia di combustibile» è ora `nec:rosso-standard`); §3.6 «Mobilità e recupero» nuovo (4 voci); frase sulla riservatezza dei comunicatori. Il cap. 6 resta alla 0.3 (lotto 4).
- **Sezioni dell'Inventario.** «NEC e stazioni di ricarica» dopo le munizioni; «Strumenti professionali» dopo la comunicazione (`src/palette.js`).
- **Senza doppioni.**
  - I due NEC di ricambio messi fra gli accessori nel lotto 1 escono: i ricambi sono le celle del catalogo.
  - I lotti storici 1–14, lotto_7_22, lotto_elmetti, i tre lotti Python e `genera_dotazioni.py` non riscrivono più senza `--forza` (`tools/lotti/superato.mjs`): un rilancio riporterebbe indietro i dati.
