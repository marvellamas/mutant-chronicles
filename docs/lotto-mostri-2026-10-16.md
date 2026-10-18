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
  (Coccodrillo) nelle note con il rimando ad A.167; taglia Grande solo per il 3 × 2 Q (il formato dei nemici la riserva a chi occupa 2 × 2 Q o più).
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

## 10. Catalogo, blocco «Giganti e abitanti delle montagne» — cap. 8 (16/10 sera, Mostri 0.16)

`tools/genera_mostri_giganti.mjs` → `esempi/nemici/mostri/`: Ciclope, Gigante delle colline / delle pietre /
del gelo / del fuoco / delle nuvole / delle tempeste, Fomorian, Yeti, Yeti abominevole.

Scelte del blocco: attacchi senza tiro per colpire (Malocchio e Deformazione del Fomorian, Sguardo e Soffio
gelido degli Yeti, Scarica tempestosa) → capacità; poteri innati a PM (Nebbia, Sostentamento, Passo nelle
nubi, Levitazione) → capacità con `risorsa`; il volo del Gigante delle nuvole è un potere (non nel campo
`volo`); Difese = Parata per i giganti corazzati (Schivata e valori senza armatura nelle note); armi con due
componenti (Artiglio dello Yeti: fisico nel campo `danno`, Ghiaccio nella capacità «Gelo degli artigli»); Masso
come attacco a distanza (solo Colpo Singolo, gittata 30 Q); Scurovisione solo dove indicata (Pietre 12 Q,
Fomorian 24 Q; il Ciclope non ne ha). GS/PX anche con valori non tondi (77/100/110). Test:
`tests/mostri-giganti.test.js`.

## Catalogo, blocco «Creature del sottosuolo» — cap. 8 (17/10, Mostri 0.18)

`tools/genera_mostri_sottosuolo.mjs` → `esempi/nemici/mostri/`: Mantoscuro, Perforatore, Roper, Rugginofago,
Umber Hulk, Orrore uncinato, Grimlock, Troglodita, Stirge, Vermeiena.

Scelte del blocco: attacchi senza danno ai PV (Oscuramento, Filamento e Trascinare del Roper, Antenne del
Rugginofago, Sguardo perturbante, Suzione della Stirge) → capacità; la **Caduta perforante** del Perforatore ha
VA 10 ma portata verticale (da 2 a 6 Q), non rappresentabile come `portata_q`: sta fra le capacità e la scheda
resta senza attacchi in elenco; Furtività con valori condizionati: nel campo il valore senza condizione (Umber
Hulk 7 all'aperto, Perforatore e Roper 10/11), quello condizionato (sotto terra, immobile sulla roccia,
mimetizzato, fra le rocce) nelle note; scavo, aderenza e arrampicata (non nel movimento del formato) come
capacità; Vermeiena 1 × 2 Q → `spazio` vuoto e nota con A.167, come il Corazzato della Covata. Test:
`tests/mostri-sottosuolo.test.js`; `tests/mostri-scontro.test.js` (nuovo) aggiunge ogni creatura della cartella a
uno scontro di prova.

## Catalogo, «prima parte» (le prime quindici schede) — cap. 8 (17/10, Mostri 0.18)

`tools/genera_mostri_prima_parte.mjs` → `esempi/nemici/mostri/`: Aarakocra, Aboleth, Ankheg, Arpia, Basilisco,
Bestia distorcente, Bulette, Chimera, Cockatrice, Ettercap, Grick, Grifone, Ippogrifo, Manticora, Orsogufo.

