# Caricatori parziali (03/11/2026)

Richiesta di Marcello del 3/11, dal tavolo: «un caricatore non è pieno o vuoto, ha i colpi che ha». È lo stesso cambio di
struttura del lotto 163 per le celle (A.215), applicato ai caricatori.

Controllo dei manuali a inizio lavoro: Giocatore 0.54, Magia 1.11, Armamenti 0.74, Equipaggiamento 0.30, E&L e
«per-davide.md» invariati (stesse date del registro).

## A. Com'era prima (ricognizione)

**Dove stanno i colpi.** Tutto nella sessione del personaggio, `sessione.munizioni[uid dell'arma]`:

| Campo | Che cos'è |
|---|---|
| `colpi` | colpi del caricatore inserito nell'arma |
| `riserve` | quanti caricatori **pieni** di scorta (numero; si cambia con − e + nell'Inventario) |
| `parziali` | i colpi di ognuno dei caricatori di scorta non pieni (`[22, 9]`) |
| `vuoti` | quanti caricatori di scorta a 0 colpi |

Le **munizioni sciolte** sono voci dell'Inventario (`tipo: munizioni`, per esempio «Proiettili da fucile» ×40): la quantità
della voce resta la scelta del giocatore, e quelle messe nei caricatori si contano a parte in `sessione.scorte[uid della voce]`
(consumate). Disponibili = quantità − consumate. I caricatori vuoti da comprare del catalogo («Caricatore vuoto per arma
leggera…», `munizioni.json` → `ricarica.caricatori_vuoti`) sono voci dell'Inventario a sé: danno il nome nella scheda e il
numero di file nella stampa, ma non sono collegati ai contatori della sessione (non lo erano prima e non lo sono ora).

**Che cosa c'era già.** Il modello sapeva già tenere parziali e vuoti: «Ricarica» metteva un pieno di scorta (o, senza pieni, il
parziale più carico se aveva più colpi dell'inserito) e il caricatore tolto restava come parziale o vuoto. Il lotto 163 aveva
aggiunto «Riempi i caricatori» (tutti insieme, fuori dal combattimento). **Mancavano**: togliere il caricatore senza metterne un
altro, scegliere quale caricatore di scorta mettere (un parziale anche se c'è un pieno, o uno con meno colpi), riempirne uno
solo e con un numero di proiettili a scelta, e i colpi di ogni caricatore in vista.

**Il lotto 163 per le celle**: cella inserita (`colpi`), `senzaCella`, celle tolte con le loro cariche (`celle`), piene di
scorta dalla quantità della voce; `togliCella`, `inserisciCella`, `migliorCella`; il conto «inserita + tolte + piene» che non
cambia mai (test). **Quanto si riusa**: il modello e le operazioni sono gli stessi (inserito, «senza», scorta con i residui,
togli / scegli / rimetti, riempimento fuori dall'arma, conto che non cambia). La forma dei dati dei caricatori **non** passa
a quella delle celle: i caricatori di scorta stavano già in `riserve` / `parziali` / `vuoti`, che è la stessa informazione
raggruppata («Quelli identici possono essere raggruppati», A.215), e cambiarla avrebbe chiesto di migrare tutti i file. Le
funzioni nuove leggono la scorta come elenco (`caricatoriDiScorta`) e la rimettono nella forma di sempre. «Riempi i
caricatori» del lotto 163 resta com'era (salta l'inserito se l'arma è senza caricatore).

**Due modi di ricaricare, distinti** (`munizioni.json` → `ricarica`, `src/ricarica.js` → `modoRicarica`):

- **a caricatore amovibile** (`modo: 'caricatore'`): le armi con una famiglia di munizioni del §7.20.9 (pistole, fucili,
  mitragliatori…), compresi M310 e SA SG2001 (`inserimento_singolo.caricatore_amovibile`), Mandible e Airbrush. Sono loro i
  caricatori di questo lavoro;
- **caricate direttamente** (`modo: 'inserimento'`, `singolo: true`): revolver, doppiette, fucili a pompa e a pallini a
  serbatoio interno (HD14M), archi e balestre. Nessun caricatore: 2 cartucce per AzP, 4 con Ricarica Migliorata o Ricarica
  Esperta, i carichini rapidi a parte. **Non sono state toccate** e non hanno né «Togli il caricatore» né «(n/m)»: la loro
  riga resta «Caricatore 4 / 6» come prima.

## B. Le regole

| Operazione | Costo | Fonte |
|---|---|---|
| Cambiare il caricatore con uno di scorta pronto (anche parziale) | 1 AzP | Armamenti 0.74 §7.20.2 («Sostituire un caricatore amovibile o una cella già pronti costa 1 AzP»), A.135 (decisione 139), schede di M310 e SA SG2001 |
| Arma caricata direttamente | 2 cartucce per AzP, 4 con Ricarica Migliorata / Ricarica Esperta | A.135 (decisione 139), A.182 |
| Ricarica Esperta, operazione gratuita | una per Round, alla propria Iniziativa, fino a 4 cartucce (o un cambio di caricatore) | A.135, A.182 (`ricarica_rapida.talenti`) |
| Riempire un caricatore con le sciolte | fuori dal combattimento; **nessun tempo segnato** | A.215; il tempo è la A.244, aperta |
| Togliere soltanto il caricatore / metterlo in un'arma vuota | **nessun costo a parte** | il manuale non lo dà: A.249 (nuova) |

## C. Che cosa cambia

**Motore** (`src/ricarica.js`): `caricatoreInserito`, `caricatoriDiScorta`, `togliCaricatore`, `inserisciCaricatore`,
`cambiaCaricatore` (il cambio: entra quello scelto, senza scelta il più carico, come prima), `riempiCaricatore` (uno solo,
`quale` = 'inserito' o i colpi di quello di scorta, `quanti` = quanti proiettili), `totaleColpi`. Nella sessione il segno
`senzaCaricatore`; `ricaricaArma(…, colpi)` sceglie il caricatore; `togliCaricatoreArma`, `inserisciCaricatoreArma`,
`riempiCaricatoreArma`. Se i caricatori di scorta hanno meno colpi di quello inserito, «Ricarica» non ne mette uno da sé
(come prima) ma il motivo lo dice: «sceglilo in “Cambia con questo”».

**Il totale non cambia.** Inserito + caricatori di scorta + sciolte disponibili restano lo stesso numero in ogni
operazione; lo controlla un test su 60 sequenze a caso di 25 operazioni (`tests/caricatori-parziali.test.js`). Le correzioni
a mano (− e + dei colpi e dei caricatori pieni) restano correzioni del giocatore, come prima.

**Dove si vede «(attuali/massimi)»:**

| Posto | Come |
|---|---|
| SD, tab Combattimento (riquadri delle mani) | «Caricatore inserito **(15/30)**», «Di scorta: **(22/30) · (30/30) ×2**», «Togli il caricatore», scelta + «Cambia con questo» / «Inserisci», «Riempi [quale] con [N] · Metti N proiettili» con prima → dopo e la nota sulla A.244 |
| SD, tab Inventario (riga dell'arma) | «Caricatori nell'arma (15/30) · di scorta (22/30)», con − e + dei pieni |
| «Attacca!» | «Munizioni 3 · caricatore (15/30)» |
| Plancia del Tavolo (carta del PG, armi) | «· (15/30) · scorta (22/30) (30/30)» accanto a VA e danno |
| Scheda da stampare, foglio 3 | etichette delle file: «nell'arma (15/30)», «car. 2 (22/30)»; le file in più (almeno 2) restano «car. N» da segnare a penna |

**Dove non c'è posto, o non si mostra:** la mini-scheda dei token sulla mappa e la vista dei giocatori non hanno le armi, quindi
nemmeno i caricatori; i moduli integrati (lanciagranate della Punisher) restano «colpi / capacità» come prima, senza scorta; il
foglio 4 della SS (Inventario) non ha una riga per le armi con i caricatori: stanno nel foglio 3.

## D. I personaggi di adesso

Nessuna migrazione: un file salvato prima ha già `colpi`, `riserve`, `parziali`, `vuoti`; «un caricatore pieno di riserva»
è un caricatore a pieni colpi, le sciolte restano sciolte. Controllo in sola lettura con `node tools/caricatori-prima-dopo.mjs
<file o cartella>` (prima = il conto del modello di prima sui numeri del file; dopo = `totaleColpi`):

| Personaggio (copia) | Arma | Prima | Dopo | Caricatori come si vedono ora |
|---|---|---|---|---|
| Botha Pretorius (16/10, 25/10) | AXIS 227 · Carabina Punisher · PSG99 | 15 · 30 · 30 | 15 · 30 · 30 | (15/15) · (30/30) · (30/30) |
| Dimitri Orlav (04/10) | AXIS 227 · Carabina Punisher | 45 · 56 | 45 · 56 | (15/15) + (15/15)(15/15) · (26/30) + (30/30) |
| Duncan McDuff (07/10, 25/10) | AXIS 227 · Carabina Punisher | 45 · 42 | 45 · 42 | (15/15) + 2 × (15/15) · (12/30) + (30/30) |
| Lucas (20/10, 25/10, 27/10) | Carabina Punisher · AXIS 227 | 42 · 40 | 42 · 40 | (12/30) + (30/30) · (10/15) + 2 × (15/15) |
| Michele Giorgetti (11/10, 25/10) | AXIS 227 · Carabina Punisher | 39 · 60 | 39 · 60 | (9/15) + 2 × (15/15) · (30/30) + (30/30) |
| Oshi Nagata (07/10) | AXIS 227 · Carabina Punisher | 45 · 60 | 45 · 60 | (15/15) + 2 × (15/15) · (30/30) + (30/30) |
| Pablo Zaion (11/10, 25/10) | AXIS 227 · Carabina Punisher · Bolter 10 | 43 · 30 · 45 | 43 · 30 · 45 | (13/15) + 2 × (15/15) · (30/30) · (15/15) + 2 × (15/15) |

Copie lette: `personaggi/` di questo PC (copia di prova) e `PersonaggiBackup/` (04–05/10, stessi numeri). Nessuno ha munizioni
sciolte compatibili. **I file più recenti di Davide (zip del 26/10, `docs/file-di-davide-2026-11-02.md`) non sono su questo
PC**: lo strumento è pronto, sola lettura, per quando ci sono. Esempi del repo: 4 PG, stessi totali.

## Prove

- Test: `tests/caricatori-parziali.test.js` (la prova di Marcello 30 → 15 → togli → 22/30 → 7 sciolti nel 15 → 22/30;
  riempimento parziale (7/30); cambio con un parziale scelto; totale su sequenze a caso; revolver 2 e 4 con Ricarica Esperta;
  stampa; plancia; scheda; personaggi di prima ed esempi), più `tests/ricarica.test.js` aggiornato sul motivo nuovo.
- Browser, a 820 px, su copie nella cartella di prova (porta 3017): la sequenza di Marcello dai pulsanti, il revolver
  0 → 4 con Ricarica Esperta («tu: 4, Ricarica Esperta») e 0 → 2 senza, la stampa con «nell'arma (22/30) · car. 2 (22/30)».
  Nota: la cartella di prova del server era nata prima della guardia del lotto 161, quindi il server di prova rifiutava i
  salvataggi (500, «Scrittura rifiutata»); le prove girano nella scheda, il salvataggio sul server non è stato provato.

## Domande nuove

- **A.249** — Togliere soltanto il caricatore (senza metterne un altro) o metterne uno in un'arma vuota: quanto costa? Il
  manuale dà il costo del cambio (1 AzP); la stessa domanda della A.243 per le celle. *Nel frattempo:* nessun costo segnato.
- **A.250** — Un caricatore parziale di scorta è «pronto» per il cambio da 1 AzP (e per l'operazione gratuita di Ricarica
  Rapida / Esperta), come uno pieno? *Nel frattempo:* sì, costa come quello pieno.
