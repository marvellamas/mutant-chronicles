# Ricognizione: contenitori di Chroma, batterie mistiche e conversioni

26 settembre 2026. Ricognizione per la voce 3 del backlog. Non cambia né codice né dati.

**Stato.** Sessione 1 fatta il 26 settembre 2026: `regole.json` → `chroma`, schema `contenitore` nel catalogo e nei personalizzati, stati `trasportato`/`zaino`, una voce per contenitore (con migrazione), `sessione.chroma` con i PM attuali, «Ricarica» che non tocca più le riserve di PM, «Riserve esterne» nella tab Magia e in stampa. Rispetto al §3 i nomi scelti sono: `contenitore: { energia, capacita_pm, integrato }` al posto di `riserva`, `sessione.chroma[uid].pmAttuali`, stati `trasportato`/`zaino`. Le sessioni 2 e 3 (Convertire Potere, PV → PM, Umanità sulla capacità di sintonizzazione) aspettano le risposte ad A.18–A.20.

Fonti:
- **Manuale della Magia v1.1**, sezione 6 «Punti Magia, Chroma e recupero», pp. 8–12, e scheda 22.6 «Batteria Mistica», pp. 131–132.
- **Manuale degli Armamenti v0.50**: §7.5 e §7.5.1 «Profili con riserva mistica» (pp. 30–31) e §7.10 «Artefatti e sintonizzazione» (pp. 58–60).
- **Manuale del Giocatore v0.43**, §3.9.5 (Tecnomante: Architetto TecnoMistico e Ricarica Efficiente).

La tabella delle conversioni è stata controllata sul PDF (Magia, p. 9): il testo estratto la spezza e non si capisce se i Talenti valgano anche per PV → PM. Valgono.

## 1. Cosa c'è già nel catalogo

### 1.1 Contenitori mistici: Artefatti con riserva di Chroma

Si distinguono in due gruppi.

**Oggetti con il campo `artefatto`** (`data/equipaggiamento/artefatti.json`, lotto 12, §7.10). Sono tipo `artefatto`, famiglia «Batterie e contenitori», catalogo Commerciale:

| id | Chroma | Capacità | Potenza | Sintonizzazione | Prezzo |
|---|---|---|---|---|---|
| `batteria-da-5-pm-chroma-rosso` | Rosso | 5 PM | Comune | 1 | — (A.14) |
| `batteria-da-5-pm-chroma-blu` | Blu | 5 PM | Comune | 1 | — |
| `batteria-da-5-pm-chroma-verde` | Verde | 5 PM | Comune | 1 | — |
| `batteria-da-5-pm-chroma-bianco` | Bianco | 5 PM | Non Comune | 2 | — |

I campi sono `artefatto: { tipologia, potenza, sintonizzazione, riserva: { pm, chroma } }` e `proprieta: []`. Il testo del §7.10 sta in `note_manuale`. Mancano prezzo, PI, Qualità e reperibilità: il manuale non li dà ed è già la domanda A.14.

**Righe di `artefatti_catalogo`** (stesso file). Danno tipologia, potenza e riserva a oggetti che stanno in altri file (§7.5.1). Tutti hanno una riserva di Chroma Rosso da 5 PM, compresa nel costo di sintonizzazione:

| rif | Tipologia | Potenza | Sintonizzazione | Uso della riserva |
|---|---|---|---|---|
| `armi_corporative:bordone-templare` | Armi | Non Comune | 2 | 1 PM = +1d6 Magico al colpo |
| `armi_corporative:spada-vindicator` | Armi | Non Comune | 2 | idem |
| `armi_corporative:spada-deliverer` | Armi | Non Comune | 2 | idem |
| `armi_corporative:lancia-castigator` | Armi | Non Comune | 2 | idem |
| `armi_corporative:lama-demontooth` | Armi | Non Comune | 2 | idem |
| `scudi:scudo-delle-guardie-sacre` | Protezioni | Rara | 3 | 1 PM = Scudo Magico per 5 Round |

Le cinque armi hanno anche `munizioni: { capacita: 5, unita: "PM", ricarica: "secondo il §7.5.1", riferimento: "Chroma Rosso da 5 PM (§7.5.1)" }` e `attivazione: { danno_extra: "1d6", natura: "Magico", sintonizzazione: 2 }`.

