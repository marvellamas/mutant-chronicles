# Ricognizione dei Doc nuovi di Davide — 3–4 ottobre 2026

Solo ricognizione: nessun dato e nessun codice toccato, a parte il registro `docs/manuali-drive.md` e i testi
scaricati in `docs/manuali-txt/`. Le decisioni le prende Marcello con Davide; i lotti proposti sono in coda.

## 1. Doc trovati

Cartella Drive di Davide (`1p4jh2tKIN9kRimD4ifzth_YjWUZTH6-6`), elencata per intero. Oltre ai sei Doc del
registro ce ne sono **cinque di Davide che il registro non conosceva** (le prime tre segnalate da Marcello,
le altre due trovate ora). È per questo che i controlli di inizio sessione dicevano «Veicoli: nessun manuale»:
il Doc esisteva dal 2 ottobre, ma non era nel registro, quindi nessuno lo guardava.

| Doc | ID | Modificato (UTC) | Testo salvato | Nel registro prima di oggi |
|---|---|---|---|---|
| Manuale dei Veicoli v0.2 | `1lo_c3KLK7kntJwv195v5aD2ieuMfRuaThsDhPJCX3T4` | 2026-10-02 13:31 | `docs/manuali-txt/veicoli.md` | **no** |
| ASA Scout MK4 – Scheda v0.2 | `1DgvIVekDypu7UKHup-SHSSKCzuK_R-l75Xd9kPsRhHY` | 2026-10-02 13:32 | `docs/manuali-txt/asa-scout-mk4.md` | **no** |
| Manuale dei Mostri v0.1 | `11Uxmz9GM2vU2knngtIPk_80532ABlHC3xL8ZvAXX7rE` | 2026-10-03 15:02 | `docs/manuali-txt/mostri.md` | **no** |
| Talenti magici e mistici (32 Talenti Liberi) | `1CG4rdCLk4GGSQ12nfzgZvGr_-V0j_mXj-Jk5x6GtRbw` | 2026-09-27 02:12 | `docs/manuali-txt/talenti-magici-mistici.md` | **no** (contenuto già nei dati) |
| Modifiche Layout APP | `1yJfODHcyFeOQnE45fSRm1mT0Jd1vlXstkqOHNX_PDsM` | 2026-09-29 13:25 | `docs/manuali-txt/modifiche-layout-app.md` | **no** (contenuto già applicato) |
| SIMPLY_RPG_Prontuario_Combattimento_v1.3.pdf | `1K9HBwBBZHSGzpQxCoRbNNwOHfE-gaOil` | 2026-09-26 13:19 | — (PDF, non scaricato) | **no** |
| Manuale del Giocatore | `110LNyYLZFWRGYuym836EqKYOUvoQRYvqBzm_2bJqybc` | 2026-10-03 19:16 | `docs/manuali-txt/giocatore.md` | sì |
| Magia, Armamenti, Equipaggiamento, E&L, per-davide.md | — | invariati | — | sì |

Nella cartella ci sono anche due scorciatoie (`per-davide.md`, «Per Davide — domande aperte ed errata») e
materiale di Marcello (la cartella «FILE PG», il Doc `SIMPLY_RPG_-_Bestiario_proposta` del 03/10, che è il
nostro `docs/bestiario/bestiario.html` caricato per Davide). Niente di nuovo sulla **Cibernetica**: nessun
Doc dedicato, le regole stanno dove già sapevamo (§2 più sotto).

Sui due Doc «vecchi» mai registrati:
- **Talenti magici e mistici**: è la fonte dei 32 Talenti Liberi magici già in `data/talenti_liberi.json`
  (riserva e recupero di PM, accesso agli Incantesimi, Componenti, Concentrazione, Contromagia,
  Anticipazione, efficacia e occultamento, Rituali). Da aggiungere al registro perché cambiandolo
  cambierebbero i dati, non perché manchi qualcosa.
- **Modifiche Layout APP**: è la richiesta di layout del 29/09, già realizzata (otto tab, Punti Eroe nella
  colonna di sinistra, Condizioni attive, Inventario per sezioni). Resta non fatto solo ciò che Davide
  stesso dichiarava «lo sto sviluppando»: **Rune e Tatuaggi** dei Poteri Sciamanici (tab Poteri), e appunto
  Cibernetica e Veicoli. Da registrare come fonte del layout.
- **Prontuario Combattimento v1.3 (PDF)**: riassunto per il tavolo, non una fonte di dati. Da registrare
  come riferimento, nessun lotto.

## 2. Manuale del Giocatore: le modifiche del 03/10 19:16

`git diff docs/manuali-txt/giocatore.md`: 19 righe cambiate, due differenze sostanziali.

1. **Regola — Punti Abilità Liberi da 10 a 7** per Grado (§2.0 passo 5, §2.13, §2.18 della checklist, §8.1,
   §8.3, §8.7; «nel percorso completo 42 Punti Abilità Liberi»). L'esempio del Mishima Agente è stato
   **rifatto in modo coerente**: Percezione 2, Tecnologia 1, Cultura 1, Raggirare 3, con i VA 12 / 7 / 8 / 11.
