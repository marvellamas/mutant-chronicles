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
