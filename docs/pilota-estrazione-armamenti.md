# Pilota di estrazione tabellare — Manuale degli Armamenti v0.50

Data: 26 settembre 2026. Riferimento: `docs/roadmap-equipaggiamento-e-scheda.md`, §1.5.

Obiettivo: capire se **pdfplumber** regge sulle tabelle del Manuale degli Armamenti (121 pagine)
prima di pianificare l'estrazione dei cataloghi. Niente JSON definitivi, niente UI.

## Verdetto

pdfplumber **regge**. Trova tutte le tabelle delle pagine provate (13 su 13, nessuna inventata)
e il testo delle celle è esatto: 62 record controllati a mano contro il PDF, 422 celle,
nessun carattere sbagliato. Gli errori sono tutti **strutturali e ripetitivi**:
- colonne tecniche vuote e righe vuote;
- celle andate a capo che finiscono in una riga a parte;
- intestazioni su due righe;
- tabelle impilate lette come una sola;
- numeri con il punto delle migliaia.

Si correggono con un post-processo generico, da scrivere una volta sola. pdftotext senza layout
va scartato: legge le tabelle per colonne e perde il legame fra le celle della stessa riga.

Il costo vero dell'intero manuale non è l'estrazione: è **modellare** i dati. Pesano le
proprietà scritte in prosa sotto le tabelle, i valori speciali («Mun.», «Condivisi»,
«Incluso», «Come arma»), le tre sottotabelle per ogni arma a distanza e le schede
corporative miste di regole e tabelle.

## Strumento

`tools/estrai_manuali.py` (Python 3, pdfplumber 0.11.10; `tools/requirements.txt`). Non fa parte
dell'app: l'app non carica nulla da `tools/`. Due modalità, entrambe con **prova a vuoto** per
default (elenca cosa scriverebbe) e scrittura solo con `--scrivi`:

- `--prosa <pdf> <cartella>`: un `.txt` UTF-8 per paragrafo numerato di primo livello, testo in
  modalità prosa. Le righe che si ripetono in cima o in fondo a metà delle pagine
  (intestazione «SIMPLY RPG…», piè di pagina «ARMAMENTI N») sono tolte.
  - **Armamenti:** 20 sezioni, 7.1–7.20, esattamente come l'indice, più il testo iniziale;
    12 s.
  - **Giocatore v0.43:** 80 sezioni, tutte reali.
- `--tabelle <pdf> <cartella> [--pagine a-b]`: un CSV per tabella trovata da
  `page.extract_tables()` con le **impostazioni predefinite**. Il nome è `<pagina>_<n>.csv`,
  la prima riga è un commento con pagina e intestazione, le celle andate a capo sono unite
  con uno spazio.

Comandi del pilota:

```
python tools/estrai_manuali.py --tabelle Manuali/Manuale_degli_Armamenti_v0.50.pdf docs/pilota-estrazione-armamenti/grezzo --pagine 4-7 --scrivi
python tools/estrai_manuali.py --tabelle Manuali/Manuale_degli_Armamenti_v0.50.pdf docs/pilota-estrazione-armamenti/grezzo --pagine 61-63 --scrivi
python docs/pilota-estrazione-armamenti/confronta.py
```

Dopo il primo giro ho cambiato una sola cosa nello script, per rispettare la specifica: il
commento in cima al CSV prendeva la prima riga di pdfplumber, che era vuota. Ora prende la
prima riga con del testo. L'estrazione delle celle è quella predefinita di pdfplumber, non
ottimizzata per il pilota.

Nota sull'ambiente: sul PC di sviluppo Python è installato a metà. `C:\Python314` ha
l'eseguibile ma non la libreria standard, che sta in `AppData\Local\Programs\Python\Python314`
insieme a pip. Ho installato pdfplumber in una cartella temporanea con `pip --target`, senza
toccare l'installazione. Su un Python funzionante basta
`python -m pip install -r tools/requirements.txt`.

## File del pilota

- `docs/pilota-estrazione-armamenti/grezzo/`: i 13 CSV così come li produce lo script.
- `docs/pilota-estrazione-armamenti/pulito/`: 4 CSV controllati riga per riga contro le
  immagini delle pagine (pp. 5, 6, 7, 62, 63 renderizzate):
  - `7.1.1_armi_ravvicinate.csv` (28 profili: famiglia, profilo, Abilità, mani, danno base, Q,
    proprietà);
  - `7.1.1_requisiti_economici.csv` (28 modelli: FOR, PI, Qualità, PS INT, REP, costo
    proposto): nel manuale è una tabella separata;
  - `7.11.3_armature_civili.csv` e `7.11.3_armature_civili_economici.csv`: la prima tabella
    delle basi commerciali delle armature, anch'essa divisa in due (p. 62 e p. 63).
- `docs/pilota-estrazione-armamenti/confronta.py`: misura, senza correggere nulla, quanti
  record del CSV pulito si ritrovano nel grezzo e con quale errore.

