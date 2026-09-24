# Mutant

Creatore assistito di personaggi per SIMPLY RPG, per uso interno del gruppo. Guida la
creazione al 1° livello seguendo la sequenza del §2.0 del Manuale del Giocatore e produce
una scheda stampabile.

## Avvio in locale

L'app è una pagina statica: basta un qualunque server statico nella cartella del progetto.

```bash
python -m http.server 8000
```

poi apri <http://localhost:8000>. In alternativa, con Node installato: `npx serve`.

**Non funziona aprendo `index.html` con un doppio clic** (indirizzo `file://`): i browser
bloccano i moduli JavaScript e la lettura dei file `data/*.json` da `file://`. In quel caso la
pagina resta sul messaggio «Caricamento…», che spiega cosa fare.

I personaggi si salvano automaticamente nel browser (localStorage). Per passarli a un altro
dispositivo o al master si usano **Esporta** (file JSON con le sole scelte) e **Importa**.

## Test

```bash
npm test
```

Serve Node 20 o successivo, senza dipendenze. I test coprono il motore di calcolo, il
validatore, gli esempi numerici del manuale, l'invalidazione delle scelte e la
serializzazione. L'interfaccia non ha test automatici.

## Modificare le regole (per Davide)

Tutte le regole numeriche stanno in `data/`:

| File | Contenuto |
|---|---|
| `caratteristiche.json` | Caratteristiche, tabelle dei modificatori, Salvezze |
| `abilita.json` | le 24 Abilità con categoria e Caratteristica |
| `corporazioni.json` | valori iniziali, Abilità +1, bonus alle Salvezze, testi |
| `addestramenti.json` | valori base delle 24 Abilità, vantaggio, Salvezze |
| `classi.json` | Classi, PV/PM per Grado, quote incantesimi, Talenti con testo |
| `incantesimi.json` | indice dei 90 incantesimi |
| `regole.json` | costanti della creazione (punti, massimi, Punti Eroe, Movimento…) |

Si modificano con un editor di testo (anche direttamente su GitHub). Ogni file ha il campo
`versione_manuale`, che l'app mostra in alto: aggiornalo quando i dati seguono una nuova
edizione del manuale.

All'avvio l'app controlla i dati (`src/validate.js`): per esempio che ogni Addestramento
sommi 48 punti con lo schema 4/4/8/4/4, che ogni Classe abbia 5 Abilità esistenti, 3
Talenti fissi e 5 a scelta, che gli incantesimi siano 4/3/2/1 per livello base in ogni
specializzazione. Se qualcosa non torna, al posto dell'app compare una pagina con l'elenco
degli errori: file, chiave e problema. Lo stesso controllo si fa con `npm test`.

I personaggi salvati contengono solo le scelte del giocatore: dopo una modifica ai dati,
riaprendoli i valori si ricalcolano. Se una scelta non è più ammessa (per esempio un
valore iniziale cambiato che porta una Caratteristica oltre 7), l'app la corregge e lo
segnala.

## Punti da chiarire (TODO)

I dubbi sul manuale sono marcati `TODO(Davide)` nei dati. La home li elenca tutti (sezione
«Dati delle regole»). Oggi sono:

- `classi.json`, Esploratore: a quale Specializzazione appartengono i 5 Talenti a scelta.
- `regole.json` → `taumaturgo`: le quattro domande sugli incantesimi al 1° livello.

Finché non c'è risposta, per gli incantesimi l'app applica l'ipotesi più permissiva e lo
dice nel passo Incantesimi (`src/incantesimi.js`):

- la quota di Classe di una macrofamiglia vale per una qualunque delle sue tre specializzazioni;
- gli incantesimi liberi (2 + Mod INT, minimo 0) valgono per qualunque macrofamiglia;
- sono ammessi gli incantesimi con livello base fino a 3 × Gradi taumaturgici.

## Struttura

```
index.html        pagina unica
css/style.css     stile, versione telefono e stampa
src/rules.js      carica e valida i dati
src/validate.js   invarianti dei dati
src/calc.js       motore di calcolo (funzioni pure)
src/character.js  modello delle scelte, invalidazione a valle, import/export
src/incantesimi.js  quote e scelta degli incantesimi
src/checklist.js  controllo finale §2.17
src/ui/           interfaccia (wizard, riepilogo, scheda, home)
data/             regole in JSON
tests/            node --test
docs/             studio di fattibilità
```
