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
