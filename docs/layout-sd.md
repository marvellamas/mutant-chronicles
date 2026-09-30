# Ristrutturazione della scheda digitale (branch `layout-sd`)

**Fonti:**
- la proposta di Davide nel Google Doc «Modifiche Layout APP», salvata in `docs/manuali-txt/layout-app-davide.md`;
- le decisioni di Marcello del 30/09/2026, riportate qui sotto.

Il lavoro si fa sul branch `layout-sd`, un pezzo alla volta, con un commit per pezzo.

## Vincoli

- **Nessuna modifica** a dati, motore e formato di salvataggio. Fanno eccezione:
  - il nuovo stato di un oggetto «deposito comune»;
  - i gradi di Corruzione in `regole.json`.
- Tutto deve funzionare su tablet (~800 px), oltre che su desktop e telefono.
- I test esistenti restano verdi.
- La scheda da stampare (SS) resta invariata in questo lavoro; eventuali ritocchi dopo.
- «Attacca!» e «Lancia!» restano come sono.

## Struttura generale

**Otto tab fissi**, in una riga in alto, per tutti i personaggi:

**IDENTITÀ · ABILITÀ · COMBATTIMENTO · POTERI · ARTEFATTI · CIBERNETICA · INVENTARIO · VEICOLI**

- Davide ne proponeva sette; Marcello ha aggiunto ARTEFATTI come tab a sé.
- Il Calendario resta un tab facoltativo in coda, se attivo dall'ingranaggio.
- Il tab selezionato è evidenziato, gli altri restano in secondo piano. Ogni tab ha icona e testo.
- **Icone:**
  - Quelle dei tab esistenti restano: `img/pagine/<id>-96.png`, generate da `tools/genera_immagini.py` dagli originali in `img/originali/`.
  - I tab nuovi hanno un'icona provvisoria (un carattere) finché non c'è il file nel manifesto `img/immagini.json`.
  - Poteri usa per ora l'icona della Magia.
  - Le definitive arrivano da Marcello, con la stessa convenzione.
  - In `img/pagine/` ci sono già quattro originali grandi, non tracciati: `Artefatti.png`, `Cibernetica.png`, `Veicoli.png`, `equipaggiamento.png`. Per usarli vanno spostati in `img/originali/Pages/`. Poi si lancia `python tools/genera_immagini.py`, che richiede Pillow; le corrispondenze con gli id `artefatti`, `cibernetica`, `veicoli` e `inventario` sono già nel generatore.
- **Posizione della riga:** l'opzione dell'ingranaggio resta (Automatica, Sinistra, In basso, In alto), ma la riga in alto diventa la predefinita. I browser che avevano salvato «Automatica», il vecchio valore predefinito, passano una volta a «In alto». Poi ognuno può scegliere di nuovo.
- **Colonna di sinistra**, visibile in ogni tab: Punti Eroe sopra i PV, poi PV e PM. Su telefono diventa una striscia compatta sopra il contenuto.
- Il vecchio indirizzo `#/p/<id>/t/magia` apre Poteri.

## I tab

### Identità
Com'è, senza i Punti Eroe: stanno nella colonna di sinistra. Restano solo dove la colonna non si vede, cioè con i tab in basso sul telefono.

### Abilità
- La tabella delle Abilità va in alto, compatta (spazi ridotti).
- A destra una colonna **Condizioni attive**, non più sopra la tabella. Contiene:
  - Ferite, Affaticamento, carico e Stati con il loro effetto;
  - i bonus/malus condizionali degli oggetti, come interruttori;
  - i promemoria delle penalità senza effetto numerico.
- Sotto la tabella restano Talenti, Specializzazioni e Tecniche Interiori, come ora.
- Quando il pannello è stretto (sotto ~52rem), la colonna scende sotto la tabella.

