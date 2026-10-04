# Censimento degli impianti: effetti numerici al tavolo

4 ottobre 2026. Nato dalla segnalazione di Marcello: il Potenziamento visivo CYBERTRONIC installato non mostrava nessun bonus a Percezione, né fisso né condizionale. Fonti: `data/equipaggiamento/impianti.json` (68 voci: 22 impianti in versione standard e CYBERTRONIC, 24 chip del Processore), confrontati con Equipaggiamento 0.5 cap. 7 (§7.1–7.10), Giocatore §5.21 e Armamenti §7.15.1 (SIN) in `docs/manuali-txt/`. Metodo come in `docs/censimento-talenti.md`.

## Causa del bug

Il dato c'era: `{ abilita: "Percezione", valore: 2, ambito: "situazionale" }`, e il motore lo calcolava (`src/condizioni.js`). Ma un effetto situazionale si vedeva solo:
- come interruttore nel riquadro «Bonus/malus condizionali su Abilità», nella colonna di destra della tab Abilità;
- come voce «Disponibile» nel tooltip del VA.

Accanto a Percezione non c'era nulla, in stampa nemmeno. Per chi guarda la riga di Percezione il bonus non esisteva. Lo stesso valeva per tutti gli effetti situazionali (16 impianti e 24 chip, più oggetti e Talenti).

## Esiti

- **applicato**: l'effetto è nei dati e la scheda lo calcola sempre (VA, Difese, AR, Iniziativa, Movimento, SIN).
- **condizionale**: vale solo in certe condizioni. Effetto situazionale con la casella «+N se …» accanto al valore, oppure valore d'uso specifico (PS contro i veleni, FOR per sollevare), oppure promemoria quando l'app non ha il numero da togliere (visione notturna e termica).
- **attivabile**: richiede un'Azione e ha cariche o durata. Si gestisce nella tab Cibernetica: iniettori con le cartucce e «Somministra», Processore con «Attiva» del chip.
- **solo testo**: nessun numero sui valori del personaggio; al più il promemoria dell'Azione.

## Conteggi

**68 impianti.**

| Esito | Impianti |
|---|---|
| applicato | 12 |
| condizionale | 16 |
| attivabile | 30 (4 iniettori, 2 Processori, 24 chip) |
| solo testo | 10 |

**Mancanti corretti: 2.** Il +1 danno del Braccio potenziato (standard e CYBERTRONIC) era generale. Il manuale lo dà solo «agli attacchi ravvicinati effettuati con quell’arto» (§7.5): ora è situazionale, con la casella in «Attacca!». Nessun altro impianto ha un numero del manuale assente dai dati.

**Dati aggiunti** (`tools/lotti/lotto_effetti_impianti.mjs`, idempotente):
- `se` su 30 effetti situazionali: la forma breve per la nota «+2 se con la vista»;
- `attivabile` su 16 impianti: tipo `cariche` per gli iniettori, `chip` per il Processore, `promemoria` per visione, comunicatore, registratore e microattrezzi, con le frasi del manuale controllate da `tools/verifica_frasi.mjs`.

## Come si vedono ora

- **Tab Abilità** (e Difese nella tab Combattimento): accanto al VA, «☐ +2 se con la vista». La casella accende la condizione (`sessione.condizioniOggetti`) e il bonus entra nel VA della Prova, con la provenienza «Potenziamento visivo CYBERTRONIC (condizione attiva) +2». Spenta, resta la nota. Lo stesso vale per i Talenti situazionali. I chip passano da «Attiva».
- **«Attacca!»**: una casella per gli oggetti con effetti situazionali sul tiro o sul danno («Braccio potenziato · +1 danno se con il braccio potenziato»), con la frase del manuale nel tooltip (`src/attacco.js` → `effettiSituazionaliAttacco`).
- **Stampa** (foglio 2): sotto il VA, «+2 se con la vista»; il VA resta a riposo.
- **Tab Cibernetica**:
  - iniettori con «Cartucce caricate: n / 5» (− e +) e «Somministra (1 AzP)»;
  - Processore con i chip, «Attiva» (solo il chip inserito), «Termina» e «Passate le 24 ore»;
  - per gli altri impianti attivabili, «Attivare: 1 AzP» con la frase del manuale.

  Sessione: blocco `impianti`, presente solo se serve (`src/impianti.js`).

## Impianti

