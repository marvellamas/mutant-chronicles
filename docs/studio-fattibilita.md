# Mutant — Studio di fattibilità: creatore assistito di personaggi per SIMPLY RPG

Data: 24 settembre 2026 (aggiornato dopo la scelta della tecnologia: web app, non Godot)
Fonti lette: Manuale del Giocatore v0.43 (138 pp.), Manuale della Magia v1.1 (151 pp.), Manuale degli Armamenti v0.50 (121 pp.).

## 1. Verdetto

**Sì, è fattibile in tempi brevi.** La creazione del personaggio al 1° livello è interamente deterministica e tabellare: nessuna regola ambigua nel percorso principale, tutte le formule sono esplicite e il manuale stesso fornisce esempi numerici verificabili (il Mishima Avventuriero Agente del §2.14 e §2.17) che diventano test automatici gratis.

La parte che costa di più non è la logica ma **l'inserimento dati** (classi, talenti, incantesimi). Il rischio principale non è tecnico: è che Davide cambi le tabelle. Per questo l'architettura deve essere *data-driven* fin dal primo giorno (vedi §4).

Stima realistica, lavorando con Claude Code a sessioni:

| Fase | Contenuto | Sforzo |
|---|---|---|
| v0.1 | Motore regole + dati (corporazioni, addestramenti, classi, abilità) + test sugli esempi del manuale | 1–2 sessioni |
| v0.2 | Wizard UI a passi (fasi 0–9 del §2.0) + scheda riepilogo + salva/carica | 2–3 sessioni |
| v0.3 | Incantesimi per i Taumaturghi | 1 sessione |
| v1.0 | Rifinitura, scheda stampabile, validatore dati e guida per Davide, pubblicazione per il gruppo | 1 sessione |

In totale, un prototipo usabile dal gruppo in **una-due settimane di lavoro part-time**. L'avanzamento di livello (2–20) è una v2 separata e più onerosa (§6).

## 2. Cosa deve fare il software (sequenza §2.0 del Manuale del Giocatore)

| Fase | Operazione | Dati necessari | Complessità |
|---|---|---|---|
| 0 | Concetto (testo libero) | — | banale |
| 1 | Corporazione (7 scelte: Bauhaus, Capitol, Cybertronic, Fratellanza, Imperiali, Mishima, Freelance) | 6 Caratteristiche iniziali, 4 Abilità +1, bonus Salvezze | tabella §2.9 + §2.11 |
| 2 | 5 Punti Caratteristica (max 7 alla creazione, non si riducono i valori iniziali) | — | validazione semplice |
| 3 | Addestramento (5 scelte) | 24 valori base 0–4, vantaggio, bonus Salvezze | tabelle §2.4–2.8, §2.10, §2.11 |
| 4 | Prima Classe (5 per Addestramento = 25 classi) | 5 Abilità di Classe, PV/Grado, PM/Grado, Talento fisso I Grado, quote incantesimi | tabelle §3.4, §3.6, §3.8 |
| 5 | 5 Punti Abilità Liberi | vincoli: VA ≥ 1 prima dell'assegnazione; Avanzamento totale ≤ 3 (incluso il +1 di Classe) | validazione |
| 6 | Valori derivati | PV = COS + contributo Classe (dado massimizzato); PM = SAG + contributo; 4 Salvezze = 8 + mod specifico + Addestramento + Corporazione; Iniziativa = Mod DES + Mod INT; Movimento fisso | formule §2.14 |
| 7 | Punti Eroe: 2d3 + 1 | tiro o inserimento manuale | banale |
| 8 | Equipaggiamento iniziale | **non ancora scritto nel manuale** (§2.16: "integrazione successiva") | rinviare |
| 9 | Controllo finale | checklist §2.17 | validatore |

