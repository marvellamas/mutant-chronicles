# Talenti v1.0 nell'app — lotto 2 (scelta guidata e migrazione), 25/10/2026

Branch `talenti-nuovi`, poi unito in `main` e `battlemap` (senza `regimeTalenti` una scheda resta identica a prima:
`tests/talenti-vecchi-identici.test.js`). Lotto 1: `docs/diff-talenti-2026-10-25.md`.

## Che cosa c'è

| | Dove | Che cosa fa |
|---|---|---|
| **Riquadro «Da scegliere»** | `src/ui/talenti-scelta.js`, `src/ui/app.js` (`contestoTalenti`), in alto in ogni tab | Per i PG con `regimeTalenti = 2`: «Da scegliere: 1 Talento Libero, 2 Maestrie, 1 Specializzazione» e l'avviso che la scheda è incompleta finché mancano. Aperto: un posto alla volta dal primo vuoto (livello, categoria, elenco della Classe), opzioni ammesse con una riga d'effetto, le altre in grigio con il motivo; Caratteristica, Salvezza e disciplina dove servono. Scelto un Talento, l'effetto è subito nella scheda e si passa al posto dopo. Una scelta si cambia finché il Direttore non chiude. |
| **Chi sceglie** | `src/talenti-tablet.js`, `server.mjs` (PUT) | Il giocatore dal tablet, solo il suo PG e solo opzioni ammesse: lo ricontrolla il server. Il Direttore da «Modifica master» su ogni PG: può forzare un'opzione non ammessa (conferma, riga nel registro «Talento forzato dal Direttore: … (motivo)») e chiudere o riaprire le scelte (`scelte.talentiChiusiFino`). Una forzatura avvisa e non blocca. |
| **Offline** | `talentiBloccati()` in `src/ui/app.js` | Senza connessione, o con modifiche offline in attesa del Direttore, il riquadro lo dice e non accetta scelte (i Talenti non passano dal giornale offline). |
| **Sali di livello** | `src/ui/sali.js`, `passiDelLivello` | Maestria dopo le Caratteristiche (2/6/10/14/18), Specializzazione dopo il Grado dall'elenco della Classe aumentata, Talento Libero ai dispari. Opzioni da `prossimoLivello` (controllo unico). |
| **Creazione** | `src/ui/passi.js` | Passo «Specializzazione» subito dopo la Classe (A.185 aperta). I PG nuovi nascono con `regimeTalenti = 2`. |
| **Migrazione** | `distribuzione\5_passa_ai_talenti_nuovi.bat`, `tools/migra-talenti.mjs`, `src/migrazione-talenti.js` | Rapporto PG per PG (Talenti di oggi → categoria nuova, posti da riempire, casi: Tecniche legate a un Talento tolto, prerequisiti in un ordine che non torna); con SI: zip di `personaggi\` in `salvataggi\` (`prima-dei-talenti-nuovi_…zip`), poi per ogni PG riga nel registro del master «Talenti prima del passaggio ai Talenti v1.0 (data): …», `talentoLibero` tolto, `regimeTalenti = 2`, attraverso il salvataggio normale del server (acceso, o avviato apposta). Chiudendo senza SI non si fa niente. Se trova lo zip, «RIPRISTINA» rimette i file com'erano (prima ne fa un'altra copia). |
| **Tablet con la copia vecchia** | `src/talenti-tablet.js` | Dopo il passaggio un tablet non può riscrivere il PG con i Talenti di prima (409, anche in un file con la data nuova): la scheda si ricarica dal Direttore. Un tablet non può nemmeno fare il passaggio da sé (403). |
| **Stampa** | `src/stampa.js`, `src/ui/stampa.js` | Regime nuovo: Talenti Liberi, Maestrie e Specializzazioni (con livello e Classe). Regime vecchio: come prima. |

## Prova nel browser (25/10, cartella temporanea, porte 3017 Direttore e 3018 tablet)

Migrazione dei sette PG (copie) → Dimitri dal tablet, sei scelte (PV 16 → 21 con Buona Costituzione; Ritualista
Maggiore in grigio al 2° «richiede Ritualista Minore», ammessa al 6°), cambio di una scelta (PV 21 → 16, poi Sempre
Allerta) → Oshi dal Direttore in «Modifica master» (Iniziativa 3 → 6 con Iniziativa Migliorata; Risorse Interiori
ripresa: l'avviso delle Tecniche sparisce; Arti Marziali Migliorate forzata con conferma, nel registro) → chiusura
delle scelte → tablet offline: il riquadro lo dice e non offre scelte → tablet dopo la chiusura: niente riquadro.

Trovato e corretto nella prova: il tablet scrive nel file con la data di oggi, e il controllo del server guardava solo
il file con lo stesso nome; ora guarda il file attuale del personaggio.
