# Backlog — richieste raccolte, in attesa di implementazione

Aggiornato al 4 ottobre 2026. Ogni voce riporta la fonte nel manuale, la difficoltà stimata e cosa manca per farla. Le voci "facili" si possono lanciare subito; le altre aspettano il collaudo o dati mancanti.

## 1. Nome file di esportazione con nome e livello — FACILE

`Nome-del-PG_liv7_2026-09-26.json` (nome ripulito dai caratteri non ammessi, livello attuale, data). Così la cartella dei backup racconta la storia da sola. Nessun dato mancante.

## 2. Penalità di Ferite, Affaticamento e Stati dentro i valori — FACILE/MEDIA

Oggi le penalità compaiono come promemoria accanto ai valori (Prompt 9). Il manuale però le definisce come penalità **cumulative a VA e Prove Salvezza** (§5.14 Ferite: Superficiale −1, Importante −2, Profonda −4, Seria −6, Grave −8; §5.19 Affaticamento, scala propria), quindi vanno mostrate nei valori:

- In modalità tavolo ogni VA (Abilità, VA per colpire delle armi, Difese) e ogni Salvezza mostra il valore **effettivo** = valore da regole + equipaggiamento + condizioni. Il `totale` da regole resta separato (serve all'avanzamento), come già fatto per l'equipaggiamento.
- Colore diverso quando il valore effettivo differisce da quello base (rosso per malus, verde per bonus), e tooltip con la scomposizione: "Furtività 9 = 11 (regole) − 2 (Ferita Importante)".
- Stati: solo quelli con effetto numerico definito nel §5.18 entrano nel calcolo (con `effetto` strutturato in `regole.json`, oggi c'è solo il riassunto testuale: da strutturare). Gli Stati con effetti non numerici restano promemoria.
- Menomazioni (§5.14.1): −2/−4 "agli impieghi della parte colpita": non deducibile automaticamente, resta un promemoria con la parte colpita annotata.
- Nella stampa non compaiono (la scheda stampata è "a riposo").

## 3. Batterie mistiche / cristalli di Chroma — MEDIA

Fonte: Manuale della Magia, sez. 6; Manuale degli Armamenti §7.1.4 e §7.5.1 (riserve a PM). Verificare cosa il catalogo già contiene dai lotti "artefatti" e "munizioni e alimentazioni".

- **Creazione/inserimento**: un contenitore ha tipo di energia (Bianco universale, Rosso fisico, Blu mentale, Verde spirituale, Viola oscuro con regole rimandate, Trasparente = esausto con alone del colore originario), capacità massima, PM attuali, classificazione di potenza (occupa la capacità di sintonizzazione), stato sintonizzato sì/no. Voci di catalogo se esistono, altrimenti oggetto personalizzato di tipo "contenitore Chroma".
- **Gestione in scheda (modalità tavolo)**: per ogni contenitore "Chroma Rosso 6/10 PM" con +/−; azioni "Ricarica dal personaggio" e "Preleva verso il personaggio" con i rapporti 3:1 (Rosso/Blu/Verde) e 2:1 (Bianco), ridotti dai Talenti Ricarica Efficiente (Tecnomante III Grado) e Conversione Migliorata (quest'ultima ancora provvisoria: vedi per-davide.md); Convertire Potere solo con Addestramento Taumaturgo; conteggio dei gruppi e Prova di Potere richiesta da 2 gruppi in su (tabella sez. 6).
- **Uso nel lancio**: vedi utility 4: il costo si paga con PM personali, un solo contenitore compatibile, o entrambi; l'energia deve essere compatibile con la macrofamiglia dell'incantesimo.
- Capacità di sintonizzazione complessiva del personaggio (Armamenti §7.10) con il +2 del Tecnomante: da modellare insieme agli artefatti.
- Svenimento a 0 PM personali anche con contenitori pieni: promemoria.

## 4. Utility "Lancia un incantesimo" — MEDIA/ALTA

Fonte: Manuale della Magia sez. 1–3, 12 (Anticipazione). Flusso: scegli l'incantesimo fra i conosciuti → scegli la versione (livello) fra quelle accessibili → Anticipazione sì/no e quale aspetto (uno solo fra quelli ammessi dalla scheda; costo base raddoppiato e Potere più difficile di una categoria) → condizioni: Focalizzazione (+4, +6 con Migliorata), lancio in Ingaggio (−2, Prova obbligatoria; annullato da Lancio in Combattimento), componenti mancanti (−2 ciascuna, max −6, Prova obbligatoria), scala Taumaturgo o "altri utilizzatori" → fonte dei PM (personali / contenitore compatibile / misto) → risultato: PM da spendere, se la Prova è richiesta, VA finale da tirare, ed effetti applicabili di Talenti di Classe (Armonizzazione Arcana −1 PM, Architetto Arcano −2 penalità…). Con un pulsante "Lancia" che scala i PM in modalità tavolo. Richiede i campi `anticipazione` e `componenti` per incantesimo nei dati (oggi sono testo nelle schede) e la lettura completa della sez. 12.

## 5. Utility "Attacco a distanza" — MEDIA/ALTA

Fonte: Manuale del Giocatore §5.10–5.11, §5.8 (Copertura), §5.7 (due armi), Armamenti §7.3 (mirini). Flusso: arma impugnata → modalità di fuoco (Singolo, Raffica Breve/Media/Lunga, Tiro Rapido, Mirato) → distanza in Q (penalità per fascia di gittata) → Copertura del bersaglio → Imbracciatura/Postura, mirino, movimento proprio → Talenti che modificano (Mira Selettiva, Analisi Rapida, Reazione Operativa…) → risultato: VA finale per colpire, Azioni richieste, munizioni consumate, danno atteso, INC per il Maldestro. Pulsante "Spara" che scala le munizioni. Richiede la lettura completa del §5.10–5.11 per la tabella delle distanze e delle Azioni.

## 6. Utility "Attacco corpo a corpo" — MEDIA

Fonte: §5.3–5.7, §5.12 (Manovre ravvicinate), Armamenti §7.1.7 (Manovre compatibili, già estratte). Flusso: arma impugnata (o senz'armi) → Manovra (Colpo, Carica, Affondo, Spazzata… solo quelle compatibili con l'arma) → condizioni (A Terra, Copertura, due armi, Ingaggio multiplo) → risultato: VA finale, danno con i moltiplicatori della Manovra, Azioni. Le Manovre sono già nei dati come nomi: serve strutturarne l'effetto (VA, danno, Azioni) dal §5.12.

## Ordine proposto

1 e 2 subito (una sessione). 3 dopo il collaudo, quando si sa cosa contiene il catalogo sui contenitori. 4–6 dopo che le schede dei Talenti di magia (per-davide.md, A.2) sono definite, perché le utility le usano; 6 può andare prima di 4 e 5 perché dipende solo da dati già estratti.

## 7. ✔ Lotto elmetti — fatto il 27 settembre 2026

Armamenti v0.52 §7.21: elmetti e modifiche nel catalogo, con effetti nei valori effettivi (docs/equipaggiamento-lotti.md).

## 8. ✔ Armature corporative con proprietà — fatto il 27 settembre 2026

Le proprietà delle armature corporative tradotte in effetti tipizzati (docs/proprieta-armature.md).

## 9. ✔ SS a colori e impaginazione dei fogli — fatto il 27 settembre 2026

Scheda da stampare ridisegnata (`src/ui/stampa.js`, `css/stampa.css`): carattere fisso a 10 pt (9 pt per le intestazioni di colonna, `--ss-font` e `--ss-font-small`), riempitivi che prendono lo spazio libero, quadratini uguali in tutti i fogli, colori della palette della SD (`docs/palette.md`, sezione «Scheda da stampare»), filigrana della Corporazione nel foglio 1.

- ✔ Foglio 1: nome e anagrafica in alto, Caratteristiche in grande, Punti Eroe, Segni distintivi a quadratini, Background come riempitivo.
- ✔ Foglio 2: Abilità a tutta altezza, Talenti e Annotazioni.
- ✔ Foglio 3: riquadro compatto, armi con tutte le colonne e i colpi per caricatore, Protezioni, equipaggiamento con ind / zai / Altro, Ferite, Punti Vita a quadratini.
- ✔ Foglio 4: Punti Magia, valori di lancio, contenitori di Chroma, indice e schede complete degli incantesimi su più pagine.
- Esempi in `docs/esempi-stampa/` (PDF e personaggi di partenza), rigenerabili con `PORTA=8001 CARTELLA=docs/esempi-stampa STAMPA_MAGIA=elenco,completo node tools/collaudo_pdf.mjs`.
- ✔ Scelta per il foglio Magia accanto a «Stampa»: «Solo elenco» (predefinita) o «Elenco e schede complete», con la stima delle pagine in più; salvata con il personaggio (`stampa` nel salvataggio del browser, `normalizzaOpzioniStampa` in `src/stampa.js`, pronta per la scelta dei fogli 1–4).

## 10. ✔ AR in evidenza — fatto il 27 settembre 2026

AR del personaggio calcolata (armatura, rinforzo, scudo, effetti, Talenti; niente elmetto) e mostrata accanto ai PV nella SD e nel foglio 3 della SS, con la provenienza (docs/ricognizione-ar-pi.md).

## 11. ✔ PI degli oggetti — fatto il 27 settembre 2026

PI massimi dal catalogo, PI attuali al tavolo con − e + ed etichetta «Rotto» a 0 (niente AR né effetti); quadratini dei PI nella SS; file del personaggio formato 7. Domande aperte A.43–A.50 in docs/per-davide.md.

## 12. ✔ Stati nei valori effettivi — fatto il 27 settembre 2026

Censimento in docs/ricognizione-stati.md (11 buchi, tutti chiusi): Stati come liste di effetti in regole.json, categorie di Prove (A.51), penalità in Abilità, Difese, Salvezze, «Attacca!» e «Lancia!», avvisi e divieti dai dati (Stordito, Svenuto, Terrorizzato, Accecato).

## 13. Esposizione al Chroma Viola, Corruzione e Umanità — ASPETTA LE SCALE DI DAVIDE

Fonte: risposta di Davide A.21 (28/09/2026; `regole.json` → `corruzione.chroma_viola`), Giocatore §5.20.1 (Corruzione) e §5.21 (Umanità).

- **Tracker dell'esposizione** in modalità tavolo, per ogni «Chroma Viola (frammento)» della lista: minuti di esposizione accumulati nell'ora, fascia più grave raggiunta (contatto, entro 1 Q, 1–6 Q, 6–12 Q), sospensione fuori dall'aura senza azzerare; alla scadenza dell'ora il promemoria della PS di Magia con modificatore e Intensità della fascia. Oggi l'app mostra solo le fasce nel tooltip e l'avviso nella SD.
- **Corruzione e Umanità** come valori del personaggio (Stati di Corruzione, peggioramenti per esito, penalità da CROS e Umanità sulle PS, riduzione della capacità di sintonizzazione del §7.10): servono le scale complete di Davide.
- Poi: collegare gli esiti della PS al peggioramento della Corruzione, senza tiri automatici (fuori perimetro).
- Fatto sul branch `layout-sd` (pezzo 3): i gradi della Corruzione Oscura del §5.20 (Umano … Oscuro) nella sessione, con la penalità nei valori effettivi. Restano esposizione e Umanità.
- ✔ **Umanità** (1° ottobre 2026, lotto 3, backlog 22): valore del personaggio dalle perdite registrate all'installazione degli impianti, fasce del §5.21 nei PM Massimi, nella PS di Magia contro la Corruzione e nella capacità di sintonizzazione, tab Cibernetica e foglio della SS (`docs/ricognizione-cibernetica.md`). Resta il tracker dell'esposizione.

## 14. Tavolo del Master — su `main` dal 2 ottobre 2026 (pezzi 1–6 e lotto 8); resta il pezzo 7

Richiesta del 29/09/2026. Sviluppato sul branch `tavolo-direttore` (piano ed esito in `docs/tavolo-direttore.md`) e unito in `main` il 2 ottobre 2026, per decisione di Marcello, prima della sessione di prova. Si attiva solo con `avvia-server.bat` (`node server.mjs`); con `avvia.bat` e senza server l'app è quella di prima.

**Resta da fare:**
- **pezzo 7: sessione di prova vera**, con i giocatori collegati in rete (indirizzi nella finestra del server e in «Collega i giocatori») e su carta: tempi dei controlli, avvisi, registro con più persone; R2 (codice di sessione su reti non di casa) e R3 (date dei file fra PC diversi) del piano;
- ✔ **Round collegato fra scheda e tavolo**: fatto il 3 ottobre 2026. Con il server e il PG in uno scontro il Round della scheda segue lo scontro, le durate di Tecniche e Stati scadono al Round giusto in scheda e plancia, «Termina le durate» a fine scontro; esito in `docs/tavolo-direttore.md`.
- ✔ **Durate degli Incantesimi nella scheda**: fatto il 3 ottobre 2026. «Lancia!» registra la durata (Round, a tempo come promemoria), con bersagli, «Termina», AR finché dura; scadenza con la scheda o lo scontro, anche per i nemici; esito in `docs/tavolo-direttore.md`.
- ✔ **generatore di nemici dal Bestiario**: fatto il 3 ottobre 2026 con «Crea nemico» (procedura guidata o tutto a caso, dalle tabelle del cap. 6) e «Prepara scontro» (bozze di scontro con difficoltà per 7 PG e «Inizia»); esito in `docs/tavolo-direttore.md`, sezione «Crea nemico» e «Prepara scontro». Il Bestiario resta una proposta per Davide.
- ✔ **Creature pronte, tre per base**: fatto il 3 ottobre 2026 (sera). Undici creature nuove nel cap. 5 del Bestiario (22 in tutto, tre per ogni base non umana con ruoli diversi, tabella nel §5.1), tarate con `tools/taratura_bestiario.mjs` (Appendice A.6); tendine delle creature raggruppate per base in «Crea nemico» e «Prepara scontro»; negli attacchi dei nemici gli attacchi naturali ammettono le Manovre consentite senz’armi e la Spazzata del gigante vale come Spazzata Migliorata. Restano per Davide nomi, tono e capacità dei Boss nuovi (`docs/bestiario/domande-per-davide.md`).
- **tabella casuale delle creature pronte** (cap. 6): non c’è; se Davide la vuole, una tabella per contesto (pattuglia, scontro, tana) con i pesi per ruolo.

La richiesta di partenza era questa:

- **Server Node nostro** al posto di `serve`: oltre a servire i file statici accetta due richieste, «salva personaggio» (il JSON del personaggio, formato di `src/character.js`) e «elenca personaggi»; tiene i JSON in `personaggi/` sul PC che fa da server (un file per personaggio, nome dall'id).
- **Invio dai browser dei giocatori**: in modalità tavolo ogni modifica della scheda si manda anche al server. Se il server non risponde, l'app resta locale come oggi (`localStorage`), senza errori bloccanti: al massimo un indicatore «non collegato».
- **Pagina «Tavolo del Direttore»**: tutti i personaggi in griglia, una carta ciascuno con nome, PV e PM attuali/massimi, AR, Stati attivi, Ferite, Affaticamento e arma impugnata; aggiornata ogni pochi secondi. Solo lettura nella prima versione.
- **Avvio**: `avvia-server.bat` avvia il nostro server (`node server.mjs`); `avvia.bat` resta l'avvio senza server.
- **Vincolo**: l'app statica deve continuare a funzionare senza server (GitHub Pages, `python -m http.server`, apertura in locale); il server è un'aggiunta, mai un requisito.

## 15. ✔ Ristrutturazione della scheda digitale — fatta il 30 settembre 2026, su branch `layout-sd`

Proposta di Davide «Modifiche Layout APP»: otto tab in una riga, Inventario, Combattimento a due colonne, Poteri, Artefatti, Cibernetica e Veicoli in attesa del manuale. Piano ed esito in docs/layout-sd.md. Il merge su `main` lo decide Marcello dopo la prova.

## 16. Icone dei tab da Davide — ASPETTA LE IMMAGINI

Le icone delle pagine sono generate da `tools/genera_immagini.py` dagli originali in `img/originali/` (non tracciati). Poteri usa ancora quella della Magia; le definitive arrivano da Davide con la stessa convenzione (originale 1254×1254 in `img/originali/Pages/`, voce in `SORGENTI`).

## 17. ✔ Cache-busting dei moduli JS — fatto il 30 settembre 2026

Dopo un aggiornamento il browser può tenere in cache i moduli vecchi con i dati nuovi (visto il 30/09: import fallito finché non si ricarica con Ctrl+F5). Fatto senza build step (docs/cache.md): `tools/versione.mjs` scrive `versione.json` (impronta del contenuto) e in `index.html` un importmap con `?v=` su tutti i moduli; gli avviatori lo eseguono prima del server; l'app aperta mostra «Nuova versione disponibile · Ricarica» quando la versione cambia; `serve.json` manda `no-cache` in locale.

## 18. ✔ Export/import del solo Calendario — fatto il 30 settembre 2026

Esportare e reimportare il blocco `calendario` di un personaggio da solo (per passarlo al master o fra personaggi del gruppo), senza toccare le scelte né la sessione. File `calendario_<nome>_<data>.json` con intestazione `{ tipo: "calendario", versione: 1, app: "mutant", esportato, da }` e il blocco com'è nel salvataggio (`src/calendario.js` → `fileCalendario`, `leggiFileCalendario`). «Esporta calendario» e «Importa calendario» accanto al titolo della sezione; «Importa calendario» anche nel menu «Azioni» (serve sui personaggi senza calendario). L'import controlla tipo e versione, chiede conferma (da chi, di che data) e sostituisce l'intero blocco, attivando la sezione.

## 19. ✔ Bonus dei Talenti nei valori — fatto il 30 settembre 2026

Censimento in docs/censimento-talenti.md (319 Talenti; 61 con effetti tipizzati, 97 effetti). Effetti in `effetti.valori` nello schema degli oggetti; al tavolo nei valori effettivi con la provenienza; interruttori dei situazionali; interruttore globale «Bonus dei Talenti» in Combattimento e Poteri. Resta: l'Arma Astrale del Custode come arma evocabile della scheda (Maestro d'Arma, Maestria Astrale).

## 20. ✔ Rimodulazione della SS sui tab della SD — fatta il 1° ottobre 2026, su branch `layout-ss`

Fogli 1 Identità, 2 Abilità, 3 Combattimento, 4 Inventario sempre; 5 Poteri e 6 Artefatti quando servono; numerazione fissa e «pagina P di T»; quadratini con un massimo in un solo componente. Piano ed esito in docs/layout-ss.md, PDF in `docs/esempi-stampa/`. Il merge su `main` lo decide Marcello dopo la prova su carta.

## 21. ✔ Equipaggiamento 0.5, lotto 2: cap. 5 «Strumenti professionali» e NEC — fatto il 1° ottobre 2026

Esito in docs/equipaggiamento-lotti.md («lotto 2»):
- catalogo NEC (`nec.json`, 14 voci) e `regole.json` → `nec`;
- 29 strumenti in `strumenti_professionali.json`;
- alimentazione degli oggetti, con la riserva al tavolo e i quadratini nella SS;
- cap. 2–4 alla 0.5;
- 13 voci di dotazione collegate; A.65–A.67 al Doc.

Piano di partenza:

Fonte: Manuale dell'Equipaggiamento 0.5 (Google Doc del 01/10/2026, testo in `docs/manuali-txt/equipaggiamento.md`; diff in `docs/diff-manuali-2026-10-01.md`).
- **§5.4 Nuclei Energetici Cromatici:** catalogo di celle e pacchi (Verdi, Blu, Rossi; compatti, standard, Moduli), ricarica, consumi dell'equipaggiamento.
  - Rifare con questo catalogo i due NEC Verdi di ricambio del §7.3.4 degli Armamenti, oggi in `accessori_armi.json`.
  - Rifare l'alimentazione dei cap. 2–4, oggi aggiornata solo nelle schede collegate alle dotazioni e scritta anche in `tools/lotti/lotto_equipaggiamento_03.mjs`, da rigenerare.
- **§§5.1–5.3, 5.5–5.8:** strumenti tecnici, scientifici, agricoli, accesso e ispezione, camuffamento, elettronica, strumenti culturali e rituali, con il **Focus personale semplice** (§5.8).
  - Collegare con `rif` le voci di dotazione dei Corredi e del Focus (A.34).

## 22. ✔ Equipaggiamento 0.5, lotto 3: cap. 7 «Dispositivi specialistici» e tab Cibernetica — fatto il 1° ottobre 2026

Esito in `docs/ricognizione-cibernetica.md` (§5) e in `docs/equipaggiamento-lotti.md` («lotto 3»):
- 44 impianti (standard e CYBERTRONIC) e 24 chip in `impianti.json`;
- `regole.json` → `umanita` e → `impianti`;
- Umanità nel motore (formato 8);
- tab Cibernetica, foglio Cibernetica della SS;
- A.68–A.70 al Doc.

Piano di partenza:

- Impianti: interfaccia neurale, sensoriali, protesi, protezione organica, coordinamento neurale, strumenti incorporati, iniettori, Processore neurale di Abilità.
  - Ogni impianto con PI e UMN standard o CYBERTRONIC.
  - Il Processore non aiuta la magia (Magia 1.3 sez. 8; Giocatore §5.21).
- Tab Cibernetica della SD (oggi «in attesa del manuale», `regole.json` → `tab_in_arrivo`) e foglio 7 della SS.
- Prima va decisa l'Umanità (backlog 13).

## 23. ✔ Equipaggiamento 0.5, lotto 4: cap. 8 «Cataloghi e dotazioni iniziali», cap. 6 ampliato — fatto il 1° ottobre 2026

Esito in `docs/equipaggiamento-lotti.md` («lotto 4»): naniti medici, otto postazioni medicochirurgiche, campo «cura»; il cap. 8 conferma il §2.16 del Giocatore (sette controlli, nessuna regola nuova); A.71 al Doc. Con questo lotto tutti i lotti dell'aggiornamento del 01/10 sono chiusi.

Piano di partenza:

- Cap. 8: assegnazione e registrazione, crediti, acquisti e assegnazioni di missione; confronto con `dotazioni.json` e `src/dotazioni.js`.
- Cap. 6: naniti medici (una dose ogni 24 ore, fuori dal tentativo settimanale) e postazioni medicochirurgiche (§6.8), che toccano anche le cure del Giocatore (§5.15–5.16).

## 24. ✔ Veicoli, lotto 3: tab Veicoli e foglio Veicoli — fatto il 4 ottobre 2026

Manuale dei Veicoli 0.2; dati e motore del lotto 2 (`data/veicoli.json`, `src/veicoli.js`), modello del §8 di `docs/ricognizione-2026-10-03.md`.

- Dove sta il veicolo: decisione provvisoria di Marcello in attesa di A.91, nel file del PG che lo possiede (`scelte.veicoli`, scritto solo se non vuoto; formato 8 invariato), con la casella «Veicolo del gruppo» solo informativa (`data/veicoli.json` → `personaggio`).
- Tab Veicoli (`src/ui/veicoli.js`): «Aggiungi veicolo» dal catalogo o scritto a mano, più veicoli, nome, «Lo guido io», «Rimuovi»; profilo con i «da definire», Pilotare del conducente con la provenienza, andature, tre strutture con PI a quadratini, soglie e stato, Copriruote con i pezzi e «Monta un ricambio», NEC; «Colpito» e «Ripara» con il calcolo in anteprima; PI a mano.
- Combattimento: promemoria del conducente (andatura, Pilotare, attacchi da bordo e contro il mezzo), senza cambiare i VA.
- SS: foglio Veicoli dopo gli altri, una pagina per veicolo (proprietà e sistemi in una pagina «(continua)» se non entrano), nessun foglio senza veicoli.
- Il veicolo non pesa sul carico del PG.

Restano: A.91 (di chi è il veicolo), A.101–A.105; manovre, inseguimenti, collisioni e sovraccarico tecnico al tavolo (il motore c'è, l'interfaccia no); veicoli dei nemici nel Tavolo del Master.

## 25. ✔ Effetti degli impianti al tavolo — fatto il 4 ottobre 2026

Segnalazione di Marcello: il Potenziamento visivo CYBERTRONIC non mostrava il +2 a Percezione. Il dato c'era, ma un bonus situazionale si vedeva solo come interruttore laterale e nel tooltip. Censimento in `docs/censimento-impianti.md`.

- Casella «+2 se …» accanto al valore in Abilità e alle Difese.
- Casella in «Attacca!» per attacco e danno situazionali (Braccio potenziato).
- Apice e legenda nel foglio 2 della SS.
- Iniettori e Processore attivabili nella tab Cibernetica.
- A.106 (penalità per scarsa illuminazione).

Restano, dalla verifica sulle altre categorie (solo elenco):
- Martello Spaccateste (Stordire +1);
- IAS3200 (Pilotare −2/−4);
- IAS3100 (SIN 2 a Pilotare);
- APE Capitol (Schivare con Pilotare −1);
- Utensile multiuso (Improvvisato −2).
