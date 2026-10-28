# Manuali del 27–28/10/2026: che cosa cambia per l'app (ricognizione, 28/10)

Solo ricognizione: nessun dato, codice o personaggio toccato. I testi nuovi sono stati scaricati da Drive (export
Markdown) e confrontati riga per riga con quelli recepiti (`docs/manuali-txt/`), togliendo le differenze di sola
formattazione (escape `\+`, `\.`). **`docs/manuali-txt/` non è ancora aggiornata**: lo fa il primo lotto (vedi B).

## Versioni lette

| Doc | ID | Modificato (UTC) | Edizione letta | Recepita dall'app |
|---|---|---|---|---|
| Manuale del Giocatore | `110LNyYLZFWRGYuym836EqKYOUvoQRYvqBzm_2bJqybc` | 2026-10-27 21:27 | **0.50** | 0.49 |
| Manuale della Magia | `1F5npdIujLUEVcHVX6CvF5jOHNMG5LS7dx0tgklDpzAY` | 2026-10-27 21:28 | **1.7** | 1.6 |
| Manuale degli Armamenti | `1eDZJHfgBIYPvzKg78tEGwiLtrI_6gzpQOIfJA9aYiYg` | 2026-10-27 21:27 | **0.65** | 0.64 |
| Manuale dell'Equipaggiamento | `1bvTeJphQ6BNKazpV5twivvRbqkHrRowNBDZ_RakQiXA` | 2026-10-28 09:36 | **0.13** | 0.8 |
| Manuale dei Veicoli | `1lo_c3KLK7kntJwv195v5aD2ieuMfRuaThsDhPJCX3T4` | 2026-10-28 09:37 | **0.8** | 0.2 |
| ASA Scout MK4 — scheda | `1DgvIVekDypu7UKHup-SHSSKCzuK_R-l75Xd9kPsRhHY` | 2026-10-27 22:28 | **0.4** (titolo del Doc; dentro dice ancora «Edizione 0.2») | 0.2 |
| Manuale dei Mostri | `11Uxmz9GM2vU2knngtIPk_80532ABlHC3xL8ZvAXX7rE` | 2026-10-25 00:55 | **0.23** (stessa edizione, profilo del Dragomedusa aggiunto il 25/10) | 0.23 senza il Dragomedusa |
| E&L – Risposte e correzioni approvate | `1VaqZaAe4NK5P8A956Eahua_ZT60eh3ohnR2xSqh-tVs` | 2026-10-15 23:21 | **invariato** | — |
| per-davide.md | `1Jg5rqbBtcHGE1E10xYElO_qCDCwh8K87LAInovtpF6A` | 2026-10-28 12:34 | applicato il pacchetto unico del 27/10; **nessuna risposta nuova di Davide** | — |

Nella cartella di Davide non ci sono altri Doc nuovi o cambiati dopo il 20/10.

## Il filo comune: i NEC non si misurano più in Lx

Quasi tutto quello che è cambiato in Giocatore, Magia, Armamenti, Equipaggiamento e Veicoli è **una sola riforma
dell'energia** (Equipaggiamento §5.4, riscritto per intero):

- **Niente più Lx.** Le riserve sono in **Unità Energetiche** per colore: UER (Rossa), UEB (Blu), UEV (Verde). Un
  **Modulo** = 10 UE, un **Banco** = 100 UE dello stesso colore. 1 UE ripristina **10 cariche personali**. Energia
  sfusa 10 cr per UE. I tre colori non si convertono fra loro né in PM.
- **Colori per effetto** (§5.4.1): Rosso = motori, calore, **Plasma, Fuoco, Laser**; Blu = scudi energetici,
  Elettricità, Concussivo, Gelo, Traiettoria; Verde = elettronica, sensori, comunicazioni, luce, supporto vitale.
- **Elettronica personale ordinaria senza conteggio** (§5.4.3): torce, comunicatori, mirini, visori, sensori,
  elettronica degli elmetti, diagnostica portatile **non si contano più** (né ore né cariche): la ricarica è nei
  normali rifornimenti. Il Direttore dà un'autonomia semplice solo in emergenza.
- **Un contatore solo per riserva** (§5.4.2): colpi o cariche per le armi, ore per i dispositivi autonomi
  (verricello, utensile motorizzato, tuta extraveicolare 40 h, riparo 20 h), preparazioni per il fornello (10),
  chilometri per i veicoli, giorni per un campo.
- **Ricarica degli effetti speciali** (§5.4.6–5.4.7): solo con **trasformatore dedicato** o stazione industriale e
  una fonte dello stesso colore. Il trasformatore preleva 1 UE (= 10 cariche) e tiene il resto in un **tampone** da
  0 a 10 cariche. Portatile: 1 carica all'ora; industriale: 1 ogni 10 minuti. Servizio commerciale **10 cr per
  carica**. Tre modelli: portatile monocromatico 3.000 cr, multicromatico 6.000 cr, stazione industriale 20.000 cr
  (con peso, PI, Qualità e REP). Il «Caricatore da campo» degli Armamenti non c'è più.
- **Campo attrezzato** (§5.4.9): 1 UER + 1 UEV al giorno fino a 10 persone.

## A. Le differenze, manuale per manuale

### Manuale del Giocatore 0.50 (da 0.49)

