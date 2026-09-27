# Mutant — creatore assistito di personaggi per SIMPLY RPG

Tool interno per il gruppo di gioco di ruolo. Non va pubblicato. Il master (Davide) cambia spesso parametri e tabelle: questo vincolo guida ogni scelta tecnica.

Lingua del progetto: italiano (UI, commenti, commit, documentazione). Terminologia: quella dei manuali (Caratteristica, Abilità, Addestramento, Classe, Grado, Talento, VA, PV, PM, Salvezza).

## All'inizio di OGNI sessione: controllo dei manuali

Prima di qualunque altro lavoro, eseguire la procedura di controllo di `docs/manuali-drive.md` su:

- i quattro Google Doc dei manuali: Giocatore, Magia, Armamenti, Equipaggiamento;
- il Doc «E&L – Risposte e correzioni approvate» (ID `1VaqZaAe4NK5P8A956Eahua_ZT60eh3ohnR2xSqh-tVs`).

Si confronta il `modifiedTime` di ciascuno con il registro.

- Se nessuno è cambiato: riferire in una riga «manuali e risposte invariati».
- Altrimenti applicare la procedura, poi riferire che cosa è cambiato e che cosa è stato applicato. La procedura: testo in `docs/manuali-txt/`, diff, classificazione regola / testo / cosmetica, dati, `docs/risposte-master.md` e `docs/per-davide.md`, registro.

Drive si usa **in sola lettura**: mai scrivere nei Doc di Davide, nemmeno commenti (`docs/protocollo-davide.md`). Se un Doc non è leggibile, segnalarlo subito senza inventare.

## Glossario

- **SD** = scheda digitale: la scheda a tab dell'app (Identità, Abilità, Combattimento, Magia), con la modalità tavolo (`src/ui/tab.js`).
- **SS** = scheda da stampare: la vista di stampa A4 orizzontale (`#/p/<id>/stampa`, `src/ui/stampa.js`, `css/stampa.css`).

## Stack (deciso)

- Web app statica, **senza build step**: `index.html` + `src/*.js` (ES modules) + `css/`. Vanilla JS. Nessun framework, nessun bundler, nessuna dipendenza npm a runtime.
- Deve funzionare da browser desktop e telefono. Si serve con un qualunque server statico (`python -m http.server` in locale; GitHub Pages o simile per il gruppo).
- Test: Node (`node --test`, cioè `npm test`) sulle funzioni pure del motore. I test non richiedono browser.
- File del personaggio esportato: formato 5 (`VERSIONE_FORMATO` in `src/character.js`): `{ formato, versione, versioni_dati, scelte, livelli, sessione }`. I formati precedenti si importano e si migrano.

## Principi non negoziabili

1. **Tutte le regole numeriche stanno in `data/*.json`, mai nel codice.** Corporazioni, Addestramenti, Classi, Abilità, Talenti, Incantesimi, costanti (punti alla creazione, massimi, base delle Salvezze…). La UI si genera dai dati: aggiungere una Corporazione non deve richiedere di toccare HTML o JS.
2. **Validatore dati all'avvio** (`src/validate.js`): controlla gli invarianti dei manuali (ogni Addestramento somma 48 con schema 4×4, 4×3, 8×2, 4×1, 4×0; ogni Classe ha 5 Abilità esistenti; ogni Abilità ha una Caratteristica valida; ecc.). Un errore deve dire *file, chiave e cosa non torna*, mai crashare in silenzio.
3. **Separare scelte da valori calcolati.** Il personaggio salvato contiene solo le scelte del giocatore (corporazione, punti assegnati, classe, incantesimi…). Tutti i valori derivati (VA, PV, PM, Salvezze, Iniziativa) si ricalcolano con funzioni pure in `src/calc.js`. Così se Davide cambia una tabella, ricaricare il personaggio lo aggiorna.
4. **Ogni file dati riporta `versione_manuale`** (es. "Giocatore 0.43") e l'app la mostra.
5. **Gli esempi numerici del manuale sono test.** Il Mishima Avventuriero Agente (§2.1, §2.13, §2.14, §2.17 del Manuale del Giocatore): FOR 6 COS 6 DES 7 INT 5 SAG 7 CAR 5 → PV 16, PM 9, Tempra 10, Riflessi 11, Volontà 9, Magia 10, Iniziativa +2, Furtività VA 9. L'esempio Bauhaus Assaltatore COS 7 (§1.2.3): Tempra 11.

## Struttura

