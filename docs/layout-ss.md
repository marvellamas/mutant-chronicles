# Nuova scheda da stampare (SS): piano

30 settembre 2026. Piano deciso con Marcello il 30/09 (sezione 9, «Deciso»); si implementa sul
branch `layout-ss`, un pezzo alla volta (sezione 8).

## 1. Perché

La SD ha otto tab (`docs/layout-sd.md`, «Esito»), la SS è ferma ai quattro fogli di prima:
Identità, Abilità, Combattimento con l'equipaggiamento, Magia. Chi cerca una cosa sul foglio deve
trovarla dove la trova nella SD. In particolare:
- l'Inventario si separa dal Combattimento;
- Artefatti, Cibernetica e Veicoli hanno un foglio quando hanno contenuto;
- il Combattimento usa lo spazio liberato per la colonna destra della SD: Ferite, Affaticamento,
  Corruzione, Stati.

## 2. Punto di partenza (misure di oggi)

Misurati nella vista di stampa con `a_imperiale_assaltatore_l8-layout` (`docs/esempi-stampa/`).
L'area utile del corpo è 277 × 168 mm, fuori da testata e piè di pagina.

| Foglio di oggi | Riquadri (larghezza × altezza, mm; R = riempitivo) |
|---|---|
| 1 Identità | Caratteristiche 277×35 · Punti Eroe 56×23 · Distintivi 25×23 · Vantaggio 189×23 · Prove Salvezza 277×19 · Background 277×64 R |
| 2 Abilità e statistiche | Abilità 180×168 (due tabelle affiancate, già con la competenza S/P/G/N accanto alla Caratteristica) · Talenti di Classe 94×68 · Talenti Liberi 94×28 · Annotazioni 94×68 R |
| 3 Combattimento | Sintesi 277×15 (con la fila dei nomi degli Stati) · Armi e Protezioni 277×50 · Equipaggiamento 106×99 R · Ferite 105×47 · Specializzazioni 105×17 · Punti Vita 60×99 R |
| 4 Magia | PM, Lancio, Contenitori di Chroma, Indice degli incantesimi R; poi le schede («Elenco e schede complete») |

Una riga di tabella a 10 pt è alta circa 5 mm: in una pagina ci stanno circa 30 righe per colonna.

Oggetti nell'inventario dei personaggi di prova:

| Personaggio | Oggetti |
|---|---|
| a Assaltatore 8° | 5 |
| b Arcanista 12° | 4 |
| c Tecnico 5° | 9 |
| combattente | 13 |
| Lucas Invocatore 6°, con la dotazione iniziale guidata | 22 |

La dotazione del §2.16 da sola ne porta fino a una quarantina.

## 3. Regole generali

Quelle di oggi, che restano:

