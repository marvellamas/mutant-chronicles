# Pacchetto per il Doc «per-davide.md» — 15 ottobre 2026

Questo pacchetto va applicato nel Google Doc «per-davide.md» (`1Jg5rqbBtcHGE1E10xYElO_qCDCwh8K87LAInovtpF6A`).
Lo applica Cowork o Marcello, seguendo `docs/protocollo-davide.md` §5. Claude Code non scrive nei Google Doc.

- **Otto voci da spostare dalla sezione 2 («Domande aperte») alla sezione 3 («Risposte ricevute, in
  implementazione»):** A.113, A.115, A.126, A.133, A.145, A.146, A.147, A.158, A.159 — una riga ciascuna, qui
  sotto. Le risposte per esteso sono già nella sezione 7 e non si toccano.
- **Cinque voci nuove fra le aperte:** A.160, A.161, A.162, A.163, A.164.
- L'ultima domanda passa da A.159 ad **A.164**.

Fonti: sezione 7 del Doc (15/10 13:25), E&L (14/10 12:25), manuali del 15/10;
ricognizione in `docs/diff-davide-2026-10-15.md`.

---

```
*** DOC per-davide.md — voci A.113, A.115, A.126, A.133, A.145, A.146, A.147, A.158, A.159
*** AZIONE: sposta le nove voci dalla sezione 2 alla sezione 3 («Risposte ricevute, in implementazione»),
*** sostituendo il testo della domanda con la riga qui sotto

--- TESTO ---
A.113 — Veicoli: permessi, sincronizzazione e denominazioni. RISPOSTA RICEVUTA (approvata il 15/10/2026), in implementazione. Il Direttore modifica tutti i veicoli della campagna, compresi quelli personali dei PG, e la proprietà resta al personaggio; senza collegamento al server il veicolo condiviso è in sola lettura e si consulta l’ultima copia; le denominazioni ufficiali sono Corpo principale, Propulsione e Motore. Nell’app i tre nomi sono già quelli giusti: restano da applicare i permessi definitivi e la sola lettura senza server.

A.115 — Capacità specifiche dei nemici. RISPOSTA RICEVUTA (approvata il 15/10/2026), in implementazione. L’app deve mostrare la descrizione completa della capacità e gestire Prove, costi in Azioni, consumo di risorse e limiti d’uso previsti dal profilo; le passive non costano Azioni solo se dichiarate tali; non si assegnano costi o effetti per analogia quando mancano i dati (Mostri §§3.1–3.2).

A.126 — Ingombro delle creature e campo Spazio. RISPOSTA RICEVUTA (approvata il 15/10/2026), in implementazione. La scheda ha un campo per lo spazio occupato in Q (1 × 1, 2 × 2, 3 × 3), preso dal profilo e non dedotto dalla Taglia; serve a rappresentare la pedina e a verificarne passaggio e posizionamento, e resta distinto dalla portata (A.133). L’origine dei coni è completata dalla risposta integrativa A.126–A.138 del 15/10.

A.133 — Portata delle creature grandi. RISPOSTA RICEVUTA (approvata il 15/10/2026), in implementazione. Si usa la portata del singolo attacco, misurata attorno all’ingombro della creatura e non dal solo centro della pedina; occupare 2 × 2 o 3 × 3 Q non porta automaticamente la portata a 2 o 3 Q. Restano le normali condizioni per controllare una zona e per gli Attacchi di Opportunità.

A.145 — Azioni sui veicoli. RISPOSTA RICEVUTA (approvata il 15/10/2026), in implementazione. Il veicolo si muove all’Iniziativa del conducente; salire e scendere 1 AzP ciascuno, prendere i comandi 1 AzP, avviare un mezzo predisposto 1 AzP, condurre 1 AzM per Round, manovra complessa volontaria +1 AzP; la guida ordinaria non richiede Prove. La tabella approvata comprende auto e moto, imbarcazioni, remi, vele, velivoli e astronavi. Nell’app sarà una tabella consultabile con promemoria, senza conteggio automatico delle Azioni.

A.146 — Veicoli e Attacchi di Opportunità. RISPOSTA RICEVUTA (approvata il 15/10/2026), in implementazione. Sostituisce il provvisorio «no in entrambi i casi»: un veicolo che esce dalla portata di un nemico può provocare un Attacco di Opportunità, con bersaglio il mezzo o un occupante esposto e raggiungibile; una sola occasione per nemico per ciascun passaggio; l’attacco non arresta automaticamente il movimento.

A.147 — Curve, rotazioni e posizionamento a 45°. RISPOSTA RICEVUTA (approvata il 15/10/2026), in implementazione. Curva ordinaria compresa nell’AzM; Sterzata stretta +1 AzP e Pilotare −2; Inversione rapida +1 AzP e −4; rotazione sul posto solo per i mezzi che ne sono capaci. Nessuna soglia angolare universale e nessun costo automatico «1 Q ogni 45°». L’app deve permettere gli otto orientamenti a 45°, anche in diagonale, controllando l’ingombro nell’orientamento effettivo: oggi ruota a passi di 10° e i 45° esatti non si ottengono.

A.158 — CyberArma: parametri mancanti. RISPOSTA RICEVUTA (approvata il 13/10/2026), in implementazione. Modello originale: Artefatto TecnoMistico di Grado I, SnT 1, Qualità Non Comune, PS Integrità 12, 4 PI, 0,5 kg, Reperibilità Epica, senza prezzo di catalogo. Custode 1 PM per 15 Round e +1 danno; Tecnomante 2 PM per 10 Round, 1d8 Magico; altre Classi soltanto con la batteria e a −2 VA. Configurazione con Batteria Verde da 5 cariche: Grado II, SnT 2, 0,7 kg, una carica per attivazione, saldo in cariche e non in PM. Costruzione e modifica con costi, tempi e Prove indicati. Il §7.25 del Manuale degli Armamenti non riporta ancora questi dati: vale la risposta.

A.159 — «Oltre Grave» dà penalità? RISPOSTA RICEVUTA (approvata il 14/10/2026), in implementazione. Superando Grave il personaggio entra in Morente: mantiene −8, sviene automaticamente e apre un contatore di Round pari alla COS intera, che cala di 1 per Round e di 1 per ogni nuova Ferita; a 0 muore. Una cura che stabilizza riporta a Grave e disattiva il contatore. Sono approvate la Stabilizzazione d’emergenza (Medicina −2, 2 Round), la modalità d’emergenza di Guarigione (3 PM, 1 AzP), la Cartuccia Stabilizzante (2.000 cr, MR) e l’intervento dell’UMC Automatica al termine dell’intero attacco. Questa risposta supera la decisione provvisoria di Marcello del 13/10 («oltre Grave vale come Grave, morte come avviso»), che resta applicata nell’app fino al recepimento.
```