### Combattimento
- L'equipaggiamento esce e va in Inventario.
- In alto una riga **Iniziativa · Movimento · Azioni · Difese**. Parata Istintiva e Schivata Istintiva compaiono accanto alle Difese se il personaggio ha il Talento. È la «Parata/Schivata Libera» di Davide: il Giocatore §5.13 dice «Parata Istintiva concede una Parata gratuita per Round».
- **Colonna sinistra:**
  1. le **Protezioni** disponibili, da indossare o dismettere: armature, rinforzi, scudi, elmetti;
  2. le **armi disponibili** da impugnare;
  3. le **armi impugnate** in due riquadri, mano destra e mano sinistra. Il riquadro è uno solo con un'arma a due mani o con lo scudo imbracciato.
- La condizione dell'arma e il numero di caricatori qui sono in sola lettura: si cambiano in Inventario. «Ricarica» resta qui e consuma dalle riserve.
- **Colonna destra:** FERITE · AFFATICAMENTO · CORRUZIONE · STATI ATTIVI, selezionabili, senza descrizioni estese, con tooltip (passaggio del mouse o «?» toccabile).
- «Attacca!» e «Lancia!» restano come sono.

### Corruzione
Il Giocatore §5.20 definisce gli Stati di Corruzione Oscura (CROS): Umano 0, Esposto 0, Contagiato −1, Infetto −2, Corrotto −4, Eretico −6, Caotico −10, Oscuro (irreversibile: il personaggio diventa un PNG). La penalità:
- vale solo per lo Stato attuale, senza sommare le precedenti;
- interessa tutte le Prove di Caratteristica, Abilità e Salvezza.

Il §5.20.1 dà esposizione, Intensità ed esiti della PS di Magia. Si usano quelli, in `regole.json` → `corruzione.stati`: nessuna scala provvisoria e nessuna domanda A.56. Lo Stato attuale va nella sessione, come l'Affaticamento, e la penalità entra nei valori effettivi (pezzo 3).

### Poteri
- Per ora contiene la tab Magia com'è.
- Per chi non ha magia mostra «Nessun potere».
- Tecniche Interiori (Risorse Interiori) e Poteri Sciamanici (Rune e Tatuaggi, in stesura da Davide) arriveranno.

### Artefatti
- Tab con gli Artefatti Mistici posseduti, gestiti come oggetti: PI, Sintonizzazione, riserve di Chroma.
- Quelli con incantesimi compaiono anche in Poteri; quelli che attaccano anche in Combattimento.

### Cibernetica e Veicoli
Tab presenti e vuoti, con la scritta «In arrivo con il manuale».
- Cibernetica: gestione simile all'equipaggiamento, con lo stato dell'Umanità.
- Veicoli: Davide prepara la scheda dello Scout come esempio.

### Inventario
- **Sezioni:** ARMI · ACCESSORI ARMI · ARMATURE E SCUDI · MUNIZIONI · DOTAZIONI PERSONALI · ESPLORAZIONE E SOPRAVVIVENZA · COMUNICAZIONE E RILEVAMENTO · STRUMENTI PROFESSIONALI · SANITARIO · RAZIONI.
- Riquadri compatti a tendina, come quelli attuali.
- Per ogni oggetto:
  - costo, Qualità, reperibilità;
  - PI, modificabili, con «Ripara»;
  - PS Integrità;
  - lo stato: impugnato, indossato, zaino o **deposito comune**.
- «Deposito comune» è uno stato nuovo: l'oggetto resta del personaggio ma fuori dal carico, senza gestione condivisa fra i personaggi.
- Il riquadro «Integrità degli oggetti» del Combattimento si fonde qui.

## Ordine dei pezzi

1. **Riga dei tab, Punti Eroe, Abilità.** La riga degli otto tab: Poteri mostra la Magia (o «Nessun potere»), gli altri nuovi un contenitore vuoto «In lavorazione». Punti Eroe sopra i PV nella colonna di sinistra. Tab Abilità con la colonna Condizioni a destra.
2. **Inventario:** sezioni, dati per oggetto, stato «deposito comune», Integrità.
3. **Combattimento:** riga dei valori, Protezioni e armi, riquadri delle mani, colonna Ferite · Affaticamento · Corruzione · Stati, gradi di Corruzione.
4. **Poteri e Artefatti.**
5. **Cibernetica e Veicoli** («In arrivo con il manuale»).
6. **Verifica complessiva e SS.**

