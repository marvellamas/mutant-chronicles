# I file di Davide (02/11/2026): personaggi, PX, Talenti, Lucas e Dimitri

Rapporto di sola lettura sul salvataggio che Davide ha mandato, estratto in `C:\Users\AoGPortable\Desktop\Zip_davide`.
Nessun file di Davide è stato scritto, copiato nel repo o in `personaggi/`, usato come cartella dei dati o aperto con il
server. Gli script di lettura stanno nello scratchpad della sessione, fuori dal repo; i due file letti dagli strumenti di
Lucas e Dimitri hanno la stessa impronta SHA-256 prima e dopo. Niente migrazioni, niente correzioni.

Orari: ora italiana (il 26/10 è il primo giorno dopo il cambio dell'ora, UTC+1). Soglie dei livelli: A.170
(6° = 520 PX, 7° = 720, 8° = 1.050).

Controllo dei manuali a inizio sessione: Giocatore 0.54, Magia 1.11, Armamenti 0.74, Equipaggiamento 0.30 ed E&L
invariati. «per-davide.md» è cambiato (01/11 19:29 UTC): una risposta nuova di Davide, **A.229** (01/11), che riguarda la
parte C; letta e usata qui, **non applicata** (lotto a parte; la copia `docs/per-davide.md` e il registro dei manuali non
sono aggiornati in questo lotto, che committa solo questo documento).

---

## A. Che cosa c'è nello zip

| Cartella | Contenuto |
|---|---|
| `personaggi/` | 14 file: per ognuno dei sette un `_liv6_2026-10-26.json` e un `_liv7_2026-10-26.json` (stesso `pg`); l'attuale, per `fileAttuale`, è sempre il liv7. Più `storico/` con 7–11 copie per personaggio, tutte del 26/10 (dalle 09:25 alle 22:58). |
| `px/` | `px.json` (4 partite assegnate, impostazioni: PX iniziali 520, Atto I) e `storico/` con 18 copie del 26/10, dalle 09:35 alle 22:58. |
| `tavolo/` | `dispositivi.json`: sette tablet, uno per personaggio, ultimo contatto il 26/10 tra le 22:56 e le 22:59. Nessun `rientro.json`. |
| `veicoli/` | un record: lo Scout «FIAT LUX» di Pablo (revisione 16, 26/10 09:31). |
| `galleria/` | 8 immagini (con le miniature, 19 MB): Scudo Bauhaus, Zaino, Reliquiario, Hachimaki dell'Autodisciplina, Fodero, CyberArma, Cofanetto, Ancora dell'Essenza. Aggiunte il 29/10 tra le 20:32 e le 20:33, mai mostrate. |
| `scontri/`, `scene/`, `mappe/`, `nemici/` | vuote (solo il `LEGGIMI.txt`). |
| assenti | `stato-mutant.txt`, `config-salvataggi.json`, `musica/`, `autosave/`, `salvataggi/`, `backup-master/`. |

**I personaggi sono fermi al 26/10 sera**: l'ultimo salvataggio di tutti e sette è delle 22:58:55 (l'assegnazione dei PX
di «Riorganizzazione»). Il PC è stato usato ancora il 29/10 (Galleria), ma senza toccare i personaggi.

| PG | Giocatore | Classe | Livello nella scheda | PX | Livello dai PX | Ultimo salvataggio | Copia più recente qui |
|---|---|---|---|---|---|---|---|
| Botha Pretorius | Max | Artigliere | 7 | 902 | 7 | 26/10 22:58 | 16/10 (fixture), liv6, senza PX |
| Dimitri Orlav | Fabio | Tecnomante | 7 | 796 | 7 | 26/10 22:58 | 04/10, liv6, PX 1.900 di prova |
| Duncan McDuff | Enzo | Incursore | 7 | 892 | 7 | 26/10 22:58 | 07/10 (fixture), liv6, PX 1.900 di prova |
| Lucas | Marcello | Invocatore | 7 | 908 | 7 | 26/10 22:58 | 20/10 (fixture), liv6, PX 1.900 di prova |
| Michele Giorgetti | Emiliano | Agente | 7 | 898 | 7 | 26/10 22:58 | 11/10 (fixture), liv6, PX 1.900 di prova |
| Oshi Nagata | Gaerana | Assaltatore | 7 | 900 | 7 | 26/10 22:58 | 12/10 (`personaggi/`), liv6, PX 1.900 di prova |
| Pablo Zaion | Mingo | Pilota | 7 | 902 | 7 | 26/10 22:58 | 11/10 (fixture), liv6, PX 1.900 di prova |

