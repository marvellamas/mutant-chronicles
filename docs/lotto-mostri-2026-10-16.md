# Lotto «Manuale dei Mostri 0.13» del 16 ottobre 2026 — regole operative, Covata, Lorath, catalogo

Dopo il controllo d'inizio sessione: il Manuale dei Mostri è passato da **0.9 a 0.13** (Doc
`11Uxmz9GM2vU2knngtIPk_80532ABlHC3xL8ZvAXX7rE`, modificato il 16/10 13:47), con **115 creature** (le 0.9 ne
avevano 75), le nove caste della Covata e il Lorath. Testo in `docs/manuali-txt/mostri.md`. Gli altri manuali
e «per-davide.md» invariati (solo i riassunti della sezione 1 aggiornati).

Principio di CLAUDE.md: questi sono **dati per il master**, nessuna automazione nuova al tavolo. Valori
trascritti dalle schede; niente valori inventati.

---

## 1. Regole operative — nessun cambiamento

Ricognizione completa in `docs/mostri-0.13-ricognizione-2026-10-16.md`. Le regole comuni (cap. 4) e le
«Regole operative del catalogo» (cap. 8) rimandano a regole già nell'app e coincidono con le risposte già
applicate: §4.2 Morente = A.159/A.164, §4.3 PM, §4.4 danno e Contromisure, §4.5 spazio = A.126/A.133, §4.6
Abilità non riportate = A.116, §8 (Azioni, Volo, Picchiata, Tiri a distanza, Capacità innate, Negare Potere,
Anatomia) tutte rimandi a Giocatore/Magia, §5.2 = A.160 (7 punti), §3.1 = A.164 (un dato assente non vale 0).
**Dove un ingombro del manuale contraddice una regola approvata non si è cambiato:** è la A.167.

## 2. GS e PX — campo informativo (A.161, «nel frattempo»)

Aggiunto il campo `gs_px` al formato dei nemici (`data/formato_nemici.json` → `{ gs, px, per_pg }`),
**informativo**. La mini-scheda lo mostra («GS Principiante · 10 PX per 4 PG», `src/ui/nemici.js`); l'app
**non calcola i PX** e **non unifica** la scala GS (Principiante…Leggenda) ai gradi del bestiario proposto
(Minore…Molto potente, 7 PG). Il calcolatore «PX della partita» resta la A.161, prossimo lotto.

## 3. Covata (nove caste) e Lorath — cap. 7

`tools/genera_mostri_covata.mjs` → `esempi/nemici/mostri/`: Rasente, Raccoglitore, Trasportatore, Saltatore,
Corazzato, Tagliente, Regina Comandante, Regina Incubatrice, Regina Madre, Lorath. Tratti comuni della Covata
(resistenza al Fuoco, Ignifugo 6 come Contromisura, disorientamento da freddo); il Lorath non è Covata.
Spazio, portata per attacco, capacità con i parametri (p. es. l'Onda psichica della Regina Comandante: 4 PM,
1 AzP, 1 volta per Round, PS Volontà). Ingombri non quadrati nelle note (A.167).

## 4. Catalogo, blocco «Bestie e predatori» — cap. 8 (10 di ~115)

`tools/genera_mostri_bestie.mjs` → `esempi/nemici/mostri/`: Lupo, Lupo feroce, Orso bruno, Cinghiale gigante,
Leone, Iena gigante, Ragno gigante, Scorpione gigante, Serpente costrittore gigante, Coccodrillo gigante.

- Movimento: il formato ha solo passo/corsa/scatto/volo (§2.14); le andature secondarie (arrampicata, nuoto)
  e la scurovisione restano nelle note o in una capacità, come le scrive il manuale.
- Spazio: quadrati (1 Q, 2 × 2 Q, 3 × 3 Q) nel campo `spazio`; 2 × 1 Q (Lupo feroce, Leone, Iena) e 3 × 2 Q
  (Coccodrillo) nelle note con il rimando ad A.167, taglia Grande.
- Attacchi che non infliggono danni (Getto di seta del Ragno: applica Immobilizzato) sono **capacità**, non
  attacchi, perché il campo `danno` del formato vuole i dadi.
- GS/PX informativo su ciascuna.

## 5. Catalogo, blocco «Bande e grandi avversari» — cap. 8 (16/10 sera, Mostri 0.16)

`tools/genera_mostri_bande.mjs` → `esempi/nemici/mostri/`: Goblin, Hobgoblin, Bugbear, Coboldo, Orco, Gnoll,
Ogre, Ettin, Minotauro, Troll. Il Manuale dei Mostri è passato a **0.16** (16/10 16:46, 145 creature nel cap.
8; Covata, Lorath e «Bestie e predatori» invariati dalla 0.13).

**Scelte ricorrenti sugli umanoidi con equipaggiamento** (criterio delle bestie; Marcello le può correggere
una volta sola cambiando il generatore):

- **AR «X con scudo, Y senza»** → `ar.totale` = valore con scudo (il profilo inizia con lo scudo pronto); il
  valore senza scudo è nelle note.
- **Difese «Parata N • Schivata/Elusione M»** (Hobgoblin) → `difese` = N (Parata, la difesa attiva con lo
  scudo); M nelle note. Quando il manuale dà una sola «Difese N» si usa quella.
- **Nomi d'Abilità abbreviati** → nomi del catalogo: Mischia → Armi da mischia, Lancio → Armi da lancio,
  Guerra → Armi da guerra; le qualificazioni («per intimidire», «per congegni semplici», «olfatto 12»)
  restano nelle note.