**Cosa cambia:** solo le frasi sui NEC delle dotazioni (§2.16 e le dotazioni di Classe): spariscono le capacità in
Lx e le ore di autonomia di torce, comunicatori, registratori, rilevatori, corredi, lanterne, terminali; al loro posto
«l'elettronica ordinaria non richiede conteggio energetico» (26 righe, tutte di questo tipo). Una riga nuova riassume
la riforma (UER/UEB/UEV, 10 cariche per UE, armi e mezzi con il loro contatore).

**Talenti, Maestrie e Specializzazioni: il manuale NON ha recepito il documento del 7/10.** Il cap. 8 è identico alla
0.49 (nessuna «Maestria» o «Specializzazione» come categoria, solo i Talenti Liberi di prima). **La regola di
precedenza resta**: per i Talenti vale il documento v1.0 del 7/10 con le risposte A.181–A.185 (lotti 120–125); per il
resto vale il manuale. Ricarica Migliorata (§8.6.4, Talenti di prima) dice già **4 cartucce**: la voce del Doc
«§8.6.4 dice ancora fino a tre» era sbagliata (vedi C).

**Cosa tocca nell'app:** i testi delle dotazioni (`data/dotazioni.json`, 11 righe con Lx) e il catalogo delle
dotazioni personali, con il lotto NEC (B, lotto 1). Nessun numero di regola, nessun calcolo.

**Cosa non tocca:** Talenti, Abilità, Classi, combattimento, Tecniche: invariati.

### Manuale della Magia 1.7 (da 1.6)

**Cosa cambia:** una riga (sez. 6, cristalli e NEC): «Lx» → «UE», e la precisazione che per ricaricare cariche
tecnologiche serve stazione o trasformatore; la vicinanza a una Matrice non basta.

**Cosa tocca nell'app:** nulla di calcolato; le note di `artefatti.json` che citano «Lx» (4) si allineano nel lotto
NEC. **Né A.174 («Ricarica e medita») né A.176 (incantesimi aggiunti a mano) sono toccate.**

### Manuale degli Armamenti 0.65 (da 0.64)

**Cosa cambia:**
1. **Celle e pacchi d'arma in cariche** (§7.20.5–7.20.6): le celle a distanza (Plasma commerciale 20 colpi, Hellblazer
   30, KEP 808 10, Intruder 30) diventano **NEC Rossi** (erano Blu), una carica per colpo; la cella ravvicinata comune
   (5 attivazioni) è Rossa per Plasma/Fuoco, Blu per Elettricità/Concussivo. **Ricarica 10 cr per carica** (prima
   0,01 cr/Lx: 2,5–7,5 cr per cella): ricarica completa Plasma 200 cr, Hellblazer 300, KEP 100, Intruder 300.
2. **Lanciafiamme Rossi** (erano Blu): Nemesis 214 (5 getti), commerciale ed Eruptor (10), Purifier (15),
   Gehemmapuker (**pacco dedicato da 50 cariche, «non un Modulo generico»**). Ricarica 50/100/100/150/500 cr.