Più, solo per Addestramento Taumaturgo: scelta degli Incantesimi conosciuti (2 + Mod INT liberi dall'Addestramento + quote di Classe per macrofamiglia, es. Arcanista I Grado: 3 Fisici + 3 Mentali + 3 Spirituali).

### Formule chiave (tutte esplicite nel manuale)

- Modificatore ordinario = Caratteristica − 5 (da −4 a +5).
- Modificatore per le Salvezze (scala diversa): 1–2 = −2; 3–4 = −1; 5 = 0; 6–7 = +1; 8–9 = +2; 10 = +3.
- VA = Mod Caratteristica + Base Addestramento (0–4) + Corporazione (0–1) + Avanzamento (0–8).
- Ogni Addestramento distribuisce 48 punti su 24 Abilità con schema fisso 4×4, 4×3, 8×2, 4×1, 4×0 → ottimo invariante da verificare nel validatore dati.
- Ogni Abilità ha una Caratteristica fissa (§4.3): 24 righe di tabella.

## 3. Chiarezza dei manuali

**Molto alta** per la creazione. Il testo è scritto in stile "regola + tabella + esempio", con rimandi numerati. Le tabelle si estraggono bene da PDF (verificato con `pdftotext -layout`).

Punti da chiarire con Davide prima o durante lo sviluppo (nessuno bloccante):

1. **Equipaggiamento iniziale** (§2.16): regole non ancora scritte. Proposta: in v1 campo testo libero; il catalogo del Manuale degli Armamenti (decine di tabelle, prezzi, reperibilità) si integra in seguito se serve.
2. **Incantesimi al 1° livello**: la quota "3 Fisici + 3 Mentali" della Classe si può spendere liberamente fra le 3 specializzazioni della macrofamiglia? I 2 + Mod INT liberi dell'Addestramento valgono per qualunque delle 9 specializzazioni? Il livello massimo conoscibile con 1 Grado è 3 (§1 Magia: "3 volte i Gradi taumaturgici"), quindi al 1° livello sono ammessi gli incantesimi a livello base 1 e 3 — da confermare.
3. **Talenti**: sono prosa con effetti meccanici. Il software deve *mostrarli* (nome + testo), non simularli. Al 1° livello conta solo il Talento fisso di I Grado; nessuna scelta da fare.
4. **Vincolo "VA almeno 1" per i punti liberi** (§2.13): con base 0 e modificatore negativo il VA può essere ≤ 0; l'app deve bloccare l'assegnazione. Conferma che il VA da verificare è quello *completo* (mod + base + corporazione + eventuale +1 di Classe).
5. **Manuali mancanti**: Equipaggiamenti, Veicoli, Direttore non sono nella cartella; Alleanza non è scelta iniziale. Non servono per la v1.
6. Numerazione capitoli: il Giocatore contiene i cap. 1–5 e 8; il cap. 6 (Magia) e 7 (Armamenti) sono gli altri volumi. Da tenere presente nei rimandi mostrati in app.

## 4. Il problema vero: Davide cambia le tabelle

Requisito centrale. Soluzione: **tutte le regole numeriche vivono in file di dati, non nel codice**.

- Cartella `data/` con file JSON: `caratteristiche.json`, `abilita.json`, `corporazioni.json`, `addestramenti.json`, `classi.json`, `talenti.json`, `incantesimi.json`, `regole.json` (costanti: punti alla creazione, massimo 7, formula Punti Eroe, base Salvezze 8, ecc.).
- L'interfaccia si **genera dai dati**: aggiungere una Corporazione o cambiare un valore base non richiede toccare HTML o JS.
- **Validatore all'avvio**: controlla che ogni Addestramento sommi 48 con lo schema 4/4/8/4/4, che ogni Classe abbia esattamente 5 Abilità esistenti, che ogni Abilità abbia una Caratteristica valida, ecc. Se Davide sbaglia una virgola, l'app mostra *quale file e quale chiave* invece di crashare o dare numeri sbagliati.
- **Modifica dei dati**: Davide edita i JSON nel repo (o su GitHub direttamente dal browser) e la pagina pubblicata si aggiorna. In più un pulsante "Importa regole" per provare un JSON alternativo senza toccare il repo.
- Ogni file dati porta `versione_manuale` (es. "Giocatore 0.43") mostrata in app, così si sa sempre a quale edizione corrisponde la scheda generata.
- Alternativa se Davide preferisce fogli di calcolo: CSV per tabella. JSON resta più robusto per strutture annidate (classi → talenti → testo).

Scelta consigliata: JSON con validatore + un piccolo documento "come modificare i dati" per Davide.

## 5. Architettura (web app statica, senza build)

Scelta rispetto a Godot: il tool è un modulo a passi con tabelle e testo, non un gioco. Il web offre stampa nativa, uso da telefono, un link condivisibile, zero installazione. Godot avrebbe imposto UI a form laboriose ed export web pesante. Se in futuro servisse un eseguibile, si impacchetta la pagina.

```
index.html
css/
src/
  rules.js      carica data/*.json, espone i dati validati
  validate.js   invarianti dei dati
  calc.js       funzioni pure: modificatori, VA, Salvezze, PV/PM, Iniziativa
  character.js  modello delle scelte + serializzazione JSON
  ui/           wizard a passi, scheda riepilogo, import/export
data/           JSON delle regole (fonte di verità)
tests/          node --test sulle funzioni pure
docs/           questo documento, guida per Davide
```

- Vanilla JS con ES modules, nessun framework né bundler: meno cose da mantenere per un tool interno.
- Separare **scelte** (corporazione, punti assegnati…) da **valori calcolati**: il salvataggio contiene solo le scelte; se Davide cambia una tabella, ricaricando il personaggio i valori si ricalcolano. È il vantaggio più concreto per il gruppo.
- Salvataggio: `localStorage` + export/import file JSON per scambiarsi le schede.
- Scheda stampabile: CSS `@media print`, il browser fa il PDF.
- Hosting: qualunque server statico. In locale `python -m http.server`; per il gruppo GitHub Pages (repo privato o link non indicizzato).
- Test con `node --test` sulle funzioni pure, senza browser.

## 6. Perimetro consigliato

**v1 (obiettivo "tempi brevi")**: creazione al 1° livello completa, incantesimi per Taumaturghi, scheda riepilogo stampabile, salva/carica/esporta, dati modificabili da Davide con validatore, desktop + telefono.

**Fuori dalla v1 (v2 possibile)**: avanzamento 2–20 (multiclasse fino a 3 Classi, 87 Talenti Liberi con prerequisiti, Specializzazioni, Tecniche Interiori, limiti di Avanzamento per livello §8.3), catalogo armi/armature con prezzi e reperibilità, combattimento. Il modello "scelte + ricalcolo" rende la v2 un'estensione naturale, non una riscrittura: la tabella §8.1 è già una lista di eventi per livello.

## 7. Prossimi passi

1. Confermare il perimetro v1 e le 2–3 domande a Davide del §3.
2. Estrarre le tabelle dai PDF in JSON, poi revisione manuale — è il grosso del lavoro iniziale.
3. Motore di calcolo + test sugli esempi del manuale (Mishima Agente: PV 16, PM 9, Tempra 10, Riflessi 11, Volontà 9, Magia 10, Iniziativa +2, Furtività VA 9).
4. Wizard UI.
5. Pubblicazione e prova con il gruppo.
