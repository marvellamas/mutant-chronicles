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

- **SD** = scheda digitale: la scheda a tab dell'app, con la modalità tavolo (`src/ui/tab.js`). Otto tab in una riga in alto (branch `layout-sd`, esito in `docs/layout-sd.md`), con Punti Eroe, PV e PM nella colonna di sinistra:
  - **Identità:** anagrafica, Caratteristiche, Prove Salvezza, Distintivi, vantaggio, note;
  - **Abilità:** tabella compatta, colonna Condizioni attive, Talenti, Specializzazioni; per le Tecniche Interiori solo il rimando a Poteri;
  - **Combattimento:** valori e Prove Salvezza, armi in mano per mano («Attacca!», «Ricarica»), armi disponibili, Protezioni; a destra Ferite, Affaticamento, Corruzione, Stati;
  - **Poteri:** la Magia («Lancia!», PM, cristalli); Risorse Interiori (le Tecniche Interiori come gli incantesimi, «Attiva», Round e Tecniche attive); «Nessun potere» senza l'una e l'altra; «Da artefatti»;
  - **Artefatti:** sintonizzazione, schede degli Artefatti, riserve di Chroma;
  - **Cibernetica:** Umanità con la provenienza e gli effetti della fascia, impianti installati per famiglia, chip, perdite e recuperi;
  - **Veicoli:** in attesa del manuale;
  - **Inventario:** Carico e Crediti, Integrità, oggetti per sezione con stato (anche deposito comune), PI e Ripara, condizione delle armi, caricatori di riserva, applicazioni sanitarie, catalogo con «Compra»;
  - Calendario in coda, se attivo.
- **SS** = scheda da stampare: la vista di stampa A4 orizzontale (`#/p/<id>/stampa`, `src/ui/stampa.js`, `css/stampa.css`). Fogli come i tab della SD (branch `layout-ss`, esito in `docs/layout-ss.md`):
  - 1 Identità, 2 Abilità, 3 Combattimento (due pagine fisse: Armi; Condizione ed equipaggiamento indossato), 4 Inventario sempre;
  - 5 Poteri con la magia; 6 Artefatti con Artefatti o riserve di Chroma;
  - piè di pagina «foglio N · pagina P di T»; nel foglio 3 «foglio 3 · pagina 1/2 · P di T».

## Stack (deciso)

- Web app statica, **senza build step**: `index.html` + `src/*.js` (ES modules) + `css/`. Vanilla JS. Nessun framework, nessun bundler, nessuna dipendenza npm a runtime.
- Deve funzionare da browser desktop e telefono. Si serve con un qualunque server statico (`python -m http.server` in locale; GitHub Pages o simile per il gruppo).
- Avvio con e senza server: `avvia.bat` (e `npm start`, `npx serve`, GitHub Pages) è l'app di sempre, con i personaggi nel browser; `avvia-server.bat` (`node server.mjs`, porta 3000, `--rete` per la rete di casa) aggiunge il Tavolo del Master e la cartella dei personaggi. L'app riconosce il server dall'intestazione `X-Mutant-Server` su `versione.json` (`src/ui/cartella.js`): senza server nessuna richiesta a `/api`. Piano ed esito in `docs/tavolo-direttore.md`; resta il pezzo 7 (sessione di prova vera).
- Cartelle del server, fuori da git salvo il `LEGGIMI.txt`: `personaggi/` (file dei PG), `tavolo/` (chi è al tavolo), `scontri/` (scontri e archivio), `nemici/` (bestiario della campagna). `esempi/` (tracciata): PG d'esempio, `esempi/nemici/` e il bestiario umano `esempi/nemici/umani/`, copiati da «Carica esempi» della plancia senza sovrascrivere.
- Test: Node (`node --test`, cioè `npm test`) sulle funzioni pure del motore. I test non richiedono browser.
- File del personaggio esportato: formato 8 (`VERSIONE_FORMATO` in `src/character.js`): `{ formato, versione, versioni_dati, scelte, livelli, sessione, calendario? }`, con i PI attuali degli oggetti in `sessione.integrita` e l'Umanità in `scelte.umanita` (scritta solo se non vuota). I formati precedenti si importano e si migrano (senza `calendario`: non attivo; senza `integrita`: oggetti ai PI massimi; senza `umanita`: si registrano gli impianti già installati).
- File del solo calendario: `calendario_<nome>_<data>.json`, `{ tipo: "calendario", versione: 1, app: "mutant", esportato, da, calendario }` con il blocco com'è nel salvataggio (`src/calendario.js` → `fileCalendario`, `leggiFileCalendario`); l'import sostituisce l'intero blocco dopo una conferma. L'export del personaggio non cambia.

