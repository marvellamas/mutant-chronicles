# Pacchetto per il Doc «per-davide.md» — 16 ottobre 2026 (lotto «mappa e plancia»)

Segue i due pacchetti del 15/10 (`docs/pacchetto-per-davide-2026-10-15.md` e `…-15-sera.md`). Questo sposta
**sette voci dalla sezione 3 alle «Risolte»** e corregge una numerazione.

Lo applica Cowork o Marcello, seguendo `docs/protocollo-davide.md` §5. Claude Code non scrive nei Google Doc.

- **Correzione di numerazione:** la domanda aperta il 15/10 sera sulla CyberArma era numerata **A.165**, che
  nel Doc è già usata (A.109 «sospesa»). Va rinumerata **A.166**. Le prossime domande partono da **A.167**.
- **Sette voci da spostare dalla sezione 3 («Risposte ricevute, in implementazione») alle «Risolte»:**
  A.113, A.115, A.126 (con l'integrativa A.126–A.138), A.133, A.145, A.146, A.147.
- **Nessuna domanda nuova.** Restano aperte A.160–A.164 e A.166.

Dettaglio di che cosa è stato fatto: `docs/lotto-mappa-plancia-2026-10-16.md`.

---

```
*** DOC per-davide.md — voce A.165 → A.166
*** AZIONE: rinumera la voce aperta sulla CyberArma (era A.165, numero già usato dalla A.109 sospesa).
*** Il testo resta quello del pacchetto del 15/10 sera, con il solo numero cambiato in A.166.
```

---

```
*** DOC per-davide.md — voci A.113, A.115, A.126, A.133, A.145, A.146, A.147
*** AZIONE: spostale dalla sezione 3 alle «Risolte», sostituendo la riga con il testo qui sotto

--- TESTO ---
A.113 — Veicoli: permessi, sincronizzazione e denominazioni. RISOLTA (risposta approvata il 15/10/2026, applicata nell’app il 16/10/2026). I permessi sono nei dati: il Direttore modifica tutti i veicoli della campagna, compresi quelli personali dei personaggi, e la proprietà resta assegnata al personaggio. Senza collegamento al server il veicolo condiviso non sparisce più dalla scheda: si consulta in sola lettura nell’ultima copia ricevuta, con la data, la revisione, il proprietario e il conducente di allora; la copia viaggia nel file del personaggio accanto al riferimento e si aggiorna da sola ogni volta che la scheda legge o scrive il registro. Le tre denominazioni ufficiali (Corpo principale, Propulsione, Motore) erano già quelle in uso e sono ora verificate dai controlli automatici.

A.115 — Capacità specifiche dei nemici. RISOLTA (risposta approvata il 15/10/2026, applicata nell’app il 16/10/2026). La mini-scheda del nemico mostra la descrizione completa della capacità e, quando il profilo li dà, i parametri della risoluzione: Prova richiesta, costo in Azioni, risorsa consumata, limite d’uso e l’indicazione «passiva». Dove i dati mancano resta il solo testo: non si assegnano costi, Prove o effetti per analogia, e una capacità non è passiva finché il profilo non lo dichiara. Con un limite d’uso numerico compare il contatore degli usi rimasti con «Usa» e con l’annullamento; a zero l’app avvisa e lascia comunque usare la capacità, perché decide il Direttore, e i limiti «per Round» si azzerano quando passa il Round.

A.126 — Ingombro delle creature e campo Spazio. RISOLTA (risposta approvata il 15/10/2026, con l’integrativa A.126–A.138 sull’origine dei coni, applicate nell’app il 16/10/2026). Il profilo dei nemici ha il campo Spazio in Q (1 Q, 2 × 2 Q, 3 × 3 Q), che si prende dal profilo e non si deduce dalla Taglia; la pedina sulla mappa usa quello e il passaggio si verifica sull’ingombro effettivo. Un profilo senza il campo tiene il comportamento di prima, quindi nessun nemico già scritto cambia. «Crea nemico» scrive lo Spazio nel profilo invece che fra le capacità, e la mini-scheda lo mostra accanto a volo e Taglia. Quanto all’integrativa: il cono di una creatura che occupa più di un Q parte dal centro di un quadretto periferico sul lato dell’emissione, scelto con un tocco fra quelli di quel lato, e i quadretti occupati dalla creatura restano esclusi dal suo cono; per le creature di 1 × 1 Q non cambia nulla.

A.133 — Portata delle creature grandi. RISOLTA (risposta approvata il 15/10/2026, applicata nell’app il 16/10/2026). L’app misurava già la portata attorno all’ingombro e non dal centro della pedina: la regola è ora scritta nei dati e verificata dai controlli automatici. Una creatura di 3 × 3 Q con portata 1 Q raggiunge chi le sta attorno e non chi si trova a 2 Q dal bordo; occupare 2 × 2 o 3 × 3 Q non porta la portata a 2 o 3 Q. Zone di controllo e Attacchi di Opportunità seguono le normali condizioni e, come ogni calcolo automatico della mappa, restano spenti quando è attiva la «Mappa semplice».

A.145 — Azioni sui veicoli: regole generali e categorie. RISOLTA (risposta approvata il 15/10/2026, applicata nell’app il 16/10/2026). La tabella approvata è consultabile nella scheda del veicolo e nella mini-scheda della plancia, con le righe generali e quelle di auto e moto, moto, imbarcazioni, remi, vela, velivoli atmosferici e astronavi. È un promemoria da leggere: i costi sono testo e l’app non conta le Azioni al posto del tavolo.

A.146 — Veicoli e Attacchi di Opportunità. RISOLTA (risposta approvata il 15/10/2026, applicata nell’app il 16/10/2026). La regola è registrata nei dati e richiamata da una riga della tabella delle azioni sui veicoli. La mappa non propone l’Attacco di Opportunità quando un mezzo esce dalla portata di un nemico: le condizioni dipendono dal tavolo (bersaglio esposto, Copertura, arma pronta del conducente) e l’app non le decide. Il veicolo non possiede una zona di controllo propria.

A.147 — Curve, rotazioni e posizionamento a 45°. RISOLTA (risposta approvata il 15/10/2026, applicata nell’app il 16/10/2026). Sulla mappa il veicolo si gira di 45° per volta, cioè negli otto orientamenti richiesti, anche in diagonale, e li mantiene; con il tasto Maiusc resta disponibile un passo fine per l’orientamento libero scelto dal Direttore. Il controllo del posizionamento e del passaggio considera l’ingombro nell’orientamento effettivo, compresi quelli diagonali, e una rotazione che porterebbe il mezzo su un muro o su un altro pezzo non viene eseguita. Girare non consuma quadretti: Sterzata stretta, Inversione rapida e rotazione sul posto, con i loro costi e le loro Prove, sono un promemoria nella scheda del veicolo e nella plancia, che il Direttore applica quando serve.
```

---

## Nota per Marcello (non va nel Doc)

Il veicolo di Pablo Zaion non è stato toccato: quando aprirà la scheda, la tab Veicoli aggiungerà da sola
l'ultima copia del record `veimuu14mqa0` (ASA Scout MK4, revisione 16) accanto al riferimento, per poterlo
consultare anche a server spento. Il formato del file resta 8.