- A4 orizzontale, margine 10 mm.
- `--ss-font` 10 pt e `--ss-font-small` 9 pt (`css/stampa.css`): il carattere non si riduce mai.
- Quadratini anneribili ovunque il giocatore consumi o segni.
- Un solo riempitivo per pagina, che prende lo spazio che resta.
- Colori della palette della stampa (`--ss-*`, stessi significati di `docs/palette.md`: PV rosso, PM blu, Punti Eroe verde, macrofamiglie, acciaio per l'AR).
- Filigrana della Corporazione nel foglio 1.
- Pagine di continuazione solo dove una tabella non entra.
- Il generatore (`tools/collaudo_pdf.mjs`) fallisce se un foglio senza continuazione sborda.
- La SS resta a riposo: nessun valore di sessione stampato. PV, PM, Ferite, Corruzione e simili si segnano a matita.

**Quadratini con un massimo** (regola nuova, decisa il 30/09). Vale per PV, PM, colpi, PI, applicazioni, cariche e riserve; un solo componente, riusato ovunque:
- righe da 10 caselle, con uno stacco dopo la quinta e il cumulato a destra (10, 20, 30…);
- blocchi da 5 righe (50 caselle); un secondo blocco quando lo spazio lo consente (o quando il massimo supera 50);
- le caselle fino al massimo attuale sono nere su bianco; quelle oltre il massimo sono grigio chiaro (bordo grigio, fondo grigio al 15–20 %, `print-color-adjust: exact`): il tetto si vede e un aumento di livello non richiede di ristampare;
- dove 50 caselle sono troppe per lo spazio (colpi di un caricatore da 2, PI da 6, Punti Eroe, Distintivi) il blocco si accorcia alla prima riga intera che contiene il massimo: sempre righe da 10 (massimo 2 → una riga, 2 nere e 8 grigie).
- Logica in `src/stampa.js` → `schemaQuadratini`, disegno in `src/ui/stampa.js` → `quadratini()`, stile in `css/stampa.css` (`.casella`, `.casella.oltre`).

## 4. I fogli

In ogni foglio: quando si stampa, riquadri con la fonte nella SD, riempitivo, quadratini, continuazione.

### Foglio 1 — Identità (sempre)

Come oggi.

| Riquadro | Fonte SD |
|---|---|
| Anagrafica, ritratto e stemma | Identità |
| Caratteristiche | Identità |
| Punti Eroe (quadratini) | colonna di sinistra della SD |
| Distintivi (caselle) | Identità |
| Vantaggio dell'Addestramento | Identità |
| Note | Identità |
| Prove Salvezza | Identità |
| Background | Identità |

- **Riempitivo:** Background.
- **Quadratini:** Punti Eroe, Distintivi.
- **Continuazione:** no (il Background si tronca a `LIMITI_STAMPA.background`; il testo intero resta nella SD).
- Le Ferite restano nel foglio 3 (deciso, sezione 9.2).

### Foglio 2 — Abilità (sempre)

| Riquadro | Fonte SD |
|---|---|
| Abilità a tutta altezza, due tabelle affiancate | Abilità |
| Talenti di Classe (colonna destra) | Abilità |
| Talenti Liberi (colonna destra) | Abilità |
| Specializzazioni (colonna destra) | Abilità, sotto la tabella |
| Tecniche Interiori (colonna destra, se ne ha) | Abilità, sotto la tabella |
| Annotazioni (colonna destra) | — |

- La tabella Abilità ha colonne Mod, Base, Corp, Avanz, Equip, VA, con la competenza S/P/G/N e ⚑ oltre il limite (già così).
- Specializzazioni e Tecniche Interiori oggi sono nel foglio 3: si spostano qui perché nella SD stanno in Abilità.
- Tecniche Interiori: nome, costo, azione.
- **Riempitivo:** Annotazioni.
- **Quadratini:** nessuno.
- **Continuazione** (pezzo 2, corretta con il pezzo 3): la tabella delle Abilità non si spezza mai.
  - Se la colonna destra entra con le Annotazioni (almeno tre righe guida), resta tutto nella prima pagina.
  - Altrimenti le Annotazioni vanno per ultime nella pagina «Abilità (continua)» e la riempiono, e i riquadri che non entrano passano lì, dall'ultimo.
  - La continuazione usa tutta la larghezza: riquadri su una o due colonne con le Annotazioni accanto, oppure su tre colonne con le Annotazioni sotto.

### Foglio 3 — Combattimento (sempre)

Due zone come nella tab: a sinistra valori, armi, protezioni e PV; a destra, a tutta altezza,
la colonna di Ferite, Affaticamento, Corruzione e Stati. L'Equipaggiamento esce e va nel foglio 4.

**Zona sinistra (circa 2/3 della larghezza):**

| Riquadro | Fonte SD |
|---|---|
| Sintesi: Iniziativa, Movimento, Azioni, Difese (con Parata/Schivata Istintiva se ha il Talento), Prove Salvezza | riga dei valori |
| Armi: una riga per arma, con tutte le colonne di oggi (VA, danno, gittata, munizioni, note) e le file di colpi | «In mano» e armi disponibili |
| Protezioni: AR, categoria, note | Protezioni |
| Punti Vita: massimi, AR con i suoi valori e la provenienza in piccolo, attuali a quadratini, righe guida | colonna di sinistra della SD |

- Nelle Armi, una casella «in mano» per ogni arma sostituisce la divisione in mani della SD: sulla carta la mano non conta.
- **PI** di armi e protezioni: quadratini accanto all'arma o alla protezione, come oggi (deciso: anche qui, oltre che nell'Inventario; il giocatore annerisce dove ha il foglio davanti e a fine sessione riallinea l'altro).
- **Sanitario** (deciso): riquadro compatto nella zona sinistra, o dove entra; un kit per riga, con le applicazioni a quadratini.
- **Riempitivo:** Punti Vita.

**Colonna destra (circa 1/3, a tutta altezza):**

| Riquadro | Contenuto |
|---|---|
| Ferite (§5.14) | cinque gradi e «Oltre Grave», ciascuno con casella, penalità e menomazione in piccolo |
| Affaticamento (§5.19) | sette gradi con penalità, casella per il grado attuale |
| Corruzione Oscura (§5.20) | otto gradi con penalità; Oscuro «irreversibile» |
| Stati (§5.18) | undici Stati: casella, nome e l'effetto numerico dai dati in piccolo (es. «Rallentato — −2 fisiche, Passo 3 Q»); senza descrizioni, come i tooltip della SD |

- I gradi di Affaticamento e Corruzione vanno su due colonne per stare nell'altezza.
- Stima: Ferite ~40 mm, Affaticamento ~25, Corruzione ~28, Stati ~40, titoli compresi: ~135 mm su 168.
- La fila dei nomi degli Stati nella Sintesi sparisce: gli Stati hanno il loro riquadro.

**Quadratini:**
- colpi del caricatore per arma, come oggi (`fileColpi`);
- PI di armi e protezioni;
- applicazioni dei kit sanitari;
- casella «in mano»;
- PV attuali;
- caselle di Ferite, Affaticamento, Corruzione e Stati.

**Continuazione:** sì, come oggi, se le Armi non entrano. Nella continuazione le Armi (e le
Protezioni) vanno a tutta larghezza e la colonna destra non si ripete.

### Foglio 4 — Inventario (sempre)

Stesse sezioni della tab (`SEZIONI_INVENTARIO` in `src/palette.js`), stampate solo se hanno oggetti:
Armi · Accessori · Armature, scudi ed elmetti · Munizioni e caricatori · Dotazioni personali ·
Esplorazione e sopravvivenza · Comunicazione e rilevamento · Sanitario · Artefatti, cristalli e
contenitori di Chroma · Altro equipaggiamento.

**Testa:**
- Crediti: casella lunga, e il saldo iniziale in piccolo (oggi nel riquadro Equipaggiamento del foglio 3).
- Carico: peso noto, soglia Ordinaria e Massima, oggetti con peso da definire (come la testa della tab).

**Tabella, una riga per oggetto:**

| Colonna | Contenuto |
|---|---|
| Oggetto | nome, con quantità e note brevi |
| Costo | |
| Qualità | |
| Peso | |
| Stato | quattro caselle: indossato/in mano · con sé · zaino · deposito comune (vuote, come le caselle di oggi) |
| PI | quadratini fino ai PI massimi, «—» se l'oggetto non ne ha |
| PS Integrità | |

- Le sezioni vanno su due colonne affiancate. Ogni sezione si apre con il titolo nel colore della sua categoria.
- Nel titolo della sezione, il numero degli oggetti.
- Munizioni: la quantità si scrive a matita; i caricatori di riserva di un'arma sono una fila di quadratini.
- Sanitario: solo la riga di possesso, senza quadratini delle applicazioni (stanno nel foglio 3).
- Armi: la condizione dell'arma (A.49) ha i gradi da cerchiare in piccolo.

**Riempitivo:** «Da aggiungere», righe vuote con le stesse caselle, per gli acquisti al tavolo,
in fondo alla seconda colonna.

**Continuazione:** sì. Le sezioni che non entrano passano nella pagina dopo, «Inventario
(continua)», con la testa ridotta al solo titolo. Una sezione può spezzarsi fra due colonne o due
pagine, ripetendo il titolo con «(segue)».

### Foglio 5 — Poteri (oggi «Magia»; solo se ha poteri)

Si stampa se il personaggio ha accesso agli incantesimi (`haMagia`, come oggi). «Nessun potere»
della SD non si stampa. I Poteri Sciamanici arriveranno con il loro manuale.

**Prima pagina:**

| Riquadro | Contenuto |
|---|---|
| Punti Magia | quadratini, come oggi |
| Lancio | come oggi, più la riga dei **Gradi taumaturgici** e il **livello massimo** degli incantesimi (come il riquadro Incantesimi della tab) |
| Indice degli incantesimi | come oggi |
| Batterie e riserve di Chroma | come oggi («Contenitori di Chroma»): energia, capacità, quadratini dei PM (deciso: i PM delle riserve si segnano qui) |
| «Da artefatti» | una riga di rimando agli Artefatti con attivazione o riserva integrata: «vedi foglio Artefatti» |

- **Riempitivo:** Indice degli incantesimi.
- **Quadratini:** PM personali e PM delle riserve di Chroma.
- **Continuazione:** sì, come oggi. Prosegue l'indice, poi le schede complete su due colonne se scelte (vedi 5.3).

### Foglio 6 — Artefatti (solo se ne ha)

Si stampa se il personaggio possiede almeno un Artefatto (sintonizzato o no) o una riserva di Chroma. Un personaggio con riserve ma senza magia non ha il foglio Poteri: in quel caso i quadratini dei PM delle riserve vanno qui (pezzo 5).

| Riquadro | Contenuto e quadratini |
|---|---|
| Sintonizzazione (§7.10) | capacità per Gradi complessivi e bonus del Talento; una fila di quadratini lunga quanto la capacità, da annerire per i punti usati; elenco con i costi. Stampata a riposo: la scelta «sintonizzato» del file è segnata come oggi nella SD, i quadratini restano vuoti per il tavolo |
| Una scheda per Artefatto (come nella tab) | stato nell'Inventario, sintonizzato sì/no, potenza e costo, attivazione; VA e danno se è un'arma, AR se è una protezione; riserva integrata con quadratini dei PM |
| Riserve di Chroma | batterie, cristalli e contenitori: una riga di sintonizzazione ciascuna (energia, capacità, costo, sintonizzata sì/no), senza quadratini dei PM, che stanno nel foglio Poteri (deciso) |

- **Riempitivo:** Note sugli Artefatti (righe guida).
- **Continuazione:** sì, per le schede, come le schede degli incantesimi (una scheda non si spezza).

### Fogli 7 e 8 — Cibernetica e Veicoli (segnaposto)

Non si stampano finché i tab sono «In attesa del manuale» (`regole.json` → `tab_in_arrivo`).
Quando arriveranno i dati:
- Cibernetica: come l'Inventario, con l'Umanità (Giocatore §5.21) in testa e i suoi quadratini;
- Veicoli: una scheda per veicolo, sul modello della scheda dello Scout di Davide.

La regola del generatore è già quella giusta: un foglio senza contenuto non esiste.

## 5. Ordine, numerazione, opzioni

### 5.1 Ordine di stampa

Identità · Abilità · Combattimento · Inventario · Poteri · Artefatti · Cibernetica · Veicoli.

Prima i fogli sempre presenti, poi quelli condizionati. È diverso dall'ordine dei tab della SD,
che mette Inventario al settimo posto (deciso, sezione 9.1).

### 5.2 Numerazione

- Numero **fisso** per i fogli sempre presenti: 1 Identità, 2 Abilità, 3 Combattimento, 4 Inventario.
- I fogli condizionati prendono i numeri seguenti nell'ordine di stampa, solo se presenti. Per esempio, senza Poteri gli Artefatti sono il foglio 5.
- Piè di pagina: «Nome · N° livello · foglio 3 · pagina 4 di 9 · Dati: …».
  - «foglio N» resta lo stesso anche quando il foglio ha pagine di continuazione («foglio 3 (segue)»);
  - «pagina P di T» conta le pagine reali stampate, continuazioni comprese.
- Il numero fisso resta anche se un giocatore stampa solo alcuni fogli (opzione `fogli`): l'Inventario è sempre il foglio 4.
- Oggi `numeraPiedi` scrive «foglio i di n» contando le pagine: diventa questa doppia indicazione.

### 5.3 Opzioni di stampa

- La scelta «Solo elenco / Elenco e schede complete» diventa «Foglio Poteri»: stesse due scelte, stessa stima delle pagine in più. Vale solo per gli incantesimi.
- Le schede degli Artefatti si stampano sempre intere: sono poche e servono al tavolo.
- `normalizzaOpzioniStampa`:
  - gli id dei fogli diventano `identita, abilita, combattimento, inventario, poteri, artefatti, cibernetica, veicoli`;
  - un `fogli` salvato con `magia` si legge come `poteri`, e `magia: 'elenco' | 'completo'` resta la chiave della scelta (nessuna migrazione del file del personaggio).
- La scelta dei fogli da stampare (`fogli`) resta pronta ma non esposta nella barra, come oggi.

## 6. Pagine di continuazione, per foglio

| Foglio | Continuazione |
|---|---|
| 1 Identità | no (Background troncato) |
| 2 Abilità | no (il collaudo segnala lo sbordo) |
| 3 Combattimento | sì, per le Armi (come oggi); la colonna destra non si ripete |
| 4 Inventario | sì, per sezioni; testa ridotta |
| 5 Poteri | sì, indice e schede (come oggi) |
| 6 Artefatti | sì, per schede |
| 7–8 | — |

## 7. Personaggi di prova per i PDF

In `docs/esempi-stampa/`, rigenerati con `tools/collaudo_pdf.mjs`:

- **Senza magia: `c_freelance_tecnico_l5`** (Tecnico 5°). Tre Tecniche Interiori (foglio 2), due armi con caricatori, nove oggetti. Proposta al posto di «a», che ha una sola arma e cinque oggetti.
- **Con magia e Artefatti: `b_fratellanza_arcanista_l12-layout`** (Arcanista 12°). 31 incantesimi (Poteri su più pagine), due Artefatti e due riserve di Chroma, un oggetto nel deposito comune, un grado di Corruzione nella sessione. PDF «solo elenco» e «schede complete».

In più, senza PDF: `Lucas_liv6_2026-09-28 (2)` nel controllo di sbordo, per l'Inventario lungo (22 oggetti, dotazione guidata).

## 8. Pezzi dell'implementazione (in ordine)

Un pezzo per foglio, un commit per pezzo, come per il layout della SD. Ogni pezzo:
- `npm test` verde;
- `node tools/versione.mjs` prima del commit (lo fa l'hook);
- controllo di sbordo con `tools/collaudo_pdf.mjs` sui tre personaggi del §7.

0. **Impianto.**
   - Id e ordine dei fogli, numerazione fissa e «pagina P di T».
   - Opzioni rinominate con la lettura di `magia` (§5.3).
   - Fogli vuoti non stampati.
   - Icone dei fogli: `inventario` c'è già in `img/pagine/`; `poteri` usa quella della Magia come nella SD.
   - `tools/collaudo_pdf.mjs` con i nuovi id: controlla ogni foglio senza continuazione, e i PV nella prima pagina del foglio 3.
   - Componente dei quadratini con la regola della sezione 3, applicato dove i quadratini esistono già (PV, PM, riserve, colpi, PI, Punti Eroe, Distintivi); il contenuto dei fogli non cambia.
1. **Inventario (foglio 4).** Sezioni, testa con Crediti e Carico, stato e PI a quadratini, «Da aggiungere», continuazione. Toglie l'Equipaggiamento dal foglio 3.
2. **Abilità (foglio 2).** Arrivano Specializzazioni e Tecniche Interiori; le toglie dal foglio 3.
3. **Combattimento (foglio 3).**
   - Zona sinistra rifatta nello spazio liberato; nelle Armi la colonna «in mano» e i PI accanto (9.6); riquadro Sanitario compatto con le applicazioni (9.7).
   - Colonna destra: Ferite, Affaticamento, Corruzione, Stati.
   - Continuazione aggiornata.
4. **Poteri (foglio 5).** Rinomina, Gradi taumaturgici e livello massimo, rimando «Da artefatti»; batterie e riserve di Chroma con i PM restano qui (9.5).
5. **Artefatti (foglio 6).** Sintonizzazione, schede, riserve di Chroma, continuazione.
6. **Verifica e PDF.**
   - PDF dei due personaggi del §7 in `docs/esempi-stampa/`.
   - Confronto foglio per foglio con i tab della SD.
   - Esito in fondo a questo file. Cibernetica e Veicoli: nessun lavoro oltre la regola del pezzo 0.

## 9. Deciso (Marcello, 30/09/2026)

1. **Ordine dei fogli:** prima i sempre presenti (Identità, Abilità, Combattimento, Inventario 4°), poi Poteri, Artefatti, Cibernetica, Veicoli. Come proposto.
2. **Ferite** in Combattimento, colonna destra con Affaticamento, Corruzione e Stati. Come proposto.
3. **Inventario** sempre su un foglio suo, con «Da aggiungere» come riempitivo. Come proposto.
4. **Armi** in entrambi i fogli con contenuti diversi: l'uso in Combattimento (VA, danno, colpi, «in mano»), il possesso in Inventario (costo, Qualità, peso, stato, PI, condizione). Come proposto.
5. **Batterie e riserve di Chroma** nel foglio Poteri, con i quadratini dei PM lì; nel foglio Artefatti solo la riga di sintonizzazione per ciascuna, senza quadratini dei PM. *Diverso dalla proposta* (che le portava nel foglio Artefatti).
6. **PI di armi e protezioni** anche in Combattimento, con i quadratini accanto all'arma o alla protezione nel foglio 3, oltre che in Inventario: il giocatore annerisce dove ha il foglio davanti e a fine sessione riallinea l'altro. *Diverso dalla proposta* (solo Inventario).
7. **Sanitario** in Combattimento: riquadro compatto nella zona sinistra (o dove entra), un kit per riga con le applicazioni a quadratini; in Inventario resta la riga di possesso senza quadratini. *Diverso dalla proposta* (sezione dell'Inventario con i quadratini).

In più, la regola dei quadratini con un massimo (sezione 3), da fare nel pezzo 0 e applicare subito dove i quadratini esistono già.

## 10. Stato

- [x] Piano e decisioni (sezione 9).
- [x] **Pezzo 0: impianto** (branch `layout-ss`).
  - Fogli nell'ordine di `FOGLI` in `src/stampa.js` (`ordinaFogli`); un foglio senza contenuto non si stampa. Poteri solo con la magia; Cibernetica e Veicoli finché `regole.json` → `tab_in_arrivo` li elenca.
  - Il foglio Magia è diventato Poteri (id `poteri`, icona del tab, per ora quella della Magia). `preparaTab` e il tab Poteri della SD leggono l'id nuovo.
  - Piè di pagina «foglio N · pagina P di T» (`numeraPagine`, `testoPiede`), «(segue)» nelle continuazioni. Il numero è la posizione fra i fogli del personaggio: finché il foglio Inventario non c'è (pezzo 1), Poteri è il foglio 4; dopo sarà il 5.
  - Barra di stampa: «Foglio Poteri» con le stesse scelte; la preferenza resta `magia`, un vecchio `magia` fra i fogli scelti si legge `poteri`.
  - Quadratini con il componente unico (sezione 3), applicato a PV e PM (con il blocco in più se entra), riserve di Chroma, colpi, PI, Punti Eroe, Distintivi.
  - Corretto in passando: il piè di pagina dell'app (versione, dal cache-busting) usciva in stampa su una pagina bianca in più.
  - `tools/collaudo_pdf.mjs`:
    - personaggi di prova del §7;
    - controllo della numerazione;
    - si ferma se i personaggi non si caricano (server spento);
    - chiude tutti i processi di Edge headless.
  - PDF in `docs/esempi-stampa/`:
    - `c_freelance_tecnico_l5.pdf`, 4 pagine: fogli 1, 2, 3 e 3 (segue);
    - `b_fratellanza_arcanista_l12-layout-solo-elenco.pdf`, 5 pagine: fogli 1, 2, 3, 4 e 4 (segue);
    - `b_fratellanza_arcanista_l12-layout-schede-complete.pdf`, 32 pagine;
    - Lucas solo nel controllo di sbordo, 5 pagine: PV 17 nere, 33 grigie e il secondo blocco grigio.
    - Nessun foglio sborda.
  - I PDF `-layout` di prima restano come stato di partenza.
  - Test: numerazione e ordine dei fogli, opzioni, `schemaQuadratini` (17 → 17 nere e 33 grigie in 5 righe; 2 compatto → 2 nere e 8 grigie in una riga).
- [x] **Pezzo 1: Inventario** (1° ottobre 2026, branch `layout-ss`).
  - Dati: `inventarioStampa` in `src/stampa.js`.
    - Sezioni di `SEZIONI_INVENTARIO`, solo quelle con oggetti, nell'ordine della tab.
    - Per ogni oggetto: nome con quantità e nota breve, costo, Qualità, peso («da def.» se manca), stato, PI massimi e PS Integrità dalla riga di Integrità della SD; per le armi i gradi della condizione (A.49).
    - In testa: saldo iniziale e carico noto con le soglie Ordinaria e di Sovraccarico (§5.2.6).
  - Stato in quattro caselle: **sé** con sé (anche oggetti senza stato, «pronta», «trasportato»), **uso** (impugnato, imbracciato, indossato, montato), **zai** zaino, **dep** deposito comune (`STATI_INVENTARIO_STAMPA`).
  - Foglio 4: testa su una riga (Crediti e Carico con lo spazio da scrivere, più la legenda degli stati), poi le sezioni su due colonne (CSS columns) con l'intestazione nel colore della categoria; i PI a quadratini (componente unico, blocco corto) sotto la riga dell'oggetto.
    - Riempitivo «Da aggiungere»: righe con le stesse colonne e una riga di 10 caselle per i PI; non si stampa se restano meno di due righe.
  - Continuazione (`impaginaInventario`):
    - una sezione che non entra nello spazio rimasto passa intera alla pagina dopo («Inventario (continua)», senza la testa);
    - una sezione più alta di una colonna si divide fra le due colonne, mai dentro la riga di un oggetto;
    - il collaudo fallisce solo se una sezione non entra in una pagina intera.
  - Numerazione: Inventario è il foglio 4 fisso; Poteri scala al 5 (Artefatti sarà il 6). `preparaTab` non passa il foglio alla SD, che ha il suo tab Inventario.
  - Foglio 3: via la tabella Equipaggiamento con crediti e carico; il riempitivo Punti Vita prende lo spazio (griglia a due colonne: Ferite, Specializzazioni e Tecniche | Punti Vita). La continuazione non ha più la parte dell'Equipaggiamento.
  - Corretto in passando: le pagine di continuazione dell'Inventario nascono con il piè di pagina già scritto. Prima, misurando, il corpo risultava più alto di quello stampato e l'ultima sezione sbordava di due righe.
  - Collaudo, porta 3000:
    - c: 5 pagine, fogli 1 · 2 · 3 · 3 (segue) · 4;
    - b «solo elenco»: 6 pagine, 1 · 2 · 3 · 4 · 5 · 5 (segue);
    - b «schede complete»: 33 pagine;
    - Lucas: 7 pagine, Inventario su 2 (1 · 2 · 3 · 3 (segue) · 4 · 4 (segue) · 5);
    - nessuno sbordo.
  - Il Combattimento di c resta su 2 pagine per le Tecniche Interiori, come già su main: si spostano nel foglio 2 con il pezzo 2.
  - **Scostamenti dal piano:**
    - lo stato salvato è **prestampato pieno** (il piano diceva caselle vuote), come chiesto;
    - i caricatori di riserva delle armi a quadratini nella riga delle Munizioni non ci sono: le riserve sono un valore di sessione e restano nella SD;
    - una sezione divisa fra le due colonne non ripete il titolo «(segue)»;
    - il riempitivo parte dove finiscono le sezioni e può occupare il fondo della prima colonna e la seconda, non solo il fondo della seconda;
    - il Sanitario ha la sola riga di possesso (decisione 7), le applicazioni arrivano nel foglio 3 con il pezzo 3.
- [x] **Pezzo 2: Abilità** (1° ottobre 2026, branch `layout-ss`).
  - Colonna destra del foglio 2, dall'alto: Talenti di Classe, Talenti Liberi (con la prima frase, come prima), Specializzazioni, Tecniche Interiori (nome, costo, azione), Annotazioni come riempitivo con le righe guida.
    - Specializzazioni e Tecniche sono stampate come nel foglio 3, nella larghezza della colonna.
    - I riquadri senza contenuto non si stampano.
  - Continuazione (`impaginaAbilita`):
    - il riempitivo si restringe fino a 3 righe guida (altezza minima `.f2-annotazioni` in `css/stampa.css`);
    - poi i riquadri passano, dall'ultimo, a «Abilità (continua)», allineati a destra come nella prima pagina;
    - la tabella delle Abilità non si spezza.
  - Foglio 3: escono Specializzazioni e Tecniche Interiori; nella colonna restano le Ferite.
  - Collaudo, porta 3000:
    - c: 5 pagine (1 · 2 · 2 (segue) · 3 · 4). Il Combattimento torna su una pagina. Le Tecniche (riquadro di circa 60 mm) non entrano sotto Talenti e Specializzazioni con le Annotazioni a tre righe, e passano in «2 (segue)».
    - b «solo elenco»: 7 pagine (1 · 2 · 2 (segue) · 3 · 4 · 5 · 5 (segue)).
    - Lucas: 7 pagine (1 · 2 · 3 · 3 (segue) · 4 · 4 (segue) · 5), senza Tecniche né Specializzazioni, Annotazioni di 100 mm. Il Combattimento di Lucas va su 2 pagine per le Armi, come prima.
    - Nessuno sbordo.
  - Il collaudo controlla anche che il foglio 3 non abbia più Specializzazioni né Tecniche e che le Annotazioni del foglio 2 abbiano almeno tre righe guida; nell'esito riporta i riquadri della colonna destra e l'altezza delle Annotazioni.
  - **Scostamenti dal piano:**
    - il piano diceva «nessuna continuazione» per il foglio 2: ora c'è, con la regola del pezzo 2;
    - c e b hanno una pagina «Abilità (continua)», quasi vuota, perché la colonna destra è stretta (94 mm). Le pagine di c restano 5: sparisce «3 (segue)», compare «2 (segue)».
- [x] **Pezzo 3: Combattimento** (1° ottobre 2026, branch `layout-ss`).
  - Correzione del foglio 2: la pagina «Abilità (continua)» non è più una colonna stretta in una pagina vuota.
    - Le Annotazioni vanno per ultime e riempiono la pagina dove finiscono; i riquadri passati stanno accanto, su una o due colonne, oppure su tre colonne con le Annotazioni sotto.
    - Per c e b, a destra nella prima pagina entrano tutti i riquadri tranne le Annotazioni, che occupano tutta la continuazione.
  - Foglio 3, colonna sinistra:
    - sintesi: Iniziativa, Movimento, Azioni, Difese con Parata/Schivata Istintiva, Prove Salvezza; la fila dei nomi degli Stati non c'è più;
    - Armi: profilo d'uso (Abilità, VA, Danno, Gittata/portata, Mani, Modalità, INC, Parata, FOR) e casella «in mano». Sotto ogni arma: colpi per caricatore («car. N», «cella N»), PI a quadratini, gradi di condizione (A.49) e proprietà;
    - Protezioni con AR, categoria, note e PI a quadratini;
    - Sanitario: un kit per riga con le applicazioni a quadratini;
    - Punti Vita come riempitivo, con l'AR in evidenza.
  - Foglio 3, colonna destra (100 mm, a tutta altezza):
    - Ferite (con la menomazione), Affaticamento e Corruzione Oscura (su due colonne, Oscuro «irreversibile»), con la penalità dei dati accanto a ogni grado;
    - Stati con il solo effetto numerico (`effettoStato`: «−2 fisiche, solo Passo, Passo 3 Q»); Avvelenato e Sanguinamento non hanno numeri («—»).
  - Continuazione del foglio 3: conta solo la colonna sinistra. Passano Sanitario, Protezioni e poi le armi dall'ultima, a tutta larghezza; la colonna destra non si ripete.
  - Collaudo, porta 3000:
    - c: 5 pagine (1 · 2 · 2 (segue) · 3 · 4);
    - b «solo elenco»: 7 pagine (1 · 2 · 2 (segue) · 3 · 4 · 5 · 5 (segue));
    - Lucas: 7 pagine (1 · 2 · 3 · 3 (segue) · 4 · 4 (segue) · 5), con il lanciagranate e il pugnale nella continuazione;
    - nessuno sbordo.
  - Test: penalità di Corruzione e Affaticamento uguali ai dati; arma con due caricatori; kit con 5 applicazioni → 5 quadratini neri; effetto degli Stati; nomi brevi della condizione.
  - **Scostamenti dal piano:**
    - **gradi della condizione:** nel nome breve, senza la precisazione fra parentesi e senza doppioni (7 invece di 8: «Riparata sul campo» una volta), così stanno su una riga;
    - **colonne delle Armi:** è rimasta anche Parata (profilo d'uso delle armi ravvicinate); AC, Qualità, Capacità e PI escono dalla tabella; le proprietà stanno in piccolo sotto l'arma;
    - **Punti Vita:** l'altezza minima tiene una sola riga guida per le note, non due;
    - **foglio 2:** quando le Annotazioni non entrano, la continuazione può contenere le sole Annotazioni a pagina intera (c e b).
- [x] **Pezzo 4: Poteri** (1° ottobre 2026, branch `layout-ss`).
  - Foglio 5, solo con la magia; c non lo ha. Prima pagina:
    - **Punti Magia** a quadratini, con il blocco grigio in più se entra;
    - **Lancio:** come prima, più la riga «Gradi taumaturgici: IV · Arcanista II + Mistico II», la stessa della SD (`gradiTaumaturgici`), sotto «Incantesimi … livello massimo N»;
    - **Batterie e riserve di Chroma** (decisione 5): pallino del colore dell'energia, PM a quadratini (neri fino alla capacità, grigi a completare la riga), nota «Convertire Potere e ricaricare: 3:1; Bianco 2:1 in entrambi i sensi» come nel riquadro dei PM della SD.
  - Rimando «Da artefatti: Bordone Templare — vedi foglio 6» per gli Artefatti con attivazione o riserva integrata. Il numero è quello del foglio Artefatti, o il posto che prenderà dopo Poteri (`foglioArtefatti` nei dati).
  - Indice e schede degli incantesimi invariati.
  - Collaudo, porta 3000:
    - b «solo elenco»: 7 pagine (1 · 2 · 2 (segue) · 3 · 4 · 5 · 5 (segue));
    - b «schede complete»: 34 pagine;
    - Lucas: 7 pagine (1 · 2 · 3 · 3 (segue) · 4 · 4 (segue) · 5);
    - c: 5 pagine, senza foglio 5;
    - nessuno sbordo.
  - Test: Gradi taumaturgici uguali alla SD per b e Lucas; batteria da 5 PM → 5 caselle nere e 5 grigie; rapporto di conversione; rimando agli Artefatti; senza contenitori nessun riquadro delle riserve.
  - **Scostamenti dal piano:**
    - **«Da artefatti»:** è una riga di rimando con i nomi, non un elenco con attivazioni e riserve, che stanno nel foglio Artefatti;
    - **rimando a un foglio che non c'è ancora:** finché non arriva il pezzo 5, il rimando punta al foglio 6 Artefatti, che non si stampa;
    - **riserve integrate degli Artefatti** (Bordone Templare): i PM sono qui con le altre riserve, come chiede la decisione 5. Il foglio Artefatti avrà solo la sintonizzazione.
- [x] **Pezzo 5: Artefatti** (1° ottobre 2026, branch `layout-ss`).
  - Foglio 6, solo se il personaggio ha Artefatti o riserve di Chroma (`artefattiStampa` in `src/stampa.js`); c non lo ha, b e Lucas sì.
  - **Sintonizzazione (§7.10)** in testa:
    - capacità in evidenza, con la provenienza in piccolo («7 per 4 Gradi complessivi», «+2 da Tecnomante» se c'è);
    - quadratini lunghi quanto la capacità: pieni i punti occupati dagli Artefatti segnati «sintonizzato» nel file, bianchi i liberi, grigi oltre la capacità (opzione `pieni` del componente unico);
    - elenco di cosa occupa quanto, con la casella «sintonizzato» e il deposito comune.
  - **Una scheda per Artefatto**, come nella tab:
    - nome, tipologia, potenza; casella «Sintonizzato» (piena se lo è) e costo; stato nell'Inventario;
    - VA e danno con la provenienza se l'arma è in mano, AR se la protezione è indossata, altrimenti «non in uso»;
    - attivazione con il costo in PM; riserva integrata con «PM: vedi foglio 5».
  - **Riserve di Chroma** (batterie, cristalli): una riga ciascuna con casella «sintonizzato», pallino dell'energia, capacità, potenza, costo, deposito comune; nessun quadratino dei PM e «PM: vedi foglio 5» (decisione 5). Senza magia (nessun foglio Poteri) i quadratini dei PM vanno qui.
  - Schede e riserve su tre colonne, una scheda non si spezza; **Note sugli Artefatti** come riempitivo.
  - Continuazione (`impaginaArtefatti`): se le schede con le Note non entrano, le schede passano dall'ultima ad «Artefatti (continua)», che riceve anche le Note.
  - Il rimando del foglio 5 («Da artefatti… vedi foglio 6») ora punta a un foglio che esiste; senza foglio Artefatti il rimando non c'è. `preparaTab` non passa il foglio alla SD, che ha la sua tab.
  - Test: foglio 6 per b e Lucas, assente per c; numero 6 e rimando al 5; nessun doppione fra schede e riserve; Lucas capacità 5, occupata 1.
- [x] **Pezzo 6: verifica e PDF** (1° ottobre 2026, branch `layout-ss`).
  - **Collaudo** (`PORTA=3000 node tools/collaudo_pdf.mjs`), nessuno sbordo, numerazione corretta:
    - c: 5 pagine (1 · 2 · 2 (segue) · 3 · 4);
    - b «solo elenco»: 8 pagine (1 · 2 · 2 (segue) · 3 · 4 · 5 · 5 (segue) · 6);
    - b «schede complete»: 35 pagine;
    - Lucas «solo elenco»: 8 pagine (1 · 2 · 3 · 3 (segue) · 4 · 4 (segue) · 5 · 6); «schede complete»: 21.
  - Controllo a occhio delle immagini: quadratini della stessa misura in tutti i fogli, grigi oltre il massimo; colori stampati (`print-color-adjust: exact`); filigrana solo nel foglio 1.
  - **Bianco e nero:** le pagine di b convertite in scala di grigi si leggono tutte. Il colore non porta mai da solo un'informazione: l'energia di Chroma è scritta accanto al pallino, la macrofamiglia accanto alla barra, PV e PM hanno il titolo, le caselle piene, vuote e grigie restano distinguibili.
  - **Confronto con main:**
    - `calcolaScheda` uguale (confronto profondo) per a, b, c e Lucas;
    - dati stampati uguali: Caratteristiche, Salvezze, Abilità e Combattimento (PV, Iniziativa, armi con VA e danno);
    - fuori da `src/stampa.js`, `src/ui/stampa.js` e `css/stampa.css` il branch tocca solo una riga di `src/ui/tab.js` (id del tab Poteri);
    - la SS di c cambia solo nell'impaginazione.
  - PDF finali in `docs/esempi-stampa/` con i JSON accanto (`c_freelance_tecnico_l5.json` aggiunto).

## Esito

Il branch `layout-ss` porta la SS ai fogli della SD:
- 1 Identità, 2 Abilità, 3 Combattimento, 4 Inventario sempre;
- 5 Poteri con la magia;
- 6 Artefatti con Artefatti o riserve.

Cibernetica e Veicoli non si stampano finché aspettano il manuale. Il merge su `main` lo decide Marcello dopo la prova su carta.

Punti del piano (sezioni 3–6, 8 e 9): **24 fatti**, **9 fatti diversamente**, **2 rimandati**.

**Fatti come scritto** (24):
- regole generali: A4 orizzontale e caratteri fissi; un riempitivo per pagina; colori della palette con `print-color-adjust`; filigrana nel foglio 1; SS a riposo;
- quadratini con un massimo (righe da 10, blocchi da 5, grigi oltre il massimo) in un solo componente;
- ordine dei fogli (§5.1); numerazione fissa 1–4 e «pagina P di T» (§5.2); fogli senza contenuto non stampati; opzione «Foglio Poteri» con la lettura di `magia` (§5.3); schede degli Artefatti sempre intere;
- foglio 4 con sezioni, Crediti e Carico, PI, «Da aggiungere» e continuazione per sezioni;
- foglio 2 con Specializzazioni e Tecniche;
- foglio 3 con colonna destra (Ferite, Affaticamento, Corruzione, Stati), «in mano», PI accanto ad armi e protezioni, Sanitario con le applicazioni, continuazione che non ripete la colonna destra;
- foglio 5 con Gradi taumaturgici, livello massimo, riserve con i PM e rimando agli Artefatti;
- foglio 6 con sintonizzazione, schede, riserve senza PM e continuazione per schede;
- decisioni 1–7 della sezione 9;
- collaudo che fallisce sugli sbordi; PDF dei personaggi del §7.

**Fatti diversamente** (9):
1. Stato nell'Inventario **prestampato pieno** (il piano: caselle vuote), su richiesta di Marcello.
2. Foglio 2 **con continuazione** (il piano: nessuna): Annotazioni ultime, fino a pagina intera; c e b ne hanno una.
3. Una sezione dell'Inventario divisa fra le due colonne **non ripete il titolo**; il riempitivo «Da aggiungere» parte dove finiscono le sezioni.
4. Gradi della condizione delle armi **nel nome breve** e senza doppioni (7 invece di 8), per stare su una riga.
5. Colonne delle Armi nel foglio 3: **resta Parata**, escono AC, Qualità, Capacità e PI (i PI a quadratini sotto l'arma).
6. Punti Vita nel foglio 3 con **una sola riga guida** minima, non due.
7. «Da artefatti» nel foglio 5 è **una riga di rimando** con i nomi, non un elenco.
8. Sintonizzazione nel foglio 6: le caselle dei punti occupati sono **prestampate piene** dalla scelta del file (il piano: vuote per il tavolo), come chiesto nel pezzo 5; bianche le libere, grigie oltre la capacità.
9. Riserva integrata di un Artefatto (Bordone Templare): **PM nel foglio 5** con le altre riserve e nel foglio 6 il solo rimando, estendendo la decisione 5 (il piano: quadratini nella scheda).

**Rimandati** (2):
1. Caricatori di riserva a quadratini nella riga delle Munizioni dell'Inventario: le riserve sono un valore di sessione e restano nella SD.
2. Fogli 7 e 8, Cibernetica e Veicoli: aspettano i manuali; la regola «foglio senza contenuto non si stampa» è già quella giusta.

## Ritocchi post-stampa (1° ottobre 2026)

Dopo la prova su carta di Marcello cambia solo il foglio 3; i fogli 1, 2, 4, 5 e 6 restano come sopra.

**Foglio 3 su due pagine fisse.** Le due pagine sono entrambe foglio 3: piè di pagina «foglio 3 · pagina 1/2 · 4 di 9» (la pagina dentro il foglio, poi la posizione nella stampa). Le continuazioni delle armi sono pagine in più del foglio 3, fra la 1 e la 2 («pagina 2/3»). Gli altri fogli tengono «foglio N (segue) · pagina P di T».

- **Pagina 1, Armi.**
  - In alto una fascia di circa 45 mm. A sinistra (tre quarti della larghezza) i Punti Vita: quadratini a righe da 25 con stacco ogni 5 e cumulato a destra, neri fino al massimo e grigi a completare, almeno tre righe e sempre una riga grigia (`schemaQuadratini` con `perRiga` e `righeInPiu`); accanto PV massimi, AR (e «contro Etereo») e VA Difese con la Caratteristica, la provenienza dell'AR in piccolo.
  - A destra (un quarto, la larghezza dei riquadri di stato della pagina 2) la Sintesi in verde Punti Eroe: Iniziativa, Movimento, Azioni, Prove Salvezza.
  - Sotto, le Armi a tutta larghezza, come prima; il nome dell'arma non va più a capo.
  - Niente più riempitivo Punti Vita né righe guida.
- **Pagina 2, Condizione ed equipaggiamento indossato** (sempre stampata).
  - Ferite, Affaticamento, Corruzione Oscura e Stati su quattro colonne. Gli Stati occupano la quarta a tutta altezza; Protezioni (con i PI) e Sanitario (con le applicazioni) stanno sotto le prime tre.
  - **Azioni di combattimento**, se avanza spazio: tabella di consultazione con i soli valori di `regole.json` (`azioniCombattimento` in `src/stampa.js`):
    - modalità di fuoco delle armi del personaggio (colpi, AzP, VA, colpi a segno);
    - manovre di tiro (Tiro Mirato, Ravvicinato, a Bruciapelo, senza Imbracciatura);
    - manovre corpo a corpo del §5.12 con la Carica (AzP, VA, danno, tipo di Prova, effetto).
  - Ordine dei gruppi: con armi a distanza prima il tiro, altrimenti le manovre corpo a corpo. Si prova un gruppo alla volta: uno che non entra si salta (`impaginaCondizione`); un gruppo di oltre 6 righe si divide in due metà affiancate. Senza gruppi il riquadro non c'è; mai una terza pagina.
- **Esito del collaudo** (`PORTA=3000 node tools/collaudo_pdf.mjs`), nessuno sbordo, numerazione corretta; il foglio 3 è su 2 pagine per tutti:
  - c: 6 pagine; Azioni di combattimento con modalità di fuoco (Tiro Singolo, Tiro Rapido) e manovre di tiro (le manovre corpo a corpo non entrano);
  - b: 9 pagine «solo elenco», 36 «schede complete»; Azioni di combattimento con le manovre corpo a corpo e la Carica (nessuna arma a distanza; le modalità non entrano);
  - Lucas: 8 pagine «solo elenco», 21 «schede complete»; Azioni come c, con le sei modalità della Carabina. Le armi entrano nella pagina 1, senza continuazione.
- Il collaudo controlla anche:
  - sintesi e Punti Vita nella pagina 1, Ferite e Protezioni nella pagina 2, che è l'ultima del foglio 3;
  - niente Protezioni, Sanitario o Ferite nella pagina 1;
  - «pagina k/n» del foglio 3;
  - in uscita stampa le pagine del foglio 3 e i gruppi del riquadro Azioni.
- **Scostamenti dalla richiesta:**
  - Protezioni e Sanitario sono sotto Ferite, Affaticamento e Corruzione, accanto agli Stati, invece che sotto l'intera fila: così il riquadro Azioni guadagna circa 25 mm e per b entrano le manovre corpo a corpo;
  - la fascia dei PV è di circa 45 mm (richiesti 50–60): con tre righe di quadratini non serve di più;
  - nel piè di pagina resta anche la posizione nella stampa («· 4 di 9»), oltre a «pagina 1/2».

### Foglio 5: prima pagina con tutto il «di base» (1° ottobre 2026)

Dopo la prova su carta cambia solo la prima pagina del foglio 5; le schede complete seguono dalle pagine dopo con il sistema di prima (`impaginaMagia`, invariato dal passo 2).

- **Due colonne.** La destra è larga quanto le righe dell'elenco (`max-content`): nessun a capo, circa 105 mm per b e Lucas; la sinistra prende il resto.
  - **Colonna sinistra, tre riquadri compatti:**
    - **Punti Magia:** PM massimi e recupero con la Meditazione su una riga (`meditazione` nei dati, come il riquadro della SD; senza la capacità la riga non c'è); quadratini a righe da 25 come i PV del foglio 3 (almeno due righe, sempre una grigia).
    - **Batterie e riserve di Chroma:** una riga per contenitore (pallino, nome, energia, sintonizzazione, PM a quadratini a destra); conversione in una riga.
    - **Lancio:** etichetta: valore, due per riga, la riga intera per le voci lunghe; poi la scala della Prova di Potere.
    - In fondo il rimando «Da artefatti… vedi foglio 6» e, con «Solo elenco», la nota sulle schede.
  - **Colonna destra, a tutta altezza:** gli incantesimi conosciuti (`righeElencoIncantesimi` in `src/stampa.js`):
    - un'intestazione per macrofamiglia, piena nel suo colore, con il numero di incantesimi;
    - poi una riga per incantesimo, tinta della famiglia: nome, livello base, PM, gittata, durata, numero di scheda del Manuale della Magia (13.1…).
    - Il tempo di lancio esce dall'elenco: resta nella scheda completa.
- **Se l'elenco non entra** (`impaginaElenco`): le righe in più continuano sotto la colonna sinistra («Incantesimi (continua)», con l'intestazione della famiglia ripetuta) e solo in ultimo su «5 (segue)». Il carattere resta `--ss-font`; le righe dell'elenco hanno il margine verticale ridotto (0,1 mm).
- **Esito** (`PORTA=3000 node tools/collaudo_pdf.mjs`): nessuno sbordo, numerazione corretta.
  - b: 31 incantesimi, tutti nella prima pagina; foglio 5 su una pagina con «solo elenco».
  - Lucas: 15 incantesimi, tutti nella prima pagina; foglio 5 su una pagina con «solo elenco».
  - c invariato, senza foglio 5.
  - Pagine:
    - b 8 «solo elenco», 35 «schede complete»;
    - Lucas 8 e 21;
    - c 6.
  - Le schede complete sono le stesse pagine di prima: 27 per b, 13 per Lucas.
- Il collaudo controlla anche la prima pagina del foglio 5:
  - Punti Magia e Lancio presenti, nessuna scheda;
  - con 20 incantesimi o meno, l'elenco intero;
  - lo sbordo, come gli altri fogli;
  - in uscita, la riga «foglio 5» con pagine e incantesimi nella prima pagina.
- **Scostamenti:**
  - la richiesta indicava 15 incantesimi per b, ma b ne conosce 31: entrano comunque tutti nella prima pagina, senza continuazione sotto la colonna sinistra;
  - nell'elenco le macrofamiglie sono intestazioni, non una colonna, per tenere la riga corta; la specializzazione esce dall'elenco e resta nelle schede.


### Foglio 5, prima pagina: elenco più grande (1° ottobre 2026, seconda prova)

- **Elenco:**
  - nomi a 11 pt (prima 10), celle a `--ss-font` 10 pt, intestazioni di colonna e di macrofamiglia a 10 pt (prima 9);
  - righe senza margine verticale (prima 0,1 mm), interlinea 1,1;
  - la colonna destra si allarga da sola: 112 mm (prima circa 105), la sinistra 162 mm.
- **Colonna sinistra abbreviata, solo sulla carta** (`abbreviaSS` in `src/stampa.js`; la SD scrive per intero, i numeri non si toccano):
  - nomi delle riserve: «Batt. 5 PM (Chroma R./V./B./Bi./Vi./T.)»;
  - sigle: «sint.», «da sint.», «tutte le macrof.», «attiv.»;
  - titolo «Batt. e riserve di Chroma»;
  - Lancio: «Focalizz.», «Anticip.», «Incant.», «Gradi taum.», «liv. max», «Potere più diff. di una categ.»;
  - PM e conversione: «Recupero (Meditaz.) … ore/g.», «Conv. Potere e ricarica … nei due sensi».
  - L'energia resta scritta per intero nella sigla accanto al pallino.
- **Lancio:** una voce per riga quando supera 38 caratteri; scala della Prova di Potere in verticale (Livello | Prova).
- **Esito:** b 31 su 31 e Lucas 15 su 15 nella prima pagina, foglio 5 di una pagina con «solo elenco»; pagine invariate (c 6, b 8 e 35, Lucas 8 e 21); nessuno sbordo.
