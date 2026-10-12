# Mutant — creatore assistito di personaggi per SIMPLY RPG

Tool interno per il gruppo di gioco di ruolo. Non va pubblicato. Il master (Davide) cambia spesso parametri e tabelle: questo vincolo guida ogni scelta tecnica.

Lingua del progetto: italiano (UI, commenti, commit, documentazione). Terminologia: quella dei manuali (Caratteristica, Abilità, Addestramento, Classe, Grado, Talento, VA, PV, PM, Salvezza).

## All'inizio di OGNI sessione: controllo dei manuali

Prima di qualunque altro lavoro, eseguire la procedura di controllo di `docs/manuali-drive.md` su:

- i quattro Google Doc dei manuali: Giocatore, Magia, Armamenti, Equipaggiamento;
- il Doc «E&L – Risposte e correzioni approvate» (ID `1VaqZaAe4NK5P8A956Eahua_ZT60eh3ohnR2xSqh-tVs`);
- il Doc «per-davide.md» (ID `1Jg5rqbBtcHGE1E10xYElO_qCDCwh8K87LAInovtpF6A`): fonte unica delle domande a Davide; se è cambiato, lo si scarica in `docs/per-davide.md` e si leggono le risposte in coda (sezione 7). Protocollo: `docs/protocollo-davide.md`.

Si confronta il `modifiedTime` di ciascuno con il registro.

- Se nessuno è cambiato: riferire in una riga «manuali e risposte invariati».
- Altrimenti applicare la procedura, poi riferire che cosa è cambiato e che cosa è stato applicato. La procedura: testo in `docs/manuali-txt/`, diff, classificazione regola / testo / cosmetica, dati, `docs/risposte-master.md` e `docs/per-davide.md`, registro.

Drive si usa **in sola lettura**: mai scrivere nei Doc di Davide, nemmeno commenti (`docs/protocollo-davide.md`). Se un Doc non è leggibile, segnalarlo subito senza inventare.

## Glossario

