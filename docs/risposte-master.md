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

20. **27/09, 09:52 UTC — Munizioni dei modelli corporativi** (A.5.27; §2.16.27). Il totale dei
    colpi resta quello della Classe, assegnato nel tipo ordinario compatibile con il modello
    corporativo, senza costi; i caricatori hanno la capacità reale del modello e la ripartizione fra
    arma, caricatori e riserva si adegua senza cambiare il totale. L'Applicazione aggiunge che «le
    corrispondenze delle pistole sono già definite» e che restano fucili, armature e scudi.
    → `src/dotazioni.js` (voce delle munizioni della dotazione). Le corrispondenze delle pistole non
    sono scritte in nessuno dei Doc condivisi: per-davide A.33.

21. **27/09, 11:19 UTC — Modelli corporativi di base: fucili, armature e scudi** (A.5.30;
    Giocatore §2.16.27; Armamenti v0.52 §7.22). 48 corrispondenze per Bauhaus, Capitol, Cybertronic,
    Fratellanza, Imperiali e Mishima: 24 fucili (carabina, assalto, precisione, pompa), 12 armature
    (leggera, media), 12 scudi (piccolo, medio). 41 profili nuovi; i 7 già presenti conservano i loro
    valori. Munizioni: totali della Classe invariati (45, 90, 15, 18); tre caricatori per le armi a
    caricatore, uno inserito; i nuovi fucili a pompa hanno serbatoio fisso. «Le pistole restano quelle
    già definite».
    → `data/equipaggiamento/` (armi_distanza_corporative, armature_corporative, scudi: generatore
    `tools/lotti/lotto_7_22_corporativi_base.mjs`), `data/dotazioni.json` → `corporativi.abbinamenti`.
    Le pistole restano senza abbinamento: per-davide A.33.

22. **27/09, 11:19 UTC — Veicoli esclusi dalle dotazioni iniziali** (A.5.31; Giocatore §2.16.30).
    Nessuna Classe, Pilota compreso, riceve un veicolo; il Direttore di Gioco decide se e quali
    fornirne al gruppo.
    → `data/dotazioni.json` (testo del §2.16 e della dotazione del Pilota); l'app non assegna veicoli.

23. **27/09, 11:30 UTC — PV e PM attuali al passaggio di livello** (A.6; Giocatore §8.1.2).
    L'aumento dei PV massimi si aggiunge ai PV attuali e quello dei PM massimi ai PM attuali; PV
    mancanti e PM consumati restano, salire di livello non è un recupero completo (40/47 + 6 PV →
    46/53; 12/20 + 4 PM → 16/24). Conferma la soluzione provvisoria dell'app (per-davide A.15, chiusa).
    → `src/sessione.js` → `sessioneDopoLivello` (già così; tolto il TODO).

## 28 settembre 2026 — risposte nel Doc «per-davide.md» (sezione 7)

24. **Famiglie delle 12 armi ravvicinate corporative e Specializzazione Armi a Sega** (A.9;
    Armamenti §7.1.9, Giocatore §8.8.1). Katana, Wakizashi, Lama Mushashi, Lama Demontooth → Spade;
    Kriss → Coltelli e Pugnali; Nunchaku, Nunchaku elettrificato, Catena chiodata → Armi Flessibili;
    Bordone Templare → Mazze e Bastoni; Elettrosega CSB600, Chainreaper, Sbudellatrice → nuova
    famiglia Armi a Sega, con la nuova Specializzazione Armi a Sega (+1 VA, +1 danno). La famiglia
    non cambia l'Abilità della scheda (Katana Armi da guerra, Wakizashi Armi da mischia).
    → `data/specializzazioni.json` (85 Specializzazioni), `data/equipaggiamento/armi_corporative.json`
    (`famiglia`, `specializzazione`; tolto il TODO).

