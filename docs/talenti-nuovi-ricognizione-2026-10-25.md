# Talenti, Specializzazioni e Maestrie — ricognizione (25/10/2026)

Solo ricognizione: nessun dato, codice o PG toccato. Le prove sui PG sono state fatte **in memoria**, leggendo le copie locali di `personaggi/` (7 PG di 6° livello) e gli `esempi/`; nessun file scritto.

## Il file

- **Dov'è:** `docs/Talenti-nuovi/SIMPLY_RPG_Proposta_Talenti_Specializzazioni_Maestrie_v1.0.pdf` (non ancora tracciato in git: la cartella l'ha messa Marcello).
- **Com'è fatto:** PDF di 9 pagine, «Nuova progressione di Talenti Specializzazioni e Maestrie — Proposta di variazione al regolamento Simply RPG — Versione 1.0, 7 ottobre 2026». Pagine 1–4 regole; 5 catalogo dei Talenti Liberi (39); 6 catalogo delle Maestrie (72); 7–9 elenchi delle Specializzazioni per Classe (25 Classi) e gruppi (86 Specializzazioni). Cita come base il **Giocatore 0.46** e la **Magia 1.3**.
- **Attenzione al testo:** il documento si presenta ancora come **proposta** («da discutere insieme prima dell'eventuale adozione»; «le modalità di conversione dei PG esistenti e la data di adozione sono da concordare»). Marcello dice che è adottato e sovrascrive il manuale: lo si registra così (regola di precedenza in `docs/manuali-drive.md` e `docs/risposte-master.md`), con la conferma chiesta a Davide in A.181.
- **Manuali su Drive al 25/10:** invariati (Giocatore 21/10 12:08, Magia 21/10 12:09, Armamenti 15/10, Equipaggiamento 15/10, E&L 15/10, per-davide 24/10 21:50 già visto stamattina). Il testo nuovo **non è ancora nel manuale**.

## A. Le regole nuove, in parole semplici

**Tre categorie, venti scelte in tutto, una per livello** (più i sei Talenti di Classe, che restano a parte con la loro progressione):

| Categoria | Che cos'è | Livelli | Totale |
|---|---|---|---|
| **Talento Libero** | qualità personali, risorse, accesso a nuove capacità (Buona Costituzione, Usufruitore di Magia…) | 3, 5, 7, 9, 11, 13, 15, 17, 19 | 9 |
| **Maestria** | perfezionamenti di manovre e capacità (Parata Istintiva, Raffiche Migliorate, Hacker…) | 2, 6, 10, 14, 18 (con gli aumenti delle Caratteristiche) | 5 |
| **Specializzazione** | preparazione in un ambito: un tipo di arma, un ambiente, un veicolo, una disciplina | 1, 4, 8, 12, 16, 20 (con i Gradi di Classe, compreso il primo) | 6 |

**Quanti ne spettano al livello N:** si contano i livelli della tabella ≤ N. Al 6° (tutti i PG di oggi): **2 Talenti Liberi, 2 Maestrie, 2 Specializzazioni**, più i 2 Talenti di Classe. Il file lo dice esplicitamente: sono totali, «non acquisizioni da sommare alle vecchie scelte».

**Come si sceglie:**
- **Talenti Liberi e Maestrie:** dai loro cataloghi, rispettando i prerequisiti **al momento dell'acquisizione**. Il cambio di categoria non aggiunge requisiti di livello: una Maestria senza prerequisiti si prende al 2°; una che richiede un Talento Libero preso al 3° si prende dal 6°. Le Maestrie **non** dipendono dall'elenco della Classe.
- **Specializzazioni:** a ogni Grado se ne sceglie una **non ancora posseduta** dall'elenco **della Classe appena aumentata**. Nel multiclasse conta la Classe aumentata in quel momento; cominciare una Classe nuova non dà scelte in più. Una Specializzazione condivisa fra più Classi è una sola e non si riacquista.
  - **Eccezioni che allargano l'elenco** (usano comunque una delle sei scelte): con **Usufruitore di Magia** le nove Specializzazioni di Potere; con **Ritualista Minore o Maggiore** Cerimoniale e Controllo Rituale. Arcanista, Custode, Invocatore, Mistico e Tecnomante hanno sempre le nove di Potere.
  - Possedere una Specializzazione non dà incantesimi, rituali o procedure.
- **Ripetibili ed esclusivi:** valgono i limiti di ogni scheda («il numero di voci conosciute può quindi essere inferiore al numero di acquisizioni spese»). Un Talento ripetibile consuma una scelta per acquisizione (Potenziale Mistico Migliorato: fino a 5, ciascuna una scelta di Talento Libero). Le cinque Maestrie accorpate si prendono una volta sola. Le **Specializzazioni non si ripetono**. Risorse Interiori e Tecniche Interiori Supplementari: l'accesso avuto dalla Classe (Lottatore) non si riacquista per una seconda dotazione. Restano le incompatibilità fra Risorse Interiori, magia personale e Classi taumaturgiche.

**Bonus delle Specializzazioni** (uguali a oggi, più Sport):
- Ordinaria: +2 VA nelle prove pertinenti; più Specializzazioni ordinarie sulla stessa prova danno +2 in tutto.
- Armi: +1 VA e +1 danno con la categoria; l'Abilità resta quella del profilo dell'arma.
- Potere: +1 VA e −1 PM (minimo 1) per gli incantesimi della sottofamiglia, anche senza prova di Potere; non si applica da sola alle Tecniche Interiori.
- Sport: +3 VA alle prove di Atletica della disciplina scelta; con altre Specializzazioni vale il bonus migliore, non la somma.

**Cambiamenti di sostanza:**
- **Accorpamenti in Maestria**: Preparazione Rapida (Estrazione, Cambio, Imbracciatura Rapida: una sola operazione gratuita per Round); Ricarica Esperta (Ricarica Rapida + Migliorata: una ricarica gratuita per Round, **fino a tre** munizioni per operazione); Raffiche Migliorate (+2 VA alla modalità: Breve +4, Media 0, Lunga −4); Tiro Ravvicinato Migliorato (penalità ridotta di 2 e danno +5); Immobilizzare Migliorato (danno alla presa e −2 a liberarsi).
- **Hacker**: Maestria passiva, +2 Tecnologia sempre, **cade il limite di un uso per sessione e sistema**; con Specializzazione in Informatica +4.
- **Potenziale Mistico Migliorato**: resta Talento Libero, fino a 5 (+3 al livello massimo degli incantesimi, da 3 a 18).
- **Arti Marziali Migliorate**: Maestria; requisito Arti Marziali **oppure** il Talento di Classe Addestramento al Combattimento Senz'Armi del Lottatore (che dà l'accesso, non il dado di danno).
- **Sport**: da Talento Libero a Specializzazione.
- **Indirizzi di Classe**: le coppie Terrestre/Spaziale, Marziale/Spirituale… si chiamano così e sono indicative (nell'app il campo si chiama oggi `specializzazioni` in `classi.json`: da rinominare per non confonderlo).

**Che cosa il file non dice** (domande, non deduzioni): come si convertono i PG esistenti (in ordine di livello o tutti insieme al livello attuale), che cosa succede agli incantesimi e alle Tecniche legati a Talenti tolti, in quale fase della creazione si sceglie la Specializzazione del 1° livello. Sezione F.

## B. Vecchio contro nuovo

Il catalogo dell'app ha **119 Talenti Liberi** (87 del §8.6 + 32 magici) e **85 Specializzazioni**. Il file ne ha **39 Talenti Liberi + 72 Maestrie** e **86 Specializzazioni**. Confronto fatto per nome, voce per voce (script nello scratchpad): **nessun Talento di oggi manca nel file**; nessuna Specializzazione di oggi manca; nessuna cambia nome.

### Talenti Liberi di oggi → categoria nuova

**Restano Talenti Liberi, uguali (38):** Buona Costituzione, Struttura Robusta, Duro a Morire, Guarigione Migliorata, Ambidestro, Mulo da Soma, Mezzofondista, Scattante, Movimento Fluido, Autosufficiente, Iniziativa Migliorata, Sempre Allerta, Sonno Leggero, Visione Perfetta, Mani Abili, Diligente, Lettura Veloce, Poliglotta, Controllo del Fallimento, Successo Magistrale Migliorato, Prova di Caratteristica Migliorata, Prova Salvezza Migliorata, Resistenza ai Veleni, alle Malattie, all'Affaticamento, alla Paura, al Controllo Mentale, alla Corruzione, Arti Marziali, Risorse Interiori, Tecniche Interiori Supplementari, Potere Mistico, Recupero Mistico, Recupero Meditativo, Usufruitore di Magia, Incrementare Incantesimi, Contromagia, Ritualista Minore.

**Resta Talento Libero, cambia (1):** Potenziale Mistico Migliorato — il testo del file coincide con la scheda di oggi (fino a 5, da 3 a 18); cambia solo che è esplicitamente Talento Libero «per completare il percorso».

**Diventano Maestria, uguali (66):** Attivazione Tempestiva, Carica Migliorata, Imboscata Migliorata, Incalzare Migliorato, Movimento Evasivo Migliorato, Ritirata Migliorata, Pistolero, Duellante, Schermidore, Difesa con Due Armi, Fuoco di Soppressione Migliorato, Tiro a Bruciapelo Migliorato, Tiro Rapido Migliorato, Tiro Mirato Migliorato, Tiro a Lunga Distanza, Mira Rapida, Fuoco di Precisione, Tiratore Imboscato, Affondo Migliorato, Apertura Tattica, Colpo di Opportunità Istintivo, Colpo Mirato Migliorato, Combattere alla Cieca, Disarmare Migliorato, Sbilanciare Migliorato, Spazzata Migliorata, Stordire Migliorato, Copertura Migliorata, Copertura Tattica, Parata a Distanza, Parata Istintiva, Parata Migliorata, Parata Multipla, Schivata Istintiva, Schivata Migliorata, Schivata Multipla, Ingegneria d'Emergenza, Commerciante Esperto, Controllo d'Emergenza, Inseguimento, Pilotaggio Acrobatico, Meditazione Migliorata, Meditazione Estesa, Lancio in Combattimento, Focalizzazione Migliorata, Concentrazione Migliorata, Concentrazione Operativa, Escludere la Componente Somatica, Escludere l'Invocazione, Escludere il Focus, Contromagia Migliorata, Contromagia Universale, Conversione Migliorata, Incantesimi Ampliati, Estesi, Proiettati, Plurimi, Intensificati, Anticipazione Migliorata, Incantesimi da Lancio, Inarrestabili, Massimizzati, Magia Occultata, Manifestazioni Occultate, Ritualista Maggiore.

**Diventano Maestria e cambiano (4):**

| Oggi | Nel file |
|---|---|
| Tiro Ravvicinato Migliorato | riunisce Istintivo e Migliorato: penalità −2 (leggere da −2 a 0, medie da −4 a −2) **e** danno da +3 a +5 |
| Immobilizzare Migliorato | riunisce Istintivo e Migliorato: danno senz'armi alla presa iniziale **e** −2 VA a liberarsi |
| Hacker | passivo, +2 Tecnologia sempre (intrusione, sorveglianza elettronica), **senza** il limite di un uso per sessione e sistema |
| Arti Marziali Migliorate | requisito Arti Marziali **oppure** Addestramento al Combattimento Senz'Armi (Lottatore), senza il dado di danno |

**Spariscono, accorpati in una Maestria (10):**

| Oggi | Confluisce in |
|---|---|
| Estrazione Rapida, Cambio Rapido, Imbracciatura Rapida | **Preparazione Rapida** (nuova) |
| Ricarica Rapida, Ricarica Migliorata | **Ricarica Esperta** (nuova) — vedi A.182 |
| Raffica Breve, Media, Lunga Migliorata | **Raffiche Migliorate** (nuova) |
| Tiro Ravvicinato Istintivo | Tiro Ravvicinato Migliorato |
| Immobilizzare Istintivo | Immobilizzare Migliorato |

**Diventa Specializzazione (1):** Sport (+3 Atletica di una disciplina, non si somma con altre Specializzazioni).

**Talenti nuovi che oggi non esistono:** Preparazione Rapida, Ricarica Esperta, Raffiche Migliorate (tutte e tre Maestrie). Nessun Talento Libero nuovo.

### Specializzazioni

Le 85 di oggi restano tutte, stessi nomi e stessi bonus; si aggiunge **Sport** (86). Ciò che è nuovo è **chi può sceglierle**: oggi qualunque Specializzazione si prende come Talento Libero; domani solo dall'elenco della Classe del Grado appena preso (elenchi per le 25 Classi verificati: ognuno ha da 10 a 25 voci, nessun nome sconosciuto all'app).