## Stato

- [x] Piano (questo file).
- [x] Pezzo 1: riga degli otto tab (Poteri con la Magia o «Nessun potere», gli altri «In lavorazione»), Punti Eroe sopra i PV nella colonna di sinistra, Abilità con la colonna Condizioni a destra (a ~800 px la tabella mostra la formula sotto il nome e la colonna resta a destra; sul telefono scende sotto). Verificato nel browser a 1280, 800 e 375 px.
- [x] Pezzo 2: tab Inventario (`tabInventario` in `src/ui/tab.js`, modalità `inventario` di `src/ui/equipaggiamento.js`). In testa Carico (peso noto / soglia Ordinaria, provenienza al tooltip: cosa pesa, cosa è nel deposito, i pesi da definire; `provenienzaCarico` in `src/carico.js`) e Crediti; poi gli avvisi dell'equipaggiamento, il riquadro Integrità (spostato com'è) e le sezioni per famiglia (`SEZIONI_INVENTARIO` in `src/palette.js`, colori dei gruppi esistenti). Ogni riga: costo, Qualità, reperibilità, peso; un solo controllo di stato con «Deposito comune»; PI n/max con − e +, «Rotto», «Ripara» (il pannello si apre sotto la riga), PS Integrità. In fondo il catalogo con «Aggiungi» e «Compra (−N crediti)». Test in `tests/inventario.test.js`. Verificato nel browser a 1280, 800 e 375 px.
  Scostamenti dal piano:
  - **Stato:** era già in un solo campo (`voce.stato`), letto da motore e SS: nessuna migrazione del formato. Si aggiunge il valore `deposito` (ammesso per ogni tipo; fuori dal carico, senza effetti, fuori dalle scorte di munizioni e dalle applicazioni sanitarie). Restano gli stati fini del tipo (Impugnata, Addosso, Imbracciato, Indossata, In uso, Trasportato, Nello zaino): il motore li usa, ridurli ai quattro del piano toglierebbe informazioni; per i tipi senza stati il controllo è «Con sé» / «Deposito comune». Nei dati del foglio 3 l'oggetto nel deposito porta «(deposito comune)» (`elencoZaino`), ma la tabella stampata dell'equipaggiamento non lo mostra: la SS resta invariata, come da piano (verificato nel pezzo 6).
  - **Sezioni:** «Strumenti professionali» e «Razioni» arriveranno con i loro capitoli del Manuale dell'Equipaggiamento (oggi nessun oggetto); in più «Artefatti, cristalli e contenitori di Chroma» e «Altro equipaggiamento». «Accessori» comprende anche rinforzi e modifiche d'elmetto.
  - **Spostati nell'Inventario** oltre all'equipaggiamento e all'Integrità: il Carico (dalla tab Combattimento) e i Crediti (dalla tab Identità), perché gli acquisti al tavolo si fanno da qui.
  - **Resta nel Combattimento** fino al pezzo 3–4: Sanitario (§7.19) e Artefatti e sintonizzazione.
  - Il passo Equipaggiamento del wizard resta com'è (gruppi per tipo, senza deposito).
