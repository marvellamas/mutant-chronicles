# Ricognizione: Manovre ravvicinate e utility «Attacco corpo a corpo»

26 settembre 2026. Ricognizione per la voce 6 del backlog. Non cambia né codice né dati.

Fonti:
- **Manuale del Giocatore v0.43**: §1.4 (circostanze), §1.6 (risultati naturali e moltiplicatori), §5.1 (Azioni e §5.1.1 preparare le armi), §5.2 (Movimento Evasivo, Ritirata), §5.3 (Ingaggio e opportunità), §5.4 (Imboscata e Azione Preparata), §5.5 (A Terra e Incalzare), §5.6 (Carica e Controcarica), §5.7 (due armi), §5.8 (Copertura), §5.9 (Difese), §5.12 (Manovre ravvicinate), §5.13 (Danno e Armatura), §5.18 (Stati), §8.6 (Talenti Liberi, soprattutto §8.6.6 e §8.6.7).
- **Talenti di Classe** (`data/classi.json`, cap. 3): Lottatore, Assaltatore, Incursore, Lestofante.
- **Manuale degli Armamenti v0.50**: §7.1.5 (Frusta) e §7.1.7 (Compatibilità con le Manovre).

## 1. Le Manovre

### 1.1 Tabella

Legenda:
- **AzP** = Azione Principale; **AzM** = Azione di Movimento.
- «Danno» è quello che si aggiunge **prima** del moltiplicatore, secondo l'ordine del §5.13: dadi → bonus ordinari → moltiplicatore più alto → Difesa → Armatura → effetti «se almeno 1 danno supera l'Armatura».
- **Magistrale** (§1.6): raddoppia il danno; un ×2 già previsto diventa ×3; un ×3 già previsto resta ×3; i moltiplicatori non si sommano (si usa il più alto). Vale per la sola prima istanza di danno.
- Per regola generale **le Manovre offensive non si combinano fra loro**, salvo indicazione esplicita (§5.12). Nella colonna «Incompatibilità» compaiono solo le esclusioni scritte in più.