### Contraddizioni con decisioni già approvate (non cambiate: segnalate)

- **Ricarica Esperta «fino a tre» munizioni per operazione** contro la **A.135 / decisione 139 dell'08/10** (2 cartucce per AzP, **4 con Ricarica Migliorata**), recepita anche dal Giocatore 0.47 del 10/10 (`docs/diff-manuali-2026-10-11.md`). Il file è del 7/10 e si basa sulla 0.46: probabilmente non ha visto la decisione. **A.182.**
- Nessun'altra contraddizione trovata con `docs/risposte-master.md` (cercati Hacker, Sport, i Talenti accorpati, Potenziale Mistico, Arti Marziali Migliorate, Imbracciatura).

## C. Come sono fatti oggi i Talenti nell'app

### C.1 Effetti calcolati o copiati — **calcolati, tutti**

È la risposta che conta di più: **nessun effetto di un Talento è scritto nella scheda.** Il file del PG contiene solo le scelte; tutti i valori si ricalcolano a ogni apertura (`src/calc.js` → `src/avanzamento.js`, che rigioca gli eventi di livello) leggendo gli effetti dal catalogo (`talenti_liberi.json → effetti`). Provato in memoria:

| Prova (Torvald Krane, esempio, 6° livello) | PV | Iniziativa | Tempra |
|---|---|---|---|
| con Buona Costituzione + Iniziativa Migliorata | 37 | 7 | 13 |
| con Prova Salvezza Migliorata (Tempra) | 32 | 4 | 14 |
| senza Talenti | **32** | **4** | **13** |