«Copie qui»: `PersonaggiBackup/` (04–05/10), `tests/fixtures/talenti-vecchi/` (04–20/10), `personaggi/` (Lucas 05/10,
Oshi 05/10 e 12/10), Drive «FILE PG» (28/09). **Tutte più vecchie** dei file di Davide, da 6 a 22 giorni.

**Quanto siamo indietro.** Nessuna copia di questo PC ha:

- il passaggio ai Talenti v1.0 (26/10, 19:10): tutti e sette sono in `regimeTalenti = 2` con i posti riscelti;
- il 7° livello (26/10, tra le 20:02 e le 20:57);
- i PX veri (le copie hanno 1.900, valori di prova) e le quattro partite;
- i registri del master (8–14 righe per personaggio: PX, Punti Eroe, Ferite, Caratteristiche di Dimitri);
- gli oggetti nuovi: la CyberArma di Dimitri, l'Hachimaki della Disciplina Interiore di Oshi.

Il codice di Mutant con cui Davide ha salvato è al più quello del 29/10: i lotti 146–158 (energia in cariche, veicoli,
Specializzazioni 0.54, Guanti di Lucas, CyberArma, Neverlost) i suoi file non li hanno ancora visti.

---

## B. I PX sfalsati

### I numeri

Le partite in `px.json`, in ordine di data (tutte inserite e assegnate il 26/10 sera):

| Partita | Durata | Presenti | Che cosa dà | Assegnato |
|---|---|---|---|---|
| 05/10 «Chiesa» | lunga (voti ×2) | tutti e sette | voti × 2 (Inesperto) × 2 + incontri 56 (Spettri 15×3 e Demnogonis 50, correttivo 0,7) | 96–112 |
| 12/10 «Sorella Park» | normale | tutti tranne Dimitri | voti × 2 + incontro 95 (correttivo 0,8 → 76) | 94–100 |
| 19/10 «Ritorno a Rettung» | normale | tutti tranne Dimitri e Duncan | voti × 2 + **premio di fine Atto I, 150, a tutti e sette** (anche agli assenti) | 150–172 |
| 26/10 «Riorganizzazione» | normale | tutti e sette | voti × 2 | 20–22 |

Ogni importo assegnato coincide con il ricalcolo di `componentiGiocatore` sui voti e sui PX di prima (28 righe su 28).
Voti della Chiesa e valore di Sorella Park (Veterano Epico, 50 × 1,9 = 95) sono gli stessi del Gestore PX v1.3 di
Davide. La catena dei PX di prima torna partita per partita, e i PX finali delle schede sono uguali a 520 + somma
degli assegnati.

| PG | PX nella scheda | Livello scritto | Livello dai PX | PX quando è salito al 7° | Ora della salita |
|---|---|---|---|---|---|
| Botha | 902 | 7 | 7 | 882 | 20:10 (tablet) |
| Dimitri | 796 | 7 | 7 | 774 | 20:12 (master) |
| Duncan | 892 | 7 | 7 | 870 | 20:56 (tablet) |
| Lucas | 908 | 7 | 7 | 886 | 20:02 (tablet) |
| Michele | 898 | 7 | 7 | 878 | 20:15 (tablet) |
| Oshi | 900 | 7 | 7 | 880 | 20:08 (master) |
| Pablo | 902 | 7 | 7 | 880 | 20:03 (tablet) |

**Nei file nessuno ha un livello in più dei suoi PX.** Tutti sono saliti al 7° circa un'ora e mezza dopo che Davide
aveva assegnato le prime tre partite (18:40–18:50), con almeno 774 PX contro i 720 richiesti. Con la regola della A.187
(si sale solo con i PX assegnati) il passaggio sarebbe stato consentito a tutti.

### Che cosa ho cercato

- **Partita contata due volte: no.** Le partite del 05, 12 e 19/10 erano già state assegnate il 24/10 (righe ancora
  nel registro del master), ma prima di reinserirle il 26/10 i PX erano stati riportati a 520. Il registro ha quindi
  due serie di righe «PX della partita del …», mentre il valore è contato una volta sola. Il ritorno a 520 è registrato
  solo per Pablo (09:38 del 26/10). Per gli altri sei è avvenuto con un salvataggio delle 18:32–18:34 che nel
  registro non c'è.
