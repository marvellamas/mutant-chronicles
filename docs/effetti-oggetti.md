# Effetti degli oggetti sui VA

Stato al 27 settembre 2026. Dati: campo `effetti` degli oggetti del catalogo (`data/equipaggiamento/*.json`, scritto da `tools/effetti_catalogo.py`) e degli oggetti di dotazione (`data/dotazioni.json` → `oggetti_dotazione`, scritto da `tools/genera_dotazioni.py`); oggetti personalizzati: `personalizzato.effetti`, con l'editor della scheda. Calcolo: `src/equipaggiamento.js` (raccolta), `src/condizioni.js` (modalità tavolo).

## Schema

```json
{ "abilita": "Percezione", "valore": 2, "ambito": "uso_specifico", "uso": "tracce",
  "condizione": "<frase del manuale, copiata>", "fonte": "Armamenti §7.13.8" }
```

- `tipo` (facoltativo, predefinito `va`). Dal 27 settembre 2026 (elmetti §7.21, proprietà delle armature corporative §7.11–§7.17) lo schema ha anche i tipi della tabella qui sotto. Solo `va` ha `abilita`.
- `beneficio` (facoltativo): chiave di un beneficio che **non si somma** con le sue copie (Armamenti §7.21.1: «copie dello stesso beneficio non si sommano»). Fra gli effetti attivi con la stessa chiave vale il maggiore, gli altri non contano. Esempio: Filtro respiratorio 2 di un'armatura e Maschera filtrante dell'elmetto: +2, non +4.
- `proprieta` (facoltativo): nome della proprietà del manuale che l'effetto traduce («Imbottita 1»). Le proprietà di un oggetto senza effetto e non già gestite altrove compaiono nella SD come **promemoria**.