e sui 7 PG locali: togliendo i Talenti, PV, PM, Iniziativa e Salvezze tornano ai valori senza Talenti, senza residui. **Togliere un Talento toglie il suo effetto: niente bonus fantasma.**

Per famiglia di effetto (tutte calcolate):
- **PV, PM, Iniziativa, Movimento, Salvezze** (`effetti.pv`, `pm`, `iniziativa`, `movimento`, `salvezza`): Buona Costituzione, Potere Mistico, Iniziativa Migliorata, Scattante, Prova Salvezza Migliorata — dal rigioco degli eventi.
- **Valori al tavolo** (`effetti.valori`, `src/talenti.js` → `src/condizioni.js`): Sempre Allerta, Struttura Robusta, Duro a Morire, Mulo da Soma, Sport, Prova di Caratteristica Migliorata, le sei Resistenze, Arti Marziali Migliorate, Combattere alla Cieca, Parata a Distanza, Hacker, Inseguimento, Concentrazione Migliorata, Incantesimi Massimizzati.
- **«Attacca!»** (`effetti.attacco_distanza`, `attacco_ravvicinato`, `src/attacco.js`): i 31 Talenti di combattimento, compresi Raffiche, Tiro Ravvicinato, Imbracciatura, manovre.
- **Magia** (`effetti.magia`, `lancio`, `meditazione`, `accessoMagia`, `incantesimi`, `livelloMaxIncantesimi`): i 32 Talenti magici, letti da `src/lancio.js`, `src/medita.js`, `src/avanzamento.js`.
- **Tecniche** (`effetti.tecniche`): Risorse Interiori e Supplementari, la dotazione si ricalcola nel rigioco.
- **Valori di sessione** (PV e PM attuali): seguono i massimi da soli (`allineaSessione` li limita al massimo calcolato).