## Principi non negoziabili

1. **Tutte le regole numeriche stanno in `data/*.json`, mai nel codice.** Corporazioni, Addestramenti, Classi, Abilità, Talenti, Incantesimi, costanti (punti alla creazione, massimi, base delle Salvezze…). La UI si genera dai dati: aggiungere una Corporazione non deve richiedere di toccare HTML o JS.
2. **Validatore dati all'avvio** (`src/validate.js`): controlla gli invarianti dei manuali (ogni Classe classifica le 24 Abilità una volta ciascuna in 2 Specializzate, 6 Professionali, 12 Generiche e 4 Non competenti, con basi 7/6/5/3 che sommano 122, da `regole.json` → `competenze`; ogni Classe ha 5 Abilità di Classe esistenti; ogni Abilità ha una Caratteristica valida; ecc.). Un errore deve dire *file, chiave e cosa non torna*, mai crashare in silenzio.
3. **Separare scelte da valori calcolati.** Il personaggio salvato contiene solo le scelte del giocatore (corporazione, punti assegnati, classe, incantesimi…). Tutti i valori derivati (VA, PV, PM, Salvezze, Iniziativa) si ricalcolano con funzioni pure in `src/calc.js`. Così se Davide cambia una tabella, ricaricare il personaggio lo aggiorna.
4. **Ogni file dati riporta `versione_manuale`** (es. "Giocatore 0.43") e l'app la mostra.
5. **Gli esempi numerici del manuale sono test.** Il Mishima Avventuriero Agente (§2.1, §2.13, §2.14, §2.17 del Manuale del Giocatore): FOR 6 COS 6 DES 7 INT 5 SAG 7 CAR 5 → PV 16, PM 9, Tempra 10, Riflessi 11, Volontà 9, Magia 10, Iniziativa +2, Furtività VA 9 (2 + 6 + 0 + 1, al limite Professionale del I Grado), Percezione e Raggirare VA 12 (§2.13 del 29/09). L'esempio Bauhaus Assaltatore COS 7 (§1.2.3): Tempra 11.

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
  lancio.js     utility di lancio degli incantesimi (stesso impianto)
  ricarica.js   ricarica delle armi a distanza dalle riserve
  dotazioni.js  equipaggiamento iniziale (§2.16): scelte, crediti, acquisti, voci della dotazione
  sessione.js   valori attuali di sessione (modalità tavolo)
  tecniche.js   «Attiva» delle Tecniche Interiori (§8.9.1): solo PM personali, una per Round, durata R+N, Svenuto, Umanità 0
  umanita.js    Umanità (Giocatore §5.21): registro delle installazioni, valore con provenienza, fascia
  versione.js   confronto fra versione caricata e versione.json; ui/aggiornamento.js la barra «Nuova versione»
  provenienza.js  righe { fonte, valore, nota? } dei valori calcolati (AR, VA, Salvezze, Iniziativa, Movimento, danno): le stampano i tooltip della SD e la SS
  stampa.js     dati dei fogli di stampa e delle tab
  ui/           wizard a passi (fasi 0–9 del §2.0), scheda a tab, Sali di livello, stampa, import/export
data/           JSON delle regole (fonte di verità): 12 file in data/ (formato_nemici.json: formato dei nemici del Tavolo del Master, per-davide A.73, validaNemico in validate.js), catalogo in data/equipaggiamento/ (index.json + 21 file)
server.mjs      server di Mutant per il Tavolo del Master (avvia-server.bat): file statici, /api per personaggi, tavolo, scontri, nemici, esempi
personaggi/ tavolo/ scontri/ nemici/  dati del server, fuori da git (si traccia il LEGGIMI)
tests/          node --test; tests/collaudo/ tre personaggi di riferimento con PDF
esempi/         PG d'esempio (tools/genera_esempi.mjs; Aiko Tenzan da tools/genera_esempio_tecniche.mjs), nemici/ e nemici/umani/ (tools/genera_nemici_umani.mjs)
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

