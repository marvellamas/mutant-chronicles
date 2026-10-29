# Bestiario 0.46, parte 2 — lotto 141 (29/10/2026)

Fonte: Manuale dei Mostri 0.46 (Word del 27/10/2026), `docs/manuali-txt/mostri-word.md`: per il Bestiario vale al posto del Google Doc 0.23.
Parte 1 (lotto 140 della numerazione del Bestiario, `docs/diff-bestiario-046-lotto4-2026-10-29.md`): Iniziativa, scala del GS, Dragomedusa. Qui: l'importatore e le schede nuove.
I 10 modelli PNG del Manuale del Direttore §9.6 sono il lotto successivo e non sono toccati.

## A. L'importatore — `tools/importa-mostri.mjs`

```
node tools/importa-mostri.mjs                       # dice cosa cambierebbe; non scrive
node tools/importa-mostri.mjs --scrivi              # scrive le sole schede NUOVE in esempi/nemici/mostri/
node tools/importa-mostri.mjs --aggiorna=id,id      # riscrive anche le schede indicate (già presenti)
node tools/importa-mostri.mjs --json=rapporto.json  # rapporto leggibile da altri strumenti
node tools/importa-mostri.mjs --testo=altro.md      # un'altra versione del testo, per vedere cosa cambierebbe
```

Quando Davide pubblica una versione nuova: si mette il testo in `docs/manuali-txt/` (procedura di `docs/manuali-drive.md`), si lancia **senza** `--scrivi`
e il rapporto elenca le schede nuove, quelle già presenti **con le differenze sui numeri** (PV, PM, Difese, AR, Caratteristiche, Salvezze, movimento, GS e PX,
spazio, attacchi, abilità), quelle escluse e, scheda per scheda, ciò che non ha capito. Poi si decide cosa scrivere. Le schede già presenti non si toccano mai da sole.

Regole dello strumento (verificate da `tests/importa-mostri.test.js`):

- **Ogni valore viene dal manuale.** Un dato assente resta assente (mai 0 al suo posto): «Volontà —» diventa `senza_salvezza`, una Caratteristica assente non
  compare, un ingombro non scritto non produce il campo `spazio`, AzP/AzM non scritte non producono `azioni`. PM 0 scritto resta 0.
- **Una scheda senza un campo obbligatorio del formato** (PV, AR, Difese, Salvezze, Iniziativa, Passo) **non si scrive**: resta fuori, con il motivo.
- **Cosa non capisce lo dice**, scheda per scheda («non capito»), e ciò che non sa mettere in un campo lo tiene come testo nelle capacità o nelle note, non lo butta:
  tabelle secondarie (celle in ordine di lettura, le colonne non si ricostruiscono), abilità con condizione («Furtività 12, oppure 14 tra le rocce»), pagine comuni del blocco.
- **Regole comuni già nel codice:** Iniziativa mai negativa (`src/iniziativa-creature.js`, lotto 140) — e «1d10» senza bonus vale 0 (Mostri 0.46 §4); portata 0 Q per gli attacchi
  nello spazio condiviso (A.171: la «Puntura» delle Vespe, solo contro la vittima già agganciata); ingombro rettangolare fino a 12 Q per lato (A.167), occupazione e collisione
  come da A.172 (a carico della mappa, non dei dati); Q Tattici → Q Base (×10, 1,5 m e 15 m) per movimento, portate e volo; Taglia «Grande» solo se l'ingombro contiene 2 × 2 Q.
- **Prova sulle schede già presenti:** letto con lo stesso strumento, ogni PV, PM, Difese, AR, Caratteristica, Salvezza, GS e PX delle 307 schede già nel Bestiario coincide
  (`tests/importa-mostri.test.js`, «l'importatore legge come le schede già nel Bestiario»). L'unica scheda diversa era il Lorath (vedi sotto).

Cosa l'importatore **non** legge ancora (e dice): le schede con layout particolari che nel Bestiario erano già state scritte a mano (le differenze di attacchi e movimento che il
rapporto mostra sulle 225 schede vecchie sono limiti di lettura dei loro layout, non dati cambiati); le colonne delle tabelle secondarie; gli attacchi descritti solo in prosa
quando manca la portata (restano capacità).

