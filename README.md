# Mutant

Creatore assistito di personaggi per SIMPLY RPG, per uso interno del gruppo. Guida la
creazione al 1° livello seguendo la sequenza del §2.0 del Manuale del Giocatore, poi
l'avanzamento fino al 20° livello (cap. 8), e produce una scheda stampabile.

## Per il master

Il pacchetto per il master è la cartella [`distribuzione/`](distribuzione/): Marcello la
comprime in uno zip e la manda. Dentro c'è la guida passo per passo,
[`distribuzione/LEGGIMI.txt`](distribuzione/LEGGIMI.txt), e tre file da usare con un doppio
clic, senza terminale, Git o Node già installati:

1. `1_scarica_o_aggiorna_app.bat`: scarica l'app da GitHub nella cartella `mutant` accanto a
   sé, oppure la aggiorna se c'è un commit nuovo su `main`. Cambia solo i file dell'app: i dati di quel
   PC (cartelle del server, `avvisi/`, `config-salvataggi.json`, `node_modules`…: elenco unico in
   [`tools/file-locali.json`](tools/file-locali.json)) non si cancellano mai e prima se ne fa una copia zip in
   `mutant/backup-prima-aggiornamento/` (le ultime 5). La copia la fa
   [`distribuzione/aggiorna-da-zip.ps1`](distribuzione/aggiorna-da-zip.ps1) della versione scaricata; con uno zip
   incompleto non si tocca nulla. Salva anche in `backup_dati` una copia della cartella `data` se il master l'aveva
   modificata.
2. `2_installa_node.bat`: installa Node.js 22 LTS dal sito ufficiale, controllando
   l'impronta SHA-256 dell'installer.
3. `3_avvia.bat`: accende l'app su <http://localhost:3000> e mostra l'indirizzo per il
   telefono sulla stessa Wi-Fi.

Il file 1 scarica senza autenticazione, quindi funziona solo se il repository GitHub è
pubblico.

### Per Davide: d'ora in poi basta `Mutant.bat`

Doppio clic su **`Mutant.bat`** nella cartella di Mutant: si apre una finestra nera con la versione installata, lo stato del server (acceso o spento) e un menu. Si preme il numero:

1. **Avvia Mutant**: accende il server nella sua finestra e apre il browser (come `avvia-server.bat`);
2. **Aggiorna Mutant**: come `aggiorna.bat`, poi la console si riapre già aggiornata;
3. **Salva sessione**: zip in `salvataggi`, copia su Google Drive, notifica a Marcello (come `salva-sessione.bat`);
4. **Ripristina un salvataggio**: scegli dall'elenco; se Mutant è acceso lo spegne (dopo averlo chiesto), fa una copia di sicurezza di com'è adesso e rimette le cartelle del salvataggio;
5. **Apri la cartella dei salvataggi**;
6. **Impostazioni**: apre nel Blocco note `config-salvataggi.json` e `avvisi/avvisi.json` (se mancano li crea);
7. **Esci**.

