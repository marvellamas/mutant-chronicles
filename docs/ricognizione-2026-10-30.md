# Ricognizione dei manuali — 30 ottobre 2026, pomeriggio

Solo lettura: nessuna modifica al codice, ai dati né ai PG. Scritti soltanto i documenti (questo, il pacchetto per il Doc `docs/pacchetto-per-davide-2026-10-30-ricognizione.md`, il registro `docs/manuali-drive.md`, i testi in `docs/manuali-txt/`, la copia di `docs/per-davide.md` e le risposte in `docs/risposte-master.md`).

## 0. Che cosa ho letto davvero (ricerca rifatta)

Ricerca per cartella (`parentId` della cartella di Davide, `pageSize` 100, tutte le pagine fino a risposta senza token: **24 file in 2 pagine**), poi per proprietario (`davpoli1972@gmail.com`, modificati dopo il 27/10, 2 pagine) e fra i condivisi (modificati dopo il 28/10, 1 pagina). Tutti i formati: Google Doc, .docx, .html, .xlsx, .zip, .pdf e la scorciatoia.

| Documento | Edizione letta | Modificato (UTC) | Rispetto a ieri |
|---|---|---|---|
| Manuale degli Armamenti | **0.70** | 30/10 08:27 | **nuovo**: ieri 0.68 |
| Manuale dell'Equipaggiamento | **0.24** | 30/10 08:24 | **nuovo**: ieri 0.22 |
| Revisione NEC — Registro unico (Word; il titolo del file dice «v2.9») | **2.9** | 30/10 08:24 | **nuovo**: ieri 2.7 |
| Manuale dei Veicoli | 0.9 | 29/10 17:23 | letto per intero adesso |
| ASA Scout MK4 — scheda | 0.5 | 29/10 17:18 | letto per intero adesso |
| Neverlost — scheda tecnologica (Word) | 1.6 | 29/10 17:23 | letto per intero adesso |
| Scudo Punisher Wächter (Word) | 1.2 | 29/10 17:23 | letto per intero adesso |
| Manuale del Direttore (Word) | 0.46 | 29/10 17:23 | letto per intero adesso |
| «per-davide.md» | — | **30/10 10:53** | **cambiato**: ieri 29/10 17:18; **quindici risposte nuove** in coda |
| Giocatore 0.50, Magia 1.7, Mostri 0.46 (Word), Mostri 0.23 (Doc), E&L, Gestore PX, Prontuario, Layout, Talenti magici | invariati | — | — |

**Sì, ne sono uscite altre**: dopo il lotto 146 (che ho scritto ieri su Armamenti 0.68 / Equipaggiamento 0.22 / registro 2.7) Davide ha pubblicato la mattina del 30/10, fra le 08:24 e le 08:27, Armamenti 0.70, Equipaggiamento 0.24 e registro 2.9. L'ho scoperto solo adesso rifacendo la ricerca. Non ho trovato una «2.8» né altre edizioni intermedie su Drive. Un file di un altro proprietario («HOMINI_ET_ARMI_IPOTESI_NUOVI_TESTI_STEAM_REVISED_v2.docx», condiviso con Marcello il 30/10 mattina) non è nostro e non l'ho letto.

