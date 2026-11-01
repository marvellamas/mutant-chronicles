# Lotto 155: le Specializzazioni del Giocatore 0.54 (01/11/2026)

È il lotto 1 della ricognizione `docs/diff-talenti-054-2026-11-01.md`. Tocca il catalogo, non le schede dei personaggi: nessun file di PG riscritto.

## Versioni usate

Controllo su Drive del 01/11, pomeriggio: **nessuna edizione nuova** dopo il lotto 154. «per-davide.md» è fermo al 30/10 13:19.

- **Giocatore 0.54** (Google Doc del 01/11, 10:39 UTC): §3.2, §8.8, §8.8.1, §8.10 (testo in `docs/manuali-txt/giocatore-0.54.md`).
- **Magia 1.11** (01/11, 10:39 UTC): §1, solo per confronto. Le Specializzazioni di Potere per Classe sono le stesse del Giocatore.

`data/specializzazioni.json` → `versione_manuale`: «Giocatore 0.54 (Google Doc del 01/11/2026, 10:39 UTC); Talenti v1.0 del 07/10/2026».

## A. Gli elenchi per Classe

Generatore: `node tools/lotti/lotto_specializzazioni_054.mjs [--scrivi]`.
- Legge gli elenchi dal testo del §8.10.
- Senza `--scrivi` dice soltanto cosa cambierebbe.
- È idempotente.

Il vecchio `tools/lotti/lotto_talenti_nuovi.mjs` ora è storico: con `--scrivi` si ferma, salvo `--forza`.

