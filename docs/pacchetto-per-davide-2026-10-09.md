# Pacchetto per il Doc «per-davide.md» — 9 ottobre 2026

Da applicare nel Google Doc «per-davide.md» (`1Jg5rqbBtcHGE1E10xYElO_qCDCwh8K87LAInovtpF6A`), da Cowork o da Marcello,
secondo `docs/protocollo-davide.md` §5. Non si incolla nel repo: il repo si aggiorna scaricando il Doc alla sessione
successiva.

Fonte:
- l'«Aggiornamento cumulativo — risposte tecniche approvate» di Davide dell'08/10 (E&L e sezione 7 del Doc);
- decisioni 139–155 di `docs/risposte-master.md`;
- lotti in `docs/diff-davide-2026-10-08.md`;
- il lotto «mappa» applicato il 09/10.

Riepilogo:
- **Fra le Risolte (sezione 6):**
  - le risposte della mappa: A.137, A.138, A.139, A.140, A.144 (con la A.141), A.142, A.143, A.148, A.149, A.150;
  - la A.112.
- **In implementazione (sezione 3):** A.135, A.136, A.109, A.111, A.122, A.20, A.35.
- **Rinviate, con una riga, restano nella sezione 2:** A.113, A.115, A.126, A.133, A.145, A.146, A.147.
- **Una domanda nuova:** A.151, i dati dei carichini.

---

```
*** DOC per-davide.md — voce A.137
*** AZIONE: sposta la voce A.137 nella sezione 6

--- TESTO ---
A.137 — Raggio di un’Area sulla griglia: a quadretti, con la diagonale a 1 Q (raggio 1 = 3 × 3 Q, 2 = 5 × 5, 3 = 7 × 7). Era già così nell’app; confermato il 09/10.
```

```
*** DOC per-davide.md — voce A.138
*** AZIONE: sposta la voce A.138 nella sezione 6

--- TESTO ---
A.138 — Forma del Cono: il cono parte dal centro del quadretto di chi lo usa e si allarga da zero fino all’ampiezza finale; un quadretto è colpito se è coperto per almeno metà; il quadretto d’origine è escluso. Implementata il 09/10. Resta da raccordare l’origine per le creature più grandi di un quadretto, insieme alle taglie (A.126, A.133).
```

```
*** DOC per-davide.md — voce A.139
*** AZIONE: sposta la voce A.139 nella sezione 6

--- TESTO ---
A.139 — Porta «adiacente» in diagonale: sì, anche dalla diagonale se la porta è raggiungibile dal proprio lato, 1 AzP e una mano libera, mai attraverso una parete. Era già così nell’app; confermato il 09/10.
```

```
*** DOC per-davide.md — voce A.140
*** AZIONE: sposta la voce A.140 nella sezione 6

--- TESTO ---
A.140 — Copertura sulla mappa: cinque linee dal centro del quadretto di chi attacca al centro e ai quattro angoli del bersaglio; 0 bloccate nessuna, 1–2 Leggera, 3–4 Media, 5 Totale; il solo contatto con un angolo non blocca; il Direttore corregge per altezza e postura. Era già così nell’app; confermato il 09/10. La tabella automatica per tipo e altezza dell’ostacolo resta rinviata, come hai indicato.
```

```
*** DOC per-davide.md — voce A.144
*** AZIONE: sposta la voce A.144 nella sezione 6

--- TESTO ---
A.144 (con la A.141) — Creature in mezzo alla linea di tiro: una creatura interposta dà solo −2, una volta sola qualunque sia il numero, senza seconda Prova; il bersaglio ingaggiato resta al §5.10 (−4 e seconda Prova) e la stessa creatura non conta due volte. Implementata il 09/10: la linea di tiro della mappa propone «Creatura interposta» nel pannello «Attacca!».
```

```
*** DOC per-davide.md — voce A.142
*** AZIONE: sposta la voce A.142 nella sezione 6

--- TESTO ---
A.142 — Fin dove vedono i PG: in piena luce nessun limite fisso, in Penombra 10 Q, con Luce scarsa 5 Q, al buio completo nulla oltre la propria pedina; conta la luce della zona osservata. Implementata il 09/10 nella nebbia automatica della mappa.
```