Il file contiene anche le regole del §7.10, in `sintonizzazione`:
- `capacita_per_gradi`: da 4 a 9 per i Gradi complessivi I–VI;
- `talento`: Architetto TecnoMistico, +2;
- `potenze`: da Comune = 1 a Leggendaria = 6;
- `tipologie`;
- `regola`: il testo del paragrafo.

### 1.2 Celle e batterie tecnologiche: niente Chroma e niente sintonizzazione

Il manuale le tiene separate: Magia, sezione 6, «celle tecnologiche sostituibili, che non richiedono Sintonizzazione (§§7.1.4 e 7.5.1)». Nel catalogo sono già distinte e non vanno toccate:

- **Munizioni** (`munizioni.json`, lotto 10), `cella: { capacita, unita, ricarica_costo }` con il costo in denaro:
  - cella ravvicinata comune (5 cariche, usata da 17 armi);
  - celle del fucile al plasma, Hellblazer e Intruder;
  - 5 serbatoi da lanciafiamme.
- **Armi a cella** (lotti 1 e 4): per esempio Tonfa Stella Cadente e Spada Punisher, con `munizioni.unita: "cariche"` e ricarica «sostituire la cella pronta richiede 1 AzP (§7.1.4)».
- **Batteria di servizio** (`accessori_armi.json`): 24 ore per torcia e moduli di visione.
- **Solo nel testo, senza campi:**
  - celle IAS da 20 cariche (moduli IAS3100–3400, Smorzatore Silent, Generatore RF366);
  - batterie a ore di esoscheletri e armature servoassistite (Juggernaut, Vulkan, Felis, Powersuit, Shoa, Demonhunter, APE);
  - batterie di Iron Mastiff e Cuirassier.

### 1.3 Cosa manca rispetto al manuale

| Requisito del manuale | Oggi |
|---|---|
| **Tipo di energia** (Magia sez. 6): Bianco Universale, Rosso Fisica, Blu Mentale, Verde Spirituale, Viola Oscura (regole rimandate), Trasparente = esausto con l'alone del colore | C'è solo `riserva.chroma` con i quattro colori. Mancano una tabella energia → macrofamiglie compatibili e Viola. «Trasparente» non è modellato: si ricava da PM attuali 0. |
| **Scheda del contenitore**: «Chroma Rosso, 6/10 PM» (energia, PM attuali, capacità) | Nel catalogo c'è la capacità. I PM attuali sono un contatore generico di munizioni in sessione (§2.3), senza il colore nell'etichetta del contatore. |
| **Contenitore personalizzato** («qualunque forma e materiale», §7.5) | Non si può fare. Un oggetto personalizzato di tipo `artefatto` tiene solo nome, note e testo: `normalizzaEquipaggiamento` scarta chroma, capacità e potenza. Quindi non ha costo di sintonizzazione né contatore. |
| **Trasportato e sintonizzato** per usarlo | Il sintonizzato c'è (`voce.sintonizzato`). «Trasportato» no: `STATI.artefatto` è vuoto, quindi una batteria lasciata a casa conta come a portata di mano. |
| **Un contenitore = una sintonizzazione** | Con `quantita: 2` una voce ha un solo contatore da 5 PM e un solo costo. |
| **Conversioni** (PM ↔ Chroma, PV → PM, prelievo dal Bianco) con gruppi, Prova e Talenti | Assenti. |
| **Ricarica solo con conversione** (§7.5.1: «Riposo e recupero dei PM personali non ricaricano automaticamente la riserva») | Il pulsante «Ricarica» della modalità tavolo riporta la riserva al massimo senza costo. Vale per il Bordone e le batterie. Oggi è sbagliato. |
| **PV sacrificati** (limite alle cure) | Assenti. |
| **Riduzione per Umanità** della capacità di sintonizzazione (§5.21, §7.10) e dei PM massimi | Assente: l'app non registra l'Umanità. La scheda lo dice in nota. |
| **Batteria Mistica** (22.6): capacità temporanea +5…+25 PM, con durata | Assente. È un incantesimo conosciuto, senza effetti sulla scheda. |
| **Compatibilità con l'incantesimo** | I dati ci sono già: `incantesimi.json` ha `macrofamiglia` e l'intestazione «PM utilizzabili: universali o fisici/mentali/spirituali». Manca la regola che li colleghi. |

