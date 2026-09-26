# Mutant

Creatore assistito di personaggi per SIMPLY RPG, per uso interno del gruppo. Guida la
creazione al 1° livello seguendo la sequenza del §2.0 del Manuale del Giocatore, poi
l'avanzamento fino al 20° livello (cap. 8), e produce una scheda stampabile.

## Per il master: doppio clic su avvia.bat

Su Windows basta un doppio clic su **`avvia.bat`**, nella cartella principale di Mutant:

1. se manca Node.js, la finestra lo dice e apre <https://nodejs.org>: scarica e installa la
   versione **LTS** con le opzioni proposte, poi fai di nuovo doppio clic su `avvia.bat`;
2. alla prima accensione installa da solo i componenti necessari (serve internet, un minuto);
3. apre il browser su <http://localhost:3000>. Se la pagina resta vuota, aspetta qualche
   secondo e premi F5.

Mutant resta acceso finché è aperta la finestra nera intitolata «Mutant - chiudi questa
finestra per spegnere»: chiudendola si spegne. I personaggi restano salvati nel browser.
Se la finestra dice che la porta 3000 è già in uso, Mutant è già acceso in un'altra finestra.

## Aggiornare l'app

Quando Marcello pubblica una versione nuova (regole, correzioni, funzioni):

- **con Git**: nella cartella di Mutant esegui

  ```bash
  git pull
  ```

  Se il file `package.json` è cambiato, esegui anche `npm install` (oppure cancella la
  cartella `node_modules`: `avvia.bat` la ricrea da solo).
- **senza Git**: riscarica la cartella (su GitHub, *Code → Download ZIP*) e sostituisci la
  vecchia. Se hai modificato i file in `data/`, copiali da parte prima e rimettili dopo.

I personaggi non si perdono: stanno nel browser, non nella cartella. Per sicurezza, prima
di aggiornare esportali con **Esporta**. Dopo l'aggiornamento ricarica la pagina (con
`avvia.bat` basta F5; con altri server Ctrl+F5, vedi sotto).

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

**Aggiornamenti e cache del browser.** Con `npm start` il file `serve.json` fa rispondere il
server con `Cache-Control: no-cache` (e un ETag) per i file `.js`, `.css` e `.json`: il browser
chiede ogni volta se il file è cambiato, costa pochissimo e prende sempre la versione nuova.
Con altri server (`python -m http.server`, GitHub Pages) il browser può tenere in cache i file
vecchi per un po': dopo un aggiornamento dell'app, se qualcosa non torna, ricarica la pagina
con **Ctrl+F5** (su Mac **Cmd+Shift+R**).

**Non funziona aprendo `index.html` con un doppio clic** (indirizzo `file://`): i browser
bloccano i moduli JavaScript e la lettura dei file `data/*.json` da `file://`. In quel caso la
pagina resta sul messaggio «Caricamento…», che spiega cosa fare.

I personaggi si salvano automaticamente nel browser (localStorage). Per passarli a un altro
dispositivo o al master si usano **Esporta** (file JSON con le sole scelte) e **Importa**.

**Stampa e PDF.** Nella scheda, *Azioni → Stampa* apre l'anteprima dei fogli A4 orizzontali
(3, o 4 con la Magia); lì **Stampa** apre il dialogo del browser, dove per il PDF si sceglie
la stampante «Salva come PDF» (lascia orientamento e margini come proposti, scala 100%).
Ogni foglio sta in una pagina; solo il foglio Magia di un Taumaturgo con molti incantesimi
continua su altre pagine («foglio 5 di 6»), con le intestazioni dei gruppi ripetute.

**Scheda a tab e modalità tavolo.** Finita la creazione, la scheda (`#/p/<id>`) ha quattro tab
come i fogli stampati: Identità, Abilità, Combattimento e Magia (solo con accesso agli
incantesimi). Le tab stanno a sinistra sugli schermi larghi e in basso su telefono e tablet;
l'ingranaggio ⚙ permette di sceglierne la posizione (salvata nel browser). Il menu *Azioni*
raccoglie Stampa, Esporta, Modifica creazione, Annulla l'ultimo livello e Nuova sessione.
Durante il gioco la scheda tiene i **valori attuali** della sessione: PV, PM, Punti Eroe,
Distintivi (con la conversione 5 → 1 Punto Eroe del §1.8.3), Ferite, Affaticamento, Stati
attivi e note, con pulsanti grandi per il dito. Si salvano con il personaggio in un blocco
`sessione` separato dalle scelte: non si ricalcolano, e se un massimo cambia (nuovo livello,
tabella modificata) vengono solo limitati al nuovo massimo. «Nuova sessione» riporta PV e PM
ai massimi e azzera Stati, Ferite e Affaticamento (note, Punti Eroe e Distintivi restano);
«↶ Annulla» annulla l'ultima modifica di sessione. Le penalità di Ferite, Affaticamento e
Stati compaiono come promemoria: i VA della scheda non le includono.