```
*** DOC per-davide.md — voce A.143
*** AZIONE: sposta la voce A.143 nella sezione 6

--- TESTO ---
A.143 — Visione notturna e nebbia della mappa: Visione notturna 80 Q in penombra e luce scarsa, Visione termica 40 Q anche al buio, Vista Felina 20 Q nel buio naturale; quando sono attivi aprono la nebbia entro la loro portata, pareti e porte chiuse li fermano. Implementata il 09/10: il Direttore li accende sulla pedina del PG («Sensi speciali…»).
```

```
*** DOC per-davide.md — voce A.148
*** AZIONE: sposta la voce A.148 nella sezione 6

--- TESTO ---
A.148 — Copertura verso e da un token in volo: Copertura e creature interposte valgono anche in volo quando proteggono davvero dalla traiettoria; finché non ci sono le altezze l’app le propone come a terra e il Direttore le corregge. Implementata il 09/10.
```

```
*** DOC per-davide.md — voce A.149
*** AZIONE: sposta la voce A.149 nella sezione 6

--- TESTO ---
A.149 — La quota conta per la portata: la distanza è la maggiore fra quella orizzontale e la differenza di quota (diagonale 1 Q); salire da dentro a fuori portata può provocare un Attacco di Opportunità. Era già così nell’app; confermato il 09/10.
```

```
*** DOC per-davide.md — voce A.150
*** AZIONE: sposta la voce A.150 nella sezione 6

--- TESTO ---
A.150 — Un token in volo si vede da lontano: no, valgono le regole dei bersagli a terra (luce, sensi, ostacoli); il Direttore può rivelarlo a mano. Implementata il 09/10.
```

```
*** DOC per-davide.md — voce A.112
*** AZIONE: sposta la voce A.112 nella sezione 6

--- TESTO ---
A.112 — Artefatti del gruppo, residui: confermati i valori dei file di Lucas e Dimitri (Guanti 10, Pietra della Vigilanza 10, due Batterie Matrice da 10, quattro Schegge da 5), artefatti carichi. Nessuna correzione; chiusa il 09/10.
```

```
*** DOC per-davide.md — sezione 3
*** AZIONE: aggiungi in fondo alla sezione 3 (e togli dalla sezione 2 la voce A.135)

--- TESTO ---
A.135 — Ricarica delle armi e carichini. In implementazione. Nel frattempo l’app riempie ancora il tamburo dei revolver in 1 AzP e inserisce 1 cartuccia per AzP in doppiette e serbatoi (3 con Ricarica Migliorata); i carichini arriveranno nel catalogo (per i loro dati vedi la A.151).
```

```
*** DOC per-davide.md — sezione 3
*** AZIONE: aggiungi in fondo alla sezione 3 (e togli dalla sezione 2 la voce A.136)

--- TESTO ---
A.136 — Corsa o Scatto dopo un Passo già cominciato. Sulla mappa è già così dal 09/10 (il Passo cominciato diventa Corsa o Scatto, con i quadretti fatti contati). In implementazione la Prova facoltativa di Atletica con la tabella degli esiti nel pannello «Attacca!»: nel frattempo valgono le penalità senza Prova (Corsa −2/−2, Scatto −6/−4).
```

```
*** DOC per-davide.md — sezione 3
*** AZIONE: aggiungi in fondo alla sezione 3 (e togli dalla sezione 2 la voce A.109)

--- TESTO ---
A.109 — Anticipazione, i 32 aspetti. In implementazione con la regola comune (un solo aspetto, un gradino, PM base raddoppiati, Prova di Potere obbligatoria di una categoria più difficile). Nel frattempo i 32 aspetti restano «da definire al tavolo».
```