- utility «Attacca!» nella tab Combattimento (nessun tiro di dado), pannello a passi comune (`src/ui/pannello-passi.js`): attacco a distanza (`regole.json` → `attacco_distanza`, tooltip delle modalità da `modalita_di_fuoco`) e corpo a corpo con le Manovre del §5.12, Carica, due armi, Magistrale e «Senz'armi» (`regole.json` → `attacco_ravvicinato`); motore in `src/attacco.js`, Talenti in `effetti.attacco_distanza` / `effetti.attacco_ravvicinato`;
- parametri dei Talenti di Classe scelti dal giocatore (Disciplina del Lottatore, §3.5.5): `parametro` in classi.json con le opzioni e i loro effetti (tabelle per Grado), scelta in `parametriTalenti` della creazione o della voce di livello, permanente;
- Iniziativa, Movimento e Azioni effettivi nella SD (Stati, carico, MOV dell'armatura: `src/condizioni.js` → `valoriTavolo`);
- utility «Lancia!» nella tab Magia (nessun tiro di dado): `src/lancio.js`, `regole.json` → `lancio`, `incantesimi.json` → `meccanica` (da `tools/estrai_lancio.py`, poi `tools/scale_anticipazione.mjs --scrivi` per le scale dell'Anticipazione: il Risultato mostra il valore anticipato, `src/anticipazione.js`, o «da definire al tavolo»), effetti.lancio dei Talenti, con il riquadro dell'Anticipazione che dice cosa vale con i Talenti del personaggio;
- Calendario di gioco facoltativo (ingranaggio → Calendario): tab con viste Giorno / Settimana / Mese, note per fascia con bandierine e «M», ricerca, «Avanza»; fuori dalle regole, non tocca calcoli né stampa. `src/calendario.js` (funzioni pure), `src/ui/calendario.js`, `regole.json` → `calendario`, colori `--evento-*` in `css/palette.css`; blocco `calendario` nel personaggio (formato 6), non toccato da «Nuova sessione» né dai livelli;
- ricarica dalle riserve (`src/ricarica.js`, `munizioni.json` → `ricarica`);
- regole aggiornate sui Punti Abilità Liberi (Doc del 27/09, per-davide A.52): gli eventi già registrati con meno punti delle regole correnti si completano dall'avviso in cima alla SD («Assegna», `#/p/<id>/completa`, `src/ui/completa.js`; motore in `src/avanzamento.js` → `statoCompletamento`, `validaCompletamento`, `applicaCompletamento`), i punti si registrano nell'evento a cui appartengono; finché mancano, l'avanzamento è bloccato; i punti in eccesso si segnalano soltanto. Titolo dell'avviso in `regole.json` → `regole_aggiornate`.
- categorie di competenza (Giocatore del 29/09 23:45, §2.3, §2.13, §8.3, §8.7): le basi delle Abilità vengono dalla prima Classe (`classi.json` → `competenze`, S 7 / P 6 / G 5 / N 3), l'Addestramento non ha più valori base; VA personale = min(Mod + Base + Corp + Avanzamento, limite della categoria migliore fra le Classi possedute), con le formule in `regole.json` → `competenze`; i +1 di Classe si registrano sempre, i punti liberi valgono solo se aumentano il VA personale. I punti già spesi che non lo aumentano più restano nel file, non contano e si riassegnano con lo stesso «Assegna» (`applicaCompletamento(…, inattivi)`); motore in `src/competenze.js`, ricognizione in `docs/ricognizione-abilita-2026-09-30.md`.

- tab Inventario (`docs/layout-sd.md`, pezzo 2): unica casa degli oggetti, con sezioni per famiglia su due colonne nell'ordine di Davide del 02/10 (`src/palette.js` → `SEZIONI_INVENTARIO`, campo `colonna`; una colonna sola sotto i 46rem; stesso ordine nel foglio 4 della SS), stato di ogni oggetto in `voce.stato` con il valore `deposito` (deposito comune: fuori dal carico, senza effetti, fuori dal tavolo), PI e Ripara nella riga, Carico e Crediti in testa, «Compra» dal catalogo.

- tab Combattimento (`docs/layout-sd.md`, pezzo 3): colonna sinistra con valori, Prove Salvezza, armi in mano per mano (Ricarica e «Attacca!»), armi disponibili e Protezioni; colonna destra con Ferite, Affaticamento, Corruzione Oscura (§5.20, `regole.json` → `corruzione.stati`, `sessione.corruzione`, nei valori effettivi) e Stati. Caricatori di riserva, condizione delle armi e applicazioni sanitarie si cambiano nell'Inventario.

- tab Poteri e Artefatti (`docs/layout-sd.md`, pezzo 4): Poteri per tutti (la Magia di prima, o «Nessun potere» da `regole.json` → `poteri`; «Da artefatti» in sola lettura); Artefatti con sintonizzazione, schede degli Artefatti ed effetti con provenienza, riserve di Chroma. Un Artefatto nel deposito comune non è sintonizzabile.

- Tecniche Interiori al tavolo (richiesta di Davide del 02/10, `docs/ricognizione-tecniche-interiori.md`): sezione «Risorse Interiori» della tab Poteri per chi ha Risorse Interiori, una scheda per Tecnica con «Attiva» (`src/ui/tecniche.js`, pannello come «Lancia!»); motore puro `src/tecniche.js` sulle regole comuni del §8.9.1 (solo PM personali, avviso se non bastano, conferma e Svenuto se la riserva resta a 0, una per Round con «Nuovo Round», durata dal Round R alla fine di R + N, durate a tempo terminate a mano, blocco a Umanità 0, nessuna Prova di Potere salvo Silenzio Mentale); sessione `round`, `ultimaTecnica`, `tecnicheAttive`; costi e durate numerici in `tecniche_interiori.json` (`costo_pm`, `opzioni_costo`, `durata_tipo`, `durata_round`, `attivazione`). Aura di Resistenza e Pelle di Rinoceronte danno AR finché sono attive. Effetti delle 28 Tecniche (prompt 2): `effetti` in `tecniche_interiori.json` (`tools/effetti_tecniche.mjs`), nei valori effettivi e in «Attacca!» finché sono in corso (le istantanee fino alla fine del Round), provenienza «Tecnica: Nome (fino al Round N)», non spenti da «Bonus dei Talenti»; Imposizione della Mano Curativa applicabile dal pannello; Onda Interiore come profilo d'attacco. SS: elenco delle Tecniche nel foglio 5 (Poteri), che si stampa anche senza magia, con la colonna «Effetto» se l'elenco entra.

- Talenti nei valori effettivi (`docs/censimento-talenti.md`): `effetti.valori` delle voci dei Talenti nello schema degli oggetti (scritti da `tools/effetti_talenti.py`), applicati al tavolo da `src/talenti.js` e `src/condizioni.js` (generali, situazionali con interruttore, usi specifici a parte); interruttore globale «Bonus dei Talenti» in `sessione.bonusTalenti` (Combattimento e Poteri), che spegne anche i Talenti di «Attacca!» e «Lancia!».

- NEC e strumenti professionali (Equipaggiamento 0.5, cap. 5; lotto 2 del 01/10): catalogo NEC in `data/equipaggiamento/nec.json` e regole in `regole.json` → `nec`; strumenti in `strumenti_professionali.json`; campo `alimentazione` degli oggetti (NEC, consumo, ore o usi); riserva al tavolo in `sessione.nec` (`src/equipaggiamento.js` → `riserveNec`, − e + nella riga dell'Inventario) e quadratini nel foglio 4 della SS. I lotti storici non riscrivono senza `--forza` (`tools/lotti/superato.mjs`).

- Cibernetica e Umanità (Equipaggiamento 0.5, cap. 7; Giocatore §5.21; lotto 3 del 01/10, `docs/ricognizione-cibernetica.md`):
  - impianti in `data/equipaggiamento/impianti.json`: tipo `impianto`, stati «installato» e «zaino», con UMN e chip del Processore; regole in `regole.json` → `umanita` e → `impianti`;
  - `src/umanita.js`: la perdita si registra all'installazione (`normalizza`) e resta se l'impianto si toglie; i recuperi li concede il Direttore;
  - la fascia riduce PM Massimi, capacità di Sintonizzazione e PS di Magia contro la Corruzione;
  - tab Cibernetica della SD e foglio Cibernetica della SS, che si stampa solo con impianti installati o Umanità ridotta.

- Equipaggiamento 0.5, cap. 6 ampliato e cap. 8 (lotto 4 del 01/10): naniti medici e postazioni medicochirurgiche in `sanitario.json`, campo `cura` con i numeri delle cure (`src/equipaggiamento.js` → `testoCura`, tooltip e Inventario), `alimentazione` anche come elenco di NEC; il cap. 8 riassume il §2.16 del Giocatore, controllato da `tools/lotti/lotto_equipaggiamento_08.mjs`. Tutti i capitoli dell'Equipaggiamento 0.5 sono nel catalogo.

- Rinforzi come sottocategoria delle armature (richiesta di Davide del 02/10): tipo `rinforzo` (`rinforzi.json`, lotto `tools/lotti/lotto_rinforzi_armature.mjs`), «Montata su:» con le armature indossate compatibili e, per soprabiti e mantelli (`indossabile_da_solo`), «Indossato da solo»; regole da solo e ad armatura tolta in `regole.json` → `rinforzi`, con TODO(Davide) A.80.

- Manuali del 02/10 (`docs/diff-manuali-2026-10-02-sera.md`), lotti 1–3: capacità di sintonizzazione 8–13 (Architetto 10–15, `artefatti.json` → `sintonizzazione`); A.78, attacchi e Difese si tirano anche con VA ≥ 20 (`regole.json` → `prova.tiro_sempre`, `magistrale_migliorato`; `src/prova.js`); riserve Batteria/Cariche e proprietà Esclusive/Universali con una sola fonte esterna per pagamento (`regole.json` → `chroma.riserve`, `src/fonti.js`; le armi del §7.5.1 restano a Cariche). Lotti 4–7: catalogo del cap. 10 (`tools/lotti/lotto_artefatti_cap10.mjs`: Batterie Mistiche e Matrice, Schegge instabili, Pietra della Vigilanza, Guanti da Combattimento Mistico; `regole.json` → `chroma.matrice`, `cristalli_matrice`, `schegge`; «Ricarica dalla Matrice» nella tab Artefatti), risposte dell'equipaggiamento A.62–A.68 e A.71 (`tools/lotti/lotto_risposte_equip_0210.mjs`, voci uscite in `index.json` → `rif_sostituiti`), Rituali A.74 (`ripartizioneMagistrale`), Capolavoro del Corazzaio A.61 (`effettoCapolavoro`, scelta sulla voce dell'armatura).

- Tavolo del Master (su main dal 02/10; solo con `avvia-server.bat`, `docs/tavolo-direttore.md`): plancia con i PG al tavolo in sola lettura, scontro con Iniziativa e parità, Round e durate degli Stati, nemici dal bestiario (`data/formato_nemici.json`, A.73) con Ferite, Menomazioni, PM e «Lancia!», danno applicato («Colpito»), «Attacca» dei nemici con il pannello dei PG, giocatori collegati con revisione; convertitore «PG → nemico» (`src/nemico-da-pg.js`). Bestiario proposto in `docs/bestiario/` (`bestiario.md`, `bestiario.html` per Google Doc, `tools/taratura_bestiario.mjs`).

Fuori perimetro per ora: tiri automatici fuori dalla plancia, veicoli.

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
- Commit piccoli e descrittivi, in italiano. **Prima di ogni commit che tocca `src/`, `css/`, `data/`, `index.html` o `img/immagini.json`: `node tools/versione.mjs`** (aggiorna `versione.json` e l'importmap con `?v=` in `index.html`; `--controlla` dice se servirebbe) e si committano anche quei due file (docs/cache.md). Lo fa da sé l'hook pre-commit, **da installare una volta per PC** con `node tools/installa-hook.mjs` (o `npm run hook`): rigenera e aggiunge i due file al commit, e ferma il commit se nei file serviti ci sono modifiche non aggiunte. `npm test` fallisce (tests/versione.test.js) se la versione non corrisponde al contenuto.

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
