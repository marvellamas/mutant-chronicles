# **Per Davide — domande aperte ed errata dei manuali**

*Aggiornato al 7 ottobre 2026.*

**Istruzioni per Davide (e per l’AI che usi per rispondere)**

•             Questo è l’unico documento con le domande dell’app Mutant. Il link resta sempre questo: non ne esistono altri e non se ne creano di nuovi. Lo stesso testo è nel repo GitHub, docs/per-davide.md.

•             **Rispondi in coda**, nella sezione **7. Risposte di Davide**, alla fine del documento, oppure nel tuo Doc «E\&L – Risposte e correzioni approvate»: leggiamo tutti e due a ogni sessione. Un blocco per risposta, con il numero della domanda (per esempio «A.23»), la data e il testo. Anche «confermo il Nel frattempo» è una risposta valida.

•             Non modificare, spostare o cancellare le domande: lo facciamo noi. Quando una risposta è recepita e la funzione è implementata nell’app, la voce passa nella sezione **6. Risolte**, con la data.

•             Le correzioni ai manuali le fai nei Doc dei manuali, come sempre.

•             Ogni domanda dice cosa fa l’app *nel frattempo*: se non rispondi non si blocca nulla, l’app applica l’ipotesi indicata.

**Sezioni:** 1. Domande che bloccano un lavoro in corso · 2. Domande aperte · 3. Risposte ricevute, in implementazione · 4. Da correggere nei manuali · 5. Manuali che l’app aspetta · 6. Risolte · 7. Risposte di Davide.

-----

## **1. Domande che bloccano un lavoro in corso**

Rispondere a queste per prime: senza, la seconda sessione dei Chroma resta ferma.

**A.20 — Prelievo dal Chroma Bianco senza Addestramento Taumaturgo.** “Un personaggio cosciente può prelevare PM da un contenitore Bianco sintonizzato”: vale per chiunque, anche un Combattente senza magia? O serve almeno l’accesso alla magia? *Nel frattempo:* non ancora implementato; è la domanda che decide come.

-----

## **2. Domande aperte (l’app ha già un’ipotesi ragionevole)**

### **Regole generali**

**A.35 — Acquisti iniziali: valore ceduto maggiore del prezzo (§2.16.29).** Il paragrafo dice che si paga la differenza; se gli armamenti ceduti valgono più del nuovo oggetto (per esempio si cede l’armatura da 1.500 per un’arma da 800), la differenza torna in crediti o si perde? *Nel frattempo:* il conguaglio non scende sotto zero (la differenza si perde) e l’app lo segnala accanto all’acquisto.

**A.112 — Artefatti del gruppo, residui.** Nei file di Lucas e Dimitri tutte le riserve sono al massimo (Guanti 10, Pietra 10, Matrici 10 e 10, Schegge 5 ×4): sono i residui veri? *Nel frattempo:* i valori restano come sono.

**A.111 — Recuperi di Umanità: il caso di Pablo Zaion.** La regola generale è approvata (sezione 7) ed è in implementazione. Resta solo il caso concreto: Pablo ha una perdita di 2 UMN per l’Interfaccia neurale, ma l’impianto non è più nel suo inventario. Era stato rimosso, venduto o perso? *Nel frattempo:* il recupero resta «da verificare» e il totale di UMN è provvisorio.

### **Magia**

**A.109 — Anticipazione: aspetti senza gradino.** Ecco l’elenco che hai chiesto il 06/10 (sostituisce la vecchia A.72, sullo stesso tema): i 32 aspetti dell’Anticipazione ancora senza gradino, con l’incantesimo, la scheda e quello che la scheda dice. Per ognuno: qual è il gradino (che cosa cambia anticipando di uno), oppure «non si anticipa»?

1\.          Muro Elementale (scheda 13.3) — «Numero di elementi»: nella scheda «numero di elementi fino a 3».

2\.          Armatura Elementale (scheda 13.5) — «Numero di elementi»: nella scheda «numero di elementi fino a 3».

3\.          Armatura Elementale (scheda 13.5) — «Mod. PS»: nella scheda «modificatore PS di un gradino −2».

4\.          Esplosione Elementale (scheda 13.6) — «Numero di elementi»: nella scheda «numero di elementi fino a 3».

5\.          Cono Elementale (scheda 13.7) — «Numero di elementi»: nella scheda «numero di elementi fino a 3».

6\.          Devastazione Elementale (scheda 13.10) — «Elemento +1»: nella scheda «+1 elemento fino a 3».

7\.          Devastazione Elementale (scheda 13.10) — «Mod. PS»: nella scheda «modificatore PS da −2 a −4, da −4 a −6».

8\.          Catene di Forza (scheda 17.6) — «Tempra per liberarsi e Riflessi per mantenere l’equilibrio».

9\.          Piattaforma Levitante (scheda 17.7) — «Dimensioni»: nella scheda «1 × 1 → 2 × 1 → 2 × 2 → 3 × 2 → 3 × 3 → 4 × 3 Q».

10\.      Alterare Immagine (scheda 19.1) — «Capacità»: volto generico → identità precisa → voce e postura → equipaggiamento.

11\.      Terrore (scheda 19.7) — «PS della modalità −2»: nella scheda «ulteriore −2 alla PS della modalità scelta, fino a −8 per la mirata o −6 per l’aura».

12\.      Presenza (scheda 20.3) — «Precisione del numero»: nella scheda «Approssimata → Generica → Precisa → Esatta».

13\.      Presenza (scheda 20.3) — «Profondità delle informazioni»: nella scheda «informazioni individuali alla riga successiva, mantenendo quelle già accessibili».

14\.      Psicometria (scheda 20.7) — «Impressioni +1»: nella scheda «un’impressione massima aggiuntiva, fino a 11».

15\.      Marchio Psichico (scheda 20.8) — «Entrambe le modalità»: nella scheda «entrambe le modalità contemporaneamente».

16\.      Marchio Psichico (scheda 20.8) — «Beneficiario: un alleato»: nella scheda «alleato come beneficiario al posto del Taumaturgo».

17\.      Sesto Senso (scheda 20.9) — «Difesa automatica totale +1»: nella scheda «difesa automatica totale aggiuntiva».

18\.      Cura Malattie (scheda 21.2) — «Pericolosità»: nella scheda «I → II → III → IV → V → VI».

19\.      Cura Avvelenamenti (scheda 21.3) — «Pericolosità»: nella scheda «I → II → III → IV → V → VI».

20\.      Cura Spirituale (scheda 21.4) — «Gruppo di capacità»: nella scheda «livello 1 → livello 3 → livello 6».

21\.      Recupero Rapido (scheda 21.7) — «Menomazioni trattate»: nella scheda «1 → 2 → 3 → tutte temporanee».

22\.      Sigillo (scheda 22.3) — «Sigilli +1»: nella scheda «sigillo aggiuntivo».

23\.      Sigillo (scheda 22.3) — «Avviso e Blocco insieme»: nella scheda «combinazione Avviso e Blocco prima del livello 6».

24\.      Trappola Mistica (scheda 22.4) — «Trappole +1»: nella scheda «trappola aggiuntiva entro il limite SAG».

25\.      Trappola Mistica (scheda 22.4) — «Danno proprio»: nella scheda «danno proprio alla riga successiva, massimo il valore di livello 18».

26\.      Trappola Mistica (scheda 22.4) — «Interferenza −1»: nella scheda «penalità di Interferenza peggiorata di 1, massimo −5».

27\.      Trappola Mistica (scheda 22.4) — «Livello massimo caricabile»: nella scheda «3 → 6 → 9 → 12 → 15 → 18».

28\.      Luce Mistica (scheda 23.2) — «Sorgente su un oggetto»: nella scheda «sorgente su un oggetto toccato, anziché sul Taumaturgo».

29\.      Nascondere Aura (scheda 23.7) — «Potere di Occultamento»: nella scheda «3 → 6 → 9 → 12 → 15 → 18 → 21».

30\.      Premonizione (scheda 23.8) — «Utilizzi +1»: nella scheda «utilizzo aggiuntivo, massimo 7».

31\.      Premonizione (scheda 23.8) — «Possibilità di scegliere il risultato preferito già ai livelli 6 o 9».

32\.      Individuare (scheda 23.9) — «Informazioni della soglia successiva»: nella scheda «in una sola categoria scelta, fino al livello 18».

Molti hanno già la scala scritta (per esempio 9, 12, 18, 27, 29): in quei casi basta confermare che un gradino è un passo della scala. *Nel frattempo:* l’app mostra «valore da definire al tavolo» con il motivo; PM e Prova si calcolano comunque.

### **Armamenti**

**A.135 — Ricarica dei fucili a pallini semiautomatici e automatici.** Il Manuale degli Armamenti 0.59 distingue i fucili a pallini a pompa (solo Colpo Singolo) dai semiautomatici (HD14M, SA SG2001, Airbrush) e dall’automatico Mandible, ma non dice come si ricaricano. Si inserisce una cartuccia per operazione, come nei fucili a pompa, oppure si sostituisce un caricatore? *Nel frattempo:* come prima. HD14M si ricarica una cartuccia per operazione; SA SG2001 ha un caricatore (A.37); Mandible e Airbrush hanno un caricatore, come le altre armi delle loro tabelle.

### **Veicoli e nemici**

**A.113 — Veicoli, permessi e nomi.** Il Master può modificare anche un mezzo di un singolo PG? Senza il server il veicolo del gruppo si vede in sola lettura: va bene? La struttura si chiama «Carrozzeria» o «Corpo principale»? *Nel frattempo:* rimandata (sezione 7).

**A.115 — Nemici con «capacità specifica».** L’app deve solo mostrare il testo della capacità, o ci sono Prova e costo da calcolare? *Nel frattempo:* rimandata con il bestiario; l’app mostra il testo.

**A.126 — Creature da 3×3 Q.** Quando una creatura occupa 3×3 Q invece di 2×2? Serve nella scheda un campo con l’ingombro in Q? *Nel frattempo:* 1 Q, oppure 2×2 per la Taglia Grande; 3×3 solo se indicato nel profilo.

### **Mappa**

**A.122 — «Aiuto-master».** Le altre priorità della mappa sono approvate (sezione 7). Nella tua app Eroi & Leggende «Aiuto-master» è la pagina in cui un aiutante, abilitato dal master, muove il personaggio di turno in otto direzioni o trascinandolo, senza limite di movimento, e vede l’elenco dei personaggi e la stessa vista dei giocatori. Ti serve anche nella nuova mappa? *Nel frattempo:* no, la plancia e la mappa del master fanno già lo stesso.

**A.133 — Portata delle creature grandi (zona di controllo).** Per il Giocatore §5.3 l’Attacco di Opportunità scatta uscendo dalla portata ravvicinata dell’avversario (1 Q di norma, di più con armi lunghe). Una creatura 2×2 o 3×3 ha la portata del suo profilo (1 Q attorno a tutto l’ingombro) o una portata maggiore per la Taglia (2 Q per i 2×2, 3 Q per i 3×3, come proposto da Marcello)? *Nel frattempo:* la portata del profilo.

**A.136 — Corsa o Scatto dopo un Passo già cominciato.** La A.129 dice che solo il Passo si divide e che Corsa e Scatto sono un blocco unico da completare prima delle Azioni Principali, tutti al costo dell’unica Azione di Movimento. Se un personaggio ha già fatto una parte del Passo (per esempio 2 Q, prima di ogni Azione Principale), può trasformare il movimento in una Corsa o in uno Scatto, contando i Q già fatti nel blocco (2 + 10 = 12)? *Nel frattempo:* no, Corsa e Scatto partono solo da fermi; il master annulla il movimento e lo rifà come Corsa.