**Le eccezioni non sono effetti ma scelte collegate**, salvate nello stesso evento o in eventi dopo, e restano se il Talento sparisce:
- **Tecniche Interiori scelte** (`livelli[n].tecniche`): Oshi Nagata ne ha 3 grazie a Risorse Interiori; togliendo il Talento l'app segnala «Tecniche conosciute 3, ammesse 0» (provato). Aiko (esempio): 8 conosciute, ammesse 5.
- **Incantesimi scelti con Usufruitore di Magia o Incrementare Incantesimi** (`livelli[n].incantesimi`): stesso meccanismo, nessun PG locale coinvolto (Dimitri e Lucas sono Taumaturghi, i loro incantesimi vengono dall'Addestramento).
- **Parametri e annotazioni** (Caratteristica, Salvezza, disciplina di Sport): stanno nella scelta del Talento e se ne vanno con lei.
- **Interruttori di sessione** (`sessione.talentiAccesi`, chiavi `libero:<id>:<n>`): restano come chiavi orfane, senza effetto.
- **Nemici fatti da un PG** («PG → nemico», `src/nemico-da-pg.js`): copiano nomi e prima frase dei Talenti nel file del nemico. Sono nemici, non PG: non si toccano.

### C.2 Chi legge i Talenti per nome o identificativo

Quasi tutto passa dai dati, con l'identificativo del Talento scritto in un file JSON. Quando un Talento **resta con lo stesso id**, cambiare categoria non rompe niente. Rompono (o cambiano comportamento) **solo i dieci Talenti accorpati e Sport**.

| Dove | Che cosa legge | Se il Talento sparisce o cambia |
|---|---|---|
| `src/avanzamento.js` (eventi, `controllaTalentoLibero`, `statoLivello`) | `livelli[n].talentoLibero.id`, prerequisiti, molteplicità, `risorse-interiori` (incompatibilità con le Classi taumaturgiche), `prova-salvezza-migliorata` (tetto 18), `contromagia` | Il cuore del lavoro: oggi esiste **un solo tipo** di scelta (`talento_libero` ai livelli dispari) e le Specializzazioni sono Talenti Liberi. Servono due eventi nuovi (`maestria`, `specializzazione`) e i controlli sull'elenco della Classe. Un id sparito diventa «non è un Talento Libero» e l'evento resta incompleto. |
| creazione (`src/ui/` wizard, §2.0) | oggi nessun Talento al 1° livello | Serve la Specializzazione del 1° livello nella creazione. |
| `src/ui/sali.js` («Sali di livello») | `talentoLibero` | Tre scelte diverse, con i loro cataloghi. |
| `src/talenti.js`, `src/condizioni.js` («Bonus dei Talenti», situazionali) | `effetti.valori` per id | Nessun cambiamento per gli id che restano; Hacker va riscritto (senza «una volta per sessione»); Sport spostato fra le Specializzazioni. |
| `src/attacco.js` e `regole.json → modalita_di_fuoco.RB/RM/RL.migliorata.talento` | Raffica Breve, Media, Lunga Migliorata | **Si rompe**: tre id spariscono, sostituiti da Raffiche Migliorate (+2 a tutte e tre). |
| `regole.json → TM, TR, FS .migliorata.talento` | Tiro Mirato, Tiro Rapido, Fuoco di Soppressione Migliorato | Restano: nessun cambio. |
| Tiro Ravvicinato (`effetti.attacco_distanza.ravvicinato`) | due Talenti, `riduzione` e `danno` | Si fondono in un'unica voce con entrambi gli effetti; l'id `tiro-ravvicinato-istintivo` sparisce. |
| Immobilizzare (`effetti.attacco_ravvicinato`) | due Talenti | Come sopra. |
| `src/ricarica.js`, `munizioni.json → ricarica.ricarica_rapida.talento` e `inserimento_singolo.migliorata.talento` | Ricarica Rapida, Ricarica Migliorata (A.135: 2 → 4 cartucce) | **Si rompe**: ids spariti; il numero dipende dalla A.182. |
| Estrazione, Cambio, Imbracciatura Rapida (`effetti.attacco_distanza.imbracciatura`) | tre Talenti | Una sola Maestria con un solo uso per Round condiviso. |
| `src/medita.js` + `regole.json → recupero_pm.recupero_mistico.talento` | Recupero Mistico | Resta (Talento Libero): niente. |
| **Ricarica Efficiente e Conversione Migliorata** (`regole.json → chroma.conversione.talenti_riduzione`, **per nome**; `src/equipaggiamento.js`, `src/medita.js`, tab Artefatti) | rapporto 3:1 → 2:1 → 1:1 per «Medita» e la ricarica dei cristalli | **Nessun effetto:** Ricarica Efficiente è un Talento di Classe (Tecnomante, fuori dal file), Conversione Migliorata resta con lo stesso nome (diventa Maestria). |
| **Potenziale Mistico Migliorato** (`effetti.livelloMaxIncantesimi`) | livello massimo per Usufruitore | Resta: niente. |
| **Addestramento Taumaturgo** (`condizioni_prerequisiti` → `addestramento:Taumaturgo`) | capacità di lanciare, meditare | Non è un Talento: niente. Usufruitore di Magia e Recupero Meditativo restano gli stessi id. |
| **Successo Magistrale Migliorato** (`regole.json → prova.magistrale_migliorato.talento`, `src/prova.js`, «Attacca!») | resta Talento Libero | Niente. |
| Visione Perfetta (`regole.json → illuminazione`), Inseguimento (`veicoli.json`), Ritualista Minore e Maggiore (`regole.json → rituali.accesso`), consumabili mistici (`src/consumabili-mistici.js`) | per id | Restano tutti: niente. |
| Parata e Schivata Istintiva (`src/stampa.js:384`, `src/ui/tab.js:1683`) | id scritti nel codice | Restano (Maestrie): niente. |
| Talenti di Classe (`classi.json`), compresi Risorse Interiori e Supplementari del Lottatore | per nome | Fuori dal file («progressione separata»): niente. Da rinominare il campo `specializzazioni` di `classi.json` in «indirizzi». |
| SS (`src/stampa.js`, `src/ui/stampa.js`) | elenco dei Talenti e delle Specializzazioni | Oggi due elenchi (Talenti, Specializzazioni): diventano tre. |
| `src/cerca-scheda.js` | nomi | Segue i dati. |
| validatore (`src/validate.js`) | `attesi: {"8.6": 87}`, struttura degli effetti, riferimenti per id | **Si ferma** finché non si aggiornano i conteggi e i riferimenti agli id spariti (è il suo mestiere: dirà file, chiave e cosa non torna). |
| `tools/verifica_frasi.mjs` | `condizione` e `nota` degli effetti dei Talenti, cercate nei manuali | Le frasi dei Talenti nuovi o riscritti (Hacker, le tre Maestrie nuove) **non sono nel manuale** finché Davide non lo aggiorna: serve una fonte in più (il testo del file) per non farlo fallire. |
| Giornale offline (`src/giornale.js`) | **non legge i Talenti**: i Talenti stanno in `livelli`, che il giornale non confronta (solo `scelte`, `sessione`, `calendario`) | Vedi E (tablet). |
| Test | 38 file di `tests/` toccano i Talenti; 8 usano id che spariscono (`attacco`, `avanzamento`, `medita`, `medita-costi`, `risposte-el-19`, `talenti`, `talenti-gestiti`, `utility-coerenza`) | Da aggiornare con il lotto dei dati. |
| Strumenti e bestiario | `tools/genera_nemici_umani.mjs`, `tools/taratura_bestiario.mjs`, `bestiario.json → capacita_come_talenti` | Usano id di Talenti per i nemici umani: da riallineare (e la pagina del bestiario online si rigenera). |

### C.3 Dove vivono nella scheda

- **Talenti Liberi e Specializzazioni:** nell'evento del livello in cui si prendono, `livelli[n].talentoLibero = { id, parametro?, annotazione? }` (l'id è quello del catalogo: `buona-costituzione`, `specializzazione-pistole`…). Una Specializzazione è un Talento Libero con un id `specializzazione-…`. Un evento, una scelta.
- **Talenti di Classe:** il fisso si ricava dal Grado; quello a scelta per **nome** in `livelli[n].talentoClasse`, con i parametri in `parametriTalenti`.
- **Scelte collegate:** `livelli[n].tecniche` (id delle Tecniche), `livelli[n].incantesimi` (nomi).
- **Al tavolo:** `sessione.talentiAccesi` (interruttori dei situazionali) e `sessione.bonusTalenti`.
- Nessun elenco di Talenti «calcolato» salvato nel file: la scheda li ricostruisce dagli eventi.

