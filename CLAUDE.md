# Mutant — creatore assistito di personaggi per SIMPLY RPG

Tool interno per il gruppo di gioco di ruolo. Non va pubblicato. Il master (Davide) cambia spesso parametri e tabelle: questo vincolo guida ogni scelta tecnica.

Lingua del progetto: italiano (UI, commenti, commit, documentazione). Terminologia: quella dei manuali (Caratteristica, Abilità, Addestramento, Classe, Grado, Talento, VA, PV, PM, Salvezza).

## Stack (deciso)

- Web app statica, **senza build step**: `index.html` + `src/*.js` (ES modules) + `css/`. Vanilla JS. Nessun framework, nessun bundler, nessuna dipendenza npm a runtime.
- Deve funzionare da browser desktop e telefono. Si serve con un qualunque server statico (`python -m http.server` in locale; GitHub Pages o simile per il gruppo).
- Test: Node (`node --test`) sulle funzioni pure del motore. I test non richiedono browser.
- La cartella Godot (`project.godot`, `.godot/`, `icon.svg*`) è un residuo della prima ipotesi: va rimossa quando Marcello lo conferma, non prima.

## Principi non negoziabili

1. **Tutte le regole numeriche stanno in `data/*.json`, mai nel codice.** Corporazioni, Addestramenti, Classi, Abilità, Talenti, Incantesimi, costanti (punti alla creazione, massimi, base delle Salvezze…). La UI si genera dai dati: aggiungere una Corporazione non deve richiedere di toccare HTML o JS.
2. **Validatore dati all'avvio** (`src/validate.js`): controlla gli invarianti dei manuali (ogni Addestramento somma 48 con schema 4×4, 4×3, 8×2, 4×1, 4×0; ogni Classe ha 5 Abilità esistenti; ogni Abilità ha una Caratteristica valida; ecc.). Un errore deve dire *file, chiave e cosa non torna*, mai crashare in silenzio.
3. **Separare scelte da valori calcolati.** Il personaggio salvato contiene solo le scelte del giocatore (corporazione, punti assegnati, classe, incantesimi…). Tutti i valori derivati (VA, PV, PM, Salvezze, Iniziativa) si ricalcolano con funzioni pure in `src/calc.js`. Così se Davide cambia una tabella, ricaricare il personaggio lo aggiorna.
4. **Ogni file dati riporta `versione_manuale`** (es. "Giocatore 0.43") e l'app la mostra.
5. **Gli esempi numerici del manuale sono test.** Il Mishima Avventuriero Agente (§2.1, §2.13, §2.14, §2.17 del Manuale del Giocatore): FOR 6 COS 6 DES 7 INT 5 SAG 7 CAR 5 → PV 16, PM 9, Tempra 10, Riflessi 11, Volontà 9, Magia 10, Iniziativa +2, Furtività VA 9. L'esempio Bauhaus Assaltatore COS 7 (§1.2.3): Tempra 11.

## Struttura prevista

```
index.html
css/
src/
  rules.js      carica data/*.json, espone i dati validati
  validate.js   invarianti dei dati
  calc.js       funzioni pure: modificatori, VA, Salvezze, PV/PM, Iniziativa
  character.js  modello delle scelte + serializzazione JSON
  ui/           wizard a passi (fasi 0–9 del §2.0), scheda riepilogo, import/export
data/           JSON delle regole (fonte di verità)
tests/          node --test
docs/           studio di fattibilità, note per Davide su come modificare i dati
Manuali/        PDF dei manuali (fonte). Non modificare.
```

## Perimetro v1

Creazione al 1° livello completa (sequenza §2.0), Incantesimi per Taumaturghi, scheda riepilogo stampabile (CSS `@media print`), salva/carica in `localStorage` + export/import file JSON, dati modificabili da Davide con validatore.

Fuori dalla v1: avanzamento 2–20, catalogo armi/armature, combattimento. L'equipaggiamento iniziale è un campo di testo libero (§2.16 del manuale non è ancora scritto).

## Riferimenti

- `docs/studio-fattibilita.md`: analisi dei manuali, formule, punti da chiarire con Davide, stima.
- `docs/risposte-master.md`: decisioni di Davide sui punti ambigui o errati dei manuali, con data. **In caso di conflitto fra un manuale e `docs/risposte-master.md`, vale `docs/risposte-master.md`.**
- `docs/ricognizione-avanzamento.md`: analisi dell'avanzamento di livello (cap. 8) e modello a eventi.
- Manuale del Giocatore v0.43: cap. 1 (meccaniche, formule Salvezze §1.2.3), cap. 2 (creazione), cap. 3 (Classi: tabelle §3.4, §3.6, §3.8), cap. 4 (Abilità: quadro §4.3), cap. 8 (avanzamento, per la v2).
- Manuale della Magia v1.1: sezione 1 (accesso e quote incantesimi), sezione 11 (indice dei 90 incantesimi: 3 macrofamiglie × 3 specializzazioni × 10).
- Manuale degli Armamenti v0.50: non serve per la v1.

## Come lavorare

- Prima di scrivere codice che tocca una regola, citare il paragrafo del manuale nel commento (es. `// §2.13: Avanzamento iniziale ≤ 3, incluso il +1 di Classe`).
- Quando un dato del manuale è ambiguo, non inventare: mettere un `TODO(Davide)` nel JSON o nel codice e segnalarlo a Marcello a fine sessione.
- Quando Davide risponde a un `TODO(Davide)`, registrare la decisione con la data in `docs/risposte-master.md`, applicarla nei dati e togliere il TODO.
- Commit piccoli e descrittivi, in italiano.
