# Censimento dei Talenti: effetti numerici nei valori effettivi

30 settembre 2026. Fonti: `data/talenti_liberi.json` (Giocatore §8.6, Magia sez. 1) e `data/classi.json` (Talenti fissi e a scelta delle 25 Classi, Giocatore cap. 3). Non ci sono Talenti di Corporazione nei dati: le Corporazioni danno solo +1 alle Abilità e alle Salvezze (già nel calcolo). Metodo come in `docs/proprieta-armature.md`: ogni Talento con il suo testo, la classificazione e, dove il testo dà un numero sui valori del personaggio, gli effetti nello schema degli oggetti (`docs/effetti-oggetti.md`). Generato da `tools/effetti_talenti.py --doc` (la stessa tabella scrive i dati con `--dati`).

## Classificazione

- **generale**: vale sempre, entra nel valore effettivo.
- **situazionale**: il giocatore lo accende al tavolo quando ricorre la circostanza scritta in `condizione`.
- **uso_specifico**: vale per un tipo di Prova (`uso`): valore a parte accanto all’Abilità o alla Salvezza.
- **testuale**: nessun numero sui valori del personaggio, oppure un bonus momentaneo, per gli alleati o una penalità dell’avversario; oppure un numero che l’app non può applicare (motivo indicato). Resta testo del Talento.
- **rimandato**: il manuale non definisce il valore o è ambiguo: `TODO(Davide)` nella voce.
- **già gestito**: il motore lo applica già (chiavi di `effetti` lette da `src/attacco.js`, `src/lancio.js`, `src/avanzamento.js`, `src/incantesimi.js`, oppure per nome).

## Conteggi

**319 Talenti** (119 Liberi, 200 di Classe). Un Talento con effetti di più ambiti conta in ciascuno.

| Categoria | Talenti |
|---|---|
| generale | 3 |
| situazionale | 7 |
| uso_specifico | 52 |
| testuale | 148 |
| rimandato | 1 |
| già gestito | 110 |

Talenti con effetti tipizzati nuovi: **61**, per **97 effetti** (`effetti.valori`).

## Tipi dello schema

Nuovi o estesi per i Talenti (anche in `docs/effetti-oggetti.md` e nel validatore):
- `salvezza` con ambito **generale** o **situazionale** (Scudo Spirituale): entra nella Prova Salvezza effettiva; `resistenza: true` per le Resistenze specifiche (§8.6: strutturale + Prova Salvezza Migliorata + Resistenza non oltre 18).
- `parata` (nuovo): `con: "scudo"`, `contro: "distanza"`, generale (Parata a Distanza: la penalità della Parata a distanza con lo scudo passa da −4 a −2).
- `danno` con `armi: "artefatto"` (Meccanica Potenziata: armi Mistiche o TecnoMistiche, cioè Artefatto).
- `caratteristica` e `va` con `{parametro}` e `{annotazione}`: la scelta del giocatore (Prova di Caratteristica Migliorata, Sport).

## Talenti

### Talenti Liberi