Nei CSV puliti i testi sono quelli del PDF («Mischia», «1 / 2», «1d8+1 / 2d6», «—»). Ho
convertito solo i numeri: «1.500» diventa 1500. Dividere il danno per una e due mani,
trasformare «—» in «nessuna proprietà» e tradurre «Mischia» in «Armi da mischia» sono
passaggi del futuro JSON, non dell'estrazione.

## Risultati

### Tabelle trovate

| Pagine | Tabelle reali (controllate sulle immagini) | Trovate da pdfplumber | Mancate | Inventate |
|---|---|---|---|---|
| 4–7 | 6 (Dato/Funzione, Profilo unico, catalogo p. 5, catalogo p. 6, requisiti p. 6, requisiti p. 7) | 6 | 0 | 0 |
| 61–63 | 7 (Potenza, Metodo, Categorie, Rinforzi, Configurazioni, civili p. 62, civili p. 63) | 7 | 0 | 0 |

Sull'intero manuale (prova a vuoto, 17 s): **202 tabelle in 105 pagine su 121**. Il numero
reale di tabelle è più alto, vedi «tabelle impilate» più sotto.

### Record corretti

«Al primo colpo» vuol dire che, togliendo solo righe e celle vuote (la compattazione
necessaria in ogni caso), le celle coincidono con il CSV pulito.

| Tabella | Record | Al primo colpo | Solo conversione numerica | Correzione strutturale | Tipo di correzione |
|---|---|---|---|---|---|
| §7.1.1 profili delle armi ravvicinate (pp. 5–6) | 28 | 17 | 0 | 11 | riga spezzata: «Coltelli e / pugnali», «Mazze e / bastoni», «Armi da / pugno», «Corpo a / corpo», «Pugnale da / combattimento», «…5 / cariche a cella» |
| §7.1.1 requisiti e dati economici (pp. 6–7) | 28 | 28 | 0 | 0 | — (solo l'intestazione «Costo / proposto» su due righe, in entrambe le pagine) |
| **§7.1.1 totale** | **56** | **45** | 0 | **11** | |
| §7.11.3 armature civili, AR/FOR/PI (p. 62) | 3 | 3 | 0 | 0 | — |
| §7.11.3 armature civili, dati economici (p. 63) | 3 | 0 | 3 | 0 | «1.500», «3.500», «7.000» letti come testo |
| **§7.11.3 totale** | **6** | **3** | **3** | **0** | |

Tutte le 11 righe spezzate si ricostruiscono **in automatico**: la riga di continuazione si
unisce a quella precedente cella per cella, secondo l'indice di colonna del grezzo (lo fa
`confronta.py`). Nessun record ha richiesto una correzione che una regola generica non sappia
fare. Nessuna cella aveva testo sbagliato, mancante o spostato in un'altra colonna dopo la
compattazione.

### Tipi di errore osservati

1. **Colonne e righe tecniche vuote (in tutte le tabelle).** Le righe hanno lo sfondo a
   bande alterne e i bordi disegnati con rettangoli sottili. pdfplumber li legge come una
   griglia fitta: 20–21 colonne invece di 7 nel catalogo delle armi, 15 invece di 5 nelle
   armature, fino a 43 nell'intero manuale. In più ogni riga di dati è seguita da due righe
   vuote: 60 righe vuote su 101 nella tabella dei profili. Il grezzo non si usa così com'è:
   serve la compattazione.
2. **Posizione delle celle non costante.** Nella tabella dei profili le celle con testo
   stanno in **11 schemi di colonne diversi** («Profilo» è ora nella colonna 3, ora nella 4).
   Non si possono leggere le colonne per indice: bisogna compattare oppure assegnare ogni
   cella alla colonna dell'intestazione in base alla posizione orizzontale.
3. **Celle andate a capo = righe spezzate.** Una cella su due righe produce una riga di
   continuazione con solo quel frammento: 11 casi su 28 nella tabella dei profili, quasi
   sempre nella colonna Famiglia o Abilità.
4. **Intestazioni su due righe.** «Costo / proposto».
5. **Numeri come testo.** «1.500» con il punto delle migliaia. Nello stesso manuale il costo
   del Tirapugni concussivo è «1200» senza punto: la conversione deve accettare entrambe le
   forme. Altri valori da trattare: il segno meno tipografico «−», il «+1» con segno, le
   frazioni «1 / 2», «—» per nessun valore.
6. **Tabelle impilate lette come una sola** (non nelle due tabelle del pilota, ma nel resto
   del manuale). Nel catalogo delle armi a distanza ogni gruppo è fatto di tre tabelle
   attaccate: Danno/AC/VA/FOR/Max Q/CC/INC, Abilità/Mani/PI/MOV/Modalità,
   Qualità/PS INT/REP/Costo. A p. 33 pdfplumber le trova come **1** tabella invece di 3; a
   p. 40 come 3 invece di 9. Le intestazioni ripetute («Modello») restano però righe
   riconoscibili, e le celle sono pulite: si separano con una regola generica. Per questo il
   numero di 202 tabelle sottostima quelle reali.

