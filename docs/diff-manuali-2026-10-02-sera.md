# Manuali e risposte del 02/10/2026: differenze (ricognizione della sera)

Controllo del 2 ottobre 2026, sera. Solo ricognizione: **nessun dato e nessun codice cambiato**. Il testo dei Doc è salvato in `docs/manuali-txt/`, l'E&L in `docs/risposte-master-2026-09-26.md`, il Doc fisso in `docs/per-davide.md`. Si confronta con i testi salvati stamattina (`docs/diff-manuali-2026-10-02.md`, versioni del 01/10 sera).

Davide ha modificato i quattro manuali il 02/10 fra le 08:58 e le 09:12 UTC e l'E&L alle 15:52 (da circa 34 a 46 KB). Il Doc fisso «per-davide.md» è del 02/10 16:19. Le **edizioni dichiarate non cambiano** (Giocatore 0.45, Magia 1.3, Armamenti 0.58, Equipaggiamento 0.5). I temi sono due: **sintonizzazione, riserve mistiche e cristalli** (Magia sez. 26, Equipaggiamento cap. 10, Armamenti §7.10 e §7.24) e **le risposte a 21 quesiti dell'app** nell'E&L.

**In evidenza (quello che Davide ha annunciato):**
- **Sintonizzazione aggiornata: trovata.** Capacità ordinaria da 4–9 a **8–13** ai Gradi complessivi I–VI, Architetto TecnoMistico da 6–11 a **10–15**; uguale per tutti gli Addestramenti; nessun requisito di Grado del personaggio pari al Grado dell'oggetto (Magia §26.1, Armamenti §7.10, Giocatore §3.9.5, §4.4, §5.21).
- **Scheda degli Artefatti e batterie dei PG: trovata.** Dotazione del gruppo (Magia §26.7, Equipaggiamento §10.7): due Batterie Matrice Rosse da 10 PM (origine Rettungsanker, dono di Sorella Iolanda), quattro Schegge instabili Verdi da 5 PM, Pietra della Vigilanza, Guanti da Combattimento Mistico. Kit individuale (una Batteria Matrice, Pietra, Guanti) = 8 SnT.
- **ASA Scout MK.4: non trovato** in nessuno dei sei Doc (nessuna occorrenza di «Scout» oltre agli elmetti Venus-Scout e Ranger Scout già in catalogo).

Classi: **piccolo** (refuso, riformulazione senza effetto, un valore singolo) · **regola** (cambia qualcosa che l'app già gestisce) · **nuovo** (contenuto che l'app non ha) · **risposta** (chiude una domanda del Doc per Davide).

| Documento | Prima | Ora | piccolo | regola | nuovo | risposta |
|---|---|---|---|---|---|---|
| Giocatore | 0.45 (01/10 21:25) | 0.45 (02/10 08:58) | 1 | 3 | 1 | 0 |
| Magia | 1.3 (01/10 21:50) | 1.3 (02/10 09:12) | 4 | 5 | 9 | 0 |
| Armamenti | 0.58 (01/10 21:26) | 0.58 (02/10 09:02) | 3 | 2 | 1 | 0 |
| Equipaggiamento | 0.5 (01/10 21:40) | 0.5 (02/10 09:12) | 2 | 0 | 6 | 1 |
| E&L | 01/10 21:38 | 02/10 15:52 | 0 | 0 | 1 | 21 |
| per-davide.md | 02/10 06:36 | 02/10 16:19 | 1 | 0 | 0 | 0 |

## Manuale del Giocatore 0.45

