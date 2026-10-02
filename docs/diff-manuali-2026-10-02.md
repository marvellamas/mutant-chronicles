# Manuali del 01/10/2026 sera: differenze (ricognizione)

Controllo del 2 ottobre 2026. Solo ricognizione: **nessun dato e nessun codice cambiato**. Il testo dei Doc è salvato in `docs/manuali-txt/`, l'E&L in `docs/risposte-master-2026-09-26.md`, il Doc fisso in `docs/per-davide.md`. Si confronta con i testi dei lotti del 01/10.

Davide ha modificato i sei Doc il 01/10 fra le 21:25 e le 21:50 UTC. Il Doc fisso «per-davide.md» è stato modificato il 02/10 alle 06:36. Le **edizioni dichiarate non cambiano**: il tema è uno solo, la **creazione di Artefatti e batterie mistiche** (Magia sez. 24, Equipaggiamento cap. 9) e la **procedura di Rigenerazione** (Magia sez. 25). Il resto sono rimandi che prima dicevano «verrà integrato successivamente».

Classi: **piccolo** (refuso, riformulazione senza effetto, un valore singolo) · **regola** (cambia qualcosa che l'app già gestisce) · **nuovo** (contenuto che l'app non ha) · **risposta** (chiude una domanda del Doc per Davide).

| Documento | Prima | Ora | piccolo | regola | nuovo | risposta |
|---|---|---|---|---|---|---|
| Giocatore | 0.45 (01/10 08:22) | 0.45 (01/10 21:25) | 0 | 0 | 2 | 1 |
| Magia | 1.3 (01/10 08:22) | 1.3 (01/10 21:50) | 10 | 2 | 13 | 1 |
| Armamenti | 0.58 (01/10 10:17) | 0.58 (01/10 21:26) | 3 | 2 | 2 | 1 |
| Equipaggiamento | 0.5 (01/10 08:32) | 0.5 (01/10 21:40) | 1 | 0 | 3 | 0 |
| E&L | 01/10 07:25 | 01/10 21:38 | 0 | 1 | 1 | 2 |

## Manuale del Giocatore 0.45

| Paragrafo | Classe | Cambiamento | Tocca |
|---|---|---|---|
| §3.9.5 Tecnomante, Architetto TecnoMistico (Creazione TecnoMistica) | nuovo | Accesso esclusivo «al progetto e alla responsabilità dell’infusione» degli Artefatti TecnoMistici entro il proprio Grado di Classe. La creazione ha tre fasi: Artefatti per il progetto, Tecnologia per la costruzione, Rituali per l'infusione (Magia sez. 24). Il progetto può essere già disponibile e la costruzione affidata a un altro tecnico. Non è più «verranno integrate successivamente». | `classi.json` (testo del Talento); il sistema di creazione non c'è nell'app |
| §4.4 Abilità Artefatti | nuovo | Artefatti fa il progetto mistico obbligatorio, Tecnologia costruisce, Rituali infonde. I progetti sono permanenti, riutilizzabili e commerciabili; un progetto Magistrale conserva +2 alle Prove di Tecnologia. | `abilita.json` (descrizione: oggi dice «verranno integrate successivamente») |
| §4.4 Abilità Rituali | risposta (A.39 p. 3) | Rituali serve all'infusione e a eseguire direttamente Rigenerazione (Magia sez. 25). Usare un Artefatto di Rigenerazione già creato non richiede Ritualista né una Prova di Rituali. Le altre conversioni rituali richiedono una procedura definita. | `abilita.json` (descrizione); Rigenerazione in `incantesimi.json` |

## Manuale della Magia 1.3

