# Ricognizione: avanzamento di livello (v2)

Data: 25 settembre 2026. Fonte: Manuale del Giocatore v0.43, cap. 3 e 8; Manuale della Magia v1.1, sez. 1.

## 1. Cosa succede a ogni livello (§8.1)

| Livello | Evento | Scelte del giocatore | Tiri |
|---|---|---|---|
| 2, 6, 10, 14, 18 | +2 Punti Caratteristica | a quali Caratteristiche (anche 2 sulla stessa) | — |
| 3, 5, 7, 9, 11, 13, 15, 17, 19 | 1 Talento Libero | quale, con eventuale parametro | — |
| 3, 11, 19 | +1 a tutte le Salvezze | nessuna (automatico) | — |
| 4, 8, 12, 16, 20 | 1 Grado di Classe + 5 Punti Abilità Liberi | quale Classe (posseduta o nuova, max 3); Talento di Classe se Grado II/IV/VI; Incantesimi se Classe taumaturgica; distribuzione dei 5 punti | dado PV; dado PM se previsto |
| 12 | seconda Azione Principale | nessuna (automatico) | — |

Limiti che cambiano con il livello:

- Caratteristiche: max 7 al 1°, 9 ai livelli 2–5, 10 dal 6° (§8.2). Al 6° un punto non spendibile oltre 10 va su un'altra Caratteristica.
- Avanzamento massimo per Abilità: 3 (liv. 1–3), 4 (4–7), 5 (8–11), 6 (12–15), 7 (16–19), 8 (20) (§8.3). Comprende sia i +1 fissi di Classe sia i punti liberi; i punti fissi si assegnano prima dei liberi.
- Bonus Avanzamento Salvezze: 0 (1–2), +1 (3–10), +2 (11–18), +3 (19–20) (§1.2.3). Somma strutturale + Prova Salvezza Migliorata + Resistenza ≤ 18.
- Il modificatore specifico per le Salvezze si aggiorna quando cresce la Caratteristica.

## 2. Classi e multiclasse (§3.1, §8.7)

- Ai livelli 4/8/12/16/20 si aumenta di un Grado una Classe posseduta oppure si prende il I Grado di una nuova, anche di un altro Addestramento; max 3 Classi; Gradi da I a VI senza salti.
- Ogni Grado: +1 alle 5 Abilità di Classe (entro il limite), PV e PM del profilo **tirati** (solo alla creazione il dado PV è massimizzato, §3.3), Talento fisso (I, III, V) o a scelta fra i 5 (II, IV, VI), quote incantesimi per macrofamiglia se taumaturgica (tabella §3.8, "ogni Grado II–VI").
- Una nuova Classe non cambia Addestramento, vantaggio, valori base o bonus Salvezze.
- Classe taumaturgica senza Addestramento Taumaturgo: non riceve i 2 + Mod INT liberi, usa la scala "Altri utilizzatori" per le Prove di Potere (Magia, sez. 1). Livello massimo degli incantesimi conosciuti = 3 × Gradi taumaturgici complessivi (max 18).
- Risorse Interiori (Tecniche Interiori) è incompatibile con Addestramento Taumaturgo, Gradi in Classi taumaturgiche e Talenti che concedono il lancio di Incantesimi; l'incompatibilità vale in entrambe le direzioni (§8.6.10).

## 3. Talenti Liberi (§8.6, §8.8)

