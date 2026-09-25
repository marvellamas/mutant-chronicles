# Roadmap v3: equipaggiamento e scheda stampabile

Data: 25 settembre 2026. Requisiti raccolti da Marcello per le fasi successive all'avanzamento di livello. Questo documento è la specifica di partenza: i prompt a Claude Code si scrivono da qui.

## 1. Equipaggiamento nella scheda

### 1.1 Contesto

- Il §2.16 del Manuale del Giocatore (equipaggiamento iniziale) non è ancora scritto e non è previsto a breve. Quindi **nessuna dotazione automatica**: il giocatore (o il master) inserisce gli oggetti a mano, voce per voce.
- La fonte dei dati è il Manuale degli Armamenti v0.50 (121 pagine, quasi tutto tabelle): armi ravvicinate e a distanza (catalogo commerciale + cataloghi corporativi), scudi, armature e rinforzi, mirini e accessori, munizioni, equipaggiamento sanitario, artefatti. Il Manuale degli Equipaggiamenti (strumenti) è in stesura: la struttura dati deve poterlo accogliere dopo.

### 1.2 Inserimento

- Menu a tendina a cascata che filtrano progressivamente: **Tipo** (arma ravvicinata / arma a distanza / scudo / armatura / accessorio / munizioni / sanitario / artefatto / altro) → **Catalogo** (Commerciale, Capitol, Imperial, Cybertronic, Mishima, Fratellanza, Bauhaus, Alleanza) → **Famiglia** (es. Spade, Pistole) → **Profilo** (l'oggetto). Ogni livello mostra solo le voci esistenti nei livelli sopra.
- In alternativa alla cascata, una ricerca per nome che salta direttamente al profilo.
- Voce "Oggetto personalizzato" con campi liberi (nome, note, eventuali valori a mano): copre ciò che il manuale non ha ancora e le improvvisazioni del master.
- Quantità per le voci a consumo (munizioni, kit sanitari).
- Ogni riga ha **note** libere (es. "regalo di Von Holle", "danneggiata").

### 1.3 Stato dell'oggetto: la checkbox

Un oggetto nella scheda ha uno stato, e **solo gli oggetti attivi influenzano i valori**:

| Tipo | Stati possibili | Effetto solo se |
|---|---|---|
| Arma | impugnata / addosso (pronta) / nello zaino | impugnata (per attacchi e manovre); "addosso" conta solo per estrazione rapida |
| Scudo | imbracciato / addosso / nello zaino | imbracciato |
| Armatura, rinforzi | indossata / nello zaino | indossata |
| Accessori (mirini, ecc.) | montato su [arma X] / nello zaino | montato |
| Munizioni, sanitario, altro | — (solo quantità) | mai |

Nell'interfaccia lo stato è una checkbox "indossato/impugnato" per i tipi a due stati e un piccolo selettore per le armi. Le regole di coerenza (una sola armatura indossata; mani impegnate: arma a due mani esclude lo scudo; un accessorio su una sola arma) si mostrano come avviso, non come blocco, perché il master decide.

### 1.4 Effetti sui valori

I dati di ogni profilo vanno in JSON (`armi.json`, `armature.json`, `scudi.json`, `accessori.json`, `munizioni.json`, …) con un campo `effetti` strutturato. Quelli che la scheda calcola:

- **Armi**: Abilità usata (dalla scheda dell'arma, mai riclassificata), danno base (una/due mani), portata/gittata, mani, requisito FOR con penalità pari alla differenza (Armamenti §7.1.6), INC, PI, proprietà (testo + eventuali modificatori tipizzati: es. "Difensiva +2", "Sanguinante 1"). Nella sezione combattimento la scheda mostra, per ogni arma impugnata, il **VA per colpire già calcolato** (VA dell'Abilità + bonus Specializzazione arma + penalità FOR), il danno con il bonus della Specializzazione, e la Difesa se l'arma ha proprietà difensive.
- **Armature e scudi**: AR per area/tipo di danno, eventuali penalità a Furtività/Atletica/Movimento, requisiti. Mostrati nella sezione combattimento e applicati alle Abilità interessate solo se indossati.
- **Accessori**: bonus alla Prova dell'arma su cui sono montati (mirini), silenziatori, ecc.
- **Artefatti**: sintonizzazione (§7.10) e effetti: probabilmente testo + TODO fino a lettura approfondita.

Il calcolo resta in funzioni pure (`calc`), con l'equipaggiamento come ulteriore input di `calcolaScheda`. Il salvataggio contiene solo le voci scelte, lo stato e le note: i valori si ricalcolano, come per tutto il resto. Un oggetto rimosso dal catalogo da Davide resta nella scheda come "oggetto non più in catalogo" con i valori vuoti, senza rompere il personaggio.

### 1.5 Estrazione dei cataloghi

Vedi la conversazione sul metodo del `.bat` di HeA: script Python `tools/estrai_manuali.py` con **pdfplumber** per le tabelle (non `pdftotext -layout`, che rompe le celle a capo), output CSV grezzo per tabella, poi trasformazione in JSON con validatore (id univoci, Abilità esistente, numeri nei campi numerici, FOR entro 1–10). Prova pilota su 2–3 tabelle prima di pianificare tutto il manuale. Lo stesso script, in modalità prosa, produce i `.txt` per sezione usati per il diff fra edizioni dei manuali.

### 1.6 Ordine di lavoro proposto

1. Script di estrazione + pilota su armi ravvicinate commerciali (§7.1.1) e armature base (§7.11).
2. Struttura dati e validatore; catalogo completo per tabelle successive.
3. Passo "Equipaggiamento" nel wizard e nella scheda: cascata, ricerca, personalizzato, stati, note.
4. Effetti sui valori e sezione combattimento della scheda.
5. Artefatti e sintonizzazione (ultimi: regole più intrecciate).

## 2. Scheda stampabile

### 2.1 Formato

- **A4 orizzontale** (tradizione del gruppo). CSS: `@page { size: A4 landscape; margin: 10mm }`.
- **Quattro fogli**, ognuno una pagina intera, con `page-break-after: always`:
  1. **Identità**: nome, Corporazione, Addestramento, Classi e Gradi, livello; Caratteristiche con modificatori; Salvezze; PV, PM, Punti Eroe e Distintivi (con caselle da segnare a mano); Iniziativa, Movimento, Azioni; aspetto e Background in breve.
  2. **Abilità e statistiche**: le 24 Abilità per categoria con componenti e VA; Talenti (Classe e Liberi) con testo breve; Specializzazioni; Tecniche Interiori; vantaggio dell'Addestramento.
  3. **Combattimento**: armi impugnate/pronte con VA per colpire, danno, gittata, munizioni; armature e scudi con AR; tabella Stati/Ferite da segnare a mano; equipaggiamento nello zaino in elenco compatto.
  4. **Magia**: PM, scala di Potere applicabile (Taumaturgo / altri utilizzatori), livello massimo, incantesimi conosciuti per macrofamiglia con intestazione, lancio e tabella delle versioni accessibili. Per chi non ha magia il foglio 4 può saltare o mostrare Tecniche Interiori e note.
- Spazi vuoti deliberati per annotazioni a penna (PV attuali, munizioni consumate, Punti Eroe spesi): la scheda stampata vive al tavolo.

### 2.2 Digitale e stampa separate

Sì, è possibile e consigliato: **la stampa non è la vista digitale con un CSS diverso, è una vista dedicata**. Implementazione: una route `#/p/<id>/stampa` che renderizza la scheda dai soli dati calcolati (`calcolaScheda`) in un template HTML proprio (`src/ui/stampa.js` + `css/stampa.css`), senza wizard, riepilogo laterale o pulsanti. La vista digitale resta libera di evolvere senza toccare l'impaginazione, e viceversa: il layout di ogni foglio si può personalizzare a piacere. Anteprima nel browser con la stessa geometria della pagina (bordo tratteggiato dei 4 fogli) e pulsante Stampa che apre il dialogo del browser; il PDF lo fa il browser ("Salva come PDF").

### 2.3 Dettagli da decidere quando ci arriviamo

- Font e densità: quanto testo dei Talenti stampare (nome + prima frase? tutto?).
- Se il foglio 4 va stampato per i non taumaturghi.
- Logo/intestazione del gruppo, se ne avete uno.
- Versione "compatta" a 2 fogli per i PNG del master (più avanti).

## 3. Dipendenze e ordine complessivo

1. Avanzamento di livello (Prompt 6) e pacchetto avvia.bat / push / GitHub Pages.
2. Conferma di Davide sulla tabella dei livelli incantesimi.
3. Scheda stampabile a 4 fogli (non dipende dall'equipaggiamento: il foglio 3 parte con la sola sezione manuale e si riempie dopo).
4. Estrazione Armamenti (pilota, poi completa).
5. Equipaggiamento nella scheda ed effetti sui valori.
