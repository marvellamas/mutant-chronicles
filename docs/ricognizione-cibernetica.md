# Ricognizione: Umanità e impianti cibernetici

1° ottobre 2026. Fonti (Google Doc salvati in `docs/manuali-txt/`):
- Manuale dell'Equipaggiamento 0.5, cap. 7 «Dispositivi specialistici» (01/10, 08:32 UTC);
- Manuale del Giocatore 0.45, §5.21 «Umanità» e rimandi (§3.x Risorse Interiori, §5.15–5.16, §8);
- Manuale della Magia 1.3, sez. 8 (chip del Processore);
- Manuale degli Armamenti 0.58, §7.15.1 (SIN) e §7.21 (elmetti).

Legenda: **definito** = il manuale dà regola e numeri; **manca** = serve Davide; **ipotesi** = scelta applicata nel frattempo, con voce per il Doc. Le voci per il Doc continuano da A.67.

## 1. Umanità (UMN)

### Partenza e scala — definito

> «Il valore va da 0 a 20; un essere umano non modificato parte normalmente da UMN 20.» (Giocatore §5.21)

Regola derivata: UMN iniziale 20, massimo 20, minimo 0. Nessuna Corporazione o Classe la cambia alla creazione.

### Cosa la riduce — definito

> «Ogni innesto o trasformazione indica nella propria descrizione l’eventuale perdita di UMN.» (§5.21)
> «Il costo UMN si applica all’installazione, secondo il Manuale del Giocatore, §5.21. I modelli CYBERTRONIC costano metà UMN degli equivalenti standard. Le tabelle riportano entrambi i valori: non dimezzare nuovamente la colonna CYBERTRONIC. Collegare equipaggiamento all’interfaccia o cambiare un chip non comporta ulteriori perdite di UMN.» (Equipaggiamento §7.1)
> «I costi UMN di impianti diversi si sommano.» (§7.1)

Regola derivata: UMN = 20 − somma dei costi UMN degli impianti installati. Chip, collegamenti all'interfaccia e NEC non costano UMN. Altre «trasformazioni permanenti» non sono ancora descritte da nessun manuale.

### Se si recupera — definito in parte

> «Spegnimento, rottura o rimozione di un chip non restituiscono Umanità. Il recupero di UMN richiede una procedura che ne specifichi condizioni e punti restituiti; le cure e le riparazioni ordinarie non la recuperano automaticamente.» (§7.1)
> «L’Umanità non si recupera naturalmente. Può aumentare mediante rimozione o sostituzione degli innesti, Medicina avanzata, interventi cibernetici, Magia o altri effetti che lo prevedano espressamente. Ogni procedura indica quanti punti restituisce e a quali condizioni, fino al massimo di 20.» (§5.21.4)

Regola derivata: la perdita resta anche se l'impianto si spegne, si rompe o si toglie. Il recupero avviene solo con una procedura che dica i punti, ma **nessun manuale descrive ancora una procedura**.

- **Ipotesi H1 (registro delle installazioni).** La perdita si registra quando un impianto passa allo stato «installato» e resta nel registro (`scelte.umanita.perdite`) anche se l'impianto viene tolto, si rompe o esce dall'Inventario. Lo stesso esemplare reinstallato non costa di nuovo. → A.69.
- **Ipotesi H2 (recupero).** Nessuna procedura automatica. Il Direttore può concedere punti con una nota («recupero concesso», `scelte.umanita.recuperi`), mai oltre 20. → A.70.

### Soglie ed effetti — definito

> Tabella del §5.21: UMN 20–19 Umano; 18–16 Potenziato (PS Magia contro CROS −1); 15–13 Potenziato (PM −1, PS −2, Sintonizzazione −1); 12–10 Cyborg (−2, −3, −2); 9–7 Cyborg (−4, −4, −4); 6–4 Transumano (−8, −5, −6); 3–1 Transumano (−15, −7, −8); 0 Macchina (−20, −10, −10).
> «Si applica soltanto la fascia del valore attuale, senza sommare i modificatori delle fasce precedenti.» (§5.21)

Regole derivate (le fasce stanno in `regole.json` → `umanita.fasce`):
- **PM Massimi (§5.21.1):** il modificatore si applica al massimo personale già calcolato (Classe, Potere Mistico compreso), mai sotto 1. I PM Attuali scendono solo se superano il nuovo massimo. Contenitori e riserve esterne non si riducono. Chi non ha PM resta a 0.
- **PS di Magia contro la Corruzione (§5.21.2):** solo quella PS, sommata alla penalità dello Stato di CROS. Non tocca Potere né le altre PS di Magia.
- **Capacità di Sintonizzazione (§5.21.3):** sulla capacità complessiva, bonus dei Talenti compresi, minimo 0. Se non basta più, il personaggio sceglie quali sintonizzazioni interrompere: l'app lo segnala già con l'avviso «oltre la capacità».
- **UMN 0 (§5.21.4):** «non può utilizzare Risorse Interiori, comprese le Tecniche che ne dipendono, salvo un’eccezione espressamente prevista». Non diventa un PNG; le altre capacità restano.
- «Le Caratteristiche e gli altri valori non vengono ricalcolati per la sola perdita di UMN.»

