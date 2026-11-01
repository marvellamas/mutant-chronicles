# Lotto 156: i Guanti da Combattimento Mistico riscritti (01/11/2026)

Lotto 2 della ricognizione `docs/diff-talenti-054-2026-11-01.md`. Tocca il catalogo, i calcoli e la scheda. **Nessun file di personaggio scritto.**

## Versione usata

- **Scheda «Guanti mistici di Lucas» 1.0.** Word di Davide del 31/10/2026, 12:37 UTC, «Regole approvate il 31 ottobre 2026». Riletta per intero da Drive il 01/11: il file non è cambiato.
- Gli stessi paragrafi in **Armamenti 0.74 §7.24**, **Equipaggiamento 0.30 §10.6–10.7** e **Magia 1.11 §26.6.2**. La scheda cita Armamenti 0.72, Equipaggiamento 0.26 e Magia 1.8, ma il testo è identico.
- Dal **Giocatore 0.54**: §5.13 (danno senz'armi) e §5.24 (Fuoco).
- Nessuna edizione nuova su Drive dopo il lotto 155.

Generatore: `node tools/lotti/lotto_guanti_lucas.mjs [--scrivi]` (idempotente). Il vecchio `lotto_artefatti_cap10.mjs` con `--scrivi` ora si ferma, salvo `--forza`: riporterebbe i Guanti al 12/10.

## A. Catalogo e regole

| Voce | Prima (12/10, Armamenti 0.61) | Ora (scheda 1.0) |
|---|---|---|
| Potenza | Non Comune | **Rara** |
| Grado | (non scritto) | **III** |
| Sintonizzazione (SnT) | 2 | **3** |
| Riserva | 10 PM Verdi, Cariche, Esclusiva | **10 PM Rossi**, Cariche, Esclusiva |
| Bonus sempre attivo ai pugni | +1 VA | **nessuno** |
| Bonus ai contatti degli Incantesimi | +1 VA | **nessuno** |
| Attivazione | 3 PM, 1 AzP, 5 RND: Magico, +1 danno | **Pugno mistico** 2 PM, 1 AzP, 5 RND: **+1 VA**, Magico, +1 danno |
| Getto di fuoco | — | **5 PM**, 1 AzP, una mano libera, automatico: linea 2 × 1 Q, 1d6+4 Naturale con Fuoco |
| Doppio getto | — | **10 PM**, 1 AzP, due mani libere, **Prova di Potere −2**: due getti, 10 PM spesi anche se la Prova fallisce |
| Qualità, Integrità, PI, peso, mani, profilo dei pugni, prezzo, REP | Non comune, PS 12, 4 PI, 0,5 kg, 0 mani; Corpo a corpo (FOR), 1 Q, Stordire; 3.000 cr, MR | invariati |

**A.175 rispettata.** Pugno mistico, Getto e Doppio getto sono proprietà attive dell'Artefatto (`attivazione_artefatto` e `getti_artefatto`), non incantesimi del catalogo:
- nella tab Poteri restano in «Proprietà attive degli oggetti (nessun Incantesimo)»;
- un test controlla che `incantesimi.json` non li contenga.

### Dove stava il +1 VA passivo, e dove l'ho tolto

1. **Catalogo**: i due effetti `attacco` +1 (`senz_armi` e `contatto_incantesimi`) della voce. **Tolti**: ora `effetti: []`.
2. **Da lì passava a:**
   - `scheda.equipaggiamento.bonusAttacco` (`src/equipaggiamento.js`);
   - il VA del profilo «Pugni (Guanti…)» di «Attacca!» (`src/attacco.js` → `profiloSenzArmi`);
   - il VA degli attacchi a contatto in «Lancia!» (`src/lancio.js` → `bonusContatto`);
   - la conversione PG → nemico, attraverso gli stessi calcoli.

   Senza l'effetto nei dati non arriva più a nessuno di questi. Il codice di «Lancia!» resta generico.
3. **Riconoscimento dei Guanti: il caso nascosto.** `pugniPotenziati`, la riga «Pugni (Guanti …)» e il «Senz'armi» sempre disponibile si accorgevano dei Guanti proprio cercando quel bonus. Ora li riconoscono dal profilo dei pugni del catalogo (`profilo_pugni`, nuovo `scheda.equipaggiamento.pugni`). Così togliere il bonus non fa sparire i pugni con i Guanti.
4. **Tab Combattimento**: due punti.
   - La nota «Guanti: +1 VA sempre» ora dice «nessun bonus sempre attivo; il Pugno mistico … vale qui finché dura».
   - Il filtro «Indossa» degli Artefatti per i pugni cercava lo stesso effetto: ora usa `profilo_pugni`.
5. **Stampa**: la riga «Attivazione» descrive le tre modalità (`testoAttivazioneArtefatto` in `src/stampa.js`). Nessun valore della stampa prende un +1 dai Guanti.

**Test «nessun +1 VA fantasma»** (`tests/guanti-lucas.test.js`). Su Lucas con i Guanti solo indossati, confrontato con Lucas senza Guanti, controlla che siano identici:
- la voce del catalogo (nessun effetto);
- tutte le Abilità (totale ed effettivo);
- `bonusAttacco`, `bonusDanno`, `effettiOggetti`;
- VA e danno dei pugni in «Attacca!»;
- tutte le righe di provenienza della stampa (nessuna riga «Guanti» o «Pugno mistico» con un valore);
- incantesimi e attacchi del nemico convertito da PG.

Se il bonus torna da qualunque parte, il test fallisce.

### Il Pugno mistico (+1 VA solo in quel momento)

È l'attivazione a durata di sempre: «Attiva (−2 PM)», condizione accesa, «Termina». Mentre è accesa, il profilo dei pugni prende:
- +1 VA, nella riga «Pugno mistico (Guanti da Combattimento Mistico, 5 RND)»;
- danno Magico e +1 al danno.

Spenta, torna come prima. Non tocca le armi impugnate né i getti.

### Getto di fuoco e Doppio getto

Il piano dell'uso sta in `src/getti-artefatto.js`: avvisi, mani libere e Prova di Potere. Nella tab Artefatti (e in Poteri) ogni modalità ha **«Usa (−5/−10 PM)»** e funziona così:
- scala i PM dalla riserva interna (`usaArtefatto` in `src/sessione.js`);
- poi compaiono **«Tira il danno 1d6+4»**, uno per getto, e per il Doppio getto **«Tira Potere (VA …)»**, con l'Abilità Potere del personaggio −2;
- i dadi usano la finestrella di sempre e scrivono nel registro, anche in quello della plancia.

**Avvisi, non blocchi:** riserva insufficiente, non sintonizzati, non indossati, nel deposito, mani occupate. Le mani occupate sono contate dalle armi e dagli scudi in mano; i Guanti contano 0. Con un avviso compare «Procedi comunque», e la riserva non scende sotto 0.

Il Doppio getto scala i 10 PM al tentativo, prima della Prova, come dice la scheda.

### La riserva Rossa

- Cala con Pugno mistico e getti.
- Si ricarica con i «−1/+1, Applica» delle riserve di Chroma, entro i 10 PM. È la normale procedura delle riserve Rosse: la scheda vieta NEC, UE e trasformatori.
- Non si riempie da sola: i PM salvati restano.
- È Esclusiva: non paga i lanci del personaggio.

### A.232 (aperta): cosa fa oggi il cumulo

Ai pugni, con o senza Guanti, vale **solo Combattimento Senz'Armi** (+1 VA, +1 danno, lotto 155). **Armi da Pugno non si applica ai pugni**: già prima non si applicava, perché i Guanti non sono un'arma impugnata e la sua Specializzazione la leggono solo le armi del catalogo. Quindi oggi non si somma niente.

Quando Davide risponde, si cambia il filtro `specSenzArmi` in `src/attacco.js` → `profiloSenzArmi`: una riga, commentata «A.232».

### Dati che la scheda non dà (restano assenti)

- **Bonus alla Prova di Potere del Doppio getto.** La scheda dice «Prova di Potere con −2 VA» e basta. L'app usa il VA effettivo dell'Abilità Potere −2: dentro ci sono gli effetti generali sull'Abilità, ma non i bonus dei Talenti al lancio, come le Specializzazioni di Potere o Potere Mistico, perché non è un incantesimo. Domanda **A.234**.
- **La linea sulla mappa.** La scheda descrive la linea 2 × 1 Q dalla casella adiacente; l'app la scrive ma non la disegna. Si può mettere a mano con i template della mappa.
- **Elusione dei bersagli.** La scheda dice «secondo le normali regole degli attacchi in linea»: si risolve al tavolo, dal lato del bersaglio. L'app tira solo il danno.
- **Prezzo e REP.** 3.000 cr e Molto Rara vengono dalla Magia 1.11 §26.6.2, invariati; la scheda di Lucas non li ripete.

## B. Lucas

Il file vero non c'è. Le copie su questo PC sono quella del 20/10 (6° livello, fixture dei test) e quella del 27/10 (7° livello, scratchpad), entrambe **prima del 26/10**.

**Nel file non c'è niente da riscrivere.** SnT, colore, proprietà e assenza del bonus vengono dal catalogo. I PM della riserva restano quelli salvati («l'energia presente si registra secondo lo stato effettivo di campagna»). La «migrazione» quindi è solo una verifica:

```bash
node tools/guanti-lucas.mjs <file del personaggio>
```

Lo strumento legge soltanto, non scrive niente, e stampa il rapporto voce per voce. È provato sulle due copie e **non è stato lanciato su nessun file reale**.

Il rapporto sulla copia del 27/10 (7° livello):

- Potenza e Grado: Non Comune, Grado II → **Rara, Grado III**
- SnT: 2 → **3**
- Kit sintonizzato / capacità: 8 / 9 → **9 / 9**. Entra esattamente; nessun avviso.
- Riserva: 10 PM Verdi → **10 PM Rossi**. Nel file 10 PM, che restano.
- Bonus sempre attivo ai pugni: +1 VA → **nessuno**
- Bonus ai contatti degli Incantesimi: +1 VA → **nessuno**
- VA dei pugni, Guanti solo indossati: 7 → **6**
- Pugno mistico: 3 PM (Magico, +1 danno) → **2 PM: +1 VA, Magico, +1 danno**. Con il Pugno acceso il VA dei pugni torna a 7.
- Getto di fuoco: **nuovo** (5 PM, 1d6+4 Naturale con Fuoco)
- Doppio getto: **nuovo** (10 PM, Prova di Potere −2)

**Se il kit non entrasse** (capacità più bassa per una ragione che oggi non vediamo, per esempio l'Umanità):
- la scheda scrive «Sintonizzazioni oltre la capacità: 9 su 8. Il personaggio sceglie quali interrompere (§7.10)»;
- il rapporto aggiunge l'avviso;
- **niente viene tolto**: lo controlla un test con la capacità abbassata di 1.

**Cosa dire a Lucas:**
- Non devi scegliere niente.
- Perdi il +1 VA che i Guanti davano sempre ai pugni, e quello agli attacchi a contatto degli Incantesimi: indossati non danno più bonus.
- Il Pugno mistico costa 2 PM invece di 3 e ora dà anche +1 VA ai pugni, per 5 Round.
- Guadagni due attacchi: il Getto di fuoco (5 PM, una linea di 2 Q, 1d6+4 Fuoco, alleati compresi) e il Doppio getto (10 PM, due getti, Prova di Potere −2; i PM si spendono anche se fallisce).
- La riserva è Rossa e resta con i PM che hai: non si ricarica da sola.

**Quando arriva il file vero:**
1. Copia dal PC di Davide.
2. `node tools/guanti-lucas.mjs` sulla copia.
3. Rapporto a Davide.

Non serve scrivere nel file.

## C. Prove

**Test automatici** (`tests/guanti-lucas.test.js`, 7 test):
- valori del catalogo e A.175;
- **nessun +1 VA passivo** da nessuna parte;
- Pugno mistico: +1 VA solo acceso, spento torna come prima, non passa alle armi;
- Getto e Doppio getto: piano, Prova di Potere −2, due tiri di danno, avvisi su mani, riserva e sintonizzazione; 10 → 5 → 0 PM, «Procedi comunque» a 0, Doppio getto 10 PM al tentativo, esempio della scheda «un Getto e due Pugni lasciano 1 PM»;
- riserva Rossa: Esclusiva, ricarica a mano entro 10, nessun riempimento automatico;
- Lucas: kit 9/9, 10 PM, rapporto in sola lettura, file invariato; capacità più bassa → solo avviso;
- riga della stampa.

Test aggiornati:
- `tests/artefatti-cap10.test.js`: Pugno mistico a 2 PM; kit da 9 SnT, che al I Grado dà l'avviso senza togliere niente;
- `tests/guanti-mani.test.js`: SnT 3, nessun effetto passivo.

**Esito:** `npm test` 2.681/2.681, validatore 0 errori, `verifica_frasi` 1.280/1.280. Le due frasi del vecchio +1 VA non sono più nei dati.

**Browser** (porta 3017, copia di Lucas del 27/10 nello scratchpad, armi riposte, 820 px):
1. Guanti indossati: pugni VA 6, danno 1d4, nota «nessun bonus sempre attivo».
2. «Attiva (−2 PM)»: riserva 10 → 8; pugni VA 7 (+1) e 1d4+1 Magico.
3. «Usa (−5 PM)» del Getto: riserva 3; «Tira il danno 1d6+4» funziona.
4. Doppio getto con 3 PM: avviso «la riserva ha 3 PM, ne servono 10» con «Procedi comunque». Annullato.
5. Riserva riportata a 10 con «+1» e «Applica»; Doppio getto: riserva 0 («Trasparente, alone Rosso»), «Tira Potere (VA 12)» (Potere 14 − 2) e due tiri di danno.
6. Sintonizzazione 9 / 9.
7. Stampa: riga delle tre modalità, nessun +1 dai Guanti nei valori.

## Domanda nuova

- **A.234**: nella Prova di Potere del Doppio getto valgono i bonus al lancio? Per esempio le Specializzazioni di Potere (Elementi per un getto di fuoco?) o Potere Mistico. Oggi l'app usa il VA dell'Abilità Potere −2, senza i bonus dei Talenti al lancio.