| Talento | Fonte | Categoria | Effetto o nota |
|---|---|---|---|
| Attivazione Tempestiva | Giocatore §8.6 | testuale | nessun valore numerico del personaggio |
| Ambidestro | Giocatore §8.6.1 | già gestito | attacco_ravvicinato → src/attacco.js |
| Iniziativa Migliorata | Giocatore §8.6.1 | già gestito | iniziativa → src/avanzamento.js |
| Sempre Allerta | Giocatore §8.6.1 | uso_specifico | +3 VA a Percezione (solo per imboscate e pericoli improvvisi) |
| Sonno Leggero | Giocatore §8.6.1 | testuale | nessun valore numerico del personaggio |
| Buona Costituzione | Giocatore §8.6.1 | già gestito | pv → src/avanzamento.js |
| Struttura Robusta | Giocatore §8.6.1 | uso_specifico | +3 alla PS di Tempra (solo per per evitare una Menomazione) |
| Duro a Morire | Giocatore §8.6.1 | uso_specifico | +3 alla PS di Tempra (solo per a 0 PV, contro nuove Ferite) |
| Guarigione Migliorata | Giocatore §8.6.1 | testuale | nessun valore numerico del personaggio |
| Mulo da Soma | Giocatore §8.6.1 | uso_specifico | +3 VA a Atletica (solo per sollevare e trasportare carichi); +3 alla PS di Tempra (solo per Affaticamento da trasporto di carichi) |
| Sport | Giocatore §8.6.1 | uso_specifico | +3 VA a Atletica (solo per sport: {annotazione}) |
| Visione Perfetta | Giocatore §8.6.1 | testuale | nessun valore numerico del personaggio |
| Controllo del Fallimento | Giocatore §8.6.1 | testuale | nessun valore numerico del personaggio |
| Successo Magistrale Migliorato | Giocatore §8.6.1 | già gestito | attacco_ravvicinato → src/attacco.js |
| Prova di Caratteristica Migliorata | Giocatore §8.6.2 | uso_specifico | +3 alle Prove di Caratteristica ({parametro}) (solo per Prove dirette di Caratteristica) |
| Prova Salvezza Migliorata | Giocatore §8.6.2 | già gestito | salvezza → src/avanzamento.js |
| Resistenza ai Veleni | Giocatore §8.6.3 | uso_specifico | +2 alla PS di Tempra (solo per contro l’avvelenamento) |
| Resistenza alle Malattie | Giocatore §8.6.3 | uso_specifico | +2 alla PS di Tempra (solo per contro malattie e infezioni) |
| Resistenza all’Affaticamento | Giocatore §8.6.3 | uso_specifico | +2 alla PS di Tempra (solo per contro l’Affaticamento) |
| Resistenza alla Paura | Giocatore §8.6.3 | uso_specifico | +2 alla PS di Volontà (solo per contro paura e panico) |
| Resistenza al Controllo Mentale | Giocatore §8.6.3 | uso_specifico | +2 alla PS di Volontà (solo per contro il controllo mentale) |
| Resistenza alla Corruzione | Giocatore §8.6.3 | uso_specifico | +2 alla PS di Magia (solo per contro la Corruzione Oscura) |
| Mezzofondista | Giocatore §8.6.4 | testuale | nessun valore numerico del personaggio |
| Movimento Fluido | Giocatore §8.6.4 | già gestito | attacco_distanza → src/attacco.js |
| Scattante | Giocatore §8.6.4 | già gestito | movimento → src/avanzamento.js |
| Carica Migliorata | Giocatore §8.6.4 | già gestito | attacco_ravvicinato → src/attacco.js |
| Imboscata Migliorata | Giocatore §8.6.4 | già gestito | attacco_ravvicinato → src/attacco.js |
| Incalzare Migliorato | Giocatore §8.6.4 | già gestito | attacco_ravvicinato → src/attacco.js |
| Movimento Evasivo Migliorato | Giocatore §8.6.4 | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Ritirata Migliorata | Giocatore §8.6.4 | testuale | nessun valore numerico del personaggio |
| Estrazione Rapida | Giocatore §8.6.4 | testuale | nessun valore numerico del personaggio |
| Cambio Rapido | Giocatore §8.6.4 | testuale | nessun valore numerico del personaggio |
| Imbracciatura Rapida | Giocatore §8.6.4 | già gestito | attacco_distanza → src/attacco.js |
| Ricarica Rapida | Giocatore §8.6.4 | già gestito | data/equipaggiamento/munizioni.json → ricarica, src/ui/tab.js (promemoria) |
| Ricarica Migliorata | Giocatore §8.6.4 | già gestito | src/ricarica.js e src/sessione.js (munizioni per operazione) |
| Pistolero | Giocatore §8.6.5 | già gestito | attacco_ravvicinato → src/attacco.js |
| Duellante | Giocatore §8.6.5 | già gestito | attacco_ravvicinato → src/attacco.js |
| Raffica Breve Migliorata | Giocatore §8.6.5 | già gestito | attacco_distanza → src/attacco.js |
| Raffica Media Migliorata | Giocatore §8.6.5 | già gestito | attacco_distanza → src/attacco.js |
| Raffica Lunga Migliorata | Giocatore §8.6.5 | già gestito | attacco_distanza → src/attacco.js |
| Fuoco di Soppressione Migliorato | Giocatore §8.6.5 | già gestito | attacco_distanza → src/attacco.js |
| Tiro Ravvicinato Istintivo | Giocatore §8.6.5 | già gestito | attacco_distanza → src/attacco.js |
| Tiro Ravvicinato Migliorato | Giocatore §8.6.5 | già gestito | attacco_distanza → src/attacco.js |
| Tiro a Bruciapelo Migliorato | Giocatore §8.6.5 | già gestito | attacco_distanza → src/attacco.js |
| Tiro Rapido Migliorato | Giocatore §8.6.5 | già gestito | attacco_distanza → src/attacco.js |
| Tiro Mirato Migliorato | Giocatore §8.6.5 | già gestito | attacco_distanza → src/attacco.js |
| Tiro a Lunga Distanza | Giocatore §8.6.5 | già gestito | attacco_distanza → src/attacco.js |
| Mira Rapida | Giocatore §8.6.5 | già gestito | attacco_distanza → src/attacco.js |
| Fuoco di Precisione | Giocatore §8.6.5 | già gestito | attacco_distanza → src/attacco.js |
| Schermidore | Giocatore §8.6.6 | già gestito | attacco_ravvicinato → src/attacco.js |
| Affondo Migliorato | Giocatore §8.6.6 | già gestito | attacco_ravvicinato → src/attacco.js |
| Apertura Tattica | Giocatore §8.6.6 | testuale | nessun valore numerico del personaggio |
| Arti Marziali | Giocatore §8.6.6 | già gestito | attacco_ravvicinato → src/attacco.js |
| Arti Marziali Migliorate | Giocatore §8.6.6 | uso_specifico | +1 VA a Difese (solo per contro attacchi ravvicinati, senz’armi) · già gestito in parte: src/attacco.js |
| Colpo di Opportunità Istintivo | Giocatore §8.6.6 | già gestito | attacco_ravvicinato → src/attacco.js |
| Colpo Mirato Migliorato | Giocatore §8.6.6 | già gestito | attacco_ravvicinato → src/attacco.js |
| Combattere alla Cieca | Giocatore §8.6.6 | già gestito | attacco_ravvicinato → src/attacco.js |
| Disarmare Migliorato | Giocatore §8.6.6 | già gestito | attacco_ravvicinato → src/attacco.js |
| Immobilizzare Istintivo | Giocatore §8.6.6 | già gestito | attacco_ravvicinato → src/attacco.js |
| Immobilizzare Migliorato | Giocatore §8.6.6 | già gestito | attacco_ravvicinato → src/attacco.js |
| Sbilanciare Migliorato | Giocatore §8.6.6 | già gestito | attacco_ravvicinato → src/attacco.js |
| Spazzata Migliorata | Giocatore §8.6.6 | già gestito | attacco_ravvicinato → src/attacco.js |
| Stordire Migliorato | Giocatore §8.6.6 | già gestito | attacco_ravvicinato → src/attacco.js |
| Copertura Migliorata | Giocatore §8.6.7 | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Copertura Tattica | Giocatore §8.6.7 | già gestito | attacco_distanza → src/attacco.js |
| Difesa con Due Armi | Giocatore §8.6.7 | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Parata a Distanza | Giocatore §8.6.7 | generale | +2 alla Parata a distanza con lo scudo |
| Parata Istintiva | Giocatore §8.6.7 | testuale | nessun valore numerico del personaggio |
| Parata Migliorata | Giocatore §8.6.7 | testuale | nessun valore numerico del personaggio |
| Parata Multipla | Giocatore §8.6.7 | testuale | nessun valore numerico del personaggio |
| Schivata Istintiva | Giocatore §8.6.7 | testuale | nessun valore numerico del personaggio |
| Schivata Migliorata | Giocatore §8.6.7 | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Schivata Multipla | Giocatore §8.6.7 | testuale | nessun valore numerico del personaggio |
| Hacker | Giocatore §8.6.9 | uso_specifico | +2 VA a Tecnologia (solo per intrusione informatica e sorveglianza elettronica) |
| Mani Abili | Giocatore §8.6.9 | testuale | nessun valore numerico del personaggio |
| Ingegneria d’Emergenza | Giocatore §8.6.9 | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Commerciante Esperto | Giocatore §8.6.9 | testuale | nessun valore numerico del personaggio |
| Diligente | Giocatore §8.6.9 | testuale | nessun valore numerico del personaggio |
| Lettura Veloce | Giocatore §8.6.9 | testuale | nessun valore numerico del personaggio |
| Poliglotta | Giocatore §8.6.9 | testuale | nessun valore numerico del personaggio |
| Autosufficiente | Giocatore §8.6.9 | testuale | nessun valore numerico del personaggio |
| Tiratore Imboscato | Giocatore §8.6.9 | già gestito | attacco_distanza → src/attacco.js |
| Controllo d’Emergenza | Giocatore §8.6.9 | testuale | nessun valore numerico del personaggio |
| Inseguimento | Giocatore §8.6.9 | uso_specifico | +2 VA a Pilotare (solo per inseguire o seminare un mezzo) |
| Pilotaggio Acrobatico | Giocatore §8.6.9 | testuale | nessun valore numerico del personaggio |
| Risorse Interiori | Giocatore §8.6.10 | già gestito | tecniche → src/avanzamento.js |
| Tecniche Interiori Supplementari | Giocatore §8.6.10 | già gestito | tecniche → src/avanzamento.js |
| Usufruitore di Magia | Magia sez. 1 | già gestito | accessoMagia → src/incantesimi.js, incantesimi → src/incantesimi.js, livelloMax → src/incantesimi.js |
| Potenziale Mistico Migliorato | Magia sez. 1 | già gestito | livelloMaxIncantesimi → src/incantesimi.js |
| Incrementare Incantesimi | Magia sez. 1 | già gestito | incantesimi → src/incantesimi.js |
| Lancio in Combattimento | Magia sez. 1 | già gestito | magia → src/avanzamento.js |
| Focalizzazione Migliorata | Magia sez. 1 | già gestito | magia → src/avanzamento.js |
| Contromagia | Magia sez. 1 | già gestito | magia → src/avanzamento.js |
| Contromagia Universale | Magia sez. 1 | già gestito | magia → src/avanzamento.js |
| Contromagia Migliorata | Magia sez. 1 | già gestito | magia → src/avanzamento.js |
| Incantesimi da Lancio | Magia sez. 1 | già gestito | magia → src/avanzamento.js |
| Magia Occultata | Magia sez. 1 | già gestito | magia → src/avanzamento.js |
| Conversione Migliorata | Magia sez. 1 | già gestito | regole.json → chroma (rapporto di conversione) |
| Recupero Meditativo | Magia sez. 1 | già gestito | meditazione → src/avanzamento.js |
| Meditazione Migliorata | Magia sez. 1 | già gestito | meditazione → src/avanzamento.js |
| Meditazione Estesa | Magia sez. 1 | già gestito | meditazione → src/avanzamento.js |
| Potere Mistico | Magia sez. 1 | già gestito | pm → src/avanzamento.js |
| Recupero Mistico | Magia sez. 1 | testuale | nessun valore numerico del personaggio |
| Escludere la Componente Somatica | Magia sez. 1 | già gestito | lancio → src/lancio.js |
| Escludere l’Invocazione | Magia sez. 1 | già gestito | lancio → src/lancio.js |
| Escludere il Focus | Magia sez. 1 | già gestito | lancio → src/lancio.js |
| Concentrazione Migliorata | Magia sez. 1 | uso_specifico | +3 alla PS di Volontà (solo per mantenere la Concentrazione) |
| Concentrazione Operativa | Magia sez. 1 | testuale | nessun valore numerico del personaggio |
| Incantesimi Ampliati | Magia sez. 1 | già gestito | lancio → src/lancio.js |
| Incantesimi Estesi | Magia sez. 1 | già gestito | lancio → src/lancio.js |
| Incantesimi Proiettati | Magia sez. 1 | già gestito | lancio → src/lancio.js |
| Incantesimi Plurimi | Magia sez. 1 | già gestito | lancio → src/lancio.js |
| Incantesimi Intensificati | Magia sez. 1 | già gestito | lancio → src/lancio.js |
| Anticipazione Migliorata | Magia sez. 1 | già gestito | lancio → src/lancio.js |
| Incantesimi Inarrestabili | Magia sez. 1 | già gestito | lancio → src/lancio.js |
| Incantesimi Massimizzati | Magia sez. 1 | già gestito | lancio → src/lancio.js |
| Manifestazioni Occultate | Magia sez. 1 | già gestito | lancio → src/lancio.js |
| Ritualista Minore | Magia sez. 1 | testuale | nessun valore numerico del personaggio |
| Ritualista Maggiore | Magia sez. 1 | testuale | nessun valore numerico del personaggio |

