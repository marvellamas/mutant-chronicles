# Editor della mappa: ricognizione del 12 ottobre 2026

Marcello e Davide al tavolo: creare, selezionare, spostare e cancellare muri, porte e terreno difficile è «un mezzo
casino e un incubo». Questa è la ricognizione prima del rifacimento: che cosa c'è oggi, e ogni difetto trovato
provandolo davvero nel browser su una scena di prova (30 × 22 Q, muri a quadretto, tre muri disegnati di spessori
diversi, due porte, un'area di terreno difficile, un segnaposto), con il server su una porta di prova.

## Gli strumenti di oggi

Non c'è una barra degli strumenti: stanno dentro tre pannelli richiudibili della barra di destra, ognuno con i
propri pulsanti, e tre pulsanti si chiamano «Pennello» e tre «Rettangolo».

| Dove | Strumento | Che cosa fa |
|---|---|---|
| Pannello **Muri** | Pennello | dipinge Q interi nel «modo» scelto |
| | Rettangolo | riempie un rettangolo di Q nel «modo» scelto |
| | Disegna muro | muro vettoriale a mano libera o punto per punto, spessore Sottile / Medio / Un quadretto, con «Raddrizza» |
| | Seleziona muro | seleziona **un solo** muro disegnato; «Elimina muro (Canc)» lo toglie |
| | Porta | clic su un muro: mette una porta; clic su una porta: la seleziona |
| | *modo*: Muro / Terreno difficile / Gomma | vale solo per Pennello e Rettangolo |
| Pannello **Nebbia** | Pennello, Rettangolo | copre e scopre |
| Pannello **Luci** | Pennello, Rettangolo, Gomma | zone di luce |
| Barra in alto | Traccia un quadretto | calibrazione della griglia |

Muri e terreno difficile sono **due maschere di Q** (`scena.muri`, `scena.terreno`); i muri disegnati sono
**oggetti** (`scena.muriLinee`); le porte sono **oggetti** (`scena.porte`). Tre modelli diversi, tre modi di
selezionare, e per il terreno difficile nessuno.

## I difetti, uno per uno

Ogni riga: **cosa fai → cosa succede → cosa ti aspetti.** Quelli segnati «provato» sono stati riprodotti nel
browser; gli altri si leggono nel codice.

### Difetti veri e propri

**D1 — Canc cancella un muro mentre stai dipingendo.** *(provato)*
Selezioni un muro disegnato con «Seleziona muro», poi passi a «Pennello» per dipingere: il muro **resta
selezionato** (il pulsante «Elimina muro (Canc)» è ancora lì). Premi Canc e il muro sparisce, da un'altra parte
della mappa, senza che tu stia guardando. → Cambiando strumento la selezione deve sparire.

**D2 — Canc cancella un muro mentre metti le porte.** *(provato)*
Con un muro selezionato passi a «Porta» e clicchi: il muro resta selezionato. Premi Canc aspettandoti di togliere
la porta e **sparisce il muro**: `M.selezionato` e `M.portaSelezionata` sono due stati separati che non si
escludono, e il tasto Canc guarda prima la porta e poi il muro. → Un oggetto selezionato alla volta, e Canc toglie
quello.

**D3 — «Rifai» non esiste.** *(provato)*
Ctrl+Z annulla, Ctrl+Y non fa niente: la pila di `scena.annulla` si consuma e basta. Se annulli per sbaglio, quello
che avevi fatto è perso. → Ctrl+Y rifà.

**D4 — La gomma non sa togliere solo il terreno difficile.** *(provato: una passata ha tolto 2 Q di muro e 8 di
terreno insieme)*
Il «modo» Gomma azzera tutte e due le maschere e per di più taglia i muri disegnati che incontra. Se hai disegnato
le macerie un quadretto di troppo, per toglierle cancelli anche il muro che le costeggia. → Si seleziona l'area di
terreno e si cancella quella.

**D5 — Esc non riporta a uno stato noto.** *(provato)*
Con «Seleziona muro» attivo e un muro selezionato, Esc spegne lo strumento e lascia **nessuno strumento attivo**;
un secondo Esc non fa niente. Non esiste uno strumento «Seleziona» a cui tornare. → Esc torna sempre a Seleziona.

**D6 — Il «modo» Muro / Terreno / Gomma resta acceso anche quando non significa niente.** *(provato)*
Con «Disegna muro», «Seleziona muro» o «Porta» attivi, la riga Muro / Terreno difficile / Gomma continua a mostrare
«Muro» premuto, come se fosse una scelta in corso: ma quei tre strumenti non la usano. Due righe di pulsanti accese
insieme, una sola delle quali conta. → Un solo strumento attivo alla volta, ben evidenziato.

**D7 — Il bersaglio dei muri disegnati è di 10 pixel, senza alcun segnale.** *(provato)*
Un muro disegnato si prende entro 0,35 Q dal tratto: alla scala normale sono una decina di pixel sullo schermo, e
niente cambia aspetto quando ci passi sopra. Si clicca due o tre volte prima di prenderlo. → Passando sopra con
Seleziona l'oggetto si evidenzia.

### Cose che mancano del tutto

**D8 — Niente si sposta.** Un muro, una porta o un'area di terreno sbagliati di due quadretti si possono solo
cancellare e rifare: non c'è il trascinamento.

**D9 — Niente maniglie.** Un muro disegnato non si allunga, non si accorcia e non se ne sposta un vertice.

**D10 — Niente selezione multipla.** Un muro alla volta; e le porte non si selezionano affatto se non dallo
strumento «Porta».

**D11 — Il terreno difficile non si seleziona.** Si dipinge e si cancella con la gomma, nient'altro.

**D12 — I muri disegnati non si agganciano alla griglia.** C'è «Raddrizza» (forza orizzontale o verticale), ma i
vertici cadono dove capita: due muri che dovrebbero toccarsi restano sfasati di un decimo di quadretto, e la nebbia
automatica ci passa attraverso. Richiesta di Davide.

**D13 — Niente pannello delle proprietà.** Che cosa è selezionato, e con quali proprietà (spessore del muro, porta
aperta o chiusa, tipo di terreno), non si vede da nessuna parte.

**D14 — Non ci sono token liberi.** Il formato della scena conosce già i token `segnaposto` (nome, iniziali,
ingombro, nascosto, e nessuna regola: `src/mappa/area.js`, `vista.js`, `partecipanti.js`), ma **non c'è nessun modo
di crearne uno dall'interfaccia**. Richiesta di Davide.

## Che cosa si fa

Un modello unico per tutti gli oggetti della mappa, in `src/mappa/editor.js` (funzioni pure): una barra con un solo
strumento attivo (Seleziona, Muro, Porta, Terreno difficile, Token libero, Gomma), Esc che torna sempre a Seleziona,
e per Seleziona le stesse azioni su qualunque oggetto — evidenziazione al passaggio, clic per selezionare, Maiusc o
riquadro per più d'uno, trascinamento per spostare, maniglie per i vertici dei muri, Canc per cancellare, Ctrl+Z e
Ctrl+Y per annullare e rifare, e un pannello che dice che cosa è selezionato.

Il terreno difficile resta una maschera di Q nel file (le scene vecchie si aprono senza conversioni), ma per
l'editor diventa un oggetto: le aree sono le macchie collegate della maschera, e si selezionano, si spostano e si
cancellano come tutto il resto.