**Catalogo: 87 voci** (86 + Combattimento Senz'Armi).

**Voci aggiunte, 20 Classi:**

| Classe | Prima → ora | Aggiunte |
|---|---|---|
| Agente | 12 → 16 | Mazze e Bastoni, Scudi, Veicoli Terrestri, Ambienti Urbani |
| Cacciatore | 19 → 22 | Armi da Lancio, Attività Domestiche, Artigianato |
| Esploratore | 19 → 22 | Pistole, Coltelli e Pugnali, Attività Domestiche |
| Lestofante | 13 → 15 | Armi da Lancio, Oratoria |
| Paramedico | 12 → 15 | Veicoli Marini, Ambienti Urbani, Pistole |
| Artigliere | 14 → 15 | Granate |
| Incursore | 15 → 18 | Armi a Sega, Carabine, Fucili d'Assalto, Tattiche Militari (e via Armi Inastate) |
| Lottatore | 11 → 15 | Combattimento Senz'Armi, Spade, Armi Inastate, Armi Flessibili |
| Soldato | 20 → 24 | Scudi, Armi Inastate, Coltelli e Pugnali, Spade |
| Agricoltore | 13 → 15 | Strumentazione, Costruzioni |
| Artigiano | 11 → 15 | Laboratorio, Informatica, Amministrazione, Resistenza |
| Operaio | 11 → 15 | Informatica, Materie Scientifiche, Veicoli Marini, Mazze e Bastoni |
| Pilota | 13 → 15 | Resistenza, Commercio |
| Tecnico | 14 → 16 | Pistole, Armi al Plasma |
| Accademico | 13 → 15 | Strumentazione, Oratoria |
| Amministrativo | 10 → 15 | Materie Scientifiche, Sicurezza, Spionaggio, Ambienti Urbani, Pistole |
| Artista | 11 → 15 | Artigianato, Commercio, Spade, Armi da Lancio |
| Medico | 10 → 15 | Informatica, Relazioni Sociali, Oratoria, Amministrazione, Resistenza |
| Predicatore | 10 → 15 | Informazione e Media, Amministrazione, Resistenza, Mazze e Bastoni, Erboristeria |
| Custode | 24 → 25 | Combattimento Senz'Armi |
| Invocatore | 19 → 19 | Mazze e Bastoni (e via Archi e Balestre) |

Invariati: Assaltatore, Arcanista, Mistico e Tecnomante (per questi due, vedi sotto le voci di Potere).

### Voci di Potere che il manuale toglie: lasciate (A.229)

La A.185 approvata dice «una scelta iniziale fra le nove». Finché Davide non risponde alla A.229, **ogni Taumaturgo tiene tutte e nove** le Specializzazioni di Potere nel suo elenco. Le voci sono annotate in `potere_in_attesa_a229`: il calcolo non le legge, il validatore controlla che restino negli elenchi.

- **Custode** (5): Elementi, Influenza, Sintonia, Esorcismo, Trascendenza.
- **Invocatore** (4): Cambiamento, Sintonia, Esorcismo, Incantamento.
- **Mistico** (5): Elementi, Cambiamento, Manifestazione, Influenza, Incantamento.
- **Tecnomante** (6): Elementi, Cambiamento, Influenza, Sintonia, Esorcismo, Trascendenza.

In tutto 20 voci. Per questo Custode ha 25 voci invece delle 20 del manuale, Invocatore 19 invece di 15, Mistico 21 invece di 16, Tecnomante 25 invece di 19.

### Voci tolte non di Potere: fuori dall'elenco, tenute da chi le ha (A.230)

- **Incursore**: Armi Inastate.
- **Invocatore**: Archi e Balestre. Il prompt non la nominava, ma il manuale la toglie: l'ho trattata come Armi Inastate.

Sono in `per_classe_tolte`. Cosa vuol dire in pratica:
- **Per una scelta nuova** l'opzione resta visibile fra quelle non ammesse, con il motivo: «non è più nell'elenco … (A.230)».
- **Chi l'ha già scelta la tiene.** In `controllaSceltaTalento` la voce dà un avviso di tipo `tolta`, non una «violazione»:
  - nessun «Procedi comunque» in Sali di livello;
  - nella tab Abilità, sotto la Specializzazione: «Non è più nell'elenco dell'Incursore (Giocatore 0.54): la tieni finché il Direttore non decide»;
  - nel riquadro «Da scegliere» lo stesso avviso, più «Se la cambi, non la puoi riprendere».
- **Un tablet non la può scrivere di nuovo**: 403 da `src/talenti-tablet.js`. Lo fa solo il Direttore.

## B. Combattimento Senz'Armi

§8.8.1: «Specializzazione distinta da Armi da Pugno: concede +1 VA e +1 danno agli attacchi senz'armi. Non concede bonus alle Difese né la possibilità di parare a mani nude.»

**I dati** (`specializzazione-combattimento-senz-armi`):
- `effetto { va: 1, danno: 1, attacchi: 'senz_armi' }`, gruppo armi, ravvicinato;
- `solo_regime_nuovo`: con i Talenti di prima non si sceglie;
- è nell'elenco di Lottatore e Custode.

**Il calcolo** (`src/attacco.js` → `profiloSenzArmi`):
- +1 VA e +1 danno al profilo «Senz'armi» di «Attacca!», con le righe «Specializzazione in Combattimento Senz'Armi» nella provenienza;
- valgono anche per i pugni con i Guanti, perché «conservano i benefici del combattimento senz'armi» (vedi A.232);
- non valgono per Onda Interiore (Vettore Distanza), né per Difese, Abilità o Salvezze;
- con la Specializzazione la riga «Senz'armi» compare sempre fra le armi.

Nella scheda si legge, per esempio: «Danno 1d4+2 (base, FOR +1, Spec. +1)».

**Distinta dalla Parata a Mani Nude (A.206):**
- I nomi sono diversi: «Specializzazione in Combattimento Senz'Armi» per la nuova; «Addestramento al Combattimento Senz'Armi» per il Talento di Classe del Lottatore, che comprende la Parata a Mani Nude; «Parata a Mani Nude Migliorata» per il suo Talento a scelta.
- La riga che il giocatore legge dice: «+1 VA e +1 danno agli attacchi senz'armi (Corpo a corpo). Non dà Difese né la Parata a mani nude.»
- La scheda completa («Dettagli») rimanda la Parata al Lottatore e al Talento della A.206.
- Nessuna Specializzazione ha «Parata» nel nome: lo controlla un test.

## C. «Indirizzi di Classe»

Nei dati il campo resta `specializzazioni` della Classe e `specializzazione` del Talento a scelta (`data/classi.json`). Cambia solo ciò che si legge, con un'unica funzione: `etichettaIndirizzo` in `src/talenti-testi.js` («Indirizzo Sicurezza», «Comune»).

Dove si legge ora:
- **Creazione**, scheda della Classe:
  - «Indirizzi: Sicurezza / Spionaggio»;
  - «Talenti a scelta (Gradi II, IV, VI): due per Indirizzo e uno Comune»;
  - ogni Talento come «Indirizzo Sicurezza — Nome» o «Comune — Nome»;
  - prima si leggeva «Specializzazione da definire», ora «Indirizzo da definire».
- **Sali di livello**, Talento di Classe a scelta: «Indirizzo Spionaggio — Nome».
- **Scheda**, tab Abilità, Talenti di Classe: «Risorse Interiori · Lottatore II, a scelta · Indirizzo Spirituale». Prima l'Indirizzo non si vedeva.
- **Stampa**, foglio 2, Talenti di Classe: lo stesso.
- **Messaggi del validatore**: «non è un Indirizzo della Classe né "Comune"», «attesi 2 Indirizzi di Classe (§3.2)».
- **Bestiario e «Crea nemico»**: non mostrano gli Indirizzi delle Classi, quindi niente da cambiare.

Le Specializzazioni vere (§8.8) restano «Specializzazione in …». Le «specializzazioni» degli incantesimi (Elementi, Psionica…) sono un'altra cosa ancora e non cambiano.

## D. Frequenze: proposta (non implementata)

Il §3.2 del Giocatore 0.54 ha una tabella delle frequenze.

| Frequenza | Quando torna disponibile |
|---|---|
| combattimento | a un nuovo combattimento distinto |
| sessione | alla sessione reale successiva |
| giorno | al giorno successivo del mondo di gioco |
| settimana | dopo una settimana del mondo di gioco dall'uso |
| scena | a una nuova scena, decisa dal Direttore |
| capitolo | al capitolo successivo della campagna |

Il manuale aggiunge: interrompere la sessione durante un combattimento non rinnova gli usi per combattimento, e i limiti per beneficiario valgono solo quando sono scritti.

**Oggi** (lotti 129–130, `src/usi-talenti.js`) i contatori sono `usi: { ambito, quantita }` con tre ambiti:
- `scontro` si azzera da solo quando cambia lo scontro;
- `sessione` e `giorno` solo a mano, con «↺».

Erano rimasti fuori Hacker («per sessione per sistema») e Pilotaggio Acrobatico («per scena»).

**Proposta:** un solo campo nei dati, `usi: { frequenza, quantita, per? }`, con le sei frequenze del manuale. Quando torna disponibile un uso lo dice una tabella in `regole.json` → `frequenze`, non il codice.

| Frequenza | Azzeramento proposto |
|---|---|
| `combattimento` | Da solo, al cambio di scontro, come oggi (oggi si chiama «scontro»). |
| `sessione` | Con «Nuova sessione» della scheda, che già esiste, e con «↺». |
| `giorno` | Con «Avanza» del Calendario quando cambia il giorno, se il Calendario è attivo; altrimenti «↺». |
| `settimana` | Si annota la data di gioco dell'uso: con il Calendario torna disponibile dopo 7 giorni, senza Calendario «↺». |
| `scena` | Un tocco «Nuova scena» del Direttore nella plancia, mandato ai tablet come il Round, più «↺». Pilotaggio Acrobatico entra così. |
| `capitolo` | Un tocco «Nuovo capitolo» del Direttore. Se il capitolo coincide con l'Atto dei PX, il cambio d'Atto lo fa da sé (A.233). |

Hacker usa `per: 'sistema'`: il contatore tiene l'elenco dei sistemi già usati in questa sessione. «Usa» chiede il nome del sistema, con un suggerimento dagli ultimi usati. Con un sistema nuovo l'uso è libero; con un sistema già usato compare «già usato su questo sistema».

**Stima:** è un lotto a sé, medio. Comprende:
- la migrazione di `ambito` in `frequenza`, con i file salvati che tengono i contatori;
- due tocchi nuovi del Direttore che vanno ai tablet;
- il legame con il Calendario;
- il campo `per`;
- un censimento delle voci con una frequenza nel testo: Talenti Liberi, Maestrie, Talenti di Classe, vantaggi degli Addestramenti, Tecniche.

Modello consigliato: Opus. Tocca sessione, server e tablet, e serve la risposta alla A.233. Prima del lotto conviene il censimento, per sapere quante voci hanno ciascuna frequenza.

## E. Prove

**Test automatici** (`tests/specializzazioni-054.test.js`, 8 test):
- le 87 voci, e ogni elenco del §8.10 è nell'app; le sole voci in più sono quelle di Potere annotate;
- nessuna voce di Potere tolta per sbaglio: ogni Taumaturgo ne ha nove;
- le voci tolte stanno fuori dall'elenco e sono annotate a parte;
- Combattimento Senz'Armi: i dati, la riga che dice niente Difese né Parata, nessuna Specializzazione «Parata»;
- sulla scheda di Lucas: +1 VA e +1 danno nel profilo «Senz'armi», Abilità invariate, niente su Onda Interiore, e con i Talenti di prima la voce non si sceglie;
- Duncan con Armi Inastate al 4° livello: scelta valida con l'avviso, nessuna violazione, `tolta` nella scheda, non offerta per una scelta nuova (con il motivo), e il tablet la rifiuta (403);
- il Lottatore la può scegliere, il Pilota no;
- l'etichetta degli Indirizzi.

Test aggiornati:
- conteggi 86 → 87 e 197 → 198 (`dati`, `talenti-nuovi`, `talenti-testi`, `talenti-effetti-voci`);
- il piè di pagina della stampa (`stampa-inventario`: i dati ora dicono «Giocatore 0.54»).

`tools/talenti-effetti-voci.mjs` prova la voce nuova sul profilo «Senz'armi»; `docs/talenti-effetti-2026-10-27.md` è rigenerato (198 voci ok). Rigenerati anche gli esempi (`versioni_dati`).

**Esito:** `npm test` 2.674/2.674, validatore 0 errori, `verifica_frasi` 1.282/1.282.

**Browser** (porta 3017, cartelle nello scratchpad, copie, 820 px):
- **Aiko**, copia nei Talenti nuovi: nel «Da scegliere» del Lottatore compaiono Spade, Armi Inastate, Armi Flessibili e Combattimento Senz'Armi. Scelta al 4° livello, in Combattimento «Senz'armi» passa da VA 14 a 15 e il danno è «1d4+2 (base, FOR +1, Spec. +1)». In Abilità: «Risorse Interiori · Lottatore II, a scelta · Indirizzo Spirituale».
- **Duncan**, copia: Armi Inastate al 4° livello ha l'avviso nella tab Abilità e nel «Da scegliere»; la scheda non segnala errori.

## Domande nuove

- **A.232**: i pugni con i Guanti da Combattimento Mistico prendono Armi da Pugno, Combattimento Senz'Armi o tutte e due? E se tutte e due, si sommano? Il §8.8.1 mette i guanti in Armi da Pugno, ma la descrizione dell’Abilità Corpo a corpo (cap. 4) dice che i pugni con i Guanti «conservano i benefici del combattimento senz'armi». Oggi l'app applica ai pugni con i Guanti solo Combattimento Senz'Armi (Armi da Pugno non era applicata nemmeno prima).
- **A.233**: il «capitolo» della tabella delle frequenze è l'Atto della tabella dei PX (premio di fine Atto, A.197)? E la «scena» la dichiara il Direttore dalla plancia? Serve al lotto delle frequenze.
