# Talenti v1.0 — effetti voce per voce (27/10/2026)

Generato da `node tools/talenti-effetti-voci.mjs --scrivi`; il test `tests/talenti-effetti-voci.test.js` lo ripete a ogni `npm test`.
Per ogni voce un personaggio (Lucas, 6° livello) con `regimeTalenti = 2` la sceglie; si confronta con lo stesso personaggio senza la voce.

Voci: 197 (39 Talenti Liberi, 72 Maestrie, 86 Specializzazioni). Esito ok: 197.
«Vecchia maniera»: la stessa voce presa come Talento Libero dei Talenti di prima; «uguale» = stessi valori, «nuova» = la voce non esisteva.

| Voce | Categoria | Effetti nel testo | Calcolati dall'app | Da applicare al tavolo | Vecchia maniera | Esito |
|---|---|---|---|---|---|---|
| Attivazione Tempestiva | Maestria | — | — | Il personaggio può dichiarare l’attivazione di una proprietà a carica della propria arma dopo aver conosciuto l’esito della Prova per colpire, ma prima delle Difese e della determinazione del danno. L’attivazione conserva i costi ordinari … | uguale | ok |
| Ambidestro | Talento Libero | attacco_ravvicinato | attacco ravvicinato: in «Attacca!» | — | uguale | ok |
| Iniziativa Migliorata | Talento Libero | iniziativa | iniziativa: cambia nella scheda (iniziativa, vociIniziativa) | — | uguale | ok |
| Sempre Allerta | Talento Libero | va Percezione 3 (uso_specifico) | va Percezione +3 — uso_specifico (imboscate e pericoli improvvisi) | può fare la Prova di Percezione anche senza cercare attivamente la minaccia, se è concretamente percepibile: lo decide il Direttore. | uguale | ok |
| Sonno Leggero | Talento Libero | — | — | Il personaggio si sveglia immediatamente quando percepisce un rumore, un movimento o un evento anomalo. Se è necessaria una Prova di Percezione, deve comunque superarla. Il risveglio non identifica automaticamente la minaccia e non concede… | uguale | ok |
| Buona Costituzione | Talento Libero | pv | pv: cambia nella scheda (pv) | — | uguale | ok |
| Struttura Robusta | Talento Libero | salvezza tempra 3 (uso_specifico) | salvezza tempra +3 — uso_specifico (per evitare una Menomazione) | — | uguale | ok |
| Duro a Morire | Talento Libero | salvezza tempra 3 (uso_specifico) | salvezza tempra +3 — uso_specifico (a 0 PV, contro nuove Ferite) | — | uguale | ok |
| Guarigione Migliorata | Talento Libero | — | — | Dimezza, arrotondando per eccesso, i giorni necessari per migliorare di uno Stato di Ferita con il recupero ordinario: attività mista 4 giorni anziché 7; riposo assoluto 3 anziché 5; degenza ospedaliera 2 anziché 3. L’attività pesante cont… | uguale | ok |
| Mulo da Soma | Talento Libero | va Atletica 3 (uso_specifico); salvezza tempra 3 (uso_specifico) | va Atletica +3 — uso_specifico (sollevare e trasportare carichi); salvezza tempra +3 — uso_specifico (Affaticamento da trasporto di carichi) | — | uguale | ok |
| Visione Perfetta | Talento Libero | — | Percezione: penalità di distanza e luce ridotte di 3 (src/condizioni.js, regole.json → luce) | — | uguale | ok |
| Controllo del Fallimento | Talento Libero | — | — | Annullare un proprio 20 naturale costa 2 Punti Eroe anziché 3, secondo il §1.8.2. Il risultato diventa un fallimento normale e conserva il Distintivo. Lo sconto riguarda soltanto il proprio Fallimento Maldestro; annullare il Successo Magis… | uguale | ok |
| Successo Magistrale Migliorato | Talento Libero | attacco_ravvicinato | attacco ravvicinato: in «Attacca!» | — | uguale | ok |
| Prova di Caratteristica Migliorata | Talento Libero | caratteristica 3 (uso_specifico) | caratteristica +3 — uso_specifico (Prove dirette di Caratteristica) | — | uguale | ok |
| Prova Salvezza Migliorata | Talento Libero | salvezza | salvezza: cambia nella scheda (salvezze) | — | uguale | ok |
| Resistenza ai Veleni | Talento Libero | salvezza tempra 2 (uso_specifico) | salvezza tempra +2 — uso_specifico (contro l’avvelenamento) | — | uguale | ok |
| Resistenza alle Malattie | Talento Libero | salvezza tempra 2 (uso_specifico) | salvezza tempra +2 — uso_specifico (contro malattie e infezioni) | — | uguale | ok |
| Resistenza all’Affaticamento | Talento Libero | salvezza tempra 2 (uso_specifico) | salvezza tempra +2 — uso_specifico (contro l’Affaticamento) | — | uguale | ok |
| Resistenza alla Paura | Talento Libero | salvezza volonta 2 (uso_specifico) | salvezza volonta +2 — uso_specifico (contro paura e panico) | — | uguale | ok |
| Resistenza al Controllo Mentale | Talento Libero | salvezza volonta 2 (uso_specifico) | salvezza volonta +2 — uso_specifico (contro il controllo mentale) | — | uguale | ok |
| Resistenza alla Corruzione | Talento Libero | salvezza magia 2 (uso_specifico) | salvezza magia +2 — uso_specifico (contro la Corruzione Oscura) | — | uguale | ok |
| Mezzofondista | Talento Libero | — | — | Una volta al giorno, quando sta per subire un peggioramento dell’Affaticamento dovuto a Corsa o Scatto prolungati, marcia forzata o viaggio continuativo, può ridurlo di uno Stato, fino a un minimo di 0. Dichiara l’uso quando il peggioramen… | uguale | ok |
| Movimento Fluido | Talento Libero | attacco_distanza | attacco distanza: in «Attacca!» | riduce di 2 (minimo 0) le penalità di andatura, terreno e appoggi instabili in ogni Prova penalizzata (Corsa da −2 a 0, Scatto da −6 a −4); la scheda non le toglie dai VA. | uguale | ok |
| Scattante | Talento Libero | movimento | movimento: cambia nella scheda (movimento) | — | uguale | ok |
| Carica Migliorata | Maestria | attacco_ravvicinato | attacco ravvicinato: in «Attacca!» | — | uguale | ok |
| Imboscata Migliorata | Maestria | attacco_ravvicinato | attacco ravvicinato: in «Attacca!» | — | uguale | ok |
| Incalzare Migliorato | Maestria | attacco_ravvicinato | attacco ravvicinato: in «Attacca!» | — | uguale | ok |
| Movimento Evasivo Migliorato | Maestria | — | — | Quando effettua Movimento Evasivo, le penalità degli avversari per colpirlo diventano −4 VA al Passo, −6 in Corsa e −8 in Scatto. Restano i costi, le penalità personali e le eventuali Prove di Movimento. Non evita gli attacchi di opportuni… | uguale | ok |
| Ritirata Migliorata | Maestria | — | — | Durante il Movimento effettuato con Ritirata evita tutti gli attacchi di opportunità, anche quelli di avversari con cui non era impegnato all’inizio del Movimento. Si applicano gli altri costi, limiti e incompatibilità di Ritirata (§5.2). | uguale | ok |
| Pistolero | Maestria | attacco_ravvicinato | attacco ravvicinato: in «Attacca!» | — | uguale | ok |
| Duellante | Maestria | attacco_ravvicinato | attacco ravvicinato: in «Attacca!» | — | uguale | ok |
| Fuoco di Soppressione Migliorato | Maestria | attacco_distanza | attacco distanza: in «Attacca!» | — | uguale | ok |
| Tiro a Bruciapelo Migliorato | Maestria | attacco_distanza | attacco distanza: in «Attacca!» | — | uguale | ok |
| Tiro Rapido Migliorato | Maestria | attacco_distanza | attacco distanza: in «Attacca!» | — | uguale | ok |
| Tiro Mirato Migliorato | Maestria | attacco_distanza | attacco distanza: in «Attacca!» | — | uguale | ok |
| Tiro a Lunga Distanza | Maestria | attacco_distanza | attacco distanza: in «Attacca!» | — | uguale | ok |
| Mira Rapida | Maestria | attacco_distanza | attacco distanza: in «Attacca!» | — | uguale | ok |
| Fuoco di Precisione | Maestria | attacco_distanza | attacco distanza: in «Attacca!» | — | uguale | ok |
| Schermidore | Maestria | attacco_ravvicinato | attacco ravvicinato: in «Attacca!» | — | uguale | ok |
| Affondo Migliorato | Maestria | attacco_ravvicinato | attacco ravvicinato: in «Attacca!» | — | uguale | ok |
| Apertura Tattica | Maestria | — | — | Una volta per Round, quando un alleato colpisce un bersaglio adiacente al personaggio, può spendere 1 AzP ancora disponibile per effettuare immediatamente un Colpo Singolo Ravvicinato contro lo stesso bersaglio. È consentito anche prima o … | uguale | ok |
| Arti Marziali | Talento Libero | attacco_ravvicinato | attacco ravvicinato: in «Attacca!» | — | uguale | ok |
| Colpo di Opportunità Istintivo | Maestria | attacco_ravvicinato | attacco ravvicinato: in «Attacca!» | due Attacchi di Opportunità gratuiti per Round, contro avversari diversi: il conto dei due attacchi si tiene al tavolo. | uguale | ok |
| Colpo Mirato Migliorato | Maestria | attacco_ravvicinato | attacco ravvicinato: in «Attacca!» | — | uguale | ok |
| Combattere alla Cieca | Maestria | attacco_ravvicinato; riduzione_stato 4 (generale) | attacco ravvicinato: in «Attacca!»; riduzione_stato +4 — generale | — | uguale | ok |
| Disarmare Migliorato | Maestria | attacco_ravvicinato | attacco ravvicinato: in «Attacca!» | — | uguale | ok |
| Sbilanciare Migliorato | Maestria | attacco_ravvicinato | attacco ravvicinato: in «Attacca!» | — | uguale | ok |
| Spazzata Migliorata | Maestria | attacco_ravvicinato | attacco ravvicinato: in «Attacca!» | — | uguale | ok |
| Stordire Migliorato | Maestria | attacco_ravvicinato | attacco ravvicinato: in «Attacca!» | — | uguale | ok |
| Copertura Migliorata | Maestria | — | — | Quando beneficia di Copertura Leggera, la penalità avversaria per colpirlo diventa −4 VA e il bonus pertinente a Riflessi +4; con Copertura Media diventano −6 VA e +6. Non rende evitabile un effetto che ignora la copertura e non modifica C… | uguale | ok |
| Copertura Tattica | Maestria | attacco_distanza | attacco distanza: in «Attacca!» | — | uguale | ok |
| Difesa con Due Armi | Maestria | — | — | Mentre impugna due armi ravvicinate a una mano, gli attacchi Ravvicinati contro di lui subiscono −2 VA. Non costituisce una Prova di Parata e non concede Difese aggiuntive. | uguale | ok |
| Parata a Distanza | Maestria | parata 2 (generale) | parata +2 — generale | — | uguale | ok |
| Parata Istintiva | Maestria | — | — | 1 volta per Round: una Parata senza spendere Azioni, anche fuori dalla propria Iniziativa. Restano Prova, requisiti, penalità e limiti della Parata. | uguale | ok |
| Parata Migliorata | Maestria | — | — | Dopo una Parata riuscita con un’arma: danno dimezzato per eccesso e −2 (minimo 0) prima dell’AR; il Magistrale annulla. Non con lo scudo. | uguale | ok |
| Parata Multipla | Maestria | — | — | Porta a due il numero complessivo di Parate gratuite per Round concesso da Parata Istintiva. Restano i requisiti e il divieto di tentare due Difese contro lo stesso attacco. | uguale | ok |
| Schivata Istintiva | Maestria | — | — | Una volta per Round effettua una Schivata spendendo soltanto l’AzM, anche prima o dopo la propria Iniziativa. Restano la Prova, la possibilità fisica di spostarsi e le penalità pertinenti. | uguale | ok |
| Schivata Migliorata | Maestria | — | — | La penalità alla Schivata contro attacchi a Distanza diventa −4 VA; contro una Raffica diventa −6 VA. Restano il costo della Difesa e gli altri requisiti. | uguale | ok |
| Schivata Multipla | Maestria | — | — | Dopo la Schivata concessa da Schivata Istintiva, può effettuare una seconda Schivata nello stesso Round spendendo 1 AzP ancora disponibile. Non consente un secondo tentativo contro il medesimo attacco. | uguale | ok |
| Mani Abili | Talento Libero | — | — | Riduce di 2, fino a un minimo di 0, la penalità degli strumenti improvvisati nelle prove di Tecnologia e di Furtività per scasso meccanico. Servono comunque strumenti almeno parzialmente adatti; non sostituisce materiali indispensabili. Se… | uguale | ok |
| Ingegneria d’Emergenza | Maestria | — | — | Una volta per sessione, con 1 AzP e una Prova riuscita di Tecnologia, rende temporaneamente funzionante per 1d6 Round un dispositivo Rotto, anche a 0 PI. Le prove per utilizzarlo subiscono −2 VA. Non recupera PI e non funziona su un oggett… | uguale | ok |
| Commerciante Esperto | Maestria | — | — | Negli scambi ordinari di beni dal prezzo negoziabile acquista al 10% in meno e vende al 10% in più rispetto al prezzo applicabile. Non richiede una Prova aggiuntiva e non modifica prezzi imposti o non negoziabili. Fra benefici diretti sul … | uguale | ok |
| Diligente | Talento Libero | — | — | Riduce del 25% il tempo di una ricerca strutturata. Non riduce tempi minimi espressamente obbligatori e non garantisce il successo. Fra riduzioni del tempo della stessa attività si applica la migliore: Metodo di Ricerca dell’Accademico con… | uguale | ok |
| Lettura Veloce | Talento Libero | — | — | Legge un testo in un terzo del tempo ordinario. Comprensione, traduzione e individuazione delle informazioni conservano le relative prove e condizioni. Non rivela automaticamente indizi. Sullo stesso tempo non moltiplica il beneficio di Di… | uguale | ok |
| Poliglotta | Talento Libero | — | — | Apprende due lingue aggiuntive. Non concede un bonus generale per comprendere qualsiasi lingua sconosciuta. | uguale | ok |
| Autosufficiente | Talento Libero | — | — | Una volta al giorno, quando sta per subire un peggioramento dell’Affaticamento dovuto a fame, sete o sonno insufficiente, lo riduce di uno stato, fino a un minimo di 0. Non recupera Affaticamento già accumulato e non sostituisce cibo, acqu… | uguale | ok |
| Tiratore Imboscato | Maestria | attacco_distanza | attacco distanza: in «Attacca!» | — | uguale | ok |
| Controllo d’Emergenza | Maestria | — | — | −2 complessivo per Prova (fino a 0) alle penalità a Pilotare da maltempo, turbolenze, visibilità, guasti, danni o perdita di controllo. Non sulle penalità di manovre e Talenti (Manovra Evasiva −4). | uguale | ok |
| Inseguimento | Maestria | va Pilotare 2 (uso_specifico) | va Pilotare +2 — uso_specifico (inseguire o seminare un mezzo) | — | uguale | ok |
| Pilotaggio Acrobatico | Maestria | — | — | Una volta per scena, dichiarandolo prima della Prova, ottiene un normale successo automatico in una singola manovra acrobatica possibile del veicolo, come passaggio stretto, atterraggio o inversione. Restano Azioni e risorse richieste. Non… | uguale | ok |
| Risorse Interiori | Talento Libero | tecniche | tecniche: cambia nella scheda (tecnicheAmmesse) | — | uguale | ok |
| Tecniche Interiori Supplementari | Talento Libero | tecniche | tecniche: cambia nella scheda (tecnicheAmmesse) | — | uguale | ok |
| Usufruitore di Magia | Talento Libero | accessoMagia; incantesimi; livelloMax | accessoMagia: cambia nella scheda (incantesimi, magia); incantesimi: cambia nella scheda (incantesimi); livelloMax: cambia nella scheda (incantesimi) | — | uguale | ok |
| Potenziale Mistico Migliorato | Talento Libero | livelloMaxIncantesimi | livelloMaxIncantesimi: cambia nella scheda (incantesimi) | — | uguale | ok |
| Incrementare Incantesimi | Talento Libero | incantesimi | incantesimi: cambia nella scheda (incantesimi) | — | uguale | ok |
| Lancio in Combattimento | Maestria | magia | magia: cambia nella scheda (magia) | — | uguale | ok |
| Focalizzazione Migliorata | Maestria | magia | magia: cambia nella scheda (magia) | — | uguale | ok |
| Contromagia | Talento Libero | magia | magia: cambia nella scheda (magia) | — | uguale | ok |
| Contromagia Universale | Maestria | magia | magia: cambia nella scheda (magia) | — | uguale | ok |
| Contromagia Migliorata | Maestria | magia | magia: cambia nella scheda (magia) | — | uguale | ok |
| Incantesimi da Lancio | Maestria | magia | magia: cambia nella scheda (magia) | — | uguale | ok |
| Magia Occultata | Maestria | magia | magia: cambia nella scheda (magia) | — | uguale | ok |
| Conversione Migliorata | Maestria | — | — | Nelle operazioni di Convertire Potere e ricarica dei contenitori, il rapporto ordinario migliora da 3:1 a 2:1: ogni gruppo produce 1 PM consumando 2 punti della risorsa di origine. Se il personaggio possiede anche Ricarica Efficiente, il r… | uguale | ok |
| Recupero Meditativo | Talento Libero | meditazione | meditazione: cambia nella scheda (magia) | — | uguale | ok |
| Meditazione Migliorata | Maestria | meditazione | meditazione: cambia nella scheda (magia) | — | uguale | ok |
| Meditazione Estesa | Maestria | meditazione | meditazione: cambia nella scheda (magia) | — | uguale | ok |
| Potere Mistico | Talento Libero | pm | pm: cambia nella scheda (pm) | — | uguale | ok |
| Recupero Mistico | Talento Libero | — | Meditazione e recupero orario dei PM (src/medita.js, regole.json → recupero_pm) | — | uguale | ok |
| Escludere la Componente Somatica | Maestria | lancio | lancio: in «Lancia!» | — | uguale | ok |
| Escludere l’Invocazione | Maestria | lancio | lancio: in «Lancia!» | — | uguale | ok |
| Escludere il Focus | Maestria | lancio | lancio: in «Lancia!» | — | uguale | ok |
| Concentrazione Migliorata | Maestria | salvezza volonta 3 (uso_specifico) | salvezza volonta +3 — uso_specifico (mantenere la Concentrazione) | — | uguale | ok |
| Concentrazione Operativa | Maestria | — | — | Mentre mantiene la Concentrazione su un solo Incantesimo, può utilizzare le normali Azioni del Round e le andature consentite: attaccare, muoversi, usare oggetti e Abilità o svolgere altre attività compatibili con le proprie condizioni. No… | uguale | ok |
| Incantesimi Ampliati | Maestria | lancio | lancio: in «Lancia!» | — | uguale | ok |
| Incantesimi Estesi | Maestria | lancio | lancio: in «Lancia!» | — | uguale | ok |
| Incantesimi Proiettati | Maestria | lancio | lancio: in «Lancia!» | — | uguale | ok |
| Incantesimi Plurimi | Maestria | lancio | lancio: in «Lancia!» | — | uguale | ok |
| Incantesimi Intensificati | Maestria | lancio | lancio: in «Lancia!» | — | uguale | ok |
| Anticipazione Migliorata | Maestria | lancio | lancio: in «Lancia!» | — | uguale | ok |
| Incantesimi Inarrestabili | Maestria | lancio | lancio: in «Lancia!» | — | uguale | ok |
| Incantesimi Massimizzati | Maestria | lancio; massimizza 1 (situazionale) | lancio: in «Lancia!»; massimizza +1 — situazionale | — | uguale | ok |
| Manifestazioni Occultate | Maestria | lancio | lancio: in «Lancia!» | al lancio puoi occultare le manifestazioni visive e sonore puramente magiche: chi potrebbe percepirle fa una Prova di Percezione con −2 VA per notarle. | uguale | ok |
| Ritualista Minore | Talento Libero | — | accesso ai Rituali di Grado I–III (regole.json → rituali, «Lancia!») | — | uguale | ok |
| Ritualista Maggiore | Maestria | — | accesso ai Rituali di Grado IV–VI (regole.json → rituali, «Lancia!») | — | uguale | ok |
| Preparazione Rapida | Maestria | attacco_distanza | attacco distanza: in «Attacca!» | una volta per Round, nella propria Iniziativa, una sola operazione gratuita fra estrarre, cambiare arma o imbracciare: si segna al tavolo. | nuova | ok |
| Ricarica Esperta | Maestria | — | — | una volta per Round, nella propria Iniziativa, una ricarica gratuita (1 AzM o 1 AzP): la scheda calcola le munizioni per operazione, l’uso gratuito si segna al tavolo. | nuova | ok |
| Raffiche Migliorate | Maestria | attacco_distanza | attacco distanza: in «Attacca!» | — | nuova | ok |
| Tiro Ravvicinato Migliorato | Maestria | attacco_distanza | attacco distanza: in «Attacca!» | — | nuova | ok |
| Immobilizzare Migliorato | Maestria | attacco_ravvicinato | attacco ravvicinato: in «Attacca!» | le Prove del bersaglio per liberarsi dalla tua Immobilizzazione subiscono −2 VA: si applica al tavolo (il danno senz’armi della presa è nell’«Attacca!»). | nuova | ok |
| Hacker | Maestria | va Tecnologia 2 (uso_specifico) | va Tecnologia +2 — uso_specifico (intrusione informatica e sorveglianza elettronica) | — | nuova | ok |
| Arti Marziali Migliorate | Maestria | attacco_ravvicinato; va Difese 1 (uso_specifico) | attacco ravvicinato: in «Attacca!»; va Difese +1 — uso_specifico (contro attacchi ravvicinati, senz’armi) | — | nuova | ok |
| Coltelli e Pugnali | Specializzazione | va +1; danno +1 | armi della categoria (armi:coltello): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Spade | Specializzazione | va +1; danno +1 | armi della categoria (armi:spada-leggera): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Asce | Specializzazione | va +1; danno +1 | armi della categoria (armi:ascia-leggera): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Martelli | Specializzazione | va +1; danno +1 | armi della categoria (armi:martello): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Mazze e Bastoni | Specializzazione | va +1; danno +1 | armi della categoria (armi:randello): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Armi Inastate | Specializzazione | va +1; danno +1 | armi della categoria (armi:baionetta-montata): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Armi Flessibili | Specializzazione | va +1; danno +1 | armi della categoria (armi:frusta): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Armi da Pugno | Specializzazione | va +1; danno +1 | armi della categoria (armi:artigli): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Armi a Sega | Specializzazione | va +1; danno +1 | armi della categoria (armi_corporative:elettrosega-csb600): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Scudi | Specializzazione | va +1; danno +1 | — | +1 VA e +1 danno con le armi della categoria Scudi: gli Scudi non hanno ancora un profilo d’attacco nei dati, si applica al tavolo. | nuova | ok |
| Pistole | Specializzazione | va +1; danno +1 | armi della categoria (armi_distanza:pistola-semiautomatica): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Carabine | Specializzazione | va +1; danno +1 | armi della categoria (armi_distanza:carabina): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Fucili d’Assalto | Specializzazione | va +1; danno +1 | armi della categoria (armi_distanza:fucile-d-assalto): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Fucili di Precisione | Specializzazione | va +1; danno +1 | armi della categoria (armi_distanza:fucile-di-precisione): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Fucili a Pallini e Doppiette | Specializzazione | va +1; danno +1 | armi della categoria (armi_distanza:fucile-a-pompa): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Mitragliatori | Specializzazione | va +1; danno +1 | armi della categoria (armi_distanza:mitragliatore-leggero): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Lanciagranate | Specializzazione | va +1; danno +1 | armi della categoria (armi_distanza:lanciagranate): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Lanciarazzi | Specializzazione | va +1; danno +1 | armi della categoria (armi_distanza:lanciarazzi): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Armi da Lancio | Specializzazione | va +1; danno +1 | armi della categoria (armi_distanza:pugnale): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Archi e Balestre | Specializzazione | va +1; danno +1 | armi della categoria (armi_distanza:arco-da-guerra): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Armi al Plasma | Specializzazione | va +1; danno +1 | armi della categoria (armi_distanza:fucile-al-plasma): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Lanciafiamme | Specializzazione | va +1; danno +1 | armi della categoria (armi_distanza:lanciafiamme): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Granate | Specializzazione | va +1; danno +1 | armi della categoria (armi_distanza:granata-a-frammentazione): +1 VA, +1 danno nella scheda dell'arma | — | nuova | ok |
| Armature Mistiche | Specializzazione | va +2 | Artefatti: +2 solo nell'uso descritto (VA 13) | — | nuova | ok |
| Armi Mistiche | Specializzazione | va +2 | Artefatti: +2 solo nell'uso descritto (VA 13) | — | nuova | ok |
| Batterie Mistiche | Specializzazione | va +2 | Artefatti: +2 solo nell'uso descritto (VA 13) | — | nuova | ok |
| Accessori Mistici | Specializzazione | va +2 | Artefatti: +2 solo nell'uso descritto (VA 13) | — | nuova | ok |
| Alchimia | Specializzazione | va +2 | Occultismo: +2 solo nell'uso descritto (VA 16) | — | nuova | ok |
| Misticismo | Specializzazione | va +2 | Occultismo: +2 solo nell'uso descritto (VA 16) | — | nuova | ok |
| Oscura Simmetria | Specializzazione | va +2 | Occultismo: +2 solo nell'uso descritto (VA 16) | — | nuova | ok |
| Elementi | Specializzazione | va +1; pm -1 | Incantesimi Elementi: +1 VA di Potere, -1 PM al costo (minimo 1) in «Lancia!» | — | nuova | ok |
| Cambiamento | Specializzazione | va +1; pm -1 | Incantesimi Cambiamento: +1 VA di Potere, -1 PM al costo (minimo 1) in «Lancia!» | — | nuova | ok |
| Manifestazione | Specializzazione | va +1; pm -1 | Incantesimi Manifestazione: +1 VA di Potere, -1 PM al costo (minimo 1) in «Lancia!» | — | nuova | ok |
| Psionica | Specializzazione | va +1; pm -1 | Incantesimi Psionica: +1 VA di Potere, -1 PM al costo (minimo 1) in «Lancia!» | — | nuova | ok |
| Influenza | Specializzazione | va +1; pm -1 | Incantesimi Influenza: +1 VA di Potere, -1 PM al costo (minimo 1) in «Lancia!» | — | nuova | ok |
| Sintonia | Specializzazione | va +1; pm -1 | Incantesimi Sintonia: +1 VA di Potere, -1 PM al costo (minimo 1) in «Lancia!» | — | nuova | ok |
| Esorcismo | Specializzazione | va +1; pm -1 | Incantesimi Esorcismo: +1 VA di Potere, -1 PM al costo (minimo 1) in «Lancia!» | — | nuova | ok |
| Trascendenza | Specializzazione | va +1; pm -1 | Incantesimi Trascendenza: +1 VA di Potere, -1 PM al costo (minimo 1) in «Lancia!» | — | nuova | ok |
| Incantamento | Specializzazione | va +1; pm -1 | Incantesimi Incantamento: +1 VA di Potere, -1 PM al costo (minimo 1) in «Lancia!» | — | nuova | ok |
| Cerimoniale | Specializzazione | va +2 | Rituali: +2 solo nell'uso descritto (VA 10) | — | nuova | ok |
| Controllo Rituale | Specializzazione | va +2 | Rituali: +2 solo nell'uso descritto (VA 10) | — | nuova | ok |
| Ambienti Artici | Specializzazione | va +2 | Furtività: +2 solo nell'uso descritto (VA 9); Sopravvivenza: +2 solo nell'uso descritto (VA 11) | — | nuova | ok |
| Ambienti Forestali | Specializzazione | va +2 | Furtività: +2 solo nell'uso descritto (VA 9); Sopravvivenza: +2 solo nell'uso descritto (VA 11) | — | nuova | ok |
| Ambienti Desertici | Specializzazione | va +2 | Furtività: +2 solo nell'uso descritto (VA 9); Sopravvivenza: +2 solo nell'uso descritto (VA 11) | — | nuova | ok |
| Ambienti Urbani | Specializzazione | va +2 | Furtività: +2 solo nell'uso descritto (VA 9); Sopravvivenza: +2 solo nell'uso descritto (VA 11) | — | nuova | ok |
| Pianure | Specializzazione | va +2 | Furtività: +2 solo nell'uso descritto (VA 9); Sopravvivenza: +2 solo nell'uso descritto (VA 11) | — | nuova | ok |
| Sottosuolo | Specializzazione | va +2 | Furtività: +2 solo nell'uso descritto (VA 9); Sopravvivenza: +2 solo nell'uso descritto (VA 11) | — | nuova | ok |
| Ambienti Apocalittici | Specializzazione | va +2 | Furtività: +2 solo nell'uso descritto (VA 9); Sopravvivenza: +2 solo nell'uso descritto (VA 11) | — | nuova | ok |
| Acrobatiche | Specializzazione | va +2 | Atletica: +2 solo nell'uso descritto (VA 8); Pilotare: +2 solo nell'uso descritto (VA 10) | — | nuova | ok |
| Resistenza | Specializzazione | va +2 | Atletica: +2 solo nell'uso descritto (VA 8) | — | nuova | ok |
| Manipolazione | Specializzazione | va +2 | Atletica: +2 solo nell'uso descritto (VA 8); Furtività: +2 solo nell'uso descritto (VA 9); Intrattenere: +2 solo nell'uso descritto (VA 8) | — | nuova | ok |
| Sicurezza | Specializzazione | va +2 | Furtività: +2 solo nell'uso descritto (VA 9); Sopravvivenza: +2 solo nell'uso descritto (VA 11); Tecnologia: +2 solo nell'uso descritto (VA 10) | — | nuova | ok |
| Spionaggio | Specializzazione | va +2 | Furtività: +2 solo nell'uso descritto (VA 9); Percezione: +2 solo nell'uso descritto (VA 13); Oratoria: +2 solo nell'uso descritto (VA 12); Raggirare: +2 solo nell'uso descritto (VA 8) | — | nuova | ok |
| Ricercare | Specializzazione | va +2 | Percezione: +2 solo nell'uso descritto (VA 13) | — | nuova | ok |
| Seguire Tracce | Specializzazione | va +2 | Percezione: +2 solo nell'uso descritto (VA 13); Sopravvivenza: +2 solo nell'uso descritto (VA 11) | — | nuova | ok |
| Attività Domestiche | Specializzazione | va +2 | Sopravvivenza: +2 solo nell'uso descritto (VA 11) | — | nuova | ok |
| Erboristeria | Specializzazione | va +2 | Sopravvivenza: +2 solo nell'uso descritto (VA 11); Scienza: +2 solo nell'uso descritto (VA 8); Medicina: +2 solo nell'uso descritto (VA 11) | — | nuova | ok |
| Amministrazione | Specializzazione | va +2 | Cultura: +2 solo nell'uso descritto (VA 9) | — | nuova | ok |
| Arti e Spettacolo | Specializzazione | va +2 | Cultura: +2 solo nell'uso descritto (VA 9); Intrattenere: +2 solo nell'uso descritto (VA 8) | — | nuova | ok |
| Commercio | Specializzazione | va +2 | Cultura: +2 solo nell'uso descritto (VA 9); Oratoria: +2 solo nell'uso descritto (VA 12); Raggirare: +2 solo nell'uso descritto (VA 8) | — | nuova | ok |
| Informazione e Media | Specializzazione | va +2 | Cultura: +2 solo nell'uso descritto (VA 9); Oratoria: +2 solo nell'uso descritto (VA 12); Raggirare: +2 solo nell'uso descritto (VA 8); Tecnologia: +2 solo nell'uso descritto (VA 10) | — | nuova | ok |
| Relazioni Sociali | Specializzazione | va +2 | Cultura: +2 solo nell'uso descritto (VA 9); Oratoria: +2 solo nell'uso descritto (VA 12) | — | nuova | ok |
| Studi Umanistici | Specializzazione | va +2 | Cultura: +2 solo nell'uso descritto (VA 9) | — | nuova | ok |
| Tattiche Militari | Specializzazione | va +2 | Cultura: +2 solo nell'uso descritto (VA 9) | — | nuova | ok |
| Oratoria | Specializzazione | va +2 | Oratoria: +2 solo nell'uso descritto (VA 12) | — | nuova | ok |
| Falsificare | Specializzazione | va +2 | Raggirare: +2 solo nell'uso descritto (VA 8) | — | nuova | ok |
| Gioco d’Azzardo | Specializzazione | va +2 | Raggirare: +2 solo nell'uso descritto (VA 8) | — | nuova | ok |
| Medicina Clinica | Specializzazione | va +2 | Medicina: +2 solo nell'uso descritto (VA 11) | — | nuova | ok |
| Chirurgia | Specializzazione | va +2 | Medicina: +2 solo nell'uso descritto (VA 11) | — | nuova | ok |
| Veterinaria | Specializzazione | va +2 | Medicina: +2 solo nell'uso descritto (VA 11) | — | nuova | ok |
| Cibernetica | Specializzazione | va +2 | Medicina: +2 solo nell'uso descritto (VA 11); Tecnologia: +2 solo nell'uso descritto (VA 10) | — | nuova | ok |
| Laboratorio | Specializzazione | va +2 | Medicina: +2 solo nell'uso descritto (VA 11); Scienza: +2 solo nell'uso descritto (VA 8) | — | nuova | ok |
| Strumentazione | Specializzazione | va +2 | Medicina: +2 solo nell'uso descritto (VA 11); Pilotare: +2 solo nell'uso descritto (VA 10); Tecnologia: +2 solo nell'uso descritto (VA 10) | — | nuova | ok |
| Veicoli Terrestri | Specializzazione | va +2 | Pilotare: +2 solo nell'uso descritto (VA 10) | — | nuova | ok |
| Veicoli Marini | Specializzazione | va +2 | Pilotare: +2 solo nell'uso descritto (VA 10) | — | nuova | ok |
| Veicoli Aerei | Specializzazione | va +2 | Pilotare: +2 solo nell'uso descritto (VA 10) | — | nuova | ok |
| Veicoli Spaziali | Specializzazione | va +2 | Pilotare: +2 solo nell'uso descritto (VA 10) | — | nuova | ok |
| Astronavigazione | Specializzazione | va +2 | Scienza: +2 solo nell'uso descritto (VA 8) | — | nuova | ok |
| Materie Scientifiche | Specializzazione | va +2 | Scienza: +2 solo nell'uso descritto (VA 8) | — | nuova | ok |
| Armamenti e Protezioni | Specializzazione | va +2 | Tecnologia: +2 solo nell'uso descritto (VA 10) | — | nuova | ok |
| Meccatronica | Specializzazione | va +2 | Tecnologia: +2 solo nell'uso descritto (VA 10) | — | nuova | ok |
| Informatica | Specializzazione | va +2 | Tecnologia: +2 solo nell'uso descritto (VA 10) | — | nuova | ok |
| Costruzioni | Specializzazione | va +2 | Tecnologia: +2 solo nell'uso descritto (VA 10) | — | nuova | ok |
| Artigianato | Specializzazione | va +2 | Tecnologia: +2 solo nell'uso descritto (VA 10) | — | nuova | ok |
| Artificiere | Specializzazione | va +2 | Tecnologia: +2 solo nell'uso descritto (VA 10) | — | nuova | ok |
| Sport | Specializzazione | va +3 | Atletica: +3 solo nell'uso descritto (VA 9) | — | nuova | ok |
