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

> * **A.18 — Riserve integrate nelle armi**: alimentano soltanto le funzioni del proprio Artefatto, non pagano Incantesimi e non si prelevano (Magia §24.2 e §24.7, Doc del 01/10); «Lancia\!» non le offre più come fonte di PM — implementata il 02/10.  
> * **A.20 — Prelievo dal Chroma Bianco senza Addestramento Taumaturgo.**

“Un personaggio cosciente può prelevare PM da un contenitore Bianco sintonizzato”: vale per chiunque, anche un Combattente senza magia? O serve almeno l’accesso alla magia?  
*Nel frattempo:* non ancora implementato; è la domanda che decide come.

## ---

**2\. Domande di rifinitura (l’app ha già un’ipotesi ragionevole)**

### **Regole generali**

**A.32 — 18 nuovi Talenti magici e mistici (Magia sez. 1, Giocatore §8.6.8, Doc del 27/09).** Nella copia condivisa sono comparse 18 schede nuove (Potere Mistico, Recupero Mistico, Escludere la Componente Somatica / l’Invocazione / il Focus, Concentrazione Migliorata e Operativa, Incantesimi Ampliati, Estesi, Proiettati, Plurimi, Intensificati, Anticipazione Migliorata, Incantesimi Inarrestabili e Massimizzati, Manifestazioni Occultate, Ritualista Minore e Maggiore) e la Concentrazione su un Incantesimo passa dalla Prova di Potere alla PS di Volontà. Non sono fra le risposte approvate del Doc E\&L: sono definitive?  
*Nel frattempo:* l’app le recepisce dal manuale condiviso (fonte corrente): Talenti acquisibili con il testo della scheda, Potere Mistico \+5 PM Massimi per acquisizione; «possedere una riserva personale di PM» vale per tutti.  
*Nota del 02/10:* Ritualista Minore e Ritualista Maggiore sono ora i requisiti dell'Officiante per i Gradi I–III e IV–VI (Magia §24.1 e §25.1): l'app li considera definitivi. La domanda resta aperta per gli altri 16 Talenti.

**A.35 — Acquisti iniziali: valore ceduto maggiore del prezzo (§2.16.29).** Il paragrafo dice che si paga la differenza; se gli armamenti ceduti valgono più del nuovo oggetto (per esempio si cede l’armatura da 1.500 per un’arma da 800), la differenza torna in crediti o si perde?  
*Nel frattempo:* il conguaglio non scende sotto zero (la differenza si perde) e l’app lo segnala accanto all’acquisto.

**A.39, punti 1–3** — Anticipazione senza Addestramento (colonna «altri» −2), Colpo Elementale (PS solo per gli effetti secondari, per elemento) — implementata il 29/09. Punto 3, Rigenerazione: procedura completa (Magia sez. 25, E\&L del 01/10): Rituale con Prova di Rituali, PM totali, ore, reagenti e Canali; da Artefatto sintonizzato senza Prove, con i PM dalla riserva Verde o Bianca (§25.4) — implementata il 02/10.  
*Nel frattempo:* le scelte sopra.

**A.38 — Attacco a distanza: punti da confermare (Giocatore §5.2, §5.8, §5.10, §5.11).** L’utility «Attacca\!» applica il testo; dove non è esplicito ha scelto così:

> 1. *Movimento Tattico (Incursore) e Movimento Fluido* riducono entrambi di 2 le penalità del proprio movimento: si sommano? L’app usa una sola riduzione (Scatto −6 → −4).  
> 2. *Attaccare dalla Copertura* «consuma l’Azione di Movimento e un’Azione Principale»: l’Azione Principale è quella del tiro, o una in più? L’app conta solo l’AzM in più.  
> 3. *Seconda Prova contro un bersaglio impegnato o protetto* («con la stessa Abilità a −4 VA»): è il VA per colpire dell’arma −4, o con anche distanza, Copertura e gli altri modificatori del tiro? L’app usa il VA dell’arma −4.  
> 4. *Mira Selettiva* vale «se rimane fermo per tutto il Round»: basta il Passo per perderla? L’app la applica solo scegliendo «Fermo».  
> 5. *Imbracciatura*: con l’arma già imbracciata si spara senza costo; se va imbracciata nel Round costa 1 AzM, che l’app ricorda ma non aggiunge. Muoversi (Passo compreso) fa perdere l’Imbracciatura, salvo Imbracciatura Rapida: corretto?  
> 6. *Tiro Ravvicinato obbligatorio e Tiro a Bruciapelo* (bersaglio che ti impegna, al Contatto, con Tiro a Bruciapelo Migliorato): l’app applica la penalità del Tiro Ravvicinato e il danno ×2 senza il \+3. È così?  
> 7. *Movimento Evasivo del bersaglio fermo*: il Movimento Evasivo si fa muovendosi; se il giocatore lo indica per un bersaglio «fermo», l’app usa le penalità del Passo.

*Nel frattempo:* le scelte sopra; Tiratore Imboscato, Rapidità Operativa, Punto Vitale e Raffica Estesa compaiono come promemoria nel risultato.  
**A.36 — Effetti degli oggetti: situazionali o per un uso specifico?** La scheda distingue i bonus che il giocatore accende al tavolo quando ricorre una circostanza (corredo di sopravvivenza nell’ambiente scelto, abiti eleganti in un ambiente formale) da quelli che valgono solo per un tipo di Prova (valigetta: esaminare tracce; kit: pronto soccorso), mostrati a parte. Casi da confermare: Binocolo e corredi da ricognizione («dettagli lontani», «osservazioni attraverso le ottiche») trattati come situazionali; Corredo di orientamento come uso specifico; il «+2 VA a Medicina» dei Kit trauma limitato al pronto soccorso. Inoltre: fra i bonus degli oggetti per la stessa Prova vale solo il maggiore (Giocatore §1.4.1, «un solo modificatore complessivo per la qualità degli strumenti»), anche per abiti e binocolo: va bene?  
*Nel frattempo:* classificazione e regola come descritto; nessun effetto cambia il totale da regole né la stampa, tranne la penalità dell’armatura al lancio con Potere, che compare nel foglio Magia. Dal 29/09 il Binocolo segue il §4.2 dell’Equipaggiamento (uso specifico).  
**A.34 — Oggetti della dotazione senza scheda di catalogo (§2.16).** *Aggiornamento del 29/09:* 28 delle 44 voci hanno la scheda nei capitoli 2, 3, 4 e 6 del Manuale dell’Equipaggiamento 0.3 (o, per il Corredo di manutenzione da campo, nel §7.13.7 degli Armamenti) e sono nell’app. Restano senza peso, prezzo e Qualità 16 voci: i Corredi da scasso, da camuffamento, agricolo, artigianale professionale, elettronico e informatico, di ricerca documentale, di analisi da campo, amministrativo, scenico e rituale; Cassetta degli attrezzi; Strumento musicale portatile; Terminale per produzione multimediale; Testo dottrinale e simbolo; Focus personale. Arriveranno con i capitoli 5 e 7?  
*Nel frattempo:* entrano nell’inventario come voci personalizzate senza peso né prezzo (il carico non li conta) e non si possono cedere negli acquisti iniziali.  
**A.54 — Ricarica del revolver (E\&L 19, Giocatore §5.1.1).** La risposta dice «Il Revolver usa il tamburo» senza il costo. L’app applica la regola generale: una operazione di ricarica (1 AzP) riempie il tamburo con munizioni pronte, come scritto per la Colt Hammershot (Armamenti 0.54). Doppiette e fucili a pompa invece inseriscono una cartuccia per operazione. È corretto anche per il revolver commerciale e per i revolver corporativi?  
*Nel frattempo:* tamburo pieno in 1 AzP.  
**A.55 — Caratteristica del bonus al danno (Giocatore §5.13).** Il paragrafo dice «FOR o DES secondo l’arma ravvicinata; DES o INT secondo l’arma a distanza». L’app usa la Caratteristica dell’Abilità dell’arma: FOR per Armi da guerra e Corpo a corpo; DES per Armi da mischia, da lancio e leggere; INT per Armi medie; Armi pesanti INT, come scritto. Va bene?  
*Nel frattempo:* questa corrispondenza.  
**A.56 — La riforma delle categorie di competenza supera la decisione del 28/09 sugli Addestramenti a 76 punti?** Il 28/09 hai confermato gli Addestramenti a 76 punti (basi 2–4) e il limite di Avanzamento 3 alla creazione. Il Doc del Giocatore del 29/09 (23:45) dà le basi alla prima Classe (7/6/5/3, 122 punti) e sostituisce il limite 3 con i limiti per categoria (§2.3, §2.13, §8.3). Vale il testo del 29/09?