- [x] Pezzo 3: tab Combattimento (`tabCombattimento` in `src/ui/tab.js`). Colonna sinistra: PV con l'AR (quando la colonna delle risorse non si vede), Difese con Parata/Schivata Istintiva se il personaggio ha il Talento, Iniziativa, Movimento, Azioni, Prove Salvezza; «In mano»: le armi impugnate e lo scudo imbracciato nei riquadri delle mani («Due mani» per un'arma a due mani), con VA, danno, modalità, colpi nel caricatore, «Ricarica» e «Attacca!», e «Riponi»; Senz'armi; le armi disponibili con «Impugna»; le Protezioni con «Indossa»/«Imbraccia»/«Togli» e la tabella di prima; Artefatti e sintonizzazione (invariati, pezzo 4). Colonna destra: Ferite, Affaticamento, Corruzione e Stati in riquadri compatti con i gradi cliccabili e il «?» al tooltip; sotto ~30rem scende sotto. Corruzione Oscura: i gradi del §5.20 (Umano 0 … Caotico −10, Oscuro irreversibile) in `regole.json` → `corruzione.stati`, Stato attuale in `sessione.corruzione` (non azzerato da «Nuova sessione»), penalità nei valori effettivi con la provenienza «Corruzione Oscura (§5.20)», come l'Affaticamento. Test in `tests/combattimento.test.js`. Verificato nel browser a 1280, 800 e 375 px.
  Scostamenti dal piano:
  - **Ordine della colonna sinistra:** prima i valori e le armi in mano, poi le armi disponibili e le Protezioni (il piano metteva le Protezioni in cima); segue il prompt del pezzo, le armi in mano sono le più usate al tavolo.
  - **Mani:** l'app non registra quale mano tiene un oggetto: destra e sinistra seguono l'ordine dell'Inventario; oltre le due mani un riquadro a parte, con l'avviso di sempre.
  - **Sola lettura qui, modifica nell'Inventario:** caricatori di riserva, condizione dell'arma (A.49) e applicazioni dei kit sanitari (§7.19) sono passati nella riga dell'oggetto dell'Inventario; qui restano i colpi (−1, −5) e «Ricarica». Il Sanitario lascia in Combattimento solo un rimando.
  - **Corruzione:** nessuna scala provvisoria né domanda nuova, come previsto dal piano; esposizione, Intensità e Umanità restano fuori (backlog).
- [x] Pezzo 4: tab Poteri e Artefatti (`tabPoteri`, `tabArtefatti` in `src/ui/tab.js`).
  - **Poteri:** per tutti; con la magia la tab Magia com'era (PM e cristalli, incantesimi, scala di Potere, riserve esterne, incantesimi per macrofamiglia, «Lancia!»); senza, il riquadro «Nessun potere» con la riga del Manuale della Magia sez. 1 (`regole.json` → `poteri.nessuno`). «Da artefatti»: gli Artefatti con attivazione o riserva integrata, in sola lettura. Poteri Sciamanici: sezione chiusa «in attesa del manuale» (`poteri.in_arrivo`). Icona: ancora quella della Magia.
  - **Artefatti:** sintonizzazione in testa (usata / capacità per Gradi complessivi, bonus del Talento, elenco con i costi), una scheda per Artefatto (stato nell'Inventario, «Sintonizzato», potenza e costo, VA e danno con la provenienza se è l'arma in mano, AR se è la protezione indossata, attivazione, riserva integrata con i PM), le riserve di Chroma a sé. Icona `img/pagine/artefatti-*`. L'Inventario resta il possesso: lì «Sintonizzato» si legge soltanto (nel wizard resta il campo).
  - **Da Combattimento** è uscito il blocco «Artefatti e sintonizzazione», con un rimando; armi e protezioni Artefatto mostrano i loro effetti nei valori, come prima.
  - Test in `tests/poteri.test.js` e `tests/artefatti.test.js`. Verificato nel browser a 1280, 800 e 375 px.
  Scostamenti dal piano:
  - **Regola nuova, chiesta nel prompt del pezzo:** un Artefatto nel deposito comune non è sintonizzabile: non occupa capacità e la sua riserva non alimenta; la scelta «sintonizzato» resta nella voce e torna valida quando l'oggetto torna con sé (`src/equipaggiamento.js`).
  - **Tecniche Interiori:** restano nella tab Abilità dove sono già (§8.9, dati in `tecniche_interiori.json`); il segnaposto chiuso è solo per i Poteri Sciamanici, che Davide sta scrivendo.
  - **PI degli Artefatti:** si tengono nella riga dell'Inventario (pezzo 2), come per gli altri oggetti; la tab Artefatti non li ripete.
  - Le batterie compaiono due volte nella tab Artefatti: fra gli Artefatti posseduti (sintonizzazione) e fra le riserve di Chroma (PM).
