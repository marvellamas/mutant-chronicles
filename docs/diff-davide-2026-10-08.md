# Aggiornamento cumulativo di Davide (08/10 sera): lotti di lavoro

Controllo del 09/10/2026 (procedura di `docs/manuali-drive.md`). Sono cambiati quattro Doc:
- **E&L**, versione dell'08/10 alle 21:10: blocco nuovo «Aggiornamento cumulativo — risposte tecniche approvate».
- **per-davide.md**, versione dell'08/10 alle 21:10: lo stesso blocco in coda alla sezione 7, più A.147–A.150 incollate nella sezione 2.
- **Manuale della Magia**, versione dell'08/10 alle 21:33: nuovo §27 «Artefatti consumabili».
- **Manuale dell'Equipaggiamento**, edizione 0.6 dell'08/10 alle 13:24.

Testi salvati in `docs/manuali-txt/` (Magia ed Equipaggiamento), in `docs/risposte-master-2026-09-26.md` (E&L) e in
`docs/per-davide.md`. Le risposte sono le decisioni 139–155 di `docs/risposte-master.md`; la domanda nuova è la A.151.

Le stime sono in prompt di lavoro, cioè sessioni come questa, comprese prove e documenti.

| Lotto | Contenuto | Stato | Stima |
| --- | --- | --- | --- |
| 1. Mappa | A.136 (Passo → Corsa/Scatto sulla mappa), A.137, A.138, A.139, A.140, A.141/A.144, A.142, A.143, A.148, A.149, A.150 | **fatto il 09/10** (un commit per risposta) | — |
| 2. Combattimento | A.136: tabella della Prova facoltativa di Atletica (penalità personale e agli attacchi contro, per esito) in «Attacca!» e nella tab Combattimento, al posto delle penalità fisse di Corsa e Scatto | **fatto il 09/10** (`regole.json` → `attacco_distanza.movimento.prova_atletica`, `/api/movimento-round`; pacchetto `docs/pacchetto-per-davide-2026-10-09-combattimento.md`) | — |
| 3. Armi | A.135: 2 cartucce per AzP (4 con Ricarica Migliorata) per tamburi e serbatoi interni; carichini da 6 colpi (2 voci nuove, dati mancanti → A.151); Ricarica Rapida (una ricarica gratuita per Round); modelli HD14M, SA SG2001, Airbrush, Mandible | **fatto il 09/10** (`tools/lotti/lotto_ricarica_a135.mjs`; pacchetto `docs/pacchetto-per-davide-2026-10-09-armi.md`) | — |
| 4. Magia: Anticipazione | A.109: regola comune (un aspetto, un gradino, PM base ×2, Prova di Potere obbligatoria di una categoria più difficile) e i 32 aspetti con i gradini al posto dei 32 `TODO(Davide)` di `incantesimi.json`; riquadro dell'Anticipazione in «Lancia!»; verifica di A.20 (Chroma bianco solo a chi ha accesso alla magia) | **fatto il 09/10** (`tools/anticipazione_approvate.json`, `regole.json` → `chroma.conversione.prelievo`; pacchetto `docs/pacchetto-per-davide-2026-10-09-anticipazione.md`) | — |
| 5. Magia §27: Artefatti consumabili | campo Riutilizzabile/Consumabile, SnT 0 e niente sintonizzazione, Cariche sigillate, quantità e «Usa» (una scheda in due viste: Artefatti e Consumabili), tabella dei costi per Grado I–VI, PM = 3 × Grado + costo base, 6 pergamene del campionario; tab Artefatti, Inventario, SS | **fatto il 09/10** (parte 1, dati e scheda: `tools/lotti/lotto_magia_27_consumabili.mjs`, `src/consumabili-mistici.js`, `src/ui/consumabili.js`, A.155, pacchetto `docs/pacchetto-per-davide-2026-10-09-magia27.md`; parte 2, «Crea consumabile» e SS: A.156, A.157, pacchetto `docs/pacchetto-per-davide-2026-10-09-magia27-parte2.md`) | — |
| 6. Equipaggiamento 0.6 | circa 20 voci nuove (navigatore inerziale, decontaminanti, estintori, nastro, toppe, schiuma, tuta extraveicolare, riparo pressurizzato, calzature magnetiche, modulo di cifratura, rilevatore di sorveglianza, utensile laser, analizzatore alimentare), 7 righe della tabella NEC, dosi e bombole come risorse separate, effetti con le frasi del manuale, testo del §4.1 | **fatto il 09/10** (`tools/lotti/lotto_equipaggiamento_edizione06.mjs`: 18 voci, A.154; pacchetto `docs/pacchetto-per-davide-2026-10-09-equipaggiamento.md`) | — |
| 7. Altro | A.122 Aiuto-master (permessi sul server, tablet: muovere il PG del turno attivo, vista giocatori: **fatta il 09/10**, pacchetto `docs/pacchetto-per-davide-2026-10-09-aiuto-master.md`); A.111 Pablo (la perdita di 2 UMN si toglie sulla copia del suo file: a mano, PG reali intoccabili; testo del `TODO(Davide)` di `regole.json`); A.112 nessuna azione; A.35 (l'eccedenza degli armamenti ceduti torna in crediti: **fatta il 09/10** nel lotto «equipaggiamento») | da fare | 1 |

**Rinviati da Davide** (i `TODO(Davide)` restano):
- A.113, A.115;
- parte dei veicoli di A.125, A.126, A.133, A.145–A.147;
- tabella per tipo e altezza degli ostacoli di A.140;
- origine del cono per le creature grandi (A.138, con le taglie).

## Lotto 1, mappa: com'è stato applicato

Ogni risposta ha il suo commit. I valori stanno in `data/mappa.json`, dove i `TODO(Davide)` risolti sono tolti; per ogni voce la decisione corrispondente di `docs/risposte-master.md`.

- **A.136 (decisione 140):** `movimento.blocco_dopo_passo` vale true. Con un Passo già cominciato restano Corsa e Scatto, con i Q fatti contati nel blocco. La mappa non sa se il token ha già fatto un'AzP: lo controlla il master, che può usare «Libero».
- **A.137, A.139, A.140, A.149 (decisioni 141, 143, 144, 149):** confermano il provvisorio. Tolti i `TODO(Davide)`, scritte le decisioni nelle note.
- **A.138 (decisione 142):** il cono ha il vertice al centro del Q di chi lo usa e parte largo 0 (`template.cono_vertice` «centro», `cono_larghezza_iniziale` 0). Il Q d'origine resta escluso.
- **A.141/A.144 (decisione 145):** `visuale.token_in_mezzo` vale «interposta».
  - Una creatura sulla linea di tiro propone in «Attacca!» «Creatura interposta» a −2, una volta sola, senza seconda Prova (`regole.json` → `attacco_distanza.interposta`).
  - «Bersaglio impegnato» (−4 e seconda Prova) resta un interruttore a mano.
  - I token non sono più ostacoli della Copertura.
- **A.142 (decisione 146):** `luci.raggio_scoperta_q` è { Luce: nessun limite, Penombra 10, Luce scarsa 5, Buio 0 }; al buio si vede solo la propria pedina.
- **A.143 (decisione 147):** sensi speciali sui token dei PG (`luci.sensi`). Quando sono accesi dal menu del token, allargano la nebbia automatica entro la portata, nelle luci in cui funzionano; muri e porte chiuse li fermano.
- **A.148 (decisione 148):** in volo valgono Copertura e creatura interposta come a terra (`volo.linea_di_tiro`: niente coperture annullate, nessun token ignorato). Il master corregge per le quote.
- **A.150 (decisione 150):** `volo.visibile_oltre_nebbia` vale false: un token in volo si vede con le stesse regole di quelli a terra.
- **A.122 (Aiuto-master)** riguarda anche la mappa ma è una funzione nuova (permessi sul server, tablet che muove il PG del turno attivo): lotto 7.

Pacchetto per il Doc: `docs/pacchetto-per-davide-2026-10-09.md`.

## Lotto 5, Magia §27: com'è stato applicato (parte 1, 09/10)

- **Dati** (`data/equipaggiamento/artefatti.json`, lotto `tools/lotti/lotto_magia_27_consumabili.mjs`):
  - `consumabili`: SnT 0, Cariche Esclusive sigillate, consumo al completamento, supporto standard (25 cr, Semplice, 4 ore),
    PM = 3 × Grado di lavoro + PM sigillati, Magistrale (dimezza per eccesso PM di lavoro e reagenti), tabella del §27.2 con
    i livelli della versione del §24.2;
  - le sei pergamene del §27.3, tipo «artefatto», famiglia e tipologia «Consumabili», catalogo Commerciale, prezzo di vendita
    della tabella, creazione in `creazione_cr`; peso vuoto con `TODO(Davide)` A.155.
- **Motore** (`src/consumabili-mistici.js`): costi di creazione (esempio di Cura Ferite 3 come test), attivazione (1 AzP in
  un Round; 10 minuti e 3 ore fuori dal combattimento), «Usa» che toglie un esemplare dalla quantità dell'Inventario e
  toglie la voce con l'ultimo. I Consumabili non entrano nella sintonizzazione né fra i contenitori di Chroma: i PM
  sigillati non sono una riserva del PG (A.20 e A.112 invariate).
- **Scheda** (`src/ui/consumabili.js`): sottocategoria «Consumabili» nella tab Artefatti (effetto, PM sigillati, costi di
  creazione, «Usa»); «Usa» anche nella riga dell'Inventario e, per le attivazioni in AzP, nella tab Combattimento.
  «Attivazione completata» consuma e registra l'effetto a durata fra gli «Incantesimi in corso» (Arma e Armatura Mistica
  5 RND; Individuare a scelta 5 RND o Concentrazione fino a 10 minuti); «Interrotta» non consuma.
