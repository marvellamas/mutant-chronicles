# Pacchetto per il Doc «per-davide.md» — Lotto 193 (13/11/2026): il Morente, e le righe di registro

Da applicare da Cowork (o Marcello): Claude Code non scrive nel Doc. Si applica **dopo** il pacchetto del lotto 183
(`docs/pacchetto-per-davide-2026-11-08-lotto183.md`).

Intestazione: «Aggiornato al 13 novembre 2026.»

Dettaglio: `docs/diff-lotto193-2026-11-13.md`.

---

## Prima di tutto: due delle tre domande che volevamo fare **non vanno fatte**

Marcello voleva chiedere a Davide tre cose che finora gli erano state chieste a voce. Leggendo il Doc E&L per le
regole del Morente sono saltate fuori già risposte, per iscritto, nel blocco **«Adeguamento approvato delle Abilità
e passaggio al livello 8 — 11 novembre 2026»**. Non si chiede a Davide quello a cui ha già risposto: resta la terza,
che però non è una domanda.

| Quello che volevamo chiedere | Che cos'è successo |
| --- | --- |
| Da che livello parte l'adeguamento: 21 punti o 14? | **Risposta scritta.** «La destinazione dei sette PG è il livello 8, con tre Gradi complessivi… il monte totale spettante è 7 × 3 = 21 punti liberi, inclusi quelli dei livelli 1, 4 e 8». Niente da chiedere: sono **21**. |
| Oshi Nagata va rifatto da zero o solo adeguato? | **Risposta scritta.** «Oshi Nagata è stato ricreato come Assaltatore II; non è più Lestofante/Assaltatore. Per il livello 8 passa ad Assaltatore III… L'adeguamento non deve ripristinare i vecchi Gradi o benefici da Lestofante». |
| Chi sono i due che ricevono l'avanzamento senza PX? | **Non è una domanda per Davide.** Il Doc dice: «I nomi dei due destinatari non sono stati specificati in questa decisione e **non devono essere dedotti o inventati**. La funzione straordinaria è disponibile al Direttore». È una scelta del Direttore al tavolo, nel momento, come la A.246: la fa lui sulle due Schede. |

Queste tre righe non entrano nel Doc come domande. Vanno in `docs/risposte-master.md` come risposte già ricevute, ed
è quello che il lotto ha fatto.

---

## Sezione 2 — Domande aperte

**Niente da aggiungere.** Il lotto 193 non ha aperto nessuna domanda nuova: i §§5.14.2–5.14.3 del Giocatore 0.62 e
la registrazione A.159 del Doc E&L bastano a implementare tutto, e dove il testo lasciava uno spazio l'app ha
scelto il verso che non fa danno (vedi sotto, sezione 4).

Il primo numero libero resta **A.268**. Restano aperte le sei del lotto 181 (A.260–A.265), la A.267 del lotto 192
(nell'adeguamento un VA può scendere) e la A.246, che è una decisione del Direttore al tavolo.

## Sezione 4 — Richieste e note di lavorazione

**Aggiungere**, come richiesta e non come lamentela:

> • **Una riga di registro per ogni pubblicazione.** In sezione 7 del Doc ci sono **tre** righe di registro
> (Magia 1.16, Equipaggiamento 0.40, Mostri 0.47) a fronte di **ventisette** pubblicazioni fra il 9 e il 12
> novembre. Per gli altri manuali abbiamo ricostruito che cosa fosse cambiato confrontando i testi, e **sei
> manuali su sette sono stati recepiti alla cieca**: funziona, ma dove due letture sono possibili dobbiamo
> scegliere noi, e scegliamo senza sapere che cosa intendevi. Basterebbe una riga per manuale, al momento della
> pubblicazione: *che cosa è cambiato dall'edizione precedente a questa*. Una riga come quelle che hai già scritto
> per la Magia 1.16 — «Cambiati rispetto alla 1.15: …» — è esattamente quello che serve, e ci risparmia di
> indovinare. *Nel frattempo:* il repo segna manuale per manuale quali edizioni sono state confrontate alla cieca
> (`tools/manuali.json`, campo `confronto`), e per quelle una differenza ambigua la trattiamo come ipotesi
> dichiarata, mai come certezza.
>
> • **Il blocco «Adeguamento approvato delle Abilità» è arrivato nel Doc E&L, non nel registro.** L'abbiamo
> trovato leggendo il Doc per un'altra ragione, e conteneva le risposte a tre cose che stavamo per chiederti a
> voce (livello 8, monte di 21 punti, Oshi Assaltatore III). Nessun problema — è solo per dire che quando una
> decisione riguarda direttamente le Schede dei PG, una riga anche breve in sezione 7 ce la fa trovare subito.
> *Nel frattempo:* d'ora in poi, al controllo di inizio sessione, leggiamo per intero anche i blocchi nuovi del
> Doc E&L e non solo le risposte numerate.

## Sezione 6 — Risolte

**Aggiungere**:

> • **A.159 — Morente, contatore di sopravvivenza e cure specifiche** (risposta completa approvata nel Doc E&L;
> app aggiornata il 13/11/2026). *In parole semplici:* l'app adesso fa tutto quello che la tua registrazione
> chiedeva, e una cosa in più che ti segnaliamo perché è una scelta nostra. Il contatore parte dalla COS intera,
> resta pieno al colpo che fa entrare in Morente, cala di 1 per ogni Round compiuto — alla stessa posizione
> d'Iniziativa dell'ingresso, come avevi precisato — e di 1 per ogni Ferita dei colpi successivi, anche dello
> stesso attacco. Chi soccorre vede, **prima di spendere l'azione**, se quello che sta per fare stabilizza: tre
> vie che stabilizzano (Medicina con il kit, Guarigione dal livello 3, Cartuccia Stabilizzante) con costo, Prova
> ed esiti, e accanto sette cose che **non** stabilizzano, con il perché — recuperare PV e arrestare il
> Sanguinamento per primi, che sono i due errori facili. L'UMC Automatica è segnata come «solo a fine attacco, e
> non resuscita». Un contatore **disattivato** da una stabilizzazione e un contatore **esaurito** finiscono tutti
> e due su 0 e nell'app sono due cose diverse, con due testi diversi: a chi è stato salvato la scheda non dice mai
> «morto».
>
> *La scelta nostra, che ti chiediamo di confermare quando ci pensi:* la tua registrazione, al punto 9, dice che
> al raggiungimento di 0 con contatore attivo «il personaggio passa a Morto». L'app si ferma un passo prima:
> scrive «il contatore attivo è arrivato a 0», lo mostra in evidenza, e mette accanto il pulsante **«Registra la
> morte»**, che è del Direttore e si **annulla**. Lo stato Morto esiste ed è distinto, come chiedevi — non è un
> avviso generico «Oltre Grave» — ma ci arriva il Direttore, non l'app. Lo abbiamo fatto per il principio che hai
> approvato con Marcello: l'app propone, non impone, e l'ultima parola è del master. Se stasera qualcuno va a
> terra e un tocco va storto, si annulla. Se preferisci che l'app ci arrivi da sola, si cambia in dieci minuti.
