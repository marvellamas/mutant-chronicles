# Lotto «personaggi» del 15 ottobre 2026 — A.159 (Morente) e A.158 (CyberArma)

Primo lotto dopo la ricognizione del 15/10 (`docs/diff-davide-2026-10-15.md`, lotti proposti 1 e 4).
Due risposte di Davide applicate: tutto quello che segue è nei dati, non nel codice.

Fonti: sezione 7 del Doc «per-davide.md» (blocchi «A.159 — Ferite, Morente e stabilizzazione: risposta
completa approvata» e «A.158 — CyberArma: risposta completa approvata»), Armamenti 0.62 §7.25 e §7.25.1,
Equipaggiamento 0.8 §10.9 e §10.13.1.

---

## A. Morente (A.159), in forma leggera

### Che cosa dice la risposta, e che cosa fa l'app

| Risposta (14/10) | Nell'app |
|---|---|
| Oltre Grave si entra in Morente: −8 e svenimento automatico | gradino «Oltre Grave: Morente», penalità presa da `ferite.oltre_penalita_come`, Stato Svenuto acceso all'ingresso (si toglie a mano) |
| Contatore pari alla COS intera del momento, fissato per l'episodio | `sessione.morente = { dal, iniziale, tolti? }`: si salva il **Round d'ingresso**, non un numero da decrementare |
| −1 per ogni Round intero trascorso | i Round che restano si calcolano sul Round corrente; nello scontro è quello della plancia |
| −1 per ogni **nuova** Ferita; il colpo d'ingresso lascia il contatore pieno | «Colpito» toglie 1 Round per Ferita solo a chi era **già** Morente (`feriteOltre`); fuori scontro c'è «−1 Round» |
| A 0 il personaggio muore | avviso «È morto (A.159) — decide il master»: nessun blocco, nessuna cancellazione |
| Una cura che stabilizza riporta a Grave e disattiva il contatore | «Stabilizza»: Ferite → Grave, contatore spento, nessuna cura concessa |
| Un nuovo episodio apre un contatore nuovo e pieno | rientrando oltre Grave il contatore riparte dal Round di allora |
| Stabilizzazione d'emergenza, Guarigione d'emergenza, Cartuccia Stabilizzante, UMC Automatica | **promemoria di solo testo** sotto il contatore (`ferite.morente.vie`) |
| Cartuccia Stabilizzante: 2.000 cr, MR, monouso | voce di catalogo in `sanitario.json`; peso, PS Integrità e PI non sono nella risposta e restano vuoti |

### Che cosa non fa (di proposito)

Niente Prove automatiche, niente procedura guidata della Stabilizzazione d'emergenza, niente conteggio
delle applicazioni del kit, dei PM o delle cartucce, nessun intervento automatico dell'UMC, nessuna Stasi
che sospende il contatore da sola, nessun blocco a 0. Sono tutte cose che il tavolo fa in un attimo a voce
e che l'app rallenterebbe (CLAUDE.md: «l'app aiuta il tavolo e non lo rallenta»). I **nemici** restano come
oggi: oltre Grave è la morte, A.164 aperta.

### Dove sta

- dati: `data/regole.json` → `ferite.morente` (nome, Stato, Caratteristica del contatore, quanto cala per
  Round e per Ferita, avviso a 0, vie, note); `ferite.oltre` passa da «Morte» a «Morente»;
- motore: `src/morente.js` (puro), con le operazioni in `src/sessione.js`
  (`stabilizzaMorente`, `scalaMorente`, contatore aperto e chiuso da `allineaSessione`);
- scheda: riquadro Morente sotto le Ferite (`src/ui/tab.js` → `riquadroMorente`);
- plancia: «Morente — N Round» nella mini-scheda del PG, sul Round dello scontro (`src/ui/tavolo.js`);
- «Colpito»: `src/danno.js` distingue Morente (PG) da morte (nemici); «Annulla ultimo colpo» rimette il
  contatore di prima;