| Impianto | § | Esito | Nei dati | Nota |
|---|---|---|---|---|
| Interfaccia neurale | §7.3 | applicato | — | SIN 1/2 delle armi e dei dispositivi collegati, nel VA dell’arma (tabella SIN, §7.15.1) |
| Interfaccia neurale CYBERTRONIC | §7.3 | applicato | — | SIN 1/2 delle armi e dei dispositivi collegati, nel VA dell’arma (tabella SIN, §7.15.1) |
| Potenziamento visivo | §7.4 | condizionale | +2 VA a Percezione (con la condizione attiva) se con la vista | casella «+2 se con la vista» accanto a Percezione; prima solo interruttore nel riquadro laterale |
| Potenziamento visivo CYBERTRONIC | §7.4 | condizionale | +2 VA a Percezione (con la condizione attiva) se con la vista | casella «+2 se con la vista» accanto a Percezione; prima solo interruttore nel riquadro laterale |
| Visione notturna impiantata | §7.4 | condizionale | attivabile: promemoria | promemoria con l’Azione: nessuna penalità di illuminazione nei dati da togliere (A.106) **(corretto)** |
| Visione notturna impiantata CYBERTRONIC | §7.4 | condizionale | attivabile: promemoria | promemoria con l’Azione: nessuna penalità di illuminazione nei dati da togliere (A.106) **(corretto)** |
| Visione termica impiantata | §7.4 | condizionale | attivabile: promemoria | promemoria con l’Azione: il −4 della Fumogena non è calcolato dall’app **(corretto)** |
| Visione termica impiantata CYBERTRONIC | §7.4 | condizionale | attivabile: promemoria | promemoria con l’Azione: il −4 della Fumogena non è calcolato dall’app **(corretto)** |
| Potenziamento uditivo | §7.4 | condizionale | +2 VA a Percezione (con la condizione attiva) se con l’udito | casella «+2 se con l’udito» accanto a Percezione; con la vista, un solo +2 (§7.4) |
| Potenziamento uditivo CYBERTRONIC | §7.4 | condizionale | +2 VA a Percezione (con la condizione attiva) se con l’udito | casella «+2 se con l’udito» accanto a Percezione; con la vista, un solo +2 (§7.4) |
| Braccio sostitutivo | §7.5 | solo testo | — | ripristina la funzione dell’arto |
| Braccio sostitutivo CYBERTRONIC | §7.5 | solo testo | — | ripristina la funzione dell’arto |
| Braccio potenziato | §7.5 | condizionale | +2 alla Prova di FOR (solo sollevare, spingere, trascinare o sfondare); +2 VA ad Atletica (solo per sollevare, spingere, trascinare o sfondare); +1 danno agli attacchi ravvicinati se con il braccio potenziato | +2 FOR/Atletica come valori d’uso; +1 danno ora con la casella di «Attacca!» (era sempre attivo) **(corretto)** |
| Braccio potenziato CYBERTRONIC | §7.5 | condizionale | +2 alla Prova di FOR (solo sollevare, spingere, trascinare o sfondare); +2 VA ad Atletica (solo per sollevare, spingere, trascinare o sfondare); +1 danno agli attacchi ravvicinati se con il braccio potenziato | +2 FOR/Atletica come valori d’uso; +1 danno ora con la casella di «Attacca!» (era sempre attivo) **(corretto)** |
| Gamba sostitutiva | §7.5 | solo testo | — | ripristina la funzione dell’arto |
| Gamba sostitutiva CYBERTRONIC | §7.5 | solo testo | — | ripristina la funzione dell’arto |
| Gambe potenziate in coppia | §7.5 | applicato | +1 Q al Movimento; +2 VA ad Atletica (solo per saltare); +2 VA ad Atletica (solo per equilibrio) | +1 Q al Movimento sempre; +2 Atletica come valori d’uso (saltare, equilibrio) |
| Gambe potenziate in coppia CYBERTRONIC | §7.5 | applicato | +1 Q al Movimento; +2 VA ad Atletica (solo per saltare); +2 VA ad Atletica (solo per equilibrio) | +1 Q al Movimento sempre; +2 Atletica come valori d’uso (saltare, equilibrio) |
| Filtro respiratorio impiantato | §7.6 | condizionale | +2 alla PS Tempra (solo contro veleni e agenti patogeni inalati) | valore d’uso della PS Tempra «contro veleni e agenti patogeni inalati» |
| Filtro respiratorio impiantato CYBERTRONIC | §7.6 | condizionale | +2 alla PS Tempra (solo contro veleni e agenti patogeni inalati) | valore d’uso della PS Tempra «contro veleni e agenti patogeni inalati» |
| Filtro ematico | §7.6 | condizionale | +2 alla PS Tempra (solo contro i veleni) | valore d’uso della PS Tempra «contro i veleni» |
| Filtro ematico CYBERTRONIC | §7.6 | condizionale | +2 alla PS Tempra (solo contro i veleni) | valore d’uso della PS Tempra «contro i veleni» |
| Termoregolatore interno | §7.6 | condizionale | +2 alla PS Tempra (solo contro caldo e freddo ambientali) | valore d’uso della PS Tempra «contro caldo e freddo ambientali» |
| Termoregolatore interno CYBERTRONIC | §7.6 | condizionale | +2 alla PS Tempra (solo contro caldo e freddo ambientali) | valore d’uso della PS Tempra «contro caldo e freddo ambientali» |
| Rinforzo sottocutaneo | §7.6 | applicato | +1 AR | +1 AR non magica, anche senza armatura |
| Rinforzo sottocutaneo CYBERTRONIC | §7.6 | applicato | +1 AR | +1 AR non magica, anche senza armatura |
| Acceleratore dei riflessi | §7.7 | applicato | +1 Iniziativa | +1 Iniziativa |
| Acceleratore dei riflessi CYBERTRONIC | §7.7 | applicato | +1 Iniziativa | +1 Iniziativa |
| Coordinatore offensivo | §7.7 | applicato | +1 VA alle Prove per colpire | +1 VA per colpire, ravvicinato e a distanza |
| Coordinatore offensivo CYBERTRONIC | §7.7 | applicato | +1 VA alle Prove per colpire | +1 VA per colpire, ravvicinato e a distanza |
| Coordinatore difensivo | §7.7 | applicato | +1 VA a Difese; +1 alla PS Riflessi (solo Elusione) | +1 Difese sempre; +1 PS Riflessi solo per Elusione (valore d’uso) |
| Coordinatore difensivo CYBERTRONIC | §7.7 | applicato | +1 VA a Difese; +1 alla PS Riflessi (solo Elusione) | +1 Difese sempre; +1 PS Riflessi solo per Elusione (valore d’uso) |
| Comunicatore impiantato | §7.8 | solo testo | attivabile: promemoria | promemoria dell’Azione (1 AzP per accendere o cambiare canale) |
| Comunicatore impiantato CYBERTRONIC | §7.8 | solo testo | attivabile: promemoria | promemoria dell’Azione (1 AzP per accendere o cambiare canale) |
| Registratore audiovisivo impiantato | §7.8 | solo testo | attivabile: promemoria | promemoria dell’Azione (1 AzP) |
| Registratore audiovisivo impiantato CYBERTRONIC | §7.8 | solo testo | attivabile: promemoria | promemoria dell’Azione (1 AzP) |
| Microattrezzi integrati | §7.8 | solo testo | attivabile: promemoria | strumenti Standard, modificatore 0; promemoria dell’Azione |
| Microattrezzi integrati CYBERTRONIC | §7.8 | solo testo | attivabile: promemoria | strumenti Standard, modificatore 0; promemoria dell’Azione |
| Iniettore sanitario impiantato | §7.9 | attivabile | attivabile: cariche | cartucce caricate (0–5) e «Somministra (1 AzP)» nella tab Cibernetica **(corretto)** |
| Iniettore sanitario impiantato CYBERTRONIC | §7.9 | attivabile | attivabile: cariche | cartucce caricate (0–5) e «Somministra (1 AzP)» nella tab Cibernetica **(corretto)** |
| Iniettore sanitario d’emergenza | §7.9 | attivabile | attivabile: cariche | come l’iniettore; il rilascio automatico contro il Sanguinamento resta promemoria **(corretto)** |
| Iniettore sanitario d’emergenza CYBERTRONIC | §7.9 | attivabile | attivabile: cariche | come l’iniettore; il rilascio automatico contro il Sanguinamento resta promemoria **(corretto)** |
| Processore neurale di Abilità | §7.10 | attivabile | attivabile: chip | «Attiva» del chip inserito, 30 minuti, una volta ogni 24 ore **(corretto)** |
| Processore neurale di Abilità CYBERTRONIC | §7.10 | attivabile | attivabile: chip | «Attiva» del chip inserito, 30 minuti, una volta ogni 24 ore **(corretto)** |
| Chip Assistenza: Atletica | §7.10 | attivabile | +2 VA ad Atletica (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Competenza avanzata: Atletica | §7.10 | attivabile | +4 VA ad Atletica (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Assistenza: Furtività | §7.10 | attivabile | +2 VA a Furtività (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Competenza avanzata: Furtività | §7.10 | attivabile | +4 VA a Furtività (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Assistenza: Percezione | §7.10 | attivabile | +2 VA a Percezione (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Competenza avanzata: Percezione | §7.10 | attivabile | +4 VA a Percezione (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Assistenza: Pilotare | §7.10 | attivabile | +2 VA a Pilotare (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Competenza avanzata: Pilotare | §7.10 | attivabile | +4 VA a Pilotare (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Assistenza: Cultura | §7.10 | attivabile | +2 VA a Cultura (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Competenza avanzata: Cultura | §7.10 | attivabile | +4 VA a Cultura (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Assistenza: Intrattenere | §7.10 | attivabile | +2 VA a Intrattenere (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Competenza avanzata: Intrattenere | §7.10 | attivabile | +4 VA a Intrattenere (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Assistenza: Medicina | §7.10 | attivabile | +2 VA a Medicina (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Competenza avanzata: Medicina | §7.10 | attivabile | +4 VA a Medicina (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Assistenza: Oratoria | §7.10 | attivabile | +2 VA a Oratoria (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Competenza avanzata: Oratoria | §7.10 | attivabile | +4 VA a Oratoria (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Assistenza: Raggirare | §7.10 | attivabile | +2 VA a Raggirare (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Competenza avanzata: Raggirare | §7.10 | attivabile | +4 VA a Raggirare (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Assistenza: Scienza | §7.10 | attivabile | +2 VA a Scienza (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Competenza avanzata: Scienza | §7.10 | attivabile | +4 VA a Scienza (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Assistenza: Sopravvivenza | §7.10 | attivabile | +2 VA a Sopravvivenza (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Competenza avanzata: Sopravvivenza | §7.10 | attivabile | +4 VA a Sopravvivenza (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Assistenza: Tecnologia | §7.10 | attivabile | +2 VA a Tecnologia (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |
| Chip Competenza avanzata: Tecnologia | §7.10 | attivabile | +4 VA a Tecnologia (con la condizione attiva) se con il chip attivo | bonus del chip con «Attiva» del Processore (prima: interruttore libero, senza il limite di 24 ore) |

## Domande per Davide

- **A.106 — Penalità per scarsa illuminazione.** La Visione notturna «entro 80 Q elimina le penalità per scarsa illuminazione» (§7.4), e così il visore dell'elmetto e il modulo del mirino. Il Manuale del Giocatore non dà un valore per queste penalità, quindi la scheda non ha niente da togliere: resta un promemoria (`TODO(Davide)` in `impianti.json`). Quanto vale la penalità, e a quali Prove si applica (Percezione, attacchi)?

## Stesso rischio altrove (verifica rapida, senza correzioni)

Ho cercato nel testo di ogni oggetto un bonus o un malus numerico («+2 VA», «−4 VA», «+2 alla PS»…) e ho controllato se è nei dati (`effetti`, `modificatore_va`, `bonus_condizionato`, `penalita`, proprietà strutturate, regole). Molti numeri riguardano il bersaglio o l'osservatore, non il personaggio: sono esclusi.

| Categoria | Con un numero nel testo | Bonus del personaggio non nei dati |
|---|---|---|
| Equipaggiamento (armi, accessori, munizioni, corredi, dotazioni, sanitario, comunicazione) | 117 | **5**: Martello Spaccateste a due mani (Stordire +1 alla Manovra); IAS3200 Imbracatura antigravità (Pilotare −2 in Corsa, −4 in Scatto); IAS3100 Generatore Blink (SIN 2 a Pilotare del dispositivo); APE Capitol (Schivare con Pilotare −1); Utensile multiuso (strumento Improvvisato −2). Più 6 promemoria senza numero calcolabile: i tre visori termici e il modulo (−4 della Fumogena), i due kit di pronto soccorso (intensità del Sanguinamento) |
| Rinforzi, armature, elmetti, scudi | 127 | **0** (il visore termico dell'elmetto è un promemoria come sopra) |
| Artefatti | 24 | **0** (le 23 Schegge: il −2 per 3 PM è in `regole.json` → `chroma.schegge`) |
| Talenti | 58 | **0** (6 segnalati: Ricarica Migliorata è applicata in `src/ricarica.js`, gli altri 5 danno penalità all'avversario, già testuali nel censimento dei Talenti) |
| Tecniche Interiori | 11 | **0** |