| Paragrafo | Classe | Cambiamento | Tocca |
|---|---|---|---|
| «Usare questo manuale» | piccolo | Le regole di Sintonizzazione rimandano ad Armamenti §7.10 e Magia §26.1. | — |
| §3.9.5 Tecnomante, Capacità superiore | regola | Con il +2 di Architetto TecnoMistico: da **6 → 10** al I Grado complessivo, da **11 → 15** al VI. | `artefatti.json` → `sintonizzazione.capacita_per_gradi`; testo del Talento in `classi.json` |
| §4.4 Abilità Artefatti | regola | Capacità ordinaria **8, 9, 10, 11, 12, 13** ai Gradi I–VI, uguale per tutti gli Addestramenti; Architetto +2, poi UMN. Nessun requisito automatico di Grado del personaggio. | `artefatti.json`; `abilita.json` (descrizione) |
| §4.4 Abilità Artefatti (stesso paragrafo) | nuovo | Riserve **Batteria** (alimentano anche Incantesimi personali compatibili) e **Cariche** (solo l'oggetto); proprietà **Esclusive** (riserva interna) e **Universali** (anche PM personali o una fonte esterna); Schegge instabili SnT 0 con Prove di estrazione e lancio; schede nel cap. 10 dell'Equipaggiamento. | `regole.json` → `chroma`; `src/lancio.js` (fonti) |
| §5.21 Umanità, esempio | regola | L'esempio segue la nuova scala: UMN 8 al I Grado porta la capacità **da 8 a 4** (con Architetto da 10 a 6); al VI Grado un Tecnomante con UMN 0 conserva **5** (13 + 2 − 10). Il paragrafo è ora in grassetto. | test dell'Umanità e della sintonizzazione (oggi 4 → 0) |

## Manuale della Magia 1.3

| Paragrafo | Classe | Cambiamento | Tocca |
|---|---|---|---|
| Sez. 1, rimandi | piccolo | Cristalli Matrice, Batterie Matrice, Schegge instabili, tipi di riserva e Artefatti di campagna → sez. 26. | — |
| Sez. 6, PM personali e Umanità | piccolo | «L'uso delle Batterie richiede la sintonizzazione» entro la capacità ridotta; le Schegge instabili sono l'eccezione senza SnT (§26.5). | testo |
| Sez. 6, contenitori e riserve integrate | regola | Le riserve integrate non sono più tutte «solo per l'oggetto»: una riserva **Batteria** integrata può pagare Incantesimi personali compatibili; una riserva **Cariche** alimenta solo l'oggetto. Supera la formulazione su cui è stata chiusa A.18. | `regole.json` → `chroma`; `src/lancio.js` (oggi le riserve integrate non sono mai una fonte); `armi_corporative.json` |
| §24.2, effetti dell'Artefatto | piccolo | Le ricette approvate (Guanti, §26.6.2) riportano il proprio Grado; nessuna facoltà generale di scomporre gli Incantesimi. | — |
| §24.2, riserva integrata | regola | Proprietà Esclusiva: la riserva contiene almeno un utilizzo; Universale: anche PM personali o una fonte esterna compatibile. Il progetto dichiara Batteria/Cariche ed Esclusiva/Universale. | formato degli Artefatti |
| §24.7, fonti per pagamento | regola | «Una sola riserva esterna per Incantesimo **o attivazione**», eventualmente con PM personali; una Batteria autonoma o integrata conserva i normali usi. | `src/lancio.js` (regola della fonte unica, già presente per i lanci) |
| §24.9, scheda del manufatto | nuovo | Campi in più: tipo di riserva, alimentazione di ogni proprietà, Matrice d'origine. | formato degli Artefatti |
| §25.4, Rigenerazione in un Artefatto | regola | Esclusiva: tutto dalla riserva interna Verde o Bianca; Universale: anche PM personali o un'altra fonte, secondo il §26.2. | Rigenerazione da artefatto in «Lancia!» |
| §25.4, esempio | piccolo | L'anello ha ora «Rigenerazione 9 Esclusiva e Cariche Verdi da 10 PM». | — |
| Sez. 26 (introduzione) | nuovo | Livello dell'Incantesimo, livello del Cristallo Matrice, Grado dell'Artefatto, Qualità fisica e Reperibilità sono valori distinti. | — |
| §26.1 Capacità di sintonizzazione | regola | Tabella 8–13 / 10–15; «sostituisce la precedente capacità ordinaria da 4 a 9». SnT del singolo oggetto invariato (0 se solo passivo); le passive restano utilizzabili senza sintonizzazione; nessun requisito di Grado. Esempio: Batteria Matrice Rossa 10 PM (SnT 3) + Pietra (3) + Guanti (2) = 8, utilizzabili insieme al I Grado. | `artefatti.json` → `capacita_per_gradi`; `src/equipaggiamento.js` (riga di provenienza «Armamenti §7.10») |
| §26.2 Riserve e alimentazione | nuovo | Due tabelle: Batteria / Cariche; Esclusiva / Universale. Una sola coppia PM attuali/massimi; le Cariche si ricaricano come il loro colore. **Le schede anteriori con riserva solo per l'oggetto si registrano come Cariche ed Esclusive**; la Pietra è una Batteria con proprietà Universali, i Guanti hanno Cariche ed Esclusiva. | `regole.json` → `chroma`; catalogo Artefatti; armi con Chroma integrato (restano come oggi) |
| §26.3 Cristalli Matrice | nuovo | Quattro colori; livello 1–20 con altezza, larghezza e raggio (100 m … 20.000 km); non accessibili ai PG. Sant'Elias Rosso livello 1; Rettungsanker Rosso livello 6 (15 km). | nessuno (ambientazione); eventuale campo «Matrice d'origine» |
| §26.4 Batterie Matrice | nuovo | +1 Grado e +1 SnT rispetto alla Batteria ordinaria, REP una fascia sopra; ricarica automatica 2 PM/ora presso la Matrice d'origine, 1 PM/ora presso un'altra dello stesso colore, nessuna da colori diversi, niente cumulo. Oltre il Grado VI serve una ricetta eccezionale. | catalogo (`artefatti.json`); riserve di Chroma al tavolo (ricarica come promemoria) |
| §26.5 Schegge instabili | nuovo | SnT 0; estrazione con Prova di Potere obbligatoria (−2 VA ogni 3 PM o frazione, tabella fino a −20); se fallisce i PM dichiarati si disperdono e non si lancia; se riesce, seconda Prova distinta di lancio. Ricarica: Prova sempre obbligatoria con −2 in più (tabella per PM); fallimento disperde i PM personali. Una sola scheggia per lancio. | catalogo; «Lancia!» (fonte Scheggia con la Prova di estrazione) |
| §26.6.1 Pietra della Vigilanza | nuovo | Artefatto e Batteria Verde 10 PM; Individuare 6 ed Esorcizzare Corruzione 6 Universali; Grado III Rara, SnT 3; 4.000 cr, REP Molto Rara; profilo fisico e creazione. Esorcizzare riduce di uno Stato la CROS fino a Corrotto, una volta ogni 24 ore per destinatario. | catalogo Artefatti; tab Artefatti (attivazioni) |
| §26.6.2 Guanti da Combattimento Mistico | nuovo | +1 VA passivo ai pugni e alle Prove per colpire in corpo a corpo degli Incantesimi, anche senza sintonizzazione; Cariche Verdi 10 PM; attivazione Esclusiva 3 PM + 1 AzP: pugni Magici e +1 al danno per 5 RND. Grado II Non Comune, SnT 2; 3.000 cr. | catalogo; effetti su «Senz'armi» e «Attacca!» |
| §26.7 Registrazione delle dotazioni | nuovo | Dotazione del gruppo (vedi «In evidenza»); i PM attuali si registrano allo stato di campagna, non pieni. Un oggetto, un'istanza nell'inventario, anche se compare in più categorie. | inventario (oggetti in più categorie) |

## Manuale degli Armamenti 0.58

| Paragrafo | Classe | Cambiamento | Tocca |
|---|---|---|---|
| §7.5 Artefatti (proprietà) e §7.10 (tabella e testo) | regola | Capacità ordinaria **da 4–9 a 8–13**, con Architetto **da 6–11 a 10–15**; stessa progressione per il Taumaturgo. | `artefatti.json` → `capacita_per_gradi` |
| §7.5 Contenitori mistici | regola | Riserve integrate Batteria o Cariche, proprietà Esclusive o Universali, una sola fonte esterna per pagamento (Magia §26.2). Prima: «alimentano soltanto quell'Artefatto». | `regole.json` → `chroma`; `src/lancio.js` |
| §7.5.1 Bordone Templare, Vindicator, Deliverer, Castigator, Demontooth | piccolo | Il Chroma Rosso integrato da 5 PM è registrato come **Cariche**, cinque attivazioni **Esclusive**: funzionamento invariato. | `armi_corporative.json` (etichetta della riserva) |
| §7.5.1 Scudo delle Guardie Sacre | piccolo | «Cariche Rosse», Scudo Magico proprietà Esclusiva: invariato. | stesso |
| §7.24 Guanti da Combattimento Mistico | nuovo | Scheda di combattimento dei Guanti, identica a Magia §26.6.2 ed Equipaggiamento §10.6: un oggetto solo, visibile fra Armamenti e Artefatti. | catalogo (un'unica voce) |
| §7.24 (coda) | piccolo | Il campionario di Batterie, Batterie Matrice e Schegge è nell'Equipaggiamento §§10.2–10.5. | — |

## Manuale dell'Equipaggiamento 0.5

| Paragrafo | Classe | Cambiamento | Tocca |
|---|---|---|---|
| Indice e contenuto dell'edizione | piccolo ×2 | Nuovo capitolo 10 «Artefatti e riserve mistiche». | — |
| §10.1 Come leggere il catalogo | risposta (A.75) | Tutte le Batterie usano il contenitore base: **0,2 kg, Qualità Comune, PS Integrità 10, 3 PI**, anche oltre i 5 PM; Schegge: Comune, PS 10, 1 PI, 0,05 kg. Prezzi: 200 cr/PM colorato e 1.000 cr/PM Bianco (Batterie), 100/400 (Schegge), 300/1.500 (Matrice, playtest). Colonna «Creazione» = supporto + Chroma + reagenti; risorse di progetto per Grado; Grado VII\* oltre la scala. | `artefatti.json` → 19 TODO(Davide) da chiudere; valori già coincidenti |
| §10.2 Batterie Mistiche | nuovo | 23 profili (Rosso, Blu, Verde 5–30 PM; Bianco 5–25 PM) con Grado/SnT, prezzo, creazione, REP. Prezzi e peso coincidono con il catalogo dell'app (per esempio Rosso 10 PM: 2.000 cr, 0,2 kg). | `artefatti.json` (Grado/SnT e prezzo di creazione) |
| §10.3 Batterie Matrice | nuovo | 23 profili: Grado/SnT +1, REP Epica o Eccezionale; 30 PM colorati e Bianca 25 PM con ricetta speciale (Grado VII\*). | catalogo |
| §10.4 Schegge instabili | nuovo | 23 profili, SnT 0; colorate REP Rara (500–3.000 cr), Bianche Molto Rara (2.000–10.000 cr). | catalogo |
| §10.5 Pietra della Vigilanza, §10.6 Guanti | nuovo | Schede commerciali, identiche alla Magia §26.6. | catalogo |
| §10.7 Inventario e dotazioni di campagna | nuovo | «In App la riserva appartiene all'istanza dell'oggetto; i campi di categoria possono contenere più valori. La sintonizzazione si gestisce soltanto per le istanze con SnT maggiore di zero.» Tabella della dotazione del gruppo; i valori commerciali non sono crediti dei PG. | inventario: oggetto in più sezioni (`SEZIONI_INVENTARIO`); riserve di Chroma per istanza (già così) |

## E&L (02/10 15:52)

| Voce | Classe | Cambiamento | Tocca |
|---|---|---|---|
| «Regole consolidate di Artefatti e riserve mistiche» | nuovo | Riepilogo di capacità 8–13, Batteria/Cariche, Esclusiva/Universale, Cristalli e Batterie Matrice, Schegge, Pietra, Guanti, dotazione del gruppo e catalogo dei 69 profili; prezzi delle Batterie ordinarie e del Chroma grezzo invariati; i valori nuovi (Matrice, Pietra, Guanti, dati fisici) sono da verificare in playtest. | come sopra |
| «Risposte approvate ai 52 riferimenti dell'app — 21 quesiti distinti» | risposta ×21 | Una decisione per TODO(Davide) dell'app, con il campo JSON da aggiornare. Dettaglio nella sezione seguente. Dichiarano di prevalere «sulle precedenti formulazioni incompatibili del documento o dei manuali». | vedi sotto |

## Doc fisso «per-davide.md» (02/10 16:19)

| Voce | Classe | Cambiamento |
|---|---|---|
| A.81, A.82 | — | Incollate dal pacchetto di questa sera. |
| A.20 | piccolo | Il titolo è diventato un punto elenco sotto A.18 (difetto d'incollatura): la domanda resta aperta nella sezione 1. |
| Sezione 7 | — | Nessuna risposta nuova. |

## Domande che ora hanno una risposta

Tutte nell'E&L del 02/10 (numerazione delle decisioni 1–21 del blocco), salvo A.75, che ha anche la risposta nell'Equipaggiamento §10.1.

| A.n | Risposta | Impatto rispetto al «Nel frattempo» | Contraddice l'implementato? |
|---|---|---|---|
| A.74 p. 1 (dec. 1) | Il VA pertinente del Canale è il suo VA di Rituali; contributo +0/+1/+2/+3/+4 per fascia, totale massimo +5; il +2 della costruzione Magistrale è a parte. | dati (togliere il TODO; il +2 fuori dal limite di +5 va verificato) | no |
| A.74 p. 2 (dec. 2) | Dopo un Magistrale il costo si dimezza (per eccesso) e la ripartizione è libera: somma uguale al nuovo costo, nessuno oltre la quota dichiarata, Officiante almeno metà Grado, ogni Canale con contributo almeno 1 PM. | motore + interfaccia (quote modificabili e convalida) | **sì**: l'app fa tenere ai Canali la quota e fa pagare il resto all'Officiante |
| A.74 p. 3 (dec. 12) | Il Rituale diretto si paga solo con PM personali di Officiante e Canali; le Batterie no. Rigenerazione da Artefatto: Esclusiva dalla riserva interna, Universale con le fonti ammesse. | dati (togliere il TODO); motore solo per le proprietà Universali da artefatto | no |
| A.74 p. 4 (dec. 13) | Le versioni dipendono da Ritualista (Minore per 9–10, Maggiore per 12–18) e dalla conoscenza della procedura, non dal livello massimo degli Incantesimi. | dati (togliere il TODO) | no |
| A.78 (dec. 3) | Attacchi e Difese attive si tirano anche con VA finale 20 o più. Magistrale: 1 con VA 20, 1–2 da VA 21; con Successo Magistrale Migliorato 1–2 con VA 20, 1–2–3 da VA 21. Il 20 resta Maldestro. Correzione al manuale: con il Talento il 3 è Magistrale già da VA 21. | motore (`src/prova.js`, `regole.json` → `prova`, `magistrale_naturale`; promemoria di «Attacca!» e «Lancia!») | **sì**: oggi successo automatico senza tiro da VA 20 |
| A.61 (dec. 4) | Capolavoro del Corazzaio: +1 a una sola Contromisura numerica scelta alla costruzione (Ignifugo, Termico, Isolante, Dissipante, Imbottita, Anticorrosivo); se assente vale 1. Niente AR, Riflettente escluso. | dati + interfaccia (scelta sull'armatura Capolavoro) | no (oggi solo testo) |
| A.73, formato (dec. 5) | Formato confermato, comune ad app e bestiario; quattro campi in più: azioni per turno (AzP, AzM ed eccezioni), Contromisure, Abilità rilevanti con VA, talenti e capacità speciali con effetto, costo e limiti. Valori già calcolati, non ricostruiti. | dati (`formato_nemici.json`) + interfaccia (editor del branch) | no |
| A.73, Caratteristiche (dec. 6) | Il bestiario riporta tutte e sei; nell'app restano facoltative; mancante ≠ 0; parità d'Iniziativa: DES, poi INT, poi 1d10 se manca una Caratteristica (ripetuto se persiste). | dati (descrizione del campo) | no |
| A.73, PV e Ferite (dec. 7) | La plancia registra PV attuali e massimi, Stato di Ferita e Menomazioni; a 0 PV i nemici seguono la procedura dei PG (Tempra, Ferite), salvo eccezione; **nessun tracciato di Affaticamento**. | motore + interfaccia (branch) | **sì**: oggi i nemici hanno solo PV e Stati |
| A.73, incantesimi (dec. 8) | I nemici lanciano con «Lancia!» come i PG quando ci sono nome, versione, VA di lancio, costo, azioni e durata, riferimento alla scheda; i PM dalla riserva del nemico; voce incompleta = promemoria. | motore + interfaccia (branch) | **sì**: oggi promemoria, «Lancia!» escluso |
| A.73, movimento (dec. 9) | Passo obbligatorio; Corsa 2× e Scatto 3× se non indicati; i valori espliciti prevalgono; «mancante» diverso da «non consentito». | dati + interfaccia (branch: distinguere le due assenze) | no |
| A.65, allevamento (dec. 10) | Nuova scheda «Corredo agricolo Standard — Allevamento»: 2 kg, 200 cr, CO, +0. La coltivazione resta sugli Attrezzi agricoli di base. | dati (`dotazioni.json`, catalogo) | no |
| A.65, strumento musicale (dec. 11) | Scelta libera: acustico (2 kg, 400 cr, CO) o elettronico (3 kg, 800 cr, NC, NEC Verde compatto 100 Lx, 2 Lx/h, 50 ore); entrambi Comune, PS 10, 4 PI. | dati + interfaccia (scelta in dotazione) | no |
| A.67 (dec. 14) | Il Gehemmapuker usa lo stesso `nec:modulo-blu`: 2.500 Lx, 50 Lx per attacco (50 getti), cambio 1 AzP. **Regola generale: niente travaso di energia fra NEC**; si sposta solo il NEC fisico. | dati (una voce invece di due) + motore (riserva unica) | in parte: oggi due voci con gli stessi valori |
| A.62 (dec. 15) | Ryūjin: Natura **Naturale**; attiva 1d8 + 1 + 1d6 con la proprietà Plasma, un solo colpo; «Plasma» non è una Natura. | dati (proprietà Plasma attivata con l'arma) | da verificare: la nota del catalogo dice già «unico colpo Naturale» |
| A.75 (dec. 16; Equipaggiamento §10.1) | Supporto base per tutte le Batterie (0,2 kg, Comune, PS 10, 3 PI), anche Matrice; non si applica a Pietra e Guanti. | dati (chiudere 19 TODO) | no (coincide) |
| A.71 (dec. 17) | Set chirurgico e cartuccia chirurgica sono lo stesso consumabile: «Cartuccia chirurgica — set sterile monouso», 500 cr o 2.500 cr per cinque; si consuma all'inizio di ogni procedura. | dati (una voce, una scorta) | in parte: oggi due voci |
| A.63 (dec. 18) | Le «batterie» degli esoscheletri sono NEC Rossi di formato dedicato al modello, con autonomie e ricambi della scheda (XO-102 8 h/1.500 cr … Demonhunter 6 h/2.500 cr); sostituzione 1 minuto; nessuna capacità in Lx inventata. | dati (`alimentazione` in ore per 7 voci) + motore (ore residue) | no (oggi testo) |
| A.66 (dec. 19) | Pasto: 30 minuti per fino a 4 persone, NEC Rosso 500 Lx, 50 Lx a preparazione (10), cambio 1 AzP, ricarica 1 ora 5 cr; kit 1 kg, 150 cr. Il manuale va corretto (15 minuti, «cartuccia»). | dati | no (coincide) |
| A.64 (dec. 20) | NEC Blu IAS: 1.000 Lx = 20 cariche da 50 Lx; Blink 20, Power Blink 10, Antigrav 20 Round, Mirrorshard 20 minuti, Disturbatore 20 Round, Silent 20 minuti; ricambio 1.000 cr, ricarica 50 cr in 1 ora, sostituzione 1 minuto. | dati (Lx e cariche come una sola riserva) | no |
| A.68 (dec. 21) | Interfaccia neurale standard: 3.500 + 2.000 cr (5.500), **2 UMN**; CYBERTRONIC 5.000 + 2.000, 1 UMN; entrambe NC, PS 12, 4 PI, REP Rara; bioenergetiche; associazione a equipaggiamento CYBERTRONIC: 1 minuto e una Prova di Tecnologia, poi memorizzata. | dati (prezzo, UMN) + interfaccia («Compra» la rende acquistabile) | no |

**Riformulata dai manuali, non dall'E&L:** A.18 (già risolta il 02/10) — le riserve integrate ora possono essere Batteria o Cariche (Magia §26.2): le armi con Chroma integrato restano Cariche/Esclusive, quindi **nessun cambiamento di comportamento** per il catalogo attuale; cambia la regola generale per i futuri Artefatti con Batteria integrata.

**Ancora aperte:** A.20, A.32, A.34, A.35, A.36, A.38, A.39 (punti residui), A.40, A.53, A.54, A.55, A.56, A.57, A.58, A.59, A.60, A.61 (per gli altri Talenti del censimento), A.69, A.70, A.72, A.76, A.77, A.79, A.80, A.81, A.82.

## Impatto sul Tavolo del Master (branch `tavolo-direttore`)

| Tema | Cambiamento | Branch |
|---|---|---|
| Iniziativa | Parità DES → INT → 1d10 se manca una Caratteristica (A.73 dec. 6). | `src/scontro.js` fa già DES e INT, poi lo spareggio: verificare solo il caso «Caratteristica mancante». |
| Prove e attacchi | **A.78**: niente successo automatico a VA ≥ 20 per attacchi e Difese attive; Magistrale con 1, 1–2 o 1–3. | `src/prova.js` → `esitoProva` (oggi «automatico» da VA 20) e `regole.json` → `prova`: da cambiare anche su main. |
| Difese, AR | Nessun cambiamento nei manuali. I Guanti (+1 VA ai pugni) e le Contromisure del Capolavoro (A.61) toccano i PG, non i nemici. | — |
| PV, Ferite | **A.73 dec. 7**: i nemici hanno PV attuali e massimi, Stato di Ferita e Menomazioni; a 0 PV seguono la procedura dei PG; niente Affaticamento. | plancia e `src/danno.js` (oggi le Ferite valgono per i PG); valori di sessione dei nemici |
| Stati | Nessun cambiamento; Esorcizzare Corruzione 6 (Pietra) riduce la CROS dei PG. | — |
| Nemici A.73 | Quattro campi in più (azioni per turno, Contromisure, Abilità con VA, talenti e capacità); «Lancia!» per i nemici con dati completi; movimento «mancante» diverso da «non consentito». | `data/formato_nemici.json` (anche su main), `src/nemici.js`, editor `src/ui/nemici.js`, convertitore `src/nemico-da-pg.js` (oggi incantesimi come promemoria) |
| Oggetti segreti | Nessun riferimento nei Doc. | — |

## Impatto sulla bozza `docs/bestiario/`

| Tema | Cambiamento | Bozza |
|---|---|---|
| PV, Ferite | A.73 dec. 7 contraddice il §1.5 («Le creature hanno soltanto PV … Non subisce Ferite, Menomazioni, Affaticamento o Corruzione»): ora Ferite e Menomazioni come i PG, niente Affaticamento. Riguarda anche la domanda «Creature senza Ferite» di `domande-per-davide.md`, che ha quindi una risposta per i nemici dell'app. | §1.5, §1.6, Boss (soglie di fase) |
| Caratteristiche | Le schede del bestiario riportano tutte e sei le Caratteristiche (dec. 6). | §1.3 (lettura della scheda) |
| Formato | Il bestiario usa gli stessi campi meccanici dell'app, con i quattro nuovi (dec. 5). | §1.3 |
| Scala | Nessun cambiamento diretto. La capacità di sintonizzazione 8–13 riguarda i PG di riferimento (Appendice A) solo se portano Artefatti. | Appendice A |
| Corruzione | Esorcizzare Corruzione 6 (Pietra della Vigilanza): −1 Stato di CROS fino a Corrotto, una volta ogni 24 ore per destinatario; non cura Oscuro. | §4.2 (moduli Corrotto) solo come riferimento |
| Oscura Simmetria | Individuare 6 (Pietra) riconosce «una firma della Simmetria Oscura» senza certificare la CROS; la diagnosi richiede Individuare 12. | §1.4 (Natura delle creature) |

## Lotti proposti, in ordine

1. **Sintonizzazione 8–13 / 10–15**: `artefatti.json` → `capacita_per_gradi`, testi di Tecnomante, Artefatti e Umanità; test con il nuovo esempio del §5.21 (UMN 8: 8 → 4). Piccolo e tocca tutti i PG con Artefatti.
2. **A.78, tiro con VA ≥ 20**: `regole.json` → `prova` e `magistrale_naturale` (con Successo Magistrale Migliorato), `src/prova.js`, promemoria di «Attacca!» e «Lancia!». Va fatto su main e portato nel branch.
3. **Riserve Batteria/Cariche, proprietà Esclusive/Universali** (Magia §26.2): `regole.json` → `chroma`, campo sulle armi con Chroma integrato (Cariche/Esclusiva, nessun cambiamento di comportamento), fonte «Batteria integrata» in «Lancia!»; nota su A.18.
4. **Catalogo cap. 10**: Grado/SnT e creazione delle 23 Batterie (chiude i 19 TODO di A.75), 23 Batterie Matrice (Matrice d'origine, ricarica automatica come promemoria), 23 Schegge (SnT 0; estrazione con Prova di Potere in «Lancia!»), Pietra della Vigilanza, Guanti (effetti su «Senz'armi» e attivazione), oggetto in più sezioni dell'Inventario.
5. **Risposte dell'equipaggiamento**: A.65 (due schede), A.67 (Modulo Blu unico, divieto di travaso), A.71 (cartuccia unica), A.63 (NEC Rossi dedicati, ore), A.64 (IAS 1.000 Lx), A.66, A.68 (interfaccia standard acquistabile, 2 UMN), A.62 (Ryūjin).
6. **Rituali A.74**: ripartizione libera dopo il Magistrale (motore e pannello), TODO chiusi per i punti 1, 3 e 4.
7. **A.61, Capolavoro del Corazzaio**: Contromisura scelta.
8. **Tavolo del Master (branch)**: A.73 (campi nuovi, Ferite e Menomazioni dei nemici, «Lancia!» dei nemici, movimento) e A.78 in `esitoProva`; poi la bozza del bestiario (§1.5, Caratteristiche).
9. **Pacchetto per il Doc**: spostare in «Risolte» le voci recepite; correggere l'incollatura di A.20.