Quindi oggi **un Talento sta in un solo posto**, e il posto è l'evento di un livello dispari. Il formato nuovo ha bisogno di posti nuovi: i livelli 2, 6, 10, 14, 18 (Maestria) e 1, 4, 8, 12, 16, 20 (Specializzazione). Il livello 1 non è un evento ma la creazione.

## D. I personaggi esistenti (copie locali di `personaggi/`, lette e non scritte)

Tutti di 6° livello, tutti con la stessa forma: **2 Talenti Liberi (ai livelli 3 e 5), 0 Specializzazioni, 2 Talenti di Classe**. Con le regole nuove ognuno ha diritto a **2 Talenti Liberi, 2 Maestrie, 2 Specializzazioni** (sei scelte, contro le due di oggi).

| PG | Addestramento, Classe | Talenti Liberi oggi → categoria nuova | Casi da guardare |
|---|---|---|---|
| Botha Pretorius | Combattente, Artigliere II | Tiro Mirato Migliorato (3) → Maestria; Tiro a Lunga Distanza (5) → Maestria | entrambi diventano Maestrie: i due posti di Talento Libero restano vuoti |
| Dimitri Orlav | Taumaturgo, Tecnomante II | Ritualista Minore (3) → Talento Libero; Ritualista Maggiore (5) → Maestria | Ritualista Maggiore richiede il Minore preso prima: con la regola dei prerequisiti in ordine, la Maestria del 2° non può essere Ritualista Maggiore, quella del 6° sì |
| Duncan McDuff | Combattente, Incursore II | Duellante (3) → Maestria; Parata Istintiva (5) → Maestria | entrambi Maestrie |
| Lucas | Taumaturgo, Invocatore II | Incantesimi Estesi (3) → Maestria; Incantesimi Plurimi (5) → Maestria | entrambi Maestrie |
| Michele Giorgetti | Avventuriero, Agente II | Tiro Mirato Migliorato (3) → Maestria; Sempre Allerta (5) → Talento Libero | — |
| Oshi Nagata | Combattente, Assaltatore II | Schermidore (3) → Maestria; **Risorse Interiori** (5) → Talento Libero | **3 Tecniche Interiori** legate a Risorse Interiori: se lunedì il Talento si toglie, le Tecniche restano «in eccesso» (provato) finché non lo riprende — A.184 |
| Pablo Zaion | Lavoratore, Pilota II | Controllo d'Emergenza (3) → Maestria; Inseguimento (5) → Maestria | entrambi Maestrie |