**A.137 — Raggio di un’Area sulla griglia.** Il Manuale della Magia dice che il Raggio è la «distanza dal centro al limite» e che un Q rientra nell’Area se è incluso per almeno metà; il movimento conta la diagonale come 1 Q (A.124). Il raggio di un’esplosione o di una granata si conta a quadretti (raggio 2 Q = un quadrato di 5 × 5 Q; una granata con Raggio di Scoppio 1 Q colpisce il suo Q e gli otto attorno) oppure è un cerchio vero, con i Q coperti per almeno metà? *Nel frattempo:* a quadretti, come il movimento; anche coni e linee in diagonale si misurano a quadretti.

**A.138 — Forma del Cono.** Il Cono è «lunghezza × larghezza finale, con apertura progressiva» e parte dal bordo dello spazio del Taumaturgo (Cono Elementale, da 3 × 2 a 18 × 9 Q). Quanto è largo all’inizio, accanto al Taumaturgo? E con una larghezza finale pari (3 × 2, 12 × 6), quando il cono va dritto lungo una fila di quadretti, come si contano i Q del bordo? *Nel frattempo:* largo 1 Q accanto al Taumaturgo, poi si allarga in modo uniforme; i Q del bordo coperti per meno di metà restano fuori.

**A.139 — Porta «adiacente» in diagonale.** Per aprire o chiudere una porta (1 AzP, A.125) bisogna esserle adiacenti. Basta essere in diagonale rispetto alla porta? *Nel frattempo:* sì, come per la portata di 1 Q. La mano libera la controlla il master.

**A.140 — Copertura sulla mappa.** Il §5.8 dice quanto vale la Copertura (Leggera −2, Media −4, Totale) ma non come si decide guardando la mappa. Proposta (il punto di partenza l’ha deciso Marcello il 07/10): dal centro del quadretto di chi tira si tracciano cinque linee, verso i quattro angoli e il centro del quadretto del bersaglio; contano le linee che passano per muri o porte chiuse; 0 = nessuna, 1–2 = Leggera, 3–4 = Media, 5 = Totale. Va bene così? *Nel frattempo:* si usa questa regola; il master può cambiare la Copertura nel pannello «Attacca\!».

**A.144 — Creature in mezzo alla linea di tiro: Copertura o bersaglio protetto?** (comprende la A.141) Il §5.10 dice che sparare a un nemico «impegnato in Ravvicinato, protetto da un alleato o che usa un ostaggio» costa −4 VA, con una seconda Prova per vedere se si colpisce chi sta in mezzo. Una creatura fra chi tira e il bersaglio dà anche Copertura (Leggera, Media, Totale come un muro)? Vale anche se è un alleato di chi tira o un neutrale, o una creatura grande che nasconde del tutto il bersaglio? *Nel frattempo:* vale solo il §5.10, come dice il manuale; le creature a terra o a 0 PV non contano.

**A.142 — Fin dove vedono i PG.** Per la nebbia che si apre da sola dove i PG vedono: con luce sufficiente, fino a quanti quadretti? *Nel frattempo:* 30 Q (45 m) con luce sufficiente; in Penombra 6 Q, con Luce scarsa 3 Q, al Buio solo il quadretto accanto (o fin dove arriva una torcia).

**A.143 — Visione notturna e nebbia della mappa.** La Visione notturna (80 Q), la visione termica (40 Q) e la Vista Felina (20 Q) tolgono le penalità di Penombra e Luce molto scarsa entro la loro portata. Sulla mappa devono anche far vedere più lontano al PG che le ha, cioè aprire la nebbia come se ci fosse Luce entro la portata? *Nel frattempo:* no, la nebbia segue solo la luce della zona; le penalità nell’attacco restano quelle della scheda.

-----

## **3. Risposte ricevute, in implementazione**

Le tue risposte sono nella sezione 7. Qui c’è cosa fa l’app finché l’implementazione non è finita; poi la voce passa fra le Risolte.

•             **A.107 — Correzioni retroattive dell’avanzamento.** In implementazione. Nel frattempo l’app vieta ancora la correzione.

•             **A.108 — Punti Abilità liberi in eccesso.** In implementazione. Nel frattempo i punti in eccesso danno l’avviso e si tolgono con «Togli», ma non bloccano ancora la salita di livello.

•             **A.110 — Indossare e togliere protezioni.** In implementazione. Già nell’app: scudo 1 AzP ed elmetto 1 AzP; i tempi di armature, rinforzi, soprabiti e sottogiacca sono registrati e arrivano nella vista delle protezioni con il prossimo aggiornamento.

•             **A.111 — Recuperi di Umanità pregressi.** Regola generale in implementazione (recupero straordinario concesso dal Direttore, oppure «da verificare»). Il caso di Pablo Zaion è ancora aperto nella sezione 2.

•             **A.114 — Chip del Processore e strumenti.** In implementazione. Nel frattempo l’app usa ancora il maggiore fra chip e strumenti.

•             **A.116 — Luce e attività pratiche visive.** In implementazione. Nel frattempo la penalità di luce vale per attacchi, Difese e Percezione visiva.

•             **A.119 — Ammalato.** In implementazione, con le sei intensità. Nel frattempo lo Stato si segna ancora senza effetti. Anche le undici sintesi degli Stati approvate il 05/10 entrano nell’app con lo stesso aggiornamento.

•             **A.122 — Priorità della mappa.** Registrate. Resta aperta la domanda su «Aiuto-master» (sezione 2).

•             **A.124 — Azioni, movimento e diagonali sulla mappa.** Coincide con quello che la mappa già fa (Azioni del manuale, diagonale 1 Q). Passa fra le Risolte quando la mappa è in uso al tavolo.

•             **A.127 — Attraversare i quadretti occupati.** Coincide con quello che la mappa già fa. Passa fra le Risolte quando la mappa è in uso al tavolo.

•             **A.128 — Terreno difficile.** Coincide con quello che la mappa già fa (2 Q per quadretto, anche in diagonale, anche in Corsa e Scatto). Passa fra le Risolte quando la mappa è in uso al tavolo.

-----

## **4. Da correggere nella prossima edizione dei manuali**

Decisioni già prese o errori evidenti: l’app segue la decisione, il testo dice ancora altro. Le voci barrate sono già sistemate nel manuale condiviso.

**Manuale del Giocatore**

•             ~~§1.2.3, §2.11, §2.14: la Prova Salvezza Volontà usa CAR~~ — fatto nel Google Doc (verificato il 26/09).

•             ~~§3.5.2 Esploratore: Specializzazioni dei Talenti a scelta~~ — fatto nel Google Doc (verificato il 26/09).

•             ~~§2.12 e §3.3: al 1° livello sono massimizzati sia i PV sia i PM~~ — fatto nel Google Doc (verificato il 28/09).

•             ~~§2.10, §3.8: «minimo 1» ai «2 + Mod INT incantesimi»~~ — fatto nel Google Doc (verificato il 28/09).

•             §3.5.3 Bersaglio Designato: impaginazione rotta nel PDF.

•             §8.6 Attivazione Tempestiva: sta prima del §8.6.1, fuori da ogni sottosezione.

•             §2.16.3 (Cacciatore) e §2.16.4 (Esploratore): «Il binocolo non richiede batterie.» Nel §2.16.2 (Agente) il testo dice già «Il binocolo non richiede NEC.»: uniformare a «non richiede NEC».

•             §8.6.1 e §1.6: con Successo Magistrale Migliorato il 3 naturale è Magistrale da VA finale 21 (correzione approvata il 02/10, E\&L decisione 3).

**Manuale della Magia**

•             ~~Sez. 1: livello massimo incantesimi = tabella I→3, II→8, III→11, IV→14, V→17, VI→18~~ — fatto nel Google Doc (verificato il 28/09).

•             ~~Armatura Mistica (scheda 22.2): togliere il riferimento alle zone del corpo coperte (A.43)~~ — fatto nel Google Doc (verificato il 28/09).

•             ~~Sez. 1: la frase «con i cinque Talenti liberi ordinari…» come esempio~~ — fatto nel Google Doc (verificato il 26/09).

•             Sez. 1, scheda di Potenziale Mistico Migliorato: manca la riga «Ambito: il Talento è riservato agli Usufruitori di Magia e non si applica all’Addestramento Taumaturgo» della risposta A.2.2. La regola è comunque scritta nel paragrafo «Conoscenza e livello massimo»: solo testo.

**Manuale degli Armamenti**

•             §7.1.9, §7.8, §7.9: «Imperiali» e «Imperial» (§7.4.8, §7.14). L’app usa «Imperial».

•             §7.9: mancano le tabelle prezzi delle armi a distanza di Fratellanza, Imperial e Mishima (i prezzi sono nelle schede del §7.8; le 146 righe presenti coincidono).

•             §7.13.2 / §7.15.3, §7.16.2, §7.17.3: «Articolazione da tiro» e «Articolazione di tiro».

•             §7.16.2 Armatura Ashigaru: «Manutenzione agevolata» è la «Manutenzione semplice» del §7.11.4?

•             §7.11.5: «Agenti equipaggi e Guardie», manca la virgola.

•             §7.4.1 / §7.4.2 Scudo Punisher: «Grande» o «Medio».

•             ~~§7.4.10 Scudo delle Guardie Sacre: con la lama estratta il danno è 1d6+1+1d4 Naturale~~ — fatto nel Google Doc (verificato il 28/09).

•             §7.8, schede di M310 e SA SG2001: indicare che usano un caricatore amovibile specifico e che la sostituzione con un caricatore pronto costa 1 AzP (E\&L 19: «va esplicitata nelle relative schede di catalogo»).

**Manuale dell’Equipaggiamento**

•             §4.1 Comunicatori: «Ogni modello comprende microfono, auricolare, batteria carica, cavo e alimentatore». Dalla 0.5 l’alimentazione è un NEC Verde (compatto per il comunicatore personale, standard per quello da squadra e per la stazione radio), come dice il paragrafo «Alimentazione e riservatezza» dello stesso §4.1. Sostituire «batteria carica» con «NEC Verde carico».

**Manuale dei Mostri**

•             §5.2: dice ancora «5 punti Abilità liberi a ogni Grado»; dopo la A.90 va portato a 7.

**Da rileggere (testi scritti da noi, non dal manuale)**

•             **Talenti nella stampa**: il foglio 2 stampa la prima frase di ogni Talento. Se preferisci un riassunto tuo, si aggiunge un campo.

-----

## **5. Manuali che l’app aspetta**

•             Dal 26/09 i manuali sono Google Doc condivisi: l’app li rilegge a ogni sessione, non servono più i PDF.

•             Manuale degli Armamenti 0.59 e Manuale del Giocatore 0.46: letti il 07/10 (requisiti di Forza, fucili a pallini, Tiro Rapido); le modifiche entrano nell’app a lotti. Restano rimandati dal manuale le Prove Salvezza, i tempi di ricarica e i ricambi del Cuirassier Attila (§7.18.1).

•             Manuale dell’Equipaggiamento: recepiti i capitoli 1, 2, 3, 4 e 6. Aspettiamo i capitoli 5, 7 e 8.

•             Manuale dei Veicoli (in stesura).

•             Manuale del Direttore: regole dettagliate di malattie e cure (A.119).

-----

## **6. Risolte**

Voci con risposta recepita e funzione implementata nell’app (o chiuse). La data è quella dell’implementazione.

•             **Esploratore, Specializzazioni dei Talenti a scelta; «minimo 1» ai 2 + Mod INT incantesimi; quote di Classe per macrofamiglia; incantesimi liberi di qualunque famiglia; tabella del livello massimo degli incantesimi; dadi dei PV e dei PM massimizzati al 1° livello** — risolte e implementate prima del 26/09.

•             **Durata di tre Tecniche Interiori** (Vipera dal Cappuccio, Presa dell’Anima, Contraccolpo Interiore) — implementata il 26/09.

•             **Equipaggiamento iniziale** (E\&L A.5–A.5.31): dotazioni delle 25 Classi, armamenti corporativi di base (Armamenti §7.22), crediti iniziali 1.000 + 2d6 × 100, acquisti con cessione, veicoli esclusi — implementato il 27/09.

