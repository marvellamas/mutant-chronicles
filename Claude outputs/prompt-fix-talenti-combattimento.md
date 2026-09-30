Fai questo lavoro, senza chiedere conferma. Siamo su `main` (verifica con `git status -sb`). Due parti: il completamento del censimento dei Talenti e un'aggiunta piccola alla tab Poteri. Fermati a fare una domanda solo se qualcosa blocca davvero, e in quel caso una domanda sola, precisa.

## 1. Completamento del censimento dei Talenti

Il censimento contava «già gestito» qualunque Talento con una chiave in `effetti`, anche se conteneva solo un `promemoria`. Per i Talenti di lancio questo ha nascosto sei Talenti non applicati (corretti nel commit 44d6687). Ora ripassa **tutti gli altri «già gestiti»** (i 110 meno quelli di lancio già verificati) e i «testuali con numeri»:

1. Per ciascuno, verifica con un test o nel browser che il numero del testo entri davvero dove deve: VA delle Abilità, VA per colpire, danno delle armi, Difese, Salvezze, Iniziativa, Movimento, Azioni, AR, manovre e modalità di «Attacca!» (distanza e corpo a corpo), rapporti Chroma, sintonizzazione. Un Talento è «gestito» solo se un test dimostra che il valore cambia con e senza il Talento. Riscrivi la colonna del censimento con l'esito reale: applicato (dove) / promemoria con numero fra parentesi / testuale / rimandato.
2. Quelli che risultano non applicati e hanno un numero: portali nello schema `effetti` (generale, situazionale, uso_specifico, con le scale per Grado dove il testo le dà, come Incantesimi Aggressivi) e falli entrare nei valori con la provenienza. Se un Talento modifica una regola e non un numero (una manovra in più, un'Azione in meno), resta nel motore ma con un test che lo dimostri.
3. Quelli senza numero: riga «Talenti: Nome — prima frase» nel risultato di «Attacca!», come già in «Lancia!».
4. Correggi il criterio del censimento in `docs/censimento-talenti.md` (sezione «Metodo»): «gestito» = coperto da un test che cambia il risultato.
5. Confronto prima/dopo su tutti i file di `tests/collaudo/`: `calcolaScheda` a riposo e al tavolo, e «Attacca!» per ogni arma e modalità: elenca i valori che cambiano e per quale Talento; ogni differenza deve essere spiegata da un Talento del punto 2, nessun'altra.

## 2. Gradi taumaturgici nella tab Poteri

Il manuale della Magia lega i Gradi taumaturgici complessivi al livello massimo degli incantesimi (I Grado → livello 3; II → 8; III → 11; IV → 14; V → 17; VI → 18; nel multiclasse si sommano i Gradi taumaturgici). L'app lo calcola già (è il «livello massimo» che «Lancia!» usa), ma il giocatore non lo vede. Aggiungi nella tab Poteri, accanto o sotto le Prove di Potere, un riquadro compatto **«Gradi taumaturgici»** con: il Grado complessivo (per esempio «II · Invocatore II»; nel multiclasse la somma con le Classi che contribuiscono), il livello massimo di incantesimo che ne deriva, e il tooltip di provenienza (quali Classi, quali Gradi, paragrafo del manuale). La tabella Grado→livello sta in `data/regole.json`, non nel codice (se è già lì, riusala). Nessun campo nuovo nel salvataggio: è un valore calcolato. SS: nulla.

## 3. Chiusura

Validator, `verifica_frasi`, test verdi. `TODO(Davide)` e pacchetto per il Doc solo se un Talento ha un numero ambiguo. Commit separati (dati; motore e test; docs; riquadro Gradi), **esegui davvero** `git push` e riporta l'esito di `git status -sb` alla fine.

Riepilogo in questa forma, senza altro: Talenti ripassati; quanti risultavano «gestiti» senza esserlo, con nome e cosa hai fatto per ciascuno; valori cambiati nei file di collaudo e perché; riquadro Gradi (dove sta e cosa mostra per il personaggio di collaudo Taumaturgo); pacchetto per il Doc se c'è; esito test; esito di `git status -sb`.
