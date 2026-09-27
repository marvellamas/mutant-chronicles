# Effetti degli oggetti sui VA

Stato al 27 settembre 2026. Dati: campo `effetti` degli oggetti del catalogo (`data/equipaggiamento/*.json`, scritto da `tools/effetti_catalogo.py`) e degli oggetti di dotazione (`data/dotazioni.json` → `oggetti_dotazione`, scritto da `tools/genera_dotazioni.py`); oggetti personalizzati: `personalizzato.effetti`, con l'editor della scheda. Calcolo: `src/equipaggiamento.js` (raccolta), `src/condizioni.js` (modalità tavolo).

## Schema

```json
{ "abilita": "Percezione", "valore": 2, "ambito": "uso_specifico", "uso": "tracce",
  "condizione": "<frase del manuale, copiata>", "fonte": "Armamenti §7.13.8" }
```

- `tipo` per ora è solo `va`: nessun testo dei manuali esaminati dà effetti di oggetti alle Prove Salvezza o all'Iniziativa.
- `condizione` è la frase del manuale che dà il bonus, copiata intera. `node tools/verifica_frasi.mjs` controlla che esista nel testo dei Doc (`docs/manuali-txt/`); lo stesso controllo è nei test.
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
- **Fuori da questo lotto**: le 51 armature corporative con proprietà come Mimetismo, Manutenzione agevolata, Interfaccia di pilotaggio, Stabile. Il testo è traducibile con lo stesso schema; sono un lotto a sé.

## Casi dubbi (per-davide A.36)

- **Binocolo e corredi da ricognizione**: situazionali (osservazione a distanza, come chiesto) o d'uso specifico («esaminare dettagli lontani», «osservazioni attraverso le ottiche»)?
- **Corredo di orientamento**: d'uso specifico «orientamento». Non si somma al corredo di sopravvivenza per la regola dello strumento unico; lo dice anche la nota dell'Esploratore.
- **Abiti eleganti e da viaggio** trattati come strumenti per la non cumulabilità: in pratica non si indossano due abiti insieme.
- **IAS3300 Mirrorshard**: situazionale («quando esistono condizioni concrete per nascondersi»).
- **Kit trauma**: il testo dei corredi dice «+2 VA a Medicina» senza nominare l'uso; l'uso «pronto soccorso» viene dal §7.19 e dal §2.16.6.