### Talenti di Classe

| Talento | Fonte | Categoria | Effetto o nota |
|---|---|---|---|
| Fuoco Controllato (Agente (fisso, Grado 1)) | Giocatore, Agente (§3.4; Talenti §3.5.2) | già gestito | attacco_distanza → src/attacco.js |
| Rete di Informatori (Agente (fisso, Grado 3)) | Giocatore, Agente (§3.4; Talenti §3.5.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Ottime Credenziali (Agente (fisso, Grado 5)) | Giocatore, Agente (§3.4; Talenti §3.5.2) | situazionale | +4 VA a Cultura (con la condizione accesa); +4 VA a Intrattenere (con la condizione accesa); +4 VA a Oratoria (con la condizione accesa); +4 VA a Raggirare (con la condizione accesa) |
| Reazione Operativa (Agente (a scelta)) | Giocatore, Agente (§3.4; Talenti §3.5.2) | già gestito | src/avanzamento.js (Talento di Classe a scelta) |
| Mira Selettiva (Agente (a scelta)) | Giocatore, Agente (§3.4; Talenti §3.5.2) | già gestito | attacco_distanza → src/attacco.js |
| Analisi Rapida (Agente (a scelta)) | Giocatore, Agente (§3.4; Talenti §3.5.2) | già gestito | attacco_distanza → src/attacco.js |
| Doppia Identità (Agente (a scelta)) | Giocatore, Agente (§3.4; Talenti §3.5.2) | uso_specifico | +3 VA a Cultura (solo per usare o difendere le identità alternative); +3 VA a Oratoria (solo per usare o difendere le identità alternative); +3 VA a Raggirare (solo per usare o difendere le identità alternative) |
| Posizionamento Operativo (Agente (a scelta)) | Giocatore, Agente (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Predatore (Cacciatore (fisso, Grado 1)) | Giocatore, Cacciatore (§3.4; Talenti §3.5.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Segugio (Cacciatore (fisso, Grado 3)) | Giocatore, Cacciatore (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Maestro della Caccia (Cacciatore (fisso, Grado 5)) | Giocatore, Cacciatore (§3.4; Talenti §3.5.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Trappola Improvvisata (Cacciatore (a scelta)) | Giocatore, Cacciatore (§3.4; Talenti §3.5.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Cacciatore Instancabile (Cacciatore (a scelta)) | Giocatore, Cacciatore (§3.4; Talenti §3.5.2) | uso_specifico | +5 alla PS di Tempra (solo per prima PS del gruppo in marcia forzata o inseguimento) |
| Sangue Freddo (Cacciatore (a scelta)) | Giocatore, Cacciatore (§3.4; Talenti §3.5.2) | testuale | numerico non applicato: riduce di 2, una volta al giorno, la penalità di un altro effetto mentale: la applica il giocatore al tavolo |
| Senso dell’Occulto (Cacciatore (a scelta)) | Giocatore, Cacciatore (§3.4; Talenti §3.5.2) | uso_specifico | +2 VA a Occultismo (solo per natura delle creature avvertite) |
| Colpo di Abbattimento (Cacciatore (a scelta)) | Giocatore, Cacciatore (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Apripista (Esploratore (fisso, Grado 1)) | Giocatore, Esploratore (§3.4; Talenti §3.5.2; Specializzazioni dei Talenti a scelta: risposte del master (docs/risposte-master.md)) | testuale | nessun valore numerico del personaggio |
| Occhio del Terreno (Esploratore (fisso, Grado 3)) | Giocatore, Esploratore (§3.4; Talenti §3.5.2; Specializzazioni dei Talenti a scelta: risposte del master (docs/risposte-master.md)) | testuale | nessun valore numerico del personaggio |
| Padrone del Cammino (Esploratore (fisso, Grado 5)) | Giocatore, Esploratore (§3.4; Talenti §3.5.2; Specializzazioni dei Talenti a scelta: risposte del master (docs/risposte-master.md)) | testuale | nessun valore numerico del personaggio |
| Segni di Passaggio (Esploratore (a scelta)) | Giocatore, Esploratore (§3.4; Talenti §3.5.2; Specializzazioni dei Talenti a scelta: risposte del master (docs/risposte-master.md)) | testuale | nessun valore numerico del personaggio |
| Adattamento Estremo (Esploratore (a scelta)) | Giocatore, Esploratore (§3.4; Talenti §3.5.2; Specializzazioni dei Talenti a scelta: risposte del master (docs/risposte-master.md)) | testuale | nessun valore numerico del personaggio |
| Mappa Mentale (Esploratore (a scelta)) | Giocatore, Esploratore (§3.4; Talenti §3.5.2; Specializzazioni dei Talenti a scelta: risposte del master (docs/risposte-master.md)) | testuale | nessun valore numerico del personaggio |
| Rotta Alternativa (Esploratore (a scelta)) | Giocatore, Esploratore (§3.4; Talenti §3.5.2; Specializzazioni dei Talenti a scelta: risposte del master (docs/risposte-master.md)) | testuale | nessun valore numerico del personaggio |
| Avanguardia (Esploratore (a scelta)) | Giocatore, Esploratore (§3.4; Talenti §3.5.2; Specializzazioni dei Talenti a scelta: risposte del master (docs/risposte-master.md)) | testuale | nessun valore numerico del personaggio |
| Colpo Sleale (Lestofante (fisso, Grado 1)) | Giocatore, Lestofante (§3.4; Talenti §3.5.2) | già gestito | attacco_ravvicinato → src/attacco.js |
| Opportunista (Lestofante (fisso, Grado 3)) | Giocatore, Lestofante (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Scambio Sporco (Lestofante (fisso, Grado 5)) | Giocatore, Lestofante (§3.4; Talenti §3.5.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Filo Nascosto (Lestofante (a scelta)) | Giocatore, Lestofante (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Mano Fantasma (Lestofante (a scelta)) | Giocatore, Lestofante (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Fumo e Specchi (Lestofante (a scelta)) | Giocatore, Lestofante (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Ricatto Operativo (Lestofante (a scelta)) | Giocatore, Lestofante (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Fuga tra la Folla (Lestofante (a scelta)) | Giocatore, Lestofante (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Soccorso Immediato (Paramedico (fisso, Grado 1)) | Giocatore, Paramedico (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Strumentazione Efficace (Paramedico (fisso, Grado 3)) | Giocatore, Paramedico (§3.4; Talenti §3.5.2) | uso_specifico | +2 VA a Medicina (solo per Pronto Soccorso con strumenti) |
| Triage Estremo (Paramedico (fisso, Grado 5)) | Giocatore, Paramedico (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Protocollo Shock (Paramedico (a scelta)) | Giocatore, Paramedico (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Evacuazione Medica (Paramedico (a scelta)) | Giocatore, Paramedico (§3.4; Talenti §3.5.2) | testuale | numerico non applicato: toglie il −2 Q del Sovraccarico solo trasportando un ferito: la applica il giocatore al tavolo |
| Campo Sterile (Paramedico (a scelta)) | Giocatore, Paramedico (§3.4; Talenti §3.5.2) | situazionale | +2 VA a Medicina (con la condizione accesa) |
| Diagnosi sul Campo (Paramedico (a scelta)) | Giocatore, Paramedico (§3.4; Talenti §3.5.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Controllo del Trauma (Paramedico (a scelta)) | Giocatore, Paramedico (§3.4; Talenti §3.5.2) | testuale | nessun valore numerico del personaggio |
| Ottimizzare Gittata (Artigliere (fisso, Grado 1)) | Giocatore, Artigliere (§3.4; Talenti §3.5.3) | testuale | nessun valore numerico del personaggio |
| Ottimizzare Proiettili (Artigliere (fisso, Grado 3)) | Giocatore, Artigliere (§3.4; Talenti §3.5.3) | già gestito | attacco_distanza → src/attacco.js |
| Armaiolo da Campo (Artigliere (fisso, Grado 5)) | Giocatore, Artigliere (§3.4; Talenti §3.5.3) | uso_specifico | +2 VA a Tecnologia (solo per riparare armi da fuoco) |
| Postura d’Assedio (Artigliere (a scelta)) | Giocatore, Artigliere (§3.4; Talenti §3.5.3) | già gestito | attacco_distanza → src/attacco.js |
| Raffica Estesa (Artigliere (a scelta)) | Giocatore, Artigliere (§3.4; Talenti §3.5.3) | già gestito | attacco_distanza → src/attacco.js |
| Occhio del Tiratore (Artigliere (a scelta)) | Giocatore, Artigliere (§3.4; Talenti §3.5.3) | testuale | nessun valore numerico del personaggio |
| Bersaglio Designato (Artigliere (a scelta)) | Giocatore, Artigliere (§3.4; Talenti §3.5.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Fuoco di Disturbo (Artigliere (a scelta)) | Giocatore, Artigliere (§3.4; Talenti §3.5.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Mantenere la Posizione (Assaltatore (fisso, Grado 1)) | Giocatore, Assaltatore (§3.4; Talenti §3.5.4) | uso_specifico | +3 alla PS prevista (solo per resistere a spinte, sbilanciamenti e disarmi) |
| Assalto Armato (Assaltatore (fisso, Grado 3)) | Giocatore, Assaltatore (§3.4; Talenti §3.5.4) | testuale | numerico non applicato: riduce la penalità di Movimento di una combinazione precisa di armatura e scudo enorme: l’app non la ricalcola |
| Presidio di Combattimento (Assaltatore (fisso, Grado 5)) | Giocatore, Assaltatore (§3.4; Talenti §3.5.4) | situazionale | +2 VA a Difese (con la condizione accesa) |
| Carica Brutale (Assaltatore (a scelta)) | Giocatore, Assaltatore (§3.4; Talenti §3.5.4) | già gestito | attacco_ravvicinato → src/attacco.js |
| Spinta d’Impatto (Assaltatore (a scelta)) | Giocatore, Assaltatore (§3.4; Talenti §3.5.4) | già gestito | attacco_ravvicinato → src/attacco.js |
| Scudo Aggressivo (Assaltatore (a scelta)) | Giocatore, Assaltatore (§3.4; Talenti §3.5.4) | già gestito | attacco_ravvicinato → src/attacco.js |
| Interposizione Armata (Assaltatore (a scelta)) | Giocatore, Assaltatore (§3.4; Talenti §3.5.4) | testuale | nessun valore numerico del personaggio |
| Coordinazione Offensiva (Assaltatore (a scelta)) | Giocatore, Assaltatore (§3.4; Talenti §3.5.4) | già gestito | attacco_ravvicinato → src/attacco.js |
| Movimento Tattico (Incursore (fisso, Grado 1)) | Giocatore, Incursore (§3.4; Talenti §3.5.4) | già gestito | attacco_distanza → src/attacco.js |
| Rapidità Operativa (Incursore (fisso, Grado 3)) | Giocatore, Incursore (§3.4; Talenti §3.5.4) | già gestito | attacco_distanza → src/attacco.js, attacco_ravvicinato → src/attacco.js, iniziativa → src/avanzamento.js |
| Colpisci e Sparisci (Incursore (fisso, Grado 5)) | Giocatore, Incursore (§3.4; Talenti §3.5.4) | già gestito | attacco_ravvicinato → src/attacco.js |
| Attacco Silenzioso (Incursore (a scelta)) | Giocatore, Incursore (§3.4; Talenti §3.5.4) | uso_specifico | +2 VA a Furtività (solo per avvicinarsi a un avversario senza essere visto) · già gestito in parte: src/attacco.js |
| Punto Vitale (Incursore (a scelta)) | Giocatore, Incursore (§3.4; Talenti §3.5.4) | già gestito | attacco_distanza → src/attacco.js, attacco_ravvicinato → src/attacco.js |
| Carica Ottimizzata (Incursore (a scelta)) | Giocatore, Incursore (§3.4; Talenti §3.5.4) | testuale | nessun valore numerico del personaggio |
| Sabotaggio Rapido (Incursore (a scelta)) | Giocatore, Incursore (§3.4; Talenti §3.5.4) | uso_specifico | +2 VA a Tecnologia (solo per sabotare o disattivare dispositivi) |
| Piano di Riserva (Incursore (a scelta)) | Giocatore, Incursore (§3.4; Talenti §3.5.4) | testuale | nessun valore numerico del personaggio |
| Addestramento al Combattimento Senz’Armi (Lottatore (fisso, Grado 1)) | Giocatore, Lottatore (§3.4; Talenti §3.5.5) | già gestito | classi.json → parametro (Disciplina), src/attacco.js |
| Raffica di Colpi (Lottatore (fisso, Grado 3)) | Giocatore, Lottatore (§3.4; Talenti §3.5.5) | già gestito | attacco_ravvicinato → src/attacco.js |
| Combattimento Multiplo (Lottatore (fisso, Grado 5)) | Giocatore, Lottatore (§3.4; Talenti §3.5.5) | già gestito | attacco_ravvicinato → src/attacco.js |
| Punto Debole (Lottatore (a scelta)) | Giocatore, Lottatore (§3.4; Talenti §3.5.5) | già gestito | attacco_ravvicinato → src/attacco.js |
| Padronanza della Disciplina (Lottatore (a scelta)) | Giocatore, Lottatore (§3.4; Talenti §3.5.5) | già gestito | attacco_ravvicinato → src/attacco.js |
| Risorse Interiori (Lottatore (a scelta)) | Giocatore, Lottatore (§3.4; Talenti §3.5.5) | testuale | nessun valore numerico del personaggio |
| Tecniche Interiori Supplementari (Lottatore (a scelta)) | Giocatore, Lottatore (§3.4; Talenti §3.5.5) | testuale | nessun valore numerico del personaggio |
| Parata a Mani Nude (Lottatore (a scelta)) | Giocatore, Lottatore (§3.4; Talenti §3.5.5) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Addestramento Militare (Soldato (fisso, Grado 1)) | Giocatore, Soldato (§3.4; Talenti §3.5.6) | uso_specifico | +3 alla PS di Volontà (solo per contro paura e pressioni del combattimento) |
| Coordinamento di Squadra (Soldato (fisso, Grado 3)) | Giocatore, Soldato (§3.4; Talenti §3.5.6) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Disciplina di Ferro (Soldato (fisso, Grado 5)) | Giocatore, Soldato (§3.4; Talenti §3.5.6) | testuale | nessun valore numerico del personaggio |
| Supporto d’Attacco (Soldato (a scelta)) | Giocatore, Soldato (§3.4; Talenti §3.5.6) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Supporto di Difesa (Soldato (a scelta)) | Giocatore, Soldato (§3.4; Talenti §3.5.6) | situazionale | +2 VA a Difese (con la condizione accesa) |
| Supporto Logistico (Soldato (a scelta)) | Giocatore, Soldato (§3.4; Talenti §3.5.6) | uso_specifico | +2 VA a Pilotare (solo per attività logistiche); +2 VA a Sopravvivenza (solo per attività logistiche); +2 VA a Tecnologia (solo per attività logistiche) |
| Base Operativa (Soldato (a scelta)) | Giocatore, Soldato (§3.4; Talenti §3.5.6) | uso_specifico | +2 VA a Percezione (solo per nella Base, minacce dall’esterno) |
| Supporto Avanzato (Soldato (a scelta)) | Giocatore, Soldato (§3.4; Talenti §3.5.6) | testuale | numerico non applicato: il Supporto migliorato si sceglie permanentemente, ma l’app non registra la scelta |
| Addestramento Rurale (Agricoltore (fisso, Grado 1)) | Giocatore, Agricoltore (§3.4; Talenti §3.5.7) | uso_specifico | +3 alla PS di Tempra (solo per Affaticamento da lavoro e clima) |
| Risorse del Territorio (Agricoltore (fisso, Grado 3)) | Giocatore, Agricoltore (§3.4; Talenti §3.5.7) | testuale | nessun valore numerico del personaggio |
| Autosufficienza (Agricoltore (fisso, Grado 5)) | Giocatore, Agricoltore (§3.4; Talenti §3.5.7) | testuale | nessun valore numerico del personaggio |
| Coltivatore Esperto (Agricoltore (a scelta)) | Giocatore, Agricoltore (§3.4; Talenti §3.5.7) | uso_specifico | +3 VA a Scienza (solo per coltivazioni); +3 VA a Sopravvivenza (solo per coltivazioni); +3 VA a Tecnologia (solo per coltivazioni) |
| Meccanizzazione Agricola (Agricoltore (a scelta)) | Giocatore, Agricoltore (§3.4; Talenti §3.5.7) | uso_specifico | +3 VA a Pilotare (solo per macchinari e impianti agricoli); +3 VA a Tecnologia (solo per macchinari e impianti agricoli) |
| Allevatore Esperto (Agricoltore (a scelta)) | Giocatore, Agricoltore (§3.4; Talenti §3.5.7) | uso_specifico | +3 VA a Medicina (solo per animali domestici); +3 VA a Percezione (solo per animali domestici); +3 VA a Sopravvivenza (solo per animali domestici) |
| Caccia, Pesca e Raccolta (Agricoltore (a scelta)) | Giocatore, Agricoltore (§3.4; Talenti §3.5.7) | uso_specifico | +3 VA a Percezione (solo per tracce, caccia, pesca e raccolta); +3 VA a Sopravvivenza (solo per tracce, caccia, pesca e raccolta) |
| Conservazione delle Provviste (Agricoltore (a scelta)) | Giocatore, Agricoltore (§3.4; Talenti §3.5.7) | uso_specifico | +3 VA a Scienza (solo per provviste e acqua); +3 VA a Sopravvivenza (solo per provviste e acqua); +3 VA a Tecnologia (solo per provviste e acqua) |
| Addestramento di Bottega (Artigiano (fisso, Grado 1)) | Giocatore, Artigiano (§3.4; Talenti §3.5.8) | uso_specifico | +3 VA a Cultura (solo per esaminare materiali e manufatti); +3 VA a Percezione (solo per esaminare materiali e manufatti); +3 VA a Scienza (solo per esaminare materiali e manufatti); +3 VA a Tecnologia (solo per esaminare materiali e manufatti) |
| Lavoro a Regola d’Arte (Artigiano (fisso, Grado 3)) | Giocatore, Artigiano (§3.4; Talenti §3.5.8) | testuale | nessun valore numerico del personaggio |
| Capolavoro (Artigiano (fisso, Grado 5)) | Giocatore, Artigiano (§3.4; Talenti §3.5.8) | testuale | numerico non applicato: bonus degli oggetti costruiti come Capolavoro: l’app non segna i Capolavori nell’Inventario |
| Armaiolo (Artigiano (a scelta)) | Giocatore, Artigiano (§3.4; Talenti §3.5.8) | uso_specifico | +3 VA a Percezione (solo per costruire o riparare armi e munizioni); +3 VA a Scienza (solo per costruire o riparare armi e munizioni); +3 VA a Tecnologia (solo per costruire o riparare armi e munizioni) |
| Corazzaio (Artigiano (a scelta)) | Giocatore, Artigiano (§3.4; Talenti §3.5.8) | uso_specifico+rimandato | +3 VA a Percezione (solo per costruire o riparare protezioni); +3 VA a Scienza (solo per costruire o riparare protezioni); +3 VA a Tecnologia (solo per costruire o riparare protezioni) · rimandato: Il +1 Protezione dell’armatura Capolavoro «resta da raccordare alle regole definitive delle protezioni» (lo dice il manuale). |
| Artefice di Precisione (Artigiano (a scelta)) | Giocatore, Artigiano (§3.4; Talenti §3.5.8) | uso_specifico | +3 VA a Percezione (solo per serrature e meccanismi di precisione); +3 VA a Tecnologia (solo per serrature e meccanismi di precisione) |
| Maestro Manifattore (Artigiano (a scelta)) | Giocatore, Artigiano (§3.4; Talenti §3.5.8) | uso_specifico | +3 VA a Cultura (solo per manufatti ordinari); +3 VA a Tecnologia (solo per manufatti ordinari) |
| Restauratore e Falsario (Artigiano (a scelta)) | Giocatore, Artigiano (§3.4; Talenti §3.5.8) | uso_specifico | +3 VA a Cultura (solo per restauri e contraffazioni); +3 VA a Percezione (solo per restauri e contraffazioni); +3 VA a Raggirare (solo per restauri e contraffazioni); +3 VA a Tecnologia (solo per restauri e contraffazioni) |
| Duro Lavoro (Operaio (fisso, Grado 1)) | Giocatore, Operaio (§3.4; Talenti §3.5.9) | uso_specifico | +3 VA a Atletica (solo per lavori pesanti e riparazioni strutturali); +3 VA a Pilotare (solo per lavori pesanti e riparazioni strutturali); +3 VA a Tecnologia (solo per lavori pesanti e riparazioni strutturali) |
| Resistenza Operaia (Operaio (fisso, Grado 3)) | Giocatore, Operaio (§3.4; Talenti §3.5.9) | testuale | nessun valore numerico del personaggio |
| Colonna Portante (Operaio (fisso, Grado 5)) | Giocatore, Operaio (§3.4; Talenti §3.5.9) | testuale | nessun valore numerico del personaggio |
| Forza da Lavoro (Operaio (a scelta)) | Giocatore, Operaio (§3.4; Talenti §3.5.9) | già gestito | regole.json → carico.moltiplicatori, src/carico.js |
| Ritmo di Produzione (Operaio (a scelta)) | Giocatore, Operaio (§3.4; Talenti §3.5.9) | testuale | nessun valore numerico del personaggio |
| Riparazione d’Emergenza (Operaio (a scelta)) | Giocatore, Operaio (§3.4; Talenti §3.5.9) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Cannibalizzazione (Operaio (a scelta)) | Giocatore, Operaio (§3.4; Talenti §3.5.9) | testuale | nessun valore numerico del personaggio |
| Lavoro di Squadra (Operaio (a scelta)) | Giocatore, Operaio (§3.4; Talenti §3.5.9) | testuale | nessun valore numerico del personaggio |
| Pilota Nato (Pilota (fisso, Grado 1)) | Giocatore, Pilota (§3.4; Talenti §3.5.10) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Controllo Assoluto (Pilota (fisso, Grado 3)) | Giocatore, Pilota (§3.4; Talenti §3.5.10) | testuale | nessun valore numerico del personaggio |
| Sincronia Tattica (Pilota (fisso, Grado 5)) | Giocatore, Pilota (§3.4; Talenti §3.5.10) | uso_specifico | +2 VA a Pilotare (solo per assetto Difensivo: evitare attacchi e collisioni) |
| Atterraggio Impossibile (Pilota (a scelta)) | Giocatore, Pilota (§3.4; Talenti §3.5.10) | testuale | nessun valore numerico del personaggio |
| Meccanico di Bordo (Pilota (a scelta)) | Giocatore, Pilota (§3.4; Talenti §3.5.10) | uso_specifico | +2 VA a Tecnologia (solo per riparare il proprio veicolo) |
| Manovra Evasiva (Pilota (a scelta)) | Giocatore, Pilota (§3.4; Talenti §3.5.10) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Spinta al Limite (Pilota (a scelta)) | Giocatore, Pilota (§3.4; Talenti §3.5.10) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Coordinazione di Bordo (Pilota (a scelta)) | Giocatore, Pilota (§3.4; Talenti §3.5.10) | testuale | nessun valore numerico del personaggio |
| Mani Esperte (Tecnico (fisso, Grado 1)) | Giocatore, Tecnico (§3.4; Talenti §3.5.11) | uso_specifico | +3 VA a Tecnologia (solo per macchinari, elettronica e computer) |
| Intervento Rapido (Tecnico (fisso, Grado 3)) | Giocatore, Tecnico (§3.4; Talenti §3.5.11) | testuale | nessun valore numerico del personaggio |
| Controllo Parallelo (Tecnico (fisso, Grado 5)) | Giocatore, Tecnico (§3.4; Talenti §3.5.11) | testuale | nessun valore numerico del personaggio |
| Manutenzione Preventiva (Tecnico (a scelta)) | Giocatore, Tecnico (§3.4; Talenti §3.5.11) | testuale | nessun valore numerico del personaggio |
| Sovraccarico Tecnico (Tecnico (a scelta)) | Giocatore, Tecnico (§3.4; Talenti §3.5.11) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Intrusione Rapida (Tecnico (a scelta)) | Giocatore, Tecnico (§3.4; Talenti §3.5.11) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Contromisure Elettroniche (Tecnico (a scelta)) | Giocatore, Tecnico (§3.4; Talenti §3.5.11) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Sistema Ottimizzato (Tecnico (a scelta)) | Giocatore, Tecnico (§3.4; Talenti §3.5.11) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Formazione Classica (Accademico (fisso, Grado 1)) | Giocatore, Accademico (§3.6; Talenti §3.7; Talenti §3.7.1) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Autorità Intellettuale (Accademico (fisso, Grado 3)) | Giocatore, Accademico (§3.6; Talenti §3.7; Talenti §3.7.1) | situazionale | +2 VA a Oratoria (con la condizione accesa) |
| Dottrina Consolidata (Accademico (fisso, Grado 5)) | Giocatore, Accademico (§3.6; Talenti §3.7; Talenti §3.7.1) | testuale | nessun valore numerico del personaggio |
| Metodo di Ricerca (Accademico (a scelta)) | Giocatore, Accademico (§3.6; Talenti §3.7; Talenti §3.7.1) | uso_specifico | +2 VA a Scienza (solo per ricerca con fonti e strumenti adeguati); +2 VA a Tecnologia (solo per ricerca con fonti e strumenti adeguati) |
| Analisi Critica (Accademico (a scelta)) | Giocatore, Accademico (§3.6; Talenti §3.7; Talenti §3.7.1) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Interpretazione Storica (Accademico (a scelta)) | Giocatore, Accademico (§3.6; Talenti §3.7; Talenti §3.7.1) | testuale | nessun valore numerico del personaggio |
| Memoria Fotografica (Accademico (a scelta)) | Giocatore, Accademico (§3.6; Talenti §3.7; Talenti §3.7.1) | testuale | nessun valore numerico del personaggio |
| Mente Enciclopedica (Accademico (a scelta)) | Giocatore, Accademico (§3.6; Talenti §3.7; Talenti §3.7.1) | testuale | nessun valore numerico del personaggio |
| Burocrazia Efficiente (Amministrativo (fisso, Grado 1)) | Giocatore, Amministrativo (§3.6; Talenti §3.7; Talenti §3.7.2) | testuale | nessun valore numerico del personaggio |
| Canali Interni (Amministrativo (fisso, Grado 3)) | Giocatore, Amministrativo (§3.6; Talenti §3.7; Talenti §3.7.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Macchina Amministrativa (Amministrativo (fisso, Grado 5)) | Giocatore, Amministrativo (§3.6; Talenti §3.7; Talenti §3.7.2) | testuale | nessun valore numerico del personaggio |
| Burocrate Esperto (Amministrativo (a scelta)) | Giocatore, Amministrativo (§3.6; Talenti §3.7; Talenti §3.7.2) | uso_specifico | +2 VA a Cultura (solo per regolamenti e procedure) |
| Rete Istituzionale (Amministrativo (a scelta)) | Giocatore, Amministrativo (§3.6; Talenti §3.7; Talenti §3.7.2) | testuale | nessun valore numerico del personaggio |
| Gestione Operativa (Amministrativo (a scelta)) | Giocatore, Amministrativo (§3.6; Talenti §3.7; Talenti §3.7.2) | testuale | nessun valore numerico del personaggio |
| Pianificazione Strategica (Amministrativo (a scelta)) | Giocatore, Amministrativo (§3.6; Talenti §3.7; Talenti §3.7.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Documentazione Perfetta (Amministrativo (a scelta)) | Giocatore, Amministrativo (§3.6; Talenti §3.7; Talenti §3.7.2) | uso_specifico | +2 VA a Raggirare (solo per preparare documenti falsi) |
| Espressione Potente (Artista (fisso, Grado 1)) | Giocatore, Artista (§3.6; Talenti §3.7; Talenti §3.7.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Impatto Emotivo (Artista (fisso, Grado 3)) | Giocatore, Artista (§3.6; Talenti §3.7; Talenti §3.7.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Icona (Artista (fisso, Grado 5)) | Giocatore, Artista (§3.6; Talenti §3.7; Talenti §3.7.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Carisma Artistico (Artista (a scelta)) | Giocatore, Artista (§3.6; Talenti §3.7; Talenti §3.7.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Performance Coinvolgente (Artista (a scelta)) | Giocatore, Artista (§3.6; Talenti §3.7; Talenti §3.7.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Empatia Creativa (Artista (a scelta)) | Giocatore, Artista (§3.6; Talenti §3.7; Talenti §3.7.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Presenza Mediatica (Artista (a scelta)) | Giocatore, Artista (§3.6; Talenti §3.7; Talenti §3.7.3) | uso_specifico | +2 VA a Cultura (solo per contenuti per i mezzi di comunicazione); +2 VA a Tecnologia (solo per contenuti per i mezzi di comunicazione) |
| Ispirazione (Artista (a scelta)) | Giocatore, Artista (§3.6; Talenti §3.7; Talenti §3.7.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Diagnosi Clinica (Medico (fisso, Grado 1)) | Giocatore, Medico (§3.6; Talenti §3.7; Talenti §3.7.4) | testuale | nessun valore numerico del personaggio |
| Intervento Mirato (Medico (fisso, Grado 3)) | Giocatore, Medico (§3.6; Talenti §3.7; Talenti §3.7.4) | testuale | nessun valore numerico del personaggio |
| Terapia Intensiva (Medico (fisso, Grado 5)) | Giocatore, Medico (§3.6; Talenti §3.7; Talenti §3.7.4) | testuale | nessun valore numerico del personaggio |
| Mano Sicura (Medico (a scelta)) | Giocatore, Medico (§3.6; Talenti §3.7; Talenti §3.7.4) | testuale | nessun valore numerico del personaggio |
| Chirurgia Precisa (Medico (a scelta)) | Giocatore, Medico (§3.6; Talenti §3.7; Talenti §3.7.4) | testuale | nessun valore numerico del personaggio |
| Diagnosi Rapida (Medico (a scelta)) | Giocatore, Medico (§3.6; Talenti §3.7; Talenti §3.7.4) | uso_specifico | +2 VA a Medicina (solo per identificare malattie, veleni e sostanze); +2 VA a Scienza (solo per identificare malattie, veleni e sostanze) |
| Resistenza Clinica (Medico (a scelta)) | Giocatore, Medico (§3.6; Talenti §3.7; Talenti §3.7.4) | uso_specifico | +2 alla PS di Tempra (solo per contro malattie, infezioni e veleni) |
| Stabilizzazione (Medico (a scelta)) | Giocatore, Medico (§3.6; Talenti §3.7; Talenti §3.7.4) | uso_specifico | +2 VA a Medicina (solo per Pronto Soccorso e Sanguinamento) |
| Parola Ispiratrice (Predicatore (fisso, Grado 1)) | Giocatore, Predicatore (§3.6; Talenti §3.7; Talenti §3.7.5) | uso_specifico | +2 VA a Oratoria (solo per incoraggiare, consolare, guidare) |
| Guida Morale (Predicatore (fisso, Grado 3)) | Giocatore, Predicatore (§3.6; Talenti §3.7; Talenti §3.7.5) | testuale | nessun valore numerico del personaggio |
| Fede Incrollabile (Predicatore (fisso, Grado 5)) | Giocatore, Predicatore (§3.6; Talenti §3.7; Talenti §3.7.5) | testuale | nessun valore numerico del personaggio |
| Sermone Coinvolgente (Predicatore (a scelta)) | Giocatore, Predicatore (§3.6; Talenti §3.7; Talenti §3.7.5) | testuale | nessun valore numerico del personaggio |
| Autorità Morale (Predicatore (a scelta)) | Giocatore, Predicatore (§3.6; Talenti §3.7; Talenti §3.7.5) | situazionale | +2 VA a Oratoria (con la condizione accesa) |
| Devozione (Predicatore (a scelta)) | Giocatore, Predicatore (§3.6; Talenti §3.7; Talenti §3.7.5) | uso_specifico | +2 VA a Occultismo (solo per religioni, culti e segni di Corruzione) |
| Purificazione (Predicatore (a scelta)) | Giocatore, Predicatore (§3.6; Talenti §3.7; Talenti §3.7.5) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Consolazione (Predicatore (a scelta)) | Giocatore, Predicatore (§3.6; Talenti §3.7; Talenti §3.7.5) | testuale | nessun valore numerico del personaggio |
| Armonizzazione Arcana (Arcanista (fisso, Grado 1)) | Giocatore, Arcanista (§3.8; Talenti §3.9; Talenti §3.9.1) | già gestito | lancio → src/lancio.js |
| Controllo Superiore (Arcanista (fisso, Grado 3)) | Giocatore, Arcanista (§3.8; Talenti §3.9; Talenti §3.9.1) | già gestito | lancio → src/lancio.js |
| Architetto Arcano (Arcanista (fisso, Grado 5)) | Giocatore, Arcanista (§3.8; Talenti §3.9; Talenti §3.9.1) | già gestito | lancio → src/lancio.js |
| Geometria Arcana (Arcanista (a scelta)) | Giocatore, Arcanista (§3.8; Talenti §3.9; Talenti §3.9.1) | già gestito | lancio → src/lancio.js |
| Calcolo Arcano (Arcanista (a scelta)) | Giocatore, Arcanista (§3.8; Talenti §3.9; Talenti §3.9.1) | già gestito | lancio → src/lancio.js |
| Riserva Tecnica (Arcanista (a scelta)) | Giocatore, Arcanista (§3.8; Talenti §3.9; Talenti §3.9.1) | già gestito | lancio → src/lancio.js |
| Canalizzazione Sicura (Arcanista (a scelta)) | Giocatore, Arcanista (§3.8; Talenti §3.9; Talenti §3.9.1) | già gestito | lancio → src/lancio.js |
| Controllo dei Flussi (Arcanista (a scelta)) | Giocatore, Arcanista (§3.8; Talenti §3.9; Talenti §3.9.1) | già gestito | lancio → src/lancio.js |
| Arma Astrale (Custode (fisso, Grado 1)) | Giocatore, Custode (§3.8; Talenti §3.9; Talenti §3.9.2) | testuale | nessun valore numerico del personaggio |
| Maestro d’Arma (Custode (fisso, Grado 3)) | Giocatore, Custode (§3.8; Talenti §3.9; Talenti §3.9.2) | testuale | numerico non applicato: il +1 danno vale per l’Arma Astrale evocata, che la scheda non ha fra le armi (Armi da mischia, danno per Grado di Custode: da aggiungere come arma evocabile) |
| Scudo Assoluto (Custode (fisso, Grado 5)) | Giocatore, Custode (§3.8; Talenti §3.9; Talenti §3.9.2) | testuale | nessun valore numerico del personaggio |
| Maestria Astrale (Custode (a scelta)) | Giocatore, Custode (§3.8; Talenti §3.9; Talenti §3.9.2) | testuale | numerico non applicato: come Maestro d’Arma: +2 VA e +1 danno con l’Arma Astrale, che la scheda non ha fra le armi |
| Fenditura Mistica (Custode (a scelta)) | Giocatore, Custode (§3.8; Talenti §3.9; Talenti §3.9.2) | testuale | nessun valore numerico del personaggio |
| Guardiano Instancabile (Custode (a scelta)) | Giocatore, Custode (§3.8; Talenti §3.9; Talenti §3.9.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Intercettazione Astrale (Custode (a scelta)) | Giocatore, Custode (§3.8; Talenti §3.9; Talenti §3.9.2) | testuale | nessun valore numerico del personaggio |
| Difesa Astrale (Custode (a scelta)) | Giocatore, Custode (§3.8; Talenti §3.9; Talenti §3.9.2) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Incantesimi Aggressivi (Invocatore (fisso, Grado 1)) | Giocatore, Invocatore (§3.8; Talenti §3.9; Talenti §3.9.3) | già gestito | lancio → src/lancio.js |
| Sovraccarico Controllato (Invocatore (fisso, Grado 3)) | Giocatore, Invocatore (§3.8; Talenti §3.9; Talenti §3.9.3) | già gestito | lancio → src/lancio.js |
| Controllo Arcano (Invocatore (fisso, Grado 5)) | Giocatore, Invocatore (§3.8; Talenti §3.9; Talenti §3.9.3) | già gestito | lancio → src/lancio.js |
| Potere Travolgente (Invocatore (a scelta)) | Giocatore, Invocatore (§3.8; Talenti §3.9; Talenti §3.9.3) | testuale | bonus momentaneo (la prossima Prova, una volta per scena o per Round), per un alleato o una penalità dell’avversario: resta testo |
| Eco Primordiale (Invocatore (a scelta)) | Giocatore, Invocatore (§3.8; Talenti §3.9; Talenti §3.9.3) | testuale | nessun valore numerico del personaggio |
| Impatto Arcano (Invocatore (a scelta)) | Giocatore, Invocatore (§3.8; Talenti §3.9; Talenti §3.9.3) | testuale | nessun valore numerico del personaggio |
| Mano Invisibile (Invocatore (a scelta)) | Giocatore, Invocatore (§3.8; Talenti §3.9; Talenti §3.9.3) | testuale | nessun valore numerico del personaggio |
| Canalizzazione Implacabile (Invocatore (a scelta)) | Giocatore, Invocatore (§3.8; Talenti §3.9; Talenti §3.9.3) | già gestito | lancio → src/lancio.js |
| Tocco Sacro (Mistico (fisso, Grado 1)) | Giocatore, Mistico (§3.8; Talenti §3.9; Talenti §3.9.4) | già gestito | lancio → src/lancio.js |
| Purificatore (Mistico (fisso, Grado 3)) | Giocatore, Mistico (§3.8; Talenti §3.9; Talenti §3.9.4) | testuale | nessun valore numerico del personaggio |
| Aura di Equilibrio (Mistico (fisso, Grado 5)) | Giocatore, Mistico (§3.8; Talenti §3.9; Talenti §3.9.4) | testuale | numerico non applicato: attenua le penalità di Ferite e Corruzione per sé e per gli alleati: la applica il giocatore al tavolo |
| Canale Vitale (Mistico (a scelta)) | Giocatore, Mistico (§3.8; Talenti §3.9; Talenti §3.9.4) | già gestito | lancio → src/lancio.js |
| Flusso Sacro (Mistico (a scelta)) | Giocatore, Mistico (§3.8; Talenti §3.9; Talenti §3.9.4) | testuale | nessun valore numerico del personaggio |
| Occhio Interiore (Mistico (a scelta)) | Giocatore, Mistico (§3.8; Talenti §3.9; Talenti §3.9.4) | già gestito | lancio → src/lancio.js |
| Presagio (Mistico (a scelta)) | Giocatore, Mistico (§3.8; Talenti §3.9; Talenti §3.9.4) | testuale | nessun valore numerico del personaggio |
| Scudo Spirituale (Mistico (a scelta)) | Giocatore, Mistico (§3.8; Talenti §3.9; Talenti §3.9.4) | generale+situazionale | +1 alla PS di Volontà; +1 alla PS di Magia; +2 alla PS di Volontà (con la condizione accesa); +2 alla PS di Magia (con la condizione accesa) |
| Architetto TecnoMistico (Tecnomante (fisso, Grado 1)) | Giocatore, Tecnomante (§3.8; Talenti §3.9; Talenti §3.9.5) | già gestito | artefatti.json → sintonizzazione.talento (+2 alla capacità), src/equipaggiamento.js |
| Ricarica Efficiente (Tecnomante (fisso, Grado 3)) | Giocatore, Tecnomante (§3.8; Talenti §3.9; Talenti §3.9.5) | già gestito | regole.json → chroma (rapporto di conversione) |
| Sovrascrittura (Tecnomante (fisso, Grado 5)) | Giocatore, Tecnomante (§3.8; Talenti §3.9; Talenti §3.9.5) | testuale | nessun valore numerico del personaggio |
| Meccanica Potenziata (Tecnomante (a scelta)) | Giocatore, Tecnomante (§3.8; Talenti §3.9; Talenti §3.9.5) | generale | +1 danno con le armi Artefatto |
| Corazza Potenziata (Tecnomante (a scelta)) | Giocatore, Tecnomante (§3.8; Talenti §3.9; Talenti §3.9.5) | già gestito | src/protezione.js (+1 AR magica) |
| Scarica d’Emergenza (Tecnomante (a scelta)) | Giocatore, Tecnomante (§3.8; Talenti §3.9; Talenti §3.9.5) | testuale | nessun valore numerico del personaggio |
| Schema Ridondante (Tecnomante (a scelta)) | Giocatore, Tecnomante (§3.8; Talenti §3.9; Talenti §3.9.5) | testuale | nessun valore numerico del personaggio |
| Interfaccia Remota (Tecnomante (a scelta)) | Giocatore, Tecnomante (§3.8; Talenti §3.9; Talenti §3.9.5) | testuale | nessun valore numerico del personaggio |

## Rimandati (pacchetto per il Doc)

- **Corazzaio**: Il +1 Protezione dell’armatura Capolavoro «resta da raccordare alle regole definitive delle protezioni» (lo dice il manuale).