| Manovra | Azioni | VA per colpire | Danno | Prova o Salvezza del bersaglio | Condizioni | Incompatibilità esplicite | Versione migliorata (Talento) | § |
|---|---|---|---|---|---|---|---|---|
| **Attacco normale** (Colpo Singolo Ravvicinato) | 1 AzP | 0 | normale | Difese del bersaglio (Parata o Schivata, §5.9) | Abilità dell'arma | — | — | 5.12 |
| **Colpo Mirato** | 2 AzP complessive, anche in due Round consecutivi (dal 12° nella stessa Iniziativa) | +2 | +2 | Difese | la preparazione si perde con un'altra AzP, cambio d'arma, Corsa o Scatto, bersaglio perso, incapacità (come il Tiro Mirato, §5.10); niente versione Istintiva | — | Colpo Mirato Migliorato: +4 / +4 | 5.12, 5.4, 5.10 |
| **Affondo** | 1 AzP | −4 | +1; se ≥ 1 danno oltre l'AR: Sanguinamento 1 | Difese | arma con «Affondo» fra le Manovre compatibili; Abilità del profilo | — | Affondo Migliorato: +2 e Sanguinamento 2 | 5.12, A 7.1.7 |
| **Spazzata** | 1 AzP | −4 contro 2 bersagli, −6 contro 3 | normale; un colpo per bersaglio, una sola Prova | Difese e AR separate per ogni bersaglio | fino a 3 bersagli adiacenti; arma con «Spazzata» o **senz'armi** | Combattere con due armi | Spazzata Migliorata: −2 / −4 | 5.12, A 7.1.7 |
| **Immobilizzare** | 1 AzP | 0 (Prova contrapposta) | nessuno; con Immobilizzare Istintivo il danno senz'armi normale sulla presa iniziale | contrapposta: Corpo a corpo contro Corpo a corpo o Atletica; liberarsi: 1 AzP e nuova Prova, i pareggi favoriscono chi trattiene | Contatto e una mano libera. Con la Frusta entro 3 Q e la Catena chiodata entro 2 Q: Armi da mischia, la mano della Frusta sostituisce la mano libera, nessun danno (A 7.1.5) | — | Immobilizzare Migliorato: −2 alla Prova di fuga del bersaglio | 5.12, A 7.1.5 |
| **Sbilanciare** | 1 AzP | −4 | nessuno; con successo il bersaglio cade A Terra | Corpo a corpo o Abilità dell'arma contro Atletica o Difese | Contatto o portata | — | Sbilanciare Migliorato: −2 | 5.12 |
| **Stordire** | 1 AzP | −6 | normale; se ≥ 1 danno oltre l'AR: PS Tempra, se fallisce Stordito 1+1d3 Round | Difese, poi PS Tempra | Contatto anche con un'arma a portata maggiore; Corpo a corpo (senz'armi, Tirapugni) o Abilità di un'arma con «Stordire» | l'elettrificazione non dà Stordire (A 7.1.7) | Stordire Migliorato: −4 | 5.12, A 7.1.7 |
| **Disarmare** | 1 AzP | −4 | nessuno; l'oggetto cade nel Q del bersaglio | Corpo a corpo o Abilità dell'arma contro Corpo a corpo o Abilità dell'arma impugnata | Contatto o portata | — | Disarmare Migliorato: −2 | 5.12 |
| **Incalzare** | 1 AzP | −4 | nessuno; il bersaglio arretra di 2 Q (1 Q se c'è solo quello spazio; cade A Terra se bloccato); prima di un precipizio fa una PS Riflessi | *non detto: vedi A.24* | attacco ravvicinato o senz'armi | — | Incalzare Migliorato: anche il danno normale | 5.5 |
| **Carica** | AzM + 1 AzP | −2 (percorso 3–6 Q), −4 (7–12 Q); gli avversari hanno −4 / −6 per colpirlo fino alla sua Iniziativa successiva | ×2 | Difese, oppure Controcarica | ≥ 3 Q quasi rettilinei, non oltre la Corsa; un solo attacco normale o senz'armi; dal 12° la seconda AzP non ha i benefici | «non si combina con altre manovre offensive» | Carica Migliorata: ×3, che resta ×3 anche con il Magistrale. Carica Brutale (Assaltatore): +2 al danno base prima del moltiplicatore | 5.6 |
| **Controcarica** | AzM + 1 AzP, al posto delle Difese | −2 per entrambi | ×2 (×3 con Carica Migliorata) | attacchi simultanei; si ignorano a vicenda le penalità difensive della Carica | bersaglio consapevole, distanza ≥ 6 Q, percorso libero, arma ravvicinata o senz'armi | — | Carica Migliorata: ×3 | 5.6 |
| **Combattere con due armi** | 1 AzP, 2 attacchi (dal 12° due AzP, 4 attacchi) | −4 a ciascuno | normale; Prove, Difese e AR separate | Difese | due armi ravvicinate a una mano, oppure mista con un'Arma leggera (contro un bersaglio impegnato vale anche il Tiro Ravvicinato) | Tiro Rapido, Tiro o Colpo Mirato, Raffiche, Spazzata, altre offensive | Schermidore (due ravvicinate) −2; Duellante (mista) −2; Pistolero (due leggere a distanza) −2. Ambidestro non si somma | 5.7, 8.6.6 |
| **Attacco di Opportunità** | gratuito, 1 per Round | 0 | normale | Difese | un avversario esce volontariamente dalla portata (non con Ritirata, movimento forzato o teletrasporto) | niente manovre offensive | Colpo di Opportunità Istintivo: 2 per Round, contro avversari diversi | 5.3, 8.6.6 |
| **Imboscata** | 1 AzP dichiarata; l'Azione scatta all'evento | −2 | come l'Azione dichiarata | come l'Azione | evento osservabile prima della propria Iniziativa successiva | — | Imboscata Migliorata: 0 | 5.4 |
| **Raffica di Colpi** (Lottatore III) | 1 AzP, 2 attacchi senz'armi (dal 12° con entrambe le AzP) | −2 a ciascuno | normale | Difese separate | senz'armi | altre Manovre offensive | — | 3.5.5 |
| **Combattimento Multiplo** (Lottatore V) | 1 AzP | −4 contro 2, −6 contro 3 o più | normale, un colpo per bersaglio | Difese e AR separate | Spazzata senz'armi contro **tutti** gli adiacenti raggiungibili | — | Spazzata Migliorata −2 | 3.5.5, A 7.1.7 |
| **Punto Debole** (Lottatore, a scelta) | 1 AzP per studiare, poi un attacco normale senz'armi entro la propria Iniziativa successiva | 0 | ×2 (×3 con Magistrale, mai ×4) | Difese | avversario chiaramente percepito; il beneficio si consuma anche se l'attacco fallisce | Raffica di Colpi, Combattimento Multiplo, altre offensive | — | 3.5.5 |
| **Apertura Tattica** (Talento Libero, attivo) | 1 AzP ancora disponibile, anche fuori dalla propria Iniziativa | 0 | normale | Difese | 1 per Round, quando un alleato colpisce un bersaglio adiacente al personaggio | — | — | 8.6.6 |

Non sono Manovre d'attacco, ma una scheda d'attacco deve saperle mostrare:
- **Difese** (§5.9): Parata 1 AzP (arma −8 contro attacchi a distanza, scudo −4); Schivata AzM + AzP; Elusione. Talenti: Parata Istintiva/Multipla/Migliorata, Schivata Istintiva/Multipla/Migliorata, Parata a Distanza, Parata a Mani Nude del Lottatore.
- **Movimento**: Ritirata (AzM + AzP, evita gli Attacchi di Opportunità; Migliorata li evita tutti) e Movimento Evasivo (penalità agli avversari, §5.2).
- **Preparare le armi** (§5.1.1): estrarre, cambiare o ricaricare costa 1 AzP; incorporarlo nell'attacco dà −4 VA. Estrazione Rapida e Cambio Rapido lo rendono gratuito una volta per Round.

### 1.2 Cosa c'è già nei dati

- **Campo `manovre` su tutte le 69 armi ravvicinate del catalogo**: 28 commerciali (lotto 13, §7.1.7) e 39 corporative, più 2 scudi con attacco. Valori: `Affondo` 37 armi, `Spazzata` 35, `Stordire` 17, `generali` 5 (Frusta, Frusta elettrificata, Catena chiodata e altre per cui la tabella dà «—»).
- **Manovre generali.** Sbilanciare, Disarmare, Immobilizzare, Colpo Mirato, Carica, Incalzare e due armi non compaiono per arma, e il §7.1.7 lo giustifica: «non ricevono nuove limitazioni per famiglia d'arma». Nei dati `generali` vuol dire «solo le Manovre generali».
- **Già strutturato e già nel VA per colpire** (`calcolaEquipaggiamento` e `src/condizioni.js`): Specializzazione (+1 VA, +1 danno), Precisa X, SIN, FOR insufficiente, penalità dell'armatura agli attacchi ravvicinati, Ferite, Affaticamento, Stati. Il valore effettivo con la scomposizione c'è già (`vaEffettivo`, `scomposizione`).
- **Resta solo testo:**
  - «Immobilizzare entro 3 Q / 2 Q» (Frusta, Catena) e «Immobilizzare a distanza»;
  - «Parata avversaria −2 VA» del Mazzafrusto;
  - le Manovre degli scudi con attacco (Scudo Punisher: «Manovre generali pertinenti e Stordire», nella nota).
- **Manca del tutto:**
  - **effetti delle Manovre**: VA, danno, Azioni, requisiti, effetti dopo l'Armatura. Ci sono solo i nomi.
  - **profilo «senz'armi»**: non c'è nel catalogo, e il danno base non è scritto da nessuna parte (A.22).
  - **Disciplina del Lottatore** come scelta del personaggio: oggi il dado del Lottatore non si può calcolare.

## 2. Modificatori di situazione in un attacco ravvicinato

| Situazione | Effetto sul VA per colpire (o sul danno) | Fonte | Oggi |
|---|---|---|---|
| **Attaccante A Terra** | −4 alle azioni fisiche ravvicinate e alle Difese | §5.5 | ✔ già in `vaEffettivo` (Stato A Terra) |
| **Bersaglio A Terra** | +2 per l'attaccante ravvicinato (−2 a distanza) | §5.5 | da aggiungere |
| **Bersaglio che ha caricato** | −4 (percorso 3–6 Q) o −6 (7–12 Q) per chi lo attacca, fino alla sua Iniziativa successiva | §5.6 | da aggiungere |
| **Bersaglio in Movimento Evasivo** | Passo −2, Corsa −4, Scatto −6; con Movimento Evasivo Migliorato del bersaglio −4 / −6 / −8 | §5.2 | da aggiungere |
| **Bersaglio in Corsa o Scatto** | Corsa −2, Scatto −4 (citate come «ordinarie» nel testo di Movimento Tattico) | §5.2, 3.5 | da aggiungere |
| **Bersaglio in Copertura** | Leggera −2, Media −4; Totale: non attaccabile. Con Copertura Migliorata del bersaglio −4 / −6 | §5.8, 8.6.7 | da aggiungere (A.25: vale nel ravvicinato?) |
| **Attaccare dalla Copertura** | Leggera −2, Media −4; Copertura Tattica: 0 / −2 | §5.8, 8.6.7 | da aggiungere |
| **Ingaggio multiplo** | **nessuna regola**: resta il modificatore unico di circostanza del Direttore (§1.4, da −8 a +8). Talenti collegati: Coordinazione Offensiva +1 (bersaglio adiacente a un alleato); Colpo Sleale (Lestofante) se il bersaglio è ingaggiato con un altro avversario | §1.4, 3.5 | da aggiungere come «circostanze» (A.26) |
| **Due armi** | −4 a ciascun attacco; Schermidore o Duellante −2 | §5.7 | da aggiungere (Manovra) |
| **Mano non dominante** | −4 «normale»; Ambidestro lo elimina (non si somma ai Talenti delle due armi) | §5.7, 8.6.1 | da aggiungere (A.23: regola non scritta) |
| **Estrazione o cambio d'arma nell'attacco** | −4 (Estrazione Rapida o Cambio Rapido: 0) | §5.1.1 | da aggiungere |
| **Imboscata** | −2 (Imboscata Migliorata: 0) | §5.4 | da aggiungere |
| **Bersaglio non visibile** | −8 (Combattere alla Cieca: −4) | §5.18, 8.6.6 | da aggiungere |
| **Attaccante non percepito** | +4 | §5.18 (Accecato) | da aggiungere |
| **Bersaglio ignaro** | Attacco Silenzioso (Incursore) +2; Colpo Sleale (Lestofante) +2 al danno | 3.5 | da aggiungere |
| **Primo attacco del combattimento** | Rapidità Operativa (Incursore) +2 | 3.5 | da aggiungere (va ricordato in sessione) |
| **Circostanze** (§1.4) | un solo modificatore complessivo del Direttore, da −8 a +8 | §1.4 | da aggiungere (campo libero) |
| **Ferite, Affaticamento, Stati** | penalità già calcolate | §5.14, 5.18, 5.19 | ✔ `vaEffettivo` |
| **FOR insufficiente** | −(FOR richiesta − FOR) | A 7.1.6 | ✔ componenti dell'arma |
| **Armatura indossata** | penalità agli attacchi ravvicinati | A 7.11.1 | ✔ componenti dell'arma |
| **Specializzazione** | +1 VA e +1 danno | §8.8.1 | ✔ componenti dell'arma |
| **Precisa X, SIN** | +X VA | A 7.1.3, 7.15.1 | ✔ componenti dell'arma |

## 3. Talenti che modificano gli attacchi ravvicinati

«Numerico» vuol dire che l'effetto si esprime come VA, danno, moltiplicatore, penalità ridotta o Azioni, sotto una condizione che la situazione può dichiarare. «No» vuol dire effetti di posizione, di tempo o di scelta, che restano promemoria.

### 3.1 Talenti Liberi (§8.6)

| Talento | Effetto | Numerico? |
|---|---|---|
| Schermidore (8.6.6) | due armi ravvicinate: −4 → −2 | sì |
| Duellante (8.6.5) | due armi miste: −4 → −2 | sì |
| Ambidestro (8.6.1) | elimina il −4 della mano non dominante; non si somma ai due precedenti | sì (dipende da A.23) |
| Affondo Migliorato | +1 → +2 danni; Sanguinamento 1 → 2 | sì |
| Spazzata Migliorata | −4 / −6 → −2 / −4 | sì |
| Stordire Migliorato | −6 → −4 | sì |
| Sbilanciare Migliorato | −4 → −2 | sì |
| Disarmare Migliorato | −4 → −2 | sì |
| Colpo Mirato Migliorato | +2 / +2 → +4 / +4 | sì |
| Carica Migliorata (8.6.4) | Carica e Controcarica ×2 → ×3, anche con Magistrale | sì |
| Incalzare Migliorato (8.6.4) | Incalzare infligge anche il danno normale | sì (danno sì/no) |
| Imboscata Migliorata (8.6.4) | elimina il −2 | sì |
| Arti Marziali | dado senz'armi 1d6; con la Disciplina del Lottatore si usa il dado più alto | sì |
| Arti Marziali Migliorate | +1 VA senz'armi (e +1 alle Difese contro ravvicinati mentre combatte senz'armi) | sì |
| Combattere alla Cieca | bersaglio non visibile: −8 → −4 | sì (con la situazione) |
| Immobilizzare Istintivo | danno senz'armi sulla presa iniziale | sì (danno sì/no) |
| Immobilizzare Migliorato | −2 alla fuga del bersaglio | no per l'attacco (promemoria) |
| Colpo di Opportunità Istintivo | 2 Attacchi di Opportunità per Round | no (conteggio) |
| Apertura Tattica | attacco fuori Iniziativa con 1 AzP | no (quando) |
| Successo Magistrale Migliorato | anche un 2 naturale che supera la Prova è Magistrale | no nel VA; entra nell'esito (§1.6) |
| Copertura Tattica / Copertura Migliorata (8.6.7) | penalità della Copertura ridotte o aumentate | sì (con la situazione) |
| Difesa con Due Armi (8.6.7) | −2 a chi lo attacca in ravvicinato | sì, ma difensivo: vale per gli attacchi contro il personaggio |

### 3.2 Talenti di Classe

| Classe · Talento | Effetto | Numerico? |
|---|---|---|
| Lottatore · Addestramento al Combattimento Senz'Armi (I) | Disciplina scelta per sempre. Dado senz'armi per Disciplina e Grado: Potenza 1d8/1d10/1d12, Rapidità 1d4/1d6/1d8, Controllo 1d4/1d6/1d8, Guardia 1d6/1d8/1d10. Potenza: −1 alle proprie Difese dopo un attacco senz'armi. Rapidità: +3 Iniziativa e 1 Q gratuito. Controllo: +2 / +4 / +6 alle Prove offensive di Corpo a corpo per Immobilizzare, Sbilanciare, Disarmare, Incalzare, Stordire. Guardia: +1 / +2 / +3 alle Difese contro i ravvicinati | sì. Serve la **scelta della Disciplina** nel personaggio. Potenza: promemoria di sessione |
| Lottatore · Raffica di Colpi (III) | Manovra: 2 attacchi senz'armi a −2 | sì |
| Lottatore · Combattimento Multiplo (V) | Spazzata senz'armi su tutti gli adiacenti | sì |
| Lottatore · Punto Debole (a scelta) | ×2 (×3 con Magistrale) dopo 1 AzP di studio | sì |
| Lottatore · Padronanza della Disciplina (a scelta) | toglie il −1 di Potenza; Rapidità: il Q gratuito non provoca Attacchi di Opportunità; Controllo: il bonus vale anche per resistere | parziale |
| Lottatore · Parata a Mani Nude (a scelta) | permette di parare senz'armi | no (abilita una Difesa) |
| Assaltatore · Carica Brutale (a scelta) | +2 al danno base della Carica, prima del moltiplicatore | sì |
| Assaltatore · Coordinazione Offensiva (a scelta) | +1 VA in ravvicinato contro un bersaglio adiacente a un alleato cosciente | sì (con la situazione) |
| Assaltatore · Scudo Aggressivo (a scelta) | dopo un attacco con lo scudo andato a segno, −2 alla prossima Difesa del bersaglio | no per il proprio attacco (promemoria) |
| Assaltatore · Spinta d'Impatto (a scelta) | spinge di 1 Q dopo ≥ 1 danno oltre l'AR | no (effetto di posizione) |
| Assaltatore · Mantenere la Posizione (I), Presidio di Combattimento (V), Interposizione Armata | resistenze, +2 alle Difese proprie e di un alleato, cambio di bersaglio | difensivi (fuori da `attacco.js`) |
| Incursore · Rapidità Operativa (III) | +2 Iniziativa; +2 VA al primo attacco del combattimento (ravvicinato o a distanza entro 10 Q) | sì (con la situazione «primo attacco») |
| Incursore · Attacco Silenzioso (a scelta) | +2 VA contro un bersaglio ignaro (ravvicinato o arma silenziata entro 10 Q) | sì (con la situazione) |
| Incursore · Punto Vitale (a scelta) | 1 per Round, con Colpo o Tiro Mirato entro 10 Q: +2 danni **dopo** l'AR, solo se ≥ 1 danno la supera, mai moltiplicato | sì (effetto dopo l'Armatura) |
| Incursore · Movimento Tattico (I) | riduce di 2 le proprie penalità di movimento (Scatto −4) | sì (penalità propria in movimento) |
| Incursore · Colpisci e Sparisci (V) | divide il Passo prima e dopo l'attacco | no |
| Lestofante · Colpo Sleale (I) | 1 per Round, contro un bersaglio ignaro, ingaggiato con un altro avversario, o dopo aver esaurito le AzP: Ferire +2 danni, Spostare 1 Q o Distrarre | parziale: Ferire è numerico |

