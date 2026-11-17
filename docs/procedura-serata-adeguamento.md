# La serata dell'adeguamento — procedura per lunedì (lotto 215, 17/11/2026)

**Verificata su una copia dell'istantanea del 15/11, dalla concessione alla conferma, con i tablet (non il PC del Direttore).** Quello che segue è l'ordine vero. I tempi: «macchina» = misurati; «tavolo» = stime mie, perché non ho sette persone.

## Prima di sera (30 min, una volta)

1. **«Salva sessione»** (voce 3 di `Mutant.bat`). Lo zip di `--applica` si fa *dopo* le salite di livello: per tornare a prima di tutto serve questo.
2. **Michele** ha un posto Specializzazione del 1° livello ancora da scegliere («Da scegliere: 1 Specializzazione», sul file dell'istantanea): finché non lo sceglie, «Sali al livello 8» resta spento. Lo sceglie prima.
3. **Lucas** sceglie 4 incantesimi nuovi nel passo «Incantesimi»; **Dimitri** ne sceglie **2** (18/20), **dal tablet, senza forzare niente** (A.287, lotto 216: il conto era doppio e ora è uno solo). Prima di confermare vede una riga «perché il Direttore ha corretto l'Intelligenza… puoi procedere» e una finestrella **«Procedi comunque»**: basta toccarla. Se un giocatore non può proseguire, la scheda dice cosa manca e chi lo sblocca (una riga).

4. **Ogni tablet sceglie il suo personaggio** (in alto «collegato · scegli il tuo personaggio» → «Scegli»). Senza, ogni salvataggio dal tablet dà 403 («Questo tablet non ha ancora scelto un personaggio»): me ne sono accorto provando.

## La serata, in ordine

| # | Chi | Che cosa | Tempo |
|---|---|---|---|
| 1 | Davide, PC | `node tools/adegua-abilita.mjs` — deve dire **7 pronti, 0 bloccati**, 14 punti ciascuno e, in fondo, «ATTENZIONE» se qualcuno non è al livello 8 | macchina 0,3 s |
| 2 | Davide, PC | «Modifica master» → **«Concedi il passaggio al livello 8»**, con il motivo, **un tocco ciascuno** (§9.8.3). **Una volta sola per personaggio**: dopo la salita il pulsante diventa «Concedi … livello 9» (la finestrella nomina personaggio e livelli: se dice «livello 8 → 9», **Annulla**) | tavolo ~1 min × 7 |
| 3 | i giocatori, tablet | «**Sali al livello 8**»: Classe (Grado III), tiro dei dadi, Specializzazione, incantesimi (Lucas, Dimitri), 7 punti qualunque (**li azzera l'adeguamento, non contano**), Conferma | macchina 9 s; tavolo 5–8 min, 10–15 per i taumaturghi |
| 4 | Davide, PC | `node tools/adegua-abilita.mjs` — ora **monte 21 per tutti e sette**, 0 bloccati, nessuna Abilità che scende. Poi `--applica` | macchina 0,5 s |
| 5 | i giocatori, tablet | tab Abilità: **21 punti** con «+» e «−», una scelta alla volta; a 0 punti restanti «Conferma» | macchina 10 s; tavolo 8–12 min |
| 6 | Davide, PC | **la plancia** mostra «Abilità: in corso: N/21 punti sul tablet (non ancora confermati)» — **si aggiorna da sola ogni pochi secondi**; a conferma la riga sparisce | — |

**Totale stimato:** 1 ora–1 ora e mezza con le salite di livello alla serata (6 contemporanee, i due taumaturghi per ultimi); **circa 45 minuti** se salite e scelte pendenti si fanno prima.

## Se qualcosa va storto a metà

- **Un giocatore ha sbagliato i punti dopo la conferma:** `node tools/adegua-abilita.mjs --annulla "NOME"` — torna com'era prima di `--applica` (0,2 s), gli altri non si toccano. Poi rifà il passo 5.
- **Tutto da rifare:** server spento, voce 4 di `Mutant.bat` («Ripristina»): ora elenca anche **«prima dell'adeguamento delle Abilità»** (lo zip di `--applica`, 58 file, 0,2 s; la cartella torna identica byte per byte a prima di `--applica`). Più indietro (prima delle concessioni) si torna solo con la «Salva sessione» di prima di sera.
- **«Conferma» dà un errore sul tablet:** prima di tutto guardare il messaggio; da questo lotto la conferma dei tablet **passa** (prima era 403). Se compare ancora, `--stato` dice a che punto è il file.
- **La plancia dice «0/21» e il giocatore dice di aver messo dei punti:** vale il tablet (la plancia legge ciò che il tablet comunica; se il server è stato riavviato quel numero si perde, e riappare al primo «+» o «−»).
- **La Neverlost doppia** resta nel registro dei veicoli: non c'entra con la serata.

## Due tablet sullo stesso personaggio
Se due persone guardano la stessa scheda e scrivono, il secondo a salvare — se aveva letto prima — vede un avviso di conflitto e **non sovrascrive niente**; riletta la scheda, scrive. Provato (409).

## Cosa NON si vede

La plancia mostra i punti **messi sul tablet**, non quelli **scritti nel file**: finché il giocatore non conferma, per il file sono 0. È voluto: nessun punto entra nel file senza «Conferma».
