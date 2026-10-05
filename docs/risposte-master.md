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

31. **Batterie da 5 PM e scala di reperibilità** (A.14; Armamenti §7.10; prezzi superati dalla decisione 66 del 02/10). Rosso, Blu e Verde:
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

42. **Condizioni delle armi e PI** (A.49; Giocatore §5.17, Armamenti §§7.2, 7.2.1). Distinte: una
    Complicazione (Inceppata, Inutilizzabile, Rotta, Danneggiata) non azzera i PI salvo una perdita
    espressa; a 0 PI l'arma è comunque Rotta; la riparazione sul campo del §5.17 toglie il guasto con la
    penalità prevista (−3 o −5 VA fino alla riparazione completa) ma non restituisce PI; recuperare PI
    (A.46) non toglie una condizione; Distrutta non si ripara in modo ordinario. Le condizioni non erano
    nell'app: ora sono uno stato dell'arma al tavolo.
    → `data/regole.json` → `condizioni_armi`; `src/sessione.js` (`condizioniArmi`, `impostaCondizioneArma`);
    `src/condizioni.js` (penalità nel VA effettivo, quindi anche in «Attacca!»); `src/ui/tab.js` (scelta
    nella scheda dell'arma, «Attacca!» disattivato se l'arma non è utilizzabile).

39. **Riparazione strutturale degli oggetti personali** (A.46; Armamenti §7.2.1 del 28/09). La procedura
    dei veicoli si estende ad armi, armature, scudi, elmetti e rinforzi: un oggetto, 1 ora, Prova di
    Tecnologia; Successo +1 PI, Magistrale +2, Fallimento nessuno (tempo consumato), Maldestro −1 fino a
    0 senza PS Integrità; mai oltre il massimo; strumenti improvvisati −2 VA; riduzioni di tempo dei
    Talenti non sotto metà; materiali 5% del prezzo di catalogo per PI effettivamente recuperato (armatura
    da 2.000: 100 crediti per PI); manodopera esterna a parte. Rotto a 0 PI torna utilizzabile con 1 PI;
    Distrutti e componenti mistiche: procedure specifiche.
    → `data/regole.json` → `integrita.riparazione`; `src/riparazione.js` (funzioni pure);
    `src/sessione.js` → `riparaOggetto` (PI e crediti); `src/ui/tab.js`: «Ripara» nella sezione Integrità
    con il pannello (VA di Tecnologia, strumenti improvvisati, esito scelto dopo il tiro, materiali).

40. **Oggetti senza PI e oggetti multipli** (A.47; Armamenti §7.2.1, Equipaggiamento §§1.7, 1.10–1.11).
    Senza PI a catalogo un oggetto non è indistruttibile né a 0: nessun valore finché il Direttore non lo
    fissa per analogia. Il materiale sanitario si traccia (kit Standard 4, Professionale 6, iniettore
    manuale 2); consumabili: quantità, dosi o applicazioni. Ogni esemplare ha i propri PI; gli identici
    restano insieme finché integri e si separano quando uno viene danneggiato.
    → `data/regole.json` → `integrita.tipi_tracciati` (+ sanitario), nota senza TODO; `src/protezione.js`
    (`oggettiConPi`: gruppi e `pi_direttore`, `oggettiSenzaPi`); `src/equipaggiamento.js`
    (`separaEsemplare`, `pi_direttore` della voce); `src/ui/tab.js` (riga «×N integri» con «Danneggia uno»,
    campo «PI definiti dal Direttore»); `src/ui/app.js`.

## 29 settembre 2026 — risposte ai 19 quesiti dell'app (Doc E&L, sezione in fondo), testo nei manuali del 28/09

Le risposte sono numerate 1–19 come nel Doc E&L; tra parentesi la domanda del Doc «per-davide.md».
Ricognizione e stime: `docs/ricognizione-2026-09-28.md`.