*Nel frattempo:* vale il testo del 29/09; dei 76 punti resta solo la conferma dei 10 Punti Abilità Liberi.  
**A.57 — Personaggi già creati: punti liberi che non aumentano più il VA (§8.3).** Con i limiti nuovi, ogni personaggio già creato ha punti già spesi che oggi non aumenterebbero il VA personale (da 6 a 15 punti nei nostri personaggi di prova). Si riassegnano, evento per evento con i limiti di quel momento, oppure restano dove sono e tornano efficaci quando il limite sale?  
*Nel frattempo:* si riassegnano dall’avviso in cima alla scheda; finché non si riassegnano non contano e non si sale di livello.  
**A.58 — Il \+1 di Corporazione può essere annullato dal limite (§1.2.1).** Il bonus di Corporazione sta dentro il VA personale: un’Abilità Non competente con Caratteristica 7 e bonus di Corporazione fa 2 \+ 3 \+ 1 \= 6 contro il limite 5 del I Grado, e il \+1 non conta finché il limite non sale. Capita anche con le Generiche: 2 \+ 5 \+ 1 \= 8 contro 7\. È voluto?  
*Nel frattempo:* sì, come dice il testo; il \+1 resta e conta quando il limite sale.

**A.59 — Artefatto nel deposito comune: resta sintonizzato?**

L'app oggi non lo conta nella capacità di sintonizzazione (§7.10) e la sua riserva non alimenta, ma ricorda la scelta e la riattiva quando l'oggetto torna con sé. Va bene così, o un Artefatto lasciato in deposito perde la sintonizzazione?

*Nel frattempo:* come descritto; la sintonizzazione si gestisce nella nuova tab Artefatti.

**A.60 — Scheda digitale: dove l'app fa diversamente dalla tua proposta «Modifiche Layout APP»**  
Otto tab (ARTEFATTI a sé). I Crediti stanno nell'Inventario, dove si comprano gli oggetti al tavolo. Le Tecniche Interiori restano nella tab Abilità. L'app non registra quale mano tiene un oggetto: destra e sinistra seguono l'ordine dell'Inventario, con un riquadro «Due mani» per le armi a due mani. I rinforzi si montano sull'armatura dall'Inventario. Nell'Inventario, Strumenti professionali e Razioni arriveranno con i loro capitoli; lo stato di un oggetto tiene quelli del tipo (Impugnata, Addosso, Imbracciato, Indossata, Nello zaino…) più «Deposito comune». Poteri Sciamanici, Cibernetica e Veicoli aspettano il manuale. Va bene così?  
*Nel frattempo:* come descritto (dettaglio in docs/layout-sd.md, «Esito»).

**A.61 — Talenti con valori ancora da definire (censimento dei Talenti)**  
Corazzaio: un'armatura realizzata come Capolavoro ottiene \+1 Protezione contro una tipologia di danno scelta, ma il manuale dice che «questo beneficio resta da raccordare alle regole definitive delle protezioni». Come si applica? Come AR aggiuntiva contro quel tipo di danno, come le proprietà delle armature?  
*Nel frattempo:* l'app applica i \+3 VA di Corazzaio (per costruire o riparare protezioni) e lascia il beneficio del Capolavoro come testo.

