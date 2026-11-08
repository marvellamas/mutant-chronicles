# Pacchetto per il Doc «per-davide.md» — Lotto 181 (08/11/2026): CyberArma e prezzi, A.251, A.256, A.257

Da applicare da Cowork (o Marcello): Claude Code non scrive nel Doc. Si applica **dopo** il pacchetto del lotto 180
(`docs/pacchetto-per-davide-2026-11-08-lotto180.md`).

Intestazione: «Aggiornato all'8 novembre 2026.»

Dettaglio: `docs/diff-lotto181-2026-11-08.md`.

---

## Sezione 3 — Risposte ricevute, in implementazione

**Togliere** le tre voci che passano fra le Risolte:

- **A.251 — CyberArma modificata e PM personali**;
- **A.256 — Prezzo di vendita degli artefatti**;
- **A.257 — Valore complessivo della FIAT LUX**.

Restano in sezione 3 le sei risposte del 06/11 non ancora applicate (A.246, A.253, A.254, A.255, A.258, A.259).

## Sezione 2 — Domande aperte

**Aggiungere** sei domande nuove, dal primo numero libero:

> • **A.260 — Il consumo delle conversioni della CyberArma: colpi o Round?** (08/11/2026). *In parole semplici:* la
> A.251 dice «1 CM + 1 AzP ogni 10 colpi» e «1 carica + 1 AzP ogni 10 colpi»; la A.236 del 2 novembre diceva «1 CM
> per 10 Round», e il manuale (Armamenti §7.25, Magia §28) parla di 10 Round. Vale la misura in colpi? *Nel
> frattempo:* l'app applica la A.251, che è la più recente, e conta 10 colpi.

> • **A.261 — La formula del prezzo e i prezzi già scritti nei manuali** (08/11/2026). *In parole semplici:* con la
> formula della A.256 una Batteria da 5 PM Rossa (costruzione 650 cr, Comune) verrebbe 1.950 cr, mentre il catalogo
> dell'Equipaggiamento §10.2 la dà a 1.000; le pergamene del §27.3 hanno una colonna «Vendita» pari al doppio della
> creazione, mentre la formula darebbe il triplo. La formula sostituisce i prezzi di catalogo già scritti, o vale
> solo dove un prezzo non c'è? *Nel frattempo:* l'app tiene i prezzi dichiarati dai manuali e mostra accanto il
> prezzo di vendita calcolato.

> • **A.262 — Il coefficiente dell'«Epica»** (08/11/2026). *In parole semplici:* la tabella della A.256 dà i
> coefficienti di Comune, Non comune, Raro, Molto raro, Leggendario e «Unico o reliquia», ma non dell'**Epica**, che
> è la potenza del Grado V (Equipaggiamento §10.1) e nel catalogo esiste (per esempio la Batteria da 25 PM Rossa).
> Quale coefficiente ha? *Nel frattempo:* l'app non calcola un prezzo di vendita per gli Artefatti Epici e scrive
> perché.

> • **A.263 — Grado e SnT dell'Anello con Rigenerazione 9** (08/11/2026). *In parole semplici:* la A.256 dice
> l'Anello «Molto raro», mentre la configurazione che hai approvato il 2 novembre gli dà Grado III e SnT 3. I
> manuali legano le tre cose: Grado III significa potenza Rara (Equipaggiamento §10.1) e Molto Rara significa SnT 4
> (Armamenti §7.10). Cambiano Grado e SnT dell'Anello, o la sua rarità è un'eccezione alle due tabelle? *Nel
> frattempo:* l'app applica la A.256 per la rarità e il prezzo (13.500 cr) e tiene il Grado III e la SnT 3 della
> configurazione approvata.

> • **A.264 — Quanto vale un accumulatore di ricambio scarico** (08/11/2026). *In parole semplici:* la A.257 dice
> che gli accumulatori di ricambio contano nel valore del mezzo «e loro stato o carica», ma non dice di quanto cala
> il valore di un ricambio mezzo scarico. *Nel frattempo:* l'app toglie dal prezzo pieno le cariche mancanti alla
> tariffa di ricarica già nei dati (30 cr la carica per un MEC, 10 per un CEC), mai scendendo sotto zero: un MEC
> Rosso di ricambio a 4 cariche su 10 vale 2.820 cr invece di 3.000.

> • **A.265 — La potenza della CyberArma originale** (08/11/2026). *In parole semplici:* il §7.10 lega la
> classificazione di potenza al costo di sintonizzazione (Comune 1, Non Comune 2, Rara 3…), ma la CyberArma
> originale ha SnT 1 nell'impiego del Custode e 2 in quello del Tecnomante, e il manuale non ne dichiara la potenza.
> Nei dati è scritta «Comune». Qual è? *Nel frattempo:* l'app lascia «Comune» e non ne deduce nessun prezzo, perché
> ogni originale è un pezzo unico.

## Sezione 6 — Risolte

**Aggiungere**:

> • **A.251 — Come si alimenta la CyberArma modificata** (risposta del 06/11; app aggiornata l'08/11/2026). *In
> parole semplici:* due famiglie di modifiche che non si comportano allo stesso modo. **Cristallo sostituito** e
> **modulo SIN inserito** non toccano l'alimentazione: l'arma continua a potersi alimentare con i PM personali,
> conserva le proprietà da Custode, e le due cose stanno insieme. **Riserva interna di CM** e **conversione a NeC**
> sono conversioni energetiche: impediscono l'uso dei PM personali, fanno perdere le proprietà da Custode e non si
> cumulano fra loro; consumano 1 CM, o 1 carica NeC Rossa, più 1 AzP ogni 10 colpi. Nel progetto della CyberArma
> c'è ora la scelta dell'**Alimentazione**, accanto a quella della forma: ogni opzione dice che cosa fa e **che cosa
> si perde, prima di confermare**, e la conferma di una conversione lo ripete per esteso. Le due conversioni le
> autorizzi soltanto tu dal tuo PC: dal tablet di un giocatore il server non le lascia scrivere. Se scegli una
> conversione, l'arma che consegni prende il profilo giusto (riserva di CM, o NeC) e «Consegna l'arma» ti avvisa
> della perdita. Senza scelta l'arma resta a PM personali, come il progetto base di Dimitri.

> • **A.256 — Il prezzo di vendita degli artefatti** (risposta del 06/11; app aggiornata l'08/11/2026). *In parole
> semplici:* prezzo di vendita = costo completo di costruzione × 3 × coefficiente di rarità (Comune 1, Non comune
> 1,5, Raro 2, Molto raro 3, Leggendario 5), arrotondato per eccesso ai 50 cr successivi; un pezzo unico o una
> reliquia non ha prezzo di catalogo. L'**Anello con Rigenerazione 9** aveva nei dati la rarità sbagliata — «Raro»
> invece di «Molto raro» —: corretta, e adesso vale **13.500 cr** (1.500 × 3 × 3), come dici tu. Ricontrollate tutte
> le altre rarità del catalogo contro i manuali: era sbagliata una sola altra voce, la **CyberArma convertita a
> NeC**, che ha SnT 3 e quindi è Rara, non Non comune. Tutto il resto corrispondeva. Scrigno del Primo Giuramento,
> Tomo dei Guardiani e le tre voci della CyberArma sono segnati «Unico o reliquia»: la scheda scrive «senza prezzo
> di catalogo» invece di un numero. Dove il manuale un prezzo ce l'ha, resta quello, e il prezzo di vendita
> calcolato si legge accanto (vedi la A.261). **Rarità e reperibilità restano separate:** la Reperibilità è sempre
> accanto al prezzo e comprare qualcosa che non ha una Reperibilità indicata avvisa — «il prezzo non garantisce un
> venditore» — senza impedirlo, perché decidi tu se l'oggetto si trova.

> • **A.257 — Quanto vale il FIAT LUX** (risposta del 06/11; app aggiornata l'08/11/2026). *In parole semplici:* il
> prezzo di catalogo dello Scout standard resta 126.510 cr, e il valore dell'esemplare adesso si calcola. Nella
> scheda del mezzo ci sono **tre righe separate**, non un numero solo: **Modello base 126.510 cr**, **Dotazione
> extra 62.600 cr**, **Valore totale dell'esemplare 189.110 cr**. La dotazione extra è voce per voce: kit trauma
> 3.000, pistola sanitaria 3.500, dieci cartucce di naniti 50.000, sei copriruote di Petra 900, i 400 colpi in più
> della M606 1.200, il MEC Rosso di ricambio 3.000 e il CEC Verde di ricambio 1.000. **Non è un numero scritto una
> volta: segue l'inventario.** Quello che si conta da munizioni, pezzi dei rinforzi e riserve cambia da solo quando
> sparate, perdete un copriruota o trasferite un ricambio; le altre voci hanno − e + nella riga. Consumare due
> cartucce di naniti fa scendere il totale a 184.110 cr. Un accumulatore di ricambio conta anche il suo stato (vedi
> la A.264). Il **valore stimato** che puoi scrivere tu prende il posto della riga del modello base, perché il FIAT
> LUX è antico e può valere meno. **Questo supera la parte della A.226** in cui il valore stimato restava vuoto
> perché non c'era modo di calcolarlo: il modo adesso c'è, e il tuo valore stimato resta il tuo.

**Nota da aggiungere alla voce A.226 già nelle Risolte**, perché il Doc non dica due cose opposte:

> *Aggiornamento dell'08/11/2026:* la A.257 supera la parte della A.226 in cui il valore stimato del FIAT LUX
> restava vuoto perché non era fissato come calcolarlo. Ora il valore corrente dell'esemplare si calcola e si mostra
> in tre righe (modello base, dotazione extra, totale) e segue l'inventario; il valore stimato scritto dal Direttore
> resta e prende il posto della riga del modello base.

## Sezione 5 — Novità nell'app (se il Doc ha la sezione; altrimenti in coda alla sezione 3)

> • **La CyberArma dice che cosa si perde** (app aggiornata l'08/11/2026). Nel progetto della CyberArma, accanto
> alla forma, si sceglie l'alimentazione: cristallo e SIN tengono i PM personali, la riserva interna di CM e la
> conversione a NeC li tolgono insieme alle proprietà da Custode, e lo dicono prima che tu confermi. Le due
> conversioni le scegli soltanto tu, dal tuo PC.

> • **Il prezzo di vendita degli artefatti** (app aggiornata l'08/11/2026). Ogni Artefatto ha la sua riga «Prezzo»,
> con il conto della A.256 e la Reperibilità accanto. L'Anello con Rigenerazione 9 vale 13.500 cr. Le reliquie e i
> pezzi unici dicono «senza prezzo di catalogo» invece di un numero.

> • **Il valore del FIAT LUX** (app aggiornata l'08/11/2026). Nella tab Veicoli, tre righe: modello base, dotazione
> extra, valore totale dell'esemplare. Il totale cambia quando qualcosa viene consumato, rimosso o trasferito.