44. **Bonus di Caratteristica al danno; danno senz'armi** (E&L 12, A.22; Giocatore §5.13, §4.4; Magia
    sez. 7). Bonus = fascia del valore (1–5 → 0, 6–7 → +1, 8–9 → +2, 10 → +3) limitata dal livello
    (1–7 → +1, 8–14 → +2, 15+ → +3), mai sotto 0; a ogni colpo o applicazione, prima di moltiplicatore,
    Difese e Armatura. FOR senz'armi; per le armi la Caratteristica dell'Abilità (le coppie «FOR o DES» e
    «DES o INT» del §5.13 tornano), Armi pesanti INT; SAG per la magia. Esclusioni espresse: Danno
    calibrato (SA30, SA50F: anche il +1 della Specializzazione della SA50F, finora mancante). Senz'armi
    1d4 + bonus; Arti Marziali 1d6; la Disciplina del Lottatore il suo dado se maggiore. Tolto il campo
    «danno senz'armi».
    → `data/regole.json` → `danno_caratteristica`, `attacco_ravvicinato.senz_armi.danno`; `src/calc.js`
    (`bonusDannoCaratteristica`, `caratteristicaDanno`); `src/equipaggiamento.js` (bonus nel danno di ogni
    arma e dell'attacco con lo scudo, `bonusCaratteristica`); `src/attacco.js` (`profiloSenzArmi`);
    `src/lancio.js` (danno della versione con SAG in «Lancia!»); SD, «Attacca!», SS.

45. **Spazzata** (E&L 6, A.27 e A.42; Giocatore §5.12). Bersagli adiacenti fra loro e tutti entro la
    portata, senza spostarsi (la sola portata non basta); una Prova, −4 contro due e −6 contro tre; ogni
    bersaglio con le sue Difese e la sua AR; per tutti anche senz'armi con Corpo a corpo; Spazzata
    Migliorata −2; oltre tre bersagli solo Combattimento Multiplo.
    → `regole.json` → `attacco_ravvicinato.manovre.spazzata` (`senz_armi`, TODO tolto); promemoria di «Attacca!».

46. **Sbilanciare e Disarmare** (E&L 7–8, A.28 e A.41; §5.12). L'attaccante dichiara prima del tiro se
    agisce senz'armi o con un'arma e usa l'Abilità di quel mezzo, non il VA maggiore; Prova contrapposta
    con −4 (−2 con la Migliorata); il bersaglio sceglie prima del tiro fra Atletica e Difese (Sbilanciare)
    o fra Corpo a corpo e l'Abilità dell'arma impugnata (Disarmare), se praticabili.
    → `prova.abilita: ["mezzo"]`, `prova.scelta_bersaglio`; `src/attacco.js` (niente più «il migliore»,
    `opposizione` nella dichiarazione, avviso finché non è scelta); pannello: scelta dell'opposizione.

47. **Incalzare** (E&L 9, A.24; §5.5). Normale Prova per colpire a −4 contro le Difese, non contrapposta;
    1 AzP, spinta 2 Q, nessun danno; Incalzare Migliorato aggiunge il danno. Già così: tolto «provvisorio».

48. **Mano non dominante** (E&L 10, A.23; §5.7). −4 salvo Ambidestro; con Combattere con due armi solo la
    penalità della manovra; Ambidestro non la riduce, Schermidore, Pistolero e Duellante sì. Già così:
    tolti TODO e «provvisorio».

49. **Magistrale e bonus fissi** (E&L 11, A.29; §§5.13, 1.6). I bonus ordinari (Colpo Mirato, Affondo,
    Carica Brutale, Caratteristica) si sommano prima del moltiplicatore; quelli espressamente dopo l'AR non
    si moltiplicano e richiedono almeno 1 danno residuo; ×2 diventa ×3, ×3 resta ×3; nelle applicazioni
    multiple solo la prima.
    → `attacco_ravvicinato.magistrale` (`promemoria`), nel risultato di «Attacca!» ravvicinato e a distanza.

50. **Copertura nel ravvicinato** (E&L 13, A.25; §5.8). Vale se l'ostacolo protegge davvero dalla
    direzione dell'attacco e la portata consente di colpire: Leggera −2, Media −4, Totale impedisce
    l'attacco diretto; Copertura Migliorata −4 / −6. Ora modificatore vero, non più promemoria.
    → `attacco_ravvicinato.copertura` (`bersaglio`, `bersaglio_migliorata`); la Copertura Migliorata del
    bersaglio anche a distanza (`attacco_distanza.copertura.bersaglio_migliorata`, stesso §5.8).

51. **Superiorità numerica** (E&L 14, A.26; §5.3). Ogni attaccante in ravvicinato contro lo stesso
    bersaglio: 1–2 → 0, 3–5 → +1, 6–7 → +2, 8+ → +3 VA, massimo +3; quanti partecipano davvero lo decide
    il Direttore.
    → `attacco_ravvicinato.superiorita_numerica`; campo «attaccanti in ravvicinato contro il bersaglio»
    nel pannello.

52. **Prove fisiche** (E&L 3, A.16; Giocatore §5.18). Lista di riferimento confermata (Armi da lancio,
    leggere, medie, pesanti, da guerra, da mischia, Corpo a corpo, Difese, Atletica, Furtività); conta
    l'azione, non la Caratteristica; il Direttore può aggiungerne; le penalità fisiche non si estendono a
    Potere né alle Salvezze (verificato con un test); prevalgono le indicazioni dello Stato.
    → `regole.json` → `categorie_prove` (`_nota_fisiche`, TODO tolto).

53. **Pesi mancanti** (E&L 4, A.30; Giocatore §5.2.6, Equipaggiamento §1.6). Si conta tutto ciò che si
    trasporta, senza doppioni; un peso mancante è «da definire», non 0 kg; il totale noto è parziale e
    non attesta l'assenza di penalità.
    → `src/carico.js` (`parziale`); SD: «N kg noti · M oggetti con peso da definire · totale parziale»,
    «almeno <livello>», niente «nessuna penalità»; SS: «da definire, totale parziale».

54. **Oltre il carico massimo** (E&L 5, A.31; §5.2.6). Oltre FOR × 20 kg Movimento 0 Q finché non si
    riduce il carico o non arriva un aiuto; −2 alle Prove fisiche; nessuna penalità alle Salvezze; le
    soglie modificate si applicano prima (Forza da Lavoro: massimo FOR × 40, trascinamento FOR × 80).
    → `carico.livelli.oltre_il_massimo` (`movimento_zero`); `src/carico.js`, `src/condizioni.js` (Passo 0,
    Corsa e Scatto non disponibili).

55. **Oggetti delle dotazioni senza scheda** (E&L 15, A.34; Equipaggiamento 0.3 §§4.2–4.3, Giocatore
    §2.16.29). Binocolo 0,8 kg e 500 crediti, Registratore audiovisivo 0,2 kg e 200 crediti; gli altri
    restano «da definire» (peso assente non è 0 kg, prezzo assente non dà credito di scambio) finché non
    arrivano i lotti dei cap. 2–6 dell'Equipaggiamento; gli oggetti della dotazione che non sono armamenti
    assegnati non si cedono.
    → `dotazioni.json` → `oggetti_dotazione` (`peso`, `costo`, `paragrafo`), `_nota_oggetti_dotazione`;
    `tools/genera_dotazioni.py`; `src/dotazioni.js` (il peso entra nella voce e nel carico); validatore.

56. **Pistole corporative** (E&L 16, A.33; E&L A.5.27 e A.5.30; Giocatore §2.16.27). Pistola
    semiautomatica di base: HG10 (Bauhaus), Bolter 10 (Capitol), P500 (Cybertronic), Nemesis 100
    (Fratellanza), Belliger (Imperiali), Ronin 25 AP (Mishima); Freelance commerciale. Il Revolver resta
    commerciale, senza la nota «da definire». Munizioni: il totale della Classe, la capacità del modello.
    → `dotazioni.json` → `corporativi.abbinamenti` (6 voci in più), `corporativi.commerciali`;
    `src/dotazioni.js` (`modelloAssegnato`).

57. **Ricarica di doppiette, fucili a pompa e revolver** (E&L 19, A.37; Giocatore §§5.1.1, 8.6.4). La
    ricarica segue il sistema di alimentazione del modello. Doppiette e fucili a pompa ordinari e di base
    (e archi e balestre): una operazione inserisce 1 munizione e costa 1 AzP; Ricarica Migliorata fino a 3,
    senza accelerare caricatori, celle o serbatoi. Ricarica Rapida: una operazione gratuita per Round,
    combinabile con la Migliorata. M310 e SA SG2001: caricatore amovibile specifico. Revolver: tamburo;
    scelta dell'app, una operazione riempie il tamburo con munizioni pronte (§5.1.1; come la Colt
    Hammershot degli Armamenti 0.54).
    → `munizioni.json` → `ricarica.inserimento_singolo` (`caricatore_amovibile`, `per_operazione`,
    `migliorata`), `ricarica.tamburo`, `ricarica.ricarica_rapida`; `src/ricarica.js` (modo «tamburo»,
    `perOperazione`); `src/sessione.js` (massimi con il Talento); SD: «Ricarica +1 / +3», promemoria di
    Ricarica Rapida.