Dopo ogni voce si torna al menu. Per averlo sul desktop: doppio clic, una volta, su **`crea-collegamento.bat`** (collegamento «Mutant» con l'icona). I vecchi file restano e funzionano come prima: `avvia-server.bat`, `aggiorna.bat`, `salva-sessione.bat` e `avvia.bat`.

### avvia.bat e avvia-server.bat

- **`avvia.bat`**: l'app come prima, i personaggi salvati nel browser.
- **`avvia-server.bat`**: l'app con il Tavolo del Master (plancia, scontri, nemici): i personaggi stanno nella cartella `personaggi/` del PC che fa da server.

**Si apre uno solo dei due.** `avvia-server.bat` basta per tutto, anche per le schede: `avvia.bat` non va aperto insieme e resta com'è, per chi usa l'app senza server.

**Collegare i giocatori.** Con `avvia-server.bat` il server è raggiungibile da telefoni e PC della stessa rete Wi-Fi:
- la finestra del server scrive in evidenza «Giocatori: aprite http://<indirizzo>:3000 dalla stessa rete Wi-Fi», con l'indirizzo di questo PC;
- la plancia ha il riquadro «Collega i giocatori» con lo stesso indirizzo, il pulsante «Copia» e un codice QR da inquadrare con il telefono.

**Firewall di Windows.** Alla prima accensione Windows può chiedere il permesso per Node.js: va consentito per le **reti private**. Se i giocatori non si collegano:
- la rete Wi-Fi del PC deve essere impostata come **privata**, non pubblica (Impostazioni > Rete e Internet > Wi-Fi > proprietà della rete);
- il firewall deve consentire Node.js.

Per tenere il server chiuso agli altri dispositivi: `node server.mjs --solo-locale`.

**Avvisi a Marcello.** Quando aggiorni o avvii Mutant, a Marcello arriva un avviso con la versione: serve a sapere se stai provando l'ultima. Per disattivarlo: `avvisi.json` → `attivo: false`. Il file è `avvisi/avvisi.json` (lo crea `aggiorna.bat` la prima volta); parte solo nome del PC, versione, data e ora, esito (dettagli in `avvisi/LEGGIMI.txt`).

**Salvataggi (per Davide).**
1. Con il server acceso Mutant salva da solo ogni 5 minuti nella cartella `autosave`, se qualcosa è cambiato. Non devi fare nulla.
2. A fine serata premi **«Spegni Mutant»** nel Tavolo del Master: salva la sessione, ti mostra l'esito e chiude la finestra nera.
3. Il salvataggio crea uno zip in `salvataggi` (mai cancellato), lo copia nella tua cartella di Google Drive e manda a Marcello una notifica con i dati allegati.
4. Durante la serata puoi salvare quando vuoi con **«Salva sessione»** (nel Tavolo e nella mappa, gruppo «Scontro»), oppure con `salva-sessione.bat`.
5. Se chiudi la finestra nera con la X, Mutant prova comunque a salvare. Se il PC si spegne di colpo, resta l'ultimo salvataggio automatico.

La cartella di Google Drive si imposta una volta in `config-salvataggi.json` (lo crea `aggiorna.bat`), voce `cartella_drive`. I passi sono in `salvataggi/LEGGIMI.txt`, insieme a come rimettere a posto una sessione da un salvataggio. Facoltativo: `github` per un repository **privato** solo per i salvataggi.

### Avvio diretto dal repo: avvia.bat

Chi lavora sul repo può fare doppio clic su **`avvia.bat`**, nella cartella principale:

1. se manca Node.js, la finestra lo dice e apre <https://nodejs.org>;
2. alla prima accensione installa da solo i componenti necessari (serve internet, un minuto);
3. apre il browser su <http://localhost:3000>. Se la pagina resta vuota, aspetta qualche
   secondo e premi F5.

Mutant resta acceso finché è aperta la finestra nera intitolata «Mutant - chiudi questa
finestra per spegnere»: chiudendola si spegne. I personaggi restano salvati nel browser.
Se la finestra dice che la porta 3000 è già in uso, Mutant è già acceso in un'altra finestra.

## Aggiornare l'app

Quando Marcello pubblica una versione nuova (regole, correzioni, funzioni):

- **con Git**: doppio clic su `aggiorna.bat` nella cartella di Mutant (scarta le versioni
  rigenerate da `avvia.bat` e fa `git pull`; se qualcosa va storto lo dice e resta aperto), oppure
  da terminale

  ```bash
  git checkout -- versione.json index.html
  git pull
  ```

  Se il file `package.json` è cambiato, esegui anche `npm install` (oppure cancella la
  cartella `node_modules`: `avvia.bat` la ricrea da solo).
- **senza Git**: doppio clic su `1_scarica_o_aggiorna_app.bat` del pacchetto
  `distribuzione/` (vedi sopra).

I personaggi non si perdono: stanno nel browser, non nella cartella. Per sicurezza, prima
di aggiornare esportali con **SALVA PG (Esporta JSON)**. Dopo l'aggiornamento non serve Ctrl+F5:
se l'app era aperta compare in alto «Nuova versione disponibile» con **Ricarica**; altrimenti
basta aprirla o premere F5. La versione caricata è in fondo alla pagina (docs/cache.md).

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

**Aggiornamenti e cache del browser** (docs/cache.md). `node tools/versione.mjs` (lo eseguono
`avvia.bat` e il pacchetto per il master) scrive `versione.json` e in `index.html` gli indirizzi dei
moduli con `?v=<versione>`: a ogni aggiornamento il browser prende tutti i file nuovi insieme,
con qualunque server. Con `npm start` il file `serve.json` manda anche `Cache-Control: no-cache`
per `.js`, `.css`, `.json` e `.html`, quindi F5 prende sempre i file nuovi. Con altri server
(`python -m http.server`, GitHub Pages) dopo un aggiornamento compare la barra «Nuova versione
disponibile»: **Ricarica** carica la versione nuova (su GitHub Pages fino a 10 minuti di ritardo).

**Non funziona aprendo `index.html` con un doppio clic** (indirizzo `file://`): i browser
bloccano i moduli JavaScript e la lettura dei file `data/*.json` da `file://`. In quel caso la
pagina resta sul messaggio «Caricamento…», che spiega cosa fare.

I personaggi si salvano automaticamente nel browser (localStorage). Per passarli a un altro
dispositivo o al master si usano **SALVA PG (Esporta JSON)** (file JSON con le sole scelte, di nome
`<nome>_liv<N>_<AAAA-MM-GG>.json`, per esempio `Varek-McCraig_liv8_2026-09-26.json`) e **Importa**,
che legge il contenuto e non dipende dal nome del file.

**Stampa e PDF.** Nella scheda, *Azioni → Stampa* apre l'anteprima dei fogli A4 orizzontali
(3, o 4 con la Magia); lì **Stampa** apre il dialogo del browser, dove per il PDF si sceglie
la stampante «Salva come PDF» (lascia orientamento e margini come proposti, scala 100%).
Ogni foglio sta in una pagina; solo il foglio Magia di un Taumaturgo con molti incantesimi
continua su altre pagine («foglio 5 di 6»), con le intestazioni dei gruppi ripetute.

**Scheda a tab e modalità tavolo.** Finita la creazione, la scheda (`#/p/<id>`) ha quattro tab
come i fogli stampati: Identità, Abilità, Combattimento e Magia (solo con accesso agli
incantesimi). Le tab stanno a sinistra sugli schermi larghi e in basso su telefono e tablet;
l'ingranaggio ⚙ permette di sceglierne la posizione (salvata nel browser). Il menu *Azioni*
raccoglie Stampa, SALVA PG (Esporta JSON), Modifica creazione, Annulla l'ultimo livello e Nuova sessione.
Durante il gioco la scheda tiene i **valori attuali** della sessione: PV, PM, Punti Eroe,
Distintivi (con la conversione 5 → 1 Punto Eroe del §1.8.3), Ferite, Affaticamento, Stati
attivi e note, con pulsanti grandi per il dito. Si salvano con il personaggio in un blocco
`sessione` separato dalle scelte: non si ricalcolano. Salendo o annullando un livello PV e PM
attuali cambiano della stessa quantità dei massimi (un personaggio a 40/47 che guadagna 6 PV
passa a 46/53; ipotesi da confermare, `docs/per-davide.md` A.15); se invece un massimo cambia
per una tabella modificata vengono solo limitati al nuovo massimo. «Nuova sessione» riporta PV e PM
ai massimi e azzera Stati, Ferite e Affaticamento (note, Punti Eroe e Distintivi restano);
«↶ Annulla» annulla l'ultima modifica di sessione.

**Scheda digitale (SD) su schermi larghi.** Nell'ingranaggio, «Larghezza»: piena (predefinita,
fino a 1650 px, e sopra 1300 px più colonne affiancate: Talenti su due
colonne, incantesimi su due colonne; da 1500 px tre riquadri in Magia) oppure compatta (colonna centrale). Sotto i 1300 px le due
scelte sono identiche. PV e PM hanno una barra che si accorcia e cambia colore (verde, giallo,
rosso; soglie in `regole.json` → `interfaccia`), con il numero sempre accanto; il riepilogo PV/PM
sta anche nell'intestazione della scheda. Il riquadro Punti Magia elenca sotto la riserva
personale i cristalli di Chroma, separati: è il posto dove si modificano i loro PM. La tab Abilità
apre con «Condizioni attive» quando Ferite, Affaticamento, Stati o armatura toccano le Abilità.
Le sigle delle modalità di fuoco mostrano la regola del §5.10 al tocco; gli oggetti di sanitario,
accessori e munizioni hanno sotto il nome una riga con l'effetto preso dal manuale
(`effetto_breve`, anche per corredi professionali e Kit trauma, popolato da `tools/lotti/effetto_breve.mjs`, che controlla che ogni frase sia
davvero nel testo). La scheda da stampare (SS) non cambia.