3. **Katana Ryūjin**: cella NEC **Rossa** da 5 cariche (era Blu da 250 Lx); ricarica 50 cr.
4. **NEC Blu IAS** (20 cariche): ricarica 10 cr a carica, **200 cr da vuota, 20 ore** col portatile o 3 h 20 con la
   stazione (prima 50 cr in un'ora).
5. **Caricatore da campo tolto**, sostituito dai **Trasformatori di ricarica** (rimando all'Equipaggiamento §5.4).
6. **Elettronica ordinaria** (mirino laser, torcia tattica, visori, elmetti elettronici, CS-R20): niente più consumo
   né ore; restano NEC compreso e ricambio (10/100 cr).
7. **Nuovo scudo: Variante Punisher Wächter** (dopo il §7.4.1): Punisher dell'Alleanza con generatore NEC Blu da 3
   cariche; **Barriera personale** (1 carica, 15 ScE, 3 Round, frontale, si muove) o **Cupola** (3 cariche, 30 ScE
   condivisi, raggio 1 Q, portatore fermo, nessuno entra né esce); gli ScE assorbono solo danno Naturale, prima
   dell'AR. **Prezzo e REP da definire.**
8. Postazione medica da campo: Modulo Rosso da 10 UER = 5 ore, 2 UER per un'ora.

**Cosa tocca nell'app:** `data/equipaggiamento/munizioni.json` (celle, pacchi, ricarica), `nec.json`, `regole.json`
→ `nec` (`tariffa_cr_per_lx`, `impulso_blu_lx`, `colori`, `formati`, `travaso`), `armi_corporative.json`
(Ryūjin, IAS), `accessori_armi.json`, `elmetti.json`, `rinforzi.json`, `src/ricarica.js` (ricarica dalle riserve),
la tab Combattimento («Ricarica») e l'Inventario; il Wächter è una voce nuova di `scudi.json` con un'attivazione
(cariche e ScE al tavolo). Il caricatore da campo esce dal catalogo con migrazione (`index.json` → `rif_sostituiti`).

**Cosa non tocca:** danni, gittate, AC, INC delle armi; Contromisure; Magia.

### Manuale dell'Equipaggiamento 0.13 (da 0.8)

**Cosa cambia:** il §5.4 riscritto (vedi sopra) e, a cascata, ogni scheda con un NEC (illuminazione, fornello,
verricello, tuta extraveicolare, riparo, comunicatori, visori, registratori, corredi, postazioni, laboratori,
scanner, postazioni medicochirurgiche). Prezzi cambiati: ricarica del Modulo Rosso delle postazioni medicochirurgiche
**50 → 100 cr**; set di Moduli Standard 150 → 200, Professionale 250 → 300, Specializzata 350 → 400 cr; Modulo
commerciale 600 cr carico / 500 vuoto; Banco 6.000 / 5.000.

**Capitoli 5, 7 e 8:** c'erano già nella 0.8 (e nell'app: «tutti i capitoli dell'Equipaggiamento 0.5 sono nel
catalogo»). La 0.13 non aggiunge né toglie capitoli: l'indice è identico, cambiano solo i titoli del §5.4.

**Oggetti, artefatti e consumabili:** Hachimaki, Tomo dei Guardiani, Guanti da Combattimento Mistico, Batterie
Mistiche, Matrice e Schegge **non sono cambiati** (nessuna riga diversa). La «Cartuccia Stabilizzante» non compare in
nessun manuale con questo nome (nell'app sta in `sanitario.json`): nessun cambiamento da recepire.

**Cosa tocca nell'app:**
- `data/equipaggiamento/*.json`: 64 voci con `alimentazione` in Lx (`consumo_lxh`, `autonomia_ore`); per
  l'elettronica ordinaria il contatore **sparisce**, per i dispositivi autonomi resta **in ore o preparazioni**;
- `sessione.nec` e `src/equipaggiamento.js` → `riserveNec` (i − e + della riga dell'Inventario), quadratini del foglio 4
  della SS (`src/stampa.js`, `src/ui/stampa.js`);
- `sanitario.json` (prezzi delle ricariche dei Moduli), `strumenti_professionali.json`, `corredi_dispositivi.json`,
  `comunicazione.json`, `esplorazione.json`, `dotazioni_personali.json`;
- i trasformatori come oggetti nuovi del catalogo.

**Cosa non tocca:** carico, Integrità, cure, impianti cibernetici («non richiedono NEC salvo indicazione espressa»),
artefatti.

### Manuale dei Veicoli 0.8 e scheda ASA Scout MK4 0.4 (da 0.2)

**Cosa cambia:**
1. **Energia dei mezzi in UE e chilometri** (§1): si annota solo il contatore principale. **Autovettura civile:**
   **1 Modulo Rosso da 10 UER = 1.000 km** (era un Banco da 50.000 Lx); 1 UER = 100 km; pieno 100 cr; prezzo 20.000 cr
   col Modulo.
2. **ASA Scout MK4:** stessi profilo, PI, AR, MOV, copriruote, M606, comunicatore ponte e supporto vitale (24 h con 8
   occupanti). L'energia diventa **2 Banchi Rossi = 200 UER**, ma **«consumo e autonomia di viaggio da definire»**,
   **riserva Verde «formato e capacità da definire»**, bombole «da specificare». La dotazione approvata con la A.101
   (200 Lx/km, 500 km, 100 Lx/h da fermo, Modulo Verde 10.000 Lx a 200 Lx/h, aria 8 h + 2 bombole da 8) è in Lx e il
   manuale non la riporta in UE.
3. **Capitolo nuovo: «Neverlost, scheda del veicolo»** (regole consolidate del 25/10): trasporto ASA tecnomistico,
   ingombro 3 × 2 **Q Tattici**; **scale della mappa** (Q Base 1,5 m, Tattica 15 m, Strategica 150 m,
   Intercontinentale, Spaziale); velocità di viaggio e MOV di combattimento in Q Tattici; **Traiettoria** in giorni;
   riserve **in punti** (Rossa 100 punti = 2.000 UER, Blu 10 punti, Verde 30 giorni); Corpo 300 / Propulsione 180 /
   Motore 120 PI, AR 8, Corazzato 2, **scudo energetico 200 ScE** con rigenerazione; armi navali (2 mitragliatori,
   cannone energetico, lanciamissili) con settori e gittate in Q Tattici; manovre speciali; **circuito tecnomistico**
   da 120 PM con tre postazioni da sintonizzare (Occultamento Totale, Ampliamento mistico, Impulso Energetico);
   sostentamento 50 cr per persona al giorno; registro del profilo.

**Cosa tocca nell'app:** `data/veicoli.json` (`profili` → `alimentazione` di autovettura e Scout, `capacita_lx`,
`consumo_lx_km`, `supporto_vitale.verde`), `src/veicoli.js` (`energia`, `consumaRisorse`,
`installaRicambioEnergia`, migrazione del vecchio `nec: { lx }`), tab Veicoli e foglio Veicoli della SS; il registro
unico dei veicoli (`veicoli/`) con le riserve in Lx già salvate. La Neverlost richiederebbe un profilo di tipo nuovo
(aereo/spaziale), le scale tattiche sulla mappa, lo scudo ScE e le armi navali: lavoro grosso.

**Cosa non tocca:** regole di movimento, manovre, collisioni, inseguimenti, riparazioni dei mezzi terrestri.

### Manuale dei Mostri 0.23 (aggiunta del 25/10)

**Cosa cambia:** solo **un profilo nuovo, «Dragomedusa giovane e adulto»** (sostituisce i valori precedenti del
dragomedusa, che nell'app non c'era): adulto 1.600 PV, AR 24 (18 + 6 magica), 3 AzP e 1 AzM, Artigli 6d10 × 5,
Morso 8d10 × 5, Soffio di Fulmine 12d10 × 5 Magico in linea 18 × 2 Q Tattici (20 PM, una volta ogni 3 Round), Cattura
con filamenti (VA 18, 4 Q Tattici) contrapposta a Pilotare, **Assorbimento 25 UER per azione dai banchi Rossi** dei
veicoli; valori secondari completi solo per l'adulto. Il giovane (900 PV, AR 18) ha valori secondari «da definire».
**GS e PX da rivalutare** (il vecchio adulto era Leggenda, 100 PX). Interagisce con l'Impulso Energetico della
Neverlost.

**Cosa tocca nell'app:** `data/bestiario.json` (una creatura nuova) e, nello stesso commit, la pagina del bestiario
online (`node tools/bestiario_pagina.mjs`) e `docs/bestiario/bestiario.html`. I danni ai veicoli e l'Assorbimento si
applicano a mano dalla plancia («Colpito» del veicolo, riserva del mezzo).

**Cosa non tocca:** le altre 215 creature e le regole comuni (differenze di sola formattazione).

### Decisioni approvate che i manuali nuovi contraddicono (non cambiate: domande in C)

| Decisione approvata | Manuale nuovo | Domanda |
|---|---|---|
| **76 (A.67)** «l'energia di un NEC non si riversa in un altro; si sposta solo il NEC fisico» (`regole.json` → `nec.travaso`) | Equipaggiamento §5.4.6: il trasformatore preleva 1 UE da una fonte e la trasferisce, con un tampone, negli accumulatori | A.189 |
| **76 (A.67)** Gehemmapuker su `nec:modulo-blu` da 2.500 Lx, 50 getti, cambio 1 AzP | Armamenti §7.20.6: pacco dedicato **Rosso** da 50 cariche, «non un Modulo generico»; tutti i lanciafiamme Rossi | A.190 |
| **75 (A.64)** NEC Blu IAS: ricarica 50 cr in 1 ora | Armamenti 0.65: 10 cr a carica, 200 cr da vuota, 20 ore col portatile / 3 h 20 con la stazione | A.191 |
| **94 (A.101)** ASA Scout: 200 Lx/km, 500 km, 100 Lx/h da fermo, Modulo Verde 10.000 Lx a 200 Lx/h, aria 8 h + 2 bombole da 8 | Scheda 0.4: 200 UER, autonomia e riserva Verde «da definire», bombole «da specificare» | A.192 |
| **78 (A.66)** fornello: NEC Rosso 500 Lx, 50 Lx a preparazione | Equipaggiamento 0.13: 10 preparazioni, 5 cr in un'ora | **nessuna**: stessa regola senza Lx |

Inoltre, senza una decisione precedente ma con un effetto sui **dati già salvati**: personaggi e veicoli hanno riserve
in Lx (`sessione.nec`, celle d'arma, banchi dei mezzi) e il Manuale dei Mostri dice che «l'equivalenza UER/Lx non è
definita» → A.193.

### Voci della sezione 4 del Doc «Da correggere» che Davide ha sistemato

| Voce | Esito nei manuali nuovi |
|---|---|
| §2.16.3 e §2.16.4: «Il binocolo non richiede batterie» → NEC | **Sistemata** (dice «non richiede NEC» ovunque) |
| Manuale dei Mostri §5.2: «5 punti Abilità liberi» → 7 | **Sistemata** (dice 7, compreso il primo Grado) |
| §8.6.4 Ricarica Migliorata «fino a tre» (voce aggiunta il 27/10) | **La voce era sbagliata**: il Giocatore dice 4 cartucce già nella 0.49. Resta da correggere solo il documento v1.0 (Ricarica Esperta) |
| §8.6 Attivazione Tempestiva fuori sottosezione | Non sistemata |
| §3.5.3 Bersaglio Designato (impaginazione del PDF) | Non verificabile sul Doc (era il PDF) |
| Magia: riga «Ambito» di Potenziale Mistico Migliorato | Non sistemata |
| Armamenti §7.10: SnT 0 delle sole passive soggetta alla maggiorazione | Non sistemata (dice ancora «SnT 0, qualunque sia la sua potenza») |
| Armamenti: «Imperiali» / «Imperial» | Non sistemata (21 «Imperiali») |
| Armamenti §7.9: tabelle prezzi a distanza di Fratellanza, Imperial, Mishima | Non verificata riga per riga; il §7.9 non è cambiato |
| «Articolazione da tiro» / «di tiro» | Non sistemata (1 «da», 4 «di») |
| Ashigaru «Manutenzione agevolata» | Non sistemata |
| §7.11.5 «Agenti equipaggi e Guardie» (virgola) | Non sistemata |
| Scudo Punisher «Grande» o «Medio» | Non sistemata, e il Wächter aggiunge «Medio o Grande» |
| M310 e SA SG2001: caricatore amovibile da esplicitare | Non sistemata |
| Equipaggiamento §4.1: «batteria carica» → «NEC Verde carico» | Non sistemata |

## B. Proposta di lotti

> **Rivista la sera del 28/10:** la tabella aggiornata è nella «Parte 2», sezione D (lotti 1 e 3 fatti; Bestiario 0.46 e modelli PNG aggiunti; lotto 2 sbloccato per metà dal registro NEC).

In ordine di utilità al tavolo; un ambito per lotto. «Prima della partita» = da fare prima della prossima sessione.

| # | Lotto | Ambito | Modello | Quando |
|---|---|---|---|---|
| 1 | **NEC: elettronica ordinaria senza conteggi** | Salvare i testi nuovi in `docs/manuali-txt/` e aggiornare `versione_manuale` dei file toccati; togliere i contatori (`sessione.nec`, − e + dell'Inventario, quadratini della SS) per torce, comunicatori, mirini, visori, sensori, elmetti, diagnostica; tenere ore/preparazioni per fornello, verricello, utensile, tuta, riparo, postazioni (Modulo da 10 UER); togliere «Lx» da testi e dotazioni; migrazione dei valori salvati che non servono più (si ignorano, non si cancellano) | **Opus** (dati, motore, Inventario, stampa, migrazione) | **Prima della partita**: toglie lavoro inutile al tavolo |
| 2 | **Celle d'arma, pacchi e trasformatori** | Celle e pacchi in cariche e colore (Rosso per Plasma/Fuoco/Laser), prezzi di ricarica 10 cr a carica, Ryūjin, CSA 404, i tre trasformatori nel catalogo con il tampone, caricatore da campo tolto (`rif_sostituiti`); `src/ricarica.js`. Gehemmapuker, IAS e travaso **dopo** A.189–A.191 | **Opus** | Dopo le risposte; se la squadra usa armi al plasma, la parte «colpi rimasti» prima della partita |
| 3 | **A.174 «Ricarica e medita»** | Nome del comando e riepilogo (PM spesi, carica ottenuta, PM recuperati), mai PM non ancora recuperati. Nessun manuale nuovo la tocca | **Sonnet** | **Prima della partita** (piccolo, già deciso) |
| 4 | **Dragomedusa nel Bestiario** | Profilo adulto completo e giovane con i valori dati (secondari «da definire»), Soffio, Cattura, Assorbimento come note per la plancia; pagina online e copia HTML rigenerate. PX/GS dopo A.194 | **Sonnet** | Prima della partita **solo se** Davide pensa di usarlo presto |
| 5 | **Veicoli in UE e chilometri** | Autovettura 10 UER = 1.000 km; Scout 200 UER con l'autonomia di A.192; tab Veicoli e SS in km e UE; migrazione delle riserve in Lx del registro `veicoli/` (A.193) | **Opus** | Dopo A.192/A.193 |
| 6 | **A.176 incantesimi aggiunti a mano come conosciuti** | Apprendimento effettivo (conta come conosciuto anche per prerequisiti, consumabili, insegnamento) o annotazione; nessun accesso alla magia dall'aggiunta. Nessun manuale nuovo la tocca | **Opus** (quote, lancio, prerequisiti, consumabili) | Può aspettare |
| 7 | **Punisher Wächter** | Voce di `scudi.json`, attivazione Barriera/Cupola con cariche e ScE al tavolo (assorbimento prima dell'AR applicato a mano), prezzo e REP dopo A.195 | **Sonnet** | Può aspettare (nessun PG lo ha) |
| 8 | **Neverlost** | Profilo di veicolo aereo/spaziale, scale tattiche della mappa, riserve in punti, scudo ScE, armi navali, circuito tecnomistico e postazioni, sostentamento. Da dividere in sotto-lotti dopo A.196 | **Opus** | Può aspettare: Davide la gestisce sulla scheda |

**Prima della prossima partita:** i lotti **1** (meno conti al tavolo: le schede smettono di chiedere ore di torce e
comunicatori) e **3** (piccolo, già deciso). Il **4** solo se Davide vuole il Dragomedusa al tavolo. Tutto il resto
può aspettare le risposte o non serve subito: oggi l'app continua a funzionare con i valori della 0.8 e del Veicoli
0.2, solo con unità e prezzi di prima.

## C. Domande per Davide

Nel pacchetto `docs/pacchetto-per-davide-2026-10-28.md` (A.189–A.196), con il «nel frattempo» di ognuna.

---

# Parte 2 — i file Word di Davide e la Revisione NEC (sera del 28/10)

Completamento della ricognizione. Nella parte 1 la ricerca su Drive si era fermata alla prima pagina dei risultati
(5 file su 24) e cinque file Word non erano stati visti. Ora sono letti per intero; i testi sono in `docs/manuali-txt/`
(`revisione-nec.md`, `mostri-word.md`, `direttore.md`, `neverlost-scheda-tecnologica.md`, `punisher-wachter.md`).

## A. La ricerca su Drive, corretta

Com'era: una ricerca per titolo o per tipo, senza seguire il `nextPageToken`. Com'è ora (scritto in
`docs/manuali-drive.md`, «Come si cerca su Drive»): ricerca **per cartella** (`parentId` della cartella di Davide),
`pageSize: 100`, **tutte le pagine** fino a risposta senza token, **tutti i formati** (Google Doc, .docx, .pdf, .html,
.xlsx, .zip), poi ricerche per proprietario (Davide, Marcello) con `modifiedTime` recente e per `sharedWithMe`, e
nel riepilogo si dice quante pagine e quanti file.

Rifatta adesso: **24 file in 2 pagine**. Oltre ai cinque Word:

- **Gestore PX v1.3** (html, xlsx con i PX di 50 partite, zip del pacchetto), del 20/10: **mai visto**. L'app ha la v1.2.
  Differenze lette nell'html: il premio di fine Atto va a **tutti i PG, assenti compresi** (come già fatto il 25/10);
  la seconda assegnazione dello stesso Atto è **bloccata** («non può essere duplicato»), mentre l'app **avvisa e non
  blocca**; l'import accetta anche l'HTML. → domanda A.197.
- Già noti: Prontuario Combattimento v1.3 (pdf), Talenti magici e mistici, Modifiche Layout APP, E&L, bozza del
  Bestiario di Marcello, cartella «FILE PG».
- Le altre cartelle condivise (CV, altri giochi) non sono di Davide né di Marcello: ignorate.

## B. La Revisione NEC 1.6, punto per punto contro le domande A.189–A.196

Il documento è il «registro unico delle decisioni approvate e degli aggiornamenti ai manuali» sull'energia, del
28/10, di Davide. Dice che le regole generali stanno nell'Equipaggiamento §5.4 e che i volumi collegati sono allineati
(Equipaggiamento 0.13, Armamenti 0.65 e Wächter 1.1, Veicoli 0.8 e Neverlost 1.5, Giocatore 0.50, Direttore 0.45,
Magia 1.7, Mostri 0.46).

| Domanda | Che cosa dice il registro | Esito |
|---|---|---|
| **A.189** Trasformatore e «niente travaso» (A.67) | «Le cariche degli effetti speciali si acquistano o si ripristinano con strumentazione industriale oppure con un trasformatore dedicato»; il trasformatore preleva una UE dalla fonte e la tiene nel tampone da 10 cariche; tabella del Wächter (3 cariche → 1 UEB, resto 7); tre apparecchi con prezzo, velocità (1 carica/ora, 1 ogni 10 minuti), peso, PI, Qualità, REP. Non cita la A.67. | **Già risposta.** Il trasformatore col tampone è approvato; la A.67 è superata nei limiti del trasformatore (un normale caricatore, i PM e la Matrice non bastano). Va fra le Risposte ricevute |
| **A.190** Pacco del Gehemmapuker | Non nomina il Gehemmapuker. Dice solo che Armamenti 0.65 e Wächter 1.1 sono allineati («colori e cariche, prezzi e tempi, accessori»). | **Resta aperta**, ridotta a un punto: il pacco Rosso da 50 cariche sostituisce il Modulo Blu della decisione 76? |
| **A.191** Ricarica del NEC Blu IAS | «La tariffa approvata di ricarica commerciale è 10 cr per carica ripristinata»: 3 → 30 cr, 5 → 50, 10 → 100, 20 → 200, 30 → 300; portatile 1 carica/ora, stazione 1 ogni 10 minuti (quindi 20 cariche = 20 ore o 3 h 20). | **Già risposta**: i 200 cr da vuota e i tempi dell'IAS sono la tariffa approvata. Fra le Risposte ricevute |
| **A.192** Scout in UE | «Restano da fissare … autonomia di viaggio e sistemi aggiuntivi dello Scout … I valori assenti non equivalgono a uso gratuito.» | **Resta aperta**, ma è già nella lista di Davide: la riformulo come «hai già in lista questi valori; ecco la nostra proposta se ti serve un punto di partenza» |
| **A.193** Riserve salvate in Lx | «Nei profili di gioco i Lx vengono sostituiti da cariche, riserve e autonomia direttamente utilizzabili»; il valore di una UE dello stesso colore è costante; i punti dichiarano le UE «senza conversione universale». Nessuna equivalenza Lx→UE. | **Resta aperta, corretta**: nella domanda avevamo scritto che «il Manuale dei Mostri dice che l'equivalenza UER/Lx non è definita». Era vero per la 0.23 (Dragomedusa); nella 0.46 la frase non c'è più e l'assorbimento è in UER/UEB/UEV. La domanda va riscritta senza quel riferimento |
| **A.194** PX e GS del Dragomedusa | Non lo dice (è nei Mostri). | **Già risposta dal Mostri 0.46** (§7.12): giovane Mito 200 PX, adulto Semidio 400 PX, valori secondari del giovane completi. Fra le Risposte ricevute |
| **A.195** Wächter: prezzo, REP, Taglia | «Restano da fissare: prezzo e Reperibilità del Wächter completo.» La Taglia «Medio o Grande» è ancora nel Wächter 1.1. | **Prezzo e REP: già in lista di Davide**, non sono una domanda. **Resta aperta la sola Taglia** |
| **A.196** Neverlost nell'app | La scheda 1.5 è la «Parte I · Sistemi tecnologici»; i valori sono quelli del Veicoli 0.8. Niente sull'app. | **Resta aperta** |

**Cosa contraddice le nostre domande:** (1) il riferimento ai Mostri in A.193, da togliere; (2) prezzo e REP del
Wächter e i valori dello Scout non sono domande ma attese già dichiarate da Davide; (3) nessuna decisione approvata
(A.64, A.67, A.101) è contraddetta dal registro in modo nuovo rispetto a ciò che avevamo già segnalato.

**Altre indicazioni del registro che l'app deve seguire (lotto 2 e successivi):** Modulo commerciale 500 cr vuoto,
600 carico, ricarica 100 cr; Banco 5.000/6.000, ricarica 1.000; Neverlost: 1 punto Rosso = 20 UER (un Banco Rosso =
5 punti), punto Blu = 100 UEB = 1 Banco, 33.000 cr di pieno, campo attrezzato 1 UER + 1 UEV al giorno; ricariche
mediche 100 cr a Modulo (set 200/300/400 cr, già nella 0.13).

## C. Gli altri quattro file

### Manuale dei Mostri 0.46 (Word) — il Bestiario di riferimento

Il registro NEC dice che per il Bestiario vale il Word 0.46 e che il Google Doc 0.23 «non è allineato per timeout».
**Cosa cambia rispetto alla 0.23 che l'app usa:**

- **Catalogo: 285 creature e 10 modelli PNG** (la 0.23: 215). **Le 214 schede in comune hanno gli stessi GS e PX**;
  nessuna scheda esistente è cambiata nei PX. Le dieci schede di umanoidi della 0.23 («Umanoide goblinoide •
  gregario e incursore»…) diventano Goblin, Hobgoblin, Bugbear, Coboldo, Orco, Gnoll, Ogre, Ettin, Minotauro, Troll
  con PX 11, 22, 33, 11, 22, 22, 33, 55, 55, 70.
- **Nuove: circa 50 draghi** (cuccioli, giovani, adulti e antichi dei cinque cromatici e dei cinque metallici;
  fatati; d'ombra; pseudodrago, mezzodrago, dracolich) con GS da Veterano a **Divinità** e PX 50–800, più una decina
  di animali minori (Gatto, Donnola, Tasso gigante, Lucertola…).
- **Nuova scala del GS oltre Leggenda:** Mito 200, Semidio 400, Divinità 800, Divinità Maggiore 1.600, Entità Suprema
  3.200 (Direttore §9.3.1).
- **Fauna di Iris, capitolo 7:** oltre alla Covata e al Lorath, nuove le schede 7.13 Piovra gigante (Eroe, 70 PX),
  7.14 Granchio modificato, 7.15 Raptor di Fuoco, 7.16 Turk, 7.17 Vespe del Deserto, 7.18 Iene del deserto mutate e
  7.19 Murene della Roccia (cucciolo, giovane, adulta, Madre, Bozzoli): **PX «provvisori»**.
- **Dragomedusa (7.12) completo:** adulto 1.600 PV, AR 24, giovane 900 PV, AR 18; **GS Mito/Semidio e PX 200/400**;
  assorbimento in UER 15/25, **UEB 1/2, UEV 3/5**, batteria mistica 3/5 PM e recupero 3/5 PM; Impulso Energetico della
  Neverlost; confronto aritmetico coi colpi della nave. Risponde ad A.194.
- **Regola nuova dell'Iniziativa delle creature (§4):** «si tira 1d10 e si aggiunge il bonus positivo indicato: una
  Caratteristica bassa non produce un malus di base; INI 0 indica il solo d10». **L'app ha 66 nemici con Iniziativa
  negativa** (−1…−4, soprattutto la Covata): vanno portati a 0. Movimento in Q Base «salvo scala esplicita»; coni con
  larghezza finale pari a metà della lunghezza.
- **10 modelli PNG generici** (Agente, Artigliere, Cacciatore, Assaltatore, Esploratore, Incursore, Lestofante,
  Lottatore, Paramedico, Soldato; i quindici di Lavoratori, Studiosi e Taumaturghi «restano da compilare»): sei Gradi
  ciascuno, matrice EQ 0–5, PX pronti 10–350.

**Cosa tocca nell'app:** `esempi/nemici/mostri/` (225 file oggi), `data/formato_nemici.json` (GS: testo libero, regge
già Mito…; l'Iniziativa va resa non negativa e validata), `data/bestiario.json` e «Crea nemico»/«Prepara scontro» (modelli
PNG Classe/Grado/EQ del Direttore §9.6), la pagina del bestiario online (`tools/bestiario_pagina.mjs`, nello stesso
commit). **Quanto lavoro:** grosso ma regolare. Le schede hanno lo stesso schema a tabelle della 0.23 (si leggono
anche dal .docx, che le ha strutturate): con un importatore dal Word il lavoro è ~70 schede nuove, ~10 rinominate, 66
Iniziative da correggere e i 60 profili PNG; a mano sarebbe come il primo import (26 generatori).

### Manuale del Direttore 0.45 (Word)

**Prima volta che lo leggiamo** (il registro lo aspettava come «regole di malattie e cure, A.119»: **non ci sono**;
resta atteso). È il capitolo 9 soltanto: §9.1 rimandi, §9.2 disponibilità, **§9.3 PX degli incontri**, **§9.4 Titoli**,
§9.5 da sviluppare, **§9.6 PNG generici Classe/Grado/EQ**, **§9.7 rifornimenti ed energia**.

- §9.3 e §9.4 **coincidono già con l'app**: soglie e fattori dei Titoli, un principale al 100% e gli altri al 50%,
  coefficiente dei PG presenti `max(0,5; 1 + 0,10 × (4 − N))`, arrotondamento una volta sola per incontro, dotazione già
  compresa, nessun moltiplicatore del Titolo sui PX degli incontri (`data/px_partita.json`, `src/px-partita.js`).
  Nulla da cambiare nel pannello PX. Nuove sono le fasce GS oltre Leggenda (200…3.200) e le regole d'incontro
  (obiettivo dichiarato prima, premio una volta, caste non combattenti 0 PX, creature evocate separate).
- §9.6 è nuovo: PX del PNG = PX base del Grado × (1 + 0,50 × EQ), con la matrice 10–350, e le modifiche EQ ai valori
  (Iniziativa, VA offensivo, Parata/Schivata, AR, danno, Salvezze, cure). Tocca «Crea nemico» e i PNG del bestiario.
- §9.7 energia: coerente con il lotto NEC; nessun dato nuovo per l'app (campo attrezzato 1 UER + 1 UEV al giorno).
- Tavolo del Master, incontri e Atti: nessun cambiamento oltre ai PX.

### Neverlost 1.5 e Punisher Wächter 1.1 (Word)

- **Wächter 1.1:** **lo stesso testo** del Wächter negli Armamenti 0.65 (31 paragrafi, uno solo in più: il titolo).
  Non aggiunge niente. **Non risponde ad A.195**: prezzo e REP «da definire», Taglia «Medio o Grande».
- **Neverlost 1.5:** è la «Parte I · Sistemi tecnologici» e coincide col capitolo Neverlost del Manuale dei Veicoli 0.8,
  senza il circuito tecnomistico (che resta nel Veicoli). Differenze di formulazione: «MAN tecnologica −1» (0.8: «MAN base
  −1; Assetto armonico +1 → 0»), «Distacco da un aggancio esterno» (0.8: «da filamenti»), il tempo di ricarica
  dell'impianto navale «non si trasferisce ai trasformatori per cariche personali», registro senza Circuito Bianco.
  **Non risponde ad A.196**: non dice nulla sull'app.

## D. Tabella dei lotti rivista

Sostituisce quella della sezione B della parte 1.

| # | Lotto | Modello | Stato e quando |
|---|---|---|---|
| 1 | NEC: elettronica ordinaria e UE | Opus | **Fatto (28/10, lotto 135)** |
| 3 | A.174 «Ricarica e medita» | Sonnet | **Fatto (28/10, lotto 136)** |
| 2 | **NEC armi: celle, pacchi, caricatori, trasformatori, IAS** | Opus | **Può partire ora**: A.189 e A.191 sono risposte dal registro NEC (tariffa 10 cr a carica, trasformatori e tampone, prezzi e tempi). Il Gehemmapuker (A.190) e il Wächter restano fuori fino alle risposte. **Prima della prossima partita solo se il gruppo usa armi al plasma o a energia**; altrimenti subito dopo |
| 4 | **Bestiario 0.46, parte 1: regole, Iniziativa, GS oltre Leggenda, Dragomedusa** | Sonnet | **Prima della prossima partita**: 66 nemici con Iniziativa negativa agirebbero più tardi del dovuto; il Dragomedusa è già utilizzabile con GS/PX di Davide (A.194 risolta). Piccolo |
| 5 | **Bestiario 0.46, parte 2: importatore dal Word e schede nuove (≈ 50 draghi, animali minori, fauna di Iris 7.13–7.19, dieci umanoidi rinominati)** | Opus (importatore e prove di non regressione sulle 214 schede invariate); poi Sonnet per le revisioni | Dopo la partita; i PX «provvisori» della fauna di Iris si marcano come tali. Rigenerare la pagina del bestiario online nello stesso commit |
| 6 | **Modelli PNG Classe/Grado/EQ (10 Classi × 6 Gradi, §9.6 del Direttore) in «Crea nemico»** | Opus | Dopo. Tocca il formato dei nemici, la creazione e il calcolo dei PX del pannello |
| 7 | Veicoli in UE e chilometri (A.192, A.193) | Opus | Dopo le risposte |
| 8 | A.176 incantesimi aggiunti a mano come conosciuti | Opus | Può aspettare |
| 9 | Punisher Wächter | Sonnet | Dopo A.195 (la sola Taglia; prezzo e REP li fissa Davide) |
| 10 | Neverlost | Opus | Dopo A.196 |

**Prima della prossima partita:** il lotto 4 (Bestiario, regole e Iniziativa, piccolo) e, se serve, la parte «colpi e
ricariche delle armi comuni» del lotto 2. Tutto il resto può aspettare.

## E. Domande: cosa cambia rispetto alla parte 1

Pacchetto `docs/pacchetto-per-davide-2026-10-28-word.md`. **Già risposte dal registro/dai manuali:** A.189 (registro NEC),
A.191 (registro NEC), A.194 (Mostri 0.46). **Corrette:** A.193 (via il riferimento ai Mostri), A.195 (solo la
Taglia), A.192 (già in lista di Davide). **Aperte:** A.190, A.192, A.193, A.195 (Taglia), A.196. **Nuova:** A.197
(premio di fine Atto: bloccare o avvisare quando è già stato dato).