- **Premio di Atto doppio: no.** Un solo premio, nella partita del 19/10; il blocco della A.197 non avrebbe niente da
  fermare.
- **PX iniziali diversi da quelli veri: uno sì, ma in meno.** I PX iniziali sono 520 (= inizio del 6°, come nel
  Gestore di Davide) per sei personaggi. **Lucas è partito da 502**: 18 PX in meno, quasi certamente 520 scritto con
  le cifre invertite. Il 24/10 Lucas partiva da 520. Lucas dovrebbe avere 926 PX, non 908. Il livello non cambia.
- **Assegnazioni che non tornano con i voti: nessuna** (vedi sopra).
- **Il premio di fine Atto I, 150 PX a testa, dato il 19/10 mentre la campagna è ancora nell'Atto I.**
  L'impostazione dice Atto I e la partita successiva, il 26/10, è registrata in Atto I. Se con «Ritorno a Rettung»
  l'Atto I è finito, il premio è giusto: allora l'impostazione e la partita del 26/10 dovrebbero dire Atto II, e i PX
  non cambiano. Se l'Atto I non è finito, il premio è dato in anticipo. **È la sola voce che può dare PX di troppo.**

Senza quel premio:

| PG | PX senza il premio (Lucas da 520) | Livello |
|---|---|---|
| Botha | 752 | 7 |
| Dimitri | 646 | **6** |
| Duncan | 742 | 7 |
| Lucas | 776 | 7 |
| Michele | 748 | 7 |
| Oshi | 750 | 7 |
| Pablo | 752 | 7 |

### La risposta

- **Non è un livello preso in anticipo.** Ogni personaggio è salito al 7° con PX già assegnati sopra la soglia.
- **Possono essere PX di troppo, ma solo se l'Atto I non è finito.** In quel caso il premio di 150 è anticipato. Senza
  il premio Dimitri torna al 6° (646 PX: ha un livello in più). Gli altri sei restano al 7° con 742–776 PX.
- **Che tutti e sette dovessero essere al 6°, dai dati non si può stabilire.** Anche togliendo il premio, sei
  personaggi superano 720. Per portarli sotto servirebbe un altro dato sbagliato che nei file non si vede: PX iniziali
  diversi da 520, la Chiesa non «lunga», voti diversi. Lo deve dire Davide; qui non lo indovino.
- Il premio non cambia il **Titolo** della partita del 26/10: con o senza, i PX di prima stanno fra 520 e 1.049, cioè
  6° o 7° livello, e il Titolo resta Inesperto (A.168). Toglierlo non ricalcola quindi nient'altro.

### Che cosa si dovrebbe fare (sul PC di Davide, decide lui)

1. Davide dice se «Ritorno a Rettung» chiude l'Atto I.
   - **Sì:** nel pannello PX l'Atto diventa II, e la partita del 26/10 passa ad Atto II (solo un'etichetta: limite
     del livello 12, Titolo e PX invariati). Nessun livello da toccare.
   - **No:** «rettifica» del premio (A.197) per i sette, con il motivo: −150 a testa. Dopo la rettifica la scheda di
     Dimitri segnalerà «un livello in più» e, per la A.187, Davide sceglie fra «Annulla l'ultimo livello» (perde
     Arti Marziali, il Talento Libero del 7°) e «Tieni come concessione» (con il motivo). Gli altri non cambiano
     livello.
2. Lucas: +18 PX con «Modifica master» e motivo «PX iniziali 502 invece di 520», se Davide conferma che 502 era un
   errore.
3. Se Davide è ancora convinto che siano tutti al 6°, chiedergli quale numero è diverso da quelli che ha inserito:
   PX iniziali, durata della Chiesa, voti, incontri. I numeri del suo `px.json` danno il 7°.

---

## C. I Talenti del 26/10, sui file veri

Controllo con `postiTalenti` e `controllaSceltaTalento` (gli stessi della SD) e con gli elenchi del Giocatore 0.54
(`data/specializzazioni.json`, lotto 155), sul file attuale di ognuno (liv7).

