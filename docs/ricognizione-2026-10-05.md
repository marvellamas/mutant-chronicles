# Ricognizione del 5 ottobre 2026: «Risposte approvate — aggiornamento dei quesiti aperti»

Fonte: Doc di Davide «E&L – Risposte e correzioni approvate» (`1VaqZaAe4NK5P8A956Eahua_ZT60eh3ohnR2xSqh-tVs`),
versione del 05/10/2026 alle 01:07:32 UTC (da 46 a 72 KB). Testo salvato per intero in
`docs/risposte-master-2026-09-26.md`. La parte precedente del Doc è invariata, salvo una riga in testa alla
«Correzione aggiuntiva» del 03/10: «DECISIONE SUPERATA: il contingente vigente è di 7 punti».

**Solo ricognizione e piano.** In questo passaggio non si toccano dati né codice. Le decisioni non sono ancora
registrate in `docs/risposte-master.md`: si registrano lotto per lotto, quando si applicano. Davide stesso lo
chiede in coda al blocco: le voci non vanno segnate come implementate solo perché la risposta è registrata.

Controllo della cartella di Davide (`1p4jh2tKIN9kRimD4ifzth_YjWUZTH6-6`): elencata per intero, con
paginazione.
- È cambiato solo l'E&L.
- Giocatore, Magia, Armamenti, Equipaggiamento, Veicoli, Scout, Mostri, Talenti magici, Layout e Prontuario
  sono invariati rispetto al registro. Magia ed Equipaggiamento hanno la versione del 02/10 09:12, già
  esaminata il 02/10 sera.
- «per-davide.md» è cambiato il 04/10 alle 17:15, scaricato in `docs/per-davide.md`, con un difetto
  descritto in fondo.
- Nella cartella «FILE PG» Davide ha caricato il 04/10 sera i file dei sette PG del gruppo: servono per la
  A.87, letti in copia senza modificarli.

Legenda: **Stima** P = piccola (meno di un'ora o solo dati e testi), M = media (mezza sessione), G = grande
(una sessione o più). Le domande nuove partono da A.107.

---

## 1. Abilità e avanzamento

### A.56 e A.90 — Distribuzione e 7 punti Abilità liberi
- **Decisione.** Basi dalla prima Classe (S 7 / P 6 / G 5 / N 3, 122 punti) e limiti al I Grado 12/9/7/5.
  Sette punti liberi al 1° livello e ai livelli 4, 8, 12, 16, 20; ogni punto deve aumentare il VA entro il
  limite del momento. Sono superati il vecchio Avanzamento ≤ 3 e le basi per Addestramento. Va adeguato
  anche il Manuale dei Mostri §5.2.
- **Oggi.** È già così.
  - `regole.json` → `competenze` e `creazione.punti_abilita_liberi: 7`; `src/competenze.js`; `puntiUtili`
    alla creazione (`src/calc.js`) e ai livelli (`src/avanzamento.js`).
  - Il limite di Avanzamento 3 non esiste più nel codice. Resta un commento superato in
    `src/avanzamento.js:328`.
  - L'errata del Mostri §5.2 è già nel Doc per Davide (sezione 3).
- **Cosa cambia.** Solo il commento.
- **PG / SS.** Nessun impatto.
- **Stima.** P. Nessuna dipendenza.

### A.57 — Migrazione dei punti liberi
- **Decisione.** Si ricostruisce il PG evento per evento: prima gli incrementi automatici, poi i punti
  liberi entro i limiti del momento. Le assegnazioni valide si conservano; quelle che allora non potevano
  aumentare il VA si riassegnano. Un punto legale non si rimborsa se un aumento successivo (di
  Caratteristica o di Classe) lo porta oltre il limite. Finché la ricostruzione non è finita, l'app blocca
  i nuovi avanzamenti.
- **Oggi.** Il PG è già una catena di eventi rigiocata a ogni calcolo (`ricalcola`, `applicaVoce` in
  `src/avanzamento.js`).
  - **Ordine.** Dentro ogni evento: Caratteristiche, poi Grado con i +1 di Classe (registrati sempre), poi
    i punti liberi. È l'ordine chiesto.
  - **Punto inattivo.** Si valuta con i limiti e i Mod **del momento dell'evento** (`puntiUtili` sullo stato
    di quel livello) e finisce in `stato.inattivi`. Non viene rivalutato a fine catena: un punto legale
    reso inutile da un aumento successivo resta nel calcolo e non si rimborsa. Anche questo è come chiesto.
  - **«Assegna».** `separaPuntiLiberi`, `statoCompletamento`, `validaCompletamento`,
    `applicaCompletamento(…, inattivi)` e `src/ui/completa.js`. Trasforma ogni evento con meno punti attivi
    di quelli previsti (mancanti o inattivi) in un completamento, un evento alla volta dal più vecchio. I
    punti nuovi si registrano nello stesso evento, con i limiti di allora.
  - **Blocco.** L'avanzamento è già bloccato finché ci sono completamenti (`validaLivello`).
  - **«Togli».** Funzioni `avvisoPuntiEccesso`, `statoRimozione`, `validaRimozione`, `applicaRimozione`.
    I punti in eccesso danno solo l'avviso: **non bloccano** e intanto contano.
- **Differenze da A.57.**
  1. **Vincolo in avanti.** `validaCompletamento` oggi **vieta** di assegnare a un evento vecchio punti che
     renderebbero inattivi punti di livelli successivi. In una ricostruzione cronologica si sistema prima
     l'evento vecchio e poi si riassegnano i successivi rimasti senza effetto: la scelta passata non deve
     dipendere da quelle future.
  2. **Eccesso e inattivi nello stesso evento.** Esempio: Lucas di collaudo, con 10 punti e 5 inattivi per
     evento, vede due avvisi. «Togli» lascia scegliere punti attivi e tenere gli inattivi, quindi serve un
     giro di riassegnazione in più. La ricostruzione deve scartare per primi gli inattivi.
  3. **Eccesso e blocco.** L'eccesso oggi non blocca. Va deciso se fa parte della ricostruzione da completare
     (A.108).
  4. **Stampa.** La SS segnala solo l'eccesso, non i punti da assegnare o riassegnare.
- **Modello proposto** (funzioni pure in `src/avanzamento.js`, accanto a `separaPuntiLiberi`).
  - `ricostruzione(personaggio, dati)` rigioca gli eventi con `statoCreazione` e `applicaVoce` e classifica i
    punti salvati di ogni evento in tre gruppi: *conservati*, *da riassegnare* (inutili al momento) ed
    *eccesso* (oltre i previsti, scartando per primi gli inattivi). Dice anche i *mancanti* e se la
    ricostruzione è `completa`.
  - Un solo flusso guidato, «Sistema i punti», al posto dei due avvisi «Assegna» e «Togli». Va un evento
    alla volta dal più vecchio, con l'interfaccia di `completa.js` e `sali.js` → `tabellaPuntiAbilita`.
  - `validaCompletamento` perde il vincolo in avanti. Gli eventi successivi diventati inutili tornano in coda.
  - `validaLivello` blocca finché `ricostruzione.completa` è falso.
  - Avviso anche nella SS (foglio 2 e barra di stampa).
  - Si riusano `puntiUtili`, `limiteAbilita`, `grezzoDi`, `limiteDi`, `applicaCompletamento` ed
    `eventiPuntiLiberi`.
- **PG / SS.** I valori dei PG regolari non cambiano, perché la valutazione è già fatta al momento
  dell'evento. Cambiano solo i passi chiesti nei casi a cascata.
  - I sette PG del gruppo caricati da Davide il 04/10 sera sono puliti con le regole correnti: nessun punto
    da assegnare, nessun eccesso.
  - I tre PG di collaudo e Lucas di collaudo hanno ancora 10 punti per Grado: avranno il flusso unico.
- **Stima.** M. Dipende dalle risposte ad A.107 e A.108; vanno rifatti `tests/completamento.test.js` e
  `tests/competenze.test.js`.
- **Domande.** A.107, A.108.

### A.58 — Bonus di Corporazione e limite
- **Decisione.** Il +1 di Corporazione sta nel VA personale e può essere inefficace oltre il limite. Resta
  nel calcolo e torna utile quando il limite sale; i modificatori circostanziali vengono dopo il limite.
- **Oggi.** È già così.
  - Il +1 è nel grezzo e si applica `vaPersonale = min(grezzo, limite)` (`src/competenze.js:51`).
  - Equipaggiamento e condizioni si aggiungono dopo (`src/avanzamento.js`, `applicaCondizioni`).
- **Cosa cambia.** Al più, un test esplicito.
- **PG / SS.** Nessun impatto.
- **Stima.** P.

---

## 2. Combattimento

