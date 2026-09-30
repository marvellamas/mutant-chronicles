# Nuova scheda da stampare (SS): piano

30 settembre 2026. **Solo il piano**: l'implementazione parte dopo le risposte alla sezione «Da
decidere con Marcello».

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

## 3. Regole comuni (restano)

- A4 orizzontale, margine 10 mm.
- `--ss-font` 10 pt e `--ss-font-small` 9 pt (`css/stampa.css`): il carattere non si riduce mai.
- Quadratini anneribili ovunque il giocatore consumi o segni.
- Un solo riempitivo per pagina, che prende lo spazio che resta.
- Colori della palette della stampa (`--ss-*`, stessi significati di `docs/palette.md`: PV rosso, PM blu, Punti Eroe verde, macrofamiglie, acciaio per l'AR).
- Filigrana della Corporazione nel foglio 1.
- Pagine di continuazione solo dove una tabella non entra.
- Il generatore (`tools/collaudo_pdf.mjs`) fallisce se un foglio senza continuazione sborda.
- La SS resta a riposo: nessun valore di sessione stampato. PV, PM, Ferite, Corruzione e simili si segnano a matita.

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
- Le Ferite restano nel foglio 3: domanda 2.

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
- **Continuazione:** no. Se Talenti e Tecniche non entrano nella colonna destra, il collaudo lo segnala. Oggi c'è margine: la colonna ha 68 mm di Annotazioni, che si restringono.

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
- Il Sanitario non c'è: le applicazioni dei kit stanno nel foglio 4.

**Quadratini:**
- colpi del caricatore per arma, come oggi (`fileColpi`);
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
- Sanitario: le applicazioni del kit sono una fila di quadratini nella riga (oggi solo nella SD).
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
| «Da artefatti» | una riga di rimando agli Artefatti con attivazione o riserva integrata: «vedi foglio Artefatti» |

- Contenitori di Chroma: domanda 5 (proposta: si spostano nel foglio 6).
- **Riempitivo:** Indice degli incantesimi.
- **Quadratini:** PM.
- **Continuazione:** sì, come oggi. Prosegue l'indice, poi le schede complete su due colonne se scelte (vedi 5.3).

### Foglio 6 — Artefatti (solo se ne ha)

Si stampa se il personaggio possiede almeno un Artefatto (sintonizzato o no) o una riserva di Chroma.

| Riquadro | Contenuto e quadratini |
|---|---|
| Sintonizzazione (§7.10) | capacità per Gradi complessivi e bonus del Talento; una fila di quadratini lunga quanto la capacità, da annerire per i punti usati; elenco con i costi. Stampata a riposo: la scelta «sintonizzato» del file è segnata come oggi nella SD, i quadratini restano vuoti per il tavolo |
| Una scheda per Artefatto (come nella tab) | stato nell'Inventario, sintonizzato sì/no, potenza e costo, attivazione; VA e danno se è un'arma, AR se è una protezione; riserva integrata con quadratini dei PM |
| Riserve di Chroma | batterie, cristalli e contenitori: energia, capacità e quadratini dei PM |

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
che mette Inventario al settimo posto: domanda 1.

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
1. **Inventario (foglio 4).** Sezioni, testa con Crediti e Carico, stato e PI a quadratini, «Da aggiungere», continuazione. Toglie l'Equipaggiamento dal foglio 3.
2. **Abilità (foglio 2).** Arrivano Specializzazioni e Tecniche Interiori; le toglie dal foglio 3.
3. **Combattimento (foglio 3).**
   - Zona sinistra rifatta nello spazio liberato; nelle Armi, le colonne «in mano» e PI secondo la domanda 6.
   - Colonna destra: Ferite, Affaticamento, Corruzione, Stati.
   - Continuazione aggiornata.
4. **Poteri (foglio 5).** Rinomina, Gradi taumaturgici e livello massimo, rimando «Da artefatti»; Contenitori di Chroma secondo la domanda 5.
5. **Artefatti (foglio 6).** Sintonizzazione, schede, riserve di Chroma, continuazione.
6. **Verifica e PDF.**
   - PDF dei due personaggi del §7 in `docs/esempi-stampa/`.
   - Confronto foglio per foglio con i tab della SD.
   - Esito in fondo a questo file. Cibernetica e Veicoli: nessun lavoro oltre la regola del pezzo 0.

## 9. Da decidere con Marcello

1. **Ordine dei fogli.** Sempre presenti prima (Identità, Abilità, Combattimento, Inventario, poi Poteri, Artefatti…) oppure esattamente l'ordine dei tab della SD (Inventario dopo Cibernetica, al settimo posto)?
   *Proposta:* sempre presenti prima. Così i fogli 1–4 hanno sempre lo stesso numero e chi non ha poteri riceve quattro fogli consecutivi. Nella SD l'ordine dei tab conta meno perché si salta da uno all'altro.
2. **Ferite in Combattimento o in Identità?**
   *Proposta:* Combattimento, nella colonna destra con Affaticamento, Corruzione e Stati, come nella SD. Si segnano durante lo scontro, accanto ai PV. In Identità resterebbero lontane dai PV.
3. **L'Inventario ha un foglio suo anche quando è corto?** Con 4–9 oggetti (b, a, c) il foglio resta per metà vuoto; con la dotazione guidata (22–40 oggetti) si riempie o continua.
   *Proposta:* foglio sempre a sé. Lo spazio vuoto diventa il riempitivo «Da aggiungere», righe con caselle per gli acquisti al tavolo. Unirlo ad altro renderebbe il posto dell'Inventario variabile da personaggio a personaggio.
4. **Le armi: in Combattimento, in Inventario o in entrambi?**
   *Proposta:* in entrambi, con contenuti diversi, come nella SD.
   - In Combattimento: il profilo d'uso (VA, danno, gittata, colpi a quadratini, «in mano»).
   - In Inventario: la riga di possesso (costo, Qualità, peso, stato, PI, condizione).
   Nessun dato si ripete, tranne il nome.
5. **Riserve di Chroma: nel foglio Poteri (come oggi, «Contenitori di Chroma») o nel foglio Artefatti (come la tab Artefatti)?** La SD le mostra in tutte e due le tab, ma sulla carta due file di quadratini per la stessa riserva vuol dire due posti da tenere allineati.
   *Proposta:* quadratini solo nel foglio Artefatti. Nel foglio Poteri una riga «Riserve di Chroma: foglio Artefatti» con capacità e sintonizzazione. Per un personaggio con Artefatti ma senza magia le riserve restano comunque sul suo foglio.
6. **PI di armi e protezioni: solo in Inventario (come la SD) o anche in Combattimento?** Oggi il foglio 3 stampa i PI delle protezioni.
   *Proposta:* solo in Inventario, come nella SD. In Combattimento, accanto alla protezione, «PI: foglio 4». Un solo posto dove annerire, e il foglio 3 guadagna spazio.
7. **Sanitario: sezione dell'Inventario o riquadro suo?**
   *Proposta:* sezione dell'Inventario, con le applicazioni a quadratini nella riga del kit, come nella SD dopo il pezzo 3 del layout. Un riquadro a sé in Combattimento duplicherebbe le applicazioni.