**Già oggi, fuori da questa voce.** Nessun Talento di Classe ha `effetti` strutturati in `classi.json`. Per questo il +3 Iniziativa della Disciplina Rapidità e il +2 Iniziativa di Rapidità Operativa **non entrano** nell'Iniziativa calcolata della scheda (vedi §4.3).

## 4. Proposta di modello

### 4.1 Modulo puro `src/attacco.js`

```js
/**
 * @param scheda    risultato di calcolaScheda (con la sessione: vaEffettivo e scomposizione ci sono già)
 * @param richiesta { arma: uid | 'senz_armi', impugnatura: 'una_mano' | 'due_mani', seconda?: uid,
 *                    manovra: id, opzioni: { bersagli?, percorsoQ?, preparato? },
 *                    situazione: { bersaglioATerra, bersaglioHaCaricato: '3-6' | '7-12', movimentoBersaglio: 'passo' | 'corsa' | 'scatto',
 *                                  evasivoMigliorato, coperturaBersaglio: 'leggera' | 'media' | 'totale', coperturaMigliorataBersaglio,
 *                                  dallaCopertura, bersaglioNonVisibile, nonPercepito, bersaglioIgnaro, alleatoAdiacente,
 *                                  primoAttacco, manoNonDominante, estrazioneIncorporata, imboscata, circostanze: −8…+8 } }
 * @returns { ammessa, motivo, azioni: { movimento, principali, nota },
 *            attacchi: [{ etichetta, prova: { tipo: 'per colpire' | 'contrapposta', abilita, contro },
 *                         va, scomposizione: [{ etichetta, valore, fonte }],
 *                         danno: { formula, bonus, moltiplicatore, conMagistrale, dopoArmatura: [...] },
 *                         effetti: [...] }],
 *            dopo: [promemoria per la sessione: «−4/−6 a chi lo attacca fino alla sua Iniziativa», «Potenza: −1 Difese»…],
 *            avvisi }
 */
export function calcolaAttacco(scheda, richiesta, dati)
```

