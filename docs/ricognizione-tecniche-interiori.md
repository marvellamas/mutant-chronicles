# Ricognizione: Tecniche Interiori (Giocatore 0.45, §8.9 e §8.6.10)

2 ottobre 2026. Solo verifica: nessuna modifica a dati o codice.

**Testo di riferimento.** Il Doc del Manuale del Giocatore del 02/10 08:58 (edizione 0.45),
confrontato con `docs/manuali-txt/giocatore.md`. Il §8.9, il §8.6.10 e il §3.5.5 sono identici al
testo salvato: le differenze del Doc riguardano solo la capacità di sintonizzazione (§7.10,
Tecnomante) e un rimando.

**Risposte del master usate.** E&L A.3 (Risorse Interiori e Supplementari sono Talenti passivi;
le singole Tecniche conservano costi e attivazioni) e A.4 (durata di Vipera dal Cappuccio, Presa
dell'Anima, Contraccolpo Interiore), entrambe del 26/09.

## 1. Catalogo

`data/tecniche_interiori.json`, con `versione_manuale` «Giocatore 0.43 + Google Doc del
27/09/2026». Contiene le **28 schede su 28**:

| Gruppo | Paragrafo | Numero |
|---|---|---|
| Generiche | §8.9.2 | 12 |
| Scuola del Sole | §8.9.3 | 4 |
| Scuola della Luna | §8.9.3 | 4 |
| Scuola della Terra | §8.9.3 | 4 |
| Lottatore | §8.9.4 | 4 |

Ogni voce ha `costo`, `azione`, `bersaglio`, `durata`, eventuali `altri_campi` (per esempio Limite di
Meditazione Profonda) e `testo`. Ci sono anche le regole comuni (§8.9.1) e la descrizione dei gruppi.

**Confronto con il manuale** (script di verifica: titolo `####` di ogni scheda, campi in grassetto,
testo frase per frase):
- Costo, Azione/Attivazione/Tempo, Bersaglio e Durata coincidono in **tutte le 28** schede.
- Le tre durate dell'E&L A.4 sono nei dati:
  - Vipera dal Cappuccio: «istantanea (un singolo attacco)»;
  - Presa dell'Anima: «una singola Prova per il bonus di +3 VA…»;
  - Contraccolpo Interiore: «istantanea (un singolo attacco reattivo)».
- Testo descrittivo: **2 schede non aggiornate** (differenza di regola), altre 6 diverse solo nella forma.

| Tecnica | Differenza | Tipo |
|---|---|---|
| Aura di Resistenza | manca la frase «Il +1 si cumula anche con Corazza Potenziata e con il +1 non magico di Pelle di Rinoceronte, nei rispettivi ambiti (§5.13)» | regola (già applicata nel calcolo dell'AR, risposta A.48) |
| Pelle di Rinoceronte | il manuale dice «+1 AR **non magica**» e «compatibile con Aura di Resistenza, Corazza Potenziata e le altre protezioni consentite dal §5.13»; i dati dicono «+1 AR» e «compatibile con Aura di Resistenza» | regola (nel calcolo è già non magica: `regole.json` → `ar.tecniche`, magica 0) |
| Imposizione della Mano Curativa, Onda Interiore | tabella dei costi o dei dadi trascritta in linea («Tabella — Costo: …») | forma |
| Colpo Interiore, Vipera dal Cappuccio, Mani di Yorama, Respiro della Terra | nessuna (il confronto attaccava a fine scheda l'introduzione della sezione seguente) | — |

**Effetti strutturati: nessuno.** Le 28 Tecniche sono solo testo. Il motore conosce soltanto il
+1 AR di Aura di Resistenza e di Pelle di Rinoceronte, in `regole.json` → `ar.tecniche`.

**Frasi verificabili.**
- Le 28 schede sono state confrontate con il Doc del 02/10.
- `tools/verifica_frasi.mjs` non controlla le Tecniche: le frasi del §8.9 non sono fra quelle verificate in automatico.

## 2. Accesso

| Regola (§8.6.10, §3.5.5, §8.9.3–8.9.4) | Nell'app | Dove |
|---|---|---|
| Risorse Interiori: 2 + Mod SAG, minimo 1, fissato all'acquisizione | **fatto** | `talenti_liberi.json` → `effetti.tecniche` {fisso 2, SAG, minimo 1}. `aggiungiDotazione` (`src/avanzamento.js`) registra il numero con il Mod SAG del livello di acquisizione; un aumento di SAG dopo non cambia la dotazione |
| Supplementari: +3, ripetibile, Tecniche diverse | **fatto** | `effetti.tecniche: 3`, molteplicità illimitata, prerequisito Risorse Interiori; Tecnica già conosciuta → errore |
| Risorse Interiori una sola volta, anche fra Talento di Classe e Talento Libero | **fatto** | `possiede()` guarda Talenti Liberi e di Classe; «non si riceve una seconda dotazione» |
| Lottatore: Risorse Interiori e Supplementari come scelte di Classe | **fatto** | il Talento di Classe con lo stesso nome dà la dotazione (`aggiungiDotazione` con fonte «classe»); il requisito «Risorse Interiori» delle Supplementari di Classe è controllato |
| Tecniche esclusive del Lottatore | **fatto**, con una semplificazione | si controlla la Classe Lottatore. Il manuale chiede «il Lottatore che possiede Risorse Interiori»: senza Risorse Interiori non ci sono Tecniche ammesse, quindi l'effetto è lo stesso |
| Scuole Mishima: Corporazione Mishima, iniziazione, giuramento, una sola Scuola, accesso alle scelte e non apprendimento automatico | **parziale** | serve la Corporazione Mishima; l'iniziazione si dichiara con la spunta della Scuola nel passo «Tecniche Interiori» di «Sali di livello» (`scuolaMishima` nella voce di livello, una volta sola); una sola Scuola. Iniziazione e giuramento all'Overlord non sono verificabili: l'app li ricorda come annotazione «si verificano con il master» |
| Incompatibilità con la magia (tabella del §8.6.10) | **fatto** in entrambe le direzioni | Risorse Interiori rifiutato con Addestramento Taumaturgo, Classi taumaturgiche o Talenti che danno la capacità di lanciare (`incompatibile_con`, `conflittiRisorseInteriori`). Con Risorse Interiori, un Grado in una Classe taumaturgica è rifiutato e la Classe compare come non disponibile; Usufruitore di Magia ha il prerequisito `non:risorse-interiori`. Artefatti compatibili: nessun vincolo |
| Talenti passivi (E&L A.3) | **fatto** | `tipo: "passivo"` in entrambe le schede |
| Creazione (wizard) | non applicabile | «Alla creazione non si riceve un Talento Libero» (§2), e Risorse Interiori di Classe arriva al Grado II del Lottatore: le Tecniche entrano solo con «Sali di livello» (passo «Tecniche Interiori», `src/ui/sali.js`) |

Ci sono test in `tests/avanzamento.test.js`: dotazione 2 + SAG, Tecniche mancanti o in eccesso,
Lottatore, due Scuole, iniziazione. In `tests/collaudo.test.js` c ha 3 Tecniche.

## 3. Uso al tavolo

**Non c'è un modo di attivare una Tecnica.** Oggi:

| Regola del §8.9.1 | Nell'app |
|---|---|
| Costo in PM personali all'attivazione, non restituito | mancante: i PM si tolgono a mano con −1/−5 |
| Le batterie non pagano, salvo eccezione | mancante (nessuna spesa) |
| Una sola attivazione per Round, reazioni comprese | mancante |
| Durata R + N, conseguenze periodiche all'Iniziativa della fonte | mancante. Gli interruttori di Aura e Pelle non hanno durata |
| Svenuto se la riserva resta a 0 PM | mancante: lo Stato si accende a mano |
| A Umanità 0 niente Tecniche da Risorse Interiori | parziale: annotazione nella scheda e riga nel riquadro Umanità, nessun blocco |
| Niente Prova di Potere, salvo Silenzio Mentale (Magia §19.6, «Silenzio Mentale e interferenze») | non pertinente finché non c'è l'attivazione; la PS contro Silenzio Mentale non è modellata |
| Effetti numerici al tavolo | solo il +1 AR di Aura di Resistenza (magica) e di Pelle di Rinoceronte (contro ravvicinato). Interruttori accanto ai PV (`pilloleAR`), «3 Round», senza spesa di PM |

**Dove stanno:**
- **SD:** tab **Abilità**, sezione «Tecniche Interiori (n / ammesse)», con nome (tooltip della scheda), costo, azione e durata. Nella tab Poteri non ci sono: secondo `docs/layout-sd.md` le Tecniche «restano nella tab Abilità dove sono già».
- **SS:** foglio 2 (Abilità), riquadro «Tecniche Interiori (n / ammesse)» con Tecnica, Costo e Azione. Mancano Durata e Bersaglio.

## 4. Talenti e Specializzazioni

| Punto | Nell'app |
|---|---|
| Le Specializzazioni negli Incantesimi non riducono i costi delle Tecniche (§8.9.1) | **rispettato**: nessun codice applica le Specializzazioni alle Tecniche, che non hanno un costo calcolato. Diventa un vincolo da rispettare quando ci sarà l'attivazione |
| Le prove richieste ricevono i bonus pertinenti | non pertinente oggi: le prove si fanno al tavolo |
| Pelle di Rinoceronte | **parziale**. Applicato: +1 AR non magica contro ravvicinato, valore a parte nell'AR (A.48). Mancano: +3 alle prove di FOR, +3 ad Atletica e alle prove di Corpo a corpo nelle manovre di forza, +2 al danno Ravvicinato |
| Aura di Resistenza | **fatto** nel calcolo: +1 AR magica, si somma a Corazza Potenziata e a Pelle |
| Corazza Potenziata con le Tecniche | **fatto** (cumulo nel calcolo dell'AR) |
| Padronanza della Disciplina (Lottatore) | non tocca le Tecniche: perfeziona la Disciplina. È applicata in «Attacca!» (`effetti.attacco_ravvicinato.padronanza_disciplina`) |
| Onda Interiore | i dadi dipendono da Disciplina e Grado del Lottatore (§3.5.5): nei dati solo come testo |
| Altre Tecniche con effetti sui valori (Vista Felina, Salto della Tigre, Colpo Interiore, Pugno di Pietra, Corsa di Nomura…) | mancanti: solo testo |

## 5. Manuali cambiati il 02/10 (non applicati in questa sessione)

Il controllo d'inizio sessione ha trovato nuove versioni di tutti e sei i Doc, dopo le date del
registro. Il prompt chiedeva solo verifica: non ho aggiornato dati, `docs/manuali-txt/`, registro
né `docs/per-davide.md`.

| Doc | Versione | Cosa ho visto |
|---|---|---|
| Giocatore | 08:58 | capacità di sintonizzazione portata a 8 → 4 / 10 → 6 al I Grado e 13 + 2 − 10 al VI (esempio del §5.21 e Tecnomante); rimando alle regole di Sintonizzazione (Armamenti §7.10, Magia §26.1) |
| Magia | 09:12 | non esaminato |
| Armamenti (v0.58) | 09:02 | non esaminato |
| Equipaggiamento | 09:12 | non esaminato |
| E&L | 09:02 | per le Tecniche valgono A.3 e A.4 |
| per-davide | 09:29 | il pacchetto di Marcello: A.18 risolta, A.74 (Rituale di Rigenerazione) e A.75 (batterie oltre 5 PM) nuove; nessuna risposta sulle Tecniche |

## 6. Stato (02/10/2026, sera)

Fatto il **prompt 1** della proposta, con la richiesta di Davide («Risorse Interiori nel tab Poteri, Tecniche come incantesimi, “Attiva” che scala i PM fissi, avviso se i PM personali non bastano»):

- **SD:** sezione «Risorse Interiori» nella tab Poteri (`src/ui/tecniche.js`), visibile a chi ha Risorse Interiori (Talento Libero o di Classe del Lottatore).
  - Una scheda per Tecnica, raggruppate in generiche / Scuola / Lottatore, colore proprio `--tecnica` (bronzo, `docs/palette.md`).
  - «Attiva» apre il pannello a due passi; Round con «Nuovo Round»; riquadro delle Tecniche attive con lo scadere e «Termina».
  - Nella tab Abilità resta il rimando «Tecniche Interiori: vedi Poteri».
- **Motore:** `src/tecniche.js` (regole comuni del §8.9.1), test in `tests/tecniche.test.js`.
  - Sessione: `round`, `ultimaTecnica`, `tecnicheAttive`.
  - Aura di Resistenza e Pelle di Rinoceronte non sono più interruttori: valgono nell'AR finché sono attive.
- **Dati:** `costo_pm` (Imposizione della Mano Curativa: `opzioni_costo` dalla tabella), `durata_tipo` e `durata_round`, `attivazione`; testi 0.45 di Aura di Resistenza e Pelle di Rinoceronte.
- **SS:** le Tecniche lasciano il foglio 2 (che torna alle Annotazioni) e vanno nel foglio 5 (Poteri), che si stampa anche per chi ha solo le Tecniche. In quel caso a sinistra ci sono PM e regole comuni, a destra l'elenco con Costo, Azione, Durata e Bersaglio.
- **Verifica:** nessun valore calcolato cambia rispetto a `main` (a, b, c, Lucas, d; a riposo e con una Ferita e Rallentato).

Fatto il **prompt 2** (02/10, sera):
- **Dati:** `effetti` nelle 28 schede (`tools/effetti_tecniche.mjs`; frasi in `tools/verifica_frasi.mjs`): 18 con effetti applicati (valori, «Attacca!», cura), 10 solo promemoria; TODO(Davide) A.81 (Pelle di Rinoceronte, manovre di forza) e A.82 (Onda Interiore, bonus pertinenti).
- **Motore:** `src/tecniche.js` (`effettiTecniche`, `tecnicheAttacco`, `curaTecnica`), `src/condizioni.js` (VA, usi specifici, PS, Caratteristiche, danno, Movimento, Sensi), `src/attacco.js` (`profiloOndaInteriore`, effetti d'attacco, riga «Tecniche attive»; la stessa riga in «Lancia!»). Le istantanee restano in corso fino alla fine del Round.
- **SD:** riquadro delle Tecniche attive con l'effetto in breve e le regole; Imposizione con «Su chi» e il dado; Onda Interiore fra le armi della tab Combattimento; riquadro Sensi.
- **SS:** colonna «Effetto» nel foglio 5 se l'elenco entra; seguito nella colonna sinistra.
- Test in `tests/tecniche-effetti.test.js`.