## B. Le schede

**82 creature nuove**, tutte con la riga «dal Manuale dei Mostri v0.46 (Word del 27/10/2026)» nella fonte:

- **50 draghi:** cromatici (bianco, nero, verde, blu, rosso) cuccioli, giovani, adulti e antichi (20); metallici (ottone, rame, bronzo, argento, oro) negli stessi quattro stadi (20);
  Pseudodrago, Drago fatato giovane e maturo, Mezzodrago rosso veterano; i cinque Draghi d'ombra giovani; il Dracolich blu adulto. Le pagine comuni dei blocchi (azioni, soffi,
  Presenza terrificante, forma umanoide dei metallici, veicoli…) sono capacità di ogni scheda; le loro tabelle restano come testo.
- **20 animali minori** (fauna ordinaria): Gatto, Donnola, Tasso gigante, Donnola gigante, Lucertola, Lucertola gigante, Rana, Rana gigante, Rospo gigante, Serpente costrittore;
  Becco d'ascia, Falco sanguinario, Serpente volante, Granchio, Coccodrillo, Ratto gigante, Cavalluccio marino, Cavalluccio marino gigante, Polpo, Ragno.
- **12 della fauna di Iris:** Piovra gigante di Iris, Granchio modificato, Raptor di Fuoco giovane e adulto, Turk, Vespe del Deserto, Iena mutata, Capobranco (Iene del deserto mutate),
  Murena della Roccia cucciolo, giovane e adulta, Madre delle Murene della Roccia.
- **Lorath (7.11) sostituito** con la scheda della 0.46: è un profilo diverso da quello della 0.13 (PV 40 e non 32, AR 4 e non 3, Iniziativa +2, 2 AzP e 1 AzM, Spina paralizzante e
  Getto di ragnatela, ingombro 1 × 2 Q e non 2 × 2 Q) e ora ha GS **Veterano, 50 PX provvisori**. La scheda vecchia è nella cronologia di git.