| Paragrafo | Classe | Cambiamento | Tocca |
|---|---|---|---|
| Indice | piccolo | Nuove sez. 24 «Creazione di artefatti e batterie mistiche» e 25 «Rigenerazione: rituale e artefatti»; numeri di pagina. | — |
| Sez. 1, rimandi | piccolo | Creazione → sez. 24, Rigenerazione → sez. 25. «Le altre conversioni rituali richiedono una procedura espressamente definita.» | testo |
| Sez. 10, Rimuovere uno Stato (Menomazione permanente) | piccolo | «Rigenerazione: vedere la scheda 21.10 e la procedura della sezione 25.» | testo |
| §12.4 Ammissibilità dei Rituali | piccolo | Procedure complete: sez. 24 (Artefatti e batterie) e 25 (Rigenerazione). | `regole.json` → `lancio` se cita il rimando |
| Sez. 21 (introduzione) e scheda 21.10 Rigenerazione, «Lancio diretto» | risposta (A.39 p. 3) | Rigenerazione eseguita direttamente richiede il Rituale della sez. 25. Un Artefatto sintonizzato può riprodurne l’effetto (§25.4) senza Ritualista né conoscenza della procedura. | `incantesimi.json` (Rigenerazione: lancio, `meccanica`); «Lancia!» oggi dice «procedura rituale non ancora definita» |
| Scheda 21.10, «PM» | regola | Il valore in tabella non è più «la base per il costo rituale», ma il **costo totale** della versione, prima dell’eventuale Successo Magistrale. Tempi, reagenti ed esiti sono nella sez. 25. | `incantesimi.json` → Rigenerazione `regole`/`meccanica`; `src/lancio.js` |
| Sez. 22 (introduzione), «Rarità e livello degli oggetti» | piccolo | Fasce rinominate: la quinta «Leggendario» → **Epica**, la sesta «Unico» → **Leggendaria** (titolo «Potenza e Sintonizzazione»). | `incantesimi.json`; `artefatti.json` usa già Epica/Leggendaria |
| Sez. 22 (introduzione) | regola | Con proprietà attive, il costo SnT è pari al Grado finale. Gli Artefatti **con sole proprietà passive hanno SnT 0** (§24.2). | `artefatti.json` → `artefatti_catalogo[].sintonizzazione`; capacità di sintonizzazione (`src/equipaggiamento.js`) |
| 22.6 Batteria Mistica | piccolo | La creazione di batterie permanenti segue la sez. 24; costruzione, infusione e ricarica sono operazioni distinte. | testo |
| 22.7 Identificare Potere, 22.8 Rompere Vincolo, 22.10 Impronta Mistica, 23.9 Individuare (Aura) | piccolo ×4 | Stessa rinomina delle fasce nelle tabelle e nel testo («da Comune 3 a Leggendario 18»; «Epico o Leggendario»). | `incantesimi.json` (oggi «Leggendario»/«Unico» in tutte e quattro) |
| §24 (introduzione) e 24.1 Progetto, supporto e accesso | nuovo | Tre fasi: progetto (Artefatti), costruzione (Tecnologia), infusione (Rituali), anche da persone diverse. Ritualista Minore per i Gradi I–III, Maggiore per IV–VI; Architetto TecnoMistico per i TecnoMistici. | nessun motore di creazione |
| 24.2 Effetti, Grado e sintonizzazione | nuovo | Grado per livello della versione (1–3 I Comune … 18 VI Leggendaria); Grado delle proprietà = la più alta + 1 per ogni altra; Grado finale = max(proprietà, riserva). SnT = Grado finale, 0 con sole proprietà passive. Riserva integrata solo per le funzioni dell'Artefatto. **Arma Mistica permanente** (1: danno Magico; 3: +1/+1; 9: +2/+2; 15: Etereo +3/+3) e **Armatura Mistica permanente** (AR fisica → Magica, +0/+1/+2/+3). | futuri Artefatti costruiti; AR «di cui magica» |
| 24.3 Progettazione e commercio dei progetti | nuovo | Tabella per Grado: Artefatti 0…−10 VA, 4…128 ore, 100…3.200 cr; prezzi dei progetti (ordinario 5×, magistrale 15×) e reperibilità. | — |
| 24.4 Costruzione o adattamento | nuovo | Complessità Semplice/Ordinaria/Complessa/Molto complessa: Tecnologia 0/−2/−4/−6, 4/8/16/32 ore; 100 cr supporto di batteria, 200 cr adattamento di arma o scudo. | — |
| 24.5 Infusione mistica | nuovo | Tabella per Grado: Rituali 0…−10 VA, 1…8 ore, 3…18 PM, reagenti 250…8.000 cr (batterie: 50 cr per Grado); esiti. Una riserva appena creata è vuota, una batteria acquistata è carica. | `regole.json` → `chroma.contenitore_nuovo` («pieno»: vale per gli acquistati, coerente) |
| 24.6 Officiante e Canali | nuovo | Canali fino al Grado; aiuto al VA per fascia del Canale (+0…+4), massimo +5; minimo dell'Officiante = Grado in PM. | — |
| 24.7 Batterie mistiche e riserve | nuovo | Capacità 5–30 PM con Grado e prezzo: colorate 1.000–6.000 cr, Bianche 5.000–25.000 cr; Chroma grezzo 100/400 cr per PM. Ricarica 3:1 (2:1 con un Talento, 1:1 con entrambi; Bianco 2:1): **coincide** con `regole.json` → `chroma.conversione`. | catalogo delle batterie (oggi solo 5 PM) |
| 24.8 Riparazioni e modifiche | nuovo | Riparazione: 1 ora, Tecnologia, +1 PI (Magistrale +2, Maldestro −1); materiali 5% del valore fisico per PI; a 0 PI le parti mistiche non si perdono. | «Ripara» dell'Inventario per gli Artefatti |
| 24.9 Scheda del manufatto | nuovo | Campi della scheda e un esempio (spada con Arma Mistica 3: Grado I, SnT 0). | formato di un Artefatto costruito |
| 25.1 Accesso, tempi e risorse del rituale | nuovo | Tabella delle versioni 9/10/12/15/18: Rituali −4…−10 VA, 3–8 ore, 9–18 PM totali, reagenti 1.500–3.000 cr, rigenerazione successiva 5 giorni…12 ore. Canali come §24.6. | Rigenerazione in `incantesimi.json` |
| 25.2 Esiti, interruzioni e nuovi tentativi | nuovo | Magistrale: metà PM e reagenti; Maldestro: niente nuovo Rituale per 24 ore; interruzione: reagenti persi, PM no. | — |
| 25.3 Processo e limiti | nuovo | Una sola Rigenerazione attiva; capacità per versione; nessuna resurrezione, nessun recupero automatico di Umanità. | — |
| 25.4 Rigenerazione infusa in un artefatto | nuovo | Chi soddisfa la SnT la usa senza Ritualista, senza Prove e senza Canali; tutti i PM dalla riserva Verde o Bianca; attivazione continua 3–8 ore. | eventuale Artefatto di catalogo; «Lancia!» da artefatto |

