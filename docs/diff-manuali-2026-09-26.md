# Confronto Google Doc ↔ PDF dei manuali — 26 settembre 2026

Prima esecuzione della procedura di `docs/manuali-drive.md`. Ogni Google Doc è stato letto da Drive in sola lettura, esportato in Markdown e salvato in `docs/manuali-txt/`. Poi è stato confrontato con il PDF di partenza in `Manuali/`.

| Manuale | Doc (modifiedTime UTC) | PDF di confronto | Testo salvato |
|---|---|---|---|
| Giocatore | 2026-09-26T15:18:45Z | `Manuale_del_Giocatore_v0.43.pdf` | `docs/manuali-txt/giocatore.md` |
| Magia | 2026-09-26T13:26:03Z | `Manuale_della_Magia_v1.1.pdf` | `docs/manuali-txt/magia.md` |
| Armamenti | 2026-09-26T09:32:57Z | `Manuale_degli_Armamenti_v0.50.pdf` | `docs/manuali-txt/armamenti.md` |
| Equipaggiamento | 2026-09-26T09:33:06Z | nessuno (0.1 esiste solo come Doc) | `docs/manuali-txt/equipaggiamento.md` |
| E&L – Risposte e correzioni approvate | 2026-09-26T15:20:54Z | copia precedente, `docs/risposte-master-2026-09-26.md` | la copia stessa, aggiornata |

## Metodo

`tools/confronta_doc_pdf.py <pdf> <doc.md> <uscita>`. Il confronto è fatto parola per parola, raggruppato per paragrafo del Doc:
- punteggiatura, maiuscole e tipi di trattino non contano;
- le parole spezzate a fine riga nel PDF si uniscono;
- intestazioni e piè di pagina del PDF si tolgono.

Nello stesso paragrafo, parole tolte in un punto e aggiunte in un altro si annullano: sono celle di tabella che il PDF spezza su più righe, o intestazioni ripetute a cambio pagina. Ogni residuo è stato letto e classificato:

- **regola**: tocca calcolo, validazione o dati;
- **testo**: descrizioni, schede, tipi, nessun effetto sui numeri;
- **cosmetica**: nessuna azione.

Limite del metodo: se due valori identici si scambiano di posto nello stesso paragrafo, lo scambio non si vede. Un numero cambiato invece si vede.