58. **Anticipazione senza Addestramento Taumaturgo** (E&L 1, A.39.1; Magia §12.3). Confermata la colonna
    «altri utilizzatori» con un ulteriore −2: 1–3 → −2, 4–6 → −4, 7–9 → −6, 10–12 → −8, 13–15 → −10,
    16–18 → −12. La Prova di Potere resta obbligatoria; Anticipazione Migliorata toglie solo il −2
    aggiuntivo; l'Anticipazione ordinaria modifica un solo aspetto di una scala e raddoppia il costo base.
    Già così: TODO tolto (`regole.json` → `lancio.anticipazione._nota_altri`).

59. **Carica dei contenitori Chroma** (E&L 2, A.19; Magia §6). Acquistato: pieno. Trovato: la carica la
    stabilisce il Direttore; l'app la fa impostare, senza considerarla pari alla capacità.
    → `regole.json` → `chroma` (TODO tolto); voce dell'equipaggiamento `pm_iniziali` («Trovato» e «PM
    attuali» nella lista, `src/ui/equipaggiamento.js`); `src/sessione.js`: il contenitore nuovo parte da
    lì e, se il giocatore cambia il valore della voce, la sessione lo segue.

60. **Colpo Elementale** (E&L 17, A.39.2; Magia §§12.1–12.2, 13.1). Colpisce automaticamente (gittata,
    visibilità, ostacoli); Parata e Schivata sì, Elusione no. «Mod PS» solo per gli effetti secondari,
    dopo danno e Contromisure: Fuoco e Aria Riflessi, Gelo e Fulmine Tempra, Acqua e Terra nessuna; almeno
    1 danno residuo; una PS per tipo di effetto e per bersaglio a ogni lancio.
    → `incantesimi.json` (13.1: `salvezza`, `colpo`; da `tools/estrai_lancio.py`, CORREZIONI); «Lancia!».

61. **Rigenerazione** (E&L 18, A.39.3; Magia §§21.10, 12.4). Solo mediante Rituale; componenti,
    procedura e costo finale arriveranno con le regole dei Rituali; i PM della tabella sono la base del
    costo rituale; i tempi sono della rigenerazione dopo il Rituale; contatto durante il Rituale;
    bersaglio vivente e consenziente oppure incosciente e soccorso, senza PS; Anticipazione ordinaria non
    applicabile.
    → `incantesimi.json` (21.10: `procedura_rituale` «non_definita»); «Lancia!» la segnala e non calcola;
    il validatore accetta i campi mancanti per la procedura non definita.

Restano aperti di A.39 i punti 4 (tiro di contatto con i consenzienti) e 5 (Talenti fuori dal cumulo
della sez. 7).

## 30 settembre 2026 — manuali del 29/09 sera (Giocatore 23:45, Armamenti 0.55)

Non sono risposte a domande dell'app ma cambi di regola nei manuali, applicati come fonte corrente
(`docs/diff-manuali-2026-09-30.md`).

62. **Abbinamenti ottimizzati e Mantello Venusiano** (Armamenti 0.55 §§7.23.10–7.23.11). Le coppie
    armatura + rinforzo elencate restano nella categoria originaria anche ad AR 3 o più; il beneficio è
    della coppia, non del nome o del marchio. → `rinforzi.json` (`abbinamento_ottimizzato`, 10 voci nuove),
    `src/equipaggiamento.js`, validatore.

63. **Mishima: +1 ad Armi da guerra** (Giocatore §2.2, §2.17 del 29/09), non più ad Armi da mischia.
    → `corporazioni.json`.

64. **2 naturale Magistrale con VA finale ≥ 21** (Giocatore §1.6), nelle Prove di Abilità.
    → `regole.json` → `magistrale_naturale`; promemoria in «Attacca!» e «Lancia!».

65. **Categorie di competenza** (Giocatore del 29/09, 23:45: §1.2.1, §2.3, §2.13, §8.3, §8.4, §8.7), applicate il 30/09.
    È testo del manuale, non una risposta: si registra qui perché supera la decisione 33 (76 punti, basi 2–4,
    limite di Avanzamento 3). Dei 76 punti resta solo la conferma dei 10 Punti Abilità Liberi per assegnazione.
    Basi dalla prima Classe (S 7, P 6, G 5, N 3); VA personale = min(grezzo, limite della categoria migliore
    fra le Classi possedute); +1 di Classe sempre registrato; punti liberi solo dove aumentano il VA personale.
    → `classi.json` → `competenze`, `regole.json` → `competenze`, `src/competenze.js`, `calc.js`, `avanzamento.js`.
    Scelte provvisorie dell'app, in attesa di Davide: A.56 (vale il manuale del 29/09), A.57 (i punti già spesi
    che non aumentano più il VA si riassegnano, finché non si riassegnano non contano e l'avanzamento è bloccato),
    A.58 (il +1 di Corporazione sta sotto il limite).

## 2 ottobre 2026 — manuali ed E&L del 01/10 sera (21:25–21:50 UTC)

Ricognizione in `docs/diff-manuali-2026-10-02.md`; qui i lotti 1 e 2. Le decisioni 66 e 67 vengono dall'E&L
(«Regole consolidate — creazione di artefatti, batterie e Rigenerazione») e dai manuali; la 68 è testo dei
manuali; la 69 chiude in parte una domanda.

66. **Prezzi delle batterie mistiche** (A.14, già chiusa con 10.000 e 50.000; Armamenti §7.5, Magia §24.7,
    Equipaggiamento §9.3, E&L «Partecipazione e risorse»). Batterie da 5 PM: prezzo indicativo **1.000 crediti**
    le Rosse, Blu e Verdi, **5.000** la Bianca (200 e 1.000 crediti per PM; Chroma grezzo 100 e 400 per PM).
    Reperibilità, Qualità, PS, PI, peso, potenza e SnT restano quelli della decisione 31. «I prezzi restano
    soggetti al playtest e non garantiscono la reperibilità.» → `artefatti.json` (costo delle quattro batterie,
    `note_manuale`). Effetto: prezzo in Inventario e SS, materiali di «Ripara» (5% del prezzo per PI).

67. **Riserve integrate** (A.18; Magia §24.2 e §24.7, Armamenti §7.5). La riserva integrata di un Artefatto
    alimenta soltanto le funzioni di quell'Artefatto: «non permette di prelevare PM né di alimentare gli
    incantesimi personali». Conferma il «Nel frattempo». → `src/lancio.js` (`contenitoriLancio`: la riserva
    integrata non è più fra le fonti di PM di «Lancia!»; prima veniva offerta per un incantesimo della stessa
    macrofamiglia), testo della riserva nella tab Poteri e nella SS.

