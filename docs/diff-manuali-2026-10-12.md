# Controllo dei manuali del 12 ottobre 2026 — solo ricognizione

Quattro Doc cambiati dal controllo dell'11 ottobre, tutti il **12/10 fra le 12:33 e le 12:34 UTC**: è una
modifica coordinata, con lo stesso contenuto ripetuto nei manuali che lo riguardano. **Nessun dato
applicato:** la sessione del 12/10 lavora al bestiario online (P6). Le date viste del registro **non** sono
aggiornate; i testi nuovi sono in `docs/manuali-txt/`.

Invariati l'E&L (09/10 22:40:53) e «per-davide.md» (09/10 22:41:02), già riscaricati l'11/10, e i sei Doc
trovati il 04/10 (Veicoli 0.2, ASA Scout MK4 0.2, Mostri 0.1, Talenti magici e mistici, Modifiche Layout
APP, Prontuario del Combattimento v1.3).

| Doc | Modificato (UTC) | Edizione | Che cosa cambia |
|---|---|---|---|
| Manuale del Giocatore | 2026-10-12 12:33:29 | **0.48** (prima 0.47) | §3.9.2 Maestro d'Arma (CyberArma), §3.9.5 Architetto TecnoMistico (CyberArma), §5.13 Senz'armi (Guanti indossati) |
| Manuale della Magia | 2026-10-12 12:33:49 | **1.4** (prima 1.3) | sez. 24 eccezione della CyberArma, sez. 26 Guanti (classificazione e mani) |
| Manuale degli Armamenti | 2026-10-12 12:34:34 | **0.61** (prima 0.60) | cap. 7 classificazione degli oggetti, §7.24 Guanti (mani e impiego), **§7.25 CyberArma (nuovo)** |
| Manuale dell'Equipaggiamento | 2026-10-12 12:33:19 | **0.7** (prima 0.6) | cap. 10 Guanti (mani e impiego), classificazione degli oggetti, rimando alla CyberArma |

Due soli argomenti, ripetuti nei quattro manuali.

## 1. Classificazione degli oggetti e Guanti da Combattimento Mistico

Frase comune ai cap. 7 (Armamenti), 10 (Equipaggiamento) e sez. 26 (Magia):

- **Regola — funzione e natura separate.** Un oggetto può essere **contemporaneamente** un'Arma e un
  Artefatto Mistico o TecnoMistico; le categorie sono «viste della stessa istanza» e quantità, peso,
  Integrità, riserve e SnT si conteggiano **una sola volta**. La modalità di impiego distingue gli oggetti
  **impugnati** da quelli **indossati** e indica le **mani occupate**. Conferma quello che il catalogo
  dell'app fa già (`data/equipaggiamento/`, `rif_sostituiti`, `src/fonti.js`): da verificare che nessuna
  voce doppia quantità o SnT.
- **Regola — Guanti da Combattimento Mistico (§7.24, cap. 10, sez. 26, Giocatore §5.13).** Arma
  ravvicinata, famiglia **Armi da pugno**, tipo «Guanti da combattimento»; natura Artefatto Mistico. Si
  usano con **Corpo a corpo (FOR)**, portata 1 Q, Manovra **Stordire**. Sono **indossati e occupano 0
  mani**: si può impugnare un'arma o un oggetto in ciascuna mano, oppure un'arma a due mani. I **Tirapugni
  ordinari** restano impugnati e occupano una mano, con il proprio danno fisso che **non** sostituisce
  quello del personaggio.
- **Regola — impiego in combattimento.** Col pugno si usa il profilo dei Guanti, con l'arma impugnata il
  profilo dell'arma. I pugni coi Guanti **conservano il danno senz'armi** e i benefici pertinenti,
  compresi **Arti Marziali** e il **dado del Lottatore**. I poteri dei Guanti **non** si trasferiscono alle
  armi impugnate.

**Che cosa tocca nell'app:** i Guanti sono già nel catalogo (`tools/lotti/lotto_artefatti_cap10.mjs`), ma
andrà verificato che occupino 0 mani (`src/mani.js`, tab Combattimento: riquadri Mano destra e Mano
sinistra restano liberi) e che siano un profilo d'attacco senz'armi, non un'arma impugnata
(`src/attacco.js`, `attacco_ravvicinato`). È il lotto 1 proposto qui sotto.

## 2. CyberArma — §7.25 degli Armamenti (nuovo)

