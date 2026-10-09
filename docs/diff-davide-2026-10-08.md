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
| 2. Combattimento | A.136: tabella della Prova facoltativa di Atletica (penalità personale e agli attacchi contro, per esito) in «Attacca!» e nella tab Combattimento, al posto delle penalità fisse di Corsa e Scatto | da fare | 1 |
| 3. Armi | A.135: 2 cartucce per AzP (4 con Ricarica Migliorata) per tamburi e serbatoi interni; carichini da 6 colpi (2 voci nuove, dati mancanti → A.151); Ricarica Rapida (una ricarica gratuita per Round); modelli HD14M, SA SG2001, Airbrush, Mandible | **fatto il 09/10** (`tools/lotti/lotto_ricarica_a135.mjs`; pacchetto `docs/pacchetto-per-davide-2026-10-09-armi.md`) | — |
| 4. Magia: Anticipazione | A.109: regola comune (un aspetto, un gradino, PM base ×2, Prova di Potere obbligatoria di una categoria più difficile) e i 32 aspetti con i gradini al posto dei 32 `TODO(Davide)` di `incantesimi.json`; riquadro dell'Anticipazione in «Lancia!»; verifica di A.20 (Chroma bianco solo a chi ha accesso alla magia) | da fare | 1–2 |
| 5. Magia §27: Artefatti consumabili | campo Riutilizzabile/Consumabile, SnT 0 e niente sintonizzazione, Cariche sigillate, quantità e «Usa» (una scheda in due viste: Artefatti e Consumabili), tabella dei costi per Grado I–VI, PM = 3 × Grado + costo base, 6 pergamene del campionario; tab Artefatti, Inventario, SS | da fare | 2 |
| 6. Equipaggiamento 0.6 | circa 20 voci nuove (navigatore inerziale, decontaminanti, estintori, nastro, toppe, schiuma, tuta extraveicolare, riparo pressurizzato, calzature magnetiche, modulo di cifratura, rilevatore di sorveglianza, utensile laser, analizzatore alimentare), 7 righe della tabella NEC, dosi e bombole come risorse separate, effetti con le frasi del manuale, testo del §4.1 | da fare | 1–2 |
| 7. Altro | A.122 Aiuto-master (permessi sul server, tablet: muovere il PG del turno attivo, vista giocatori); A.111 Pablo (la perdita di 2 UMN si toglie sulla copia del suo file: a mano, PG reali intoccabili; testo del `TODO(Davide)` di `regole.json`); A.112 nessuna azione; A.35 (l'eccedenza degli armamenti ceduti torna in crediti, oggi persa: `src/dotazioni.js`) | da fare | 1 |

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