2. **Regola — profilo di competenza dell'Incursore** (§3.7): *Armi da guerra* da Generica a **Professionale**,
   *Armi da mischia* da Professionale a **Generica**. I conteggi 2 S / 6 P / 12 G / 4 N e le basi 7/6/5/3
   restano; cambia solo quale Abilità sta in quale categoria.
3. Nessun'altra differenza: niente di nuovo su Cibernetica, Veicoli o Mostri.

**Conflitto da risolvere (A.90).** Il numero dei punti liberi ha ora tre fonti dello stesso giorno:

| Fonte | Ora (UTC) | Punti liberi per Grado |
|---|---|---|
| E&L – Risposte approvate | 03/10 14:13 | **5** (decisione 90, già applicata in `regole.json`) |
| Manuale dei Mostri §5.2 | 03/10 15:02 | **5** («la taratura dei personaggi deve recepire i 5 punti Abilità liberi a ogni Grado, compreso il primo») |
| Manuale del Giocatore §2.13 | 03/10 **19:16** | **7**, con l'esempio ricalcolato |

Il Giocatore è l'ultimo in ordine di tempo ed è autoconsistente, ma `docs/risposte-master.md` ha la
precedenza sui manuali (CLAUDE.md) e due fonti su tre dicono 5. **Non ho toccato i dati**: l'app resta a 5.

## 3. Veicoli

### 3.1 Che cosa contiene il Manuale dei Veicoli v0.2

Dieci capitoli, completi di numeri (nessun «da definire» nelle regole; qualche «da definire» solo nelle
dotazioni dello Scout).

- **1 Conduzione e risorse.** 1 Round = 6 s, 1 Q = 1,5 m, 1 Q/Round = 0,9 km/h. **Pilotare usa INT**; la
  guida ordinaria non richiede Prove. Il veicolo si muove **all'Iniziativa del conducente**, non ha
  un'Iniziativa propria e non concede Azioni: condurre costa 1 AzM, una manovra complessa volontaria 1 AzP
  in più. **MAN** (Manovrabilità) da −2 a +2 si somma a Pilotare. Alimentazione a NEC (capacità, erogazione,
  autonomia), formati dell'Equipaggiamento §5.4.
- **2 Movimento e manovre.** Tre andature: Controllata (MOV, 0), Veloce (×2, −2 VA), Massima (×3, −4 VA);
  si cambia una fascia per AzM. Terreno Difficile 2 Q per Q. Manovre complesse con i loro esiti.
- **3 Attacchi e protezioni.** L'arma usa la propria Abilità, non Pilotare. Penalità dell'andatura **sia a
  chi spara da bordo sia a chi spara contro** (−2 / −4), che si sommano fra i due mezzi. Copertura Leggera
  −2, Media −4, Totale impedisce. **Manovra Evasiva** del Pilota: 1 AzP anche fuori Iniziativa, Pilotare −4,
  evita l'attacco; contro un Magistrale serve un Magistrale.
- **4 Strutture e Integrità.** Tre riserve di PI distinte: **Corpo principale, Propulsione, Motore**. PS
  Integrità per Qualità (Scarsa 8 → Leggendaria 18), **la stessa tabella del nostro `regole.json` →
  `integrita`**. Localizzazione con 1d20: 8–20 Corpo, 4–7 Propulsione, 2–3 Motore, 1 Occupanti, con le
  penalità per la selezione accurata (−2 / −4 / −6 / −8). Conversione del danno: **1 PI ogni 5 danni o
  frazione** dopo l'AR, una sola PS Integrità per struttura e per colpo (successo = metà per eccesso,
  minimo 1), poi **Corazzato X** riduce ancora. Quattro stati per struttura su soglie di 1/3 e 2/3, con le
  penalità a Pilotare (si applica solo la peggiore).
- **5 Collisioni e incidenti.** Danno da collisione, danni agli occupanti, ribaltamento ed espulsione,
  caduta, veicolo fuori uso con movimento residuo, passaggio dei comandi, atterraggio impossibile.
- **6 Inseguimenti e speronamento**, con un esempio completo.
- **7 Riparazioni e Talenti.** Tecnologia, 1 ora per struttura: Magistrale +2 PI, successo +1, Maldestro
  −1. Costo dei ricambi **per PI** e tariffa dell'officina. Otto capacità professionali (Meccanico di Bordo,
  Duro Lavoro, Mani Esperte, Addestramento di Bottega, Specializzazioni dell'Artigiano, Cannibalizzazione,
  Intervento Rapido, Manutenzione Preventiva), Riparazione d'Emergenza, **Spinta al Limite** e
  **Sovraccarico Tecnico** con la tabella «quale sistema toglie PI a quale riserva».
- **8 Scheda e consultazione.** Campi del profilo, ordine di risoluzione di un attacco in sei passi,
  riferimenti rapidi.