## 2. La sintonizzazione nel personaggio oggi

È modellata come budget unico, secondo il §7.10.

- **Scelta del giocatore.** Nell'equipaggiamento salvato ogni voce di Artefatto ha `sintonizzato: true` o nessun campo (`src/equipaggiamento.js`, `normalizzaEquipaggiamento`). La casella «Sintonizzato» sta nella lista dell'equipaggiamento (`src/ui/equipaggiamento.js`). È una scelta, non un valore calcolato: rispetta il principio 3.
- **Riconoscere un Artefatto.** Se ne occupa `infoArtefatto(def, dati)`: prende il campo `artefatto` dell'oggetto, oppure la riga di `artefatti_catalogo` con lo stesso `rif`.
- **Capacità**, calcolata in `calcolaEquipaggiamento`:
  - `gradiComplessivi` è la somma dei Gradi di tutte le Classi (da `avanzamento.js`), limitata a I–VI (al 20° livello i Gradi sono al massimo 6);
  - la capacità è `capacita_per_gradi[gradi − 1]`, più il bonus se fra i Talenti di Classe c'è «Architetto TecnoMistico»;
  - il +2 si prende una sola volta anche se il Tecnomante è la seconda Classe.
  - La colonna «Addestramento Taumaturgo» del §7.10 è identica a quella ordinaria, quindi non serve un caso a parte.
- **Uso.** `usata` è la somma dei costi degli Artefatti con `sintonizzato: true`. Se supera la capacità, compare l'avviso «Sintonizzazioni oltre la capacità: … Il personaggio sceglie quali interrompere». È un avviso, non un blocco.
- **Tab Combattimento**, sezione «Artefatti e sintonizzazione (§7.10)»:
  - «Sintonizzazione usata / capacità» e l'elenco con ✔/○;
  - un contatore di PM per ogni riserva senza contatore d'arma: batterie e Scudo delle Guardie Sacre, tramite `consumabili()`, gruppo `artefatto`;
  - le armi con riserva (Bordone e le altre) usano il contatore delle munizioni, con unità «PM».
- **Non modellati:**
  - riduzione per Umanità;
  - sintonizzazione automatica del Tecnomante: non serve, l'app non chiede la Prova di Artefatti;
  - interruzione dei legami quando la capacità scende.
- **Collaudo.** Sorella Ilaria Venn ha 4 Gradi complessivi e quindi capacità 7. Usa 4: Bordone 2 + Batteria Bianco 2. Il dato è verificato in `tests/collaudo.test.js`.

**Sessione.** Le riserve di PM stanno in `sessione.munizioni[uid] = { colpi, riserve }`, lo stesso blocco dei caricatori:
- partono piene (`allineaMunizioni`);
- «Nuova sessione» non le tocca, ed è giusto;
- «Ricarica» (`ricaricaArma`) le riporta al massimo, ed è sbagliato per i PM (tabella del §1.3).

**Da ripulire.** Il commento JSDoc sopra `regoleSintonizzazione` in `src/equipaggiamento.js` descrive `caricatori()`: è fuori posto e va spostato alla prossima modifica di quel file.

## 3. Proposta di modello

### 3.1 Regole nei dati (`data/regole.json`, nuova chiave `chroma`)

Tutte le soglie e i rapporti vanno nei dati. Il codice legge soltanto.

```json
"chroma": {
  "energie": {
    "Bianco":  { "energia": "Universale", "macrofamiglie": ["Fisica", "Mentale", "Spirituale"], "rapporto_fisso": 2 },
    "Rosso":   { "energia": "Fisica",     "macrofamiglie": ["Fisica"] },
    "Blu":     { "energia": "Mentale",    "macrofamiglie": ["Mentale"] },
    "Verde":   { "energia": "Spirituale", "macrofamiglie": ["Spirituale"] },
    "Viola":   { "energia": "Oscura",     "macrofamiglie": [], "regole_rimandate": true }
  },
  "conversione": {
    "addestramento_richiesto": "Taumaturgo",
    "rapporto_ordinario": 3,
    "talenti_riduzione": ["Ricarica Efficiente", "Conversione Migliorata"],
    "riduzione_per_talento": 1,
    "prova": { "gruppi_automatici": 1, "penalita": { "2": 0, "3": -2, "4": -4, "5": -6, "6": -8 }, "ulteriore": -2 },
    "fonte": "Magia sez. 6, pp. 9–10; Armamenti §7.5.1"
  },
  "operazioni": {
    "converti_chroma":  { "da": "chroma", "a": "pm",     "chroma": ["Rosso", "Blu", "Verde"], "taumaturgo": true },
    "converti_pv":      { "da": "pv",     "a": "pm",                                          "taumaturgo": true },
    "ricarica":         { "da": "pm",     "a": "chroma", "chroma": ["Rosso", "Blu", "Verde", "Bianco"], "taumaturgo": true },
    "preleva_bianco":   { "da": "chroma", "a": "pm",     "chroma": ["Bianco"],                "taumaturgo": false }
  }
}
```

