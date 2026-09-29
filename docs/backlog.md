# Backlog — richieste raccolte, in attesa di implementazione

Aggiornato al 26 settembre 2026. Ogni voce riporta la fonte nel manuale, la difficoltà stimata e cosa manca per farla. Le voci "facili" si possono lanciare subito; le altre aspettano il collaudo o dati mancanti.

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

## 14. Tavolo del Direttore — STRUTTURALE, su branch `tavolo-direttore`

Richiesta del 29/09/2026. Nessuna implementazione ancora: si parte da un **branch dedicato** (`tavolo-direttore`) e si porta su `main` solo quando è provato al tavolo.

- **Server Node nostro** al posto di `serve`: oltre a servire i file statici accetta due richieste, «salva personaggio» (il JSON del personaggio, formato di `src/character.js`) e «elenca personaggi»; tiene i JSON in `personaggi/` sul PC che fa da server (un file per personaggio, nome dall'id).
- **Invio dai browser dei giocatori**: in modalità tavolo ogni modifica della scheda si manda anche al server. Se il server non risponde, l'app resta locale come oggi (`localStorage`), senza errori bloccanti: al massimo un indicatore «non collegato».
- **Pagina «Tavolo del Direttore»**: tutti i personaggi in griglia, una carta ciascuno con nome, PV e PM attuali/massimi, AR, Stati attivi, Ferite, Affaticamento e arma impugnata; aggiornata ogni pochi secondi. Solo lettura nella prima versione.
- **Avvio**: `distribuzione/3_avvia.bat` avvia il nostro server invece di `serve`.
- **Vincolo**: l'app statica deve continuare a funzionare senza server (GitHub Pages, `python -m http.server`, apertura in locale); il server è un'aggiunta, mai un requisito.