## Manuale degli Armamenti 0.58

| Paragrafo | Classe | Cambiamento | Tocca |
|---|---|---|---|
| §7.5 Artefatti (proprietà) | piccolo | «Il Rituale finale di creazione sarà integrato successivamente» → «Progetto, costruzione e infusione seguono il Manuale della Magia, sezione 24». Nuova sigla **SnT** per il costo di Sintonizzazione (SIN resta l'interfaccia neurale). | testi delle note; etichette dell'app («costo di sintonizzazione») |
| §7.5 Artefatti (impiego) | piccolo | La creazione rimanda alla Magia sez. 24. | testo |
| §7.5 Reperibilità degli Artefatti e batterie mistiche | regola | Batterie da 5 PM: **10.000 → 1.000 cr** (Rosse, Blu, Verdi) e **50.000 → 5.000 cr** (Bianca), «prezzo indicativo»; «Non comune» → «Non Comune». Supera i prezzi approvati con A.14. | `artefatti.json` → `oggetti[]` (batterie: `costo`); nota di A.14 in `docs/risposte-master.md` |
| §7.5 (stesso paragrafo) | nuovo | «Per le capacità superiori, fino a 30 PM colorati e 25 PM Bianchi … vedere il Manuale della Magia, §24.7.» | catalogo: batterie oltre i 5 PM |
| §7.10 Artefatti che riproducono Incantesimi | risposta (A.39 p. 3) | Un Artefatto di Rigenerazione non richiede Ritualista né la procedura, si attiva senza Prove e usa la propria riserva (§25.4). | come la Magia 25.4 |
| §7.10 Tipologie e potenza | piccolo | Classificazione di potenza e SnT «derivano dalla configurazione costruita» (Magia §24.2). Il catalogo resta com'è. | — |
| §7.10 Classificazione di potenza | regola | La tabella dà la SnT degli Artefatti con proprietà attive e delle batterie. **Un Artefatto con sole proprietà passive ha SnT 0, qualunque sia la sua potenza.** | `artefatti.json` → `artefatti_catalogo` (rivedere voce per voce quali sono solo passivi); capacità di sintonizzazione |
| §7.10 Analizzare e identificare | nuovo | Creazione in tre fasi (progetto con Artefatti, costruzione con Tecnologia, infusione con Rituali); progetti permanenti e commerciabili; la costruzione fisica può essere affidata a un tecnico. | — |

## Manuale dell'Equipaggiamento 0.5

| Paragrafo | Classe | Cambiamento | Tocca |
|---|---|---|---|
| Organizzazione del volume | piccolo | Riga del nuovo capitolo 9. | — |
| Cap. 9 (introduzione) e §9.1 Progetto e preventivo | nuovo | Riassunto della Magia sez. 24 dal lato dell'equipaggiamento: preventivo (supporto, lavorazione, Chroma, progetto, reagenti); 200 cr adattamento di arma o scudo, 100 cr contenitore di batteria. | — |
| §9.2 Tecnologia e infusione | nuovo | Scala di complessità (= Magia §24.4), al massimo 8 ore al giorno; esiti della costruzione. | — |
| §9.3 Batterie, riparazioni e modifiche | nuovo | Contenitore base (0,2 kg, Comune, PS 10, 3 PI); Chroma grezzo 100/400 cr per PM; batteria finita 200/1.000 cr per PM (coerente con Armamenti §7.5); riparazione degli Artefatti (= Magia §24.8). | catalogo batterie; «Ripara» degli Artefatti |

## E&L (21:38)

| Voce | Classe | Cambiamento | Tocca |
|---|---|---|---|
| Rigenerazione («Riferimento storico: A.39») | risposta (A.39 p. 3) | Sostituisce «procedura da completare, l'app non deve inventare»: versioni 9/10/12/15/18 = 9/10/12/15/18 PM totali e 3/3/4/6/8 ore; reagenti 500 cr per Grado; Canali e Magistrale della sez. 25. «L’app dovrà recepire la sezione 25 e distinguere il Rituale diretto dall’attivazione automatica di un Artefatto.» | `docs/risposte-master.md` (nuova decisione), Rigenerazione in `incantesimi.json`, «Lancia!» |
| «Regole consolidate», Progetto, costruzione e infusione | nuovo | Riassunto approvato della sez. 24: Gradi I–VI e fasce Comune…Leggendaria, SnT 0 per i soli passivi, «non si applica un aumento fisso di +3 agli effetti permanenti». | — |
| «Regole consolidate», Partecipazione e risorse | regola | Prezzi delle batterie finite 200/1.000 cr per PM, Chroma grezzo 100/400; riserve nuove vuote, acquistate piene; ricarica senza crediti, rapporti invariati. | `artefatti.json` (prezzi), conferma `regole.json` → `chroma` |
| «Regole consolidate», Rigenerazione tramite Artefatto | risposta (A.39 p. 3) | Qualunque PG che soddisfi la SnT la usa; niente Ritualista, Prove o reagenti; PM dalla riserva; nessun Magistrale o Maldestro. | come sopra |

## Doc fisso «per-davide.md» (02/10 06:36)

Nessuna risposta nuova nella sezione 7. Sono state incollate le voci **A.62–A.73** e due errata (pacchetti del 01/10). Due difetti d'incollatura, da sistemare nel prossimo pacchetto:
- dentro la voce A.64 è finito il titolo «— In sezione 3 (errata), sotto «Manuale del Giocatore» —», con la frase sul binocolo troncata («…altrove il testo 0.45 dice «non richiede»);
- nella sezione 3, sotto «Manuale dell'Equipaggiamento», la frase sul comunicatore si interrompe a «come dice il paragrafo «Alimentazione e riservatezza».

## Domande aperte che ora hanno una risposta

| Domanda | Dove | Risposta (una riga) | Cosa cambierebbe nell'app |
|---|---|---|---|
| **A.18** Le riserve integrate pagano gli incantesimi? | Magia §24.2 e §24.7 (già Armamenti §7.5) | No: una riserva integrata alimenta soltanto le funzioni del proprio Artefatto, «non permette di prelevare PM né di alimentare gli incantesimi personali». | Nulla nel calcolo: è già il «Nel frattempo». Nel pacchetto: A.18 in «Risolte». |
| A.39 punto 3 (già in «Risolte» con «procedura non ancora definita») | E&L 21:38; Magia sez. 25; Armamenti §7.10 | Procedura di Rigenerazione completa: Rituale diretto con tabella (PM totali, ore, reagenti, Canali) oppure Artefatto sintonizzato senza Prove con i PM dalla riserva. | «Lancia!» e scheda di Rigenerazione: il Rituale con i suoi costi al posto di «procedura da definire»; attivazione da Artefatto. Nuova decisione in `docs/risposte-master.md`. |
| A.14 (già risolta: batterie 10.000/50.000) | Armamenti §7.5, Magia §24.7, Equipaggiamento §9.3, E&L | Prezzi indicativi ridotti a 1.000 cr (colorate) e 5.000 cr (Bianca) da 5 PM; 200/1.000 cr per PM. | `artefatti.json`: costo delle quattro batterie; nota di A.14 aggiornata. |
| A.32 (in parte) | Magia §24.1, §25.1 | Ritualista Minore e Maggiore diventano requisiti operativi dei Gradi I–III e IV–VI: conferma indiretta che i Talenti sono definitivi. | Nulla; la domanda resta aperta per gli altri 16 Talenti. |

Nessuna risposta per A.20, A.34–A.36, A.38, A.40, A.53–A.73. Per **A.73** (formato dei nemici) non c'è nulla.

## Impatto sul Tavolo del Master (branch `tavolo-direttore`)

Nessun cambiamento tocca ciò che il branch usa o userà nei prossimi pezzi:
- Iniziativa e parità (§2.14, §5.1): invariate.
- Difese, AR, PV, Ferite, Affaticamento, Stati (§5.5, §5.9, §5.13–5.18, §5.24): invariati.
- Formato dei nemici (A.73): nessuna risposta.

Due punti di contorno, senza effetto oggi:
- **Armatura Mistica permanente** (Magia §24.2): la componente fisica dell'AR diventa Magica (+0/+1/+2/+3). Per un nemico si scrive già con «AR totale, di cui magica» del formato; per il danno applicato (pezzo 4) vale la tabella del §5.24, invariata.
- **Arma Mistica permanente**: danno Magico o Etereo con bonus. Per gli attacchi dei nemici (pezzo 5) basta il campo «natura» del formato.

## Lotti proposti, in ordine

1. **Testi e rimandi** (piccolo): togliere i «verranno integrati successivamente» da `abilita.json` (Artefatti, Rituali), `classi.json` (Creazione TecnoMistica) e `incantesimi.json` (introduzione dell'Esorcismo, Rigenerazione, Batteria Mistica, §12.4); rinominare le fasce Epica/Leggendaria in Identificare Potere, Rompere Vincolo, Impronta Mistica e Individuare; sigla SnT dove l'app scrive «costo di sintonizzazione»; `versione_manuale` con le date del 01/10 sera.
2. **Batterie e SnT** (regola): prezzi delle batterie da 5 PM (1.000/5.000) e nota di A.14; SnT 0 per gli Artefatti del catalogo con sole proprietà passive (ricognizione voce per voce, test sulla capacità di sintonizzazione); decisione E&L in `docs/risposte-master.md` e pacchetto per il Doc (A.18 in «Risolte», nota su A.14, correzione delle due incollature).
3. **Rigenerazione** (risposta A.39 p. 3, regola): chiude anche l'unico test rosso di `npm test` dopo questa ricognizione: `tools/verifica_frasi.mjs` non trova più nel manuale la frase «Lancio: esclusivamente mediante Rituale… verranno integrati successivamente…» che `incantesimi.json` cita per la scheda 21.10 (1027 frasi su 1028). È il segnale atteso: dati del 01/10 mattina, testo del 01/10 sera. tabella della sez. 25 nei dati (PM totali, ore, reagenti, rigenerazione successiva, Canali); «Lancia!» la presenta come Rituale con i suoi costi; attivazione da Artefatto (§25.4) senza Prove, con i PM dalla riserva.
4. **Batterie oltre i 5 PM** (nuovo): voci di catalogo da 10 a 30 PM colorate e fino a 25 PM Bianche, con Grado, SnT e prezzo (Magia §24.7).
5. **Creazione di Artefatti e batterie** (nuovo, da decidere con Marcello se rientra nel perimetro): un calcolatore del progetto (Grado delle proprietà, Grado finale, SnT, costi di progetto, costruzione e infusione) dalle tabelle 24.2–24.7, e la riparazione degli Artefatti del §24.8 nel «Ripara» dell'Inventario.