- **9 Autovettura civile.** Primo profilo completo: 1+4 posti, MOV 40 / MAN 0, Comune / PS 10, AR 1,
  Corpo 12 / Propulsione 8 / Motore 8 PI, 1 Banco Rosso, 1.000 km, 20.000 cr, ricambi 250/150/200 cr per PI,
  officina 100 cr/h, ricarica 500 cr.
- **10 ASA Scout MK4.** Il mezzo del gruppo, ripreso dal Doc della scheda.

### 3.2 La scheda ASA Scout MK4 v0.2

Il ricognitore di Petra: MOV 30 / MAN 0, AR 4 (0 magica), Corazzato 1, Non comune / PS 12, 8 posti,
4 × 2 Q, carico 1.500 kg, Rara, telaio 90.000 cr + M606 19.000 cr. **Corpo 60 / Propulsione 36 / Motore 24
PI** con le soglie già calcolate. Mitragliatore leggero Capitol M606 su botola (Armi Pesanti, 1d8+3, 600 Q,
400 colpi, 3 per colpo, PI 8). Proprietà: Assetto fuoristrada, Ignifugo 1, abitacolo e botola con Copertura
Media, navigatore. **Copriruote di Petra**: 6 pezzi (4 montati + 2 ricambi), 3 PI ciascuno, PS 12, assorbono
le perdite della Propulsione in successione, con sostituzione in 30 minuti e la PS per le sollecitazioni
oltre 30 Q nelle Terre del Fuoco. Supporto vitale 24 h per 8 occupanti, comunicatore ponte 50 km,
alimentazione 2 Banchi Rossi (100.000 Lx, erogazione 20.000 Lx/h). Registro della spedizione con le caselle
da riempire. Restano «da definire»: formato delle bombole, consumo e autonomia di viaggio dello Scout,
scorte energetiche di partenza, prezzo completo.

### 3.3 Che cosa fa oggi l'app e che cosa manca

Oggi: **niente**. La tab Veicoli esiste (`src/ui/tab.js` → `tabInArrivo`) e mostra una riga da
`regole.json` → `tab_in_arrivo.veicoli` («arriva con il Manuale dei Veicoli, Davide prepara lo Scout come
esempio») più il rimando al §2.16.30; il foglio Veicoli della stampa è escluso finché quella chiave esiste
(`src/stampa.js` → `FOGLI`). Nel personaggio non c'è nessun campo.

Manca tutto, in ordine di dipendenza:
1. **Dati**: `data/veicoli.json` con le regole (andature, MAN, localizzazione, conversione 1 PI ogni 5
   danni, stati delle strutture, riparazioni, collisioni) e un catalogo di profili (`autovettura-civile`,
   `asa-scout-mk4`), sul modello di `formato_nemici.json` + `bestiario.json`. La PS Integrità per Qualità è
   già in `regole.json` → `integrita`: va riusata, non duplicata.
2. **Motore**: `src/veicoli.js` (puro) per andature e Movimento disponibile, VA di Pilotare con MAN +
   andatura + stato peggiore delle strutture, conversione danno → PI con PS e Corazzato, stati e soglie,
   riparazioni, autonomia in Lx/km.
3. **Scheda (SD)**: tab Veicoli con il mezzo del gruppo, le tre riserve di PI con − e +, andatura corrente,
   autonomia residua, armi di bordo collegate ad «Attacca!», avarie e ripristini temporanei.
4. **SS**: foglio Veicoli (profilo, tre riserve con le caselle, armi di bordo, registro della spedizione
   come nella scheda di Davide), da togliere dall'esclusione in `src/stampa.js`.
5. **Inventario**: i veicoli non sono oggetti del Carico. Serve decidere se il mezzo è del **gruppo** (una
   scheda a parte, come il deposito comune) o del personaggio: è la domanda A.91.
6. **Tavolo del Master**: il veicolo in uno scontro. Il Manuale lo rende possibile con poco: il mezzo non
   ha Iniziativa propria (agisce a quella del conducente), quindi non è un partecipante, ma ha tre riserve
   di PI, localizzazione con 1d20 e una procedura di danno propria. Impatto reale su `src/danno.js`
   (una `applicaColpoVeicolo`, o un ramo «bersaglio struttura» accanto a PV/Ferite) e sulla plancia (una
   carta del veicolo con le tre riserve, «Colpito» con localizzazione e PS Integrità). È il pezzo più
   grosso e va fatto **dopo** i punti 1–3.

Note di raccordo già verificate: le penalità dell'andatura valgono anche per chi **attacca** il veicolo
(entra in «Attacca!», `regole.json` → `attacco_distanza`); Corrosivo e Magistrale hanno regole proprie nel
§4.3 (il Magistrale moltiplica il danno **prima** dell'AR e aggiunge il suo PI, senza raddoppiare i PI già
calcolati: coerente con la correzione del 04/10 in `src/danno.js`); gli esoscheletri **non** ricevono le tre
riserve e restano nell'Armamenti.

