# Per Davide — domande aperte ed errata dei manuali

Aggiornato al 26 settembre 2026, sera (dopo il confronto fra i Google Doc e i PDF). Questo è l'unico elenco da tenere d'occhio. Le voci con risposta spariscono da qui e finiscono, con la data, in `docs/risposte-master.md` (che in caso di conflitto vale più del manuale).

Come rispondere: a voce a Marcello, oppure scrivendo direttamente sotto la domanda nel Google Doc. Ogni domanda dice cosa fa l'app *nel frattempo*, così se non rispondi non si blocca nulla: applica un'ipotesi e la segnala.

---

## 0. Risposte ricevute il 26/09 — grazie

Le voci A.1–A.4 (descrizioni delle Caratteristiche e Volontà su CAR, 14 schede dei Talenti di magia, Potenziale Mistico solo per gli Usufruitori, tipo di tre Talenti Liberi) sono **recepite nell'app** e registrate con la data in `docs/risposte-master.md`; i testi completi sono in `docs/risposte-master-2026-09-26.md` (copia del Google Doc *E&L – Risposte e correzioni approvate*).

Dalle versioni del pomeriggio dello stesso Doc:
- **durata di tre Tecniche Interiori** (la vecchia A.5): recepita;
- **equipaggiamento iniziale** (A.6): tutte le 25 dotazioni di Classe, gli armamenti corporativi di base, i crediti iniziali e gli acquisti (27/09, E&L A.5.4–A.5.29): recepiti nel passo «Equipaggiamento iniziale». Restano da definire gli abbinamenti commerciale → corporativo (A.5.27).

---

## 1. Domande che bloccano un lavoro in corso

Rispondere a queste per prime: senza, tre funzioni restano ferme.

### Chroma (sessione 2: Convertire Potere, ricarica, prelievo)

**A.18 — Le riserve integrate nelle armi pagano gli incantesimi?**
La Magia (sez. 6) chiama contenitore "qualunque oggetto che racchiuda un Chroma". Il §7.5.1 degli Armamenti descrive la riserva del Bordone Templare (e di Vindicator, Deliverer, Castigator, Demontooth, Scudo delle Guardie Sacre) come "cinque cariche" per le attivazioni. Un Taumaturgo può usarla per lanciare incantesimi Fisici, o convertirla in PM personali? O alimenta solo l'oggetto?
*Nel frattempo:* l'app la mostra come contenitore integrato, PM contati a mano, non usabile per i lanci.

**A.19 — Un contenitore acquistato o trovato è carico?**
Il manuale non lo dice.
*Nel frattempo:* pieno (PM attuali = capacità), poi il giocatore lo scala con il −.

**A.20 — Prelievo dal Chroma Bianco senza Addestramento Taumaturgo.**
"Un personaggio cosciente può prelevare PM da un contenitore Bianco sintonizzato": vale per chiunque, anche un Combattente senza magia? O serve almeno l'accesso alla magia?
*Nel frattempo:* non ancora implementato; è la domanda che decide come.

### Attacco corpo a corpo (utility al tavolo)

**A.22 — Danno base senz'armi.** Nessun manuale lo scrive. Serve il dado (e se FOR aggiunge qualcosa).

**A.23 — Mano non dominante.** Ambidestro (§8.6.1) "elimina il normale −4 VA quando si usa soltanto la mano non dominante", ma quel −4 non è definito da nessuna parte. Confermi −4 alle Prove per colpire con la mano non dominante?

**A.24 — Incalzare (§5.5).** È una Prova per colpire contro le Difese o una Prova contrapposta?

---

## 2. Domande di rifinitura (l'app ha già un'ipotesi ragionevole)

### Regole generali

**A.32 — 18 nuovi Talenti magici e mistici (Magia sez. 1, Giocatore §8.6.8, Doc del 27/09).** Nella copia condivisa sono comparse 18 schede nuove (Potere Mistico, Recupero Mistico, Escludere la Componente Somatica / l’Invocazione / il Focus, Concentrazione Migliorata e Operativa, Incantesimi Ampliati, Estesi, Proiettati, Plurimi, Intensificati, Anticipazione Migliorata, Incantesimi Inarrestabili e Massimizzati, Manifestazioni Occultate, Ritualista Minore e Maggiore) e la Concentrazione su un Incantesimo passa dalla Prova di Potere alla PS di Volontà. Non sono fra le risposte approvate del Doc E&L: sono definitive?
*Nel frattempo:* l'app le recepisce dal manuale condiviso (fonte corrente): Talenti acquisibili con il testo della scheda, Potere Mistico +5 PM Massimi per acquisizione; «possedere una riserva personale di PM» vale per tutti.