Come lavora:
1. **Base.** Parte dall'arma già calcolata: `equipaggiamento.armi[i]`, con `vaEffettivo` e `scomposizione`, che contengono regole, equipaggiamento e condizioni. Per «senz'armi» usa un profilo in `regole.json` (Corpo a corpo, danno base, Disciplina, Arti Marziali).
2. **Compatibilità.** La Manovra è ammessa se è fra le `manovre` dell'arma o è una Manovra generale, e se rispetta mani, Contatto, numero di bersagli e percorso della Carica. Altrimenti `ammessa: false` con il motivo, come fa `puoOperare` per il Chroma.
3. **Scomposizione.** Aggiunge le voci con la fonte, con la stessa forma dei valori effettivi, così il tooltip ▼/▲ si riusa:
   - `manovra` («−4 Affondo»);
   - `talento` («+2 Spazzata Migliorata», «+1 Coordinazione Offensiva»);
   - `situazione` («+2 bersaglio A Terra», «−4 estrazione nell'attacco»);
   - `circostanze`.
4. **Danno** secondo l'ordine del §5.13:
   - bonus ordinari: Specializzazione, Colpo Mirato, Affondo, Carica Brutale, Colpo Sleale;
   - moltiplicatore più alto: Carica ×2 o ×3, Punto Debole ×2;
   - `conMagistrale`: ×1 → ×2, ×2 → ×3, ×3 → ×3;
   - `dopoArmatura`: Sanguinamento, PS Tempra/Stordito, Punto Vitale +2 (non moltiplicato), Spinta d'Impatto.
5. **Azioni** dalla Manovra (1 AzP; AzM + AzP; 2 AzP complessive), con le regole del 12° livello (seconda AzP; due armi ×2; Raffica di Colpi ×2).
6. **Più attacchi.** Due armi, Raffica di Colpi e Spazzata restituiscono più voci in `attacchi` (una per attacco o per bersaglio) con la stessa Prova o Prove distinte, come dice la Manovra.

Il modulo non tira dadi e non applica niente alla sessione. Restituisce valori e promemoria; il tiro lo fa il giocatore, come per le altre utility.

### 4.2 Dati da strutturare

In **`regole.json`**, nuovo blocco `combattimento_ravvicinato`:
- **`manovre`**: un oggetto per Manovra, con:
  - `id`, `nome`, `paragrafo`;
  - `azioni: { movimento, principali, complessive? }`;
  - `va` (numero, oppure `per_bersagli: { "2": -4, "3": -6 }`);
  - `danno: { bonus?, moltiplicatore?, nessuno? }`;
  - `dopo_armatura: { sanguinamento? | salvezza?: { tipo: "Tempra", stato: "stordito" } }`;
  - `prova: { tipo: "per colpire" | "contrapposta", abilita: [...], contro: [...] }`;
  - `requisiti: { compatibilita: "arma" | "generale", contatto?, mano_libera?, bersagli_max?, percorso_q?: [3, 12], distanza_min_q? }`;
  - `incompatibili: "offensive" | [id]`;
  - `migliorata: { talento, va?, danno?, moltiplicatore?, … }`;
  - `livello_12` (cosa cambia con la seconda AzP).
- **`carica`**: tabella distanza → penalità propria, penalità degli avversari, moltiplicatore (§5.6).
- **`due_armi`**: penalità −4, Talenti che la portano a −2 per tipo di combinazione, esclusioni (§5.7).
- **`situazioni`**: un oggetto per voce della tabella del §2, con `va`, `fonte` e l'eventuale `talento` che la cambia (Combattere alla Cieca, Copertura Tattica/Migliorata, Imboscata Migliorata, Estrazione Rapida, Ambidestro, Movimento Evasivo Migliorato).
- **`magistrale`**: `{ raddoppio: 2, da_x2: 3, massimo: 3 }` (§1.6). Oggi la regola è solo nel testo.
- **`senz_armi`**: Abilità Corpo a corpo, portata 1 Q, danno base (A.22), dado di Arti Marziali, tabella della Disciplina del Lottatore per Grado.

In **`classi.json`** e **`talenti_liberi.json`**: il campo `effetti` sui Talenti numerici delle tabelle §3.1–3.2. Per i Talenti di Classe il campo non esiste ancora (oggi solo i Talenti Liberi ce l'hanno). Le versioni «Migliorate» possono restare dentro la Manovra (`migliorata.talento`) invece di duplicarsi sul Talento.

Nel **catalogo**:
- `manovre` sugli attacchi degli scudi (Scudo Punisher: generali + Stordire);
- `immobilizzare: { portata_q, abilita }` per Frusta e Catena (A 7.1.5), oggi solo testo in `proprieta`;
- l'effetto di «Parata avversaria −2» come effetto strutturato della proprietà.

Nel **personaggio**:
- la **Disciplina del Lottatore** come scelta permanente al I Grado (parametro del Talento, come le Salvezze di Prova Salvezza Migliorata);
- in **sessione**, i promemoria di un Round (Potenza −1 Difese, «ha caricato», Punto Debole preparato, primo attacco del combattimento già fatto). Sono facoltativi: senza, l'utility chiede la situazione ogni volta.

### 4.3 Da fare comunque, anche senza l'utility

Il +3 Iniziativa della Disciplina Rapidità e il +2 Iniziativa di Rapidità Operativa (Incursore III) oggi non entrano nell'Iniziativa della scheda: la scheda sbaglia l'Iniziativa di chi li ha. Si corregge con `effetti.iniziativa` sui Talenti di Classe; per la Disciplina serve prima la scelta del §4.2. Proposta: farlo nella prima sessione, insieme ai dati.

### 4.4 Punti ambigui (per `docs/per-davide.md`, sezione A)

22. **Danno base degli attacchi senz'armi.** Nessun manuale lo dà per chi non è Lottatore e non ha Arti Marziali, che lo «porta» a 1d6. Qual è? Per esempio 1d3, oppure 1d4 come la Disciplina Rapidità?
23. **Il −4 della mano non dominante.** Ambidestro «elimina il normale −4 VA quando si usa soltanto la mano non dominante», ma nessun paragrafo definisce questo −4. Quando si applica? Solo attaccando con un'arma nella mano non dominante (la mano dominante sta nell'anagrafica)? Nel Combattere con due armi il secondo attacco ha solo il −4 della manovra, o anche questo?
24. **Incalzare: che Prova?** Il §5.5 dice «un attacco ravvicinato o senz'armi a −4 VA», quindi un attacco contro le Difese del bersaglio. Però la Disciplina Controllo elenca Incalzare fra le «Prove offensive di Corpo a corpo», come le Manovre contrapposte. È una Prova per colpire contro le Difese, o contrapposta (e contro cosa)?
25. **Copertura nel ravvicinato.** Le penalità del §5.8 (−2 Leggera, −4 Media) valgono anche per gli attacchi ravvicinati, per esempio contro un avversario dietro un muretto a portata di lancia? O solo a distanza?
26. **Ingaggio multiplo.** Il manuale non dà un malus per chi è ingaggiato da più avversari, né un bonus per chi attacca in superiorità numerica (oltre a Coordinazione Offensiva e Colpo Sleale). È voluto, e resta al modificatore di circostanza del §1.4? O manca una regola?
27. **Spazzata: «adiacenti» a chi?** «Fino a tre bersagli adiacenti»: adiacenti all'attaccante, o fra loro? Con un'arma a portata 2–3 Q (lancia, frusta) si possono colpire bersagli entro la portata ma non adiacenti?
28. **Sbilanciare e Disarmare: chi sceglie la difesa?** «Contro Atletica o Difese» (Sbilanciare) e «contro Corpo a corpo o Abilità dell'arma impugnata» (Disarmare): sceglie il bersaglio il valore migliore?
29. **Colpo Mirato e bonus al danno con il Magistrale.** Secondo il §5.13 i +2 (o +4) del Colpo Mirato sono bonus ordinari, quindi raddoppiati dal Magistrale. È così anche per Affondo (+1/+2) e Carica Brutale (+2, detto esplicitamente)? Proposta: sì per tutti, perché vengono prima del moltiplicatore.

### 4.5 Stima

| Sessione | Contenuto |
|---|---|
| 1 | Dati: `regole.json` → `combattimento_ravvicinato` (Manovre, Carica, due armi, situazioni, Magistrale, senz'armi) e validatore. Campo `effetti` sui Talenti di Classe numerici e Disciplina del Lottatore come scelta, con la correzione dell'Iniziativa (§4.3). `manovre` degli scudi, Frusta e Catena strutturate. Test sui dati. |
| 2 | `src/attacco.js` con i test presi dagli esempi e dalle regole del manuale: Carica ×2 → ×3 con Magistrale; Carica Migliorata ×3 che resta ×3; Carica Brutale +2 prima del moltiplicatore; Spazzata −4/−6 e Migliorata; Affondo e Sanguinamento; due armi con Schermidore/Duellante; Punto Debole ×2/×3; Punto Vitale dopo l'AR non moltiplicato; Colpo Mirato su due Round; 12° livello. |
| 3 | Interfaccia nella tab Combattimento: «Attacca» per ogni arma impugnata (e senz'armi) → Manovre compatibili → situazione → VA con la scomposizione ▼/▲, danno con il moltiplicatore e la versione Magistrale, Azioni, promemoria dopo l'attacco. Verifica a 375 px e a tema scuro. |

In totale **3 sessioni**. Le risposte A.22–A.24 servono prima della sessione 1 (profilo senz'armi, mano non dominante, Prova di Incalzare). Le altre possono arrivare prima della sessione 2: finché mancano, l'app usa le proposte e le segnala come «provvisorie».