Il passo 0 del wizard si chiama **Background e anagrafica** (nel manuale, §2.0, «Concetto»;
nei file salvati il testo resta `concetto`). L'anagrafica (soprannome, età, città di nascita,
altezza, peso, occhi, capelli, mano dominante, segni distintivi) e i punti esperienza sono
facoltativi; i PX sono un numero libero senza regole, modificabile anche dalla scheda.

**Tiri di dado.** Dove serve un tiro (dado dei PM delle Classi taumaturgiche, Punti Eroe
2d3+1) si può premere **Tira** oppure inserire il risultato tirato dal vivo: l'app rifiuta
i valori impossibili spiegando perché e ricorda se il risultato è «tirato dall'app» o
«inserito a mano». Nei file ogni tiro è `{ "valore": 3, "origine": "app" | "manuale" }`;
i personaggi salvati prima, con un numero semplice, vengono convertiti da soli.

## Test

```bash
npm test
```

Serve Node 20 o successivo, senza dipendenze. I test coprono il motore di calcolo, il
validatore, gli esempi numerici del manuale, l'invalidazione delle scelte, la
serializzazione, il contenuto dei tooltip (`src/descrizioni.js`) e l'avanzamento di
livello (un Agente portato dal 1° al 20°, multiclasse, incompatibilità fra magia e Risorse
Interiori, i passi di «Sali di livello» generati dagli eventi). Il DOM dell'interfaccia non
ha test automatici.

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
| `regole.json` | costanti della creazione (punti, massimi, Punti Eroe, Movimento…) e dell'avanzamento (eventi per livello, massimi, limiti) |
| `talenti_liberi.json` | gli 87 Talenti Liberi del §8.6 e i Talenti di magia (provvisori) |
| `specializzazioni.json` | le 84 Specializzazioni del §8.8 (armi, mistiche, operative/sociali/professionali) |
| `tecniche_interiori.json` | le 28 Tecniche Interiori del §8.9 e le regole comuni |
| `equipaggiamento/index.json` | l'elenco dei file del catalogo dell'equipaggiamento e le sigle di reperibilità (Armamenti §7.1.8) |
| `equipaggiamento/armi.json` | armi ravvicinate del catalogo Commerciale (Armamenti §7.1.1–7.1.3) |
| `equipaggiamento/armi_corporative.json` | armi ravvicinate dei cataloghi corporativi, con Precisa, attivazioni, cariche e Manovre (Armamenti §7.1.9) |
| `equipaggiamento/armature_corporative.json` | armature dei cataloghi corporativi ed esoscheletri, con penalità effettive, proprietà native, rinforzi ammessi e profilo a sistema spento (Armamenti §7.11.5–7.17.5) |
| `equipaggiamento/armi_distanza_corporative.json` | armi a distanza dei cataloghi corporativi, con i moduli integrati (lanciagranate, lanciafiamme) e le munizioni di riferimento dei lanciatori (Armamenti §7.8) |
| `equipaggiamento/armi_distanza.json` | armi a distanza del catalogo Commerciale, con gittata, caricatore, modalità di fuoco, INC (Armamenti §7.7) |
| `equipaggiamento/scudi.json` | scudi commerciali e corporativi, con Parata ravvicinata e a distanza e profili alternativi (Armamenti §7.4) |
| `equipaggiamento/armature.json` | armature commerciali civili e penalità per categoria (Armamenti §7.11.1–7.11.3) |

**Catalogo dell'equipaggiamento.** Cresce a lotti (lista in `docs/equipaggiamento-lotti.md`):
aggiungere un lotto significa aggiungere un file in `data/equipaggiamento/` e una riga in
`index.json`. Ogni oggetto ha `id`, `nome`, `tipo`, `catalogo`, `famiglia`,
`nomi_alternativi`, `note_manuale`, `paragrafo` e `versione_manuale`, più i campi del suo tipo
(per le armi: `abilita`, `specializzazione`, `mani`, `danno`, `portata_q`, `for_richiesta`…).
Nei personaggi un oggetto è indicato come `"armi:spada-leggera"`: se lo togli dal catalogo, nei
personaggi che lo avevano resta in lista come «non più in catalogo», senza effetti.

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

### Avanzamento di livello

Dalla scheda finale, «Sali al livello N+1» apre una sequenza di passi generata dagli
eventi del livello: Caratteristiche, Talento Libero (o Specializzazione), Grado di Classe con
i tiri di PV e PM, Tecniche Interiori e Incantesimi quando le scelte li concedono, Punti
Abilità, riepilogo. Nulla si salva fino a «Conferma»; uscire prima chiede conferma. La
scheda mostra la Progressione (una riga per livello) e «Annulla l'ultimo
livello». Con dei livelli acquisiti la creazione resta consultabile ma bloccata, tranne
nome, Background, anagrafica ed equipaggiamento. La home mostra il livello di ogni personaggio.
Il file esportato (formato 5) contiene anche i livelli, l'anagrafica, l'equipaggiamento e la
sessione; i file dei formati 1 e 2 si importano come personaggi al 1° livello, e senza sessione
la si inizializza ai massimi. Il vecchio campo di testo dell'equipaggiamento diventa un oggetto
personalizzato «altro» con quel testo nelle note.

