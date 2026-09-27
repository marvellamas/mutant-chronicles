# Risposte del master

Decisioni di Davide sui punti ambigui o errati dei manuali. **In caso di conflitto fra i
manuali e questo documento vale questo documento** (vedi CLAUDE.md). Ogni decisione indica
dove è stata applicata nei dati o nel codice.

## 25 settembre 2026

1. **Esploratore, Specializzazioni dei Talenti a scelta** (§3.5.2 non le indica).
   Terrestre: Segni di Passaggio, Adattamento Estremo. Spaziale: Mappa Mentale, Rotta
   Alternativa. Comune: Avanguardia.
   → `data/classi.json`, Esploratore.

2. **Incantesimi liberi «2 + Mod INT»: minimo 1**, sia per l'Addestramento Taumaturgo sia
   per Usufruitore di Magia (con INT 1–2 la formula darebbe un numero negativo).
   → `data/regole.json` (`taumaturgo.incantesimi_liberi.minimo`), `data/talenti_liberi.json`
   (Usufruitore di Magia), `incantesimiLiberi()` in `src/calc.js`.

3. **Quote di Classe per macrofamiglia**: si spendono liberamente fra le tre
   specializzazioni della macrofamiglia (es. «3 Fisici» = qualunque combinazione di
   Elementi, Cambiamento, Manifestazione).
   → `data/regole.json` (`taumaturgo.quote_classe`).

4. **Incantesimi liberi di qualunque famiglia**: quelli dell'Addestramento Taumaturgo e di
   Usufruitore di Magia possono essere di qualunque macrofamiglia e specializzazione.
   → `data/regole.json` (`taumaturgo.famiglie_incantesimi_liberi`).

5. **Livello massimo degli incantesimi per Gradi taumaturgici complessivi**: tabella del
   master, diversa dalla formula del Manuale della Magia (sezione 1: «3 volte i Gradi
   taumaturgici complessivi, fino a 18», cioè 3, 6, 9, 12, 15, 18).

   | Gradi | I | II | III | IV | V | VI |
   |---|---|---|---|---|---|---|
   | Livello massimo | 3 | 8 | 11 | 14 | 17 | 18 |

   Sono ammessi gli incantesimi con livello base non superiore al livello massimo: al 1°
   livello (I Grado) quelli di livello base 1 e 3. Questo chiude anche la domanda aperta
   sul 1° livello.
   → `data/regole.json` (`taumaturgo.livello_massimo_per_gradi`, con nota sulla
   discrepanza), `livelloMassimoIncantesimi()` in `src/calc.js`.

