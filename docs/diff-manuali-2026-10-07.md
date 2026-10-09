# Manuali e risposte del 06/10/2026: differenze (controllo del 07/10)

Controllo di inizio sessione del 7 ottobre 2026 (branch `controllo-manuali-0710`). Cambiati quattro Doc, invariati
gli altri del registro (`docs/manuali-drive.md`). Testi salvati: `docs/manuali-txt/giocatore.md`,
`docs/manuali-txt/armamenti.md`, `docs/risposte-master-2026-09-26.md` (E&L), `docs/per-davide.md`.

Applicato nei dati solo ciò che è piccolo e chiaro (lotto `tools/lotti/lotto_armamenti_059.mjs`, `regole.json` per
A.110 e A.120); il resto è nei lotti R1–R6 qui sotto. Decisioni 119–133 in `docs/risposte-master.md`; pacchetto per il
Doc in `docs/pacchetto-per-davide-2026-10-07.md`.

Classi: **regola** (tocca calcolo o dati) · **testo** (descrizioni e note, solo testo) · **cosmetica** (nessuna azione).

| Documento | Prima | Ora | regola | testo | cosmetica |
|---|---|---|---|---|---|
| Giocatore | 0.45 (03/10 19:16) | 0.46 (06/10 18:20) | 1 | 2 | 1 |
| Armamenti | 0.58 (02/10 16:46) | 0.59 (06/10 18:32) | 6 | 3 | 2 |
| E&L | 05/10 01:07 | 06/10 17:23 | 15 risposte | 2 | — |
| per-davide.md | 06/10 10:27 | 07/10 05:26 | — | — | intestazione |

## Manuale del Giocatore 0.46

