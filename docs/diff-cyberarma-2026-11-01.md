# Lotto 157: la CyberArma riscritta e il progetto di Dimitri (01/11/2026)

Lotto 3 della ricognizione `docs/diff-talenti-054-2026-11-01.md`. Tocca catalogo, calcoli e scheda. **Nessun file di personaggio scritto**: le prove sono su copie.

## Versioni usate

- Controllo su Drive del 01/11 sera: **nessuna edizione nuova** dopo il lotto 156.
- **Armamenti 0.74** (31/10/2026, 22:19 UTC), §§7.25–7.25.4. Letti per intero: `docs/manuali-txt/armamenti-0.74.md`, righe 10821–10860.
- **Scheda «CyberArma Opzioni per Dimitri» 1.0** (Doc di Davide del 31/10/2026, 22:24 UTC). Riletta per intero da Drive il 01/11.
- **Magia 1.11 §24.3–24.4**, per gli esiti ordinari di progetto e lavorazione.

Generatore: `node tools/lotti/lotto_cyberarma_074.mjs [--scrivi]` (idempotente). Il vecchio `lotto_cyberarma_a158.mjs` ora si ferma, salvo `--forza`.

## A. Il catalogo

### Prima e dopo

| Voce | Prima (A.158 del 13/10 e A.166 del 16/10) | Ora (Armamenti 0.74 e scheda 1.0) |
|---|---|---|
| SnT dell'originale | 1, per potenza «Comune» | **secondo l'impiego**: Custode **1**, Tecnomante **2**. `sintonizzazione_per_classe`; il validatore non la lega più alla potenza (`snt_per_impiego`) |
| Uso dell'originale | Custode 1 PM, 15 R, +1 danno; Tecnomante 2 PM, 10 R; altre Classi no | uguale; altre Classi **solo con la conversione a NeC** |
| Batteria interna | Verde, **5 cariche** da 2 PM, Grado II, SnT 2; le altre Classi la usano a −2 VA | **batteria mistica Verde da 10 PM** (cinque attivazioni da 2 PM), SnT 2 complessiva; **solo Custode e Tecnomante**; prezzo 1.000 + 2.000 = **3.000 cr** su un originale |
| Conversione a NeC | — | **nuova voce** `armi:cyberarma-nec`: qualsiasi Classe con competenze e requisiti; 1 AzP e **1 carica di NeC Rosso** per **10 Round**; **SnT 3**; 2.000 cr, NeC escluso; niente +1 di Maestro d'Arma |
| Forme | 4 (lama lunga, frusta, ascia, lancia) con famiglia, Specializzazione, Manovre | **6 combinazioni di mani e portata**: lama 1/1 Q, ascia bipenne 2/1 Q, punta 1/2 Q, lancia 2/2 Q, frusta 1/3 Q, picca 2/3 Q. Più l'Ascia a una mano della A.166 per chi l'aveva. La forma cambia **mani e portata**; le famiglie della A.166 restano (A.235) |
| Modulatore neurale | — | **SIN 1** al tiro per colpire, solo al Tecnomante con interfaccia neurale collegata. Sta sulla voce dell'esemplare (`modulatore_neurale`); 1.500 cr, 8 ore, Tecnologia −2; riconfigurazione 300 cr |
| Prezzo dell'originale | non disponibile (A.158) | non disponibile: «non è fissato un prezzo unico» |
| Prezzi delle modifiche | 2.000 / 2.200 cr della batteria (A.158) | predisposizione 1.000, batteria 2.000, NeC 2.000, modulatore 1.500, riconfigurazione 300 (`modifiche`) |
| Costruzione | Custode con Maestro d'Arma **o Tecnomante con Architetto**; 1.250 cr, 17 ore, 3 PM | **soltanto i Custodi** costruiscono originali; i passi e i costi non sono nella 0.74 (A.235) |
| Peso, Integrità | 0,5 kg, Non comune, PS 12, 4 PI | il manuale li registra **per esemplare**; restano i valori della A.158 come riferimento (A.235) |
| Danno, Abilità, FOR | 1d8 Magico, Armi da mischia (DES), FOR 3 | invariati |

### Esemplare personale e voce generica

La voce del catalogo (`armi:cyberarma`) è l'oggetto generico. L'esemplare di Dimitri non è nel catalogo: è la voce del suo inventario che il Direttore crea con «Consegna l'arma». Ha:
- forma scelta (`manifestazione`);
- `modulatore_neurale`;
- `esemplare`: progetto, focalizzatore Verde, configurazione a PM personali e la provenienza scritta dal Direttore;
- `consegna`: chi e quando.