25. **Specializzazioni delle 16 armi a distanza corporative** (A.11; Armamenti §7.8), riferite al
    profilo principale. Fucili di Precisione: Eruptor, Mefisto, Archer, Assailant. Fucili d'Assalto:
    M50, AR3000, Volcano, Invader, Shogun, Panzerknacker (non Carabine: profilo come il M50).
    Mitragliatori: Justifier, Purifier. Carabine: Mandible, Interceptor, Airbrush, Windrider N4.
    I moduli integrati tengono la propria (Lanciagranate del Volcano, Lanciafiamme dell'Eruptor).
    → `data/equipaggiamento/armi_distanza_corporative.json` (tolto il TODO).

26. **Specializzazioni delle altre armi corporative per analogia con il §7.7** (A.12). Pistole e
    pistole mitragliatrici → Pistole; pesanti automatiche (MG40, Deathlock Drum, Kensai, Nimrod
    Autocannon) → Mitragliatori; plasma (Hellblazer, Plasma Intruder) → Armi al Plasma, l'Hellblazer
    con l'Abilità Armi leggere; MP105 GW e Nemesis 21 → Carabine; lanciafiamme, lanciarazzi e moduli
    integrati tengono la propria. SA30 a dardi → Pistole, ma solo +1 VA: Danno calibrato esclude il
    +1 danno. Conferma le assegnazioni già nei dati.
    → `armi_distanza_corporative.json` (SA30: `specializzazione_danno: false`), `src/equipaggiamento.js`
    (il bonus al danno della Specializzazione rispetta il campo), `src/validate.js`, `docs/effetti-oggetti.md`.

27. **Pistola mitragliatrice compatta** (A.7; Armamenti §7.7). Famiglia Pistole anche in Raffica Breve
    o Media; Specializzazione Mitragliatori non si applica; Abilità Armi leggere in tutte le modalità.
    Conferma la scelta dell'app. → `data/equipaggiamento/armi_distanza.json` (tolto il TODO).

28. **Pugnale e Ascia leggera, uso ravvicinato e lancio** (A.8; Armamenti §§7.1.1, 7.7). In mischia
    Coltelli e Pugnali / Asce; al lancio Armi da Lancio (Abilità Armi da lancio). Mai cumulate né a
    scelta: vale quella dell'attacco effettuato. Conferma la scelta dell'app: i due profili del
    catalogo (ravvicinato in `armi.json`, a distanza in `armi_distanza.json`, collegati da
    `stesso_oggetto`) portano ciascuno la propria Specializzazione, e «Attacca!» usa quella del
    pannello aperto. → `armi_distanza.json` (tolto il TODO).

29. **Scudo delle Guardie Sacre, lama retrattile** (A.10; Armamenti §§7.1.9, 7.4.10). Danno base
    1d6+1 Naturale con la lama ritratta, 1d6+1+1d4 Naturale con la lama estratta: vale il §7.1.9, il
    §7.4.10 (1d6+1d4) va corretto. Un unico colpo, l'Armatura si applica una volta. Estrarre o
    ritrarre la lama costa 1 Azione Principale; nessun PM, nessuna Sintonizzazione; indipendente da
    Scudo Magico.
    → `data/equipaggiamento/scudi.json` (`attacco.stato`, danno scritto 1d6+1d4+1 per il formato dei
    dadi; tolto il TODO), `src/equipaggiamento.js`, `src/condizioni.js` (stato «lama estratta» al
    tavolo, interruttore fra le «Condizioni degli oggetti» della SD), `src/sessione.js`, `src/validate.js`.

30. **Disponibilità degli Artefatti Mistici** (A.14). Pochi e non commercializzati, nessun negozio
    ordinario; la Fratellanza è l'unica a produrne in quantità ma non li vende fuori dalla congrega;
    Bauhaus, Imperiali e Mishima ne producono molto meno; nei sistemi esterni qualche Tecnomistico
    indipendente li produce e vende a prezzi elevati. Testo, senza effetto sui calcoli.
    → `data/regole.json` → `artefatti_mistici.disponibilita`, mostrato nel tooltip di ogni Artefatto
    (`src/descrizioni.js`).

31. **Batterie da 5 PM e scala di reperibilità** (A.14; Armamenti §7.10). Rosso, Blu e Verde:
    reperibilità Molto rara, valore indicativo 10.000 crediti; Bianco: Leggendaria, 50.000. Tutte:
    capacità 5 PM, Qualità Comune, PS Integrità 10, PI 3, peso 0,2 kg, cariche all'acquisto (5/5,
    come A.19). Potenza mistica e costo di Sintonizzazione invariati (Comune 1, Bianco Non comune 2);
    Leggendaria non porta il costo a 6. Scala di reperibilità: Comune, Non comune, Rara, Molto rara,
    Leggendaria (superiore a Molto rara, per disponibilità eccezionali del Direttore di Gioco). I valori
    sono riferimenti per gli scambi, non un listino: serve un produttore o possessore disposto a
    cedere; l'Oratoria da sola non crea disponibilità. I valori provvisori (500 e 1.000 crediti) non
    erano nei dati: le batterie avevano il prezzo vuoto.
    → `data/equipaggiamento/artefatti.json` (tolto il TODO), `data/equipaggiamento/index.json`
    (sigla `LE` e `_nota_reperibilita`: la scala sta con le sigle del catalogo, che il validatore e i
    tooltip già leggono, non in `regole.json`).

