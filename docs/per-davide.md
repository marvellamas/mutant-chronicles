# **Per Davide — domande aperte ed errata dei manuali**

Aggiornato al 30 settembre 2026, mattina.  
**Istruzioni per Davide (e per l’AI che usi per rispondere).**

> * Questo è l’unico documento con le domande dell’app Mutant. Il link resta sempre questo: non ne esistono altri e non se ne creano di nuovi. Lo stesso testo è nel repo GitHub, docs/per-davide.md.  
> * **Rispondi in coda**, nella sezione **7\. Risposte di Davide**, alla fine del documento, oppure nel tuo Doc «E\&L – Risposte e correzioni approvate»: leggiamo tutti e due a ogni sessione. Un blocco per risposta, con il numero della domanda (per esempio «A.23»), la data e il testo. Anche «confermo il Nel frattempo» è una risposta valida.  
> * Non modificare, spostare o cancellare le domande: lo facciamo noi. Quando una risposta è recepita e la funzione è implementata nell’app, la voce passa nella sezione **6\. Risolte**, con la data.  
> * Le correzioni ai manuali le fai nei Doc dei manuali, come sempre.  
> * Ogni domanda dice cosa fa l’app *nel frattempo*: se non rispondi non si blocca nulla, l’app applica l’ipotesi indicata.

Le sezioni: 1\. Domande che bloccano un lavoro in corso · 2\. Domande di rifinitura · 3\. Da correggere nella prossima edizione dei manuali · 4\. Da rileggere · 5\. Manuali che l’app aspetta · 6\. Risolte · 7\. Risposte di Davide.

## ---

**1\. Domande che bloccano un lavoro in corso**

Rispondere a queste per prime: senza, la seconda sessione dei Chroma resta ferma.

### **Chroma (sessione 2: Convertire Potere, ricarica, prelievo)**

**A.20 — Prelievo dal Chroma Bianco senza Addestramento Taumaturgo.**  
“Un personaggio cosciente può prelevare PM da un contenitore Bianco sintonizzato”: vale per chiunque, anche un Combattente senza magia? O serve almeno l’accesso alla magia?  
*Nel frattempo:* non ancora implementato; è la domanda che decide come.

## ---

**2\. Domande di rifinitura (l’app ha già un’ipotesi ragionevole)**

### **Regole generali**

**A.35 — Acquisti iniziali: valore ceduto maggiore del prezzo (§2.16.29).** Il paragrafo dice che si paga la differenza; se gli armamenti ceduti valgono più del nuovo oggetto (per esempio si cede l’armatura da 1.500 per un’arma da 800), la differenza torna in crediti o si perde?  
*Nel frattempo:* il conguaglio non scende sotto zero (la differenza si perde) e l’app lo segnala accanto all’acquisto.

**A.39, punti 1–3** — Anticipazione senza Addestramento (colonna «altri» −2), Colpo Elementale (PS solo per gli effetti secondari, per elemento) — implementata il 29/09. Punto 3, Rigenerazione: procedura completa (Magia sez. 25, E\&L del 01/10): Rituale con Prova di Rituali, PM totali, ore, reagenti e Canali; da Artefatto sintonizzato senza Prove, con i PM dalla riserva Verde o Bianca (§25.4) — implementata il 02/10.  
*Nel frattempo:* le scelte sopra.

**A.72 — Anticipazione senza scala leggibile in alcune schede (Magia sez. 12.3)**  
La sez. 12.3 dice «le altre scale e i massimi sono specificati nelle schede», ma in 29 schede (46 aspetti) i gradini non sono scritti. Gli esempi principali:

> * Irrobustire: «quantità di PV temporanei» e «durata» senza i gradini.  
> * Telecinesi: «durata della modalità scelta».  
> * Mente Disincarnata: «distanza dal corpo».  
> * Illusione: «grado di complessità della tabella».  
> * Muro, Armatura, Esplosione e Cono Elementale: «natura del danno» senza dire se vale Naturale → Magico → Etereo.  
> * Resistenza Fisica ed Efficienza: il \+1 va su una colonna con due valori («+1 / \+3»), senza dire a quale parte.