•             **PV e PM attuali al passaggio di livello** (§8.1.2, E\&L A.6) — implementata il 27/09.

•             **18 Talenti magici e mistici nuovi del 27/09** — recepiti nell’app il 27/09; la conferma è chiesta in A.32.

•             **Manuale degli Armamenti v0.52 e v0.53** (elmetti §7.21, modelli corporativi di base §7.22, catalogo dei rinforzi §7.23) — recepito il 28/09.

•             **Manuale del Giocatore del 27/09** (Addestramenti a 76 punti, 10 Punti Abilità Liberi) — recepito il 28/09; confermato in A.52.

•             **A.1 — Descrizioni delle Caratteristiche; Prova Salvezza Volontà su CAR** — implementata il 26/09.

•             **A.2 — Schede dei 14 Talenti di magia** (compreso Potenziale Mistico Migliorato solo per gli Usufruitori di Magia) — implementata il 26/09.

•             **A.3 — Tipo di tre Talenti Liberi** (Attivazione Tempestiva, Risorse Interiori, Tecniche Interiori Supplementari: passivi) — implementata il 26/09.

•             **A.7 — Pistola mitragliatrice compatta**: Specializzazione Pistole anche in Raffica Breve e Media — implementata il 28/09.

•             **A.8 — Pugnale e Ascia leggera**: Coltelli e Pugnali / Asce in mischia, Armi da Lancio al lancio, mai cumulate — implementata il 28/09.

•             **A.9 — Famiglie delle 12 armi ravvicinate corporative** e nuova Specializzazione Armi a Sega (Elettrosega CSB600, Chainreaper, Sbudellatrice) — implementata il 28/09.

•             **A.10 — Scudo delle Guardie Sacre**: 1d6+1 con la lama ritratta, 1d6+1+1d4 con la lama estratta; nell’app la lama si estrae e ritrae al tavolo — implementata il 28/09.

•             **A.11 — Specializzazioni delle 16 armi a distanza corporative** (Panzerknacker nei Fucili d’Assalto) — implementata il 28/09.

•             **A.12 — Specializzazioni delle altre armi corporative per analogia**; SA30 a dardi con solo +1 VA (Danno calibrato) — implementata il 28/09.

•             **A.13 — Rainy Dayer** nelle Carabine, solo per il profilo di tiro — implementata il 28/09.

•             **A.14 — Batterie da 5 PM** (Rosso, Blu, Verde Molto rara; Bianco Leggendaria), scala di reperibilità fino a Leggendaria, disponibilità degli Artefatti Mistici — implementata il 28/09. Prezzi aggiornati il 02/10 a 1.000 crediti (Rosso, Blu, Verde) e 5.000 (Bianco), come nell’Armamenti §7.5, nella Magia §24.7 e nell’E\&L del 01/10.

•             **A.16 — Prove fisiche**: lista confermata; le penalità fisiche non toccano Potere né le Salvezze — implementata il 29/09.

•             **A.17 — Terrorizzato anche alle Prove Salvezza** durante lo Stato: risposta nel Manuale del Giocatore del 28/09 (§5.18); l’app già così — chiusa il 29/09.

•             **A.18 — Riserve integrate nelle armi**: alimentano soltanto le funzioni del proprio Artefatto, non pagano Incantesimi e non si prelevano (Magia §24.2 e §24.7, Doc del 01/10); «Lancia\!» non le offre più come fonte di PM — implementata il 02/10.

•             **A.19 — Contenitori Chroma**: acquistato pieno; trovato con i PM impostati dal giocatore — implementata il 29/09.

•             **A.21 — Chroma Viola come fonte di Corruzione passiva**: fasce, frequenza ed esiti nell’app; il frammento si registra nell’inventario senza PM; il conteggio dell’esposizione arriverà insieme a Corruzione e Umanità — implementata il 28/09.

•             **A.22 — Senz’armi 1d4 più il bonus di FOR**; Arti Marziali 1d6; Lottatore il suo dado — implementata il 29/09.

•             **A.23 — Mano non dominante −4** salvo Ambidestro; con due armi solo la penalità della manovra — implementata il 29/09.

•             **A.24 — Incalzare**: Prova per colpire a −4 contro le Difese, spinta 2 Q, nessun danno — implementata il 29/09.

•             **A.25 — Copertura anche nel ravvicinato**: −2 / −4, Copertura Migliorata −4 / −6, Totale impedisce l’attacco — implementata il 29/09.

•             **A.26 — Superiorità numerica**: +1 / +2 / +3 con 3–5 / 6–7 / 8+ attaccanti; campo nel pannello — implementata il 29/09.

•             **A.27 — Spazzata**: bersagli adiacenti fra loro e tutti entro la portata — implementata il 29/09.

•             **A.28 — Sbilanciare e Disarmare**: l’opposizione la sceglie il bersaglio prima del tiro — implementata il 29/09.

•             **A.29 — Magistrale**: bonus ordinari prima del moltiplicatore, quelli dopo l’Armatura no, solo la prima applicazione — implementata il 29/09.

•             **A.30 — Pesi mancanti «da definire»**, totale del carico parziale — implementata il 29/09.

•             **A.31 — Oltre il carico massimo**: Movimento 0 Q e −2 alle Prove fisiche — implementata il 29/09.

•             **A.32** — Confermati i 18 Talenti magici; Potere Mistico +5 PM per acquisizione fino a tre; Potere e Recupero Mistico richiedono una riserva personale; Concentrazione: PS Volontà su CAR, +3 di Concentrazione Migliorata solo per mantenerla; Concentrazione Operativa senza altri lanci, salvo Contromagia e Convertire Potere. *App: già conforme.*

•             **A.33 — Pistole corporative**: HG10, Bolter 10, P500, Nemesis 100, Belliger, Ronin 25 AP; Revolver commerciale — implementata il 29/09.

•             **A.34 — Binocolo e Registratore audiovisivo** con peso e prezzo (Equipaggiamento 0.3 §§4.2–4.3) — implementata il 29/09.

•             **A.34, in parte — Oggetti della dotazione con scheda**: 28 delle 44 voci (dotazione comune, abiti, luci, corredi di orientamento, arrampicata e sopravvivenza, tenda, maschera, comunicatori, ottiche, sorveglianza, ricarica del Kit trauma) prendono peso, prezzo, Qualità, PI ed effetti dalla scheda dell’Equipaggiamento 0.3, anche nei personaggi già salvati; restano aperte 16 voci (sezione 2) — implementata il 29/09.

•             **A.34** — Oggetti delle dotazioni collegati alle schede del catalogo, NEC contati una volta; Qualità, PS e PI approvati per cassetta, attrezzi e corredi; scambio al 100% solo per gli armamenti ammessi. *App: applicata il 05/10.*

•             **A.36** — Bonus degli oggetti solo quando si usano; per la stessa Prova vale il maggiore degli strumenti; valori di binocolo, corredi, abiti eleganti e kit trauma approvati. *App: già conforme.*

•             **A.37 — Ricarica**: doppiette e pompa una cartuccia per operazione (3 con Ricarica Migliorata); M310 e SA SG2001 a caricatore — implementata il 29/09.

•             **A.38** — Sette chiarimenti sull’attacco a distanza (Movimento Tattico e Fluido si sommano, Copertura, seconda Prova a −4, Mira Selettiva, Imbracciare, Bruciapelo Migliorato, Movimento Evasivo). *App: da applicare.*

•             **A.39, punti 1–3** — Anticipazione senza Addestramento (colonna «altri» −2), Colpo Elementale (PS solo per gli effetti secondari, per elemento) — implementata il 29/09. Punto 3, Rigenerazione: procedura completa (Magia sez. 25, E\&L del 01/10): Rituale con Prova di Rituali, PM totali, ore, reagenti e Canali; da Artefatto sintonizzato senza Prove, con i PM dalla riserva Verde o Bianca (§25.4) — implementata il 02/10.

•             **A.40** — Carica fino alla Corsa massima: 3–6 Q −2/−4, da 7 Q −4/−6, danno ×2; tolto il limite di 12 Q. *App: da applicare.*

•             **A.41 — Sbilanciare e Disarmare con l’Abilità del mezzo dichiarato**, non il VA maggiore — implementata il 29/09.

•             **A.42 — Spazzata anche senz’armi**, con Corpo a corpo — implementata il 29/09.

•             **A.43 — AR complessiva** («AR totale, di cui magica»), non per zona del corpo: l’app già così; Magia sez. 7 già corretta nel Google Doc — implementata il 28/09.

•             **A.44 — Armatura, scudo ed elmetto a 0 PI**: niente AR né benefici; lo scudo Rotto non attacca né para; la rottura vale dal colpo successivo — implementata il 28/09.

•             **A.45 — Kit di rinforzo a 0 PI**: perde AR e proprietà, l’armatura sottostante resta com’è, PI separati — implementata il 28/09.

•             **A.46 — Riparazione strutturale** di armi, armature, scudi, elmetti e rinforzi: pulsante «Ripara», 1 ora, Prova di Tecnologia (−2 con strumenti improvvisati), esito scelto dopo il tiro, materiali al 5% del prezzo per PI recuperato tolti dai crediti — implementata il 28/09.

•             **A.47 — Oggetti senza PI**: nessun valore predefinito; campo facoltativo «PI definiti dal Direttore»; sanitari tracciati; esemplari identici raggruppati con «Danneggia uno» — implementata il 28/09.

•             **A.48 — Corazza Potenziata, Aura di Resistenza e Pelle di Rinoceronte si sommano**; Corazza Potenziata solo con una protezione Artefatto; le due Tecniche come interruttori al tavolo — implementata il 28/09. Resta la domanda A.53 sulle armature con AR magica propria.

•             **A.49 — Condizioni delle armi (§5.17)** come stato al tavolo, distinto dai PI: penalità al VA e blocco di «Attacca\!» quando l’arma non è utilizzabile — implementata il 28/09.

•             **A.50 — Ordine delle riduzioni dell’AR** (Perforante, Laser, Incendiato): nei dati dell’app e come promemoria in «Attacca\!» — implementata il 28/09.

•             **A.51 — Categorie di Prove degli Stati**: Percezione tolta da «vista», Assordato come valore a parte, nei promemoria la frase sull’azione esclusivamente visiva o uditiva che fallisce — implementata il 28/09.

•             **A.52 — Addestramenti a 76 punti e 10 Punti Abilità Liberi**: confermati da Davide; nessun cambio alle regole dell’app, l’avviso ai personaggi esistenti lo cita — implementata il 28/09.

•             **A.53** — Corazza Potenziata solo con armatura o scudo classificati come Artefatto e con almeno 1 PI; +1 all’AR una sola volta. *App: già conforme.*

•             **A.54** — Revolver: 1 AzP riempie il tamburo, anche in parte; Ricarica Rapida gratuita una volta per Round. *App: già conforme.*

•             **A.55** — Caratteristica del bonus al danno per Abilità (pesanti: attacco con FOR, danno con INT), tetto +1/+2/+3, prima dei moltiplicatori; granate e razzi esclusi. *App: già conforme.*

•             **A.56** — Basi dalla prima Classe (7/6/5/3, 122 punti), limiti al I Grado 12/9/7/5, 7 punti liberi per Grado. *App: già conforme.*

•             **A.57** — Punti liberi ricostruiti evento per evento, con i limiti del momento; i punti legali non si rimborsano; avanzamento bloccato finché la ricostruzione non è completa. *App: da applicare, dopo A.107 e A.108.*

•             **A.58** — Il +1 di Corporazione resta nel calcolo e torna utile quando il limite sale; i modificatori circostanziali vengono dopo il limite. *App: già conforme.*

•             **A.59** — Depositare un Artefatto non interrompe la Sintonizzazione; una batteria depositata non alimenta. *App: da applicare.*

•             **A.60** — Otto schede; mani registrate; vista rapida delle protezioni; condizioni modificabili anche nella tab Abilità. *App: in parte, il resto dopo A.110.*

