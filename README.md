# Mutant

Creatore assistito di personaggi per SIMPLY RPG, per uso interno del gruppo. Guida la
creazione al 1° livello seguendo la sequenza del §2.0 del Manuale del Giocatore e produce
una scheda stampabile.

## Avvio in locale

L'app è una pagina statica: basta un qualunque server statico nella cartella del progetto.
Con Node installato:

```bash
npm start
```

che esegue `npx serve .` (la prima volta npx scarica il pacchetto `serve`) e indica
l'indirizzo da aprire, di solito <http://localhost:3000>. In alternativa, con Python:

```bash
python -m http.server 8000
```

e poi <http://localhost:8000>.

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
validatore, gli esempi numerici del manuale, l'invalidazione delle scelte, la
serializzazione e il contenuto dei tooltip (`src/descrizioni.js`). L'interfaccia non ha
test automatici.

## Modificare le regole (per Davide)

Tutte le regole numeriche stanno in `data/`:

| File | Contenuto |
|---|---|
| `caratteristiche.json` | Caratteristiche con descrizione, tabelle dei modificatori, Salvezze |
| `abilita.json` | le 24 Abilità con categoria, Caratteristica, ambito (§4.3) e descrizione (§4.4) |
| `corporazioni.json` | valori iniziali, Abilità +1, bonus alle Salvezze, testi |
| `addestramenti.json` | valori base delle 24 Abilità, vantaggio, Salvezze |
| `classi.json` | Classi, PV/PM per Grado, quote incantesimi, Talenti con testo |
| `incantesimi.json` | i 90 incantesimi: indice e scheda (intestazione, lancio, descrizione, tabella delle versioni, regole) |
| `regole.json` | costanti della creazione (punti, massimi, Punti Eroe, Movimento…) |

Si modificano con un editor di testo (anche direttamente su GitHub). Ogni file ha il campo
`versione_manuale`, che l'app mostra in alto: aggiornalo quando i dati seguono una nuova
edizione del manuale.

All'avvio l'app controlla i dati (`src/validate.js`): per esempio che ogni Addestramento
sommi 48 punti con lo schema 4/4/8/4/4, che ogni Classe abbia 5 Abilità esistenti, 3
Talenti fissi e 5 a scelta, che gli incantesimi siano 4/3/2/1 per livello base in ogni
specializzazione. Se qualcosa non torna, al posto dell'app compare una pagina con l'elenco
degli errori: file, chiave e problema. Lo stesso controllo si fa con `npm test`.

Ogni Abilità e ogni incantesimo deve avere una `descrizione` non vuota: è il testo dei
tooltip. Un campo che vale `"TODO(Davide)"` (per esempio la descrizione di una
Caratteristica, o la tabella di un incantesimo non ancora ricostruita) non blocca l'app:
compare fra gli «avvisi sui dati» in home e il tooltip lo dice.

### Descrizioni e tooltip

Nell'app i nomi di Abilità, Caratteristiche e Incantesimi sono sottolineati a puntini:
passandoci sopra col mouse (o col tasto Tab) compare la descrizione; sul telefono basta un
tocco. Il clic sul nome di un incantesimo apre la scheda completa. I testi vengono tutti dai
JSON: per cambiarli si modifica il campo `descrizione` (o, per gli incantesimi, `lancio`,
`versioni`, `regole`). In `incantesimi.json` la tabella `versioni` è una lista di righe,
una per livello, con le stesse intestazioni di colonna della scheda del manuale; la prima
colonna è sempre il Livello.

I personaggi salvati contengono solo le scelte del giocatore: dopo una modifica ai dati,
riaprendoli i valori si ricalcolano. Se una scelta non è più ammessa (per esempio un
valore iniziale cambiato che porta una Caratteristica oltre 7), l'app la corregge e lo
segnala.

## Punti da chiarire (TODO)

I dubbi sul manuale sono marcati `TODO(Davide)` nei dati. La home li elenca tutti (sezione
«Dati delle regole»). Oggi sono:

- `classi.json`, Esploratore: a quale Specializzazione appartengono i 5 Talenti a scelta.
- `regole.json` → `taumaturgo`: le quattro domande sugli incantesimi al 1° livello.
- `caratteristiche.json`: la descrizione delle sei Caratteristiche (il manuale non le descrive).

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
src/descrizioni.js  contenuto dei tooltip e della scheda completa degli incantesimi
src/ui/           interfaccia (wizard, riepilogo, scheda, home, tooltip)
data/             regole in JSON
tests/            node --test
docs/             studio di fattibilità
```