### A.55 — Caratteristica del bonus al danno
- **Decisione.**
  - FOR per Corpo a corpo, senz'armi e Armi da guerra.
  - DES per Armi da mischia, Armi da lancio e Armi leggere.
  - INT per Armi medie e Armi pesanti (le pesanti colpiscono con FOR).
  - SAG per Magia e Risorse Interiori.
  - Il bonus non scende sotto 0, con tetto +1/+2/+3 per livello. Si applica a ogni colpo prima dei
    moltiplicatori. Resta l'eccezione di granate e razzi.
- **Oggi.** È già così.
  - `regole.json` → `danno_caratteristica` (con `caratteristica_per_abilita` per le pesanti e `esplosivi`);
    `bonusDannoCaratteristica` in `src/calc.js`.
  - Somma prima del moltiplicatore in `src/attacco.js`; SAG in `src/lancio.js` e per Onda Interiore.
- **Cosa cambia.** Niente.
- **PG / SS.** Nessun impatto.
- **Stima.** P.

### A.40 — Carica oltre 12 Q
- **Decisione.** La Carica arriva fino alla Corsa massima: da 3 a 6 Q −2/−4, da 7 Q alla Corsa −4/−6,
  sempre danno ×2. Il limite rigido di 12 Q va tolto, senza una terza fascia.
- **Oggi.** Fasce 3–6 e 7–12 in `regole.json` → `attacco_ravvicinato` (riga ~2593). Il controllo «oltre
  12 Q nessun valore» è in `src/attacco.js:883-890`.
- **Cosa cambia.**
  - Ultima fascia aperta (`a: null`, «fino alla Corsa»), con il validatore che l'accetta.
  - Via il controllo in `attacco.js`.
  - Pulsanti dei Q in `src/ui/attacco.js`: 3, 6, 7 e «Corsa».
  - Testo «7–12 Q» della stampa (`src/stampa.js`, Azioni di combattimento).
- **PG / SS.** Nessun valore salvato cambia. Nella SS cambia il testo della fascia.
- **Stima.** P.

### A.38 — Attacco a distanza: sette chiarimenti
- **Decisione e stato attuale, punto per punto.**
  1. *Movimento Tattico + Movimento Fluido si sommano* (Passo/Corsa/Scatto 0/−2/−6 → 0/0/−4 con un
     Talento → 0/0/−2 con entrambi). **Diverso:** oggi vale solo la riduzione migliore (`src/attacco.js:284`,
     `428-429`). Con entrambi resta −4: va sommato, con minimo 0.
  2. *Attaccare dalla Copertura*: 1 AzM + 1 AzP, uscita e rientro entro 6 Q, dal livello 12 le due AzP.
     **In parte:** il costo c'è e il limite di 6 Q è reso come «solo Passo»; mancano le due AzP dal 12°
     livello.
  3. *Seconda Prova per non colpire un altro soggetto*: VA dell'Abilità −4 con i modificatori personali,
     senza distanza, Copertura, movimento o modalità. Fuoco di Precisione la porta a −2; Fuoco Controllato
     dell'Agente la elimina. **Già così** (`attacco.js:469`, dati dei Talenti).
  4. *Mira Selettiva*: Tiro Mirato e immobilità per il Round; Copertura leggera −2 → 0, media −4 → −2,
     totale impedisce. **Già così.** L'immobilità per tutto il Round è un promemoria.
  5. *Imbracciare*: 1 AzM senza Prova; si perde con qualsiasi movimento, caduta o rilascio; −4 VA senza;
     Imbracciatura Rapida gratuita una volta per Round. **Quasi:** il −4 e la perdita col movimento ci sono.
     Mancano l'AzM nel conteggio delle Azioni e il «una volta per Round»; l'arma parte imbracciata.
  6. *Tiro a Bruciapelo Migliorato* contro un bersaglio consapevole che impegna al Contatto: valgono le
     penalità del Tiro Ravvicinato (−2 leggere / −4 medie; con Tiro Istintivo 0/−2), danno ×2 senza +3/+5,
     colpo singolo e Raffica Breve. **Diverso:** il ×2 e i modi ci sono, ma la penalità del Tiro Ravvicinato
     si applica solo se si spunta anche «ravvicinato». Con il Talento e un bersaglio consapevole va applicata
     da sé.
  7. *Movimento Evasivo*: almeno 1 Q reale, 1 AzM + 1 AzP, incompatibile con Fermo, registrato
     esplicitamente. **In parte:** per chi attacca è conforme. Per il bersaglio, il movimento non ha
     l'opzione Passo e «fermo» viene convertito in Passo (`attacco.js:83`, `444`): va corretto.
- **PG / SS.** Nessuna migrazione. Cambiano i VA proposti in «Attacca!» per chi ha entrambi i Talenti di
  movimento o Bruciapelo Migliorato. Nella SS al più i testi delle manovre.
- **Stima.** M (sette pezzi piccoli in `src/attacco.js` e `src/ui/attacco.js`, con i test).

### A.53 — AR magica e Corazza Potenziata
- **Decisione.** Corazza Potenziata vale solo con un'armatura o uno scudo classificati esplicitamente come
  Artefatto (Mistico o TecnoMistico) con almeno 1 PI. Dà +1 all'AR totale e alla componente magica, una
  sola volta. Le 14 armature segnalate non lo diventano automaticamente; lo Scudo delle Guardie Sacre sì.
- **Oggi.** È già così.
  - `src/protezione.js:189-202` richiede `artefatto` da `infoArtefatto` (classificazione del catalogo) e PI
    maggiori di 0.
  - Oggi soddisfa il requisito solo lo Scudo delle Guardie Sacre; nessuna eccezione è fissata nel codice.
- **Cosa cambia.** Al più, controllare la tipologia «Mistico/TecnoMistico» in modo esplicito.
- **PG / SS.** Nessun impatto.
- **Stima.** P.

### A.54 — Ricarica dei revolver
- **Decisione.** 1 AzP riempie il tamburo, anche in parte, e si sottraggono solo le cartucce inserite.
  Ricarica Rapida è gratuita una volta per Round; Ricarica Migliorata non dà nulla sul tamburo.
- **Oggi.** È già così: modo `tamburo` in `src/ricarica.js` e `munizioni.json` → `ricarica`.
  Ricarica Rapida è un promemoria.
- **Cosa cambia.** Niente.
- **PG / SS.** Nessun impatto.
- **Stima.** P.

### A.76 — Sanguinante X da un attacco
- **Decisione.**
  - Se almeno 1 danno supera l'AR, dopo il danno si perdono subito X PV ignorando AR, Parata e Schivata: una
    volta per bersaglio e per attacco.
  - La perdita periodica avviene all'INI della fonte, una volta per Round; il primo Round è già contato.
  - Fra più sanguinamenti vale il maggiore.
  - 0 PV per sanguinamento non danno una Ferita immediata.
- **Oggi.** Quasi tutto è già così: `src/danno.js` (`applicaColpo`, perdita iniziale) e `src/periodici.js`
  (INI della fonte, una volta per Round, il maggiore).
- **Cosa cambia.**
  - Il controllo «almeno 1 danno oltre l'AR» oggi sta solo nell'interfaccia (`src/ui/colpo.js`): va
    spostato nel motore.
  - Se è già in corso un sanguinamento maggiore, la perdita immediata deve usare la regola del maggiore.
- **PG / SS.** Nessun impatto.
- **Stima.** P.

### A.77 — Perforante
- **Decisione.** Perforante X riduce, fino a 0, il totale dell'AR non magica, a ogni applicazione di danno.
  Non tocca la parte magica, non è un'erosione e non fa perdere PI.
- **Oggi.** È già così (`arApplicabile` in `src/danno.js`).
- **Cosa cambia.** Niente.
- **PG / SS.** Nessun impatto.
- **Stima.** P.

### A.106 — Illuminazione e penalità visive
- **Decisione.** Luce sufficiente 0, penombra −2 VA, luce molto scarsa −4, buio totale come Accecato (−8).
  - **Si applica a:** Percezione visiva, attacchi, Difese che dipendono dalla vista e attività pratiche
    visive. Non all'udito, a Potere o alle PS.
  - **Al buio totale:** azioni visive fallite, niente Tiro o Colpo Mirato. Luce e Accecato non si sommano.
  - **Visione notturna:** elimina −2/−4 entro la portata (impianto 80 Q, termico 40 Q, Vista Felina 20 Q),
    mai nel buio assoluto.
  - **Visione Perfetta:** −3 alle penalità di Percezione visiva.
- **Oggi.**
  - Non esiste nessun livello di illuminazione.
  - Visione notturna e notturna CYBERTRONIC sono promemoria con `TODO(Davide) A.106`
    (`data/equipaggiamento/impianti.json:137`, `166`).
  - Accecato dà −8 alla categoria `vista` (attacchi, Difese, Pilotare).
  - Visione Perfetta non ha effetti; Vista Felina ha solo il `senso`.