**A.62 — Katana Ryūjin: natura del danno attivato (Armamenti 0.58, §7.1.9)**  
Attivata, la Ryūjin infligge 1d8+1+1d6 «risolto come un unico colpo Naturale», ma lo stesso paragrafo dice che aggiunge \+1d6 Plasma e che l'effetto Plasma segue il §7.5.1. Il danno attivato è Naturale con l'effetto secondario del Plasma, oppure di natura Plasma?  
*Nel frattempo:* l'app la tratta come la Lancia Duskdealer (+1d6 Plasma) e riporta la frase del manuale.

**A.63 — Esoscheletri: batteria o NEC? (Armamenti 0.58, §§7.11.6, 7.15, 7.16, 7.18)**  
La 0.58 porta ai NEC celle d'arma, accessori, elmetti, robot (NEC Rosso dedicato) e mezzi. Powersuit, Shoa Ace Custom, Demonhunter, Felis, Juggernaut, Vulkan e APE Capitol scrivono ancora «batteria». Sono NEC (quale colore e formato) o restano batterie dedicate con l'autonomia della scheda?  
*Nel frattempo:* l'app tiene il testo della scheda.

**A.64 —Moduli IAS: riserva e consumo in Lx (Armamenti 0.58, §7.15.4)**  
Il NEC Blu IAS contiene 20 cariche, ma «il consumo in Lx resta da dimensionare per il modello». Quanti Lx ha la riserva e quanti ne consuma una carica?  
*Nel frattempo:* l'app conta le 20 cariche e il servizio di ricarica da 50\.

**A.65 — Dotazioni con più di una scheda possibile (Equipaggiamento 0.5, §§5.3 e 5.8)**  
Il Corredo agricolo Standard si sceglie fra coltivazione e allevamento (Giocatore §2.16.23): per la coltivazione c'è la scheda Standard degli Attrezzi agricoli di base, per l'allevamento solo il Corredo dell'allevatore (+2, 800). Quale scheda vale per la versione «allevamento»? E lo Strumento musicale portatile della dotazione è quello acustico (400) o quello elettronico (800)?  
*Nel frattempo:* le due voci restano senza scheda (peso e prezzo da definire).  
**A.66 — Fornello del Corredo da cucina: tempi e «cartuccia» (Equipaggiamento 0.5, §3.2)**  
La tabella e il paragrafo sul NEC dicono una preparazione da 30 minuti e 50 Lx; «Preparazione e limiti» dice ancora 15 minuti, «un uso della cartuccia» e sostituzione in 1 minuto, mentre il NEC si sostituisce in 1 AzP (§5.4.5). Quali valgono?  
*Nel frattempo:* l'app conta 10 preparazioni da 50 Lx e riporta la tabella.  
**A.67 — Il Modulo Blu del Gehemmapuker (Armamenti §7.20.6, Equipaggiamento §5.4.4–5.4.5)**  
Il Gehemmapuker «usa un Modulo Blu» da 2.500 Lx e 2.100 cr, gli stessi valori del Modulo Blu del catalogo NEC. È lo stesso Modulo (intercambiabile) o un formato d'arma dedicato (§5.4.5: formato d'arma e Modulo non sono automaticamente intercambiabili)?  
*Nel frattempo:* due voci con gli stessi valori, il pacco del lanciafiamme (per la ricarica al tavolo) e il Modulo Blu.

**A.68 — Interfaccia neurale standard: prezzo e profilo (Equipaggiamento 0.5, §7.3)**  
Il capitolo 7 descrive l'Interfaccia neurale standard ma non ne dà il prezzo (la CYBERTRONIC sì). Quanto costa, e ha un profilo suo (PI, reperibilità) o vale quello della CYBERTRONIC senza lo sconto UMN?  
*Nel frattempo:* la voce esiste in catalogo ma senza prezzo, quindi non si può comprare; chi la riceve dal Direttore la segna a mano.  
**A.69 — Installare, togliere e reinstallare un impianto (Equipaggiamento 0.5 §7.1, Giocatore §5.21.4)**  
Il manuale non definisce la procedura: dove si installa (serve una postazione medicochirurgica del cap. 6?), con quali costi, tempi e Prove, e cosa succede togliendo o reinstallando lo stesso impianto.  
*Nel frattempo:* installare e togliere sono cambi di stato fatti a mano nell'app; il costo d'installazione è mostrato ma non scalato dai crediti; l'UMN si perde alla prima installazione e lo stesso esemplare non si conta due volte; la perdita resta anche togliendo l'impianto.  
**A.70 — Procedure di recupero dell'Umanità (Giocatore §5.21.4)**  
Il §5.21.4 accenna al recupero dell'Umanità ma non dà procedure, costi o limiti. Come si recupera?  
*Nel frattempo:* l'app registra i recuperi solo come «concessi dal Direttore», con un modulo nella tab Cibernetica che tiene l'elenco di perdite e recuperi.

