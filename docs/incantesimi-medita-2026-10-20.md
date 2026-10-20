# Incantesimi dagli artefatti, incantesimi liberi e «Medita» (20/10/2026)

Richieste del tavolo del 19/10. Manuali invariati (controllo del 20/10: Giocatore 0.48, Magia 1.5, Equipaggiamento 0.8, Armamenti 0.64, E&L; «per-davide.md» del 19/10 11:47 senza risposte nuove).

## A. Un artefatto che contiene un incantesimo lo lancia

- `src/incantesimi-artefatti.js`: le righe derivate dall'Inventario (artefatti con un incantesimo infuso, Pietra della Vigilanza, pergamene, e i Guanti). Niente è salvato: l'incantesimo resta legato all'oggetto, non entra fra i conosciuti e, se l'oggetto esce dall'Inventario o il Consumabile finisce, sparisce da solo.
- Poteri → «Incantesimi dagli oggetti»: stessa scheda (il nome apre la stessa finestra), «Lancia!» che apre il pannello a passi (Versione, PM, Risultato) con costo, Azioni, Concentrazione, durata e bersagli, e la durata nei «Incantesimi in corso» come gli altri (anche per chi non ha la magia propria). Nella tab Artefatti il pulsante «Attiva (−N PM)» è diventato «Lancia!» con lo stesso pannello.
- Regole (Magia §24.2, §26.2, §27.1): attivazione automatica, nessuna Prova di Potere, Componenti o Canali; restano tempo, gittata, bersagli, durata, Concentrazione, Prove per colpire, Salvezze. **Esclusiva** = solo la riserva interna (scala quella); **Universale** = la riserva per quanto ha e il resto dai PM personali; **Consumabile** = PM sigillati, nessun PM del personaggio, «Attivazione completata» toglie un esemplare (§27.4). Non sintonizzato, deposito comune, riserva insufficiente: avvisi con «Procedi comunque».
- **Guanti da Combattimento Mistico**: i manuali non li legano a un Incantesimo (Magia §26.6.2, Armamenti §7.24: proprietà attiva Esclusiva, 3 PM, 1 AzP, 5 RND). Compaiono nello stesso elenco con la loro attivazione di prima, senza scheda di incantesimo: A.175.

## B. Incantesimi liberi, a mano