- **Duncan** non ha Armi Inastate: le sue Specializzazioni sono Pistole (1°) e Spade (4°), entrambe nell'elenco
  dell'Incursore 0.54. La A.230 non lo riguarda.
- **Dimitri** non ha Specializzazioni di Potere: ha Cibernetica (1°) e Meccatronica (4°), tecniche, nell'elenco del
  Tecnomante. La A.229 non lo riguarda.
- **Tutti e sette** hanno i posti pieni: 2 Specializzazioni, 2 Maestrie e 3 Talenti Liberi al 7°. Tutte le 49
  scelte sono valide e nessuna è tra le voci tolte. Nessuno ha meno Talenti del dovuto e nessuno ha scelte successive
  in sospeso (Incantesimi o Tecniche aperti da un Talento).
- **A.229** (risposta di Davide del 01/11, non ancora applicata): dice che per i nuovi acquisti valgono gli elenchi
  0.54 e che le Specializzazioni di Potere già prese fuori elenco si segnalano. L'unico Taumaturgo con Specializzazioni
  di Potere è **Lucas** (Invocatore): Elementi e Manifestazione, entrambe ancora nell'elenco dell'Invocatore 0.54. Non
  ha niente da verificare.

Problemi: **nessuno**. Non serve né una scelta dei giocatori né una decisione di Davide.

---

## D. Lucas e Dimitri

### Lucas: `node tools/guanti-lucas.mjs` sul file vero

Che cosa cambierà, appena il PC di Davide avrà il lotto 156:

| Voce | Oggi | Dopo |
|---|---|---|
| Guanti | Non Comune, Grado II, SnT 2 | Rara, Grado III, SnT 3 |
| Kit sintonizzato / capacità | 8 / 9 | 9 / 9 (entra, al limite) |
| Riserva | 10 PM Verde | 10 PM **Rossa**; i 10 PM salvati restano |
| Bonus sempre attivo ai pugni | +1 VA | nessuno |
| Bonus ai contatti degli Incantesimi | +1 VA | nessuno |
| VA dei pugni, Guanti indossati | 7 | 6 |
| Pugno mistico | 3 PM: Magico, +1 danno | 2 PM: +1 VA, Magico, +1 danno, 5 Round |
| Getto di fuoco | — | 5 PM, linea 2 × 1 Q, 1d6+4 Fuoco |
| Doppio getto | — | 10 PM, due getti, Prova di Potere −2 |

Avviso: **nel file i Guanti sono «trasportati», non indossati.** Le proprietà valgono solo indossati: lo stato lo
cambia il giocatore. Lucas non deve scegliere niente.

Lucas non ha incantesimi aggiunti a mano: la A.213 (Esorcizzare Oscurità e Dardo Spirituale «da classificare») vale
per la copia di questo PC, non per il file di Davide. Lì Dardo Spirituale è un incantesimo conosciuto normale.

### Dimitri: `node tools/cyberarma-dimitri.mjs` sul file vero

| Voce | Oggi | Dopo la consegna del Direttore |
|---|---|---|
| CyberArma nell'inventario | **già una**, `armi:cyberarma`, stato «pronta» | una, solo con «Consegna l'arma» |
| Classe | Tecnomante | invariata |
| Interfaccia neurale | installata | invariata |
| Schegge instabili Verdi | 2 | 1 (una diventa il focalizzatore) |
| Spada CSA 404 | VA 6, con SIN | VA 5, senza SIN (danno e scariche restano) |
| CyberArma (forma base, sintonizzata) | — | VA 6 con il SIN 1 del modulatore, 1d8 Magico, 1 mano, portata 1 Q |
| Sintonizzazione | 3 / 11 | 5 / 11 |
| Attivazione | — | 1 AzP e 2 PM personali, 10 Round |

**La CyberArma c'è già.** È entrata nell'inventario il 26/10 tra le 09:25 e le 18:33, senza una riga nel registro del
master: non viene da una consegna. Per la regola del lotto 157 l'arma entra solo con la consegna del Direttore.
Lo strumento la elenca ma non lo segnala. Che cosa farne lo decide Davide, ed è la **A.231**: se è l'originale di
Park (frammento Viola, Corruzione 1) la tiene; se è un segnaposto, la toglie quando consegna quella del progetto.
Dimitri deve scegliere la forma (mani e portata) appena Davide apre il progetto.