- 87 Talenti nel §8.6, tutti con intestazione uniforme: `Passivo|Attivo. <requisito>. Acquisibile <regola>.` → estraibili in modo strutturato (tipo, prerequisito, molteplicità, testo).
- Prerequisiti presenti: Arti Marziali, Schermidore, Parata Istintiva, Schivata Istintiva, Specializzazione in Commercio, Risorse Interiori. Tutti riferiti ad altri Talenti: verifica semplice.
- Talenti con **parametro**: Prova di Caratteristica Migliorata (una per Caratteristica), Prova Salvezza Migliorata (fino a 2 per Salvezza), Tecniche Interiori Supplementari (più volte), Specializzazioni (una per ambito).
- Talenti che **modificano la scheda** e quindi vanno calcolati, non solo elencati: Iniziativa Migliorata (+3), Prova Salvezza Migliorata (+1 alla Salvezza scelta, con il tetto 18), Buona Costituzione (da verificare l'effetto sui PV), Resistenze (+2 situazionale: solo da mostrare), Risorse Interiori (2 + Mod SAG Tecniche, min 1, fissato al momento dell'acquisizione), Incrementare Incantesimi (+2 incantesimi, fino a 5 volte), Potenziale Mistico Migliorato (+3 al livello massimo, fino a 5 volte), Usufruitore di Magia (2 + Mod INT incantesimi, livello max 3), Poliglotta (2 lingue: campo testo).
- Specializzazioni nelle Abilità (§8.8): ogni Specializzazione è un Talento Libero. Tre gruppi: armi (§8.8.1, +1 VA e +1 danno per categoria d'arma), mistiche (§8.8.2) e operative/sociali/professionali (§8.8.3, +2 VA in un ambito). Circa 48 voci in tabelle regolari → estrazione tabellare.
- Tecniche Interiori (§8.9): 31 schede (generiche, Scuole Mishima, Lottatore). Le Scuole richiedono Corporazione Mishima, iniziazione e giuramento: stato narrativo che l'app non può dedurre → spunta manuale "iniziato alla Scuola X".

## 4. Lacune dei manuali (da Davide)

1. **Talenti di magia**: il §8.6.8 rimanda al Manuale della Magia, ma lì Usufruitore di Magia, Potenziale Mistico Migliorato, Incrementare Incantesimi, Focalizzazione Migliorata, Contromagia (e Migliorata), Lancio in Combattimento, Incantesimi da Lancio, i Talenti di Meditazione e conversione sono **solo citati nel testo delle regole**, senza schede con prerequisiti e molteplicità. Serve una lista ufficiale, o si estraggono le citazioni con `TODO(Davide)`.
2. **Buona Costituzione** e altri Talenti del §8.6.1: verificare uno per uno quali toccano valori derivati (l'estrazione strutturata lo rende un lavoro di lettura, non di codice).
3. Talenti di Classe ai Gradi II/IV/VI con requisiti espressi nel testo (es. Lottatore: Tecniche Interiori Supplementari "acquisibile una sola volta come scelta di Classe"): i requisiti non sono in formato uniforme.
4. Incantesimi ai Gradi successivi: confermare che le quote "+2 Fisici" si sommano a quelle già possedute e che le versioni di livello superiore di un incantesimo già conosciuto sono automatiche (Magia, sez. 1: sì, "diventano disponibili automaticamente").
5. Restano aperti i 5 TODO della v1 (Esploratore, INT bassa, distribuzione quote, famiglia dei liberi, livelli base ammessi).

## 5. Modello dati proposto: il personaggio come storia di eventi

Oggi il personaggio salvato è `scelte` della creazione, e la scheda è `calcolaScheda(scelte, dati)`. Per l'avanzamento la stessa idea si estende: il personaggio diventa

```
{
  creazione: { ...scelte attuali... },
  livelli: [
    { livello: 2, caratteristiche: { FOR: 1, DES: 1 } },
    { livello: 3, talentoLibero: { id: "prova-salvezza-migliorata", parametro: "Tempra" } },
    { livello: 4, grado: { classe: "agente" }, tiroPV: 4, tiroPM: null,
      talentoClasse: "reazione-operativa", puntiAbilita: { furtivita: 2, percezione: 3 },
      incantesimi: [] },
    ...
  ]
}
```

e `calcolaScheda` rigioca gli eventi dall'inizio, applicando a ogni livello i limiti di quel livello. Vantaggi:

- Se Davide cambia una tabella, la scheda al livello 9 si ricalcola da sola come oggi al 1°.
- "Annulla l'ultimo livello" è togliere l'ultimo elemento dell'array.
- Lo storico è leggibile: si vede cosa è stato scelto a ogni livello (utile al master per controllare).
- La validazione è per livello: `validaLivello(personaggio, n, dati)` restituisce gli errori dello stesso tipo di oggi (regola violata / scelta incompleta).
- Un personaggio v1 si migra aggiungendo `livelli: []`.

Il livello attuale è `1 + livelli.length`. Il wizard dell'avanzamento presenta un passo per evento del livello successivo, generato dalla tabella §8.1 messa in `regole.json` (così Davide può cambiare a quali livelli capitano gli eventi).

Tiri di dado: ogni tiro salvato ha `{ valore, origine: "app" | "manuale" }`. L'override richiesto per la v1 usa lo stesso formato.

## 6. Cosa non si può automatizzare

- Effetti in gioco dei Talenti e delle Tecniche (bonus situazionali, usi per sessione): si mostrano, non si applicano.
- Stati narrativi (iniziazione a una Scuola, giuramento, Corruzione, Umanità): campi manuali.
- Equipaggiamento: fuori perimetro finché il §2.16 non esiste.

## 7. Stima

| Blocco | Contenuto | Sforzo |
|---|---|---|
| A. Dati | 87 Talenti Liberi strutturati, ~48 Specializzazioni, 31 Tecniche, quote incantesimi per Grado (già in classi.json), tabella eventi per livello e limiti in regole.json; Talenti di magia con TODO | 1–2 sessioni |
| B. Motore | modello a eventi, migrazione v1, ricalcolo per livello, limiti, prerequisiti, incompatibilità magia/Tecniche, test con un personaggio portato al 20° a mano | 1–2 sessioni |
| C. UI | schermata "Sala su di livello", un passo per evento, storico dei livelli con annulla, scheda finale che mostra il livello, Talenti/Tecniche/Specializzazioni con tooltip | 2–3 sessioni |

Totale 4–7 sessioni, paragonabile alla v1. Ordine consigliato: A e B insieme (senza UI, come il Prompt 1), poi C. Prima di A, le risposte di Davide sul punto 4.1 evitano di estrarre due volte.

## 8. Decisioni da prendere prima di partire

1. Un livello alla volta (consigliato) oppure "porta al livello N" in un colpo solo? Con il modello a eventi il secondo è solo un ciclo del primo; l'UI però è più semplice se si fa un livello per volta.
2. I livelli passati sono modificabili? Consiglio: sì ma solo "annulla l'ultimo", per non dover rivalidare a cascata; il master può sempre esportare, correggere il JSON e reimportare.
3. Talenti di magia: aspettare la lista di Davide o partire con le citazioni + TODO?
