# Il passaggio ai Talenti nuovi sull'installazione vera — diagnosi e correzione (25/10/2026, sera)

Marcello, sul fisso (`DESKTOP-LVKJEOM`, `F:\REPOS\mutant`), dal menu di `Mutant.bat`:
1. ha aperto un personaggio non toccato: il riquadro chiedeva solo la Specializzazione;
2. voce 8 con SI, poi voce 7 con SI, poi ha aperto un altro personaggio: uguale;
3. di nuovo voce 8, poi ha aperto un personaggio: uguale.

I test erano verdi perché giravano sulle copie pulite di `tests/fixtures/talenti-vecchi/`: un file per personaggio, mai
riscritto. Prima di tutto, copia di tutte le cartelle di personaggi del fisso:
`F:\backup-personaggi-fisso\personaggi-prima-della-diagnosi_2026-10-25_175633.zip` (anche `distribuzione\mutant\personaggi`).

## A. Le risposte

**Su quali file scrivono la voce 7 e la voce 8, e da dove legge il server.** Tutti sulla stessa cartella,
`F:\REPOS\mutant\personaggi\` (il server usa `<cartella di Mutant>\personaggi`; `config-salvataggi.json` non sceglie la
cartella dei personaggi, `COPIA-DI-LAVORO.txt` è solo un'etichetta). Cambiava invece **quale file** di un personaggio
ognuno considerava «l'attuale»:

| Chi | Come sceglieva il file attuale (prima di oggi) |
|---|---|
| server (`GET /api/personaggi`, `ultimiPerPg`) e app (`fileDelPg`) | per identificativo, la data di modifica più recente |
| voce 7 (`tools/migra-talenti.mjs`) | nessuno: passava **ogni file** per conto suo («BOTHA PRETORIUS, BOTHA PRETORIUS, LUCAS, LUCAS…») |
| riga del menu (`statoPassaggio`) | «passato» se lo era **almeno uno** dei suoi file |
| voce 8 | riscriveva tutti i file dello zip **nello stesso millisecondo**: l'attuale lo decideva l'ordine in cui Windows elenca la cartella |

Lo storico (`personaggi\storico\`) non è mai letto come personaggio. Le risposte dell'API hanno `Cache-Control: no-cache`,
e la scheda aperta si ricarica da sola quando il file cambia («Questa scheda è stata aggiornata»): provato sul fisso.

**I file di ogni personaggio, al momento della diagnosi (17:56)** — tutti con `regimeTalenti = 2`, nessun `talentoLibero`
nei livelli, nessuna Specializzazione iniziale: lo stato del passaggio delle 17:48.

| Personaggio | File | L'attuale |
|---|---|---|
| Botha Pretorius | 1 | `BOTHA-PRETORIUS_liv6_2026-10-16.json` |
| Dimitri Orlav | 1 | `Dimitri-Orlav_liv6_2026-10-04.json` |
| Duncan McDuff | 1 | `DUNCAN-MCDUFF_liv6_2026-10-07.json` |
| Lucas | 2 | `_2026-10-20` e `_2026-10-25`, **stessa data di modifica (17:48:19)**: decideva il millisecondo |
| Michele Giorgetti | 2 | `_2026-10-11` e `_2026-10-25`, stessa data di modifica |
| Oshi Nagata | 1 | `OSHI-NAGATA_liv6_2026-10-07.json` |
| Pablo Zaion | 2 | `Pablo-Zaion_liv6_2026-10-25.json`, riscritto alle 17:48:28 da una scheda aperta nel browser |

La cronologia, dagli zip in `F:\REPOS\mutant\salvataggi\`: 16:57 primo passaggio; 17:46 e 17:47 due ripristini (voce 8);
17:48 di nuovo il passaggio (voce 7). **Del terzo passo (la seconda voce 8) non c'è traccia**: nessuna copia
«prima-del-ripristino» dopo le 17:48, che ogni voce 8 riuscita lascia. Quel ripristino non è partito: per questo le schede
erano ancora nei Talenti nuovi.

**Perché «solo la Specializzazione».** Con un personaggio passato (i file erano tutti così, ai passi 1 e 2) il riquadro
dice «Da scegliere: 2 Talenti Liberi, 2 Maestrie, 2 Specializzazioni» e, aperto, comincia dal primo posto vuoto: la
Specializzazione del 1° livello. È lo stesso comportamento visto oggi sul fisso con un browser pulito. Un personaggio
senza `regimeTalenti = 2` **non** ha nessuna domanda, né nel riquadro né nei passi della creazione (entrambi legati a
`regimeTalenti = 2`): provato sul fisso dopo la voce 8, e ora con un test sulla cartella disordinata.

**I difetti veri, trovati sui file del fisso:**
1. tre modi diversi di trovare il file attuale (sopra);
2. il ripristino riscriveva tutti i file insieme: fra due file dello stesso personaggio, l'attuale poteva diventare quello
   vecchio;
3. **la trappola del ripristino che non cambia niente**: una voce 7 rifatta su personaggi già passati faceva comunque lo
   zip «prima-dei-talenti-nuovi» (dello stato *già passato*), e la voce 8 prende lo zip più recente: tornava al passaggio;
4. le voci 7 e 8 dicevano «Fatto» contando le scritture, senza guardare che cosa vedeva l'app.

## B. Le correzioni

- **Una funzione sola**: `src/cartella.js → fileAttuale` (e `confrontaAttuale`). Conta prima quando il server ha scritto
  il file (`aggiornato_il`, dentro il file: resta uguale dopo uno zip e un ripristino), poi la data di modifica, poi la data
  e il livello nel nome, poi il nome. La usano l'app (`fileDelPg`, `elencoUnito`), il server (`GET /api/personaggi`,
  `fileAttualeDelPg`, `trovaPg`), e il menu: voci 7, 8 e «Controlla lo stato» (`tools/stato-personaggi.mjs`).
- **Voce 7**: un personaggio una volta, il suo file attuale. Se sono già tutti passati, non fa niente (niente zip).
- **Voce 8**: torna dallo zip più recente che contiene davvero i Talenti di prima (`zipDaRipristinare`), mai da uno zip di
  uno stato già passato.
- La domanda sulla Specializzazione e il riquadro: già legati a `regimeTalenti = 2`; ora lo prova anche il test sulla
  cartella disordinata (un personaggio ripristinato non ha posti né domande).

## C. Il programma controlla il proprio lavoro

Dopo il SI, le voci 7 e 8 chiedono al server, per la stessa strada dell'app (`GET /api/personaggi`, poi il file attuale di
ognuno), come vede ogni personaggio, e scrivono:

```
 Controllato sul server: 7 personaggi su 7 con i Talenti nuovi.
 Fatto. Per tornare indietro: voce 8 del menu.