- validatore: `src/validate.js` controlla il blocco; test: `tests/morente.test.js` (12).

---

## B. CyberArma (A.158) e Custodia del Silenzio

### Le due configurazioni

| | Modello originale | Con Batteria Verde |
|---|---|---|
| Grado mistico / SnT | I / 1 | II / 2 (**una volta sola**, non 1 + 2) |
| Qualità fisica | Non comune | Non comune |
| PS Integrità / PI | 12 / 4 | 12 / 4 |
| Peso | 0,5 kg | 0,7 kg |
| Reperibilità | Epica | Epica |
| Prezzo | **nessuno** (non disponibile, non zero) | **nessuno** |
| Riserva | nessuna | 5 cariche Verdi, Esclusiva, una per attivazione |
| Profilo | Armi da mischia, 1 mano, portata 1 Q, FOR 3, 1d8 Magico | uguale |

Una sola voce di inventario, visibile fra le Armi e fra gli Artefatti (§7.25.1, Equipaggiamento §10.9): la
voce sta in `armi.json`, il blocco di Artefatto in `artefatti.json` → `artefatti_catalogo`, per riferimento.

### Chi la usa (dati, non codice)

| Classe | Costo | Durata | Altro |
|---|---|---|---|
| Custode | 1 PM personale (o 1 carica) | 15 Round | +1 al danno, evocazione nell'Azione del primo attacco |
| Tecnomante | 2 PM personali (o 1 carica) | 10 Round | 1d8 Magico, senza Concentrazione, nessun bonus al VA |
| Altre Classi | **solo con la batteria**, 1 carica | 10 Round | **−2 al VA** per colpire, cumulativo |

Il modello originale senza batteria avvisa la Classe che non lo può usare: è un avviso, non un blocco.
«Attiva» scala il costo giusto e fa partire i Round; la scheda e «Attacca!» mostrano costo e Round che
restano; «Termina» spegne (il costo resta pagato). Costruzione e modifica (punti 6 e 7 della risposta) sono
**solo testo** nella voce: nessuna procedura guidata.

### Custodia del Silenzio

Fra i contenitori: cilindro di cuoio, 0,3 kg, SnT 0, nessun costo in PM; chiusa e integra scherma le
emanazioni di Corruzione 1 della CyberArma disattivata, aprirla la fa cessare. Non è indistruttibile. Prezzo
e Reperibilità non sono nei manuali: restano vuoti. Lo stato «chiuso / aperto» e gli altri due Contenitori
del Silenzio (Zaino, Cofanetto) restano fuori: **A.163**.

### Dove sta

- lotto: `tools/lotti/lotto_cyberarma_a158.mjs` (anche `--controlla`);
- dati: `data/equipaggiamento/armi.json`, `artefatti.json`, `dotazioni_personali.json`;
- motore: `src/attivazione-arma.js` (puro), operazioni in `src/sessione.js`
  (`attivaArmaSessione`, `terminaArmaSessione`);
- interfaccia: riga dell'attivazione nelle armi del Combattimento (`src/ui/tab.js`) e accanto all'arma in
  «Attacca!» (`src/ui/attacco.js`);
- test: `tests/cyberarma-a158.test.js` (7).

---

## Domanda nuova

**A.165 — Famiglia, Specializzazione e Manovre della CyberArma.** Né il §7.25 né la A.158 dicono a quale
famiglia d'arma appartiene. L'invariante dell'app (A.13: ogni arma del catalogo ha una Specializzazione) ne
vuole una. *Nel frattempo:* registrata fra le **Spade**, con le sole Manovre generali e un `TODO(Davide)`
nel lotto. Se la famiglia è un'altra cambiano il +1 VA e il +1 al danno della Specializzazione (§8.8.1).

## Restano fuori da questo lotto

Le altre otto risposte del 15/10 (A.115, A.126, A.133, A.126–A.138, A.113, A.145, A.146, A.147), i quattro
manuali nuovi e i lotti 2, 3 e 5–8 proposti nella ricognizione. A.160–A.164 restano aperte.
