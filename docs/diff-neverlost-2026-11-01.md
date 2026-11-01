# Lotto 158: la Neverlost (01/11/2026)

Ultimo lotto dei veicoli (A.196). Nessun file di personaggio scritto; le prove sono su copie, porta 3017.

## Versioni usate

Controllo su Drive del 01/11 sera: nessuna edizione nuova. «per-davide.md» è fermo al 30/10 13:19.

| Fonte | Edizione | Letta |
|---|---|---|
| Manuale dei Veicoli, capitolo «Neverlost scheda del veicolo» | **0.10** (Doc del 30/10, 17:38). Il capitolo è identico a quello della 0.9 del 29/10 | per intero, `docs/manuali-txt/veicoli-0.10.md`, righe 853–1140 |
| «Neverlost scheda tecnica», Parte I · Sistemi tecnologici | **1.6** (Word di Davide del 29/10, 17:23, «Revisione NEC 1.6») | per intero, da Drive |
| Risposta A.196 | 30/10/2026 | `docs/risposte-master.md` |

Generatore: `node tools/lotti/lotto_neverlost.mjs [--scrivi]`. Scrive il profilo `neverlost` in `data/veicoli.json` e la pedina `img/Tokens/Neverlost-mappa.png`, vista dall'alto con il muso in basso.

## A. Cosa si riusa dei veicoli

La Neverlost è un profilo del catalogo dei veicoli (`data/veicoli.json → profili`): si aggiunge dalla tab Veicoli e sta nel registro unico `veicoli/` (A.91), come lo Scout. Restano quelli dei veicoli:

- **Tre Integrità** (Corpo 300, Propulsione 180, Motore 120). Le fasce della scheda coincidono con le soglie generiche, a terzi dei PI massimi, comprese le penalità −2/−4/−6/−8 e «fuori uso»: niente di nuovo.
- **Colpito**: AR 8, 1 PI ogni 5 danni, PS Integrità 14 (Rara), Corazzato 2. **Ripara**: §7.1 del manuale.
- **Andature e MOV**: MOV 8 con i moltiplicatori dei veicoli dà 8/16/24 (Controllata, Rapida, Massima) e penalità 0/−2/−4. L'unità «Q Tattici» si legge nella scheda e nella plancia.
- **Munizioni** dei mitragliatori (600 ciascuno, raffiche da 20) e dei missili (6), con «colpi sparati» e «Ricarica».
- **«Chiudi la giornata»** e **«Ricarica completa»**: sono gli stessi pulsanti dei veicoli; per la Neverlost fanno i conti della nave (sotto).
- **Pedina in mappa e scala** (lotto 148): in Q Tattici la Neverlost entra con la pedina convenzionale **3 × 2**, girata col muso in basso (2 × 3), MOV 8.

## B. Cosa è stato necessario aggiungere, e perché

L'energia della nave **non entra nel modello dello Scout**, che riempie le riserve dalla dotazione (A.101), conta il Rosso a chilometri e il Verde solo nei giorni d'uso. Forzarla lì avrebbe sbagliato proprio la regola della A.196. È in un modulo a parte, `src/neverlost.js`, agganciato ai pulsanti dei veicoli.

- **Riserve che non si riempiono da sole.**
  - Una nave nuova ha Rossa, Blu, Verde, ScE e PM **«da registrare»**: mai il massimo.
  - Rileggere il file non le riempie; nessuna azione le fa salire, salvo **«Ricarica all'approdo»** (8 ore, 50 cr per carica Rossa o Blu, 30 per la Verde).
  - Con una riserva da registrare i consumi non si sottraggono e la scheda avvisa.
  - In testa alla sezione, in un riquadro evidenziato: «Le riserve non si riempiono da sole. Il massimo non è la riserva…».
