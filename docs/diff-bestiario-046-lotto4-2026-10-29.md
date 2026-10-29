# Bestiario 0.46, parte 1 — lotto 4 (29/10/2026)

Fonte: Manuale dei Mostri 0.46 (Word) — `docs/manuali-txt/mostri-word.md`. Ricognizione: `docs/diff-manuali-2026-10-28.md`, «Parte 2».
Fuori da questo lotto (lotto 5): l'importatore dal Word, le ~50 schede nuove dei draghi, la fauna di Iris 7.13–7.19 con PX provvisori, i
10 modelli PNG e il Lorath con GS/PX.

## A. Regole comuni

**Iniziativa non negativa.** `src/iniziativa-creature.js` → `iniziativaCreatura` (minimo 0), usata da: `aggiungiNemici` (`src/scontro.js`: la
base del partecipante, la scheda copiata e la riga del registro), `vociBestiario` (`src/nemici.js`: un file di `nemici/` salvato prima si legge
già a 0, senza riscriverlo né segnalarlo come errore), `profiloNemico` («Crea nemico»), `nemicoDaPg` («PG → nemico») e l'anteprima della bozza.
Il formato (`data/formato_nemici.json`) ha `iniziativa.min = 0`, quindi un nemico nuovo con Iniziativa negativa non passa il validatore. I dati di
`esempi/nemici/` sono a 0 e i generatori (`tools/genera_mostri_*.mjs`) non rimettono valori negativi. I PG non cambiano.

I **66 nemici** di `esempi/nemici/mostri/` che avevano Iniziativa da −1 a −4 (ora 0):
Albero risvegliato (-2), Alce (-1), Anchilosauro (-1), Ankheg (-4), Arbusto risvegliato (-1), Armatura animata (-2), Avvizzito rampicante (-1), Avvoltoio gigante (-1), Avvoltoio (-1), Basilisco (-5), Budino nero (-3), Bulette (-3), Cammello (-2), Capra gigante (-1), Capra (-1), Cavallo da tiro (-1), Chimera (-3), Chuul (-1), Ciclope (-1), Cinghiale (-1), Cockatrice (-3), Corazzato (-4), Raccoglitore (-4), Rasente (-1), Regina Incubatrice (-4), Regina Madre (-2), Trasportatore (-4), Cubo gelatinoso (-4), Cumulo strisciante (-1), Elefante (-1), Fungo stridente (-4), Fungo violetto (-4), Gelatina ocra (-3), Gigante delle colline (-1), Golem di argilla (-2), Golem di carne (-2), Grick (-2), Grifone (-1), Guardiano protettore (-2), Ippogrifo (-2), Kuo-toa (-1), Lorath (-3), Mammut (-1), Melma grigia (-3), Mephit del vapore (-1), Merrow (-1), Mulo (-1), Mummia (-2), Ogre (-1), Orso polare (-1), Orsogufo (-2), Perforatore (-3), Pony (-1), Ratto (-1), Rinoceronte (-1), Roper (-1), Sahuagin (-1), Scarabeo di fuoco gigante (-1), Sciame di ratti (-1), Spora gassosa (-4), Squalo gigante (-1), Tasso (-1), Treant (-1), Triceratopo (-1), Xorn (-1), Zombie (-3).
Inoltre i 3 profili di `esempi/nemici/umani/` (Inquisitore della Fratellanza recluta, veterano, élite: −1) sono a 0 perché derivano dalla stessa regola
sul calcolo; non sono creature del manuale: se Davide li vuole diversi, si rimette il valore (il minimo a 0 resta nel calcolo).