6. **Al 1° livello sono massimizzati sia il dado dei PV sia quello dei PM.** Il §2.12 e il
   §3.3 del Manuale del Giocatore (che massimizzano solo i PV) contengono un errore. Alla
   creazione il tiro dei PM non esiste più (né nelle scelte né nell'interfaccia); nei Gradi
   successivi al primo i dadi di PV e PM si tirano come prima. I personaggi salvati con un
   tiro dei PM alla creazione lo perdono al caricamento e i PM si ricalcolano.
   → `data/regole.json` (`creazione.dado_pm_massimizzato`), `puntiMagiaCreazione()` in
   `src/calc.js`, `src/character.js`.

## 26 settembre 2026

Testi completi, parola per parola: `docs/risposte-master-2026-09-26.md` (copia del Google Doc
«E&L – Risposte e correzioni approvate»). Il master dice di averli già inseriti nei manuali
condivisi (Giocatore §§1.2.3, 2.1, 2.11, 2.14, §8.6, §8.6.10; Magia sezioni 1, 2, 6).

7. **Descrizioni delle sei Caratteristiche** (A.1): due-tre frasi ciascuna, per il §2.1 e i
   tooltip.
   → `data/caratteristiche.json` (`descrizione`), testo del master parola per parola.

8. **La Prova Salvezza Volontà usa Carisma (CAR) al posto di Intelligenza (INT)** (A.1), con
   il modificatore specifico delle Salvezze; restano base 8, Addestramento, Avanzamento e
   Corporazione. Differenza per i personaggi esistenti: modificatore di CAR meno quello di INT.
   → `data/caratteristiche.json` (`salvezze`, Volontà → CAR); calcolo, tooltip e stampa
   seguono il dato. Esempio del §2.14 (Agente, INT 5 e CAR 5): Volontà resta 9. Collaudo:
   Varek 9 → 10, Sorella Ilaria 14 → 13, Dex 12 → 11.

9. **Schede dei Talenti di magia** (A.2.1–A.2.14): tipo, prerequisiti, molteplicità e testo di
   Usufruitore di Magia, Potenziale Mistico Migliorato, Incrementare Incantesimi, Lancio in
   Combattimento, Focalizzazione Migliorata, Contromagia, Contromagia Migliorata, Incantesimi da
   Lancio, Conversione Migliorata, Recupero Meditativo, Meditazione Migliorata, Meditazione
   Estesa, più i nuovi **Contromagia Universale** e **Magia Occultata**. Punti da ricordare:
   - «capacità personale di lanciare Incantesimi» = Addestramento Taumaturgo oppure Usufruitore
     di Magia; Usufruitore è incompatibile con l'Addestramento Taumaturgo e con Risorse
     Interiori;
   - Potenziale Mistico Migliorato vale solo per gli Usufruitori (non per i Taumaturghi):
     +3 per acquisizione, fino a 18, al massimo cinque volte;
   - Incrementare Incantesimi: +2 Incantesimi, fino a cinque volte, anche per i Taumaturghi;
   - Recupero Meditativo richiede di non avere già la Meditazione, che di base ha solo chi ha
     l'Addestramento Taumaturgo (Magia sez. 6; nessuna Classe la concede);
   - Focalizzazione Migliorata +6 (base +4), Lancio in Combattimento toglie il −2 d'Ingaggio,
     Incantesimi da Lancio +2 (base +2 → +4), Contromagia Migliorata toglie il −2, Conversione
     Migliorata 2:1 (1:1 con Ricarica Efficiente, Bianco sempre 2:1);
   - Meditazione: 3 + Mod SAG PM per ora (minimo 3), 2 + Mod SAG + Mod COS ore al giorno
     (minimo 1); Migliorata +2 PM/ora, Estesa raddoppia le ore.
   → `data/talenti_liberi.json` (schede, `condizioni_prerequisiti`, `effetti`),
   `data/regole.json` (`lancio`, `meditazione`, `chroma.conversione`), prerequisiti in
   `controllaTalentoLibero()` e valori in `magiaDelPersonaggio()` (`src/avanzamento.js`). La
   scheda digitale mostra il recupero con Meditazione e i modificatori di lancio.

10. **Tipo di tre Talenti Liberi** (A.3): Attivazione Tempestiva, Risorse Interiori e Tecniche
    Interiori Supplementari sono **Passivi**.
    → `data/talenti_liberi.json` (`tipo`).

11. **Durata di tre Tecniche Interiori** (E&L A.4, per-davide A.5; Doc E&L delle 15:20 UTC):
    Vipera dal Cappuccio «istantanea (un singolo attacco); l’eventuale Sanguinamento 2 prosegue
    secondo le regole dello Stato»; Presa dell’Anima «una singola Prova per il bonus di +3 VA;
    l’eventuale presa prosegue finché non si interrompe» (sulle creature incorporee, Eteree o non
    afferrabili senza altri PM, già nel testo della scheda); Contraccolpo Interiore «istantanea (un
    singolo attacco reattivo)». Testi del campo Durata del §8.9 nel Google Doc del Giocatore.
    → `data/tecniche_interiori.json` (`durata`), tolti i tre TODO.

12. **Equipaggiamento iniziale: struttura** (E&L A.5, per-davide A.6): scelte guidate. Una
    dotazione comune per tutti, una dotazione legata alla Classe iniziale (scelte predefinite fra
    armi, protezioni e strumenti), modelli e varianti legati alla Corporazione; ogni scelta rispetta
    i requisiti degli oggetti; gli oggetti scelti entrano da soli nell’inventario con quantità,
    munizioni e cariche. Le tabelle delle dotazioni e l’eventuale denaro iniziale **restano da
    scrivere** (Giocatore §2.16 del Google Doc).
    → Nessun dato ancora: il passo del wizard resta a inserimento manuale finché non arrivano le
    tabelle; la forma decisa guida il lavoro successivo (per-davide A.6 aggiornata).

13. **Dotazione iniziale comune** (E&L A.5.1, Doc delle 16:07 UTC; Giocatore §2.16.1 del Google
    Doc). Ogni personaggio riceve:
    - abiti comuni, calzature comprese (1 completo);
    - zaino da viaggio, cintura attrezzata (1 ciascuno);
    - borraccia da un litro piena d’acqua (2);
    - torcia elettrica, comunicatore personale (1 ciascuno);
    - corredo per igiene e piccoli rammendi, utensile multiuso, accendino, sacco a pelo (1 ciascuno);
    - razione da viaggio (3).

    Torcia e comunicatore hanno ciascuno batteria carica, cavo e alimentatore, con 24 ore di
    autonomia. Le scorte sono tre giorni di cibo e due litri d’acqua (un giorno di consumo).
    Dotazioni delle Classi, varianti di Corporazione e denaro iniziale restano da approvare.
    → **Non ancora nell’app**: serve il passo guidato dell’equipaggiamento iniziale (A.5), da
    pianificare. Gli oggetti non sono nel catalogo degli Armamenti.

14. **Dotazione iniziale dell’Agente** (E&L A.5.2, Doc delle 16:19 UTC; Giocatore §2.16.2).
    Oltre alla dotazione comune: Pistola semiautomatica (tre caricatori da 15 proiettili
    ordinari) oppure Revolver (18 proiettili, 6 nel tamburo e 12 di riserva); Coltello oppure
    Randello (anche manganello); Armatura civile leggera con elmetto standard (AR 1, l’elmetto non
    aggiunge AR); Binocolo; Registratore audiovisivo (batteria, cavo e alimentatore, 24 ore).
    Requisiti: armi da fuoco, Randello e armatura FOR 3, Coltello FOR 2. Profili commerciali; le
    varianti di Corporazione arriveranno con le rispettive dotazioni. Chiude la domanda sul
    §2.16.2 non annunciato.
    → Non ancora nell’app, come la 13: serve il passo guidato.

15. **Dotazione iniziale del Cacciatore** (E&L A.5.3, Doc delle 16:52 UTC; Giocatore §2.16.3).
    Oltre alla dotazione comune: Carabina (tre caricatori da 15) oppure Fucile a pompa (18
    cartucce a pallini, 6 nel serbatoio e 12 di riserva); Pugnale (anche da caccia) oppure Ascia
    leggera (anche accetta); Armatura civile leggera con elmetto standard (AR 1); Binocolo;
    Corredo di sopravvivenza ambientale con un ambiente a scelta fra Artico, Forestale,
    Desertico, Urbano, Pianure, Sottosuolo, Apocalittico (+2 VA a Sopravvivenza in
    quell’ambiente, secondo la sua scheda). Requisiti: Carabina, Fucile a pompa e Ascia leggera
    FOR 4, armatura FOR 3, Pugnale FOR 2.
    → Non ancora nell’app, come la 13 e la 14: serve il passo guidato.

## 27 settembre 2026

Testi completi in `docs/risposte-master-2026-09-26.md` (copia del Doc E&L, versione delle 01:56
UTC); i paragrafi corrispondenti sono nel Manuale del Giocatore §2.16.1–§2.16.29.

16. **Dotazioni iniziali delle 25 Classi** (E&L A.5.4–A.5.26; Giocatore §2.16.4–§2.16.26), dopo
    Agente (14) e Cacciatore (15): per ogni Classe gruppi di scelta fra armi, protezioni e
    strumenti, con munizioni, requisiti di FOR e note.
    → `data/dotazioni.json`, passo «Equipaggiamento iniziale» del wizard.

17. **Armamenti corporativi di base** (A.5.27; §2.16.27). La Classe assegna direttamente il
    modello di base della Corporazione che corrisponde al profilo commerciale delle tabelle
    (stessa tipologia e funzione), senza conguaglio; nell’inventario va il modello corporativo con
    i suoi valori, requisiti e prezzo; munizioni e accessori compatibili; i Freelance usano il
    catalogo Commerciale. Gli abbinamenti puntuali commerciale → corporativo sono ancora da
    completare.
    → `data/dotazioni.json` → `corporativi` (vuoto finché il master non li dà: si assegna il
    profilo commerciale con la nota «modello corporativo da definire (A.5.27)»).

18. **Crediti iniziali** (A.5.28; §2.16.28): 1.000 + 2d6 × 100 crediti (da 1.200 a 2.200, media
    1.700), per acquisti e conguagli; il resto rimane al personaggio.
    → `data/regole.json` → `crediti_iniziali`, tiro con `src/tiri.js`.

19. **Acquisti e miglioramenti iniziali** (A.5.29; §2.16.29). Alla creazione si possono cedere gli
    armamenti di base assegnati, valutati al 100 % del prezzo di catalogo del modello assegnato, e
    pagare con i crediti la differenza per un equipaggiamento migliore del catalogo della propria
    Corporazione; la valutazione integrale vale solo alla creazione.
    → `data/dotazioni.json` → `scambio`, passo «Equipaggiamento iniziale».