| tipo | Campi propri | Ambito | Dove entra |
|---|---|---|---|
| `va` | `abilita` | generale, situazionale, uso_specifico | VA dell'Abilità (come sopra) |
| `attacco` | `attacchi`: `tutti`, `ravvicinati`, `distanza` | generale | VA per colpire delle armi impugnate e di «Senz'armi», quindi anche in «Attacca!» |
| `danno` | `attacchi`: `tutti`, `ravvicinati`, `distanza` | generale | danno delle armi (bonus ordinario, prima dei moltiplicatori, §5.13) |
| `iniziativa` | — | generale | Iniziativa effettiva (pillola della SD) e stampa |
| `salvezza` | `salvezza`: id di una Prova Salvezza, oppure `null` = «la PS già prevista dall'effetto»; `uso` | uso_specifico | righe «solo per un uso» sotto le Prove Salvezza (tab Identità) |
| `caratteristica` | `caratteristiche`: sigle; `uso` | uso_specifico | righe «solo per un uso» nella tab Combattimento, sezione Protezioni |
| `contromisura` | `effetto`: effetto aggiuntivo del §5.24 (Concussivo, Elettricità, Fuoco…); `valore` = soglia | generale | «Resistenze» nella sezione Protezioni (vicino all'AR), non fra le Abilità |
| `ar_contro` | `contro`: tipo di danno (esplosioni…) | generale | «Resistenze» nella sezione Protezioni e valore «AR contro …» accanto all'AR: AR totale + il maggiore fra scudo e armatura (§7.4.3, §7.11.4) |
| `ar` | `magica` (facoltativo): quanta parte dell'AR in più è magica | generale, situazionale | AR del personaggio (`src/protezione.js`, docs/ricognizione-ar-pi.md); situazionale con l'interruttore al tavolo (Scudo Magico delle Guardie Sacre, §7.4.10) |
| `movimento` | — | generale | Q in più al Movimento effettivo (Passo, Corsa, Scatto), con la riga dell'oggetto: Gambe potenziate, Equipaggiamento §7.5 |

Gli impianti cibernetici (Equipaggiamento 0.5, cap. 7) usano lo stesso schema quando sono «installati». Un chip del Processore (`richiede_innesto: "processore"`) conta solo con un Processore installato. La fascia di Umanità (Giocatore §5.21) aggiunge una riga `salvezza` Magia «contro la Corruzione» generata dal motore, con `umanita: true` (`docs/ricognizione-cibernetica.md`).

**Talenti** (dal 30 settembre 2026, `docs/censimento-talenti.md`): lo stesso schema in `effetti.valori` delle voci dei Talenti (`talenti_liberi.json`, `classi.json`), accanto alle chiavi di `effetti` che il motore legge già (`iniziativa`, `attacco_distanza`, `lancio`…). Contano solo al tavolo, nei valori effettivi (`src/talenti.js`, `src/condizioni.js`): il totale da regole e la SS non cambiano. In più per i Talenti:
- `salvezza` anche **generale** o **situazionale**, con l'id della Prova Salvezza (Scudo Spirituale); `resistenza: true` per le Resistenze specifiche: strutturale + Prova Salvezza Migliorata + Resistenza non oltre 18 (Giocatore §8.6);
- `parata` (nuovo): `con: "scudo"`, `contro: "distanza"` o `"ravvicinata"`, generale: modifica la Parata con lo Scudo (Parata a Distanza: +2 a distanza);
- `danno` con `armi: "artefatto"`: solo le armi Artefatto (Mistiche o TecnoMistiche; Meccanica Potenziata);
- **Talenti di lancio** (applicati da «Lancia!», `src/lancio.js`): il campo `incantesimi` dice a quali Incantesimi vale l'effetto, e con `incantesimi` l'effetto non tocca i VA della scheda:
  - `offensivi`: la versione ha una colonna che inizia con «Danno» e contiene dadi (non c'è un campo «offensivo» nei dati di `incantesimi.json`; regola in `docs/censimento-talenti.md`);
  - `area`: offensivo e con una colonna «Area» o «Raggio», o con l'Anticipazione dell'Area;
  - `cura`: una colonna «Guarigione» con dadi; `cura_ferite_contatto`: Cura Ferite lanciato a contatto; `danno_o_cura`: offensivo o di cura;
- tipi di lancio: `danno` (con `incantesimi`, senza `attacchi`: si somma al danno della versione), `dado_danno` (un dado in più del primo gruppo), `cura` (PV curati in più), `massimizza` (mostra il risultato con i dadi al massimo);
- `uso_specifico` con `uso: "incantesimi_offensivi"` (o `incantesimi_area`, `incantesimi_cura`, …): si applica da solo a ogni lancio che rientra; `situazionale`: interruttore nel passo Condizioni del pannello «Lancia!» (`dichiarazione.talentiLancio`), non nella scheda. Con «Bonus dei Talenti» spento nessuno dei due conta;
- `valore_per_grado` (es. `{ "1": 1, "3": 2, "5": 3 }`) con `grado_di` (nome della Classe): il valore per Grado minimo in quella Classe, non per livello dell'Incantesimo (Incantesimi Aggressivi: I–II +1, III–IV +2, V–VI +3). La provenienza lo scrive con il Grado: «1d6 +1 SAG +1 Incantesimi Aggressivi (Grado II)»;
- `nota`: un'altra frase del manuale, copiata intera e controllata da `verifica_frasi`, mostrata sotto il danno («Il bonus si applica una sola volta per bersaglio, al primo colpo…»);
- `riduzione_stato` (generale o situazionale): riduce di `valore`, fino ad annullarla, la penalità al VA dello Stato `stato` (id di `regole.json → stati.elenco`); le Prove Salvezza no. Con `prove` (un gruppo di `categorie_prove`) solo le Abilità di quel gruppo: Combattere alla Cieca, Accecato −8 → −4 per attaccare e difendersi (`prove: "fisiche"`, non Pilotare); Sangue Freddo, Terrorizzato −4 → −2, interruttore al tavolo. Nella provenienza una riga «Talento (Stato)»;
- `movimento_armatura` (generale): riduce di `valore` Q, fino a 0, la penalità MOV di armatura e scudo (`equipaggiamento.movimentoQProtezioni`), non quella delle armi: Assalto Armato, riga nel Movimento effettivo;
- `{parametro}` nelle `caratteristiche` e `{annotazione}` nell'`uso`: la scelta del giocatore (Prova di Caratteristica Migliorata, Sport);
- i bonus dei Talenti **si sommano** fra loro e con gli strumenti: la regola «un solo modificatore degli strumenti» (§1.4.1) vale solo per gli oggetti.

**Tecniche Interiori** (dal 2 ottobre 2026, Giocatore §8.9): lo stesso schema in `effetti.valori` delle schede di `tecniche_interiori.json`, scritti da `tools/effetti_tecniche.mjs`. Valgono solo finché la Tecnica è in corso (`sessione.tecnicheAttive`; le istantanee fino alla fine del Round di attivazione), con la provenienza «Tecnica: Nome (fino al Round N)», e non li spegne «Bonus dei Talenti» (`src/tecniche.js` → `effettiTecniche`, `src/condizioni.js`). Tipi in più: `senso` (`senso`, `raggio_q`: riquadro Sensi della tab Combattimento), `movimento_moltiplicatore` (Corsa di Nomura), `movimento_zero` (Radici della Montagna), `riduzione_danno` (Corpo Infrangibile, solo testo calcolato). Accanto: `attacco` (letto da «Attacca!»: `mezzi`, `armi`, `natura`, `dopo_armatura`, `manovre` + `va`, `carica`, `non_parabile`, `onda` con `danno_per_disciplina`), `cura` (Imposizione della Mano Curativa, nell'ordine di `opzioni_costo`), `promemoria`, `breve` (SS, foglio 5) e `ar: true` per l'AR che passa da `regole.json` → `ar.tecniche`.

- `condizione` è la frase del manuale che dà il bonus, copiata intera. `node tools/verifica_frasi.mjs` controlla che esista nel testo dei Doc (`docs/manuali-txt/`); lo stesso controllo è nei test.
- Armi: `specializzazione_danno: false` (campo dell'arma, non un effetto) vuol dire che la Specializzazione della sua famiglia dà solo il +1 VA, senza il +1 danno del §8.8.1. Caso unico: SA30 a dardi, proprietà Danno calibrato (risposta di Davide A.12, 28/09/2026). Il validatore ammette solo il valore `false`.
- Un effetto conta solo con l'oggetto **in uso** (indossato, impugnato…). Gli oggetti senza stati propri (corredi, kit) ricevono «In uso» / «Nello zaino» quando hanno effetti.

## Regola unica (effetti degli oggetti e condizioni della sessione)

| Ambito | Esempio | Nel VA | Nella SD | Nella SS |
|---|---|---|---|---|
| **generale**: ogni uso dell'Abilità | penalità d'armatura; oggetto personalizzato | sì, con l'equipaggiamento | pillola rossa/verde; tooltip con scomposizione e fonte | sì (a riposo, come l'armatura) |
| **situazionale**: circostanza della scena, decide il giocatore | corredo di sopravvivenza nell'ambiente scelto, abiti eleganti, binocolo | solo con la condizione accesa | interruttore in Abilità → «Condizioni degli oggetti»; spento: «Disponibile: … attiva la condizione» nel tooltip | no |
| **uso_specifico**: un tipo di Prova nominato dal manuale | valigetta «tracce», kit «pronto soccorso», armatura «lancio» | no, il VA generale non cambia | valore a parte accanto alla pillola («tracce 9 ▲»), con tooltip: base, modificatore, oggetto, frase, paragrafo; «lancio» anche nella tab Magia | solo se permanente: Potere per lanciare con l'armatura indossata, nel foglio Magia |

Il riquadro «Condizioni attive» (tab Abilità) elenca generali e situazionali accesi; gli usi specifici stanno in righe a parte: «(solo per <uso>: vedi <tab>)».

**Un solo bonus degli strumenti per Prova.** Giocatore §1.4.1: «Si applica un solo modificatore complessivo per la qualità degli strumenti impiegati: i bonus dei singoli pezzi non si sommano» (ripreso negli Armamenti per i corredi). Fra i bonus situazionali accesi sulla stessa Abilità vale il maggiore; il valore d'uso specifico usa il maggiore fra il suo bonus e quello situazionale già acceso. Le penalità si sommano. Gli effetti generali si sommano come le armature.

**Criterio di classificazione.** *Situazionale*: il bonus vale per gli usi ordinari dell'Abilità quando ricorre una circostanza della scena (ambiente, formalità, osservazione a distanza, condizioni per nascondersi). *Uso specifico*: il manuale restringe il bonus a un tipo di Prova (esaminare tracce, pronto soccorso, diagnosi, riparare, disinnescare, arrampicarsi, lanciare).

## Oggetti con effetti (67 effetti, 60 oggetti)

**Dotazione iniziale** (Giocatore §2.16)

| Oggetto | Effetto | Ambito |
|---|---|---|
| Binocolo | +1 Percezione | situazionale |
| Corredo di sopravvivenza ambientale | +2 Sopravvivenza | situazionale |
| Abiti eleganti; Completo cerimoniale | +1 Oratoria | situazionale |
| Corredo di orientamento | +1 Sopravvivenza | uso specifico: orientamento |
| Corredo da assalto verticale | +2 Atletica | uso specifico: arrampicata |
| Abiti da viaggio | +1 Atletica | uso specifico: arrampicata ed equilibrio |
| Corredo artigianale professionale | +2 Tecnologia | uso specifico: lavori del mestiere |
| Corredo di manutenzione da campo | +2 Tecnologia | uso specifico: riparazioni sul campo |
| Corredo di analisi da campo | +2 Scienza | uso specifico: analisi |

**Catalogo** (Armamenti §7.12–§7.19): corredi professionali di Alleanza, Capitol, Imperial, Mishima e Fratellanza, più dispositivi e sanitario.

| Oggetti | Effetto | Ambito |
|---|---|---|
| Valigette investigative / Investigazione (5) | +2 Percezione; +2 Scienza | uso specifico: tracce; analisi |
| Corredi d'intrusione / Intrusione (5) | +2 Tecnologia | uso specifico: serrature e allarmi |
| Kit di controsorveglianza / Controsorveglianza (5) | +2 Tecnologia | uso specifico: controsorveglianza |
| Corredi da artificiere / Artificiere (5) | +2 Tecnologia | uso specifico: esplosivi |
| Kit trauma (5), Kit di pronto soccorso professionale | +2 Medicina | uso specifico: pronto soccorso |
| Corredi da ricognizione / Ricognizione (4) | +2 Percezione | situazionale |
| Corredi di sopravvivenza ambientale (4) | +2 Sopravvivenza | situazionale |
| Corredi da assalto verticale (4) | +2 Atletica | uso specifico: arrampicata |
| Corredi di manutenzione / Manutenzione (4) | +2 Tecnologia | uso specifico: riparazioni sul campo |
| Corredo per operazioni subacquee | +2 Atletica; +2 Sopravvivenza | uso specifico: nuoto con le pinne; orientamento sott'acqua |
| Consultazione occultistica | +2 Occultismo | uso specifico: consultazione di testi |
| Corredo di assistenza Dr. Diana | +2 Medicina; +2 Tecnologia | uso specifico: pronto soccorso; riparazione cibernetica |
| IAS3300 Mirrorshard | +2 Furtività | situazionale |
| Scanner diagnostico portatile e Cybertronic | +2 Medicina | uso specifico: diagnosi |
| Kit chirurgico da campo | +2 Medicina | uso specifico: chirurgia |
| Postazione medica da campo | +3 Medicina | uso specifico: chirurgia e Ferite |

Più la penalità delle armature al lancio con Potere (già nei dati, `penalita.lancio_potere`): uso specifico «lancio», permanente.

## Testi non tradotti in numero

- **Effetti su altri** (non sul personaggio): Attenuatori e Smorzatori (Percezione di chi ascolta lo sparo), Smorzatore acustico Silent, Granata fumogena, munizioni incendiarie e concussive (−2 VA al bersaglio), Disturbatore metafisico IAS3400 (lanci nel campo), Iron Mastiff (VA del robot).
- **Già nei dati con un campo proprio**: Bipiede e Treppiede (`bonus_condizionato` sull'arma), Silenziatore (`effetto_arma`), scudi (Parate: `parata`), Interfaccia neurale (SIN, §7.15.1), penalità di APE Capitol e delle armature.
- **Valore che dipende da altro**: Kit di pronto soccorso improvvisato/standard/professionale, tabella «X 1 +2, X 2 0, X 3 −2» (intensità del Sanguinamento); Generatore Blink IAS3100 (+2 con SIN 2); Scanner Cybertronic (+1 ulteriore con SIN 1); Imbracatura antigravità IAS3200 (Pilotare al posto di Atletica, −2/−4 per andatura).
- **Abilità non indicata**: paracadute Capitol e Airborne («+2 VA alle Prove pertinenti»).
- **Standard, modificatore 0**: corredo agricolo (le due versioni), cassetta degli attrezzi, corredo elettronico e informatico, ricerca documentale, amministrativo, rituale, strumenti artistici; Kit di pronto soccorso standard («non concede bonus al VA»).
- **Armature corporative e elmetti**: tradotti nei lotti del 27 settembre 2026 con i tipi nuovi dello schema; censimento in `docs/proprieta-armature.md`, elmetti in `docs/equipaggiamento-lotti.md`.

## Casi dubbi (per-davide A.36)

- **Binocolo e corredi da ricognizione**: situazionali (osservazione a distanza, come chiesto) o d'uso specifico («esaminare dettagli lontani», «osservazioni attraverso le ottiche»)?
- **Corredo di orientamento**: d'uso specifico «orientamento». Non si somma al corredo di sopravvivenza per la regola dello strumento unico; lo dice anche la nota dell'Esploratore.
- **Abiti eleganti e da viaggio** trattati come strumenti per la non cumulabilità: in pratica non si indossano due abiti insieme.
- **IAS3300 Mirrorshard**: situazionale («quando esistono condizioni concrete per nascondersi»).
- **Kit trauma**: il testo dei corredi dice «+2 VA a Medicina» senza nominare l'uso; l'uso «pronto soccorso» viene dal §7.19 e dal §2.16.6.