**Valori effettivi.** Nelle tab Abilità e Combattimento e nelle Salvezze di Identità ogni valore è
quello **effettivo**: regole + equipaggiamento + condizioni della sessione (Ferite §5.14,
Affaticamento §5.19, Stati del §5.18 con un effetto numerico: A Terra, Accecato, Immobilizzato,
Incendiato, Rallentato, Terrorizzato). Se differisce dal valore da regole è rosso con ▼ (malus) o
verde con ▲ (bonus); un tocco o il passaggio del mouse mostra la scomposizione («Furtività 6 = 11
(Valore da regole) − 2 (Agilità …) − 2 (Ferita Importante) …»). Gli effetti stanno in `regole.json`
(`stati.elenco[].effetto`, `ferite.si_applica_a`, `affaticamento.si_applica_a`, `stati.abilita_fisiche`);
gli Stati senza effetto numerico restano promemoria. Il totale da regole non cambia (l'avanzamento
usa quello) e la **stampa** mostra i valori a riposo, con l'equipaggiamento ma senza condizioni.

Il passo 0 del wizard si chiama **Background e anagrafica** (nel manuale, §2.0, «Concetto»;
nei file salvati il testo resta `concetto`). L'anagrafica (soprannome, età, città di nascita,
altezza, peso, occhi, capelli, mano dominante, segni distintivi) e i punti esperienza sono
facoltativi; i PX sono un numero libero senza regole, modificabile anche dalla scheda.