---

```
*** DOC per-davide.md — voci A.160…A.164 (NUOVE)
*** AZIONE: aggiungi le cinque voci in coda alla sezione 2 («Domande aperte»)

--- TESTO ---
A.160 — Punti Abilità liberi nel Manuale dei Mostri (Mostri 0.3, §5.2). Il paragrafo sulla taratura degli avversari umani dice «5 punti Abilità liberi a ogni Grado, compreso il primo», mentre la regola approvata per i personaggi è 7 (A.90, decisione 92 del 04/10/2026, confermata dal Giocatore del 03/10 sera). È un refuso rimasto dalla 0.1, oppure gli avversari umani costruiti come PG seguono una taratura diversa? Nel frattempo: l’app applica 7 punti per Grado a tutti, personaggi e avversari umani.

A.161 — GS e PX del Manuale dei Mostri 0.3 e bestiario dell’app. Le quindici schede del capitolo 8 riportano «GS e PX per 4 PG» con la scala Principiante (10–11 PX), Inesperto (20), Esperto (30–33), Veterano (50), Eroe (70) e Leggenda (100, con modulo tana). Il bestiario proposto dell’app usa invece i cinque gradi Minore, Semplice, Medio, Potente e Molto potente, tarati su un gruppo di 7 PG (A.97). Le due scale vanno unificate, e in tal caso quale prevale? I PX vanno calcolati anche per i nemici creati con «Crea nemico» e per quelli convertiti da un PG? Nel frattempo: le due scale restano distinte e l’app non calcola PX.

A.162 — Oggetti indistruttibili (Equipaggiamento §10.12, Magia §28.2). Lo Scrigno del Primo Giuramento «non perde PI e il danneggiamento non consente di forzarlo». Nell’app ogni oggetto tracciato ha PI massimi e PS Integrità: lo Scrigno si registra semplicemente senza PI, con una nota, oppure conviene prevedere un valore «indistruttibile» utilizzabile anche per altri oggetti futuri (per esempio i Sigilli)? Nel frattempo: nessun PI e una nota nella scheda.

A.163 — Schermatura dei Contenitori del Silenzio (Equipaggiamento §10.13, Magia §28.3). La schermatura della Corruzione 1 vale «quando il contenuto è interamente riposto e il contenitore è chiuso e integro». L’app deve tenere uno stato «chiuso / aperto» per ciascun contenitore, con l’effetto corrispondente sulla Corruzione, oppure basta un promemoria nella scheda dell’oggetto? Oggi la Corruzione trasmessa dagli oggetti non è modellata: ci sono solo lo Stato di Corruzione del personaggio (§5.20) e le note delle schede. Nel frattempo: promemoria, senza stato.

A.164 — Morente e i nemici (A.159). La risposta su Morente, contatore e stabilizzazione parla dei personaggi. Vale anche per i nemici del Tavolo del Master, che nell’app hanno già Ferite e Menomazioni, oppure per loro resta la morte al superamento di Grave? E le creature del Manuale dei Mostri con COS non indicata? Nel frattempo: nessun contatore per i nemici, come oggi.
```

---

## Nota per Marcello (non va nel Doc)

La A.159 supera la decisione presa il 13/10 e applicata in `data/regole.json` → `ferite.oltre_penalita_come`.
Finché non si fa il lotto 1 l'app resta com'è (−8 oltre Grave e avviso della morte): è il comportamento più
vicino alla risposta fra quelli disponibili oggi.
