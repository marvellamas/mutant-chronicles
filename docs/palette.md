# Palette della scheda digitale

I valori stanno in `css/palette.css`, come variabili CSS con la variante per il tema scuro (`prefers-color-scheme: dark`). Qui si spiega a che cosa serve ogni colore. La SS (stampa) usa gli stessi significati con variabili proprie `--ss-*` (sezione «Scheda da stampare» in fondo).

**Regola:** i colori riservati hanno un solo significato e non si riusano per altro. Il colore dice *che cos'è*; le barre verde/giallo/rosso di `css/style.css` (`--barra-*`) dicono *come sta* una riserva e restano indipendenti.

I contrasti sono controllati da `tests/palette.test.js`, che legge i valori direttamente dai file CSS, in tutti e due i temi:
- testo ≥ 4.5:1 sul proprio sfondo;
- bordi e barre laterali ≥ 3:1.

Se si cambia un valore, `npm test` dice se il contrasto non basta più.

## Colori riservati

| Nome | Uso | Chiaro | Scuro |
|---|---|---|---|
| `--pv` | Punti Vita: bordo e titolo del riquadro PV (Identità, Combattimento) e del PV nell'intestazione della SD | `#c8102e` | `#ff6b7d` |
| `--pv-tenue` | fondo leggero associato ai PV | `#fdecee` | `#3a1b21` |
| `--pm` | Punti Magia: bordo e titolo del riquadro PM (Identità, Magia) e del PM nell'intestazione | `#1d5fc4` | `#7aaeff` |
| `--pm-tenue` | fondo leggero associato ai PM | `#eaf0fc` | `#1b2740` |
| `--pe` | Punti Eroe: bordo e titolo del riquadro (Identità) | `#1b7a3a` | `#62d48e` |
| `--pe-tenue` | fondo leggero associato ai Punti Eroe | `#e8f5ec` | `#17301f` |
| `--fisica` | magia Fisica: barra laterale dell'incantesimo | `#d9577a` | `#f08aa6` |
| `--fisica-tenue` | magia Fisica: tinta di sfondo dell'incantesimo | `#fcedf1` | `#3a2129` |
| `--fisica-testo` | magia Fisica: testo dell'etichetta «Fisica» | `#9c2346` | `#f7b6c8` |
| `--mentale` | magia Mentale: barra laterale | `#2386bd` | `#6cc4f0` |
| `--mentale-tenue` | magia Mentale: tinta di sfondo | `#e7f4fb` | `#16303d` |
| `--mentale-testo` | magia Mentale: etichetta «Mentale» | `#0b5a82` | `#a4ddf8` |
| `--spirituale` | magia Spirituale: barra laterale | `#3e9a4f` | `#8ed79a` |
| `--spirituale-tenue` | magia Spirituale: tinta di sfondo | `#ebf6ed` | `#1b3321` |
| `--spirituale-testo` | magia Spirituale: etichetta «Spirituale» | `#2a6934` | `#b6ecbe` |
| `--tecnica` | Tecniche Interiori: barra laterale della scheda (tab Poteri) | `#9a5b13` | `#e8a865` |
| `--tecnica-tenue` | Tecniche Interiori: tinta di sfondo della scheda | `#f8efe4` | `#33261a` |
| `--tecnica-testo` | Tecniche Interiori: etichetta del gruppo (Generica, Scuola…, Lottatore) | `#7a4408` | `#f3c896` |

Sulle tinte delle macrofamiglie il testo dell'incantesimo resta quello normale (`--testo`, nero o bianco pieno): la tinta è leggera e non toglie leggibilità. Accanto alla barra colorata c'è sempre l'etichetta con il nome della macrofamiglia, per chi non distingue i colori.

Le Tecniche Interiori usano la stessa scheda degli incantesimi con un colore proprio, il bronzo: «non sono Incantesimi» (Giocatore §8.9), quindi non prendono il colore di una macrofamiglia. Accanto c'è sempre l'etichetta del gruppo.

Verde dei Punti Eroe e verde chiaro della magia Spirituale si distinguono per luminosità. La magia Spirituale compare inoltre sempre con la sua etichetta.

## Categorie dell'equipaggiamento

Sono le etichette dei gruppi dell'equipaggiamento nella tab Combattimento. Hanno il colore della categoria come fondo e `--cat-testo` come testo (bianco nel tema chiaro, quasi nero nello scuro). Sono tinte scure e sature, scelte lontano dai colori riservati. La mappa tipo → colore è `GRUPPI_EQUIPAGGIAMENTO` in `src/palette.js`, e il test controlla che:
- copra tutti i tipi di oggetto;
- non abbia colori ripetuti;
- non usi colori riservati.

| Tipo | Gruppo | Variabile | Chiaro | Scuro |
|---|---|---|---|---|
| `arma_ravvicinata` | Armi ravvicinate | `--cat-ravvicinate` (ruggine) | `#8a3b12` | `#e8a07a` |
| `arma_distanza` | Armi a distanza | `--cat-distanza` (oliva) | `#5a5816` | `#c9c66e` |
| `scudo` | Scudi | `--cat-scudi` (ocra) | `#7a5200` | `#e6b35c` |
| `armatura` | Armature | `--cat-armature` (acciaio) | `#4a5260` | `#aab4c4` |
| `elmetto` | Elmetti | `--cat-elmetti` (blu acciaio) | `#2f5d7a` | `#9cc3dd` |
| `accessorio` | Accessori | `--cat-accessori` (prugna) | `#5a4870` | `#c3aee0` |
| `munizioni` | Munizioni | `--cat-munizioni` (cuoio) | `#6b4423` | `#d6a67c` |
| `sanitario` | Sanitario | `--cat-sanitario` (verde petrolio) | `#0e6863` | `#6fd1c7` |
| `artefatto` | Artefatti e Chroma | `--cat-artefatti` (viola) | `#7a2f86` | `#dd9ce8` |
| `altro` | Altro | `--cat-altro` (grigio) | `#5f5f66` | `#b4b4bc` |
| — | testo delle etichette | `--cat-testo` | `#ffffff` | `#17171a` |

