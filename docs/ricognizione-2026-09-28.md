# Ricognizione del 28–29/09/2026: 19 risposte E&L e manuali del 28/09

Fonti:

- Doc «E&L – Risposte e correzioni approvate», sezione «Risposte ai 19 quesiti dell'app» (modificato il 29/09 alle 11:10 UTC). È la fonte della **decisione**.
- Manuali del 28/09, confronto in `docs/diff-manuali-2026-09-28.md`. Sono la fonte del **testo**.
- Controllo del 29/09 (le versioni successive al 28/09 13:30):
  - Armamenti 0.54, 16:59: KEP 808 e Colt Hammershot.
  - Giocatore 13:37: «minimo 1» anche nel §3.8, solo testo.
  - Equipaggiamento 13:37: tolta una riga dalla scheda standard (cosmetica).

Colonna «Stima»: piccola = dati e poche righe; media = motore e SD; grande = più moduli, SS compresa.

## Voci da recepire

| # | Voce | Fonte | Cosa cambia nell'app | Chiude | Stima |
|---|---|---|---|---|---|
| 1 | Anticipazione senza Addestramento Taumaturgo | E&L 1; Magia §12.3 | **Dati:** confermata la colonna «altri utilizzatori» con il −2 in più; il TODO in `regole.json → lancio.anticipazione` diventa fonte. **Motore:** Anticipazione Migliorata toglie solo il −2, la Prova di Potere resta (verifica in `src/lancio.js`). | A.39.1 | piccola |
| 2 | Carica dei contenitori Chroma | E&L 2; Magia §6 | **Dati:** `chroma.contenitore_nuovo` = acquistato pieno; TODO tolto. **SD:** alla voce di un contenitore trovato, campo dei PM attuali impostabile dal giocatore (0…capacità); la sessione parte da lì invece che dal pieno. | A.19 | media |
| 3 | Prove fisiche | E&L 3; Giocatore §5.18 | **Dati:** lista di `categorie_prove.fisiche` confermata, TODO tolto. **Motore:** verifica che le penalità «fisiche» (Immobilizzato, Rallentato, carico) non tocchino Potere né le Salvezze; test. | A.16 | piccola |
| 4 | Pesi mancanti e carico parziale | E&L 4; Giocatore §5.2.6; Equip. §1.6 | **Motore:** `calcolaCarico` segna il totale «parziale» se manca un peso. **SD:** «da definire» accanto agli oggetti senza peso; niente «nessuna penalità» con un totale parziale (livello «Ordinario» mostrato come «almeno»). | A.30 | piccola |
| 5 | Oltre il carico massimo | E&L 5; Giocatore §5.2.6 | **Dati:** `carico.livelli.oltre_il_massimo`: Movimento 0 Q, −2 alle Prove fisiche, nessuna penalità alle Salvezze. Forza da Lavoro (×40, spinta ×80) è già così. **Motore:** Movimento 0 in `valoriTavolo`. | A.31 | piccola |
| 6 | Spazzata | E&L 6; Giocatore §5.12 | **Dati:** TODO tolto, «adiacenti fra loro e tutti entro la portata». **Utility:** promemoria definitivo; Spazzata proposta anche senz'armi con Corpo a corpo (`senz_armi: true`); Migliorata −2. | A.27, A.42 | piccola |
| 7 | Sbilanciare | E&L 7; §5.12 | **Utility:** l'attaccante usa l'Abilità del mezzo dichiarato (senz'armi → Corpo a corpo, arma → la sua Abilità), non il migliore. Il pannello fa scegliere l'opposizione del bersaglio (Atletica o Difese). −4, −2 con Migliorato. **Dati:** TODO tolto. | A.28, A.41 | media |
| 8 | Disarmare | E&L 8; §5.12 | Come 7, con l'opposizione Corpo a corpo o Abilità dell'arma impugnata; l'oggetto cade nel Q del bersaglio. | A.28, A.41 | (con 7) |
| 9 | Incalzare | E&L 9; §5.5 | **Dati:** TODO tolto. **Utility:** Prova per colpire −4 contro le Difese, spinta 2 Q, nessun danno; Migliorato aggiunge il danno (già così: si toglie «provvisoria»). | A.24 | piccola |
| 10 | Mano non dominante | E&L 10; §5.7 | **Dati:** TODO tolto, fonte E&L 10. **Utility:** −4 salvo Ambidestro; con due armi solo la penalità della manovra (già così); Ambidestro non riduce la penalità delle due armi, Schermidore / Pistolero / Duellante sì (già nei Talenti: verifica). | A.23 | piccola |
| 11 | Magistrale e bonus fissi | E&L 11; §5.13, §1.6 | **Dati:** `magistrale` con le regole (bonus ordinari prima del moltiplicatore, «dopo l'AR» non moltiplicati, ×2 → ×3, ×3 resta, solo la prima applicazione); TODO tolto. **Utility:** nel risultato di «Attacca!» (ravvicinato e distanza) la riga del Magistrale dice che cosa si moltiplica e che vale solo la prima applicazione. | A.29 | piccola |
| 12 | Bonus di Caratteristica al danno; senz'armi 1d4 | E&L 12; Giocatore §5.13; Magia sez. 7 | **Dati:** `regole.json → danno_caratteristica`: fasce 1–5 → 0, 6–7 → +1, 8–9 → +2, 10 → +3; tetto per livello 1–7 +1, 8–14 +2, 15+ +3; Caratteristica = quella dell'Abilità dell'arma (FOR per guerra, corpo a corpo e senz'armi; DES per mischia, lancio, leggere; INT per medie), con l'eccezione Armi pesanti → INT; SAG per la magia. `senz_armi.danno` = 1d4. **Motore:** bonus nel danno di ogni arma (`calcolaEquipaggiamento`, con il livello), escluso chi ha una regola contraria (Danno calibrato). **SD, «Attacca!», «Lancia!», SS:** danno con il bonus e la sua voce. **Senz'armi:** 1d4 + bonus; Arti Marziali 1d6; Lottatore il suo dado; tolto il campo «danno senz'armi» e il suo avviso. Test: FOR 8 al 3° livello → +1. | A.22 | grande |
| 13 | Copertura nel ravvicinato | E&L 13; §5.8 | **Dati:** `attacco_ravvicinato.copertura` con −2 / −4, Totale blocca; Copertura Migliorata −4 / −6 (dal Talento del bersaglio, dichiarato). **Utility:** modificatore vero nel VA, non più promemoria. | A.25 | piccola |
| 14 | Superiorità numerica | E&L 14; §5.3 | **Dati:** `attacco_ravvicinato.superiorita_numerica`: 1–2 → 0, 3–5 → +1, 6–7 → +2, 8+ → +3. **Utility:** campo «attaccanti in ravvicinato contro il bersaglio» nel pannello corpo a corpo. | A.26 | piccola |
| 15 | Oggetti delle dotazioni senza scheda | E&L 15; Equip. 0.3 §4.2–4.3; Giocatore §2.16.29 | **Dati:** Binocolo (0,8 kg, 500 crediti) e Registratore audiovisivo (0,2 kg, 200) nella scheda della dotazione; gli altri «da definire». **Motore:** peso e prezzo mancanti non valgono 0 (carico parziale, voce 4); gli oggetti della dotazione non armamenti non si cedono (già così: verifica). | A.34 | piccola |
| 16 | Pistole corporative | E&L 16; §2.16.27; Armamenti §7.8–7.9 | **Dati:** `dotazioni.json → corporativi.abbinamenti`: pistola semiautomatica → HG10, Bolter 10, P500, Nemesis 100, Belliger, Ronin 25 AP; Freelance commerciale; Revolver commerciale senza nota (`corporativi.commerciali`). **Motore:** munizioni iniziali: il totale della Classe, la capacità del modello assegnato (già così per i fucili). | A.33 | piccola |
| 17 | Colpo Elementale: «Mod PS» | E&L 17; Magia §12.1–12.2, §13.1 | **Dati:** `meccanica` di Colpo Elementale: colpisce automaticamente (Parata e Schivata sì, Elusione no); PS per gli effetti secondari per elemento (Fuoco, Aria → Riflessi; Gelo, Fulmine → Tempra; Acqua, Terra → nessuna); una PS per tipo di effetto per bersaglio. **Utility:** nel risultato di «Lancia!». | A.39.2 | piccola |
| 18 | Rigenerazione | E&L 18; Magia §21.10, §12.4 | **Dati:** `meccanica.rituale` = procedura non definita. **Utility:** «Lancia!» la segnala come «procedura rituale non ancora definita» e non calcola costo né Prova. | A.39.3 | piccola |
| 19 | Ricarica di doppiette e fucili a pompa | E&L 19; Giocatore §5.1.1, §8.6.4 | **Dati:** `munizioni.json → ricarica`: modi `inserimento` (1 cartuccia per operazione; Ricarica Migliorata 3; doppiette, pompa ordinari e di base, archi e balestre) e `tamburo` (revolver: il tamburo in una operazione); M310 e SA SG2001 con caricatore amovibile. **Motore:** `eseguiRicarica` inserisce 1 o 3. **SD:** pulsante «Ricarica» con il numero inserito; Ricarica Rapida come promemoria (operazione gratuita, una per round). | A.37 | media |

### Differenze dei manuali non coperte dalle 19 risposte

Rimandate alla prossima sessione, salvo dove indicato.

| # | Voce | Fonte | Cosa cambia nell'app | Chiude | Stima |
|---|---|---|---|---|---|
| M1 | Conguaglio negativo restituito in crediti | Giocatore §2.16.29 (28/09) | **Motore:** `src/dotazioni.js`: se il valore ceduto supera il prezzo, la differenza torna in crediti (oggi si perde); TODO tolto. | A.35 | piccola |
| M2 | Movimento Tattico e Movimento Fluido si sommano, minimo 0 | Giocatore §5.2 | **Utility:** «Attacca!» a distanza somma le due riduzioni. | A.38.1 | piccola |
| M3 | Movimento Evasivo: almeno 1 Q percorso | Giocatore §5.2 | **Utility:** bersaglio «fermo» senza penalità del Movimento Evasivo. | A.38.7 | piccola |
| M4 | Carica oltre 12 Q fino alla Corsa massima | Giocatore §5.6 | **Dati e utility:** l'ultima fascia della Carica vale fino alla Corsa. | A.40 | piccola |
| M5 | Riserve integrate: solo per l'Artefatto | Magia sez. 6; Armamenti §7.5.1 | **Dati e testo:** già così (non usabili per i lanci); si toglie «nel frattempo». | A.18 | piccola |
| M6 | Prelievo dal Chroma Bianco: serve l'accesso alla magia | Magia sez. 6 | **Motore:** prelievo non ancora implementato; va fatto con la regola. | A.20 | media |
| M7 | A.38.2–A.38.6 | Giocatore §5.8–5.11 | Già così nell'app; «Bersaglio impegnato»: verificare Ferite e Affaticamento nella seconda Prova. | A.38 | piccola |
| M8 | Terrorizzato anche alle Salvezze durante lo Stato | Giocatore §5.18 | Già così. | A.17 | — |
| M9 | KEP 808 (pistola al plasma, cella da 10) e Colt Hammershot (revolver pesante, Capitol) | Armamenti 0.54 §7.8, §7.9, §7.20.5, §7.22 | **Dati:** due armi, una cella, prezzi; Specializzazioni Armi al Plasma e Pistole. Colt Hammershot nell'elenco delle pistole Capitol (§7.22). | — | media |

## Rimandate a lotti a parte

Manuale dell'Equipaggiamento 0.3, capitoli nuovi. Si estraggono a lotti come il Manuale degli Armamenti (`docs/equipaggiamento-lotti.md`). Qui si recepiscono solo Binocolo e Registratore audiovisivo (voce 15).

- cap. 2, Dotazioni personali: contenitori, illuminazione, abbigliamento, oggetti quotidiani;
- cap. 3, Esplorazione e sopravvivenza: accampamento, viveri, orientamento, corredo ambientale, protezioni ambientali;
- cap. 4, Comunicazione e rilevamento: comunicatori, ottiche e visori, rilevamento e sorveglianza;
- cap. 6, Equipaggiamento sanitario: kit, cartucce, UMC, dispositivi, diagnostica, farmaci. Si sovrappone al §7.19 degli Armamenti: da confrontare nel lotto.

## Incoerenze fra E&L e manuali

Nessuna di sostanza. Tre punti da annotare:

1. **Revolver.** E&L 19 dice «Il Revolver usa il tamburo» e non ne dà il costo. Per la ricarica vale la regola generale del §5.1.1: una operazione costa 1 AzP. Anche la scheda della Colt Hammershot (Armamenti 0.54) dice «Ricaricare il tamburo con munizioni pronte richiede 1 AzP». L'app tratta il revolver come «tamburo»: una operazione riempie il tamburo con munizioni pronte. Le doppiette e i fucili a pompa inseriscono invece una cartuccia per operazione. È una scelta, non una contraddizione; si segnala nel pacchetto.
2. **Caratteristica del bonus al danno.** Il §5.13 dice «FOR o DES secondo l'arma ravvicinata; DES o INT secondo l'arma a distanza» senza tabella. L'app usa la Caratteristica dell'Abilità dell'arma (Abilità, §4.3), con l'eccezione esplicita delle Armi pesanti (INT). Le coppie del manuale tornano tutte:
   - Armi da guerra e Corpo a corpo: FOR;
   - Armi da mischia: DES;
   - Armi da lancio e Armi leggere: DES;
   - Armi medie: INT.
   Da confermare con Davide come nuova domanda, con la regola applicata nel frattempo.
3. **Versione dell'Equipaggiamento.** E&L 15 cita l'Equipaggiamento «v0.3». Il Doc è intitolato 0.3; nel registro compariva ancora 0.1. Si aggiorna il registro.

## Esito (29/09)

Le voci 1–19 sono recepite: decisioni 44–61 di `docs/risposte-master.md`, test in
`tests/risposte-el-19.test.js`. Restano per una sessione successiva le voci M1–M9 e i lotti dell'Equipaggiamento.
Due scelte dell'app, da confermare con Davide (A.54, A.55 nel pacchetto per il Doc):
- il revolver a tamburo (una operazione riempie il tamburo);
- la Caratteristica del bonus al danno presa dall'Abilità dell'arma.
