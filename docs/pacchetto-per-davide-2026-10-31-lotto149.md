# Pacchetto per il Doc «per-davide.md» — Lotto 149 (31/10/2026, mattina)

Da applicare da Cowork (o Marcello): Claude Code non scrive nel Doc. Si applica **sopra il Doc del 30/10 13:19**, **dopo** i pacchetti dei lotti 147 e 148 (`docs/pacchetto-per-davide-2026-10-30-lotto147.md`, `…-lotto148.md`), che nel Doc non ci sono ancora (il Doc ha le domande fino alla A.219).

Intestazione: «Aggiornato al 31 ottobre 2026 (mattina).»

---

## Sezione 2 — Domande aperte (in coda al blocco «Energia (NEC)»)

> **A.226 — Lo Scout della campagna: prezzo e dotazione dopo la scheda 0.6.** La scheda 0.6, il Manuale dei Veicoli 0.10, l'Equipaggiamento 0.25 e il registro NEC 2.10 danno lo Scout standard a **126.510 cr** (telaio 90.000, M606 19.000, accumulatori 4.000, tre bombole 3.000, munizioni e contenitori 2.800 con 400 colpi caricati e 400 di riserva, corredo 7.710) e le riparazioni a Corpo 300, Propulsione 100, Motore 300 cr per PI. L'app tiene ancora il valore approvato con la A.101: 202.520 cr, 400 colpi caricati e 800 di riserva, Propulsione 250 e Motore 500 cr per PI, corredo da campo. Vale lo standard nuovo anche per lo Scout già in campagna (Petra, la spedizione)? *Nel frattempo:* l'app tiene i valori della A.101 e non tocca lo Scout già salvato; l'energia e le bombole sono già quelle della scheda 0.6.
>
> **A.227 — I ricambi di prima dei mezzi salvati.** Un Scout salvato con un Banco Rosso di ricambio (50.000 Lx) o un Modulo Verde di ricambio (10.000 Lx) non ha un posto nel profilo nuovo, che parte senza scorte («nessuna oltre agli accumulatori installati»). Il Banco di ricambio diventa un MEC Rosso (come lo Scout) o una CEC Rossa (come per i PG, A.217)? E il Modulo Verde una CEC Verde? *Nel frattempo:* le riserve **installate** sono convertite per frazione (A.193); i ricambi restano «da convertire (A.193)» nel file, senza numero, e la scheda li mostra.
>
> **A.228 — Le frazioni della conversione.** La A.193 dice «niente arrotondamento per eccesso» e «le frazioni restano dentro». L'app tiene la frazione nella riserva dei mezzi (un Scout a 66.666 su 100.000 Lx ha 6,6666 cariche Rosse e la scheda mostra 6 intere, 499 km) e consuma da lì; per i personaggi segna le cariche intere per difetto e conserva il risultato esatto nel registro della conversione (la tuta a 31 ore su 40 diventa 7 cariche, registrata 7,75). Va bene così, o la frazione deve valere una carica intera appena la riserva si usa? *Nel frattempo:* come descritto.

## Sezione 3 — Risposte ricevute, in implementazione

**Togliere** le voci A.192 e A.193 (passano alla sezione 6). **Aggiornare la A.217** (resta aperta, ridotta ai soli Moduli): «L'app converte i Banchi in CEC con la loro frazione; un Modulo da 10 UE resta "da convertire (A.193)" finché non rispondi (A.217).» **Aggiornare la A.219** (resta aperta): «Nel frattempo: un tocco del Direttore, "Chiudi la giornata", nella tab Veicoli della scheda (blocco "Energia e supporto vitale"); senza Calendario. La carta del veicolo nella plancia mostra le cariche e i chilometri della giornata, ma il tocco sta nella scheda.»

## Sezione 6 — Risolte (aggiungere)

> • **A.192 — L'energia dei mezzi: Autovettura e Scout** (risposta del 30/10; app aggiornata il 31/10/2026). *In parole semplici:* l'Autovettura ha una CEC Rossa da 10 cariche e fa 1.000 km (100 km a carica); lo Scout ha un MEC Rosso da 10 cariche (75 km a carica, 750 km nominali) e una CEC Verde da 10 cariche per i servizi, una carica per ogni giorno in cui si usa il supporto vitale. I chilometri delle tratte brevi si sommano e le cariche si tolgono **una volta sola**, con il tocco «Chiudi la giornata», arrotondando per eccesso (3 tratte da 30 km su un'Autovettura = 90 km = 1 carica, non 3); le accensioni del supporto vitale nello stesso giorno contano una carica Verde, un giorno senza uso nessuna. L'aria è a parte: tre bombole da 8 ore (24 ore effettive, anche non consecutive) e la ricarica dell'energia non le ripristina («Ricarica le bombole»: 100 cr e 20 minuti ciascuna). Ricarica completa dello Scout 400 cr in due ore (tre in successione). L'elettronica ordinaria non consuma. La chiusura della giornata a tocco del Direttore è provvisoria (A.219 aperta). *Nell'app:* `data/veicoli.json`, `src/veicoli.js`, tab Veicoli, carta del veicolo, foglio Veicoli della stampa; il numero e il formato delle bombole sono quelli della scheda 0.6 (non più «da definire»).
>
> • **A.193 — Le riserve salvate in Lx, UE o ore** (risposta del 30/10; app aggiornata il 31/10/2026). *In parole semplici:* una riserva salvata nei modelli di prima passa alle cariche conservando la **frazione** residua: una cella a metà vale metà della capacità del profilo nuovo (uno Scout al 50% ha il MEC Rosso a 5 cariche su 10). Il valore di prima resta nel file, il risultato si registra, non si arrotonda per eccesso e la conversione non si ripete alle aperture successive. Se il profilo nuovo non è certo la riserva resta «da convertire» fino alla tua verifica (i Moduli, A.217; i ricambi di prima dei mezzi, A.227). Vale per i mezzi (Autovettura e Scout) e per i personaggi (NEC standard, Banchi, tuta, riparo, verricello, utensile laser). *Nell'app:* `convertiRiservaNec` in `src/sessione.js`, `normalizzaRisorse` in `src/veicoli.js`, strumento di controllo `node tools/riserve-da-convertire.mjs` (solo lettura).

## Sezione 4 — Da correggere nella prossima edizione dei manuali

> • Scout 0.6, riga «Alimentazione ricaricabile»: scrive «1 MEC Rosso; 1.000 UER; 10 cariche» e «1 CEC Verde; 100 UEV; 10 cariche»: la UE è un'unità del lotto 1 dei NEC, ormai sostituita dalle cariche (il registro NEC 2.10 e il Manuale dei Veicoli 0.10 §9.1 dicono «100 UER in dieci cariche» solo per l'Autovettura). Se la UE resta come dato di riferimento va detto; se no, toglierla dalla scheda.

## Sezione 5 — Manuali che l'app aspetta

Sostituire la voce delle edizioni del 30/10 17:38: «Equipaggiamento 0.25, Veicoli 0.10, ASA Scout 0.6 e registro NEC 2.10 sono lette e recepite per l'energia (lotto 149); prezzo, corredo, munizioni e riparazioni dello Scout 0.6 aspettano la risposta alla A.226. La **Neverlost** (scheda 1.6, Veicoli 0.10, ultimo capitolo) non è ancora nell'app: è il lotto successivo.»