**A.71 — Cartuccia chirurgica e set chirurgico (Equipaggiamento §6.5, §6.8.7)**  
La cartuccia chirurgica delle postazioni medicochirurgiche (500 cr, «una operazione») e il set chirurgico del Kit chirurgico e della Postazione medica da campo (500 cr, un set per procedura) hanno lo stesso contenuto (anestetici, disinfettanti, suture, materiali) e lo stesso prezzo. Sono lo stesso consumabile, intercambiabile fra kit e postazioni, oppure due formati distinti?  
*Nel frattempo:* due voci distinte allo stesso prezzo, ciascuna per i propri dispositivi.

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

**A.73 — Formato dei nemici per il Tavolo del Master**  
Per la plancia del master proponiamo un formato dei nemici con i numeri già fatti: nome; PV; PM se ne ha; AR totale e di cui magica; Difese; Iniziativa; Movimento (Passo, Corsa, Scatto); le quattro Prove Salvezza; attacchi (nome, ravvicinato o a distanza, VA, danno, natura Naturale, Magico o Etereo, proprietà, portata o gittata, modalità di fuoco, AC); Stati con cui entra in scena; immunità agli Stati; incantesimi; note; Caratteristiche facoltative. Manca qualcosa, o il bestiario avrà un formato suo? In particolare: i nemici hanno Ferite e Affaticamento come i PG (§5.14)? Come lanciano gli incantesimi (VA, costo in PM)?  
*Nel frattempo:* questo formato. Le Caratteristiche sono facoltative: servono DES e INT per la parità d'Iniziativa; senza, si fa lo spareggio col dado. Se mancano Corsa e Scatto valgono il doppio e il triplo del Passo. Dei nemici la plancia tiene solo PV e Stati. Gli incantesimi sono un promemoria, senza «Lancia\!».

**A.74 — Rituale di Rigenerazione: quattro punti non scritti (Magia §24.6, sez. 25\)**  
1\. «VA pertinente del Canale» (tabella del §24.6): quale Abilità del Canale conta?  
2\. Successo Magistrale con i Canali: il totale dei PM si dimezza e le quote si ripartiscono «senza aumentare la quota dichiarata di alcun partecipante». Chi risparmia?  
3\. La scheda dice «PM utilizzabili: universali o spirituali»: i PM del Rituale possono venire anche da una batteria Verde o Bianca, o solo dalle quote personali dell'Officiante e dei Canali?  
4\. Il livello massimo degli Incantesimi dell'Officiante limita le versioni del Rituale, o conta solo Ritualista (Minore per il Grado III, Maggiore per IV–VI)?  
*Nel frattempo:* 1\. il VA di Rituali del Canale; 2\. i Canali tengono la quota dichiarata e l'Officiante paga il resto, almeno metà Grado; 3\. solo PM personali; 4\. conta solo Ritualista.

**A.75 — Batterie oltre i 5 PM: peso, Qualità e PI (Magia §24.7)**  
La tabella del §24.7 dà Grado e prezzo delle batterie da 10 a 30 PM, ma peso, Qualità, PS Integrità e PI solo per il supporto di base (0,2 kg, Comune, PS 10, 3 PI). Valgono anche per le batterie più grandi?  
*Nel frattempo:* sì, tutte come il supporto di base.