## 4. Cibernetica

**Dove sta.** Non c'è un Doc nuovo: le regole sono dove erano già, e sono già applicate.
- **Giocatore §5.21 «Umanità»**: valore, perdita all'installazione, fasce, effetti (PM Massimi, capacità di
  Sintonizzazione, PS di Magia contro la Corruzione), Umanità 0 e recuperi concessi dal Direttore.
- **Equipaggiamento 0.5, capitolo 7**: catalogo degli impianti singoli con beneficio, costo UMN (metà per i
  modelli CYBERTRONIC), prezzi, Integrità e chip del Processore neurale di Abilità.
- Rimandi sparsi: Magia sez. 26 (i chip non migliorano magia e Sintonizzazione, una attivazione ogni 24 h),
  Armamenti §7.10 (SnT e SIN, l'innesto dello Scudo), Armamenti §7.23 (i costi dell'innesto seguono il
  catalogo cibernetico).
- **Modifiche Layout APP** (29/09) diceva «CIBERNETICA (la sto sviluppando), da gestire più o meno come
  l'equipaggiamento e da mettere lo stato dell'UMANITÀ»: è esattamente quello che l'app fa adesso.

**Che cosa fa oggi l'app.** Tutto quello che i manuali prevedono: `data/equipaggiamento/impianti.json` con
**68 voci** (2 interfacce neurali, 8 sensoriali, 8 protesi, 8 protezione e supporto, 6 coordinamento
neurale, 6 comunicazione, 4 iniettori, 2 Processori, 24 chip), `regole.json` → `umanita` e → `impianti`,
motore `src/umanita.js` (la perdita si registra all'installazione e resta se l'impianto si toglie; recuperi
del Direttore), tab Cibernetica con Umanità, provenienza, effetti della fascia, impianti per famiglia e
chip, foglio Cibernetica nella SS (stampato solo con impianti installati o Umanità ridotta), e la riduzione
della capacità di Sintonizzazione nella tab Artefatti.

**Che cosa manca** — e manca nei manuali, non nell'app:
1. **Catalogo dei recuperi di UMN.** Armamenti §7.23: «Le procedure che ripristinano UMN devono precisare
   requisiti, condizioni e punti restituiti (Giocatore §5.21); il loro catalogo resta da sviluppare».
   Oggi l'app li accetta come voci libere decise dal Direttore (`aggiungiRecupero`). Domanda A.92.
2. **Corpi cyborg completi** e le loro centrali energetiche: esclusi espressamente dal cap. 7
   («non fanno parte di questo catalogo»). Domanda A.93.
3. **Innesti collegati all'equipaggiamento** (SIN dello Scudo, Armamenti §7.23.x): il costo UMN
   dell'innesto «segue il catalogo cibernetico», ma nel cap. 7 non c'è una voce per l'innesto di un oggetto.
   Domanda A.94.

Niente di tutto questo blocca il gioco: sono voci mancanti nei manuali, non buchi dell'app.

## 5. Manuale dei Mostri contro il nostro Bestiario proposto

Confronto fra `docs/manuali-txt/mostri.md` (Davide, v0.1 del 03/10) e `docs/bestiario/bestiario.md` +
`data/bestiario.json` (nostra proposta, bozza 0.2 del 02/10, già nei dati con `TODO(Davide)`).

### 5.1 Dove coincidono

- **Impianto generale**: regole condivise con i PG (1d20 ≤ VA), «valori pronti» nella scheda (VA, danno e
  Difese già calcolati, al tavolo si aggiungono solo le modifiche temporanee), identità prima dei numeri.
  È lo stesso principio del nostro §1.3 e del formato `data/formato_nemici.json` (A.73).
- **I cinque nomi della scala**: Minore, Semplice, Medio, Potente, Molto potente. Identici ai nostri.
- **Campi della scheda**: la tabella del suo §3.1 e il nostro §1.3 coincidono quasi voce per voce
  (Caratteristiche, PV, PM, AR totale e magica, Difese, Salvezze, Iniziativa + 1d10, Movimento, spazio e
  Azioni, attacchi con portata/gittata e AC, protezioni, Abilità e sensi, capacità, incantesimi,
  comportamento).
- **PM**: «PM 0 riserva esaurita, PM — riserva inesistente», identico alla nostra scelta (A.73, decisione 8).
- **PV, Ferite, Menomazioni**: 0 PV non fa svenire, il danno non porta sotto 0, a 0 PV PS di Tempra e fasce
  del §5.14, sequenza Superficiale → Morte, recuperare PV non toglie Ferite. Identico al nostro §1.5 e a
  `src/danno.js`.
- **Menomazioni su anatomie non umane**: la scheda associa le localizzazioni alle parti funzionali prima
  dello scontro; più arti non moltiplicano tiri o lesioni. È la nostra regola, voce per voce.