68. **SnT 0 con sole proprietà passive** (Armamenti 0.58 §7.10 e Magia §24.2 del 01/10 sera). «Un Artefatto con
    sole proprietà passive ha SnT 0, qualunque sia la sua potenza»; con almeno una proprietà attiva la SnT è il
    Grado finale (la tabella delle potenze). SnT è la sigla del costo di Sintonizzazione, distinta da SIN
    (interfaccia neurale). Controllo voce per voce: tutte le voci del catalogo hanno proprietà attive
    (attivazione offensiva o Scudo Magico, §7.5.1) o sono batterie autonome (SnT = Grado): nessuna SnT cambia.
    → `artefatti.json` → `sintonizzazione.solo_passive` e `proprieta_attive` per voce, validatore, Artefatto
    personalizzato con «Sole proprietà passive (SnT 0)», tab Artefatti e foglio 6 della SS.

69. **Ritualista Minore e Maggiore** (A.32, in parte; Magia §24.1 e §25.1). Diventano i requisiti operativi
    dell'Officiante: Ritualista Minore per i Gradi I–III, Maggiore per i Gradi IV–VI (infusione degli Artefatti
    Mistici e delle batterie autonome, Rituale di Rigenerazione). Conferma indiretta che i due Talenti sono
    definitivi; A.32 resta aperta per gli altri 16 Talenti. → `talenti_liberi.json` (fonte dei due Talenti;
    il testo aveva già i Gradi I–III e IV–VI).

70. **Rigenerazione: Rituale della sez. 25 e attivazione da Artefatto** (A.39 punto 3, già chiuso con
    «procedura non ancora definita»: supera la decisione E&L 18; E&L del 01/10 sera, Magia 21.10, sez. 25,
    §24.6, Armamenti §7.10). Esecuzione diretta: Rituale con un'unica Prova di Rituali dell'Officiante al
    termine (penalità del Grado: −4 per III, −6, −8, −10), Ritualista Minore per il Grado III, Maggiore per
    IV–VI; PM della tabella = **costo totale** (9, 10, 12, 15, 18), l'Officiante ne versa almeno il Grado;
    Canali fino al Grado, con aiuto al VA da +0 a +4 e massimo +5; celebrazione di 3, 3, 4, 6, 8 ore con
    contatto; reagenti 500 cr per Grado; Magistrale a metà PM e reagenti; Maldestro: niente nuovo Rituale per
    24 ore; interruzione: reagenti persi, PM no. Da Artefatto (§25.4): chi soddisfa la SnT lo attiva senza
    Ritualista, senza Prove e senza Canali; l'intero costo dalla riserva integrata Verde o Bianca; l'attivazione
    continua dura quanto la celebrazione. → `incantesimi.json` (Rigenerazione: `procedura_rituale`),
    `regole.json` → `rituali` (§24.6), `src/lancio.js` (`calcolaRituale`, `attivazioneInfusa`), «Lancia!»
    (passi Versione, Rituale, Risultato), tab Artefatti e «Da artefatti», Artefatto personalizzato con
    «Incantesimo infuso». Scelte provvisorie nella nuova domanda **A.74** (VA del Canale = Rituali;
    Magistrale: i Canali tengono la quota; PM solo personali; conta Ritualista, non il livello massimo).
71. **Attacchi e Difese con VA finale 20 o più** (A.78; E&L del 02/10/2026, «Risposte approvate ai 52
    riferimenti dell'app», decisione 3). Gli attacchi e le Difese attive si tirano anche con VA finale 20 o
    più; restano le eccezioni esplicite che colpiscono automaticamente (Colpo Elementale). Naturali
    Magistrali: 1 con VA finale 20, 1–2 da VA 21; con Successo Magistrale Migliorato 1–2 con VA 20 e 1–2–3
    da VA 21 (correzione al manuale: il 3 diventa Magistrale già da VA 21); il 20 resta Maldestro. Le altre
    Prove seguono il §1.7 (successo automatico da 20, salvo le Prove obbligatorie del §1.7.1). →
    `regole.json` → `prova` (`tiro_sempre`, `magistrale_migliorato`; TODO tolto), `src/prova.js`
    (`esitoProva` con `tipo`, `limiteMagistrale`), promemoria di «Attacca!» e «Lancia!» (`src/attacco.js` →
    `promemoriaMagistraleNaturale`).
72. **Batterie oltre i 5 PM: peso, Qualità, PS e PI** (A.75; E&L del 02/10/2026, decisione 16; Equipaggiamento
    0.5 §10.1). Tutte le Batterie del campionario usano il supporto base: 0,2 kg, Qualità Comune, PS Integrità 10,
    3 PI, anche oltre i 5 PM e anche per le Batterie Matrice; non vale per Pietra della Vigilanza e Guanti. →
    `artefatti.json` (19 TODO tolti; `tools/lotti/lotto_artefatti_cap10.mjs`, con il catalogo del cap. 10:
    Batterie Matrice, Schegge instabili, Pietra, Guanti). REP «Epica» nuova sigla (`index.json`, EP), con la
    domanda A.83 sulla Prova di ricerca.
73. **Katana Ryūjin** (A.62; E&L del 02/10/2026, decisione 15). Natura Naturale; attiva 1d8 + 1 + 1d6 con la
    proprietà Plasma, un solo colpo (Difese e AR una volta); «Plasma» non è una Natura. → `armi_corporative.json`
    (attivazione: natura Naturale, «anche» la proprietà Plasma).
74. **Esoscheletri e armature servoassistite** (A.63; decisione 18). NEC Rossi di formato dedicato al modello,
    con autonomia, ricarica e ricambio della scheda (XO-102 8 h, 1.500 cr; Vulkan 8 h, 3.000; APE 6 h, 2.000;
    Mk IV Felis 8 h, 2.000; Powersuit 8 h, 2.000; Shoa Ace Custom 6 h, 2.500; Demonhunter 6 h, 2.500);
    sostituzione 1 minuto; nessuna intercambiabilità implicita. → `alimentazione` in ore (riserva al tavolo).
75. **NEC Blu IAS** (A.64; decisione 20). 1.000 Lx = 20 cariche IAS da 50 Lx: Blink 20, Power Blink 10,
    Antigrav 20 Round, Mirrorshard 20 minuti, Disturbatore 20 Round, Silent 20 minuti; ricambio 1.000 cr,
    ricarica 50 cr in 1 ora, sostituzione 1 minuto a sistema spento. → `alimentazione` a usi dei 5 moduli.
76. **Modulo Blu del Gehemmapuker; niente travaso fra NEC** (A.67; decisione 14). Il Gehemmapuker usa
    `nec:modulo-blu` (2.500 Lx, 50 Lx per attacco, 50 getti; cambio 1 AzP); una sola voce di catalogo. Regola
    generale: l'energia di un NEC non si riversa in un altro; si sposta solo il NEC fisico. → `nec.json` (cella
    e compatibilità del Modulo Blu), voce `munizioni:pacco-nec-gehemmapuker` tolta con migrazione
    (`index.json` → `rif_sostituiti`), `regole.json` → `nec.travaso`; `src/ricarica.js` accetta un NEC come cella.
