# Talenti v1.0 nell'app — lotto 1 (dati e motore), 25/10/2026

Branch `talenti-nuovi` (non in `main`). Fonte: «Nuova progressione di Talenti Specializzazioni e Maestrie» v1.0 del
7/10/2026 (`docs/talenti-nuovi-v1.0.txt`, testo estratto dal PDF di `docs/Talenti-nuovi/`, che non si committa), che sui
Talenti vale sul Manuale del Giocatore. Ricognizione: `docs/talenti-nuovi-ricognizione-2026-10-25.md`.

## Prima e dopo, nei dati

| | Prima | Dopo |
|---|---|---|
| `talenti_liberi.json` | 119 voci, tutte «Talenti Liberi» | 126 voci con `categoria`: **39 talento_libero, 72 maestria, 15 superato** (con `sostituito_da`) |
| voci nuove | — | Preparazione Rapida, Ricarica Esperta, Raffiche Migliorate; nuove versioni con id `maestria-…` di Tiro Ravvicinato Migliorato, Immobilizzare Migliorato, Hacker, Arti Marziali Migliorate (`solo_regime_nuovo`) |
| voci superate | — | Estrazione Rapida, Cambio Rapido, Imbracciatura Rapida → Preparazione Rapida; Ricarica Rapida, Ricarica Migliorata → Ricarica Esperta; Raffica Breve/Media/Lunga Migliorata → Raffiche Migliorate; Tiro Ravvicinato Istintivo e Migliorato, Immobilizzare Istintivo e Migliorato, Hacker, Arti Marziali Migliorate → le nuove versioni; Sport → Specializzazione Sport. **Restano con id ed effetti di prima** per i PG salvati con i Talenti vecchi. |
| `specializzazioni.json` | 85 voci | **86** (più Sport, +3 Atletica con la disciplina come annotazione); `categoria`; **`per_classe`** (25 Classi, da 10 a 25 voci, gruppi già espansi); `gruppi`; `accessi_da_talenti` (Usufruitore → Potere, Ritualista → Rituali) |
| `regole.json` | — | `avanzamento.progressione_talenti`: Talento Libero 3…19, Maestria 2/6/10/14/18, Specializzazione 1/4/8/12/16/20; Raffiche: `talento` «Raffiche Migliorate» (`talento_regime_vecchio` il nome di prima) |
| `munizioni.json` | `talento` di Ricarica Migliorata e Ricarica Rapida | `talenti`: anche `ricarica-esperta`. **A.182 aperta: vale la decisione 139 (4 cartucce), non il «fino a tre» del file**, scritto nella scheda di Ricarica Esperta |

## Prima e dopo, nel motore

- **Regime dei Talenti**: `scelte.regimeTalenti` (2 = Talenti v1.0; assente = Talenti di prima) e
  `scelte.specializzazioneIniziale`. Scritti nel file solo se ci sono: i file di prima restano identici.
- **Regime vecchio** (tutti i PG di oggi): invariato. Un solo evento `talentoLibero` ai livelli dispari, Specializzazioni
  comprese; le voci nuove non si offrono. **I sette PG del gruppo e i cinque d'esempio calcolano come su `main`**
  (`tests/talenti-vecchi-identici.test.js`, impronta presa prima del lotto).
- **Regime nuovo**: voci di livello `maestria` e `specializzazione` (la seconda con il Grado), Specializzazione del 1°
  livello nella creazione, Specializzazioni dall'elenco della Classe aumentata (più gli accessi da Talento).
- **`controllaSceltaTalento`** (src/avanzamento.js): il controllo unico di una scelta, per le tre categorie.
- **`postiTalenti(personaggio, dati)`**: per categoria spettanti, scelti e mancanti; posto per posto livello, Classe,
  scelta, validità e opzioni valide con i prerequisiti in ordine di livello; `prossimo` (il primo posto vuoto); per i
  PG del regime vecchio `vecchi`, i Talenti di oggi con la categoria nuova. È il conto che userà il lotto 2.
- `prossimoLivello` prende le opzioni dallo stesso controllo; nel regime nuovo dà anche `maestrie` e `specializzazioni`
  (per Classe).
- Prerequisiti: nuova condizione `talenti_di_classe` (Arti Marziali Migliorate: Addestramento al Combattimento Senz'Armi
  del Lottatore).
- Validatore: categoria di ogni voce, voci superate, prerequisiti, elenchi delle 25 Classi, gruppi, accessi,
  progressione; `da_definire` come avviso. `verifica_frasi`: le frasi delle voci scritte dal file si cercano nel testo
  del file, non nei manuali.

## Da definire

Nessun valore necessario al calcolo manca nel file. Restano aperte le domande A.181–A.185 (decisioni, non numeri): la
A.182 ha un valore provvisorio (decisione 139).

## Non fatto in questo lotto (lotto 2)

Scelta guidata (SD, Sali di livello, creazione), migrazione dei PG (`regimeTalenti` = 2, nota nel registro del
master, rimozione dei Talenti vecchi), stampa con tre elenchi, nemici umani e bestiario (usano ancora gli id di
prima, validi), il campo `specializzazioni` di `classi.json` che il file chiama «Indirizzi di Classe».