- **Niente Affaticamento per i nemici** come traccia ordinaria: coincide con il formato dei nemici.
- **A.78 e Magistrale naturale**: attacchi e Difese si tirano anche con VA ≥ 20; 2 Magistrale a VA ≥ 21;
  con Successo Magistrale Migliorato anche il 3. Già nei dati (`regole.json` → `prova`, `magistrale_naturale`).
- **Umani come avversari**: mantengono i valori delle regole di creazione, la conversione non moltiplica i
  PV e non aggiunge danni o Azioni per il numero di giocatori. È esattamente `src/nemico-da-pg.js` e i
  bestiari umani di `esempi/nemici/umani/`.
- **Verifica al tavolo**: il suo §6.2 propone come primo banco di prova **sette PG di 5° livello**; il
  nostro `data/bestiario.json` → `gruppo_pg` è 7 e la riga di riferimento del 5° livello è quella del grado
  Semplice. Stessa scelta.
- **Granate**: A.86 confermata (nessun bonus di Caratteristica al danno dell'esplosione).
- **Fauna di Iris**: i nomi delle creature previste (Rasenti, Saltatori, Taglienti, Raccoglitori, Scarabei
  filtratori, Lorath, Iene mutate, Regina) sono gli stessi dell'ambientazione delle nostre sessioni.

### 5.2 Dove si contraddicono

| Punto | Manuale dei Mostri (Davide) | Nostra proposta (già nei dati) |
|---|---|---|
| **Volo** | §4.5: «Essere in volo **non impone un nuovo −2 universale** a chi attacca. Si applicano le penalità comuni dell'andatura e le capacità espresse». | `bestiario.json` → base Alato: proposta di **−2 VA a chi attacca un bersaglio in volo** (§3.1.1), già mostrata sulle carte della plancia. |
| **Taglia** | §4.5: «Lo spazio occupato **non conferisce da solo** bonus per colpire, portata aggiuntiva o immunità alle prese. Le creature di massa paragonabile a un veicolo mantengono il trattamento di Sbalzante». | base Gigante: proposta di **+2 VA contro la taglia Grande** e `massimo_per_scontro`, già sulle carte. |
| **Scala di potenza** | §2.2: le cinque fasce «in questa versione sono **orientative**: non assegnano PV, Azioni o un rapporto automatico con il livello dei PG. La futura taratura dovrà definirne i confini». | Taratura numerica completa: PV/VA/Difese/AR/danno/AzP per grado, Round di resistenza, tabelle «facile / normale / duro» su 7 PG e per livello (§2.1–2.3). |
| **Costo dei moduli** | §5.3: «**Non esiste ancora un costo universale in mezzi gradi**: ogni combinazione va esaminata nel suo insieme», con una tabella di domande di verifica. | §2.4: costo in grado +0 / +½ / +1 / +2 e **grado effettivo** calcolato dalla somma, usato da «Crea nemico» e «Prepara scontro». |
| **Boss** | §5.4: il boss «non riceve automaticamente Salvezze aumentate, durate dimezzate o rimozione degli Stati»; **ogni beneficio deve comparire nella scheda**. Le fasi hanno soglia, segnale visibile e cambiamento preciso, non si ripetono. | §2.5: il Boss ha regole automatiche (`boss`: +1 AzP, PV ridotti al 70% se l'AR è alta, 12 Round di resistenza). |
| **Basi** | §2.1: Famiglia, Anatomia, Spazio e portata, **Locomozione** e Origine sono **campi indipendenti** («una creatura insettoide può essere grande, volante e corrotta insieme»). | Otto **basi chiuse** (umano, insettoide, aracnoide, umanoide mostruoso, quadrupede, alato, strisciante, gigante), dove il volo e la taglia sono proprietà della base. |
| **Impiego** | §2.2: gregario / avversario ordinario / élite / boss sono **etichette che non concedono bonus**. | I tre gradi umani (recluta, veterano, élite) dei nostri bestiari umani sono gradi di potenza, non etichette. |
| **Le nostre creature** | §6.4: «Le nuove creature della proposta del collaboratore costituiscono **materiale da adattare** con questo metodo; le relative statistiche **non vengono trasferite automaticamente**». | 22 creature pronte in `data/bestiario.json`, usate da «Crea nemico» e «Prepara scontro». |

Da notare: **non si contraddicono sul metodo**, ma sullo stato. Davide lascia volutamente vuoti i posti
(scala, costi, boss) che noi abbiamo riempito per far funzionare «Crea nemico» e «Prepara scontro», e dice
esplicitamente che la taratura va fatta e verificata al tavolo — che è lo scopo del nostro §2 e di
`tools/taratura_bestiario.mjs`.

### 5.3 Raccomandazione

**Adottare il Manuale dei Mostri come fonte e tenere il nostro Bestiario come strumento di generazione e
taratura**, non unire i due documenti.

Perché:
- il formato della scheda, le regole comuni (PV, Ferite, Menomazioni, PM, Difese, sensi) e i principi sono
  già gli stessi: l'allineamento costa poco e il nostro `formato_nemici.json` non cambia;
- le tre contraddizioni vere (volo, taglia, boss automatico) sono **proposte nostre** che Davide ha
  implicitamente respinto scrivendo la regola opposta: si tolgono dai dati, e la plancia smette di mostrare
  quelle etichette. È una sottrazione, non un rifacimento;
- la nostra taratura numerica **non è in conflitto**: riempie il buco che Davide dichiara aperto. Resta
  nostra, marcata `TODO(Davide)`, e serve a «Prepara scontro» per dire «facile / normale / duro». Se Davide
  la ratifica (o la corregge) diventa regola; se la rifà, cambiamo solo i numeri in `bestiario.json`;
- le creature: le sue tre (Rasente, Lorath, Regina) entrano nel bestiario della campagna con i suoi numeri,
  perché sono della nostra ambientazione; le nostre 22 restano come generatore, con la nota che sono
  proposte.

Alternativa scartata: **unire** i due documenti in un solo manuale. Costerebbe una riscrittura del nostro
Bestiario e lo renderebbe un doppione del Doc di Davide, che continuerà a cambiare.

## 6. Lotti proposti

Nessuno di questi è iniziato. Stime in sessioni di lavoro, come le precedenti.

| # | Lotto | Che cosa comprende | Stima | Dipendenze |
|---|---|---|---|---|
| **1** | **Giocatore del 03/10** | Punti liberi 10 → 7 **oppure** 5 (dopo la risposta ad A.90): `regole.json` → `creazione` e `avanzamento.eventi`, avviso dei punti in eccesso, test di collaudo, esempio del §2.13 nei test; profilo dell'Incursore in `classi.json` → `competenze` (indipendente, si può fare subito). | ½ sessione (Incursore: 1 ora) | **A.90** per i punti; l'Incursore no |
| **2** | **Veicoli, dati e motore** — **fatto il 04/10** | `data/veicoli.json` (regole dei cap. 1–7 + profili Autovettura e ASA Scout MK4), validatore, `src/veicoli.js` puro (andature, Pilotare con MAN e stati, danno → PI con PS e Corazzato, riparazioni, autonomia), test con gli esempi numerici del manuale (§4.3, §4.4, §7.4, §9.1). Esito nel §8. | 2 sessioni | A.91 (veicolo del gruppo o del PG) per la forma del salvataggio |
| **3** | **Veicoli, scheda e stampa** | Tab Veicoli della SD (mezzo, tre riserve con − e +, andatura, autonomia, armi di bordo, avarie), foglio Veicoli della SS, uscita da `tab_in_arrivo`. | 1 sessione e ½ | lotto 2 |
| **4** | **Veicoli al Tavolo del Master** | Carta del veicolo nella plancia, «Colpito» con localizzazione 1d20 e PS Integrità per struttura, armi di bordo in «Attacca!», penalità dell'andatura per chi attacca il mezzo, collisioni e speronamento come promemoria. | 2 sessioni | lotti 2–3 |
| **5** | **Cibernetica, completamento** | Solo dopo le risposte: catalogo dei recuperi di UMN (A.92), corpi cyborg (A.93), innesti dell'equipaggiamento (A.94). Senza risposte non c'è lavoro: l'app è già allineata ai manuali. | ½ sessione per risposta | **A.92–A.94** |
| **6** | **Mostri, allineamento** | Togliere dai dati le tre proposte respinte (volo −2, taglia +2, Boss automatico: `bestiario.json`, `src/nemici.js`, carte della plancia); allineare i campi della scheda ai cinque indipendenti del suo §2.1 (Famiglia, Anatomia, Spazio e portata, Locomozione, Origine) in `formato_nemici.json`; registrare le tre creature di Iris (Rasente, Lorath, Regina) con i suoi numeri. | 1 sessione | **A.95–A.97** |
| **7** | **Registro dei Doc** | Fatto in questo lotto: i cinque Doc nuovi nel registro `docs/manuali-drive.md`, con ID, data vista ed edizione, così i controlli di inizio sessione li vedono. | fatto | — |

## 7. Domande per Davide (A.90 in poi)

Da incollare nel Doc «per-davide.md» con il prossimo pacchetto (`docs/protocollo-davide.md` §5).

- **A.90 — Punti Abilità Liberi: 5 o 7?** L'E&L del 03/10 (14:13) e il Manuale dei Mostri §5.2 (15:02)
  dicono **5 a ogni Grado, compreso il primo**; il Manuale del Giocatore del 03/10 (19:16) dice **7** in
  otto punti, con l'esempio del §2.13 ricalcolato su 7 (Percezione 2, Tecnologia 1, Cultura 1, Raggirare 3).
  L'app è a 5. Quale vale? Se valgono 7, riallineiamo anche i Mostri §5.2 e l'E&L.
- **A.91 — Il veicolo è del gruppo o del personaggio?** L'ASA Scout è «il vostro Scout»: un mezzo solo per
  tutta la squadra. Lo registriamo come scheda del gruppo (come il deposito comune, visibile a tutti e
  modificabile dal Direttore), oppure come voce del personaggio che lo possiede? E i PI e l'autonomia li
  tiene il Direttore o il giocatore?
- **A.92 — Recuperi di Umanità.** Gli Armamenti §7.23 dicono che «il catalogo resta da sviluppare». Per ora
  l'app registra recuperi liberi decisi dal Direttore (quanti punti, da cosa, quando). Ci sono già
  procedure da mettere a catalogo (trattamenti, Rituali, tecnologia Cybertronic), o resta così?
- **A.93 — Corpi cyborg completi.** Il cap. 7 li esclude espressamente. Sono previsti per i PG, o restano
  roba da PNG? Se sono previsti, servono le centrali energetiche e il loro effetto sull'Umanità.
- **A.94 — Innesto neurale dell'equipaggiamento (SIN).** Gli Armamenti §7.4.11 e §7.23 dicono che «gli
  eventuali costi dell'innesto seguono il catalogo cibernetico», ma nel cap. 7 dell'Equipaggiamento non
  c'è una voce per innestare un oggetto (per esempio uno Scudo con SIN). Quanto costa in UMN e in crediti?
- **A.95 — Volo e taglia.** Il Manuale dei Mostri §4.5 dice che il volo non impone un −2 universale a chi
  attacca e che lo spazio occupato non concede da solo bonus per colpire. Confermi che le nostre due
  proposte (−2 VA contro un bersaglio in volo, +2 VA contro la taglia Grande) vanno **togliete** dai dati
  dell'app e dalla plancia?
- **A.96 — Boss.** Il tuo §5.4 dice che un boss non riceve nulla automaticamente e che ogni beneficio deve
  stare nella sua scheda. La nostra proposta gli dava +1 AzP e PV ridotti quando l'AR è alta: li togliamo e
  lasciamo che ogni boss scriva i propri benefici? La Regina del tuo §7.3 ha «3 AzP complessive e azioni
  distribuite» scritte nella scheda: quella è la forma giusta?
- **A.97 — Scala di potenza e costo dei moduli.** Le cinque fasce sono «orientative» e il costo in mezzi
  gradi «non esiste ancora». La nostra proposta ne dà una taratura completa su sette PG (PV, VA, AR, danno,
  AzP per grado; tabelle facile / normale / duro) e un costo +0 / +½ / +1 / +2 per i moduli. La usiamo come
  base per la tua taratura, la rifai tu, o teniamo «Prepara scontro» con la nostra come stima provvisoria?
- **A.98 — Rune e Tatuaggi (Poteri Sciamanici).** Nelle «Modifiche Layout APP» del 29/09 scrivevi «la sto
  sviluppando». È ancora in corso? Nella tab Poteri il posto è pronto (come per la Magia e le Tecniche
  Interiori): servono i dati.
- **A.99 — Prontuario del Combattimento v1.3 (PDF del 26/09).** È un riassunto per il tavolo o una fonte da
  seguire quando diverge dai manuali? Lo mettiamo nel registro come riferimento, senza estrarne dati.

## 8. Lotto 2 dei Veicoli: fatto il 4 ottobre 2026

Dati e motore, senza interfaccia e senza campi nel personaggio. Letti integralmente anche i capitoli 5 e 6
(collisioni, incidenti, inseguimenti, speronamento), che in questa ricognizione erano stati visti solo per
sommi capi.

**`data/veicoli.json`** (versione «Veicoli 0.2», con la scheda dello Scout): misure del §1.1; Pilotare su INT
(§1.2); Azioni e Iniziativa del conducente (§1.3); le cinque fasce di MAN (§1.4); le quattro andature con
moltiplicatore, penalità a Pilotare e penalità agli attacchi da bordo e contro il mezzo (§2.1, §3.1); terreno
difficile (§2.3); le cinque manovre complesse con l'andatura di riferimento e i quattro esiti (§2.4, §2.5);
Copertura (§3.2) e Manovra Evasiva (§3.3); le tre strutture con i cinque stati e le soglie di 1/3 e 2/3 (§4.1,
§4.4); localizzazione 1d20 con le penalità della selezione accurata (§4.2); conversione del danno in PI con
PS Integrità e Corazzato, e l'esempio del manuale (§4.3); collisioni, danni agli occupanti, ribaltamento e
caduta (§5.1–5.4); veicolo fuori uso e passaggio dei comandi (§5.5, §5.6); inseguimento (§6.1) e Speronamento
con il suo esempio (§6.3); riparazioni con le otto capacità professionali, Riparazione d'Emergenza, Spinta al
Limite e Sovraccarico Tecnico (§7.1–7.4); i due profili completi, con i **Copriruote di Petra** come rinforzo
della Propulsione. La PS Integrità per Qualità **non** è duplicata: il validatore controlla che quella del
profilo coincida con `regole.json` → `integrita.ps_per_qualita`.

**Validatore** (`src/validate.js` → `validaVeicoli`): andature nell'ordine giusto con i moltiplicatori 0–3,
MAN da +2 a −2, le tre strutture, i cinque stati con le penalità per struttura, le righe della localizzazione
che coprono le 20 facce del d20, la conversione del danno e i suoi invarianti (una PS per colpo, minimo 1,
Corazzato dopo la PS), l'AR per natura uguale a quella dei personaggi, gli esiti della riparazione da +2 a
−1 PI, lo Speronamento senza MAN e con il moltiplicatore del Magistrale preso da `regole.json` → `magistrale`,
e per ogni profilo: PI ≥ 1 per struttura, AR magica ≤ AR totale, posti = conducente + passeggeri, Abilità
delle armi di bordo esistente, e i conti dei rinforzi (installati + ricambi = complessivi, PI × pezzi). Gli
esempi numerici del manuale sono **controllati nei dati**: se Davide cambia i numeri dell'esempio del §4.3 o
del §5.2 senza cambiare la procedura, il validatore lo dice.

**`src/veicoli.js`** (puro, nessuna interfaccia): `profiloVeicolo`, `andaturaDi`, `manovraDi`,
`movimentoMassimo`, `statoStruttura`, `soglieStruttura`, `vistaVeicolo`, `penalitaAttacco`, `localizza`,
`arVeicolo`, `piDaDanno`, `applicaColpoVeicolo`, `assorbiConRinforzi`, `dadiCollisione`, `qCollisione`,
`dannoOccupante`, `riparaVeicolo`, `conPi`, `andaturaResidua`.

**Modello dati proposto (A.91).** Un mezzo in gioco è un oggetto che **non** dipende da chi lo possiede: la
risposta di Davide cambia solo *dove* si salva (nel file del personaggio, in un file del gruppo accanto a
`personaggi/`, o nello scontro della plancia), non la forma.

```json
{ "profilo": "asa-scout-mk4",
  "nome": "ASA Scout",
  "pi": { "corpo": 54, "propulsione": 36, "motore": 24 },
  "andatura": "veloce",
  "conducente": "pg:Lucas-Vane",
  "rinforzi": { "copriruote-petra": { "montati": [3, 3, 1, 0], "ricambi": [3, 3] } },
  "nec": { "rosso_lx": 84000, "verde_ore": 21 },
  "ripristini": [{ "struttura": "motore", "fino_a": "fine_scena" }],
  "avarie": "ruota posteriore destra cerchiata" }
```

Solo `profilo` è obbligatorio: tutto il resto lo riempie `vistaVeicolo` dal catalogo (mezzo integro, fermo,
senza conducente). `profilo` è l'id del catalogo; un mezzo scritto a mano usa `scheda` con gli stessi campi
di un profilo, come i nemici fuori dal bestiario. I PI stanno in `pi` perché sono l'unica cosa che cambia
spesso; `conducente` è l'id di un partecipante dello scontro oppure la chiave di un PG, così vale sia nella
plancia sia nella scheda. Nessuna funzione modifica il mezzo: `conPi` restituisce un oggetto nuovo, come fa
`src/sessione.js` con la sessione.

**Test** (`tests/veicoli.test.js`, 31): un test per ogni esempio numerico del manuale — andature con MOV 20
(§2.1), tabella delle andature dell'autovettura (§9), frenata d'emergenza (§2.4), VA di Pilotare
dell'inseguimento (§6.2), penalità incrociate degli attacchi (§3.1, §6.2), stati con 12 PI massimi e il
passaggio del Motore da −4 a −8 (§4.4, §7.4), esempio della procedura di danno con Corazzato 2 (§4.3),
esempio dei Copriruote (scheda), Q di riferimento e dadi delle collisioni (§5.1), esempio dello Speronamento
(§6.3), esempio degli occupanti con cintura e Tempra (§5.2), caduta (§5.4), passaggio dei comandi (§5.6),
costi di riparazione (§7.1, §9.1), Meccanico di Bordo (§7.2), Riparazione d'Emergenza (§7.3), esempio del
Sovraccarico Tecnico (§7.4), Spinta al Limite (§7.4), i due profili. **Tutti gli esempi del manuale tornano**:
nessuna discrepanza fra i numeri scritti e la procedura. In più i casi limite chiesti: PI a 0 per struttura
(Corpo e Motore fuori uso, Propulsione a −8 VA), Corazzato contro danno basso (1 PI potenziale e PS riuscita
→ 0 PI persi), e un colpo che attraversa due soglie (11 → 3 PI: lo stato finale è Danneggiato, non Colpito).

**Fuori dal lotto**, come previsto: nessuna interfaccia (la tab Veicoli resta «in attesa»), nessun campo nel
file del personaggio, niente plancia. `src/rules.js` carica `veicoli.json` e lo tiene fra i dati che non
entrano nelle versioni scritte nel personaggio (`FILE_SOLO_TAVOLO`), finché A.91 non dice di chi è il mezzo.
