Fai questo lavoro, senza chiedere conferma. Riguarda solo la scheda da stampare (SS): layout, riempitivi, quadratini e colori. Non toccare dati, motore né scheda digitale, salvo dove indicato. Fermati a fare una domanda solo se qualcosa blocca davvero, e in quel caso una domanda sola, precisa.

## 0. Regole generali della SS (valgono per tutti i fogli)

- **Formato**: A4 orizzontale. Fogli 1–3 stanno ciascuno in una pagina; il foglio 4 (Magia) può occupare più pagine. Nessun altro foglio va oltre la pagina: se qualcosa non entra, si riduce il riquadro meno importante, non il font.
- **Font**: dimensione base 10 pt per tutto il testo, 9 pt solo per le intestazioni piccole delle colonne. Mai sotto. Le due misure sono due variabili CSS (`--ss-font` e `--ss-font-small`) in un solo punto del CSS di stampa, con un commento che dice che si regolano lì: le proveremo a stampa e le aggiusteremo.
- **Quadratini anneribili** (☐, stesso stile ovunque, ~3,5 mm di lato, bordo scuro sottile): si usano per tutto ciò che il giocatore consuma o segna a matita. Le regole di gruppo: file da 10 con un piccolo stacco ogni 5, e il numero cumulato a destra della fila (10, 20, 30…); se l'impaginazione rende meglio con file da 5, va bene, purché sia uguale in tutta la scheda.
- **Riempitivi**: alcuni riquadri sono indicati come «riempitivo»: prendono tutto lo spazio che avanza nella pagina dopo che gli altri riquadri hanno la loro dimensione naturale (flex/grid con `flex: 1` sulla colonna, non altezze fisse). Un solo riempitivo per pagina o per colonna, così il risultato è prevedibile.
- **Colori**: stessa palette della SD, documentata in `docs/palette.md`: rosso vivo = PV, blu = PM, verde = Punti Eroe; incantesimi tinti per macrofamiglia (Fisici rosa, Mentali azzurro, Spirituali verde). Osa: bordi colorati spessi sui riquadri principali, gradienti leggeri sugli sfondi dei riquadri per staccare cose simili adiacenti, intestazioni di riquadro con fondo colorato e testo bianco, righe alternate tinte nelle tabelle. Due vincoli: il testo resta nero su fondo chiaro (mai testo su fondo saturo tranne le intestazioni), e stampata in bianco e nero la scheda deve restare leggibile (i colori aiutano, non portano informazione da soli). `print-color-adjust: exact` dove serve perché i browser stampino gli sfondi.
- **Filigrana**: nel foglio 1, l'emblema della Corporazione del personaggio (da `img/`, gli stessi usati nella SD) centrato nella pagina, in scala di grigi, opacità 6–8%, sotto tutto il resto, non deve disturbare la lettura. Se il personaggio non ha Corporazione, nessuna filigrana.

## 1. Foglio 1 — Identità

- **Nome del personaggio** in alto a sinistra, grande; **accanto, in orizzontale, il riquadro Anagrafica** (altezza, peso, età, città, occhi, capelli, mano dominante, soprannome, PX…) su una o due righe di campi corti, non in colonna.
- **Caratteristiche**: riquadro ingrandito, è il più importante del foglio: valori grandi, modificatori leggibili, bordo colorato spesso.
- **Segni distintivi**: aggiungi i quadratini come quelli già presenti nel riquadro Punti Eroe (stesso stile), una fila per riga di testo.
- **Punti Eroe**: come oggi, bordo verde.
- **Background**: è il **riempitivo** del foglio 1: si espande a prendere tutto lo spazio che avanza, con righe guida leggere per scrivere a mano.

## 2. Foglio 2 — Abilità

- Il riquadro delle **Abilità** prende **tutta l'altezza della pagina**, nessun riquadro sopra o sotto; colonna sinistra larga.
- A **destra**, in colonna: prima i **Talenti** (con la prima frase di ciascuno, come oggi), sotto le **Annotazioni** come **riempitivo** con righe guida, che prendono tutto quel che resta.
- Nessun altro contenuto in questo foglio: se oggi c'era altro (statistiche, ecc.) va nel foglio 3, che le ripete comunque.

## 3. Foglio 3 — Combattimento ed equipaggiamento