32. **Chroma Viola e Corruzione passiva** (A.21; Magia sez. 6, Giocatore §5.20.1). Saturo di Energia
    Oscura, la sola vicinanza corrompe; non reperibile in commercio. Non è una batteria né un oggetto
    inerte: è una fonte di Corruzione passiva (la soluzione provvisoria «contenitore inerte» non è
    adottata). Fasce: contatto diretto Intensa −2, 2 Stati; entro 1 Q Normale 0, 1 Stato; oltre 1 e
    fino a 6 Q Debole +2, 1 Stato; oltre 6 e fino a 12 Q (frammento trasportabile) Flebile +4, 1 Stato;
    oltre 12 Q (18 m) nessuna esposizione; cristalli grandi e giacimenti: raggio del Direttore di
    Gioco. Una PS di Magia per ogni ora complessiva di esposizione; fuori dall'aura il conteggio si
    sospende senza azzerarsi; vale la fascia più grave dell'ora; un contatto brevissimo conta nel tempo
    accumulato. Esiti del §5.20.1, con i modificatori da CROS e Umanità. Le regole per impiegarne
    l'Energia Oscura restano da sviluppare.
    → `data/regole.json` → `corruzione.chroma_viola` (fasce, frequenza, esiti, avviso) e
    `chroma.colori.Viola` (`contenitore: false`: non si sceglie più come energia di un contenitore);
    `data/equipaggiamento/artefatti.json` → «Chroma Viola (frammento)» (`corruzione_passiva`), senza
    PM, con le fasce nel tooltip e l'avviso nella SD; `src/character.js`: i contenitori personalizzati
    Viola salvati prima diventano il frammento, con un avviso al caricamento. Tracker dell'esposizione:
    `docs/backlog.md`, voce 13.

## 28 settembre 2026, pomeriggio — seconda serie di risposte nel Doc «per-davide.md» (sezione 7), riportate anche nei manuali delle 13:20

33. **Addestramenti e punti liberi** (A.52; Giocatore §§2.3–2.8, 2.13, 8.1, 8.3). Confermati: 76 punti
    base (8 × 4, 12 × 3, 4 × 2); 10 Punti Abilità Liberi alla creazione (sono quelli del 1° livello) e ai
    livelli 4, 8, 12, 16, 20, 60 in tutto. Limiti di Avanzamento: 3 ai livelli 1–3, 4 ai 4–7, 5 agli 8–11,
    6 ai 12–15, 7 ai 16–19, 8 al 20°; il limite comprende punti di Classe e punti liberi (prima quelli di
    Classe), VA ≥ 1 prima dei liberi. Nessun cambio: `regole.json` coincide.
    → `data/regole.json` → `regole_aggiornate.punti_abilita` («confermato da Davide il 28/09»).