**Tiri di dado.** Dove serve un tiro (Punti Eroe 2d3+1 alla creazione; dadi di PV e PM dei
Gradi successivi al primo, perché al 1° livello sono al massimo) si può premere **Tira** oppure inserire il risultato tirato dal vivo: l'app rifiuta
i valori impossibili spiegando perché e ricorda se il risultato è «tirato dall'app» o
«inserito a mano». Nei file ogni tiro è `{ "valore": 3, "origine": "app" | "manuale" }`;
i personaggi salvati prima, con un numero semplice, vengono convertiti da soli.

## Test

```bash
npm test
```

Serve Node 20 o successivo, senza dipendenze. I test coprono il motore di calcolo, il
validatore, gli esempi numerici del manuale, l'invalidazione delle scelte, la
serializzazione, il contenuto dei tooltip (`src/descrizioni.js`), l'avanzamento di
livello (un Agente portato dal 1° al 20°, multiclasse, incompatibilità fra magia e Risorse
Interiori, i passi di «Sali di livello» generati dagli eventi), il catalogo e gli effetti
dell'equipaggiamento, la sessione e i fogli di stampa. Il DOM dell'interfaccia non ha test
automatici.

**Personaggi di collaudo.** In `tests/collaudo/` ci sono tre personaggi creati dall'app ed
esportati (Imperiale Assaltatore 8°, Fratellanza Arcanista 12°, Freelance Tecnico 5°), con i
loro PDF di stampa. `tests/collaudo.test.js` confronta la scheda con i valori ricalcolati a
mano dal manuale, paragrafo per paragrafo: se una tabella cambia e un numero non torna più, il
test dice quale. Dopo una modifica ai dati i PDF si rigenerano con il server acceso sulla
porta 8000 e `node tools/collaudo_pdf.mjs` (serve Microsoft Edge).

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
| `regole.json` | costanti della creazione (punti, massimi, Punti Eroe, Movimento…) e dell'avanzamento (eventi per livello, massimi, limiti); Ferite, Affaticamento e Stati con i loro effetti; `interfaccia`: soglie di colore delle barre di PV e PM; `modalita_di_fuoco`: le sigle delle armi (S, RB, RM, RL, TR, TM, FS, DC) con la regola del §5.10; `chroma`: colori del Chroma con le macrofamiglie alimentate, rapporti di conversione e Talenti che li riducono, Prova per gruppi (Magia sez. 6) |
| `talenti_liberi.json` | gli 87 Talenti Liberi del §8.6 e i Talenti di magia (provvisori) |
| `specializzazioni.json` | le 84 Specializzazioni del §8.8 (armi, mistiche, operative/sociali/professionali) |
| `tecniche_interiori.json` | le 28 Tecniche Interiori del §8.9 e le regole comuni |
| `equipaggiamento/index.json` | l'elenco dei file del catalogo dell'equipaggiamento e le sigle di reperibilità (Armamenti §7.1.8) |
| `equipaggiamento/armi.json` | armi ravvicinate del catalogo Commerciale (Armamenti §7.1.1–7.1.3) |
| `equipaggiamento/armi_corporative.json` | armi ravvicinate dei cataloghi corporativi, con Precisa, attivazioni, cariche e Manovre (Armamenti §7.1.9) |
| `equipaggiamento/armature_corporative.json` | armature dei cataloghi corporativi ed esoscheletri, con penalità effettive, proprietà native, rinforzi ammessi e profilo a sistema spento (Armamenti §7.11.5–7.17.5) |
| `equipaggiamento/corredi_dispositivi.json` | corredi professionali, Kit trauma, dispositivi di volo, moduli IAS, Interfaccia Neurale con la tabella SIN delle armi, esoscheletro APE, Iron Mastiff, armi e granate Imperial (Armamenti §7.12–7.17) |
| `equipaggiamento/accessori_armi.json` | mirini, riduzione del rumore, supporti di tiro, illuminazione e moduli di visione, montati su un'arma (Armamenti §7.3) |
| `equipaggiamento/rinforzi.json` | kit di rinforzo delle armature e soprabiti corporativi, montati su un'armatura (Armamenti §7.11.2) |
| `equipaggiamento/munizioni.json` | munizioni ordinarie e speciali, caricatori, razzi, celle, combustibile, dardi chimici, con la famiglia di munizioni di ogni arma (Armamenti §7.20) |
| `equipaggiamento/sanitario.json` | kit di pronto soccorso, cartucce, UMC, dispositivi portatili, diagnostica e chirurgia, con le applicazioni contate in modalità tavolo (Armamenti §7.19) |
| `equipaggiamento/artefatti.json` | regole di sintonizzazione (capacità per Gradi, costo per potenza), batterie e riserve integrate negli oggetti come contenitori di Chroma (`contenitore`: energia, capacita_pm, integrato) (Armamenti §7.5, §7.5.1, §7.10) |
| `equipaggiamento/unita_robotiche.json` | Cuirassier Attila e Generatore di risonanza RF366, con i VA del robot (Armamenti §7.18) |
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

