> > # **Per Davide — domande aperte ed errata dei manuali**

*Aggiornato al 9 novembre 2026\.*

**Istruzioni per Davide (e per l’AI che usi per rispondere)**

> > •             Questo è l’unico documento con le domande dell’app Mutant. Il link resta sempre questo: non ne esistono altri e non se ne creano di nuovi. Lo stesso testo è nel repo GitHub, docs/per-davide.md.

> > •             **Rispondi in coda**, nella sezione **7\. Risposte di Davide**, alla fine del documento, oppure nel tuo Doc «E\&L – Risposte e correzioni approvate»: leggiamo tutti e due a ogni sessione. Un blocco per risposta, con il numero della domanda (per esempio «A.23»), la data e il testo. Anche «confermo il Nel frattempo» è una risposta valida.

> > •             Non modificare, spostare o cancellare le domande: lo facciamo noi. Quando una risposta è recepita e la funzione è implementata nell’app, la voce passa nella sezione **6\. Risolte**, con la data.

> > •             Le correzioni ai manuali le fai nei Doc dei manuali, come sempre.

> > •             Ogni domanda dice cosa fa l’app *nel frattempo*: se non rispondi non si blocca nulla, l’app applica l’ipotesi indicata.

> > •             **Se hai poco tempo**, comincia dalla sezione 1: sono le domande che possono farci rifare del lavoro.

**Sezioni:** 1\. Domande che bloccano un lavoro in corso · 2\. Domande aperte · 3\. Risposte ricevute, in implementazione · 4\. Da correggere nei manuali · 5\. Manuali che l’app aspetta · 6\. Risolte · 7\. Risposte di Davide · 8\. Prove da fare.

> > ---

> > ## **1\. Domande che bloccano un lavoro in corso**

**Grazie: le diciassette risposte del 06/11 sono arrivate tutte, e sono tutte applicate nell’app** (sezione 6). Di tuo non resta più niente in attesa.

Sono nate sei domande nuove, e nascono tutte dalla stessa risposta, la A.256 sul prezzo di vendita degli Artefatti: applicandola ci siamo accorti che in alcuni punti la formula non torna con quello che i manuali dicono già. Due possono farci rifare del lavoro, e sono qui. Le altre quattro sono in sezione 2 e non fermano niente.

**A.261 — La formula del prezzo contro i prezzi già scritti nei manuali** (08/11/2026). *In parole semplici:* la tua formula è «costo completo di costruzione × 3 × coefficiente di rarità, arrotondato per eccesso ai 50 cr». Applicandola agli oggetti che un prezzo ce l’hanno già, il numero non torna. L’esempio più chiaro è la **Batteria Mistica da 5 PM Rossa**: l’Equipaggiamento §10.2 le dà **creazione 650 cr** e **prezzo di catalogo 1.000 cr**; è Comune, quindi coefficiente 1, e la formula dà **650 × 3 × 1 \= 1.950 cr**, quasi il doppio del catalogo. Non è un caso isolato: nel catalogo abbiamo 37 Artefatti per cui conosciamo creazione, prezzo e rarità, e in **nessuno dei 37** la formula dà il prezzo scritto (Batteria da 30 PM Rossa: creazione 3.400, catalogo 6.000, formula 51.000 perché è Leggendaria). La formula sostituisce quei prezzi — e allora il catalogo delle Batterie va ricalcolato per intero — oppure vale soltanto dove un prezzo di catalogo non c’è?

*Nel frattempo:* l’app **tiene i prezzi dei manuali** dove ci sono, e accanto scrive il prezzo di vendita calcolato con la tua formula, così si vedono tutti e due: «1.000 cr · vendita calcolata 1.950 cr (A.256)». Dove un prezzo non c’è — l’Anello con Rigenerazione 9 — vale la formula, e quello diventa il prezzo. Se ci dici che la formula sostituisce i prezzi scritti, ricalcoliamo il catalogo: preferiamo saperlo prima che qualcuno compri o venda qualcosa al tavolo con il numero sbagliato.

**A.263 — Grado e SnT dell’Anello con Rigenerazione 9** (08/11/2026). *In parole semplici:* nella A.256 chiami l’Anello «Molto raro», e con quello calcoli i 13.500 cr. Ma la configurazione che avevi approvato il 02/11 gli dà **Grado III e SnT 3**, e i manuali legano le tre cose fra loro: l’Equipaggiamento §10.1 dice «il Grado determina la potenza magica: I Comune, II Non Comune, **III Rara**, IV Molto Rara…», e gli Armamenti §7.10 dicono che una **Molto Rara ha SnT 4**. Con «Molto raro» l’Anello è fuori da tutte e due le tabelle. Che cosa cambia: il Grado diventa IV e la SnT 4, oppure la rarità dell’Anello è un’eccezione dichiarata e Grado e SnT restano quelli della configurazione?

*Nel frattempo:* l’app applica la tua A.256 per la rarità e per il prezzo (Molto Rara, 13.500 cr) e tiene **Grado III e SnT 3** della configurazione approvata; l’eccezione è dichiarata nei dati, così il controllo automatico che lega potenza e SnT non la segnala come errore. Se invece il Grado sale a IV cambiano anche la capacità di Sintonizzazione che l’Anello occupa addosso a chi lo porta e il costo dei reagenti per costruirlo: meglio saperlo prima che qualcuno se lo sintonizzi.

> > ---

> > ## **2\. Domande aperte (l’app ha già un’ipotesi ragionevole)**

Sono quattro, tutte nate applicando la A.256 e la A.251. Nessuna ferma un lavoro: l’app ha già un comportamento e va avanti.

> > ### **Prezzi degli Artefatti**

**A.262 — Il coefficiente dell’«Epica»** (08/11/2026). *In parole semplici:* la tabella della A.256 dà i coefficienti di Comune 1, Non comune 1,5, Raro 2, Molto raro 3, Leggendario 5 e «Unico o reliquia» senza prezzo. Manca l’**Epica**, che però esiste: è la potenza del Grado V (Equipaggiamento §10.1) e nel catalogo ci sono otto oggetti Epici, per esempio la Batteria da 25 PM Rossa. Quale coefficiente ha? Fra Molto raro (3) e Leggendario (5) verrebbe naturale 4, ma non lo inventiamo.

*Nel frattempo:* per gli Artefatti Epici l’app **non calcola** un prezzo di vendita, e scrive perché («la A.256 non dà il coefficiente della rarità Epica»). Il prezzo di catalogo, dove c’è, resta e si usa quello.

**A.265 — La potenza della CyberArma originale** (08/11/2026). *In parole semplici:* gli Armamenti §7.10 legano la potenza al costo di Sintonizzazione (Comune 1, Non Comune 2, Rara 3…). La CyberArma originale però ha **due** SnT secondo chi la usa: 1 nell’impiego del Custode, 2 in quello del Tecnomante. Nei nostri dati la sua potenza è scritta «Comune», che corrisponde alla SnT 1 del Custode. Qual è la potenza dell’originale: Comune, Non Comune, o dipende dall’impiego, come la SnT?

*Nel frattempo:* l’app lascia «Comune» e **non ne ricava nessun prezzo**, perché ogni CyberArma originale è un pezzo unico (§7.25: «Ogni originale è un pezzo unico») e i pezzi unici, per la tua A.256, non hanno prezzo di catalogo. Oggi quindi la risposta non cambia nessun numero: serve solo perché la scheda scrive la potenza accanto al nome.

> > ### **CyberArma**

**A.260 — Il consumo delle conversioni: colpi o Round?** (08/11/2026). *In parole semplici:* nella A.251 scrivi «Configurazione CM: 1 CM \+ 1 AzP **ogni 10 colpi**; conversione NeC rossa: 1 carica \+ 1 AzP ogni 10 colpi». Nella A.236 del 02/11 avevi scritto «1 CM per **10 Round**», e anche gli Armamenti §7.25 e la Magia §28 dicono 10 Round. Sono due cose diverse: dieci Round sono dieci turni comunque vada, dieci colpi possono finire in due Round con una raffica. Quale vale?

*Nel frattempo:* l’app applica la A.251, che è la più recente: conta **10 colpi**, e nella scheda la riga dice «1 CM · 10 colpi». Riguarda soltanto le due CyberArme convertite; l’originale, che si paga con i PM personali, resta a 10 Round.

> > ### **Veicoli**

**A.264 — Quanto vale un accumulatore di ricambio scarico** (08/11/2026). *In parole semplici:* nella A.257 dici che nel valore del mezzo contano gli accumulatori di ricambio «e loro stato o carica», ma non dici di quanto cala il valore di un ricambio mezzo scarico. Il FIAT LUX ne ha due, un MEC Rosso e una CEC Verde, oggi pieni.

*Nel frattempo:* l’app toglie dal prezzo pieno quanto costa riportarlo a piena carica, usando la tariffa di ricarica che è già nei dati (30 cr per carica di un MEC, 10 per una CEC), e non scende mai sotto zero. Un MEC Rosso di ricambio a 4 cariche su 10 vale così **2.820 cr** invece di 3.000\. Se preferisci un calo diverso (una percentuale, oppure nessun calo), si cambia in un punto solo.

> > ---

> > ## **3\. Risposte ricevute, in implementazione**

**Di tuo non è rimasto niente in attesa:** tutte le risposte che ci hai dato sono applicate, e stanno fra le Risolte. Qui sotto restano soltanto cose nostre, già decise, che aspettano un pezzo di lavoro dell’app.

> > •             **A.111 — Recuperi di Umanità e Pablo Zaion.** La perdita di 2 UMN fatta per prova si toglie dal file di Pablo, con una nota, senza rimozioni o recuperi fittizi: lo fa Marcello. La regola generale sui recuperi pregressi resta in implementazione.

> > •             **A.124 — Azioni, movimento e diagonali sulla mappa.** Coincide con quello che la mappa già fa. Passa fra le Risolte quando la mappa è in uso al tavolo.

> > •             **A.127 — Attraversare i quadretti occupati.** Coincide con quello che la mappa già fa. Passa fra le Risolte quando la mappa è in uso al tavolo.

> > •             **A.128 — Terreno difficile.** Coincide con quello che la mappa già fa. Passa fra le Risolte quando la mappa è in uso al tavolo.

> > •             **A.208 — Iniziativa degli Elementali maggiori** (risposta del 30/10). Da soli tirano 1d10 con bonus 0: l’app fa già così. Manca la modalità «agisce subito dopo l’evocatore» nella plancia: è il prossimo lavoro sugli scontri.

> > •             **A.209 — Parata e Schivata dei modelli PNG** (risposta del 30/10). Serve un campo nuovo nella scheda dei nemici, con Parata e Schivata separate e il trattino per la Difesa non disponibile. *Nel frattempo:* l’app usa la Parata, come prima.

> > •             **A.210 — PX dei modelli PNG senza GS** (risposta del 30/10). Campo PX anche senza GS e «GS non assegnato» nella scheda e nel calcolatore: da fare insieme alla A.209.

> > •             **A.212 — Concessioni speciali con i loro numeri** (risposta del 30/10). Abilità, VA, PM e limiti della concessione usati da «Lancia\!», o «gestione manuale del Direttore». *Nel frattempo:* la concessione resta un testo che scrivi tu e rende lanciabile l’incantesimo; dal tablet un giocatore non la può scrivere (A.211).

> > •             **Scheda «Guanti mistici di Lucas» 1.0** (regole del 31/10/2026, con la revisione «Cariche Mistiche» del 02/11). L’app ha i Guanti nuovi: Rari, Grado III, Sintonizzazione 3; riserva Rossa da 6 CM; nessun bonus sempre attivo; Pugno mistico 1 CM con \+1 VA, Getto di fuoco 3 CM, Doppio getto 6 CM. Nel file di Lucas del 26/10 i Guanti sono «trasportati»: per avere le proprietà vanno indossati; la riserva salvata in PM si è convertita in CM una volta sola. Passa fra le Risolte quando il tuo PC è aggiornato e la scheda di Lucas l’ha confermato.

**Novità nell’app dal 05/11** (le scriviamo qui perché il documento non ha una sezione apposta). Sono tutte tue risposte applicate: il dettaglio di ciascuna è fra le Risolte.

> > •             **Le riserve non hanno più mezze cariche** (07/11). CM e NEC si contano a numeri interi. Una riserva che veniva da una conversione e mostrava «4 e 0,2 / 6 CM» adesso dice **5 / 6 CM**, una volta sola; il conto esatto resta scritto sotto il contenitore e nel file. Sui personaggi di oggi non è cambiato nessun valore, perché le riserve erano tutte piene.

> > •             **Il punto forzato fa salire il VA davvero** (07/11). Nel pannello «Sposta i punti», se forzi un punto oltre il limite il VA adesso sale; la conferma ti mostra prima la riga che resterà scritta, e nella scheda e nel foglio stampato quel VA ha accanto un **✦**.

> > •             **Celle e caricatori: costi, tempo e PI** (08/11). Togliere 1 AzP, inserire 1 AzP, sostituire 1 AzP in tutto (non la somma dei due). Un caricatore con almeno un colpo si mette come uno pieno, uno vuoto no. Il riempimento fuori dal combattimento dice **quanti minuti costa prima di confermare** e si fa solo con i caricatori estratti e con le munizioni che ci sono davvero. Ogni cella ha i suoi 2 PI, e una rotta esce dalle scorte.

> > •             **La CyberArma dice che cosa si perde** (08/11). Nel progetto, accanto alla forma, si sceglie l’alimentazione: cristallo e SIN tengono i PM personali, la riserva di CM e la conversione a NeC li tolgono insieme alle proprietà da Custode, e lo dicono prima che tu confermi. Le due conversioni le scegli soltanto tu.

> > •             **I prezzi degli Artefatti** (08/11). Ogni Artefatto ha la sua riga «Prezzo», con il conto della A.256 e la Reperibilità accanto. L’Anello con Rigenerazione 9 vale 13.500 cr. Le reliquie e i pezzi unici dicono «senza prezzo di catalogo» invece di un numero.

> > •             **Il valore del FIAT LUX** (08/11). Nella tab Veicoli tre righe: modello base 126.510 cr, dotazione extra 62.600 cr, **valore totale dell’esemplare 189.110 cr**. Il totale cambia quando qualcosa viene consumato, rimosso o trasferito.

> > •             **La Neverlost decolla e atterra** (08/11). Nel menu del token: «Decolla…» (1 AzM \+ 1 AzP) e «Atterra». A terra il movimento è 0; in volo, su una mappa terrestre, l’app dice che i movimenti non si convertono e ti dà le due strade invece di un numero di quadretti inventato.

> > •             **I Capolavori si contano da soli** (08/11). Tiri, e se hai un Capolavoro puoi ripetere il tiro: uno per prova, una ripetizione sola, e vale il secondo risultato. L’uso è dell’oggetto: se lo presti, resta usato fino alla sessione dopo.

> > •             **Le creature provvisorie si riconoscono** (08/11). Accanto alle creature che non vengono dai tuoi manuali compare una sigla tenue, «provvisoria». Restano tutte utilizzabili: è solo un promemoria che verranno sostituite.

> > •             **Niente più ritratti vecchi sui tablet** (08/11). Il ritratto di un personaggio poteva restare quello di prima fino a un giorno dopo averlo cambiato: adesso arriva sempre aggiornato.

> > ---

> > ## **4\. Da correggere nella prossima edizione dei manuali**

Decisioni già prese o errori evidenti: l’app segue la decisione, il testo dice ancora altro. Le voci barrate sono già sistemate nel manuale condiviso.

**Manuale del Giocatore**

> > •             ~~§1.2.3, §2.11, §2.14: la Prova Salvezza Volontà usa CAR~~ — fatto nel Google Doc (verificato il 26/09).

> > •             ~~§3.5.2 Esploratore: Specializzazioni dei Talenti a scelta~~ — fatto nel Google Doc (verificato il 26/09).

> > •             ~~§2.12 e §3.3: al 1° livello sono massimizzati sia i PV sia i PM~~ — fatto nel Google Doc (verificato il 28/09).

> > •             ~~§2.10, §3.8: «minimo 1» ai «2 \+ Mod INT incantesimi»~~ — fatto nel Google Doc (verificato il 28/09).

> > •             §3.5.3 Bersaglio Designato: impaginazione rotta nel PDF.

> > •             §8.6 Attivazione Tempestiva: sta prima del §8.6.1, fuori da ogni sottosezione.

> > •             ~~§2.16.3 (Cacciatore) e §2.16.4 (Esploratore): «Il binocolo non richiede batterie.» Nel §2.16.2 (Agente) il testo dice già «Il binocolo non richiede NEC.»: uniformare a «non richiede NEC».~~ — fatto nel Google Doc (verificato il 28/10).

> > •             ~~§8.6.1 e §1.6: con Successo Magistrale Migliorato il 3 naturale è Magistrale da VA finale 21 (correzione approvata il 02/10, E\&L decisione 3).~~ — fatto nel Google Doc (verificato il 27/10).

> > •             Documento «Proposta di variazione al regolamento» v1.0 del 7/10 (Talenti, Maestrie e Specializzazioni), voce **Ricarica Esperta**: dice «fino a tre» munizioni per operazione; correzione approvata il 25/10 (A.182), si legge «fino a quattro». Il Manuale del Giocatore (§8.6.4, Ricarica Migliorata) dice già 4\.

> > •             §3.1 e §3.2–§3.4: le due «Specializzazioni indicative» della Classe del §3.1 si chiamano «Indirizzi» nel §3.2 e nel §3.4. L’app usa «Indirizzi», per non confonderle con le Specializzazioni del §8.8: uniformare il §3.1.

**Manuale della Magia**

> > •             ~~Sez. 1: livello massimo incantesimi \= tabella I→3, II→8, III→11, IV→14, V→17, VI→18~~ — fatto nel Google Doc (verificato il 28/09).

> > •             ~~Armatura Mistica (scheda 22.2): togliere il riferimento alle zone del corpo coperte (A.43)~~ — fatto nel Google Doc (verificato il 28/09).

> > •             ~~Sez. 1: la frase «con i cinque Talenti liberi ordinari…» come esempio~~ — fatto nel Google Doc (verificato il 26/09).

> > •             Sez. 1, scheda di Potenziale Mistico Migliorato: manca la riga «Ambito: il Talento è riservato agli Usufruitori di Magia e non si applica all’Addestramento Taumaturgo» della risposta A.2.2. La regola è comunque scritta nel paragrafo «Conoscenza e livello massimo»: solo testo.

**Manuale degli Armamenti**

> > •             §7.10, SnT degli Artefatti con sole proprietà passive — **correzione approvata da Davide il 21/10**: la regola «solo proprietà passive → SnT 0» va dichiarata soggetta alla maggiorazione prevista per i benefici sui PM. L’Hachimaki della Disciplina Interiore tiene quindi SnT 1 (0 di base \+ 1 per la riduzione del costo in PM). Da recepire nel §7.10 e in Magia §24.2; Equipaggiamento §10.10 e Magia §28.1 lo dicono già. L’app si comporta già così.

> > •             §7.1.9, §7.8, §7.9: «Imperiali» e «Imperial» (§7.4.8, §7.14). L’app usa «Imperial».

> > •             §7.9: mancano le tabelle prezzi delle armi a distanza di Fratellanza, Imperial e Mishima (i prezzi sono nelle schede del §7.8; le 146 righe presenti coincidono).

> > •             §7.13.2 / §7.15.3, §7.16.2, §7.17.3: «Articolazione da tiro» e «Articolazione di tiro».

> > •             §7.16.2 Armatura Ashigaru: «Manutenzione agevolata» è la «Manutenzione semplice» del §7.11.4?

> > •             §7.11.5: «Agenti equipaggi e Guardie», manca la virgola.

> > •             §7.4.1 / §7.4.2 Scudo Punisher e variante Wächter: la Taglia «Grande» o «Medio». Con la tua A.195 è una categoria sola: scrivere «Medio (detto anche Grande)».

> > •             ~~§7.4.10 Scudo delle Guardie Sacre: con la lama estratta il danno è 1d6+1+1d4 Naturale~~ — fatto nel Google Doc (verificato il 28/09).

> > •             §§7.25.3–7.25.4, CyberArma convertita (riserva interna di CM o NeC): il consumo è scritto «1 carica + 1 AzP per 10 Round di fuoco». Con la tua A.251 del 06/11 si contano i **colpi**: «ogni 10 colpi». L’app segue la risposta; da allineare il §7.25 e la scheda «CyberArma Opzioni per Dimitri» (e Magia §28, se lo ripete). Resta da chiarire quanti colpi vale una raffica (A.260).

> > •             §7.8, schede di M310 e SA SG2001: indicare che usano un caricatore amovibile specifico e che la sostituzione con un caricatore pronto costa 1 AzP (E\&L 19: «va esplicitata nelle relative schede di catalogo»).

> > •             §7.20.5, Trasformatori di ricarica NEC: «Peso, Integrità e Reperibilità dei nuovi modelli restano da definire», mentre l’Equipaggiamento §5.4.7 li dà (2 / 4 / 40 kg; 4 / 6 / 12 PI; Non comune / Non comune / Rara; PS 12 / 12 / 14; NC / RA / RA). Allineare il §7.20.5 al §5.4.7.

**Manuale dell’Equipaggiamento**

> > •             §4.1 Comunicatori: «Ogni modello comprende microfono, auricolare, batteria carica, cavo e alimentatore». Dalla 0.5 l’alimentazione è un NEC Verde (compatto per il comunicatore personale, standard per quello da squadra e per la stazione radio), come dice il paragrafo «Alimentazione e riservatezza» dello stesso §4.1. Sostituire «batteria carica» con «NEC Verde carico».

> > •             §10.2, prezzi degli Artefatti, e §10.1/§7.10, rarità e Grado: con la formula della tua A.256 («costo di costruzione × 3 × coefficiente di rarità») i prezzi di catalogo già scritti non tornano. Esempio con i numeri: la **Batteria Mistica da 5 PM Rossa** costa 650 cr di costruzione ed è **Comune** (coefficiente 1); la formula dà 650 × 3 × 1 = **1.950 cr**, il catalogo dice **1.000 cr**. L’app tiene buono il prezzo del manuale e scrive il calcolo accanto; quale dei due vale è la A.261. Nella stessa tabella manca il coefficiente dell’**Epica** (A.262) e il Grado dell’**Anello con Rigenerazione 9** non corrisponde alla sua rarità (A.263).

**Manuale dei Mostri**

> > •             ~~§5.2: dice ancora «5 punti Abilità liberi a ogni Grado»; dopo la A.90 va portato a 7\.~~ — fatto nel Google Doc (verificato il 28/10).

> > •             **Il Google Doc dei Mostri è fermo alla 0.23**; il riferimento è il file Word «SIMPLY\_RPG\_Manuale\_dei\_Mostri\_v0.46.docx» (lo dice anche la Revisione NEC: «Google Doc precedente non allineato per timeout»). L’app segue il Word.

> > •             Mostri 0.46, fauna di Iris (7.11, 7.13–7.19): i PX sono ancora «provvisori»; l’app li ha messi com’è scritto, segnati «(provvisori)». **Lorath** Veterano 50 · **Piovra gigante** Eroe 70 · **Granchio modificato** Inesperto 20 · **Raptor di Fuoco** giovane Inesperto 20, adulto Veterano 50 · **Turk** Inesperto 20 · **Vespe del Deserto** Principiante 10 (per gruppo di 10\) · **Iena mutata** Esperto 30, **Capobranco** Veterano 50 · **Murene della Roccia** cucciolo Inesperto 20, giovane Inesperto 20, adulta Esperto 30, Madre Veterano 70\. Da confermare quando li avrai verificati al tavolo; basta dire quali cambiano (si corregge un numero per scheda). *Nel frattempo:* valgono i numeri scritti.

> > •             Capitolo 1–6 della 0.46: «nei coni la larghezza finale è metà della lunghezza, anche con mezzi Q». Sulla mappa l’app lascia al master l’ampiezza finale del cono (decisione 142, A.138): va bene così, o per i coni delle creature l’app deve proporre metà della lunghezza? *Nel frattempo:* nessuna modifica.

> > •             7.19.5 «Bozzoli di cristallo» ha una tabella dei dati come le creature, ma non è una creatura (PV, Difese e Salvezze mancano): nell’app non è nel Bestiario, solo nel testo.

> > •             Lorath 7.11 nella 0.46 è un profilo diverso dalla 0.13 (PV 40, AR 4, Iniziativa \+2, 2 AzP, ingombro 1 × 2 Q): l’app ha preso la 0.46.

> > •             Capitolo 8: delle 341 schede di nemici che l’app usa, **309 vengono dalla 0.46** e **32 le avevamo inserite noi** (30 umani costruiti come PG, fra cui gli Eretici, e 2 esempi del Tavolo), più il Bestiario proposto di Marcello. Con la tua A.258 l’app le segna «provvisorie» e aspetta quelle del manuale, **gli Eretici dell’Oscura Simmetria per primi**.

> > •             Capitolo 8, «PNG generici»: sono compilati 10 modelli su 25 (mancano Lavoratori, Studiosi, Taumaturghi). Nel testo del capitolo 8 il numero «285 creature e 10 modelli PNG» è già giusto.

> > •             Tabella dei PNG generici del Lottatore: la Parata «—» del I Grado e i valori 15, 18, 20, 23, 25 non sono più quelli della tua A.206 (12, 17, 20, 22, 25, 27 con la Parata a mani nude): da riallineare.

> > •             Schede dei draghi e del Dragomedusa: il corpo è scritto «lunghezza × larghezza» (6 × 4, 10 × 6, 16 × 10, 14 × 10\) mentre il Giocatore e l’app contano «larghezza × lunghezza» per le altre creature (Spazio 3 × 10 per la Covata): un’avvertenza nel capitolo 8 eviterebbe l’inversione (A.204, A.222).

**Manuale dei Veicoli**

> > •             ~~Scheda «ASA Scout MK4»: il Doc si chiamava «scheda v0.4», ma l’intestazione dentro diceva ancora «Edizione 0.2»~~ — fatto nella 0.6 (verificato il 31/10).

> > •             Scout 0.6, riga «Alimentazione ricaricabile»: scrive «1 MEC Rosso; 1.000 UER; 10 cariche» e «1 CEC Verde; 100 UEV; 10 cariche»: la UE è un’unità del lotto 1 dei NEC, ormai sostituita dalle cariche (il registro NEC 2.10 e il Manuale dei Veicoli 0.10 §9.1 dicono «100 UER in dieci cariche» solo per l’Autovettura). Se la UE resta come dato di riferimento va detto; se no, toglierla dalla scheda.

> > •             Neverlost, capitolo del Manuale dei Veicoli e scheda tecnica 1.6: nell’app vale la scheda per la MAN («MAN tecnologica −1») e per il «Distacco da un aggancio esterno» (contro «MAN base −1; Assetto armonico \+1 → 0» e «Distacco da filamenti» del manuale). Il registro del manuale ha in più il Circuito Bianco, che la scheda (Parte I) non tratta. Resta da allineare il testo del manuale.

**Risposte superate in un punto da una risposta più recente** (perché chi le rilegge non le prenda per buone). Nessuna di queste è riaperta: restano risolte, con scritto che cosa è stato superato e da quale numero.

> > •             **A.158 (13/10).** Permetteva al Tecnomante di costruire una CyberArma originale. Con la tua risposta A.235 del 02/11 **solo i Custodi costruiscono gli originali**; il Tecnomante studia e modifica un originale esistente. Il §7.25 del 02/11 lo dice già. Se la A.158 è citata altrove (E\&L, schede), va aggiornata.

> > •             **A.166 (16/10).** Diceva che la forma a frusta usa Immobilizzare come la frusta. Con la A.235 la frusta **non dà da sola Immobilizzare a distanza**: le Manovre seguono la forma e i requisiti normali, senza le proprietà della frusta commerciale. Il resto della A.166 (famiglie per forma) resta.

> > •             **A.193 (31/10) e A.228 (02/11).** Dicevano che una riserva convertita conserva la frazione (7,75 cariche, «4 e 0,2 / 6 CM»). Con la tua **A.252** del 06/11 le riserve sono **numeri interi**: la frazione nata da una conversione sale all’intero superiore, una volta sola, e il valore di prima resta nello storico. Resta valido il resto: si converte per frazione, non si ripete, e un uso costa pieno.

> > •             **A.215 (02/11).** L’esempio dell’Axis diceva che si riempie il caricatore **nell’arma**. Con la tua **A.244** del 06/11 si riempiono solo i caricatori **estratti**, 1 minuto ogni 50 colpi trasferiti o frazione. L’esempio va riscritto; il resto della A.215 (celle tolte, costo del cambio) resta.

> > •             **A.223 (03/11) e A.238 (03/11).** La A.254 del 06/11 **conferma** la A.223 (la testa su qualunque quadretto della sagoma, mai fuori) e aggiunge che non si sposta fra un attacco e l’altro. La A.253 **supera un punto** della A.238: i movimenti **in volo** non si convertono fra le due scale, e l’app non scrive più 80 Q Base per gli 8 Q Tattici della Neverlost.

> > •             **A.226 (05/11).** Diceva che il valore dell’esemplare resta vuoto finché non lo stimi tu. Con la tua **A.257** del 06/11 l’app lo **calcola** in tre righe (modello base, dotazione extra, totale) e segue l’inventario; il tuo valore stimato prende il posto della riga del modello base.

> > •             **A.236 (02/11).** Dava il consumo della CyberArma convertita «per 10 Round». Con la **A.251** si contano i **colpi**: ogni 10 colpi.

> > •             **A.233 (05/11).** Metteva il **Capolavoro** fra le cose «da applicare al tavolo», perché il suo limite non si riduceva a un numero. Con la **A.259** si riduce, e adesso l’app lo conta.

**Da rileggere (testi scritti da noi, non dal manuale)**

> > •             **Righe brevi dei Talenti nuovi:** per **Arti Marziali Migliorate** e **Sport** il riquadro «Da scegliere» mostra una riga breve scritta da noi (il testo completo, preso dal manuale, si apre toccando il nome). Se la riga non ti va, la riscriviamo come vuoi.

> > •             **Talenti nella stampa**: il foglio 2 stampa la prima frase di ogni Talento. Se preferisci un riassunto tuo, si aggiunge un campo.

> > ---

> > ## **5\. Manuali che l’app aspetta**

> > •             Dal 26/09 i manuali sono Google Doc condivisi: l’app li rilegge a ogni sessione, non servono più i PDF.

> > •             **Recepiti fino al 09/11:** Giocatore **0.54** (elenchi delle Specializzazioni per Classe, Combattimento Senz’Armi, Indirizzi di Classe, frequenze degli usi del §3.2, Capolavoro dell’Artigiano), Magia **1.11**, Armamenti **0.74** (energia, CyberArma §§7.25–7.25.4, Guanti di Lucas §7.24), Equipaggiamento **0.30**, registro NEC **2.11**, riepilogo «Energia per l’app» **1.0**, revisione «Cariche Mistiche» del 02/11, Manuale dei Veicoli **0.10** (con le note del 03/11 su Scout «Fiat Lux» e Neverlost), scheda dello Scout **0.6** (prezzo, corredo, munizioni e riparazioni compresi), scheda tecnica della Neverlost **1.6**, Punisher Wächter **1.2**, Manuale dei Mostri **0.46** (Word; dal Google Doc 0.23 del 03/11 il paragrafo sul Dragomedusa), schede «Guanti mistici di Lucas» **1.0** e «CyberArma Opzioni per Dimitri» **1.0**, documento «Talenti, Specializzazioni e Maestrie» **v1.1** (uguale all’app). Dal 02/11 nessun manuale è cambiato.

> > •             Dal Manuale del Direttore (0.46) l’app aspetta ancora le regole dettagliate di malattie e cure (A.119) e i modelli PNG delle altre quindici Classi (Lavoratori, Studiosi, Taumaturghi).

> > •             **Gli Eretici dell’Oscura Simmetria**, e in generale le creature che sostituiranno quelle inserite prima da noi (A.258): finché non arrivano, l’app usa quelle di adesso e le segna «provvisorie».

> > •             Il drone leggero «di riferimento» non ha una scheda con prezzo e peso: l’app non lo mette nel catalogo finché non c’è.

> > •             La linea del Getto di fuoco dei Guanti non si disegna da sola sulla mappa: si mette a mano con i template.

> > •             Il **coefficiente di rarità dell’«Epica»** manca nella tabella della A.256 (A.262): gli otto Artefatti Epici del catalogo restano senza prezzo di vendita calcolato.

> > ---

> > ## **6\. Risolte**

Voci con risposta recepita e funzione implementata nell’app (o chiuse). La data è quella dell’implementazione.

> > •             **A.259 — L’uso dei Capolavori** (risposta del 06/11; app aggiornata l’08/11/2026). *In parole semplici:* ogni Capolavoro ha **il suo** uso, una volta per sessione: un personaggio con tre Capolavori ha tre usi, uno per oggetto. Il punto che ha deciso tutto il resto è l’ultimo della tua risposta — «se l’oggetto viene trasferito, resta già usato» —: vuol dire che il contatore è **dell’oggetto**, non della scheda, e l’app lo tiene lì. Se passi un Capolavoro già usato a un compagno, sulla sua scheda risulta già usato e torna disponibile solo con la sessione nuova. Nella finestrella del tiro, dopo aver tirato, compare «Ripeti con \<nome del Capolavoro\>»: se ne usa **uno solo per prova**, il tiro si ripete **una volta sola**, e **vale il secondo risultato anche se è peggiore del primo** — l’app non propone mai di scegliere il migliore. Accanto al pulsante c’è scritto quello che l’app non giudica e decidi tu: se la prova è pertinente, se il Capolavoro ne è lo strumento principale, se non è offensiva. «Nuova sessione» rinnova gli usi e ti dice quanti sono. **Il Capolavoro esce dall’elenco dei «Da applicare al tavolo» della A.233**: prima c’era perché il suo limite non si riduceva a un numero, adesso si riduce e l’app lo conta.

> > •             **A.258 — Gli Eretici e il vecchio catalogo dei nemici** (chiarimento **provvisorio** del 06/11; app aggiornata l’08/11/2026). *In parole semplici:* **nessun profilo è stato toccato.** Abbiamo verificato uno per uno che l’app faccia già quello che confermi: l’Eretico corrotto **Minore** ha il modulo «Toccato» (Sussurro continuo, Esposizione alla Corruzione), il **Boss** ha «Consacrato» (\+2 AR magica, Sguardo del vuoto, Grido dell’Oscura Simmetria, Presenza terrificante), e i gradi **Semplice** e **Medio** non ricevono nessun Dono (A.117). *Poiché il tuo è un chiarimento provvisorio*, l’app adesso **lo dice**: dove si vede una creatura che non viene da un tuo manuale compare una sigla tenue, «provvisoria», e passandoci sopra: «Creatura provvisoria: non è canonica del bestiario e verrà sostituita da quelle create per il Manuale (A.258).» Si vede nell’elenco del bestiario quando aggiungi un nemico, nella pagina online, in «Crea nemico» e nella mini-scheda. Non è un allarme: è un’indicazione. **Niente è stato cancellato e niente disattivato**: finché non arrivano le creature nuove queste servono al tavolo e funzionano come prima. L’app riconosce una creatura provvisoria dalla sua fonte e non da un elenco scritto a mano, così quando arriveranno le creature nuove il segno sparirà da sé. *Il conto di quello che è a scadenza:* delle 341 schede di nemici, **309 vengono dal Manuale dei Mostri 0.46** e **32 erano state inserite da Marcello** — 30 umani costruiti come PG (10 tipi fra cui l’Eretico, in Recluta, Veterano ed Élite) e 2 esempi del Tavolo del Master. A questi si aggiunge il **Bestiario proposto** per intero (8 basi, 22 creature pronte e i moduli), che è una proposta di Marcello e non un tuo manuale. **Gli Eretici come creature dell’Oscura Simmetria restano da completare**, come scrivi.

> > •             **A.255 — La Murena eterea dentro la roccia** (risposta del 06/11; app aggiornata l’08/11/2026). *In parole semplici:* può **finire il movimento dentro la parete** e restarci. Finché è **completamente immersa** — cioè finché ogni suo quadretto è roccia: ne basta uno fuori e vale tutto il normale — non ha linea di vista né d’effetto verso l’esterno, **non può attaccare né essere bersagliata** e non percepisce oltre la parete. Sulla mappa «Attacca\!» è spento, e il motivo dice anche come se ne esce: deve emergere quanto basta spendendo il normale movimento, e se non lo esaurisce rientra con il residuo nello stesso Round (questo funzionava già: è il movimento di sempre, che la forma eterea spende per attraversare la roccia). Se la rendi **corporea dentro la roccia**, nel menu del token compare «Resa corporea: proponi l’uscita…»: l’app ti **propone** le caselle libere più vicine alla superficie come pulsanti, e scegli tu, perché a parità di distanza decidi tu. Lo spostamento non provoca attacchi di opportunità e lo Stato **Prona** si segna nella plancia.

> > •             **A.254 — Dove si può mettere la testa della Madre delle Murene** (risposta del 06/11; app aggiornata l’08/11/2026). *In parole semplici:* **conferma quello che l’app già faceva** (A.223): qualunque quadretto della sagoma corrente, anche uno centrale, e mai uno fuori — l’app lo rifiuta e lo dice. La **novità** è quando la posizione può cambiare: quando la creatura si muove, ruota, cambia configurazione o assume una posa nuova, **non fra un attacco e l’altro** per cercare una linea più favorevole. L’app adesso se ne accorge: se la creatura ha già attaccato in questo Round, spostando la testa compare l’avviso che te lo ricorda, con l’elenco dei motivi legittimi. **Avvisa, non blocca:** una posa nuova e una linea cercata l’app non le sa distinguere, e la plausibilità anatomica la giudichi tu; se procedi, la testa si sposta e Ctrl\+Z annulla. Il segnalino continua a spostare soltanto l’origine di attacchi, soffio, aura ed effetti centrati sulla testa: movimento, spazio occupato e portata non cambiano.

> > •             **A.253 — Decollo e atterraggio della Neverlost** (risposta del 06/11; app aggiornata l’08/11/2026). *In parole semplici:* **a terra la nave non rulla: movimento 0**, e l’app non la lascia più spostare di un quadretto stando a terra. Il **decollo verticale** è nel menu del token sulla mappa, «Decolla…»: manovra complessa, **1 AzM \+ 1 AzP del pilota**, normalmente senza prova; la conferma ti ricorda i tre casi in cui la prova serve (spazio ristretto, attacco in corso, danni), così la tiri al tavolo prima di confermare. Nel Round del decollo la nave **sale in stazionamento e non si sposta di lato**; dal Round successivo è in volo da sola, senza che tu debba segnare niente. **I movimenti in volo non si convertono:** su una mappa terrestre l’app non mostra più un numero di quadretti — scrive che non si convertono e ti dà le due strade, passare alla scala tattica oppure uscire dalla mappa. «Atterra» è l’altra voce: manovra complessa, e conclude il movimento del Round. **Questo supera la parte della A.238** in cui l’andatura della nave si convertiva (8 Q Tattici \= 80 Q Base): quella conversione era un difetto e non c’è più. Tutto il resto della A.238 resta: 34 × 20 Q Base, la rotazione a 45°, lo scafo che fa da ostacolo, il combattimento aereo in Q Tattici.

> > •             **A.257 — Quanto vale il FIAT LUX** (risposta del 06/11; app aggiornata l’08/11/2026). *In parole semplici:* il prezzo di catalogo dello Scout standard resta 126.510 cr, e il valore dell’esemplare adesso si calcola. Nella scheda del mezzo ci sono **tre righe separate**, non un numero solo: **Modello base 126.510 cr**, **Dotazione extra 62.600 cr**, **Valore totale dell’esemplare 189.110 cr**. La dotazione extra è voce per voce: kit trauma 3.000, pistola sanitaria 3.500, dieci cartucce di naniti 50.000, sei copriruote di Petra 900, i 400 colpi in più della M606 1.200, il MEC Rosso di ricambio 3.000 e il CEC Verde di ricambio 1.000\. **Non è un numero scritto una volta: segue l’inventario.** Quello che si conta da munizioni, pezzi dei rinforzi e riserve cambia da solo quando sparate, perdete un copriruota o trasferite un ricambio; le altre voci hanno − e \+ nella riga. Consumare due cartucce di naniti fa scendere il totale a 184.110 cr. Un accumulatore di ricambio conta anche il suo stato (vedi la A.264). Il **valore stimato** che puoi scrivere tu prende il posto della riga del modello base, perché il FIAT LUX è antico e può valere meno. **Questo supera la parte della A.226** in cui il valore stimato restava vuoto perché non c’era modo di calcolarlo: il modo adesso c’è, e il tuo valore stimato resta il tuo.

> > •             **A.256 — Il prezzo di vendita degli artefatti** (risposta del 06/11; app aggiornata l’08/11/2026). *In parole semplici:* prezzo di vendita \= costo completo di costruzione × 3 × coefficiente di rarità (Comune 1, Non comune 1,5, Raro 2, Molto raro 3, Leggendario 5), arrotondato per eccesso ai 50 cr successivi; un pezzo unico o una reliquia non ha prezzo di catalogo. L’**Anello con Rigenerazione 9** aveva nei dati la rarità sbagliata — «Raro» invece di «Molto raro» —: corretta, e adesso vale **13.500 cr** (1.500 × 3 × 3), come dici tu. Abbiamo ricontrollato tutte le altre rarità del catalogo contro i manuali: era sbagliata una sola altra voce, la **CyberArma convertita a NeC**, che ha SnT 3 e quindi è Rara, non Non comune. Tutto il resto corrispondeva. Scrigno del Primo Giuramento, Tomo dei Guardiani e le tre voci della CyberArma sono segnati «Unico o reliquia»: la scheda scrive «senza prezzo di catalogo» invece di un numero. Dove il manuale un prezzo ce l’ha, resta quello, e il prezzo di vendita calcolato si legge accanto (vedi la A.261). **Rarità e reperibilità restano separate:** la Reperibilità è sempre accanto al prezzo, e comprare qualcosa che non ha una Reperibilità indicata avvisa — «il prezzo non garantisce un venditore» — senza impedirlo, perché decidi tu se l’oggetto si trova.

> > •             **A.251 — Come si alimenta la CyberArma modificata** (risposta del 06/11; app aggiornata l’08/11/2026). *In parole semplici:* due famiglie di modifiche che non si comportano allo stesso modo. **Cristallo sostituito** e **modulo SIN inserito** non toccano l’alimentazione: l’arma continua a potersi alimentare con i PM personali, conserva le proprietà da Custode, e le due cose stanno insieme. **Riserva interna di CM** e **conversione a NeC** sono conversioni energetiche: impediscono l’uso dei PM personali, fanno perdere le proprietà da Custode e non si cumulano fra loro; consumano 1 CM, o 1 carica NeC Rossa, più 1 AzP ogni 10 colpi (vedi la A.260). Nel progetto della CyberArma c’è ora la scelta dell’**Alimentazione**, accanto a quella della forma: ogni opzione dice che cosa fa e **che cosa si perde, prima di confermare**, e la conferma di una conversione lo ripete per esteso. Le due conversioni le autorizzi soltanto tu dal tuo PC: dal tablet di un giocatore il server non le lascia scrivere. Se scegli una conversione, l’arma che consegni prende il profilo giusto (riserva di CM, o NeC) e «Consegna l’arma» ti avvisa della perdita. Senza scelta l’arma resta a PM personali, come il progetto base di Dimitri.

> > •             **A.245 — Le celle danneggiate** (risposta del 06/11; app aggiornata l’08/11/2026). *In parole semplici:* ogni singola cella ha **2 PI** suoi, non più quelli della voce dell’Inventario. Una cella danneggiata **si separa dalla pila** e si segue da sola, con le sue cariche e i suoi PI («Danneggia una cella» nella scheda). A **0 PI** è distrutta e inutilizzabile: resta scritta — non sparisce in silenzio — ma esce dalle scorte utilizzabili, non si inserisce e non si ricarica con il trasformatore, e nello storico del personaggio resta la riga «Cella distrutta (0 PI, A.245): … — fuori dalle scorte utilizzabili, normalmente non riparabile.» Il «normalmente» è rispettato: il pulsante dei PI resta, perché tu possa decidere altrimenti, ma l’app non lo propone come cosa ordinaria. I personaggi salvati non cambiano forma: una cella intera resta il numero delle sue cariche.

> > •             **A.244 — Quanto tempo per riempire i caricatori** (risposta del 06/11; app aggiornata l’08/11/2026). *In parole semplici:* fuori dal combattimento ci vuole **1 minuto ogni 50 colpi trasferiti, o frazione, contati sul totale dell’operazione**: 120 colpi in un colpo solo sono 3 minuti, non tre operazioni da 1 minuto. Il tempo si legge **prima di confermare**, insieme a quanti colpi si spostano («Riempi i caricatori (\+120 colpi · 3 minuti)»). Le due condizioni si controllano entrambe: i caricatori devono essere **estratti** (quello nell’arma va tolto prima, e l’app lo dice) e le munizioni devono essere **davvero nell’inventario** (altrimenti non trasferisce niente e dice perché). **Questo cambia l’esempio dell’Axis della A.215**, dove il caricatore si riempiva mentre era nell’arma: adesso si toglie, si riempie, si rimette; i colpi finali sono gli stessi.

> > •             **A.250 — Il caricatore parziale è pronto** (risposta del 06/11; app aggiornata l’08/11/2026). *In parole semplici:* un caricatore (o una cella) compatibile, accessibile e con **almeno un colpo** è pronto anche se non è pieno: stesso costo d’azione di uno pieno e stesso beneficio di Ricarica Rapida o Ricarica Esperta, con i colpi residui conservati. L’app faceva già così dal 3 novembre, in attesa della tua risposta: adesso la regola è scritta nei dati e il promemoria della Ricarica Rapida lo dice. La cosa che mancava: **un caricatore vuoto non è pronto** — non entra più da solo e il pulsante lo spiega.

> > •             **A.243 e A.249 — Quanto costa togliere e mettere** (risposte del 06/11; app aggiornata l’08/11/2026). *In parole semplici:* celle, pacchi e caricatori hanno le stesse tre regole. Estrarre soltanto costa 1 AzP; inserirne uno pronto in un’arma vuota costa 1 AzP; la sostituzione diretta — fuori il vecchio, dentro il nuovo — resta **un’unica operazione da 1 AzP complessivo**, non la somma delle altre due. Quello che esce conserva esattamente la carica o i colpi che aveva. Nella scheda i tre costi si leggono sotto le celle e nei titolini dei pulsanti dei caricatori. Prima l’app mostrava solo il costo del cambio e diceva che per gli altri due il manuale non dava un numero.

> > •             **A.248 — Chi riassegna i punti divenuti inefficaci** (risposta del 06/11; app aggiornata il 07/11/2026). *In parole semplici:* li rimette **il giocatore**, dalla sua scheda, nello stesso livello in cui erano stati spesi e con i limiti di allora — non serve il Direttore, e si può fare anche da un tablet. L’app faceva già così dalla A.107: quello che mancava era la registrazione, che adesso c’è. Nello storico del personaggio resta una riga come «Riassegnati 1 Punto Abilità del 4° livello: Atletica 1 (PC, 07/11 19:37)»: dice quanti punti, in quale livello, dove sono andati e quando.

> > •             **A.247 — Il punto forzato oltre il limite** (risposta del 06/11; app aggiornata il 07/11/2026). *In parole semplici:* quando il Direttore, dopo l’avviso, forza un punto oltre il limite della categoria, adesso il VA dell’Abilità **sale davvero**. Il limite della categoria non cambia: l’eccezione vale per quell’Abilità di quel personaggio, e un punto non forzato di un altro livello continua a fermarsi al limite. **Questo supera il comportamento di prima** (02/11), quando il punto restava registrato ma il VA si fermava al limite. Prima di forzare, l’app chiede una conferma che dice per esteso che cosa cambierà e quale riga resterà scritta — il pulsante è «Forza l’eccezione», non un «Procedi comunque» qualunque. Nel registro «Modifiche del master» resta una riga a sé: «Eccezione al limite (A.247): Difese nel 4° livello da VA 11 a VA 12, oltre il limite 11 (Professionali) — forzata dal Direttore (PC, 07/11 19:33)». Nella scheda e nel foglio stampato quel VA ha accanto un **✦**, e il «Calcolo» dice quanti punti sono stati forzati e qual era il limite.

> > •             **A.252 — Niente frazioni nelle riserve** (risposta del 06/11; app aggiornata il 07/11/2026). *In parole semplici:* CM e NEC si contano solo a unità intere. Le frazioni nate dalle conversioni delle regole di prima salgono all’intero superiore **una volta sola** (4,2 / 6 → 5 / 6) e il valore di prima resta scritto nello storico, dove dice da dove si viene. Ricaricare 1 CM costa 6 PM a 3:1, 4 a 2:1, 2 a 1:1, come l’app faceva già. Sui file di oggi non è cambiato nessun valore: le riserve dei personaggi e del FIAT LUX erano tutte piene. **Questa decisione supera la A.228 e le parti della A.193 che tenevano la frazione nella riserva** (le due voci qui sotto lo dicono).

> > •             **A.246 — La Corruzione del frammento Viola** (risposta del 06/11; verificata nell’app l’08/11/2026). *In parole semplici:* la Corruzione segue il frammento Viola rimosso: la CyberArma perde «Corruzione 1» e il frammento estratto la conserva, con lo stato precedente consultabile nello storico. È esattamente quello che l’app faceva già, quindi non è stato necessario cambiare niente: quando premerai «Consegna l’arma» per la CyberArma di Dimitri, il frammento esce come oggetto a parte con la sua Corruzione e l’arma resta senza, e la riga di prima resta nello storico dell’esemplare.

> > •             **A.233 — Capitolo, scena e rinnovo degli usi** (risposta del 02/11; app aggiornata il 05/11/2026). *In parole semplici:* il capitolo è distinto dall’Atto dei PX. «Nuova scena» e «Nuovo capitolo» li dai tu dalla plancia, con una conferma che dice quanti usi tornano e di chi, e un «Annulla». Rinnovano sui tablet solo gli usi per scena o per capitolo e non toccano PM, munizioni né altre risorse. Gli usi per combattimento tornano da soli a uno scontro nuovo, quelli per sessione con «Nuova sessione», quelli al giorno e alla settimana con il Calendario. Hacker conta ogni sistema a parte. **Aggiornata l’08/11/2026:** il **Capolavoro** era fra le cose «da applicare al tavolo» perché il suo limite non si riduceva a un numero; con la A.259 si riduce, e adesso l’app lo conta (un uso per ciascun Capolavoro, per sessione).

> > •             **A.117 — L’Eretico corrotto** (risposta del 03/11; app aggiornata il 05/11/2026). Ai gradi Semplice e Medio il profilo umano senza Doni automatici, con l’eccezione «più fragile del grado»; nome e corruzione non danno poteri, danni Magici o altre capacità; i Doni li assegni tu nel singolo profilo. L’app dava ancora i Doni a quei due gradi: corretto. Per il Minore e il Boss la A.258 del 06/11 ha confermato quello che l’app fa: Minore con «Toccato», Boss con «Consacrato».

> > •             **A.226 — Lo Scout della campagna, FIAT LUX** (risposte del 02/11 e del 03/11; app aggiornata il 05/11/2026). FIAT LUX e «Scout dei PG» sono lo stesso veicolo: nell’app era già uno solo (si chiamava ancora «ASA Scout MK4»; il nome si scrive dalla tab Veicoli). Lo standard della scheda 0.6 è il catalogo: 126.510 cr, riparazioni Corpo 300, Propulsione 100, Motore 300 cr per PI. Il FIAT LUX conserva munizioni (i 400 colpi in più), danni, consumi e la dotazione che ha. Prezzo di catalogo e valore stimato sono distinti: il valore lo stimi tu, finché non c’è l’app scrive «da stimare». **Superata in un punto dalla A.257 l’08/11/2026:** il valore corrente dell’esemplare adesso si calcola e si mostra in tre righe (modello base, dotazione extra, totale); il valore stimato che scrivi tu resta e prende il posto della riga del modello base.

> > •             **A.227 — I ricambi del FIAT LUX** (risposta del 02/11; app aggiornata il 05/11/2026). Il Banco Rosso di ricambio è un MEC Rosso, il Modulo Verde una CEC Verde, con la loro frazione (sul FIAT LUX: 10 cariche ciascuno), una volta sola, con i valori di prima nello storico; senza frazione certa li verifichi tu.

> > •             **A.228 — Le frazioni** (risposta del 02/11; app aggiornata il 05/11, **superata dalla A.252 il 07/11/2026**). La frazione **non resta più nella riserva**: con la A.252 le riserve sono numeri interi e ciò che restava di una conversione sale all’intero superiore, una volta sola («4 e 0,2 / 6 CM» è diventato «5 / 6 CM»). **Resta valido** che ogni uso costa pieno e che la conversione non si ripete; il conto esatto si legge nello storico.

> > •             **A.239 — Le munizioni della Neverlost** (risposta del 02/11; app aggiornata il 05/11/2026). Dotazione standard 600 proiettili per mitragliatore e 6 missili, solo come riferimento; le quantità della nave le confermi tu, finché mancano l’app scrive «da verificare dal Direttore».

> > •             **A.240 — La Neverlost non è a listino** (precisazione del 03/11; app aggiornata il 05/11/2026). Esemplare unico: nessun prezzo di catalogo, prezzo e fascia da definire, e dal suo profilo non si crea un’altra nave.

> > •             **A.118 — La stampa dei veicoli del gruppo** (risposta del 03/11; app aggiornata il 05/11/2026). Nella stampa del gruppo (nuovo pulsante «Stampa del gruppo» nel Tavolo) ogni veicolo del gruppo compare una volta sola; nella stampa di un PG è facoltativo e preselezionato solo per chi lo guida; stampare non duplica niente.

> > •             **Anello con Rigenerazione 9** (configurazione del 02/11; app aggiornata il 05/11/2026). Riserva Verde da 5 CM, 5 CM per uso al termine di 3 ore continue (se si interrompe non consuma e non fa effetto), poi 5 giorni; ricarica 30, 20 o 10 PM a 3:1, 2:1 o 1:1; Grado III, SnT 3, Esclusiva. È nel catalogo degli Artefatti, non assegnato a nessuno. Il prezzo è la A.256.

> > •             **A.222 — Il Dragomedusa** (risposta del 03/11; app aggiornata il 04/11/2026). Manuale lunghezza × larghezza, app larghezza × lunghezza: giovane 6 × 4 Q Base (9 × 6 m) → 4 × 6 nell’app; adulto 14 × 10 → 10 × 14; pedine in Q Tattici 1 × 1 e 2 × 1; ingombro e portata dei filamenti distinti.

> > •             **A.223 — La testa della Madre delle Murene** (risposta del 03/11; app aggiornata il 04/11/2026). Sul muso, segue spostamenti e rotazioni; il Direttore sposta il segno a mano sulla sagoma («Sposta la testa…», «Testa automatica»); distanze e linee di tiro partono dalla testa confermata, senza movimento né portata in più. Dove si può mettere: A.254.

> > •             **A.224 — La roccia** (risposta del 03/11; app aggiornata il 04/11/2026). Materiale Roccia per i muri a quadretti e per quelli disegnati; la attraversa solo chi ha la capacità (la Murena eterea), non le porte né i muri di altro materiale; per gli altri è un muro e ferma la vista. Se può fermarsi dentro: A.255.

> > •             **A.225 — Le distanze nella scala della scena** (risposta del 03/11; app aggiornata il 04/11/2026). Ogni distanza tiene la sua unità e si converte una volta sola (1 Q Tattico \= 10 Q Base): movimento, volo, zone di controllo, linea di tiro, template (un soffio 12 × 1 Q Tattici è 120 × 10 in Q Base); frazioni esatte; le pedine no.

> > •             **A.238 — La Neverlost in una scena in Q Base** (risposta del 03/11; app aggiornata il 04/11/2026). 34 × 20 Q (51 × 30 m), girabile di 45°, lo scafo ostacolo secondo la sagoma vera; limite dei veicoli portato a 34; combattimento aereo in Q Tattici. Se a terra si muove: A.253.

> > •             **A.242 — Il documento Talenti, Specializzazioni e Maestrie v1.1** (condiviso il 03/11, confrontato il 04/11/2026). Elenchi delle 25 Classi, Talenti Liberi, Maestrie, progressione e bonus uguali all’app; nulla da cambiare.

> > •             **A.232 — Specializzazioni ai pugni con i Guanti** (risposta del 02/11; app aggiornata il 04/11/2026). Combattimento Senz’Armi oppure Armi da Pugno; con tutte e due un solo \+1 VA e \+1 danno.

> > •             **A.234 — Prova di Potere del Doppio getto** (risposta del 02/11; app aggiornata il 04/11/2026). Potere −2, senza i benefici del lancio degli Incantesimi; il costo è quello della revisione «Cariche Mistiche» (6 CM).

> > •             **A.236 — Batteria interna della CyberArma** (risposta del 02/11; app aggiornata il 04/11/2026). Solo per la CyberArma, con l’alternativa dei PM personali, non compresa nel progetto dei tre giorni; con la revisione è di 5 CM, 1 CM per 10 Round. Per il Custode: A.251.

> > •             **A.237 — NEC della CyberArma convertita** (risposta del 02/11; app aggiornata il 04/11/2026). NEC Rosso da 10 cariche, una carica per attivazione, il residuo resta al NEC.

> > •             **Revisione «Cariche Mistiche»** (approvata il 02/11; app aggiornata il 04/11/2026). Guanti 6 CM, CyberArma 5 CM, armi della Fratellanza e Scudo delle Guardie Sacre 5 CM; le Batterie restano in PM; salvataggi convertiti una volta con la frazione. Per le riserve rimaste a frazione: A.252.

> > •             **A.220 — Le Ferite abbassano l’Iniziativa anche dei personaggi** (risposta del 02/11; app aggiornata il 02/11/2026). *In parole semplici:* con una Ferita Profonda l’Iniziativa scende di 4 anche per i PG, come per i nemici: con \+2 si tira 1d10 −2. Conta solo lo stato raggiunto, non la somma di quelli prima. Per i nemici prima si porta il bonus a 0 se è negativo, poi si toglie la Ferita. Abbiamo controllato che la penalità non entri due volte.

> > •             **A.221 — Il Magistrale su un ×5** (risposta del 02/11). *In parole semplici:* l’app faceva già così e non è cambiato niente: ×1 diventa ×2, ×2 diventa ×3, ×3 resta ×3, ×4 e oltre restano come sono. Il Magistrale vale solo per il primo colpo di un attacco multiplo. Il Soffio, che si tira senza Prova, non ha Magistrale. Ora un controllo automatico lo verifica a ogni aggiornamento.

> > •             **A.230 — Armi Inastate e Archi e Balestre** (risposta del 02/11; app aggiornata il 02/11/2026). *In parole semplici:* anche per queste due il Direttore ha «Tienila come eccezione» e «Sostituiscila gratis», come per quelle di Potere. Prima c’è la copia della scheda e la decisione va nel registro. Nessuno dei sette personaggi le ha.

> > •             **A.231 — La CyberArma di Dimitri** (risposta del 02/11; app aggiornata il 02/11/2026). *In parole semplici:* la CyberArma che Dimitri ha già è l’originale di Park. Il Direttore la segna così con un tocco («Riconduci a CyberArma Park»: Viola, Corruzione 1, nessuna modifica fatta). Il progetto ha i tre giorni degli appunti v1.2 e la forma scelta dal giocatore. «Consegna l’arma» aggiorna **la stessa** CyberArma: diventa «CyberArma Dimitri», con lo storico che ricorda il profilo di Park. **Non ne nasce una seconda** (se ce ne fossero due, l’app chiede quale). Il modulo SIN esce dalla spada. Il frammento Viola diventa un oggetto a parte, con il suo avviso di Corruzione (A.246, sezione 1).

> > •             **A.235 — La CyberArma degli Armamenti aggiornati** (risposta del 02/11; app aggiornata il 02/11/2026). *In parole semplici:* famiglia e Specializzazione seguono la forma (lama → Spade, ascia → Asce, lancia → Armi Inastate, frusta → Armi Flessibili), una sola. Danno e requisiti restano quelli della CyberArma. La frusta non dà Immobilizzare a distanza. Peso e Integrità sono quelli dell’esemplare di Park. Costruiscono solo i Custodi, con la procedura che hai confermato: 17 ore, 1.250 cr, 3 PM, più 4 ore e 100 cr se il progetto va sviluppato.

> > •             **A.215 — Le celle e i caricatori si tolgono, si riempiono e si rimettono** (risposta del 30/10; app aggiornata il 02/11 e il 03/11/2026). *In parole semplici:* una cella adesso è una cosa che si sposta. «Togli la cella» la toglie con le cariche che ha; una cella vuota resta, non sparisce. «Inserisci» rimette la stessa o un’altra; «Cambia cella» toglie quella dentro e mette la più carica che hai. Il trasformatore ricarica solo le celle tolte: se scegli quella inserita, rifiuta e dice perché. I pacchi dei lanciafiamme funzionano allo stesso modo e si cambiano con 1 AzP e due mani; le celle con 1 AzP. Anche le armi elettrificate da mischia hanno le loro celle: senza una cella pronta non si «ricaricano» più gratis (Dimitri, spada 4 cariche su 5, e Oshi, katana 5 su 5, non ne hanno di scorta). I caricatori si riempiono fuori dal combattimento, tutti insieme o uno solo, e dal 03/11 mostrano i loro colpi. I personaggi salvati non cambiano: chi aveva una cella nell’arma la ritrova con le stesse cariche. Restano A.243–A.245 e A.249–A.250.

> > •             **A.229 — Specializzazioni di Potere per Classe** (risposta del 01/11; app aggiornata il 02/11/2026). *In parole semplici:* ogni Classe sceglie le Specializzazioni dal suo elenco del Giocatore 0.54. Custode, Invocatore, Mistico e Tecnomante non hanno più tutte e nove quelle di Potere (l’Arcanista sì); con Usufruitore di Magia si aprono di nuovo. Chi ne ha già una non più nel suo elenco la tiene, con i suoi effetti e un avviso, finché tu decidi da «Modifica master»: ◦ «Tienila come eccezione», con il motivo; ◦ oppure «Sostituiscila gratis», tenendo il posto. Prima di cambiare l’app salva una copia della scheda, e la decisione va nel registro. Il giocatore non può decidere al posto tuo. Dei sette personaggi nessuno è toccato: Lucas ha Elementi e Manifestazione, che restano nell’elenco dell’Invocatore.

> > •             **A.211 — «Appreso» lo conferma il Direttore** (risposta del 30/10; app aggiornata il 02/11/2026). *In parole semplici:* quando un giocatore aggiunge un incantesimo a mano, entra come «annotato». Se dice che l’ha appreso, l’app scrive «appreso da confermare» e te lo chiede; finché non confermi non si lancia e non conta come conosciuto. Tu lo confermi dalla scheda dell’incantesimo con «Segna come appreso».

> > •             **A.213 — Incantesimi aggiunti prima della distinzione** (risposta del 30/10). L’app faceva già così: restano «da classificare», si lanciano come prima e li classifichi tu, con la riga nello storico.

> > •             **A.217 — Vecchi Banchi e Moduli** (risposta del 30/10). L’app faceva già così: un Banco diventa una CEC dello stesso colore con la stessa frazione, un Modulo senza corrispondenza resta «da convertire», una volta sola. (I ricambi di prima dei mezzi sono ancora la A.227.)

> > •             **A.218 — Il Bestiario v0.64** (risposta del 30/10). Grazie del chiarimento: per il Soffio del Dragomedusa l’app usa già 8d10 × 5 e 12d10 × 5 Magici, dal Mostri 0.46.

> > •             **A.219 — «Chiudi la giornata»** (risposta del 30/10). L’app faceva già così: è un tuo tocco, anche senza Calendario, arrotonda una volta e non addebita due volte; il supporto vitale una volta al giorno. La proposta di chiusura dal Calendario, che hai detto facoltativa, non c’è.

> > •             **A.196 — La Neverlost nella scheda dei veicoli e nella plancia** (risposta del 30/10; app aggiornata il 01/11/2026). *In parole semplici:* la Neverlost si aggiunge dalla tab Veicoli come lo Scout. Ha le tre Integrità (Corpo 300, Propulsione 180, Motore 120), AR 8, Corazzato 2, MOV 8 / 16 / 24 Q Tattici e le sue armi con le munizioni. Inoltre: ◦ **Le riserve non si riempiono da sole.** Rossa 100, Blu 10 e Verde 30 cariche partono «da registrare»: le scrivi tu, e salgono solo con «Ricarica all’approdo». ◦ **Rosso e Verde.** Il Rosso si conta a tempo di volo, arrotondato una volta a fine giornata; il Verde ogni giorno, anche in sosta. ◦ **Traiettoria a giorni.** Entrata e uscita costano 1 Blu ciascuna; ogni giorno 1 Rossa e 1 Verde. Si segna giorno per giorno o con «Registra la traversata di N giorni». ◦ **Scudo e circuito.** Lo scudo (200 ScE, 1 Blu l’ora) assorbe prima dell’AR. Il circuito Bianco (120 PM) è a parte, con le funzioni delle tre postazioni. ◦ **Sulla mappa.** In Q Tattici la nave è una pedina 3 × 2\. Le misure vere (51 × 30 m) e la planimetria interna restano dati separati. Dove la tua scheda 1.6 e il capitolo del Manuale dei Veicoli differivano ho seguito la scheda (MAN tecnologica −1; «Distacco da un aggancio esterno», con pareggio o fallimento che conservano l’aggancio). Per il circuito Bianco ho seguito il manuale, perché la scheda è la sola Parte I.

> > •             **A.190 — Il pacco del Gehemmapuker** (risposta del 30/10; app aggiornata il 01/11/2026). *In parole semplici:* il pacco è Rosso, cinque NEC Rossi da 10 cariche in successione con un solo contatore da 50 attacchi; **2.000 cr**, 750 g, ricarica completa 500 cr (50 ore con il trasformatore personale, 8 ore e 20 con quello industriale), si cambia con 1 AzP ed entrambe le mani. Anche il pacco del Purifier ha ora peso e formato: NEC 10 \+ NEC 5, 250 g.

> > •             **A.191 — I moduli IAS** (risposta del 30/10; app aggiornata il 01/11/2026). *In parole semplici:* ogni modulo IAS (e lo Smorzatore Silent e il generatore RF366 dell’Attila) usa un pacco da due NEC Blu 10, 20 cariche, 300 g; il ricambio carico è il «Pacco Blu 20 cariche» del catalogo a **800 cr** (prima l’app diceva 1.000); ricarica 10 cr per carica.

> > •             **A.195 — Lo scudo Punisher Wächter** (risposta del 30/10; app aggiornata il 01/11/2026). *In parole semplici:* la Taglia è scritta «Medio, detto anche Grande»: è una sola categoria e una sola voce acquistabile, non due varianti. Prezzo 12.000 cr, Molto rara, conversione 6.000 cr, come già nell’app.

> > •             **A.192 — L’energia dei mezzi: Autovettura e Scout** (risposta del 30/10; app aggiornata il 31/10/2026). *In parole semplici:* l’Autovettura ha una CEC Rossa da 10 cariche e fa 1.000 km (100 km a carica); lo Scout ha un MEC Rosso da 10 cariche (75 km a carica, 750 km nominali) e una CEC Verde da 10 cariche per i servizi, una carica per ogni giorno in cui si usa il supporto vitale. I chilometri delle tratte brevi si sommano e le cariche si tolgono **una volta sola**, con il tocco «Chiudi la giornata», arrotondando per eccesso (3 tratte da 30 km su un’Autovettura \= 90 km \= 1 carica, non 3); le accensioni del supporto vitale nello stesso giorno contano una carica Verde, un giorno senza uso nessuna. L’aria è a parte: tre bombole da 8 ore (24 ore effettive, anche non consecutive) e la ricarica dell’energia non le ripristina («Ricarica le bombole»: 100 cr e 20 minuti ciascuna). Ricarica completa dello Scout 400 cr in due ore (tre in successione). L’elettronica ordinaria non consuma. La chiusura della giornata a tocco del Direttore l’hai confermata con la A.219. Il numero e il formato delle bombole sono quelli della scheda 0.6.

> > •             **A.193 — Le riserve salvate in Lx, UE o ore** (risposta del 30/10; app aggiornata il 31/10/2026). *In parole semplici:* una riserva salvata nei modelli di prima passa alle cariche conservando la **frazione** residua: una cella a metà vale metà della capacità del profilo nuovo (uno Scout al 50% ha il MEC Rosso a 5 cariche su 10). Il valore di prima resta nel file, il risultato si registra, non si arrotonda per eccesso e la conversione non si ripete alle aperture successive. Se il profilo nuovo non è certo la riserva resta «da convertire» fino alla tua verifica (i Moduli, A.217; i ricambi di prima dei mezzi, A.227). Vale per i mezzi (Autovettura e Scout) e per i personaggi (NEC standard, Banchi, tuta, riparo, verricello, utensile laser). **Corretta in un punto dalla A.252 il 07/11/2026:** il conto per frazione resta il modo di convertire e non si ripete mai, ma il risultato **non lascia una frazione nella riserva** — sale all’intero superiore, una volta sola. Il valore di prima e il conto esatto restano nel file.

> > •             **A.198 — Le sagome più grandi e la scala della mappa** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* le creature possono occupare fino a 20 quadretti per lato: i draghi antichi (10 × 16\) e il Dragomedusa adulto (10 × 14\) hanno finalmente il loro spazio sulla mappa. In Q Base la sagoma è quella del profilo, rettangolare, e si gira di 45°; in Q Tattici si usano le pedine del manuale (Dragomedusa 1 × 1 il giovane, 2 × 1 l’adulto; drago 1 × 1, 2 × 1, 2 × 2). La mappa dichiara la sua scala — «Q Base · 1 Q \= 1,5 m» o «Q Tattici · 1 Q \= 15 m» — con un’etichetta sempre visibile, e la si sceglie finché non ci sono creature. Le regole dei muri e delle collisioni non cambiano: un angolo della sagoma non attraversa mai un muro, ricontrollato su tutte le sagome fino a 20 × 20 in tutti gli orientamenti.

> > •             **A.202 — La Murena della Roccia cucciolo** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* il 6 / 12 / 18 è il movimento della forma eterea (attraversa la roccia); non ha un movimento terrestre. In overdose è corporea: ferma, non attacca, non attraversa la roccia, non Schiva, fino alla fine del Round successivo; poi torna eterea da sola. Nella carta della creatura c’è il pulsante «Corporea (overdose)»; da corporea il movimento è zero e «Attacca\!» avvisa che non attacca.

> > •             **A.203 — La Madre delle Murene** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* la scegli tu: parzialmente emersa (2 × 2\) o completamente emersa (6 × 2); nella parziale resta la nota dei 4 Q di estensione nella roccia. Cambiando configurazione cambia solo la misura sulla mappa, nello stesso punto: PV, PM, Ferite, Stati e Azioni già spese restano tutti, è la stessa creatura. La testa dà l’origine degli attacchi e del soffio (domanda A.223).

> > •             **A.204 — L’ordine delle misure dei draghi** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* il corpo disteso è «lunghezza × larghezza» nel manuale e l’app lo mostra «larghezza × lunghezza»: giovane 4 × 6, adulto 6 × 10, antico 10 × 16, cucciolo 1 × 2\. Trentasei draghi (15 giovani, 10 adulti, 10 cuccioli e il Dracolich) avevano le misure al contrario e sono stati corretti: sulla mappa erano stesi di traverso.

> > •             **A.206 — Parata a Mani Nude del Lottatore** (risposta del 30/10, **modifica di regola**; app aggiornata il 30/10/2026). *In parole semplici:* la Parata a Mani Nude ora fa parte dell’Addestramento al Combattimento Senz’Armi del I Grado: ogni Lottatore, qualunque Disciplina, con almeno una mano libera para gli attacchi ravvicinati, con 1 AzP anche fuori Iniziativa; se riesce, il danno si dimezza per eccesso prima dell’Armatura; il Magistrale lo annulla; non vale contro attacchi a distanza, Aree o attacchi imparabili; con Parata Istintiva vale anche a mani nude; nessun PM. Il vecchio Talento a scelta ora si chiama «Parata a Mani Nude Migliorata» e dà \+2 VA alle Difese per parare a mani nude (si somma alla Guardia, non vale con il bastone, non tocca Schivata, Elusione o Parate con armi). *Nell’app:* le scelte già fatte del vecchio Talento si leggono come il Talento nuovo, senza toccare i file dei personaggi (nessuno dei sette ha il vecchio Talento: non c’è niente da riscrivere); il Lottatore dei modelli PNG para a mani nude a VA 12 (I Grado) e poi 17, 20, 22, 25, 27, con la Schivata 12, 15, 18, 20, 23, 25\. La nostra vecchia proposta A.206 (Difese \= Schivata al I Grado) è tolta.

> > •             **A.197 — Il premio di fine Atto non si duplica** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* la seconda assegnazione dello stesso premio allo stesso personaggio, nello stesso Atto, è bloccata, anche se la si tenta da un’altra partita; il premio spetta anche agli assenti. Per correggere un’assegnazione sbagliata c’è la rettifica con il motivo, che resta nel registro; un premio in più si scrive nel «Bonus», senza toccare quello di fine Atto. È l’unica eccezione al principio «l’app avvisa, non blocca».

> > •             **A.199 — I danni con moltiplicatore** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* un danno come «8d10×5» si tira dall’app: tira gli otto d10, li somma e moltiplica per cinque, e mostra i dadi, la somma e il totale; Difese e Armatura si applicano dopo. Vale per tutte le creature (97 voci) e per il Soffio del Dragomedusa: 8d10×5 il giovane, 12d10×5 l’adulto, Magici. Le armi navali della Neverlost useranno lo stesso calcolo quando entrerà.

> > •             **A.200 — L’Iniziativa dei PNG umani** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* il minimo 0 è solo del bonus base di Iniziativa, anche per i tre Inquisitori; le penalità di Ferite e condizioni si sommano dopo, e il totale può essere negativo (un nemico con Iniziativa 0 e una Ferita Profonda fa −4 \+ d10). Prima l’app non applicava nessuna penalità all’Iniziativa dei nemici. Per i personaggi: domanda A.220.

> > •             **A.201 — I nomi dei draghi metallici** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* tutti gli stadi si chiamano Drago d’ottone, di rame, di bronzo, d’argento, d’oro. Le forme di prima («Drago di ottone adulto») restano come alias nella ricerca, senza duplicare le creature.

> > •             **A.205 — Diplomazia e Oratoria** (risposta del 30/10; app aggiornata il 30/10/2026). *In parole semplici:* «Diplomazia» è Oratoria, con gli stessi valori (Driade 13, Marinide 10), anche nell’importazione delle schede dal manuale.

> > •             **A.207 — Natura del danno e AC delle armi** (risposta del 30/10; verificata il 30/10/2026). *In parole semplici:* le armi ordinarie di umani e umanoidi fanno danni Naturali e AC 1 per colpo, salvo indicazione del profilo; il «Danno completo» comprende già i bonus ordinari, quindi non si aggiunge nulla (resta l’EQ dei modelli PNG); AC 1 non limita il numero di attacchi. Controllati tutti i 341 nemici prestabiliti, le creature del Bestiario proposto, i 120 profili dei modelli PNG e la conversione da personaggio: nessuno somma due volte i bonus.

> > •             **A.241 — Le Specializzazioni tolte che non sono di Potere** *(ritirata il 02/11: confluita nella A.230).* Era la stessa domanda della A.230, riscritta dopo la tua A.229: per non fartela leggere due volte resta solo la A.230, nella sezione 2\.

> > •             **Numeri senza una domanda in questo documento.** Per chi controlla la numerazione: **A.4** e **A.15** chiuse a settembre, con le prime risposte (prima che ci fosse questa sezione); **A.89** era una correzione proposta per i 5 punti liberi, superata dalla A.90 (7 punti); **A.100** non usato, era un doppione della A.91 (di chi è il veicolo); **A.130** tolta il 06/10, era una scelta tecnica di Marcello e non una domanda per te; **A.186** non usato (il 25/10 non è servito). Le A.92, A.96, A.97 e A.144 sono qui sopra, insieme ad altri numeri.

> > •             **A.176 — Incantesimi aggiunti a mano.** *In parole semplici:* quando un incantesimo viene aggiunto a mano, l’app chiede se il personaggio lo ha **appreso** davvero o se è **solo annotato** (una pergamena trovata, un testo, un Artefatto). L’appreso conta come conosciuto per tutto (prerequisiti, creazione di Consumabili, insegnamento), restando valide le altre condizioni; l’annotato no, non dà accesso alla magia, né Abilità, né PM, e non si lancia. Senza accesso alla magia anche un appreso resta annotato e non lanciabile. Se il Direttore concede una cosa speciale, scrive come si lancia, con quale Abilità, con quali PM e con quali limiti. Gli aggiunti a mano non occupano le quote di Classe. Quelli aggiunti prima restano «da classificare» finché il Direttore non sceglie, con un tocco, dalla scheda dell’incantesimo. *Applicata il 29/10/2026.* (Domande che ne derivano: A.211, A.212, A.213.)

> > •             **A.189 — Il trasformatore e la regola del «niente travaso»** (risposta del 30/10). *In parole semplici:* un trasformatore dedicato ricarica i NEC. Prende una carica da una CEC dello stesso colore (10 UE) e la tiene in un tampone da 100 cariche NEC; poi trasferisce solo le cariche che servono e conserva il resto, anche dopo averlo scollegato. Il prelievo si fa solo se nel tampone c’è posto per l’intera carica. Il portatile ricarica una carica all’ora, la stazione industriale una ogni dieci minuti; più apparecchi collegati non moltiplicano la velocità. Un caricatore qualunque, i PM personali e la vicinanza a una Matrice non bastano. Tre modelli: portatile monocromatico (3.000 cr), multicromatico (6.000, un tampone per colore), stazione industriale (20.000). Nell’app: sull’Inventario il trasformatore mostra il tampone e «Ricarica» dice quanto si trasferisce, quanto resta nel tampone e quanto tempo ci vuole. *Applicata il 30/10/2026.*

> > •             **A.214 — Pacchi da 15 e 50 getti, IAS: peso e formato** *(ritirata: la risolvono i tuoi manuali del 30/10).* Il registro 2.9, gli Armamenti 0.70 e l’Equipaggiamento 0.24 fissano i pacchi dei lanciafiamme (Purifier NEC 10 \+ NEC 5, 250 g; Gehemmapuker cinque NEC 10, 750 g) e il pacco IAS (due NEC Blu 10, 300 g). Resta da riportare nell’app (sezione 3, A.190 e A.191).

> > •             **A.216 — Le riserve salvate in ore** *(ritirata: la risolve la A.193).* Tuta, riparo, verricello e utensile laser salvati in ore si portano alle cariche conservando la frazione, senza arrotondare per eccesso (A.193).

> > •             **A.187 — Si sale di livello solo con i PX** (risposta 28/10, app aggiornata il 28/10). Il pulsante «Sali al livello N» si abilita solo quando i PX che **hai assegnato tu** arrivano alla soglia del livello (A.170) e l’Atto lo consente: con 600 PX al 6° livello non si va al 7° (ne servono 720). Un totale solo suggerito non conta. Il blocco c’è anche nel server: una richiesta da un tablet che porta un personaggio oltre il livello dei suoi PX viene rifiutata, e nemmeno scrivendo l’indirizzo a mano si entra. Tu, in «Modifica master», hai «Concedi il passaggio al livello N»: chiede il motivo (obbligatorio), lo scrive nel registro del personaggio, non cambia i PX, e il giocatore non vede il motivo. Se un personaggio ha già un livello in più dei PX, la scheda lo segnala come prima e non cambia niente; in modalità master, accanto alla segnalazione, trovi «Annulla l’ultimo livello» (ti mostra prima le scelte che si perderebbero) e «Tieni come concessione» (con il motivo). I PX continuano a cambiarli solo tu.

> > •             **A.188 — Incantesimi: il giocatore cambia, ma le regole valgono** (risposta 28/10, app aggiornata il 28/10). Il giocatore cambia da sé anche gli incantesimi conservati, senza chiedere a te, **ma quote, famiglie accessibili, livello massimo e requisiti valgono di nuovo**: un incantesimo fuori regola resta in grigio con il motivo e non si può prendere né mettere al posto di un altro (il server lo rifiuta anche se arriva da un tablet). Tu puoi sempre forzare, con conferma e motivo, e resta scritto. Ogni aggiunta, rimozione e sostituzione va nello storico del personaggio con data, ora e da dove è stata fatta (per esempio «Sostituito Colpo Elementale con Dardo Mistico (tablet, 28/10 21:40)»). Gli incantesimi aggiunti a mano e quelli degli artefatti restano fuori dalle quote (l’A.176 è un lavoro a parte). Per cambiare le Tecniche Interiori conservate resta la procedura già approvata. Questa regola sostituisce il requisito di approvazione della A.184 per gli incantesimi; vale al posto della libertà totale applicata il 26–27/10.

> > •             **A.194 — Il Dragomedusa: PX e GS** (risposta nel Manuale dei Mostri 0.46 §7.12, app aggiornata il 29/10). Il Dragomedusa **giovane** è di GS **Mito, 200 PX**; l’**adulto** di GS **Semidio, 400 PX**, per un esemplare senza dotazione e quattro PG. Nel Bestiario ci sono tutti e due con i valori del manuale: i valori secondari del giovane completi, il Soffio di Fulmine, la Cattura con i filamenti e l’assorbimento da un banco Rosso (15/25 UER), Blu (1/2 UEB), Verde (3/5 UEV) o da una batteria mistica (3/5 PM). Con loro la scala del Grado di Sfida arriva fino a Entità Suprema (Mito 200, Semidio 400, Divinità 800, Divinità Maggiore 1.600, Entità Suprema 3.200), e la pagina del bestiario online ha il filtro per GS. Dalla stessa versione: l’Iniziativa delle creature non è mai negativa (si tira il solo d10 più il bonus), quindi 66 creature che avevano Iniziativa da −1 a −4 ora hanno 0\.

> > •             **A.174 — «Ricarica e medita»** (risposta 23/10, app aggiornata il 28/10). Con un cristallo, il pulsante «Medita» diventa «Ricarica e medita» e fa i due passaggi nell’ordine giusto: **prima** ricarica il cristallo con i PM che il personaggio ha adesso (3 PM per 1, 2 con Ricarica Efficiente o Conversione Migliorata, 1 con entrambi, il Bianco sempre 2; entro la capacità; con l’Azione, il contatto, l’Addestramento e la Prova di Potere della ricarica normale), **poi** calcola la Meditazione, completata o interrotta. Se la Meditazione si interrompe, la ricarica resta. I PM che si recupereranno non si possono spendere prima: se si chiede di più, l’app si ferma e lo dice. In fondo, una riga: «Spesi 9 PM → cristallo \+3 cariche · Meditazione: recuperati 6 PM». Senza cristallo «Medita» è quella di sempre. Prima di oggi la strada breve convertiva anche i PM che la Meditazione avrebbe recuperato: non succede più.

> > •             **A.175 — Guanti da Combattimento Mistico** (risposta 23/10, app già così). I Guanti sono un oggetto con una proprietà attiva e il pulsante «Attiva», senza bisogno di un Incantesimo: 3 PM dalle cariche interne, 1 AzP, 5 Round; i pugni diventano Magici con \+1 al danno. Non si paga con PM personali né con Batterie esterne.

> > •             **A.177 — Modifiche dal tablet dopo la partita** (risposta 23/10, ora completa). Le modifiche si possono mandare anche a sessione finita e valgono solo dopo la tua approvazione; se il dato è cambiato nel frattempo, l’app ti mostra il conflitto prima di applicare; una disconnessione non fa perdere niente. Accanto a ogni modifica vedi **quando è stata fatta e quando è stata ricevuta**.

> > •             **A.178 — Manuale del Giocatore 0.49** (risposta 23/10, app già così dal 22/10). Imposizione della Mano Curativa 1/2/2/4 PM (1/1/1/3 con l’Hachimaki); Aura di Resistenza \+2; Meditazione Profonda distinta dalla Meditazione ordinaria; tempi, durate e limiti delle schede recepiti, non solo i numeri.

> > •             **A.179 — AR di Aura e Pelle** (risposta 25/10, app già così). Vale la 0.49: Aura di Resistenza \+2 AR magica per 5 Round; Pelle di Rinoceronte \+1 AR non magica contro attacchi Ravvicinati Naturali o Magici per 5 Round. Insieme: \+3 contro il Ravvicinato, \+2 contro gli altri danni Naturali o Magici, \+2 contro l’Etereo; con Corazza Potenziata \+4, \+3, \+3 (comprendono tutte e tre le protezioni). I numeri della A.48 (+1 per 3 Round) restano nello storico, sostituiti.

> > •             **A.180 — Scheda del tablet e modifiche in attesa** (risposta 25/10, app aggiornata). La scheda del tablet mostra i valori approvati. Le modifiche non ancora approvate stanno nella coda, ognuna con il valore di prima, il valore proposto e la scritta «In attesa di approvazione». Il giocatore può **ritirare** una richiesta finché è pendente, anche se è già arrivata a te: tu la vedi come «Ritirata dal giocatore» (con «Visto» per toglierla dall’elenco) e la scheda non cambia. Dopo l’approvazione un ripensamento è una richiesta nuova.

> > •             **A.181 — Nuova progressione di Talenti, Maestrie e Specializzazioni** (risposta 25/10, app già così, in uso dalla partita del 26/10). Talenti Liberi ai livelli 3, 5, 7, 9, 11, 13, 15, 17, 19; Maestrie ai livelli 2, 6, 10, 14, 18; Specializzazioni ai livelli 1, 4, 8, 12, 16, 20\. I Talenti di Classe hanno la loro progressione separata.

> > •             **A.182 — Ricarica Esperta** (risposta 25/10, app già così). Senza Maestria 2 cartucce per azione; con Ricarica Esperta fino a 4 per operazione, anche nell’operazione gratuita del Round. Restano i limiti di capacità dell’arma e non vale per sostituire un caricatore amovibile. Il testo dei Talenti nell’app ora dice «fino a quattro».

> > •             **A.183 — Conversione dei personaggi esistenti** (risposta 25/10, app già così). Le scelte seguono l’ordine dei livelli e i prerequisiti posseduti in quel momento (Dimitri: Ritualista Minore al 3°, Ritualista Maggiore come Maestria del 6°); la Specializzazione iniziale viene dalla prima Classe, quella del 4° dalla Classe aumentata al Grado II; la conversione sostituisce le vecchie scelte (copia e riepilogo restano nel registro).

> > •             **A.184 — Incantesimi e Tecniche legati ai Talenti** (risposta 25/10, app **cambiata**). Se si riprende lo stesso Talento, le scelte già fatte restano, entro le quote. Se il Talento non si riprende, le Tecniche e gli incantesimi che dipendevano solo da lui non funzionano più: nella tab Poteri compaiono in «Scelte in storico», senza effetti (niente AR dell’Aura, niente «Lancia\!»), e non c’è più l’avviso di quota. Riprendendo il Talento tornano attive. Le Tecniche che vengono da altre fonti (Lottatore, Scuola Mishima) restano.

> > •             **A.185 — Specializzazione del primo livello** (risposta 25/10, app già così). Si sceglie dopo la Classe iniziale, prima dei valori finali e della dotazione; un Taumaturgo ha una sola scelta iniziale tra le nove Specializzazioni di Potere; gli ampliamenti di Usufruitore di Magia e di Ritualista si aprono solo con il requisito posseduto.

> > •             **Esiti dei tuoi test del 24/10** (corretti il 25/10 e il 27/10). Avvisi NTFY: la configurazione sta fuori dalla cartella dell’app e non si perde con gli aggiornamenti. Test 4: conflitto con la coda a due scelte vere («Vedi la scheda del Direttore» o «Scarta le mie modifiche»). Test 6: una modifica \= una voce (le note «NO», «NOT», «NOTE» sono una richiesta sola) e il pulsante «Rientro dei tablet» c’è su ogni pagina. Test 7 (PX): salvataggio affidabile, voto base 3 per le tre categorie, PX di ogni incontro, premio di fine Atto per Atto anche a chi era assente, avviso di passaggio di livello, PX modificabili solo dal Direttore (anche dalla coda del tablet).

> > •             **Incantesimi: scelta affidabile** (27/10, nessuna domanda). Ogni incantesimo si riconosce dal catalogo, non dal nome; si aggiunge a mano in tre passi; le quote (di Classe e dei Talenti) hanno un solo conto e sono sempre un avviso, mai un blocco; gli incantesimi presi con un Talento si vedono, si tolgono e si sostituiscono dalla tab Poteri.

> > •             **I personaggi non si perdono con un aggiornamento** (26–27/10, nessuna domanda). I dati stanno in una cartella scritta nel profilo di Windows; una sola installazione di Mutant; se all’avvio i personaggi non ci sono, Mutant cerca da solo l’altra copia e con un SI si sistema (voci «P Cerca i personaggi» e «C Controlla lo stato» del menu).

> > •             **Esploratore, Specializzazioni dei Talenti a scelta; «minimo 1» ai 2 \+ Mod INT incantesimi; quote di Classe per macrofamiglia; incantesimi liberi di qualunque famiglia; tabella del livello massimo degli incantesimi; dadi dei PV e dei PM massimizzati al 1° livello** — risolte e implementate prima del 26/09.

> > •             **A.5 — Durata di tre Tecniche Interiori** (Vipera dal Cappuccio, Presa dell’Anima, Contraccolpo Interiore) — implementata il 26/09.

> > •             **A.6 — Equipaggiamento iniziale** (E\&L A.5–A.5.31): dotazioni delle 25 Classi, armamenti corporativi di base (Armamenti §7.22), crediti iniziali 1.000 \+ 2d6 × 100, acquisti con cessione, veicoli esclusi — implementato il 27/09.

> > •             **PV e PM attuali al passaggio di livello** (§8.1.2, E\&L A.6) — implementata il 27/09.

> > •             **18 Talenti magici e mistici nuovi del 27/09** — recepiti nell’app il 27/09; la conferma è chiesta in A.32.

> > •             **Manuale degli Armamenti v0.52 e v0.53** (elmetti §7.21, modelli corporativi di base §7.22, catalogo dei rinforzi §7.23) — recepito il 28/09.

> > •             **Manuale del Giocatore del 27/09** (Addestramenti a 76 punti, 10 Punti Abilità Liberi) — recepito il 28/09; confermato in A.52.

> > •             **A.1 — Descrizioni delle Caratteristiche; Prova Salvezza Volontà su CAR** — implementata il 26/09.

> > •             **A.2 — Schede dei 14 Talenti di magia** (compreso Potenziale Mistico Migliorato solo per gli Usufruitori di Magia) — implementata il 26/09.

> > •             **A.3 — Tipo di tre Talenti Liberi** (Attivazione Tempestiva, Risorse Interiori, Tecniche Interiori Supplementari: passivi) — implementata il 26/09.

> > •             **A.7 — Pistola mitragliatrice compatta**: Specializzazione Pistole anche in Raffica Breve e Media — implementata il 28/09.

> > •             **A.8 — Pugnale e Ascia leggera**: Coltelli e Pugnali / Asce in mischia, Armi da Lancio al lancio, mai cumulate — implementata il 28/09.

> > •             **A.9 — Famiglie delle 12 armi ravvicinate corporative** e nuova Specializzazione Armi a Sega (Elettrosega CSB600, Chainreaper, Sbudellatrice) — implementata il 28/09.

> > •             **A.10 — Scudo delle Guardie Sacre**: 1d6+1 con la lama ritratta, 1d6+1+1d4 con la lama estratta; nell’app la lama si estrae e ritrae al tavolo — implementata il 28/09.

> > •             **A.11 — Specializzazioni delle 16 armi a distanza corporative** (Panzerknacker nei Fucili d’Assalto) — implementata il 28/09.

> > •             **A.12 — Specializzazioni delle altre armi corporative per analogia**; SA30 a dardi con solo \+1 VA (Danno calibrato) — implementata il 28/09.

> > •             **A.13 — Rainy Dayer** nelle Carabine, solo per il profilo di tiro — implementata il 28/09.

> > •             **A.14 — Batterie da 5 PM** (Rosso, Blu, Verde Molto rara; Bianco Leggendaria), scala di reperibilità fino a Leggendaria, disponibilità degli Artefatti Mistici — implementata il 28/09. Prezzi aggiornati il 02/10 a 1.000 crediti (Rosso, Blu, Verde) e 5.000 (Bianco), come nell’Armamenti §7.5, nella Magia §24.7 e nell’E\&L del 01/10.

> > •             **A.16 — Prove fisiche**: lista confermata; le penalità fisiche non toccano Potere né le Salvezze — implementata il 29/09.

> > •             **A.17 — Terrorizzato anche alle Prove Salvezza** durante lo Stato: risposta nel Manuale del Giocatore del 28/09 (§5.18); l’app già così — chiusa il 29/09.

> > •             **A.18 — Riserve integrate nelle armi**: alimentano soltanto le funzioni del proprio Artefatto, non pagano Incantesimi e non si prelevano (Magia §24.2 e §24.7, Doc del 01/10); «Lancia\!» non le offre più come fonte di PM — implementata il 02/10.

> > •             **A.19 — Contenitori Chroma**: acquistato pieno; trovato con i PM impostati dal giocatore — implementata il 29/09.

> > •             **A.20** — Prelievo dal Chroma Bianco: il prelievo di PM da un contenitore Bianco sintonizzato (con contatto, 2:1, nella riserva personale) è riservato a chi ha accesso alla magia (Addestramento Taumaturgo, Gradi taumaturgici o Talenti come Usufruitore di Magia); non basta essere coscienti. Ricaricare il contenitore richiede sempre l’Addestramento Taumaturgo. *Verificata il 09/10: la scheda lo indica a chi ha l’accesso senza essere Taumaturgo.*

> > •             **A.21 — Chroma Viola come fonte di Corruzione passiva**: fasce, frequenza ed esiti nell’app; il frammento si registra nell’inventario senza PM; il conteggio dell’esposizione arriverà insieme a Corruzione e Umanità — implementata il 28/09.

> > •             **A.22 — Senz’armi 1d4 più il bonus di FOR**; Arti Marziali 1d6; Lottatore il suo dado — implementata il 29/09.

> > •             **A.23 — Mano non dominante −4** salvo Ambidestro; con due armi solo la penalità della manovra — implementata il 29/09.

> > •             **A.24 — Incalzare**: Prova per colpire a −4 contro le Difese, spinta 2 Q, nessun danno — implementata il 29/09.

> > •             **A.25 — Copertura anche nel ravvicinato**: −2 / −4, Copertura Migliorata −4 / −6, Totale impedisce l’attacco — implementata il 29/09.

> > •             **A.26 — Superiorità numerica**: \+1 / \+2 / \+3 con 3–5 / 6–7 / 8+ attaccanti; campo nel pannello — implementata il 29/09.

> > •             **A.27 — Spazzata**: bersagli adiacenti fra loro e tutti entro la portata — implementata il 29/09.

> > •             **A.28 — Sbilanciare e Disarmare**: l’opposizione la sceglie il bersaglio prima del tiro — implementata il 29/09.

> > •             **A.29 — Magistrale**: bonus ordinari prima del moltiplicatore, quelli dopo l’Armatura no, solo la prima applicazione — implementata il 29/09.

> > •             **A.30 — Pesi mancanti «da definire»**, totale del carico parziale — implementata il 29/09.

> > •             **A.31 — Oltre il carico massimo**: Movimento 0 Q e −2 alle Prove fisiche — implementata il 29/09.

> > •             **A.32** — Confermati i 18 Talenti magici; Potere Mistico \+5 PM per acquisizione fino a tre; Potere e Recupero Mistico richiedono una riserva personale; Concentrazione: PS Volontà su CAR, \+3 di Concentrazione Migliorata solo per mantenerla; Concentrazione Operativa senza altri lanci, salvo Contromagia e Convertire Potere. *App: già conforme.*

> > •             **A.33 — Pistole corporative**: HG10, Bolter 10, P500, Nemesis 100, Belliger, Ronin 25 AP; Revolver commerciale — implementata il 29/09.

> > •             **A.34 — Oggetti della dotazione con scheda** (in tre passi). Il 29/09 Binocolo e Registratore audiovisivo con peso e prezzo (Equipaggiamento 0.3 §§4.2–4.3), e 28 delle 44 voci della dotazione (dotazione comune, abiti, luci, corredi di orientamento, arrampicata e sopravvivenza, tenda, maschera, comunicatori, ottiche, sorveglianza, ricarica del Kit trauma) con peso, prezzo, Qualità, PI ed effetti presi dalla scheda, anche nei personaggi già salvati. Il 05/10 le altre: oggetti delle dotazioni collegati alle schede del catalogo, NEC contati una volta; Qualità, PS e PI approvati per cassetta, attrezzi e corredi; scambio al 100% solo per gli armamenti ammessi. *App: applicata il 05/10.*

> > •             **A.35** — Acquisti iniziali: valore ceduto maggiore del prezzo (§2.16.29). L’eccedenza del valore degli armamenti ceduti sul prezzo di ciò che si prende torna in crediti: la procedura di acquisto mostra «Eccedenza restituita: \+N cr» e il saldo iniziale la comprende, anche quando gli acquisti si rifanno con «Modifica creazione». Esempio: cedendo un’armatura da 1.800 crediti per un coltello da 80 si ricevono 1.720 crediti. *Implementata il 09/10.*

> > •             **A.36** — Bonus degli oggetti solo quando si usano; per la stessa Prova vale il maggiore degli strumenti; valori di binocolo, corredi, abiti eleganti e kit trauma approvati. *App: già conforme.*

> > •             **A.37 — Ricarica**: doppiette e pompa una cartuccia per operazione (3 con Ricarica Migliorata); M310 e SA SG2001 a caricatore — implementata il 29/09.

> > •             **A.38** — Sette chiarimenti sull’attacco a distanza (Movimento Tattico e Fluido si sommano, Copertura, seconda Prova a −4, Mira Selettiva, Imbracciare, Bruciapelo Migliorato, Movimento Evasivo). *App: da applicare.*

> > •             **A.39, punti 1–3** — Anticipazione senza Addestramento (colonna «altri» −2), Colpo Elementale (PS solo per gli effetti secondari, per elemento) — implementata il 29/09. Punto 3, Rigenerazione: procedura completa (Magia sez. 25, E\&L del 01/10) — implementata il 02/10.

> > •             **A.40** — Carica fino alla Corsa massima: 3–6 Q −2/−4, da 7 Q −4/−6, danno ×2; tolto il limite di 12 Q. *App: da applicare.*

> > •             **A.41 — Sbilanciare e Disarmare con l’Abilità del mezzo dichiarato**, non il VA maggiore — implementata il 29/09.

> > •             **A.42 — Spazzata anche senz’armi**, con Corpo a corpo — implementata il 29/09.

> > •             **A.43 — AR complessiva** («AR totale, di cui magica»), non per zona del corpo: l’app già così; Magia sez. 7 già corretta nel Google Doc — implementata il 28/09.

> > •             **A.44 — Armatura, scudo ed elmetto a 0 PI**: niente AR né benefici; lo scudo Rotto non attacca né para; la rottura vale dal colpo successivo — implementata il 28/09.

> > •             **A.45 — Kit di rinforzo a 0 PI**: perde AR e proprietà, l’armatura sottostante resta com’è, PI separati — implementata il 28/09.

> > •             **A.46 — Riparazione strutturale** di armi, armature, scudi, elmetti e rinforzi: pulsante «Ripara», 1 ora, Prova di Tecnologia (−2 con strumenti improvvisati), esito scelto dopo il tiro, materiali al 5% del prezzo per PI recuperato tolti dai crediti — implementata il 28/09.

> > •             **A.47 — Oggetti senza PI**: nessun valore predefinito; campo facoltativo «PI definiti dal Direttore»; sanitari tracciati; esemplari identici raggruppati con «Danneggia uno» — implementata il 28/09.

> > •             **A.48 — Corazza Potenziata, Aura di Resistenza e Pelle di Rinoceronte si sommano**; Corazza Potenziata solo con una protezione Artefatto; le due Tecniche come interruttori al tavolo — implementata il 28/09. Resta la domanda A.53 sulle armature con AR magica propria.

> > •             **A.49 — Condizioni delle armi (§5.17)** come stato al tavolo, distinto dai PI: penalità al VA e blocco di «Attacca\!» quando l’arma non è utilizzabile — implementata il 28/09.

> > •             **A.50 — Ordine delle riduzioni dell’AR** (Perforante, Laser, Incendiato): nei dati dell’app e come promemoria in «Attacca\!» — implementata il 28/09.

> > •             **A.51 — Categorie di Prove degli Stati**: Percezione tolta da «vista», Assordato come valore a parte, nei promemoria la frase sull’azione esclusivamente visiva o uditiva che fallisce — implementata il 28/09.

> > •             **A.52 — Addestramenti a 76 punti e 10 Punti Abilità Liberi**: confermati da Davide; nessun cambio alle regole dell’app, l’avviso ai personaggi esistenti lo cita — implementata il 28/09.

> > •             **A.53** — Corazza Potenziata solo con armatura o scudo classificati come Artefatto e con almeno 1 PI; \+1 all’AR una sola volta. *App: già conforme.*

> > •             **A.54** — Revolver: 1 AzP riempie il tamburo, anche in parte; Ricarica Rapida gratuita una volta per Round. *App: già conforme.*

> > •             **A.55** — Caratteristica del bonus al danno per Abilità (pesanti: attacco con FOR, danno con INT), tetto \+1/+2/+3, prima dei moltiplicatori; granate e razzi esclusi. *App: già conforme.*

> > •             **A.56** — Basi dalla prima Classe (7/6/5/3, 122 punti), limiti al I Grado 12/9/7/5, 7 punti liberi per Grado. *App: già conforme.*

> > •             **A.57** — Punti liberi ricostruiti evento per evento, con i limiti del momento; i punti legali non si rimborsano; avanzamento bloccato finché la ricostruzione non è completa. *App: applicata il 09/10 con A.107 e A.108 (ricostruzione evento per evento con i limiti del momento, punti legali non rimborsati, salita bloccata finché manca qualcosa).*

> > •             **A.58** — Il \+1 di Corporazione resta nel calcolo e torna utile quando il limite sale; i modificatori circostanziali vengono dopo il limite. *App: già conforme.*

> > •             **A.59** — Depositare un Artefatto non interrompe la Sintonizzazione; una batteria depositata non alimenta. *App: da applicare.*

> > •             **A.60** — Otto schede; mani registrate; vista rapida delle protezioni; condizioni modificabili anche nella tab Abilità. *App: applicata; la vista rapida delle protezioni ha i tempi dal 09/10 (A.110).*

> > •             **A.61 — Capolavoro del Corazzaio**: \+1 a una sola Contromisura numerica scelta alla costruzione (Ignifugo, Termico, Isolante, Dissipante, Imbottita, Anticorrosivo); assente vale 1, con valore X diventa X \+ 1; non aumenta l’AR; Riflettente esclusa. Risposta del 02/10 (E\&L, decisione 4\) — implementata il 02/10.

> > •             **A.62 — Katana Ryūjin**: natura Naturale; attiva 1d8 \+ 1 \+ 1d6 con la proprietà Plasma, un solo colpo. Risposta del 02/10 (decisione 15\) — implementata il 02/10.

> > •             **A.63 — Esoscheletri**: NEC Rossi di formato dedicato al modello, con autonomia, ricarica e ricambio della scheda; sostituzione 1 minuto. Risposta del 02/10 (decisione 18\) — implementata il 02/10.

> > •             **A.64 — Moduli IAS**: NEC Blu IAS da 1.000 Lx \= 20 cariche da 50 Lx (Power Blink 2); ricambio 1.000 cr, ricarica 50 cr in 1 ora. Risposta del 02/10 (decisione 20\) — implementata il 02/10.

> > •             **A.65 — Dotazioni con più schede**: nuova scheda «Corredo agricolo Standard — Allevamento» (2 kg, 200 cr, CO, \+0); strumento musicale acustico o elettronico a scelta, senza sovrapprezzo. Risposta del 02/10 (decisioni 10 e 11\) — implementata il 02/10.

> > •             **A.66 — Corredo da cucina**: 30 minuti per fino a quattro persone, NEC Rosso da 500 Lx, 50 Lx a preparazione. Risposta del 02/10 (decisione 19\) — implementata il 02/10.

> > •             **A.67 — Modulo Blu del Gehemmapuker**: è il Modulo Blu del catalogo NEC, una voce sola; regola generale: niente travaso di energia fra NEC. Risposta del 02/10 (decisione 14\) — implementata il 02/10.

> > •             **A.68 — Interfaccia neurale standard**: 3.500 cr \+ 2.000 di installazione, 2 UMN, acquistabile. Risposta del 02/10 (decisione 21\) — implementata il 02/10.

> > •             **A.69** — Installazione, rimozione e reinstallazione degli impianti: clinica sicura, tempi, Prova, postazioni, tariffe, legame impianto–perdita–recuperi. *App: da applicare.*

> > •             **A.70 e A.92** — L’Umanità si recupera solo con una procedura: Riabilitazione a cicli di 7 giorni dopo una rimozione (500 cr e Prova, oppure clinica 1.000 cr per \+1), massimo 20\. *App: da applicare.*

> > •             **A.71 — Cartuccia chirurgica**: un solo consumabile, «Cartuccia chirurgica — set sterile monouso», 500 cr o 2.500 per cinque. Risposta del 02/10 (decisione 17\) — implementata il 02/10.

> > •             **A.72** — Anticipazione senza scala leggibile: confluita nella A.109. *Chiusa il 07/10.*

> > •             **A.73 — Formato dei nemici per il Tavolo del Master** (E\&L del 02/10, decisioni 5–9). Formato con valori già calcolati, comune all’app e al futuro bestiario. Campi nuovi: azioni per Round, Contromisure, Abilità rilevanti con VA, talenti e capacità speciali. Sei Caratteristiche nel bestiario, facoltative nell’app; un valore mancante non vale 0\. Parità d’Iniziativa DES → INT → 1d10. I nemici seguono la procedura dei PG per PV, Ferite e Menomazioni, senza Affaticamento. Incantesimi completi con «Lancia\!» e PM scalati; incompleti come promemoria. Passo obbligatorio; Corsa e Scatto 2× e 3× se mancano; «non consentito» è diverso da «mancante». Formato implementato il 02/10 su main; plancia del Tavolo del Master implementata il 02/10 sul branch.

> > •             **A.74 — Rituale di Rigenerazione**: VA del Canale \= Rituali; dopo il Magistrale ripartizione libera entro i limiti; Rituale diretto solo PM personali; versioni per Ritualista. Risposta del 02/10 (decisioni 1, 2, 12, 13\) — implementata il 02/10.

> > •             **A.75 — Batterie oltre i 5 PM**: supporto base per tutte (0,2 kg, Comune, PS 10, 3 PI), anche Matrice. Risposta del 02/10 (decisione 16; Equipaggiamento §10.1) — implementata il 02/10. Poi confermate, insieme alla A.74, le risposte su Canali, Rituali, Ritualista e batterie con supporto base: l’app era già conforme.

> > •             **A.76** — Sanguinante: perdita iniziale una volta per attacco se almeno 1 danno supera l’AR; poi all’INI della fonte; fra più sanguinamenti vale il maggiore. *App: quasi conforme.*

> > •             **A.77** — Perforante riduce l’AR non magica totale a ogni applicazione di danno, senza erosione. *App: già conforme.*

> > •             **A.78 — Attacco con VA finale 20 o più**: gli attacchi e le Difese attive si tirano anche con VA finale 20 o più (salvo le eccezioni esplicite, come Colpo Elementale); Magistrale con 1 a VA 20 e con 1–2 da VA 21; con Successo Magistrale Migliorato 1–2 a VA 20 e 1–3 da VA 21; il 20 resta Maldestro. Le altre Prove seguono il §1.7. Risposta del 02/10 (E\&L, decisione 3\) — implementata il 02/10.

> > •             **A.79** — Umani costruiti come PG (livelli 2/5/8, media del dado arrotondata per eccesso, 7 punti); le etichette non danno PV, danni o Azioni; Eretico senza poteri oscuri. *App: da applicare.*

> > •             **A.80** — Si indossano da soli soprabiti, mantelli, Tabardo consacrato e Sottogiacca IES, con il profilo autonomo AR 1, Leggera, FOR 3 e le proprietà della scheda; su un’armatura compatibile valgono come rinforzo; togliendo l’armatura un rinforzo strutturale resta montato senza effetto. *Implementata il 03/10.*

> > •             **A.81** — Pelle di Rinoceronte: \+3 solo nelle Prove di Immobilizzare, Sbilanciare, Disarmare e Incalzare, e ad Atletica per uno sforzo di forza; mai a Difese o all’Abilità dell’arma. *Implementata il 03/10.*

> > •             **A.82** — Onda Interiore: dado della Disciplina e del Grado più il bonus di SAG (tetti \+1/+2/+3), non FOR; il \+2 Ravvicinato di Pelle di Rinoceronte non si applica. *Implementata il 03/10.*

> > •             **A.83** — REP Epica: ricerca con Oratoria −6, se il Direttore ammette una possibilità concreta; Batterie Matrice colorate Epiche, Bianche Leggendarie. *Implementata il 03/10.*

> > •             **A.84** — Regime di lancio dei nemici (Taumaturgo, altro utilizzatore, capacità specifica) con le due colonne di modificatori. *App: da applicare.*

> > •             **A.85** — Bonus di SAG al danno magico: calcolato per gli umani, dichiarato nel profilo per le creature, mai due volte. *App: da applicare.*

> > •             **A.86** — Granate e razzi: danno completo della munizione, senza bonus di Caratteristica. *Implementata il 03/10.*

> > •             **A.87** — Artefatti del gruppo già assegnati nei file dei PG, niente deposito comune: Lucas ha Guanti, Pietra, una Batteria Matrice e due Schegge; Dimitri Orlav una Batteria Matrice e due Schegge. *App: nessuna modifica (residui: A.112).*

> > •             **A.88** — Individuare a Concentrazione: 10 min / 30 min / 1 h / 2 h / 4 h per le versioni 6–8 / 9–11 / 12–14 / 15–17 / 18\. *Implementata il 03/10.*

> > •             **A.90 — Punti Abilità liberi**: vale il Manuale del Giocatore del 03/10 sera, 7 punti alla creazione e a ogni Grado (livelli 4, 8, 12, 16, 20); l’E\&L con 5 è superato. Chi ne ha assegnati 5 per Grado ha 2 punti da assegnare per evento («Assegna»); chi ne ha 10 ne ha 3 in eccesso per evento («Togli»). Nessun punto cambia da solo — implementata il 04/10.

> > •             **A.91** — Scheda unica del veicolo condivisa fra PG e Tavolo, proprietario distinto dal conducente. *App: da applicare (registro sul server).*

> > •             **A.93** — Corpi cyborg completi non disponibili ai PG. *App: già conforme.*

> > •             **A.94** — Interfaccia SIN: standard 5.500 cr e 2 UMN, CYBERTRONIC 7.000 cr e 1 UMN. *App: già conforme.*

> > •             **A.95, A.96 e A.97** — Via il −2 per il volo e il \+2 per la taglia; Boss solo come etichetta; calibrazione solo come «Stima sperimentale, da verificare al tavolo», senza costo universale dei moduli. *App: da applicare.*

> > •             **A.98** — Rune e Tatuaggi: sviluppo futuro, nessuna sezione nell’app. *App: da togliere la sezione vuota.*

> > •             **A.99** — Prevale la decisione approvata più recente; il Prontuario è solo un riassunto. *App: nessun codice.*

> > •             **A.101** — ASA Scout MK4 approvato (valore 202.520 cr, M606, copriruote, energia, aria, riparazioni, dotazione sanitaria). *App: applicata il 05/10.*

> > •             **A.102** — Autovettura civile: REP Comune. *App: applicata il 05/10.*

> > •             **A.103** — Esempio del §4.3 generico; lo Scout resta Corazzato 1\. *App: applicata il 05/10.*

> > •             **A.104** — Per le collisioni conta l’andatura attuale, distinta da quella scelta per dopo. *App: applicata il 05/10.*

> > •             **A.105** — Veicolo nel Tavolo del Master: si muove all’INI del conducente, senza INI propria. *App: da applicare, dopo A.91.*

> > •             **A.106** — Penombra −2, luce molto scarsa −4, buio come Accecato; Visione notturna e Visione Perfetta con i loro limiti. *App: da applicare.*

> > •             **A.107** — Correzioni retroattive dell’avanzamento: un livello passato si corregge con «Correggi» accanto al livello nella Progressione (stessa procedura di «Sali di livello», con le scelte di allora e le regole di quel livello). I livelli successivi si ricalcolano in ordine: i punti liberi che non aumentano più il VA al momento della loro assegnazione si riassegnano nello stesso livello con «Assegna», con i limiti di allora; gli altri restano. Prima di confermare l’app dice quali punti andranno riassegnati e quali tornano validi; se un livello successivo diventerebbe irregolare (per esempio le quote degli incantesimi) la correzione non si conferma. La salita di livello resta bloccata finché le riassegnazioni non sono finite. Un punto legittimo quando assegnato non si restituisce per un aumento automatico successivo. *Implementata il 09/10.*

> > •             **A.108** — Punti Abilità liberi in eccesso: 7 a ogni Grado, compreso il primo. Un personaggio con più punti (la vecchia regola dei 10\) non può salire di livello finché non li toglie: l’avviso in cima alla scheda dice quanti e dove, e «Togli» (anche «Togli da qui» per ogni evento) fa scegliere al giocatore le assegnazioni da togliere; l’app non sceglie da sola e indica soltanto quali punti già non aumentano il VA. I punti tolti non si riassegnano; poi la cronologia si ricalcola come A.107. I punti mai assegnati della vecchia regola non sono nel file: non c’è nulla da togliere. I PG del gruppo sono già tutti a 7 \+ 7\. *Implementata il 09/10.*

> > •             **A.109** — Anticipazione, regola comune e 32 aspetti: per ogni lancio si anticipa un solo aspetto, di un solo gradino; i PM base raddoppiano e la Prova di Potere è obbligatoria, di una categoria più difficile, salvo i Talenti; il resto resta invariato. I 32 aspetti hanno il gradino della tua risposta dell’08/10. In «Lancia\!» il riquadro dell’Anticipazione mostra il valore anticipato con le condizioni; nessun aspetto resta «da definire al tavolo». *Implementata il 09/10.*

> > •             **A.110** — Indossare e togliere protezioni: nella tab Combattimento ogni protezione mostra i suoi tempi — scudo 1 AzP per impugnarlo e 1 per riporlo, elmetto 1 / 1 AzP, armatura Leggera 1 / 1 minuto, Media 5 / 1, Pesante 10 / 5, soprabiti, mantelli e Tabardo consacrato 1 / 1 AzP, Sottogiacca IES 1 / 1 AzP (prima si toglie l’armatura che la copre), rinforzi strutturali leggeri 1 / 1 minuto e pesanti 5 / 5 sull’armatura tolta. Esoscheletri e servoassistite seguono la procedura della scheda. Con «Indossa» e «Togli», durante il Round di uno scontro si cambiano solo le protezioni in AzP (l’app ricorda l’AzP spesa); per armature e rinforzi avvisa che servono minuti. I benefici valgono solo a protezione indossata; restano il limite di un rinforzo, le compatibilità e la A.80. *Implementata il 09/10.*

> > •             **A.112** — Artefatti del gruppo, residui: confermati i valori dei file di Lucas e Dimitri (Guanti 10, Pietra della Vigilanza 10, due Batterie Matrice da 10, quattro Schegge da 5), artefatti carichi. *Nessuna correzione; chiusa il 09/10.*

> > •             **A.113** — Veicoli: il Direttore modifica tutti i veicoli della campagna, anche quelli personali dei PG (la proprietà resta al PG); senza server il veicolo condiviso si consulta in sola lettura nell’ultima copia, con data, revisione, proprietario e conducente. Nomi Corpo principale, Propulsione, Motore verificati. *Approvata il 15/10, implementata il 16/10.*

> > •             **A.114** — Chip del Processore e strumenti: il bonus del chip attivo si somma al miglior modificatore degli strumenti (resta un solo modificatore degli strumenti, §1.4.1); con altri benefici tecnologici equivalenti sulla stessa Prova (impianti, elmetti, esoscheletri, Equipaggiamento §7.1) vale il maggiore. Esempio: Medicina 10, chip \+2 e Kit trauma \+2 → 14\. Restano un chip attivo, 30 minuti, un’attivazione ogni 24 ore e nessun beneficio ad attacchi, Difese, manovre e magia. Superata l’ipotesi del maggiore fra chip e strumenti. *Implementata il 09/10.*

> > •             **A.115** — Capacità dei nemici: la mini-scheda mostra la descrizione completa e, solo se il profilo li dà, Prova, costo in Azioni, risorsa, limiti d’uso e «passiva»; con usi limitati c’è il contatore con «Usa» (a zero avvisa e lascia decidere il Direttore); dove mancano i dati resta il solo testo. *Approvata il 15/10, implementata il 16/10.*

> > •             **A.116** — Luce e attività pratiche visive: con luce non sufficiente la tab Abilità mostra «Richiede la vista» per ogni Abilità; accese di base Pilotare, Tecnologia, Medicina, Scienza, Sopravvivenza e Atletica (gli esempi della risposta), spente le altre; il Direttore le corregge. Con la casella valgono −2 in penombra, −4 con luce molto scarsa e −8 nel buio (impossibili le attività solo visive), una volta sola: niente doppioni con attacchi e Difese, che la ricevono sempre, né con Accecato; una visione che copre il bersaglio elimina −2/−4. Mai su Potere e Prove Salvezza; Percezione mantiene il suo valore visivo a parte. La luce viene dalla mappa se c’è, altrimenti si sceglie a mano. *Implementata il 09/10.*

> > •             **A.119** — Ammalato: sei intensità selezionabili, con penalità −1, −2, −4, −6, −8 e −10 a tutte le Prove di Abilità, attacchi e Difese compresi, mai alle Prove Salvezza. L’app mostra «Ammalato 3 — penalità −4»; cambiare intensità sostituisce la penalità, non la somma. Niente durata generica di 1+1d3 Round, niente contagio, progressione o cure automatiche (Manuale del Direttore). Vale per i PG (scheda) e per i nemici (plancia, anche nei loro attacchi e nelle loro Difese). *Implementata il 09/10.*

> > •             **A.120** — Bonus e malus temporanei di COS e SAG non cambiano i PV e i PM massimi né quelli attuali; valgono per le Prove e i bonus pertinenti. *App: era già così; confermata il 07/10.*

> > •             **A.121** — Riuso del codice della tua app per la mappa: domanda ritirata, la mappa è scritta da zero. *Ritirata il 06/10.*

> > •             **A.122** — Aiuto-master: nella lista «Tablet collegati» del Direttore, accanto a ogni tablet, «Rendi Aiuto-master» e «Revoca»: uno solo alla volta (darlo a un altro lo toglie al precedente), per lo scontro in corso; si perde alla fine dello scontro o al riavvio del server. Il tablet scelto vede «Sei Aiuto-master» e il pulsante per muovere il PG del turno attivo, con gli stessi limiti del giocatore (movimento, quadretti, muri, porte, quadretti occupati, nebbia); vede la mappa come i giocatori, senza pedine nascoste né note del Direttore. Il server rifiuta ogni altra modifica (schede, risorse, Iniziativa, scena, nebbia, luci, nemici) con un messaggio chiaro; gli spostamenti eccezionali restano al Direttore. Ogni movimento compare nel registro dello scontro come «mosso da Aiuto-master (tablet di …)». Il giocatore di turno continua a muovere il proprio PG dal suo tablet. *Implementata il 09/10.*

> > •             **A.123 — Iniziativa sulla mappa**: vale il Manuale del Giocatore (Mod DES \+ Mod INT \+ 1d10; parità per DES, poi INT, poi scelta fra alleati o 1d10 fra avversari); il d12 della tua app è del sistema precedente — deciso il 06/10.

> > •             **A.125** — Porte e illuminazione: applicate alla mappa il 07/10. Veicoli: si muovono all’Iniziativa del conducente (A.105) — *risposta di Marcello del 07/10*. Vecchie etichette numeriche delle luci: superate dal sistema semplice — *decisione di Marcello del 07/10*.

> > •             **A.126** — Ingombro e campo Spazio (1 Q, 2 × 2, 3 × 3\) nel profilo dei nemici, non dedotto dalla Taglia: la pedina usa quello; i nemici già scritti non cambiano. Con l’integrativa A.126–A.138: il cono di una creatura grande parte da un quadretto periferico del lato d’emissione, scelto con un tocco, e i suoi quadretti restano fuori. *Approvata il 15/10, implementata il 16/10.*

> > •             **A.129** — Movimento diviso: il Passo si divide; Corsa e Scatto sono un blocco unico. *Applicata alla mappa il 07/10*; aggiornata dalla A.136.

> > •             **A.131** — Immagine dei nemici sulle pedine: campo facoltativo nella scheda del nemico; senza immagine la pedina mostra le iniziali. *Implementata il 06/10.*

> > •             **A.132** — Uno Stordito non fa Attacchi di Opportunità. *Risposta di Marcello del 07/10 (decisione del gruppo, puoi rivederla); applicata alla mappa il 07/10.*

> > •             **A.133** — Portata delle creature grandi: misurata dal bordo dell’ingombro, non dal centro; 2 × 2 o 3 × 3 non danno portata 2 o 3 da soli. Zone di controllo e AdO solo con la «Mappa semplice» spenta. *Era già così nell’app; confermata il 16/10.*

> > •             **A.134** — Diagonale rasente allo spigolo di un muro: sì, se uno dei due quadretti ai lati è libero; se sono murati entrambi resta vietata. *Risposta di Marcello del 07/10 (decisione del gruppo, puoi rivederla); applicata alla mappa il 07/10.*

> > •             **A.135** — Ricarica e carichini: le armi caricate direttamente (revolver, doppiette, fucili a pompa e a pallini a serbatoio, archi e balestre) inseriscono fino a 2 cartucce per AzP, 4 con Ricarica Migliorata; niente più tamburo pieno in 1 AzP. Carichini nel catalogo: Ricarica per Tamburo (6 colpi, 100 cr) e per Serbatoio (6 colpi, 150 cr); nella scheda «Prepara» (fuori combattimento, 1 minuto ogni 50 colpi) e «Usa carichino» (fino a 6 colpi in 1 AzP). Ricarica Rapida: una sola ricarica gratuita per Round. *Implementata il 09/10.* Peso, Qualità, Integrità e Reperibilità dei carichini: vedi la A.151.

> > •             **A.136** — Corsa o Scatto dopo un Passo già cominciato e Prova facoltativa di Atletica: sulla mappa il Passo cominciato diventa Corsa o Scatto, con i quadretti fatti contati. In «Attacca\!» (PG e nemici, anche per il bersaglio che ha corso o scattato), senza Prova valgono Corsa −2/−2 e Scatto −6/−4; con la Prova l’esito sostituisce le penalità: Successo Magistrale 0/−6 e −2/−8; Successo 0/−4 e −4/−6; Fallimento −4/0 e −8/−2; Maldestro −6/0 e −10/0. Se il movimento è stato fatto sulla mappa, «Attacca\!» propone la Prova da solo. Le penalità valgono anche in mischia, salvo la Carica che ha le sue; il Movimento Evasivo è escluso. *Implementata il 09/10.*

> > •             **A.137** — Raggio di un’Area sulla griglia: a quadretti, con la diagonale a 1 Q (raggio 1 \= 3 × 3 Q, 2 \= 5 × 5, 3 \= 7 × 7). *Era già così nell’app; confermato il 09/10.*

> > •             **A.138** — Forma del Cono: parte dal centro del quadretto di chi lo usa e si allarga da zero fino all’ampiezza finale; un quadretto è colpito se è coperto per almeno metà; il quadretto d’origine è escluso. *Implementata il 09/10.* Origine per le creature grandi: vedi A.126 (16/10).

> > •             **A.139** — Porta «adiacente» in diagonale: sì, se la porta è raggiungibile dal proprio lato, 1 AzP e una mano libera, mai attraverso una parete. *Era già così nell’app; confermato il 09/10.*

> > •             **A.140** — Copertura sulla mappa: cinque linee dal centro del quadretto di chi attacca al centro e ai quattro angoli del bersaglio; 0 bloccate nessuna, 1–2 Leggera, 3–4 Media, 5 Totale; il solo contatto con un angolo non blocca; il Direttore corregge per altezza e postura. *Era già così nell’app; confermato il 09/10.* La tabella automatica per tipo e altezza dell’ostacolo resta rinviata.

> > •             **A.141 e A.144** — Creature in mezzo alla linea di tiro: una creatura interposta dà solo −2, una volta sola qualunque sia il numero, senza seconda Prova; il bersaglio ingaggiato resta al §5.10 (−4 e seconda Prova) e la stessa creatura non conta due volte. *Implementata il 09/10: la linea di tiro propone «Creatura interposta» in «Attacca\!».*

> > •             **A.142** — Fin dove vedono i PG: in piena luce nessun limite fisso, in Penombra 10 Q, con Luce scarsa 5 Q, al buio completo nulla oltre la propria pedina; conta la luce della zona osservata. *Implementata il 09/10 nella nebbia automatica.*

> > •             **A.143** — Sensi speciali e nebbia: Visione notturna 80 Q in penombra e luce scarsa, Visione termica 40 Q anche al buio, Vista Felina 20 Q nel buio naturale; aprono la nebbia entro la loro portata, pareti e porte chiuse li fermano. *Implementata il 09/10: il Direttore li accende sulla pedina («Sensi speciali…»).*

> > •             **A.145** — Azioni sui veicoli: tabella da consultare nella scheda del veicolo e nella plancia, con le righe generali e le categorie della risposta; l’app non conta le Azioni. *Approvata il 15/10, implementata il 16/10.*

> > •             **A.146** — Veicoli e AdO: regola registrata e richiamata nella tabella delle azioni; la mappa non propone da sola l’AdO dei mezzi (lo decide il tavolo). *Approvata il 15/10, implementata il 16/10.*

> > •             **A.147** — Veicoli a 45°: sulla mappa si girano di 45° (otto orientamenti, con Maiusc un passo fine); l’ingombro si controlla nell’orientamento effettivo; girare non consuma quadretti; Sterzata stretta, Inversione rapida e rotazione sul posto come promemoria. *Approvata il 15/10, implementata il 16/10.*

> > •             **A.148** — Copertura verso e da un token in volo: Copertura e creature interposte valgono anche in volo quando proteggono davvero dalla traiettoria; finché non ci sono le altezze l’app le propone come a terra e il Direttore le corregge. *Implementata il 09/10.*

> > •             **A.149** — La quota conta per la portata: la distanza è la maggiore fra quella orizzontale e la differenza di quota (diagonale 1 Q); salire da dentro a fuori portata può provocare un Attacco di Opportunità. *Era già così nell’app; confermato il 09/10.*

> > •             **A.150** — Un token in volo si vede da lontano: no, valgono le regole dei bersagli a terra (luce, sensi, ostacoli); il Direttore può rivelarlo a mano. *Implementata il 09/10.*

> > •             **A.151** — Carichini: Ricarica per Tamburo 0,1 kg e per Serbatoio 0,2 kg a vuoto, Qualità Comune, PS Integrità 10, 2 PI, Reperibilità Comune; pesano nel carico, le cartucce si contano una volta sola; a 0 PI avviso di «Rotto». *Approvata il 09/10, implementata il 13/10.*

> > •             **A.152** — Colt Hammershot: proiettili da pistola, il catalogo era già corretto; tolta dalla scheda la vecchia riga «tamburo pieno in 1 AzP» (vale la A.135). Il file di Michele Giorgetti lo corregge Marcello con «Modifica master». *Approvata il 09/10, implementata il 13/10.*

> > •             **A.153** — A Terra e Copertura a distanza: si sommano (−2 senza Copertura, −4 Leggera, −6 Media); il «Calcolo» mostra le due righe. *Era già così nell’app; confermata il 13/10.*

> > •             **A.154** — Cartuccia del decontaminante: 0,5 kg, fissi finché è nell’inventario, nel carico. *Approvata il 10/10, implementata il 13/10.*

> > •             **A.155** — Pergamene standard: 0,1 kg, Qualità Comune, PS Integrità 10, 1 PI per esemplare, per tutti i Gradi e anche per quelle create con «Crea consumabile»; a 0 PI non si attivano (avviso), la distruzione non libera l’incantesimo. *Approvata il 10/10, implementata il 13/10.*

> > •             **A.156** — Infusione fallita: si perdono tutti i PM (lavoro 3 × Grado più quelli da sigillare) e i reagenti. *Era già così nell’app; confermata il 13/10.*

> > •             **A.157** — «Rituale: non consentito» vieta solo il lancio come Rituale: l’infusione è permessa e in «Crea consumabile» c’è una nota con la spiegazione al posto dell’avviso di dubbio. *Approvata il 10/10, implementata il 13/10.*

> > •             **A.158** — CyberArma: due configurazioni nel catalogo con una sola voce d’inventario (fra Armi e Artefatti): modello originale (Grado I, SnT 1, Non comune, PS Integrità 12, 4 PI, 0,5 kg, Epica, senza prezzo) e con Batteria Verde da 5 cariche (Grado II, SnT 2 contata una volta, 0,7 kg, una carica per attivazione). Uso per Classe nei dati: Custode 1 PM per 15 Round e \+1 danno; Tecnomante 2 PM per 10 Round, 1d8 Magico; altre Classi solo con la batteria e a −2 (avviso, non blocco). «Attiva» scala il costo; scheda e «Attacca\!» mostrano i Round che restano. Costruzione come testo. Nel catalogo anche la Custodia del Silenzio (§7.25.1). *Approvata il 13/10, implementata il 15/10.* Vedi la A.166.

> > •             **A.159** — Morente: oltre Grave il PG resta a −8, sviene e ha un contatore di Round pari alla COS, che cala di 1 a ogni Round dello scontro e per ogni nuova Ferita; a 0 l’app avvisa che è morto e lascia decidere al Direttore. «Stabilizza» riporta a Grave; le quattro vie approvate sono un promemoria di solo testo. Cartuccia Stabilizzante nel catalogo (2.000 cr, MR). Supera la decisione provvisoria di Marcello del 13/10. Nemici invariati in attesa della A.164. *Approvata il 14/10, implementata il 15/10.*

> > •             **A.161** — PX della partita: tab «PX della partita» nel Tavolo del Direttore, solo sul PC del master. Voti, bonus, incontri (principale al 100%, gli altri al 50%, con il correttivo per il numero di PG) e premio di fine Atto; componenti separate, totale suggerito e totale finale modificabile; «Assegna PX della partita» aggiorna i PG presenti e scrive la Modifica master. L’app non assegna mai da sola: salvare o ricalcolare non assegna, e correggere una partita applica solo la differenza. Ci sono archivio delle partite, riepilogo con esportazione CSV e impostazioni di campagna (Atto, PX iniziali, abbinamenti giocatore–PG). I fattori stanno in un file modificabile. *Approvata e implementata il 16/10.* Vedi la A.168.

> > •             **A.168 — Fasce dei Titoli per i PX.** Ricevuta (18/10): Principiante 1–3 ×1, Inesperto 4–7 ×2, Esperto 8–11 ×3, Veterano 12–15 ×4, Eroe 16–19 ×5, Leggenda 20+ ×6. Nel calcolatore il Titolo di una partita dipende dai PX che il PG aveva **prima** di quell’assegnazione, così il premio della partita stessa non lo sposta di fascia nelle correzioni; il Direttore può cambiarlo a mano. *Implementata il 18/10.* Vedi la A.170.

> > •             **A.160** — Avversari costruiti come PG: 7 punti Abilità liberi alla creazione e a ogni Grado; il «5» del §5.2 era un refuso, corretto dalla 0.4 in poi. *Era già così nell’app; verificata il 16/10.*

> > •             **A.162** — Integrità degli oggetti in tre stati: ordinaria (PS Integrità e PI), **Indistruttibile** (dicitura visibile, il danno non toglie PI e non rompe) e «da definire» (dato mancante, segnalato). Scrigno del Primo Giuramento indistruttibile, con la regola che il danneggiamento non lo apre; non si estende a Sigilli, contenuto o altri Artefatti. *Approvata e implementata il 16/10.*

> > •             **A.163** — Contenitori del Silenzio (Custodia, Zaino, Cofanetto) nel catalogo, con «Schermatura attiva / inattiva» e le due caselle «chiuso» e «contenuto riposto»: vale per qualunque contenuto, senza elenchi di oggetti; l’app non calcola la Corruzione e ricorda che la schermatura non la elimina. *Approvata e implementata il 16/10.*

> > •             **A.164** — Morente anche per i nemici: oltre Grave Svenuto, −8 e contatore pari alla COS intera all’ingresso (0 PV da soli non bastano). Il primo calo arriva dopo un Round completo, alla stessa Iniziativa dell’ingresso (vale anche per i PG); le Ferite in eccesso del colpo d’ingresso non tolgono Round, ogni Ferita successiva ne toglie 1; a 0 l’app avvisa senza bloccare. «Stabilizza» riporta a Grave. Senza COS l’app la chiede, non la deduce e non dichiara morto. *Approvata e implementata il 16/10.*

> > •             **A.166** — CyberArma: Abilità sempre Armi da mischia; la manifestazione è un campo a parte e da essa dipendono famiglia, Specializzazione e Manovre (lama lunga → Spade, frusta → Armi flessibili, ascia → Asce, lancia → Armi inastate). Il Custode sceglie la forma; gli altri usano quella del progetto (lama lunga), modificabile solo come modifica del manufatto. Una sola Specializzazione. *Approvata e implementata il 16/10.*

> > •             **Manuale dei Mostri 0.23 — catalogo completo.** Le regole comuni (cap. 4\) e le «Regole operative del catalogo» (cap. 8\) coincidono con le decisioni già approvate (Morente A.159 e A.164, spazio A.126 e A.133, Abilità non riportate A.116, 7 punti A.160, dato assente ≠ 0): nessuna automazione nuova. Le schede mostrano GS e PX del manuale come dato informativo (A.161). Nel bestiario sono pronte da usare **tutte le 215 creature del cap. 8**, più la Covata (nove caste) e il Lorath del cap. 7: 225 profili dal manuale, con Spazio, portata per attacco e capacità con i parametri del manuale. Le creature senza mente, con «Volontà —», hanno la Salvezza assente in modo esplicito, mai uno 0\. In tutto il bestiario dell’app ha **367 schede**: 142 nostre e 225 dal manuale, riconoscibili dalla riga «Fonte: dal Manuale dei Mostri v0.23» nella mini-scheda della plancia e nella pagina online, che ha anche i filtri per categoria e per grado. *Implementato fra il 16 e il 18/10.* Vedi A.167, A.169 e A.171.

> > •             **A.165** — A.109 nel Doc E\&L: rettifica editoriale, la A.109 è risolta e le note di sospensione sono state aggiornate; l’app mantiene i 32 gradini dell’08/10. *Chiusa il 16/10.*

> > •             **Stati 1/11–11/11** — Sintesi operative approvate il 05/10: il testo di ogni sintesi è nell’app (tooltip degli Stati), con i modificatori allineati. Cambiati: A Terra (striscia 3 Q; a distanza −2 a chi lo attacca), Svenuto (cade A Terra anche nei valori), Accecato (la penalità di luce non si somma; il −8 vale anche per le attività che richiedono la vista). Già uguali nei numeri: Assordato, Avvelenato, Immobilizzato, Incendiato, Rallentato, Sanguinamento, Stordito, Terrorizzato. Gli Stati dei nemici pesano ora sui loro attacchi e sulle loro Difese. *Implementate il 09/10.* Vedi anche la A.153.

> > •             **Manuale dell’Equipaggiamento 0.6** — 18 voci nuove nel catalogo (navigatore inerziale, decontaminante ed erogatore, estintori, nastro tecnico, toppe pressurizzate, applicatore di schiuma, tuta extraveicolare, riparo pressurizzato, calzature magnetiche, modulo di cifratura, rilevatore di sorveglianza, utensile laser, analizzatore alimentare) con i valori del manuale; righe nuove della tabella NEC; dosi, toppe, test e aria come risorse a consumo; la cifratura dei comunicatori richiede il modulo (§4.1). *Implementato il 09/10.* Vedi la A.154.

> > •             **Magia §27 — Artefatti consumabili** (Doc dell’08/10) — le sei pergamene del campionario si comprano dal catalogo (Artefatti, sottocategoria Consumabili) al prezzo di vendita della tabella, con SnT 0, senza sintonizzazione e con i PM sigillati, che non diventano una riserva del personaggio. Nella scheda si vedono gli esemplari posseduti e «Usa»: l’oggetto si consuma solo ad attivazione completata, l’attivazione interrotta non consuma nulla, e un effetto a durata (Arma Mistica, Armatura Mistica, Individuare) va fra gli incantesimi in corso. In combattimento si usano le pergamene da 1 AzP; Esorcizzare Corruzione (10 minuti) e Rigenerazione (3 ore) fuori dal combattimento. «Crea consumabile» segue le tre fasi del §24 richiamate dal §27.2: Incantesimo e versione conosciuti (o conosciuti da chi è presente), Officiante con Ritualista Minore o Maggiore, pergamena standard o altro supporto con costo e complessità della ricetta, progetto già disponibile o Prova di Artefatti, supporto con Tecnologia, infusione con Rituali e Canali; reagenti e PM del §27.2 (3 × Grado più i PM sigillati, Magistrale che dimezza lavoro e reagenti), esiti e nuovi tentativi del §24. Il giocatore indica gli esiti; l’app scala crediti e PM e mette il Consumabile nell’Inventario (per esempio Arma Mistica 3 con infusione Magistrale: 50 crediti e 5 PM). La scheda stampata elenca i Consumabili nel foglio Inventario con Incantesimo, versione, attivazione ed esemplari. *Implementato il 09/10.* Vedi A.155, A.156 e A.157.

> > •             **Manuali del 12/10 (Giocatore 0.48, Armamenti 0.61)** — Guanti da Combattimento Mistico: oggetto insieme Arma e Artefatto, si indossano senza occupare le mani. *Implementati il 13/10.* La CyberArma (§7.25) aspetta la A.158.

> > •             **A.167 — Ingombri rettangolari e orientamento delle creature.** Risposta del 18/10, implementata il 18/10. Il campo Spazio delle schede ora porta larghezza × lunghezza, anche oltre il 3 × 3 Q e fino a 12 per lato: la mappa disegna la sagoma vera (una 3 × 10 Q occupa 30 Q, non 100\) e la gira anche di 45° con le frecce, i pulsanti ↺ ↻ o la voce «Ruota». Ingombro, Zone di Controllo, luce, selezione a riquadro e posizione iniziale seguono i quadretti veri, non il rettangolo che li contiene. Se la posizione non è valida l’app avvisa e lascia «Procedi comunque». La Taglia si legge dalla scheda e non si deduce più dall’ingombro. Restano fuori solo le pedine quadrate molto grandi (4 × 4, 6 × 6 Q), che non ruotano: un rombo non è una sagoma del manuale. Vedi la A.172.

> > •             **A.169 — Abilità del bestiario, VA degli attacchi e Prove di Caratteristica.** Risposta del 18/10, implementata il 18/10. Le Abilità delle creature usano i nomi del catalogo (Diplomazia → Oratoria; «Mischia», «Lancio» e «Guerra» → Armi da mischia, da lancio e da guerra). «Tiro naturale», «Attacco a distanza» e «Prove di FOR» non sono Abilità: il VA resta nel rispettivo attacco (Aghi 10, Roccia 13, Dardo d’acqua 14, Dardo d’aria 16\) e l’Elementale della Terra ha «Prova di Forza: 15» come dato a parte, senza sommare il modificatore due volte.

> > •             **A.170 — Soglie, Atti e fattori di calcolo dei PX.** Risposta del 18/10, verificata il 18/10. Il calcolatore già faceva tutto come confermato: soglie cumulative dei livelli 1–20, limiti e premi degli Atti, correttivo max(0,5; 1 \+ 0,1 × (4 − n)), voti × Titolo con il raddoppio dei soli voti nelle partite lunghe, bonus eccezionale × Titolo senza raddoppio, incontri e premi degli Atti senza Titolo, Titolo posseduto all’inizio della partita, nessun fattore per l’equipaggiamento. L’unica aggiunta: se i presenti hanno già ricevuto il premio dello stesso Atto in un’altra partita, l’app **avvisa** (non blocca).

> > •             **Manuale dell’Equipaggiamento 0.8, §§10.8–10.11** — Pergamene, CyberArma, Hachimaki della Disciplina Interiore e Tomo dei Guardiani nel catalogo degli Artefatti, con i valori del manuale. Nessun personaggio, nemico o scontro salvato possedeva l’Hachimaki o il Tomo: sono in catalogo come oggetti acquistabili, senza assegnarli a nessuno. L’Hachimaki abbassa di 1 PM il costo delle Tecniche Interiori quando è indossato **e** sintonizzato, e la scheda mostra sempre la base e la riduzione («4 PM della scheda − 1 per Hachimaki»); indossato ma non sintonizzato, l’app avvisa e il costo non cambia. Il Tomo ha peso, SnT e Integrità «da definire», come scrive il manuale, e il carico risulta parziale. *Implementato il 19/10.* Una domanda aperta: A.173.

> > •             **A.171 — Portata degli attacchi degli Sciami.** Risposta del 21/10, implementata il 22/10. Il formato accetta ora la portata **0 Q**: un attacco a portata 0 colpisce soltanto un bersaglio con cui l’attaccante condivide almeno un quadretto occupato, e un bersaglio soltanto adiacente non è valido. I sei Sciami del bestiario sono a 0 Q e la nota di ripiego è tolta. Se il bersaglio è troppo lontano l’app lo scrive in chiaro invece di proporre un attacco impossibile.

> > •             **A.172 — Sagome ruotate, quadretti occupati e portata.** Risposta del 21/10, implementata il 22/10. Due criteri distinti, come hai chiesto: **occupazione e portata** contano un quadretto quando la sagoma ne copre almeno metà (una 3 × 10 Q ruotata ne occupa 28, e va bene); le **collisioni** con muri, ostacoli e altre pedine usano invece la sagoma geometrica piena, comprese le parti che coprono meno di metà quadretto, così la rotazione non permette a un angolo di attraversare un muro. La portata si misura dal quadretto occupato più favorevole, mai dal centro, restando valide linea di visuale e coperture. Il bordo della mappa resta sull’occupazione: non è un ostacolo fisico e una pedina ruotata deve potercisi appoggiare.

> > •             **A.173 — Hachimaki, costi delle Tecniche e sintonizzazione.** Risposta del 21/10, verificata il 22/10. L’app faceva già esattamente così: la riduzione di 1 PM si applica al costo dell’**uso scelto** (i quattro usi della Mano Curativa sono alternative), minimo 1 PM sui costi positivi, una Tecnica gratuita resta gratuita, nessun cumulo, e la scheda mostra sempre costo base e costo finale. SnT 1 confermata. **Attenzione:** con il Manuale 0.49 del 21/10 i costi di quella tabella cambiano — vedi A.178.

> > ---

> > ## **7\. Risposte di Davide**

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

> > ### **Allineamento delle risposte approvate — regole tecniche e Stati**

Aggiornamento del ott 6, 2026  
 Fonte delle decisioni: [*E\&L – Risposte e correzioni approvate*](https://docs.google.com/document/d/1VaqZaAe4NK5P8A956Eahua_ZT60eh3ohnR2xSqh-tVs/edit)  
 Questo aggiornamento riporta le risposte approvate già registrate nel documento E\&L: 14 quesiti tecnici e le sintesi degli undici Stati, con Ammalato disciplinato dalla A.119. Non introduce nuove decisioni.  
 Stato delle risposte: A.107, A.108, A.110, A.114, A.116, A.119, A.120, A.124, A.127, A.128 e A.129 sono definite nei limiti esplicitati; A.111, A.122 e A.125 hanno ancora dati o sottopunti da chiarire, indicati in fondo. Le regole dettagliate delle malattie restano destinate al Manuale del Direttore.  
 «Risposta approvata» non significa «implementata nell’app». Le domande originali e le annotazioni del collaboratore sono conservate: le ipotesi «Nel frattempo» corrispondenti sono superate dalle risposte riportate qui. Il passaggio alla sezione 6 richiede la verifica del recepimento nell’app.

> > #### **A.107 — Correzioni retroattive dell’avanzamento**

Approvato il ott 5, 2026  
 È consentito correggere un evento precedente dell’avanzamento. L’app ricalcola in ordine cronologico tutti gli eventi successivi.  
 Se, nella cronologia corretta, un punto libero assegnato successivamente non produce più un incremento valido del VA al momento della sua assegnazione, quel punto va riassegnato nello stesso avanzamento originario, rispettando i limiti applicabili allora. Le altre assegnazioni ancora valide restano invariate.  
 La salita a nuovi livelli resta bloccata finché la ricostruzione e le riassegnazioni necessarie non sono completate.  
 Questa regola riguarda la correzione della cronologia: un punto legittimo quando assegnato non viene restituito soltanto perché un successivo aumento automatico di Caratteristica o Classe supera legittimamente il limite.

> > #### **A.108 — Punti Abilità liberi in eccesso**

Approvato il ott 5, 2026  
 Si confermano 7 Punti Abilità liberi a ogni Grado, compreso il primo. I punti residui della precedente assegnazione di 10 per Grado devono essere eliminati e bloccano ulteriori passaggi di livello finché la scheda non è riconciliata.  
 Quando l’eccesso è stato speso, il giocatore sceglie quali assegnazioni rimuovere; l’app non cancella arbitrariamente punti da un’Abilità. I punti eccedenti sono eliminati, non riassegnati. La cronologia viene poi ricalcolata secondo A.107.  
 Esempi: se sono stati spesi 10 punti dove ne spettavano 7, occorre rimuovere 3 punti dalle assegnazioni; se sono stati spesi 7 punti e ne restano 3 non assegnati, si eliminano quei 3 senza modificare le Abilità.

> > #### **A.110 — Indossare e togliere protezioni**

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

> > #### **A.111 — Recuperi di Umanità pregressi e impianti rimossi**

Approvato il ott 5, 2026  
 I recuperi pregressi realmente concessi e confermati dal Direttore restano validi e inclusi nel calcolo, anche se non derivano dalla rimozione di un impianto. Si registrano come «Recupero straordinario di Umanità — concessione del Direttore», distintamente dalla riabilitazione ordinaria.  
 Dopo la conferma, l’avviso di verifica è sostituito da una nota nello storico. Non si inventa una rimozione per giustificare il recupero e lo stesso beneficio non può essere conteggiato due volte.  
 I recuperi di provenienza incerta restano «da verificare» e conservati nel calcolo, senza modifiche automatiche; il totale di UMN è indicato come provvisorio fino alla verifica. Il Direttore controlla causa e procedura: se il recupero è valido si completa lo storico; se è errato si annulla il beneficio e si ricalcola UMN conservando traccia della correzione.  
 L’assenza di un impianto dall’inventario non prova una rimozione chirurgica e non restituisce automaticamente UMN. Le concessioni straordinarie pregresse non autorizzano l’app ad assegnare nuovi recuperi automatici fuori dalla procedura ordinaria.  
 La conferma generale non risolve il caso fattuale di Pablo Zaion: resta da verificare perché l’Interfaccia neurale, associata alla perdita di 2 UMN, non compare più nell’inventario.

> > #### **A.114 — Chip del Processore e strumenti**

Approvato il ott 5, 2026  
 Il bonus pertinente di un chip del Processore si somma al modificatore degli strumenti. Il chip non è un secondo modificatore degli strumenti.  
 Si applica comunque un solo modificatore complessivo degli strumenti, secondo §1.4.1. Il chip non sostituisce strumenti, materiali, requisiti o Talenti necessari. Benefici tecnologici equivalenti a quello del chip non si sommano, secondo Equipaggiamento §7.1.  
 Esempio: Medicina 10, chip di assistenza \+2 e Kit trauma Professionale \+2 producono VA 14 quando tutti i benefici sono pertinenti.  
 Restano i limiti ordinari del Processore: un chip attivo, durata 30 minuti e una attivazione ogni 24 ore; nessun beneficio ad attacchi, Difese, manovre di combattimento o prove di magia. È superata l’ipotesi provvisoria dell’app che applicava soltanto il maggiore tra chip e strumenti.

> > #### **A.116 — Luce e attività pratiche che richiedono visione**

Approvato il ott 5, 2026  
 La penalità dipende dall’impiego concreto, non dal nome dell’Abilità o dalla Caratteristica scelta. Non si applica indistintamente a tutte le prove di una stessa Abilità.  
 Esempi pertinenti: Pilotare quando occorre vedere percorso e comandi; Tecnologia per esaminare o lavorare su componenti; Medicina per esami e interventi visivi; Scienza per osservare campioni o leggere misure; Sopravvivenza per seguire tracce visibili o orientarsi a vista; Atletica per ostacoli e appigli da individuare.  
 Richiamare conoscenze, ascoltare o svolgere attività che non richiedono la vista non riceve automaticamente la penalità. Restano i limiti della A.106: non si estende automaticamente a Potere o alle Prove Salvezza.  
 Si applicano −2 in penombra, −4 con luce molto scarsa e gli effetti sensoriali di Accecato nel buio totale: −8 per ciò che resta possibile, impossibilità per attività esclusivamente visive.  
 L’app deve poter qualificare il singolo uso come «richiede la vista», con correzione del Direttore. Il modificatore si applica una sola volta, dopo aver considerato illuminazione effettiva e capacità visive, senza duplicarlo con la medesima penalità già applicata alla prova.

> > #### **Stati — Sintesi operative approvate per l’app**

Approvato il ott 5, 2026  
 Sono approvate le seguenti sintesi degli undici Stati del Manuale del Giocatore, §§5.5, 5.15 e 5.18. Sono testi operativi ricostruiti dal manuale e approvati uno alla volta: non è stato possibile confrontarli con le undici righe originarie dell’app, non disponibili.  
 Il precedente promemoria che indicava le sintesi ancora da approvare è superato da questo blocco. Ammalato è disciplinato separatamente dalla nuova A.119 riportata oltre.

> > #### **Stato 1/11 — A Terra**

−4 VA agli attacchi ravvicinati, alle Difese e alle prove che richiedono equilibrio. La penalità non si estende automaticamente a tutte le attività fisiche.  
 Può usare attacchi a distanza senza penalità propria dello Stato, se la posizione lo consente.  
 Chi lo attacca ottiene \+2 VA in Ravvicinato e subisce −2 VA a Distanza. Nessun modificatore per gli attacchi ad Area.  
 Non può Correre o Scattare; può strisciare di 3 Q con un’AzM. Buttarsi a terra o rialzarsi richiede un’AzM oppure un’AzP.  
 Dura finché si rialza: non si applica la durata generica di 1+1d3 Round.

> > #### **Stato 2/11 — Accecato**

−8 VA alle prove che richiedono la vista, compresi attacchi e Difese contro avversari non percepiti. Le attività esclusivamente visive falliscono automaticamente.  
 Non può effettuare Tiro Mirato o Colpo Mirato. Può attaccare soltanto conoscendo almeno la posizione approssimativa del bersaglio.  
 Gli avversari che non riesce a percepire ottengono \+4 VA contro di lui. Le attività basate soltanto su altri sensi disponibili non ricevono automaticamente la penalità; sensi speciali, Talenti e strumenti seguono le proprie regole.  
 Durata ordinaria 1+1d3 Round, salvo la fonte. Solo quando la fonte consente una PS Riflessi, il successo dimezza la durata per eccesso; il fallimento conserva la durata intera.  
 Quando l’impossibilità di vedere dipende dal buio totale, dura finché permane la condizione ambientale: non si tira una durata casuale.

> > #### **Stato 3/11 — Assordato**

Le prove basate esclusivamente sull’udito falliscono automaticamente. −4 VA alle prove in cui l’udito è importante ma non indispensabile.  
 Non riceve ordini, avvertimenti o informazioni trasmessi soltanto a voce. Può parlare, ma controlla male il volume.  
 Le attività basate su vista o altri sensi disponibili non ricevono automaticamente penalità. È immune agli effetti che richiedono di essere uditi.  
 Durata ordinaria 1+1d3 Round, salvo la fonte. Nessuna PS generale: si effettua soltanto se la fonte la consente.  
 Il −4 non si applica automaticamente a tutti gli attacchi e alle Difese: conta quanto l’azione dipende dall’udito.

> > #### **Stato 4/11 — Avvelenato**

All’esposizione si effettua PS Tempra con il modificatore del veleno. Il successo dimezza per eccesso ciascun danno periodico; se il veleno non provoca danni, dimezza invece la durata, salvo la fonte.  
 Danni, frequenza, penalità, altri Stati e durata dipendono dal veleno. Non esiste una penalità generale comune a tutti i veleni.  
 Il danno ignora AR; a 0 PV si applicano le normali regole delle Ferite. Per un effetto temporaneo senza durata specifica si usa 1+1d3 Round.  
 Una nuova esposizione allo stesso veleno rinnova la durata senza sommare i danni periodici. Veleni diversi possono coesistere.  
 L’antidoto appropriato interrompe immediatamente l’effetto. Medicina permette di identificarlo e trattarne i sintomi, ma non elimina automaticamente lo Stato.

> > #### **Stato 5/11 — Immobilizzato**

Non può spostarsi, Correre o Scattare. Subisce −4 VA alle azioni fisiche ancora possibili; gli arti bloccati non possono essere utilizzati.  
 Liberarsi segue la fonte. Per la manovra Immobilizzare, il tentativo richiede 1 AzP e una Prova contrapposta.  
 Gli effetti temporanei durano normalmente 1+1d3 Round, salvo la fonte; una presa permane finché spezzata o rilasciata.  
 Mantenere una presa non costa Azioni, ma impegna le mani utilizzate. Chi la mantiene può spendere 1 AzP ed effettuare una nuova Prova contrapposta per infliggere il proprio danno senz’armi; il fallimento non interrompe la presa.  
 Il −4 non si applica automaticamente alle PS o alle attività mentali.

> > #### **Stato 6/11 — Incendiato**

PS Riflessi iniziale, salvo esplicita eccezione della fonte: il successo evita lo Stato. Durata ordinaria 1+1d3 Round, salvo la fonte.  
 Infligge immediatamente 1d4 PV da fuoco, poi all’Iniziativa della fonte nei Round successivi, al massimo una volta per Round. Il danno iniziale non viene ripetuto nello stesso Round.  
 Per tutta la durata: −2 VA a tutte le prove di Abilità, non alle PS.  
 Spegnersi richiede 1 AzP e PS Riflessi. Con mezzi adeguati, come acqua, sabbia o coperta antifiamma, basta 1 AzP senza prova; può intervenire un alleato.  
 Applicazioni ripetute non sommano i danni; si mantiene la durata maggiore.  
 Il danno ignora AR generica non magica. AR magica pertinente può ridurlo a 0; protezioni specifiche contro il Fuoco seguono la propria descrizione. Ignifugo X è una contromisura preventiva e non si sottrae al danno.  
 Ridurre il danno a 0 non spegne le fiamme e non elimina il −2 VA. Restano le precisazioni della A.50 su natura dell’AR e protezioni contro il Fuoco.

> > #### **Stato 7/11 — Rallentato**

Passo ridotto a 3 Q; non può Correre o Scattare. Se un altro effetto impone movimento inferiore, prevale il limite più restrittivo.  
 −2 VA alle prove fisiche e alle Difese; non si applica automaticamente ad attività mentali o PS.  
 Solo quando la fonte consente PS Tempra o Riflessi, il successo evita lo Stato.  
 Durata ordinaria 1+1d3 Round, salvo la fonte. Applicazioni ripetute non sommano le penalità; si mantiene la durata maggiore.  
 Continuano ad applicarsi i normali costi di terreno e modalità di movimento, compreso il Nuoto.

> > #### **Stato 8/11 — Sanguinamento**

Possiede un valore X indicato dalla fonte. Perde subito X PV ignorando Armatura, Parata e Schivata; la perdita si ripete all’Iniziativa della fonte, al massimo una volta per Round, contando l’applicazione iniziale.  
 La perdita non porta sotto 0 PV. Quella che porta a 0 non provoca immediatamente una Ferita. Se il personaggio è già a 0 PV, effettua PS Tempra: successo, nessuna nuova Ferita; fallimento, 1 Ferita.  
 Il Magistrale rende automaticamente riuscita la successiva Tempra contro lo stesso Sanguinamento. Il Maldestro provoca 1 Ferita e −4 alla prossima Tempra contro lo stesso Sanguinamento.  
 Più Sanguinamenti non si sommano: si usa il valore più alto. Persiste finché arrestato, senza durata generica di 1+1d3 Round. Un Sanguinamento attivo impedisce il recupero di PV e Ferite.  
 Arrestarlo con Medicina richiede un kit utilizzabile, accesso al paziente e 10 Round continuativi. Un’applicazione si consuma all’inizio. Il soccorritore resta adiacente e spende 1 AzP ogni Round; può soltanto effettuare Passo, mentre il paziente non può Correre o Scattare. Durante il trattamento il Sanguinamento è sospeso.  
 Prova finale: \+2 VA per X=1; nessun modificatore per X=2; −2 VA per X≥3, oltre a strumenti e Talenti pertinenti.  
 Kit Improvvisato: successo, sospende per 10 Round; Magistrale, arresta.  
 Kit Standard: successo, arresta; Magistrale, arresta e recupera 1d4 PV.  
 Kit Professionale: successo, arresta e recupera 1d4 PV; Magistrale, arresta e recupera il doppio del risultato di un unico 1d4. Non si superano i PV massimi.  
 Interruzione o fallimento fanno riprendere il Sanguinamento; l’interruzione non concede prova finale né restituisce materiali. Con Maldestro il paziente perde anche 1d4 PV, senza scendere sotto 0 né subire una Ferita diretta.  
 Ripresa e sospensione rispettano il limite di una perdita periodica per Round. Restano le condizioni di applicazione della proprietà e gli altri chiarimenti della A.76.

> > #### **Stato 9/11 — Stordito**

Può effettuare soltanto Passo; non può compiere Azioni Principali. Conserva PS e Prove contrapposte passive, ma non può utilizzare Difese che richiedono Azioni.  
 Durata ordinaria 1+1d3 Round, salvo la fonte. Applicazioni ripetute non si sommano; si mantiene la durata maggiore.  
 Quando diventa Stordito, effettua immediatamente PS Volontà per mantenere la Concentrazione e Prova di Potere per mantenere la Focalizzazione, se pertinenti. Le prove sono senza costo in Azioni: il successo mantiene l’effetto, il fallimento lo interrompe.  
 Queste verifiche sono richieste anche senza danni e non si ripetono ogni Round per la sola permanenza dello Stato.

> > #### **Stato 10/11 — Svenuto**

Non può compiere Azioni né muoversi e cade A Terra. Non può usare Difese attive e normalmente non percepisce l’ambiente; è incapace di reagire per le regole che richiedono questa condizione.  
 Perde immediatamente Concentrazione e tutte le Focalizzazioni, senza prove per mantenerle.  
 La durata dipende dalla causa. Per un effetto temporaneo senza durata specifica si usa 1+1d3 Round.  
 A 0 PM lo svenimento permane finché recupera almeno 1 PM: non termina per la semplice scadenza di Round.  
 Se sta volando o nuotando si applicano le conseguenze delle rispettive regole di movimento.

> > #### **Stato 11/11 — Terrorizzato**

Una PS Volontà iniziale riuscita evita lo Stato. Durante lo Stato: −4 a tutte le prove, comprese le PS. Il −4 non si applica alla PS iniziale per evitarlo.  
 Non può avvicinarsi volontariamente alla fonte della paura e deve usare il Movimento per fuggire lungo il percorso ragionevolmente più sicuro.  
 Le AzP possono essere usate soltanto per difendersi, nascondersi, agevolare la fuga o rimuovere lo Stato. Se fuggire è impossibile, può effettuare Passo o cercare Copertura, ma non compiere azioni offensive contro la fonte.  
 Durata ordinaria 1+1d3 Round, salvo la fonte. Applicazioni ripetute non sommano le penalità; si mantiene la durata maggiore.  
 Un alleato adiacente può spendere 1 AzP ed effettuare Oratoria: con successo lo Stato termina. Termina immediatamente anche quando la scomparsa della fonte della paura è evidente al personaggio.

> > #### **A.119 — Ammalato: intensità ed effetti nell’app**

Approvato il ott 6, 2026  
 Ammalato ha sei intensità selezionabili nell’app, con penalità rispettivamente −1, −2, −4, −6, −8 e −10.  
 La penalità si applica a tutte le prove di Abilità, compresi attacchi e Difese; sono escluse le Prove Salvezza. Eventuali eccezioni specifiche potranno essere definite nelle singole malattie.  
 L’app applica automaticamente il modificatore e mostra intensità ed effetto, per esempio «Ammalato 3 — penalità −4». Cambiare intensità sostituisce la penalità precedente, senza sommarla.  
 Gli effetti possono manifestarsi immediatamente quando la fonte lo prevede, come la febbre dell’incontro già giocato. Non si applica la durata generica di 1+1d3 Round.  
 Contagio, incubazione, progressione, durata e guarigione saranno definiti nel Manuale del Direttore. Non si introducono ora frequenze, tiri o cure automatiche aggiuntive.  
 È superata la proposta di lasciare Ammalato come semplice indicatore privo di effetti, così come il comportamento provvisorio dell’app che lo segnava senza applicare penalità.

> > #### **A.120 — COS e SAG temporanee: PV e PM**

Approvato il ott 6, 2026  
 Bonus e malus temporanei a COS non modificano automaticamente i PV massimi. Bonus e malus temporanei a SAG non modificano automaticamente i PM massimi.  
 Non cambiano direttamente neppure i rispettivi valori attuali, né all’inizio né alla fine dell’effetto.  
 Le Caratteristiche modificate continuano a influire sulle prove e sui bonus pertinenti, per esempio COS sulla Tempra e SAG su Potere, secondo le normali formule e i limiti applicabili.  
 Un effetto può modificare direttamente PV o PM soltanto se lo dichiara espressamente. Gli aumenti permanenti, compresi quelli dell’avanzamento, conservano le rispettive regole.  
 Esempio: COS 6 e 25/40 PV; con \+2 COS temporaneo si usa COS 8 per gli effetti pertinenti, ma la riserva resta 25/40. La scadenza del bonus non sottrae PV. È confermata l’ipotesi dell’app sui massimi invariati.

> > #### **A.122 — Priorità delle funzioni della mappa**

Approvato il ott 6, 2026  
 Funzioni indispensabili: immagine della mappa e griglia in Q; pedine, dimensioni e rotazione; Iniziativa e indicazione del turno; misurazione di distanze e movimento; muri e porte; nebbia ed esplorazione delle zone; luci e linea di vista; template delle aree degli effetti.  
 Funzioni aggiuntive: mappe video e costruttore di stanze. Le mappe video sono sfondi animati, normalmente in ripetizione: l’animazione non modifica automaticamente movimento, danni, illuminazione o linea di vista.  
 «Aiuto-master» resta da precisare: il quesito non specifica quali funzioni comprenda.  
 La parte relativa ai veicoli sulla mappa rimane rimandata.

> > #### **A.124 — Azioni extra, movimento e diagonali sulla mappa**

Approvato il ott 6, 2026  
 La mappa segue il Manuale del Giocatore. Livelli 1–11: 1 AzM e 1 AzP per Round. Livelli 12–20: 1 AzM e 2 AzP per Round.  
 Le AzP si svolgono durante la stessa Iniziativa: non si creano turni aggiuntivi a INI −3 o −6. Eventuali Azioni già consumate, per esempio per difendersi, restano spese.  
 Valori ordinari: Passo 6 Q, Corsa 12 Q, Scatto 18 Q. L’app considera modificatori del personaggio, Stati, terreno ed esiti delle prove richieste. Il Direttore può correggere manualmente la disponibilità per situazioni particolari, ma il valore predefinito deriva dalle regole.  
 Ogni diagonale costa 1 Q, come uno spostamento orizzontale o verticale su terreno normale. Questo non permette di attraversare muri o passaggi ostruiti.  
 Divisione del movimento e costi di Corsa e Scatto sono precisati nella A.129.

> > #### **A.125 — Porte e illuminazione sulla mappa**

Approvato il ott 6, 2026  
 Parte porte approvata. Aprire o chiudere una normale porta accessibile e non bloccata costa 1 AzP, senza prova. Per azionarla manualmente occorre essere adiacenti e avere una mano libera.  
 Attraversare la porta consuma il normale movimento, separatamente dall’apertura. Una porta bloccata richiede prima la procedura pertinente per sbloccarla, scassinarla o forzarla. Nell’app «chiusa» e «bloccata» sono condizioni distinte.  
 Parte illuminazione approvata. Le categorie sono quelle della A.106: luce sufficiente, nessuna penalità; penombra, −2 alle prove dipendenti dalla vista; luce molto scarsa, −4; buio totale, effetti di Accecato con −8 alle attività ancora possibili e impossibilità di quelle esclusivamente visive.  
 La mappa distingue la portata della sorgente, espressa in Q, dalla condizione di illuminazione della zona. I vecchi numeri chiamati «livello» non vanno convertiti automaticamente senza averne chiarito il significato.  
 Le normali lampade del catalogo hanno una sola portata. Un bersaglio effettivamente illuminato non beneficia delle penalità per mancanza di luce. Muri, ostacoli e capacità visive speciali conservano i propri effetti.  
 La domanda sul movimento dei veicoli rimane rimandata: questa risposta non chiude quella parte della A.125.

> > #### **A.127 — Attraversamento dei quadretti occupati**

Approvato il ott 6, 2026  
 I quadretti degli alleati sono attraversabili pagando il normale costo di movimento, senza sovrapprezzo per la sola presenza dell’alleato.  
 I quadretti dei nemici non sono attraversabili, salvo capacità o regole che lo consentano espressamente.  
 Non si può terminare il movimento in un quadretto occupato, né fermarvisi per attaccare o compiere un’altra Azione. Per una pedina che occupa più quadretti, l’intero ingombro della posizione di arrivo deve essere libero.  
 Attraversare un alleato non evita gli Attacchi di Opportunità: restano le regole dell’Ingaggio. Capacità speciali e spostamenti forzati conservano le proprie regole; poter attraversare un quadretto occupato non autorizza automaticamente a fermarvisi.  
 Esempio: si può passare attraverso un compagno e raggiungere uno spazio libero oltre di lui, ma non attaccare restando sovrapposti.

> > #### **A.128 — Terreno difficile**

Approvato il ott 6, 2026  
 Ogni quadretto percorso su terreno difficile costa 2 Q di movimento, anche in diagonale. Il Direttore identifica le zone, per esempio macerie, fango profondo o vegetazione fitta.  
 Nei percorsi misti si conteggiano separatamente i tratti: 1 Q per quadretto normale e 2 Q per quadretto difficile.  
 Il costo maggiore non aggiunge da solo penalità al VA o nuove prove. Eventuali pericoli e le normali prove di Corsa e Scatto mantengono le proprie regole. Le capacità che ignorano il terreno difficile seguono la propria descrizione.  
 Con i valori ordinari e un percorso interamente difficile: Passo 6 Q disponibili → 3 quadretti effettivi; Corsa 12 Q → 6 quadretti; Scatto 18 Q → 9 quadretti. Questi valori precedono ulteriori modificatori e gli esiti delle prove di movimento.  
 Esempio: 2 quadretti normali e 2 difficili consumano 2 \+ 4 \= 6 Q, esaurendo il Passo ordinario.

> > #### **A.129 — Movimento diviso, Corsa e Scatto**

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

> > #### **Quesiti sospesi e dati ancora da fornire**

Stato verificato al ott 6, 2026  
 A.109 — Anticipazione: sospensione superata dall’approvazione dell’8 ottobre 2026\. Tutti i 32 aspetti sono definiti nella sezione «A.109 — Anticipazione: regola comune ai 32 aspetti» e nei punti 1/32–32/32 di questo documento. Restano valide quelle risposte; non occorre un nuovo elenco o allegato. Rettifica dello stato registrata il 16 ottobre 2026\.  
 A.111 — Rimane da verificare la storia dell’Interfaccia neurale di Pablo Zaion; la regola generale sui recuperi pregressi è invece approvata.  
 A.112 — Riserve degli Artefatti di Lucas e Dimitri: resta da confermare se i valori massimi nei file dei PG siano residui reali o valori iniziali. Non si modificano automaticamente.  
 A.113 — Permessi e denominazioni dei veicoli: rimandata.  
 A.115 — Capacità specifiche dei nemici: rimandata con il bestiario.  
 A.122 — La voce generica «Aiuto-master» richiede una descrizione delle funzioni; le altre priorità sono approvate.  
 A.125 — La parte sui veicoli resta rimandata. Le vecchie etichette numeriche delle luci richiedono una corrispondenza tecnica verificata, senza nuovi modificatori di regola.  
 A.126 — Ingombro delle creature da 3×3 Q: rimandata con il bestiario.  
 Le regole dettagliate di malattie e cure della A.119 sono destinate al Manuale del Direttore. Ammalato ha già la scala operativa approvata per l’app.  
 Questo aggiornamento registra le risposte approvate; non dichiara completati il recepimento nei manuali o l’implementazione nell’app. Le domande del collaboratore non sono state spostate o cancellate.

> > ### **Aggiornamento cumulativo — risposte tecniche approvate**

Approvato il ott 8, 2026

Risposte approvate in conversazione e destinate al recepimento nell’app e nei manuali. Questo aggiornamento supera, per i punti trattati, le precedenti ipotesi provvisorie e le annotazioni di quesito ancora aperto. Le domande originali sono conservate per tracciabilità. «Approvato» non significa «già implementato»: il recepimento nell’app deve essere verificato separatamente.

> > #### **A.135 — Ricarica delle armi, revolver e accessori**

Approvato il ott 8, 2026

Qualunque arma caricata direttamente, con tamburo o serbatoio interno, inserisce fino a 2 cartucce in 1 AzP; con Ricarica Migliorata fino a 4 cartucce in 1 AzP. La regola comprende revolver e doppiette e non permette di superare la capacità dell’arma. Sostituisce le precedenti regole del tamburo completo in 1 AzP e delle 3 cartucce con Ricarica Migliorata.

Sono disponibili carichini rapidi riutilizzabili, compatibili con il modello d’arma: Ricarica per Tamburo, 6 colpi, 100 crediti a vuoto; Ricarica per Serbatoio, 6 colpi, 150 crediti a vuoto. Le munizioni si acquistano separatamente.

Un carichino già preparato e accessibile trasferisce fino a 6 colpi in 1 AzP, entro gli spazi liberi dell’arma. I colpi non trasferiti restano nel carichino e vanno registrati. Ricarica Migliorata non aumenta questo limite. Preparare i dispositivi richiede 1 minuto ogni 50 colpi o frazione.

La sostituzione di un caricatore o di una cella già pronti continua a costare 1 AzP. Ricarica Rapida permette una sola operazione di ricarica gratuita per Round, alla propria Iniziativa: 2 cartucce, 4 con Ricarica Migliorata, fino a 6 con dispositivo preparato, oppure il normale cambio di caricatore/cella. Restano necessari mani disponibili e accessibilità.

Esempio: un revolver da 6 colpi vuoto richiede 3 AzP normalmente, 2 AzP con Ricarica Migliorata, 1 AzP con carichino preparato oppure 0 AzP usando carichino e Ricarica Rapida.

Modelli confermati: HD14M con serbatoio interno; SA SG2001, Airbrush e Mandible con caricatore amovibile. Peso, Qualità, Integrità e Reperibilità dei nuovi accessori non sono stati definiti da questa decisione.

> > #### **A.136 — Passaggio a Corsa/Scatto e Prova facoltativa di Atletica**

Approvato il ott 8, 2026

Prima di aver compiuto qualsiasi AzP nel proprio turno, mentre il movimento è ancora in corso, è possibile trasformare il Passo già iniziato in Corsa o Scatto. I Q già percorsi si sottraggono al nuovo totale; si usa sempre una sola AzM. Il movimento restante si completa in un unico blocco prima delle AzP: non è possibile muoversi, attaccare e poi trasformare quel movimento in Corsa.

Normalmente non serve alcuna Prova di Atletica: si applicano distanze, penalità e vantaggi standard. Chi vuole migliorare l’efficacia del movimento può dichiarare la Prova facoltativa prima di tirare, senza Azioni aggiuntive: Atletica a 0 per Corsa e a −2 per Scatto su terra.

I Q percorsi non cambiano in base all’esito: normalmente 12 Q in Corsa e 18 Q in Scatto, prima degli altri modificatori. Gli effetti sotto riportati durano fino alla successiva propria Iniziativa. «Penalità personale» riguarda chi si muove; «penalità per essere colpito» è quella applicata agli attacchi contro di lui. Le riduzioni si fermano a zero e non diventano bonus.

Senza Prova: Corsa −2 personale / −2 agli attacchi contro; Scatto −6 personale / −4 agli attacchi contro.

Successo Magistrale: Corsa 0 / −6; Scatto −2 / −8.

Successo: Corsa 0 / −4; Scatto −4 / −6.

Fallimento: Corsa −4 / 0; Scatto −8 / −2.

Maldestro: Corsa −6 / 0; Scatto −10 / 0\.

Sono superati i precedenti aumenti o riduzioni dei Q legati all’esito e i modificatori \+4/−4 alla Prova successiva. Questa decisione non introduce nuovi modificatori specifici per nuoto, volo o altre manovre.

> > #### **A.137 — Aree con raggio in quadratini**

Approvato il ott 8, 2026

Si usa la distanza sulla griglia con diagonale pari a 1 Q. Un raggio di 1 Q comprende un’area 3×3 Q centrata sul Q di origine; raggio 2 Q corrisponde a 5×5 Q; raggio 3 Q a 7×7 Q. Le aree di raggio risultano quindi quadrate sulla griglia. Restano le regole di ostacoli e propagazione dell’effetto. Questa regola non modifica i coni.

> > #### **A.138 — Template a cono lineare**

Approvato il ott 8, 2026

Il vertice parte dal centro del Q occupato da chi usa il template. Si scelgono direzione, distanza e ampiezza finale, espresse in Q. Il cono si allarga linearmente da zero fino all’ampiezza finale.

Un Q è colpito quando almeno metà della sua superficie è attraversata dal template. Il Q di origine è escluso dal proprio cono, salvo eccezione espressa. Non si usano file a larghezza prefissata né una preferenza automatica verso destra o sinistra. L’origine per creature di ingombro maggiore resta da raccordare alle regole sulle taglie.

> > #### **A.139 — Apertura e chiusura delle porte**

Approvato il ott 8, 2026

Una porta può essere aperta o chiusa anche da un Q adiacente in diagonale, purché sia fisicamente raggiungibile dal proprio lato. Una normale porta non bloccata richiede 1 AzP e una mano libera. Non si può interagire attraverso una parete. Attraversare la porta è movimento distinto; serrature e altri blocchi richiedono prima la relativa procedura.

> > #### **A.140 — Copertura e ostacoli**

Approvato il ott 8, 2026

Si tracciano cinque linee dal centro del Q dell’attaccante verso il centro e i quattro angoli del Q del bersaglio. Nessuna linea bloccata: nessuna Copertura; 1–2 linee bloccate: Copertura Leggera, −2; 3–4: Media, −4; 5: Totale, che impedisce l’attacco diretto.

Una linea conta come bloccata solo se attraversa effettivamente l’ostacolo: il semplice contatto con un angolo non basta. Il Direttore può correggere il risultato in base ad altezza, postura e situazione reale. L’interposizione di creature segue separatamente A.144.

Sviluppo successivo richiesto: definire valori automatici di Copertura per tipo e altezza dell’ostacolo, anche se blocca una sola linea, tenendo conto della postura del bersaglio; esempio, un ostacolo alto circa 1 metro. La tabella specifica resta rinviata.

> > #### **A.142 — Illuminazione e visibilità ordinaria**

Approvato il ott 8, 2026

Piena luce: nessun limite fisso in Q. Penombra: 10 Q. Luce scarsa: 5 Q. Buio completo: nessun Q rivelato dalla visione ordinaria; resta visibile la propria pedina, senza rivelazione automatica dei Q adiacenti.

Conta l’illuminazione della zona osservata: chi è al buio può vedere una stanza illuminata oltre un corridoio oscuro, senza che questo renda visibile il corridoio. Pareti, porte chiuse e altre occlusioni restano efficaci; la visibilità non rivela automaticamente creature nascoste. I sensi speciali seguono A.143.

> > #### **A.143 — Sensi speciali e rivelazione della mappa**

Approvato il ott 8, 2026

Visione notturna: 80 Q, utilizzabile in penombra e luce scarsa; richiede luce residua e non funziona nel buio completo.

Visione termica: 40 Q; permette di distinguere bersagli o superfici con contrasto termico, anche nel buio naturale. Non rivela automaticamente scritte, colori o bersagli privi di contrasto termico distinguibile.

Vista Felina: 20 Q nel buio naturale, con percezione delle forme e della profondità ma non dei colori.

Quando attivi, questi sensi rivelano automaticamente solo le parti della mappa effettivamente percepite entro il rispettivo limite. Pareti e porte chiuse li bloccano; le creature nascoste richiedono le normali verifiche. Le portate dei sensi non accorciano la normale visione in piena luce. Attivazione, costo, durata e interazioni con nebbia, fumo e oscurità soprannaturale seguono le rispettive schede.

> > #### **A.144 / A.141 — Bersaglio ingaggiato e creature interposte**

Approvato il ott 8, 2026

Il bersaglio ingaggiato conserva la regola esistente del §5.10: −4 e seconda Prova dopo un mancato colpo, con i Talenti pertinenti.

Una creatura che interferisce con la linea di tiro applica invece soltanto −2, cumulabile con le altre penalità di circostanza. Per questa sola interposizione non si esegue una seconda Prova per colpire accidentalmente la creatura. Il −2 si applica una sola volta, indipendentemente dal numero di creature interposte.

La stessa creatura già considerata nella penalità per bersaglio ingaggiato non produce anche un ulteriore −2. Una diversa creatura interposta può aggiungerlo. Esempio: interposizione −2 e Copertura Leggera −2 danno −4 totale. Le regole specifiche degli ostaggi non sono modificate da questa risposta.

> > #### **A.148 — Volo e Copertura**

Approvato il ott 8, 2026

La Copertura dipende dalla traiettoria reale, considerando quota dell’attaccante, quota del bersaglio e altezza degli ostacoli. Leggera −2, Media −4 e Totale continuano ad applicarsi quando proteggono effettivamente il bersaglio.

Una creatura interposta dà −2 solo se interferisce davvero con la traiettoria: l’allineamento sulla mappa vista dall’alto non basta. Se esiste un vero ingaggio, vale la relativa regola anche in volo. Volare, da solo, non impone un −2 universale per essere colpiti.

Finché non sono definiti gli automatismi sulle altezze, il Direttore può confermare o correggere la Copertura. Il contrassegno «in volo» non deve disattivare tutte le Coperture.

> > #### **A.149 — Distanza verticale, portata e attacchi di opportunità**

Approvato il ott 8, 2026

La distanza in Q è il maggiore fra distanza orizzontale sulla griglia e differenza assoluta di quota. La diagonale continua a valere 1 Q. Esempi: 1 Q orizzontale e 1 verticale valgono 1 Q; 1 orizzontale e 2 verticali valgono 2 Q; direttamente 3 Q sopra valgono 3 Q.

Salire volontariamente da una posizione entro portata a una fuori portata può provocare un attacco di opportunità prima di uscire, secondo le normali condizioni. Chi era già fuori portata non lo provoca soltanto allontanandosi ulteriormente.

> > #### **A.150 — Visibilità dei bersagli in volo**

Approvato il ott 8, 2026

Si applicano le stesse regole di illuminazione, sensi, occlusione e occultamento dei bersagli a terra. Essere in volo non rivela automaticamente una creatura nelle zone non visibili della mappa.

Un osservatore al buio può vedere un bersaglio in volo sopra una zona illuminata; non vede automaticamente un bersaglio non illuminato solo perché è in aria. Il Direttore può rivelarlo manualmente quando le circostanze lo giustificano, per esempio una sagoma contro un cielo luminoso.

> > #### **A.122 — Funzioni dell’Aiuto-master**

Approvato il ott 8, 2026

Si mantiene il ruolo opzionale di Aiuto-master, assegnabile e revocabile dal Direttore; non è necessaria una pagina separata. Può muovere il personaggio del turno attivo entro i limiti ordinari di movimento e degli ostacoli.

Vede la mappa nella visuale dei giocatori, senza informazioni segrete del Direttore. Non può modificare schede, risorse, Iniziativa o configurazione della scena. Gli spostamenti eccezionali oltre i limiti restano riservati al Direttore.

> > #### **A.111 — Pablo Zaion: annullamento di una perdita di Umanità inserita per prova**

Approvato il ott 8, 2026

Pablo non possiede e non ha mai posseduto Interfacce neurali. La perdita di 2 UMN rimasta nel file deriva esclusivamente da prove dell’app.

Correzione richiesta al collaboratore: eliminare la registrazione errata della perdita di 2 UMN e ricalcolare l’Umanità, conservando una nota della correzione. Non registrare rimozioni di impianti né recuperi o riabilitazioni fittizi. Il caso concreto è chiarito; resta valida la regola generale già approvata per i veri recuperi pregressi.

> > #### **A.112 — Riserve effettive degli artefatti di Lucas e Dimitri**

Approvato il ott 8, 2026

Confermati come riserve effettive i valori già presenti nei file: Guanti 10; Pietra della Vigilanza 10; due Batterie Matrice da 10 ciascuna; quattro Schegge da 5 ciascuna. Gli artefatti risultano completamente carichi. Mantenere questi valori senza correzioni: non sono semplici valori iniziali in attesa di ricostruire i consumi.

> > #### **A.109 — Anticipazione: regola comune ai 32 aspetti**

Approvato il ott 8, 2026

Tutti i 32 aspetti elencati di seguito sono definiti. È superata la sospensione per mancanza dell’allegato.

Per ogni lancio si anticipa un solo aspetto di un solo gradino consentito. Si parte da una versione accessibile dell’incantesimo; i PM base raddoppiano e la Prova di Potere è obbligatoria, con difficoltà di una categoria superiore, fatte salve le eccezioni dei Talenti. Il livello dichiarato e tutti i parametri non espressamente anticipati restano invariati. Non si combinano due aspetti nello stesso lancio.

> > ##### **A.109 — Punto 1/32: Muro Elementale, numero di elementi (§13.3)**

Approvato il ott 8, 2026

Anticipazione: \+1 elemento, da 1 a 2 oppure da 2 a 3; massimo 3\. Non è possibile passare direttamente da 1 a 3\. L’elemento primario determina struttura e natura del danno; gli altri apportano gli effetti secondari previsti. Gli altri parametri non cambiano.

> > ##### **A.109 — Punto 2/32: Armatura Elementale, numero di elementi (§13.5)**

Approvato il ott 8, 2026

Anticipazione: \+1 elemento, 1→2 oppure 2→3, massimo 3\. Tutti gli elementi scelti forniscono la protezione elementale prevista dalla scheda; il primario determina il danno reattivo e gli altri gli effetti secondari. Non aumenta contemporaneamente il Mod. PS.

> > ##### **A.109 — Punto 3/32: Armatura Elementale, Mod. PS (§13.5)**

Approvato il ott 8, 2026

Si peggiora di un gradino di −2 il Mod. PS previsto dalla versione: livelli 3 e 6, da 0 a −2; livelli 9 e 12, da −2 a −4; livelli 15 e 18, da −4 a −6. Il limite della tabella è −6. Gli effetti automatici che non prevedono PS restano automatici; non se ne aggiunge una.

> > ##### **A.109 — Punto 4/32: Esplosione Elementale, numero di elementi (§13.6)**

Approvato il ott 8, 2026

Anticipazione: \+1 elemento, 1→2 oppure 2→3, massimo 3\. Non modifica contemporaneamente danno, area, Mod. PS o altri parametri.

> > ##### **A.109 — Punto 5/32: Cono Elementale, numero di elementi (§13.7)**

Approvato il ott 8, 2026

Anticipazione: \+1 elemento, 1→2 oppure 2→3, massimo 3\. Dimensioni e geometria del cono non cambiano; per il template si applica la A.138.

> > ##### **A.109 — Punto 6/32: Devastazione Elementale, elemento aggiuntivo (§13.10)**

Approvato il ott 8, 2026

Anticipazione: \+1 elemento, fino al massimo di 3, con un solo passaggio 1→2 oppure 2→3. Non si anticipa nello stesso lancio anche il Mod. PS.

> > ##### **A.109 — Punto 7/32: Devastazione Elementale, Mod. PS (§13.10)**

Approvato il ott 8, 2026

Un solo gradino: da −2 a −4 oppure da −4 a −6. Il massimo è −6; non è consentito un ulteriore passaggio a −8.

> > ##### **A.109 — Punto 8/32: Catene di Forza, Salvezze (§17.6)**

Approvato il ott 8, 2026

Un solo gradino lungo la scala 0→−2→−4→−6. Il nuovo modificatore si applica alla Tempra iniziale, alla Tempra per liberarsi e ai Riflessi per mantenere l’equilibrio: costituiscono un unico aspetto anticipato. Stato inflitto, durata e altri parametri restano invariati.

> > ##### **A.109 — Punto 9/32: Piattaforma Levitante, dimensioni (§17.7)**

Approvato il ott 8, 2026

Si passa alla dimensione successiva: livello 3, 1×1→2×1 Q; livello 6, 2×1→2×2 Q; livelli 9 e 12, 2×2→3×2 Q; livello 15, 3×2→3×3 Q; livello 18, 3×3→4×3 Q.

La portata in peso è un aspetto distinto e non cambia: per esempio, al livello 9 resta 400 kg anche con piattaforma 3×2 Q. Movimento, durata e stabilità rimangono quelli della versione scelta.

> > ##### **A.109 — Punto 10/32: Alterare Immagine, capacità (§19.1)**

Approvato il ott 8, 2026

Le capacità sono cumulative: volto generico → identità precisa → voce e postura → equipaggiamento. La versione di livello 1 può anticipare l’identità precisa; quella di livello 3 voce e postura; quella di livello 6 l’equipaggiamento. Dal livello 9 la capacità è già massima.

L’identità deve essere conosciuta o adeguatamente osservata; per riprodurre precisamente una voce bisogna averla udita. L’equipaggiamento mantiene forma e volume. Non si acquisiscono ricordi o conoscenze della persona imitata.

> > ##### **A.109 — Punto 11/32: Terrore, PS della modalità (§19.7)**

Approvato il ott 8, 2026

Si applica un ulteriore −2 alla PS Volontà della modalità scelta. Livelli 3 e 6: mirata −2→−4, aura 0→−2. Livelli 9 e 12: mirata −4→−6, aura −2→−4. Livelli 15 e 18: mirata −6→−8, aura −4→−6.

Massimo −8 per la modalità mirata e −6 per l’aura. Il −4 proprio dello Stato Terrorizzato rimane invariato, così come durata, raggio e bersagli.

> > ##### **A.109 — Punto 12/32: Presenza, precisione del conteggio (§20.3)**

Approvato il ott 8, 2026

Un solo gradino lungo la scala Approssimata → Generica → Precisa → Esatta.

Approssimata: nessuna mente, una, 2–5, 6 o più. Generica: nessuna, una, 2–5, 6–10, 11–20, oltre 20\. Precisa: numero esatto fino a 10, poi fasce di 5\. Esatta: numero esatto di tutte le menti rilevabili.

Esatta è il massimo. Non aumentano informazioni individuali, portata o durata. Le menti protette e non rilevabili non entrano automaticamente nel conteggio.

> > ##### **A.109 — Punto 13/32: Presenza, informazioni individuali (§20.3)**

Approvato il ott 8, 2026

Si anticipa la riga informativa successiva, cumulativamente: versione di livello 1 → livello in fasce di 5; livello 3 → Addestramento iniziale; livello 6 → livello in fasce di 2; livello 9 → Classe predominante; livello 12 → livello esatto; livello 15 → tutte le Classi con i rispettivi Gradi; livello 18 già al massimo.

Per creature senza Classe o Addestramento valgono le alternative Domestico/Selvatico e Predatore/Preda previste dalla scheda. La precisione del conteggio resta quella della versione: per esempio, al livello 6 rimane Precisa.

> > ##### **A.109 — Punto 14/32: Psicometria, numero di impressioni (§20.7)**

Approvato il ott 8, 2026

Si aggiunge 1 impressione per lancio, fino a un massimo di 11; non si passa direttamente alla riga successiva della tabella. Esempi: livello 15, 8→9; livello 18, 10→11.

Il numero è un massimo, non garantisce l’esistenza di altre tracce. Periodo retrospettivo e tempo di lettura non cambiano.

> > ##### **A.109 — Punto 15/32: Marchio Psichico, entrambe le modalità (§20.8)**

Approvato il ott 8, 2026

Un unico gradino permette di attivare insieme Tracciamento e Combattimento; ciascuna modalità conserva la propria durata ordinaria.

Esempio al livello 6: Tracciamento entro 1 km per 1 ora e Combattimento con \+1 VA e \+1 danno per 5 Round. Terminato il Combattimento, il Tracciamento continua per la durata restante. Non si aumentano altri parametri e non si combina l’assegnazione a un alleato.

> > ##### **A.109 — Punto 16/32: Marchio Psichico, alleato beneficiario (§20.8)**

Approvato il ott 8, 2026

Si può scegliere al lancio un alleato consenziente, visibile ed entro portata come beneficiario al posto dell’incantatore. Non aumenta il numero di bersagli marchiati. Si sceglie una sola modalità; nel Tracciamento la distanza si misura dall’alleato beneficiario.

L’incantatore paga i PM ed effettua la Prova di Potere, ma non riceve i benefici. Il beneficiario resta lo stesso per tutto il lancio. Questo usa l’intera Anticipazione e non permette anche entrambe le modalità. Esempio: al livello 9, l’alleato riceve \+2 VA e \+2 danni contro il marchiato per 5 Round.

> > ##### **A.109 — Punto 17/32: Sesto Senso, Difese automatiche (§20.9)**

Approvato il ott 8, 2026

Si aggiunge 1 Difesa automatica alla riserva totale dell’intera durata, non una per Round. Livelli 6 e 9: 1→2; livelli 12 e 15: 2→3; livello 18: 3→4.

Rimane il limite di una per Round anche con più lanci. Restano le condizioni richieste per Parata o Schivata. Durata, Iniziativa ed Elusione non cambiano.

> > ##### **A.109 — Punto 18/32: Cura Malattie, pericolosità (§21.2)**

Approvato il ott 8, 2026

Si aumenta di un solo grado la pericolosità trattabile lungo I→II→III→IV→V→VI; VI è il massimo.

L’origine è distinta dalla pericolosità: per esempio, la versione di livello 3 passa da III a IV, ma continua a trattare malattie naturali o artificiali, senza acquisire quelle mistiche. Numero di malattie, beneficiari e portata non cambiano; il lancio resta di 10 minuti.

> > ##### **A.109 — Punto 19/32: Cura Avvelenamenti, pericolosità (§21.3)**

Approvato il ott 8, 2026

Si aumenta di un solo grado la pericolosità trattabile lungo I→II→III→IV→V→VI; VI è il massimo. L’origine ammessa resta invariata: per esempio, al livello 5 si passa da IV a V, mantenendo veleni naturali o artificiali. Numero, beneficiari e portata non cambiano; il lancio resta di 1 AzP.

> > ##### **A.109 — Punto 20/32: Cura Spirituale, Stati trattabili (§21.4)**

Approvato il ott 8, 2026

Si anticipa il gruppo di capacità successivo, cumulativamente, lungo le soglie di livello 1→3→6. La versione di livello 1 aggiunge Accecato e Assordato; la versione di livello 3 aggiunge Stordito, Svenuto e Paralizzato temporaneo, compreso il sonno magico. Dal livello 6 le capacità sono già massime.

Il numero di Stati rimossi non cambia: al livello 3 resta uno Stato su un beneficiario entro 3 Q. Restano i limiti relativi a cause persistenti e menomazioni.

> > ##### **A.109 — Punto 21/32: Recupero Rapido, numero di menomazioni (§21.7)**

Approvato il ott 8, 2026

Si anticipa il numero di menomazioni temporanee trattate per beneficiario: 1→2→3→tutte. Livelli 3 e 6: 1→2; livello 9: 2→3; livello 12: 3→tutte; livelli 15 e 18 già al massimo.

I gradini di recupero per ciascuna menomazione non aumentano: per esempio, al livello 3 si trattano due menomazioni di un gradino ciascuna. Le permanenti restano escluse, salvo conversione in temporanee. Lancio di 10 minuti e massimo di un’applicazione efficace ogni 24 ore per beneficiario invariati.

> > ##### **A.109 — Punto 22/32: Sigillo, numero di sigilli (§22.3)**

Approvato il ott 8, 2026

Si aggiunge 1 sigillo per lancio: livelli 1, 3 e 6, 1→2; livelli 9 e 12, 2→3; livelli 15 e 18, 3→4.

Il costo del singolo lancio anticipato comprende tutti i sigilli. La preparazione resta 1 minuto complessivo e tutti i punti da sigillare devono essere toccati durante quel tempo. Gli altri parametri non cambiano.

> > ##### **A.109 — Punto 23/32: Sigillo, Avviso e Blocco prima del livello 6 (§22.3)**

Approvato il ott 8, 2026

Alle versioni di livello 1 e 3 l’Anticipazione permette di avere contemporaneamente Avviso e Blocco. Il primo tentativo non autorizzato di apertura o forzatura attiva l’Avviso anche se fallisce; l’Avviso è consumato, mentre il Blocco resta finché viene superato, rimosso o scade.

Il Blocco richiede una chiusura fisica; un passaggio aperto permette soltanto Avviso. Dal livello 6 la combinazione è già ordinaria e non offre un ulteriore gradino.

> > ##### **A.109 — Punto 24/32: Trappola Mistica, numero di trappole (§22.4)**

Approvato il ott 8, 2026

Si aggiunge 1 trappola al lancio: 1→2, 2→3 oppure 3→4. Il totale delle trappole attive attraverso tutti i lanci non può superare il valore di SAG; se necessario, occorre terminare trappole precedenti. Si mantiene un solo effetto per Q.

La preparazione costa 1 minuto per ogni trappola, compresa quella aggiuntiva. Il costo del lancio anticipato di Trappola Mistica copre tutte le trappole, ma l’eventuale incantesimo caricato va pagato separatamente per ciascuna. Gli altri parametri non cambiano.

> > ##### **A.109 — Punto 25/32: Trappola Mistica, danno della Scarica (§22.4)**

Approvato il ott 8, 2026

Si anticipa la riga successiva del danno della Scarica propria della trappola: livello 1, 1d6→1d6+2; livello 3, 1d6+2→2d6+2; livello 6, 2d6+2→3d6+3; livello 9, 3d6+3→4d6+4; livello 12, 4d6+4→5d6+5; livello 15, 5d6+5→6d6+6. Al livello 18 il massimo è già 6d6+6 di danno base Magico.

Non aumenta il danno dell’incantesimo eventualmente caricato. Numero di trappole e Mod. PS restano invariati.

> > ##### **A.109 — Punto 26/32: Trappola Mistica, Interferenza (§22.4)**

Approvato il ott 8, 2026

La penalità peggiora di 1, fino a −5: livelli 1, 3 e 6, −2→−3; livelli 9 e 12, −3→−4; livelli 15 e 18, −4→−5.

Dopo una PS Magia fallita, la penalità riguarda le prove di Abilità, compresi attacchi, Difese e Potere. Non modifica PS, prove di Caratteristica, danni o movimento. Durata e modificatore della PS restano invariati.

> > ##### **A.109 — Punto 27/32: Trappola Mistica, livello massimo caricato (§22.4)**

Approvato il ott 8, 2026

L’aspetto è disponibile dalla versione di livello 6 di Trappola Mistica: livello 6, massimo caricabile 3→6; livello 9, 6→9; livello 12, 9→12; livello 15, 12→15; livello 18, 15→18.

Le versioni 1 e 3 non acquisiscono la capacità di caricare incantesimi tramite Anticipazione. L’incantesimo deve essere conosciuto e rispettare i suoi requisiti; quello caricato non può essere a sua volta anticipato.

Il raddoppio dei PM riguarda soltanto Trappola Mistica. Ogni incantesimo caricato si paga separatamente e produce la singola applicazione istantanea prevista dalle regole di caricamento. Numero di trappole e altri parametri restano invariati.

> > ##### **A.109 — Punto 28/32: Luce Mistica, sorgente su oggetto (§23.2)**

Approvato il ott 8, 2026

Un unico gradino permette di ancorare la sorgente a un oggetto toccato al lancio invece che all’incantatore. L’aura è centrata sull’oggetto e lo segue; l’oggetto può essere trasportato da un alleato o lasciato sul posto. L’ancoraggio resta fisso per tutta la durata del lancio.

Raggio, durata, penalità e PS non cambiano. Una copertura opaca blocca luce ed effetto. Questo impiega l’intera Anticipazione.

> > ##### **A.109 — Punto 29/32: Nascondere Aura, Potenza di Occultamento (§23.7)**

Approvato il ott 8, 2026

Si avanza di un solo gradino lungo 3→6→9→12→15→18→21. La versione di livello 18 può quindi arrivare a Potenza di Occultamento 21, che è il massimo.

Il miglioramento vale soltanto nei confronti di rilevazione pertinenti, come Presenza. Il livello dichiarato dell’incantesimo non cambia, anche ai fini di Negare Potere. Gli altri parametri restano invariati.

> > ##### **A.109 — Punto 30/32: Premonizione, numero di usi (§23.8)**

Approvato il ott 8, 2026

Si aggiunge 1 uso alla riserva totale, massimo 7: livello 6, 3→4; livelli 9 e 12, 4→5; livello 15, 5→6; livello 18, 6→7.

Rimane il massimo di un uso per Round, anche effettuando nuovi lanci, e di un solo rilancio sullo stesso evento anche in presenza di altre capacità. Non migliora la scelta del risultato da tenere; durata e portata non cambiano. Gli usi rimasti si perdono alla scadenza.

> > ##### **A.109 — Punto 31/32: Premonizione, scelta del risultato prima del livello 12 (§23.8)**

Approvato il ott 8, 2026

Alle versioni di livello 6 e 9 un unico gradino consente di scegliere il risultato preferito fra il tiro originario e il rilancio per tutti gli usi di quel lancio. Si sceglie uno dei due risultati completi, senza combinare dadi dei due tiri.

La riserva resta 3 usi al livello 6 e 4 al livello 9, con durata 5 Round, massimo un uso per Round e un solo rilancio per tiro. Dal livello 12 la scelta è già ordinaria e non offre un ulteriore gradino.

> > ##### **A.109 — Punto 32/32: Individuare, informazioni approfondite (§23.9)**

Approvato il ott 8, 2026

Al lancio si sceglie una sola categoria: Aura, Incantesimi oppure Artefatti. Soltanto quella categoria acquisisce cumulativamente le informazioni della soglia successiva: versioni 6–8→soglia 9; 9–11→12; 12–14→15; 15–17→18; versione 18 già al massimo.

Le altre categorie mantengono la soglia originaria. Esempio: una versione di livello 9 che anticipa Incantesimi ne rileva il livello esatto previsto alla soglia 12, mentre Aura e Artefatti restano alla soglia 9\.

Non aumentano Potenza di Individuazione, raggio, portata, area o durata. Resta l’analisi di una sola fonte e di una sola categoria per Round.

> > #### **Conferme già definite e argomenti rinviati**

Approvato il ott 8, 2026

A.20: l’uso del Chroma bianco resta riservato a chi ha accesso alla magia; non basta essere coscienti. A.35: l’eccedenza del valore degli armamenti ceduti viene restituita in crediti. Queste decisioni erano già approvate e non costituiscono nuovi quesiti.

Restano rinviati i temi relativi a bestiario e veicoli: A.113, A.115, parte veicoli della A.125, A.126, A.133 e A.145–A.147. Resta da sviluppare la tabella automatica per tipo/altezza degli ostacoli e postura del bersaglio indicata nella A.140.

Le regole dettagliate delle malattie e delle cure restano destinate al Manuale del Direttore; non sono introdotte qui nuove procedure. Le altre regole già approvate conservano validità dove non espressamente superate da questo aggiornamento.

> > ### **Ripristino delle risposte A.151–A.152 già approvate il 9 ottobre 2026**

Riportate il 10 ottobre 2026 dal documento «E\&L – Risposte e correzioni approvate». Le decisioni e la loro data di approvazione restano invariate.

> > #### **A.151 — Carichini: peso, Qualità, Integrità e Reperibilità**

Approvato il 9 ottobre 2026\.

Ricarica per Tamburo: capacità 6 colpi; prezzo a vuoto 100 crediti; peso a vuoto 0,1 kg; Qualità Comune; PS Integrità 10; PI massimi 2; Reperibilità Comune (CO).

Ricarica per Serbatoio: capacità 6 colpi; prezzo a vuoto 150 crediti; peso a vuoto 0,2 kg; Qualità Comune; PS Integrità 10; PI massimi 2; Reperibilità Comune (CO).

Sono accessori meccanici riutilizzabili, compatibili con lo specifico modello d’arma e reperibili presso un venditore appropriato. Il peso delle munizioni contenute si aggiunge al peso a vuoto; ogni cartuccia si conta una sola volta nell’inventario. A 0 PI il carichino è inutilizzabile finché non viene riparato, secondo le normali regole.

Restano validi capacità, costi, preparazione e funzionamento della A.135. Questi dati completano quelli allora lasciati da definire.

> > #### **A.152 — Colt Hammershot: munizioni e correzione della dotazione**

Approvato il 9 ottobre 2026\.

La Colt Hammershot utilizza proiettili da pistola, come già indicato nel Manuale degli Armamenti, §7.8 (Capitol, Revolver), con riferimento al §7.20.9. La definizione «revolver pesante» non cambia la famiglia delle munizioni. L’associazione nel catalogo dell’app è corretta.

Correzione da applicare a cura del collaboratore nel file di Michele Giorgetti: sostituire i 6 «proiettili pesanti» destinati alla Colt con 6 «proiettili da pistola», mantenendo invariata la quantità.

Nella scheda del manuale va sostituita la vecchia indicazione del tamburo completo in 1 AzP con la A.135: 2 cartucce per AzP, 4 con Ricarica Migliorata, oppure fino a 6 con carichino preparato e accessibile, entro gli spazi liberi. Restano necessarie le mani disponibili; Ricarica Rapida segue la A.135.

Risposta approvata; la correzione del file del PG e l’eventuale aggiornamento dell’app restano da applicare e verificare dal collaboratore.

> > ### **Risposte approvate ai quesiti dell’app A.153–A.157 — 10 ottobre 2026**

Le cinque risposte seguenti sono state approvate da Davide il 10 ottobre 2026\. Sostituiscono le corrispondenti ipotesi provvisorie «Nel frattempo». L’approvazione della regola è distinta dal suo recepimento nell’app, che deve essere verificato dal collaboratore.

> > #### **A.153 — A Terra e Copertura a distanza**

Approvato il 10 ottobre 2026\.

Il −2 al VA per attaccare a distanza un bersaglio A Terra si somma alla penalità della Copertura, perché postura e ostacolo costituiscono modificatori distinti.

Penalità complessiva al VA: A Terra senza Copertura, −2; A Terra con Copertura Leggera, −4; A Terra con Copertura Media, −6.

La Copertura deve essere effettivamente presente rispetto alla linea di tiro. Se l’ostacolo nasconde completamente il bersaglio, si applicano le normali regole che impediscono il tiro diretto.

La risposta conferma il comportamento provvisorio dichiarato dall’app; il recepimento della risposta resta da verificare.

> > #### **A.154 — Peso della cartuccia del decontaminante**

Approvato il 10 ottobre 2026\.

La cartuccia di ricambio del decontaminante da 5 dosi, al prezzo già previsto di 500 crediti, pesa 0,5 kg quando piena. Nel Manuale dell’Equipaggiamento, §3.5.1, il trattino del peso va sostituito con 0,5 kg.

Per semplicità, il peso conteggiato resta 0,5 kg finché la cartuccia rimane nell’inventario, senza ricalcolarlo a ogni dose utilizzata.

Nell’app il campo del peso va valorizzato a 0,5 kg e incluso nel carico. Risposta approvata; aggiornamento dell’app da applicare e verificare.

> > #### **A.155 — Dati fisici delle pergamene standard**

Approvato il 10 ottobre 2026\.

Profilo di una pergamena standard: peso 0,1 kg; Qualità Comune; PS Integrità 10; PI massimi 1\.

Il profilo vale per tutti i Gradi: la potenza dell’incantesimo non rende automaticamente più resistente il supporto. Eventuali supporti speciali avranno una propria scheda.

A 0 PI la pergamena è inutilizzabile e non può essere attivata. La sua distruzione non libera automaticamente l’incantesimo.

Questi dati completano il campionario del Manuale della Magia, §27.3. Nell’app peso e Integrità vanno registrati per ciascun esemplare. Risposta approvata; aggiornamento dell’app da applicare e verificare.

> > #### **A.156 — PM persi quando fallisce l’infusione di un Consumabile**

Approvato il 10 ottobre 2026\.

Con Fallimento o Fallimento Maldestro dell’infusione si perdono tutti i PM impegnati: i PM di lavoro, pari a 3 × Grado, più i PM da sigillare, pari al costo della versione dell’incantesimo. Anche i reagenti vengono consumati e il Consumabile non viene creato.

Esempio: un Consumabile di Grado II con 4 PM da sigillare richiede 6 \+ 4 \= 10 PM; se l’infusione fallisce si perdono tutti e 10\.

Gli eventuali effetti ulteriori del Fallimento Maldestro restano quelli previsti dalle regole d’infusione.

La risposta chiarisce i §§27.2 e 24.5 del Manuale della Magia e conferma il comportamento provvisorio dichiarato dall’app; il recepimento della risposta resta da verificare.

> > #### **A.157 — «Rituale: non consentito» e infusione nei supporti**

Approvato il 10 ottobre 2026\.

L’indicazione «Rituale: non consentito» vieta soltanto il lancio dell’incantesimo come Rituale. L’incantesimo può comunque essere infuso in un Consumabile o in un Artefatto, rispettando i requisiti e i limiti previsti per la creazione.

La procedura rituale di fabbricazione serve a infondere l’effetto nel supporto e non rende disponibile una versione rituale dell’incantesimo. Restano validi eventuali divieti specifici della scheda.

Il chiarimento si applica anche alle sette schede citate nel quesito: §§13.1, 13.7, 17.4, 18.4, 18.9, 21.8 e 23.5 del Manuale della Magia.

L’app può consentire l’infusione e sostituire l’avviso di dubbio nel modulo «Crea consumabile» con questa spiegazione. Risposta approvata; recepimento e aggiornamento dell’avviso da verificare.

> > #### **A.158 — CyberArma: risposta completa approvata**

Approvato il 13 ottobre 2026\. Risposta al quesito dell’app A.158 (Manuale degli Armamenti §7.25). Le decisioni seguenti completano i parametri mancanti e sostituiscono le formulazioni precedenti incompatibili, in particolare il divieto di utilizzo da parte delle altre Classi anche dopo l’installazione della batteria. Risposta approvata; recepimento nei manuali e implementazione nell’app da applicare e verificare.  
 **1\. Modello originale: Grado, sintonizzazione e profilo fisico**  
 La CyberArma originale è un Artefatto TecnoMistico di Grado I, SnT 1, senza batteria interna. Qualità fisica Non Comune, PS Integrità 12, 4 PI, peso 0,5 kg. Il peso comprende impugnatura, condensatore di energia mistica e frammento di cristallo focalizzatore; la lama manifestata non aggiunge peso. La Qualità fisica è distinta dal Grado mistico e non aumenta da sola la SnT.  
 La progressione dell’Arma Astrale del Custode dipende dalla Classe e non aumenta automaticamente Grado o SnT dell’oggetto. Con una riserva integrata il Grado finale è il maggiore fra quello dell’arma e quello della riserva; la SnT dell’oggetto completo si conteggia una sola volta, senza sommare due costi di sintonizzazione.  
 **2\. Utilizzatori, attivazione e penalità**  
 Custode: mantiene i benefici previsti dalla Classe e da Maestro d’Arma al III Grado. Con PM personali attiva l’Arma Astrale per 1 PM e 15 Round, con evocazione compresa nell’Azione del primo attacco e \+1 danno; il danno base segue il Grado di Custode. Con la batteria integrata approvata sotto, può pagare invece una carica per la stessa attivazione di 15 Round. Non subisce il −2 specifico previsto per le altre Classi. Nessun altro utilizzatore acquisisce o evoca l’Arma Astrale personale del Custode.  
 Tecnomante: usa il profilo base senza il −2 specifico delle altre Classi. Armi da mischia (DES), una mano, portata 1 Q, FOR richiesta 3; 1 AzP e 2 PM personali per manifestare la lama per 10 Round, senza Concentrazione; danno 1d8 Magico più i modificatori pertinenti, nessun bonus proprio al VA. Il danno Magico è assorbito normalmente dall’Armatura. Con la batteria integrata può pagare invece una carica per la stessa attivazione di 10 Round. Non ottiene la progressione o i benefici del Custode.  
 Altre Classi: possono utilizzare soltanto la CyberArma modificata con batteria integrata, alimentandola dalla batteria. Usano il profilo base: 1 AzP e una carica per 10 Round, 1d8 Magico più i modificatori pertinenti, senza Concentrazione. Subiscono −2 al VA delle Prove per colpire con l’arma, cumulativo con gli altri modificatori; non si aggiunge una Prova di attivazione. Restano necessari i requisiti d’impiego e la sintonizzazione dell’artefatto attivo. Non acquisiscono i benefici del Custode e non possono utilizzare il modello originale privo di batteria.  
 **3\. Batteria Verde — 5 cariche**  
 La configurazione standard modificata monta una «Batteria Verde — 5 cariche», dedicata esclusivamente alla CyberArma. Grado finale II, SnT 2 complessivi, peso complessivo 0,7 kg. Restano Qualità fisica Non Comune, PS Integrità 12, 4 PI e Reperibilità Epica.  
 La scheda e l’app mostrano soltanto le cariche attuali e massime, per esempio 3/5: non una riserva di PM liberamente utilizzabile. Non si possono prelevare risorse da questa batteria per incantesimi personali, conversioni in PM personali o altri oggetti. Per il funzionamento si tratta di una riserva a cariche dedicata all’arma, anche se la denominazione dell’oggetto resta «Batteria Verde».  
 Ogni attivazione dalla batteria consuma una carica intera: 15 Round per il Custode; 10 Round per Tecnomante e altre Classi. A piena carica offre quindi cinque attivazioni per qualsiasi utilizzatore, senza mezze cariche. Il Custode conserva in alternativa il costo di 1 PM personale; il Tecnomante conserva quello di 2 PM personali. Il colore della lama dipende dal frammento focalizzatore ed è distinto dal colore energetico della batteria; non aggiunge effetti elementali.  
 **4\. Costruzione energetica e ricarica delle cariche**  
 Nel manuale, nelle regole di costruzione e ricarica, si specifica che una carica della CyberArma richiede 2 PM di energia Spirituale effettivamente immagazzinata. Per ottenere le cinque cariche complete occorre infondere complessivamente 10 PM Verdi, applicando tutte le normali conversioni e procedure del regolamento. I PM personali effettivamente spesi dipendono dal rapporto di conversione: non si presume automaticamente un rapporto 1:1.  
 Questi valori servono al calcolo tecnico della creazione e della ricarica e non costituiscono un saldo di PM prelevabile dal giocatore. Per le riserve dedicate degli altri artefatti il rapporto fra PM infusi e numero di cariche dipende dal costo della rispettiva attivazione: cinque cariche non equivalgono automaticamente a 10 PM per ogni oggetto. La presente risposta definisce la configurazione della CyberArma e non converte automaticamente le batterie autonome destinate ad alimentare incantesimi.  
 **5\. Reperibilità, valore e disponibilità**  
 Reperibilità Epica per il modello originale e per quello modificato. La CyberArma non è normalmente commercializzata: non ha un prezzo standard di catalogo. La precedente proposta di 3.000 crediti è ritirata. Nell’app il prezzo risulta non disponibile, non zero.  
 Esistono pochissimi esemplari, custoditi dai Custodi che li hanno costruiti e dai Tecnomanti che li realizzano o modificano. Non è un normale acquisto da negozio; avere abbastanza crediti non ne garantisce la disponibilità. L’eventuale cessione o commissione e il relativo valore vengono stabiliti dal Direttore secondo disponibilità, costruttore e condizioni richieste. I costi di realizzazione riportati sotto non costituiscono un prezzo di vendita automatico.  
 **6\. Costruzione del modello originale senza batteria**  
 La costruzione è riservata a un Custode con Maestro d’Arma oppure a un Tecnomante con Architetto TecnoMistico. Per il Custode, Maestro d’Arma comprende la ricetta e autorizza costruzione e infusione della propria arma personale senza richiedere Ritualista; restano le Prove della procedura. Il Tecnomante usa un progetto disponibile oppure lo sviluppa seguendo la procedura ordinaria.  
 Progettazione, soltanto se manca il progetto: Prova di Artefatti senza penalità, 4 ore e 100 crediti di risorse. Un progetto disponibile non deve essere sviluppato nuovamente.  
 Assemblaggio e regolazione del condensatore: Prova di Tecnologia −4, 16 ore e 1.000 crediti di componenti. Sono compresi impugnatura, condensatore e frammento di cristallo focalizzatore; il frammento non costituisce una riserva.  
 Infusione di Grado I: Prova di Rituali senza penalità, 1 ora, 250 crediti di reagenti e 3 PM personali.  
 Totale con progetto disponibile e successi ordinari: 1.250 crediti, 17 ore di lavoro e 3 PM personali. Se occorre sviluppare anche il progetto: 1.350 crediti, 21 ore e 3 PM personali. Si applicano i normali esiti Magistrali, fallimenti, Maldestri e interruzioni dei §§24.3–24.5 del Manuale della Magia. La reperibilità dei componenti specifici è stabilita dal Direttore.  
 **7\. Modifica per integrare la Batteria Verde da 5 cariche**  
 La modifica è riservata a un Tecnomante con Architetto TecnoMistico e almeno II Grado di Classe.  
 Progetto della modifica, se non disponibile: Prova di Artefatti −2, 8 ore e 200 crediti di risorse.  
 Adattamento e installazione: Prova di Tecnologia −2, 8 ore e 500 crediti di materiali, contenitore compreso. Chroma Verde per la capacità di cinque cariche: ulteriori 1.000 crediti.  
 Reinfusione completa della configurazione di Grado II: Prova di Rituali −2, 2 ore, 500 crediti di reagenti e 6 PM personali. La nuova infusione riguarda l’intera configurazione, secondo le normali regole di modifica degli artefatti.  
 Costo aggiuntivo per modificare un’arma esistente, con progetto disponibile e successi ordinari: 2.000 crediti, 10 ore e 6 PM personali. Se bisogna sviluppare anche il progetto: 2.200 crediti, 18 ore e 6 PM personali. Questi totali comprendono materiali, contenitore, Chroma e reagenti sopra indicati: il costo della batteria non si aggiunge nuovamente. Si applicano i normali esiti delle Prove.  
 Al termine della modifica la batteria è a 0/5 cariche. La prima ricarica è separata: per raggiungere cinque cariche occorre immagazzinare l’equivalente di 10 PM Verdi con le conversioni ordinarie. I 6 PM personali del rituale servono all’infusione del manufatto e non caricano la batteria.  
 **8\. Recepimento nei manuali e nell’app**  
 Integrare la scheda del Manuale degli Armamenti §7.25 e i rimandi pertinenti del Giocatore, della Magia e dell’Equipaggiamento. Sostituire il precedente limite che riservava anche il modello con batteria soltanto a Custodi e Tecnomanti con l’accesso delle altre Classi a −2 VA qui approvato. Registrare un’unica istanza dell’oggetto nelle categorie Armi e Artefatti, senza duplicare peso, Integrità, riserva o SnT.  
 Nell’app distinguere modello originale e configurazione con Batteria Verde da 5 cariche, applicare requisiti, profili e −2 alle altre Classi, mostrare il saldo in cariche e impedirne l’uso come PM per altri effetti. Conservare separati costo della creazione/ricarica e cariche disponibili. A.158 ha ricevuto risposta completa; l’effettivo recepimento nell’app e nei manuali resta da verificare e non è attestato dalla presente registrazione.

> > #### **A.159 — Ferite, Morente e stabilizzazione: risposta completa approvata**

Approvato il 14 ottobre 2026, a conclusione delle decisioni del 13–14 ottobre. Risposta al quesito dell’app A.159 (Manuale del Giocatore §5.14), con raccordi alle cure del Giocatore, della Magia e dell’Equipaggiamento. La seguente regola sostituisce la morte immediata per il solo superamento di Grave e la gestione provvisoria «Oltre Grave» come semplice avviso al Direttore. Risposta approvata; il recepimento nei manuali e l’implementazione nell’app devono essere applicati e verificati separatamente.  
 **1\. Da Grave a Morente**  
 La scala ordinaria delle Ferite resta Superficiale −1, Importante −2, Profonda −4, Seria −6, Grave −8. Quando le Ferite fanno superare Grave, il personaggio entra in Morente: mantiene la penalità −8 a VA e Prove Salvezza e sviene automaticamente, senza una Prova aggiuntiva per rimanere cosciente. Si applicano le limitazioni di Svenuto.  
 Il solo raggiungimento di 0 PV non provoca automaticamente Svenuto, Morente o morte. Restano le normali regole di danno, Tempra, acquisizione delle Ferite e Menomazioni. Le cause che stabiliscono espressamente la morte diretta o la distruzione del corpo restano distinte: Morente e le cure descritte qui non costituiscono una resurrezione.  
 **2\. Contatore dei Round**  
 All’ingresso in Morente si apre un contatore pari al valore intero effettivo di Costituzione (COS) in quel momento, non al modificatore. Il valore iniziale resta fissato per quell’episodio: successive variazioni di COS non modificano il contatore già aperto.  
 Si perde 1 Round per ogni Round intero trascorso dall’ingresso in Morente. Il decremento avviene alla stessa posizione d’Iniziativa in cui è iniziato l’episodio; la frazione del Round d’ingresso non determina un decremento immediato. L’app deve conservare il riferimento temporale dell’ingresso, senza anticipare il primo decremento alla semplice fine del Round corrente.  
 Quando il contatore attivo arriva a 0, il personaggio muore definitivamente. Una cura specifica deve avere prodotto il proprio effetto prima della scadenza: iniziare una procedura non sospende il tempo disponibile. Dopo una stabilizzazione, un successivo nuovo ingresso in Morente apre un nuovo contatore completo, calcolato sulla COS effettiva del nuovo episodio.  
 **3\. Colpo iniziale e Ferite successive**  
 Il singolo colpo che porta oltre Grave esaurisce l’avanzamento delle Ferite nel passaggio a Morente. Le eventuali Ferite eccedenti prodotte da quello stesso colpo non riducono il contatore: l’ingresso avviene sempre con tutti i Round previsti dalla COS. Restano applicabili gli altri effetti del colpo, compreso l’eventuale Sanguinamento.  
 Soltanto i colpi o gli eventi di danno successivi, quando il personaggio è già Morente, possono abbreviare il contatore attraverso nuove Ferite. Si risolvono normalmente danno, protezioni, Tempra quando prevista ed effettive Ferite prodotte. Ogni nuova Ferita sottrae 1 Round residuo; non si sottrae un Round per ogni punto di danno. Le ulteriori Ferite non riavviano il contatore.  
 La regola vale anche per i colpi successivi dello stesso attacco e per le Ferite causate dal Sanguinamento. Se una riduzione porta il contatore a 0, la morte è immediata. Esempio: un personaggio Grave con COS 5 subisce un colpo che produrrebbe tre Ferite; entra in Morente con 5 Round. Un colpo successivo che produce due nuove Ferite sottrae 2 Round dal saldo rimasto.  
 **4\. Stabilizzazione, coscienza e Sanguinamento**  
 Una cura con capacità esplicita di stabilizzare riporta immediatamente da Morente a Grave (−8), azzera e disattiva il contatore. Il valore 0 di un contatore disattivato dopo la cura non provoca la morte. Il personaggio riprende coscienza all’inizio del proprio turno successivo, salvo altre cause di incoscienza ancora presenti, e può agire in quel turno con tutte le penalità pertinenti.  
 Il recupero della coscienza è possibile anche se il personaggio è ancora a 0 PV. La stabilizzazione non ripristina automaticamente PV, non elimina Menomazioni e non arresta il Sanguinamento: questi effetti dipendono dalla cura concretamente utilizzata.  
 Se un personaggio stabilizzato a Grave subisce in seguito una nuova Ferita da Sanguinamento, torna Morente, sviene e apre un nuovo contatore completo. Se è già Morente, ogni nuova Ferita da Sanguinamento riduce invece di 1 Round il contatore esistente. Stabilizzante e Coagulante svolgono quindi funzioni diverse e possono servire entrambi, rispettando il limite comune di somministrazione rapida.  
 **5\. Cura medica: Stabilizzazione d’emergenza**  
 Nuova procedura medica per un paziente Morente: Medicina utilizzabile, paziente adiacente e accessibile, kit medico almeno Standard. Richiede 2 Round consecutivi, con 1 AzP in ciascun Round, e consuma un’applicazione del kit all’inizio. Alla fine si effettua una Prova di Medicina con −2 per l’urgenza, oltre ai modificatori pertinenti di strumenti e circostanze. Il kit Professionale applica il proprio \+2; la penalità −8 del paziente non si trasferisce al soccorritore.  
 Successo: Morente → Grave (−8), contatore azzerato e disattivato, nessun PV recuperato. Successo Magistrale: stesso effetto e recupero di 1d4 PV, se consentito dalle condizioni di Sanguinamento. Fallimento: nessuna stabilizzazione, il contatore continua. Maldestro: nessuna stabilizzazione e perdita immediata di 1 ulteriore Round residuo.  
 L’inizio della procedura non ferma il contatore. Se viene interrotta non si effettua la Prova finale e l’applicazione già spesa resta consumata. Si può tentare nuovamente se rimane tempo, spendendo una nuova applicazione. Questa procedura di salvataggio è distinta dal limite settimanale dei normali trattamenti che riducono gli Stati di Ferita.  
 Raccordi ai Talenti: Soccorso Immediato del Paramedico riduce questa nuova procedura a 1 AzP, mantenendo Prova e materiali; Stabilizzazione del Medico applica il proprio \+2 alla Prova. Triage Estremo consente l’intervento in 1 AzP senza Prova, una volta per combattimento e con kit almeno Standard e materiali previsti: riporta a Grave, disattiva il contatore e arresta anche il Sanguinamento. Restano le altre condizioni del Talento e le regole sulle Menomazioni.  
 **6\. Cura magica e Stasi**  
 Guarigione acquisisce una modalità di stabilizzazione d’emergenza: occorre conoscere l’incantesimo almeno al livello 3; costo 3 PM, tempo 1 AzP, contatto, un solo bersaglio vivente e normale Prova di Potere con i requisiti di lancio dell’incantesimo. Se il lancio riesce su un bersaglio Morente, lo riporta a Grave (−8), disattiva il contatore e gli restituisce 1 PV. Non arresta il Sanguinamento e non cura le Menomazioni.  
 La modalità d’emergenza è utilizzabile anche se il paziente ha già ricevuto il normale effetto di Guarigione nelle precedenti 24 ore. Non consuma né azzera quel limite della cura ordinaria. Può essere ripetuta per un nuovo episodio di Morente, pagando nuovamente il costo; nell’impiego d’emergenza il ritorno è sempre a Grave e non a uno Stato migliore per l’impiego di una versione superiore.  
 Le cure che recuperano soltanto PV non stabilizzano: fra queste Cura Ferite, Corpo Adattivo, Psicometabolismo, cartucce Curative e spray curativi. Recuperare PV mentre si è Morente non disattiva da solo il contatore. Analogamente, arrestare o sospendere il Sanguinamento non equivale a stabilizzare, se l’effetto non lo prevede espressamente.  
 Protocollo Shock e gli effetti di Cura Spirituale che rimuovono Svenuto non sostituiscono una cura di Morente. Naniti, Intervento Mirato e Terapia Intensiva restano trattamenti con i propri tempi; non diventano interventi istantanei. Imposizione della Mano Curativa mantiene il tempo di 5 minuti per la cura di una Ferita e non acquisisce una nuova modalità rapida. Rigenerazione resta rivolta alle Menomazioni e non è una resurrezione o una stabilizzazione d’emergenza.  
 La Stasi sospende il decorso del contatore di Morente senza azzerarlo e senza stabilizzare. All’uscita riprende il conteggio dai Round residui. Il paziente necessita ancora di una cura specifica; restano le normali condizioni della Stasi e dei trattamenti.  
 **7\. Nuovo consumabile: Cartuccia Stabilizzante**  
 Cartuccia Stabilizzante: prezzo 2.000 crediti; Reperibilità Molto rara (MR); monouso; occupa un alloggiamento per cartucce. Compatibile con le UMC, gli iniettori sanitari, le pistole sanitarie, gli iniettori impiantati e le postazioni medico-chirurgiche secondo le rispettive regole d’impiego.  
 Una somministrazione riuscita a un paziente ancora vivo e Morente lo riporta immediatamente a Grave (−8) e azzera/disattiva il contatore. Non restituisce PV, non cancella i PV eventualmente già recuperati, non arresta il Sanguinamento, non elimina Menomazioni e non migliora la condizione oltre Grave. Non agisce dopo la morte e non neutralizza cause di morte diretta.  
 Il paziente Morente e incosciente non può attivare volontariamente un dispositivo. Un alleato può usare i comandi accessibili: con UMC Passiva occorrono 1 AzP e la normale Prova di Medicina o Tecnologia–Strumentazione; con UMC Attiva occorre 1 AzP senza Prova. Gli altri dispositivi mantengono le proprie regole di somministrazione, azione e Prova.  
 L’UMC Automatica può avere un protocollo Morente abilitato, con almeno una Cartuccia Stabilizzante caricata: interviene senza Azioni e senza Prova, rispettando l’ordine di risoluzione seguente. Quando il paziente è Morente, la Stabilizzante ha priorità tra i protocolli automatici.  
 Resta il limite di una sola somministrazione rapida per paziente per Round, condiviso fra dispositivi, UMC, impianti e postazioni. Non si ottengono somministrazioni aggiuntive usando strumenti differenti. Una nuova Cartuccia Stabilizzante può essere usata in un successivo episodio di Morente, sempre nel rispetto di questo limite.  
 **8\. UMC Automatica: dopo l’intero attacco**  
 Si risolve prima l’intero attacco, compresi tutti i suoi colpi, le Prove pertinenti e tutte le Ferite. Il primo colpo che porta a Morente lascia il contatore pieno; eventuali colpi successivi dello stesso attacco possono ridurlo secondo il punto 3\.  
 Soltanto al termine dell’intero attacco, se il personaggio è ancora vivo e Morente, l’UMC Automatica può somministrare la Stabilizzante caricata, se il protocollo è abilitato e il limite di somministrazione del Round non è già stato utilizzato. Se il contatore si è esaurito durante l’attacco, il dispositivo non può salvare né resuscitare il personaggio.  
 Se la somministrazione rapida del Round è già stata utilizzata, il primo momento utile è nel Round successivo, purché il personaggio sia ancora vivo e le altre condizioni siano rispettate. Questa tempistica sostituisce la precedente formulazione provvisoria «immediatamente all’ingresso in Morente»: non si interrompe un attacco fra i suoi colpi per far intervenire l’UMC Automatica.  
 **9\. Rappresentazione e comandi dell’app**  
 L’app distingue Grave, Morente e Morto. Grave mantiene −8. Morente mantiene −8, applica le limitazioni di Svenuto e rende ben visibili i Round residui. Il contatore diminuisce per il trascorrere dei Round e per le nuove Ferite secondo i punti 2–3. Al raggiungimento di 0 con contatore attivo, il personaggio passa a Morto: non resta soltanto un avviso generico «Oltre Grave».  
 Il comando «Stabilizza» registra l’esito di una cura specifica riuscita: riporta a Grave, disattiva il contatore e lo nasconde dalla visualizzazione. Registra anche il recupero della coscienza all’inizio del turno successivo del paziente, salvo altre cause. Il comando non concede una cura gratuita: PV, Sanguinamento, Azioni, PM, applicazioni del kit e cartucce devono riflettere il trattamento effettivamente utilizzato.  
 Un contatore disattivato a 0 dopo stabilizzazione deve essere distinto da un contatore attivo esaurito. Un nuovo episodio apre un nuovo contatore completo; il normale recupero dei PV non deve cancellare automaticamente Morente. L’automatismo UMC deve rispettare sia la conclusione dell’intero attacco sia il limite condiviso di somministrazione.  
 **10\. Recepimento e stato del quesito**  
 A.159 ha ricevuto risposta completa. Raccordare il Manuale del Giocatore (§5.14, Svenuto, soccorso, Talenti medici e Sanguinamento), il Manuale della Magia (Guarigione, Stasi e rimandi alle cure) e il Manuale dell’Equipaggiamento (Cartuccia Stabilizzante, UMC e dispositivi compatibili). Le normali regole delle Ferite, delle Menomazioni e delle cure non modificate da questa risposta restano valide.  
 Questa registrazione consolida le decisioni approvate nei due documenti di risposta. Non attesta che i manuali siano già stati aggiornati o che Marcello abbia già implementato le nuove funzioni nell’app. La domanda originale resta nel documento del collaboratore per il normale recepimento e passaggio di stato.

> > #### **A.115 — Capacità specifiche dei nemici**

Approvato e registrato il 15 ottobre 2026\.  
 L’app deve mostrare la descrizione completa della capacità e gestire le Prove, i costi in Azioni, il consumo di risorse e i limiti d’uso espressamente previsti dal profilo. Il solo testo descrittivo non sostituisce questi dati quando la capacità richiede un’attivazione o una risoluzione.  
 Le capacità passive non richiedono Azioni soltanto quando sono dichiarate tali. Per quelle attive valgono costo, risorsa, bersagli, momento d’impiego, Prove, durata e condizioni scritti nella scheda o richiamati da una regola comune. Non si assegnano costi, Prove o effetti aggiuntivi per analogia quando mancano i dati.  
 Raccordo al Manuale dei Mostri, §§3.1–3.2: usare i dati del profilo corrente, conservando distinguibili la descrizione e i parametri necessari alla risoluzione.

> > #### **A.126 — Ingombro delle creature e campo Spazio**

Risposta sull’ingombro registrata il 15 ottobre 2026; raccordo con l’origine dei coni completato dalla risposta integrativa A.126–A.138 del 15 ottobre 2026, riportata in coda.  
 La scheda deve avere un campo specifico per lo spazio occupato sulla mappa, espresso in Q: per esempio 1 × 1, 2 × 2 o 3 × 3 Q. Si utilizza l’ingombro indicato nel profilo della creatura; 3 × 3 Q non deriva automaticamente dall’etichetta di Taglia.  
 L’ingombro serve a rappresentare la pedina e verificarne il passaggio e il posizionamento. Rimane distinto dalla portata degli attacchi, regolata dalla A.133.  
 Il punto d’origine del cono per creature che occupano più Q è definito nella risposta integrativa A.126–A.138 del 15 ottobre 2026, riportata in coda. Il precedente rinvio su questo punto è superato; il recepimento nell’app resta distinto dall’approvazione della regola.

> > #### **A.133 — Portata delle creature grandi**

Approvato e registrato il 15 ottobre 2026\.  
 Si usa la portata indicata nel profilo del singolo attacco, misurata attorno all’ingombro della creatura. La distanza non si misura soltanto dal centro della pedina.  
 Occupare 2 × 2 o 3 × 3 Q non porta automaticamente la portata a 2 o 3 Q. Se il profilo indica 1 Q, la portata resta 1 Q attorno allo spazio occupato. Una portata maggiore richiede una previsione esplicita della scheda.  
 Restano le normali condizioni per controllare una zona ed effettuare Attacchi di Opportunità, compresi portata effettiva, ostacoli e condizioni del combattente.

> > #### **A.113 — Veicoli: permessi, sincronizzazione e denominazioni**

Approvato e registrato il 15 ottobre 2026\.  
 Il Direttore può modificare tutti i veicoli della campagna, compresi quelli personali dei PG: danni, riparazioni, consumi, dotazioni e caratteristiche. La proprietà del mezzo rimane assegnata al personaggio.  
 Senza collegamento al server, il veicolo condiviso resta in sola lettura e si consulta l’ultima copia disponibile. Per registrare modifiche occorre ristabilire il collegamento, evitando versioni discordanti fra i giocatori.  
 Le tre denominazioni ufficiali sono Corpo principale, Propulsione e Motore. L’app deve usare questi nomi; Carrozzeria non sostituisce il nome generale Corpo principale.

> > #### **A.145 — Azioni sui veicoli: regole generali e categorie**

Decisioni approvate il 15 ottobre 2026 e consolidate dopo la conclusione dei quesiti sui veicoli.  
 Il veicolo si muove all’Iniziativa del conducente. Gli altri occupanti agiscono alle proprie Iniziative; essere trasportati non consuma la loro AzM. Un cambio di conducente non concede al mezzo un secondo movimento né ripristina il movimento già effettuato nello stesso Round.  
 Salire e scendere costano ciascuno 1 AzP nelle condizioni ordinarie: mezzo fermo o in condizioni adatte, accesso aperto e praticabile. Raggiungere il mezzo, attraversare un ponte o un corridoio e muoversi a bordo richiede il movimento effettivo; non è compreso automaticamente nell’AzP di salita o discesa.  
 Prendere i comandi e avviare un mezzo già predisposto sono operazioni distinte, da 1 AzP ciascuna. L’avvio non elimina preparazione, controlli, tempi tecnici o numero di addetti previsti dalla scheda.  
 La guida ordinaria non richiede Prove. Si tira quando esiste una difficoltà concreta; una Prova di controllo imposta dalle condizioni è compresa nell’AzM. Una manovra complessa volontaria costa invece anche 1 AzP. I costi valgono per chi esegue l’operazione e richiedono accesso ai comandi, mani disponibili e compatibilità con la mansione.  
 Le cinture ordinarie sono comprese nell’operazione di prendere posto o lasciarlo; le imbracature complesse richiedono 1 AzP per allacciare e 1 AzP per slacciare. Porte e portelli non si chiudono automaticamente.  
 Tabella delle operazioni approvate. Le righe generali si applicano alle categorie pertinenti; le righe specifiche le completano senza duplicare il costo della stessa operazione.

| Categoria | Operazione | Costo e condizioni |
| :---- | :---- | :---- |
| Generale | Salire o scendere | 1 AzP per operazione; accesso aperto e praticabile, mezzo fermo o in condizioni adatte. |
| Generale | Aprire o chiudere porta, portello o tettuccio | 1 AzP per operazione. Blocchi e procedure particolari si risolvono separatamente. |
| Generale | Prendere posto ai comandi | 1 AzP; eventuale imbracatura complessa richiede una propria AzP. |
| Generale | Avviare il mezzo già predisposto | 1 AzP; restano i tempi tecnici previsti. |
| Generale | Condurre e muovere il mezzo | 1 AzM per Round. |
| Generale | Manovra complessa volontaria | \+1 AzP oltre all’AzM; Prova e modificatori pertinenti. |
| Generale | Muoversi verso il mezzo o al suo interno | Normale movimento in Q; separato dall’operazione di accesso. |
| Generale | Cintura ordinaria / imbracatura complessa | Cintura ordinaria compresa nel prendere o lasciare il posto. Imbracatura complessa: 1 AzP per allacciare o slacciare. |
| Auto e moto | Freno di stazionamento e cavalletto | Compresi nell’AzM di partenza o parcheggio, nelle condizioni ordinarie. |
| Auto e moto | Portiere | 1 AzP per aprire o chiudere ciascuna portiera; nessuna chiusura automatica. |
| Moto | Montare o smontare; mantenere l’equilibrio | Salita o discesa: 1 AzP. Equilibrio ordinario senza Prova; difficoltà concrete seguono le regole generali. |
| Imbarcazioni | Imbarcarsi o sbarcare | 1 AzP; raggiungere l’accesso o percorrere il ponte richiede il movimento effettivo. |
| Imbarcazioni | Gestire un ormeggio semplice | 1 AzP per punto di ormeggio. |
| Imbarcazioni | Ancora meccanizzata | 1 AzP per il comando; completamento secondo i tempi della scheda. |
| Imbarcazioni | Ancora manuale | Durata, lavoro e addetti secondo la scheda. |
| Imbarcazioni | Accostarsi o allontanarsi | Compreso nell’AzM di conduzione; eventuali ormeggi sono operazioni separate. |
| Imbarcazioni a motore | Comandi, avvio e conduzione | Costi generali: 1 AzP per prendere i comandi, 1 AzP per avviare il motore pronto, 1 AzM per guidare. |
| Remi | Preparare i remi e prendere posto | 1 AzP. |
| Remi | Vogare | 1 AzM per Round per ciascun vogatore necessario. Governare una piccola barca mentre si rema è compreso nella stessa AzM. |
| Vela | Issare o ammainare le vele | Durata e numero di addetti secondo la scheda; ciascun addetto impiega 1 AzP per Round di lavoro. |
| Vela | Governare a vela | 1 AzM per Round del timoniere; regolazioni ordinarie dalla propria postazione comprese. |
| Vela | Regolazioni che richiedono altri membri | 1 AzP per addetto quando necessario; restano procedure ed equipaggio previsti. |
| Velivoli atmosferici | Preparazione al volo | Durata e addetti secondo la scheda; ciascun addetto impiega 1 AzP per Round di preparazione. |
| Velivoli atmosferici | Rullare, volare, decollare o atterrare | 1 AzM per Round per la durata dell’operazione; eventuale manovra complessa richiede anche 1 AzP. |
| Velivoli atmosferici | Mantenere lo stazionario | 1 AzM per Round, soltanto per un mezzo che lo consente. |
| Velivoli atmosferici | Accesso, portello, comandi e avvio | Costi generali: 1 AzP per ciascuna operazione pertinente. Avvio da mezzo predisposto; imbracatura complessa separata. |
| Astronavi | Attivare una camera di compensazione | 1 AzP per il comando; il ciclo richiede il tempo tecnico della scheda e non è necessariamente completato nell’azione. |
| Astronavi | Preparare la nave alla partenza | Durata e addetti secondo la scheda; ciascun addetto impiega 1 AzP per Round di preparazione. |
| Astronavi | Avviare i sistemi già predisposti | 1 AzP; eventuali tempi tecnici rimangono necessari. |
| Astronavi | Pilotare attivamente | 1 AzM per Round; comprende il normale controllo della rotta e della velocità. |
| Astronavi | Decollare, atterrare o attraccare | 1 AzM per Round per tutta la durata della manovra. Requisiti e tempi secondo il mezzo; complessa solo quando le condizioni lo giustificano. |
| Astronavi | Azionare un comando semplice di bordo | 1 AzP dalla postazione appropriata; le operazioni articolate seguono la propria procedura. |
| Astronavi | Navigazione automatica e ripresa del controllo | Un sistema disponibile e attivo che mantiene autonomamente la rotta non richiede l’AzM del pilota ogni Round. Riprendere il controllo manuale: 1 AzP, poi i normali costi di pilotaggio. |

> > #### **A.146 — Veicoli e Attacchi di Opportunità**

Approvato il 15 ottobre 2026\. Sostituisce l’ipotesi provvisoria «no in entrambi i casi».  
 Un veicolo che esce dalla portata di un nemico può provocare un Attacco di Opportunità secondo le normali condizioni, se il nemico può effettivamente raggiungerlo in mischia.  
 Si può scegliere come bersaglio il veicolo oppure un suo occupante esposto e raggiungibile. Un occupante completamente protetto dall’abitacolo non può essere colpito direttamente attraverso la carrozzeria. Si applicano le normali regole di Copertura.  
 Contro il mezzo si applicano le regole dei danni ai veicoli e le relative protezioni. L’attacco non arresta automaticamente il movimento: occorre un effetto che lo determini secondo le regole pertinenti.  
 Per ciascun nemico, il medesimo passaggio del mezzo costituisce una sola occasione: si sceglie un bersaglio valido, veicolo oppure occupante esposto. Non si moltiplicano gli attacchi per il numero degli occupanti; restano i normali limiti degli Attacchi di Opportunità.  
 Il veicolo non possiede una propria zona di controllo. Un occupante in grado di combattere in mischia verso l’esterno controlla soltanto la zona raggiungibile dalla propria posizione con la portata della propria arma; non l’intero perimetro del mezzo. Pareti, vetri chiusi e altri ostacoli impediscono gli attacchi attraverso di essi.  
 Chi guida deve avere arma pronta, libertà di movimento e possibilità materiale di attaccare senza abbandonare i comandi necessari. La sola presenza a bordo non basta.  
 Il movimento del mezzo accanto a un nemico fermo non concede agli occupanti Attacchi di Opportunità contro quel nemico: spostare la propria zona di controllo non equivale a un disimpegno dell’avversario.  
 Esempio: accanto a una moto che riparte si può colpire la moto oppure il motociclista esposto, se ricorrono le condizioni. Accanto a un’auto chiusa si può colpire il mezzo, ma non direttamente il conducente effettivamente protetto.

> > #### **A.147 — Curve, rotazioni e posizionamento a 45°**

Approvato il 15 ottobre 2026, con integrazione esplicita: l’app deve permettere il posizionamento dei veicoli anche a 45 gradi.  
 Curva ordinaria: compresa nell’AzM di conduzione. Si contano i Q effettivamente percorsi lungo la curva, senza un supplemento per la rotazione.  
 Sterzata stretta: AzM di conduzione \+ 1 AzP, Prova di Pilotare −2 oltre a MAN e agli altri modificatori pertinenti. Non aggiunge un costo fisso in Q.  
 Inversione rapida: AzM di conduzione \+ 1 AzP, Prova di Pilotare −4 oltre a MAN e agli altri modificatori pertinenti. Il mezzo e lo spazio disponibile devono permetterla.  
 Inversione ordinaria con percorso ampio o successive manovre lente: normale conduzione, pagando tutti i Q percorsi e le AzM dei Round necessari. Non diventa automaticamente un’Inversione rapida.  
 Rotazione sul posto: consentita soltanto se il mezzo è capace di eseguirla; è compresa nell’AzM di conduzione e non consuma Q di traslazione. Restano tempi e capacità della scheda. Un mezzo incapace di ruotare sul posto deve compiere un percorso di manovra.  
 Non esiste una soglia angolare universale che trasformi una curva ordinaria in manovra complessa. Si valutano andatura, spazio disponibile, traiettoria e caratteristiche del mezzo. Una curva di 90° lenta e ampia può essere ordinaria; una deviazione di 45° imposta all’ultimo momento ad alta velocità può essere una Sterzata stretta.  
 L’orientamento segue la manovra effettuata: non si può ruotare liberamente il veicolo prima o dopo lo spostamento per ottenere una direzione che non è stata raggiunta. L’intero ingombro deve poter passare anche durante la curva, non soltanto nelle posizioni iniziale e finale.  
 Spezzare una sterzata in più piccole rotazioni non ne modifica il costo: si valuta la manovra nel suo insieme. Per le astronavi, ruotare lo scafo non modifica automaticamente la traiettoria; il cambio di direzione del movimento deve essere consentito dalla propulsione e dalla manovra eseguita.  
 Requisito dell’app: consentire almeno gli otto orientamenti a intervalli di 45° — 0°, 45°, 90°, 135°, 180°, 225°, 270° e 315° — permettendo di collocare e mantenere il veicolo anche in diagonale. Il posizionamento a 45° deve essere utilizzabile sulla mappa, non soltanto un’anteprima grafica.  
 Il controllo del posizionamento e del passaggio deve considerare l’ingombro del mezzo nel suo orientamento effettivo, compresi quelli diagonali. Non si deve forzare il ritorno a un orientamento ortogonale al termine dello spostamento.  
 Nessun costo automatico del tipo «1 Q ogni 45°». L’app conteggia il percorso e permette al Direttore di classificare la manovra come ordinaria, Sterzata stretta o Inversione rapida, con i relativi costi e la Prova. La disponibilità del comando di rotazione non autorizza una manovra altrimenti impossibile.  
 Stato del recepimento: queste risposte registrano le decisioni approvate. L’aggiornamento dei manuali e l’implementazione nell’app devono essere applicati e verificati separatamente; non sono attestati dalla presente registrazione. Le domande originali restano invariate per il normale recepimento del collaboratore.

> > #### **A.126–A.138 — Origine dei coni delle creature grandi: completamento approvato**

Approvato e registrato il 15 ottobre 2026\.  
 Il cono parte dal centro di un quadretto periferico della creatura, sul lato da cui viene emesso l’effetto. Questa integrazione completa il raccordo fra ingombro delle creature e template a cono, senza modificare la geometria lineare già approvata nella A.138.  
 Creatura di 1 × 1 Q: il vertice parte dal centro del suo unico quadretto, come già previsto.  
 Creatura di 2 × 2 Q: il vertice parte dal centro di uno dei quadretti sul lato dell’emissione.  
 Creatura di 3 × 3 Q o superiore: il vertice parte dal centro di un quadretto del perimetro sul lato dell’emissione; non da un quadretto interno.  
 Origine coerente con l’attacco. Un soffio parte dal lato della bocca; un’emissione da un’appendice deve rispettarne la posizione. Se la scheda indica un punto specifico, prevale quello.  
 Direzione verso l’esterno. L’asse del cono deve uscire dall’ingombro, senza attraversare altri quadretti occupati dalla creatura.  
 Dimensioni invariate. Lunghezza e ampiezza sono quelle dell’effetto, misurate dal punto d’origine scelto. La Taglia non le aumenta automaticamente. Il cono continua ad allargarsi linearmente da zero fino all’ampiezza finale.  
 Esclusione del proprio spazio. Tutti i quadretti occupati dalla creatura sono esclusi dal suo cono, salvo eccezione espressa.  
 Bersagli e ostacoli. Un quadretto è colpito quando almeno metà della sua superficie è coperta dal template. Restano le normali regole di propagazione e ostacoli.  
 Scelta prima della risoluzione. Origine e direzione si fissano prima dei tiri e rimangono ferme per quell’uso dell’effetto.  
 Esempio: una creatura di 3 × 3 Q soffia verso nord. Si sceglie un quadretto della fila settentrionale compatibile con la posizione della bocca; il cono parte dal suo centro. Un soffio lungo 6 Q mantiene quella lunghezza, senza consumarne una parte per attraversare il corpo.  
 Requisito dell’app. Selezionando il cono di una creatura grande, si deve poter scegliere il quadretto periferico d’origine e orientare il template, anche in diagonale. La selezione deve rispettare lato dell’emissione, anatomia ed eventuali indicazioni della scheda; l’asse non attraversa altri quadretti del proprio ingombro.  
 Stato della risposta. Il raccordo sull’origine dei coni delle creature grandi è ora definito e approvato. Questa risposta completa la A.126 e integra la A.138, superando il precedente rinvio su questo punto. Non attesta l’avvenuto aggiornamento dei manuali né l’implementazione nell’app, che restano da applicare e verificare separatamente.

> > #### **A.160 — Punti Abilità liberi degli avversari costruiti come PG**

Approvato e registrato il 16 ottobre 2026\.  
 Il riferimento a 5 punti Abilità liberi è un refuso. Gli avversari costruiti con le regole dei personaggi ricevono 7 punti Abilità liberi alla creazione e a ogni successivo Grado di Classe, rispettando i normali limiti di assegnazione. Non è prevista una distribuzione diversa per il solo fatto di essere nemici.  
 La precisazione riguarda gli avversari costruiti come PG: non impone di ricostruire con quella procedura tutte le creature dotate di un profilo autonomo.  
 Raccordo alla A.90: il comportamento descritto nell’app, 7 punti per Grado per i personaggi costruiti con queste regole, è corretto.  
 Recepimento nel manuale: corretto e verificato nel Google Doc del Manuale dei Mostri v0.4, §5.2, il valore da 5 a 7\. Le altre regole del paragrafo restano invariate. La domanda originale rimane al suo posto per il normale recepimento del collaboratore.

> > #### **A.161 — Approvato: assegnazione manuale dei PX e calcolatore di partita**

Flusso di assegnazione dei PX e proposta di integrazione nel Tavolo del Direttore approvati da Davide il 16 ottobre 2026\. L’approvazione riguarda la specifica funzionale riportata qui sotto.  
 Decisione sull’assegnazione. L’app non deve assegnare automaticamente PX dopo ogni scontro. È il Direttore che, al termine di ogni partita, stabilisce e assegna il totale dei PX al singolo giocatore/personaggio. La conclusione di uno scontro, la sconfitta di un nemico o il semplice calcolo di un premio non devono modificare i PX delle schede.  
 Integrazione richiesta. Si suggerisce una sezione «PX della partita» nel Tavolo del Direttore, riprendendo il sistema già preparato in EROI\_LEGGENDE\_Gestore\_PX\_v1\_2.html. Il gestore comprende data e titolo della partita, presenze, durata, tre voti individuali da 1 a 5 (Partecipazione, Interpretazione/Ruolo, Contributo), bonus personali, incontri superati, premi di fine Atto e archivio delle partite.  
 Proposta operativa. Il calcolatore presenta separatamente le componenti e il totale suggerito per ciascun giocatore. Nel sistema esistente i voti sono sommati e moltiplicati per il fattore del titolo del PG e per la durata; la durata raddoppia soltanto la componente dei voti nelle partite lunghe. Il bonus eccezionale è una componente distinta, moltiplicata per il titolo; i PX degli incontri e i premi di fine Atto restano separati. Fattori, soglie e parametri devono essere allineati ai manuali e alle decisioni vigenti: il vecchio file è il riferimento funzionale, non una fonte da copiare senza verifica.  
 Controllo del Direttore. Accanto al totale suggerito, prevedere il totale finale assegnato, modificabile dal Direttore per ciascun giocatore. Un comando esplicito «Assegna PX della partita» registra gli importi finali scelti e aggiorna i personaggi interessati. Il salvataggio di una bozza, il ricalcolo o la chiusura di uno scontro non costituiscono un’assegnazione. Il Direttore può anche inserire direttamente il totale finale senza essere obbligato a compilare tutte le componenti del calcolatore.  
 Raccordo ai manuali. Per il contributo degli incontri, usare il Manuale del Direttore §9.3: valore unitario già comprensivo della dotazione, un solo esemplare di valore massimo al 100%, gli altri al 50%, correttivo per il numero dei PG e arrotondamento finale del singolo incontro. Il risultato alimenta il riepilogo della partita come valore suggerito; non genera un accredito automatico. I PX del catalogo non devono ricevere una seconda maggiorazione per la dotazione.  
 Archivio e riepilogo. Conservare per partita il dettaglio del calcolo e gli importi effettivamente assegnati a ciascun giocatore. I totali delle schede devono sommare soltanto gli importi assegnati dal Direttore. Evitare duplicazioni quando si riapre, ricalcola o corregge una partita già registrata; le correzioni devono aggiornare la precedente assegnazione, non aggiungerne una seconda. I premi di fine Atto si includono solo quando disposti dal Direttore, evitando di contarli più volte.  
 Stato: flusso di assegnazione e proposta di integrazione approvati da Davide il 16 ottobre 2026, da recepire nello sviluppo. Nessuna modifica al codice dell’app effettuata in questo passaggio.

> > #### **A.164 — Morente, morte e stabilizzazione dei nemici**

Risposta approvata da Davide il 16 ottobre 2026\.  
 Anche i nemici del Tavolo del Direttore seguono la condizione Morente secondo la procedura già approvata nella A.159. Superare Grave provoca Svenuto, mantiene la penalità −8 e avvia il contatore. Il solo raggiungimento di 0 PV non provoca automaticamente Svenuto, Morente o morte. Restano valide le eventuali eccezioni esplicite della scheda e le cause che stabiliscono espressamente morte diretta o distruzione.  
 Il contatore iniziale è pari al valore intero effettivo di COS all’ingresso in Morente, fissato per quell’episodio. Il primo decremento avviene dopo un Round completo, alla stessa posizione d’Iniziativa dell’ingresso, e poi si perde un Round per ogni ulteriore Round intero trascorso. Le Ferite eccedenti del colpo d’ingresso non abbreviano il contatore. Ogni nuova Ferita prodotta da un colpo o evento successivo sottrae un Round residuo, secondo la A.159. Quando il contatore attivo raggiunge 0 sopraggiunge la morte.  
 La stabilizzazione riporta a Grave e disattiva il contatore. Occorre una cura espressamente capace di stabilizzare e compatibile con la creatura; recuperare soltanto PV non basta. Il valore 0 di un contatore disattivato dalla stabilizzazione non provoca la morte. Coscienza, Sanguinamento, Menomazioni e altri effetti restano regolati dalla A.159 e dalle eccezioni del profilo.  
 Se manca la COS, l’app segnala il dato da completare. Il Direttore inserisce il valore necessario, preferibilmente prima dello scontro. Non lo si ricava automaticamente da Tempra o PV, non si interpreta il campo vuoto come 0 e non si dichiara morto il nemico per l’assenza del dato. Se lo scontro è già in corso, il conteggio deve tenere conto dei Round trascorsi dall’ingresso in Morente, senza attribuire un nuovo intervallo completo soltanto perché la COS è stata inserita dopo.  
 Raccordo ai manuali: il Manuale dei Mostri v0.5, §4.2, applica già Morente alle creature; il §3.1 chiarisce che una Caratteristica assente non vale 0\. Questa risposta conferma il comportamento da recepire nell’app e supera la soluzione provvisoria «nessun contatore per i nemici».  
 Stato: risposta approvata e registrata per il recepimento nello sviluppo. L’implementazione nell’app resta da eseguire o verificare separatamente; la registrazione non attesta una modifica al codice.

> > #### **A.162 — Proprietà Indistruttibile e Integrità degli oggetti**

Risposta approvata da Davide il 16 ottobre 2026\.  
 L’app deve prevedere una proprietà esplicita «Indistruttibile». Un valore PI assente non è sufficiente a rappresentarla e non deve essere interpretato come indistruttibilità o come oggetto già rotto.  
 Integrità ordinaria: si applica la gestione normale di PS Integrità e PI. Indistruttibile: la scheda mostra la dicitura esplicita e il danneggiamento non provoca perdita di PI o rottura. Integrità da definire: il dato manca e deve essere completato quando necessario, senza attribuire indistruttibilità implicita.  
 Per lo Scrigno del Primo Giuramento, la proprietà Indistruttibile è attiva. Deve restare visibile anche la regola specifica secondo cui il danneggiamento non consente di forzarne l’apertura. Le autorizzazioni di apertura seguono la sua scheda.  
 La proprietà è riutilizzabile per altri oggetti soltanto quando espressamente prevista dalla relativa scheda. Non si estende automaticamente ai Sigilli o al contenuto dello Scrigno; non si deduce dal fatto che un oggetto sia un Artefatto o una reliquia.  
 Riferimenti: Manuale dell’Equipaggiamento §§1.7 e 10.12; Manuale della Magia §28.2. La soluzione provvisoria «nessun PI e una nota» viene sostituita dalla proprietà esplicita, mantenendo le note necessarie a descrivere le regole particolari.  
 Stato: risposta approvata e registrata per il recepimento nello sviluppo. L’implementazione nell’app resta da eseguire o verificare separatamente; questa registrazione non attesta una modifica al codice.

> > #### **A.163 — Precisazione di Davide: schermatura estesa a qualsiasi contenuto**

Indicazione esplicita di Davide, registrata il 16 ottobre 2026\.  
 I Contenitori del Silenzio schermano qualsiasi cosa venga messa al loro interno, non soltanto gli oggetti di Park. La proprietà di schermatura appartiene al contenitore e si applica alle emanazioni e al potere corruttivo di qualunque contenuto interamente riposto al suo interno.  
 CyberArma, armatura, anello e amuleto sono esempi d’uso e contenuti della campagna, non un elenco esclusivo di oggetti ammessi. Origine, proprietario o tipologia dell’oggetto non costituiscono un requisito per la schermatura.  
 Restano le condizioni di contenimento completo, contenitore chiuso e schermatura integra. Dimensioni e capienza fisica restano quelle del contenitore, senza spazio extradimensionale o alleggerimento del contenuto. La schermatura contiene le emanazioni e il potere corruttivo; non elimina la Corruzione dell’oggetto né quella già accumulata dai personaggi.  
 Correzione della proposta per l’app: l’indicazione Schermatura attiva/inattiva deve dipendere dalle condizioni del contenitore e dal contenimento completo, senza controllare l’appartenenza a un elenco riservato agli oggetti di Park. I riferimenti ai singoli oggetti non devono essere trasformati in vincoli di identità o categoria.  
 Raccordo editoriale da recepire: Manuale dell’Equipaggiamento §10.13 e Manuale della Magia §28.3. Le formulazioni «oggetti previsti» e «oggetti per cui sono predisposti», quando intese come limitazioni della schermatura ai soli oggetti di Park, sono superate da questa precisazione. Le descrizioni degli alloggiamenti e gli esempi d’uso restano utili per la capienza fisica.  
 Stato: precisazione registrata per il recepimento nei manuali e nello sviluppo; questa registrazione non attesta un aggiornamento dei manuali o del codice dell’app.

> > #### **A.166 — Manifestazioni della CyberArma, Abilità e Specializzazioni**

Risposta approvata da Davide il 16 ottobre 2026\. Sostituisce la proposta di distinguere rigidamente un modello a lama da una CyberFrusta personale con forma fissa.  
 Utilizzo da parte dei Custodi. Un Custode può manifestare con la CyberArma qualsiasi tipo di arma ravvicinata: per esempio frusta, spada, ascia o lancia. L’esemplare utilizzato da Park non costituisce un limite alla forma che può manifestare un Custode.  
 Utilizzo da parte dei Tecnomanti e degli altri utilizzatori ammessi. Il progetto base manifesta soltanto una lama lunga. Il Tecnomante può modificare questa manifestazione modificando il progetto base. La scelta libera fra tutte le forme del Custode non è attribuita automaticamente agli altri utilizzatori; la diversa manifestazione segue il progetto modificato.  
 Abilità unica. In tutti i casi la CyberArma si utilizza con Armi da mischia, indipendentemente dalla forma manifestata. Non si passa ad Armi da guerra, Corpo a corpo o a un’altra Abilità perché la corrispondente arma ordinaria usa quell’Abilità.  
 Famiglia e Specializzazione. Dipendono dalla manifestazione effettiva: spada o lama lunga → Spade; frusta → Armi flessibili; ascia → Asce; lancia → Armi inastate. Per le altre forme si usa la famiglia corrispondente del catalogo. La Specializzazione posseduta pertinente alla forma applica i normali benefici di \+1 VA e \+1 danno, senza cumulare Specializzazioni di forme diverse.  
 Raccordo alle Manovre. Si consultano le compatibilità del modello manifestato e le normali Manovre generali, con i rispettivi requisiti, costi e procedure. Per esempio, la manifestazione a lama lunga usa Affondo e Spazzata; la manifestazione a frusta usa la procedura di Immobilizzare con la Frusta. La natura magica non concede ulteriori compatibilità e la presa senza danno non acquista danno dal bonus della Specializzazione.  
 Indicazioni per l’app. Registrare separatamente l’Abilità fissa Armi da mischia e la manifestazione, dalla quale dipendono famiglia, Specializzazione pertinente e Manovre compatibili. Per il Custode consentire la scelta della manifestazione; per il Tecnomante e gli altri utilizzatori ammessi mostrare la forma prevista dal progetto, lama lunga nel modello base. L’eventuale modifica del progetto è una modifica del manufatto, non una facoltà generale di cambio forma assegnata a tutti gli utilizzatori.  
 Ambito della decisione. Questa risposta definisce manifestazioni, Abilità, famiglie e Specializzazioni e il loro raccordo alle Manovre. Non introduce nuovi costi o tempi per il cambio di una manifestazione già attiva. Gli altri parametri e le procedure della CyberArma restano quelli delle decisioni pertinenti, compresa la A.158.  
 Raccordo editoriale: Manuale degli Armamenti §7.25, profili della CyberArma nell’app e rimandi alla Classe Custode e alle Specializzazioni. La soluzione provvisoria che associa ogni CyberArma alle Spade deve essere sostituita dall’associazione alla manifestazione effettiva.  
 Stato: risposta approvata per il recepimento nei manuali e nello sviluppo. Questa registrazione non attesta un aggiornamento dei manuali o del codice dell’app.

> > #### **A.165 — Anticipazione: rettifica dello stato della A.109**

Rettifica editoriale registrata il 16 ottobre 2026 sulla base delle risposte già approvate da Davide l’8 ottobre 2026\.  
 La A.109 è risolta: la regola comune e tutti i punti 1/32–32/32 sono già presenti sia in questo documento sia in «E\&L – Risposte e correzioni approvate». Il confronto dei testi conferma che le regole coincidono.  
 Le precedenti note di sospensione per mancanza dell’elenco sono state aggiornate in entrambi i documenti. Non occorre un nuovo elenco o allegato e non vengono riaperti o modificati i gradini già approvati.  
 Indicazione per lo sviluppo: mantenere le 32 risposte dell’8 ottobre 2026\. La presente rettifica riguarda lo stato editoriale della A.109; non attesta una verifica o una modifica del codice dell’app.

> > #### **A.168 — Correzione delle fasce dei Titoli e dei moltiplicatori PX**

Indicazione esplicita di Davide, registrata il 18 ottobre 2026\. Per il Titolo del personaggio si applicano le seguenti fasce di livello e i relativi moltiplicatori.

| Titolo | Livelli | Moltiplicatore |
| :---- | :---- | :---- |
| Principiante | 1–3 | ×1 |
| Inesperto | 4–7 | ×2 |
| Esperto | 8–11 | ×3 |
| Veterano | 12–15 | ×4 |
| Eroe | 16–19 | ×5 |
| Leggenda | 20+ | ×6 |

Applicazione nel calcolatore: usare queste fasce per ricavare il moltiplicatore del Titolo nelle componenti dei PX che lo prevedono, in raccordo alla A.161. La tabella sostituisce le fasce diverse riportate nella precedente proposta per la A.168 e nel gestore PX.  
 Ambito: Titolo del personaggio, soglie cumulative di PX e Grado di Sfida dell’avversario sono dati distinti. Questa precisazione corregge soltanto le fasce dei Titoli e conferma i moltiplicatori indicati.  
 Stato: correzione registrata per il recepimento nel calcolatore. Le altre parti delle proposte A.167 e A.168 restano da confermare.

> > #### **A.169 — Abilità del Bestiario, VA degli attacchi e Prove di Caratteristica**

Approvazione di Davide: 18 ottobre 2026\.  
 Normalizzazione delle Abilità: Mischia → Armi da mischia; Lancio → Armi da lancio; Guerra → Armi da guerra; Diplomazia → Oratoria. I valori restano invariati. Per la Driade: Armi da mischia 9 e Oratoria 13\.  
 Attacchi specifici: «Tiro naturale» e «Attacco a distanza» non costituiscono nuove Abilità del catalogo e non attribuiscono automaticamente Armi da lancio. I valori restano associati ai rispettivi attacchi: Avvizzito spinoso, Aghi VA 10; Treant, Roccia VA 13; Elementale dell’Acqua, Dardo d’acqua VA 14; Elementale dell’Aria, Dardo d’aria VA 16\. Nell’app questi valori vanno mantenuti nelle tabelle degli attacchi, eliminando le voci improprie dall’elenco delle Abilità. Non conferiscono competenza con altre armi né specializzazioni aggiuntive.  
 Elementale della Terra: «Prove di FOR 15» è una Prova di Caratteristica, non Atletica. Con FOR 10 il modificatore è \+5 e il valore della prova è 10 \+ 5 \= 15, secondo il Manuale del Giocatore, §1.2.2. Visualizzare «Prova di Forza: 15» separatamente dalle Abilità; il modificatore non va aggiunto una seconda volta.  
 Regola generale: le Abilità effettive adottano i nomi del catalogo; i VA degli attacchi specifici rimangono negli attacchi; le Prove di Caratteristica restano separate. Questa normalizzazione non modifica la potenza delle creature né i valori numerici delle schede.  
 Stato: risposta approvata, da recepire nei manuali e nello sviluppo. La registrazione non attesta l’avvenuto aggiornamento dei manuali o dell’app.

> > #### **A.167 — Ingombri rettangolari e orientamento delle creature**

Approvazione di Davide: 18 ottobre 2026\.  
 Le pedine rispettano larghezza e lunghezza indicate nella scheda, ammettendo ingombri rettangolari e dimensioni superiori a 3 × 3 Q. I formati quadrati della A.126 non sono un elenco esclusivo. Esempi: Corazzato 1 × 2 Q; Regina Comandante 2 × 3 Q; Incubatrice 3 × 5 Q; Madre 3 × 10 Q.  
 Non si arrotonda al quadrato maggiore: una creatura di 3 × 10 Q occupa un rettangolo di 30 Q, non un quadrato di 100 Q. L’app deve permettere anche il posizionamento a 45°. Ingombro, sovrapposizioni e passaggio fra gli ostacoli seguono la sagoma effettivamente ruotata; non basta controllare il centro della pedina.  
 Taglia, spazio occupato e portata degli attacchi sono dati distinti. Non si assegna automaticamente «Grande» soltanto perché la sagoma contiene un’area di 2 × 2 Q: la Taglia deriva dalla scheda. Una pedina più lunga non ottiene automaticamente una maggiore portata.  
 Stato: risposta approvata, da recepire nello sviluppo e nei testi pertinenti; questa registrazione non attesta l’avvenuta implementazione.

> > #### **A.170 — Soglie, Atti e fattori di calcolo dei PX**

Approvazione di Davide: 18 ottobre 2026\.  
 Soglie cumulative dei PX per i livelli 1–20: 1 → 0; 2 → 50; 3 → 110; 4 → 180; 5 → 340; 6 → 520; 7 → 720; 8 → 1.050; 9 → 1.410; 10 → 1.800; 11 → 2.220; 12 → 2.820; 13 → 3.460; 14 → 4.140; 15 → 4.860; 16 → 5.810; 17 → 6.810; 18 → 7.860; 19 → 8.960; 20 → 10.340. Sono totali da raggiungere, non costi da pagare a ogni passaggio.  
 Limiti e premi degli Atti, come impostazioni della nostra campagna modificabili dal Direttore: Atto I, livello massimo 8 e premio 150 PX; II, 12 e 200 PX; III, 15 e 250 PX; IV, 17 e 250 PX; V, 19 e 300 PX; VI, 20 e 300 PX. Il limite blocca il passaggio di livello senza cancellare i PX accumulati. Il premio viene assegnato una sola volta per personaggio beneficiario, su decisione del Direttore.  
 Correttivo dei PX degli incontri per il numero di PG partecipanti: fattore \= max(0,5; 1 \+ 0,1 × (4 − n)), dove n è il numero di PG partecipanti. Esempi: 3 PG ×1,1; 4 PG ×1; 5 PG ×0,9; 6 PG ×0,8; 7 PG ×0,7; 8 PG ×0,6; 9 o più PG ×0,5. Il fattore non equivale a dividere i PX fra i partecipanti.  
 Voti della partita: somma dei tre voti × moltiplicatore del Titolo. Nelle partite lunghe raddoppia soltanto questa componente. Bonus eccezionale: moltiplicato per il Titolo, senza raddoppio per la durata. PX degli incontri e premi degli Atti: senza moltiplicatore del Titolo e senza raddoppio per la durata.  
 Si utilizza il Titolo posseduto all’inizio della partita, con le fasce già corrette e approvate: Principiante 1–3 ×1; Inesperto 4–7 ×2; Esperto 8–11 ×3; Veterano 12–15 ×4; Eroe 16–19 ×5; Leggenda 20+ ×6.  
 Nessun ulteriore fattore per l’equipaggiamento: i PX della scheda del nemico comprendono già la dotazione, che non deve essere conteggiata due volte.  
 Il calcolatore propone un risultato nel tavolo del Direttore. Il Direttore stabilisce e assegna il totale dei PX della partita a ciascun giocatore. Nessun accredito automatico dopo gli scontri.  
 Stato: risposta approvata, da recepire nei testi e nel calcolatore; questa registrazione non attesta l’avvenuto aggiornamento dei manuali o dell’app.

> > ---

> > #### **A.171 — Portata degli attacchi degli Sciami**

Approvazione di Davide: 21 ottobre 2026\.

L’app deve accettare portata 0 Q. Per gli attacchi che richiedono lo spazio condiviso, lo Sciame può colpire soltanto un bersaglio con cui condivide almeno un quadretto occupato. Registrare direttamente portata 0 Q, così che i bersagli soltanto adiacenti non risultino validi per questi attacchi.

> > #### **A.172 — Sagome ruotate, quadretti occupati e portata**

Approvazione di Davide: 21 ottobre 2026\.

Per individuare i quadretti occupati ai fini del combattimento, un quadretto conta quando la sagoma ne copre almeno metà. È accettabile che una sagoma di 3 × 10 Q risulti occupare 28 quadretti dopo la rotazione: le sue dimensioni fisiche restano invariate; cambia soltanto la rappresentazione sulla griglia.

Occupazione dei quadretti e portata: criterio della copertura di almeno metà quadretto. Collisioni con muri, ostacoli e altre pedine: controllo della sagoma geometrica effettiva, comprese le parti che coprono meno di metà quadretto. La rotazione non deve consentire di attraversare un muro con un angolo della pedina.

La portata si misura dal quadretto occupato più favorevole, senza partire dal centro. Restano applicabili linea di visuale, coperture e impedimenti: non si può scegliere un punto d’origine che permetta di colpire attraverso un ostacolo invalicabile.

> > #### **A.173 — Hachimaki, costi delle Tecniche e sintonizzazione**

Approvazione di Davide: 21 ottobre 2026\.

La riduzione di 1 PM si applica sul costo dell’uso scelto, ogni volta che si attiva la Tecnica. I costi positivi hanno minimo 1 PM; una Tecnica gratuita resta gratuita. Costo ordinario → costo con Hachimaki: 0 → 0 PM; 1 → 1 PM; 2 → 1 PM; 4 → 3 PM; 10 → 9 PM.

I quattro usi di Imposizione della Mano Curativa sono alternative: si sceglie l’effetto e si paga il relativo costo ridotto. Non si applicano più riduzioni allo stesso costo. L’app mostra costo base e costo finale.

Precisazione sulla sintonizzazione: l’Hachimaki mantiene SnT 1\. Nei paragrafi generali va esplicitato che la regola SnT 0 per gli artefatti esclusivamente passivi è soggetta alla maggiorazione prevista per i benefici sui PM. L’Hachimaki applica quindi 0 di base \+ 1 per la riduzione del costo in PM. Recepire la precisazione nei paragrafi generali Armamenti §7.10 e Magia §24.2, coerentemente con le schede specifiche Equipaggiamento §10.10 e Magia §28.1.

> > ---

> > #### **A.174 — Meditazione e ricarica del cristallo**

Approvazione di Davide: 23 ottobre 2026\.

È ammesso un comando unico, purché rispetti la sequenza delle due operazioni: il personaggio spende PM già disponibili per ricaricare il cristallo, poi medita per recuperarli. Devono essere applicati tutti i requisiti, rapporti di conversione, tempi, limiti e prove previsti per i due passaggi.

Il recupero dipende dall’esito effettivo della Meditazione; un’interruzione non annulla una ricarica già completata. Il comando dovrebbe chiamarsi «Ricarica e medita» e mostrare PM spesi, carica ottenuta e PM effettivamente recuperati. Non deve consentire di spendere anticipatamente PM che il personaggio deve ancora recuperare.

> > #### **A.175 — Guanti da Combattimento Mistico**

Approvazione di Davide: 23 ottobre 2026\.

Confermata la gestione come proprietà attiva dell’oggetto, con pulsante «Attiva», senza necessità di associare un Incantesimo del catalogo. Secondo il Manuale dell’Equipaggiamento, §10.6: 3 PM dalle cariche interne, 1 AzP, durata 5 Round; i pugni diventano Magici e ottengono \+1 al danno. L’attivazione richiede sintonizzazione, è automatica e non richiede Concentrazione.

Restano validi tutti i limiti della scheda, compresa l’impossibilità di pagare questa attivazione con PM personali o Batterie esterne.

> > #### **A.176 — Incantesimi aggiunti manualmente**

Approvazione di Davide: 23 ottobre 2026\.

Distinguere apprendimento effettivo e semplice annotazione. Un Incantesimo aggiunto dal Direttore come realmente appreso conta come conosciuto, anche per prerequisiti, creazione di consumabili e insegnamento. Per queste attività restano necessari tutti gli altri requisiti: conoscerlo, da solo, non basta.

Il ritrovamento di una pergamena, di un testo o di un Artefatto non equivale automaticamente ad apprenderlo. L’aggiunta non concede da sola accesso alla magia, Abilità o PM. Il personaggio usa le normali regole del proprio accesso magico; se ne è privo, l’Incantesimo resta annotato e non lanciabile.

Un’eventuale concessione speciale del Direttore deve indicare espressamente modalità di lancio, Abilità, fonte dei PM e limiti.

> > #### **A.177 — Modifiche dal tablet dopo la partita**

Approvazione di Davide: 23 ottobre 2026\.

Confermata la procedura proposta: le modifiche possono essere inviate anche dopo la fine della sessione e diventano effettive soltanto dopo l’approvazione del Direttore.

Ogni operazione deve mostrare quando è stata effettuata e quando è stata ricevuta. Se nel frattempo il dato è cambiato, l’app segnala il conflitto al Direttore prima di applicarla. La disconnessione non deve far perdere le richieste.

> > #### **A.178 — Recepimento del Manuale del Giocatore v0.49**

Approvazione di Davide: 23 ottobre 2026\.

Confermato il recepimento completo della v0.49 per le Tecniche Interiori e i relativi raccordi: è l’aggiornamento approvato dopo il controllo di equilibrio.

Imposizione della Mano Curativa: costi 1/2/2/4 PM, quindi 1/1/1/3 PM con Hachimaki. Aura di Resistenza: \+2 AR. Meditazione Profonda: recuperi e limiti specifici della nuova scheda, distinta dalla Meditazione ordinaria.

La regola della A.173 rimane valida; i suoi esempi numerici vanno aggiornati ai nuovi costi. L’app deve recepire anche tempi, durate, limiti e condizioni delle schede, oltre ai valori numerici.

> > #### **Esiti dei test di Davide per Marcello — 24 ottobre 2026**

Segnalazioni e richieste di correzione comunicate da Davide. I riferimenti «Test 4», «Test 6» e «Test 7» seguono la numerazione dell’elenco completo usato da Davide, non quella dell’elenco sintetico della sezione 8\. Le osservazioni seguenti sono esiti riferiti da Davide; la loro registrazione non attesta una correzione già effettuata nell’app.

> > #### **Avvisi NTFY — configurazione persa dopo gli aggiornamenti**

Problema riscontrato: ogni volta che aggiorna il sistema, Davide deve reimpostare gli avvisi NTFY. Richiesta: conservare la configurazione degli avvisi fra gli aggiornamenti, senza richiederne ogni volta la reimpostazione.

> > #### **Test 4 — avviso di aggiornamento e scelta di scartare la modifica**

Sia sul tablet sia nella schermata della modifica del master compare un avviso verde che, in entrambi i casi, riporta «il master aggiornato la tua scheda». Non compare la scritta «scartare la propria modifica» prevista dalla prova. Verificare la gestione del conflitto e la disponibilità della scelta di scartare la propria modifica; l’avviso verde da solo non permette di completare il test previsto.

> > #### **Test 6 — note multiple, coda in attesa e Rientro dei tablet**

Per una sola modifica alle note del personaggio sono comparse tre modifiche distinte: la prima «NO», la seconda «NOT», la terza «NOTE». Il risultato atteso è una sola richiesta per la modifica completata, evitando richieste separate per questi testi intermedi.

Nella schermata del master non compare il pulsante «Rientro dei tablet». Sul tablet compare invece «Vedi la coda»: aprendolo, i distintivi risultano ancora in attesa di approvazione, così come le due note sbagliate. Verificare l’accesso del Direttore alle richieste pendenti e le azioni di approvazione/scarto, in modo che possa gestire anche le richieste già accumulate.

> > #### **Test 7 — pannello PX: salvataggio, incontri, premi e permessi**

Problema riscontrato: il pannello PX perde in modo intermittente i dati inseriti. Succede associando giocatori e PG e scrivendo il nome della partita e degli incontri. Per tentare di salvarli occorre scrivere in «Impostazioni», passare a «Riepilogo» e talvolta tornare in «Impostazioni» a riscrivere. Davide è ora riuscito a registrare tutti i giocatori e i personaggi: conservare questi dati durante la correzione. Il salvataggio deve essere affidabile, senza richiedere il cambio di schermata come espediente.

Voti iniziali: impostare di default il voto base 3 per tutte e tre le categorie, lasciando al Direttore la possibilità di modificarli.

PX degli incontri: Davide non trova la possibilità di inserire i Punti Esperienza degli incontri. Rendere disponibile e individuabile l’inserimento dei PX degli incontri nel pannello, così da poter completare il calcolo della partita.

Premio di fine Atto: deve poter essere assegnato anche ai personaggi dei giocatori assenti. Il diritto al premio non dipende dalla presenza nella singola partita; gestire l’assegnazione a livello di Atto, mantenendo traccia di chi lo ha già ricevuto. Questa precisazione integra A.170 e supera il vincolo della presenza nella partita per questa componente del premio.

Passaggio di livello: l’app non lo segnala quando i PX assegnati fanno raggiungere la soglia. Aggiungere un avviso di passaggio di livello al raggiungimento dei requisiti applicabili.

Permessi sui PX: i giocatori non devono poter modificare i PX. Assegnazione e correzione, inclusi i PX iniziali, sono riservate al Direttore; far rispettare il vincolo anche quando una modifica arriva da un tablet o dalla relativa coda.

> > #### **A.179 — AR delle Tecniche e sostituzione dei valori della A.48**

Approvazione di Davide: 25 ottobre 2026\.

Confermato: il Manuale del Giocatore v0.49 sostituisce i precedenti valori della A.48. Aura di Resistenza concede \+2 AR magica e dura 5 Round; Pelle di Rinoceronte concede \+1 AR non magica contro attacchi Ravvicinati Naturali o Magici e dura 5 Round.

Precisazione sui cumuli: Aura di Resistenza \+ Pelle di Rinoceronte concedono complessivamente \+3 contro il Ravvicinato Naturale o Magico, \+2 contro gli altri danni Naturali o Magici e \+2 contro l’Etereo. Aggiungendo anche Corazza Potenziata, i totali diventano rispettivamente \+4, \+3 e \+3. I totali \+4/+3/+3 comprendono dunque tutte e tre le protezioni, non soltanto Aura e Pelle.

Questi sono contributi aggiuntivi alle altre protezioni compatibili. La precedente decisione resta nello storico, con indicazione che questi numeri sono stati sostituiti.

> > #### **A.180 — Scheda del tablet e modifiche in attesa**

Approvazione di Davide: 25 ottobre 2026\.

La scheda principale deve mostrare i valori approvati dal Direttore. Le modifiche non ancora approvate devono restare visibili nella coda, con valore precedente, valore proposto e dicitura «In attesa di approvazione».

Il giocatore può ritirare una propria richiesta finché è ancora pendente. Il ritiro deve risultare anche al Direttore e non deve modificare la scheda approvata. Dopo l’approvazione, un eventuale ripensamento costituisce una nuova richiesta.

> > #### **A.181 — Adozione della nuova progressione di Talenti, Maestrie e Specializzazioni**

Approvazione di Davide: 25 ottobre 2026\. Decorrenza: partita di lunedì 26 ottobre 2026\.

Confermata l’adozione della versione 1.0 del documento sulla nuova progressione. Talenti Liberi ai livelli 3, 5, 7, 9, 11, 13, 15, 17 e 19; Maestrie ai livelli 2, 6, 10, 14 e 18; Specializzazioni ai livelli 1, 4, 8, 12, 16 e 20\.

I Talenti di Classe mantengono la propria progressione separata. Al livello 6 spettano 2 Talenti Liberi, 2 Maestrie e 2 Specializzazioni, oltre ai Talenti di Classe.

Il documento prevale per la riorganizzazione che introduce; le schede non riscritte seguono i manuali aggiornati. Si applica inoltre la correzione della A.182.

> > #### **A.182 — Ricarica Esperta e quantità di cartucce**

Approvazione di Davide: 25 ottobre 2026\.

Mantenere la decisione più recente della A.135: senza Maestria, 2 cartucce per AzP nelle armi caricate direttamente; con Ricarica Esperta, fino a 4 cartucce per operazione. Anche l’unica operazione gratuita concessa dalla Maestria in ciascun Round permette di inserirne fino a 4\.

La dicitura «fino a tre» del documento va corretta. Restano i limiti di capacità dell’arma; questi numeri non si applicano alla sostituzione di un caricatore amovibile.

> > #### **A.183 — Conversione dei personaggi esistenti**

Approvazione di Davide: 25 ottobre 2026\.

Le scelte devono rispettare l’ordine dei livelli e i prerequisiti posseduti al momento dell’acquisizione. Per esempio, Dimitri può scegliere Ritualista Minore al 3° e Ritualista Maggiore come Maestria del 6°, ma non del 2°.

La Specializzazione iniziale proviene dall’elenco della prima Classe; quella del 4° dall’elenco della Classe aumentata al Grado II. Si applicano le eccezioni di accesso già previste.

La conversione sostituisce le vecchie scelte e non vi si somma. Conservare copia e riepilogo delle scelte precedenti; completare la nuova distribuzione con il giocatore prima di rendere definitiva la scheda convertita.

> > #### **A.184 — Incantesimi e Tecniche collegati ai Talenti nella conversione**

Approvazione di Davide: 25 ottobre 2026\.

Se viene ripreso lo stesso Talento, si conservano le scelte già effettuate, entro le quote consentite.

Se il Talento non viene ripreso, cessano le capacità e le quote che dipendevano esclusivamente da esso. Le vecchie scelte restano nello storico, senza effetti attivi. Quanto ottenuto da fonti indipendenti resta valido.

Un diverso Talento concede soltanto quanto previsto dalla propria scheda. Le eventuali nuove scelte vengono effettuate nelle sue quote, senza duplicare quelle precedenti. Eventuali cambi delle scelte conservate richiedono l’approvazione del Direttore.

> > #### **A.185 — Specializzazione del primo livello nella creazione**

Approvazione di Davide: 25 ottobre 2026\.

La Specializzazione si sceglie dopo aver definito la Classe iniziale, prima di completare i valori finali della scheda e la dotazione.

Per le Classi taumaturgiche indicate nel documento sono già disponibili le nove Specializzazioni di Potere: sono nove alternative fra cui scegliere, non nove Specializzazioni assegnate automaticamente. Anche il Taumaturgo riceve una sola scelta iniziale.

Per Usufruitore di Magia e Ritualista, gli ampliamenti dell’elenco diventano disponibili quando il relativo requisito è effettivamente posseduto.

*27/10: tutte le risposte del 23/10 e del 25/10 sono state lette e recepite; l’unica cosa nuova da decidere è l’A.188.*

> > ---

> > #### **A.187 — Passaggio di livello vincolato ai PX e autorizzazione del Direttore**

Approvazione di Davide con precisazione vincolante: 28 ottobre 2026\.

I giocatori non possono aumentare autonomamente il livello prima di aver maturato i PX necessari. Il pulsante «Sali di livello» / «Aumenta di livello» si abilita per il giocatore soltanto quando i PX effettivamente assegnati dal Direttore raggiungono la soglia cumulativa del livello successivo, nel rispetto degli altri limiti applicabili, compresi quelli dell’Atto. Un totale soltanto suggerito o non ancora assegnato non abilita il passaggio. Esempio: 600 PX non consentono il passaggio dal 6° al 7°; occorrono almeno 720 PX secondo la tabella approvata.

Con PX insufficienti il pulsante resta bloccato; il divieto deve essere effettivo anche per le operazioni provenienti da tablet, salvataggi o richieste inviate al server, non soltanto un avviso grafico. I PX rimangono modificabili esclusivamente dal Direttore.

Un passaggio di livello prematuro può essere deciso e autorizzato soltanto dal Direttore, mediante una propria funzione riservata, con registrazione della concessione. L’eccezione non deve essere disponibile al giocatore e non comporta un aumento automatico dei PX per giustificare il livello.

Per discrepanze già esistenti fra livello e PX, l’app segnala il problema e lascia la decisione al Direttore, senza modificare automaticamente livello o PX. Se il livello è stato assegnato anticipatamente per errore, il Direttore può usare «Annulla l’ultimo livello», dopo aver verificato le scelte da rimuovere. Se è una concessione intenzionale può mantenerlo registrandone il motivo. I PX si correggono soltanto se il loro totale era effettivamente sbagliato.

> > #### **A.188 — Modifica autonoma degli incantesimi conservati dopo la conversione**

Approvazione di Davide: 28 ottobre 2026\.

Confermata la libertà concessa al tavolo: il giocatore può cambiare autonomamente anche gli incantesimi conservati dopo la conversione, senza approvazione preventiva del Direttore. Restano applicabili quote, famiglie accessibili, livello massimo e requisiti. Le sostituzioni devono essere registrate nello storico, così da poter ricostruire eventuali errori.

Questa disposizione sostituisce il requisito di approvazione della A.184 per gli incantesimi. Per cambiare le Tecniche Interiori conservate resta la procedura già approvata, finché non viene espressamente estesa anche a loro questa libertà.

> > #### **A.189 — Trasformatore e trasferimento dell’energia**

30/10/2026 — Risposta approvata da Davide.

La precedente regola «niente travaso» è superata limitatamente ai trasferimenti effettuati con trasformatori e impianti compatibili.

Il trasformatore personale utilizza un CEC dello stesso colore: preleva una carica CEC, pari a 10 UE, e carica un tampone da 100 cariche NEC. Può prelevarla soltanto se nel tampone c’è spazio per contenerla interamente. L’energia residua rimane disponibile anche dopo lo scollegamento; il colore non cambia. Il modello multicromatico ha tamponi separati per colore.

La velocità complessiva è una carica NEC all’ora per il trasformatore personale oppure una ogni dieci minuti per quello industriale. Collegare più dispositivi allo stesso apparecchio non moltiplica la velocità.

Restano esclusi trasferimenti mediante semplici cavi, conversioni dai PM personali e ricariche ottenute dalla sola vicinanza a una Matrice.

> > #### **A.190 — Pacco del Gehemmapuker**

30/10/2026 — Risposta approvata da Davide.

Confermo che il pacco Rosso sostituisce il precedente Modulo Blu.

È composto da cinque NEC Rossi da 10 cariche, utilizzati in successione, con un unico contatore da 50 attacchi. Ogni attacco consuma una carica anche se manca il bersaglio; l’AC 1d3 non moltiplica il consumo.

Il pacco pesa 750 g, costa 2.000 cr pieno e richiede 500 cr per una ricarica completa commerciale. La sostituzione dell’intero pacco pronto richiede 1 AzP, entrambe le mani e nessuna prova. La ricarica completa richiede 50 ore con trasformatore personale oppure 8 ore e 20 minuti con quello industriale.

> > #### **A.191 — Alimentazione e ricarica degli IAS**

30/10/2026 — Risposta approvata da Davide.

Ogni IAS utilizza due NEC Blu da 10 cariche, consumati in successione, con un unico contatore da 20 cariche. Il passaggio al secondo NEC è automatico.

Il pacco pesa 300 g; un ricambio pieno costa 800 cr. Il prezzo dell’IAS completo comprende il primo pacco pieno.

La ricarica commerciale costa 10 cr per carica ripristinata, quindi 200 cr da vuoto. Richiede 20 ore con trasformatore personale oppure 3 ore e 20 minuti con quello industriale. La sostituzione del pacco pronto richiede 1 AzP, con dispositivo fermo e accessibile.

> > #### **A.192 — Autonomia e riserve dello Scout**

30/10/2026 — Risposta approvata da Davide.

Lo Scout ha 750 km di autonomia nominale, alimentati da un MEC Rosso da 10 cariche, ciascuna corrispondente a 75 km. I tragitti brevi si sommano e l’arrotondamento del consumo si applica una sola volta alla chiusura del viaggio o della giornata.

I servizi utilizzano un CEC Verde da 10 cariche. Il supporto vitale consuma una carica per ogni giorno nel quale viene utilizzato: più attivazioni nello stesso giorno non consumano ulteriori cariche. Nei giorni senza utilizzo non consuma.

L’aria è una riserva distinta: 24 ore effettive, anche non consecutive, per otto occupanti. Ricaricare l’energia non ripristina l’aria. L’elettronica ordinaria di bordo non aggiunge consumi separati.

La ricarica completa delle due riserve costa 400 cr e richiede due ore con postazioni indipendenti compatibili, oppure tre ore con ricariche eseguite in successione. Numero e formato delle bombole restano da definire.

> > #### **A.193 — Conversione delle riserve già salvate in Lx**

30/10/2026 — Risposta approvata da Davide.

Confermo la conservazione della frazione di riserva residua, senza introdurre un’equivalenza universale fra Lx e UE.

Per esempio, una cella a metà diventa metà della capacità prevista dal nuovo profilo. Per lo Scout si considera complessivamente la vecchia riserva di propulsione: se era al 50%, il nuovo MEC Rosso avrà cinque cariche su dieci.

La conversione deve conservare il valore originale e registrare il risultato, senza arrotondare per eccesso né ripetersi alle successive aperture. Le eventuali frazioni si conservano internamente.

Quando non è possibile identificare con certezza il nuovo profilo, la riserva rimane «da convertire» fino alla verifica del Direttore. Per l’elettronica ordinaria resta eliminato il contatore.

> > #### **A.195 — Taglia e disponibilità del Punisher Wächter**

30/10/2026 — Risposta approvata da Davide.

Il manuale aggiornato chiarisce che «Medio» e «Grande» indicano la stessa categoria di scudo. Nell’app utilizziamo Medio, coerentemente con il catalogo, eventualmente mostrando «Medio, detto anche Grande». Non sono due varianti acquistabili.

Il Wächter mantiene AR \+2, FOR 5, 8 PI, Qualità Rara e PS Integrità 14\.

Prezzo e Reperibilità sono ora definiti: 12.000 cr, Molto rara, compresi generatore e primo NEC Blu da tre cariche pieno. La conversione di un Punisher compatibile già posseduto costa 6.000 cr, compresi montaggio e primo NEC pieno. Può quindi essere inserito nel catalogo acquistabile.

> > #### **A.196 — Gestione della Neverlost nell’app**

30/10/2026 — Risposta approvata da Davide.

Sì, integriamo la Neverlost nella scheda dei veicoli e nella plancia, applicando il profilo aggiornato del Manuale dei Veicoli.

Il combattimento utilizza i Q Tattici, con ingombro convenzionale 3 × 2\. La planimetria interna resta distinta dalla rappresentazione della nave negli scontri.

La scheda deve gestire Integrità di Corpo, Propulsione e Motore, scudo energetico, armi, munizioni, postazioni ed equipaggio. Le riserve energetiche sono:

Rossa: 10 BEC, 100 cariche complessive;

Blu: 1 BEC, 10 cariche;

Verde: 3 MEC, 30 cariche complessive.

I cristalli, i PM e le funzioni tecnomistiche restano risorse e capacità separate. Le capacità massime del profilo non devono riempire automaticamente le riserve effettive della campagna.

Il viaggio in Traiettoria si misura in giorni, senza conversione in chilometri.

> > #### **A.197 — Doppia assegnazione del premio di fine Atto**

30/10/2026 — Risposta approvata da Davide.

Adottiamo il blocco della seconda assegnazione dello stesso premio allo stesso personaggio nella stessa campagna e nello stesso Atto. Il controllo deve funzionare anche tentando l’assegnazione da una partita diversa.

Il premio di fine Atto spetta anche ai personaggi assenti e rimane indipendente dalla partecipazione alla singola partita.

Il Direttore può correggere un’assegnazione sbagliata mediante una rettifica tracciata, indicando il motivo. Un eventuale premio aggiuntivo deciso dal Direttore va registrato separatamente, senza duplicare il premio di fine Atto.

> > #### **A.198 — Ingombro delle creature sulla mappa**

30/10/2026 — Risposta approvata da Davide.

Estendiamo il limite delle sagome a 20 quadretti per lato, così da comprendere anche i draghi antichi da 16 × 10 Q Base.

Nelle mappe in Q Base, la sagoma deve rispettare l’ingombro indicato nel profilo: il Dragomedusa adulto occupa quindi 14 × 10\. Per questi ingombri utilizziamo sagome rettangolari, orientabili anche a 45°, mantenendo coerenti movimento, distanze e spazio occupato.

Nelle mappe in Q Tattici utilizziamo invece le pedine convenzionali del manuale: 1 × 1 per il Dragomedusa giovane e 2 × 1 per l’adulto. La scala della mappa deve essere esplicita; queste sagome non modificano le dimensioni effettive della creatura nei passaggi stretti.

> > #### **A.199 — Calcolo dei danni con moltiplicatore**

30/10/2026 — Risposta approvata da Davide.

Sì, l’app deve calcolare automaticamente anche i danni con moltiplicatore, mantenendo visibili formula, risultati dei dadi e totale.

Per esempio, 4d10 × 5 significa tirare quattro d10, sommarli e moltiplicare il risultato per cinque. Difese, riduzioni e Armatura si applicano successivamente, secondo le regole dell’attacco.

Il supporto deve valere per tutti i profili che utilizzano queste formule, comprese creature e armi navali.

Per il Dragomedusa vanno recepiti i valori aggiornati del Bestiario v0.64: Soffio giovane 8d10 × 5 Magici; adulto 12d10 × 5 Magici.

> > #### **A.200 — Iniziativa dei PNG umani**

30/10/2026 — Risposta approvata da Davide.

Confermo 0 come minimo del bonus base di Iniziativa anche per i PNG umani, compresi i tre Inquisitori. Un valore base 0 significa tirare soltanto il d10.

Occorre però distinguere il bonus base dai modificatori: Ferite, condizioni e altri effetti continuano ad applicare le proprie penalità. Il minimo 0 non deve cancellarle né impedire che il modificatore complessivo diventi negativo.

Restano valide le sequenze speciali espressamente previste, come agire dopo l’evocatore.

> > #### **A.201 — Nomi dei draghi metallici**

30/10/2026 — Risposta approvata da Davide.

Uniformiamo tutti gli stadi alle denominazioni:

Drago d’ottone

Drago di rame

Drago di bronzo

Drago d’argento

Drago d’oro

Manteniamo nella ricerca anche le forme precedenti come alias, senza duplicare le creature nel catalogo.

> > #### **A.202 — Movimento della Murena della Roccia cucciolo**

30/10/2026 — Risposta approvata da Davide.

Il valore 6 / 12 / 18 Q Base indica esclusivamente Passo, Corsa e Scatto nella sua forma eterea, compreso l’attraversamento della roccia. Non assegniamo un movimento terrestre separato.

Durante l’overdose il cucciolo diventa corporeo, il movimento si interrompe e non può muoversi volontariamente, attaccare, attraversare la roccia o Schivare fino al termine previsto. Successivamente torna etereo.

L’app deve distinguere queste condizioni, evitando di presentare 6 / 12 / 18 come movimento terrestre sempre disponibile.

> > #### **A.203 — Ingombro della Madre delle Murene**

30/10/2026 — Risposta approvata da Davide.

Gestiamo entrambe le configurazioni, selezionabili dal Direttore:

Parzialmente emersa: sagoma 2 × 2 Q Base.

Completamente emersa: sagoma 6 × 2 Q Base.

Nella configurazione parziale resta disponibile la nota sull’estensione fino a 4 Q mantenendo parte del corpo nella roccia. La posizione effettiva della testa determina l’origine degli attacchi, del soffio e delle altre capacità pertinenti.

Il cambio di configurazione deve conservare PV, PM, Ferite, Stati e Azioni già spese: rimane la stessa creatura.

> > #### **A.204 — Ordine delle dimensioni dei draghi**

30/10/2026 — Risposta approvata da Davide.

Nel manuale le dimensioni del corpo disteso sono espresse come lunghezza × larghezza.

L’app deve assegnare i valori ai campi corretti:

Giovane: lunghezza 6 Q Base; larghezza 4 Q Base.

Adulto: lunghezza 10 Q Base; larghezza 6 Q Base.

Antico: lunghezza 16 Q Base; larghezza 10 Q Base.

Se l’interfaccia mostra «larghezza × lunghezza», visualizzerà rispettivamente 4 × 6, 6 × 10 e 10 × 16\.

L’orientamento della sagoma segue la direzione della creatura, comprese le rotazioni a 45°. Le dimensioni corporee e la pedina convenzionale in Q Tattici restano dati distinti.

> > #### **A.205 — Diplomazia e Oratoria**

30/10/2026 — Risposta approvata da Davide.

Confermo la correzione già stabilita: «Diplomazia» va sostituita con Oratoria, mantenendo i valori indicati.

La Driade ha Oratoria 13 e il Marinide Oratoria 10\. Anche i richiami a prove di Diplomazia nelle descrizioni delle capacità vanno uniformati a Oratoria.

> > #### **A.207 — Natura del danno e AC delle armi**

30/10/2026 — Risposta approvata da Davide.

Per gli attacchi con armi ordinarie di umani e umanoidi confermo come regola generale danni Naturali e AC 1 per singolo colpo, salvo diversa indicazione espressa del profilo.

Taglio, Perforazione e Contusione dipendono dall’arma utilizzata. Eventuali componenti Magiche, Eteree o elementali richiedono una proprietà o capacità dichiarata.

Il «Danno completo» comprende già i bonus ordinari previsti dalla scheda: non bisogna aggiungere nuovamente Caratteristica o Specializzazione. Restano applicabili i modificatori ulteriori previsti, come EQ nei modelli PNG generici.

AC 1 non limita il numero complessivo di attacchi del Round: eventuali attacchi multipli seguono Azioni, costi e limiti specifici del profilo.

> > #### **A.206 — Parata a Mani Nude del Lottatore: regola modificata**

30/10/2026 — Risposta approvata da Davide.

Decisione approvata il 30/10/2026. La Parata a Mani Nude è inclusa nell’Addestramento al Combattimento Senz’Armi del I Grado del Lottatore, indipendentemente dalla Disciplina scelta. Non richiede una scelta di Talento separata.

Con almeno una mano libera e la possibilità fisica di intervenire sul colpo, il Lottatore può parare attacchi ravvicinati senza impugnare armi o scudi. Si applicano costi, effetti e limiti ordinari: 1 AzP disponibile, utilizzabile anche fuori Iniziativa; successo dimezza per eccesso il danno prima dell’Armatura; Magistrale annulla il danno. Restano esclusi attacchi a distanza, Aree e attacchi normalmente imparabili. Parata Istintiva consente la normale Parata gratuita anche a mani nude, nel medesimo limite di una per Round. Nessun costo in PM.

Il precedente Talento a scelta è sostituito da «Parata a Mani Nude Migliorata»: \+2 VA alle Prove di Difese effettuate per Parare a mani nude. Il bonus si somma alla Disciplina Guardia quando applicabile. Non modifica Schivata, Elusione, Parate con armi o scudi, costi o altri effetti della Parata. Le scelte già presenti del vecchio Talento vanno ricondotte al nuovo Talento migliorato.

Il Manuale del Giocatore condiviso, §3.5.5 e riepilogo dei Talenti del Lottatore, è stato aggiornato in questa sessione.

Da recepire nel modello PNG generico del Bestiario: il Lottatore di I Grado può Parare a mani nude a VA 12 con EQ Comune; al II Grado la scelta già prevista diventa Parata a Mani Nude Migliorata. I VA di Parata a mani nude pronti per i Gradi I–VI sono quindi 12 / 17 / 20 / 22 / 25 / 27, con Guardia e il \+2 già inclusi dove acquisiti. Aggiungere EQ una sola volta. La Schivata rimane 12 / 15 / 18 / 20 / 23 / 25\. Il \+2 non va applicato alle Parate effettuate con il bastone.

Questa decisione sostituisce la precedente proposta A.206 rimasta non approvata; la registrazione della risposta non attesta l’implementazione nell’app.

> > #### **A.208 — Iniziativa degli Elementali maggiori**

30/10/2026 — Risposta approvata da Davide.

Con un evocatore, l’Elementale agisce immediatamente dopo di lui, secondo la propria regola specifica.

Quando viene utilizzato come creatura autonoma, senza evocatore, confermo 1d10 con bonus base 0\. Restano applicabili i modificatori di condizioni ed effetti pertinenti.

L’app deve distinguere le due modalità: «dopo l’evocatore» e «Iniziativa autonoma».

> > #### **A.209 — Parata e Schivata dei modelli PNG**

30/10/2026 — Risposta approvata da Davide.

La scheda deve conservare e utilizzare entrambi i valori, mostrando separatamente Parata e Schivata. Prendere sempre la Parata come valore unico può produrre risultati sbagliati.

Ogni azione difensiva deve usare il proprio valore, con i requisiti e i modificatori pertinenti. L’Elusione continua a utilizzare Riflessi.

Per il Lottatore, il \+2 di Parata a Mani Nude Migliorata si applica esclusivamente quando para senza armi: non aumenta Schivata né Parata con il bastone. I bonus già compresi nei valori pronti non vanno aggiunti nuovamente.

Un trattino indica una Difesa indisponibile nella configurazione descritta, non un valore numerico pari a zero.

> > #### **A.210 — PX dei modelli PNG senza GS**

30/10/2026 — Risposta approvata da Davide.

Sì, prevediamo un campo numerico PX utilizzabile anche senza GS. Il valore deve essere visibile nella scheda e disponibile al calcolatore degli incontri.

Per i modelli PNG si utilizzano i PX pronti della combinazione Classe, Grado ed EQ. Questi valori comprendono già EQ: non si applica un secondo moltiplicatore della dotazione.

Quando il GS non è assegnato, mostriamo «GS non assegnato», mantenendo disponibili i PX. Non ricaviamo automaticamente il GS dal Grado di Classe.

Il calcolatore produce una proposta: l’assegnazione effettiva dei PX rimane una decisione del Direttore a fine partita.

> > #### **A.211 — Chi può dichiarare appreso un incantesimo aggiunto a mano**

30/10/2026 — Risposta approvata da Davide.

Per gli incantesimi aggiunti manualmente fuori dalle normali quote, solo il Direttore può confermare lo stato «appreso».

Il giocatore può aggiungere un’annotazione e richiedere la conferma dell’apprendimento. Fino alla conferma, l’annotazione non concede nuove possibilità di lancio né vale come conoscenza per prerequisiti, creazione di Consumabili o insegnamento.

Restano validi gli altri requisiti: accesso alla magia, Abilità e PM non vengono concessi automaticamente.

Le normali scelte e sostituzioni degli incantesimi entro le quote continuano a seguire l’autonomia già approvata con A.188.

> > #### **A.212 — Calcolo delle concessioni speciali**

30/10/2026 — Risposta approvata da Davide.

La concessione resta descritta in una nota, ma l’app deve permettere al Direttore di indicare separatamente i parametri necessari: Abilità e VA di lancio, costo e fonte dei PM, eventuali limiti di utilizzo.

Il pulsante «Lancia\!» deve utilizzare questi parametri quando la concessione è attiva.

Se una concessione non è gestibile automaticamente, deve essere indicata come «gestione manuale del Direttore». In questo caso il normale lancio automatico va disabilitato per quella concessione, evitando di applicare Abilità o costi diversi da quelli autorizzati. Il Direttore risolve il lancio e registra le risorse spese.

> > #### **A.213 — Incantesimi già aggiunti prima della distinzione**

30/10/2026 — Risposta approvata da Davide.

Confermo la gestione provvisoria: restano «da classificare», conservando le possibilità di lancio già disponibili, finché il Direttore non li verifica.

Non vengono considerati automaticamente appresi per creazione di Consumabili, prerequisiti o insegnamento. La migrazione non deve cancellarli né attribuire nuove capacità.

Il Direttore può classificarli come «appreso» o «solo annotato», oppure definire una concessione speciale. Dopo la classificazione si applicano le regole corrispondenti e la decisione viene registrata nello storico.

> > #### **A.215 — Celle energetiche e caricatori rimovibili: ricarica e riempimento**

30/10/2026 — Risposta approvata da Davide.

Precisazione approvata da Davide il 30/10/2026. La cella energetica può essere ricaricata soltanto dopo essere stata tolta dall’arma. Anche i caricatori devono poter essere tolti dall’arma, riempiti e poi reinseriti, conservando il contenuto residuo.

L’app deve distinguere l’arma, il caricatore o la cella inseriti, i caricatori e le celle di scorta e le munizioni sciolte. Rimuovere un caricatore non ne cancella il contenuto: esso rimane nell’inventario con i colpi rimasti e può essere riempito fino alla propria capacità usando munizioni compatibili realmente disponibili. La cella tolta conserva analogamente le cariche residue e può essere ricaricata con un trasformatore compatibile, rispettando capacità, tempi e disponibilità energetica. Il comando di ricarica energetica non è disponibile mentre la cella è inserita nell’arma.

Esempio Axis: il PG ha un solo caricatore da 15 colpi e 30 colpi sciolti. Dopo aver sparato 7 colpi, nel caricatore rimangono 8 colpi. Prima dello scontro successivo può estrarre quel medesimo caricatore, aggiungere 7 colpi dalla riserva e reinserirlo. Risultato: caricatore 15/15, riserva 23 colpi sciolti, sempre un solo caricatore. Non è necessario possedere un secondo caricatore, né consumare o eliminare gli 8 colpi già presenti.

Fuori dal combattimento, con tempo e condizioni adatti, l’app deve permettere di riempire il caricatore parzialmente usato con un’unica operazione di interfaccia, mostrando quanti colpi vengono trasferiti e l’eventuale tempo necessario. Il tempo di preparazione trascorre prima del nuovo scontro; non vengono addebitate Azioni al combattimento successivo. Questo non rende istantaneo il riempimento.

Durante il combattimento rimangono i costi e i limiti di estrazione, riempimento e inserimento previsti dalle regole e dalle capacità del personaggio. La possibilità di riempimento completo fuori combattimento non aumenta il numero di colpi caricabili con una singola operazione in combattimento.

Le scorte devono conservare formato, compatibilità e quantità residua, distinguendo caricatori o celle pieni, parzialmente pieni e vuoti. Quelli identici possono essere raggruppati. Restano i profili specifici dei pacchi composti. Questa risposta sostituisce la precedente proposta A.215 che consentiva la ricarica della cella inserita nell’arma.

> > #### **A.217 — Conversione dei vecchi Banchi e Moduli**

30/10/2026 — Risposta approvata da Davide.

Prima si identifica il profilo aggiornato dell’oggetto o del dispositivo; poi si conserva la frazione residua secondo A.193.

Per esempio, la propulsione dello Scout va convertita nel nuovo MEC Rosso previsto dalla sua scheda, considerando complessivamente la vecchia riserva.

Per un vecchio Banco generico da 100 UE, privo di un diverso profilo di destinazione, va bene la conversione in CEC dello stesso colore, conservando la frazione residua.

Un vecchio Modulo da 10 UE senza corrispondenza definita resta «da convertire». Non va trasformato automaticamente in una nuova CEC né aggiunto a una CEC esistente. Il valore originale rimane conservato per la verifica del Direttore.

La conversione si applica una sola volta e viene registrata.

> > #### **A.218 — Riferimento al Bestiario v0.64**

30/10/2026 — Risposta approvata da Davide.

La v0.64 esiste: è un file di lavoro distinto che è stato consultato per preparare le risposte, ma non risulta nella cartella Drive condivisa. Non è un’inversione delle cifre della v0.46.

Per A.199 possiamo citare direttamente il Manuale dei Mostri v0.46 condiviso, §7.12, che contiene già i valori confermati:

Soffio del Dragomedusa giovane: 8d10 × 5 Magici;

Soffio del Dragomedusa adulto: 12d10 × 5 Magici.

Per questi valori non occorre attendere un altro file. Le successive correzioni esplicitamente approvate, compresa quella del Lottatore, restano valide e prevalgono sul testo precedente.

> > #### **A.219 — Chiusura della giornata e consumi dei mezzi**

30/10/2026 — Risposta approvata da Davide.

Confermo il comando manuale del Direttore «Chiudi viaggio/giornata», utilizzabile anche senza Calendario.

Il comando riepiloga quanto accumulato, mostra il consumo e applica l’arrotondamento previsto una sola volta. Una chiusura già registrata non deve addebitare nuovamente gli stessi consumi.

Il Calendario di gioco può proporre la chiusura al cambio di giornata, mantenendo un’unica registrazione. La data reale del computer non determina i consumi.

Si usa la misura prevista dal profilo: chilometri per la trazione dello Scout; ore o giorni per gli impieghi della Neverlost. La Traiettoria resta misurata in giorni.

I consumi giornalieri, come il supporto vitale, vengono conteggiati una sola volta per giornata di gioco nella quale il sistema è stato utilizzato, anche con più attivazioni o chiusure di viaggio.

> > #### **A.229 — Nuovi elenchi di Potere e scelte già acquisite**

01/11/2026 — Risposta approvata da Davide.

Confermo gli elenchi aggiornati del Manuale del Giocatore v0.54, del Manuale della Magia v1.11 e del documento Talenti, Specializzazioni e Maestrie v1.1.

Questi elenchi sostituiscono A.185 nella parte che rendeva disponibili tutte e nove le Specializzazioni di Potere alle Classi taumaturgiche indicate. Restano valide la singola scelta iniziale, la sequenza di creazione e le eccezioni basate sui requisiti posseduti.

Per nuovi personaggi e nuove acquisizioni si applicano gli elenchi aggiornati.

Per i personaggi esistenti, l’app segnala le Specializzazioni già acquisite che richiedono una verifica e le conserva operative fino alla decisione del Direttore. Il Direttore può mantenerle come eccezione oppure autorizzarne la sostituzione gratuita con una scelta consentita, senza perdere l’acquisizione spesa.

Prima della modifica si conserva una copia della scheda; scelta precedente, sostituzione ed eventuale eccezione vengono registrate nello storico, così da poter ripristinare la situazione.

L’aggiornamento degli elenchi non cancella incantesimi conosciuti né modifica da solo l’accesso alle famiglie magiche.

> > #### **A.231 — CyberArma recuperata e progetto di Dimitri**

02/11/2026 — Risposta approvata da Davide.

Il pezzo di partenza è la CyberArma originale di Park, con frammento Viola e Corruzione 1\. La frusta era la manifestazione utilizzata da Park; Dimitri non acquisisce le sue statistiche personali o le capacità del Custode.

La voce già presente nell’inventario va verificata e ricondotta a questo esemplare recuperato. La sua presenza non certifica che le modifiche siano già state eseguite.

Il programma aggiornato degli appunti di Dimitri v1.2 prevede:

Giorno 1: studio e progetto;

Giorno 2: preparazione della scheggia Verde, sostituzione del Viola e collaudo;

Giorno 3: recupero e integrazione del modulo SIN dalla spada Cybertronic, personalizzazione della forma e collaudo finale.

La forma è scelta dal giocatore e registrata nel progetto. Batteria interna e conversione a NEC restano sviluppi successivi.

Solo il Direttore conferma gli interventi riusciti e rende disponibile il profilo modificato. Il comando «Consegna l’arma» deve aggiornare lo stesso esemplare, conservandone provenienza e storico, senza creare una seconda CyberArma.

Il modulo trasferito viene rimosso dalla spada donatrice. Il Viola estratto resta un oggetto separato, con le proprie conseguenze e necessità di contenimento.

Precisazione approvata su nome e storico. Ogni CyberArma originale ha un nome univoco derivato dal Custode che l’ha creata. Il profilo originale di questo esemplare conserva il nome «CyberArma Park» nello storico; dopo le modifiche confermate dal Direttore, il profilo attuale è «CyberArma Dimitri». Le modifiche successive si registrano sempre sotto «CyberArma Dimitri», con data, esito e aggiornamento delle proprietà. I due nomi distinguono il profilo originario e quello personalizzato dello stesso esemplare: non creano due armi utilizzabili o due voci fisiche da conteggiare. Il profilo Park rimane conservato per ricostruire la provenienza e le modifiche.

> > #### **A.235 — Raccordo fra Armamenti aggiornati, A.158 e A.166**

02/11/2026 — Risposta approvata da Davide.

> > a.           Manifestazione, famiglia e Specializzazione

Confermo che famiglia e Specializzazione pertinente seguono la forma manifestata, come in A.166: Spade per una lama, Asce per un’ascia, Armi Inastate per una lancia, Armi Flessibili per una frusta. Si applica una sola Specializzazione pertinente.

Restano fissi il profilo del relativo utilizzatore e l’Abilità Armi da mischia. Per il Tecnomante: 1d8 Magico, FOR 3, 1 AzP e 2 PM per 10 Round. La forma modifica mani occupate e portata, senza importare danno, requisiti o proprietà dell’arma commerciale.

Le Manovre seguono compatibilità della forma e requisiti ordinari. La manifestazione non concede automaticamente proprietà speciali del modello commerciale: in particolare, la forma a frusta non attribuisce da sola Immobilizzare a distanza. Questa precisazione corregge quel passaggio della precedente A.166.

> > b.          Peso e Integrità

Peso e Integrità si registrano per esemplare. Per il supporto originale recuperato da Park manteniamo i valori già fissati con A.158: 0,5 kg, Qualità Non Comune, PS Integrità 12 e 4 PI.

Questi valori non diventano obbligatori per ogni CyberArma originale. Le modifiche fisiche vengono annotate sul singolo esemplare; la manifestazione energetica non aggiunge peso.

> > c.           Costruzione degli originali

Confermo la nuova limitazione: soltanto i Custodi possono costruire CyberArmi originali. Il Tecnomante può studiare e modificare un originale esistente. È quindi superata l’autorizzazione alla costruzione concessagli dalla precedente A.158.

Per il Custode con Maestro d’Arma manteniamo come procedura base quella già approvata:

Assemblaggio: Tecnologia −4, 16 ore, 1.000 cr;

Infusione: Rituali, 1 ora, 250 cr e 3 PM.

Totale con progetto disponibile: 17 ore, 1.250 cr e 3 PM. Se occorre sviluppare il progetto, si aggiungono Artefatti, 4 ore e 100 cr.

Sono costi di realizzazione della configurazione base, non un prezzo universale di vendita. Restano applicabili gli esiti delle Prove e le particolarità dell’esemplare.

Il §7.25 del Manuale degli Armamenti condiviso è stato integrato con questi raccordi e con la regola dei nomi e dello storico. La registrazione della risposta non attesta l’implementazione nell’app.

> > #### **A.230 — Specializzazioni eliminate non di Potere**

02/11/2026 — Risposta approvata da Davide.

Confermo che la procedura di A.229 vale anche per le altre Specializzazioni rimosse dagli elenchi di Classe, comprese Armi Inastate dell’Incursore e Archi e Balestre dell’Invocatore.

Le nuove acquisizioni seguono gli elenchi aggiornati. Le scelte già presenti rimangono operative, con un avviso, fino alla decisione del Direttore.

Anche per queste voci il Direttore dispone di «Tienila come eccezione» e «Sostituiscila gratis», conservando l’acquisizione spesa. Prima della modifica si salva una copia della scheda e la decisione viene registrata nello storico.

> > #### **A.220 — Ferite e Iniziativa dei personaggi**

02/11/2026 — Risposta approvata da Davide.

Confermo che le Ferite penalizzano l’Iniziativa sia dei PG sia dei PNG e delle creature, usando la penalità dello Stato di Ferita raggiunto.

Per esempio, una Ferita Profonda applica −4: con bonus ordinario \+2, l’Iniziativa diventa 1d10 −2.

Il minimo 0 previsto per il bonus base dei nemici si applica prima delle penalità. Il risultato modificato può quindi essere negativo.

Questa decisione integra il §5.14: la penalità dello Stato di Ferita si applica a VA, Prove Salvezza e Iniziativa. Si usa il valore dello stato raggiunto, senza sommare nuovamente le penalità degli stati precedenti.

> > #### **A.221 — Successo Magistrale sui moltiplicatori elevati**

02/11/2026 — Risposta approvata da Davide.

Confermo il comportamento attuale: un danno ×5 rimane ×5 anche con un Successo Magistrale.

La progressione ordinaria è:

Moltiplicatore ordinario ×1 → con Magistrale ×2.

Moltiplicatore ordinario ×2 → con Magistrale ×3.

Moltiplicatore ordinario ×3 → con Magistrale ×3.

Moltiplicatore ordinario superiore a ×3 → rimane invariato.

Non si riduce mai un moltiplicatore già superiore a ×3 e non lo si aumenta automaticamente di uno, salvo un’eccezione espressa.

Restano le altre conseguenze pertinenti del Magistrale e il limite alla prima istanza di danno negli attacchi multipli.

Il Magistrale richiede una Prova che possa produrlo: un Soffio risolto soltanto mediante la Salvezza dei bersagli non ottiene un Magistrale dal semplice tiro dei dadi di danno.

> > #### **A.232 — Specializzazioni applicabili ai Guanti mistici**

02/11/2026 — Risposta approvata da Davide.

Ai pugni sferrati con i Guanti da Combattimento Mistico sono applicabili Combattimento Senz’Armi oppure Armi da Pugno, se possedute.

Se il personaggio le possiede entrambe, applica un solo \+1 VA e \+1 danno: i bonus delle due Specializzazioni non si sommano sullo stesso pugno.

Restano il danno senz’armi del personaggio, Arti Marziali, il dado del Lottatore e gli altri benefici pertinenti. Il Pugno mistico attivo aggiunge normalmente i propri bonus.

Queste Specializzazioni non migliorano il Getto di fuoco, il Doppio getto o gli attacchi effettuati con un’arma impugnata.

> > #### **A.234 — Prova di Potere del Doppio getto**

02/11/2026 — Risposta approvata da Davide.

Si utilizza Potere −2 VA, applicando le penalità e gli eventuali modificatori generali effettivamente pertinenti alla Prova.

Non si applicano i benefici riservati al lancio degli Incantesimi: la Specializzazione Elementi non aumenta questa Prova e non riduce il costo dei getti.

Potere Mistico aumenta i PM massimi personali: non concede un bonus al VA di Potere e non aumenta la riserva dei Guanti.

Il costo rimane 10 PM dalla riserva interna, consumati al tentativo anche in caso di fallimento. I PM personali non possono sostituirli.

> > #### **A.236 — Batteria interna della CyberArma**

02/11/2026 — Risposta approvata da Davide.

Confermo che la riserva interna Verde da 10 PM è dedicata esclusivamente alla CyberArma.

Il Tecnomante non può prelevarne PM per Incantesimi, altre capacità, altri oggetti o conversioni in PM personali.

Per il profilo del Tecnomante, ogni attivazione consuma 2 PM per 10 Round: una riserva piena permette cinque attivazioni complete. Rimane disponibile l’alternativa dei PM personali prevista dal profilo.

L’installazione della batteria deve essere effettivamente realizzata e confermata: non è compresa automaticamente nel progetto iniziale dei tre giorni di Dimitri.

> > #### **A.237 — NEC della CyberArma convertita**

02/11/2026 — Risposta approvata da Davide.

La configurazione ordinaria utilizza un NEC Rosso da 10 cariche.

Ogni attivazione richiede 1 AzP e una carica, mantenendo la manifestazione per 10 Round. Il consumo è per attivazione, non per attacco: dieci cariche consentono dieci attivazioni.

L’app deve collegare il consumo al NEC effettivamente inserito e conservarne la carica residua quando viene rimosso. Sostituzione e ricarica seguono le regole dei NEC e la procedura di A.215.

La configurazione mantiene SnT 3 complessiva. Non converte cariche tecnologiche in PM personali o in energia per batterie mistiche.

> > #### **Revisione approvata — Cariche Mistiche; integrazione e superamento dei riferimenti energetici precedenti in A.234 e A.236 (02/11/2026)**

Davide approva la nuova denominazione e i consumi. Le Batterie Mistiche conservano PM utilizzabili dal personaggio secondo le regole ordinarie. Le riserve dedicate ai soli effetti di armi e oggetti si chiamano Cariche Mistiche (CM), con contatore CM attuali/CM massime: non alimentano Incantesimi e non sono prelevabili come PM personali. Il nome non cambia le cariche tecnologiche NEC, CEC, MEC o BEC.

Guanti da Combattimento Mistico di Lucas: 6 CM Rosse complessive per la coppia. Pugno mistico/potenziamento: 1 CM, 1 AzP, durata 5 Round. Getto singolo: 3 CM e 1 AzP. Doppio getto: 6 CM e 1 AzP, entrambe le mani libere, Potere −2; le 6 CM si spendono al tentativo anche se fallisce. Restano effetti, distanze, risoluzione separata dei getti, Specializzazioni alternative della A.232 e limiti ai bonus della A.234. A piena riserva: sei potenziamenti, due getti singoli oppure un doppio; un getto e due potenziamenti lasciano 1 CM. Questo supera il vecchio contatore da 10 PM e i consumi 2/5/10 PM.

CyberArma Dimitri: la futura riserva interna Verde è da 5 CM, esclusiva dell’arma; 1 CM e 1 AzP manifestano l’arma per 10 Round, cinque attivazioni complete. SnT 2 complessiva. Rimane il profilo alternativo da 2 PM personali per 10 Round. Il progetto iniziale di tre giorni NON installa questa riserva e continua a usare PM personali; il focalizzatore non diventa una batteria. Restano il nome univoco, lo storico Park/Dimitri, la singola istanza d’inventario e le altre decisioni già approvate. La conversione tecnologica A.237 resta separata: NEC Rosso 10, una carica per 10 Round, SnT 3\.

Ricarica delle CM: PM personali \= CM mancanti × 2 × rapporto di conversione applicabile. Con 3:1, ogni CM costa 6 PM: Guanti vuoti 6 × 2 × 3 \= 36 PM; CyberArma vuota 5 × 2 × 3 \= 30 PM. Con 2:1 i totali sono 24 e 20 PM; con 1:1 sono 12 e 10 PM. Si ripristina soltanto quanto manca; restano colore, requisiti, Azioni, Prove ed esiti ordinari della ricarica mistica. Il ×2 non si applica alle normali Batterie in PM né agli accumulatori tecnologici. La nuova formula non modifica i PM di costruzione/infusione o i prezzi già approvati delle due ricette.

Rimandi di catalogo: Bordone Templare, Vindicator, Deliverer, Castigator, Demontooth e Scudo delle Guardie Sacre conservano cinque impieghi, ora indicati come 5 CM Rosse, 1 CM per attivazione; la ricarica completa ordinaria è 30 PM. I consumabili monouso conservano l’energia sigillata e non ricaricabile. Per gli altri progetti non si deducono automaticamente nuovi costi in CM dal costo in PM di un Incantesimo: occorre la relativa scheda di progetto.

Salvataggi esistenti: applicare una sola volta la conservazione della frazione residua già approvata in A.193, con copia dei dati precedenti e registrazione della conversione. Guanti: CM nuove \= PM precedenti / massimo precedente × 6; riserva CyberArma: stesso criterio × 5\. Non riempire automaticamente, non arrotondare per eccesso e non aggiungere una riserva dove non era installata. Le frazioni si conservano senza attribuire un utilizzo non pagabile. I profili storici restano consultabili; i riferimenti attivi sopra riportati superano le vecchie diciture.

> > #### **A.233 — Capitolo e scena: risposta approvata da Davide (02/11/2026)**

Il capitolo è distinto dall’Atto dei PX: un Atto può comprendere più capitoli. Il Direttore stabilisce quando iniziano una nuova scena o un nuovo capitolo, tramite comandi nella propria plancia che rinnovano sui tablet soltanto gli utilizzi pertinenti.

Gli usi per sessione si rinnovano all’inizio della partita; quelli per giorno o settimana seguono il calendario della campagna. Questi comandi non ripristinano PM, munizioni o altre risorse.

> > #### **A.228 — Frazioni delle riserve: risposta approvata da Davide (02/11/2026)**

La frazione esatta deve restare nella riserva effettiva anche per i personaggi, oltre che nel registro della conversione. Quindi 7,75 cariche rimangono 7,75: si possono mostrare sette cariche intere e il residuo separatamente.

La frazione non diventa gratuitamente una carica intera. Ogni utilizzo richiede il costo completo previsto; il residuo resta disponibile per i successivi calcoli e per la ricarica.

> > #### **A.239 — Munizioni della Neverlost: risposta approvata da Davide (02/11/2026)**

La dotazione standard comprende 600 proiettili per ciascun mitragliatore e sei missili. Per la Neverlost già presente in campagna, il Direttore conferma le quantità effettivamente rimaste.

Gli aggiornamenti del profilo conservano le munizioni registrate. Se il dato manca, si segnala come da verificare dal Direttore.

> > #### **Anello con Rigenerazione 9 — configurazione approvata da Davide (02/11/2026)**

La configurazione riutilizzabile ha una riserva Verde dedicata da 5 Cariche Mistiche e consuma 5 CM per ogni Rigenerazione 9, consentendo un utilizzo a riserva piena. La ricarica completa costa 30 PM personali con conversione 3:1, 20 PM con 2:1 oppure 10 PM con 1:1. Restano Grado III, SnT 3 e proprietà Esclusiva. Il consumo avviene al completamento delle tre ore di attivazione continua: un’interruzione precedente impedisce l’effetto senza consumare cariche. Seguono i cinque giorni previsti per la rigenerazione. I 9 PM del rituale eseguito direttamente restano invariati. Questa precisazione completa l’esempio del §25.4 del Manuale della Magia; non assegna automaticamente un anello ai personaggi.

> > #### **A.226 — Scout della campagna: risposta approvata da Davide (02/11/2026)**

Il nuovo standard vale come riferimento anche per lo Scout dei PG: prezzo di catalogo 126.510 crediti per la configurazione standard; riparazioni per PI: Corpo 300, Propulsione 100, Motore 300 crediti. Restano registrati munizioni, scorte e corredo già ottenuti: gli eventuali 400 colpi aggiuntivi rispetto allo standard non vengono eliminati. Le dotazioni extra si valutano separatamente. Si conservano danni, consumi e spese storiche.

Precisazione di Davide: FIAT LUX è il nome personalizzato dello Scout dei PG. Le denominazioni «FIAT LUX» e «Scout dei PG» indicano la stessa istanza di veicolo, con un unico inventario, le stesse riserve, munizioni, Integrità e storico. Il nome personalizzato resta FIAT LUX; il modello di riferimento resta Scout MK4. Applicare a questa istanza gli aggiornamenti approvati senza creare un altro veicolo o duplicarne le dotazioni.

> > #### **A.227 — Ricambi precedenti dello Scout: risposta approvata da Davide (02/11/2026)**

Il Banco Rosso destinato alla trazione dello Scout diventa un MEC Rosso di ricambio; il Modulo Verde diventa una CEC Verde di ricambio. Si conserva la frazione residua di ciascun accumulatore, applicando la conversione una sola volta e mantenendo i dati originali nello storico. Se la frazione non è ricostruibile, il Direttore deve verificarla prima dell’utilizzo. La dicitura «nessuna scorta aggiuntiva» riguarda la dotazione standard dei nuovi veicoli e non cancella i ricambi già posseduti dallo Scout dei PG, chiamato FIAT LUX.

> > #### **A.118 — Stampa dei veicoli condivisi: risposta approvata da Davide (03/11/2026)**

Un veicolo del gruppo, come FIAT LUX, ha una scheda condivisa. Nella stampa complessiva del gruppo compare una sola volta. Nella stampa del singolo PG, l’inclusione è facoltativa e viene preselezionata soltanto per il conducente. Stampare ulteriori copie non duplica il veicolo nell’inventario. FIAT LUX è il nome personalizzato dello Scout dei PG; la Neverlost resta la loro nave.

> > #### **A.238 — Neverlost atterrata in una mappa a Q Base: risposta approvata da Davide (03/11/2026)**

La Neverlost viene rappresentata con le dimensioni reali: 34 × 20 Q Base, corrispondenti a 51 × 30 metri, con rotazione anche di 45°. L’app deve consentire questa dimensione per la sagoma della nave atterrata. Lo scafo costituisce un ostacolo secondo la sagoma effettiva; accessi e portelloni si gestiscono separatamente. Il combattimento aereo continua a utilizzare i Q Tattici.

> > #### **A.223 — Posizione della testa della Madre delle Murene: risposta approvata da Davide (03/11/2026)**

La testa si trova normalmente all’estremità del muso e segue spostamenti e rotazioni della creatura. Il Direttore può riposizionare manualmente il marcatore quando la posa o l’emersione parziale lo richiedono, mantenendolo in una posizione anatomicamente plausibile sulla sagoma. Distanze e linee di tiro partono dalla posizione confermata della testa. Lo spostamento del marcatore rappresenta la posizione effettiva della creatura e non concede movimento o portata aggiuntivi.

> > #### **A.222 — Ingombro del Dragomedusa: risposta approvata da Davide (03/11/2026)**

Nel manuale le dimensioni corporee si leggono lunghezza × larghezza; nei campi dell’app larghezza × lunghezza. Dragomedusa giovane: nuovo ingombro corporeo di riferimento 6 × 4 Q Base, cioè 9 × 6 metri; nell’app 4 × 6 Q Base. Dragomedusa adulto: 14 × 10 Q Base nel manuale; nell’app 10 × 14 Q Base. Restano le pedine convenzionali in Q Tattici: giovane 1 × 1, adulto 2 × 1\. Ingombro corporeo e portata dei filamenti rimangono distinti.

> > #### **A.224 — Roccia attraversabile: risposta approvata da Davide (03/11/2026)**

Introduciamo il materiale Roccia, assegnabile alle aree e alle pareti, comprese quelle disegnate come linee. Lo attraversano le creature che possiedono la relativa capacità, rispettando le limitazioni del proprio profilo. La capacità di attraversare la roccia non permette da sola di attraversare porte metalliche o pareti di altri materiali. La roccia conserva il blocco della visuale e rimane un ostacolo per le altre creature.

> > #### **A.225 — Conversione delle distanze sulla mappa: risposta approvata da Davide (03/11/2026)**

L’app conserva l’unità originale di ogni distanza e la converte nella scala della scena. Un Q Tattico equivale a 10 Q Base: da Q Base a Q Tattici si divide per 10, nel senso opposto si moltiplica per 10\. Una misura già espressa nella scala della scena si usa direttamente, senza convertirla nuovamente. Esempio: un soffio di 12 × 1 Q Tattici diventa 120 × 10 Q Base. La conversione vale per movimento, portate e aree degli effetti. Si conservano le frazioni esatte, senza arrotondamenti che concedano distanza aggiuntiva. Gli ingombri convenzionali delle pedine seguono invece le dimensioni dichiarate per ciascuna scala.

> > #### **A.240 — Neverlost fuori produzione e valore commerciale: precisazione di Davide (03/11/2026)**

La Neverlost è un modello fuori produzione con molte modifiche personalizzate. Il suo profilo è quello dello specifico esemplare della campagna e non deve essere preso come esempio, modello standard o riferimento commerciale per altre navi. Prezzo e fascia commerciale della configurazione attuale restano da definire; i prezzi dei componenti non determinano automaticamente il valore dell’intera nave. Quando sarà ampliato il Manuale dei Veicoli verrà definita una nave simile, distinta dalla Neverlost, con un proprio valore commerciale di catalogo.

> > #### **A.226 — Scout standard e FIAT LUX: integrazione di Davide (03/11/2026)**

Lo Scout standard non è un veicolo personalizzato: il prezzo di riferimento resta quello del modello generico, 126.510 crediti per la configurazione standard approvata. FIAT LUX è il nome dello Scout dei PG, non quello della Neverlost. Il FIAT LUX non riceve per il solo nome modifiche tecniche personalizzate. È però un esemplare antico, con ricambi difficili da trovare: il suo valore effettivo può essere inferiore al prezzo del veicolo generico. Prezzo di catalogo e valore stimato di questo esemplare vanno distinti. Davide non ha fissato una percentuale di svalutazione o un nuovo importo: la stima resta al Direttore.

> > #### **A.242 — Documento Talenti, Specializzazioni e Maestrie v1.1: condivisione autorizzata ed eseguita (03/11/2026)**

Davide ha autorizzato esplicitamente il caricamento della v1.1 nella cartella «E\&L – Lavoro condiviso». Il documento è ora disponibile nella cartella condivisa: https\://docs.google.com/document/d/10ztjyeX1apff5tnh3SzNiswsvXNjyX0m/edit?usp=drivesdk\&ouid=105222013024123078285\&rtpof=true\&sd=true

Verifica effettuata sui contenuti: tutti i 25 elenchi di Classe della v1.1 coincidono con quelli del Giocatore 0.54. Restano valide le decisioni già approvate sulle Specializzazioni precedenti e sulla loro migrazione; questa condivisione non introduce modifiche aggiuntive agli elenchi.

> > #### **A.117 — Eretico corrotto poco efficace: risposta approvata da Davide (03/11/2026)**

Manteniamo ai gradi Semplice e Medio il profilo umano senza Doni automatici, confermando l’eccezione «più fragile del grado». Un umano con armamento leggero può essere poco efficace contro un personaggio ben protetto: questo, da solo, non giustifica un potenziamento automatico.

Il nome e la corruzione non attribuiscono automaticamente poteri, danni Magici o altre capacità. Eventuali Doni, mutazioni o dotazioni superiori vengono assegnati esplicitamente dal Direttore e riportati nel singolo profilo.

> > #### A.243 — Sostituzione della cella: risposta approvata da Davide (06/11/2026)

> > ## **Estrarre soltanto la cella costa 1 AzP; inserire una cella pronta in un’arma vuota costa 1 AzP; la sostituzione diretta di una cella con un’altra resta un’unica operazione da 1 AzP complessivo. La cella estratta conserva esattamente la carica residua.**

> > #### A.244 — Riempimento dei caricatori fuori dal combattimento: risposta approvata da Davide (06/11/2026)

> > ## **Fuori dal combattimento, riempire i caricatori richiede 1 minuto ogni 50 colpi trasferiti, o frazione, calcolato sul totale dell’operazione. I caricatori devono essere estratti e le munizioni devono essere realmente disponibili.**

> > #### A.245 — Punti Integrità delle celle: risposta approvata da Davide (06/11/2026)

> > ## **Ogni singola cella possiede 2 PI. Una cella danneggiata deve essere separata dalla pila. A 0 PI è distrutta e inutilizzabile, normalmente non riparabile: l’evento va registrato e la cella va rimossa dalle scorte utilizzabili.**

> > #### A.246 — Corruzione del frammento viola: risposta approvata da Davide (06/11/2026)

> > ## **La Corruzione segue il frammento viola rimosso: la CyberArma perde Corruzione 1, mentre il frammento estratto la conserva. Lo stato precedente resta consultabile nello storico.**

> > #### A.247 — Aumento oltre il limite di un’Abilità: risposta approvata da Davide (06/11/2026)

> > ## **Se il Direttore, dopo l’avviso del sistema, forza deliberatamente l’assegnazione di un punto oltre il limite, il VA dell’Abilità aumenta realmente oltre il limite. L’operazione deve essere registrata come eccezione esplicita.**

> > #### A.248 — Riassegnazione dei punti divenuti inefficaci: risposta approvata da Davide (06/11/2026)

> > ## **I punti che diventano inefficaci in seguito a una modifica forzata del Direttore possono essere riassegnati dal giocatore nello stesso livello originario, rispettando le normali regole di assegnazione. La riassegnazione va registrata.**

> > #### A.249 — Sostituzione del caricatore: risposta approvata da Davide (06/11/2026)

> > ## **Estrarre soltanto il caricatore costa 1 AzP; inserirne uno in un’arma vuota costa 1 AzP; la sostituzione diretta resta un’unica operazione da 1 AzP complessivo. Il caricatore estratto conserva esattamente i colpi residui.**

> > #### A.250 — Caricatore parzialmente pieno come caricatore pronto: risposta approvata da Davide (06/11/2026)

> > ## **Un caricatore compatibile, accessibile e con almeno un colpo è considerato pronto anche se non è pieno. Ha lo stesso costo d’azione e beneficia normalmente di Ricarica Rapida o Ricarica Esperta; il numero esatto di colpi residui deve essere conservato.**

> > #### A.251 — CyberArma modificata e PM personali: risposta approvata da Davide (06/11/2026)

> > ## **La sola sostituzione del cristallo e l’inserimento di una SIN consentono ancora di alimentare la CyberArma con i PM personali. L’inserimento di una riserva interna di CM oppure la conversione a NeC impediscono invece l’uso dei PM personali e fanno perdere le proprietà da Custode. Configurazione CM: 1 CM \+ 1 AzP ogni 10 colpi; conversione NeC rossa: 1 carica \+ 1 AzP ogni 10 colpi. Cristallo e SIN possono coesistere con l’alimentazione a PM personali; CM e NeC sono conversioni energetiche alternative.**

> > #### A.252 — Frazioni di CM e NeC: risposta approvata da Davide (06/11/2026)

> > ## **CM e NeC si consumano solo in quantità intere. Le eventuali frazioni prodotte dalla conversione di regole pregresse vanno arrotondate una sola volta all’intero superiore: per esempio 4,2/6 diventa 5/6. Ricaricare 1 CM costa rispettivamente 6, 4 o 2 PM con conversione 3:1, 2:1 o 1:1. Questa decisione supera la A.228 e le parti della A.193 che mantenevano frazioni nelle riserve effettive; il valore precedente resta soltanto nello storico.**

> > #### A.253 — Decollo e atterraggio della Neverlost: risposta approvata da Davide (06/11/2026)

> > ## **A terra la Neverlost non rulla e ha movimento 0\. Il decollo verticale è una manovra complessa: 1 AzM \+ 1 AzP del pilota; normalmente non richiede prova, salvo spazio ristretto, attacco in corso o danni. Nel round di decollo sale in stazionamento senza spostamento orizzontale; dal round successivo usa i movimenti della scala tattica 8/16/24, senza convertirli in 80/160/240 sulla mappa terrestre: si passa alla scala tattica o si esce dalla mappa. L’atterraggio è una manovra complessa e conclude il movimento.**

> > #### A.254 — Posizione della testa della Madre delle Murene: risposta approvata da Davide (06/11/2026)

> > ## **Il Direttore può collocare la testa in qualunque casella occupata dalla sagoma corrente, anche centrale, purché la posizione sia anatomicamente plausibile rispetto alla posa o all’emersione parziale; mai fuori dalla sagoma. La posizione può cambiare quando la creatura si muove, ruota, cambia configurazione o assume una nuova posa, non fra un attacco e l’altro per ottenere una linea più favorevole. Il segnalino modifica soltanto l’origine di attacchi, soffio, aura ed effetti centrati sulla testa, non movimento, spazio occupato o portata.**

> > #### A.255 — Murena eterea all’interno della roccia: risposta approvata da Davide (06/11/2026)

> > ## **La Murena eterea può terminare il movimento dentro la roccia. Finché è completamente immersa non ha linea di vista o d’effetto verso l’esterno, non può attaccare né essere normalmente bersagliata e non percepisce automaticamente oltre la parete. Per attaccare deve emergere quanto basta e spendere il normale movimento; se non lo esaurisce può rientrare con il movimento residuo. Se viene eccezionalmente resa corporea nella roccia, viene spostata nella casella libera più vicina alla superficie, diventa corporea e Prona, senza attacchi di opportunità; a parità di distanza decide il Direttore.**

> > #### A.256 — Prezzo di vendita degli artefatti: risposta approvata da Davide (06/11/2026)

> > ## **Il prezzo di vendita si calcola come costo completo di costruzione × 3 × coefficiente di rarità. Coefficienti: Comune 1; Non comune 1,5; Raro 2; Molto raro 3; Leggendario 5; Unico o reliquia senza prezzo di catalogo. Il risultato si arrotonda per eccesso ai 50 cr successivi. L’Anello della Rigenerazione 9, con costo di costruzione di 1.500 cr e rarità Molto rara, vale quindi 13.500 cr. Rarità e reperibilità restano separate: disporre del denaro non garantisce che l’oggetto sia disponibile.**

> > #### A.257 — Valore complessivo della FIAT LUX: risposta approvata da Davide (06/11/2026)

> > ## **Il prezzo di catalogo dello Scout standard resta 126.510 cr. Il valore corrente della FIAT LUX comprende base, equipaggiamento installato o assegnato, dotazione portatile a bordo, munizioni e consumabili residui, accumulatori di ricambio e loro stato o carica. Vanno mostrati separatamente modello base, dotazione extra e valore totale dell’esemplare. Kit trauma, pistola medica, cartucce di naniti, 400 colpi aggiuntivi e ricambi rossi o verdi restano inventario del gruppo, ma concorrono al totale finché sono a bordo o assegnati; il valore cambia quando vengono consumati, rimossi o trasferiti.**

> > #### A.258 — Eretici e vecchio catalogo dei nemici: chiarimento provvisorio approvato da Davide (06/11/2026)

> > ## **Gli Eretici generici presenti nei dati precedenti non sono creature canoniche del nostro bestiario. Come chiarimento provvisorio dei soli dati attualmente visibili nell’app, finché non saranno sostituiti, gli Eretici Minori mantengono Toccato e i Boss mantengono Consacrato, mentre i profili ordinari Semplici o Medi non ricevono doni automatici. Questa indicazione non approva né canonizza quei profili: gli Eretici e tutte le altre creature nemiche inserite in precedenza da Marcello devono essere superati dalle creature create da noi per il Manuale. Gli Eretici come creature dell’Oscura Simmetria devono ancora essere completati. La A.258 non va quindi interpretata come convalida del catalogo esistente.**

> > #### A.259 — Uso dei Capolavori: risposta approvata da Davide (06/11/2026)

> > ## **Ogni singolo Capolavoro concede un proprio uso una volta per sessione, non una volta per personaggio. Deve essere lo strumento principale di una prova pertinente e non offensiva. Nella stessa prova si può usare un solo Capolavoro e ripetere il tiro una sola volta, accettando il secondo risultato. Se l’oggetto viene trasferito, resta già usato fino alla sessione successiva.**

> > ## **8\. Prove da fare**

Le prove in sospeso. Quelle che puoi fare tu dal PC del Direttore, nessuna lunga più di qualche minuto. Per tutte: prima **Mutant.bat → 2 «Aggiorna»**, poi **1 «Avvia»**.

> > ### **1\. I personaggi e i PX sono quelli giusti**

**Mutant.bat → C «Controlla lo stato»**: per ogni personaggio una riga con PX, livello della scheda e livello che danno i PX. Devono essere i PX che hai assegnato. Se un personaggio ha scritto «LA SCHEDA HA UN LIVELLO IN PIU», è il caso dell’A.187: non cambia niente da solo. Se mancano personaggi, **P «Cerca i personaggi»**.

> > ### **2\. Il rientro con valore precedente e proposto**

Da un tablet collegato fai cambiare a un giocatore i PV e metti il tablet offline (o chiudi il collegamento) prima di riconnetterlo. Sul tuo PC, nella schermata **«Rientro dei tablet»**, ogni riga deve dire «fatta alle … , ricevuta alle …», «valore precedente: … · valore proposto: …» e «In attesa di approvazione». Approva una riga: i PV cambiano.

> > ### **3\. Il ritiro**

Sul tablet apri «Vedi la coda» e tocca **«Ritira»** su una richiesta già arrivata. Sul tuo PC la riga sparisce dalle modifiche da decidere e compare «Ritirata dal giocatore» (la scheda non cambia); **«Visto»** la toglie.

> > ### **4\. Lo Sciame**

**Prepara scontro** → **Aggiungi nemico** → Bestiario → **«Sciame di corvi»** → **Inizia**. **Attacca** su un bersaglio adiacente: deve rifiutare spiegando che colpisce solo chi condivide un quadretto. Nello stesso spazio, invece, passa.

> > ### **5\. La Galleria e le GIF**

**Tavolo del Master** → **Galleria** → carica una **GIF animata** → «Mostra ai giocatori»: sui tablet deve **muoversi**. Sopra i 5 MB compare prima l’avviso «GIF pesante».

> > ### **6\. Gli avvisi sul telefono**

Installa **ntfy** sul telefono, iscriviti all’argomento delle istruzioni che ti ho mandato e avvia il server: deve arrivarti una notifica. Se non arriva, dimmelo.

> > ### **7\. Ricarica e medita**

Scheda di un Taumaturgo con un cristallo sintonizzato e non pieno → tab **Poteri** → **Medita** → «Ricarica , poi medita». Nel conto la prima riga è la ricarica, con i soli PM che hai adesso; poi la Meditazione. Prova «Interrotta» con 0 ore: la ricarica resta, «recuperati 0 PM».

> > ### **8\. Si sale di livello solo con i PX**

Dal tablet, scheda di un personaggio con PX che non bastano → il pulsante «Sali al livello N» è spento e dice quanti PX mancano. Dal PC, «Modifica master» → «Concedi il passaggio al livello N» (scrivi il motivo) → dal tablet ora si sale. Sul PG con un livello in più: «Annulla l’ultimo livello» ti elenca le scelte che si perdono; «Tieni come concessione» chiede il motivo.

> > ### **9\. Incantesimi: regole di nuovo valide**

Dal tablet, tab Poteri → «Sostituisci» su un incantesimo di un livello → cerca uno di livello oltre il massimo: il pulsante è spento e dice perché. Uno che rientra: si sostituisce e in Identità → Storico compare la riga con ora e «tablet». Dal PC in «Modifica master» lo stesso fuori regola si può forzare, con il motivo.

> > ### **10\. Bestiario: Iniziativa e Dragomedusa**

Plancia → «Prepara scontro» → «+ Aggiungi nemico» → Alce, Ankheg e i due Dragomedusa → «Inizia» → «Tira per tutti con l’app»: Alce e Ankheg tirano solo il d10 (Iniziativa 0), i Dragomedusa 2 \+ d10; nella mini-scheda del Dragomedusa giovane «GS Mito · 200 PX per 4 PG», nell’adulto «GS Semidio · 400 PX per 4 PG».

> > ### **11\. Bestiario: draghi, fauna di Iris e il segno «provvisoria»**

Plancia → «Prepara scontro» → «+ Aggiungi nemico» → un Drago verde adulto e un Raptor di Fuoco adulto → «Inizia» → «Attacca» dall’uno contro l’altro: il Drago mostra «6d10×5» e l’app lo tira (dadi, somma e totale, A.199), il Raptor «1d6+3». Nello stesso elenco, accanto alle creature del **Bestiario proposto** e agli umani (Eretico, Soldato…), c’è la sigla **«provvisoria»**: passandoci sopra dice che non sono canoniche e verranno sostituite (A.258). Le creature del Manuale dei Mostri non ce l’hanno.

> > ### **12\. Le Specializzazioni di Potere (A.229)**

Apri la scheda di un Taumaturgo che ha un posto di Specializzazione libero → riquadro **«Da scegliere»**. Fra quelle di Potere ci sono solo quelle della sua Classe; le altre sono in grigio con «Non è più nell’elenco … (A.229)». Se un personaggio ne ha già una tolta (anche Armi Inastate o Archi e Balestre, A.230), in «Modifica master» trovi «Tienila come eccezione» e «Sostituiscila gratis».

> > ### **13\. «Appreso» da confermare (A.211)**

Da un tablet: tab **Poteri** → «Aggiungi un incantesimo a mano» → **«Appreso (lo conferma il Direttore)»**. Sul tuo PC, in «Modifica master», la scheda dell’incantesimo dice «Annotato, appreso da confermare»; **«Segna come appreso»** lo conferma.

> > ### **14\. Celle: i costi, i PI e il trasformatore (A.243, A.245)**

Scheda di un personaggio con un’arma a cella, una cella di scorta, un trasformatore e una CEC dello stesso colore. Tab **Combattimento**: sotto l’arma devono comparire i tre costi, «Togliere 1 AzP · inserire 1 AzP · sostituire, una sola operazione e non la somma dei due, 1 AzP». Spara fino a 0 → **«Togli la cella»** → **«Inserisci»** la piena. Accanto a ogni cella c’è «− 2/2 PI +»: premi − due volte e la cella diventa «distrutta: fuori dalle scorte utilizzabili (A.245)», con la sua riga nello storico. Tab **Inventario** → «Tampone» → la cella **tolta** → «Ricarica»; scegli invece quella **inserita**: deve rifiutare e dirti perché.

> > ### **15\. I caricatori: colpi, parziali e tempo (A.244, A.249, A.250)**

Scheda di un personaggio con un’arma a caricatore, caricatori di scorta e proiettili sciolti. Tab **Combattimento**: spara qualche colpo, l’arma mostra per esempio (12/30). **«Togli il caricatore»**: resta fra quelli di scorta con i suoi colpi. Mettine uno **parziale**, anche da un colpo solo: entra come uno pieno. Con soli caricatori **vuoti** il pulsante è spento: «Un caricatore vuoto non è pronto (A.250)». Poi, fuori dal combattimento, «Riempi i caricatori»: il pulsante dice **quanti colpi e quanti minuti** prima di confermare (120 colpi \= 3 minuti). Prova a riempire quello **ancora nell’arma**: deve dire che va estratto prima.

> > ### **16\. Spostare i punti Abilità e forzare il limite (A.247)**

Dal Tavolo apri la scheda di un personaggio con **«Modifica master»** → tab **Identità** → Progressione → «Sposta i punti» su un livello. Togli un punto da un’Abilità e mettilo in un’altra: i VA cambiano mentre sposti. Mettine uno in un’Abilità **già al limite**: l’avviso dice che forzandolo il VA passa davvero il limite, e il pulsante è **«Forza l’eccezione»**; la conferma ti mostra prima la riga che resterà scritta. Dopo, nella scheda quel VA ha accanto un **✦** e il «Calcolo» spiega il perché. Nel registro la riga dell’eccezione è distinta da quella dello spostamento; **«Annulla»** rimette com’era.

> > ### **17\. Le Cariche Mistiche dei Guanti**

Scheda di Lucas → indossa i Guanti → nella colonna di sinistra il riquadro **«Cariche Mistiche (CM) degli oggetti»** con i Guanti a «… / 6 CM», a numeri interi (A.252). Tab **Artefatti** → Guanti → **Getto di fuoco**: scendono di 3 CM. I PM di Lucas non cambiano.

> > ### **18\. Nuova scena, usi per scena e Capolavori (A.259)**

Dal tablet, scheda di un personaggio con un Talento «una volta per scena» → tab **Combattimento** → «Usa»: il pulsante dice **«↻ nuova scena»**. Sul tuo PC, nel Tavolo, gruppo **«Campagna»** → **«Nuova scena…»**: la conferma dice quanti usi tornano e di chi; sul tablet l’uso torna disponibile, mentre PM e munizioni restano come stavano. Se un personaggio ha un **Capolavoro**: tocca un VA, **«Tira»**, e sotto il risultato compare «Ripeti con \<nome\>»; dopo la ripetizione la riga dice «vale il secondo risultato, anche se è peggiore», e in una prova nuova quel Capolavoro è spento con «torna con «Nuova sessione»».

> > ### **19\. La stampa del gruppo e il valore del FIAT LUX (A.257)**

Nel Tavolo → **«Stampa del gruppo»**: i fogli dei personaggi al tavolo e, in fondo, il foglio «Veicoli del gruppo» con il FIAT LUX una volta sola. Poi apri la scheda di chi lo guida → tab **Veicoli** → **«Valore di questo esemplare»**: tre righe, 126.510 \+ 62.600 \= **189.110 cr**. Togli una cartuccia di naniti con il −: il totale scende di 5.000 cr.

> > ### **20\. La Neverlost decolla (A.253)**

Apri una scena della mappa con la Neverlost → clic destro sul suo token. A terra, «Passo», «Corsa» e «Scatto» sono spenti e dicono «A terra non rulla e ha movimento 0»; c’è **«Decolla…»** con «1 AzM \+ 1 AzP del pilota». Premilo: la conferma elenca i tre casi in cui serve la prova e dice che in questo Round la nave non si sposta di lato. Avanza di un Round e riapri il menu: adesso il suggerimento delle fasce dice che **i movimenti in volo non si convertono**, con le due strade. **«Atterra»** chiude il movimento del Round.

> >