77. **Dotazioni con più schede** (A.65; decisioni 10 e 11). Nuova scheda «Corredo agricolo Standard —
    Allevamento» (2 kg, 200 cr, CO, +0); la coltivazione resta sugli Attrezzi agricoli di base. Strumento
    musicale portatile a scelta, acustico (2 kg, 400 cr) o elettronico (3 kg, 800 cr, NEC Verde compatto), senza
    sovrapprezzo. → `strumenti_professionali.json`, `dotazioni.json` (`rif_per_sotto`, sotto-scelta
    «strumento_musicale» nel wizard), `src/equipaggiamento.js` → `schedaDiDotazione`.
78. **Pasto con il Corredo da cucina** (A.66; decisione 19). 30 minuti per fino a quattro persone, senza Prova;
    NEC Rosso standard da 500 Lx, 50 Lx a preparazione (10); cambio 1 AzP; ricarica 1 ora, 5 cr. → TODO tolto
    (i dati coincidevano).
79. **Interfaccia neurale standard** (A.68; decisione 21). 3.500 cr + 2.000 di installazione, 2 UMN; profilo
    come la CYBERTRONIC; associazione a equipaggiamento CYBERTRONIC con 1 minuto e una Prova di Tecnologia.
    → `impianti.json` (prezzo: si compra).
80. **Cartuccia chirurgica e set chirurgico** (A.71; decisione 17). Un solo consumabile, «Cartuccia chirurgica —
    set sterile monouso», 500 cr o 2.500 per cinque, consumato all'inizio di ogni procedura. → `sanitario.json`
    (una voce, con la confezione), voci del set tolte con migrazione (la confezione diventa cinque cartucce).
81. **Rituale di Rigenerazione: i quattro punti** (A.74; E&L del 02/10/2026, decisioni 1, 2, 12, 13). 1. Il VA
    pertinente del Canale è il suo VA di Rituali (contributo +0…+4 per fascia, massimo +5 in tutto; il +2 della
    costruzione Magistrale del supporto è a parte e non consuma il limite). 2. Dopo un Successo Magistrale il
    costo si dimezza una volta (per eccesso) e la ripartizione è libera: somma uguale al nuovo costo, nessuno
    oltre la quota dichiarata, Officiante almeno metà Grado, ogni Canale con un contributo almeno 1 PM, quello con
    quota 0 resta a 0 (supera la scelta provvisoria «i Canali tengono la quota»). 3. Il Rituale diretto si paga
    solo con PM personali di Officiante e Canali; l'attivazione da Artefatto segue Esclusiva/Universale (§26.2).
    4. Le versioni dipendono da Ritualista (Minore 9–10, Maggiore 12–18) e dalla procedura, non dal livello
    massimo degli Incantesimi. → `regole.json` → `rituali` (`magistrale`, `bonus_costruzione_magistrale`,
    `decisioni`; TODO tolti), `incantesimi.json` (Rigenerazione: `decisioni`), `src/lancio.js` →
    `ripartizioneMagistrale`, passo Risultato del Rituale in «Lancia!» con le quote modificabili.
82. **Capolavoro del Corazzaio** (A.61, per il Corazzaio; E&L del 02/10/2026, decisione 4). Il «+1 Protezione»
    dell'armatura Capolavoro diventa +1 a una sola Contromisura numerica scelta alla costruzione (Ignifugo,
    Termico, Isolante, Dissipante, Imbottita, Anticorrosivo): assente vale 1, con valore X passa a X + 1; non
    aumenta l'AR né riduce i danni ai PV; Riflettente esclusa. → `classi.json` (Corazzaio:
    `capolavoro_armatura`, TODO tolto), scelta sulla voce dell'armatura (`capolavoro`) nell'Inventario,
    effetto «contromisura» nelle Resistenze e riga di provenienza nell'AR (`src/equipaggiamento.js` →
    `effettoCapolavoro`, `src/protezione.js`). Restano aperte per A.61 gli altri Talenti del censimento.
83. **Formato dei nemici** (A.73; E&L del 02/10/2026, decisioni 5–9). Formato confermato, a valori già
    calcolati e comune all'app e al futuro bestiario, con quattro campi in più: azioni per turno (AzP, AzM ed
    eccezioni), Contromisure con nomi e valori, Abilità rilevanti con VA, talenti e capacità speciali con effetto,
    costo e limiti. Le sei Caratteristiche nel bestiario, facoltative nell'app (mancante ≠ 0, nessun
    ricalcolo); parità d'Iniziativa DES → INT → 1d10 se manca una Caratteristica. Al tavolo PV attuali e
    massimi, Ferita e Menomazioni con la procedura dei PG (§5.14); nessun Affaticamento. Incantesimi con
    «Lancia!» quando ci sono nome, versione, VA di lancio e costo in PM (PM dalla riserva del nemico);
    incompleti, promemoria. Movimento: Passo obbligatorio, Corsa 2× e Scatto 3× se mancano, «non consentito»
    distinto da «mancante». → `data/formato_nemici.json` (TODO tolti, `decisioni`, `tavolo`, `contromisure`,
    campi `azioni`, `contromisure`, `abilita`, `capacita`, incantesimi con `livello`, movimento «non_consentito»),
    `src/validate.js` (`oppure`, sorgenti `abilita` e `contromisure`). Il Tavolo del Master (branch
    `tavolo-direttore`) applica Ferite, «Lancia!» e i campi nuovi.

## 3 ottobre 2026 — durate degli Incantesimi lanciati: domande aperte

Lavoro sulle durate degli Incantesimi (`tools/durate_incantesimi.mjs` → `incantesimi.json` → `meccanica.durata`,
`src/durate-incantesimi.js`). Una domanda nuova, nel pacchetto per il Doc «per-davide.md»:

- **A.88 — Durata a Concentrazione di Individuare** (Magia, scheda di Individuare). *In attesa.* La scheda fa
  scegliere fra Concentrazione e durata fissa, ma la tabella delle versioni dà solo la durata fissa: qual è la durata
  massima a Concentrazione di ogni versione? Nel frattempo l'app usa la durata fissa anche con Concentrazione e mostra
  la domanda nel riquadro «Durata e bersagli» di «Lancia!» (TODO(Davide) in `meccanica.durata`).