Scelte del blocco: attacchi senza tiro o senza danno (Canto dell'Arpia, Sguardo pietrificante, Getto di seta,
Soffio di fuoco, Getto acido, Balzo dirompente) → capacità; AR condizionale (Grick 1 / 4 contro colpi fisici
Naturali; Ankheg 3, ma 1 se A Terra) → nel campo il primo valore, la condizione come capacità; Furtività e
Percezione con valori condizionati: nel campo quello senza condizione; **Aboleth** con il modulo facoltativo
«tana» come capacità distinte «(modulo tana)» e GS/PX del profilo base (Eroe, 70 PX; con modulo attivo Leggenda,
100 PX nella nota); Danza dei cinque venti degli Aarakocra come capacità collettiva con 3 PM e un uso al giorno;
Spina caudale della Manticora come attacco a distanza (massimo 40 Q) con riserva di 24 spine e tabella dei VA
nella capacità; ingombri non quadrati: Aboleth 2 × 3 Q (taglia Grande perché il manuale dice «massa
paragonabile a un veicolo»), Basilisco 2 × 1 Q e Grick 1 × 2 Q (taglia normale) con nota e A.167. Il
«Giavellotto della sentinella» degli Aarakocra è una proposta del manuale e non entra nel catalogo degli
Armamenti. Test: `tests/mostri-prima-parte.test.js`.

## Catalogo, blocco «Melme funghi e imitatori» — cap. 8 (17/10, Mostri 0.18)

`tools/genera_mostri_melme.mjs` → `esempi/nemici/mostri/`: Melma grigia, Gelatina ocra, Budino nero, Cubo
gelatinoso, Fungo stridente, Fungo violetto, Spora gassosa, Miconide germoglio, Miconide adulto, Mimic.

**Novità del formato.** Le melme e i funghi senza mente hanno «PM —» e «Volontà —». Il PM assente è già
rappresentabile (nessun campo `pm`); la Volontà no: `salvezze` richiedeva tutte e quattro le Prove. Un dato assente
non vale 0, quindi `data/formato_nemici.json` ha un campo nuovo `senza_salvezza` (per esempio `["volonta"]`) e il
validatore accetta una Salvezza mancante **solo** se è elencata lì (e rifiuta una elencata che ha un valore): una
Salvezza dimenticata resta un errore. La mini-scheda mostrava già «—» per una Salvezza assente. Sette profili lo
usano (le quattro melme, i tre funghi senza mente).

Altre scelte del blocco: immunità espresse → Stati del formato (accecato, assordato, a-terra, terrorizzato,
avvelenato), le altre (psichici, controllo mentale, AFT, Paralizzato, Acido, Fulmine, Taglio) nelle capacità;
l'acido è il mezzo del danno e **Corrosivo** una proprietà ulteriore, presente solo per Melma grigia e Budino nero
(`proprieta`), l'acido senza Corrosivo nella nota dell'attacco; attacchi senza tiro per colpire (Inglobare,
Digerire, Stridio, Rottura del sacco, Spore pacificanti e di rapporto) → capacità; il **Frammento** (dopo la
Scissione) resta un attacco con la condizione nella nota; Mimic con Morso AC 2 (1d8+1 e poi 1d4 acido in nota);
Fungo stridente immobile (passo 0, AzM inutilizzabile), GS «—» e 0 PX; Spora gassosa con il Tocco infettivo di
danno fisso 1 e la nube, la Micosi sporale e la riproduzione come capacità. Test: `tests/mostri-melme.test.js`.

## Catalogo, blocco «Vegetali e custodi delle foreste» — cap. 8 (17/10, Mostri 0.18)

`tools/genera_mostri_vegetali.mjs` → `esempi/nemici/mostri/`: Arbusto risvegliato, Albero risvegliato, Avvizzito
ramoso / spinoso / rampicante, Driade, Cumulo strisciante, Treant, Pegaso, Unicorno.

