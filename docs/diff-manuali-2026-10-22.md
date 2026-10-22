# Controllo dei manuali del 22 ottobre 2026

> **Stato: applicato il 22/10 pomeriggio.** Questa ricognizione è nata senza applicare niente; il lotto
> successivo dello stesso giorno ha recepito tutta la 0.49. Che cosa è stato fatto davvero, e due errori di
> questa ricognizione, sono in fondo: «Che cosa è stato applicato».

Qui c'è che cosa è cambiato e, per ogni cambiamento di regola, che cosa andrà fatto in `data/*.json`.

## Che cosa è cambiato davvero

Quattro Doc su Drive avevano un `modifiedTime` più recente del registro, ma **solo due hanno cambiato
contenuto**: gli altri due erano già salvati nella loro edizione attuale e il Doc è stato semplicemente
riesportato (formato delle tabelle, ancore `{#...}`, escape `\+`, entità `&#10;`).

| Manuale | Edizione salvata prima | Edizione di oggi | Esito |
|---|---|---|---|
| Giocatore | 0.48 | **0.49** | **cambiato**: Tecniche Interiori (§8.9.1) e AR del §5.13 |
| Magia | 1.5 | **1.6** | **cambiato**: una riga di regola (AR dell'Aura di Resistenza) |
| Armamenti | 0.64 | 0.64 | solo riesportazione: **nessuna differenza di sostanza** |
| Equipaggiamento | 0.8 | 0.8 | solo riesportazione: **nessuna differenza di sostanza** |

Come si è distinto il formato dalla sostanza: i due testi sono stati normalizzati (via gli escape, i
grassetti, le righe di allineamento delle tabelle, gli spazi) e confrontati riga per riga. Dopo la
normalizzazione, su Armamenti restano 2 righe diverse (una è il titolo «7.23 Catalogo dei rinforzi», che
ricompare identico con l'ancora nuova) e su Equipaggiamento 1 (una cella di tabella in cui `&#10;` è
diventato uno spazio). Su Magia le righe diverse sono 11, e **una sola** cambia un numero di regola.

> Nota sul registro: la colonna «edizione vista» di `docs/manuali-drive.md` era rimasta indietro
> (diceva Giocatore 0.46, Magia 1.3, Armamenti 0.59, Equipaggiamento 0.6) mentre i testi in
> `docs/manuali-txt/` erano già alle edizioni 0.48, 1.5, 0.64 e 0.8. I confronti qui sotto sono fatti
> contro il testo salvato, che è il paragone utile; il registro è stato riallineato.

## Giocatore 0.49 — Tecniche Interiori riequilibrate (REGOLA)

Il Doc è stato toccato il 21/10 alle 12:08 UTC, cioè **cinque ore dopo** le risposte di Davide nel Doc
«per-davide.md» (21/10, 07:02 UTC). Dove i due si sovrappongono vale il manuale, che è più recente.

### 1. Costi e durate di 11 Tecniche su 28

| Tecnica | Prima | Adesso |
|---|---|---|
| Aura di Resistenza | 4 PM, 3 Round | **3 PM, 5 Round** |
| Salto della Tigre | 6 PM | **4 PM** |
| Pelle di Rinoceronte | 6 PM, 3 Round | **4 PM, 5 Round** |
| Vipera dal Cappuccio | 6 PM | **5 PM** |
| Passo dell'Ombra | 5 PM, 3 Round | 5 PM, **5 Round** |
| Corsa di Nomura | 6 PM, 3 Round | 6 PM, **5 Round** |
| Illusione Lunare | 5 PM, 3 Round | **3 PM, 5 Round** |
| Mani di Yorama | 5 PM | **3 PM** |
| Radici della Montagna | 4 PM, 3 Round | **2 PM, 5 Round** |
| Onda Interiore | 5 PM | **3 PM** |
| Corpo Infrangibile | 4 PM | **3 PM** |

**Nei dati:** `data/tecniche_interiori.json`, campi `costo_pm` e `durata_round` delle 11 voci; poi
`versione_manuale`, oggi fermo a «Giocatore 0.45».

### 2. Imposizione della Mano Curativa: tabella nuova e limite di 24 ore

| Prima | Adesso |
|---|---|
| 1 PM — sospende il Sanguinamento 10 Round | 1 PM — invariato |
| 2 PM — arresta il Sanguinamento | 2 PM — invariato |
| **4 PM** — recupera 1d4 + Mod SAG PV | **2 PM** |
| **10 PM** — migliora di uno stato la Ferita | **4 PM** |

In più, una regola nuova: «La riduzione della Ferita è consentita una sola volta ogni 24 ore per
beneficiario: il limite è condiviso con Guarigione, indipendentemente dall'utilizzatore o dalla capacità
impiegata, e una nuova Ferita non lo azzera.» Le altre tre opzioni restano ripetibili.

**Nei dati:** `opzioni_costo` della voce (oggi 1, 2, 4, 10 PM) e un campo per il limite di 24 ore, che
l'app oggi non ha.

> **Attenzione, tocca la A.173 in corso.** La risposta di Davide sull'Hachimaki elenca i costi
> «0 → 0, 1 → 1, 2 → 1, 4 → 3, 10 → 9», cioè la tabella **vecchia**. Con la 0.49 i costi di Imposizione
> sono 1, 2, 2, 4, quindi con l'Hachimaki diventano **1, 1, 1, 3**. La regola della riduzione (−1 PM,
> minimo 1, gratuita resta gratuita, sull'uso scelto) non cambia: cambiano i numeri su cui si applica.
> Da decidere con Marcello se applicare la tabella nuova e segnalarlo a Davide.

### 3. Meditazione: recupero diverso (REGOLA)

Prima: «ogni ora completa recupera **3 PV, 2 PM e 1 punto di recupero dell'Affaticamento**».
Adesso: «**1d6 + Mod COS PV (minimo 1, come nel Riposo breve), 3 PM e 2 punti di recupero
dell'Affaticamento**».

**Nei dati:** i numeri del recupero della Tecnica, e il pannello «Medita» che li mostra (A.174 è aperta
proprio su «Medita»: la risposta andrà riletta con questi valori).

### 4. AR dell'Aura di Resistenza: +1 → +2 magica (REGOLA)

§5.13: «Corazza Potenziata (+1 AR magica), Aura di Resistenza (**+2** AR magica) e Pelle di Rinoceronte
(+1 AR non magica…) si sommano… Insieme concedono **+4** contro il Ravvicinato Naturale o Magico, **+3**
contro gli altri danni Naturali o Magici e **+3** contro l'Etereo» (prima: +1, +3, +2, +2).

**Nei dati:** `data/regole.json` → `ar.tecniche`, voce `aura-di-resistenza`: `totale` e `magica` da 1 a 2,
e `durata` da «3 Round» a «5 Round»; la voce `pelle-di-rinoceronte` tiene AR 1 ma passa a «5 Round».
Anche `tecniche_interiori.json` → `Aura di Resistenza` → `effetti.breve` dice ancora «+1 AR magica».

### 5. Rivelare l'Inganno: bonus esteso (REGOLA minore)

Aggiunto: «Concede inoltre **+5 alle PS Magia** espressamente previste per riconoscere illusioni visive.
Il bonus non rende automatico il riconoscimento.»

**Nei dati:** `effetti` della Tecnica, che oggi coprono il solo +5 a Percezione.

## Magia 1.6 — una riga di regola

L'unica differenza di sostanza è la stessa del punto 4: nel paragrafo sul cumulo delle protezioni, «Aura
di Resistenza… **+2 magica**» dove prima diceva +1. Tutto il resto del diff (612 righe «sparite» e 426
«nuove» prima della normalizzazione) è indice, ancore e tabelle riformattate.

## Armamenti 0.64 ed Equipaggiamento 0.8 — nessun cambiamento

Riesportazione pura. Nessun dato da toccare.

## Le due verifiche chieste

### A.173 — «artefatti solo passivi → SnT 0» e l'Hachimaki

- **Manuale della Magia: già recepito, e non da oggi.** In due punti (§24.2 e il paragrafo sulla capacità
  di sintonizzazione) il testo chiude con: «Per il beneficio passivo sui PM dell'Hachimaki si applica
  l'eccezione del §28.1: **SnT 1 e sintonizzazione necessaria**.» L'elenco degli Artefatti riporta
  «Hachimaki della Disciplina Interiore — SnT: 1». La stessa frase c'era già nella 1.5 salvata, quindi è
  stata recepita in una revisione precedente, non il 21/10.
- **Manuale dell'Equipaggiamento: già recepito.** §10.10, campo «**Sintonizzazione**: SnT 1; necessaria
  per il beneficio».
- **Manuale degli Armamenti: NON recepito.** Il §7.10 (riga 2609 del testo salvato) dice ancora, senza
  riserve: «Un Artefatto con sole proprietà passive ha SnT 0, **qualunque sia la sua potenza**.» Non
  nomina l'eccezione, e la parola «Hachimaki» non compare mai in tutto il manuale.

**Conclusione:** la correzione approvata da Davide manca in un manuale su tre, ed è proprio quello
generale citato nella risposta (Armamenti §7.10). Resta da chiedere nel pacchetto per il Doc.

### A.171 e A.172 — portata 0 Q degli Sciami e sagome

Il Manuale dei Mostri **non è cambiato** (0.3, 17/10 18:58 UTC) e contiene già tutto quello che serve:

- «**Spazio condiviso.** Uno Sciame occupa 1 × 1 Q e può condividere lo spazio di altre creature. Per
  attaccare deve condividere con la vittima almeno un Q e il relativo volume: un gruppo in quota non morde
  chi è al suolo. **La portata è 0 Q**; anche un'Opportunità richiede che il bersaglio sia ancora nello
  spazio condiviso al momento dell'innesco. Entrare o restare nel Q non infligge danno automatico.»
  (sezione «Sciami e piccola fauna», «Sciami spazio e regole operative»).
- «**Difese e danni.** […] condividere il Q non annulla la sua AR.»
- Sulla misura della portata: «**La portata si misura dal bordo dello spazio occupato, richiede un
  percorso libero e non permette di colpire attraverso muri.**» — è la frase che sostiene la A.172
  (portata dal quadretto più favorevole, ma non attraverso un ostacolo invalicabile).
- «Lo spazio occupato non conferisce da solo bonus per colpire, portata aggiuntiva o immunità alle prese.»

Nel Manuale del Giocatore 0.49 non compaiono né «Sciame» né «portata 0» né «sagoma»: la materia è tutta
nel Mostri.

## Elenco dei dati da aggiornare (nessuno applicato)

1. `data/tecniche_interiori.json`: `costo_pm` e `durata_round` delle 11 Tecniche della tabella sopra.
2. `data/tecniche_interiori.json`: `opzioni_costo` di Imposizione della Mano Curativa (1, 2, **2**, **4**)
   e il limite di una riduzione di Ferita ogni 24 ore per beneficiario, condiviso con Guarigione.
3. `data/tecniche_interiori.json`: i numeri del recupero della Meditazione (1d6 + Mod COS PV minimo 1,
   3 PM, 2 punti di Affaticamento).
4. `data/tecniche_interiori.json`: `effetti` di Rivelare l'Inganno (+5 PS Magia sulle illusioni visive) e
   `effetti.breve` di Aura di Resistenza («+1 AR magica» → «+2»).
5. `data/regole.json` → `ar.tecniche`: `aura-di-resistenza` a `totale: 2`, `magica: 2`, `durata: "5 Round"`;
   `pelle-di-rinoceronte` a `durata: "5 Round"`.
6. `data/tecniche_interiori.json` → `versione_manuale`: da «Giocatore 0.45» a «Giocatore 0.49».
7. Da decidere: la tabella dell'Hachimaki della A.173 va ricalcolata sui costi nuovi (1, 1, 1, 3).

---

## Che cosa è stato applicato (22 ottobre, pomeriggio)

Tutta la 0.49, con la regola di sempre: **l'app segue l'ultima versione del manuale**. La A.178 nel Doc resta
aperta come conferma a Davide, non come blocco.

I numeri non sono stati ricopiati a mano: tre script usa e getta hanno letto le schede del manuale in
`docs/manuali-txt/giocatore.md` e scritto i dati, e `tests/giocatore-049.test.js` rilegge il manuale scheda per
scheda per controllare che costo e durata di **ogni** Tecnica combacino.

| Blocco | Fatto |
|---|---|
| 11 Tecniche riequilibrate | `costo_pm` e `durata_round` dal manuale (17 valori) |
| Imposizione della Mano Curativa | tabella 1/2/**2**/**4**; con l'Hachimaki **1/1/1/3**, calcolati dalla regola |
| Limite nuovo delle 24 ore | promemoria della Tecnica (l'app lo ricorda, non lo conta: è un limite del tavolo, condiviso con Guarigione) |
| Meditazione Profonda | recupero «1d6 + Mod COS PV (minimo 1), 3 PM, 2 punti di Affaticamento» in `testo`, `promemoria` e `breve` |
| Aura di Resistenza | `ar.tecniche` → `totale` e `magica` a **2**, durata **5 Round**; Pelle di Rinoceronte durata 5 Round |
| Visione del Vero | effetto nuovo: **+5 alle PS Magia** per riconoscere illusioni visive |
| `versione_manuale` | «Giocatore 0.45» → «Giocatore 0.49» |

### Due errori di questa ricognizione, corretti applicando

1. **«Rivelare l'Inganno» non esiste.** La Tecnica che guadagna il +5 alle PS Magia è **Visione del Vero**
   (§8.9.1). Il nome sbagliato era mio: nel manuale quella Tecnica non c'è e non c'è mai stata.
2. **Mancava un punto dall'elenco dei dati da aggiornare:** i campi di testo `costo`, `azione`, `bersaglio` e
   `durata` di ogni Tecnica — quelli che la tab Poteri stampa nella riga di consultazione. Erano rimasti alla
   0.48 mentre `costo_pm` e `durata_round` erano già passati alla 0.49, quindi la scheda avrebbe scritto
   «4 PM» accanto a un costo di 3. Quindici campi allineati, e ora una prova lo impedisce
   (`tests/giocatore-049.test.js`, «la riga di consultazione non può contraddire i numeri»).

### I personaggi già esistenti: nessuna migrazione

Nel file di un PG le Tecniche sono **solo identificativi** (`"tecniche": ["aura-di-resistenza", …]` dentro la
voce del livello): costi, durate ed effetti si leggono dal catalogo a ogni calcolo. Cambiando il catalogo si
aggiornano da soli, anche i personaggi salvati con la 0.45. Verificato su Aiko Tenzan (otto Tecniche prese ai
livelli 4 e 5, file del 02/10): il file non contiene né `costo_pm` né `durata_round`, e la scheda calcolata oggi
dà l'Aura di Resistenza a 3 PM. **Nessun PG reale è stato aperto né scritto.**

### Una decisione approvata che il manuale supera: A.179

La **decisione 41** di `docs/risposte-master.md` (risposta A.48 di Davide) fissava «Aura di Resistenza +1 AR
magica per 3 Round; Pelle di Rinoceronte +1 non magica… 3 Round. Insieme: +3 contro il ravvicinato, +2 contro
il resto, +2 magica». Il §5.13 della 0.49 dice +2, 5 Round e insieme +4 / +3 / +3.

Come da istruzione, **la decisione non è stata riscritta**: resta il verbale di quello che Davide approvò il
29/09. L'app segue il manuale, che è più recente, e la differenza diventa la domanda **A.179**.
