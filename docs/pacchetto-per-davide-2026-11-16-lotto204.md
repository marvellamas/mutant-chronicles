# Pacchetto per il Doc «per-davide.md» — 16/11/2026, lotto 204

Da applicare al Google Doc da Cowork o da Marcello. Claude Code non scrive nei Doc di Davide.

---

## 1. Riga di registro, in coda alla sezione 7

> **Il Bestiario è alla 0.69, per intero (16/11/2026).** Nel lotto precedente l'app leggeva del Manuale dei Mostri
> 0.69 i soli PV: le altre righe non le capiva, e **151 schede di creature restavano fuori del tutto** — Vampiro,
> Lich, Beholder, i licantropi, i diavoli, gli Yuan-ti. Il motivo era una riga rinominata: quella che la 0.46
> chiamava «Protezioni e Difese» nella 0.69 si chiama «Armatura e Difese», e senza quella riga mancavano l'AR e le
> Difese, cioè due dati obbligatori. Adesso le 151 schede sono entrate e **del manuale resta fuori solo «Bozzoli di
> cristallo», che non è una creatura**. Il Bestiario passa da 342 a **493 schede**.
>
> **Dove una scheda non è tutta alla 0.69, l'app lo scrive.** Ogni valore porta da quale edizione viene, e nella
> scheda del nemico si legge una riga come «⚑ Non tutti i valori vengono da Mostri 0.69 — Attacchi da Mostri 0.47».
> Quella riga sparisce da sé quando la scheda è tutta aggiornata.

---

## 2. Quali schede restano incomplete, e perché

Le schede che tengono ancora qualche valore dell'edizione precedente lo fanno per **tre motivi**, tutti riconducibili
a uno solo: la 0.69 ha spostato parte dell'informazione dalle singole schede alle pagine **«regole comuni»** di ogni
blocco (Non morti, Melme, Oggetti animati, Bestie…), e l'app aggancia quelle pagine solo ad alcuni blocchi.

1. **Capacità** — i tratti comuni (Melma, Corpo amorfo, Aderenza, Scurovisione) stanno ora nelle pagine del blocco.
   L'app tiene il testo di prima invece di perderlo.
2. **Attacchi** — l'AC degli attacchi, per alcuni blocchi, sta nelle pagine comuni; e alcune schede scrivono il
   danno senza la Natura (vedi la domanda A.274).
3. **Abilità** — quelle scritte con una condizione («Furtività 14 solo nelle Terre del Fuoco»): l'app tiene il
   numero di prima e la condizione resta nel testo.

Non è un dato perso: è un dato che l'app non sa ancora andare a prendere dove il manuale l'ha messo. **Il lavoro
che le chiuderebbe quasi tutte è un lotto nostro, non una cosa da chiedere a Davide.**

---

## 3. Domande nuove

### A.273 — Le creature a due forme: quale misura vale sulla mappa?

Alcune creature della 0.69 hanno **due forme con movimento e ingombro diversi**, scritti nella stessa riga:

> Lupo mannaro — Movimento e spazio: «Umanoide e ibrido: 6 / 12 / 18 Q, 1 × 1 Q; lupo: 8 / 16 / 24 Q, 1 × 2 Q»
> Tigre mannara — «Umanoide: 6 / 12 / 18 Q, 1 × 1 Q; ibrida: 6 / 12 / 18 Q, 2 × 2 Q; tigre: 8 / 16 / 24 Q, 1 × 2 Q»
> Ammantato — «2 × 2 Q aperto, 1 × 1 Q raccolto a terra»

La scheda del nemico tiene **un** movimento e **un** ingombro. Oggi l'app legge la **forma di base** (la prima
scritta, quella in cui la creatura si presenta) e lascia l'altra scritta fra le capacità, dove il Direttore la
legge; per i licantropi l'ingombro resta non scritto, perché le due forme ne hanno due diversi e scegliere
sarebbe inventare.

**La domanda:** le due forme vanno trattate come le **configurazioni** della Madre delle Murene (A.203), cioè con
un comando della plancia che cambia misura e andatura mantenendo la creatura dov'è? Sarebbe la soluzione naturale,
ma prima di costruirla serve il tuo sì, perché cambia come la creatura si muove sulla mappa.

### A.274 — Attacchi senza la Natura del danno

Ventitré attacchi della 0.69 hanno il danno scritto **senza la Natura**: solo i dadi.

> Goblin — Spada leggera: VA 10, danno «1d6+2» (nessuna Natura)
> Goblin — Balestra piccola: VA 8, danno «1d6+1»

Il §3 del manuale dice che «Natura del danno e proprietà restano campi separati», quindi la casella vuota non si
può leggere come «Naturale» senza decidere. L'app **non lo deduce**: quegli attacchi restano fra le capacità, dove
si leggono ma non si tirano, e l'elenco degli attacchi di quelle schede resta quello dell'edizione precedente.

**La domanda:** un attacco d'arma senza Natura scritta è **Naturale** per impostazione, o va letto caso per caso?
Se è «Naturale per impostazione», la mettiamo come regola e quei ventitré attacchi tornano tirabili subito.

### A.275 — La Taglia si deduce dall'ingombro?

La A.167 dice che **la Taglia non si deduce dall'ingombro**. L'importatore però la ricava da «spazio ≥ 2 × 2 Q», e
in questo lotto si sarebbe trovata una Taglia «Grande» su **86 creature** che non ce l'avevano e per cui il manuale
non la scrive da nessuna parte. Non l'abbiamo scritta, e le schede sono rimaste come prima.

**La domanda:** la Taglia di una creatura va scritta nel manuale quando conta, oppure «2 × 2 Q o più = Grande» è
una regola che possiamo applicare noi? Oggi serve solo a scrivere «· Taglia Grande» accanto al movimento.

---

## 4. Resta aperta dal lotto 203

**Il JSON dei PNG è rimasto indietro rispetto al manuale.** `SIMPLY_RPG_PNG_Abilita_v0.67.json` dichiara al suo
interno lo sha256 del Manuale dei Mostri **0.67**; su Drive il manuale è **0.69**. Finché le due fonti non sono
della stessa edizione, i venticinque modelli PNG restano alla 0.67. Serve il JSON rigenerato dall'edizione
corrente: è un'esportazione del foglio, non un lavoro di scrittura.

---

## 5. Voci da spostare fra le «Risolte»

Nessuna.