Artefatto TecnoMistico **riservato ai Custodi** e, per eccezione, ai **Tecnomanti**. Impugnatura,
condensatore di energia mistica e frammento di cristallo; **nessuna batteria interna** nel progetto
originale, alimentato dai **PM personali**. La lama si manifesta all'attivazione.

- **Regola — impiego del Custode (Giocatore §3.9.2).** Maestro d'Arma al **III Grado** permette di ottenere
  o costruire la propria CyberArma personale: evoca l'**Arma Astrale** per **1 PM e 15 Round**, con
  l'evocazione compresa nell'Azione del primo attacco, e **+1 danno**. Danno base dal Grado di Custode.
  Nessun altro personaggio evoca con quell'oggetto l'Arma Astrale di quel Custode.
- **Regola — impiego del Tecnomante (Giocatore §3.9.5, Magia sez. 24).** Profilo base: **Armi da mischia
  (DES)**, una mano, portata 1 Q, FOR richiesta 3; **1 AzP e 2 PM** manifestano per **10 Round** una lama
  da **1d8 Magico** più i modificatori pertinenti, **senza Concentrazione**; nessun bonus proprio al VA; il
  danno Magico è assorbito normalmente dall'Armatura. Non dà Talenti, progressione del danno né benefici di
  Maestro d'Arma.
- **Regola — batteria interna.** Il Tecnomante può modificare il progetto per installare una batteria
  compatibile; la configurazione modificata resta usabile **solo** da Custodi e Tecnomanti e si alimenta a
  PM personali **oppure** dalla batteria. La modifica **non** cambia danno, durata, costi in PM o benefici
  di Classe.
- **Regola — colore della lama.** Lo determina il **frammento di cristallo** nel condensatore e cambia
  sostituendo il componente. Il frammento **focalizza** e **non** è da solo una riserva di PM; il colore
  **non** aggiunge effetti elementali né cambia le compatibilità energetiche.
- **Regola — costruzione.** La costruzione tramite Maestro d'Arma è un'**eccezione specifica** del Custode:
  non abilita alla creazione generale di Artefatti TecnoMistici. Il Tecnomante conserva progetto,
  costruzione, infusione e la modifica per la batteria.

**Lacune dichiarate dal manuale** (testuali: «restano da completare nel catalogo», «devono essere definiti
nella relativa configurazione», «non è assegnata automaticamente una batteria Verde da 10 PM»): **SnT del
progetto originale**, parametri commerciali (prezzo, Reperibilità, Qualità, PS Integrità, PI, peso),
**costi e procedura** di costruzione e di modifica, colore/capacità/SnT/costo della batteria compatibile.
→ **TODO(Davide), domanda nuova A.158** (sotto).

## 3. Lotti proposti

| # | Ambito | Contenuto |
|---|---|---|
| 1 | Guanti: 0 mani | `data/equipaggiamento/` (Guanti: famiglia Armi da pugno, indossati, 0 mani, Corpo a corpo FOR, portata 1 Q, Stordire), `src/mani.js`, `src/attacco.js` (profilo senz'armi con Arti Marziali e dado del Lottatore), tab Combattimento, SS |
| 2 | Classificazione | controllo che nessuna voce del catalogo doppi quantità, peso, Integrità, riserve o SnT fra le categorie Armi / Artefatti / Batterie; `tools/verifica_frasi.mjs` per le frasi nuove |
| 3 | CyberArma | scheda nel catalogo con i soli dati certi (due impieghi, PM personali, 1d8 Magico, 10 Round, 1 PM/15 Round del Custode, frammento e colore) e `TODO(Davide)` sui parametri mancanti; vincolo di Classe (Custode, Tecnomante) |

## 4. Domanda nuova per Davide

**A.158 — CyberArma: parametri mancanti (Armamenti §7.25).** Il paragrafo descrive i due impieghi ma
dichiara da completare: SnT del progetto originale; prezzo, Reperibilità, Qualità, PS Integrità, PI e peso;
costo e procedura della costruzione tramite Maestro d'Arma e della modifica per la batteria interna; colore,
capacità, SnT e costo della batteria compatibile. Dice espressamente che **non** si assegna automaticamente
una batteria Verde da 10 PM. Senza questi numeri l'app non può mettere la CyberArma in catalogo né gestirne
la sintonizzazione. *Nel frattempo:* nessuna scheda nel catalogo.