- **Ripeti qui**: Iniziativa, Movimento, Azioni (come nella tab Combattimento della SD) e le **Prove Salvezza**, in un riquadro compatto in alto.
- **Punti Vita**: riquadro grande, bordo rosso, è il **riempitivo** del foglio 3. Dentro: un sottoriquadro piccolo con i **PV massimi**, e uno grande con gli **attuali** fatto di **quadratini**: tanti quanti i PV massimi, più una fila intera in più vuota (per gli aumenti di livello), con il numero cumulato a destra di ogni fila. Lascia anche uno spazio libero per scrivere a mano.
- **Armi**: tabella con **tutte le colonne che descrivono l'arma** nei dati (Abilità, VA per colpire calcolato, danno, gittata/portata, mani, INC/inceppamento, PI, capacità, modalità di fuoco, Qualità, proprietà, requisito FOR…): ordina le colonne come nella SD, intestazioni a 9 pt. Nessuna colonna omessa perché «non entra»: piuttosto si va a capo dentro la cella.
- **Colpi**: sotto ogni arma con cariche o proiettili, una riga di **quadratini per i colpi**: tanti quanti la capacità, ripetuti per il numero di caricatori/cariche che il personaggio possiede (minimo 2), e comunque una fila per caricatore. I caricatori vanno **separati in modo evidente** (uno stacco largo e un'etichetta piccola «car. 1», «car. 2»…), così un caricatore da 2 colpi (il lanciagranate della carabina Punisher) non si confonde con quello accanto. Armi a inserimento (revolver, pompa, doppiette): una sola fila con l'etichetta «colpi». Armi con più modalità (arma principale + lanciagranate) hanno una riga per ognuna.
- **Equipaggiamento**: nella tabella aggiungi **tre colonne** con intestazione piccola «ind», «zai», «Altro» e un quadratino per riga in ciascuna, così il giocatore segna dove sta l'oggetto. Il resto della tabella come oggi (peso, carico noto, oggetti senza peso).
- **Stati**: prova a stampare, accanto al nome di ogni Stato, il riassunto degli effetti già presente nell'app (le 11 righe marcate «riassunto, non testo del manuale»). Se con il font a 10 pt non entra nel foglio insieme al resto, riduci il riquadro a **una sola riga** con i soli nomi degli Stati da cerchiare, senza effetti. Decidi tu in base allo spazio, e dimmi cosa hai scelto.

## 4. Foglio 4 — Magia (più pagine ammesse)

- **Prima pagina**: in alto il riquadro **Punti Magia** (bordo blu) con i **quadratini** come per i PV (massimi in un sottoriquadro, attuali a quadratini con una fila in più), i cristalli/contenitori Chroma con i loro quadratini per i PM contenuti, e i valori di lancio del personaggio (Potere, Anticipazione, ecc. come nella SD). Sotto, la **lista degli incantesimi conosciuti**: una riga per incantesimo con nome, livello, macrofamiglia (riga tinta con il colore della famiglia), costo in PM, tempo di lancio, gittata, durata; è l'indice per il tavolo.
- **Pagine seguenti**: l'**elenco dettagliato**, una scheda per incantesimo con il testo completo, nell'ordine della lista, con intestazione tinta per macrofamiglia e il pallino del livello base come nella SD. Quante pagine servono; ogni scheda non si spezza fra due pagine (`break-inside: avoid`).
- Se il personaggio non ha magia, il foglio 4 non si stampa (come oggi, se già così).

## 5. Verifica e chiusura

- Prova la stampa con `--print-to-pdf` di Chromium (o l'equivalente già usato nel repo) per almeno due personaggi di esempio: uno Combattente senza magia con 3+ armi di cui una con due modalità di fuoco, e un Taumaturgo con 10+ incantesimi. Controlla: nessun foglio 1–3 che sbordi nella pagina seguente, quadratini allineati, filigrana visibile ma non fastidiosa, colori stampati.
- Metti i due PDF in `docs/esempi-stampa/` così li guardiamo per decidere il font.
- Aggiorna `docs/backlog.md` (spunta «SS a colori» e le voci di layout SS) e `docs/palette.md` se hai aggiunto usi dei colori.
- Un commit per foglio (1, 2, 3, 4) più uno per regole comuni e colori.
- Riepilogo finale in questa forma, senza altro: per ogni foglio cosa è cambiato in una riga; scelta fatta per gli Stati; valori di `--ss-font` e `--ss-font-small`; numero di pagine dei due PDF di prova; esito dei test esistenti.