Scelte prese senza domanda, perché il manuale le dice:

- Scadenza: dal Round del lancio alla fine del Round R + N, il Round del lancio non conta (Magia, «Scadenze e
  interruzione degli effetti»: 5 RND lanciato nel Round 2 termina alla fine del Round 7), come `regole.json` →
  `durate_round`.
- Concentrazione: un solo incantesimo mantenuto; avviarne un altro a Concentrazione termina il precedente (Magia,
  «Durata e Concentrazione»).
- Scudo: con Concentrazione la durata massima è il doppio della durata fissa (`concentrazione_doppia`).
- Incantesimi Estesi non allunga da sé la durata: toglie il raddoppio dei PM quando si Anticipa la Durata, e la
  durata passa al gradino successivo della scala della scheda (sez. 12.3, `src/anticipazione.js`).
- Marchio Psichico: le durate per inseguimento e combattimento della seconda tabella della scheda mancavano nei
  dati; ora sono le colonne «Durata inseguimento» e «Durata combattimento» delle versioni.

## 3 ottobre 2026 — risposte ai 6 quesiti dell'app e 5 punti Abilità liberi (E&L del 03/10/2026)

Doc «E&L – Risposte e correzioni approvate», versione del 03/10/2026 14:13 UTC, blocco «Risposte approvate ai 6
nuovi quesiti dell’app e punti Abilità liberi» (testo in `docs/risposte-master-2026-09-26.md`).

84. **Pelle di Rinoceronte: manovre di forza** (A.81, risposta 1). Il +3 vale solo nelle Prove già previste da
    Immobilizzare (Corpo a corpo o Atletica per afferrare, resistere, mantenere la presa o liberarsi), Sbilanciare
    (Prova offensiva di Corpo a corpo e opposizione con Atletica), Disarmare (Prove offensive o difensive con Corpo a
    corpo) e Incalzare (Prova offensiva di Corpo a corpo); fuori dalle manovre, +3 ad Atletica solo per uno sforzo di
    forza (sollevare, spingere, trascinare, forzare un’apertura). Mai a Difese o all’Abilità dell’arma; nessun tiro in
    più; non a Attacchi normali, Stordire, Affondo, Spazzata, Colpo Mirato. → `tecniche_interiori.json`
    (`tools/effetti_tecniche.mjs`: usi specifici «Sforzo di forza», «Immobilizzare e opposizione a Sbilanciare»,
    «Immobilizzare, Sbilanciare, Disarmare, Incalzare»; `attacco.manovre_forza.manovre`), `src/attacco.js` (+3
    sommato in «Attacca!» quando la Prova usa Corpo a corpo, promemoria altrimenti). TODO tolto.
85. **Onda Interiore: bonus di SAG al danno** (A.82, risposta 2). Dado della Disciplina e del Grado, più il bonus di
    SAG del §5.13 (tetti +1/+2/+3 per livello), non FOR; Prova di Corpo a corpo, Vettore Distanza, danno Magico; il +2
    Ravvicinato di Pelle di Rinoceronte non si applica. → `tecniche_interiori.json` (`onda.bonus_caratteristica: "SAG"`),
    `src/attacco.js` → `profiloSenzArmi`. Corregge il provvisorio «bonus di FOR sì».
86. **Rinforzi indossati da soli e armatura tolta** (A.80, risposta 3). Indossabili da soli: tutti i soprabiti e
    mantelli, Tabardo consacrato e Sottogiacca protettiva IES; gli altri (kit, piastre, inserti, Rivestimento CS-R10,
    Rivestimento flessibile Ghost, Rinforzo flessibile Mortificator) solo montati. Profilo autonomo approvato: Rinforzo
    Leggero, AR 1 ordinaria, FOR 3, categoria Leggera (−1 VA al lancio con Potere, normali penalità per FOR
    insufficiente); PI, Qualità, PS, prezzo e proprietà della scheda, che valgono anche da soli. Con un’armatura
    compatibile il capo si usa come rinforzo e il profilo autonomo non si somma; togliendo l’armatura un rinforzo
    strutturale resta montato e non dà nulla, un capo autonomo che resta indossato usa il proprio profilo; più capi
    sovrapposti non aggirano i limiti. → `regole.json` → `rinforzi` (`da_solo.ar: "profilo_autonomo"`,
    `profilo_autonomo`, `uno_solo`, `decisione`; TODO tolto), `rinforzi.json` (`tools/lotti/lotto_rinforzi_armature.mjs`:
    16 indossabili da soli), `src/equipaggiamento.js` (penalità della categoria), `src/protezione.js` (AR).
87. **Granate e razzi senza bonus di Caratteristica** (A.86, risposta 4). Confermato il provvisorio: danno completo
    della munizione con i bonus fissi della scheda (Granata standard a frammentazione 1d6+1 a qualsiasi livello), per
    granate a mano, lanciagranate anche integrati e lanciarazzi. → `regole.json` → `danno_caratteristica.esplosivi`
    (`decisione`, TODO tolto).
88. **Individuare a Concentrazione** (A.88, risposta 5). La scheda 23.9 ha già la colonna «Concentrazione massima»
    (nei dati «Concentr. massima»): 6–8 10 minuti, 9–11 30 minuti, 12–14 1 ora, 15–17 2 ore, 18 4 ore; durata fissa
    5 RND, 10 RND, 20 RND, 5 minuti, 10 minuti. La modalità si sceglie al lancio; l’Anticipazione alza di un gradino
    solo la durata scelta. → `tools/durate_incantesimi.mjs` riconosce la colonna, `incantesimi.json` →
    `meccanica.durata.concentrazione` (TODO tolto).
89. **Reperibilità Epica** (A.83, risposta 6). EP fra Molto Rara e Leggendaria: ricerca con Oratoria −6 VA, se il
    Direttore stabilisce che esiste una possibilità concreta di reperimento (per gli Artefatti un’offerta o una
    commissione); un successo non obbliga a vendere né toglie prezzo, autorizzazioni o tempi. Batterie Matrice colorate
    Epiche, Bianche Leggendarie. → `equipaggiamento/index.json` → `reperibilita.EP` (TODO tolto).