**Contenitori di Chroma** (Magia sez. 6). Batterie, cristalli e riserve dentro gli oggetti (Bordone
Templare, Scudo delle Guardie Sacre…) hanno colore, capacità in PM e potenza, che dà il costo di
sintonizzazione (§7.10). Un contenitore personalizzato si crea come Artefatto con potenza, colore
e capacità. Ogni contenitore è una voce a sé (quantità 1), trasportato o nello zaino, con la
spunta «Sintonizzato». In modalità tavolo la tab Magia ha le «Riserve esterne» con i PM attuali
(+/− manuali; a 0 PM il Chroma è «Trasparente» con l'alone del colore) e la tab Combattimento
mostra la riserva integrata accanto all'arma. «Ricarica» non riempie le riserve di PM: si
ricaricano solo con Convertire Potere, che arriverà nella prossima sessione di lavoro. La stampa
elenca le riserve nel foglio Magia, con una casella per PM.

Le incoerenze (due armature, arma a due mani con scudo) sono avvisi, non blocchi. Finché il
§2.16 non esiste, l'equipaggiamento iniziale si inserisce a mano.

Un personaggio esportato (formato 5) è `{ "formato", "versione": 5, "versioni_dati", "scelte":
{…creazione…}, "livelli": [ {"livello": 2, …}, … ], "sessione" }`: la scheda si ricalcola
rigiocando la creazione e i livelli dall'inizio, con i limiti di ciascun livello.
Cosa succede a ogni livello sta in `regole.json` → `avanzamento.eventi` (tabella del §8.1):
cambiando la tabella cambiano gli eventi. Si sale un livello alla volta e si può annullare
solo l'ultimo. I Talenti Liberi con effetti sulla scheda (Iniziativa Migliorata, Buona
Costituzione, Prova Salvezza Migliorata, Scattante, Risorse Interiori, Talenti di magia)
hanno il campo `effetti`; gli altri si mostrano con il testo ma non cambiano i numeri.