- **Cosa cambia.**
  - Livello di luce nella sessione al tavolo (sufficiente, penombra, scarsa, buio) nei valori effettivi, con
    la provenienza.
  - Effetti di riduzione per gli impianti, Vista Felina e Visione Perfetta.
  - Via i TODO; frasi del manuale in `verifica_frasi`.
- **PG / SS.** Solo valori di sessione, nessuna migrazione. Nella SS al più una nota sotto la Percezione.
- **Stima.** M.
- **Domande.** A.116 (quali Abilità sono «attività pratiche visive»).

---

## 3. Magia

### A.32 — Talenti magici e Concentrazione
- **Decisione.** Confermati i 18 Talenti.
  - Potere Mistico: +5 PM per acquisizione, fino a tre.
  - Potere Mistico e Recupero Mistico richiedono una riserva personale e non danno da soli il lancio.
  - Il mantenimento della Concentrazione è una PS Volontà su CAR; il +3 di Concentrazione Migliorata vale
    solo per mantenerla.
  - Concentrazione Operativa: azioni normali mantenendo un solo Incantesimo, senza lanciarne altri, salvo
    Contromagia e Convertire Potere.
- **Oggi.** È già così.
  - Ci sono tutti e 18 in `data/talenti_liberi.json`.
  - Potere Mistico ha `max_acquisizioni: 3` e `effetti.pm: 5`, controllato in `src/avanzamento.js:425`.
  - Il prerequisito `capacita: riserva_pm` c'è; Concentrazione Migliorata è un uso specifico di Volontà +3.
  - Concentrazione Operativa e Recupero Mistico sono solo testo. L'app non ha un recupero orario dei PM.
- **Cosa cambia.** Facoltativo: in «Lancia!», un avviso se c'è già un Incantesimo a Concentrazione attivo.
- **PG / SS.** Nessun impatto.
- **Stima.** P.

### A.72 — Anticipazione: esempi approvati, quesito aperto
- **Decisione.**
  - **Regola generale:** un solo aspetto, un solo gradino; costo raddoppiato, Potere più difficile di una
    categoria, Prova sempre.
  - **Talenti:** i cinque Talenti degli aspetti tolgono il raddoppio del costo; Anticipazione Migliorata
    toglie solo la difficoltà.
  - **Scale approvate:** Irrobustire, Telecinesi (per versione, Concentrazione o fissa), Mente Disincarnata,
    Illusione, la natura del danno dei quattro Elementali, Resistenza Fisica ed Efficienza (si sceglie una
    sola parte).
  - **Stato aperto:** Davide chiede il censimento completo, «29 schede e 46 aspetti».
- **Oggi.**
  - «Lancia!» applica già costo, Prova, penalità e Talenti come deciso (`src/lancio.js:216-256`,
    `regoleAnticipazione`).
  - **Il censimento non è un file in `docs/`.** Sono gli aspetti con `scala: null` e `scala_motivo` in
    `data/incantesimi.json` → `meccanica.anticipazione.aspetti`, elencati da
    `node tools/scale_anticipazione.mjs --elenco`.
  - Al 02/10 (commit 4905d9f) erano 46 aspetti su 29 schede. **Oggi sono 44 su 29**: due di Marchio
    Psichico sono stati risolti dopo.
  - Nessuno degli esempi approvati è già nei dati: tutti hanno `scala: null` e l'app mostra «da definire al
    tavolo».
- **Gli esempi approvati coprono 13 dei 44 aspetti.**
  - Irrobustire, PV e Durata (2).
  - Telecinesi, Durata (1).
  - Mente Disincarnata (1).
  - Illusione (1).
  - Natura del danno di Muro, Armatura, Esplosione e Cono Elementale (4).
  - Resistenza Fisica (1).
  - Efficienza, VA e Danno (2).
  - Armatura Elementale, Mod. PS (1, solo in parte).
- **Restano circa 31 aspetti.**
  - «Numero di elementi» dei quattro Elementali.
  - Devastazione Elementale (2 aspetti).
  - Catene di Forza, Piattaforma Levitante, Alterare Immagine, Terrore.
  - Presenza (2 aspetti), Psicometria, Marchio Psichico (2 aspetti), Sesto Senso.
  - Cura Malattie, Cura Avvelenamenti, Cura Spirituale, Recupero Rapido.
  - Sigillo (2 aspetti), Trappola Mistica (4 aspetti).
  - Luce Mistica, Nascondere Aura, Premonizione (2 aspetti), Individuare.
- **Cosa cambia.**
  - Scrivere le scale approvate in `incantesimi.json`. Servono anche scale per versione e la scelta della
    parte per le colonne doppie (`src/anticipazione.js`).
  - `tools/scale_anticipazione.mjs` è rilanciabile e riscriverebbe gli aspetti: le decisioni devono stare in
    un file di override che il tool rispetta.
- **PG / SS.** Nessuna migrazione. Cambia il Risultato anticipato mostrato in «Lancia!».
- **Stima.** M.
- **Domande.** A.109: elenco completo dei 31 aspetti restanti, da mandare con il pacchetto.

### A.74 e A.75 — Conferma delle risposte già registrate
- **Decisione.**
  - **Canale:** VA di Rituali con fasce +0/+1/+2/+3/+4, contributo complessivo massimo +5.
  - **Magistrale nel Rituale:** dimezza i PM una volta, con le quote ridistribuite.
  - **Rigenerazione diretta:** solo PM personali.
  - **Ritualista:** Minore per le versioni 9–10, Maggiore per le versioni 12/15/18.
  - **Batterie con supporto base:** 0,2 kg, Comune, PS 10, 3 PI, supporto da 100 cr.
- **Oggi.** Tutto coincide.
  - `regole.json` → `rituali`; `ripartizioneMagistrale` e `versioniLancio` in `src/lancio.js`;
    `meccanica.procedura_rituale`.
  - Le batterie in `artefatti.json`; Pietra e Guanti distinti.
- **Cosa cambia.** Niente.
- **PG / SS.** Nessun impatto.
- **Stima.** P (nessun lavoro).

### A.84 — Regime di lancio dei nemici
- **Decisione.**
  - **Regimi:** Taumaturgo, altro utilizzatore autorizzato, capacità specifica. Per gli umani il regime
    viene dall'Addestramento.
  - **Taumaturgo:** versioni 1–3 senza Prova, poi 0/−2/−4/−6/−8.
  - **Altri utilizzatori:** sempre la Prova, con 0/−2/…/−10.
  - **Regime mancante:** la scheda è incompleta.
- **Oggi.**
  - `data/formato_nemici.json` non ha il regime.
  - `src/nemico-lancio.js` → `lanciatoreDa` tratta ogni nemico da Taumaturgo, con un promemoria.
  - `src/nemico-da-pg.js` calcola il VA con il regime vero del PG, che poi `lanciatoreDa` corregge di nuovo
    come Taumaturgo: **bug latente** per i PG non Taumaturghi convertiti in nemici.
  - Gli incantesimi stanno solo nel Legionario oscuro e nei tre Inquisitori (tutti Taumaturghi); il
    Bestiario non ne ha.
- **Cosa cambia.**
  - Campo `regime` nel formato e in `completo_se`, con l'avviso «scheda incompleta».
  - `lanciatoreDa` usa la colonna giusta; `nemicoDaPg` scrive il regime; il validatore lo controlla.
  - Via l'assunzione «sono tutti Taumaturghi».
- **PG / SS.** Nessun impatto sui PG. I nemici salvati senza regime diventano incompleti, con l'avviso; vanno
  aggiornati gli esempi.