- **SD** = scheda digitale: la scheda a tab dell'app, con la modalità tavolo (`src/ui/tab.js`). Otto tab in una riga in alto (branch `layout-sd`, esito in `docs/layout-sd.md`; ritocchi dell'11/10, S4–S32, funzioni pure in `src/scheda-vista.js`). Accanto al titolo di ogni tab la testata con Punti Eroe (valore e «−»), Distintivi e Crediti; nella colonna di sinistra PV, Ferite e PM e, sotto, gli Stati attivi in sola lettura (in Combattimento Affaticamento e Corruzione; nell'Inventario il Carico sopra i PV):
  - **Identità:** anagrafica, Caratteristiche, Prove Salvezza, vantaggio, note;
  - **Abilità:** per riga nome e VA grande con bonus e malus attivi e le spunte «a condizione», «Calcolo» (finestrella con il conto del VA); a destra il solo riquadro «Condizioni attive» con Stati e bonus di circostanza; Talenti, Specializzazioni; per le Tecniche Interiori solo il rimando a Poteri;
  - **Combattimento:** in alto Stati e bonus di circostanza; al centro valori, Prove Salvezza e i riquadri Mano destra e Mano sinistra (uno solo con un'arma a due mani; «Attacca!», «Ricarica»); a destra Protezioni e Armi (sintesi, possedute, dettagli nel «?»);
  - **Poteri:** la Magia («Lancia!», PM, cristalli); Risorse Interiori (le Tecniche Interiori come gli incantesimi, «Attiva», Round e Tecniche attive); «Nessun potere» senza l'una e l'altra; «Da artefatti»;
  - **Artefatti:** Sintonizzazione in una riga con «?», schede degli Artefatti e riserve di Chroma in due colonne («Addosso», «Zaino e Deposito»), Consumabili;
  - **Cibernetica:** Umanità con la provenienza e gli effetti della fascia, impianti installati per famiglia, chip, perdite e recuperi;
  - **Veicoli:** i veicoli del PG (`src/ui/veicoli.js`): «Aggiungi veicolo», profilo, Pilotare del conducente, andature, Corpo, Propulsione e Motore con PI e stato, rinforzi, NEC, «Colpito», «Ripara»;
  - **Inventario:** oggetti in due colonne («Addosso», «Zaino e Deposito») per categoria, riducibili, con stato (anche deposito comune), PI e Ripara, condizione delle armi, caricatori di riserva, applicazioni sanitarie, «Aggiungi» per categoria, catalogo con «Compra»; Integrità in basso;
  - Calendario in coda, se attivo.
- **SS** = scheda da stampare: la vista di stampa A4 orizzontale (`#/p/<id>/stampa`, `src/ui/stampa.js`, `css/stampa.css`). Fogli come i tab della SD (branch `layout-ss`, esito in `docs/layout-ss.md`):
  - 1 Identità, 2 Abilità, 3 Combattimento (due pagine fisse: Armi; Condizione ed equipaggiamento indossato), 4 Inventario sempre;
  - 5 Poteri con la magia; 6 Artefatti con Artefatti o riserve di Chroma; poi Cibernetica e Veicoli (una pagina per veicolo) se ci sono;
  - piè di pagina «foglio N · pagina P di T»; nel foglio 3 «foglio 3 · pagina 1/2 · P di T».

## Stack (deciso)

- Web app statica, **senza build step**: `index.html` + `src/*.js` (ES modules) + `css/`. Vanilla JS. Nessun framework, nessun bundler, nessuna dipendenza npm a runtime.
- Deve funzionare da browser desktop e telefono. Si serve con un qualunque server statico (`python -m http.server` in locale; GitHub Pages o simile per il gruppo).
- Console del master: `Mutant.bat` (09/10), menu numerato con versione e stato del server: avvia (`avvia-server.bat` nella sua finestra), aggiorna (`aggiorna.bat`, su una riga sola perché il file si aggiorna mentre gira, poi riapre la console; dal 13/10 alla fine `tools/riavvia.mjs` riavvia da sé il server se era acceso con il codice di prima: lo spegne salvando e lo riaccende, e se niente è cambiato non lo tocca), salva sessione, ripristina (`tools/ripristina.mjs`: server spento, copia di sicurezza `prima-del-ripristino_…`, cartelle rimesse), cartella dei salvataggi, impostazioni; parti in Node in `tools/console.mjs`; `crea-collegamento.bat` mette il collegamento sul desktop (icona `tools/mutant.ico`). I vecchi `.bat` restano.
- **Aggiornamento sicuro** (12/10, `docs/aggiornare-e-ripristinare.md`, diagnosi in `docs/diagnosi-dati-spariti-2026-10-12.md`): ogni aggiornamento, con Git o da zip, fa prima una copia zip delle cartelle locali in `backup-prima-aggiornamento/` e dopo ricontrolla; se una cartella che aveva file è rimasta vuota si ferma, dice quale e propone di rimettere la copia (`tools/dati-locali.mjs`: `prima`, `dopo`, `rimetti`; elenco in `tools/file-locali.json`). I file del pacchetto fuori da `mutant/` si rimettono al passo da soli (`tools/aggiorna-avviatori.mjs`, con `--salta=` per quello in esecuzione): il vecchio `1_scarica_o_aggiorna_app.bat` cancellava tutto tranne `node_modules`. All'avvio, con `personaggi/` vuota, lo dicono la finestra nera, la console e il Tavolo (`/api/avvio`, `src/ui/cartella-vuota.js`), con il percorso in uso. «Ripristina» elenca i salvataggi di quattro posti (`salvataggi/`, `backup-prima-aggiornamento/`, `autosave/`, cartella di Google Drive) con tipo, posto, dimensione e contenuto letto dall'indice dello zip.
- Avvio con e senza server: `avvia.bat` (e `npm start`, `npx serve`, GitHub Pages) è l'app di sempre, con i personaggi nel browser; `avvia-server.bat` (`node server.mjs`, porta 3000, in ascolto su tutte le interfacce: indirizzi per i giocatori nella finestra e nel riquadro «Collega i giocatori», `src/rete.js`, QR da `src/qr.js`; `--solo-locale` per chiuderlo) aggiunge il Tavolo del Master e la cartella dei personaggi; non va aperto insieme ad `avvia.bat`. L'app riconosce il server dall'intestazione `X-Mutant-Server` su `versione.json` (`src/ui/cartella.js`): senza server nessuna richiesta a `/api`. Piano ed esito in `docs/tavolo-direttore.md`; resta il pezzo 7 (sessione di prova vera).
- Cartelle del server, fuori da git salvo il `LEGGIMI.txt`: `personaggi/` (file dei PG), `tavolo/` (chi è al tavolo), `scontri/` (scontri e archivio), `nemici/` (bestiario della campagna), `veicoli/` (registro unico dei veicoli, A.91), `scene/` e `mappe/` (scene e immagini della mappa di battaglia, branch `battlemap`), `musica/` (musica di fondo della mappa, `/api/musica`), `galleria/` (immagini da mostrare ai giocatori, N1), `autosave/` (salvataggio automatico ogni 5 minuti) e `salvataggi/` (zip del salvataggio completo: «Salva sessione», «Spegni Mutant», `salva-sessione.bat`, copia su Drive e ntfy; `tools/salva-sessione.mjs`, configurazione in `config-salvataggi.json`). `esempi/` (tracciata): PG d'esempio, `esempi/nemici/` e il bestiario umano `esempi/nemici/umani/`, copiati da «Carica esempi» della plancia senza sovrascrivere.
- Test: Node (`node --test`, cioè `npm test`) sulle funzioni pure del motore. I test non richiedono browser.
- File del personaggio esportato: formato 8 (`VERSIONE_FORMATO` in `src/character.js`): `{ formato, versione, versioni_dati, scelte, livelli, sessione, calendario? }`, con i PI attuali degli oggetti in `sessione.integrita`, l'Umanità in `scelte.umanita` (scritta solo se non vuota) e i veicoli in `scelte.veicoli` (scritti solo se ce ne sono); identificativo del PG in `pg`, creato alla nascita e scritto solo se c'è (`nuovoPg`): la cartella del server riconosce un PG da quello, non dal nome del file (`docs/tavolo-direttore.md`, «Identità dei personaggi»). I formati precedenti si importano e si migrano (senza `calendario`: non attivo; senza `integrita`: oggetti ai PI massimi; senza `umanita`: si registrano gli impianti già installati).
- File del solo calendario: `calendario_<nome>_<data>.json`, `{ tipo: "calendario", versione: 1, app: "mutant", esportato, da, calendario }` con il blocco com'è nel salvataggio (`src/calendario.js` → `fileCalendario`, `leggiFileCalendario`); l'import sostituisce l'intero blocco dopo una conferma. L'export del personaggio non cambia.
- «Modifica master» (12/10): nel file del PG, a parte dalle scelte e solo se non vuoti, `correzioni_master` (registro delle modifiche del DdG: `{ id, quando, chiave, etichetta, tipo, numero?, motivo, stato }`) e `circostanze_master` (bonus mandati dal Tavolo); in memoria viaggiano con le scelte (`scelte.correzioniMaster`, `scelte.circostanzeMaster`). Il formato resta 8.

## Principi non negoziabili

1. **Tutte le regole numeriche stanno in `data/*.json`, mai nel codice.** Corporazioni, Addestramenti, Classi, Abilità, Talenti, Incantesimi, costanti (punti alla creazione, massimi, base delle Salvezze…). La UI si genera dai dati: aggiungere una Corporazione non deve richiedere di toccare HTML o JS.
2. **Validatore dati all'avvio** (`src/validate.js`): controlla gli invarianti dei manuali (ogni Classe classifica le 24 Abilità una volta ciascuna in 2 Specializzate, 6 Professionali, 12 Generiche e 4 Non competenti, con basi 7/6/5/3 che sommano 122, da `regole.json` → `competenze`; ogni Classe ha 5 Abilità di Classe esistenti; ogni Abilità ha una Caratteristica valida; ecc.). Un errore deve dire *file, chiave e cosa non torna*, mai crashare in silenzio.
3. **Separare scelte da valori calcolati.** Il personaggio salvato contiene solo le scelte del giocatore (corporazione, punti assegnati, classe, incantesimi…). Tutti i valori derivati (VA, PV, PM, Salvezze, Iniziativa) si ricalcolano con funzioni pure in `src/calc.js`. Così se Davide cambia una tabella, ricaricare il personaggio lo aggiorna.
4. **Ogni file dati riporta `versione_manuale`** (es. "Giocatore 0.43") e l'app la mostra.
5. **Gli esempi numerici del manuale sono test.** Il Mishima Avventuriero Agente (§2.1, §2.13, §2.14, §2.17 del Manuale del Giocatore): FOR 6 COS 6 DES 7 INT 5 SAG 7 CAR 5 → PV 16, PM 9, Tempra 10, Riflessi 11, Volontà 9, Magia 10, Iniziativa +2, Furtività VA 9 (2 + 6 + 0 + 1, al limite Professionale del I Grado), con i 7 punti liberi del §2.13 (Giocatore del 03/10 sera): Percezione 2, Tecnologia 1, Cultura 1, Raggirare 3 → Percezione VA 12, Raggirare VA 11. L'esempio Bauhaus Assaltatore COS 7 (§1.2.3): Tempra 11.

## Struttura

```
index.html      con il blocco «versione» (meta e importmap con ?v=) scritto da tools/versione.mjs
versione.json   versione dell'app (impronta del contenuto), letta dall'app per l'avviso «Nuova versione»
serve.json      Cache-Control: no-cache per js/css/json/html con serve (docs/cache.md)
css/            palette.css (colori con un significato, docs/palette.md), style.css (app e telefono), stampa.css (fogli A4)
src/
  rules.js      carica data/*.json, espone i dati validati
  validate.js   invarianti dei dati
  calc.js       funzioni pure: modificatori, VA, Salvezze, PV/PM, Iniziativa
  competenze.js categorie di competenza (S/P/G/N): basi dalla prima Classe, limiti del VA personale (§8.3, §8.7)
  talenti.js    effetti tipizzati dei Talenti al tavolo (effetti.valori), interruttore «Bonus dei Talenti»
  character.js  modello delle scelte + serializzazione JSON
  avanzamento.js  livelli 2–20 (cap. 8): ricalcolo, validazione, eventi
  incantesimi.js, checklist.js, descrizioni.js, tiri.js, lingua.js
  equipaggiamento.js  catalogo ed effetti degli oggetti
  attacco.js    utility d'attacco (a distanza; il corpo a corpo con lo stesso impianto)
  tiri-scheda.js  dadi nell'app (13/10, S9, S15, S18): che dado si tira per ogni valore (dai dati), esito con lo scarto (src/prova.js), registro degli ultimi tiri; finestrella in ui/tira-valore.js
  attacco-sintesi.js  presentazione sintetica di «Attacca!» (13/10, S17, S20, S21): armi in mano, fasce di distanza a pulsanti, nome di «Mirato», voci attive di «Altro», memoria per scontro
  lancio.js     utility di lancio degli incantesimi (stesso impianto)
  ricarica.js   ricarica delle armi a distanza dalle riserve
  dotazioni.js  equipaggiamento iniziale (§2.16): scelte, crediti, acquisti, voci della dotazione
  sessione.js   valori attuali di sessione (modalità tavolo)
  tecniche.js   «Attiva» delle Tecniche Interiori (§8.9.1): solo PM personali, una per Round, durata R+N, Svenuto, Umanità 0
  umanita.js    Umanità (Giocatore §5.21): registro delle installazioni, valore con provenienza, fascia
  veicoli.js    veicoli (Manuale dei Veicoli 0.2): strutture, colpi, riparazioni, mezzi del PG; ui/veicoli.js la tab
  correzioni-master.js  «Modifica master» (12/10): correzioni del DdG applicate dopo il calcolo (schedaARiposo, umanita, calcolaAR), registro e annulla, bonus di circostanza dal Tavolo, contesto master (PC del server), protezione dei blocchi dai tablet; interfaccia in ui/master.js
  veicoli-registro.js  registro unico dei veicoli (A.91, A.105): record, migrazione, patch senza perdite, movimento all'INI del conducente
  versione.js   confronto fra versione caricata e versione.json; ui/aggiornamento.js la barra «Nuova versione»
  mappa/        mappa di battaglia (branch battlemap, docs/battlemap/piano.md): scena.js (formato e validaScena), celle.js (maschere di Q), token.js, vista.js (vista giocatori filtrata dal server), immagine.js (tipo e dimensioni delle immagini), camera.js (zoom e spostamento), griglia.js (calibrazione e linee), partecipanti.js (pezzi della scena da scontro, bozza, schede e veicoli), nebbia.js (pennello, rettangolo), muri.js (muri e terreno difficile), area.js (area raggiungibile: ricerca a costo minimo con ingombri), annulla.js (movimenti del Round e pila di Ctrl+Z); interfaccia in src/ui/mappa/ (pagina #/mappa/<id> con la plancia come barra di destra in tre disposizioni e la barra dell'Iniziativa, lotto 6: disposizione.js e iniziativa.js; vista giocatori #/mappa/giocatori, elenco delle scene nella plancia, canvas a livelli, gesti a due dita, token e mini-scheda, canale verso la plancia; lotto 7: colori dei bordi in colori.js, menu «Strumenti», pannello «?», guida in docs/battlemap/guida-davide.md); editor unico degli oggetti in mappa/editor.js (12/10, `docs/battlemap/ricognizione-editor-2026-10-12.md`): una barra con sei strumenti e uno solo attivo (Seleziona, Muro, Porta, Terreno difficile, Token libero, Gomma; `src/ui/mappa/strumenti.js`), Esc torna sempre a Seleziona, e per muri disegnati, porte, aree di terreno (le macchie collegate della maschera) e token liberi le stesse azioni: evidenziazione al passaggio, clic e Maiusc o riquadro, trascinamento, maniglie sui vertici, Canc, pannello delle proprietà, aggancio alla griglia a mezzo quadretto; Ctrl+Y rifà (pila `scena.rifai` in mappa/annulla.js). Token liberi: token «segnaposto» con nome, colore o immagine della Galleria, 1×1/2×2/3×3, nascosto e «blocca» (vale come un Q di muro per movimento e vista); si spostano senza regole e i tablet non li muovono. finestrelle nella pagina al posto di prompt e confirm in src/ui/finestrella.js; zone di controllo e Attacchi di Opportunità in mappa/zoc.js (07/10); tablet dei giocatori («Sono…», movimento del proprio PG verificato dal server, campanellino e «Tocca a te») in mappa/tablet.js, server.mjs → /api/vista-giocatori/movimento e /api/tablet (fase 2, lotto 7); veicoli sulla mappa (orientamento a 90°, chi è a bordo, salire e scendere) in mappa/veicoli-mappa.js (fase 2, lotto 5); immagine dei nemici in src/ui/immagine-nemico.js (A.131)
  provenienza.js  righe { fonte, valore, nota? } dei valori calcolati (AR, VA, Salvezze, Iniziativa, Movimento, danno): le stampano i tooltip della SD e la SS
  stampa.js     dati dei fogli di stampa e delle tab
  ui/           wizard a passi (fasi 0–9 del §2.0), scheda a tab, Sali di livello, stampa, import/export
data/           JSON delle regole (fonte di verità): 16 file in data/ (galleria.json: parametri della Galleria, N1; mappa.json: parametri della mappa di battaglia; formato_nemici.json: formato dei nemici del Tavolo del Master, per-davide A.73, validaNemico in validate.js; bestiario.json: Bestiario proposto per «Crea nemico» e «Prepara scontro», dal lotto tools/lotti/lotto_bestiario_dati.mjs), catalogo in data/equipaggiamento/ (index.json + 21 file)
server.mjs      server di Mutant per il Tavolo del Master (avvia-server.bat): file statici, /api per personaggi, tavolo, scontri, nemici, esempi
personaggi/ tavolo/ scontri/ nemici/ veicoli/ scene/ mappe/ musica/ galleria/  dati del server, fuori da git (si traccia il LEGGIMI)
tests/          node --test; tests/collaudo/ tre personaggi di riferimento con PDF
esempi/         PG d'esempio (tools/genera_esempi.mjs; Aiko Tenzan da tools/genera_esempio_tecniche.mjs), nemici/ e nemici/umani/ (tools/genera_nemici_umani.mjs)
avvisi/         avvisi a Marcello con ntfy.sh (tools/avvisi.mjs, chiamato da aggiorna.bat e dall'avvio del server): avvisi.json e stato.json fuori da git, LEGGIMI ed esempio tracciati
tools/          estrazione dai manuali, generatori dei lotti (tools/lotti/), collaudo_pdf.mjs, genera_immagini.py, versione.mjs, installa-hook.mjs e hooks/pre-commit
img/            stemmi e icone generati (img/immagini.json li elenca); originali in img/originali/, non tracciati
docs/           studio di fattibilità, lotti, domande e risposte del master, roadmap
distribuzione/  pacchetto per il master (guida e .bat)
Manuali/        PDF di partenza dei manuali (riferimento storico). Non modificare. La fonte corrente sono i Google Doc (docs/manuali-drive.md), con il testo in docs/manuali-txt/.
```

## Perimetro

La v1 (creazione al 1° livello) è chiusa. Oggi il progetto comprende:

- creazione completa (sequenza §2.0), con Incantesimi per i Taumaturghi;
- avanzamento dal 2° al 20° livello (cap. 8), un livello alla volta, annullabile (PV e PM attuali seguono i massimi: Giocatore §8.1.2, E&L A.6);
- scheda digitale a tab (Identità, Abilità, Combattimento, Magia) con modalità tavolo: valori di sessione separati dalle scelte (`src/sessione.js`);
- stampa dedicata A4 orizzontale (`#/p/<id>/stampa`, `css/stampa.css`);
- equipaggiamento con catalogo a lotti dal Manuale degli Armamenti (`data/equipaggiamento/`, lista dei lotti in `docs/equipaggiamento-lotti.md`); equipaggiamento iniziale guidato (§2.16, E&L A.5–A.5.31; modelli corporativi di base del §7.22): dotazione comune e della Classe, crediti 1000 + 2d6 × 100, acquisti con cessione degli armamenti di base; dati in `data/dotazioni.json` (generato da `tools/genera_dotazioni.py`), regole in `src/dotazioni.js`, voci marcate `dotazione_iniziale`; crediti attuali nella sessione;
- salva/carica in `localStorage`, export/import JSON, dati modificabili da Davide con validatore;
- valori effettivi in modalità tavolo: Ferite, Affaticamento, Stati con effetto numerico e carico (`regole.json`) entrano nei VA, nelle Salvezze e nella Parata mostrati nelle tab, con la scomposizione (`src/condizioni.js`, `src/carico.js`); il totale da regole e la stampa restano a riposo;
- effetti degli oggetti sui VA (`effetti` nel catalogo, negli oggetti di dotazione e nei personalizzati): generali, situazionali (interruttore al tavolo), d'uso specifico (valore a parte); frasi del manuale verificate da `tools/verifica_frasi.mjs` (`docs/effetti-oggetti.md`);
- Manuale dell'Equipaggiamento 0.3: cap. 1, carico (§1.6 = Giocatore §5.2.6) e PS Integrità per Qualità (§1.7) in `regole.json`; cap. 2, 3, 4 e 6 nel catalogo (`dotazioni_personali`, `esplorazione`, `comunicazione`, `sanitario`), con le voci di dotazione collegate alla loro scheda (`oggetti_dotazione[id].rif`).

- utility «Attacca!» nella tab Combattimento (nessun tiro di dado), pannello a passi comune (`src/ui/pannello-passi.js`): attacco a distanza (`regole.json` → `attacco_distanza`, tooltip delle modalità da `modalita_di_fuoco`) e corpo a corpo con le Manovre del §5.12, Carica, due armi, Magistrale e «Senz'armi» (`regole.json` → `attacco_ravvicinato`); motore in `src/attacco.js`, Talenti in `effetti.attacco_distanza` / `effetti.attacco_ravvicinato`; dal 13/10 il pannello è sintetico (S17, S20, S21; `src/attacco-sintesi.js`, `pannelloSintetico` in `src/ui/pannello-passi.js`), uguale per PG e nemici della plancia: in alto Arma (un tocco per cambiare), Modalità a pulsanti con «Tiro Mirato» o «Colpo Mirato», Distanza a fasce (o «Dalla mappa: 8 Q ✕»), Risultato con VA e danno in evidenza e «Calcolo»; sotto, le voci attive con ✕ e «Altro ▾» chiuso con tutto il resto; le scelte di ogni arma si ricordano finché non cambia lo scontro;
- parametri dei Talenti di Classe scelti dal giocatore (Disciplina del Lottatore, §3.5.5): `parametro` in classi.json con le opzioni e i loro effetti (tabelle per Grado), scelta in `parametriTalenti` della creazione o della voce di livello, permanente;
- Iniziativa, Movimento e Azioni effettivi nella SD (Stati, carico, MOV dell'armatura: `src/condizioni.js` → `valoriTavolo`);
- utility «Lancia!» nella tab Magia (nessun tiro di dado): `src/lancio.js`, `regole.json` → `lancio`, `incantesimi.json` → `meccanica` (da `tools/estrai_lancio.py`, poi `tools/scale_anticipazione.mjs --scrivi` per le scale dell'Anticipazione: il Risultato mostra il valore anticipato, `src/anticipazione.js`, o «da definire al tavolo»), effetti.lancio dei Talenti, con il riquadro dell'Anticipazione che dice cosa vale con i Talenti del personaggio;
- Calendario di gioco facoltativo (ingranaggio → Calendario): tab con viste Giorno / Settimana / Mese, note per fascia con bandierine e «M», ricerca, «Avanza»; fuori dalle regole, non tocca calcoli né stampa. `src/calendario.js` (funzioni pure), `src/ui/calendario.js`, `regole.json` → `calendario`, colori `--evento-*` in `css/palette.css`; blocco `calendario` nel personaggio (formato 6), non toccato da «Nuova sessione» né dai livelli;
- ricarica dalle riserve (`src/ricarica.js`, `munizioni.json` → `ricarica`): armi caricate direttamente 2 cartucce per AzP, 4 con Ricarica Migliorata (A.135, decisione 139); carichini rapidi (Ricarica per Tamburo e per Serbatoio, 6 colpi: «Prepara» e «Usa carichino» nella tab Combattimento, sessione `carichini`, dati in `ricarica.carichini`, A.151 per i dati mancanti);
- 7 Punti Abilità Liberi a ogni Grado, compreso il primo (Giocatore del 03/10 sera, confermato da Davide il 04/10, A.90, decisione 92; prima 10, poi 5): chi ha 5 punti per Grado ha punti da assegnare, con l'avviso «Con la regola aggiornata di Davide hai X punti Abilità liberi ancora da assegnare» (`regole_aggiornate.mancanti`) e «Assegna»; i personaggi salvati con più punti hanno punti in eccesso; la scheda resta utilizzabile e l'avviso «Con la regola aggiornata di Davide hai X punti Abilità liberi in più del consentito: togline X» (`regole.json` → `regole_aggiornate.eccesso`) compare in testa alla SD, nella tab Abilità (Abilità segnate con ✱), nella stampa (foglio 2 e barra) e all'import; «Togli» (`#/p/<id>/togli`, `src/ui/completa.js` → `renderTogli`; motore `src/avanzamento.js` → `avvisoPuntiEccesso`, `statoRimozione`, `validaRimozione`, `applicaRimozione`) toglie i punti un evento alla volta, dal più vecchio.
- regole aggiornate sui Punti Abilità Liberi (Doc del 27/09, per-davide A.52): gli eventi già registrati con meno punti delle regole correnti si completano dall'avviso in cima alla SD («Assegna», `#/p/<id>/completa`, `src/ui/completa.js`; motore in `src/avanzamento.js` → `statoCompletamento`, `validaCompletamento`, `applicaCompletamento`), i punti si registrano nell'evento a cui appartengono; finché mancano, l'avanzamento è bloccato; i punti in eccesso si segnalano soltanto. Titolo dell'avviso in `regole.json` → `regole_aggiornate`.
- categorie di competenza (Giocatore del 29/09 23:45, §2.3, §2.13, §8.3, §8.7): le basi delle Abilità vengono dalla prima Classe (`classi.json` → `competenze`, S 7 / P 6 / G 5 / N 3), l'Addestramento non ha più valori base; VA personale = min(Mod + Base + Corp + Avanzamento, limite della categoria migliore fra le Classi possedute), con le formule in `regole.json` → `competenze`; i +1 di Classe si registrano sempre, i punti liberi valgono solo se aumentano il VA personale. I punti già spesi che non lo aumentano più restano nel file, non contano e si riassegnano con lo stesso «Assegna» (`applicaCompletamento(…, inattivi)`); motore in `src/competenze.js`, ricognizione in `docs/ricognizione-abilita-2026-09-30.md`.

- tab Inventario (`docs/layout-sd.md`, pezzo 2): unica casa degli oggetti, con sezioni per famiglia su due colonne nell'ordine di Davide del 02/10 (`src/palette.js` → `SEZIONI_INVENTARIO`, campo `colonna`; una colonna sola sotto i 46rem; stesso ordine nel foglio 4 della SS), stato di ogni oggetto in `voce.stato` con il valore `deposito` (deposito comune: fuori dal carico, senza effetti, fuori dal tavolo), PI e Ripara nella riga, Carico e Crediti in testa, «Compra» dal catalogo.

- tab Combattimento (`docs/layout-sd.md`, pezzo 3): colonna sinistra con valori, Prove Salvezza, armi in mano per mano (Ricarica e «Attacca!»), armi disponibili e Protezioni; colonna destra con Ferite, Affaticamento, Corruzione Oscura (§5.20, `regole.json` → `corruzione.stati`, `sessione.corruzione`, nei valori effettivi) e Stati. Caricatori di riserva, condizione delle armi e applicazioni sanitarie si cambiano nell'Inventario.

- tab Poteri e Artefatti (`docs/layout-sd.md`, pezzo 4): Poteri per tutti (la Magia di prima, o «Nessun potere» da `regole.json` → `poteri`; «Da artefatti» in sola lettura); Artefatti con sintonizzazione, schede degli Artefatti ed effetti con provenienza, riserve di Chroma. Un Artefatto nel deposito comune resta sintonizzato e occupa la capacità finché non si interrompe; la sua riserva non alimenta (A.59, E&L del 05/10, `artefatti.json` → `sintonizzazione.deposito`).

- Tecniche Interiori al tavolo (richiesta di Davide del 02/10, `docs/ricognizione-tecniche-interiori.md`): sezione «Risorse Interiori» della tab Poteri per chi ha Risorse Interiori, una scheda per Tecnica con «Attiva» (`src/ui/tecniche.js`, pannello come «Lancia!»); motore puro `src/tecniche.js` sulle regole comuni del §8.9.1 (solo PM personali, avviso se non bastano, conferma e Svenuto se la riserva resta a 0, una per Round con «Nuovo Round», durata dal Round R alla fine di R + N, durate a tempo terminate a mano, blocco a Umanità 0, nessuna Prova di Potere salvo Silenzio Mentale); sessione `round`, `ultimaTecnica`, `tecnicheAttive`; costi e durate numerici in `tecniche_interiori.json` (`costo_pm`, `opzioni_costo`, `durata_tipo`, `durata_round`, `attivazione`). Aura di Resistenza e Pelle di Rinoceronte danno AR finché sono attive. Effetti delle 28 Tecniche (prompt 2): `effetti` in `tecniche_interiori.json` (`tools/effetti_tecniche.mjs`), nei valori effettivi e in «Attacca!» finché sono in corso (le istantanee fino alla fine del Round), provenienza «Tecnica: Nome (fino al Round N)», non spenti da «Bonus dei Talenti»; Imposizione della Mano Curativa applicabile dal pannello; Onda Interiore come profilo d'attacco. SS: elenco delle Tecniche nel foglio 5 (Poteri), che si stampa anche senza magia, con la colonna «Effetto» se l'elenco entra.

- Talenti nei valori effettivi (`docs/censimento-talenti.md`): `effetti.valori` delle voci dei Talenti nello schema degli oggetti (scritti da `tools/effetti_talenti.py`), applicati al tavolo da `src/talenti.js` e `src/condizioni.js` (generali, situazionali con interruttore, usi specifici a parte); interruttore globale «Bonus dei Talenti» in `sessione.bonusTalenti` (Combattimento e Poteri), che spegne anche i Talenti di «Attacca!» e «Lancia!».

- NEC e strumenti professionali (Equipaggiamento 0.5, cap. 5; lotto 2 del 01/10): catalogo NEC in `data/equipaggiamento/nec.json` e regole in `regole.json` → `nec`; strumenti in `strumenti_professionali.json`; campo `alimentazione` degli oggetti (NEC, consumo, ore o usi); riserva al tavolo in `sessione.nec` (`src/equipaggiamento.js` → `riserveNec`, − e + nella riga dell'Inventario) e quadratini nel foglio 4 della SS. I lotti storici non riscrivono senza `--forza` (`tools/lotti/superato.mjs`).

- Cibernetica e Umanità (Equipaggiamento 0.5, cap. 7; Giocatore §5.21; lotto 3 del 01/10, `docs/ricognizione-cibernetica.md`):
  - impianti in `data/equipaggiamento/impianti.json`: tipo `impianto`, stati «installato» e «zaino», con UMN e chip del Processore; regole in `regole.json` → `umanita` e → `impianti`;
  - `src/umanita.js`: la perdita si registra all'installazione (`normalizza`) e resta se l'impianto si toglie; i recuperi li concede il Direttore;
  - la fascia riduce PM Massimi, capacità di Sintonizzazione e PS di Magia contro la Corruzione;
  - tab Cibernetica della SD e foglio Cibernetica della SS, che si stampa solo con impianti installati o Umanità ridotta;
  - effetti al tavolo (censimento del 04/10, `docs/censimento-impianti.md`, lotto `tools/lotti/lotto_effetti_impianti.mjs`): bonus condizionali con la casella «+2 se …» accanto al valore (campo `se` degli effetti situazionali; in «Attacca!» per attacco e danno situazionali, `dichiarazione.oggetti`; in stampa in apice con la legenda); impianti `attivabile` in `src/impianti.js`: iniettori con le cartucce e «Somministra», Processore con «Attiva» del chip (durata e limite di 24 ore da `regole.json` → `impianti.chip`), promemoria dell'Azione; sessione `impianti` solo se serve.

- Equipaggiamento 0.5, cap. 6 ampliato e cap. 8 (lotto 4 del 01/10): naniti medici e postazioni medicochirurgiche in `sanitario.json`, campo `cura` con i numeri delle cure (`src/equipaggiamento.js` → `testoCura`, tooltip e Inventario), `alimentazione` anche come elenco di NEC; il cap. 8 riassume il §2.16 del Giocatore, controllato da `tools/lotti/lotto_equipaggiamento_08.mjs`. Tutti i capitoli dell'Equipaggiamento 0.5 sono nel catalogo.

- Rinforzi come sottocategoria delle armature (richiesta di Davide del 02/10): tipo `rinforzo` (`rinforzi.json`, lotto `tools/lotti/lotto_rinforzi_armature.mjs`), «Montata su:» con le armature indossate compatibili e, per soprabiti, mantelli, Tabardo consacrato e Sottogiacca IES (`indossabile_da_solo`), «Indossato da solo» con il profilo autonomo di A.80 (E&L del 03/10: AR 1, Leggera, FOR 3, proprietà della scheda); regole in `regole.json` → `rinforzi`.

- Manuali del 02/10 (`docs/diff-manuali-2026-10-02-sera.md`), lotti 1–3: capacità di sintonizzazione 8–13 (Architetto 10–15, `artefatti.json` → `sintonizzazione`); A.78, attacchi e Difese si tirano anche con VA ≥ 20 (`regole.json` → `prova.tiro_sempre`, `magistrale_migliorato`; `src/prova.js`); riserve Batteria/Cariche e proprietà Esclusive/Universali con una sola fonte esterna per pagamento (`regole.json` → `chroma.riserve`, `src/fonti.js`; le armi del §7.5.1 restano a Cariche). Lotti 4–7: catalogo del cap. 10 (`tools/lotti/lotto_artefatti_cap10.mjs`: Batterie Mistiche e Matrice, Schegge instabili, Pietra della Vigilanza, Guanti da Combattimento Mistico; `regole.json` → `chroma.matrice`, `cristalli_matrice`, `schegge`; «Ricarica dalla Matrice» nella tab Artefatti), risposte dell'equipaggiamento A.62–A.68 e A.71 (`tools/lotti/lotto_risposte_equip_0210.mjs`, voci uscite in `index.json` → `rif_sostituiti`), Rituali A.74 (`ripartizioneMagistrale`), Capolavoro del Corazzaio A.61 (`effettoCapolavoro`, scelta sulla voce dell'armatura).

- Tavolo del Master (su main dal 02/10; solo con `avvia-server.bat`, `docs/tavolo-direttore.md`): plancia con i PG al tavolo in sola lettura, scontro con Iniziativa e parità, Round e durate degli Stati, nemici dal bestiario (`data/formato_nemici.json`, A.73) con Ferite, Menomazioni, PM e «Lancia!», danno applicato («Colpito»), «Attacca» dei nemici con il pannello dei PG, giocatori collegati con revisione; convertitore «PG → nemico» (`src/nemico-da-pg.js`); «Crea nemico» (procedura guidata o tutto a caso dal Bestiario, `src/crea-nemico.js`) e «Prepara scontro» (bozze in `scontri/` con stato «bozza», `src/preparazione.js`) del 03/10. Round della scheda collegato allo scontro (`src/round-scontro.js`, regole in `regole.json` → `durate_round`): con il PG in uno scontro aperto il Round lo fa avanzare la plancia. Bestiario proposto in `docs/bestiario/` (`bestiario.md`, `bestiario.html` per Google Doc, `bestiario-online.html` per la pagina consultabile, `tools/taratura_bestiario.mjs`). **Bestiario online** (P6, 12/10): `node tools/bestiario_pagina.mjs` costruisce `docs/bestiario/bestiario-online.html` dai dati del repo — 142 schede con i valori della plancia (creature pronte e basi di `data/bestiario.json` calcolate da `src/crea-nemico.js`, nemici prestabiliti di `esempi/nemici/`), ricerca per nome e filtri per categoria e grado, più la vista «Manuale» con il testo di `bestiario.md`; un file solo, leggibile sul telefono, senza nulla delle cartelle reali. Pubblicata per il gruppo all'indirizzo `https://claude.ai/artifact/F2CMvbi2Sk1s1idAg3p4rf`.

- Durate degli Incantesimi lanciati (03/10, `docs/tavolo-direttore.md`): `incantesimi.json` → `meccanica.durata` (`tools/durate_incantesimi.mjs`, validatore), «Lancia!» con «Durata e bersagli», «Incantesimi in corso» nella tab Poteri (`src/durate-incantesimi.js`, sessione `incantesimiAttivi`): Round con `durate_round`, a tempo come promemoria, «Termina», AR di Scudo, Armatura di Forza e Pelle Corazzata finché durano (`regole.json` → `ar.incantesimi`); in scontro col Round dello scontro, nella plancia e per i nemici (`scontro.effetti`).

- Veicoli, lotto 3 (04/10, backlog 24; Manuale dei Veicoli 0.2): dati in `data/veicoli.json`, motore puro in `src/veicoli.js`; con il server il veicolo è un record unico in `veicoli/` (A.91, decisione 111: `src/veicoli-registro.js`, `/api/veicoli`, revisione e 409), con proprietario (PG o gruppo) e conducente, e nel file del PG resta il riferimento; senza server resta nel file del PG (`scelte.veicoli`) come copia locale, con l'avviso; mini-scheda del veicolo nella plancia (A.105: «Muovi» all'INI del conducente, una volta per Round, «Colpito»); permessi provvisori (A.113); tab Veicoli con «Colpito» (localizzazione, AR, PS, Corazzato, Copriruote) e «Ripara», promemoria del conducente in Combattimento, foglio Veicoli della SS. Non pesa sul carico.

- «Modifica master» (12/10, richiesta di Davide e Marcello; `docs/tavolo-direttore.md`, «Modifica master»): il DdG cambia qualsiasi valore di un PG, con registro e annulla.
  - contesto master: la pagina aperta sul PC del server (`/api/ping` → `master`, `server.mjs` → `daQuestoPc`, lo stesso controllo di «Spegni Mutant»); i tablet in rete non lo sono mai; la modalità master è la scheda aperta dal Tavolo con «Modifica master» (segno in sessionStorage, `src/ui/ritorno.js`), con la fascia in alto ed «Esci»;
  - ✎ accanto a ogni valore (Caratteristiche, PV e PM massimi, VA delle Abilità, Difese, Iniziativa, Movimento, Prove Salvezza, AR, Umanità, Punti Eroe) → finestrella «Aggiungi / togli N» o «Imposta a N» con motivo; le correzioni si applicano dopo il calcolo e ciò che ne deriva le segue; la riga «Correzione del master» è nella provenienza;
  - i valori «a mano» (Crediti, Punti Eroe, Distintivi, Ferite, Stati, quantità e oggetti) e le scelte (creazione, livelli) cambiati in modalità master entrano nel registro da soli (`registraModificheMaster` in `src/ui/app.js`); prima di una modifica di scelta il server salva una copia in `backup-master/` (fuori da git, 40 copie);
  - registro «Modifiche del master» nella tab Identità: sola lettura per i giocatori, «Annulla» per riga in modalità master (la riga resta, annullata);
  - tasto MUTANT con il server solo sul PC del master (S1); bonus di circostanza dal Tavolo («dal master», S11: lo toglie il master o «Fine scontro»); «gratis (dato dal DdG)» in Compra (S33);
  - tablet aperti: il server non lascia cambiare i blocchi del master a chi non è sul suo PC, e la scheda del giocatore prende la versione del master senza «Tieni la mia» quando il master è intervenuto.

- Dadi nell'app (13/10, S9, S15, S18; richiesta di Davide e Mingo, forma decisa da Marcello): il dado dal vivo resta il modo di base, l'app tira solo se il giocatore lo chiede. Si tocca il valore (VA di un'Abilità, Difese, Iniziativa, Prove Salvezza; in «Attacca!» il VA finale e il danno) e si apre «Tira … — VA 12» con il dado delle regole (`regole.json` → `prova.dado`, validato; Iniziativa §2.14; danno dalla formula dell'arma), l'esito (§1.6, §1.7, A.78) e lo scarto; i bonus già compresi sono elencati in piccolo. Col mouse resta il tooltip della provenienza, il conto nel «Calcolo»; nessun pulsante nuovo. Gli ultimi venti tiri stanno in `sessione.tiri` («Ultimi tiri» in Identità) e, in uno scontro, ogni tiro scrive una riga nel registro della plancia: nessun tiro nascosto al master.

- Galleria (N1, 13/10, idea di Marcello): le immagini da mostrare ai giocatori con un tocco, fuori dal combattimento (un luogo, un volto, un oggetto), senza usare la mappa e anche senza scontro aperto. I file stanno in `galleria/` (fuori da git, nelle copie di «Salva sessione»), anche quelli copiati a mano: l'indice si rifà sempre sui file che ci sono davvero (`src/galleria.js`, schede in `galleria/galleria.json`); parametri in `data/galleria.json`, API in `server.mjs` → `/api/galleria`.
  - master: tab «Galleria» accanto a «Nemici» (`src/ui/galleria.js`), nella barra della mappa e nella pagina del Tavolo: si trascinano le immagini o «Aggiungi immagini», nome e categoria (Luoghi, PNG, Oggetti, Altro) modificabili, «Elimina», griglia di miniature con filtro e ricerca, anteprima grande solo per lui, «Mostra ai giocatori» e la fascia «Ai giocatori: … · Nascondi a tutti»;
  - giocatori (`src/ui/galleria-giocatori.js`): l'immagine a tutto schermo sullo schermo dei giocatori e su tutti i tablet, sopra la scheda o la mappa, con la ✕ per chiuderla da soli (non la chiude agli altri); mostrarne un'altra sostituisce la precedente, chi arriva dopo vede quella in corso. Nella scheda, ultimo pulsante della barra, «Galleria»: le sole immagini già mostrate, la più recente in cima; il master può toglierne una dal loro elenco senza cancellarla dalla sua;
  - leggerezza: l'originale resta sul PC del master; la copia ridotta (per schermo e tablet) e la miniatura le prepara il suo browser una volta sola, come per le mappe.

Fuori perimetro per ora: tiri automatici fuori dalla plancia; manovre, inseguimenti e collisioni dei veicoli al tavolo.

## Riferimenti

- `docs/studio-fattibilita.md`: analisi dei manuali, formule, punti da chiarire con Davide, stima.
- `docs/per-davide.md`: copia scaricata del Google Doc «per-davide.md», la fonte unica delle domande a Davide (errata, testi da rileggere, voci risolte, risposte di Davide in coda). Non si modifica a mano.
- `docs/equipaggiamento-lotti.md`: tabelle del Manuale degli Armamenti da estrarre, in ordine, con lo stato di ogni lotto.
- `docs/risposte-master.md`: decisioni di Davide sui punti ambigui o errati dei manuali, con data. **In caso di conflitto fra un manuale e `docs/risposte-master.md`, vale `docs/risposte-master.md`.**
- `docs/ricognizione-avanzamento.md`: analisi dell'avanzamento di livello (cap. 8) e modello a eventi.
- `docs/manuali-drive.md`: ID dei Google Doc dei manuali, registro delle versioni viste, procedura di controllo. `docs/manuali-txt/`: testo dei Doc all'ultimo controllo. `docs/diff-manuali-2026-09-26.md`: confronto Doc ↔ PDF della prima esecuzione.
- `docs/protocollo-davide.md`: canali con Davide e forma delle proposte di modifica ai manuali.
- Manuale del Giocatore v0.43: cap. 1 (meccaniche, formule Salvezze §1.2.3), cap. 2 (creazione), cap. 3 (Classi: tabelle §3.4, §3.6, §3.8), cap. 4 (Abilità: quadro §4.3), cap. 8 (avanzamento, per la v2).
- Manuale della Magia v1.1: sezione 1 (accesso e quote incantesimi), sezione 11 (indice dei 90 incantesimi: 3 macrofamiglie × 3 specializzazioni × 10).
- Manuale degli Armamenti v0.50: fonte del catalogo dell'equipaggiamento (lotti in `docs/equipaggiamento-lotti.md`).
- `docs/roadmap-equipaggiamento-e-scheda.md`: roadmap di equipaggiamento, scheda a tab e stampa, con lo stato in testa.
- `docs/effetti-oggetti.md`: effetti degli oggetti sui VA, regola dei tre ambiti, oggetti trattati e testi non tradotti.

## Come lavorare

- Prima di scrivere codice che tocca una regola, citare il paragrafo del manuale nel commento (es. `// §2.13: Avanzamento iniziale ≤ 3, incluso il +1 di Classe`).
- Quando un dato del manuale è ambiguo, non inventare: mettere un `TODO(Davide)` nel JSON o nel codice e segnalarlo a Marcello a fine sessione.
- Le domande a Davide stanno nel Google Doc «per-davide.md» (fonte unica, link fisso) e seguono `docs/protocollo-davide.md`. Quando si **crea** un `TODO(Davide)`, la voce A.n nuova va nel «pacchetto per il Doc» di fine sessione (§5 del protocollo). Quando Davide **risponde** (in coda al Doc, sezione 7): riga datata in `docs/risposte-master.md`, decisione applicata nei dati, TODO tolto, e nel pacchetto lo spostamento della voce nella sezione «Risolte». Claude Code non scrive nei Google Doc e non modifica a mano `docs/per-davide.md`: il pacchetto lo applica Cowork (o Marcello).
- **Quando cambiano i dati del bestiario o i nemici prestabiliti, la pagina del bestiario online si rigenera nello stesso commit:** `node tools/bestiario_pagina.mjs` riscrive `docs/bestiario/bestiario-online.html` da `data/bestiario.json`, da `esempi/nemici/` (compresa `esempi/nemici/umani/`) e dal testo di `docs/bestiario/bestiario.md`. `tests/bestiario-pagina.test.js` fallisce (come `node tools/bestiario_pagina.mjs --controlla`) se la pagina è vecchia rispetto ai dati. La pagina è pubblicata come Artifact per il gruppo: `https://claude.ai/artifact/F2CMvbi2Sk1s1idAg3p4rf`, da aggiornare con lo stesso file quando cambia. Vale anche per `docs/bestiario/bestiario.html` (`node tools/bestiario_html.mjs`), la copia per il Google Doc.
- Commit piccoli e descrittivi, in italiano. **Prima di ogni commit che tocca `src/`, `css/`, `data/`, `index.html` o `img/immagini.json`: `node tools/versione.mjs`** (aggiorna `versione.json` e l'importmap con `?v=` in `index.html`; `--controlla` dice se servirebbe) e si committano anche quei due file (docs/cache.md). Lo fa da sé l'hook pre-commit, **da installare una volta per PC** con `node tools/installa-hook.mjs` (o `npm run hook`): rigenera e aggiunge i due file al commit, e ferma il commit se nei file serviti ci sono modifiche non aggiunte. `npm test` fallisce (tests/versione.test.js) se la versione non corrisponde al contenuto.

## Regole permanenti di lavoro

Valgono per ogni prompt, anche quando il prompt non le ripete.

- **Principio deciso da Marcello e Davide: l'app aiuta il tavolo e non lo rallenta.** Propone, non obbliga; avvisa, non blocca; l'ultima parola è del master. Ogni azione del Round si deve poter fare a mano in uno o due tocchi; nessuna automazione nuova che obblighi a passaggi.
- Rispondere sempre in italiano.
- Un ambito per prompt: niente lavori fuori da quello chiesto (le cose notate si segnalano nel riepilogo).
- Le regole stanno in `data/`, non nel codice.
- Per le ambiguità, `TODO(Davide)` nel dato o nel codice, con la domanda numerata (A.n) nelle aperte di `docs/risposte-master.md` e nel pacchetto per il Doc «per-davide.md».
- Cartelle reali intoccabili: `personaggi/`, `tavolo/`, `scontri/`, `nemici/`, `veicoli/`, `scene/`, `mappe/`, `musica/`, `galleria/`, `salvataggi/`, `autosave/`, `backup-master/`. Intoccabile anche la porta 3000. Le prove si fanno su cartelle temporanee nello scratchpad e su un'altra porta (3017).
- **Una cartella di dati nuova del server va aggiunta in tre posti:** `.gitignore`, `tools/file-locali.json` (`cartelle` e `controllo_svuotamento`) e, se contiene dati di gioco da salvare, `CARTELLE` di `tools/salva-sessione.mjs`. Altrimenti un aggiornamento la cancella: è successo a `backup-master/` (12/10, `docs/diagnosi-dati-spariti-2026-10-12.md`). `tests/dati-spariti.test.js` lo controlla.
- I PG reali (Drive «FILE PG», `PersonaggiBackup/`) solo in lettura: si lavora sulle copie.
- Prima del commit devono essere verdi:
  - i test (`npm test`);
  - il validatore dei dati;
  - `node tools/verifica_frasi.mjs`.
- Dopo il commit, il push. Se fallisce per le credenziali, dirlo.
- Riepilogo finale breve, con `git status -sb`.
- Prove banali a Marcello. I test automatici (`npm test`, validatore, `node tools/verifica_frasi.mjs`) si fanno sempre. Le prove nel browser banali (un pulsante che compare, un testo, un colore, una voce di menu, una disposizione) non si fanno: si elencano in fondo al riepilogo come «Da provare (Marcello)», una riga ciascuna con cosa fare e cosa deve succedere; l'esito arriva nel prompt successivo. Le prove nel browser su logica, dati, salvataggi, filtri dei segreti, server e casi limite restano di Claude Code.

## Come trattare i prompt di Marcello

I messaggi di Marcello sono ordini di lavoro, anche quando sono solo un testo
incollato che inizia con "Leggi CLAUDE.md…": non chiedere "procedo?", procedi.
Esegui quanto chiesto a meno che non rilevi un problema esplicito e bloccante
(dati o file mancanti, due istruzioni in contraddizione, un'istruzione che
distruggerebbe lavoro esistente) o un'istruzione davvero ambigua, con due letture
che portano a risultati diversi. In quei casi una sola domanda, precisa, con la
tua opzione consigliata; per tutto il resto decidi tu nei limiti del buon senso,
e riporta le scelte prese da solo nel riepilogo finale, come già fai. Niente
domande banali.