| Paragrafo | Classe | Cambiamento | Applicato |
|---|---|---|---|
| Frontespizio | cosmetica | «Edizione consultabile 0.45» → **0.46**. | `versione_manuale` di `abilita.json`, `specializzazioni.json`, `regole.json` |
| §4.4, Armi medie | testo | «fucili a pompa» → «fucili a pallini e doppiette». | `abilita.json` (descrizione) |
| §5.10, Tiro Rapido | regola | Nella famiglia Fucili a Pallini e Doppiette il funzionamento decide le modalità: a pompa solo Colpo Singolo, semiautomatici anche Tiro Rapido, automatici anche Raffica Breve (mai Media o Lunga); HD14M, SA SG2001, Airbrush semiautomatici, Mandible automatico; doppietta: due bersagli col Tiro Rapido, uno col Doppio Colpo. | `regole.json` → nota del Tiro Rapido; le modalità stanno nelle schede delle armi (vedi Armamenti) |
| §8.8.1, tabella | testo | Specializzazione «Fucili a Pompa e Doppiette» → **«Fucili a Pallini e Doppiette»**. | `specializzazioni.json` → `nome` e `ambito` (l'id resta `specializzazione-fucili-a-pompa-e-doppiette`: i PG salvati non cambiano) |

## Manuale degli Armamenti 0.59

| Paragrafo | Classe | Cambiamento | Applicato |
|---|---|---|---|
| Frontespizio, titolo del Doc | cosmetica | «Edizione 0.58» → **0.59**; il Doc si chiama «Manuale degli Armamenti v0.59». | — |
| §7.1.1, catalogo commerciale | regola | FOR: Ascia bipenne **7 → 6**, Arma inastata pesante **7 → 6**. | `armi.json` |
| §7.1.6, Requisito di Forza | testo | Nuovo capoverso con le fasce orientative dei requisiti (FOR 2–3 leggere, 4–5 ordinarie e fucili, 6 impegnative e molte pesanti portatili, 7–8 eccezionali); fa fede la scheda. | nessun dato: la regola di calcolo non cambia |
| §7.7, Specializzazioni dei modelli a distanza | regola | Mandible e Airbrush escono dalle Carabine ed entrano nei Fucili a Pallini e Doppiette; nuovo capoverso sulla famiglia (Armi medie, cartucce a pallini, AC 2, Sbilanciante, modalità per funzionamento; ogni cartuccia sparata applica il proprio AC). | `armi_distanza_corporative.json` (Mandible, Airbrush), `armi_distanza.json` (nota del Fucile a pompa) |
| §7.8, Alleanza | regola | FOR: KEP 808 **6 → 5**, Lanciagranate Deathlock Drum **8 → 7**, Deathlock Drum **8 → 7**, Nimrod Autocannon **9 → 8**. | `armi_distanza_corporative.json` |
| §7.8, Bauhaus e Cybertronic | regola + testo | Tabelle «Fucili a pompa» → **«Fucili a pallini»**; HG14 FOR **6 → 5**; note: HD14M e SA SG2001 «semiautomatico, Colpo Singolo e Tiro Rapido», HG14 «a pompa, Colpo Singolo» (prima «Eccezione: può eseguire Tiro Rapido»). | `famiglia` e `note_manuale` delle tre voci |
| §7.8, Capitol | regola + testo | Colt Hammershot FOR **7 → 5**; Improved M89 FOR **8 → 7**; tabella «Fucili a pompa e doppiette» → **«Fucili a pallini e doppiette»**. | voci e `famiglia` delle cinque voci Capitol |
| §7.8, Imperial | regola | Mandible AC **1 → 2**, modalità **S RB TR** (prima S TR), «Fucile a pallini automatico», Sbilanciante; Charger FOR **9 → 8**; Lanciarazzi Southpaw FOR **8 → 7**. | voci; Sbilanciante copiato dall'HD14M |
| §7.8, Mishima | regola | Airbrush AC **1 → 2**, «fucile a pallini semiautomatico», Sbilanciante. | voce |
| §7.20.9, compatibilità balistiche | regola | Mandible e Airbrush passano dalla colonna «Fucile» alla colonna **«Pallini»**. | `munizioni.json` → `munizioni_armi` (famiglia `pallini`) |
| §7.22.2, base | testo | HD10 e SA SG1000 «a pompa, solo Colpo Singolo»; HD14M e SA SG2001 semiautomatici. I modelli di base restano nella tabella «Fucili a pompa». | nessun dato: le modalità erano già così |
| Export | cosmetica | Titoli vuoti «####» dopo le tabelle dei fucili a pallini: artefatto dell'export Markdown. | — |

Il lotto 0.54 (`tools/lotti/lotto_armamenti_054.mjs`) diventa storico (`bloccaRiscrittura`): riscriveva le FOR della
0.54. La ricarica non cambia: le famiglie rinominate restano fra quelle a inserimento
(`munizioni.json` → `ricarica.inserimento_singolo.famiglie`); come si ricaricano semiautomatici e automatici è la
domanda nuova **A.135**. Test adeguati: `tests/armamenti-054.test.js` (FOR del KEP 808 e della Hammershot),
`tests/equipaggiamento.test.js` (l'esempio a FOR 7 era l'Ascia bipenne: ora il Lanciarazzi Southpaw),
`tests/stampa-inventario.test.js` (piè di pagina con Giocatore 0.46); PG d'esempio rigenerati (solo `versioni_dati`).

## E&L del 06/10 17:23 («Risposte approvate — regole tecniche e Stati»)

Lo stesso testo è nella sezione 7 di «per-davide.md» del 07/10. Due righe dei «Punti da riprendere» del 05/10 cambiano
(testo): il promemoria degli Stati rimanda alle sintesi approvate; A.72/A.109 rimanda ai quesiti sospesi.

| Voce | Classe | Decisione | Stato nell'app |
|---|---|---|---|
| A.107 Correzioni retroattive | regola | 121 | **fatto il 09/10** (lotto R1) |
| A.108 Punti in eccesso | regola | 122 | **fatto il 09/10** (lotto R1) |
| A.110 Indossare e togliere | regola | 120 | **fatto il 09/10** (lotto R3) |
| A.111 Recuperi di Umanità | regola | 123 | da implementare: lotto R2; resta il caso di Pablo Zaion |
| A.114 Chip e strumenti | regola | 124 | **fatto il 09/10** (lotto R2, parte A.114) |
| A.116 Luce e attività visive | regola | 125 | **fatto il 09/10** (lotto R4) |
| Stati 1/11–11/11 | testo (+ regola nei dettagli) | 126 | da implementare: lotto R5 |
| A.119 Ammalato | regola | 127 | da implementare: lotto R5 |
| A.120 COS e SAG temporanee | regola | 119 | **applicata** (era già l'ipotesi in uso; tolto il TODO) |
| A.122 Funzioni della mappa | regola | 128 | piano della mappa; resta «Aiuto-master» |
| A.124 Azioni e diagonali | regola | 129 | conferma i dati della mappa |
| A.125 Porte e luci | regola | 130 | mappa: porte fatte il 07/10 (fase 2, lotto 2, branch `battlemap`); restano luci, veicoli e vecchie etichette |
| A.127 Quadretti occupati | regola | 131 | conferma i dati della mappa |
| A.128 Terreno difficile | regola | 132 | conferma i dati della mappa |
| A.129 Movimento diviso | regola | 133 | **cambia** la mappa: lotto R6 |

Sospese secondo Davide: A.109 (vuole l'elenco con incantesimo e aspetto: sono 32, come dice lui, ed è nel pacchetto),
A.111 (Pablo Zaion), A.112, A.113, A.115, A.122 («Aiuto-master»), A.125 (veicoli, etichette delle luci), A.126.

## Doc «per-davide.md» del 07/10 05:26

- Intestazione riscritta da Davide (o dalla sua AI): «Allineamento delle risposte al 6 ottobre 2026…».
- **Pacchetto del 06/10 applicato in parte:** A.132 e A.133 sono nella sezione 2, A.123 fra le Risolte; **mancano** A.121
  (ritirata, decisione 116) e A.131 (risolta, decisione 117) fra le Risolte; A.130 correttamente assente.
- Restano i difetti già segnalati: A.80–A.83, A.86, A.88 e A.92 sia nella sezione 2 sia fra le Risolte.
- Sezione 7: il blocco nuovo coincide con l'E&L. Tutto nel pacchetto del 07/10.

## Lotti proposti, in ordine

| Lotto | Cosa | Dove | Stima |
|---|---|---|---|
| **R1** Avanzamento (A.107, A.108) · **fatto il 09/10** (pacchetto `docs/pacchetto-per-davide-2026-10-09-avanzamento.md`) | Correzione di un evento vecchio con ricalcolo in ordine e riassegnazione nello stesso evento dei punti che non aumentano più il VA (oggi la correzione è vietata); l'eccesso di punti **blocca** la salita di livello; «Togli» con scelta del giocatore delle assegnazioni da togliere (oggi dal più vecchio, un evento alla volta); i punti in eccesso non assegnati si eliminano senza toccare le Abilità. | `src/avanzamento.js` (`avvisoPuntiEccesso`, `statoRimozione`, `applicaRimozione`, blocco come `statoCompletamento`), `src/ui/completa.js`, test | 1 giorno |
| **R2** Umanità e chip (A.111, A.114) · A.114 **fatto il 09/10**, A.111 da fare | Recuperi pregressi come «Recupero straordinario di Umanità — concessione del Direttore» con «Conferma» del master (avviso → nota nello storico) e «da verificare» con UMN provvisoria; il chip del Processore si somma al miglior modificatore degli strumenti, senza contare come strumento. | `src/umanita.js`, tab Cibernetica in `src/ui/tab.js`; `src/condizioni.js` (usi specifici, righe 212–219) | 3–4 ore |
| **R3** Protezioni (A.110) · **fatto il 09/10** | La vista rapida legge `protezioni_rapide.tempi`: armatura per categoria (Leggera 1/1 min, Media 5/1, Pesante 10/5; servoassistite ed esoscheletri «procedura della scheda»), soprabiti/mantelli/Tabardo e Sottogiacca IES 1 AzP, rinforzi strutturali 1 o 5 minuti secondo `rinforzo.kit` (Leggero/Pesante); quelli con `indossabile_da_solo` (soprabiti, mantelli, Tabardo, Sottogiacca) con i tempi in AzP. | `src/ui/tab.js` (`costoIndossare`) | 2 ore |
| **R4** Luce per uso (A.116) · **fatto il 09/10** (pacchetto `docs/pacchetto-per-davide-2026-10-09-regole-tecniche.md`) | Casella «richiede la vista» sul singolo uso (tab Abilità, tiri), con le Abilità d'esempio come suggerimento e correzione del Direttore; la penalità di luce una sola volta. | `regole.json` → `categorie_prove.luce`, `src/condizioni.js`, `src/ui/tab.js` | 4–5 ore |
| **R5** Stati e Ammalato (decisioni 126–127) | Le undici sintesi approvate come testo del tooltip (campo nuovo, per esempio `sintesi`; il `promemoria` corto resta per la SS, dove lo spazio è contato); Ammalato con intensità 1–6 scelta in sessione (−1/−2/−4/−6/−8/−10 a tutte le Prove di Abilità, non alle PS), mostrata «Ammalato 3 — penalità −4», anche nella plancia; promemoria di Stordito (Volontà e Prova di Potere subito) e di Svenuto (0 PM). | `data/regole.json` → `stati`, `src/condizioni.js`, `src/sessione.js`, tab Combattimento, `src/ui/nemici.js`, `tests/stampa.test.js` | mezza giornata |
| **R6** Mappa (A.124–A.129, A.134) — **fatto per il movimento il 07/10** (branch `battlemap`: A.129 Passo diviso e Corsa/Scatto in blocco, A.124, A.127, A.128 confermati nei dati, angoli come A.134, domanda nuova A.136); porte fatte il 07/10 (fase 2, lotto 2); restano le luci (A.125) | Nel branch della mappa: movimento diviso solo al Passo, Corsa e Scatto in un blocco prima delle AzP (oggi `movimento_diviso: true` per tutte); via i `TODO(Davide)` di A.124, A.127, A.128, A.129 in `data/mappa.json` (valori confermati), quello degli angoli riscritto come A.134; porte 1 AzP con «chiusa» distinta da «bloccata»; luci con portata della sorgente e condizione della zona (A.106). | `data/mappa.json`, `src/mappa/annulla.js`, `src/mappa/area.js`, `src/ui/mappa/` (branch `battlemap`, non toccati qui) | 1 giorno |

Domande nuove: **A.134** (diagonale rasente allo spigolo di un muro), **A.136** (Corsa o Scatto dopo un Passo già
cominciato, dal lotto R6), **A.135** (ricarica dei fucili a pallini
semiautomatici e automatici).