I rapporti sono quelli della tabella di p. 9:
- **Rosso, Blu, Verde e PV → PM**: 3:1; con uno dei due Talenti 2:1; con entrambi 1:1.
- **Bianco, in tutti e due i sensi**: sempre 2:1 (`rapporto_fisso`).

«Trasparente» non è un colore: è un contenitore a 0 PM, che mostra l'alone del proprio colore. Nella scheda si scrive «Chroma Rosso (esausto), 0/5 PM».

### 3.2 Contenitore nel catalogo

Si tiene il campo che esiste già, senza rinominare nulla: `artefatto: { tipologia, potenza, sintonizzazione, riserva: { pm, chroma } }`. Si aggiungono due cose:
- `riserva.alimenta_incantesimi` (vero/falso). Distingue le batterie, che pagano gli incantesimi, dalle riserve integrate nelle armi, che forse alimentano solo le attivazioni (domanda A.18). Si può anche ricavare dalla tipologia; il campo esplicito è più chiaro per Davide.
- Validatore:
  - `chroma` deve essere un colore di `regole.chroma.energie`;
  - `pm` intero > 0;
  - `sintonizzazione` uguale al costo della `potenza` (oggi non si controlla).

### 3.3 Contenitore personalizzato

Oggetto personalizzato di tipo `artefatto` con quattro campi in più, che `normalizzaEquipaggiamento` deve lasciar passare:

```json
{ "uid": "…", "rif": null, "quantita": 1, "note": "cristallo del nonno", "sintonizzato": true,
  "personalizzato": { "nome": "Cristallo votivo", "tipo": "artefatto",
    "tipologia": "Batterie e contenitori", "chroma": "Verde", "capacita": 8, "potenza": "Non Comune" } }
```

- Il costo di sintonizzazione si ricava dalla potenza (§7.10), non si inserisce a mano.
- `infoArtefatto` deve leggere anche il personalizzato. Così sintonizzazione, contatore e regole funzionano senza casi speciali.

### 3.4 Stato dell'oggetto (scelte)

- **Artefatti: stati `addosso` e `altrove`.** Oggi non ne hanno. Il manuale chiede che il contenitore sia trasportato. `addosso` è il valore predefinito, così i personaggi salvati non cambiano comportamento.
- **Contenitori: `quantita` sempre 1.** Aggiungerne un altro crea una voce nuova, perché ognuno si sintonizza e si ricarica da solo. Chi ha oggi una voce con quantità > 1 riceve un avviso («una voce per contenitore»). Non si fa una migrazione automatica: non si possono inventare i PM di ciascuno.

### 3.5 Stato in sessione

- **Blocco nuovo `sessione.chroma`**, separato dalle munizioni:

  ```json
  "chroma": { "<uid>": { "pm": 3, "capacitaExtra": null } },
  "pvSacrificati": 0
  ```

  - `pm` sono i PM attuali, limitati a capacità + `capacitaExtra`.
  - `capacitaExtra` è `{ "valore": 5, "fonte": "Batteria Mistica 3", "scade": "annotazione libera" }`. Quando si toglie, i PM in eccesso si perdono, come dice la scheda 22.6.
  - Per le armi con riserva (Bordone e le altre) il contatore passa da `munizioni[uid].colpi` a `chroma[uid].pm`. `allineaSessione` fa la migrazione quando l'oggetto ha `riserva.chroma`.
  - Un contenitore nuovo parte pieno. Serve la conferma di Davide (A.19).
  - «Nuova sessione» non ricarica i contenitori, e non lo fa neanche il recupero dei PM.