Scelte del blocco: tipo di danno fisico (Taglio, Perforazione, Contundente) nella `proprieta` dell'attacco; **Rovi
viventi** (rampicante, Driade, Unicorno) come una sola capacità con 3 PM; poteri a PM della Driade, del Treant
(Animare alberi, un uso al giorno, 100 PX già comprensivi dei due alberi) e dell'Unicorno (Tocco risanante tre volte
al giorno, Purificazione, Scudo luminoso, Passaggio del guardiano) come capacità con `risorsa`; Afferrare, Inglobare
e Comprimere del Cumulo come capacità; Aghi dell'Avvizzito spinoso e Roccia del Treant come attacchi a distanza;
**Corno in carica** dell'Unicorno come attacco con la condizione di movimento nella nota; «Randello incantato» della
Driade come attacco con la condizione «solo con Ramo incantato attivo». **Abilità non nel catalogo:** Diplomazia →
Oratoria (il Giocatore dice «Oratoria per diplomazia»); «Tiro naturale» (Avvizzito spinoso, Treant) resta nella nota
e lo stesso vale, per gli Elementali del blocco precedente, per «Attacco a distanza» e «Prove di FOR» (prima
scartate in silenzio, ora recuperate nelle note): domanda **A.169**. Test: `tests/mostri-vegetali.test.js`.

## Catalogo, blocco «Grandi rettili e predatori mostruosi» — cap. 8 (18/10, Mostri 0.23)

`tools/genera_mostri_rettili.mjs` → `esempi/nemici/mostri/`: Allosauro, Anchilosauro, Plesiosauro, Pteranodonte,
Triceratopo, Tirannosauro, Viverna, Idra, Behir, Drago tartaruga.