- [x] Pezzo 5: tab Cibernetica e Veicoli, riquadro «In attesa del manuale» con i rimandi ai paragrafi che ne parlano già (Umanità, Giocatore §5.21; veicoli fuori dalle dotazioni, §2.16.30), testi in `regole.json` → `tab_in_arrivo`; icone `img/pagine/cibernetica-*` e `veicoli-*`. Nessun dato, nessun campo nel salvataggio.
- [x] Pezzo 6: verifica complessiva (sotto, «Esito»).

## Esito (30/09/2026)

### Confronto con la proposta di Davide (`docs/manuali-txt/layout-app-davide.md`)

24 punti: **12 fatti**, **9 fatti diversamente**, **3 rimandati**.

| # | Proposta | Esito |
|---|---|---|
| 1.1 | Tab in una fila in alto, dove ora c'è il simbolo | Fatto: riga in alto predefinita; l'opzione dell'ingranaggio (sinistra, in basso) resta. |
| 1.2 | IDENTITÀ · ABILITÀ · COMBATTIMENTO · POTERI · CIBERNETICA · INVENTARIO · VEICOLI | Fatto diversamente: otto tab, con ARTEFATTI a sé (decisione di Marcello); il Calendario resta in coda, se attivo. |
| 1.3 | Selezionato evidenziato, gli altri in secondo piano | Fatto. |
| 2.1 | Punti Eroe in alto a sinistra sopra i PV, usabili in Abilità e Combattimento | Fatto: colonna di sinistra in ogni tab; sul telefono una striscia compatta; con i tab in basso sul telefono restano in Identità. |
| 2.2 | Il resto di Identità così | Fatto diversamente: i Crediti sono passati nell'Inventario, dove si comprano gli oggetti al tavolo («Compra»). |
| 3.1 | Abilità in alto, spazi stretti, Condizioni attive in una colonna a destra | Fatto: sotto ~30rem la colonna scende sotto la tabella. |
| 3.2 | Talenti così | Fatto. |
| 4.1 | Blocco dell'equipaggiamento nel nuovo tab | Fatto: tab Inventario, con Integrità e Carico. |
| 4.2 | Fila Iniziativa · Movimento · Azioni · Difese, con Parata/Schivata Libera se c'è il Talento | Fatto diversamente: riquadri nella colonna sinistra, con le Prove Salvezza; Parata e Schivata Istintiva (i nomi del manuale, §8.6.7) come etichette sotto Difese. |
| 4.3 | Protezioni disponibili da indossare o dismettere, con Rinforzi, Scudi, Elmetti | Fatto diversamente: armature, scudi ed elmetti si indossano o si tolgono qui; i rinforzi si montano sull'armatura dall'Inventario («Montato su»). Le Protezioni vengono dopo le armi. |
| 4.4 | Armi disponibili da impugnare | Fatto. |
| 4.5 | Armi impugnate in due riquadri, mano destra e sinistra; uno solo con un'arma a due mani o lo scudo | Fatto diversamente: l'app non registra quale mano tiene l'oggetto; destra e sinistra seguono l'ordine dell'Inventario, «Due mani» per le armi a due mani, lo scudo occupa una mano. |
| 4.6 | Condizione e caricatori solo in consultazione, si cambiano nell'Inventario o con «Ricarica» | Fatto (anche le applicazioni dei kit sanitari). |
| 4.7 | Colonna destra Ferite · Affaticamento · Corruzione · Stati, selezionabili, info al mouse o «?» | Fatto: Corruzione con i gradi del Giocatore §5.20, nei valori effettivi. |
| 4.8 | «Attacca!» così | Fatto. |
| 5.1 | Poteri da zero, con gli Artefatti Mistici, adattabile alle scelte | Fatto diversamente: gli Artefatti hanno una tab propria; in Poteri una sezione «Da artefatti» in sola lettura. |
| 5.2 | Taumaturgo → pagina della magia | Fatto (anche chi ha incantesimi con Usufruitore di Magia); senza magia il riquadro «Nessun potere». |
| 5.3 | Risorse Interiori → Tecniche Interiori | Fatto diversamente: le Tecniche restano nella tab Abilità, dove erano già. |
| 5.4 | Poteri Sciamanici → Rune e Tatuaggi | Rimandato: sezione chiusa «in attesa del manuale». |
| 6 | Cibernetica come l'equipaggiamento, con l'Umanità | Rimandato: tab «In attesa del manuale», con il rimando al §5.21. |
| 7.1 | Sezioni: Armi, Accessori armi, Armature e scudi, Munizioni, Dotazioni personali, Esplorazione, Comunicazione, Strumenti professionali, Sanitario, Razioni | Fatto diversamente: Strumenti professionali e Razioni arrivano con i loro capitoli; in più «Artefatti, cristalli e contenitori di Chroma» e «Altro»; «Accessori» comprende rinforzi e modifiche d'elmetto; gli elmetti stanno con armature e scudi. |
| 7.2 | Riquadri piccoli a tendina | Fatto. |
| 7.3 | Costo, Qualità, reperibilità, PI modificabili, PS Integrità, stato impugnato / indossato / zaino / deposito comune | Fatto diversamente: tutti i dati; lo stato tiene quelli del tipo (Impugnata, Addosso, Imbracciato, Indossata, In uso, Trasportato, Nello zaino) più «Deposito comune». |
| 8 | Veicoli (scheda dello Scout) | Rimandato: tab «In attesa del manuale», con il rimando al §2.16.30. |