**A.76 — Sanguinante X portato da un colpo (Giocatore §5.15, §5.24)**  
Un colpo con la proprietà Sanguinante X che supera l'Armatura applica Sanguinamento X. Il §5.15 dice che «alla prima applicazione» si perdono subito X PV, ignorando Armatura, Parata e Schivata. Questa perdita si aggiunge al danno dello stesso colpo, oppure arriva solo all'Iniziativa successiva di chi l'ha procurato?  
*Nel frattempo:* la plancia applica lo Stato Sanguinamento al bersaglio e lascia al master la perdita degli X PV immediati.

**A.77 — Perforante con più applicazioni (AC) (Giocatore §5.10, §5.24)**  
«Perforante X sottrae X una sola volta alla componente non magica del colpo.» Con AC 2 o più, l'AR si sottrae separatamente a ogni applicazione (§5.13). Perforante riduce l'AR di ogni applicazione, oppure di una sola per colpo?  
*Nel frattempo:* l'app la riduce in ogni applicazione.

**A.78 — Attacco con VA finale 20 o più (Giocatore §1.6, §1.7)**  
Il §1.7 dice che con valore 20 o superiore il successo è automatico, senza tiro: niente Successo Magistrale né Fallimento Maldestro. Il §1.6 però rende Magistrale il 2 naturale con VA finale almeno 21 «nelle Prove di Abilità effettivamente richieste». Fuori da un tiro imposto (§1.7.1) o da una Prova contrapposta quella soglia non si raggiunge mai. Un attacco con VA finale 20 o più (per esempio un nemico forte che colpisce un bersaglio Ignaro o A Terra) è un successo automatico senza tiro, e quindi senza Magistrale? Oppure per gli attacchi si tira comunque, con 1, 2 e 20 naturali?  
*Nel frattempo:* l'app applica il successo automatico senza tiro.

**A.79 — Bestiario umano proposto per il Tavolo del Master**  
**Metodo.** Non c'è ancora un bestiario. Per avere subito nemici umani con numeri coerenti, ognuno è costruito come un PG con le regole del Giocatore 0.45: creazione completa, equipaggiamento iniziale del §2.16 con il modello corporativo, avanzamento del cap. 8\. L'app lo converte poi in un nemico, con PV, AR, Difese, Iniziativa, Movimento, Salvezze e attacchi calcolati dal motore. Ci sono tre gradi: Recluta (2° livello), Veterano (5°) ed Élite (8°). Le scelte che il manuale lascia libere sono le più ovvie per il ruolo: Talenti, ordine di Caratteristiche e Abilità, dado dei PV dei Gradi al valore medio arrotondato per eccesso, opzioni migliori di arma e armatura dal Veterano in su. Ogni file è marcato «Proposta, da validare con Davide».  
**Tipi, arma principale, PV Recluta / Veterano / Élite:**

> * Fante Capitol (Soldato): carabina CAR10, poi fucile d'assalto M40. PV 20 / 29 / 39\.  
> * Soldato Bauhaus (Soldato): carabina KR10, poi fucile d'assalto STG10. PV 20 / 29 / 44\.  
> * Guerriero Mishima (Assaltatore): spada leggera e scudo, poi spada lunga. PV 19 / 29 / 39\.  
> * Agente Cybertronic (Agente): pistola P500. PV 16 / 24 / 32\.  
> * Soldato Imperiale (Soldato): carabina Defender, poi fucile d'assalto Conqueror 10\. PV 20 / 29 / 39\.  
> * Inquisitore della Fratellanza (Custode): spada leggera e incantesimi. PV 16 / 23 / 31\.  
> * Guardia di sicurezza (Freelance, Soldato): carabina. PV 20 / 29 / 39\.  
> * Criminale di strada (Freelance, Lestofante): pistola semiautomatica e pugnale. PV 15 / 22 / 29\.  
> * Mercenario (Freelance, Artigliere): fucile d'assalto con mirino. PV 20 / 29 / 39\.  
> * Eretico (Freelance, Incursore): pistola silenziata e pugnale; solo la parte umana, nessun potere dell'Oscura Legione. PV 17 / 25 / 33\.