•             **A.61 — Capolavoro del Corazzaio**: +1 a una sola Contromisura numerica scelta alla costruzione (Ignifugo, Termico, Isolante, Dissipante, Imbottita, Anticorrosivo); assente vale 1, con valore X diventa X + 1; non aumenta l’AR; Riflettente esclusa. Risposta del 02/10 (E\&L, decisione 4) — implementata il 02/10.

•             **A.62 — Katana Ryūjin**: natura Naturale; attiva 1d8 + 1 + 1d6 con la proprietà Plasma, un solo colpo. Risposta del 02/10 (decisione 15) — implementata il 02/10.

•             **A.63 — Esoscheletri**: NEC Rossi di formato dedicato al modello, con autonomia, ricarica e ricambio della scheda; sostituzione 1 minuto. Risposta del 02/10 (decisione 18) — implementata il 02/10.

•             **A.64 — Moduli IAS**: NEC Blu IAS da 1.000 Lx = 20 cariche da 50 Lx (Power Blink 2); ricambio 1.000 cr, ricarica 50 cr in 1 ora. Risposta del 02/10 (decisione 20) — implementata il 02/10.

•             **A.65 — Dotazioni con più schede**: nuova scheda «Corredo agricolo Standard — Allevamento» (2 kg, 200 cr, CO, +0); strumento musicale acustico o elettronico a scelta, senza sovrapprezzo. Risposta del 02/10 (decisioni 10 e 11) — implementata il 02/10.

•             **A.66 — Corredo da cucina**: 30 minuti per fino a quattro persone, NEC Rosso da 500 Lx, 50 Lx a preparazione. Risposta del 02/10 (decisione 19) — implementata il 02/10.

•             **A.67 — Modulo Blu del Gehemmapuker**: è il Modulo Blu del catalogo NEC, una voce sola; regola generale: niente travaso di energia fra NEC. Risposta del 02/10 (decisione 14) — implementata il 02/10.

•             **A.68 — Interfaccia neurale standard**: 3.500 cr + 2.000 di installazione, 2 UMN, acquistabile. Risposta del 02/10 (decisione 21) — implementata il 02/10.

•             **A.69** — Installazione, rimozione e reinstallazione degli impianti: clinica sicura, tempi, Prova, postazioni, tariffe, legame impianto–perdita–recuperi. *App: da applicare.*

•             **A.70 e A.92** — L’Umanità si recupera solo con una procedura: Riabilitazione a cicli di 7 giorni dopo una rimozione (500 cr e Prova, oppure clinica 1.000 cr per +1), massimo 20. *App: da applicare.*

•             **A.71 — Cartuccia chirurgica**: un solo consumabile, «Cartuccia chirurgica — set sterile monouso», 500 cr o 2.500 per cinque. Risposta del 02/10 (decisione 17) — implementata il 02/10.

•             **A.72** — Anticipazione senza scala leggibile: confluita nella A.109 (sezione 2), che ne riporta l’elenco aggiornato. *Chiusa il 07/10.*

•             **A.73 — Formato dei nemici per il Tavolo del Master** (E\&L del 02/10, decisioni 5–9). Formato con valori già calcolati, comune all’app e al futuro bestiario. Campi nuovi: azioni per Round, Contromisure, Abilità rilevanti con VA, talenti e capacità speciali. Sei Caratteristiche nel bestiario, facoltative nell’app; un valore mancante non vale 0. Parità d’Iniziativa DES → INT → 1d10. I nemici seguono la procedura dei PG per PV, Ferite e Menomazioni, senza Affaticamento. Incantesimi completi con «Lancia\!» e PM scalati; incompleti come promemoria. Passo obbligatorio; Corsa e Scatto 2× e 3× se mancano; «non consentito» è diverso da «mancante». Formato implementato il 02/10 su main; plancia del Tavolo del Master implementata il 02/10 sul branch.

•             **A.74 — Rituale di Rigenerazione**: VA del Canale = Rituali; dopo il Magistrale ripartizione libera entro i limiti; Rituale diretto solo PM personali; versioni per Ritualista. Risposta del 02/10 (decisioni 1, 2, 12, 13) — implementata il 02/10.

•             **A.74 e A.75** — Confermate le risposte su Canali, Rituali, Ritualista e batterie con supporto base. *App: già conforme.*

•             **A.75 — Batterie oltre i 5 PM**: supporto base per tutte (0,2 kg, Comune, PS 10, 3 PI), anche Matrice. Risposta del 02/10 (decisione 16; Equipaggiamento §10.1) — implementata il 02/10.

•             **A.76** — Sanguinante: perdita iniziale una volta per attacco se almeno 1 danno supera l’AR; poi all’INI della fonte; fra più sanguinamenti vale il maggiore. *App: quasi conforme.*

•             **A.77** — Perforante riduce l’AR non magica totale a ogni applicazione di danno, senza erosione. *App: già conforme.*

•             **A.78 — Attacco con VA finale 20 o più**: gli attacchi e le Difese attive si tirano anche con VA finale 20 o più (salvo le eccezioni esplicite, come Colpo Elementale); Magistrale con 1 a VA 20 e con 1–2 da VA 21; con Successo Magistrale Migliorato 1–2 a VA 20 e 1–3 da VA 21; il 20 resta Maldestro. Le altre Prove seguono il §1.7. Risposta del 02/10 (E\&L, decisione 3) — implementata il 02/10.

•             **A.79** — Umani costruiti come PG (livelli 2/5/8, media del dado arrotondata per eccesso, 7 punti); le etichette non danno PV, danni o Azioni; Eretico senza poteri oscuri. *App: da applicare.*

•             **A.80** — Si indossano da soli soprabiti, mantelli, Tabardo consacrato e Sottogiacca IES, con il profilo autonomo AR 1, Leggera, FOR 3 e le proprietà della scheda; su un’armatura compatibile valgono come rinforzo; togliendo l’armatura un rinforzo strutturale resta montato senza effetto. *Implementata il 03/10.*

•             **A.81** — Pelle di Rinoceronte: +3 solo nelle Prove di Immobilizzare, Sbilanciare, Disarmare e Incalzare, e ad Atletica per uno sforzo di forza; mai a Difese o all’Abilità dell’arma. *Implementata il 03/10.*

•             **A.82** — Onda Interiore: dado della Disciplina e del Grado più il bonus di SAG (tetti +1/+2/+3), non FOR; il +2 Ravvicinato di Pelle di Rinoceronte non si applica. *Implementata il 03/10.*

•             **A.83** — REP Epica: ricerca con Oratoria −6, se il Direttore ammette una possibilità concreta; Batterie Matrice colorate Epiche, Bianche Leggendarie. *Implementata il 03/10.*

•             **A.84** — Regime di lancio dei nemici (Taumaturgo, altro utilizzatore, capacità specifica) con le due colonne di modificatori. *App: da applicare.*

•             **A.85** — Bonus di SAG al danno magico: calcolato per gli umani, dichiarato nel profilo per le creature, mai due volte. *App: da applicare.*

•             **A.86** — Granate e razzi: danno completo della munizione, senza bonus di Caratteristica. *Implementata il 03/10.*

•             **A.87** — Artefatti del gruppo già assegnati nei file dei PG, niente deposito comune: Lucas ha Guanti, Pietra, una Batteria Matrice e due Schegge; Dimitri Orlav una Batteria Matrice e due Schegge. *App: nessuna modifica (residui: A.112).*

•             **A.88** — Individuare a Concentrazione: 10 min / 30 min / 1 h / 2 h / 4 h per le versioni 6–8 / 9–11 / 12–14 / 15–17 / 18. *Implementata il 03/10.*

•             **A.90 — Punti Abilità liberi**: vale il Manuale del Giocatore del 03/10 sera, 7 punti alla creazione e a ogni Grado (livelli 4, 8, 12, 16, 20); l’E\&L con 5 è superato. Chi ne ha assegnati 5 per Grado ha 2 punti da assegnare per evento («Assegna»); chi ne ha 10 ne ha 3 in eccesso per evento («Togli»). Nessun punto cambia da solo — implementata il 04/10.

•             **A.91** — Scheda unica del veicolo condivisa fra PG e Tavolo, proprietario distinto dal conducente. *App: da applicare (registro sul server).*

•             **A.93** — Corpi cyborg completi non disponibili ai PG. *App: già conforme.*

•             **A.94** — Interfaccia SIN: standard 5.500 cr e 2 UMN, CYBERTRONIC 7.000 cr e 1 UMN. *App: già conforme.*

•             **A.95, A.96 e A.97** — Via il −2 per il volo e il +2 per la taglia; Boss solo come etichetta; calibrazione solo come «Stima sperimentale, da verificare al tavolo», senza costo universale dei moduli. *App: da applicare.*

•             **A.98** — Rune e Tatuaggi: sviluppo futuro, nessuna sezione nell’app. *App: da togliere la sezione vuota.*

•             **A.99** — Prevale la decisione approvata più recente; il Prontuario è solo un riassunto. *App: nessun codice.*

•             **A.101** — ASA Scout MK4 approvato (valore 202.520 cr, M606, copriruote, energia, aria, riparazioni, dotazione sanitaria). *App: applicata il 05/10.*

•             **A.102** — Autovettura civile: REP Comune. *App: applicata il 05/10.*

•             **A.103** — Esempio del §4.3 generico; lo Scout resta Corazzato 1. *App: applicata il 05/10.*

•             **A.104** — Per le collisioni conta l’andatura attuale, distinta da quella scelta per dopo. *App: applicata il 05/10.*

•             **A.105** — Veicolo nel Tavolo del Master: si muove all’INI del conducente, senza INI propria. *App: da applicare, dopo A.91.*

•             **A.106** — Penombra −2, luce molto scarsa −4, buio come Accecato; Visione notturna e Visione Perfetta con i loro limiti. *App: da applicare.*

•             **A.120** — Bonus e malus temporanei di COS e SAG non cambiano i PV e i PM massimi né quelli attuali; valgono per le Prove e i bonus pertinenti. *App: era già così; confermata il 07/10.*

•             **A.121** — Riuso del codice della tua app per la mappa: domanda ritirata, la mappa è scritta da zero. *Ritirata il 06/10.*

•             **A.123 — Iniziativa sulla mappa**: vale il Manuale del Giocatore (Mod DES + Mod INT + 1d10; parità per DES, poi INT, poi scelta fra alleati o 1d10 fra avversari); il d12 della tua app è del sistema precedente — deciso il 06/10.

•             **A.125** — Porte e illuminazione: risposta del 06/10 applicata alla mappa il 07/10. Veicoli: si muovono sulla mappa all’Iniziativa del conducente, come nella plancia (A.105) — *risposta di Marcello del 07/10 (decisione del gruppo, puoi rivederla)*; si applicherà quando i veicoli arriveranno sulla mappa. Vecchie etichette numeriche delle luci: superate dal sistema semplice (Luce, Penombra, Luce scarsa, Buio, zone a pennello e torce sui token) — *decisione di Marcello del 07/10*.

•             **A.129** — Movimento diviso: solo il Passo si divide in più movimenti; Corsa e Scatto sono un blocco unico, il token si muove una volta sola e i Q non usati si perdono. *Applicata alla mappa il 07/10.* Resta un caso, chiesto nella A.136.

•             **A.131** — Immagine dei nemici sulle pedine: campo facoltativo nella scheda del nemico, valido per tutte le copie; senza immagine la pedina mostra le iniziali. Scelta tecnica dell’app, non una regola. *Implementata il 06/10.*

•             **A.132** — Stordito e Attacchi di Opportunità: no, uno Stordito non fa Attacchi di Opportunità, come chi è Svenuto o a 0 PV; la sua zona di controllo non dà l’avviso (sulla mappa il master la vede tratteggiata, i giocatori non la vedono). *Risposta di Marcello del 07/10 (decisione del gruppo, puoi rivederla); applicata alla mappa il 07/10.*

