# Talenti v1.0 — il Talento si legge toccando il nome; si vedono tutti i posti (25/10/2026, notte)

Richiesta di Marcello dopo la prova sul fisso: per scegliere, un giocatore deve poter leggere il Talento intero.

## Il testo completo era davvero completo?

Quasi. Confronto di tutto il catalogo con il manuale (`docs/manuali-txt/giocatore.md`, `talenti-magici-mistici.md`) e,
per le voci nuove o cambiate, con il file del 7/10 (`docs/talenti-nuovi-v1.0.txt`):

- **corpo**: completo e parola per parola per 107 Talenti su 108; **Successo Magistrale Migliorato** era la versione di
  prima del manuale (mancavano le due frasi sul VA finale 21);
- **intestazione della scheda** (tipo, requisiti, quante volte si acquisisce, per esempio «Passivo. Nessun prerequisito.
  Acquisibile una sola volta.»): mancava in quasi tutti i Talenti del §8.6; nei Talenti di magia stava dentro il testo;
- le 9 voci del 7/10 (Preparazione Rapida, Ricarica Esperta, Raffiche Migliorate, Tiro Ravvicinato Migliorato,
  Immobilizzare Migliorato, Hacker, Arti Marziali Migliorate, Potenziale Mistico Migliorato, Sport): il testo era quello
  del file; mancava l'intestazione.

Corretto nei dati, per tutti, con `tools/lotti/lotto_testi_completi_talenti.mjs`: `testo` = il corpo della scheda del
manuale, `intestazione` = la sua riga d'intestazione; per le voci del 7/10 il testo resta quello del file e l'intestazione
viene dalle sue frasi. Un test confronta ogni Talento con il manuale, parola per parola
(`tests/talenti-testi.test.js`). Eccezioni al «testo completo diverso dal riassunto»: Iniziativa Migliorata, Resistenza
alle Malattie, Resistenza alla Paura, che nel manuale sono una frase sola (il testo completo ha comunque l'intestazione).

## A. Il nome si tocca

Nel riquadro «Da scegliere» (opzioni, scelta già fatta, incantesimi e Tecniche) e nell'elenco dei Talenti della scheda
(tab Abilità), il nome è un pulsante con ▸ e la sottolineatura: un tocco apre sotto, sul posto, la scheda intera
(intestazione in corsivo e tutti i paragrafi), in carattere normale; un altro tocco la richiude (▾ → ▸). Non è una
finestra: la lista resta dov'è. «Dettagli» faceva la stessa cosa ed è stato tolto. `src/ui/talento-leggibile.js`,
`src/talenti-testi.js → schedaTalento`.

## B. Tutti i posti in alto

Aprendo il riquadro, sotto «I tuoi posti, in ordine (tocca un posto già scelto per cambiarlo):», l'elenco dei posti del
personaggio: «1° Specializzazione ← adesso · 2° Maestria · 3° Talento Libero · 4° Specializzazione · 5° Talento Libero ·
6° Maestria». L'attuale è evidenziato (colore dell'accento e «← adesso»), quelli scelti hanno il nome («1° Specializzazione:
Archi e Balestre»), e un tocco su un posto scelto ci torna, con «Cambia questa scelta» finché il Direttore non chiude.

## C. Prova sul fisso (porta di prova 3019, cartella vera del fisso)

Voce 8 con SI → «0 personaggi su 7»; voce 7 con SI → «7 personaggi su 7». A 820 px, Lucas: letti toccando il nome
Specializzazione in Armi da Lancio, Successo Magistrale Migliorato (con le frasi che mancavano) e Incrementare
Incantesimi, richiuso con un secondo tocco senza che la pagina si spostasse; scelto il 1° posto → l'elenco è passato a
«2° Maestria ← adesso»; tornato sul 1°, cambiato in Archi e Balestre, salvato sul server; nella tab Abilità il nome della
Specializzazione si apre allo stesso modo.