- **Rosso a tempo di volo.** «Aggiungi il volo» (minuti e andatura: 60/30/12 minuti a carica) e «Aggiungi lo stazionario» (1 carica l'ora) si sommano nella giornata; alla chiusura si arrotonda per eccesso una volta sola.
- **Verde ogni giorno**, anche in sosta; con «Approdo alimentato» nessuna.
- **Cannone**: «Spara il cannone (−1 Rossa)», anche se manca il bersaglio.
- **Scudo energetico** (ScE a parte):
  - «Attiva lo scudo (−1 Blu, 1 ora)», «Un'altra ora (−1 Blu)», «Spegni» (gli ScE non si ripristinano);
  - «Round senza colpi»: dal terzo +20 ScE;
  - in «Colpito» il danno passa **prima dallo scudo**, poi AR e Corazzato. Un colpo assorbito del tutto non dà i PI del Magistrale; Magico ed Etereo passano, salvo con l'Ampliamento mistico dello scudo.
- **Circuito Bianco** (120 PM, a parte):
  - le funzioni tecnomistiche delle tre postazioni scalano **solo** i PM del circuito, con «Usa (−N PM)»;
  - i PM non si sommano alle cariche, non si ricaricano con loro (né con la giornata, né con la ricarica all'approdo) e si cambiano solo a mano;
  - le passive (Gravità armonica, Occultamento dell'impronta, Protezione degli occupanti, Assetto armonico, mira dell'operatore) sono elencate e non costano.
- **Postazioni ed equipaggio**: Pilotaggio, Armamenti, Difese e Sensori; minimo 1, consigliati 3, missione 7, 10 posti; sostentamento in giornate-persona (solo testo).

**Scale e misure, dati distinti** (come i draghi della A.204):
- `dimensioni` 51 × 30 m: il corpo vero, che non cambia con la scala;
- `pedina_tattica` «3 × 2»: la pedina in Q Tattici;
- `scala_combattimento` «tattica»;
- `planimetria`: l'interno è una scena propria in Q Base.

In una scena in Q Base la Neverlost **non entra come pedina** (A.238).

### Come si segna un viaggio

Si usa la stessa **«Chiudi la giornata»** dei veicoli, perché il conto è a giornate come per lo Scout. Quello che cambia è il contenuto della giornata.

**Volo in atmosfera o nello spazio locale:**
1. durante il giorno, «Aggiungi il volo» (minuti e andatura) e «Aggiungi lo stazionario» (ore);
2. a fine giornata, «Chiudi la giornata» toglie le Rosse, arrotondate una volta sola, e 1 Verde (niente Verde se l'approdo è alimentato).

**Traiettoria**, a giorni, senza chilometri:
- giorno per giorno: «Entra in Traiettoria (−1 Blu)»; poi ogni sera il pulsante diventa **«Chiudi il giorno di Traiettoria»** (1 Rossa e 1 Verde, conta i giorni); infine «Esci dalla Traiettoria (−1 Blu)». La traversata resta nel registro del mezzo, in giorni;
- oppure in un colpo solo, a viaggio finito: **«Registra la traversata di N giorni»** fa ingresso, N giorni e uscita. L'esempio della scheda, 20 giorni = 20 Rosse, 20 Verdi, 2 Blu, è un test.

Dentro la Traiettoria «Aggiungi il volo» è rifiutato: per volare si esce.

## C. Le due versioni del testo

La scheda 1.6 è la «Parte I · Sistemi tecnologici»: non contiene la parte tecnomistica. Dove i testi si sovrappongono e differiscono ho usato la scheda; dove la scheda tace ho preso il manuale.

| Punto | Manuale dei Veicoli 0.10 | Scheda 1.6 | Scelto |
|---|---|---|---|
| Manovrabilità | «MAN base −1; Assetto armonico +1 al pilota sintonizzato, totale 0» | «MAN tecnologica −1: modifica le Prove di Pilotare pertinenti, non gli attacchi» | **scheda**: MAN −1. L'Assetto armonico (+1, postazione Pilotaggio, sintonia) resta come funzione passiva del circuito, dal manuale |
| Terza manovra speciale | «Distacco da filamenti … pareggio lo conserva» | «Distacco da un aggancio esterno … pareggio o fallimento lo conservano» | **scheda** |
| Circuito Bianco e funzioni tecnomistiche | sei schegge, 120 PM, postazioni sintonizzate, otto funzioni, ricarica mistica | assenti (Parte I) | **manuale** |
| Scudo contro Magico ed Etereo | «lo scudo ordinario non assorbe danni Magici o Eterei: occorre Ampliamento mistico» | assente | **manuale** |
| Impulso evasivo e distacco | «+2 alle Prove di evasione e distacco» | assente | **manuale**, solo testo |
| Registro | ha il Circuito Bianco 120 PM | senza | **manuale**: il circuito è una riserva a sé |
| Armatura | «AR fisica 8; componente magica 0» | «AR 8» | uguali |

## D. Prove

**Test automatici** (`tests/neverlost.test.js`, 8 test):
- profilo;
- tre Integrità con le fasce della scheda, e colpo con AR e Corazzato;
- **«le riserve della Neverlost non si riempiono da sole»**: nave nuova tutta da registrare, rilettura che non riempie, 15 operazioni dopo le quali nessuna riserva sale, ricarica solo esplicita. L'ho verificato introducendo per prova il difetto «valore mancante = massimo»: il test fallisce;
- volo, stazionario e giornata (arrotondamento una volta sola, Verde ogni giorno, approdo alimentato, riserva da registrare);
- Traiettoria, con l'esempio 20/20/2;
- scudo (Blu l'ora, assorbe prima dell'AR, Magico con Ampliamento, nessun ripristino, recupero dopo 3 Round);
- circuito Bianco separato da giornate, traversate, ricariche e cannone;
- mappa: 3 × 2 in Q Tattici, esclusa in Q Base, Scout invariato.

**Esito:** `npm test` 2.698/2.698, validatore 0 errori, `verifica_frasi` 1.280/1.280.

**Browser** (copia di Michele, server di prova, 820 px, modalità master):
1. Neverlost aggiunta dalla tab Veicoli: riserve «da registrare» e il riquadro della regola in testa. Registrati 60/10/30, ScE 200, PM 120.
2. Volo 90 min in Controllata: «2 cariche Rosse alla chiusura»; chiusa la giornata, 58/10/29.
3. Traversata di 3 giorni: 55/8/26, «Traversate: 3 giorni».
4. Scudo acceso: Blu 7. Occultamento Totale: PM da 120 a 80, cariche invariate.
5. **Pagina ricaricata: 55/7/26, ScE 200, PM 80**: nessun riempimento.
6. «Colpito» con 250 Naturale: «Scudo: 200 danni assorbiti (200 → 0 ScE); 50 proseguono», poi AR 8 e Corazzato: 7 PI al Corpo (300 → 293, Operativo).
7. Plancia: la Neverlost con le tre Integrità e le andature. Scena in Q Tattici collegata a uno scontro: «Neverlost 2 × 3 Q», messa in mappa. Nella scena il token ha base [3, 2], ingombro [2, 3]; la mini-scheda dice «Ingombro 2 × 3 Q dal profilo del veicolo», 10 posti.

Corretto durante la prova: nella scelta del veicolo e nelle andature della plancia il MOV si leggeva «8 Q». Ora si legge «8 Q Tattici» (QT nella riga compatta).

## Domande nuove

- **A.238**: la Neverlost in una scena in Q Base (atterrata, scontro a terra intorno alla nave): come si rappresenta? Con le misure vere (51 × 30 m = 34 × 20 Q Base) o in altro modo? Per ora in Q Base la pedina non entra.
- **A.239**: munizioni della nave (600 + 600 proiettili, 6 missili): partono dalla dotazione piena, come lo Scout (A.101), o anche loro «da registrare» come le riserve? L'app: dotazione piena.
- **A.240**: prezzo e reperibilità della Neverlost. La scheda li dà solo per gli accumulatori; l'app li mostra «da definire».