```
*** DOC per-davide.md — sezione 3
*** AZIONE: aggiungi in fondo alla sezione 3 (e togli dalla sezione 2 la voce A.111)

--- TESTO ---
A.111 — Pablo Zaion. La perdita di 2 UMN fatta per prova si toglie dal suo file, con una nota, senza rimozioni o recuperi fittizi: lo fa Marcello sul file del personaggio. La regola generale sui recuperi pregressi resta in implementazione.
```

```
*** DOC per-davide.md — sezione 3
*** AZIONE: aggiungi in fondo alla sezione 3 (e togli dalla sezione 2 la voce A.122 «Aiuto-master»)

--- TESTO ---
A.122 — Aiuto-master. In implementazione: il Direttore lo assegna e lo revoca a un tablet; muove il PG del turno attivo entro i limiti normali, vede la mappa dei giocatori, non cambia schede, risorse, Iniziativa o scena. Nel frattempo i tablet muovono solo il proprio PG.
```

```
*** DOC per-davide.md — sezione 3
*** AZIONE: aggiungi in fondo alla sezione 3 (e togli dalla sezione 1 la voce A.20)

--- TESTO ---
A.20 — Chroma bianco. Il Chroma bianco resta riservato a chi ha accesso alla magia. Da verificare nell’app con il prossimo lavoro sulla magia.
```

```
*** DOC per-davide.md — sezione 3
*** AZIONE: aggiungi in fondo alla sezione 3 (e togli dalla sezione 2 la voce A.35)

--- TESTO ---
A.35 — Acquisti iniziali, valore ceduto maggiore del prezzo. L’eccedenza torna in crediti. In implementazione: nel frattempo l’app la considera persa.
```

```
*** DOC per-davide.md — voce A.113
*** AZIONE: aggiungi la riga alla voce A.113

--- TESTO ---
Rinviata da te l’08/10 (con bestiario e veicoli): resta aperta, l’app tiene l’ipotesi qui sopra.
```

```
*** DOC per-davide.md — voce A.115
*** AZIONE: aggiungi la riga alla voce A.115

--- TESTO ---
Rinviata da te l’08/10 (con bestiario e veicoli): resta aperta, l’app tiene l’ipotesi qui sopra.
```

```
*** DOC per-davide.md — voce A.126
*** AZIONE: aggiungi la riga alla voce A.126

--- TESTO ---
Rinviata da te l’08/10 (con bestiario e veicoli): resta aperta, l’app tiene l’ipotesi qui sopra. Con le taglie andrà raccordata anche l’origine del cono per le creature grandi (A.138).
```

```
*** DOC per-davide.md — voce A.133
*** AZIONE: aggiungi la riga alla voce A.133

--- TESTO ---
Rinviata da te l’08/10 (con bestiario e veicoli): resta aperta, l’app tiene l’ipotesi qui sopra.
```

```
*** DOC per-davide.md — voce A.145
*** AZIONE: aggiungi la riga alla voce A.145

--- TESTO ---
Rinviata da te l’08/10 (con bestiario e veicoli): resta aperta, l’app tiene l’ipotesi qui sopra.
```

```
*** DOC per-davide.md — voce A.146
*** AZIONE: aggiungi la riga alla voce A.146

--- TESTO ---
Rinviata da te l’08/10 (con bestiario e veicoli): resta aperta, l’app tiene l’ipotesi qui sopra.
```

```
*** DOC per-davide.md — voce A.147
*** AZIONE: aggiungi la riga alla voce A.147

--- TESTO ---
Rinviata da te l’08/10 (con bestiario e veicoli): resta aperta, l’app tiene l’ipotesi qui sopra.
```

```
*** DOC per-davide.md — sezione 2
*** AZIONE: aggiungi in fondo alla sezione 2

--- TESTO ---
A.151 — Dati dei carichini (A.135). La tua risposta definisce la Ricarica per Tamburo (6 colpi, 100 crediti a vuoto) e la Ricarica per Serbatoio (6 colpi, 150 crediti a vuoto), ma dice che peso, Qualità, Integrità e Reperibilità non sono stati definiti. Quali sono? Nel frattempo l’app li mette nel catalogo senza quei valori: non pesano sul carico e non hanno punti Integrità.
```