### Dati assenti (restano assenti)

- Peso, dimensioni e Integrità del singolo esemplare. Il manuale dice «si registrano per esemplare»; in catalogo restano i valori della A.158.
- Passi e costi per costruire un originale (§7.25: solo Custodi).
- Capacità del NeC della conversione: «della capacità prevista dalla scheda», non indicata.
- Potenza e Grado della CyberArma: «le SnT 1, 2 e 3 non determinano automaticamente danno o Grado». Il campo `potenza` resta quello della A.158, solo per il validatore.

## B. Il progetto (A.231 aperta)

**Dove sta.** Il modello sta nel catalogo, sulla voce dell'originale (`progetti`): tre giorni, ore, Prove, risorse, esiti del §24, forme ammesse, componenti.

Il progetto di un personaggio sta nel **suo file**, nel blocco del Direttore `progetti_master`, accanto al registro «Modifiche del master». Lo si vede nella **scheda, tab Artefatti → «Progetti»**, sia in modalità master sia dal giocatore.

**Come lo segue e lo chiude Davide** (dal PC del server, scheda aperta con «Modifica master»):
1. **«Apri un progetto»**: sceglie il modello «CyberArma: lavori a Paradise (Dimitri)». Non entra niente nell'inventario.
2. **Giorni.** Per ciascuno dei tre giorni (8 ore; Artefatti −2 / Tecnologia −2 / Tecnologia −2; 200 / 100 / 100 cr):
   - quattro pulsanti di esito: Successo Magistrale, Successo, Fallimento, Fallimento Maldestro;
   - una nota facoltativa e «Togli l'ultimo» per gli errori;
   - «Tira» con il VA della Prova del personaggio.

   Dopo un esito fallito la scheda scrive la conseguenza del §24 e conta i nuovi tentativi: Fallimento = metà del tempo (e +25% dei materiali in lavorazione); Maldestro = tempo e materiali interi. **Avvisa** se ore o risorse superano 24 ore e 400 cr; non blocca.
3. **«Chiudi il progetto»**: Riuscito, Riuscito in parte o Fallito, con una nota. «Riapri il progetto» per correggere, finché l'arma non è consegnata.
4. **«Consegna l'arma».** È **l'unico modo** in cui la CyberArma entra nell'inventario. Davide:
   - scrive la provenienza dell'originale (A.231: per esempio «l'originale di Park»);
   - sceglie la spada donatrice, che perde il SIN, e la scheggia che diventa il focalizzatore ed esce dall'inventario.

   Restano scritti chi e quando: nella voce dell'arma (`consegna: { quando, da: 'Direttore', progetto }`), nel progetto, e nel registro «Modifiche del master» («CyberArma: aggiunto all'Inventario», «Scheggia …: tolto dall'Inventario»). Forma non scelta, giorni non riusciti o progetto non chiuso come riuscito danno un avviso con «Procedi comunque», non un blocco.

**Il giocatore** sceglie la forma fra le sei della scheda, con «Scegli» come per i Talenti; le forme a due mani avvisano dell'impugnatura. Può farlo **solo prima della lavorazione**: dopo il primo esito segnato la forma è fissata.

**Protezione dai tablet** (`proteggiBlocchiMaster` → `formaDaTablet`, `vociConsegnaDaTablet`). Da un tablet:
- nei progetti passa solo la forma, finché è sceglibile;
- esiti, chiusure e progetti nuovi non passano;
- una voce con `consegna` che il disco non ha viene tolta: l'arma non si può copiare nell'inventario da un tablet.

## C. Dimitri

Il file vero non c'è: la sola copia è quella del 04/10 (fixture dei test). Il progetto **non si apre da solo**: lo apre Davide.

Verifica in sola lettura: `node tools/cyberarma-dimitri.mjs <file>`. È provato sulla copia e non lanciato su file reali. Sulla copia del 04/10:

- CyberArma nell'inventario: **nessuna** → una, solo quando il Direttore la consegna.
- Classe: Tecnomante (il progetto è scritto per lui). Interfaccia neurale Cybertronic installata: sì.
- Schegge instabili Verdi: 2 → **1**; una diventa il focalizzatore ed esce dall'inventario alla consegna.
- Spada CSA 404: VA per colpire 6 con SIN → **5 senza SIN**; danno e scariche restano.
- CyberArma consegnata, sintonizzata, in mano (forma del progetto base): **VA 6** con il SIN 1 del modulatore, **1d8 Magico**; mani e portata secondo la forma (con la Frusta: una mano, 3 Q).
- Sintonizzazione: 3/11 → **5/11** (SnT 2 per il Tecnomante).
- Attivazione: 1 AzP e 2 PM personali, 10 Round.