90. **5 Punti Abilità Liberi a ogni Grado, compreso il primo** («Correzione aggiuntiva»). *Superata dalla decisione 92
    (7 punti, 04/10/2026).* Sostituisce i 10 del §2.13 e
    del §8.3 (Doc del 27/09, per-davide A.52): 5 alla creazione e ai livelli 4, 8, 12, 16 e 20. → `regole.json` →
    `creazione.punti_abilita_liberi: 5`, `avanzamento.eventi` → `punti_abilita:5`. I personaggi salvati con 10 per
    Grado hanno punti in eccesso: la scheda resta utilizzabile, l’avviso «Con la nuova regola di Davide hai X punti
    Abilità liberi in più del consentito: togline X» (`regole.json` → `regole_aggiornate.eccesso`) compare in testa
    alla SD, nella tab Abilità (con le Abilità che hanno ricevuto punti liberi), nella stampa e all’import; «Togli»
    toglie i punti un evento alla volta (`src/avanzamento.js` → `avvisoPuntiEccesso`, `statoRimozione`,
    `validaRimozione`, `applicaRimozione`; `src/ui/completa.js` → `renderTogli`). I PG d’esempio e il bestiario umano
    sono rigenerati con 5 punti. Il testo del Giocatore (§2.0, §2.13 con l’esempio dell’Agente, §2.17, §8.1, §8.3)
    dice ancora 10: errata proposta A.89. Nell’esempio del §2.13 Percezione 2 + Raggirare 4 non stanno più in 5 punti:
    i test usano Percezione 2 + Raggirare 3 (Percezione VA 12, Raggirare VA 11) finché Davide non rifà l’esempio.
91. **Incursore: Armi da guerra Professionale, Armi da mischia Generica** (Manuale del Giocatore §3.7, Doc del
    03/10/2026 19:16). Nel profilo di competenza dell'Incursore le due Abilità si scambiano di categoria; i conteggi
    2 S / 6 P / 12 G / 4 N e le basi 7/6/5/3 restano. → `classi.json` → Incursore `competenze` (`versione_manuale`
    aggiornata al Doc del 03/10). Conseguenze: *Armi da guerra* guadagna +1 di base (5 → 6) e il limite del VA
    personale sale alla fascia P (9 al I Grado, 19 al VI); *Armi da mischia* perde 1 di base (6 → 5) e scende alla
    fascia G (7 al I Grado, 17 al VI), **pur restando una delle cinque Abilità di Classe** che ricevono +1 per Grado:
    quei +1 si registrano sempre ma, oltre il limite G, restano inattivi (§8.3, `src/competenze.js` → `puntiUtili`),
    e i punti liberi già spesi che non aumentano più il VA si riassegnano con «Assegna». I tre Eretici del bestiario
    umano e l'Eretico corrotto del Bestiario proposto (§5.5.1) combattono da Incursore: il VA del Pugnale da
    combattimento cala di 2 a ogni grado (9/11/13 → 7/9/11) e i «Round per abbattere un PG» della taratura salgono
    (9 → 11,6; 8,9 → 11,2; 6,6 → 8). Esempi e bestiario umano rigenerati, `docs/bestiario/bestiario.md` e `.html`
    aggiornati.

## 4 ottobre 2026 — 7 Punti Abilità Liberi (Davide a Marcello, risposta alla A.90)

Messaggio di Davide a Marcello del 04/10/2026, in risposta alla A.90 («Punti Abilità Liberi: 5 o 7?»): «non vedo le
modifiche che ho fatto ieri, quelle delle abilità (7 punti invece che 5) e della modifica dell'incursore».

92. **7 Punti Abilità Liberi a ogni Grado, compreso il primo** (A.90; fonte: Davide a Marcello, 04/10/2026). Vale il
    Manuale del Giocatore del 03/10/2026 sera (§2.0 passo 5, §2.13, §2.18, §8.1, §8.3, §8.7): 7 alla creazione e ai
    livelli 4, 8, 12, 16 e 20. L'E&L del 03/10 con 5 punti (decisione 90) e il Manuale dei Mostri §5.2 sono superati.
    → `regole.json` → `creazione.punti_abilita_liberi: 7`, `avanzamento.eventi` → `punti_abilita:7`. Personaggi
    salvati: chi ha 5 punti per Grado ha 2 punti da assegnare per evento, con l'avviso «Con la regola aggiornata di
    Davide hai X punti Abilità liberi ancora da assegnare» (`regole.json` → `regole_aggiornate.mancanti`) e
    «Assegna»; chi ne ha 10 ha 3 punti in eccesso per evento, con l'avviso e «Togli» già esistenti (testo
    `regole_aggiornate.eccesso`, ora «Con la regola aggiornata di Davide…»). Nessun punto si toglie o si aggiunge da
    solo. L'esempio del Mishima Agente del §2.13 torna quello del manuale (Percezione 2, Tecnologia 1, Cultura 1,
    Raggirare 3): i test lo usano. PG d'esempio e bestiario umano rigenerati con 7 punti.

## 5 ottobre 2026 — risposte in blocco (E&L del 05/10/2026), primo lotto applicato

Fonte: E&L del 05/10/2026, «Risposte approvate — aggiornamento dei quesiti aperti» (testo in
`docs/risposte-master-2026-09-26.md`, ricognizione in `docs/ricognizione-2026-10-05.md`). Qui le voci applicate;
le altre si registrano lotto per lotto.

93. **Dotazioni collegate alle schede del catalogo** (A.34). Gli oggetti della dotazione sono voci della loro scheda
    di catalogo (con il nome della dotazione in `nome_dotazione` se differisce), non voci personalizzate; i PG salvati
    si migrano all'apertura (`migraVociDotazione`, stessi uid, stato, quantità e PI attuali). Cassetta degli attrezzi,
    Attrezzi agricoli di base, Corredo agricolo Standard per allevamento: Comune, PS 10, 4 PI; Corredo artigianale
    professionale e Corredo di analisi da campo: Non comune, PS 12, 4 PI (`strumenti_professionali.json`). Lo
    scambio al 100% resta solo per gli armamenti ammessi.
94. **ASA Scout MK4: profilo e dotazione approvati** (A.101). Valore 202.520 cr con le voci; M606 dal catalogo
    (19.000 cr, 3 cr a colpo, 400 caricate + 800 di riserva); copriruote 150 cr e sollecitazione delle Terre del
    Fuoco (PS fallita: −1 PI al copriruota attivo o alla Propulsione); trazione Rossa in due banchi da 50.000 Lx,
    200 Lx/km, 100 Lx/ora da fermo, ricambio da 50.000; Modulo Verde 10.000 Lx con supporto vitale 200 Lx/ora e
    ricambio; aria 8 ore fisse + 2 bombole da 8; riparazioni 300/250/500 cr per PI, officina 100 cr/ora, corredo di
    manutenzione +2 a Tecnologia; dotazione sanitaria e accessori nel testo della dotazione. → `data/veicoli.json`,
    `src/veicoli.js` (`energia`, `munizioni`, `consumaRisorse`, `installaRicambioEnergia`,
    `munizioniArmaVeicolo`, `sollecitazioneFallita`), tab Veicoli e foglio Veicoli della SS. Il vecchio
    `nec: { lx }` riempie i banchi in ordine; le riserve che il file non aveva partono dalla dotazione approvata.