- **Validatore**: tabella coerente (creazione = supporto + reagenti, vendita = doppio, livelli contigui 1–18), Grado
  coerente con il livello, Incantesimo e versione esistenti, PM sigillati della versione, prezzo, creazione e REP del Grado,
  SnT 0 senza riserva.
- **Parte 2** (09/10, fatta):
  - **«Crea consumabile»** nella tab Artefatti (sezione Consumabili): Incantesimo e versione fra quelli conosciuti fino al
    livello massimo (oppure tutti, se la versione la conosce un altro partecipante presente, §24.1); Officiante con
    Ritualista Minore (Gradi I–III) o Maggiore (IV–VI); supporto: pergamena standard (25 cr, Semplice) o altro supporto
    con costo e complessità della ricetta (§24.4). Le tre fasi del §24 con la Prova, la penalità e l'esito indicato dal
    giocatore: progetto già disponibile (anche magistrale, +2 a Tecnologia) o Prova di Artefatti (§24.3: tempo e risorse
    per Grado, anche se fallisce); supporto con Tecnologia (§24.4: nuovo tentativo dopo un Fallimento con metà tempo e
    25% di materiali); infusione con Rituali (§24.5: penalità e durata del Grado, Canali con PM e aiuto fino a +5, +2 dal
    supporto magistrale). Reagenti e PM del §27.2 (3 × Grado + sigillati; Magistrale dimezza lavoro e reagenti);
    Fallimento e Maldestro consumano PM e reagenti, l'interruzione solo i reagenti. «Registra la creazione» scala crediti
    e PM personali e, se l'infusione riesce, mette il Consumabile nell'Inventario. Dati in `artefatti.json` →
    `consumabili.supporti` e `consumabili.creazione`; motore `pianoCreazione` e `applicaCreazione`.
  - **Consumabile creato**: Artefatto personalizzato con `consumabile: { incantesimo, livello, supporto }`; Grado, PM
    sigillati, Chroma della macrofamiglia, attivazione ed effetto vengono dall'Incantesimo (`consumabileCreato`); «Usa»,
    interruzione ed effetto in corso come le pergamene del campionario.
  - **SS**: riquadro «Consumabili mistici» nel foglio Inventario (Incantesimo e versione, Grado, PM, attivazione,
    esemplari a quadratini).
  - Domande: A.156 (PM consumati dall'infusione fallita), A.157 (schede «Rituale: non consentito»).

## Lotto 7, A.122 Aiuto-master: com'è stato applicato (09/10)

- **Assegnazione:** nella lista «Tablet collegati» della plancia, accanto a ogni tablet collegato, «Rendi Aiuto-master»
  (con uno scontro aperto) e «Revoca». Il server ne tiene uno solo, in memoria: assegnarlo a un altro lo toglie al
  precedente; vale per lo scontro in cui è stato dato e si perde alla sua chiusura o al riavvio del server. La lista c'è
  anche con il server in --solo-locale.
- **Permessi sul server** (`src/mappa/aiuto-master.js`, `server.mjs`): il tablet dell'Aiuto-master firma le richieste con
  il gettone del ruolo; il server ammette le letture, la linea di tiro e il movimento del PG del turno attivo, rifatto con
  gli stessi controlli del tablet del giocatore (area, Q, muri, porte, quadretti occupati, nebbia, blocco del master);
  ogni altra scrittura (schede, scontro e Iniziativa, scena, nebbia, luci, nemici, veicoli, ruoli, salvataggi) riceve 403
  con «L’Aiuto-master può soltanto muovere il PG del turno attivo: modificare … spetta al Direttore». Un PG non di turno
  o un nemico di turno: rifiuto. Il tablet del giocatore di turno continua a muovere il proprio PG.
- **Vista:** la vista dei giocatori (niente nascosti, niente sotto la nebbia, niente note del Direttore); in più il blocco
  del PG di turno (permesso, area e ZoC filtrate, senza la sua mini-scheda) e il pulsante «Muovi <PG>» / «Torna al mio PG».
- **Registro:** «Mappa: <PG> mosso da Aiuto-master (tablet di <nome>): N Q (Passo)»; il Ctrl+Z del master lo toglie con il
  movimento.
- Restano nel lotto 7: A.111 (Pablo, a mano sulla copia del file) e A.112 (nessuna azione).

