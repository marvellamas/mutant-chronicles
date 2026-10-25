# Pannello «PX della partita» — prima e dopo (25/10/2026)

Dopo la prova vera di Davide del 24/10. Un commit per punto, tutti su `main`.

| Punto | Prima | Dopo |
|---|---|---|
| A. Salvataggio | Ogni tasto una `PUT` senza ordine; il giro di 3 s sostituiva `stato.db` con la copia del server (anche una lettura partita prima del salvataggio); la migrazione dei giocatori scriveva la copia appena letta. I dati si perdevano; cambiare scheda «aiutava» solo perché ridisegnava. | `src/px-archivio.js`: modifiche → salvataggio dopo 0,5 s, una richiesta alla volta (ripetuta se c'è altro da scrivere o se la rete cade), subito alla chiusura della pagina, «Salvato ora» nel pannello; il giro non sostituisce mai l'archivio con modifiche da scrivere né con una lettura vecchia. Il server copia `px.json` in `px/storico/` prima di ogni scrittura. |
| B. Voto base | Le tre categorie partivano a 1 (`voti.min`). | Partono a 3 (`voti.default`, validato in `src/validate.js`). |
| C. PX degli incontri | Nessun campo: solo l'importazione da uno scontro dava un numero. | «PX dell'incontro (per 4 PG)» per incontro, o nemici con PX / quantità / principale; il totale a testa è sotto «Incontri e loro PX». |
| D. Premio di Atto | Un'unica casella per partita, valida per i presenti; l'avviso «già dato» contava solo i presenti in entrambe. | Premio per giocatore, anche agli assenti; traccia per Atto da qualunque partita e in Archivio; avviso per Atto e giocatore. Compatibile col vecchio `premioAtto: true`. |
| E. Livello | Nessun avviso. | «↑ liv N» nella riga, nella conferma e dopo l'assegnazione; non blocca. |
| F. Tablet | `scelte.puntiEsperienza` accodabile dal tablet e scrivibile da un salvataggio normale. | Nessuna operazione dal tablet, scartata se arriva, protetta dal server, sola lettura nella scheda del tablet. |

Prove: `tests/px-archivio.test.js`, `tests/px-tablet.test.js`, aggiunte a `tests/px-partita.test.js`, `tests/px-partita-ui.test.js`, `tests/px-server.test.js`; nel browser con due giocatori su cartelle temporanee (porta 3017).