- `scelte.incantesimiAMano` (`src/incantesimi-a-mano.js`): `{ nome, origine: «Aggiunto a mano» | «Concesso dal Direttore», quando, nota? }`, nel file solo se non vuoto. Poteri → «Incantesimi aggiunti a mano»: nome dal catalogo, origine, nota facoltativa; «Lancia!» come un conosciuto, «Togli» con conferma; origine e data visibili nella scheda; una riga nello storico del personaggio a ogni aggiunta e rimozione.
- Non contano nelle quote di Classe né nei liberi, non entrano nei «conosciuti / quota», il passaggio di livello non li tocca (test su tutti i livelli del PG d'esempio). Un livello base sopra il massimo, o senza accesso alla magia, è un avviso («Aggiungi comunque»), mai un blocco.
- **Dal PC del Direttore** la Modifica master non aveva niente di simile (cambia le scelte della creazione, non aggiunge incantesimi fuori quota): non c'è duplicazione. Qui, con la scheda aperta dalla plancia in modalità master, l'origine proposta è «Concesso dal Direttore» e la modifica entra nel registro delle modifiche del master come scelta cambiata («Creazione: incantesimi aggiunti a mano») con la copia per «Annulla». Resta quindi una strada sola: la scheda, dai giocatori e dal Direttore.

## C. «Medita»

Pulsante nei riquadri dei Punti Magia (tab Poteri e colonna di sinistra); pannello a tre passi (Recupero, Destinazione, Conto) con «Conferma e applica» in una modifica annullabile e una riga nel registro.

Regole applicate (Manuale della Magia; numeri in `regole.json → recupero_pm` e `chroma.conversione`):

| Cosa | Regola | Dove |
|---|---|---|
| Recupero naturale | 0 / 1 / 2 / 3 PM per ora **completa e continuativa** in Attività pesante / leggera / Riposo breve / Riposo completo (6 ore di sonno = 18 PM); un'interruzione fa perdere la frazione d'ora; mai oltre il massimo personale | «Recupero naturale dei Punti Magia» |
| Recupero Mistico | +1 PM per ora dove il recupero è consentito (non in Attività pesante); non aumenta la Meditazione | stessa sezione; Talento `recupero-mistico` |
| Meditazione | 3 + Mod SAG PM per ora completa (minimo 3; +2 Meditazione Migliorata); ore utili al giorno 2 + Mod SAG + Mod COS (minimo 1; ×2 Meditazione Estesa); nessuna Prova; sostituisce il recupero naturale della stessa ora; fermo e tranquillo, senza esplorare, sorvegliare, ricaricare contenitori né mantenere la Concentrazione. Accessibile con l'Addestramento Taumaturgo, Recupero Meditativo o una capacità che la conceda | «Meditazione», «Talenti di Meditazione» |
| Tempo | un'ora intera per ogni ora di recupero; il limite giornaliero vale solo per la Meditazione (le ore oltre non danno PM) | idem |
| Ricarica di un cristallo | solo Addestramento Taumaturgo; contatto con un contenitore sintonizzato; 1 AzP; ogni gruppo = 1 PM nel contenitore (non oltre la capacità) per 3 PM personali (2 con Ricarica Efficiente **o** Conversione Migliorata, 1 con entrambi; Bianco sempre 2); un gruppo è automatico, due o più una sola Prova di Potere (2: 0, 3: −2, 4: −4, 5: −6, 6: −8, poi −2 per gruppo) | sez. 6 «Convertire Potere, ricaricare e prelevare» |
| Esiti | Successo: tutti i gruppi · Fallimento: nessun PM e nessuna spesa · Magistrale: un gruppo in più se riserva e spazio lo consentono · Maldestro: nessun PM e perdita del costo di tutti i gruppi | idem |

I rapporti e i Talenti vengono dai dati (`rapportoConversione`, `chroma.conversione`, `talenti_liberi.json`); nessun numero è scritto nel codice. Il conto mostra: PM recuperati (ore × PM/ora, con «base + Recupero Mistico»), PM personali prima e dopo, rapporto con la fonte («Conversione Migliorata: da 3:1 a 2:1»), gruppi, PM spesi, PM entrati nel cristallo e PM personali alla fine. Cristallo pieno (o con meno spazio dei gruppi chiesti): avviso e ci si ferma a quanto ci sta, il resto resta nei PM personali. Tutti gli altri blocchi (non sintonizzato, Scheggia instabile, Chroma Viola, nessun Addestramento Taumaturgo, PM personali a 0 = Svenuto a fine azione) sono avvisi: il Direttore decide.

**Non incluso:** la Tecnica Interiore «Meditazione Profonda» (3 PV, 2 PM e 1 punto di Affaticamento per ora di trance, Giocatore §8.9.2) ha i suoi recuperi specifici e resta alla sua scheda. **Talenti senza dati:** nessuno; Recupero Mistico non aveva un effetto tipizzato, ma i suoi numeri sono nel testo del Talento e ora in `regole.json` (`TODO(Davide)` non servito).

## Domande nuove (A.174–A.176)

- **A.174 — «Medita» e la ricarica dei cristalli.** *(chiarimento di Marcello del 20/10)* Non è un’infrazione: è l’unione di due azioni lecite — spendere i propri PM per ricaricare il cristallo e recuperarli meditando — con tutti i costi di entrambe. *Nel frattempo:* «Medita» mostra il conto (recupero nei limiti delle ore giornaliere, rapporto dai Talenti, PM spesi e entrati, 1 AzP) e applica tutto in un tocco; Addestramento Taumaturgo, contatto e sintonizzazione mancanti sono un avviso con «Procedi comunque» registrato; da due gruppi la conversione resta in attesa finché non si indica l’esito della Prova di Potere.
- **A.175 — Guanti da Combattimento Mistico e incantesimo infuso.** Il manuale non dice da quale Incantesimo derivi la loro proprietà attiva (3 PM, 1 AzP, 5 RND, pugni Magici +1 al danno). *Nel frattempo:* l'attivazione sta nello stesso elenco degli incantesimi dagli oggetti, senza scheda di Incantesimo e senza «Lancia!».
- **A.176 — Incantesimi aggiunti a mano.** Se un incantesimo concesso fuori avanzamento conta come «conosciuto» per altri usi (infusione dei Consumabili, Contromagia), e come si lancia da un personaggio senza accesso alla magia. *Nel frattempo:* conta come imparato per infondere un Consumabile, non entra nelle quote, si lancia con la scala di Potere del Taumaturgo con l'avviso di livello.

## Pacchetto per il Doc «per-davide.md»

```
*** DOC per-davide.md — sezione 2 «Domande aperte», sezione «Artefatti» (A.175) e nuova sottosezione «Incantesimi» (A.174, A.176)
*** AZIONE: aggiungi le tre voci; nessuna voce da spostare fra le Risolte

--- TESTO ---
A.174 — «Medita» e la ricarica dei cristalli (Magia, «Meditazione» e sez. 6 «Convertire Potere, ricaricare e prelevare»). Il manuale permette entrambe le azioni, ciascuna con le sue regole: meditare recupera PM (la Meditazione non ammette di ricaricare contenitori durante l’ora), e ricaricare un cristallo costa PM personali, 1 AzP, il contatto con il contenitore sintonizzato, l’Addestramento Taumaturgo e, da due gruppi in su, una Prova di Potere. Nel frattempo: il pulsante «Medita» della scheda non infrange la regola, unisce in un tocco due azioni lecite, con tutti i costi di entrambe. Mostra il conto prima (PM recuperati nei limiti delle ore giornaliere, rapporto di conversione dai Talenti — 3:1, 2:1, 1:1, Bianco sempre 2:1 —, PM spesi, PM entrati nel cristallo, 1 AzP); l’Addestramento Taumaturgo, il contatto e la sintonizzazione mancanti sono un avviso con «Procedi comunque», registrato; per due o più gruppi la conversione non si applica finché chi gioca non indica l’esito della Prova di Potere (l’app non tira). I PM recuperati si versano nel cristallo man mano, anche quelli che oltre il massimo personale andrebbero persi. Se la ricarica deve restare un’azione separata, basta dirlo.

A.175 — Guanti da Combattimento Mistico e incantesimo infuso (Magia §26.6.2, Armamenti §7.24). Il manuale non dice da quale Incantesimo derivi la loro proprietà attiva (3 PM dalla riserva interna, 1 AzP, 5 RND, pugni Magici e +1 al danno). Nel frattempo: l’attivazione compare nello stesso elenco degli incantesimi che arrivano dagli oggetti, con la sua scheda e senza «Lancia!» di un Incantesimo. Se derivano da Arma Mistica o da un’altra scheda, indicare quale e la versione.

A.176 — Incantesimi aggiunti a mano (un maestro, un ritrovamento, una concessione del Direttore). Domanda: un incantesimo imparato fuori dall’avanzamento conta come «conosciuto» per gli altri usi (infusione dei Consumabili, Contromagia), e come si lancia da un personaggio senza accesso alla magia? Nel frattempo: non conta nelle quote di Classe né nei liberi, il passaggio di livello non lo toglie, conta come imparato per infondere un Consumabile, e si lancia con la scala di Potere del Taumaturgo, con un avviso se il livello supera il massimo (mai un blocco).
```

## Aggiornamento del 20/10 (sera): elenco unico e costi della scorciatoia

- **Elenco unico.** Gli incantesimi aggiunti a mano stanno nell'elenco degli incantesimi della tab Poteri, sotto la loro macrofamiglia, con «(Aggiunto)» accanto al nome; origine, data e nota sono nel suggerimento e nella riga sotto il titolo, con «Togli». Aggiungere resta nel modulo chiuso «Aggiungi un incantesimo a mano». Gli incantesimi dagli oggetti stanno nello stesso elenco con «(Artefatto)», «(Pergamena)» o «(Consumabile)» (meno posti dove cercare; il «Lancia!» apre il pannello dell'oggetto, con le sue regole); i Guanti, che i manuali non legano a un Incantesimo (A.175), restano a parte in «Proprietà attive degli oggetti». I conti non cambiano. Anche la stampa li mostra, con «(Aggiunto)».
- **Costi della scorciatoia «Medita»** (verificati nel codice): rapporto dai Talenti ✓ già applicato; Addestramento Taumaturgo, contatto e sintonizzazione = erano solo un avviso, ora la conferma passa dal «Procedi comunque» con riga nel registro; AzP = era solo nel testo, ora riga «Azione 1 AzP» nel conto; limite di ore giornaliere ✓ già applicato; Prova di Potere dal secondo gruppo = aveva «Successo» di comodo, ora l'esito va indicato e senza la conversione non si applica.