Osservazioni:
- **Nessun PG** ha un Talento che sparisce o cambia: nessuno ha i dieci accorpati, Sport o Hacker. Rimettere gli stessi Talenti nella categoria giusta è sempre possibile, salvo l'ordine dei prerequisiti di Dimitri.
- In 5 PG su 7 **i due Talenti di oggi sono Maestrie**: con le regole nuove quei due posti vanno al 2° e al 6°, e i due Talenti Liberi del 3° e del 5° sono scelte nuove.
- Le **Specializzazioni** sono tutte nuove: una dall'elenco della prima Classe (1° livello) e una dall'elenco della Classe del Grado II (4°, sempre la stessa Classe per tutti e sette).
- In `PersonaggiBackup/` ci sono copie del 04–05/10 degli stessi sette: non usate (più vecchie).

## E. Come proporrei di fare lunedì

### Il flusso

1. **Copia di tutto, prima di toccare niente.** «Salva sessione» (zip completo in `salvataggi/`, con copia su Drive) e, per ogni PG, la copia nello storico: la fa già il server a ogni scrittura (`personaggi/storico/`), e «Modifica master» ne mette un'altra in `backup-master/`. Il ritorno indietro è «Ripristina».
2. **La nota dei Talenti vecchi:** **una riga del registro «Modifiche del master»** (`correzioni_master`, tipo `scelta`) con data, «Talenti prima della riforma del 26/10: Schermidore (liv 3), Risorse Interiori (liv 5) — Tecniche: …». Perché lì:
   - è già nella scheda (tab Identità), datata, leggibile da tutti e in sola lettura per i giocatori;
   - non la cancella «Nuova sessione» né un livello;
   - il server non la lascia togliere da un tablet (blocchi del master);
   - **e ha un effetto utile sui tablet**: con una modifica del master nel file, la scheda di un tablet prende la versione del master senza «Tieni la mia» (regola del 12/10). Un tablet con una copia vecchia non rimette i Talenti tolti.
   - Limite: il motivo ha 200 caratteri, bastano per due Talenti e le Tecniche di oggi.