Quali sono i gradini di questi aspetti? (L'elenco completo dei 46 è in docs nel repo, \`docs/\` censimento Anticipazione.)  
*Nel frattempo:* l'app mostra «valore da definire al tavolo» con il motivo; PM e Prova si calcolano comunque.

**A.80 — Rinforzi indossati da soli e ad armatura tolta (Armamenti §7.23, §7.11.2)**  
Hai chiesto che soprabiti e mantelli si possano indossare da soli. Il §7.23.4 dice però che i valori dei rinforzi «descrivono l'impiego insieme a un'armatura compatibile; non costituiscono un profilo autonomo di armatura». Domande:  
(1) Un soprabito o un mantello indossato da solo dà AR? Se sì, quale?  
(2) Le sue proprietà (per esempio contro Etereo o le Qualità) valgono anche da solo?  
(3) Oltre a soprabiti e mantelli, quali altri rinforzi si possono indossare da soli (per esempio Tabardo consacrato, Sottogiacca IES, rivestimenti)?  
(4) Che cosa succede a un rinforzo montato quando si toglie l'armatura su cui è montato?  
*Nel frattempo:* si indossano da soli solo i 14 soprabiti e mantelli; da soli danno AR 0 e nessuna proprietà; indossati da soli sopra un'armatura non contano e vanno montati; ad armatura tolta restano montati ma senza effetto.  
>   
**A.81 — Pelle di Rinoceronte: manovre di forza (Giocatore §8.9.3)**  
La scheda concede «+3 ad Atletica e alle prove di Corpo a Corpo nelle manovre in cui si impiega direttamente la forza fisica». Quali Manovre del §5.12 sono «di forza»: Immobilizzare, Sbilanciare, Disarmare, Incalzare? Il \+3 ad Atletica vale per ogni uso di Atletica o solo quando si usa la forza?  
*Nel frattempo:* \+3 ad Atletica e a Corpo a corpo come usi specifici «manovre di forza», mostrati a parte; in «Attacca\!» un promemoria, senza somma automatica.  
>   
**A.82 — Onda Interiore: bonus pertinenti (Giocatore §8.9.4)**  
«Infligge il danno senz'armi della propria Disciplina e del Grado nella Classe, più i bonus pertinenti al singolo attacco.» Il bonus di FOR al danno senz'armi (§5.13) è fra questi? E il \+2 al danno Ravvicinato di Pelle di Rinoceronte vale, visto che Onda ha Vettore Distanza?  
*Nel frattempo:* il bonus di FOR sì, Pelle di R  
>   
**A.83 — Reperibilità Epica (Magia §26.4, Equipaggiamento §10.3)**  
Le Batterie Matrice colorate passano da REP Molto Rara a Epica, ma la scala delle reperibilità (Comune, Non comune, Rara, Molto rara, Leggendaria) non dice come si cerca un oggetto di REP Epica. C'è una Prova di Oratoria, e con quale penalità, oppure vale come Leggendaria (disponibilità decisa dal Direttore)?

**A.86 — Bonus di Caratteristica al danno delle granate (Armamenti §7.20.3, Giocatore §5.13)**  
Il §7.20.3 dice che con un lanciagranate «la granata stabilisce danno, AC, RS e proprietà», e le munizioni di riferimento dei lanciatori hanno danno Naturale tirato una sola volta per esplosione. Il bonus di Caratteristica al danno (§5.13) si aggiunge anche alle granate (lanciate a mano o con lanciagranate) e ai razzi, oppure il danno dell'esplosione è sempre quello della tabella?  
*Nel frattempo:* l'app usa il danno della tabella, senza bonus di Caratteristica.

**A.88 — Individuare a Concentrazione: durata massima.**  
Individuare si può lanciare a Concentrazione, ma la tabella delle versioni dà soltanto la durata fissa. Qual è la durata massima a Concentrazione di ogni versione?  
*Nel frattempo:* l’app usa la durata fissa della tabella.

.

**A.92 — Recuperi di Umanità.**  
Il cap. 7 dell’Equipaggiamento dice che il catalogo dei recuperi di UMN «resta da sviluppare». È previsto? Con quali voci?  
*Nel frattempo:* nessun recupero nell’app.  
*Nel frattempo:* la taratura della proposta resta, segnata come provvisoria.

**A.107 — Ricostruzione dei punti, effetto all'indietro.** Se si corregge un evento vecchio e un punto di un livello successivo, legale quando fu assegnato, smette di aumentare il VA: si conserva o si riassegna? *Nel frattempo:* l'app vieta la correzione che lo renderebbe inutile.

**A.108 — Punti in eccesso e blocco.** I punti in eccesso (10 per Grado salvati prima del 03/10) bloccano la salita di livello come i punti da riassegnare? *Nel frattempo:* danno solo l'avviso.

**A.109 — Anticipazione, aspetti senza gradino.** Oggi sono 44 aspetti su 29 schede (non più 46). Gli esempi approvati ne coprono 13: per gli altri 31 (elenco allegato) quale gradino si usa? *Nel frattempo:* «da definire al tavolo».

**A.110 — Indossare e togliere le protezioni.** Quanto costano in Azioni armatura, rinforzi e scudo? Che cosa intendi con «Combattimento con armatura»? *Nel frattempo:* solo l'elmetto, 1 AzP.

**A.111 — Recuperi di Umanità e impianti tolti.** Che cosa facciamo dei recuperi già registrati senza una rimozione? Pablo Zaion ha una perdita di 2 UMN per l'Interfaccia neurale, ma l'impianto non è più nel suo inventario: era stato rimosso o venduto?

**A.112 — Artefatti del gruppo, residui.** Nei file di Lucas e Dimitri tutte le riserve sono al massimo (Guanti 10, Pietra 10, Matrici 10 e 10, Schegge 5 ×4): sono i residui veri?

**A.113 — Veicoli, permessi e nomi.** Il Master può modificare anche un mezzo di un singolo PG? Senza il server il veicolo del gruppo si vede in sola lettura: va bene? La struttura si chiama «Carrozzeria» o «Corpo principale»?

**A.114 — Chip e strumenti sulla stessa Prova.** Un chip del Processore è uno strumento (vale solo il maggiore) o un'altra fonte che si somma? *Nel frattempo:* vale il maggiore.

**A.115 — Nemici con «capacità specifica».** L'app deve solo mostrare il testo della capacità, o ci sono Prova e costo da calcolare?

**A.116 — Luce e attività pratiche visive.** Oltre a Percezione visiva, attacchi e Difese, quali Abilità prendono le penalità di luce: Pilotare, Tecnologia, Medicina, altre?

## ---

**3\. Da correggere nella prossima edizione dei manuali**

Decisioni già prese o errori evidenti: l’app segue la decisione, il testo stampato dice ancora altro. Le voci barrate sono già sistemate nel manuale condiviso.  
**Manuale del Giocatore**

> * ~~§1.2.3, §2.11, §2.14: la Prova Salvezza Volontà usa CAR~~ — fatto nel Google Doc (verificato il 26/09).  
> * ~~§3.5.2 Esploratore: Specializzazioni dei Talenti a scelta~~ — fatto nel Google Doc (verificato il 26/09).  
> * ~~§2.12 e §3.3: al 1° livello sono massimizzati sia i PV sia i PM~~ — fatto nel Google Doc (verificato il 28/09).  
> * ~~§2.10, §3.8: “minimo 1” ai “2 \+ Mod INT incantesimi”~~ — fatto nel Google Doc (verificato il 28/09).  
> * §3.5.3 Bersaglio Designato: impaginazione rotta nel PDF.  
> * §8.6 Attivazione Tempestiva: sta prima del §8.6.1, fuori da ogni sottosezione.  
> * §2.16.3 (Cacciatore) e §2.16.4 (Esploratore): «Il binocolo non richiede batterie.» Nel §2.16.2 (Agente) il testo 0.45 dice già «Il binocolo non richiede NEC.»: uniformare a «non richiede NEC».  
> * Giocatore §8.6.1 e §1.6: con Successo Magistrale Migliorato il 3 naturale è Magistrale da VA finale 21 (correzione approvata il 02/10, E\&L decisione 3).

**Manuale della Magia**

> * ~~Sez. 1: livello massimo incantesimi \= tabella I→3, II→8, III→11, IV→14, V→17, VI→18~~ — fatto nel Google Doc (verificato il 28/09).  
> * ~~Armatura Mistica (scheda 22.2): togliere il riferimento alle zone del corpo coperte (A.43)~~ — fatto nel Google Doc (verificato il 28/09).  
> * ~~Sez. 1: la frase “con i cinque Talenti liberi ordinari…” come esempio~~ — fatto nel Google Doc (verificato il 26/09).  
> * Sez. 1, scheda di Potenziale Mistico Migliorato: manca la riga «Ambito: il Talento è riservato agli Usufruitori di Magia e non si applica all’Addestramento Taumaturgo» della risposta A.2.2. La regola è comunque scritta nel paragrafo «Conoscenza e livello massimo»: solo testo.

**Manuale degli Armamenti**

> * §7.1.9, §7.8, §7.9: “Imperiali” vs “Imperial” (§7.4.8, §7.14). L’app usa “Imperial”.  
> * §7.9: mancano le tabelle prezzi delle armi a distanza di Fratellanza, Imperial e Mishima (i prezzi sono nelle schede del §7.8; le 146 righe presenti coincidono).  
> * §7.13.2 / §7.15.3, §7.16.2, §7.17.3: “Articolazione da tiro” vs “di tiro”.  
> * §7.16.2 Armatura Ashigaru: “Manutenzione agevolata” \= “Manutenzione semplice” (§7.11.4)?  
> * §7.11.5: “Agenti equipaggi e Guardie” senza virgola.  
> * §7.4.1 / §7.4.2 Scudo Punisher: “Grande” vs “Medio”.  
> * ~~§7.4.10 Scudo delle Guardie Sacre: con la lama estratta il danno è 1d6+1+1d4 Naturale~~ — fatto nel Google Doc (verificato il 28/09).  
> * §7.8, schede di M310 e SA SG2001: indicare che usano un caricatore amovibile specifico e che la sostituzione con un caricatore pronto costa 1 AzP (E\&L 19: «va esplicitata nelle relative schede di catalogo»).

**Manuale dell'Equipaggiamento**  
> 

> * §4.1 Comunicatori: «Ogni modello comprende microfono, auricolare, batteria carica, cavo e alimentatore» — con la 0.5 l'alimentazione è un NEC Verde (compatto per il comunicatore personale, standard per quello da squadra e per la stazione radio), come dice il paragrafo «Alimentazione e riservatezza» dello stesso §4.1. Sostituire «batteria carica» con «NEC Verde carico».

**Manuale dei Mostri**   
**§5.2**: dice ancora «5 punti Abilità liberi a ogni Grado»; dopo la A.90 va portato a 7\.

## ---

**4\. Da rileggere (testi scritti da noi, non dal manuale)**

> * **Promemoria degli Stati (§5.18)**: 11 righe di riassunto nella scheda digitale, marcate “(riassunto, non testo del manuale)”. Correggi quelle che non ti tornano.  
> * **Talenti nella stampa**: il foglio 2 stampa la prima frase di ogni Talento. Se preferisci un riassunto tuo, si aggiunge un campo.

## **5\. Manuali che l’app aspetta**

> * Dal 26/09 i manuali sono Google Doc condivisi: l’app li rilegge a ogni sessione, non servono più i PDF.  
> * Manuale dell’Equipaggiamento 0.3: recepiti i capitoli 1, 2, 3, 4 e 6 (carico, PS Integrità, dotazioni personali, esplorazione, comunicazione e rilevamento, sanitario), con 58 voci di catalogo nuove e 28 oggetti della dotazione collegati alla loro scheda. Aspettiamo i capitoli 5, 7 e 8\.  
> * Manuale dei Veicoli (in stesura).  
> * Manuale degli Armamenti v0.54: KEP 808 e Colt Hammershot recepiti il 29/09. La v0.53 è estratta per intero, §7.21–7.23 compresi; la riparazione degli oggetti è recepita (A.46). Restano rimandati dal manuale le Prove Salvezza, i tempi di ricarica e i ricambi del Cuirassier Attila (§7.18.1).

## ---

**6\. Risolte**

Voci con risposta recepita e funzione implementata nell’app. La data è quella dell’implementazione.

> * **Esploratore, Specializzazioni dei Talenti a scelta; «minimo 1» ai 2 \+ Mod INT incantesimi; quote di Classe per macrofamiglia; incantesimi liberi di qualunque famiglia; tabella del livello massimo degli incantesimi; dadi dei PV e dei PM massimizzati al 1° livello** — risolte e implementate prima del 26/09.  
> * **A.1 — Descrizioni delle Caratteristiche; Prova Salvezza Volontà su CAR** — implementata il 26/09.  
> * **A.2 — Schede dei 14 Talenti di magia** (compreso Potenziale Mistico Migliorato solo per gli Usufruitori di Magia) — implementata il 26/09.  
> * **A.3 — Tipo di tre Talenti Liberi** (Attivazione Tempestiva, Risorse Interiori, Tecniche Interiori Supplementari: passivi) — implementata il 26/09.  
> * **Durata di tre Tecniche Interiori** (Vipera dal Cappuccio, Presa dell’Anima, Contraccolpo Interiore) — implementata il 26/09.  
> * **Equipaggiamento iniziale** (E\&L A.5–A.5.31): dotazioni delle 25 Classi, armamenti corporativi di base (Armamenti §7.22), crediti iniziali 1.000 \+ 2d6 × 100, acquisti con cessione, veicoli esclusi — implementato il 27/09.  
> * **PV e PM attuali al passaggio di livello** (§8.1.2, E\&L A.6) — implementata il 27/09.  
> * **18 Talenti magici e mistici nuovi del 27/09** — recepiti nell’app il 27/09; la conferma è chiesta in A.32.  
> * **Manuale degli Armamenti v0.52 e v0.53** (elmetti §7.21, modelli corporativi di base §7.22, catalogo dei rinforzi §7.23) — recepito il 28/09.  
> * **Manuale del Giocatore del 27/09** (Addestramenti a 76 punti, 10 Punti Abilità Liberi) — recepito il 28/09; confermato in A.52.  
> * **A.7 — Pistola mitragliatrice compatta**: Specializzazione Pistole anche in Raffica Breve e Media — implementata il 28/09.  
> * **A.8 — Pugnale e Ascia leggera**: Coltelli e Pugnali / Asce in mischia, Armi da Lancio al lancio, mai cumulate — implementata il 28/09.  
> * **A.9 — Famiglie delle 12 armi ravvicinate corporative** e nuova Specializzazione Armi a Sega (Elettrosega CSB600, Chainreaper, Sbudellatrice) — implementata il 28/09.  
> * **A.10 — Scudo delle Guardie Sacre**: 1d6+1 con la lama ritratta, 1d6+1+1d4 con la lama estratta; nell’app la lama si estrae e ritrae al tavolo — implementata il 28/09.  
> * **A.11 — Specializzazioni delle 16 armi a distanza corporative** (Panzerknacker nei Fucili d’Assalto) — implementata il 28/09.  
> * **A.12 — Specializzazioni delle altre armi corporative per analogia**; SA30 a dardi con solo \+1 VA (Danno calibrato) — implementata il 28/09.  
> * **A.14 — Batterie da 5 PM** (Rosso, Blu, Verde Molto rara; Bianco Leggendaria), scala di reperibilità fino a Leggendaria, disponibilità degli Artefatti Mistici — implementata il 28/09. Prezzi aggiornati il 02/10 a 1.000 crediti (Rosso, Blu, Verde) e 5.000 (Bianco), come nell'Armamenti §7.5, nella Magia §24.7 e nell'E\&L del 01/10.  
> * **A.18 — Riserve integrate nelle armi**: alimentano soltanto le funzioni del proprio Artefatto, non pagano Incantesimi e non si prelevano (Magia §24.2 e §24.7, Doc del 01/10); «Lancia\!» non le offre più come fonte di PM — implementata il 02/10.  
> * **A.21 — Chroma Viola come fonte di Corruzione passiva**: fasce, frequenza ed esiti nell’app; il frammento si registra nell’inventario senza PM; il conteggio dell’esposizione arriverà insieme a Corruzione e Umanità — implementata il 28/09.  
> * **A.52 — Addestramenti a 76 punti e 10 Punti Abilità Liberi**: confermati da Davide; nessun cambio alle regole dell’app, l’avviso ai personaggi esistenti lo cita — implementata il 28/09.  
> * **A.51 — Categorie di Prove degli Stati**: Percezione tolta da «vista», Assordato come valore a parte, nei promemoria la frase sull’azione esclusivamente visiva o uditiva che fallisce — implementata il 28/09.  
> * **A.43 — AR complessiva** («AR totale, di cui magica»), non per zona del corpo: l’app già così; Magia sez. 7 già corretta nel Google Doc — implementata il 28/09.  
> * **A.44 — Armatura, scudo ed elmetto a 0 PI**: niente AR né benefici; lo scudo Rotto non attacca né para; la rottura vale dal colpo successivo — implementata il 28/09.  
> * **A.45 — Kit di rinforzo a 0 PI**: perde AR e proprietà, l’armatura sottostante resta com’è, PI separati — implementata il 28/09.  
> * **A.46 — Riparazione strutturale** di armi, armature, scudi, elmetti e rinforzi: pulsante «Ripara», 1 ora, Prova di Tecnologia (−2 con strumenti improvvisati), esito scelto dopo il tiro, materiali al 5% del prezzo per PI recuperato tolti dai crediti — implementata il 28/09.  
> * **A.47 — Oggetti senza PI**: nessun valore predefinito; campo facoltativo «PI definiti dal Direttore»; sanitari tracciati; esemplari identici raggruppati con «Danneggia uno» — implementata il 28/09.  
> * **A.48 — Corazza Potenziata, Aura di Resistenza e Pelle di Rinoceronte si sommano**; Corazza Potenziata solo con una protezione Artefatto; le due Tecniche come interruttori al tavolo — implementata il 28/09. Resta la domanda A.53 sulle armature con AR magica propria.  
> * **A.49 — Condizioni delle armi (§5.17)** come stato al tavolo, distinto dai PI: penalità al VA e blocco di «Attacca\!» quando l’arma non è utilizzabile — implementata il 28/09.  
> * **A.50 — Ordine delle riduzioni dell’AR** (Perforante, Laser, Incendiato): nei dati dell’app e come promemoria in «Attacca\!» — implementata il 28/09.  
> * **A.13 — Rainy Dayer** nelle Carabine, solo per il profilo di tiro — implementata il 28/09.  
> * **A.16 — Prove fisiche**: lista confermata; le penalità fisiche non toccano Potere né le Salvezze — implementata il 29/09.  
> * **A.17 — Terrorizzato anche alle Prove Salvezza** durante lo Stato: risposta nel Manuale del Giocatore del 28/09 (§5.18); l’app già così — chiusa il 29/09.  
> * **A.19 — Contenitori Chroma**: acquistato pieno; trovato con i PM impostati dal giocatore — implementata il 29/09.  
> * **A.22 — Senz’armi 1d4 più il bonus di FOR**; Arti Marziali 1d6; Lottatore il suo dado — implementata il 29/09.  
> * **A.23 — Mano non dominante −4** salvo Ambidestro; con due armi solo la penalità della manovra — implementata il 29/09.  
> * **A.24 — Incalzare**: Prova per colpire a −4 contro le Difese, spinta 2 Q, nessun danno — implementata il 29/09.  
> * **A.25 — Copertura anche nel ravvicinato**: −2 / −4, Copertura Migliorata −4 / −6, Totale impedisce l’attacco — implementata il 29/09.  
> * **A.26 — Superiorità numerica**: \+1 / \+2 / \+3 con 3–5 / 6–7 / 8+ attaccanti; campo nel pannello — implementata il 29/09.  
> * **A.27 — Spazzata**: bersagli adiacenti fra loro e tutti entro la portata — implementata il 29/09.  
> * **A.28 — Sbilanciare e Disarmare**: l’opposizione la sceglie il bersaglio prima del tiro — implementata il 29/09.  
> * **A.29 — Magistrale**: bonus ordinari prima del moltiplicatore, quelli dopo l’Armatura no, solo la prima applicazione — implementata il 29/09.  
> * **A.30 — Pesi mancanti «da definire»**, totale del carico parziale — implementata il 29/09.  
> * **A.31 — Oltre il carico massimo**: Movimento 0 Q e −2 alle Prove fisiche — implementata il 29/09.  
> * **A.33 — Pistole corporative**: HG10, Bolter 10, P500, Nemesis 100, Belliger, Ronin 25 AP; Revolver commerciale — implementata il 29/09.  
> * **A.34 — Binocolo e Registratore audiovisivo** con peso e prezzo (Equipaggiamento 0.3 §§4.2–4.3) — implementata il 29/09.  
> * **A.34, in parte — Oggetti della dotazione con scheda**: 28 delle 44 voci (dotazione comune, abiti, luci, corredi di orientamento, arrampicata e sopravvivenza, tenda, maschera, comunicatori, ottiche, sorveglianza, ricarica del Kit trauma) prendono peso, prezzo, Qualità, PI ed effetti dalla scheda dell’Equipaggiamento 0.3, anche nei personaggi già salvati; restano aperte 16 voci (sezione 2\) — implementata il 29/09.  
> * **A.37 — Ricarica**: doppiette e pompa una cartuccia per operazione (3 con Ricarica Migliorata); M310 e SA SG2001 a caricatore — implementata il 29/09.  
> * **A.39, punti 1–3** — Anticipazione senza Addestramento (colonna «altri» −2), Colpo Elementale (PS solo per gli effetti secondari, per elemento), Rigenerazione (procedura rituale non ancora definita) — implementata il 29/09.  
> * **A.41 — Sbilanciare e Disarmare con l’Abilità del mezzo dichiarato**, non il VA maggiore — implementata il 29/09.  
> * **A.42 — Spazzata anche senz’armi**, con Corpo a corpo — implementata il 29/09.  
> * **A.78 — Attacco con VA finale 20 o più**: gli attacchi e le Difese attive si tirano anche con VA finale 20 o più (salvo le eccezioni esplicite, come Colpo Elementale); Magistrale con 1 a VA 20 e con 1–2 da VA 21; con Successo Magistrale Migliorato 1–2 a VA 20 e 1–3 da VA 21; il 20 resta Maldestro. Le altre Prove seguono il §1.7. Risposta del 02/10 (E\&L, decisione 3\) — implementata il 02/10.  
> * **A.61 — Capolavoro del Corazzaio**: \+1 a una sola Contromisura numerica scelta alla costruzione (Ignifugo, Termico, Isolante, Dissipante, Imbottita, Anticorrosivo); assente vale 1, con valore X diventa X \+ 1; non aumenta l'AR; Riflettente esclusa. Risposta del 02/10 (E\&L, decisione 4\) — implementata il 02/10.  
> * **A.62 — Katana Ryūjin**: natura Naturale; attiva 1d8 \+ 1 \+ 1d6 con la proprietà Plasma, un solo colpo. Risposta del 02/10 (decisione 15\) — implementata il 02/10.  
> * **A.63 — Esoscheletri**: NEC Rossi di formato dedicato al modello, con autonomia, ricarica e ricambio della scheda; sostituzione 1 minuto. Risposta del 02/10 (decisione 18\) — implementata il 02/10.  
> * **A.64 — Moduli IAS**: NEC Blu IAS da 1.000 Lx \= 20 cariche da 50 Lx (Power Blink 2); ricambio 1.000 cr, ricarica 50 cr in 1 ora. Risposta del 02/10 (decisione 20\) — implementata il 02/10.  
> * **A.65 — Dotazioni con più schede**: nuova scheda «Corredo agricolo Standard — Allevamento» (2 kg, 200 cr, CO, \+0); strumento musicale acustico o elettronico a scelta, senza sovrapprezzo. Risposta del 02/10 (decisioni 10 e 11\) — implementata il 02/10.  
> * **A.66 — Corredo da cucina**: 30 minuti per fino a quattro persone, NEC Rosso da 500 Lx, 50 Lx a preparazione. Risposta del 02/10 (decisione 19\) — implementata il 02/10.  
> * **A.67 — Modulo Blu del Gehemmapuker**: è il Modulo Blu del catalogo NEC, una voce sola; regola generale: niente travaso di energia fra NEC. Risposta del 02/10 (decisione 14\) — implementata il 02/10.  
> * **A.68 — Interfaccia neurale standard**: 3.500 cr \+ 2.000 di installazione, 2 UMN, acquistabile. Risposta del 02/10 (decisione 21\) — implementata il 02/10.  
> * **A.71 — Cartuccia chirurgica**: un solo consumabile, «Cartuccia chirurgica — set sterile monouso», 500 cr o 2.500 per cinque. Risposta del 02/10 (decisione 17\) — implementata il 02/10.  
> * **A.74 — Rituale di Rigenerazione**: VA del Canale \= Rituali; dopo il Magistrale ripartizione libera entro i limiti; Rituale diretto solo PM personali; versioni per Ritualista. Risposta del 02/10 (decisioni 1, 2, 12, 13\) — implementata il 02/10.  
> * **A.75 — Batterie oltre i 5 PM**: supporto base per tutte (0,2 kg, Comune, PS 10, 3 PI), anche Matrice. Risposta del 02/10 (decisione 16; Equipaggiamento §10.1) — implementata il 02/10.  
> * **A.73 — Formato dei nemici per il Tavolo del Master** (E\&L del 02/10, decisioni 5–9). Formato con valori già calcolati, comune all'app e al futuro bestiario. Campi nuovi: azioni per Round, Contromisure, Abilità rilevanti con VA, talenti e capacità speciali. Sei Caratteristiche nel bestiario, facoltative nell'app; un valore mancante non vale 0\. Parità d'Iniziativa DES → INT → 1d10. I nemici seguono la procedura dei PG per PV, Ferite e Menomazioni, senza Affaticamento. Incantesimi completi con «Lancia\!» e PM scalati; incompleti come promemoria. Passo obbligatorio; Corsa e Scatto 2× e 3× se mancano; «non consentito» è diverso da «mancante». Formato implementato il 02/10 su main; plancia del Tavolo del Master implementata il 02/10 sul branch.  
> *   
> * *Nel frattempo:* la disponibilità la stabilisce il Direttore, senza Prova.  
> * **A.90 — Punti Abilità liberi**: vale il Manuale del Giocatore del 03/10 sera, 7 punti alla creazione e a ogni Grado (livelli 4, 8, 12, 16, 20); l’E\&L con 5 è superato. Chi ne ha assegnati 5 per Grado ha 2 punti da assegnare per evento («Assegna»); chi ne ha 10 ne ha 3 in eccesso per evento («Togli»). Nessun punto cambia da solo — implementata il 04/10.  
> * **A.32** — Confermati i 18 Talenti magici; Potere Mistico \+5 PM per acquisizione fino a tre; Potere e Recupero Mistico richiedono una riserva personale; Concentrazione: PS Volontà su CAR, \+3 di Concentrazione Migliorata solo per mantenerla; Concentrazione Operativa senza altri lanci, salvo Contromagia e Convertire Potere. *App: già conforme.*  
> * **A.34** — Oggetti delle dotazioni collegati alle schede del catalogo, NEC contati una volta; Qualità, PS e PI approvati per cassetta, attrezzi e corredi; scambio al 100% solo per gli armamenti ammessi. *App: applicata il 05/10.*  
> * **A.36** — Bonus degli oggetti solo quando si usano; per la stessa Prova vale il maggiore degli strumenti; valori di binocolo, corredi, abiti eleganti e kit trauma approvati. *App: già conforme.*  
> * **A.38** — Sette chiarimenti sull'attacco a distanza (Movimento Tattico e Fluido si sommano, Copertura, seconda Prova a −4, Mira Selettiva, Imbracciare, Bruciapelo Migliorato, Movimento Evasivo). *App: da applicare.*  
> * **A.40** — Carica fino alla Corsa massima: 3–6 Q −2/−4, da 7 Q −4/−6, danno ×2; tolto il limite di 12 Q. *App: da applicare.*  
> * **A.53** — Corazza Potenziata solo con armatura o scudo classificati come Artefatto e con almeno 1 PI; \+1 all'AR una sola volta. *App: già conforme.*  
> * **A.54** — Revolver: 1 AzP riempie il tamburo, anche in parte; Ricarica Rapida gratuita una volta per Round. *App: già conforme.*  
> * **A.55** — Caratteristica del bonus al danno per Abilità (pesanti: attacco con FOR, danno con INT), tetto \+1/+2/+3, prima dei moltiplicatori; granate e razzi esclusi. *App: già conforme.*  
> * **A.56** — Basi dalla prima Classe (7/6/5/3, 122 punti), limiti al I Grado 12/9/7/5, 7 punti liberi per Grado. *App: già conforme.*  
> * **A.57** — Punti liberi ricostruiti evento per evento, con i limiti del momento; i punti legali non si rimborsano; avanzamento bloccato finché la ricostruzione non è completa. *App: da applicare, dopo A.107 e A.108.*  
> * **A.58** — Il \+1 di Corporazione resta nel calcolo e torna utile quando il limite sale; i modificatori circostanziali vengono dopo il limite. *App: già conforme.*  
> * **A.59** — Depositare un Artefatto non interrompe la Sintonizzazione; una batteria depositata non alimenta. *App: da applicare.*  
> * **A.60** — Otto schede; mani registrate; vista rapida delle protezioni; condizioni modificabili anche nella tab Abilità. *App: in parte, il resto dopo A.110.*  
> * **A.69** — Installazione, rimozione e reinstallazione degli impianti: clinica sicura, tempi, Prova, postazioni, tariffe, legame impianto–perdita–recuperi. *App: da applicare.*  
> * **A.70 e A.92** — L'Umanità si recupera solo con una procedura: Riabilitazione a cicli di 7 giorni dopo una rimozione (500 cr e Prova, oppure clinica 1.000 cr per \+1), massimo 20\. *App: da applicare.*  
> * **A.74 e A.75** — Confermate le risposte su Canali, Rituali, Ritualista e batterie con supporto base. *App: già conforme.*  
> * **A.76** — Sanguinante: perdita iniziale una volta per attacco se almeno 1 danno supera l'AR; poi all'INI della fonte; fra più sanguinamenti vale il maggiore. *App: quasi conforme.*  
> * **A.77** — Perforante riduce l'AR non magica totale a ogni applicazione di danno, senza erosione. *App: già conforme.*  
> * **A.79** — Umani costruiti come PG (livelli 2/5/8, media del dado arrotondata per eccesso, 7 punti); le etichette non danno PV, danni o Azioni; Eretico senza poteri oscuri. *App: da applicare.*  
> * **A.84** — Regime di lancio dei nemici (Taumaturgo, altro utilizzatore, capacità specifica) con le due colonne di modificatori. *App: da applicare.*  
> * **A.85** — Bonus di SAG al danno magico: calcolato per gli umani, dichiarato nel profilo per le creature, mai due volte. *App: da applicare.*  
> * **A.87** — Artefatti del gruppo già assegnati nei file dei PG, niente deposito comune: Lucas ha Guanti, Pietra, una Batteria Matrice e due Schegge; Dimitri Orlav una Batteria Matrice e due Schegge. *App: nessuna modifica (residui: A.112).*  
> * **A.91** — Scheda unica del veicolo condivisa fra PG e Tavolo, proprietario distinto dal conducente. *App: da applicare (registro sul server).*  
> * **A.93** — Corpi cyborg completi non disponibili ai PG. *App: già conforme.*  
> * **A.94** — Interfaccia SIN: standard 5.500 cr e 2 UMN, CYBERTRONIC 7.000 cr e 1 UMN. *App: già conforme.*  
> * **A.95, A.96 e A.97** — Via il −2 per il volo e il \+2 per la taglia; Boss solo come etichetta; calibrazione solo come «Stima sperimentale, da verificare al tavolo», senza costo universale dei moduli. *App: da applicare.*  
> * **A.98** — Rune e Tatuaggi: sviluppo futuro, nessuna sezione nell'app. *App: da togliere la sezione vuota.*  
> * **A.99** — Prevale la decisione approvata più recente; il Prontuario è solo un riassunto. *App: nessun codice.*  
> * **A.101** — ASA Scout MK4 approvato (valore 202.520 cr, M606, copriruote, energia, aria, riparazioni, dotazione sanitaria). *App: applicata il 05/10.*  
> * **A.102** — Autovettura civile: REP Comune. *App: applicata il 05/10.*  
> * **A.103** — Esempio del §4.3 generico; lo Scout resta Corazzato 1\. *App: applicata il 05/10.*  
> * **A.104** — Per le collisioni conta l'andatura attuale, distinta da quella scelta per dopo. *App: applicata il 05/10.*  
> * **A.105** — Veicolo nel Tavolo del Master: si muove all'INI del conducente, senza INI propria. *App: da applicare, dopo A.91.*  
> * **A.106** — Penombra −2, luce molto scarsa −4, buio come Accecato; Visione notturna e Visione Perfetta con i loro limiti. *App: da applicare.*  
> * **A.80** — Si indossano da soli soprabiti, mantelli, Tabardo consacrato e Sottogiacca IES, con il profilo autonomo AR 1, Leggera, FOR 3 e le proprietà della scheda; su un'armatura compatibile valgono come rinforzo; togliendo l'armatura un rinforzo strutturale resta montato senza effetto. *Implementata il 03/10.*  
> * **A.81** — Pelle di Rinoceronte: \+3 solo nelle Prove di Immobilizzare, Sbilanciare, Disarmare e Incalzare, e ad Atletica per uno sforzo di forza; mai a Difese o all'Abilità dell'arma. *Implementata il 03/10.*  
> * **A.82** — Onda Interiore: dado della Disciplina e del Grado più il bonus di SAG (tetti \+1/+2/+3), non FOR; il \+2 Ravvicinato di Pelle di Rinoceronte non si applica. *Implementata il 03/10.*  
> * **A.83** — REP Epica: ricerca con Oratoria −6, se il Direttore ammette una possibilità concreta; Batterie Matrice colorate Epiche, Bianche Leggendarie. *Implementata il 03/10.*  
> * **A.86** — Granate e razzi: danno completo della munizione, senza bonus di Caratteristica. *Implementata il 03/10.*  
> * **A.88** — Individuare a Concentrazione: 10 min / 30 min / 1 h / 2 h / 4 h per le versioni 6–8 / 9–11 / 12–14 / 15–17 / 18\. *Implementata il 03/10.*

> 

## ---

**7\. Risposte di Davide**

Scrivi qui, in coda, una risposta per blocco: numero della domanda, data, testo. Va bene anche rispondere nel Doc E\&L.  
Le risposte qui sotto sono riportate dal documento «Per Davide» del 28/09, che non si usa più.  
**A.7 (Pistola mitragliatrice compatta).** Appartiene alla famiglia Pistole ai fini delle Specializzazioni. Specializzazione Pistole concede \+1 VA e \+1 danno anche usando Raffica Breve o Media. Specializzazione Mitragliatori non si applica a questo modello. L’Abilità utilizzata rimane Armi leggere in tutte le modalità di fuoco; la raffica non cambia la famiglia dell’arma. Nell’app il profilo deve quindi essere associato a Pistole, senza passare a Mitragliatori quando viene selezionata una raffica. Riferimenti: Manuale degli Armamenti, §7.7; Manuale del Giocatore, §8.8.1.  
**A.8 (Pugnale e Ascia leggera, uso ravvicinato e lancio).** La Specializzazione applicabile dipende dall’impiego. Per il Pugnale si applica Coltelli e Pugnali nell’uso ravvicinato e Armi da Lancio quando viene lanciato. Per l’Ascia leggera si applica Asce nell’uso ravvicinato e Armi da Lancio quando viene lanciata. Al lancio si usa l’Abilità Armi da lancio; possedere la Specializzazione Armi da Lancio concede \+1 VA e \+1 danno. Coltelli e Pugnali e Asce concedono i rispettivi benefici soltanto nell’impiego ravvicinato. Anche possedendo entrambe le Specializzazioni pertinenti all’oggetto, si applica soltanto quella relativa all’attacco effettuato, senza cumulo né scelta alternativa. Le Abilità dei profili ravvicinati restano quelle indicate nelle schede. Riferimenti: Manuale degli Armamenti, §§7.1.1 e 7.7; Manuale del Giocatore, §8.8.1.  
**A.9 (famiglie delle 12 armi ravvicinate corporative).** Katana, Wakizashi, Lama Mushashi e Lama Demontooth appartengono a Spade; Kriss a Coltelli e Pugnali; Nunchaku, Nunchaku elettrificato e Catena chiodata ad Armi Flessibili; Bordone Templare a Mazze e Bastoni; Elettrosega CSB600, Chainreaper e Sbudellatrice alla nuova famiglia Armi a Sega.  
Si aggiunge Specializzazione Armi a Sega all’elenco del Manuale del Giocatore, §8.8.1, con il normale beneficio di \+1 VA e \+1 danno. La classificazione ai fini della Specializzazione non modifica l’Abilità prevista dalla scheda di ciascuna arma. Per esempio, Katana utilizza Armi da guerra e Wakizashi Armi da mischia, pur appartenendo entrambe a Spade. Nell’app le dodici armi devono essere associate alle famiglie indicate e Armi a Sega deve diventare una Specializzazione selezionabile. Riferimenti: Manuale degli Armamenti, §7.1.9; Manuale del Giocatore, §8.8.1.  
**A.10 (Scudo delle Guardie Sacre).** Il danno base è 1d6+1 Naturale con lama ritratta e 1d6+1+1d4 Naturale con lama estratta. Si conferma il valore del §7.1.9 e si deve correggere il §7.4.10, dove manca il \+1. La lama aggiunge 1d4 al danno base dello Scudo. È un unico colpo: si sommano dadi e bonus pertinenti e si applica l’Armatura una sola volta. Estrarre o ritrarre la lama costa 1 Azione Principale; il suo utilizzo non consuma PM e non richiede Sintonizzazione. La lama resta indipendente dall’attivazione di Scudo Magico. Nell’app devono comparire i due profili di danno corretti, secondo lo stato della lama. Riferimenti: Manuale degli Armamenti, §§7.1.9 e 7.4.10.  
**A.11 (Specializzazioni delle 16 armi a distanza corporative, §7.8, riferite al profilo principale dell’arma).**  
Fucili di Precisione: Eruptor, Mefisto, Archer, Assailant.  
Fucili d’Assalto: M50, AR3000, Volcano, Invader, Shogun, Panzerknacker.  
Mitragliatori: Justifier, Purifier.  
Carabine: Mandible, Interceptor, Airbrush, Windrider N4.  
Il Panzerknacker va quindi nei Fucili d’Assalto, anziché nelle Carabine: il suo profilo ha danno 1d6+2, FOR 5, gittata massima 100 Q e modalità di fuoco corrispondenti a quelle del M50.  
I moduli integrati mantengono la propria Specializzazione: Lanciagranate per il modulo del Volcano e Lanciafiamme per quello dell’Eruptor. L’Abilità richiesta rimane quella del profilo: Armi medie per i fucili e le carabine qui elencati, Armi pesanti per Justifier e Purifier. La Specializzazione pertinente conferisce il normale \+1 al VA e \+1 al danno (§8.8.1).  
**A.12 (Specializzazioni delle altre armi corporative per analogia con le famiglie del §7.7).** Le pistole e le pistole mitragliatrici corporative appartengono alla Specializzazione Pistole: per esempio MP105, P1000 e Nemesis 210\. Le armi pesanti automatiche appartengono a Mitragliatori: per esempio MG40, Deathlock Drum, Kensai e Nimrod Autocannon. Le armi a distanza al plasma appartengono ad Armi al Plasma: per esempio Hellblazer e Plasma Intruder.  
Hellblazer usa esclusivamente la Specializzazione Armi al Plasma, pur richiedendo l’Abilità Armi leggere. MP105 GW e Nemesis 21 sono invece Carabine, distinte dalle rispettive pistole. Lanciafiamme, lanciarazzi e moduli integrati mantengono la propria Specializzazione.  
La SA30 a dardi rientra nelle Pistole: la Specializzazione conferisce \+1 al VA, ma la regola Danno calibrato esclude il bonus al danno. Negli altri casi si applicano normalmente \+1 al VA e \+1 al danno, mantenendo l’Abilità indicata nel profilo dell’arma.  
**A.14 (disponibilità degli Artefatti Mistici).** Gli Artefatti Mistici sono generalmente pochi e non commercializzati; non esistono normali negozi che li vendano. La Fratellanza è l’unica a produrne in quantità, ma non li commercializza al di fuori della propria congrega. Bauhaus, Imperiali e Mishima ne producono quantità molto inferiori. Nei sistemi esterni, poco controllati dall’Imperium, si può trovare qualche Tecnomistico indipendente che li produce e li vende a prezzi elevati.  
**A.14 (profili delle batterie da 5 PM).** Chroma Rosso, Blu e Verde hanno ciascuno reperibilità Molto rara e valore indicativo di 10.000 crediti. Il Chroma Bianco, universale, ha reperibilità Leggendaria e valore indicativo di 50.000 crediti. Tutti e quattro i profili hanno capacità 5 PM, Qualità costruttiva Comune, PS Integrità 10, PI massimi 3 e peso 0,2 kg. Le batterie acquistate sono cariche, 5/5 PM, secondo A.19; restano le regole già previste per utilizzo e ricarica.  
La scala di reperibilità viene estesa a Comune, Non comune, Rara, Molto rara, Leggendaria. Leggendaria è superiore a Molto rara ed è riservata a disponibilità eccezionali introdotte dal Direttore di Gioco. Questi valori economici sono riferimenti per eventuali scambi, non un listino che garantisce l’acquisto. Deve prima esistere un produttore o possessore disposto a cedere l’oggetto; una Prova di Oratoria, da sola, non crea questa disponibilità. Valgono i vincoli di produzione e circolazione indicati sopra.  
La reperibilità resta distinta dalla potenza mistica e dalla Qualità costruttiva. Per le batterie da 5 PM Rosse, Blu e Verdi la potenza mistica resta Comune e il costo di Sintonizzazione 1 punto; per quelle Bianche la potenza resta Non comune e il costo di Sintonizzazione 2 punti. La reperibilità Leggendaria non porta il costo a 6 punti. I precedenti prezzi di 500 e 1.000 crediti e le reperibilità Non comune e Rara sono sostituiti dai valori approvati. A.14 è risolta.  
**A.21 (Chroma Viola e Corruzione passiva).** Il Chroma Viola è saturo di Energia Oscura e la sola vicinanza corrompe l’essere umano. Non è reperibile in commercio. Va trattato come una fonte di Corruzione passiva, non come una normale batteria o un oggetto inerte; la precedente soluzione provvisoria non è adottata.  
La frequenza della PS di Magia è una ogni ora in tutte le fasce, compreso il contatto diretto. Contatto diretto: esposizione Intensa, −2 alla PS, Intensità 2 Stati. Entro 1 Q senza contatto diretto: Normale, modificatore 0, Intensità 1 Stato. Oltre 1 Q e fino a 6 Q: Debole, \+2 alla PS, Intensità 1 Stato. Oltre 6 Q e fino a 12 Q per un frammento trasportabile: \+4 alla PS, Intensità 1 Stato; questa combinazione è denominata Flebile nella scala del Manuale del Giocatore, §5.20.1. Sono superati gli intervalli precedentemente proposti di 10 minuti e 1 minuto.  
Si applicano i normali esiti della Corruzione (§5.20.1): Successo, nessun peggioramento; Fallimento, peggioramento pari all’Intensità; Fallimento Maldestro, peggioramento pari all’Intensità più 1 Stato; Successo Magistrale, nessun peggioramento e \+4 alla prossima PS di Magia contro Corruzione nella stessa Scena, per una sola Prova. Restano i modificatori pertinenti, comprese le penalità da CROS e Umanità.  
Raggio approvato: per un frammento trasportabile di Chroma Viola l’aura di Corruzione passiva si estende fino a 12 Q (18 metri), inclusi. Oltre questo limite il frammento non provoca esposizione passiva. Cristalli grandi e giacimenti hanno un raggio specificato dal Direttore di Gioco.  
Tempi approvati: la prima PS di Magia si effettua dopo un’ora complessiva di esposizione; segue una PS per ogni ulteriore ora di esposizione. Fuori dall’aura il conteggio si sospende, senza azzerare i minuti già accumulati. Cambiare distanza non provoca PS aggiuntive. Alla scadenza si usa il modificatore e l’Intensità della fascia più grave raggiunta durante quell’ora di esposizione, quindi inizia il nuovo intervallo orario. Un contatto brevissimo, da solo, non impone una PS immediata, ma contribuisce al tempo accumulato e alla gravità della prossima prova. Esempio: 10 minuti a contatto e 50 minuti a 8 Q richiedono una sola PS contro esposizione Intensa, −2 alla PS e Intensità 2 Stati.  
A.21: definita la gestione della Corruzione passiva del Chroma Viola. La registrazione come oggetto inerte è superata; le regole per impiegarne l’Energia Oscura restano da sviluppare.  
*Risposte scritte da Davide il 28/09 nel documento «Per Davide — aggiornato 28/09» (che non si usa più), riportate qui.*  
**Risposta A.52** — Chiarimento delle decisioni già approvate il 27/09/2026 e recepite nel Manuale del Giocatore v0.43.  
La versione operativa per la prova approvata è quella con 76 punti base per ciascun Addestramento: 8 Abilità con base 4, 12 con base 3 e 4 con base 2, per un totale di 24 Abilità. Sostituisce la precedente distribuzione da 56 punti. L’adozione della nuova distribuzione non costituisce una verifica definitiva dell’equilibrio di gioco.  
I Punti Abilità Liberi sono 10 alla creazione e altri 10 ai livelli 4, 8, 12, 16 e 20: 60 complessivi. I 10 della creazione sono già quelli del 1° livello e non si assegnano due volte.  
I limiti di Avanzamento nella stessa Abilità restano: livelli 1–3 massimo 3; livelli 4–7 massimo 4; livelli 8–11 massimo 5; livelli 12–15 massimo 6; livelli 16–19 massimo 7; livello 20 massimo 8\.  
Il limite comprende sia i punti fissi di Classe sia i punti liberi. Si assegnano prima i punti di Classe e poi quelli liberi; resta il requisito di VA almeno 1 prima dell’assegnazione dei punti liberi. I punti di Avanzamento non modificano il Valore Base Addestramento né il bonus della Corporazione.  
Dieci punti liberi complessivi sono compatibili con il limite iniziale 3, perché vengono distribuiti fra più Abilità. Per esempio, un’Abilità che riceve \+1 dalla Classe può ricevere fino a \+2 dai punti liberi, raggiungendo Avanzamento 3\.  
Riferimenti: Manuale del Giocatore, §§2.3–2.8, 2.13, 8.1 e 8.3. Il quesito è chiarito sulla base della decisione già approvata, senza introdurre una nuova distribuzione o nuovi limiti.  
**Risposta approvata — A.51**: categorie di Prove e penalità degli Stati.  
Le liste delle Abilità sono un riferimento e non un elenco chiuso: conta l’azione eseguita, non soltanto il nome dell’Abilità.  
A Terra: −4 VA ad Armi da guerra, Armi da mischia, Corpo a corpo e Difese; ad Atletica quando riguarda l’equilibrio. Le armi a distanza restano utilizzabili senza questa penalità, se la posizione lo permette.  
Accecato: −8 VA ad attacchi, Difese, Pilotare e altre Prove quando richiedono la vista, salvo sensi alternativi o capacità specifiche.  
Assordato: −4 VA alle Prove in cui l’udito è importante ma non indispensabile, per esempio determinati usi di Percezione o Intrattenere.  
Immobilizzato, Rallentato e Sovraccarico: resta il criterio approvato nella A.16. Le Abilità di riferimento sono Armi da lancio, Armi leggere, Armi medie, Armi pesanti, Armi da guerra, Armi da mischia, Corpo a corpo, Difese, Atletica e Furtività. Le penalità proprie dello Stato o della condizione si applicano anche ad altre Abilità quando l’azione comporta uno sforzo o un’attività fisica pertinente.  
Un’azione esclusivamente visiva mentre si è Accecati, o esclusivamente uditiva mentre si è Assordati, fallisce automaticamente: la penalità non rende possibile un’azione impossibile.  
Percezione non riceve una penalità generale: ascoltare mentre si è Accecati oppure osservare mentre si è Assordati resta possibile normalmente. Anche Medicina o Tecnologia possono richiedere la vista, mentre ricordare un’informazione con Cultura non la richiede.  
**Risposta approvata A.43** — Si usa un’AR complessiva del personaggio, indicando quanta parte è magica («AR totale, di cui magica»), senza valori separati per testa, torso e arti. Le AC indicano applicazioni separate del danno, non zone anatomiche: l’AR pertinente si sottrae a ogni singola applicazione, secondo le protezioni attive e la natura dell’attacco.  
Armatura Mistica converte in Magica l’AR dell’armatura incantata e aggiunge il proprio bonus una sola volta, secondo le regole di cumulo. Nella sua descrizione va eliminato il riferimento alle zone del corpo coperte; le altre protezioni conservano la propria natura. Questa è la correzione da recepire nel Manuale della Magia.  
Esempio: con AR totale 6, di cui 2 magica, si applica AR 6 contro danno Naturale o Magico e AR 2 contro danno Etereo, salvo proprietà particolari. La componente magica è già compresa nel totale. Riferimenti: Manuale del Giocatore, §§5.10 e 5.24; Manuale della Magia, sezione 7 e Armatura Mistica (scheda 22.2).  
**Risposta approvata A.44** — A 0 PI l’oggetto è Rotto e inutilizzabile finché non viene riparato. Un’armatura a 0 PI non fornisce più la propria AR, compresa l’eventuale componente magica, né i propri benefici. Uno scudo a 0 PI non fornisce AR o benefici e non può essere usato per attaccare o parare. Un elmetto a 0 PI perde i propri vantaggi; l’AR dell’armatura ancora integra rimane, come già previsto dal manuale.  
Peso e penalità d’ingombro rimangono: l’armatura rotta conserva le penalità della sua categoria finché è indossata; lo scudo continua a pesare e, se impugnato, a occupare la mano. Le protezioni indipendenti, come un incantesimo attivo sul personaggio, seguono le proprie regole.  
La rottura si applica dopo il colpo che la provoca, senza annullare retroattivamente la protezione già fornita contro quel colpo. Riferimenti: Manuale degli Armamenti, §§7.2.1, 7.4, 7.11.1 e 7.21.3.  
**Risposta approvata A.45** — A 0 PI il rinforzo perde l’AR aggiuntiva e le proprie proprietà, come già previsto dal §7.23.9. L’armatura sottostante conserva la propria protezione e le proprie proprietà native, purché sia ancora integra; i PI dei due oggetti restano separati.  
Finché il rinforzo rotto rimane montato conserva peso, aumento del requisito FOR e penalità della configurazione rinforzata. La rottura compromette la protezione ma non elimina il materiale che ostacola i movimenti. Rimuovendo il rinforzo, l’armatura torna ai requisiti e alle penalità originari.  
Esempio con armatura civile leggera integra e rinforzo pesante: rinforzo integro, AR 3, FOR richiesta 5, penalità Media; rinforzo a 0 PI ancora montato, AR 1, FOR richiesta 5, penalità Media; rinforzo rimosso, AR 1, FOR richiesta 3, penalità Leggera. Riferimenti: Manuale degli Armamenti, §§7.11.2 e 7.23.9.  
**Risposta approvata A.46** — La procedura ordinaria di riparazione strutturale dei veicoli viene estesa ad armi, armature, scudi, elmetti e rinforzi. Ogni intervento riguarda un solo oggetto, richiede 1 ora e termina con una Prova di Tecnologia. Successo: recupera 1 PI. Successo Magistrale: recupera 2 PI. Fallimento: nessun recupero, ma il tempo è trascorso. Fallimento Maldestro: nessun recupero e perdita di 1 PI, fino a un minimo di 0, senza PS Integrità.  
Servono attrezzi e ricambi adeguati. Gli strumenti improvvisati impongono −2 VA quando il lavoro è materialmente possibile. I Talenti pertinenti mantengono i propri benefici; le riduzioni combinate del tempo non scendono sotto la metà del tempo ordinario.  
Il costo dei materiali è pari al 5% del prezzo di catalogo dell’oggetto per ogni PI effettivamente recuperato. Un Magistrale recupera due PI nella stessa ora e consuma materiali per entrambi. Esempio: riparare un’armatura da 2.000 crediti costa 100 crediti di materiali per ogni PI ripristinato. L’eventuale manodopera di un riparatore esterno si paga separatamente.  
Il recupero non supera i PI massimi. Un oggetto Rotto soltanto perché arrivato a 0 PI torna utilizzabile recuperando almeno 1 PI, purché siano presenti i componenti necessari. Gli oggetti Distrutti e il ripristino di componenti mistici richiedono interventi specifici. Le regole particolari dei Talenti e delle condizioni delle armi restano distinte dal semplice recupero di PI.  
**Risposta approvata A.47** — L’assenza dei PI nel catalogo non rende un oggetto indistruttibile e non assegna un valore predefinito. Si mantiene la distinzione fra campo non pertinente e dato ancora da definire. Quando i PI sono indicati si usano normalmente; quando non sono indicati non viene assegnato automaticamente alcun numero, nemmeno zero.  
Per gli oggetti senza PI indicati, eventuali danni vengono valutati dal Direttore secondo la situazione. Se occorre una gestione strutturale, il Direttore definisce prima della risoluzione i valori mancanti, per analogia con oggetti comparabili. Per i consumabili si registrano quantità, dosi o applicazioni; gli eventuali dispositivi riutilizzabili hanno un’Integrità distinta.  
Va corretta l’esclusione generale del materiale sanitario dal tracciamento dei PI: il catalogo assegna, per esempio, 4 PI al kit di pronto soccorso Standard, 6 al Professionale e 2 all’iniettore sanitario manuale. Questi PI vanno gestiti.  
La quantità maggiore di 1 non elimina l’Integrità: ciascun esemplare possiede i propri PI. Esemplari identici possono restare raggruppati nell’inventario finché sono nelle stesse condizioni; quando uno viene danneggiato si registra separatamente. Riferimenti: Manuale dell’Equipaggiamento, §§1.7, 1.10–1.11 e catalogo sanitario.  
**Risposta approvata — A.48, parte 1**: cumulo dei bonus di AR.  
Corazza Potenziata, Aura di Resistenza e Pelle di Rinoceronte si sommano tra loro e alle altre protezioni compatibili. Non rientrano nel confronto fra Pelle Corazzata, Armatura di Forza e il bonus aggiuntivo di Armatura Mistica: per questi ultimi tre contributi continua ad applicarsi soltanto il maggiore pertinente, senza sommarli.  
Corazza Potenziata conferisce \+1 AR magica personale, una sola volta quando sono soddisfatti i requisiti di equipaggiamento del talento: utilizzare contemporaneamente armatura e scudo non raddoppia il beneficio. Aura di Resistenza conferisce \+1 AR magica per 3 Round. Pelle di Rinoceronte conferisce \+1 AR non magica per 3 Round, applicabile soltanto contro gli attacchi ravvicinati di natura Naturale o Magica; non protegge dai danni Eterei.  
Con tutti e tre i benefici attivi e applicabili, l’incremento complessivo è \+3 AR contro gli attacchi ravvicinati Naturali o Magici; \+2 AR contro gli altri attacchi Naturali o Magici; \+2 AR magica contro gli attacchi Eterei. Restano ferme le eventuali eccezioni specifiche delle singole protezioni e degli attacchi.  
Ripetere la medesima Tecnica non ne cumula il bonus. I requisiti di equipaggiamento di Corazza Potenziata sono definiti nella parte 2 della A.48, riportata di seguito.  
**Risposta approvata — A.48, parte 2**: requisiti di Corazza Potenziata.  
Corazza Potenziata richiede una protezione classificata come Artefatto Mistico o TecnoMistico: il requisito si applica sia all’armatura sia allo scudo. Il Tecnomante con questo talento ottiene \+1 AR magica quando indossa un’armatura oppure impugna uno scudo di tale natura, utilizzabile e con almeno 1 PI. Questa definizione sostituisce l’interpretazione provvisoria che concedeva il beneficio con qualsiasi armatura.  
Il beneficio è personale, passivo e si applica una sola volta, anche utilizzando contemporaneamente armatura e scudo validi. Non richiede Azioni, PM o Sintonizzazione; le proprietà attive dell’oggetto mantengono i propri requisiti.  
Lo Scudo delle Guardie Sacre soddisfa il requisito anche con Scudo Magico disattivato o con la riserva scarica. Lo Scudo dei Sacri Guerrieri è invece una protezione ordinaria e non soddisfa il requisito.  
La tecnologia avanzata, l’appartenenza alla Fratellanza o un incantesimo temporaneo sull’armatura non rendono automaticamente l’oggetto un Artefatto valido per questo talento.  
Con l’approvazione delle parti 1 e 2, il quesito A.48 è chiarito.  
**Risposta approvata — A.49**: condizioni delle armi, PI e riparazioni.  
Le condizioni delle armi sono distinte dai Punti Integrità. Un Fallimento Maldestro che rende un’arma Rotta, Inutilizzabile o Danneggiata non azzera automaticamente i PI: si applicano la condizione e le conseguenze indicate dalla tabella, mentre i PI cambiano soltanto quando è prevista una perdita.  
A 0 PI l’arma è comunque Rotta. Recuperare almeno 1 PI elimina il blocco dovuto all’integrità strutturale, ma non cancella un’eventuale altra condizione che ne impedisce l’utilizzo; restano ferme le deroghe espresse dei Talenti e la necessità dei componenti richiesti dalla A.46.  
La riparazione sul campo risolve il guasto secondo la procedura applicabile del §5.17, mantenendo le penalità previste dopo l’intervento. Non recupera automaticamente PI.  
Il recupero dei PI segue la A.46: normalmente 1 PI per intervento riuscito, 2 PI con un Successo Magistrale, senza superare il massimo. Eliminare un guasto o una penalità non equivale a riportare l’arma alla piena integrità; recuperare PI non elimina automaticamente una distinta complicazione.  
Esempio: un’arma con 4/6 PI diventa Inutilizzabile per un Fallimento Maldestro. Rimane a 4/6 PI; dopo la riparazione sul campo può tornare utilizzabile con il −3 VA previsto dalla tabella, sempre a 4/6 PI.  
La condizione Distrutta continua a impedire la riparazione ordinaria.  
**Risposta approvata — A.50, parte 1**: ordine di Perforante e Laser.  
Quando un medesimo colpo possiede entrambe le proprietà, si determina prima l’AR applicabile alla natura del danno. Si applica poi Perforante X, sottraendo X alla sola componente non magica fino a un minimo di 0; infine Laser dimezza per difetto l’AR complessiva rimasta, compresa la componente magica.  
Se Riflettente è applicabile secondo le proprie condizioni, annulla il dimezzamento di Laser; non annulla la riduzione dovuta a Perforante.  
Esempio: AR totale 7, di cui 2 magica, contro Perforante 2 e Laser. Perforante riduce da 5 a 3 la componente non magica: rimangono 5 AR complessivi. Laser dimezza 5 per difetto, lasciando AR finale 2\. Con Riflettente applicabile, l’AR finale rimane 5\.  
Contro un colpo Etereo si considera soltanto la componente magica: Perforante non la riduce, mentre Laser la dimezza normalmente, salvo Riflettente applicabile.  
**Risposta approvata — A.50, parte 2**: Perforante e protezioni degli incantesimi.  
Perforante considera la natura dell’AR indicata nella scheda della protezione, indipendentemente dalla sua origine magica. Riduce quindi l’AR Naturale di Pelle Corazzata e di Scudo (incantesimo); non riduce l’AR Magica di Armatura di Forza.  
La riduzione si applica una sola volta al totale dell’AR non magica pertinente a ciascun colpo, fino a un minimo di 0, e non separatamente a ciascuna protezione. Un’eventuale componente magica compatibile rimane interamente applicabile rispetto a Perforante.  
Esempio: Pelle Corazzata 3 e Scudo 2 forniscono complessivamente AR Naturale 5\. Contro Perforante 2 rimangono 3 AR.  
**Risposta approvata — A.50, parte 3**: Incendiato e Armatura.  
Il danno dello stato Incendiato ignora l’AR non magica generica, comprese le protezioni di Pelle Corazzata e Scudo (incantesimo). L’AR magica pertinente rimane applicabile e riduce ciascun 1d4 dello Stato, sia immediato sia nei Round successivi, fino a un minimo di 0\.  
Le protezioni specifiche contro il Fuoco funzionano secondo la propria descrizione: Armatura Elementale contro il Fuoco protegge anche nelle versioni con AR Naturale.  
Ignifugo X non si sottrae al danno e non riduce direttamente i PV persi. Mantiene la funzione di Contromisura che può impedire l’applicazione dello Stato, alle condizioni già previste.  
Esempio: con AR totale 6, di cui 2 magica, un risultato di 3 sul d4 di Incendiato provoca 1 danno ai PV.  
Assorbire interamente il danno non spegne le fiamme e non elimina il −2 VA dello Stato. Quattro punti di AR magica pertinente possono annullare il normale 1d4, ma Incendiato deve comunque terminare o essere spento.  
**Risposta approvata A.13** — Rainy Dayer (§7.14.6): il profilo di tiro appartiene alla Specializzazione Carabine, che conferisce \+1 al VA e \+1 al danno. L’Abilità utilizzata rimane Armi medie; il tiro richiede due mani sia con l’ombrello aperto sia con l’ombrello chiuso, con gittata massima di 30 Q.  
La funzione difensiva segue le regole già presenti: aperta, la Rainy Dayer fornisce AR \+1 e permette la Parata con Difese. La Specializzazione Carabine riguarda il tiro e non aumenta questa protezione.

