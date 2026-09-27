# Palette della scheda digitale

I valori stanno in `css/palette.css`, come variabili CSS con la variante per il tema scuro (`prefers-color-scheme: dark`). Qui si spiega a che cosa serve ogni colore. La SS (stampa) userà la stessa palette in una sessione successiva.

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

Sulle tinte delle macrofamiglie il testo dell'incantesimo resta quello normale (`--testo`, nero o bianco pieno): la tinta è leggera e non toglie leggibilità. Accanto alla barra colorata c'è sempre l'etichetta con il nome della macrofamiglia, per chi non distingue i colori.

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
| `accessorio` | Accessori | `--cat-accessori` (prugna) | `#5a4870` | `#c3aee0` |
| `munizioni` | Munizioni | `--cat-munizioni` (cuoio) | `#6b4423` | `#d6a67c` |
| `sanitario` | Sanitario | `--cat-sanitario` (verde petrolio) | `#0e6863` | `#6fd1c7` |
| `artefatto` | Artefatti e Chroma | `--cat-artefatti` (viola) | `#7a2f86` | `#dd9ce8` |
| `altro` | Altro | `--cat-altro` (grigio) | `#5f5f66` | `#b4b4bc` |
| — | testo delle etichette | `--cat-testo` | `#ffffff` | `#17171a` |

## Bandierine del calendario

Segnano l'importanza di una nota nel Calendario della SD (pallini in Settimana e Mese, bordo della nota in Giorno). Significati in `regole.json` → `calendario.bandierine`; la nota senza bandierina è normale. Il segno «M» (da ricordare) non ha un colore: è la lettera in un riquadro, e si combina con qualunque bandierina.

| Bandierina | Significato | Variabile | Chiaro | Scuro |
|---|---|---|---|---|
| rossa | cruciale | `--evento-rosso` (vermiglio) | `#d9480f` | `#ff8c5a` |
| gialla | importante | `--evento-giallo` (ambra) | `#a67c00` | `#ffd23f` |
| verde | minore | `--evento-verde` (oliva) | `#5c8a00` | `#b8e05a` |

Sono distinte dai colori riservati: il rosso delle bandierine tende all'arancio, quello dei PV al cremisi; il verde è oliva, quello dei Punti Eroe è un verde bosco. Accanto al colore c'è sempre il nome (tooltip e filtri), per chi non distingue i colori. Il test controlla che siano tre colori diversi, lontani da quelli riservati e delle categorie, con contrasto ≥ 3:1 sulla superficie.

## Altri colori (css/style.css, non riservati)

- `--accento`: link, pulsanti primari, marchio.
- `--ok`, `--attenzione`, `--errore`: esito di controlli e messaggi.
- `--barra-verde`, `--barra-giallo`, `--barra-rosso`: stato delle riserve, cioè quanto resta.
- I colori dei cristalli di Chroma (`.chroma-*`: Bianco, Rosso, Blu, Verde, Viola) sono il colore fisico del cristallo nel mondo di gioco, non un codice dell'interfaccia.