```
index.html
css/            palette.css (colori con un significato, docs/palette.md), style.css (app e telefono), stampa.css (fogli A4)
src/
  rules.js      carica data/*.json, espone i dati validati
  validate.js   invarianti dei dati
  calc.js       funzioni pure: modificatori, VA, Salvezze, PV/PM, Iniziativa
  character.js  modello delle scelte + serializzazione JSON
  avanzamento.js  livelli 2–20 (cap. 8): ricalcolo, validazione, eventi
  incantesimi.js, checklist.js, descrizioni.js, tiri.js, lingua.js
  equipaggiamento.js  catalogo ed effetti degli oggetti
  attacco.js    utility d'attacco (a distanza; il corpo a corpo con lo stesso impianto)
  ricarica.js   ricarica delle armi a distanza dalle riserve
  dotazioni.js  equipaggiamento iniziale (§2.16): scelte, crediti, acquisti, voci della dotazione
  sessione.js   valori attuali di sessione (modalità tavolo)
  stampa.js     dati dei fogli di stampa e delle tab
  ui/           wizard a passi (fasi 0–9 del §2.0), scheda a tab, Sali di livello, stampa, import/export
data/           JSON delle regole (fonte di verità): 10 file in data/, catalogo in data/equipaggiamento/ (index.json + 14 file)
tests/          node --test; tests/collaudo/ tre personaggi di riferimento con PDF
tools/          estrazione dai manuali, generatori dei lotti (tools/lotti/), collaudo_pdf.mjs, genera_immagini.py
img/            stemmi e icone generati (img/immagini.json li elenca); originali in img/originali/, non tracciati
docs/           studio di fattibilità, lotti, domande e risposte del master, roadmap
distribuzione/  pacchetto per il master (guida e .bat)
Manuali/        PDF di partenza dei manuali (riferimento storico). Non modificare. La fonte corrente sono i Google Doc (docs/manuali-drive.md), con il testo in docs/manuali-txt/.
```

## Perimetro

La v1 (creazione al 1° livello) è chiusa. Oggi il progetto comprende:

- creazione completa (sequenza §2.0), con Incantesimi per i Taumaturghi;
- avanzamento dal 2° al 20° livello (cap. 8), un livello alla volta, annullabile (PV e PM attuali seguono i massimi: per-davide A.15);
- scheda digitale a tab (Identità, Abilità, Combattimento, Magia) con modalità tavolo: valori di sessione separati dalle scelte (`src/sessione.js`);
- stampa dedicata A4 orizzontale (`#/p/<id>/stampa`, `css/stampa.css`);
- equipaggiamento con catalogo a lotti dal Manuale degli Armamenti (`data/equipaggiamento/`, lista dei lotti in `docs/equipaggiamento-lotti.md`); equipaggiamento iniziale guidato (§2.16, E&L A.5–A.5.29): dotazione comune e della Classe, crediti 1000 + 2d6 × 100, acquisti con cessione degli armamenti di base; dati in `data/dotazioni.json` (generato da `tools/genera_dotazioni.py`), regole in `src/dotazioni.js`, voci marcate `dotazione_iniziale`; crediti attuali nella sessione;
- salva/carica in `localStorage`, export/import JSON, dati modificabili da Davide con validatore;
- valori effettivi in modalità tavolo: Ferite, Affaticamento, Stati con effetto numerico e carico (`regole.json`) entrano nei VA, nelle Salvezze e nella Parata mostrati nelle tab, con la scomposizione (`src/condizioni.js`, `src/carico.js`); il totale da regole e la stampa restano a riposo;
- effetti degli oggetti sui VA (`effetti` nel catalogo, negli oggetti di dotazione e nei personalizzati): generali, situazionali (interruttore al tavolo), d'uso specifico (valore a parte); frasi del manuale verificate da `tools/verifica_frasi.mjs` (`docs/effetti-oggetti.md`);
- Manuale dell'Equipaggiamento 0.1, cap. 1: carico (§1.6 = Giocatore §5.2.6) e PS Integrità per Qualità (§1.7) in `regole.json`.

- utility «Attacca!» nella tab Combattimento (nessun tiro di dado): attacco a distanza completo (`src/attacco.js`, `regole.json` → `attacco_distanza`, effetti.attacco_distanza dei Talenti), corpo a corpo per ora solo con il risultato base;
- ricarica dalle riserve (`src/ricarica.js`, `munizioni.json` → `ricarica`).

Fuori perimetro per ora: tiri automatici, gestione dei bersagli e dei danni, manovre del corpo a corpo (prossima sessione), veicoli, capitoli 2–8 del Manuale dell'Equipaggiamento (non ancora scritti).

## Riferimenti

- `docs/studio-fattibilita.md`: analisi dei manuali, formule, punti da chiarire con Davide, stima.
- `docs/per-davide.md`: domande aperte per Davide, errata dei manuali, testi da rileggere.
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
- `docs/per-davide.md` è l'unico elenco delle domande aperte per Davide. Ogni volta che si **crea** un `TODO(Davide)`, si aggiunge la voce nella sezione A di `docs/per-davide.md`. Ogni volta che se ne **chiude** uno (Davide ha risposto): si toglie la voce da `docs/per-davide.md`, si aggiunge una riga datata in `docs/risposte-master.md`, si applica la decisione nei dati e si toglie il TODO.
- Commit piccoli e descrittivi, in italiano.