Rischio che il pilota **non** ha mostrato ma che va previsto: la compattazione funziona solo se
nessuna cella è davvero vuota. In queste tabelle il manuale usa sempre «—». Una cella vuota vera
sposterebbe tutte le celle successive nella colonna sbagliata **senza errori visibili**. Per
questo l'estrazione definitiva deve assegnare le celle per posizione, non per ordine
(vedi la raccomandazione sotto), e il validatore deve controllare i tipi per colonna.

### Confronto con pdftotext senza layout

Provato su p. 5: `pdftotext -f 5 -l 5` restituisce prima tutte le Famiglie, poi tutti i
Profili, e così via per blocchi di colonna. Il legame fra le celle della stessa riga si perde,
e i valori con spazi («Spada leggera», «Non comune», «S RB RM TR») rendono ambigua ogni
ricostruzione. Un parser dedicato dovrebbe ricostruire da zero la struttura che pdfplumber dà
già quasi giusta. Anche il testo in modalità prosa di pdfplumber mescola le righe spezzate
(«Coltelli e» / «Coltello Mischia 1 1d4 1 —» / «pugnali»). Per le tabelle, la prosa non basta.

## Stima per tutto il manuale (121 pagine)

Cosa c'è da estrarre, dalla prova a vuoto e dalle pagine campione (pp. 33, 40, 75):

- cataloghi a griglia regolare: armi ravvicinate §7.1, armi a distanza §7.7–7.8 con tre
  sottotabelle per arma, prezzi §7.9, armature §7.11, munizioni §7.20;
- cataloghi corporativi §7.13–7.17: tabelle miste a regole in prosa e tabelle «Voce / Regola»
  (per esempio i propulsori Capitol, p. 75);
- dati che stanno **fuori dalle tabelle**: proprietà per arma in prosa sotto le griglie
  («HD14M. Proprietà: Sbilanciante. Eccezione: …»), munizioni di riferimento, dotazioni
  incluse, eccezioni.

Stima ragionata, in giornate di lavoro con l'assistente più il controllo umano:

| Parte | Stima | Note |
|---|---|---|
| Post-processo generico: compattazione per posizione, righe di continuazione, intestazioni su due righe, divisione delle tabelle impilate, numeri e segni | 1 giornata | Riusabile per tutto il manuale e per le prossime edizioni |
| Mappatura in JSON per famiglia di catalogo (circa 8–10: ravvicinate, distanza, prezzi, scudi, accessori, armature, cataloghi corporativi, robot, sanitario, munizioni) con validatore (id univoci, Abilità esistente, FOR 1–10, numeri nei campi numerici) | 3–5 giornate | Il grosso: unire le tre sottotabelle per modello, leggere le «Proprietà:» in prosa, valori speciali |
| Dati in prosa e schede miste dei cataloghi corporativi | 1–2 giornate | In parte a mano; alcune regole restano testo, non dati |
| Controllo umano | 1–2 giornate | Stima, non misurata: circa mezzo minuto per record confrontando con le immagini delle pagine, su 1.000–1.500 record. Nel pilota erano 62 record e 422 celle |
| **Totale** | **circa 6–10 giornate** | Più le domande a Davide sulle ambiguità che emergeranno |

Rischio:
- **basso** sui valori: il PDF ha il testo vero, non serve l'OCR, e nel pilota non c'è stato
  un solo carattere sbagliato;
- **medio** sulla struttura: celle vuote vere e tabelle impilate possono spostare dati senza
  errori evidenti, se non si lavora per posizione e con un validatore stretto;
- **alto** sulla semantica: proprietà in prosa, eccezioni, «Come arma», «Incluso»;
  richiedono giudizio e domande al master.

### Raccomandazione

1. **Tenere pdfplumber**, ma non usare il testo di `extract_tables()` per indice di colonna.
   Nel convertitore definitivo usare `page.find_tables()`, che dà le coordinate di ogni
   cella, e assegnare ogni cella alla colonna dell'intestazione in base alla posizione
   orizzontale. Così i problemi 1, 2 e il rischio delle celle vuote si risolvono in modo
   robusto. In alternativa, provare le `table_settings`
   (`snap_tolerance`/`join_tolerance`) per fondere la griglia fitta. Nel pilota non l'ho
   fatto, di proposito: il dato qui sopra è quello delle impostazioni predefinite.
2. Righe di continuazione, intestazioni su due righe e tabelle impilate: regole generiche nel
   post-processo, con test sui CSV di questo pilota come casi noti.
3. **Controlli incrociati automatici** prima del controllo umano:
   - ogni modello presente in tutte le sue sottotabelle;
   - conteggi dichiarati nel testo rispettati («comprende 28 profili»);
   - tipi e intervalli per colonna.
   Poi il controllo umano a campione, per sezione.
4. Procedere per famiglia di catalogo, partendo dalle armi ravvicinate e dalle armature
   commerciali di questo pilota. Le proprietà in prosa si affrontano per ultime, insieme a
   Davide.
5. pdftotext senza layout va scartato per le tabelle. La modalità `--prosa` dello script va
   bene per il diff fra edizioni.