I personaggi salvati contengono solo le scelte del giocatore: dopo una modifica ai dati,
riaprendoli i valori si ricalcolano. Se una scelta non è più ammessa (per esempio un
valore iniziale cambiato che porta una Caratteristica oltre 7), l'app la corregge e lo
segnala.

## Immagini

Gli originali stanno in `img/originali`, non tracciati da Git: stemmi delle Corporazioni in `Corporazioni/` e icone delle pagine in `Pages/`, a 1254×1254 RGBA, 2–3 MB l'uno. Le versioni per l'app si generano con lo script:

```
python -m pip install -r tools/requirements.txt
python tools/genera_immagini.py
```

Lo script scrive `img/corporazioni/` e `img/pagine/`, con queste varianti:
- `<id>-96.png`: icone, intestazioni, card del wizard, tab;
- `<id>-512.png`: stemma della stampa;
- `<id>-512-grigio.png`: filigrana.

I PNG sono a 256 colori con la trasparenza. C'è anche un `.webp` quando è più leggero; il PNG resta come riserva. I nomi sono gli `id` di `data/corporazioni.json`: Imperial si scrive `imperial`. Freelance non ha ancora un'immagine; Alleanza ce l'ha anche se non è una scelta iniziale. Le pagine usano gli id delle tab: `identita`, `abilita`, `combattimento`, `magia`.

Lo script scrive anche `img/immagini.json`, l'elenco dei file prodotti. L'app legge solo quello e non chiede mai un'immagine che non c'è. Senza un'immagine resta il testo o l'emoji di prima, senza errori.

Nell'ingranaggio della scheda si può spegnere la filigrana della Corporazione nella tab Identità (predefinito: accesa). Stemma e icone sono `<img>`, non sfondi CSS, quindi escono in stampa anche senza «grafica di sfondo».

## Ritratto e sfondi

**Ritratto.** Si carica nel passo Background («Carica immagine»). Il browser:
- lo riduce a 600 px sul lato lungo;
- lo salva in JPEG qualità 0.8, oppure in PNG se l'immagine ha parti trasparenti;
- lo tiene dentro il personaggio, quindi anche nel file esportato;
- lo rifiuta se, dopo la riduzione, supera 200 KB.

Il ritratto compare nell'intestazione della scheda digitale e nella tab Identità. Nell'ingranaggio (⚙) della scheda si può usarlo anche come sfondo sfumato dell'intestazione.

Un ritratto occupa circa 100–270 mila caratteri del localStorage, secondo il peso. Il browser ne concede in genere circa 5 milioni per sito. Se lo spazio finisce, l'app lo dice e non salva l'ultima modifica: si esportano e si tolgono i personaggi vecchi.