```

in verde. Se anche uno solo non torna: in rosso, con il nome, e «NON e' fatto: manda a Marcello il risultato della voce C
"Controlla lo stato"». Se Mutant è spento, per il controllo ne accendono uno solo per un momento sulla stessa cartella, e
lo dicono; se il server non risponde affatto, lo dicono in rosso e non scrivono «fatto». La voce 8 scrive «0 personaggi su
7 con i Talenti nuovi … Tutti di nuovo con i Talenti di prima».

## D. «Controlla lo stato» (voce C del menu)

In parole semplici: versione; se Mutant è acceso (e allora legge dal server) o spento (legge dalla cartella, con la stessa
scelta del file attuale); la cartella dei personaggi; per ogni personaggio quanti file ha, quale è l'attuale, Talenti
vecchi o nuovi (e quanti scelti); il passaggio e lo zip da cui torna la voce 8. Lo scrive anche in `stato-mutant.txt`, da
mandare a Marcello.

## E. Prova vera sul fisso (porta 3019, la cartella vera del fisso)

1. voce 7 con SI → «Controllato sul server: 7 personaggi su 7» → Lucas, Pablo, Duncan nel browser: tutti con «Da
   scegliere: 2 Talenti Liberi, 2 Maestrie, 2 Specializzazioni»;
2. voce 8 con SI, con la scheda di Duncan aperta → «0 personaggi su 7 … Tutti di nuovo con i Talenti di prima»; la scheda
   aperta si è aggiornata da sola; Lucas, Pablo, Duncan riaperti: nessuna domanda, Talenti di prima;
3. voce 7 di nuovo → 7 su 7 → Dimitri: tutti i posti, con Incrementare Incantesimi e i suoi 2 incantesimi, fino a
   «Talenti: tutti scelti»;
4. test automatico `tests/passaggio-cartella-vera.test.js`: più file per personaggio con la stessa data di modifica, uno
   solo scritto dal server, lo storico, `config-salvataggi.json`, voce 7 due volte, uno zip dello stato già passato, voce 8
   e di nuovo 7. Con il codice di prima falliva (10 «passati» invece di 7).

I personaggi del fisso restano passati ai Talenti nuovi, con Dimitri tutto scelto (sono copie: i veri sono sul PC di
Davide).