**A.33 — Armamenti corporativi di base: gli abbinamenti (E&L A.5.27, Giocatore §2.16.27).** La regola dice che la Classe assegna il modello di base della propria Corporazione che corrisponde al profilo commerciale; gli abbinamenti puntuali restano da completare. Per ogni Corporazione servono: profilo commerciale delle tabelle (Pistola semiautomatica, Revolver, Carabina, Fucile a pompa, Fucile d'assalto, Fucile di precisione, armi da mischia, Armatura civile leggera e media, Scudi) → modello corporativo, con munizioni e accessori compatibili.
*Nel frattempo:* si assegna il profilo commerciale con la nota «modello corporativo da definire (A.5.27)». Gli abbinamenti vanno in `data/dotazioni.json` → `corporativi.abbinamenti` e l'app li usa subito.

**A.35 — Acquisti iniziali: valore ceduto maggiore del prezzo (§2.16.29).** Il paragrafo dice che si paga la differenza; se gli armamenti ceduti valgono più del nuovo oggetto (per esempio si cede l'armatura da 1.500 per un'arma da 800), la differenza torna in crediti o si perde?
*Nel frattempo:* il conguaglio non scende sotto zero (la differenza si perde) e l'app lo segnala accanto all'acquisto.

**A.37 — Ricarica di fucili a pompa e doppiette (Armamenti §7.20.2, Giocatore §5.1.1).** Il §7.20.2 esclude dai caricatori amovibili i revolver e i «serbatoi fissi». La scheda tratta come armi a inserimento (si infilano le cartucce sciolte fino alla capacità) i revolver, i fucili a pompa e le doppiette, commerciali e corporativi (famiglie «Revolver», «Fucili a pompa», «Fucili a pompa e doppiette»), compresi M310 (capacità 20) e SA SG2001 (capacità 10). Tutte le altre armi a proiettile usano un caricatore amovibile. È corretto?
*Nel frattempo:* `munizioni.json` → `ricarica.inserimento_singolo`; per cambiare un'arma basta spostarla da lì.

**A.36 — Effetti degli oggetti: situazionali o per un uso specifico? (docs/effetti-oggetti.md)** La scheda distingue i bonus che il giocatore accende al tavolo quando ricorre una circostanza (corredo di sopravvivenza nell'ambiente scelto, abiti eleganti in un ambiente formale) da quelli che valgono solo per un tipo di Prova (valigetta: esaminare tracce; kit: pronto soccorso), mostrati a parte. Casi da confermare: Binocolo e corredi da ricognizione («dettagli lontani», «osservazioni attraverso le ottiche») trattati come situazionali; Corredo di orientamento come uso specifico; il «+2 VA a Medicina» dei Kit trauma limitato al pronto soccorso. Inoltre: fra i bonus degli oggetti per la stessa Prova vale solo il maggiore (Giocatore §1.4.1, «un solo modificatore complessivo per la qualità degli strumenti»), anche per abiti e binocolo: va bene?
*Nel frattempo:* classificazione e regola come descritto; nessun effetto cambia il totale da regole né la stampa, tranne la penalità dell'armatura al lancio con Potere, che compare nel foglio Magia.

**A.34 — Oggetti della dotazione senza scheda di catalogo (§2.16).** 44 oggetti delle dotazioni non hanno ancora peso, prezzo e Qualità: gli 11 della dotazione comune, poi Binocolo, Registratore audiovisivo, Monocolo periscopico, Rilevatore ambientale, Comunicatore da squadra, Tenda, Lampada frontale, Lanterna elettrica, Maschera filtrante, Kit di videosorveglianza, Focus personale, Testo dottrinale e i Corredi (sopravvivenza ambientale, orientamento, assalto verticale, scasso, camuffamento, agricolo, artigianale, manutenzione, elettronico, ricerca documentale, analisi da campo, amministrativo, scenico, rituale), Abiti eleganti e da viaggio, Completo cerimoniale, Strumento musicale, Terminale multimediale, Ricarica per il Kit trauma. Arriveranno con i cap. 2–8 del Manuale dell'Equipaggiamento?
*Nel frattempo:* entrano nell'inventario come voci personalizzate senza peso né prezzo (il carico non li conta) e non si possono cedere negli acquisti iniziali (§2.16.29 vale per gli armamenti di base). Gli effetti numerici scritti nel §2.16 (per esempio +2 VA a Sopravvivenza nell'ambiente scelto) sono registrati nei dati e mostrati nella scheda come nota.

**A.30 — Pesi degli oggetti (Equipaggiamento §1.6, §1.10).** Il carico si calcola sul peso di tutto ciò che si porta, e la scheda standard del §1.10 prevede il campo Peso, ma il Manuale degli Armamenti non dà pesi per armi, armature e scudi. Li aggiungerai ai cataloghi?
*Nel frattempo:* l'app conta solo il peso degli oggetti personalizzati (campo «Peso») e il peso aggiuntivo scritto in modalità tavolo; elenca gli oggetti senza peso.

**A.31 — Carico oltre il massimo (§5.2.6).** Oltre FOR × 20 kg il carico "non può essere sollevato o trasportato". Se la lista dell'equipaggiamento supera il massimo, il personaggio che cosa subisce finché non lascia qualcosa?
*Nel frattempo:* le stesse penalità del Sovraccarico, con l'avviso che il carico non si trasporta.

**A.15 — Salendo di livello aumentano anche PV e PM attuali?** Il cap. 8 dice di quanto crescono i massimi, non cosa succede agli attuali di un personaggio ferito. Solo Buona Costituzione lo dice ("i PV attuali aumentano di 5").
*Nel frattempo:* se i massimi salgono di N, anche gli attuali salgono di N (40/47 + 6 PV → 46/53); annullando un livello, l'inverso.

**A.16 — Quali Abilità sono "fisiche"?** Immobilizzato (−4 alle azioni fisiche), Rallentato (−2 alle Prove fisiche e alle Difese) e il carico (§5.2) non dicono quali Abilità contano.
*Nel frattempo:* tutte quelle di Distanza e Ravvicinato, più Atletica e Furtività.

**A.17 — Terrorizzato vale anche per le Salvezze?** Il §5.18 dice "−4 VA a tutte le Prove".
*Nel frattempo:* sì, Abilità e Salvezze; Incendiato (−2 VA) solo Abilità.

### Manovre ravvicinate

**A.25 — Copertura nel corpo a corpo.** Vale anche per gli attacchi ravvicinati?

**A.26 — Ingaggio multiplo.** Esiste una regola? *Nel frattempo:* solo il modificatore di circostanza del §1.4.

**A.27 — Spazzata.** Colpisce bersagli adiacenti all'attaccante o adiacenti fra loro?

**A.28 — Sbilanciare e Disarmare.** Chi sceglie la Difesa del bersaglio?

**A.29 — Magistrale.** Raddoppia anche i bonus fissi di Colpo Mirato e Affondo?

### Chroma, non bloccanti

**A.14 — Batterie da 5 PM: prezzo e profilo (§7.10).** Il manuale le cita come esempio (Rosso, Blu, Verde Comuni costo 1; Bianco Non Comune costo 2) ma senza prezzo, PI, Qualità, reperibilità. Ci dai i valori, o le togliamo finché non escono?

**A.21 — Chroma Viola.** Regole rimandate. *Nel frattempo:* si può registrare un contenitore Viola come oggetto inerte (capacità, PM, sintonizzazione, nessun incantesimo alimentato). Va bene?

### Armamenti: Specializzazioni e famiglie

Le tabelle corporative non dicono la famiglia dell'arma, che serve per la Specializzazione (§8.8.1). Finché non rispondi, per queste armi nessuna Specializzazione dà +1.

**A.7 — Pistola mitragliatrice compatta.** Nel §7.7 sta fra le Pistole, ma ha Raffica Breve e Media. *Nel frattempo:* Pistole. Vale Mitragliatori, o entrambe?

**A.8 — Pugnale e Ascia leggera lanciati.** *Nel frattempo:* al lancio Armi da Lancio, in mischia la famiglia (Coltelli e pugnali, Asce). Al lancio vale invece la famiglia, o entrambe?

**A.9 — 12 armi ravvicinate corporative (§7.1.9).** Proposta: Katana, Wakizashi, Lama Mushashi, Lama Demontooth → Spade; Kriss → Coltelli e pugnali; Nunchaku, Nunchaku elettrificato, Catena chiodata → Armi flessibili; Bordone Templare → Mazze e bastoni; Elettrosega CSB600, Chainreaper, Sbudellatrice → **?**

**A.10 — Scudo delle Guardie Sacre, lama estratta.** §7.1.9: 1d6+1+1d4; §7.4.10: 1d6+1d4. Quale? *Nel frattempo:* l'app mostra 1d6+1 senza lama e cita entrambi.

**A.11 — 16 armi a distanza corporative (§7.8).** Proposta: Eruptor, Mefisto, Archer, Assailant → Fucili di precisione; M50, AR3000, Volcano, Invader, Shogun → Fucili d'assalto; Justifier, Purifier → Mitragliatori; Panzerknacker, Mandible, Interceptor, Airbrush, Windrider N4 → Carabine.

**A.12 — Specializzazioni per analogia.** Come nel §7.7: le Armi leggere corporative sono Pistole (MP105, P1000, Nemesis 210…), le pesanti a raffica Mitragliatori (MG40, Deathlock Drum, Kensai…), le armi Plasma → Armi al Plasma (anche la pistola Hellblazer). 26 armi: se una va altrove, dillo.

**A.13 — Rainy Dayer (§7.14.6).** Armi medie, gittata 30 Q, due mani. Proposta: Carabine.

---

## 3. Da correggere nella prossima edizione dei manuali

Decisioni già prese o errori evidenti: l'app segue la decisione, il testo stampato dice ancora altro. Spunta quelle già sistemate nel manuale condiviso.

**Manuale del Giocatore**

- ~~§1.2.3, §2.11, §2.14: la Prova Salvezza Volontà usa CAR~~ — fatto nel Google Doc (verificato il 26/09).
- ~~§3.5.2 Esploratore: Specializzazioni dei Talenti a scelta~~ — fatto nel Google Doc (verificato il 26/09).
- §2.12 e §3.3: al 1° livello sono massimizzati sia i PV sia i PM. Il Google Doc dice ancora solo i PV.
- §2.10, §3.8: "minimo 1" ai "2 + Mod INT incantesimi". Nel Google Doc c'è nella Magia (sez. 1), non ancora nel §2.10 del Giocatore.
- §3.5.3 Bersaglio Designato: impaginazione rotta nel PDF.
- §8.6 Attivazione Tempestiva: sta prima del §8.6.1, fuori da ogni sottosezione.

**Manuale della Magia**

- Sez. 1: livello massimo incantesimi = tabella I→3, II→8, III→11, IV→14, V→17, VI→18, non "3 × Gradi". Il Google Doc dice ancora "3 volte i Gradi taumaturgici complessivi".
- ~~Sez. 1: la frase "con i cinque Talenti liberi ordinari…" come esempio~~ — fatto nel Google Doc (verificato il 26/09).
- Sez. 1, scheda di Potenziale Mistico Migliorato: manca la riga «Ambito: il Talento è riservato agli Usufruitori di Magia e non si applica all’Addestramento Taumaturgo» della risposta A.2.2. La regola è comunque scritta nel paragrafo «Conoscenza e livello massimo»: solo testo.

**Manuale degli Armamenti**

- §7.1.9, §7.8, §7.9: "Imperiali" vs "Imperial" (§7.4.8, §7.14). L'app usa "Imperial".
- §7.9: mancano le tabelle prezzi delle armi a distanza di Fratellanza, Imperial e Mishima (i prezzi sono nelle schede del §7.8; le 146 righe presenti coincidono).
- §7.13.2 / §7.15.3, §7.16.2, §7.17.3: "Articolazione da tiro" vs "di tiro".
- §7.16.2 Armatura Ashigaru: "Manutenzione agevolata" = "Manutenzione semplice" (§7.11.4)?
- §7.11.5: "Agenti equipaggi e Guardie" senza virgola.
- §7.4.1 / §7.4.2 Scudo Punisher: "Grande" vs "Medio".

---

## 4. Da rileggere (testi scritti da noi, non dal manuale)

- **Promemoria degli Stati (§5.18)**: 11 righe di riassunto nella scheda digitale, marcate "(riassunto, non testo del manuale)". Correggi quelle che non ti tornano.
- **Talenti nella stampa**: il foglio 2 stampa la prima frase di ogni Talento. Se preferisci un riassunto tuo, si aggiunge un campo.

## 5. Manuali che l'app aspetta

- Dal 26/09 i manuali sono Google Doc condivisi: l'app li rilegge a ogni sessione (`docs/manuali-drive.md`), non servono più i PDF.
- Manuale dell'Equipaggiamento: il cap. 1 (0.1) è recepito (carico, PS Integrità per Qualità). Aspettiamo i cap. 2–8 e i cataloghi.
- Manuale dei Veicoli (in stesura).
- Manuale degli Armamenti v0.50: estratto per intero. Restano rimandati dal manuale le Prove Salvezza, i tempi di ricarica e i ricambi del Cuirassier Attila (§7.18.1). Se esce una v0.51, avvisaci.
