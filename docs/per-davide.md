# Per Davide — domande aperte ed errata dei manuali

Aggiornato al 26 settembre 2026. Questo è l'unico elenco da tenere d'occhio: quando una voce viene risolta, la risposta va in `docs/risposte-master.md` e la voce sparisce da qui.

Le risposte già date (Esploratore, minimo 1 incantesimi, quote per macrofamiglia, incantesimi liberi di qualunque famiglia, tabella dei livelli incantesimi, dadi massimizzati al 1° livello) sono applicate e non compaiono più.

## A. Domande aperte (l'app usa un'ipotesi provvisoria finché non rispondi)

1. **Descrizione delle sei Caratteristiche.** Il manuale non le descrive da nessuna parte. Servono 2–4 righe per Forza, Costituzione, Destrezza, Intelligenza, Saggezza, Carisma: vanno nei tooltip. Nel frattempo il tooltip mostra le Abilità e la Salvezza collegate.

2. **Talenti di magia: schede mancanti.** Il §8.6.8 del Manuale del Giocatore dice di consultare "le rispettive schede" nel Manuale della Magia, ma lì questi Talenti sono soltanto citati dentro le regole, senza scheda. Per ciascuno servono: tipo (passivo/attivo), prerequisiti, quante volte si può prendere, testo. Sono 12: Usufruitore di Magia, Potenziale Mistico Migliorato, Incrementare Incantesimi, Lancio in Combattimento, Focalizzazione Migliorata, Contromagia, Contromagia Migliorata, Incantesimi da Lancio, Conversione Migliorata, Recupero Meditativo, Meditazione Migliorata, Meditazione Estesa. Nell'app sono marcati "provvisori" e chi li sceglie vede un avviso.

3. **Potenziale Mistico Migliorato vale anche per i Taumaturghi?** Il Manuale della Magia lo descrive in relazione a Usufruitore di Magia. L'app oggi lo applica solo a chi ha Usufruitore; se vale anche per l'Addestramento Taumaturgo (alzando la tabella I→3 … VI→18), dillo.

4. **Tipo di tre Talenti Liberi.** Attivazione Tempestiva, Risorse Interiori e Tecniche Interiori Supplementari sono intestati solo "Talento Libero", senza "Passivo" o "Attivo" come tutti gli altri. Quale sono?

5. **Durata di tre Tecniche Interiori.** Le schede di Vipera dal Cappuccio, Presa dell'Anima e Contraccolpo Interiore non indicano la durata.

6. **Equipaggiamento iniziale (§2.16).** "Verrà integrato successivamente". Finché non esiste, l'inserimento nell'app è manuale (voce per voce). Quando lo scrivi, dicci la forma (lista fissa per Addestramento? budget in denaro? scelte guidate?) prima di impaginarlo: cambia il passo del wizard.

## B. Da correggere nella prossima edizione dei manuali

Sono le cose che hai già deciso a voce o che sono errori evidenti: l'app segue la tua decisione, ma il testo stampato dice ancora un'altra cosa e prima o poi qualcuno al tavolo lo aprirà.

- **Giocatore §2.12 e §3.3**: al 1° livello sono massimizzati sia i PV sia i PM (il testo massimizza solo i PV).
- **Magia, sezione 1**: il livello massimo degli incantesimi non è "3 × Gradi" ma la tua tabella I→3, II→8, III→11, IV→14, V→17, VI→18.
- **Giocatore §2.10, §3.8 e Magia sez. 1**: aggiungere "minimo 1" a "2 + Mod INT incantesimi".
- **Giocatore §3.5.2, Esploratore**: assegnare i Talenti a scelta alle Specializzazioni (Terrestre: Segni di Passaggio, Adattamento Estremo; Spaziale: Mappa Mentale, Rotta Alternativa; Comune: Avanguardia).
- **Giocatore §8.6, Attivazione Tempestiva**: sta prima del §8.6.1, fuori da ogni sottosezione, con un'intestazione diversa dagli altri.
- **Magia, sezione 1**: la frase "con i cinque Talenti liberi ordinari, Usufruitore più quattro miglioramenti consentono il livello massimo 15" confonde: i Talenti Liberi sono nove (§8.6) e Potenziale Mistico si prende fino a cinque volte. Riformulare come esempio, non come regola.
- **Giocatore §3.5.3, Bersaglio Designato**: impaginazione rotta nel PDF (il nome del Talento finisce dentro una frase).
- **Giocatore §3.2**: dice che ogni Classe ha due Talenti per Specializzazione e uno Comune; l'Esploratore non li assegnava (vedi sopra).

## C. Da rileggere (testi scritti da noi, non dal manuale)

- **Promemoria degli Stati (§5.18)**: nella scheda digitale ogni Stato ha una riga di riassunto degli effetti, scritta da noi. Sono 11 righe: leggile e correggi quelle che non ti tornano. Nell'app sono marcate "(riassunto, non testo del manuale)".
- **Talenti nella stampa**: il foglio 2 stampa solo la prima frase di ogni Talento. Se preferisci un riassunto tuo per ciascuno, si può aggiungere un campo apposta.

## D. Manuali che l'app aspetta

- Manuale degli Equipaggiamenti e Manuale dei Veicoli (in stesura): diversi Talenti li citano. Quando esistono, ce li passi come PDF nella cartella `Manuali/`.
- Manuale degli Armamenti v0.50: lo stiamo estraendo a lotti. Se pubblichi una v0.51 prima che abbiamo finito, avvisaci: le tabelle cambiate vanno ri-estratte.

## Come ci rispondi

Come preferisci: a voce a Marcello, o direttamente nei file `data/*.json` (il README spiega come). Ogni risposta viene registrata con la data in `docs/risposte-master.md`, che vale più del manuale in caso di conflitto.