**Da dire a Dimitri:**
- La forma della CyberArma la scegli tu, dalla scheda, prima che cominci la lavorazione.
- L'arma entra nel tuo inventario quando Davide la consegna, dopo i tre giorni.
- Con la CyberArma: 2 PM per 10 Round, 1d8 Magico, SIN 1. La tua spada CSA 404 perde il SIN.

**Da dire a Davide:**
- Apri il progetto dalla scheda di Dimitri in «Modifica master» (Artefatti → Progetti).
- Segna i tre giorni, anche se falliscono.
- Chiudi e, quando vuoi, consegna l'arma.
- La provenienza dell'originale (A.231) la scrivi tu nella consegna. La Corruzione 1 del frammento Viola di Park l'app non la applica: resta una nota.

## D. Prove

**Test automatici** (`tests/cyberarma-progetto.test.js`, 9 test):
- catalogo: originale, batteria, NeC, prezzi, modulatore;
- le sei forme, e la forma che cambia solo mani e portata;
- SnT 2 al Tecnomante e 1 al Custode;
- il modello dei tre giorni;
- il Direttore apre, il giocatore sceglie la forma, Fallimento e Maldestro con le stime del §24, chiusura Fallito, riapertura; nulla tocca l'inventario;
- **«l'arma non entra nell'inventario senza l'atto del Direttore»**: `consegnaArma` senza master, file salvato e riletto, voce copiata da un tablet;
- consegna con forma, modulatore, chi e quando; spada senza SIN; scheggia uscita; SIN 1 sulla scheda; file riletto;
- tablet: solo la forma, solo prima della lavorazione, nessun progetto nuovo;
- rapporto su Dimitri in sola lettura.

Test aggiornati ai valori della 0.74:
- `tests/cyberarma-a158.test.js`: batteria da 10 PM; altre Classi via NeC; attivazione del Tecnomante a 2 PM personali;
- `tests/a166-manifestazioni.test.js`: 7 forme;
- `tests/equipaggiamento.test.js`: 9 blocchi artefatto;
- `tests/character.test.js`: campo `progettiMaster`.

**Esito:** `npm test` 2.690/2.690, validatore 0 errori, `verifica_frasi` 1.280/1.280.

**Browser** (porta 3017, copia di Dimitri nello scratchpad, 820 px):
1. Il Direttore, in «Modifica master», apre il progetto.
2. Il giocatore, fuori dalla modalità master, vede solo «Scegli» e «Tira» e sceglie la Frusta. Il file sul server di prova ha `progetti_master` con la forma e nessuna CyberArma.
3. Il Direttore segna: giorno 1 Successo; giorno 2 Fallimento poi Successo; giorno 3 Successo. Stima: 28 ore e 425 cr, con i due avvisi.
4. Chiude come **Fallito**: il titolo lo dice e la consegna avvisa. Riapre e chiude Riuscito; nell'inventario ancora nessuna CyberArma.
5. «Consegna l'arma»: la riga «Consegnata: il Direttore ha messo l'arma nell'inventario il …». Nel file: voce con `consegna`, forma Frusta, modulatore; spada con `sin_rimosso`; una scheggia in meno; due righe nel registro del master.
6. In Combattimento: «CyberArma · Armi da mischia», VA 6 con «SIN 1 (modulatore neurale…)», portata 3 Q, 1d8 Magico, «Attiva (−2 PM)».

Corretto durante la prova: la nota della chiusura restava nel campo e passava alla chiusura successiva; ora si svuota.

## Domande nuove

- **A.235**: la A.158 e la A.166 sono superate dagli Armamenti 0.74 in questi punti?
  - famiglia, Specializzazione e Manovre per forma (la 0.74 dice che la forma cambia solo mani e portata);
  - peso e Integrità di catalogo (0,5 kg, PS 12, 4 PI) contro «si registrano per esemplare»;
  - costruzione dell'originale anche per il Tecnomante con Architetto (la 0.74: solo Custodi), con i suoi passi e costi.
- **A.236**: la batteria interna Verde da 10 PM è «Batteria» con proprietà Esclusive (paga solo la CyberArma) o può pagare anche altro del personaggio? L'app: Esclusiva.
- **A.237**: la capacità del NeC Rosso della conversione: NeC Rosso 10 («un NeC da 10 cariche consente dieci attivazioni»)? L'app non lo fissa.