**Domanda.** Vanno bene come base per i PNG umani? Oppure il tuo bestiario avrà regole diverse per loro, per esempio PNG semplificati, gradi diversi o altri livelli di riferimento? E per l'Eretico: quali poteri dell'Oscura Simmetria vanno aggiunti, e con quali regole?  
*Nel frattempo:* questi, marcati co

**A.80 — Rinforzi indossati da soli e ad armatura tolta (Armamenti §7.23, §7.11.2)**  
Hai chiesto che soprabiti e mantelli si possano indossare da soli. Il §7.23.4 dice però che i valori dei rinforzi «descrivono l'impiego insieme a un'armatura compatibile; non costituiscono un profilo autonomo di armatura». Domande:  
(1) Un soprabito o un mantello indossato da solo dà AR? Se sì, quale?  
(2) Le sue proprietà (per esempio contro Etereo o le Qualità) valgono anche da solo?  
(3) Oltre a soprabiti e mantelli, quali altri rinforzi si possono indossare da soli (per esempio Tabardo consacrato, Sottogiacca IES, rivestimenti)?  
(4) Che cosa succede a un rinforzo montato quando si toglie l'armatura su cui è montato?  
*Nel frattempo:* si indossano da soli solo i 14 soprabiti e mantelli; da soli danno AR 0 e nessuna proprietà; indossati da soli sopra un'armatura non contano e vanno montati; ad armatura tolta restano montati ma senza effetto.

**A.81 — Pelle di Rinoceronte: manovre di forza (Giocatore §8.9.3)**  
La scheda concede «+3 ad Atletica e alle prove di Corpo a Corpo nelle manovre in cui si impiega direttamente la forza fisica». Quali Manovre del §5.12 sono «di forza»: Immobilizzare, Sbilanciare, Disarmare, Incalzare? Il \+3 ad Atletica vale per ogni uso di Atletica o solo quando si usa la forza?  
*Nel frattempo:* \+3 ad Atletica e a Corpo a corpo come usi specifici «manovre di forza», mostrati a parte; in «Attacca\!» un promemoria, senza somma automatica.  
**A.82 — Onda Interiore: bonus pertinenti (Giocatore §8.9.4)**  
«Infligge il danno senz'armi della propria Disciplina e del Grado nella Classe, più i bonus pertinenti al singolo attacco.» Il bonus di FOR al danno senz'armi (§5.13) è fra questi? E il \+2 al danno Ravvicinato di Pelle di Rinoceronte vale, visto che Onda ha Vettore Distanza?  
*Nel frattempo:* il bonus di FOR sì, Pelle di R

### **Manovre ravvicinate**

**A.40 — Carica oltre 12 Q (§5.6).** La tabella della Carica si ferma a 7–12 Q e la Carica «non può superare la Corsa». Chi ha una Corsa oltre 12 Q (Talenti di movimento) può caricare più lontano, e con quali penalità?  
*Nel frattempo:* oltre 12 Q l’app non ammette la Carica e lo dice.

### **AR e PI**

**A.53 — Armature con AR magica propria e Corazza Potenziata (A.48).** Corazza Potenziata richiede una protezione Artefatto. Nel catalogo l’unico Artefatto fra le protezioni è lo Scudo delle Guardie Sacre. Queste 14 armature hanno una parte di AR magica propria ma non sono Artefatti: Armatura Marte, Vulcano e Mercurio (Alleanza); Demonhunter (Mishima); Corazza del Soldato d’élite, Armatura dell’Inquisitore, Armatura del Mistico, Corazza delle Furie, Corazza dei Sacri Guerrieri, Armatura delle Valchirie, Tuta del Mortificator, Corazza del Custode dell’Arte, Corazza degli Arcivescovi, Armatura della Sentinella (Fratellanza). Contano come protezione Artefatto per Corazza Potenziata?  
*Nel frattempo:* no, Corazza Potenziata vale solo con lo Scudo delle Guardie Sacre.

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