L'acciaio delle armature (`--cat-armature`) colora anche l'**AR** accanto ai PV (pillole della tab Combattimento e della colonna di sinistra, docs/ricognizione-ar-pi.md): è il colore delle protezioni, non un colore riservato nuovo.

## Bandierine del calendario

Segnano l'importanza di una nota nel Calendario della SD (pallini in Settimana e Mese, bordo della nota in Giorno). Significati in `regole.json` → `calendario.bandierine`; la nota senza bandierina è normale. Il segno «M» (da ricordare) non ha un colore: è la lettera in un riquadro, e si combina con qualunque bandierina.

| Bandierina | Significato | Variabile | Chiaro | Scuro |
|---|---|---|---|---|
| rossa | cruciale | `--evento-rosso` (vermiglio) | `#d9480f` | `#ff8c5a` |
| gialla | importante | `--evento-giallo` (ambra) | `#a67c00` | `#ffd23f` |
| verde | minore | `--evento-verde` (oliva) | `#5c8a00` | `#b8e05a` |

Sono distinte dai colori riservati: il rosso delle bandierine tende all'arancio, quello dei PV al cremisi; il verde è oliva, quello dei Punti Eroe è un verde bosco. Accanto al colore c'è sempre il nome (tooltip e filtri), per chi non distingue i colori. Il test controlla che siano tre colori diversi, lontani da quelli riservati e delle categorie, con contrasto ≥ 3:1 sulla superficie.

## Lato nel Tavolo del Master

Nella plancia del Tavolo del Master il bordo sinistro della carta di un nemico e il nome del suo lato dicono da che parte sta. Il nome del lato è sempre scritto accanto al colore.

| Lato | Variabile | Chiaro | Scuro |
|---|---|---|---|
| avversario | `--lato-avversario` (magenta scuro) | `#a3238f` | `#f28be0` |
| alleato | `--lato-alleato` (petrolio) | `#0b7377` | `#5fd6d6` |

Sono lontani dai colori riservati (PV cremisi, PM blu, Punti Eroe verde) e dalle bandierine. Il test controlla il contrasto ≥ 4.5:1 sulla superficie, perché il nome del lato è testo.

## Altri colori (css/style.css, non riservati)

- `--accento`: link, pulsanti primari, marchio.
- `--ok`, `--attenzione`, `--errore`: esito di controlli e messaggi.
- `--barra-verde`, `--barra-giallo`, `--barra-rosso`: stato delle riserve, cioè quanto resta.
- I colori dei cristalli di Chroma (`.chroma-*`: Bianco, Rosso, Blu, Verde, Viola) sono il colore fisico del cristallo nel mondo di gioco, non un codice dell'interfaccia.

## Scheda da stampare (css/stampa.css)

La SS definisce i suoi colori in `body.vista-stampa` come `--ss-*`, con gli stessi valori del tema chiaro: la stampa non segue il tema scuro. Si stampano con `print-color-adjust: exact`. Il testo resta nero sui fondi chiari; il bianco solo nelle intestazioni piene. Ogni riquadro ha bordo spesso e intestazione nel suo colore, fondo sfumato leggero e righe alterne tinte.

| Uso nella SS | Variabile | Valore |
|---|---|---|
| Punti Vita (riquadro del foglio 3) | `--ss-pv`, `--ss-pv-tenue` | `#c8102e`, `#fdecee` |
| Punti Magia (riquadro del foglio 4) | `--ss-pm`, `--ss-pm-tenue` | `#1d5fc4`, `#eaf0fc` |
| Punti Eroe (riquadro del foglio 1) | `--ss-pe`, `--ss-pe-tenue` | `#1b7a3a`, `#e8f5ec` |
| Incantesimi di macrofamiglia Fisica, Mentale, Spirituale (righe dell'indice, intestazione delle schede) | `--ss-fisica`, `--ss-mentale`, `--ss-spirituale` e i `-tenue` | come `--fisica`, `--mentale`, `--spirituale` |
| Caratteristiche e Abilità (i riquadri principali dei fogli 1 e 2) | `--ss-accento`, `--ss-accento-tenue` | `#8a3b12`, `#f6e8df` |
| Riquadri neutri, testate dei fogli, righe delle armi | `--ss-acciaio`, `--ss-acciaio-tenue` | `#4a5260`, `#eceef1` |
| Tecniche Interiori (elenco del foglio 5) | `--ss-tecnica`, `--ss-tecnica-tenue` | come `--tecnica`, `--tecnica-tenue` |

In bianco e nero le intestazioni diventano grigio scuro con testo bianco e i fondi tenui quasi bianchi: la scheda resta leggibile. La filigrana del foglio 1 è lo stemma della Corporazione in scala di grigi all'8%.
