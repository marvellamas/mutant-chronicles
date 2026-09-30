Fai questo lavoro, senza chiedere conferma. Siamo su `main`. Completamento del censimento dei Talenti, stessa correzione fatta per «Lancia!» (commit 44d6687) applicata a tutto il resto.

Il censimento contava «già gestito» qualunque Talento con una chiave in `effetti`, anche se conteneva solo un `promemoria`. Per i Talenti di lancio questo ha nascosto sei Talenti non applicati. Ora ripassa **tutti gli altri «già gestiti»** (i 110 meno quelli di lancio già verificati) e i «testuali con numeri»:

1. Per ciascuno, verifica con un test o nel browser che il numero del testo entri davvero dove deve: VA delle Abilità, VA per colpire, danno delle armi, Difese, Salvezze, Iniziativa, Movimento, Azioni, AR, manovre e modalità di «Attacca!» (distanza e corpo a corpo), rapporti Chroma, sintonizzazione. Un Talento è «gestito» solo se un test dimostra che il valore cambia con e senza il Talento. Riscrivi la colonna del censimento con l'esito reale: applicato (dove) / promemoria con numero fra parentesi / testuale / rimandato.
2. Quelli che risultano non applicati e hanno un numero: portali nello schema `effetti` (generale, situazionale, uso_specifico, con le scale per Grado dove il testo le dà, come Incantesimi Aggressivi) e falli entrare nei valori con la provenienza. Se un Talento modifica una regola e non un numero (una manovra in più, un'Azione in meno), resta nel motore ma con un test che lo dimostri.
3. Quelli senza numero: riga «Talenti: Nome — prima frase» nel risultato di «Attacca!», come già in «Lancia!».
4. Correggi il criterio del censimento in `docs/censimento-talenti.md` (sezione «Metodo»): «gestito» = coperto da un test che cambia il risultato.
5. Confronto prima/dopo su tutti i file di `tests/collaudo/`: `calcolaScheda` a riposo e al tavolo, e «Attacca!» per ogni arma e modalità: elenca i valori che cambiano e per quale Talento; ogni differenza deve essere spiegata da un Talento del punto 2, nessun'altra.

Validator, `verifica_frasi`, test verdi. `TODO(Davide)` e pacchetto per il Doc solo se un Talento ha un numero ambiguo. Commit separati (dati; motore e test; docs), push di `main`.

Riepilogo in questa forma, senza altro: Talenti ripassati; quanti risultavano «gestiti» senza esserlo, con nome e cosa hai fatto per ciascuno; valori cambiati nei file di collaudo e perché; pacchetto per il Doc se c'è; esito test.