**Sfondi di Corporazione.** Nell'ingranaggio della scheda, «Sfondo» offre «Nessuno» e una voce per ogni Corporazione che ha il suo file. Lo sfondo è fisso, a bassa opacità, dietro le card, solo nella scheda digitale. L'app non contiene immagini: si mettono a mano in `img/sfondi/`. Il nome del file è l'`id` della Corporazione in `data/corporazioni.json`:

```
img/sfondi/bauhaus.jpg
img/sfondi/capitol.jpg
img/sfondi/cybertronic.jpg
img/sfondi/fratellanza.jpg
img/sfondi/imperial.jpg
img/sfondi/mishima.jpg
img/sfondi/freelance.jpg
```

Dimensioni consigliate: 1920×1080, JPEG sotto i 300 KB. Immagini scure o poco contrastate rendono meglio; l'app le mostra comunque molto attenuate. L'app non cerca i file sul server: legge l'elenco `"sfondi"` in `img/immagini.json`. Dopo aver aggiunto un file:
- si esegue `python tools/genera_immagini.py`, che aggiorna l'elenco;
- oppure si aggiunge a mano la riga nell'elenco, per esempio `"sfondi": { "bauhaus": "img/sfondi/bauhaus.jpg" }`.

Poi si ricarica la pagina. Uno sfondo non elencato non compare.

## Punti da chiarire (TODO)

Le domande aperte per Davide, gli errata dei manuali e i testi da rileggere sono in
**`docs/per-davide.md`**, l'unico elenco da tenere aggiornato. Nei dati i dubbi sono marcati
`TODO(Davide)` e la home li elenca (sezione «Dati delle regole»). Le risposte già date sono in
`docs/risposte-master.md`, con la data: in caso di conflitto con i manuali valgono quelle.

## Struttura

```
index.html        pagina unica
css/palette.css   colori con un significato (PV, PM, Punti Eroe, magia, categorie): docs/palette.md
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
src/lingua.js     piccole regole di italiano nei testi generati (all’8°, dell’11°)
src/avanzamento.js  personaggio a livelli: ricalcolo, validazione di un livello, prossimo livello
src/ui/           interfaccia (wizard, riepilogo, home, tooltip, tiro di dado)
src/ui/tab.js     scheda a tab e modalità tavolo
src/palette.js    mappe dei colori e calcolo del contrasto (funzioni pure)
src/ritratto.js   ritratto: dimensioni, peso, validità (funzioni pure); canvas in src/ui/ritratto.js
src/ui/sfondi.js  sfondi di Corporazione da img/sfondi/
src/immagini.js   percorso di stemmi e icone con il ripiego (funzioni pure); nel DOM src/ui/immagini.js
src/sessione.js   valori attuali della sessione (funzioni pure)
src/equipaggiamento.js  catalogo, voci del personaggio ed effetti dell'equipaggiamento (funzioni pure)
src/ui/equipaggiamento.js  elenco e «Aggiungi oggetto» (wizard e tab Combattimento)
src/ui/sali.js    schermata «Sali di livello»
src/stampa.js     dati dei fogli di stampa e delle tab (funzioni pure)
src/ui/stampa.js  vista di stampa A4 orizzontale, con css/stampa.css
data/             regole in JSON
tests/            node --test; tests/collaudo/ personaggi di riferimento e loro PDF
docs/             studio di fattibilità, ricognizione dell'avanzamento, lotti del catalogo,
                  domande e risposte del master, roadmap
serve.json        intestazioni di cache per npm start e avvia.bat
tools/            estrazione di testo e tabelle dai PDF dei manuali (Python + pdfplumber) e generatori
                  dei lotti del catalogo (tools/lotti/), PDF di collaudo; non fa parte dell'app
img/originali/    originali delle immagini, non tracciati (vedi «Immagini»)
img/corporazioni/ stemmi generati da tools/genera_immagini.py; img/pagine/ icone delle tab
img/immagini.json elenco delle immagini presenti: l'app chiede solo queste
img/sfondi/       sfondi della scheda per Corporazione, da aggiungere a mano (vedi «Ritratto e sfondi»)
avvia.bat         avvio con doppio clic su Windows
distribuzione/    pacchetto per il master: guida e tre file .bat (vedi «Per il master»)
```