## 2. Impianti (Equipaggiamento 0.5, cap. 7)

### Categorie e voci — definito

| § | Categoria | Voci (standard e CYBERTRONIC) | Benefici numerici |
|---|---|---|---|
| 7.3 | Interfaccia neurale | 1 (+ standard) | SIN degli oggetti collegati (Armamenti §7.15.1) |
| 7.4 | Impianti sensoriali | Potenziamento visivo, Visione notturna, Visione termica, Potenziamento uditivo | +2 Percezione (vista; udito); notturna e termica: capacità |
| 7.5 | Protesi degli arti | Braccio sostitutivo, Braccio potenziato, Gamba sostitutiva, Gambe potenziate in coppia | braccio: +2 FOR/Atletica per sollevare…, +1 danno ravvicinato; gambe: +1 Q Movimento, +2 Atletica per saltare e per l'equilibrio |
| 7.6 | Protezione e supporto organico | Filtro respiratorio, Filtro ematico, Termoregolatore, Rinforzo sottocutaneo | +2 PS Tempra (inalati; veleni; caldo e freddo); +1 AR non magica |
| 7.7 | Coordinamento neurale | Acceleratore dei riflessi, Coordinatore offensivo, Coordinatore difensivo | +1 Iniziativa; +1 VA per colpire; +1 Difese e +1 PS Riflessi per Elusione |
| 7.8 | Comunicazione e strumenti incorporati | Comunicatore, Registratore audiovisivo, Microattrezzi | capacità (strumenti Standard 0) |
| 7.9 | Iniettori sanitari impiantati | Sanitario, Sanitario d’emergenza | 5 cartucce, 1 AzP |
| 7.10 | Processore neurale di Abilità | Processore + chip Assistenza (+2) e Competenza avanzata (+4) per 12 Abilità | +2 / +4 VA a un'Abilità per 30 minuti |

Per ogni voce le tabelle danno UMN (standard / CYBERTRONIC), prezzo (standard / CYBERTRONIC), REP, Qualità, PS Integrità e PI, più il costo d'installazione (1.000, 2.000 o 4.000 cr).

### Requisiti — definito

- **L'Interfaccia non è un prerequisito:** «Gli impianti funzionano autonomamente, senza richiedere l’Interfaccia neurale» (§7.4); così anche il coordinamento (§7.7).
- **Il SIN** serve solo agli oggetti con SIN (§7.3, Armamenti §7.15.1): l'app lo gestisce già.
- **Chip:** richiedono il Processore (§7.10), che a 0 PI non li attiva.

### Installazione e rimozione — definito in parte

> «Installazione. Richiede una struttura medica attrezzata. Una normale installazione acquistata come servizio non richiede prove aggiuntive o salvezze casuali di rigetto. Il costo d’installazione si aggiunge al prezzo dell’impianto.» (§7.1)

Il cap. 7 non richiama le postazioni medicochirurgiche del §6.8; le postazioni trattano le protesi come «componenti» separati (§6.8.3).

- **Manca:** tempi d'installazione, procedura e tempi di rimozione, chi la esegue fuori da un servizio acquistato.
- **Ipotesi H3.** Installare e togliere sono cambi di stato fatti a mano nell'Inventario. L'app mostra il costo d'installazione e non lo scala dai crediti. → A.69.

### Limiti di numero — definito in parte

- «Si beneficia di un solo rinforzo sottocutaneo» (§7.6).
- Benefici equivalenti non si sommano (§7.1, «Cumulo»), anche con elmetti ed esoscheletri: vista e udito potenziati danno +2 alla stessa Prova, due braccia potenziate +2 e +1 danno.
- Il buon senso limita gli arti (due braccia, una coppia di gambe); nessun altro limite è scritto. **Ipotesi H4:** l'app non impone limiti di numero e applica il «solo il maggiore» con le chiavi `beneficio` già usate per elmetti e armature.

### Benefici: come entrano nei valori — definito

Lo schema degli effetti (`docs/effetti-oggetti.md`) copre quasi tutto:
- **Iniziativa:** `iniziativa`.
- **Per colpire:** `attacco` («tutti»).
- **Difese:** `va` Difese, più `salvezza` Riflessi per Elusione.
- **AR:** `ar`.
- **PS Tempra:** `salvezza`.
- **Percezione:** `va`, situazionale, come i Sensori dell'elmetto, con la stessa chiave di beneficio.
- **Braccio potenziato:** `caratteristica` FOR e `va` Atletica per uso; il +1 danno è `danno` ravvicinato.
- **Gambe potenziate:** l'uso «saltare» e quello «equilibrio».

