# Catalogo dell'equipaggiamento: lotti da estrarre

Stato al 26 settembre 2026. Fonte: Manuale degli Armamenti v0.50. Metodo: `tools/estrai_manuali.py`
e `docs/pilota-estrazione-armamenti.md`.

Questa è la lista dei prompt successivi: **un lotto per prompt**, nell'ordine di utilità al
tavolo. Ogni lotto aggiunge uno o più file in `data/equipaggiamento/` e una riga in `index.json`.
Poi si estende il validatore per i campi nuovi e si aggiungono i test.

Le pagine sono quelle **reali** del PDF, ricavate dai titoli dei paragrafi. Dal §7.18 in poi
l'indice del manuale riporta una pagina in meno. «Tabelle» è il numero trovato da pdfplumber
su quelle pagine: le tabelle impilate contano come una.

## Già nel catalogo (lotto 1, dal pilota)

| File | Contenuto | Paragrafo | Pagine |
|---|---|---|---|
| `armi.json` | 28 armi ravvicinate del catalogo Commerciale | §7.1.1–7.1.3 | 4–7 |
| `armature.json` | 3 armature commerciali civili, penalità per categoria | §7.11.1–7.11.3 | 62–63 |

Da completare nello stesso ambito, a basso costo:
- **Manovre compatibili** dei profili commerciali, §7.1.7, pp. 9–10: una tabella Modello →
  Manovre. Diventa un campo `manovre` in `armi.json`.
- **Rinforzi** delle armature, §7.11.2, p. 62: 2 kit (Leggero, Pesante) con AR, FOR, PI e
  costo, più la compatibilità per categoria (già in `rinforzi_ammessi`). Diventano oggetti
  `accessorio` montabili su un'armatura: servirà estendere il calcolo, che oggi gestisce
  `montato_su` solo per le armi.

## Da estrarre, in ordine di utilità

### 1. Armi a distanza commerciali — §7.7, pp. 33–35

- **Contenuto:** pistole, fucili, armi medie, lanciagranate, armi da lancio (compresi Pugnale e
  Ascia leggera lanciati).
- **Struttura:** per ogni gruppo **tre sottotabelle impilate**:
  - Danno/AC/VA/FOR/Max Q/CC/INC;
  - Abilità/Mani/PI/MOV/Modalità;
  - Qualità/PS INT/REP/Costo.
  pdfplumber le legge come una sola tabella; vanno divise sulle righe «Modello» e riunite per
  modello.
- **Campi nuovi:** `gittata_q` (Max Q), `cc` (capacità del caricatore), `inc`, `modalita`
  (S, RB, RM, RL, TR, FS, DC), `mov`, `ac` (applicazioni di danno), modificatore `va` della
  scheda.
- **Proprietà in prosa** sotto le tabelle («HD14M. Proprietà: Sbilanciante…»); valori speciali
  come «Mun.».
- **Effetti sulla scheda:**
  - il modificatore VA dell'arma entra nel VA per colpire;
  - la penalità MOV si aggiunge alla sessione;
  - il contatore munizioni della modalità tavolo potrà partire da `cc`.
- **Per Davide:** i profili lanciati che condividono prezzo e Integrità con l'arma ravvicinata
  (stesso oggetto, due profili?).

### 2. Scudi — §7.4, pp. 23–30

- **Tabelle:**
  - §7.4.1 Scudo Punisher (p. 24);
  - §7.4.2 Catalogo generale degli scudi (pp. 24–26);
  - §7.4.3 Proprietà comuni e sovrapposizioni (p. 26);
  - §7.4.11 Modificatori alle Parate (p. 30).
- **Scudi corporativi** §7.4.4–7.4.10 (pp. 27–29): **nessuna tabella trovata**, sono schede in
  prosa, da estrarre con `--prosa` e un parser dedicato o a mano.
- **Campi:** `ar`, `for_richiesta`, `mani`, proprietà di Parata; il file è `scudi.json`
  (tipo `scudo`, stati imbracciato / pronta / zaino, già previsti).
- **Effetti sulla scheda:** AR dello scudo imbracciato nelle Protezioni, bonus alla Parata
  (§7.4.11), confronto con Difensiva X delle armi (§7.1.3).

### 3. Cataloghi corporativi

In ordine di peso:

- **Armi ravvicinate corporative** — §7.1.9, pp. 11–17: 39 armi e uno Scudo (Guardie Sacre).
  Stesse colonne del catalogo Commerciale più proprietà e Manovre proprie. Estende `armi.json`
  oppure un file per Corporazione.
- **Armi a distanza corporative** — §7.8, pp. 36–51: il blocco più grande (16 pagine), stessa
  struttura a tre sottotabelle del §7.7 più proprietà in prosa.
- **Armature corporative:**
  - §7.11.5 Armature Bauhaus (pp. 64–66);
  - §7.11.6 Esoscheletri Bauhaus (p. 67);
  - §7.11.7–7.11.8 Alleanza (pp. 67–69);
  - §7.13.1–7.13.3 Capitol (pp. 71–74);
  - §7.14.1–7.14.3 Imperial (pp. 80–82);
  - §7.15.2–7.15.3 Cybertronic (p. 91);
  - §7.16.1–7.16.4 Mishima (pp. 95–97);
  - §7.17.2–7.17.5 Fratellanza (pp. 100–103).

  Servono: AR magica, proprietà native (Mimetismo X, Discreta, Assetto da pattuglia…, §7.11.4
  p. 63) e le penalità proprie dei modelli iconici (§7.17.4 Penalità effettive, p. 102).