| Manuale | Somiglianza | Differenze grezze | Dopo i riordini |
|---|---|---|---|
| Giocatore | 97,7 % | 727 | 156 (112 sono numeri di pagina dell'indice) |
| Magia | 98,4 % | 221 | 21 |
| Armamenti | 99,5 % | 199 | 13 |

---

## Manuale del Giocatore (Doc ↔ PDF 0.43)

### Regola

| Paragrafo | Differenza | Origine | Nei dati |
|---|---|---|---|
| §1.2.3, §2.11 (tabella e testo), §2.14 (esempio) | Volontà: «Intelligenza / INT» → «Carisma / CAR», anche nell'esempio di calcolo («modificatore specifico di CAR») | 26/09, A.1 | **Coincide**: `caratteristiche.json` → `salvezze`, Volontà su CAR (decisione 8) |
| §8.9.3 Vipera dal Cappuccio, §8.9.4 Presa dell'Anima e Contraccolpo Interiore | Nuovo campo **Durata** nelle tre schede | 26/09, A.4 (versione delle 15:20 del Doc E&L) | **Applicato oggi**: `tecniche_interiori.json` → `durata`, tolti tre TODO (decisione 11) |
| §2.16 Equipaggiamento iniziale | Il rinvio «verrà integrato successivamente» diventa la struttura a scelte guidate: dotazione comune, dotazione della Classe iniziale, varianti della Corporazione. Le tabelle «ancora da completare» | 26/09, A.5 (versione delle 15:20) | Registrato (decisione 12); nessun dato finché non arrivano le tabelle |
| §3.5.2 Esploratore | «Specializzazioni indicative: Terrestre / Spaziale. Talenti a scelta: …» diventa «**Terrestre:** Segni di Passaggio, Adattamento Estremo. **Spaziale:** Mappa Mentale, Rotta Alternativa. **Comune:** Avanguardia» | **Non nelle risposte del 26/09**: è la decisione del 25/09 (n. 1) | **Coincide**: `classi.json`, Esploratore |

### Testo

| Paragrafo | Differenza | Origine | Nei dati |
|---|---|---|---|
| §2.1 | Aggiunte le descrizioni delle sei Caratteristiche | 26/09, A.1 | **Coincide parola per parola** con `caratteristiche.json` → `descrizione` (verificato per tutte e sei) |
| §8.6 Attivazione Tempestiva; §8.6.10 Risorse Interiori e Tecniche Interiori Supplementari | «Talento Libero.» → «Passivo.» | 26/09, A.3 | **Coincide**: `talenti_liberi.json` → `tipo: passivo` |

### Cosmetica (nessuna azione)

- **Indice**: il Doc non ha numeri di pagina (112 residui) e ha segnalibri interni.
- **Intestazioni di tabella ripetute a cambio pagina nel PDF**: §3.5.2, §3.5.3, §4.3, §4.5, §5.11, §5.12, §5.16.1, §5.17, §5.24, §8.8.1–§8.8.3.
- **Intervalli con il trattino** che il PDF estrae staccato: «5.2.1–5.2.4» (§5.2), «19–20» (§8.1.1), «VA 1–8» (§3.5.9).
- **Parole spezzate o incollate dal PDF**: «Amministrati-vo» (§3.6), «V VI» (§3.9.3).
- **Celle spostate fra righe della stessa tabella**: «Informatico» (§3.4/§3.5), «Teologo» (§3.6/§3.7).

### Decisioni del master non ancora nel Doc (solo per Davide: l'app segue già la decisione)

- §2.12 e §3.3: il Doc dice ancora che al 1° livello si massimizza solo il dado dei PV. La decisione 6 del 25/09 massimizza anche quello dei PM.
- §2.10: «2 + Mod INT Incantesimi» senza «minimo 1» (decisione 2 del 25/09). Nella Magia il «minimo 1» c'è.
- §8.6: Attivazione Tempestiva resta prima del §8.6.1, fuori da ogni sottosezione.

Queste voci sono in `docs/per-davide.md`, sezione 3.

---

## Manuale della Magia (Doc ↔ PDF 1.1)

### Regola

| Paragrafo | Differenza | Origine | Nei dati |
|---|---|---|---|
| Sez. 1, «Conoscenza e livello massimo» | «2 + Mod INT incantesimi, **minimo 1**» per Usufruitore di Magia | **Non nelle risposte del 26/09**: è la decisione del 25/09 (n. 2) | **Coincide**: `talenti_liberi.json` (Usufruitore), `regole.json` → `taumaturgo.incantesimi_liberi.minimo` |
| Sez. 1, stesso paragrafo | Potenziale Mistico Migliorato «è riservato a chi possiede Usufruitore di Magia»; «fino a cinque acquisizioni e a un massimo di 18». L'esempio passa da «i cinque Talenti liberi ordinari» a «per esempio… quattro acquisizioni… 15; la quinta… 18» | 26/09, A.2.2 | **Coincide**: prerequisito `usufruitore-di-magia`, molteplicità 5, limite 18 |
| Sez. 1, nuove schede | 14 schede dei Talenti di magia (Usufruitore di Magia … Magia Occultata) | 26/09, A.2.1–A.2.14 | **Coincide**. Per tutte e 14, tipo, prerequisiti e acquisizioni sono quelli di `talenti_liberi.json`. Il testo è identico in 13 schede su 14 (sotto l'unica differenza) |
| Sez. 2, «Componenti e riconoscimento» | Sintonizzazione del Focus per chi ha Usufruitore di Magia: tre ore di preparazione, senza recupero di PM. Il riconoscimento per Contromagia contro Magia Occultata richiede Occultismo, anche con Contromagia Universale | 26/09, A.2.1, A.2.6, A.2.14 | **Coincide** con le schede in `talenti_liberi.json` e con `magiaDelPersonaggio()` (contromagia, magiaOccultata) |
| Sez. 2, «Le tre manovre magiche» | Procedura di Contromagia: bisogna conoscere l'Incantesimo; il riconoscimento non richiede Prova, salvo Magia Occultata; Contromagia Universale toglie il requisito della conoscenza | 26/09, A.2.6, A.2.7 | **Coincide** (`contromagia.serveConoscenza`) |

La sezione 6 (Meditazione, conversione, ricarica) non ha differenze rispetto al PDF 1.1. I valori di `regole.json` → `meditazione` e `chroma.conversione` coincidono con il testo del Doc.

### Testo

| Paragrafo | Differenza | Azione |
|---|---|---|
| Sez. 1, scheda di Potenziale Mistico Migliorato | Nel Doc manca la riga «Ambito: il Talento è riservato agli Usufruitori di Magia e non si applica all'Addestramento Taumaturgo», che invece c'è nella risposta A.2.2 e nel testo di `talenti_liberi.json` | Nessuna sui dati: la stessa regola è scritta nel paragrafo «Conoscenza e livello massimo». Segnalata a Davide (per-davide, sezione 3) |

### Cosmetica (nessuna azione)

- Intestazioni di tabella ripetute a cambio pagina nel PDF: sez. 13 (Elementi), 14.1, 14.5, 14.6, 14.8, 14.9 (Elementali), 21 (Esorcismo, tabella «Stato o causa / Rimozione»).

### Decisione del master non ancora nel Doc

- Sez. 1: il Doc dice ancora «il limite è 3 volte i Gradi taumaturgici complessivi, fino a 18». La tabella del master (decisione 5 del 25/09: I→3, II→8, III→11, IV→14, V→17, VI→18) vale per l'app, come stabilito in `docs/risposte-master.md`.

---

## Manuale degli Armamenti (Doc ↔ PDF 0.50)

**Nessuna differenza di sostanza**, come atteso. I 13 residui:

- 12 sono intestazioni di tabella ripetute a cambio pagina nel PDF: §7.1.1 (2), §7.1.7, §7.4.2 (2), §7.9 (5), §7.11.5, §7.20.7;
- 1 è uno spazio: «Tecnologia/Strumentazione» (§7.19.3, UMC), incollato nel PDF.

Nessun numero cambiato. Il catalogo in `data/equipaggiamento/` resta allineato.

---

## Manuale dell'Equipaggiamento 0.1 (solo Doc, cap. 1)

Non esiste un PDF: è testo nuovo. Il cap. 1 (§1.1–§1.11) contiene regole d'uso generali. I capitoli 2–8 e i cataloghi «verranno integrati successivamente».

| Paragrafo | Contenuto | Applicato |
|---|---|---|
| §1.6 Peso e capacità di carico | Ordinario fino a FOR × 10 kg; Sovraccarico fino a FOR × 20 kg con −2 VA alle Prove fisiche, attacchi e Difese, solo Passo con −2 Q; oltre, non trasportabile. Ogni ora completa in Sovraccarico peggiora l'Affaticamento | **Sì**: `regole.json` → `carico`. È la stessa tabella del Giocatore §5.2.6 (invariato fra PDF e Doc), che resta la fonte principale; il blocco cita entrambi. Forza da Lavoro raddoppia le soglie (§5.2.6) |
| §1.7 Integrità e manutenzione | Qualità → PS Integrità: Scarsa 8, Comune 10, Non comune 12, Rara 14, Molto rara 16, Leggendaria 18 | **Sì**: `regole.json` → `integrita`. È la stessa tabella di Armamenti §7.2.1. Il validatore controlla che i 394 oggetti del catalogo con Qualità abbiano la PS corrispondente: tutti tornano |
| §1.2 Efficacia degli strumenti | Scala Improvvisati −2 … Specializzati +3, un solo modificatore complessivo | No: riprende il Giocatore §1.4.1. Servirà con i cataloghi degli strumenti (cap. 5) |
| §1.8 Reperibilità e costo | CO / NC / RA / MR con la Prova di Oratoria | No: riprende Armamenti §7.1.8, già usato dal catalogo |
| §1.10 Dati della scheda | Campi standard, fra cui **Peso** | Il campo `peso` (kg per unità) è accettato nel catalogo dal validatore. Gli oggetti degli Armamenti non hanno pesi (per-davide A.30) |
| §1.1, §1.3–§1.5, §1.9, §1.11 | Principi d'uso: requisiti, Azioni, consumabili, corredi, lettura di un profilo | Nessun dato |

---

## Doc «E&L – Risposte e correzioni approvate»

La versione letta oggi (modifiedTime 15:20:54Z) ha **due voci in più** rispetto alla copia del mattino, `docs/risposte-master-2026-09-26.md`:

- **A.4** — durata di tre Tecniche Interiori;
- **A.5** — struttura dell'equipaggiamento iniziale.

Tutte le altre voci sono identiche parola per parola. La copia nel repo è aggiornata; le due decisioni sono registrate in `docs/risposte-master.md` (11 e 12).

## Modifiche non annunciate

Nel senso richiesto (diverse dal PDF e non presenti nelle risposte del 26/09) sono **due**. Tutte e due sono **decisioni del master del 25/09 già registrate e già nei dati**:

1. Giocatore §3.5.2, Esploratore: Talenti a scelta divisi per Specializzazione (decisione 1 del 25/09).
2. Magia sez. 1: «minimo 1» agli Incantesimi di Usufruitore di Magia (decisione 2 del 25/09).

**Nessuna modifica di regola nuova e sconosciuta** in nessuno dei quattro manuali.
