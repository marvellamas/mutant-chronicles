# Un ingresso solo — 25/10/2026

Ordine di Marcello: «Un ingresso solo, a prova di bomba». Togliere confusione, non aggiungere funzioni. Pagina per chi
usa Mutant: `docs/come-si-usa-mutant.md`. Nessuna regola di gioco cambia.

## Prima e dopo

| | Prima | Dopo |
|---|---|---|
| **Programmi da aprire** | `Mutant.bat` più sette `.bat` separati (`avvia.bat`, `salva-sessione.bat`, `crea-collegamento.bat`; nel pacchetto `2_installa_node`, `3_avvia`, `4_controlla_personaggi`, `5_passa_ai_talenti_nuovi`) | solo `Mutant.bat`: dieci voci (1–9, 0), ognuna con una riga che dice che cosa fa; 6, 7, 8 chiedono SI. Il primo aggiornamento toglie i `.bat` numerati dal PC di Davide. |
| **Aggiorna** | finiva in silenzio; con lo zip si usava un altro programma | voce 2 per tutti: «Copia di sicurezza … fatta», poi «Aggiornato: prima eri alla versione del 22/10, ora sei a quella del 25/10 (Talenti nuovi).» o «Era gia' aggiornato». Con Git: branch, e stop con modifiche non salvate. |
| **Finestra di Esplora risorse sui salvataggi** | si apriva «da sola» durante le prove | la apre solo la voce 5, che lo scrive prima; un test controlla che nessun passo dell'aggiornamento o dell'avvio la apra |
| **Che PC è questo** | `COPIA-DI-LAVORO.txt` scritto a mano, nella cartella (un aggiornamento da zip può perderlo) | domanda una volta sola dal menu («PC del Direttore (originale)» / «copia di prova»), salvata nel profilo di Windows; nome del PC letto da Windows; fascia «Copia di prova su <PC> — i personaggi veri sono sul PC del Direttore» solo sulle copie. Senza risposta, tutto come prima. |
| **Versione** | un'impronta (`364f60a93f del 2026-10-25 14:18`) | «Versione del 25/10 · Talenti nuovi» nel menu e in fondo a ogni pagina dell'app (l'impronta resta nel tooltip) |

## Perché si apriva la cartella dei salvataggi

Nel codice una sola istruzione apriva Esplora risorse: la voce 5 del menu di `Mutant.bat` (allora «Apri la cartella dei
salvataggi», senza una riga di spiegazione). L'aggiornamento, rifatto su una copia da zero, non apre finestre. La
spiegazione più probabile: durante la prova generale sul fisso, la voce 5 è partita per un tasto (il menu risponde al
numero senza Invio, e `aggiorna.bat` riapre il menu alla fine). Ora la voce dice prima che cosa apre e dove, ed è
l'unico punto del programma che lo fa (`tests/menu.test.js`).

## Trovati nella prova sulle copie (e corretti)

- **Il ripristino dei Talenti lasciava due file per lo stesso personaggio.** Dopo il passaggio il server salva un PG in
  un file con la data del giorno; la voce 8 rimetteva il file di prima ma lasciava quello nuovo. Ora lo toglie (è nella
  copia «prima-del-ripristino-talenti»). `tests/migrazione-talenti.test.js`.
- **«Non è cambiato niente» anche quando lo zip era nuovo.** L'esito guardava solo l'impronta dei file dell'app; con
  cambiati solo menu o strumenti diceva «non è cambiato niente». Ora guarda anche lo sha dello zip o il commit di Git:
  «l'app resta alla versione del 25/10 (Talenti nuovi); sono cambiati solo i programmi di servizio».
- **Il ruolo dipendeva da come era scritto il percorso** (nome corto `BEASTM~1` o lungo): si usa il percorso reale.
- **La voce 6 non scriveva più `rapporto-personaggi.txt`**, come faceva il vecchio `.bat`: rimesso.
- Testi rimasti: «voce 6 Impostazioni» (ora 9), riferimenti a `avvia-server.bat` / `avvia.bat` nei messaggi dell'app e
  nei LEGGIMI, guida di Davide (`distribuzione/LEGGIMI.txt`) riscritta sul menu.

## Prova sulle copie (25/10)

Cartella finta del PC di Davide (pacchetto zip, Mutant del 22/10, sette PG copiati), GitHub finto in locale, profilo di
Windows finto, server su 3099:

1. il vecchio `1_scarica` aggiorna: i `.bat` numerati spariscono, il messaggio lo dice;
2. `Mutant.bat` all'apertura chiede il ruolo; con 1 il menu scrive «PC del Direttore (originale) · nome del PC»;
3. voce 2 (zip) tre volte: la copia di sicurezza, poi «Aggiornato…» / «Era gia' aggiornato»;
4. voce 7 con SI: zip di sicurezza, sette PG passati; il menu: «[Talenti nuovi: fatto il 25/10 alle 15:25 (7
   personaggi su 7)]»;
5. app sul server della copia: in fondo «Versione del 25/10 · Talenti nuovi», nessuna fascia; Pablo con «Da scegliere:
   2 Talenti Liberi, 2 Maestrie, 2 Specializzazioni», scelta «Specializzazione in Pistole» salvata;
6. voce 8 con SI, a server acceso: file identici a prima del passaggio (md5), il file nuovo di Pablo tolto; la scheda
   aperta nel browser torna da sola ai Talenti di prima e non riscrive niente.