•             **A.134** — Diagonale rasente allo spigolo di un muro: sì, se uno dei due quadretti ai lati è libero; se sono murati entrambi (passaggio chiuso a spigolo) la diagonale resta vietata. Le porte chiuse o bloccate contano come muri. *Risposta di Marcello del 07/10 (decisione del gruppo, puoi rivederla); applicata alla mappa il 07/10.*

•             **A.141** — Personaggi in mezzo alla linea di tiro: confluita nella A.144 (sezione 2). *Chiusa il 07/10.*

-----

## **7. Risposte di Davide**

Scrivi qui, in coda, una risposta per blocco: numero della domanda, data, testo. Va bene anche rispondere nel Doc E\&L.  
 Le risposte qui sotto sono riportate dal documento «Per Davide» del 28/09, che non si usa più.  
 **A.7 (Pistola mitragliatrice compatta).** Appartiene alla famiglia Pistole ai fini delle Specializzazioni. Specializzazione Pistole concede +1 VA e +1 danno anche usando Raffica Breve o Media. Specializzazione Mitragliatori non si applica a questo modello. L’Abilità utilizzata rimane Armi leggere in tutte le modalità di fuoco; la raffica non cambia la famiglia dell’arma. Nell’app il profilo deve quindi essere associato a Pistole, senza passare a Mitragliatori quando viene selezionata una raffica. Riferimenti: Manuale degli Armamenti, §7.7; Manuale del Giocatore, §8.8.1.  
 **A.8 (Pugnale e Ascia leggera, uso ravvicinato e lancio).** La Specializzazione applicabile dipende dall’impiego. Per il Pugnale si applica Coltelli e Pugnali nell’uso ravvicinato e Armi da Lancio quando viene lanciato. Per l’Ascia leggera si applica Asce nell’uso ravvicinato e Armi da Lancio quando viene lanciata. Al lancio si usa l’Abilità Armi da lancio; possedere la Specializzazione Armi da Lancio concede +1 VA e +1 danno. Coltelli e Pugnali e Asce concedono i rispettivi benefici soltanto nell’impiego ravvicinato. Anche possedendo entrambe le Specializzazioni pertinenti all’oggetto, si applica soltanto quella relativa all’attacco effettuato, senza cumulo né scelta alternativa. Le Abilità dei profili ravvicinati restano quelle indicate nelle schede. Riferimenti: Manuale degli Armamenti, §§7.1.1 e 7.7; Manuale del Giocatore, §8.8.1.  
 **A.9 (famiglie delle 12 armi ravvicinate corporative).** Katana, Wakizashi, Lama Mushashi e Lama Demontooth appartengono a Spade; Kriss a Coltelli e Pugnali; Nunchaku, Nunchaku elettrificato e Catena chiodata ad Armi Flessibili; Bordone Templare a Mazze e Bastoni; Elettrosega CSB600, Chainreaper e Sbudellatrice alla nuova famiglia Armi a Sega.  
 Si aggiunge Specializzazione Armi a Sega all’elenco del Manuale del Giocatore, §8.8.1, con il normale beneficio di +1 VA e +1 danno. La classificazione ai fini della Specializzazione non modifica l’Abilità prevista dalla scheda di ciascuna arma. Per esempio, Katana utilizza Armi da guerra e Wakizashi Armi da mischia, pur appartenendo entrambe a Spade. Nell’app le dodici armi devono essere associate alle famiglie indicate e Armi a Sega deve diventare una Specializzazione selezionabile. Riferimenti: Manuale degli Armamenti, §7.1.9; Manuale del Giocatore, §8.8.1.  
 **A.10 (Scudo delle Guardie Sacre).** Il danno base è 1d6+1 Naturale con lama ritratta e 1d6+1+1d4 Naturale con lama estratta. Si conferma il valore del §7.1.9 e si deve correggere il §7.4.10, dove manca il +1. La lama aggiunge 1d4 al danno base dello Scudo. È un unico colpo: si sommano dadi e bonus pertinenti e si applica l’Armatura una sola volta. Estrarre o ritrarre la lama costa 1 Azione Principale; il suo utilizzo non consuma PM e non richiede Sintonizzazione. La lama resta indipendente dall’attivazione di Scudo Magico. Nell’app devono comparire i due profili di danno corretti, secondo lo stato della lama. Riferimenti: Manuale degli Armamenti, §§7.1.9 e 7.4.10.  
 **A.11 (Specializzazioni delle 16 armi a distanza corporative, §7.8, riferite al profilo principale dell’arma).****  
** Fucili di Precisione: Eruptor, Mefisto, Archer, Assailant.  
 Fucili d’Assalto: M50, AR3000, Volcano, Invader, Shogun, Panzerknacker.  
 Mitragliatori: Justifier, Purifier.  
 Carabine: Mandible, Interceptor, Airbrush, Windrider N4.  
 Il Panzerknacker va quindi nei Fucili d’Assalto, anziché nelle Carabine: il suo profilo ha danno 1d6+2, FOR 5, gittata massima 100 Q e modalità di fuoco corrispondenti a quelle del M50.  
 I moduli integrati mantengono la propria Specializzazione: Lanciagranate per il modulo del Volcano e Lanciafiamme per quello dell’Eruptor. L’Abilità richiesta rimane quella del profilo: Armi medie per i fucili e le carabine qui elencati, Armi pesanti per Justifier e Purifier. La Specializzazione pertinente conferisce il normale +1 al VA e +1 al danno (§8.8.1).  
 **A.12 (Specializzazioni delle altre armi corporative per analogia con le famiglie del §7.7).** Le pistole e le pistole mitragliatrici corporative appartengono alla Specializzazione Pistole: per esempio MP105, P1000 e Nemesis 210. Le armi pesanti automatiche appartengono a Mitragliatori: per esempio MG40, Deathlock Drum, Kensai e Nimrod Autocannon. Le armi a distanza al plasma appartengono ad Armi al Plasma: per esempio Hellblazer e Plasma Intruder.  
 Hellblazer usa esclusivamente la Specializzazione Armi al Plasma, pur richiedendo l’Abilità Armi leggere. MP105 GW e Nemesis 21 sono invece Carabine, distinte dalle rispettive pistole. Lanciafiamme, lanciarazzi e moduli integrati mantengono la propria Specializzazione.  
 La SA30 a dardi rientra nelle Pistole: la Specializzazione conferisce +1 al VA, ma la regola Danno calibrato esclude il bonus al danno. Negli altri casi si applicano normalmente +1 al VA e +1 al danno, mantenendo l’Abilità indicata nel profilo dell’arma.  
 **A.14 (disponibilità degli Artefatti Mistici).** Gli Artefatti Mistici sono generalmente pochi e non commercializzati; non esistono normali negozi che li vendano. La Fratellanza è l’unica a produrne in quantità, ma non li commercializza al di fuori della propria congrega. Bauhaus, Imperiali e Mishima ne producono quantità molto inferiori. Nei sistemi esterni, poco controllati dall’Imperium, si può trovare qualche Tecnomistico indipendente che li produce e li vende a prezzi elevati.  
 **A.14 (profili delle batterie da 5 PM).** Chroma Rosso, Blu e Verde hanno ciascuno reperibilità Molto rara e valore indicativo di 10.000 crediti. Il Chroma Bianco, universale, ha reperibilità Leggendaria e valore indicativo di 50.000 crediti. Tutti e quattro i profili hanno capacità 5 PM, Qualità costruttiva Comune, PS Integrità 10, PI massimi 3 e peso 0,2 kg. Le batterie acquistate sono cariche, 5/5 PM, secondo A.19; restano le regole già previste per utilizzo e ricarica.  
 La scala di reperibilità viene estesa a Comune, Non comune, Rara, Molto rara, Leggendaria. Leggendaria è superiore a Molto rara ed è riservata a disponibilità eccezionali introdotte dal Direttore di Gioco. Questi valori economici sono riferimenti per eventuali scambi, non un listino che garantisce l’acquisto. Deve prima esistere un produttore o possessore disposto a cedere l’oggetto; una Prova di Oratoria, da sola, non crea questa disponibilità. Valgono i vincoli di produzione e circolazione indicati sopra.  
 La reperibilità resta distinta dalla potenza mistica e dalla Qualità costruttiva. Per le batterie da 5 PM Rosse, Blu e Verdi la potenza mistica resta Comune e il costo di Sintonizzazione 1 punto; per quelle Bianche la potenza resta Non comune e il costo di Sintonizzazione 2 punti. La reperibilità Leggendaria non porta il costo a 6 punti. I precedenti prezzi di 500 e 1.000 crediti e le reperibilità Non comune e Rara sono sostituiti dai valori approvati. A.14 è risolta.  
 **A.21 (Chroma Viola e Corruzione passiva).** Il Chroma Viola è saturo di Energia Oscura e la sola vicinanza corrompe l’essere umano. Non è reperibile in commercio. Va trattato come una fonte di Corruzione passiva, non come una normale batteria o un oggetto inerte; la precedente soluzione provvisoria non è adottata.  
 La frequenza della PS di Magia è una ogni ora in tutte le fasce, compreso il contatto diretto. Contatto diretto: esposizione Intensa, −2 alla PS, Intensità 2 Stati. Entro 1 Q senza contatto diretto: Normale, modificatore 0, Intensità 1 Stato. Oltre 1 Q e fino a 6 Q: Debole, +2 alla PS, Intensità 1 Stato. Oltre 6 Q e fino a 12 Q per un frammento trasportabile: +4 alla PS, Intensità 1 Stato; questa combinazione è denominata Flebile nella scala del Manuale del Giocatore, §5.20.1. Sono superati gli intervalli precedentemente proposti di 10 minuti e 1 minuto.  
 Si applicano i normali esiti della Corruzione (§5.20.1): Successo, nessun peggioramento; Fallimento, peggioramento pari all’Intensità; Fallimento Maldestro, peggioramento pari all’Intensità più 1 Stato; Successo Magistrale, nessun peggioramento e +4 alla prossima PS di Magia contro Corruzione nella stessa Scena, per una sola Prova. Restano i modificatori pertinenti, comprese le penalità da CROS e Umanità.  
 Raggio approvato: per un frammento trasportabile di Chroma Viola l’aura di Corruzione passiva si estende fino a 12 Q (18 metri), inclusi. Oltre questo limite il frammento non provoca esposizione passiva. Cristalli grandi e giacimenti hanno un raggio specificato dal Direttore di Gioco.  
 Tempi approvati: la prima PS di Magia si effettua dopo un’ora complessiva di esposizione; segue una PS per ogni ulteriore ora di esposizione. Fuori dall’aura il conteggio si sospende, senza azzerare i minuti già accumulati. Cambiare distanza non provoca PS aggiuntive. Alla scadenza si usa il modificatore e l’Intensità della fascia più grave raggiunta durante quell’ora di esposizione, quindi inizia il nuovo intervallo orario. Un contatto brevissimo, da solo, non impone una PS immediata, ma contribuisce al tempo accumulato e alla gravità della prossima prova. Esempio: 10 minuti a contatto e 50 minuti a 8 Q richiedono una sola PS contro esposizione Intensa, −2 alla PS e Intensità 2 Stati.  
 A.21: definita la gestione della Corruzione passiva del Chroma Viola. La registrazione come oggetto inerte è superata; le regole per impiegarne l’Energia Oscura restano da sviluppare.  
 *Risposte scritte da Davide il 28/09 nel documento «Per Davide — aggiornato 28/09» (che non si usa più), riportate qui.**  