Scelte del blocco: tipo di danno fisico (Taglio, Perforazione, Contundente) nella `proprieta` dell'attacco (il
manuale precisa che Perforazione non è la proprietà Perforante X); Stringere, Stringere le fauci, Soffio elettrico e
Soffio di vapore → capacità; Calpestare (vittima già A Terra) e Coda del Drago tartaruga (2 AzP) restano attacchi con la
condizione nella nota; Viverna con tre dosi di veleno al giorno (`usi`); **Idra** con le Opportunità speciali nel
campo `azioni.eccezioni` e soglia di lesione, ultima testa, ricrescita e cauterizzazione come capacità; il Behir con
spire, soffio e inghiottimento complessi come capacità; **Drago tartaruga 4 × 4 Q**: ingombro non ammesso dal campo
Spazio → `spazio` vuoto, nota con A.167, taglia Grande (nell'app compare come pedina 2 × 2 «dalla Taglia»). Test:
`tests/mostri-rettili.test.js`.

## Catalogo, blocco «Creature delle acque e popoli sommersi» — cap. 8 (18/10, Mostri 0.23)

`tools/genera_mostri_acque.mjs` → `esempi/nemici/mostri/`: Granchio gigante, Polpo gigante, Squalo delle
scogliere, Squalo cacciatore, Squalo gigante, Marinide, Merrow, Sahuagin, Kuo-toa, Chuul.

Scelte del blocco: il **Nuoto** (non è nel movimento del formato) è una capacità con la terna del manuale, e i pesci
senza moto a terra («Terra 0 Q») hanno passo 0 e Corsa/Scatto non consentiti; lance a una mano, a due mani e
scagliate come tre voci (la scagliata è un attacco a distanza con gittata 4 Q e «2 Q in acqua» nella nota); Stringere,
Rete del Kuo-toa (cattura senza danno), Nube di inchiostro, Tentacoli velenosi e Comando degli squali come
capacità; Chuul con tre dosi di tossina al giorno e immune ad Avvelenato; Kuo-toa AR 3 = 1 biologica + 2 dello Scudo
(senza Scudo 1, nella nota); Marinide: «Diplomazia» → Oratoria (A.169). Test: `tests/mostri-acque.test.js`.

## Catalogo, blocco «Predatori e grandi erbivori» — cap. 8 (18/10, Mostri 0.23)

`tools/genera_mostri_predatori.mjs` → `esempi/nemici/mostri/`: Pantera, Tigre, Tigre dai denti a sciabola, Orso polare,
Rinoceronte, Elefante, Mammut, Alce gigante, Scimmione, Scimmione gigante.

Scelte del blocco: **Assalto / Impeto** (almeno 4 Q di Passo rettilineo, poi Tempra e A Terra) come una capacità per
creatura, con la Tempra e la dimensione massima del bersaglio dal manuale; le versioni con formula propria (Corno in
Impeto del Rinoceronte, Corna in Impeto e Zoccoli dell'Alce, Calpestare di Elefante e Mammut) restano attacchi con la
condizione nella nota; Masso (20 Q, 2 AzP) e Pietra (6 Q) dello Scimmione come attacchi a distanza; arrampicata e
nuoto nelle capacità; **Tigre 2 × 1 Q** fuori dal campo Spazio (nota con A.167, taglia normale). Test:
`tests/mostri-predatori.test.js`.

## Catalogo, blocco «Creature alate e piccoli predatori» — cap. 8 (18/10, Mostri 0.23)

`tools/genera_mostri_alate.mjs` → `esempi/nemici/mostri/`: Aquila gigante, Gufo gigante, Avvoltoio gigante, Pipistrello gigante, Vespa gigante, Scarabeo di fuoco gigante, Centopiedi gigante, Serpente velenoso, Serpente velenoso gigante, Ragno lupo gigante.

Scelte del blocco: Passo di volo in `movimento.volo` (Corsa e Scatto in volo con Atletica −2 e −4 nella capacità «Ali e volo»); quattro creature 2 × 2 Q di taglia Grande; i veleni minori (Vespa, Centopiedi, i due Serpenti, Ragno lupo) come capacità con Tempra senza modificatore, danno interno e durata dal manuale, e «poi veleno» nella nota dell'attacco; ecolocalizzazione, percezione di prossimità e luce biologica come capacità; Passaggio in volo solo del Gufo; Ali vibranti della Vespa. Test: `tests/mostri-alate.test.js`.

## Catalogo, blocco «Sciami e piccola fauna» — cap. 8 (18/10, Mostri 0.23)

`tools/genera_mostri_sciami.mjs` → `esempi/nemici/mostri/`: Pipistrello, Corvo, Ratto, Quipper, Sciame di pipistrelli, Sciame di corvi, Sciame di ratti, Sciame di insetti, Sciame di quipper, Sciame di serpenti velenosi.

Scelte del blocco: gli Sciami sono un solo avversario da 1 × 1 Q condivisibile, con i due profili di danno per fascia di PV come due attacchi (quello ridotto sostituisce l'altro); «Corpo distribuito» (resistenza fisica dimezzata per eccesso, nessun recupero di PV), «Spazio condiviso» e «Ferite e dispersione» come capacità comuni, immune ad A Terra, Immobilizzato, Stordito e Terrorizzato negli Stati (fascinazione, paralisi e pietrificazione nel testo); portata 0 Q condiviso resa come 1 Q con la condizione in nota (nuova A.171); Quipper senza moto a terra, Frenesia del sangue e Imitazione del Corvo come capacità; veleno ofidico dello Sciame di serpenti con Tempra senza modificatore. Test: `tests/mostri-sciami.test.js`.

## Che cosa resta del catalogo (Mostri 0.23)

Il catalogo del cap. 8 ha 215 creature in 21 blocchi; ne sono fatte 145. Restano 70, in 7 blocchi, da fare nei prossimi lotti:

- **Cavalcature e animali da lavoro** (10 creature);
- **Mephit e creature elementali** (10 creature);
- **Costrutti e Modron** (10 creature);
- **Capi e varianti dei popoli guerrieri** (10 creature);
- **Predatori straordinari** (10 creature);
- **Popoli delle terre selvagge** (10 creature);
- **Fauna delle terre aperte** (10 creature).

Nota: gli sciami avranno meccaniche proprie (spazio, dispersione) da trascrivere a mano come gli altri blocchi, senza automatismi.

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
