# La serata dell'adeguamento — procedura per lunedì 23 (rifatta col lotto 224, 19/11/2026)

**Rifatta dall'inizio alla fine su una copia dell'istantanea del 17/11, con i sette PG veri, sull'app di oggi.** Dalla prima prova (lotto 215) sono cambiati il pannello del lancio, il riquadro dei Talenti e la barra della scheda (221) e la dotazione ASA con il motivo precompilato della concessione (223): quello che segue è stato rifatto davvero, nei due ruoli — Direttore dal PC, giocatore dal tablet a 820 px.

I tempi: «macchina» = misurati; «tavolo» = stime, perché non ho sette persone.

## Prima di sera (30 min, una volta)

1. **«Salva sessione»** (voce 3 di `Mutant.bat`). Lo zip di `--applica` si fa *dopo* le salite di livello: per tornare a prima di tutto serve questo. *Misurato: zip di 1,3 MB.*
2. **Michele** ha un posto Specializzazione del 1° livello ancora da scegliere: finché non lo sceglie, «Sali al livello 8» resta spento, col messaggio «Scegli prima i Talenti nel riquadro "Da scegliere"». Lo sceglie dal riquadro **«Da scegliere: 1 Specializzazione» → «Scegli»**; appena scelto il riquadro sparisce e il messaggio del pulsante diventa quello dei PX, che toglie la concessione (passo 2 della serata). *Provato.*
3. **Lucas e Dimitri non hanno niente in sospeso**: i loro incantesimi nuovi si scelgono **dentro** «Sali al livello 8», al passo «Incantesimi», che compare solo dopo aver scelto il Grado di Classe. Lucas ne sceglie **4** (il passo dice «17 / 21 incantesimi conosciuti»), Dimitri **2** («18 / 20», liberi 5 su 6: la quota corretta della A.287, ricontrollata in questo lotto).
4. **Ogni tablet sceglie il suo personaggio** (in alto «collegato · scegli il tuo personaggio» → «Scegli»). Senza, ogni salvataggio dal tablet dà **403**: «Questo tablet non ha ancora scelto un personaggio: sceglilo prima di scrivere». *Riprovato.*
5. **Aggiornare l'app** (voce 2 di `Mutant.bat`): la versione di oggi corregge il difetto per cui, **dopo l'adeguamento**, tutti e sette avevano «Sali al livello» spento con «Completa la creazione prima di salire di livello» (lotto 224). Senza l'aggiornamento la serata riesce lo stesso, ma la volta dopo nessuno può salire.

## La serata, in ordine