- **Armi a distanza «massimo N Q»** → attacco di tipo `distanza`, `gittata_q` = N, `modalita` (`S`; `S`+`TR`
  per l'Arco da guerra, che ha Colpo Singolo e Tiro Rapido). Giavellotto a mano (ravvicinato) e giavellotto
  scagliato (distanza) sono due attacchi distinti.
- **Armi a due impugnature** (Gnoll: lancia 1d6+2 / 1d6+4) → si registra il profilo iniziale (una mano, con
  scudo); il profilo a due mani è nelle note.
- **«Tutti gli attacchi Naturali, AC 1»** (Regole del blocco) → `natura: Naturale`, `ac: 1` per ogni attacco,
  anche le armi.
- **Spazio**: tutti quadrati (1 × 1 Q; Ogre, Ettin, Minotauro, Troll 2 × 2 Q, taglia Grande). Nessun ingombro
  non ammesso in questo blocco.

Test: `tests/mostri-bande.test.js`.

## 6. Catalogo, blocco «Non morti» — cap. 8 (16/10 sera, Mostri 0.16)

`tools/genera_mostri_nonmorti.mjs` → `esempi/nemici/mostri/`: Scheletro, Zombie, Ghoul, Ghast, Wight, Ombra,
Spettro, Wraith, Mummia, Progenie vampirica.

Scelte del blocco (oltre a quelle delle bande): natura dell'attacco dalla colonna «Danno completo»
(Naturale/Etereo/Magico); attacchi senza danni (Sguardo terribile della Mummia, che applica Terrorizzato) →
capacità; «AR X: Y intrinseca e Z da armatura» → `ar.totale` = X; immunità `sanguinamento` nel campo `immunita`
(i non morti non sanguinano), le altre immunità biologiche (soffocamento, malattie e veleni biologici) nelle
note; presenze spirituali con «terra —» → movimento di volo (`passo: 0`, Corsa/Scatto `non_consentito`, campo
`volo`). Test: `tests/mostri-nonmorti.test.js`.

## 8. Catalogo, blocco «Costrutti e creature elementali» — cap. 8 (16/10 sera, Mostri 0.16)

`tools/genera_mostri_costrutti.mjs` → `esempi/nemici/mostri/`: Armatura animata, Spada volante, Tappeto
soffocante, Gargoyle, Azer, Magmin, Elementale dell'Acqua / dell'Aria / del Fuoco / della Terra Maggiore.

Scelte del blocco: attacchi ad area o senza tiro per colpire (VA «—»: Esplosione finale del Magmin, Fiammata
del Fuoco, Terremoto della Terra) → capacità, perché `va` è obbligatorio; elemento del danno nella `proprieta`
dell'attacco («Acqua Magico» → natura Magico + proprieta ["Acqua"]); «AR X, di cui Y magica» → `ar.magica`;
immunità mappate agli Stati del formato (le altre — Fuoco, Fulmine, Sonno, Paralizzato, Disorientato,
Affaticamento, pietrificazione — nelle note); Elementali evocati con `iniziativa: 0` e la nota «agisce dopo
l'evocatore, scompare a 0 PV»; Tappeto 2×1 Q fuori dal campo `spazio` (A.167). Test: `tests/mostri-costrutti.test.js`.

## 9. Che cosa resta del catalogo (Mostri 0.16)

Circa 105 creature, da fare a blocchi nei prossimi lotti:

- **Prima parte senza nome** (15): Aarakocra, Aboleth, Ankheg, Arpia, Basilisco, Bestia distorcente, Bulette,
  Chimera, Cockatrice, Ettercap, Grick, Grifone, Ippogrifo, Manticora, Orsogufo.
- **Giganti e abitanti delle montagne** (~11): Ciclope, Giganti (colline, pietre, gelo, fuoco, nuvole,
  tempeste), Fomorian, Yeti, Yeti abominevole.
- **Creature del sottosuolo** (~12): Mantoscuro, Perforatore, Roper, Rugginofago, Umber Hulk, Orrore uncinato,
  Grimlock, Troglodita, Stirge, Vermeiena.
- Poi: **Melme funghi e imitatori**, **Vegetali e custodi delle foreste**, **Grandi rettili e predatori
  mostruosi**, **Creature delle acque e popoli sommersi**, **Predatori e grandi erbivori**, **Creature alate e
  piccoli predatori**, **Sciami e piccola fauna**.

Nota: le bande umanoidi usano le scelte ricorrenti del §5; le melme/sciami avranno ingombri e meccaniche
proprie (area, scissione) da trascrivere a mano come questi, senza automatismi.

## 5. Cosa trova di nuovo il master

- Nel bestiario e in «+ Aggiungi nemico» ci sono le nove caste della Covata, il Lorath e dieci bestie del
  catalogo, pronte da mettere in campo.
- Ogni scheda mostra il GS e i PX del manuale (informativi): servono per bilanciare, non li calcola l'app.
- Gli ingombri rettangolari del manuale sono annotati, ma la pedina sulla mappa resta quadrata finché Davide
  non decide (A.167).

## 6. Verifiche

`npm test` verde (1836), validatore verde, `node tools/verifica_frasi.mjs` verde (1277/1277). Nuovi test:
`tests/mostri-bestie.test.js` (Spazio/portata/GS-PX dai dati, Getto di seta come capacità) e, dal lotto
precedente, `tests/mostri-covata.test.js` e `tests/a161-gs-px.test.js`. Bestiario online rigenerato e
controllato (`tests/bestiario-pagina.test.js`).
