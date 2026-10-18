# Lotto «PX della partita» del 16 ottobre 2026 — A.161

Calcolatore e assegnazione dei PX nel Tavolo del Master, approvati da Davide il 16/10/2026 (A.161). Riferimento
funzionale: il gestore di Davide `EROI_LEGGENDE_Gestore_PX v1.2` (scaricato da Drive in
`docs/riferimenti/EROI_LEGGENDE_Gestore_PX_v1_2.html`), **non codice da copiare**: i fattori sono allineati ai
manuali e alle decisioni vigenti, e quelli che non si possono confermare sono in A.170 (le fasce dei Titoli le ha corrette Davide il 18/10, A.168).

Principio di CLAUDE.md rispettato: **l'app non assegna mai PX da sola.** Niente a fine scontro, niente
sconfiggendo un nemico, niente ricalcolando. Si usa a fine partita, non durante il gioco.

## Regole che non si discutono (dalla risposta di Davide), come sono nell'app

- l'app non assegna PX da sola: il calcolatore propone, il Direttore decide;
- il Direttore vede per ogni giocatore le componenti e il **totale finale modificabile**; **solo** «Assegna PX
  della partita» aggiorna i PG; salvare la bozza o ricalcolare non assegna;
- il Direttore può scrivere direttamente il totale finale senza compilare le componenti;
- riaprire/correggere una partita **aggiorna** l'assegnazione precedente, non ne aggiunge una seconda; i totali
  delle schede sommano solo gli importi assegnati; il premio di fine Atto solo se disposto, una volta.

## Che cosa c'è ora

- **Dati** (`data/px_partita.json`): Titoli (Principiante…Leggenda) con fattore 1–6 e PX del GS, soglie dei
  livelli 1–20, Atti con limite di livello e premio, durata (lunga ×2 sui soli voti), incontro (principale
  100% / altri 50%, dotazione già compresa), correttivo per numero di PG. Validatore `validaPxPartita`.
- **Motore** (`src/px-partita.js`): livello e Titolo, limite d'Atto, correttivo dei PG, PX dell'incontro,
  componenti e totale suggerito, totale finale modificabile, delta e partita assegnata (la correzione
  sostituisce), riepilogo/classifica con PX mancanti e medie, CSV, import dell'archivio del vecchio gestore
  senza riassegnare.
- **Server** (`server.mjs`, `/api/px`): archivio in `px/px.json`, **solo il PC del master** lo legge e lo
  scrive (dai tablet 403). La cartella `px/` è fuori da git (LEGGIMI tracciato), nei backup di «Salva
  sessione», in `tools/file-locali.json` e fra le intoccabili di CLAUDE.md.
- **Tab** (`src/ui/px-partita.js`): «PX della partita» nel Tavolo, accanto a Galleria, solo sul PC del master.
  Nuova partita, componenti e totali, «Assegna» (Modifica master «diretta» su `scelte.puntiEsperienza`,
  registrata come «PX della partita del …»), archivio con «Modifica», riepilogo/CSV, impostazioni di
  campagna (Atto, PX iniziali, associazione giocatore–PG). I PX veri stanno sul PG.

## Come lo usa Davide a fine partita

1. Apre il Tavolo sul suo PC, scende alla tab **PX della partita**.
2. In **Impostazioni** (una volta): Atto corrente, PX iniziali comuni, e per ogni giocatore il suo PG.
3. **+ Nuova partita**: data, titolo, durata; per ogni presente i tre voti 1–5 e l'eventuale bonus; aggiunge
   gli **incontri** a mano o li importa dai nemici dello scontro della serata; spunta il premio di fine Atto se
   lo dà.
4. Guarda il **totale suggerito** di ciascuno, lo corregge se vuole (totale finale), poi **Assegna PX della
   partita**: l'app aggiorna i PX dei PG presenti e scrive la Modifica master.
5. Se poi corregge i voti e ri-assegna, l'app applica **solo la differenza**.

**Esempio (provato nel browser, porta 3017, copie dei PG).** Partita lunga, Atto I, 2 presenti (correttivo
×1,2), premio 150. Due PG a livello 6 (Inesperto, fattore 2). Torvald vota 4/5/3 con bonus 1; due incontri (un
principale px 30; due gregari px 20 con uno principale = 30 pesato). Voti 12 × 2 × 2 = 48; bonus 1 × 2 = 2;
incontri (30 + 30) × 1,2 = 72; premio 150 → **272**. Nadia 3/3/3 → 36 + 0 + 72 + 150 = **258**. «Assegna» porta
Torvald a +272 e Nadia a +258 sui PG. Correggendo il voto di Torvald a 5/5/3 il suggerito sale a 276 e la
ri-assegnazione applica **+4**, non 276.

## Differenze fra il file di Davide e i manuali (A.168, A.170)

- **Dotazione contata due volte.** Il gestore moltiplica il PX base del GS per un fattore di equipaggiamento
  (Comune ×1,1 … Leggendario ×2). Il Manuale dei Mostri (§8, righe «PX per 4 PG») dice che il PX della scheda
  ha **la dotazione già compresa**, e il Direttore §9.3 vieta una seconda maggiorazione. Nell'app l'unità di PX
  di un nemico è il suo `gs_px.px` (già comprensivo): **nessun fattore di equipaggiamento**.
- **Fonte dei fattori.** Soglie dei livelli, limiti/premi degli Atti e correttivo dei PG vengono dal gestore: il
  Manuale del Direttore §9.3 non è fra i Doc che controlliamo, perciò **A.170** per la conferma (A.168, 18/10: Davide ha confermato soltanto le fasce dei Titoli, Principiante 1–3 ×1, Inesperto 4–7 ×2, Esperto 8–11 ×3, Veterano 12–15 ×4, Eroe 16–19 ×5, Leggenda 20+ ×6, che sostituiscono quelle del gestore). Tutti i valori
  sono in `data/px_partita.json`, modificabili dal Direttore senza toccare il codice.
- **Roster reale.** Il gestore contiene i nomi veri dei giocatori: non entrano nel repo. L'associazione
  giocatore–PG è un'impostazione di campagna salvata in `px/px.json` (fuori da git).

## Importazione dell'archivio del vecchio gestore

`importaArchivio` legge il backup JSON del gestore (`{ version, title, act, baselineXP, roster, sessions }`),
normalizza alle nostre partite e le segna **già assegnate** con i loro importi: un successivo «Assegna» calcola
delta 0, così **non raddoppia** i PX già sulle schede. Il file HTML di Davide non contiene partite registrate
(archivio vuoto): l'import serve per un suo backup JSON. Nell'interfaccia è previsto come «Importa archivio»;
il motore e il test ci sono (`tests/px-partita.test.js`).

## Verifiche

`npm test` verde (1855), validatore verde, `node tools/verifica_frasi.mjs` 1277/1277. Nuovi test:
`tests/px-partita.test.js` (motore), `tests/px-partita-ui.test.js` (funzioni pure della tab),
`tests/px-server.test.js` (API e 403). Prova end-to-end nel browser su copie dei PG (sopra).