- **Stima.** M.
- **Domande.** A.115 (che cosa calcola l'app per la «capacità specifica»).

### A.85 — Bonus di SAG al danno magico dei nemici
- **Decisione.** Il catalogo non comprende il bonus di SAG.
  - **Umani costruiti come PG:** il bonus si calcola, con tetto per livello.
  - **Creature:** il profilo deve dichiararlo, senza dedurlo dalla fascia.
  - **In ogni caso:** mai due volte, e se manca la scheda è incompleta.
- **Oggi.** Ai nemici non si aggiunge mai (`src/nemico-lancio.js`, promemoria). Per i PG si calcola già
  (`src/lancio.js`, `danno_caratteristica`).
- **Cosa cambia.**
  - Campo `bonus_danno_magico`, calcolato da `nemicoDaPg` e dichiarato nelle creature.
  - Flag «formula già completa».
- **PG / SS.** Nessun impatto sui PG; i nemici salvati vanno rigenerati.
- **Stima.** P. Va fatta insieme alla A.84 (stesso formato).

---

## 4. Equipaggiamento, Artefatti, scheda

### A.34 — Dotazioni e schede degli oggetti
- **Decisione.** Gli oggetti delle dotazioni vanno collegati alle schede del catalogo, senza voci
  personalizzate; i NEC compresi si contano una volta.
  - Corredo per allevamento: 2 kg, 200 cr, Comune, nessun bonus.
  - Strumento musicale: acustico o elettronico senza sovrapprezzo.
  - Qualità, PS e PI:
    - Comune, PS 10, 4 PI per Cassetta degli attrezzi, Attrezzi agricoli e Corredo per allevamento;
    - Non comune, PS 12, 4 PI per il Corredo artigianale professionale e il Corredo di analisi da campo;
    - Comune, PS 10, 4 PI per le voci del §5.8, salvo Testo dottrinale e Focus personale (2 PI).
  - La cessione al 100% vale solo per gli armamenti.
- **Oggi.**
  - **Collegamenti.** Tutte le 44 voci di `dotazioni.json` → `oggetti_dotazione` hanno una scheda (`rif`,
    o `rif_per_sotto` per Corredo agricolo e Strumento musicale).
  - **Nel PG.** L'oggetto entra però come voce personalizzata (`src/dotazioni.js:201-212`: `rif: null`,
    `personalizzato`, `dotazione_id`) e si aggancia alla scheda solo in lettura (`risolvi`,
    `src/equipaggiamento.js`).
  - **NEC.** Contati una volta, già così.
  - **Cessione.** Già conforme (`armamentiCedibili`).
  - **Valori mancanti in `strumenti_professionali.json`.** Le tre voci Comuni non hanno né Qualità né
    PS né PI. Le due Non comuni non hanno Qualità, PS 12 e PI 4. Le voci del §5.8 sono già conformi.
  - **Altre mancanze.** Peso e REP di `ricarica-kit-trauma`; peso di `corredo-manutenzione-campo`.
- **Cosa cambia.**
  - Dati: i campi mancanti.
  - Creazione: voce con il `rif` della scheda (e della sotto-scelta) e il nome della dotazione come
    annotazione.
  - Migrazione in `normalizza`: le voci con `dotazione_id` e `rif: null` prendono il `rif`. Stato,
    quantità e PI attuali restano.
- **PG / SS.** Cambiano la PS Integrità e i PI massimi mostrati per questi oggetti, nell'Inventario e nella
  SS, in tutti i PG che li hanno. Lo stato degli oggetti non cambia.
- **Stima.** M.

### A.36 — Bonus degli strumenti
- **Decisione.** Il bonus di un oggetto vale solo quando l'oggetto è usato, mai in modo permanente. Per la
  stessa Prova vale solo il maggiore bonus degli strumenti. I valori sono quelli di Binocolo, Corredo da
  ricognizione, Corredo di orientamento, Corredo di sopravvivenza, Abiti eleganti e Kit trauma.
- **Oggi.** È già così.
  - Solo gli oggetti attivi contano.
  - Fra i situazionali accesi vale il maggiore; l'uso specifico prende il massimo fra il proprio bonus e il
    situazionale (`src/condizioni.js:159-191`).
  - I valori nei dati coincidono.
- **Cosa cambia.** Solo decidere se i chip del Processore (impianti) entrano nello stesso «massimo degli
  strumenti» o sono un'altra fonte. Oggi ci entrano. Aggiornare `docs/effetti-oggetti.md`.
- **PG / SS.** Nessuna migrazione.
- **Stima.** P.
- **Domande.** A.114.

### A.59 — Deposito e Sintonizzazione
- **Decisione.** Depositare un Artefatto **non** interrompe la Sintonizzazione: l'oggetto continua a
  occupare capacità. La si interrompe solo volontariamente; dopo, servono di nuovo 1 minuto e la Prova. Una
  batteria depositata non alimenta. Collocazione e Sintonizzazione sono due cose distinte.
- **Oggi.** Il deposito spegne la sintonizzazione.
  - `src/equipaggiamento.js:347`, `1266`: `sintonizzato && !deposito`, con avviso e casella disabilitata
    (`src/ui/tab.js:1857`).
  - CLAUDE.md e `docs/layout-sd.md` riportano la regola vecchia.
  - Le batterie depositate già non alimentano (giusto).
- **Cosa cambia.**
  - Il deposito non tocca più la sintonizzazione e la casella resta attiva («Interrompi»).
  - Il lancio resta bloccato con il motivo «nel deposito».
  - Aggiornare i documenti.
- **PG / SS.** Chi ha Artefatti depositati e `sintonizzato: true` vede salire la capacità usata, e può
  superarla: serve un avviso, non una migrazione. Nella SS la casella risulta piena con «deposito comune».
  Fra i sette PG del gruppo nessuno ha oggetti in deposito.
- **Stima.** P.

### A.60 — Struttura della scheda digitale
- **Decisione.**
  - Otto schede; Poteri con Incantesimi e Tecniche; crediti nell'Inventario.
  - Si registrano la mano dominante, la mano destra, la mano sinistra e l'uso a due mani; lo scudo occupa una
    mano; due armi non attivano da sole «Combattere con due armi».
  - Nel Combattimento: armatura, rinforzi, scudo ed elmetto, con i costi per indossarli e toglierli.
  - Colonna destra con Ferite, Affaticamento, Corruzione e Stati **modificabili** anche nella tab Abilità.
  - Punti Eroe sopra i PV; Umanità nella Cibernetica; cataloghi aggiornati.
- **Oggi. Già fatto:**
  - otto tab, `manoDominante` nell'anagrafica, riquadri mano destra / sinistra / due mani, scudo che occupa
    la mano;
  - due armi come casella esplicita in «Attacca!», Punti Eroe sopra i PV, Umanità nella Cibernetica;
  - i cataloghi §3.2, cap. 5, cap. 7 e Veicoli 0.2.
- **Oggi. Manca:**
  - la mano è **dedotta dall'ordine dell'Inventario**, non registrata (`src/ui/tab.js:1206`);
  - nella tab Abilità le condizioni sono in sola lettura;
  - i costi in Azioni per indossare e togliere armatura, rinforzi e scudo: c'è solo l'elmetto, 1 AzP;
  - la vista rapida «Combattimento con armatura».
- **Cosa cambia.**
  - Campo facoltativo `mano` sulla voce: senza, si torna all'ordine.
  - Controlli delle condizioni anche nella tab Abilità.
  - Costi di indossare e togliere nei dati.
- **PG / SS.** Il campo è facoltativo, quindi nessuna migrazione obbligatoria. Nella SS al più la mano
  accanto all'arma.
- **Stima.** G.
- **Domande.** A.110 (costi di indossare e togliere: dove sono?).

### A.69 — Installare, rimuovere e reinstallare impianti
- **Decisione.**
  - **Clinica:** il servizio riesce sempre; acquisto e installazione sono costi distinti; un impianto non
    installato non consuma UMN.
  - **Tempi:** 4 h per installare o reinstallare, 2 h per rimuovere, 6 h per sostituire; Chirurgia Precisa
    −20%.
  - **Intervento di un PG:** Medico I e struttura, una Prova di Medicina, set chirurgico da 500 cr per
    tentativo. Esiti Magistrale, successo, fallimento e Maldestro.
  - **Postazioni:** semiautomatica +3, automatiche VA 12/15/18.
  - **Tariffe:** rimozione 50%, reinstallazione 100%.
  - **Dopo la rimozione:** l'impianto resta nell'inventario e la perdita resta; reinstallarlo sullo stesso
    soggetto non fa ripagare la perdita non recuperata, ma riconsuma gli UMN recuperati. L'app tiene il
    legame impianto–portatore–perdita–recuperi.
- **Oggi.**
  - `src/umanita.js` registra la perdita al passaggio a «installato» (`{uid, rif, nome, umn}`) e la tiene
    anche dopo la rimozione; lo stesso uid non si conta due volte.
  - Il costo dell'installazione è solo mostrato.
  - Non ci sono tempi, set, postazioni, tariffe né legame con i recuperi (`regole.json` → `impianti`).
- **Cosa cambia.**
  - Procedura guidata (clinica o PG) con costi, tempi ed esiti; dati in `regole.json` →
    `impianti.procedure`.
  - Registro delle installazioni e rimozioni per uid, con i recuperi associati.
- **PG / SS.** Migrazione: ogni perdita esistente diventa un'installazione in clinica già avvenuta, e l'UMN
  non cambia.
  - Caso reale: **Pablo Zaion** ha una perdita di 2 UMN per l'«Interfaccia neurale», ma l'impianto non è più
    nel suo inventario. Per la A.69 dovrebbe esserci, rimosso: va chiesto (A.111).
  - Nella SS al più una nota sulle rimozioni.
- **Stima.** G.
- **Dipendenze.** A.70; set chirurgico e postazioni in `sanitario.json`.

### A.70 e A.92 — Recupero dell'Umanità
- **Decisione.**
  - **Regola generale:** l'UMN si recupera solo con una procedura prevista. La rimozione rende la perdita
    recuperabile senza restituirla; ogni perdita si recupera una volta, fino a 20.
  - **Procedura nuova, «Riabilitazione»:** cicli di 7 giorni.
    - Fatta da un PG: 500 cr e una Prova di Medicina; Magistrale +2, successo +1, altrimenti 0, Maldestro
      peggiora una Ferita.
    - In clinica: 1.000 cr per +1 sicuro.