I testi nuovi sono in `docs/manuali-txt/`: i cinque del 29/10 hanno **sostituito** i vecchi (nulla dei loro contenuti è nell'app); Armamenti 0.70, Equipaggiamento 0.24 e registro 2.9 sono **accanto** ai vecchi (`armamenti-0.70.md`, `equipaggiamento-0.24.md`, `revisione-nec-2.9.md`) perché i dati e `tools/verifica_frasi.mjs` leggono ancora le edizioni 0.68 / 0.22 / 2.7: si sostituiranno nel lotto che li applica.

## A. Le differenze, file per file

### A.1 Manuale dei Veicoli 0.9 e ASA Scout MK4 0.5

**Cosa cambia.** Tutta l'energia dei mezzi passa alle **cariche** del modello del registro 2.7:
- l'Autovettura ha 1 CEC Rossa da dieci cariche, una carica ogni 100 km (1.000 km nominali); i chilometri delle tratte brevi si sommano e si arrotonda per eccesso una volta sola alla chiusura del viaggio o della giornata (ricambio CEC 5 kg, 1.000 cr pieno);
- lo **Scout** non ha più i due Banchi da 200 UER: ha **1 MEC Rosso da dieci cariche, una ogni 75 km (750 km nominali)** e **1 CEC Verde da dieci cariche per i servizi, una carica per ogni giorno in cui si usa il supporto vitale** (più accensioni nello stesso giorno = una carica; giorno senza uso = niente). L'aria è una riserva a parte: 24 ore effettive per otto occupanti; ricaricare non la ripristina. Ricambi installati: Rosso 100 kg e 3.000 cr, Verde 5 kg e 1.000 cr; ricarica completa 400 cr in due ore (postazioni indipendenti). Telaio + M606 + accumulatori pieni: 113.000 cr. Esempio nel manuale: 3 ore di supporto → Verde 9, aria 21 h; altre 6 ore → Verde 8, aria 15 h; giorno senza uso → invariati;
- la **Neverlost** (capitolo del Veicoli): 10 BEC Rossi (100 cariche), 1 BEC Blu (10), 3 MEC Verdi (30); traversata in Traiettoria = 1 carica Blu per entrare e 1 per uscire; scudo = 1 carica Blu per ora; cannone 1 carica Rossa per colpo; viaggio = 1 Rossa e 1 Verde al giorno; ricarica 50 cr per carica Rossa o Blu e 30 per Verde, pieno 6.400 cr, viaggio di venti giorni = 1.700 cr; squadra a terra: CEC di servizio separate, ricaricate dal trasformatore personale.

**Cosa tocca nell'app.** `data/veicoli.json` (Autovettura: 1.000 km, «NEC Verde 1.000 Lx»; Scout: 200 Lx/km, 500 km, Modulo Verde da 10.000 Lx, 25 Lx/ora), `src/veicoli.js` e la tab Veicoli (`src/ui/veicoli.js`, sono 38 righe che citano Lx), il registro unico dei veicoli (`src/veicoli-registro.js`: i contatori salvati) e la SS (foglio Veicoli). **Non tocca**: PI, localizzazione dei colpi, andature, Pilotare, riparazioni, collisioni.

**Le domande aperte.**
- **A.192 (energia dello Scout): risolta, ma non dai manuali — da Davide nel Doc**, sezione 7, 30/10: «750 km di autonomia nominale, MEC Rosso da 10 cariche, ciascuna 75 km», CEC Verde, supporto vitale una carica per giorno, aria 24 ore distinta, 400 cr in due ore (tre in successione). Combacia con Scout 0.5. Resta da definire (lo scrive lui) «numero e formato delle bombole». La nostra proposta (500 km con 200 UER) è superata.
- **A.193 (riserve in Lx): risolta da Davide nel Doc**, 30/10: si conserva la **frazione** residua, nessuna equivalenza universale; «una cella a metà diventa metà della capacità del nuovo profilo»; per lo Scout la vecchia riserva di propulsione al 50% = MEC Rosso 5 cariche su 10; la conversione conserva il valore originale, registra il risultato, **non arrotonda per eccesso, non si ripete alle aperture successive**, le frazioni si conservano internamente; se il nuovo profilo non è identificabile con certezza resta «da convertire» fino alla verifica del Direttore; per l'elettronica ordinaria il contatore resta eliminato. Questo **supera la mia proposta A.216** («dividere le ore per 4/2/1 arrotondando per eccesso»: Davide dice di *non* arrotondare per eccesso) e restringe la A.217 al solo Modulo.

### A.2 Wächter 1.2 — risolve la A.195?

I manuali da soli **no** (il profilo dice ancora «Medio o Grande»): Armamenti 0.70 §7.4.2 aggiunge solo che «le taglie Piccolo o Leggero e Medio o Grande sono denominazioni equivalenti». **Risolve Davide nel Doc** (30/10): vale «Medio» (si può mostrare «Medio, detto anche Grande»), una sola variante acquistabile, AR +2, FOR 5, 8 PI, Rara, PS 14, 12.000 cr, Molto rara, generatore e primo NEC Blu da tre cariche compresi; conversione di un Punisher posseduto 6.000 cr, montaggio e primo NEC compresi. Il Wächter 1.2 aggiunge: il NEC Blu da tre cariche pesa 100 g; ricaricarlo da vuoto con il trasformatore lascia 97 cariche nel tampone, tre ore con il portatile o trenta minuti con la stazione; servizio energetico 10 cr per una barriera personale e 30 cr per una cupola. **Nell'app** (lotto 146) c'è già tutto salvo la Taglia (che non mostra): resta la sola riga «Medio, detto anche Grande».

### A.3 Neverlost 1.6 — la A.196

Il testo cambia solo nell'energia (da «punti» a cariche, vedi A.1), più tre righe: una fascia «201–299: 0» nella tabella dei tiri, i danni dei due cannoni «3d10 × 10» e «5d10 × 10» (con moltiplicatore: vedi A.199) e «Mitragliatore 1 / 2». **Non dice nulla sull'app. L'ha deciso Davide nel Doc (A.196, 30/10):** sì, la Neverlost entra nella scheda dei veicoli e nella plancia; combattimento in **Q Tattici, ingombro convenzionale 3 × 2** (la planimetria interna resta a parte); la scheda gestisce Integrità di Corpo, Propulsione e Motore, scudo energetico, armi, munizioni, postazioni ed equipaggio; riserve Rossa 10 BEC / 100 cariche, Blu 1 BEC / 10, Verde 3 MEC / 30; cristalli, PM e funzioni tecnomistiche separati; **le capacità massime non riempiono da sole le riserve effettive della campagna**; il viaggio in Traiettoria si misura in giorni, senza chilometri. È un lotto grande (sezione C).

### A.4 Manuale del Direttore 0.46

Rispetto alla 0.45: **cambia solo il §9.7** (energia: un contatore di cariche per riserva e colore, i formati NEC/CEC/MEC/BEC, campi attrezzati con la quota di ricarica per persone: 20, 60 e 100 cr al giorno); l'indice è pulito dai residui della conversione. **Capitoli nuovi: nessuno** (resta il solo capitolo 9, §9.1–§9.7). **Malattie e cure (A.119): no, ancora non ci sono**: nel Doc di Davide la voce è rimasta in «Manuali che l'app aspetta». **I quindici modelli PNG mancanti (Lavoratori, Studiosi, Taumaturghi): no**: il §9.6 parla ancora di «venticinque Classi» ma i modelli pronti sono i dieci del Mostri 0.46 (invariato dal 27/10). Il §9.5 conferma «ulteriori varianti di PNG» fra i contenuti da sviluppare. **Nell'app non cambia nulla**; il §9.7 ricade nel lotto energia.

### A.5 I tre manuali usciti stamattina (non erano nel compito, ma toccano il lavoro di ieri)

Il modello (cariche, CEC/MEC/BEC, trasformatori col tampone da 100 cariche NEC) **non cambia**: cambiano i **completamenti** che il registro 2.7 dichiarava «da approvare». Rispetto a ciò che ho scritto nel lotto 146:
- **IAS, Smorzatore Silent, RF366 dell'Attila**: un pacco da due NEC Blu 10 (20 cariche, un solo contatore, passaggio automatico), **300 g, ricambio carico 800 cr** (io: 1.000 cr, peso «da definire»); prezzi dei dispositivi invariati, primo pacco compreso.
- **Lanciafiamme**: Purifier = NEC 10 + NEC 5, 250 g, 600 / 150 cr; **Gehemmapuker = cinque NEC 10, 750 g, 2.000 cr pieno** (io: 2.100 cr, peso «da definire»), ricarica 500 cr. Niente formati «NEC 15» o «NEC 50».
- **Banshee commerciale** (due NEC Rossi 10, 20 cariche, una per Round di volo, 12.000 cr con il primo pacco), **Jet-Chute Pile Driver** (NEC Rosso 1, una carica copre una discesa, 6.000 cr), **robot, esoscheletri e armature servoassistite**: Felis, Powersuit, Iron Mastiff = NEC Rosso 10, **una carica per impiego fino a un'ora, 10 ore massime**; Shoa Ace Custom e Demonhunter = NEC Rosso 10, una carica per mezz'ora, **5 ore massime**; XO-102, Vulkan, Attila = CEC Rossa, un'ora, 10 ore; APE Capitol = CEC Rossa, mezz'ora, 5 ore. Le «8 e 6 ore» precedenti sono sostituite; le batterie da 1.500–3.000 cr spariscono (ricambio NEC Rosso 10 400 cr, CEC Rossa 1.000 cr). Una carica si consuma all'inizio dell'impiego e un'altra se si supera la durata coperta; il sistema spento non consuma.
- Il registro 2.9 dichiara questo raccordo **approvato e applicato**: «restano da approvare» non c'è più.

**Rimane «da definire»** (scritto dai manuali stessi): numero e formato delle bombole dello Scout; prezzo completo dello Scout con munizioni e corredo e scorte iniziali aggiuntive; riparazioni specifiche; per la Neverlost non c'è nulla di aperto in 1.6.

## B. Quanto è stabile l'energia

**Il modello è fermo; si stanno chiudendo i buchi.** Cronologia: registro 1.5 (28/10 mattina) → 1.6 (28/10 sera) → **2.7 (29/10 22:52) = il modello nuovo** → **2.9 (30/10 08:24) = completamenti**. Quel che ho visto:
1. **Veicoli 0.9 e Scout 0.5 non cambiano di nuovo il modello**: lo usano come sta. Anzi sono datati 29/10 17:18–17:23, cioè *prima* del registro 2.7 delle 22:52: erano già scritti sul modello finale, e il 2.7 li ha confermati (ogni cifra incrociata torna: Autovettura 1.000 km, Scout 10 × 75 km con 400 cr in due ore, Neverlost 6.400 cr e 8 ore, BEC/MEC/CEC a 10 / 30 / 50 / 10 cr per carica, 50.000 + 5.000 + 9.000 = 64.000 cr).
2. Tra il 2.7 e il 2.9 **nessuna cosa applicata ieri è stata rovesciata**: sono cambiati *cinque numeri* (pacco IAS 1.000 → 800 cr; Gehemmapuker 2.100 → 2.000 cr; pesi che prima mancavano; autonomia degli esoscheletri 8/6 → 10/5 ore) e sono arrivati oggetti che il lotto 146 non aveva (Banshee commerciale, Jet-Chute, robot/esoscheletri).
3. **Decisione che ne segue: continuare, non aspettare.** Il rischio residuo è piccolo (altri completamenti di cose «da definire»; non un cambio di unità) e si limita con due regole: (a) ogni lotto energia parte dalla ricerca per cartella e dice su quali edizioni lavora; (b) i generatori dei lotti sono già rilanciabili e tengono i numeri in `data/`, per cui un ritocco di cifre costa un rigenerato, non una riscrittura. Un lotto «energia 2.9» **piccolo** (sezione C, lotto 147) va fatto subito per riallineare il lavoro di ieri; il lotto dei veicoli (150) può partire sul modello attuale.

## C. Lotti e Doc

### C.1 Cose che contraddicono una decisione approvata o la regola del progetto (non cambiate: segnalate)

- **A.197 e il principio «avvisa, non blocca»**: Davide (30/10) vuole il **blocco** della seconda assegnazione del premio di fine Atto allo stesso PG nello stesso Atto, anche tentando da un'altra partita, con rettifica tracciata e motivo del Direttore. È una decisione sua ed è esplicita, quindi vale; ma cambia la regola permanente «propone, non obbliga; avvisa, non blocca» per questo caso, e sostituisce la A.170 («avviso»). Va applicata come ha scritto lui, con la rettifica come via d'uscita.
- **A.200 e `iniziativaCreatura`** (`src/iniziativa-creature.js`, lotto 141): Davide conferma 0 per gli Inquisitori ma precisa che il **minimo vale per il bonus base**, non per il totale: Ferite, condizioni e altri effetti continuano a dare penalità e il modificatore complessivo può restare negativo. Il codice oggi limita a 0 *il valore dell'Iniziativa del nemico*. Non so se le penalità si applicano dopo (non è stato verificato): da controllare nel lotto 148 prima di toccare.
- **A.198 e la A.167** (limite di 12 quadretti per lato): Davide lo porta a **20** (i draghi antichi 16 × 10 entrano) e vuole due rappresentazioni, in Q Base (dimensione vera, rettangolare, girevole a 45°) e in Q Tattici (pedine 1 × 1, 2 × 1 per il Dragomedusa; 3 × 2 per la Neverlost) con la **scala della mappa dichiarata**. L'app oggi non ha il concetto di scala della mappa (nessun «Tattici» in `data/mappa.json` né in `src/mappa/`): è una funzione nuova, non un ritocco.
- **A.199**: l'app «mostra e non tira» il danno con moltiplicatore (decisione provvisoria, lotto 141); Davide vuole che lo **calcoli**, con formula e dadi visibili, per creature *e armi navali*; Difese e Armatura dopo. Rovescia la scelta provvisoria, non una decisione approvata.
- **«Bestiario v0.64»**: la A.199 cita «i valori aggiornati del Bestiario v0.64» (Soffio giovane 8d10 × 5, adulto 12d10 × 5). Su Drive non esiste nessun «0.64»: i Mostri sono 0.46 (Word) e 0.23 (Doc) e **la 0.46 ha già quei valori**. Probabile inversione di cifre; da confermare (A.218).
- **Nessun manuale nuovo contraddice una decisione registrata in `docs/risposte-master.md`.** Dove gli Armamenti 0.70 e il registro 2.9 cambiano numeri applicati ieri (A.190 e A.191) coincidono con le risposte di Davide dello stesso giorno.

### C.2 Le cinque domande

| Domanda | Stato |
|---|---|
| A.192 Scout | **Risolta da Davide** (Doc, 30/10) — nel pacchetto: da «aperte» a «Risposte ricevute»; applicazione nel lotto 150 |
| A.193 riserve in Lx | **Risolta da Davide** (30/10): frazione conservata; applicazione nei lotti 147 (celle, Moduli, tuta…) e 150 (Scout) |
| A.195 Taglia Wächter | **Risolta da Davide** (30/10): «Medio, detto anche Grande»; una riga nel lotto 147 |
| A.196 Neverlost | **Risolta da Davide** (30/10): sì, nella scheda dei veicoli e nella plancia; lotto 151 |
| A.119 malattie e cure | **Ancora aperta**: il Direttore 0.46 non le contiene; resta fra «Manuali che l'app aspetta» |

Rispondono nel Doc anche A.189–A.191 (confermate: l'unica differenza con ieri è il ricambio IAS a 800 cr e il Gehemmapuker a 2.000 cr), A.197–A.204 (vedi sopra e `docs/risposte-master.md`).

### C.3 Tabella dei lotti rivista

Numerazione: il prossimo libero è il 147. Fatti: 135 (NEC ordinaria), 136 (A.174), 141 (Bestiario 0.46, parti 1 e 2), 143 (modelli PNG: 10 su 25), 144 (A.176), 145 (cartelle vere), 146 (celle, pacchi, trasformatori, Wächter).

| # | Lotto | Modello | Stato e quando |
|---|---|---|---|
| **147** | **Energia 2.9, piccolo**: IAS pacco 300 g / 800 cr, Gehemmapuker 750 g / 2.000 cr (5 NEC 10), Purifier 250 g, Banshee commerciale (2 NEC Rossi 10, 12.000 cr) e Jet-Chute (NEC Rosso 1, 6.000 cr) come oggetti, robot / esoscheletri / armature servoassistite con CEC o NEC e «una carica per impiego», Wächter «Medio, detto anche Grande»; sostituire i tre testi 0.68/0.22/2.7 con 0.70/0.24/2.9; **conversione delle riserve salvate secondo la A.193** (frazione, nessun arrotondamento, registro, non si ripete; «da convertire» dove non c'è un profilo certo) | **Opus** (la conversione tocca i file dei PG e non deve perdere né ripetere nulla; la parte di dati è meccanica) | **Prima della prossima partita solo se il gruppo usa** armi a energia, esoscheletri, Banshee, IAS o ha riserve in Lx; altrimenti subito dopo il 148 |
| **148** | **Risposte del 30/10, piccole**: A.197 (blocco del premio di Atto con rettifica tracciata), A.199 (danno con moltiplicatore calcolato, con formula e dadi visibili; Dragomedusa 8d10 × 5 e 12d10 × 5, armi navali), A.200 (verifica che il minimo 0 sia solo del bonus base), A.201 (nomi dei draghi metallici: «Drago d'ottone, di rame, di bronzo, d'argento, d'oro», vecchie forme come alias; **rigenerare la pagina del bestiario online nello stesso commit**) | Sonnet | **Prima della prossima partita** se si usa il Dragomedusa o si assegnano PX di fine Atto |
| **149** | **Mappa e bestiario, A.198 / A.202 / A.203 / A.204**: limite delle sagome a 20 per lato, pedine in Q Tattici con scala dichiarata, draghi antichi 16 × 10, ordine lunghezza × larghezza dei draghi, Madre delle Murene con due configurazioni scelte dal Direttore (2 × 2 e 6 × 2, stato conservato), Murena cucciolo etereo / corporeo (overdose R+1) | **Opus** (sagome e scala toccano `src/mappa/forma.js`, ingombro, ZoC, luce) | Dopo la partita |
| **150** | **Veicoli in cariche** (A.192, A.193): Autovettura 1 CEC Rossa 1.000 km; Scout MEC Rosso 750 km + CEC Verde a giorni + aria 24 h separata; tratte brevi sommate e arrotondate una volta alla chiusura (domanda A.219: che cosa chiude la «giornata»); conversione del registro unico dei veicoli (Scout al 50% → 5 su 10); SS | **Opus** | Dopo il 147 (stesso modello di conversione) |
| **151** | **Neverlost** (A.196): scheda a tre strutture, scudo, armi navali con danni × 10, postazioni ed equipaggio, riserve BEC / MEC, viaggio in Traiettoria in giorni, plancia e mappa in Q Tattici 3 × 2; **dopo** 148 (moltiplicatori) e 149 (scala) | **Opus**, da spezzare in due commit (scheda e plancia; mappa) | Dopo la partita; il più grosso |
| — | Modelli PNG: gli altri quindici (Lavoratori, Studiosi, Taumaturghi) | — | **Fermo**: non sono in nessun manuale (A.205–A.210 ancora aperte) |
| — | Malattie e cure (A.119) | — | **Fermo**: Direttore 0.46 non le ha |
| — | A.211–A.213, A.205–A.210, A.214–A.217 | — | In attesa di Davide (il pacchetto qui le riporta) |
| — | Prove della sezione 8 del Doc (Marcello) | — | Da fare dal PC del Direttore; nessuna è di Claude |

**Prima della prossima partita** (se serve qualcosa): il 148 è il lotto con meno rischio e più utilità al tavolo (il premio di Atto non duplicabile, il Dragomedusa tirato dall'app); il 147 solo se il gruppo tocca l'energia. Tutto il resto aspetta senza danno.

### C.4 Pacchetto per il Doc

`docs/pacchetto-per-davide-2026-10-30-ricognizione.md`: **una sola cosa da incollare**. Riunisce A.211–A.213 (lotto 144), A.215 e A.217 riscritta (lotto 146), le riscritture di A.190 e A.195 (ora «Risposte ricevute»), le quindici risposte nuove spostate nelle sezioni giuste, A.176 / A.189 nelle Risolte, e le domande nuove **A.218** (il «Bestiario v0.64») e **A.219** (che cosa chiude la «giornata»). A.214 e A.216 sono ritirate (risolte dai manuali / dalla A.193).