34. **Categorie di Prove degli Stati** (A.51; Giocatore §§5.5, 5.18). Le liste sono di riferimento, non
    chiuse: conta l'azione. A Terra: Armi da guerra, Armi da mischia, Corpo a corpo, Difese; Atletica per
    l'equilibrio. Accecato: attacchi, Difese, Pilotare e altre Prove che richiedono la vista; Percezione
    non ha una penalità generale. Assordato: −4 quando l'udito è importante ma non indispensabile
    (Percezione, Intrattenere). Un'azione esclusivamente visiva (Accecato) o uditiva (Assordato) fallisce
    automaticamente. «Prove fisiche» come A.16 (la lista dell'app).
    → `data/regole.json` → `categorie_prove.vista` (tolta Percezione), promemoria di Accecato e Assordato;
    `tests/stati.test.js`.

35. **AR unica** (A.43; Giocatore §5.10, Magia sez. 7 e scheda 22.2). Un'AR complessiva «totale, di cui
    magica», senza zone del corpo; Armatura Mistica converte l'AR dell'armatura incantata e aggiunge il
    bonus una volta. Conferma l'app. Nel manuale della Magia la correzione è già fatta.

36. **Oggetti a 0 PI** (A.44; Armamenti §§7.2.1, 7.4, 7.11.1, 7.21.3). Rotto e inutilizzabile finché non
    riparato: un'armatura perde AR (anche magica) e benefici, uno scudo non dà AR e non attacca né para,
    un elmetto perde i suoi vantaggi; peso e penalità restano; la rottura vale dal colpo successivo.
    Conferma l'app. → `src/ui/tab.js`: «Attacca!» disattivato per armi e scudi Rotti, nota nel tooltip
    di «Rotto»; `tests/risposte-davide-2.test.js`.

37. **Rinforzo a 0 PI** (A.45; Armamenti §§7.11.2, 7.23.9). Perde AR e proprietà; montato conserva peso,
    FOR richiesta e penalità della configurazione rinforzata; tolto, l'armatura torna al suo profilo.
    Esempio: civile leggera + rinforzo pesante 3/5/Media → rinforzo rotto 1/5/Media → tolto 1/3/Leggera.
    Conferma l'app (chiude A.45). → `tests/risposte-davide-2.test.js`.

38. **Rainy Dayer** (A.13; Armamenti §7.14.6). Specializzazione Carabine sul profilo di tiro (+1 VA,
    +1 danno; Armi medie, due mani aperta o chiusa, 30 Q); la copertura (AR +1, Parata con Difese) non
    prende il +1. → `data/equipaggiamento/corredi_dispositivi.json` (tolto il TODO).

41. **Cumulo dell'AR: Corazza Potenziata, Aura di Resistenza, Pelle di Rinoceronte** (A.48; Giocatore
    §§3.9.5, 5.13, 8.9). Si sommano fra loro e alle altre protezioni; «solo il maggiore» resta fra Pelle
    Corazzata, Armatura di Forza e bonus di Armatura Mistica. Corazza Potenziata: +1 AR magica una volta,
    solo con un'armatura indossata o uno scudo imbracciato classificati Artefatto Mistico o TecnoMistico,
    utilizzabili e con almeno 1 PI (Guardie Sacre sì, anche con Scudo Magico spento; Sacri Guerrieri no;
    tecnologia, Fratellanza o un incantesimo temporaneo non bastano). Aura di Resistenza +1 AR magica per
    3 Round; Pelle di Rinoceronte +1 non magica solo contro il ravvicinato Naturale o Magico, 3 Round.
    Insieme: +3 contro il ravvicinato, +2 contro il resto, +2 magica.
    → `data/regole.json` → `ar.talenti` (`richiede: protezione_artefatto`), `ar.tecniche`; «Artefatto» è la
    classificazione già nel catalogo (`artefatti.json` → `artefatti_catalogo`, tipologia «Protezioni»),
    non un campo nuovo: un solo posto per il dato. `src/protezione.js`, `src/equipaggiamento.js`
    (`protezioni[].artefatto`), `src/sessione.js` (interruttori «tecnica:<id>»), `src/ui/tab.js`
    (interruttori accanto all'AR, per chi possiede le Tecniche; «contro ravvicinato» come valore a parte).
    Le 14 armature con AR magica propria restano senza il +1 finché Davide non risponde: per-davide A.53.

43. **Perforante, Laser, Incendiato** (A.50; Giocatore §§5.13, 5.18, 5.24, Armamenti §7.1.3). Prima l'AR
    della natura del danno; poi Perforante X sulla sola parte non magica, una volta per colpo, minimo 0;
    poi Laser dimezza per difetto il totale rimasto, magica compresa; Riflettente annulla Laser, non
    Perforante; contro l'Etereo solo la parte magica e Perforante non la tocca. Perforante riduce l'AR
    Naturale di Pelle Corazzata e Scudo (incantesimo), non quella Magica di Armatura di Forza. Incendiato:
    il d4 ignora l'AR non magica, l'AR magica lo riduce fino a 0 senza spegnere lo Stato; Ignifugo non
    riduce il danno. → `data/regole.json` → `ar.ordine_riduzioni`, promemoria in «Attacca!»
    (`src/ui/attacco.js`, aperto con Perforante, Laser o Incendiaria); nessun calcolo del danno al bersaglio.