- **Oggi.** I recuperi sono liberi, «concessi dal Direttore» (`src/umanita.js`, `src/ui/tab.js:2007`), con il
  solo tetto di 20.
- **Cosa cambia.** Il recupero è legato a una perdita rimossa e non supera la sua UMN; procedura di
  Riabilitazione.
- **PG / SS.** I recuperi già registrati non hanno un legame con una perdita. Fra i sette PG del gruppo
  nessuno ha recuperi (Dimitri e Pablo hanno solo perdite): oggi nessun valore cambia.
- **Stima.** M, insieme alla A.69.
- **Domande.** A.111.

### A.93 — Corpi cyborg completi
- **Decisione.** Non sono acquistabili dai PG; la fascia Cyborg 12–7 non dà un corpo artificiale.
- **Oggi.** È già così: nessun corpo completo fra i 68 impianti, nessun effetto della fascia.
- **Cosa cambia.** Al più una frase in `regole.json` → `umanita`.
- **PG / SS.** Nessun impatto.
- **Stima.** P.

### A.94 — Interfaccia SIN
- **Decisione.** Standard 3.500 + 2.000 cr e 2 UMN; CYBERTRONIC 5.000 + 2.000 cr e 1 UMN. Entrambe Non comune,
  PS 12, 4 PI, REP Rara, bioenergia. La standard si abbina con 1 minuto e una Prova di Tecnologia, la
  CYBERTRONIC da sola.
- **Oggi.** I dati sono conformi (`impianti.json:7-28` e seguenti, A.68 già applicata).
  - Alla CYBERTRONIC manca la `decisione`.
  - L'abbinamento non è modellato: il bonus SIN vale con qualunque interfaccia.
  - `per-davide.md` dice ancora «costo da definire».
- **Cosa cambia.** La nota `decisione`; al più un promemoria dell'abbinamento.
- **PG / SS.** Nessun impatto.
- **Stima.** P.

### A.87 — Assegnazione degli Artefatti del gruppo
- **Decisione.** Le assegnazioni sono già nei file dei PG: si leggono proprietario, collocazione e cariche
  residue; niente deposito comune provvisorio, niente riserve riportate al massimo d'ufficio. Gli oggetti
  sono 2 Batterie Matrice Rosse da 10 PM, 4 Schegge instabili Verdi da 5 PM, 1 Pietra della Vigilanza e
  1 paio di Guanti.
- **Da quali file risultano.** La cartella reale `personaggi/` contiene solo il `LEGGIMI.txt`. I file sono
  quelli che Davide ha caricato il 04/10 sera nella cartella Drive «FILE PG», letti in sola lettura.

| PG (file) | Oggetto | Collocazione | Sintonizzato | Residuo (sessione.chroma) |
|---|---|---|---|---|
| Lucas (`LUCAS_liv6_2026-10-04.json`) | Guanti da combattimento mistico | trasportato | sì (SnT 2) | 10/10 |
| Lucas | Pietra della Vigilanza | trasportato | sì (SnT 3) | 10/10 |
| Lucas | Batteria Matrice Rossa 10 PM (cristallo «Ruttengsanker») | trasportato | sì (SnT 3) | 10/10 |
| Lucas | Scheggia instabile Verde 5 PM ×2 | trasportato | — (SnT 0) | 5/5, 5/5 |
| Dimitri Orlav (`Dimitri-Orlav_liv6_2026-10-04.json`) | Batteria Matrice Rossa 10 PM (cristallo «Ruttengsanker») | trasportato | sì (SnT 3) | 10/10 |
| Dimitri Orlav | Scheggia instabile Verde 5 PM ×2 | trasportato | — | 5/5, 5/5 |

- **Esito.** Tutti e otto gli esemplari sono assegnati, uno per voce, senza doppioni e nessuno in deposito.
  Gli altri cinque PG non ne hanno.
- **Cosa manca.**
  - Tutti i residui sono **al massimo**. Dal file non si distingue un residuo vero da uno mai toccato:
    serve una conferma (A.112).
  - Le voci di Dimitri non hanno `pm_iniziali` (quelle di Lucas sì); il residuo sta comunque in
    `sessione.chroma`, quindi non manca nulla per il calcolo.
  - I file sono solo su Drive: per usarli al Tavolo vanno messi nella cartella `personaggi/` del server
    (lo fa Marcello o Davide).
- **Cosa cambia nell'app.** Niente: «ogni esemplare è unico» è già vero (un `uid` per voce).
- **Stima.** P.

### Errata — Manutenzione semplice
- **Decisione.** «Manutenzione agevolata» diventa «Manutenzione semplice»: un'unica proprietà, +1 VA a
  Tecnologia per riparare la protezione.
- **Oggi.** Due nomi, con lo stesso effetto (`uso: riparare l'armatura`, `beneficio: manutenzione`):
  - «agevolata» in Armatura Ashigaru leggera e Corazza Ashigaru media (`armature_corporative.json`);
  - «semplice» altrove.
- **Cosa cambia.** I nomi nei dati e nei testi, `docs/proprieta-armature.md`.
- **PG / SS.** Nessun impatto: i PG usano il `rif`.
- **Stima.** P.

### Errata — Taglia dello Scudo Punisher
- **Decisione.** Denominazione «Scudo Medio», profilo invariato.
- **Oggi.** `scudi.json:342` ha già `taglia: "Medio"` e famiglia «Scudi medi»; il profilo coincide.
- **Cosa cambia.** Niente, salvo testi.
- **PG / SS.** Nessun impatto.
- **Stima.** P.

### Errata — Articolazione di tiro
- **Decisione.** Il nome unico è «Articolazione di tiro»: riduce di 1 la penalità propria dell'armatura a
  distanza.
- **Oggi.** «da tiro» compare in Tortoise MK II e in un doppione di `armature.json` → `proprieta_gestite`; la
  penalità è già nei dati.
- **Cosa cambia.** Il nome e il doppione, `docs/proprieta-armature.md`.
- **PG / SS.** Nessun impatto.
- **Stima.** P.

---

## 5. Veicoli

### A.91 — Proprietà e scheda unica dei veicoli
- **Decisione.** Un veicolo appartiene a un PG o al gruppo e ha **una sola scheda**: PI di Carrozzeria,
  Propulsione e Motore, energia, autonomie. Il conducente è distinto dal proprietario. Schede dei PG e
  Tavolo del Master puntano allo stesso veicolo, senza copie modificabili. «Veicolo del gruppo» non basta;
  fino al collegamento vale un unico registro autorevole.
- **Oggi.**
  - Il veicolo sta in `scelte.veicoli` del PG (`src/veicoli.js` → `nuovoVeicolo`, `normalizzaVeicoli`).
    Forma: `{ uid, profilo, nome, gruppo, conducente: bool, andatura, pi, rinforzi, nec: {lx}, avarie }`.
  - Non c'è il proprietario, il conducente è un booleano, non c'è il mitragliere, munizioni ed energia sono
    in un solo campo.
  - Server e plancia non conoscono i veicoli.
  - Caso reale: **Pablo Zaion** ha lo ASA Scout MK4 (`gruppo: true`, conducente no, PI pieni, copriruote
    4 + 2, 100.000 Lx).
- **Modello proposto: registro unico sul server.**
  - **Cartella** `veicoli/`, fuori da git come `personaggi/`, con l'opzione `--veicoli=`. Un file per
    mezzo, `veicoli/<id>.json`:

```
{ formato: 'mutant-veicolo', versione: 1, id: 'vei-…', revisione: n, aggiornato,
  nome, profilo: 'asa-scout-mk4' | scheda: {…},
  proprietario: { tipo: 'pg' | 'gruppo', pg: '<id pg>' | null },
  conducente: { pg } | null, mitragliere: { pg } | null, passeggeri: [pg],
  pi: { corpo, propulsione, motore },
  rinforzi: { 'copriruote-petra': { montati: [...], ricambi: [...] } },
  energia: { rosso: { installati: [lx, lx], ricambi: [lx] }, verde: { installato: lx, ricambi: [lx] },
             aria: { fissa_ore, bombole: [ore, ore] } },
  armi: [{ rif: 'm606', caricate, riserva, pi }],
  andatura: { attuale, selezionata },
  movimento: { scontro, round, q, eseguito, da: pg },
  ripristini, avarie, registro: [{ ora, chi, testo }] }
```

  - **Identità.** Il proprietario e gli occupanti si identificano con l'identificativo `pg` del PG, non con
    il nome del file. Va allineato lo scontro, che oggi usa `pg:<chiave del file>` (`src/scontro.js:56`).
  - **API**, come gli scontri:
    - `GET /api/veicoli` (elenco) e `GET /api/veicoli/<id>`;
    - `PUT` con `revisione`: in caso di conflitto risponde 409 con il record attuale;
    - validazione con `normalizzaVeicoli`.
  - **Modifiche concorrenti.** Il client applica a quel record le funzioni pure già esistenti
    (`colpisciVeicolo`, `applicaRiparazione`, `montaRicambio`); dopo un 409 rilegge e **riapplica
    l'operazione**. Due giocatori non si sovrascrivono.
  - **Nel PG.** `scelte.veicoli` diventa `[{ uid, rif: 'vei-…', ultima: {…} }]`, con una copia in sola
    lettura per la stampa e per l'uso senza server. La tab Veicoli legge e scrive il registro.
  - **Migrazione** (all'apertura con il server). Ogni veicolo senza `rif` va nel registro con l'`uid` come
    id; `gruppo` diventa il proprietario «gruppo» o «pg», il booleano diventa il conducente. Se due PG hanno
    copie dello stesso mezzo, niente unione automatica: sceglie il Master.
  - **Senza server** (`avvia.bat`):
    - i mezzi di un singolo PG restano modificabili nel suo file, che fa da registro;
    - quelli del gruppo si vedono in sola lettura, con «modificabile dal Tavolo del Master».
- **PG / SS.**
  - Serve un nuovo formato del PG (`VERSIONE_FORMATO` 9) con migrazione; i file senza veicoli non cambiano.
  - Il foglio Veicoli stampa il record del registro: proprietario, conducente, mitragliere, revisione,
    andatura attuale, energie, munizioni.
  - Da decidere se il foglio va in tutti i PG collegati o solo in quelli del proprietario e del conducente.
    Proposta: in tutti quelli che lo collegano.
- **Stima.** G.
- **Dipendenze.** A.101 (campi di energia e munizioni) e A.104 (andatura doppia). Va prima della A.105.
- **Domande.** A.113.

### A.105 — Scheda del veicolo nel Tavolo del Master
- **Decisione.**
  - **Cosa mostra:** scheda autonoma, collegata al conducente e al record unico, con PI e condizioni, AR,
    Corazzato, andatura attuale, energia, conducente, mitragliere e movimento già fatto nel Round.
  - **Turno:** niente INI né Azioni proprie: si muove all'INI del conducente con le sue Azioni; mitragliere
    e passeggeri agiscono alla propria INI.
  - **Cambi in corsa:** cambiare conducente non dà un secondo movimento; con il conducente incapace il
    movimento residuo segue il §5.6.
- **Oggi.** Nella plancia non c'è nulla. Il motore ha `vistaVeicolo` e `andaturaResidua` (§5.5–5.6).
- **Cosa cambia.**
  - **Nella plancia:** una carta «mezzo» legata al registro, fuori dai `partecipanti` (niente INI).
  - **Turno del conducente:** pulsante «Muovi il mezzo», che scrive `movimento: { scontro, round, q,
    eseguito }`. Se il movimento del Round è già fatto, il cambio di conducente non lo riapre.
  - **Conducente incapace:** all'INI del vecchio conducente si propone il residuo.
  - **Nel file dello scontro:** `veicoli: [id]`.
- **PG / SS.** Niente oltre alla A.91.
- **Stima.** G.
- **Dipendenze.** A.91, A.104, l'identità `pg` dei partecipanti dello scontro.

### A.101 — ASA Scout MK4 (sette voci)
- **Decisione.**
  - Profilo e dotazione approvati, valore 202.520 cr.
  - Arma M606 da 19.000 cr, con 400 + 800 colpi a 3 cr ciascuno.
  - 6 copriruote Petra (150 cr; Terre del Fuoco: oltre 30 Q nel Round una PS 12).
  - Supporto vitale 24 h (riserva fissa più 2 bombole da 8 h).
  - Modulo Verde: 10.000 Lx, supporto vitale 200 Lx/h.
  - Trazione Rossa: 100.000 Lx, 200 Lx/km, 100 Lx/h da fermo, con ricambi.
  - Riparazioni: 300/250/500 cr per PI, 1 ora e una Prova di Tecnologia, officina 100 cr/h; kit tecnico da
    2.000 cr.
  - Dotazione sanitaria: Kit trauma e Pistola sanitaria con 10 cartucce di naniti.
  - Accessori per 9.220 cr.
- **Oggi.** Il profilo è giusto (`data/veicoli.json:481-568`): posti, dimensioni, MOV/MAN, AR, Corazzato,
  Qualità, PS, REP, PI e telaio. Da correggere o scrivere:
  1. Prezzo: 109.000 «parziale» con TODO → 202.520, con le voci.
  2. M606: `rif: null` → `m606` (è già nel catalogo, 19.000 cr).
     - `munizioni_per_colpo: 3` è una lettura sbagliata (sono 3 cr per colpo): da rinominare, insieme a
       `tests/veicoli.test.js:411`.
     - Mancano i 400 + 800 colpi.
  3. Copriruote: `costo_cr: 150`. La sollecitazione delle Terre del Fuoco **non c'è** nel codice.
     L'assorbimento in sequenza è già giusto.
  4. Energia: oggi è un solo `nec: { lx }`. Servono la riserva Rossa (installati e ricambi), la Verde e
     l'aria distinte, con consumi per km e per ora, in dati, motore, tab e SS.
  5. Supporto vitale: 8 h fisse più 2 bombole (20 kg, 1.000 cr, ricarica 100).
  6. Riparazioni: costi per PI e officina (oggi «da definire», `src/veicoli.js:524`); kit tecnico come
     opzione di «Ripara» (+2).
  7. Dotazione: testo aggiornato (Kit trauma, Pistola sanitaria, 10 naniti, accessori con i prezzi).
- **PG / SS.** Lo Scout di Pablo riceve i nuovi campi da `normalizzaVeicoli` con i valori iniziali, senza
  riportare al massimo ciò che è già consumato. Nella SS spariscono i «da definire».
- **Stima.** M (i dati sono piccoli; energia e munizioni, medie).
- **Dipendenze.** Prima della A.91, che ne eredita i campi.

### A.102 — Reperibilità dell'autovettura civile
- **Decisione.** REP Comune.
- **Oggi.** `reperibilita: null` con TODO (`veicoli.json:474`).
- **Cosa cambia.** «Comune», via il TODO.
- **PG / SS.** Nessun impatto.
- **Stima.** P.

### A.103 — Corazzato e esempio dei danni strutturali
- **Decisione.** L'esempio del §4.3 è generico; lo Scout resta Corazzato 1. Prima la PS, poi Corazzato,
  minimo 0.
- **Oggi.** Il motore è già giusto (`src/veicoli.js:207-218`, test 136-148).
- **Cosa cambia.** Solo il testo dell'esempio in `veicoli.json` → `danno.esempio`.
- **PG / SS.** Nessun impatto.
- **Stima.** P.

### A.104 — Andatura attuale e collisioni
- **Decisione.** Per la collisione conta l'andatura effettiva attuale, anche prima che il mezzo agisca;
  quella solo dichiarata non vale; un mezzo fermo conta 0 Q. Il cambio è di una fascia per AzM; due fasce
  con l'accelerazione forzata. L'app tiene l'andatura attuale separata da quella scelta per dopo.
- **Oggi.** Un solo campo `andatura`, sovrascritto subito dalla tab (`src/ui/veicoli.js:154`); nessuna
  interfaccia per le collisioni.
- **Cosa cambia.** `andatura: { attuale, selezionata }` e «Esegui cambio»; le regole usano l'attuale.
- **PG / SS.** Migrazione: la stringa di oggi diventa `attuale` (anche per lo Scout di Pablo). Nella SS si
  marca l'andatura attuale.
- **Stima.** M. Si fa con la A.91.

---

## 6. Bestiario e Tavolo del Master

### A.79 — Bestiario umano ed Eretico
- **Decisione.**
  - **Costruzione:** gli umani si costruiscono come PG (Recluta 2°, Veterano 5°, Élite 8°), con i PV dalla
    media del dado arrotondata per eccesso e 7 punti liberi.
  - **Etichette:** Élite, Boss e numero dei PG non danno PV, danni o Azioni; i profili vanno ricalcolati.
  - **Eretico base:** umano Freelance Incursore senza poteri oscuri e senza Corruzione, con il nome
    «Eretico — profilo umano senza poteri oscuri».
- **Oggi.**
  - `tools/genera_nemici_umani.mjs` è già conforme: livelli 2/5/8, dado `floor(d/2) + 1` (uguale alla media
    per eccesso con dadi pari), 7 punti (rigenerati il 04/10).
  - L'Eretico ha un nome generico e un `TODO(Davide)` sui «Doni dell'Oscura Simmetria».
  - **Non conforme:** «Crea nemico» porta gli umani al grado con PV × `pv_molt` (Élite ×1,5), AzP del grado
    e `bonus_danno` (`data/bestiario.json:280-330`, `src/crea-nemico.js:139-150`).
- **Cosa cambia.**
  - Per gli umani il profilo costruito vale com'è.
  - Nome dell'Eretico e via il TODO.
  - `eretico-corrotto` diventa una variante dichiarata, con Natura e Corruzione esplicite.
  - Rigenerazione, test.
- **PG / SS.** Nessun impatto sui PG. I nemici già salvati in `nemici/` e le bozze di scontro restano con i
  valori vecchi finché non si ricaricano: serve un avviso.
  - **Nota:** la cartella reale `nemici/` contiene ancora i file del bestiario umano del 02/10, generati con le regole di allora (10 punti, profilo vecchio dell’Incursore).
- **Stima.** M.

### A.95 — Volo e taglia nel Bestiario
- **Decisione.** Via il −2 VA generico contro le creature volanti e il +2 generico contro le grandi.
  Restano le andature e le capacità espresse.
- **Oggi.**
  - **Dati:** `data/bestiario.json` → `alato.va_contro: -2`, `gigante.va_contro: 2` (e la capacità
    «Taglia Grande»); `formato_nemici.json` (descrizione di volo e taglia).
  - **Strumenti:** `tools/taratura_bestiario.mjs` (`MOD_BASI.vaContro`) e
    `tools/lotti/lotto_bestiario_dati.mjs`.
  - **Interfaccia:** `src/ui/crea-nemico.js:217`, `src/ui/nemici.js:314-317`.
  - **Documenti:** `docs/bestiario/bestiario.md` e `.html`, una decina di punti.
  - Il motore d'attacco non li applica.
- **Valori che li compensavano, da ritarare:**
  - PV dell'Alato ×0,85 e del Gigante ×1,25;
  - `pv_molt_boss` delle stesse basi;
  - i PV per grado di Alato e Gigante e delle creature pronte.
- **PG / SS.** Nessun impatto sui PG; le creature salvate vanno ricaricate.
- **Stima.** M. Va fatta con la A.96 e la A.97.

### A.96 — Etichetta Boss
- **Decisione.** Boss è solo una classificazione: non dà PV né Azioni in più. Il numero dei PG non cambia il
  nemico.
- **Oggi.** Il Boss dà PV, +1 AzP e una resistenza agli Stati.
  - Dati: `bestiario.json` → `gradi[].boss`, `boss.azp_in_piu`, `pv_molt_boss`, `creature[].boss`.
  - Codice: `src/crea-nemico.js` (PV, AzP, Stati, `frazioneScontro`), `src/ui/crea-nemico.js`,
    `src/ui/preparazione.js:189`.
  - Taratura e test: `tools/taratura_bestiario.mjs`, `bestiario.md` §2.5, `tests/bestiario.test.js`,
    `tests/crea-nemico.test.js`.
- **Cosa cambia.** Boss diventa un'etichetta; le capacità da Boss vanno dichiarate nella scheda della
  creatura.
- **PG / SS.** Nessun impatto sui PG.
- **Stima.** M.

### A.97 — Scala di potenza e moduli
- **Decisione.**
  - **Stima e fasce:** la calibrazione è una stima provvisoria in «Prepara scontro»; le cinque fasce sono
    orientative.
  - **Gruppo e moduli:** i 7 PG sono il riferimento del playtest, non un modificatore; nessun costo
    universale di mezzo Grado per modulo.
  - **Registro dello scontro:** durata, Ferite, risorse consumate e Azioni negate.
  - **Etichetta:** «Stima sperimentale, da verificare al tavolo».
- **Oggi.**
  - `bestiario.json`: `gruppo_pg: 7`, `equilibrato`, `costo: 0.5/1` dei moduli, `costo_massimo`.
  - Codice: `src/crea-nemico.js` → `costoModuli`, `gradoEffettivo` (a mezzi Gradi), `difficolta`;
    `src/ui/preparazione.js:205-218` («Difficoltà per 7 PG»).
- **Cosa cambia.**
  - **Da togliere nei dati:** il −2 del volo e il +2 della taglia (A.95), i PV, le AzP e la resistenza agli
    Stati del Boss (A.96), il costo dei moduli come regola.
  - **Da tenere:** il grado effettivo, mostrato come stima.
  - **Da ritarare:** i PV per grado delle basi Alato e Gigante e delle creature pronte che li includevano,
    con `tools/taratura_bestiario.mjs`; poi `bestiario.md` e `.html`.
  - **Etichetta** «Stima sperimentale, da verificare al tavolo» nel riquadro della difficoltà di «Prepara
    scontro» e accanto al grado effettivo in «Crea nemico».
  - **Registro** dello scontro (durata, Ferite, risorse, Azioni negate) in `src/scontro.js`, compilato
    dalla plancia.
- **PG / SS.** Nessun impatto sui PG.
- **Stima.** M.

### A.98 — Rune e Tatuaggi
- **Decisione.** Sviluppo futuro: nessuna sezione vuota e nessun bonus nell'app.
- **Oggi.** **Non conforme:** `regole.json` → `poteri.in_arrivo` mostra «Poteri Sciamanici (Rune e Tatuaggi)»
  come sezione vuota nella tab Poteri (`src/ui/tab.js:1774-1787`, test `tests/poteri.test.js`).
- **Cosa cambia.** Togliere la voce e adattare il test.
- **PG / SS.** Nessun impatto.
- **Stima.** P.

### A.99 — Gerarchia delle fonti e Prontuario
- **Decisione.** Prevale la decisione approvata più recente, poi il manuale aggiornato competente. Il
  Prontuario è un riassunto, non una fonte.
- **Oggi.** Il Prontuario non è usato come fonte (nota in `docs/manuali-drive.md`).
- **Cosa cambia.** Scrivere la gerarchia in `docs/protocollo-davide.md` e in CLAUDE.md, accanto alla regola
  «vale `docs/risposte-master.md`».
- **PG / SS.** Nessun impatto.
- **Stima.** P.

---

## 7. Stampa e punti da riprendere

### Stampa — Sintesi operative dei Talenti
- **Decisione.** Al posto della prima frase, una sintesi dedicata per ogni Talento: effetto e valori,
  condizioni, costi in Azioni o PM, frequenza, riferimento. Se un Talento non si riassume, la sintesi lo
  dice e rinvia al testo completo. L'impostazione è approvata; le sintesi vanno scritte e verificate.
- **Oggi.**
  - **SS:** stampa `primaFrase` (`src/stampa.js:48`, limite 220 caratteri; righe 249 e 258), resa in
    `src/ui/stampa.js:328`.
  - **«Attacca!»:** ha una `primaFrase` sua (`src/attacco.js:23`).
  - **«Lancia!»:** la ricava in linea (`src/lancio.js:385`).
  - **Convertitore in nemico:** la usa anche `src/nemico-da-pg.js`.
- **Quanti Talenti.** 319 in tutto:
  - **Talenti di Classe:** 200 (75 fissi e 125 a scelta, sulle 25 Classi);
  - **Talenti Liberi:** 119.
  - A parte, le 85 Specializzazioni (hanno già un `effetto` breve) e le 28 Tecniche Interiori (hanno già la
    `sintesiTecnica`).
- **Proposta.** Un campo `sintesi` per ogni Talento in `classi.json` e `talenti_liberi.json`, con un flag
  `rinvio: true` quando non si riassume, controllato dal validatore. SS, «Attacca!» e «Lancia!» usano
  `sintesi ?? primaFrase(testo)`.
- **Ordine di redazione.**
  1. Prima i Talenti dei sette PG del gruppo: circa 40, che bastano per la prossima sessione.
  2. Poi Classe per Classe.
  3. Le sintesi vanno a Davide per la verifica a blocchi.
- **Esempio: Fuoco Controllato** (Agente, I Grado, `classi.json:66`; il testo termina con «…l'Agente
  elimina la penalità specifica e non effettua la seconda Prova di controllo»):
  > Tiro a distanza contro un bersaglio impegnato in Ravvicinato, protetto da un alleato o con un ostaggio
  > come scudo: niente penalità specifica né seconda Prova di controllo. Se fallisce, l'alleato o l'ostaggio
  > non viene colpito; con un Maldestro, complicazione senza danni collaterali. Restano distanza e
  > Copertura. Passivo, sempre attivo. Rif.: Agente, Grado I (§3.5.2).
- **PG / SS.** Nessuna migrazione. Nei fogli 2 e 5 cambia l'altezza: va ricontrollata con
  `tools/collaudo_pdf.mjs`.
- **Stima.** G per la redazione delle 319 sintesi; P per il codice.

### Punti da riprendere (nessuna decisione nuova)
- **Cosa Davide si aspetta da noi.** Tre materiali da mandargli, nessun codice.
  1. **Gli 11 promemoria degli Stati usati nell'app.** Sono in `regole.json` → `stati.elenco[].promemoria`
     (`riassunto: true`, controllati in `src/validate.js:519`). Si usano nella tab Combattimento
     (`src/ui/tab.js:858`) e nel riassunto della SS (`src/stampa.js:364`).
     - Riguardano A Terra, Accecato, Assordato, Avvelenato, Immobilizzato, Incendiato, Rallentato,
       Sanguinamento, Stordito, Svenuto e Terrorizzato.
     - Vanno trascritti per intero nel pacchetto per il Doc, per la revisione.
  2. **Il censimento dell'Anticipazione.** Oggi gli aspetti aperti sono 44 su 29 schede (non più 46): 13
     coperti dagli esempi approvati, circa 31 restanti (A.72). Si manda l'elenco con il valore del manuale
     di ogni aspetto e la domanda «quale gradino?», con l'uscita di
     `node tools/scale_anticipazione.mjs --elenco`.
  3. **La distribuzione degli Artefatti del gruppo** dai file dei PG: la tabella della A.87, già qui sopra.
- **Restano futuri o sperimentali:** Rune e Tatuaggi, corpi cyborg per i PG, taratura definitiva del
  Bestiario.
- **Stima.** P.

---

## 8. Riepilogo delle stime

| Stima | Voci |
|---|---|
| Piccola (24) | A.32, A.36, A.40, A.53, A.54, A.55, A.56/A.90, A.58, A.59, A.74/A.75, A.76, A.77, A.85, A.87, A.93, A.94, A.98, A.99, A.102, A.103, tre errata, Punti da riprendere |
| Media (13) | A.34, A.38, A.57, A.70/A.92, A.72, A.79, A.84, A.95, A.96, A.97, A.101, A.104, A.106 |
| Grande (5) | A.60, A.69, A.91, A.105, Sintesi dei Talenti |

**Voci che cambiano valori dei PG già salvati:**
- **A.34:** PS Integrità e PI degli oggetti di dotazione, in tutti i PG che li hanno.
- **A.59:** capacità di sintonizzazione usata, solo per chi ha Artefatti sintonizzati nel deposito; nessuno
  fra i sette PG.
- **A.70/A.92:** UMN, solo per chi ha recuperi; nessuno fra i sette PG.
- **A.91, A.101, A.104:** la scheda del veicolo, cioè lo Scout di Pablo Zaion: registro, energia e
  munizioni, andatura doppia.
- **A.57:** solo i casi a cascata e i PG con 10 punti per Grado (quelli di collaudo).

**Al tavolo, senza cambiare il file:** A.38 (VA in «Attacca!»), A.40 (Carica oltre 12 Q), A.106 (luce).

**Bestiario e nemici salvati:** A.79, A.84, A.85, A.95, A.96 e A.97 cambiano i nemici, non i PG.

---

## 9. Lotti proposti, in ordine di priorità

**Prima della prossima sessione di gioco:**
1. **Pacchetto per Davide** (punti da riprendere: 11 promemoria, censimento dell'Anticipazione, tabella
   A.87, domande A.107–A.116, difetto del Doc). Nessun codice.
2. **Errata e testi** (P): tre errata, A.98, A.99, A.93, A.94, A.102, A.103, commento della A.56, `decisione`
   nei dati; registrazione delle decisioni confermate (A.32, A.36, A.53–A.55, A.58, A.74–A.77) in
   `docs/risposte-master.md`.
3. **Bestiario senza bonus automatici** (M): A.95, A.96, A.79 (umani senza moltiplicatori, Eretico), A.97
   (etichetta «Stima sperimentale…», moduli senza costo universale), ritaratura, `bestiario.md` e `.html`.
   Cambia i nemici del Tavolo: conviene averlo prima di preparare gli scontri.
4. **Nemici che lanciano** (M): A.84 e A.85, con il bug latente di `lanciatoreDa`.
5. **Regole di combattimento** (M): A.40, A.38 (sette punti), A.76 (filtro nel motore).
6. **Artefatti in deposito** (P): A.59, con l'avviso sulla capacità.
7. **Dati dello Scout** (M): A.101, A.102, A.103, A.104 (andatura doppia), dentro il file del PG come oggi.
   Prepara il registro e serve se il gruppo usa lo Scout in sessione.

**Può aspettare:**

8. **Illuminazione** (M): A.106, dopo la A.116.
9. **Ricostruzione dei punti liberi** (M): A.57, dopo le risposte ad A.107 e A.108. I sette PG reali sono
   già a posto.
10. **Dotazioni collegate al catalogo e strumenti** (M): A.34 e A.36, con la migrazione delle voci.
11. **Anticipazione approvata** (M): A.72, scale scritte con override del tool; i 31 aspetti restanti dopo la
    A.109.
12. **Registro unico dei veicoli** (G): A.91, poi **Veicoli nella plancia** (G), A.105.
13. **Impianti e Umanità** (G): A.69 e A.70/A.92, dopo la A.111.
14. **SD: mani e Combattimento con armatura** (G): A.60, dopo la A.110.
15. **Sintesi dei Talenti** (G): prima i Talenti dei sette PG, poi il resto, con la verifica di Davide.

---

## 10. Domande nuove per Davide

- **A.107 — Ricostruzione dei punti: cascata all'indietro.** Se si completa o si corregge un evento vecchio
  e un punto di un livello successivo, legale quando fu assegnato, smette di aumentare il VA: si conserva
  (come per gli aumenti di Caratteristica e di Classe) o si riassegna?
  *Nel frattempo:* oggi l'app vieta la modifica che lo renderebbe inutile.
- **A.108 — Punti in eccesso e blocco.** La ricostruzione «da completare prima di salire di livello»
  comprende anche i punti in eccesso (10 per Grado salvati prima del 03/10)?
  *Nel frattempo:* l'eccesso dà solo l'avviso e non blocca.
- **A.109 — Anticipazione: aspetti ancora senza gradino.** Gli aspetti aperti oggi sono 44 su 29 schede (non
  46: Marchio Psichico ne ha due già risolti). Gli esempi approvati ne coprono 13. Per gli altri 31 (elenco
  allegato) quale gradino si usa?
  *Nel frattempo:* «da definire al tavolo».
- **A.110 — Indossare e togliere protezioni.** Quanto costano in Azioni armatura, rinforzi e scudo, e che cosa
  intendi con «Combattimento con armatura» nella tab Combattimento?
  *Nel frattempo:* solo l'elmetto, 1 AzP.
- **A.111 — Recuperi di Umanità e impianti tolti.** Che cosa facciamo dei recuperi di UMN già registrati senza
  una rimozione? E per Pablo Zaion: ha una perdita di 2 UMN per l'Interfaccia neurale, ma l'impianto non è
  più nel suo inventario. Era stato rimosso (e allora torna nell'inventario come rimosso) o venduto?
- **A.112 — Artefatti del gruppo: residui.** Nei file di Lucas e di Dimitri Orlav tutte le riserve sono al
  massimo (Guanti 10, Pietra 10, Matrici 10 e 10, Schegge 5 ×4). Sono i residui effettivi o non sono mai
  stati aggiornati?
- **A.113 — Registro dei veicoli: permessi.** Il Master può modificare anche un mezzo di proprietà di un
  singolo PG? Senza il server, il veicolo del gruppo resta in sola lettura nelle schede: va bene? Nella
  scheda la struttura si chiama «Carrozzeria» o «Corpo principale» (come nel Manuale dei Veicoli)?
- **A.114 — Chip e strumenti sulla stessa Prova.** Un chip del Processore (per esempio +2 a Sopravvivenza) è
  uno «strumento», e quindi vale solo il maggiore con un corredo, o un'altra fonte che si somma?
  *Nel frattempo:* vale il maggiore.
- **A.115 — Nemici con «capacità specifica».** Per un nemico con questo regime l'app deve solo mostrare il
  testo della capacità, o ci sono Prova e costo da calcolare?
- **A.116 — Luce e «attività pratiche visive».** Quali Abilità sono toccate dalle penalità di luce oltre a
  Percezione visiva, attacchi e Difese: Pilotare, Tecnologia, Medicina, Artefatti?

## 11. «per-davide.md» del 04/10 17:15

Cowork ha applicato il pacchetto del 04/10: A.90 fra le «Risolte», nuova riga «Nel frattempo» della A.91,
errata del Mostri §5.2. Nessuna risposta nuova nella sezione 7.

**Difetto d'incollatura.** Le voci **A.80, A.81, A.82, A.83, A.86 e A.88**, già fra le «Risolte», sono
ricomparse nella sezione 1 con la domanda originale (l'A.82 troncata) e sono sparite dalle «Risolte». Le
decisioni restano quelle registrate il 03/10 (`docs/risposte-master.md`, 84–89). Col prossimo pacchetto:
riportarle nella sezione 6 e togliere dalla sezione 1 anche le voci risolte oggi.