**Scala del GS.** `data/formato_nemici.json` → `gs_scala` (11 voci, validate in `src/validate.js`). Mini-scheda della plancia: il GS mostra i PX della
scheda o, senza, il riferimento della scala, e il suggerimento dice sempre «PX di riferimento del GS …». Pagina del bestiario online: nuovo filtro
«Grado di Sfida» con i GS presenti (oggi fino a Semidio, per i Dragomedusa); `docs/bestiario/bestiario-online.html` e `bestiario.html` rigenerati.
I GS dei profili sono tutti nella scala, con due eccezioni del manuale: «—» (nessun GS, 0 PX) ed «Elite» (Signore della guerra hobgoblin).

**Altre regole comuni, 0.23 → 0.46** (capitoli 1–6, confrontati riga per riga): Iniziativa (sopra); scala del GS (sopra); «Passo in Q Base salvo scala
esplicita» e **cono con larghezza finale metà della lunghezza**; il resto invariato (i grassetti non contano). Il cono *non* è stato applicato:
sulla mappa la A.138 (decisione 142) lascia al master la scelta dell'ampiezza finale; applicarlo vorrebbe dire cambiare un'approvazione.
Da decidere con Davide se per i coni delle creature l'ampiezza proposta debba essere metà della lunghezza (domanda non aperta: nessuna scheda
esistente cambia).

## B. Dragomedusa

`tools/genera_mostri_dragomedusa.mjs` scrive `esempi/nemici/mostri/dragomedusa-giovane.json` e `dragomedusa-adulto.json` (§7.12, tutte le tabelle):
PV 900/1.600, AR 18 (14 + 4 magica) / 24 (18 + 6), PM 80/120, Difese 12/13, Iniziativa +2 (1d10 + 2 naturale), Caratteristiche, Salvezze 14/13/10/12 e
16/14/11/13, Abilità, Artigli e Morso (portate 1/2 e 2/3 Q Base), Soffio di Fulmine, Cattura con filamenti, Assorbimento (Rosso 15/25 UER, Blu 1/2 UEB,
Verde 3/5 UEV, batteria 3/5 PM), Fluttuazione, Percezione chromatica, Isolante 6/8; GS **Mito 200 PX** e **Semidio 400 PX**, per 4 PG; «Fonte: dal
Manuale dei Mostri v0.46». Il danno «4d10 × 5» ha un moltiplicatore: il formato lo accetta (`4d10×5`) e la plancia lo mostra com'è, ma il dado non si
tira da solo (specDaFormula non lo legge: nessun tiro sbagliato). Il Volo è in Passo in volo Q Base (12/24/36 Q Tattici → 120 Q Base ecc.); la
pedina «1 × 1 / 2 × 1 Q Tattici» e l'ingombro 14 × 10 Q Base sono nella capacità «Dimensioni e scale» (Taglia Grande), non nel campo `spazio`.

## C. La fonte

224 delle 225 schede di `esempi/nemici/mostri/` sono nel Word 0.46 con lo stesso GS e PX (controllo per nome, `GS e PX per 4 PG`): la riga della
fonte dice «v0.46 (Word del 27/10/2026)», il resto della riga (capitolo e sezione) è invariato, e i test `tests/mostri-*.test.js` accettano la versione
vecchia o la nuova. Il Lorath (7.11) non aveva GS/PX nel file: nella 0.46 ha «Veterano • 50 PX provvisori»; non toccato (lotto 5).

## D. Prova e test

`tests/bestiario-lotto4.test.js`: nessun nemico dei dati con Iniziativa negativa; il minimo nel calcolo (anche per un file di prima); scontro con due nemici
che prima avevano Iniziativa negativa; scala del GS completa; i due Dragomedusa con tutti i valori del manuale; filtro per GS nella pagina online; generatori.
Nel browser (820 px, copie nella cartella temporanea, porta 3017): Alce (−1) e Ankheg (−4) salvati come prima appaiono a 0 nell'elenco e nella bozza; nello
scontro tirano 0 + 5 e 0 + 4 (solo d10); i due Dragomedusa 2 + 10 con GS Mito e Semidio e PX nella mini-scheda; filtro «GS Mito» → Dragomedusa giovane,
«GS Semidio» → Dragomedusa adulto.