* **Risposta A.52** — Chiarimento delle decisioni già approvate il 27/09/2026 e recepite nel Manuale del Giocatore v0.43.  
 La versione operativa per la prova approvata è quella con 76 punti base per ciascun Addestramento: 8 Abilità con base 4, 12 con base 3 e 4 con base 2, per un totale di 24 Abilità. Sostituisce la precedente distribuzione da 56 punti. L’adozione della nuova distribuzione non costituisce una verifica definitiva dell’equilibrio di gioco.  
 I Punti Abilità Liberi sono 10 alla creazione e altri 10 ai livelli 4, 8, 12, 16 e 20: 60 complessivi. I 10 della creazione sono già quelli del 1° livello e non si assegnano due volte.  
 I limiti di Avanzamento nella stessa Abilità restano: livelli 1–3 massimo 3; livelli 4–7 massimo 4; livelli 8–11 massimo 5; livelli 12–15 massimo 6; livelli 16–19 massimo 7; livello 20 massimo 8.  
 Il limite comprende sia i punti fissi di Classe sia i punti liberi. Si assegnano prima i punti di Classe e poi quelli liberi; resta il requisito di VA almeno 1 prima dell’assegnazione dei punti liberi. I punti di Avanzamento non modificano il Valore Base Addestramento né il bonus della Corporazione.  
 Dieci punti liberi complessivi sono compatibili con il limite iniziale 3, perché vengono distribuiti fra più Abilità. Per esempio, un’Abilità che riceve +1 dalla Classe può ricevere fino a +2 dai punti liberi, raggiungendo Avanzamento 3.  
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
 Corazza Potenziata conferisce +1 AR magica personale, una sola volta quando sono soddisfatti i requisiti di equipaggiamento del talento: utilizzare contemporaneamente armatura e scudo non raddoppia il beneficio. Aura di Resistenza conferisce +1 AR magica per 3 Round. Pelle di Rinoceronte conferisce +1 AR non magica per 3 Round, applicabile soltanto contro gli attacchi ravvicinati di natura Naturale o Magica; non protegge dai danni Eterei.  
 Con tutti e tre i benefici attivi e applicabili, l’incremento complessivo è +3 AR contro gli attacchi ravvicinati Naturali o Magici; +2 AR contro gli altri attacchi Naturali o Magici; +2 AR magica contro gli attacchi Eterei. Restano ferme le eventuali eccezioni specifiche delle singole protezioni e degli attacchi.  
 Ripetere la medesima Tecnica non ne cumula il bonus. I requisiti di equipaggiamento di Corazza Potenziata sono definiti nella parte 2 della A.48, riportata di seguito.  
 **Risposta approvata — A.48, parte 2**: requisiti di Corazza Potenziata.  
 Corazza Potenziata richiede una protezione classificata come Artefatto Mistico o TecnoMistico: il requisito si applica sia all’armatura sia allo scudo. Il Tecnomante con questo talento ottiene +1 AR magica quando indossa un’armatura oppure impugna uno scudo di tale natura, utilizzabile e con almeno 1 PI. Questa definizione sostituisce l’interpretazione provvisoria che concedeva il beneficio con qualsiasi armatura.  
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
 Esempio: AR totale 7, di cui 2 magica, contro Perforante 2 e Laser. Perforante riduce da 5 a 3 la componente non magica: rimangono 5 AR complessivi. Laser dimezza 5 per difetto, lasciando AR finale 2. Con Riflettente applicabile, l’AR finale rimane 5.  
 Contro un colpo Etereo si considera soltanto la componente magica: Perforante non la riduce, mentre Laser la dimezza normalmente, salvo Riflettente applicabile.  
 **Risposta approvata — A.50, parte 2**: Perforante e protezioni degli incantesimi.  
 Perforante considera la natura dell’AR indicata nella scheda della protezione, indipendentemente dalla sua origine magica. Riduce quindi l’AR Naturale di Pelle Corazzata e di Scudo (incantesimo); non riduce l’AR Magica di Armatura di Forza.  
 La riduzione si applica una sola volta al totale dell’AR non magica pertinente a ciascun colpo, fino a un minimo di 0, e non separatamente a ciascuna protezione. Un’eventuale componente magica compatibile rimane interamente applicabile rispetto a Perforante.  
 Esempio: Pelle Corazzata 3 e Scudo 2 forniscono complessivamente AR Naturale 5. Contro Perforante 2 rimangono 3 AR.  
 **Risposta approvata — A.50, parte 3**: Incendiato e Armatura.  
 Il danno dello stato Incendiato ignora l’AR non magica generica, comprese le protezioni di Pelle Corazzata e Scudo (incantesimo). L’AR magica pertinente rimane applicabile e riduce ciascun 1d4 dello Stato, sia immediato sia nei Round successivi, fino a un minimo di 0.  
 Le protezioni specifiche contro il Fuoco funzionano secondo la propria descrizione: Armatura Elementale contro il Fuoco protegge anche nelle versioni con AR Naturale.  
 Ignifugo X non si sottrae al danno e non riduce direttamente i PV persi. Mantiene la funzione di Contromisura che può impedire l’applicazione dello Stato, alle condizioni già previste.  
 Esempio: con AR totale 6, di cui 2 magica, un risultato di 3 sul d4 di Incendiato provoca 1 danno ai PV.  
 Assorbire interamente il danno non spegne le fiamme e non elimina il −2 VA dello Stato. Quattro punti di AR magica pertinente possono annullare il normale 1d4, ma Incendiato deve comunque terminare o essere spento.  
 **Risposta approvata A.13** — Rainy Dayer (§7.14.6): il profilo di tiro appartiene alla Specializzazione Carabine, che conferisce +1 al VA e +1 al danno. L’Abilità utilizzata rimane Armi medie; il tiro richiede due mani sia con l’ombrello aperto sia con l’ombrello chiuso, con gittata massima di 30 Q.  
 La funzione difensiva segue le regole già presenti: aperta, la Rainy Dayer fornisce AR +1 e permette la Parata con Difese. La Specializzazione Carabine riguarda il tiro e non aumenta questa protezione.

### **Allineamento delle risposte approvate — regole tecniche e Stati**