- **Corredi e dispositivi corporativi:** Propulsore Banshee e Paracadute Capitol
  (§7.13.4–7.13.5, pp. 74–75, con tabelle «Voce / Regola»), Esoscheletro APE (§7.13.6),
  corredi da campo e dotazioni per reparto (§7.13.7–7.13.9, §7.14.8–7.14.9, §7.16.5–7.16.6,
  §7.17.6–7.17.7), armi e granate specialistiche Imperial (§7.14.6–7.14.7, pp. 85–86),
  Sistema di Interfaccia Neurale e moduli Cybertronic (§7.15.1, §7.15.4–7.15.5, pp. 90–94).
  Molte regole in prosa: parte resterà testo (`note_manuale`), non dati.

### 4. Accessori delle armi — §7.3, pp. 19–22

- **Contenuto:** mirini, riduzione del rumore (§7.3.1), supporti di tiro (§7.3.2),
  illuminazione e visione (§7.3.3), batterie (§7.3.4).
- **Campi:** tipo `accessorio`, `montato_su` già previsto; servono i bonus alla Prova dell'arma
  e la compatibilità per famiglia o modello.
- **Effetti sulla scheda:** bonus al VA dell'arma impugnata su cui l'accessorio è montato (oggi
  il calcolo dà solo l'avviso se l'arma non è impugnata).

### 5. Munizioni e alimentazioni — §7.20, pp. 114–121

- **Contenuto:**
  - famiglie e consumo (§7.20.1);
  - caricatori e scorte (§7.20.2);
  - granate (§7.20.3);
  - razzi (§7.20.4);
  - celle energetiche (§7.20.5);
  - combustibile (§7.20.6);
  - munizioni speciali (§7.20.7);
  - dardi chimici Bauhaus (§7.20.8);
  - compatibilità balistiche (§7.20.9).
- **Campi:** tipo `munizioni` (solo quantità), compatibilità con le armi, prezzo per caricatore
  o unità.
- **Effetti sulla scheda:** il contatore munizioni della sessione collegato al caricatore
  dell'arma; eventuali modificatori al danno delle munizioni speciali.

### 6. Equipaggiamento sanitario — §7.19, pp. 109–113; §7.12, pp. 70–71

- **Contenuto:**
  - kit di pronto soccorso (§7.19.1);
  - cartucce sanitarie (§7.19.2);
  - UMC (§7.19.3);
  - dispositivi portatili (§7.19.4);
  - diagnostica e chirurgia (§7.19.5);
  - corredi specialistici dell'Alleanza e kit trauma (§7.12.1–7.12.2).
- **Campi:** tipo `sanitario` (quantità, usi), bonus alle Prove di Medicina. Si collegano alle
  Ferite e al Sanguinamento della modalità tavolo (§5.14, §5.15).

### 7. Artefatti — §7.5, pp. 30–31; §7.10, pp. 58–60

- **Contenuto:** profili con riserva mistica (§7.5.1), classificazione di potenza e costo di
  sintonizzazione, analisi e identificazione (§7.10).
- **Campi:** tipo `artefatto`, `potenza`, `sintonizzazione`, riserva di PM. Le regole sono le più
  intrecciate (Addestramento Taumaturgo, Classi taumaturgiche, Tecnomante): come da roadmap,
  per ultimi, con probabile testo + `TODO(Davide)`.

### 8. Resto del manuale

- **Prezzi di riferimento delle armi** — §7.9, pp. 52–57: serve come **controllo incrociato**
  dei costi estratti dagli altri lotti, non come dati nuovi.
- **Integrità degli oggetti** — §7.2.1, p. 18: regole di PI e PS INT. Servirà quando la
  modalità tavolo terrà i PI attuali degli oggetti.
- **Unità robotiche** — §7.18, pp. 107–108 (Cuirassier Attila, Generatore RF366): schede
  singole, da decidere se entrano nel catalogo o restano testo.
- **Contenuti ancora da sviluppare** — §7.6, p. 32: niente da estrarre; da ricontrollare alla
  prossima edizione.

## Regole di ogni lotto

- **Metodo:** CSV grezzo (`--tabelle`), CSV pulito controllato riga per riga sulle immagini
  delle pagine, poi generatore in `tools/lotti/` come `lotto1_pilota.mjs`. Da lì in poi la
  fonte è il JSON.
- **Campi comuni a ogni oggetto:** `id`, `nome`, `tipo`, `catalogo`, `famiglia`,
  `nomi_alternativi`, `note_manuale`, `paragrafo`, `versione_manuale`.
- **Effetti strutturati solo per ciò che la scheda calcola** (come `Difensiva +2` →
  `{ parata_va: 2 }`); il resto resta testo del manuale.
- **Ambiguità:** non inventare, mettere `TODO(Davide)` e annotare la risposta in
  `docs/risposte-master.md`.
