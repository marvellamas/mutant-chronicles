# PX e livello: sono sfalsati di uno? (27/10/2026, lotto 132)

Segnalazione di Davide: con i PX che avevano, i personaggi risultavano già di 7° livello, mentre dovrebbero essere di
6°. Le soglie approvate (A.170) sono totali da raggiungere: 1° → 0, 2° → 50, 3° → 110, 4° → 180, 5° → 340, 6° → 520,
7° → 720, 8° → 1.050 … 20° → 10.340. Con 600 PX: 6° livello; con 720 PX: 7°.

## Risultato: nel codice non c'è nessuno sfalsamento

Ho controllato ogni punto che collega PX e livello. Il conto «PX → livello» è uno solo, `livelloDaPx` in
`src/px-partita.js` (il livello più alto la cui soglia è ≤ PX), e coincide riga per riga con quello del gestore di Davide
(`docs/riferimenti/EROI_LEGGENDE_Gestore_PX_v1_2.html`, `lvlByXP`). `soglie_px` è identico alla tabella approvata, dal
primo commit del file (`d6c701c`, 18/10): nessun indice spostato, nessun `>` al posto di `>=`, nessuna somma di costi, nessun
PX iniziale contato due volte nel livello.

| Punto dell'app | Quale conto fa |
|---|---|
| Pannello PX: «↑ liv N», conferma di «Assegna», avviso dopo (`passaggiDiLivello`) | `livelloDaPx(PX di prima)` → `livelloDaPx(PX di prima + delta)`; N è il livello raggiunto |
| Pannello PX: riepilogo e «PX al prossimo» (`riepilogo`) | `livelloDaPx(baseline + partite assegnate)`, limitato dall'Atto; prossimo = `soglie_px[livello]` |
| Limite degli Atti (`limiteAtto`, `livelloPg`) | `min(livelloDaPx, limite dell'Atto)`: I → 8, II → 12, III → 15, IV → 17, V → 19, VI → 20 |
| Titolo per i PX (`componentiGiocatore`) | `titoloPerLivello(livelloPg(PX di prima della partita))`: Principiante 1–3, Inesperto 4–7, Esperto 8–11, Veterano 12–15, Eroe 16–19, Leggenda 20 |
| Scheda, Identità | il livello è `1 + livelli presi`; i PX sono un numero scritto dal Direttore: nessun conto fra i due (fino a questo lotto) |
| Sali di livello | non guarda i PX: sale chi preme «Sali» |
| Creazione | i PX sono un campo libero |
| Stampa | stampa il numero dei PX e il livello preso, senza convertire |

La tabella di controllo (`node tools/px-controllo.mjs`, test `tests/px-livello.test.js`) dà, per 0, 49, 50, 519, 520, 600,
719, 720, 1.049, 1.050 e 10.340 PX, i livelli 1, 1, 2, 5, 6, 6, 6, 7, 7, 8, 20: **prima e dopo sono identici** (non c'era
niente da correggere nel calcolo), in ognuno dei punti sopra.

## Allora perché i personaggi risultavano al 7°?

Il livello di un personaggio nella scheda non viene dai PX: è quello dei livelli presi con «Sali di livello», che non è
collegato ai PX (decisione del 25/10: «il livello del PG lo sale il giocatore»). Un personaggio con 600 PX che ha già
preso il 7° livello risulta al 7° in ogni punto che legge la scheda, e nessun punto lo segnalava. Quindi lo sfasamento, se
c'è, è **fra il livello preso e i PX**, non dentro il conto dei PX. Questo lotto lo rende visibile.

## Cosa cambia (solo informazione, niente si corregge da solo)

- `confrontoLivelloPx` / `fraseLivelloPx` (`src/px-partita.js`): il solo confronto «livello preso» / «livello dei PX».
- **Identità:** sotto «Anagrafica», anche a anagrafica chiusa, se la scheda ha più livelli di quelli che danno i PX:
  «I PX danno il livello 6, la scheda è al 7: un livello in più (mancano 120 PX). Non cambia niente da solo: decide il
  Direttore.» Nessun avviso se i livelli tornano o se mancano i PX.
- **Voce C «Controlla lo stato»** (`stato-mutant.txt`): per ogni personaggio `PX · liv. della scheda (i PX danno il liv. N)`
  e, se ne ha uno in più, «LA SCHEDA HA UN LIVELLO IN PIU». È ciò che serve se Marcello manda lo stato del PC di Davide.
- **Titolo:** il Titolo di ogni partita si ricava dai PX di prima della partita (`pxPrima`) con lo stesso calcolo, quindi i
  moltiplicatori delle partite passate non sono sbagliati. `partiteDiverseSeSfalsato` e `fasceDiversePerScarto` dicono
  che cosa cambierebbe in una lettura sfalsata di +1 (solo con i PX di prima in 110–179, 720–1.049, 2.220–2.819,
  4.860–5.809, 8.960–10.339; 600 PX o 520–719 non cambiano il Titolo, 6° e 7° sono entrambi Inesperto). Con l'archivio di
  Davide: `node tools/px-controllo.mjs <px/px.json>` elenca le partite diverse e di quanto (non corregge nulla).

## I personaggi

Sulle copie di questo PC (`personaggi/`, solo lettura) i PX sono valori di prova (1.900, livello 10 dai PX contro 6 della
scheda: nessun livello in più) o mancano: non sono i personaggi di Davide. Per quelli veri serve `stato-mutant.txt` del suo
PC (voce C aggiornata) e il suo `px/px.json`.

## Domanda aperta

A.187 (pacchetto per il Doc `docs/pacchetto-per-davide-2026-10-27-px-livello.md`): se un personaggio ha un livello in più
di quelli che gli danno i PX, che cosa si fa? Nel frattempo l'app segnala e non tocca niente.
