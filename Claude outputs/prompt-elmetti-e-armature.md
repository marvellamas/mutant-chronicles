Fai questo lavoro, senza chiedere conferma. Sono due lotti in sequenza: prima gli elmetti (§7.21), poi le proprietà delle armature corporative. Fermati a fare una domanda solo se qualcosa blocca davvero, e in quel caso una domanda sola, precisa.

## 0. Prima di tutto

1. Controllo manuali di inizio sessione (procedura in `docs/manuali-drive.md`): confronta `modifiedTime` dei quattro Doc e del Doc E&L con il registro. Se qualcosa è cambiato, applica e riferisci prima di iniziare i lotti.
2. Rileggi `docs/equipaggiamento-lotti.md` (convenzioni dei lotti: struttura dei JSON in `data/equipaggiamento/`, `index.json`, campi obbligatori, `versione_manuale`, marcatori `TODO(Davide)`, verifica delle frasi con `tools/verifica_frasi.mjs`) e `docs/effetti-oggetti.md` (schema degli effetti: `{tipo, abilita, valore, ambito: generale|situazionale|uso_specifico, uso?, condizione?}`). I due lotti seguono quelle convenzioni senza eccezioni; se devi estendere lo schema, aggiorna prima il documento e il validator, poi i dati.
3. Fonte: Manuale degli Armamenti v0.52 (Google Doc, ID nel registro). Il testo estratto va in `docs/manuali-txt/` come per gli altri lotti. Non usare il PDF 0.50 per queste sezioni.

## 1. Lotto elmetti — Armamenti §7.21

Obiettivo: tutti gli elmetti del §7.21 nel catalogo, acquistabili nel passo «Equipaggiamento iniziale» e in modalità tavolo, con stato indossato/zaino e con gli effetti che entrano nei valori effettivi come per le armature.

- Crea `data/equipaggiamento/elmetti.json` (o il nome che le convenzioni prevedono per una nuova famiglia) e registralo in `index.json`. Una voce per modello, commerciali e corporativi, con: nome, corporazione (o «commerciale»), prezzo, PI, Qualità, reperibilità, peso se il manuale lo dà (altrimenti nessun campo, non 0: vale A.30), Protezione/valori difensivi con lo stesso schema delle armature, proprietà come testo copiato dal manuale, `effetti` tipizzati per ogni proprietà che ha un numero (bonus/penalità a Abilità o Salvezze, Percezione, Comunicazione, ecc.), `versione_manuale`.
- Regole d'uso: leggi nel §7.21 (e §7.11 se rimanda) come l'elmetto si somma all'armatura (protezione aggiuntiva, sostituzione, incompatibilità con armature che hanno già il casco integrato). Metti la regola in `data/regole.json`, non nel codice. Se il manuale non lo dice, applica: un solo elmetto indossato alla volta, protezione che si somma a quella dell'armatura, e segnalo come `TODO(Davide)` più una nuova voce A.43 in `docs/per-davide.md` (sezione 2, con la solita riga *Nel frattempo:*).
- SD, tab Combattimento: gli elmetti compaiono nel gruppo delle protezioni (etichetta di colore coerente con le sezioni collassabili già esistenti), con la riga effetti per oggetto come per gli altri; le penalità finiscono in VA con rosso/verde e tooltip di provenienza, come oggi.
- SS, foglio 3: l'elmetto indossato stampato insieme all'armatura, senza cambiare l'impaginazione.
- Passo «Equipaggiamento iniziale»: gli elmetti compaiono fra gli acquisti; se il §7.22 o le dotazioni ne assegnano qualcuno di base, includilo (altrimenti niente).
- Esegui `tools/verifica_frasi.mjs` sul lotto: zero frasi non trovate nel manuale. Validator verde.

## 2. Lotto proprietà delle armature corporative

Obiettivo: le 51 armature corporative già in catalogo hanno le proprietà solo come testo. Trasformale in `effetti` tipizzati, così entrano nei valori effettivi (Difese, Abilità, Salvezze) e nelle utility «Attacca!».

- Fai prima un censimento: elenco delle proprietà distinte che compaiono nelle 51 voci (nome della proprietà, quante armature la hanno, testo dal §7.11.x che la definisce). Scrivilo in `docs/proprieta-armature.md`. Per ogni proprietà decidi: **numerica** (→ effetto nello schema, con `ambito` corretto: generale se vale sempre, situazionale se il giocatore la accende al tavolo, uso_specifico se vale per un solo tipo di Prova), **testuale** (nessun numero: resta come promemoria nella riga effetti, marcata «promemoria»), **rimandata** (il manuale non definisce il valore: `TODO(Davide)` e voce in `per-davide.md`, tutte raccolte in un'unica A.44 con la lista).
- Applica gli effetti alle 51 voci nei JSON esistenti (stesso file, stesso ordine, nessun campo tolto). Le proprietà che oggi sono già gestite altrove (penalità «attacchi» sulle Abilità di Distanza, requisito FOR) non vanno duplicate.
- Se una proprietà ha bisogno di un `tipo` nuovo nello schema (per esempio una riduzione del danno o una resistenza a un tipo di danno), aggiungilo in `docs/effetti-oggetti.md` e nel validator prima dei dati, e mostralo nella SD nel punto giusto (le resistenze vicino a PV/Protezione, non fra le Abilità).
- Le proprietà situazionali si accendono con il toggle già esistente in modalità tavolo; le uso_specifico compaiono come valore secondario accanto all'Abilità, come oggi per gli oggetti.
- Controlla che «Attacca!» (distanza e corpo a corpo) legga i nuovi effetti dove toccano il VA per colpire o le Difese del bersaglio, senza aggiungere nulla che il manuale non dica.
- Esegui `tools/verifica_frasi.mjs` sulle 51 voci, validator, e i test esistenti di `calc.js`/`attacco.js`; aggiungi un test per un'armatura con almeno un effetto generale e uno situazionale.

## 3. Chiusura

- Aggiorna `docs/equipaggiamento-lotti.md` (i due lotti chiusi, eventuali scostamenti dalle convenzioni), `docs/backlog.md` (spunta «lotto elmetti» e «armature corporative con proprietà»), `docs/per-davide.md` (A.43, A.44 e ciò che i lotti aprono), il registro in `docs/manuali-drive.md`.
- Un commit per lotto, con messaggio che cita il paragrafo del manuale.
- Riepilogo finale in questa forma, senza altro: numero di elmetti inseriti; numero di proprietà distinte censite, quante numeriche / testuali / rimandate; `tipo` nuovi aggiunti allo schema; domande nuove per Davide; esito di validator, verifica frasi e test.