- **`pvSacrificati`** (sez. 6, «PV sacrificati nella conversione»):
  - le cure (+PV in modalità tavolo) non superano `pv − pvSacrificati`;
  - un'azione «Recupero naturale» toglie prima i punti sacrificati.
  - Esempio da mettere nei test: PV 20, se ne sacrificano 6 → 14/20 con limite 14; recuperandone 2 → limite 16.

### 3.6 Regole da implementare (funzioni pure, nuovo `src/chroma.js`)

| Regola | Fonte | Funzione proposta |
|---|---|---|
| **Energia compatibile** con la macrofamiglia dell'incantesimo; il Bianco alimenta tutto; il Viola niente, per ora | Magia sez. 6; `incantesimi.json` → `macrofamiglia` | `compatibile(chroma, macrofamiglia, dati)` |
| **Un solo contenitore per lancio**, più eventuali PM personali; niente Prova in più | Magia sez. 6, «Utilizzare una riserva esterna» | `pagaLancio({ costo, pmPersonali, contenitore })` → `{ ok, motivo, daPersonali, daContenitore }`. Controlla che il contenitore sia uno solo, sintonizzato, addosso e compatibile. Servirà alla voce 4 del backlog («Lancia un incantesimo»); qui basta la funzione con i test. |
| **Rapporto** di ogni operazione: 3 meno 1 per ciascuno dei Talenti posseduti, minimo 1; Bianco fisso a 2 | Magia p. 9; Tecnomante §3.9.5 | `rapporto(operazione, chroma, talenti, dati)` |
| **Requisito Taumaturgo** per conversione (Chroma → PM, PV → PM) e ricarica | Magia sez. 6: «riservato ai personaggi con Addestramento Taumaturgo»; Usufruitore di Magia e le Classi taumaturgiche senza l'Addestramento non bastano | `puoOperare(operazione, scheda)` → `{ ok, motivo }` |
| **Requisiti comuni**: cosciente (non Svenuto), contatto, contenitore sintonizzato; spazio nella destinazione per tutti i gruppi e risorse per tutti | Magia sez. 6 | come sopra |
| **Prova per più gruppi**: 1 gruppo automatico; da 2 in su una sola Prova di Potere con penalità 0, −2, −4…; con VA ≤ 0 fallisce | Magia p. 10; Armamenti §7.5.1 | `provaConversione(gruppi, dati)` → `null` (automatica) oppure `{ penalita }` |
| **Esiti** | Magia p. 10 | `applicaConversione(sessione, { operazione, uid, gruppi, esito }, m)`. Il tiro lo fa il giocatore al tavolo; l'app chiede l'esito. |
| **PV sacrificati** | Magia sez. 6 | dentro `applicaConversione` e nelle cure di sessione |
| **Svenimento a 0 PM personali**, anche con contenitori pieni, alla fine dell'Azione | Magia sez. 6; §7.10 | dopo ogni operazione, se `pmAttuali === 0` si propone lo Stato Svenuto: promemoria con un pulsante, non uno Stato automatico |

Gli esiti che `applicaConversione` deve applicare:
- **Successo**: tutti i gruppi.
- **Successo Magistrale**: un gruppo in più, se c'è spazio e c'è la risorsa.
- **Fallimento**: niente spesa e niente guadagno.
- **Fallimento Maldestro**: si perde il costo di tutti i gruppi e non si guadagna niente.
- **Sempre**: l'AzP è consumata.

Esempi del manuale da usare come test:
- 3 gruppi a 3:1 → Prova di Potere −2. Successo: si spendono 9 e si ottengono 3. Magistrale: 12 e 4. Maldestro: si perdono 9 e non si ottiene niente.
- Batteria Mistica: 3/5 → 3/10; alla scadenza 9/10 → 5/5.
- PV sacrificati: 20/6 → 14, poi 16.

### 3.7 Interfaccia (modalità tavolo, tab Combattimento o Magia)