Scostamenti dei pezzi 2–4 già annotati qui sopra, riassunti:
- regola nuova del deposito comune: fuori dal carico, senza effetti, fuori dal tavolo; un Artefatto nel deposito non è sintonizzabile (la scelta resta; per-davide A.59);
- Carico e Crediti nell'Inventario; ordine della colonna sinistra di Combattimento (valori, armi in mano, poi disponibili e Protezioni);
- la SS è invariata: né il deposito né la Corruzione compaiono nei fogli stampati (non previsti dal piano).

### Verifica nel browser

Due personaggi (b, Arcanista con magia e Artefatti; a, Assaltatore senza), a 1280, 800 e 375 px: aperti, gli otto tab uno per uno; Bordone nel deposito comune dall'Inventario (Artefatti: sintonizzazione 4 → 2 su 7, «non sintonizzabile»; Combattimento: mani vuote) e di nuovo impugnato (4 su 7); Belliger impugnata e caricatore di riserva aggiunto dall'Inventario, 5 colpi sparati e «Ricarica» (10/10); Ferita Superficiale e Corruzione Contagiato (Difese −2 con la provenienza); «Lancia!» di Colpo Elementale al livello 1 (PM 41 → 40); esportato e reimportato (scelte e livelli identici, Ferita e Corruzione conservate nella sessione). Nessun errore in console, nessuno scorrimento orizzontale. Il personaggio salvato con le regole del 27/09 (`tests/collaudo/regole-27-09/`) mostra l'avviso «Regole aggiornate» in ogni tab, «Sali di livello» bloccato, «Assegna» apre il pannello.

### Valori rispetto a `main`

`calcolaScheda` a riposo e al tavolo (una Ferita e Rallentato) sui cinque file di `tests/collaudo/` (a, b, c, Lucas, la copia di b con le regole del 27/09), con il motore di `main` e con quello di `layout-sd`: **nessun valore cambia**. Le sole differenze sono campi aggiunti: `deposito` nelle voci risolte e negli Artefatti, `carico.righe` e `carico.esclusi`.

### SS

PDF di prova in `docs/esempi-stampa/` (`a_imperiale_assaltatore_l8-layout.pdf`, 3 pagine; `b_fratellanza_arcanista_l12-layout.pdf`, 5 pagine), con uno scudo (a) e una batteria (b) nel deposito comune e un grado di Corruzione nella sessione: i fogli 1–3 non superano la pagina. Il deposito e la Corruzione non compaiono nei fogli: il piano non li prevede nella SS; l'oggetto nel deposito resta fra gli oggetti del foglio 3, il carico stampato lo esclude.