**Equipaggiamento.** Nel passo Equipaggiamento del wizard e nella tab Combattimento si aggiungono
oggetti dal catalogo (cascata Tipo → Catalogo → Famiglia → Profilo, oppure ricerca per nome,
anche con i nomi alternativi come «alabarda») o come oggetti personalizzati. Ogni oggetto ha uno
stato (impugnata, addosso, nello zaino; imbracciato; indossata), la quantità e le note. Solo gli
oggetti attivi cambiano i valori:
- le armi impugnate mostrano il VA per colpire (VA dell'Abilità dell'arma, Specializzazione della
  famiglia, penalità se la FOR è inferiore al requisito, penalità dell'armatura), il danno e la
  Parata;
- l'armatura indossata applica l'AR e le penalità di categoria (colonna «Equip» delle Abilità);
- per le armi a distanza impugnate la modalità tavolo tiene i colpi nel caricatore (partono dalla
  capacità del catalogo, «Ricarica» li riporta al massimo) e le riserve, contate a mano.

Le incoerenze (due armature, arma a due mani con scudo) sono avvisi, non blocchi. Finché il
§2.16 non esiste, l'equipaggiamento iniziale si inserisce a mano.

Un personaggio è `{ "creazione": {…scelte…}, "livelli": [ {"livello": 2, …}, … ] }`: la scheda si
ricalcola rigiocando la creazione e i livelli dall'inizio, con i limiti di ciascun livello.
Cosa succede a ogni livello sta in `regole.json` → `avanzamento.eventi` (tabella del §8.1):
cambiando la tabella cambiano gli eventi. Si sale un livello alla volta e si può annullare
solo l'ultimo. I Talenti Liberi con effetti sulla scheda (Iniziativa Migliorata, Buona
Costituzione, Prova Salvezza Migliorata, Scattante, Risorse Interiori, Talenti di magia)
hanno il campo `effetti`; gli altri si mostrano con il testo ma non cambiano i numeri.

I personaggi salvati contengono solo le scelte del giocatore: dopo una modifica ai dati,
riaprendoli i valori si ricalcolano. Se una scelta non è più ammessa (per esempio un
valore iniziale cambiato che porta una Caratteristica oltre 7), l'app la corregge e lo
segnala.

## Punti da chiarire (TODO)

Le domande aperte per Davide, gli errata dei manuali e i testi da rileggere sono in
**`docs/per-davide.md`**, l'unico elenco da tenere aggiornato. Nei dati i dubbi sono marcati
`TODO(Davide)` e la home li elenca (sezione «Dati delle regole»). Le risposte già date sono in
`docs/risposte-master.md`, con la data: in caso di conflitto con i manuali valgono quelle.

## Struttura

```
index.html        pagina unica
css/style.css     stile e versione telefono
css/stampa.css    fogli di stampa (caricato solo nella vista di stampa)
src/rules.js      carica e valida i dati
src/validate.js   invarianti dei dati
src/calc.js       motore di calcolo (funzioni pure)
src/character.js  modello delle scelte, invalidazione a valle, import/export
src/incantesimi.js  quote e scelta degli incantesimi
src/checklist.js  controllo finale §2.17
src/descrizioni.js  contenuto dei tooltip e della scheda completa degli incantesimi
src/tiri.js       tiri di dado { valore, origine }: formula, intervallo, migrazione
src/avanzamento.js  personaggio a livelli: ricalcolo, validazione di un livello, prossimo livello
src/ui/           interfaccia (wizard, riepilogo, home, tooltip, tiro di dado)
src/ui/tab.js     scheda a tab e modalità tavolo
src/sessione.js   valori attuali della sessione (funzioni pure)
src/equipaggiamento.js  catalogo, voci del personaggio ed effetti dell'equipaggiamento (funzioni pure)
src/ui/equipaggiamento.js  elenco e «Aggiungi oggetto» (wizard e tab Combattimento)
src/ui/sali.js    schermata «Sali di livello»
src/stampa.js     dati dei fogli di stampa e delle tab (funzioni pure)
src/ui/stampa.js  vista di stampa A4 orizzontale, con css/stampa.css
data/             regole in JSON
tests/            node --test
docs/             studio di fattibilità, ricognizione dell'avanzamento, risposte del master
serve.json        intestazioni di cache per npm start e avvia.bat
tools/            estrazione di testo e tabelle dai PDF dei manuali (Python + pdfplumber) e generatori
                  dei lotti del catalogo (tools/lotti/); non fa parte dell'app
avvia.bat         avvio con doppio clic su Windows
```