Aggiornamento del ott 6, 2026  
 Fonte delle decisioni:[ E\&L – Risposte e correzioni approvate  
](https://docs.google.com/document/d/1VaqZaAe4NK5P8A956Eahua_ZT60eh3ohnR2xSqh-tVs/edit) Questo aggiornamento riporta le risposte approvate già registrate nel documento E\&L: 14 quesiti tecnici e le sintesi degli undici Stati, con Ammalato disciplinato dalla A.119. Non introduce nuove decisioni.  
 Stato delle risposte: A.107, A.108, A.110, A.114, A.116, A.119, A.120, A.124, A.127, A.128 e A.129 sono definite nei limiti esplicitati; A.111, A.122 e A.125 hanno ancora dati o sottopunti da chiarire, indicati in fondo. Le regole dettagliate delle malattie restano destinate al Manuale del Direttore.  
 «Risposta approvata» non significa «implementata nell’app». Le domande originali e le annotazioni del collaboratore sono conservate: le ipotesi «Nel frattempo» corrispondenti sono superate dalle risposte riportate qui. Il passaggio alla sezione 6 richiede la verifica del recepimento nell’app.

#### **A.107 — Correzioni retroattive dell’avanzamento**

Approvato il ott 5, 2026  
 È consentito correggere un evento precedente dell’avanzamento. L’app ricalcola in ordine cronologico tutti gli eventi successivi.  
 Se, nella cronologia corretta, un punto libero assegnato successivamente non produce più un incremento valido del VA al momento della sua assegnazione, quel punto va riassegnato nello stesso avanzamento originario, rispettando i limiti applicabili allora. Le altre assegnazioni ancora valide restano invariate.  
 La salita a nuovi livelli resta bloccata finché la ricostruzione e le riassegnazioni necessarie non sono completate.  
 Questa regola riguarda la correzione della cronologia: un punto legittimo quando assegnato non viene restituito soltanto perché un successivo aumento automatico di Caratteristica o Classe supera legittimamente il limite.

#### **A.108 — Punti Abilità liberi in eccesso**

Approvato il ott 5, 2026  
 Si confermano 7 Punti Abilità liberi a ogni Grado, compreso il primo. I punti residui della precedente assegnazione di 10 per Grado devono essere eliminati e bloccano ulteriori passaggi di livello finché la scheda non è riconciliata.  
 Quando l’eccesso è stato speso, il giocatore sceglie quali assegnazioni rimuovere; l’app non cancella arbitrariamente punti da un’Abilità. I punti eccedenti sono eliminati, non riassegnati. La cronologia viene poi ricalcolata secondo A.107.  
 Esempi: se sono stati spesi 10 punti dove ne spettavano 7, occorre rimuovere 3 punti dalle assegnazioni; se sono stati spesi 7 punti e ne restano 3 non assegnati, si eliminano quei 3 senza modificare le Abilità.

#### **A.110 — Indossare e togliere protezioni**

Approvato il ott 5, 2026  
 «Combattimento con armatura» indica la gestione delle protezioni nella vista di Combattimento dell’app, non una nuova manovra o modalità di combattimento.  
 Scudo accessibile: prepararlo e impugnarlo costa 1 AzP; riporlo costa 1 AzP. Occupa la mano richiesta dalla scheda.  
 Elmetto accessibile: indossarlo costa 1 AzP e toglierlo costa 1 AzP; occorrono entrambe le mani libere. Connessioni e procedure speciali seguono la rispettiva scheda.  
 Armatura leggera: indossare 1 minuto; togliere 1 minuto.  
 Armatura media: indossare 5 minuti; togliere 1 minuto.  
 Armatura pesante: indossare 10 minuti; togliere 5 minuti.  
 I tempi delle armature sono per un personaggio che opera da solo, con entrambe le mani libere e la protezione accessibile. Normalmente non occorre una Prova. I benefici si applicano quando l’armatura è interamente indossata e fissata. Le procedure specifiche, comprese quelle delle protezioni servoassistite, prevalgono.  
 Soprabiti, mantelli e Tabardo consacrato: indossare 1 AzP; togliere 1 AzP. Richiedono accessibilità, fissaggio ed entrambe le mani libere. Con un’armatura compatibile è sufficiente indossarli e fissarli: non si aggiunge un ulteriore montaggio.  
 Sottogiacca protettiva IES: indossare 1 AzP; togliere 1 AzP, con entrambe le mani libere. Se un’armatura impedisce di accedere alla sottogiacca, va prima rimossa.  
 Rinforzo strutturale leggero: montare 1 minuto; smontare 1 minuto.  
 Rinforzo strutturale pesante: montare 5 minuti; smontare 5 minuti.  
 Il montaggio o smontaggio dei rinforzi strutturali avviene sull’armatura tolta, con gli strumenti appropriati. Su componenti integri e compatibili non richiede normalmente una Prova, salvo la scheda. I tempi per togliere e rimettere l’armatura si conteggiano separatamente. Un rinforzo già montato non aggiunge tempo al normale indossare o togliere l’armatura.  
 Restano il limite di un rinforzo, le compatibilità, i profili autonomi della A.80 e le eccezioni espresse delle schede.

#### **A.111 — Recuperi di Umanità pregressi e impianti rimossi**

Approvato il ott 5, 2026  
 I recuperi pregressi realmente concessi e confermati dal Direttore restano validi e inclusi nel calcolo, anche se non derivano dalla rimozione di un impianto. Si registrano come «Recupero straordinario di Umanità — concessione del Direttore», distintamente dalla riabilitazione ordinaria.  
 Dopo la conferma, l’avviso di verifica è sostituito da una nota nello storico. Non si inventa una rimozione per giustificare il recupero e lo stesso beneficio non può essere conteggiato due volte.  
 I recuperi di provenienza incerta restano «da verificare» e conservati nel calcolo, senza modifiche automatiche; il totale di UMN è indicato come provvisorio fino alla verifica. Il Direttore controlla causa e procedura: se il recupero è valido si completa lo storico; se è errato si annulla il beneficio e si ricalcola UMN conservando traccia della correzione.  
 L’assenza di un impianto dall’inventario non prova una rimozione chirurgica e non restituisce automaticamente UMN. Le concessioni straordinarie pregresse non autorizzano l’app ad assegnare nuovi recuperi automatici fuori dalla procedura ordinaria.  
 La conferma generale non risolve il caso fattuale di Pablo Zaion: resta da verificare perché l’Interfaccia neurale, associata alla perdita di 2 UMN, non compare più nell’inventario.

#### **A.114 — Chip del Processore e strumenti**

Approvato il ott 5, 2026  
 Il bonus pertinente di un chip del Processore si somma al modificatore degli strumenti. Il chip non è un secondo modificatore degli strumenti.  
 Si applica comunque un solo modificatore complessivo degli strumenti, secondo §1.4.1. Il chip non sostituisce strumenti, materiali, requisiti o Talenti necessari. Benefici tecnologici equivalenti a quello del chip non si sommano, secondo Equipaggiamento §7.1.  
 Esempio: Medicina 10, chip di assistenza +2 e Kit trauma Professionale +2 producono VA 14 quando tutti i benefici sono pertinenti.  
 Restano i limiti ordinari del Processore: un chip attivo, durata 30 minuti e una attivazione ogni 24 ore; nessun beneficio ad attacchi, Difese, manovre di combattimento o prove di magia. È superata l’ipotesi provvisoria dell’app che applicava soltanto il maggiore tra chip e strumenti.

#### **A.116 — Luce e attività pratiche che richiedono visione**

Approvato il ott 5, 2026  
 La penalità dipende dall’impiego concreto, non dal nome dell’Abilità o dalla Caratteristica scelta. Non si applica indistintamente a tutte le prove di una stessa Abilità.  
 Esempi pertinenti: Pilotare quando occorre vedere percorso e comandi; Tecnologia per esaminare o lavorare su componenti; Medicina per esami e interventi visivi; Scienza per osservare campioni o leggere misure; Sopravvivenza per seguire tracce visibili o orientarsi a vista; Atletica per ostacoli e appigli da individuare.  
 Richiamare conoscenze, ascoltare o svolgere attività che non richiedono la vista non riceve automaticamente la penalità. Restano i limiti della A.106: non si estende automaticamente a Potere o alle Prove Salvezza.  
 Si applicano −2 in penombra, −4 con luce molto scarsa e gli effetti sensoriali di Accecato nel buio totale: −8 per ciò che resta possibile, impossibilità per attività esclusivamente visive.  
 L’app deve poter qualificare il singolo uso come «richiede la vista», con correzione del Direttore. Il modificatore si applica una sola volta, dopo aver considerato illuminazione effettiva e capacità visive, senza duplicarlo con la medesima penalità già applicata alla prova.

#### **Stati — Sintesi operative approvate per l’app**

Approvato il ott 5, 2026  
 Sono approvate le seguenti sintesi degli undici Stati del Manuale del Giocatore, §§5.5, 5.15 e 5.18. Sono testi operativi ricostruiti dal manuale e approvati uno alla volta: non è stato possibile confrontarli con le undici righe originarie dell’app, non disponibili.  
 Il precedente promemoria che indicava le sintesi ancora da approvare è superato da questo blocco. Ammalato è disciplinato separatamente dalla nuova A.119 riportata oltre.

#### **Stato 1/11 — A Terra**

−4 VA agli attacchi ravvicinati, alle Difese e alle prove che richiedono equilibrio. La penalità non si estende automaticamente a tutte le attività fisiche.  
 Può usare attacchi a distanza senza penalità propria dello Stato, se la posizione lo consente.  
 Chi lo attacca ottiene +2 VA in Ravvicinato e subisce −2 VA a Distanza. Nessun modificatore per gli attacchi ad Area.  
 Non può Correre o Scattare; può strisciare di 3 Q con un’AzM. Buttarsi a terra o rialzarsi richiede un’AzM oppure un’AzP.  
 Dura finché si rialza: non si applica la durata generica di 1+1d3 Round.

#### **Stato 2/11 — Accecato**

−8 VA alle prove che richiedono la vista, compresi attacchi e Difese contro avversari non percepiti. Le attività esclusivamente visive falliscono automaticamente.  
 Non può effettuare Tiro Mirato o Colpo Mirato. Può attaccare soltanto conoscendo almeno la posizione approssimativa del bersaglio.  
 Gli avversari che non riesce a percepire ottengono +4 VA contro di lui. Le attività basate soltanto su altri sensi disponibili non ricevono automaticamente la penalità; sensi speciali, Talenti e strumenti seguono le proprie regole.  
 Durata ordinaria 1+1d3 Round, salvo la fonte. Solo quando la fonte consente una PS Riflessi, il successo dimezza la durata per eccesso; il fallimento conserva la durata intera.  
 Quando l’impossibilità di vedere dipende dal buio totale, dura finché permane la condizione ambientale: non si tira una durata casuale.

#### **Stato 3/11 — Assordato**

Le prove basate esclusivamente sull’udito falliscono automaticamente. −4 VA alle prove in cui l’udito è importante ma non indispensabile.  
 Non riceve ordini, avvertimenti o informazioni trasmessi soltanto a voce. Può parlare, ma controlla male il volume.  
 Le attività basate su vista o altri sensi disponibili non ricevono automaticamente penalità. È immune agli effetti che richiedono di essere uditi.  
 Durata ordinaria 1+1d3 Round, salvo la fonte. Nessuna PS generale: si effettua soltanto se la fonte la consente.  
 Il −4 non si applica automaticamente a tutti gli attacchi e alle Difese: conta quanto l’azione dipende dall’udito.

#### **Stato 4/11 — Avvelenato**

All’esposizione si effettua PS Tempra con il modificatore del veleno. Il successo dimezza per eccesso ciascun danno periodico; se il veleno non provoca danni, dimezza invece la durata, salvo la fonte.  
 Danni, frequenza, penalità, altri Stati e durata dipendono dal veleno. Non esiste una penalità generale comune a tutti i veleni.  
 Il danno ignora AR; a 0 PV si applicano le normali regole delle Ferite. Per un effetto temporaneo senza durata specifica si usa 1+1d3 Round.  
 Una nuova esposizione allo stesso veleno rinnova la durata senza sommare i danni periodici. Veleni diversi possono coesistere.  
 L’antidoto appropriato interrompe immediatamente l’effetto. Medicina permette di identificarlo e trattarne i sintomi, ma non elimina automaticamente lo Stato.

#### **Stato 5/11 — Immobilizzato**

Non può spostarsi, Correre o Scattare. Subisce −4 VA alle azioni fisiche ancora possibili; gli arti bloccati non possono essere utilizzati.  
 Liberarsi segue la fonte. Per la manovra Immobilizzare, il tentativo richiede 1 AzP e una Prova contrapposta.  
 Gli effetti temporanei durano normalmente 1+1d3 Round, salvo la fonte; una presa permane finché spezzata o rilasciata.  
 Mantenere una presa non costa Azioni, ma impegna le mani utilizzate. Chi la mantiene può spendere 1 AzP ed effettuare una nuova Prova contrapposta per infliggere il proprio danno senz’armi; il fallimento non interrompe la presa.  
 Il −4 non si applica automaticamente alle PS o alle attività mentali.

#### **Stato 6/11 — Incendiato**

PS Riflessi iniziale, salvo esplicita eccezione della fonte: il successo evita lo Stato. Durata ordinaria 1+1d3 Round, salvo la fonte.  
 Infligge immediatamente 1d4 PV da fuoco, poi all’Iniziativa della fonte nei Round successivi, al massimo una volta per Round. Il danno iniziale non viene ripetuto nello stesso Round.  
 Per tutta la durata: −2 VA a tutte le prove di Abilità, non alle PS.  
 Spegnersi richiede 1 AzP e PS Riflessi. Con mezzi adeguati, come acqua, sabbia o coperta antifiamma, basta 1 AzP senza prova; può intervenire un alleato.  
 Applicazioni ripetute non sommano i danni; si mantiene la durata maggiore.  
 Il danno ignora AR generica non magica. AR magica pertinente può ridurlo a 0; protezioni specifiche contro il Fuoco seguono la propria descrizione. Ignifugo X è una contromisura preventiva e non si sottrae al danno.  
 Ridurre il danno a 0 non spegne le fiamme e non elimina il −2 VA. Restano le precisazioni della A.50 su natura dell’AR e protezioni contro il Fuoco.

#### **Stato 7/11 — Rallentato**

Passo ridotto a 3 Q; non può Correre o Scattare. Se un altro effetto impone movimento inferiore, prevale il limite più restrittivo.  
 −2 VA alle prove fisiche e alle Difese; non si applica automaticamente ad attività mentali o PS.  
 Solo quando la fonte consente PS Tempra o Riflessi, il successo evita lo Stato.  
 Durata ordinaria 1+1d3 Round, salvo la fonte. Applicazioni ripetute non sommano le penalità; si mantiene la durata maggiore.  
 Continuano ad applicarsi i normali costi di terreno e modalità di movimento, compreso il Nuoto.

#### **Stato 8/11 — Sanguinamento**

Possiede un valore X indicato dalla fonte. Perde subito X PV ignorando Armatura, Parata e Schivata; la perdita si ripete all’Iniziativa della fonte, al massimo una volta per Round, contando l’applicazione iniziale.  
 La perdita non porta sotto 0 PV. Quella che porta a 0 non provoca immediatamente una Ferita. Se il personaggio è già a 0 PV, effettua PS Tempra: successo, nessuna nuova Ferita; fallimento, 1 Ferita.  
 Il Magistrale rende automaticamente riuscita la successiva Tempra contro lo stesso Sanguinamento. Il Maldestro provoca 1 Ferita e −4 alla prossima Tempra contro lo stesso Sanguinamento.  
 Più Sanguinamenti non si sommano: si usa il valore più alto. Persiste finché arrestato, senza durata generica di 1+1d3 Round. Un Sanguinamento attivo impedisce il recupero di PV e Ferite.  
 Arrestarlo con Medicina richiede un kit utilizzabile, accesso al paziente e 10 Round continuativi. Un’applicazione si consuma all’inizio. Il soccorritore resta adiacente e spende 1 AzP ogni Round; può soltanto effettuare Passo, mentre il paziente non può Correre o Scattare. Durante il trattamento il Sanguinamento è sospeso.  
 Prova finale: +2 VA per X=1; nessun modificatore per X=2; −2 VA per X≥3, oltre a strumenti e Talenti pertinenti.  
 Kit Improvvisato: successo, sospende per 10 Round; Magistrale, arresta.  
 Kit Standard: successo, arresta; Magistrale, arresta e recupera 1d4 PV.  
 Kit Professionale: successo, arresta e recupera 1d4 PV; Magistrale, arresta e recupera il doppio del risultato di un unico 1d4. Non si superano i PV massimi.  
 Interruzione o fallimento fanno riprendere il Sanguinamento; l’interruzione non concede prova finale né restituisce materiali. Con Maldestro il paziente perde anche 1d4 PV, senza scendere sotto 0 né subire una Ferita diretta.  
 Ripresa e sospensione rispettano il limite di una perdita periodica per Round. Restano le condizioni di applicazione della proprietà e gli altri chiarimenti della A.76.

#### **Stato 9/11 — Stordito**

Può effettuare soltanto Passo; non può compiere Azioni Principali. Conserva PS e Prove contrapposte passive, ma non può utilizzare Difese che richiedono Azioni.  
 Durata ordinaria 1+1d3 Round, salvo la fonte. Applicazioni ripetute non si sommano; si mantiene la durata maggiore.  
 Quando diventa Stordito, effettua immediatamente PS Volontà per mantenere la Concentrazione e Prova di Potere per mantenere la Focalizzazione, se pertinenti. Le prove sono senza costo in Azioni: il successo mantiene l’effetto, il fallimento lo interrompe.  
 Queste verifiche sono richieste anche senza danni e non si ripetono ogni Round per la sola permanenza dello Stato.

#### **Stato 10/11 — Svenuto**

Non può compiere Azioni né muoversi e cade A Terra. Non può usare Difese attive e normalmente non percepisce l’ambiente; è incapace di reagire per le regole che richiedono questa condizione.  
 Perde immediatamente Concentrazione e tutte le Focalizzazioni, senza prove per mantenerle.  
 La durata dipende dalla causa. Per un effetto temporaneo senza durata specifica si usa 1+1d3 Round.  
 A 0 PM lo svenimento permane finché recupera almeno 1 PM: non termina per la semplice scadenza di Round.  
 Se sta volando o nuotando si applicano le conseguenze delle rispettive regole di movimento.

#### **Stato 11/11 — Terrorizzato**

Una PS Volontà iniziale riuscita evita lo Stato. Durante lo Stato: −4 a tutte le prove, comprese le PS. Il −4 non si applica alla PS iniziale per evitarlo.  
 Non può avvicinarsi volontariamente alla fonte della paura e deve usare il Movimento per fuggire lungo il percorso ragionevolmente più sicuro.  
 Le AzP possono essere usate soltanto per difendersi, nascondersi, agevolare la fuga o rimuovere lo Stato. Se fuggire è impossibile, può effettuare Passo o cercare Copertura, ma non compiere azioni offensive contro la fonte.  
 Durata ordinaria 1+1d3 Round, salvo la fonte. Applicazioni ripetute non sommano le penalità; si mantiene la durata maggiore.  
 Un alleato adiacente può spendere 1 AzP ed effettuare Oratoria: con successo lo Stato termina. Termina immediatamente anche quando la scomparsa della fonte della paura è evidente al personaggio.

#### **A.119 — Ammalato: intensità ed effetti nell’app**

Approvato il ott 6, 2026  
 Ammalato ha sei intensità selezionabili nell’app, con penalità rispettivamente −1, −2, −4, −6, −8 e −10.  
 La penalità si applica a tutte le prove di Abilità, compresi attacchi e Difese; sono escluse le Prove Salvezza. Eventuali eccezioni specifiche potranno essere definite nelle singole malattie.  
 L’app applica automaticamente il modificatore e mostra intensità ed effetto, per esempio «Ammalato 3 — penalità −4». Cambiare intensità sostituisce la penalità precedente, senza sommarla.  
 Gli effetti possono manifestarsi immediatamente quando la fonte lo prevede, come la febbre dell’incontro già giocato. Non si applica la durata generica di 1+1d3 Round.  
 Contagio, incubazione, progressione, durata e guarigione saranno definiti nel Manuale del Direttore. Non si introducono ora frequenze, tiri o cure automatiche aggiuntive.  
 È superata la proposta di lasciare Ammalato come semplice indicatore privo di effetti, così come il comportamento provvisorio dell’app che lo segnava senza applicare penalità.

#### **A.120 — COS e SAG temporanee: PV e PM**

Approvato il ott 6, 2026  
 Bonus e malus temporanei a COS non modificano automaticamente i PV massimi. Bonus e malus temporanei a SAG non modificano automaticamente i PM massimi.  
 Non cambiano direttamente neppure i rispettivi valori attuali, né all’inizio né alla fine dell’effetto.  
 Le Caratteristiche modificate continuano a influire sulle prove e sui bonus pertinenti, per esempio COS sulla Tempra e SAG su Potere, secondo le normali formule e i limiti applicabili.  
 Un effetto può modificare direttamente PV o PM soltanto se lo dichiara espressamente. Gli aumenti permanenti, compresi quelli dell’avanzamento, conservano le rispettive regole.  
 Esempio: COS 6 e 25/40 PV; con +2 COS temporaneo si usa COS 8 per gli effetti pertinenti, ma la riserva resta 25/40. La scadenza del bonus non sottrae PV. È confermata l’ipotesi dell’app sui massimi invariati.

#### **A.122 — Priorità delle funzioni della mappa**

Approvato il ott 6, 2026  
 Funzioni indispensabili: immagine della mappa e griglia in Q; pedine, dimensioni e rotazione; Iniziativa e indicazione del turno; misurazione di distanze e movimento; muri e porte; nebbia ed esplorazione delle zone; luci e linea di vista; template delle aree degli effetti.  
 Funzioni aggiuntive: mappe video e costruttore di stanze. Le mappe video sono sfondi animati, normalmente in ripetizione: l’animazione non modifica automaticamente movimento, danni, illuminazione o linea di vista.  
 «Aiuto-master» resta da precisare: il quesito non specifica quali funzioni comprenda.  
 La parte relativa ai veicoli sulla mappa rimane rimandata.

#### **A.124 — Azioni extra, movimento e diagonali sulla mappa**

Approvato il ott 6, 2026  
 La mappa segue il Manuale del Giocatore. Livelli 1–11: 1 AzM e 1 AzP per Round. Livelli 12–20: 1 AzM e 2 AzP per Round.  
 Le AzP si svolgono durante la stessa Iniziativa: non si creano turni aggiuntivi a INI −3 o −6. Eventuali Azioni già consumate, per esempio per difendersi, restano spese.  
 Valori ordinari: Passo 6 Q, Corsa 12 Q, Scatto 18 Q. L’app considera modificatori del personaggio, Stati, terreno ed esiti delle prove richieste. Il Direttore può correggere manualmente la disponibilità per situazioni particolari, ma il valore predefinito deriva dalle regole.  
 Ogni diagonale costa 1 Q, come uno spostamento orizzontale o verticale su terreno normale. Questo non permette di attraversare muri o passaggi ostruiti.  
 Divisione del movimento e costi di Corsa e Scatto sono precisati nella A.129.

#### **A.125 — Porte e illuminazione sulla mappa**

Approvato il ott 6, 2026  
 Parte porte approvata. Aprire o chiudere una normale porta accessibile e non bloccata costa 1 AzP, senza prova. Per azionarla manualmente occorre essere adiacenti e avere una mano libera.  
 Attraversare la porta consuma il normale movimento, separatamente dall’apertura. Una porta bloccata richiede prima la procedura pertinente per sbloccarla, scassinarla o forzarla. Nell’app «chiusa» e «bloccata» sono condizioni distinte.  
 Parte illuminazione approvata. Le categorie sono quelle della A.106: luce sufficiente, nessuna penalità; penombra, −2 alle prove dipendenti dalla vista; luce molto scarsa, −4; buio totale, effetti di Accecato con −8 alle attività ancora possibili e impossibilità di quelle esclusivamente visive.  
 La mappa distingue la portata della sorgente, espressa in Q, dalla condizione di illuminazione della zona. I vecchi numeri chiamati «livello» non vanno convertiti automaticamente senza averne chiarito il significato.  
 Le normali lampade del catalogo hanno una sola portata. Un bersaglio effettivamente illuminato non beneficia delle penalità per mancanza di luce. Muri, ostacoli e capacità visive speciali conservano i propri effetti.  
 La domanda sul movimento dei veicoli rimane rimandata: questa risposta non chiude quella parte della A.125.

#### **A.127 — Attraversamento dei quadretti occupati**

Approvato il ott 6, 2026  
 I quadretti degli alleati sono attraversabili pagando il normale costo di movimento, senza sovrapprezzo per la sola presenza dell’alleato.  
 I quadretti dei nemici non sono attraversabili, salvo capacità o regole che lo consentano espressamente.  
 Non si può terminare il movimento in un quadretto occupato, né fermarvisi per attaccare o compiere un’altra Azione. Per una pedina che occupa più quadretti, l’intero ingombro della posizione di arrivo deve essere libero.  
 Attraversare un alleato non evita gli Attacchi di Opportunità: restano le regole dell’Ingaggio. Capacità speciali e spostamenti forzati conservano le proprie regole; poter attraversare un quadretto occupato non autorizza automaticamente a fermarvisi.  
 Esempio: si può passare attraverso un compagno e raggiungere uno spazio libero oltre di lui, ma non attaccare restando sovrapposti.

#### **A.128 — Terreno difficile**

Approvato il ott 6, 2026  
 Ogni quadretto percorso su terreno difficile costa 2 Q di movimento, anche in diagonale. Il Direttore identifica le zone, per esempio macerie, fango profondo o vegetazione fitta.  
 Nei percorsi misti si conteggiano separatamente i tratti: 1 Q per quadretto normale e 2 Q per quadretto difficile.  
 Il costo maggiore non aggiunge da solo penalità al VA o nuove prove. Eventuali pericoli e le normali prove di Corsa e Scatto mantengono le proprie regole. Le capacità che ignorano il terreno difficile seguono la propria descrizione.  
 Con i valori ordinari e un percorso interamente difficile: Passo 6 Q disponibili → 3 quadretti effettivi; Corsa 12 Q → 6 quadretti; Scatto 18 Q → 9 quadretti. Questi valori precedono ulteriori modificatori e gli esiti delle prove di movimento.  
 Esempio: 2 quadretti normali e 2 difficili consumano 2 + 4 = 6 Q, esaurendo il Passo ordinario.

#### **A.129 — Movimento diviso, Corsa e Scatto**

Approvato il ott 6, 2026  
 Passo: distanza ordinaria 6 Q, costo 1 AzM; può essere diviso prima, fra e dopo le AzP, entro la disponibilità complessiva.  
 Corsa: distanza ordinaria 12 Q, costo 1 AzM; è un unico blocco da completare prima delle AzP.  
 Scatto: distanza ordinaria 18 Q, costo 1 AzM; è un unico blocco da completare prima delle AzP.  
 Corsa e Scatto non consumano un’AzP aggiuntiva. Richiedono una Prova di Atletica compresa nell’AzM: su terra, senza penalità propria in Corsa e −2 in Scatto.  
 Alle altre Azioni si applicano le penalità dell’andatura: −2 VA in Corsa e −6 VA in Scatto. Non si aggiungono nuovamente alla prova di movimento.  
 Nella stessa Iniziativa in cui corre o scatta, il personaggio non può lanciare Incantesimi. Gli Artefatti conservano le proprie regole.  
 La disponibilità di movimento resta unica; la seconda AzP non concede un’altra AzM. Manovre e capacità specifiche mantengono i propri costi ed eccezioni.  
 Esempio: al Passo si possono percorrere 2 Q, attaccare e completare i 4 Q restanti; non si può correre 6 Q, attaccare e completare gli altri 6 Q.  
 L’ipotesi provvisoria «movimento diviso consentito entro il totale» va quindi limitata al Passo, salvo eccezioni espresse.

#### **Quesiti sospesi e dati ancora da fornire**

Stato verificato al ott 6, 2026  
 A.109 — Anticipazione: sospesa. L’ultimo elenco incollato in conversazione contiene 32 riferimenti a incantesimi/aspetti, mentre il vecchio testo del quesito parlava di 31. Non si attribuiscono nomi o gradini agli indici per supposizione. Serve il file incantesimi.json oppure un elenco con nome dell’incantesimo, nome dell’aspetto e relativa scheda. Le risposte già approvate sull’Anticipazione restano valide.  
 A.111 — Rimane da verificare la storia dell’Interfaccia neurale di Pablo Zaion; la regola generale sui recuperi pregressi è invece approvata.  
 A.112 — Riserve degli Artefatti di Lucas e Dimitri: resta da confermare se i valori massimi nei file dei PG siano residui reali o valori iniziali. Non si modificano automaticamente.  
 A.113 — Permessi e denominazioni dei veicoli: rimandata.  
 A.115 — Capacità specifiche dei nemici: rimandata con il bestiario.  
 A.122 — La voce generica «Aiuto-master» richiede una descrizione delle funzioni; le altre priorità sono approvate.  
 A.125 — La parte sui veicoli resta rimandata. Le vecchie etichette numeriche delle luci richiedono una corrispondenza tecnica verificata, senza nuovi modificatori di regola.  
 A.126 — Ingombro delle creature da 3×3 Q: rimandata con il bestiario.  
 Le regole dettagliate di malattie e cure della A.119 sono destinate al Manuale del Direttore. Ammalato ha già la scala operativa approvata per l’app.  
 Questo aggiornamento registra le risposte approvate; non dichiara completati il recepimento nei manuali o l’implementazione nell’app. Le domande del collaboratore non sono state spostate o cancellate.

  
  