3. **La rimozione:** per ogni evento di livello si toglie `talentoLibero`. **Non serve una migrazione che sottragga effetti**: sono tutti calcolati (C.1). Restano da decidere le scelte collegate (Tecniche di Oshi: A.184). Dopo la rimozione la scheda dice «scegli un Talento Libero» negli eventi del 3° e del 5°: è lo stesso meccanismo dei punti mancanti («Assegna»), che blocca la salita di livello finché non si completa. Questo va bene.
4. **La scelta guidata, un Talento alla volta** (dopo il lotto 2):
   - **chi:** il giocatore dal tablet con Davide accanto, oppure Davide da «Modifica master». Consiglio il tablet: ogni scelta resta registrata e Davide approva vedendo la scheda. L'ultima parola resta a Davide: l'app avvisa (prerequisito mancante, voce non nell'elenco della Classe) e non blocca;
   - **come appare:** un riquadro in testa alla SD, simile a «Assegna»: «Da scegliere: 2 Talenti Liberi, 2 Maestrie, 2 Specializzazioni», un pulsante per categoria, e per ogni posto il suo livello (Maestria del 2°, Talento Libero del 3°, Specializzazione del 4° dall'elenco dell'Artigliere…);
   - **effetto:** subito sulla scheda, perché la scelta va nell'evento e la scheda si ricalcola (come oggi);
   - **prerequisiti:** controllati al livello del posto (A.183): con «tutti insieme» si controllano al 6°.
5. **Tablet e coda offline:**
   - **i Talenti non passano dal giornale offline** (stanno in `livelli`): nessuna voce in coda può rimettere un Talento vecchio;
   - restano le chiavi `talentiAccesi` dei Talenti tolti, innocue;
   - il rischio vero è un tablet che, collegato, scrive il file intero con i `livelli` vecchi. Lo copre la riga del registro del punto 2 (la scheda del tablet prende la versione del master);
   - per sicurezza, **lunedì i tablet si chiudono prima della migrazione e si riaprono dopo**.
   - Da sapere in generale, fuori da questo lavoro: un livello fatto offline non va nel giornale e non passa dall'approvazione del Direttore.
6. **Dove si esegue:**
   - **rimozione e nota:** un programma a doppio clic sul PC di Davide, come la pulizia e «Ripristina» (`tools/…mjs` più `.bat`). Server spento, rapporto prima (PG per PG: livello, Talenti che si tolgono, nota che si scrive, Tecniche coinvolte), conferma solo scrivendo **SI**, niente fatto se si chiude la finestra, copia zip di `personaggi/` prima di scrivere;
   - **scelte nuove:** dall'app, dove i dati, i controlli e la scheda ci sono già.

### I lotti, in ordine

| Lotto | Che cosa | Modello consigliato | Per lunedì? |
|---|---|---|---|
| **0. Rimozione con nota** | programma a doppio clic: copia zip, rapporto, SI, per ogni PG riga nel registro del master e `talentoLibero` tolto dagli eventi; prova su copie in cartella temporanea; Tecniche e incantesimi collegati lasciati come sono (segnalati nel rapporto) | Sonnet | **sì, è il minimo** |
| 1. Dati e motore | categoria in ogni voce (`talento_libero`, `maestria`, `specializzazione`), le 3 Maestrie nuove con effetti, i 10 accorpati tolti, Sport spostato, Hacker riscritto, Potenziale/Arti Marziali Migliorate; eventi nuovi in `regole.json → avanzamento` (maestria al 2/6/10/14/18, specializzazione all'1/4/8/12/16/20); elenchi delle Specializzazioni per Classe con i gruppi e le eccezioni di Usufruitore e Ritualista; controlli in `controllaTalentoLibero`; validatore, `verifica_frasi` (fonte: il file), test; campo `indirizzi` in `classi.json` | **Opus** (tocca il cuore dell'avanzamento e molti test) | no |
| 2. Scelta guidata | «Da scegliere» per categoria nella SD, completamento degli eventi vuoti un posto alla volta (stesso impianto di «Assegna»), Sali di livello con tre scelte, creazione con la Specializzazione del 1° livello | Opus | no |
| 3. Stampa e contorno | SS con tre elenchi, ricerca, tooltip, nemici umani e bestiario online rigenerati, «PG → nemico» | Sonnet | no |
| 4. Controllo col manuale | quando Davide incolla il testo nel Giocatore: confronto parola per parola con il file, poi la regola di precedenza si toglie | Sonnet | no |

### Il minimo per lunedì, e il ripiego

**Il minimo con la scelta guidata non è realistico per domani.** Le scelte nuove non hanno un posto nella scheda finché non c'è il lotto 1: oggi l'app ha due posti (3° e 5°), ne servono sei, in tre categorie diverse. Il lotto 1 da solo, fatto bene con i test, è un giorno di lavoro.

**Ripiego proposto:**
- **Lunedì:** copia, nota e rimozione (lotto 0). Ogni giocatore sceglie i nuovi Talenti **a mano**, su un foglio o nel Doc del gruppo, con il catalogo del PDF. Al tavolo gli effetti dei nuovi Talenti li applica il giocatore a voce, come si fa già con i Talenti senza effetti nell'app; per i numeri che contano (PV di Buona Costituzione, Iniziativa) Davide può usare «Modifica master» → ✎, da togliere quando arriva il lotto 2.
- **Dopo:** lotti 1 e 2. La scelta guidata riporta nell'app le scelte del foglio, un posto alla volta.

**Alternativa più prudente:** lunedì solo copia e nota, Talenti lasciati nell'app finché non c'è il lotto 2. Si evita una settimana di schede senza Talenti, al prezzo di qualche bonus vecchio ancora attivo. Al tavolo resta «Bonus dei Talenti» (⚙) per spegnerli tutti in un colpo.

## F. Domande per Davide (A.181–A.185)

- **A.181 — Il file sui Talenti è adottato?** Il PDF «Proposta di variazione al regolamento», versione 1.0 del 7 ottobre 2026, dice ancora «da discutere prima dell'eventuale adozione» e «modalità di conversione e data di adozione da concordare». Marcello lo dà per adottato da lunedì 26/10 e prevalente sul Manuale del Giocatore. Si conferma che la versione 1.0 è quella definitiva, o ce n'è una più recente?
- **A.182 — Ricarica Esperta: tre munizioni o le cartucce della A.135?** Il file (7/10) dice che ogni operazione di ricarica a munizione singola ne inserisce **fino a tre**. La A.135 (risposta dell'08/10, decisione 139, poi nel Giocatore 0.47) dice **2 cartucce per AzP, 4 con Ricarica Migliorata**, per tutte le armi caricate direttamente. Ricarica Esperta prende il posto di Ricarica Migliorata: vale «4 per AzP» della A.135 o «fino a tre» del file? E l'operazione gratuita per Round porta 2, 3 o 4 cartucce?
- **A.183 — Come si convertono i PG esistenti?** Lunedì i sette PG (tutti 6° livello) passano da 2 Talenti a 2 Talenti Liberi, 2 Maestrie e 2 Specializzazioni.
  - (a) Le scelte si fanno **come se fossero prese ai rispettivi livelli**, cioè con i prerequisiti in ordine? In quel caso la Maestria del 2° livello non può richiedere un Talento Libero del 3°: Dimitri potrebbe riprendere Ritualista Maggiore solo come Maestria del 6°. Oppure si sceglie **tutto insieme al 6° livello**, con i soli prerequisiti fra le scelte nuove?
  - (b) La Specializzazione del 1° livello va presa dall'elenco della prima Classe e quella del 4° dall'elenco della Classe presa al Grado II, come per un PG nuovo?
- **A.184 — Incantesimi e Tecniche legati a un Talento tolto.** Oshi Nagata conosce 3 Tecniche Interiori grazie a Risorse Interiori; un PG con Usufruitore di Magia o Incrementare Incantesimi conosce incantesimi grazie al Talento.
  - Se il giocatore riprende lo stesso Talento, tiene le stesse Tecniche e gli stessi incantesimi?
  - Se non lo riprende, li perde?
  - Se ne prende un altro che dà accesso, li risceglie?
- **A.185 — In quale momento della creazione si sceglie la Specializzazione del 1° livello?** Il file la lega al Grado iniziale: va nella fase della Classe (§2.0) e dall'elenco di quella Classe? E per un Taumaturgo valgono già al 1° livello le nove Specializzazioni di Potere?

(Non sono domande, ma da sapere: le Maestrie non dipendono dalla Classe; Sport compare negli elenchi di Esploratore, Assaltatore, Lottatore, Operaio e Artista; Hacker con Specializzazione in Informatica fa +4, e non vale il tetto delle Specializzazioni perché Hacker non è una Specializzazione.)

## Pacchetto per il Doc «per-davide.md»

Nuove voci aperte A.181–A.185 (testo qui sopra). Niente da spostare in «Risolte».