---

## E. Una pagina per ciascuno

### Botha Pretorius (Max)

Freelance, Combattente, Artigliere. 7° livello, 902 PX (7° dai PX; 752 senza il premio dell'Atto I: sempre 7°).
Salito al 7° alle 20:10 del 26/10 dal tablet, con 882 PX.
Talenti: Fucili di Precisione (Spec., 1°), Tiro Mirato Migliorato (Maestria, 2°), Buona Costituzione (TL, 3°),
Carabine (Spec., 4°), Successo Magistrale Migliorato (TL, 5°), Tiro a Lunga Distanza (Maestria, 6°), Resistenza alla
Corruzione (TL, 7°). Tutti validi, posti pieni.
Copia più recente qui: 16/10, liv6, Talenti di prima, senza PX. Niente da fare.

### Dimitri Orlav (Fabio)

Cybertronic, Taumaturgo, Tecnomante. 7° livello, 796 PX (7° dai PX; **646 senza il premio: 6°**). Salito al 7° alle
20:12 da Davide (master), con 774 PX: era assente al 12/10 e al 19/10, e il premio di fine Atto è la parte più grossa
dei suoi PX.
Talenti: Cibernetica (Spec., 1°), Hacker (Maestria, 2°), Ritualista Minore (TL, 3°), Meccatronica (Spec., 4°),
Resistenza alla Corruzione (TL, 5°), Ritualista Maggiore (Maestria, 6°), Arti Marziali (TL, 7°). Tutti validi,
nessuna Specializzazione di Potere (la A.229 non lo tocca).
Registro: INT −2 e SAG +2 dal master il 26/10.
Da fare: CyberArma già nell'inventario (A.231, decide Davide); progetto a Paradise da aprire. Se il premio dell'Atto I
si rettifica, ha un livello in più (A.187, decide Davide).
Copia più recente qui: 04/10, liv6.

### Duncan McDuff (Enzo)

Imperiali, Combattente, Incursore. 7° livello, 892 PX (7°; 742 senza il premio: 7°). Salito al 7° alle 20:56 dal
tablet, con 870 PX.
Talenti: Pistole (Spec., 1°), Parata Istintiva (Maestria, 2°), Buona Costituzione (TL, 3°), Spade (Spec., 4°),
Movimento Fluido (TL, 5°), Ritirata Migliorata (Maestria, 6°), Prova Salvezza Migliorata (Tempra) (TL, 7°). Tutti
validi; **niente Armi Inastate**, quindi la A.230 non lo riguarda.
Copia più recente qui: 07/10, liv6. Niente da fare.

### Lucas (Marcello)

Fratellanza, Taumaturgo, Invocatore. 7° livello, 908 PX (7°). **I PX iniziali sono 502 invece di 520**: con 520
sarebbero 926 (776 senza il premio: 7°). Salito al 7° alle 20:02 dal tablet, con 886 PX.
Talenti: Elementi (Spec., 1°), Incantesimi Plurimi (Maestria, 2°), Potere Mistico (TL, 3°), Manifestazione (Spec.,
4°), Incrementare Incantesimi (TL, 5°), Incantesimi Estesi (Maestria, 6°), Iniziativa Migliorata (TL, 7°). Tutti
validi; le due Specializzazioni di Potere sono nell'elenco dell'Invocatore 0.54.
Da fare: +18 PX (decide Davide); Guanti da indossare (giocatore); il resto dei Guanti cambia da sé con l'aggiornamento.
Copia più recente qui: 20/10, liv6.

### Michele Giorgetti (Emiliano)

Bauhaus, Avventuriero, Agente. 7° livello, 898 PX (7°; 748 senza il premio: 7°). Salito al 7° alle 20:15 dal tablet,
con 878 PX.
Talenti: Pistole (Spec., 1°), Tiro Mirato Migliorato (Maestria, 2°), Iniziativa Migliorata (TL, 3°), Amministrazione
(Spec., 4°), Mani Abili (TL, 5°), Tiro a Bruciapelo Migliorato (Maestria, 6°), Sempre Allerta (TL, 7°). Tutti validi.
Copia più recente qui: 11/10, liv6. Niente da fare.

### Oshi Nagata (Gaerana)

Mishima, Combattente, Assaltatore. 7° livello, 900 PX (7°; 750 senza il premio: 7°). Salito al 7° alle 20:08 da
Davide (master), con 880 PX.
Talenti: Spade (Spec., 1°), Parata Istintiva (Maestria, 2°), Risorse Interiori (TL, 3°), Pistole (Spec., 4°), Tecniche
Interiori Supplementari (TL, 5°), Duellante (Maestria, 6°), Successo Magistrale Migliorato (TL, 7°). Tutti validi;
con Risorse Interiori le Tecniche sono attive, nessuna in storico.
Registro: Ferita Superficiale tolta e Hachimaki della Disciplina Interiore aggiunto dal master il 26/10.
Copia più recente qui: 12/10 (`personaggi/`), liv6. Niente da fare.

### Pablo Zaion (Mingo)

Capitol, Lavoratore, Pilota. 7° livello, 902 PX (7°; 752 senza il premio: 7°). Salito al 7° alle 20:03 dal tablet,
con 880 PX.
Talenti: Veicoli Spaziali (Spec., 1°), Controllo d'Emergenza (Maestria, 2°), Sempre Allerta (TL, 3°), Veicoli Terrestri
(Spec., 4°), Buona Costituzione (TL, 5°), Pilotaggio Acrobatico (Maestria, 6°), Mani Abili (TL, 7°). Tutti validi.
Veicoli: lo Scout «FIAT LUX» nel registro (`veicoli/`). Due riserve passeranno alle cariche da sole (A.193); i due
ricambi (Rosso da 50.000 Lx, Verde da 10.000 Lx) restano «da convertire» (`tools/riserve-da-convertire.mjs`, A.217).
Copia più recente qui: 11/10, liv6.

---

## Nota sulla guardia delle cartelle vere

La guardia (lotti 145 e 150) protegge le cartelle di dati di questa app, `PersonaggiBackup/` e la cartella scritta nel
profilo di Windows (`tools/protezione-reali.mjs`). Una cartella esterna come `Desktop\Zip_davide` **non è fra quelle**:
un server di prova avviato con `--cartella=` su di essa, o uno strumento che ci scrive, non verrebbe fermato. Non l'ho
provato (sarebbe stato avviare il server sui file di Davide). Se la regola «i file di Davide non si aprono mai con il
server» deve essere un meccanismo, serve un lotto a parte: per esempio riconoscere come «vera» ogni cartella con
personaggi che non sia una cartella di prova creata dal test.

---

## Le cose da fare sul PC di Davide, in ordine

| # | Cosa | Chi decide |
|---|---|---|
| 1 | Aggiornare Mutant (`Mutant.bat` → 2) prima di tutto il resto: i suoi file non hanno ancora i lotti 146–158. | Marcello con Davide |
| 2 | Dire se «Ritorno a Rettung» (19/10) chiude l'Atto I. | **Davide** |
| 3a | Se sì: Atto II nelle impostazioni PX e nella partita del 26/10. Nessun livello cambia. | Davide (lo fa lui o Marcello sul suo PC) |
| 3b | Se no: rettifica tracciata del premio di 150 per i sette (A.197), poi, per Dimitri che ha un livello in più, «Annulla l'ultimo livello» o «Tieni come concessione» (A.187). | **Davide** |
| 4 | Lucas: +18 PX (PX iniziali 502 invece di 520), con motivo. | **Davide** |
| 5 | Se resta convinto che tutti dovrebbero essere al 6°: quale dato del suo `px.json` è diverso dalla campagna (PX iniziali, Chiesa lunga, voti, incontri). | **Davide** |
| 6 | Dimitri: la CyberArma già nell'inventario. È l'originale di Park (A.231) o va tolta e fatta entrare con la consegna del progetto? | **Davide** |
| 7 | Dimitri: aprire il progetto a Paradise («Modifica master» → Artefatti → Progetti); Fabio sceglie la forma. | Davide; la forma Fabio |
| 8 | Lucas: indossare i Guanti (stato «indossato»). | Marcello (giocatore) |
| 9 | Scout di Pablo: i due ricambi «da convertire» (A.217). | **Davide** |
| 10 | Mandare `stato-mutant.txt` (`Mutant.bat` → C) dopo l'aggiornamento: nello zip non c'era. | Marcello |

Talenti: niente da fare. Duncan e Dimitri non hanno voci tolte; la A.229 non tocca nessuno dei sette.