- **Scheda di ogni contenitore**: «Chroma Rosso, 6/10 PM», con +/− (per le spese già decise), ✔ se sintonizzato ed «esausto» a 0.
- **«Converti o ricarica…»**: si sceglie origine, destinazione e numero di gruppi. L'app mostra:
  - rapporto e Talenti applicati;
  - costo totale;
  - «automatico» oppure «Prova di Potere −2, VA N».
  - Quattro pulsanti di esito (Successo, Magistrale, Fallimento, Maldestro) applicano la regola. Si può annullare con «↶ Annulla», come le altre modifiche di sessione.
  - Le operazioni non ammesse (senza Taumaturgo, non sintonizzato, Viola) restano visibili ma disattivate, con il motivo.
- **PV sacrificati**: accanto ai PV, «limite cure 14».
- **Stampa**: riga «Chroma Rosso, _/5 PM» da compilare a penna, a riposo.

## 4. Punti ambigui e stima

### 4.1 Domande per Davide (da aggiungere a `docs/per-davide.md`, sezione A)

18. **Le riserve integrate nelle armi pagano gli incantesimi?** La Magia, sez. 6, dice che è contenitore «qualunque oggetto che racchiuda un Chroma». Il §7.5.1 descrive la riserva del Bordone Templare (e delle altre quattro armi e dello Scudo delle Guardie Sacre) come «cinque cariche» per le attivazioni. Un Taumaturgo può usarla per lanciare incantesimi Fisici, o convertirla in PM personali? Oppure alimenta solo le attivazioni dell'oggetto?
19. **Un contenitore acquistato o trovato è carico?** Il manuale non lo dice. Proposta: dal catalogo arriva pieno; per quelli personalizzati il giocatore indica i PM iniziali.
20. **Prelievo dal Chroma Bianco senza Addestramento Taumaturgo.** «Un personaggio cosciente può prelevare PM da un contenitore Bianco sintonizzato»: vale per chiunque, anche per un Combattente senza magia (con la Prova di Potere da 2 gruppi in su)? Oppure serve almeno l'accesso alla magia?
21. **Chroma Viola.** Le regole sono rimandate. Nel frattempo si può registrare un contenitore Viola come oggetto inerte (capacità e PM, nessun uso), oppure è meglio non prevederlo?
22. **Batterie da 5 PM**: prezzo, PI, Qualità e reperibilità. È già la A.14; resta aperta ed è la stessa questione.
23. **Schede dei Talenti Conversione Migliorata e Recupero Meditativo**: già nella A.2 (Talenti di magia provvisori). Conversione Migliorata serve a questa voce: senza tipo e prerequisiti, l'app la applicherebbe a chiunque la scelga.

### 4.2 Correzioni al backlog, non domande

- La voce 3 dice che i rapporti sono ridotti da «Conversione Migliorata / Recupero Meditativo». Il manuale dice **Ricarica Efficiente** (Talento fisso di III Grado del Tecnomante, con requisito Addestramento Taumaturgo) e **Conversione Migliorata**. Recupero Meditativo riguarda l'accesso alla Meditazione.
- La tabella di p. 9 applica i Talenti anche a **PV → PM**. Nel testo estratto dal PDF questo non si vede; nel PDF sì.

### 4.3 Decisioni da prendere con Marcello (perimetro)

- **Umanità (§5.21).** Riduce la capacità di sintonizzazione e i PM massimi, ma l'app non la registra. Si può fare dopo, come campo di sessione o di scelta: il modello sopra non lo impedisce.
- **Batteria Mistica.** Si può fare subito come «capacità extra» manuale sul contenitore (proposta del §3.5), senza collegarla al lancio.

### 4.4 Stima

| Sessione | Contenuto |
|---|---|
| 1 | `regole.chroma` e validatore; contenitore personalizzato; stati `addosso`/`altrove`; quantità 1 per contenitore; `sessione.chroma` con migrazione dai contatori `munizioni` delle riserve; tolta la «Ricarica» gratuita dalle riserve di PM. Test. |
| 2 | `src/chroma.js`: compatibilità, pagamento del lancio, rapporti con Talenti, requisiti, Prova per gruppi, esiti, PV sacrificati, svenimento. Test con gli esempi del manuale. |
| 3 | Interfaccia in modalità tavolo: schede dei contenitori, finestra «Converti o ricarica», limite delle cure, riga in stampa. Verifica nel browser (telefono e desktop, tema scuro). |

In totale **3 sessioni**, più mezza per la capacità temporanea di Batteria Mistica se si fa insieme. Le risposte A.18–A.20 servono prima della sessione 2; A.21 e A.22 non bloccano.