**PX provvisori** (`gs_px.provvisorio: true`, nuovo campo del formato; la mini-scheda scrive «(provvisori)»; la nota della scheda dice che Davide li confermerà):
Lorath 50 (Veterano) · Piovra gigante 70 (Eroe) · Granchio modificato 20 · Raptor di Fuoco **giovane 20, adulto 50** (l'ordine di lavoro diceva «20»: il manuale ha due valori) · Turk 20 ·
Vespe del Deserto 10 (per gruppo di 10) · Iena mutata 30 e Capobranco 50 (non nell'elenco dell'ordine di lavoro: il manuale li dice provvisori) · Murene della Roccia 20 / 20 / 30 / 70 (Madre).

**Totali:** 341 nemici prestabiliti in `esempi/nemici/` (309 dal Manuale dei Mostri 0.46, 2 di prima, 30 del bestiario umano); il catalogo del cap. 8 ha le **285 creature** che il manuale
dichiara (erano 215: i 50 draghi e i 20 animali minori di questo lotto ne aggiungono 70); la pagina del bestiario online ha 451 schede (con le basi e le creature pronte del Bestiario proposto).

## C. Scelte fatte dallo strumento (da controllare, tutte nel «non capito» della scheda)

- **Murena della Roccia cucciolo:** il manuale dà solo il «Movimento etereo 6 / 12 / 18 Q»: usato come Passo, Corsa e Scatto. → A.202.
- **Madre delle Murene:** due ingombri, «parziale» 2 × 2 Q (fino a 4 restando nella roccia) e «completo» 6 × 2 Q; nel campo `spazio` il completo, il parziale nella nota. → A.203.
- **Draghi:** «Corpo disteso con coda 6 × 4 Q Base» (giovane) e «10 × 6» (adulto): copiato nell'ordine del manuale nel campo `spazio`, che è «larghezza × lunghezza» (A.167). → A.204.
- **Piovra gigante:** «Corpo: 60 PV • ogni tentacolo: 30 PV»: il formato ha un solo valore, vale il corpo (60); i tentacoli sono nella nota e nelle capacità, mai sommati.
- **Attacchi senza portata scritta** (Piovra «Stringere una creatura», Iene «Balzo travolgente») o senza VA («Stritolare il mezzo», Getto di ragnatela): capacità, non attacchi.
- **Attacchi a distanza** (Aculeo del Granchio, Spina del Lorath): modalità di fuoco assunta «S» (lancio), da controllare.
- **Nomi:** il manuale scrive «Drago di ottone/rame/…» per giovani e adulti e «Drago d'ottone/d'argento/d'oro» per cuccioli e antichi (e «di argento», «di oro» nei primi). Nomi come nel manuale,
  identificativi uniformati (`drago-di-ottone-cucciolo`). → A.201. La colonna «Capobranco» delle Iene è «Capobranco (Iene del deserto mutate)» per non confonderla con «Capobranco gnoll».
- **«Fauna ambientale»:** il GS di Rana e Cavalluccio marino (0 PX, senza attacchi efficaci): scritto com'è; il filtro per GS della pagina online non ha il chip (i GS fuori scala non lo hanno).
- **Abilità con condizione** (Furtività dei draghi in ambiente adatto, Furtività «oppure … tra le rocce» delle Murene, «Furtività immersa» della Piovra): nel campo `abilita` solo le abilità semplici;
  le condizioni nella capacità «Abilità particolari». «Oratoria e Raggirare 16» sono due Abilità a 16.

## D. Creature oltre i 12 Q o con moltiplicatore (domande A.198 e A.199, ancora aperte: non decise)

- **Oltre 12 Q per lato (A.198):** i **dieci draghi antichi** (16 × 10 Q Base): nessun campo `spazio` (come il Dragomedusa), ingombro e Taglia «Grande» nella capacità «Dimensioni e scale».
- **Danno con moltiplicatore (A.199):** 36 schede nuove (draghi cromatici, metallici e d'ombra giovani, adulti e antichi, Dracolich) più i due Dragomedusa: «6d10 × 5» è scritto `6d10×5`, la plancia lo mostra
  e il dado non si tira da solo; nota della scheda: «il risultato dei dadi moltiplicato per k».
- I **cuccioli** hanno danni normali (es. 2d8+2); i soffi sono capacità con costo e limite, mai tirati dall'app.

## E. Escluso

- **«Bozzoli di cristallo» (7.19.5):** ha una tabella dei dati ma non è una creatura (ambientazione dell'incontro di Rutteng: procedure di apertura, stress del risucchio): nessun PV, Difesa o Salvezza.
  Resta nel testo del manuale; non è nel Bestiario.
- Nessuna scheda contraddice una decisione approvata. Il Lorath della 0.46 sostituisce il Lorath della 0.13 (ingombro 1 × 2 Q invece di 2 × 2 Q): non c'è una decisione di Davide sul Lorath, il test è stato aggiornato.

## F. Prove

- Confronto a mano con il manuale, campo per campo, di cinque creature scelte a caso (generatore pseudocasuale con seme 29102026 fra le 82): **Murena della Roccia cucciolo, Drago verde adulto,
  Madre delle Murene della Roccia, Raptor di Fuoco giovane, Lucertola gigante.** Trovati e corretti due difetti: nella Lucertola gigante mancava l'AC 1, scritto nella pagina comune del blocco;
  nella Madre l'ingombro letto era il «parziale» (2 × 2) invece del completo.
- Browser (copie nella cartella temporanea, porta 3017, 820 px): scontro con Drago verde adulto, Raptor di Fuoco adulto e un PG; «Tira per tutti con l'app» (INI 3 + d10 per entrambi); «Attacca» del Drago
  (Morso VA 16, 6d10×5, portata 3 Q, bersaglio Raptor Difese 13 AR 4 → d20 8 → «Colpito») e del Raptor (Testata VA 14, 1d6+3, portata 1 Q, bersaglio Drago Difese 12 AR 22 → d20 5 → «Colpito»).
  Pagina online: filtro «GS Mito» → 14 schede (draghi cromatici e metallici giovani/adulti, d'ombra, Dragomedusa giovane); «GS Divinità» → i 5 antichi dei tipi blu, rosso, argento, bronzo, oro e il Dracolich; categoria
  «Manuale dei Mostri» → 309; ricerca «Turk» → 1.
- Test: `tests/importa-mostri.test.js` (9). Suite intera: 2527 su 2527; `verifica_frasi` 1281/1281; validatore dei nemici senza errori su tutte le 309 schede 0.46.

## G. Da sapere

- La pagina del bestiario online è ora di 1,9 MB (era 0,55): le pagine comuni dei blocchi sono ripetute in ogni drago. Resta leggibile, ma sul telefono pesa; se serve, il passo successivo è mostrarle una volta sola.
  L'Artifact pubblicato (`https://claude.ai/artifact/F2CMvbi2Sk1s1idAg3p4rf`) **non è stato aggiornato** in questo lotto: il tool pretende la lettura integrale della versione live (563 KB) prima di sostituirla.
  Il file nuovo è `docs/bestiario/bestiario-online.html`.
- Un test (`calendario.test.js`) è fallito una volta nella suite intera e non da solo né alla seconda esecuzione: sembra una gara fra file di test, non legata a questo lotto.

## Appendice — «non capito», scheda per scheda

Generato da `tools/importa-mostri.mjs` sulle 82 schede nuove, il Lorath e i Bozzoli (esclusi). Le righe sulle pagine comuni sono omesse (una per ogni drago e animale).

- `lorath`: Attacco «Spina paralizzante»: attacco a distanza, modalità di fuoco assunta «S» (lancio): da controllare
- `lorath`: Attacco «Getto di ragnatela» non importato come attacco (VA «11», danno «Immobilizzato; nessun danno»): messo fra le capacità
- `piovra-gigante-di-iris`: PV in più parti (Corpo: 60 PV • ogni tentacolo: 30 PV): il formato ha un solo valore, vale quello del corpo; il resto sta nelle note
- `piovra-gigante-di-iris`: Ingombro non letto: campo spazio assente (vale la Taglia)
- `piovra-gigante-di-iris`: Attacco «Stringere una creatura»: portata non letta («Vittima già in presa; 1 AzP»): messo fra le capacità, non fra gli attacchi
- `piovra-gigante-di-iris`: Attacco «Stritolare il mezzo» non importato come attacco (VA «—», danno «1d6 Naturale per ogni tentacolo agganciato»): messo fra le capacità
- `piovra-gigante-di-iris`: Tabella «Danni localizzati e liberazione dei bersagli» (1 celle) tenuta come testo nelle capacità, in ordine di lettura: le colonne non si ricostruiscono
- `granchio-modificato`: Ingombro non letto: campo spazio assente (vale la Taglia)
- `granchio-modificato`: Attacco «Aculeo»: attacco a distanza, modalità di fuoco assunta «S» (lancio): da controllare
- `raptor-di-fuoco-giovane`: Attacchi letti da una tabella a colonne per variante (3): natura «Naturale» e AC dal testo dichiarate nel paragrafo «Attacchi/Azioni»: controllare
- `raptor-di-fuoco-giovane`: Tabella degli attacchi a colonne per variante (17 celle): letta come attacchi, non ripetuta fra le capacità
- `raptor-di-fuoco-giovane`: Tabella «Capacità difensiva e ritirata» (22 celle) tenuta come testo nelle capacità, in ordine di lettura: le colonne non si ricostruiscono
- `raptor-di-fuoco-adulto`: Attacchi letti da una tabella a colonne per variante (3): natura «Naturale» e AC dal testo dichiarate nel paragrafo «Attacchi/Azioni»: controllare
- `raptor-di-fuoco-adulto`: Tabella degli attacchi a colonne per variante (17 celle): letta come attacchi, non ripetuta fra le capacità
- `raptor-di-fuoco-adulto`: Tabella «Capacità difensiva e ritirata» (22 celle) tenuta come testo nelle capacità, in ordine di lettura: le colonne non si ricostruiscono
- `turk`: Iniziativa «1d10» senza bonus: valore 0 (INI 0 indica il solo d10, Mostri 0.46 §4)
- `turk`: Tabella degli attacchi assente: gli attacchi, se ci sono, sono descritti nel testo delle capacità
- `turk`: Attacco «Urto difensivo» letto da un paragrafo descrittivo (non dalla tabella): controllare
- `vespe-del-deserto`: Azioni (AzP/AzM) non scritte come «N AzP e M AzM»: campo azioni assente
- `vespe-del-deserto`: Tabella degli attacchi assente: gli attacchi, se ci sono, sono descritti nel testo delle capacità
- `vespe-del-deserto`: Attacco «Puntura» letto da un paragrafo descrittivo: portata 0 Q (A.171: solo contro la vittima già agganciata, nello spazio condiviso); controllare
- `iena-mutata`: Attacco «Balzo travolgente»: portata non scritta per questo attacco: messo fra le capacità
- `iena-mutata`: Attacchi letti da una tabella a colonne per variante (2): natura «Naturale» e AC dal testo dichiarate nel paragrafo «Attacchi/Azioni»: controllare
- `iena-mutata`: Tabella degli attacchi a colonne per variante (12 celle): letta come attacchi, non ripetuta fra le capacità
- `capobranco-iene-del-deserto-mutate`: Attacco «Balzo travolgente»: portata non scritta per questo attacco: messo fra le capacità
- `capobranco-iene-del-deserto-mutate`: Attacchi letti da una tabella a colonne per variante (2): natura «Naturale» e AC dal testo dichiarate nel paragrafo «Attacchi/Azioni»: controllare
- `capobranco-iene-del-deserto-mutate`: Tabella degli attacchi a colonne per variante (12 celle): letta come attacchi, non ripetuta fra le capacità
- `murena-della-roccia-cucciolo`: Il solo movimento scritto è quello etereo / nella roccia: usato come Passo, Corsa e Scatto (da controllare)
- `murena-della-roccia-cucciolo`: Tabella degli attacchi assente: gli attacchi, se ci sono, sono descritti nel testo delle capacità
- `murena-della-roccia-cucciolo`: Sezione «Attraversamento predatorio»: 10 celle di tabella tenute come testo, in ordine di lettura, in fondo alla capacità (le colonne non si ricostruiscono: Esito di Magia | PM assorbiti | Maldestro | 1d4 raddoppiato, massimo 4 PM…)
- `murena-della-roccia-giovane`: Abilità con condizione o forma non letta, tenuta come testo nelle capacità: «Furtività 12, oppure 14 tra le rocce»
- `murena-della-roccia-giovane`: Tabella degli attacchi assente: gli attacchi, se ci sono, sono descritti nel testo delle capacità
- `murena-della-roccia-giovane`: Sezione «Morso e risucchio»: 10 celle di tabella tenute come testo, in ordine di lettura, in fondo alla capacità (le colonne non si ricostruiscono: Esito di Magia | PM assorbiti | Maldestro | 1d4 raddoppiato, massimo 4 PM…)
- `murena-della-roccia-adulta`: Abilità con condizione o forma non letta, tenuta come testo nelle capacità: «Furtività 11, oppure 13 tra le rocce»
- `murena-della-roccia-adulta`: Tabella degli attacchi assente: gli attacchi, se ci sono, sono descritti nel testo delle capacità
- `murena-della-roccia-adulta`: Sezione «Morso e risucchio»: 10 celle di tabella tenute come testo, in ordine di lettura, in fondo alla capacità (le colonne non si ricostruiscono: Esito di Magia | PM assorbiti | Maldestro | 1d6 raddoppiato, massimo 6 PM…)
- `madre-delle-murene-della-roccia`: Due ingombri nel manuale (parziale e completo): scelto il completo per il campo spazio; il parziale resta nella nota (da confermare, A.203)
- `madre-delle-murene-della-roccia`: Abilità con condizione o forma non letta, tenuta come testo nelle capacità: «Furtività 8, oppure 12 tra le rocce»
- `madre-delle-murene-della-roccia`: Tabella degli attacchi assente: gli attacchi, se ci sono, sono descritti nel testo delle capacità
- `madre-delle-murene-della-roccia`: Sezione «Soffio di schegge»: 9 celle di tabella tenute come testo, in ordine di lettura, in fondo alla capacità (le colonne non si ricostruiscono: Voce | Regola | Area | Costo e frequenza…)
- `madre-delle-murene-della-roccia`: Sezione «Esplosione alla morte»: 10 celle di tabella tenute come testo, in ordine di lettura, in fondo alla capacità (le colonne non si ricostruiscono: Esito di Magia 0 | PM assorbiti dall’esplosione | Maldestro | 2d4 raddoppiato, massimo 8 PM…)
- `madre-delle-murene-della-roccia`: Attacco «Testata» letto da un paragrafo descrittivo (non dalla tabella): controllare
- `madre-delle-murene-della-roccia`: Attacco «Morso e risucchio» letto da un paragrafo descrittivo (non dalla tabella): controllare
- `bozzoli-di-cristallo`: Caratteristiche assenti nel manuale: FOR, DES, COS, INT, SAG, CAR (restano assenti)
- `bozzoli-di-cristallo`: Azioni (AzP/AzM) non scritte come «N AzP e M AzM»: campo azioni assente
- `bozzoli-di-cristallo`: Ingombro non letto: campo spazio assente (vale la Taglia)
- `bozzoli-di-cristallo`: GS e PX non letti («»): campo gs_px assente
- `bozzoli-di-cristallo`: Tabella degli attacchi assente: gli attacchi, se ci sono, sono descritti nel testo delle capacità
- `bozzoli-di-cristallo`: Sezione «Stress del risucchio»: 6 celle di tabella tenute come testo, in ordine di lettura, in fondo alla capacità (le colonne non si ricostruiscono: Esito di Tempra | Conseguenza | Maldestro o fallimento | L’ospite muore per lo stress del risucchio…)
- `bozzoli-di-cristallo`: Sezione «Apertura ed estrazione»: 6 celle di tabella tenute come testo, in ordine di lettura, in fondo alla capacità (le colonne non si ricostruiscono: Operazione | Procedura | Apertura accurata | Rottura in combattimento…)
- `bozzoli-di-cristallo`: MANCANO campi obbligatori: PV, AR (totale e componente magica), Difese, Salvezza Tempra, Salvezza Riflessi, Salvezza Volontà, Salvezza Magia, Iniziativa, Passo (movimento a terra)
- `tasso-gigante`: Iniziativa «1d10» senza bonus: valore 0 (INI 0 indica il solo d10, Mostri 0.46 §4)
- `lucertola`: Iniziativa «1d10» senza bonus: valore 0 (INI 0 indica il solo d10, Mostri 0.46 §4)
- `granchio`: Iniziativa «1d10» senza bonus: valore 0 (INI 0 indica il solo d10, Mostri 0.46 §4)
- `coccodrillo`: Iniziativa «1d10» senza bonus: valore 0 (INI 0 indica il solo d10, Mostri 0.46 §4)
- `cavalluccio-marino`: Solo movimento acquatico scritto (Nuoto): Passo 0, Corsa e Scatto «non consentito» a terra, come nei blocchi già importati
- `cavalluccio-marino-gigante`: Solo movimento acquatico scritto (Nuoto): Passo 0, Corsa e Scatto «non consentito» a terra, come nei blocchi già importati
- (Abilità fuori elenco: le condizioni di Furtività e i nomi doppi, tenuti come testo nelle capacità «Abilità particolari»; dieci Ingombri oltre 12 Q: i dieci draghi antichi, vedi sezione D.)
