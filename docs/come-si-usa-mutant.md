# Come si usa Mutant

Dal 25/10/2026 Mutant ha **un ingresso solo**: `Mutant.bat`, nella cartella di Mutant, o il collegamento «Mutant»
sul desktop. Tutto il resto è una voce del suo menu. Gli altri `.bat` non si aprono a mano.

## Che cosa si vede all'apertura

La prima volta su un PC, una domanda sola:

```
 ==============================================================
  Una domanda, una volta sola: su questo PC non so ancora che ruolo ha.
 ==============================================================

 Che cosa e' questo PC?
   1. Il PC del Direttore: si gioca qui, e i personaggi di questa cartella sono quelli veri (PC del Direttore (originale)).
   2. Una copia di prova: serve a provare; i personaggi veri sono sul PC del Direttore.
   Nome di questo PC (letto da Windows): DESKTOP-LVKJEOM
 Scrivi 1 o 2 e premi Invio (Invio e basta = decidi un'altra volta):
```

- **1** sul PC dove si gioca: l'app non mostra nessuna fascia.
- **2** su ogni altra copia: in cima all'app compare «Copia di prova su DESKTOP-… — i personaggi veri sono sul PC del
  Direttore».
- **Invio e basta**: non si salva niente, la domanda torna la volta dopo e l'app si comporta come prima.

La risposta sta nel profilo di Windows (`%APPDATA%\Mutant\installazioni.json`, accanto alle impostazioni degli
avvisi), non nella cartella di Mutant: un aggiornamento non la tocca. Si cambia dalla voce 9.

Poi il menu:

```
 ==========================================================
   MUTANT - il programma di Mutant (tutto da questo menu)
 ==========================================================
 Versione: Versione del 25/10 - Talenti nuovi (e4258b71c1)
 Server: spento
 Questo PC: PC del Direttore (originale) - scelto il 25/10 - nome del PC: DESKTOP-LVKJEOM
 Avvisi: attivi - Backup su Drive: G:\Il mio Drive\Mutant
```

Si preme il numero, senza Invio. La stessa «Versione del 25/10 · Talenti nuovi» è scritta in piccolo in fondo a ogni
pagina dell'app.

## Le voci

| | Voce | Che cosa fa | Chiede SI? |
|---|---|---|---|
| **1** | Avvia Mutant | Accende il server nella sua finestra nera e apre il browser. Il menu resta libero. Se è già acceso, lo dice. | no |
| **2** | Aggiorna Mutant | Scarica la versione nuova (con Git o con lo zip, da sé). Prima scrive la versione di adesso e fa la copia zip dei dati («Copia di sicurezza … fatta»); dopo ricontrolla le cartelle e dice in chiaro: «Aggiornato: prima eri alla versione del 22/10, ora sei a quella del 25/10 (Talenti nuovi).» oppure «Era gia' aggiornato». Con Git dice il branch e, se ci sono modifiche non salvate, non aggiorna e le elenca. Non apre finestre. | no |
| **3** | Salva la sessione | Zip di personaggi, tavolo, scontri, mappe… in `salvataggi\` (e su Drive, se impostato). | no |
| **4** | Ripristina un salvataggio | Elenca i salvataggi di quattro posti; si sceglie il numero; prima fa una copia di com'è adesso. Se Mutant è acceso, si offre di spegnerlo. | S/N |
| **5** | Apri la cartella dei salvataggi | Apre Esplora risorse su `salvataggi\`. **È l'unica voce che apre una finestra di Esplora risorse.** | no |
| **6** | Controlla i file dei personaggi | Rapporto PG per PG (anche in `rapporto-personaggi.txt`); con SI mette i file vecchi in `personaggi\storico`. Non cancella niente. | **SI** |
| **7** | Passa ai Talenti nuovi | Rapporto PG per PG; con SI copia zip di `personaggi\`, poi a ogni PG toglie i Talenti di oggi (registro del master). Accanto alla voce: «[Talenti nuovi: non ancora fatto]» o «[Talenti nuovi: fatto il 26/10 alle 21:10 (7 personaggi su 7)]». | **SI** |
| **8** | Torna a com'era prima dei Talenti nuovi | Rimette i file dalla copia della voce 7 (prima ne fa un'altra di com'è adesso); toglie i file scritti dopo il passaggio, perché non restino due file per lo stesso personaggio. | **SI** |
| **9** | Impostazioni | Ruolo di questo PC, avvisi ntfy, cartella di Google Drive, notifica di prova, collegamento «Mutant» sul desktop. | — |
| **0** | Esci | Chiude il menu; se Mutant è acceso resta acceso. | no |

Se Node.js manca, `Mutant.bat` lo dice prima del menu e lo installa (con S).

## Dove sono finiti i vecchi programmi

| Prima | Adesso |
|---|---|
| `avvia.bat` (app senza server) | tolto; si usa la voce 1 (per chi sviluppa resta `npm start`) |
| `salva-sessione.bat` | voce 3 |
| `crea-collegamento.bat` | voce 9, poi 5 |
| `distribuzione\2_installa_node.bat` | `Mutant.bat` stesso, all'apertura, se Node.js manca |
| `distribuzione\3_avvia.bat` | voce 1 |
| `distribuzione\4_controlla_personaggi.bat` | voce 6 |
| `distribuzione\5_passa_ai_talenti_nuovi.bat` | voci 7 e 8 |
| `avvia-server.bat` | resta, ma lo apre la voce 1: è la finestra nera del server |
| `aggiorna.bat` | resta, ma lo usa la voce 2 |
| `distribuzione\1_scarica_o_aggiorna_app.bat` | resta come programma d'installazione per un PC nuovo; la voce 2 lo usa per le copie da zip |

Sul PC di Davide i quattro file numerati li toglie il primo aggiornamento (`tools/aggiorna-avviatori.mjs` →
`OBSOLETI`). Un collegamento sul desktop a uno di loro smette di funzionare: lo si cancella e si rifà con la voce 9.

## Per chi sviluppa

- Le voci stanno in `tools/menu.mjs`; le etichette in `Mutant.bat` (`:avvia`, `:aggiorna`, … `:esci`) e
  `tests/menu.test.js` controlla che ogni voce ci sia, che ogni funzione dei `.bat` tolti sia raggiungibile e che le
  voci che cambiano i personaggi chiedano SI.
- La versione in parole è `versioneInParole` di `src/versione.js`, con il titolo scritto a mano in `novita.json`
  (da cambiare quando c'è una novità da dire).
- Il ruolo è in `tools/ruolo-pc.mjs`; la fascia della copia di prova in `src/copia-di-lavoro.js` → `statoDaRuolo`.
  Senza ruolo vale il vecchio `COPIA-DI-LAVORO.txt`, se c'è.
- Il testo del menu e della console è senza lettere accentate: la console di Windows non è in UTF-8.