| # | Chi | Che cosa | Tempo |
|---|---|---|---|
| 1 | Davide, PC | `node tools/adegua-abilita.mjs` — deve dire **7 pronti, 0 bloccati**, monte **14** punti ciascuno e, in fondo, «ATTENZIONE: 7 su 7 non sono ancora al livello di destinazione» | macchina 0,3 s |
| 2 | Davide, PC | «Modifica master» → **«Concedi il passaggio al livello 8»**: il motivo è **già scritto** («Concessione individuale del Direttore (Direttore §9.8.3, A.286): NOME passa dal 7° all'8° livello senza i PX richiesti; i PX non cambiano»); si legge, si può cambiare, si conferma col pulsante che porta il nome del PG. **Una volta per personaggio**: dopo la salita il pulsante diventa «Concedi … livello 9» (se la finestrella dice «livello 8 → 9», **Annulla**) | macchina 0,25 s ciascuna; tavolo ~30 s × 7 |
| 3 | i giocatori, tablet | «**Sali al livello 8**»: Grado di Classe + **tiro dei PV** (per i taumaturghi **anche il tiro dei PM**: sono due pulsanti «Tira», uno sotto l'altro), Specializzazione, Incantesimi (Lucas e Dimitri), 7 punti qualunque (**li azzera l'adeguamento, non contano**), Riepilogo → Conferma | macchina 11 s; tavolo 5–8 min, 10–15 i taumaturghi |
| 4 | Davide, PC | `node tools/adegua-abilita.mjs` — ora **monte 21 per tutti e sette**, 0 bloccati, **nessuna Abilità che scende di categoria**. Poi `--applica` | macchina 0,3 s + 0,45 s |
| 5 | i giocatori, tablet | tab Abilità, riquadro **«Adeguamento delle Abilità — 21 punti»**: colonna «Prima» (il VA di allora, **con** i punti liberi di allora) e «Adesso / Limite» (senza, perché li riassegni ora), «−» e «+» una scelta alla volta; a 0 punti restanti **«Conferma»** | macchina 19 s; tavolo 8–12 min |
| 6 | Davide, PC | **la plancia** mostra «Abilità: in corso: N/21 punti sul tablet (non ancora confermati)»; a conferma la riga sparisce e lo strumento dice «adeguato» | — |

**Totale stimato:** 1 ora–1 ora e mezza con le salite alla serata; **circa 45 minuti** se le salite si fanno prima.

### Quello che si vede, ed è giusto così

- **Il dado si può ritirare.** Finché non si conferma il livello, «Tira 1d8» ripremuto sostituisce il risultato. Se volete il tiro unico, tiratelo sul tavolo e scrivetelo in «risultato tirato dal vivo» (**A.297**: dire se l'app deve impedire il secondo tiro).
- **Per i taumaturghi i tiri sono due** (PV e PM). Se si dimentica il secondo, il Riepilogo **non lascia confermare** e dice «manca il tiro di 1d4 per i PM di Invocatore»: si torna al passo 1 e si preme il **secondo** «Tira».
- **Dimitri vede un avviso prima di confermare**: «i tuoi incantesimi superano le quote di oggi perché il Direttore ha corretto l'Intelligenza… puoi procedere», con la finestrella **«Procedi comunque»**. È previsto (A.287): si tocca e si va avanti.
- **I PX non cambiano mai**, in nessun passo: controllato prima e dopo su tutti e sette (1010, 906, 1002, 1022, 1006, 1008, 1012).
- **Dopo la salita la barra della scheda resta su una riga** anche con il ritratto, la spunta del salvataggio, «⚔ Round N» dello scontro aperto e «Sali al livello 9», e sotto la fascia gialla della copia di prova: le righe in cima si impilano, non si coprono.

## Le correzioni di Dimitri: le fa l'app (A.281 e A.293, dal lotto 225)

**Non c'è più un passo a mano.** Con `node tools/adegua-abilita.mjs --applica` l'app, per Dimitri, **annulla da sola le quattro correzioni alle Abilità del 2 novembre** (i due +1 ad Armi da mischia, il −1 a Percezione, il −1 a Scienza: `regole.json` → `adeguamento_abilita.annulla_correzioni_abilita`). Le righe **restano** nel registro «Modifiche del master», marcate annullate; la riga della nota di prima ricorda quali (`correzioniAnnullate`), e `--annulla` le riattiva e riporta il file com'era.

**Le correzioni di Caratteristica non si toccano e non si applicano due volte** (A.293): Destrezza +2, Forza −1, Carisma −1 del 2 novembre, più Saggezza +2 e Intelligenza −2 del 26 ottobre, restano attive com'erano. Non consumano né aumentano i 21 punti. La procedura ora vede Dimitri **come la sua scheda** (prima ignorava le correzioni di Caratteristica: 24 Abilità su 24 con un VA diverso).

**Come si controlla** (tab Abilità di Dimitri, confrontando prima e dopo `--applica`): **Percezione +1**, **Armi da mischia −2**, **Scienza +1**; Destrezza, Forza, Carisma, Intelligenza e Saggezza **identiche**. Gli scarti sono sempre questi, i numeri assoluti dipendono da come Dimitri spende i 21 punti.

**Cosa resta a mano: niente** per Dimitri. Resta a mano, come sempre, la sola scelta del Direttore sul livello 8 (concessione o PX).

## Se qualcosa va storto a metà

- **Un giocatore ha sbagliato i punti dopo la conferma:** `node tools/adegua-abilita.mjs --annulla "NOME"` — torna com'era prima di `--applica` (0,2 s), gli altri non si toccano. Poi rifà il passo 5.
- **Tutto da rifare:** server spento, voce 4 di `Mutant.bat` («Ripristina»): elenca anche **«prima dell'adeguamento delle Abilità»** (lo zip di `--applica`, 57 file). Più indietro — prima delle concessioni — si torna solo con la «Salva sessione» di prima di sera.
- **«Conferma» dà un errore sul tablet:** guardare il messaggio. La conferma dai tablet **passa** dal lotto 215; se compare un 403, quel tablet non ha scelto il personaggio (passo 4 di «Prima di sera»).
- **Due tablet sulla stessa scheda:** il secondo a salvare, se aveva letto prima, prende **409** e **non sovrascrive niente**; rilegge e riscrive. *Riprovato: dopo il 409 nel file c'era quello che aveva scritto il primo.*
- **Il giocatore ha la scheda aperta mentre Davide concede:** il pulsante si accende quando la scheda rilegge dalla cartella; se resta spento, basta riaprirla dall'elenco.
- **La plancia dice «0/21» e il giocatore dice di aver messo dei punti:** vale il tablet (la plancia mostra ciò che il tablet comunica; se il server è stato riavviato quel numero si perde e riappare al primo «+» o «−»).
- **La Neverlost doppia** resta nel registro dei veicoli: non c'entra con la serata (si cancella dalla tab Veicoli, lotto 218).

## Cosa NON si vede

La plancia mostra i punti **messi sul tablet**, non quelli **scritti nel file**: finché il giocatore non conferma, per il file sono 0. È voluto: nessun punto entra nel file senza «Conferma».