Serve un tipo nuovo: **`movimento`** (+1 Q delle Gambe potenziate), generale, nel Movimento effettivo.

- **Ipotesi H5 (braccio potenziato).** «+1 danno agli attacchi ravvicinati effettuati con quell’arto»: l'app non registra quale mano impugna, quindi il +1 vale per tutti gli attacchi ravvicinati. La frase del manuale resta nella provenienza. Nessuna domanda: è un limite dell'app.
- **Ipotesi H6 (gambe in coppia).** I PI sono «10 per gamba»: l'app tiene una riga di PI da 10 per la coppia e la frase per la seconda gamba. Limite dell'app.
- **Ipotesi H7 (chip).** Un chip inserito vale come effetto situazionale, acceso al tavolo per i 30 minuti. «Un solo chip attivo alla volta»: con più chip accesi l'app avvisa. Il limite delle 24 ore non si conta: è un promemoria. Il chip vale solo con un Processore installato e non rotto.

### Chip del Processore — definito

> «Un chip concede un bonus temporaneo al VA di una sola Abilità»; dedicato all'acquisto a una di 12 Abilità; Assistenza +2 (1.000, RA), Competenza avanzata +4 (4.000, MR); «Il bonus è escluso dalle Prove di combattimento, dagli Incantesimi, dalle Risorse Interiori e da qualsiasi applicazione magica, compresa la Sintonizzazione.» (§7.10; Magia 1.3 sez. 8; Giocatore §5.21.4)

Regola derivata: 24 voci di chip (2 per Abilità), nessuna per le Abilità di combattimento o magiche: il manuale non le elenca.

### Interfaccia neurale — definito, salvo un prezzo

> «Interfaccia neurale CYBERTRONIC | 1 | 4 | Non comune | 12 | RA | 5.000»; «Installazione: 2.000 cr. L’equivalente standard ha costo 2 UMN.» (§7.3)

- **Manca:** prezzo, REP e Integrità dell'interfaccia standard.
- **Ipotesi H8.** La voce standard c'è (2 UMN, profilo della CYBERTRONIC) ma senza prezzo, quindi non si compra. → A.68.
- **Raccordo:** l'«Interfaccia Neurale Cybertronic» degli Armamenti (`corredi_dispositivi`, §7.15.1) è lo stesso impianto. Esce da lì: le voci salvate passano all'impianto, installato se era «in uso», con `rif_sostituiti` nell'indice del catalogo.

## 3. Cosa si implementa (lotto 3)

- **Dati.** `data/equipaggiamento/impianti.json` (cap. 7) con tipo nuovo `impianto`: stati «installato» e «nello zaino», campi `umn`, `installazione_costo`, `innesto`, effetti. I chip sono di tipo `altro` con `richiede_impianto`. Regole in `regole.json` → `umanita` (iniziale, massimo, fasce e i loro effetti, minimi, frasi) e → `impianti` (stati, installazione, cumulo, chip).
- **Motore.**
  - `src/umanita.js`: registro, valore attuale con provenienza, fascia.
  - PM Massimi (minimo 1), capacità di Sintonizzazione (minimo 0), PS Magia contro CROS, avviso a UMN 0 sulle Risorse Interiori.
  - Effetti degli impianti installati come per gli oggetti in uso; tipo `movimento`.
- **Salvataggio.** Formato 8, campo facoltativo `scelte.umanita` = `{ perdite: [{ uid, rif, nome, umn }], recuperi: [{ punti, nota }] }`. Assente nei file vecchi, che si aprono identici.
- **SD.** Tab Cibernetica: Umanità in testa, impianti installati per categoria, chip, rimando all'Inventario (sezione nuova «Impianti cibernetici»).
- **SS.** Foglio Cibernetica dopo gli Artefatti, solo con impianti o Umanità ridotta.

## 4. Voci per il Doc

- **A.68 — Interfaccia neurale standard: prezzo e profilo** (§7.3). Nel frattempo: voce senza prezzo, non acquistabile.
- **A.69 — Installare, togliere e reinstallare un impianto** (§7.1, §5.21.4): tempi, chi la esegue fuori da un servizio, se la rimozione restituisce UMN e quanta; se reinstallare lo stesso impianto costa di nuovo. Nel frattempo: stato cambiato a mano; la perdita resta registrata; lo stesso esemplare non costa due volte.
- **A.70 — Procedure di recupero dell'Umanità** (§5.21.4): quali procedure (Medicina avanzata, interventi cibernetici, Magia) e quanti punti. Nel frattempo: «recupero concesso dal Direttore» con punti e nota.

## 5. Implementato

Vedi la sezione aggiunta a fine lotto (sotto).