95. **Autovettura civile: REP Comune** (A.102).
96. **Esempio del §4.3 generico** (A.103): lo Scout resta Corazzato 1; prima la PS, poi Corazzato, minimo 0
    (`veicoli.json` → `danno.esempio.nota`; motore già conforme).
97. **Andatura attuale e scelta** (A.104): `andatura` è quella attuale, `andatura_scelta` quella da adottare;
    «Esegui il cambio» sposta l'attuale di una fascia (1 AzM), fuori dal Round si può impostare subito.

98. **Attacco a distanza: sette chiarimenti** (A.38). (1) Movimento Tattico e Movimento Fluido si sommano fino ad
    annullare la penalità del proprio movimento (Scatto −6 → −4 → −2). (2) Attaccare dalla Copertura: 1 AzM + 1 AzP,
    uscita e rientro entro 6 Q; dal livello 12 le due AzP prima di completare il movimento (promemoria). (3) Seconda
    Prova a −4 con i soli modificatori personali, Fuoco di Precisione −2, Fuoco Controllato la elimina: già così.
    (4) Mira Selettiva: già così. (5) Imbracciare costa 1 AzM, senza Prova; Imbracciatura Rapida gratuita una volta
    per Round; il movimento la fa perdere. (6) Tiro a Bruciapelo Migliorato contro chi impegna al Contatto: penalità del
    Tiro Ravvicinato e danno ×2 senza +3/+5: già così. (7) Movimento Evasivo: almeno 1 Q, non con «Fermo»; il bersaglio
    ha anche il Passo. → `regole.json` → `attacco_distanza` (`copertura.due_azp_dal_livello`,
    `imbracciatura.azioni_movimento`, `testo_a38`), `src/attacco.js`, `src/ui/attacco.js` («Imbracciatura»: già,
    ora, senza).

## Domande aperte sui Veicoli (lotto 2 del 04/10/2026)

Il Manuale dei Veicoli 0.2 è completo di numeri e il lotto 2 (dati e motore) non ha dovuto inventare nulla. Restano
questi punti, con un `TODO(Davide)` dove serve; nel pacchetto per il Doc «per-davide.md» sono A.91 e A.101–A.105 (la domanda «di chi è il veicolo», chiamata prima A.100, è un doppione di A.91 ed è unificata lì: il numero A.100 resta inutilizzato).

- **A.91 — Di chi è il veicolo** (unificata il 04/10: era anche A.100, doppione). L'ASA Scout è «il vostro Scout»: un mezzo per tutta la squadra. Scheda del gruppo,
  come il deposito comune, o voce del personaggio che lo possiede? E PI, andatura e autonomia li tiene il Direttore o
  il giocatore? Il modello dati di `src/veicoli.js` va bene in entrambi i casi. **Decisione provvisoria di Marcello
  (04/10/2026, lotto 3), finché Davide non risponde:** il veicolo sta nel file del personaggio che lo possiede
  (`scelte.veicoli`, scritto solo se non vuoto), con una casella «Veicolo del gruppo» solo informativa: nessuna
  sincronizzazione fra le schede, PI, andatura e NEC li aggiorna chi ha la scheda (`data/veicoli.json` → `personaggio`,
  con il `TODO(Davide)`). Se Davide sceglie la scheda del gruppo cambia solo dove si salva.
- **A.101 — I «da definire» della scheda dello Scout.** Formato e numero delle bombole del supporto vitale, consumo in
  Lx/km e autonomia di viaggio, scorte energetiche di partenza, prezzo completo e costi di riparazione per PI delle
  tre strutture. Nei dati sono `null` con il `TODO(Davide)`: «un dato indicato come da definire non vale 0 e non
  costituisce una dotazione gratuita» (§8.1).
- **A.102 — Reperibilità dell'autovettura civile.** Il §9 dice «Da definire nel catalogo». Le altre voci del catalogo
  hanno una Reperibilità (`equipaggiamento/index.json` → `reperibilita`): quale ha l'autovettura?
- **A.103 — Esempio del §4.3 e Corazzato dello Scout.** L'esempio della procedura usa Corazzato 2, mentre lo Scout ha
  Corazzato 1: è solo un esempio generico o un mezzo diverso? Nei test ho verificato la procedura con entrambi i
  valori, e torna; serve solo sapere se la scheda dello Scout è giusta.
- **A.104 — Collisione contro un bersaglio che deve ancora muoversi.** Il §6.3 dice che «A conserva l'andatura anche
  se deve ancora muoversi alla propria Iniziativa», e il §2.2 che «un veicolo che deve ancora muoversi alla propria
  Iniziativa conserva l'andatura corrente ai fini di attacchi e collisioni». Quindi per i Q di riferimento vale
  l'andatura *dichiarata* anche se il mezzo in quel Round non si è ancora mosso: confermi?
- **A.105 — Veicoli in uno scontro della plancia.** Il mezzo non ha Iniziativa propria (§1.3), quindi non è un
  partecipante dello scontro, ma ha tre riserve di PI e una procedura di danno sua. Nella plancia lo mettiamo come
  carta collegata al conducente (si muove alla sua Iniziativa) o come partecipante a sé con l'Iniziativa del
  conducente? È il lotto 4 della ricognizione, serve prima di scrivere l'interfaccia.

## Domande aperte sugli impianti (censimento del 04/10/2026)

Il censimento degli impianti (`docs/censimento-impianti.md`) ha trovato i numeri del manuale già nei dati, salvo il +1 danno del Braccio potenziato. Era generale e il §7.5 lo limita «agli attacchi ravvicinati effettuati con quell’arto»: è stato corretto senza domanda, perché il testo è chiaro. Resta un punto, con il `TODO(Davide)` in `data/equipaggiamento/impianti.json`:

- **A.106 — Penalità per scarsa illuminazione.** La Visione notturna «entro 80 Q elimina le penalità per scarsa
  illuminazione» (Equipaggiamento §7.4); lo stesso fanno il visore dell'elmetto e il modulo del mirino (Armamenti).
  Il Manuale del Giocatore non dà un valore per queste penalità, quindi la scheda non ha un numero da togliere e
  l'impianto resta un promemoria. Quanto vale la penalità (per esempio −2 in penombra, −4 al buio con luce residua)
  e a quali Prove si applica: Percezione, attacchi, altro?
